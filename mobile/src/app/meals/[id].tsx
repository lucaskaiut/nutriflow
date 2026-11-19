import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Check, Plus, Trash2 } from 'lucide-react-native';

import { ApiError } from '@/api/client';
import { diaryApi } from '@/api/endpoints';
import type { Meal, MealItem, MealType } from '@/api/types';
import { EditItemSheet } from '@/components/diary/EditItemSheet';
import { NutritionPanel } from '@/components/food/NutritionPanel';
import { Button, Card, confirm, DateInput, ErrorState, Input, OptionTile, Screen, SkeletonList, StackHeader, Text } from '@/components/ui';
import { invalidate, useApiMutation, useMeal } from '@/features/queries';
import { kcal, num } from '@/lib/format';
import { MEAL_TYPES, quantityLabel } from '@/lib/labels';
import { usePicker } from '@/stores/picker';
import { useTheme } from '@/theme/ThemeProvider';
import { radius } from '@/theme/tokens';

/** Editar refeição do diário: data, horário, período, nome, observação e itens. */
export default function MealEditScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const meal = useMeal(id);

  if (meal.isPending) return <Screen header={<StackHeader title="Refeição" />}><SkeletonList type="list" /></Screen>;
  if (meal.isError) return <Screen header={<StackHeader title="Refeição" />}><ErrorState message={meal.error instanceof ApiError ? meal.error.message : undefined} onRetry={() => meal.refetch()} /></Screen>;
  return <MealEditor key={meal.data.id} m={meal.data} />;
}

/** Campos inicializados na montagem; a lista de itens acompanha os dados atualizados. */
function MealEditor({ m }: { m: Meal }) {
  const id = m.id;
  const { colors } = useTheme();
  const setTarget = usePicker((s) => s.setTarget);
  const [date, setDate] = useState<string | null>(m.date);
  const [time, setTime] = useState(m.time);
  const [type, setType] = useState<MealType>(m.type);
  const [customName, setCustomName] = useState(m.custom_name ?? '');
  const [notes, setNotes] = useState(m.notes ?? '');
  const [editing, setEditing] = useState<MealItem | null>(null);

  const save = useApiMutation(() => diaryApi.update(id, { date: date!, time, type, custom_name: type === 'custom' ? customName.trim() : null, notes: notes.trim() || null }), {
    invalidate: invalidate.diary, onSuccess: () => router.back(),
  });
  const remove = useApiMutation(() => diaryApi.remove(id), { invalidate: invalidate.diary, onSuccess: () => router.back() });

  const timeValid = /^([01]\d|2[0-3]):[0-5]\d$/.test(time);
  const valid = !!date && timeValid && (type !== 'custom' || customName.trim().length > 0);

  return (
    <Screen header={<StackHeader title={m.title} subtitle={`${m.items.length} itens · ${kcal(m.totals.kcal)} kcal`} />}>
      <NutritionPanel title="Total da refeição" n={m.totals} />

      <Card style={{ gap: 8 }}>
        <Text variant="caption" weight="bold">Itens</Text>
        {m.items.length === 0 && <Text variant="caption" tone="subtle">Nenhum item nesta refeição.</Text>}
        {m.items.map((item) => (
          <Pressable key={item.id} onPress={() => setEditing(item)} accessibilityRole="button" style={[styles.item, { backgroundColor: colors.surfaceMuted, borderColor: colors.border }]}>
            <View style={{ flex: 1 }}>
              <Text variant="caption" weight="semibold">{item.name}</Text>
              <Text variant="tiny" tone="subtle">{quantityLabel(item.quantity, item.unit, item.portion_label)}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text variant="caption" weight="bold">{kcal(item.nutrients.kcal)} kcal</Text>
              <Text variant="tiny" tone="subtle">P {num(item.nutrients.protein_g)} · C {num(item.nutrients.carbs_g)} · G {num(item.nutrients.fat_g)}</Text>
            </View>
          </Pressable>
        ))}
        <Pressable onPress={() => { setTarget({ mode: 'diary', date: m.date, type: m.type, mealId: m.id, label: m.title }); router.push('/foods/search'); }}
          accessibilityRole="button" style={[styles.add, { borderColor: colors.primary }]}>
          <Plus size={14} color={colors.primary} /><Text variant="caption" weight="bold" tone="primary">Adicionar alimento ou receita</Text>
        </Pressable>
      </Card>

      <Card style={{ gap: 12 }}>
        <Text variant="caption" weight="bold">Dados da refeição</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <View style={{ flex: 1.3 }}><DateInput label="Data" value={date} onChange={setDate} error={date ? undefined : 'Data inválida.'} /></View>
          <View style={{ flex: 1 }}>
            <Input label="Horário" value={time} placeholder="HH:MM" keyboardType="number-pad" maxLength={5}
              onChangeText={(v) => { const d = v.replace(/\D/g, '').slice(0, 4); setTime(d.length > 2 ? `${d.slice(0, 2)}:${d.slice(2)}` : d); }}
              error={timeValid ? undefined : 'Use HH:MM.'} />
          </View>
        </View>
        <View style={styles.grid}>
          {MEAL_TYPES.map((t) => (
            <View key={t.id} style={styles.cell}><OptionTile compact selected={type === t.id} onPress={() => setType(t.id)} title={t.label} /></View>
          ))}
        </View>
        {type === 'custom' && <Input label="Nome da refeição" value={customName} onChangeText={setCustomName} maxLength={80} error={customName.trim() ? undefined : 'Informe o nome.'} />}
        <Input label="Observação (opcional)" value={notes} onChangeText={setNotes} placeholder="Ex: Comi fora, pós-treino…" maxLength={500} />
      </Card>

      <Button fullWidth size="lg" disabled={!valid} loading={save.isPending} icon={<Check size={18} color={colors.onPrimary} />} onPress={() => save.mutate()}>Salvar refeição</Button>
      <Button fullWidth variant="danger" loading={remove.isPending} icon={<Trash2 size={16} color={colors.danger} />}
        onPress={async () => { if (await confirm('Excluir refeição?', `"${m.title}" e seus ${m.items.length} itens serão excluídos.`)) remove.mutate(); }}>Excluir refeição</Button>

      <EditItemSheet item={editing} onClose={() => setEditing(null)} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  item: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, borderRadius: radius.md, borderWidth: 1 },
  add: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: radius.md, borderWidth: 1, borderStyle: 'dashed' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  cell: { width: '48.5%' },
});
