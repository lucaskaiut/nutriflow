import { useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Check, Pencil, Plus, Star, Trash2, X } from 'lucide-react-native';

import { ApiError } from '@/api/client';
import { foodsApi } from '@/api/endpoints';
import type { FoodPortion, QuantityUnit } from '@/api/types';
import { deliverPicked } from '@/components/food/addPicked';
import { NutritionPanel } from '@/components/food/NutritionPanel';
import { Button, Card, ChipRow, confirm, Dialog, ErrorState, IconButton, Input, Screen, SkeletonList, StackHeader, Stepper, Text } from '@/components/ui';
import { invalidate, useApiMutation, useFood } from '@/features/queries';
import { num, parseDecimal } from '@/lib/format';
import { NUTRIENT_LABELS, UNIT_LABELS } from '@/lib/labels';
import { CategoryIcon } from '@/components/food/CategoryIcon';
import { previewFood } from '@/lib/nutritionPreview';
import { usePicker } from '@/stores/picker';
import { toast } from '@/stores/toast';
import { useTheme } from '@/theme/ThemeProvider';
import { radius } from '@/theme/tokens';

export default function FoodDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const qc = useQueryClient();
  const food = useFood(id);
  const target = usePicker((s) => s.target);
  const [chosenKey, setUnitKey] = useState<string>('');
  const [typedQty, setQty] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [portionOpen, setPortionOpen] = useState(false);

  const f = food.data;
  // padrão: primeira medida caseira (se houver) ou a quantidade de referência
  const defaultKey = f ? (f.portions?.length ? `portion:${f.portions[0]!.id}` : f.reference_unit) : '';
  const unitKey = chosenKey || defaultKey;
  const qty = typedQty ?? (f ? (unitKey.startsWith('portion:') ? '1' : num(f.reference_amount, 3)) : '');

  const favorite = useApiMutation((on: boolean) => foodsApi.favorite(id, on), { invalidate: invalidate.foods });
  const remove = useApiMutation(() => foodsApi.remove(id), { invalidate: invalidate.foods, onSuccess: () => router.back() });
  const removePortion = useApiMutation((pid: string) => foodsApi.removePortion(pid), { invalidate: invalidate.foods, onSuccess: () => setUnitKey('') });

  const unitOptions = useMemo(() => {
    if (!f) return [];
    const base = f.accepted_units.filter((u) => u !== 'portion').map((u) => ({ id: u as string, label: UNIT_LABELS[u] }));
    const portions = (f.portions ?? []).map((p) => ({ id: `portion:${p.id}`, label: `${p.label} (${num(p.amount)}${f.reference_unit})` }));
    return [...portions, ...base];
  }, [f]);

  if (food.isPending) return <Screen header={<StackHeader title="Alimento" />}><SkeletonList type="list" /></Screen>;
  if (food.isError || !f) return <Screen header={<StackHeader title="Alimento" />}><ErrorState message={food.error instanceof ApiError ? food.error.message : undefined} onRetry={() => food.refetch()} /></Screen>;

  const portion: FoodPortion | null = unitKey.startsWith('portion:') ? f.portions?.find((p) => `portion:${p.id}` === unitKey) ?? null : null;
  const unit: QuantityUnit = portion ? 'portion' : ((unitKey || f.reference_unit) as QuantityUnit);
  const value = parseDecimal(qty);
  const valid = value > 0 && value <= 100000;
  const preview = valid ? previewFood(f, value, unit, portion) : null;
  const step = unit === 'g' || unit === 'ml' ? 10 : unit === 'kg' || unit === 'l' ? 0.1 : 1;

  const add = async () => {
    if (!target || !valid) return;
    setAdding(true);
    try {
      await deliverPicked(qc, target, { kind: 'food', food: f, quantity: value, unit, portion, preview }, 2);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.firstError : 'Não foi possível adicionar o alimento.');
    } finally {
      setAdding(false);
    }
  };

  return (
    <Screen header={
      <StackHeader title={f.name} subtitle={target ? `Adicionar a ${target.label}` : f.source_label}
        right={<IconButton label={f.is_favorite ? 'Remover dos favoritos' : 'Favoritar'} variant="plain" onPress={() => favorite.mutate(!f.is_favorite)}
          icon={<Star size={20} color={f.is_favorite ? colors.star : colors.textSubtle} fill={f.is_favorite ? colors.star : 'transparent'} />} />} />
    }>
      <View style={styles.headerCard}>
        <CategoryIcon slug={f.category?.slug} size={20} />
        <View style={{ flex: 1 }}>
          <Text variant="title" size={18}>{f.name}</Text>
          <Text variant="caption" tone="muted">{f.category?.name ?? 'Sem categoria'} · {f.source_label}</Text>
          {f.description ? <Text variant="caption" tone="muted" style={{ marginTop: 4 }}>{f.description}</Text> : null}
        </View>
      </View>

      {target && (
        <>
          <Card style={{ gap: 12 }}>
            <View style={styles.rowBetween}>
              <View style={{ flex: 1 }}>
                <Text variant="caption" weight="bold">Quantidade</Text>
                <Text variant="tiny" tone="muted">Base: {num(f.reference_amount)} {f.reference_unit}{portion ? ` · 1 ${portion.label} = ${num(portion.amount)} ${f.reference_unit}` : ''}</Text>
              </View>
              <Stepper value={valid ? value : 0} onChange={(v) => setQty(num(v, 3))} step={step} min={step} decimals={step < 1 ? 1 : 0} label="quantidade" />
            </View>
            <Input value={qty} onChangeText={setQty} keyboardType="decimal-pad" suffix={portion ? portion.label : UNIT_LABELS[unit]} accessibilityLabel="Quantidade"
              error={qty && !valid ? 'Informe uma quantidade maior que zero.' : undefined} />
            <ChipRow value={unitKey} onChange={(k) => { setUnitKey(k); setQty(k.startsWith('portion:') ? '1' : num(f.reference_amount, 3)); }} options={unitOptions} />
            <Pressable onPress={() => setPortionOpen(true)} accessibilityRole="button" style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Plus size={14} color={colors.primary} /><Text variant="caption" weight="bold" tone="primary">Cadastrar medida caseira (ex.: 1 fatia = 25 g)</Text>
            </Pressable>
          </Card>
          <Text variant="heading">Total calculado</Text>
        </>
      )}

      <NutritionPanel title={target ? 'Valor energético' : `Por ${num(f.reference_amount)} ${f.reference_unit}`} subtitle={target ? 'Estimativa para a quantidade escolhida' : 'Valores de referência'}
        n={target ? preview : f.nutrients} />

      {f.extra_nutrients && f.extra_nutrients.some((n) => n.amount !== null) && (
        <Card>
          <Text variant="caption" weight="bold" style={{ marginBottom: 8 }}>Outros nutrientes (por {num(f.reference_amount)} {f.reference_unit})</Text>
          {f.extra_nutrients.filter((n) => n.amount !== null).map((n) => (
            <View key={n.nutrient} style={[styles.rowBetween, { paddingVertical: 4 }]}>
              <Text variant="caption" tone="muted">{NUTRIENT_LABELS[n.nutrient] ?? n.nutrient}</Text>
              <Text variant="caption" weight="semibold">{num(n.amount, 2)} {n.unit}</Text>
            </View>
          ))}
        </Card>
      )}

      {(f.portions?.some((p) => p.is_custom) ?? false) && (
        <Card>
          <Text variant="caption" weight="bold" style={{ marginBottom: 8 }}>Minhas medidas caseiras</Text>
          {f.portions!.filter((p) => p.is_custom).map((p) => (
            <View key={p.id} style={[styles.rowBetween, { paddingVertical: 4 }]}>
              <Text variant="caption">{p.label} = {num(p.amount)} {f.reference_unit}</Text>
              <IconButton label={`Excluir medida ${p.label}`} variant="plain" icon={<X size={14} color={colors.danger} />}
                onPress={async () => { if (await confirm('Excluir medida?', `"${p.label}" deixará de aparecer para este alimento.`)) removePortion.mutate(p.id); }} />
            </View>
          ))}
        </Card>
      )}

      {target ? (
        <Button fullWidth size="lg" loading={adding} disabled={!valid} icon={<Check size={18} color={colors.onPrimary} />} onPress={() => void add()}>
          {target.mode === 'diary' ? 'Adicionar à refeição' : target.mode === 'ingredient' ? 'Adicionar ingrediente' : 'Adicionar à refeição salva'}
        </Button>
      ) : (
        <Button fullWidth variant="outline" icon={<Plus size={16} color={colors.textSecondary} />} onPress={() => setPortionOpen(true)}>Cadastrar medida caseira</Button>
      )}

      {f.is_owner && (
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Button style={{ flex: 1 }} variant="outline" icon={<Pencil size={15} color={colors.textSecondary} />} onPress={() => router.push({ pathname: '/foods/form', params: { id: f.id } })}>Editar</Button>
          <Button style={{ flex: 1 }} variant="danger" loading={remove.isPending} icon={<Trash2 size={15} color={colors.danger} />}
            onPress={async () => { if (await confirm('Excluir alimento?', 'Ele deixará de aparecer na busca. Receitas e registros antigos do diário continuam intactos.')) remove.mutate(); }}>Excluir</Button>
        </View>
      )}

      <PortionDialog visible={portionOpen} onClose={() => setPortionOpen(false)} foodId={f.id} unit={f.reference_unit} onCreated={(p) => { setUnitKey(`portion:${p.id}`); setQty('1'); }} />
    </Screen>
  );
}

function PortionDialog({ visible, onClose, foodId, unit, onCreated }: { visible: boolean; onClose: () => void; foodId: string; unit: string; onCreated: (p: FoodPortion) => void }) {
  const [label, setLabel] = useState('');
  const [amount, setAmount] = useState('');
  const create = useApiMutation((v: { label: string; amount: number }) => foodsApi.addPortion(foodId, v.label, v.amount), {
    invalidate: invalidate.foods,
    onSuccess: (p) => { onCreated(p); setLabel(''); setAmount(''); onClose(); },
  });
  const a = parseDecimal(amount);
  return (
    <Dialog visible={visible} onClose={onClose} title="Nova medida caseira">
      <View style={{ gap: 12 }}>
        <Input label="Nome da medida" value={label} onChangeText={setLabel} placeholder="Ex: fatia, colher de sopa, unidade média" maxLength={80} />
        <Input label={`Equivale a quantos ${unit}?`} value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder="Ex: 25" suffix={unit}
          helper="Use o peso/volume indicado no rótulo ou pese em casa." />
        <Button fullWidth disabled={!label.trim() || !(a > 0)} loading={create.isPending} onPress={() => create.mutate({ label: label.trim(), amount: a })}>Salvar medida</Button>
      </View>
    </Dialog>
  );
}

const styles = StyleSheet.create({
  headerCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  cell: { width: '48.5%', padding: 12, borderRadius: radius.md, borderWidth: 1 },
});
