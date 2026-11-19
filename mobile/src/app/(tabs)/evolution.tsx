import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Plus, Ruler } from 'lucide-react-native';

import { ApiError } from '@/api/client';
import type { Period, WeightEntry } from '@/api/types';
import { WeightDialog } from '@/components/tracking/WeightDialog';
import { Button, Card, ErrorState, LineChart, Screen, Segmented, SkeletonList, Text } from '@/components/ui';
import { useAccount, useWeights } from '@/features/queries';
import { shortDate } from '@/lib/dates';
import { fromKg, num, signed, weight, weightUnit } from '@/lib/format';
import { useTheme } from '@/theme/ThemeProvider';
import { radius } from '@/theme/tokens';

const PERIODS: { id: Period; label: string }[] = [
  { id: '7d', label: '7d' }, { id: '30d', label: '30d' }, { id: '3m', label: '3m' }, { id: '6m', label: '6m' }, { id: '1y', label: '1 ano' }, { id: 'all', label: 'Tudo' },
];

export default function EvolutionScreen() {
  const { colors } = useTheme();
  const [period, setPeriod] = useState<Period>('30d');
  const weights = useWeights(period);
  const prefs = useAccount().data?.preferences;
  const [dialog, setDialog] = useState<{ open: boolean; entry?: WeightEntry | null }>({ open: false });

  if (weights.isPending) return <Screen><SkeletonList type="dashboard" /></Screen>;
  if (weights.isError) return <Screen><ErrorState message={weights.error instanceof ApiError ? weights.error.message : undefined} onRetry={() => weights.refetch()} /></Screen>;

  const { summary, entries, period_change } = weights.data;
  const history = [...entries].reverse(); // mais recente primeiro
  const prevOf = (e: WeightEntry) => { const i = entries.indexOf(e); return i > 0 ? entries[i - 1] : undefined; };
  const fmt = (v: number) => weight(v, prefs);

  return (
    <Screen refreshing={weights.isRefetching} onRefresh={() => void weights.refetch()}>
      <View style={styles.rowBetween}>
        <Text variant="title">Evolução</Text>
        <Button variant="outline" size="sm" icon={<Ruler size={14} color={colors.textSecondary} />} onPress={() => router.push('/measurements')}>Medidas</Button>
      </View>

      <Card variant="lavender">
        <Text variant="label" style={{ color: colors.onTint }}>Peso atual</Text>
        <Text variant="bigNumber" size={44} style={{ color: colors.onTint }}>
          {weight(summary.current_kg, prefs, 1, false)}<Text variant="label" style={{ color: colors.onTint }}> {weightUnit(prefs)}</Text>
        </Text>
        <View style={[styles.summary, { backgroundColor: colors.surface }]}>
          {[
            { label: 'Início', value: weight(summary.initial_kg, prefs) },
            { label: 'Variação', value: signed(summary.change_kg, fmt), tone: (summary.change_kg ?? 0) <= 0 ? 'success' as const : 'warning' as const },
            { label: 'Meta', value: weight(summary.target_kg, prefs) },
          ].map((s) => (
            <View key={s.label} style={{ flex: 1 }}>
              <Text variant="caption" tone="muted">{s.label}</Text>
              <Text variant="number" size={14} tone={s.tone ?? 'default'}>{s.value}</Text>
            </View>
          ))}
        </View>
      </Card>

      <Card style={{ gap: 12 }}>
        <View style={styles.rowBetween}>
          <View>
            <Text variant="heading">Peso no período</Text>
            <Text variant="caption" tone="subtle">{entries.length} {entries.length === 1 ? 'pesagem' : 'pesagens'}</Text>
          </View>
          {period_change.change_kg !== null && entries.length > 1 && (
            <Text variant="caption" weight="bold" tone={period_change.change_kg <= 0 ? 'success' : 'warning'}>{signed(period_change.change_kg, fmt)} no período</Text>
          )}
        </View>
        <Segmented value={period} onChange={setPeriod} options={PERIODS} />
        <LineChart height={176} points={entries.map((e) => ({ date: e.measured_on, time: e.measured_at, value: fromKg(e.weight_kg, prefs) }))}
          target={summary.target_kg !== null ? fromKg(summary.target_kg, prefs) : null} formatValue={(v) => `${num(v, 1)} ${weightUnit(prefs)}`} />
        <View style={[styles.rowBetween, styles.footer, { borderTopColor: colors.border }]}>
          <Text variant="caption" tone="muted">Meta: <Text variant="caption" weight="bold">{weight(summary.target_kg, prefs)}</Text></Text>
          {summary.remaining_kg !== null && (
            <Text variant="caption" weight="bold" tone="success">
              {summary.remaining_kg === 0 ? 'Meta atingida' : `Faltam ${weight(Math.abs(summary.remaining_kg), prefs)}`}
            </Text>
          )}
        </View>
      </Card>

      <Card padded={false}>
        <View style={[styles.rowBetween, styles.cardHead]}>
          <Text variant="heading">Pesagens</Text>
          <Button size="sm" icon={<Plus size={14} color={colors.onPrimary} />} onPress={() => setDialog({ open: true, entry: null })}>Registrar peso</Button>
        </View>
        {history.length === 0 ? (
          <Text variant="caption" tone="muted" style={styles.cardEmpty}>Nenhuma pesagem neste período.</Text>
        ) : history.map((e) => {
          const prev = prevOf(e);
          const diff = prev ? Math.round((e.weight_kg - prev.weight_kg) * 100) / 100 : null;
          return (
            <Pressable key={e.id} onPress={() => setDialog({ open: true, entry: e })} accessibilityRole="button" accessibilityLabel={`Pesagem de ${shortDate(e.measured_on)}`}
              style={({ pressed }) => [styles.entry, { borderTopColor: colors.border, backgroundColor: pressed ? colors.surfaceMuted : 'transparent' }]}>
              <View style={{ flex: 1 }}>
                <Text variant="caption" weight="bold">{shortDate(e.measured_on)}{e.measured_at ? ` · ${e.measured_at}` : ''}</Text>
                {e.notes ? <Text variant="tiny" tone="subtle" numberOfLines={1}>{e.notes}</Text> : null}
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text variant="number" size={12}>{weight(e.weight_kg, prefs)}</Text>
                {diff !== null && diff !== 0 && <Text variant="tiny" weight="semibold" tone={diff < 0 ? 'success' : 'warning'}>{signed(diff, fmt)}</Text>}
              </View>
            </Pressable>
          );
        })}
      </Card>

      <WeightDialog visible={dialog.open} entry={dialog.entry} prefs={prefs} onClose={() => setDialog({ open: false })} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  summary: { flexDirection: 'row', gap: 12, marginTop: 14, padding: 14, borderRadius: radius.lg },
  footer: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 10 },
  cardHead: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 10 },
  cardEmpty: { paddingHorizontal: 16, paddingBottom: 16 },
  entry: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: StyleSheet.hairlineWidth },
});
