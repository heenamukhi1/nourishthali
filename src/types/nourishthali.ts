export type TextScaleOption = "100" | "115" | "130";

export type MealSlot = "breakfast" | "lunch" | "evening_chai" | "dinner";

export type DishCategory =
  | "katori_curry"
  | "dal_legume"
  | "roti_grain"
  | "sabzi_greens"
  | "raita_probiotic"
  | "snack_cheela";

export type AisleCategory =
  | "produce"
  | "lentils_grains"
  | "dairy_plant_protein"
  | "spices_oils";

export interface Family {
  id: string;
  name: string;
  invite_code: string;
  dietary_focus: string;
  daily_protein_goal_g: number;
  daily_fiber_goal_g: number;
}

export interface FamilyMember {
  id: string;
  family_id: string;
  full_name: string;
  role: "home_admin" | "family_member" | "kitchen_lead";
  preferred_text_scale: TextScaleOption;
  health_conditions: string[];
  dietary_restrictions: string[];
  avatar_label: string;
}

export interface Ingredient {
  id: string;
  name_en: string;
  aisle_category: AisleCategory;
  default_unit: string;
  is_diabetic_friendly: boolean;
  is_low_sodium: boolean;
}

export interface Dish {
  id: string;
  slug: string;
  title_en: string;
  category: DishCategory;
  meal_slot: MealSlot;
  glycemic_index: "low" | "medium";
  calories_kcal: number;
  protein_g: number;
  fiber_g: number;
  sodium_mg: number;
  prep_time_mins: number;
  digestibility_note_en: string;
  ayurvedic_benefit: string;
  steps_en: string[];
  ingredients_list: string[];
}

export interface DishIngredient {
  id: string;
  dish_id: string;
  ingredient_id: string;
  quantity: number;
  unit_en: string;
  preparation_note_en?: string;
}

export interface ThaliPlan {
  id: string;
  family_id: string;
  plan_date: string;
  meal_slot: MealSlot;
  slot_label: string;
  title_en: string;
  status: "planned" | "prepping" | "ready" | "enjoyed";
  assigned_cook_id: string;
  doctor_approved: boolean;
  notes: string;
  dish_ids: string[];
}

export interface ThaliPlanItem {
  id: string;
  thali_plan_id: string;
  dish_id: string;
  portion_katoris: number;
  custom_modification_en?: string;
}

export interface GroceryItem {
  id: string;
  family_id: string;
  ingredient_id?: string;
  label: string;
  aisle_category: AisleCategory;
  quantity_display: string;
  is_checked: boolean;
  added_by_member_id: string;
  for_plan_date: string;
}

export interface FamilyCheckin {
  id: string;
  family_id: string;
  member_id: string;
  member_name: string;
  thali_plan_id?: string;
  checkin_date: string;
  energy_rating: number;
  digestion_comfort: "excellent" | "good" | "mild_heaviness";
  post_meal_glucose_mg_dl?: number;
  water_glasses: number;
  note_en: string;
}

export interface NourishThaliSeedData {
  families: Family[];
  family_members: FamilyMember[];
  ingredients: Ingredient[];
  dishes: Dish[];
  dish_ingredients: DishIngredient[];
  thali_plans: ThaliPlan[];
  thali_plan_items: ThaliPlanItem[];
  grocery_items: GroceryItem[];
  family_checkins: FamilyCheckin[];
}
