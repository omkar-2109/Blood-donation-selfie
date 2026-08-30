/**
 * Client-Side Offline Storage (IndexedDB + LocalStorage fallback)
 * Ensures that visitor submissions and photos are NEVER lost, even when deployed
 * to static hosts like Netlify / Vercel without a Node server.
 */

const DB_NAME = 'SNCF_Selfie_Kiosk_DB';
const DB_VERSION = 1;
const STORE_NAME = 'submissions';

function openDB() {
  return new Promise((resolve, reject) => {
    if (!window.indexedDB) {
      resolve(null);
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = (e) => resolve(e.target.result);
    request.onerror = () => resolve(null);
  });
}

export async function saveOfflineSubmission(submission) {
  try {
    const db = await openDB();
    if (db) {
      return new Promise((resolve) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        store.put(submission);
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => resolve(false);
      });
    } else {
      // LocalStorage fallback (without large image to avoid quota)
      const existing = JSON.parse(localStorage.getItem('sncf_submissions') || '[]');
      existing.unshift(submission);
      localStorage.setItem('sncf_submissions', JSON.stringify(existing.slice(0, 50)));
      return true;
    }
  } catch (err) {
    console.warn('Offline save error:', err);
    return false;
  }
}

export async function getOfflineSubmissions() {
  try {
    const db = await openDB();
    if (db) {
      return new Promise((resolve) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => resolve([]);
      });
    } else {
      return JSON.parse(localStorage.getItem('sncf_submissions') || '[]');
    }
  } catch (err) {
    console.warn('Offline read error:', err);
    return [];
  }
}

export async function deleteOfflineSubmission(id) {
  try {
    const db = await openDB();
    if (db) {
      return new Promise((resolve) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        store.delete(id);
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => resolve(false);
      });
    } else {
      const existing = JSON.parse(localStorage.getItem('sncf_submissions') || '[]');
      const filtered = existing.filter((s) => s.id !== id);
      localStorage.setItem('sncf_submissions', JSON.stringify(filtered));
      return true;
    }
  } catch {
    return false;
  }
}
