import React from "react";
import type { Metadata } from "next";
import { fetchAllRecipesFromSupabase } from "@/utils/supabase/recipes";
import { WeeklyPlanClient } from "@/components/WeeklyPlanClient";

export const metadata: Metadata = {
  title: "Weekly Meal Plan (Mon–Sun) | NourishThali",
  description:
    "Plan and customize Monday through Sunday Brunch and Dinner keto Thali plates for Vijay Mukhi.",
};

export const dynamic = "force-dynamic";

export default async function WeeklyPlanPage() {
  const { recipes } = await fetchAllRecipesFromSupabase();

  return <WeeklyPlanClient allRecipes={recipes} />;
}

