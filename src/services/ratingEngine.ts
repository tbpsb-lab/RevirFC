import {
  CardTheme,
  CURRENT_STATS_SYNC_VERSION,
  getDefaultCardThemeForPlayer,
  isClubLegendPlayer,
  Match,
  MatchAwards,
  MatchBallot,
  MatchRatingVote,
  Player,
  resolvePlayerBaseStats,
  shiftPlayerStatsByDelta,
} from '../types';

export interface VerbalRatingOption {
  score10: 9 | 8 | 7 | 6 | 5;
  emoji: string;
  label: string;
  shortDesc: string;
  activeClass: string;
  badgeClass: string;
}

export const VERBAL_RATING_OPTIONS: VerbalRatingOption[] = [
  {
    score10: 9,
    emoji: '🔥',
    label: 'Harikaydı',
    shortDesc: 'Maça damga vurdu',
    activeClass: 'bg-emerald-500/25 border-emerald-400 text-emerald-200 ring-1 ring-emerald-400/50',
    badgeClass: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/35',
  },
  {
    score10: 8,
    emoji: '👍',
    label: 'İyiydi',
    shortDesc: 'Beklenenin üstünde',
    activeClass: 'bg-sky-500/25 border-sky-400 text-sky-200 ring-1 ring-sky-400/50',
    badgeClass: 'bg-sky-500/15 text-sky-300 border-sky-500/35',
  },
  {
    score10: 7,
    emoji: '👌',
    label: 'Standarttı',
    shortDesc: 'Kendi seviyesindeydi',
    activeClass: 'bg-amber-500/20 border-amber-400 text-amber-200 ring-1 ring-amber-400/50',
    badgeClass: 'bg-neutral-800 text-neutral-200 border-neutral-700',
  },
  {
    score10: 6,
    emoji: '😐',
    label: 'Durgun',
    shortDesc: 'Biraz tutuktu',
    activeClass: 'bg-orange-500/25 border-orange-400 text-orange-200 ring-1 ring-orange-400/50',
    badgeClass: 'bg-orange-500/15 text-orange-300 border-orange-500/35',
  },
  {
    score10: 5,
    emoji: '📉',
    label: 'Formsuzdu',
    shortDesc: 'Gününde değildi',
    activeClass: 'bg-rose-500/25 border-rose-400 text-rose-200 ring-1 ring-rose-400/50',
    badgeClass: 'bg-rose-500/15 text-rose-300 border-rose-500/35',
  },
];

export function snapScoreToVerbalLevel(rawScore: number): 9 | 8 | 7 | 6 | 5 {
  const norm = rawScore > 10 ? rawScore / 10 : rawScore;
  if (norm >= 8.5) return 9;
  if (norm >= 7.5) return 8;
  if (norm >= 6.5) return 7;
  if (norm >= 5.5) return 6;
  return 5;
}

export function getVerbalRatingOption(score10: number): VerbalRatingOption {
  const level = snapScoreToVerbalLevel(score10);
  return VERBAL_RATING_OPTIONS.find((o) => o.score10 === level) || VERBAL_RATING_OPTIONS[2];
}

export interface PlayerRatingCalculation {
  playerId: string;
  matchScore10: number; // 1-10
  matchScore100: number; // 10-100
  oldOVR: number;
  newOVR: number;
  oldExactOVR: number;
  newExactOVR: number;
  deltaOVR: number;
  selfScore: number;
  peerAverageScore: number;
  egoDelta: number; // selfScore - peerAverageScore
  egoLabel: 'Özgüven Patlaması' | 'Gizli Kahraman' | 'Gerçekçi Usta';
  trimmedMinVote?: number;
  trimmedMaxVote?: number;
}

const MAX_OVR_CAP = 97;
const MIN_OVR_FLOOR = 40;
const EXPECTATION_MULTIPLIER = 4; // Yol B: 7.0 üstü/altı her 1 puan hedefi ±4 kaydırır

function clampOvr(val: number, maxCap = MAX_OVR_CAP): number {
  return Math.max(MIN_OVR_FLOOR, Math.min(maxCap, val));
}

/**
 * Trimmed Weighted Mean Filter + Yol B + Kurul Çapalı Gizli Ondalıklı EMA:
 * - Uç 1 en düşük ve 1 en yüksek akran oyu kırpılır (3+ oyda).
 * - Altın Oran: %50 Takım Arkadaşı, %35 Rakip Takım, %15 Öz Puan (Kurul 2x).
 * - Yol B (k=4): Hedef = baseOVR + (matchScore10 - 7.0) * 4
 * - Çapalı Formül: newExact = 0.75 * oldExact + 0.15 * Hedef + 0.10 * baseOVR (max 97).
 */
export function calculatePlayerMatchRating(params: {
  playerId: string;
  oldOVR: number;
  baseOVR?: number;
  oldExactOVR?: number;
  votes: MatchRatingVote[];
  teammateIds: Set<string>;
  opponentIds: Set<string>;
  committeeIds?: Set<string>;
}): PlayerRatingCalculation {
  const {
    playerId,
    oldOVR,
    baseOVR = oldOVR,
    oldExactOVR = oldOVR,
    votes,
    teammateIds,
    opponentIds,
    committeeIds = new Set(['p1', 'p2', 'p3']),
  } = params;

  const playerVotes = votes.filter((v) => v.targetPlayerId === playerId);

  // Kimse oy vermediyse mevcut puan ve gizli ondalığı koru (%10 kök çekimi yapma)
  if (playerVotes.length === 0) {
    return {
      playerId,
      matchScore10: 7.0,
      matchScore100: 70,
      oldOVR,
      newOVR: oldOVR,
      oldExactOVR,
      newExactOVR: oldExactOVR,
      deltaOVR: 0,
      selfScore: 7.0,
      peerAverageScore: 7.0,
      egoDelta: 0,
      egoLabel: 'Gerçekçi Usta',
    };
  }

  const normalizeTo10 = (score: number) => (score > 10 ? score / 10 : score);

  let selfScore = 7.0;
  const teammateScores: number[] = [];
  const opponentScores: number[] = [];
  const allPeerScores: number[] = [];

  for (const v of playerVotes) {
    const normScore = normalizeTo10(v.score);
    if (v.raterPlayerId === playerId) {
      selfScore = normScore;
      continue;
    }

    const weight = committeeIds.has(v.raterPlayerId) ? 2 : 1;
    for (let w = 0; w < weight; w++) {
      if (opponentIds.has(v.raterPlayerId)) {
        opponentScores.push(normScore);
        allPeerScores.push(normScore);
      } else if (teammateIds.has(v.raterPlayerId)) {
        teammateScores.push(normScore);
        allPeerScores.push(normScore);
      } else {
        allPeerScores.push(normScore);
      }
    }
  }

  let trimmedMinVote: number | undefined;
  let trimmedMaxVote: number | undefined;
  const filteredPeerScores = [...allPeerScores];

  if (filteredPeerScores.length >= 3) {
    filteredPeerScores.sort((a, b) => a - b);
    trimmedMinVote = filteredPeerScores.shift();
    trimmedMaxVote = filteredPeerScores.pop();
  }

  const peerAverageScore =
    filteredPeerScores.length > 0
      ? filteredPeerScores.reduce((sum, s) => sum + s, 0) / filteredPeerScores.length
      : selfScore;

  const oppAvg =
    opponentScores.length > 0
      ? opponentScores.reduce((a, b) => a + b, 0) / opponentScores.length
      : peerAverageScore;

  const teamAvg =
    teammateScores.length > 0
      ? teammateScores.reduce((a, b) => a + b, 0) / teammateScores.length
      : peerAverageScore;

  // Match rating (1 - 10) - Altın Oran Formülü (7.0 = Standart / Kendi Seviyesi)
  const matchScore10 = Math.round((0.50 * teamAvg + 0.35 * oppAvg + 0.15 * selfScore) * 10) / 10;
  const matchScore100 = Math.round(matchScore10 * 10);

  // Yol B (k=4): Kendi seviyesine göre performans hedefi
  const targetScore = clampOvr(baseOVR + (matchScore10 - 7.0) * EXPECTATION_MULTIPLIER, 100);

  // Kurul Çapalı + Gizli Ondalıklı Formül (%75 Eski + %15 Maç + %10 Kök)
  const rawNextExact = 0.75 * oldExactOVR + 0.15 * targetScore + 0.10 * baseOVR;
  const newExactOVR = clampOvr(Math.round(rawNextExact * 1000) / 1000);
  const newOVR = clampOvr(Math.round(newExactOVR));
  const deltaOVR = newOVR - oldOVR;

  const egoDelta = Math.round((selfScore - peerAverageScore) * 10) / 10;
  let egoLabel: PlayerRatingCalculation['egoLabel'] = 'Gerçekçi Usta';
  if (egoDelta >= 1.5) {
    egoLabel = 'Özgüven Patlaması';
  } else if (egoDelta <= -1.0) {
    egoLabel = 'Gizli Kahraman';
  }

  return {
    playerId,
    matchScore10,
    matchScore100,
    oldOVR,
    newOVR,
    oldExactOVR,
    newExactOVR,
    deltaOVR,
    selfScore,
    peerAverageScore: Math.round(peerAverageScore * 10) / 10,
    egoDelta,
    egoLabel,
    trimmedMinVote,
    trimmedMaxVote,
  };
}

/**
 * Hem canlı sitede hem Test Modu simülasyonlarında kullanılan tekil 360° puan uygulama motoru.
 * Aynı maç içinde birden fazla kişi arka arkaya oy gönderdiğinde bileşik artışı önlemek için
 * baselineOVRs ve baselineExactOVRs değerlerini maç bazında sabitler ve statları her zaman
 * kök statlardan (baseStats) türetir.
 */
export function applyMatchRatingsToSquad(params: {
  players: Player[];
  match: Match;
  votes: MatchRatingVote[];
  provisionalAwards: MatchAwards;
  ballot?: MatchBallot;
  committeePlayerIds?: Set<string>;
}): {
  updatedPlayers: Player[];
  changedStarterPlayers: Player[];
  nextMatch: Match;
} {
  const { players, match, votes, provisionalAwards, ballot, committeePlayerIds } = params;

  const teamAIds = new Set(match.teamA?.players.map((x) => x.player.id) || []);
  const teamBIds = new Set(match.teamB?.players.map((x) => x.player.id) || []);

  const resolvedCommitteeIds =
    committeePlayerIds ??
    new Set(
      players
        .filter((p) => ['p1', 'p2', 'p3'].includes(p.id) || ['alper', 'akif', 'yüksel'].includes(p.name.trim().toLocaleLowerCase('tr-TR')))
        .map((p) => p.id)
    );

  // Sadece oylamayı gönderen kullanıcının oylarını güncelle; diğer oyları koru
  const currentRaterIds = new Set(votes.map((v) => v.raterPlayerId));
  if (ballot?.raterId) {
    currentRaterIds.add(ballot.raterId);
  }
  const mergedVotes: MatchRatingVote[] = [
    ...(match.ratings || []).filter((v) => !currentRaterIds.has(v.raterPlayerId)),
    ...votes,
  ];

  // Sıralı oylamalarda aynı maç içinde bileşik artışı önlemek için başlangıç OVR & exactOVR değerlerini sabitle
  const baselineOVRs: Record<string, number> = { ...(match.baselineOVRs || {}) };
  const baselineExactOVRs: Record<string, number> = { ...(match.baselineExactOVRs || {}) };
  players.forEach((p) => {
    if (!match.starters.includes(p.id)) return;
    if (baselineOVRs[p.id] === undefined) {
      baselineOVRs[p.id] = p.currentOVR;
    }
    if (baselineExactOVRs[p.id] === undefined) {
      baselineExactOVRs[p.id] = p.exactOVR ?? baselineOVRs[p.id] ?? p.currentOVR;
    }
  });

  const isAlreadyConfirmed = Boolean(match.awards?.isConfirmedByCommittee);
  const activeAwards = isAlreadyConfirmed ? match.awards! : provisionalAwards;

  const updatedPlayers = players.map((p) => {
    if (!match.starters.includes(p.id)) return p;

    const isTeamA = teamAIds.has(p.id);
    const teammateIds = isTeamA ? teamAIds : teamBIds;
    const opponentIds = isTeamA ? teamBIds : teamAIds;
    const baseStats = resolvePlayerBaseStats(p);

    const calc = calculatePlayerMatchRating({
      playerId: p.id,
      oldOVR: baselineOVRs[p.id] ?? p.currentOVR,
      baseOVR: p.baseOVR,
      oldExactOVR: baselineExactOVRs[p.id] ?? p.exactOVR ?? p.currentOVR,
      votes: mergedVotes,
      teammateIds,
      opponentIds,
      committeeIds: resolvedCommitteeIds,
    });

    let newTheme: CardTheme = p.theme;
    if (activeAwards.mvpId === p.id) {
      newTheme = 'totw';
    } else if (activeAwards.bidonId === p.id && !isClubLegendPlayer(p)) {
      newTheme = 'bidon';
    } else if (activeAwards.inFormIds?.includes(p.id)) {
      newTheme = 'inform';
    } else if (activeAwards.wallId === p.id) {
      newTheme = 'wall';
    } else {
      newTheme = getDefaultCardThemeForPlayer(p, calc.newOVR);
    }

    // Stat erimesini önle: her zaman kök statlar (baseStats) + toplam form farkı üzerinden hesapla
    const formDeltaFromBase = calc.newOVR - p.baseOVR;
    const nextStats = shiftPlayerStatsByDelta(baseStats, formDeltaFromBase);

    return {
      ...p,
      baseStats,
      exactOVR: calc.newExactOVR,
      stats: nextStats,
      currentOVR: calc.newOVR,
      statsSyncVersion: CURRENT_STATS_SYNC_VERSION,
      egoIndex: calc.egoDelta,
      theme: newTheme,
      formTrend:
        calc.deltaOVR > 0 ? ('up' as const) : calc.deltaOVR < 0 ? ('down' as const) : ('stable' as const),
      lastMatchSummary: {
        matchTitle: match.title,
        matchScore10: calc.matchScore10,
        matchScore100: calc.matchScore100,
        prevOVR: calc.oldOVR,
        newOVR: calc.newOVR,
        deltaOVR: calc.deltaOVR,
        updatedAt: new Date().toISOString(),
      },
    };
  });

  const updatedBallots = ballot
    ? [...(match.ballots || []).filter((b) => b.raterId !== ballot.raterId), ballot]
    : match.ballots || [];

  const changedStarterPlayers = updatedPlayers.filter((p) => match.starters.includes(p.id));

  const nextMatch: Match = {
    ...match,
    stage: 'rating',
    awards: activeAwards,
    ratings: mergedVotes,
    ballots: updatedBallots,
    baselineOVRs,
    baselineExactOVRs,
  };

  return { updatedPlayers, changedStarterPlayers, nextMatch };
}
