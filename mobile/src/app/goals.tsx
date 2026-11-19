import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Check, Info, Pencil } from 'lucide-react-native';

import { ApiError } from '@/api/client';
import { goalsApi, type GoalsPayload } from '@/api/endpoints';
import type { Preferences } from '@/api/types';
import { Button, Card, ErrorState, Input, Screen, SkeletonList, StackHeader, Text } from '@/components/ui';
import { invalidate, useAccount, useApiMutation, useDashboard, useGoals } from '@/features/queries';
import { fromKg, kcal, num, parseDecimal, toKg, weight, weightUnit } from '@/lib/format';
import { toast } from '@/stores/toast';
import { useTheme } from '@/theme/ThemeProvider';

const MISSING: Record<string, string> = { sex: 'sexo', birth_date: 'data de nascimento', height_cm: 'altura', current_weight_kg: 'peso atual', activity_level: 'nível de atividade', goal: 'objetivo' };

export default function GoalsScreen() {
  const goals = useGoals();
  const prefs = useAccount().data?.preferences;

  if (goals.isPending) return <Screen header={<StackHeader title="Minhas metas" />}><SkeletonList type="list" /></Screen>;
  if (goals.isError) return <Screen header={<StackHeader title="Minhas metas" />}><ErrorState onRetry={() => goals.refetch()} /></Screen>;

  // remonta o formulário quando as metas salvas ou a unidade mudam
  const g = goals.data.nutrition;
  const key = `${g?.effective_from}-${g?.kcal}-${g?.water_ml}-${goals.data.target_weight_kg}-${prefs?.weight_unit}`;
  return <GoalsContent key={key} data={goals.data} prefs={prefs} />;
}

function GoalsContent({ data, prefs }: { data: GoalsPayload; prefs?: Preferences }) {
  const { colors } = useTheme();
  const current = useDashboard().data?.weight.current_kg ?? null;
  const g = data.nutrition;
  const [editing, setEditing] = useState(!g);
  const [form, setForm] = useState(() => ({
    kcal: g ? String(g.kcal) : '', protein_g: g ? num(g.protein_g) : '', carbs_g: g ? num(g.carbs_g) : '', fat_g: g ? num(g.fat_g) : '', water_ml: g ? String(g.water_ml) : '',
    target: data.target_weight_kg !== null ? num(fromKg(data.target_weight_kg, prefs)) : '',
  }));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [mode, setMode] = useState<'manual' | 'estimated'>('manual');

  const save = useApiMutation((body: Parameters<typeof goalsApi.update>[0]) => goalsApi.update(body), { invalidate: invalidate.goals, silentError: true, onSuccess: () => setEditing(false) });
  const { estimate, target_weight_kg } = data;

  const set = (k: keyof typeof form) => (v: string) => { setForm((f) => ({ ...f, [k]: v })); setMode('manual'); };
  const macroKcal = (parseDecimal(form.protein_g) || 0) * 4 + (parseDecimal(form.carbs_g) || 0) * 4 + (parseDecimal(form.fat_g) || 0) * 9;
  const kcalValue = parseDecimal(form.kcal);
  const mismatch = kcalValue > 0 && macroKcal > 0 && Math.abs(macroKcal - kcalValue) / kcalValue > 0.1;

  const useEstimate = () => {
    if (!estimate.available) return;
    setForm((f) => ({ ...f, kcal: String(estimate.kcal), protein_g: String(estimate.protein_g), carbs_g: String(estimate.carbs_g), fat_g: String(estimate.fat_g), water_ml: String(estimate.water_ml) }));
    setMode('estimated');
    setEditing(true);
  };

  const submit = () => {
    const e: Record<string, string> = {};
    const v = { kcal: parseDecimal(form.kcal), protein_g: parseDecimal(form.protein_g), carbs_g: parseDecimal(form.carbs_g), fat_g: parseDecimal(form.fat_g), water_ml: parseDecimal(form.water_ml) };
    if (!(Number.isInteger(v.kcal) && v.kcal >= 500 && v.kcal <= 10000)) e.kcal = 'Entre 500 e 10.000 kcal (número inteiro).';
    if (!(v.protein_g >= 0 && v.protein_g <= 1000)) e.protein_g = 'Valor inválido.';
    if (!(v.carbs_g >= 0 && v.carbs_g <= 2000)) e.carbs_g = 'Valor inválido.';
    if (!(v.fat_g >= 0 && v.fat_g <= 1000)) e.fat_g = 'Valor inválido.';
    if (!(Number.isInteger(v.water_ml) && v.water_ml >= 250 && v.water_ml <= 10000)) e.water_ml = 'Entre 250 e 10.000 ml.';
    const t = form.target.trim() ? toKg(parseDecimal(form.target), prefs) : null;
    if (t !== null && !(t >= 20 && t <= 500)) e.target = 'Peso inválido.';
    setErrors(e);
    if (Object.keys(e).length) return;
    save.mutate({ ...v, target_weight_kg: t, mode }, {
      onError: (err) => {
        if (err instanceof ApiError && err.status === 422) setErrors(Object.fromEntries(Object.entries(err.errors).map(([k, m]) => [k === 'target_weight_kg' ? 'target' : k, m[0]!])));
        else toast.error(err instanceof ApiError ? err.firstError : 'Não foi possível salvar as metas.');
      },
    });
  };

  return (
    <Screen header={<StackHeader title="Metas" />}>
      <View style={styles.rowBetween}>
        <Text variant="caption" tone="muted">{g ? (g.mode === 'estimated' ? 'Metas estimadas pelo app' : 'Metas definidas por você') : 'Nenhuma meta definida'}</Text>
        {g && (
          <Pressable onPress={() => setEditing(!editing)} accessibilityRole="button" style={styles.inline}>
            <Pencil size={13} color={colors.primary} /><Text variant="caption" weight="bold" tone="primary">{editing ? 'Cancelar' : 'Editar'}</Text>
          </Pressable>
        )}
      </View>

      {!editing && g ? (
        <Card padded={false}>
          {([
            ['Peso', <Text key="w" variant="number" size={14}>{weight(current, prefs)} → {weight(target_weight_kg, prefs)}</Text>],
            ['Calorias', <Text key="k" variant="number" size={14}>{kcal(g.kcal)} kcal/dia</Text>],
            ['Proteínas', <Text key="p" variant="number" size={14} style={{ color: colors.protein }}>{num(g.protein_g, 0)} g/dia</Text>],
            ['Carboidratos', <Text key="c" variant="number" size={14} style={{ color: colors.carbs }}>{num(g.carbs_g, 0)} g/dia</Text>],
            ['Gorduras', <Text key="f" variant="number" size={14} style={{ color: colors.fat }}>{num(g.fat_g, 0)} g/dia</Text>],
            ['Água', <Text key="a" variant="number" size={14}>{num(g.water_ml, 0)} ml/dia</Text>],
          ] as const).map(([label, value], i) => (
            <View key={label} style={[styles.goalRow, { borderTopColor: colors.border, borderTopWidth: i === 0 ? 0 : StyleSheet.hairlineWidth }]}>
              <Text variant="caption" tone="secondary">{label}</Text>
              {value}
            </View>
          ))}
        </Card>
      ) : (
        <Card style={{ gap: 12 }}>
          {mode === 'estimated' && <Text variant="caption" tone="muted">Valores preenchidos com a estimativa. Ajuste o que quiser antes de salvar.</Text>}
          <View style={styles.row2}>
            <View style={{ flex: 1 }}><Input label={`Peso desejado (${weightUnit(prefs)})`} value={form.target} onChangeText={(v) => setForm((f) => ({ ...f, target: v }))} keyboardType="decimal-pad" error={errors.target} /></View>
            <View style={{ flex: 1 }}><Input label="Calorias (kcal/dia)" value={form.kcal} onChangeText={set('kcal')} keyboardType="number-pad" error={errors.kcal} /></View>
          </View>
          <View style={styles.row2}>
            <View style={{ flex: 1 }}><Input label="Proteína (g)" value={form.protein_g} onChangeText={set('protein_g')} keyboardType="decimal-pad" error={errors.protein_g} /></View>
            <View style={{ flex: 1 }}><Input label="Carboidratos (g)" value={form.carbs_g} onChangeText={set('carbs_g')} keyboardType="decimal-pad" error={errors.carbs_g} /></View>
            <View style={{ flex: 1 }}><Input label="Gorduras (g)" value={form.fat_g} onChangeText={set('fat_g')} keyboardType="decimal-pad" error={errors.fat_g} /></View>
          </View>
          {mismatch && <Text variant="tiny" tone="warning">Os macros somam ≈ {kcal(macroKcal)} kcal, diferente da meta de {kcal(kcalValue)} kcal.</Text>}
          <Input label="Água (ml/dia)" value={form.water_ml} onChangeText={set('water_ml')} keyboardType="number-pad" error={errors.water_ml} />
          <Button fullWidth size="lg" loading={save.isPending} icon={<Check size={18} color={colors.onPrimary} />} onPress={submit}>Salvar metas</Button>
        </Card>
      )}

      <Card style={{ gap: 8 }}>
        <Text variant="heading">Estimativa</Text>
        {estimate.available ? (
          <>
            <Text variant="caption" tone="secondary">
              Gasto basal ≈ {kcal(estimate.bmr_kcal)} kcal · gasto total ≈ {kcal(estimate.tdee_kcal)} kcal.{'\n'}
              Sugestão: <Text variant="caption" weight="bold">{kcal(estimate.kcal)} kcal</Text> · P {estimate.protein_g}g · C {estimate.carbs_g}g · G {estimate.fat_g}g · água {num(estimate.water_ml, 0)} ml
            </Text>
            <Button variant="outline" size="sm" onPress={useEstimate}>Usar estimativa como meta</Button>
          </>
        ) : (
          <Text variant="caption" tone="secondary">
            Para estimar, complete no perfil: {estimate.missing.map((m) => MISSING[m] ?? m).join(', ')}.{' '}
            <Text variant="caption" weight="bold" tone="primary" onPress={() => router.push('/profile-edit')}>Completar perfil</Text>
          </Text>
        )}
        <View style={[styles.inline, { alignItems: 'flex-start' }]}>
          <Info size={13} color={colors.textMuted} style={{ marginTop: 2 }} />
          <Text variant="tiny" tone="muted" style={{ flex: 1 }}>{estimate.method}. {estimate.disclaimer}</Text>
        </View>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  inline: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  goalRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  row2: { flexDirection: 'row', gap: 8 },
});
