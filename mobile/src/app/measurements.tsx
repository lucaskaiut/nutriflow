import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Plus, Trash2 } from 'lucide-react-native';

import { ApiError } from '@/api/client';
import { measurementsApi } from '@/api/endpoints';
import type { BodyMeasurement, MeasurementType } from '@/api/types';
import { Button, Card, ChipRow, confirm, DateInput, Dialog, EmptyState, ErrorState, Input, LineChart, Screen, SkeletonList, StackHeader, Text } from '@/components/ui';
import { invalidate, useAccount, useApiMutation, useMeasurements } from '@/features/queries';
import { shortDate, todayLocal } from '@/lib/dates';
import { fromCm, length, lengthUnit, num, parseDecimal, signed, toCm } from '@/lib/format';
import { toast } from '@/stores/toast';
import { useTheme } from '@/theme/ThemeProvider';
import { radius } from '@/theme/tokens';

const TYPES: { id: MeasurementType; label: string }[] = [
  { id: 'waist', label: 'Cintura' }, { id: 'hip', label: 'Quadril' }, { id: 'arm', label: 'Braço' },
  { id: 'thigh', label: 'Coxa' }, { id: 'chest', label: 'Peito' }, { id: 'body_fat', label: '% Gordura' },
];

export default function MeasurementsScreen() {
  const { colors } = useTheme();
  const prefs = useAccount().data?.preferences;
  const [type, setType] = useState<MeasurementType>('waist');
  const all = useMeasurements();
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<BodyMeasurement | null>(null);

  const header = <StackHeader title="Medidas corporais"
    right={<Pressable onPress={() => setAdding(true)} accessibilityRole="button" accessibilityLabel="Registrar medidas" hitSlop={6}><Plus size={22} color={colors.primary} /></Pressable>} />;
  if (all.isPending) return <Screen header={header}><SkeletonList type="dashboard" /></Screen>;
  if (all.isError) return <Screen header={header}><ErrorState message={all.error instanceof ApiError ? all.error.message : undefined} onRetry={() => all.refetch()} /></Screen>;

  const { latest, entries } = all.data;
  const fmt = (t: MeasurementType, v: number | null) => (v === null ? '—' : t === 'body_fat' ? `${num(v)}%` : length(v, prefs));
  const lastDate = entries.length ? entries[entries.length - 1]!.measured_on : null;
  const typed = entries.filter((e) => e.type === type);

  return (
    <Screen header={header} refreshing={all.isRefetching} onRefresh={() => void all.refetch()}>
      {lastDate && <Text variant="caption" tone="muted">Última avaliação em {shortDate(lastDate)}</Text>}

      {entries.length === 0 ? (
        <EmptyState title="Nenhuma medida registrada" description="Registre cintura, quadril, braço, coxa, peito e percentual de gordura para acompanhar a evolução."
          actionLabel="Registrar medidas" onAction={() => setAdding(true)} />
      ) : (
        <>
          <View style={styles.grid}>
            {latest.map((m) => (
              <Pressable key={m.type} onPress={() => setType(m.type)} accessibilityRole="button" accessibilityState={{ selected: type === m.type }}
                style={[styles.cell, { backgroundColor: colors.surface, borderColor: type === m.type ? colors.primary : colors.border }]}>
                <Text variant="caption" tone="muted">{m.label}</Text>
                <View style={styles.rowBetween}>
                  <Text variant="number" size={17}>{fmt(m.type, m.value)}</Text>
                  {m.change !== null && m.change !== 0 && (
                    <Text variant="tiny" weight="bold" tone={m.change < 0 ? 'success' : 'warning'}>{signed(m.change, (v) => (m.type === 'body_fat' ? `${num(v)}%` : length(v, prefs)))}</Text>
                  )}
                </View>
              </Pressable>
            ))}
          </View>

          <Card style={{ gap: 10 }}>
            <Text variant="heading">Evolução</Text>
            <ChipRow value={type} onChange={setType} options={TYPES} />
            <LineChart height={150} points={typed.map((e) => ({ date: e.measured_on, value: e.type === 'body_fat' ? e.value : fromCm(e.value, prefs) }))}
              formatValue={(v) => (type === 'body_fat' ? `${num(v)}%` : `${num(v)} ${lengthUnit(prefs)}`)} />
          </Card>

          <Card style={{ gap: 8 }}>
            <Text variant="heading">Histórico — {TYPES.find((t) => t.id === type)?.label}</Text>
            {typed.length === 0 ? <Text variant="caption" tone="subtle">Sem registros deste tipo.</Text> : [...typed].reverse().map((e) => (
              <Pressable key={e.id} onPress={() => setEditing(e)} accessibilityRole="button" style={[styles.entry, { backgroundColor: colors.surfaceMuted, borderColor: colors.border }]}>
                <View style={{ flex: 1 }}>
                  <Text variant="caption" weight="bold">{shortDate(e.measured_on)}</Text>
                  {e.notes ? <Text variant="tiny" tone="subtle">{e.notes}</Text> : null}
                </View>
                <Text variant="number" size={12}>{fmt(e.type, e.value)}</Text>
              </Pressable>
            ))}
          </Card>

          <View style={styles.tip}>
            <Text variant="caption" tone="muted">Meça sempre no mesmo horário e nas mesmas condições para que as comparações façam sentido.</Text>
          </View>
        </>
      )}

      <Button fullWidth size="lg" icon={<Plus size={18} color={colors.onPrimary} />} onPress={() => setAdding(true)}>Registrar medidas</Button>

      <AddDialog visible={adding} onClose={() => setAdding(false)} prefs={prefs} />
      <EditDialog entry={editing} onClose={() => setEditing(null)} prefs={prefs} />
    </Screen>
  );
}

function AddDialog({ visible, onClose, prefs }: { visible: boolean; onClose: () => void; prefs?: Parameters<typeof length>[1] }) {
  const [date, setDate] = useState<string | null>(todayLocal());
  const [notes, setNotes] = useState('');
  const [values, setValues] = useState<Partial<Record<MeasurementType, string>>>({});
  const [error, setError] = useState<string>();
  const save = useApiMutation(measurementsApi.create, { invalidate: invalidate.measurements, silentError: true, onSuccess: () => { setValues({}); setNotes(''); onClose(); } });

  const submit = () => {
    const parsed: Partial<Record<MeasurementType, number>> = {};
    for (const t of TYPES) {
      const raw = values[t.id]?.trim();
      if (!raw) continue;
      const v = parseDecimal(raw);
      if (!(v > 0) || (t.id === 'body_fat' && v >= 100)) { setError(`Valor inválido para ${t.label}.`); return; }
      parsed[t.id] = t.id === 'body_fat' ? v : toCm(v, prefs);
    }
    if (!date) { setError('Informe a data.'); return; }
    if (Object.keys(parsed).length === 0) { setError('Informe pelo menos uma medida.'); return; }
    setError(undefined);
    save.mutate({ measured_on: date, notes: notes.trim() || null, values: parsed }, {
      onError: (e) => (e instanceof ApiError && e.status === 422 ? setError(e.firstError) : toast.error(e instanceof ApiError ? e.firstError : 'Não foi possível salvar.')),
    });
  };

  return (
    <Dialog visible={visible} onClose={onClose} title="Registrar medidas">
      <View style={{ gap: 12 }}>
        <DateInput label="Data da avaliação" value={date} onChange={setDate} />
        <View style={styles.grid}>
          {TYPES.map((t) => (
            <View key={t.id} style={{ width: '48%', flexGrow: 1 }}>
              <Input label={t.label} value={values[t.id] ?? ''} onChangeText={(v) => setValues((p) => ({ ...p, [t.id]: v }))} keyboardType="decimal-pad"
                suffix={t.id === 'body_fat' ? '%' : lengthUnit(prefs)} placeholder="—" />
            </View>
          ))}
        </View>
        <Input label="Observação (opcional)" value={notes} onChangeText={setNotes} maxLength={500} />
        {error && <Text variant="caption" tone="danger">{error}</Text>}
        <Text variant="tiny" tone="subtle">Preencha apenas as medidas que você fez hoje.</Text>
        <Button fullWidth loading={save.isPending} onPress={submit}>Salvar medidas</Button>
      </View>
    </Dialog>
  );
}

function EditDialog({ entry, onClose, prefs }: { entry: BodyMeasurement | null; onClose: () => void; prefs?: Parameters<typeof length>[1] }) {
  const { colors } = useTheme();
  const [value, setValue] = useState('');
  const [date, setDate] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [prev, setPrev] = useState<string | null>(null);
  if (entry && prev !== entry.id) {
    setPrev(entry.id);
    setValue(num(entry.type === 'body_fat' ? entry.value : fromCm(entry.value, prefs), 2));
    setDate(entry.measured_on);
    setNotes(entry.notes ?? '');
  }
  const close = () => { setPrev(null); onClose(); };
  const update = useApiMutation(({ id, ...b }: { id: string; value: number; measured_on: string; notes: string | null }) => measurementsApi.update(id, b), { invalidate: invalidate.measurements, onSuccess: close });
  const remove = useApiMutation((id: string) => measurementsApi.remove(id), { invalidate: invalidate.measurements, onSuccess: close });
  const v = parseDecimal(value);
  const valid = v > 0 && !!date && (entry?.type !== 'body_fat' || v < 100);

  return (
    <Dialog visible={!!entry} onClose={close} title={`Editar ${entry?.label ?? 'medida'}`}>
      <View style={{ gap: 12 }}>
        <Input label="Valor" value={value} onChangeText={setValue} keyboardType="decimal-pad" suffix={entry?.type === 'body_fat' ? '%' : lengthUnit(prefs)} />
        <DateInput label="Data" value={date} onChange={setDate} />
        <Input label="Observação" value={notes} onChangeText={setNotes} maxLength={500} />
        <Button fullWidth disabled={!valid} loading={update.isPending}
          onPress={() => entry && date && update.mutate({ id: entry.id, value: entry.type === 'body_fat' ? v : toCm(v, prefs), measured_on: date, notes: notes.trim() || null })}>Salvar</Button>
        <Button fullWidth variant="danger" loading={remove.isPending} icon={<Trash2 size={15} color={colors.danger} />}
          onPress={async () => { if (entry && (await confirm('Excluir medida?', 'Este registro será removido do histórico.'))) remove.mutate(entry.id); }}>Excluir</Button>
      </View>
    </Dialog>
  );
}

const styles = StyleSheet.create({
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  cell: { width: '48%', flexGrow: 1, padding: 12, borderRadius: radius.lg, borderWidth: 1, gap: 4 },
  entry: { flexDirection: 'row', alignItems: 'center', padding: 10, borderRadius: radius.md, borderWidth: 1 },
  tip: { paddingHorizontal: 2 },
});
