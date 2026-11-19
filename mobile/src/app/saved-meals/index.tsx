import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { ArrowRight, Bookmark, Copy, Pencil, Plus, Star, Trash2 } from 'lucide-react-native';

import { ApiError } from '@/api/client';
import { savedMealsApi } from '@/api/endpoints';
import type { SavedMeal } from '@/api/types';
import { MealTargetSheet } from '@/components/diary/MealTargetSheet';
import { Button, Card, confirm, EmptyState, ErrorState, IconButton, Screen, Segmented, SkeletonList, StackHeader, Text } from '@/components/ui';
import { invalidate, useApiMutation, useSavedMeals } from '@/features/queries';
import { kcal, num } from '@/lib/format';
import { mealTypeLabel, quantityLabel } from '@/lib/labels';
import { usePicker, type PickTarget } from '@/stores/picker';
import { useTheme } from '@/theme/ThemeProvider';
import { radius } from '@/theme/tokens';

/** Refeições salvas: combinações frequentes de alimentos (independentes das receitas). */
export default function SavedMealsScreen() {
  const { pick } = useLocalSearchParams<{ pick?: string }>();
  const { colors } = useTheme();
  const [filter, setFilter] = useState<'all' | 'favorites'>('all');
  const list = useSavedMeals(filter);
  const target = usePicker((s) => s.target);
  const setTarget = usePicker((s) => s.setTarget);
  const diaryTarget = pick && target?.mode === 'diary' ? target : null;
  const [choosing, setChoosing] = useState<SavedMeal | null>(null);

  const duplicate = useApiMutation((id: string) => savedMealsApi.duplicate(id), { invalidate: invalidate.savedMeals });
  const remove = useApiMutation((id: string) => savedMealsApi.remove(id), { invalidate: invalidate.savedMeals });
  const favorite = useApiMutation((v: { id: string; on: boolean }) => savedMealsApi.favorite(v.id, v.on), { invalidate: invalidate.savedMeals, successMessage: false });
  const addToDiary = useApiMutation(
    (v: { meal: SavedMeal; t: Extract<PickTarget, { mode: 'diary' }> }) => savedMealsApi.addToDiary(v.meal.id, { date: v.t.date, type: v.t.type }),
    {
      invalidate: invalidate.diary,
      onSuccess: () => {
        setChoosing(null);
        setTarget(null);
        if (diaryTarget) router.back();
      },
    },
  );

  const add = (meal: SavedMeal) => (diaryTarget ? addToDiary.mutate({ meal, t: diaryTarget }) : setChoosing(meal));

  return (
    <Screen
      header={<StackHeader title="Refeições salvas" subtitle={diaryTarget ? `Adicionar a ${diaryTarget.label}` : undefined}
        right={<IconButton label="Nova refeição salva" variant="plain" onPress={() => router.push('/saved-meals/form')} icon={<Plus size={22} color={colors.primary} />} />} />}
      refreshing={list.isRefetching} onRefresh={() => void list.refetch()}
    >
      <Segmented value={filter} onChange={setFilter} options={[{ id: 'all', label: 'Todas' }, { id: 'favorites', label: 'Favoritas', icon: <Star size={12} color={colors.star} fill={colors.star} /> }]} />

      {list.isPending ? <SkeletonList type="list" /> : list.isError ? (
        <ErrorState message={list.error instanceof ApiError ? list.error.message : undefined} onRetry={() => list.refetch()} />
      ) : list.data.length === 0 ? (
        <EmptyState icon={<Bookmark size={26} color={colors.primary} />} title={filter === 'favorites' ? 'Nenhuma refeição favorita' : 'Nenhuma refeição salva'}
          description='Salve combinações que você repete — como "Meu café da manhã" — e registre tudo de uma vez.' actionLabel="Criar refeição salva" onAction={() => router.push('/saved-meals/form')} />
      ) : list.data.map((m) => {
        const unavailable = m.items.some((i) => !i.is_available);
        return (
          <Card key={m.id} style={{ gap: 10 }}>
            <View style={styles.rowBetween}>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text variant="subheading" size={14}>{m.name}</Text>
                  {m.is_favorite && <Star size={13} color={colors.star} fill={colors.star} />}
                </View>
                <Text variant="tiny" tone="muted">{[m.meal_type ? mealTypeLabel(m.meal_type) : null, m.description].filter(Boolean).join(' · ') || `${m.items.length} itens`}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text variant="number" size={12} tone="primary">{kcal(m.nutrition.kcal)} kcal</Text>
                <Text variant="tiny" tone="subtle">{num(m.nutrition.protein_g, 0)}g prot</Text>
              </View>
            </View>
            <View style={styles.pills}>
              {m.items.map((i, idx) => (
                <View key={idx} style={[styles.pill, { backgroundColor: i.is_available ? colors.surfaceSunken : colors.dangerSoft }]}>
                  <Text variant="tiny" tone={i.is_available ? 'secondary' : 'danger'}>{i.name} ({quantityLabel(i.quantity, i.unit, i.portion?.label)})</Text>
                </View>
              ))}
            </View>
            {unavailable && <Text variant="tiny" tone="danger">Algum item foi excluído. Edite a refeição salva antes de usá-la.</Text>}
            <View style={[styles.rowBetween, styles.toolbar, { borderTopColor: colors.border }]}>
              <View style={{ flexDirection: 'row', gap: 4 }}>
                <IconButton label={m.is_favorite ? 'Remover dos favoritos' : 'Favoritar'} variant="plain" onPress={() => favorite.mutate({ id: m.id, on: !m.is_favorite })}
                  icon={<Star size={15} color={m.is_favorite ? colors.star : colors.textSubtle} fill={m.is_favorite ? colors.star : 'transparent'} />} />
                <IconButton label="Editar" variant="plain" onPress={() => router.push({ pathname: '/saved-meals/form', params: { id: m.id } })} icon={<Pencil size={15} color={colors.textSubtle} />} />
                <IconButton label="Duplicar" variant="plain" onPress={() => duplicate.mutate(m.id)} icon={<Copy size={15} color={colors.textSubtle} />} />
                <IconButton label="Excluir" variant="plain" icon={<Trash2 size={15} color={colors.textSubtle} />}
                  onPress={async () => { if (await confirm('Excluir refeição salva?', `"${m.name}" será excluída. Registros já feitos no diário continuam intactos.`)) remove.mutate(m.id); }} />
              </View>
              <Button size="sm" variant="secondary" disabled={unavailable} loading={addToDiary.isPending && addToDiary.variables?.meal.id === m.id}
                iconRight={<ArrowRight size={14} color={colors.primary} />} onPress={() => add(m)}>
                Adicionar ao diário
              </Button>
            </View>
          </Card>
        );
      })}

      <MealTargetSheet visible={!!choosing} onClose={() => setChoosing(null)} defaultType={choosing?.meal_type} loading={addToDiary.isPending}
        onConfirm={(t) => choosing && addToDiary.mutate({ meal: choosing, t })} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  pill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.sm },
  toolbar: { borderTopWidth: 1, paddingTop: 8 },
});
