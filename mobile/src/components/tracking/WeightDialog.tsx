import { useState } from 'react';
import { View } from 'react-native';
import { CheckCircle2, Trash2 } from 'lucide-react-native';

import { ApiError } from '@/api/client';
import { weightApi } from '@/api/endpoints';
import type { Preferences, WeightEntry } from '@/api/types';
import { Button, confirm, DateInput, Dialog, Input } from '@/components/ui';
import { invalidate, useApiMutation } from '@/features/queries';
import { nowTime, todayLocal } from '@/lib/dates';
import { fromKg, num, parseDecimal, toKg, weightUnit } from '@/lib/format';
import { useTheme } from '@/theme/ThemeProvider';

/** Registrar/editar pesagem (data, horário opcional, observação). Nunca sobrescreve outras pesagens. */
type Props = { visible: boolean; onClose: () => void; entry?: WeightEntry | null; prefs?: Preferences };

export function WeightDialog(props: Props) {
  return (
    <Dialog visible={props.visible} onClose={props.onClose} title={props.entry ? 'Editar pesagem' : 'Registrar novo peso'}>
      {props.visible && <WeightForm key={props.entry?.id ?? 'new'} {...props} />}
    </Dialog>
  );
}

function WeightForm({ onClose, entry, prefs }: Props) {
  const { colors } = useTheme();
  const [value, setValue] = useState(() => (entry ? num(fromKg(entry.weight_kg, prefs), 2) : ''));
  const [date, setDate] = useState<string | null>(() => entry?.measured_on ?? todayLocal());
  const [time, setTime] = useState(() => (entry ? entry.measured_at ?? '' : nowTime()));
  const [notes, setNotes] = useState(() => entry?.notes ?? '');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const unit = weightUnit(prefs);

  const save = useApiMutation(
    (body: { weight_kg: number; measured_on: string; measured_at: string | null; notes: string | null }) => (entry ? weightApi.update(entry.id, body) : weightApi.create(body)),
    {
      invalidate: invalidate.weight,
      silentError: true,
      onSuccess: onClose,
    },
  );
  const remove = useApiMutation((id: string) => weightApi.remove(id), { invalidate: invalidate.weight, onSuccess: onClose });

  const submit = () => {
    const v = parseDecimal(value);
    const e: Record<string, string> = {};
    const kg = v > 0 ? toKg(v, prefs) : NaN;
    if (!(kg >= 20 && kg <= 500)) e.weight = 'Informe um peso válido, maior que zero.';
    if (!date) e.date = 'Informe a data da pesagem.';
    if (time && !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) e.time = 'Use HH:MM.';
    setErrors(e);
    if (Object.keys(e).length) return;
    save.mutate({ weight_kg: kg, measured_on: date!, measured_at: time || null, notes: notes.trim() || null }, {
      onError: (err) => setErrors({ weight: err instanceof ApiError ? err.field('weight_kg') ?? err.firstError : 'Não foi possível salvar.' }),
    });
  };

  return (
    <View style={{ gap: 14 }}>
        <Input label={`Peso (${unit})`} value={value} onChangeText={setValue} placeholder={unit === 'kg' ? 'Ex: 118,5' : 'Ex: 261,2'} keyboardType="decimal-pad" autoFocus error={errors.weight} />
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <View style={{ flex: 1.3 }}><DateInput label="Data" value={date} onChange={setDate} error={errors.date} /></View>
          <View style={{ flex: 1 }}>
            <Input label="Horário" value={time} placeholder="HH:MM" keyboardType="number-pad" maxLength={5} error={errors.time}
              onChangeText={(v) => { const d = v.replace(/\D/g, '').slice(0, 4); setTime(d.length > 2 ? `${d.slice(0, 2)}:${d.slice(2)}` : d); }} />
          </View>
        </View>
        <Input label="Anotações (opcional)" value={notes} onChangeText={setNotes} placeholder="Ex: Em jejum, pós-treino…" maxLength={500} />
        <Button fullWidth loading={save.isPending} icon={<CheckCircle2 size={16} color={colors.onPrimary} />} onPress={submit}>Salvar registro</Button>
        {entry && (
          <Button fullWidth variant="danger" loading={remove.isPending} icon={<Trash2 size={15} color={colors.danger} />}
            onPress={async () => { if (await confirm('Excluir pesagem?', 'Este registro será removido do histórico.')) remove.mutate(entry.id); }}>Excluir pesagem</Button>
        )}
      </View>
  );
}
