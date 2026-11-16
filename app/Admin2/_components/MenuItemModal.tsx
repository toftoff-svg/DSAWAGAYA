"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import BestSellerStar from "../../_components/BestSellerStar";
import IngredientModal from "./IngredientModal";
import Modal from "./Modal";
import { deleteMenuItem, getIngredients, saveMenuItem, setStar } from "../_lib/actions";
import { fileToDataUrl } from "../_lib/image";
import { hasSugar, peso, type Ingredient, type MenuRow } from "../_lib/menu";

type Props = {
  item: MenuRow | null; // null = new item
  defaultCategory?: "drinks" | "pastries";
  ingredients: Ingredient[];
  starred: boolean;
  onClose: () => void;
  onSaved: () => void;
};

type RecipeRow = { ing: string; amt: string };
type AddonRow = { name: string; price: string; ing: string; amt: string };

export default function MenuItemModal({ item, defaultCategory = "drinks", ingredients: initialIngredients, starred, onClose, onSaved }: Props) {
  const [star, setStarOn] = useState(starred);
  const [ingredients, setIngredients] = useState<Ingredient[]>(initialIngredients);
  const [showNewIng, setShowNewIng] = useState(false);
  useEffect(() => setIngredients(initialIngredients), [initialIngredients]);
  const categories = useMemo(() => [...new Set(ingredients.map((i) => i.category).filter(Boolean))], [ingredients]);
  const ingredientsById = useMemo(() => new Map(ingredients.map((ingredient) => [String(ingredient.id), ingredient])), [ingredients]);
  const unitOf = (id: string) => ingredientsById.get(id)?.unit ?? "";
  const costOf = useCallback((row: RecipeRow) => {
    const ingredient = ingredientsById.get(row.ing);
    const amount = Number(row.amt);
    return ingredient && ingredient.cost > 0 && Number.isFinite(amount) && amount > 0
      ? ingredient.cost * amount
      : null;
  }, [ingredientsById]);

  const [name, setName] = useState(item?.name ?? "");
  const [description, setDescription] = useState(item?.description ?? "");
  const [color, setColor] = useState(item?.color ?? "#0F47AF");
  const [price, setPrice] = useState(item ? String(item.price) : "");
  const [category, setCategory] = useState<"drinks" | "pastries">(item?.category ?? defaultCategory);
  const [photo, setPhoto] = useState<string | null>(item?.photo ?? null);
  const [recipe, setRecipe] = useState<RecipeRow[]>(
    (item?.recipe ?? []).map((r) => ({ ing: String(r.ing), amt: String(r.amt) }))
  );
  const recipeCost = useMemo(() => recipe.reduce((total, row) => total + (costOf(row) ?? 0), 0), [recipe, costOf]);
  const hasMissingCost = useMemo(
    () => recipe.some((row) => row.ing && Number(row.amt) > 0 && costOf(row) == null),
    [recipe, costOf]
  );
  const [addons, setAddons] = useState<AddonRow[]>(
    (item?.addons ?? []).map((a) => ({
      name: a.name,
      price: String(a.price ?? 0),
      ing: a.ing != null ? String(a.ing) : "",
      amt: String(a.amt ?? 0),
    }))
  );
  const [sugarOn, setSugarOn] = useState(hasSugar(item?.sugar));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [showIngredientPicker, setShowIngredientPicker] = useState(false);
  const [ingredientQuery, setIngredientQuery] = useState("");

  const idFor = (s: string) => ingredients.find((i) => String(i.id) === s)?.id ?? s;

  const pickFile = async (file?: File) => {
    if (!file) return;
    try {
      setPhoto(await fileToDataUrl(file, 600, "image/png"));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn’t use that picture.");
    }
  };

  const save = async () => {
    const p = Number(price);
    if (!name.trim()) return setError("Give the item a name.");
    if (price.trim() === "" || isNaN(p) || p < 0) return setError("Enter a valid price.");

    setSaving(true);
    setError(null);
    const res = await saveMenuItem({
      id: item?.id,
      name,
      description,
      color,
      price: p,
      category,
      photo,
      recipe: recipe
        .filter((r) => r.ing && Number(r.amt) > 0)
        .map((r) => ({ ing: idFor(r.ing), amt: Number(r.amt) })),
      addons: addons
        .filter((a) => a.name.trim())
        .map((a) => ({
          name: a.name.trim(),
          price: Number(a.price) || 0,
          ing: a.ing ? idFor(a.ing) : null,
          amt: Number(a.amt) || 0,
        })),
      sugarOn,
    });
    if (!res.ok) {
      setSaving(false);
      return setError(res.error);
    }
    if (star !== starred) {
      const starResult = await setStar(res.data.id, star);
      if (!starResult.ok) {
        setSaving(false);
        return setError(`Menu item saved, but the star setting could not be saved: ${starResult.error}`);
      }
    }
    setSaving(false);
    onSaved();
  };

  const remove = async () => {
    if (!item) return;
    setSaving(true);
    const res = await deleteMenuItem(item.id);
    setSaving(false);
    if (!res.ok) return setError(res.error);
    onSaved();
  };

  const ingLabel = (i: Ingredient) => `${i.name} — ${i.stock}${i.unit ? ` ${i.unit}` : ""} in stock`;
  const availableIngredients = useMemo(
    () => ingredients.filter((ingredient) =>
      `${ingredient.name} ${ingredient.category}`.toLowerCase().includes(ingredientQuery.trim().toLowerCase())
    ),
    [ingredients, ingredientQuery]
  );
  const selectIngredient = (id: string) => {
    if (!id) return;
    setRecipe((current) => [...current, { ing: id, amt: "" }]);
    setIngredientQuery("");
    setShowIngredientPicker(false);
  };

  return (
    <>
    <Modal title={item ? "Edit Menu Item" : "New Menu Item"} onClose={onClose} wide closeOnEsc={!showNewIng}>
      <div className="space-y-3">
        <label className="block text-sm font-bold">
          Item name <span className="text-red-500">*</span>
          <input
            autoFocus={!item}
            className="emp-input mt-1.5 text-base"
            placeholder="Type the menu item name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <label className="block text-sm font-bold">
          Price
          <input
            className="emp-input mt-1.5 text-base"
            placeholder="Enter price"
            inputMode="decimal"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
          />
        </label>
        <label className="block text-sm font-bold">
          Description
          <textarea
            className="emp-input mt-1.5 min-h-20 resize-y text-base"
            placeholder="Describe this menu item"
            maxLength={240}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </label>
        <label className="block text-sm font-bold">
          Menu section
          <select
            className="emp-input mt-1.5 text-base"
            value={category}
            onChange={(e) => setCategory(e.target.value === "pastries" ? "pastries" : "drinks")}
          >
            <option value="drinks">Drinks</option>
            <option value="pastries">Pastries</option>
          </select>
        </label>
        <label className="block text-sm font-bold">
          Item outline color
          <span className="mt-1.5 flex items-center gap-3">
            <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="h-10 w-14 cursor-pointer rounded-lg border-0 bg-transparent p-0" />
            <span className="font-mono text-xs opacity-70">{color}</span>
          </span>
        </label>
      </div>

      <div className="mt-4">
        <p className="text-sm font-bold">Menu image</p>
        <div className="mt-1.5 flex flex-wrap items-center gap-3">
          {photo && (
            <Image src={photo} alt="Menu item preview" width={56} height={56} unoptimized className="h-14 w-14 rounded-lg border object-contain" />
          )}
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="emp-bd emp-hover rounded-full border-2 px-4 py-2 text-sm font-semibold"
            aria-label={photo ? "Change menu item image" : "Upload menu item image"}
          >
            {photo ? "Change image" : "Upload image"}
          </button>
          <span className="text-xs opacity-70">
            {photo ? "Image selected" : "Choose a photo for this menu item."}
          </span>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="emp-file-input"
            onChange={(e) => {
              void pickFile(e.target.files?.[0]);
              e.currentTarget.value = "";
            }}
          />
        </div>
        {photo && (
          <button type="button" onClick={() => setPhoto(null)} className="mt-1 text-xs underline">
            Remove image
          </button>
        )}
      </div>

      {/* Ingredients used */}
      <p className="mt-4 text-sm font-semibold">Ingredients used</p>
      {ingredients.length === 0 && (
        <p className="text-xs opacity-70">No ingredients yet. Add some in Inventory first.</p>
      )}
      {recipe.map((r, i) => {
        const cost = costOf(r);
        return (
          <div key={i} className="mt-2">
            <div className="flex gap-2">
              <select
                className="emp-input flex-1"
                value={r.ing}
                onChange={(e) => setRecipe((p) => p.map((x, j) => (j === i ? { ...x, ing: e.target.value } : x)))}
              >
                <option value="">Choose ingredient</option>
                {ingredients.map((ing) => (
                  <option key={String(ing.id)} value={String(ing.id)}>
                    {ingLabel(ing)}
                  </option>
                ))}
              </select>
              <div className="flex w-32 items-center gap-1">
                <input
                  className="emp-input"
                  placeholder="Amount"
                  inputMode="decimal"
                  value={r.amt}
                  onChange={(e) => setRecipe((p) => p.map((x, j) => (j === i ? { ...x, amt: e.target.value } : x)))}
                />
                <span className="w-10 text-xs opacity-70">{unitOf(r.ing)}</span>
              </div>
              <button type="button" aria-label="Remove ingredient" onClick={() => setRecipe((p) => p.filter((_, j) => j !== i))} className="px-2 text-lg">
                ×
              </button>
            </div>
            <p className="mt-1 text-right text-xs opacity-70">
              {cost == null ? "Unit cost not set in Inventory" : `Estimated cost: ${peso(cost)} per item`}
            </p>
          </div>
        );
      })}
      {recipe.length > 0 && (
        <div className="emp-bd mt-3 rounded-xl border p-3 text-sm">
          <span className="font-semibold">Estimated ingredient cost per item</span>
          <span className="float-right font-bold">{hasMissingCost ? `At least ${peso(recipeCost)}` : peso(recipeCost)}</span>
          {hasMissingCost && <p className="mt-1 text-xs opacity-70">Ingredients without a unit cost are excluded.</p>}
        </div>
      )}
      <p className="mt-1 text-xs opacity-70">Amount used for 1 drink. Stock comes off when an order is placed.</p>
      <div className="mt-2 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setShowIngredientPicker((open) => !open)}
          disabled={ingredients.length === 0}
          className="emp-bd rounded-full border-2 px-4 py-1.5 text-sm disabled:opacity-40"
        >
          {showIngredientPicker ? "Close picker" : "+ Ingredient"}
        </button>
        <button type="button" onClick={() => setShowNewIng(true)} className="emp-bd rounded-full border-2 px-4 py-1.5 text-sm">
          + New ingredient
        </button>
      </div>
      {showIngredientPicker && (
        <div className="emp-bd mt-3 rounded-2xl border-2 p-3">
          <p className="mb-2 text-xs font-semibold">Choose an ingredient</p>
          <input
            autoFocus
            className="emp-input"
            placeholder="Search ingredients..."
            value={ingredientQuery}
            onChange={(e) => setIngredientQuery(e.target.value)}
            aria-label="Search in-stock ingredients"
          />
          <select
            className="emp-input mt-2"
            size={Math.min(Math.max(availableIngredients.length, 2), 5)}
            value=""
            onChange={(e) => selectIngredient(e.target.value)}
            aria-label="Select an ingredient"
          >
            <option value="" disabled>
              Select an ingredient
            </option>
            {availableIngredients.map((ingredient) => (
              <option key={String(ingredient.id)} value={String(ingredient.id)}>
                {ingLabel(ingredient)}
              </option>
            ))}
          </select>
          {availableIngredients.length === 0 && <p className="mt-2 text-xs opacity-70">No ingredients match that search.</p>}
        </div>
      )}

      {/* Add-ons */}
      <p className="mt-4 text-sm font-semibold">Add-ons</p>
      {addons.map((a, i) => (
        <div key={i} className="mt-2 flex flex-wrap gap-2">
          <input
            className="emp-input min-w-32 flex-1"
            placeholder="Add-on name"
            value={a.name}
            onChange={(e) => setAddons((p) => p.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))}
          />
          <input
            className="emp-input w-24"
            placeholder="Extra ₱"
            inputMode="decimal"
            value={a.price}
            onChange={(e) => setAddons((p) => p.map((x, j) => (j === i ? { ...x, price: e.target.value } : x)))}
          />
          <select
            className="emp-input min-w-32 flex-1"
            value={a.ing}
            onChange={(e) => setAddons((p) => p.map((x, j) => (j === i ? { ...x, ing: e.target.value } : x)))}
          >
            <option value="">No ingredient</option>
            {ingredients.map((ing) => (
              <option key={String(ing.id)} value={String(ing.id)}>
                {ingLabel(ing)}
              </option>
            ))}
          </select>
          <input
            className="emp-input w-24"
            placeholder="Amount"
            inputMode="decimal"
            value={a.amt}
            onChange={(e) => setAddons((p) => p.map((x, j) => (j === i ? { ...x, amt: e.target.value } : x)))}
          />
          <button type="button" aria-label="Remove add-on" onClick={() => setAddons((p) => p.filter((_, j) => j !== i))} className="px-2 text-lg">
            ×
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => setAddons((p) => [...p, { name: "", price: "", ing: "", amt: "" }])}
        className="emp-bd mt-2 rounded-full border-2 px-4 py-1.5 text-sm"
      >
        + Add-on
      </button>

      {/* Sugar */}
      <p className="mt-4 text-sm font-semibold">Sugar level</p>
      <label className="mt-1 flex cursor-pointer items-center gap-3 text-sm">
        <input type="checkbox" className="h-6 w-6" checked={sugarOn} onChange={(e) => setSugarOn(e.target.checked)} />
        Let buyer choose sugar level (0 / 25 / 50 / 75 / 100)
      </label>

      {/* Manual star */}
      <p className="mt-4 text-sm font-semibold">Manual star</p>
      <label className="mt-1 flex cursor-pointer items-center gap-3 text-sm">
        <input type="checkbox" className="h-6 w-6" checked={star} onChange={(e) => setStarOn(e.target.checked)} />
        <span>
          Force a <BestSellerStar /> on this item even when it is not the best seller.
        </span>
      </label>

      {error && <p className="mt-4 text-sm emp-danger">{error}</p>}

      <div className="mt-6 flex items-center justify-between gap-2">
        <button type="button" onClick={onClose} disabled={saving} className="emp-bd rounded-full border-2 px-5 py-2 disabled:opacity-50">
          Cancel
        </button>
        {item &&
          (confirmDelete ? (
            <button type="button" onClick={remove} disabled={saving} className="rounded-full border-2 border-red-500 px-4 py-2 text-sm font-bold emp-danger">
              Yes, delete
            </button>
          ) : (
            <button type="button" onClick={() => setConfirmDelete(true)} disabled={saving} className="text-sm underline emp-danger">
              Delete item
            </button>
          ))}
        <button type="button" onClick={save} disabled={saving} className="emp-bd emp-solid rounded-full border-2 px-5 py-2 font-bold disabled:opacity-50">
          {saving ? "Saving…" : "Save item"}
        </button>
      </div>
    </Modal>

    {showNewIng && (
      <IngredientModal
        categories={categories}
        onClose={() => setShowNewIng(false)}
        onSaved={async () => {
          setShowNewIng(false);
          const res = await getIngredients();
          if (res.ok) setIngredients(res.data);
        }}
      />
    )}
    </>
  );
}
