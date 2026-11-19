import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Droplets, Plus, Scale } from 'lucide-react-native';

import { ApiError } from '@/api/client';
import { waterApi } from '@/api/endpoints';
import { AddMealSheet } from '@/components/diary/AddMealSheet';
import { Card, EmptyState, ErrorState, LineChart, PillBars, RingGauge, Screen, SkeletonList, Text } from '@/components/ui';
import { invalidate, useAccount, useApiMutation, useDashboard } from '@/features/queries';
import { friendlyDate } from '@/lib/dates';
import { MEAL_TINT } from '@/lib/labels';
import { kcal, num, signed, weight } from '@/lib/format';
import { useTheme } from '@/theme/ThemeProvider';
import { radius } from '@/theme/tokens';

export default function HomeScreen() {
  const { colors } = useTheme();
  const dashboard = useDashboard();
  const account = useAccount();
  const prefs = account.data?.preferences;
  const [addOpen, setAddOpen] = useState(false);
  const quickWater = useApiMutation((ml: number) => waterApi.add(ml), { invalidate: invalidate.water });

  if (dashboard.isPending) return <Screen><SkeletonList type="dashboard" /></Screen>;
  if (dashboard.isError) return <Screen><ErrorState message={dashboard.error instanceof ApiError ? dashboard.error.message : undefined} onRetry={() => dashboard.refetch()} /></Screen>;

  const d = dashboard.data;
  const consumed = d.nutrition.consumed;
  const goal = d.nutrition.goal;
  const hasRecords = d.meals.length > 0 || d.water.total_ml > 0;
  const overGoal = goal ? (consumed.kcal ?? 0) > goal.kcal : false;
  const change = d.weight.change_kg;

  const pct = goal ? Math.round(((consumed.kcal ?? 0) / goal.kcal) * 100) : null;

  return (
    <Screen refreshing={dashboard.isRefetching} onRefresh={() => void dashboard.refetch()}>
      <Text variant="caption" tone="muted" style={{ marginTop: -4 }}>{friendlyDate(d.date, d.today)}</Text>

      {/* Calorias do dia */}
      <Card variant="mint">
        <View style={styles.hero}>
          <View style={{ flex: 1, gap: 2 }}>
            <Text variant="label" style={{ color: colors.onTint }}>Calorias de hoje</Text>
            <Text variant="bigNumber" size={44} style={{ color: colors.onTint }}>{kcal(consumed.kcal)}</Text>
            <Text variant="caption" style={{ color: colors.onTint }}>{goal ? `de ${kcal(goal.kcal)} kcal` : 'kcal · sem meta definida'}</Text>
            {d.nutrition.remaining_kcal !== null ? (
              <View style={[styles.chip, { backgroundColor: colors.surface }]}>
                <Text variant="caption" weight="semibold" tone={d.nutrition.remaining_kcal >= 0 ? 'default' : 'warning'}>
                  {d.nutrition.remaining_kcal >= 0 ? `Restam ${kcal(d.nutrition.remaining_kcal)} kcal` : `${kcal(Math.abs(d.nutrition.remaining_kcal))} kcal acima`}
                </Text>
              </View>
            ) : (
              <Pressable onPress={() => router.push('/goals')} style={[styles.chip, { backgroundColor: colors.surface }]}><Text variant="caption" weight="semibold" tone="primary">Definir metas</Text></Pressable>
            )}
          </View>
          <RingGauge value={consumed.kcal ?? 0} max={goal?.kcal} size={124} stroke={14} color={overGoal ? colors.warning : colors.primary}>
            <Text variant="bigNumber" size={26} style={{ color: colors.onTint }}>{pct !== null ? `${pct}%` : '—'}</Text>
            <Text variant="tiny" style={{ color: colors.onTint }}>da meta</Text>
          </RingGauge>
        </View>
      </Card>

      {!hasRecords && (
        <EmptyState title="Nada registrado hoje" description="Registre uma refeição ou um copo de água para começar o acompanhamento do dia." actionLabel="Registrar refeição" onAction={() => setAddOpen(true)} />
      )}

      {/* Peso e água */}
      <View style={styles.pair}>
        <Card style={styles.half} onPress={() => router.push('/(tabs)/evolution')} accessibilityLabel="Ver evolução do peso">
          <View style={styles.rowBetween}>
            <Text variant="label" tone="secondary">Peso atual</Text>
            <View style={[styles.miniRound, { backgroundColor: colors.surfaceSunken }]}><Scale size={15} color={colors.text} /></View>
          </View>
          <Text variant="bigNumber" size={30} style={{ marginTop: 6 }}>{weight(d.weight.current_kg, prefs, 1, false)}<Text variant="caption" tone="muted"> {prefs?.weight_unit ?? 'kg'}</Text></Text>
          <Text variant="caption" tone={change !== null && change < 0 ? 'success' : change ? 'warning' : 'muted'}>
            {change !== null && change !== 0 ? `${signed(change, (v) => weight(v, prefs))} desde o início` : `meta ${weight(d.weight.target_kg, prefs)}`}
          </Text>
          {d.weight.recent.length > 1 && (
            <View style={{ marginTop: 8 }}><LineChart compact height={44} points={d.weight.recent.map((p) => ({ date: p.date, value: p.weight_kg }))} /></View>
          )}
        </Card>
        <Card variant="sky" style={styles.half} onPress={() => router.push('/water')} accessibilityLabel="Abrir controle de água">
          <View style={styles.rowBetween}>
            <Text variant="label" style={{ color: colors.onTint }}>Água</Text>
            <View style={[styles.miniRound, { backgroundColor: colors.surface }]}><Droplets size={15} color={colors.water} /></View>
          </View>
          <Text variant="bigNumber" size={30} style={{ marginTop: 6, color: colors.onTint }}>{num(d.water.total_ml / 1000, 1)}<Text variant="caption" style={{ color: colors.onTint }}> L</Text></Text>
          <Text variant="caption" style={{ color: colors.onTint }}>{d.water.goal_ml ? `de ${num(d.water.goal_ml / 1000, 1)} L` : 'sem meta'}</Text>
          <View style={[styles.inline, { marginTop: 10 }]}>
            {[250, 500].map((ml) => (
              <Pressable key={ml} onPress={() => quickWater.mutate(ml)} disabled={quickWater.isPending} accessibilityRole="button" accessibilityLabel={`Adicionar ${ml} mililitros`}
                style={[styles.waterBtn, { backgroundColor: colors.surface }, quickWater.isPending && { opacity: 0.6 }]}>
                <Text variant="caption" weight="bold">+{ml}</Text>
              </Pressable>
            ))}
          </View>
        </Card>
      </View>

      {/* Macronutrientes */}
      <Card>
        <View style={[styles.rowBetween, { marginBottom: 14 }]}>
          <Text variant="heading">Macronutrientes</Text>
          <Text variant="caption" tone="muted">{goal ? 'consumido / meta' : 'sem meta'}</Text>
        </View>
        <PillBars height={140} items={[
          { label: 'Proteínas', value: consumed.protein_g, max: goal?.protein_g, display: `${num(consumed.protein_g ?? 0, 0)}g`, color: colors.protein },
          { label: 'Carbos', value: consumed.carbs_g, max: goal?.carbs_g, display: `${num(consumed.carbs_g ?? 0, 0)}g`, color: colors.carbs },
          { label: 'Gorduras', value: consumed.fat_g, max: goal?.fat_g, display: `${num(consumed.fat_g ?? 0, 0)}g`, color: colors.fat },
        ]} />
        {goal && (
          <View style={[styles.rowBetween, { marginTop: 10 }]}>
            <Text variant="tiny" tone="subtle">Meta P {num(goal.protein_g, 0)}g</Text>
            <Text variant="tiny" tone="subtle">C {num(goal.carbs_g, 0)}g</Text>
            <Text variant="tiny" tone="subtle">G {num(goal.fat_g, 0)}g</Text>
          </View>
        )}
      </Card>

      {/* Refeições de hoje */}
      <View style={styles.rowBetween}>
        <Text variant="heading">Refeições de hoje</Text>
        <View style={styles.inline}>
          <Pressable onPress={() => router.push('/(tabs)/diary')} accessibilityRole="link" hitSlop={8}><Text variant="caption" weight="semibold" tone="muted">Ver diário</Text></Pressable>
          <Pressable onPress={() => setAddOpen(true)} accessibilityRole="button" accessibilityLabel="Adicionar ao diário" style={[styles.addRound, { backgroundColor: colors.primary }]}>
            <Plus size={18} color={colors.onPrimary} />
          </Pressable>
        </View>
      </View>
      {d.meals.length === 0 ? (
        <Text variant="caption" tone="muted">Nenhuma refeição registrada hoje.</Text>
      ) : d.meals.map((m) => (
        <Card key={m.id} variant={MEAL_TINT[m.type]} onPress={() => router.push({ pathname: '/meals/[id]', params: { id: m.id } })} accessibilityLabel={m.title}>
          <View style={styles.rowBetween}>
            <View style={{ flex: 1 }}>
              <Text variant="heading" style={{ color: colors.onTint }}>{m.title}</Text>
              <Text variant="caption" style={{ color: colors.onTint, opacity: 0.75 }}>{m.time} · {m.items_count} {m.items_count === 1 ? 'item' : 'itens'}</Text>
            </View>
            <Text variant="bigNumber" size={24} style={{ color: colors.onTint }}>{kcal(m.totals.kcal)}<Text variant="caption" style={{ color: colors.onTint }}> kcal</Text></Text>
          </View>
          <View style={[styles.mealMacros, { backgroundColor: colors.surface }]}>
            {([['Proteínas', m.totals.protein_g], ['Carbos', m.totals.carbs_g], ['Gorduras', m.totals.fat_g]] as const).map(([l, v]) => (
              <View key={l} style={{ flex: 1 }}>
                <Text variant="tiny" tone="muted">{l}</Text>
                <Text variant="number" size={16}>{num(v ?? 0, 1)}g</Text>
              </View>
            ))}
          </View>
        </Card>
      ))}

      <AddMealSheet visible={addOpen} onClose={() => setAddOpen(false)} date={d.date} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  inline: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  hero: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  chip: { alignSelf: 'flex-start', marginTop: 10, paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.full },
  pair: { flexDirection: 'row', gap: 12 },
  half: { flex: 1 },
  miniRound: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  waterBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.full },
  addRound: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  mealMacros: { flexDirection: 'row', gap: 8, marginTop: 14, padding: 12, borderRadius: radius.lg },
});
