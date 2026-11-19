import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Download, FileText, Monitor, Moon, Sun, Trash2 } from 'lucide-react-native';

import { ApiError } from '@/api/client';
import { accountApi } from '@/api/endpoints';
import type { Preferences } from '@/api/types';
import { PasswordInput } from '@/components/auth/PasswordInput';
import { Button, Card, Dialog, ErrorState, Input, MenuGroup, MenuRow, Screen, SectionTitle, SkeletonList, StackHeader, SwitchRow, Text } from '@/components/ui';
import { keys, useAccount } from '@/features/queries';
import { exportMyData } from '@/lib/exportData';
import { ensureNotificationPermission } from '@/lib/reminders';
import { useSession } from '@/stores/session';
import { toast } from '@/stores/toast';
import { useTheme } from '@/theme/ThemeProvider';
import { radius } from '@/theme/tokens';

export default function SettingsScreen() {
  const { colors } = useTheme();
  const qc = useQueryClient();
  const account = useAccount();
  const [saving, setSaving] = useState<keyof Preferences | null>(null);
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  if (account.isPending) return <Screen header={<StackHeader title="Configurações" />}><SkeletonList type="list" /></Screen>;
  if (account.isError) return <Screen header={<StackHeader title="Configurações" />}><ErrorState onRetry={() => account.refetch()} /></Screen>;
  const prefs = account.data.preferences;

  /** Salva no servidor e só então aplica (nenhuma alteração aparenta sucesso sem confirmação). */
  const update = async <K extends keyof Preferences>(key: K, value: Preferences[K]) => {
    if (key.endsWith('reminders') || key === 'weight_reminder') {
      if (value === true && !(await ensureNotificationPermission())) {
        toast.error('Permita as notificações nas configurações do aparelho para ativar os lembretes.');
        return;
      }
    }
    setSaving(key);
    try {
      const { data } = await accountApi.preferences({ [key]: value });
      qc.setQueryData(keys.me, data);
      await qc.invalidateQueries({ queryKey: ['dashboard'] });
    } catch (e) {
      toast.error(e instanceof ApiError ? e.firstError : 'Não foi possível salvar a preferência.');
    } finally {
      setSaving(null);
    }
  };

  const doExport = async () => {
    setExporting(true);
    try {
      await exportMyData();
      toast.success('Exportação gerada.');
    } catch (e) {
      toast.error(e instanceof ApiError ? e.firstError : e instanceof Error ? e.message : 'Não foi possível exportar.');
    } finally {
      setExporting(false);
    }
  };

  const themes = [
    { id: 'light' as const, label: 'Claro', icon: Sun },
    { id: 'dark' as const, label: 'Escuro', icon: Moon },
    { id: 'system' as const, label: 'Sistema', icon: Monitor },
  ];

  return (
    <Screen header={<StackHeader title="Configurações" />}>
      <SectionTitle>Aparência</SectionTitle>
      <View style={styles.row3}>
        {themes.map((t) => {
          const active = prefs.theme === t.id;
          const Icon = t.icon;
          return (
            <Pressable key={t.id} onPress={() => void update('theme', t.id)} disabled={saving !== null} accessibilityRole="radio" accessibilityState={{ checked: active }}
              style={[styles.theme, { borderColor: active ? colors.primary : colors.borderStrong, backgroundColor: active ? colors.primarySoft : colors.surface }]}>
              <Icon size={18} color={active ? colors.primary : colors.textMuted} />
              <Text variant="caption" weight={active ? 'bold' : 'medium'} tone={active ? 'primary' : 'muted'}>{t.label}</Text>
            </Pressable>
          );
        })}
      </View>

      <SectionTitle>Unidades de medida</SectionTitle>
      <View style={styles.row2}>
        {([['weight_unit', 'Peso', ['kg', 'lb']], ['length_unit', 'Altura e medidas', ['cm', 'in']]] as const).map(([key, label, opts]) => (
          <Card key={key} variant="flat" style={{ flex: 1, padding: 12, gap: 8 }}>
            <Text variant="tiny" weight="semibold" tone="muted">{label}</Text>
            <View style={{ flexDirection: 'row', gap: 4 }}>
              {opts.map((o) => {
                const active = prefs[key] === o;
                return (
                  <Pressable key={o} onPress={() => void update(key, o as never)} disabled={saving !== null} accessibilityRole="radio" accessibilityState={{ checked: active }}
                    style={[styles.unit, { backgroundColor: active ? colors.primary : colors.surface }]}>
                    <Text variant="caption" weight="bold" style={{ color: active ? colors.onPrimary : colors.textMuted }}>{o}</Text>
                  </Pressable>
                );
              })}
            </View>
          </Card>
        ))}
      </View>
      <Text variant="tiny" tone="subtle">Os dados são guardados em kg e cm; a conversão é apenas de exibição.</Text>

      <SectionTitle>Lembretes</SectionTitle>
      <SwitchRow title="Lembrete de refeições" subtitle="08:00, 12:30 e 20:00" value={prefs.meal_reminders} disabled={saving !== null} onChange={(v) => void update('meal_reminders', v)} />
      <SwitchRow title="Lembrete de água" subtitle="A cada 2 horas, das 9h às 21h" value={prefs.water_reminders} disabled={saving !== null} onChange={(v) => void update('water_reminders', v)} />
      <SwitchRow title="Lembrete de pesagem semanal" subtitle="Segunda-feira, 07:30" value={prefs.weight_reminder} disabled={saving !== null} onChange={(v) => void update('weight_reminder', v)} />

      <SectionTitle>Privacidade e dados</SectionTitle>
      <MenuGroup>
        <MenuRow icon={<FileText size={16} color={colors.textMuted} />} title="Termos de Uso e Política de Privacidade" onPress={() => router.push('/legal')} />
        <MenuRow icon={<Download size={16} color={colors.textMuted} />} title={exporting ? 'Gerando exportação…' : 'Exportar meus dados (JSON)'} subtitle="Todos os seus registros, em formato estruturado" onPress={() => !exporting && void doExport()} />
        <MenuRow tone="danger" icon={<Trash2 size={16} color={colors.danger} />} title="Excluir minha conta" subtitle="Remove definitivamente a conta e todos os dados" onPress={() => setDeleting(true)} />
      </MenuGroup>

      <DeleteAccountDialog visible={deleting} onClose={() => setDeleting(false)} needsPassword={!account.data.google_linked} />
    </Screen>
  );
}

function DeleteAccountDialog({ visible, onClose, needsPassword }: { visible: boolean; onClose: () => void; needsPassword: boolean }) {
  const qc = useQueryClient();
  const signOut = useSession((s) => s.signOut);
  const [confirmation, setConfirmation] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setLoading(true);
    try {
      await accountApi.destroy(confirmation.trim(), needsPassword ? password : undefined);
      qc.clear();
      await signOut();
      toast.info('Sua conta e todos os dados foram excluídos.');
    } catch (e) {
      if (e instanceof ApiError && e.status === 422) setErrors(Object.fromEntries(Object.entries(e.errors).map(([k, v]) => [k, v[0]!])));
      else toast.error(e instanceof ApiError ? e.firstError : 'Não foi possível excluir a conta.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog visible={visible} onClose={onClose} title="Excluir minha conta">
      <View style={{ gap: 12 }}>
        <Text variant="caption" tone="muted">
          Esta ação é <Text variant="caption" weight="bold" tone="danger">permanente</Text>: perfil, diário, receitas, refeições salvas, pesagens, medidas, água e metas serão apagados. Se quiser uma cópia, exporte seus dados antes.
        </Text>
        <Input label='Digite "EXCLUIR" para confirmar' value={confirmation} onChangeText={setConfirmation} autoCapitalize="characters" error={errors.confirmation} />
        {needsPassword && <PasswordInput label="Sua senha" value={password} onChangeText={setPassword} error={errors.password} />}
        <Button fullWidth variant="danger" loading={loading} disabled={confirmation.trim() !== 'EXCLUIR' || (needsPassword && !password)} onPress={() => void submit()}>
          Excluir definitivamente
        </Button>
      </View>
    </Dialog>
  );
}

const styles = StyleSheet.create({
  row3: { flexDirection: 'row', gap: 8 },
  row2: { flexDirection: 'row', gap: 8 },
  theme: { flex: 1, alignItems: 'center', gap: 6, padding: 12, borderRadius: radius.lg, borderWidth: 1 },
  unit: { flex: 1, alignItems: 'center', paddingVertical: 6, borderRadius: radius.sm },
});
