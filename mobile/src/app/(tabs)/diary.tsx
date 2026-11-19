import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Copy, MoreVertical, Pencil, Plus, Trash2, Utensils } from 'lucide-react-native';

import { ApiError } from '@/api/client';
import { diaryApi } from '@/api/endpoints';
import type { Meal, MealItem } from '@/api/types';
import { AddMealSheet } from '@/components/diary/AddMealSheet';
import { EditItemSheet } from '@/components/diary/EditItemSheet';
import { Button, Card, confirm, DateInput, EmptyState, ErrorState, IconButton, MenuRow, Screen, Sheet, SkeletonList, Text, WeekStrip } from '@/components/ui';
import { invalidate, useApiMutation, useDiary } from '@/features/queries';
import { addDays, friendlyDate, parseISODate, weekdayShort } from '@/lib/dates';
import { grams, kcal, num } from '@/lib/format';
import { MEAL_TINT, quantityLabel } from '@/lib/labels';
import { CategoryIcon } from '@/components/food/CategoryIcon';
import { usePicker } from '@/stores/picker';
import { useTheme } from '@/theme/ThemeProvider';
import { radius } from '@/theme/tokens';

export default function DiaryScreen() {
  const { colors } = useTheme();
  const [date, setDate] = useState<string | undefined>(undefined);
  const diary = useDiary(date);
  const today = diary.data?.today;
  const current = date ?? diary.data?.date;
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<MealItem | null>(null);
  const [menuFor, setMenuFor] = useState<Meal | null>(null);
  const [duplicateFor, setDuplicateFor] = useState<Meal | null>(null);
  const setTarget = usePicker((s) => s.setTarget);


  const removeMeal = useApiMutation((id: string) => diaryApi.remove(id), { invalidate: invalidate.diary });

  const go = (delta: number) => current && setDate(addDays(current, delta));
  const goal = diary.data?.goal;
  const totals = diary.data?.totals;

  // semana (segunda a domingo) que contém o dia exibido
  const monday = current ? addDays(current, -((parseISODate(current).getDay() + 6) % 7)) : undefined;
  const week = monday ? Array.from({ length: 7 }, (_, i) => { const dt = addDays(monday, i); return { date: dt, weekday: weekdayShort(dt).slice(0, 3), day: String(Number(dt.slice(8))) }; }) : [];
  const recorded = new Set(diary.data?.recorded_dates ?? []);

  const dateBar = (
    <View style={{ gap: 12 }}>
      <View style={styles.rowBetween}>
        <View>
          <Text variant="title">Diário</Text>
          <Pressable onPress={() => today && setDate(today)} accessibilityRole="button" accessibilityLabel="Voltar para hoje">
            <Text variant="caption" tone="muted">{current && today ? friendlyDate(current, today) : '—'}{current && today && current > today ? ' · planejamento' : ''}</Text>
          </Pressable>
        </View>
        <View style={styles.inline}>
          <IconButton label="Semana anterior" onPress={() => go(-7)} icon={<ChevronLeft size={18} color={colors.text} />} size={40} />
          <IconButton label="Próxima semana" onPress={() => go(7)} icon={<ChevronRight size={18} color={colors.text} />} size={40} />
        </View>
      </View>
      {current && <WeekStrip days={week} selected={current} onSelect={setDate} marked={(d) => recorded.has(d)} />}
    </View>
  );

  if (diary.isPending) return <Screen><SkeletonList type="meals" /></Screen>;
  if (diary.isError) return <Screen>{dateBar}<ErrorState message={diary.error instanceof ApiError ? diary.error.message : undefined} onRetry={() => diary.refetch()} /></Screen>;

  const meals = diary.data.meals;

  return (
    <Screen refreshing={diary.isRefetching} onRefresh={() => void diary.refetch()}>
      {dateBar}

      {meals.length === 0 ? (
        <EmptyState icon={<Utensils size={26} color={colors.primary} />} title="Nenhuma refeição registrada" description="Adicione seu café da manhã, almoço ou outra refeição para acompanhar as calorias e os macronutrientes do dia."
          actionLabel="Adicionar refeição" onAction={() => setAddOpen(true)} />
      ) : (
        <>
          <Card>
            {(() => {
              const total = goal?.kcal ?? totals?.kcal ?? 0;
              const parts = [
                { k: 'Proteínas', kcal: (totals?.protein_g ?? 0) * 4, g: totals?.protein_g, color: colors.protein },
                { k: 'Carbos', kcal: (totals?.carbs_g ?? 0) * 4, g: totals?.carbs_g, color: colors.carbs },
                { k: 'Gorduras', kcal: (totals?.fat_g ?? 0) * 9, g: totals?.fat_g, color: colors.fat },
              ];
              const remaining = goal ? goal.kcal - (totals?.kcal ?? 0) : null;
              const rest = Math.max(0, total - parts.reduce((acc, p) => acc + p.kcal, 0)); // parte não consumida da meta
              return (
                <>
                  <Text variant="label" tone="secondary">{remaining === null ? 'Consumido no dia' : remaining >= 0 ? 'Calorias restantes' : 'Acima da meta'}</Text>
                  <Text variant="bigNumber" size={40}>{kcal(remaining === null ? totals?.kcal : Math.abs(remaining))}<Text variant="label" tone="muted"> kcal</Text></Text>
                  <Text variant="caption" tone="muted">{kcal(totals?.kcal)} consumidas{goal ? ` de ${kcal(goal.kcal)}` : ''}</Text>
                  <View style={[styles.stack, { backgroundColor: colors.surfaceSunken }]}>
                    {parts.map((p) => p.kcal > 0 && <View key={p.k} style={{ flex: p.kcal, backgroundColor: p.color }} />)}
                    {rest > 0 && <View style={{ flex: rest }} />}
                  </View>
                  <View style={styles.legend}>
                    {parts.map((p) => (
                      <View key={p.k} style={styles.inline}>
                        <View style={[styles.legendDot, { backgroundColor: p.color }]} />
                        <Text variant="caption" tone="secondary">{p.k} <Text variant="caption" weight="bold">{grams(p.g)}</Text></Text>
                      </View>
                    ))}
                    <Text variant="caption" tone="muted">Fibras <Text variant="caption" weight="bold">{grams(totals?.fiber_g)}</Text></Text>
                  </View>
                </>
              );
            })()}
          </Card>

          {meals.map((meal) => {
            const open = expanded[meal.id] ?? true; // aberto por padrão
            return (
              <Card key={meal.id} variant={MEAL_TINT[meal.type]} padded={false} style={{ overflow: 'hidden' }}>
                <Pressable onPress={() => setExpanded((p) => ({ ...p, [meal.id]: !open }))} accessibilityRole="button" accessibilityState={{ expanded: open }}
                  style={styles.mealHeader}>
                  <View style={{ flex: 1 }}>
                    <Text variant="heading" style={{ color: colors.onTint }}>{meal.title}</Text>
                    <Text variant="caption" style={{ color: colors.onTint, opacity: 0.75 }}>{meal.time} · {meal.items.length} {meal.items.length === 1 ? 'item' : 'itens'}{meal.notes ? ` · ${meal.notes}` : ''}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text variant="bigNumber" size={22} style={{ color: colors.onTint }}>{kcal(meal.totals.kcal)}<Text variant="caption" style={{ color: colors.onTint }}> kcal</Text></Text>
                  </View>
                  <IconButton label="Opções da refeição" onPress={() => setMenuFor(meal)} icon={<MoreVertical size={16} color={colors.text} />} size={32} />
                  {open ? <ChevronUp size={16} color={colors.onTint} /> : <ChevronDown size={16} color={colors.onTint} />}
                </Pressable>

                {open && (
                  <View style={[styles.itemsBox, { backgroundColor: colors.surface }]}>
                    {meal.items.length === 0 && <Text variant="caption" tone="subtle" style={{ paddingHorizontal: 16, paddingVertical: 12 }}>Nenhum alimento nesta refeição.</Text>}
                    {meal.items.map((item) => (
                      <Pressable key={item.id} onPress={() => setEditing(item)} accessibilityRole="button" accessibilityLabel={`Editar ${item.name}`}
                        style={({ pressed }) => [styles.item, { borderBottomColor: colors.border, backgroundColor: pressed ? colors.surfaceMuted : 'transparent' }]}>
                        <CategoryIcon recipe={item.kind === 'recipe'} size={16} />
                        <View style={{ flex: 1 }}>
                          <Text variant="caption" weight="semibold" numberOfLines={1}>{item.name}</Text>
                          <Text variant="tiny" tone="subtle">{quantityLabel(item.quantity, item.unit, item.portion_label)}</Text>
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                          <Text variant="caption" weight="bold">{kcal(item.nutrients.kcal)} kcal</Text>
                          <Text variant="tiny" tone="subtle">{num(item.nutrients.protein_g)}g P</Text>
                        </View>
                      </Pressable>
                    ))}
                    <Pressable onPress={() => { setTarget({ mode: 'diary', date: meal.date, type: meal.type, mealId: meal.id, label: meal.title }); router.push('/foods/search'); }}
                      accessibilityRole="button" style={({ pressed }) => [styles.addItem, { backgroundColor: pressed ? colors.surfaceMuted : 'transparent' }]}>
                      <View style={[styles.plusRound, { backgroundColor: colors.primary }]}><Plus size={14} color={colors.onPrimary} /></View>
                      <Text variant="caption" weight="semibold" tone="primary">Adicionar alimento ou receita</Text>
                    </Pressable>
                  </View>
                )}
              </Card>
            );
          })}
        </>
      )}

      {meals.length > 0 && <Button fullWidth size="lg" icon={<Plus size={18} color={colors.onPrimary} strokeWidth={2.5} />} onPress={() => setAddOpen(true)}>Adicionar refeição</Button>}

      {current && <AddMealSheet visible={addOpen} onClose={() => setAddOpen(false)} date={current} />}
      <EditItemSheet item={editing} onClose={() => setEditing(null)} />

      <Sheet visible={!!menuFor} onClose={() => setMenuFor(null)} title={menuFor?.title} subtitle={menuFor ? `${menuFor.time} · ${kcal(menuFor.totals.kcal)} kcal` : undefined}>
        <MenuRow icon={<Pencil size={17} color={colors.textSecondary} />} title="Editar refeição" subtitle="Horário, período, observação e itens"
          onPress={() => { const m = menuFor!; setMenuFor(null); router.push({ pathname: '/meals/[id]', params: { id: m.id } }); }} />
        <MenuRow icon={<Copy size={17} color={colors.textSecondary} />} title="Duplicar refeição" subtitle="Copiar para este ou outro dia"
          onPress={() => { setDuplicateFor(menuFor); setMenuFor(null); }} />
        <MenuRow tone="danger" icon={<Trash2 size={17} color={colors.danger} />} title="Excluir refeição"
          onPress={async () => {
            const m = menuFor!;
            setMenuFor(null);
            if (await confirm('Excluir refeição?', `"${m.title}" e seus ${m.items.length} itens serão excluídos.`)) removeMeal.mutate(m.id);
          }} />
      </Sheet>

      <DuplicateSheet meal={duplicateFor} today={today} onClose={() => setDuplicateFor(null)} onDone={(d) => setDate(d)} />
    </Screen>
  );
}

function DuplicateSheet({ meal, today, onClose, onDone }: { meal: Meal | null; today?: string; onClose: () => void; onDone: (date: string) => void }) {
  if (!meal) return null;
  return <DuplicateSheetBody key={meal.id} meal={meal} today={today} onClose={onClose} onDone={onDone} />;
}

function DuplicateSheetBody({ meal, today, onClose, onDone }: { meal: Meal; today?: string; onClose: () => void; onDone: (date: string) => void }) {
  const { colors } = useTheme();
  const [target, setTarget] = useState<string | null>(today ?? meal.date);
  const duplicate = useApiMutation((v: { id: string; date: string }) => diaryApi.duplicate(v.id, { date: v.date }), {
    invalidate: invalidate.diary,
    onSuccess: (m) => { onClose(); onDone(m.date); },
  });
  return (
    <Sheet visible onClose={onClose} title="Duplicar refeição" subtitle={`${meal.title} · ${meal.items.length} itens`}>
      <DateInput label="Para qual dia?" value={target} onChange={setTarget} error={target ? undefined : 'Informe uma data válida.'} />
      <Text variant="caption" tone="muted">Os itens são copiados com os mesmos valores nutricionais registrados.</Text>
      <Button fullWidth size="lg" disabled={!target} loading={duplicate.isPending} icon={<Copy size={16} color={colors.onPrimary} />} onPress={() => target && duplicate.mutate({ id: meal.id, date: target })}>Duplicar</Button>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  inline: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  stack: { flexDirection: 'row', height: 14, borderRadius: radius.full, overflow: 'hidden', marginTop: 14 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 14, rowGap: 6, marginTop: 12 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  mealHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 18 },
  itemsBox: { marginHorizontal: 10, marginBottom: 10, borderRadius: radius.lg, overflow: 'hidden' },
  plusRound: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  item: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 11, borderBottomWidth: StyleSheet.hairlineWidth },
  addItem: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 12 },
});
