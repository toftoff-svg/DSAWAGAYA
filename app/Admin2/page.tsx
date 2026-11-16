"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import BestSellerStar from "../_components/BestSellerStar";
import { getIngredients, getMenu, getStarConfig } from "./_lib/actions";
import MenuItemModal from "./_components/MenuItemModal";
import { peso, type Ingredient, type MenuRow } from "./_lib/menu";

export default function OrdersPage() {
  const [menu, setMenu] = useState<MenuRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editing, setEditing] = useState(false);
  const [editTarget, setEditTarget] = useState<MenuRow | "new" | null>(null); 
  const [section, setSection] = useState<"drinks" | "pastries">("drinks");
  const [ings, setIngs] = useState<Ingredient[]>([]);
  const [starIds, setStarIds] = useState<string[]>([]);
  const [manualStars, setManualStars] = useState<string[]>([]);

  const loadMenu = useCallback(async () => {
    try {
      const [res, extras] = await Promise.all([getMenu(), getStarConfig()]);
      setStarIds(extras.ids);
      if (res.ok) {
        setMenu(res.data);
        setError(null);
      } else setError(res.error);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadMenu();
  }, [loadMenu]);

  const openEditor = async (target: MenuRow | "new") => {
    const [res, cfg] = await Promise.all([getIngredients(), getStarConfig()]);
    setIngs(res.ok ? res.data : []);
    setManualStars(cfg.ids);
    setEditTarget(target);
  };

  const sectionMenu = menu.filter((item) => item.category === section);

  return (
    <div>
      {/* MENU */}
      <section>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold">Menu</h1>
            <p className="mb-4 text-xs opacity-70">{editing ? `Tap a ${section === "drinks" ? "drink" : "pastry"} to edit it` : "Menu items overview"}</p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setEditing((e) => !e)}
              className={`emp-bd rounded-full border px-3 py-1.5 text-sm ${editing ? "emp-solid font-bold" : ""}`}
            >
              {editing ? "Done" : "Edit"}
            </button>
            <button type="button" onClick={() => openEditor("new")} className="emp-solid rounded-full px-4 py-1.5 text-sm font-bold">
              + Add item
            </button>
          </div>
        </div>

        <nav className="mb-4 flex gap-2" aria-label="Menu sections">
          {(["drinks", "pastries"] as const).map((category) => (
            <button
              key={category}
              type="button"
              aria-pressed={section === category}
              onClick={() => setSection(category)}
              className={`emp-bd rounded-full border px-4 py-1.5 text-sm font-bold ${
                section === category ? "emp-solid" : ""
              }`}
            >
              {category === "drinks" ? "Drinks" : "Pastries"}
            </button>
          ))}
        </nav>

        {loading && <p className="text-sm opacity-70">Loading menu…</p>}
        {error && <p className="text-sm emp-danger">Couldn’t load the menu: {error}</p>}
        {!loading && !error && sectionMenu.length === 0 && (
          <p className="text-sm opacity-70">No {section} on the menu yet. Press “+ Add item” to add one.</p>
        )}

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
          {sectionMenu.map((drink) => (
            <button
              key={drink.id}
              type="button"
              onClick={() => editing && openEditor(drink)}
              disabled={!editing}
              className={`emp-bd relative flex flex-col items-center rounded-3xl border-2 p-3 text-center transition-transform hover:-translate-y-0.5 ${
                editing ? "border-dashed" : ""
              }`}
              style={{ backgroundColor: "#FCFAF4", borderColor: drink.color || "#0F47AF" }}
            >
              {editing && <span className="emp-solid absolute right-2 top-2 rounded-full px-2 text-[10px] font-bold">Edit</span>}
              <div className="emp-photo mb-2 aspect-square w-20 overflow-hidden rounded-2xl sm:w-24">
                {drink.photo ? (
                  <Image src={drink.photo} alt={drink.name} width={96} height={96} unoptimized loading="lazy" className="h-full w-full object-contain" />
                ) : (
                  <div className="grid h-full w-full place-items-center text-xs opacity-60">No photo</div>
                )}
              </div>
              <span className="text-sm font-semibold">
                {drink.name}
                {starIds.includes(String(drink.id)) && (
                  <BestSellerStar title="Featured item" />
                )}
              </span>
              <span className="text-sm">{peso(drink.price)}</span>
            </button>
          ))}
        </div>
      </section>

      {editTarget && (
        <MenuItemModal
          item={editTarget === "new" ? null : editTarget}
          defaultCategory={section}
          ingredients={ings}
          starred={editTarget !== "new" && manualStars.includes(String(editTarget.id))}
          onClose={() => setEditTarget(null)}
          onSaved={() => {
            setEditTarget(null);
            loadMenu();
          }}
        />
      )}
    </div>
  );
}
