import {
  Player,
  UserProfile,
  Match,
  CheckInEntry,
  MatchRatingVote,
  MatchBallot,
  PlayerScoutingEntry,
  LockerPost,
  PhotoArchiveItem,
  DessertDebt,
  PhysicalStatus,
  GoalkeeperWillingness,
  getDefaultCardThemeForPlayer,
  normalizePlayerThemeAndLegend,
} from '../types';
import { COMMITTEE_MEMBERS } from './mockData';
import { run462BalancingAlgorithm } from './balancingEngine';
import { applyMatchRatingsToSquad, snapScoreToVerbalLevel } from './ratingEngine';

export interface SandboxState {
  players: Player[];
  users: UserProfile[];
  match: Match;
  scoutingEntries: PlayerScoutingEntry[];
  posts: LockerPost[];
  photos: PhotoArchiveItem[];
  debts: DessertDebt[];
}

function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

const SAMPLE_CHECKIN_NOTES: Record<string, string> = {
  p2: 'Formum zirvede, çift forvet oynayabiliriz!',
  p7: 'Hafif arka adale çekmesi var, kalede/geride dikkatli oynarım.',
  p11: 'Nöbet çıkışı geliyorum, ikinci yarı tempoyu artırırım.',
  p14: 'Erken gelip ısınacağım, hazır durumdayım.',
  p17: 'Ailevi işlerden dolayı bu hafta katılamıyorum, haftaya görüşürüz.',
  p18: 'Nöbete kaldım maalesef, herkese iyi maçlar!',
};

const SAMPLE_SCOUT_NOTES: Record<string, string> = {
  GK: 'Refleksleri ve kale içi hakimiyeti yüksek, ayakla pas dağılımı güvenli.',
  DEF: 'İkili mücadelelerde sert ve kademesi sağlam, duran toplarda etkili.',
  MID: 'Oyun görüşü geniş, pas bağlantısı ve tempo sürekliliği yüksek.',
  FWD: 'Ceza sahası içi bitiriciliği keskin, savunma arkası koşuları tehlikeli.',
};

const LATIN_TURKISH_MAP: Record<string, string> = {
  ç: 'c',
  ğ: 'g',
  ı: 'i',
  İ: 'i',
  ö: 'o',
  ş: 's',
  ü: 'u',
  Ç: 'c',
  Ğ: 'g',
  Ö: 'o',
  Ş: 's',
  Ü: 'u',
};

function toSandboxEmailSlug(name: string): string {
  return (name || 'uye')
    .split('')
    .map((ch) => LATIN_TURKISH_MAP[ch] ?? ch)
    .join('')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

/**
 * 22 oyuncu için tüm sanal üye hesaplarını + 2 örnek onay bekleyen başvuruyu üretir.
 */
export function buildSandboxUsers(players: Player[]): UserProfile[] {
  const now = new Date().toISOString();
  const approvedUsers: UserProfile[] = players.map((p) => {
    const isAdmin = p.id === 'p1';
    const isCommittee = !isAdmin && (COMMITTEE_MEMBERS as readonly string[]).includes(p.name);
    const slug = toSandboxEmailSlug(p.name);
    return {
      uid: `sandbox-user-${p.id}`,
      email: isAdmin ? 'tabipsubayi@gmail.com' : `${slug}.test@revirfc.sandbox`,
      displayName: isAdmin ? `${p.name} (Test Yönetici)` : isCommittee ? `${p.name} (Test Kurul)` : p.name,
      photoURL: p.photoUrl && !p.photoUrl.startsWith('data:') ? p.photoUrl : undefined,
      role: isAdmin ? 'admin' : isCommittee ? 'captain' : 'player',
      status: 'approved',
      claimedPlayerId: p.id,
      createdAt: now,
    };
  });

  const pendingUsers: UserProfile[] = [
    {
      uid: 'sandbox-pending-1',
      email: 'emre.doktor@sandbox.test',
      displayName: 'Emre Yılmaz (Örnek Başvuru)',
      role: 'player',
      status: 'pending',
      createdAt: new Date(Date.now() - 45 * 60_000).toISOString(),
    },
    {
      uid: 'sandbox-pending-2',
      email: 'burak.stoper@sandbox.test',
      displayName: 'Burak Demir (Örnek Başvuru)',
      role: 'player',
      status: 'pending',
      createdAt: new Date(Date.now() - 18 * 60_000).toISOString(),
    },
  ];

  return [...pendingUsers, ...approvedUsers];
}

/**
 * 22 oyuncunun tamamı için 3 kurul üyesinden gerçekçi Scouting puanları üretir.
 */
export function simulateFullCommitteeScouting(players: Player[]): PlayerScoutingEntry[] {
  const evaluators = ['Alper', 'Akif', 'Yüksel'];
  const entries: PlayerScoutingEntry[] = [];
  const nowIso = new Date().toISOString();

  players.forEach((p, idx) => {
    const isUnEvaluated50 =
      p.stats.pac === 50 &&
      p.stats.sho === 50 &&
      p.stats.pas === 50 &&
      p.stats.dri === 50 &&
      p.stats.def === 50 &&
      p.stats.phy === 50;

    evaluators.forEach((ev, evIdx) => {
      const jitter = ((idx * 3 + evIdx * 5) % 7) - 3; // -3 .. +3
      const toScale100 = (v: number) =>
        isUnEvaluated50 ? 50 : Math.min(99, Math.max(45, Math.round(v + jitter)));

      const gkRole: GoalkeeperWillingness =
        p.position === 'GK' ? 'yes' : p.secondaryPositions?.includes('GK') ? 'emergency_only' : 'never';

      entries.push({
        playerId: p.id,
        evaluatorName: ev,
        pac: toScale100(p.stats.pac),
        sho: toScale100(p.stats.sho),
        pas: toScale100(p.stats.pas),
        dri: toScale100(p.stats.dri),
        def: toScale100(p.stats.def),
        phy: toScale100(p.stats.phy),
        gkRole,
        playstyles: p.playstyles.slice(0, 2),
        secretNote: isUnEvaluated50
          ? 'Henüz detaylı kurul puanlaması yapılmadı, varsayılan 50 kök puanı atandı.'
          : `${ev} gözlemi: ${SAMPLE_SCOUT_NOTES[p.position] || SAMPLE_SCOUT_NOTES.MID}`,
        updatedAt: nowIso,
      });
    });
  });

  return entries;
}

/**
 * Belirli asil/yedek/mazeret listesine göre örnek check-in kayıtları + 462 dengeleme + örnek maç oyları üretir.
 */
function buildSampleMatchAndRatings(
  players: Player[],
  starterIds: string[],
  waitlistIds: string[],
  absenteeIds: string[],
  volunteerIds: string[],
  baseCheckIns?: Record<string, CheckInEntry>
): { match: Match; players: Player[] } {
  const now = Date.now();
  const checkIns: Record<string, CheckInEntry> = {};

  starterIds.forEach((id, i) => {
    const fallbackStatus: PhysicalStatus =
      id === 'p2' ? 'extra_fit' : id === 'p7' ? 'light_injury' : id === 'p11' ? 'tired' : 'full';
    const existing = baseCheckIns?.[id];
    const status = existing?.status || fallbackStatus;
    checkIns[id] = {
      playerId: id,
      timestamp: now - (30 - i) * 60_000,
      status,
      note: existing?.note || SAMPLE_CHECKIN_NOTES[id],
      attendance: 'yes',
      canPayPitchFee: volunteerIds.includes(id),
    };
  });

  waitlistIds.forEach((id, i) => {
    checkIns[id] = {
      playerId: id,
      timestamp: now - (12 - i) * 60_000,
      status: 'full',
      note: SAMPLE_CHECKIN_NOTES[id],
      attendance: 'yes',
      canPayPitchFee: volunteerIds.includes(id),
    };
  });

  absenteeIds.forEach((id, i) => {
    checkIns[id] = {
      playerId: id,
      timestamp: now - (6 - i) * 60_000,
      status: 'full',
      note: SAMPLE_CHECKIN_NOTES[id] || 'Bu hafta işlerim sebebiyle katılamıyorum.',
      attendance: 'no',
      canPayPitchFee: false,
    };
  });

  // Kart durumlarını check-in ile eşle
  const syncedPlayers = players.map((p) => {
    const ci = checkIns[p.id];
    if (!ci || ci.attendance === 'no') return p;
    return normalizePlayerThemeAndLegend({
      ...p,
      currentStatus: ci.status,
      theme:
        ci.status === 'light_injury'
          ? 'revir'
          : p.theme === 'revir'
          ? getDefaultCardThemeForPlayer({ ...p, currentStatus: ci.status })
          : p.theme,
    });
  });

  const startersList = syncedPlayers.filter((p) => starterIds.includes(p.id));
  const balance = run462BalancingAlgorithm(startersList, checkIns);

  // İlk 10 asil oyuncudan örnek maç sonu puanlaması + ödül pusulası (Kurul Masası & 360° Oylama testi için)
  const sampleVotes: MatchRatingVote[] = [];
  const sampleBallots: MatchBallot[] = [];
  const raters = startersList.slice(0, 10);
  const topForward = startersList.find((p) => p.position === 'FWD')?.id || starterIds[1];
  const topDefender =
    startersList.find((p) => p.position === 'DEF' || p.position === 'GK')?.id || starterIds[2];
  const candidateBidon = starterIds[starterIds.length - 1];

  raters.forEach((rater, rIdx) => {
    startersList.forEach((target, tIdx) => {
      const isSelf = rater.id === target.id;
      // Yol B: beklentiye göre sözel basamaklar (5=Formsuzdu .. 7=Standarttı .. 9=Harikaydı)
      const swing = ((rIdx * 3 + tIdx * 5) % 5) - 2; // -2 .. +2 -> [5,6,7,8,9]
      const rawLevel = isSelf ? (rIdx % 2 === 0 ? 8 : 7) : 7 + swing;
      const score = snapScoreToVerbalLevel(rawLevel);
      sampleVotes.push({
        raterPlayerId: rater.id,
        targetPlayerId: target.id,
        score,
      });
    });

    sampleBallots.push({
      raterId: rater.id,
      mvpId: rIdx % 3 === 0 ? starterIds[0] : topForward,
      wallId: topDefender,
      bidonId: rIdx % 2 === 0 ? candidateBidon : undefined,
      submittedAt: new Date(now - rIdx * 120_000).toISOString(),
    });
  });

  const baselineOVRs: Record<string, number> = {};
  const baselineExactOVRs: Record<string, number> = {};
  startersList.forEach((p) => {
    baselineOVRs[p.id] = p.currentOVR;
    baselineExactOVRs[p.id] = p.exactOVR ?? p.currentOVR;
  });

  const nextWednesday = new Date(now + 2 * 86_400_000).toISOString();

  const match: Match = {
    id: `sandbox-match-${now}`,
    title: 'TEST HAFTASI • Çarşamba Derbisi (Simülasyon)',
    date: nextWednesday,
    matchTime: '21:00 - 22:00',
    pitchName: 'Olimpiyat Halı Saha - 1 Nolu Açık Saha',
    pitchLocationUrl: 'https://maps.google.com/?q=Olimpiyat+Hali+Saha',
    pitchFee: '2.800 ₺',
    pitchFeePayerId: volunteerIds[0],
    pitchFeeVolunteerIds: volunteerIds,
    pollOpenedBy: 'Alper (Test)',
    pollOpenedAt: new Date(now - 3 * 3_600_000).toISOString(),
    isPollOpen: true,
    stage: 'balancing',
    starters: starterIds,
    waitlist: waitlistIds,
    absentees: absenteeIds,
    checkIns,
    teamA: balance.teamA,
    teamB: balance.teamB,
    fairnessRating: balance.fairnessRating,
    altTeamA: balance.alternative?.teamA,
    altTeamB: balance.alternative?.teamB,
    altFairnessRating: balance.alternative?.fairnessRating,
    selectedLineupOption: 1,
    ratings: sampleVotes,
    ballots: sampleBallots,
    baselineOVRs,
    baselineExactOVRs,
    tacticalNotes:
      '🧪 TEST MODU NOTU: Burada anketi doldurup çekilebilir, formasyon (2-2-1 / 2-1-2) ve oyuncu yerlerini deneyebilirsiniz.',
  };

  return { match, players: syncedPlayers };
}

/**
 * Yönetici Test Moduna girildiğinde gerçek siteden izole tam simülasyon durumu üretir.
 */
export function createInitialSandboxState(
  basePlayers: Player[],
  basePosts: LockerPost[],
  basePhotos: PhotoArchiveItem[],
  baseDebts: DessertDebt[],
  baseScoutingEntries?: PlayerScoutingEntry[]
): SandboxState {
  const clonedPlayers = deepClone(basePlayers).map((p) => {
    const normalized = normalizePlayerThemeAndLegend(p);
    // Onay ekranını hemen deneyebilmek için 2 oyuncuya örnek bekleyen lakap ekle (yoksa)
    if (normalized.id === 'p5' && !normalized.pendingNickname) {
      return { ...normalized, pendingNickname: 'BADİCİ' };
    }
    if (normalized.id === 'p8' && !normalized.pendingNickname) {
      return { ...normalized, pendingNickname: 'SÜPERSONİK' };
    }
    return normalized;
  });

  const ids = clonedPlayers.map((p) => p.id);
  // İlk 12 asil, sonraki 4 yedek, sonraki 2 mazeretli, son 4 henüz oy vermemiş (sıfırdan oy testi için!)
  const starterIds = ids.slice(0, 12);
  const waitlistIds = ids.slice(12, 16);
  const absenteeIds = ids.slice(16, 18);
  const volunteerIds = starterIds.filter((id) => ['p1', 'p2', 'p6'].includes(id));

  const { match, players } = buildSampleMatchAndRatings(
    clonedPlayers,
    starterIds,
    waitlistIds,
    absenteeIds,
    volunteerIds.length > 0 ? volunteerIds : starterIds.slice(0, 2)
  );

  const users = buildSandboxUsers(players);
  const scoutingEntries =
    baseScoutingEntries && baseScoutingEntries.length > 0
      ? deepClone(baseScoutingEntries)
      : simulateFullCommitteeScouting(players);

  return {
    players,
    users,
    match,
    scoutingEntries,
    posts: deepClone(basePosts),
    photos: deepClone(basePhotos),
    debts: deepClone(baseDebts),
  };
}

/**
 * Hızlı Simülasyon 1: Anketi rastgele 12 Asil + 4 Yedek + 2 Mazeretli ile doldurur ve 462 kadroyu dengeler.
 */
export function simulateRandomPollCheckIns(
  players: Player[],
  currentMatch: Match
): { match: Match; players: Player[] } {
  const shuffled = [...players].sort(() => Math.random() - 0.5);
  // Her iki takıma en azından 1-2 kaleci yatkın oyuncu denk gelsin diye önce GK'ları öne alma eğilimi olmadan doğal karıştırıyoruz
  const starterIds = shuffled.slice(0, 12).map((p) => p.id);
  const waitlistIds = shuffled.slice(12, 16).map((p) => p.id);
  const absenteeIds = shuffled.slice(16, 18).map((p) => p.id);
  const volunteerIds = [starterIds[0], starterIds[3], starterIds[7]].filter(Boolean);

  const statuses: PhysicalStatus[] = ['full', 'full', 'full', 'extra_fit', 'tired', 'light_injury'];
  const seededCheckIns: Record<string, CheckInEntry> = {};
  starterIds.forEach((id, idx) => {
    seededCheckIns[id] = {
      playerId: id,
      timestamp: Date.now() - idx * 30_000,
      status: idx === 0 ? 'full' : statuses[(idx + Math.floor(Math.random() * 4)) % statuses.length],
      note: idx % 3 === 0 ? 'Test simülasyonu ile rastgele atandı' : undefined,
      attendance: 'yes',
      canPayPitchFee: volunteerIds.includes(id),
    };
  });

  const { match, players: syncedPlayers } = buildSampleMatchAndRatings(
    players,
    starterIds,
    waitlistIds,
    absenteeIds,
    volunteerIds,
    seededCheckIns
  );

  return {
    match: {
      ...match,
      title: currentMatch.title,
      pitchName: currentMatch.pitchName,
      matchTime: currentMatch.matchTime,
      pitchFee: currentMatch.pitchFee,
    },
    players: syncedPlayers,
  };
}

/**
 * Hızlı Simülasyon 2: Aktif asil oyuncular için 12 kişilik tam 360° sözel oylama + pusula üretir
 * ve canlı sistemle birebir aynı applyMatchRatingsToSquad motorunu çalıştırır.
 */
export function simulatePostMatchRatings(
  players: Player[],
  currentMatch: Match
): { match: Match; players: Player[] } {
  const starters = players.filter((p) => currentMatch.starters.includes(p.id));
  if (starters.length === 0) {
    return { match: currentMatch, players };
  }

  const now = Date.now();
  const votes: MatchRatingVote[] = [];
  const ballots: MatchBallot[] = [];

  const mvpCandidate = starters.find((p) => p.position === 'FWD')?.id || starters[0].id;
  const wallCandidate =
    starters.find((p) => p.position === 'DEF' || p.position === 'GK')?.id || starters[1]?.id || starters[0].id;
  const bidonCandidate = starters[starters.length - 1]?.id;

  const verbalSteps: (5 | 6 | 7 | 8 | 9)[] = [6, 7, 7, 8, 8, 9, 5, 7];

  starters.forEach((rater, rIdx) => {
    starters.forEach((target) => {
      const isSelf = rater.id === target.id;
      const picked = isSelf
        ? (Math.random() > 0.4 ? 8 : 7)
        : target.id === mvpCandidate
        ? (Math.random() > 0.3 ? 9 : 8)
        : target.id === bidonCandidate
        ? (Math.random() > 0.4 ? 5 : 6)
        : verbalSteps[Math.floor(Math.random() * verbalSteps.length)];
      votes.push({
        raterPlayerId: rater.id,
        targetPlayerId: target.id,
        score: picked,
      });
    });

    ballots.push({
      raterId: rater.id,
      mvpId: rIdx % 4 === 0 ? starters[0].id : mvpCandidate,
      wallId: wallCandidate,
      bidonId: rIdx % 3 === 0 ? bidonCandidate : undefined,
      submittedAt: new Date(now - rIdx * 60_000).toISOString(),
    });
  });

  const cleanMatch: Match = {
    ...currentMatch,
    ratings: [],
    ballots: [],
  };

  const { updatedPlayers, nextMatch } = applyMatchRatingsToSquad({
    players,
    match: cleanMatch,
    votes,
    provisionalAwards: {
      mvpId: mvpCandidate,
      wallId: wallCandidate,
      bidonId: bidonCandidate,
    },
  });

  return {
    players: updatedPlayers,
    match: {
      ...nextMatch,
      isPollOpen: false,
      ratingOpenedManually: true,
      ratingOpenedBy: 'Test Simülasyonu',
      ratingOpenedAt: new Date(now).toISOString(),
      ballots,
    },
  };
}

/**
 * Hızlı Simülasyon 3: Yönetici onay akışını test etmek için yeni bekleyen kullanıcı + bekleyen lakap talebi ekler.
 */
export function simulateSamplePendingApprovals(
  players: Player[],
  users: UserProfile[]
): { players: Player[]; users: UserProfile[] } {
  const sampleNicks = ['ŞİMŞEK', 'DOKTOR', 'PİRİ', 'KAPTAN-X', 'ROKET', 'KULE'];
  const candidate =
    players.find((p) => p.id !== 'p1' && !p.pendingNickname) || players.find((p) => p.id !== 'p1');

  const nextPlayers = players.map((p) => {
    if (!candidate || p.id !== candidate.id) return p;
    const nick = sampleNicks[Math.floor(Math.random() * sampleNicks.length)];
    return { ...p, pendingNickname: nick };
  });

  const stamp = Date.now().toString().slice(-4);
  const newPendingUser: UserProfile = {
    uid: `sandbox-pending-${Date.now()}`,
    email: `aday.${stamp}@sandbox.test`,
    displayName: `Deneme Üye #${stamp}`,
    role: 'player',
    status: 'pending',
    createdAt: new Date().toISOString(),
  };

  return {
    players: nextPlayers,
    users: [newPendingUser, ...users],
  };
}
