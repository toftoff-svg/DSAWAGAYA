"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import BestSellerStar from "../../_components/BestSellerStar";
import Modal from "../_components/Modal";
import { getSales, resetSales, setStar } from "../_lib/actions";
import { peso, type PaymentMethod, type SalesSummary } from "../_lib/menu";

export default function SalesPage() {
  const [period, setPeriod] = useState<"today" | "week" | "last-week" | "range">("today");
  const [paymentFilter, setPaymentFilter] = useState<"all" | PaymentMethod>("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [data, setData] = useState<SalesSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [resetTarget, setResetTarget] = useState<"pos" | "sheets" | "both">("pos");
  const [resetting, setResetting] = useState(false);

  const range = useMemo(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    if (period === "week") {
      const day = start.getDay();
      start.setDate(start.getDate() - (day === 0 ? 6 : day - 1));
    } else if (period === "last-week") {
      const day = start.getDay();
      start.setDate(start.getDate() - (day === 0 ? 6 : day - 1) - 7);
    } else if (period === "range" && fromDate) {
      const custom = new Date(`${fromDate}T00:00:00`);
      if (!Number.isNaN(custom.getTime())) start.setTime(custom.getTime());
    }
    const end = new Date(start);
    if (period === "last-week" || period === "week") end.setDate(start.getDate() + 7);
    else if (period === "range" && toDate) end.setTime(new Date(`${toDate}T00:00:00`).getTime() + 86_400_000);
    else end.setDate(start.getDate() + 1);
    return { from: start.toISOString(), to: end.toISOString(), payment: paymentFilter === "all" ? undefined : paymentFilter };
  }, [fromDate, paymentFilter, period, toDate]);

  const load = useCallback(async () => {
    const res = await getSales(range);
    if (res.ok) {
      setData(res.data);
      setError(null);
    } else setError(`Couldn’t load sales: ${res.error}`);
    setLoading(false);
  }, [range]);

  useEffect(() => {
    load();
  }, [load]);

  const toggleStar = async (id: string, on: boolean) => {
    const res = await setStar(id, on);
    if (!res.ok) setError(res.error);
    else load();
  };

  const profit = data ? data.totalSales - data.totalCost : 0;
  const average = data && data.orders > 0 ? data.totalSales / data.orders : 0;

  const copyTable = async () => {
    if (!data) return;
    const head = ["Product", "Time", "Price", "Cost", "Profit"].join("\t");
    const rows = data.lines.map((l) =>
      [l.product, new Date(l.time).toLocaleString(), l.price, l.cost, l.profit].join("\t")
    );
    try {
      await navigator.clipboard.writeText([head, ...rows].join("\n"));
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {}
  };

  const doReset = async () => {
    setResetting(true);
    const res = await resetSales(resetTarget);
    setResetting(false);
    if (!res.ok) setError(`Couldn’t reset sales: ${res.error}`);
    else {
      setConfirmReset(false);
      setError(null);
      load();
    }
  };

  const card = (label: string, value: string) => (
    <div className="emp-bd rounded-2xl border-2 p-4">
      <p className="text-sm font-bold">{label}</p>
      <p className="mt-2 text-xl">{value}</p>
    </div>
  );

  return (
    <section>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Sales</h1>
          <p className="mb-4 text-xs opacity-70">Newest first</p>
        </div>
        <div className="flex items-center gap-4">
          <button type="button" onClick={copyTable} className="emp-bd rounded-full border-2 px-3 py-1 text-sm">
            {copied ? "Copied!" : "Copy Whole table"}
          </button>
          <button
            type="button"
            onClick={() => {
              setResetTarget("pos");
              setError(null);
              setConfirmReset(true);
            }}
            className="text-sm font-semibold emp-danger"
          >
            RESET SALES
          </button>
        </div>
      </div>

      <div className="emp-bd my-4 flex flex-wrap items-end gap-2 rounded-2xl border-2 p-3">
        <label className="text-xs font-semibold">
          Period
          <select className="emp-input mt-1 min-w-36" value={period} onChange={(e) => setPeriod(e.target.value as typeof period)}>
            <option value="today">Today</option>
            <option value="week">This week</option>
            <option value="last-week">Last week</option>
            <option value="range">Date range</option>
          </select>
        </label>
        <label className="text-xs font-semibold">
          Payment
          <select className="emp-input mt-1 min-w-36" value={paymentFilter} onChange={(e) => setPaymentFilter(e.target.value as typeof paymentFilter)}>
            <option value="all">All payments</option>
            <option value="cash">Cash only</option>
            <option value="qr">QR only</option>
          </select>
        </label>
        {period === "range" && (
          <>
            <label className="text-xs font-semibold">
              From
              <input className="emp-input mt-1" type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
            </label>
            <label className="text-xs font-semibold">
              To
              <input className="emp-input mt-1" type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
            </label>
          </>
        )}
      </div>

      {error && !confirmReset && <p className="mb-3 text-sm emp-danger">{error}</p>}
      {loading && <p className="text-sm opacity-70">Loading…</p>}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {card("Total Sales", peso(data?.totalSales ?? 0))}
        {card("Profit", peso(profit))}
        {card("Item Sold", String(data?.items ?? 0))}
        {card("Average", peso(average))}
      </div>

      <div className="emp-bd mt-6 rounded-2xl border-2 p-4">
        <div className="emp-row flex items-center justify-between pb-2">
          <h2 className="font-bold">Leaderboard · Most Ordered</h2>
          <span className="text-xs opacity-70">All time</span>
        </div>
        {data && data.leaderboard.length > 0 ? (
          <ol className="mt-3 space-y-3">
            {data.leaderboard.map((r, i) => {
              const top = data.leaderboard[0].qty || 1;
              return (
                <li key={r.name} className="flex items-center gap-3">
                  <span className="w-7 text-center text-lg font-black">{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="truncate font-semibold">
                        {r.name}
                        {r.starred && (
                          <BestSellerStar title="Shows a star on the customer screen" />
                        )}
                      </span>
                      <span className="shrink-0 text-sm">
                        <span className="font-bold">{r.qty}</span> sold · {peso(r.revenue)}
                      </span>
                    </div>
                    <div className="emp-photo mt-1 h-2 rounded-full">
                      <div className="emp-solid h-2 rounded-full" style={{ width: `${(r.qty / top) * 100}%` }} />
                    </div>
                  </div>
                  {r.id && (
                    <button
                      type="button"
                      onClick={() => toggleStar(r.id as string, !r.manual)}
                      className="emp-bd shrink-0 rounded-full border-2 px-3 py-0.5 text-xs"
                      title={r.manual ? "Remove the star you added" : "Add a star by hand"}
                    >
                      {r.manual ? "Unstar" : r.starred ? "Pin ★" : "Add ★"}
                    </button>
                  )}
                </li>
              );
            })}
          </ol>
        ) : (
          <p className="mt-3 text-sm opacity-70">Nothing sold yet. The ranking appears after the first finished order.</p>
        )}
      </div>

      <div className="emp-bd mt-6 overflow-x-auto rounded-2xl border-2 p-4">
        <div className="min-w-[560px]">
          <div className="emp-row grid grid-cols-[2fr_2fr_1fr_1fr_1fr_1fr] gap-2 pb-2 text-xs font-semibold">
            <span>PRODUCT</span>
            <span>TIME</span>
            <span>PAYMENT</span>
            <span>PRICE</span>
            <span>COST</span>
            <span>PROFIT</span>
          </div>
          {data?.lines.map((l, i) => (
            <div key={`${l.orderId}-${i}`} className="grid grid-cols-[2fr_2fr_1fr_1fr_1fr_1fr] gap-2 emp-row-soft py-2 text-sm">
              <span>
                {l.product}
                {l.sugar || l.notes ? (
                  <span className="block text-xs opacity-70">
                    {[l.sugar && `Sugar ${l.sugar}`, l.notes].filter(Boolean).join(", ")}
                  </span>
                ) : null}
              </span>
              <span>{new Date(l.time).toLocaleString()}</span>
              <span className="font-semibold">{l.payment === "qr" ? "QR" : "Cash"}</span>
              <span>{peso(l.price)}</span>
              <span>{peso(l.cost)}</span>
              <span>{peso(l.profit)}</span>
            </div>
          ))}
          {data && data.lines.length === 0 && <p className="py-8 text-center text-sm opacity-70">Finished orders show up here.</p>}
        </div>
      </div>
      <p className="mt-2 text-xs opacity-70">
        Cost comes from each drink’s ingredients and the cost set in Inventory. Online prices and assumed portions are estimates; ingredients without a unit cost are excluded, so profit may be overstated until actual supplier costs are entered.
      </p>

      {confirmReset && (
        <Modal title="Reset sales" onClose={() => !resetting && setConfirmReset(false)} closeOnEsc={!resetting}>
          <fieldset disabled={resetting}>
            <legend className="mb-3 text-sm">Where should sales be reset?</legend>
            <div className="space-y-2">
              {([
                ["pos", "POS only", "Hide completed orders from the POS sales records."],
                ["sheets", "Google Sheets only", "Clear sales rows in the connected spreadsheet."],
                ["both", "Both", "Reset POS sales and clear the spreadsheet sales rows."],
              ] as const).map(([value, label, description]) => (
                <label key={value} className="emp-bd flex cursor-pointer items-start gap-3 rounded-xl border-2 p-3">
                  <input
                    type="radio"
                    name="sales-reset-target"
                    value={value}
                    checked={resetTarget === value}
                    onChange={() => setResetTarget(value)}
                    className="mt-1"
                  />
                  <span>
                    <span className="block text-sm font-semibold">{label}</span>
                    <span className="block text-xs opacity-70">{description}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
          {resetTarget !== "sheets" && <p className="mt-3 text-xs opacity-70">POS orders aren’t deleted; they’re marked cleared and removed from sales totals.</p>}
          {resetTarget !== "pos" && <p className="mt-2 text-xs opacity-70">The spreadsheet header stays in place. This cannot be undone.</p>}
          {error && <p className="mt-3 text-sm emp-danger">{error}</p>}
          <div className="mt-5 flex items-center justify-between">
            <button type="button" onClick={() => setConfirmReset(false)} disabled={resetting} className="emp-bd rounded-full border-2 px-5 py-2">
              Cancel
            </button>
            <button type="button" onClick={doReset} disabled={resetting} className="emp-bd emp-solid rounded-full border-2 px-5 py-2 font-bold disabled:opacity-50">
              {resetting ? "Resetting…" : `Reset ${resetTarget === "pos" ? "POS" : resetTarget === "sheets" ? "Sheets" : "Both"}`}
            </button>
          </div>
        </Modal>
      )}
    </section>
  );
}
