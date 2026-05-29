import { memo } from 'react';
import { motion } from 'framer-motion';
import type { Message } from '@/types';
import { formatTime } from '@/utils/formatters';
import { Markdown } from './Markdown';
import { ToolCallCard } from './ToolCallCard';
import { clsx } from 'clsx';

interface MessageBubbleProps {
  message: Message;
}

export const MessageBubble = memo(function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';

  if (isSystem) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center text-xs text-secondary py-2"
      >
        {message.content}
      </motion.div>
    );
  }

  return (
    <motion.div
      layout="position"
      initial={{ opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 320, damping: 26 }}
      className={clsx('flex w-full gap-2 sm:gap-3', isUser ? 'justify-end' : 'justify-start')}
    >
      {!isUser && (
        <div
          className="shrink-0 mt-1 w-7 h-7 rounded-full grid place-items-center font-mono text-[11px]"
          style={{
            background: 'color-mix(in oklab, var(--color-accent) 18%, transparent)',
            color: 'var(--color-accent)',
          }}
          aria-hidden
        >
          O
        </div>
      )}

      <div className={clsx('flex flex-col gap-2 max-w-[min(78ch,82%)]', isUser && 'items-end')}>
        <div
          className={clsx(
            'rounded-2xl px-4 py-2.5 shadow-sm',
            isUser
              ? 'gradient-accent text-white rounded-br-md'
              : 'bg-card border border-default text-primary rounded-bl-md',
          )}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
          ) : (
            <Markdown content={message.content} />
          )}
        </div>

        {message.toolCalls && message.toolCalls.length > 0 && (
          <div className="w-full flex flex-col gap-1.5">
            {message.toolCalls.map((tc) => (
              <ToolCallCard key={tc.id} toolCall={tc} />
            ))}
          </div>
        )}

        <span className="text-[10.5px] text-muted px-1">
          {formatTime(message.timestamp)}
        </span>
      </div>

      {isUser && (
        <div
          className="shrink-0 mt-1 w-7 h-7 rounded-full grid place-items-center font-mono text-[11px] bg-card border border-default text-secondary"
          aria-hidden
        >
          Я
        </div>
      )}
    </motion.div>
  );
});
