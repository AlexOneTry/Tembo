import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown, AlertCircle, CheckCircle2, Loader2, Wrench } from 'lucide-react';
import type { ToolCall } from '@/types';
import { formatDuration } from '@/utils/formatters';
import { clsx } from 'clsx';

interface ToolCallCardProps {
  toolCall: ToolCall;
}

const statusStyles = {
  pending: { color: 'var(--color-text-secondary)', label: 'В очереди' },
  running: { color: 'var(--color-warning)', label: 'Выполняется' },
  success: { color: 'var(--color-success)', label: 'Готово' },
  error: { color: 'var(--color-error)', label: 'Ошибка' },
} as const;

export function ToolCallCard({ toolCall }: ToolCallCardProps) {
  const [open, setOpen] = useState(false);
  const s = statusStyles[toolCall.status];

  const Icon =
    toolCall.status === 'success'
      ? CheckCircle2
      : toolCall.status === 'error'
        ? AlertCircle
        : toolCall.status === 'running'
          ? Loader2
          : Wrench;

  return (
    <div
      className="rounded-xl border bg-card overflow-hidden"
      style={{ borderColor: 'var(--color-border)' }}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 px-3.5 py-2.5 text-left hover:bg-card-hover transition"
        aria-expanded={open}
      >
        <span
          className="grid place-items-center w-7 h-7 rounded-lg shrink-0"
          style={{
            background: `color-mix(in oklab, ${s.color} 18%, transparent)`,
            color: s.color,
          }}
        >
          <Icon
            size={15}
            className={toolCall.status === 'running' ? 'animate-spin' : ''}
          />
        </span>
        <span className="flex-1 min-w-0">
          <span className="flex items-center gap-2">
            <span className="font-mono text-[13px] text-primary truncate">{toolCall.name}</span>
            <span
              className="text-[10px] uppercase tracking-wider font-medium px-1.5 py-0.5 rounded"
              style={{
                background: `color-mix(in oklab, ${s.color} 14%, transparent)`,
                color: s.color,
              }}
            >
              {s.label}
            </span>
            {toolCall.duration !== undefined && (
              <span className="text-[11px] text-muted font-mono">
                {formatDuration(toolCall.duration)}
              </span>
            )}
          </span>
        </span>
        <ChevronDown
          size={16}
          className={clsx('text-secondary transition-transform', open && 'rotate-180')}
        />
      </button>

      {toolCall.status === 'running' && (
        <div className="h-0.5 bg-app overflow-hidden">
          <motion.div
            className="h-full"
            style={{ background: s.color }}
            initial={{ width: '0%' }}
            animate={{ width: ['0%', '70%', '95%'] }}
            transition={{ duration: 6, ease: 'easeOut' }}
          />
        </div>
      )}

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="border-t border-default px-3.5 py-3 space-y-3">
              <Block label="Аргументы">
                <pre className="text-[12px] font-mono whitespace-pre-wrap break-words text-secondary">
                  {JSON.stringify(toolCall.args, null, 2)}
                </pre>
              </Block>
              {toolCall.result !== undefined && (
                <Block label="Результат">
                  <pre className="text-[12px] font-mono whitespace-pre-wrap break-words text-primary">
                    {toolCall.result}
                  </pre>
                </Block>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Block({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider font-semibold text-muted mb-1.5">
        {label}
      </div>
      <div className="rounded-lg bg-app border border-default p-2.5">{children}</div>
    </div>
  );
}
