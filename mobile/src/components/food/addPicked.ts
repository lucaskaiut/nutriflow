import type { QueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';

import { diaryApi } from '@/api/endpoints';
import { invalidate } from '@/features/queries';
import { itemToInput, usePicker, type PickTarget, type PickedItem } from '@/stores/picker';
import { toast } from '@/stores/toast';

/**
 * Entrega o item escolhido ao destino: diário (API) ou formulário (receita / refeição salva).
 * `depth` = quantas telas fechar para voltar à origem (busca → detalhe = 2).
 */
export async function deliverPicked(qc: QueryClient, target: PickTarget, item: PickedItem, depth: number) {
  const name = item.food?.name ?? item.recipe?.name ?? 'Item';
  if (target.mode === 'diary') {
    const input = itemToInput(item);
    if (target.mealId) await diaryApi.addItems(target.mealId, [input]);
    else await diaryApi.create({ date: target.date, type: target.type, custom_name: target.customName ?? null, items: [input] });
    await invalidate.diary(qc);
    toast.success(`${name} adicionado a ${target.label}.`);
    usePicker.getState().setTarget(null);
  } else {
    target.onPick(item);
    toast.success(`${name} adicionado.`);
  }
  if (depth > 0) router.dismiss(depth);
}
