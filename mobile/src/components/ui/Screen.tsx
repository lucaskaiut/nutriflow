import type { ReactNode } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { IconButton } from './Controls';
import { Text } from './Text';

/** Corpo rolável das telas (padding do protótipo: px-4 py-4), com "puxar para atualizar". */
export function Screen({ children, refreshing, onRefresh, bottomInset = 24, header }: { children: ReactNode; refreshing?: boolean; onRefresh?: () => void; bottomInset?: number; header?: ReactNode }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.flex, { backgroundColor: colors.background }]}>
      {header}
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: bottomInset }]}
        keyboardShouldPersistTaps="handled"
        refreshControl={onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} /> : undefined}
      >
        {children}
      </ScrollView>
    </View>
  );
}

/** Cabeçalho das telas empilhadas (voltar · título/subtítulo · ação), como no protótipo. */
export function StackHeader({ title, subtitle, right, onBack }: { title: string; subtitle?: string; right?: ReactNode; onBack?: () => void }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.header, { paddingTop: insets.top + 8, backgroundColor: colors.background }]}>
      <IconButton label="Voltar" onPress={onBack ?? (() => (router.canGoBack() ? router.back() : router.replace('/')))} icon={<ChevronLeft size={20} color={colors.text} />} size={42} />
      <View style={styles.headerCenter}>
        <Text variant="heading" numberOfLines={1}>{title}</Text>
        {subtitle && <Text variant="tiny" tone="subtle" numberOfLines={1}>{subtitle}</Text>}
      </View>
      <View style={styles.headerRight}>{right}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: 16, gap: 16 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 8, gap: 12 },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerRight: { minWidth: 42, alignItems: 'flex-end' },
});
