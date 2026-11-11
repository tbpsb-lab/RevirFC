import React, { useState } from 'react';
import { UserProfile, Player, UserRole } from '../../types';
import { ShieldCheck, UserPlus, Check, X, UserCheck, AlertTriangle, Sparkles } from 'lucide-react';

interface Props {
  allUsers: UserProfile[];
  players: Player[];
  onApprove: (uid: string, claimedPlayerId: string, role: UserRole) => void;
  onReject: (uid: string) => void;
  onApproveNickname?: (playerId: string) => void;
  onRejectNickname?: (playerId: string) => void;
}

export const AdminApprovalPanel: React.FC<Props> = ({
  allUsers,
  players,
  onApprove,
  onReject,
  onApproveNickname,
  onRejectNickname,
}) => {
  const pendingUsers = allUsers.filter((u) => u.status === 'pending');
  const approvedUsers = allUsers.filter((u) => u.status === 'approved');
  const pendingNicknamePlayers = players.filter((p) => Boolean(p.pendingNickname));

  const [selectedPlayerForUser, setSelectedPlayerForUser] = useState<Record<string, string>>({});
  const [selectedRoleForUser, setSelectedRoleForUser] = useState<Record<string, UserRole>>({});

  const handleSelectPlayer = (uid: string, playerId: string) => {
    setSelectedPlayerForUser((prev) => ({ ...prev, [uid]: playerId }));
  };

  const handleSelectRole = (uid: string, role: UserRole) => {
    setSelectedRoleForUser((prev) => ({ ...prev, [uid]: role }));
  };

  return (
    <div className="bg-neutral-900/90 border border-neutral-800 rounded-3xl p-6 shadow-xl space-y-6">
      <div className="flex items-center justify-between border-b border-neutral-800 pb-4">
        <div>
          <h3 className="text-base font-black text-amber-400 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5" /> Yönetici Onay Paneli (Approval Gate & Profil Eşleştirme)
          </h3>
          <p className="text-xs text-neutral-400 mt-0.5">
            Dışarıdan gelen kayıtlar doğrudan Onay Bekliyor ekranına düşer. Onaylanmadan hiçbir maç veya fotoğraf görünmez.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {pendingNicknamePlayers.length > 0 && (
            <span className="text-xs bg-orange-500/20 text-orange-300 font-bold px-3 py-1 rounded-full border border-orange-500/30">
              {pendingNicknamePlayers.length} Lakap Onayı
            </span>
          )}
          <span className="text-xs bg-amber-500/20 text-amber-300 font-bold px-3 py-1 rounded-full border border-amber-500/30">
            {pendingUsers.length} Üye Onayı
          </span>
        </div>
      </div>

      {/* Pending users list */}
      <div>
        <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-3">
          Onay Bekleyen Başvurular
        </h4>
        {pendingUsers.length === 0 ? (
          <div className="p-4 bg-neutral-950/60 rounded-2xl border border-neutral-800 text-center text-xs text-neutral-400">
            Şu an onay bekleyen üyelik başvurusu bulunmuyor. Soyunma odası kapısı güvende! 🔒
          </div>
        ) : (
          <div className="space-y-3">
            {pendingUsers.map((user) => {
              const defaultPlayer = players[0]?.id;
              const chosenPlayer = selectedPlayerForUser[user.uid] || defaultPlayer;
              const chosenRole = selectedRoleForUser[user.uid] || 'player';

              return (
                <div
                  key={user.uid}
                  className="p-4 bg-neutral-950 border border-amber-500/30 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white text-sm">{user.displayName}</span>
                      <span className="text-xs text-neutral-400 font-mono">({user.email})</span>
                    </div>
                    <p className="text-xs text-amber-400/90 mt-1">
                      Durum: Onay Bekliyor • Kayıt: {new Date(user.createdAt).toLocaleDateString('tr-TR')}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5">
                    {/* Player claim selector */}
                    <div className="flex flex-col">
                      <label className="text-[10px] text-neutral-400 uppercase font-bold">
                        Hangi Oyuncu Kartı İle Eşleşsin?
                      </label>
                      <select
                        value={chosenPlayer}
                        onChange={(e) => handleSelectPlayer(user.uid, e.target.value)}
                        className="bg-neutral-900 border border-neutral-700 text-xs text-white rounded-lg px-2.5 py-1.5 focus:border-amber-400"
                      >
                        {players.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} (#{p.number} - {p.position})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Role selector */}
                    <div className="flex flex-col">
                      <label className="text-[10px] text-neutral-400 uppercase font-bold">Yetki Rolü</label>
                      <select
                        value={chosenRole}
                        onChange={(e) => handleSelectRole(user.uid, e.target.value as UserRole)}
                        className="bg-neutral-900 border border-neutral-700 text-xs text-white rounded-lg px-2.5 py-1.5 focus:border-amber-400"
                      >
                        <option value="player">Oyuncu (Üye)</option>
                        <option value="captain">Kaptan (Organizatör)</option>
                        <option value="admin">Yönetici (Admin)</option>
                      </select>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-1.5 self-end">
                      <button
                        onClick={() => onApprove(user.uid, chosenPlayer, chosenRole)}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-3.5 py-2 rounded-xl flex items-center gap-1 shadow-md shadow-emerald-600/30"
                      >
                        <Check className="w-3.5 h-3.5" /> Onayla
                      </button>
                      <button
                        onClick={() => onReject(user.uid)}
                        className="bg-rose-900/60 hover:bg-rose-800 text-rose-200 text-xs font-bold px-3 py-2 rounded-xl"
                      >
                        <X className="w-3.5 h-3.5" /> Reddet
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Pending Nickname Requests (Oyuncu Lakap Değişikliği Talepleri) */}
      <div className="pt-4 border-t border-neutral-800">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
            Lakap Değişikliği Talepleri ({pendingNicknamePlayers.length})
          </h4>
          <span className="text-[11px] text-neutral-400">
            Kullanıcıların kendi kartları için talep ettiği lakaplar yönetici onayı bekliyor
          </span>
        </div>

        {pendingNicknamePlayers.length === 0 ? (
          <div className="p-4 bg-neutral-950/50 rounded-2xl border border-neutral-800/80 text-center text-xs text-neutral-500">
            Bekleyen oyuncu lakap değişikliği talebi bulunmuyor.
          </div>
        ) : (
          <div className="space-y-3">
            {pendingNicknamePlayers.map((player) => (
              <div
                key={player.id}
                className="p-4 bg-neutral-950 border border-neutral-800 rounded-2xl flex flex-wrap items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3.5">
                  <img
                    src={player.photoUrl}
                    alt={player.name}
                    className="w-12 h-12 rounded-2xl object-cover border-2 border-amber-500/40"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/players/alper.png';
                    }}
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <h5 className="text-sm font-black text-white">{player.name}</h5>
                      <span className="text-[10px] font-mono text-amber-300 font-bold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30">
                        #{player.number} • {player.position}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs mt-1">
                      <span className="text-neutral-500 line-through">
                        Mevcut: &quot;{player.nickname}&quot;
                      </span>
                      <span className="text-neutral-400">→</span>
                      <span className="text-amber-400 font-extrabold italic bg-amber-500/20 px-2 py-0.5 rounded border border-amber-400/40">
                        Talep Edilen: &quot;{player.pendingNickname}&quot;
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onApproveNickname?.(player.id)}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-emerald-600/30 transition-transform active:scale-95 cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" /> Lakabı Onayla
                  </button>
                  <button
                    onClick={() => onRejectNickname?.(player.id)}
                    className="px-3.5 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-rose-300 font-bold text-xs flex items-center gap-1.5 border border-rose-500/30 transition-colors cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" /> Reddet
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Active members snapshot */}
      <div className="pt-4 border-t border-neutral-800">
        <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-3">
          Aktif Onaylı Kulüp Üyeleri ({approvedUsers.length})
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
          {approvedUsers.map((u) => {
            const linkedPlayer = players.find((p) => p.id === u.claimedPlayerId);
            return (
              <div
                key={u.uid}
                className="p-3 bg-neutral-950/80 rounded-xl border border-neutral-800 flex items-center justify-between text-xs"
              >
                <div>
                  <span className="font-bold text-white block truncate">{u.displayName}</span>
                  <span className="text-[10px] text-amber-300">
                    Kart: {linkedPlayer ? linkedPlayer.name : 'Eşleşmemiş'}
                  </span>
                </div>
                <span className="text-[10px] font-mono uppercase bg-neutral-800 text-neutral-300 px-2 py-0.5 rounded">
                  {u.role}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
