import type { DraftItem } from '@/components/items/DraftItemRow';
import type { PickedItem } from '@/stores/picker';
import { scaleNutrients } from './nutritionPreview';
import { num, parseDecimal } from './format';

let seq = 0;
export const draftKey = () => `d${Date.now()}_${seq++}`;

/** Item vindo da busca → linha editável. */
export function pickedToDraft(p: PickedItem): DraftItem {
  return {
    key: draftKey(),
    kind: p.kind,
    id: p.kind === 'recipe' ? p.recipe!.id : p.food!.id,
    name: p.kind === 'recipe' ? p.recipe!.name : p.food!.name,
    quantity: num(p.quantity, 3),
    unit: p.unit,
    portion: p.portion ? { id: p.portion.id, label: p.portion.label, amount: p.portion.amount } : null,
    perUnit: p.preview ? scaleNutrients(p.preview, 1 / p.quantity) : null,
  };
}

export function draftToInput(d: DraftItem) {
  const quantity = parseDecimal(d.quantity);
  return d.kind === 'recipe'
    ? { kind: 'recipe' as const, recipe_id: d.id, quantity }
    : { kind: 'food' as const, food_id: d.id, quantity, unit: d.unit, portion_id: d.portion?.id ?? null };
}
