"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Pencil,
  RotateCcw,
  ArrowLeft,
  ArrowRight,
  Clock,
  CheckCircle2,
  Utensils,
} from "lucide-react";
import { EditPlateModal } from "@/components/EditPlateModal";
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
import type { SupabaseRecipeRecord } from "@/types/recipes";

interface WeeklyPlanClientProps {
  allRecipes: SupabaseRecipeRecord[];
}

const WEEK_LABELS = [
  "November 2–8",
  "November 9–15",
  "November 16–22",
  "November 23–29",
];

export function WeeklyPlanClient({ allRecipes }: WeeklyPlanClientProps) {
  const [weeklyPlan, setWeeklyPlan] =
    useState<DayPlanRecord[]>(DEFAULT_WEEKLY_PLAN);
  const [weekOffset, setWeekOffset] = useState<number>(0);

  // Editing modal state: which day (0..6) and which meal slot ("brunch" | "dinner")
  const [editingTarget, setEditingTarget] = useState<{
    dayIndex: number;
    slot: "brunch" | "dinner";
  } | null>(null);

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    setWeeklyPlan(loadWeeklyPlanFromStorage());
    fetchSharedWeeklyPlanFromSupabase().then((remotePlan) => {
      if (remotePlan) {
        setWeeklyPlan(remotePlan);
      }
    });
  }, []);

  function handleApplyEdit(
    updatedPlate: PlateFormulaSelection,
    updatedAiImage: string | null,
    notice?: string
  ) {
    if (!editingTarget) return;
    const { dayIndex, slot } = editingTarget;

    const updated = weeklyPlan.map((day, idx) => {
      if (idx !== dayIndex) return day;
      return {
        ...day,
        [slot]: {
          ...day[slot],
          plate: updatedPlate,
          aiImageUrl: updatedAiImage ?? day[slot].aiImageUrl,
        },
      };
    });

    setWeeklyPlan(updated);
    saveWeeklyPlanToStorage(updated);
    setEditingTarget(null);
    if (notice) setToastMessage(notice);
  }

  function handleResetDefaultWeek() {
    setWeeklyPlan(DEFAULT_WEEKLY_PLAN);
    saveWeeklyPlanToStorage(DEFAULT_WEEKLY_PLAN);
    setToastMessage("Reset Monday–Sunday meals to the default Everhope keto week.");
  }

  const activeEditingDay =
    editingTarget !== null ? weeklyPlan[editingTarget.dayIndex] : null;
  const activeEditingMeal =
    activeEditingDay && editingTarget
      ? activeEditingDay[editingTarget.slot]
      : null;

  const currentWeekRange =
    WEEK_LABELS[
      ((weekOffset % WEEK_LABELS.length) + WEEK_LABELS.length) %
        WEEK_LABELS.length
    ];

  return (
    <div className="min-h-screen bg-[#F5F2EB] text-[#1F2721]">
      <div className="mx-auto max-w-[1380px] space-y-7 px-6 pb-20 pt-4">
        {/* ===================================================================
            TOP "OUR WEEK" HEADER BAR (MATCHING UPLOADED MOCKUP)
           =================================================================== */}
        <section className="flex flex-wrap items-center justify-between gap-4 rounded-[20px] border border-[#E5DFD3] bg-white px-7 py-5 shadow-sm">
          <div>
            <h1 className="font-serif text-[28px] font-normal tracking-tight text-[#1E2A22]">
              Our Week
            </h1>
            <p className="text-xs font-medium text-[#6E6A62]">
              {currentWeekRange} &bull; Vijay Mukhi&rsquo;s 7-Day Keto Thali
              Schedule
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={handleResetDefaultWeek}
              className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-[#DFD8CA] bg-[#FAF7F2] px-3.5 text-xs font-semibold text-[#4E544F] transition-colors hover:bg-[#EFEAE0]"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Reset Week</span>
            </button>

            <button
              type="button"
              onClick={() => setWeekOffset((w) => w - 1)}
              className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-[#DFD8CA] bg-white px-4 text-xs font-semibold text-[#222923] shadow-sm transition-colors hover:bg-[#FAF7F2]"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Prev</span>
            </button>

            <button
              type="button"
              onClick={() => setWeekOffset((w) => w + 1)}
              className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-[#DFD8CA] bg-white px-4 text-xs font-semibold text-[#222923] shadow-sm transition-colors hover:bg-[#FAF7F2]"
            >
              <span>Next</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </section>

        {/* ===================================================================
            CENTER HERO BANNER ("YOUR WEEK STARTS HERE")
           =================================================================== */}
        <section className="rounded-[24px] border border-[#E5DFD3] bg-[#EAE6DD]/65 p-4 sm:p-6">
          <div className="rounded-[20px] border border-[#E6E0D4] bg-[#FBF9F5] px-6 py-9 text-center shadow-sm">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#1E472D]">
              YOUR WEEK STARTS HERE
            </p>
            <h2 className="mt-2 font-serif text-3xl font-normal tracking-tight text-[#1A211C] sm:text-[42px]">
              What&rsquo;s on the Thali this week?
            </h2>
            <p className="mx-auto mt-2.5 max-w-xl text-sm text-[#6B675E]">
              Every day pairs a 10:30 AM Brunch Plate and a 6:00 PM Comfort
              Dinner Plate. Click <strong>Edit Meal</strong> on any card below to
              customize from 10+ keto recipes per column.
            </p>

            {/* Quick Filter / Category Pills */}
            <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
              {[
                { label: "Tofu & Paneer", href: "/recipes?category=curry_sabzi" },
                {
                  label: "Chillas & Poha",
                  href: "/recipes?category=breakfast_chilla",
                },
                { label: "Healing Soups", href: "/recipes?category=soup" },
                { label: "Keto Rotis & Wraps", href: "/recipes?category=bread_wrap" },
                {
                  label: "12 Chutneys",
                  href: "/recipes?category=chutney_dip",
                },
                {
                  label: "Mid-Meal Chakna",
                  href: "/recipes?category=chakna_snack",
                },
              ].map((pill) => (
                <Link
                  key={pill.label}
                  href={pill.href}
                  className="rounded-full border border-[#DCD5C7] bg-white px-4 py-1.5 text-xs font-semibold text-[#2A312C] shadow-sm transition-colors hover:border-[#708C74] hover:bg-[#F3F7F4]"
                >
                  {pill.label}
                </Link>
              ))}
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/recipes"
                className="inline-flex h-10 items-center justify-center rounded-xl bg-[#163022] px-5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-[#234733]"
              >
                Browse All {allRecipes.length} Keto Recipes
              </Link>
              <Link
                href="/"
                className="inline-flex h-10 items-center justify-center rounded-xl border border-[#D8D0C2] bg-white px-5 text-xs font-semibold text-[#1E2A22] shadow-sm transition-colors hover:bg-[#F5F0E6]"
              >
                Open Today&rsquo;s Daily View
              </Link>
            </div>

            <div className="mt-6 border-t border-[#ECE6DA] pt-4 text-xs text-[#7A756C]">
              Edit any Brunch or Dinner below and NourishThali keeps your Daily
              Plan and Weekly Shopping List in sync.
            </div>
          </div>
        </section>

        {/* Toast Notification */}
        {toastMessage && (
          <div
            role="status"
            className="flex items-center justify-between rounded-xl border border-[#708C74]/30 bg-[#E4EFE8] px-5 py-3 text-sm font-medium text-[#1E3528]"
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-[#2E7D47]" />
              <span>{toastMessage}</span>
            </div>
            <button
              type="button"
              onClick={() => setToastMessage(null)}
              className="ml-4 text-xs font-semibold underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* ===================================================================
            "THIS WEEK" MONDAY–SUNDAY 7-CARD GRID (2 MEALS PER CARD + EDIT)
           =================================================================== */}
        <section aria-labelledby="this-week-heading">
          <div className="mb-4 flex items-center justify-between">
            <h2
              id="this-week-heading"
              className="text-xs font-bold uppercase tracking-[0.14em] text-[#5C625D]"
            >
              THIS WEEK (MONDAY – SUNDAY • 2 MEALS PER DAY)
            </h2>
            <span className="text-xs font-medium text-[#6E6A63]">
              Click any dish name to open its full recipe, or click{" "}
              <strong>Edit Meal</strong> to customize
            </span>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
            {weeklyPlan.map((day) => {
              const brunchMainRecipe = findRecipeForDishLabel(
                day.brunch.plate.protein,
                allRecipes
              );
              const dinnerMainRecipe = findRecipeForDishLabel(
                day.dinner.plate.protein,
                allRecipes
              );

              const isToday = day.dayIndex === TODAY_DAY_INDEX;

              return (
                <div
                  key={day.dayShort}
                  className={`flex flex-col justify-between rounded-[18px] border p-3.5 shadow-sm transition-shadow hover:shadow-md ${
                    isToday
                      ? "border-[#708C74] bg-[#F4F9F5] ring-1 ring-[#708C74]/40"
                      : "border-[#E4DDD0] bg-[#FBF9F5]"
                  }`}
                >
                  {/* Day Card Header: Mon • Nov 2 */}
                  <div>
                    <div className="flex items-baseline justify-between border-b border-[#EAE3D5] pb-2.5">
                      <div>
                        <span className="text-sm font-bold text-[#1E2A22]">
                          {day.dayShort}
                        </span>
                        <span className="mx-1 text-[#B5AA96]">&bull;</span>
                        <span className="text-xs font-semibold text-[#7A756C]">
                          {day.dateLabel}
                        </span>
                      </div>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          isToday
                            ? "bg-[#1E472D] text-white"
                            : "bg-[#E6EFE8] text-[#234C32]"
                        }`}
                      >
                        {isToday ? "TODAY" : "2 Meals"}
                      </span>
                    </div>

                    {/* -------------------------------------------------------
                        MEAL 1: BRUNCH (10:30 AM)
                       ------------------------------------------------------- */}
                    <div className="mt-3 rounded-xl border border-[#E8E0D2] bg-white p-3 shadow-[0_2px_8px_rgba(0,0,0,0.03)]">
                      <div className="flex items-center justify-between">
                        <span className="text-[10.5px] font-bold uppercase tracking-wider text-[#B86B4B]">
                          Brunch
                        </span>
                        <span className="inline-flex items-center gap-1 text-[10.5px] font-medium text-[#7A756C]">
                          <Clock className="h-2.5 w-2.5" />
                          {day.brunch.time}
                        </span>
                      </div>

                      {/* Thumbnail */}
                      <div className="mt-2 h-24 w-full overflow-hidden rounded-lg bg-[#EFE9DC]">
                        <img
                          src={
                            day.brunch.aiImageUrl ||
                            brunchMainRecipe?.image_url ||
                            "/images/mockup-meals.jpg"
                          }
                          alt={day.brunch.title}
                          className="h-full w-full object-cover"
                        />
                      </div>

                      <h3 className="mt-2 font-serif text-xs font-bold leading-snug text-[#1E2A22]">
                        {day.brunch.title}
                      </h3>

                      {/* 4 Plate Items */}
                      <ul className="mt-2 space-y-1 border-t border-[#F2ECE1] pt-2 text-[11px] leading-tight text-[#3E453F]">
                        {[
                          { role: "Protein", val: day.brunch.plate.protein },
                          { role: "Sabzi", val: day.brunch.plate.fiber },
                          { role: "Base", val: day.brunch.plate.carb },
                          { role: "Chutney", val: day.brunch.plate.chutney },
                        ].map((item) => {
                          const rec = findRecipeForDishLabel(
                            item.val,
                            allRecipes
                          );
                          return (
                            <li
                              key={item.role}
                              className="flex items-start gap-1"
                            >
                              <Utensils className="mt-0.5 h-2.5 w-2.5 shrink-0 text-[#708C74]" />
                              <Link
                                href={`/recipes/${rec.slug}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="line-clamp-1 font-medium hover:text-[#1E472D] hover:underline"
                                title={`${item.role}: ${item.val}`}
                              >
                                {item.val}
                              </Link>
                            </li>
                          );
                        })}
                      </ul>

                      <button
                        type="button"
                        onClick={() =>
                          setEditingTarget({
                            dayIndex: day.dayIndex,
                            slot: "brunch",
                          })
                        }
                        className="mt-2.5 inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-[#9DB09E] py-1.5 text-[11px] font-semibold text-white transition-colors hover:bg-[#839A85]"
                      >
                        <Pencil className="h-3 w-3" />
                        <span>Edit Brunch</span>
                      </button>
                    </div>

                    {/* -------------------------------------------------------
                        MEAL 2: DINNER (6:00 PM)
                       ------------------------------------------------------- */}
                    <div className="mt-3 rounded-xl border border-[#E8E0D2] bg-white p-3 shadow-[0_2px_8px_rgba(0,0,0,0.03)]">
                      <div className="flex items-center justify-between">
                        <span className="text-[10.5px] font-bold uppercase tracking-wider text-[#B86B4B]">
                          Dinner
                        </span>
                        <span className="inline-flex items-center gap-1 text-[10.5px] font-medium text-[#7A756C]">
                          <Clock className="h-2.5 w-2.5" />
                          {day.dinner.time}
                        </span>
                      </div>

                      {/* Thumbnail */}
                      <div className="mt-2 h-24 w-full overflow-hidden rounded-lg bg-[#EFE9DC]">
                        <img
                          src={
                            day.dinner.aiImageUrl ||
                            dinnerMainRecipe?.image_url ||
                            "/images/mockup-meals.jpg"
                          }
                          alt={day.dinner.title}
                          className="h-full w-full object-cover"
                        />
                      </div>

                      <h3 className="mt-2 font-serif text-xs font-bold leading-snug text-[#1E2A22]">
                        {day.dinner.title}
                      </h3>

                      {/* 4 Plate Items */}
                      <ul className="mt-2 space-y-1 border-t border-[#F2ECE1] pt-2 text-[11px] leading-tight text-[#3E453F]">
                        {[
                          { role: "Protein", val: day.dinner.plate.protein },
                          { role: "Soup/Sabzi", val: day.dinner.plate.fiber },
                          { role: "Base", val: day.dinner.plate.carb },
                          { role: "Chutney", val: day.dinner.plate.chutney },
                        ].map((item) => {
                          const rec = findRecipeForDishLabel(
                            item.val,
                            allRecipes
                          );
                          return (
                            <li
                              key={item.role}
                              className="flex items-start gap-1"
                            >
                              <Utensils className="mt-0.5 h-2.5 w-2.5 shrink-0 text-[#B86B4B]" />
                              <Link
                                href={`/recipes/${rec.slug}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="line-clamp-1 font-medium hover:text-[#1E472D] hover:underline"
                                title={`${item.role}: ${item.val}`}
                              >
                                {item.val}
                              </Link>
                            </li>
                          );
                        })}
                      </ul>

                      <button
                        type="button"
                        onClick={() =>
                          setEditingTarget({
                            dayIndex: day.dayIndex,
                            slot: "dinner",
                          })
                        }
                        className="mt-2.5 inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-[#BC6C4C] py-1.5 text-[11px] font-semibold text-white transition-colors hover:bg-[#A4593B]"
                      >
                        <Pencil className="h-3 w-3" />
                        <span>Edit Dinner</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      {/* 10-Row Edit Plate Modal */}
      {editingTarget && activeEditingDay && activeEditingMeal && (
        <EditPlateModal
          isOpen={true}
          dayName={`${activeEditingDay.dayName} (${activeEditingDay.dateLabel})`}
          slot={editingTarget.slot}
          initialPlate={activeEditingMeal.plate}
          initialAiImage={activeEditingMeal.aiImageUrl}
          allRecipes={allRecipes}
          onClose={() => setEditingTarget(null)}
          onApply={handleApplyEdit}
        />
      )}
    </div>
  );
}

