"use client";

import { useEffect, useState } from "react";
import { DEFAULT_SUGAR, SUGAR_LEVELS, hasSugar, peso, type CartItem, type MenuRow } from "../_lib/menu";

type Props = {
  drink: MenuRow;
  options: string[];
  starred?: boolean;
  onClose: () => void;
  onAdd: (item: CartItem) => void;
};

export default function DrinkModal({ drink, options, starred, onClose, onAdd }: Props) {
  const showSugar = hasSugar(drink.sugar);
  const [sugar, setSugar] = useState(DEFAULT_SUGAR);
  const [picked, setPicked] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const [qty, setQty] = useState(1);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const toggleOption = (option: string) => {
    setPicked((current) => (current.includes(option) ? current.filter((value) => value !== option) : [...current, option]));
  };

  const addToOrder = () => {
    const sugarChoice = showSugar ? sugar : null;
    const notes = [...picked, note.trim()].filter(Boolean).join(", ") || null;
    onAdd({
      key: `${drink.id}|${sugarChoice ?? "none"}|${notes ?? ""}`,
      id: drink.id,
      name: drink.name,
      unitPrice: Number(drink.price) || 0,
      qty,
      sugar: sugarChoice,
      notes,
    });
    onClose();
  };

  const optionClass = (selected: boolean) =>
    `emp-bd rounded-full border-2 px-3 py-1.5 text-sm ${selected ? "emp-solid font-bold" : ""}`;

  return (
    <div className="emp-overlay fixed inset-0 z-50 grid place-items-center p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={drink.name}
        onClick={(event) => event.stopPropagation()}
        className="emp emp-bd max-h-[90vh] w-full max-w-md overflow-y-auto rounded-[2rem] border-2 p-6"
      >
        <div className="emp-bd mx-auto mb-4 grid h-20 w-20 place-items-center overflow-hidden rounded-3xl border-2">
          {drink.photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={drink.photo} alt={drink.name} className="h-full w-full object-contain" />
          ) : (
            <span className="text-xs opacity-60">No photo</span>
          )}
        </div>

        <h2 className="text-2xl font-bold">
          {drink.name}
          {starred && <span className="emp-accent ml-2" title="Best seller" aria-label="Best seller">★</span>}
        </h2>
        <p className="text-sm opacity-70">Base price {peso(drink.price)}</p>

        {showSugar && (
          <>
            <p className="mt-4 text-xs font-semibold">Sugar level</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {SUGAR_LEVELS.map((level) => (
                <button key={level} type="button" onClick={() => setSugar(level)} aria-pressed={sugar === level} className={optionClass(sugar === level)}>
                  {level}
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
                <button key={option} type="button" onClick={() => toggleOption(option)} aria-pressed={picked.includes(option)} className={optionClass(picked.includes(option))}>
                  {option}
                </button>
              ))}
            </div>
          </>
        )}

        <p className="mt-4 text-xs font-semibold">Note</p>
        <input className="emp-input mt-2" placeholder="Anything else? e.g. no straw" maxLength={120} value={note} onChange={(event) => setNote(event.target.value)} />

        <div className="mt-5 flex items-center justify-between">
          <div>
            <p className="font-semibold">Quantity</p>
            <p className="text-xs opacity-70">How many of this drink?</p>
          </div>
          <div className="emp-bd flex items-center rounded-full border-2">
            <button type="button" aria-label="Decrease quantity" onClick={() => setQty((current) => Math.max(1, current - 1))} className="px-4 py-1.5 text-lg">−</button>
            <span className="w-8 text-center font-bold">{qty}</span>
            <button type="button" aria-label="Increase quantity" onClick={() => setQty((current) => current + 1)} className="px-4 py-1.5 text-lg">+</button>
          </div>
        </div>

        <div className="mt-5 flex items-center justify-between">
          <button type="button" onClick={onClose} className="emp-bd rounded-full border-2 px-5 py-2">Cancel</button>
          <button type="button" onClick={addToOrder} className="emp-bd emp-solid rounded-full border-2 px-5 py-2 font-bold">
            Add · {peso((Number(drink.price) || 0) * qty)}
          </button>
        </div>
      </div>
    </div>
  );
}
