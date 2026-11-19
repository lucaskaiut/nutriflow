import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { Check, Plus } from 'lucide-react-native';

import { ApiError } from '@/api/client';
import { recipesApi, type RecipeInput } from '@/api/endpoints';
import type { Recipe } from '@/api/types';
import { DraftItemRow, draftPreview, type DraftItem } from '@/components/items/DraftItemRow';
import { Button, Card, ErrorState, Input, Screen, SkeletonList, StackHeader, Stepper, Text } from '@/components/ui';
import { invalidate, useApiMutation, useRecipe } from '@/features/queries';
import { draftKey, draftToInput, pickedToDraft } from '@/lib/drafts';
import { grams, kcal, num, parseDecimal } from '@/lib/format';
import { scaleNutrients, sumNutrients, ZERO } from '@/lib/nutritionPreview';
import { usePicker } from '@/stores/picker';
import { toast } from '@/stores/toast';
import { useTheme } from '@/theme/ThemeProvider';
import { radius } from '@/theme/tokens';

/** Criar/editar receita: ingredientes da base, rendimento e prévia por porção. */
export default function RecipeFormScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const existing = useRecipe(id ?? '');

  if (id && existing.isPending) return <Screen header={<StackHeader title="Editar receita" />}><SkeletonList type="list" /></Screen>;
  if (id && existing.isError) return <Screen header={<StackHeader title="Editar receita" />}><ErrorState onRetry={() => existing.refetch()} /></Screen>;
  return <RecipeForm initial={id ? existing.data : undefined} />;
}

function RecipeForm({ initial: r }: { initial?: Recipe }) {
  const editing = !!r;
  const id = r?.id;
  const { colors } = useTheme();
  const setTarget = usePicker((s) => s.setTarget);

  const [name, setName] = useState(r?.name ?? '');
  const [description, setDescription] = useState(r?.description ?? '');
  const [servings, setServings] = useState(() => (r ? num(r.servings, 2) : '4'));
  const [yieldWeight, setYieldWeight] = useState(() => (r?.yield_weight_g ? num(r.yield_weight_g, 1) : ''));
  const [prepTime, setPrepTime] = useState(r?.prep_time_minutes ? String(r.prep_time_minutes) : '');
  const [instructions, setInstructions] = useState(r?.instructions ?? '');
  const [items, setItems] = useState<DraftItem[]>(() => (r ? r.ingredients.map((i) => ({
    key: draftKey(), kind: 'food' as const, id: i.food.id, name: i.food.name, quantity: num(i.quantity, 3), unit: i.unit, portion: i.portion,
    perUnit: scaleNutrients(i.nutrients, 1 / i.quantity), unavailable: false,
  })) : []));
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => () => setTarget(null), [setTarget]);

  const s = parseDecimal(servings);
  const total = useMemo(() => sumNutrients(items.map((i) => draftPreview(i) ?? ZERO)), [items]);
  const perServing = s > 0 ? scaleNutrients(total, 1 / s) : null;

  const save = useApiMutation((body: RecipeInput) => (editing ? recipesApi.update(id!, body) : recipesApi.create(body)), {
    invalidate: invalidate.recipes,
    silentError: true,
    onSuccess: (r) => (editing ? router.back() : router.replace({ pathname: '/recipes/[id]', params: { id: r.id } })),
  });

  const addIngredient = () => {
    setTarget({ mode: 'ingredient', label: name.trim() || 'nova receita', onPick: (p) => setItems((prev) => [...prev, pickedToDraft(p)]) });
    router.push('/foods/search');
  };

  const submit = () => {
    const e: Record<string, string> = {};
    if (name.trim().length < 2) e.name = 'Informe o nome da receita.';
    if (!(s > 0 && s <= 1000)) e.servings = 'Informe a quantidade de porções (maior que zero).';
    if (yieldWeight && !(parseDecimal(yieldWeight) > 0)) e.yield_weight_g = 'Rendimento inválido.';
    if (prepTime && !(Number(prepTime) >= 1)) e.prep_time_minutes = 'Tempo inválido.';
    if (items.length === 0) e.ingredients = 'Adicione pelo menos um ingrediente.';
    else if (items.some((i) => !(parseDecimal(i.quantity) > 0))) e.ingredients = 'Revise as quantidades dos ingredientes.';
    setErrors(e);
    if (Object.keys(e).length) return;

    save.mutate({
      name: name.trim(),
      description: description.trim() || null,
      servings: s,
      yield_weight_g: yieldWeight ? parseDecimal(yieldWeight) : null,
      prep_time_minutes: prepTime ? Number(prepTime) : null,
      instructions: instructions.trim() || null,
      ingredients: items.map(draftToInput),
    }, {
      onError: (err) => {
        if (err instanceof ApiError && err.status === 422) {
          setErrors(Object.fromEntries(Object.entries(err.errors).map(([k, v]) => [k.startsWith('ingredients') ? 'ingredients' : k, v[0]!])));
        } else {
          toast.error(err instanceof ApiError ? err.firstError : 'Não foi possível salvar a receita.');
        }
      },
    });
  };

  return (
    <Screen header={<StackHeader title={editing ? 'Editar receita' : 'Nova receita'} />}>
      <Card style={{ gap: 12 }}>
        <Input label="Nome da receita" value={name} onChangeText={setName} placeholder="Ex: Frango cremoso" error={errors.name} maxLength={160} />
        <Input label="Descrição" value={description} onChangeText={setDescription} placeholder="Ex: Refeição rápida para o almoço" multiline maxLength={2000} />
      </Card>

      <Card style={{ gap: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flex: 1 }}>
            <Text variant="caption" weight="bold">Rendimento da receita</Text>
            <Text variant="tiny" tone="muted">Número de porções finais</Text>
          </View>
          <Stepper value={s > 0 ? s : 0} onChange={(v) => setServings(num(v, 2))} step={1} min={1} max={1000} decimals={1} label="porções" />
        </View>
        {errors.servings && <Text variant="caption" tone="danger">{errors.servings}</Text>}
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <View style={{ flex: 1 }}><Input label="Rendimento total (g)" value={yieldWeight} onChangeText={setYieldWeight} keyboardType="decimal-pad" placeholder="Opcional" error={errors.yield_weight_g} /></View>
          <View style={{ flex: 1 }}><Input label="Preparo (min)" value={prepTime} onChangeText={(v) => setPrepTime(v.replace(/\D/g, ''))} keyboardType="number-pad" placeholder="Opcional" error={errors.prep_time_minutes} /></View>
        </View>
      </Card>

      <View style={{ gap: 8 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text variant="label" weight="bold" tone="secondary">Ingredientes</Text>
          <Text variant="tiny" tone="subtle">{items.length} adicionados</Text>
        </View>
        {items.map((it) => (
          <DraftItemRow key={it.key} item={it}
            onChange={(q) => setItems((prev) => prev.map((x) => (x.key === it.key ? { ...x, quantity: q } : x)))}
            onRemove={() => setItems((prev) => prev.filter((x) => x.key !== it.key))} />
        ))}
        {errors.ingredients && <Text variant="caption" tone="danger">{errors.ingredients}</Text>}
        <Pressable onPress={addIngredient} accessibilityRole="button" style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: radius.md, borderWidth: 1, borderColor: colors.borderStrong }}>
          <Plus size={14} color={colors.primary} /><Text variant="caption" weight="bold" tone="primary">Adicionar ingrediente</Text>
        </Pressable>
      </View>

      <Card style={{ gap: 10 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <View>
            <Text variant="caption" tone="muted">Por porção ({num(s > 0 ? s : 0)} no total)</Text>
            <Text variant="bigNumber" size={22}>{kcal(perServing?.kcal)}<Text variant="label" tone="muted"> kcal</Text></Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text variant="caption" tone="muted">Receita inteira</Text>
            <Text variant="number" size={14}>{kcal(total.kcal)} kcal</Text>
          </View>
        </View>
        <Text variant="caption" tone="secondary">
          Proteínas <Text variant="caption" weight="bold">{grams(perServing?.protein_g)}</Text> · Carboidratos <Text variant="caption" weight="bold">{grams(perServing?.carbs_g)}</Text> · Gorduras <Text variant="caption" weight="bold">{grams(perServing?.fat_g)}</Text>
        </Text>
        <Text variant="tiny" tone="subtle">Prévia. Os valores definitivos são calculados ao salvar.</Text>
      </Card>

      <Input label="Modo de preparo (um passo por linha)" value={instructions} onChangeText={setInstructions} multiline placeholder={'Cozinhe o frango…\nJunte os demais ingredientes…'} style={{ minHeight: 100, textAlignVertical: 'top' }} maxLength={10000} />

      <Button fullWidth size="lg" loading={save.isPending} icon={<Check size={18} color={colors.onPrimary} />} onPress={submit}>{editing ? 'Salvar alterações' : 'Salvar receita'}</Button>
    </Screen>
  );
}
