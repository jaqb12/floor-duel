// localStorage (players, settings) + IndexedDB (folder handle).
(function () {
  'use strict';
  window.Floor = window.Floor || {};
  const L = Floor.logic;

  const STATE_KEY = 'thefloor.v1';
  const CORRUPT_KEY = 'thefloor.v1.corrupt';

  // Always returns a valid { players, settings, warning }; warning is { key, params } for Floor.i18n or null.
  function loadState() {
    let raw;
    try {
      raw = localStorage.getItem(STATE_KEY);
    } catch (e) {
      console.error(e);
      return Object.assign(L.sanitizeState(null), { warning: { key: 'storage.blocked' } });
    }
    if (raw === null) return Object.assign(L.sanitizeState(null), { warning: null });
    try {
      return Object.assign(L.sanitizeState(JSON.parse(raw)), { warning: null });
    } catch (e) {
      console.error('Stored data is corrupt', e);
      try { localStorage.setItem(CORRUPT_KEY, raw); } catch (_) { /* nothing more to do */ }
      return Object.assign(L.sanitizeState(null), {
        warning: { key: 'storage.corrupt', params: { key: CORRUPT_KEY } },
      });
    }
  }

  function saveState(state) {
    try {
      localStorage.setItem(STATE_KEY, JSON.stringify({ players: state.players, settings: state.settings }));
      return true;
    } catch (e) {
      console.error(e);
      return false;
    }
  }

  const DB_NAME = 'thefloor';
  const STORE = 'handles';
  const ROOT_KEY = 'root';

  function openDb() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async function withStore(mode, fn) {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, mode);
      const req = fn(tx.objectStore(STORE));
      tx.oncomplete = () => { db.close(); resolve(req.result); };
      tx.onerror = () => { db.close(); reject(tx.error); };
    });
  }

  Floor.storage = {
    loadState,
    saveState,
    saveRootHandle: handle => withStore('readwrite', s => s.put(handle, ROOT_KEY)),
    loadRootHandle: () => withStore('readonly', s => s.get(ROOT_KEY)).then(h => h || null),
  };
})();
