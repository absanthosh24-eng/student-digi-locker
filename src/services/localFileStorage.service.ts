export interface StorageInfo {
  quota: number;
  usage: number;
  available: number;
  supported: boolean;
}

const DB_NAME = 'StudentDigitalLockerDB';
const STORE_NAME = 'files';
const DB_VERSION = 1;

function getDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB is not supported in this environment.'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(new Error('Failed to open IndexedDB.'));
    };
  });
}

export async function getStorageInfo(): Promise<StorageInfo> {
  if (navigator.storage && navigator.storage.estimate) {
    try {
      const estimate = await navigator.storage.estimate();
      const quota = estimate.quota || 0;
      const usage = estimate.usage || 0;
      return {
        quota,
        usage,
        available: Math.max(0, quota - usage),
        supported: true,
      };
    } catch (err) {
      console.error('Storage estimation failed:', err);
    }
  }
  return {
    quota: 5368709120, // 5GB fallback
    usage: 0,
    available: 5368709120,
    supported: false,
  };
}

export async function saveLocalFile(fileId: string, file: Blob | File): Promise<void> {
  const info = await getStorageInfo();
  if (info.supported && file.size > info.available) {
    throw new Error('Not enough storage available on this device for this file.');
  }

  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.put(file, fileId);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(new Error('Failed to save file to local storage.'));
  });
}

export async function getLocalFile(fileId: string): Promise<Blob | File> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.get(fileId);

    request.onsuccess = () => {
      if (request.result) {
        resolve(request.result);
      } else {
        reject(new Error('File not found on this device.'));
      }
    };
    request.onerror = () => reject(new Error('Failed to retrieve file from local storage.'));
  });
}

export async function checkLocalFileExists(fileId: string): Promise<boolean> {
  try {
    const db = await getDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.get(fileId);

      request.onsuccess = () => {
        resolve(!!request.result);
      };
      request.onerror = () => resolve(false);
    });
  } catch {
    return false;
  }
}

export async function deleteLocalFile(fileId: string): Promise<void> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.delete(fileId);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error('Failed to delete file from local storage.'));
    });
  } catch (err) {
    console.error('deleteLocalFile error:', err);
  }
}
