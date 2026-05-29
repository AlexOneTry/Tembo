import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ChevronLeft,
  ChevronRight,
  MessageSquarePlus,
  Search,
  Settings as SettingsIcon,
  Trash2,
} from 'lucide-react';
import { useSessionStore } from '@/stores/sessionStore';
import { formatDate, formatRelativeDay, formatTime } from '@/utils/formatters';
import type { Session } from '@/types';
import { clsx } from 'clsx';

interface SidebarProps {
  searchOpen: boolean;
  onCloseSearch: () => void;
  onOpenSearch: () => void;
}

export function Sidebar({ searchOpen, onCloseSearch, onOpenSearch }: SidebarProps) {
  const sessions = useSessionStore((s) => s.sessions);
  const collapsed = useSessionStore((s) => s.sidebarCollapsed);
  const toggle = useSessionStore((s) => s.toggleSidebar);
  const openSession = useSessionStore((s) => s.openSession);
  const deleteSession = useSessionStore((s) => s.deleteSession);
  const createSession = useSessionStore((s) => s.createSession);
  const activeId = useSessionStore((s) => s.activeSessionId);
  const openSettings = useSessionStore((s) => s.openSettings);
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sessions;
    return sessions.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        s.messages.some((m) => m.content.toLowerCase().includes(q)),
    );
  }, [sessions, query]);

  const grouped = useMemo(() => {
    const today: Session[] = [];
    const yesterday: Session[] = [];
    const earlier: Session[] = [];
    for (const s of [...filtered].sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    )) {
      const slot = formatRelativeDay(s.updatedAt);
      if (slot === 'today') today.push(s);
      else if (slot === 'yesterday') yesterday.push(s);
      else earlier.push(s);
    }
    return { today, yesterday, earlier };
  }, [filtered]);

  return (
    <motion.aside
      animate={{ width: collapsed ? 64 : 280 }}
      transition={{ type: 'spring', stiffness: 320, damping: 30 }}
      className="relative shrink-0 h-full border-r border-default bg-app flex flex-col"
    >
      <div className="flex items-center gap-2 px-3 py-3 border-b border-default">
        <div
          className="w-8 h-8 rounded-lg gradient-accent grid place-items-center text-white font-semibold shrink-0"
          aria-hidden
        >
          H
        </div>
        {!collapsed && (
          <div className="flex-1 min-w-0">
            <div className="text-[13px] font-semibold gradient-text">Hermes</div>
            <div className="text-[10.5px] text-muted">OWL Dashboard</div>
          </div>
        )}
        <button
          type="button"
          onClick={toggle}
          aria-label={collapsed ? 'Развернуть сайдбар' : 'Свернуть сайдбар'}
          className="shrink-0 w-7 h-7 grid place-items-center rounded-md text-secondary hover:bg-card-hover hover:text-primary transition"
        >
          {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </div>

      <div className="px-2 py-2 space-y-1.5">
        <button
          type="button"
          onClick={() => createSession()}
          className={clsx(
            'w-full flex items-center gap-2 rounded-lg px-2.5 py-2 text-[13px] transition border border-transparent',
            'hover:bg-card-hover text-primary',
          )}
        >
          <MessageSquarePlus size={15} className="shrink-0 text-accent" />
          {!collapsed && <span>Новая сессия</span>}
          {!collapsed && (
            <kbd className="ml-auto text-[10px] text-muted font-mono">⌘N</kbd>
          )}
        </button>
        <button
          type="button"
          onClick={onOpenSearch}
          className="w-full flex items-center gap-2 rounded-lg px-2.5 py-2 text-[13px] transition hover:bg-card-hover text-primary"
        >
          <Search size={15} className="shrink-0 text-secondary" />
          {!collapsed && <span>Поиск</span>}
          {!collapsed && <kbd className="ml-auto text-[10px] text-muted font-mono">⌘K</kbd>}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-2 pb-2">
        {collapsed ? (
          <ul className="space-y-1">
            {sessions.slice(0, 10).map((s) => {
              const isActive = s.id === activeId;
              return (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => openSession(s.id)}
                    title={s.title}
                    className={clsx(
                      'w-full grid place-items-center h-9 rounded-lg transition border',
                      isActive
                        ? 'bg-card border-default text-primary'
                        : 'border-transparent text-secondary hover:bg-card-hover hover:text-primary',
                    )}
                  >
                    <span className="font-mono text-[12px]">
                      {s.title.slice(0, 1).toUpperCase()}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="space-y-3">
            {(['today', 'yesterday', 'earlier'] as const).map((slot) => {
              const list = grouped[slot];
              if (list.length === 0) return null;
              const label =
                slot === 'today' ? 'Сегодня' : slot === 'yesterday' ? 'Вчера' : 'Раньше';
              return (
                <div key={slot}>
                  <div className="px-2 py-1 text-[10px] uppercase tracking-wider font-semibold text-muted">
                    {label}
                  </div>
                  <motion.ul
                    initial="hidden"
                    animate="visible"
                    variants={{
                      hidden: {},
                      visible: { transition: { staggerChildren: 0.025 } },
                    }}
                    className="space-y-0.5"
                  >
                    {list.map((s) => (
                      <SessionRow
                        key={s.id}
                        session={s}
                        active={s.id === activeId}
                        onClick={() => openSession(s.id)}
                        onDelete={() => deleteSession(s.id)}
                      />
                    ))}
                  </motion.ul>
                </div>
              );
            })}
            {filtered.length === 0 && (
              <div className="px-2 py-6 text-center text-secondary text-sm">
                Сессии не найдены
              </div>
            )}
          </div>
        )}
      </div>

      <div className="border-t border-default p-2">
        <button
          type="button"
          onClick={openSettings}
          className="w-full flex items-center gap-2 rounded-lg px-2.5 py-2 text-[13px] hover:bg-card-hover text-primary transition"
          aria-label="Открыть настройки"
        >
          <SettingsIcon size={15} className="shrink-0 text-secondary" />
          {!collapsed && <span>Настройки</span>}
          {!collapsed && <kbd className="ml-auto text-[10px] text-muted font-mono">⌘/</kbd>}
        </button>
      </div>

      <AnimatePresence>
        {searchOpen && (
          <SearchOverlay
            query={query}
            setQuery={setQuery}
            sessions={filtered}
            onPick={(id) => {
              openSession(id);
              onCloseSearch();
              setQuery('');
            }}
            onClose={() => {
              onCloseSearch();
              setQuery('');
            }}
          />
        )}
      </AnimatePresence>
    </motion.aside>
  );
}

function SessionRow({
  session,
  active,
  onClick,
  onDelete,
}: {
  session: Session;
  active: boolean;
  onClick: () => void;
  onDelete: () => void;
}) {
  const last = session.messages[session.messages.length - 1];
  return (
    <motion.li
      variants={{
        hidden: { opacity: 0, y: 4 },
        visible: { opacity: 1, y: 0 },
      }}
    >
      <div
        onClick={onClick}
        className={clsx(
          'group cursor-pointer rounded-lg px-2.5 py-2 transition border',
          active
            ? 'bg-card border-default'
            : 'border-transparent hover:bg-card-hover',
        )}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter') onClick();
        }}
      >
        <div className="flex items-center gap-2">
          <span
            className="text-[13px] font-medium truncate flex-1"
            style={{ color: active ? 'var(--color-text)' : 'var(--color-text)' }}
          >
            {session.title}
          </span>
          <span className="text-[10.5px] text-muted shrink-0 font-mono">
            {formatRelativeDay(session.updatedAt) === 'today'
              ? formatTime(session.updatedAt)
              : formatDate(session.updatedAt)}
          </span>
          <button
            type="button"
            aria-label="Удалить сессию"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="opacity-0 group-hover:opacity-100 transition w-5 h-5 grid place-items-center rounded text-muted hover:text-error hover:bg-app"
          >
            <Trash2 size={11} />
          </button>
        </div>
        {last && (
          <p className="text-[11.5px] text-secondary mt-0.5 truncate">
            {last.role === 'user' ? 'Вы: ' : ''}
            {last.content.replace(/\n/g, ' ').slice(0, 80)}
          </p>
        )}
      </div>
    </motion.li>
  );
}

function SearchOverlay({
  query,
  setQuery,
  sessions,
  onPick,
  onClose,
}: {
  query: string;
  setQuery: (s: string) => void;
  sessions: Session[];
  onPick: (id: string) => void;
  onClose: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 z-40 grid place-items-start pt-[12vh] backdrop-blur-sm"
      style={{ background: 'color-mix(in oklab, #000 50%, transparent)' }}
    >
      <motion.div
        initial={{ y: -8, opacity: 0, scale: 0.98 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: -8, opacity: 0, scale: 0.98 }}
        onClick={(e) => e.stopPropagation()}
        className="w-[min(560px,92vw)] rounded-xl bg-card border border-strong shadow-2xl overflow-hidden"
      >
        <div className="flex items-center gap-2 px-3 py-2 border-b border-default">
          <Search size={15} className="text-secondary" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Поиск по сессиям…"
            className="flex-1 bg-transparent outline-none text-primary placeholder:text-muted text-sm"
            aria-label="Поиск"
          />
          <kbd className="text-[10px] text-muted font-mono px-1.5 py-0.5 rounded bg-app border border-default">
            esc
          </kbd>
        </div>
        <div className="max-h-[50vh] overflow-y-auto py-1">
          {sessions.length === 0 && (
            <div className="px-3 py-6 text-center text-secondary text-sm">
              Ничего не найдено
            </div>
          )}
          {sessions.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => onPick(s.id)}
              className="w-full text-left px-3 py-2 hover:bg-card-hover transition"
            >
              <div className="text-sm text-primary truncate">{s.title}</div>
              <div className="text-[11.5px] text-muted truncate">
                {s.messages.length} сообщ. · {formatDate(s.updatedAt)}
              </div>
            </button>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}
