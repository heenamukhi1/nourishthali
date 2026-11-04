import React from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { fetchRecipeBySlugFromSupabase } from "@/utils/supabase/recipes";
import { RecipeDetailClient } from "@/components/RecipeDetailClient";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const { recipe } = await fetchRecipeBySlugFromSupabase(slug);

  if (!recipe) {
    return {
      title: "Recipe Not Found | NourishThali",
    };
  }

  return {
    title: `${recipe.title} | NourishThali Keto Recipes`,
    description:
      recipe.visual_plating_cue ||
      `Full keto recipe, Bikaner mandi ingredient checklist, and step-by-step instructions for ${recipe.title}.`,
  };
}

export default async function RecipeDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { recipe, relatedRecipes } = await fetchRecipeBySlugFromSupabase(slug);

  if (!recipe) {
    return (
      <div className="min-h-screen bg-[#FAF7F2] px-6 py-20 text-center text-[#2C3531]">
        <div className="mx-auto max-w-lg rounded-[24px] border border-[#E5DEC9] bg-white p-10 shadow-sm">
          <h1 className="font-serif text-2xl font-bold text-[#1E2E23]">
            Recipe Not Found
          </h1>
          <p className="mt-2 text-sm text-[#6E6A63]">
            We couldn&apos;t find a recipe matching &ldquo;{slug}&rdquo;.
          </p>
          <Link
            href="/recipes"
            className="mt-6 inline-flex items-center rounded-full bg-[#6E8872] px-5 py-2.5 text-xs font-semibold text-white hover:bg-[#5B745F]"
          >
            &larr; Back to All Keto Recipes
          </Link>
        </div>
      </div>
    );
  }

  return (
    <RecipeDetailClient recipe={recipe} relatedRecipes={relatedRecipes} />
  );
}

