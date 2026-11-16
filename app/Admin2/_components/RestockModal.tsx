"use client";

import { useState } from "react";
import Modal from "./Modal";
import { restockIngredient } from "../_lib/actions";
import type { Ingredient } from "../_lib/menu";

type Props = {
  ingredients: Ingredient[];
  onClose: () => void;
  onSaved: (message: string) => void;
  onPartial: (message: string) => void;
};

type RestockRow = {
  id: number;
  ingredientId: string;
  amount: string;
};

const localDateTime = () => {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return now.toISOString().slice(0, 16);
};

export default function RestockModal({ ingredients, onClose, onSaved, onPartial }: Props) {
  const [rows, setRows] = useState<RestockRow[]>([
    { id: 1, ingredientId: String(ingredients[0]?.id ?? ""), amount: "" },
  ]);
  const [addedAt, setAddedAt] = useState(localDateTime);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateRow = (id: number, patch: Partial<RestockRow>) => {
    setRows((current) => current.map((row) => row.id === id ? { ...row, ...patch } : row));
  };

  const addRow = () => {
    setRows((current) => [
      ...current,
      { id: Math.max(...current.map((row) => row.id)) + 1, ingredientId: "", amount: "" },
    ]);
  };

  const save = async () => {
    const invalidRow = rows.find((row) => !row.ingredientId || !Number.isFinite(Number(row.amount)) || Number(row.amount) <= 0);
    if (invalidRow) return setError("Choose an ingredient and enter an amount greater than zero for every row.");
    if (!addedAt) return setError("Choose a restock date.");
    setSaving(true);
    setError(null);

    let updated = 0;
    for (let index = 0; index < rows.length; index += 1) {
      const row = rows[index];
      const result = await restockIngredient(row.ingredientId, Number(row.amount), addedAt);
      if (!result.ok) {
        const ingredientName = ingredients.find((ingredient) => String(ingredient.id) === row.ingredientId)?.name ?? "the selected ingredient";
        const message = updated > 0
          ? `Restocked ${updated} item${updated === 1 ? "" : "s"}. Could not restock ${ingredientName}: ${result.error}`
          : `Could not restock ${ingredientName}: ${result.error}`;
        if (updated > 0) {
          setRows(rows.slice(index));
          onPartial(message);
        } else {
          setError(message);
        }
        setSaving(false);
        return;
      }
      updated += 1;
    }

    setSaving(false);
    onSaved(`Restocked ${updated} ingredient${updated === 1 ? "" : "s"}.`);
  };

  return (
    <Modal title="Restock Ingredients" onClose={onClose} wide>
      <div className="space-y-3">
        {rows.map((row, index) => (
          <div key={row.id} className="flex items-end gap-2">
            <label className="min-w-0 flex-1 text-sm font-bold">
              Ingredient {index + 1}
              <select
                className="emp-input mt-1.5"
                value={row.ingredientId}
                onChange={(event) => updateRow(row.id, { ingredientId: event.target.value })}
              >
                <option value="">Choose ingredient</option>
                {ingredients.map((ingredient) => {
                  const ingredientValue = String(ingredient.id);
                  const usedByAnotherRow = rows.some((other) => other.id !== row.id && other.ingredientId === ingredientValue);
                  return (
                    <option key={ingredientValue} value={ingredientValue} disabled={usedByAnotherRow}>
                      {ingredient.name} ({ingredient.unit})
                    </option>
                  );
                })}
              </select>
            </label>
            <label className="w-28 shrink-0 text-sm font-bold">
              Amount
              <input
                className="emp-input mt-1.5"
                inputMode="decimal"
                value={row.amount}
                onChange={(event) => updateRow(row.id, { amount: event.target.value })}
                placeholder="e.g. 10"
              />
            </label>
            {rows.length > 1 && (
              <button
                type="button"
                onClick={() => setRows((current) => current.filter((item) => item.id !== row.id))}
                aria-label={`Remove ingredient ${index + 1}`}
                className="emp-danger mb-2 px-1 text-sm"
              >
                Remove
              </button>
            )}
          </div>
        ))}
        <button type="button" onClick={addRow} disabled={saving} className="emp-bd rounded-full border-2 px-3 py-1 text-sm">
          + Add another ingredient
        </button>
        <label className="block text-sm font-bold">
          Date restocked
          <input className="emp-input mt-1.5" type="datetime-local" value={addedAt} onChange={(event) => setAddedAt(event.target.value)} required />
        </label>
      </div>
      {error && <p className="mt-3 text-sm emp-danger">{error}</p>}
      <div className="mt-5 flex items-center justify-between">
        <button type="button" onClick={onClose} disabled={saving} className="emp-bd rounded-full border-2 px-5 py-2 disabled:opacity-50">Cancel</button>
        <button type="button" onClick={save} disabled={saving || ingredients.length === 0} className="emp-bd emp-solid rounded-full border-2 px-5 py-2 font-bold disabled:opacity-50">
          {saving ? "Updating…" : `Add stock (${rows.length})`}
        </button>
      </div>
    </Modal>
  );
}
