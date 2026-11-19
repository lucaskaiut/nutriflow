import { StyleSheet, View } from 'react-native';

import type { Nutrients } from '@/api/types';
import { Card, Text } from '@/components/ui';
import { grams, kcal } from '@/lib/format';
import { useTheme } from '@/theme/ThemeProvider';

/** Calorias + macronutrientes de um alimento, receita ou refeição, num único bloco. */
export function NutritionPanel({ title, subtitle, n }: { title: string; subtitle?: string; n: Nutrients | null }) {
  const { colors } = useTheme();
  return (
    <Card>
      <View style={styles.rowBetween}>
        <Text variant="label" tone="secondary">{title}</Text>
        {subtitle ? <Text variant="caption" tone="subtle">{subtitle}</Text> : null}
      </View>
      <Text variant="bigNumber" size={28} style={{ marginTop: 2 }}>{kcal(n?.kcal)}<Text variant="label" tone="muted"> kcal</Text></Text>
      <View style={[styles.macros, { borderTopColor: colors.border }]}>
        {([['Proteínas', n?.protein_g, colors.protein], ['Carboidratos', n?.carbs_g, colors.carbs], ['Gorduras', n?.fat_g, colors.fat], ['Fibras', n?.fiber_g, colors.textSecondary]] as const).map(([label, v, color]) => (
          <View key={label} style={{ flex: 1 }}>
            <Text variant="tiny" tone="muted" numberOfLines={1}>{label}</Text>
            <Text variant="number" size={14} style={{ color }}>{v === null || v === undefined ? '—' : grams(v)}</Text>
          </View>
        ))}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  macros: { flexDirection: 'row', gap: 8, marginTop: 14, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth },
});
