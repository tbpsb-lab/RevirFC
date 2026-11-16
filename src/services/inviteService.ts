import { InviteToken, Player, UserRole, isClubLegendPlayer } from '../types';
import { INITIAL_PLAYERS, COMMITTEE_MEMBERS, isFounderAdminEmail } from './mockData';
import { safeSetItem } from './safeStorage';
import { saveInviteToCloud, isCloudSandboxMode } from './cloudSync';

const STORAGE_INVITES_KEY = 'revirfc_invites_v2';
const SANDBOX_STORAGE_INVITES_KEY = 'revirfc_sandbox_invites_v1';
const LEGACY_STORAGE_INVITES_KEY = 'revirfc_invites_v1';
const BASELINE_INVITE_CREATED_AT = '2026-11-12T07:30:00.000Z';

const LEGACY_INVITE_ALIASES: Record<string, string> = {
  'kurul-akif-303': 'kurul-akif-p2',
  'kurul-yuksel-404': 'kurul-yuksel-p3',
  'legend-ismail-101': 'uye-ismail-p4',
};

const TR_CHAR_MAP: Record<string, string> = {
  ç: 'c',
  ğ: 'g',
  ı: 'i',
  İ: 'i',
  i: 'i',
  ö: 'o',
  ş: 's',
  ü: 'u',
  Ç: 'c',
  Ğ: 'g',
  I: 'i',
  Ö: 'o',
  Ş: 's',
  Ü: 'u',
};

export function slugifyInviteName(name: string): string {
  return (name || '')
    .split('')
    .map((ch) => TR_CHAR_MAP[ch] ?? ch)
    .join('')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

export function isExcludedAdminPlayer(player?: { id?: string; name?: string } | null): boolean {
  if (!player) return true;
  if (player.id === 'p1') return true;
  return slugifyInviteName(player.name || '') === 'alper';
}

export function isExcludedAdminInvite(invite?: Partial<InviteToken> | null): boolean {
  if (!invite) return true;
  if (invite.id === 'admin-alper-777') return true;
  if (invite.claimedPlayerId === 'p1') return true;
  return slugifyInviteName(invite.name || '') === 'alper';
}

function getDefaultRoleForPlayer(player: Pick<Player, 'name'>): UserRole {
  return (COMMITTEE_MEMBERS as readonly string[]).includes(player.name) ? 'captain' : 'player';
}

export function buildMemberInviteForPlayer(player: Player): InviteToken {
  const role = getDefaultRoleForPlayer(player);
  const slug = slugifyInviteName(player.name) || player.id.toLowerCase();
  const prefix = role === 'captain' ? 'kurul' : 'uye';
  const id = `${prefix}-${slug}-${player.id}`;
  const description =
    role === 'captain'
      ? 'Kurul Üyesi Özel Davet Linki'
      : isClubLegendPlayer(player)
      ? 'Kulüp Efsanesi (Legend) Özel Davet Linki'
      : 'Kulüp Oyuncusu Özel Davet Linki';

  return {
    id,
    name: player.name,
    role,
    claimedPlayerId: player.id,
    description,
    createdAt: BASELINE_INVITE_CREATED_AT,
  };
}

export const INITIAL_INVITES: InviteToken[] = INITIAL_PLAYERS
  .filter((p) => !isExcludedAdminPlayer(p))
  .map((p) => buildMemberInviteForPlayer(p));

function sanitizeInviteUsage(invite: InviteToken): InviteToken {
  if (invite.usedByEmail && isFounderAdminEmail(invite.usedByEmail)) {
    const cleaned = { ...invite };
    delete cleaned.usedByEmail;
    delete cleaned.usedAt;
    return cleaned;
  }
  return invite;
}

function mergeInviteMetadata(base: InviteToken, incoming?: InviteToken): InviteToken {
  if (!incoming) return sanitizeInviteUsage(base);
  return sanitizeInviteUsage({
    ...base,
    ...incoming,
    id: base.id,
    name: base.name,
    role: incoming.role || base.role,
    claimedPlayerId: incoming.claimedPlayerId || base.claimedPlayerId,
    usedByEmail: incoming.usedByEmail,
    usedAt: incoming.usedAt,
    isRevoked: incoming.isRevoked ?? base.isRevoked,
  });
}

/**
 * Yönetici (Alper / p1) hariç tüm kadro üyeleri için güncel ve çalışır durumda
 * özel davet linklerini üretir; mevcut kullanım/özel link kayıtlarıyla birleştirir.
 */
export function ensureMemberInvites(
  players: Player[],
  currentInvites?: InviteToken[]
): InviteToken[] {
  const sourceInvites = currentInvites ?? readRawInvitesFromStorage();
  const nonAdminInvites = sourceInvites
    .filter((inv) => !isExcludedAdminInvite(inv))
    .map(sanitizeInviteUsage);

  const byId = new Map<string, InviteToken>();
  for (const inv of nonAdminInvites) {
    byId.set(inv.id, inv);
  }

  // Eski sabit kodlardaki kullanım bilgisini yeni deterministik ID'lere aktar
  for (const [legacyId, canonicalId] of Object.entries(LEGACY_INVITE_ALIASES)) {
    const legacy = byId.get(legacyId);
    if (legacy) {
      const existingCanonical = byId.get(canonicalId);
      if (existingCanonical) {
        byId.set(canonicalId, mergeInviteMetadata(existingCanonical, legacy));
      } else {
        byId.set(canonicalId, { ...legacy, id: canonicalId });
      }
      byId.delete(legacyId);
    }
  }

  const eligiblePlayers = players.filter((p) => !isExcludedAdminPlayer(p));
  const usedIdsInMemberSlots = new Set<string>();
  const memberInvites: InviteToken[] = [];

  for (const player of eligiblePlayers) {
    const base = buildMemberInviteForPlayer(player);
    const existingCanonical = byId.get(base.id);

    if (existingCanonical?.isRevoked) {
      // Kanonik link iptal edilip yeniden üretildiyse, aynı oyuncu için aktif en yeni linki kullan
      const replacement = Array.from(byId.values())
        .filter((inv) => !inv.isRevoked && inv.claimedPlayerId === player.id)
        .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))[0];
      if (replacement) {
        usedIdsInMemberSlots.add(replacement.id);
        memberInvites.push(replacement);
        continue;
      }
      // Aktif yedek yoksa kanonik kartı sıfırlayıp temiz göster
      const resetCanonical: InviteToken = { ...base, createdAt: new Date().toISOString() };
      usedIdsInMemberSlots.add(resetCanonical.id);
      memberInvites.push(resetCanonical);
      continue;
    }

    const resolved = existingCanonical ? mergeInviteMetadata(base, existingCanonical) : base;
    usedIdsInMemberSlots.add(resolved.id);
    memberInvites.push(resolved);
  }

  // Kurul üyelerini en üste, ardından kalan oyuncuları kadro sırasıyla diz
  memberInvites.sort((a, b) => {
    if (a.role !== b.role) {
      if (a.role === 'captain') return -1;
      if (b.role === 'captain') return 1;
    }
    const idxA = eligiblePlayers.findIndex((p) => p.id === a.claimedPlayerId);
    const idxB = eligiblePlayers.findIndex((p) => p.id === b.claimedPlayerId);
    return idxA - idxB;
  });

  // Manuel olarak üretilmiş aktif özel davetleri (varsa) koru
  const customInvites = Array.from(byId.values())
    .filter((inv) => !inv.isRevoked && !usedIdsInMemberSlots.has(inv.id))
    .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));

  return [...customInvites, ...memberInvites];
}

function readRawInvitesFromStorage(): InviteToken[] {
  if (isCloudSandboxMode()) {
    try {
      const sbRaw = sessionStorage.getItem(SANDBOX_STORAGE_INVITES_KEY);
      if (sbRaw) {
        const parsed: InviteToken[] = JSON.parse(sbRaw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return INITIAL_INVITES;
  }

  try {
    const v2Raw = localStorage.getItem(STORAGE_INVITES_KEY);
    if (v2Raw) {
      const parsed: InviteToken[] = JSON.parse(v2Raw);
      if (Array.isArray(parsed)) return parsed;
    }

    const v1Raw = localStorage.getItem(LEGACY_STORAGE_INVITES_KEY);
    localStorage.removeItem(LEGACY_STORAGE_INVITES_KEY);
    if (v1Raw) {
      const parsedV1: InviteToken[] = JSON.parse(v1Raw);
      if (Array.isArray(parsedV1)) {
        const cleaned = ensureMemberInvites(INITIAL_PLAYERS, parsedV1);
        safeSetItem(STORAGE_INVITES_KEY, JSON.stringify(cleaned));
        return cleaned;
      }
    }
  } catch {}
  return INITIAL_INVITES;
}

export function clearSandboxInvites(): void {
  try {
    sessionStorage.removeItem(SANDBOX_STORAGE_INVITES_KEY);
  } catch {}
}

export function getSavedInvites(): InviteToken[] {
  return ensureMemberInvites(INITIAL_PLAYERS, readRawInvitesFromStorage());
}

export function saveInvites(invites: InviteToken[]): void {
  const revokedList = invites.filter((inv) => !isExcludedAdminInvite(inv) && inv.isRevoked);
  const activeCleaned = ensureMemberInvites(
    INITIAL_PLAYERS,
    invites.filter((inv) => !isExcludedAdminInvite(inv))
  );
  const toPersist = [
    ...activeCleaned,
    ...revokedList.filter((r) => !activeCleaned.some((a) => a.id === r.id)),
  ];
  if (isCloudSandboxMode()) {
    try {
      sessionStorage.setItem(SANDBOX_STORAGE_INVITES_KEY, JSON.stringify(toPersist));
    } catch {}
    return;
  }
  safeSetItem(STORAGE_INVITES_KEY, JSON.stringify(toPersist));
}

function getCachedPlayersForLookup(): Player[] {
  try {
    const raw = localStorage.getItem('revirfc_players_v3');
    if (raw) {
      const parsed: Player[] = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch {}
  return INITIAL_PLAYERS;
}

export function findInviteById(token: string): InviteToken | undefined {
  if (!token) return undefined;
  const trimmed = token.trim();
  if (trimmed === 'admin-alper-777') return undefined;

  const rawInvites = readRawInvitesFromStorage();
  const invites = ensureMemberInvites(INITIAL_PLAYERS, rawInvites);
  const canonicalToken = LEGACY_INVITE_ALIASES[trimmed] || trimmed;

  const rawMatched = rawInvites.find((i) => i.id === canonicalToken || i.id === trimmed);
  if (rawMatched?.isRevoked) {
    return undefined;
  }

  const matched = invites.find((i) => i.id === canonicalToken || i.id === trimmed);
  if (matched) {
    return matched.isRevoked ? undefined : matched;
  }

  // Son eki "-p<numara>" olan üye davetlerini kadrodaki ilgili oyuncuya doğrudan çöz (cihazlar arası garanti)
  const suffixMatch = canonicalToken.match(/-(p\d+)$/);
  if (suffixMatch) {
    const playerId = suffixMatch[1];
    if (playerId === 'p1') return undefined;
    const allPlayers = [...getCachedPlayersForLookup(), ...INITIAL_PLAYERS];
    const player = allPlayers.find((p) => p.id === playerId && !isExcludedAdminPlayer(p));
    if (player) {
      const generated = buildMemberInviteForPlayer(player);
      if (generated.id === canonicalToken || canonicalToken.startsWith('kurul-') || canonicalToken.startsWith('uye-')) {
        return {
          ...generated,
          id: canonicalToken,
        };
      }
    }
  }

  return undefined;
}

export function markInviteUsed(token: string, email: string): void {
  const invites = getSavedInvites();
  const canonicalToken = LEGACY_INVITE_ALIASES[token] || token;
  let updatedItem: InviteToken | undefined;
  const updated = invites.map((i) => {
    if (i.id === canonicalToken || i.id === token) {
      updatedItem = {
        ...i,
        usedByEmail: email,
        usedAt: new Date().toISOString(),
      };
      return updatedItem;
    }
    return i;
  });
  saveInvites(updated);
  if (updatedItem) {
    saveInviteToCloud(updatedItem);
  }
}

export function createNewInvite(params: Omit<InviteToken, 'createdAt'>): InviteToken {
  const newInvite: InviteToken = {
    ...params,
    createdAt: new Date().toISOString(),
  };
  if (isExcludedAdminInvite(newInvite)) {
    return newInvite;
  }
  const list = readRawInvitesFromStorage();
  saveInvites([newInvite, ...list]);
  saveInviteToCloud(newInvite);
  return newInvite;
}

/**
 * Mevcut davet linkini iptal eder ve aynı üye/kart için tertemiz, yeni bir davet linki üretir.
 */
export function regenerateInvite(
  invite: InviteToken,
  players: Player[] = INITIAL_PLAYERS
): InviteToken {
  const revokedOld: InviteToken = {
    ...invite,
    isRevoked: true,
  };

  const roleSlug = invite.role === 'admin' ? 'admin' : invite.role === 'captain' ? 'kurul' : 'uye';
  const cleanSlug = slugifyInviteName(invite.name) || 'uye';
  const rand = Math.floor(100 + Math.random() * 900);
  const playerSuffix = invite.claimedPlayerId ? `-${invite.claimedPlayerId}` : '';
  const newId = `${roleSlug}-${cleanSlug}-${rand}${playerSuffix}`;

  const freshInvite: InviteToken = {
    id: newId,
    name: invite.name,
    role: invite.role,
    claimedPlayerId: invite.claimedPlayerId,
    description: invite.description,
    createdAt: new Date().toISOString(),
  };

  const existingRaw = readRawInvitesFromStorage();
  const nextRaw = existingRaw.map((i) => (i.id === invite.id ? revokedOld : i));
  if (!nextRaw.some((i) => i.id === invite.id)) {
    nextRaw.push(revokedOld);
  }
  nextRaw.unshift(freshInvite);

  saveInvites(nextRaw);
  saveInviteToCloud(revokedOld);
  saveInviteToCloud(freshInvite);
  void players;
  return freshInvite;
}
