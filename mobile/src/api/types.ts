/** Tipos das respostas da API NutriFlow (espelham os Resources do Laravel). */
export type Nutrients = { kcal: number | null; protein_g: number | null; carbs_g: number | null; fat_g: number | null; fiber_g: number | null };

export type MealType = 'breakfast' | 'morning_snack' | 'lunch' | 'afternoon_snack' | 'dinner' | 'supper' | 'custom';
export type GoalType = 'lose_weight' | 'maintain_weight' | 'gain_weight' | 'gain_muscle';
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
export type Sex = 'male' | 'female';
export type QuantityUnit = 'g' | 'kg' | 'ml' | 'l' | 'un' | 'portion' | 'serving';
export type Period = '7d' | '30d' | '3m' | '6m' | '1y' | 'all';

export type Preferences = {
  theme: 'light' | 'dark' | 'system';
  weight_unit: 'kg' | 'lb';
  length_unit: 'cm' | 'in';
  meal_reminders: boolean;
  water_reminders: boolean;
  weight_reminder: boolean;
};

export type Account = {
  id: string;
  name: string;
  email: string;
  google_linked: boolean;
  onboarding_completed: boolean;
  profile: {
    birth_date: string | null;
    sex: Sex | null;
    height_cm: number | null;
    initial_weight_kg: number | null;
    target_weight_kg: number | null;
    activity_level: ActivityLevel | null;
    goal: GoalType | null;
    timezone: string | null;
  };
  preferences: Preferences;
};

export type FoodPortion = { id: string; label: string; amount: number; is_custom: boolean };

export type Food = {
  id: string;
  name: string;
  description: string | null;
  category: { slug: string; name: string } | null;
  source: 'taco' | 'custom';
  source_label: string;
  is_custom: boolean;
  is_owner: boolean;
  is_favorite: boolean;
  is_deleted: boolean;
  reference_amount: number;
  reference_unit: 'g' | 'ml' | 'un';
  accepted_units: QuantityUnit[];
  nutrients: Nutrients;
  extra_nutrients?: { nutrient: string; amount: number | null; unit: string }[];
  portions?: FoodPortion[];
};

export type RecipeIngredient = {
  food: { id: string; name: string; reference_amount: number; reference_unit: 'g' | 'ml' | 'un'; is_deleted: boolean };
  quantity: number;
  unit: QuantityUnit;
  portion: { id: string; label: string; amount: number } | null;
  base_quantity: number;
  nutrients: Nutrients;
};

export type Recipe = {
  id: string;
  name: string;
  description: string | null;
  servings: number;
  yield_weight_g: number | null;
  prep_time_minutes: number | null;
  instructions: string | null;
  is_favorite: boolean;
  is_archived: boolean;
  has_photo: boolean;
  photo_version: string | null;
  nutrition: { total: Nutrients; per_serving: Nutrients };
  ingredients: RecipeIngredient[];
  updated_at: string;
};

export type SavedMealItem = {
  kind: 'food' | 'recipe';
  food_id: string | null;
  recipe_id: string | null;
  name: string;
  reference_unit: 'g' | 'ml' | 'un' | null;
  quantity: number;
  unit: QuantityUnit;
  portion: { id: string; label: string; amount: number } | null;
  is_available: boolean;
  nutrients: Nutrients;
};

export type SavedMeal = {
  id: string;
  name: string;
  description: string | null;
  meal_type: MealType | null;
  is_favorite: boolean;
  nutrition: Nutrients;
  items: SavedMealItem[];
};

export type MealItem = {
  id: string;
  kind: 'food' | 'recipe';
  food_id?: string | null;
  recipe_id?: string | null;
  name: string;
  quantity: number;
  unit: QuantityUnit;
  portion_label: string | null;
  base_quantity: number;
  basis: { amount: number; unit: string; nutrients: Nutrients };
  nutrients: Nutrients;
};

export type Meal = {
  id: string;
  date: string;
  time: string;
  type: MealType;
  title: string;
  custom_name: string | null;
  notes: string | null;
  totals: Nutrients;
  items: MealItem[];
};

export type NutritionGoal = { kcal: number; protein_g: number; carbs_g: number; fat_g: number; water_ml: number; mode: 'manual' | 'estimated'; effective_from: string };

export type DiaryDay = { date: string; today: string; totals: Nutrients; goal: NutritionGoal | null; meals: Meal[]; recorded_dates: string[] };

export type WeightSummary = {
  initial_kg: number | null;
  current_kg: number | null;
  target_kg: number | null;
  change_kg: number | null;
  remaining_kg: number | null;
  last_measured_on: string | null;
  entries_count: number;
};

export type WeightEntry = { id: string; weight_kg: number; measured_on: string; measured_at: string | null; notes: string | null; created_at: string };

export type WaterEntry = { id: string; amount_ml: number; date: string; time: string };
export type WaterDay = { date: string; total_ml: number; goal_ml: number | null; progress: number | null; entries: WaterEntry[] };

export type MeasurementType = 'waist' | 'hip' | 'arm' | 'thigh' | 'chest' | 'body_fat';
export type BodyMeasurement = { id: string; type: MeasurementType; label: string; value: number; unit: string; measured_on: string; notes: string | null };
export type MeasurementLatest = { type: MeasurementType; label: string; unit: string; value: number | null; measured_on: string | null; change: number | null; count: number };

export type Estimate = {
  available: boolean;
  missing: string[];
  bmr_kcal: number | null;
  tdee_kcal: number | null;
  kcal: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
  water_ml: number | null;
  method: string;
  disclaimer: string;
};

export type Dashboard = {
  date: string;
  today: string;
  local_time: string;
  timezone: string;
  weight: WeightSummary & { recent: { date: string; weight_kg: number }[] };
  nutrition: { consumed: Nutrients; goal: { kcal: number; protein_g: number; carbs_g: number; fat_g: number } | null; remaining_kcal: number | null };
  meals: { id: string; type: MealType; title: string; time: string; items_count: number; totals: Nutrients }[];
  water: { total_ml: number; goal_ml: number | null; progress: number | null };
};

export type Report = {
  period: Period;
  from: string;
  to: string;
  days: number;
  weight: WeightSummary & { period: { first_kg: number | null; last_kg: number | null; change_kg: number | null }; series: { date: string; weight_kg: number }[] };
  nutrition: {
    days_with_food: number;
    average: Nutrients | null;
    goal: { kcal: number; protein_g: number; carbs_g: number; fat_g: number; water_ml: number } | null;
    daily: { date: string; kcal: number | null; goal_kcal: number | null; water_ml: number | null }[];
  };
  consistency: {
    days_in_period: number;
    days_recorded: number;
    days_with_food: number;
    days_within_kcal_goal: number;
    days_protein_goal_met: number;
    water_days: number;
    average_water_ml: number | null;
    water_goal_progress: number | null;
  };
};

export type Paginated<T> = { data: T[]; meta: { current_page: number; last_page: number; total: number } | null };

/** Item enviado à API (ingrediente, item de refeição salva ou do diário). */
export type ItemInput = { kind?: 'food' | 'recipe'; food_id?: string; recipe_id?: string; portion_id?: string | null; quantity: number; unit?: QuantityUnit };
