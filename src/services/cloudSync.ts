import { doc, getDoc, setDoc, onSnapshot, collection, getDocs, writeBatch } from 'firebase/firestore';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import { db, storage, isFirebaseConfigured } from './firebase';
import { Player, Match, PlayerScoutingEntry } from '../types';

const PLAYERS_COLLECTION = 'players';
const APP_STATE_COLLECTION = 'app_state';

/**
 * Checks if a string is a base64 Data URL (e.g. from file upload or AI background removal)
 */
export const isDataUrl = (url?: string): boolean => {
  return Boolean(url && url.startsWith('data:image/'));
};

/**
 * Uploads a base64 Data URL image to Firebase Storage and returns the public HTTPS download URL.
 * If Firebase is not configured or upload fails, falls back gracefully to the original dataUrl.
 */
export async function uploadPlayerPhotoToStorage(playerId: string, dataUrl: string): Promise<string> {
  if (!isFirebaseConfigured || !storage) {
    console.warn('Firebase Storage not configured, skipping cloud image upload');
    return dataUrl;
  }

  try {
    const timestamp = Date.now();
    // Path: avatars/{playerId}_{timestamp}.png
    const storageRef = ref(storage, `avatars/${playerId}_${timestamp}.png`);
    
    // uploadString with data_url format handles transparent PNGs from AI background removal
    const uploadResult = await uploadString(storageRef, dataUrl, 'data_url', {
      contentType: 'image/png',
      cacheControl: 'public,max-age=31536000',
    });

    const downloadUrl = await getDownloadURL(uploadResult.ref);
    console.info(`✅ Photo uploaded to Firebase Storage for player ${playerId}:`, downloadUrl);
    return downloadUrl;
  } catch (error) {
    console.error('Firebase Storage upload error:', error);
    // Graceful fallback: return original data URL so local experience isn't broken
    return dataUrl;
  }
}

/**
 * Saves a single player to Firestore.
 * If photoUrl is a base64 Data URL, it first uploads it to Firebase Storage.
 */
export async function savePlayerToCloud(player: Player): Promise<Player> {
  let finalPlayer = { ...player };

  // If the photo was changed/dekupajed (base64 Data URL), upload to Storage first
  if (isDataUrl(finalPlayer.photoUrl)) {
    try {
      const cloudUrl = await uploadPlayerPhotoToStorage(finalPlayer.id, finalPlayer.photoUrl);
      finalPlayer.photoUrl = cloudUrl;
    } catch (e) {
      console.error('Failed to upload player image to storage before firestore save:', e);
    }
  }

  if (isFirebaseConfigured && db) {
    try {
      const playerDocRef = doc(db, PLAYERS_COLLECTION, finalPlayer.id);
      await setDoc(playerDocRef, finalPlayer, { merge: true });
      console.info(`✅ Player ${finalPlayer.name} saved to Firestore`);
    } catch (error) {
      console.error(`Firestore save error for player ${finalPlayer.name}:`, error);
    }
  }

  return finalPlayer;
}

/**
 * Batch saves initial players to Firestore if the collection is empty.
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
      console.info('✅ Initial players successfully seeded to Firestore.');
    }
  } catch (error) {
    console.warn('Seeding check failed or not permitted:', error);
  }
}

/**
 * Real-time subscription to players collection.
 * When ANY user updates a player in Firestore, all active clients receive the update instantly.
 */
export function subscribeToPlayers(
  onUpdate: (players: Player[]) => void,
  onError?: (err: Error) => void
): () => void {
  if (!isFirebaseConfigured || !db) {
    return () => {};
  }

  try {
    const colRef = collection(db, PLAYERS_COLLECTION);
    const unsubscribe = onSnapshot(
      colRef,
      (snapshot) => {
        if (!snapshot.empty) {
          const playersList: Player[] = [];
          snapshot.forEach((d) => {
            playersList.push(d.data() as Player);
          });
          onUpdate(playersList);
        }
      },
      (error) => {
        console.warn('Firestore players snapshot listener warning:', error);
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
 * Saves shared match state to Firestore
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
 * Saves shared scouting entries to Firestore
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
