import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowUp, Paperclip, Sparkles } from 'lucide-react';

interface ChatInputProps {
  onSend: (text: string) => void;
  onTyping?: (typing: boolean) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function ChatInput({ onSend, onTyping, disabled, placeholder }: ChatInputProps) {
  const [value, setValue] = useState('');
  const ref = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 220) + 'px';
  }, [value]);

  useEffect(() => {
    onTyping?.(value.length > 0);
  }, [value, onTyping]);

  const submit = () => {
    const text = value.trim();
    if (!text || disabled) return;
    onSend(text);
    setValue('');
    onTyping?.(false);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-default bg-card p-2 shadow-lg focus-within:ring-2"
      style={{
        boxShadow:
          '0 8px 32px -16px color-mix(in oklab, var(--color-accent) 30%, transparent)',
      }}
    >
      <div className="flex items-end gap-2">
        <button
          type="button"
          aria-label="Прикрепить файл"
          className="shrink-0 w-9 h-9 grid place-items-center rounded-xl text-secondary hover:bg-card-hover hover:text-primary transition"
        >
          <Paperclip size={16} />
        </button>
        <textarea
          ref={ref}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={onKeyDown}
          rows={1}
          placeholder={placeholder ?? 'Спросите OWL о чём угодно… (Enter — отправить, Shift+Enter — перенос)'}
          aria-label="Сообщение"
          className="flex-1 resize-none bg-transparent outline-none text-primary placeholder:text-muted px-1 py-2 leading-relaxed text-[14px] max-h-[220px]"
          disabled={disabled}
        />
        <button
          type="button"
          aria-label="Быстрая подсказка"
          className="shrink-0 w-9 h-9 grid place-items-center rounded-xl text-secondary hover:bg-card-hover hover:text-primary transition"
        >
          <Sparkles size={16} />
        </button>
        <motion.button
          type="button"
          onClick={submit}
          whileTap={{ scale: 0.94 }}
          disabled={disabled || value.trim().length === 0}
          aria-label="Отправить"
          className="shrink-0 w-9 h-9 grid place-items-center rounded-xl text-white gradient-accent disabled:opacity-40 disabled:cursor-not-allowed transition"
        >
          <ArrowUp size={16} />
        </motion.button>
      </div>
    </motion.div>
  );
}
