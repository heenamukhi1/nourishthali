import React from "react";
import type { Metadata } from "next";
import { fetchAllRecipesFromSupabase } from "@/utils/supabase/recipes";
import { MyRecipesClient } from "@/components/MyRecipesClient";

export const metadata: Metadata = {
  title: "My Recipes — Add & Save Family Recipes | NourishThali",
  description:
    "Add and save your own keto and low-carb family recipes with images to Supabase.",
};

export const dynamic = "force-dynamic";

export default async function MyRecipesPage() {
  const { recipes } = await fetchAllRecipesFromSupabase();

  return <MyRecipesClient initialRecipes={recipes} />;
}

