export interface RecipeIngredientItem {
  item: string;
  hindi_transliteration?: string;
  qty: string;
  unit: string;
  aisle: string;
  bikaner_mandi_aisle?: string;
  is_staple: boolean;
}

export interface SupabaseRecipeRecord {
  id: string;
  slug: string;
  title: string;
  category:
    | "breakfast_chilla"
    | "nourish_bowl"
    | "curry_sabzi"
    | "soup"
    | "bread_wrap"
    | "chutney_dip"
    | "chakna_snack"
    | "festive"
    | string;
  diet_type?: "keto" | "low-carb" | string;
  prep_time_mins: number;
  cook_time_mins: number;
  visual_plating_cue: string | null;
  image_url: string | null;
  ingredients: RecipeIngredientItem[];
  instructions: string[];
  source_name: string | null;
  source_url: string | null;
  tags: string[];
  created_at?: string;
}

export const RECIPE_CATEGORIES: Array<{
  id: string;
  label: string;
  shortLabel: string;
  description: string;
}> = [
  {
    id: "all",
    label: "All Keto Recipes",
    shortLabel: "All Recipes",
    description:
      "Complete collection of 46 metabolic keto Indian meals, therapeutic chutneys, and mid-meal chakna snacks.",
  },
  {
    id: "breakfast_chilla",
    label: "Breakfast & Chilla",
    shortLabel: "Breakfast & Chilla",
    description:
      "Grain-free almond chillas, keto cauliflower poha, almond masala dosa, and warming morning upma.",
  },
  {
    id: "nourish_bowl",
    label: "Nourish Bowls",
    shortLabel: "Nourish Bowls",
    description:
      "Probiotic chia curd rice, cauliflower thayir sadam, and pesto zucchini noodle bowls.",
  },
  {
    id: "curry_sabzi",
    label: "Curry & Sabzi",
    shortLabel: "Curry & Sabzi",
    description:
      "Rich Palak Tofu, Tofu Makhani, smoky Baingan Bharta, Bharwa Bhindi, and golden coconut curries.",
  },
  {
    id: "soup",
    label: "Healing Soups & Shorba",
    shortLabel: "Soups & Shorba",
    description:
      "Restorative drumstick-lauki shorba and silky pumpkin coconut milk warming soups.",
  },
  {
    id: "bread_wrap",
    label: "Keto Rotis & Wraps",
    shortLabel: "Rotis & Wraps",
    description:
      "Soft almond-isabgol rotis, garlic almond bread, and crispy zucchini cheese wraps.",
  },
  {
    id: "chutney_dip",
    label: "Therapeutic Chutneys",
    shortLabel: "Chutneys & Dips",
    description:
      "12 phytonutrient-dense chutneys, raitas, pestos, and raw turmeric pickles.",
  },
  {
    id: "chakna_snack",
    label: "Mid-Meal Chakna",
    shortLabel: "Chakna Snacks",
    description:
      "12 portion-controlled 2:00 PM savory snacks paired with herbal teas.",
  },
  {
    id: "festive",
    label: "Festive Keto Sweets",
    shortLabel: "Festive Sweets",
    description:
      "Zero-sugar almond halwa and no-bake strawberry almond cheesecake.",
  },
];

export function getCategoryLabel(category: string): string {
  const found = RECIPE_CATEGORIES.find((c) => c.id === category);
  return found ? found.shortLabel : category.replace(/_/g, " ");
}

