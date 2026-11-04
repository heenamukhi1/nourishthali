"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Plus,
  Upload,
  Trash2,
  Loader2,
  CheckCircle2,
  ArrowUpRight,
  Clock,
  Sparkles,
  BookOpen,
} from "lucide-react";
import {
  RECIPE_CATEGORIES,
  getCategoryLabel,
  type RecipeIngredientItem,
  type SupabaseRecipeRecord,
} from "@/types/recipes";

interface MyRecipesClientProps {
  initialRecipes: SupabaseRecipeRecord[];
}

export function MyRecipesClient({ initialRecipes }: MyRecipesClientProps) {
  const [recipes, setRecipes] =
    useState<SupabaseRecipeRecord[]>(initialRecipes);
  const [title, setTitle] = useState<string>("");
  const [category, setCategory] = useState<string>("curry_sabzi");
  const [dietType, setDietType] = useState<string>("keto");
  const [prepMins, setPrepMins] = useState<number>(10);
  const [cookMins, setCookMins] = useState<number>(15);
  const [visualCue, setVisualCue] = useState<string>("");
  const [authorName, setAuthorName] = useState<string>("Mukhi Family Kitchen");

  // Image upload state
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageMimeType, setImageMimeType] = useState<string>("image/jpeg");

  // Ingredients & Instructions state
  const [ingredients, setIngredients] = useState<RecipeIngredientItem[]>([
    {
      item: "",
      qty: "1",
      unit: "cup",
      aisle: "produce",
      hindi_transliteration: "",
      bikaner_mandi_aisle: "Kote Gate Sabzi Mandi - Fresh Produce",
      is_staple: false,
    },
  ]);
  const [instructions, setInstructions] = useState<string[]>([""]);

  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageMimeType(file.type || "image/jpeg");
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setImagePreview(reader.result);
      }
    };
    reader.readAsDataURL(file);
  }

  function addIngredientRow() {
    setIngredients((prev) => [
      ...prev,
      {
        item: "",
        qty: "1",
        unit: "Tbsp",
        aisle: "produce",
        hindi_transliteration: "",
        bikaner_mandi_aisle: "Kote Gate Sabzi Mandi - Fresh Produce",
        is_staple: false,
      },
    ]);
  }

  function updateIngredientRow(
    idx: number,
    field: keyof RecipeIngredientItem,
    value: string | boolean
  ) {
    setIngredients((prev) =>
      prev.map((row, i) => (i === idx ? { ...row, [field]: value } : row))
    );
  }

  function removeIngredientRow(idx: number) {
    setIngredients((prev) => prev.filter((_, i) => i !== idx));
  }

  function addInstructionStep() {
    setInstructions((prev) => [...prev, ""]);
  }

  function updateInstructionStep(idx: number, val: string) {
    setInstructions((prev) => prev.map((s, i) => (i === idx ? val : s)));
  }

  function removeInstructionStep(idx: number) {
    setInstructions((prev) => prev.filter((_, i) => i !== idx));
  }

  async function handleSubmitRecipe(e: React.FormEvent) {
    e.preventDefault();
    setStatusMessage(null);
    setErrorMessage(null);

    if (!title.trim()) {
      setErrorMessage("Please enter a recipe title.");
      return;
    }

    const cleanIngredients = ingredients.filter((i) => i.item.trim() !== "");
    const cleanInstructions = instructions.filter((s) => s.trim() !== "");

    setIsSaving(true);
    try {
      const response = await fetch("/api/recipes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          category,
          diet_type: dietType,
          prep_time_mins: prepMins,
          cook_time_mins: cookMins,
          visual_plating_cue: visualCue,
          authorName,
          imageBase64: imagePreview || undefined,
          imageMimeType,
          ingredients:
            cleanIngredients.length > 0
              ? cleanIngredients
              : [
                  {
                    item: title.trim(),
                    qty: "1",
                    unit: "serving",
                    aisle: "produce",
                    is_staple: false,
                  },
                ],
          instructions:
            cleanInstructions.length > 0
              ? cleanInstructions
              : ["Prepare ingredients and cook over medium heat until tender."],
        }),
      });

      const data = await response.json();
      if (!response.ok || !data?.recipe) {
        throw new Error(data?.error || "Failed to save recipe to Supabase.");
      }

      setRecipes((prev) => [data.recipe, ...prev]);
      setStatusMessage(
        `Saved "${data.recipe.title}" to Supabase! It is now available in My Recipes, All Recipes, and Edit My Plate.`
      );
      // Reset form
      setTitle("");
      setVisualCue("");
      setImagePreview(null);
      setIngredients([
        {
          item: "",
          qty: "1",
          unit: "cup",
          aisle: "produce",
          hindi_transliteration: "",
          bikaner_mandi_aisle: "Kote Gate Sabzi Mandi - Fresh Produce",
          is_staple: false,
        },
      ]);
      setInstructions([""]);
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error ? err.message : "Could not save recipe."
      );
    } finally {
      setIsSaving(false);
    }
  }

  const userAddedRecipes = recipes.filter(
    (r) =>
      (r.tags || []).includes("user-recipe") ||
      r.source_name?.includes("Family")
  );
  const displayedRecipes =
    userAddedRecipes.length > 0 ? userAddedRecipes : recipes.slice(0, 6);

  return (
    <div className="min-h-screen bg-[#FAF7F2] text-[#2C3531]">
      <div className="mx-auto max-w-6xl space-y-10 px-6 pb-20 pt-4">
        {/* Page Header */}
        <section className="rounded-[24px] border border-[#E4DDD0] bg-gradient-to-br from-[#D7E2D8] via-[#E4ECE4] to-[#EFECE4] px-8 py-8 shadow-sm">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/85 px-3.5 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-[#2D4F39]">
            <BookOpen className="h-3.5 w-3.5 text-[#708C74]" />
            <span>Mukhi Family Recipe Vault</span>
          </div>
          <h1 className="mt-3 font-serif text-3xl font-bold text-[#1E2E23] sm:text-4xl">
            My Recipes — Add &amp; Save Family Recipes
          </h1>
          <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-[#3E4C42]">
            Add your own keto or low-carb family recipes with a photo (or let
            Gemini AI generate the dish photo automatically). Every recipe saved
            here is stored in Supabase and immediately available across your
            Weekly &amp; Daily Plans.
          </p>
        </section>

        {/* Main Grid: Add Recipe Form (Left 7 cols) + Saved Recipes Preview (Right 5 cols) */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          {/* LEFT: Add New Recipe Form */}
          <form
            onSubmit={handleSubmitRecipe}
            className="space-y-6 rounded-[24px] border border-[#E5DEC9] bg-white p-7 shadow-sm lg:col-span-7"
          >
            <div className="border-b border-[#EFE9DC] pb-4">
              <h2 className="font-serif text-2xl font-bold text-[#1E2E23]">
                Add a New Family Recipe
              </h2>
              <p className="mt-0.5 text-xs text-[#6E6A63]">
                Upload a photo of your dish or leave it blank to auto-generate
                with Gemini AI.
              </p>
            </div>

            {statusMessage && (
              <div className="flex items-start gap-2.5 rounded-xl border border-[#708C74]/40 bg-[#E6F2EA] p-4 text-xs font-medium text-[#1E3B27]">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#2E7D47]" />
                <span>{statusMessage}</span>
              </div>
            )}

            {errorMessage && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs font-medium text-red-800">
                {errorMessage}
              </div>
            )}

            {/* Title & Author */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#4A463F]">
                  Recipe Title *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Bikaneri Methi Paneer Tikka"
                  className="mt-1.5 w-full rounded-xl border border-[#D8D0C0] bg-[#FAF7F2] px-3.5 py-2.5 text-sm text-[#1E2E23] focus:border-[#708C74] focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#4A463F]">
                  Created By
                </label>
                <input
                  type="text"
                  value={authorName}
                  onChange={(e) => setAuthorName(e.target.value)}
                  placeholder="e.g., Heena Mukhi"
                  className="mt-1.5 w-full rounded-xl border border-[#D8D0C0] bg-[#FAF7F2] px-3.5 py-2.5 text-sm text-[#1E2E23] focus:border-[#708C74] focus:bg-white focus:outline-none"
                />
              </div>
            </div>

            {/* Category, Diet Type, Prep & Cook Time */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div className="col-span-2 sm:col-span-1">
                <label className="block text-xs font-bold uppercase tracking-wider text-[#4A463F]">
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-[#D8D0C0] bg-[#FAF7F2] px-3 py-2.5 text-xs font-semibold text-[#1E2E23] focus:border-[#708C74] focus:bg-white focus:outline-none"
                >
                  {RECIPE_CATEGORIES.filter((c) => c.id !== "all").map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.shortLabel}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#4A463F]">
                  Diet Tag
                </label>
                <select
                  value={dietType}
                  onChange={(e) => setDietType(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-[#D8D0C0] bg-[#FAF7F2] px-3 py-2.5 text-xs font-semibold text-[#1E2E23] focus:border-[#708C74] focus:bg-white focus:outline-none"
                >
                  <option value="keto">Keto</option>
                  <option value="low-carb">Low-Carb</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#4A463F]">
                  Prep (mins)
                </label>
                <input
                  type="number"
                  min={1}
                  value={prepMins}
                  onChange={(e) => setPrepMins(Number(e.target.value))}
                  className="mt-1.5 w-full rounded-xl border border-[#D8D0C0] bg-[#FAF7F2] px-3 py-2 text-sm text-[#1E2E23]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#4A463F]">
                  Cook (mins)
                </label>
                <input
                  type="number"
                  min={0}
                  value={cookMins}
                  onChange={(e) => setCookMins(Number(e.target.value))}
                  className="mt-1.5 w-full rounded-xl border border-[#D8D0C0] bg-[#FAF7F2] px-3 py-2 text-sm text-[#1E2E23]"
                />
              </div>
            </div>

            {/* Recipe Image Upload or Auto-Gemini */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#4A463F]">
                Recipe Photo (Upload or Auto-Generate with Gemini AI)
              </label>
              <div className="mt-2 flex flex-wrap items-center gap-4 rounded-2xl border border-dashed border-[#C8BFA8] bg-[#FAF6EE] p-4">
                {imagePreview ? (
                  <div className="relative h-24 w-32 overflow-hidden rounded-xl border border-[#D8D0C0]">
                    <img
                      src={imagePreview}
                      alt="Recipe upload preview"
                      className="h-full w-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => setImagePreview(null)}
                      className="absolute right-1 top-1 rounded-full bg-black/70 p-1 text-white"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ) : (
                  <div className="flex h-20 w-28 flex-col items-center justify-center rounded-xl bg-[#EFE9DC] text-center text-[11px] text-[#6E6A63]">
                    <Sparkles className="mb-1 h-4 w-4 text-[#708C74]" />
                    <span>Auto-Gemini</span>
                  </div>
                )}

                <div className="flex-1 space-y-1.5">
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-semibold text-[#1E3528] shadow-sm ring-1 ring-[#D8D0C0] hover:bg-[#F3EDE0]">
                    <Upload className="h-3.5 w-3.5 text-[#708C74]" />
                    <span>Upload Photo from Device</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </label>
                  <p className="text-[11px] text-[#6E6A63]">
                    If you don&rsquo;t upload a photo, Gemini AI will
                    automatically generate and save a studio dish photo to
                    Supabase Storage when you click Save.
                  </p>
                </div>
              </div>
            </div>

            {/* Visual Plating Description */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#4A463F]">
                Short Description / Visual Plating Note
              </label>
              <input
                type="text"
                value={visualCue}
                onChange={(e) => setVisualCue(e.target.value)}
                placeholder="e.g., Served sizzling in a brass kadai with fresh coriander and lemon wedges."
                className="mt-1.5 w-full rounded-xl border border-[#D8D0C0] bg-[#FAF7F2] px-3.5 py-2 text-sm text-[#1E2E23]"
              />
            </div>

            {/* Dynamic Ingredients Builder */}
            <div>
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold uppercase tracking-wider text-[#4A463F]">
                  Ingredients (Syncs with Weekly Shopping List)
                </label>
                <button
                  type="button"
                  onClick={addIngredientRow}
                  className="inline-flex items-center gap-1 text-xs font-bold text-[#1E472D] hover:underline"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Add Ingredient</span>
                </button>
              </div>

              <div className="mt-2 space-y-2.5">
                {ingredients.map((ing, idx) => (
                  <div
                    key={idx}
                    className="grid grid-cols-12 items-center gap-2 rounded-xl border border-[#EAE3D5] bg-[#FAF7F2] p-2.5"
                  >
                    <input
                      type="text"
                      value={ing.item}
                      onChange={(e) =>
                        updateIngredientRow(idx, "item", e.target.value)
                      }
                      placeholder="Ingredient name (e.g. Organic Tofu)"
                      className="col-span-5 rounded-lg border border-[#DCD4C6] bg-white px-2.5 py-1.5 text-xs text-[#1E2E23]"
                    />
                    <input
                      type="text"
                      value={ing.qty}
                      onChange={(e) =>
                        updateIngredientRow(idx, "qty", e.target.value)
                      }
                      placeholder="Qty"
                      className="col-span-2 rounded-lg border border-[#DCD4C6] bg-white px-2 py-1.5 text-xs text-[#1E2E23]"
                    />
                    <input
                      type="text"
                      value={ing.unit}
                      onChange={(e) =>
                        updateIngredientRow(idx, "unit", e.target.value)
                      }
                      placeholder="Unit"
                      className="col-span-2 rounded-lg border border-[#DCD4C6] bg-white px-2 py-1.5 text-xs text-[#1E2E23]"
                    />
                    <select
                      value={ing.aisle}
                      onChange={(e) =>
                        updateIngredientRow(idx, "aisle", e.target.value)
                      }
                      className="col-span-2 rounded-lg border border-[#DCD4C6] bg-white px-1.5 py-1.5 text-[11px] text-[#1E2E23]"
                    >
                      <option value="produce">Produce</option>
                      <option value="protein_curd">Protein</option>
                      <option value="nuts_seeds">Nuts/Seeds</option>
                      <option value="masala_staple">Masala/Oil</option>
                      <option value="keto_flours">Keto Flour</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => removeIngredientRow(idx)}
                      className="col-span-1 flex justify-center text-[#8C8270] hover:text-red-600"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Dynamic Instructions Builder */}
            <div>
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold uppercase tracking-wider text-[#4A463F]">
                  Step-by-Step Instructions
                </label>
                <button
                  type="button"
                  onClick={addInstructionStep}
                  className="inline-flex items-center gap-1 text-xs font-bold text-[#1E472D] hover:underline"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Add Step</span>
                </button>
              </div>

              <div className="mt-2 space-y-2">
                {instructions.map((step, idx) => (
                  <div key={idx} className="flex items-start gap-2">
                    <span className="mt-2 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#708C74] text-xs font-bold text-white">
                      {idx + 1}
                    </span>
                    <input
                      type="text"
                      value={step}
                      onChange={(e) =>
                        updateInstructionStep(idx, e.target.value)
                      }
                      placeholder={`Step ${idx + 1} instructions...`}
                      className="flex-1 rounded-xl border border-[#DCD4C6] bg-[#FAF7F2] px-3 py-2 text-xs text-[#1E2E23] focus:bg-white focus:outline-none"
                    />
                    {instructions.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeInstructionStep(idx)}
                        className="mt-2 text-[#8C8270] hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-[#1E472D] px-6 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#163521] disabled:opacity-65"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Saving Recipe &amp; Uploading Image to Supabase...</span>
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  <span>Save Recipe to Supabase</span>
                </>
              )}
            </button>
          </form>

          {/* RIGHT: Saved Family Recipes List */}
          <div className="space-y-4 lg:col-span-5">
            <div className="flex items-center justify-between">
              <h2 className="font-serif text-2xl font-bold text-[#1E2E23]">
                Saved Recipes ({recipes.length})
              </h2>
              <Link
                href="/recipes"
                className="text-xs font-bold text-[#1E472D] hover:underline"
              >
                Browse All &rarr;
              </Link>
            </div>

            <div className="space-y-3.5">
              {displayedRecipes.map((rec) => (
                <Link
                  key={rec.slug}
                  href={`/recipes/${rec.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center gap-4 rounded-2xl border border-[#E6DFD2] bg-white p-3.5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-[#708C74] hover:shadow-md"
                >
                  <div className="h-20 w-24 shrink-0 overflow-hidden rounded-xl bg-[#EFE9DC]">
                    <img
                      src={rec.image_url || "/images/mockup-meals.jpg"}
                      alt={rec.title}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="rounded bg-[#E6EFE8] px-2 py-0.5 text-[10px] font-bold uppercase text-[#1E472D]">
                        {rec.diet_type || "keto"}
                      </span>
                      <span className="text-[11px] font-medium text-[#7A756C]">
                        {getCategoryLabel(rec.category)}
                      </span>
                    </div>
                    <h3 className="mt-1 truncate font-serif text-base font-bold text-[#1E2E23] group-hover:text-[#B85D3B]">
                      {rec.title}
                    </h3>
                    <div className="mt-1 flex items-center justify-between text-[11px] text-[#6E6A63]">
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3 w-3 text-[#708C74]" />
                        {(rec.prep_time_mins || 10) +
                          (rec.cook_time_mins || 10)}{" "}
                        mins
                      </span>
                      <span className="inline-flex items-center gap-0.5 font-semibold text-[#1E472D]">
                        View <ArrowUpRight className="h-3 w-3" />
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

