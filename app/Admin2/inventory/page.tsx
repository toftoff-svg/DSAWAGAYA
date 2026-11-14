"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import IngredientModal from "../_components/IngredientModal";
import Modal from "../_components/Modal";
import { deleteIngredient, getIngredients, getSetting, setSetting, updateIngredient } from "../_lib/actions";
import { type Ingredient } from "../_lib/menu";

const statusOf = (i: Ingredient) => (i.stock <= 0 ? "Low" : i.stock <= i.low ? "Low" : "In stock");

// Tinted pill color per category
const TONES = [
  "bg-emerald-500/15 text-emerald-400",
  "bg-sky-500/15 text-sky-400",
  "bg-amber-500/15 text-amber-400",
  "bg-fuchsia-500/15 text-fuchsia-400",
  "bg-rose-500/15 text-rose-400",
  "bg-violet-500/15 text-violet-400",
];

const toneOf = (c: string) => {
  if (!c) return "bg-white/5";
  let h = 0;
  for (const ch of c) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return TONES[h % TONES.length];
};

export default function InventoryPage() {
  const [ings, setIngs] = useState<Ingredient[]>([]);
  const [savedCats, setSavedCats] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  const [showNew, setShowNew] = useState(false);
  const [showNewCat, setShowNewCat] = useState(false);
  const [showRemoveCat, setShowRemoveCat] = useState(false);
  const [catName, setCatName] = useState("");
  const [catToRemove, setCatToRemove] = useState("");
  const [copied, setCopied] = useState(false);
  const [filter, setFilter] = useState("all");

  const load = useCallback(async () => {
    const [a, b] = await Promise.all([getIngredients(), getSetting("categories")]);
    if (a.ok) {
      setIngs(a.data);
      setError(null);
    } else setError(a.error);
    if (b.ok && Array.isArray(b.data)) setSavedCats((b.data as unknown[]).map(String));
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const categories = useMemo(() => {
    const set = new Set<string>(savedCats);
    ings.forEach((i) => i.category && set.add(i.category));
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [ings, savedCats]);

  const counts = useMemo(() => {
    const m: Record<string, number> = { all: ings.length };
    ings.forEach((i) => {
      if (i.category) m[i.category] = (m[i.category] ?? 0) + 1;
    });
    return m;
  }, [ings]);

  const flash = (msg: string) => {
    setNote(msg);
    setTimeout(() => setNote(null), 2500);
  };

  const patch = async (i: Ingredient, p: Partial<Pick<Ingredient, "category" | "stock" | "cost" | "unit">>) => {
    setIngs((list) => list.map((x) => (x.id === i.id ? { ...x, ...p } : x)));
    const res = await updateIngredient(i.id, p);
    if (!res.ok) {
      flash(`Couldn’t save: ${res.error}`);
      load();
    }
  };

  const remove = async (i: Ingredient) => {
    if (!window.confirm(`Remove ${i.name}? Menu items using it will keep the link, so update them too.`)) return;
    const res = await deleteIngredient(i.id);
    if (!res.ok) return flash(`Couldn’t remove: ${res.error}`);
    load();
  };

  const saveCategories = async (list: string[]) => {
    setSavedCats(list);
    const res = await setSetting("categories", list);
    if (!res.ok) flash(`Couldn’t save categories: ${res.error}`);
  };

  const addCategory = async () => {
    const n = catName.trim();
    if (!n) return;
    await saveCategories([...new Set([...savedCats, n])]);
    setCatName("");
    setShowNewCat(false);
  };

  const removeCategory = async () => {
    if (!catToRemove) return;
    await saveCategories(savedCats.filter((c) => c !== catToRemove));
    await Promise.all(ings.filter((i) => i.category === catToRemove).map((i) => updateIngredient(i.id, { category: "" })));
    setCatToRemove("");
    setShowRemoveCat(false);
    load();
  };

  const copyTable = async () => {
    const head = ["Ingredient", "Category", "Status", "Stock", "Unit", "Cost"].join("\t");
    const body = ings.map((i) => [i.name, i.category, statusOf(i), i.stock, i.unit, i.cost].join("\t"));
    try {
      await navigator.clipboard.writeText([head, ...body].join("\n"));
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      flash("Couldn’t copy. Your browser blocked it.");
    }
  };

  return (
    <section>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Inventory</h1>
          <p className="mb-4 text-xs opacity-70">Stock deducts automatically when orders are completed</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={copyTable} className="emp-bd rounded-full border-2 px-3 py-1 text-sm">
            {copied ? "Copied!" : "Copy Whole Table"}
          </button>
          <button type="button" onClick={() => setShowNewCat(true)} className="emp-bd rounded-full border-2 px-3 py-1 text-sm">
            + New Category
          </button>
          <button type="button" onClick={() => setShowRemoveCat(true)} className="emp-bd rounded-full border-2 px-3 py-1 text-sm">
            − Remove Category
          </button>
          <button type="button" onClick={() => setShowNew(true)} className="emp-bd emp-solid rounded-full border-2 px-3 py-1 text-sm font-bold">
            + New Ingredient
          </button>
        </div>
      </div>

      {categories.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          {["all", ...categories].map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setFilter(c)}
              className={`emp-bd rounded-full border-2 px-4 py-1 text-sm ${filter === c ? "emp-solid font-bold" : ""}`}
            >
              {c === "all" ? "All" : c} · {counts[c] ?? 0}
            </button>
          ))}
        </div>
      )}

      {note && <p className="mb-3 text-sm">{note}</p>}
      {error && <p className="mb-3 text-sm emp-danger">Couldn’t load ingredients: {error}</p>}
      {loading && <p className="text-sm opacity-70">Loading…</p>}

      {/* Formatted Table Container */}
      <div className="emp-bd overflow-x-auto rounded-3xl border-2 p-4">
        <table className="w-full min-w-[900px] border-collapse text-left text-sm">
          <thead>
            <tr className="emp-row text-xs font-semibold uppercase tracking-wider opacity-70">
              <th scope="col" className="pb-3 px-2 font-semibold">Ingredient</th>
              <th scope="col" className="pb-3 px-2 font-semibold">Category</th>
              <th scope="col" className="pb-3 px-2 font-semibold">Status</th>
              <th scope="col" className="pb-3 px-2 font-semibold">Stock</th>
              <th scope="col" className="pb-3 px-2 font-semibold">Unit</th>
              <th scope="col" className="pb-3 px-2 font-semibold">Cost / Unit (₱)</th>
              <th scope="col" className="pb-3 px-2 font-semibold">Update Stock</th>
              <th scope="col" className="pb-3 px-2 font-semibold"><span className="sr-only">Actions</span></th>
            </tr>
          </thead>

          <tbody>
            {!loading && ings.length === 0 && !error && (
              <tr>
                <td colSpan={8} className="py-8 text-center text-sm opacity-70">
                  No ingredients yet. Press “+ New Ingredient”.
                </td>
              </tr>
            )}

            {ings
              .filter((i) => filter === "all" || i.category === filter)
              .map((i) => {
                const status = statusOf(i);
                const ok = status === "In stock";
                return (
                  <tr key={String(i.id)} className="emp-row text-sm transition hover:bg-black/5">
                    {/* Ingredient */}
                    <td className="py-3 px-2 font-bold whitespace-nowrap">
                      {i.name}
                    </td>

                    {/* Category without any down arrow */}
                    <td className="py-3 px-2 whitespace-nowrap">
                      <select
                        className={`w-fit max-w-full cursor-pointer rounded-full px-3.5 py-1 text-sm outline-none appearance-none [&>option]:text-black ${toneOf(
                          i.category
                        )}`}
                        value={i.category}
                        onChange={(e) => patch(i, { category: e.target.value })}
                        aria-label={`Category for ${i.name}`}
                      >
                        <option value="">—</option>
                        {categories.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </td>

                    {/* Status */}
                    <td className="py-3 px-2 whitespace-nowrap">
                      <span
                        className={`inline-block rounded-full px-3 py-1 text-xs ${
                          ok ? "bg-emerald-500/15 text-emerald-400" : "emp-danger bg-red-500/15"
                        }`}
                      >
                        {status}
                      </span>
                    </td>

                    {/* Stock */}
                    <td className="py-3 px-2 font-medium">
                      {i.stock}
                    </td>

                    {/* Unit */}
                    <td className="py-3 px-2 opacity-80">
                      {i.unit}
                    </td>

                    {/* Cost / Unit */}
                    <td className="py-3 px-2">
                      <input
                        key={`cost-${i.id}-${i.cost}`}
                        className="emp-input w-24 !py-1 text-sm"
                        inputMode="decimal"
                        defaultValue={i.cost}
                        aria-label={`Cost per unit for ${i.name}`}
                        onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
                        onBlur={(e) => {
                          const v = Number(e.currentTarget.value);
                          if (e.currentTarget.value.trim() !== "" && !isNaN(v) && v >= 0 && v !== i.cost) patch(i, { cost: v });
                        }}
                      />
                    </td>

                    {/* Update Stock */}
                    <td className="py-3 px-2">
                      <input
                        key={`stock-${i.id}-${i.stock}`}
                        className="emp-input w-24 !py-1 text-sm"
                        inputMode="decimal"
                        defaultValue={i.stock}
                        aria-label={`Stock for ${i.name}`}
                        onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
                        onBlur={(e) => {
                          const v = Number(e.currentTarget.value);
                          if (e.currentTarget.value.trim() !== "" && !isNaN(v) && v >= 0 && v !== i.stock) patch(i, { stock: v });
                        }}
                      />
                    </td>

                    {/* Action */}
                    <td className="py-3 px-2 text-left whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => remove(i)}
                        className="text-left text-sm emp-danger hover:underline cursor-pointer"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>

      <p className="mt-2 text-xs opacity-70">Edit the number under “Update stock” and press Enter (or click away) to save.</p>

      {showNew && (
        <IngredientModal
          categories={categories}
          onClose={() => setShowNew(false)}
          onSaved={async (cat) => {
            setShowNew(false);
            if (cat && !categories.includes(cat)) await saveCategories([...new Set([...savedCats, cat])]);
            load();
          }}
        />
      )}

      {showNewCat && (
        <Modal title="New Category" onClose={() => setShowNewCat(false)}>
          <input
            autoFocus
            className="emp-input"
            placeholder="Category name"
            value={catName}
            onChange={(e) => setCatName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addCategory()}
          />
          <div className="mt-5 flex items-center justify-between">
            <button type="button" onClick={() => setShowNewCat(false)} className="emp-bd rounded-full border-2 px-5 py-2">
              Cancel
            </button>
            <button type="button" onClick={addCategory} className="emp-bd emp-solid rounded-full border-2 px-5 py-2 font-bold">
              Add
            </button>
          </div>
        </Modal>
      )}

      {showRemoveCat && (
        <Modal title="Remove Category" onClose={() => setShowRemoveCat(false)}>
          <p className="mb-3 text-sm opacity-70">Ingredients in that category will be left without a category.</p>
          <select className="emp-input" value={catToRemove} onChange={(e) => setCatToRemove(e.target.value)}>
            <option value="">Choose a category</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <div className="mt-5 flex items-center justify-between">
            <button type="button" onClick={() => setShowRemoveCat(false)} className="emp-bd rounded-full border-2 px-5 py-2">
              Cancel
            </button>
            <button
              type="button"
              onClick={removeCategory}
              disabled={!catToRemove}
              className="emp-bd emp-solid rounded-full border-2 px-5 py-2 font-bold disabled:opacity-40"
            >
              Remove
            </button>
          </div>
        </Modal>
      )}
    </section>
  );
}