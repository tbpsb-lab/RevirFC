import { InviteToken } from '../types';
import { safeSetItem } from './safeStorage';

const STORAGE_INVITES_KEY = 'revirfc_invites_v1';

export const INITIAL_INVITES: InviteToken[] = [
  {
    id: 'admin-alper-777',
    name: 'Alper',
    role: 'admin',
    claimedPlayerId: 'p1',
    description: 'Kulüp Yöneticisi & Kaptan Tam Yetkili Davet Linki',
    createdAt: '2026-11-12T07:30:00.000Z',
  },
  {
    id: 'kurul-yuksel-404',
    name: 'Yüksel',
    role: 'captain',
    claimedPlayerId: 'p3',
    description: 'Kurul Üyesi & Kaptan Özel Davet Linki',
    createdAt: '2026-11-12T07:30:00.000Z',
  },
  {
    id: 'kurul-akif-303',
    name: 'Akif',
    role: 'captain',
    claimedPlayerId: 'p2',
    description: 'Kurul Üyesi & Kaptan Özel Davet Linki',
    createdAt: '2026-11-12T07:30:00.000Z',
  },
  {
    id: 'legend-ismail-101',
    name: 'İsmail',
    role: 'player',
    claimedPlayerId: 'p4',
    description: 'Kulüp Efsanesi (Legend) Davet Linki',
    createdAt: '2026-11-12T07:30:00.000Z',
  },
];

export function getSavedInvites(): InviteToken[] {
  try {
    const raw = localStorage.getItem(STORAGE_INVITES_KEY);
    if (raw) {
      const parsed: InviteToken[] = JSON.parse(raw);
      // Merge with INITIAL_INVITES if missing
      const existingIds = new Set(parsed.map((i) => i.id));
      const missing = INITIAL_INVITES.filter((i) => !existingIds.has(i.id));
      return [...parsed, ...missing];
    }
  } catch {}
  return INITIAL_INVITES;
}

export function saveInvites(invites: InviteToken[]): void {
  safeSetItem(STORAGE_INVITES_KEY, JSON.stringify(invites));
}

export function findInviteById(token: string): InviteToken | undefined {
  const invites = getSavedInvites();
  return invites.find((i) => i.id === token && !i.isRevoked);
}

export function markInviteUsed(token: string, email: string): void {
  const invites = getSavedInvites();
  const updated = invites.map((i) => {
    if (i.id === token) {
      return {
        ...i,
        usedByEmail: email,
        usedAt: new Date().toISOString(),
      };
    }
    return i;
  });
  saveInvites(updated);
}

export function createNewInvite(params: Omit<InviteToken, 'createdAt'>): InviteToken {
  const newInvite: InviteToken = {
    ...params,
    createdAt: new Date().toISOString(),
  };
  const list = getSavedInvites();
  saveInvites([newInvite, ...list]);
  return newInvite;
}
