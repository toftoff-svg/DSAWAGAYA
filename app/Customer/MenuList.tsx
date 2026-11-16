'use client'

import Link from 'next/link'
import Image from 'next/image'
import { memo, useCallback, useEffect, useState } from 'react'
import BestSellerStar from '../_components/BestSellerStar'
import { submitOrder } from './actions'
import { useCustomerOrder, type PlacedOrder } from './_context/OrderContext'

type MenuItem = {
  id: number | string
  name: string
  description?: string | null
  color?: string | null
  price: number | null
  category?: string | null
  photo?: string | null
  // From your menu table: sugar levels only show when "on" is true
  sugar?: { on?: boolean } | null
  // true = shows the gold best-seller star
  star?: boolean
}

// Change these to whatever sugar options you want
const SUGAR_LEVELS = ['0%', '25%', '50%', '75%', '100%']
const DEFAULT_SUGAR = '100%'

const peso = (n: number) =>
  '₱' + n.toLocaleString(undefined, { minimumFractionDigits: 2 })

const pill = (active: boolean) =>
  `rounded-full border-2 px-3 py-1 text-sm font-bold transition-colors ${
    active
      ? 'border-[#164734] bg-[#164734] text-[#FCFAF4]'
      : 'border-[#B7C2A5] bg-[#FCFAF4] text-[#263B32] hover:border-[#164734]'
  }`

const MenuGrid = memo(function MenuGrid({
  items,
  onSelect,
}: {
  items: MenuItem[]
  onSelect: (item: MenuItem) => void
}) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => onSelect(item)}
          className="emp-bd flex flex-col items-center rounded-3xl border-2 p-3 text-center text-[#263B32] shadow-sm transition-transform hover:-translate-y-0.5 hover:border-[#164734] hover:shadow-md"
          style={{ backgroundColor: '#FCFAF4', borderColor: item.color || '#0F47AF' }}
        >
          <div className="mb-2 aspect-square w-20 overflow-hidden rounded-2xl sm:w-28" style={{ backgroundColor: '#F7F4EC' }}>
            {item.photo ? (
              <Image
                src={item.photo}
                alt={item.name}
                width={112}
                height={112}
                unoptimized
                loading="lazy"
                className="h-full w-full object-contain"
              />
            ) : (
              <div className="grid h-full w-full place-items-center text-xs opacity-60">No photo</div>
            )}
          </div>
          <span className="text-sm font-semibold">
            {item.name}
            {item.star && <BestSellerStar />}
          </span>
          {item.description && <span className="mt-1 line-clamp-2 text-xs opacity-70">{item.description}</span>}
          <span className="text-sm">{peso(item.price || 0)}</span>
        </button>
      ))}
    </div>
  )
})

export default function MenuList({
  items,
  options = [],
  section,
}: {
  items: MenuItem[]
  options?: string[] // quick requests like "Less ice" (managed in Admin > Settings)
  section: 'drinks' | 'pastries'
}) {
  // The order being built right now
  const { order, setOrder, placedOrders, setPlacedOrders, payment, setPayment, customerName, setCustomerName } = useCustomerOrder()

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

  useEffect(() => {
    if (!selectedItem) return
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSelectedItem(null)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedItem])

  const openItem = useCallback((item: MenuItem) => {
    setSelectedItem(item)
    setSugar(DEFAULT_SUGAR)
    setQuantity(1)
    setPickedOptions([])
    setNote('')
  }, [])

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
    if (submitting || order.length === 0) return
    if (!customerName.trim()) {
      setSubmitError('Enter your name before placing the order.')
      return
    }
    setSubmitting(true)
    setSubmitError(null)
    try {
      const result = await submitOrder(
        order.map((l) => ({ id: l.id, sugar: l.sugar, notes: l.notes, qty: l.qty })),
        payment,
        customerName
      )

      if (!result.ok) {
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
      setCustomerName('')
      setShowConfirm(false)
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Could not place the order.')
    } finally {
      setSubmitting(false)
    }
  }

  const itemTotal = (selectedItem?.price || 0) * quantity

  return (
    <div className="grid gap-7 lg:grid-cols-[1fr_360px]">
      {/* ---------- MENU ---------- */}
      <section>
        <h1 className="font-serif text-3xl font-bold text-[#164734]">
          {section === 'drinks' ? 'Drinks' : 'Pastries'}
        </h1>
        <p className="mb-4 text-xs text-[#4C6B54]">
          Tap a {section === 'drinks' ? 'drink' : 'pastry'} to start your order
        </p>

        <nav className="mb-4 flex gap-2" aria-label="Menu sections">
          <Link
            href="/Customer"
            aria-current={section === 'drinks' ? 'page' : undefined}
            className={`emp-bd rounded-full border-2 px-4 py-1.5 text-sm font-bold ${
              section === 'drinks' ? 'emp-solid' : 'bg-[#FCFAF4]'
            }`}
          >
            Drinks
          </Link>
          <Link
            href="/Customer/pastries"
            aria-current={section === 'pastries' ? 'page' : undefined}
            className={`emp-bd rounded-full border-2 px-4 py-1.5 text-sm font-bold ${
              section === 'pastries' ? 'emp-solid' : 'bg-[#FCFAF4]'
            }`}
          >
            Pastries
          </Link>
        </nav>

        {items.length === 0 ? (
          <div className="emp-bd rounded-2xl border border-dashed bg-white/70 py-12 text-center opacity-70">
            No {section} available yet. Add a menu item and select {section} in Admin.
          </div>
        ) : (
          <MenuGrid items={items} onSelect={openItem} />
        )}
      </section>

      {/* ---------- ORDER PANEL ---------- */}
      <div className="space-y-6">
        <aside className="emp-bd h-fit rounded-3xl border-2 bg-[#FCFAF4] p-5 text-[#263B32] shadow-sm lg:sticky lg:top-6">
          <h2 className="text-lg font-bold text-[#164734]">Your Order</h2>

          <div className="my-4 min-h-40">
          {order.length === 0 && (
            <p className="pt-12 text-center text-sm opacity-70">No items yet</p>
          )}

          {order.length > 0 && (
            <ul className="space-y-4">
              {order.map((line) => (
                <li key={line.lineId} className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">
                      {line.name} <span className="font-normal">x{line.qty}</span>
                    </p>
                    <p className="text-xs opacity-70">
                      {line.sugar ? `Sugar ${line.sugar}` : ""}
                    </p>
                    {line.notes && <p className="text-xs opacity-70">Note: {line.notes}</p>}
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-sm">{peso(line.price * line.qty)}</span>
                    <div className="emp-bd flex items-center rounded-full border-2 text-sm">
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

          <div className="emp-bd mb-3 flex items-center justify-between border-t-2 pt-3 text-sm">
            <span className="font-serif font-bold text-base">Total</span>
            <span className="font-semibold">{peso(total)}</span>
          </div>
          <label className="mb-3 block text-sm font-bold">
            Customer name <span aria-hidden="true">*</span>
            <input
              className="emp-input mt-1"
              value={customerName}
              onChange={(event) => setCustomerName(event.target.value)}
              maxLength={80}
              placeholder="Enter your name"
              required
              aria-required="true"
            />
            <span className="mt-1 block text-xs font-normal opacity-70">Required to place an order.</span>
          </label>
          <fieldset className="mb-3">
            <legend className="mb-2 text-sm font-bold">Customer payment</legend>
            <div className="grid grid-cols-2 gap-2">
              {(['cash', 'qr'] as const).map((method) => (
                <label key={method} className={`cursor-pointer rounded-xl border-2 px-3 py-2 text-center text-sm font-bold ${payment === method ? 'emp-solid' : 'emp-bd'}`}>
                  <input
                    type="radio"
                    name="customer-payment"
                    value={method}
                    checked={payment === method}
                    onChange={() => setPayment(method)}
                    className="sr-only"
                  />
                  {method === 'qr' ? 'QR payment' : 'Cash'}
                </label>
              ))}
            </div>
          </fieldset>

          <button
            type="button"
            onClick={() => setShowConfirm(true)}
            disabled={order.length === 0 || !customerName.trim()}
            className="emp-solid w-full rounded-full py-3 text-lg font-bold shadow-sm transition-opacity duration-200 hover:opacity-90 hover:shadow-md disabled:cursor-not-allowed disabled:bg-[#B7C2A5] disabled:text-[#263B32] disabled:opacity-70"
          >
            Place Order
          </button>
          <button
            type="button"
            onClick={() => setOrder([])}
            disabled={order.length === 0}
            className="mt-2 w-full text-sm underline opacity-70 disabled:opacity-30"
          >
            Clear
          </button>
        </aside>

        {placedOrders.length > 0 && (
          <aside className="emp-bd rounded-3xl border-2 bg-[#FCFAF4] p-5 text-[#263B32] shadow-sm">
            <h2 className="mb-3 text-lg font-bold text-[#164734]">Placed Orders</h2>
            {placedOrders.map((o) => (
              <div key={o.orderNumber} className="emp-bd mb-3 border-b pb-3 text-sm">
                <p className="font-bold">
                  Order #{o.orderNumber}{' '}
                  <span className="font-mono font-normal opacity-70">{o.time}</span>
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
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={closeItem}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={selectedItem.name}
            onClick={(event) => event.stopPropagation()}
            className="emp-bd modal-scroll max-h-[90vh] w-full max-w-sm overflow-y-auto rounded-2xl border-2 bg-[#FCFAF4] p-6 text-[#263B32] shadow-xl"
            style={{ borderColor: selectedItem.color || '#0F47AF' }}
          >
            <div
              className="mx-auto mb-4 grid h-28 w-28 place-items-center overflow-hidden rounded-2xl border-[3px]"
              style={{ borderColor: selectedItem.color || '#0F47AF', backgroundColor: '#F7F4EC' }}
            >
              {selectedItem.photo ? (
                <Image
                  src={selectedItem.photo}
                  alt={selectedItem.name}
                  width={112}
                  height={112}
                  unoptimized
                  className="h-full w-full object-contain"
                />
              ) : (
                <span className="text-xs font-bold opacity-60">NO IMAGE</span>
              )}
            </div>

            <h2 className="font-black text-xl">
              {selectedItem.name} {selectedItem.star && <BestSellerStar />}
            </h2>
            {selectedItem.description && <p className="mt-1 text-sm text-neutral-500">{selectedItem.description}</p>}
            <p className="mb-4 text-xs opacity-70">
              Base price {peso(selectedItem.price || 0)}
            </p>

            {/* Sugar levels only appear if this drink has sugar turned on */}
            {selectedItem.sugar?.on && (
              <>
                <p className="mb-2 text-xs font-bold uppercase">Sugar level</p>
                <div className="mb-5 flex flex-wrap gap-2">
                  {SUGAR_LEVELS.map((level) => (
                    <button
                      key={level}
                      type="button"
                      aria-pressed={sugar === level}
                      onClick={() => setSugar(level)}
                      className={pill(sugar === level)}
                    >
                      {level}
                    </button>
                  ))}
                </div>
              </>
            )}

            {/* Quick requests like "Less ice" + a free note */}
            {section === 'drinks' && options.length > 0 && (
              <>
                <p className="mb-2 text-xs font-bold uppercase">Special requests</p>
                <div className="mb-4 flex flex-wrap gap-2">
                  {options.map((option) => (
                    <button
                      key={option}
                      type="button"
                      aria-pressed={pickedOptions.includes(option)}
                      onClick={() => toggleOption(option)}
                      className={pill(pickedOptions.includes(option))}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </>
            )}

            <p className="mb-2 text-xs font-bold uppercase">Note</p>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={120}
              placeholder="Anything else? e.g. no straw"
              className="mb-5 w-full rounded-full border-2 border-[#B7C2A5] bg-white px-4 py-2 text-sm text-black focus:border-[#164734] focus:outline-none"
            />

            <div className="mb-5 flex items-center justify-between">
              <div>
                <p className="font-bold">Quantity</p>
                <p className="text-xs opacity-70">How many of this item?</p>
              </div>
              <div className="emp-bd flex items-center gap-3 rounded-full border-2 px-3 py-1">
                <button
                  type="button"
                  aria-label="Decrease quantity"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="text-lg font-bold leading-none"
                >
                  −
                </button>
                <span className="font-mono w-4 text-center">{quantity}</span>
                <button
                  type="button"
                  aria-label="Increase quantity"
                  onClick={() => setQuantity((q) => q + 1)}
                  className="text-lg font-bold leading-none"
                >
                  +
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={closeItem}
                className="emp-bd rounded-full border-2 px-5 py-2 text-[#164734] transition-colors hover:bg-[#F0F4EA]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={addToOrder}
                className="emp-solid rounded-full border-2 border-[#0e4bbe] px-5 py-2 font-bold transition-colors hover:opacity-90"
              >
                Add - {peso(itemTotal)}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------- ARE-YOU-SURE POPUP ---------- */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-order-title"
            className="emp-bd w-full max-w-sm rounded-3xl border-2 bg-[#FCFAF4] p-6 text-[#263B32] shadow-xl"
          >
            <h2 id="confirm-order-title" className="mb-2 text-lg font-black text-[#164734]">Place this order?</h2>
            <p className="mb-3 text-sm">Are you sure you want to confirm this order?</p>
            {order.map((line) => (
              <p key={line.lineId} className="text-sm">
                {line.qty} × {line.name}
                {line.sugar ? ` (${line.sugar} sugar)` : ''}
                {line.notes ? ` – ${line.notes}` : ''}
              </p>
            ))}
            <p className="mb-4 mt-2 font-mono font-bold">Total: {peso(total)}</p>
            <p className="mb-4 text-sm font-bold">Payment: {payment === 'qr' ? 'QR payment' : 'Cash'}</p>
            {submitError && (
              <p className="mb-3 border border-red-200 bg-red-50 p-2 text-sm text-red-700">
                Could not save the order: {submitError}
              </p>
            )}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={placeOrder}
                disabled={submitting}
                className="emp-solid rounded-full border-2 border-[#0e4bbe] px-5 py-2 font-bold disabled:opacity-50"
              >
                {submitting ? 'Saving…' : 'Yes, confirm'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowConfirm(false)
                  setSubmitError(null)
                }}
                disabled={submitting}
                className="emp-bd rounded-full border-2 px-5 py-2 disabled:opacity-50"
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
