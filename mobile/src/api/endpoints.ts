import { api } from './client';
import type {
  Account, BodyMeasurement, Dashboard, DiaryDay, Estimate, Food, FoodPortion, ItemInput, Meal, MealItem, MealType,
  MeasurementLatest, MeasurementType, NutritionGoal, Period, Preferences, Recipe, Report, SavedMeal, WaterDay, WaterEntry,
  WeightEntry, WeightSummary,
} from './types';

type AuthPayload = { token: string };

export const authApi = {
  login: (email: string, password: string) => api.post<AuthPayload>('/auth/login', { email, password }),
  register: (body: { name: string; email: string; password: string; password_confirmation: string; accept_terms: boolean }) => api.post<AuthPayload>('/auth/register', body),
  google: (credential: string, accept_terms?: boolean) => api.post<AuthPayload>('/auth/google', { credential, accept_terms }),
  providers: () => api.get<{ google: boolean }>('/auth/providers'),
  logout: () => api.post<null>('/auth/logout'),
  forgot: (email: string) => api.post<null>('/auth/password/forgot', { email }),
  reset: (body: { email: string; code: string; password: string; password_confirmation: string }) => api.post<null>('/auth/password/reset', body),
};

export const accountApi = {
  me: () => api.get<Account>('/me'),
  update: (body: Record<string, unknown>) => api.patch<Account>('/me', body),
  onboarding: (body: Record<string, unknown>) => api.post<Account>('/me/onboarding', body),
  preferences: (body: Partial<Preferences>) => api.patch<Account>('/me/preferences', body),
  export: () => api.get<Record<string, unknown>>('/me/export'),
  destroy: (confirmation: string, password?: string) => api.delete<null>('/me', { confirmation, password }),
};

export const dashboardApi = {
  get: (date?: string) => api.get<Dashboard>('/dashboard', { date }),
  report: (period: Period) => api.get<Report>('/reports', { period }),
};

export type GoalsPayload = { nutrition: NutritionGoal | null; target_weight_kg: number | null; estimate: Estimate };
export const goalsApi = {
  get: () => api.get<GoalsPayload>('/goals'),
  update: (body: { kcal: number; protein_g: number; carbs_g: number; fat_g: number; water_ml: number; target_weight_kg?: number | null; mode?: 'manual' | 'estimated' }) =>
    api.put<GoalsPayload>('/goals', body),
};

export const foodsApi = {
  search: (params: { q?: string; category?: string; scope?: 'all' | 'favorites' | 'custom'; page?: number }) =>
    api.get<Food[]>('/foods', { ...params, per_page: 30 }),
  recent: () => api.get<Food[]>('/foods/recent'),
  categories: () => api.get<{ slug: string; name: string }[]>('/food-categories'),
  get: (id: string) => api.get<Food>(`/foods/${id}`),
  create: (body: Record<string, unknown>) => api.post<Food>('/foods', body),
  update: (id: string, body: Record<string, unknown>) => api.patch<Food>(`/foods/${id}`, body),
  remove: (id: string) => api.delete<null>(`/foods/${id}`),
  favorite: (id: string, on: boolean) => (on ? api.post<Food>(`/foods/${id}/favorite`) : api.delete<Food>(`/foods/${id}/favorite`)),
  addPortion: (id: string, label: string, amount: number) => api.post<FoodPortion>(`/foods/${id}/portions`, { label, amount }),
  removePortion: (portionId: string) => api.delete<null>(`/food-portions/${portionId}`),
};

export type RecipeInput = {
  name: string;
  description?: string | null;
  servings: number;
  yield_weight_g?: number | null;
  prep_time_minutes?: number | null;
  instructions?: string | null;
  ingredients: ItemInput[];
};
export const recipesApi = {
  list: (params: { q?: string; filter?: 'all' | 'favorites' | 'recent' | 'archived' }) => api.get<Recipe[]>('/recipes', { ...params, per_page: 100 }),
  get: (id: string) => api.get<Recipe>(`/recipes/${id}`),
  create: (body: RecipeInput) => api.post<Recipe>('/recipes', body),
  update: (id: string, body: Partial<RecipeInput>) => api.patch<Recipe>(`/recipes/${id}`, body),
  remove: (id: string) => api.delete<null>(`/recipes/${id}`),
  duplicate: (id: string) => api.post<Recipe>(`/recipes/${id}/duplicate`),
  archive: (id: string, archived: boolean) => api.put<Recipe>(`/recipes/${id}/archive`, { archived }),
  favorite: (id: string, favorite: boolean) => api.put<Recipe>(`/recipes/${id}/favorite`, { favorite }),
  usage: (id: string) => api.get<{ meal_id: string; date: string; time: string; meal_title: string; servings: number; kcal: number }[]>(`/recipes/${id}/usage`),
  uploadPhoto: (id: string, uri: string, mime: string) => {
    const form = new FormData();
    form.append('photo', { uri, name: `foto.${mime.split('/')[1] ?? 'jpg'}`, type: mime } as unknown as Blob);
    return api.upload<Recipe>(`/recipes/${id}/photo`, form);
  },
  removePhoto: (id: string) => api.delete<Recipe>(`/recipes/${id}/photo`),
};

export type SavedMealInput = { name: string; description?: string | null; meal_type?: MealType | null; items: ItemInput[] };
export const savedMealsApi = {
  list: (filter?: 'all' | 'favorites') => api.get<SavedMeal[]>('/saved-meals', { filter, per_page: 100 }),
  get: (id: string) => api.get<SavedMeal>(`/saved-meals/${id}`),
  create: (body: SavedMealInput) => api.post<SavedMeal>('/saved-meals', body),
  update: (id: string, body: Partial<SavedMealInput>) => api.patch<SavedMeal>(`/saved-meals/${id}`, body),
  remove: (id: string) => api.delete<null>(`/saved-meals/${id}`),
  duplicate: (id: string) => api.post<SavedMeal>(`/saved-meals/${id}/duplicate`),
  favorite: (id: string, favorite: boolean) => api.put<SavedMeal>(`/saved-meals/${id}/favorite`, { favorite }),
  addToDiary: (id: string, body: { date?: string; type?: MealType; time?: string }) => api.post<Meal>(`/saved-meals/${id}/add-to-diary`, body),
};

export const diaryApi = {
  day: (date?: string) => api.get<DiaryDay>('/diary', { date }),
  meal: (id: string) => api.get<Meal>(`/meals/${id}`),
  create: (body: { date?: string; time?: string; type: MealType; custom_name?: string | null; notes?: string | null; items?: ItemInput[] }) => api.post<Meal>('/meals', body),
  update: (id: string, body: { date?: string; time?: string; type?: MealType; custom_name?: string | null; notes?: string | null }) => api.patch<Meal>(`/meals/${id}`, body),
  remove: (id: string) => api.delete<null>(`/meals/${id}`),
  duplicate: (id: string, body: { date?: string; type?: MealType; time?: string }) => api.post<Meal>(`/meals/${id}/duplicate`, body),
  addItems: (id: string, items: ItemInput[]) => api.post<Meal>(`/meals/${id}/items`, { items }),
  updateItem: (itemId: string, body: { quantity: number; unit?: string; portion_id?: string | null }) => api.patch<MealItem>(`/meal-items/${itemId}`, body),
  removeItem: (itemId: string) => api.delete<null>(`/meal-items/${itemId}`),
};

export const weightApi = {
  list: (period: Period) =>
    api.get<{ period: Period; summary: WeightSummary; period_change: { first_kg: number | null; last_kg: number | null; change_kg: number | null }; entries: WeightEntry[] }>('/weights', { period }),
  create: (body: { weight_kg: number; measured_on?: string; measured_at?: string | null; notes?: string | null }) => api.post<WeightEntry>('/weights', body),
  update: (id: string, body: { weight_kg?: number; measured_on?: string; measured_at?: string | null; notes?: string | null }) => api.patch<WeightEntry>(`/weights/${id}`, body),
  remove: (id: string) => api.delete<null>(`/weights/${id}`),
};

export const waterApi = {
  day: (date?: string) => api.get<WaterDay>('/water', { date }),
  history: (days: number) => api.get<{ from: string; to: string; days: { date: string; total_ml: number }[] }>('/water/history', { days }),
  add: (amount_ml: number, extra?: { date?: string; time?: string }) => api.post<WaterEntry>('/water', { amount_ml, ...extra }),
  update: (id: string, body: { amount_ml?: number; time?: string }) => api.patch<WaterEntry>(`/water/${id}`, body),
  remove: (id: string) => api.delete<null>(`/water/${id}`),
};

export const measurementsApi = {
  list: (type?: MeasurementType) => api.get<{ latest: MeasurementLatest[]; entries: BodyMeasurement[] }>('/measurements', { type }),
  create: (body: { measured_on?: string; notes?: string | null; values: Partial<Record<MeasurementType, number>> }) => api.post<BodyMeasurement[]>('/measurements', body),
  update: (id: string, body: { value?: number; measured_on?: string; notes?: string | null }) => api.patch<BodyMeasurement>(`/measurements/${id}`, body),
  remove: (id: string) => api.delete<null>(`/measurements/${id}`),
};
