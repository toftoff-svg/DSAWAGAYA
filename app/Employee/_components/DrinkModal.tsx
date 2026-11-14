"use client";

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
  const [note, setNote] = useState("");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const unitPrice = Number(drink.price) || 0;

  const handleAdd = () => {
    const sugarChoice = showSugar ? sugar : null;
    const notes = [...pickedOptions, note.trim()].filter(Boolean).join(", ") || null;
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

  const toggleOption = (option: string) => {
    const iceOptions = ["Less ice", "No ice", "Extra ice"];
    const sugarOptions = ["Less sugar", "More sugar"];

    setPickedOptions((current) => {
      const group = iceOptions.includes(option)
        ? iceOptions
        : sugarOptions.includes(option)
          ? sugarOptions
          : null;

      if (group) {
        return current.includes(option)
          ? current.filter((item) => !group.includes(item))
          : [...current.filter((item) => !group.includes(item)), option];
      }

      return current.includes(option)
        ? current.filter((item) => item !== option)
        : [...current, option];
    });
  };

  const pill = (on: boolean) =>
    `rounded-full border-2 px-3 py-1 text-sm font-bold transition-colors ${
      on
        ? "border-[#164734] bg-[#164734] text-[#FCFAF4]"
        : "border-[#B7C2A5] bg-[#FCFAF4] text-[#263B32] hover:border-[#164734]"
    }`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={drink.name}
        onClick={(e) => e.stopPropagation()}
        className="max-h-[90vh] w-full max-w-sm overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 text-slate-800 shadow-xl"
      >
        <div className="mx-auto mb-4 grid h-28 w-28 place-items-center overflow-hidden rounded-2xl border-[3px] border-black">
          {drink.photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={drink.photo} alt={drink.name} className="h-full w-full object-contain" />
          ) : (
            <span className="text-xs font-bold text-neutral-400">NO IMAGE</span>
          )}
        </div>

        <h2 className="text-xl font-black">{drink.name}</h2>
        <p className="mb-4 text-xs text-neutral-500">Base price {peso(drink.price)}</p>

        {showSugar && (
          <>
            <p className="mb-2 text-xs font-bold uppercase">Sugar level</p>
            <div className="mb-5 flex flex-wrap gap-2">
              {SUGAR_LEVELS.map((level) => (
                <button key={level} type="button" onClick={() => setSugar(level)} aria-pressed={sugar === level} className={pill(sugar === level)}>
                  {level}
                </button>
              ))}
            </div>
          </>
        )}

        {options.length > 0 && (
          <>
            <p className="mb-2 text-xs font-bold uppercase">Special requests</p>
            <div className="mb-4 flex flex-wrap gap-2">
              {options.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => toggleOption(option)}
                  aria-pressed={pickedOptions.includes(option)}
                  className={pill(pickedOptions.includes(option))}
                >
                  {option}
                </button>
              ))}
            </div>
          </>
        )}

        <p className="mb-2 text-xs font-bold uppercase">Note</p>
        <input
          value={note}
          onChange={(event) => setNote(event.target.value)}
          maxLength={120}
          placeholder="Anything else? e.g. no straw"
          className="mb-5 w-full rounded-full border-2 border-[#B7C2A5] bg-white px-4 py-2 text-sm text-black focus:border-[#164734] focus:outline-none"
        />

        <div className="mb-5 flex items-center justify-between">
          <div>
            <p className="font-bold">Quantity</p>
            <p className="text-xs text-neutral-500">How many of this drink?</p>
          </div>
          <div className="flex items-center gap-3 rounded-full border-2 border-[#B7C2A5] px-3 py-1">
            <button type="button" aria-label="Decrease quantity" onClick={() => setQty((q) => Math.max(1, q - 1))} className="text-lg font-bold leading-none">
              −
            </button>
            <span className="w-4 text-center font-mono">{qty}</span>
            <button type="button" aria-label="Increase quantity" onClick={() => setQty((q) => q + 1)} className="text-lg font-bold leading-none">
              +
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <button type="button" onClick={onClose} className="rounded-full border-2 border-[#B7C2A5] px-5 py-2 text-[#164734] transition-colors hover:bg-[#F0F4EA]">
            Cancel
          </button>
          <button type="button" onClick={handleAdd} className="rounded-full border-2 border-[#164734] bg-[#164734] px-5 py-2 font-bold text-white transition-colors hover:bg-[#1F5C43]">
            Add - {peso(unitPrice * qty)}
          </button>
        </div>
      </div>
    </div>
  );
}
