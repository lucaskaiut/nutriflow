import type { Preferences } from '@/api/types';

const nf = (digits: number) => new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: digits });
const fixed = (digits: number) => new Intl.NumberFormat('pt-BR', { minimumFractionDigits: digits, maximumFractionDigits: digits });

/** 1234.5 → "1.234,5"; null → "—" (valor desconhecido na fonte). */
export function num(value: number | null | undefined, digits = 1): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  return nf(digits).format(value);
}

export function kcal(value: number | null | undefined): string {
  return value === null || value === undefined ? '—' : nf(0).format(Math.round(value));
}

export function grams(value: number | null | undefined): string {
  return value === null || value === undefined ? '—' : `${nf(1).format(value)}g`;
}

/** Converte texto digitado em pt-BR ("118,5") para número; inválido → NaN. */
export function parseDecimal(input: string): number {
  const clean = input.trim().replace(/\s/g, '').replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.');
  if (clean === '' || !/^-?\d*\.?\d+$/.test(clean)) return Number.NaN;
  return Number(clean);
}

// ---- unidades de exibição (o servidor sempre guarda kg e cm) ----
const LB_PER_KG = 2.2046226218;
const CM_PER_IN = 2.54;

export function weight(kg: number | null | undefined, prefs?: Pick<Preferences, 'weight_unit'>, digits = 1, withUnit = true): string {
  if (kg === null || kg === undefined) return '—';
  const lb = prefs?.weight_unit === 'lb';
  const value = lb ? kg * LB_PER_KG : kg;
  return `${fixed(digits).format(value)}${withUnit ? (lb ? ' lb' : ' kg') : ''}`;
}

export function weightUnit(prefs?: Pick<Preferences, 'weight_unit'>) {
  return prefs?.weight_unit === 'lb' ? 'lb' : 'kg';
}

/** Valor digitado na unidade da pessoa → kg. */
export function toKg(value: number, prefs?: Pick<Preferences, 'weight_unit'>): number {
  return prefs?.weight_unit === 'lb' ? Math.round((value / LB_PER_KG) * 100) / 100 : value;
}

export function fromKg(kg: number, prefs?: Pick<Preferences, 'weight_unit'>): number {
  return prefs?.weight_unit === 'lb' ? Math.round(kg * LB_PER_KG * 10) / 10 : kg;
}

export function length(cm: number | null | undefined, prefs?: Pick<Preferences, 'length_unit'>, digits = 1): string {
  if (cm === null || cm === undefined) return '—';
  return prefs?.length_unit === 'in' ? `${fixed(digits).format(cm / CM_PER_IN)} in` : `${fixed(digits).format(cm)} cm`;
}

export function lengthUnit(prefs?: Pick<Preferences, 'length_unit'>) {
  return prefs?.length_unit === 'in' ? 'in' : 'cm';
}

export function toCm(value: number, prefs?: Pick<Preferences, 'length_unit'>): number {
  return prefs?.length_unit === 'in' ? Math.round(value * CM_PER_IN * 10) / 10 : value;
}

export function fromCm(cm: number, prefs?: Pick<Preferences, 'length_unit'>): number {
  return prefs?.length_unit === 'in' ? Math.round((cm / CM_PER_IN) * 10) / 10 : cm;
}

export function signed(value: number | null | undefined, formatter: (v: number) => string): string {
  if (value === null || value === undefined) return '—';
  if (value === 0) return formatter(0);
  return `${value > 0 ? '+' : '−'}${formatter(Math.abs(value))}`;
}

export function initials(name: string): string {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]!.toUpperCase()).join('') || '?';
}

export function percent(value: number, goal: number | null | undefined): number {
  if (!goal) return 0;
  return Math.round((value / goal) * 100);
}
