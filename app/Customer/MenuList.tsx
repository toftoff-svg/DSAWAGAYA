'use client'

import { useState } from 'react'
import { submitOrder } from './actions'

type MenuItem = {
  id: number | string
  name: string
  price: number | null
  description?: string | null
  category?: string | null
  photo?: string | null
  // From your menu table: sugar levels only show when "on" is true
  sugar?: { on?: boolean } | null
  // true = shows the blue best-seller star
  star?: boolean
}

// One line in the order: a drink + its sugar level (if it has one) + notes + how many
type OrderLine = {
  lineId: string
  id: number | string
  name: string
  price: number
  sugar: string | null
  notes: string | null
  qty: number
}

type PlacedOrder = {
  orderNumber: number
  time: string
  lines: OrderLine[]
  total: number
}

// Change these to whatever sugar options you want
const SUGAR_LEVELS = ['0%', '25%', '50%', '75%', '100%']
const DEFAULT_SUGAR = '100%'

const peso = (n: number) =>
  '₱' + n.toLocaleString(undefined, { minimumFractionDigits: 2 })

// The blue best-seller star
function Star() {
  return (
    <span className="text-slate-900" title="Best seller" aria-label="Best seller">
      ★
    </span>
  )
}

export default function MenuList({
  items,
  options = [],
}: {
  items: MenuItem[]
  options?: string[] // quick requests like "Less ice" (managed in Admin > Settings)
}) {
  // The order being built right now
  const [order, setOrder] = useState<OrderLine[]>([])

  // The drink popup (null = closed)
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null)
  const [sugar, setSugar] = useState(DEFAULT_SUGAR)
  const [quantity, setQuantity] = useState(1)
  const [pickedOptions, setPickedOptions] = useState<string[]>([])
  const [note, setNote] = useState('')

  // The "Are you sure?" popup, and saving status
  const [showConfirm, setShowConfirm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  // Orders placed during this visit (the real record is in Supabase)
  const [placedOrders, setPlacedOrders] = useState<PlacedOrder[]>([])

  const openItem = (item: MenuItem) => {
    console.log('Tapped:', item.name)
    setSelectedItem(item)
    setSugar(DEFAULT_SUGAR)
    setQuantity(1)
    setPickedOptions([])
    setNote('')
  }

  const closeItem = () => setSelectedItem(null)

  const toggleOption = (option: string) =>{
  const iceOptions = ["Less ice", "No ice", "Extra ice"];
  const sugarOptions = ["Less sugar", "More sugar"];

  setPickedOptions((prev) => {
    const group = iceOptions.includes(option)
      ? iceOptions
      : sugarOptions.includes(option)
      ? sugarOptions
      : null;

    if (group) {
      return prev.includes(option)
        ? prev.filter((item) => !group.includes(item))
        : [...prev.filter((item) => !group.includes(item)), option];
    }

    return prev.includes(option)
      ? prev.filter((item) => item !== option)
      : [...prev, option];
  });
};

  const addToOrder = () => {
    if (!selectedItem) return
    const price = selectedItem.price || 0
    // Only drinks with sugar turned on get a sugar level
    const sugarChoice = selectedItem.sugar?.on ? sugar : null
    // Quick options + the typed note, joined together
    const notes = [...pickedOptions, note.trim()].filter(Boolean).join(', ') || null
    const lineId = `${selectedItem.id}-${sugarChoice ?? 'none'}-${notes ?? ''}`

    setOrder((prev) => {
      const existing = prev.find((line) => line.lineId === lineId)
      if (existing) {
        return prev.map((line) =>
          line.lineId === lineId ? { ...line, qty: line.qty + quantity } : line
        )
      }
      return [
        ...prev,
        {
          lineId,
          id: selectedItem.id,
          name: selectedItem.name,
          price,
          sugar: sugarChoice,
          notes,
          qty: quantity,
        },
      ]
    })
    closeItem()
  }

  const changeLineQty = (lineId: string, change: number) => {
    setOrder((prev) =>
      prev
        .map((line) =>
          line.lineId === lineId ? { ...line, qty: line.qty + change } : line
        )
        .filter((line) => line.qty > 0)
    )
  }

  const total = order.reduce((sum, line) => sum + line.price * line.qty, 0)

  // "Yes, confirm" -> save to Supabase through actions.ts
  const placeOrder = async () => {
    setSubmitting(true)
    setSubmitError(null)

    const result = await submitOrder(
      order.map((l) => ({ id: l.id, sugar: l.sugar, notes: l.notes, qty: l.qty }))
    )

    setSubmitting(false)

    if (!result.ok) {
      console.error('Order failed:', result.error)
      setSubmitError(result.error)
      return
    }

    const newOrder: PlacedOrder = {
      orderNumber: result.orderNumber,
      time: new Date().toLocaleTimeString(),
      lines: order,
      total,
    }
    setPlacedOrders((prev) => [...prev, newOrder])
    setOrder([])
    setShowConfirm(false)
  }

  if (items.length === 0) {
    return (
      <div className="emp-bd rounded-2xl border border-dashed bg-white/70 py-12 text-center text-slate-400">
        No items inside your menu database table yet.
      </div>
    )
  }

  const itemTotal = (selectedItem?.price || 0) * quantity

  return (
    <div className="flex w-full flex-col items-start gap-6 lg:flex-row">
      {/* ---------- MENU ---------- */}
      <section className="w-full lg:flex-1">
        <h1 className="text-3xl font-bold text-[#164734] font-serif">
  Menu
</h1>
        <p className="mb-4 text-xs text-slate-500">Tap a drink to start your order</p>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => openItem(item)}
              
className={`flex flex-col items-center rounded-3xl border-2 bg-[#FCFAF4] p-3 text-center transition-all duration-200 hover:-translate-y-0.5 ${
  selectedItem?.id === item.id
    ? 'border-[#164734]'
    : 'border-[#B7C2A5] hover:border-[#164734]'
}`}

            >
              <div className="mb-2 aspect-square w-20 overflow-hidden rounded-2xl bg-slate-100 sm:w-24">
                {item.photo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.photo}
                    alt={item.name}
                    loading="lazy"
                    className="h-full w-full object-contain"
                  />
                ) : (
                  <div className="grid h-full w-full place-items-center text-xs text-slate-500">No photo</div>
                )}
              </div>
              <span className="text-sm font-semibold">
                {item.name}
                {item.star && <Star />}
              </span>
              <span className="text-sm">{peso(item.price || 0)}</span>
            </button>
          ))}
        </div>
      </section>

      {/* ---------- ORDER PANEL ---------- */}
      <div className="flex flex-col gap-6 w-full lg:flex-1 lg:max-w-xl lg:sticky lg:top-6">
        <aside className="flex min-h-[28rem] flex-col rounded-3xl border-2 border-[#B7C2A5] bg-[#FCFAF4] p-5 text-[#263B32] shadow-sm lg:sticky lg:top-6">
          <h2 className="text-lg font-extrabold tracking-tight text-[#266B32]">
  Your Order
</h2>

          <div className="my-4 min-h-40 flex-1">
          {order.length === 0 && (
            <p className="pt-12 text-center text-sm text-slate-500">No items yet</p>
          )}

          {order.length > 0 && (
            <ul className="space-y-4">
              {order.map((line) => (
                <li key={line.lineId} className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">
                      {line.name} <span className="font-normal">x{line.qty}</span>
                    </p>
                    <p className="text-xs text-slate-500">
                      {line.sugar ? `Sugar ${line.sugar}` : ""}
                    </p>
                    {line.notes && <p className="text-xs text-slate-500">Note: {line.notes}</p>}
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-sm">{peso(line.price * line.qty)}</span>
                    <div className="flex items-center rounded-full border-2 border-slate-900 text-sm">
                      <button
                        type="button"
                        aria-label={`Remove one ${line.name}`}
                        onClick={() => changeLineQty(line.lineId, -1)}
                        className="px-3"
                      >
                        −
                      </button>
                      <span className="w-5 text-center font-bold">{line.qty}</span>
                      <button
                        type="button"
                        aria-label={`Add one ${line.name}`}
                        onClick={() => changeLineQty(line.lineId, 1)}
                        className="px-3"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
          </div>

          <div className="mb-3 flex items-center justify-between border-t-2 border-slate-900 pt-3 text-sm">
            <span className="font-serif font-bold text-base">Total</span>
<span className="font-bold font-bold text-base">{peso(total)}</span>
          </div>

          <button
            type="button"
            onClick={() => setShowConfirm(true)}
            disabled={order.length === 0}
            className="w-full rounded-full bg-[#164734] py-3 text-lg font-bold text-white shadow-sm transition-all duration-200 hover:bg-[#263B32] hover:shadow-md active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-[#B7C2A5] disabled:text-[#263B32] disabled:opacity-70"
          >
            Place Order
          </button>
          <button
            type="button"
            onClick={() => setOrder([])}
            disabled={order.length === 0}
            className="mt-2 w-full text-sm underline disabled:opacity-30"
          >
            Clear
          </button>
        </aside>

        {placedOrders.length > 0 && (
          <aside className="rounded-3xl border-2 border-slate-900 bg-white p-5 text-slate-900 shadow-sm">
            <h2 className="mb-3 text-lg font-bold">Placed Orders</h2>
            {placedOrders.map((o) => (
              <div key={o.orderNumber} className="mb-3 pb-3 border-b border-neutral-300 text-sm">
                <p className="font-bold">
                  Order #{o.orderNumber}{' '}
                  <span className="font-mono font-normal text-neutral-500">{o.time}</span>
                </p>
                {o.lines.map((line) => (
                  <p key={line.lineId}>
                    {line.qty} × {line.name}
                    {line.sugar ? ` (${line.sugar} sugar)` : ''}
                    {line.notes ? ` – ${line.notes}` : ''}
                  </p>
                ))}
                <p className="font-mono font-bold mt-1">{peso(o.total)}</p>
              </div>
            ))}
          </aside>
        )}
      </div>

      {/* ---------- DRINK POPUP ---------- */}
      {selectedItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="max-h-[90vh] w-full max-w-sm overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 text-slate-800 shadow-xl">
            {selectedItem.photo ? (
              <div className="mx-auto w-28 h-28 border-[3px] border-black rounded-2xl overflow-hidden mb-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={selectedItem.photo}
                  alt={selectedItem.name}
                  className="w-full h-full object-contain"
                />
              </div>
            ) : (
              <div className="mx-auto w-28 h-28 border-[3px] border-black rounded-2xl flex items-center justify-center text-xs font-bold text-neutral-400 mb-4">
                NO IMAGE
              </div>
            )}

            <h2 className="font-black text-xl">
              {selectedItem.name} {selectedItem.star && <Star />}
            </h2>
            <p className="text-xs text-neutral-500 mb-4">
              Base price {peso(selectedItem.price || 0)}
            </p>

            {/* Sugar levels only appear if this drink has sugar turned on */}
            {selectedItem.sugar?.on && (
              <>
                <p className="text-xs font-bold uppercase mb-2">Sugar level</p>
                <div className="flex gap-2 mb-5 flex-wrap">
                  {SUGAR_LEVELS.map((level) => (
                    <button
                      key={level}
                      onClick={() => setSugar(level)}
                      className={
                        'border-2 rounded-full px-3 py-1 text-sm font-bold transition-colors ' +
(sugar === level
  ? 'border-[#164734] bg-[#164734] text-white'
  : 'border-[#B7C2A5] bg-[#FCFAF4] text-[#263B32] hover:border-[#164734]')
                      }
                    >
                      {level}
                    </button>
                  ))}
                </div>
              </>
            )}

            {/* Quick requests like "Less ice" + a free note */}
            {options.length > 0 && (
              <>
                <p className="text-xs font-bold uppercase mb-2">Special requests</p>
                <div className="flex gap-2 mb-4 flex-wrap">
                  {options.map((option) => (
                    <button
                      key={option}
                      onClick={() => toggleOption(option)}
                      className={
  'border-2 rounded-full px-3 py-1 text-sm font-bold transition-colors ' +
  (pickedOptions.includes(option)
    ? 'bg-[#164734] border-[#164734] text-[#FCFAF4]'
    : 'bg-[#FCFAF4] border-[#B7C2A5] text-[#263B32] hover:border-[#164734]')
                      }
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </>
            )}

            <p className="text-xs font-bold uppercase mb-2">Note</p>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={120}
              placeholder="Anything else? e.g. no straw"
              className="w-full border-2 border-[#B7C2A5] focus:outline-none focus:border-[#164734] rounded-full px-4 py-2 text-sm mb-5 text-black bg-white"
            />

            <div className="flex justify-between items-center mb-5">
              <div>
                <p className="font-bold">Quantity</p>
                <p className="text-xs text-neutral-500">How many of this drink?</p>
              </div>
              <div className="flex items-center gap-3 border-2 border-[#B7C2A5] rounded-full px-3 py-1">
                <button
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="font-bold text-lg leading-none"
                >
                  −
                </button>
                <span className="font-mono w-4 text-center">{quantity}</span>
                <button
                  onClick={() => setQuantity((q) => q + 1)}
                  className="font-bold text-lg leading-none"
                >
                  +
                </button>
              </div>
            </div>

            <div className="flex justify-between items-center">
              <button
                onClick={closeItem}
                className="border-2 border-[#B7C2A5] text-[#164734] rounded-full px-5 py-2 hover:bg-[#F0F4EA] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={addToOrder}
                className="bg-[#164734] text-white border-2 border-[#164734] rounded-full px-5 py-2 font-bold hover:bg-[#1F5C43] transition-colors"
              >
                Add - {peso(itemTotal)}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------- ARE-YOU-SURE POPUP ---------- */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white border-[3px] border-black rounded-3xl p-6 max-w-sm w-full text-black">
            <h2 className="font-black text-lg mb-2">Place this order?</h2>
            <p className="text-sm mb-3">Are you sure you want to confirm this order?</p>
            {order.map((line) => (
              <p key={line.lineId} className="text-sm">
                {line.qty} × {line.name}
                {line.sugar ? ` (${line.sugar} sugar)` : ''}
                {line.notes ? ` – ${line.notes}` : ''}
              </p>
            ))}
            <p className="font-mono font-bold mt-2 mb-4">Total: {peso(total)}</p>
            {submitError && (
              <p className="text-sm text-red-700 bg-red-50 border border-red-200 p-2 mb-3">
                Could not save the order: {submitError}
              </p>
            )}
            <div className="flex gap-2">
              <button
                onClick={placeOrder}
                disabled={submitting}
                className="bg-black text-white border-2 border-black rounded-full px-5 py-2 font-bold disabled:opacity-50"
              >
                {submitting ? 'Saving…' : 'Yes, confirm'}
              </button>
              <button
                onClick={() => {
                  setShowConfirm(false)
                  setSubmitError(null)
                }}
                disabled={submitting}
                className="border-2 border-black rounded-full px-5 py-2 disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
