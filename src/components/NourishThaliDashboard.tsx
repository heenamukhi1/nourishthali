"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Heart,
  Pencil,
  Camera,
  CalendarDays,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  Droplets,
  Pill,
  Wheat,
  Utensils,
} from "lucide-react";
import {
  RecipeAndShoppingSplitView,
  type PlannedDishEntry,
} from "@/components/RecipeAndShoppingSplitView";
import { EditPlateModal } from "@/components/EditPlateModal";
import {
  DailyTrackerAndInspiration,
  type TrackerSubTab,
} from "@/components/DailyTrackerAndInspiration";
import {
  DEFAULT_WEEKLY_PLAN,
  TODAY_DAY_INDEX,
  fetchSharedWeeklyPlanFromSupabase,
  findRecipeForDishLabel,
  loadWeeklyPlanFromStorage,
  saveWeeklyPlanToStorage,
  type DayPlanRecord,
  type PlateFormulaSelection,
} from "@/data/weekly-plan-store";
import type { NourishThaliSeedData } from "@/types/nourishthali";
import type { SupabaseRecipeRecord } from "@/types/recipes";

interface NourishThaliDashboardProps {
  initialData: NourishThaliSeedData;
  allRecipes?: SupabaseRecipeRecord[];
}

export function NourishThaliDashboard({
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  initialData,
  allRecipes = [],
}: NourishThaliDashboardProps) {
  const [weeklyPlan, setWeeklyPlan] =
    useState<DayPlanRecord[]>(DEFAULT_WEEKLY_PLAN);
  const [activeDayIndex, setActiveDayIndex] =
    useState<number>(TODAY_DAY_INDEX); // 1 = Tuesday, Nov 3 (Today)

  // Main page tab mode ("overview" shows Meals + Inspiring Thalis + Tracker + Shopping; "tracker" focuses on Daily Tracker)
  const [mainTab, setMainTab] = useState<"overview" | "tracker">("overview");
  const [trackerSubTab, setTrackerSubTab] = useState<TrackerSubTab>("all");

  // Modal state for "Edit My Plate" (10 rows per column + next 10 on shuffle)
  const [editingSlot, setEditingSlot] = useState<"brunch" | "dinner" | null>(
    null
  );
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    setWeeklyPlan(loadWeeklyPlanFromStorage());
    fetchSharedWeeklyPlanFromSupabase().then((remotePlan) => {
      if (remotePlan) {
        setWeeklyPlan(remotePlan);
      }
    });

    function handleStorageUpdate() {
      setWeeklyPlan(loadWeeklyPlanFromStorage());
    }
    window.addEventListener(
      "nourishthali-weekly-plan-updated",
      handleStorageUpdate
    );
    return () => {
      window.removeEventListener(
        "nourishthali-weekly-plan-updated",
        handleStorageUpdate
      );
    };
  }, []);

  const currentDayPlan: DayPlanRecord =
    weeklyPlan[activeDayIndex] || weeklyPlan[0];
  const nextDayPlan: DayPlanRecord =
    weeklyPlan[(activeDayIndex + 1) % weeklyPlan.length] || weeklyPlan[0];

  const brunchPlate = currentDayPlan.brunch.plate;
  const dinnerPlate = currentDayPlan.dinner.plate;

  // Resolve the 8 recipes that are in the plan for the active day
  const plannedDishesForDay: PlannedDishEntry[] = useMemo(() => {
    const entries: PlannedDishEntry[] = [
      {
        slotLabel: "Brunch • Protein",
        dishLabel: brunchPlate.protein,
        recipe: findRecipeForDishLabel(brunchPlate.protein, allRecipes),
      },
      {
        slotLabel: "Brunch • Sabzi",
        dishLabel: brunchPlate.fiber,
        recipe: findRecipeForDishLabel(brunchPlate.fiber, allRecipes),
      },
      {
        slotLabel: "Brunch • Roti/Base",
        dishLabel: brunchPlate.carb,
        recipe: findRecipeForDishLabel(brunchPlate.carb, allRecipes),
      },
      {
        slotLabel: "Brunch • Chutney",
        dishLabel: brunchPlate.chutney,
        recipe: findRecipeForDishLabel(brunchPlate.chutney, allRecipes),
      },
      {
        slotLabel: "Dinner • Protein",
        dishLabel: dinnerPlate.protein,
        recipe: findRecipeForDishLabel(dinnerPlate.protein, allRecipes),
      },
      {
        slotLabel: "Dinner • Soup/Sabzi",
        dishLabel: dinnerPlate.fiber,
        recipe: findRecipeForDishLabel(dinnerPlate.fiber, allRecipes),
      },
      {
        slotLabel: "Dinner • Wrap/Base",
        dishLabel: dinnerPlate.carb,
        recipe: findRecipeForDishLabel(dinnerPlate.carb, allRecipes),
      },
      {
        slotLabel: "Dinner • Chutney",
        dishLabel: dinnerPlate.chutney,
        recipe: findRecipeForDishLabel(dinnerPlate.chutney, allRecipes),
      },
    ];
    return entries.filter((e) => Boolean(e.recipe));
  }, [brunchPlate, dinnerPlate, allRecipes]);

  // Resolve all recipes across Monday-Sunday for the Full Week Shopping List
  const allWeeklyPlannedRecipes: SupabaseRecipeRecord[] = useMemo(() => {
    const list: SupabaseRecipeRecord[] = [];
    for (const day of weeklyPlan) {
      for (const slot of [day.brunch.plate, day.dinner.plate]) {
        list.push(
          findRecipeForDishLabel(slot.protein, allRecipes),
          findRecipeForDishLabel(slot.fiber, allRecipes),
          findRecipeForDishLabel(slot.carb, allRecipes),
          findRecipeForDishLabel(slot.chutney, allRecipes)
        );
      }
    }
    return list.filter(Boolean);
  }, [weeklyPlan, allRecipes]);

  function handleNextDayMeals() {
    const nextIdx = (activeDayIndex + 1) % weeklyPlan.length;
    const nextDay = weeklyPlan[nextIdx];
    setActiveDayIndex(nextIdx);
    setToastMessage(
      `Now showing ${nextDay.dayName} (${nextDay.dateLabel}) menu: ${nextDay.brunch.title} & ${nextDay.dinner.title}`
    );
  }

  function handlePrevDayMeals() {
    const prevIdx =
      (activeDayIndex - 1 + weeklyPlan.length) % weeklyPlan.length;
    const prevDay = weeklyPlan[prevIdx];
    setActiveDayIndex(prevIdx);
    setToastMessage(
      `Now showing ${prevDay.dayName} (${prevDay.dateLabel}) menu: ${prevDay.brunch.title} & ${prevDay.dinner.title}`
    );
  }

  function toggleFavoriteSlot(slot: "brunch" | "dinner") {
    const updated = weeklyPlan.map((day, idx) => {
      if (idx !== activeDayIndex) return day;
      return {
        ...day,
        [slot]: {
          ...day[slot],
          isFavorite: !day[slot].isFavorite,
        },
      };
    });
    setWeeklyPlan(updated);
    saveWeeklyPlanToStorage(updated);
  }

  function handleApplyPlateEdit(
    updatedPlate: PlateFormulaSelection,
    updatedAiImage: string | null,
    notice?: string
  ) {
    if (!editingSlot) return;
    const updated = weeklyPlan.map((day, idx) => {
      if (idx !== activeDayIndex) return day;
      return {
        ...day,
        [editingSlot]: {
          ...day[editingSlot],
          plate: updatedPlate,
          aiImageUrl: updatedAiImage ?? day[editingSlot].aiImageUrl,
        },
      };
    });
    setWeeklyPlan(updated);
    saveWeeklyPlanToStorage(updated);
    setEditingSlot(null);
    if (notice) setToastMessage(notice);
  }

  function handleApplyInspiringThaliToMeal(
    slot: "brunch" | "dinner",
    plate: PlateFormulaSelection,
    imageUrl: string,
    title: string
  ) {
    const updated = weeklyPlan.map((day, idx) => {
      if (idx !== activeDayIndex) return day;
      return {
        ...day,
        [slot]: {
          ...day[slot],
          title,
          plate,
          aiImageUrl: imageUrl,
        },
      };
    });
    setWeeklyPlan(updated);
    saveWeeklyPlanToStorage(updated);
    setMainTab("overview");
    setToastMessage(
      `Applied "${title}" to ${currentDayPlan.dayName} ${
        slot === "brunch" ? "Brunch" : "Dinner"
      } and synced to Supabase!`
    );
  }

  function openTrackerWithSubTab(sub: TrackerSubTab) {
    setMainTab("tracker");
    setTrackerSubTab(sub);
  }

  return (
    <main className="relative mx-auto max-w-6xl space-y-10 overflow-hidden px-6 pb-16 pt-2">
      {/* =====================================================================
          MOCKUP 1: SAGE GREEN QUOTE BANNER WITH BOTANICAL SPRIG
         ===================================================================== */}
      <section
        id="daily-plan"
        aria-label="Daily Healing Quote"
        className="relative flex items-center justify-center rounded-[18px] bg-[#D6E3DC] px-8 py-6 shadow-[0_2px_10px_rgba(0,0,0,0.03)]"
      >
        <p className="max-w-4xl text-center font-serif text-[19px] italic leading-relaxed text-[#1D2B22] sm:text-[22px]">
          &ldquo;Let food be your medicine, and let every meal nourish your
          body&rsquo;s natural terrain.&rdquo;
        </p>

        {/* Botanical Leaf Sprig Illustration on Right */}
        <svg
          width="54"
          height="46"
          viewBox="0 0 54 46"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
          className="ml-3 hidden shrink-0 opacity-85 md:block"
        >
          <path
            d="M8 38C18 30 28 20 40 8"
            stroke="#8BA493"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
          <ellipse
            cx="16"
            cy="27"
            rx="6"
            ry="2.6"
            transform="rotate(-40 16 27)"
            fill="#8BA493"
          />
          <ellipse
            cx="24"
            cy="19"
            rx="6"
            ry="2.6"
            transform="rotate(-40 24 19)"
            fill="#8BA493"
          />
          <ellipse
            cx="32"
            cy="11"
            rx="5.5"
            ry="2.4"
            transform="rotate(-40 32 11)"
            fill="#8BA493"
          />
          <ellipse
            cx="23"
            cy="31"
            rx="6"
            ry="2.6"
            transform="rotate(-10 23 31)"
            fill="#8BA493"
          />
          <ellipse
            cx="31"
            cy="23"
            rx="6"
            ry="2.6"
            transform="rotate(-10 31 23)"
            fill="#8BA493"
          />
          <ellipse
            cx="39"
            cy="15"
            rx="5.5"
            ry="2.4"
            transform="rotate(-10 39 15)"
            fill="#8BA493"
          />
        </svg>
      </section>

      {/* Toast Notification */}
      {toastMessage && (
        <div
          role="status"
          className="flex items-center justify-between rounded-xl border border-[#708C74]/30 bg-[#E4EFE8] px-5 py-3 text-sm font-medium text-[#1E3528]"
        >
          <span>{toastMessage}</span>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="ml-4 text-xs font-semibold underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* =====================================================================
          TODAY'S MEALS (WITH DAY-OF-WEEK SWITCHER & "NEXT" DAY MENU BUTTON)
         ===================================================================== */}
      {mainTab === "overview" && (
        <section aria-labelledby="todays-meals-heading" className="relative">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h1
                  id="todays-meals-heading"
                  className="text-[25px] font-bold tracking-tight text-[#222923]"
                >
                  {activeDayIndex === TODAY_DAY_INDEX
                    ? "Today’s Meals"
                    : `${currentDayPlan.dayName}’s Meals`}
                </h1>
                <span className="rounded-full bg-[#E4EFE7] px-3.5 py-1 text-xs font-bold text-[#1E472D]">
                  {currentDayPlan.dayName}, {currentDayPlan.dateLabel}
                  {activeDayIndex === TODAY_DAY_INDEX ? " (Today)" : ""}
                </span>
              </div>
              <p className="mt-1 text-xs text-[#6B675E]">
                Click <strong>Next</strong> on the right (or any day pill) to
                see what&rsquo;s on the menu for the next day.
              </p>
            </div>

            {/* Day-of-Week Quick Pills + Link to Full Weekly Plan Tab */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1 rounded-full border border-[#DFD8C8] bg-white p-1 shadow-sm">
                {weeklyPlan.map((day, idx) => {
                  const isSelected = idx === activeDayIndex;
                  return (
                    <button
                      key={day.dayShort}
                      type="button"
                      onClick={() => setActiveDayIndex(idx)}
                      className={`rounded-full px-3 py-1 text-xs font-semibold transition-all ${
                        isSelected
                          ? "bg-[#708C74] text-white shadow-sm"
                          : "text-[#4E5550] hover:bg-[#F3EFE6]"
                      }`}
                    >
                      {day.dayShort}
                    </button>
                  );
                })}
              </div>

              <Link
                href="/weekly-plan"
                className="inline-flex items-center gap-1.5 rounded-full border border-[#C6D4C8] bg-[#EFF5F0] px-3.5 py-1.5 text-xs font-bold text-[#1E472D] transition-colors hover:bg-[#E0ECE2]"
              >
                <CalendarDays className="h-3.5 w-3.5" />
                <span>Weekly Plan</span>
              </Link>
            </div>
          </div>

          <div className="relative grid grid-cols-1 gap-8 md:grid-cols-2 lg:pr-24">
            {/* -----------------------------------------------------------------
                CARD 1: BRUNCH (10:30 AM)
               ----------------------------------------------------------------- */}
            <div className="rounded-[24px] border border-[#EDE8DF] bg-white p-6 shadow-[0_8px_28px_rgba(0,0,0,0.06)]">
              <div className="mb-3.5 flex items-center justify-between">
                <span className="text-[13px] font-semibold uppercase tracking-[0.06em] text-[#B86B4B]">
                  BRUNCH &bull; {currentDayPlan.dayShort.toUpperCase()}
                </span>
                <span className="text-[14px] font-medium text-[#7C7A73]">
                  {currentDayPlan.brunch.time}
                </span>
              </div>

              {/* Brunch Plate Photo (or Gemini AI Generated Plate Image) */}
              <div
                className="relative w-full overflow-hidden rounded-[14px] bg-[#3B2E25]"
                style={{ aspectRatio: "335 / 180" }}
              >
                {currentDayPlan.brunch.aiImageUrl ? (
                  <img
                    src={currentDayPlan.brunch.aiImageUrl}
                    alt={currentDayPlan.brunch.title}
                    className="h-full w-full object-cover"
                  />
                ) : activeDayIndex === TODAY_DAY_INDEX ? (
                  <img
                    src="/images/mockup-meals.jpg"
                    alt="Aromatic Brunch Plate"
                    style={{
                      position: "absolute",
                      maxWidth: "none",
                      width: `${(1024 / 335) * 100}%`,
                      height: `${(571 / 180) * 100}%`,
                      left: `-${(143 / 335) * 100}%`,
                      top: `-${(245 / 180) * 100}%`,
                    }}
                  />
                ) : (
                  <img
                    src={
                      findRecipeForDishLabel(brunchPlate.protein, allRecipes)
                        ?.image_url || "/images/mockup-meals.jpg"
                    }
                    alt={currentDayPlan.brunch.title}
                    className="h-full w-full object-cover"
                  />
                )}
              </div>

              <h2 className="mt-5 text-center font-serif text-[23px] font-bold text-[#1F2721]">
                {currentDayPlan.brunch.title}
              </h2>

              {/* Clickable Recipe Pills for the 4 Plate Components */}
              <div className="mt-2.5 flex flex-wrap items-center justify-center gap-1.5 text-center text-[13px] text-[#3A413B]">
                {[
                  brunchPlate.protein,
                  brunchPlate.fiber,
                  brunchPlate.carb,
                  brunchPlate.chutney,
                ].map((dishLabel, idx) => {
                  const matchedRecipe = findRecipeForDishLabel(
                    dishLabel,
                    allRecipes
                  );
                  return (
                    <React.Fragment key={idx}>
                      {idx > 0 && <span className="text-[#B5AA96]">&bull;</span>}
                      <Link
                        href={`/recipes/${matchedRecipe.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded px-1.5 py-0.5 font-medium transition-colors hover:bg-[#EFF5F0] hover:text-[#1E472D] hover:underline"
                        title={`View recipe: ${matchedRecipe.title}`}
                      >
                        {dishLabel}
                      </Link>
                    </React.Fragment>
                  );
                })}
              </div>

              {/* Bottom Buttons: Heart Circle + Edit Plate + Upload Photo */}
              <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => toggleFavoriteSlot("brunch")}
                  aria-label="Favorite Brunch Plate"
                  aria-pressed={Boolean(currentDayPlan.brunch.isFavorite)}
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-[#D4CFC4] bg-white text-[#4A4A45] transition-colors hover:border-[#B86B4B]"
                >
                  <Heart
                    className={`h-[18px] w-[18px] ${
                      currentDayPlan.brunch.isFavorite
                        ? "fill-[#E03131] text-[#E03131]"
                        : "text-[#4A4A45]"
                    }`}
                  />
                </button>

                <button
                  type="button"
                  onClick={() => setEditingSlot("brunch")}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-[#9DB09E] px-6 text-[14px] font-medium text-white shadow-sm transition-colors hover:bg-[#899E8A]"
                >
                  <Pencil className="h-4 w-4" />
                  <span>Edit Plate</span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setToastMessage(
                      "Ready to upload homemade Brunch photo to Supabase bucket 'user-plate-uploads'."
                    )
                  }
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-[#BC6C4C] px-6 text-[14px] font-medium text-white shadow-sm transition-colors hover:bg-[#A65B3C]"
                >
                  <Camera className="h-4 w-4" />
                  <span>Upload Photo</span>
                </button>
              </div>
            </div>

            {/* -----------------------------------------------------------------
                CARD 2: DINNER (6:00 PM)
               ----------------------------------------------------------------- */}
            <div className="rounded-[24px] border border-[#EDE8DF] bg-white p-6 shadow-[0_8px_28px_rgba(0,0,0,0.06)]">
              <div className="mb-3.5 flex items-center justify-between">
                <span className="text-[13px] font-semibold uppercase tracking-[0.06em] text-[#B86B4B]">
                  DINNER &bull; {currentDayPlan.dayShort.toUpperCase()}
                </span>
                <span className="text-[14px] font-medium text-[#7C7A73]">
                  {currentDayPlan.dinner.time}
                </span>
              </div>

              {/* Dinner Plate Photo (or Gemini AI Generated Plate Image) */}
              <div
                className="relative w-full overflow-hidden rounded-[14px] bg-[#3B2E25]"
                style={{ aspectRatio: "335 / 180" }}
              >
                {currentDayPlan.dinner.aiImageUrl ? (
                  <img
                    src={currentDayPlan.dinner.aiImageUrl}
                    alt={currentDayPlan.dinner.title}
                    className="h-full w-full object-cover"
                  />
                ) : activeDayIndex === TODAY_DAY_INDEX ? (
                  <img
                    src="/images/mockup-meals.jpg"
                    alt="Comfort Dinner Plate"
                    style={{
                      position: "absolute",
                      maxWidth: "none",
                      width: `${(1024 / 335) * 100}%`,
                      height: `${(571 / 180) * 100}%`,
                      left: `-${(549 / 335) * 100}%`,
                      top: `-${(245 / 180) * 100}%`,
                    }}
                  />
                ) : (
                  <img
                    src={
                      findRecipeForDishLabel(dinnerPlate.protein, allRecipes)
                        ?.image_url || "/images/mockup-meals.jpg"
                    }
                    alt={currentDayPlan.dinner.title}
                    className="h-full w-full object-cover"
                  />
                )}
              </div>

              <h2 className="mt-5 text-center font-serif text-[23px] font-bold text-[#1F2721]">
                {currentDayPlan.dinner.title}
              </h2>

              {/* Clickable Recipe Pills for the 4 Plate Components */}
              <div className="mt-2.5 flex flex-wrap items-center justify-center gap-1.5 text-center text-[13px] text-[#3A413B]">
                {[
                  dinnerPlate.protein,
                  dinnerPlate.fiber,
                  dinnerPlate.carb,
                  dinnerPlate.chutney,
                ].map((dishLabel, idx) => {
                  const matchedRecipe = findRecipeForDishLabel(
                    dishLabel,
                    allRecipes
                  );
                  return (
                    <React.Fragment key={idx}>
                      {idx > 0 && <span className="text-[#B5AA96]">&bull;</span>}
                      <Link
                        href={`/recipes/${matchedRecipe.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded px-1.5 py-0.5 font-medium transition-colors hover:bg-[#EFF5F0] hover:text-[#1E472D] hover:underline"
                        title={`View recipe: ${matchedRecipe.title}`}
                      >
                        {dishLabel}
                      </Link>
                    </React.Fragment>
                  );
                })}
              </div>

              {/* Bottom Buttons: Heart Circle + Edit Plate + Upload Photo */}
              <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => toggleFavoriteSlot("dinner")}
                  aria-label="Favorite Dinner Plate"
                  aria-pressed={Boolean(currentDayPlan.dinner.isFavorite)}
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-[#D4CFC4] bg-white text-[#4A4A45] transition-colors hover:border-[#B86B4B]"
                >
                  <Heart
                    className={`h-[18px] w-[18px] ${
                      currentDayPlan.dinner.isFavorite
                        ? "fill-[#E03131] text-[#E03131]"
                        : "text-[#4A4A45]"
                    }`}
                  />
                </button>

                <button
                  type="button"
                  onClick={() => setEditingSlot("dinner")}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-[#9DB09E] px-6 text-[14px] font-medium text-white shadow-sm transition-colors hover:bg-[#899E8A]"
                >
                  <Pencil className="h-4 w-4" />
                  <span>Edit Plate</span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setToastMessage(
                      "Ready to upload homemade Dinner photo to Supabase bucket 'user-plate-uploads'."
                    )
                  }
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-[#BC6C4C] px-6 text-[14px] font-medium text-white shadow-sm transition-colors hover:bg-[#A65B3C]"
                >
                  <Camera className="h-4 w-4" />
                  <span>Upload Photo</span>
                </button>
              </div>
            </div>

            {/* Floating "Next" Pill Button on the Right — Shows Next Day's Menu */}
            <div className="flex items-center justify-center gap-2 lg:absolute lg:right-0 lg:top-1/2 lg:-translate-y-1/2 lg:flex-col">
              <button
                type="button"
                onClick={handleNextDayMeals}
                title={`See ${nextDayPlan.dayName}'s Menu`}
                className="inline-flex items-center gap-1 rounded-full border border-[#C6C2B8] bg-[#F5F2EA] px-5 py-2.5 text-[14px] font-semibold text-[#222923] shadow-sm transition-all hover:border-[#708C74] hover:bg-white"
              >
                <span>Next</span>
                <ChevronRight className="h-4 w-4 text-[#708C74]" />
              </button>
              <span className="text-[11px] font-medium text-[#6E6A63]">
                {nextDayPlan.dayShort} ({nextDayPlan.dateLabel})
              </span>
              <button
                type="button"
                onClick={handlePrevDayMeals}
                className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-[#708C74] hover:underline"
              >
                <ChevronLeft className="h-3 w-3" />
                <span>Prev Day</span>
              </button>
            </div>
          </div>
        </section>
      )}

      {/* =====================================================================
          DAILY TRACKER (WATER, SUPPLEMENTS, FIBER) & INSPIRING HEALING THALIS
         ===================================================================== */}
      <DailyTrackerAndInspiration
        dayName={currentDayPlan.dayName}
        dateLabel={currentDayPlan.dateLabel}
        brunchPlate={brunchPlate}
        dinnerPlate={dinnerPlate}
        allRecipes={allRecipes}
        activeSubTab={trackerSubTab}
        onSelectSubTab={(sub) => setTrackerSubTab(sub)}
        onApplyInspiringThaliToMeal={handleApplyInspiringThaliToMeal}
      />

      {/* =====================================================================
          RECIPES IN PLAN FOR THE SELECTED DAY & WEEKLY SHOPPING LIST
         ===================================================================== */}
      {mainTab === "overview" && (
        <RecipeAndShoppingSplitView
          dayName={currentDayPlan.dayName}
          dateLabel={currentDayPlan.dateLabel}
          plannedDishes={plannedDishesForDay}
          allWeeklyRecipes={allWeeklyPlannedRecipes}
        />
      )}

      {/* =====================================================================
          10-ROW "EDIT MY PLATE" 4-COLUMN MODAL OVERLAY
         ===================================================================== */}
      <EditPlateModal
        isOpen={Boolean(editingSlot)}
        dayName={currentDayPlan.dayName}
        slot={editingSlot || "brunch"}
        initialPlate={editingSlot === "dinner" ? dinnerPlate : brunchPlate}
        initialAiImage={
          editingSlot === "dinner"
            ? currentDayPlan.dinner.aiImageUrl
            : currentDayPlan.brunch.aiImageUrl
        }
        allRecipes={allRecipes}
        onClose={() => setEditingSlot(null)}
        onApply={handleApplyPlateEdit}
      />
    </main>
  );
}
