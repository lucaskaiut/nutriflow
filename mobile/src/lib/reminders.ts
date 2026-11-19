import { useEffect } from 'react';
import { Platform } from 'react-native';

import type { Preferences } from '@/api/types';

/**
 * Lembretes LOCAIS (agendados no aparelho; nenhum dado de saúde sai do telefone por push).
 * - refeições: 08:00, 12:30 e 20:00
 * - água: a cada 2 horas, das 09:00 às 21:00
 * - pesagem: segundas-feiras, 07:30
 */
const MEALS = [
  { hour: 8, minute: 0, body: 'Hora do café da manhã! Registre no diário.' },
  { hour: 12, minute: 30, body: 'Como foi o almoço? Registre sua refeição.' },
  { hour: 20, minute: 0, body: 'Não esqueça de registrar o jantar.' },
];
const WATER_HOURS = [9, 11, 13, 15, 17, 19, 21];

type NotificationsModule = typeof import('expo-notifications');
let loaded: Promise<NotificationsModule | null> | null = null;

/**
 * Carrega o expo-notifications sob demanda. Se o módulo nativo não estiver disponível no binário
 * (ex.: versão do Expo Go diferente), os lembretes ficam indisponíveis sem derrubar o app.
 */
function notifications(): Promise<NotificationsModule | null> {
  loaded ??= import('expo-notifications')
    .then((N) => {
      N.setNotificationHandler({
        handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }),
      });
      return N;
    })
    .catch(() => null);
  return loaded;
}

export async function ensureNotificationPermission(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  const Notifications = await notifications();
  if (!Notifications) return false;
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  const asked = await Notifications.requestPermissionsAsync();
  return asked.granted;
}

async function schedule(prefs: Pick<Preferences, 'meal_reminders' | 'water_reminders' | 'weight_reminder'>) {
  if (Platform.OS === 'web') return;
  const Notifications = await notifications();
  if (!Notifications) return;
  await Notifications.cancelAllScheduledNotificationsAsync();
  if (!prefs.meal_reminders && !prefs.water_reminders && !prefs.weight_reminder) return;
  if (!(await Notifications.getPermissionsAsync()).granted) return;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('reminders', { name: 'Lembretes', importance: Notifications.AndroidImportance.DEFAULT });
  }

  const jobs: Promise<string>[] = [];
  const daily = (hour: number, minute: number, title: string, body: string) =>
    jobs.push(Notifications.scheduleNotificationAsync({
      content: { title, body },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour, minute, channelId: 'reminders' },
    }));

  if (prefs.meal_reminders) MEALS.forEach((m) => daily(m.hour, m.minute, 'NutriFlow', m.body));
  if (prefs.water_reminders) WATER_HOURS.forEach((h) => daily(h, 0, 'Água', 'Lembrete para registrar um copo de água.'));
  if (prefs.weight_reminder) {
    jobs.push(Notifications.scheduleNotificationAsync({
      content: { title: 'Pesagem semanal', body: 'Registre seu peso para acompanhar sua evolução.' },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.WEEKLY, weekday: 2, hour: 7, minute: 30, channelId: 'reminders' },
    }));
  }
  await Promise.all(jobs);
}

/** Mantém os lembretes agendados em sincronia com as preferências salvas na conta. */
export function useReminderSync(prefs?: Preferences) {
  const key = prefs ? `${prefs.meal_reminders}${prefs.water_reminders}${prefs.weight_reminder}` : 'off';
  useEffect(() => {
    void schedule(prefs ?? { meal_reminders: false, water_reminders: false, weight_reminder: false }).catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
}
