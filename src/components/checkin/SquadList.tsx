import React, { useState } from 'react';
import { Match, Player, CheckInEntry } from '../../types';
import { FCCard } from '../card/FCCard';
import {
  Users,
  Clock,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  Bandage,
  Moon,
  Flame,
  ArrowRight,
  ShieldAlert,
  Sparkles,
  Trophy,
  Bell,
  Lock,
  ShieldCheck,
} from 'lucide-react';

interface Props {
  match: Match;
  players: Player[];
  claimedPlayer?: Player;
  onOpenCheckIn: (player: Player) => void;
  onRunBalancing: () => void;
  onOpenRating: () => void;
  onOpenCommittee?: () => void;
  onToggleParticipation: (playerId: string) => void;
  onOpenReminderHub?: () => void;
  isPendingUser?: boolean;
  isAdmin?: boolean;
}

export const SquadList: React.FC<Props> = ({
  match,
  players,
  claimedPlayer,
  onOpenCheckIn,
  onRunBalancing,
  onOpenRating,
  onOpenCommittee,
  onToggleParticipation,
  onOpenReminderHub,
  isPendingUser = false,
  isAdmin = false,
}) => {
  const starters = players.filter((p) => match.starters.includes(p.id));
  const waitlist = players.filter((p) => match.waitlist.includes(p.id));

  const isUserStarter = claimedPlayer ? match.starters.includes(claimedPlayer.id) : false;
  const isUserWaitlist = claimedPlayer ? match.waitlist.includes(claimedPlayer.id) : false;
  const userCheckIn = claimedPlayer ? match.checkIns[claimedPlayer.id] : undefined;

  const getStatusBadge = (checkIn?: CheckInEntry) => {
    if (!checkIn) {
      return (
        <span className="text-[10px] text-neutral-400 bg-neutral-800 px-2 py-0.5 rounded border border-neutral-700">
          Check-in Bekliyor
        </span>
      );
    }
    switch (checkIn.status) {
      case 'light_injury':
        return (
          <span className="text-[10px] text-rose-300 bg-rose-950/80 px-2 py-0.5 rounded border border-rose-500/40 flex items-center gap-1 font-bold">
            <Bandage className="w-3 h-3 text-rose-400" /> Revir Raporlu (PAC -%25)
          </span>
        );
      case 'tired':
        return (
          <span className="text-[10px] text-amber-300 bg-amber-950/80 px-2 py-0.5 rounded border border-amber-500/40 flex items-center gap-1 font-bold">
            <Moon className="w-3 h-3 text-amber-400" /> Yorgun (PAC -%15)
          </span>
        );
      case 'extra_fit':
        return (
          <span className="text-[10px] text-orange-300 bg-orange-950/80 px-2 py-0.5 rounded border border-orange-500/40 flex items-center gap-1 font-bold">
            <Flame className="w-3 h-3 text-orange-400" /> İdmanlı / Formda (+%5)
          </span>
        );
      case 'full':
      default:
        return (
          <span className="text-[10px] text-emerald-300 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-500/40 flex items-center gap-1 font-bold">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" /> %100 Hazır
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Match Header Banner */}
      <div className="bg-gradient-to-r from-neutral-900 via-neutral-900 to-amber-950/30 border border-neutral-800 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <img
              src="/logo.jpg"
              alt="Revir FC"
              className="w-14 h-14 md:w-16 md:h-16 rounded-full object-cover border-2 border-amber-400/50 shadow-lg shadow-amber-500/20 shrink-0"
            />
            <div>
              <div className="flex items-center gap-2 text-xs text-amber-400 font-mono font-bold uppercase mb-1">
                <Clock className="w-4 h-4" /> 12 Kişilik Maç Anketi & Canlı Kadro
              </div>
              <h2 className="text-xl md:text-2xl font-black text-white tracking-tight">{match.title}</h2>
              <div className="flex flex-wrap items-center gap-4 mt-2 text-xs text-neutral-400">
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-amber-400" /> {match.pitchName}
                </span>
                <span>•</span>
                <span className="font-mono text-neutral-300">
                  {new Date(match.date).toLocaleDateString('tr-TR', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Action Button for current user */}
          <div className="flex items-center gap-2">
            {isPendingUser ? (
              <div className="bg-amber-500/10 border border-amber-500/30 px-3.5 py-2 rounded-xl text-amber-300 text-xs flex items-center gap-2">
                <Lock className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Hesabınız onay bekliyor. Onaylandığınızda maç kadrosuna katılabilirsiniz.</span>
              </div>
            ) : claimedPlayer ? (
              <button
                onClick={() => onOpenCheckIn(claimedPlayer)}
                className="bg-amber-500 hover:bg-amber-400 text-black font-black text-xs px-4 py-2.5 rounded-xl shadow-lg shadow-amber-500/20 flex items-center gap-2 transition-transform active:scale-95 cursor-pointer"
              >
                <Bandage className="w-4 h-4" />
                {userCheckIn ? 'Revir / Durumumu Güncelle' : 'Sağlık Raporu & Check-In'}
              </button>
            ) : null}

            {isAdmin && (
              <button
                onClick={onRunBalancing}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs px-5 py-2.5 rounded-xl shadow-lg shadow-emerald-600/25 flex items-center gap-2 transition-transform active:scale-95 cursor-pointer"
              >
                <Sparkles className="w-4 h-4" /> 462 Kadro Dengelemeyi Çalıştır
              </button>
            )}

            <button
              onClick={onOpenRating}
              className="bg-neutral-800 hover:bg-neutral-700 text-amber-300 font-bold text-xs px-3.5 py-2.5 rounded-xl border border-amber-500/30 flex items-center gap-1.5"
            >
              <Trophy className="w-4 h-4" /> 360° Puanlama
            </button>

            {isAdmin && onOpenCommittee && (
              <button
                onClick={onOpenCommittee}
                className="bg-gradient-to-r from-amber-600 via-amber-500 to-yellow-500 hover:from-amber-500 hover:to-yellow-400 text-black font-black text-xs px-4 py-2.5 rounded-xl shadow-lg shadow-amber-500/25 flex items-center gap-1.5 transition-transform active:scale-95 cursor-pointer"
                title="Oylama sandığı sonuçlarını incele, MVP, Haftanın Bidonu ve Ateş Ediyo! kartlarına son mührü bas"
              >
                <ShieldCheck className="w-4 h-4 text-black" />
                <span>🔏 Kurul Masası & Son Mühür</span>
                {match.awards?.isConfirmedByCommittee && (
                  <span className="bg-black/30 text-black text-[9px] px-1.5 py-0.5 rounded-full font-black">
                    MÜHÜRLÜ
                  </span>
                )}
              </button>
            )}

            {onOpenReminderHub && (
              <button
                onClick={onOpenReminderHub}
                className="bg-neutral-800 hover:bg-neutral-700 text-white font-bold text-xs px-3.5 py-2.5 rounded-xl border border-neutral-700 flex items-center gap-1.5 cursor-pointer"
                title="Girmeyi unutanlara WhatsApp veya E-Posta hatırlatması gönder"
              >
                <Bell className="w-4 h-4 text-amber-400" /> Hatırlatıcı Gönder
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Grid: 12 Starters vs Waitlist */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* First 12 Starters (8 cols) */}
        <div className="lg:col-span-8 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-white flex items-center gap-2 uppercase tracking-wider">
              <Users className="w-4 h-4 text-emerald-400" /> İlk 12 Kişilik Asil Kadro ({starters.length}/12)
            </h3>
            <span className="text-xs text-neutral-400">
              {starters.length === 12 ? 'Kadro Doldu! Yedek Sırası Açıldı.' : `${12 - starters.length} kişilik boş yer var`}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {starters.map((player, index) => {
              const checkIn = match.checkIns[player.id];
              return (
                <div
                  key={player.id}
                  className="p-3.5 bg-neutral-900/90 border border-neutral-800 rounded-2xl flex items-center justify-between hover:border-neutral-700 transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono font-bold text-neutral-500 w-4">
                      {index + 1}.
                    </span>
                    <img
                      src={player.photoUrl}
                      alt={player.name}
                      className="w-11 h-11 rounded-xl object-cover border border-white/20"
                    />
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-bold text-white">{player.name}</span>
                        <span className="text-[11px] font-mono font-bold text-amber-400">
                          {player.currentOVR}
                        </span>
                      </div>
                      <div className="mt-1">{getStatusBadge(checkIn)}</div>
                    </div>
                  </div>

                  {(isAdmin || (claimedPlayer && claimedPlayer.id === player.id)) && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => onOpenCheckIn(player)}
                        title="Revir & Sağlık Durumunu Değiştir"
                        className="p-1.5 text-neutral-400 hover:text-amber-400 hover:bg-neutral-800 rounded-lg transition-colors cursor-pointer"
                      >
                        <Bandage className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onToggleParticipation(player.id)}
                        title="Sakatlandım / Çıkıyorum (1. Yedek otomatik asil kadroya girer)"
                        className="p-1.5 text-neutral-500 hover:text-rose-400 hover:bg-neutral-800 rounded-lg text-xs cursor-pointer"
                      >
                        ✕
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Waitlist (Akıllı Yedek Kulübesi) (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-white flex items-center gap-2 uppercase tracking-wider">
              <Clock className="w-4 h-4 text-amber-400" /> Akıllı Yedek Kulübesi ({waitlist.length})
            </h3>
            <span className="text-[10px] text-neutral-400">13. ve 14. Kişi</span>
          </div>

          <div className="bg-neutral-900/90 border border-neutral-800 rounded-2xl p-4 space-y-3">
            <p className="text-xs text-neutral-400">
              Asil kadrodan biri "Sakatlandım" bildirimi yaparsa, 1. sıradaki yedek otomatik olarak asil kadroya dahil edilir ve takımlar anında yeniden dengelenir.
            </p>

            {waitlist.length === 0 ? (
              <div className="p-4 bg-neutral-950/60 rounded-xl border border-neutral-800 text-center text-xs text-neutral-500">
                Şu an yedek sırasında kimse yok.
              </div>
            ) : (
              waitlist.map((player, idx) => (
                <div
                  key={player.id}
                  className="p-3 bg-neutral-950/90 rounded-xl border border-neutral-800 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-amber-400 font-bold font-mono">Yedek #{idx + 1}</span>
                    <img
                      src={player.photoUrl}
                      alt={player.name}
                      className="w-8 h-8 rounded-lg object-cover"
                    />
                    <div>
                      <span className="font-bold text-white block">{player.name}</span>
                      <span className="text-[10px] text-neutral-400 font-mono">
                        {player.position} • OVR {player.currentOVR}
                      </span>
                    </div>
                  </div>
                  {isAdmin && (
                    <button
                      onClick={() => onToggleParticipation(player.id)}
                      className="text-xs text-emerald-400 hover:text-emerald-300 font-bold cursor-pointer"
                    >
                      Asile Al ↑
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
