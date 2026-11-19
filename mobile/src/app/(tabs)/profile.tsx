import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Apple, BarChart3, Bell, Bookmark, LogOut, Pencil, Ruler, Settings, ShieldCheck, Target } from 'lucide-react-native';

import { authApi } from '@/api/endpoints';
import { ErrorState, MenuGroup, MenuRow, Screen, SectionTitle, SkeletonList, Text } from '@/components/ui';
import { useAccount, useDashboard } from '@/features/queries';
import { initials, length, weight } from '@/lib/format';
import { goalLabel } from '@/lib/labels';
import { usePicker } from '@/stores/picker';
import { useSession } from '@/stores/session';
import { toast } from '@/stores/toast';
import { useTheme } from '@/theme/ThemeProvider';
import { radius } from '@/theme/tokens';

export default function ProfileScreen() {
  const { colors } = useTheme();
  const account = useAccount();
  const dashboard = useDashboard();
  const signOut = useSession((s) => s.signOut);
  const setTarget = usePicker((s) => s.setTarget);
  const qc = useQueryClient();
  const [leaving, setLeaving] = useState(false);

  if (account.isPending) return <Screen><SkeletonList type="list" /></Screen>;
  if (account.isError) return <Screen><ErrorState onRetry={() => account.refetch()} /></Screen>;
  const a = account.data;
  const prefs = a.preferences;
  const ic = (Icon: typeof Target) => <Icon size={17} color={colors.textMuted} />;

  const logout = async () => {
    setLeaving(true);
    try {
      await authApi.logout(); // revoga o token no servidor
    } catch {
      // mesmo sem conexão, a sessão local é encerrada
    }
    qc.clear();
    await signOut();
    toast.info('Você saiu da sua conta.');
  };

  return (
    <Screen>
      <View style={styles.hero}>
        <View style={[styles.avatar, { backgroundColor: colors.primarySoft }]}>
          <Text variant="heading" size={18} tone="primary">{initials(a.name)}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text variant="title" size={18} numberOfLines={1}>{a.name}</Text>
          <Text variant="caption" tone="muted" numberOfLines={1}>{a.email}</Text>
        </View>
        <Pressable onPress={() => router.push('/profile-edit')} accessibilityRole="button" accessibilityLabel="Editar perfil" hitSlop={8}
          style={[styles.edit, { borderColor: colors.borderStrong }]}>
          <Pencil size={15} color={colors.textSecondary} />
        </Pressable>
      </View>
      <Text variant="caption" tone="secondary">
        {goalLabel(a.profile.goal)} · {weight(dashboard.data?.weight.current_kg ?? a.profile.initial_weight_kg, prefs)} hoje, meta de {weight(a.profile.target_weight_kg, prefs)} · {length(a.profile.height_cm, prefs, prefs.length_unit === 'in' ? 1 : 0)}
      </Text>

      <View style={{ gap: 6 }}>
        <SectionTitle>Nutrição</SectionTitle>
        <MenuGroup>
          <MenuRow icon={ic(Target)} title="Metas" subtitle="Calorias, macronutrientes, água e peso" onPress={() => router.push('/goals')} />
          <MenuRow icon={ic(BarChart3)} title="Relatórios" onPress={() => router.push('/reports')} />
          <MenuRow icon={ic(Apple)} title="Alimentos" subtitle="Busca, favoritos e alimentos próprios" onPress={() => { setTarget(null); router.push('/foods/search'); }} />
          <MenuRow icon={ic(Bookmark)} title="Refeições salvas" onPress={() => { setTarget(null); router.push('/saved-meals'); }} />
        </MenuGroup>
      </View>

      <View style={{ gap: 6 }}>
        <SectionTitle>Corpo</SectionTitle>
        <MenuGroup>
          <MenuRow icon={ic(Pencil)} title="Dados pessoais" subtitle="Nascimento, altura, objetivo e atividade" onPress={() => router.push('/profile-edit')} />
          <MenuRow icon={ic(Ruler)} title="Medidas corporais" onPress={() => router.push('/measurements')} />
        </MenuGroup>
      </View>

      <View style={{ gap: 6 }}>
        <SectionTitle>Aplicativo</SectionTitle>
        <MenuGroup>
          <MenuRow icon={ic(Settings)} title="Tema e unidades" onPress={() => router.push({ pathname: '/settings', params: { section: 'appearance' } })} />
          <MenuRow icon={ic(Bell)} title="Lembretes" onPress={() => router.push({ pathname: '/settings', params: { section: 'notifications' } })} />
          <MenuRow icon={ic(ShieldCheck)} title="Privacidade e dados" subtitle="Termos, exportação e exclusão da conta" onPress={() => router.push({ pathname: '/settings', params: { section: 'privacy' } })} />
          <MenuRow icon={<LogOut size={17} color={colors.danger} />} tone="danger" title={leaving ? 'Saindo…' : 'Sair'} right={<View />} onPress={() => { if (!leaving) void logout(); }} />
        </MenuGroup>
      </View>

      <Text variant="tiny" tone="subtle">NutriFlow 1.0.0 · Composição dos alimentos: TACO 4ª ed. (NEPA/UNICAMP)</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingTop: 4 },
  avatar: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  edit: { width: 36, height: 36, borderRadius: radius.md, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
});
