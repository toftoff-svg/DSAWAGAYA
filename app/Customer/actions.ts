'use server'

import { createClient } from '@/utils/supabase/server'
import type { PaymentMethod } from '../Admin2/_lib/menu'

// What the browser sends us: only WHICH drink, sugar choice, notes and quantity.
type LineInput = {
  id: number | string
  sugar: string | null
  notes?: string | null
  qty: number
}

type SubmitResult =
  | { ok: true; orderNumber: number }
  | { ok: false; error: string }

type RecipeEntry = { ing: number | string; amt: number }

// 1. Fetch customer extras (options and best-seller star IDs)
export async function getCustomerExtras() {
  const supabase = await createClient()

  const { data: resetSetting, error: resetError } = await supabase
    .from('settings')
    .select('value')
    .eq('id', 'wg_leaderboardResetAt')
    .maybeSingle()
  if (resetError) throw new Error(resetError.message)

  let ordersQuery = supabase.from('orders').select('items, placed').in('status', ['done', 'cleared'])
  if (typeof resetSetting?.value === 'string') {
    ordersQuery = ordersQuery.gte('placed', resetSetting.value)
  }

  const [{ data: menu }, { data: orders, error: ordersError }, { data: starsSetting }, { data: setting }] = await Promise.all([
    supabase
    .from('menu')
    .select('id, name, category'),
    ordersQuery,
    supabase.from('settings').select('value').eq('id', 'wg_stars').maybeSingle(),
    supabase.from('settings').select('value').eq('id', 'wg_options').maybeSingle(),
  ])
  if (ordersError) throw new Error(ordersError.message)

  const menuRows = menu ?? []
  const categoryByName = new Map(menuRows.map((item) => [String(item.name), String(item.category ?? 'drinks')]))
  const quantities = new Map<string, number>()
  for (const order of orders ?? []) {
    for (const item of Array.isArray(order.items) ? order.items : []) {
      const name = String(item?.name ?? '')
      if (name) quantities.set(name, (quantities.get(name) ?? 0) + (Number(item?.q) || 1))
    }
  }

  const bestByCategory = new Map<string, { name: string; qty: number }>()
  for (const [name, qty] of quantities) {
    const category = categoryByName.get(name) === 'pastries' ? 'pastries' : 'drinks'
    const current = bestByCategory.get(category)
    if (!current || qty > current.qty) bestByCategory.set(category, { name, qty })
  }

  const starConfig = starsSetting?.value && typeof starsSetting.value === 'object'
    ? starsSetting.value as { ids?: unknown; auto?: boolean }
    : {}
  const configuredStars = starConfig.ids
  const manualStarIds = Array.isArray(configuredStars) ? configuredStars.map(String) : []
  const automaticStarIds = starConfig.auto === false
    ? []
    : menuRows
        .filter((item) => bestByCategory.get(String(item.category ?? 'drinks'))?.name === String(item.name))
        .map((item) => String(item.id))

  const starIds = [...new Set([
    ...manualStarIds,
    ...automaticStarIds,
  ])]

  const options = Array.isArray(setting?.value)
    ? setting.value.map(String).filter(Boolean)
    : ['Less ice', 'More sugar', 'No sugar', 'Less sweet']

  return {
    options,
    starIds,
  }
}

// 2. Self-contained stock deduction for customer orders
async function deductOrderStock(orderId: number | string) {
  const supabase = await createClient()

  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select('use')
    .eq('id', orderId)
    .single()

  if (orderError || !order || !order.use) return

  const usage: Record<string, number> = order.use

  await Promise.all(
    Object.entries(usage).map(async ([ingId, amount]) => {
      const { data: ingredient } = await supabase
        .from('stock')
        .select('stock')
        .eq('id', ingId)
        .single()

      if (ingredient) {
        const newStock = Math.max(0, Number(ingredient.stock) - Number(amount))
        await supabase
          .from('stock')
          .update({ stock: newStock })
          .eq('id', ingId)
      }
    })
  )
}

// 3. Submit Order action
export async function submitOrder(lines: LineInput[], payment: PaymentMethod = 'cash', customerName = ''): Promise<SubmitResult> {
  if (!lines || lines.length === 0) {
    return { ok: false, error: 'The order is empty.' }
  }
  const normalizedCustomerName = customerName.trim().slice(0, 80)
  if (!normalizedCustomerName) {
    return { ok: false, error: 'Customer name is required.' }
  }

  const supabase = await createClient()

  // Get the real name, price and recipe of each drink from the menu table
  const ids = [...new Set(lines.map((l) => l.id))]
  const { data: menu, error: menuError } = await supabase
    .from('menu')
    .select('id, name, price, recipe')
    .in('id', ids)

  if (menuError || !menu) {
    return { ok: false, error: menuError?.message ?? 'Could not load the menu.' }
  }

  const menuById = new Map(menu.map((m) => [String(m.id), m]))

  let total = 0
  const items: {
    q: number
    cost: number
    name: string
    sugar: string | null
    notes: string | null
  }[] = []
  const use: Record<string, number> = {}

  for (const line of lines) {
    const drink = menuById.get(String(line.id))
    if (!drink) {
      return { ok: false, error: 'A drink in your order is no longer on the menu.' }
    }

    const qty = Math.max(1, Math.floor(Number(line.qty)) || 1)
    total += (Number(drink.price) || 0) * qty

    items.push({
      q: qty,
      cost: 0,
      name: drink.name,
      sugar: line.sugar,
      notes: line.notes?.trim().slice(0, 140) || null,
    })

    const recipe: RecipeEntry[] = Array.isArray(drink.recipe) ? drink.recipe : []
    for (const r of recipe) {
      const key = String(r.ing)
      use[key] = (use[key] || 0) + (Number(r.amt) || 0) * qty
    }
  }

  const { data: last, error: lastError } = await supabase
    .from('orders')
    .select('num')
    .order('num', { ascending: false })
    .limit(1)

  if (lastError) {
    return { ok: false, error: lastError.message }
  }
  const num = (last?.[0]?.num ?? 0) + 1

  const id = Date.now() * 100 + Math.floor(Math.random() * 100)

  const { error } = await supabase.from('orders').insert({
    id,
    num,
    placed: new Date().toISOString(),
    total,
    items,
    use,
    payment,
    customer_name: normalizedCustomerName,
  })

  if (error) {
    return { ok: false, error: error.message }
  }

  try {
    await deductOrderStock(id)
  } catch {}

  return { ok: true, orderNumber: num }
}