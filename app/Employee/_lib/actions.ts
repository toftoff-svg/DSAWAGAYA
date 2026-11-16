"use server";

// Server actions: these use the SAME Supabase connection as your customer side.
import { createClient } from "@/utils/supabase/server";
import type { CartItem, MenuRow, PaymentMethod, QueueOrder } from "./menu";
import { setOrderStatus as updateOrderStatus } from "../../Admin2/_lib/actions";

type Result<T> = { ok: true; data: T } | { ok: false; error: string };

export async function getMenu(): Promise<Result<MenuRow[]>> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("menu").select("*").order("o", { ascending: true });
  if (error) return { ok: false, error: error.message };
  const menu = (data ?? []).map((item) => ({
    ...item,
    category: String(item.category ?? "drinks").toLowerCase() === "pastries" ? "pastries" : "drinks",
    color: /^#[0-9a-f]{6}$/i.test(String(item.color ?? "")) ? String(item.color) : "#0F47AF",
  })) as MenuRow[];
  return { ok: true, data: menu };
}

export async function getOrderOptions(): Promise<string[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("settings").select("value").eq("id", "wg_options").maybeSingle();
  return Array.isArray(data?.value) ? data.value.map(String).filter(Boolean) : ["Less ice", "More sugar", "No sugar", "Less sweet"];
}

/** Orders still waiting, oldest first. Includes orders placed on the customer side. */
export async function getQueue(): Promise<Result<QueueOrder[]>> {
  const supabase = await createClient();

  const [ordersRes, menuRes, timeoutRes] = await Promise.all([
    supabase
      .from("orders")
      .select("id, num, placed, total, items, payment, customer_name")
      .eq("status", "waiting")
      .order("placed", { ascending: true }),
    supabase.from("menu").select("name, price"),
    supabase.from("settings").select("value").eq("id", "wg_queueTimeout").maybeSingle(),
  ]);

  if (ordersRes.error) return { ok: false, error: ordersRes.error.message };

  // saved orders only keep the drink name, so look the price up from the menu
  const priceByName = new Map<string, number>(
    (menuRes.data ?? []).map((m) => [String(m.name), Number(m.price) || 0])
  );
  const rawTimeout = timeoutRes.data?.value;
  const timeoutConfig = rawTimeout && typeof rawTimeout === "object"
    ? rawTimeout as { enabled?: boolean; minutes?: number }
    : { enabled: rawTimeout != null, minutes: Number(rawTimeout) };
  const timeoutMinutes = timeoutConfig.enabled === false
    ? null
    : Math.max(1, Number(timeoutConfig.minutes) || 10);

  const queue: QueueOrder[] = (ordersRes.data ?? []).map((r) => ({
    id: Number(r.id),
    number: Number(r.num),
    createdAt: Date.parse(r.placed),
    total: Number(r.total) || 0,
    payment: r.payment === "qr" ? "qr" : "cash",
    customerName: String(r.customer_name ?? "Walk-in"),
    timeoutMinutes,
    items: (Array.isArray(r.items) ? r.items : []).map(
      (x, i): CartItem => ({
        key: `${r.id}-${i}`,
        id: 0,
        name: String(x?.name ?? "Drink"),
        unitPrice: priceByName.get(String(x?.name)) ?? 0,
        qty: Number(x?.q ?? 1),
        sugar: x?.sugar != null ? String(x.sugar) : null,
        notes: x?.notes != null ? String(x.notes) : null,
      })
    ),
  }));

  return { ok: true, data: queue };
}

export async function setOrderStatus(id: number, status: "done" | "cancelled"): Promise<Result<null>> {
  return updateOrderStatus(id, status);
}

type LineInput = { id: number | string; sugar: string | null; qty: number; notes?: string | null };
type RecipeEntry = { ing: number | string; amt: number };

/** Place an order from the employee Orders page (same format as the customer side). */
export async function placeOrder(lines: LineInput[], payment: PaymentMethod = "cash", customerName = ""): Promise<Result<{ orderNumber: number }>> {
  if (!lines || lines.length === 0) return { ok: false, error: "The order is empty." };
  const normalizedCustomerName = customerName.trim().slice(0, 80);
  if (!normalizedCustomerName) return { ok: false, error: "Customer name is required." };

  const supabase = await createClient();

  const ids = [...new Set(lines.map((l) => l.id))];
  const { data: menu, error: menuError } = await supabase
    .from("menu")
    .select("id, name, price, recipe")
    .in("id", ids);
  if (menuError || !menu) return { ok: false, error: menuError?.message ?? "Could not load the menu." };

  const menuById = new Map(menu.map((m) => [String(m.id), m]));

  let total = 0;
  const items: { q: number; cost: number; name: string; sugar: string | null; notes: string | null }[] = [];
  const use: Record<string, number> = {};

  for (const line of lines) {
    const drink = menuById.get(String(line.id));
    if (!drink) return { ok: false, error: "A drink in the order is no longer on the menu." };

    const qty = Math.max(1, Math.floor(Number(line.qty)) || 1);
    total += (Number(drink.price) || 0) * qty;
    items.push({ q: qty, cost: 0, name: drink.name, sugar: line.sugar, notes: line.notes?.trim().slice(0, 140) || null });

    const recipe: RecipeEntry[] = Array.isArray(drink.recipe) ? drink.recipe : [];
    for (const r of recipe) {
      const key = String(r.ing);
      use[key] = (use[key] || 0) + (Number(r.amt) || 0) * qty;
    }
  }

  const { data: last, error: lastError } = await supabase
    .from("orders")
    .select("num")
    .order("num", { ascending: false })
    .limit(1);
  if (lastError) return { ok: false, error: lastError.message };
  const num = (last?.[0]?.num ?? 0) + 1;

  const id = Date.now() * 100 + Math.floor(Math.random() * 100);

  const { error } = await supabase.from("orders").insert({
    id,
    num,
    placed: new Date().toISOString(),
    total,
    items,
    use,
    status: "waiting",
    payment,
    customer_name: normalizedCustomerName,
  });
  if (error) return { ok: false, error: error.message };

  return { ok: true, data: { orderNumber: num } };
}
