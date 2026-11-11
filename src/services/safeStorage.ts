/**
 * localStorage'a güvenli yazım. Kota (QuotaExceededError) aşıldığında istisna fırlatıp
 * React ağacını çökertmek yerine hatayı yakalar, kullanıcıya görünür bir uyarı için
 * `revirfc:storage-error` olayı yayınlar ve false döner.
 */
export const STORAGE_ERROR_EVENT = 'revirfc:storage-error';

export function safeSetItem(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (err) {
    console.error(`localStorage yazımı başarısız (${key}):`, err);
    window.dispatchEvent(new CustomEvent(STORAGE_ERROR_EVENT, { detail: { key } }));
    return false;
  }
}
