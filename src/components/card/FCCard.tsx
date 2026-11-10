import React, { useState, useRef } from 'react';
import { Player, CardTheme, PlayerStats } from '../../types';
import { PLAYSTYLE_CONFIG } from './PlayStyleBadge';
import { getNationFlagUrl, getClubLogoUrl } from '../../data/teamsAndNations';
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

const THEME_SHIELDS: Record<CardTheme, string> = {
  gold: '/cards/gold_shield.png',
  totw: '/cards/totw_shield.png',
  inform: '/cards/inform_shield.png',
  revir: '/cards/revir_shield.png',
  legend: '/cards/legend_shield.png',
  bidon: '/cards/bidon_shield.png',
};

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

    const rotX = ((y - centerY) / centerY) * -13;
    const rotY = ((x - centerX) / centerX) * 13;

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
        backgroundColor: 'transparent',
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

  // 5+1 Card Theme Configurations with transparent PNG templates and pixel-perfect element alignments
  const getThemeConfig = () => {
    switch (theme) {
      case 'totw':
        return {
          template: '/cards/card_totw.png',
          ovrColor: 'text-[#FDE68A]',
          nameColor: 'text-white',
          nicknameColor: 'text-[#FBBF24]',
          statValColor: 'text-[#FDE68A]',
          ovalTextColor: 'text-amber-200',
          ovalIconColor: 'text-amber-400',
          nameTop: 'top-[52.0%]',
          statTop: 'top-[82.2%]',
          statBounds: 'left-[11.3%] right-[11.3%]',
          ovalsTop: 'top-[65.2%]',
          ovalsBounds: 'left-[10.5%] right-[10.5%]',
          ovalsHeight: 'h-[7.2%]',
          photoFrame: 'top-[11%] left-[12%] right-[8%] h-[44%]',
          isGold: false,
          label: 'TOTW • MVP',
        };
      case 'inform':
        return {
          template: '/cards/card_inform.png',
          ovrColor: 'text-[#FED7AA]',
          nameColor: 'text-white',
          nicknameColor: 'text-[#FB923C]',
          statValColor: 'text-[#FED7AA]',
          ovalTextColor: 'text-orange-200',
          ovalIconColor: 'text-orange-400',
          nameTop: 'top-[52.0%]',
          statTop: 'top-[82.2%]',
          statBounds: 'left-[11.3%] right-[11.3%]',
          ovalsTop: 'top-[65.2%]',
          ovalsBounds: 'left-[10.5%] right-[10.5%]',
          ovalsHeight: 'h-[7.2%]',
          photoFrame: 'top-[11%] left-[12%] right-[8%] h-[44%]',
          isGold: false,
          label: 'IN-FORM 🔥',
        };
      case 'revir':
        return {
          template: '/cards/card_revir.png',
          ovrColor: 'text-[#BAE6FD]',
          nameColor: 'text-white',
          nicknameColor: 'text-[#38BDF8]',
          statValColor: 'text-[#BAE6FD]',
          ovalTextColor: 'text-sky-200',
          ovalIconColor: 'text-sky-400',
          nameTop: 'top-[52.0%]',
          statTop: 'top-[82.4%]',
          statBounds: 'left-[11.3%] right-[11.3%]',
          ovalsTop: 'top-[65.2%]',
          ovalsBounds: 'left-[10.5%] right-[10.5%]',
          ovalsHeight: 'h-[7.2%]',
          photoFrame: 'top-[11%] left-[12%] right-[8%] h-[44%]',
          isGold: false,
          label: 'REVİR RAPORLU 🩹',
        };
      case 'legend':
        return {
          template: '/cards/card_legend.png',
          ovrColor: 'text-[#FEF08A]',
          nameColor: 'text-[#1E293B]',
          nicknameColor: 'text-[#B45309]',
          statValColor: 'text-[#78350F]',
          ovalTextColor: 'text-[#78350F]',
          ovalIconColor: 'text-[#B45309]',
          nameTop: 'top-[55.5%]',
          statTop: 'top-[84.2%]',
          statBounds: 'left-[11.3%] right-[11.3%]',
          ovalsTop: 'top-[68.8%]',
          ovalsBounds: 'left-[10.5%] right-[10.5%]',
          ovalsHeight: 'h-[7.2%]',
          photoFrame: 'top-[12%] left-[16%] right-[16%] h-[46%]',
          isGold: false,
          label: 'EFSANE • ICON 👑',
        };
      case 'bidon':
        return {
          template: '/cards/card_bidon.png',
          ovrColor: 'text-[#EA580C]',
          nameColor: 'text-[#1C1917]',
          nicknameColor: 'text-[#78350F]',
          statValColor: 'text-[#78350F]',
          ovalTextColor: 'text-amber-200',
          ovalIconColor: 'text-amber-400',
          nameTop: 'top-[53.2%]',
          statTop: 'top-[81.2%]',
          statBounds: 'left-[11.3%] right-[11.3%]',
          ovalsTop: 'top-[65.6%]',
          ovalsBounds: 'left-[10.5%] right-[10.5%]',
          ovalsHeight: 'h-[7.2%]',
          photoFrame: 'top-[11%] left-[12%] right-[8%] h-[44%]',
          isGold: false,
          label: 'GÜNÜN BİDONU 🛢️',
        };
      case 'gold':
      default:
        return {
          template: '/cards/card_gold.png',
          ovrColor: 'text-[#E5C07B]',
          nameColor: 'text-white',
          nicknameColor: 'text-[#E5C07B]',
          statValColor: 'text-[#E5C07B]',
          ovalTextColor: 'text-[#5eead4]',
          ovalIconColor: 'text-[#5eead4]',
          nameTop: 'top-[53.5%]',
          statTop: 'top-[78.2%]',
          statBounds: 'left-[17%] right-[17%]',
          ovalsTop: '',
          ovalsBounds: '',
          ovalsHeight: '',
          photoFrame: 'top-[12%] left-[12%] right-[8%] h-[47%]',
          isGold: true,
          label: 'GOLD RARE',
        };
    }
  };

  const themeConfig = getThemeConfig();

  // Size configurations proportional to 764x1024
  const sizeConfig = {
    sm: {
      width: 'w-[180px]',
      height: 'h-[241px]',
      ovrText: 'text-2xl',
      posText: 'text-[9px]',
      numberText: 'text-[8px]',
      nameText: 'text-xs',
      nicknameText: 'text-[9px]',
      statVal: 'text-[10px]',
      flagWidth: 'w-5.5 h-3.5',
      logoWidth: 'w-5.5 h-5.5',
      shieldSize: 'w-7 h-8',
      pillText: 'text-[8px]',
      pillPad: 'px-1.5 py-0.5',
    },
    md: {
      width: 'w-[280px]',
      height: 'h-[375px]',
      ovrText: 'text-4xl',
      posText: 'text-xs font-black',
      numberText: 'text-[10px]',
      nameText: 'text-lg font-black',
      nicknameText: 'text-xs font-bold',
      statVal: 'text-sm font-black',
      flagWidth: 'w-8 h-5',
      logoWidth: 'w-8 h-8',
      shieldSize: 'w-11 h-13',
      pillText: 'text-[10px]',
      pillPad: 'px-2.5 py-0.5',
    },
    lg: {
      width: 'w-[360px]',
      height: 'h-[482px]',
      ovrText: 'text-5xl',
      posText: 'text-sm font-black',
      numberText: 'text-xs',
      nameText: 'text-2xl font-black',
      nicknameText: 'text-sm font-bold',
      statVal: 'text-base font-black',
      flagWidth: 'w-10 h-6',
      logoWidth: 'w-10 h-10',
      shieldSize: 'w-14 h-16',
      pillText: 'text-xs',
      pillPad: 'px-3 py-1',
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
      {/* 3D Tilting Card Container - Transparent Background without Box-Shadow */}
      <div
        ref={cardElementRef}
        style={{
          transform: !photoInteractive ? `rotateX(${rotate.x}deg) rotateY(${rotate.y}deg)` : undefined,
          transition: isHovered && !photoInteractive ? 'none' : 'transform 0.3s ease-out',
          transformStyle: 'preserve-3d',
        }}
        className={`relative ${sizeConfig.height} w-full bg-transparent ${
          isHovered ? 'drop-shadow-[0_15px_25px_rgba(245,158,11,0.35)]' : 'drop-shadow-xl'
        } cursor-pointer transition-[filter] duration-200`}
      >
        {/* KATMAN 1: ARKA TABLA & ŞABLON (Transparent PNG, No White Corners!) */}
        <img
          src={themeConfig.template}
          alt={themeConfig.label}
          style={{ transform: 'translateZ(0px)' }}
          className="absolute inset-0 w-full h-full object-contain pointer-events-none select-none z-0"
        />

        {/* KATMAN 2: OYUNCU FOTOĞRAFI (Cutout / Photo with Transform - Fotoğraf hariç dendiği için düz z-0 kalıyor) */}
        <div
          className={`absolute ${themeConfig.photoFrame} flex items-center justify-center z-10 overflow-hidden`}
          style={{
            maskImage: 'linear-gradient(to bottom, black 72%, transparent 100%)',
            WebkitMaskImage: 'linear-gradient(to bottom, black 72%, transparent 100%)',
            transform: 'translateZ(0px)',
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
                  ? `translate(${player.photoAdjustments.x}%, ${player.photoAdjustments.y}%) scale(${player.photoAdjustments.scale})`
                  : undefined,
                transformOrigin: 'center center',
              }}
              className="max-h-full max-w-full object-contain pointer-events-none select-none transition-transform duration-75"
              draggable={false}
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/players/alper.png';
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

        {/* KATMAN 3: ÜST METİN & CANLI VERİLER (3D Parallax Önde Yüzen Katmanlar) */}

        {/* Sol Üst Bilgi Kolonu (OVR, Mevki, Forma No, Bayrak, Kulüp Arması - 3D Parallax: translateZ(60px)) */}
        <div
          className="absolute top-[13.5%] left-[17%] w-[17%] flex flex-col items-center text-center z-20 pointer-events-none select-none"
          style={{ transform: 'translateZ(60px)' }}
        >
          {/* OVR (86) */}
          <span className={`font-black tracking-tighter leading-none ${themeConfig.ovrColor} ${sizeConfig.ovrText} drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]`}>
            {ovr}
          </span>
          {/* Mevki (MID) */}
          <span className={`tracking-wider uppercase text-white font-black mt-1 ${sizeConfig.posText} drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]`}>
            {player.position}
          </span>
          {/* Forma Numarası (#10) */}
          <span className={`font-mono font-bold text-[#A09886] ${sizeConfig.numberText} mt-0.5`}>
            #{player.number}
          </span>
          {/* Ülke Bayrağı (Hover'da hafif dalgalanma efekti) */}
          <img
            src={player.flagUrl || getNationFlagUrl(player.nationality)}
            alt={player.nationName || player.nationality || 'TR'}
            title={player.nationName || 'Türkiye'}
            className={`${sizeConfig.flagWidth} object-cover rounded-[1px] shadow-sm mt-2 border border-white/20 flag-wave-on-hover`}
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src = '/cards/flag_tr.png';
            }}
          />
          {/* Kulüp / Takım Arması (Gereksiz parlamalar kaldırıldı, net 3D logo) */}
          <div className={`relative ${sizeConfig.logoWidth} mt-1.5 rounded-full overflow-hidden shadow-md border border-amber-400/40 bg-black/30 p-0.5`}>
            <img
              src={player.clubLogoUrl || getClubLogoUrl(player.clubId)}
              alt={player.clubName || 'Revir FC'}
              title={player.clubName || 'Revir FC'}
              className="w-full h-full object-contain rounded-full"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = '/cards/logo_badge.png';
              }}
            />
          </div>
        </div>

        {/* Sağ Üst Tema Kalkanı (3D Parallax: translateZ(72px) - Aşırı parlama kaldırıldı, net ve derinlikli 3D kalkan) */}
        <div
          className={`absolute top-[13.0%] right-[13.5%] ${sizeConfig.shieldSize} pointer-events-none z-30 select-none`}
          style={{ transform: 'translateZ(72px)' }}
        >
          <img
            src={THEME_SHIELDS[theme]}
            alt={`${theme} Crest`}
            className="w-full h-full object-contain opacity-95 drop-shadow-[0_6px_12px_rgba(0,0,0,0.7)]"
          />
        </div>

        {/* Oyuncu Adı ve Halı Saha Lakabı (3D Parallax: translateZ(54px)) */}
        <div
          className={`absolute left-0 right-0 ${themeConfig.nameTop} flex flex-col items-center justify-center text-center z-20 pointer-events-none`}
          style={{ transform: 'translateZ(54px)' }}
        >
          {/* Lakap: İsmin üstünde, resmin alt kısmına doğru */}
          <p
            className={`font-bold italic ${themeConfig.nicknameColor} text-[11px] sm:text-xs tracking-wide ${
              theme === 'legend' || theme === 'bidon'
                ? 'drop-shadow-none'
                : 'drop-shadow-[0_2px_4px_rgba(0,0,0,0.95)]'
            } mb-0.5 truncate w-full px-4`}
          >
            "{player.nickname}"
          </p>
          {/* İsim: Tam isimlik kısmının ortasında */}
          <h3
            className={`font-black uppercase tracking-wide ${themeConfig.nameColor} ${
              theme === 'legend' || theme === 'bidon' ? 'text-lg sm:text-xl' : sizeConfig.nameText
            } ${
              theme === 'legend' || theme === 'bidon'
                ? 'drop-shadow-none'
                : 'drop-shadow-[0_2px_5px_rgba(0,0,0,0.95)]'
            } truncate w-full px-4`}
          >
            {player.name}
          </h3>
        </div>

        {/* PlayStyles Rozetleri (3D Parallax: translateZ(64px)) */}
        {showBadges && (
          <>
            {themeConfig.isGold ? (
              /* Altın Kart: Sağ/Orta Alt Rozetleri */
              <div
                className="absolute bottom-[4.8%] right-[8%] left-[8%] flex justify-end items-center gap-1.5 z-20 pointer-events-none select-none"
                style={{ transform: 'translateZ(64px)' }}
              >
                {player.playstyles.slice(0, 2).map((ps, idx) => {
                  const cfg = PLAYSTYLE_CONFIG[ps];
                  if (!cfg) return null;
                  const Icon = cfg.icon;
                  return (
                    <div
                      key={idx}
                      className="bg-[#0c312d]/95 border border-[#14b8a6]/70 rounded-xl px-2.5 py-1 flex items-center gap-1.5 shadow-md shadow-[#042f2e]/60 flex-1 min-w-0 max-w-[49%]"
                      title={`${cfg.label}: ${cfg.description}`}
                    >
                      <Icon className="w-3.5 h-3.5 text-[#5eead4] shrink-0 drop-shadow" />
                      <span className="font-bold text-[#5eead4] truncate tracking-tight text-[10px] sm:text-[11px]">
                        {cfg.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* Diğer Tüm Tematik Kartlar: Köşeleri Yuvarlatılmış Geniş Yatay Dikdörtgen Rozetler */
              <div
                className={`absolute ${themeConfig.ovalsTop} ${themeConfig.ovalsBounds} ${themeConfig.ovalsHeight} flex justify-center items-center gap-2 z-20 pointer-events-none select-none`}
                style={{ transform: 'translateZ(64px)' }}
              >
                {player.playstyles.slice(0, 2).map((ps, idx) => {
                  const cfg = PLAYSTYLE_CONFIG[ps];
                  if (!cfg) return null;
                  const Icon = cfg.icon;
                  const isSingle = player.playstyles.slice(0, 2).length === 1;

                  // Temaya özel rozet kutucuk stilleri
                  const bStyle = (() => {
                    switch (theme) {
                      case 'totw':
                        return {
                          cardBg: 'bg-gradient-to-r from-neutral-950/95 via-[#1a1610]/95 to-neutral-950/95 border border-amber-400/60 shadow-lg shadow-black/80',
                          textColor: 'text-amber-200',
                          iconColor: 'text-amber-400',
                        };
                      case 'inform':
                        return {
                          cardBg: 'bg-gradient-to-r from-[#220707]/95 via-[#3b0b0b]/95 to-[#220707]/95 border border-orange-500/60 shadow-lg shadow-red-950/80',
                          textColor: 'text-orange-200',
                          iconColor: 'text-orange-400',
                        };
                      case 'revir':
                        return {
                          cardBg: 'bg-gradient-to-r from-[#031525]/95 via-[#082f49]/95 to-[#031525]/95 border border-sky-400/60 shadow-lg shadow-sky-950/80',
                          textColor: 'text-sky-200',
                          iconColor: 'text-sky-400',
                        };
                      case 'legend':
                        return {
                          cardBg: 'bg-gradient-to-r from-[#fefce8]/95 via-[#fef08a]/95 to-[#fefce8]/95 border border-amber-600/60 shadow-lg shadow-amber-900/30',
                          textColor: 'text-[#78350F]',
                          iconColor: 'text-[#B45309]',
                        };
                      case 'bidon':
                        return {
                          cardBg: 'bg-gradient-to-r from-[#1c1917]/95 via-[#292524]/95 to-[#1c1917]/95 border border-amber-700/60 shadow-lg shadow-black/80',
                          textColor: 'text-amber-300',
                          iconColor: 'text-amber-500',
                        };
                      default:
                        return {
                          cardBg: 'bg-neutral-900/95 border border-amber-400/50',
                          textColor: 'text-amber-200',
                          iconColor: 'text-amber-400',
                        };
                    }
                  })();

                  return (
                    <div
                      key={idx}
                      className={`${
                        isSingle ? 'w-[65%]' : 'flex-1 min-w-0'
                      } h-full rounded-xl ${bStyle.cardBg} flex items-center justify-center gap-1.5 px-2.5`}
                      title={`${cfg.label}: ${cfg.description}`}
                    >
                      <Icon className={`w-3.5 h-3.5 ${bStyle.iconColor} shrink-0 drop-shadow`} />
                      <span className={`text-[9.5px] sm:text-[10.5px] md:text-[11px] font-bold ${bStyle.textColor} tracking-tight truncate`}>
                        {cfg.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* 6 Temel Saha İstatistiği (3D Parallax: translateZ(48px)) */}
        <div
          className={`absolute ${themeConfig.statBounds} ${themeConfig.statTop} grid grid-cols-6 text-center pointer-events-none select-none z-20`}
          style={{ transform: 'translateZ(48px)' }}
        >
          {[
            { val: stats.pac },
            { val: stats.sho },
            { val: stats.pas },
            { val: stats.dri },
            { val: stats.def },
            { val: stats.phy },
          ].map((item, idx) => (
            <div key={idx} className="flex justify-center items-center">
              <span className={`font-black font-mono tracking-tight ${themeConfig.statValColor} ${sizeConfig.statVal} drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]`}>
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
