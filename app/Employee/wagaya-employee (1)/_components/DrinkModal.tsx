"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { DEFAULT_SUGAR, SUGAR_LEVELS, hasSugar, peso, type CartItem, type MenuRow } from "../_lib/menu";

type Props = {
  drink: MenuRow;
  options: string[];
  onClose: () => void;
  onAdd: (item: CartItem) => void;
};

export default function DrinkModal({ drink, options, onClose, onAdd }: Props) {
  const showSugar = hasSugar(drink.sugar); // only drinks with sugar "on"
  const [sugar, setSugar] = useState<string>(DEFAULT_SUGAR);
  const [qty, setQty] = useState(1);
  const [pickedOptions, setPickedOptions] = useState<string[]>([]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const unitPrice = Number(drink.price) || 0;

  const handleAdd = () => {
    const sugarChoice = showSugar ? sugar : null;
    const notes = pickedOptions.join(", ") || null;
    onAdd({
      key: `${drink.id}|${sugarChoice ?? "none"}|${notes ?? ""}`,
      id: drink.id,
      name: drink.name,
      unitPrice,
      qty,
      sugar: sugarChoice,
      notes,
    });
    onClose();
  };

  const pill = (on: boolean) =>
    `emp-bd rounded-full border-2 px-3 py-1.5 text-sm ${on ? "emp-solid font-bold" : ""}`;

  return (
    <div className="emp-overlay fixed inset-0 z-50 grid place-items-center p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={drink.name}
        onClick={(e) => e.stopPropagation()}
        className="emp emp-bd modal-scroll max-h-[90vh] w-full max-w-md overflow-y-auto rounded-[2rem] border-2 p-6"
        style={{ backgroundColor: drink.color || "#F7F4EC" }}
      >
        <div className="emp-bd mx-auto mb-4 grid h-20 w-20 place-items-center overflow-hidden rounded-3xl border-2">
          {drink.photo ? (
            <Image src={drink.photo} alt={drink.name} width={80} height={80} unoptimized className="h-full w-full object-contain" />
          ) : (
            <span className="text-xs opacity-60">No photo</span>
          )}
        </div>

        <h2 className="text-2xl font-bold">{drink.name}</h2>
        {drink.description && <p className="mt-1 text-sm opacity-75">{drink.description}</p>}
        <p className="text-sm opacity-70">Base price {peso(drink.price)}</p>

        {showSugar && (
          <>
            <p className="mt-4 text-xs font-semibold">Sugar level</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {SUGAR_LEVELS.map((l) => (
                <button key={l} type="button" onClick={() => setSugar(l)} aria-pressed={sugar === l} className={pill(sugar === l)}>
                  {l}
                </button>
              ))}
            </div>
          </>
        )}

        {options.length > 0 && (
          <>
            <p className="mt-4 text-xs font-semibold">Special requests</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {options.map((option) => (
                <button key={option} type="button" onClick={() => setPickedOptions((current) => current.includes(option) ? current.filter((x) => x !== option) : [...current, option])} aria-pressed={pickedOptions.includes(option)} className={pill(pickedOptions.includes(option))}>
                  {option}
                </button>
              ))}
            </div>
          </>
        )}

        <div className="mt-5 flex items-center justify-between">
          <div>
            <p className="font-semibold">Quantity</p>
            <p className="text-xs opacity-70">How many of this drink?</p>
          </div>
          <div className="emp-bd flex items-center rounded-full border-2">
            <button type="button" aria-label="Decrease quantity" onClick={() => setQty((q) => Math.max(1, q - 1))} className="px-4 py-1.5 text-lg">
              −
            </button>
            <span className="w-8 text-center font-bold">{qty}</span>
            <button type="button" aria-label="Increase quantity" onClick={() => setQty((q) => q + 1)} className="px-4 py-1.5 text-lg">
              +
            </button>
          </div>
        </div>

        <div className="mt-5 flex items-center justify-between">
          <button type="button" onClick={onClose} className="emp-bd rounded-full border-2 px-5 py-2">
            Cancel
          </button>
          <button type="button" onClick={handleAdd} className="emp-bd emp-solid rounded-full border-2 px-5 py-2 font-bold">
            Add · {peso(unitPrice * qty)}
          </button>
        </div>
      </div>
    </div>
  );
}
