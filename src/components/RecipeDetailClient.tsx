"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Clock,
  Heart,
  Share2,
  Printer,
  Check,
  Sparkles,
  MapPin,
  ExternalLink,
  Copy,
  ChefHat,
} from "lucide-react";
import { getCategoryLabel, type SupabaseRecipeRecord } from "@/types/recipes";

interface RecipeDetailClientProps {
  recipe: SupabaseRecipeRecord;
  relatedRecipes: SupabaseRecipeRecord[];
}

const FALLBACK_RECIPE_IMAGE = "/images/mockup-meals.jpg";

export function RecipeDetailClient({
  recipe,
  relatedRecipes,
}: RecipeDetailClientProps) {
  const [isFavorite, setIsFavorite] = useState<boolean>(false);
  const [checkedIngredients, setCheckedIngredients] = useState<
    Record<number, boolean>
  >({});
  const [completedSteps, setCompletedSteps] = useState<Record<number, boolean>>(
    {}
  );
  const [copiedLink, setCopiedLink] = useState<boolean>(false);

  const totalMins =
    (recipe.prep_time_mins || 10) + (recipe.cook_time_mins || 10);

  function toggleIngredient(idx: number) {
    setCheckedIngredients((prev) => ({
      ...prev,
      [idx]: !prev[idx],
    }));
  }

  function toggleStep(idx: number) {
    setCompletedSteps((prev) => ({
      ...prev,
      [idx]: !prev[idx],
    }));
  }

  function handleShareWhatsApp() {
    const ingredientsText = (recipe.ingredients || [])
      .map(
        (ing) =>
          `• ${ing.qty} ${ing.unit} ${ing.item}${
            ing.hindi_transliteration ? ` (${ing.hindi_transliteration})` : ""
          }`
      )
      .join("\n");

    const stepsText = (recipe.instructions || [])
      .map((step, i) => `${i + 1}. ${step}`)
      .join("\n");

    const shareUrl =
      typeof window !== "undefined" ? window.location.href : "";

    const message = [
      `*${recipe.title}* (${(recipe.diet_type || "Keto").toUpperCase()})`,
      `Prep: ${recipe.prep_time_mins} mins | Cook: ${recipe.cook_time_mins} mins`,
      "",
      "*Ingredients:*",
      ingredientsText,
      "",
      "*Instructions:*",
      stepsText,
      shareUrl ? `\nRecipe Link: ${shareUrl}` : "",
    ].join("\n");

    window.open(
      `https://wa.me/?text=${encodeURIComponent(message)}`,
      "_blank",
      "noopener,noreferrer"
    );
  }

  function handleCopyLink() {
    if (typeof window === "undefined") return;
    navigator.clipboard?.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  }

  return (
    <div className="min-h-screen bg-[#FAF7F2] text-[#2C3531]">
      <div className="mx-auto max-w-5xl px-6 pb-20 pt-4">
        {/* Top Breadcrumb Navigation */}
        <nav
          aria-label="Breadcrumb"
          className="mb-6 flex flex-wrap items-center justify-between gap-3 text-sm text-[#5E5B54]"
        >
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/recipes"
              className="inline-flex items-center gap-1.5 rounded-full border border-[#DFD7C8] bg-white px-3.5 py-1.5 text-xs font-semibold text-[#1E3528] shadow-sm transition-colors hover:bg-[#F3EDE0]"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>All Keto Recipes</span>
            </Link>
            <span className="text-[#B5AA96]">/</span>
            <Link
              href={`/recipes?category=${recipe.category}`}
              className="rounded-full bg-[#E6EFE8] px-3 py-1 text-xs font-semibold text-[#2B5339] hover:bg-[#D7E6DA]"
            >
              {getCategoryLabel(recipe.category)}
            </Link>
          </div>

          {/* Share / Copy / Print Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setIsFavorite((prev) => !prev)}
              className="inline-flex items-center gap-1.5 rounded-full border border-[#DFD7C8] bg-white px-3.5 py-1.5 text-xs font-semibold text-[#2E2E2A] shadow-sm hover:bg-[#F7F3EB]"
            >
              <Heart
                className={`h-3.5 w-3.5 ${
                  isFavorite
                    ? "fill-[#D94E4E] text-[#D94E4E]"
                    : "text-[#6E6A63]"
                }`}
              />
              <span>{isFavorite ? "Saved" : "Heart Favorite"}</span>
            </button>

            <button
              type="button"
              onClick={handleCopyLink}
              className="inline-flex items-center gap-1.5 rounded-full border border-[#DFD7C8] bg-white px-3.5 py-1.5 text-xs font-semibold text-[#2E2E2A] shadow-sm hover:bg-[#F7F3EB]"
            >
              {copiedLink ? (
                <>
                  <Check className="h-3.5 w-3.5 text-[#2E7D47]" />
                  <span>Link Copied</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5 text-[#6E6A63]" />
                  <span>Copy Link</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleShareWhatsApp}
              className="inline-flex items-center gap-1.5 rounded-full bg-[#2E7D47] px-4 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-[#25663A]"
            >
              <Share2 className="h-3.5 w-3.5" />
              <span>Share to WhatsApp</span>
            </button>

            <button
              type="button"
              onClick={() => typeof window !== "undefined" && window.print()}
              className="inline-flex items-center gap-1.5 rounded-full border border-[#DFD7C8] bg-white px-3 py-1.5 text-xs font-semibold text-[#2E2E2A] shadow-sm hover:bg-[#F7F3EB]"
              title="Print Recipe"
            >
              <Printer className="h-3.5 w-3.5 text-[#6E6A63]" />
              <span className="hidden sm:inline">Print</span>
            </button>
          </div>
        </nav>

        {/* Main Recipe Card */}
        <article className="overflow-hidden rounded-[26px] border border-[#E5DEC9] bg-[#FBF9F4] shadow-[0_12px_40px_rgba(0,0,0,0.06)]">
          {/* Top Hero Section: Image + Title & Overview */}
          <div className="grid grid-cols-1 lg:grid-cols-12">
            {/* Left/Top: Gemini-Generated Dish Photo */}
            <div className="relative min-h-[300px] bg-[#EFE9DC] lg:col-span-6">
              <img
                src={recipe.image_url || FALLBACK_RECIPE_IMAGE}
                alt={recipe.title}
                onError={(e) => {
                  const target = e.currentTarget;
                  if (target.src !== FALLBACK_RECIPE_IMAGE) {
                    target.src = FALLBACK_RECIPE_IMAGE;
                  }
                }}
                className="h-full w-full object-cover"
              />
              <div className="absolute bottom-3.5 left-3.5 inline-flex items-center gap-1.5 rounded-full bg-[#1E3528]/90 px-3 py-1 text-[11px] font-semibold text-[#FAF4E8] shadow-sm backdrop-blur-sm">
                <Sparkles className="h-3 w-3 text-[#A5D6B0]" />
                <span>Gemini AI Dish Photography</span>
              </div>
            </div>

            {/* Right: Editorial Recipe Header & Plating Cue */}
            <div className="flex flex-col justify-between p-7 sm:p-9 lg:col-span-6">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-md bg-[#EAE4D7] px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-[#4A463F]">
                    {(recipe.diet_type || "keto").toUpperCase()}
                  </span>
                  <span className="rounded-md bg-[#E1ECE3] px-2.5 py-1 text-xs font-semibold text-[#244A32]">
                    {getCategoryLabel(recipe.category)}
                  </span>
                </div>

                <h1 className="mt-3 font-serif text-2xl font-bold leading-tight text-[#1E3A2B] sm:text-3xl">
                  {recipe.title}
                </h1>

                {/* Prep / Cook / Total Metadata Bar */}
                <div className="mt-4 flex flex-wrap items-center gap-4 border-y border-[#E6DFD1] py-3 text-xs font-semibold text-[#5A564E]">
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-4 w-4 text-[#708C74]" />
                    <span>Prep: {recipe.prep_time_mins} mins</span>
                  </div>
                  <span className="text-[#D0C8B8]">|</span>
                  <div>
                    <span>Cook: {recipe.cook_time_mins} mins</span>
                  </div>
                  <span className="text-[#D0C8B8]">|</span>
                  <div className="text-[#1E3A2B]">
                    <span>Total: {totalMins} mins</span>
                  </div>
                </div>

                {/* Visual Plating Cue */}
                {recipe.visual_plating_cue && (
                  <div className="mt-5 rounded-2xl border border-[#DCE5DD] bg-[#EFF4F0] p-4">
                    <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#355B43]">
                      Visual Plating & Thali Cue
                    </p>
                    <p className="mt-1 text-sm italic leading-relaxed text-[#2C3E32]">
                      &ldquo;{recipe.visual_plating_cue}&rdquo;
                    </p>
                  </div>
                )}

                {/* Tags */}
                {Array.isArray(recipe.tags) && recipe.tags.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {recipe.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full border border-[#E2DACB] bg-white px-2.5 py-0.5 text-[11px] font-medium text-[#5A564E]"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Source Attribution */}
              {recipe.source_name && (
                <div className="mt-6 flex items-center justify-between border-t border-[#EAE3D5] pt-4 text-xs text-[#6E6A63]">
                  <span>
                    Protocol Source:{" "}
                    <strong className="text-[#2C3531]">
                      {recipe.source_name}
                    </strong>
                  </span>
                  {recipe.source_url && (
                    <a
                      href={recipe.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 font-semibold text-[#2E5A3C] hover:underline"
                    >
                      <span>Reference</span>
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Bottom Split: Ingredients Checklist (Left) + Step-by-Step Instructions (Right) */}
          <div className="grid grid-cols-1 border-t border-[#E5DEC9] lg:grid-cols-12">
            {/* Left Column: Ingredients Checklist with Hindi Transliterations & Bikaner Mandi Aisles */}
            <div className="border-b border-[#E5DEC9] p-7 sm:p-9 lg:col-span-5 lg:border-b-0 lg:border-r">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-[#1A1A1A]">
                  Ingredients Checklist
                </h2>
                <span className="rounded-full bg-[#EAE2D3] px-2.5 py-0.5 text-xs font-bold text-[#4E4A42]">
                  {recipe.ingredients?.length || 0} items
                </span>
              </div>
              <p className="mt-1 text-xs text-[#6E6A63]">
                Includes Romanized Hindi names and Bikaner Mandi purchasing
                aisles.
              </p>

              <ul className="mt-5 space-y-3">
                {(recipe.ingredients || []).map((ing, idx) => {
                  const isChecked = Boolean(checkedIngredients[idx]);
                  return (
                    <li
                      key={idx}
                      className={`rounded-xl border p-3 transition-colors ${
                        isChecked
                          ? "border-[#D5E2D8] bg-[#F1F6F2]"
                          : "border-[#EAE2D3] bg-white hover:border-[#C8D6CA]"
                      }`}
                    >
                      <label className="flex cursor-pointer items-start gap-3">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleIngredient(idx)}
                          className="mt-1 h-4 w-4 shrink-0 rounded border-[#8A857A] text-[#2E7D47] focus:ring-[#2E7D47]"
                        />
                        <div className="flex-1 text-sm">
                          <div className="flex flex-wrap items-baseline justify-between gap-1">
                            <span
                              className={`font-semibold ${
                                isChecked
                                  ? "line-through text-[#7A756C]"
                                  : "text-[#1E2E23]"
                              }`}
                            >
                              {ing.item}
                            </span>
                            <span className="rounded bg-[#F4EFE4] px-2 py-0.5 text-xs font-bold text-[#3E4A3E]">
                              {ing.qty} {ing.unit}
                            </span>
                          </div>

                          {/* Transliteration + Staple Pill */}
                          <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[11px]">
                            {ing.hindi_transliteration && (
                              <span className="rounded bg-[#EFF4F0] px-2 py-0.5 font-medium text-[#2E5A3C]">
                                Local Name: {ing.hindi_transliteration}
                              </span>
                            )}
                            {ing.is_staple && (
                              <span className="rounded bg-[#F7E8D8] px-2 py-0.5 font-semibold text-[#9A522B]">
                                Bikaner Kitchen Staple
                              </span>
                            )}
                          </div>

                          {/* Bikaner Mandi Aisle */}
                          {ing.bikaner_mandi_aisle && (
                            <div className="mt-1.5 flex items-center gap-1 text-[11px] text-[#6E6A63]">
                              <MapPin className="h-3 w-3 shrink-0 text-[#B86B4B]" />
                              <span>{ing.bikaner_mandi_aisle}</span>
                            </div>
                          )}
                        </div>
                      </label>
                    </li>
                  );
                })}
              </ul>
            </div>

            {/* Right Column: Step-by-Step Instructions */}
            <div className="p-7 sm:p-9 lg:col-span-7">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-[#1A1A1A]">
                  Step-by-Step Instructions
                </h2>
                <span className="text-xs font-medium text-[#6E6A63]">
                  Click a step to mark it complete
                </span>
              </div>

              <ol className="mt-5 space-y-4">
                {(recipe.instructions || []).map((step, idx) => {
                  const isDone = Boolean(completedSteps[idx]);
                  return (
                    <li
                      key={idx}
                      onClick={() => toggleStep(idx)}
                      className={`flex cursor-pointer items-start gap-4 rounded-2xl border p-4 transition-all ${
                        isDone
                          ? "border-[#CFE0D3] bg-[#F1F6F2] text-[#6E7770]"
                          : "border-[#EAE2D3] bg-white text-[#222220] hover:border-[#BFCFC2]"
                      }`}
                    >
                      <span
                        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                          isDone
                            ? "bg-[#2E7D47] text-white"
                            : "bg-[#6E8872] text-white"
                        }`}
                      >
                        {isDone ? <Check className="h-3.5 w-3.5" /> : idx + 1}
                      </span>
                      <p
                        className={`text-[14.5px] leading-relaxed ${
                          isDone ? "line-through" : ""
                        }`}
                      >
                        {step}
                      </p>
                    </li>
                  );
                })}
              </ol>

              {/* Metabolic Serving Note */}
              <div className="mt-7 rounded-2xl border border-[#E4DAC8] bg-[#F4EFE4] p-4">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#3E4A3E]">
                  <ChefHat className="h-4 w-4 text-[#708C74]" />
                  <span>NourishThali 4-Part Plate Pairing Tip</span>
                </div>
                <p className="mt-1.5 text-xs leading-relaxed text-[#4A463F]">
                  Pair this keto dish with 2 Tbsp of a fresh chlorophyll-rich
                  therapeutic chutney (such as Mint Coriander or Fresh Amla
                  Chutney) and warm A2 Desi Ghee or cold-pressed mustard oil to
                  support fat-soluble nutrient absorption.
                </p>
              </div>
            </div>
          </div>
        </article>

        {/* Related Recipes in the Same Category */}
        {relatedRecipes.length > 0 && (
          <section className="mt-12">
            <div className="flex items-center justify-between">
              <h2 className="font-serif text-2xl font-bold text-[#1E2E23]">
                More in {getCategoryLabel(recipe.category)}
              </h2>
              <Link
                href={`/recipes?category=${recipe.category}`}
                className="text-xs font-bold text-[#2E5A3C] hover:underline"
              >
                View all {getCategoryLabel(recipe.category)} &rarr;
              </Link>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {relatedRecipes.map((rel) => (
                <Link
                  key={rel.slug}
                  href={`/recipes/${rel.slug}`}
                  className="group overflow-hidden rounded-[18px] border border-[#EAE3D5] bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div className="h-36 w-full overflow-hidden bg-[#EFE9DC]">
                    <img
                      src={rel.image_url || FALLBACK_RECIPE_IMAGE}
                      alt={rel.title}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  </div>
                  <div className="p-3.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#708C74]">
                      {(rel.diet_type || "keto").toUpperCase()} •{" "}
                      {(rel.prep_time_mins || 10) + (rel.cook_time_mins || 10)}m
                    </span>
                    <h3 className="mt-1 line-clamp-2 font-serif text-sm font-bold text-[#1E2E23] group-hover:text-[#B85D3B]">
                      {rel.title}
                    </h3>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

