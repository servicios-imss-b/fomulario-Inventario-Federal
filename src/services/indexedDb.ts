import { DatosUsuario, RespuestaItem, ArchivoAdjunto } from '../types/form';

const DB_NAME = 'inegi_inventario_federal_db';
const DB_VERSION = 1;

let dbPromise: Promise<IDBDatabase> | null = null;

function getDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB no está disponible en este entorno'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      if (!db.objectStoreNames.contains('respuestas')) {
        db.createObjectStore('respuestas', { keyPath: 'preguntaId' });
      }

      if (!db.objectStoreNames.contains('datosUsuario')) {
        db.createObjectStore('datosUsuario', { keyPath: 'id' });
      }

      if (!db.objectStoreNames.contains('archivos')) {
        db.createObjectStore('archivos', { keyPath: 'id' });
      }

      if (!db.objectStoreNames.contains('colaSincronizacion')) {
        db.createObjectStore('colaSincronizacion', {
          keyPath: 'id',
          autoIncrement: true,
        });
      }

      if (!db.objectStoreNames.contains('metaFormulario')) {
        db.createObjectStore('metaFormulario', { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

  return dbPromise;
}

export async function saveRespuestaLocal(respuesta: RespuestaItem): Promise<void> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('respuestas', 'readwrite');
      const store = tx.objectStore('respuestas');
      const req = store.put(respuesta);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('Fallback guardado local en localStorage', err);
    try {
      const existing = JSON.parse(localStorage.getItem('inegi_respuestas') || '{}');
      existing[respuesta.preguntaId] = respuesta;
      localStorage.setItem('inegi_respuestas', JSON.stringify(existing));
    } catch (e) {
      // ignore
    }
  }
}

export async function getAllRespuestasLocal(): Promise<Record<string, RespuestaItem>> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('respuestas', 'readonly');
      const store = tx.objectStore('respuestas');
      const req = store.getAll();
      req.onsuccess = () => {
        const list: RespuestaItem[] = req.result || [];
        const map: Record<string, RespuestaItem> = {};
        for (const item of list) {
          map[item.preguntaId] = item;
        }
        resolve(map);
      };
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    try {
      return JSON.parse(localStorage.getItem('inegi_respuestas') || '{}');
    } catch {
      return {};
    }
  }
}

export async function saveDatosUsuarioLocal(datos: DatosUsuario): Promise<void> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('datosUsuario', 'readwrite');
      const store = tx.objectStore('datosUsuario');
      const req = store.put({ id: 'current_user', ...datos });
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    localStorage.setItem('inegi_usuario', JSON.stringify(datos));
  }
}

export async function getDatosUsuarioLocal(): Promise<DatosUsuario | null> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('datosUsuario', 'readonly');
      const store = tx.objectStore('datosUsuario');
      const req = store.get('current_user');
      req.onsuccess = () => {
        if (req.result) {
          const { id, ...data } = req.result;
          resolve(data as DatosUsuario);
        } else {
          resolve(null);
        }
      };
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    try {
      const raw = localStorage.getItem('inegi_usuario');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }
}

export async function saveArchivoLocal(archivo: ArchivoAdjunto): Promise<void> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('archivos', 'readwrite');
      const store = tx.objectStore('archivos');
      const req = store.put(archivo);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    // Large files may exceed localStorage limit, handled gracefully
  }
}

export async function getArchivosLocal(): Promise<ArchivoAdjunto[]> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('archivos', 'readonly');
      const store = tx.objectStore('archivos');
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    return [];
  }
}

export async function deleteArchivoLocal(id: string): Promise<void> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('archivos', 'readwrite');
      const store = tx.objectStore('archivos');
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    // ignore
  }
}

export async function saveMetaFormulario(data: any): Promise<void> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('metaFormulario', 'readwrite');
      const store = tx.objectStore('metaFormulario');
      const req = store.put({ id: 'form_state', ...data, updatedAt: new Date().toISOString() });
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch {
    localStorage.setItem('inegi_meta', JSON.stringify(data));
  }
}

export async function getMetaFormulario(): Promise<any> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('metaFormulario', 'readonly');
      const store = tx.objectStore('metaFormulario');
      const req = store.get('form_state');
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  } catch {
    try {
      const raw = localStorage.getItem('inegi_meta');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }
}

export async function enqueueSync(item: { tipo: string; payload: any; fecha: string }): Promise<void> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('colaSincronizacion', 'readwrite');
      const store = tx.objectStore('colaSincronizacion');
      const req = store.add(item);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('No se pudo encolar sync en IndexedDB', err);
  }
}

export async function getSyncQueue(): Promise<Array<{ id: number; tipo: string; payload: any; fecha: string }>> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('colaSincronizacion', 'readonly');
      const store = tx.objectStore('colaSincronizacion');
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return [];
  }
}

export async function removeSyncItem(id: number): Promise<void> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('colaSincronizacion', 'readwrite');
      const store = tx.objectStore('colaSincronizacion');
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch {
    // ignore
  }
}

export async function clearAllLocalData(): Promise<void> {
  try {
    const db = await getDB();
    const stores = ['respuestas', 'datosUsuario', 'archivos', 'colaSincronizacion', 'metaFormulario'];
    for (const storeName of stores) {
      const tx = db.transaction(storeName, 'readwrite');
      tx.objectStore(storeName).clear();
    }
    localStorage.removeItem('inegi_respuestas');
    localStorage.removeItem('inegi_usuario');
    localStorage.removeItem('inegi_meta');
  } catch {
    // ignore
  }
}
