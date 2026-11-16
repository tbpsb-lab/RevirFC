import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Player, UserRole, InviteToken } from '../../types';
import {
  getSavedInvites,
  createNewInvite,
  regenerateInvite,
  saveInvites,
  ensureMemberInvites,
  isExcludedAdminInvite,
  isExcludedAdminPlayer,
} from '../../services/inviteService';
import { isFounderAdminEmail } from '../../services/mockData';
import { saveInviteToCloud, subscribeToInvites } from '../../services/cloudSync';
import { Copy, Check, Plus, Sparkles, KeyRound, Link2, RefreshCw } from 'lucide-react';

interface Props {
  players: Player[];
}

export const InviteManagerModal: React.FC<Props> = ({ players }) => {
  const eligiblePlayers = useMemo(
    () => players.filter((p) => !isExcludedAdminPlayer(p)),
    [players]
  );

  const [invites, setInvites] = useState<InviteToken[]>(() =>
    ensureMemberInvites(players, getSavedInvites())
  );
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const syncedIdsRef = useRef<Set<string>>(new Set());

  // Açılışta ve kadro değiştiğinde Alper hariç tüm üyelerin davetlerini hazırla & Firestore'a eşitle
  useEffect(() => {
    const completeList = ensureMemberInvites(players, getSavedInvites());
    saveInvites(completeList);
    setInvites(completeList);

    completeList.forEach((inv) => {
      if (!syncedIdsRef.current.has(inv.id)) {
        syncedIdsRef.current.add(inv.id);
        saveInviteToCloud(inv);
      }
    });
  }, [players]);

  useEffect(() => {
    const unsubscribe = subscribeToInvites((cloudInvites) => {
      if (!cloudInvites || cloudInvites.length === 0) return;
      const localList = getSavedInvites();
      const map = new Map<string, InviteToken>();
      localList.filter((inv) => !isExcludedAdminInvite(inv)).forEach((inv) => map.set(inv.id, inv));
      const toHealInCloud: InviteToken[] = [];
      cloudInvites.filter((inv) => !isExcludedAdminInvite(inv)).forEach((inv) => {
        const prev = map.get(inv.id);
        const accidentalAdminUse = Boolean(inv.usedByEmail && isFounderAdminEmail(inv.usedByEmail));
        const resolvedInv: InviteToken = {
          ...prev,
          ...inv,
          usedByEmail: accidentalAdminUse ? undefined : inv.usedByEmail,
          usedAt: accidentalAdminUse ? undefined : inv.usedAt,
          isRevoked: inv.isRevoked,
        };
        if (accidentalAdminUse) {
          toHealInCloud.push(resolvedInv);
        }
        map.set(inv.id, resolvedInv);
      });
      const rawValues = Array.from(map.values());
      saveInvites(rawValues);
      setInvites(ensureMemberInvites(players, rawValues));
      toHealInCloud.forEach((cleanInv) => saveInviteToCloud(cleanInv));
    });
    return () => unsubscribe();
  }, [players]);

  // New Invite form state
  const [showForm, setShowForm] = useState(false);
  const [targetName, setTargetName] = useState('');
  const [targetRole, setTargetRole] = useState<UserRole>('player');
  const [targetPlayerId, setTargetPlayerId] = useState(eligiblePlayers[0]?.id || 'p2');

  useEffect(() => {
    if (!eligiblePlayers.some((p) => p.id === targetPlayerId) && eligiblePlayers[0]) {
      setTargetPlayerId(eligiblePlayers[0].id);
    }
  }, [eligiblePlayers, targetPlayerId]);

  const getFullInviteUrl = (tokenId: string) => {
    const authDomainHost = (import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '').trim();
    const isHostedOnFirebase =
      window.location.hostname.endsWith('.web.app') ||
      window.location.hostname.endsWith('.firebaseapp.com');
    const origin =
      isHostedOnFirebase && authDomainHost
        ? `https://${authDomainHost}`
        : window.location.origin;
    const pathname = window.location.pathname.replace(/\/$/, '');
    return `${origin}${pathname}/?invite=${tokenId}`;
  };

  const handleCopy = (tokenId: string) => {
    const url = getFullInviteUrl(tokenId);
    navigator.clipboard.writeText(url);
    setCopiedId(tokenId);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleRegenerate = (inv: InviteToken) => {
    const fresh = regenerateInvite(inv, players);
    setInvites(ensureMemberInvites(players, getSavedInvites()));
    handleCopy(fresh.id);
  };

  const handleCreateInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetName) return;

    const matchedPlayer = eligiblePlayers.find((p) => p.id === targetPlayerId);
    if (!matchedPlayer) return;
    const roleSlug = targetRole === 'admin' ? 'admin' : targetRole === 'captain' ? 'kurul' : 'uye';
    const cleanName = targetName.toLowerCase().replace(/[^a-z0-9]/gi, '');
    const customId = `${roleSlug}-${cleanName}-${Math.floor(100 + Math.random() * 900)}`;

    const newInv = createNewInvite({
      id: customId,
      name: targetName,
      role: targetRole,
      claimedPlayerId: targetPlayerId,
      description: `${targetName} (${matchedPlayer.name} Kartı) İçin Özel Yetkili Davet`,
    });

    setInvites(ensureMemberInvites(players, getSavedInvites()));
    setShowForm(false);
    setTargetName('');
    handleCopy(newInv.id);
  };

  return (
    <div className="bg-neutral-900/90 border border-neutral-800 rounded-3xl p-6 shadow-xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-neutral-800 pb-4">
        <div>
          <h3 className="text-base font-black text-amber-400 flex items-center gap-2">
            <KeyRound className="w-5 h-5" /> Özel Yetkili Davet Linkleri Sistemi
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30">
              {invites.length} Üye
            </span>
          </h3>
          <p className="text-xs text-neutral-400 mt-0.5">
            Yönetici Alper hariç tüm kulüp üyeleri için özel davet linkleri hazırdır. Linki kopyalayıp ilgili oyuncuya gönderebilirsiniz.
          </p>
        </div>

        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-amber-500 hover:bg-amber-400 text-black font-black text-xs px-4 py-2 rounded-xl shadow-lg shadow-amber-500/20 flex items-center gap-1.5 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Yeni Davet Linki Üret
        </button>
      </div>

      {/* New invite form */}
      {showForm && (
        <form onSubmit={handleCreateInvite} className="p-4 bg-neutral-950/80 rounded-2xl border border-neutral-800 space-y-3">
          <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-amber-400" /> Yeni Davet Linki Özellikleri
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-[11px] font-bold text-neutral-400 block mb-1">Kişi Adı</label>
              <input
                type="text"
                placeholder="Örn: Yüksel, Akif, Can..."
                value={targetName}
                onChange={(e) => setTargetName(e.target.value)}
                required
                className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-neutral-400 block mb-1">Tanımlanacak Yetki</label>
              <select
                value={targetRole}
                onChange={(e) => setTargetRole(e.target.value as UserRole)}
                className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
              >
                <option value="player">🏃 Kulüp Oyuncusu</option>
                <option value="captain">⭐ Kurul Üyesi</option>
                <option value="admin">👑 Kulüp Yöneticisi</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] font-bold text-neutral-400 block mb-1">Eşleşecek Kart</label>
              <select
                value={targetPlayerId}
                onChange={(e) => setTargetPlayerId(e.target.value)}
                className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
              >
                {eligiblePlayers.map((p) => (
                  <option key={p.id} value={p.id}>
                    #{p.number} {p.name} ({p.nickname})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-3 py-1.5 rounded-xl text-xs text-neutral-400 hover:text-white cursor-pointer"
            >
              İptal
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-black text-xs shadow-md cursor-pointer"
            >
              Linki Üret ve Kopyala
            </button>
          </div>
        </form>
      )}

      {/* Invites list */}
      <div className="space-y-2.5">
        {invites.map((inv) => {
          const linkedPlayer = players.find((p) => p.id === inv.claimedPlayerId);
          const isCopied = copiedId === inv.id;
          const fullUrl = getFullInviteUrl(inv.id);

          return (
            <div
              key={inv.id}
              className="p-3.5 bg-neutral-950/70 hover:bg-neutral-950 rounded-2xl border border-neutral-800/80 flex flex-wrap items-center justify-between gap-3 transition-colors"
            >
              <div className="space-y-1 min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-bold text-white text-sm">{inv.name}</span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      inv.role === 'admin'
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                        : inv.role === 'captain'
                        ? 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                        : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    }`}
                  >
                    {inv.role === 'admin' ? '👑 Yönetici' : inv.role === 'captain' ? '⭐ Kurul Üyesi' : '🏃 Kulüp Oyuncusu'}
                  </span>
                  <span className="text-[11px] text-neutral-400">
                    Kart: <strong className="text-amber-400">#{linkedPlayer?.number} {linkedPlayer?.name}</strong>
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-neutral-500">
                  <span className="font-mono text-neutral-400 flex items-center gap-1 truncate max-w-full">
                    <Link2 className="w-3 h-3 shrink-0 text-amber-400/70" />
                    <span className="truncate">{fullUrl}</span>
                  </span>
                  {inv.usedByEmail ? (
                    <span className="text-emerald-400 flex items-center gap-1">
                      <Check className="w-3 h-3" /> Kullanıldı: {inv.usedByEmail}
                    </span>
                  ) : (
                    <span className="text-amber-400/80">Henüz kullanılmadı (Bekliyor)</span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => handleRegenerate(inv)}
                  title="Eski linki iptal et ve bu üye için tertemiz yeni link üret"
                  className="px-3 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/35 transition-all cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Yeniden Üret</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleCopy(inv.id)}
                  className={`px-3.5 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
                    isCopied
                      ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/20'
                      : 'bg-neutral-800 hover:bg-neutral-700 text-white'
                  }`}
                >
                  {isCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{isCopied ? 'Kopyalandı!' : 'Linki Kopyala'}</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
