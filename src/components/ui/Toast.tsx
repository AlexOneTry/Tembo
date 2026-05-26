import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from 'lucide-react';
import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import type { ToastMessage } from '@/types';
import { cn } from '@/lib/cn';

interface ToastCtx {
  show: (t: Omit<ToastMessage, 'id'>) => void;
  success: (title: string, description?: string) => void;
  error: (title: string, description?: string) => void;
  info: (title: string, description?: string) => void;
  warning: (title: string, description?: string) => void;
}

const Ctx = createContext<ToastCtx | null>(null);

const ICONS = {
  success: CheckCircle2,
  error: XCircle,
  info: Info,
  warning: AlertTriangle,
};

const TONES = {
  success: 'text-emerald-400',
  error: 'text-rose-400',
  info: 'text-brand-400',
  warning: 'text-amber-400',
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((arr) => arr.filter((t) => t.id !== id));
  }, []);

  const show = useCallback(
    (t: Omit<ToastMessage, 'id'>) => {
      const id = `toast_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      setToasts((arr) => [...arr, { ...t, id }]);
      setTimeout(() => dismiss(id), 4200);
    },
    [dismiss]
  );

  const api: ToastCtx = {
    show,
    success: (title, description) => show({ title, description, variant: 'success' }),
    error: (title, description) => show({ title, description, variant: 'error' }),
    info: (title, description) => show({ title, description, variant: 'info' }),
    warning: (title, description) => show({ title, description, variant: 'warning' }),
  };

  return (
    <Ctx.Provider value={api}>
      {children}
      <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 max-w-sm w-[calc(100vw-2rem)]">
        <AnimatePresence>
          {toasts.map((t) => {
            const Icon = ICONS[t.variant];
            return (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, x: 30, scale: 0.96 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 30, scale: 0.96 }}
                transition={{ type: 'spring', damping: 22, stiffness: 280 }}
                className="glass-card flex items-start gap-3 p-3.5"
              >
                <Icon className={cn('h-5 w-5 mt-0.5 shrink-0', TONES[t.variant])} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-strong">{t.title}</div>
                  {t.description && (
                    <div className="text-xs text-soft mt-0.5 break-words">{t.description}</div>
                  )}
                </div>
                <button
                  onClick={() => dismiss(t.id)}
                  className="text-soft hover:text-strong transition"
                  aria-label="Закрыть"
                >
                  <X className="h-4 w-4" />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </Ctx.Provider>
  );
}

export function useToast(): ToastCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
