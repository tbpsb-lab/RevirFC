import { doc, setDoc, onSnapshot, collection, getDocs, writeBatch } from 'firebase/firestore';
import { db, isFirebaseConfigured } from './firebase';
import { Player, Match, PlayerScoutingEntry } from '../types';

const PLAYERS_COLLECTION = 'players';
const APP_STATE_COLLECTION = 'app_state';

// Firestore document limit: 1 MiB.
// We target < 150 KB for compressed photo base64 to stay safe with the rest of the player doc.
const MAX_PHOTO_DIMENSION = 300; // px — portrait crop at 300x380 is plenty for the card UI
const PHOTO_QUALITY = 0.72;      // WebP quality: 0.72 is visually indistinguishable from lossless for portraits
const MAX_FIRESTORE_PHOTO_BYTES = 150_000; // 150 KB hard cap

/**
 * Checks if a string is a base64 Data URL (from file upload or AI dekupaj)
 */
export const isDataUrl = (url?: string): boolean =>
  Boolean(url && url.startsWith('data:image/'));

/**
 * Compresses a base64 Data URL using the browser Canvas API.
 * - Resizes to fit within MAX_PHOTO_DIMENSION on the longest side
 * - Converts to WebP at PHOTO_QUALITY
 * - Falls back to the original if Canvas is unavailable or compression fails
 */
export async function compressPhotoForFirestore(dataUrl: string): Promise<string> {
  return new Promise((resolve) => {
    try {
      const img = new Image();
      img.onload = () => {
        try {
          // Calculate new dimensions preserving aspect ratio
          let { width, height } = img;
          if (width > MAX_PHOTO_DIMENSION || height > MAX_PHOTO_DIMENSION) {
            const ratio = Math.min(MAX_PHOTO_DIMENSION / width, MAX_PHOTO_DIMENSION / height);
            width = Math.round(width * ratio);
            height = Math.round(height * ratio);
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(dataUrl);
            return;
          }

          // Transparent background (for AI-dekupajed PNGs)
          ctx.clearRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);

          // Try WebP first (smaller), fall back to PNG for browsers without WebP support
          let compressed = canvas.toDataURL('image/webp', PHOTO_QUALITY);
          if (!compressed.startsWith('data:image/webp')) {
            // Safari < 16 doesn't support WebP encoding — fall back to JPEG (lossy but tiny)
            compressed = canvas.toDataURL('image/jpeg', PHOTO_QUALITY);
          }

          // Safety check: if still too big, reduce quality further
          if (compressed.length > MAX_FIRESTORE_PHOTO_BYTES * 1.37) {
            // base64 is ~37% larger than binary
            compressed = canvas.toDataURL('image/jpeg', 0.5);
          }

          console.info(
            `📷 Photo compressed: ${Math.round(dataUrl.length / 1024)}KB → ${Math.round(compressed.length / 1024)}KB`
          );
          resolve(compressed);
        } catch {
          resolve(dataUrl);
        }
      };
      img.onerror = () => resolve(dataUrl);
      img.src = dataUrl;
    } catch {
      resolve(dataUrl);
    }
  });
}

/**
 * Saves a single player to Firestore.
 * If photoUrl is a base64 Data URL (new upload or AI dekupaj), it is compressed first
 * and stored directly inside the Firestore document — no Firebase Storage needed!
 *
 * All clients subscribed via subscribeToPlayers() receive the update in real time.
 */
export async function savePlayerToCloud(player: Player): Promise<Player> {
  let finalPlayer = { ...player };

  // Compress the photo and store it directly in Firestore (no Storage bucket needed)
  if (isDataUrl(finalPlayer.photoUrl)) {
    try {
      const compressed = await compressPhotoForFirestore(finalPlayer.photoUrl);
      finalPlayer.photoUrl = compressed;
      console.info(`✅ Photo compressed and ready for Firestore (${Math.round(compressed.length / 1024)} KB)`);
    } catch (e) {
      console.warn('Photo compression warning, using original:', e);
    }
  }

  if (isFirebaseConfigured && db) {
    try {
      const playerDocRef = doc(db, PLAYERS_COLLECTION, finalPlayer.id);
      await setDoc(playerDocRef, finalPlayer, { merge: true });
      console.info(`✅ Player "${finalPlayer.name}" saved to Firestore (photo embedded)`);
    } catch (error) {
      console.error(`Firestore save error for player ${finalPlayer.name}:`, error);
    }
  }

  return finalPlayer;
}

/**
 * Batch seeds initial 22 players to Firestore if the collection is empty.
 * Only runs once on first ever app open (or after clearing Firestore).
 */
export async function seedPlayersIfEmpty(initialPlayers: Player[]): Promise<void> {
  if (!isFirebaseConfigured || !db) return;

  try {
    const snap = await getDocs(collection(db, PLAYERS_COLLECTION));
    if (snap.empty) {
      console.info('🌱 Seeding initial 22 players to Firestore...');
      const batch = writeBatch(db);
      for (const p of initialPlayers) {
        const ref = doc(db, PLAYERS_COLLECTION, p.id);
        batch.set(ref, p);
      }
      await batch.commit();
      console.info('✅ 22 players seeded to Firestore successfully.');
    }
  } catch (error) {
    console.warn('Firestore seeding skipped (insufficient permissions or already seeded):', error);
  }
}

/**
 * Real-time subscription to the players collection.
 * When ANY user saves a card change (photo, nickname, position, theme, badges…),
 * ALL active clients receive the update INSTANTLY via Firestore's real-time push.
 */
export function subscribeToPlayers(
  onUpdate: (players: Player[]) => void,
  onError?: (err: Error) => void
): () => void {
  if (!isFirebaseConfigured || !db) {
    console.info('Firestore not configured — running in local-only mode.');
    return () => {};
  }

  try {
    const colRef = collection(db, PLAYERS_COLLECTION);
    const unsubscribe = onSnapshot(
      colRef,
      (snapshot) => {
        if (!snapshot.empty) {
          const players: Player[] = [];
          snapshot.forEach((d) => players.push(d.data() as Player));
          onUpdate(players);
        }
      },
      (error) => {
        console.warn('Firestore real-time listener error:', error);
        onError?.(error);
      }
    );
    return unsubscribe;
  } catch (err) {
    console.error('Failed to attach Firestore players listener:', err);
    return () => {};
  }
}

/**
 * Saves current match state to Firestore (shared across all clients)
 */
export async function saveMatchToCloud(match: Match): Promise<void> {
  if (!isFirebaseConfigured || !db) return;
  try {
    const matchDocRef = doc(db, APP_STATE_COLLECTION, 'current_match');
    await setDoc(matchDocRef, match, { merge: true });
  } catch (err) {
    console.error('Failed to save match to cloud:', err);
  }
}

/**
 * Saves scouting entries to Firestore (shared across kurul members)
 */
export async function saveScoutingToCloud(entries: PlayerScoutingEntry[]): Promise<void> {
  if (!isFirebaseConfigured || !db) return;
  try {
    const scoutingDocRef = doc(db, APP_STATE_COLLECTION, 'scouting_entries');
    await setDoc(scoutingDocRef, { entries, updatedAt: Date.now() }, { merge: true });
  } catch (err) {
    console.error('Failed to save scouting entries to cloud:', err);
  }
}
