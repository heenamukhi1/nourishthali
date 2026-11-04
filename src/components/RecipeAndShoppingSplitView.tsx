"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Heart, MessageCircle, ArrowUpRight, Utensils } from "lucide-react";
import type { SupabaseRecipeRecord } from "@/types/recipes";

export interface PlannedDishEntry {
  slotLabel: string;
  dishLabel: string;
  recipe: SupabaseRecipeRecord;
}

export interface ShoppingCategoryItem {
  id: string;
  label: string;
}

interface RecipeAndShoppingSplitViewProps {
  dayName?: string;
  dateLabel?: string;
  plannedDishes?: PlannedDishEntry[];
  allWeeklyRecipes?: SupabaseRecipeRecord[];
}

function extractShoppingByAisle(recipes: SupabaseRecipeRecord[]): {
  produce: ShoppingCategoryItem[];
  proteins: ShoppingCategoryItem[];
  nutsSeeds: ShoppingCategoryItem[];
  masalaStaples: ShoppingCategoryItem[];
} {
  const produceMap = new Map<string, string>();
  const proteinMap = new Map<string, string>();
  const nutsMap = new Map<string, string>();
  const masalaMap = new Map<string, string>();

  for (const r of recipes) {
    for (const ing of r?.ingredients || []) {
      const cleanName = ing.item.trim();
      const key = cleanName.toLowerCase();
      const displayLabel = ing.qty
        ? `${cleanName} (${ing.qty} ${ing.unit})`
        : cleanName;

      if (ing.aisle === "produce") {
        if (!produceMap.has(key)) produceMap.set(key, displayLabel);
      } else if (ing.aisle === "protein_curd") {
        if (!proteinMap.has(key)) proteinMap.set(key, displayLabel);
      } else if (ing.aisle === "nuts_seeds") {
        if (!nutsMap.has(key)) nutsMap.set(key, displayLabel);
      } else if (
        ing.aisle === "masala_staple" ||
        ing.aisle === "keto_flours"
      ) {
        if (!masalaMap.has(key)) masalaMap.set(key, displayLabel);
      }
    }
  }

  const toItems = (
    map: Map<string, string>,
    prefix: string,
    limit: number,
    fallback: string[]
  ): ShoppingCategoryItem[] => {
    const entries = Array.from(map.values()).slice(0, limit);
    const list = entries.length > 0 ? entries : fallback;
    return list.map((label, idx) => ({
      id: `${prefix}-${idx}-${label}`,
      label,
    }));
  };

  return {
    produce: toItems(produceMap, "fp", 8, [
      "Cauliflower (Gobi)",
      "Fresh Spinach (Palak)",
      "Broccoli Florets",
      "Curry Leaves & Mint",
    ]),
    proteins: toItems(proteinMap, "pr", 6, [
      "Firm Organic Tofu",
      "Probiotic Cashew / Hung Curd",
      "Thick Coconut Cream",
      "Free-Range Eggs",
    ]),
    nutsSeeds: toItems(nutsMap, "ns", 6, [
      "Walnut Halves (Akhrot)",
      "Pumpkin Seeds (Magaz)",
      "Roasted Peanuts",
      "White Sesame Tahini",
    ]),
    masalaStaples: toItems(masalaMap, "ms", 6, [
      "A2 Desi Cow Ghee",
      "Kachi Ghani Mustard Oil",
      "Blanched Almond Flour",
      "Psyllium Husk (Isabgol)",
      "Sendha Namak & Turmeric",
    ]),
  };
}

export function RecipeAndShoppingSplitView({
  dayName = "Tuesday",
  dateLabel = "Nov 3",
  plannedDishes = [],
  allWeeklyRecipes = [],
}: RecipeAndShoppingSplitViewProps) {
  const [selectedDishIndex, setSelectedDishIndex] = useState<number>(0);
  const [isFavorite, setIsFavorite] = useState<boolean>(true);
  const [shoppingScope, setShoppingScope] = useState<"day" | "week">("day");

  const [checkedIngredients, setCheckedIngredients] = useState<
    Record<string, boolean>
  >({});
  const [checkedShoppingIds, setCheckedShoppingIds] = useState<
    Record<string, boolean>
  >({});

  useEffect(() => {
    setSelectedDishIndex(0);
  }, [dayName]);

  const activeDishEntry =
    plannedDishes[selectedDishIndex] || plannedDishes[0] || null;
  const activeRecipe = activeDishEntry?.recipe || null;

  // Dynamically compute the shopping list from either the active day's planned recipes
  // or the full week's planned recipes whenever any meal is edited!
  const dynamicShopping = useMemo(() => {
    const dayRecipes = plannedDishes
      .map((d) => d.recipe)
      .filter((r): r is SupabaseRecipeRecord => Boolean(r));

    const sourceRecipes =
      shoppingScope === "week" && allWeeklyRecipes.length > 0
        ? allWeeklyRecipes
        : dayRecipes;

    return extractShoppingByAisle(sourceRecipes);
  }, [plannedDishes, allWeeklyRecipes, shoppingScope]);

  function toggleShoppingCheck(id: string) {
    setCheckedShoppingIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  }

  function toggleRecipeIngredient(key: string) {
    setCheckedIngredients((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  }

  function handleShareToWhatsApp() {
    const uncheckedProduce = dynamicShopping.produce
      .filter((i) => !checkedShoppingIds[i.id])
      .map((i) => `• ${i.label}`);
    const uncheckedProteins = dynamicShopping.proteins
      .filter((i) => !checkedShoppingIds[i.id])
      .map((i) => `• ${i.label}`);
    const uncheckedNuts = dynamicShopping.nutsSeeds
      .filter((i) => !checkedShoppingIds[i.id])
      .map((i) => `• ${i.label}`);

    const scopeLabel =
      shoppingScope === "week"
        ? "Full Week (Mon Nov 2 – Sun Nov 8)"
        : `${dayName}, ${dateLabel}`;

    const lines = [
      `*NourishThali — Shopping List (${scopeLabel})*`,
      "",
      "*Fresh Produce:*",
      ...(uncheckedProduce.length ? uncheckedProduce : ["• All stocked"]),
      "",
      "*Proteins & Curd:*",
      ...(uncheckedProteins.length ? uncheckedProteins : ["• All stocked"]),
      "",
      "*Nuts & Seeds:*",
      ...(uncheckedNuts.length ? uncheckedNuts : ["• All stocked"]),
    ];

    const url = `https://wa.me/?text=${encodeURIComponent(lines.join("\n"))}`;
    if (typeof window !== "undefined") {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  }

  const recipeTitle =
    activeDishEntry?.dishLabel ||
    activeRecipe?.title ||
    "Keto Cauliflower Poha";
  const prepMins = activeRecipe?.prep_time_mins ?? 10;
  const cookMins = activeRecipe?.cook_time_mins ?? 10;
  const ingredientsList = activeRecipe?.ingredients?.length
    ? activeRecipe.ingredients.map((ing, i) => ({
        id: `${activeRecipe.slug}-ing-${i}`,
        label: `${ing.qty} ${ing.unit} ${ing.item}`,
      }))
    : [
        { id: "ing-1", label: "300g Cauliflower (Riced)" },
        { id: "ing-2", label: "1 Tbsp Ghee or Mustard Oil" },
        { id: "ing-3", label: "1/2 tsp Mustard Seeds" },
        { id: "ing-4", label: "10 Curry Leaves" },
        { id: "ing-5", label: "1 Tbsp Roasted Peanuts" },
      ];

  const instructionsList = activeRecipe?.instructions?.length
    ? activeRecipe.instructions
    : [
        "Heat oil in a skillet. Crackle mustard seeds and curry leaves.",
        "Add onion and green chili; sauté until translucent.",
        "Stir in turmeric, add riced cauliflower and toss well for 4-5 minutes until tender-crisp. Garnish with peanuts and cilantro.",
      ];

  return (
    <section
      id="recipes-shopping"
      aria-label="Recipes in Plan for the Day and Weekly Shopping List"
      className="overflow-hidden rounded-[22px] border border-[#E6DFD3] bg-[#FAF6EE] text-[#14241B] shadow-[0_8px_30px_rgba(0,0,0,0.06)]"
    >
      {/* Top Bar: Recipes in Plan for the Day Switcher */}
      {plannedDishes.length > 0 && (
        <div className="border-b border-[#E5DDD0] bg-[#F2ECE0] px-6 py-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.1em] text-[#2B4C37]">
              <Utensils className="h-3.5 w-3.5 text-[#708C74]" />
              <span>
                Recipes in Plan for {dayName}, {dateLabel} (Click any dish to
                view recipe)
              </span>
            </div>
            {activeRecipe && (
              <Link
                href={`/recipes/${activeRecipe.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 text-xs font-bold text-[#1E472D] shadow-sm hover:bg-[#E7F0E9]"
              >
                <span>Open Full Recipe Page</span>
                <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            )}
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {plannedDishes.map((entry, idx) => {
              const isSelected = idx === selectedDishIndex;
              return (
                <button
                  key={`${entry.slotLabel}-${idx}`}
                  type="button"
                  onClick={() => setSelectedDishIndex(idx)}
                  className={`inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all ${
                    isSelected
                      ? "bg-[#1E472D] text-white shadow-sm"
                      : "border border-[#D8CFC0] bg-white text-[#3B423C] hover:bg-[#FAF7F2]"
                  }`}
                >
                  <span
                    className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${
                      isSelected
                        ? "bg-white/20 text-white"
                        : "bg-[#EFEAE0] text-[#6E675C]"
                    }`}
                  >
                    {entry.slotLabel}
                  </span>
                  <span>{entry.dishLabel}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 lg:divide-x lg:divide-[#E2DBD0]">
        {/* ===================================================================
            LEFT PANE: ACTIVE PLANNED RECIPE VIEW
           =================================================================== */}
        <div className="space-y-5 p-7 sm:p-9">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <h2 className="text-[24px] font-bold leading-[1.2] tracking-tight text-[#1E472D] sm:text-[27px]">
                  {recipeTitle}
                </h2>
                <span className="inline-flex items-center rounded-md bg-[#EDE6D8] px-3 py-1 text-xs font-semibold uppercase text-[#6B6356]">
                  {activeRecipe?.diet_type || "Keto"}
                </span>
                <button
                  type="button"
                  onClick={() => setIsFavorite((prev) => !prev)}
                  aria-pressed={isFavorite}
                  className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[#DCD4C6] bg-[#FAF7F2] px-3 text-xs font-medium text-[#2C332E] shadow-sm transition-colors hover:bg-white"
                >
                  <Heart
                    className={`h-3.5 w-3.5 shrink-0 ${
                      isFavorite
                        ? "fill-[#E03131] text-[#E03131]"
                        : "text-[#E03131]"
                    }`}
                    aria-hidden="true"
                  />
                  <span>Heart Favorite</span>
                </button>
              </div>
              <p className="mt-2 text-[13px] text-[#7A756C]">
                Prep: {prepMins} mins &nbsp;|&nbsp; Cook: {cookMins} mins
                {activeDishEntry && (
                  <>
                    {" "}
                    &nbsp;|&nbsp; Planned for{" "}
                    <strong className="text-[#2C3531]">
                      {dayName} ({activeDishEntry.slotLabel})
                    </strong>
                  </>
                )}
              </p>
            </div>
          </div>

          {/* Dish Photo + Interactive Ingredients Checklist */}
          <div className="grid grid-cols-1 items-start gap-6 sm:grid-cols-12">
            <div className="sm:col-span-5">
              <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-[#2A322E] shadow-sm">
                {activeRecipe?.image_url ? (
                  <img
                    src={activeRecipe.image_url}
                    alt={recipeTitle}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <img
                    src="/images/mockup-poha.jpg"
                    alt={recipeTitle}
                    style={{
                      position: "absolute",
                      maxWidth: "none",
                      width: `${(1024 / 192) * 100}%`,
                      height: `${(571 / 192) * 100}%`,
                      left: `-${(63 / 192) * 100}%`,
                      top: `-${(162 / 192) * 100}%`,
                    }}
                  />
                )}
              </div>
            </div>

            <div className="space-y-3 sm:col-span-7">
              <h3 className="text-[17px] font-bold text-[#1B221D]">
                Ingredients Checklist
              </h3>
              <div className="space-y-2">
                {ingredientsList.map((item) => {
                  const isChecked = Boolean(checkedIngredients[item.id]);
                  return (
                    <label
                      key={item.id}
                      className="flex cursor-pointer select-none items-center gap-3 text-[14.5px] text-[#222924]"
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleRecipeIngredient(item.id)}
                        className="h-[17px] w-[17px] rounded border-[#7C776E] text-[#1E472D] focus:ring-[#1E472D]"
                      />
                      <span
                        className={
                          isChecked ? "line-through text-[#7A756C]" : ""
                        }
                      >
                        {item.label}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Step-by-Step Instructions */}
          <div className="space-y-2.5 pt-2">
            <div className="flex items-center justify-between">
              <h3 className="text-[18px] font-bold text-[#1B221D]">
                Step-by-Step Instructions
              </h3>
              {activeRecipe && (
                <Link
                  href={`/recipes/${activeRecipe.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-semibold text-[#1E472D] hover:underline"
                >
                  View Bikaner Mandi Aisles &rarr;
                </Link>
              )}
            </div>
            <ol className="space-y-2 text-[14px] leading-relaxed text-[#252C27]">
              {instructionsList.map((step, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="font-semibold text-[#1E472D]">
                    {index + 1}.
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>

        {/* ===================================================================
            RIGHT PANE: DYNAMIC SHOPPING LIST
           =================================================================== */}
        <div className="space-y-5 p-7 sm:p-9">
          <div className="space-y-3.5">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <h2 className="text-[25px] font-bold leading-[1.18] tracking-tight text-[#141A16] sm:text-[28px]">
                Weekly Shopping List
              </h2>

              {/* Scope Switcher: Active Day vs Full Week */}
              <div className="inline-flex rounded-full border border-[#DFD8CA] bg-white p-0.5 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setShoppingScope("day")}
                  className={`rounded-full px-3 py-1 transition-colors ${
                    shoppingScope === "day"
                      ? "bg-[#1E472D] text-white"
                      : "text-[#5A564E] hover:bg-[#F5F0E6]"
                  }`}
                >
                  {dayName} ({dateLabel})
                </button>
                <button
                  type="button"
                  onClick={() => setShoppingScope("week")}
                  className={`rounded-full px-3 py-1 transition-colors ${
                    shoppingScope === "week"
                      ? "bg-[#1E472D] text-white"
                      : "text-[#5A564E] hover:bg-[#F5F0E6]"
                  }`}
                >
                  Full Week (Mon–Sun)
                </button>
              </div>
            </div>

            <p className="text-xs text-[#6B675E]">
              Automatically synced with your{" "}
              {shoppingScope === "week"
                ? "Monday–Sunday planned meals"
                : `${dayName} (${dateLabel}) Brunch & Dinner recipes`}
              .
            </p>

            {/* Green Share to WhatsApp Button */}
            <div>
              <button
                type="button"
                onClick={handleShareToWhatsApp}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#248A43] px-4 text-[14px] font-medium text-white shadow-sm transition-colors hover:bg-[#1D7237]"
              >
                <MessageCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>Share to WhatsApp</span>
              </button>
            </div>
          </div>

          {/* Categorized Dynamic Shopping Grid (Fresh Produce, Proteins, Nuts & Seeds) */}
          <div className="grid grid-cols-1 gap-6 pt-1 sm:grid-cols-2">
            {/* Top-Left: Fresh Produce */}
            <div className="space-y-2.5">
              <h3 className="text-[17px] font-bold text-[#1B221D]">
                Fresh Produce
              </h3>
              <div className="space-y-2">
                {dynamicShopping.produce.map((item) => {
                  const isChecked = Boolean(checkedShoppingIds[item.id]);
                  return (
                    <label
                      key={item.id}
                      className="flex cursor-pointer select-none items-start gap-2.5 text-[14px] text-[#222924]"
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleShoppingCheck(item.id)}
                        className="mt-0.5 h-[17px] w-[17px] shrink-0 rounded border-[#7C776E] text-[#1E472D] focus:ring-[#1E472D]"
                      />
                      <span
                        className={
                          isChecked ? "line-through text-[#7A756C]" : ""
                        }
                      >
                        {item.label}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Top-Right: Proteins */}
            <div className="space-y-2.5">
              <h3 className="text-[17px] font-bold text-[#1B221D]">Proteins</h3>
              <div className="space-y-2">
                {dynamicShopping.proteins.map((item) => {
                  const isChecked = Boolean(checkedShoppingIds[item.id]);
                  return (
                    <label
                      key={item.id}
                      className="flex cursor-pointer select-none items-start gap-2.5 text-[14px] text-[#222924]"
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleShoppingCheck(item.id)}
                        className="mt-0.5 h-[17px] w-[17px] shrink-0 rounded border-[#7C776E] text-[#1E472D] focus:ring-[#1E472D]"
                      />
                      <span
                        className={
                          isChecked ? "line-through text-[#7A756C]" : ""
                        }
                      >
                        {item.label}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Bottom: Nuts & Seeds */}
            <div className="space-y-2.5 sm:col-span-2">
              <h3 className="text-[17px] font-bold text-[#1B221D]">
                Nuts &amp; Seeds
              </h3>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {dynamicShopping.nutsSeeds.map((item) => {
                  const isChecked = Boolean(checkedShoppingIds[item.id]);
                  return (
                    <label
                      key={item.id}
                      className="flex cursor-pointer select-none items-start gap-2.5 text-[14px] text-[#222924]"
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleShoppingCheck(item.id)}
                        className="mt-0.5 h-[17px] w-[17px] shrink-0 rounded border-[#7C776E] text-[#1E472D] focus:ring-[#1E472D]"
                      />
                      <span
                        className={
                          isChecked ? "line-through text-[#7A756C]" : ""
                        }
                      >
                        {item.label}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
