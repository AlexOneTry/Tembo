import { useEffect } from 'react';

interface Handlers {
  onNew: () => void;
  onCloseTab: () => void;
  onSearch: () => void;
  onSettings: () => void;
  onEscape: () => void;
}

export function useHotkeys(h: Handlers) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && (e.key === 'n' || e.key === 'N')) {
        e.preventDefault();
        h.onNew();
        return;
      }
      if (mod && (e.key === 'w' || e.key === 'W')) {
        e.preventDefault();
        h.onCloseTab();
        return;
      }
      if (mod && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        h.onSearch();
        return;
      }
      if (mod && e.key === '/') {
        e.preventDefault();
        h.onSettings();
        return;
      }
      if (e.key === 'Escape') {
        h.onEscape();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [h]);
}
