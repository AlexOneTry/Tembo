import { useEffect } from 'react';
import { useSessionStore } from '@/stores/sessionStore';

export function useSessions() {
  const sessions = useSessionStore((s) => s.sessions);
  const openSessionIds = useSessionStore((s) => s.openSessionIds);
  const activeSessionId = useSessionStore((s) => s.activeSessionId);
  const activeSession = sessions.find((s) => s.id === activeSessionId) ?? null;
  const hydrateDemo = useSessionStore((s) => s.hydrateDemo);

  useEffect(() => {
    hydrateDemo();
  }, [hydrateDemo]);

  return {
    sessions,
    openSessionIds,
    activeSessionId,
    activeSession,
  };
}
