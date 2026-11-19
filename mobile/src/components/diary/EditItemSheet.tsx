import { useState } from 'react';
import { View } from 'react-native';
import { Check, Trash2 } from 'lucide-react-native';

import { diaryApi } from '@/api/endpoints';
import type { MealItem } from '@/api/types';
import { Button, Card, confirm, Input, Sheet, Stepper, Text } from '@/components/ui';
import { invalidate, useApiMutation } from '@/features/queries';
import { grams, kcal, num, parseDecimal } from '@/lib/format';
import { quantityLabel, UNIT_LABELS } from '@/lib/labels';
import { scaleNutrients } from '@/lib/nutritionPreview';
import { useTheme } from '@/theme/ThemeProvider';

/**
 * Alterar quantidade de um item do diário. A prévia reescala o snapshot do próprio registro
 * (mesma regra do servidor); valores de alimento/receita editados depois não interferem.
 */
export function EditItemSheet({ item, onClose }: { item: MealItem | null; onClose: () => void }) {
  return item ? <EditItemBody key={item.id} item={item} onClose={onClose} /> : null;
}

function EditItemBody({ item, onClose }: { item: MealItem; onClose: () => void }) {
  const { colors } = useTheme();
  const [qty, setQty] = useState(() => num(item.quantity, 3));

  const update = useApiMutation((v: { id: string; quantity: number }) => diaryApi.updateItem(v.id, { quantity: v.quantity }), { invalidate: invalidate.diary, onSuccess: onClose });
  const remove = useApiMutation((id: string) => diaryApi.removeItem(id), { invalidate: invalidate.diary, onSuccess: onClose });

  const isRecipe = item.kind === 'recipe';
  const value = parseDecimal(qty);
  const valid = value > 0 && value <= 100000;
  const preview = valid ? scaleNutrients(item.nutrients, value / item.quantity) : null;
  const step = isRecipe ? 0.5 : item.unit === 'g' || item.unit === 'ml' ? 10 : 1;

  return (
    <Sheet visible onClose={onClose} title={item.name} subtitle={`Registrado: ${quantityLabel(item.quantity, item.unit, item.portion_label)}`}>
      <Card style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ flex: 1 }}>
          <Text variant="caption" weight="bold">{isRecipe ? 'Porções consumidas' : 'Quantidade'}</Text>
          <Text variant="tiny" tone="muted">{isRecipe ? 'Independe do rendimento da receita' : `Unidade: ${item.unit === 'portion' ? item.portion_label : UNIT_LABELS[item.unit]}`}</Text>
        </View>
        <Stepper value={valid ? value : item.quantity} onChange={(v) => setQty(num(v, 3))} step={step} min={step} decimals={isRecipe ? 1 : 0} label="quantidade" />
      </Card>
      <Input label="Ou digite o valor" value={qty} onChangeText={setQty} keyboardType="decimal-pad" error={qty && !valid ? 'Informe uma quantidade maior que zero.' : undefined} />
      <Card>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <Text variant="caption" tone="muted">Novo total</Text>
          <Text variant="bigNumber">{kcal(preview?.kcal)} <Text variant="label" tone="muted">kcal</Text></Text>
        </View>
        <Text variant="caption" tone="muted" style={{ marginTop: 6 }}>
          Proteínas {grams(preview?.protein_g)} · Carbos {grams(preview?.carbs_g)} · Gorduras {grams(preview?.fat_g)} · Fibras {grams(preview?.fiber_g)}
        </Text>
      </Card>
      <Button fullWidth size="lg" loading={update.isPending} disabled={!valid} icon={<Check size={18} color={colors.onPrimary} />} onPress={() => update.mutate({ id: item.id, quantity: value })}>Salvar quantidade</Button>
      <Button fullWidth variant="danger" loading={remove.isPending} icon={<Trash2 size={16} color={colors.danger} />}
        onPress={async () => { if (await confirm('Remover item?', `"${item.name}" será removido desta refeição.`, 'Remover')) remove.mutate(item.id); }}>
        Remover da refeição
      </Button>
    </Sheet>
  );
}
