"use client";

import { useEffect, useState } from "react";
import { useOrders } from "../_context/OrderContext";
import { peso, timeAgo } from "../_lib/menu";

export default function QueuePage() {
  const { queue, queueError, completeOrder, cancelOrder } = useOrders();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const ordered = [...queue].sort((a, b) => a.createdAt - b.createdAt);

  return (
    <section className="mx-auto max-w-4xl">
      <h1 className="text-xl font-bold">Queue</h1>
      <p className="mb-4 text-xs opacity-70">
        {ordered.length} {ordered.length === 1 ? "order" : "orders"} waiting · first come, first served
      </p>

      {queueError && <p className="mb-3 text-sm text-red-500">Couldn’t load the queue: {queueError}</p>}

      {ordered.length === 0 && !queueError && <p className="text-sm opacity-70">No orders waiting. New orders show up here.</p>}

      <div className="space-y-5">
        {ordered.map((order, idx) => (
          <article key={order.id} className="emp-bd rounded-3xl border-2 p-4">
            <header className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold">#{order.number}</h2>
                <span className="text-sm font-semibold">{order.customerName || "Walk-in"}</span>
                <span className="text-xs">{timeAgo(order.createdAt, now)}</span>
                {idx === 0 && <span className="emp-bd rounded-full border-2 px-3 py-0.5 text-xs">Next up</span>}
              </div>
              <span className="text-right"><span className="block text-lg font-bold">{peso(order.total)}</span><span className="text-xs uppercase">{order.payment === "qr" ? "QR" : "Cash"}</span></span>
            </header>

            <ul className="mt-3 space-y-2">
              {order.items.map((item, i) => (
                <li key={`${order.id}-${i}`} className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-semibold">
                      {item.name} <span className="font-normal">x{item.qty}</span>
                    </p>
                    <p className="text-xs">
                      {item.sugar != null ? `Sugar ${item.sugar}` : ""}
                    </p>
                    {item.notes && <p className="text-sm font-semibold">Note: {item.notes}</p>}
                  </div>
                  <span>{peso(item.unitPrice * item.qty)}</span>
                </li>
              ))}
            </ul>

            <footer className="mt-4 flex items-center justify-between">
              <button type="button" onClick={() => cancelOrder(order.id)} className="emp-bd rounded-full border-2 px-4 py-1 text-sm font-semibold">
                Cancel
              </button>
              <button type="button" onClick={() => completeOrder(order.id)} className="emp-bd rounded-full border-2 px-4 py-1 text-sm font-semibold">
                Done
              </button>
            </footer>
          </article>
        ))}
      </div>
    </section>
  );
}
