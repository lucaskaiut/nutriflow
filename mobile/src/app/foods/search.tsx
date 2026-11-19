import { useInfiniteQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, View } from 'react-native';
import { ChefHat, PlusCircle, Search, X } from 'lucide-react-native';

import { foodsApi } from '@/api/endpoints';
import type { Food, Recipe } from '@/api/types';
import { CategoryIcon } from '@/components/food/CategoryIcon';
import { FoodRow } from '@/components/food/FoodRow';
import { ChipRow, EmptyState, ErrorState, Input, Segmented, SkeletonList, StackHeader, Text } from '@/components/ui';
import { useCategories, useRecentFoods, useRecipes } from '@/features/queries';
import { kcal, num } from '@/lib/format';
import { useDebounced } from '@/lib/useDebounced';
import { usePicker } from '@/stores/picker';
import { useTheme } from '@/theme/ThemeProvider';
import { radius } from '@/theme/tokens';

type Scope = 'all' | 'favorites' | 'custom';

/** Buscar alimento (e receitas, quando o destino aceita receitas). */
export default function FoodSearchScreen() {
  const { colors } = useTheme();
  const params = useLocalSearchParams<{ tab?: string }>();
  const target = usePicker((s) => s.target);
  const allowRecipes = target?.mode === 'diary' || target?.mode === 'saved';
  const [tab, setTab] = useState<'foods' | 'recipes'>(params.tab === 'recipes' && allowRecipes ? 'recipes' : 'foods');
  const [q, setQ] = useState('');
  const [category, setCategory] = useState('all');
  const [scope, setScope] = useState<Scope>('all');
  const query = useDebounced(q.trim(), 300);
  const categories = useCategories();
  const recent = useRecentFoods();

  const search = useInfiniteQuery({
    queryKey: ['foods', 'search', { query, category, scope }],
    queryFn: async ({ pageParam }) => {
      const res = await foodsApi.search({ q: query || undefined, category: category === 'all' ? undefined : category, scope, page: pageParam });
      return { items: res.data, page: res.meta?.current_page ?? 1, last: res.meta?.last_page ?? 1, total: res.meta?.total ?? res.data.length };
    },
    initialPageParam: 1,
    getNextPageParam: (last) => (last.page < last.last ? last.page + 1 : undefined),
    enabled: tab === 'foods',
  });

  const openFood = (food: Food) => router.push({ pathname: '/foods/[id]', params: { id: food.id } });
  const subtitle = target ? `Adicionar a ${target.label}` : 'Base TACO e seus alimentos';
  const foods = search.data?.pages.flatMap((p) => p.items) ?? [];
  const showRecent = tab === 'foods' && !query && category === 'all' && scope === 'all' && (recent.data?.length ?? 0) > 0;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StackHeader title="Buscar alimento" subtitle={subtitle}
        right={<Pressable onPress={() => router.push('/foods/form')} accessibilityRole="button" accessibilityLabel="Cadastrar alimento" hitSlop={6}><PlusCircle size={22} color={colors.primary} /></Pressable>} />

      <View style={[styles.controls, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        {allowRecipes && <Segmented value={tab} onChange={setTab} options={[{ id: 'foods', label: 'Alimentos' }, { id: 'recipes', label: 'Minhas receitas' }]} />}
        <Input placeholder={tab === 'foods' ? 'Buscar alimentos (ex: ovo, arroz, frango)…' : 'Buscar receitas…'} value={q} onChangeText={setQ} autoFocus autoCorrect={false}
          left={<Search size={18} color={colors.textSubtle} />}
          right={q ? <Pressable onPress={() => setQ('')} accessibilityLabel="Limpar busca" hitSlop={8}><X size={16} color={colors.textSubtle} /></Pressable> : undefined} />
        {tab === 'foods' && (
          <>
            <ChipRow value={scope} onChange={setScope} options={[{ id: 'all', label: 'Todos' }, { id: 'favorites', label: 'Favoritos' }, { id: 'custom', label: 'Meus alimentos' }]} />
            <ChipRow value={category} onChange={setCategory} options={[{ id: 'all', label: 'Todas as categorias' }, ...(categories.data ?? []).map((c) => ({ id: c.slug, label: c.name }))]} />
          </>
        )}
      </View>

      {tab === 'recipes' ? (
        <RecipePicker q={query} />
      ) : search.isPending ? (
        <View style={{ padding: 16 }}><SkeletonList type="list" /></View>
      ) : search.isError ? (
        <View style={{ padding: 16 }}><ErrorState onRetry={() => search.refetch()} /></View>
      ) : (
        <FlatList
          data={foods}
          keyExtractor={(f) => f.id}
          contentContainerStyle={{ paddingVertical: 16 }}
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={showRecent ? (
            <View style={{ gap: 8, marginBottom: 8, paddingHorizontal: 16 }}>
              <View style={styles.label}><Text variant="caption" weight="semibold" tone="muted">Recentes</Text></View>
              <View style={styles.grid}>
                {recent.data!.slice(0, 6).map((f) => (
                  <Pressable key={f.id} onPress={() => openFood(f)} style={[styles.recent, { backgroundColor: colors.surface, borderColor: colors.border }]} accessibilityRole="button">
                    <Text variant="caption" weight="bold" numberOfLines={1}>{f.name}</Text>
                    <Text variant="tiny" tone="subtle">{kcal(f.nutrients.kcal)} kcal / {num(f.reference_amount)}{f.reference_unit}</Text>
                  </Pressable>
                ))}
              </View>
              <View style={[styles.label, { marginTop: 8 }]}><Text variant="caption" weight="semibold" tone="muted">Todos os alimentos</Text></View>
            </View>
          ) : undefined}
          renderItem={({ item }) => <FoodRow food={item} onPress={() => openFood(item)} showAdd={!!target} />}
          ListEmptyComponent={
            <View style={{ paddingHorizontal: 16 }}><EmptyState title={query ? `Nada encontrado para "${query}"` : scope === 'favorites' ? 'Nenhum favorito ainda' : scope === 'custom' ? 'Nenhum alimento personalizado' : 'Nenhum alimento'}
              description={scope === 'favorites' ? 'Toque na estrela no detalhe de um alimento para favoritá-lo.' : 'Não achou? Cadastre um alimento personalizado com os valores do rótulo.'}
              actionLabel="Cadastrar alimento" onAction={() => router.push({ pathname: '/foods/form', params: { name: query } })} /></View>
          }
          onEndReached={() => search.hasNextPage && !search.isFetchingNextPage && void search.fetchNextPage()}
          onEndReachedThreshold={0.4}
          ListFooterComponent={search.isFetchingNextPage ? <ActivityIndicator color={colors.primary} style={{ margin: 16 }} /> : undefined}
        />
      )}
    </View>
  );
}

function RecipePicker({ q }: { q: string }) {
  const { colors } = useTheme();
  const recipes = useRecipes({ q: q || undefined, filter: 'all' });
  if (recipes.isPending) return <View style={{ padding: 16 }}><SkeletonList type="list" /></View>;
  if (recipes.isError) return <View style={{ padding: 16 }}><ErrorState onRetry={() => recipes.refetch()} /></View>;
  return (
    <FlatList<Recipe>
      data={recipes.data}
      keyExtractor={(r) => r.id}
      contentContainerStyle={{ padding: 16, gap: 8 }}
      renderItem={({ item }) => (
        <Pressable onPress={() => router.push({ pathname: '/recipes/[id]', params: { id: item.id } })} accessibilityRole="button"
          style={[styles.recipe, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <CategoryIcon recipe size={18} />
          <View style={{ flex: 1 }}>
            <Text variant="caption" weight="bold">{item.name}</Text>
            <Text variant="tiny" tone="subtle">Rende {num(item.servings)} porções</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text variant="number" size={12} tone="primary">{kcal(item.nutrition.per_serving.kcal)} kcal</Text>
            <Text variant="tiny" tone="subtle">por porção</Text>
          </View>
        </Pressable>
      )}
      ListEmptyComponent={<EmptyState icon={<ChefHat size={26} color={colors.primary} />} title="Nenhuma receita" description="Crie receitas na aba Receitas para registrá-las por porção." actionLabel="Criar receita" onAction={() => router.push('/recipes/form')} />}
    />
  );
}

const styles = StyleSheet.create({
  controls: { padding: 16, gap: 10, borderBottomWidth: 1 },
  label: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  recent: { width: '48.5%', padding: 10, borderRadius: radius.md, borderWidth: 1 },
  recipe: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: radius.lg, borderWidth: 1 },
});
