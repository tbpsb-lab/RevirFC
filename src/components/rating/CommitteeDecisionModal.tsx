import React, { useState } from 'react';
import { Player, Match, MatchAwards, MatchWinnerTeam, isClubLegendPlayer, getPlayerSeniorityRank } from '../../types';
import { COMMITTEE_MEMBERS } from '../../services/mockData';
import { ShieldCheck, Trophy, Flame, CheckCircle2, Coffee, MessageSquare } from 'lucide-react';
import confetti from 'canvas-confetti';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  match: Match;
  players: Player[];
  committeeMemberName?: string;
  onConfirmAwards: (awards: MatchAwards) => void;
}

export const CommitteeDecisionModal: React.FC<Props> = ({
  isOpen,
  onClose,
  match,
  players,
  committeeMemberName,
  onConfirmAwards,
}) => {
  // Starters / candidates in this match (İlk 12 Asil)
  const useAltLineup = match.selectedLineupOption === 2 && Boolean(match.altTeamA && match.altTeamB);
  const activeTeamA = useAltLineup ? match.altTeamA : match.teamA;
  const activeTeamB = useAltLineup ? match.altTeamB : match.teamB;

  const starterIds =
    activeTeamA && activeTeamB
      ? [...activeTeamA.players.map((x) => x.player.id), ...activeTeamB.players.map((x) => x.player.id)]
      : match.starters && match.starters.length > 0
      ? match.starters.slice(0, 12)
      : players.map((p) => p.id);
  const candidatePlayers = players.filter((p) => starterIds.includes(p.id));

  // Tally votes from match.ballots (Kurul üyeleri 2x oy ağırlığına sahiptir)
  const mvpTallies: Record<string, number> = {};
  const bidonTallies: Record<string, number> = { __none__: 0 };
  const wallTallies: Record<string, number> = {};
  const ballots = match.ballots || [];
  const totalBallots = ballots.length;

  const isCommitteeBallot = (raterId: string) => {
    if (raterId === 'p1' || raterId === 'p2' || raterId === 'p3') return true;
    const rater = players.find((p) => p.id === raterId);
    return Boolean(rater && (COMMITTEE_MEMBERS as readonly string[]).includes(rater.name));
  };

  ballots.forEach((b) => {
    const weight = isCommitteeBallot(b.raterId) ? 2 : 1;
    if (b.mvpId) {
      mvpTallies[b.mvpId] = (mvpTallies[b.mvpId] || 0) + weight;
    }
    const bidonTarget = b.bidonId ? players.find((p) => p.id === b.bidonId) : undefined;
    if (b.bidonId && !isClubLegendPlayer(bidonTarget)) {
      bidonTallies[b.bidonId] = (bidonTallies[b.bidonId] || 0) + weight;
    } else {
      bidonTallies.__none__ = (bidonTallies.__none__ || 0) + weight;
    }
    if (b.wallId) {
      wallTallies[b.wallId] = (wallTallies[b.wallId] || 0) + weight;
    }
  });

  const sortedMvpVotes = Object.entries(mvpTallies).sort((a, b) => b[1] - a[1]);
  const sortedWallVotes = Object.entries(wallTallies).sort((a, b) => b[1] - a[1]);
  const sortedBidonVotes = Object.entries(bidonTallies).sort((a, b) => b[1] - a[1]);

  const topMvpId = sortedMvpVotes[0]?.[0];
  const topWallId = sortedWallVotes[0]?.[0];
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
    if (match.awards?.wallId) return match.awards.wallId;
    if (match.awards?.isConfirmedByCommittee) return '';
    return topWallId || candidatePlayers.find((p) => p.position === 'DEF' || p.position === 'GK')?.id || candidatePlayers[0]?.id || '';
  });

  // Maç kazanan takım seçimi ('A' / 'B' - kıdem kuralına göre Yelekli / Yeleksiz)
  const formatTeamDisplay = (squad: typeof activeTeamA, fallback: 'Yelekli' | 'Yeleksiz') => {
    const raw = squad?.name?.trim() || '';
    if (!raw || raw.startsWith('Yeşil')) return fallback;
    if (raw.startsWith('Beyaz')) return fallback;
    if (raw === 'Yelekli' || raw === 'Yeleksiz') return raw;
    return fallback;
  };
  const rankA = activeTeamA?.players?.length
    ? Math.min(...activeTeamA.players.map((x) => getPlayerSeniorityRank(players.find((p) => p.id === x.player.id) || x.player)))
    : Number.MAX_SAFE_INTEGER;
  const rankB = activeTeamB?.players?.length
    ? Math.min(...activeTeamB.players.map((x) => getPlayerSeniorityRank(players.find((p) => p.id === x.player.id) || x.player)))
    : Number.MAX_SAFE_INTEGER;
  const isTeamAYeleksizByRank =
    activeTeamA?.players?.length && activeTeamB?.players?.length ? rankA <= rankB : false;
  const teamADisplay =
    activeTeamA?.players?.length && activeTeamB?.players?.length
      ? isTeamAYeleksizByRank
        ? 'Yeleksiz'
        : 'Yelekli'
      : formatTeamDisplay(activeTeamA, 'Yelekli');
  const teamBDisplay =
    activeTeamA?.players?.length && activeTeamB?.players?.length
      ? isTeamAYeleksizByRank
        ? 'Yelekli'
        : 'Yeleksiz'
      : formatTeamDisplay(activeTeamB, 'Yeleksiz');

  const [selectedWinnerTeam, setSelectedWinnerTeam] = useState<MatchWinnerTeam>(() => {
    if (match.awards?.winnerTeam) return match.awards.winnerTeam;
    if (match.score) {
      if (match.score.teamA > match.score.teamB) return 'A';
      if (match.score.teamB > match.score.teamA) return 'B';
      return 'draw';
    }
    return 'A';
  });

  // Alev Atıyo! cards: strictly max 3 players!
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
        // En eski alevi düşür (FIFO: en baştaki düşer) ve 4. olanı listeye ekle
        return [...prev.slice(1), playerId];
      }
      return [...prev, playerId];
    });
  };

  const handleSealAwards = () => {
    const nowIso = new Date().toISOString();
    const actorName = committeeMemberName || 'Kurul Üyesi';
    const wasAlreadyConfirmed = Boolean(match.awards?.isConfirmedByCommittee);

    if (
      wasAlreadyConfirmed &&
      match.awards?.confirmedBy &&
      match.awards.confirmedBy !== actorName &&
      !window.confirm(
        `Bu maç ${match.awards.confirmedBy} tarafından zaten mühürlenmiş görünüyor.\n\nYalnızca hata düzeltmesi için mührü güncellemek istiyor musunuz?`
      )
    ) {
      return;
    }

    confetti({
      particleCount: 120,
      spread: 90,
      origin: { y: 0.5 },
    });

    const selectedBidonPlayer = selectedBidonId ? players.find((p) => p.id === selectedBidonId) : undefined;
    const safeBidonId =
      selectedBidonId && !isClubLegendPlayer(selectedBidonPlayer) ? selectedBidonId : undefined;

    const finalAwards: MatchAwards = {
      mvpId: selectedMvpId || undefined,
      wallId: selectedWallId || undefined,
      bidonId: safeBidonId,
      inFormIds: selectedInFormIds.filter(
        (id) => id !== selectedMvpId && id !== safeBidonId && id !== selectedWallId
      ),
      winnerTeam: selectedWinnerTeam,
      isConfirmedByCommittee: true,
      confirmedAt: wasAlreadyConfirmed ? (match.awards?.confirmedAt || nowIso) : nowIso,
      confirmedBy: wasAlreadyConfirmed ? (match.awards?.confirmedBy || actorName) : actorName,
      ...(wasAlreadyConfirmed ? { updatedAt: nowIso, updatedBy: actorName } : {}),
    };

    onConfirmAwards(finalAwards);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-2.5 sm:p-4 overflow-y-auto">
      <div className="bg-neutral-900 border-2 border-amber-500/60 rounded-3xl max-w-3xl w-full max-h-[calc(100dvh-1.25rem)] sm:max-h-[88dvh] flex flex-col p-4 sm:p-5 text-white shadow-2xl relative overflow-hidden">
        {/* Header */}
        <div className="shrink-0 flex items-start justify-between gap-2 pb-3 border-b border-neutral-800">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-amber-500/20 border border-amber-400/50 flex items-center justify-center text-amber-400 shadow-lg shadow-amber-500/20 shrink-0">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base sm:text-xl font-black text-amber-400 tracking-tight">
                  🔏 Kurul Karar Masası & Son Mühür
                </h2>
                <span className="text-[10px] uppercase font-extrabold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  Veto & Onay Yetkisi
                </span>
              </div>
              <p className="text-xs text-neutral-400 mt-0.5">
                {match.title} • Toplam {totalBallots} oyuncu oy pusulası gönderdi. Kurul kararı kesindir ve kartları resmileştirir.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-neutral-400 hover:text-white bg-neutral-800 hover:bg-neutral-700 px-2.5 py-1 rounded-lg text-xs font-bold shrink-0 cursor-pointer"
          >
            ✕ Kapat
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain space-y-5 py-3.5 pr-1">
          {match.awards?.isConfirmedByCommittee ? (
            <div className="bg-emerald-500/15 border border-emerald-400/50 rounded-2xl p-3.5 flex items-start gap-2.5 text-xs text-emerald-100">
              <CheckCircle2 className="w-4 h-4 text-emerald-300 shrink-0 mt-0.5" />
              <div>
                <p className="font-black text-emerald-300">
                  🔏 Bu Maç Zaten Mühürlendi — Mühürleyen: {match.awards.confirmedBy || 'Kurul'}
                </p>
                <p className="text-[11px] text-emerald-100/85 mt-0.5 leading-relaxed">
                  {match.awards.confirmedAt
                    ? `İlk mühür: ${new Date(match.awards.confirmedAt).toLocaleString('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}. `
                    : ''}
                  {match.awards.updatedBy && match.awards.updatedAt
                    ? `Son hata düzeltmesi: ${match.awards.updatedBy} (${new Date(match.awards.updatedAt).toLocaleString('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}). `
                    : ''}
                  Diğer kurul üyeleri mührü canlı olarak görür. Yalnızca yanlış bir ödülü veya skoru düzeltmek gerekiyorsa güncelleyebilirsiniz (mükerrer borç/duyuru oluşmaz).
                </p>
              </div>
            </div>
          ) : (
            <div className="bg-sky-500/10 border border-sky-400/35 rounded-2xl p-3.5 flex items-start gap-2.5 text-xs text-sky-100">
              <MessageSquare className="w-4 h-4 text-sky-300 shrink-0 mt-0.5" />
              <div>
                <p className="font-black text-sky-300">
                  💬 Kurul Çalışma Kuralı (WhatsApp Ortak Kararı → Tek Mühür)
                </p>
                <p className="text-[11px] text-sky-100/85 mt-0.5 leading-relaxed">
                  3 kişilik Kurul kararını WhatsApp üzerinden netleştirdikten sonra <strong className="text-white">yalnızca 1 kurul üyesinin mühür basması</strong> önerilir. Mühür basıldığında diğer kurul üyeleri bu ekranda mühürleyen kişiyi canlı görür ve yalnızca hata düzeltmesi gerekirse günceller.
                </p>
              </div>
            </div>
          )}

          {/* Ballot Box Summary (Sandık Sonuçları) */}
          <div className="bg-neutral-950/70 border border-neutral-800 rounded-2xl p-4">
            <h3 className="text-xs font-black text-neutral-300 uppercase tracking-wider flex items-center gap-1.5 mb-3">
              🗳️ Oylama Sandığı Özeti ({totalBallots} Pusula • Kurul Oyları 2x Ağırlıklı)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
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

              {/* Etten Duvar votes */}
              <div className="bg-neutral-900/90 rounded-xl p-3 border border-neutral-800">
                <span className="font-bold text-sky-400 block mb-2">🧱 Etten Duvar Sandık Sıralaması:</span>
                {sortedWallVotes.length === 0 ? (
                  <p className="text-neutral-500 text-[11px]">Henüz oy girilmedi.</p>
                ) : (
                  <div className="space-y-1.5">
                    {sortedWallVotes.slice(0, 3).map(([id, count], idx) => {
                      const p = players.find((x) => x.id === id);
                      return (
                        <div key={id} className="flex items-center justify-between text-[11px]">
                          <span className="text-neutral-300">
                            {idx + 1}. {p?.name || id}
                          </span>
                          <span className="font-mono font-bold text-sky-300 bg-sky-500/10 px-2 py-0.5 rounded">
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
            {/* 0. Kazanan Takım Seçimi (Otomatik Maç & Galibiyet İstatistiği) */}
            <div className="bg-gradient-to-r from-neutral-900 via-emerald-950/20 to-neutral-900 p-4 rounded-2xl border border-emerald-500/40 space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label className="text-sm font-black text-emerald-300 flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-emerald-400" /> Maç Sonucu & Kazanan Takım (Otomatik İstatistik)
                </label>
                <span className="text-[10px] font-bold text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                  İlk 12&apos;ye +1 Maç • Kazanana +1 Galibiyet
                </span>
              </div>
              <p className="text-[11px] text-neutral-400">
                Sahaya çıkan 12 asil oyuncunun Maç sayısı otomatik +1 artar. Seçtiğiniz kazanan takımdaki 6 oyuncunun Galibiyet hanesine de +1 eklenir.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedWinnerTeam('A')}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                    selectedWinnerTeam === 'A'
                      ? 'bg-emerald-500/20 border-emerald-400 text-white shadow-lg shadow-emerald-500/15'
                      : 'bg-neutral-950/80 border-neutral-800 text-neutral-400 hover:border-neutral-700'
                  }`}
                >
                  <div className="text-xs font-black text-emerald-300">
                    🟢 {teamADisplay} Kazandı
                  </div>
                  <div className="text-[10px] text-neutral-400 mt-0.5 truncate">
                    {activeTeamA ? activeTeamA.players.map((x) => x.player.name).join(', ') : '6 oyuncuya +1 Galibiyet'}
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedWinnerTeam('B')}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                    selectedWinnerTeam === 'B'
                      ? 'bg-sky-500/20 border-sky-400 text-white shadow-lg shadow-sky-500/15'
                      : 'bg-neutral-950/80 border-neutral-800 text-neutral-400 hover:border-neutral-700'
                  }`}
                >
                  <div className="text-xs font-black text-sky-200">
                    ⚪ {teamBDisplay} Kazandı
                  </div>
                  <div className="text-[10px] text-neutral-400 mt-0.5 truncate">
                    {activeTeamB ? activeTeamB.players.map((x) => x.player.name).join(', ') : '6 oyuncuya +1 Galibiyet'}
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedWinnerTeam('draw')}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                    selectedWinnerTeam === 'draw'
                      ? 'bg-amber-500/20 border-amber-400 text-white shadow-lg shadow-amber-500/15'
                      : 'bg-neutral-950/80 border-neutral-800 text-neutral-400 hover:border-neutral-700'
                  }`}
                >
                  <div className="text-xs font-black text-amber-300">🤝 Berabere Bitti</div>
                  <div className="text-[10px] text-neutral-400 mt-0.5">
                    12 asil oyuncuya sadece +1 Maç
                  </div>
                </button>
              </div>

              {(!activeTeamA || !activeTeamB) && selectedWinnerTeam !== 'draw' && (
                <div className="text-[10px] text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded-lg px-2.5 py-1.5">
                  ⚠️ Taktik Tahtasında henüz 6+6 takım ayrımı yapılmamış. Mühürlemeden önce kadro dengelenirse 6 kazanan otomatik işaretlenir; aksi halde sadece 12 asile +1 Maç yazılır.
                </div>
              )}
            </div>

            {/* 1. MVP Selection */}
            <div className="bg-gradient-to-r from-neutral-900 to-amber-950/20 p-4 rounded-2xl border border-amber-500/50">
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-black text-amber-400 flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-amber-400" /> Haftanın Resmi MVP&apos;si (Tekil)
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
                  if (selectedWallId === newMvpId) {
                    setSelectedWallId('');
                  }
                  setSelectedInFormIds((prev) => prev.filter((id) => id !== newMvpId));
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
                  <Coffee className="w-4 h-4 text-rose-400" /> 🪵 Haftanın Bidonu (Termosla Sıcak Çay Borçlusu)
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
                onChange={(e) => {
                  const newBidonId = e.target.value;
                  setSelectedBidonId(newBidonId);
                  if (newBidonId && selectedWallId === newBidonId) {
                    setSelectedWallId('');
                  }
                  if (newBidonId) {
                    setSelectedInFormIds((prev) => prev.filter((id) => id !== newBidonId));
                  }
                }}
                className="w-full bg-neutral-950 border border-neutral-700 rounded-xl p-2.5 text-xs text-white font-bold cursor-pointer focus:border-rose-400 outline-none"
              >
                <option value="">-- 🛡️ Bu Hafta Bidon Yok (Herkes İyi Oynadı / Kurul Affetti) --</option>
                {candidatePlayers
                  .filter((p) => p.id !== selectedMvpId && !isClubLegendPlayer(p))
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} (#{p.number}) • ({bidonTallies[p.id] || 0} oy aldı)
                    </option>
                  ))}
              </select>
            </div>

            {/* 3. Alev Atıyo! Kartları (Sadece Kurul Verir • Maksimum 3 Kişi) */}
            <div className="bg-gradient-to-r from-neutral-900 to-orange-950/20 p-4 rounded-2xl border border-orange-500/40">
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-black text-orange-400 flex items-center gap-2">
                  <Flame className="w-4 h-4 text-orange-400" /> Alev Atıyo! Kartları (Sadece Kurul • Maks 3)
                </label>
                <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full border ${
                  selectedInFormIds.length === 3
                    ? 'bg-orange-500/20 border-orange-400 text-orange-300'
                    : 'bg-neutral-800 border-neutral-700 text-neutral-300'
                }`}>
                  {selectedInFormIds.length} / 3 Oyuncu (4. seçilirse en eski düşer)
                </span>
              </div>
              <p className="text-[11px] text-neutral-400 mb-3">
                Bu kartları sadece Kurul verebilir. Sahada durdurulamayan, alev alev yanan en fazla 3 oyuncuyu işaretleyin (4. seçilirse en eski alev kartı otomatik olarak düşer):
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {candidatePlayers.map((p) => {
                  const isSelected = selectedInFormIds.includes(p.id);
                  const isMvp = selectedMvpId === p.id;
                  const isBidon = selectedBidonId === p.id;
                  const isWall = selectedWallId === p.id;
                  const isBlocked = isMvp || isBidon || isWall;

                  return (
                    <button
                      key={p.id}
                      type="button"
                      disabled={isBlocked}
                      onClick={() => toggleInForm(p.id)}
                      className={`p-2.5 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                        isSelected && !isBlocked
                          ? 'bg-gradient-to-r from-orange-600/40 to-amber-600/30 border-orange-400 text-white shadow-md shadow-orange-500/20'
                          : isBlocked
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
                      {isSelected && !isBlocked ? (
                        <CheckCircle2 className="w-4 h-4 text-orange-400 shrink-0 ml-1.5" />
                      ) : isMvp ? (
                        <span className="text-[9px] font-bold text-amber-400">MVP</span>
                      ) : isWall ? (
                        <span className="text-[9px] font-bold text-sky-400">Duvar</span>
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
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-blue-300">
                  🧱 Etten Duvar (En İyi Savunma / Kaleci • Tekil Kart)
                </label>
                <span className="text-[10px] text-sky-300 font-mono">Etten Duvar Kartı</span>
              </div>
              <p className="text-[11px] text-neutral-400 mb-2">
                Seçilen oyuncuya 1 hafta boyunca geçit vermeyen Etten Duvar özel kartı verilir.
              </p>
              <select
                value={selectedWallId}
                onChange={(e) => {
                  const newWallId = e.target.value;
                  setSelectedWallId(newWallId);
                  if (newWallId) {
                    setSelectedInFormIds((prev) => prev.filter((id) => id !== newWallId));
                  }
                }}
                className="w-full bg-neutral-950 border border-neutral-700 rounded-xl p-2 text-xs text-white cursor-pointer"
              >
                <option value="">-- Bu Hafta Etten Duvar Seçilmedi --</option>
                {candidatePlayers
                  .filter((p) => p.id !== selectedMvpId && p.id !== selectedBidonId)
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} (#{p.number} • {p.position}) • ({wallTallies[p.id] || 0} oy aldı)
                    </option>
                  ))}
              </select>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="shrink-0 flex flex-wrap items-center justify-between gap-2.5 mt-2 pt-3 border-t border-neutral-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-bold cursor-pointer"
          >
            Vazgeç
          </button>

          <button
            type="button"
            onClick={handleSealAwards}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-black text-xs font-black flex items-center gap-2 shadow-xl shadow-amber-500/30 transition-transform active:scale-95 cursor-pointer"
          >
            <ShieldCheck className="w-4 h-4 text-black shrink-0" />
            <span>
              {match.awards?.isConfirmedByCommittee
                ? '🔏 Kurul Mührünü Güncelle & Kaydet'
                : '🔏 Kurul Mührünü Bas & Resmi Kartları Dağıt'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
