import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { Check, Plus } from 'lucide-react-native';

import { ApiError } from '@/api/client';
import { savedMealsApi, type SavedMealInput } from '@/api/endpoints';
import type { MealType, SavedMeal } from '@/api/types';
import { DraftItemRow, draftPreview, type DraftItem } from '@/components/items/DraftItemRow';
import { Button, Card, ChipRow, ErrorState, Input, Screen, SkeletonList, StackHeader, Text } from '@/components/ui';
import { invalidate, useApiMutation, useSavedMeal } from '@/features/queries';
import { draftKey, draftToInput, pickedToDraft } from '@/lib/drafts';
import { grams, kcal, num, parseDecimal } from '@/lib/format';
import { MEAL_TYPES } from '@/lib/labels';
import { scaleNutrients, sumNutrients, ZERO } from '@/lib/nutritionPreview';
import { usePicker } from '@/stores/picker';
import { toast } from '@/stores/toast';
import { useTheme } from '@/theme/ThemeProvider';
import { radius } from '@/theme/tokens';

export default function SavedMealFormScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const existing = useSavedMeal(id ?? '');
  if (id && existing.isPending) return <Screen header={<StackHeader title="Editar refeição salva" />}><SkeletonList type="list" /></Screen>;
  if (id && existing.isError) return <Screen header={<StackHeader title="Editar refeição salva" />}><ErrorState onRetry={() => existing.refetch()} /></Screen>;
  return <SavedMealForm initial={id ? existing.data : undefined} />;
}

function SavedMealForm({ initial: m }: { initial?: SavedMeal }) {
  const editing = !!m;
  const id = m?.id;
  const { colors } = useTheme();
  const setTarget = usePicker((s) => s.setTarget);
  const [name, setName] = useState(m?.name ?? '');
  const [description, setDescription] = useState(m?.description ?? '');
  const [mealType, setMealType] = useState<MealType | 'none'>(m?.meal_type ?? 'none');
  const [items, setItems] = useState<DraftItem[]>(() => (m ? m.items.map((i) => ({
    key: draftKey(), kind: i.kind, id: (i.kind === 'recipe' ? i.recipe_id : i.food_id) ?? '', name: i.name, quantity: num(i.quantity, 3),
    unit: i.unit, portion: i.portion, perUnit: scaleNutrients(i.nutrients, 1 / i.quantity), unavailable: !i.is_available,
  })) : []));
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => () => setTarget(null), [setTarget]);

  const total = useMemo(() => sumNutrients(items.map((i) => draftPreview(i) ?? ZERO)), [items]);
  const save = useApiMutation((body: SavedMealInput) => (editing ? savedMealsApi.update(id!, body) : savedMealsApi.create(body)), {
    invalidate: invalidate.savedMeals, silentError: true, onSuccess: () => router.back(),
  });

  const addItem = () => {
    setTarget({ mode: 'saved', label: name.trim() || 'refeição salva', onPick: (p) => setItems((prev) => [...prev, pickedToDraft(p)]) });
    router.push('/foods/search');
  };

  const submit = () => {
    const e: Record<string, string> = {};
    if (name.trim().length < 2) e.name = 'Informe um nome.';
    if (items.length === 0) e.items = 'Adicione pelo menos um item.';
    else if (items.some((i) => i.unavailable)) e.items = 'Remova os itens que não existem mais.';
    else if (items.some((i) => !(parseDecimal(i.quantity) > 0))) e.items = 'Revise as quantidades.';
    setErrors(e);
    if (Object.keys(e).length) return;
    save.mutate(
      { name: name.trim(), description: description.trim() || null, meal_type: mealType === 'none' ? null : mealType, items: items.map(draftToInput) },
      {
        onError: (err) => {
          if (err instanceof ApiError && err.status === 422) setErrors(Object.fromEntries(Object.entries(err.errors).map(([k, v]) => [k.startsWith('items') ? 'items' : k, v[0]!])));
          else toast.error(err instanceof ApiError ? err.firstError : 'Não foi possível salvar.');
        },
      },
    );
  };

  return (
    <Screen header={<StackHeader title={editing ? 'Editar refeição salva' : 'Nova refeição salva'} />}>
      <Card style={{ gap: 12 }}>
        <Input label="Nome" value={name} onChangeText={setName} placeholder="Ex: Meu café da manhã" error={errors.name} maxLength={160} />
        <Input label="Descrição (opcional)" value={description} onChangeText={setDescription} placeholder="Ex: Dias de treino" maxLength={500} />
        <View style={{ gap: 6 }}>
          <Text variant="label" tone="secondary">Período sugerido</Text>
          <ChipRow value={mealType} onChange={setMealType} options={[{ id: 'none', label: 'Nenhum' }, ...MEAL_TYPES.filter((m) => m.id !== 'custom').map((m) => ({ id: m.id, label: m.label }))]} />
        </View>
      </Card>

      <View style={{ gap: 8 }}>
        <Text variant="label" weight="bold" tone="secondary">Itens</Text>
        {items.map((it) => (
          <DraftItemRow key={it.key} item={it} onChange={(q) => setItems((prev) => prev.map((x) => (x.key === it.key ? { ...x, quantity: q } : x)))}
            onRemove={() => setItems((prev) => prev.filter((x) => x.key !== it.key))} />
        ))}
        {errors.items && <Text variant="caption" tone="danger">{errors.items}</Text>}
        <Pressable onPress={addItem} accessibilityRole="button" style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: radius.md, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.borderStrong }}>
          <Plus size={14} color={colors.primary} /><Text variant="caption" weight="bold" tone="primary">Adicionar alimento ou receita</Text>
        </Pressable>
      </View>

      <Card style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <View>
          <Text variant="tiny" tone="muted">Total (prévia)</Text>
          <Text variant="caption" tone="muted">Proteínas {grams(total.protein_g)} · Carbos {grams(total.carbs_g)} · Gorduras {grams(total.fat_g)}</Text>
        </View>
        <Text variant="bigNumber" size={22}>{kcal(total.kcal)} <Text variant="label" tone="muted">kcal</Text></Text>
      </Card>

      <Button fullWidth size="lg" loading={save.isPending} icon={<Check size={18} color={colors.onPrimary} />} onPress={submit}>{editing ? 'Salvar alterações' : 'Criar refeição salva'}</Button>
    </Screen>
  );
}
