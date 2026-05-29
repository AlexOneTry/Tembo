import { useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { MessageBubble } from './MessageBubble';
import { TypingIndicator } from './TypingIndicator';
import { ChatInput } from './ChatInput';
import { Avatar } from './Avatar';
import { useSessionStore } from '@/stores/sessionStore';
import type { Session } from '@/types';

interface ChatWindowProps {
  session: Session;
}

export function ChatWindow({ session }: ChatWindowProps) {
  const status = useSessionStore((s) => s.agentStatus);
  const appendMessage = useSessionStore((s) => s.appendMessage);
  const setStatus = useSessionStore((s) => s.setAgentStatus);
  const updateToolCall = useSessionStore((s) => s.updateToolCall);
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [session.messages.length, status]);

  const onSend = async (text: string) => {
    appendMessage(session.id, { role: 'user', content: text });
    setStatus('thinking');

    // Simulated reply pipeline — placeholder for future API.
    await new Promise((r) => setTimeout(r, 700));

    // Maybe trigger a fake tool call for keywords
    const wantsTool = /поиск|search|whois|погод|weather/i.test(text);
    const messageId = crypto.randomUUID();

    if (wantsTool) {
      const toolId = crypto.randomUUID();
      appendMessage(session.id, {
        id: messageId,
        role: 'assistant',
        content: 'Запускаю инструмент…',
        toolCalls: [
          {
            id: toolId,
            name: 'web_search',
            args: { query: text },
            status: 'running',
          },
        ],
      });
      setStatus('executing');
      await new Promise((r) => setTimeout(r, 1400));
      updateToolCall(session.id, messageId, toolId, {
        status: 'success',
        result: 'Найдено 3 релевантных результата. Подробнее в подсказках ниже.',
        duration: 1380,
      });
    } else {
      appendMessage(session.id, {
        id: messageId,
        role: 'assistant',
        content: mockReply(text),
      });
    }

    setStatus('idle');
  };

  const isEmpty = session.messages.length === 0;

  return (
    <section className="flex-1 min-h-0 flex flex-col bg-app" aria-label="Окно чата">
      {isEmpty ? (
        <EmptyState onSend={onSend} />
      ) : (
        <div className="flex-1 min-h-0 overflow-y-auto px-3 sm:px-6 py-6">
          <div className="mx-auto max-w-3xl flex flex-col gap-4">
            <AnimatePresence initial={false}>
              {session.messages.map((m) => (
                <MessageBubble key={m.id} message={m} />
              ))}
            </AnimatePresence>
            {(status === 'thinking' || status === 'executing') && (
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex justify-start ml-9"
              >
                <TypingIndicator />
              </motion.div>
            )}
            <div ref={endRef} />
          </div>
        </div>
      )}

      <div className="px-3 sm:px-6 pb-4 pt-2">
        <div className="mx-auto max-w-3xl">
          <ChatInput
            onSend={onSend}
            onTyping={(typing) => {
              if (status === 'idle' && typing) setStatus('thinking');
              if (status === 'thinking' && !typing) setStatus('idle');
            }}
            disabled={status === 'executing'}
          />
        </div>
      </div>
    </section>
  );
}

function EmptyState({ onSend }: { onSend: (text: string) => void }) {
  const status = useSessionStore((s) => s.agentStatus);
  const quick = [
    { label: 'Планируй', prompt: 'Помоги спланировать неделю по проекту.' },
    { label: 'Пиши код', prompt: 'Напиши TypeScript-функцию debounce с тестом.' },
    { label: 'Исследуй', prompt: 'Сделай быстрый обзор последних релизов AI-агентов.' },
  ];
  return (
    <div className="flex-1 min-h-0 grid place-items-center px-6">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-center max-w-xl"
      >
        <div className="grid place-items-center mb-6">
          <Avatar status={status} size={180} />
        </div>
        <h2 className="text-2xl sm:text-3xl font-semibold gradient-text">
          Привет! Я OWL.
        </h2>
        <p className="mt-2 text-secondary">Чем могу помочь?</p>

        <div className="mt-8 flex flex-wrap gap-2 justify-center">
          {quick.map((q) => (
            <motion.button
              key={q.label}
              type="button"
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => onSend(q.prompt)}
              className="px-3.5 py-2 rounded-full text-sm bg-card border border-default text-primary hover:bg-card-hover transition"
            >
              {q.label}
            </motion.button>
          ))}
        </div>

        <motion.button
          type="button"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => onSend('Привет! Покажи, что ты умеешь.')}
          className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-white gradient-accent shadow-lg text-sm font-medium"
          style={{
            boxShadow:
              '0 10px 32px -10px color-mix(in oklab, var(--color-accent) 60%, transparent)',
          }}
        >
          Начать разговор
        </motion.button>
      </motion.div>
    </div>
  );
}

function mockReply(input: string): string {
  const trimmed = input.trim();
  if (/^(привет|hi|hello)/i.test(trimmed)) {
    return 'Привет! Я OWL — твой персональный AI-агент. Чем могу помочь?';
  }
  if (/код|code|function|функци/i.test(trimmed)) {
    return [
      'Конечно, держи короткий пример.',
      '',
      '```ts',
      'export function debounce<T extends (...args: unknown[]) => void>(fn: T, ms = 200) {',
      '  let t: ReturnType<typeof setTimeout> | undefined;',
      '  return (...args: Parameters<T>) => {',
      '    if (t) clearTimeout(t);',
      '    t = setTimeout(() => fn(...args), ms);',
      '  };',
      '}',
      '```',
      '',
      'Если хочешь — могу добавить тест на Vitest.',
    ].join('\n');
  }
  return [
    'Понял. Вот как я предлагаю двигаться:',
    '',
    '- Уточним цель и аудиторию',
    '- Соберём 3 варианта решения',
    '- Выберем самый дешёвый по времени',
    '',
    'Скажи, что важнее — скорость или качество?',
  ].join('\n');
}
