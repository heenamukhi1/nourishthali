import seedJson from "../../supabase/seed-data.json";
import type { SupabaseRecipeRecord } from "@/types/recipes";

export interface PlateFormulaSelection {
  protein: string;
  fiber: string;
  carb: string;
  chutney: string;
}

export interface DayMealSlot {
  title: string;
  time: string;
  plate: PlateFormulaSelection;
  aiImageUrl?: string | null;
  isFavorite?: boolean;
}

export interface DayPlanRecord {
  dayIndex: number; // 0 = Mon ... 6 = Sun
  dayShort: string; // "Mon", "Tue", ...
  dayName: string; // "Monday", "Tuesday", ...
  dateLabel: string; // "Nov 2", "Nov 3", ...
  brunch: DayMealSlot;
  dinner: DayMealSlot;
}

export interface FormulaColumnOption {
  id: string;
  label: string;
  portionNote: string;
  recipeSlug: string;
}

/**
 * Today is Tuesday, November 3, 2026 (dayIndex = 1).
 */
export const TODAY_DAY_INDEX = 1;

const rawFormulaItems = (seedJson.formula_items || []) as Array<{
  id: string;
  row_number: number;
  column_type: string;
  name: string;
  portion_note: string;
  linked_recipe_id: string;
}>;

const rawRecipes = (seedJson.recipes || []) as unknown as SupabaseRecipeRecord[];

const recipeIdToSlug: Record<string, string> = {};
for (const r of rawRecipes) {
  recipeIdToSlug[r.id] = r.slug;
}

function buildColumnPool(
  columnType:
    | "protein"
    | "fiber_veg_soup"
    | "roti_rice_wrap"
    | "condiment_chutney",
  fallbackCategories: string[]
): FormulaColumnOption[] {
  const seen = new Set<string>();
  const pool: FormulaColumnOption[] = [];

  for (const item of rawFormulaItems) {
    if (item.column_type !== columnType) continue;
    const cleanLabel = item.name.split("(")[0].trim();
    if (!cleanLabel || seen.has(cleanLabel.toLowerCase())) continue;
    seen.add(cleanLabel.toLowerCase());
    pool.push({
      id: item.id,
      label: cleanLabel,
      portionNote: item.portion_note || "",
      recipeSlug:
        recipeIdToSlug[item.linked_recipe_id] || "keto-cauliflower-poha",
    });
  }

  for (const r of rawRecipes) {
    if (!fallbackCategories.includes(r.category)) continue;
    const cleanTitle = r.title.split("(")[0].trim();
    if (!cleanTitle || seen.has(cleanTitle.toLowerCase())) continue;
    seen.add(cleanTitle.toLowerCase());
    pool.push({
      id: r.id,
      label: cleanTitle,
      portionNote: `${r.prep_time_mins + r.cook_time_mins}m`,
      recipeSlug: r.slug,
    });
  }

  return pool;
}

export const FULL_COLUMN_POOLS: Record<
  keyof PlateFormulaSelection,
  FormulaColumnOption[]
> = {
  protein: buildColumnPool("protein", [
    "curry_sabzi",
    "chakna_snack",
    "nourish_bowl",
  ]),
  fiber: buildColumnPool("fiber_veg_soup", ["curry_sabzi", "soup"]),
  carb: buildColumnPool("roti_rice_wrap", [
    "bread_wrap",
    "breakfast_chilla",
    "nourish_bowl",
  ]),
  chutney: buildColumnPool("condiment_chutney", ["chutney_dip"]),
};

export const PROTEIN_OPTIONS = FULL_COLUMN_POOLS.protein;
export const FIBER_OPTIONS = FULL_COLUMN_POOLS.fiber;
export const CARB_OPTIONS = FULL_COLUMN_POOLS.carb;
export const CHUTNEY_OPTIONS = FULL_COLUMN_POOLS.chutney;

/**
 * Resolves the best matching recipe from the Supabase recipes for a given dish label.
 * Always aligns the returned recipe's display title with `dishLabel` so the selected
 * button and the recipe viewer heading match 100%.
 */
export function findRecipeForDishLabel(
  dishLabel: string,
  allRecipes: SupabaseRecipeRecord[]
): SupabaseRecipeRecord {
  const recipesPool = allRecipes.length > 0 ? allRecipes : rawRecipes;
  const normalized = dishLabel.toLowerCase().trim();

  const direct = recipesPool.find(
    (r) =>
      r.title.toLowerCase() === normalized ||
      r.title.toLowerCase().includes(normalized) ||
      normalized.includes(r.title.toLowerCase().split("(")[0].trim())
  );
  if (direct) {
    return { ...direct, title: dishLabel };
  }

  for (const colKey of Object.keys(
    FULL_COLUMN_POOLS
  ) as (keyof PlateFormulaSelection)[]) {
    const matchOption = FULL_COLUMN_POOLS[colKey].find(
      (opt) =>
        opt.label.toLowerCase() === normalized ||
        opt.label.toLowerCase().includes(normalized) ||
        normalized.includes(opt.label.toLowerCase())
    );
    if (matchOption) {
      const bySlug = recipesPool.find(
        (r) => r.slug === matchOption.recipeSlug
      );
      if (bySlug) {
        return { ...bySlug, title: dishLabel };
      }
    }
  }

  const tokens = normalized
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length >= 3);
  let bestRecipe = recipesPool[0];
  let bestScore = -1;

  for (const r of recipesPool) {
    const hay = `${r.title} ${r.slug} ${(r.tags || []).join(" ")}`.toLowerCase();
    let score = 0;
    for (const tok of tokens) {
      if (hay.includes(tok)) score += 1;
    }
    if (score > bestScore) {
      bestScore = score;
      bestRecipe = r;
    }
  }

  const fallback = bestRecipe || recipesPool[0];
  return { ...fallback, title: dishLabel };
}

export const DEFAULT_WEEKLY_PLAN: DayPlanRecord[] = [
  {
    dayIndex: 0,
    dayShort: "Mon",
    dayName: "Monday",
    dateLabel: "Nov 2",
    brunch: {
      title: "Bikaner Morning Thali",
      time: "10:30 AM",
      plate: {
        protein: "Tofu Methi Bhurji",
        fiber: "Ridge Gourd / Turai Masala Sabji",
        carb: "Keto Cauliflower Poha with Peanuts",
        chutney: "Fresh Homemade Guacamole Spread",
      },
    },
    dinner: {
      title: "Warming Shorba & Sabzi Plate",
      time: "6:00 PM",
      plate: {
        protein: "Pan-Seared Vegan Cultured Cheese & Tofu Medallions",
        fiber: "Drumstick & Lauki Healing Shorba",
        carb: "Toasted Garlic Almond Bread",
        chutney: "Avocado Hung Curd / Cashew Curd Dip",
      },
    },
  },
  {
    dayIndex: 1,
    dayShort: "Tue",
    dayName: "Tuesday",
    dateLabel: "Nov 3",
    brunch: {
      title: "Aromatic Brunch Plate",
      time: "10:30 AM",
      plate: {
        protein: "Palak Tofu",
        fiber: "Steamed Garlic-Lemon Broccoli Florets",
        carb: "Soft Almond Flour & Isabgol Rotis",
        chutney: "Mint Coriander Green Chilli Chutney",
      },
    },
    dinner: {
      title: "Comfort Dinner Plate",
      time: "6:00 PM",
      plate: {
        protein: "Tandoori Tofu Tikka Skewers",
        fiber: "Lemon Creamy Mushrooms, Capsicum & Broccoli",
        carb: "Zucchini Cheese Tortilla Wrap",
        chutney: "Roasted Tomato Pudina Chutney",
      },
    },
  },
  {
    dayIndex: 2,
    dayShort: "Wed",
    dayName: "Wednesday",
    dateLabel: "Nov 4",
    brunch: {
      title: "South Indian Keto Brunch",
      time: "10:30 AM",
      plate: {
        protein: "Roasted Edamame & Hemp Seed Toss",
        fiber: "Air-Fryer Bharwa Bhindi",
        carb: "Keto Almond Flour & Cheese Dosa Crepe",
        chutney: "South Indian Tempered Coconut Chutney",
      },
    },
    dinner: {
      title: "Smoky Bharta & Roti Thali",
      time: "6:00 PM",
      plate: {
        protein: "Dahi Tadka Spiced Curd Curry",
        fiber: "Smoky Roasted Baingan Bharta",
        carb: "Soft Almond Flour & Isabgol Rotis",
        chutney: "Rajasthani Garlic & Coconut Dry Chutney",
      },
    },
  },
  {
    dayIndex: 3,
    dayShort: "Thu",
    dayName: "Thursday",
    dateLabel: "Nov 5",
    brunch: {
      title: "Probiotic Curd & Upma Plate",
      time: "10:30 AM",
      plate: {
        protein: "Broccoli Walnut Egg Tikki",
        fiber: "Sauteed Tofu & Fresh Methi Greens",
        carb: "Keto Cauliflower Upma with Ginger & Curry Leaves",
        chutney: "Tangy Amla & Coriander Chutney",
      },
    },
    dinner: {
      title: "Royal Makhani Dinner Plate",
      time: "6:00 PM",
      plate: {
        protein: "Tofu Makhani in Roasted Red Pepper Cream Gravy",
        fiber: "Silky Pumpkin & Coconut Milk Ginger Soup",
        carb: "Garlic Almond Naan Brushed with A2 Ghee",
        chutney: "Palak & Toasted Walnut Raita",
      },
    },
  },
  {
    dayIndex: 4,
    dayShort: "Fri",
    dayName: "Friday",
    dateLabel: "Nov 6",
    brunch: {
      title: "Mediterranean-Indian Zoodle Plate",
      time: "10:30 AM",
      plate: {
        protein: "Stuffed Bell Peppers with Vegan Cultured Cheese",
        fiber: "Kakdi Koshimbir",
        carb: "Pesto Zucchini Noodles / Zoodles",
        chutney: "Cilantro, Pistachio & Pumpkin Seed Pesto",
      },
    },
    dinner: {
      title: "Tandoori Gobi & Shorba Plate",
      time: "6:00 PM",
      plate: {
        protein: "Mushroom & Tofu Black Pepper Fry",
        fiber: "Grilled Tandoori Cauliflower Steak",
        carb: "Keto Palak Almond Flour Paratha",
        chutney: "Smoked Brinjal & Tahini Baba Ganoush",
      },
    },
  },
  {
    dayIndex: 5,
    dayShort: "Sat",
    dayName: "Saturday",
    dateLabel: "Nov 7",
    brunch: {
      title: "Rajasthani Chilla & Kachi Haldi Thali",
      time: "10:30 AM",
      plate: {
        protein: "Kala Chana & Grated Tofu Tikki Patties",
        fiber: "Winter Sarson, Palak & Bathua Greens Saag",
        carb: "Almond Flour & Besan Savoury Chillas",
        chutney: "Fresh Kachi Haldi, Ginger & Lemon Pickle",
      },
    },
    dinner: {
      title: "Stuffed Cabbage & Veloute Plate",
      time: "6:00 PM",
      plate: {
        protein: "Tofu Tikka Masala in Coconut-Yogurt Gravy",
        fiber: "Turmeric & Roasted Cauliflower Velouté Soup",
        carb: "Jeera Gobi Chawal",
        chutney: "Creamy Sesame Tahini Lemon Dip",
      },
    },
  },
  {
    dayIndex: 6,
    dayShort: "Sun",
    dayName: "Sunday",
    dateLabel: "Nov 8",
    brunch: {
      title: "Festive Sunday Nourish Thali",
      time: "10:30 AM",
      plate: {
        protein: "Boiled Kala Chana Rainbow Chaat",
        fiber: "Charred Tandoori Gobi & Malai Broccoli Platter",
        carb: "High-Protein Chia Seeds Tadka Curd Rice",
        chutney: "Spicy Curry Leaf & Coconut Chutney",
      },
    },
    dinner: {
      title: "Golden Coconut Korma Thali",
      time: "6:00 PM",
      plate: {
        protein: "Royal Nawabi Tofu & Vegetable Korma",
        fiber: "Clear Mix Veg & Moringa Leaf Healing Soup",
        carb: "Keto Gobhi-Stuffed Almond Paratha",
        chutney: "Mint Coriander Green Chilli Chutney",
      },
    },
  },
];

const STORAGE_KEY = "nourishthali_weekly_plan_v2";

export function loadWeeklyPlanFromStorage(): DayPlanRecord[] {
  if (typeof window === "undefined") {
    return DEFAULT_WEEKLY_PLAN;
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_WEEKLY_PLAN;
    const parsed = JSON.parse(raw) as DayPlanRecord[];
    if (Array.isArray(parsed) && parsed.length === 7) {
      return parsed;
    }
  } catch {
    // Ignore storage parse errors
  }
  return DEFAULT_WEEKLY_PLAN;
}

export function saveWeeklyPlanToStorage(plan: DayPlanRecord[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(plan));
    window.dispatchEvent(new CustomEvent("nourishthali-weekly-plan-updated"));
  } catch {
    // Ignore storage write errors
  }

  // Persist to Supabase so all family members see the updated plan
  fetch("/api/weekly-plan", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ weeklyPlan: plan }),
  }).catch(() => {
    // Ignore offline errors
  });
}

export async function fetchSharedWeeklyPlanFromSupabase(): Promise<
  DayPlanRecord[] | null
> {
  try {
    const res = await fetch("/api/weekly-plan", { cache: "no-store" });
    if (!res.ok) return null;
    const data = await res.json();
    if (
      data?.source === "supabase" &&
      Array.isArray(data.weeklyPlan) &&
      data.weeklyPlan.length === 7
    ) {
      if (typeof window !== "undefined") {
        window.localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify(data.weeklyPlan)
        );
      }
      return data.weeklyPlan as DayPlanRecord[];
    }
  } catch {
    // Ignore network errors
  }
  return null;
}
