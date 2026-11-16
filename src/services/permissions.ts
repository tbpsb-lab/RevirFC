import { isFormerPlayer, type AdminActiveMode, type Player, type UserProfile } from '../types';
import { COMMITTEE_MEMBERS } from './mockData';

/**
 * Yetki modeli (tek kaynak):
 *
 *  YÖNETİCİ HESABI (isAdminAccount) role === 'admin'
 *    İki mod arasında geçiş yapabilir:
 *    - 'admin' (Yönetici Modu -> isSuperAdmin = true):
 *        Her şey: tüm kartları doğrudan düzenler, stat/OVR override, Efsane (Legend) atar/kaldırır,
 *        lakap taleplerini onaylar/reddeder, kullanıcı onaylar, davet üretir, Kurul Sentezini kilitleyip
 *        kadroya uygular, Admin sekmesi.
 *    - 'committee' (Kurul Üyesi Modu -> isSuperAdmin = false, isCommittee = true):
 *        Kurul üyesi şapkasıyla çalışır: Kurul Puanlama'da sadece kendi adına oy kullanır,
 *        kartlarda mevkileri, temaları (MVP/Ateş Ediyo!/Bidon/Revir), 2. PlayStyle rozetini düzenler,
 *        Kurul Masası'nda mühür basar. Tek başına Yönetici yetkilerini (Efsane, lakap onayı, üye onayı,
 *        stat override, sentez kilitleme) kullanmaz.
 *
 *  KURUL (isCommittee)      role === 'captain' VEYA kartı Kurul listesindeki oyuncu (+ Yönetici)
 *    Tüm kartlarda ideal mevkileri, MVP/Bidon/Ateş Ediyo!/Revir kartlarını ve 2. PlayStyle rozetini
 *    düzenler; Kurul Puanlama'da oy kullanır; Kurul Masası'nda son mührü basar. YAPAMAZ: Efsane atamak,
 *    lakap onaylamak, kullanıcı onaylamak. Kendi lakap değişikliği de Yönetici onayına gider.
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
  isFormer: boolean;
  isAdminAccount: boolean;
  isSuperAdmin: boolean;
  isCommittee: boolean;
  activeMode: 'admin' | 'committee' | 'player' | 'pending' | 'former';
}

export function getAccess(
  user: UserProfile | null | undefined,
  players: Player[],
  adminMode: AdminActiveMode = 'admin'
): Access {
  const isForcedPlainPlayer = Boolean(user?.uid?.startsWith('sandbox-force-player-'));
  const isApproved = user?.status === 'approved';
  const isPending = !user || user?.status === 'pending';
  const isAdminAccount = isApproved && !isForcedPlainPlayer && user?.role === 'admin';

  const claimed = user?.claimedPlayerId ? players.find((p) => p.id === user.claimedPlayerId) : undefined;
  const isFormer = isApproved && !isAdminAccount && isFormerPlayer(claimed);

  const isSuperAdmin = isAdminAccount && !isFormer && adminMode === 'admin';
  const nameIsCommittee = !!claimed && (COMMITTEE_MEMBERS as readonly string[]).includes(claimed.name);
  const isCommittee =
    isApproved && !isForcedPlainPlayer && !isFormer && (isAdminAccount || user?.role === 'captain' || nameIsCommittee);

  const activeMode: Access['activeMode'] = isPending
    ? 'pending'
    : isFormer
    ? 'former'
    : isAdminAccount
    ? adminMode
    : isCommittee
    ? 'committee'
    : 'player';

  return { isApproved, isPending, isFormer, isAdminAccount, isSuperAdmin, isCommittee, activeMode };
}
