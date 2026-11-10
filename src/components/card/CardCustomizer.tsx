import React, { useState, useRef, useEffect } from 'react';
import { Player, PlayStyle, PreferredPosition } from '../../types';
import { FCCard } from './FCCard';
import { PLAYSTYLE_CONFIG } from './PlayStyleBadge';
import imageCompression from 'browser-image-compression';
import {
  Upload,
  Sparkles,
  Check,
  RefreshCw,
  ZoomIn,
  ZoomOut,
  RotateCcw,
} from 'lucide-react';

interface Props {
  player: Player;
  onSave: (updated: Player) => void;
  onClose: () => void;
  isAdmin?: boolean;
}

export const CardCustomizer: React.FC<Props> = ({ player, onSave, onClose, isAdmin = false }) => {
  const [editedPlayer, setEditedPlayer] = useState<Player>({ ...player });
  const [isCompressing, setIsCompressing] = useState(false);

  const [adjustments, setAdjustments] = useState({
    x: player.photoAdjustments?.x ?? 0,
    y: player.photoAdjustments?.y ?? 0,
    scale: player.photoAdjustments?.scale ?? 1.0,
  });

  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ startX: number; startY: number; initX: number; initY: number } | null>(null);
  const touchDistRef = useRef<number | null>(null);
  const touchStartScaleRef = useRef<number>(1.0);

  const updateAdjustment = (key: 'x' | 'y' | 'scale', value: number) => {
    const next = { ...adjustments, [key]: value };
    setAdjustments(next);
    setEditedPlayer((prev) => ({
      ...prev,
      photoAdjustments: next,
    }));
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
    const nextScale = Math.max(0.7, Math.min(3.0, Math.round((adjustments.scale + zoomDelta) * 100) / 100));
    updateAdjustment('scale', nextScale);
  };

  // Touch handlers for mobile & tablet (1 finger pan, 2 fingers pinch)
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      dragStartRef.current = {
        startX: e.touches[0].clientX,
        startY: e.touches[0].clientY,
        initX: adjustments.x,
        initY: adjustments.y,
      };
    } else if (e.touches.length === 2) {
      setIsDragging(false);
      dragStartRef.current = null;
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      touchDistRef.current = dist;
      touchStartScaleRef.current = adjustments.scale;
    }
  };

  // Window listeners so dragging smoothly continues even if mouse/finger leaves the card frame
  useEffect(() => {
    if (!isDragging) return;

    const onMouseMove = (e: MouseEvent) => {
      if (!dragStartRef.current) return;
      const deltaX = (e.clientX - dragStartRef.current.startX) / (1.8 * adjustments.scale);
      const deltaY = (e.clientY - dragStartRef.current.startY) / (1.8 * adjustments.scale);

      const newX = Math.max(-50, Math.min(50, Math.round(dragStartRef.current.initX + deltaX)));
      const newY = Math.max(-50, Math.min(50, Math.round(dragStartRef.current.initY + deltaY)));

      updateAdjustment('x', newX);
      updateAdjustment('y', newY);
    };

    const onMouseUp = () => {
      setIsDragging(false);
      dragStartRef.current = null;
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [isDragging, adjustments.scale]);

  useEffect(() => {
    if (!isDragging && !touchDistRef.current) return;

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 1 && isDragging && dragStartRef.current) {
        const deltaX = (e.touches[0].clientX - dragStartRef.current.startX) / (1.8 * adjustments.scale);
        const deltaY = (e.touches[0].clientY - dragStartRef.current.startY) / (1.8 * adjustments.scale);

        const newX = Math.max(-50, Math.min(50, Math.round(dragStartRef.current.initX + deltaX)));
        const newY = Math.max(-50, Math.min(50, Math.round(dragStartRef.current.initY + deltaY)));

        updateAdjustment('x', newX);
        updateAdjustment('y', newY);
      } else if (e.touches.length === 2 && touchDistRef.current) {
        const currentDist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        const ratio = currentDist / touchDistRef.current;
        const nextScale = Math.max(0.7, Math.min(3.0, Math.round(touchStartScaleRef.current * ratio * 100) / 100));
        updateAdjustment('scale', nextScale);
      }
    };

    const onTouchEnd = () => {
      setIsDragging(false);
      dragStartRef.current = null;
      touchDistRef.current = null;
    };

    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onTouchEnd);
    window.addEventListener('touchcancel', onTouchEnd);
    return () => {
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
      window.removeEventListener('touchcancel', onTouchEnd);
    };
  }, [isDragging, adjustments.scale]);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsCompressing(true);
      const options = {
        maxSizeMB: 0.2, // ~200 KB
        maxWidthOrHeight: 600,
        useWebWorker: true,
        fileType: 'image/webp',
      };

      const compressedFile = await imageCompression(file, options);
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64Url = reader.result as string;
        setEditedPlayer((prev) => ({ ...prev, photoUrl: base64Url }));
      };
      reader.readAsDataURL(compressedFile);
    } catch (err) {
      console.error('Image compression error:', err);
    } finally {
      setIsCompressing(false);
    }
  };

  const togglePlayStyle = (style: PlayStyle) => {
    setEditedPlayer((prev) => {
      const exists = prev.playstyles.includes(style);
      if (exists) {
        return { ...prev, playstyles: prev.playstyles.filter((s) => s !== style) };
      }
      if (prev.playstyles.length >= 2) {
        return { ...prev, playstyles: [prev.playstyles[1], style] };
      }
      return { ...prev, playstyles: [...prev.playstyles, style] };
    });
  };

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

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md overflow-y-auto p-2 sm:p-4 md:p-6 flex justify-center items-start">
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl max-w-4xl w-full p-4 sm:p-5 text-white shadow-2xl relative my-auto max-h-[94vh] flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-neutral-800 mb-3 shrink-0">
          <div>
            <h2 className="text-lg font-black text-amber-400 flex items-center gap-2">
              <Sparkles className="w-5 h-5" /> FC 27 Kartı Düzenle
            </h2>
            <p className="text-xs text-neutral-400">
              Soldaki kartın fotoğrafını farenizle veya dokunarak doğrudan kaydırıp büyütebilirsiniz.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-white bg-neutral-800 hover:bg-neutral-700 rounded-lg px-3 py-1.5 text-xs font-bold transition-colors cursor-pointer"
          >
            ✕ Kapat
          </button>
        </div>

        {/* Modal Body */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 overflow-y-auto pr-1 flex-1">
          {/* Left: Card + Direct Manipulation Controls */}
          <div className="md:col-span-5 flex flex-col items-center justify-start">
            <FCCard
              player={editedPlayer}
              size="md"
              interactive={false}
              photoInteractive={true}
              onPhotoMouseDown={handleMouseDown}
              onPhotoTouchStart={handleTouchStart}
              onPhotoWheel={handleWheel}
            />

            {/* Quick scale & reset bar right under the card */}
            <div className="w-64 mt-3 space-y-2">
              <div className="flex items-center justify-between bg-neutral-950 px-2.5 py-1.5 rounded-lg border border-neutral-800 text-xs">
                <span className="text-[11px] text-neutral-400 font-semibold">Ölçek:</span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => updateAdjustment('scale', Math.max(0.7, Math.round((adjustments.scale - 0.1) * 10) / 10))}
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
                    onClick={() => updateAdjustment('scale', Math.min(3.0, Math.round((adjustments.scale + 0.1) * 10) / 10))}
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

              {/* Photo Upload Button under the card */}
              <label className="w-full cursor-pointer bg-neutral-800 hover:bg-neutral-750 border border-neutral-700 text-amber-400 font-bold text-xs py-2 px-3 rounded-lg flex items-center justify-center gap-2 transition-colors">
                <Upload className="w-3.5 h-3.5" />
                {isCompressing ? 'Sıkıştırılıyor...' : 'Galeriden / Kameradan Fotoğraf Seç'}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="hidden"
                  disabled={isCompressing}
                />
              </label>
              {isCompressing && (
                <div className="flex items-center justify-center gap-1.5 text-xs text-amber-400">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Fotoğraf WebP olarak optimize ediliyor...
                </div>
              )}

              <p className="text-[10px] text-neutral-400 text-center leading-tight">
                💡 Fotoğrafı kartın üzerinden fareyle sürükleyin veya tekerlekle büyütün.
              </p>
            </div>
          </div>

          {/* Right: Clean form controls (NO separate cropper panel) */}
          <div className="md:col-span-7 space-y-3.5">
            {/* Nickname & Position */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-neutral-300 mb-1">Halı Saha Lakabı</label>
                <input
                  type="text"
                  value={editedPlayer.nickname}
                  onChange={(e) => setEditedPlayer({ ...editedPlayer, nickname: e.target.value })}
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-400"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-neutral-300 mb-1">Mevki</label>
                <select
                  value={editedPlayer.position}
                  onChange={(e) =>
                    setEditedPlayer({ ...editedPlayer, position: e.target.value as PreferredPosition })
                  }
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-400"
                >
                  <option value="MID">MID (Orta Saha)</option>
                  <option value="FWD">FWD (Forvet)</option>
                  <option value="DEF">DEF (Defans)</option>
                  <option value="GK">GK (Kaleci)</option>
                </select>
              </div>
            </div>

            {/* PlayStyles Picker with internal scroll for neat height */}
            <div>
              <label className="block text-xs font-bold text-neutral-300 mb-1.5">
                PlayStyles+ Rozetleri (Maksimum 2 Rozet)
              </label>
              <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-2 bg-neutral-950/60 rounded-xl border border-neutral-800">
                {(Object.keys(PLAYSTYLE_CONFIG) as PlayStyle[]).map((style) => {
                  const active = editedPlayer.playstyles.includes(style);
                  return (
                    <button
                      key={style}
                      type="button"
                      onClick={() => togglePlayStyle(style)}
                      className={`text-xs px-2.5 py-1 rounded-md border transition-all cursor-pointer ${
                        active
                          ? 'bg-amber-500 text-black font-bold border-amber-400 shadow-md shadow-amber-500/20'
                          : 'bg-neutral-800/80 text-neutral-300 border-neutral-700 hover:border-neutral-500'
                      }`}
                    >
                      {PLAYSTYLE_CONFIG[style].label} {active && '✓'}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 6 Stats (Read-only unless admin) */}
            <div className="bg-neutral-800/40 p-3 rounded-xl border border-neutral-700/50">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-neutral-300 uppercase">
                  6 Temel FC 27 İstatistiği {isAdmin ? '(Yönetici Düzenlemesi Açık)' : '(Maç Karnesiyle Değişir)'}
                </span>
                <span className="text-[10px] text-amber-400/80">
                  {isAdmin ? 'Statları değiştirebilirsiniz' : 'Maç sonu puanlaması ile EMA formülü günceller'}
                </span>
              </div>
              <div className="grid grid-cols-6 gap-2 text-center">
                {(['pac', 'sho', 'pas', 'dri', 'def', 'phy'] as const).map((statKey) => (
                  <div key={statKey} className="bg-neutral-900 p-2 rounded-lg border border-neutral-800">
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
        </div>

        {/* Modal Footer with Actions */}
        <div className="flex justify-end gap-3 pt-3 border-t border-neutral-800 mt-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-bold cursor-pointer"
          >
            İptal
          </button>
          <button
            type="button"
            onClick={() => {
              onSave(editedPlayer);
              onClose();
            }}
            className="px-5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-black text-xs font-black flex items-center gap-2 shadow-lg shadow-amber-500/25 cursor-pointer"
          >
            <Check className="w-4 h-4" /> Kartı Kaydet
          </button>
        </div>
      </div>
    </div>
  );
};
