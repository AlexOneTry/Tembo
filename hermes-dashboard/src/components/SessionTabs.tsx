import { useState } from 'react';
import { AnimatePresence, motion, Reorder } from 'framer-motion';
import { Plus, X } from 'lucide-react';
import { useSessionStore } from '@/stores/sessionStore';
import { clsx } from 'clsx';

export function SessionTabs() {
  const sessions = useSessionStore((s) => s.sessions);
  const openIds = useSessionStore((s) => s.openSessionIds);
  const activeId = useSessionStore((s) => s.activeSessionId);
  const setActive = useSessionStore((s) => s.setActive);
  const closeSession = useSessionStore((s) => s.closeSession);
  const createSession = useSessionStore((s) => s.createSession);
  const reorderTabs = useSessionStore((s) => s.reorderTabs);
  const [hovered, setHovered] = useState<string | null>(null);

  const handleReorder = (next: string[]) => {
    // detect from/to
    for (let i = 0; i < openIds.length; i++) {
      if (openIds[i] !== next[i]) {
        const from = openIds.indexOf(next[i]);
        if (from !== -1) reorderTabs(from, i);
        break;
      }
    }
  };

  return (
    <div className="flex items-center gap-1 border-b border-default bg-app px-2 pt-2">
      <Reorder.Group
        axis="x"
        values={openIds}
        onReorder={handleReorder}
        className="flex items-end gap-1 flex-1 min-w-0 overflow-x-auto"
        as="div"
      >
        <AnimatePresence initial={false}>
          {openIds.map((id) => {
            const session = sessions.find((s) => s.id === id);
            if (!session) return null;
            const isActive = id === activeId;
            return (
              <Reorder.Item
                key={id}
                value={id}
                as="div"
                whileDrag={{ scale: 1.04, zIndex: 10 }}
                className="shrink-0"
              >
                <motion.div
                  layout
                  initial={{ opacity: 0, x: 12, scale: 0.96 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: 12, scale: 0.96 }}
                  transition={{ type: 'spring', stiffness: 360, damping: 28 }}
                  className="relative"
                  onMouseEnter={() => setHovered(id)}
                  onMouseLeave={() => setHovered(null)}
                >
                  <button
                    type="button"
                    onClick={() => setActive(id)}
                    className={clsx(
                      'group flex items-center gap-2 max-w-[240px] pl-3 pr-2 py-1.5 rounded-t-lg text-[13px] transition border-x border-t',
                      isActive
                        ? 'bg-card text-primary border-default'
                        : 'bg-app text-secondary border-transparent hover:text-primary hover:bg-card-hover',
                    )}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    <span
                      className={clsx(
                        'w-1.5 h-1.5 rounded-full shrink-0',
                        isActive ? 'bg-accent' : 'bg-border',
                      )}
                      style={!isActive ? { background: 'var(--color-border-strong)' } : undefined}
                    />
                    <span className="truncate">{session.title}</span>
                    <span
                      role="button"
                      tabIndex={0}
                      aria-label="Закрыть сессию"
                      onClick={(e) => {
                        e.stopPropagation();
                        closeSession(id);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.stopPropagation();
                          closeSession(id);
                        }
                      }}
                      className="ml-1 w-5 h-5 grid place-items-center rounded-md text-muted hover:bg-card-hover hover:text-primary transition"
                    >
                      <X size={12} />
                    </span>
                  </button>
                  {hovered === id && (
                    <div
                      role="tooltip"
                      className="absolute top-full left-1/2 -translate-x-1/2 mt-1 z-30 px-2.5 py-1 rounded-md bg-card border border-strong text-[11.5px] text-secondary whitespace-nowrap shadow-lg"
                      style={{ pointerEvents: 'none' }}
                    >
                      {session.title}
                    </div>
                  )}
                </motion.div>
              </Reorder.Item>
            );
          })}
        </AnimatePresence>
      </Reorder.Group>

      <button
        type="button"
        onClick={() => createSession()}
        aria-label="Новая сессия"
        title="Новая сессия — Cmd/Ctrl + N"
        className="ml-1 shrink-0 w-8 h-8 grid place-items-center rounded-lg text-secondary hover:bg-card-hover hover:text-primary transition"
      >
        <Plus size={16} />
      </button>
    </div>
  );
}
