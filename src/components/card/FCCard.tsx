import React, { useState } from 'react';
import { Player, CardTheme, PlayerStats } from '../../types';
import { PlayStyleBadge } from './PlayStyleBadge';
import { Bandage, TrendingUp, TrendingDown, Minus, Crown, Flame } from 'lucide-react';

interface Props {
  player: Player;
  overrideStats?: PlayerStats;
  overrideOVR?: number;
  size?: 'sm' | 'md' | 'lg';
  interactive?: boolean;
  onClick?: () => void;
  showBadges?: boolean;
}

export const FCCard: React.FC<Props> = ({
  player,
  overrideStats,
  overrideOVR,
  size = 'md',
  interactive = true,
  onClick,
  showBadges = true,
}) => {
  const [rotate, setRotate] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  const stats = overrideStats || player.stats;
  const ovr = overrideOVR !== undefined ? overrideOVR : player.currentOVR;
  const theme: CardTheme = player.theme;

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!interactive) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const rotX = ((y - centerY) / centerY) * -12;
    const rotY = ((x - centerX) / centerX) * 12;

    setRotate({ x: rotX, y: rotY });
  };

  const handleMouseLeave = () => {
    setRotate({ x: 0, y: 0 });
    setIsHovered(false);
  };

  // Card theme styling
  const getThemeStyles = () => {
    switch (theme) {
      case 'totw':
        return {
          wrapper: 'from-amber-400/80 via-black to-amber-600/60 shadow-amber-500/20 border-amber-400/50',
          bg: 'bg-gradient-to-b from-neutral-900 via-neutral-950 to-black text-amber-100',
          ovrText: 'text-amber-300 drop-shadow-[0_2px_4px_rgba(245,158,11,0.5)]',
          badgeText: 'text-amber-400',
          accent: 'border-amber-500/40 bg-amber-500/10',
          shimmer: 'from-amber-200/20 to-transparent',
          label: 'TOTW • MVP',
        };
      case 'inform':
        return {
          wrapper: 'from-orange-500/90 via-red-950 to-amber-500/80 shadow-orange-500/30 border-orange-500/60',
          bg: 'bg-gradient-to-b from-orange-950 via-neutral-950 to-neutral-900 text-orange-100',
          ovrText: 'text-orange-400 drop-shadow-[0_2px_6px_rgba(249,115,22,0.6)]',
          badgeText: 'text-orange-300',
          accent: 'border-orange-500/40 bg-orange-500/15',
          shimmer: 'from-orange-300/25 to-transparent',
          label: 'IN-FORM 🔥',
        };
      case 'revir':
        return {
          wrapper: 'from-rose-600/80 via-neutral-900 to-red-800/60 shadow-rose-600/30 border-rose-500/50',
          bg: 'bg-gradient-to-b from-rose-950/90 via-neutral-900 to-neutral-950 text-rose-100',
          ovrText: 'text-rose-400 drop-shadow-[0_2px_4px_rgba(244,63,94,0.5)]',
          badgeText: 'text-rose-300',
          accent: 'border-rose-500/40 bg-rose-500/10',
          shimmer: 'from-rose-300/20 to-transparent',
          label: 'REVİR RAPORLU 🩹',
        };
      case 'gold':
      default:
        return {
          wrapper: 'from-yellow-400 via-amber-600 to-yellow-600 shadow-yellow-500/20 border-yellow-300/60',
          bg: 'bg-gradient-to-b from-yellow-950/70 via-neutral-900 to-black text-amber-50',
          ovrText: 'text-yellow-300 drop-shadow-[0_2px_4px_rgba(234,179,8,0.5)]',
          badgeText: 'text-yellow-400',
          accent: 'border-yellow-500/30 bg-yellow-500/10',
          shimmer: 'from-yellow-200/20 to-transparent',
          label: 'GOLD RARE',
        };
    }
  };

  const themeStyle = getThemeStyles();

  // Size configurations
  const sizeConfig = {
    sm: {
      width: 'w-40',
      height: 'h-60',
      ovrText: 'text-2xl',
      posText: 'text-xs',
      photoSize: 'w-20 h-24',
      nameText: 'text-xs',
      statLabel: 'text-[8px]',
      statVal: 'text-[10px]',
      padding: 'p-2',
    },
    md: {
      width: 'w-64',
      height: 'h-96',
      ovrText: 'text-4xl',
      posText: 'text-sm font-bold',
      photoSize: 'w-32 h-36',
      nameText: 'text-base font-extrabold',
      statLabel: 'text-[10px]',
      statVal: 'text-sm font-bold',
      padding: 'p-3.5',
    },
    lg: {
      width: 'w-80',
      height: 'h-[460px]',
      ovrText: 'text-5xl',
      posText: 'text-base font-black',
      photoSize: 'w-44 h-48',
      nameText: 'text-lg font-black',
      statLabel: 'text-xs',
      statVal: 'text-base font-black',
      padding: 'p-4',
    },
  }[size];

  return (
    <div
      style={{
        perspective: '1000px',
      }}
      className={`relative inline-block transition-transform duration-150 ${sizeConfig.width} select-none`}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
    >
      <div
        style={{
          transform: `rotateX(${rotate.x}deg) rotateY(${rotate.y}deg)`,
          transition: isHovered ? 'none' : 'transform 0.4s ease-out',
        }}
        className={`relative ${sizeConfig.height} rounded-2xl p-[2px] bg-gradient-to-b ${themeStyle.wrapper} shadow-2xl transition-shadow ${
          isHovered ? 'shadow-amber-500/30' : ''
        } cursor-pointer group`}
      >
        {/* Inner Card Cardboard */}
        <div className={`w-full h-full rounded-[14px] ${themeStyle.bg} ${sizeConfig.padding} flex flex-col justify-between relative overflow-hidden`}>
          {/* Holographic light sheen reflection */}
          <div
            className={`absolute inset-0 bg-gradient-to-tr ${themeStyle.shimmer} opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-300 mix-blend-overlay`}
          />

          {/* Top Banner: Club & Card Theme */}
          <div className="flex items-center justify-between z-10">
            <span className="text-[10px] tracking-wider uppercase font-black px-2 py-0.5 rounded-full bg-black/40 border border-white/10 backdrop-blur-sm">
              REVIR FC • 27
            </span>
            <div className="flex items-center gap-1">
              {theme === 'totw' && <Crown className="w-3.5 h-3.5 text-amber-400 animate-pulse" />}
              {theme === 'inform' && <Flame className="w-3.5 h-3.5 text-orange-400 animate-bounce" />}
              {theme === 'revir' && <Bandage className="w-3.5 h-3.5 text-rose-400" />}
              <span className={`text-[9px] font-bold tracking-tight uppercase ${themeStyle.badgeText}`}>
                {themeStyle.label}
              </span>
            </div>
          </div>

          {/* Top Info + Photo Section */}
          <div className="flex items-start justify-between mt-1 z-10">
            {/* OVR + Position + Form indicator */}
            <div className="flex flex-col items-center">
              <span className={`font-black tracking-tighter ${sizeConfig.ovrText} ${themeStyle.ovrText} leading-none`}>
                {ovr}
              </span>
              <span className={`tracking-widest uppercase ${sizeConfig.posText} text-white/90 font-bold mt-0.5`}>
                {player.position}
              </span>
              <div className="w-5 h-0.5 bg-white/20 my-1 rounded" />
              <span className="text-[11px] font-mono text-white/60">#{player.number}</span>

              {/* Form Trend */}
              <div className="mt-1" title={`Form Trendi: ${player.formTrend}`}>
                {player.formTrend === 'up' && (
                  <span className="inline-flex items-center text-emerald-400 bg-emerald-950/70 border border-emerald-500/30 rounded px-1 py-0.5 text-[9px]">
                    <TrendingUp className="w-2.5 h-2.5 mr-0.5" /> +Form
                  </span>
                )}
                {player.formTrend === 'down' && (
                  <span className="inline-flex items-center text-rose-400 bg-rose-950/70 border border-rose-500/30 rounded px-1 py-0.5 text-[9px]">
                    <TrendingDown className="w-2.5 h-2.5 mr-0.5" /> -Form
                  </span>
                )}
                {player.formTrend === 'stable' && (
                  <span className="inline-flex items-center text-zinc-400 bg-zinc-900/60 rounded px-1 py-0.5 text-[9px]">
                    <Minus className="w-2.5 h-2.5" />
                  </span>
                )}
              </div>
            </div>

            {/* Player Photo with authentic FC cutout styling */}
            <div className="relative flex-1 flex justify-center items-end">
              <div className={`relative ${sizeConfig.photoSize} overflow-hidden rounded-xl border border-white/10 shadow-lg`}>
                <img
                  src={player.photoUrl}
                  alt={player.name}
                  className="w-full h-full object-cover object-top transition-transform duration-300 group-hover:scale-105"
                  onError={(e) => {
                    // Fallback avatar
                    (e.target as HTMLImageElement).src =
                      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80';
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Player Name and Nickname */}
          <div className="text-center z-10 my-1">
            <h3 className={`uppercase tracking-tight text-white ${sizeConfig.nameText} truncate drop-shadow-md`}>
              {player.name}
            </h3>
            <p className="text-[10px] text-amber-300/80 italic font-medium truncate">
              "{player.nickname}"
            </p>
          </div>

          {/* 6 Core FC 27 Halı Saha Stats Grid */}
          <div className="grid grid-cols-6 gap-0.5 bg-black/40 backdrop-blur-md rounded-xl p-1.5 border border-white/10 z-10 text-center">
            <div className="flex flex-col">
              <span className={`font-mono ${sizeConfig.statVal} text-white`}>{stats.pac}</span>
              <span className={`text-white/50 font-bold ${sizeConfig.statLabel}`}>PAC</span>
            </div>
            <div className="flex flex-col">
              <span className={`font-mono ${sizeConfig.statVal} text-white`}>{stats.sho}</span>
              <span className={`text-white/50 font-bold ${sizeConfig.statLabel}`}>SHO</span>
            </div>
            <div className="flex flex-col">
              <span className={`font-mono ${sizeConfig.statVal} text-white`}>{stats.pas}</span>
              <span className={`text-white/50 font-bold ${sizeConfig.statLabel}`}>PAS</span>
            </div>
            <div className="flex flex-col">
              <span className={`font-mono ${sizeConfig.statVal} text-white`}>{stats.dri}</span>
              <span className={`text-white/50 font-bold ${sizeConfig.statLabel}`}>DRI</span>
            </div>
            <div className="flex flex-col">
              <span className={`font-mono ${sizeConfig.statVal} text-white`}>{stats.def}</span>
              <span className={`text-white/50 font-bold ${sizeConfig.statLabel}`}>DEF</span>
            </div>
            <div className="flex flex-col">
              <span className={`font-mono ${sizeConfig.statVal} text-white`}>{stats.phy}</span>
              <span className={`text-white/50 font-bold ${sizeConfig.statLabel}`}>PHY</span>
            </div>
          </div>

          {/* PlayStyles Badges (if enabled and space permits) */}
          {showBadges && size !== 'sm' && player.playstyles.length > 0 && (
            <div className="flex items-center justify-center gap-1 mt-1 z-10 flex-wrap">
              {player.playstyles.slice(0, 2).map((ps) => (
                <PlayStyleBadge key={ps} styleName={ps} size="sm" />
              ))}
            </div>
          )}

          {/* Ego / Modesty Indicator (if notable) */}
          {size === 'lg' && (
            <div className="mt-2 text-center text-[10px] bg-black/60 rounded p-1 border border-white/5">
              <span className="text-white/60">Öz Algı Farkı: </span>
              <span className={player.egoIndex > 1.0 ? 'text-rose-400 font-bold' : player.egoIndex < -0.8 ? 'text-emerald-400 font-bold' : 'text-zinc-300'}>
                {player.egoIndex > 0 ? `+${player.egoIndex}` : player.egoIndex} ({player.egoIndex > 1.0 ? 'Özgüven Patlaması 🚀' : player.egoIndex < -0.8 ? 'Gizli Kahraman 🛡️' : 'Dengeli ⚖️'})
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
