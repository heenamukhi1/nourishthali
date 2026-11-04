"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import {
  Clock,
  Search,
  Heart,
  Sparkles,
  ArrowUpRight,
  ChefHat,
  Filter,
  X,
} from "lucide-react";
import {
  RECIPE_CATEGORIES,
  getCategoryLabel,
  type SupabaseRecipeRecord,
} from "@/types/recipes";

interface RecipesGalleryClientProps {
  initialRecipes: SupabaseRecipeRecord[];
  dataSource: "supabase" | "seed-fallback";
  initialCategory?: string;
}

const FALLBACK_RECIPE_IMAGE = "/images/mockup-meals.jpg";

export function RecipesGalleryClient({
  initialRecipes,
  dataSource,
  initialCategory = "all",
}: RecipesGalleryClientProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>(
    initialCategory || "all"
  );
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [favoriteSlugs, setFavoriteSlugs] = useState<Record<string, boolean>>(
    {}
  );

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: initialRecipes.length };
    for (const r of initialRecipes) {
      counts[r.category] = (counts[r.category] || 0) + 1;
    }
    return counts;
  }, [initialRecipes]);

  const filteredRecipes = useMemo(() => {
    return initialRecipes.filter((recipe) => {
      const matchesCategory =
        selectedCategory === "all" || recipe.category === selectedCategory;

      if (!matchesCategory) return false;

      if (!searchQuery.trim()) return true;

      const q = searchQuery.toLowerCase();
      const titleMatch = recipe.title.toLowerCase().includes(q);
      const cueMatch = (recipe.visual_plating_cue || "")
        .toLowerCase()
        .includes(q);
      const tagMatch = (recipe.tags || []).some((t) =>
        t.toLowerCase().includes(q)
      );
      const ingMatch = (recipe.ingredients || []).some(
        (ing) =>
          ing.item.toLowerCase().includes(q) ||
          (ing.hindi_transliteration || "").toLowerCase().includes(q)
      );

      return titleMatch || cueMatch || tagMatch || ingMatch;
    });
  }, [initialRecipes, selectedCategory, searchQuery]);

  const activeCategoryMeta =
    RECIPE_CATEGORIES.find((c) => c.id === selectedCategory) ||
    RECIPE_CATEGORIES[0];

  function toggleFavorite(e: React.MouseEvent, slug: string) {
    e.preventDefault();
    e.stopPropagation();
    setFavoriteSlugs((prev) => ({
      ...prev,
      [slug]: !prev[slug],
    }));
  }

  return (
    <div className="min-h-screen bg-[#FAF7F2] text-[#2C3531]">
      <div className="mx-auto max-w-6xl px-6 pb-20 pt-4">
        {/* EatWell101-Inspired Editorial Tag Header */}
        <section className="rounded-[24px] border border-[#E4DDD0] bg-gradient-to-br from-[#D7E2D8] via-[#E4ECE4] to-[#EFECE4] px-8 py-9 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/85 px-3.5 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-[#2D4F39] shadow-sm">
              <Sparkles className="h-3.5 w-3.5 text-[#708C74]" />
              <span>Tagged: Keto • Metabolic Terrain Collection</span>
            </div>

            <div className="inline-flex items-center gap-2 rounded-full border border-[#C6D4C8] bg-white/80 px-3.5 py-1 text-xs font-medium text-[#35523E]">
              <span className="h-2 w-2 rounded-full bg-[#2E7D47]" />
              <span>
                {initialRecipes.length} Keto Recipes Loaded from{" "}
                {dataSource === "supabase" ? "Supabase" : "Local Seed"}
              </span>
            </div>
          </div>

          <h1 className="mt-4 font-serif text-3xl font-bold tracking-tight text-[#1E2E23] sm:text-4xl">
            {activeCategoryMeta.label}
          </h1>
          <p className="mt-2 max-w-3xl text-[15px] leading-relaxed text-[#3E4C42]">
            {activeCategoryMeta.description} Click any recipe card below to open
            its complete ingredient checklist, Bikaner mandi purchasing aisles,
            and step-by-step instructions in a new page.
          </p>

          {/* Search Bar inside Hero */}
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6B7068]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search recipes by dish, ingredient (e.g. tofu, cauliflower, walnut, amla)..."
                className="h-11 w-full rounded-full border border-[#CBD6CC] bg-white pl-11 pr-10 text-sm text-[#1E2E23] placeholder-[#7B8078] shadow-sm focus:border-[#708C74] focus:outline-none focus:ring-2 focus:ring-[#708C74]/25"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 rounded-full p-1 text-[#6B7068] hover:bg-[#F0ECE1] hover:text-[#1E2E23]"
                  aria-label="Clear search"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
        </section>

        {/* Top Category Filter Bar */}
        <section
          aria-label="Filter Recipes by Category"
          className="mt-7 rounded-[20px] border border-[#E6DFD2] bg-white p-4 shadow-sm"
        >
          <div className="mb-2.5 flex items-center justify-between px-1">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.12em] text-[#6B665E]">
              <Filter className="h-3.5 w-3.5 text-[#B86B4B]" />
              <span>Filter by Category</span>
            </div>
            {selectedCategory !== "all" && (
              <button
                type="button"
                onClick={() => setSelectedCategory("all")}
                className="text-xs font-semibold text-[#B86B4B] hover:underline"
              >
                Reset Filter
              </button>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            {RECIPE_CATEGORIES.map((cat) => {
              const isSelected = selectedCategory === cat.id;
              const count = categoryCounts[cat.id] || 0;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-[13px] font-semibold transition-all ${
                    isSelected
                      ? "bg-[#6E8872] text-white shadow-sm"
                      : "border border-[#E2DACB] bg-[#FAF6EE] text-[#3B423D] hover:border-[#9EB3A0] hover:bg-[#F1ECE0]"
                  }`}
                >
                  <span>{cat.shortLabel}</span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                      isSelected
                        ? "bg-white/20 text-white"
                        : "bg-[#E6DFD1] text-[#4E5650]"
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {/* Results Count Bar */}
        <div className="mt-7 flex items-center justify-between px-1">
          <p className="text-sm font-medium text-[#5A5A52]">
            Showing{" "}
            <span className="font-bold text-[#1E2E23]">
              {filteredRecipes.length}
            </span>{" "}
            {filteredRecipes.length === 1 ? "recipe" : "recipes"}
            {selectedCategory !== "all" && (
              <>
                {" "}
                in{" "}
                <span className="font-semibold text-[#2E5A3C]">
                  {activeCategoryMeta.shortLabel}
                </span>
              </>
            )}
            {searchQuery && (
              <>
                {" "}
                matching{" "}
                <span className="font-semibold text-[#B86B4B]">
                  &ldquo;{searchQuery}&rdquo;
                </span>
              </>
            )}
          </p>
        </div>

        {/* EatWell101-Style Recipe Magazine Grid */}
        {filteredRecipes.length === 0 ? (
          <div className="mt-8 rounded-[22px] border border-[#E6DFD2] bg-white p-12 text-center shadow-sm">
            <ChefHat className="mx-auto h-10 w-10 text-[#9CA39B]" />
            <h2 className="mt-3 font-serif text-xl font-bold text-[#1E2E23]">
              No matching keto recipes found
            </h2>
            <p className="mt-1 text-sm text-[#6B665E]">
              Try clearing your search query or switching to &ldquo;All
              Recipes&rdquo;.
            </p>
            <button
              type="button"
              onClick={() => {
                setSelectedCategory("all");
                setSearchQuery("");
              }}
              className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#6E8872] px-5 py-2 text-xs font-semibold text-white hover:bg-[#5D7661]"
            >
              Show All {initialRecipes.length} Keto Recipes
            </button>
          </div>
        ) : (
          <div className="mt-5 grid grid-cols-1 gap-7 sm:grid-cols-2 lg:grid-cols-3">
            {filteredRecipes.map((recipe) => {
              const totalMins =
                (recipe.prep_time_mins || 10) + (recipe.cook_time_mins || 10);
              const isFav = Boolean(favoriteSlugs[recipe.slug]);
              const dietLabel = (recipe.diet_type || "keto").toUpperCase();

              return (
                <Link
                  key={recipe.id || recipe.slug}
                  href={`/recipes/${recipe.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex flex-col overflow-hidden rounded-[22px] border border-[#EAE3D5] bg-white shadow-[0_6px_24px_rgba(0,0,0,0.05)] transition-all duration-200 hover:-translate-y-1 hover:border-[#C5D3C7] hover:shadow-[0_14px_32px_rgba(30,53,40,0.12)]"
                >
                  {/* Top Dish Photo Container (EatWell101 editorial card style) */}
                  <div className="relative h-[230px] w-full overflow-hidden bg-[#F3EDE2]">
                    <img
                      src={recipe.image_url || FALLBACK_RECIPE_IMAGE}
                      alt={recipe.title}
                      loading="lazy"
                      onError={(e) => {
                        const target = e.currentTarget;
                        if (target.src !== FALLBACK_RECIPE_IMAGE) {
                          target.src = FALLBACK_RECIPE_IMAGE;
                        }
                      }}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />

                    {/* Subtle top gradient for badge contrast */}
                    <div className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-black/40 to-transparent" />

                    {/* Top-Left Category Badge */}
                    <span className="absolute left-3.5 top-3.5 rounded-full bg-white/95 px-3 py-1 text-[10.5px] font-bold uppercase tracking-[0.08em] text-[#1E3528] shadow-sm backdrop-blur-sm">
                      {getCategoryLabel(recipe.category)}
                    </span>

                    {/* Top-Right Diet Badge + Favorite Button */}
                    <div className="absolute right-3.5 top-3.5 flex items-center gap-1.5">
                      <span className="rounded-full bg-[#1E3528]/90 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[#FAF4E8] shadow-sm">
                        {dietLabel}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => toggleFavorite(e, recipe.slug)}
                        aria-label="Favorite recipe"
                        className="flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-[#4A4A45] shadow-sm transition-colors hover:bg-white"
                      >
                        <Heart
                          className={`h-3.5 w-3.5 ${
                            isFav
                              ? "fill-[#D94E4E] text-[#D94E4E]"
                              : "text-[#5A554C]"
                          }`}
                        />
                      </button>
                    </div>

                    {/* Bottom-Left Time Pill */}
                    <div className="absolute bottom-3 left-3.5 inline-flex items-center gap-1.5 rounded-full bg-black/70 px-3 py-1 text-[11px] font-medium text-white backdrop-blur-sm">
                      <Clock className="h-3 w-3 text-[#A5D6B0]" />
                      <span>
                        {totalMins} mins ({recipe.prep_time_mins}m prep •{" "}
                        {recipe.cook_time_mins}m cook)
                      </span>
                    </div>
                  </div>

                  {/* Card Content Body */}
                  <div className="flex flex-1 flex-col justify-between p-5">
                    <div>
                      <h2 className="font-serif text-[19px] font-bold leading-snug text-[#1E2A22] transition-colors group-hover:text-[#B85D3B]">
                        {recipe.title}
                      </h2>

                      {recipe.visual_plating_cue && (
                        <p className="mt-2 line-clamp-2 text-[13px] leading-relaxed text-[#5E5B54]">
                          {recipe.visual_plating_cue}
                        </p>
                      )}

                      {/* Key Ingredients Preview */}
                      {Array.isArray(recipe.ingredients) &&
                        recipe.ingredients.length > 0 && (
                          <div className="mt-3.5 flex flex-wrap gap-1.5">
                            {recipe.ingredients.slice(0, 3).map((ing, idx) => (
                              <span
                                key={idx}
                                className="rounded-md bg-[#F5F0E6] px-2 py-0.5 text-[11px] font-medium text-[#524E46]"
                              >
                                {ing.item.split("(")[0].trim()}
                              </span>
                            ))}
                            {recipe.ingredients.length > 3 && (
                              <span className="rounded-md bg-[#EAE2D3] px-2 py-0.5 text-[11px] font-semibold text-[#5C564B]">
                                +{recipe.ingredients.length - 3} more
                              </span>
                            )}
                          </div>
                        )}
                    </div>

                    {/* Footer Action Row */}
                    <div className="mt-5 flex items-center justify-between border-t border-[#F0EAE0] pt-3.5">
                      <span className="text-[11.5px] font-medium text-[#7A756C]">
                        {recipe.ingredients?.length || 0} ingredients •{" "}
                        {recipe.instructions?.length || 0} steps
                      </span>

                      <span className="inline-flex items-center gap-1 text-xs font-bold text-[#2D5A3C] group-hover:text-[#B85D3B]">
                        <span>Open Recipe</span>
                        <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

