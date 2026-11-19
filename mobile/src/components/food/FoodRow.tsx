import { Pressable, StyleSheet, View } from 'react-native';
import { Plus, Star } from 'lucide-react-native';

import type { Food } from '@/api/types';
import { Text } from '@/components/ui';
import { kcal, num } from '@/lib/format';
import { CategoryIcon } from './CategoryIcon';
import { useTheme } from '@/theme/ThemeProvider';

export function FoodRow({ food, onPress, showAdd = true }: { food: Food; onPress: () => void; showAdd?: boolean }) {
  const { colors } = useTheme();
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={food.name}
      style={({ pressed }) => [styles.row, { backgroundColor: pressed ? colors.surfaceSunken : colors.surface, borderBottomColor: colors.border }]}>
      <View style={styles.icon}><CategoryIcon slug={food.category?.slug} /></View>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Text variant="caption" weight="bold" numberOfLines={2} style={{ flexShrink: 1 }}>{food.name}</Text>
          {food.is_favorite && <Star size={12} color={colors.star} fill={colors.star} />}
        </View>
        <Text variant="tiny" tone="subtle" style={{ marginTop: 2 }} numberOfLines={1}>
          {num(food.reference_amount, 1)} {food.reference_unit} · {food.is_custom ? 'Personalizado' : food.category?.name ?? 'Sem categoria'}
        </Text>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Text variant="number" size={12}>{kcal(food.nutrients.kcal)} kcal</Text>
        <Text variant="tiny" tone="subtle">{num(food.nutrients.protein_g)} g proteína</Text>
      </View>
      {showAdd && <Plus size={18} color={colors.primary} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  icon: { width: 20, alignItems: 'center' },
});
