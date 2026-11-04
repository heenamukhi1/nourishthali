import React from "react";
import type { Metadata } from "next";
import { fetchAllRecipesFromSupabase } from "@/utils/supabase/recipes";
import { RecipesGalleryClient } from "@/components/RecipesGalleryClient";

export const metadata: Metadata = {
  title: "Keto Indian Recipes & Thali Dishes | NourishThali",
  description:
    "Browse 46 metabolic keto Indian recipes, therapeutic chutneys, and mid-meal chakna snacks loaded from Supabase with Gemini AI food photography.",
};

export const dynamic = "force-dynamic";

export default async function RecipesPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const resolvedSearchParams = await searchParams;
  const { recipes, source } = await fetchAllRecipesFromSupabase();

  return (
    <RecipesGalleryClient
      initialRecipes={recipes}
      dataSource={source}
      initialCategory={resolvedSearchParams?.category || "all"}
    />
  );
}

