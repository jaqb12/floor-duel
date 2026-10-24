// localStorage (players, settings — phase 3) + IndexedDB (folder handle).
(function () {
  'use strict';
  window.Floor = window.Floor || {};

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
    saveRootHandle: handle => withStore('readwrite', s => s.put(handle, ROOT_KEY)),
    loadRootHandle: () => withStore('readonly', s => s.get(ROOT_KEY)).then(h => h || null),
  };
})();
