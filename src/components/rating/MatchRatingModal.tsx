import React, { useState, useRef } from 'react';
import { Player, Match, MatchRatingVote, MatchAwards, MatchBallot, isClubLegendPlayer } from '../../types';
import { VERBAL_RATING_OPTIONS, snapScoreToVerbalLevel } from '../../services/ratingEngine';
import { Star, ShieldAlert, Send, Trophy, Clock, MessageSquare } from 'lucide-react';
import confetti from 'canvas-confetti';

interface Props {
  match: Match;
  currentRaterPlayer: Player;
  players: Player[];
  isCommittee?: boolean;
  onSaveRatings: (votes: MatchRatingVote[], awards: MatchAwards, ballot?: MatchBallot) => void;
  onClose: () => void;
}

export const MatchRatingModal: React.FC<Props> = ({
  match,
  currentRaterPlayer,
  players,
  isCommittee = false,
  onSaveRatings,
  onClose,
}) => {
  const matchPlayerIds = match.starters;
  const matchPlayers = players.filter((p) => matchPlayerIds.includes(p.id));

  const teamAPlayerIds = new Set(match.teamA?.players.map((x) => x.player.id) || []);
  const isRaterInTeamA = teamAPlayerIds.has(currentRaterPlayer.id);

  const candidatePlayers = matchPlayers.filter((p) => p.id !== currentRaterPlayer.id);

  const orderedPlayers = [
    ...matchPlayers.filter((p) => p.id !== currentRaterPlayer.id),
    ...matchPlayers.filter((p) => p.id === currentRaterPlayer.id),
  ];

  // Kullanıcının manuel olarak seçtiği oyuncuları takip et (ödül dropdown'ı manuel seçimi ezmesin)
  const touchedPlayersRef = useRef<Set<string>>(new Set());
  const [openComments, setOpenComments] = useState<Record<string, boolean>>({});

  // Herkes (Kurul dahil) aynı 5 sözel durum üzerinden oylama yapar; varsayılan 7.0 ("Standarttı")
  const [ratings, setRatings] = useState<
    Record<string, { score: 9 | 8 | 7 | 6 | 5; comment: string; isAnonymous: boolean }>
  >(() => {
    const existingForRater = new Map(
      (match.ratings || [])
        .filter((r) => r.raterPlayerId === currentRaterPlayer.id)
        .map((r) => [r.targetPlayerId, r])
    );

    const init: Record<string, { score: 9 | 8 | 7 | 6 | 5; comment: string; isAnonymous: boolean }> = {};
    for (const p of matchPlayers) {
      const prev = existingForRater.get(p.id);
      if (prev) {
        init[p.id] = {
          score: snapScoreToVerbalLevel(prev.score),
          comment: prev.comment || '',
          isAnonymous: Boolean(prev.isAnonymous),
        };
      } else {
        init[p.id] = { score: 7, comment: '', isAnonymous: false };
      }
    }
    return init;
  });

  const existingBallot = (match.ballots || []).find((b) => b.raterId === currentRaterPlayer.id);

  const [awards, setAwards] = useState<MatchAwards>(() => ({
    mvpId: existingBallot?.mvpId || candidatePlayers[0]?.id || matchPlayers[0]?.id,
    wallId:
      existingBallot?.wallId ||
      candidatePlayers.find((p) => p.position === 'DEF' || p.position === 'GK')?.id ||
      candidatePlayers[1]?.id ||
      matchPlayers[0]?.id,
    bidonId: existingBallot?.bidonId,
  }));

  const handleScoreChange = (targetId: string, score: 9 | 8 | 7 | 6 | 5, markTouched = true) => {
    if (markTouched) {
      touchedPlayersRef.current.add(targetId);
    }
    setRatings((prev) => ({
      ...prev,
      [targetId]: { ...prev[targetId], score },
    }));
  };

  const handlePodiumAwardChange = (role: 'mvpId' | 'wallId' | 'bidonId', targetId: string | undefined) => {
    setAwards((prev) => {
      const next = { ...prev, [role]: targetId };
      if (role === 'mvpId' && prev.bidonId === targetId) {
        next.bidonId = undefined;
      }
      return next;
    });

    // Kullanıcı o oyuncuya henüz manuel bir durum seçmediyse kürsü seçimine göre öneri işaretle
    if (targetId && !touchedPlayersRef.current.has(targetId)) {
      const suggestedLevel: 9 | 8 | 5 = role === 'mvpId' ? 9 : role === 'wallId' ? 8 : 5;
      handleScoreChange(targetId, suggestedLevel, false);
    }
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

    const ballot: MatchBallot = {
      raterId: currentRaterPlayer.id,
      mvpId: awards.mvpId,
      wallId: awards.wallId,
      bidonId: awards.bidonId || undefined,
      submittedAt: new Date().toISOString(),
    };

    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 },
    });

    onSaveRatings(votes, awards, ballot);
    onClose();
  };

  const deadlineDate = new Date(match.date);
  deadlineDate.setDate(deadlineDate.getDate() + 1);
  deadlineDate.setHours(14, 0, 0, 0);

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-2.5 sm:p-4 overflow-y-auto">
      <div className="bg-neutral-900 border border-neutral-800 rounded-3xl max-w-3xl w-full max-h-[calc(100dvh-1.25rem)] sm:max-h-[88dvh] flex flex-col p-4 sm:p-5 text-white shadow-2xl relative overflow-hidden">
        {/* Header */}
        <div className="shrink-0 flex items-start justify-between gap-3 pb-3 border-b border-neutral-800">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base sm:text-xl font-black text-amber-400 flex items-center gap-2">
                <Star className="w-5 h-5 fill-amber-400 shrink-0" /> Maç Sonu 360° Form Anketi
              </h2>
              <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/35">
                Puansız • Beklentiye Göre Değerlendirme
              </span>
              {isCommittee && (
                <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  ⚖️ 2x Kurul Oyu
                </span>
              )}
            </div>
            <p className="text-xs text-neutral-400 mt-1">
              {match.title} • Oy Veren: <strong>{currentRaterPlayer.name}</strong> (#{currentRaterPlayer.number})
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-neutral-400 hover:text-white bg-neutral-800 hover:bg-neutral-700 px-2.5 py-1 rounded-lg text-xs font-bold shrink-0 cursor-pointer"
          >
            ✕ Kapat
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain pr-1 py-3 space-y-3.5">
          {/* Next-day 14:00 Voting Window + Algorithm Notice */}
          <div className="space-y-2">
            <div className="p-3 bg-sky-950/40 rounded-2xl border border-sky-500/30 flex items-start gap-2.5 text-xs">
              <Clock className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
              <p className="text-sky-100 leading-relaxed">
                <strong>Oylama Penceresi (Ertesi Gün 14:00):</strong> Oylar{' '}
                <strong>
                  {deadlineDate.toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long' })} saat 14:00
                </strong>
                &apos;a kadar toplanır. Süre dolduğunda katılmayanlar beklenmeden mevcut oylar ve Kurul Mührü ile haftalık kartlar kesinleştirilir.
              </p>
            </div>

            <div className="p-3 bg-neutral-800/70 rounded-2xl border border-neutral-700/80 flex items-start gap-2.5 text-xs">
              <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <p className="text-neutral-300 leading-relaxed">
                <strong className="text-amber-300">Nasıl İşler?</strong> Sayısal puan hesabı yok: arkadaşını{' '}
                <strong className="text-white">kendi standart oyununa göre</strong> değerlendir.{' '}
                <strong className="text-amber-200">👌 Standarttı</strong> seçimi kartı yerinde tutar;{' '}
                <strong className="text-emerald-300">👍 İyiydi / 🔥 Harikaydı</strong> yükseltir,{' '}
                <strong className="text-rose-300">😐 Durgun / 📉 Formsuzdu</strong> düşürür. Kurul oyları 2x ağırlık taşır ve uç 1&apos;er oy kırpılır.
              </p>
            </div>
          </div>

          {/* Post-Match Podium Awards */}
          <div className="p-4 rounded-2xl bg-neutral-950/70 border border-amber-500/25">
            <h3 className="text-xs sm:text-sm font-black text-amber-300 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-400" />
              1. Adım: Gecenin Ödüllerini Seç
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* MVP */}
              <div className="bg-neutral-900 p-3 rounded-xl border border-amber-500/40">
                <label className="text-xs font-bold text-amber-300 block mb-1">
                  🏆 Haftanın MVP&apos;si
                </label>
                <select
                  value={awards.mvpId}
                  onChange={(e) => handlePodiumAwardChange('mvpId', e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-700 rounded-lg p-2 text-xs text-white cursor-pointer"
                >
                  {candidatePlayers.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} (#{p.number})
                    </option>
                  ))}
                </select>
              </div>

              {/* Wall */}
              <div className="bg-neutral-900 p-3 rounded-xl border border-blue-500/40">
                <label className="text-xs font-bold text-blue-300 block mb-1">
                  🧱 Etten Duvar (Savunma/GK)
                </label>
                <select
                  value={awards.wallId}
                  onChange={(e) => handlePodiumAwardChange('wallId', e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-700 rounded-lg p-2 text-xs text-white cursor-pointer"
                >
                  {candidatePlayers.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} (#{p.number})
                    </option>
                  ))}
                </select>
              </div>

              {/* Haftanın Bidonu */}
              <div className="bg-neutral-900 p-3 rounded-xl border border-rose-500/40">
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-rose-300 block">
                    🪵 Haftanın Bidonu
                  </label>
                  <span className="text-[10px] text-neutral-400">Opsiyonel</span>
                </div>
                <select
                  value={awards.bidonId || ''}
                  onChange={(e) => handlePodiumAwardChange('bidonId', e.target.value || undefined)}
                  className="w-full bg-neutral-950 border border-neutral-700 rounded-lg p-2 text-xs text-white cursor-pointer"
                >
                  <option value="">-- Pas Geç (Herkes İyiydi) --</option>
                  {candidatePlayers
                    .filter((p) => p.id !== awards.mvpId && !isClubLegendPlayer(p))
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} (#{p.number})
                      </option>
                    ))}
                </select>
              </div>
            </div>
          </div>

          {/* Unified Scoreless 5-State Verbal Assessment */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-neutral-300 px-1">
              <span className="font-bold">
                2. Adım: Sahadaki Formunu İşaretle (Varsayılan: 👌 Standarttı)
              </span>
              <span className="text-[11px] text-emerald-400 font-semibold">
                Sadece öne çıkanlara veya formsuzlara dokunman yeterli
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {orderedPlayers.map((player) => {
                const isSelf = player.id === currentRaterPlayer.id;
                const isTeammate = teamAPlayerIds.has(player.id) === isRaterInTeamA;
                const voteData = ratings[player.id];
                const isMvpPick = awards.mvpId === player.id;
                const isWallPick = awards.wallId === player.id;
                const isBidonPick = awards.bidonId === player.id;
                const activeOption =
                  VERBAL_RATING_OPTIONS.find((o) => o.score10 === voteData.score) ||
                  VERBAL_RATING_OPTIONS[2];
                const isCommentOpen = Boolean(openComments[player.id] || voteData.comment);

                return (
                  <div
                    key={player.id}
                    className={`p-3 rounded-2xl border flex flex-col gap-2.5 ${
                      isSelf
                        ? 'border-amber-500/50 bg-amber-950/20'
                        : isMvpPick
                        ? 'border-amber-400/60 bg-amber-950/15'
                        : isTeammate
                        ? 'border-neutral-800 bg-neutral-800/40'
                        : 'border-blue-900/40 bg-blue-950/20'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <img
                          src={player.photoUrl}
                          alt={player.name}
                          className="w-8 h-8 rounded-full object-cover border border-white/20 shrink-0"
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-xs text-white truncate">{player.name}</span>
                            {isMvpPick && <span className="text-[10px]">🏆</span>}
                            {isWallPick && <span className="text-[10px]">🧱</span>}
                            {isBidonPick && <span className="text-[10px]">🪵</span>}
                          </div>
                          <span className="text-[10px] text-neutral-400 block">
                            {isSelf ? '⭐ Öz Değerlendirmen' : isTeammate ? '🟢 Takım Arkadaşı' : '🔴 Rakip'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <span
                          className={`text-[10px] font-black px-2 py-0.5 rounded-lg border ${activeOption.badgeClass}`}
                        >
                          {activeOption.emoji} {activeOption.label}
                        </span>
                        {!isSelf && (
                          <button
                            type="button"
                            onClick={() =>
                              setOpenComments((prev) => ({
                                ...prev,
                                [player.id]: !prev[player.id],
                              }))
                            }
                            title="Yorum ekle"
                            className={`p-1 rounded-lg border text-neutral-400 hover:text-white cursor-pointer ${
                              isCommentOpen
                                ? 'bg-neutral-800 border-amber-500/50 text-amber-300'
                                : 'bg-neutral-900 border-neutral-800'
                            }`}
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-5 gap-1">
                      {VERBAL_RATING_OPTIONS.map((opt) => {
                        const active = voteData.score === opt.score10;
                        return (
                          <button
                            key={opt.score10}
                            type="button"
                            onClick={() => handleScoreChange(player.id, opt.score10)}
                            title={`${opt.label} (${opt.shortDesc})`}
                            className={`py-1.5 px-1 rounded-lg border text-[10px] font-bold transition-all cursor-pointer flex flex-col items-center justify-center gap-0.5 leading-tight ${
                              active
                                ? `${opt.activeClass} font-black`
                                : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white'
                            }`}
                          >
                            <span className="text-xs leading-none">{opt.emoji}</span>
                            <span className="truncate max-w-full">{opt.label}</span>
                          </button>
                        );
                      })}
                    </div>

                    {!isSelf && isCommentOpen && (
                      <div className="flex items-center gap-1.5 pt-0.5">
                        <input
                          type="text"
                          placeholder="Kısa maç yorumu veya takılma..."
                          value={voteData.comment}
                          onChange={(e) => handleCommentChange(player.id, e.target.value)}
                          className="flex-1 min-w-0 bg-neutral-900 border border-neutral-700 rounded-lg px-2.5 py-1 text-[11px] text-white placeholder-neutral-500 focus:outline-none focus:border-amber-400"
                        />
                        <button
                          type="button"
                          onClick={() => toggleAnonymous(player.id)}
                          className={`text-[10px] px-2 py-1 rounded-lg border font-semibold transition-all cursor-pointer shrink-0 ${
                            voteData.isAnonymous
                              ? 'bg-purple-900/60 border-purple-500 text-purple-200'
                              : 'bg-neutral-800 border-neutral-700 text-neutral-400 hover:text-white'
                          }`}
                          title="Yorumunuzu anonim fısıltı olarak gönderin"
                        >
                          {voteData.isAnonymous ? '🕵️ Anonim' : 'Açık'}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="shrink-0 flex justify-end gap-3 mt-2 pt-3 border-t border-neutral-800">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-bold cursor-pointer"
          >
            Vazgeç
          </button>
          <button
            onClick={handleSubmit}
            className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-black flex items-center gap-2 shadow-xl shadow-amber-500/30 cursor-pointer"
          >
            <Send className="w-4 h-4" /> Oylamayı Gönder &amp; Kaydet
          </button>
        </div>
      </div>
    </div>
  );
};
