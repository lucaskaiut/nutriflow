import { useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Archive, ArchiveRestore, Camera, Check, Copy, ImageOff, MoreVertical, Pencil, Star, Trash2 } from 'lucide-react-native';

import { ApiError } from '@/api/client';
import { recipesApi } from '@/api/endpoints';
import { MealTargetSheet } from '@/components/diary/MealTargetSheet';
import { deliverPicked } from '@/components/food/addPicked';
import { NutritionPanel } from '@/components/food/NutritionPanel';
import { RecipeImage } from '@/components/recipe/RecipeImage';
import { Button, Card, confirm, ErrorState, IconButton, MenuRow, Screen, Sheet, SkeletonList, StackHeader, Stepper, Text } from '@/components/ui';
import { invalidate, useApiMutation, useRecipe, useRecipeUsage } from '@/features/queries';
import { shortDate } from '@/lib/dates';
import { grams, kcal, num } from '@/lib/format';
import { quantityLabel } from '@/lib/labels';
import { scaleNutrients } from '@/lib/nutritionPreview';
import { usePicker, type PickTarget } from '@/stores/picker';
import { toast } from '@/stores/toast';
import { useTheme } from '@/theme/ThemeProvider';
import { radius } from '@/theme/tokens';

export default function RecipeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const qc = useQueryClient();
  const recipe = useRecipe(id);
  const usage = useRecipeUsage(id);
  const target = usePicker((s) => s.target);
  const [servings, setServings] = useState(1);
  const [adding, setAdding] = useState(false);
  const [menu, setMenu] = useState(false);
  const [chooseMeal, setChooseMeal] = useState(false);

  const favorite = useApiMutation((on: boolean) => recipesApi.favorite(id, on), { invalidate: invalidate.recipes });
  const archive = useApiMutation((on: boolean) => recipesApi.archive(id, on), { invalidate: invalidate.recipes });
  const duplicate = useApiMutation(() => recipesApi.duplicate(id), { invalidate: invalidate.recipes, onSuccess: (r) => router.replace({ pathname: '/recipes/[id]', params: { id: r.id } }) });
  const remove = useApiMutation(() => recipesApi.remove(id), { invalidate: invalidate.recipes, onSuccess: () => router.back() });
  const removePhoto = useApiMutation(() => recipesApi.removePhoto(id), { invalidate: invalidate.recipes });
  const uploadPhoto = useApiMutation((a: { uri: string; mime: string }) => recipesApi.uploadPhoto(id, a.uri, a.mime), { invalidate: invalidate.recipes });

  if (recipe.isPending) return <Screen header={<StackHeader title="Receita" />}><SkeletonList type="list" /></Screen>;
  if (recipe.isError) return <Screen header={<StackHeader title="Receita" />}><ErrorState message={recipe.error instanceof ApiError ? recipe.error.message : undefined} onRetry={() => recipe.refetch()} /></Screen>;
  const r = recipe.data;
  const selected = scaleNutrients(r.nutrition.per_serving, servings);
  // destino vindo do diário (busca → receita) ou do formulário de refeição salva
  const flowTarget = target && target.mode !== 'ingredient' ? target : null;

  const add = async (t: PickTarget, depth: number) => {
    setAdding(true);
    try {
      await deliverPicked(qc, t, { kind: 'recipe', recipe: { id: r.id, name: r.name }, quantity: servings, unit: 'serving', preview: selected }, depth);
      setChooseMeal(false);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.firstError : 'Não foi possível registrar a receita.');
    } finally {
      setAdding(false);
    }
  };

  const pickPhoto = async () => {
    setMenu(false);
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      toast.error('Permita o acesso às fotos para escolher uma imagem.');
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [4, 3], quality: 0.7 });
    if (!res.canceled && res.assets[0]) uploadPhoto.mutate({ uri: res.assets[0].uri, mime: res.assets[0].mimeType ?? 'image/jpeg' });
  };

  return (
    <Screen header={
      <StackHeader title={r.name} subtitle={`Rende ${num(r.servings)} ${r.servings === 1 ? 'porção' : 'porções'}`}
        right={<IconButton label="Mais opções" variant="plain" onPress={() => setMenu(true)} icon={<MoreVertical size={20} color={colors.textSecondary} />} />} />
    }>
      {r.has_photo && (
        <View style={[styles.banner, { borderColor: colors.border }]}>
          <RecipeImage recipe={r} style={StyleSheet.absoluteFill} />
        </View>
      )}
      {(r.is_favorite || r.is_archived || r.prep_time_minutes) ? (
        <Text variant="caption" tone="muted">
          {[r.is_favorite && 'Favorita', r.is_archived && 'Arquivada', r.prep_time_minutes && `${r.prep_time_minutes} min de preparo`].filter(Boolean).join(' · ')}
        </Text>
      ) : null}
      {uploadPhoto.isPending && <Text variant="caption" tone="muted">Enviando foto…</Text>}
      {r.description ? <Text variant="caption" tone="muted">{r.description}</Text> : null}

      <Card style={styles.rowBetween}>
        <Text variant="caption" weight="bold" style={{ flex: 1 }}>Porções a registrar</Text>
        <Stepper value={servings} onChange={setServings} step={0.5} min={0.5} max={100} decimals={1} label="porções" />
      </Card>

      <NutritionPanel title={servings === 1 ? '1 porção' : `${num(servings)} porções`} subtitle={`Receita inteira: ${kcal(r.nutrition.total.kcal)} kcal`} n={selected} />

      <Button fullWidth size="lg" loading={adding} icon={<Check size={18} color={colors.onPrimary} />}
        onPress={() => (flowTarget ? void add(flowTarget, 2) : setChooseMeal(true))}>
        {flowTarget ? (flowTarget.mode === 'saved' ? 'Adicionar à refeição salva' : `Adicionar a ${flowTarget.label}`) : 'Adicionar ao diário'}
      </Button>

      <Card>
        <View style={[styles.rowBetween, { marginBottom: 8 }]}>
          <Text variant="heading">Ingredientes</Text>
          <Text variant="tiny" tone="subtle">{r.ingredients.length} itens</Text>
        </View>
        <View>
          {r.ingredients.map((i, idx) => (
            <View key={idx} style={[styles.ingredient, { borderTopColor: colors.border, borderTopWidth: idx === 0 ? 0 : StyleSheet.hairlineWidth }]}>
              <View style={{ flex: 1 }}>
                <Text variant="caption" weight="semibold" tone="secondary">{i.food.name}{i.food.is_deleted ? ' (removido da busca)' : ''}</Text>
                <Text variant="tiny" tone="subtle">
                  {quantityLabel(i.quantity, i.unit, i.portion?.label)}
                  {i.unit === 'portion' || i.unit === 'kg' || i.unit === 'l' ? ` · ${num(i.base_quantity)} ${i.food.reference_unit}` : ''}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text variant="caption" weight="bold">{kcal(i.nutrients.kcal)} kcal</Text>
                <Text variant="tiny" tone="subtle">P {grams(i.nutrients.protein_g)}</Text>
              </View>
            </View>
          ))}
        </View>
        <View style={[styles.totals, { borderTopColor: colors.border }]}>
          <Text variant="tiny" tone="muted">
            Receita inteira: {kcal(r.nutrition.total.kcal)} kcal · P {grams(r.nutrition.total.protein_g)} · C {grams(r.nutrition.total.carbs_g)} · G {grams(r.nutrition.total.fat_g)}
          </Text>
          {r.yield_weight_g ? <Text variant="tiny" tone="muted">Rendimento total: {num(r.yield_weight_g)} g · porção ≈ {num(r.yield_weight_g / r.servings, 0)} g</Text> : null}
        </View>
      </Card>

      {r.instructions ? (
        <Card>
          <Text variant="heading" style={{ marginBottom: 8 }}>Modo de preparo</Text>
          {r.instructions.split('\n').filter((l) => l.trim()).map((line, i) => (
            <View key={i} style={{ flexDirection: 'row', gap: 8, marginBottom: 6 }}>
              <Text variant="caption" weight="bold" tone="primary">{i + 1}.</Text>
              <Text variant="caption" tone="muted" style={{ flex: 1 }}>{line.trim()}</Text>
            </View>
          ))}
        </Card>
      ) : null}

      <Card>
        <Text variant="heading" style={{ marginBottom: 8 }}>Registros no diário</Text>
        {usage.isPending ? (
          <Text variant="caption" tone="subtle">Carregando…</Text>
        ) : (usage.data?.length ?? 0) === 0 ? (
          <Text variant="caption" tone="subtle">Esta receita ainda não foi registrada no diário.</Text>
        ) : (
          usage.data!.slice(0, 10).map((u, i) => (
            <View key={i} style={[styles.rowBetween, { paddingVertical: 4 }]}>
              <Text variant="caption">{shortDate(u.date)} · {u.meal_title}</Text>
              <Text variant="caption" tone="muted">{num(u.servings)} porç. · {kcal(u.kcal)} kcal</Text>
            </View>
          ))
        )}
      </Card>

      <MealTargetSheet visible={chooseMeal} onClose={() => setChooseMeal(false)} loading={adding} onConfirm={(t) => void add(t, 0)} />

      <Sheet visible={menu} onClose={() => setMenu(false)} title={r.name}>
        <MenuRow icon={<Star size={17} color={colors.star} fill={r.is_favorite ? colors.star : 'transparent'} />} title={r.is_favorite ? 'Remover dos favoritos' : 'Favoritar receita'}
          onPress={() => { setMenu(false); favorite.mutate(!r.is_favorite); }} />
        <MenuRow icon={<Pencil size={17} color={colors.textSecondary} />} title="Editar receita" subtitle="Ingredientes, rendimento e preparo"
          onPress={() => { setMenu(false); router.push({ pathname: '/recipes/form', params: { id: r.id } }); }} />
        <MenuRow icon={<Copy size={17} color={colors.textSecondary} />} title="Duplicar receita" onPress={() => { setMenu(false); duplicate.mutate(); }} />
        <MenuRow icon={<Camera size={17} color={colors.textSecondary} />} title={r.has_photo ? 'Trocar foto' : 'Adicionar foto'} onPress={() => void pickPhoto()} />
        {r.has_photo && <MenuRow icon={<ImageOff size={17} color={colors.textSecondary} />} title="Remover foto" onPress={() => { setMenu(false); removePhoto.mutate(); }} />}
        <MenuRow icon={r.is_archived ? <ArchiveRestore size={17} color={colors.textSecondary} /> : <Archive size={17} color={colors.textSecondary} />}
          title={r.is_archived ? 'Restaurar receita' : 'Arquivar receita'} subtitle={r.is_archived ? 'Volta para a lista principal' : 'Esconde da lista sem excluir'}
          onPress={() => { setMenu(false); archive.mutate(!r.is_archived); }} />
        <MenuRow tone="danger" icon={<Trash2 size={17} color={colors.danger} />} title="Excluir receita" subtitle="Registros já feitos no diário são mantidos"
          onPress={async () => {
            setMenu(false);
            if (await confirm('Excluir receita?', `"${r.name}" será excluída. Os registros do diário continuam com os valores originais.`)) remove.mutate();
          }} />
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  banner: { height: 150, borderRadius: radius.lg, borderWidth: 1, overflow: 'hidden' },
  ingredient: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10 },
  totals: { marginTop: 4, paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth, gap: 2 },
});
