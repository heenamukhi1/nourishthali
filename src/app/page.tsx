import React from "react";
import { NourishThaliDashboard } from "@/components/NourishThaliDashboard";
import { seedData } from "@/data/seed-data";
import { fetchAllRecipesFromSupabase } from "@/utils/supabase/recipes";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const { recipes } = await fetchAllRecipesFromSupabase();

  return <NourishThaliDashboard initialData={seedData} allRecipes={recipes} />;
}
