import React, { useRef, useState } from 'react';
import { MatchSquad, Player } from '../../types';
import { toPng } from 'html-to-image';
import { Share2, Download, Check, Sparkles, Bandage, Shield, Zap } from 'lucide-react';

interface Props {
  teamA: MatchSquad;
  teamB: MatchSquad;
  matchTitle: string;
  matchDate: string;
  fairnessRating?: number;
}

export const TacticalPitch: React.FC<Props> = ({
  teamA,
  teamB,
  matchTitle,
  matchDate,
  fairnessRating = 98,
}) => {
  const pitchRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleDownloadPng = async () => {
    if (!pitchRef.current) return;
    try {
      setIsExporting(true);
      const dataUrl = await toPng(pitchRef.current, {
        cacheBust: true,
        quality: 0.95,
        backgroundColor: '#0a0d0a',
      });
      const link = document.createElement('a');
      link.download = `RevirFC_Kadro_${new Date().toISOString().split('T')[0]}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('PNG export failed:', err);
    } finally {
      setIsExporting(false);
    }
  };

  // Render a player node on the tactical pitch
  const renderPlayerBadge = (
    item: MatchSquad['players'][0],
    teamColor: 'green' | 'white'
  ) => {
    const isInjured = item.player.currentStatus === 'light_injury';
    const isTired = item.player.currentStatus === 'tired';
    const isExtra = item.player.currentStatus === 'extra_fit';

    return (
      <div className="flex flex-col items-center group relative select-none">
        {/* Floating badge */}
        <div
          className={`relative w-12 h-14 md:w-16 md:h-20 rounded-xl flex flex-col items-center justify-between p-1 shadow-lg transition-transform hover:scale-110 border ${
            teamColor === 'green'
              ? 'bg-gradient-to-b from-emerald-800 to-emerald-950 border-emerald-400/60 shadow-emerald-950/60'
              : 'bg-gradient-to-b from-neutral-200 to-neutral-400 text-black border-white shadow-black/40'
          }`}
        >
          {/* Header: Role & OVR */}
          <div className="flex items-center justify-between w-full px-0.5 text-[9px] md:text-[10px] font-black">
            <span className={teamColor === 'green' ? 'text-emerald-300' : 'text-neutral-900 font-extrabold'}>
              {item.assignedRole}
            </span>
            <span className={teamColor === 'green' ? 'text-amber-300' : 'text-neutral-900 font-black'}>
              {item.effectiveOVR}
            </span>
          </div>

          {/* Mini avatar */}
          <div className="w-7 h-7 md:w-9 md:h-9 rounded-full overflow-hidden border border-white/30 relative">
            <img
              src={item.player.photoUrl}
              alt={item.player.name}
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).src =
                  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80';
              }}
            />
            {isInjured && (
              <div className="absolute inset-0 bg-rose-600/60 flex items-center justify-center">
                <Bandage className="w-3.5 h-3.5 text-white animate-pulse" />
              </div>
            )}
          </div>

          {/* Jersey number */}
          <span className={`text-[8px] md:text-[9px] font-mono font-bold ${teamColor === 'green' ? 'text-white/80' : 'text-neutral-800'}`}>
            #{item.player.number}
          </span>
        </div>

        {/* Player Name below */}
        <span
          className={`text-[9px] md:text-xs font-bold mt-1 px-1.5 py-0.5 rounded-full backdrop-blur-sm border max-w-[85px] md:max-w-[105px] truncate text-center shadow-md ${
            teamColor === 'green'
              ? 'bg-emerald-950/90 text-emerald-100 border-emerald-500/40'
              : 'bg-neutral-900/90 text-neutral-100 border-neutral-600'
          }`}
        >
          {item.player.name.split(' ')[0]}
          {isInjured && ' 🩹'}
          {isTired && ' 🟠'}
          {isExtra && ' 🔥'}
        </span>
      </div>
    );
  };

  // Separate squad by assigned roles
  const getRoles = (squad: MatchSquad) => {
    const gk = squad.players.filter((p) => p.assignedRole === 'GK');
    const def = squad.players.filter((p) => p.assignedRole === 'DEF');
    const mid = squad.players.filter((p) => p.assignedRole === 'MID');
    const fwd = squad.players.filter((p) => p.assignedRole === 'FWD');
    return { gk, def, mid, fwd };
  };

  const aRoles = getRoles(teamA);
  const bRoles = getRoles(teamB);

  return (
    <div className="space-y-4">
      {/* Action Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-neutral-900/90 p-4 rounded-2xl border border-neutral-800">
        <div>
          <h3 className="text-base font-black text-white flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-400" /> Görsel Halı Saha Taktik Tahtası (6v6)
          </h3>
          <p className="text-xs text-neutral-400 mt-0.5">
            462 kombinasyonlu dengeleme algoritması tarafından oluşturulan dengeli diziliş.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleDownloadPng}
            disabled={isExporting}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-lg shadow-emerald-600/30 transition-all cursor-pointer active:scale-95"
          >
            <Download className="w-4 h-4" />
            {isExporting ? 'Görsel Üretiliyor...' : 'WhatsApp İçin PNG İndir'}
          </button>
        </div>
      </div>

      {/* Printable / Capturable Pitch Container */}
      <div
        ref={pitchRef}
        className="relative bg-gradient-to-b from-[#0b1f10] via-[#0e2715] to-[#08170c] rounded-3xl p-4 md:p-6 border-4 border-emerald-900/60 shadow-2xl overflow-hidden"
      >
        {/* Synthetic Turf Grass Lines */}
        <div
          className="absolute inset-0 opacity-15 pointer-events-none"
          style={{
            backgroundImage:
              'repeating-linear-gradient(0deg, #ffffff 0px, #ffffff 2px, transparent 2px, transparent 40px)',
          }}
        />

        {/* Header inside the image */}
        <div className="relative z-10 flex flex-wrap items-center justify-between border-b border-white/10 pb-3 mb-4 text-white">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center font-black text-emerald-400 text-sm">
              RFC
            </div>
            <div>
              <h2 className="text-sm md:text-base font-black tracking-tight text-white">{matchTitle}</h2>
              <p className="text-[11px] text-emerald-300 font-mono">
                {matchDate} • RevirFC Taktik Dengeleme Raporu
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4 mt-2 sm:mt-0">
            <div className="text-right">
              <span className="text-[10px] text-neutral-400 uppercase font-mono block">Denge Skoru</span>
              <span className="text-emerald-400 font-black text-sm md:text-base">%{fairnessRating} Mükemmel</span>
            </div>
          </div>
        </div>

        {/* Squad Comparison Summary Badges */}
        <div className="relative z-10 grid grid-cols-2 gap-4 mb-4">
          {/* Team A Badge */}
          <div className="bg-emerald-950/80 border border-emerald-500/40 rounded-xl p-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-3.5 h-3.5 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400/80" />
              <span className="font-black text-white text-xs md:text-sm">{teamA.name}</span>
            </div>
            <div className="flex items-center gap-3 text-[11px] font-mono">
              <span className="text-amber-400 font-bold">OVR {teamA.totalOVR}</span>
              <span className="text-neutral-300">PAC {teamA.avgPAC}</span>
              <span className="text-neutral-300">DEF {teamA.avgDEF}</span>
            </div>
          </div>

          {/* Team B Badge */}
          <div className="bg-neutral-900/80 border border-neutral-600 rounded-xl p-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-3.5 h-3.5 rounded-full bg-white shadow-sm shadow-white/80" />
              <span className="font-black text-white text-xs md:text-sm">{teamB.name}</span>
            </div>
            <div className="flex items-center gap-3 text-[11px] font-mono">
              <span className="text-amber-400 font-bold">OVR {teamB.totalOVR}</span>
              <span className="text-neutral-300">PAC {teamB.avgPAC}</span>
              <span className="text-neutral-300">DEF {teamB.avgDEF}</span>
            </div>
          </div>
        </div>

        {/* Tactical Pitch Lines & Field Representation */}
        <div className="relative border-2 border-white/40 rounded-2xl min-h-[580px] p-4 flex flex-col justify-between overflow-hidden bg-emerald-950/30">
          {/* Center Line and Circle */}
          <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-white/40 -translate-y-1/2" />
          <div className="absolute top-1/2 left-1/2 w-28 h-28 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white/40" />
          <div className="absolute top-1/2 left-1/2 w-2 h-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/60" />

          {/* Top Penalty Area (Yeşil Takım Kalesi) */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-24 border-b-2 border-x-2 border-white/40 rounded-b-xl" />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-10 border-b-2 border-x-2 border-white/30" />

          {/* Bottom Penalty Area (Beyaz Takım Kalesi) */}
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-64 h-24 border-t-2 border-x-2 border-white/40 rounded-t-xl" />
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-32 h-10 border-t-2 border-x-2 border-white/30" />

          {/* ================= TEAM A (YEŞİL TAKIM) - TOP HALF ================= */}
          <div className="relative z-10 flex flex-col justify-around gap-6 pt-2 pb-6">
            {/* GK Row */}
            <div className="flex justify-center">
              {aRoles.gk.map((p) => (
                <div key={p.player.id}>{renderPlayerBadge(p, 'green')}</div>
              ))}
            </div>

            {/* DEF Row */}
            <div className="flex justify-around px-8 md:px-16">
              {aRoles.def.map((p) => (
                <div key={p.player.id}>{renderPlayerBadge(p, 'green')}</div>
              ))}
            </div>

            {/* MID Row */}
            <div className="flex justify-around px-12 md:px-24">
              {aRoles.mid.map((p) => (
                <div key={p.player.id}>{renderPlayerBadge(p, 'green')}</div>
              ))}
            </div>

            {/* FWD Row */}
            <div className="flex justify-center">
              {aRoles.fwd.map((p) => (
                <div key={p.player.id}>{renderPlayerBadge(p, 'green')}</div>
              ))}
            </div>
          </div>

          {/* ================= TEAM B (BEYAZ TAKIM) - BOTTOM HALF ================= */}
          <div className="relative z-10 flex flex-col justify-around gap-6 pt-6 pb-2">
            {/* FWD Row */}
            <div className="flex justify-center">
              {bRoles.fwd.map((p) => (
                <div key={p.player.id}>{renderPlayerBadge(p, 'white')}</div>
              ))}
            </div>

            {/* MID Row */}
            <div className="flex justify-around px-12 md:px-24">
              {bRoles.mid.map((p) => (
                <div key={p.player.id}>{renderPlayerBadge(p, 'white')}</div>
              ))}
            </div>

            {/* DEF Row */}
            <div className="flex justify-around px-8 md:px-16">
              {bRoles.def.map((p) => (
                <div key={p.player.id}>{renderPlayerBadge(p, 'white')}</div>
              ))}
            </div>

            {/* GK Row */}
            <div className="flex justify-center">
              {bRoles.gk.map((p) => (
                <div key={p.player.id}>{renderPlayerBadge(p, 'white')}</div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer inside image */}
        <div className="relative z-10 mt-3 pt-2 border-t border-white/10 flex items-center justify-between text-[11px] text-white/60">
          <span>RevirFC Dijital Halı Saha Ekosistemi</span>
          <span>C(11,5) = 462 Kadro Optimizasyonu ile Hesaplanmıştır</span>
        </div>
      </div>
    </div>
  );
};
