export type UserRole = 'admin' | 'captain' | 'player';
export type UserStatus = 'pending' | 'approved' | 'rejected';

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

export type CardTheme = 'gold' | 'totw' | 'inform' | 'revir' | 'legend' | 'bidon';

export type PhysicalStatus = 'full' | 'light_injury' | 'tired' | 'extra_fit';

export interface PlayerStats {
  pac: number; // Tempo / Kondisyon
  sho: number; // Şut / Bitiricilik
  pas: number; // Pas / Oyun Kurma
  dri: number; // Dribbling / Dar Alan
  def: number; // Defans / Kademe
  phy: number; // Fizik / Mücadele & Direnç
}

export type PlayStyle = 
  | 'relentless'    // Ciğersiz (Bitmeyen Kondisyon)
  | 'power_shot'    // Balyoz (Uzaktan Şut)
  | 'octopus'       // Ahtapot (Kaleci Refleksi)
  | 'wall'          // Beton Duvar (Geçilmez Stoper)
  | 'poacher'       // Kampçı / İleride Bekleyen (Geriye Koşmayan Forvet)
  | 'maestro'       // Orkestra Şefi (Akıl Almaz Paslar)
  | 'trickster'     // Ayak Tenisçisi (Dar Alanda Çalım)
  | 'speedster'     // Roket / Sprinter (Hızlı Deparcı)
  | 'first_touch'   // Mıknatıs (Yumuşak İlk Dokunuş)
  | 'tiki_taka'     // Karekod Pasör (Tek Pas Ustası)
  | 'trivela'       // Dış Füze (Ayak Dışı Vuruş)
  | 'interceptor'   // Kademe Tilkisi (Pas Arası Canavarı)
  | 'finesse_shot'  // Falso Ustası (Plase Vuruş)
  | 'slide_tackler' // Kasap Süpürücü (Sert Müdahale)
  | 'commander'     // Saha İçi Komutan (Bağıran Kaptan)
  | 'ice_cold'      // Soğukkanlı Bitirici (Karşı Karşıya Affetmeyen)
  | 'late_bloomer'  // Son 15 Dakika Adamı (İkinci Yarı Açılan)
  | 'fragile';      // Müzmin Revirlik (Her Maç Bandajlı);

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
  position: PreferredPosition;
  number: number;
  photoUrl: string;
  photoAdjustments?: PhotoAdjustments;
  baseOVR: number;
  currentOVR: number;
  stats: PlayerStats;
  theme: CardTheme;
  playstyles: PlayStyle[];
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

export interface CheckInEntry {
  playerId: string;
  timestamp: number;
  status: PhysicalStatus;
  note?: string;
}

export interface MatchSquad {
  name: string;
  color: 'green' | 'white' | 'red' | 'blue';
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

export interface MatchAwards {
  mvpId?: string;       // Haftanın TOTW Kartı
  wallId?: string;      // Etten Duvar
  bidonId?: string;     // Günün Bidonu
}

export interface Match {
  id: string;
  title: string;
  date: string;
  pitchName: string;
  stage: 'check_in' | 'balancing' | 'rating' | 'archived';
  starters: string[]; // Player IDs (max 12)
  waitlist: string[]; // Player IDs (13+)
  checkIns: Record<string, CheckInEntry>;
  teamA?: MatchSquad;
  teamB?: MatchSquad;
  score?: MatchScore;
  awards?: MatchAwards;
  ratings?: MatchRatingVote[];
  tacticalNotes?: string;
}

export interface LockerPost {
  id: string;
  matchId?: string;
  authorPlayerId: string;
  authorName: string;
  authorPhoto?: string;
  text: string;
  isAnonymous: boolean;
  isHeadline?: boolean;
  reactions: {
    fire: string[];     // 🔥
    laugh: string[];    // 😂
    violin: string[];   // 🎻
    revir: string[];    // 🚑
    goat: string[];     // 🐐
  };
  createdAt: string;
}

export interface PhotoArchiveItem {
  id: string;
  matchId: string;
  matchTitle: string;
  imageUrl: string;
  caption: string;
  taggedPlayerIds: string[];
  likes: string[];
  uploadedBy: string;
  createdAt: string;
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
