import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowRight, ChevronLeft } from 'lucide-react-native';

import { accountApi } from '@/api/endpoints';
import type { ActivityLevel, GoalType, Sex } from '@/api/types';
import { Button, DateInput, Input, OptionTile, Segmented, Text } from '@/components/ui';
import { keys, useAccount } from '@/features/queries';
import { deviceTimezone } from '@/lib/device';
import { parseDecimal } from '@/lib/format';
import { ACTIVITY_LEVELS, GOALS } from '@/lib/labels';
import { ApiError } from '@/api/client';
import { useSession } from '@/stores/session';
import { toast } from '@/stores/toast';
import { useTheme } from '@/theme/ThemeProvider';
import { radius } from '@/theme/tokens';

const STEPS = 5;

/** Onboarding: 3 telas de apresentação + dados pessoais + objetivo. */
export default function OnboardingScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const account = useAccount();
  const signOut = useSession((s) => s.signOut);
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [name, setName] = useState(account.data?.name ?? '');
  const [birthDate, setBirthDate] = useState<string | null>(null);
  const [sex, setSex] = useState<Sex | 'none'>('none');
  const [height, setHeight] = useState('');
  const [current, setCurrent] = useState('');
  const [target, setTarget] = useState('');
  const [goal, setGoal] = useState<GoalType>('lose_weight');
  const [activity, setActivity] = useState<ActivityLevel | null>(null);

  const validateProfile = () => {
    const e: Record<string, string> = {};
    if (name.trim().length < 2) e.name = 'Informe seu nome.';
    const h = parseDecimal(height), c = parseDecimal(current), t = parseDecimal(target);
    if (!(h >= 50 && h <= 260)) e.height_cm = 'Altura em cm (ex.: 178).';
    if (!(c >= 20 && c <= 500)) e.current_weight_kg = 'Peso válido em kg.';
    if (!(t >= 20 && t <= 500)) e.target_weight_kg = 'Peso válido em kg.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const finish = async () => {
    setSaving(true);
    try {
      const { data } = await accountApi.onboarding({
        name: name.trim(),
        birth_date: birthDate,
        sex: sex === 'none' ? null : sex,
        height_cm: parseDecimal(height),
        current_weight_kg: parseDecimal(current),
        target_weight_kg: parseDecimal(target),
        goal,
        activity_level: activity,
        timezone: deviceTimezone(),
      });
      qc.setQueryData(keys.me, data);
      toast.success('Perfil configurado! Bem-vindo ao NutriFlow.');
    } catch (e) {
      if (e instanceof ApiError && e.status === 422) {
        setErrors(Object.fromEntries(Object.entries(e.errors).map(([k, v]) => [k, v[0]!])));
        setStep(4);
      }
      toast.error(e instanceof ApiError ? e.firstError : 'Não foi possível salvar seu perfil.');
    } finally {
      setSaving(false);
    }
  };

  const next = () => {
    if (step === 4 && !validateProfile()) return;
    if (step < STEPS) setStep(step + 1);
    else void finish();
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={[styles.top, { paddingTop: insets.top + 12 }]}>
        {step > 1 ? (
          <Pressable onPress={() => setStep(step - 1)} accessibilityLabel="Voltar" style={[styles.round, { backgroundColor: colors.surface, borderColor: colors.borderStrong }]}>
            <ChevronLeft size={20} color={colors.textSecondary} />
          </Pressable>
        ) : <View style={styles.round} />}
        <View style={styles.dots} accessibilityLabel={`Etapa ${step} de ${STEPS}`}>
          {Array.from({ length: STEPS }, (_, i) => i + 1).map((i) => (
            <View key={i} style={{ height: 6, borderRadius: 3, width: i === step ? 24 : 8, backgroundColor: i === step ? colors.primary : i < step ? colors.primarySofter : colors.borderStrong }} />
          ))}
        </View>
        {step < 4 ? (
          <Pressable onPress={() => setStep(4)} hitSlop={8}><Text variant="caption" tone="subtle" weight="semibold">Pular</Text></Pressable>
        ) : (
          <Pressable onPress={() => void signOut()} hitSlop={8}><Text variant="caption" tone="subtle" weight="semibold">Sair</Text></Pressable>
        )}
      </View>

      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        {step === 1 && <Intro step="1 de 3" title="Registre o que você come."
          text="Busque entre os 597 alimentos da tabela TACO ou cadastre os seus, em gramas, unidades ou medidas caseiras. O app soma calorias e macronutrientes de cada refeição." />}
        {step === 2 && <Intro step="2 de 3" title="Receitas calculadas por porção."
          text="Cadastre os ingredientes e o rendimento uma vez. Depois registre meia, uma ou uma porção e meia, e o valor nutricional é calculado a partir da receita." />}
        {step === 3 && <Intro step="3 de 3" title="Peso, medidas e água."
          text="Registre pesagens, medidas corporais e o que você bebe, e acompanhe a evolução em gráficos de 7 dias a 1 ano." />}

        {step === 4 && (
          <View style={{ gap: 14 }}>
            <Header title="Sobre você" text="Usamos estes dados para estimar suas metas iniciais. Tudo pode ser ajustado depois." />
            <Input label="Seu nome" value={name} onChangeText={setName} placeholder="Como quer ser chamado" error={errors.name} />
            <View style={styles.row3}>
              <View style={styles.flex}><Input label="Altura (cm)" value={height} onChangeText={setHeight} placeholder="170" keyboardType="decimal-pad" error={errors.height_cm} /></View>
              <View style={styles.flex}><Input label="Peso atual (kg)" value={current} onChangeText={setCurrent} placeholder="70,0" keyboardType="decimal-pad" error={errors.current_weight_kg} /></View>
              <View style={styles.flex}><Input label="Peso meta (kg)" value={target} onChangeText={setTarget} placeholder="65,0" keyboardType="decimal-pad" error={errors.target_weight_kg} /></View>
            </View>
            <DateInput label="Data de nascimento" value={birthDate} onChange={setBirthDate} error={errors.birth_date} helper="Opcional — usada na estimativa de calorias." />
            <View style={{ gap: 6 }}>
              <Text variant="label" tone="secondary">Sexo (para as equações de estimativa)</Text>
              <Segmented value={sex} onChange={setSex} options={[{ id: 'female', label: 'Feminino' }, { id: 'male', label: 'Masculino' }, { id: 'none', label: 'Não informar' }]} />
            </View>
          </View>
        )}

        {step === 5 && (
          <View style={{ gap: 14 }}>
            <Header title="Objetivo" text="Define o ajuste de calorias da meta estimada." />
            <View style={{ gap: 8 }}>
              {GOALS.map((g) => (
                <OptionTile key={g.id} selected={goal === g.id} onPress={() => setGoal(g.id)} title={g.title} subtitle={g.subtitle} />
              ))}
            </View>
            <Text variant="label" tone="secondary" style={{ marginTop: 6 }}>Nível de atividade física</Text>
            <View style={{ gap: 8 }}>
              {ACTIVITY_LEVELS.map((a) => (
                <OptionTile key={a.id} compact selected={activity === a.id} onPress={() => setActivity(a.id)} title={a.title} subtitle={a.subtitle} />
              ))}
            </View>
            {(sex === 'none' || !birthDate || !activity) && (
              <View style={[styles.note, { backgroundColor: colors.warningSoft }]}>
                <Text variant="caption" tone="muted">Sem data de nascimento, sexo e nível de atividade não conseguimos estimar suas metas — você poderá defini-las manualmente no Perfil, em Metas.</Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      <View style={{ padding: 24, paddingBottom: insets.bottom + 16 }}>
        <Button fullWidth size="lg" loading={saving} onPress={next} iconRight={step < STEPS ? <ArrowRight size={18} color={colors.onPrimary} /> : undefined}>
          {step === STEPS ? 'Começar' : 'Continuar'}
        </Button>
      </View>
    </KeyboardAvoidingView>
  );
}

function Intro({ step, title, text }: { step: string; title: string; text: string }) {
  return (
    <View style={{ paddingTop: 48, gap: 12 }}>
      <Text variant="caption" tone="muted">{step}</Text>
      <Text variant="title" size={28} style={{ lineHeight: 34 }}>{title}</Text>
      <Text tone="secondary" style={{ lineHeight: 22, maxWidth: 360 }}>{text}</Text>
    </View>
  );
}

function Header({ title, text }: { title: string; text: string }) {
  return (
    <View style={{ marginBottom: 8, gap: 4 }}>
      <Text variant="title" size={24}>{title}</Text>
      <Text variant="caption" tone="muted">{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24 },
  round: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: 'transparent', alignItems: 'center', justifyContent: 'center' },
  dots: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  body: { padding: 24, flexGrow: 1 },
  row3: { flexDirection: 'row', gap: 8 },
  flex: { flex: 1 },
  note: { padding: 12, borderRadius: radius.md },
});
