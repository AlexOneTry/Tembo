const RUB = new Intl.NumberFormat('ru-RU', {
  style: 'currency',
  currency: 'RUB',
  maximumFractionDigits: 0,
});

const NUM = new Intl.NumberFormat('ru-RU');

export function formatMoney(value: number): string {
  if (!Number.isFinite(value)) return '—';
  return RUB.format(Math.round(value));
}

export function formatNumber(value: number, fractionDigits = 0): string {
  if (!Number.isFinite(value)) return '—';
  return new Intl.NumberFormat('ru-RU', {
    maximumFractionDigits: fractionDigits,
    minimumFractionDigits: 0,
  }).format(value);
}

export function formatPercent(value: number, fractionDigits = 1): string {
  if (!Number.isFinite(value)) return '—';
  return `${new Intl.NumberFormat('ru-RU', {
    maximumFractionDigits: fractionDigits,
    minimumFractionDigits: 0,
  }).format(value)}%`;
}

export function formatCompact(value: number): string {
  if (!Number.isFinite(value)) return '—';
  return new Intl.NumberFormat('ru-RU', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value);
}

export function formatDate(value: string | Date, opts?: Intl.DateTimeFormatOptions): string {
  const date = value instanceof Date ? value : new Date(value);
  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    ...opts,
  }).format(date);
}

export function formatShortDate(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value);
  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: 'short',
  }).format(date);
}

export function formatRelativeDays(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value);
  const diff = Math.round((Date.now() - date.getTime()) / 86_400_000);
  if (diff === 0) return 'сегодня';
  if (diff === 1) return 'вчера';
  if (diff < 7) return `${diff} дн. назад`;
  if (diff < 30) return `${Math.round(diff / 7)} нед. назад`;
  return formatDate(date);
}

export { NUM };
