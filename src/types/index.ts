export type UserRole = 'admin' | 'captain' | 'player';
export type UserStatus = 'pending' | 'approved' | 'rejected';
export type AdminActiveMode = 'admin' | 'committee';

export interface InviteToken {
  id: string;             // Benzersiz token kodu (örn: revir-admin-alper, revir-kurul-yuksel)
  name: string;           // Kime özel oluşturuldu (örn: Alper, Yüksel, Akif)
  role: UserRole;         // 'admin' | 'captain' | 'player'
  claimedPlayerId: string;// Eşleşecek kart id'si ('p1', 'p3' vb.)
  description: string;    // Açıklama
  usedByEmail?: string;   // Giriş yapan hesap
  usedAt?: string;        // Kullanıldığı tarih
  isRevoked?: boolean;    // İptal edildi mi
  createdAt: string;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  role: UserRole;
  status: UserStatus;
  claimedPlayerId?: string;
  createdAt: string;
}

export const CURRENT_STATS_SYNC_VERSION = 2;
export const CURRENT_RECORD_SYNC_VERSION = 1;

export type CardTheme = 'bronze' | 'silver' | 'gold' | 'totw' | 'inform' | 'wall' | 'revir' | 'legend' | 'bidon' | 'nostalgia';

export const isStandardCardTheme = (theme?: CardTheme): boolean =>
  !theme || theme === 'bronze' || theme === 'silver' || theme === 'gold';

export const getStandardThemeByOVR = (ovr: number): 'bronze' | 'silver' | 'gold' => {
  if (ovr <= 64) return 'bronze';
  if (ovr <= 74) return 'silver';
  return 'gold';
};

export const LEGEND_PLAYER_IDS = ['p4', 'p7', 'p9'] as const;

export const LEGEND_PLAYER_NAMES = ['ismail', 'gölcür', 'cevdet'] as const;

/**
 * Kulüp Efsaneleri yalnızca İsmail (p4), Cevdet (p7) ve Gölcür (p9)'dür.
 * Diğer oyuncular efsane seçilemez; bu üç isim ise Bronz/Gümüş/Altın sınıfına girmez ve asla Bidon seçilemez.
 */
export const isClubLegendPlayer = (player?: { id?: string; name?: string } | null): boolean => {
  if (!player) return false;
  if (player.id && (LEGEND_PLAYER_IDS as readonly string[]).includes(player.id)) {
    return true;
  }
  const normalized = (player.name || '').trim().toLocaleLowerCase('tr-TR');
  return (LEGEND_PLAYER_NAMES as readonly string[]).includes(normalized);
};

export const getDefaultCardThemeForPlayer = (
  player: { id?: string; name?: string; currentOVR: number; currentStatus?: PhysicalStatus },
  ovrOverride?: number
): CardTheme => {
  if (player.currentStatus === 'light_injury') return 'revir';
  if (isClubLegendPlayer(player)) return 'legend';
  return getStandardThemeByOVR(ovrOverride ?? player.currentOVR);
};

export const isFormerPlayer = (
  player?: Pick<Player, 'id' | 'isFormer' | 'theme'> | null
): boolean => {
  if (!player) return false;
  if (player.isFormer === false && player.theme !== 'nostalgia') return false;
  return Boolean(player.id === 'p23' || player.isFormer || player.theme === 'nostalgia');
};

export const normalizePlayerThemeAndLegend = <T extends Player>(player: T, ovrOverride?: number): T => {
  if (isFormerPlayer(player)) {
    return {
      ...player,
      isFormer: true,
      theme: player.theme === 'nostalgia' ? 'nostalgia' : (player.theme && !isStandardCardTheme(player.theme) ? player.theme : 'nostalgia'),
      isLegend: false,
    };
  }

  const isLegend = isClubLegendPlayer(player);
  if (isLegend) {
    const allowedSpecialForLegend: CardTheme[] = ['legend', 'totw', 'inform', 'wall', 'revir'];
    const nextTheme: CardTheme = allowedSpecialForLegend.includes(player.theme)
      ? player.theme
      : player.currentStatus === 'light_injury'
      ? 'revir'
      : 'legend';
    return {
      ...player,
      isLegend: true,
      theme: nextTheme,
    };
  }

  const nextTheme: CardTheme =
    player.theme === 'legend' || isStandardCardTheme(player.theme)
      ? getStandardThemeByOVR(ovrOverride ?? player.currentOVR)
      : player.theme;
  return {
    ...player,
    isLegend: false,
    theme: nextTheme,
  };
};

export type PhysicalStatus = 'full' | 'light_injury' | 'tired' | 'extra_fit';
export type PollAttendanceChoice = 'yes' | 'no';

export interface PlayerStats {
  pac: number; // Tempo / Kondisyon
  sho: number; // Şut / Bitiricilik
  pas: number; // Pas / Oyun Kurma
  dri: number; // Dribbling / Dar Alan
  def: number; // Defans / Kademe
  phy: number; // Fizik / Mücadele & Direnç
}

export type PlayStyleCategory = 'tactical' | 'status' | 'humor';

export type PlayStyle = 
  // Saha İçi Yetenek ve Taktik Rozetleri
  | 'relentless'         // Ciğersiz (Bitmeyen Kondisyon)
  | 'power_shot'         // Boru Döşeyici (Uzaktan Sert Şut)
  | 'octopus'            // Ahtapot (Kaleci Refleksi)
  | 'wall'               // Beton Duvar (Geçilmez Stoper)
  | 'poacher'            // Kampçı / İleride Bekleyen (Geriye Koşmayan Forvet)
  | 'maestro'            // Orkestra Şefi (Akıl Almaz Paslar)
  | 'trickster'          // Bel Bükücü (Dar Alanda Çalım)
  | 'speedster'          // Roket / Sprinter (Hızlı Deparcı)
  | 'first_touch'        // Mıknatıs (Yumuşak İlk Dokunuş)
  | 'tiki_taka'          // Karekod Pasör (Tek Pas Ustası)
  | 'trivela'            // Dış Füze (Ayak Dışı Vuruş)
  | 'interceptor'        // Kademe Tilkisi (Pas Arası Canavarı)
  | 'finesse_shot'       // Muz Orta (Adrese Teslim Kavisli Orta & Falso)
  | 'slide_tackler'      // Kasap Süpürücü (Sert Müdahale)
  | 'commander'          // Saha İçi Komutan (Takım İçi Lider)
  | 'ice_cold'           // Soğukkanlı Bitirici (Karşı Karşıya Affetmeyen)
  | 'late_bloomer'       // Son 15 Dakika Adamı (İkinci Yarı Açılan)
  | 'ping_pong'          // Pimponcu (Duvar Pası - 🏓)
  | 'weak_foot_wizard'   // Ters Ayak Büyücüsü (Ters Krampon - 👟)
  | 'sneaky_winger'      // Sinsi Kanat (Gölge - 👥)
  | 'box_to_box'         // İki Yönlü Ciğer (Sonsuzluk - ♾️)
  | 'press_monster'      // Baskı Canavarı (Kurt Dişi - 🐺)
  | 'key_passer'         // Kilit Açıcı (Anahtar - 🗝️)
  | 'tower_header'       // Nöbetçi Kule (Deniz Feneri - 🗼)
  | 'sponge_keeper'      // Sünger Kaleci (Yastık - 🧽)
  | 'sliding_tackle_pro' // Kayarak Müdahale (Kıvılcım - ⚡)
  | 'counter_dagger'     // Son Kontra Silahı (Hançer - 🗡️)
  | 'rabona_king'        // Rabona Şov (Ters Ayağa İnat Rabona - 🥨)
  | 'nutmeg_hunter'      // Beşlik Avcısı (Bacak Arası - 🌉)
  | 'olimpico_master'    // Kornerden Golcü (Doğrudan Kaleye - 🌪️)
  | 'sweeper_keeper'     // Libero Kaleci (Ayakla Oyun Kuran - 🏃)
  | 'bodyguard'          // Omuz Omuza (İkili Mücadele - 🦍)
  | 'no_look_pass'       // Bakmadan Pas (Şovmen Pasör - 😎)
  // Devamsızlık ve Durum Rozetleri
  | 'fragile'            // Müzmin Revirlik (Her Maç Bandajlı)
  | 'missing_person'     // Kayıp İlanı (Dedektif Rozeti - 🔍)
  | 'shift_veteran'      // Nöbet Gazisi (Stetoskop - 🩺)
  | 'whatsapp_captain'   // Kadro Organizatörü (Bildirim Zili - 🔔)
  | 'jubilee_pending'    // Jübile Bekleyen (Baston / Saat - ⏳)
  | 'crampon_borrower'   // Emanet Krampon (Ayakkabısız Gelen - 👟)
  | 'warmup_injured'     // Isınmada Sakatlanan (Maç Öncesi Sakatlık - 🩼)
  | 'last_minute_sub'    // Son Dakika Yaması (Apar Topar Yetişen - 🚑)
  // Mizahi ve Taktik Karakteristik Rozetleri
  | 'out_collector'      // Aut Koleksiyoncusu (Kuş Yuvası - 🕊️)
  | 'selfish_maestro'    // Bencil Maestro (Ayna - 🪞)
  | 'radio_striker'      // Telsiz Santrafor (Megafon - 📢)
  | 'foul_magnet'        // Faul Mıknatısı (Sedye - 🩼)
  | 'pitch_referee'      // Saha İçi Hakem (Düdük - 🪈)
  | 'baklava_sponsor'    // Baklava Sponsoru (Tatlı Çatalı - 🍰)
  | 'post_polisher'      // Direk Cilacısı (Direkten Dönen Şutlar - 🥅)
  | 'goalkeeper_curse'   // Eldiven Fobisi (Kaleye Geçmemek İçin Bahane - 🧤)
  | 'var_inspector';     // VAR Hakemi (Ben Buradan Gördüm, Faul! - 📺)

export type PreferredPosition = 'GK' | 'DEF' | 'MID' | 'FWD';

export interface PhotoAdjustments {
  x: number;      // -50% to +50%
  y: number;      // -50% to +50%
  scale: number;  // 0.8x to 3.0x
}

export interface Player {
  id: string;
  name: string;
  nickname: string;
  pendingNickname?: string; // Kullanıcı tarafından değiştirilmiş, yönetici onayı bekleyen lakap
  isLegend?: boolean; // Sadece yönetici tarafından atanabilen kulüp efsanesi unvanı (Bidon olamaz, MVP/Ateş Ediyo!/Revir olabilir)
  isFormer?: boolean; // Kulüpten sonradan ayrılmış/çıkarılmış eski üye
  inFormAwardedAt?: number; // Ateş Ediyo! kartının atandığı timestamp (en fazla 3 kişi: 4. seçildiğinde en eski olan düşer)
  position: PreferredPosition;
  secondaryPositions?: PreferredPosition[]; // Ek mevkiler (ana mevki hariç, en fazla 2). Sadece Kurul/Yönetici belirler.
  number: number;
  photoUrl: string;
  photoAdjustments?: PhotoAdjustments;
  nationality?: string; // Country code e.g. 'tr', 'de', 'br'
  nationName?: string;  // e.g. 'Türkiye', 'Almanya'
  flagUrl?: string;     // Specific flag url
  clubId?: string;      // Club id e.g. 'revir_fc', 'galatasaray', 'real_madrid'
  clubName?: string;    // e.g. 'Revir FC', 'Galatasaray'
  clubLogoUrl?: string; // Specific club logo url
  baseOVR: number;
  exactOVR?: number; // Gizli ondalıklı OVR (yuvarlama ölü bandını önler)
  currentOVR: number;
  baseStats?: PlayerStats; // Kök Kurul statları (haftalık maçlarda kümülatif stat erimesini önler)
  stats: PlayerStats;
  adminStatOverride?: boolean; // Yönetici Modu ile stat/OVR manuel sabitlendiğinde true; kurul senkronu bu oyuncuyu ezmez
  adminStatOverrideAt?: number; // Son yönetici manuel stat müdahalesi zamanı
  statsSyncVersion?: number; // Başlangıç stat/matchDelta sıfırlama migrasyon versiyonu
  recordSyncVersion?: number; // Resmi maç/galibiyet/mağlubiyet geçmişi senkron versiyonu
  theme: CardTheme;
  playstyles: PlayStyle[];
  ownPlaystyle?: PlayStyle | null;
  committeePlaystyle?: PlayStyle | null;
  committeePlaystyleVotes?: Record<string, { style: PlayStyle; updatedAt: number }>;
  seniorityRank?: number;
  lastMatchSummary?: {
    matchTitle: string;
    matchScore10: number;
    matchScore100: number;
    prevOVR: number;
    newOVR: number;
    deltaOVR: number;
    updatedAt: string;
  };
  matchesPlayed: number;
  wins: number;
  draws: number;
  losses: number;
  goals: number;
  assists: number;
  egoIndex: number; // Self rating minus field average rating
  formTrend: 'up' | 'down' | 'stable';
  bestPartnerId?: string;
  worstPartnerId?: string;
  currentStatus?: PhysicalStatus;
}

export const DEFAULT_SENIORITY_NAMES = [
  'gölcür',
  'ismail',
  'alper',
  'akif',
  'harun',
  'mustafa',
  'sefa',
  'ferhun',
  'ömer',
  'ismet',
  'elber',
  'metin',
  'cevdet',
  'can',
  'yüksel',
  'selahattin',
  'mahmut',
  'orhan',
  'baran',
  'turap',
  'yusuf',
  'sönmez',
  'korkmaz',
] as const;

export const getPlayerSeniorityRank = (player?: { seniorityRank?: number; name?: string } | null): number => {
  if (!player) return 999;
  if (typeof player.seniorityRank === 'number' && Number.isFinite(player.seniorityRank) && player.seniorityRank > 0) {
    return player.seniorityRank;
  }
  const normalized = (player.name || '').trim().toLocaleLowerCase('tr-TR');
  const idx = (DEFAULT_SENIORITY_NAMES as readonly string[]).indexOf(normalized);
  return idx >= 0 ? idx + 1 : 999;
};

export const computeCommitteeSlot2FromVotes = (
  votes?: Record<string, { style: PlayStyle; updatedAt: number }>,
  excludeEvaluator?: string
): PlayStyle | undefined => {
  if (!votes) return undefined;
  const entries = Object.entries(votes).filter(
    ([evaluator]) =>
      !excludeEvaluator ||
      evaluator.trim().toLocaleLowerCase('tr-TR') !== excludeEvaluator.trim().toLocaleLowerCase('tr-TR')
  );
  if (entries.length === 0) return undefined;

  const counts = new Map<PlayStyle, { count: number; latestAt: number }>();
  for (const [, vote] of entries) {
    if (!vote?.style) continue;
    const prev = counts.get(vote.style);
    if (prev) {
      counts.set(vote.style, {
        count: prev.count + 1,
        latestAt: Math.max(prev.latestAt, vote.updatedAt || 0),
      });
    } else {
      counts.set(vote.style, { count: 1, latestAt: vote.updatedAt || 0 });
    }
  }

  // If 2 or more committee members selected the same PlayStyle -> majority wins
  let majorityStyle: PlayStyle | undefined;
  let majorityLatest = -1;
  let highestCount = 0;
  for (const [style, info] of counts.entries()) {
    if (info.count >= 2 && (info.count > highestCount || (info.count === highestCount && info.latestAt > majorityLatest))) {
      majorityStyle = style;
      highestCount = info.count;
      majorityLatest = info.latestAt;
    }
  }
  if (majorityStyle) return majorityStyle;

  // Otherwise most recently selected PlayStyle wins
  let latestStyle: PlayStyle | undefined;
  let maxUpdatedAt = -1;
  for (const [, vote] of entries) {
    if (vote?.style && (vote.updatedAt || 0) >= maxUpdatedAt) {
      maxUpdatedAt = vote.updatedAt || 0;
      latestStyle = vote.style;
    }
  }
  return latestStyle;
};

export const resolvePlayerPlaystyleSlots = (
  player?: Pick<Player, 'playstyles' | 'ownPlaystyle' | 'committeePlaystyle'> | null
): { slot1?: PlayStyle; slot2?: PlayStyle; combined: PlayStyle[] } => {
  if (!player) return { slot1: undefined, slot2: undefined, combined: [] };
  const slot2: PlayStyle | undefined =
    player.committeePlaystyle !== undefined
      ? player.committeePlaystyle || undefined
      : player.playstyles?.[1];
  let slot1: PlayStyle | undefined =
    player.ownPlaystyle !== undefined
      ? player.ownPlaystyle || undefined
      : player.playstyles?.[0];

  // If Committee selected the same PlayStyle as Player's Slot 1, it moves/stays in Slot 2 and Slot 1 drops empty.
  if (slot1 && slot2 && slot1 === slot2) {
    slot1 = undefined;
  }

  const combined: PlayStyle[] = [];
  if (slot1) combined.push(slot1);
  if (slot2 && slot2 !== slot1) combined.push(slot2);

  return { slot1, slot2, combined };
};

export const shiftPlayerStatsByDelta = (baseStats: PlayerStats, delta: number): PlayerStats => {
  if (!delta) return { ...baseStats };
  const clamp = (val: number) => Math.min(99, Math.max(40, Math.round(val + delta)));
  return {
    pac: clamp(baseStats.pac),
    sho: clamp(baseStats.sho),
    pas: clamp(baseStats.pas),
    dri: clamp(baseStats.dri),
    def: clamp(baseStats.def),
    phy: clamp(baseStats.phy),
  };
};

/**
 * Oyuncunun kök statlarını döndürür; eski kayıtlarda baseStats henüz yoksa mevcut statlardan geriye türetir.
 */
export const resolvePlayerBaseStats = (
  player: Pick<Player, 'stats' | 'baseStats' | 'baseOVR' | 'currentOVR'>
): PlayerStats => {
  if (player.baseStats) return { ...player.baseStats };
  const currentDelta = Math.round((player.currentOVR ?? player.baseOVR) - player.baseOVR);
  return shiftPlayerStatsByDelta(player.stats, -currentDelta);
};

export interface CheckInEntry {
  playerId: string;
  timestamp: number;
  status: PhysicalStatus;
  note?: string;
  attendance?: PollAttendanceChoice;
  canPayPitchFee?: boolean;
  canBringTea?: boolean;
}

export type TacticalFormation = '2-2-1' | '2-1-2';

export interface MatchSquad {
  name: string;
  color: 'green' | 'white' | 'red' | 'blue';
  formation?: TacticalFormation;
  players: {
    player: Player;
    effectiveStats: PlayerStats;
    effectiveOVR: number;
    assignedRole: PreferredPosition;
  }[];
  totalOVR: number;
  avgPAC: number;
  avgDEF: number;
}

export interface MatchScore {
  teamA: number;
  teamB: number;
}

export interface MatchRatingVote {
  raterPlayerId: string;
  targetPlayerId: string;
  score: number; // 1-10
  mücadeleScore?: number;
  teknikScore?: number;
  comment?: string;
  isAnonymous?: boolean;
}

export interface MatchBallot {
  raterId: string;
  mvpId?: string;
  wallId?: string;
  bidonId?: string; // empty or undefined if "Bu Hafta Bidon Yok"
  submittedAt: string;
}

export type MatchWinnerTeam = 'A' | 'B' | 'draw';

export interface MatchAwards {
  mvpId?: string;          // Haftanın MVP Kartı (Tekil)
  wallId?: string;         // Etten Duvar (En İyi Savunma/GK)
  bidonId?: string;        // Haftanın Bidonu (Opsiyonel / Tekil)
  inFormIds?: string[];    // Kurul tarafından atanan Ateş Ediyo! Kartları (Maksimum 3)
  winnerTeam?: MatchWinnerTeam; // Maç sonucu: 'A' (Yeşil Takım), 'B' (Beyaz Takım), 'draw' (Berabere)
  isConfirmedByCommittee?: boolean; // Kurul Son Mührü basıldı mı?
  confirmedAt?: string;
  confirmedBy?: string;
  updatedAt?: string;
  updatedBy?: string;
}

export interface Match {
  id: string;
  title: string;
  date: string;
  matchTime?: string;
  pitchName: string;
  pitchLocationUrl?: string;
  pitchFee?: string;
  pitchFeePayerId?: string;
  pitchFeeVolunteerIds?: string[];
  teaVolunteerIds?: string[];
  teaBringerId?: string;
  stage: 'check_in' | 'balancing' | 'rating' | 'archived';
  starters: string[]; // Player IDs (max 12)
  waitlist: string[]; // Player IDs (13+)
  absentees?: string[]; // Bu hafta gelemeyeceğim diyen oyuncular
  checkIns: Record<string, CheckInEntry>;
  pollOpenedBy?: string;
  pollOpenedAt?: string;
  isPollOpen?: boolean;
  ratingOpenedManually?: boolean;
  ratingOpenedBy?: string;
  ratingOpenedAt?: string;
  teamA?: MatchSquad;
  teamB?: MatchSquad;
  score?: MatchScore;
  awards?: MatchAwards;
  ratings?: MatchRatingVote[];
  ballots?: MatchBallot[];
  tacticalNotes?: string;
  fairnessRating?: number;
  altTeamA?: MatchSquad;
  altTeamB?: MatchSquad;
  altFairnessRating?: number;
  selectedLineupOption?: 1 | 2;
  baselineOVRs?: Record<string, number>;
  baselineExactOVRs?: Record<string, number>;
  statsApplied?: {
    starterIds: string[];
    winnerPlayerIds: string[];
    winnerTeam?: MatchWinnerTeam;
  };
  manualEvaluation?: {
    isManualWhatsAppMatch: boolean;
    critiqueTitle: string;
    defSummary: string;
    roleDistributionSummary: string;
    injuryFormSummary: string;
    bullets: string[];
  };
}

export const LOCKER_EDIT_WINDOW_MS = 15 * 60 * 1000; // WhatsApp gibi 15 dakika düzenleme süresi
export const LOCKER_DELETE_WINDOW_MS = 48 * 60 * 60 * 1000; // 48 saat içinde Herkesten Sil

export interface LockerComment {
  id: string;
  authorPlayerId: string;
  authorName: string;
  authorPhoto?: string;
  text: string;
  createdAt: string;
  editedAt?: string;
  isDeleted?: boolean;
  deletedAt?: string;
  deletedBy?: 'author' | 'committee';
}

export interface LockerPost {
  id: string;
  matchId?: string;
  authorPlayerId: string;
  authorName: string;
  authorPhoto?: string;
  text: string;
  imageUrl?: string;
  matchTitle?: string;
  taggedPlayerIds?: string[];
  isAnonymous: boolean;
  isHeadline?: boolean;
  reactions: {
    fire: string[];     // 🔥
    laugh: string[];    // 😂
    violin: string[];   // 🎻
    revir: string[];    // 🚑
    goat: string[];     // 🐐
  };
  emojiReactions?: Record<string, string[]>;
  comments?: LockerComment[];
  createdAt: string;
  editedAt?: string;
  isDeleted?: boolean;
  deletedAt?: string;
  deletedBy?: 'author' | 'committee';
}

export interface PhotoArchiveItem {
  id: string;
  matchId: string;
  matchTitle: string;
  imageUrl: string;
  caption: string;
  taggedPlayerIds: string[];
  likes: string[];
  emojiReactions?: Record<string, string[]>;
  comments?: LockerComment[];
  isHeadline?: boolean;
  authorPlayerId?: string;
  uploadedBy: string;
  createdAt: string;
  editedAt?: string;
  isDeleted?: boolean;
  isPurged?: boolean;
  deletedAt?: string;
  deletedBy?: 'author' | 'committee';
}

export interface DessertDebt {
  id: string;
  debtorPlayerId: string;
  description: string;
  treatType: 'baklava' | 'çay' | 'kebap' | 'soğuk_içecek';
  status: 'pending' | 'paid';
  createdAt: string;
}

export type GoalkeeperWillingness = 'yes' | 'emergency_only' | 'never';

export interface PlayerScoutingEntry {
  playerId: string;
  evaluatorName: string;
  pac: number; // 1 - 10
  sho: number;
  pas: number;
  dri: number;
  def: number;
  phy: number;
  gkRole: GoalkeeperWillingness;
  playstyles: PlayStyle[];
  secretNote?: string;
  updatedAt: string;
}

export interface CommitteeConsensus {
  playerId: string;
  avgPac: number;
  avgSho: number;
  avgPas: number;
  avgDri: number;
  avgDef: number;
  avgPhy: number;
  calculatedOVR: number;
  votesCount: number;
  gkScore: { yes: number; emergency: number; never: number };
  popularPlaystyles: PlayStyle[];
  notes: { evaluator: string; note: string }[];
}
