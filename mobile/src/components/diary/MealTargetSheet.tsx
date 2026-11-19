import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Check } from 'lucide-react-native';

import type { MealType } from '@/api/types';
import { Button, DateInput, Input, OptionTile, Sheet, Text } from '@/components/ui';
import { nowTime, todayLocal } from '@/lib/dates';
import { MEAL_TYPES, mealTypeLabel, suggestedMealType } from '@/lib/labels';
import type { PickTarget } from '@/stores/picker';
import { useTheme } from '@/theme/ThemeProvider';

/** Escolhe em qual refeição/data registrar (quando o fluxo não começou pelo diário). */
type Props = {
  visible: boolean; onClose: () => void; onConfirm: (t: Extract<PickTarget, { mode: 'diary' }>) => void; loading?: boolean; confirmLabel?: string; defaultType?: MealType | null;
};

export function MealTargetSheet(props: Props) {
  return (
    <Sheet visible={props.visible} onClose={props.onClose} title="Registrar no diário">
      {props.visible && <MealTargetBody {...props} />}
    </Sheet>
  );
}

function MealTargetBody({ onConfirm, loading, confirmLabel = 'Adicionar ao diário', defaultType }: Props) {
  const { colors } = useTheme();
  const [type, setType] = useState<MealType>(() => defaultType ?? suggestedMealType(nowTime()));
  const [date, setDate] = useState<string | null>(() => todayLocal());
  const [customName, setCustomName] = useState('');

  const invalid = !date || (type === 'custom' && !customName.trim());

  return (
    <>
      <DateInput label="Data" value={date} onChange={setDate} error={date ? undefined : 'Informe uma data válida.'} />
      <Text variant="label" weight="bold" tone="secondary">Período</Text>
      <View style={styles.grid}>
        {MEAL_TYPES.map((m) => (
          <View key={m.id} style={styles.cell}><OptionTile compact selected={type === m.id} onPress={() => setType(m.id)} title={m.label} subtitle={m.time || 'Defina o nome'} /></View>
        ))}
      </View>
      {type === 'custom' && <Input label="Nome da refeição" value={customName} onChangeText={setCustomName} placeholder="Ex: Pré-treino" maxLength={80} />}
      <Button fullWidth size="lg" disabled={invalid} loading={loading} icon={<Check size={18} color={colors.onPrimary} />}
        onPress={() => date && onConfirm({ mode: 'diary', date, type, customName: type === 'custom' ? customName.trim() : undefined, label: type === 'custom' ? customName.trim() : mealTypeLabel(type) })}>
        {confirmLabel}
      </Button>
    </>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  cell: { width: '48.5%' },
});
