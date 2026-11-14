'use server'

import { createClient } from '@/utils/supabase/server'

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

  // Fetch menu items to check for any starred/best-seller items
  const { data: menu } = await supabase
    .from('menu')
    .select('id, star') // Adjust column name if your star column is named differently

  const starIds = menu
    ? menu.filter((m: any) => m.star).map((m: any) => String(m.id))
    : []

  const { data: setting } = await supabase
    .from('settings')
    .select('value')
    .eq('id', 'wg_options')
    .maybeSingle()
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

  for (const [ingId, amount] of Object.entries(usage)) {
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
  }
}

// 3. Submit Order action
export async function submitOrder(lines: LineInput[]): Promise<SubmitResult> {
  if (!lines || lines.length === 0) {
    return { ok: false, error: 'The order is empty.' }
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
  })

  if (error) {
    return { ok: false, error: error.message }
  }

  try {
    await deductOrderStock(id)
  } catch {}

  return { ok: true, orderNumber: num }
}