import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  generateImageWithGemini,
  uploadGeneratedImageToSupabase,
} from "@/utils/gemini/imageGenerator";
import { fetchAllRecipesFromSupabase } from "@/utils/supabase/recipes";

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY &&
    process.env.SUPABASE_SERVICE_ROLE_KEY !== "your-supabase-service-role-key"
      ? process.env.SUPABASE_SERVICE_ROLE_KEY
      : process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) return null;
  return createClient(url, key);
}

function slugifyTitle(title: string): string {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return `${base || "custom-recipe"}-${Date.now().toString(36)}`;
}

export async function GET() {
  const { recipes, source } = await fetchAllRecipesFromSupabase();
  return NextResponse.json({ recipes, source });
}

export async function POST(request: Request) {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json(
      { error: "Supabase credentials are not configured." },
      { status: 500 }
    );
  }

  try {
    const body = await request.json();
    const {
      title,
      category = "curry_sabzi",
      diet_type = "keto",
      prep_time_mins = 10,
      cook_time_mins = 15,
      visual_plating_cue = "",
      ingredients = [],
      instructions = [],
      imageBase64,
      imageMimeType = "image/jpeg",
      imageUrl,
      authorName = "Mukhi Family Kitchen",
    } = body;

    if (!title || typeof title !== "string") {
      return NextResponse.json(
        { error: "Recipe title is required." },
        { status: 400 }
      );
    }

    const slug = slugifyTitle(title);
    let finalImageUrl: string = imageUrl || "/images/mockup-meals.jpg";

    // 1. If user uploaded an image file (base64), upload it to Supabase Storage
    if (imageBase64 && typeof imageBase64 === "string") {
      const cleanBase64 = imageBase64.replace(/^data:[^;]+;base64,/, "");
      const ext = imageMimeType.includes("png") ? "png" : "jpg";
      const uploadedUrl = await uploadGeneratedImageToSupabase({
        supabase,
        bucket: "ai-plate-images",
        storagePath: `user-recipes/${slug}.${ext}`,
        base64Data: cleanBase64,
        mimeType: imageMimeType,
      });
      if (uploadedUrl) {
        finalImageUrl = uploadedUrl;
      } else {
        finalImageUrl = imageBase64;
      }
    } else if (!imageUrl) {
      // 2. Otherwise automatically generate a dish image using Gemini API (`gemini-nano-banana-2.1`)
      const prompt = `Overhead editorial Indian food photography of "${title}". ${
        visual_plating_cue ? `Visual plating cue: ${visual_plating_cue}.` : ""
      } Served in handmade ceramic and brass tableware on a warm rustic wooden table, natural daylight, photorealistic.`;
      const generated = await generateImageWithGemini({
        prompt,
        model: "gemini-nano-banana-2.1",
      });
      if (generated) {
        const ext = generated.mimeType.includes("jpeg") ? "jpg" : "png";
        const uploadedUrl = await uploadGeneratedImageToSupabase({
          supabase,
          bucket: "ai-plate-images",
          storagePath: `recipes/${slug}.${ext}`,
          base64Data: generated.base64Data,
          mimeType: generated.mimeType,
        });
        if (uploadedUrl) {
          finalImageUrl = uploadedUrl;
        }
      }
    }

    const newRecipePayload = {
      slug,
      title: title.trim(),
      category,
      diet_type,
      prep_time_mins: Number(prep_time_mins) || 10,
      cook_time_mins: Number(cook_time_mins) || 15,
      visual_plating_cue:
        visual_plating_cue?.trim() ||
        `Homemade ${diet_type} preparation of ${title.trim()} from ${authorName}.`,
      image_url: finalImageUrl,
      ingredients,
      instructions,
      source_name: authorName,
      source_url: "",
      tags: ["user-recipe", diet_type, "family-kitchen"],
    };

    let { data, error } = await supabase
      .from("recipes")
      .insert(newRecipePayload)
      .select("*")
      .single();

    if (error && error.message?.includes("diet_type")) {
      const { diet_type: _dt, ...payloadWithoutDiet } = newRecipePayload;
      const retry = await supabase
        .from("recipes")
        .insert(payloadWithoutDiet)
        .select("*")
        .single();
      data = retry.data;
      error = retry.error;
    }

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      recipe: data,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to save custom recipe";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

