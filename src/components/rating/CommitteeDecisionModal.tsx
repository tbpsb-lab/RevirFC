import React, { useState } from 'react';
import { Player, Match, MatchAwards } from '../../types';
import { ShieldCheck, Trophy, Flame, Ban, Sparkles, CheckCircle2, AlertCircle, Coffee } from 'lucide-react';
import confetti from 'canvas-confetti';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  match: Match;
  players: Player[];
  onConfirmAwards: (awards: MatchAwards) => void;
}

export const CommitteeDecisionModal: React.FC<Props> = ({
  isOpen,
  onClose,
  match,
  players,
  onConfirmAwards,
}) => {
  if (!isOpen) return null;

  // Starters / candidates in this match
  const starterIds = match.starters && match.starters.length > 0 ? match.starters : players.map((p) => p.id);
  const candidatePlayers = players.filter((p) => starterIds.includes(p.id));

  // Tally votes from match.ballots
  const mvpTallies: Record<string, number> = {};
  const bidonTallies: Record<string, number> = { __none__: 0 };
  const wallTallies: Record<string, number> = {};
  const ballots = match.ballots || [];
  const totalBallots = ballots.length;

  ballots.forEach((b) => {
    if (b.mvpId) {
      mvpTallies[b.mvpId] = (mvpTallies[b.mvpId] || 0) + 1;
    }
    if (b.bidonId) {
      bidonTallies[b.bidonId] = (bidonTallies[b.bidonId] || 0) + 1;
    } else {
      bidonTallies.__none__ = (bidonTallies.__none__ || 0) + 1;
    }
    if (b.wallId) {
      wallTallies[b.wallId] = (wallTallies[b.wallId] || 0) + 1;
    }
  });

  const sortedMvpVotes = Object.entries(mvpTallies).sort((a, b) => b[1] - a[1]);
  const sortedBidonVotes = Object.entries(bidonTallies).sort((a, b) => b[1] - a[1]);

  const topMvpId = sortedMvpVotes[0]?.[0];
  const topBidonId = sortedBidonVotes[0]?.[0];

  // Initialize form state
  const [selectedMvpId, setSelectedMvpId] = useState<string>(() => {
    if (match.awards?.mvpId) return match.awards.mvpId;
    return topMvpId || candidatePlayers[0]?.id || '';
  });

  const [selectedBidonId, setSelectedBidonId] = useState<string>(() => {
    if (match.awards?.bidonId) return match.awards.bidonId;
    if (topBidonId === '__none__') return '';
    return topBidonId || '';
  });

  const [selectedWallId, setSelectedWallId] = useState<string>(() => {
    return match.awards?.wallId || candidatePlayers.find((p) => p.position === 'DEF' || p.position === 'GK')?.id || candidatePlayers[0]?.id || '';
  });

  // Ateş Ediyo! cards: strictly max 3 players!
  const [selectedInFormIds, setSelectedInFormIds] = useState<string[]>(() => {
    if (match.awards?.inFormIds && match.awards.inFormIds.length > 0) {
      return match.awards.inFormIds.slice(0, 3);
    }
    return players.filter((p) => p.theme === 'inform').map((p) => p.id).slice(0, 3);
  });

  const toggleInForm = (playerId: string) => {
    setSelectedInFormIds((prev) => {
      if (prev.includes(playerId)) {
        return prev.filter((id) => id !== playerId);
      }
      if (prev.length >= 3) {
        return prev; // Max 3 reached
      }
      return [...prev, playerId];
    });
  };

  const handleSealAwards = () => {
    confetti({
      particleCount: 120,
      spread: 90,
      origin: { y: 0.5 },
    });

    const finalAwards: MatchAwards = {
      mvpId: selectedMvpId || undefined,
      wallId: selectedWallId || undefined,
      bidonId: selectedBidonId || undefined,
      inFormIds: selectedInFormIds,
      isConfirmedByCommittee: true,
      confirmedAt: new Date().toISOString(),
      confirmedBy: 'Revir FC Kurul Mührü',
    };

    onConfirmAwards(finalAwards);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-neutral-900 border-2 border-amber-500/60 rounded-3xl max-w-3xl w-full p-6 text-white shadow-2xl relative my-8">
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-neutral-800">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-400/50 flex items-center justify-center text-amber-400 shadow-lg shadow-amber-500/20">
              <ShieldCheck className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black text-amber-400 tracking-tight">
                  🔏 Kurul Karar Masası & Son Mühür
                </h2>
                <span className="text-[10px] uppercase font-extrabold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  Veto & Onay Yetkisi
                </span>
              </div>
              <p className="text-xs text-neutral-400 mt-1">
                {match.title} • Toplam {totalBallots} oyuncu oy pusulası gönderdi. Kurul kararı kesindir ve kartları resmileştirir.
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-neutral-400 hover:text-white text-sm font-bold p-1">
            ✕ Kapat
          </button>
        </div>

        <div className="space-y-6 mt-6 max-h-[70vh] overflow-y-auto pr-1">
          {/* Ballot Box Summary (Sandık Sonuçları) */}
          <div className="bg-neutral-950/70 border border-neutral-800 rounded-2xl p-4">
            <h3 className="text-xs font-black text-neutral-300 uppercase tracking-wider flex items-center gap-1.5 mb-3">
              🗳️ Oylama Sandığı Özeti ({totalBallots} Oy)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              {/* MVP votes */}
              <div className="bg-neutral-900/90 rounded-xl p-3 border border-neutral-800">
                <span className="font-bold text-amber-400 block mb-2">⭐ MVP Sandık Sıralaması:</span>
                {sortedMvpVotes.length === 0 ? (
                  <p className="text-neutral-500 text-[11px]">Henüz oy girilmedi.</p>
                ) : (
                  <div className="space-y-1.5">
                    {sortedMvpVotes.slice(0, 3).map(([id, count], idx) => {
                      const p = players.find((x) => x.id === id);
                      return (
                        <div key={id} className="flex items-center justify-between text-[11px]">
                          <span className="text-neutral-300">
                            {idx + 1}. {p?.name || id}
                          </span>
                          <span className="font-mono font-bold text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded">
                            {count} oy
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Bidon votes */}
              <div className="bg-neutral-900/90 rounded-xl p-3 border border-neutral-800">
                <span className="font-bold text-rose-400 block mb-2">🪵 Bidon Sandık Sıralaması:</span>
                {sortedBidonVotes.length === 0 ? (
                  <p className="text-neutral-500 text-[11px]">Henüz oy girilmedi.</p>
                ) : (
                  <div className="space-y-1.5">
                    {sortedBidonVotes.slice(0, 3).map(([id, count]) => {
                      const isNone = id === '__none__';
                      const p = isNone ? null : players.find((x) => x.id === id);
                      return (
                        <div key={id} className="flex items-center justify-between text-[11px]">
                          <span className={isNone ? 'text-emerald-400 font-semibold' : 'text-neutral-300'}>
                            {isNone ? '🛡️ Bu Hafta Bidon Yok (Pas)' : p?.name || id}
                          </span>
                          <span className="font-mono font-bold text-rose-300 bg-rose-500/10 px-2 py-0.5 rounded">
                            {count} oy
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Kurul Awards Section */}
          <div className="space-y-5">
            {/* 1. MVP Selection */}
            <div className="bg-gradient-to-r from-neutral-900 to-amber-950/20 p-4 rounded-2xl border border-amber-500/50">
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-black text-amber-400 flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-amber-400" /> 🏆 Haftanın Resmi MVP'si (Tekil)
                </label>
                <span className="text-[10px] text-amber-300/80 font-mono">Siyah Kristal MVP Kartı</span>
              </div>
              <p className="text-[11px] text-neutral-400 mb-2">
                Sandıktan en çok oy alan aday önceliklidir. Kurul dilerse veto ederek haftanın gerçek yıldızını belirleyebilir.
              </p>
              <select
                value={selectedMvpId}
                onChange={(e) => {
                  const newMvpId = e.target.value;
                  setSelectedMvpId(newMvpId);
                  if (selectedBidonId === newMvpId) {
                    setSelectedBidonId('');
                  }
                }}
                className="w-full bg-neutral-950 border border-neutral-700 rounded-xl p-2.5 text-xs text-white font-bold cursor-pointer focus:border-amber-400 outline-none"
              >
                {candidatePlayers.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} (#{p.number}) • {p.currentOVR} OVR ({mvpTallies[p.id] || 0} oy aldı)
                  </option>
                ))}
              </select>
            </div>

            {/* 2. Haftanın Bidonu Selection (Termosla Çay Borçlusu ☕) */}
            <div className="bg-gradient-to-r from-neutral-900 to-rose-950/20 p-4 rounded-2xl border border-rose-500/40">
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-black text-rose-300 flex items-center gap-2">
                  <Coffee className="w-4 h-4 text-rose-400" /> 🪵 Haftanın Bidonu (Termosla Sıcak Çay Borçlusu ☕)
                </label>
                <span className="text-[10px] text-rose-400 font-bold px-2 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/30">
                  Opsiyonel • Kurul Affı Geçerli
                </span>
              </div>
              <p className="text-[11px] text-neutral-400 mb-2">
                Her hafta bidon seçilmek zorunda değildir; herkes iyi oynamışsa &quot;Bu Hafta Bidon Yok&quot; seçilebilir. Kulüp Efsaneleri asla bidon seçilemez 👑. Seçilirse takıma termosla çay getirme cezası yazılır.
              </p>
              <select
                value={selectedBidonId}
                onChange={(e) => setSelectedBidonId(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-700 rounded-xl p-2.5 text-xs text-white font-bold cursor-pointer focus:border-rose-400 outline-none"
              >
                <option value="">-- 🛡️ Bu Hafta Bidon Yok (Herkes İyi Oynadı / Kurul Affetti) --</option>
                {candidatePlayers
                  .filter((p) => p.id !== selectedMvpId && !p.isLegend)
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} (#{p.number}) • ({bidonTallies[p.id] || 0} oy aldı)
                    </option>
                  ))}
              </select>
            </div>

            {/* 3. Ateş Ediyo! Kartları (Sadece Kurul Verir • Maksimum 3 Kişi) */}
            <div className="bg-gradient-to-r from-neutral-900 to-orange-950/20 p-4 rounded-2xl border border-orange-500/40">
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-black text-orange-400 flex items-center gap-2">
                  <Flame className="w-4 h-4 text-orange-400" /> 🔥 Ateş Ediyo! Kartları (Sadece Kurul • Maks 3)
                </label>
                <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full border ${
                  selectedInFormIds.length === 3
                    ? 'bg-orange-500/20 border-orange-400 text-orange-300'
                    : 'bg-neutral-800 border-neutral-700 text-neutral-300'
                }`}>
                  {selectedInFormIds.length} / 3 Oyuncu Seçildi
                </span>
              </div>
              <p className="text-[11px] text-neutral-400 mb-3">
                Bu kartları sadece Kurul verebilir. Sahada durdurulamayan, alev alev yanan en fazla 3 oyuncuyu işaretleyin:
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {candidatePlayers.map((p) => {
                  const isSelected = selectedInFormIds.includes(p.id);
                  const isMvp = selectedMvpId === p.id;
                  const isBidon = selectedBidonId === p.id;
                  const isMaxReached = selectedInFormIds.length >= 3 && !isSelected;

                  return (
                    <button
                      key={p.id}
                      type="button"
                      disabled={isMaxReached || isMvp || isBidon}
                      onClick={() => toggleInForm(p.id)}
                      className={`p-2.5 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-gradient-to-r from-orange-600/40 to-amber-600/30 border-orange-400 text-white shadow-md shadow-orange-500/20'
                          : isMaxReached || isMvp || isBidon
                          ? 'bg-neutral-950/40 border-neutral-800/60 text-neutral-600 cursor-not-allowed opacity-50'
                          : 'bg-neutral-950 border-neutral-800 text-neutral-300 hover:border-neutral-600'
                      }`}
                    >
                      <div className="truncate">
                        <div className="text-xs font-bold truncate">{p.name}</div>
                        <div className="text-[10px] text-neutral-400 font-mono">
                          {p.position} • {p.currentOVR} OVR
                        </div>
                      </div>
                      {isSelected ? (
                        <CheckCircle2 className="w-4 h-4 text-orange-400 shrink-0 ml-1.5" />
                      ) : isMvp ? (
                        <span className="text-[9px] font-bold text-amber-400">MVP</span>
                      ) : isBidon ? (
                        <span className="text-[9px] font-bold text-rose-400">Bidon</span>
                      ) : (
                        <span className="text-[10px] text-neutral-500">Seç</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 4. Etten Duvar (En İyi Savunma/GK) */}
            <div className="bg-neutral-900 p-4 rounded-2xl border border-blue-500/30">
              <label className="text-xs font-bold text-blue-300 block mb-1">
                🧱 Etten Duvar (En İyi Savunma / Kaleci)
              </label>
              <select
                value={selectedWallId}
                onChange={(e) => setSelectedWallId(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-700 rounded-xl p-2 text-xs text-white cursor-pointer"
              >
                {candidatePlayers.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} (#{p.number} • {p.position})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between gap-3 mt-6 pt-4 border-t border-neutral-800">
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-bold"
          >
            Vazgeç
          </button>

          <button
            onClick={handleSealAwards}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-black text-xs font-black flex items-center gap-2.5 shadow-xl shadow-amber-500/30 transition-transform active:scale-95 cursor-pointer"
          >
            <ShieldCheck className="w-5 h-5 text-black" />
            <span>🔏 Kurul Mührünü Bas & Resmi Kartları Dağıt</span>
          </button>
        </div>
      </div>
    </div>
  );
};
