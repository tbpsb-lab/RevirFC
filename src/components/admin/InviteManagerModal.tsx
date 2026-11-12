import React, { useState } from 'react';
import { Player, UserRole, InviteToken } from '../../types';
import { getSavedInvites, createNewInvite } from '../../services/inviteService';
import { Link2, Copy, Check, Plus, Sparkles, Shield, UserCheck, KeyRound } from 'lucide-react';

interface Props {
  players: Player[];
}

export const InviteManagerModal: React.FC<Props> = ({ players }) => {
  const [invites, setInvites] = useState<InviteToken[]>(getSavedInvites());
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // New Invite form state
  const [showForm, setShowForm] = useState(false);
  const [targetName, setTargetName] = useState('');
  const [targetRole, setTargetRole] = useState<UserRole>('player');
  const [targetPlayerId, setTargetPlayerId] = useState(players[0]?.id || 'p1');

  const getFullInviteUrl = (tokenId: string) => {
    const origin = window.location.origin;
    const pathname = window.location.pathname.replace(/\/$/, '');
    return `${origin}${pathname}/?invite=${tokenId}`;
  };

  const handleCopy = (tokenId: string) => {
    const url = getFullInviteUrl(tokenId);
    navigator.clipboard.writeText(url);
    setCopiedId(tokenId);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleCreateInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetName) return;

    const matchedPlayer = players.find((p) => p.id === targetPlayerId);
    const roleSlug = targetRole === 'admin' ? 'admin' : targetRole === 'captain' ? 'kurul' : 'oyuncu';
    const cleanName = targetName.toLowerCase().replace(/[^a-z0-9]/gi, '');
    const customId = `${roleSlug}-${cleanName}-${Math.floor(100 + Math.random() * 900)}`;

    const newInv = createNewInvite({
      id: customId,
      name: targetName,
      role: targetRole,
      claimedPlayerId: targetPlayerId,
      description: `${targetName} (${matchedPlayer?.name || ''} Kartı) İçin Özel Yetkili Davet`,
    });

    setInvites(getSavedInvites());
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
          </h3>
          <p className="text-xs text-neutral-400 mt-0.5">
            Üyeler yalnızca bu linklerle kayıt olabilir. Linke tıklayan kişi Google veya şifresiyle giriş yaptığında doğrudan linkteki yetki ve karta kavuşur.
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
                <option value="admin">👑 Kulüp Yöneticisi & Kaptan</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] font-bold text-neutral-400 block mb-1">Eşleşecek Kart</label>
              <select
                value={targetPlayerId}
                onChange={(e) => setTargetPlayerId(e.target.value)}
                className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
              >
                {players.map((p) => (
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
              className="px-3 py-1.5 rounded-xl text-xs text-neutral-400 hover:text-white"
            >
              İptal
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-black text-xs shadow-md"
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

          return (
            <div
              key={inv.id}
              className="p-3.5 bg-neutral-950/70 hover:bg-neutral-950 rounded-2xl border border-neutral-800/80 flex flex-wrap items-center justify-between gap-3 transition-colors"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
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
                    {inv.role === 'admin' ? '👑 Yönetici' : inv.role === 'captain' ? '⭐ Kurul Üyesi' : '🏃 Oyuncu'}
                  </span>
                  <span className="text-[11px] text-neutral-400">
                    Kart: <strong className="text-amber-400">#{linkedPlayer?.number} {linkedPlayer?.name}</strong>
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-neutral-500">
                  <span className="font-mono text-neutral-400">{inv.id}</span>
                  {inv.usedByEmail ? (
                    <span className="text-emerald-400 flex items-center gap-1">
                      <Check className="w-3 h-3" /> Kullanıldı: {inv.usedByEmail}
                    </span>
                  ) : (
                    <span className="text-amber-400/80">Henüz kullanılmadı (Bekliyor)</span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
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
