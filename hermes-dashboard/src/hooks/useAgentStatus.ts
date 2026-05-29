import { useSessionStore } from '@/stores/sessionStore';

export function useAgentStatus() {
  const status = useSessionStore((s) => s.agentStatus);
  const setStatus = useSessionStore((s) => s.setAgentStatus);
  return { status, setStatus };
}
