import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ApiError } from '@/api/client';
import type { Period } from '@/api/types';
import { BarChart, Card, EmptyState, ErrorState, LineChart, MacroBar, ProgressBar, Screen, Segmented, SkeletonList, StackHeader, Text } from '@/components/ui';
import { useAccount, useReport } from '@/features/queries';
import { shortDate, weekdayShort } from '@/lib/dates';
import { fromKg, kcal, num, signed, weight, weightUnit } from '@/lib/format';
import { useTheme } from '@/theme/ThemeProvider';
import type { TintName } from '@/theme/tokens';

export default function ReportsScreen() {
  const { colors } = useTheme();
  const [period, setPeriod] = useState<Period>('30d');
  const report = useReport(period);
  const prefs = useAccount().data?.preferences;

  const header = <StackHeader title="Relatórios" />;
  if (report.isPending) return <Screen header={header}><SkeletonList type="dashboard" /></Screen>;
  if (report.isError) return <Screen header={header}><ErrorState message={report.error instanceof ApiError ? report.error.message : undefined} onRetry={() => report.refetch()} /></Screen>;

  const r = report.data;
  const c = r.consistency;
  const avg = r.nutrition.average;
  const goal = r.nutrition.goal;
  const wChange = r.weight.period.change_kg;
  const noData = c.days_recorded === 0;
  const daily = r.nutrition.daily;
  const bars = daily.map((d, i) => ({ label: daily.length <= 7 ? weekdayShort(d.date) : i % Math.ceil(daily.length / 6) === 0 ? shortDate(d.date, false) : '', value: d.kcal, goal: d.goal_kcal }));

  return (
    <Screen header={header} refreshing={report.isRefetching} onRefresh={() => void report.refetch()}>
      <Segmented value={period} onChange={setPeriod} options={[{ id: '7d', label: '7 dias' }, { id: '30d', label: '30 dias' }, { id: '3m', label: '3 meses' }, { id: '6m', label: '6 meses' }]} />
      <Text variant="caption" tone="muted">{shortDate(r.from)} a {shortDate(r.to)}</Text>

      {noData ? (
        <EmptyState title="Sem registros neste período" description="Registre refeições, água e peso para ver seus relatórios." />
      ) : (
        <>
          <View style={styles.grid}>
            <Highlight tint="lavender" label="Variação do peso" value={signed(wChange, (v) => weight(v, prefs))} sub={r.weight.series.length < 2 ? 'Registre ao menos 2 pesagens' : `${r.weight.series.length} pesagens`} />
            <Highlight tint="mint" label="Média de calorias"
              value={avg ? `${kcal(avg.kcal)} kcal` : '—'} sub={goal ? `Meta: ${kcal(goal.kcal)} kcal / dia` : 'Sem meta definida'} />
            <Highlight tint="butter" label="Dias dentro da meta"
              value={`${c.days_within_kcal_goal} / ${c.days_with_food}`} sub={c.days_with_food ? `${Math.round((c.days_within_kcal_goal / c.days_with_food) * 100)}% dos dias com registro` : 'Sem refeições'} />
            <Highlight tint="sky" label="Média de água"
              value={c.average_water_ml !== null ? `${num(c.average_water_ml, 0)} ml` : '—'} sub={c.water_goal_progress !== null ? `${c.water_goal_progress}% da meta` : `${c.water_days} dias com registro`} />
          </View>

          <Card style={{ gap: 12 }}>
            <View>
              <Text variant="heading">Calorias por dia</Text>
              {!goal && <Text variant="caption" tone="subtle">Defina uma meta para comparar</Text>}
            </View>
            <BarChart bars={bars} goal={goal?.kcal} height={170} formatValue={(v) => `${kcal(v)} kcal`} />
            <View style={styles.legend}>
              <View style={styles.inline}><View style={[styles.dot, { backgroundColor: colors.primarySofter }]} /><Text variant="tiny" tone="muted">Dentro da meta</Text></View>
              <View style={styles.inline}><View style={[styles.dot, { backgroundColor: colors.carbs }]} /><Text variant="tiny" tone="muted">Acima da meta</Text></View>
              {goal && <View style={styles.inline}><View style={[styles.line, { backgroundColor: colors.textSubtle }]} /><Text variant="tiny" tone="muted">Meta ({kcal(goal.kcal)} kcal)</Text></View>}
            </View>
          </Card>

          <Card style={{ gap: 10 }}>
            <Text variant="heading">Média diária de macronutrientes</Text>
            <Text variant="caption" tone="subtle">Calculada sobre {c.days_with_food} {c.days_with_food === 1 ? 'dia' : 'dias'} com refeições registradas</Text>
            {avg ? (
              <>
                <MacroBar label="Proteínas" current={avg.protein_g} target={goal?.protein_g} color={colors.protein} />
                <MacroBar label="Carboidratos" current={avg.carbs_g} target={goal?.carbs_g} color={colors.carbs} />
                <MacroBar label="Gorduras" current={avg.fat_g} target={goal?.fat_g} color={colors.fat} />
                <Text variant="tiny" tone="subtle">Fibras: média de {num(avg.fiber_g)} g/dia</Text>
              </>
            ) : <Text variant="caption" tone="subtle">Nenhuma refeição registrada no período.</Text>}
          </Card>

          <Card style={{ gap: 10 }}>
            <Text variant="heading">Consistência</Text>
            <Row label="Dias com algum registro" value={`${c.days_recorded} de ${c.days_in_period}`} pct={c.days_recorded / c.days_in_period} color={colors.primary} />
            <Row label="Dias com alimentação registrada" value={`${c.days_with_food} de ${c.days_in_period}`} pct={c.days_with_food / c.days_in_period} color={colors.primary} />
            <Row label="Dias na meta de calorias" value={`${c.days_within_kcal_goal} de ${c.days_with_food}`} pct={c.days_with_food ? c.days_within_kcal_goal / c.days_with_food : 0} color={colors.primary} />
            <Row label="Dias com a meta de proteína atingida" value={`${c.days_protein_goal_met} de ${c.days_with_food}`} pct={c.days_with_food ? c.days_protein_goal_met / c.days_with_food : 0} color={colors.primary} />
            <Row label="Dias com registro de água" value={`${c.water_days} de ${c.days_in_period}`} pct={c.water_days / c.days_in_period} color={colors.water} />
          </Card>

          <Card style={{ gap: 10 }}>
            <Text variant="heading">Peso</Text>
            <View style={styles.miniGrid}>
              <Mini label="Inicial" value={weight(r.weight.initial_kg, prefs)} />
              <Mini label="Atual" value={weight(r.weight.current_kg, prefs)} />
              <Mini label="Variação total" value={signed(r.weight.change_kg, (v) => weight(v, prefs))} />
              <Mini label="Distância até a meta" value={r.weight.remaining_kg !== null ? weight(Math.abs(r.weight.remaining_kg), prefs) : '—'} />
            </View>
            <LineChart height={150} points={r.weight.series.map((p) => ({ date: p.date, value: fromKg(p.weight_kg, prefs) }))}
              target={r.weight.target_kg !== null ? fromKg(r.weight.target_kg, prefs) : null} formatValue={(v) => `${num(v)} ${weightUnit(prefs)}`} />
          </Card>
        </>
      )}
    </Screen>
  );

}

function Highlight({ tint, label, value, sub }: { tint: TintName; label: string; value: string; sub: string }) {
  const { colors } = useTheme();
  return (
    <Card variant={tint} style={styles.cell}>
      <Text variant="caption" style={{ color: colors.onTint }}>{label}</Text>
      <Text variant="bigNumber" size={24} style={{ color: colors.onTint }}>{value}</Text>
      <Text variant="tiny" style={{ color: colors.onTint, opacity: 0.75 }}>{sub}</Text>
    </Card>
  );
}

function Row({ label, value, pct, color }: { label: string; value: string; pct: number; color: string }) {
  return (
    <View style={{ gap: 4 }}>
      <View style={styles.rowBetween}><Text variant="caption" tone="secondary">{label}</Text><Text variant="caption" weight="bold">{value}</Text></View>
      <ProgressBar value={Math.round(pct * 100)} max={100} color={color} height={6} />
    </View>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.mini}>
      <Text variant="tiny" tone="muted">{label}</Text>
      <Text variant="caption" weight="extrabold">{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  cell: { width: '46%', flexGrow: 1, gap: 4, padding: 16 },
  miniGrid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 12, columnGap: 12 },
  inline: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  line: { width: 14, height: 2 },
  mini: { width: '46%', flexGrow: 1, gap: 2 },
});
