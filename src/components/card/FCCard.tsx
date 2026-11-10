import React, { useState, useRef } from 'react';
import { Player, CardTheme, PlayerStats } from '../../types';
import { PLAYSTYLE_CONFIG } from './PlayStyleBadge';
import { Download } from 'lucide-react';
import { toPng } from 'html-to-image';

interface Props {
  player: Player;
  overrideStats?: PlayerStats;
  overrideOVR?: number;
  size?: 'sm' | 'md' | 'lg';
  interactive?: boolean;
  onClick?: () => void;
  showBadges?: boolean;
  photoInteractive?: boolean;
  onPhotoMouseDown?: (e: React.MouseEvent) => void;
  onPhotoTouchStart?: (e: React.TouchEvent) => void;
  onPhotoWheel?: (e: React.WheelEvent) => void;
  showDownloadButton?: boolean;
}

export const FCCard: React.FC<Props> = ({
  player,
  overrideStats,
  overrideOVR,
  size = 'md',
  interactive = true,
  onClick,
  showBadges = true,
  photoInteractive = false,
  onPhotoMouseDown,
  onPhotoTouchStart,
  onPhotoWheel,
  showDownloadButton = true,
}) => {
  const [rotate, setRotate] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const cardElementRef = useRef<HTMLDivElement>(null);

  const stats = overrideStats || player.stats;
  const ovr = overrideOVR !== undefined ? overrideOVR : player.currentOVR;
  const theme: CardTheme = player.theme || 'gold';

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!interactive || photoInteractive) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const rotX = ((y - centerY) / centerY) * -10;
    const rotY = ((x - centerX) / centerX) * 10;

    setRotate({ x: rotX, y: rotY });
  };

  const handleMouseLeave = () => {
    setRotate({ x: 0, y: 0 });
    setIsHovered(false);
  };

  const handleDownloadCard = async () => {
    if (!cardElementRef.current) return;
    try {
      setIsDownloading(true);
      const dataUrl = await toPng(cardElementRef.current, {
        quality: 1.0,
        pixelRatio: 3,
        cacheBust: true,
      });
      const link = document.createElement('a');
      link.download = `RevirFC_${player.name}_${theme}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Card export failed:', err);
    } finally {
      setIsDownloading(false);
    }
  };

  // 5+1 Card Theme Configurations
  const getThemeConfig = () => {
    switch (theme) {
      case 'totw':
        return {
          template: '/cards/card_totw.jpg',
          ovrColor: 'text-[#FDE68A]',
          nameColor: 'text-white',
          nicknameColor: 'text-[#FBBF24]',
          statValColor: 'text-[#FDE68A]',
          nameTop: 'top-[56%]',
          nicknameTop: 'top-[60.5%]',
          statValTop: 'top-[78.8%]',
          isGold: false,
          label: 'TOTW • MVP',
        };
      case 'inform':
        return {
          template: '/cards/card_inform.jpg',
          ovrColor: 'text-[#FED7AA]',
          nameColor: 'text-white',
          nicknameColor: 'text-[#F97316]',
          statValColor: 'text-[#FED7AA]',
          nameTop: 'top-[56%]',
          nicknameTop: 'top-[60.5%]',
          statValTop: 'top-[78.8%]',
          isGold: false,
          label: 'IN-FORM 🔥',
        };
      case 'revir':
        return {
          template: '/cards/card_revir.jpg',
          ovrColor: 'text-[#BAE6FD]',
          nameColor: 'text-white',
          nicknameColor: 'text-[#38BDF8]',
          statValColor: 'text-[#BAE6FD]',
          nameTop: 'top-[56%]',
          nicknameTop: 'top-[60.5%]',
          statValTop: 'top-[78.8%]',
          isGold: false,
          label: 'REVİR RAPORLU 🩹',
        };
      case 'legend':
        return {
          template: '/cards/card_legend.jpg',
          ovrColor: 'text-[#854D0E]',
          nameColor: 'text-[#1E293B]',
          nicknameColor: 'text-[#B45309]',
          statValColor: 'text-[#854D0E]',
          nameTop: 'top-[58%]',
          nicknameTop: 'top-[62.5%]',
          statValTop: 'top-[78.8%]',
          isGold: false,
          label: 'EFSANE • ICON 👑',
        };
      case 'bidon':
        return {
          template: '/cards/card_bidon.jpg',
          ovrColor: 'text-[#EA580C]',
          nameColor: 'text-[#292524]',
          nicknameColor: 'text-[#78350F]',
          statValColor: 'text-[#78350F]',
          nameTop: 'top-[56%]',
          nicknameTop: 'top-[60.5%]',
          statValTop: 'top-[78.8%]',
          isGold: false,
          label: 'GÜNÜN BİDONU 🛢️',
        };
      case 'gold':
      default:
        return {
          template: '/cards/card_gold.jpg',
          ovrColor: 'text-[#E6C280]',
          nameColor: 'text-white',
          nicknameColor: 'text-[#E6C280]',
          statValColor: 'text-[#E6C280]',
          nameTop: 'top-[57.5%]',
          nicknameTop: 'top-[62.8%]',
          statValTop: 'top-[75.8%]',
          isGold: true,
          label: 'GOLD RARE',
        };
    }
  };

  const themeConfig = getThemeConfig();

  // Size configurations proportional to 764x1024
  const sizeConfig = {
    sm: {
      width: 'w-44',
      height: 'h-[235px]',
      ovrText: 'text-2xl',
      posText: 'text-[9px]',
      numberText: 'text-[8px]',
      nameText: 'text-xs',
      nicknameText: 'text-[9px]',
      statVal: 'text-[9px]',
      flagSize: 'w-3.5 h-2.5',
      logoSize: 'w-3.5 h-3.5',
    },
    md: {
      width: 'w-68',
      height: 'h-[362px]',
      ovrText: 'text-4xl',
      posText: 'text-xs font-black',
      numberText: 'text-[10px]',
      nameText: 'text-base font-black',
      nicknameText: 'text-xs font-bold',
      statVal: 'text-sm font-black',
      flagSize: 'w-5 h-3.5',
      logoSize: 'w-5 h-5',
    },
    lg: {
      width: 'w-84',
      height: 'h-[448px]',
      ovrText: 'text-5xl',
      posText: 'text-sm font-black',
      numberText: 'text-xs',
      nameText: 'text-xl font-black',
      nicknameText: 'text-sm font-bold',
      statVal: 'text-base font-black',
      flagSize: 'w-6 h-4',
      logoSize: 'w-6 h-6',
    },
  }[size];

  return (
    <div
      style={{ perspective: '1000px' }}
      className={`relative inline-block ${sizeConfig.width} select-none group`}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
    >
      {/* 3D Tilting Card Container */}
      <div
        ref={cardElementRef}
        style={{
          transform: !photoInteractive ? `rotateX(${rotate.x}deg) rotateY(${rotate.y}deg)` : undefined,
          transition: isHovered && !photoInteractive ? 'none' : 'transform 0.3s ease-out',
        }}
        className={`relative ${sizeConfig.height} w-full rounded-2xl overflow-hidden shadow-2xl ${
          isHovered ? 'shadow-amber-500/25' : ''
        } cursor-pointer`}
      >
        {/* KATMAN 1: ARKA TABLA & ŞABLON (Template Graphics) */}
        <img
          src={themeConfig.template}
          alt={themeConfig.label}
          className="absolute inset-0 w-full h-full object-fill pointer-events-none select-none z-0"
        />

        {/* KATMAN 2: OYUNCU FOTOĞRAFI (Cutout / Photo with Transform) */}
        <div
          className="absolute top-[12%] left-[16%] right-[10%] h-[47%] flex items-center justify-center z-10 overflow-hidden"
          style={{
            maskImage: 'linear-gradient(to bottom, black 72%, transparent 100%)',
            WebkitMaskImage: 'linear-gradient(to bottom, black 72%, transparent 100%)',
          }}
        >
          <div
            onMouseDown={photoInteractive ? onPhotoMouseDown : undefined}
            onTouchStart={photoInteractive ? onPhotoTouchStart : undefined}
            onWheel={photoInteractive ? onPhotoWheel : undefined}
            className={`w-full h-full flex items-center justify-center ${
              photoInteractive ? 'cursor-grab active:cursor-grabbing touch-none ring-2 ring-amber-400 rounded-xl' : ''
            }`}
            title={photoInteractive ? 'Fotoğrafı sürükleyin veya fare tekerleğiyle yakınlaştırın' : undefined}
          >
            <img
              src={player.photoUrl}
              alt={player.name}
              style={{
                transform: player.photoAdjustments
                  ? `translate(${player.photoAdjustments.x * 1.5}%, ${player.photoAdjustments.y * 1.5}%) scale(${player.photoAdjustments.scale})`
                  : undefined,
                transformOrigin: 'center center',
              }}
              className="max-h-full object-contain pointer-events-none select-none transition-transform duration-75"
              draggable={false}
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/players/alper.jpg';
              }}
            />

            {/* Interactive Mode Guide Indicator */}
            {photoInteractive && (
              <span className="absolute bottom-1 bg-black/85 text-[8px] text-amber-300 font-bold px-1.5 py-0.5 rounded border border-amber-400/40 pointer-events-none">
                ✋ Sürükle / Zoom
              </span>
            )}
          </div>
        </div>

        {/* KATMAN 3: HOLOGRAFİK IŞIK PARLAMASI (Shimmer on Hover) */}
        <div
          className="absolute inset-0 bg-gradient-to-tr from-amber-200/10 via-white/5 to-transparent opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-300 mix-blend-overlay z-15"
        />

        {/* KATMAN 4: ÜST METİN & CANLI VERİLER (HTML/CSS Absolute Layers) */}

        {/* Sol Üst Bilgi Bloğu: OVR + Mevki + Numara + Bayrak + Revir Logosu */}
        <div className="absolute top-[13%] left-[9.5%] flex flex-col items-center z-20 pointer-events-none select-none">
          {/* OVR */}
          <span className={`font-black tracking-tighter leading-none ${themeConfig.ovrColor} ${sizeConfig.ovrText} drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]`}>
            {ovr}
          </span>
          {/* Mevki */}
          <span className={`tracking-wider uppercase text-white/90 mt-0.5 ${sizeConfig.posText} drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]`}>
            {player.position}
          </span>
          {/* Forma Numarası */}
          <span className={`font-mono text-white/60 font-bold ${sizeConfig.numberText}`}>
            #{player.number}
          </span>
          {/* Ayraç */}
          <div className="w-4 h-[1.5px] bg-white/30 my-1 rounded-full" />
          {/* Türk Bayrağı */}
          <div className={`${sizeConfig.flagSize} rounded-[2px] overflow-hidden border border-white/30 shadow-xs flex items-center justify-center bg-red-600 my-0.5`}>
            <span className="text-[10px] leading-none">🇹🇷</span>
          </div>
          {/* Kulüp Logosu */}
          <img
            src="/logo.jpg"
            alt="Revir FC"
            className={`${sizeConfig.logoSize} rounded-full object-cover border border-amber-400/50 shadow-md shadow-amber-500/20 mt-0.5`}
          />
        </div>

        {/* Altın Kart İçin Sağ Üst Arması (Eğer template üzerinde yoksa) */}
        {themeConfig.isGold && (
          <div className="absolute top-[13%] right-[10%] z-20 pointer-events-none select-none opacity-90">
            <div className="w-6 h-7 rounded-t-sm rounded-b-md bg-gradient-to-b from-amber-300 via-amber-500 to-amber-700 p-[1.5px] shadow-md shadow-amber-500/30">
              <div className="w-full h-full bg-black/60 rounded-b-sm flex items-center justify-center text-[10px]">
                ⚽
              </div>
            </div>
          </div>
        )}

        {/* Oyuncu Adı ve Halı Saha Lakabı */}
        <div
          className={`absolute left-[10%] right-[10%] ${themeConfig.nameTop} flex flex-col items-center justify-center text-center z-20 pointer-events-none`}
        >
          <h3 className={`font-black uppercase tracking-wide ${themeConfig.nameColor} ${sizeConfig.nameText} drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] truncate w-full`}>
            {player.name}
          </h3>
          <span className={`italic font-bold ${themeConfig.nicknameColor} ${sizeConfig.nicknameText} drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] -mt-0.5 truncate`}>
            "{player.nickname}"
          </span>
        </div>

        {/* PlayStyles Rozetleri */}
        {showBadges && (
          <>
            {themeConfig.isGold ? (
              /* Altın Kart: Alt Orta Hap (Pill) Rozeti */
              <div className="absolute bottom-[3.5%] left-1/2 -translate-x-1/2 z-20 pointer-events-none">
                {player.playstyles.length > 0 && (
                  <div className="bg-[#0b2927]/95 border border-[#2dd4bf]/70 rounded-full px-2.5 py-0.5 flex items-center gap-1.5 shadow-lg shadow-[#042f2e]/60">
                    <span className="text-[11px]">❄️</span>
                    <span className="text-[9px] font-bold text-[#5eead4] whitespace-nowrap tracking-tight">
                      {PLAYSTYLE_CONFIG[player.playstyles[0]]?.label || 'Soğukkanlı Bitirici'}
                    </span>
                  </div>
                )}
              </div>
            ) : (
              /* Diğer Kartlar: 2 Oval Rozet Yuvası */
              <div className="absolute top-[65.2%] left-[30%] right-[30%] flex justify-between items-center z-20 pointer-events-none">
                {player.playstyles.slice(0, 2).map((ps, idx) => (
                  <div
                    key={idx}
                    className="w-10 h-6 rounded-full flex items-center justify-center bg-black/50 backdrop-blur-xs border border-amber-400/40 text-[10px] font-bold shadow-sm"
                    title={PLAYSTYLE_CONFIG[ps]?.label}
                  >
                    <span className="text-[11px] leading-none">
                      {idx === 0 ? '⚡' : '🔥'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* 6 Temel Saha İstatistiği (HIZ ŞUT PAS DRİ SAV FİZ) */}
        <div
          className={`absolute left-[7.5%] right-[7.5%] ${themeConfig.statValTop} flex items-center justify-between text-center pointer-events-none z-20`}
        >
          {[
            { val: stats.pac },
            { val: stats.sho },
            { val: stats.pas },
            { val: stats.dri },
            { val: stats.def },
            { val: stats.phy },
          ].map((item, idx) => (
            <div key={idx} className="w-[16.66%] flex justify-center">
              <span className={`font-black font-mono tracking-tight ${themeConfig.statValColor} ${sizeConfig.statVal} drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]`}>
                {item.val}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* WhatsApp / Instagram İndirme Butonu (Hover'da Çıkar) */}
      {showDownloadButton && !photoInteractive && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleDownloadCard();
          }}
          disabled={isDownloading}
          className="absolute -bottom-7 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-neutral-900/90 hover:bg-neutral-800 text-amber-400 border border-amber-400/40 text-[10px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-lg cursor-pointer whitespace-nowrap z-30"
          title="WhatsApp ve Instagram için HD PNG İndir"
        >
          <Download className="w-3 h-3" />
          {isDownloading ? 'İndiriliyor...' : 'Kartı İndir (PNG)'}
        </button>
      )}
    </div>
  );
};
