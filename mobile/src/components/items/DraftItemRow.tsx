import { StyleSheet, TextInput, View } from 'react-native';
import { Trash2 } from 'lucide-react-native';

import type { Nutrients, QuantityUnit } from '@/api/types';
import { IconButton, Text } from '@/components/ui';
import { kcal, num, parseDecimal } from '@/lib/format';
import { UNIT_LABELS } from '@/lib/labels';
import { scaleNutrients } from '@/lib/nutritionPreview';
import { useTheme } from '@/theme/ThemeProvider';
import { fonts, radius } from '@/theme/tokens';

/** Item em edição (ingrediente / item de refeição salva). */
export type DraftItem = {
  key: string;
  kind: 'food' | 'recipe';
  id: string; // food_id ou recipe_id
  name: string;
  quantity: string; // texto digitado
  unit: QuantityUnit;
  portion: { id: string; label: string; amount: number } | null;
  /** nutrientes por 1 unidade de "quantity" (para a prévia linear) */
  perUnit: Nutrients | null;
  unavailable?: boolean;
};

export function draftPreview(item: DraftItem): Nutrients | null {
  const q = parseDecimal(item.quantity);
  return item.perUnit && q > 0 ? scaleNutrients(item.perUnit, q) : null;
}

export function DraftItemRow({ item, onChange, onRemove }: { item: DraftItem; onChange: (quantity: string) => void; onRemove: () => void }) {
  const { colors } = useTheme();
  const preview = draftPreview(item);
  const invalid = !(parseDecimal(item.quantity) > 0);
  const unitLabel = item.unit === 'portion' ? item.portion?.label ?? 'medida' : item.unit === 'serving' ? 'porção(ões)' : UNIT_LABELS[item.unit];

  return (
    <View style={[styles.row, { backgroundColor: colors.surfaceMuted, borderColor: item.unavailable ? colors.dangerBorder : colors.border }]}>
      <View style={{ flex: 1 }}>
        <Text variant="caption" weight="semibold" numberOfLines={2}>{item.name}</Text>
        <Text variant="tiny" tone={item.unavailable ? 'danger' : 'subtle'}>{item.unavailable ? 'Item removido — exclua da lista' : `${kcal(preview?.kcal)} kcal · P ${num(preview?.protein_g)}g`}</Text>
      </View>
      <View style={[styles.qty, { backgroundColor: colors.surface, borderColor: invalid ? colors.danger : colors.borderStrong }]}>
        <TextInput value={item.quantity} onChangeText={onChange} keyboardType="decimal-pad" accessibilityLabel={`Quantidade de ${item.name}`}
          style={[styles.input, { color: colors.text }]} />
        <Text variant="tiny" tone="subtle" numberOfLines={1} style={{ maxWidth: 70 }}>{unitLabel}</Text>
      </View>
      <IconButton label={`Remover ${item.name}`} variant="plain" onPress={onRemove} icon={<Trash2 size={15} color={colors.textSubtle} />} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, borderRadius: radius.md, borderWidth: 1 },
  qty: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderRadius: radius.sm, paddingHorizontal: 8, minHeight: 36 },
  input: { minWidth: 44, fontFamily: fonts.bold, fontSize: 13, paddingVertical: 4, textAlign: 'right' },
});
