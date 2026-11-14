"use server";

// All database work. Uses the SAME Supabase connection as your customer side.
import { createClient } from "@/utils/supabase/server";
import {
  DEFAULT_CAFE,
  DEFAULT_OPTIONS,
  TZ,
  type AddonDef,
  type Cafe,
  type CartItem,
  type Ingredient,
  type LeaderRow,
  type MenuRow,
  type QueueOrder,
  type RecipeLine,
  type SaleLine,
  type SalesSummary,
  type SheetsCfg,
} from "./menu";

type Result<T> = { ok: true; data: T } | { ok: false; error: string };
type DB = Awaited<ReturnType<typeof createClient>>;
type Row = Record<string, unknown>;

const ok = <T>(data: T): Result<T> => ({ ok: true, data });
const fail = (e: unknown): Result<never> => ({
  ok: false,
  error: e instanceof Error ? e.message : String(e),
});

export async function checkCloudConnection(): Promise<Result<null>> {
  try {
    const supabase = await createClient();
    const { error } = await supabase.from("settings").select("id").limit(1);
    if (error) return fail(error.message);
    return ok(null);
  } catch (e) {
    return fail(e);
  }
}

/* ------------------------------------------------------------------ */
/* Settings (cafe name/logo, access codes, categories, Google Sheets)  */
/* ------------------------------------------------------------------ */

// Your `settings` table has columns id + value. Our rows are prefixed "wg_" so they never clash with older rows.
const SK = (key: string) => `wg_${key}`;

async function readSetting<T>(supabase: DB, key: string): Promise<T | null> {
  const { data, error } = await supabase.from("settings").select("value").eq("id", SK(key)).maybeSingle();
  if (error) throw new Error(error.message);
  return (data?.value ?? null) as T | null;
}

async function writeSetting(supabase: DB, key: string, value: unknown) {
  const { error } = await supabase.from("settings").upsert({ id: SK(key), value });
  if (error) throw new Error(error.message);
}

export async function getSetting(key: string): Promise<Result<unknown>> {
  try {
    return ok(await readSetting(await createClient(), key));
  } catch (e) {
    return fail(e);
  }
}

export async function setSetting(key: string, value: unknown): Promise<Result<null>> {
  try {
    await writeSetting(await createClient(), key, value);
    return ok(null);
  } catch (e) {
    return fail(e);
  }
}

export async function getCafe(): Promise<Cafe> {
  try {
    const c = await readSetting<Partial<Cafe>>(await createClient(), "cafe");
    return { name: c?.name?.trim() || DEFAULT_CAFE.name, logo: c?.logo ?? null };
  } catch {
    return DEFAULT_CAFE;
  }
}

type Codes = { admin?: string; employee?: string };
type Role = "admin" | "employee";

export async function hasCode(role: Role): Promise<boolean> {
  try {
    const c = await readSetting<Codes>(await createClient(), "codes");
    return !!c?.[role];
  } catch {
    return false;
  }
}

export async function checkCode(role: Role, code: string): Promise<boolean> {
  try {
    const c = await readSetting<Codes>(await createClient(), "codes");
    return !!c?.[role] && String(c[role]) === code.trim();
  } catch {
    return false;
  }
}

export async function saveCode(role: Role, code: string): Promise<Result<null>> {
  try {
    const supabase = await createClient();
    const c = (await readSetting<Codes>(supabase, "codes")) ?? {};
    await writeSetting(supabase, "codes", { ...c, [role]: code.trim() });
    return ok(null);
  } catch (e) {
    return fail(e);
  }
}

/* ------------------------------------------------------------------ */
/* Menu                                                                */
/* ------------------------------------------------------------------ */

export async function getMenu(): Promise<Result<MenuRow[]>> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.from("menu").select("*").order("o", { ascending: true });
    if (error) return fail(error.message);
    const rows: MenuRow[] = (data ?? []).map((m: Row) => ({
      id: Number(m.id),
      name: String(m.name ?? ""),
      price: Number(m.price) || 0,
      photo: (m.photo as string | null) ?? null,
      recipe: Array.isArray(m.recipe) ? (m.recipe as RecipeLine[]) : [],
      addons: Array.isArray(m.addons)
        ? (m.addons as unknown[]).filter((a): a is AddonDef => !!a && typeof a === "object" && "name" in a)
        : [],
      sugar: m.sugar && typeof m.sugar === "object" ? (m.sugar as { on?: boolean }) : null,
      o: Number(m.o) || 0,
    }));
    return ok(rows);
  } catch (e) {
    return fail(e);
  }
}

type MenuInput = {
  id?: number;
  name: string;
  price: number;
  photo: string | null;
  recipe: RecipeLine[];
  addons: AddonDef[];
  sugarOn: boolean;
};

export async function saveMenuItem(input: MenuInput): Promise<Result<{ id: number }>> {
  try {
    const supabase = await createClient();
    const fields = {
      name: input.name.trim(),
      price: input.price,
      photo: input.photo,
      recipe: input.recipe,
      addons: input.addons,
      sugar: { on: input.sugarOn },
    };
    let savedId = input.id ?? 0;
    if (input.id != null) {
      const { error } = await supabase.from("menu").update(fields).eq("id", input.id);
      if (error) return fail(error.message);
    } else {
      const { data: last } = await supabase.from("menu").select("o").order("o", { ascending: false }).limit(1);
      const o = (Number(last?.[0]?.o) || 0) + 1;
      savedId = Date.now();
      const { error } = await supabase.from("menu").insert({ id: savedId, ...fields, o });
      if (error) return fail(error.message);
    }
    return ok({ id: savedId });
  } catch (e) {
    return fail(e);
  }
}

export async function deleteMenuItem(id: number): Promise<Result<null>> {
  try {
    const supabase = await createClient();
    const { error } = await supabase.from("menu").delete().eq("id", id);
    if (error) return fail(error.message);
    return ok(null);
  } catch (e) {
    return fail(e);
  }
}

/* ------------------------------------------------------------------ */
/* Ingredients (the `ings` table)                                      */
/* ------------------------------------------------------------------ */

// Column names are detected from your table, so small naming differences still work.
const CANDIDATES = {
  name: ["name", "ingredient", "ing", "title"],
  category: ["category", "cat", "type", "group"],
  stock: ["stock", "qty", "quantity", "amount", "amt", "on_hand"],
  unit: ["unit", "units", "uom"],
  low: ["low", "low_stock", "lowstock", "alert", "min", "threshold", "low_alert", "reorder"],
  cost: ["cost", "unit_cost", "cost_per_unit", "cpu", "price"],
} as const;
type IngField = keyof typeof CANDIDATES;
type IngCols = Record<IngField, string>;

function colsFrom(row?: Row): IngCols {
  const keys = row ? Object.keys(row) : [];
  const cols = {} as IngCols;
  (Object.keys(CANDIDATES) as IngField[]).forEach((f) => {
    cols[f] = CANDIDATES[f].find((c) => keys.includes(c)) ?? CANDIDATES[f][0];
  });
  return cols;
}

async function ingCols(supabase: DB): Promise<IngCols> {
  const { data } = await supabase.from("ings").select("*").limit(1);
  return colsFrom(data?.[0] as Row | undefined);
}

export async function getIngredients(): Promise<Result<Ingredient[]>> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.from("ings").select("*");
    if (error) return fail(error.message);
    const c = colsFrom(data?.[0] as Row | undefined);
    const list: Ingredient[] = (data ?? []).map((r: Row) => ({
      id: r.id as number | string,
      name: String(r[c.name] ?? ""),
      category: String(r[c.category] ?? ""),
      stock: Number(r[c.stock]) || 0,
      unit: String(r[c.unit] ?? ""),
      low: Number(r[c.low]) || 0,
      cost: Number(r[c.cost]) || 0,
    }));
    list.sort((a, b) => a.name.localeCompare(b.name));
    return ok(list);
  } catch (e) {
    return fail(e);
  }
}

export async function saveIngredient(input: Omit<Ingredient, "id">): Promise<Result<null>> {
  try {
    const supabase = await createClient();
    const c = await ingCols(supabase);
    const id = Date.now();
    const { error } = await supabase.from("ings").insert({
      id,
      [c.name]: input.name.trim(),
      [c.category]: input.category.trim(),
      [c.stock]: input.stock,
      [c.unit]: input.unit.trim(),
      [c.low]: input.low,
      [c.cost]: input.cost,
    });
    if (error) return fail(error.message);
    await syncIngredientToSheets(supabase, id);
    return ok(null);
  } catch (e) {
    return fail(e);
  }
}

export async function updateIngredient(
  id: number | string,
  patch: Partial<Pick<Ingredient, "category" | "stock" | "cost" | "low" | "unit">>
): Promise<Result<null>> {
  try {
    const supabase = await createClient();
    const c = await ingCols(supabase);
    const row: Row = {};
    if (patch.category !== undefined) row[c.category] = patch.category;
    if (patch.stock !== undefined) row[c.stock] = patch.stock;
    if (patch.cost !== undefined) row[c.cost] = patch.cost;
    if (patch.low !== undefined) row[c.low] = patch.low;
    if (patch.unit !== undefined) row[c.unit] = patch.unit;
    const { error } = await supabase.from("ings").update(row).eq("id", id);
    if (error) return fail(error.message);
    await syncIngredientToSheets(supabase, id);
    return ok(null);
  } catch (e) {
    return fail(e);
  }
}

export async function deleteIngredient(id: number | string): Promise<Result<null>> {
  try {
    const supabase = await createClient();
    const sheets = await readSetting<SheetsCfg>(supabase, "sheets");
    const { error } = await supabase.from("ings").delete().eq("id", id);
    if (error) return fail(error.message);
    if (sheets?.auto && sheets.url) {
      await postSheets(sheets.url, sheets.code, { ingredientRemoveIds: [String(id)] });
    }
    return ok(null);
  } catch (e) {
    return fail(e);
  }
}

/* ------------------------------------------------------------------ */
/* Orders / queue                                                      */
/* ------------------------------------------------------------------ */

type OrderRow = { id: number; num: number; placed: string; total: number; items: unknown; use?: unknown };
type OrderItem = { q?: number; name?: string; sugar?: string | null; notes?: string | null };

export async function getQueue(): Promise<Result<QueueOrder[]>> {
  try {
    const supabase = await createClient();
    const [ordersRes, menuRes] = await Promise.all([
      supabase
        .from("orders")
        .select("id, num, placed, total, items")
        .eq("status", "waiting")
        .order("placed", { ascending: true }),
      supabase.from("menu").select("name, price"),
    ]);
    if (ordersRes.error) return fail(ordersRes.error.message);

    const priceByName = new Map<string, number>(
      (menuRes.data ?? []).map((m: Row) => [String(m.name), Number(m.price) || 0])
    );

    const queue: QueueOrder[] = (ordersRes.data ?? []).map((r: OrderRow) => ({
      id: Number(r.id),
      number: Number(r.num),
      createdAt: Date.parse(r.placed),
      total: Number(r.total) || 0,
      items: (Array.isArray(r.items) ? (r.items as OrderItem[]) : []).map(
        (x, i): CartItem => ({
          key: `${r.id}-${i}`,
          id: 0,
          name: String(x?.name ?? "Drink"),
          unitPrice: priceByName.get(String(x?.name)) ?? 0,
          qty: Number(x?.q ?? 1),
          sugar: x?.sugar != null ? String(x.sugar) : null,
          notes: x?.notes ? String(x.notes) : null,
        })
      ),
    }));
    return ok(queue);
  } catch (e) {
    return fail(e);
  }
}

/** Done / Cancel. "Done" also takes the ingredients out of stock and (if on) sends to Google Sheets. */
export async function setOrderStatus(id: number, status: "done" | "cancelled"): Promise<Result<null>> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("orders")
      .update({ status })
      .eq("id", id)
      .eq("status", "waiting") // only act once
      .select("id, num, placed, total, items, use");
    if (error) return fail(error.message);

    const order = data?.[0] as OrderRow | undefined;
    if (!order) return ok(null);

    // Stock normally comes off when the order is placed. If this order never had it
    // taken off (for example an older customer order), it comes off now instead.
    // Cancelling an order puts its ingredients back.
    try {
      if (status === "cancelled") {
        const use = await claimRestore(supabase, order.id);
        if (use) await adjustStock(supabase, use, 1);
      } else {
        const use = await claimDeduction(supabase, order.id);
        if (use) await adjustStock(supabase, use, -1);
      }
    } catch {}
    if (status === "cancelled") return ok(null);

    try {
      const sheets = await readSetting<SheetsCfg>(supabase, "sheets");
      if (sheets?.auto && sheets.url) {
        const pricing = await loadPricing(supabase);
        await postSheets(sheets.url, sheets.code, { rows: rowsFor([order], pricing) });
      }
    } catch {}

    return ok(null);
  } catch (e) {
    return fail(e);
  }
}

// direction -1 takes ingredients out of stock, +1 puts them back
async function adjustStock(supabase: DB, use: Record<string, number>, direction: 1 | -1) {
  const entries = Object.entries(use ?? {}).filter(([, amt]) => Number(amt) > 0);
  if (!entries.length) return;
  const c = await ingCols(supabase);
  for (const [ing, amt] of entries) {
    const { data } = await supabase.from("ings").select("*").eq("id", ing).maybeSingle();
    if (!data) continue;
    const current = Number((data as Row)[c.stock]) || 0;
    await supabase
      .from("ings")
      .update({ [c.stock]: Math.max(0, current + direction * Number(amt)) })
      .eq("id", ing);
  }
}

// "claim" marks the order so its stock is only ever taken out (or put back) once
async function claimDeduction(supabase: DB, id: number): Promise<Record<string, number> | null> {
  const { data, error } = await supabase
    .from("orders")
    .update({ deducted: true })
    .eq("id", id)
    .or("deducted.is.null,deducted.eq.false")
    .select("use");
  if (error) throw new Error(error.message);
  return data?.[0] ? (((data[0] as Row).use ?? {}) as Record<string, number>) : null;
}

async function claimRestore(supabase: DB, id: number): Promise<Record<string, number> | null> {
  const { data, error } = await supabase
    .from("orders")
    .update({ deducted: false })
    .eq("id", id)
    .eq("deducted", true)
    .select("use");
  if (error) throw new Error(error.message);
  return data?.[0] ? (((data[0] as Row).use ?? {}) as Record<string, number>) : null;
}

/** Call this right after saving a customer order so its ingredients come out of stock. */
export async function deductOrderStock(orderId: number): Promise<Result<null>> {
  try {
    const supabase = await createClient();
    const use = await claimDeduction(supabase, orderId);
    if (use) await adjustStock(supabase, use, -1);
    return ok(null);
  } catch (e) {
    return fail(e);
  }
}

type LineInput = { id: number | string; sugar: string | null; qty: number; notes?: string | null };

export async function placeOrder(lines: LineInput[]): Promise<Result<{ orderNumber: number }>> {
  try {
    if (!lines || lines.length === 0) return fail("The order is empty.");
    const supabase = await createClient();

    const ids = [...new Set(lines.map((l) => l.id))];
    const { data: menu, error: menuError } = await supabase
      .from("menu")
      .select("id, name, price, recipe")
      .in("id", ids);
    if (menuError || !menu) return fail(menuError?.message ?? "Could not load the menu.");

    const menuById = new Map(menu.map((m: Row) => [String(m.id), m]));

    let total = 0;
    const items: { q: number; cost: number; name: string; sugar: string | null; notes: string | null }[] = [];
    const use: Record<string, number> = {};

    for (const line of lines) {
      const drink = menuById.get(String(line.id));
      if (!drink) return fail("A drink in the order is no longer on the menu.");
      const qty = Math.max(1, Math.floor(Number(line.qty)) || 1);
      total += (Number(drink.price) || 0) * qty;
      items.push({
        q: qty,
        cost: 0,
        name: String(drink.name),
        sugar: line.sugar,
        notes: line.notes?.trim().slice(0, 140) || null,
      });

      const recipe = Array.isArray(drink.recipe) ? (drink.recipe as RecipeLine[]) : [];
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
    if (lastError) return fail(lastError.message);
    const num = (Number(last?.[0]?.num) || 0) + 1;

    const { error } = await supabase.from("orders").insert({
      id: Date.now() * 100 + Math.floor(Math.random() * 100),
      num,
      placed: new Date().toISOString(),
      total,
      items,
      use,
      status: "waiting",
      deducted: true,
    });
    if (error) return fail(error.message);

    // take the ingredients out of stock now
    try {
      await adjustStock(supabase, use, -1);
    } catch {}

    return ok({ orderNumber: num });
  } catch (e) {
    return fail(e);
  }
}

/* ------------------------------------------------------------------ */
/* Sales                                                               */
/* ------------------------------------------------------------------ */

type Pricing = { priceByName: Map<string, number>; costByName: Map<string, number> };

async function loadPricing(supabase: DB): Promise<Pricing> {
  const [menuRes, ingRes] = await Promise.all([
    supabase.from("menu").select("name, price, recipe"),
    supabase.from("ings").select("*"),
  ]);
  const c = colsFrom(ingRes.data?.[0] as Row | undefined);
  const costById = new Map<string, number>(
    (ingRes.data ?? []).map((r: Row) => [String(r.id), Number(r[c.cost]) || 0])
  );
  const priceByName = new Map<string, number>();
  const costByName = new Map<string, number>();
  for (const m of (menuRes.data ?? []) as Row[]) {
    const name = String(m.name);
    priceByName.set(name, Number(m.price) || 0);
    const recipe = Array.isArray(m.recipe) ? (m.recipe as RecipeLine[]) : [];
    costByName.set(
      name,
      recipe.reduce((s, r) => s + (costById.get(String(r.ing)) ?? 0) * (Number(r.amt) || 0), 0)
    );
  }
  return { priceByName, costByName };
}

function linesOf(o: OrderRow, p: Pricing): SaleLine[] {
  const items = Array.isArray(o.items) ? (o.items as OrderItem[]) : [];
  return items.map((x) => {
    const q = Number(x?.q ?? 1);
    const name = String(x?.name ?? "Drink");
    const price = (p.priceByName.get(name) ?? 0) * q;
    const cost = (p.costByName.get(name) ?? 0) * q;
    return {
      orderId: Number(o.id),
      num: Number(o.num),
      name,
      product: q > 1 ? `${name} ×${q}` : name,
      qty: q,
      sugar: x?.sugar != null ? String(x.sugar) : null,
      notes: x?.notes ? String(x.notes) : null,
      time: Date.parse(o.placed),
      price,
      cost,
      profit: price - cost,
    };
  });
}

export type SalesRange = { from?: string; to?: string };
type SalesReset = { mode: "manual" | "daily" | "weekly" | "monthly" | "yearly"; lastReset?: string };

function resetIsDue(config: SalesReset, now: Date) {
  if (config.mode === "manual" || !config.lastReset) return config.mode !== "manual";
  const last = new Date(config.lastReset);
  const days = (now.getTime() - last.getTime()) / 86_400_000;
  if (config.mode === "daily") return days >= 1;
  if (config.mode === "weekly") return days >= 7;
  if (config.mode === "monthly") return now.getUTCMonth() !== last.getUTCMonth() || now.getUTCFullYear() !== last.getUTCFullYear();
  return now.getUTCFullYear() !== last.getUTCFullYear();
}

export async function getSales(range?: SalesRange): Promise<Result<SalesSummary>> {
  try {
    const supabase = await createClient();
    const reset = await readSetting<SalesReset>(supabase, "salesReset");
    if (reset && resetIsDue(reset, new Date())) {
      const { error: clearError } = await supabase.from("orders").update({ status: "cleared" }).eq("status", "done");
      if (clearError) return fail(clearError.message);
      await writeSetting(supabase, "salesReset", { ...reset, lastReset: new Date().toISOString() });
    }

    let query = supabase
      .from("orders")
      .select("id, num, placed, total, items")
      .eq("status", "done")
      .order("placed", { ascending: false });
    if (range?.from) query = query.gte("placed", range.from);
    if (range?.to) query = query.lt("placed", range.to);
    const { data, error } = await query;
    if (error) return fail(error.message);

    const orders = (data ?? []) as OrderRow[];
    const pricing = await loadPricing(supabase);
    const lines = orders.flatMap((o) => linesOf(o, pricing));

    const info = await loadStarInfo(supabase);
    const leaderboard: LeaderRow[] = [...info.counts.entries()]
      .map(([name, qty]) => {
        const m = info.menu.find((x) => x.name === name);
        const id = m ? String(m.id) : null;
        return {
          id,
          name,
          qty,
          revenue: qty * (m?.price ?? 0),
          starred: id != null && info.effective.includes(id),
          manual: id != null && info.cfg.ids.includes(id),
        };
      })
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 10);

    return ok({
      lines,
      totalSales: orders.reduce((s, o) => s + (Number(o.total) || 0), 0),
      totalCost: lines.reduce((s, l) => s + l.cost, 0),
      orders: orders.length,
      items: lines.reduce((s, l) => s + l.qty, 0),
      leaderboard,
    });
  } catch (e) {
    return fail(e);
  }
}

/** "Clear" hides finished orders from Sales. Nothing is deleted (status becomes "cleared"). */
export async function clearSales(): Promise<Result<null>> {
  try {
    const supabase = await createClient();
    const { error } = await supabase.from("orders").update({ status: "cleared" }).eq("status", "done");
    if (error) return fail(error.message);
    return ok(null);
  } catch (e) {
    return fail(e);
  }
}

/* ------------------------------------------------------------------ */
/* Google Sheets                                                       */
/* ------------------------------------------------------------------ */

function ingredientSheetRow(row: Row, columns: IngCols): (string | number)[] {
  return [
    String(row.id),
    String(row[columns.name] ?? ""),
    String(row[columns.category] ?? ""),
    Number(row[columns.stock]) || 0,
    String(row[columns.unit] ?? ""),
    Number(row[columns.low]) || 0,
    Number(row[columns.cost]) || 0,
  ];
}

async function syncIngredientToSheets(supabase: DB, id: number | string) {
  const cfg = await readSetting<SheetsCfg>(supabase, "sheets");
  if (!cfg?.auto || !cfg.url) return;
  const { data, error } = await supabase.from("ings").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return;
  const columns = colsFrom(data as Row);
  await postSheets(cfg.url, cfg.code, {
    ingredients: [ingredientSheetRow(data as Row, columns)],
  });
}

function rowsFor(orders: OrderRow[], pricing: Pricing): (string | number)[][] {
  return orders.flatMap((o) =>
    linesOf(o, pricing).map((l) => [
      l.orderId,
      new Date(l.time).toLocaleDateString("en-CA", { timeZone: TZ }),
      new Date(l.time).toLocaleTimeString("en-GB", { timeZone: TZ, hour12: false }),
      l.product,
      [l.sugar ? `Sugar ${l.sugar}` : "", l.notes ?? ""].filter(Boolean).join(", "),
      l.price,
      l.cost,
      l.profit,
    ])
  );
}

async function postSheets(url: string, code: string, payload: Record<string, unknown>) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({ code, ...payload }),
    redirect: "follow",
    cache: "no-store",
  });
  const text = await res.text();
  let json: { ok?: boolean; error?: string; added?: number };
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error("The sheet didn’t answer correctly. Check the URL, and that the script is deployed for “Anyone”.");
  }
  if (!json.ok) throw new Error(json.error ?? "The sheet rejected the request.");
  return json;
}

export async function testSheets(url: string, code: string): Promise<Result<null>> {
  try {
    if (!url.trim()) return fail("Paste the script URL first.");
    await postSheets(url.trim(), code.trim(), { test: true });
    return ok(null);
  } catch (e) {
    return fail(e);
  }
}

export async function sendPastSales(): Promise<Result<{ rows: number }>> {
  try {
    const supabase = await createClient();
    const cfg = await readSetting<SheetsCfg>(supabase, "sheets");
    if (!cfg?.url) return fail("Save the script URL first.");

    const { data, error } = await supabase
      .from("orders")
      .select("id, num, placed, total, items")
      .in("status", ["done", "cleared"])
      .order("placed", { ascending: true });
    if (error) return fail(error.message);

    const pricing = await loadPricing(supabase);
    const rows = rowsFor((data ?? []) as OrderRow[], pricing);
    for (let i = 0; i < rows.length; i += 400) {
      await postSheets(cfg.url, cfg.code, { rows: rows.slice(i, i + 400) });
    }

    return ok({ rows: rows.length });
  } catch (e) {
    return fail(e);
  }
}

export async function sendCurrentIngredients(): Promise<Result<{ rows: number }>> {
  try {
    const supabase = await createClient();
    const cfg = await readSetting<SheetsCfg>(supabase, "sheets");
    if (!cfg?.url) return fail("Save the script URL first.");

    const { data, error } = await supabase.from("ings").select("*");
    if (error) return fail(error.message);

    const columns = colsFrom(data?.[0] as Row | undefined);
    const rows = (data ?? []).map((row: Row) => ingredientSheetRow(row, columns));
    for (let i = 0; i < rows.length; i += 400) {
      await postSheets(cfg.url, cfg.code, { ingredients: rows.slice(i, i + 400) });
    }
    return ok({ rows: rows.length });
  } catch (e) {
    return fail(e);
  }
}

/* ------------------------------------------------------------------ */
/* Quick order options, best-seller stars                              */
/* ------------------------------------------------------------------ */

type StarCfg = { auto: boolean; ids: string[] };

/** The quick-pick requests shown when ordering (Less ice, More sugar…). */
export async function getOrderOptions(): Promise<string[]> {
  try {
    const list = await readSetting<unknown>(await createClient(), "options");
    return Array.isArray(list) ? list.map(String).filter(Boolean) : DEFAULT_OPTIONS;
  } catch {
    return DEFAULT_OPTIONS;
  }
}

export async function getStarConfig(): Promise<StarCfg> {
  try {
    const c = await readSetting<Partial<StarCfg>>(await createClient(), "stars");
    const raw: unknown = c?.ids;
    return { auto: c?.auto !== false, ids: Array.isArray(raw) ? raw.map(String) : [] };
  } catch {
    return { auto: true, ids: [] };
  }
}

export async function setStarAuto(auto: boolean): Promise<Result<null>> {
  try {
    const supabase = await createClient();
    const c = (await readSetting<Partial<StarCfg>>(supabase, "stars")) ?? {};
    await writeSetting(supabase, "stars", { ids: Array.isArray(c.ids) ? c.ids : [], auto });
    return ok(null);
  } catch (e) {
    return fail(e);
  }
}

/** Add or remove a star by hand on one menu item. */
export async function setStar(menuId: number | string, on: boolean): Promise<Result<null>> {
  try {
    const supabase = await createClient();
    const c = (await readSetting<Partial<StarCfg>>(supabase, "stars")) ?? {};
    const ids = new Set<string>(Array.isArray(c.ids) ? c.ids.map(String) : []);
    if (on) ids.add(String(menuId));
    else ids.delete(String(menuId));
    await writeSetting(supabase, "stars", { auto: c.auto !== false, ids: [...ids] });
    return ok(null);
  } catch (e) {
    return fail(e);
  }
}

// every finished order ever (done + cleared) counted by drink name
async function loadStarInfo(supabase: DB) {
  const [ordersRes, menuRes, cfg] = await Promise.all([
    supabase.from("orders").select("items").in("status", ["done", "cleared"]),
    supabase.from("menu").select("id, name, price"),
    readSetting<Partial<StarCfg>>(supabase, "stars"),
  ]);
  if (ordersRes.error) throw new Error(ordersRes.error.message);

  const counts = new Map<string, number>();
  for (const o of (ordersRes.data ?? []) as { items: unknown }[]) {
    for (const x of (Array.isArray(o.items) ? o.items : []) as OrderItem[]) {
      const n = String(x?.name ?? "");
      if (n) counts.set(n, (counts.get(n) ?? 0) + Number(x?.q ?? 1));
    }
  }

  const menu = ((menuRes.data ?? []) as Row[]).map((m) => ({
    id: m.id as number | string,
    name: String(m.name),
    price: Number(m.price) || 0,
  }));
  const rawIds: unknown = cfg?.ids;
  const starCfg: StarCfg = { auto: cfg?.auto !== false, ids: Array.isArray(rawIds) ? rawIds.map(String) : [] };

  const effective = new Set<string>(starCfg.ids);
  if (starCfg.auto && counts.size > 0) {
    const top = Math.max(...counts.values());
    const best = [...counts.entries()].filter(([, q]) => q === top).slice(0, 3);
    for (const [name] of best) {
      const m = menu.find((x) => x.name === name);
      if (m) effective.add(String(m.id));
    }
  }
  return { counts, menu, cfg: starCfg, effective: [...effective] };
}

/** Used by the customer screen: the quick options and which drinks get the blue star. */
export async function getCustomerExtras(): Promise<{ options: string[]; starIds: string[] }> {
  const options = await getOrderOptions();
  try {
    const info = await loadStarInfo(await createClient());
    return { options, starIds: info.effective };
  } catch {
    return { options, starIds: [] };
  }
}
