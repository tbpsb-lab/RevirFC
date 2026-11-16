import React, { useState, useRef, useEffect } from 'react';
import {
  Player,
  PlayStyle,
  PreferredPosition,
  CardTheme,
  Match,
  PlayerScoutingEntry,
  CURRENT_STATS_SYNC_VERSION,
  getStandardThemeByOVR,
  isStandardCardTheme,
  isClubLegendPlayer,
  isFormerPlayer,
  getDefaultCardThemeForPlayer,
  normalizePlayerThemeAndLegend,
  resolvePlayerPlaystyleSlots,
  computeCommitteeSlot2FromVotes,
  shiftPlayerStatsByDelta,
} from '../../types';
import { COMMITTEE_MEMBERS } from '../../services/mockData';
import { FCCard } from './FCCard';
import { PLAYSTYLE_CONFIG, PLAYSTYLE_CATEGORIES } from './PlayStyleBadge';
import {
  NATIONS,
  PRIMARY_NATIONS,
  OTHER_NATIONS,
  BIG_FOUR_TR_CLUBS,
  OTHER_TR_CLUBS,
  WORLD_TOP_CLUBS,
  getClubById,
  getClubLogoUrl,
  getNationFlagUrl,
  getShortCountry,
  DEFAULT_NATION,
} from '../../data/teamsAndNations';
import { removeImageBackground, stripBlackBackgroundFromDataUrl } from '../../services/backgroundRemoval';
import { ALL_POSITIONS, POSITION_LABELS, MAX_POSITIONS, formatPositions } from '../../services/positions';
import {
  Upload,
  Sparkles,
  Check,
  RefreshCw,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Wand2,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Lock,
  Clock,
  Eye,
  BarChart3,
} from 'lucide-react';

interface Props {
  player: Player;
  onSave: (updated: Player) => void;
  onClose: () => void;
  isAdmin?: boolean;
  /** Yalnızca Yönetici: Efsane atama, lakap değişikliğini doğrudan kaydetme. (isAdmin = Kurul + Yönetici) */
  isSuperAdmin?: boolean;
  /** Yönetici/Kaptan veya Kurul üyesi: ana + ek mevkileri belirleyebilir. */
  canEditPositions?: boolean;
  canEdit?: boolean;
  isPendingUser?: boolean;
  isOwnCard?: boolean;
  allPlayers?: Player[];
  evaluatorName?: string;
  currentMatch?: Match;
  scoutingEntries?: PlayerScoutingEntry[];
}

/**
 * Ana mevki + ek mevkiler (en fazla 2 ek) seçici. Sadece Kurul/Yönetici düzenleyebilir.
 */
const PositionEditor: React.FC<{
  value: Pick<Player, 'position' | 'secondaryPositions'>;
  editable: boolean;
  onChange: (next: { position: PreferredPosition; secondaryPositions: PreferredPosition[] }) => void;
}> = ({ value, editable, onChange }) => {
  const secondary = (value.secondaryPositions ?? []).filter((p) => p !== value.position);

  const setPrimary = (pos: PreferredPosition) => {
    onChange({ position: pos, secondaryPositions: secondary.filter((p) => p !== pos) });
  };

  const toggleSecondary = (pos: PreferredPosition) => {
    if (pos === value.position) return;
    if (secondary.includes(pos)) {
      onChange({ position: value.position, secondaryPositions: secondary.filter((p) => p !== pos) });
    } else if (secondary.length < MAX_POSITIONS - 1) {
      onChange({ position: value.position, secondaryPositions: [...secondary, pos] });
    }
  };

  return (
    <div className="bg-neutral-950/50 p-2.5 rounded-xl border border-neutral-800 space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold text-neutral-300">⚽ İdeal Mevkiler</label>
        <span className="text-[10px] text-amber-400/80 font-normal">
          {editable ? 'Kurul / Yönetici belirler' : '🔒 Mevkileri Kurul belirler'}
        </span>
      </div>

      <div>
        <span className="text-[10px] text-neutral-400 block mb-1">Ana mevki</span>
        <div className="grid grid-cols-4 gap-1.5">
          {ALL_POSITIONS.map((pos) => (
            <button
              key={pos}
              type="button"
              disabled={!editable}
              onClick={() => setPrimary(pos)}
              title={POSITION_LABELS[pos]}
              className={`py-1.5 rounded-lg border text-[11px] font-black transition-all ${
                value.position === pos
                  ? 'bg-amber-500 text-black border-amber-400'
                  : 'bg-neutral-800/80 text-neutral-300 border-neutral-700'
              } ${editable ? 'cursor-pointer hover:border-neutral-500' : 'cursor-not-allowed opacity-70'}`}
            >
              {pos}
            </button>
          ))}
        </div>
      </div>

      <div>
        <span className="text-[10px] text-neutral-400 block mb-1">
          Ek mevkiler <span className="text-neutral-500">(en fazla {MAX_POSITIONS - 1})</span>
        </span>
        <div className="grid grid-cols-4 gap-1.5">
          {ALL_POSITIONS.map((pos) => {
            const isPrimary = value.position === pos;
            const isOn = secondary.includes(pos);
            const full = !isOn && secondary.length >= MAX_POSITIONS - 1;
            return (
              <button
                key={pos}
                type="button"
                disabled={!editable || isPrimary || full}
                onClick={() => toggleSecondary(pos)}
                title={isPrimary ? 'Ana mevki' : POSITION_LABELS[pos]}
                className={`py-1.5 rounded-lg border text-[11px] font-black transition-all ${
                  isOn
                    ? 'bg-amber-200/90 text-black border-amber-300'
                    : 'bg-neutral-800/80 text-neutral-300 border-neutral-700'
                } ${
                  !editable || isPrimary || full ? 'cursor-not-allowed opacity-40' : 'cursor-pointer hover:border-neutral-500'
                }`}
              >
                {pos}
              </button>
            );
          })}
        </div>
      </div>

      <p className="text-[10px] text-neutral-400">
        Kartta: <span className="font-black text-white">{formatPositions(value)}</span>
      </p>
    </div>
  );
};

const THEME_INFO: Record<CardTheme, { label: string; icon: string; title: string; desc: string }> = {
  bronze: { label: 'Bronz', icon: '🥉', title: 'Standart Bronz Kart (45–64)', desc: '45 – 64 OVR arası oyuncuların standart kulüp kartıdır.' },
  silver: { label: 'Gümüş', icon: '🥈', title: 'Standart Gümüş Kart (65–74)', desc: '65 – 74 OVR arası oyuncuların standart kulüp kartıdır.' },
  gold: { label: 'Altın', icon: '🟡', title: 'Standart Altın Kart (75–99)', desc: '75 – 99 OVR arası oyuncuların standart kulüp kartıdır.' },
  totw: { label: 'MVP', icon: '⭐', title: 'Haftanın En Değerli Oyuncusu (MVP)', desc: 'Haftanın en iyi oyuncusuna Kurul ve maç sonu oylaması tarafından hediye edilir.' },
  inform: { label: 'Alev Atıyo!', icon: '🔥', title: 'Alev Atıyo! 🔥', desc: 'Sadece Kurul tarafından verilir (Maksimum 3 kişi). Sahada durdurulamayan, alev alev yanan performanslar içindir.' },
  wall: { label: 'Etten Duvar', icon: '🧱', title: 'Haftanın Etten Duvarı 🧱', desc: 'Maç sonu oylamasında en iyi savunma/kaleci seçilen oyuncuya Kurul tarafından verilir.' },
  revir: { label: 'Revir', icon: '🩹', title: 'Bandajlı Sakat Raporu', desc: 'Maç öncesi sakatlık check-in durumu bildiren oyunculara otomatik atanır.' },
  legend: { label: 'Efsane', icon: '👑', title: 'Kulüp Efsanesi', desc: 'Yalnızca İsmail, Gölcür ve Cevdet için özel Efsane kartıdır (Bronz/Gümüş/Altın sınıfına girmez, Bidon seçilemez).' },
  bidon: { label: 'Bidon', icon: '🛢️', title: 'Haftanın Bidonu', desc: 'Maç sonu oylamasında haftanın bidonu seçilen oyuncuya takılır. Haftaya koca bir termos çay borçlanır ☕' },
  nostalgia: { label: 'Mazide Kalanlar', icon: '📜', title: 'Mazide Kalanlar (Kulüp Hatırası)', desc: 'Gruptan ayrılan eski üyeler için kulüp hatırası nostalji kartı (Yalnızca Yönetici Atayabilir).' },
};

export const CardCustomizer: React.FC<Props> = ({
  player,
  onSave,
  onClose,
  isAdmin = false,
  isSuperAdmin = false,
  canEditPositions = false,
  canEdit = true,
  isPendingUser = false,
  isOwnCard = false,
  evaluatorName = 'Alper',
  currentMatch,
  scoutingEntries = [],
}) => {
  const [editedPlayer, setEditedPlayer] = useState<Player>(() =>
    normalizePlayerThemeAndLegend({ ...player })
  );
  const [selectedPlaystyleCategory, setSelectedPlaystyleCategory] = useState<'all' | 'tactical' | 'status' | 'humor'>('all');
  // Kendi kartında her zaman 1. Slot düzenlenir; Kurul üyesi başkasının kartında varsayılan olarak 2. Slotu düzenler.
  const canEditSlot1 = isOwnCard || isSuperAdmin || !isAdmin;
  const canEditSlot2 = isAdmin && (!isOwnCard || isSuperAdmin);
  const [activePlaystyleSlot, setActivePlaystyleSlot] = useState<1 | 2>(() =>
    isAdmin && !isOwnCard ? 2 : 1
  );
  const [isCompressing, setIsCompressing] = useState(false);
  const [isRemovingBg, setIsRemovingBg] = useState(false);
  const [removalProgress, setRemovalProgress] = useState(0);

  const [adjustments, setAdjustments] = useState({
    x: player.photoAdjustments?.x ?? 0,
    y: player.photoAdjustments?.y ?? 0,
    scale: player.photoAdjustments?.scale ?? 1.0,
  });

  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ startX: number; startY: number; initX: number; initY: number } | null>(null);
  const touchDistRef = useRef<number | null>(null);
  const touchStartScaleRef = useRef<number>(1.0);

  const updateAdjustments = (partial: Partial<{ x: number; y: number; scale: number }>) => {
    setAdjustments((prev) => {
      const next = { ...prev, ...partial };
      setEditedPlayer((p) => ({
        ...p,
        photoAdjustments: next,
      }));
      return next;
    });
  };

  const updateAdjustment = (key: 'x' | 'y' | 'scale', value: number) => {
    updateAdjustments({ [key]: value });
  };

  const resetAdjustments = () => {
    const initial = { x: 0, y: 0, scale: 1.0 };
    setAdjustments(initial);
    setEditedPlayer((prev) => ({
      ...prev,
      photoAdjustments: initial,
    }));
  };

  // Direct mouse drag on card photo
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initX: adjustments.x,
      initY: adjustments.y,
    };
  };

  // Wheel zoom directly on card photo
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const zoomDelta = e.deltaY < 0 ? 0.08 : -0.08;
    const nextScale = Math.max(0.6, Math.min(3.5, Math.round((adjustments.scale + zoomDelta) * 100) / 100));
    updateAdjustment('scale', nextScale);
  };

  // Touch handlers for mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      dragStartRef.current = {
        startX: e.touches[0].clientX,
        startY: e.touches[0].clientY,
        initX: adjustments.x,
        initY: adjustments.y,
      };
      touchDistRef.current = null;
    } else if (e.touches.length === 2) {
      setIsDragging(false);
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
      touchDistRef.current = dist;
      touchStartScaleRef.current = adjustments.scale;
    }
  };

  useEffect(() => {
    const handleMouseMoveGlobal = (e: MouseEvent) => {
      if (!isDragging || !dragStartRef.current) return;
      const dx = e.clientX - dragStartRef.current.startX;
      const dy = e.clientY - dragStartRef.current.startY;
      const sens = 0.45;
      const nextX = Math.max(-100, Math.min(100, Math.round(dragStartRef.current.initX + dx * sens)));
      const nextY = Math.max(-100, Math.min(100, Math.round(dragStartRef.current.initY + dy * sens)));
      updateAdjustments({ x: nextX, y: nextY });
    };

    const handleMouseUpGlobal = () => {
      setIsDragging(false);
      dragStartRef.current = null;
    };

    const handleTouchMoveGlobal = (e: TouchEvent) => {
      if (e.touches.length === 1 && isDragging && dragStartRef.current) {
        const dx = e.touches[0].clientX - dragStartRef.current.startX;
        const dy = e.touches[0].clientY - dragStartRef.current.startY;
        const sens = 0.45;
        const nextX = Math.max(-100, Math.min(100, Math.round(dragStartRef.current.initX + dx * sens)));
        const nextY = Math.max(-100, Math.min(100, Math.round(dragStartRef.current.initY + dy * sens)));
        updateAdjustments({ x: nextX, y: nextY });
      } else if (e.touches.length === 2 && touchDistRef.current !== null) {
        const t1 = e.touches[0];
        const t2 = e.touches[1];
        const currentDist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
        const scaleFactor = currentDist / touchDistRef.current;
        const nextScale = Math.max(0.6, Math.min(3.5, Math.round(touchStartScaleRef.current * scaleFactor * 100) / 100));
        updateAdjustment('scale', nextScale);
      }
    };

    const handleTouchEndGlobal = () => {
      setIsDragging(false);
      dragStartRef.current = null;
      touchDistRef.current = null;
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMoveGlobal);
      window.addEventListener('mouseup', handleMouseUpGlobal);
    }
    window.addEventListener('touchmove', handleTouchMoveGlobal, { passive: false });
    window.addEventListener('touchend', handleTouchEndGlobal);

    return () => {
      window.removeEventListener('mousemove', handleMouseMoveGlobal);
      window.removeEventListener('mouseup', handleMouseUpGlobal);
      window.removeEventListener('touchmove', handleTouchMoveGlobal);
      window.removeEventListener('touchend', handleTouchEndGlobal);
    };
  }, [isDragging]);

  // Handle Photo Upload preserving alpha transparency (WebP / PNG fallback, never JPEG)
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    try {
      setIsCompressing(true);
      const rawUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const el = new Image();
        el.onload = () => resolve(el);
        el.onerror = reject;
        el.src = rawUrl;
      });

      const MAX_UPLOAD_SIDE = 960;
      const scale = Math.min(1, MAX_UPLOAD_SIDE / Math.max(img.naturalWidth || 1, img.naturalHeight || 1));
      const w = Math.max(1, Math.round((img.naturalWidth || 600) * scale));
      const h = Math.max(1, Math.round((img.naturalHeight || 600) * scale));

      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      let finalUrl = rawUrl;
      if (ctx) {
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.clearRect(0, 0, w, h);
        ctx.drawImage(img, 0, 0, w, h);
        const webp = canvas.toDataURL('image/webp', 0.90);
        finalUrl = webp.startsWith('data:image/webp') ? webp : canvas.toDataURL('image/png');
      }

      setEditedPlayer((prev) => ({
        ...prev,
        photoUrl: finalUrl,
        photoAdjustments: { x: 0, y: 0, scale: 1.0 },
      }));
      setAdjustments({ x: 0, y: 0, scale: 1.0 });
    } catch (err) {
      console.error('Image upload processing failed:', err);
      alert('Görsel işlenemedi. Lütfen PNG, JPG veya WebP formatında bir fotoğraf seçin.');
    } finally {
      setIsCompressing(false);
    }
  };

  // AI Background Removal (Dekupe)
  const handleRemoveBackground = async () => {
    if (!editedPlayer.photoUrl) return;
    try {
      setIsRemovingBg(true);
      setRemovalProgress(10);
      const transparentDataUrl = await removeImageBackground(editedPlayer.photoUrl, {
        onProgress: (_step, percent) => {
          setRemovalProgress(percent);
        },
      });
      setEditedPlayer((prev) => ({
        ...prev,
        photoUrl: transparentDataUrl,
      }));
    } catch (err) {
      console.error('AI background removal failed:', err);
      alert('Arka plan silme işlemi başarısız oldu. Lütfen manuel temizlenmiş görsel yükleyin.');
    } finally {
      setIsRemovingBg(false);
      setRemovalProgress(0);
    }
  };

  // Quick 1-click corner black matte stripper for PNGs that got flattened to black
  const handleStripBlackBg = async () => {
    if (!editedPlayer.photoUrl) return;
    try {
      setIsCompressing(true);
      const cleaned = await stripBlackBackgroundFromDataUrl(editedPlayer.photoUrl);
      setEditedPlayer((prev) => ({
        ...prev,
        photoUrl: cleaned,
      }));
    } catch (err) {
      console.error('Black background clean failed:', err);
    } finally {
      setIsCompressing(false);
    }
  };

  // "1+1 Dengeli PlayStyle" Sistemi
  // Slot 1: Oyuncunun Kendi Seçimi (ownPlaystyle)
  // Slot 2: Kurulun / Grubun Seçimi (committeePlaystyle, Kurul üyelerinin oylarından türetilir)
  const effectiveSlot2Override =
    isAdmin && isOwnCard && !isSuperAdmin && editedPlayer.committeePlaystyleVotes
      ? computeCommitteeSlot2FromVotes(editedPlayer.committeePlaystyleVotes, evaluatorName) ??
        editedPlayer.committeePlaystyle ??
        undefined
      : undefined;
  const resolvedSlots = resolvePlayerPlaystyleSlots({
    ...editedPlayer,
    committeePlaystyle: effectiveSlot2Override ?? editedPlayer.committeePlaystyle,
  });
  const slot1 = resolvedSlots.slot1;
  const slot2 = resolvedSlots.slot2;

  const handleSelectPlayStyle = (style: PlayStyle) => {
    const effectiveTargetSlot: 1 | 2 =
      !canEditSlot2 ? 1 : !canEditSlot1 ? 2 : activePlaystyleSlot;

    setEditedPlayer((prev) => {
      const prevSlots = resolvePlayerPlaystyleSlots(prev);
      const prevS1 = prevSlots.slot1;
      const prevS2 = prevSlots.slot2;

      if (effectiveTargetSlot === 1) {
        // Kural: Kurul'un 2. slotta seçtiği rozeti düz kullanıcı (veya kendi kartında kurul üyesi) seçemez!
        if (prevS2 && style === prevS2) {
          return prev;
        }
        const nextS1: PlayStyle | null = prevS1 === style ? null : style;
        const nextArr = [nextS1, prevS2].filter((x): x is PlayStyle => Boolean(x));
        return {
          ...prev,
          ownPlaystyle: nextS1,
          committeePlaystyle: prevS2 ?? null,
          playstyles: nextArr,
        };
      } else {
        // Slot 2 (Kurul / Yönetici seçimi)
        const nextVotes: Record<string, { style: PlayStyle; updatedAt: number }> = {
          ...(prev.committeePlaystyleVotes || {}),
        };
        const evalKey = evaluatorName.trim() || 'Alper';
        const myPrevVote = nextVotes[evalKey]?.style;

        let nextS2: PlayStyle | undefined;
        if (isSuperAdmin && !isOwnCard && !prev.committeePlaystyleVotes && prevS2 === style) {
          nextS2 = undefined;
        } else if (myPrevVote === style) {
          delete nextVotes[evalKey];
          nextS2 = computeCommitteeSlot2FromVotes(nextVotes);
        } else {
          nextVotes[evalKey] = { style, updatedAt: Date.now() };
          nextS2 = computeCommitteeSlot2FromVotes(nextVotes);
        }

        // Kural: Kurul sonradan oyuncunun 1. slottaki rozetinin aynısını 2. slota seçerse,
        // seçilen rozet 2. slotta görünür ve 1. slottan düşer (1. slot boş kalır).
        const nextS1: PlayStyle | null = nextS2 && prevS1 === nextS2 ? null : (prevS1 ?? null);
        const nextArr = [nextS1, nextS2].filter((x): x is PlayStyle => Boolean(x));

        return {
          ...prev,
          ownPlaystyle: nextS1,
          committeePlaystyle: nextS2 ?? null,
          committeePlaystyleVotes: nextVotes,
          playstyles: nextArr,
        };
      }
    });
  };

  // Update stat values (Yönetici Modu: manuel sabitleme flag'i işaretler, birikmiş maç delta etkisini korur)
  const updateStat = (key: keyof Player['stats'], val: number) => {
    const clamped = Math.max(30, Math.min(99, val));
    setEditedPlayer((prev) => {
      const existingMatchDelta = Math.round((prev.currentOVR ?? prev.baseOVR) - prev.baseOVR);
      const newStats = { ...prev.stats, [key]: clamped };
      const avg = Math.round(
        (newStats.pac + newStats.sho + newStats.pas + newStats.dri + newStats.def + newStats.phy) / 6
      );
      const nextOVR = isSuperAdmin ? Math.min(99, Math.max(45, avg)) : prev.currentOVR;
      const nextBaseOVR = isSuperAdmin
        ? Math.min(99, Math.max(45, nextOVR - existingMatchDelta))
        : prev.baseOVR;
      const nextBaseStats = isSuperAdmin
        ? shiftPlayerStatsByDelta(newStats, -existingMatchDelta)
        : prev.baseStats;
      return {
        ...prev,
        stats: newStats,
        baseStats: nextBaseStats,
        baseOVR: nextBaseOVR,
        exactOVR: isSuperAdmin ? nextOVR : prev.exactOVR,
        currentOVR: nextOVR,
        adminStatOverride: isSuperAdmin ? true : prev.adminStatOverride,
        adminStatOverrideAt: isSuperAdmin ? Date.now() : prev.adminStatOverrideAt,
        statsSyncVersion: CURRENT_STATS_SYNC_VERSION,
        theme: isClubLegendPlayer(prev)
          ? prev.theme === 'totw' || prev.theme === 'inform' || prev.theme === 'wall' || prev.theme === 'revir'
            ? prev.theme
            : 'legend'
          : isSuperAdmin && isStandardCardTheme(prev.theme)
          ? getStandardThemeByOVR(nextOVR)
          : prev.theme,
      };
    });
  };

  const committeeConsensus = React.useMemo(() => {
    const to100 = (val: number) => (val <= 10 ? Math.round(val * 10) : Math.round(val));
    const entries = scoutingEntries.filter(
      (e) =>
        e.playerId === editedPlayer.id &&
        (COMMITTEE_MEMBERS as readonly string[]).includes(e.evaluatorName)
    );
    if (entries.length === 0) {
      return {
        baseOVR: 50,
        stats: { pac: 50, sho: 50, pas: 50, dri: 50, def: 50, phy: 50 },
      };
    }
    const avgPac = entries.reduce((sum, e) => sum + to100(e.pac), 0) / entries.length;
    const avgSho = entries.reduce((sum, e) => sum + to100(e.sho), 0) / entries.length;
    const avgPas = entries.reduce((sum, e) => sum + to100(e.pas), 0) / entries.length;
    const avgDri = entries.reduce((sum, e) => sum + to100(e.dri), 0) / entries.length;
    const avgDef = entries.reduce((sum, e) => sum + to100(e.def), 0) / entries.length;
    const avgPhy = entries.reduce((sum, e) => sum + to100(e.phy), 0) / entries.length;
    const calculatedOVR = Math.round((avgPac + avgSho + avgPas + avgDri + avgDef + avgPhy) / 6);
    return {
      baseOVR: calculatedOVR,
      stats: {
        pac: Math.min(99, Math.round(avgPac)),
        sho: Math.min(99, Math.round(avgSho)),
        pas: Math.min(99, Math.round(avgPas)),
        dri: Math.min(99, Math.round(avgDri)),
        def: Math.min(99, Math.round(avgDef)),
        phy: Math.min(99, Math.round(avgPhy)),
      },
    };
  }, [scoutingEntries, editedPlayer.id]);

  const revertStatsToCommittee = () => {
    if (!isSuperAdmin) return;
    setEditedPlayer((prev) => {
      const currentExact = prev.exactOVR ?? prev.currentOVR ?? prev.baseOVR;
      const exactDelta = currentExact - prev.baseOVR;
      const nextBaseOVR = committeeConsensus.baseOVR;
      const nextExactOVR = Math.max(40, Math.min(97, Math.round((nextBaseOVR + exactDelta) * 1000) / 1000));
      const nextCurrentOVR = Math.max(40, Math.min(97, Math.round(nextExactOVR)));
      const nextStats = shiftPlayerStatsByDelta(committeeConsensus.stats, nextCurrentOVR - nextBaseOVR);
      return normalizePlayerThemeAndLegend({
        ...prev,
        baseOVR: nextBaseOVR,
        exactOVR: nextExactOVR,
        currentOVR: nextCurrentOVR,
        baseStats: committeeConsensus.stats,
        stats: nextStats,
        adminStatOverride: false,
        adminStatOverrideAt: undefined,
        statsSyncVersion: CURRENT_STATS_SYNC_VERSION,
      });
    });
  };


  const isLegendPlayer = isClubLegendPlayer(editedPlayer);
  const currentTheme: CardTheme = isLegendPlayer
    ? editedPlayer.theme === 'totw' ||
      editedPlayer.theme === 'inform' ||
      editedPlayer.theme === 'wall' ||
      editedPlayer.theme === 'revir'
      ? editedPlayer.theme
      : editedPlayer.currentStatus === 'light_injury'
      ? 'revir'
      : 'legend'
    : editedPlayer.theme === 'legend' || isStandardCardTheme(editedPlayer.theme)
    ? getStandardThemeByOVR(editedPlayer.currentOVR)
    : editedPlayer.theme;
  const themeDetails = THEME_INFO[currentTheme];
  const autoStandardTheme = isLegendPlayer ? 'legend' : getStandardThemeByOVR(editedPlayer.currentOVR);
  const defaultThemeLabel =
    autoStandardTheme === 'legend'
      ? 'Varsayılan (Efsane)'
      : autoStandardTheme === 'bronze'
      ? 'Varsayılan (Bronz)'
      : autoStandardTheme === 'silver'
      ? 'Varsayılan (Gümüş)'
      : 'Varsayılan (Altın)';
  const isSpecialThemeActive =
    currentTheme === 'totw' ||
    currentTheme === 'inform' ||
    currentTheme === 'wall' ||
    currentTheme === 'revir' ||
    currentTheme === 'bidon' ||
    currentTheme === 'nostalgia';
  const resetToDefaultAutoTheme = () => {
    const nextStatus = editedPlayer.currentStatus === 'light_injury' ? 'full' : editedPlayer.currentStatus;
    const nextTheme = getDefaultCardThemeForPlayer({
      ...editedPlayer,
      currentStatus: nextStatus,
    });
    setEditedPlayer({
      ...editedPlayer,
      currentStatus: nextStatus,
      theme: nextTheme,
      isFormer: isSuperAdmin ? false : Boolean(editedPlayer.isFormer),
      isLegend: isLegendPlayer,
      inFormAwardedAt: undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-200 overflow-y-auto">
      <div className="bg-neutral-900 border border-neutral-800 rounded-3xl max-w-4xl w-full max-h-[calc(100dvh-1rem)] sm:max-h-[90dvh] flex flex-col p-4 sm:p-5 shadow-2xl relative overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-neutral-800 shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                {canEdit ? (
                  <>
                    <Sparkles className="w-5 h-5 text-amber-400" />
                    <span>
                      {isSuperAdmin
                        ? '👑 Kartı Düzenle (Yönetici Modu)'
                        : isAdmin
                        ? '⭐ Kartı Düzenle (Kurul Üyesi Modu)'
                        : '✨ Kendi Kartını Düzenle'}
                    </span>
                  </>
                ) : (
                  <>
                    <Eye className="w-5 h-5 text-amber-400" />
                    <span>{player.name} • Kart İnceleme</span>
                  </>
                )}
              </h2>
              {canEdit && isAdmin && (
                <span
                  className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border ${
                    isSuperAdmin
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                      : 'bg-sky-500/15 text-sky-300 border-sky-500/35'
                  }`}
                >
                  {isSuperAdmin ? '👑 Yönetici' : '⭐ Kurul Modu'}
                </span>
              )}
              {isPendingUser && (
                <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Seyirci Modu
                </span>
              )}
              {!canEdit && !isPendingUser && (
                <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-neutral-800 text-neutral-300 border border-neutral-700">
                  Salt Okunur
                </span>
              )}
            </div>
            <p className="text-xs text-neutral-400 mt-0.5">
              {canEdit
                ? 'Fotoğrafınızı kart üzerinden serbestçe kadrajlayın; lakap, takım ve yetenek rozetinizi belirleyin.'
                : 'Oyuncunun 3D parallax kartını, niteliklerini ve PlayStyles rozetlerini inceleyin.'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-white bg-neutral-800 hover:bg-neutral-700 rounded-xl px-3 py-1.5 text-xs font-bold transition-colors cursor-pointer"
          >
            ✕ Kapat
          </button>
        </div>

        {/* Modal Body */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 sm:gap-6 overflow-y-auto overscroll-contain pr-1 flex-1 min-h-0 py-3 sm:py-4">
          {/* Left Column: 3D Card Display */}
          <div className="md:col-span-5 flex flex-col items-center justify-start">
            <FCCard
              player={editedPlayer}
              size="md"
              interactive={!canEdit}
              photoInteractive={canEdit}
              onPhotoMouseDown={canEdit ? handleMouseDown : undefined}
              onPhotoTouchStart={canEdit ? handleTouchStart : undefined}
              onPhotoWheel={canEdit ? handleWheel : undefined}
            />

            {/* If Edit Mode: Framing & Upload controls right below the card */}
            {canEdit ? (
              <div className="w-72 mt-3 space-y-2">
                {/* Zoom & Reset Row */}
                <div className="flex items-center justify-between bg-neutral-950 px-2.5 py-1.5 rounded-lg border border-neutral-800 text-xs">
                  <span className="text-[11px] text-neutral-400 font-semibold">Ölçek:</span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => updateAdjustment('scale', Math.max(0.6, Math.round((adjustments.scale - 0.1) * 10) / 10))}
                      className="p-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded text-xs font-bold cursor-pointer"
                      title="Küçült"
                    >
                      <ZoomOut className="w-3.5 h-3.5" />
                    </button>
                    <span className="font-mono text-amber-400 font-bold text-xs min-w-10 text-center">
                      {adjustments.scale.toFixed(2)}x
                    </span>
                    <button
                      type="button"
                      onClick={() => updateAdjustment('scale', Math.min(3.5, Math.round((adjustments.scale + 0.1) * 10) / 10))}
                      className="p-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded text-xs font-bold cursor-pointer"
                      title="Büyüt"
                    >
                      <ZoomIn className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={resetAdjustments}
                    className="text-[11px] text-neutral-300 hover:text-white flex items-center gap-1 bg-neutral-800 hover:bg-neutral-700 px-2 py-0.5 rounded cursor-pointer transition-colors"
                    title="Ortala ve Sıfırla"
                  >
                    <RotateCcw className="w-3 h-3 text-amber-400" /> Ortala
                  </button>
                </div>

                {/* Directional Nudge Pad */}
                <div className="bg-neutral-950 px-2.5 py-2 rounded-lg border border-neutral-800 flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-[11px] text-neutral-300 font-semibold">Hassas Kaydır:</span>
                    <span className="text-[9px] text-neutral-500 font-mono">X: {adjustments.x}% | Y: {adjustments.y}%</span>
                  </div>
                  <div className="grid grid-cols-3 gap-1 w-24">
                    <div />
                    <button
                      type="button"
                      onClick={() => updateAdjustment('y', Math.max(-100, adjustments.y - 4))}
                      className="p-1 bg-neutral-800 hover:bg-neutral-700 text-amber-400 rounded flex items-center justify-center cursor-pointer transition-colors"
                      title="Yukarı Kaydır"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <div />
                    <button
                      type="button"
                      onClick={() => updateAdjustment('x', Math.max(-100, adjustments.x - 4))}
                      className="p-1 bg-neutral-800 hover:bg-neutral-700 text-amber-400 rounded flex items-center justify-center cursor-pointer transition-colors"
                      title="Sola Kaydır"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => updateAdjustment('y', Math.min(100, adjustments.y + 4))}
                      className="p-1 bg-neutral-800 hover:bg-neutral-700 text-amber-400 rounded flex items-center justify-center cursor-pointer transition-colors"
                      title="Aşağı Kaydır"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => updateAdjustment('x', Math.min(100, adjustments.x + 4))}
                      className="p-1 bg-neutral-800 hover:bg-neutral-700 text-amber-400 rounded flex items-center justify-center cursor-pointer transition-colors"
                      title="Sağa Kaydır"
                    >
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Photo Upload & AI Dekupe Buttons */}
                <div className="grid grid-cols-2 gap-2">
                  <label className="cursor-pointer bg-neutral-800 hover:bg-neutral-750 border border-neutral-700 text-amber-400 font-bold text-xs py-2 px-2.5 rounded-lg flex items-center justify-center gap-1.5 transition-colors text-center">
                    <Upload className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{isCompressing ? 'Sıkıştırılıyor...' : 'Fotoğraf Seç'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      className="hidden"
                      disabled={isCompressing || isRemovingBg}
                    />
                  </label>

                  <button
                    type="button"
                    onClick={handleRemoveBackground}
                    disabled={isRemovingBg || isCompressing}
                    className="bg-gradient-to-r from-purple-900/60 to-indigo-900/60 hover:from-purple-800/80 hover:to-indigo-800/80 border border-purple-500/40 text-purple-200 font-bold text-xs py-2 px-2.5 rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer text-center disabled:opacity-50"
                    title="Yapay zeka ile fotoğrafın arka planını otomatik temizler ve dekupe eder"
                  >
                    {isRemovingBg ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin text-purple-300" />
                        <span className="text-[11px] truncate">%{removalProgress} Siliniyor</span>
                      </>
                    ) : (
                      <>
                        <Wand2 className="w-3.5 h-3.5 text-purple-300 shrink-0" />
                        <span className="truncate">AI Dekupe (Sil)</span>
                      </>
                    )}
                  </button>
                </div>

                {isCompressing && (
                  <div className="flex items-center justify-center gap-1.5 text-xs text-amber-400">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Fotoğraf saydam WebP olarak optimize ediliyor...
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleStripBlackBg}
                  disabled={isCompressing || isRemovingBg}
                  className="w-full bg-neutral-900 hover:bg-neutral-800 border border-neutral-700/80 text-neutral-300 hover:text-white font-bold text-[11px] py-1.5 px-2.5 rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                  title="Fotoğrafın kenarlarında kalan düz siyah arka planı şeffaf hale getirir"
                >
                  <span>🖤 Siyah Arka Planı Şeffaflaştır</span>
                </button>

                <p className="text-[10px] text-neutral-400 text-center leading-tight">
                  💡 Fotoğrafı kartın üzerinden fareyle sürükleyin veya tekerlekle büyütün.
                </p>
              </div>
            ) : null}

            {/* Halı Saha Kariyer Özeti (Yalnızca Otomatik Maç & Galibiyet) */}
            <div className="w-72 mt-2.5 bg-neutral-950/90 p-2.5 rounded-xl border border-neutral-800">
              <div className="grid grid-cols-2 gap-2 text-center">
                <div className="bg-neutral-900/80 p-2 rounded-lg border border-neutral-800/80">
                  <span className="text-[9px] text-neutral-400 block uppercase tracking-wider">Maç</span>
                  <span className="text-sm font-mono font-bold text-white">{editedPlayer.matchesPlayed || 0}</span>
                </div>
                <div className="bg-neutral-900/80 p-2 rounded-lg border border-emerald-500/20">
                  <span className="text-[9px] text-neutral-400 block uppercase tracking-wider">Galibiyet</span>
                  <span className="text-sm font-mono font-bold text-emerald-400">{editedPlayer.wins || 0}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="md:col-span-7 space-y-3.5">
            {/* If NOT CanEdit (Preview Mode): Clean Read-Only Cards */}
            {!canEdit ? (
              <div className="space-y-4">
                {isPendingUser && (
                  <div className="bg-gradient-to-r from-amber-500/15 via-orange-500/15 to-amber-500/15 border border-amber-500/30 rounded-2xl p-3.5 text-xs text-amber-200 flex items-start gap-3">
                    <Clock className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-white text-xs sm:text-sm">👋 Hoş geldin! Hesabın Kurul onayı bekliyor.</p>
                      <p className="text-amber-200/90 text-xs mt-1 leading-relaxed">
                        Bu sırada takımı ve arkadaşlarının 3D kartlarını inceleyebilirsin. Onaylandığında kendi kartını yönetebilecek ve maç kadrolarına katılabileceksin.
                      </p>
                    </div>
                  </div>
                )}

                {/* Kurul üyeleri başkasının kartında yalnızca mevkileri düzenleyebilir */}
                {!isPendingUser && canEditPositions && (
                  <PositionEditor
                    value={editedPlayer}
                    editable
                    onChange={(next) => setEditedPlayer({ ...editedPlayer, ...next })}
                  />
                )}

                {/* Player Header Identity */}
                <div className="bg-neutral-950/70 p-3.5 rounded-2xl border border-neutral-800 flex items-center justify-between">
                  <div>
                    <span className="text-xs text-neutral-400 font-mono">#{editedPlayer.number || 10} • {formatPositions(editedPlayer)}</span>
                    <h3 className="text-lg font-black text-white">{editedPlayer.name}</h3>
                    <p className="text-xs text-amber-400 font-semibold italic">&quot;{editedPlayer.nickname}&quot;</p>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-neutral-500 block uppercase">GENEL RATING</span>
                    <span className="text-3xl font-black font-mono text-amber-400 leading-none">
                      {editedPlayer.currentOVR}
                    </span>
                  </div>
                </div>

                {/* Country & Club */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-neutral-950/70 p-2.5 rounded-xl border border-neutral-800 flex items-center gap-2">
                    <img
                      src={editedPlayer.flagUrl || getNationFlagUrl(editedPlayer.nationality)}
                      alt="Bayrak"
                      className="w-6 h-4 object-cover rounded-[2px] border border-white/20"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = '/cards/flag_tr.png';
                      }}
                    />
                    <div>
                      <span className="text-[9px] text-neutral-400 block uppercase">Ülke</span>
                      <span className="font-bold text-white">{editedPlayer.nationName || 'Türkiye'}</span>
                    </div>
                  </div>
                  <div className="bg-neutral-950/70 p-2.5 rounded-xl border border-neutral-800 flex items-center gap-2">
                    <img
                      src={editedPlayer.clubLogoUrl || getClubLogoUrl(editedPlayer.clubId)}
                      alt="Kulüp"
                      className="w-5 h-5 object-contain rounded-full bg-black/40 p-0.5"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = '/cards/logo_badge.png';
                      }}
                    />
                    <div className="min-w-0">
                      <span className="text-[9px] text-neutral-400 block uppercase">Takım</span>
                      <span className="font-bold text-white truncate block">{editedPlayer.clubName || 'Revir FC'}</span>
                    </div>
                  </div>
                </div>

                {/* Theme Display: Yalnızca Yönetici Modunda */}
                {isSuperAdmin && (
                  <div className="bg-neutral-950/70 p-3 rounded-xl border border-neutral-800 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2.5">
                      <span className="text-2xl">{themeDetails.icon}</span>
                      <div>
                        <span className="text-[10px] text-neutral-400 block uppercase font-mono">KART TEMASI</span>
                        <span className="font-bold text-white">{themeDetails.title}</span>
                      </div>
                    </div>
                    <span className="text-[11px] text-neutral-400 italic max-w-[50%] text-right">{themeDetails.desc}</span>
                  </div>
                )}

                {/* 1+1 PlayStyles Showcase */}
                <div className="bg-neutral-950/70 p-3.5 rounded-2xl border border-neutral-800 space-y-2.5">
                  <span className="text-xs font-bold text-neutral-300 uppercase block">
                    PlayStyles+ Rozetleri (1+1 Dengeli Sistem)
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {/* 1. Rozet: Oyuncu Beyanı */}
                    <div className="p-2.5 bg-neutral-900 rounded-xl border border-neutral-800">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-bold text-amber-400">1. Rozet (Oyuncu Seçimi)</span>
                      </div>
                      {slot1 && PLAYSTYLE_CONFIG[slot1] ? (
                        <div className="flex items-start gap-2 mt-1">
                          {React.createElement(PLAYSTYLE_CONFIG[slot1].icon, {
                            className: 'w-4 h-4 text-amber-400 shrink-0 mt-0.5',
                          })}
                          <div className="min-w-0">
                            <span className="font-bold text-white text-xs block">{PLAYSTYLE_CONFIG[slot1].label}</span>
                            <span className="text-[10px] text-neutral-400 block leading-snug">{PLAYSTYLE_CONFIG[slot1].description}</span>
                          </div>
                        </div>
                      ) : (
                        <span className="text-[11px] text-neutral-500 italic">Henüz seçilmedi</span>
                      )}
                    </div>

                    {/* 2. Rozet: Kurul Rozeti */}
                    <div className="p-2.5 bg-neutral-900 rounded-xl border border-neutral-800">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-bold text-amber-400">2. Rozet (Kurul Ataması)</span>
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-bold">Kurul</span>
                      </div>
                      {slot2 && PLAYSTYLE_CONFIG[slot2] ? (
                        <div className="flex items-start gap-2 mt-1">
                          {React.createElement(PLAYSTYLE_CONFIG[slot2].icon, {
                            className: 'w-4 h-4 text-amber-400 shrink-0 mt-0.5',
                          })}
                          <div className="min-w-0">
                            <span className="font-bold text-white text-xs block">{PLAYSTYLE_CONFIG[slot2].label}</span>
                            <span className="text-[10px] text-neutral-400 block leading-snug">{PLAYSTYLE_CONFIG[slot2].description}</span>
                          </div>
                        </div>
                      ) : (
                        <span className="text-[11px] text-neutral-500 italic">Kurul tarafından atanmadı</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* 6 Stats Display: Sadece Kurul & Yönetici */}
                {(isAdmin || canEditPositions) && (
                  <div className="bg-neutral-950/70 p-3 rounded-2xl border border-neutral-800">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="text-xs font-bold text-neutral-300 uppercase">
                        6 Temel FC 27 İstatistiği (Maç Karnesi)
                      </span>
                      {editedPlayer.adminStatOverride && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/35">
                          🔒 Yönetici Sabitlemesi Aktif
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-6 gap-1.5 text-center">
                      {(['pac', 'sho', 'pas', 'dri', 'def', 'phy'] as const).map((statKey) => (
                        <div key={statKey} className="bg-neutral-900 p-2 rounded-xl border border-neutral-800">
                          <span className="text-[9px] uppercase font-bold text-neutral-400 block">{statKey}</span>
                          <span className="font-mono text-sm font-black text-amber-400">{editedPlayer.stats[statKey]}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Son Maç Sentez Karnesi & Reyting Etkisi */}
                {(() => {
                  const summary = editedPlayer.lastMatchSummary;
                  const netDeltaFromBase = editedPlayer.currentOVR - editedPlayer.baseOVR;
                  return (
                    <div className="bg-neutral-950/70 p-3 rounded-2xl border border-neutral-800 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-neutral-200 flex items-center gap-1.5">
                          <BarChart3 className="w-3.5 h-3.5 text-amber-400" /> Son Maç Sentez Karnesi &amp; Reyting Etkisi
                        </span>
                        <span
                          className={`text-[10px] font-mono font-black px-2 py-0.5 rounded-full border ${
                            netDeltaFromBase > 0
                              ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/35'
                              : netDeltaFromBase < 0
                              ? 'bg-rose-500/15 text-rose-300 border-rose-500/35'
                              : 'bg-neutral-800 text-neutral-300 border-neutral-700'
                          }`}
                        >
                          Toplam Maç Etkisi: {netDeltaFromBase > 0 ? `+${netDeltaFromBase}` : netDeltaFromBase} OVR
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-center text-xs">
                        <div className="bg-neutral-900/90 p-2 rounded-xl border border-neutral-800">
                          <span className="text-[9px] text-neutral-400 block uppercase">Kök Kurul Baz (%85)</span>
                          <span className="font-mono font-black text-white">{editedPlayer.baseOVR}</span>
                        </div>
                        <div className="bg-neutral-900/90 p-2 rounded-xl border border-neutral-800">
                          <span className="text-[9px] text-neutral-400 block uppercase">Son 360° Sentez (%15)</span>
                          <span className="font-mono font-black text-amber-300">
                            {summary ? `${summary.matchScore100.toFixed(0)} (${summary.matchScore10}/10)` : currentMatch?.awards?.isConfirmedByCommittee ? 'Oynandı' : 'Bekleniyor'}
                          </span>
                        </div>
                        <div className="bg-neutral-900/90 p-2 rounded-xl border border-neutral-800">
                          <span className="text-[9px] text-neutral-400 block uppercase">Son Maç Değişim</span>
                          <span
                            className={`font-mono font-black ${
                              (summary?.deltaOVR || 0) > 0
                                ? 'text-emerald-400'
                                : (summary?.deltaOVR || 0) < 0
                                ? 'text-rose-400'
                                : 'text-neutral-300'
                            }`}
                          >
                            {summary
                              ? `${summary.prevOVR} → ${summary.newOVR} (${summary.deltaOVR > 0 ? `+${summary.deltaOVR}` : summary.deltaOVR})`
                              : `${editedPlayer.currentOVR} OVR`}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            ) : (
              /* If CanEdit: Editable Form Controls */
              <div className="space-y-3.5">
                {/* Card Theme Picker: Sadece Yönetici Modunda (Kurul ve Düz Kullanıcı Görmez) */}
                {isSuperAdmin && (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-neutral-300 flex items-center gap-1.5">
                      <span>Kart Tipi & Teması</span>
                      <span className="text-[10px] font-bold text-amber-400 bg-amber-500/20 px-2 py-0.5 rounded">👑 Yönetici Yetkisi Açık</span>
                    </label>
                    <span className="text-[10px] text-amber-400 font-mono font-bold">
                      {themeDetails.title}
                    </span>
                  </div>

                  {isAdmin ? (
                    /* Admin / Committee: Auto-default reset + 5 special themes only (no manual Bronze/Silver/Gold/Legend) */
                    <div className="space-y-1.5">
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                        <button
                          type="button"
                          onClick={resetToDefaultAutoTheme}
                          className={`p-1.5 rounded-lg border text-center transition-all cursor-pointer ${
                            !isSpecialThemeActive
                              ? 'bg-amber-500 text-black font-black border-amber-400 shadow-md'
                              : 'bg-neutral-800/80 text-neutral-300 border-neutral-700 hover:border-neutral-500'
                          }`}
                          title="Özel temayı kaldırır; Kulüp Efsaneleri (İsmail, Gölcür, Cevdet) için Efsane, diğerleri için OVR puanına göre Bronz/Gümüş/Altın varsayılan karta döner."
                        >
                          <span className="text-sm block">🔄</span>
                          <span className="text-[10px] font-bold block truncate">{defaultThemeLabel}</span>
                        </button>
                        {[
                          { id: 'totw' as CardTheme, label: 'MVP', icon: '⭐', desc: 'Haftanın En Değerli Oyuncusu (Tekil - Eski MVP düşer. Tekrar tıklayınca varsayılana döner)' },
                          { id: 'inform' as CardTheme, label: 'Alev Atıyo!', icon: '🔥', desc: 'Alev Atıyo! (Maks 3 - 4. seçilirse en eski alev düşer. Tekrar tıklayınca varsayılana döner)' },
                          { id: 'wall' as CardTheme, label: 'Etten Duvar', icon: '🧱', desc: 'Haftanın Etten Duvarı (Tekil - Eski Duvar düşer. Tekrar tıklayınca varsayılana döner)' },
                          { id: 'revir' as CardTheme, label: 'Revir', icon: '🩹', desc: 'Bandajlı Sakat (Tekrar tıklayınca varsayılana döner)' },
                          { id: 'bidon' as CardTheme, label: 'Bidon', icon: '🛢️', desc: 'Haftanın Bidonu (Tekil - Eski Bidon düşer, Efsane alamaz. Tekrar tıklayınca varsayılana döner)' },
                          { id: 'nostalgia' as CardTheme, label: 'Mazide Kalanlar', icon: '📜', desc: 'Mazide Kalanlar (Yalnızca Yönetici atayabilir • Sıralamanın en sonuna taşır)' },
                        ].map((item) => {
                          const isSelected = currentTheme === item.id;
                          const isBlockedForLegend = isLegendPlayer && item.id === 'bidon';
                          const isRestrictedNostalgia = item.id === 'nostalgia' && !isSuperAdmin;

                          return (
                            <button
                              key={item.id}
                              type="button"
                              disabled={isBlockedForLegend || isRestrictedNostalgia}
                              onClick={() => {
                                if (isBlockedForLegend) {
                                  alert('Kulüp Kuralı: Kulüp Efsaneleri (İsmail, Gölcür, Cevdet) hiçbir zaman Bidon seçilemez!');
                                  return;
                                }
                                if (item.id === 'nostalgia' && !isSuperAdmin) {
                                  alert('Mazide Kalanlar kartı yalnızca Yönetici tarafından atanabilir.');
                                  return;
                                }
                                if (isSelected) {
                                  resetToDefaultAutoTheme();
                                  return;
                                }
                                if (!isSuperAdmin && isOwnCard && (item.id === 'totw' || item.id === 'inform' || item.id === 'wall')) {
                                  alert('Kendi kartınıza MVP, Alev Atıyo! veya Etten Duvar unvanını tek başınıza atayamazsınız. Bu unvanlar Kurul Karar Masası mührüyle veya Yönetici Modunda verilir.');
                                  return;
                                }
                                setEditedPlayer({
                                  ...editedPlayer,
                                  theme: item.id,
                                  isFormer: item.id === 'nostalgia' ? true : (isSuperAdmin ? false : Boolean(editedPlayer.isFormer)),
                                  isLegend: isLegendPlayer,
                                  inFormAwardedAt: item.id === 'inform' ? (editedPlayer.inFormAwardedAt || Date.now()) : undefined,
                                });
                              }}
                              className={`p-1.5 rounded-lg border text-center transition-all ${
                                isBlockedForLegend ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'
                              } ${
                                isSelected
                                  ? 'bg-amber-500 text-black font-black border-amber-400 shadow-md'
                                  : 'bg-neutral-800/80 text-neutral-300 border-neutral-700 hover:border-neutral-500'
                              }`}
                              title={
                                isBlockedForLegend
                                  ? 'Kulüp Efsaneleri asla Bidon seçilemez'
                                  : item.desc
                              }
                            >
                              <span className="text-sm block">{item.icon}</span>
                              <span className="text-[10px] font-bold block truncate">{item.label}</span>
                            </button>
                          );
                        })}
                      </div>
                      <p className="text-[10px] text-neutral-500">
                        ℹ️ Bronz (45–64), Gümüş (65–74), Altın (75–99) ve Efsane kartları manuel seçilmez; özel bir kart seçili olmadığında oyuncunun Efsane statüsüne veya OVR puanına göre otomatik atanır.
                      </p>
                    </div>
                  ) : (
                    /* Normal Player: Locked informative theme badge */
                    <div className="bg-neutral-950 p-2.5 rounded-xl border border-neutral-800 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{themeDetails.icon}</span>
                        <div>
                          <span className="font-bold text-white block">{themeDetails.title}</span>
                          <span className="text-[10px] text-neutral-400">
                            {isStandardCardTheme(currentTheme) && 'OVR seviyenize göre (Bronz 45-64 • Gümüş 65-74 • Altın 75-99) standart kartınız. Özel ödüllerle değişir.'}
                            {currentTheme === 'revir' && 'Maç öncesi hafif sakatım check-in durumu bildirdiğiniz için takıldı.'}
                            {currentTheme === 'totw' && 'Haftanın En Değerli Oyuncusu (MVP) seçildiğiniz için Kurul tarafından hediye edildi.'}
                            {currentTheme === 'inform' && 'Alev Atıyo! performansı için Kurul tarafından hediye edildi.'}
                            {currentTheme === 'wall' && 'Haftanın Etten Duvarı (En İyi Savunma/Kaleci) seçildiğiniz için Kurul tarafından hediye edildi.'}
                            {currentTheme === 'bidon' && 'Maç sonu oylamasında Haftanın Bidonu seçildiğiniz için takıldı (Haftaya termosla sıcak çay borçlusunuz ☕).'}
                            {currentTheme === 'legend' && 'Kulüp efsanesi unvanı.'}
                          </span>
                        </div>
                      </div>
                      <span className="text-[10px] text-amber-400 font-bold bg-amber-500/10 border border-amber-500/30 px-2 py-1 rounded-lg shrink-0 flex items-center gap-1">
                        <Lock className="w-3 h-3" /> Kurul Ataması
                      </span>
                    </div>
                  )}
                </div>
                )}

                {/* Nickname, Position (Sadece Kurul/Yönetici) & Jersey Number */}
                <div className="grid grid-cols-12 gap-2.5">
                  <div className={isAdmin || canEditPositions ? 'col-span-5' : 'col-span-8'}>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-bold text-neutral-300">Halı Saha Lakabı</label>
                      {!isSuperAdmin && (
                        <span className="text-[9px] text-amber-300 bg-amber-500/10 border border-amber-500/30 px-1.5 py-0.5 rounded font-bold">
                          Yönetici Onaylı
                        </span>
                      )}
                    </div>
                    <input
                      type="text"
                      value={editedPlayer.nickname}
                      onChange={(e) => setEditedPlayer({ ...editedPlayer, nickname: e.target.value })}
                      placeholder="Örn: Balyoz, Doktor..."
                      className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-xs sm:text-sm text-white focus:outline-none focus:border-amber-400"
                    />
                    {!isSuperAdmin && (
                      <p className="text-[10px] text-neutral-400 mt-1">
                        {player.pendingNickname ? (
                          <span className="text-amber-300 font-bold block truncate">
                            ⏳ Onay bekleyen talep: &quot;{player.pendingNickname}&quot;
                          </span>
                        ) : (
                          '💡 Değişiklik yönetici onayından sonra yayınlanır.'
                        )}
                      </p>
                    )}
                  </div>
                  {(isAdmin || canEditPositions) && (
                    <div className="col-span-4">
                      <label className="block text-xs font-bold text-neutral-300 mb-1">Mevki</label>
                      <div className="w-full bg-neutral-800/60 border border-neutral-700 rounded-lg px-2.5 py-2 text-xs sm:text-sm text-white font-black text-center truncate" title="Mevkileri aşağıdaki 'İdeal Mevkiler' bölümünden Kurul/Yönetici belirler">
                        {formatPositions(editedPlayer)}
                      </div>
                    </div>
                  )}
                  <div className={isAdmin || canEditPositions ? 'col-span-3' : 'col-span-4'}>
                    <label className="block text-xs font-bold text-neutral-300 mb-1">Forma No</label>
                    <input
                      type="number"
                      min="1"
                      max="99"
                      value={editedPlayer.number || ''}
                      onChange={(e) => setEditedPlayer({ ...editedPlayer, number: parseInt(e.target.value) || 1 })}
                      placeholder="10"
                      className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-2.5 py-2 text-xs sm:text-sm text-white font-mono font-bold text-center focus:outline-none focus:border-amber-400"
                    />
                    <p className="text-[9px] text-neutral-400 mt-1 leading-tight">
                      ✓ Aynı numara serbesttir
                    </p>
                  </div>
                </div>

                {/* İdeal Mevkiler (ana + ek): sadece Kurul / Yönetici görür ve düzenler */}
                {(isAdmin || canEditPositions) && (
                  <PositionEditor
                    value={editedPlayer}
                    editable={canEditPositions}
                    onChange={(next) => setEditedPlayer({ ...editedPlayer, ...next })}
                  />
                )}

                {/* Country (Bayrak) & Team (Arma) Selection - Yatayda Kompakt */}
                <div className="flex flex-wrap gap-3 items-start bg-neutral-950/40 p-2.5 rounded-xl border border-neutral-800">
                  {/* Ülke / Milliyet */}
                  <div className="max-w-full">
                    <label className="block text-xs font-bold text-neutral-300 mb-1">
                      🌍 Ülke / Milliyet
                    </label>
                    <div className="relative inline-flex items-center max-w-full">
                      <div className="absolute left-1.5 pointer-events-none flex items-center z-10">
                        <img
                          src={editedPlayer.flagUrl || getNationFlagUrl(editedPlayer.nationality)}
                          alt="Bayrak"
                          className="w-5 h-3.5 object-cover rounded-[1px] border border-white/20 shadow-xs"
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).src = '/cards/flag_tr.png';
                          }}
                        />
                      </div>
                      <select
                        value={editedPlayer.nationality || 'tr'}
                        onChange={(e) => {
                          const code = e.target.value;
                          const nat = NATIONS.find((n) => n.code === code) || DEFAULT_NATION;
                          setEditedPlayer({
                            ...editedPlayer,
                            nationality: nat.code,
                            nationName: nat.name,
                            flagUrl: nat.flagUrl,
                          });
                        }}
                        className="w-auto max-w-full bg-neutral-800 border border-neutral-700 rounded-lg pl-7 pr-6 py-1.5 text-xs text-white focus:outline-none focus:border-amber-400 cursor-pointer"
                      >
                        <optgroup label="Türk Dünyası">
                          {PRIMARY_NATIONS.map((nat) => (
                            <option key={nat.code} value={nat.code}>
                              {nat.name}
                            </option>
                          ))}
                        </optgroup>
                        <optgroup label="Dünya (A-Z)">
                          {OTHER_NATIONS.map((nat) => (
                            <option key={nat.code} value={nat.code}>
                              {nat.name}
                            </option>
                          ))}
                        </optgroup>
                      </select>
                    </div>
                  </div>

                  {/* Takım / Kulüp */}
                  <div className="max-w-full">
                    <label className="block text-xs font-bold text-neutral-300 mb-1">
                      ⚽ Takım / Kulüp
                    </label>
                    <div className="relative inline-flex items-center max-w-full">
                      <div className="absolute left-1.5 pointer-events-none flex items-center z-10">
                        <img
                          src={editedPlayer.clubLogoUrl || getClubLogoUrl(editedPlayer.clubId)}
                          alt="Logo"
                          className="w-4 h-4 object-contain rounded-full shadow-xs bg-black/40 p-0.5"
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).src = '/cards/logo_badge.png';
                          }}
                        />
                      </div>
                      <select
                        value={editedPlayer.clubId || 'revir_fc'}
                        onChange={(e) => {
                          const id = e.target.value;
                          const club = getClubById(id);
                          setEditedPlayer({
                            ...editedPlayer,
                            clubId: club.id,
                            clubName: club.name,
                            clubLogoUrl: club.logoUrl,
                          });
                        }}
                        className="w-auto max-w-full bg-neutral-800 border border-neutral-700 rounded-lg pl-7 pr-6 py-1.5 text-xs text-white focus:outline-none focus:border-amber-400 cursor-pointer"
                      >
                        <optgroup label="Özel Halı Saha">
                          <option value="revir_fc">Revir FC (Varsayılan)</option>
                        </optgroup>
                        <optgroup label="4 Büyükler">
                          {BIG_FOUR_TR_CLUBS.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))}
                        </optgroup>
                        <optgroup label="Diğer Türk Kulüpleri">
                          {OTHER_TR_CLUBS.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))}
                        </optgroup>
                        <optgroup label="Dünya Devleri">
                          {WORLD_TOP_CLUBS.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name} [{getShortCountry(c.country)}]
                            </option>
                          ))}
                        </optgroup>
                      </select>
                    </div>
                  </div>
                </div>

                {/* 1+1 Dengeli PlayStyle Picker */}
                <div className="bg-neutral-950/70 p-3 rounded-2xl border border-neutral-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-neutral-300 block">
                        PlayStyles+ Rozetleri (1+1 Dengeli Sistem)
                      </span>
                      <span className="text-[10px] text-neutral-400">
                        1. Rozet oyuncunun kendi seçimi, 2. Rozet Kurul / Halı Saha atamasıdır.
                      </span>
                    </div>
                  </div>

                  {/* 1+1 Two Slot Interactive Tabs */}
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    {/* Slot 1: Oyuncu Seçimi */}
                    <div
                      onClick={() => {
                        if (canEditSlot1) setActivePlaystyleSlot(1);
                      }}
                      className={`p-2.5 rounded-xl border text-xs transition-all ${
                        canEditSlot1 ? 'cursor-pointer' : 'cursor-not-allowed opacity-85'
                      } ${
                        activePlaystyleSlot === 1 && canEditSlot1
                          ? 'bg-amber-500/15 border-amber-400 shadow-sm'
                          : 'bg-neutral-900 border-neutral-800 hover:border-neutral-700'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-bold text-amber-300 flex items-center gap-1">
                          {!canEditSlot1 && <Lock className="w-2.5 h-2.5 text-neutral-400" />}
                          1. Rozet: Oyuncu Seçimi
                        </span>
                        {canEditSlot1 && activePlaystyleSlot === 1 ? (
                          <span className="text-[9px] bg-amber-400 text-black font-black px-1.5 py-0.2 rounded">Düzenleniyor</span>
                        ) : !canEditSlot1 ? (
                          <span className="text-[9px] text-neutral-500 font-semibold">Oyuncu Slotu</span>
                        ) : null}
                      </div>
                      {slot1 && PLAYSTYLE_CONFIG[slot1] ? (
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5 text-white font-bold">
                            {React.createElement(PLAYSTYLE_CONFIG[slot1].icon, {
                              className: 'w-3.5 h-3.5 text-amber-400 shrink-0',
                            })}
                            <span>{PLAYSTYLE_CONFIG[slot1].label}</span>
                          </div>
                          <span className="text-[10px] text-neutral-400 block leading-snug">
                            {PLAYSTYLE_CONFIG[slot1].description}
                          </span>
                        </div>
                      ) : (
                        <span className="text-neutral-500 italic text-[11px]">
                          {canEditSlot1 ? 'Boş — Aşağıdan 1 rozet seçebilirsiniz' : 'Oyuncu henüz seçmedi'}
                        </span>
                      )}
                    </div>

                    {/* Slot 2: Kurul Seçimi */}
                    <div
                      onClick={() => {
                        if (canEditSlot2) setActivePlaystyleSlot(2);
                      }}
                      className={`p-2.5 rounded-xl border text-xs transition-all ${
                        canEditSlot2 ? 'cursor-pointer' : 'cursor-not-allowed opacity-90'
                      } ${
                        activePlaystyleSlot === 2 && canEditSlot2
                          ? 'bg-amber-500/15 border-amber-400 shadow-sm'
                          : 'bg-neutral-900 border-neutral-800'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-bold text-amber-300 flex items-center gap-1">
                          {!canEditSlot2 && <Lock className="w-2.5 h-2.5 text-neutral-400" />}
                          2. Rozet: Kurul Ataması
                        </span>
                        {canEditSlot2 ? (
                          activePlaystyleSlot === 2 ? (
                            <span className="text-[9px] bg-amber-400 text-black font-black px-1.5 py-0.2 rounded">Düzenleniyor</span>
                          ) : (
                            <span className="text-[9px] text-amber-400 font-bold">Kurul Açık</span>
                          )
                        ) : (
                          <span className="text-[9px] text-neutral-500 font-semibold">
                            {isAdmin && isOwnCard ? 'Diğer 2 Kurul Üyesi' : 'Kilitli'}
                          </span>
                        )}
                      </div>
                      {slot2 && PLAYSTYLE_CONFIG[slot2] ? (
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5 text-white font-bold">
                            {React.createElement(PLAYSTYLE_CONFIG[slot2].icon, {
                              className: 'w-3.5 h-3.5 text-amber-400 shrink-0',
                            })}
                            <span>{PLAYSTYLE_CONFIG[slot2].label}</span>
                          </div>
                          <span className="text-[10px] text-neutral-400 block leading-snug">
                            {PLAYSTYLE_CONFIG[slot2].description}
                          </span>
                        </div>
                      ) : (
                        <span className="text-neutral-500 italic text-[11px]">
                          {canEditSlot2
                            ? 'Aşağıdan Kurul rozeti seçin'
                            : isAdmin && isOwnCard
                            ? 'Diğer 2 Kurul üyesi belirler'
                            : 'Kurul / Maç sonu atanır'}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Category Filter Tabs */}
                  <div className="flex gap-1 overflow-x-auto pt-1 pb-0.5">
                    {PLAYSTYLE_CATEGORIES.map((cat) => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setSelectedPlaystyleCategory(cat.id)}
                        className={`text-[10px] px-2 py-0.5 rounded-full font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1 ${
                          selectedPlaystyleCategory === cat.id
                            ? 'bg-amber-400 text-black shadow-sm'
                            : 'bg-neutral-800 text-neutral-400 hover:text-white hover:bg-neutral-700'
                        }`}
                      >
                        <span>{cat.icon}</span>
                        <span>{cat.label}</span>
                      </button>
                    ))}
                  </div>

                  {/* Badges Catalog - Açıklamalar Kırpılmadan Okunur */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-56 overflow-y-auto p-2 bg-neutral-950/80 rounded-xl border border-neutral-850">
                    {(Object.keys(PLAYSTYLE_CONFIG) as PlayStyle[])
                      .filter((style) => {
                        if (selectedPlaystyleCategory === 'all') return true;
                        return PLAYSTYLE_CONFIG[style].category === selectedPlaystyleCategory;
                      })
                      .map((style) => {
                        const cfg = PLAYSTYLE_CONFIG[style];
                        const isSlot1 = slot1 === style;
                        const isSlot2 = slot2 === style;
                        const active = isSlot1 || isSlot2;
                        const isSlot1BlockedByCommittee =
                          (!canEditSlot2 || (canEditSlot1 && activePlaystyleSlot === 1)) && isSlot2;
                        const Icon = cfg.icon;
                        return (
                          <button
                            key={style}
                            type="button"
                            disabled={isSlot1BlockedByCommittee}
                            onClick={() => handleSelectPlayStyle(style)}
                            title={isSlot1BlockedByCommittee ? 'Kurul 2. slota seçtiği için 1. slota seçilemez' : `${cfg.label}: ${cfg.description}`}
                            className={`text-left px-2.5 py-2 rounded-lg border transition-all flex items-start gap-2 ${
                              isSlot1BlockedByCommittee
                                ? 'bg-amber-500/15 border-amber-500/50 text-amber-200 cursor-not-allowed opacity-90'
                                : active
                                ? 'bg-amber-500 text-black font-bold border-amber-400 shadow-md shadow-amber-500/20 cursor-pointer'
                                : 'bg-neutral-800/80 text-neutral-300 border-neutral-700 hover:border-neutral-500 cursor-pointer'
                            }`}
                          >
                            <Icon className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-1">
                                <span className="text-xs font-bold leading-snug">{cfg.label}</span>
                                <span className="shrink-0 flex items-center gap-1">
                                  {isSlot1 && (
                                    <span className="text-[9px] font-black bg-black text-amber-300 px-1 rounded">
                                      1
                                    </span>
                                  )}
                                  {isSlot2 && (
                                    <span className="text-[9px] font-black bg-black text-amber-300 px-1 rounded inline-flex items-center gap-0.5">
                                      {isSlot1BlockedByCommittee && <Lock className="w-2.5 h-2.5" />}2
                                    </span>
                                  )}
                                </span>
                              </div>
                              <span
                                className={`text-[10px] block leading-snug mt-0.5 ${
                                  active && !isSlot1BlockedByCommittee ? 'text-black/80 font-medium' : 'text-neutral-400'
                                }`}
                              >
                                {cfg.description}
                              </span>
                            </div>
                          </button>
                        );
                      })}
                  </div>
                </div>

                {/* 6 Stats (Sadece Kurul & Yönetici görür; Düz oyuncu görmez) */}
                {(isAdmin || canEditPositions) && (
                  <div className="bg-neutral-950/70 p-3 rounded-2xl border border-neutral-800">
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                      <span className="text-xs font-bold text-neutral-300 uppercase">
                        6 Temel FC 27 İstatistiği{' '}
                        {isSuperAdmin ? '(Yönetici Modu Düzenlemesi Açık)' : '(Kurul Sentezi & Maç Karnesi)'}
                      </span>
                      <div className="flex items-center gap-2">
                        {editedPlayer.adminStatOverride && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/35">
                            🔒 Yönetici Sabitlemesi Aktif
                          </span>
                        )}
                        {isSuperAdmin && editedPlayer.adminStatOverride && (
                          <button
                            type="button"
                            onClick={revertStatsToCommittee}
                            className="text-[10px] font-black px-2.5 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-amber-300 border border-amber-500/35 cursor-pointer transition-colors"
                          >
                            Kurul Ortalamasına Döndür ({committeeConsensus.baseOVR})
                          </button>
                        )}
                        {!editedPlayer.adminStatOverride && (
                          <span className="text-[10px] text-amber-400/80">
                            {isSuperAdmin
                              ? 'Statları değiştirirseniz yönetici sabitlemesi açılır'
                              : 'Kurul modunda statlar Kurul Sentezi ile belirlenir'}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-6 gap-1.5 text-center">
                      {(['pac', 'sho', 'pas', 'dri', 'def', 'phy'] as const).map((statKey) => (
                        <div key={statKey} className="bg-neutral-900 p-2 rounded-xl border border-neutral-800">
                          <span className="text-[10px] uppercase font-bold text-neutral-400 block">{statKey}</span>
                          {isSuperAdmin ? (
                            <input
                              type="number"
                              min="30"
                              max="99"
                              value={editedPlayer.stats[statKey]}
                              onChange={(e) => updateStat(statKey, parseInt(e.target.value) || 50)}
                              className="w-full bg-transparent text-center font-bold text-amber-400 text-sm focus:outline-none"
                            />
                          ) : (
                            <span className="font-mono text-sm font-bold text-white">{editedPlayer.stats[statKey]}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Son Maç Sentez Karnesi & Reyting Etkisi */}
                {(() => {
                  const summary = editedPlayer.lastMatchSummary;
                  const netDeltaFromBase = editedPlayer.currentOVR - editedPlayer.baseOVR;
                  return (
                    <div className="bg-neutral-950/70 p-3 rounded-2xl border border-neutral-800 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-neutral-200 flex items-center gap-1.5">
                          <BarChart3 className="w-3.5 h-3.5 text-amber-400" /> Son Maç Sentez Karnesi &amp; Reyting Etkisi
                        </span>
                        <span
                          className={`text-[10px] font-mono font-black px-2 py-0.5 rounded-full border ${
                            netDeltaFromBase > 0
                              ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/35'
                              : netDeltaFromBase < 0
                              ? 'bg-rose-500/15 text-rose-300 border-rose-500/35'
                              : 'bg-neutral-800 text-neutral-300 border-neutral-700'
                          }`}
                        >
                          Toplam Maç Etkisi: {netDeltaFromBase > 0 ? `+${netDeltaFromBase}` : netDeltaFromBase} OVR
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-center text-xs">
                        <div className="bg-neutral-900/90 p-2 rounded-xl border border-neutral-800">
                          <span className="text-[9px] text-neutral-400 block uppercase">Kök Kurul Baz (%85)</span>
                          <span className="font-mono font-black text-white">{editedPlayer.baseOVR}</span>
                        </div>
                        <div className="bg-neutral-900/90 p-2 rounded-xl border border-neutral-800">
                          <span className="text-[9px] text-neutral-400 block uppercase">Son 360° Sentez (%15)</span>
                          <span className="font-mono font-black text-amber-300">
                            {summary ? `${summary.matchScore100.toFixed(0)} (${summary.matchScore10}/10)` : currentMatch?.awards?.isConfirmedByCommittee ? 'Oynandı' : 'Bekleniyor'}
                          </span>
                        </div>
                        <div className="bg-neutral-900/90 p-2 rounded-xl border border-neutral-800">
                          <span className="text-[9px] text-neutral-400 block uppercase">Son Maç Değişim</span>
                          <span
                            className={`font-mono font-black ${
                              (summary?.deltaOVR || 0) > 0
                                ? 'text-emerald-400'
                                : (summary?.deltaOVR || 0) < 0
                                ? 'text-rose-400'
                                : 'text-neutral-300'
                            }`}
                          >
                            {summary
                              ? `${summary.prevOVR} → ${summary.newOVR} (${summary.deltaOVR > 0 ? `+${summary.deltaOVR}` : summary.deltaOVR})`
                              : `${editedPlayer.currentOVR} OVR`}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer with Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-neutral-800 mt-2 shrink-0">
          <div>
            {!canEdit && isPendingUser && (
              <span className="text-xs text-amber-300/80 font-medium">
                ⏳ Hesabınız onaylandıktan sonra kendi kartınızı özgürce düzenleyebilirsiniz.
              </span>
            )}
            {!canEdit && !isPendingUser && (
              <span className="text-xs text-neutral-400">
                {isFormerPlayer(editedPlayer)
                  ? '📜 Mazide Kalanlar kartı — Yalnızca Yönetici düzenleyebilir.'
                  : canEditPositions
                  ? '🛡️ Kurul yetkisiyle yalnızca mevkileri düzenleyebilirsiniz.'
                  : '🔒 Yalnızca kendi kartınızı düzenleyebilirsiniz.'}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-bold cursor-pointer transition-colors"
            >
              {canEdit || canEditPositions ? 'İptal' : 'Kapat'}
            </button>
            {!canEdit && canEditPositions && !isPendingUser && (
              <button
                type="button"
                onClick={() => {
                  // Kurul üyesi başkasının kartında SADECE mevkileri günceller; diğer alanlara dokunulmaz.
                  onSave({
                    ...player,
                    position: editedPlayer.position,
                    secondaryPositions: editedPlayer.secondaryPositions,
                  });
                  onClose();
                }}
                className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-black flex items-center gap-2 shadow-lg shadow-amber-500/25 cursor-pointer transition-transform active:scale-95"
              >
                <Check className="w-4 h-4" /> Mevkileri Kaydet
              </button>
            )}
            {canEdit && (
              <button
                type="button"
                onClick={() => {
                  let playerToSave = { ...editedPlayer };
                  const initialSlots = resolvePlayerPlaystyleSlots(player);
                  const editedSlots = resolvePlayerPlaystyleSlots({
                    ...editedPlayer,
                    committeePlaystyle: effectiveSlot2Override ?? editedPlayer.committeePlaystyle,
                  });

                  if (!canEditPositions) {
                    // Mevkileri yalnızca Kurul/Yönetici belirler; kendi kartını düzenleyen oyuncu değiştiremez.
                    playerToSave.position = player.position;
                    playerToSave.secondaryPositions = player.secondaryPositions;
                  }
                  if (!isAdmin) {
                    // Düz oyuncu: tema/unvan, statlar, efsane bayrağı ve Kurul'un taktığı 2. PlayStyle rozeti korunur.
                    playerToSave.theme = player.theme;
                    playerToSave.isLegend = player.isLegend;
                    playerToSave.stats = player.stats;
                    playerToSave.baseOVR = player.baseOVR;
                    playerToSave.currentOVR = player.currentOVR;
                    playerToSave.adminStatOverride = player.adminStatOverride;
                    playerToSave.adminStatOverrideAt = player.adminStatOverrideAt;
                    playerToSave.committeePlaystyle = initialSlots.slot2 ?? null;
                    playerToSave.committeePlaystyleVotes = player.committeePlaystyleVotes;
                    const ownSlot1 =
                      editedSlots.slot1 && editedSlots.slot1 !== initialSlots.slot2
                        ? editedSlots.slot1
                        : null;
                    playerToSave.ownPlaystyle = ownSlot1;
                    playerToSave.playstyles = [ownSlot1, initialSlots.slot2].filter(
                      (x): x is PlayStyle => Boolean(x)
                    );
                  } else {
                    if (!isSuperAdmin) {
                      // Kurul Modunda tema ve stat/override değiştirilemez
                      playerToSave.theme = player.theme;
                      playerToSave.stats = player.stats;
                      playerToSave.baseOVR = player.baseOVR;
                      playerToSave.currentOVR = player.currentOVR;
                      playerToSave.adminStatOverride = player.adminStatOverride;
                      playerToSave.adminStatOverrideAt = player.adminStatOverrideAt;
                    }
                    // Kendi kartında Slot 2 diğer 2 kurul üyesinden gelir; Slot 1 kendisinin
                    if (isOwnCard && !isSuperAdmin) {
                      playerToSave.committeePlaystyle = initialSlots.slot2 ?? null;
                      playerToSave.committeePlaystyleVotes = player.committeePlaystyleVotes;
                    }
                    const finalSlots = resolvePlayerPlaystyleSlots(playerToSave);
                    playerToSave.ownPlaystyle = finalSlots.slot1 ?? null;
                    playerToSave.committeePlaystyle = finalSlots.slot2 ?? null;
                    playerToSave.playstyles = finalSlots.combined;
                  }
                  if (!isSuperAdmin) {
                    // Lakap değişikliği Yönetici onayına gider (Kurul dahil).
                    const trimmedInput = (editedPlayer.nickname || '').trim();
                    if (trimmedInput !== player.nickname) {
                      playerToSave.pendingNickname = trimmedInput;
                      playerToSave.nickname = player.nickname;
                      alert(`"${trimmedInput}" lakap değişikliği talebiniz alındı! Yönetici onayından sonra kartta güncellenecektir.`);
                    }
                  } else {
                    // Yönetici doğrudan kaydeder, bekleyen talebi temizler
                    playerToSave.pendingNickname = undefined;
                  }
                  playerToSave = normalizePlayerThemeAndLegend(playerToSave);
                  onSave(playerToSave);
                  onClose();
                }}
                className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-black flex items-center gap-2 shadow-lg shadow-amber-500/25 cursor-pointer transition-transform active:scale-95"
              >
                <Check className="w-4 h-4" /> Kartı Kaydet
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
