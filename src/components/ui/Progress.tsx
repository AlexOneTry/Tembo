import { cn } from '@/lib/cn';

interface Props {
  value: number;
  max?: number;
  tone?: 'brand' | 'success' | 'warning' | 'danger';
  className?: string;
}

const TONES = {
  brand: 'bg-brand-500',
  success: 'bg-emerald-500',
  warning: 'bg-amber-500',
  danger: 'bg-rose-500',
};

export function Progress({ value, max = 100, tone = 'brand', className }: Props) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div className={cn('w-full h-1.5 bg-white/[0.06] rounded-full overflow-hidden', className)}>
      <div
        className={cn('h-full rounded-full transition-all duration-500', TONES[tone])}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
