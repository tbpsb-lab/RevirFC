import React, { useState } from 'react';
import { PhotoArchiveItem, Player } from '../../types';
import imageCompression from 'browser-image-compression';
import { Camera, Heart, Tag, Upload, RefreshCw, Sparkles } from 'lucide-react';

interface Props {
  photos: PhotoArchiveItem[];
  players: Player[];
  currentPlayer: Player;
  onAddPhoto: (photo: Omit<PhotoArchiveItem, 'id' | 'createdAt' | 'likes'>) => void;
  onLikePhoto: (photoId: string) => void;
}

export const PhotoGallery: React.FC<Props> = ({
  photos,
  players,
  currentPlayer,
  onAddPhoto,
  onLikePhoto,
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [caption, setCaption] = useState('');
  const [matchTitle, setMatchTitle] = useState('14. Hafta Maçı');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [taggedPlayerIds, setTaggedPlayerIds] = useState<string[]>([]);

  const handleImageFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      // Client-side WebP compression (< 200 KB)
      const options = {
        maxSizeMB: 0.25,
        maxWidthOrHeight: 1200,
        useWebWorker: true,
        fileType: 'image/webp',
      };
      const compressedFile = await imageCompression(file, options);
      const url = URL.createObjectURL(compressedFile);
      setSelectedImage(url);
    } catch (err) {
      console.error('Image compression failed:', err);
    } finally {
      setIsUploading(false);
    }
  };

  const toggleTagPlayer = (id: string) => {
    setTaggedPlayerIds((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  const handleUploadSubmit = () => {
    if (!selectedImage) return;

    onAddPhoto({
      matchId: 'match-current',
      matchTitle,
      imageUrl: selectedImage,
      caption: caption.trim() || 'Maç sonu anı pozu',
      taggedPlayerIds,
      uploadedBy: currentPlayer.name,
    });

    setSelectedImage(null);
    setCaption('');
    setTaggedPlayerIds([]);
    setShowUploadModal(false);
  };

  return (
    <div className="space-y-6">
      {/* Upload button and header */}
      <div className="flex items-center justify-between bg-neutral-900/90 p-4 rounded-2xl border border-neutral-800">
        <div>
          <h3 className="text-base font-black text-white flex items-center gap-2">
            <Camera className="w-5 h-5 text-amber-400" /> Halı Saha Görsel Anı Arşivi & Fotoğraf Galerisi
          </h3>
          <p className="text-xs text-neutral-400 mt-0.5">
            Otomatik WebP sıkıştırma sayesinde telefonunuzdaki 10 MB fotoğraflar anında ~180 KB'a düşer ve arşivlenir.
          </p>
        </div>
        <button
          onClick={() => setShowUploadModal(true)}
          className="bg-amber-500 hover:bg-amber-400 text-black text-xs font-black px-4 py-2.5 rounded-xl flex items-center gap-2 shadow-lg shadow-amber-500/20"
        >
          <Upload className="w-4 h-4" /> Fotoğraf Yükle & Etiketle
        </button>
      </div>

      {/* Photo Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {photos.map((item) => {
          const hasLiked = item.likes.includes(currentPlayer.id);
          const taggedPlayers = players.filter((p) => item.taggedPlayerIds.includes(p.id));

          return (
            <div
              key={item.id}
              className="bg-neutral-900/90 border border-neutral-800 rounded-3xl overflow-hidden shadow-xl group hover:border-neutral-700 transition-all flex flex-col justify-between"
            >
              {/* Photo */}
              <div className="relative aspect-video w-full overflow-hidden bg-black">
                <img
                  src={item.imageUrl}
                  alt={item.caption}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full text-[11px] font-mono text-white border border-white/20">
                  {item.matchTitle}
                </div>
              </div>

              {/* Details & Tagged players */}
              <div className="p-4 space-y-3">
                <p className="text-sm font-semibold text-neutral-200">{item.caption}</p>

                {/* Tagged players pills */}
                {taggedPlayers.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <span className="text-[10px] text-neutral-400 font-bold flex items-center gap-1">
                      <Tag className="w-3 h-3 text-amber-400" /> Etiketlenenler:
                    </span>
                    {taggedPlayers.map((p) => (
                      <span
                        key={p.id}
                        className="text-[10px] bg-neutral-800 border border-neutral-700 text-amber-300 font-bold px-2 py-0.5 rounded-full"
                      >
                        {p.name}
                      </span>
                    ))}
                  </div>
                )}

                {/* Footer: Like & Uploader */}
                <div className="flex items-center justify-between pt-2 border-t border-neutral-800 text-xs">
                  <span className="text-neutral-500 text-[11px]">Yükleyen: {item.uploadedBy}</span>
                  <button
                    onClick={() => onLikePhoto(item.id)}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-xl border text-xs font-bold transition-all ${
                      hasLiked
                        ? 'bg-rose-500/20 border-rose-500 text-rose-400'
                        : 'bg-neutral-800 border-neutral-700 text-neutral-400 hover:text-white'
                    }`}
                  >
                    <Heart className={`w-3.5 h-3.5 ${hasLiked ? 'fill-rose-500' : ''}`} />
                    <span>{item.likes.length} Beğeni</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl max-w-lg w-full p-6 text-white shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800 mb-4">
              <h3 className="font-black text-amber-400 text-base flex items-center gap-2">
                <Camera className="w-5 h-5" /> Arşive Yeni Fotoğraf Ekle
              </h3>
              <button
                onClick={() => setShowUploadModal(false)}
                className="text-neutral-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              {/* Image Picker */}
              <div>
                <label className="block text-xs font-bold text-neutral-300 mb-2 uppercase">
                  Fotoğraf (Telefondan / Galeriden)
                </label>
                <div className="flex items-center gap-3">
                  <label className="cursor-pointer bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs px-4 py-2.5 rounded-xl flex items-center gap-2">
                    <Upload className="w-4 h-4" />
                    {isUploading ? 'WebP Sıkıştırılıyor...' : 'Fotoğraf Seç'}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageFile}
                      className="hidden"
                      disabled={isUploading}
                    />
                  </label>
                  {isUploading && <RefreshCw className="w-4 h-4 text-amber-400 animate-spin" />}
                </div>

                {selectedImage && (
                  <div className="mt-3 aspect-video w-full rounded-2xl overflow-hidden border border-neutral-700">
                    <img src={selectedImage} alt="Preview" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>

              {/* Caption */}
              <div>
                <label className="block text-xs font-bold text-neutral-300 mb-1">Fotoğraf Açıklaması</label>
                <input
                  type="text"
                  placeholder="örn: Maç sonu çay muhabbeti & kazanan Yeşil Takım pozu"
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              {/* Tagging */}
              <div>
                <label className="block text-xs font-bold text-neutral-300 mb-1.5">
                  Fotoğraftaki Oyuncuları Etiketle (Profillerine Düşer)
                </label>
                <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-2 bg-neutral-950 rounded-xl border border-neutral-800">
                  {players.map((p) => {
                    const isTagged = taggedPlayerIds.includes(p.id);
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => toggleTagPlayer(p.id)}
                        className={`text-xs px-2.5 py-1 rounded-lg border font-semibold transition-all ${
                          isTagged
                            ? 'bg-amber-500 text-black border-amber-400'
                            : 'bg-neutral-900 text-neutral-400 border-neutral-800 hover:border-neutral-600'
                        }`}
                      >
                        {p.name} {isTagged && '✓'}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Submit */}
              <div className="flex justify-end gap-2 pt-3 border-t border-neutral-800">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-bold"
                >
                  İptal
                </button>
                <button
                  type="button"
                  disabled={!selectedImage}
                  onClick={handleUploadSubmit}
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-black text-xs font-black shadow-lg shadow-amber-500/20"
                >
                  Arşive Kaydet
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
