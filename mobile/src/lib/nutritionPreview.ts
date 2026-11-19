import type { Food, FoodPortion, Nutrients, QuantityUnit } from '@/api/types';

/**
 * PRÉ-VISUALIZAÇÃO enquanto a pessoa digita (ex.: quantidade no detalhe do alimento).
 * Os valores gravados são sempre calculados no servidor (NutritionCalculator, decimal exato);
 * a mesma fórmula é aplicada aqui apenas para feedback imediato na tela.
 */
const FACTORS: Partial<Record<QuantityUnit, number>> = { g: 1, ml: 1, un: 1, kg: 1000, l: 1000 };

export function referenceQuantity(quantity: number, unit: QuantityUnit, portion?: Pick<FoodPortion, 'amount'> | null): number | null {
  if (!(quantity > 0)) return null;
  if (unit === 'portion') return portion ? quantity * portion.amount : null;
  const f = FACTORS[unit];
  return f ? quantity * f : null;
}

export function scaleNutrients(n: Nutrients, factor: number): Nutrients {
  const s = (v: number | null) => (v === null ? null : v * factor);
  return { kcal: s(n.kcal), protein_g: s(n.protein_g), carbs_g: s(n.carbs_g), fat_g: s(n.fat_g), fiber_g: s(n.fiber_g) };
}

export function previewFood(food: Pick<Food, 'nutrients' | 'reference_amount'>, quantity: number, unit: QuantityUnit, portion?: FoodPortion | null): Nutrients | null {
  const base = referenceQuantity(quantity, unit, portion);
  return base === null ? null : scaleNutrients(food.nutrients, base / food.reference_amount);
}

export function sumNutrients(list: Nutrients[]): Nutrients {
  const add = (k: keyof Nutrients) => list.reduce((acc, n) => acc + (n[k] ?? 0), 0);
  return { kcal: add('kcal'), protein_g: add('protein_g'), carbs_g: add('carbs_g'), fat_g: add('fat_g'), fiber_g: add('fiber_g') };
}

export const ZERO: Nutrients = { kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0, fiber_g: 0 };
