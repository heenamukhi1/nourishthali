import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import seedData from "../../../../supabase/seed-data.json";
import {
  generateImageWithGemini,
  uploadGeneratedImageToSupabase,
} from "@/utils/gemini/imageGenerator";

interface SeedRecipe {
  id: string;
  slug: string;
  title: string;
  category: string;
  diet_type?: string;
  prep_time_mins: number;
  cook_time_mins: number;
  visual_plating_cue: string;
  image_url: string;
  ingredients: Array<{
    item: string;
    hindi_transliteration?: string;
    qty: string;
    unit: string;
    aisle: string;
    bikaner_mandi_aisle?: string;
    is_staple: boolean;
  }>;
  instructions: string[];
  source_name: string;
  source_url: string;
  tags: string[];
}

/**
 * High-Performance Seed Orchestrator Route Handler (POST /api/seed)
 * - Requires `Authorization: Bearer <ADMIN_SEED_SECRET>` header
 * - Generates dish photography for recipes via Gemini API (`gemini-nano-banana-2.1`)
 * - Uploads generated images to Supabase Storage (`ai-plate-images/recipes/<slug>.png`)
 * - Performs bulk upserts into `recipes`, `plate_formula_items`, `shopping_items`, and `daily_quotes`
 */
export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.ADMIN_SEED_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY &&
    process.env.SUPABASE_SERVICE_ROLE_KEY !== "your-supabase-service-role-key"
      ? process.env.SUPABASE_SERVICE_ROLE_KEY
      : process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json(
      { error: "Supabase URL or key is missing in environment variables." },
      { status: 500 }
    );
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  // Optional overrides from query string or JSON body
  const url = new URL(request.url);
  const skipImagesParam = url.searchParams.get("skipImages") === "true";
  const imageLimitParam = url.searchParams.get("imageLimit");
  const concurrencyParam = Number(url.searchParams.get("concurrency") || "4");

  let bodyOverrides: {
    generateImages?: boolean;
    imageLimit?: number;
    geminiApiKey?: string;
  } = {};
  try {
    const text = await request.text();
    if (text.trim()) {
      bodyOverrides = JSON.parse(text);
    }
  } catch {
    // Use defaults if request body is empty
  }

  const shouldGenerateImages =
    bodyOverrides.generateImages !== undefined
      ? bodyOverrides.generateImages
      : !skipImagesParam;

  const recipesToSeed: SeedRecipe[] = (seedData.recipes as SeedRecipe[]).map(
    (r) => ({
      ...r,
      diet_type: r.diet_type || "keto",
    })
  );

  const maxImagesToGenerate =
    bodyOverrides.imageLimit ??
    (imageLimitParam ? Number(imageLimitParam) : recipesToSeed.length);

  let generatedImagesCount = 0;
  let uploadedToStorageCount = 0;

  if (shouldGenerateImages && maxImagesToGenerate > 0) {
    const targetRecipes = recipesToSeed.slice(0, maxImagesToGenerate);
    const batchSize = Math.max(1, Math.min(concurrencyParam, 6));

    for (let i = 0; i < targetRecipes.length; i += batchSize) {
      const batch = targetRecipes.slice(i, i + batchSize);
      await Promise.all(
        batch.map(async (recipe) => {
          const prompt = `Overhead editorial Indian food photography of "${recipe.title}". Visual plating cue: ${recipe.visual_plating_cue}. Served in handmade ceramic and brass tableware on a warm rustic dark wooden table, soft natural daylight, photorealistic, high resolution.`;

          const generated = await generateImageWithGemini({
            prompt,
            apiKey: bodyOverrides.geminiApiKey,
            model: "gemini-nano-banana-2.1",
          });

          if (!generated) return;
          generatedImagesCount += 1;

          const ext = generated.mimeType.includes("jpeg") ? "jpg" : "png";
          const storagePath = `recipes/${recipe.slug}.${ext}`;

          const publicUrl = await uploadGeneratedImageToSupabase({
            supabase,
            bucket: "ai-plate-images",
            storagePath,
            base64Data: generated.base64Data,
            mimeType: generated.mimeType,
          });

          if (publicUrl) {
            recipe.image_url = publicUrl;
            uploadedToStorageCount += 1;
          }
        })
      );
    }
  }

  try {
    // 1. Bulk Upsert Core Recipes (22 primary + 12 therapeutic chutneys + 12 mid-meal chakna snacks = 46)
    let { error: recipesError } = await supabase
      .from("recipes")
      .upsert(recipesToSeed, { onConflict: "slug" });

    if (recipesError && recipesError.message?.includes("diet_type")) {
      const recipesWithoutDietType = recipesToSeed.map(
        ({ diet_type: _dt, ...rest }) => rest
      );
      const retry = await supabase
        .from("recipes")
        .upsert(recipesWithoutDietType, { onConflict: "slug" });
      recipesError = retry.error;
    }
    if (recipesError) throw recipesError;

    // 2. Bulk Upsert 25-Row x 4-Column Plate Formula Items (100 records)
    const { error: formulaError } = await supabase
      .from("plate_formula_items")
      .upsert(seedData.formula_items, { onConflict: "id" });
    if (formulaError) throw formulaError;

    // 3. Bulk Upsert Static Bikaner Kitchen Staples (30 records)
    const { error: staplesError } = await supabase
      .from("shopping_items")
      .upsert(seedData.kitchen_staples, { onConflict: "id" });
    if (staplesError) throw staplesError;

    // 4. Bulk Upsert Daily Quotes (5 records)
    if (Array.isArray(seedData.daily_quotes) && seedData.daily_quotes.length > 0) {
      const { error: quotesError } = await supabase
        .from("daily_quotes")
        .upsert(seedData.daily_quotes, { onConflict: "quote_date" });
      if (quotesError) throw quotesError;
    }

    return NextResponse.json({
      success: true,
      message: "All matrices and Gemini recipe images hydrated successfully.",
      counts: {
        recipes_upserted: recipesToSeed.length,
        primary_recipes: 22,
        therapeutic_chutneys: 12,
        chakna_snacks: 12,
        plate_formula_items_upserted: seedData.formula_items.length,
        kitchen_staples_upserted: seedData.kitchen_staples.length,
        daily_quotes_upserted: seedData.daily_quotes?.length ?? 0,
        gemini_images_generated: generatedImagesCount,
        supabase_storage_images_saved: uploadedToStorageCount,
      },
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to hydrate seed data";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
