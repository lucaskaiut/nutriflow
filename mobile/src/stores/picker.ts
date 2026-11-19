import { create } from 'zustand';

import type { Food, FoodPortion, MealType, Nutrients, QuantityUnit, Recipe } from '@/api/types';

/** Item escolhido no fluxo de busca (alimento com quantidade, ou receita com porções). */
export type PickedItem = {
  kind: 'food' | 'recipe';
  food?: Pick<Food, 'id' | 'name' | 'reference_unit' | 'reference_amount' | 'nutrients' | 'category'>;
  recipe?: Pick<Recipe, 'id' | 'name'>;
  quantity: number;
  unit: QuantityUnit;
  portion?: FoodPortion | null;
  preview: Nutrients | null;
};

/**
 * Para onde vai o item escolhido na busca:
 *  - diary: registra no diário (refeição existente ou nova, na data/período escolhidos)
 *  - ingredient / saved: devolve o item ao formulário de receita / refeição salva
 */
export type PickTarget =
  | { mode: 'diary'; date: string; type: MealType; mealId?: string; customName?: string; label: string }
  | { mode: 'ingredient'; label: string; onPick: (item: PickedItem) => void }
  | { mode: 'saved'; label: string; onPick: (item: PickedItem) => void };

export const usePicker = create<{ target: PickTarget | null; setTarget: (t: PickTarget | null) => void }>((set) => ({
  target: null,
  setTarget: (target) => set({ target }),
}));

export function itemToInput(item: PickedItem) {
  return item.kind === 'recipe'
    ? { kind: 'recipe' as const, recipe_id: item.recipe!.id, quantity: item.quantity }
    : { kind: 'food' as const, food_id: item.food!.id, quantity: item.quantity, unit: item.unit, portion_id: item.portion?.id ?? null };
}
