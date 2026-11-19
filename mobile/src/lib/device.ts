import { getCalendars } from 'expo-localization';

/** Fuso horário IANA do aparelho (ex.: "America/Sao_Paulo"), enviado ao perfil. */
export function deviceTimezone(): string {
  try {
    return getCalendars()[0]?.timeZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone ?? 'America/Sao_Paulo';
  } catch {
    return 'America/Sao_Paulo';
  }
}
