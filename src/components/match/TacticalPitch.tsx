import React, { useRef, useState } from 'react';
import { CardTheme, MatchSquad, Player } from '../../types';
import { toPng } from 'html-to-image';
import { Download, Sparkles, Bandage } from 'lucide-react';

interface Props {
  teamA: MatchSquad;
  teamB: MatchSquad;
  matchTitle: string;
  matchDate: string;
  fairnessRating?: number;
}

const THEME_TEMPLATES: Record<CardTheme, string> = {
  gold: '/cards/card_gold.png',
  totw: '/cards/card_totw.png',
  inform: '/cards/card_inform.png',
  revir: '/cards/card_revir.png',
  legend: '/cards/card_legend.png',
  bidon: '/cards/card_bidon.png',
};

const THEME_SHIELDS: Record<CardTheme, string> = {
  gold: '/cards/gold_shield.png',
  totw: '/cards/totw_shield.png',
  inform: '/cards/inform_shield.png',
  revir: '/cards/revir_shield.png',
  legend: '/cards/legend_shield.png',
  bidon: '/cards/bidon_shield.png',
};

const THEME_COLORS: Record<CardTheme, { ovr: string; role: string; name: string }> = {
  gold: { ovr: 'text-[#F5D77F]', role: 'text-[#E5C07B]', name: 'text-amber-100' },
  totw: { ovr: 'text-[#FDE68A]', role: 'text-[#FBBF24]', name: 'text-white' },
  inform: { ovr: 'text-[#FED7AA]', role: 'text-[#FB923C]', name: 'text-orange-100' },
  revir: { ovr: 'text-[#7DD3FC]', role: 'text-[#38BDF8]', name: 'text-sky-100' },
  legend: { ovr: 'text-[#FEF08A]', role: 'text-[#FDE68A]', name: 'text-neutral-900 font-extrabold' },
  bidon: { ovr: 'text-[#EA580C]', role: 'text-[#C2410C]', name: 'text-amber-950 font-extrabold' },
};

export const TacticalPitch: React.FC<Props> = ({
  teamA,
  teamB,
  matchTitle,
  matchDate,
  fairnessRating = 98,
}) => {
  const pitchRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);

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

  // Render a player node as a mini thematic FC card on the tactical pitch
  const renderPlayerBadge = (
    item: MatchSquad['players'][0],
    teamColor: 'green' | 'white'
  ) => {
    const isInjured = item.player.currentStatus === 'light_injury';
    const isTired = item.player.currentStatus === 'tired';
    const isExtra = item.player.currentStatus === 'extra_fit';
    const theme: CardTheme = item.player.theme || 'gold';
    const colors = THEME_COLORS[theme] || THEME_COLORS.gold;

    return (
      <div className="flex flex-col items-center group relative select-none">
        {/* Mini Thematic FC Card (Anasayfadaki temanın sadeleştirilmiş kompakt versiyonu) */}
        <div
          className={`relative w-[44px] h-[58px] sm:w-[50px] sm:h-[66px] md:w-[56px] md:h-[74px] rounded-lg transition-transform hover:scale-115 duration-150 cursor-pointer ${
            teamColor === 'green'
              ? 'hover:drop-shadow-[0_0_10px_rgba(52,211,153,0.7)]'
              : 'hover:drop-shadow-[0_0_10px_rgba(255,255,255,0.7)]'
          }`}
        >
          {/* Kart Teması Şablonu (Arka Plan) */}
          <img
            src={THEME_TEMPLATES[theme]}
            alt={theme}
            className="absolute inset-0 w-full h-full object-contain pointer-events-none select-none z-0"
          />

          {/* Oyuncu Fotoğrafı (Cutout Frame) */}
          <div
            className="absolute top-[13%] left-[16%] right-[12%] h-[48%] overflow-hidden flex items-center justify-center pointer-events-none z-10"
            style={{
              maskImage: 'linear-gradient(to bottom, black 72%, transparent 100%)',
              WebkitMaskImage: 'linear-gradient(to bottom, black 72%, transparent 100%)',
            }}
          >
            <img
              src={item.player.photoUrl}
              alt={item.player.name}
              style={{
                transform: item.player.photoAdjustments
                  ? `translate(${item.player.photoAdjustments.x}%, ${item.player.photoAdjustments.y}%) scale(${item.player.photoAdjustments.scale})`
                  : undefined,
                transformOrigin: 'center center',
              }}
              className="max-h-full max-w-full object-contain pointer-events-none select-none"
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/players/alper.png';
              }}
            />
          </div>

          {/* Sol Üst: OVR & Mevki */}
          <div className="absolute top-[12%] left-[14%] flex flex-col items-center leading-none pointer-events-none z-20">
            <span
              className={`text-[9px] sm:text-[10px] md:text-[11px] font-black ${colors.ovr} drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)]`}
            >
              {item.effectiveOVR}
            </span>
            <span
              className={`text-[6.5px] sm:text-[7px] md:text-[8px] font-black uppercase ${colors.role} drop-shadow-[0_1px_1px_rgba(0,0,0,0.95)] mt-0.5`}
            >
              {item.assignedRole}
            </span>
          </div>

          {/* Sağ Üst: Tema Arması */}
          <img
            src={THEME_SHIELDS[theme]}
            alt=""
            className={`absolute ${
              theme === 'totw'
                ? 'top-[10%] right-[11%] w-2.5 h-3.5 sm:w-3.5 sm:h-4.5 md:w-4 md:h-5'
                : 'top-[12%] right-[14%] w-2 h-2.5 sm:w-2.5 sm:h-3 md:w-3 md:h-3.5'
            } object-contain pointer-events-none z-20 opacity-90 drop-shadow-sm select-none`}
          />

          {/* İsim Plakası (Kart üzerinde) */}
          <div className="absolute bottom-[23%] left-[10%] right-[10%] flex items-center justify-center text-center pointer-events-none z-20">
            <span
              className={`text-[6.5px] sm:text-[7px] md:text-[8px] font-black uppercase truncate w-full ${colors.name} drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)]`}
            >
              {item.player.nickname || item.player.name.split(' ')[0]}
            </span>
          </div>

          {/* Takım Renk Çerçevesi (Yeşil vs Beyaz Takım) */}
          <div
            className={`absolute inset-0 rounded-lg pointer-events-none z-30 border ${
              teamColor === 'green'
                ? 'border-emerald-400/50 shadow-[0_0_6px_rgba(16,185,129,0.35)]'
                : 'border-white/60 shadow-[0_0_6px_rgba(255,255,255,0.3)]'
            }`}
          />

          {/* Durum Göstergesi (Sakatlık / Yorgunluk / Ekstra Fit) */}
          {isInjured && (
            <span className="absolute -top-1.5 -right-1.5 z-40 text-xs drop-shadow animate-bounce pointer-events-none">
              🩹
            </span>
          )}
          {isTired && (
            <span className="absolute -top-1.5 -right-1.5 z-40 text-xs drop-shadow pointer-events-none">
              🟠
            </span>
          )}
          {isExtra && (
            <span className="absolute -top-1.5 -right-1.5 z-40 text-xs drop-shadow animate-pulse pointer-events-none">
              🔥
            </span>
          )}
        </div>

        {/* Kart Altı Kompakt Oyuncu Etiketi */}
        <div
          className={`flex items-center gap-1 mt-0.5 px-1.5 py-0.5 rounded-full border text-[8px] sm:text-[8.5px] md:text-[9.5px] font-black tracking-tight shadow-md max-w-[70px] sm:max-w-[80px] md:max-w-[95px] truncate ${
            teamColor === 'green'
              ? 'bg-emerald-950/95 text-emerald-200 border-emerald-500/50'
              : 'bg-neutral-900/95 text-neutral-100 border-neutral-500/70'
          }`}
        >
          <span className="text-[7px] sm:text-[7.5px] font-mono text-amber-400 shrink-0">#{item.player.number}</span>
          <span className="truncate">{item.player.name.split(' ')[0]}</span>
        </div>
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
    <div className="space-y-3">
      {/* Action Header */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 bg-neutral-900/90 p-3 sm:p-4 rounded-2xl border border-neutral-800">
        <div>
          <h3 className="text-sm sm:text-base font-black text-white flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-400" /> Görsel Halı Saha Taktik Tahtası (6v6)
          </h3>
          <p className="text-[11px] sm:text-xs text-neutral-400 mt-0.5">
            462 kombinasyonlu dengeleme algoritması tarafından oluşturulan dengeli diziliş.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleDownloadPng}
            disabled={isExporting}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-3.5 py-2 rounded-xl shadow-lg shadow-emerald-600/30 transition-all cursor-pointer active:scale-95"
          >
            <Download className="w-3.5 h-3.5" />
            {isExporting ? 'Görsel Üretiliyor...' : 'WhatsApp İçin PNG İndir'}
          </button>
        </div>
      </div>

      {/* Printable / Capturable Pitch Container (Daha Kompakt & Odaklanmış) */}
      <div
        ref={pitchRef}
        className="relative bg-gradient-to-b from-[#0b1f10] via-[#0e2715] to-[#08170c] rounded-2xl p-2.5 sm:p-4 border-2 border-emerald-900/60 shadow-2xl overflow-hidden"
      >
        {/* Synthetic Turf Grass Lines */}
        <div
          className="absolute inset-0 opacity-15 pointer-events-none"
          style={{
            backgroundImage:
              'repeating-linear-gradient(0deg, #ffffff 0px, #ffffff 2px, transparent 2px, transparent 32px)',
          }}
        />

        {/* Header inside the image */}
        <div className="relative z-10 flex flex-wrap items-center justify-between border-b border-white/10 pb-2 mb-2.5 text-white">
          <div className="flex items-center gap-2.5">
            <img
              src="/logo.jpg"
              alt="Revir FC"
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-full object-cover border border-emerald-400/60 shadow-md shadow-emerald-500/30"
            />
            <div>
              <h2 className="text-xs sm:text-sm md:text-base font-black tracking-tight text-white">{matchTitle}</h2>
              <p className="text-[10px] sm:text-[11px] text-emerald-300 font-mono">
                {matchDate} • RevirFC Taktik Dengeleme Raporu
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 mt-1 sm:mt-0">
            <div className="text-right">
              <span className="text-[9px] sm:text-[10px] text-neutral-400 uppercase font-mono block">Denge Skoru</span>
              <span className="text-emerald-400 font-black text-xs sm:text-sm">%{fairnessRating} Mükemmel</span>
            </div>
          </div>
        </div>

        {/* Squad Comparison Summary Badges (Kompakt Tasarım) */}
        <div className="relative z-10 grid grid-cols-2 gap-2 sm:gap-3 mb-2.5">
          {/* Team A Badge */}
          <div className="bg-emerald-950/80 border border-emerald-500/40 rounded-xl px-2.5 py-1.5 sm:px-3 sm:py-2 flex items-center justify-between">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400/80" />
              <span className="font-black text-white text-[11px] sm:text-xs md:text-sm">{teamA.name}</span>
            </div>
            <div className="flex items-center gap-2 sm:gap-3 text-[10px] sm:text-[11px] font-mono">
              <span className="text-amber-400 font-bold">OVR {teamA.totalOVR}</span>
              <span className="text-neutral-300 hidden xs:inline">PAC {teamA.avgPAC}</span>
              <span className="text-neutral-300 hidden xs:inline">DEF {teamA.avgDEF}</span>
            </div>
          </div>

          {/* Team B Badge */}
          <div className="bg-neutral-900/80 border border-neutral-600 rounded-xl px-2.5 py-1.5 sm:px-3 sm:py-2 flex items-center justify-between">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-white shadow-sm shadow-white/80" />
              <span className="font-black text-white text-[11px] sm:text-xs md:text-sm">{teamB.name}</span>
            </div>
            <div className="flex items-center gap-2 sm:gap-3 text-[10px] sm:text-[11px] font-mono">
              <span className="text-amber-400 font-bold">OVR {teamB.totalOVR}</span>
              <span className="text-neutral-300 hidden xs:inline">PAC {teamB.avgPAC}</span>
              <span className="text-neutral-300 hidden xs:inline">DEF {teamB.avgDEF}</span>
            </div>
          </div>
        </div>

        {/* Tactical Pitch Lines & Field Representation (Kompakt Saha) */}
        <div className="relative border-2 border-white/35 rounded-xl min-h-[440px] sm:min-h-[470px] md:min-h-[500px] p-2 sm:p-3 flex flex-col justify-between overflow-hidden bg-emerald-950/30">
          {/* Center Line and Circle */}
          <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-white/35 -translate-y-1/2" />
          <div className="absolute top-1/2 left-1/2 w-20 h-20 sm:w-24 sm:h-24 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white/35 flex items-center justify-center overflow-hidden">
            <img
              src="/logo.jpg"
              alt="Center Circle Watermark"
              className="w-16 h-16 sm:w-20 sm:h-20 rounded-full object-cover opacity-20 pointer-events-none select-none mix-blend-screen"
            />
          </div>
          <div className="absolute top-1/2 left-1/2 w-2 h-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/60 pointer-events-none" />

          {/* Top Penalty Area (Yeşil Takım Kalesi) */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 sm:w-56 h-14 sm:h-18 border-b-2 border-x-2 border-white/30 rounded-b-lg" />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 sm:w-28 h-6 sm:h-8 border-b-2 border-x-2 border-white/20" />

          {/* Bottom Penalty Area (Beyaz Takım Kalesi) */}
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-48 sm:w-56 h-14 sm:h-18 border-t-2 border-x-2 border-white/30 rounded-t-lg" />
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-24 sm:w-28 h-6 sm:h-8 border-t-2 border-x-2 border-white/20" />

          {/* ================= TEAM A (YEŞİL TAKIM) - TOP HALF ================= */}
          <div className="relative z-10 flex flex-col justify-around gap-1.5 sm:gap-2.5 pt-0.5 pb-2">
            {/* GK Row */}
            <div className="flex justify-center">
              {aRoles.gk.map((p) => (
                <div key={p.player.id}>{renderPlayerBadge(p, 'green')}</div>
              ))}
            </div>

            {/* DEF Row */}
            <div className="flex justify-around px-4 sm:px-8 md:px-14">
              {aRoles.def.map((p) => (
                <div key={p.player.id}>{renderPlayerBadge(p, 'green')}</div>
              ))}
            </div>

            {/* MID Row */}
            <div className="flex justify-around px-8 sm:px-14 md:px-20">
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
          <div className="relative z-10 flex flex-col justify-around gap-1.5 sm:gap-2.5 pt-2 pb-0.5">
            {/* FWD Row */}
            <div className="flex justify-center">
              {bRoles.fwd.map((p) => (
                <div key={p.player.id}>{renderPlayerBadge(p, 'white')}</div>
              ))}
            </div>

            {/* MID Row */}
            <div className="flex justify-around px-8 sm:px-14 md:px-20">
              {bRoles.mid.map((p) => (
                <div key={p.player.id}>{renderPlayerBadge(p, 'white')}</div>
              ))}
            </div>

            {/* DEF Row */}
            <div className="flex justify-around px-4 sm:px-8 md:px-14">
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
        <div className="relative z-10 mt-2.5 pt-1.5 border-t border-white/10 flex items-center justify-between text-[10px] sm:text-[11px] text-white/60">
          <span>RevirFC Dijital Halı Saha Ekosistemi</span>
          <span>C(11,5) = 462 Kadro Optimizasyonu ile Hesaplanmıştır</span>
        </div>
      </div>
    </div>
  );
};
