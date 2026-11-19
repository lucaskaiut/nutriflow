import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { ChevronRight } from 'lucide-react-native';

import type { MealType } from '@/api/types';
import { Input, OptionTile, Sheet, Text } from '@/components/ui';
import { nowTime } from '@/lib/dates';
import { MEAL_TYPES, mealTypeLabel, suggestedMealType } from '@/lib/labels';
import { usePicker } from '@/stores/picker';
import { useTheme } from '@/theme/ThemeProvider';
import { radius } from '@/theme/tokens';

const OPTIONS = [
  { id: 'food', title: 'Alimento', subtitle: 'Em gramas, unidades ou medidas caseiras' },
  { id: 'recipe', title: 'Receita', subtitle: 'Por porção, com o valor calculado da receita' },
  { id: 'saved', title: 'Refeição salva', subtitle: 'Uma combinação que você já montou' },
] as const;

/** "Adicionar ao diário": período da refeição + forma de inserção (como no protótipo). */
export function AddMealSheet({ visible, onClose, date, preselected }: { visible: boolean; onClose: () => void; date: string; preselected?: MealType }) {
  return (
    <Sheet visible={visible} onClose={onClose} title="Adicionar ao diário">
      {visible && <AddMealBody onClose={onClose} date={date} preselected={preselected} />}
    </Sheet>
  );
}

/** Montado a cada abertura: o período sugerido acompanha o horário atual. */
function AddMealBody({ onClose, date, preselected }: { onClose: () => void; date: string; preselected?: MealType }) {
  const { colors } = useTheme();
  const setTarget = usePicker((s) => s.setTarget);
  const [type, setType] = useState<MealType>(() => preselected ?? suggestedMealType(nowTime()));
  const [customName, setCustomName] = useState('');
  const [error, setError] = useState<string>();

  const choose = (option: (typeof OPTIONS)[number]['id']) => {
    if (type === 'custom' && customName.trim().length === 0) {
      setError('Dê um nome para a refeição personalizada.');
      return;
    }
    const label = type === 'custom' ? customName.trim() : mealTypeLabel(type);
    setTarget({ mode: 'diary', date, type, label, customName: type === 'custom' ? customName.trim() : undefined });
    onClose();
    if (option === 'saved') router.push({ pathname: '/saved-meals', params: { pick: '1' } });
    else router.push({ pathname: '/foods/search', params: { tab: option === 'recipe' ? 'recipes' : 'foods' } });
  };

  return (
    <>
      <Text variant="label" tone="secondary">Refeição</Text>
      <View style={styles.grid}>
        {MEAL_TYPES.map((m) => (
          <View key={m.id} style={styles.cell}>
            <OptionTile compact selected={type === m.id} onPress={() => setType(m.id)} title={m.label} subtitle={m.time || 'Defina o nome'} />
          </View>
        ))}
      </View>
      {type === 'custom' && <Input label="Nome da refeição" value={customName} onChangeText={(v) => { setCustomName(v); setError(undefined); }} placeholder="Ex: Pré-treino" error={error} maxLength={80} />}

      <View style={[styles.divider, { borderTopColor: colors.border }]}>
        <Text variant="label" tone="secondary">Adicionar</Text>
      </View>
      <View style={[styles.options, { borderColor: colors.border }]}>
        {OPTIONS.map((o, i) => (
          <Pressable key={o.id} onPress={() => choose(o.id)} accessibilityRole="button"
            style={({ pressed }) => [styles.option, { borderTopColor: colors.border, borderTopWidth: i === 0 ? 0 : StyleSheet.hairlineWidth, backgroundColor: pressed ? colors.surfaceMuted : colors.surface }]}>
            <View style={{ flex: 1 }}>
              <Text variant="caption" weight="bold">{o.title}</Text>
              <Text variant="tiny" tone="subtle" style={{ marginTop: 2 }}>{o.subtitle}</Text>
            </View>
            <ChevronRight size={18} color={colors.textSubtle} />
          </Pressable>
        ))}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  cell: { width: '48.5%' },
  divider: { borderTopWidth: 1, paddingTop: 12 },
  options: { borderWidth: 1, borderRadius: radius.lg, overflow: 'hidden' },
  option: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 13 },
});
