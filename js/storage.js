/* ============================================================
   storage.js — LocalStorage + IndexedDB для истории и настроек
   ============================================================
   - Настройки и небольшие срезы данных хранятся в LocalStorage
   - Полные нормализованные dataset-ы хранятся в IndexedDB
     (т.к. могут весить десятки мегабайт)
*/
(function (global) {
  'use strict';

  const LS_SETTINGS = 'avito_settings_v1';
  const LS_HISTORY  = 'avito_history_v1';
  const LS_LAST_ID  = 'avito_last_id_v1';

  // ---------- Settings ----------
  function loadSettings() {
    try {
      return JSON.parse(localStorage.getItem(LS_SETTINGS) || '{}');
    } catch (_) { return {}; }
  }
  function saveSettings(s) {
    localStorage.setItem(LS_SETTINGS, JSON.stringify(s));
  }

  // ---------- History (легковесные карточки) ----------
  function loadHistory() {
    try { return JSON.parse(localStorage.getItem(LS_HISTORY) || '[]'); }
    catch (_) { return []; }
  }
  function pushHistory(item) {
    const list = loadHistory();
    list.unshift(item);
    while (list.length > 20) list.pop();
    localStorage.setItem(LS_HISTORY, JSON.stringify(list));
  }
  function setLastDatasetId(id) { localStorage.setItem(LS_LAST_ID, id); }
  function getLastDatasetId()    { return localStorage.getItem(LS_LAST_ID); }

  // ---------- IndexedDB ----------
  const DB_NAME = 'avito_analytics';
  const DB_VER  = 1;
  const STORE   = 'datasets';

  function openDB() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VER);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE)) {
          db.createObjectStore(STORE, { keyPath: 'id' });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror   = () => reject(req.error);
    });
  }

  async function putDataset(dataset) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put(dataset);
      tx.oncomplete = () => resolve();
      tx.onerror    = () => reject(tx.error);
    });
  }
  async function getDataset(id) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly');
      const r  = tx.objectStore(STORE).get(id);
      r.onsuccess = () => resolve(r.result || null);
      r.onerror   = () => reject(r.error);
    });
  }
  async function deleteDataset(id) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror    = () => reject(tx.error);
    });
  }
  async function listDatasets() {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly');
      const out = [];
      tx.objectStore(STORE).openCursor().onsuccess = (e) => {
        const cur = e.target.result;
        if (cur) { out.push({ id: cur.value.id, fileName: cur.value.fileName, addedAt: cur.value.addedAt, rowCount: cur.value.rowCount }); cur.continue(); }
        else resolve(out);
      };
      tx.onerror = () => reject(tx.error);
    });
  }
  async function clearAll() {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).clear();
      tx.oncomplete = () => resolve();
      tx.onerror    = () => reject(tx.error);
    });
  }

  global.AvitoStorage = {
    loadSettings, saveSettings,
    loadHistory, pushHistory,
    setLastDatasetId, getLastDatasetId,
    putDataset, getDataset, deleteDataset, listDatasets, clearAll,
  };
})(window);
