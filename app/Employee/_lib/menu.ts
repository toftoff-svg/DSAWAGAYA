// Types + helpers shared by the employee pages

export type MenuRow = {
  id: number;
  name: string;
  price: number;
  photo: string | null;
  recipe: unknown;
  addons: unknown;
  sugar: { on?: boolean } | null; // sugar levels only show when "on" is true
  o: number; // sort order
};

export type CartItem = {
  key: string;
  id: number;
  name: string;
  unitPrice: number;
  qty: number;
  sugar: string | null; // e.g. "50%"
  notes?: string | null;
};

export type QueueOrder = {
  id: number; // database id (used for Done / Cancel)
  number: number; // order number shown to people (the `num` column)
  createdAt: number;
  items: CartItem[];
  total: number;
  timeoutMinutes: number | null;
};

// Same sugar options as the customer side
export const SUGAR_LEVELS = ["0%", "25%", "50%", "75%", "100%"];
export const DEFAULT_SUGAR = "100%";

export const hasSugar = (s: unknown) =>
  !!s && typeof s === "object" && !Array.isArray(s) && (s as { on?: boolean }).on === true;

export const peso = (n: number) => `₱${Number(n || 0).toFixed(2)}`;

export function timeAgo(ts: number, now: number) {
  const s = Math.max(0, Math.floor((now - ts) / 1000));
  if (s < 60) return `${s} s ago`;
  return `${Math.floor(s / 60)} min ago`;
}
