"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Droplets,
  Pill,
  Wheat,
  Sparkles,
  Plus,
  Minus,
  CheckCircle2,
  Circle,
  Shuffle,
  Utensils,
  Database,
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
  dosageAndTiming: string;
  purpose: string;
  taken: boolean;
}

interface FiberBoostItem {
  id: string;
  name: string;
  grams: number;
  benefit: string;
  loggedCount: number;
}

export interface DailyTrackerLog {
  waterGlasses: number; // each glass = 250ml, goal = 10 glasses (2500ml)
  hydrationRituals: {
    lemonGingerChia: boolean;
    bluePeaTea: boolean;
    ccfDigestiveWater: boolean;
  };
  supplements: SupplementItem[];
  fiberBoosts: FiberBoostItem[];
}

const DEFAULT_SUPPLEMENTS: SupplementItem[] = [
  {
    id: "supp-d3k2",
    name: "Vitamin D3 (5000 IU) + K2 (MK-7)",
    dosageAndTiming: "10:30 AM • With Brunch Healthy Fats",
    purpose: "Supports immune defense and bone-calcium balance",
    taken: true,
  },
  {
    id: "supp-curcumin",
    name: "Bioavailable Curcumin + Piperine",
    dosageAndTiming: "10:30 AM & 6:00 PM • With Meals",
    purpose: "Calms cellular inflammation and oxidative stress",
    taken: true,
  },
  {
    id: "supp-omega3",
    name: "Vegan Omega-3 EPA/DHA + Cold-Pressed Flax",
    dosageAndTiming: "10:30 AM • Post-Brunch",
    purpose: "Supports cell membrane health and heart wellness",
    taken: false,
  },
  {
    id: "supp-berberine",
    name: "Berberine / Ceylon Cinnamon Extract",
    dosageAndTiming: "5:45 PM • 15 mins before Dinner",
    purpose: "Helps maintain steady post-meal blood sugar",
    taken: false,
  },
  {
    id: "supp-magnesium",
    name: "Magnesium Glycinate (400mg) + Ashwagandha",
    dosageAndTiming: "8:30 PM • Evening Wind-Down",
    purpose: "Promotes deep restorative sleep and muscle relaxation",
    taken: false,
  },
];

const DEFAULT_FIBER_BOOSTS: FiberBoostItem[] = [
  {
    id: "fiber-isabgol",
    name: "1 Tbsp Isabgol (Psyllium Husk) in Warm Water",
    grams: 5,
    benefit: "Prebiotic soluble fiber for gut microbiome balance",
    loggedCount: 1,
  },
  {
    id: "fiber-chia",
    name: "2 Tbsp Soaked Chia & Sabja Seeds",
    grams: 7,
    benefit: "Slow-release gel fiber for steady digestion",
    loggedCount: 1,
  },
  {
    id: "fiber-flax",
    name: "2 Tbsp Freshly Ground Alsi (Flaxseed) Mukhwas",
    grams: 4,
    benefit: "Plant lignans and omega-3 fiber",
    loggedCount: 0,
  },
  {
    id: "fiber-cruciferous",
    name: "Extra Bowl Steamed Broccoli / Cauliflower (150g)",
    grams: 5,
    benefit: "Cruciferous fiber and natural detox support",
    loggedCount: 0,
  },
];

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
  brunchPlate,
  dinnerPlate,
  allRecipes,
  activeSubTab = "all",
  onSelectSubTab,
  onApplyInspiringThaliToMeal,
}: DailyTrackerAndInspirationProps) {
  const dayKey = dayName.toLowerCase();
  const storageKey = `nourishthali_daily_tracker_v2_${dayKey}`;

  const [subTab, setSubTab] = useState<TrackerSubTab>(activeSubTab);
  const [trackerLog, setTrackerLog] = useState<DailyTrackerLog>({
    waterGlasses: 6,
    hydrationRituals: {
      lemonGingerChia: true,
      bluePeaTea: true,
      ccfDigestiveWater: false,
    },
    supplements: DEFAULT_SUPPLEMENTS,
    fiberBoosts: DEFAULT_FIBER_BOOSTS,
  });

  // Custom supplement inputs
  const [newSuppName, setNewSuppName] = useState<string>("");
  const [newSuppTiming, setNewSuppTiming] = useState<string>(
    "With Brunch (10:30 AM)"
  );

  // Inspiring Thalis state (from /api/generate-inspiring-thali)
  const [inspiringThalis, setInspiringThalis] = useState<
    InspiringThaliRecord[]
  >([]);
  const [loadingThalis, setLoadingThalis] = useState<boolean>(true);
  const [generatingThali, setGeneratingThali] = useState<boolean>(false);

  useEffect(() => {
    setSubTab(activeSubTab);
  }, [activeSubTab]);

  // Load tracker log for active day (from localStorage + Supabase /api/daily-tracker)
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = window.localStorage.getItem(storageKey);
        if (saved) {
          const parsed = JSON.parse(saved) as DailyTrackerLog;
          if (parsed && typeof parsed.waterGlasses === "number") {
            setTrackerLog(parsed);
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
          setTrackerLog(data.tracker as DailyTrackerLog);
          if (typeof window !== "undefined") {
            window.localStorage.setItem(
              storageKey,
              JSON.stringify(data.tracker)
            );
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
    // Persist to Supabase (`public.meal_plans.rituals_completed` + `public.daily_quotes`)
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

  // Calculate base fiber from Today's Brunch + Dinner plates
  const mealFiberBreakdown = useMemo(() => {
    const mealTotal = 36;
    const boostTotal = trackerLog.fiberBoosts.reduce(
      (acc, b) => acc + b.grams * b.loggedCount,
      0
    );
    return {
      mealTotal,
      boostTotal,
      totalFiberG: mealTotal + boostTotal,
      goalFiberG: 45,
    };
  }, [trackerLog.fiberBoosts]);

  function handleWaterChange(delta: number) {
    const nextGlasses = Math.max(
      0,
      Math.min(14, trackerLog.waterGlasses + delta)
    );
    updateTrackerLog({
      ...trackerLog,
      waterGlasses: nextGlasses,
    });
  }

  function toggleHydrationRitual(
    key: keyof DailyTrackerLog["hydrationRituals"]
  ) {
    updateTrackerLog({
      ...trackerLog,
      hydrationRituals: {
        ...trackerLog.hydrationRituals,
        [key]: !trackerLog.hydrationRituals[key],
      },
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
    const item: SupplementItem = {
      id: `supp-${Date.now()}`,
      name: newSuppName.trim(),
      dosageAndTiming: newSuppTiming.trim() || "Daily with Meal",
      purpose: "Daily wellness support",
      taken: true,
    };
    updateTrackerLog({
      ...trackerLog,
      supplements: [...trackerLog.supplements, item],
    });
    setNewSuppName("");
  }

  function adjustFiberBoost(id: string, delta: number) {
    updateTrackerLog({
      ...trackerLog,
      fiberBoosts: trackerLog.fiberBoosts.map((b) =>
        b.id === id
          ? {
              ...b,
              loggedCount: Math.max(0, Math.min(5, b.loggedCount + delta)),
            }
          : b
      ),
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

  function selectTab(next: TrackerSubTab) {
    setSubTab(next);
    onSelectSubTab?.(next);
  }

  const waterMl = trackerLog.waterGlasses * 250;
  const waterGoalMl = 2500;
  const waterPct = Math.min(100, Math.round((waterMl / waterGoalMl) * 100));

  const supplementsTakenCount = trackerLog.supplements.filter(
    (s) => s.taken
  ).length;
  const fiberPct = Math.min(
    100,
    Math.round(
      (mealFiberBreakdown.totalFiberG / mealFiberBreakdown.goalFiberG) * 100
    )
  );

  return (
    <section
      id="daily-tracker-section"
      aria-label="Daily Healing Tracker & Inspiring Thalis"
      className="space-y-8"
    >
      {/* =====================================================================
          DAILY TRACKER HEADER & 4-PILLAR SUMMARY CARDS
         ===================================================================== */}
      <div className="rounded-[26px] border border-[#E2DACB] bg-white p-6 shadow-[0_8px_28px_rgba(0,0,0,0.04)] sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#EFEAE0] pb-5">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#E8F0E8] px-3 py-1 text-xs font-bold uppercase tracking-wider text-[#2E5436]">
                <Sparkles className="h-3.5 w-3.5" />
                Daily Tracker • {dayName}, {dateLabel}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-[#F3EFE6] px-2.5 py-0.5 text-[11px] font-semibold text-[#5A554C]">
                <Database className="h-3 w-3 text-[#68846C]" />
                Saved in Supabase (public.meal_plans.rituals_completed)
              </span>
            </div>
            <h2 className="mt-2 font-serif text-2xl font-normal text-[#1F2721] sm:text-3xl">
              Water Intake, Supplements, Fiber &amp; Recipe Inspiration
            </h2>
          </div>

          {/* Sub-Tab Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5 rounded-2xl border border-[#E2DACB] bg-[#FAF7F2] p-1.5">
            {[
              { id: "all", label: "All Trackers" },
              { id: "water", label: "Water Intake" },
              { id: "supplements", label: "Supplements" },
              { id: "fiber", label: "Fiber" },
              { id: "inspiration", label: "Recipe Inspiration" },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => selectTab(t.id as TrackerSubTab)}
                className={`rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all ${
                  subTab === t.id
                    ? "bg-[#68846C] text-white shadow-xs"
                    : "text-[#4E5550] hover:bg-white"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* 4 Summary Metric Pills */}
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <button
            type="button"
            onClick={() => selectTab("water")}
            className="flex items-center gap-3.5 rounded-2xl border border-[#DCE8EE] bg-[#F4F9FC] p-4 text-left transition-all hover:border-[#6EA2BE]"
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#D8ECF7] text-[#226488]">
              <Droplets className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#466C82]">
                Water Intake
              </span>
              <p className="text-lg font-bold text-[#18384A]">
                {waterMl} / {waterGoalMl} ml
              </p>
              <span className="text-xs text-[#466C82]">
                {trackerLog.waterGlasses} of 10 glasses ({waterPct}%)
              </span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => selectTab("supplements")}
            className="flex items-center gap-3.5 rounded-2xl border border-[#E5DEC9] bg-[#FBF8F1] p-4 text-left transition-all hover:border-[#B86B4B]"
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#F3E5D7] text-[#B86B4B]">
              <Pill className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#7A6248]">
                Supplements
              </span>
              <p className="text-lg font-bold text-[#2E241A]">
                {supplementsTakenCount} / {trackerLog.supplements.length} Taken
              </p>
              <span className="text-xs text-[#7A6248]">Daily checklist</span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => selectTab("fiber")}
            className="flex items-center gap-3.5 rounded-2xl border border-[#D4E4D6] bg-[#F3F8F3] p-4 text-left transition-all hover:border-[#68846C]"
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#DFECE0] text-[#355E3C]">
              <Wheat className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#3F6345]">
                Daily Fiber
              </span>
              <p className="text-lg font-bold text-[#1E3523]">
                {mealFiberBreakdown.totalFiberG}g /{" "}
                {mealFiberBreakdown.goalFiberG}g
              </p>
              <span className="text-xs text-[#3F6345]">
                {mealFiberBreakdown.mealTotal}g meals +{" "}
                {mealFiberBreakdown.boostTotal}g boosts
              </span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => selectTab("inspiration")}
            className="flex items-center gap-3.5 rounded-2xl border border-[#E4D7C5] bg-[#FAF4EB] p-4 text-left transition-all hover:border-[#9E7B56]"
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#EFE2CE] text-[#845D36]">
              <Sparkles className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#785937]">
                Recipe Inspiration
              </span>
              <p className="text-lg font-bold text-[#2E2215]">
                {inspiringThalis.length} Inspiring Thalis
              </p>
              <span className="text-xs text-[#785937]">
                Gemini AI Thali Ideas
              </span>
            </div>
          </button>
        </div>

        {/* ===================================================================
            TRACKER PANELS (WATER, SUPPLEMENTS, FIBER)
           =================================================================== */}
        {subTab !== "inspiration" && (
          <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* 1. WATER INTAKE TRACKER */}
            {(subTab === "all" || subTab === "water") && (
              <div
                className={`rounded-2xl border border-[#DFD8CA] bg-[#FAF7F2] p-5 ${
                  subTab === "water" ? "lg:col-span-3" : ""
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Droplets className="h-5 w-5 text-[#2B7299]" />
                    <h3 className="font-serif text-lg font-bold text-[#1E2E23]">
                      1. Water Intake
                    </h3>
                  </div>
                  <span className="rounded-full bg-[#D8ECF7] px-2.5 py-0.5 text-xs font-bold text-[#1A5270]">
                    {waterMl} ml / {waterGoalMl} ml
                  </span>
                </div>

                {/* Progress Bar */}
                <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-[#E2E8EC]">
                  <div
                    className="h-full rounded-full bg-[#3A8BB8] transition-all duration-300"
                    style={{ width: `${waterPct}%` }}
                  />
                </div>

                {/* Interactive 10 Glasses Grid */}
                <div className="mt-4">
                  <div className="grid grid-cols-5 gap-2">
                    {Array.from({ length: 10 }).map((_, idx) => {
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
                          className={`flex flex-col items-center justify-center rounded-xl border py-2 text-xs font-semibold transition-all ${
                            filled
                              ? "border-[#3A8BB8] bg-[#E3F2FA] text-[#174A66]"
                              : "border-[#D8D0C2] bg-white text-[#8C8270] hover:bg-[#F3EFE6]"
                          }`}
                        >
                          <Droplets
                            className={`h-4 w-4 ${
                              filled ? "fill-[#3A8BB8] text-[#3A8BB8]" : ""
                            }`}
                          />
                          <span className="mt-0.5 text-[10px]">
                            {(idx + 1) * 250}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  <div className="mt-3 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => handleWaterChange(-1)}
                      className="inline-flex items-center gap-1 rounded-full border border-[#D8D0C2] bg-white px-3 py-1.5 text-xs font-semibold text-[#3C463E] hover:bg-[#EFECE4]"
                    >
                      <Minus className="h-3.5 w-3.5" />
                      -250ml
                    </button>
                    <button
                      type="button"
                      onClick={() => handleWaterChange(1)}
                      className="inline-flex items-center gap-1 rounded-full bg-[#2B7299] px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-[#225B7A]"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      +1 Glass (250ml)
                    </button>
                  </div>
                </div>

                {/* Therapeutic Hydration Elixirs */}
                <div className="mt-4 space-y-2 border-t border-[#E6DEC8] pt-3">
                  {[
                    {
                      key: "lemonGingerChia" as const,
                      label: "7:30 AM Warm Lemon-Ginger-Chia Water",
                    },
                    {
                      key: "bluePeaTea" as const,
                      label: "4:00 PM Blue Pea Flower Herbal Tea",
                    },
                    {
                      key: "ccfDigestiveWater" as const,
                      label: "Cumin-Coriander-Fennel (CCF) Sipping Water",
                    },
                  ].map((ritual) => {
                    const checked = trackerLog.hydrationRituals[ritual.key];
                    return (
                      <button
                        key={ritual.key}
                        type="button"
                        onClick={() => toggleHydrationRitual(ritual.key)}
                        className="flex w-full items-center gap-2.5 rounded-xl bg-white px-3 py-2 text-left text-xs transition-colors hover:bg-[#F3EFE6]"
                      >
                        {checked ? (
                          <CheckCircle2 className="h-4 w-4 shrink-0 text-[#4D7C55]" />
                        ) : (
                          <Circle className="h-4 w-4 shrink-0 text-[#9A948A]" />
                        )}
                        <span
                          className={
                            checked
                              ? "font-semibold text-[#1E3528] line-through decoration-[#708C74]"
                              : "text-[#2E3830]"
                          }
                        >
                          {ritual.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 2. SUPPLEMENTS TRACKER */}
            {(subTab === "all" || subTab === "supplements") && (
              <div
                className={`rounded-2xl border border-[#DFD8CA] bg-[#FAF7F2] p-5 ${
                  subTab === "supplements" ? "lg:col-span-3" : ""
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Pill className="h-5 w-5 text-[#B86B4B]" />
                    <h3 className="font-serif text-lg font-bold text-[#1E2E23]">
                      2. Supplements
                    </h3>
                  </div>
                  <span className="rounded-full bg-[#F3E5D7] px-2.5 py-0.5 text-xs font-bold text-[#8A4B32]">
                    {supplementsTakenCount}/{trackerLog.supplements.length} Done
                  </span>
                </div>

                <div className="mt-3 space-y-2 max-h-72 overflow-y-auto pr-1">
                  {trackerLog.supplements.map((supp) => (
                    <button
                      key={supp.id}
                      type="button"
                      onClick={() => toggleSupplement(supp.id)}
                      className={`flex w-full items-start gap-2.5 rounded-xl border p-3 text-left transition-all ${
                        supp.taken
                          ? "border-[#B9D0BC] bg-[#F1F7F1]"
                          : "border-[#E6DEC8] bg-white hover:bg-[#FDFBF7]"
                      }`}
                    >
                      {supp.taken ? (
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#4D7C55]" />
                      ) : (
                        <Circle className="mt-0.5 h-4 w-4 shrink-0 text-[#9A948A]" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p
                          className={`text-xs font-bold ${
                            supp.taken ? "text-[#1E3528]" : "text-[#232D26]"
                          }`}
                        >
                          {supp.name}
                        </p>
                        <p className="text-[11px] font-semibold text-[#B86B4B]">
                          {supp.dosageAndTiming}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>

                {/* Add Custom Supplement Form */}
                <form
                  onSubmit={handleAddSupplement}
                  className="mt-3 space-y-2 border-t border-[#E6DEC8] pt-3"
                >
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newSuppName}
                      onChange={(e) => setNewSuppName(e.target.value)}
                      placeholder="Add supplement..."
                      className="min-w-0 flex-1 rounded-xl border border-[#D8D0C2] bg-white px-3 py-1.5 text-xs text-[#232D26] focus:border-[#708C74] focus:outline-none"
                    />
                    <input
                      type="text"
                      value={newSuppTiming}
                      onChange={(e) => setNewSuppTiming(e.target.value)}
                      placeholder="Timing"
                      className="w-28 rounded-xl border border-[#D8D0C2] bg-white px-2.5 py-1.5 text-xs text-[#232D26] focus:border-[#708C74] focus:outline-none"
                    />
                    <button
                      type="submit"
                      className="rounded-xl bg-[#68846C] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#57725B]"
                    >
                      Add
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* 3. FIBER TRACKER */}
            {(subTab === "all" || subTab === "fiber") && (
              <div
                className={`rounded-2xl border border-[#DFD8CA] bg-[#FAF7F2] p-5 ${
                  subTab === "fiber" ? "lg:col-span-3" : ""
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Wheat className="h-5 w-5 text-[#436B49]" />
                    <h3 className="font-serif text-lg font-bold text-[#1E2E23]">
                      3. Fiber Intake
                    </h3>
                  </div>
                  <span className="rounded-full bg-[#DFECE0] px-2.5 py-0.5 text-xs font-bold text-[#254D2B]">
                    {mealFiberBreakdown.totalFiberG}g /{" "}
                    {mealFiberBreakdown.goalFiberG}g
                  </span>
                </div>

                {/* Fiber Progress Bar */}
                <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-[#E2E8E2]">
                  <div
                    className="h-full rounded-full bg-[#527957] transition-all duration-300"
                    style={{ width: `${fiberPct}%` }}
                  />
                </div>

                <p className="mt-2.5 text-xs text-[#4E5550]">
                  <strong>{dayName}&apos;s Planned Meals</strong> provide{" "}
                  <strong className="text-[#1E3528]">
                    {mealFiberBreakdown.mealTotal}g
                  </strong>{" "}
                  of fiber ({brunchPlate.fiber}, {brunchPlate.carb},{" "}
                  {dinnerPlate.fiber}, {dinnerPlate.carb}).
                </p>

                {/* Interactive Prebiotic Fiber Boosters */}
                <div className="mt-3 space-y-2">
                  {trackerLog.fiberBoosts.map((boost) => (
                    <div
                      key={boost.id}
                      className="flex items-center justify-between gap-2 rounded-xl border border-[#E6DEC8] bg-white p-2.5"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-bold text-[#1E2E23]">
                          {boost.name}{" "}
                          <span className="text-[#4D7C55]">
                            (+{boost.grams}g)
                          </span>
                        </p>
                        <p className="truncate text-[10.5px] text-[#6B665E]">
                          {boost.benefit}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => adjustFiberBoost(boost.id, -1)}
                          className="flex h-6 w-6 items-center justify-center rounded-full border border-[#D8D0C2] text-xs font-bold text-[#4A4A45] hover:bg-[#F3EFE6]"
                        >
                          -
                        </button>
                        <span className="w-5 text-center text-xs font-bold text-[#1E3528]">
                          {boost.loggedCount}
                        </span>
                        <button
                          type="button"
                          onClick={() => adjustFiberBoost(boost.id, 1)}
                          className="flex h-6 w-6 items-center justify-center rounded-full bg-[#68846C] text-xs font-bold text-white hover:bg-[#57725B]"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* =====================================================================
          INSPIRING THALIS SECTION (CLEAN IMAGES + 1 SIMPLE LINE OF HEALING TEXT)
         ===================================================================== */}
      {(subTab === "all" || subTab === "inspiration") && (
        <div className="rounded-[26px] border border-[#E2DACB] bg-white p-6 shadow-[0_8px_28px_rgba(0,0,0,0.04)] sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#EFEAE0] pb-5">
            <div>
              <h2 className="font-serif text-2xl font-normal text-[#1F2721] sm:text-3xl">
                Inspiring Healing Thalis
              </h2>
              <p className="mt-1 text-xs text-[#6B675E]">
                Curated 4-part ketogenic Thali combinations with Gemini AI
                imagery and simple healing benefits.
              </p>
            </div>

            <button
              type="button"
              disabled={generatingThali}
              onClick={handleGenerateInspiringThali}
              className="inline-flex items-center gap-2 rounded-full bg-[#68846C] px-5 py-2.5 text-xs font-bold text-white shadow-sm transition-all hover:bg-[#57725B] disabled:opacity-60"
            >
              <Shuffle className="h-4 w-4" />
              {generatingThali
                ? "Generating New Thali with Gemini..."
                : "Generate New Inspiring Thali"}
            </button>
          </div>

          {/* Inspiring Thali Cards Grid */}
          {loadingThalis ? (
            <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
              {[1, 2, 3].map((n) => (
                <div
                  key={n}
                  className="h-80 animate-pulse rounded-2xl bg-[#F3EFE6]"
                />
              ))}
            </div>
          ) : (
            <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
              {inspiringThalis.slice(0, 6).map((thali) => {
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
                    className="flex flex-col justify-between overflow-hidden rounded-[22px] border border-[#E4DAC8] bg-[#FAF7F2]/50 shadow-sm transition-all hover:shadow-md"
                  >
                    <div>
                      {/* Thali Image + Macros Overlay */}
                      <div className="relative h-52 w-full overflow-hidden bg-[#2E2620]">
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
                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent p-3.5">
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

                      <div className="p-5">
                        <h3 className="font-serif text-xl font-bold text-[#1F2721]">
                          {thali.title}
                        </h3>

                        {/* 4 Clickable Dish Pills */}
                        <div className="mt-2.5 flex flex-wrap gap-1.5">
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
                                className="rounded-full border border-[#DCE5DC] bg-white px-2.5 py-0.5 text-[11px] font-semibold text-[#2B4C32] hover:bg-[#E3EFE4] hover:underline"
                              >
                                {dish}
                              </Link>
                            );
                          })}
                        </div>

                        {/* Single Simple Line of Healing Text */}
                        <p className="mt-3.5 text-xs leading-relaxed text-[#3A433C]">
                          {thali.healingLine}
                        </p>
                      </div>
                    </div>

                    {/* Action Footer: Apply to Today's Brunch or Dinner */}
                    <div className="flex items-center gap-2 border-t border-[#EFEAE0] bg-white px-5 py-3">
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
                        className="flex flex-1 items-center justify-center gap-1.5 rounded-full border border-[#708C74] bg-white py-1.5 text-xs font-semibold text-[#2B4C32] transition-colors hover:bg-[#68846C] hover:text-white"
                      >
                        <Utensils className="h-3 w-3" />
                        Set as {dayName} Brunch
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
                        className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-[#68846C] py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[#57725B]"
                      >
                        <Utensils className="h-3 w-3" />
                        Set as {dayName} Dinner
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
