import React, { useState, useRef, useEffect } from 'react';
import { Player, PlayStyle, PreferredPosition, CardTheme } from '../../types';
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
import { removeImageBackground } from '../../services/backgroundRemoval';
import imageCompression from 'browser-image-compression';
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
  Shield,
  Clock,
  Info,
  Trophy,
  Award,
  Eye,
} from 'lucide-react';

interface Props {
  player: Player;
  onSave: (updated: Player) => void;
  onClose: () => void;
  isAdmin?: boolean;
  canEdit?: boolean;
  isPendingUser?: boolean;
  isOwnCard?: boolean;
  allPlayers?: Player[];
}

const THEME_INFO: Record<CardTheme, { label: string; icon: string; title: string; desc: string }> = {
  gold: { label: 'Altın', icon: '🟡', title: 'Standart FC 27 Kartı', desc: 'Her oyuncunun temel lig kartıdır.' },
  totw: { label: 'MVP', icon: '⭐', title: 'Haftanın En Değerli Oyuncusu (MVP)', desc: 'Haftanın en iyi oyuncusuna Kurul ve maç sonu oylaması tarafından hediye edilir.' },
  inform: { label: 'Ateş Ediyo!', icon: '🔥', title: 'Ateş Ediyo! 🔥', desc: 'Sadece Kurul tarafından verilir (Maksimum 3 kişi). Sahada durdurulamayan, alev alev yanan performanslar içindir.' },
  revir: { label: 'Revir', icon: '🩹', title: 'Bandajlı Sakat Raporu', desc: 'Maç öncesi sakatlık check-in durumu bildiren oyunculara otomatik atanır.' },
  legend: { label: 'Efsane', icon: '👑', title: 'Kulüp Efsanesi', desc: 'İsmail, Gölcür ve Cevdet gibi kulüp efsanelerine özel unvandır.' },
  bidon: { label: 'Bidon', icon: '🛢️', title: 'Haftanın Bidonu', desc: 'Maç sonu oylamasında haftanın bidonu seçilen oyuncuya takılır. Haftaya koca bir termos çay borçlanır ☕' },
};

export const CardCustomizer: React.FC<Props> = ({
  player,
  onSave,
  onClose,
  isAdmin = false,
  canEdit = true,
  isPendingUser = false,
  isOwnCard = false,
  allPlayers,
}) => {
  const [editedPlayer, setEditedPlayer] = useState<Player>({ ...player });
  const [selectedPlaystyleCategory, setSelectedPlaystyleCategory] = useState<'all' | 'tactical' | 'status' | 'humor'>('all');
  const [teamCategory, setTeamCategory] = useState<'all' | 'big4' | 'other_tr' | 'world'>('all');
  const [activePlaystyleSlot, setActivePlaystyleSlot] = useState<1 | 2>(1);
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

  // Handle Photo Upload with Client-Side WebP Compression
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsCompressing(true);
      const options = {
        maxSizeMB: 0.35,
        maxWidthOrHeight: 1200,
        useWebWorker: true,
        fileType: 'image/webp',
      };
      const compressedFile = await imageCompression(file, options);
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64data = reader.result as string;
        setEditedPlayer((prev) => ({
          ...prev,
          photoUrl: base64data,
          photoAdjustments: { x: 0, y: 0, scale: 1.0 },
        }));
        setAdjustments({ x: 0, y: 0, scale: 1.0 });
        setIsCompressing(false);
      };
      reader.readAsDataURL(compressedFile);
    } catch (err) {
      console.error('Image compression failed:', err);
      setIsCompressing(false);
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditedPlayer((prev) => ({
          ...prev,
          photoUrl: reader.result as string,
        }));
      };
      reader.readAsDataURL(file);
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

  // "1+1 Dengeli PlayStyle" Sistemi
  // Slot 1: Oyuncunun Kendi Beyanı (playstyles[0])
  // Slot 2: Kurulun / Grubun Taktığı Rozet (playstyles[1])
  const slot1 = editedPlayer.playstyles[0];
  const slot2 = editedPlayer.playstyles[1];

  const handleSelectPlayStyle = (style: PlayStyle) => {
    // Normal oyuncu sadece Slot 1'i (Kendi Beyanı) değiştirebilir
    const targetSlot = isAdmin ? activePlaystyleSlot : 1;

    setEditedPlayer((prev) => {
      const s1 = prev.playstyles[0];
      const s2 = prev.playstyles[1];

      if (targetSlot === 1) {
        // Toggle off if already chosen, or replace
        const newS1 = s1 === style ? undefined : style;
        const newArr: PlayStyle[] = [];
        if (newS1) newArr.push(newS1);
        if (s2 && s2 !== newS1) newArr.push(s2);
        return { ...prev, playstyles: newArr };
      } else {
        // Slot 2 (Sadece Admin / Kurul atayabilir)
        const newS2 = s2 === style ? undefined : style;
        const newArr: PlayStyle[] = [];
        if (s1) newArr.push(s1);
        else if (newS2) newArr.push(newS2);
        if (s1 && newS2 && newS2 !== s1) newArr.push(newS2);
        return { ...prev, playstyles: newArr };
      }
    });
  };

  // Update stat values (Admin only)
  const updateStat = (key: keyof Player['stats'], val: number) => {
    const clamped = Math.max(30, Math.min(99, val));
    setEditedPlayer((prev) => {
      const newStats = { ...prev.stats, [key]: clamped };
      const avg = Math.round(
        (newStats.pac + newStats.sho + newStats.pas + newStats.dri + newStats.def + newStats.phy) / 6
      );
      return {
        ...prev,
        stats: newStats,
        currentOVR: isAdmin ? avg : prev.currentOVR,
      };
    });
  };

  const currentTheme = editedPlayer.theme || 'gold';
  const themeDetails = THEME_INFO[currentTheme];

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-neutral-900 border border-neutral-800 rounded-3xl max-w-4xl w-full max-h-[94vh] flex flex-col p-4 sm:p-6 shadow-2xl relative overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-neutral-800 shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                {canEdit ? (
                  <>
                    <Sparkles className="w-5 h-5 text-amber-400" />
                    <span>{isAdmin ? '👑 Kartı Düzenle (Kurul / Yönetici)' : '✨ Kendi Kartını Düzenle'}</span>
                  </>
                ) : (
                  <>
                    <Eye className="w-5 h-5 text-amber-400" />
                    <span>{player.name} • Kart İnceleme</span>
                  </>
                )}
              </h2>
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
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 overflow-y-auto pr-1 flex-1 py-4">
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
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Fotoğraf WebP olarak optimize ediliyor...
                  </div>
                )}

                <p className="text-[10px] text-neutral-400 text-center leading-tight">
                  💡 Fotoğrafı kartın üzerinden fareyle sürükleyin veya tekerlekle büyütün.
                </p>
              </div>
            ) : (
              /* If Read-Only / Preview Mode: Parallax instruction & Career stats */
              <div className="w-72 mt-3 space-y-2">
                <div className="p-3 bg-neutral-950/80 rounded-2xl border border-neutral-800 text-center">
                  <p className="text-[11px] text-amber-400/90 font-medium flex items-center justify-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    Fareyi kart üzerinde gezdirerek 3D Parallax derinliğini hissedebilirsiniz.
                  </p>
                </div>

                {/* Halı Saha Kariyer Özeti */}
                <div className="grid grid-cols-4 gap-1.5 text-center bg-neutral-950/90 p-2.5 rounded-xl border border-neutral-800">
                  <div className="bg-neutral-900/80 p-1.5 rounded-lg">
                    <span className="text-[9px] text-neutral-400 block uppercase">Maç</span>
                    <span className="text-xs font-mono font-bold text-white">{editedPlayer.matchesPlayed || 0}</span>
                  </div>
                  <div className="bg-neutral-900/80 p-1.5 rounded-lg">
                    <span className="text-[9px] text-neutral-400 block uppercase">Galibiyet</span>
                    <span className="text-xs font-mono font-bold text-emerald-400">{editedPlayer.wins || 0}</span>
                  </div>
                  <div className="bg-neutral-900/80 p-1.5 rounded-lg">
                    <span className="text-[9px] text-neutral-400 block uppercase">Gol</span>
                    <span className="text-xs font-mono font-bold text-amber-400">{editedPlayer.goals || 0}</span>
                  </div>
                  <div className="bg-neutral-900/80 p-1.5 rounded-lg">
                    <span className="text-[9px] text-neutral-400 block uppercase">Asist</span>
                    <span className="text-xs font-mono font-bold text-sky-400">{editedPlayer.assists || 0}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Column */}
          <div className="md:col-span-7 space-y-3.5">
            {/* If NOT CanEdit (Preview Mode): Beautiful Read-Only Cards */}
            {!canEdit ? (
              <div className="space-y-4">
                {/* Notice Banner */}
                {isPendingUser ? (
                  <div className="bg-gradient-to-r from-amber-500/15 via-orange-500/15 to-amber-500/15 border border-amber-500/30 rounded-2xl p-3.5 text-xs text-amber-200 flex items-start gap-3">
                    <Clock className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-white text-xs sm:text-sm">👋 Hoş geldin! Hesabın Kurul onayı bekliyor.</p>
                      <p className="text-amber-200/90 text-xs mt-1 leading-relaxed">
                        Bu sırada takımı ve arkadaşlarının 3D kartlarını inceleyebilirsin. Onaylandığında kendi kartını yönetebilecek ve maç kadrolarına katılabileceksin.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-3 text-xs text-neutral-300 flex items-start gap-2.5">
                    <Shield className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-white text-xs">Arkadaşının Kartını İnceliyorsun</p>
                      <p className="text-neutral-400 text-[11px] mt-0.5">
                        Halı saha kuralları gereği her oyuncu yalnızca kendi kartını düzenleyebilir.
                      </p>
                    </div>
                  </div>
                )}

                {/* Player Header Identity */}
                <div className="bg-neutral-950/70 p-3.5 rounded-2xl border border-neutral-800 flex items-center justify-between">
                  <div>
                    <span className="text-xs text-neutral-400 font-mono">#{editedPlayer.number || 10} • {editedPlayer.position}</span>
                    <h3 className="text-lg font-black text-white">{editedPlayer.name}</h3>
                    <p className="text-xs text-amber-400 font-semibold italic">"{editedPlayer.nickname}"</p>
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

                {/* Theme Display */}
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

                {/* 1+1 PlayStyles Showcase */}
                <div className="bg-neutral-950/70 p-3.5 rounded-2xl border border-neutral-800 space-y-2.5">
                  <span className="text-xs font-bold text-neutral-300 uppercase block">
                    PlayStyles+ Rozetleri (1+1 Dengeli Sistem)
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {/* 1. Rozet: Oyuncu Beyanı */}
                    <div className="p-2.5 bg-neutral-900 rounded-xl border border-neutral-800">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-bold text-amber-400">1. Rozet (Oyuncu Beyanı)</span>
                      </div>
                      {slot1 && PLAYSTYLE_CONFIG[slot1] ? (
                        <div className="flex items-center gap-2 mt-1">
                          {React.createElement(PLAYSTYLE_CONFIG[slot1].icon, {
                            className: 'w-4 h-4 text-amber-400 shrink-0',
                          })}
                          <div>
                            <span className="font-bold text-white text-xs block">{PLAYSTYLE_CONFIG[slot1].label}</span>
                            <span className="text-[10px] text-neutral-400 line-clamp-1">{PLAYSTYLE_CONFIG[slot1].description}</span>
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
                        <div className="flex items-center gap-2 mt-1">
                          {React.createElement(PLAYSTYLE_CONFIG[slot2].icon, {
                            className: 'w-4 h-4 text-amber-400 shrink-0',
                          })}
                          <div>
                            <span className="font-bold text-white text-xs block">{PLAYSTYLE_CONFIG[slot2].label}</span>
                            <span className="text-[10px] text-neutral-400 line-clamp-1">{PLAYSTYLE_CONFIG[slot2].description}</span>
                          </div>
                        </div>
                      ) : (
                        <span className="text-[11px] text-neutral-500 italic">Kurul tarafından atanmadı</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* 6 Stats Display */}
                <div className="bg-neutral-950/70 p-3 rounded-2xl border border-neutral-800">
                  <span className="text-xs font-bold text-neutral-300 uppercase block mb-2">
                    6 Temel FC 27 İstatistiği (Maç Karnesi)
                  </span>
                  <div className="grid grid-cols-6 gap-1.5 text-center">
                    {(['pac', 'sho', 'pas', 'dri', 'def', 'phy'] as const).map((statKey) => (
                      <div key={statKey} className="bg-neutral-900 p-2 rounded-xl border border-neutral-800">
                        <span className="text-[9px] uppercase font-bold text-neutral-400 block">{statKey}</span>
                        <span className="font-mono text-sm font-black text-amber-400">{editedPlayer.stats[statKey]}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              /* If CanEdit: Editable Form Controls */
              <div className="space-y-3.5">
                {/* Card Theme Picker */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-neutral-300 flex items-center gap-1.5">
                      <span>Kart Tipi & Teması</span>
                      {isAdmin ? (
                        <span className="text-[10px] font-bold text-amber-400 bg-amber-500/20 px-2 py-0.5 rounded">👑 Kurul Değiştirme Yetkisi Açık</span>
                      ) : (
                        <span className="text-[10px] text-neutral-400">(Maç performansına göre Kurul atar)</span>
                      )}
                    </label>
                    <span className="text-[10px] text-amber-400 font-mono font-bold">
                      {themeDetails.title}
                    </span>
                  </div>

                  {isAdmin ? (
                    /* Admin: Full Interactive 6-theme picker */
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                      {[
                        { id: 'gold' as CardTheme, label: 'Altın', icon: '🟡', desc: 'Standart (OVR 75+)' },
                        { id: 'totw' as CardTheme, label: 'MVP', icon: '⭐', desc: 'Haftanın En Değerli Oyuncusu' },
                        { id: 'inform' as CardTheme, label: 'Ateş Ediyo!', icon: '🔥', desc: 'Ateş Ediyo! (Maks 3)' },
                        { id: 'revir' as CardTheme, label: 'Revir', icon: '🩹', desc: 'Bandajlı Sakat' },
                        { id: 'legend' as CardTheme, label: 'Efsane', icon: '👑', desc: 'İsmail, Gölcür & Cevdet' },
                        { id: 'bidon' as CardTheme, label: 'Bidon', icon: '🛢️', desc: 'Haftanın Bidonu' },
                      ].map((item) => {
                        const isSelected = currentTheme === item.id;
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => {
                              if (item.id === 'inform' && allPlayers) {
                                const currentInformCount = allPlayers.filter(
                                  (p) => p.theme === 'inform' && p.id !== editedPlayer.id
                                ).length;
                                if (currentInformCount >= 3) {
                                  alert('Kurul Kuralı: Aynı anda en fazla 3 oyuncuda Ateş Ediyo! kartı bulunabilir!');
                                  return;
                                }
                              }
                              if (item.id === 'bidon' && (editedPlayer.isLegend || player.isLegend)) {
                                alert('Kulüp Kuralı: Kulüp Efsaneleri (Legend) asla Bidon seçilemez!');
                                return;
                              }
                              const isNowLegend = item.id === 'legend' ? true : item.id === 'gold' ? false : editedPlayer.isLegend;
                              setEditedPlayer({ ...editedPlayer, theme: item.id, isLegend: isNowLegend });
                            }}
                            className={`p-1.5 rounded-lg border text-center transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-amber-500 text-black font-black border-amber-400 shadow-md'
                                : 'bg-neutral-800/80 text-neutral-300 border-neutral-700 hover:border-neutral-500'
                            }`}
                            title={item.desc}
                          >
                            <span className="text-sm block">{item.icon}</span>
                            <span className="text-[10px] font-bold block truncate">{item.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    /* Normal Player: Locked informative theme badge */
                    <div className="bg-neutral-950 p-2.5 rounded-xl border border-neutral-800 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{themeDetails.icon}</span>
                        <div>
                          <span className="font-bold text-white block">{themeDetails.title}</span>
                          <span className="text-[10px] text-neutral-400">
                            {currentTheme === 'gold' && 'Standart kartınız. Sakatlıkta Revir 🩹, En iyi oyuncu seçilince MVP ⭐ veya Ateş Ediyo! 🔥 takılır.'}
                            {currentTheme === 'revir' && 'Maç öncesi hafif sakatım check-in durumu bildirdiğiniz için takıldı.'}
                            {currentTheme === 'totw' && 'Haftanın En Değerli Oyuncusu (MVP) seçildiğiniz için Kurul tarafından hediye edildi.'}
                            {currentTheme === 'inform' && 'Ateş Ediyo! performansı için Kurul tarafından hediye edildi.'}
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

                {/* Nickname, Position & Jersey Number */}
                <div className="grid grid-cols-12 gap-2.5">
                  <div className="col-span-5">
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-bold text-neutral-300">Halı Saha Lakabı</label>
                      {!isAdmin && (
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
                    {!isAdmin && (
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
                  <div className="col-span-4">
                    <label className="block text-xs font-bold text-neutral-300 mb-1">Mevki</label>
                    <select
                      value={editedPlayer.position}
                      onChange={(e) =>
                        setEditedPlayer({ ...editedPlayer, position: e.target.value as PreferredPosition })
                      }
                      className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-2.5 py-2 text-xs sm:text-sm text-white focus:outline-none focus:border-amber-400 cursor-pointer"
                    >
                      <option value="MID">MID (Orta Saha)</option>
                      <option value="FWD">FWD (Forvet)</option>
                      <option value="DEF">DEF (Defans)</option>
                      <option value="GK">GK (Kaleci)</option>
                    </select>
                  </div>
                  <div className="col-span-3">
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

                {/* Country (Bayrak) & Team (Arma) Selection */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-neutral-950/40 p-2.5 rounded-xl border border-neutral-800">
                  {/* Ülke / Milliyet */}
                  <div>
                    <label className="block text-xs font-bold text-neutral-300 mb-1 flex items-center justify-between">
                      <span>🌍 Ülke / Milliyet</span>
                      <span className="text-[10px] text-amber-400/80 font-normal">Bayrak karta yansır</span>
                    </label>
                    <div className="relative flex items-center">
                      <div className="absolute left-2.5 pointer-events-none flex items-center z-10">
                        <img
                          src={editedPlayer.flagUrl || getNationFlagUrl(editedPlayer.nationality)}
                          alt="Bayrak"
                          className="w-6 h-4 object-cover rounded-[1px] border border-white/20 shadow-xs"
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
                        className="w-full bg-neutral-800 border border-neutral-700 rounded-lg pl-10 pr-3 py-2 text-xs sm:text-sm text-white focus:outline-none focus:border-amber-400 cursor-pointer"
                      >
                        <optgroup label="⭐ Öne Çıkanlar & Türk Dünyası">
                          {PRIMARY_NATIONS.map((nat) => (
                            <option key={nat.code} value={nat.code}>
                              {nat.name}
                            </option>
                          ))}
                        </optgroup>
                        <optgroup label="🌍 Tüm Dünya Ülkeleri (A-Z)">
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
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-bold text-neutral-300 flex items-center gap-1">
                        <span>⚽ Takım / Kulüp</span>
                      </label>
                      <span className="text-[10px] text-amber-400/80 font-normal">Arma karta yansır</span>
                    </div>

                    {/* Kompakt Kategori Başlıkları */}
                    <div className="grid grid-cols-2 gap-1 mb-1.5">
                      <button
                        type="button"
                        onClick={() => setTeamCategory(teamCategory === 'big4' ? 'all' : 'big4')}
                        className={`text-[10px] px-2 py-0.5 rounded-md font-bold transition-all text-center truncate cursor-pointer ${
                          teamCategory === 'big4'
                            ? 'bg-amber-400 text-black shadow-xs font-black'
                            : 'bg-neutral-800/90 text-neutral-300 hover:bg-neutral-700'
                        }`}
                      >
                        🇹🇷 4 Büyükler
                      </button>
                      <button
                        type="button"
                        onClick={() => setTeamCategory(teamCategory === 'other_tr' ? 'all' : 'other_tr')}
                        className={`text-[10px] px-2 py-0.5 rounded-md font-bold transition-all text-center truncate cursor-pointer ${
                          teamCategory === 'other_tr'
                            ? 'bg-amber-400 text-black shadow-xs font-black'
                            : 'bg-neutral-800/90 text-neutral-300 hover:bg-neutral-700'
                        }`}
                      >
                        🇹🇷 Diğer Türk (46)
                      </button>
                      <button
                        type="button"
                        onClick={() => setTeamCategory(teamCategory === 'world' ? 'all' : 'world')}
                        className={`text-[10px] px-2 py-0.5 rounded-md font-bold transition-all text-center truncate cursor-pointer ${
                          teamCategory === 'world'
                            ? 'bg-amber-400 text-black shadow-xs font-black'
                            : 'bg-neutral-800/90 text-neutral-300 hover:bg-neutral-700'
                        }`}
                      >
                        🌍 Dünya Devleri (94)
                      </button>
                      <button
                        type="button"
                        onClick={() => setTeamCategory('all')}
                        className={`text-[10px] px-2 py-0.5 rounded-md font-bold transition-all text-center truncate cursor-pointer ${
                          teamCategory === 'all'
                            ? 'bg-neutral-700 text-amber-300 font-black'
                            : 'bg-neutral-800/90 text-neutral-400 hover:bg-neutral-700'
                        }`}
                      >
                        ⭐ Tümü / Revir FC
                      </button>
                    </div>

                    <div className="relative flex items-center">
                      <div className="absolute left-2.5 pointer-events-none flex items-center z-10">
                        <img
                          src={editedPlayer.clubLogoUrl || getClubLogoUrl(editedPlayer.clubId)}
                          alt="Logo"
                          className="w-5 h-5 object-contain rounded-full shadow-xs bg-black/40 p-0.5"
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
                        className="w-full bg-neutral-800 border border-neutral-700 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-400 cursor-pointer truncate"
                      >
                        {(teamCategory === 'all' || teamCategory === 'big4') && (
                          <>
                            {teamCategory === 'all' && (
                              <optgroup label="⭐ Özel Halı Saha">
                                <option value="revir_fc">Revir FC (Varsayılan)</option>
                              </optgroup>
                            )}
                            <optgroup label="🇹🇷 4 Büyükler (Alfabetik)">
                              {BIG_FOUR_TR_CLUBS.map((c) => (
                                <option key={c.id} value={c.id}>
                                  {c.name}
                                </option>
                              ))}
                            </optgroup>
                          </>
                        )}
                        {(teamCategory === 'all' || teamCategory === 'other_tr') && (
                          <optgroup label="🇹🇷 Diğer Türk (TM Sırası)">
                            {OTHER_TR_CLUBS.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.name}
                              </option>
                            ))}
                          </optgroup>
                        )}
                        {(teamCategory === 'all' || teamCategory === 'world') && (
                          <optgroup label="🌍 Dünya Devleri (TM Sırası)">
                            {WORLD_TOP_CLUBS.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.name} [{getShortCountry(c.country)}]
                              </option>
                            ))}
                          </optgroup>
                        )}
                        {teamCategory !== 'all' && (
                          <optgroup label="⭐ Diğer">
                            <option value="revir_fc">Revir FC (Varsayılan)</option>
                          </optgroup>
                        )}
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
                    {/* Slot 1: Oyuncu Beyanı */}
                    <div
                      onClick={() => setActivePlaystyleSlot(1)}
                      className={`p-2.5 rounded-xl border text-xs cursor-pointer transition-all ${
                        activePlaystyleSlot === 1
                          ? 'bg-amber-500/15 border-amber-400 shadow-sm'
                          : 'bg-neutral-900 border-neutral-800 hover:border-neutral-700'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-bold text-amber-300">1. Rozet: Senin Seçimin</span>
                        {activePlaystyleSlot === 1 && (
                          <span className="text-[9px] bg-amber-400 text-black font-black px-1.5 py-0.2 rounded">Düzenleniyor</span>
                        )}
                      </div>
                      {slot1 && PLAYSTYLE_CONFIG[slot1] ? (
                        <div className="flex items-center gap-1.5 text-white font-bold truncate">
                          {React.createElement(PLAYSTYLE_CONFIG[slot1].icon, {
                            className: 'w-3.5 h-3.5 text-amber-400 shrink-0',
                          })}
                          <span className="truncate">{PLAYSTYLE_CONFIG[slot1].label}</span>
                        </div>
                      ) : (
                        <span className="text-neutral-500 italic text-[11px]">Rozet seçmek için aşağıdan tıklayın</span>
                      )}
                    </div>

                    {/* Slot 2: Kurul Rozeti */}
                    <div
                      onClick={() => {
                        if (isAdmin) setActivePlaystyleSlot(2);
                      }}
                      className={`p-2.5 rounded-xl border text-xs transition-all ${
                        isAdmin ? 'cursor-pointer' : 'cursor-not-allowed opacity-90'
                      } ${
                        activePlaystyleSlot === 2 && isAdmin
                          ? 'bg-amber-500/15 border-amber-400 shadow-sm'
                          : 'bg-neutral-900 border-neutral-800'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-bold text-amber-300 flex items-center gap-1">
                          {!isAdmin && <Lock className="w-2.5 h-2.5 text-neutral-400" />}
                          2. Rozet: Kurul Ataması
                        </span>
                        {isAdmin ? (
                          activePlaystyleSlot === 2 ? (
                            <span className="text-[9px] bg-amber-400 text-black font-black px-1.5 py-0.2 rounded">Düzenleniyor</span>
                          ) : (
                            <span className="text-[9px] text-amber-400 font-bold">Yönetici Açık</span>
                          )
                        ) : (
                          <span className="text-[9px] text-neutral-500 font-semibold">Kilitli</span>
                        )}
                      </div>
                      {slot2 && PLAYSTYLE_CONFIG[slot2] ? (
                        <div className="flex items-center gap-1.5 text-white font-bold truncate">
                          {React.createElement(PLAYSTYLE_CONFIG[slot2].icon, {
                            className: 'w-3.5 h-3.5 text-amber-400 shrink-0',
                          })}
                          <span className="truncate">{PLAYSTYLE_CONFIG[slot2].label}</span>
                        </div>
                      ) : (
                        <span className="text-neutral-500 italic text-[11px]">
                          {isAdmin ? 'Aşağıdan seçin' : 'Kurul / Maç sonu atanır'}
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

                  {/* Badges Catalog */}
                  <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-2 bg-neutral-950/80 rounded-xl border border-neutral-850">
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
                        const Icon = cfg.icon;
                        return (
                          <button
                            key={style}
                            type="button"
                            onClick={() => handleSelectPlayStyle(style)}
                            title={`${cfg.label}: ${cfg.description}`}
                            className={`text-xs px-2.5 py-1 rounded-lg border transition-all cursor-pointer flex items-center gap-1.5 ${
                              active
                                ? 'bg-amber-500 text-black font-bold border-amber-400 shadow-md shadow-amber-500/20'
                                : 'bg-neutral-800/80 text-neutral-300 border-neutral-700 hover:border-neutral-500'
                            }`}
                          >
                            <Icon className="w-3.5 h-3.5 shrink-0" />
                            <span className="truncate">{cfg.label}</span>
                            {isSlot1 && <span className="text-[9px] font-black bg-black text-amber-300 px-1 rounded">1</span>}
                            {isSlot2 && <span className="text-[9px] font-black bg-black text-amber-300 px-1 rounded">2</span>}
                          </button>
                        );
                      })}
                  </div>
                </div>

                {/* 6 Stats (Read-only unless admin) */}
                <div className="bg-neutral-950/70 p-3 rounded-2xl border border-neutral-800">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-neutral-300 uppercase">
                      6 Temel FC 27 İstatistiği {isAdmin ? '(Yönetici Düzenlemesi Açık)' : '(Maç Karnesiyle Değişir)'}
                    </span>
                    <span className="text-[10px] text-amber-400/80">
                      {isAdmin ? 'Statları değiştirebilirsiniz' : 'Maç sonu puanlaması ile EMA formülü günceller'}
                    </span>
                  </div>
                  <div className="grid grid-cols-6 gap-1.5 text-center">
                    {(['pac', 'sho', 'pas', 'dri', 'def', 'phy'] as const).map((statKey) => (
                      <div key={statKey} className="bg-neutral-900 p-2 rounded-xl border border-neutral-800">
                        <span className="text-[10px] uppercase font-bold text-neutral-400 block">{statKey}</span>
                        {isAdmin ? (
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
                🔒 Yalnızca kendi kartınızı düzenleyebilirsiniz.
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-bold cursor-pointer transition-colors"
            >
              {canEdit ? 'İptal' : 'Kapat'}
            </button>
            {canEdit && (
              <button
                type="button"
                onClick={() => {
                  let playerToSave = { ...editedPlayer };
                  if (!isAdmin) {
                    const trimmedInput = (editedPlayer.nickname || '').trim();
                    if (trimmedInput !== player.nickname) {
                      // Normal player requested a new nickname: queue for admin approval
                      playerToSave.pendingNickname = trimmedInput;
                      playerToSave.nickname = player.nickname;
                      alert(`"${trimmedInput}" lakap değişikliği talebiniz alındı! Yönetici onayından sonra kartınızda güncellenecektir.`);
                    }
                  } else {
                    // Admin directly saves, clears any pending request
                    playerToSave.pendingNickname = undefined;
                  }
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
