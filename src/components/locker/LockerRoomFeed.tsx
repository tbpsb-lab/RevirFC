import React, { useState } from 'react';
import { LockerPost, Player } from '../../types';
import { Flame, Laugh, Siren, HelpCircle, Send, MessageCircle, Pin, Sparkles, Lock } from 'lucide-react';

interface Props {
  posts: LockerPost[];
  currentPlayer?: Player;
  onAddPost: (text: string, isAnonymous: boolean) => void;
  onReact: (postId: string, reactionType: keyof LockerPost['reactions']) => void;
  isReadOnly?: boolean;
}

export const LockerRoomFeed: React.FC<Props> = ({
  posts,
  currentPlayer,
  onAddPost,
  onReact,
  isReadOnly = false,
}) => {
  const [newText, setNewText] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newText.trim()) return;
    onAddPost(newText.trim(), isAnonymous);
    setNewText('');
  };

  // Find headline: either explicitly flagged or post with max total reactions
  const headlinePost = posts.find((p) => p.isHeadline) || [...posts].sort((a, b) => {
    const totalA = Object.values(a.reactions).reduce((acc, arr) => acc + arr.length, 0);
    const totalB = Object.values(b.reactions).reduce((acc, arr) => acc + arr.length, 0);
    return totalB - totalA;
  })[0];

  const reactionButtons: {
    key: keyof LockerPost['reactions'];
    emoji: string;
    label: string;
  }[] = [
    { key: 'fire', emoji: '🔥', label: 'Alev' },
    { key: 'laugh', emoji: '😂', label: 'Kahkaha' },
    { key: 'violin', emoji: '🎻', label: 'Bahane' },
    { key: 'revir', emoji: '🚑', label: 'Revirlik' },
    { key: 'goat', emoji: '🐐', label: 'GOAT' },
  ];

  return (
    <div className="space-y-6">
      {/* Pinned Headline: Haftanın Manşeti */}
      {headlinePost && (
        <div className="relative overflow-hidden bg-gradient-to-r from-amber-500/20 via-neutral-900 to-amber-900/30 border-2 border-amber-500/50 rounded-3xl p-5 shadow-2xl">
          <div className="flex items-center gap-2 text-amber-400 text-xs font-black uppercase tracking-wider mb-2">
            <Pin className="w-4 h-4 fill-amber-400" /> Haftanın Soyunma Odası Manşeti
          </div>
          <p className="text-base md:text-lg font-bold text-white italic drop-shadow leading-relaxed">
            "{headlinePost.text}"
          </p>
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-amber-500/20 text-xs text-neutral-400">
            <span className="font-semibold text-amber-300">
              — {headlinePost.isAnonymous ? 'Anonim Soyunma Odası Fısıltısı 🕵️' : headlinePost.authorName}
            </span>
            <div className="flex items-center gap-2">
              <span className="text-[11px] bg-black/40 px-2 py-0.5 rounded border border-amber-500/30 text-amber-300 font-mono">
                {Object.values(headlinePost.reactions).reduce((acc, arr) => acc + arr.length, 0)} Halı Saha Tepkisi
              </span>
            </div>
          </div>
        </div>
      )}

      {/* New Post Box */}
      {isReadOnly || !currentPlayer ? (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 text-xs text-amber-300 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Lock className="w-4 h-4 text-amber-400 shrink-0" />
            <span>Paylaşım yapabilmek için üyeliğinizin onaylanması gerekmektedir. Paylaşılan gönderileri aşağıdan okuyabilirsiniz.</span>
          </div>
          <span className="text-[10px] bg-amber-500/20 text-amber-200 px-2.5 py-0.5 rounded-full font-bold shrink-0">Seyirci Modu</span>
        </div>
      ) : (
        <form
          onSubmit={handleSubmit}
          className="bg-neutral-900/90 border border-neutral-800 rounded-2xl p-4 shadow-xl"
        >
          <div className="flex items-center gap-3 mb-3">
            <img
              src={currentPlayer.photoUrl}
              alt={currentPlayer.name}
              className="w-9 h-9 rounded-full object-cover border border-white/20"
            />
            <span className="text-xs font-bold text-neutral-300">
              {isAnonymous ? 'Anonim Soyunma Odası Fısıltısı olarak yazıyorsunuz 🕵️' : `${currentPlayer.name} olarak konuş`}
            </span>
          </div>

          <textarea
            rows={3}
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
            placeholder="Maç taktiği, pas alamayan forvete sitem veya maç sonu muhabbeti..."
            className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-3 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-amber-400 resize-none"
          />

          <div className="flex items-center justify-between mt-3">
            <button
              type="button"
              onClick={() => setIsAnonymous(!isAnonymous)}
              className={`text-xs px-3 py-1.5 rounded-xl border font-bold transition-all ${
                isAnonymous
                  ? 'bg-purple-900/60 border-purple-500 text-purple-200 shadow-md shadow-purple-900/40'
                  : 'bg-neutral-800 border-neutral-700 text-neutral-400 hover:text-white'
              }`}
            >
              {isAnonymous ? '🕵️ Anonim Fısıltı Aktif' : '👤 Açık İsimle Paylaş'}
            </button>

            <button
              type="submit"
              disabled={!newText.trim()}
              className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-40 disabled:hover:bg-amber-500 text-black text-xs font-black flex items-center gap-2 shadow-lg shadow-amber-500/20"
            >
              <Send className="w-3.5 h-3.5" /> Odaya Gönder
            </button>
          </div>
        </form>
      )}

      {/* Post Timeline */}
      <div className="space-y-4">
        {posts.map((post) => (
          <div
            key={post.id}
            className={`p-4 rounded-2xl border transition-all ${
              post.isHeadline
                ? 'bg-neutral-900/90 border-amber-500/40'
                : 'bg-neutral-900/70 border-neutral-800 hover:border-neutral-700'
            }`}
          >
            {/* Author info */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2.5">
                {post.isAnonymous ? (
                  <div className="w-8 h-8 rounded-full bg-purple-900/80 border border-purple-500/40 flex items-center justify-center text-sm">
                    🕵️
                  </div>
                ) : (
                  <img
                    src={post.authorPhoto || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                    alt={post.authorName}
                    className="w-8 h-8 rounded-full object-cover border border-white/20"
                  />
                )}
                <div>
                  <span className="text-xs font-black text-white block">
                    {post.isAnonymous ? 'Anonim Soyunma Odası Fısıltısı' : post.authorName}
                  </span>
                  <span className="text-[10px] text-neutral-500">
                    {new Date(post.createdAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>

              {post.isHeadline && (
                <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/30">
                  ⭐ Manşet
                </span>
              )}
            </div>

            {/* Post text */}
            <p className="text-sm text-neutral-200 my-2 leading-relaxed font-normal">{post.text}</p>

            {/* Halı Saha Reactions */}
            <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-neutral-800/80 mt-3">
              {reactionButtons.map((btn) => {
                const count = post.reactions[btn.key]?.length || 0;
                const hasReacted = currentPlayer ? (post.reactions[btn.key]?.includes(currentPlayer.id) ?? false) : false;
                return (
                  <button
                    key={btn.key}
                    onClick={() => {
                      if (!isReadOnly && currentPlayer) {
                        onReact(post.id, btn.key);
                      }
                    }}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs border transition-all ${
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
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
