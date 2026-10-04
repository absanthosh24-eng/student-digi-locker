export function get(key: string) {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('sdl-storage', 1)
    req.onupgradeneeded = () => req.result.createObjectStore('keyval')
    req.onsuccess = () => {
      const db = req.result
      const tx = db.transaction('keyval', 'readonly')
      const store = tx.objectStore('keyval')
      const getReq = store.get(key)
      getReq.onsuccess = () => resolve(getReq.result)
      getReq.onerror = () => reject(getReq.error)
    }
    req.onerror = () => reject(req.error)
  })
}

export function set(key: string, val: any) {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('sdl-storage', 1)
    req.onupgradeneeded = () => req.result.createObjectStore('keyval')
    req.onsuccess = () => {
      const db = req.result
      const tx = db.transaction('keyval', 'readwrite')
      const store = tx.objectStore('keyval')
      store.put(val, key)
      tx.oncomplete = () => resolve(true)
      tx.onerror = () => reject(tx.error)
    }
    req.onerror = () => reject(req.error)
  })
}

export function del(key: string) {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('sdl-storage', 1)
    req.onupgradeneeded = () => req.result.createObjectStore('keyval')
    req.onsuccess = () => {
      const db = req.result
      const tx = db.transaction('keyval', 'readwrite')
      const store = tx.objectStore('keyval')
      store.delete(key)
      tx.oncomplete = () => resolve(true)
      tx.onerror = () => reject(tx.error)
    }
    req.onerror = () => reject(req.error)
  })
}
