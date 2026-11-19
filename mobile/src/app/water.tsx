import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Trash2 } from 'lucide-react-native';

import { ApiError } from '@/api/client';
import { waterApi } from '@/api/endpoints';
import type { WaterEntry } from '@/api/types';
import { BarChart, Button, Card, confirm, Dialog, ErrorState, IconButton, Input, RingGauge, Screen, SkeletonList, StackHeader, Text } from '@/components/ui';
import { invalidate, useApiMutation, useWater, useWaterHistory } from '@/features/queries';
import { weekdayShort } from '@/lib/dates';
import { num } from '@/lib/format';
import { useTheme } from '@/theme/ThemeProvider';
import { radius } from '@/theme/tokens';

const QUICK = [200, 250, 500, 750];

export default function WaterScreen() {
  const { colors } = useTheme();
  const water = useWater();
  const history = useWaterHistory(7);
  const [custom, setCustom] = useState('');
  const [editing, setEditing] = useState<WaterEntry | null>(null);

  const add = useApiMutation((ml: number) => waterApi.add(ml), { invalidate: invalidate.water, onSuccess: () => setCustom('') });
  const remove = useApiMutation((id: string) => waterApi.remove(id), { invalidate: invalidate.water });

  if (water.isPending) return <Screen header={<StackHeader title="Água" />}><SkeletonList type="dashboard" /></Screen>;
  if (water.isError) return <Screen header={<StackHeader title="Água" />}><ErrorState message={water.error instanceof ApiError ? water.error.message : undefined} onRetry={() => water.refetch()} /></Screen>;

  const d = water.data;
  const remaining = d.goal_ml ? Math.max(0, d.goal_ml - d.total_ml) : null;
  const customValue = Number(custom);
  const customValid = Number.isInteger(customValue) && customValue >= 10 && customValue <= 5000;

  return (
    <Screen header={<StackHeader title="Água" />} refreshing={water.isRefetching} onRefresh={() => void water.refetch()}>
      <Card variant="sky">
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ flex: 1 }}>
            <Text variant="label" style={{ color: colors.onTint }}>Água hoje</Text>
            <Text variant="bigNumber" size={44} style={{ color: colors.onTint }}>{num(d.total_ml / 1000, 2)}<Text variant="label" style={{ color: colors.onTint }}> L</Text></Text>
            <Text variant="caption" style={{ color: colors.onTint }}>{d.goal_ml ? `meta de ${num(d.goal_ml / 1000, 2)} L` : 'sem meta definida'}</Text>
          </View>
          <RingGauge value={d.total_ml} max={d.goal_ml} size={104} stroke={12} color={colors.water}>
            <Text variant="bigNumber" size={22} style={{ color: colors.onTint }}>{d.progress !== null ? `${d.progress}%` : '—'}</Text>
          </RingGauge>
        </View>
        <View style={{ marginTop: 10 }}>
          {remaining === null ? (
            <Pressable onPress={() => router.push('/goals')}><Text variant="caption" weight="semibold" tone="primary">Definir meta diária</Text></Pressable>
          ) : <Text variant="caption" weight="semibold" style={{ color: colors.onTint }}>{remaining > 0 ? `Faltam ${num(remaining, 0)} ml` : 'Meta atingida'}</Text>}
        </View>
      </Card>

      <View style={styles.quickRow}>
        {QUICK.map((ml) => (
          <Pressable key={ml} onPress={() => add.mutate(ml)} disabled={add.isPending} accessibilityRole="button" accessibilityLabel={`Adicionar ${ml} mililitros`}
            style={({ pressed }) => [styles.quick, { backgroundColor: pressed ? colors.tintSky : colors.surface, opacity: add.isPending ? 0.6 : 1 }]}>
            <Text variant="caption" weight="bold">+{ml} ml</Text>
          </Pressable>
        ))}
      </View>

      <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-start' }}>
        <View style={{ flex: 1 }}>
          <Input value={custom} onChangeText={(v) => setCustom(v.replace(/\D/g, ''))} placeholder="Outro volume" keyboardType="number-pad" suffix="ml"
            error={custom && !customValid ? 'Entre 10 e 5.000 ml.' : undefined} accessibilityLabel="Outro volume em mililitros" />
        </View>
        <Button variant="water" disabled={!customValid} loading={add.isPending} onPress={() => add.mutate(customValue)}>Adicionar</Button>
      </View>

      <Card padded={false}>
        <View style={[styles.rowBetween, styles.cardHead]}>
          <Text variant="heading">Registros de hoje</Text>
          <Text variant="caption" tone="subtle">{d.entries.length}</Text>
        </View>
        {d.entries.length === 0 ? (
          <Text variant="caption" tone="muted" style={styles.cardEmpty}>Nenhum registro hoje. Use os volumes acima para registrar.</Text>
        ) : d.entries.map((e) => (
          <Pressable key={e.id} onPress={() => setEditing(e)} accessibilityRole="button" accessibilityLabel={`${e.amount_ml} mililitros às ${e.time}. Editar`}
            style={({ pressed }) => [styles.entry, { borderTopColor: colors.border, backgroundColor: pressed ? colors.surfaceMuted : 'transparent' }]}>
            <Text variant="caption" tone="muted" style={{ fontVariant: ['tabular-nums'] }}>{e.time}</Text>
            <View style={styles.inline}>
              <Text variant="caption" weight="bold">{num(e.amount_ml, 0)} ml</Text>
              <IconButton label="Remover registro" variant="plain" size={28} icon={<Trash2 size={14} color={colors.textSubtle} />}
                onPress={async () => { if (await confirm('Remover registro?', `${e.amount_ml} ml às ${e.time} será removido.`, 'Remover')) remove.mutate(e.id); }} />
            </View>
          </Pressable>
        ))}
      </Card>

      <Card style={{ gap: 10 }}>
        <View style={styles.rowBetween}>
          <Text variant="heading">Últimos 7 dias</Text>
          {d.goal_ml ? <Text variant="caption" tone="subtle">linha tracejada: meta</Text> : null}
        </View>
        {history.data ? (
          <BarChart color={colors.water} goal={d.goal_ml} height={150} formatValue={(v) => `${num(v, 0)} ml`} bars={history.data.days.map((day) => ({ label: weekdayShort(day.date), value: day.total_ml || null }))} />
        ) : <SkeletonList type="list" />}
      </Card>

      <EditWaterDialog entry={editing} onClose={() => setEditing(null)} />
    </Screen>
  );
}

function EditWaterDialog({ entry, onClose }: { entry: WaterEntry | null; onClose: () => void }) {
  const [amount, setAmount] = useState('');
  const [time, setTime] = useState('');
  const [prev, setPrev] = useState<string | null>(null);
  if (entry && prev !== entry.id) { setPrev(entry.id); setAmount(String(entry.amount_ml)); setTime(entry.time); }
  const update = useApiMutation(({ id, ...v }: { id: string; amount_ml: number; time: string }) => waterApi.update(id, v), { invalidate: invalidate.water, onSuccess: () => { setPrev(null); onClose(); } });
  const value = Number(amount);
  const valid = Number.isInteger(value) && value >= 10 && value <= 5000 && /^([01]\d|2[0-3]):[0-5]\d$/.test(time);
  return (
    <Dialog visible={!!entry} onClose={() => { setPrev(null); onClose(); }} title="Editar registro de água">
      <View style={{ gap: 12 }}>
        <Input label="Quantidade (ml)" value={amount} onChangeText={(v) => setAmount(v.replace(/\D/g, ''))} keyboardType="number-pad" suffix="ml" />
        <Input label="Horário" value={time} maxLength={5} keyboardType="number-pad" placeholder="HH:MM"
          onChangeText={(v) => { const dg = v.replace(/\D/g, '').slice(0, 4); setTime(dg.length > 2 ? `${dg.slice(0, 2)}:${dg.slice(2)}` : dg); }} />
        <Button fullWidth disabled={!valid} loading={update.isPending} onPress={() => entry && update.mutate({ id: entry.id, amount_ml: value, time })}>Salvar</Button>
      </View>
    </Dialog>
  );
}

const styles = StyleSheet.create({
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  inline: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  quickRow: { flexDirection: 'row', gap: 8 },
  quick: { flex: 1, alignItems: 'center', paddingVertical: 14, borderRadius: radius.full },
  cardHead: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 10 },
  cardEmpty: { paddingHorizontal: 16, paddingBottom: 16 },
  entry: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingLeft: 16, paddingRight: 8, paddingVertical: 4, borderTopWidth: StyleSheet.hairlineWidth },
});
