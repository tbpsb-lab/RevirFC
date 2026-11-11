/**
 * Büyük görselleri (base64 Data URL) IndexedDB'de saklar.
 *
 * localStorage kotası (~5 MB) birkaç fotoğrafla dolduğu için oyuncu verisi kaydedilemiyordu.
 * Artık localStorage'daki JSON'da görsel yerine kısa bir referans ("idb:<anahtar>") tutulur;
 * gerçek görsel burada durur ve açılışta geri yüklenir (hydrate).
 */
const DB_NAME = 'revirfc-media';
const STORE = 'images';
export const IDB_PREFIX = 'idb:';

export const isIdbRef = (url?: string): url is string => !!url && url.startsWith(IDB_PREFIX);
const isDataUrl = (url?: string): url is string => !!url && url.startsWith('data:');

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      if (typeof indexedDB === 'undefined') {
        reject(new Error('IndexedDB desteklenmiyor'));
        return;
      }
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    dbPromise.catch(() => {
      dbPromise = null;
    });
  }
  return dbPromise;
}

async function putImage(key: string, dataUrl: string): Promise<boolean> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put(dataUrl, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
    return true;
  } catch (err) {
    console.error('IndexedDB görsel yazımı başarısız:', err);
    return false;
  }
}

async function getImage(key: string): Promise<string | undefined> {
  try {
    const db = await openDb();
    return await new Promise<string | undefined>((resolve, reject) => {
      const req = db.transaction(STORE, 'readonly').objectStore(STORE).get(key);
      req.onsuccess = () => resolve(req.result as string | undefined);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.error('IndexedDB görsel okuma başarısız:', err);
    return undefined;
  }
}

// Aynı görseli her state değişiminde yeniden yazmamak için son yazılan değer
const lastWritten = new Map<string, string>();

interface Accessor<T> {
  prefix: string;
  keyOf: (item: T) => string;
  get: (item: T) => string | undefined;
  set: (item: T, url: string) => T;
}

/**
 * Data URL görselleri IndexedDB'ye yazar ve localStorage'a gidecek "hafif" kopyayı döner.
 * IndexedDB yazımı başarısız olursa o görsel olduğu gibi bırakılır (veri kaybı olmaz).
 */
export async function externalizeImages<T>(items: T[], acc: Accessor<T>): Promise<T[]> {
  return Promise.all(
    items.map(async (item) => {
      const url = acc.get(item);
      if (!isDataUrl(url)) return item;
      const key = `${acc.prefix}:${acc.keyOf(item)}`;
      if (lastWritten.get(key) !== url) {
        const ok = await putImage(key, url);
        if (!ok) return item;
        lastWritten.set(key, url);
      }
      return acc.set(item, IDB_PREFIX + key);
    })
  );
}

/** "idb:" referanslarını gerçek Data URL'lerle değiştirir. Bulunamayanlar için fallback kullanılabilir. */
export async function hydrateImages<T>(
  items: T[],
  acc: Pick<Accessor<T>, 'get' | 'set'>,
  fallback?: string
): Promise<T[]> {
  return Promise.all(
    items.map(async (item) => {
      const url = acc.get(item);
      if (!isIdbRef(url)) return item;
      const data = await getImage(url.slice(IDB_PREFIX.length));
      if (data) {
        lastWritten.set(url.slice(IDB_PREFIX.length), data);
        return acc.set(item, data);
      }
      return fallback ? acc.set(item, fallback) : item;
    })
  );
}
