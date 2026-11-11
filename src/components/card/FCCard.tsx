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

    const rotX = ((y - centerY) / centerY) * -14;
    const rotY = ((x - centerX) / centerX) * 14;

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
          ovalTextColor: 'text-[#FEF08A]',
          ovalIconColor: 'text-[#FACC15]',
          ovalDropShadow: 'drop-shadow-[0_1px_3px_rgba(0,0,0,0.95)]',
          nameTop: 'top-[52.4%]', // Siyah metalik isimliğin tam ortasına hizalandı
          statTop: 'top-[77.6%]',
          statBounds: 'left-[11.3%] right-[11.3%]',
          ovalsTop: 'top-[65.8%]', // Altın parıltılı kapsüllerin tam içine oturtuldu
          ovalsBounds: 'left-[9.5%] right-[9.5%]',
          ovalsHeight: 'h-[5.8%]',
          photoFrame: 'top-[11%] left-[12%] right-[8%] h-[44%]',
          isGold: false,
          label: 'MVP (Most Valuable Player) 🏆',
        };
      case 'inform':
        return {
          template: '/cards/card_inform.png',
          ovrColor: 'text-[#FED7AA]',
          nameColor: 'text-white',
          nicknameColor: 'text-[#FEF08A]', // Parlak altın sarısı - alevli kızıl fonda son derece net okunur
          statValColor: 'text-[#FED7AA]',
          ovalTextColor: 'text-[#FFEDD5]',
          ovalIconColor: 'text-[#FB923C]',
          ovalDropShadow: 'drop-shadow-[0_1px_3px_rgba(0,0,0,0.95)]',
          nameTop: 'top-[50.0%]', // Ateşli cam hattın üstü ve altı dengeli
          statTop: 'top-[76.6%]', // Sayılar akkor kömür tabanının hemen üstünde net okunur
          statBounds: 'left-[11.3%] right-[11.3%]',
          ovalsTop: 'top-[66.6%]', // İki dumanlı ateş halkasının tam göbeğine yerleştirildi
          ovalsBounds: 'left-[10.5%] right-[10.5%]',
          ovalsHeight: 'h-[6.5%]',
          photoFrame: 'top-[11%] left-[12%] right-[8%] h-[44%]',
          isGold: false,
          label: 'ATEŞ EDİYO! 🔥',
        };
      case 'revir':
        return {
          template: '/cards/card_revir.png',
          ovrColor: 'text-[#BAE6FD]',
          nameColor: 'text-white',
          nicknameColor: 'text-[#38BDF8]',
          statValColor: 'text-[#BAE6FD]',
          ovalTextColor: 'text-[#E0F2FE]',
          ovalIconColor: 'text-[#38BDF8]',
          ovalDropShadow: 'drop-shadow-[0_1px_3px_rgba(0,0,0,0.95)]',
          nameTop: 'top-[53.5%]',
          statTop: 'top-[81.0%]', // Sayılar alt kavis yerine dikey bölmelerin ortasına taşındı
          statBounds: 'left-[11.3%] right-[11.3%]',
          ovalsTop: 'top-[65.6%]',
          ovalsBounds: 'left-[10.5%] right-[10.5%]',
          ovalsHeight: 'h-[6.5%]',
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
          statValColor: 'text-[#0F172A]',
          ovalTextColor: 'text-[#78350F]',
          ovalIconColor: 'text-[#B45309]',
          ovalDropShadow: 'drop-shadow-[0_1px_0_rgba(255,255,255,0.8)]',
          nameTop: 'top-[54.0%]', // Mermer şerit isimliğin tam ortası
          statTop: 'top-[81.0%]', // Sayılar alt mermer kavisten yukarı alınıp ortalandı
          statBounds: 'left-[11.3%] right-[11.3%]',
          ovalsTop: 'top-[72.0%]', // Beyaz mermer kapsüllerin tam merkezine oturtuldu
          ovalsBounds: 'left-[11.5%] right-[11.5%]',
          ovalsHeight: 'h-[5.8%]',
          photoFrame: 'top-[12%] left-[16%] right-[16%] h-[46%]',
          isGold: false,
          label: 'EFSANE • ICON 👑',
        };
      case 'bidon':
        return {
          template: '/cards/card_bidon.png',
          ovrColor: 'text-[#EA580C]',
          nameColor: 'text-[#1C1917]',
          nicknameColor: 'text-[#FBBF24]',
          statValColor: 'text-[#1C1917]',
          ovalTextColor: 'text-[#FBBF24]',
          ovalIconColor: 'text-[#F59E0B]',
          ovalDropShadow: 'drop-shadow-[0_1px_3px_rgba(0,0,0,0.95)]',
          nameTop: 'top-[52.4%]', // Lakap koli kapağı üstünde, isim koli bandının tam merkezinde
          statTop: 'top-[77.8%]', // Sayılar dip metal sınırdan yukarı taşınıp paslı tablonun ortasına alındı
          statBounds: 'left-[11.3%] right-[11.3%]',
          ovalsTop: 'top-[69.5%]', // Paslı oval yuvaların tam ortasına hizalandı
          ovalsBounds: 'left-[10.5%] right-[10.5%]',
          ovalsHeight: 'h-[6.2%]',
          photoFrame: 'top-[11%] left-[12%] right-[8%] h-[44%]',
          isGold: false,
          label: 'HAFTANIN BİDONU 🛢️',
        };
      case 'gold':
      default:
        return {
          template: '/cards/card_gold.png',
          ovrColor: 'text-[#FDE047]',
          nameColor: 'text-[#1C1917]',
          nicknameColor: 'text-[#FBBF24]',
          statValColor: 'text-[#FDE68A]',
          ovalTextColor: 'text-[#FEF08A]',
          ovalIconColor: 'text-[#FACC15]',
          ovalDropShadow: 'drop-shadow-[0_1px_3px_rgba(0,0,0,0.95)]',
          nameTop: 'top-[51.8%]', // Altın kurdele isimliğin tam ortası
          statTop: 'top-[78.4%]', // Sayılar HIZ-ŞUT etiketlerinden aşağı indirilip altın tabanda ortalandı
          statBounds: 'left-[11.3%] right-[11.3%]',
          ovalsTop: 'top-[67.0%]', // Altın oval halkaların tam ortasına oturtuldu
          ovalsBounds: 'left-[9.5%] right-[9.5%]',
          ovalsHeight: 'h-[5.8%]',
          photoFrame: 'top-[11%] left-[12%] right-[8%] h-[44%]',
          isGold: false,
          label: 'STANDART • GOLD',
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
      numberText: 'text-[10px]',
      nameText: 'text-xs',
      nicknameText: 'text-[9px]',
      statVal: 'text-[10px]',
      flagWidth: 'w-5.5 h-3.5',
      logoWidth: 'w-5.5 h-5.5',
      shieldSize: 'w-7 h-8',
      mvpShieldSize: 'w-10 h-11',
      pillText: 'text-[8px]',
      pillPad: 'px-1.5 py-0.5',
    },
    md: {
      width: 'w-[280px]',
      height: 'h-[375px]',
      ovrText: 'text-4xl',
      posText: 'text-xs font-black',
      numberText: 'text-[13px]',
      nameText: 'text-lg font-black',
      nicknameText: 'text-xs font-bold',
      statVal: 'text-sm font-black',
      flagWidth: 'w-8 h-5',
      logoWidth: 'w-8 h-8',
      shieldSize: 'w-11 h-13',
      mvpShieldSize: 'w-15 h-17',
      pillText: 'text-[10px]',
      pillPad: 'px-2.5 py-0.5',
    },
    lg: {
      width: 'w-[360px]',
      height: 'h-[482px]',
      ovrText: 'text-5xl',
      posText: 'text-sm font-black',
      numberText: 'text-[16px]',
      nameText: 'text-2xl font-black',
      nicknameText: 'text-sm font-bold',
      statVal: 'text-base font-black',
      flagWidth: 'w-10 h-6',
      logoWidth: 'w-10 h-10',
      shieldSize: 'w-14 h-16',
      mvpShieldSize: 'w-20 h-23',
      pillText: 'text-xs',
      pillPad: 'px-3 py-1',
    },
  }[size];

  // 3D Parallax fare hareketine göre dinamik mikro kayma çarpanları
  const pX = rotate.y;
  const pY = -rotate.x;

  return (
    <div
      style={{ perspective: '850px' }}
      className={`relative inline-block ${sizeConfig.width} select-none group`}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
    >
      {/* 3D Tilting Card Container - GPU preserve-3d'yi bozmamak için bu kapsayıcıda ASLA filter/drop-shadow kullanılmaz */}
      <div
        ref={cardElementRef}
        style={{
          transform: !photoInteractive ? `rotateX(${rotate.x}deg) rotateY(${rotate.y}deg)` : undefined,
          transition: isHovered && !photoInteractive ? 'none' : 'transform 0.35s ease-out',
          transformStyle: 'preserve-3d',
        }}
        className={`relative ${sizeConfig.height} w-full bg-transparent cursor-pointer`}
      >
        {/* KATMAN 1: ARKA TABLA & ŞABLON (Drop-shadow burada bulunur, preserve-3d'yi bozmaz) */}
        <img
          src={themeConfig.template}
          alt={themeConfig.label}
          style={{ transform: 'translateZ(0px)' }}
          className={`absolute inset-0 w-full h-full object-contain pointer-events-none select-none z-0 transition-[filter] duration-200 ${
            theme === 'totw'
              ? isHovered
                ? 'drop-shadow-[0_20px_35px_rgba(245,158,11,0.45)]'
                : 'drop-shadow-[0_10px_25px_rgba(245,158,11,0.22)]'
              : isHovered
              ? 'drop-shadow-[0_20px_30px_rgba(0,0,0,0.55)]'
              : 'drop-shadow-xl'
          }`}
        />

        {/* KATMAN 2: OYUNCU FOTOĞRAFI (Fotoğraf kart tabanında hafif 3D derinlikte durur) */}
        <div
          className={`absolute ${themeConfig.photoFrame} flex items-center justify-center z-10 overflow-hidden`}
          style={{
            maskImage: 'linear-gradient(to bottom, black 72%, transparent 100%)',
            WebkitMaskImage: 'linear-gradient(to bottom, black 72%, transparent 100%)',
            transform: `translateZ(2px) translate3d(${pX * 0.02}px, ${pY * 0.02}px, 0)`,
            transition: isHovered ? 'none' : 'transform 0.35s ease-out',
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

        {/* Sol Üst Bilgi Kolonu (OVR, Mevki, Forma No, Bayrak, Kulüp Arması - 3D Parallax: translateZ(4px)) */}
        <div
          className="absolute top-[13.5%] left-[17%] w-[17%] flex flex-col items-center text-center z-20 pointer-events-none select-none"
          style={{
            transform: `translateZ(4px) translate3d(${pX * 0.04}px, ${pY * 0.04}px, 0)`,
            transition: isHovered ? 'none' : 'transform 0.35s ease-out',
          }}
        >
          {/* OVR (86) */}
          <span className={`font-black tracking-tighter leading-none ${themeConfig.ovrColor} ${sizeConfig.ovrText} drop-shadow-[0_2px_4px_rgba(0,0,0,0.95)]`}>
            {ovr}
          </span>
          {/* Mevki (MID) */}
          <span className={`tracking-wider uppercase text-white font-black mt-1 ${sizeConfig.posText} drop-shadow-[0_1px_3px_rgba(0,0,0,0.95)]`}>
            {player.position}
          </span>
          {/* Forma Numarası (#10) - Net, yüksek kontrastlı altın/kehribar rengi ve büyütülmüş font */}
          <span className={`font-mono font-black tracking-tight text-amber-200 ${sizeConfig.numberText} mt-0.5 drop-shadow-[0_2px_4px_rgba(0,0,0,1)] filter`}>
            #{player.number}
          </span>
          {/* Ülke Bayrağı (Hover'da şık ipeksi kumaş dalgalanması) */}
          <div className={`relative ${sizeConfig.flagWidth} mt-2 overflow-hidden rounded-[2px] shadow-sm border border-white/20 select-none group/flag`}>
            <img
              src={player.flagUrl || getNationFlagUrl(player.nationality)}
              alt={player.nationName || player.nationality || 'TR'}
              title={player.nationName || 'Türkiye'}
              className="w-full h-full object-cover flag-wave-on-hover"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = '/cards/flag_tr.png';
              }}
            />
            {/* İpeksi Kumaş Kıvrım Işığı & Gölgesi */}
            <div className="absolute inset-0 pointer-events-none flag-sheen-on-hover opacity-0" />
          </div>
          {/* Kulüp / Takım Arması */}
          <div className={`relative ${sizeConfig.logoWidth} mt-1.5 rounded-full overflow-hidden shadow-md border border-amber-400/40 bg-black/30 p-0.5 drop-shadow-[0_3px_6px_rgba(0,0,0,0.5)]`}>
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

        {/* Sağ Üst Tema Kalkanı (3D Parallax: translateZ(6px) - Zarif ve doğal derinlikli 3D kalkan) */}
        <div
          className={`absolute ${
            theme === 'totw'
              ? `top-[9.8%] right-[9.5%] ${sizeConfig.mvpShieldSize}`
              : `top-[13.0%] right-[13.5%] ${sizeConfig.shieldSize}`
          } pointer-events-none z-30 select-none flex items-center justify-center`}
          style={{
            transform: `translateZ(6px) translate3d(${pX * 0.06}px, ${pY * 0.06}px, 0)`,
            transition: isHovered ? 'none' : 'transform 0.35s ease-out',
          }}
        >
          {/* MVP Sağ Üst Simgesi: Arka Plandan Hafif Animasyonlu Glowing Efekti */}
          {theme === 'totw' && (
            <div className="absolute inset-0 -m-1.5 rounded-full pointer-events-none -z-10 flex items-center justify-center">
              {/* Birinci Katman: Yumuşak altın sarısı nefes alan halo */}
              <div
                className="w-full h-full rounded-full opacity-75 blur-md animate-mvp-crest-glow"
                style={{
                  background:
                    'radial-gradient(circle, rgba(251, 191, 36, 0.8) 0%, rgba(245, 158, 11, 0.45) 45%, rgba(217, 119, 6, 0) 72%)',
                }}
              />
              {/* İkinci Katman: Arka plandan hafif sıcak ışık aurası */}
              <div className="absolute -inset-1 rounded-full bg-gradient-to-tr from-amber-500/20 via-yellow-300/35 to-amber-600/15 blur-lg animate-pulse" />
            </div>
          )}
          <img
            src={THEME_SHIELDS[theme]}
            alt={`${theme} Crest`}
            className="w-full h-full object-contain opacity-95 drop-shadow-[0_3px_8px_rgba(0,0,0,0.5)] relative z-10"
          />
        </div>

        {/* Oyuncu Adı ve Halı Saha Lakabı (3D Parallax: translateZ(3px)) */}
        <div
          className={`absolute left-0 right-0 ${themeConfig.nameTop} flex flex-col items-center justify-center text-center z-20 pointer-events-none`}
          style={{
            transform: `translateZ(3px) translate3d(${pX * 0.03}px, ${pY * 0.03}px, 0)`,
            transition: isHovered ? 'none' : 'transform 0.35s ease-out',
          }}
        >
          {/* Lakap: İsmin üstünde, resmin alt kısmına doğru */}
          <p
            className={`font-bold italic ${themeConfig.nicknameColor} text-[11px] sm:text-xs tracking-wide ${
              theme === 'legend'
                ? 'drop-shadow-none'
                : 'drop-shadow-[0_2px_4px_rgba(0,0,0,0.95)]'
            } mb-0.5 truncate w-full px-4`}
          >
            "{player.nickname}"
          </p>
          {/* İsim: Tam isimlik kısmının ortasında */}
          <h3
            className={`font-black uppercase tracking-wide ${themeConfig.nameColor} ${
              theme === 'legend' || theme === 'bidon' || theme === 'gold' ? 'text-lg sm:text-xl' : sizeConfig.nameText
            } ${
              theme === 'legend' || theme === 'bidon' || theme === 'gold'
                ? 'drop-shadow-none'
                : 'drop-shadow-[0_2px_5px_rgba(0,0,0,0.95)]'
            } truncate w-full px-4`}
          >
            {player.name}
          </h3>
        </div>

        {/* PlayStyles Rozetleri (3D Parallax: translateZ(3.5px)) - Sadece Simge ve Yazı, Kutusuz ve Çerçevesiz */}
        {showBadges && (
          <div
            className={`absolute ${themeConfig.ovalsTop} ${themeConfig.ovalsBounds} ${themeConfig.ovalsHeight} grid grid-cols-2 gap-2 z-20 pointer-events-none select-none`}
            style={{
              transform: `translateZ(3.5px) translate3d(${pX * 0.035}px, ${pY * 0.035}px, 0)`,
              transition: isHovered ? 'none' : 'transform 0.35s ease-out',
            }}
          >
            {player.playstyles.slice(0, 2).map((ps, idx) => {
              const cfg = PLAYSTYLE_CONFIG[ps];
              if (!cfg) return null;
              const Icon = cfg.icon;

              return (
                <div
                  key={idx}
                  className="h-full w-full flex items-center justify-center gap-1.5 px-1"
                  title={`${cfg.label}: ${cfg.description}`}
                >
                  <Icon className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${themeConfig.ovalIconColor} shrink-0 ${themeConfig.ovalDropShadow}`} />
                  <span className={`text-[10px] sm:text-[11px] md:text-xs font-bold tracking-tight truncate ${themeConfig.ovalTextColor} ${themeConfig.ovalDropShadow}`}>
                    {cfg.label}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* 6 Temel Saha İstatistiği (3D Parallax: translateZ(2.5px)) */}
        <div
          className={`absolute ${themeConfig.statBounds} ${themeConfig.statTop} grid grid-cols-6 text-center pointer-events-none select-none z-20`}
          style={{
            transform: `translateZ(2.5px) translate3d(${pX * 0.025}px, ${pY * 0.025}px, 0)`,
            transition: isHovered ? 'none' : 'transform 0.35s ease-out',
          }}
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
              <span
                className={`font-black font-mono tracking-tight ${sizeConfig.statVal} ${
                  theme === 'legend'
                    ? 'text-[#0F172A] drop-shadow-[0_1px_0_rgba(255,255,255,0.85)]'
                    : theme === 'bidon'
                    ? 'text-[#1C1917] drop-shadow-[0_1px_0_rgba(255,255,255,0.75)]'
                    : `${themeConfig.statValColor} drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]`
                }`}
              >
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
