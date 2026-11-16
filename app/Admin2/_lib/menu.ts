// Types + helpers shared by the admin pages

export const CUSTOMER_PATH = "/"; // where "idle" kiosk mode sends the tablet
export const TZ = "Asia/Manila"; // used for dates sent to Google Sheets

export type RecipeLine = { ing: number | string; amt: number };
export type AddonDef = { name: string; price: number; ing: number | string | null; amt: number };
export type PaymentMethod = "cash" | "qr";

export type MenuRow = {
  id: number;
  name: string;
  description: string;
  color: string;
  price: number;
  category: "drinks" | "pastries";
  photo: string | null;
  recipe: RecipeLine[];
  addons: AddonDef[];
  sugar: { on?: boolean } | null;
  o: number;
};

export type CartItem = {
  key: string;
  id: number;
  name: string;
  unitPrice: number;
  qty: number;
  sugar: string | null;
  notes: string | null; // e.g. "Less ice, no straw"
};

export type QueueOrder = {
  id: number;
  number: number;
  createdAt: number;
  items: CartItem[];
  total: number;
  payment: PaymentMethod;
  customerName: string;
};

export type Ingredient = {
  id: number | string;
  name: string;
  category: string;
  stock: number;
  lastRestockedAt?: string | null;
  stockHistory?: RestockHistoryEntry[];
  unit: string;
  low: number;
  cost: number;
};

export type RestockHistoryEntry = {
  id: string;
  amount: number;
  addedAt: string;
};

export type SaleLine = {
  orderId: number;
  num: number;
  name: string;
  product: string;
  qty: number;
  sugar: string | null;
  notes: string | null;
  time: number;
  price: number;
  cost: number;
  profit: number;
  payment: PaymentMethod;
  customerName: string;
};

export type CustomerLeaderRow = { name: string; orders: number; items: number; revenue: number };

export type LeaderRow = {
  id: string | null; // menu id, when the drink is still on the menu
  name: string;
  qty: number;
  revenue: number;
  starred: boolean; // shows the gold star on the customer screen
  manual: boolean; // star was added by hand
};

export type SalesSummary = {
  lines: SaleLine[];
  totalSales: number;
  totalCost: number;
  orders: number;
  items: number;
  leaderboard: LeaderRow[];
  customerLeaderboard: CustomerLeaderRow[];
  paymentStats: { overallSales: number; cashSales: number; qrSales: number; overallOrders: number; cashOrders: number; qrOrders: number };
};

export type Cafe = { name: string; logo: string | null };
export type SheetsCfg = { url: string; code: string; auto: boolean };

export const DEFAULT_CAFE: Cafe = { name: "Wagaya", logo: null };

export const UNITS = ["g", "kg", "ml", "L", "pcs", "tbsp", "tsp", "cup", "oz", "slice", "scoop", "pack"];

export const DEFAULT_OPTIONS = ["Less ice", "No ice", "Extra ice", "Less sugar", "More sugar"];

export const SUGAR_LEVELS = ["0%", "25%", "50%", "75%", "100%"];
export const DEFAULT_SUGAR = "100%";

export const hasSugar = (s: unknown) =>
  !!s && typeof s === "object" && !Array.isArray(s) && (s as { on?: boolean }).on === true;

export const peso = (n: number) =>
  "₱" + Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function timeAgo(ts: number, now: number) {
  const s = Math.max(0, Math.floor((now - ts) / 1000));
  if (s < 60) return `${s} s ago`;
  return `${Math.floor(s / 60)} min ago`;
}
