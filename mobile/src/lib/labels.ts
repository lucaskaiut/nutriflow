import type { ActivityLevel, GoalType, MealType, QuantityUnit } from '@/api/types';
import type { TintName } from '@/theme/tokens';

export const MEAL_TYPES: { id: MealType; label: string; time: string }[] = [
  { id: 'breakfast', label: 'Café da manhã', time: '08:00' },
  { id: 'morning_snack', label: 'Lanche da manhã', time: '10:30' },
  { id: 'lunch', label: 'Almoço', time: '12:30' },
  { id: 'afternoon_snack', label: 'Lanche da tarde', time: '16:00' },
  { id: 'dinner', label: 'Jantar', time: '20:00' },
  { id: 'supper', label: 'Ceia', time: '22:00' },
  { id: 'custom', label: 'Personalizada', time: '' },
];

export const mealTypeLabel = (t: MealType) => MEAL_TYPES.find((m) => m.id === t)?.label ?? t;

/** Período sugerido pelo horário atual. */
export function suggestedMealType(time: string): MealType {
  const h = Number(time.slice(0, 2)) + Number(time.slice(3, 5)) / 60;
  if (h < 10) return 'breakfast';
  if (h < 11.5) return 'morning_snack';
  if (h < 15) return 'lunch';
  if (h < 18.5) return 'afternoon_snack';
  if (h < 21.5) return 'dinner';
  return 'supper';
}

export const GOALS: { id: GoalType; title: string; subtitle: string }[] = [
  { id: 'lose_weight', title: 'Emagrecimento', subtitle: '500 kcal por dia abaixo do gasto estimado' },
  { id: 'maintain_weight', title: 'Manutenção', subtitle: 'Calorias iguais ao gasto estimado' },
  { id: 'gain_muscle', title: 'Ganho de massa muscular', subtitle: '10% acima do gasto, com mais proteína' },
  { id: 'gain_weight', title: 'Ganho de peso', subtitle: 'Calorias 10% acima do gasto estimado' },
];
export const goalLabel = (g: GoalType | null | undefined) => GOALS.find((x) => x.id === g)?.title ?? 'Objetivo não definido';

export const ACTIVITY_LEVELS: { id: ActivityLevel; title: string; subtitle: string }[] = [
  { id: 'sedentary', title: 'Sedentário', subtitle: 'Pouco ou nenhum exercício' },
  { id: 'light', title: 'Levemente ativo', subtitle: 'Exercício leve 1–3×/semana' },
  { id: 'moderate', title: 'Moderadamente ativo', subtitle: 'Exercício moderado 3–5×/semana' },
  { id: 'active', title: 'Muito ativo', subtitle: 'Exercício intenso 6–7×/semana' },
  { id: 'very_active', title: 'Extremamente ativo', subtitle: 'Treinos diários intensos ou trabalho físico' },
];

export const UNIT_LABELS: Record<QuantityUnit, string> = { g: 'g', kg: 'kg', ml: 'ml', l: 'L', un: 'un', portion: 'medida', serving: 'porção' };


export const NUTRIENT_LABELS: Record<string, string> = {
  sodium_mg: 'Sódio', cholesterol_mg: 'Colesterol', calcium_mg: 'Cálcio', iron_mg: 'Ferro', potassium_mg: 'Potássio',
  magnesium_mg: 'Magnésio', phosphorus_mg: 'Fósforo', zinc_mg: 'Zinco', vitamin_c_mg: 'Vitamina C', sugar_g: 'Açúcares', saturated_fat_g: 'Gordura saturada',
};

/** Descrição de quantidade: "150 g", "2 × fatia", "1,5 porção". */
export function quantityLabel(quantity: number, unit: QuantityUnit, portionLabel?: string | null): string {
  const q = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 3 }).format(quantity);
  if (unit === 'portion') return `${q} × ${portionLabel ?? 'medida'}`;
  if (unit === 'serving') return `${q} ${quantity === 1 ? 'porção' : 'porções'}`;
  return `${q} ${UNIT_LABELS[unit]}`;
}

/** Tom pastel de cada período de refeição (apenas identificação visual). */
export const MEAL_TINT: Record<MealType, TintName> = {
  breakfast: 'butter', morning_snack: 'sky', lunch: 'mint', afternoon_snack: 'lilac', dinner: 'lavender', supper: 'sky', custom: 'butter',
};
