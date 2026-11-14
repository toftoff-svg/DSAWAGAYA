"use client";

import { useState } from "react";
import Modal from "./Modal";
import { saveIngredient } from "../_lib/actions";
import { UNITS } from "../_lib/menu";

type Props = {
  categories: string[];
  onClose: () => void;
  onSaved: (category: string) => void;
};

export default function IngredientModal({ categories, onClose, onSaved }: Props) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [amount, setAmount] = useState("");
  const [unitSel, setUnitSel] = useState("g");
  const [customUnit, setCustomUnit] = useState("");
  const [low, setLow] = useState("");
  const [cost, setCost] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const add = async () => {
    if (!name.trim()) return setError("Give the ingredient a name.");
    const nums = [amount, low, cost].map((v) => (v.trim() === "" ? 0 : Number(v)));
    if (nums.some((n) => isNaN(n) || n < 0)) return setError("Amount, alert level and cost must be numbers.");
    const unit = unitSel === "__other" ? customUnit.trim() : unitSel;
    if (!unit) return setError("Type the unit of measurement.");

    setSaving(true);
    setError(null);
    const res = await saveIngredient({
      name,
      category,
      stock: nums[0],
      unit,
      low: nums[1],
      cost: nums[2],
    });
    setSaving(false);
    if (!res.ok) return setError(res.error);
    onSaved(category.trim());
  };

  return (
    <Modal title="New Ingredient" onClose={onClose}>
      <div className="space-y-2">
        <input className="emp-input" placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
        <input
          className="emp-input"
          placeholder="Category"
          list="ingredient-categories"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        />
        <datalist id="ingredient-categories">
          {categories.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
        <div className="flex gap-2">
          <input className="emp-input flex-1" placeholder="Amount in stock" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
          <select className="emp-input flex-1" value={unitSel} onChange={(e) => setUnitSel(e.target.value)} aria-label="Unit of measurement">
            {UNITS.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
            <option value="__other">Other…</option>
          </select>
        </div>
        {unitSel === "__other" && (
          <input className="emp-input" placeholder="Type the unit (e.g. banana, bottle)" value={customUnit} onChange={(e) => setCustomUnit(e.target.value)} />
        )}
        <input className="emp-input" placeholder="Low-stock alert at" inputMode="decimal" value={low} onChange={(e) => setLow(e.target.value)} />
        <input className="emp-input" placeholder="Cost per unit" inputMode="decimal" value={cost} onChange={(e) => setCost(e.target.value)} />
      </div>

      {error && <p className="mt-3 text-sm emp-danger">{error}</p>}

      <div className="mt-5 flex items-center justify-between">
        <button type="button" onClick={onClose} disabled={saving} className="emp-bd rounded-full border-2 px-5 py-2 disabled:opacity-50">
          Cancel
        </button>
        <button type="button" onClick={add} disabled={saving} className="emp-bd emp-solid rounded-full border-2 px-5 py-2 font-bold disabled:opacity-50">
          {saving ? "Adding…" : "Add"}
        </button>
      </div>
    </Modal>
  );
}
