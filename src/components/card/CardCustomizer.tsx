import React, { useState } from 'react';
import { Player, PlayStyle, PreferredPosition } from '../../types';
import { FCCard } from './FCCard';
import { PLAYSTYLE_CONFIG } from './PlayStyleBadge';
import imageCompression from 'browser-image-compression';
import { Upload, Sparkles, Check, RefreshCw, ZoomIn, Move, RotateCcw } from 'lucide-react';

interface Props {
  player: Player;
  onSave: (updated: Player) => void;
  onClose: () => void;
  isAdmin?: boolean;
}

export const CardCustomizer: React.FC<Props> = ({ player, onSave, onClose, isAdmin = false }) => {
  const [editedPlayer, setEditedPlayer] = useState<Player>({ ...player });
  const [isCompressing, setIsCompressing] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(player.photoUrl);

  const [adjustments, setAdjustments] = useState({
    x: player.photoAdjustments?.x ?? 0,
    y: player.photoAdjustments?.y ?? 0,
    scale: player.photoAdjustments?.scale ?? 1.0,
  });

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
        setPreviewUrl(base64Url);
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
        // limit to 2 playstyles
        return { ...prev, playstyles: [prev.playstyles[1], style] };
      }
      return { ...prev, playstyles: [...prev.playstyles, style] };
    });
  };

  const updateStat = (key: keyof Player['stats'], val: number) => {
    const clamped = Math.max(30, Math.min(99, val));
    setEditedPlayer((prev) => {
      const newStats = { ...prev.stats, [key]: clamped };
      // Recalculate average OVR if admin
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
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl max-w-4xl w-full p-6 text-white shadow-2xl relative">
        <div className="flex items-center justify-between pb-4 border-b border-neutral-800 mb-6">
          <div>
            <h2 className="text-xl font-black text-amber-400 flex items-center gap-2">
              <Sparkles className="w-5 h-5" /> FC 27 Kartı Düzenle & Fotoğraf Güncelle
            </h2>
            <p className="text-xs text-neutral-400 mt-1">
              Fotoğrafınız otomatik olarak WebP formatına sıkıştırılır ve kart şablonuna işlenir.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-white bg-neutral-800 hover:bg-neutral-700 rounded-lg p-2 text-sm"
          >
            ✕ Kapat
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
          {/* Card Preview */}
          <div className="md:col-span-5 flex flex-col items-center justify-center">
            <FCCard player={editedPlayer} size="md" interactive={false} />
            <span className="text-[11px] text-neutral-400 mt-3 font-mono">
              OVR: {editedPlayer.currentOVR} • {editedPlayer.position} #{editedPlayer.number}
            </span>
          </div>

          {/* Form Controls */}
          <div className="md:col-span-7 space-y-4">
            {/* Photo Uploader */}
            <div className="bg-neutral-800/60 p-4 rounded-xl border border-neutral-700/60">
              <label className="block text-xs font-bold text-neutral-300 mb-2 uppercase tracking-wider">
                Kart Fotoğrafı Yükle (Otomatik WebP Sıkıştırma)
              </label>
              <div className="flex items-center gap-4">
                <label className="cursor-pointer bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs px-4 py-2.5 rounded-lg flex items-center gap-2 transition-colors">
                  <Upload className="w-4 h-4" />
                  {isCompressing ? 'Sıkıştırılıyor...' : 'Galeriden / Kameradan Seç'}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="hidden"
                    disabled={isCompressing}
                  />
                </label>
                {isCompressing && <RefreshCw className="w-4 h-4 text-amber-400 animate-spin" />}
              </div>
            </div>

            {/* Interactive Photo Cropper & Adjustment Panel */}
            <div className="bg-neutral-800/60 p-4 rounded-xl border border-neutral-700/60 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-neutral-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Move className="w-3.5 h-3.5 text-amber-400" /> Fotoğrafı Konumlandır & Kırp (Kadraj)
                </label>
                <button
                  type="button"
                  onClick={resetAdjustments}
                  className="text-[10px] text-neutral-400 hover:text-white flex items-center gap-1 bg-neutral-900 px-2 py-0.5 rounded border border-neutral-700 cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" /> Sıfırla & Ortala
                </button>
              </div>

              {/* Sliders Grid */}
              <div className="space-y-2.5 bg-neutral-950 p-3 rounded-xl border border-neutral-850">
                {/* Zoom */}
                <div>
                  <div className="flex justify-between items-center text-[11px] mb-1">
                    <span className="text-neutral-300 font-semibold flex items-center gap-1">
                      <ZoomIn className="w-3 h-3 text-amber-400" /> Büyüt / Küçült (Ölçek):
                    </span>
                    <span className="font-mono text-amber-400 font-bold">{adjustments.scale.toFixed(2)}x</span>
                  </div>
                  <input
                    type="range"
                    min="0.8"
                    max="2.5"
                    step="0.05"
                    value={adjustments.scale}
                    onChange={(e) => updateAdjustment('scale', parseFloat(e.target.value))}
                    className="w-full accent-amber-500 h-1.5 bg-neutral-800 rounded cursor-pointer"
                  />
                </div>

                {/* Horizontal (X) */}
                <div>
                  <div className="flex justify-between items-center text-[11px] mb-1">
                    <span className="text-neutral-300 font-semibold">↔️ Sağa / Sola Kaydır (X Ekseni):</span>
                    <span className="font-mono text-amber-400 font-bold">{adjustments.x > 0 ? `+${adjustments.x}%` : `${adjustments.x}%`}</span>
                  </div>
                  <input
                    type="range"
                    min="-50"
                    max="50"
                    step="1"
                    value={adjustments.x}
                    onChange={(e) => updateAdjustment('x', parseInt(e.target.value))}
                    className="w-full accent-amber-500 h-1.5 bg-neutral-800 rounded cursor-pointer"
                  />
                </div>

                {/* Vertical (Y) */}
                <div>
                  <div className="flex justify-between items-center text-[11px] mb-1">
                    <span className="text-neutral-300 font-semibold">↕️ Yukarı / Aşağı Kaydır (Y Ekseni):</span>
                    <span className="font-mono text-amber-400 font-bold">{adjustments.y > 0 ? `+${adjustments.y}%` : `${adjustments.y}%`}</span>
                  </div>
                  <input
                    type="range"
                    min="-50"
                    max="50"
                    step="1"
                    value={adjustments.y}
                    onChange={(e) => updateAdjustment('y', parseInt(e.target.value))}
                    className="w-full accent-amber-500 h-1.5 bg-neutral-800 rounded cursor-pointer"
                  />
                </div>
              </div>
              <p className="text-[10px] text-neutral-400 italic">
                * WhatsApp fotoğraflarında yüzü kartın ortasına tam oturtmak için kaydırıcıları kullanın. Soldaki kartta canlı olarak önizlenir.
              </p>
            </div>

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

            {/* PlayStyles Picker */}
            <div>
              <label className="block text-xs font-bold text-neutral-300 mb-1.5">
                PlayStyles+ Rozetleri (Maksimum 2 Rozet)
              </label>
              <div className="flex flex-wrap gap-1.5">
                {(Object.keys(PLAYSTYLE_CONFIG) as PlayStyle[]).map((style) => {
                  const active = editedPlayer.playstyles.includes(style);
                  return (
                    <button
                      key={style}
                      type="button"
                      onClick={() => togglePlayStyle(style)}
                      className={`text-xs px-2.5 py-1 rounded-md border transition-all ${
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

            {/* Save Button */}
            <div className="flex justify-end gap-3 pt-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-bold"
              >
                İptal
              </button>
              <button
                type="button"
                onClick={() => {
                  onSave(editedPlayer);
                  onClose();
                }}
                className="px-5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-black text-xs font-black flex items-center gap-2 shadow-lg shadow-amber-500/25"
              >
                <Check className="w-4 h-4" /> Kartı Kaydet
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
