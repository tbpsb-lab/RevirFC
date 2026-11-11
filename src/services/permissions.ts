import type { Player, UserProfile } from '../types';
import { COMMITTEE_MEMBERS } from './mockData';

/**
 * Yetki modeli (tek kaynak):
 *
 *  YÖNETİCİ (isSuperAdmin)  role === 'admin'
 *    Her şey: tüm kartları düzenler, Efsane (Legend) atar/kaldırır, lakap değişikliği taleplerini
 *    onaylar/reddeder, kullanıcı onaylar, Admin sekmesi.
 *
 *  KURUL (isCommittee)      role === 'captain' VEYA kartı Kurul listesindeki oyuncu (+ Yönetici)
 *    Tüm kartlarda ideal mevkileri, MVP/Bidon/Ateş Ediyo!/Revir kartlarını, 2. PlayStyle rozetini ve
 *    statları düzenler; Kurul Masası'nda son mührü basar. YAPAMAZ: Efsane atamak, lakap onaylamak,
 *    kullanıcı onaylamak. Kendi lakap değişikliği de Yönetici onayına gider.
 *
 *  OYUNCU                   onaylı kullanıcı
 *    Yalnızca kendi kartı: fotoğraf/dekupe, 1. PlayStyle, bayrak/arma, forma no, lakap talebi.
 *    YAPAMAZ: mevki, tema/unvan, 2. PlayStyle, stat.
 *
 *  BEKLEYEN                 status === 'pending' — yalnızca görüntüler.
 */
export interface Access {
  isApproved: boolean;
  isPending: boolean;
  isSuperAdmin: boolean;
  isCommittee: boolean;
}

export function getAccess(
  user: UserProfile | null | undefined,
  players: Player[]
): Access {
  const isApproved = user?.status === 'approved';
  const isPending = user?.status === 'pending';
  const isSuperAdmin = isApproved && user?.role === 'admin';

  const claimed = user?.claimedPlayerId ? players.find((p) => p.id === user.claimedPlayerId) : undefined;
  const nameIsCommittee = !!claimed && (COMMITTEE_MEMBERS as readonly string[]).includes(claimed.name);
  const isCommittee = isApproved && (isSuperAdmin || user?.role === 'captain' || nameIsCommittee);

  return { isApproved, isPending, isSuperAdmin, isCommittee };
}
