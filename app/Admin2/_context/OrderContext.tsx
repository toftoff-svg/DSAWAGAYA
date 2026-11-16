"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import type { CartItem, QueueOrder } from "../_lib/menu";
import { getQueue, placeOrder as savePlacedOrder, setOrderStatus } from "../_lib/actions";

type Ctx = {
  cart: CartItem[];
  queue: QueueOrder[];
  queueError: string | null;
  placing: boolean;
  total: number;
  addToCart: (item: CartItem) => void;
  changeQty: (key: string, delta: number) => void;
  placeOrder: () => Promise<void>;
  completeOrder: (id: number) => Promise<void>;
  cancelOrder: (id: number) => Promise<void>;
};

const OrderContext = createContext<Ctx | null>(null);
const POLL_MS = 5000;

export function OrderProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const onQueue = pathname.endsWith("/queue");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [queue, setQueue] = useState<QueueOrder[]>([]);
  const [queueError, setQueueError] = useState<string | null>(null);
  const [placing, setPlacing] = useState(false);
  const refreshing = useRef(false);
  const queueSignature = useRef("");

  const refresh = useCallback(async () => {
    if (refreshing.current || document.visibilityState !== "visible") return;
    refreshing.current = true;
    try {
      const res = await getQueue();
      if (res.ok) {
        const nextSignature = JSON.stringify(res.data);
        if (nextSignature !== queueSignature.current) {
          queueSignature.current = nextSignature;
          setQueue(res.data);
        }
        setQueueError(null);
      } else {
        setQueueError(res.error);
      }
    } catch (e) {
      setQueueError(e instanceof Error ? e.message : "Couldn’t load the queue");
    } finally {
      refreshing.current = false;
    }
  }, []);

  useEffect(() => {
    if (!onQueue) return;
    refresh();
    const t = setInterval(refresh, POLL_MS);
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") refresh();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      clearInterval(t);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [onQueue, refresh]);

  const total = useMemo(() => cart.reduce((s, i) => s + i.unitPrice * i.qty, 0), [cart]);

  const addToCart = useCallback((item: CartItem) => {
    setCart((prev) => {
      const found = prev.find((p) => p.key === item.key);
      if (found) return prev.map((p) => (p.key === item.key ? { ...p, qty: p.qty + item.qty } : p));
      return [...prev, item];
    });
  }, []);

  const changeQty = useCallback((key: string, delta: number) => {
    setCart((prev) =>
      prev.map((p) => (p.key === key ? { ...p, qty: p.qty + delta } : p)).filter((p) => p.qty > 0)
    );
  }, []);

  const placeOrder = useCallback(async () => {
    if (!cart.length || placing) return;
    setPlacing(true);
    try {
      const res = await savePlacedOrder(cart.map((c) => ({ id: c.id, sugar: c.sugar, qty: c.qty, notes: c.notes })));
      if (!res.ok) {
        alert(`Couldn’t place the order: ${res.error}`);
      } else {
        setCart([]);
        if (onQueue) await refresh();
      }
    } catch (e) {
      alert(`Couldn’t place the order: ${e instanceof Error ? e.message : "unknown error"}`);
    } finally {
      setPlacing(false);
    }
  }, [cart, onQueue, placing, refresh]);

  const finish = useCallback(
    async (id: number, status: "done" | "cancelled") => {
      queueSignature.current = "";
      setQueue((q) => q.filter((o) => o.id !== id)); // remove right away
      try {
        const res = await setOrderStatus(id, status);
        if (!res.ok) refresh();
      } catch {
        refresh(); // put it back if saving failed
      }
    },
    [refresh]
  );

  const completeOrder = useCallback((id: number) => finish(id, "done"), [finish]);
  const cancelOrder = useCallback((id: number) => finish(id, "cancelled"), [finish]);
  const contextValue = useMemo(
    () => ({
      cart,
      queue,
      queueError,
      placing,
      total,
      addToCart,
      changeQty,
      placeOrder,
      completeOrder,
      cancelOrder,
    }),
    [cart, queue, queueError, placing, total, addToCart, changeQty, placeOrder, completeOrder, cancelOrder]
  );

  return <OrderContext.Provider value={contextValue}>{children}</OrderContext.Provider>;
}

export function useOrders() {
  const ctx = useContext(OrderContext);
  if (!ctx) throw new Error("useOrders must be used inside <OrderProvider>");
  return ctx;
}
