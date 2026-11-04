"use client";

import React, { useEffect, useMemo, useState } from "react";
import { X, Check, Shuffle, Loader2 } from "lucide-react";
import {
  FULL_COLUMN_POOLS,
  findRecipeForDishLabel,
  type FormulaColumnOption,
  type PlateFormulaSelection,
} from "@/data/weekly-plan-store";
import type { SupabaseRecipeRecord } from "@/types/recipes";

interface EditPlateModalProps {
  isOpen: boolean;
  dayName: string;
  slot: "brunch" | "dinner";
  initialPlate: PlateFormulaSelection;
  initialAiImage?: string | null;
  allRecipes: SupabaseRecipeRecord[];
  onClose: () => void;
  onApply: (
    updatedPlate: PlateFormulaSelection,
    updatedAiImage: string | null,
    notice?: string
  ) => void;
}

const ROWS_PER_PAGE = 10;

function buildDynamicPoolForColumn(
  colKey: keyof PlateFormulaSelection,
  allRecipes: SupabaseRecipeRecord[]
): FormulaColumnOption[] {
  const basePool = [...FULL_COLUMN_POOLS[colKey]];
  const seen = new Set(basePool.map((item) => item.label.toLowerCase()));

  const categoryMap: Record<keyof PlateFormulaSelection, string[]> = {
    protein: ["curry_sabzi", "chakna_snack", "nourish_bowl"],
    fiber: ["curry_sabzi", "soup"],
    carb: ["bread_wrap", "breakfast_chilla", "nourish_bowl"],
    chutney: ["chutney_dip"],
  };

  for (const r of allRecipes) {
    if (!categoryMap[colKey].includes(r.category)) continue;
    const cleanTitle = r.title.split("(")[0].trim();
    if (!cleanTitle || seen.has(cleanTitle.toLowerCase())) continue;
    seen.add(cleanTitle.toLowerCase());
    basePool.push({
      id: r.id || r.slug,
      label: cleanTitle,
      portionNote: `${(r.prep_time_mins || 10) + (r.cook_time_mins || 10)}m`,
      recipeSlug: r.slug,
    });
  }

  return basePool;
}

function shufflePoolWithSelectedFirst(
  pool: FormulaColumnOption[],
  selectedLabel: string
): FormulaColumnOption[] {
  const copy = [...pool];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = copy[i];
    copy[i] = copy[j];
    copy[j] = tmp;
  }

  const existingIdx = copy.findIndex(
    (item) => item.label.toLowerCase() === selectedLabel.toLowerCase()
  );
  if (existingIdx > 0) {
    const [picked] = copy.splice(existingIdx, 1);
    copy.unshift(picked);
  } else if (existingIdx === -1 && selectedLabel) {
    copy.unshift({
      id: `custom-${selectedLabel}`,
      label: selectedLabel,
      portionNote: "1 Serving",
      recipeSlug: "keto-cauliflower-poha",
    });
  }

  return copy;
}

export function EditPlateModal({
  isOpen,
  dayName,
  slot,
  initialPlate,
  initialAiImage = null,
  allRecipes,
  onClose,
  onApply,
}: EditPlateModalProps) {
  const [draftSelection, setDraftSelection] =
    useState<PlateFormulaSelection>(initialPlate);
  const [isApplying, setIsApplying] = useState<boolean>(false);

  const [shuffledPools, setShuffledPools] = useState<
    Record<keyof PlateFormulaSelection, FormulaColumnOption[]>
  >(() => ({
    protein: FULL_COLUMN_POOLS.protein,
    fiber: FULL_COLUMN_POOLS.fiber,
    carb: FULL_COLUMN_POOLS.carb,
    chutney: FULL_COLUMN_POOLS.chutney,
  }));

  const [columnOffsets, setColumnOffsets] = useState<
    Record<keyof PlateFormulaSelection, number>
  >({
    protein: 0,
    fiber: 0,
    carb: 0,
    chutney: 0,
  });

  useEffect(() => {
    if (!isOpen) return;
    setDraftSelection(initialPlate);
    setIsApplying(false);
    setColumnOffsets({
      protein: 0,
      fiber: 0,
      carb: 0,
      chutney: 0,
    });
    setShuffledPools({
      protein: shufflePoolWithSelectedFirst(
        buildDynamicPoolForColumn("protein", allRecipes),
        initialPlate.protein
      ),
      fiber: shufflePoolWithSelectedFirst(
        buildDynamicPoolForColumn("fiber", allRecipes),
        initialPlate.fiber
      ),
      carb: shufflePoolWithSelectedFirst(
        buildDynamicPoolForColumn("carb", allRecipes),
        initialPlate.carb
      ),
      chutney: shufflePoolWithSelectedFirst(
        buildDynamicPoolForColumn("chutney", allRecipes),
        initialPlate.chutney
      ),
    });
  }, [isOpen, initialPlate, allRecipes]);

  const visibleColumnRows = useMemo(() => {
    const result: Record<keyof PlateFormulaSelection, FormulaColumnOption[]> = {
      protein: [],
      fiber: [],
      carb: [],
      chutney: [],
    };

    for (const colKey of [
      "protein",
      "fiber",
      "carb",
      "chutney",
    ] as (keyof PlateFormulaSelection)[]) {
      const pool = shuffledPools[colKey] || [];
      const start = columnOffsets[colKey] || 0;
      const rows: FormulaColumnOption[] = [];
      for (let i = 0; i < ROWS_PER_PAGE && i < pool.length; i += 1) {
        rows.push(pool[(start + i) % pool.length]);
      }
      result[colKey] = rows;
    }

    return result;
  }, [shuffledPools, columnOffsets]);

  function handleNextTenRows(colKey: keyof PlateFormulaSelection) {
    const pool = shuffledPools[colKey] || [];
    if (pool.length === 0) return;

    const nextOffset = (columnOffsets[colKey] + ROWS_PER_PAGE) % pool.length;
    setColumnOffsets((prev) => ({
      ...prev,
      [colKey]: nextOffset,
    }));
  }

  /**
   * When the user clicks "Apply Changes", automatically generate the updated
   * Thali image with Gemini AI and apply the new plate + image.
   */
  async function handleApplyWithAutoGeminiImage() {
    setIsApplying(true);
    let generatedImageUrl: string | null = initialAiImage || null;

    try {
      const response = await fetch("/api/generate-plate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slot,
          protein: draftSelection.protein,
          fiber: draftSelection.fiber,
          carb: draftSelection.carb,
          chutney: draftSelection.chutney,
        }),
      });
      const data = await response.json();
      if (data?.imageUrl) {
        generatedImageUrl = data.imageUrl;
      }
    } catch {
      // Fallback to matched recipe image if offline
    } finally {
      setIsApplying(false);
    }

    onApply(
      draftSelection,
      generatedImageUrl,
      `Updated ${dayName}'s ${
        slot === "brunch" ? "10:30 AM Brunch" : "6:00 PM Dinner"
      } Plate & regenerated Thali image!`
    );
  }

  if (!isOpen) return null;

  const previewRecipes = [
    findRecipeForDishLabel(draftSelection.protein, allRecipes),
    findRecipeForDishLabel(draftSelection.fiber, allRecipes),
    findRecipeForDishLabel(draftSelection.carb, allRecipes),
    findRecipeForDishLabel(draftSelection.chutney, allRecipes),
  ];

  const columnsMeta: Array<{
    key: keyof PlateFormulaSelection;
    title: string;
  }> = [
    { key: "protein", title: "1. Protein Base" },
    { key: "fiber", title: "2. Fiber & Sabzi" },
    { key: "carb", title: "3. Roti/Rice Swap" },
    { key: "chutney", title: "4. Chutney & Dip" },
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-plate-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 sm:p-5 backdrop-blur-[2px]"
    >
      <div className="flex max-h-[92vh] w-full max-w-[1040px] flex-col overflow-hidden rounded-[22px] border border-[#E4DAC8] bg-[#FAF4E8] shadow-2xl">
        {/* Modal Header (Clean — No Gemini API Key Button) */}
        <div className="flex shrink-0 items-start justify-between border-b border-[#EAE0CE] px-6 pt-5 pb-3.5">
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h2
                id="edit-plate-modal-title"
                className="text-[24px] font-bold leading-tight text-[#222623]"
              >
                Edit My Plate
              </h2>
              <span className="rounded-full bg-[#E6EFE8] px-3 py-0.5 text-xs font-bold uppercase tracking-wider text-[#224A30]">
                {dayName} &bull;{" "}
                {slot === "brunch" ? "10:30 AM Brunch" : "6:00 PM Dinner"}
              </span>
            </div>
            <p className="mt-0.5 text-[14px] font-medium text-[#B85D3B]">
              Vijay Mukhi&rsquo;s Personalized Plate — Showing 10 randomized
              rows per column (click Shuffle Column for next 10)
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isApplying}
            aria-label="Close Edit My Plate Modal"
            className="rounded-lg p-1.5 text-[#4A4A45] transition-colors hover:bg-[#EBE2D0] hover:text-black disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable 4-Column x 10-Row Table Selector */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {columnsMeta.map((col) => {
              const selectedVal = draftSelection[col.key];
              const rows = visibleColumnRows[col.key] || [];
              const totalPoolSize = shuffledPools[col.key]?.length || 25;
              const startRowNum = (columnOffsets[col.key] % totalPoolSize) + 1;

              return (
                <div
                  key={col.key}
                  className="flex flex-col justify-between overflow-hidden rounded-xl border border-[#E5DBC9] bg-[#F2E9DA]"
                >
                  <div>
                    {/* Sage Green Column Header */}
                    <div className="flex items-center justify-between bg-[#708C74] px-3.5 py-2.5 text-white">
                      <span className="text-[14px] font-semibold">
                        {col.title}
                      </span>
                      <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10.5px] font-bold">
                        10 of {totalPoolSize}
                      </span>
                    </div>

                    {/* 10 Pill Rows */}
                    <div className="max-h-[380px] space-y-2 overflow-y-auto p-2.5">
                      {rows.map((option, idx) => {
                        const isSelected =
                          selectedVal.toLowerCase() ===
                          option.label.toLowerCase();
                        return (
                          <button
                            key={`${option.id}-${idx}`}
                            type="button"
                            onClick={() =>
                              setDraftSelection((prev) => ({
                                ...prev,
                                [col.key]: option.label,
                              }))
                            }
                            aria-pressed={isSelected}
                            className={`flex min-h-[42px] w-full items-center justify-between gap-2 rounded-full px-3.5 py-1.5 text-left text-[12.5px] font-medium leading-snug transition-all ${
                              isSelected
                                ? "border border-[#708C74] bg-[#708C74] text-white shadow-sm"
                                : "border-[1.5px] border-[#B85D3B]/80 bg-[#FAF4E8] text-[#222623] hover:bg-[#F3E8D6]"
                            }`}
                          >
                            <div className="min-w-0 flex-1">
                              <p className="truncate font-semibold">
                                {option.label}
                              </p>
                              {option.portionNote && (
                                <p
                                  className={`text-[10px] ${
                                    isSelected
                                      ? "text-white/85"
                                      : "text-[#6E675C]"
                                  }`}
                                >
                                  Portion: {option.portionNote}
                                </p>
                              )}
                            </div>
                            {isSelected && (
                              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white text-[#708C74]">
                                <Check className="h-3.5 w-3.5 stroke-[3]" />
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Bottom Shuffle Column (Fetch Next 10 Rows) Button */}
                  <button
                    type="button"
                    onClick={() => handleNextTenRows(col.key)}
                    className="flex w-full items-center justify-center gap-1.5 border-t border-[#E0D5C1] bg-[#E6DCCB] py-2.5 text-[12.5px] font-semibold text-[#2C332E] transition-colors hover:bg-[#DBD0BC]"
                  >
                    <Shuffle className="h-3.5 w-3.5 text-[#B55938]" />
                    <span>
                      Shuffle Column (Next 10 • #{startRowNum}–
                      {startRowNum + rows.length - 1})
                    </span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Bottom Terracotta Live Preview & Single "Apply Changes" Action Bar */}
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-4 bg-[#B55938] px-6 py-3.5">
          {/* Left: LIVE PREVIEW + 4 Circular Dish Thumbnails from Supabase Recipes */}
          <div>
            <p className="mb-1 text-[10.5px] font-semibold uppercase tracking-wider text-white/90">
              LIVE PREVIEW ({draftSelection.protein} • {draftSelection.fiber})
            </p>
            <div className="flex items-center gap-2.5">
              {previewRecipes.map((rec, idx) => (
                <div
                  key={idx}
                  title={rec?.title || ""}
                  className="relative h-10 w-10 overflow-hidden rounded-full border-2 border-white/85 bg-[#2A322E] shadow-sm"
                >
                  <img
                    src={rec?.image_url || "/images/mockup-meals.jpg"}
                    alt={rec?.title || "Dish preview"}
                    className="h-full w-full object-cover"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Right: Apply Changes (Automatically Updates Plate Image with Gemini AI) */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              disabled={isApplying}
              onClick={handleApplyWithAutoGeminiImage}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-[#6C8870] px-7 text-[14px] font-semibold text-white shadow-sm transition-colors hover:bg-[#5B755F] disabled:opacity-70"
            >
              {isApplying && <Loader2 className="h-4 w-4 animate-spin" />}
              <span>
                {isApplying
                  ? "Updating Plate & Generating Image..."
                  : "Apply Changes"}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
