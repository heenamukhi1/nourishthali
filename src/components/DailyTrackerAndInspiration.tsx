"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Droplets,
  Pill,
  Wheat,
  Plus,
  Minus,
  Check,
  Shuffle,
  Utensils,
  RotateCcw,
} from "lucide-react";
import type { InspiringThaliRecord } from "@/app/api/generate-inspiring-thali/route";
import {
  findRecipeForDishLabel,
  type PlateFormulaSelection,
} from "@/data/weekly-plan-store";
import type { SupabaseRecipeRecord } from "@/types/recipes";

export type TrackerSubTab =
  | "all"
  | "water"
  | "supplements"
  | "fiber"
  | "inspiration";

interface SupplementItem {
  id: string;
  name: string;
  taken: boolean;
}

export interface DailyTrackerLog {
  waterGlasses: number; // starts at 0 (each glass = 250ml, goal = 8 glasses / 2000ml)
  supplements: SupplementItem[]; // all start with taken: false
  fiberGrams: number; // starts at 0g (goal = 35g)
}

const EMPTY_SUPPLEMENTS: SupplementItem[] = [
  { id: "supp-d3k2", name: "Vit D3 + K2", taken: false },
  { id: "supp-curcumin", name: "Curcumin", taken: false },
  { id: "supp-omega3", name: "Omega-3", taken: false },
  { id: "supp-berberine", name: "Berberine", taken: false },
  { id: "supp-magnesium", name: "Magnesium", taken: false },
];

const EMPTY_TRACKER_LOG: DailyTrackerLog = {
  waterGlasses: 0,
  supplements: EMPTY_SUPPLEMENTS,
  fiberGrams: 0,
};

interface DailyTrackerAndInspirationProps {
  dayName: string;
  dateLabel: string;
  brunchPlate: PlateFormulaSelection;
  dinnerPlate: PlateFormulaSelection;
  allRecipes: SupabaseRecipeRecord[];
  activeSubTab?: TrackerSubTab;
  onSelectSubTab?: (tab: TrackerSubTab) => void;
  onApplyInspiringThaliToMeal: (
    slot: "brunch" | "dinner",
    plate: PlateFormulaSelection,
    imageUrl: string,
    title: string
  ) => void;
}

export function DailyTrackerAndInspiration({
  dayName,
  dateLabel,
  allRecipes,
  onApplyInspiringThaliToMeal,
}: DailyTrackerAndInspirationProps) {
  const dayKey = dayName.toLowerCase();
  const storageKey = `nourishthali_daily_tracker_v3_${dayKey}`;

  const [trackerLog, setTrackerLog] =
    useState<DailyTrackerLog>(EMPTY_TRACKER_LOG);
  const [addingSupp, setAddingSupp] = useState<boolean>(false);
  const [newSuppName, setNewSuppName] = useState<string>("");

  // Inspiring Thalis state
  const [inspiringThalis, setInspiringThalis] = useState<
    InspiringThaliRecord[]
  >([]);
  const [loadingThalis, setLoadingThalis] = useState<boolean>(true);
  const [generatingThali, setGeneratingThali] = useState<boolean>(false);

  // Load tracker log for active day (defaults to completely empty: 0 water, 0 supplements, 0g fiber)
  useEffect(() => {
    setTrackerLog(EMPTY_TRACKER_LOG);

    if (typeof window !== "undefined") {
      try {
        const saved = window.localStorage.getItem(storageKey);
        if (saved) {
          const parsed = JSON.parse(saved) as DailyTrackerLog;
          if (parsed && typeof parsed.waterGlasses === "number") {
            setTrackerLog({
              waterGlasses: parsed.waterGlasses,
              supplements: Array.isArray(parsed.supplements)
                ? parsed.supplements
                : EMPTY_SUPPLEMENTS,
              fiberGrams:
                typeof parsed.fiberGrams === "number" ? parsed.fiberGrams : 0,
            });
          }
        }
      } catch {
        // Ignore
      }
    }

    fetch(`/api/daily-tracker?day=${encodeURIComponent(dayKey)}`, {
      cache: "no-store",
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.tracker && typeof data.tracker.waterGlasses === "number") {
          const remote: DailyTrackerLog = {
            waterGlasses: data.tracker.waterGlasses,
            supplements: Array.isArray(data.tracker.supplements)
              ? data.tracker.supplements
              : EMPTY_SUPPLEMENTS,
            fiberGrams:
              typeof data.tracker.fiberGrams === "number"
                ? data.tracker.fiberGrams
                : 0,
          };
          setTrackerLog(remote);
          if (typeof window !== "undefined") {
            window.localStorage.setItem(storageKey, JSON.stringify(remote));
          }
        }
      })
      .catch(() => {
        // Ignore
      });
  }, [dayKey, storageKey]);

  function updateTrackerLog(next: DailyTrackerLog) {
    setTrackerLog(next);
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(storageKey, JSON.stringify(next));
      } catch {
        // Ignore
      }
    }
    fetch("/api/daily-tracker", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ day: dayKey, tracker: next }),
    }).catch(() => {
      // Ignore offline errors
    });
  }

  // Load saved Inspiring Thalis from Supabase API
  useEffect(() => {
    fetch("/api/generate-inspiring-thali", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (Array.isArray(data?.thalis) && data.thalis.length > 0) {
          setInspiringThalis(data.thalis);
        }
      })
      .catch(() => {
        // Ignore
      })
      .finally(() => {
        setLoadingThalis(false);
      });
  }, []);

  function handleWaterChange(delta: number) {
    updateTrackerLog({
      ...trackerLog,
      waterGlasses: Math.max(0, Math.min(12, trackerLog.waterGlasses + delta)),
    });
  }

  function toggleSupplement(id: string) {
    updateTrackerLog({
      ...trackerLog,
      supplements: trackerLog.supplements.map((s) =>
        s.id === id ? { ...s, taken: !s.taken } : s
      ),
    });
  }

  function handleAddSupplement(e: React.FormEvent) {
    e.preventDefault();
    if (!newSuppName.trim()) return;
    updateTrackerLog({
      ...trackerLog,
      supplements: [
        ...trackerLog.supplements,
        {
          id: `supp-${Date.now()}`,
          name: newSuppName.trim(),
          taken: true,
        },
      ],
    });
    setNewSuppName("");
    setAddingSupp(false);
  }

  function handleFiberChange(deltaGrams: number) {
    updateTrackerLog({
      ...trackerLog,
      fiberGrams: Math.max(0, Math.min(60, trackerLog.fiberGrams + deltaGrams)),
    });
  }

  async function handleGenerateInspiringThali() {
    setGeneratingThali(true);
    try {
      const res = await fetch("/api/generate-inspiring-thali", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (res.ok && Array.isArray(data.thalis)) {
        setInspiringThalis(data.thalis);
      }
    } catch {
      // Ignore network error
    } finally {
      setGeneratingThali(false);
    }
  }

  const waterGoalGlasses = 8;
  const supplementsTakenCount = trackerLog.supplements.filter(
    (s) => s.taken
  ).length;
  const fiberGoalG = 35;

  return (
    <section
      id="daily-tracker-section"
      aria-label="Minimal Daily Tracker & Inspiring Thalis"
      className="space-y-6"
    >
      {/* =====================================================================
          COMPACT, MINIMAL 1-ROW DAILY TRACKER BAR (STARTS EMPTY AT 0)
         ===================================================================== */}
      <div className="rounded-[20px] border border-[#E5DEC9] bg-white px-5 py-4 shadow-[0_4px_16px_rgba(0,0,0,0.03)]">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold uppercase tracking-wider text-[#222923]">
              Daily Tracker
            </h2>
            <span className="text-xs text-[#7A756C]">
              &bull; {dayName}, {dateLabel}
            </span>
          </div>
          {(trackerLog.waterGlasses > 0 ||
            supplementsTakenCount > 0 ||
            trackerLog.fiberGrams > 0) && (
            <button
              type="button"
              onClick={() => updateTrackerLog(EMPTY_TRACKER_LOG)}
              className="inline-flex items-center gap-1 text-[11px] font-medium text-[#7A756C] hover:text-[#1F2721]"
            >
              <RotateCcw className="h-3 w-3" />
              Reset
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {/* 1. Minimal Water Tracker */}
          <div className="flex items-center justify-between gap-2 rounded-xl border border-[#E6E0D3] bg-[#FAF7F2] px-3.5 py-2.5">
            <div className="flex items-center gap-2">
              <Droplets className="h-4 w-4 shrink-0 text-[#3A8BB8]" />
              <div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-xs font-bold text-[#1F2721]">
                    Water
                  </span>
                  <span className="text-xs font-semibold text-[#3A8BB8]">
                    {trackerLog.waterGlasses}/{waterGoalGlasses} glasses
                  </span>
                </div>
                <div className="mt-1 flex items-center gap-1">
                  {Array.from({ length: waterGoalGlasses }).map((_, idx) => {
                    const filled = idx < trackerLog.waterGlasses;
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() =>
                          updateTrackerLog({
                            ...trackerLog,
                            waterGlasses:
                              idx + 1 === trackerLog.waterGlasses
                                ? idx
                                : idx + 1,
                          })
                        }
                        title={`${idx + 1} glass (${(idx + 1) * 250}ml)`}
                        className={`h-2.5 w-2.5 rounded-full transition-colors ${
                          filled
                            ? "bg-[#3A8BB8]"
                            : "bg-[#DCD5C7] hover:bg-[#B8C4CC]"
                        }`}
                      />
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => handleWaterChange(-1)}
                className="flex h-6 w-6 items-center justify-center rounded-full border border-[#D8D0C2] bg-white text-[#4A4A45] hover:bg-[#EFECE4]"
                aria-label="Remove 1 glass of water"
              >
                <Minus className="h-3 w-3" />
              </button>
              <button
                type="button"
                onClick={() => handleWaterChange(1)}
                className="flex h-6 w-6 items-center justify-center rounded-full bg-[#3A8BB8] text-white hover:bg-[#2B7299]"
                aria-label="Add 1 glass of water"
              >
                <Plus className="h-3 w-3" />
              </button>
            </div>
          </div>

          {/* 2. Minimal Supplements Tracker */}
          <div className="flex flex-col justify-center rounded-xl border border-[#E6E0D3] bg-[#FAF7F2] px-3.5 py-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Pill className="h-4 w-4 shrink-0 text-[#B86B4B]" />
                <span className="text-xs font-bold text-[#1F2721]">
                  Supplements
                </span>
                <span className="text-xs font-semibold text-[#B86B4B]">
                  {supplementsTakenCount}/{trackerLog.supplements.length}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setAddingSupp((v) => !v)}
                className="text-[11px] font-semibold text-[#68846C] hover:underline"
              >
                {addingSupp ? "Cancel" : "+ Add"}
              </button>
            </div>

            {addingSupp ? (
              <form onSubmit={handleAddSupplement} className="mt-1.5 flex gap-1.5">
                <input
                  type="text"
                  value={newSuppName}
                  onChange={(e) => setNewSuppName(e.target.value)}
                  placeholder="Supplement name..."
                  className="min-w-0 flex-1 rounded-lg border border-[#D8D0C2] bg-white px-2 py-0.5 text-[11px] text-[#1F2721] focus:outline-none"
                />
                <button
                  type="submit"
                  className="rounded-lg bg-[#68846C] px-2 py-0.5 text-[11px] font-semibold text-white"
                >
                  Save
                </button>
              </form>
            ) : (
              <div className="mt-1.5 flex flex-wrap gap-1">
                {trackerLog.supplements.map((supp) => (
                  <button
                    key={supp.id}
                    type="button"
                    onClick={() => toggleSupplement(supp.id)}
                    className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10.5px] font-semibold transition-all ${
                      supp.taken
                        ? "border-[#68846C] bg-[#68846C] text-white"
                        : "border-[#D8D0C2] bg-white text-[#4E5550] hover:border-[#8C8270]"
                    }`}
                  >
                    {supp.taken && <Check className="h-2.5 w-2.5" />}
                    <span>{supp.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 3. Minimal Fiber Tracker */}
          <div className="flex items-center justify-between gap-2 rounded-xl border border-[#E6E0D3] bg-[#FAF7F2] px-3.5 py-2.5">
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline gap-1.5">
                <Wheat className="h-4 w-4 shrink-0 text-[#527957]" />
                <span className="text-xs font-bold text-[#1F2721]">Fiber</span>
                <span className="text-xs font-semibold text-[#527957]">
                  {trackerLog.fiberGrams}/{fiberGoalG}g
                </span>
              </div>
              <div className="mt-1.5 flex flex-wrap gap-1">
                {[
                  { label: "+5g Isabgol", g: 5 },
                  { label: "+7g Chia", g: 7 },
                  { label: "+6g Sabzi", g: 6 },
                ].map((chip) => (
                  <button
                    key={chip.label}
                    type="button"
                    onClick={() => handleFiberChange(chip.g)}
                    className="rounded-full border border-[#D4E4D6] bg-white px-2 py-0.5 text-[10px] font-semibold text-[#2E5436] hover:bg-[#E8F0E8]"
                  >
                    {chip.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => handleFiberChange(-5)}
                className="flex h-6 w-6 items-center justify-center rounded-full border border-[#D8D0C2] bg-white text-[#4A4A45] hover:bg-[#EFECE4]"
                aria-label="Remove 5g fiber"
              >
                <Minus className="h-3 w-3" />
              </button>
              <button
                type="button"
                onClick={() => handleFiberChange(5)}
                className="flex h-6 w-6 items-center justify-center rounded-full bg-[#68846C] text-white hover:bg-[#57725B]"
                aria-label="Add 5g fiber"
              >
                <Plus className="h-3 w-3" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* =====================================================================
          INSPIRING THALIS SECTION (CLEAN IMAGES + 1 SIMPLE LINE OF HEALING TEXT)
         ===================================================================== */}
      <div className="rounded-[24px] border border-[#E2DACB] bg-white p-6 shadow-[0_6px_22px_rgba(0,0,0,0.04)]">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#EFEAE0] pb-4">
          <div>
            <h2 className="font-serif text-xl font-normal text-[#1F2721] sm:text-2xl">
              Inspiring Healing Thalis
            </h2>
            <p className="text-xs text-[#6B675E]">
              Curated 4-part ketogenic Thali combinations with Gemini AI imagery
              and healing benefits.
            </p>
          </div>

          <button
            type="button"
            disabled={generatingThali}
            onClick={handleGenerateInspiringThali}
            className="inline-flex items-center gap-2 rounded-full bg-[#68846C] px-4 py-2 text-xs font-bold text-white shadow-xs transition-all hover:bg-[#57725B] disabled:opacity-60"
          >
            <Shuffle className="h-3.5 w-3.5" />
            {generatingThali
              ? "Generating with Gemini..."
              : "Generate New Thali"}
          </button>
        </div>

        {/* Inspiring Thali Cards Grid */}
        {loadingThalis ? (
          <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-3">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className="h-72 animate-pulse rounded-2xl bg-[#F3EFE6]"
              />
            ))}
          </div>
        ) : (
          <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-3">
            {inspiringThalis.slice(0, 3).map((thali) => {
              const fallbackRecipe = findRecipeForDishLabel(
                thali.plate.protein,
                allRecipes
              );
              const resolvedImg =
                thali.imageUrl &&
                !thali.imageUrl.includes("pkvkjdhpqnhOxpznrleb")
                  ? thali.imageUrl
                  : fallbackRecipe?.image_url || "/images/mockup-meals.jpg";

              return (
                <article
                  key={thali.id}
                  className="flex flex-col justify-between overflow-hidden rounded-[20px] border border-[#E4DAC8] bg-[#FAF7F2]/50 shadow-2xs transition-all hover:shadow-md"
                >
                  <div>
                    {/* Thali Image + Macros Overlay */}
                    <div className="relative h-44 w-full overflow-hidden bg-[#2E2620]">
                      <img
                        src={resolvedImg}
                        alt={thali.title}
                        onError={(e) => {
                          const target = e.currentTarget;
                          if (
                            fallbackRecipe?.image_url &&
                            target.src !== fallbackRecipe.image_url
                          ) {
                            target.src = fallbackRecipe.image_url;
                          } else {
                            target.src = "/images/mockup-meals.jpg";
                          }
                        }}
                        className="h-full w-full object-cover transition-transform duration-500 hover:scale-105"
                      />
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent p-3">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="rounded-full bg-[#68846C] px-2.5 py-0.5 text-[10px] font-bold text-white">
                            {thali.netCarbsG}g Net Carbs
                          </span>
                          <span className="rounded-full bg-white/90 px-2.5 py-0.5 text-[10px] font-bold text-[#1E3528]">
                            {thali.fiberG}g Fiber
                          </span>
                          <span className="rounded-full bg-white/90 px-2.5 py-0.5 text-[10px] font-bold text-[#8A4B32]">
                            {thali.proteinG}g Protein
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="p-4">
                      <h3 className="font-serif text-lg font-bold text-[#1F2721]">
                        {thali.title}
                      </h3>

                      {/* 4 Clickable Dish Pills */}
                      <div className="mt-2 flex flex-wrap gap-1">
                        {[
                          thali.plate.protein,
                          thali.plate.fiber,
                          thali.plate.carb,
                          thali.plate.chutney,
                        ].map((dish, idx) => {
                          const matched = findRecipeForDishLabel(
                            dish,
                            allRecipes
                          );
                          return (
                            <Link
                              key={idx}
                              href={`/recipes/${matched.slug}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="rounded-full border border-[#DCE5DC] bg-white px-2 py-0.5 text-[10.5px] font-semibold text-[#2B4C32] hover:bg-[#E3EFE4] hover:underline"
                            >
                              {dish}
                            </Link>
                          );
                        })}
                      </div>

                      {/* Single Simple Line of Healing Text */}
                      <p className="mt-2.5 text-xs leading-relaxed text-[#3A433C]">
                        {thali.healingLine}
                      </p>
                    </div>
                  </div>

                  {/* Action Footer: Apply to Today's Brunch or Dinner */}
                  <div className="flex items-center gap-2 border-t border-[#EFEAE0] bg-white px-4 py-2.5">
                    <button
                      type="button"
                      onClick={() =>
                        onApplyInspiringThaliToMeal(
                          "brunch",
                          thali.plate,
                          resolvedImg,
                          thali.title
                        )
                      }
                      className="flex flex-1 items-center justify-center gap-1 rounded-full border border-[#708C74] bg-white py-1 text-[11px] font-semibold text-[#2B4C32] transition-colors hover:bg-[#68846C] hover:text-white"
                    >
                      <Utensils className="h-3 w-3" />
                      Set as Brunch
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        onApplyInspiringThaliToMeal(
                          "dinner",
                          thali.plate,
                          resolvedImg,
                          thali.title
                        )
                      }
                      className="flex flex-1 items-center justify-center gap-1 rounded-full bg-[#68846C] py-1 text-[11px] font-semibold text-white transition-colors hover:bg-[#57725B]"
                    >
                      <Utensils className="h-3 w-3" />
                      Set as Dinner
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
