import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Bookmark, CookingPot, Plus, Search, Star, X } from 'lucide-react-native';

import { ApiError } from '@/api/client';
import { RecipeImage } from '@/components/recipe/RecipeImage';
import { Button, Card, EmptyState, ErrorState, Input, Screen, Segmented, SkeletonList, Text } from '@/components/ui';
import { useRecipes } from '@/features/queries';
import { kcal, num } from '@/lib/format';
import { useDebounced } from '@/lib/useDebounced';
import { usePicker } from '@/stores/picker';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, type TintName } from '@/theme/tokens';

type Filter = 'all' | 'favorites' | 'recent' | 'archived';

export default function RecipesScreen() {
  const { colors } = useTheme();
  const [filter, setFilter] = useState<Filter>('all');
  const [q, setQ] = useState('');
  const query = useDebounced(q.trim());
  const recipes = useRecipes({ filter, q: query || undefined });
  const setTarget = usePicker((s) => s.setTarget);

  const open = (id: string) => {
    setTarget(null); // aberto pela aba: sem destino pré-definido
    router.push({ pathname: '/recipes/[id]', params: { id } });
  };

  return (
    <Screen refreshing={recipes.isRefetching} onRefresh={() => void recipes.refetch()}>
      <View style={styles.rowBetween}>
        <Text variant="title" style={{ flex: 1 }}>Receitas</Text>
        <Button variant="outline" size="sm" icon={<Bookmark size={14} color={colors.textSecondary} />} onPress={() => { setTarget(null); router.push('/saved-meals'); }}>Refeições salvas</Button>
        <Button size="sm" icon={<Plus size={16} color={colors.onPrimary} />} onPress={() => router.push('/recipes/form')}>Nova</Button>
      </View>

      <Segmented value={filter} onChange={setFilter} options={[
        { id: 'all', label: 'Todas' },
        { id: 'favorites', label: 'Favoritas' },
        { id: 'recent', label: 'Recentes' },
        { id: 'archived', label: 'Arquivadas' },
      ]} />
      <Input placeholder="Buscar receita" value={q} onChangeText={setQ} left={<Search size={16} color={colors.textSubtle} />}
        right={q ? <Pressable onPress={() => setQ('')} accessibilityLabel="Limpar busca"><X size={16} color={colors.textSubtle} /></Pressable> : undefined} />

      {recipes.isPending ? <SkeletonList type="recipes" /> : recipes.isError ? (
        <ErrorState message={recipes.error instanceof ApiError ? recipes.error.message : undefined} onRetry={() => recipes.refetch()} />
      ) : recipes.data.length === 0 ? (
        <EmptyState
          title={query ? 'Nenhuma receita encontrada' : filter === 'favorites' ? 'Nenhuma receita favorita' : filter === 'archived' ? 'Nenhuma receita arquivada' : 'Nenhuma receita cadastrada'}
          description="Cadastre os ingredientes e o rendimento. O valor de cada porção é calculado a partir deles."
          actionLabel={filter === 'all' && !query ? 'Criar receita' : undefined} onAction={() => router.push('/recipes/form')} />
      ) : (
        <View style={styles.grid}>
          {recipes.data.map((r, i) => (
            <Card key={r.id} variant={TINTS[i % TINTS.length]} onPress={() => open(r.id)} accessibilityLabel={r.name} style={styles.tile}>
              <View style={styles.tileTop}>
                {r.has_photo ? <RecipeImage recipe={r} style={styles.thumb} /> : (
                  <View style={[styles.iconRound, { backgroundColor: colors.surface }]}><CookingPot size={20} color={colors.text} strokeWidth={1.75} /></View>
                )}
                {r.is_favorite && <Star size={16} color={colors.star} fill={colors.star} />}
              </View>
              <Text variant="heading" numberOfLines={2} style={{ color: colors.onTint, minHeight: 40 }}>{r.name}</Text>
              <Text variant="bigNumber" size={26} style={{ color: colors.onTint }}>{kcal(r.nutrition.per_serving.kcal)}<Text variant="caption" style={{ color: colors.onTint }}> kcal/porção</Text></Text>
              <View style={styles.inline}>
                <View style={[styles.meta, { backgroundColor: colors.surface }]}><Text variant="tiny" weight="semibold">{num(r.servings)} {r.servings === 1 ? 'porção' : 'porções'}</Text></View>
                {r.prep_time_minutes ? <View style={[styles.meta, { backgroundColor: colors.surface }]}><Text variant="tiny" weight="semibold">{r.prep_time_minutes} min</Text></View> : null}
              </View>
            </Card>
          ))}
        </View>
      )}
    </Screen>
  );
}

const TINTS: TintName[] = ['mint', 'sky', 'lilac', 'butter', 'lavender'];

const styles = StyleSheet.create({
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  inline: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 12 },
  tile: { width: '48.3%', gap: 8, padding: 16 },
  tileTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 4 },
  iconRound: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  thumb: { width: 56, height: 56, borderRadius: 28 },
  meta: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.full },
});
