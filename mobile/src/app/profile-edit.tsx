import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { Check } from 'lucide-react-native';

import { ApiError } from '@/api/client';
import { accountApi } from '@/api/endpoints';
import type { Account, ActivityLevel, GoalType, Sex } from '@/api/types';
import { Button, Card, DateInput, ErrorState, Input, OptionTile, Screen, Segmented, SkeletonList, StackHeader, Text } from '@/components/ui';
import { invalidate, keys, useAccount } from '@/features/queries';
import { deviceTimezone } from '@/lib/device';
import { fromCm, fromKg, lengthUnit, num, parseDecimal, toCm, toKg, weightUnit } from '@/lib/format';
import { ACTIVITY_LEVELS, GOALS } from '@/lib/labels';
import { toast } from '@/stores/toast';
import { useTheme } from '@/theme/ThemeProvider';

/** Edição do perfil: base das estimativas e metas. O peso atual é gerido em Evolução (pesagens). */
export default function ProfileEditScreen() {
  const account = useAccount();
  if (account.isPending) return <Screen header={<StackHeader title="Dados pessoais" />}><SkeletonList type="list" /></Screen>;
  if (account.isError) return <Screen header={<StackHeader title="Dados pessoais" />}><ErrorState onRetry={() => account.refetch()} /></Screen>;
  return <ProfileForm a={account.data} />;
}

function ProfileForm({ a }: { a: Account }) {
  const { colors } = useTheme();
  const qc = useQueryClient();
  const prefs = a.preferences;
  const [name, setName] = useState(a.name);
  const [birth, setBirth] = useState<string | null>(a.profile.birth_date);
  const [sex, setSex] = useState<Sex | 'none'>(a.profile.sex ?? 'none');
  const [height, setHeight] = useState(() => (a.profile.height_cm !== null ? num(fromCm(a.profile.height_cm, prefs), 1) : ''));
  const [initial, setInitial] = useState(() => (a.profile.initial_weight_kg !== null ? num(fromKg(a.profile.initial_weight_kg, prefs), 2) : ''));
  const [target, setTarget] = useState(() => (a.profile.target_weight_kg !== null ? num(fromKg(a.profile.target_weight_kg, prefs), 2) : ''));
  const [goal, setGoal] = useState<GoalType | null>(a.profile.goal);
  const [activity, setActivity] = useState<ActivityLevel | null>(a.profile.activity_level);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const save = async () => {
    const opt = (v: string) => (v.trim() ? parseDecimal(v) : null);
    const h = opt(height), i = opt(initial), t = opt(target);
    const e: Record<string, string> = {};
    if (name.trim().length < 2) e.name = 'Informe seu nome.';
    const hCm = h === null ? null : toCm(h, prefs);
    if (hCm !== null && !(hCm >= 50 && hCm <= 260)) e.height_cm = 'Altura inválida.';
    const iKg = i === null ? null : toKg(i, prefs);
    const tKg = t === null ? null : toKg(t, prefs);
    if (iKg !== null && !(iKg >= 20 && iKg <= 500)) e.initial_weight_kg = 'Peso inválido.';
    if (tKg !== null && !(tKg >= 20 && tKg <= 500)) e.target_weight_kg = 'Peso inválido.';
    setErrors(e);
    if (Object.keys(e).length) return;
    setSaving(true);
    try {
      const { data, message } = await accountApi.update({
        name: name.trim(), birth_date: birth, sex: sex === 'none' ? null : sex, height_cm: hCm, initial_weight_kg: iKg, target_weight_kg: tKg,
        goal, activity_level: activity, timezone: deviceTimezone(),
      });
      qc.setQueryData(keys.me, data);
      await invalidate.account(qc);
      toast.success(message ?? 'Perfil atualizado.');
      router.back();
    } catch (err) {
      if (err instanceof ApiError && err.status === 422) setErrors(Object.fromEntries(Object.entries(err.errors).map(([k, v]) => [k, v[0]!])));
      toast.error(err instanceof ApiError ? err.firstError : 'Não foi possível salvar.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen header={<StackHeader title="Dados pessoais" subtitle="Usados como referência para cálculos e metas" />}>
      <Card style={{ gap: 12 }}>
        <Input label="Nome" value={name} onChangeText={setName} error={errors.name} />
        <Input label="E-mail" value={a.email} editable={false} helper="O e-mail identifica sua conta e não pode ser alterado aqui." />
        <DateInput label="Data de nascimento" value={birth} onChange={setBirth} error={errors.birth_date} />
        <View style={{ gap: 6 }}>
          <Text variant="label" tone="secondary">Sexo (usado nas equações de estimativa)</Text>
          <Segmented value={sex} onChange={setSex} options={[{ id: 'female', label: 'Feminino' }, { id: 'male', label: 'Masculino' }, { id: 'none', label: 'Não informar' }]} />
        </View>
      </Card>

      <Card style={{ gap: 12 }}>
        <Input label={`Altura (${lengthUnit(prefs)})`} value={height} onChangeText={setHeight} keyboardType="decimal-pad" error={errors.height_cm} />
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <View style={{ flex: 1 }}><Input label={`Peso inicial (${weightUnit(prefs)})`} value={initial} onChangeText={setInitial} keyboardType="decimal-pad" error={errors.initial_weight_kg} /></View>
          <View style={{ flex: 1 }}><Input label={`Peso desejado (${weightUnit(prefs)})`} value={target} onChangeText={setTarget} keyboardType="decimal-pad" error={errors.target_weight_kg} /></View>
        </View>
        <Text variant="tiny" tone="subtle">O peso atual é sempre a pesagem mais recente — registre novas pesagens na aba Evolução.</Text>
      </Card>

      <Text variant="label" weight="bold" tone="secondary">Objetivo</Text>
      {GOALS.map((g) => <OptionTile key={g.id} selected={goal === g.id} onPress={() => setGoal(g.id)} title={g.title} subtitle={g.subtitle} />)}
      <Text variant="label" weight="bold" tone="secondary">Nível de atividade física</Text>
      {ACTIVITY_LEVELS.map((a) => <OptionTile key={a.id} compact selected={activity === a.id} onPress={() => setActivity(a.id)} title={a.title} subtitle={a.subtitle} />)}

      <Button fullWidth size="lg" loading={saving} icon={<Check size={18} color={colors.onPrimary} />} onPress={() => void save()}>Salvar alterações</Button>
    </Screen>
  );
}
