import React, { useState } from 'react';
import { Player, Match, MatchRatingVote, MatchAwards } from '../../types';
import { Star, ShieldAlert, Award, MessageSquare, Send, ThumbsDown, Trophy } from 'lucide-react';
import confetti from 'canvas-confetti';

interface Props {
  match: Match;
  currentRaterPlayer: Player;
  players: Player[];
  onSaveRatings: (votes: MatchRatingVote[], awards: MatchAwards) => void;
  onClose: () => void;
}

export const MatchRatingModal: React.FC<Props> = ({
  match,
  currentRaterPlayer,
  players,
  onSaveRatings,
  onClose,
}) => {
  // Collect all 12 players in this match
  const matchPlayerIds = match.starters;
  const matchPlayers = players.filter((p) => matchPlayerIds.includes(p.id));

  // Determine which team the rater belongs to
  const teamAPlayerIds = new Set(match.teamA?.players.map((x) => x.player.id) || []);
  const isRaterInTeamA = teamAPlayerIds.has(currentRaterPlayer.id);

  // Ratings state map: { [targetPlayerId]: { score: number, comment: string, isAnonymous: boolean } }
  const [ratings, setRatings] = useState<
    Record<string, { score: number; comment: string; isAnonymous: boolean }>
  >(() => {
    const init: Record<string, { score: number; comment: string; isAnonymous: boolean }> = {};
    for (const p of matchPlayers) {
      init[p.id] = { score: p.id === currentRaterPlayer.id ? 7.5 : 7.0, comment: '', isAnonymous: false };
    }
    return init;
  });

  const [awards, setAwards] = useState<MatchAwards>({
    mvpId: matchPlayers[0]?.id,
    wallId: matchPlayers.find((p) => p.position === 'DEF' || p.position === 'GK')?.id || matchPlayers[1]?.id,
    bidonId: matchPlayers[matchPlayers.length - 1]?.id,
  });

  const handleScoreChange = (targetId: string, score: number) => {
    setRatings((prev) => ({
      ...prev,
      [targetId]: { ...prev[targetId], score },
    }));
  };

  const handleCommentChange = (targetId: string, comment: string) => {
    setRatings((prev) => ({
      ...prev,
      [targetId]: { ...prev[targetId], comment },
    }));
  };

  const toggleAnonymous = (targetId: string) => {
    setRatings((prev) => ({
      ...prev,
      [targetId]: { ...prev[targetId], isAnonymous: !prev[targetId].isAnonymous },
    }));
  };

  const handleSubmit = () => {
    const votes: MatchRatingVote[] = Object.entries(ratings).map(([targetId, data]) => ({
      raterPlayerId: currentRaterPlayer.id,
      targetPlayerId: targetId,
      score: data.score,
      comment: data.comment.trim() || undefined,
      isAnonymous: data.isAnonymous,
    }));

    // Trigger celebration confetti
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 },
    });

    onSaveRatings(votes, awards);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-neutral-900 border border-neutral-800 rounded-3xl max-w-3xl w-full p-6 text-white shadow-2xl relative my-8">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-neutral-800">
          <div>
            <h2 className="text-xl font-black text-amber-400 flex items-center gap-2">
              <Star className="w-5 h-5 fill-amber-400" /> Maç Sonu 360° Puanlama Karnesi
            </h2>
            <p className="text-xs text-neutral-400 mt-1">
              {match.title} • Oy Veren: <strong>{currentRaterPlayer.name}</strong> (#{currentRaterPlayer.number})
            </p>
          </div>
          <button onClick={onClose} className="text-neutral-400 hover:text-white text-sm">
            ✕ Kapat
          </button>
        </div>

        {/* Anti-Troll Math Notice */}
        <div className="my-4 p-3.5 bg-neutral-800/80 rounded-2xl border border-neutral-700/80 flex items-start gap-3">
          <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="text-xs space-y-1">
            <p className="font-bold text-neutral-200">Anti-Trol ve Trimmed Mean Algoritması Devrede:</p>
            <p className="text-neutral-400 leading-relaxed">
              Her oyuncuya verilen en yüksek ve en düşük 1 oy hesaplama dışı bırakılır. Ağırlık:%50 Rakip Takım, %40 Takım Arkadaşı, %10 Öz Puan. Puanlar EMA formülüyle genel kart reytingine (OVR) yansır.
            </p>
          </div>
        </div>

        {/* Player Rating Cards List */}
        <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-2">
          {matchPlayers.map((player) => {
            const isSelf = player.id === currentRaterPlayer.id;
            const isTeammate = teamAPlayerIds.has(player.id) === isRaterInTeamA;
            const voteData = ratings[player.id];

            return (
              <div
                key={player.id}
                className={`p-4 rounded-2xl border transition-all ${
                  isSelf
                    ? 'border-amber-500/50 bg-amber-950/20'
                    : isTeammate
                    ? 'border-neutral-700/80 bg-neutral-800/40'
                    : 'border-blue-900/40 bg-blue-950/20'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <img
                      src={player.photoUrl}
                      alt={player.name}
                      className="w-10 h-10 rounded-full object-cover border border-white/20"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-black text-sm text-white">{player.name}</span>
                        <span className="text-[11px] font-mono text-amber-300">OVR {player.currentOVR}</span>
                      </div>
                      <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-black/40 text-neutral-400">
                        {isSelf ? '⭐ Kendin (Öz Değerlendirme)' : isTeammate ? '🟢 Takım Arkadaşın' : '🔴 Rakip Oyuncu'}
                      </span>
                    </div>
                  </div>

                  {/* Rating Slider Value */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-neutral-400">Puan:</span>
                    <span className="font-mono text-lg font-black text-amber-400 bg-neutral-900 px-3 py-1 rounded-xl border border-neutral-700">
                      {voteData.score.toFixed(1)}
                    </span>
                  </div>
                </div>

                {/* Slider */}
                <div className="flex items-center gap-3">
                  <span className="text-[10px] text-neutral-400 font-bold">1</span>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    step="0.5"
                    value={voteData.score}
                    onChange={(e) => handleScoreChange(player.id, parseFloat(e.target.value))}
                    className="flex-1 accent-amber-500 h-2 bg-neutral-700 rounded-lg cursor-pointer"
                  />
                  <span className="text-[10px] text-neutral-400 font-bold">10</span>
                </div>

                {/* Comment & Anonymous Whisper Toggle */}
                {!isSelf && (
                  <div className="mt-3 flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Kısa maç performansı yorumu veya şaka..."
                      value={voteData.comment}
                      onChange={(e) => handleCommentChange(player.id, e.target.value)}
                      className="flex-1 bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-amber-400"
                    />
                    <button
                      type="button"
                      onClick={() => toggleAnonymous(player.id)}
                      className={`text-[10px] px-2.5 py-1.5 rounded-lg border font-semibold transition-all ${
                        voteData.isAnonymous
                          ? 'bg-purple-900/60 border-purple-500 text-purple-200'
                          : 'bg-neutral-800 border-neutral-700 text-neutral-400 hover:text-white'
                      }`}
                      title="Yorumunuzu anonim fısıltı olarak gönderin"
                    >
                      {voteData.isAnonymous ? '🕵️ Anonim Fısıltı' : 'Açık İsim'}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Post-Match Podium Awards (MVP, Wall, Günün Bidonu) */}
        <div className="mt-6 pt-4 border-t border-neutral-800">
          <h3 className="text-sm font-black text-amber-300 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-400" /> Maç Sonu 3'lü Ödül Kürsüsü
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* MVP */}
            <div className="bg-neutral-800/80 p-3 rounded-xl border border-amber-500/40">
              <label className="text-xs font-bold text-amber-300 block mb-1">
                🏆 MVP (Haftanın TOTW Siyah Kartı)
              </label>
              <select
                value={awards.mvpId}
                onChange={(e) => setAwards({ ...awards, mvpId: e.target.value })}
                className="w-full bg-neutral-900 border border-neutral-700 rounded-lg p-2 text-xs text-white"
              >
                {matchPlayers.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} (#{p.number})
                  </option>
                ))}
              </select>
            </div>

            {/* Wall */}
            <div className="bg-neutral-800/80 p-3 rounded-xl border border-blue-500/40">
              <label className="text-xs font-bold text-blue-300 block mb-1">
                🧱 Etten Duvar (En İyi Savunma/GK)
              </label>
              <select
                value={awards.wallId}
                onChange={(e) => setAwards({ ...awards, wallId: e.target.value })}
                className="w-full bg-neutral-900 border border-neutral-700 rounded-lg p-2 text-xs text-white"
              >
                {matchPlayers.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} (#{p.number})
                  </option>
                ))}
              </select>
            </div>

            {/* Günün Bidonu */}
            <div className="bg-neutral-800/80 p-3 rounded-xl border border-rose-500/40">
              <label className="text-xs font-bold text-rose-300 block mb-1">
                🪵 Günün Bidonu (Esprili)
              </label>
              <select
                value={awards.bidonId}
                onChange={(e) => setAwards({ ...awards, bidonId: e.target.value })}
                className="w-full bg-neutral-900 border border-neutral-700 rounded-lg p-2 text-xs text-white"
              >
                {matchPlayers.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} (#{p.number})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end gap-3 mt-6 pt-3 border-t border-neutral-800">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-bold"
          >
            Vazgeç
          </button>
          <button
            onClick={handleSubmit}
            className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-black flex items-center gap-2 shadow-xl shadow-amber-500/30"
          >
            <Send className="w-4 h-4" /> Puanları Gönder & Kartları Güncelle
          </button>
        </div>
      </div>
    </div>
  );
};
