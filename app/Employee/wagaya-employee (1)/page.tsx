"use client";

import { useEffect, useState } from "react";
import { getMenu, getOrderOptions } from "./_lib/actions";
import DrinkModal from "./_components/DrinkModal";
import { useOrders } from "./_context/OrderContext";
import { peso, type MenuRow } from "./_lib/menu";

export default function OrdersPage() {
  const { cart, total, addToCart, changeQty, placeOrder } = useOrders();
  const [menu, setMenu] = useState<MenuRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<MenuRow | null>(null);
  const [options, setOptions] = useState<string[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const [res, savedOptions] = await Promise.all([getMenu(), getOrderOptions()]);
        setOptions(savedOptions);
        if (res.ok) setMenu(res.data);
        else setError(res.error);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong");
      }
      setLoading(false);
    })();
  }, []);

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
      {/* MENU */}
      <section>
        <h1 className="text-xl font-bold">Menu</h1>
        <p className="mb-4 text-xs opacity-70">Tap a drink to start your order</p>

        {loading && <p className="text-sm opacity-70">Loading menu…</p>}
        {error && <p className="text-sm text-red-500">Couldn’t load the menu: {error}</p>}
        {!loading && !error && menu.length === 0 && <p className="text-sm opacity-70">No drinks on the menu yet.</p>}

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
          {menu.map((drink) => (
            <button
              key={drink.id}
              type="button"
              onClick={() => setSelected(drink)}
              className="emp-bd flex flex-col items-center rounded-3xl border-2 p-3 text-center transition-transform hover:-translate-y-0.5"
            >
              <div className="emp-photo mb-2 aspect-square w-20 overflow-hidden rounded-2xl sm:w-24">
                {drink.photo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={drink.photo} alt={drink.name} loading="lazy" className="h-full w-full object-contain" />
                ) : (
                  <div className="grid h-full w-full place-items-center text-xs opacity-60">No photo</div>
                )}
              </div>
              <span className="text-sm font-semibold">{drink.name}</span>
              <span className="text-sm">{peso(drink.price)}</span>
            </button>
          ))}
        </div>
      </section>

      {/* YOUR ORDER */}
      <aside className="emp-bd h-fit rounded-3xl border-2 p-5 lg:sticky lg:top-6">
        <h2 className="text-lg font-bold">Your Order</h2>

        <div className="my-4 min-h-40">
          {cart.length === 0 ? (
            <p className="pt-12 text-center text-sm">No items yet</p>
          ) : (
            <ul className="space-y-4">
              {cart.map((item) => (
                <li key={item.key} className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">
                      {item.name} <span className="font-normal">x{item.qty}</span>
                    </p>
                    <p className="text-xs opacity-70">
                      {item.sugar != null ? `Sugar ${item.sugar}` : ""}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-sm">{peso(item.unitPrice * item.qty)}</span>
                    <div className="emp-bd flex items-center rounded-full border-2 text-sm">
                      <button type="button" aria-label={`Remove one ${item.name}`} onClick={() => changeQty(item.key, -1)} className="px-3">
                        −
                      </button>
                      <span className="w-5 text-center font-bold">{item.qty}</span>
                      <button type="button" aria-label={`Add one ${item.name}`} onClick={() => changeQty(item.key, 1)} className="px-3">
                        +
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="mb-3 flex items-center justify-between text-sm">
          <span>Total</span>
          <span className="font-semibold">{peso(total)}</span>
        </div>
        <button
          type="button"
          onClick={placeOrder}
          disabled={cart.length === 0}
          className="emp-solid w-full rounded-full py-3 text-lg font-bold disabled:opacity-40"
        >
          Place Order
        </button>
      </aside>

      {selected && <DrinkModal drink={selected} options={options} onClose={() => setSelected(null)} onAdd={addToCart} />}
    </div>
  );
}
