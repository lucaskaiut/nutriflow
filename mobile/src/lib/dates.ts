/** Datas locais "YYYY-MM-DD" (o servidor decide "hoje" pelo fuso do perfil; aqui só navegamos). */
export function toISODate(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function parseISODate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y!, (m ?? 1) - 1, d ?? 1, 12);
}

export function addDays(s: string, days: number): string {
  const d = parseISODate(s);
  d.setDate(d.getDate() + days);
  return toISODate(d);
}

export function todayLocal(): string {
  return toISODate(new Date());
}

export function nowTime(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

const WEEK = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
const MONTHS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const SHORT_WEEK = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

/** "Hoje, 18 de novembro" / "Ontem, …" / "Quarta, 20 de novembro". */
export function friendlyDate(date: string, today: string): string {
  const d = parseISODate(date);
  const base = `${d.getDate()} de ${MONTHS[d.getMonth()]}`;
  if (date === today) return `Hoje, ${base}`;
  if (date === addDays(today, -1)) return `Ontem, ${base}`;
  if (date === addDays(today, 1)) return `Amanhã, ${base}`;
  return `${WEEK[d.getDay()]}, ${base}`;
}

/** "18/11/2026" ou "18/11" */
export function shortDate(date: string, withYear = true): string {
  const [y, m, d] = date.split('-');
  return withYear ? `${d}/${m}/${y}` : `${d}/${m}`;
}

export function weekdayShort(date: string): string {
  return SHORT_WEEK[parseISODate(date).getDay()]!;
}

export function greeting(time: string): string {
  const h = Number(time.slice(0, 2));
  if (h >= 5 && h < 12) return 'Bom dia';
  if (h >= 12 && h < 18) return 'Boa tarde';
  return 'Boa noite';
}

export function isValidISODate(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = parseISODate(s);
  return toISODate(d) === s;
}

/** "18/11/2026" → "2026-11-18" (entrada em formato brasileiro). */
export function brToISO(s: string): string | null {
  const m = s.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return null;
  const iso = `${m[3]}-${m[2]}-${m[1]}`;
  return isValidISODate(iso) ? iso : null;
}
