/* ===== storage.js — LocalStorage / IndexedDB helpers ===== */

const Storage = (() => {
  const KEY = 'avito_analytics_v1';
  const HISTORY_KEY = 'avito_history_v1';
  const SETTINGS_KEY = 'avito_settings_v1';
  const MAPPING_KEY = 'avito_mapping_v1';
  const THEME_KEY = 'avito_theme_v1';

  function safeGet(key, fallback) {
    try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : fallback; }
    catch { return fallback; }
  }
  function safeSet(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); return true; }
    catch (e) { console.warn('LocalStorage save failed', e); return false; }
  }

  return {
    saveDataset(dataset) {
      // dataset may be large; try LocalStorage, fail silently if too big
      try {
        // strip raw rows to save space — keep computed parts
        const trimmed = {
          fileName: dataset.fileName,
          ts: dataset.ts,
          rows: dataset.rows.slice(0, 5000), // cap stored rows
          headers: dataset.headers,
          mapping: dataset.mapping
        };
        return safeSet(KEY, trimmed);
      } catch (e) { return false; }
    },
    loadDataset() { return safeGet(KEY, null); },
    clearDataset() { localStorage.removeItem(KEY); },

    pushHistory(entry) {
      const hist = safeGet(HISTORY_KEY, []);
      hist.unshift({ ...entry, ts: Date.now() });
      safeSet(HISTORY_KEY, hist.slice(0, 12));
    },
    getHistory() { return safeGet(HISTORY_KEY, []); },
    clearHistory() { localStorage.removeItem(HISTORY_KEY); },

    saveSettings(s) { safeSet(SETTINGS_KEY, s); },
    loadSettings() {
      return safeGet(SETTINGS_KEY, {
        avgCheck: 5000,
        margin: 30,
        currency: '₽'
      });
    },

    saveMapping(m) { safeSet(MAPPING_KEY, m); },
    loadMapping() { return safeGet(MAPPING_KEY, {}); },

    saveTheme(t) { localStorage.setItem(THEME_KEY, t); },
    loadTheme() { return localStorage.getItem(THEME_KEY) || 'dark'; },

    clearAll() {
      [KEY, HISTORY_KEY, SETTINGS_KEY, MAPPING_KEY].forEach(k => localStorage.removeItem(k));
    }
  };
})();
