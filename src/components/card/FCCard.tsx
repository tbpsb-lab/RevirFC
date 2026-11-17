import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import {
  Player,
  CardTheme,
  PlayerStats,
  getStandardThemeByOVR,
  isStandardCardTheme,
  isClubLegendPlayer,
  resolvePlayerPlaystyleSlots,
} from '../../types';
import { PLAYSTYLE_CONFIG } from './PlayStyleBadge';
import { getNationFlagUrl, getClubLogoUrl } from '../../data/teamsAndNations';
import { getPlayerPositions } from '../../services/positions';

// Fotoğraf IndexedDB'den yüklenene kadar (idb: referansı) gösterilen şeffaf 1x1 görsel
const TRANSPARENT_PIXEL = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

// Mini arma beyaz yıldırım / elektrik paleti (Efsane kart stili - tüm temalarda ortak tek tip)
const CREST_ELECTRIC_CORE = '#FFFFFF';
const CREST_GLOW_PRIMARY = 'rgba(255, 255, 255, 0.98)';
const CREST_GLOW_SECONDARY = 'rgba(203, 213, 225, 0.78)';
import { Download } from 'lucide-react';

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
  priority?: boolean;
  onCardNodeReady?: (node: HTMLDivElement | null) => void;
}

export async function downloadCardNodeAsPng(el: HTMLElement, fileName: string): Promise<void> {
  const { toPng } = await import('html-to-image');
  el.dataset.exporting = 'true';
  try {
    const dataUrl = await toPng(el, {
      quality: 1.0,
      pixelRatio: 3,
      cacheBust: true,
      backgroundColor: 'transparent',
      filter: (node) => !(node instanceof HTMLElement && node.dataset?.exportIgnore === 'true'),
    });
    const link = document.createElement('a');
    link.download = fileName;
    link.href = dataUrl;
    link.click();
  } finally {
    delete el.dataset.exporting;
  }
}

const THEME_SHIELDS: Record<CardTheme, string> = {
  bronze: '/cards/bronze_shield.png',
  silver: '/cards/silver_shield.png',
  gold: '/cards/gold_shield.png',
  totw: '/cards/totw_shield.png',
  inform: '/cards/inform_shield.png',
  wall: '/cards/wall_shield.png',
  revir: '/cards/revir_shield.png',
  legend: '/cards/legend_shield.png',
  bidon: '/cards/bidon_shield.png',
  nostalgia: '/cards/nostalgia_shield.png',
};

type GyroListener = (tilt: { x: number; y: number }) => void;

interface OrientationEventWithPermission {
  requestPermission?: () => Promise<'granted' | 'denied'>;
}

// Tüm kartların ortak kullandığı paylaşımlı Jiroskop / Cihaz Eğimi Yöneticisi (Singleton)
const gyroManager = (() => {
  const listeners = new Set<GyroListener>();
  let isListening = false;
  let rafId: number | null = null;
  let lastFrameTime: number | null = null;
  let permissionState: 'unknown' | 'pending' | 'granted' | 'denied' = 'unknown';

  let baseX: number | null = null;
  let baseY: number | null = null;
  let lastAngle: number | null = null;
  let prevRawGamma: number | null = null;
  let smoothedGamma: number | null = null;
  let targetTiltX = 0;
  let targetTiltY = 0;
  let currentTiltX = 0;
  let currentTiltY = 0;
  let lastEmittedX = 0;
  let lastEmittedY = 0;

  const MAX_TILT = 11.5;

  const getNormalizedAxes = (beta: number, gamma: number): { right: number; up: number; angle: number } => {
    const legacyWin = window as unknown as { orientation?: number };
    const rawAngle =
      typeof window !== 'undefined' && window.screen?.orientation
        ? window.screen.orientation.angle
        : typeof window !== 'undefined' && typeof legacyWin.orientation === 'number'
        ? legacyWin.orientation
        : 0;
    const angle = ((rawAngle % 360) + 360) % 360;

    if (angle === 90) {
      return { right: -beta, up: gamma, angle };
    }
    if (angle === 180) {
      return { right: -gamma, up: -beta, angle };
    }
    if (angle === 270) {
      return { right: beta, up: -gamma, angle };
    }
    return { right: gamma, up: beta, angle };
  };

  const handleDeviceOrientation = (e: DeviceOrientationEvent) => {
    if (e.beta === null || e.gamma === null) return;

    const betaAbs = Math.abs(e.beta);
    // Dik tutuşa yaklaşırken (|beta| > 82°) iOS Safari gamma eksenindeki ani sıçramaları (gimbal lock) bastır
    if (prevRawGamma === null || smoothedGamma === null) {
      prevRawGamma = e.gamma;
      smoothedGamma = e.gamma;
    } else if (betaAbs > 82) {
      const gammaJump = Math.abs(e.gamma - prevRawGamma);
      if (gammaJump <= 35) {
        const gimbalFactor = Math.max(0.15, 1 - (betaAbs - 82) / 10);
        smoothedGamma = smoothedGamma + (e.gamma - smoothedGamma) * gimbalFactor * 0.35;
      }
      prevRawGamma = e.gamma;
    } else {
      smoothedGamma = smoothedGamma + (e.gamma - smoothedGamma) * 0.55;
      prevRawGamma = e.gamma;
    }

    const { right, up, angle } = getNormalizedAxes(e.beta, smoothedGamma);

    if (lastAngle !== angle || baseX === null || baseY === null) {
      baseX = right;
      baseY = up;
      lastAngle = angle;
    }

    // Köşe eğimlerde kartın geri kaçıp titrememesi için aktif eğimde merkez kaymasını durdura yakın tut
    const rawDeltaRight = right - baseX;
    const rawDeltaUp = up - baseY;
    const rawHypot = Math.hypot(rawDeltaRight, rawDeltaUp);
    const recenterRate = rawHypot > 2.5 ? 0.0015 : 0.008;

    baseX = baseX + rawDeltaRight * recenterRate;
    baseY = baseY + rawDeltaUp * recenterRate;

    const rawX = -(up - baseY);
    const rawY = right - baseX;

    // 2B Dairesel yumuşak doyuma (radial soft-knee) sokarak köşelerde sert duvar çarpmasını & aşırı eğimi engelle
    const magnitude = Math.hypot(rawX, rawY);
    if (magnitude > 0.0001) {
      const scaled = MAX_TILT * Math.tanh(magnitude / 15);
      targetTiltX = (rawX / magnitude) * scaled;
      targetTiltY = (rawY / magnitude) * scaled;
    } else {
      targetTiltX = 0;
      targetTiltY = 0;
    }
  };

  const tick = (now: number) => {
    if (listeners.size === 0) {
      rafId = null;
      lastFrameTime = null;
      return;
    }

    // 60Hz / 120Hz (iPad ProMotion) ekran hızından bağımsız sabit sönümleme
    const rawDt = lastFrameTime === null ? 1 / 60 : (now - lastFrameTime) / 1000;
    const dt = Math.min(0.05, Math.max(0.001, rawDt));
    lastFrameTime = now;
    const alpha = 1 - Math.exp(-12 * dt);

    currentTiltX += (targetTiltX - currentTiltX) * alpha;
    currentTiltY += (targetTiltY - currentTiltY) * alpha;

    if (
      Math.abs(currentTiltX - lastEmittedX) > 0.005 ||
      Math.abs(currentTiltY - lastEmittedY) > 0.005
    ) {
      lastEmittedX = currentTiltX;
      lastEmittedY = currentTiltY;
      const snapshot = { x: currentTiltX, y: currentTiltY };
      listeners.forEach((cb) => cb(snapshot));
    }

    rafId = window.requestAnimationFrame(tick);
  };

  const attachSensor = () => {
    if (isListening || typeof window === 'undefined') return;
    isListening = true;
    window.addEventListener('deviceorientation', handleDeviceOrientation, { passive: true });
    if (rafId === null) {
      lastFrameTime = null;
      rafId = window.requestAnimationFrame(tick);
    }
  };

  const detachSensorIfIdle = () => {
    if (listeners.size > 0 || typeof window === 'undefined') return;
    if (isListening) {
      window.removeEventListener('deviceorientation', handleDeviceOrientation);
      isListening = false;
    }
    if (rafId !== null) {
      window.cancelAnimationFrame(rafId);
      rafId = null;
    }
    lastFrameTime = null;
    baseX = null;
    baseY = null;
    prevRawGamma = null;
    smoothedGamma = null;
  };

  const requestPermissionOnGesture = () => {
    if (typeof window === 'undefined') return;
    const ctor = window.DeviceOrientationEvent as unknown as OrientationEventWithPermission | undefined;
    if (!ctor || typeof ctor.requestPermission !== 'function') {
      permissionState = 'granted';
      if (listeners.size > 0) attachSensor();
      return;
    }
    if (permissionState === 'granted' || permissionState === 'denied' || permissionState === 'pending') {
      return;
    }

    permissionState = 'pending';
    ctor
      .requestPermission()
      .then((res) => {
        permissionState = res === 'granted' ? 'granted' : 'denied';
        if (res === 'granted' && listeners.size > 0) {
          attachSensor();
        }
      })
      .catch(() => {
        permissionState = 'unknown';
      });
  };

  let gestureHooked = false;
  const ensureGestureHook = () => {
    if (gestureHooked || typeof window === 'undefined') return;
    const ctor = window.DeviceOrientationEvent as unknown as OrientationEventWithPermission | undefined;
    if (!ctor) return;

    if (typeof ctor.requestPermission !== 'function') {
      permissionState = 'granted';
      return;
    }

    gestureHooked = true;
    const onFirstGesture = () => {
      requestPermissionOnGesture();
      if (permissionState === 'granted' || permissionState === 'denied') {
        window.removeEventListener('touchend', onFirstGesture);
        window.removeEventListener('click', onFirstGesture);
      }
    };
    window.addEventListener('touchend', onFirstGesture, { passive: true });
    window.addEventListener('click', onFirstGesture, { passive: true });
  };

  return {
    subscribe(listener: GyroListener): () => void {
      if (typeof window === 'undefined' || typeof window.DeviceOrientationEvent === 'undefined') {
        return () => {};
      }
      listeners.add(listener);
      ensureGestureHook();

      if (permissionState === 'granted') {
        attachSensor();
      } else if (rafId === null && isListening) {
        lastFrameTime = null;
        rafId = window.requestAnimationFrame(tick);
      }

      return () => {
        listeners.delete(listener);
        detachSensorIfIdle();
      };
    },
  };
})();

// Uzun PlayStyle isimleri oval yuvaya sığmadığında "..." ile kesmek yerine akıcı kayan yazı gösterir
const PlayStyleMarqueeLabel: React.FC<{
  text: string;
  className: string;
}> = ({ text, className }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const [isOverflowing, setIsOverflowing] = useState(false);

  useLayoutEffect(() => {
    const checkOverflow = () => {
      const container = containerRef.current;
      const textEl = textRef.current;
      if (!container || !textEl) return;
      setIsOverflowing(textEl.scrollWidth > container.clientWidth + 1);
    };

    checkOverflow();

    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined' && containerRef.current) {
      ro = new ResizeObserver(checkOverflow);
      ro.observe(containerRef.current);
    }
    document.fonts?.ready?.then(checkOverflow).catch(() => {});

    return () => {
      ro?.disconnect();
    };
  }, [text, className]);

  return (
    <div ref={containerRef} className="min-w-0 max-w-full overflow-hidden flex items-center">
      {isOverflowing ? (
        <div className="playstyle-marquee-track whitespace-nowrap">
          <span className={`${className} pr-5`}>{text}</span>
          <span className={`${className} pr-5`} aria-hidden="true">
            {text}
          </span>
        </div>
      ) : (
        <span ref={textRef} className={`${className} whitespace-nowrap`}>
          {text}
        </span>
      )}
    </div>
  );
};

export const FCCard: React.FC<Props> = React.memo(({
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
  priority = false,
  onCardNodeReady,
}) => {
  const [isDownloading, setIsDownloading] = useState(false);
  const outerContainerRef = useRef<HTMLDivElement>(null);
  const cardElementRef = useRef<HTMLDivElement>(null);
  const isHoveredRef = useRef(false);

  const isHoverPointer = (pointerType: string) =>
    pointerType === 'mouse' || pointerType === 'pen';

  const applyCardTransform = (x: number, y: number, smoothTransition = false) => {
    const cardEl = cardElementRef.current;
    if (!cardEl) return;
    if (photoInteractive) {
      cardEl.style.transform = '';
      cardEl.style.transition = '';
      return;
    }
    cardEl.style.transition = smoothTransition
      ? 'transform 0.35s cubic-bezier(0.22, 1, 0.36, 1)'
      : 'none';
    cardEl.style.transform = `rotateX(${x.toFixed(3)}deg) rotateY(${y.toFixed(3)}deg)`;
  };

  useEffect(() => {
    if (!interactive || photoInteractive) {
      applyCardTransform(0, 0, !photoInteractive);
      return;
    }

    const el = outerContainerRef.current;
    if (!el) return;

    let unsubscribeGyro: (() => void) | null = null;
    const startGyro = () => {
      if (unsubscribeGyro) return;
      unsubscribeGyro = gyroManager.subscribe((tilt) => {
        if (isHoveredRef.current) return;
        applyCardTransform(tilt.x, tilt.y, false);
      });
    };
    const stopGyro = () => {
      if (unsubscribeGyro) {
        unsubscribeGyro();
        unsubscribeGyro = null;
      }
      if (!isHoveredRef.current) {
        applyCardTransform(0, 0, true);
      }
    };

    if (typeof IntersectionObserver !== 'undefined') {
      const observer = new IntersectionObserver(
        (entries) => {
          const visible = entries.some((entry) => entry.isIntersecting);
          if (visible) {
            el.classList.remove('card-offscreen');
            startGyro();
          } else {
            el.classList.add('card-offscreen');
            stopGyro();
          }
        },
        { threshold: 0.05 }
      );
      observer.observe(el);
      return () => {
        observer.disconnect();
        el.classList.remove('card-offscreen');
        stopGyro();
      };
    }

    startGyro();
    return () => stopGyro();
  }, [interactive, photoInteractive]);

  const stats = overrideStats || player.stats;
  const ovr = overrideOVR !== undefined ? overrideOVR : player.currentOVR;
  const rawTheme = player.theme;
  const isLegend = isClubLegendPlayer(player);
  const theme: CardTheme = isLegend
    ? rawTheme === 'totw' || rawTheme === 'inform' || rawTheme === 'wall' || rawTheme === 'revir'
      ? rawTheme
      : player.currentStatus === 'light_injury'
      ? 'revir'
      : 'legend'
    : overrideOVR !== undefined && isStandardCardTheme(rawTheme)
    ? getStandardThemeByOVR(ovr)
    : rawTheme === 'legend' || isStandardCardTheme(rawTheme)
    ? getStandardThemeByOVR(ovr)
    : rawTheme;

  const handlePointerEnter = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!interactive || photoInteractive || !isHoverPointer(e.pointerType)) return;
    isHoveredRef.current = true;
    if (cardElementRef.current) {
      cardElementRef.current.style.willChange = 'transform';
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!interactive || photoInteractive || !isHoverPointer(e.pointerType)) return;
    isHoveredRef.current = true;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const rotX = ((y - centerY) / centerY) * -12;
    const rotY = ((x - centerX) / centerX) * 12;

    applyCardTransform(rotX, rotY, false);
  };

  const handlePointerLeave = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isHoverPointer(e.pointerType)) return;
    isHoveredRef.current = false;
    if (cardElementRef.current) {
      cardElementRef.current.style.willChange = 'auto';
    }
    applyCardTransform(0, 0, true);
  };

  const handleDownloadCard = async () => {
    if (!cardElementRef.current) return;
    try {
      setIsDownloading(true);
      await downloadCardNodeAsPng(cardElementRef.current, `RevirFC_${player.name}_${theme}.png`);
    } catch (err) {
      console.error('Card export failed:', err);
    } finally {
      setIsDownloading(false);
    }
  };

  // Card Theme Configurations with transparent PNG templates, element alignments, and crest aura palettes
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
          nameTop: 'top-[60.2%]', // İsim: isimlik plakasının MERKEZİ
          nickTop: 'top-[53.8%]', // Lakap: plakanın hemen üstü (Büyük Türkçe İ/Ö/Ü noktaları kesilmesin diye yukarı paylı)
          statTop: 'top-[82.9%]', // MERKEZ: etiket altındaki boş hücrenin ortası
          statBounds: 'left-[11.5%] right-[11.1%]',
          ovalsTop: 'top-[70.0%]', // MERKEZ: oval yuvanın ortası
          ovalsBounds: 'left-[12.4%] right-[11.0%]',
          ovalsHeight: 'h-[5.8%]',
          photoFrame: 'top-[11%] left-[12%] right-[8%] h-[44%]',
          isGold: false,
          label: 'MVP (Most Valuable Player) 🏆',
          electricCore: '#FFFBEB',
          crestAuraPrimary: 'rgba(251, 191, 36, 0.98)',
          crestAuraSecondary: 'rgba(217, 119, 6, 0.78)',
          crestAuraConic:
            'conic-gradient(from 0deg, rgba(251, 191, 36, 0.80), rgba(245, 158, 11, 0.28), rgba(254, 240, 138, 0.78), rgba(217, 119, 6, 0.22), rgba(251, 191, 36, 0.80))',
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
          nameTop: 'top-[60.1%]', // İsim: isimlik plakasının MERKEZİ
          nickTop: 'top-[53.9%]', // Lakap: plakanın hemen üstü (Büyük Türkçe İ/Ö/Ü noktaları kesilmesin diye yukarı paylı)
          statTop: 'top-[82.9%]', // MERKEZ: etiket altındaki boş hücrenin ortası
          statBounds: 'left-[11.5%] right-[11.1%]',
          ovalsTop: 'top-[69.6%]', // MERKEZ: oval yuvanın ortası
          ovalsBounds: 'left-[12.4%] right-[12.6%]',
          ovalsHeight: 'h-[6.5%]',
          photoFrame: 'top-[11%] left-[12%] right-[8%] h-[44%]',
          isGold: false,
          label: 'ALEV ATIYO! 🔥',
          electricCore: '#FFEDD5',
          crestAuraPrimary: 'rgba(251, 146, 60, 0.96)',
          crestAuraSecondary: 'rgba(234, 88, 12, 0.72)',
          crestAuraConic:
            'conic-gradient(from 0deg, rgba(251, 146, 60, 0.86), rgba(220, 38, 38, 0.35), rgba(253, 186, 116, 0.82), rgba(234, 88, 12, 0.25), rgba(251, 146, 60, 0.86))',
        };
      case 'wall':
        return {
          template: '/cards/card_wall.png',
          ovrColor: 'text-[#BAE6FD]',
          nameColor: 'text-white',
          nicknameColor: 'text-[#38BDF8]',
          statValColor: 'text-[#E0F2FE]',
          ovalTextColor: 'text-[#BAE6FD]',
          ovalIconColor: 'text-[#38BDF8]',
          ovalDropShadow: 'drop-shadow-[0_1px_3px_rgba(0,0,0,0.95)]',
          nameTop: 'top-[60.6%]', // İsim: isimlik plakasının MERKEZİ
          nickTop: 'top-[54.2%]', // Lakap: plakanın hemen üstü (Büyük Türkçe İ/Ö/Ü noktaları kesilmesin diye yukarı paylı)
          statTop: 'top-[79.7%]', // MERKEZ: etiket altındaki boş hücrenin ortası
          statBounds: 'left-[17.0%] right-[16.6%]',
          ovalsTop: 'top-[68.6%]', // MERKEZ: oval yuvanın ortası
          ovalsBounds: 'left-[15.7%] right-[15.5%]',
          ovalsHeight: 'h-[5.8%]',
          photoFrame: 'top-[11%] left-[12%] right-[8%] h-[44%]',
          isGold: false,
          label: 'ETTEN DUVAR 🧱',
          electricCore: '#E0F2FE',
          crestAuraPrimary: 'rgba(56, 189, 248, 0.96)',
          crestAuraSecondary: 'rgba(2, 132, 199, 0.72)',
          crestAuraConic:
            'conic-gradient(from 0deg, rgba(56, 189, 248, 0.86), rgba(2, 132, 199, 0.32), rgba(186, 230, 253, 0.84), rgba(14, 165, 233, 0.25), rgba(56, 189, 248, 0.86))',
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
          nameTop: 'top-[60.1%]', // İsim: isimlik plakasının MERKEZİ
          nickTop: 'top-[53.9%]', // Lakap: plakanın hemen üstü (Büyük Türkçe İ/Ö/Ü noktaları kesilmesin diye yukarı paylı)
          statTop: 'top-[82.9%]', // MERKEZ: etiket altındaki boş hücrenin ortası
          statBounds: 'left-[11.5%] right-[11.1%]',
          ovalsTop: 'top-[70.0%]', // MERKEZ: oval yuvanın ortası
          ovalsBounds: 'left-[11.5%] right-[11.3%]',
          ovalsHeight: 'h-[6.5%]',
          photoFrame: 'top-[11%] left-[12%] right-[8%] h-[44%]',
          isGold: false,
          label: 'REVİR RAPORLU 🩹',
          electricCore: '#F0F9FF',
          crestAuraPrimary: 'rgba(125, 211, 252, 0.96)',
          crestAuraSecondary: 'rgba(56, 189, 248, 0.72)',
          crestAuraConic:
            'conic-gradient(from 0deg, rgba(125, 211, 252, 0.86), rgba(56, 189, 248, 0.30), rgba(224, 242, 254, 0.86), rgba(14, 165, 233, 0.26), rgba(125, 211, 252, 0.86))',
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
          nameTop: 'top-[63.5%]', // İsim: isimlik plakasının MERKEZİ
          nickTop: 'top-[56.6%]', // Lakap: plakanın hemen üstü (Büyük Türkçe İ/Ö/Ü noktaları kesilmesin diye yukarı paylı)
          statTop: 'top-[84.8%]', // MERKEZ: etiket altındaki boş hücrenin ortası
          statBounds: 'left-[11.7%] right-[11.3%]',
          ovalsTop: 'top-[73.4%]', // MERKEZ: oval yuvanın ortası
          ovalsBounds: 'left-[13.7%] right-[13.2%]',
          ovalsHeight: 'h-[5.8%]',
          photoFrame: 'top-[12%] left-[16%] right-[16%] h-[46%]',
          isGold: false,
          label: 'EFSANE • ICON 👑',
          electricCore: '#FFFFFF',
          crestAuraPrimary: 'rgba(255, 255, 255, 0.98)',
          crestAuraSecondary: 'rgba(203, 213, 225, 0.78)',
          crestAuraConic:
            'conic-gradient(from 0deg, rgba(255, 255, 255, 0.92), rgba(226, 232, 240, 0.42), rgba(255, 255, 255, 0.95), rgba(203, 213, 225, 0.36), rgba(255, 255, 255, 0.92))',
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
          nameTop: 'top-[60.1%]', // İsim: isimlik plakasının MERKEZİ
          nickTop: 'top-[53.4%]', // Lakap: plakanın hemen üstü (Büyük Türkçe İ/Ö/Ü noktaları kesilmesin diye yukarı paylı)
          statTop: 'top-[83.2%]', // MERKEZ: etiket altındaki boş hücrenin ortası
          statBounds: 'left-[11.5%] right-[11.1%]',
          ovalsTop: 'top-[70.0%]', // MERKEZ: oval yuvanın ortası
          ovalsBounds: 'left-[15.1%] right-[14.5%]',
          ovalsHeight: 'h-[6.2%]',
          photoFrame: 'top-[11%] left-[12%] right-[8%] h-[44%]',
          isGold: false,
          label: 'HAFTANIN BİDONU 🛢️',
          electricCore: '#FEF3C7',
          crestAuraPrimary: 'rgba(222, 184, 135, 0.95)',
          crestAuraSecondary: 'rgba(180, 138, 90, 0.70)',
          crestAuraConic:
            'conic-gradient(from 0deg, rgba(214, 181, 136, 0.85), rgba(180, 138, 90, 0.30), rgba(245, 222, 189, 0.82), rgba(161, 116, 68, 0.25), rgba(214, 181, 136, 0.85))',
        };
      case 'bronze':
        return {
          template: '/cards/card_bronze.png',
          ovrColor: 'text-[#FCD9B6]',
          nameColor: 'text-[#FEF3C7]',
          nicknameColor: 'text-[#FDBA74]',
          statValColor: 'text-[#FDE68A]',
          ovalTextColor: 'text-[#FFEDD5]',
          ovalIconColor: 'text-[#FB923C]',
          ovalDropShadow: 'drop-shadow-[0_1px_3px_rgba(0,0,0,0.95)]',
          nameTop: 'top-[60.6%]',
          nickTop: 'top-[54.2%]',
          statTop: 'top-[79.7%]',
          statBounds: 'left-[17.0%] right-[16.6%]',
          ovalsTop: 'top-[68.6%]',
          ovalsBounds: 'left-[15.7%] right-[15.5%]',
          ovalsHeight: 'h-[5.8%]',
          photoFrame: 'top-[11%] left-[12%] right-[8%] h-[44%]',
          isGold: false,
          label: 'STANDART • BRONZ 🥉',
          electricCore: '#FFEDD5',
          crestAuraPrimary: 'rgba(234, 138, 76, 0.96)',
          crestAuraSecondary: 'rgba(180, 83, 9, 0.70)',
          crestAuraConic:
            'conic-gradient(from 0deg, rgba(217, 119, 66, 0.86), rgba(180, 83, 9, 0.30), rgba(253, 186, 116, 0.80), rgba(146, 64, 14, 0.25), rgba(217, 119, 66, 0.86))',
        };
      case 'silver':
        return {
          template: '/cards/card_silver.png',
          ovrColor: 'text-[#F8FAFC]',
          nameColor: 'text-[#0F172A]',
          nicknameColor: 'text-[#E2E8F0]',
          statValColor: 'text-[#F1F5F9]',
          ovalTextColor: 'text-[#F8FAFC]',
          ovalIconColor: 'text-[#CBD5E1]',
          ovalDropShadow: 'drop-shadow-[0_1px_3px_rgba(0,0,0,0.95)]',
          nameTop: 'top-[60.6%]',
          nickTop: 'top-[54.2%]',
          statTop: 'top-[79.7%]',
          statBounds: 'left-[17.0%] right-[16.6%]',
          ovalsTop: 'top-[68.6%]',
          ovalsBounds: 'left-[15.7%] right-[15.5%]',
          ovalsHeight: 'h-[5.8%]',
          photoFrame: 'top-[11%] left-[12%] right-[8%] h-[44%]',
          isGold: false,
          label: 'STANDART • GÜMÜŞ 🥈',
          electricCore: '#FFFFFF',
          crestAuraPrimary: 'rgba(226, 232, 240, 0.96)',
          crestAuraSecondary: 'rgba(148, 163, 184, 0.70)',
          crestAuraConic:
            'conic-gradient(from 0deg, rgba(226, 232, 240, 0.84), rgba(148, 163, 184, 0.32), rgba(248, 250, 252, 0.86), rgba(100, 116, 139, 0.25), rgba(226, 232, 240, 0.84))',
        };
      case 'nostalgia':
        return {
          template: '/cards/card_nostalgia.png',
          ovrColor: 'text-[#3E2723]',
          nameColor: 'text-[#2D1B10]',
          nicknameColor: 'text-[#5D4037]',
          statValColor: 'text-[#EFEBE9]',
          ovalTextColor: 'text-[#3E2723]',
          ovalIconColor: 'text-[#8D6E63]',
          ovalDropShadow: 'drop-shadow-[0_1px_1px_rgba(255,255,255,0.6)]',
          nameTop: 'top-[60.6%]',
          nickTop: 'top-[54.2%]',
          statTop: 'top-[79.7%]',
          statBounds: 'left-[17.0%] right-[16.6%]',
          ovalsTop: 'top-[68.6%]',
          ovalsBounds: 'left-[15.7%] right-[15.5%]',
          ovalsHeight: 'h-[5.8%]',
          photoFrame: 'top-[11%] left-[12%] right-[8%] h-[44%]',
          isGold: false,
          label: 'MAZİDE KALANLAR 📜',
          electricCore: '#FFECB3',
          crestAuraPrimary: 'rgba(217, 119, 6, 0.90)',
          crestAuraSecondary: 'rgba(120, 53, 15, 0.65)',
          crestAuraConic:
            'conic-gradient(from 0deg, rgba(217, 119, 6, 0.85), rgba(180, 83, 9, 0.35), rgba(254, 243, 199, 0.85), rgba(120, 53, 15, 0.28), rgba(217, 119, 6, 0.85))',
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
          nameTop: 'top-[60.6%]', // İsim: isimlik plakasının MERKEZİ
          nickTop: 'top-[54.2%]', // Lakap: plakanın hemen üstü (Büyük Türkçe İ/Ö/Ü noktaları kesilmesin diye yukarı paylı)
          statTop: 'top-[79.7%]', // MERKEZ: etiket altındaki boş hücrenin ortası
          statBounds: 'left-[17.0%] right-[16.6%]',
          ovalsTop: 'top-[68.6%]', // MERKEZ: oval yuvanın ortası
          ovalsBounds: 'left-[15.7%] right-[15.5%]',
          ovalsHeight: 'h-[5.8%]',
          photoFrame: 'top-[11%] left-[12%] right-[8%] h-[44%]',
          isGold: false,
          label: 'STANDART • GOLD',
          electricCore: '#FEF9C3',
          crestAuraPrimary: 'rgba(250, 204, 21, 0.95)',
          crestAuraSecondary: 'rgba(234, 179, 8, 0.68)',
          crestAuraConic:
            'conic-gradient(from 0deg, rgba(253, 224, 71, 0.82), rgba(234, 179, 8, 0.28), rgba(254, 240, 138, 0.80), rgba(202, 138, 4, 0.24), rgba(253, 224, 71, 0.82))',
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
      nameBigText: 'text-[11px]',
      nickText: 'text-[8px]',
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
      width: 'w-[260px]',
      height: 'h-[348px]',
      ovrText: 'text-[32px]',
      posText: 'text-[11px] font-black',
      numberText: 'text-xs',
      nameText: 'text-base font-black',
      nameBigText: 'text-[15px]',
      nickText: 'text-[9px]',
      nicknameText: 'text-[11px] font-bold',
      statVal: 'text-[13px] font-black',
      flagWidth: 'w-7 h-4.5',
      logoWidth: 'w-7 h-7',
      shieldSize: 'w-10 h-12',
      mvpShieldSize: 'w-14 h-16',
      pillText: 'text-[9.5px]',
      pillPad: 'px-2 py-0.5',
    },
    lg: {
      width: 'w-[360px]',
      height: 'h-[482px]',
      ovrText: 'text-5xl',
      posText: 'text-sm font-black',
      numberText: 'text-[16px]',
      nameText: 'text-2xl font-black',
      nameBigText: 'text-xl',
      nickText: 'text-xs',
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

  const positions = getPlayerPositions(player);

  return (
    <div
      ref={outerContainerRef}
      style={{ perspective: '850px' }}
      className={`relative inline-block ${sizeConfig.width} select-none group`}
      onPointerMove={handlePointerMove}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
      onClick={onClick}
    >
      {/* 3D Tilting Card Container - GPU preserve-3d'yi bozmamak için bu kapsayıcıda ASLA filter/drop-shadow kullanılmaz */}
      <div
        ref={(node) => {
          cardElementRef.current = node;
          onCardNodeReady?.(node);
        }}
        style={{
          transformStyle: 'preserve-3d',
        }}
        className={`relative ${sizeConfig.height} w-full bg-transparent cursor-pointer`}
      >
        {/* ÖZEL EFEKT: MVP (TOTW) KART KONTURUNA SIKI OTURAN HAFİF ALTIN HALE */}
        {theme === 'totw' && (
          <div
            className="absolute inset-0 pointer-events-none -z-10 blur-[5px] animate-mvp-cosmic-aura"
            style={{ transform: 'translateZ(-4px)', backfaceVisibility: 'hidden' }}
          >
            <div
              className="w-full h-full"
              style={{
                background:
                  'linear-gradient(135deg, rgba(253, 224, 71, 0.95) 0%, rgba(245, 158, 11, 0.85) 50%, rgba(251, 191, 36, 0.95) 100%)',
                WebkitMaskImage: "url('/cards/card_totw.png')",
                maskImage: "url('/cards/card_totw.png')",
                WebkitMaskSize: 'contain',
                maskSize: 'contain',
                WebkitMaskRepeat: 'no-repeat',
                maskRepeat: 'no-repeat',
                WebkitMaskPosition: 'center',
                maskPosition: 'center',
              }}
            />
          </div>
        )}

        {/* KATMAN 1: ARKA TABLA & ŞABLON (Drop-shadow burada bulunur, preserve-3d'yi bozmaz) */}
        <img
          src={themeConfig.template}
          alt={themeConfig.label}
          loading={priority || size === 'lg' ? 'eager' : 'lazy'}
          fetchPriority={priority ? 'high' : undefined}
          decoding="async"
          style={{ transform: 'translateZ(0px)', backfaceVisibility: 'hidden' }}
          className={`absolute inset-0 w-full h-full object-contain pointer-events-none select-none z-0 transition-[filter] duration-200 ${
            theme === 'totw'
              ? 'drop-shadow-[0_0_7px_rgba(251,191,36,0.38)] group-hover:drop-shadow-[0_0_11px_rgba(251,191,36,0.55)]'
              : theme === 'wall'
              ? 'drop-shadow-[0_12px_24px_rgba(56,189,248,0.22)] group-hover:drop-shadow-[0_18px_32px_rgba(56,189,248,0.38)]'
              : theme === 'nostalgia'
              ? 'drop-shadow-[0_12px_24px_rgba(180,83,9,0.3)] group-hover:drop-shadow-[0_18px_32px_rgba(180,83,9,0.45)]'
              : 'drop-shadow-xl group-hover:drop-shadow-[0_20px_30px_rgba(0,0,0,0.55)]'
          }`}
        />

        {/* ÖZEL EFEKT: ALEV ATIYOR (INFORM) KÖZDEN HAFİF ALEV & KIVILCIM PARÇACIKLARI */}
        {theme === 'inform' && (
          <div
            className="absolute bottom-0 left-[6%] right-[6%] h-[24%] pointer-events-none z-15 overflow-visible"
            style={{ transform: 'translateZ(3px)', backfaceVisibility: 'hidden' }}
          >
            {/* Köz üzerinden hafif dalgalanan alev aydınlığı */}
            <div className="absolute inset-0 bg-gradient-to-t from-orange-600/30 via-amber-500/15 to-transparent blur-sm animate-flame-bottom-glow" />
            {/* Organik yükselen hafif köz kıvılcımları */}
            <span className="absolute bottom-2 left-[18%] w-1.5 h-1.5 rounded-full bg-amber-300 blur-[0.5px] shadow-[0_0_6px_#f97316] animate-ember-rise-1" />
            <span className="absolute bottom-1 left-[36%] w-2 h-2 rounded-full bg-orange-400 blur-[0.5px] shadow-[0_0_6px_#ea580c] animate-ember-rise-2" />
            <span className="absolute bottom-3 left-[52%] w-1.5 h-1.5 rounded-full bg-yellow-300 blur-[0.5px] shadow-[0_0_6px_#facc15] animate-ember-rise-3" />
            <span
              className="absolute bottom-1 left-[68%] w-2 h-2 rounded-full bg-amber-400 blur-[0.5px] shadow-[0_0_6px_#f97316] animate-ember-rise-1"
              style={{ animationDelay: '0.8s' }}
            />
            <span
              className="absolute bottom-2 left-[82%] w-1.5 h-1.5 rounded-full bg-orange-300 blur-[0.5px] shadow-[0_0_6px_#ea580c] animate-ember-rise-2"
              style={{ animationDelay: '1.3s' }}
            />
          </div>
        )}

        {/* ÖZEL EFEKT: REVİR DÜŞÜK SAĞLIK VİGNETTE & KALP ATIŞI (HEARTBEAT) ANİMASYONU */}
        {theme === 'revir' && (
          <div
            className="absolute inset-[1.5%] rounded-[24px] sm:rounded-[34px] pointer-events-none z-25 overflow-hidden animate-revir-heartbeat"
            style={{
              transform: 'translateZ(3.5px)',
              backfaceVisibility: 'hidden',
              background:
                'radial-gradient(ellipse at center, rgba(239, 68, 68, 0) 36%, rgba(220, 38, 38, 0.20) 68%, rgba(185, 28, 28, 0.65) 92%, rgba(127, 29, 29, 0.85) 100%)',
              boxShadow: 'inset 0 0 24px rgba(220, 38, 38, 0.65)',
            }}
          />
        )}

        {/* KATMAN 2: OYUNCU FOTOĞRAFI (Fotoğraf kart tabanında hafif 3D derinlikte durur) */}
        <div
          className={`absolute ${themeConfig.photoFrame} flex items-center justify-center z-10 overflow-hidden`}
          style={{
            maskImage: 'linear-gradient(to bottom, black 72%, transparent 100%)',
            WebkitMaskImage: 'linear-gradient(to bottom, black 72%, transparent 100%)',
            transform: 'translateZ(2px)',
            backfaceVisibility: 'hidden',
          }}
        >
          <div
            onMouseDown={photoInteractive ? onPhotoMouseDown : undefined}
            onTouchStart={photoInteractive ? onPhotoTouchStart : undefined}
            onWheel={photoInteractive ? onPhotoWheel : undefined}
            className={`w-full h-full flex items-center justify-center ${
              photoInteractive ? 'cursor-grab active:cursor-grabbing touch-none ring-2 ring-amber-400 rounded-xl photo-drag-ring' : ''
            }`}
            title={photoInteractive ? 'Fotoğrafı sürükleyin veya fare tekerleğiyle yakınlaştırın' : undefined}
          >
            <img
              src={
                player.photoUrl === '/logo.jpg'
                  ? '/logo.png'
                  : player.photoUrl.startsWith('idb:')
                  ? TRANSPARENT_PIXEL
                  : player.photoUrl
              }
              alt={player.name}
              loading={priority || size === 'lg' ? 'eager' : 'lazy'}
              fetchPriority={priority ? 'high' : undefined}
              decoding="async"
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
              <span
                data-export-ignore="true"
                className="absolute bottom-1 bg-black/85 text-[8px] text-amber-300 font-bold px-1.5 py-0.5 rounded border border-amber-400/40 pointer-events-none"
              >
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
            transform: 'translateZ(4px)',
            backfaceVisibility: 'hidden',
          }}
        >
          {/* OVR (86) */}
          <span className={`font-black tracking-tighter leading-none ${themeConfig.ovrColor} ${sizeConfig.ovrText} drop-shadow-[0_2px_4px_rgba(0,0,0,0.95)]`}>
            {ovr}
          </span>
          {/* Mevki(ler): ana mevki + ek mevkiler yan yana (MID FWD). Çoğaldıkça yazı küçülür, kolon dışına taşmaz. */}
          <span
            className={`inline-flex items-baseline justify-center whitespace-nowrap tracking-wider uppercase font-black mt-1 ${sizeConfig.posText} drop-shadow-[0_1px_3px_rgba(0,0,0,0.95)]`}
            style={{ fontSize: positions.length === 1 ? undefined : positions.length === 2 ? '0.82em' : '0.66em', gap: positions.length === 1 ? 0 : '0.35em' }}
            title={positions.join(' / ')}
          >
            {positions.map((pos, i) => (
              <span key={pos} className={i === 0 ? 'text-white' : 'text-amber-200/90'}>
                {pos}
              </span>
            ))}
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
              loading={priority || size === 'lg' ? 'eager' : 'lazy'}
              decoding="async"
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
              loading={priority || size === 'lg' ? 'eager' : 'lazy'}
              decoding="async"
              className="w-full h-full object-contain rounded-full"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = '/cards/logo_badge.png';
              }}
            />
          </div>
        </div>

        {/* Sağ Üst Tema Kalkanı (3D Parallax: translateZ(6px) - Tüm kartlarda tek tip Efsane beyaz yıldırım akımı; diğer kartlarda masaüstünde yalnızca hover'da, dokunmatikte ekrandayken aktif) */}
        <div
          className={`absolute ${
            theme === 'totw'
              ? `top-[9.8%] right-[9.5%] ${sizeConfig.mvpShieldSize}`
              : `top-[13.0%] right-[13.5%] ${sizeConfig.shieldSize}`
          } pointer-events-none z-30 select-none flex items-center justify-center`}
          style={{
            transform: 'translateZ(6px)',
            backfaceVisibility: 'hidden',
            ['--crest-electric-core' as string]: CREST_ELECTRIC_CORE,
            ['--crest-glow-primary' as string]: CREST_GLOW_PRIMARY,
            ['--crest-glow-secondary' as string]: CREST_GLOW_SECONDARY,
          }}
        >
          {(() => {
            const crestHoverClass =
              theme === 'totw' || theme === 'inform' || theme === 'wall' ? '' : ' crest-hover-only';
            return (
              <>
                {/* İnce arka parlama halkası: tek tip beyaz Efsane parlama */}
                <div
                  className={`absolute ${
                    theme === 'totw' ? 'inset-1' : '-inset-1'
                  } rounded-full pointer-events-none -z-10 blur-[2px] animate-crest-plasma${crestHoverClass}`}
                  style={{
                    background: `radial-gradient(circle, ${CREST_GLOW_PRIMARY} 10%, ${CREST_GLOW_SECONDARY} 48%, rgba(0, 0, 0, 0) 72%)`,
                  }}
                />

                {/* Tek tip beyaz yıldırım / elektrik arkı: MVP ve Alev Atıyo!'da sürekli, diğer kartlarda masaüstünde hover'da, tablet/telefonda ekrandayken aktif */}
                <svg
                  viewBox="0 0 100 100"
                  className={`absolute ${
                    theme === 'totw'
                      ? 'inset-1 w-[calc(100%-8px)] h-[calc(100%-8px)]'
                      : '-inset-2 w-[calc(100%+16px)] h-[calc(100%+16px)]'
                  } pointer-events-none z-20 overflow-visible${crestHoverClass}`}
                  aria-hidden="true"
                >
                  {/* Akım 1: Saat yönünde dolaşan kırıklı yüksek voltaj arkı (Dış plazma + parlak çekirdek) */}
                  <path
                    d="M 50 7 L 64 11 L 78 16 L 87 30 L 89 48 L 85 65 L 75 79 L 61 88 L 50 93 L 39 88 L 25 79 L 15 65 L 11 48 L 13 30 L 22 16 L 36 11 Z"
                    fill="none"
                    pathLength={280}
                    stroke={CREST_GLOW_PRIMARY}
                    strokeWidth="4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeDasharray="52 38 22 168"
                    className="animate-electric-arc-1"
                    opacity="0.85"
                  />
                  <path
                    d="M 50 7 L 64 11 L 78 16 L 87 30 L 89 48 L 85 65 L 75 79 L 61 88 L 50 93 L 39 88 L 25 79 L 15 65 L 11 48 L 13 30 L 22 16 L 36 11 Z"
                    fill="none"
                    pathLength={280}
                    stroke={CREST_ELECTRIC_CORE}
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeDasharray="52 38 22 168"
                    className="animate-electric-arc-1"
                  />

                  {/* Akım 2: Ters yönde akan kırıklı ikincil yıldırım halkası */}
                  <path
                    d="M 50 10 L 70 14 L 83 25 L 86 43 L 82 62 L 69 78 L 50 90 L 31 78 L 18 62 L 14 43 L 17 25 L 30 14 Z"
                    fill="none"
                    pathLength={280}
                    stroke={CREST_GLOW_SECONDARY}
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeDasharray="36 54 18 172"
                    className="animate-electric-arc-2"
                    opacity="0.8"
                  />
                  <path
                    d="M 50 10 L 70 14 L 83 25 L 86 43 L 82 62 L 69 78 L 50 90 L 31 78 L 18 62 L 14 43 L 17 25 L 30 14 Z"
                    fill="none"
                    pathLength={280}
                    stroke={CREST_ELECTRIC_CORE}
                    strokeWidth="1.3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeDasharray="36 54 18 172"
                    className="animate-electric-arc-2"
                  />

                  {/* Kıvılcım Çatalları 1: Sağ üst & sol alt yüksek voltaj sıçramaları */}
                  <g className="animate-electric-spark">
                    <path
                      d="M 76 17 L 85 11 L 82 19 L 92 14"
                      fill="none"
                      stroke={CREST_ELECTRIC_CORE}
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M 21 75 L 12 81 L 16 86 L 8 90"
                      fill="none"
                      stroke={CREST_GLOW_PRIMARY}
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </g>

                  {/* Kıvılcım Çatalları 2: Sol üst & sağ alt faz kaydırmalı çakmalar */}
                  <g className="animate-electric-spark" style={{ animationDelay: '0.65s' }}>
                    <path
                      d="M 22 18 L 13 13 L 17 22 L 8 24"
                      fill="none"
                      stroke={CREST_GLOW_PRIMARY}
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M 79 73 L 88 79 L 83 84 L 92 88"
                      fill="none"
                      stroke={CREST_ELECTRIC_CORE}
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </g>
                </svg>
              </>
            );
          })()}

          <img
            src={THEME_SHIELDS[theme]}
            alt={`${theme} Crest`}
            loading={priority || size === 'lg' ? 'eager' : 'lazy'}
            decoding="async"
            className="w-full h-full object-contain opacity-95 relative z-10 animate-electric-rim"
          />
        </div>

        {/* Lakap: isimliğin hemen üstünde (3D Parallax: translateZ(3px)) */}
        <div
          className={`absolute left-0 right-0 ${themeConfig.nickTop} flex items-center justify-center text-center z-20 pointer-events-none`}
          style={{
            transform: 'translateY(-50%) translateZ(3px)',
            backfaceVisibility: 'hidden',
          }}
        >
          <p
            className={`font-bold italic ${themeConfig.nicknameColor} ${sizeConfig.nickText} tracking-wide leading-[1.5] pt-1.5 pb-0.5 ${
              theme === 'legend'
                ? 'drop-shadow-none'
                : 'drop-shadow-[0_2px_4px_rgba(0,0,0,0.95)]'
            } truncate w-full px-4`}
          >
            &quot;{player.nickname}&quot;
          </p>
        </div>

        {/* Oyuncu Adı: isimlik plakasının tam ortasında (3D Parallax: translateZ(3px)) */}
        <div
          className={`absolute left-0 right-0 ${themeConfig.nameTop} flex items-center justify-center text-center z-20 pointer-events-none`}
          style={{
            transform: 'translateY(-50%) translateZ(3px)',
            backfaceVisibility: 'hidden',
          }}
        >
          <h3
            className={`font-black uppercase tracking-wide leading-none ${themeConfig.nameColor} ${
              theme === 'legend' ||
              theme === 'bidon' ||
              theme === 'gold' ||
              theme === 'silver' ||
              theme === 'bronze' ||
              theme === 'wall' ||
              theme === 'nostalgia'
                ? sizeConfig.nameBigText
                : sizeConfig.nameText
            } ${
              theme === 'legend' || theme === 'bidon' || theme === 'gold' || theme === 'silver' || theme === 'nostalgia'
                ? 'drop-shadow-none'
                : 'drop-shadow-[0_2px_5px_rgba(0,0,0,0.95)]'
            } truncate w-full px-4`}
          >
            {player.name}
          </h3>
        </div>

        {/* PlayStyles Rozetleri (3D Parallax: translateZ(3.5px)) - Sadece Simge ve Yazı, Kutusuz ve Çerçevesiz */}
        {showBadges && (() => {
          const { slot1, slot2 } = resolvePlayerPlaystyleSlots(player);
          const displaySlots = [slot1, slot2];
          return (
            <div
              className={`absolute ${themeConfig.ovalsTop} ${themeConfig.ovalsBounds} ${themeConfig.ovalsHeight} grid grid-cols-2 gap-2 z-20 pointer-events-none select-none`}
              style={{
                transform: 'translateY(-50%) translateZ(3.5px)',
                backfaceVisibility: 'hidden',
              }}
            >
              {displaySlots.map((ps, idx) => {
                if (!ps || !PLAYSTYLE_CONFIG[ps]) {
                  return <div key={idx} className="h-full w-full" />;
                }
                const cfg = PLAYSTYLE_CONFIG[ps];
                const Icon = cfg.icon;

                return (
                  <div
                    key={idx}
                    className={`h-full w-full flex items-center justify-center overflow-hidden ${size === 'sm' ? 'gap-0.5 px-0.5' : 'gap-1.5 px-1'}`}
                    title={`${cfg.label}: ${cfg.description}`}
                  >
                    <Icon className={`${size === 'sm' ? 'w-2 h-2' : size === 'md' ? 'w-3.5 h-3.5' : 'w-4 h-4'} ${themeConfig.ovalIconColor} shrink-0 ${themeConfig.ovalDropShadow}`} />
                    <PlayStyleMarqueeLabel
                      text={cfg.label}
                      className={`${sizeConfig.pillText} font-bold tracking-tight ${themeConfig.ovalTextColor} ${themeConfig.ovalDropShadow}`}
                    />
                  </div>
                );
              })}
            </div>
          );
        })()}

        {/* 6 Temel Saha İstatistiği (3D Parallax: translateZ(2.5px)) */}
        <div
          className={`absolute ${themeConfig.statBounds} ${themeConfig.statTop} grid grid-cols-6 text-center pointer-events-none select-none z-20`}
          style={{
            transform: 'translateY(-50%) translateZ(2.5px)',
            backfaceVisibility: 'hidden',
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
          className="absolute -bottom-3 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-neutral-950/95 hover:bg-neutral-800 text-amber-400 border border-amber-400/50 text-[10px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-xl cursor-pointer whitespace-nowrap z-30"
          title="WhatsApp ve Instagram için HD PNG İndir"
        >
          <Download className="w-3 h-3" />
          {isDownloading ? 'İndiriliyor...' : 'Kartı İndir (PNG)'}
        </button>
      )}
    </div>
  );
});
