import { doc, getDoc, setDoc, onSnapshot, collection, getDocs, writeBatch, deleteDoc, deleteField, runTransaction } from 'firebase/firestore';
import { db, auth, isFirebaseConfigured } from './firebase';
import {
  Player,
  Match,
  MatchSquad,
  PlayerScoutingEntry,
  UserProfile,
  InviteToken,
  LockerPost,
  PhotoArchiveItem,
  DessertDebt,
  CURRENT_STATS_SYNC_VERSION,
} from '../types';
import { isIdbRef, resolveIdbUrl } from './photoStore';

const PLAYERS_COLLECTION = 'players';
const USERS_COLLECTION = 'users';
const APP_STATE_COLLECTION = 'app_state';
const INVITES_COLLECTION = 'invites';
const PHOTOS_COLLECTION = 'photos';

// Sandbox Mode Lock: when active, no Firestore reads/snapshots or writes touch real cloud data.
let sandboxModeActive = false;

export function setCloudSandboxMode(active: boolean): void {
  sandboxModeActive = active;
}

export function isCloudSandboxMode(): boolean {
  return sandboxModeActive;
}

// Firestore document limit: 1 MiB.
// 960px long edge gives ~3x Retina sharpness for FCCard (288x386px) & zoom headroom while keeping WebP portraits ~55-180 KB.
const MAX_PHOTO_DIMENSION = 960;
const PHOTO_QUALITY = 0.90;
const MAX_FIRESTORE_PHOTO_BYTES = 240_000; // 240 KB hard cap well below Firestore 1 MiB doc limit

/**
 * Recursively strips `undefined` fields because Firestore throws on explicit `undefined`.
 */
function stripUndefined<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => stripUndefined(item)) as unknown as T;
  }
  if (value !== null && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (v !== undefined) {
        out[k] = stripUndefined(v);
      }
    }
    return out as T;
  }
  return value;
}

/**
 * Checks if a string is a base64 Data URL (from file upload or AI dekupaj)
 */
export const isDataUrl = (url?: string): boolean =>
  Boolean(url && url.startsWith('data:image/'));

/**
 * Compresses a base64 Data URL using the browser Canvas API.
 * - Resizes to fit within maxDimension on the longest side with high-quality smoothing
 * - Converts to WebP preserving transparency and sharpness
 * - Gradually reduces quality / 640px WebP fallback only if exceeding Firestore budget
 */
export async function compressPhotoForFirestore(
  dataUrl: string,
  opts?: { maxDimension?: number; quality?: number; maxBytes?: number }
): Promise<string> {
  const targetMaxDimension = opts?.maxDimension ?? MAX_PHOTO_DIMENSION;
  const targetQuality = opts?.quality ?? PHOTO_QUALITY;
  const targetMaxBytes = opts?.maxBytes ?? MAX_FIRESTORE_PHOTO_BYTES;

  return new Promise((resolve) => {
    try {
      const img = new Image();
      img.onload = () => {
        try {
          const maxDataUrlChars = targetMaxBytes * 1.37;
          // Avoid double-compression loss when uploaded/AI-dekupe WebP or PNG is already within bounds
          const isLosslessOrWebp =
            dataUrl.startsWith('data:image/webp') || dataUrl.startsWith('data:image/png');
          if (
            isLosslessOrWebp &&
            img.width <= targetMaxDimension &&
            img.height <= targetMaxDimension &&
            dataUrl.length <= maxDataUrlChars
          ) {
            resolve(dataUrl);
            return;
          }

          let { width, height } = img;
          if (width > targetMaxDimension || height > targetMaxDimension) {
            const ratio = Math.min(targetMaxDimension / width, targetMaxDimension / height);
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

          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.clearRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);

          let compressed = canvas.toDataURL('image/webp', targetQuality);
          const supportsWebp = compressed.startsWith('data:image/webp');
          // IMPORTANT: Never convert transparent portraits to image/jpeg (which turns alpha into solid black!).
          if (!supportsWebp) {
            compressed = canvas.toDataURL('image/png');
          }

          if (compressed.length > maxDataUrlChars && supportsWebp) {
            compressed = canvas.toDataURL('image/webp', Math.max(0.76, targetQuality - 0.08));
          }

          if (compressed.length > maxDataUrlChars) {
            const fallbackSide = supportsWebp ? 760 : 520;
            if (width > fallbackSide || height > fallbackSide) {
              const fallbackRatio = Math.min(fallbackSide / width, fallbackSide / height);
              const fw = Math.round(width * fallbackRatio);
              const fh = Math.round(height * fallbackRatio);
              const fallbackCanvas = document.createElement('canvas');
              fallbackCanvas.width = fw;
              fallbackCanvas.height = fh;
              const fctx = fallbackCanvas.getContext('2d');
              if (fctx) {
                fctx.imageSmoothingEnabled = true;
                fctx.imageSmoothingQuality = 'high';
                fctx.clearRect(0, 0, fw, fh);
                fctx.drawImage(img, 0, 0, fw, fh);
                compressed = supportsWebp
                  ? fallbackCanvas.toDataURL('image/webp', Math.max(0.70, targetQuality - 0.14))
                  : fallbackCanvas.toDataURL('image/png');
              } else {
                compressed = supportsWebp
                  ? canvas.toDataURL('image/webp', Math.max(0.70, targetQuality - 0.14))
                  : canvas.toDataURL('image/png');
              }
            } else if (supportsWebp) {
              compressed = canvas.toDataURL('image/webp', Math.max(0.70, targetQuality - 0.14));
            }
          }

          console.info(
            `📷 Photo compressed (${width}x${height}): ${Math.round(dataUrl.length / 1024)}KB → ${Math.round(compressed.length / 1024)}KB`
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

// ============================================================
// USER SYNC (Firestore users/{uid})
// ============================================================

export async function getUserFromCloud(uid: string): Promise<UserProfile | null> {
  if (!isFirebaseConfigured || !db) return null;
  try {
    const snap = await getDoc(doc(db, USERS_COLLECTION, uid));
    return snap.exists() ? (snap.data() as UserProfile) : null;
  } catch (err) {
    console.warn('Firestore user read warning:', err);
    return null;
  }
}

export async function syncUserToCloud(user: UserProfile): Promise<void> {
  if (sandboxModeActive) return;
  if (!isFirebaseConfigured || !db) return;
  try {
    const clean = stripUndefined(user);
    await setDoc(doc(db, USERS_COLLECTION, user.uid), clean, { merge: true });
    console.info(`✅ User "${user.email}" synced to Firestore (${user.role} / ${user.status})`);
  } catch (err) {
    console.warn('Firestore user sync warning:', err);
  }
}

export async function deleteUserFromCloud(uid: string): Promise<void> {
  if (sandboxModeActive) return;
  if (!isFirebaseConfigured || !db) return;
  try {
    await deleteDoc(doc(db, USERS_COLLECTION, uid));
  } catch (err) {
    console.warn('Firestore user delete warning:', err);
  }
}

export function subscribeToUsers(onUpdate: (users: UserProfile[]) => void): () => void {
  if (!isFirebaseConfigured || !db) return () => {};
  try {
    return onSnapshot(
      collection(db, USERS_COLLECTION),
      (snapshot) => {
        if (sandboxModeActive) return;
        if (!snapshot.empty) {
          const list: UserProfile[] = [];
          snapshot.forEach((d) => list.push(d.data() as UserProfile));
          onUpdate(list);
        }
      },
      (err) => {
        console.warn('Firestore users listener warning:', err);
      }
    );
  } catch {
    return () => {};
  }
}

// ============================================================
// PLAYERS SYNC (Firestore players/{playerId})
// ============================================================

async function preparePlayerForCloud(player: Player): Promise<Player> {
  let finalPlayer = { ...player };

  if (isIdbRef(finalPlayer.photoUrl)) {
    try {
      const resolved = await resolveIdbUrl(finalPlayer.photoUrl);
      finalPlayer.photoUrl = resolved || '/players/alper.png';
    } catch {
      finalPlayer.photoUrl = '/players/alper.png';
    }
  }

  if (isDataUrl(finalPlayer.photoUrl)) {
    try {
      const compressed = await compressPhotoForFirestore(finalPlayer.photoUrl);
      finalPlayer.photoUrl = compressed;
      console.info(`✅ Photo compressed and ready for Firestore (${Math.round(compressed.length / 1024)} KB)`);
    } catch (e) {
      console.warn('Photo compression warning, using original:', e);
    }
  }

  return stripUndefined(finalPlayer);
}

/**
 * Saves a single player to Firestore.
 * Resolves idb: refs and compresses base64 Data URLs before writing.
 * Uses deleteField() for cleared optional fields so merge:true removes stale values.
 */
function buildPlayerFirestorePayload(
  finalPlayer: Player,
  options?: { protectRestrictedFields?: boolean }
): Record<string, unknown> {
  const payload: Record<string, unknown> = { ...finalPlayer };
  if (!finalPlayer.pendingNickname) {
    payload.pendingNickname = deleteField();
  }
  if (finalPlayer.inFormAwardedAt === undefined) {
    payload.inFormAwardedAt = deleteField();
  }
  if (finalPlayer.secondaryPositions === undefined) {
    payload.secondaryPositions = deleteField();
  }
  if (finalPlayer.ownPlaystyle === undefined || finalPlayer.ownPlaystyle === null) {
    payload.ownPlaystyle = deleteField();
  }
  if (finalPlayer.committeePlaystyle === undefined || finalPlayer.committeePlaystyle === null) {
    payload.committeePlaystyle = deleteField();
  }
  if (!finalPlayer.adminStatOverride) {
    payload.adminStatOverride = deleteField();
    payload.adminStatOverrideAt = deleteField();
  }
  if (!finalPlayer.lastMatchSummary) {
    payload.lastMatchSummary = deleteField();
  }
  // Avoid triggering Firestore rule affectedKeys().hasAny(['baseOVR', 'currentOVR', 'isLegend']) on non-admin saves
  if (options?.protectRestrictedFields) {
    delete payload.baseOVR;
    delete payload.currentOVR;
    delete payload.isLegend;
    delete payload.adminStatOverride;
    delete payload.adminStatOverrideAt;
    delete payload.statsSyncVersion;
    delete payload.recordSyncVersion;
    delete payload.matchesPlayed;
    delete payload.wins;
    delete payload.draws;
    delete payload.losses;
  } else {
    if (!finalPlayer.isLegend) {
      delete payload.isLegend;
    }
  }
  return payload;
}

export async function savePlayerToCloudWithResult(
  player: Player,
  options?: { protectRestrictedFields?: boolean }
): Promise<{ player: Player; synced: boolean; error?: string }> {
  if (sandboxModeActive) {
    return { player: stripUndefined({ ...player }), synced: true };
  }
  if (!auth?.currentUser) {
    return {
      player: stripUndefined({ ...player }),
      synced: false,
      error: 'Aktif Firebase oturumu bulunamadı. Değişiklik yalnızca bu cihazda geçerli; buluta kaydetmek için tekrar giriş yapın.',
    };
  }
  const finalPlayer = await preparePlayerForCloud(player);

  if (isFirebaseConfigured && db) {
    try {
      const playerDocRef = doc(db, PLAYERS_COLLECTION, finalPlayer.id);
      await setDoc(playerDocRef, buildPlayerFirestorePayload(finalPlayer, options), { merge: true });
      console.info(`✅ Player "${finalPlayer.name}" saved to Firestore (photo & card synced)`);
      return { player: finalPlayer, synced: true };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error(`Firestore save error for player ${finalPlayer.name}:`, error);
      return { player: finalPlayer, synced: false, error: msg };
    }
  }

  return { player: finalPlayer, synced: false, error: 'Firebase bağlantısı yapılandırılmamış.' };
}

export async function savePlayerToCloud(player: Player): Promise<Player> {
  const res = await savePlayerToCloudWithResult(player);
  return res.player;
}

/**
 * Batch saves multiple players (resolving idb refs & compressing photos first).
 */
export async function savePlayersBatchToCloud(playersList: Player[]): Promise<void> {
  if (sandboxModeActive || !auth?.currentUser) return;
  if (!isFirebaseConfigured || !db || playersList.length === 0) return;
  try {
    const preparedList = await Promise.all(playersList.map(preparePlayerForCloud));
    const batch = writeBatch(db);
    for (const p of preparedList) {
      const ref = doc(db, PLAYERS_COLLECTION, p.id);
      batch.set(ref, buildPlayerFirestorePayload(p), { merge: true });
    }
    await batch.commit();
    console.info(`✅ ${preparedList.length} players batch-synced to Firestore`);
  } catch (err) {
    console.warn('Firestore batch player save warning:', err);
  }
}

/**
 * Batch seeds initial 22 players to Firestore if the collection is empty.
 */
export async function seedPlayersIfEmpty(initialPlayers: Player[]): Promise<void> {
  if (sandboxModeActive) return;
  if (!isFirebaseConfigured || !db) return;

  try {
    const snap = await getDocs(collection(db, PLAYERS_COLLECTION));
    if (snap.empty) {
      console.info('🌱 Seeding initial 22 players to Firestore...');
      const batch = writeBatch(db);
      for (const p of initialPlayers) {
        const ref = doc(db, PLAYERS_COLLECTION, p.id);
        batch.set(ref, stripUndefined({ ...p, statsSyncVersion: CURRENT_STATS_SYNC_VERSION }));
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
        if (sandboxModeActive) return;
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

// ============================================================
// MATCH, SCOUTING, INVITES, LOCKER, PHOTOS & DEBTS SYNC
// ============================================================

function stripSquadPhotos(squad?: MatchSquad): MatchSquad | undefined {
  if (!squad) return undefined;
  return {
    ...squad,
    players: squad.players.map((item) => ({
      ...item,
      player: {
        ...item.player,
        photoUrl: '',
      },
    })),
  };
}

export async function saveMatchToCloud(match: Match): Promise<void> {
  if (sandboxModeActive || !auth?.currentUser) return;
  if (!isFirebaseConfigured || !db) return;
  try {
    const slimMatch: Match = {
      ...match,
      teamA: stripSquadPhotos(match.teamA),
      teamB: stripSquadPhotos(match.teamB),
      altTeamA: stripSquadPhotos(match.altTeamA),
      altTeamB: stripSquadPhotos(match.altTeamB),
    };
    const matchDocRef = doc(db, APP_STATE_COLLECTION, 'current_match');
    await setDoc(matchDocRef, stripUndefined({ ...slimMatch, updatedAt: Date.now() }));
  } catch (err) {
    console.error('Failed to save match to cloud:', err);
  }
}

/**
 * Eşzamanlı kullanıcı veya kurul işlemlerinin (check-in, 360° oyu, taktik, mühür)
 * birbirinin üstüne yazmasını önlemek için Firestore Transaction içinde en güncel maç kaydını günceller.
 */
export async function mutateMatchInCloud(
  mutator: (latest: Match) => Match,
  fallbackMatch: Match
): Promise<Match> {
  if (sandboxModeActive || !auth?.currentUser || !isFirebaseConfigured || !db) {
    return mutator(fallbackMatch);
  }
  const matchDocRef = doc(db, APP_STATE_COLLECTION, 'current_match');
  try {
    const updated = await runTransaction(db, async (tx) => {
      const snap = await tx.get(matchDocRef);
      const latest = snap.exists() ? (snap.data() as Match) : fallbackMatch;
      const next = mutator(latest);
      const slimNext: Match = {
        ...next,
        teamA: stripSquadPhotos(next.teamA),
        teamB: stripSquadPhotos(next.teamB),
        altTeamA: stripSquadPhotos(next.altTeamA),
        altTeamB: stripSquadPhotos(next.altTeamB),
      };
      tx.set(matchDocRef, stripUndefined({ ...slimNext, updatedAt: Date.now() }));
      return next;
    });
    return updated;
  } catch (err) {
    console.warn('Firestore match transaction fallback:', err);
    const next = mutator(fallbackMatch);
    await saveMatchToCloud(next);
    return next;
  }
}

export function subscribeToMatch(onUpdate: (match: Match) => void): () => void {
  if (!isFirebaseConfigured || !db) return () => {};
  try {
    return onSnapshot(
      doc(db, APP_STATE_COLLECTION, 'current_match'),
      (snap) => {
        if (sandboxModeActive) return;
        if (snap.exists()) {
          const data = snap.data() as Match & { updatedAt?: number };
          if (data && Array.isArray(data.starters)) {
            onUpdate(data);
          }
        }
      },
      (err) => {
        console.warn('Firestore match listener warning:', err);
      }
    );
  } catch {
    return () => {};
  }
}

export async function savePastMatchesToCloud(matches: Match[]): Promise<void> {
  if (sandboxModeActive || !auth?.currentUser) return;
  if (!isFirebaseConfigured || !db) return;
  try {
    const slimMatches = matches.map((m) => ({
      ...m,
      teamA: stripSquadPhotos(m.teamA),
      teamB: stripSquadPhotos(m.teamB),
      altTeamA: stripSquadPhotos(m.altTeamA),
      altTeamB: stripSquadPhotos(m.altTeamB),
    }));
    await setDoc(
      doc(db, APP_STATE_COLLECTION, 'past_matches'),
      stripUndefined({ matches: slimMatches, updatedAt: Date.now() }),
      { merge: true }
    );
  } catch (err) {
    console.warn('Failed to save past matches to cloud:', err);
  }
}

export function subscribeToPastMatches(onUpdate: (matches: Match[]) => void): () => void {
  if (!isFirebaseConfigured || !db) return () => {};
  try {
    return onSnapshot(
      doc(db, APP_STATE_COLLECTION, 'past_matches'),
      (snap) => {
        if (sandboxModeActive) return;
        if (snap.exists()) {
          const data = snap.data() as { matches?: Match[] };
          if (Array.isArray(data.matches) && data.matches.length > 0) {
            onUpdate(data.matches);
          }
        }
      },
      (err) => {
        console.warn('Firestore past matches listener warning:', err);
      }
    );
  } catch {
    return () => {};
  }
}

export const CURRENT_SCOUTING_SYNC_VERSION = 2;

export async function saveScoutingToCloud(
  entries: PlayerScoutingEntry[],
  mergeForEvaluator?: string
): Promise<void> {
  if (sandboxModeActive || !auth?.currentUser) return;
  if (!isFirebaseConfigured || !db) return;
  const scoutingDocRef = doc(db, APP_STATE_COLLECTION, 'scouting_entries');
  try {
    if (mergeForEvaluator) {
      await runTransaction(db, async (tx) => {
        const snap = await tx.get(scoutingDocRef);
        const cloudEntries: PlayerScoutingEntry[] =
          snap.exists() && Array.isArray((snap.data() as { entries?: PlayerScoutingEntry[] }).entries)
            ? ((snap.data() as { entries: PlayerScoutingEntry[] }).entries)
            : [];
        const othersEntries = cloudEntries.filter((e) => e.evaluatorName !== mergeForEvaluator);
        const ownEntries = entries.filter((e) => e.evaluatorName === mergeForEvaluator);
        tx.set(
          scoutingDocRef,
          stripUndefined({
            entries: [...othersEntries, ...ownEntries],
            scoutingSyncVersion: CURRENT_SCOUTING_SYNC_VERSION,
            updatedAt: Date.now(),
          }),
          { merge: true }
        );
      });
      return;
    }

    await setDoc(
      scoutingDocRef,
      stripUndefined({
        entries,
        scoutingSyncVersion: CURRENT_SCOUTING_SYNC_VERSION,
        updatedAt: Date.now(),
      }),
      { merge: true }
    );
  } catch (err) {
    console.error('Failed to save scouting entries to cloud:', err);
  }
}

export function subscribeToScouting(
  onUpdate: (entries: PlayerScoutingEntry[], meta?: { scoutingSyncVersion?: number }) => void
): () => void {
  if (!isFirebaseConfigured || !db) return () => {};
  try {
    return onSnapshot(
      doc(db, APP_STATE_COLLECTION, 'scouting_entries'),
      (snap) => {
        if (sandboxModeActive) return;
        if (snap.exists()) {
          const data = snap.data() as { entries?: PlayerScoutingEntry[]; scoutingSyncVersion?: number };
          if (Array.isArray(data.entries)) {
            onUpdate(data.entries, { scoutingSyncVersion: data.scoutingSyncVersion });
          }
        }
      },
      (err) => {
        console.warn('Firestore scouting listener warning:', err);
      }
    );
  } catch {
    return () => {};
  }
}

export async function savePostsToCloud(posts: LockerPost[]): Promise<void> {
  if (sandboxModeActive || !auth?.currentUser) return;
  if (!isFirebaseConfigured || !db) return;
  try {
    const slimPosts = posts.map((p) => ({
      ...p,
      authorPhoto: p.authorPhoto && (isDataUrl(p.authorPhoto) || isIdbRef(p.authorPhoto)) ? undefined : p.authorPhoto,
      imageUrl: p.imageUrl && (isDataUrl(p.imageUrl) || isIdbRef(p.imageUrl)) ? undefined : p.imageUrl,
    }));
    await setDoc(
      doc(db, APP_STATE_COLLECTION, 'locker_posts'),
      stripUndefined({ posts: slimPosts, updatedAt: Date.now() }),
      { merge: true }
    );
  } catch (err) {
    console.warn('Failed to save posts to cloud:', err);
  }
}

export async function mutatePostsInCloud(
  mutator: (latestPosts: LockerPost[]) => LockerPost[],
  fallbackPosts: LockerPost[]
): Promise<void> {
  if (sandboxModeActive || !auth?.currentUser) return;
  if (!isFirebaseConfigured || !db) return;
  const postsDocRef = doc(db, APP_STATE_COLLECTION, 'locker_posts');
  try {
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(postsDocRef);
      const basePosts: LockerPost[] =
        snap.exists() && Array.isArray((snap.data() as { posts?: LockerPost[] }).posts)
          ? (snap.data() as { posts: LockerPost[] }).posts
          : fallbackPosts;
      const mutated = mutator(basePosts);
      const slimPosts = mutated.map((p) => ({
        ...p,
        authorPhoto: p.authorPhoto && (isDataUrl(p.authorPhoto) || isIdbRef(p.authorPhoto)) ? undefined : p.authorPhoto,
        imageUrl: p.imageUrl && (isDataUrl(p.imageUrl) || isIdbRef(p.imageUrl)) ? undefined : p.imageUrl,
      }));
      tx.set(postsDocRef, stripUndefined({ posts: slimPosts, updatedAt: Date.now() }), { merge: true });
    });
  } catch (err) {
    console.warn('Failed to mutate posts in cloud transaction:', err);
  }
}

export function subscribeToPosts(onUpdate: (posts: LockerPost[]) => void): () => void {
  if (!isFirebaseConfigured || !db) return () => {};
  try {
    return onSnapshot(
      doc(db, APP_STATE_COLLECTION, 'locker_posts'),
      (snap) => {
        if (sandboxModeActive) return;
        if (snap.exists()) {
          const data = snap.data() as { posts?: LockerPost[] };
          if (Array.isArray(data.posts)) {
            onUpdate(data.posts);
          }
        }
      },
      (err) => {
        console.warn('Firestore posts listener warning:', err);
      }
    );
  } catch {
    return () => {};
  }
}

export async function saveDebtsToCloud(debts: DessertDebt[]): Promise<void> {
  if (sandboxModeActive || !auth?.currentUser) return;
  if (!isFirebaseConfigured || !db) return;
  try {
    await setDoc(
      doc(db, APP_STATE_COLLECTION, 'dessert_debts'),
      stripUndefined({ debts, updatedAt: Date.now() }),
      { merge: true }
    );
  } catch (err) {
    console.warn('Failed to save debts to cloud:', err);
  }
}

export async function upsertBidonDebtInCloud(
  matchId: string,
  debt: DessertDebt | null,
  fallbackDebts: DessertDebt[]
): Promise<void> {
  if (sandboxModeActive || !auth?.currentUser || !isFirebaseConfigured || !db) return;
  const debtsDocRef = doc(db, APP_STATE_COLLECTION, 'dessert_debts');
  const deterministicId = `debt-bidon-${matchId}`;
  try {
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(debtsDocRef);
      const existing: DessertDebt[] =
        snap.exists() && Array.isArray((snap.data() as { debts?: DessertDebt[] }).debts)
          ? (snap.data() as { debts: DessertDebt[] }).debts
          : fallbackDebts;
      const filtered = existing.filter((d) => d.id !== deterministicId);
      const next = debt ? [debt, ...filtered] : filtered;
      tx.set(debtsDocRef, stripUndefined({ debts: next, updatedAt: Date.now() }), { merge: true });
    });
  } catch (err) {
    console.warn('Failed to upsert bidon debt in cloud:', err);
  }
}

export function subscribeToDebts(onUpdate: (debts: DessertDebt[]) => void): () => void {
  if (!isFirebaseConfigured || !db) return () => {};
  try {
    return onSnapshot(
      doc(db, APP_STATE_COLLECTION, 'dessert_debts'),
      (snap) => {
        if (sandboxModeActive) return;
        if (snap.exists()) {
          const data = snap.data() as { debts?: DessertDebt[] };
          if (Array.isArray(data.debts)) {
            onUpdate(data.debts);
          }
        }
      },
      (err) => {
        console.warn('Firestore debts listener warning:', err);
      }
    );
  } catch {
    return () => {};
  }
}

export async function savePhotoItemToCloud(photo: PhotoArchiveItem): Promise<void> {
  if (sandboxModeActive || !auth?.currentUser) return;
  if (!isFirebaseConfigured || !db) return;
  try {
    let imageUrl = photo.imageUrl;
    if (isIdbRef(imageUrl)) {
      imageUrl = (await resolveIdbUrl(imageUrl)) || imageUrl;
    }
    if (isDataUrl(imageUrl)) {
      imageUrl = await compressPhotoForFirestore(imageUrl, {
        maxDimension: 1280,
        quality: 0.85,
        maxBytes: 185_000,
      });
    }
    await setDoc(
      doc(db, PHOTOS_COLLECTION, photo.id),
      stripUndefined({ ...photo, imageUrl }),
      { merge: true }
    );
  } catch (err) {
    console.warn('Failed to save photo item to cloud:', err);
  }
}

export async function mutatePhotoItemInCloud(
  photoId: string,
  mutator: (latest: PhotoArchiveItem) => PhotoArchiveItem,
  fallbackPhoto: PhotoArchiveItem
): Promise<void> {
  if (sandboxModeActive || !auth?.currentUser) return;
  if (!isFirebaseConfigured || !db) return;
  const photoDocRef = doc(db, PHOTOS_COLLECTION, photoId);
  try {
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(photoDocRef);
      const basePhoto: PhotoArchiveItem = snap.exists()
        ? (snap.data() as PhotoArchiveItem)
        : fallbackPhoto;
      const mutated = mutator(basePhoto);
      const safeImageUrl =
        mutated.imageUrl === ''
          ? ''
          : isDataUrl(mutated.imageUrl) || isIdbRef(mutated.imageUrl)
          ? basePhoto.imageUrl && !isDataUrl(basePhoto.imageUrl) && !isIdbRef(basePhoto.imageUrl)
            ? basePhoto.imageUrl
            : mutated.imageUrl
          : mutated.imageUrl;
      tx.set(photoDocRef, stripUndefined({ ...mutated, imageUrl: safeImageUrl }), { merge: true });
    });
  } catch (err) {
    console.warn('Failed to mutate photo item in cloud transaction:', err);
  }
}

export function subscribeToPhotos(onUpdate: (photos: PhotoArchiveItem[]) => void): () => void {
  if (!isFirebaseConfigured || !db) return () => {};
  try {
    return onSnapshot(
      collection(db, PHOTOS_COLLECTION),
      (snap) => {
        if (sandboxModeActive) return;
        if (!snap.empty) {
          const list: PhotoArchiveItem[] = [];
          snap.forEach((d) => list.push(d.data() as PhotoArchiveItem));
          list.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
          onUpdate(list);
        }
      },
      (err) => {
        console.warn('Firestore photos listener warning:', err);
      }
    );
  } catch {
    return () => {};
  }
}

export async function saveInviteToCloud(invite: InviteToken): Promise<void> {
  if (sandboxModeActive) return;
  if (!isFirebaseConfigured || !db) return;
  try {
    const payload: Record<string, unknown> = { ...stripUndefined(invite) };
    if (!invite.usedByEmail) payload.usedByEmail = deleteField();
    if (!invite.usedAt) payload.usedAt = deleteField();
    if (!invite.isRevoked) payload.isRevoked = deleteField();
    await setDoc(doc(db, INVITES_COLLECTION, invite.id), payload, { merge: true });
  } catch (err) {
    console.warn('Failed to save invite to cloud:', err);
  }
}

export async function fetchInviteFromCloud(tokenId: string): Promise<InviteToken | undefined> {
  if (sandboxModeActive) return undefined;
  if (!isFirebaseConfigured || !db || !tokenId) return undefined;
  try {
    const snap = await getDoc(doc(db, INVITES_COLLECTION, tokenId));
    if (!snap.exists()) return undefined;
    const inv = snap.data() as InviteToken;
    return inv.isRevoked ? undefined : inv;
  } catch (err) {
    console.warn('Failed to fetch invite from cloud:', err);
    return undefined;
  }
}

export async function fetchInviteStateFromCloud(
  tokenId: string
): Promise<{ exists: boolean; revoked: boolean; invite?: InviteToken }> {
  if (sandboxModeActive || !isFirebaseConfigured || !db || !tokenId) {
    return { exists: false, revoked: false };
  }
  try {
    const snap = await getDoc(doc(db, INVITES_COLLECTION, tokenId));
    if (!snap.exists()) return { exists: false, revoked: false };
    const inv = snap.data() as InviteToken;
    if (inv.isRevoked) return { exists: true, revoked: true };
    return { exists: true, revoked: false, invite: inv };
  } catch (err) {
    console.warn('Failed to fetch invite state from cloud:', err);
    return { exists: false, revoked: false };
  }
}

export function subscribeToInvites(onUpdate: (invites: InviteToken[]) => void): () => void {
  if (!isFirebaseConfigured || !db) return () => {};
  try {
    return onSnapshot(
      collection(db, INVITES_COLLECTION),
      (snap) => {
        if (sandboxModeActive) return;
        if (!snap.empty) {
          const list: InviteToken[] = [];
          snap.forEach((d) => list.push(d.data() as InviteToken));
          onUpdate(list);
        }
      },
      (err) => {
        console.warn('Firestore invites listener warning:', err);
      }
    );
  } catch {
    return () => {};
  }
}
