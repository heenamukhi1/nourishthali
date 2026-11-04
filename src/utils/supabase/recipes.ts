import { createClient } from "@supabase/supabase-js";
import seedJson from "../../../supabase/seed-data.json";
import type { SupabaseRecipeRecord } from "@/types/recipes";

function getSupabaseReadClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY &&
    process.env.SUPABASE_SERVICE_ROLE_KEY !== "your-supabase-service-role-key"
      ? process.env.SUPABASE_SERVICE_ROLE_KEY
      : process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key || url.includes("your-project-id")) {
    return null;
  }
  return createClient(url, key);
}

export async function fetchAllRecipesFromSupabase(): Promise<{
  recipes: SupabaseRecipeRecord[];
  source: "supabase" | "seed-fallback";
}> {
  const supabase = getSupabaseReadClient();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("recipes")
        .select("*")
        .order("created_at", { ascending: true });

      if (!error && Array.isArray(data) && data.length > 0) {
        return {
          recipes: data as SupabaseRecipeRecord[],
          source: "supabase",
        };
      }
    } catch {
      // Fallback to local seed-data.json if offline
    }
  }

  return {
    recipes: seedJson.recipes as unknown as SupabaseRecipeRecord[],
    source: "seed-fallback",
  };
}

export async function fetchRecipeBySlugFromSupabase(slug: string): Promise<{
  recipe: SupabaseRecipeRecord | null;
  relatedRecipes: SupabaseRecipeRecord[];
  source: "supabase" | "seed-fallback";
}> {
  const { recipes, source } = await fetchAllRecipesFromSupabase();
  const recipe = recipes.find((r) => r.slug === slug) ?? null;

  const relatedRecipes = recipe
    ? recipes
        .filter((r) => r.slug !== recipe.slug && r.category === recipe.category)
        .slice(0, 4)
    : recipes.slice(0, 4);

  return { recipe, relatedRecipes, source };
}

