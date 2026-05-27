import { motion } from 'framer-motion';
import { ArrowDownRight, ArrowUpRight, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/cn';

interface Props {
  label: string;
  value: string;
  hint?: string;
  delta?: number;
  icon?: LucideIcon;
  accent?: string;
  index?: number;
}

export function MetricCard({ label, value, hint, delta, icon: Icon, accent = 'brand', index = 0 }: Props) {
  const positive = (delta ?? 0) >= 0;
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.04 }}
      className="glass-card p-5 relative overflow-hidden group"
    >
      <div
        className={cn(
          'absolute -top-10 -right-10 h-32 w-32 rounded-full blur-2xl opacity-30 group-hover:opacity-50 transition-opacity',
          accent === 'brand' && 'bg-brand-500',
          accent === 'accent' && 'bg-accent-500',
          accent === 'amber' && 'bg-amber-500',
          accent === 'rose' && 'bg-rose-500',
          accent === 'cyan' && 'bg-cyan-500',
          accent === 'violet' && 'bg-violet-500'
        )}
      />
      <div className="relative flex items-start justify-between gap-3 mb-3">
        <div className="text-xs font-medium text-soft uppercase tracking-wider">{label}</div>
        {Icon && (
          <div
            className={cn(
              'h-9 w-9 rounded-xl flex items-center justify-center border',
              accent === 'brand' && 'bg-brand-500/10 text-brand-300 border-brand-500/20',
              accent === 'accent' && 'bg-accent-500/10 text-accent-500 border-accent-500/20',
              accent === 'amber' && 'bg-amber-500/10 text-amber-300 border-amber-500/20',
              accent === 'rose' && 'bg-rose-500/10 text-rose-300 border-rose-500/20',
              accent === 'cyan' && 'bg-cyan-500/10 text-cyan-300 border-cyan-500/20',
              accent === 'violet' && 'bg-violet-500/10 text-violet-300 border-violet-500/20'
            )}
          >
            <Icon className="h-4 w-4" />
          </div>
        )}
      </div>
      <div className="relative">
        <div className="text-2xl font-semibold text-strong tabular-nums">{value}</div>
        <div className="flex items-center gap-2 mt-2">
          {typeof delta === 'number' && (
            <span
              className={cn(
                'inline-flex items-center gap-0.5 text-xs font-medium',
                positive ? 'text-emerald-400' : 'text-rose-400'
              )}
            >
              {positive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
              {Math.abs(delta).toFixed(1)}%
            </span>
          )}
          {hint && <span className="text-xs text-soft">{hint}</span>}
        </div>
      </div>
    </motion.div>
  );
}
