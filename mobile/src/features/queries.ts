import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';

import { ApiError } from '@/api/client';
import {
  accountApi, dashboardApi, diaryApi, foodsApi, goalsApi, measurementsApi, recipesApi, savedMealsApi, waterApi, weightApi,
} from '@/api/endpoints';
import type { MeasurementType, Period } from '@/api/types';
import { toast } from '@/stores/toast';

export const keys = {
  me: ['me'] as const,
  dashboard: (date?: string) => ['dashboard', date ?? 'today'] as const,
  report: (p: Period) => ['report', p] as const,
  goals: ['goals'] as const,
  diary: (date?: string) => ['diary', date ?? 'today'] as const,
  meal: (id: string) => ['meal', id] as const,
  foods: (params: object) => ['foods', params] as const,
  food: (id: string) => ['food', id] as const,
  recentFoods: ['foods', 'recent'] as const,
  categories: ['food-categories'] as const,
  recipes: (params: object) => ['recipes', params] as const,
  recipe: (id: string) => ['recipe', id] as const,
  recipeUsage: (id: string) => ['recipe', id, 'usage'] as const,
  savedMeals: (filter?: string) => ['saved-meals', filter ?? 'all'] as const,
  savedMeal: (id: string) => ['saved-meal', id] as const,
  weights: (p: Period) => ['weights', p] as const,
  water: (date?: string) => ['water', date ?? 'today'] as const,
  waterHistory: (days: number) => ['water-history', days] as const,
  measurements: (type?: MeasurementType) => ['measurements', type ?? 'all'] as const,
};

/** Invalidação por área: depois de qualquer alteração, as telas relacionadas recarregam. */
export const invalidate = {
  diary: (qc: QueryClient) =>
    Promise.all(['diary', 'dashboard', 'report', 'meal', 'foods', 'recipe'].map((k) => qc.invalidateQueries({ queryKey: [k] }))),
  water: (qc: QueryClient) => Promise.all(['water', 'water-history', 'dashboard', 'report'].map((k) => qc.invalidateQueries({ queryKey: [k] }))),
  weight: (qc: QueryClient) => Promise.all(['weights', 'dashboard', 'report', 'me', 'goals'].map((k) => qc.invalidateQueries({ queryKey: [k] }))),
  goals: (qc: QueryClient) => Promise.all(['goals', 'dashboard', 'report', 'diary', 'water', 'me'].map((k) => qc.invalidateQueries({ queryKey: [k] }))),
  foods: (qc: QueryClient) => Promise.all(['foods', 'food', 'recipes', 'recipe', 'saved-meals', 'saved-meal'].map((k) => qc.invalidateQueries({ queryKey: [k] }))),
  recipes: (qc: QueryClient) => Promise.all(['recipes', 'recipe', 'saved-meals', 'saved-meal'].map((k) => qc.invalidateQueries({ queryKey: [k] }))),
  savedMeals: (qc: QueryClient) => Promise.all(['saved-meals', 'saved-meal'].map((k) => qc.invalidateQueries({ queryKey: [k] }))),
  measurements: (qc: QueryClient) => qc.invalidateQueries({ queryKey: ['measurements'] }),
  account: (qc: QueryClient) => Promise.all(['me', 'goals', 'dashboard', 'weights'].map((k) => qc.invalidateQueries({ queryKey: [k] }))),
};

export const useAccount = (enabled = true) => useQuery({ queryKey: keys.me, queryFn: async () => (await accountApi.me()).data, enabled });
export const useDashboard = () => useQuery({ queryKey: keys.dashboard(), queryFn: async () => (await dashboardApi.get()).data });
export const useReport = (p: Period) => useQuery({ queryKey: keys.report(p), queryFn: async () => (await dashboardApi.report(p)).data });
export const useGoals = () => useQuery({ queryKey: keys.goals, queryFn: async () => (await goalsApi.get()).data });
export const useDiary = (date?: string) => useQuery({ queryKey: keys.diary(date), queryFn: async () => (await diaryApi.day(date)).data });
export const useMeal = (id: string) => useQuery({ queryKey: keys.meal(id), queryFn: async () => (await diaryApi.meal(id)).data, enabled: !!id });
export const useFood = (id: string) => useQuery({ queryKey: keys.food(id), queryFn: async () => (await foodsApi.get(id)).data, enabled: !!id });
export const useRecentFoods = () => useQuery({ queryKey: keys.recentFoods, queryFn: async () => (await foodsApi.recent()).data });
export const useCategories = () => useQuery({ queryKey: keys.categories, queryFn: async () => (await foodsApi.categories()).data, staleTime: Infinity });
export const useFoodSearch = (params: { q?: string; category?: string; scope?: 'all' | 'favorites' | 'custom' }) =>
  useQuery({ queryKey: keys.foods(params), queryFn: async () => (await foodsApi.search(params)).data, placeholderData: (prev) => prev });
export const useRecipes = (params: { q?: string; filter?: 'all' | 'favorites' | 'recent' | 'archived' }) =>
  useQuery({ queryKey: keys.recipes(params), queryFn: async () => (await recipesApi.list(params)).data, placeholderData: (prev) => prev });
export const useRecipe = (id: string) => useQuery({ queryKey: keys.recipe(id), queryFn: async () => (await recipesApi.get(id)).data, enabled: !!id });
export const useRecipeUsage = (id: string) => useQuery({ queryKey: keys.recipeUsage(id), queryFn: async () => (await recipesApi.usage(id)).data, enabled: !!id });
export const useSavedMeals = (filter?: 'all' | 'favorites') => useQuery({ queryKey: keys.savedMeals(filter), queryFn: async () => (await savedMealsApi.list(filter)).data });
export const useSavedMeal = (id: string) => useQuery({ queryKey: keys.savedMeal(id), queryFn: async () => (await savedMealsApi.get(id)).data, enabled: !!id });
export const useWeights = (p: Period) => useQuery({ queryKey: keys.weights(p), queryFn: async () => (await weightApi.list(p)).data, placeholderData: (prev) => prev });
export const useWater = (date?: string) => useQuery({ queryKey: keys.water(date), queryFn: async () => (await waterApi.day(date)).data });
export const useWaterHistory = (days: number) => useQuery({ queryKey: keys.waterHistory(days), queryFn: async () => (await waterApi.history(days)).data });
export const useMeasurements = (type?: MeasurementType) => useQuery({ queryKey: keys.measurements(type), queryFn: async () => (await measurementsApi.list(type)).data });

/**
 * Mutação padrão: toast de sucesso com a mensagem da API (só após confirmação do servidor),
 * toast de erro com a mensagem tratada, e invalidação das telas afetadas.
 */
export function useApiMutation<TVars, TData>(
  fn: (vars: TVars) => Promise<{ data: TData; message: string | null }>,
  options: { invalidate?: (qc: QueryClient) => unknown; successMessage?: string | false; onSuccess?: (data: TData, vars: TVars) => void; silentError?: boolean } = {},
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: async (res, vars) => {
      await options.invalidate?.(qc);
      if (options.successMessage !== false) {
        const msg = options.successMessage ?? res.message;
        if (msg) toast.success(msg);
      }
      options.onSuccess?.(res.data, vars);
    },
    onError: (error) => {
      if (!options.silentError) toast.error(error instanceof ApiError ? error.firstError : 'Não foi possível concluir a operação.');
    },
  });
}
