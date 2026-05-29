import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AgentStatus, Message, Session, Settings, ToolCall } from '@/types';
import { deriveTitle, uid } from '@/utils/formatters';

interface SessionState {
  sessions: Session[];
  openSessionIds: string[];
  activeSessionId: string | null;
  agentStatus: AgentStatus;
  sidebarCollapsed: boolean;
  settingsOpen: boolean;
  settings: Settings;

  createSession: (initialMessage?: string) => string;
  openSession: (id: string) => void;
  closeSession: (id: string) => void;
  setActive: (id: string) => void;
  reorderTabs: (from: number, to: number) => void;
  appendMessage: (sessionId: string, msg: Omit<Message, 'id' | 'timestamp'> & { id?: string; timestamp?: Date }) => void;
  updateToolCall: (sessionId: string, messageId: string, toolCallId: string, patch: Partial<ToolCall>) => void;
  renameSession: (id: string, title: string) => void;
  deleteSession: (id: string) => void;
  setAgentStatus: (s: AgentStatus) => void;
  toggleSidebar: () => void;
  openSettings: () => void;
  closeSettings: () => void;
  updateSettings: (patch: Partial<Settings>) => void;
  hydrateDemo: () => void;
}

const defaultSettings: Settings = {
  theme: 'dark',
  accentColor: '#7c5cfc',
  fontSize: 14,
  apiEndpoint: '',
  model: 'openrouter/owl-alpha',
};

function demoSessions(): Session[] {
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;
  const s1: Session = {
    id: uid(),
    title: 'План запуска лендинга',
    createdAt: new Date(now - 2 * 60 * 60 * 1000),
    updatedAt: new Date(now - 30 * 60 * 1000),
    messages: [
      {
        id: uid(),
        role: 'user',
        content: 'Помоги составить план запуска лендинга для AI-стартапа на этой неделе.',
        timestamp: new Date(now - 2 * 60 * 60 * 1000),
      },
      {
        id: uid(),
        role: 'assistant',
        content: [
          '## План запуска',
          '',
          '1. **Понедельник** — финализировать копирайт и hero-секцию.',
          '2. **Вторник** — собрать UI на Tailwind, подключить аналитику.',
          '3. **Среда** — пройти технический аудит, проверить Core Web Vitals.',
          '4. **Четверг** — soft-launch для друзей, собрать обратную связь.',
          '5. **Пятница** — публичный анонс в X и Product Hunt.',
          '',
          'Хочешь, чтобы я подготовил черновики постов?',
        ].join('\n'),
        timestamp: new Date(now - 2 * 60 * 60 * 1000 + 30 * 1000),
      },
      {
        id: uid(),
        role: 'user',
        content: 'Да, и проверь, чтобы домен был свободен — `hermes.run`',
        timestamp: new Date(now - 90 * 60 * 1000),
      },
      {
        id: uid(),
        role: 'assistant',
        content: 'Проверяю домен и параллельно готовлю драфты постов.',
        timestamp: new Date(now - 89 * 60 * 1000),
        toolCalls: [
          {
            id: uid(),
            name: 'whois',
            args: { domain: 'hermes.run' },
            result: '{\n  "available": false,\n  "registrar": "Namecheap",\n  "expires": "2026-12-04"\n}',
            status: 'success',
            duration: 820,
          },
          {
            id: uid(),
            name: 'draft_post',
            args: { platform: 'product_hunt', tone: 'playful' },
            result: '✨ Hermes — твой персональный AI-агент. Today on Product Hunt!',
            status: 'success',
            duration: 1420,
          },
        ],
      },
    ],
  };

  const s2: Session = {
    id: uid(),
    title: 'Рефакторинг чат-компонента',
    createdAt: new Date(now - day - 60 * 60 * 1000),
    updatedAt: new Date(now - day - 30 * 60 * 1000),
    messages: [
      {
        id: uid(),
        role: 'user',
        content: 'Покажи пример мемоизированного MessageBubble на React 18.',
        timestamp: new Date(now - day - 60 * 60 * 1000),
      },
      {
        id: uid(),
        role: 'assistant',
        content: [
          'Конечно. Ключевые моменты — `memo`, стабильные ссылки и keyed-список.',
          '',
          '```tsx',
          'const MessageBubble = memo(function MessageBubble({ message }: Props) {',
          '  return <div className="bubble">{message.content}</div>;',
          '}, (a, b) => a.message.id === b.message.id && a.message.content === b.message.content);',
          '```',
          '',
          'Это снизит количество ререндеров при длинных стримах.',
        ].join('\n'),
        timestamp: new Date(now - day - 60 * 60 * 1000 + 45 * 1000),
      },
    ],
  };

  const s3: Session = {
    id: uid(),
    title: 'Исследование рынка AI-агентов',
    createdAt: new Date(now - 5 * day),
    updatedAt: new Date(now - 5 * day + 60 * 60 * 1000),
    messages: [
      {
        id: uid(),
        role: 'user',
        content: 'Сделай быстрый обзор основных AI-агентов осени 2025 года.',
        timestamp: new Date(now - 5 * day),
      },
      {
        id: uid(),
        role: 'assistant',
        content: [
          '### Основные игроки',
          '',
          '| Агент | Сильная сторона | Слабая сторона |',
          '| --- | --- | --- |',
          '| Claude Agent | глубокий контекст | цена |',
          '| GPT Operator | браузер | приватность |',
          '| Devin | автономия | надёжность |',
          '',
          'Если хочешь — могу копнуть глубже в один из них.',
        ].join('\n'),
        timestamp: new Date(now - 5 * day + 60 * 1000),
      },
    ],
  };

  return [s1, s2, s3];
}

export const useSessionStore = create<SessionState>()(
  persist(
    (set, get) => ({
      sessions: [],
      openSessionIds: [],
      activeSessionId: null,
      agentStatus: 'idle',
      sidebarCollapsed: false,
      settingsOpen: false,
      settings: defaultSettings,

      createSession: (initialMessage) => {
        const id = uid();
        const now = new Date();
        const session: Session = {
          id,
          title: initialMessage ? deriveTitle(initialMessage) : 'Новая сессия',
          messages: [],
          createdAt: now,
          updatedAt: now,
        };
        set((s) => ({
          sessions: [session, ...s.sessions],
          openSessionIds: [...s.openSessionIds, id],
          activeSessionId: id,
        }));
        return id;
      },

      openSession: (id) => {
        const state = get();
        if (!state.sessions.find((s) => s.id === id)) return;
        const open = state.openSessionIds.includes(id)
          ? state.openSessionIds
          : [...state.openSessionIds, id];
        set({ openSessionIds: open, activeSessionId: id });
      },

      closeSession: (id) => {
        set((state) => {
          const idx = state.openSessionIds.indexOf(id);
          const open = state.openSessionIds.filter((x) => x !== id);
          let active = state.activeSessionId;
          if (active === id) {
            if (open.length === 0) active = null;
            else active = open[Math.min(idx, open.length - 1)];
          }
          return { openSessionIds: open, activeSessionId: active };
        });
      },

      setActive: (id) => set({ activeSessionId: id }),

      reorderTabs: (from, to) =>
        set((state) => {
          const arr = [...state.openSessionIds];
          const [moved] = arr.splice(from, 1);
          arr.splice(to, 0, moved);
          return { openSessionIds: arr };
        }),

      appendMessage: (sessionId, msg) => {
        const messageId = msg.id ?? uid();
        const timestamp = msg.timestamp ?? new Date();
        set((state) => ({
          sessions: state.sessions.map((s) => {
            if (s.id !== sessionId) return s;
            const messages = [...s.messages, { ...msg, id: messageId, timestamp }];
            let title = s.title;
            if (s.messages.length === 0 && msg.role === 'user') {
              title = deriveTitle(msg.content);
            }
            return { ...s, messages, title, updatedAt: new Date() };
          }),
        }));
      },

      updateToolCall: (sessionId, messageId, toolCallId, patch) => {
        set((state) => ({
          sessions: state.sessions.map((s) => {
            if (s.id !== sessionId) return s;
            return {
              ...s,
              messages: s.messages.map((m) => {
                if (m.id !== messageId || !m.toolCalls) return m;
                return {
                  ...m,
                  toolCalls: m.toolCalls.map((tc) =>
                    tc.id === toolCallId ? { ...tc, ...patch } : tc,
                  ),
                };
              }),
            };
          }),
        }));
      },

      renameSession: (id, title) =>
        set((state) => ({
          sessions: state.sessions.map((s) => (s.id === id ? { ...s, title } : s)),
        })),

      deleteSession: (id) =>
        set((state) => ({
          sessions: state.sessions.filter((s) => s.id !== id),
          openSessionIds: state.openSessionIds.filter((x) => x !== id),
          activeSessionId: state.activeSessionId === id ? null : state.activeSessionId,
        })),

      setAgentStatus: (agentStatus) => set({ agentStatus }),

      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),

      openSettings: () => set({ settingsOpen: true }),
      closeSettings: () => set({ settingsOpen: false }),

      updateSettings: (patch) =>
        set((state) => ({ settings: { ...state.settings, ...patch } })),

      hydrateDemo: () => {
        const state = get();
        if (state.sessions.length > 0) return;
        const demos = demoSessions();
        set({
          sessions: demos,
          openSessionIds: [demos[0].id],
          activeSessionId: demos[0].id,
        });
      },
    }),
    {
      name: 'hermes-dashboard:v1',
      version: 1,
      partialize: (state) => ({
        sessions: state.sessions,
        openSessionIds: state.openSessionIds,
        activeSessionId: state.activeSessionId,
        sidebarCollapsed: state.sidebarCollapsed,
        settings: state.settings,
      }),
    },
  ),
);
