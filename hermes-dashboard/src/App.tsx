import { useCallback, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Sidebar } from '@/components/Sidebar';
import { SessionTabs } from '@/components/SessionTabs';
import { ChatWindow } from '@/components/ChatWindow';
import { StatusBar } from '@/components/StatusBar';
import { SettingsPanel } from '@/components/SettingsPanel';
import { Avatar } from '@/components/Avatar';
import { useSessions } from '@/hooks/useSessions';
import { useAgentStatus } from '@/hooks/useAgentStatus';
import { useSessionStore } from '@/stores/sessionStore';
import { useHotkeys } from '@/hooks/useHotkeys';

export default function App() {
  const { activeSession, openSessionIds } = useSessions();
  const { status } = useAgentStatus();
  const createSession = useSessionStore((s) => s.createSession);
  const closeSession = useSessionStore((s) => s.closeSession);
  const activeId = useSessionStore((s) => s.activeSessionId);
  const openSettings = useSessionStore((s) => s.openSettings);
  const closeSettings = useSessionStore((s) => s.closeSettings);
  const model = useSessionStore((s) => s.settings.model);

  const [searchOpen, setSearchOpen] = useState(false);

  useHotkeys({
    onNew: useCallback(() => createSession(), [createSession]),
    onCloseTab: useCallback(() => {
      if (activeId) closeSession(activeId);
    }, [activeId, closeSession]),
    onSearch: useCallback(() => setSearchOpen(true), []),
    onSettings: useCallback(() => openSettings(), [openSettings]),
    onEscape: useCallback(() => {
      setSearchOpen(false);
      closeSettings();
    }, [closeSettings]),
  });

  return (
    <div className="h-screen w-screen flex bg-app text-primary overflow-hidden">
      <Sidebar
        searchOpen={searchOpen}
        onOpenSearch={() => setSearchOpen(true)}
        onCloseSearch={() => setSearchOpen(false)}
      />

      <main className="flex-1 min-w-0 flex flex-col">
        {openSessionIds.length > 0 && <SessionTabs />}

        <AnimatePresence mode="wait">
          {activeSession ? (
            <motion.div
              key={activeSession.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2 }}
              className="flex-1 min-h-0 flex flex-col"
            >
              <ChatWindow session={activeSession} />
            </motion.div>
          ) : (
            <Welcome key="welcome" onCreate={() => createSession()} />
          )}
        </AnimatePresence>

        <StatusBar status={status} model={model} />
      </main>

      <SettingsPanel />
    </div>
  );
}

function Welcome({ onCreate }: { onCreate: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex-1 min-h-0 grid place-items-center px-6"
    >
      <div className="text-center max-w-md">
        <div className="grid place-items-center mb-6">
          <Avatar status="idle" size={200} />
        </div>
        <h1 className="text-3xl font-semibold gradient-text">Привет! Я OWL.</h1>
        <p className="mt-2 text-secondary">Чем могу помочь?</p>
        <motion.button
          type="button"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onCreate}
          className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-white gradient-accent shadow-lg text-sm font-medium"
        >
          Начать разговор
        </motion.button>
      </div>
    </motion.div>
  );
}
