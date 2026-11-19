import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Droplets, Search, Settings } from 'lucide-react-native';

import { Text } from '@/components/ui';
import { useAccount, useWater } from '@/features/queries';
import { initials, num } from '@/lib/format';
import { usePicker } from '@/stores/picker';
import { useTheme } from '@/theme/ThemeProvider';
import { radius } from '@/theme/tokens';

/** Topo das abas: avatar + saudação, água do dia e atalhos redondos (busca e configurações). */
export function TopHeader() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const water = useWater();
  const account = useAccount();
  const setTarget = usePicker((s) => s.setTarget);
  const name = account.data?.name ?? '';
  const liters = water.data ? `${num(water.data.total_ml / 1000, 1)}L` : '—';

  return (
    <View style={[styles.header, { paddingTop: insets.top + 8, backgroundColor: colors.background }]}>
      <Pressable onPress={() => router.push('/(tabs)/profile')} accessibilityRole="button" accessibilityLabel="Abrir perfil" style={styles.who}>
        <View style={[styles.avatar, { backgroundColor: colors.tintLilac }]}>
          <Text variant="label" style={{ color: colors.onTint }}>{name ? initials(name) : ''}</Text>
        </View>
        <Text variant="heading" numberOfLines={1} style={{ flexShrink: 1 }}>{name ? `Olá, ${name.split(' ')[0]}!` : 'NutriFlow'}</Text>
      </Pressable>
      <View style={styles.actions}>
        <Pressable onPress={() => router.push('/water')} accessibilityRole="button" accessibilityLabel={`Água hoje: ${liters}. Registrar água`}
          style={[styles.pill, { backgroundColor: colors.surface }]}>
          <Droplets size={15} color={colors.water} />
          <Text variant="caption" weight="bold" style={{ fontVariant: ['tabular-nums'] }}>{liters}</Text>
        </Pressable>
        <Pressable onPress={() => { setTarget(null); router.push('/foods/search'); }} accessibilityRole="button" accessibilityLabel="Buscar alimentos"
          style={[styles.round, { backgroundColor: colors.surface }]}>
          <Search size={18} color={colors.text} />
        </Pressable>
        <Pressable onPress={() => router.push('/settings')} accessibilityRole="button" accessibilityLabel="Configurações"
          style={[styles.round, { backgroundColor: colors.surface }]}>
          <Settings size={18} color={colors.text} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, paddingHorizontal: 16, paddingBottom: 8 },
  who: { flexDirection: 'row', alignItems: 'center', gap: 10, flexShrink: 1 },
  avatar: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 5, height: 42, paddingHorizontal: 14, borderRadius: radius.full },
  round: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
});
