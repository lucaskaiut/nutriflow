import type { BottomTabBarProps } from 'expo-router/tabs';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Calendar, Home, TrendingUp, User, Utensils, type LucideIcon } from 'lucide-react-native';

import { Text } from '@/components/ui';
import { useTheme } from '@/theme/ThemeProvider';

const TABS: Record<string, { label: string; icon: LucideIcon }> = {
  index: { label: 'Início', icon: Home },
  diary: { label: 'Diário', icon: Calendar },
  recipes: { label: 'Receitas', icon: Utensils },
  evolution: { label: 'Evolução', icon: TrendingUp },
  profile: { label: 'Perfil', icon: User },
};

/** Barra inferior flutuante em pílula; a aba ativa vira uma pílula amarela com rótulo. */
export function BottomNav({ state, navigateToTab }: BottomTabBarProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View pointerEvents="box-none" style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, 12), backgroundColor: colors.background }]}>
      <View accessibilityRole="tablist" style={[styles.bar, { backgroundColor: colors.surface }]}>
        {state.routes.map((route, index) => {
          const tab = TABS[route.name];
          if (!tab) return null;
          const active = state.index === index;
          const Icon = tab.icon;
          return (
            <Pressable key={route.key} accessibilityRole="tab" accessibilityState={{ selected: active }} accessibilityLabel={tab.label}
              onPress={() => { if (!active) navigateToTab(route.key); }}
              style={[styles.tab, active && { backgroundColor: colors.accent, flexGrow: 2 }]}>
              <Icon size={20} color={active ? colors.onAccent : colors.textMuted} strokeWidth={active ? 2.2 : 1.8} />
              {active && <Text variant="caption" weight="semibold" style={{ color: colors.onAccent }} numberOfLines={1}>{tab.label}</Text>}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 16, paddingTop: 8 },
  bar: { flexDirection: 'row', alignItems: 'center', padding: 6, gap: 4, borderRadius: 999, shadowColor: '#0F2A30', shadowOpacity: 0.08, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 6 },
  tab: { flexGrow: 1, flexBasis: 0, flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center', height: 48, borderRadius: 999, paddingHorizontal: 8 },
});
