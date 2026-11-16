import React, { useEffect, useMemo, useRef, useState } from 'react';
import imageCompression from 'browser-image-compression';
import { LockerComment, LockerPost, PhotoArchiveItem, Player } from '../../types';
import {
  Camera,
  Check,
  Image as ImageIcon,
  Lock,
  MessageCircle,
  Pencil,
  Pin,
  RefreshCw,
  RotateCcw,
  Send,
  SmilePlus,
  Tag,
  Trash2,
  X,
} from 'lucide-react';

export const LOCKER_EDIT_WINDOW_MS = 15 * 60 * 1000; // WhatsApp gibi 15 dakika düzenleme süresi
export const LOCKER_DELETE_WINDOW_MS = 48 * 60 * 60 * 1000; // 48 saat içinde Herkesten Sil
const HIDDEN_LOCKER_STORAGE_KEY = 'revirfc_hidden_locker_v1';

interface Props {
  posts: LockerPost[];
  photos?: PhotoArchiveItem[];
  players?: Player[];
  currentPlayer?: Player;
  onAddPost: (
    text: string,
    isAnonymous: boolean,
    media?: { imageUrl: string; matchTitle?: string; taggedPlayerIds?: string[] }
  ) => void;
  onReact: (postId: string, reactionType: keyof LockerPost['reactions']) => void;
  onToggleEmojiReaction?: (itemId: string, source: 'post' | 'photo', emoji: string) => void;
  onAddComment?: (itemId: string, source: 'post' | 'photo', text: string) => void;
  onEditPost?: (itemId: string, source: 'post' | 'photo', newText: string, newMatchTitle?: string) => void;
  onDeletePost?: (itemId: string, source: 'post' | 'photo', mode: 'everyone' | 'purge') => void;
  onEditComment?: (itemId: string, source: 'post' | 'photo', commentId: string, newText: string) => void;
  onDeleteComment?: (itemId: string, source: 'post' | 'photo', commentId: string, purge?: boolean) => void;
  ownAnonPostIds?: string[];
  onToggleHeadline?: (itemId: string, source: 'post' | 'photo') => void;
  canPinHeadline?: boolean;
  isReadOnly?: boolean;
  readOnlyReason?: 'pending' | 'former';
}

type FeedFilter = 'all' | 'headline' | 'photos' | 'text';

interface UnifiedFeedItem {
  id: string;
  source: 'post' | 'photo';
  authorPlayerId: string;
  authorName: string;
  authorPhoto?: string;
  text: string;
  imageUrl?: string;
  matchTitle?: string;
  taggedPlayerIds: string[];
  isAnonymous: boolean;
  isHeadline: boolean;
  isDeleted?: boolean;
  isPurged?: boolean;
  deletedAt?: string;
  deletedBy?: 'author' | 'committee';
  editedAt?: string;
  classicReactions?: LockerPost['reactions'];
  emojiReactions: Record<string, string[]>;
  legacyLikes: string[];
  comments: LockerComment[];
  createdAt: string;
}

const CLASSIC_REACTIONS: {
  key: keyof LockerPost['reactions'];
  emoji: string;
  label: string;
}[] = [
  { key: 'fire', emoji: '🔥', label: 'Alev Atıyo!' },
  { key: 'laugh', emoji: '😂', label: 'Kahkaha' },
  { key: 'violin', emoji: '🎻', label: 'Bahane' },
  { key: 'revir', emoji: '🚑', label: 'Revirlik' },
  { key: 'goat', emoji: '🐐', label: 'GOAT' },
];

const WHATSAPP_EMOJIS = [
  '⚽', '🥅', '🧤', '👏', '💯', '❤️',
  '😂', '🤣', '🔥', '👑', '🐐', '🎯',
  '⚡', '🚀', '💪', '🤝', '🫖', '🍵',
  '🎻', '🚑', '🪵', '😎', '🤯', '🙌',
];

export const LockerRoomFeed: React.FC<Props> = ({
  posts,
  photos = [],
  players = [],
  currentPlayer,
  onAddPost,
  onReact,
  onToggleEmojiReaction,
  onAddComment,
  onEditPost,
  onDeletePost,
  onEditComment,
  onDeleteComment,
  ownAnonPostIds = [],
  onToggleHeadline,
  canPinHeadline = false,
  isReadOnly = false,
  readOnlyReason = 'pending',
}) => {
  const [newText, setNewText] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [matchTitle, setMatchTitle] = useState('');
  const [taggedPlayerIds, setTaggedPlayerIds] = useState<string[]>([]);
  const [showTagPicker, setShowTagPicker] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FeedFilter>('all');
  const [openEmojiPickerId, setOpenEmojiPickerId] = useState<string | null>(null);
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [expandedComments, setExpandedComments] = useState<Record<string, boolean>>({});
  const [lightboxItem, setLightboxItem] = useState<UnifiedFeedItem | null>(null);
  const [nowMs, setNowMs] = useState<number>(() => Date.now());
  const [editingPostKey, setEditingPostKey] = useState<string | null>(null);
  const [editPostText, setEditPostText] = useState('');
  const [editPostMatchTitle, setEditPostMatchTitle] = useState('');
  const [confirmDeletePostKey, setConfirmDeletePostKey] = useState<string | null>(null);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editCommentText, setEditCommentText] = useState('');
  const [confirmDeleteCommentId, setConfirmDeleteCommentId] = useState<string | null>(null);
  const [hiddenItemKeys, setHiddenItemKeys] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(HIDDEN_LOCKER_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // ignore storage errors
    }
    return [];
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const timer = window.setInterval(() => setNowMs(Date.now()), 30000);
    return () => window.clearInterval(timer);
  }, []);

  const hideItemForMe = (itemKey: string) => {
    setHiddenItemKeys((prev) => {
      if (prev.includes(itemKey)) return prev;
      const next = [...prev, itemKey];
      try {
        localStorage.setItem(HIDDEN_LOCKER_STORAGE_KEY, JSON.stringify(next));
      } catch {
        // ignore storage errors
      }
      return next;
    });
    setConfirmDeletePostKey(null);
  };

  const restoreHiddenItemsForMe = () => {
    setHiddenItemKeys([]);
    try {
      localStorage.removeItem(HIDDEN_LOCKER_STORAGE_KEY);
    } catch {
      // ignore storage errors
    }
  };

  const resolvePlayerPhoto = (playerId?: string, authorName?: string, fallback?: string): string => {
    if (playerId === 'system') return '/logo.jpg';
    const normalizedAuthor = authorName?.trim().toLocaleLowerCase('tr-TR');
    const matched = players.find(
      (p) =>
        (playerId && p.id === playerId) ||
        (normalizedAuthor && p.name.trim().toLocaleLowerCase('tr-TR') === normalizedAuthor)
    );
    return matched?.photoUrl || fallback || '/logo.jpg';
  };

  const liveCurrentPlayerPhoto =
    (currentPlayer && players.find((p) => p.id === currentPlayer.id)?.photoUrl) ||
    currentPlayer?.photoUrl ||
    '/logo.jpg';

  const getSafeImageUrl = (url?: string): string => {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) return url;
    const base = import.meta.env.BASE_URL || '/';
    const cleanBase = base.endsWith('/') ? base.slice(0, -1) : base;
    return url.startsWith('/') ? `${cleanBase}${url}` : `${cleanBase}/${url}`;
  };

  const unifiedItems = useMemo<UnifiedFeedItem[]>(() => {
    const postItems: UnifiedFeedItem[] = posts.map((post) => ({
      id: post.id,
      source: 'post',
      authorPlayerId: post.authorPlayerId,
      authorName: post.authorName,
      authorPhoto: post.authorPhoto,
      text: post.text,
      imageUrl: post.imageUrl,
      matchTitle: post.matchTitle,
      taggedPlayerIds: post.taggedPlayerIds || [],
      isAnonymous: Boolean(post.isAnonymous),
      isHeadline: Boolean(post.isHeadline) && !post.isDeleted,
      isDeleted: Boolean(post.isDeleted),
      deletedAt: post.deletedAt,
      deletedBy: post.deletedBy,
      editedAt: post.editedAt,
      classicReactions: post.reactions,
      emojiReactions: post.emojiReactions || {},
      legacyLikes: [],
      comments: post.comments || [],
      createdAt: post.createdAt,
    }));

    const postImageSet = new Set(posts.map((p) => p.imageUrl).filter(Boolean));

    const legacyPhotoItems: UnifiedFeedItem[] = photos
      .filter((photo) => !photo.isPurged && (!photo.imageUrl || !postImageSet.has(photo.imageUrl)))
      .map((photo) => ({
        id: photo.id,
        source: 'photo',
        authorPlayerId: photo.authorPlayerId || '',
        authorName: photo.uploadedBy || 'Kulüp Üyesi',
        text: photo.caption || (photo.isDeleted ? '' : 'Maç Anısı'),
        imageUrl: photo.imageUrl,
        matchTitle: photo.matchTitle,
        taggedPlayerIds: photo.taggedPlayerIds || [],
        isAnonymous: false,
        isHeadline: Boolean(photo.isHeadline) && !photo.isDeleted,
        isDeleted: Boolean(photo.isDeleted),
        isPurged: Boolean(photo.isPurged),
        deletedAt: photo.deletedAt,
        deletedBy: photo.deletedBy,
        editedAt: photo.editedAt,
        emojiReactions: photo.emojiReactions || {},
        legacyLikes: photo.likes || [],
        comments: photo.comments || [],
        createdAt: photo.createdAt,
      }));

    return [...postItems, ...legacyPhotoItems].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [posts, photos]);

  const visibleItems = useMemo(
    () => unifiedItems.filter((item) => !item.isPurged && !hiddenItemKeys.includes(`${item.source}:${item.id}`)),
    [unifiedItems, hiddenItemKeys]
  );

  const countTotalReactions = (item: UnifiedFeedItem): number => {
    const classic = item.classicReactions
      ? Object.values(item.classicReactions).reduce((s, arr) => s + arr.length, 0)
      : 0;
    const custom = Object.values(item.emojiReactions).reduce((s, arr) => s + arr.length, 0);
    return classic + custom + item.legacyLikes.length;
  };

  const activeHeadlineCandidates = visibleItems.filter((i) => !i.isDeleted);
  const headlinePost =
    activeHeadlineCandidates.find((item) => item.isHeadline) ||
    [...activeHeadlineCandidates].sort((a, b) => countTotalReactions(b) - countTotalReactions(a))[0];

  const filteredItems = useMemo(() => {
    if (filter === 'headline') return visibleItems.filter((i) => i.isHeadline && !i.isDeleted);
    if (filter === 'photos') return visibleItems.filter((i) => Boolean(i.imageUrl) && !i.isDeleted);
    if (filter === 'text') return visibleItems.filter((i) => !i.imageUrl);
    return visibleItems;
  }, [visibleItems, filter]);

  const handleImageFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploadError(null);
    setIsCompressing(true);

    try {
      // 1280px keskin çözünürlük + WebP (~90-180 KB) ile yüksek kalite ve minimum sunucu yükü
      const options = {
        maxSizeMB: 0.18,
        maxWidthOrHeight: 1280,
        initialQuality: 0.85,
        useWebWorker: true,
        fileType: 'image/webp',
      };
      const compressed = await imageCompression(file, options);
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
        setIsCompressing(false);
      };
      reader.onerror = () => {
        setUploadError('Görsel okunamadı, lütfen başka bir fotoğraf seçin.');
        setIsCompressing(false);
      };
      reader.readAsDataURL(compressed);
    } catch (err) {
      console.error('Image compression failed:', err);
      setUploadError('Görsel sıkıştırılırken hata oluştu.');
      setIsCompressing(false);
    }
  };

  const toggleTagPlayer = (playerId: string) => {
    setTaggedPlayerIds((prev) =>
      prev.includes(playerId) ? prev.filter((id) => id !== playerId) : [...prev, playerId]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newText.trim() && !selectedImage) return;

    const cleanText = newText.trim() || (selectedImage ? 'Maç anısı 📸' : '');
    onAddPost(
      cleanText,
      selectedImage ? false : isAnonymous,
      selectedImage
        ? {
            imageUrl: selectedImage,
            matchTitle: matchTitle.trim() || undefined,
            taggedPlayerIds: taggedPlayerIds.length > 0 ? taggedPlayerIds : undefined,
          }
        : undefined
    );

    setNewText('');
    setSelectedImage(null);
    setMatchTitle('');
    setTaggedPlayerIds([]);
    setShowTagPicker(false);
  };

  const handleEmojiPick = (item: UnifiedFeedItem, emoji: string) => {
    setOpenEmojiPickerId(null);
    if (isReadOnly || !currentPlayer) return;

    const classicMatch = CLASSIC_REACTIONS.find((c) => c.emoji === emoji);
    if (item.source === 'post' && classicMatch) {
      onReact(item.id, classicMatch.key);
      return;
    }
    onToggleEmojiReaction?.(item.id, item.source, emoji);
  };

  const handleCommentSubmit = (e: React.FormEvent, item: UnifiedFeedItem) => {
    e.preventDefault();
    if (isReadOnly || !currentPlayer) return;
    const key = `${item.source}:${item.id}`;
    const draft = (commentDrafts[key] || '').trim();
    if (!draft) return;

    onAddComment?.(item.id, item.source, draft);
    setCommentDrafts((prev) => ({ ...prev, [key]: '' }));
    setExpandedComments((prev) => ({ ...prev, [key]: true }));
  };

  const photoCount = visibleItems.filter((i) => Boolean(i.imageUrl) && !i.isDeleted).length;
  const headlineCount = visibleItems.filter((i) => i.isHeadline && !i.isDeleted).length;
  const hiddenInFeedCount = unifiedItems.filter(
    (i) => !i.isPurged && hiddenItemKeys.includes(`${i.source}:${i.id}`)
  ).length;

  return (
    <div className="space-y-5">
      {/* Pinned Headline: Haftanın Manşeti */}
      {headlinePost && (
        <div className="relative overflow-hidden bg-gradient-to-r from-amber-500/20 via-neutral-900 to-amber-900/30 border-2 border-amber-500/50 rounded-3xl p-4 sm:p-5 shadow-2xl">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
            <div className="flex items-center gap-2 text-amber-400 text-xs font-black uppercase tracking-wider">
              <Pin className="w-4 h-4 fill-amber-400" /> Haftanın Soyunma Odası Manşeti
            </div>
            {canPinHeadline && headlinePost.isHeadline && onToggleHeadline && (
              <button
                type="button"
                onClick={() => onToggleHeadline(headlinePost.id, headlinePost.source)}
                className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-black/40 hover:bg-black/60 text-amber-300 border border-amber-500/35 cursor-pointer"
              >
                📌 Manşetten Kaldır
              </button>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-3 items-start">
            {headlinePost.imageUrl && (
              <button
                type="button"
                onClick={() => setLightboxItem(headlinePost)}
                className="shrink-0 w-full sm:w-28 h-28 rounded-2xl overflow-hidden border border-amber-400/40 cursor-pointer"
              >
                <img
                  src={getSafeImageUrl(headlinePost.imageUrl)}
                  alt="Manşet görseli"
                  className="w-full h-full object-cover"
                  loading="eager"
                  decoding="async"
                  onError={(e) => {
                    const t = e.currentTarget;
                    if (t.src.endsWith('.webp')) {
                      t.src = t.src.replace(/\.webp$/, '.jpg');
                    } else if (!t.src.includes('?r=')) {
                      t.src = `${t.src}?r=${Date.now()}`;
                    }
                  }}
                />
              </button>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-base md:text-lg font-bold text-white italic drop-shadow leading-relaxed">
                &ldquo;{headlinePost.text}&rdquo;
              </p>
              <div className="flex flex-wrap items-center justify-between gap-2 mt-3 pt-2.5 border-t border-amber-500/20 text-xs text-neutral-400">
                <span className="font-semibold text-amber-300">
                  — {headlinePost.isAnonymous ? 'Anonim Soyunma Odası Fısıltısı 🕵️' : headlinePost.authorName}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] bg-black/40 px-2 py-0.5 rounded border border-amber-500/30 text-amber-300 font-mono">
                    {countTotalReactions(headlinePost)} Tepki • {headlinePost.comments.length} Yorum
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Unified Composer (Message + Photo + Tags) */}
      {isReadOnly || !currentPlayer ? (
        <div className={`rounded-2xl p-4 text-xs flex items-center justify-between gap-3 border ${
          readOnlyReason === 'former'
            ? 'bg-stone-900/80 border-stone-700/60 text-stone-300'
            : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
        }`}>
          <div className="flex items-center gap-2.5">
            <Lock className={`w-4 h-4 shrink-0 ${readOnlyReason === 'former' ? 'text-amber-400/80' : 'text-amber-400'}`} />
            <span>
              {readOnlyReason === 'former'
                ? 'Mazide Kalanlar (Onursal Üye) olarak eski arkadaşlarının paylaşımlarını ve maç anılarını okuyabilirsin. Paylaşım, yorum ve tepki yalnızca aktif kadroya açıktır.'
                : 'Paylaşım, fotoğraf yükleme, emoji tepkisi ve yorum yapabilmek için onaylı üye girişi gereklidir. Akışı aşağıdan inceleyebilirsiniz.'}
            </span>
          </div>
          <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold shrink-0 ${
            readOnlyReason === 'former'
              ? 'bg-stone-800 text-amber-200 border border-stone-700'
              : 'bg-amber-500/20 text-amber-200'
          }`}>
            {readOnlyReason === 'former' ? '📜 Mazide Kalan' : 'Seyirci Modu'}
          </span>
        </div>
      ) : (
        <form
          onSubmit={handleSubmit}
          className="bg-neutral-900/95 border border-neutral-800 rounded-3xl p-4 shadow-xl space-y-3"
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <img
                src={liveCurrentPlayerPhoto}
                alt={currentPlayer.name}
                className="w-9 h-9 rounded-full object-cover object-top bg-neutral-800 border border-white/20"
              />
              <div>
                <span className="text-xs font-black text-white block">
                  {selectedImage || !isAnonymous
                    ? `${currentPlayer.name} olarak paylaş`
                    : 'Anonim Soyunma Odası Fısıltısı 🕵️'}
                </span>
                <span className="text-[10px] text-neutral-400">
                  WhatsApp kuralları: Gönderdiklerin <strong className="text-sky-300">15 dk</strong> düzenlenebilir, <strong className="text-rose-300">48 sa</strong> herkesten silinebilir.
                </span>
              </div>
            </div>
          </div>

          <textarea
            rows={2}
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
            placeholder="Maç taktiği, saha anısı, fotoğraf açıklaması veya tatlı hatırlatması yaz..."
            className="w-full bg-neutral-950 border border-neutral-800 rounded-2xl p-3 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-amber-400 resize-none"
          />

          {/* Selected Photo Preview + Optional Match Title & Player Tags */}
          {selectedImage && (
            <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-3 space-y-2.5">
              <div className="flex items-start gap-3">
                <img
                  src={selectedImage}
                  alt="Yüklenecek fotoğraf"
                  className="w-24 h-24 rounded-xl object-cover border border-amber-500/40 shrink-0"
                />
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-1">
                      <ImageIcon className="w-3.5 h-3.5" /> WebP Optimize Görsel Hazır
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedImage(null);
                        setTaggedPlayerIds([]);
                        setMatchTitle('');
                      }}
                      className="text-neutral-400 hover:text-rose-400 p-1 rounded-lg bg-neutral-900 cursor-pointer"
                      title="Fotoğrafı Kaldır"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <input
                    type="text"
                    value={matchTitle}
                    onChange={(e) => setMatchTitle(e.target.value)}
                    placeholder="Etkinlik / Hafta etiketi (ör. 14. Hafta Cuma Derbisi)"
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-2.5 py-1.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-amber-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowTagPicker((prev) => !prev)}
                    className="inline-flex items-center gap-1.5 text-[11px] font-bold text-amber-300 hover:text-amber-200 cursor-pointer"
                  >
                    <Tag className="w-3.5 h-3.5" />
                    Fotoğraftaki Oyuncuları Etiketle ({taggedPlayerIds.length})
                  </button>
                </div>
              </div>

              {showTagPicker && players.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-2 border-t border-neutral-800 max-h-28 overflow-y-auto">
                  {players.map((p) => {
                    const active = taggedPlayerIds.includes(p.id);
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => toggleTagPlayer(p.id)}
                        className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition-all cursor-pointer ${
                          active
                            ? 'bg-amber-500 text-black border-amber-400'
                            : 'bg-neutral-900 text-neutral-300 border-neutral-700 hover:border-neutral-600'
                        }`}
                      >
                        {p.name}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {uploadError && (
            <p className="text-xs text-rose-400 font-semibold">{uploadError}</p>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageFile}
            className="hidden"
          />

          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={isCompressing}
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-amber-300 font-bold cursor-pointer transition-colors disabled:opacity-50"
              >
                {isCompressing ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Camera className="w-3.5 h-3.5" />
                )}
                {isCompressing ? 'Hazırlanıyor...' : 'Fotoğraf Ekle'}
              </button>

              {!selectedImage && (
                <button
                  type="button"
                  onClick={() => setIsAnonymous((v) => !v)}
                  className={`text-xs px-3 py-1.5 rounded-xl border font-bold transition-all cursor-pointer ${
                    isAnonymous
                      ? 'bg-purple-900/60 border-purple-500 text-purple-200 shadow-md shadow-purple-900/40'
                      : 'bg-neutral-800 border-neutral-700 text-neutral-400 hover:text-white'
                  }`}
                >
                  {isAnonymous ? '🕵️ Anonim Fısıltı Aktif' : '👤 Açık İsim'}
                </button>
              )}
            </div>

            <button
              type="submit"
              disabled={(!newText.trim() && !selectedImage) || isCompressing}
              className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-40 disabled:hover:bg-amber-500 text-black text-xs font-black flex items-center gap-2 shadow-lg shadow-amber-500/20 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" /> Gönder
            </button>
          </div>
        </form>
      )}

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          {[
            { id: 'all' as const, label: `Tümü (${visibleItems.length})` },
            { id: 'photos' as const, label: `📸 Fotoğraflar (${photoCount})` },
            { id: 'headline' as const, label: `📌 Manşet (${headlineCount})` },
            { id: 'text' as const, label: `💬 Sadece Sohbet (${visibleItems.length - photoCount})` },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilter(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                filter === tab.id
                  ? 'bg-amber-500 text-black border-amber-400 shadow-md shadow-amber-500/20'
                  : 'bg-neutral-900/80 text-neutral-400 border-neutral-800 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {hiddenInFeedCount > 0 && (
          <button
            type="button"
            onClick={restoreHiddenItemsForMe}
            className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1.5 rounded-xl bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white cursor-pointer"
            title="Benden Sil ile gizlenen paylaşımları tekrar göster"
          >
            <RotateCcw className="w-3 h-3" />
            Gizlenenleri Göster ({hiddenInFeedCount})
          </button>
        )}
      </div>

      {/* Unified Chronological Timeline */}
      {filteredItems.length === 0 ? (
        <div className="bg-neutral-900/60 border border-neutral-800 rounded-2xl p-8 text-center text-xs text-neutral-400">
          Bu filtrede henüz paylaşım yok. İlk mesajı veya maç fotoğrafını yukarıdan paylaşabilirsiniz.
        </div>
      ) : (
        <div className="space-y-4">
          {filteredItems.map((item) => {
            const itemKey = `${item.source}:${item.id}`;
            const isPickerOpen = openEmojiPickerId === itemKey;
            const commentsOpen =
              expandedComments[itemKey] ?? (item.comments.length > 0 && item.comments.length <= 4);
            const draft = commentDrafts[itemKey] || '';
            const customEmojiEntries = Object.entries(item.emojiReactions).filter(
              ([emoji, ids]) =>
                ids.length > 0 &&
                !(item.source === 'post' && CLASSIC_REACTIONS.some((c) => c.emoji === emoji))
            );

            const isItemAuthor = Boolean(
              currentPlayer &&
                (item.isAnonymous
                  ? ownAnonPostIds.includes(item.id)
                  : (item.authorPlayerId && item.authorPlayerId === currentPlayer.id) ||
                    (!item.authorPlayerId && item.authorName === currentPlayer.name))
            );
            const createdMs = new Date(item.createdAt).getTime();
            const elapsedMs = Number.isFinite(createdMs) ? Math.max(0, nowMs - createdMs) : Infinity;
            const editRemainingMs = LOCKER_EDIT_WINDOW_MS - elapsedMs;
            const editRemainingMins = Math.max(1, Math.ceil(editRemainingMs / 60000));

            const canEditPost = Boolean(
              !isReadOnly && currentPlayer && !item.isDeleted && isItemAuthor && editRemainingMs > 0 && onEditPost
            );
            const canDeleteForEveryone = Boolean(
              !isReadOnly &&
                currentPlayer &&
                !item.isDeleted &&
                onDeletePost &&
                ((isItemAuthor && elapsedMs <= LOCKER_DELETE_WINDOW_MS) || canPinHeadline)
            );
            const isEditingThisPost = editingPostKey === itemKey;
            const isConfirmingDeletePost = confirmDeletePostKey === itemKey;

            // Tombstone view for WhatsApp-style "Herkesten Sil"
            if (item.isDeleted) {
              return (
                <div
                  key={itemKey}
                  className="px-4 py-3 rounded-2xl border border-neutral-800/70 bg-neutral-950/60 flex flex-wrap items-center justify-between gap-2 text-xs text-neutral-500"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="italic">
                      🚫{' '}
                      {item.deletedBy === 'committee'
                        ? 'Bu paylaşım yönetici / kurul tarafından kaldırıldı'
                        : 'Bu paylaşım silindi'}
                    </span>
                    <span className="text-[10px] text-neutral-600 font-mono">
                      •{' '}
                      {new Date(item.createdAt).toLocaleString('tr-TR', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {!isReadOnly && currentPlayer && (
                      <button
                        type="button"
                        onClick={() => hideItemForMe(itemKey)}
                        className="text-[10px] font-bold px-2 py-1 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-400 hover:text-white cursor-pointer"
                      >
                        Benden Sil
                      </button>
                    )}
                    {!isReadOnly && canPinHeadline && onDeletePost && (
                      <button
                        type="button"
                        onClick={() => onDeletePost(item.id, item.source, 'purge')}
                        className="text-[10px] font-bold px-2 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 cursor-pointer"
                        title="Bu silinmiş kaydı akıştan tamamen kaldır"
                      >
                        Akıştan Kaldır
                      </button>
                    )}
                  </div>
                </div>
              );
            }

            return (
              <div
                key={itemKey}
                className={`p-4 rounded-2xl border transition-all ${
                  item.isHeadline
                    ? 'bg-neutral-900/95 border-amber-500/45 shadow-lg shadow-amber-500/5'
                    : 'bg-neutral-900/75 border-neutral-800 hover:border-neutral-700'
                }`}
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-2 mb-2.5">
                  <div className="flex items-center gap-2.5 min-w-0">
                    {item.isAnonymous ? (
                      <div className="w-8 h-8 rounded-full bg-purple-900/80 border border-purple-500/40 flex items-center justify-center text-sm shrink-0">
                        🕵️
                      </div>
                    ) : (
                      <img
                        src={resolvePlayerPhoto(item.authorPlayerId, item.authorName, item.authorPhoto)}
                        alt={item.authorName}
                        className="w-8 h-8 rounded-full object-cover object-top bg-neutral-800 border border-white/20 shrink-0"
                      />
                    )}
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-xs font-black text-white truncate">
                          {item.isAnonymous ? 'Anonim Soyunma Odası Fısıltısı' : item.authorName}
                        </span>
                        {item.matchTitle && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-300 border border-neutral-700">
                            {item.matchTitle}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-neutral-500">
                        <span>
                          {new Date(item.createdAt).toLocaleString('tr-TR', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                        {item.editedAt && (
                          <span
                            className="italic text-neutral-400"
                            title={`Son düzenleme: ${new Date(item.editedAt).toLocaleString('tr-TR')}`}
                          >
                            • düzenlendi
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {item.isHeadline && (
                      <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/30">
                        ⭐ Manşet
                      </span>
                    )}
                    {canEditPost && (
                      <button
                        type="button"
                        onClick={() => {
                          setConfirmDeletePostKey(null);
                          setEditingPostKey(isEditingThisPost ? null : itemKey);
                          setEditPostText(item.text);
                          setEditPostMatchTitle(item.matchTitle || '');
                        }}
                        title={`WhatsApp tarzı düzenleme (${editRemainingMins} dk kaldı)`}
                        className="px-2 py-1 rounded-lg border text-[10px] font-bold flex items-center gap-1 bg-sky-500/15 border-sky-500/40 text-sky-300 hover:bg-sky-500/25 cursor-pointer transition-colors"
                      >
                        <Pencil className="w-3 h-3" />
                        <span>Düzenle ({editRemainingMins} dk)</span>
                      </button>
                    )}
                    {!isReadOnly && currentPlayer && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingPostKey(null);
                          setConfirmDeletePostKey(isConfirmingDeletePost ? null : itemKey);
                        }}
                        title={canDeleteForEveryone ? 'Paylaşımı sil (Herkesten / Benden)' : 'Benden sil (gizle)'}
                        className="px-2 py-1 rounded-lg border text-[10px] font-bold flex items-center gap-1 bg-rose-500/10 border-rose-500/35 text-rose-300 hover:bg-rose-500/20 cursor-pointer transition-colors"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Sil</span>
                      </button>
                    )}
                    {canPinHeadline && onToggleHeadline && (
                      <button
                        type="button"
                        onClick={() => onToggleHeadline(item.id, item.source)}
                        title={item.isHeadline ? 'Manşetten Kaldır' : 'Haftanın Manşeti Yap'}
                        className={`p-1.5 rounded-lg border text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-colors ${
                          item.isHeadline
                            ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                            : 'bg-neutral-800/80 border-neutral-700 text-neutral-400 hover:text-amber-300'
                        }`}
                      >
                        <Pin className="w-3 h-3" />
                        <span className="hidden sm:inline">
                          {item.isHeadline ? 'Manşette' : 'Manşete Sabitle'}
                        </span>
                      </button>
                    )}
                  </div>
                </div>

                {/* WhatsApp-style inline Delete Dialog */}
                {isConfirmingDeletePost && (
                  <div className="mb-3 p-3 rounded-xl bg-rose-950/30 border border-rose-500/35 flex flex-wrap items-center justify-between gap-2 text-xs">
                    <span className="text-rose-200 font-bold">
                      Bu paylaşımı nasıl silmek istersiniz?
                    </span>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {canDeleteForEveryone && onDeletePost && (
                        <button
                          type="button"
                          onClick={() => {
                            onDeletePost(item.id, item.source, 'everyone');
                            setConfirmDeletePostKey(null);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold cursor-pointer"
                        >
                          Herkesten Sil
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => hideItemForMe(itemKey)}
                        className="px-2.5 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-bold border border-neutral-700 cursor-pointer"
                      >
                        Benden Sil
                      </button>
                      {canPinHeadline && onDeletePost && (
                        <button
                          type="button"
                          onClick={() => {
                            onDeletePost(item.id, item.source, 'purge');
                            setConfirmDeletePostKey(null);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-neutral-900 hover:bg-rose-950 text-rose-300 font-bold border border-rose-500/30 cursor-pointer"
                          title="Yönetici: İz bırakmadan akıştan tamamen kaldır"
                        >
                          Akıştan Kaldır
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setConfirmDeletePostKey(null)}
                        className="px-2.5 py-1 rounded-lg bg-transparent hover:bg-neutral-800 text-neutral-400 font-semibold cursor-pointer"
                      >
                        Vazgeç
                      </button>
                    </div>
                  </div>
                )}

                {/* Inline Post Edit Form (15 dk WhatsApp penceresi) OR Static Text */}
                {isEditingThisPost ? (
                  <div className="my-2 p-3 rounded-xl bg-neutral-950 border border-sky-500/40 space-y-2">
                    <div className="flex items-center justify-between text-[11px] text-sky-300 font-bold">
                      <span>✏️ Paylaşımı Düzenle</span>
                      <span className="font-mono">{editRemainingMins} dk kaldı</span>
                    </div>
                    <textarea
                      rows={3}
                      value={editPostText}
                      onChange={(e) => setEditPostText(e.target.value)}
                      className="w-full bg-neutral-900 border border-neutral-700 rounded-xl p-2.5 text-sm text-white focus:outline-none focus:border-sky-400 resize-none"
                    />
                    {item.source === 'photo' && (
                      <input
                        type="text"
                        value={editPostMatchTitle}
                        onChange={(e) => setEditPostMatchTitle(e.target.value)}
                        placeholder="Etkinlik / Hafta etiketi (opsiyonel)"
                        className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-sky-400"
                      />
                    )}
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setEditingPostKey(null)}
                        className="px-3 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-bold cursor-pointer"
                      >
                        Vazgeç
                      </button>
                      <button
                        type="button"
                        disabled={!editPostText.trim()}
                        onClick={() => {
                          onEditPost?.(
                            item.id,
                            item.source,
                            editPostText,
                            item.source === 'photo' ? editPostMatchTitle : undefined
                          );
                          setEditingPostKey(null);
                        }}
                        className="px-3 py-1 rounded-lg bg-sky-500 hover:bg-sky-400 disabled:opacity-40 text-black text-xs font-black flex items-center gap-1 cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" /> Kaydet
                      </button>
                    </div>
                  </div>
                ) : (
                  item.text && (
                    <p className="text-sm text-neutral-200 my-2 leading-relaxed whitespace-pre-wrap">
                      {item.text}
                    </p>
                  )
                )}

                {/* Shared Image */}
                {item.imageUrl && (
                  <div className="my-2.5 space-y-2">
                    <button
                      type="button"
                      onClick={() => setLightboxItem(item)}
                      className="block w-full max-h-[380px] rounded-2xl overflow-hidden border border-neutral-800 hover:border-amber-500/40 transition-colors bg-neutral-950 cursor-pointer"
                    >
                      <img
                        src={getSafeImageUrl(item.imageUrl)}
                        alt={item.text || 'Maç fotoğrafı'}
                        className="w-full max-h-[380px] object-contain mx-auto"
                        loading="eager"
                        decoding="async"
                        onError={(e) => {
                          const t = e.currentTarget;
                          if (t.src.endsWith('.webp')) {
                            t.src = t.src.replace(/\.webp$/, '.jpg');
                          } else if (!t.src.includes('?r=')) {
                            t.src = `${t.src}?r=${Date.now()}`;
                          }
                        }}
                      />
                    </button>

                    {item.taggedPlayerIds.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1">
                        {item.taggedPlayerIds.map((pid) => {
                          const tagged = players.find((p) => p.id === pid);
                          if (!tagged) return null;
                          return (
                            <span
                              key={pid}
                              className="inline-flex items-center gap-1 text-[10px] font-semibold bg-neutral-800/80 border border-neutral-700 text-amber-200 px-2 py-0.5 rounded-full"
                            >
                              #{tagged.name}
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* Reactions Row (Classic + WhatsApp-style Emoji Picker) */}
                <div className="relative flex flex-wrap items-center gap-1.5 pt-2.5 border-t border-neutral-800/80 mt-2.5">
                  {item.source === 'post' &&
                    item.classicReactions &&
                    CLASSIC_REACTIONS.map((btn) => {
                      const count = item.classicReactions?.[btn.key]?.length || 0;
                      const hasReacted = currentPlayer
                        ? item.classicReactions?.[btn.key]?.includes(currentPlayer.id) ?? false
                        : false;
                      return (
                        <button
                          key={btn.key}
                          type="button"
                          onClick={() => {
                            if (!isReadOnly && currentPlayer) {
                              onReact(item.id, btn.key);
                            }
                          }}
                          title={btn.label}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs border transition-all cursor-pointer ${
                            hasReacted
                              ? 'bg-amber-500/20 border-amber-400 text-amber-300 font-bold'
                              : 'bg-neutral-800/60 border-neutral-700/60 text-neutral-400 hover:text-white hover:bg-neutral-800'
                          }`}
                        >
                          <span>{btn.emoji}</span>
                          {count > 0 && <span className="font-mono text-[11px] font-bold">{count}</span>}
                        </button>
                      );
                    })}

                  {item.source === 'photo' && item.legacyLikes.length > 0 && (
                    <button
                      type="button"
                      onClick={() => !isReadOnly && currentPlayer && onToggleEmojiReaction?.(item.id, 'photo', '❤️')}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs border bg-neutral-800/60 border-neutral-700/60 text-neutral-300 cursor-pointer"
                    >
                      <span>❤️</span>
                      <span className="font-mono text-[11px] font-bold">{item.legacyLikes.length}</span>
                    </button>
                  )}

                  {customEmojiEntries.map(([emoji, userIds]) => {
                    const hasReacted = currentPlayer ? userIds.includes(currentPlayer.id) : false;
                    return (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => handleEmojiPick(item, emoji)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs border transition-all cursor-pointer ${
                          hasReacted
                            ? 'bg-amber-500/20 border-amber-400 text-amber-300 font-bold'
                            : 'bg-neutral-800/60 border-neutral-700/60 text-neutral-300 hover:text-white hover:bg-neutral-800'
                        }`}
                      >
                        <span>{emoji}</span>
                        <span className="font-mono text-[11px] font-bold">{userIds.length}</span>
                      </button>
                    );
                  })}

                  {/* WhatsApp Emoji Picker Trigger */}
                  {!isReadOnly && currentPlayer && (
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setOpenEmojiPickerId(isPickerOpen ? null : itemKey)}
                        title="Emoji ile tepki ver"
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-xl text-xs border bg-neutral-800/70 border-neutral-700 text-neutral-300 hover:text-amber-300 hover:border-amber-500/40 cursor-pointer transition-colors"
                      >
                        <SmilePlus className="w-3.5 h-3.5" />
                      </button>

                      {isPickerOpen && (
                        <div className="absolute left-0 bottom-full mb-2 z-30 w-60 p-2 rounded-2xl bg-neutral-950 border border-neutral-700 shadow-2xl grid grid-cols-6 gap-1">
                          {WHATSAPP_EMOJIS.map((emoji) => (
                            <button
                              key={emoji}
                              type="button"
                              onClick={() => handleEmojiPick(item, emoji)}
                              className="h-8 rounded-lg hover:bg-neutral-800 flex items-center justify-center text-base cursor-pointer transition-transform hover:scale-110"
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Comments toggle button */}
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedComments((prev) => ({ ...prev, [itemKey]: !commentsOpen }))
                    }
                    className="ml-auto inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-bold bg-neutral-800/60 hover:bg-neutral-800 border border-neutral-700/60 text-neutral-300 cursor-pointer"
                  >
                    <MessageCircle className="w-3.5 h-3.5 text-sky-400" />
                    <span>{item.comments.length > 0 ? `${item.comments.length} Yorum` : 'Yorum Yaz'}</span>
                  </button>
                </div>

                {/* WhatsApp-style Comments List + Inline Reply */}
                {(commentsOpen || item.comments.length > 0) && (
                  <div className="mt-3 pt-2.5 border-t border-neutral-800/60 space-y-2">
                    {commentsOpen && item.comments.length > 0 && (
                      <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                        {item.comments.map((comment) => {
                          const isCommentAuthor = Boolean(
                            currentPlayer &&
                              ((comment.authorPlayerId && comment.authorPlayerId === currentPlayer.id) ||
                                (!comment.authorPlayerId && comment.authorName === currentPlayer.name))
                          );
                          const cCreatedMs = new Date(comment.createdAt).getTime();
                          const cElapsedMs = Number.isFinite(cCreatedMs)
                            ? Math.max(0, nowMs - cCreatedMs)
                            : Infinity;
                          const cEditRemainingMs = LOCKER_EDIT_WINDOW_MS - cElapsedMs;
                          const cEditRemainingMins = Math.max(1, Math.ceil(cEditRemainingMs / 60000));
                          const canEditThisComment = Boolean(
                            !isReadOnly &&
                              currentPlayer &&
                              !comment.isDeleted &&
                              isCommentAuthor &&
                              cEditRemainingMs > 0 &&
                              onEditComment
                          );
                          const canDeleteThisComment = Boolean(
                            !isReadOnly &&
                              currentPlayer &&
                              !comment.isDeleted &&
                              onDeleteComment &&
                              ((isCommentAuthor && cElapsedMs <= LOCKER_DELETE_WINDOW_MS) || canPinHeadline)
                          );

                          if (comment.isDeleted) {
                            return (
                              <div
                                key={comment.id}
                                className="flex items-center justify-between gap-2 bg-neutral-950/50 border border-neutral-800/60 rounded-xl px-3 py-1.5 text-[11px] text-neutral-500 italic"
                              >
                                <span>
                                  🚫{' '}
                                  {comment.deletedBy === 'committee'
                                    ? 'Bu yorum yönetici tarafından kaldırıldı'
                                    : 'Bu yorum silindi'}
                                </span>
                                {!isReadOnly && canPinHeadline && onDeleteComment && (
                                  <button
                                    type="button"
                                    onClick={() => onDeleteComment(item.id, item.source, comment.id, true)}
                                    className="text-neutral-500 hover:text-rose-400 p-0.5 cursor-pointer"
                                    title="Yorum izini kaldır"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                            );
                          }

                          return (
                            <div
                              key={comment.id}
                              className="flex items-start gap-2 bg-neutral-950/80 border border-neutral-800/80 rounded-2xl px-3 py-2"
                            >
                              <img
                                src={resolvePlayerPhoto(
                                  comment.authorPlayerId,
                                  comment.authorName,
                                  comment.authorPhoto
                                )}
                                alt={comment.authorName}
                                className="w-6 h-6 rounded-full object-cover object-top bg-neutral-800 border border-white/15 shrink-0 mt-0.5"
                              />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-[11px] font-black text-amber-300 truncate">
                                    {comment.authorName}
                                  </span>
                                  <div className="flex items-center gap-1.5 shrink-0">
                                    {comment.editedAt && (
                                      <span className="text-[9px] text-neutral-400 italic">düzenlendi</span>
                                    )}
                                    <span className="text-[9px] text-neutral-500 font-mono">
                                      {new Date(comment.createdAt).toLocaleTimeString('tr-TR', {
                                        hour: '2-digit',
                                        minute: '2-digit',
                                      })}
                                    </span>
                                    {canEditThisComment && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setConfirmDeleteCommentId(null);
                                          setEditingCommentId(editingCommentId === comment.id ? null : comment.id);
                                          setEditCommentText(comment.text);
                                        }}
                                        title={`Yorumu düzenle (${cEditRemainingMins} dk)`}
                                        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-sky-500/15 border border-sky-500/40 text-sky-300 hover:bg-sky-500/25 text-[10px] font-bold cursor-pointer"
                                      >
                                        <Pencil className="w-2.5 h-2.5" />
                                        <span>Düzenle</span>
                                      </button>
                                    )}
                                    {canDeleteThisComment && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setEditingCommentId(null);
                                          setConfirmDeleteCommentId(
                                            confirmDeleteCommentId === comment.id ? null : comment.id
                                          );
                                        }}
                                        title="Yorumu sil"
                                        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-rose-500/15 border border-rose-500/40 text-rose-300 hover:bg-rose-500/25 text-[10px] font-bold cursor-pointer"
                                      >
                                        <Trash2 className="w-2.5 h-2.5" />
                                        <span>Sil</span>
                                      </button>
                                    )}
                                  </div>
                                </div>

                                {confirmDeleteCommentId === comment.id && (
                                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[10px] bg-rose-950/30 border border-rose-500/30 rounded-lg px-2 py-1">
                                    <span className="text-rose-200 font-bold">Herkesten silinsin mi?</span>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        onDeleteComment?.(item.id, item.source, comment.id, false);
                                        setConfirmDeleteCommentId(null);
                                      }}
                                      className="px-2 py-0.5 rounded bg-rose-600 hover:bg-rose-500 text-white font-bold cursor-pointer"
                                    >
                                      Sil
                                    </button>
                                    {canPinHeadline && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          onDeleteComment?.(item.id, item.source, comment.id, true);
                                          setConfirmDeleteCommentId(null);
                                        }}
                                        className="px-2 py-0.5 rounded bg-neutral-800 hover:bg-rose-900 text-rose-200 font-bold cursor-pointer"
                                      >
                                        Tamamen Kaldır
                                      </button>
                                    )}
                                    <button
                                      type="button"
                                      onClick={() => setConfirmDeleteCommentId(null)}
                                      className="px-1.5 py-0.5 text-neutral-400 hover:text-white cursor-pointer"
                                    >
                                      Vazgeç
                                    </button>
                                  </div>
                                )}

                                {editingCommentId === comment.id ? (
                                  <div className="mt-1.5 flex items-center gap-1.5">
                                    <input
                                      type="text"
                                      value={editCommentText}
                                      onChange={(e) => setEditCommentText(e.target.value)}
                                      className="flex-1 bg-neutral-900 border border-sky-500/50 rounded-lg px-2 py-1 text-xs text-white focus:outline-none"
                                    />
                                    <button
                                      type="button"
                                      disabled={!editCommentText.trim()}
                                      onClick={() => {
                                        onEditComment?.(item.id, item.source, comment.id, editCommentText);
                                        setEditingCommentId(null);
                                      }}
                                      className="px-2 py-1 rounded-lg bg-sky-500 hover:bg-sky-400 disabled:opacity-40 text-black text-[10px] font-black cursor-pointer"
                                    >
                                      Kaydet
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setEditingCommentId(null)}
                                      className="px-2 py-1 rounded-lg bg-neutral-800 text-neutral-300 text-[10px] font-bold cursor-pointer"
                                    >
                                      İptal
                                    </button>
                                  </div>
                                ) : (
                                  <p className="text-xs text-neutral-200 leading-snug mt-0.5 break-words">
                                    {comment.text}
                                  </p>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {commentsOpen && !isReadOnly && currentPlayer && onAddComment && (
                      <form
                        onSubmit={(e) => handleCommentSubmit(e, item)}
                        className="flex items-center gap-2 pt-1"
                      >
                        <img
                          src={liveCurrentPlayerPhoto}
                          alt={currentPlayer.name}
                          className="w-6 h-6 rounded-full object-cover object-top shrink-0 border border-white/15"
                        />
                        <input
                          type="text"
                          value={draft}
                          onChange={(e) =>
                            setCommentDrafts((prev) => ({ ...prev, [itemKey]: e.target.value }))
                          }
                          placeholder="Yorum ekle..."
                          className="flex-1 bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-1.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-amber-400"
                        />
                        <button
                          type="submit"
                          disabled={!draft.trim()}
                          className="p-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-black cursor-pointer"
                          title="Yorum Gönder"
                        >
                          <Send className="w-3.5 h-3.5" />
                        </button>
                      </form>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Image Lightbox Modal */}
      {lightboxItem && lightboxItem.imageUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-3"
          onClick={() => setLightboxItem(null)}
        >
          <div
            className="max-w-3xl w-full bg-neutral-950 border border-neutral-800 rounded-3xl overflow-hidden shadow-2xl max-h-[90dvh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-800">
              <div className="min-w-0">
                <p className="text-xs font-black text-white truncate">{lightboxItem.authorName}</p>
                {lightboxItem.matchTitle && (
                  <p className="text-[10px] text-amber-400 truncate">{lightboxItem.matchTitle}</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setLightboxItem(null)}
                className="p-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 min-h-0 flex items-center justify-center p-2 bg-black">
              <img
                src={getSafeImageUrl(lightboxItem.imageUrl)}
                alt={lightboxItem.text}
                className="max-h-[75dvh] max-w-full object-contain rounded-xl"
                onError={(e) => {
                  const t = e.currentTarget;
                  if (t.src.endsWith('.webp')) t.src = t.src.replace(/\.webp$/, '.jpg');
                }}
              />
            </div>
            {lightboxItem.text && (
              <div className="px-4 py-3 border-t border-neutral-800 text-xs text-neutral-200">
                {lightboxItem.text}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
