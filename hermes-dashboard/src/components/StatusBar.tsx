import { motion } from 'framer-motion';
import type { AgentStatus } from '@/types';

interface StatusBarProps {
  status: AgentStatus;
  model: string;
}

const labels: Record<AgentStatus, string> = {
  idle: 'Готов к работе',
  thinking: 'Думаю…',
  executing: 'Выполняю инструмент',
  error: 'Ошибка',
};

const colors: Record<AgentStatus, string> = {
  idle: 'var(--color-success)',
  thinking: 'var(--color-accent)',
  executing: 'var(--color-warning)',
  error: 'var(--color-error)',
};

export function StatusBar({ status, model }: StatusBarProps) {
  return (
    <div
      className="flex items-center justify-between gap-3 border-t border-default bg-card px-4 py-2 text-xs"
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center gap-2 min-w-0">
        <span className="relative grid place-items-center w-3 h-3">
          <span
            className="absolute inset-0 rounded-full"
            style={{ background: colors[status], opacity: 0.25 }}
          />
          <motion.span
            className="block w-2 h-2 rounded-full"
            style={{ background: colors[status] }}
            animate={
              status === 'idle'
                ? { scale: 1, opacity: 1 }
                : { scale: [1, 1.4, 1], opacity: [1, 0.6, 1] }
            }
            transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
          />
        </span>
        <span className="text-secondary truncate">{labels[status]}</span>
      </div>
      <div className="flex items-center gap-3 text-secondary">
        <span className="hidden sm:inline">{new Date().toLocaleDateString('ru-RU')}</span>
        <span className="font-mono text-[11px] px-2 py-0.5 rounded-md bg-app border border-default">
          {model}
        </span>
      </div>
    </div>
  );
}
