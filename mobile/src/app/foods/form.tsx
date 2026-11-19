import { zodResolver } from '@hookform/resolvers/zod';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { View } from 'react-native';
import { Check } from 'lucide-react-native';
import { z } from 'zod';

import { foodsApi } from '@/api/endpoints';
import { Button, Card, ChipRow, ErrorState, Input, Screen, Segmented, SkeletonList, StackHeader, Text } from '@/components/ui';
import { invalidate, useApiMutation, useCategories, useFood } from '@/features/queries';
import { applyApiErrors } from '@/lib/forms';
import { num, parseDecimal } from '@/lib/format';
import { useTheme } from '@/theme/ThemeProvider';

const decimal = (label: string, required = true) =>
  z.string().trim().refine((v) => (!required && v === '') || (parseDecimal(v) >= 0 && parseDecimal(v) <= 100000), `Informe ${label} (número ≥ 0).`);

const schema = z.object({
  name: z.string().trim().min(2, 'Informe o nome do alimento.').max(160),
  description: z.string().max(500),
  category: z.string(),
  reference_amount: z.string().refine((v) => parseDecimal(v) > 0, 'Informe a quantidade de referência.'),
  reference_unit: z.enum(['g', 'ml', 'un']),
  kcal: decimal('as calorias'),
  protein_g: decimal('as proteínas'),
  carbs_g: decimal('os carboidratos'),
  fat_g: decimal('as gorduras'),
  fiber_g: decimal('as fibras', false),
  sodium_mg: decimal('o sódio', false),
});
type Form = z.infer<typeof schema>;
const FIELDS = ['name', 'description', 'category', 'reference_amount', 'reference_unit', 'kcal', 'protein_g', 'carbs_g', 'fat_g', 'fiber_g', 'sodium_mg'] as const;

/** Cadastro/edição de alimento personalizado (visível só para a própria pessoa). */
export default function FoodFormScreen() {
  const { colors } = useTheme();
  const { id, name } = useLocalSearchParams<{ id?: string; name?: string }>();
  const editing = !!id;
  const food = useFood(id ?? '');
  const categories = useCategories();
  const { control, handleSubmit, reset, setError, formState: { errors } } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: { name: name ?? '', description: '', category: 'outros', reference_amount: '100', reference_unit: 'g', kcal: '', protein_g: '', carbs_g: '', fat_g: '', fiber_g: '', sodium_mg: '' },
  });

  useEffect(() => {
    const f = food.data;
    if (!f) return;
    const s = (v: number | null | undefined) => (v === null || v === undefined ? '' : num(v, 3));
    reset({
      name: f.name, description: f.description ?? '', category: f.category?.slug ?? 'outros', reference_amount: s(f.reference_amount), reference_unit: f.reference_unit,
      kcal: s(f.nutrients.kcal), protein_g: s(f.nutrients.protein_g), carbs_g: s(f.nutrients.carbs_g), fat_g: s(f.nutrients.fat_g), fiber_g: s(f.nutrients.fiber_g),
      sodium_mg: s(f.extra_nutrients?.find((n) => n.nutrient === 'sodium_mg')?.amount),
    });
  }, [food.data, reset]);

  const save = useApiMutation(
    (body: Record<string, unknown>) => (editing ? foodsApi.update(id!, body) : foodsApi.create(body)),
    { invalidate: invalidate.foods, silentError: true, onSuccess: (f) => (editing ? router.back() : router.replace({ pathname: '/foods/[id]', params: { id: f.id } })) },
  );

  const submit = handleSubmit((v) => {
    const opt = (x: string) => (x.trim() === '' ? null : parseDecimal(x));
    save.mutate(
      {
        name: v.name.trim(), description: v.description.trim() || null, category: v.category, reference_amount: parseDecimal(v.reference_amount), reference_unit: v.reference_unit,
        kcal: parseDecimal(v.kcal), protein_g: parseDecimal(v.protein_g), carbs_g: parseDecimal(v.carbs_g), fat_g: parseDecimal(v.fat_g), fiber_g: opt(v.fiber_g),
        nutrients: { sodium_mg: opt(v.sodium_mg) },
      },
      { onError: (e) => applyApiErrors(e, setError, FIELDS) },
    );
  });

  if (editing && food.isPending) return <Screen header={<StackHeader title="Editar alimento" />}><SkeletonList type="list" /></Screen>;
  if (editing && food.isError) return <Screen header={<StackHeader title="Editar alimento" />}><ErrorState onRetry={() => food.refetch()} /></Screen>;

  const field = (key: (typeof FIELDS)[number], label: string, props: Partial<React.ComponentProps<typeof Input>> = {}) => (
    <Controller control={control} name={key} render={({ field: f }) => (
      <Input label={label} value={f.value} onChangeText={f.onChange} error={errors[key]?.message} {...props} />
    )} />
  );

  return (
    <Screen header={<StackHeader title={editing ? 'Editar alimento' : 'Novo alimento'} />}>
      <Card style={{ gap: 12 }}>
        {field('name', 'Nome', { placeholder: 'Ex: Pão de fermentação natural', maxLength: 160 })}
        {field('description', 'Descrição (opcional)', { placeholder: 'Marca, preparo…', maxLength: 500 })}
        <View style={{ gap: 6 }}>
          <Text variant="label" tone="secondary">Categoria</Text>
          <Controller control={control} name="category" render={({ field: f }) => (
            <ChipRow value={f.value} onChange={f.onChange} options={(categories.data ?? [{ slug: 'outros', name: 'Outros' }]).map((c) => ({ id: c.slug, label: c.name }))} />
          )} />
        </View>
      </Card>

      <Card style={{ gap: 12 }}>
        <Text variant="caption" weight="bold">Valores nutricionais</Text>
        <Text variant="tiny" tone="muted">Copie os valores da tabela nutricional do rótulo, para a quantidade de referência indicada.</Text>
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-end' }}>
          <View style={{ flex: 1 }}>{field('reference_amount', 'Quantidade de referência', { keyboardType: 'decimal-pad' })}</View>
          <View style={{ flex: 1.2 }}>
            <Controller control={control} name="reference_unit" render={({ field: f }) => (
              <Segmented value={f.value} onChange={f.onChange} options={[{ id: 'g', label: 'g' }, { id: 'ml', label: 'ml' }, { id: 'un', label: 'un' }]} />
            )} />
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <View style={{ flex: 1 }}>{field('kcal', 'Calorias (kcal)', { keyboardType: 'decimal-pad' })}</View>
          <View style={{ flex: 1 }}>{field('protein_g', 'Proteínas (g)', { keyboardType: 'decimal-pad' })}</View>
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <View style={{ flex: 1 }}>{field('carbs_g', 'Carboidratos (g)', { keyboardType: 'decimal-pad' })}</View>
          <View style={{ flex: 1 }}>{field('fat_g', 'Gorduras (g)', { keyboardType: 'decimal-pad' })}</View>
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <View style={{ flex: 1 }}>{field('fiber_g', 'Fibras (g) — opcional', { keyboardType: 'decimal-pad' })}</View>
          <View style={{ flex: 1 }}>{field('sodium_mg', 'Sódio (mg) — opcional', { keyboardType: 'decimal-pad' })}</View>
        </View>
      </Card>

      <Button fullWidth size="lg" loading={save.isPending} icon={<Check size={18} color={colors.onPrimary} />} onPress={() => void submit()}>{editing ? 'Salvar alterações' : 'Cadastrar alimento'}</Button>
    </Screen>
  );
}
