import React, { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import {
  Player,
  CardTheme,
  Match,
  MatchSquad,
  PhysicalStatus,
  LockerPost,
  PhotoArchiveItem,
  DessertDebt,
  CheckInEntry,
  MatchRatingVote,
  MatchAwards,
  MatchBallot,
  PlayerScoutingEntry,
  PollAttendanceChoice,
  LockerComment,
  LOCKER_EDIT_WINDOW_MS,
  LOCKER_DELETE_WINDOW_MS,
  CURRENT_STATS_SYNC_VERSION,
  CURRENT_RECORD_SYNC_VERSION,
  isClubLegendPlayer,
  isFormerPlayer,
  getDefaultCardThemeForPlayer,
  normalizePlayerThemeAndLegend,
  shiftPlayerStatsByDelta,
} from './types';
import {
  INITIAL_PLAYERS,
  INITIAL_SCOUTING_ENTRIES,
  COMMITTEE_MEMBERS,
  MOCK_ACTIVE_MATCH,
  PAST_MATCHES,
  MOCK_POSTS,
  MOCK_PHOTOS,
  MOCK_DEBTS,
  isFounderAdminEmail,
} from './services/mockData';
import {
  run462BalancingAlgorithm,
  computeEffectivePlayer,
  recomputeSquadTotals,
  applySeniorityToSquadPair,
} from './services/balancingEngine';
import { applyMatchRatingsToSquad, getVerbalRatingOption } from './services/ratingEngine';
import { getMatchLifecycleFlags } from './services/matchLifecycle';
import { computePlayerRecordsFromMatches } from './services/pastMatchesData';
import { safeSetItem, STORAGE_ERROR_EVENT } from './services/safeStorage';
import { externalizeImages, hydrateImages, isIdbRef } from './services/photoStore';
import { getAccess } from './services/permissions';
import { isFirebaseConfigured } from './services/firebase';
import {
  savePlayerToCloud,
  savePlayerToCloudWithResult,
  savePlayersBatchToCloud,
  saveScoutingToCloud,
  seedPlayersIfEmpty,
  subscribeToPlayers,
  subscribeToScouting,
  saveMatchToCloud,
  mutateMatchInCloud,
  subscribeToMatch,
  savePastMatchesToCloud,
  subscribeToPastMatches,
  mutatePostsInCloud,
  subscribeToPosts,
  saveDebtsToCloud,
  upsertBidonDebtInCloud,
  subscribeToDebts,
  savePhotoItemToCloud,
  mutatePhotoItemInCloud,
  subscribeToPhotos,
  fetchInviteFromCloud,
  fetchInviteStateFromCloud,
  saveInviteToCloud,
  subscribeToInvites,
  setCloudSandboxMode,
  CURRENT_SCOUTING_SYNC_VERSION,
} from './services/cloudSync';
import {
  createInitialSandboxState,
  simulateRandomPollCheckIns,
  simulatePostMatchRatings,
  simulateFullCommitteeScouting,
  simulateSamplePendingApprovals,
} from './services/sandboxService';

import { Navbar, NavTab } from './components/layout/Navbar';
import { SquadCardGallery } from './components/card/SquadCardGallery';
import { TestModeControlBar } from './components/admin/TestModeControlBar';
import { findInviteById, getSavedInvites, saveInvites, isExcludedAdminInvite, clearSandboxInvites } from './services/inviteService';
import { InviteToken } from './types';
import type { PollConfigPayload } from './components/checkin/SquadList';
import { Lock, Clock, Vote, FlaskConical, Trophy, ShieldCheck, CheckCircle2 } from 'lucide-react';

const FirebaseSetupModal = lazy(() =>
  import('./components/layout/FirebaseSetupModal').then((m) => ({ default: m.FirebaseSetupModal }))
);
const CardCustomizer = lazy(() =>
  import('./components/card/CardCustomizer').then((m) => ({ default: m.CardCustomizer }))
);
const SquadList = lazy(() =>
  import('./components/checkin/SquadList').then((m) => ({ default: m.SquadList }))
);
const CheckInModal = lazy(() =>
  import('./components/checkin/CheckInModal').then((m) => ({ default: m.CheckInModal }))
);
const TacticalPitch = lazy(() =>
  import('./components/match/TacticalPitch').then((m) => ({ default: m.TacticalPitch }))
);
const MatchRatingModal = lazy(() =>
  import('./components/rating/MatchRatingModal').then((m) => ({ default: m.MatchRatingModal }))
);
const CommitteeDecisionModal = lazy(() =>
  import('./components/rating/CommitteeDecisionModal').then((m) => ({ default: m.CommitteeDecisionModal }))
);
const LockerRoomFeed = lazy(() =>
  import('./components/locker/LockerRoomFeed').then((m) => ({ default: m.LockerRoomFeed }))
);
const ChemistryMatrix = lazy(() =>
  import('./components/stats/ChemistryMatrix').then((m) => ({ default: m.ChemistryMatrix }))
);
const EgoIndexCard = lazy(() =>
  import('./components/stats/EgoIndexCard').then((m) => ({ default: m.EgoIndexCard }))
);
const DessertLedger = lazy(() =>
  import('./components/stats/DessertLedger').then((m) => ({ default: m.DessertLedger }))
);
const AdminApprovalPanel = lazy(() =>
  import('./components/admin/AdminApprovalPanel').then((m) => ({ default: m.AdminApprovalPanel }))
);
const InviteManagerModal = lazy(() =>
  import('./components/admin/InviteManagerModal').then((m) => ({ default: m.InviteManagerModal }))
);
const SeniorityManagerPanel = lazy(() =>
  import('./components/admin/SeniorityManagerPanel').then((m) => ({ default: m.SeniorityManagerPanel }))
);
const AuthModal = lazy(() =>
  import('./components/auth/AuthModal').then((m) => ({ default: m.AuthModal }))
);
const ScoutingWizard = lazy(() =>
  import('./components/scouting/ScoutingWizard').then((m) => ({ default: m.ScoutingWizard }))
);
const ScoutingAdminDashboard = lazy(() =>
  import('./components/scouting/ScoutingAdminDashboard').then((m) => ({ default: m.ScoutingAdminDashboard }))
);
const ReminderHubModal = lazy(() =>
  import('./components/reminder/ReminderHubModal').then((m) => ({ default: m.ReminderHubModal }))
);

const TabLoadingFallback = () => (
  <div className="bg-neutral-900/70 border border-neutral-800 rounded-3xl p-10 text-center text-xs text-neutral-400">
    Yükleniyor...
  </div>
);

function MainApp() {
  const {
    currentUser,
    realCurrentUser,
    allUsers,
    approveUser,
    rejectUser,
    adminMode,
    setAdminMode,
    setSandboxUsers,
    isTestMode,
    canUseTestMode,
    canTestAdminView,
    testRoleView,
    enterTestMode,
    exitTestMode,
    switchTestPersona,
  } = useAuth();
  const currentUserRef = useRef(currentUser);
  currentUserRef.current = currentUser;
  const isTestModeRef = useRef(isTestMode);
  isTestModeRef.current = isTestMode;
  const realSnapshotRef = useRef<{
    players: Player[];
    match: Match;
    posts: LockerPost[];
    photos: PhotoArchiveItem[];
    debts: DessertDebt[];
    scoutingEntries: PlayerScoutingEntry[];
  } | null>(null);
  const pushedPhotoIdsRef = useRef<Set<string>>(new Set());
  const pendingPhotoPushIdsRef = useRef<Set<string>>(new Set());
  const pendingLocalPlayerSavesRef = useRef<Map<string, number>>(new Map());
  const [hasInitialLocalCache] = useState<boolean>(() => {
    try {
      return Boolean(
        localStorage.getItem('revirfc_players_v11') ||
        localStorage.getItem('revirfc_players_v10') ||
        localStorage.getItem('revirfc_players_v9')
      );
    } catch {
      return false;
    }
  });
  const [isInitialCloudReady, setIsInitialCloudReady] = useState<boolean>(
    () => !isFirebaseConfigured || hasInitialLocalCache
  );

  // Local state persisted in localStorage (version 11: forced reset to clean INITIAL_PLAYERS statsSyncVersion=2)
  const [players, setPlayers] = useState<Player[]>(() => {
    try {
      localStorage.removeItem('revirfc_players_v1');
      localStorage.removeItem('revirfc_players_v2');
      localStorage.removeItem('revirfc_players_v3');
      localStorage.removeItem('revirfc_players_v4');
      localStorage.removeItem('revirfc_players_v5');
      localStorage.removeItem('revirfc_players_v6');
      localStorage.removeItem('revirfc_players_v7');
      localStorage.removeItem('revirfc_players_v8');
    } catch {}

    const savedV11 = localStorage.getItem('revirfc_players_v11');
    const savedV10 = !savedV11 ? localStorage.getItem('revirfc_players_v10') : null;
    const savedV9 = !savedV11 && !savedV10 ? localStorage.getItem('revirfc_players_v9') : null;
    if (savedV10 || savedV9) {
      try {
        localStorage.removeItem('revirfc_players_v10');
        localStorage.removeItem('revirfc_players_v9');
      } catch {}
    }
    const saved = savedV11 || savedV10 || savedV9;
    if (!saved) {
      return INITIAL_PLAYERS.map((p) =>
        normalizePlayerThemeAndLegend({
          ...p,
          statsSyncVersion: CURRENT_STATS_SYNC_VERSION,
          recordSyncVersion: CURRENT_RECORD_SYNC_VERSION,
        })
      );
    }
    try {
      const parsed: Player[] = JSON.parse(saved);
      const isMigratingToV11 = Boolean(!savedV11 && (savedV10 || savedV9));
      const parsedMap = new Map(parsed.map((p) => [p.id, p]));
      const restored = INITIAL_PLAYERS.map((initP) => {
        const existing = parsedMap.get(initP.id);
        if (!existing) {
          return normalizePlayerThemeAndLegend({
            ...initP,
            statsSyncVersion: CURRENT_STATS_SYNC_VERSION,
            recordSyncVersion: CURRENT_RECORD_SYNC_VERSION,
          });
        }

        const userHasCustomPhoto =
          existing.photoUrl &&
          existing.photoUrl !== '/logo.jpg' &&
          (existing.photoUrl.startsWith('data:image/') || isIdbRef(existing.photoUrl));

        const resetStatsFields = isMigratingToV11
          ? {
              baseOVR: initP.baseOVR,
              currentOVR: initP.currentOVR,
              stats: initP.stats,
              lastMatchSummary: undefined,
              adminStatOverride: false,
              adminStatOverrideAt: undefined,
              statsSyncVersion: CURRENT_STATS_SYNC_VERSION,
            }
          : {
              statsSyncVersion: existing.statsSyncVersion ?? CURRENT_STATS_SYNC_VERSION,
            };

        const isMigratingRecord = (existing.recordSyncVersion ?? 0) < CURRENT_RECORD_SYNC_VERSION;
        const resetRecordFields = isMigratingRecord
          ? {
              matchesPlayed: initP.matchesPlayed,
              wins: initP.wins,
              draws: initP.draws,
              losses: initP.losses,
              recordSyncVersion: CURRENT_RECORD_SYNC_VERSION,
            }
          : {
              recordSyncVersion: existing.recordSyncVersion ?? CURRENT_RECORD_SYNC_VERSION,
            };

        return normalizePlayerThemeAndLegend({
          ...initP,
          ...existing,
          ...resetStatsFields,
          ...resetRecordFields,
          photoUrl: userHasCustomPhoto ? existing.photoUrl : (existing.photoUrl || initP.photoUrl),
          photoAdjustments: existing.photoAdjustments || initP.photoAdjustments,
          theme: existing.theme || initP.theme,
        });
      });
      return restored;
    } catch {
      return INITIAL_PLAYERS.map((p) =>
        normalizePlayerThemeAndLegend({
          ...p,
          statsSyncVersion: CURRENT_STATS_SYNC_VERSION,
          recordSyncVersion: CURRENT_RECORD_SYNC_VERSION,
        })
      );
    }
  });

  const [match, setMatch] = useState<Match>(() => {
    try {
      localStorage.removeItem('revirfc_match_v1');
      localStorage.removeItem('revirfc_match_v2');
      localStorage.removeItem('revirfc_match_v3');
      localStorage.removeItem('revirfc_match_v4');
    } catch {}

    const saved = localStorage.getItem('revirfc_match_v5');
    if (saved) {
      try {
        const parsed: Match = JSON.parse(saved);
        const isLegacyPreV9 =
          !parsed ||
          !parsed.id ||
          /^match-[1-8]$/.test(parsed.id) ||
          Boolean(parsed.title?.includes('8. Hafta'));
        if (!isLegacyPreV9 && Array.isArray(parsed.starters)) {
          const normalizedParsed: Match = {
            ...parsed,
            absentees: parsed.absentees || [],
            pitchFeeVolunteerIds: parsed.pitchFeeVolunteerIds || [],
            teaVolunteerIds: parsed.teaVolunteerIds || [],
            checkIns: parsed.checkIns || {},
            isPollOpen: parsed.isPollOpen ?? false,
          };
          return normalizedParsed;
        }
      } catch {}
    }

    return MOCK_ACTIVE_MATCH;
  });

  const normalizeSquadJerseyName = (squad?: MatchSquad): MatchSquad | undefined => {
    if (!squad) return undefined;
    if (squad.name?.startsWith('Yeşil')) {
      return { ...squad, name: 'Yelekli', color: 'green' };
    }
    if (squad.name?.startsWith('Beyaz')) {
      return { ...squad, name: 'Yeleksiz', color: 'white' };
    }
    return squad;
  };

  const normalizeMatchJerseyNames = (m: Match): Match => ({
    ...m,
    teamA: normalizeSquadJerseyName(m.teamA),
    teamB: normalizeSquadJerseyName(m.teamB),
    altTeamA: normalizeSquadJerseyName(m.altTeamA),
    altTeamB: normalizeSquadJerseyName(m.altTeamB),
  });

  const [pastMatches, setPastMatches] = useState<Match[]>(() => {
    try {
      const saved = localStorage.getItem('revirfc_past_matches_v1');
      if (saved) {
        const parsed: Match[] = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length >= 8) {
          return parsed.map(normalizeMatchJerseyNames);
        }
      }
    } catch {}
    return PAST_MATCHES.map(normalizeMatchJerseyNames);
  });

  useEffect(() => {
    safeSetItem('revirfc_past_matches_v1', JSON.stringify(pastMatches));
  }, [pastMatches]);

  useEffect(() => {
    const unsubscribe = subscribeToPastMatches((cloudMatches) => {
      if (cloudMatches && cloudMatches.length >= 8) {
        setPastMatches(cloudMatches.map(normalizeMatchJerseyNames));
      }
    });
    return () => unsubscribe();
  }, []);

  const handleUpdatePastMatch = (updatedMatch: Match) => {
    if (!isAdminAccount && !isSuperAdmin) return;
    setPastMatches((prev) => {
      const next = prev.map((m) => (m.id === updatedMatch.id ? updatedMatch : m));
      savePastMatchesToCloud(next);
      const records = computePlayerRecordsFromMatches(next);
      const activeApplied = match.statsApplied;
      const activeStarterSet = new Set(activeApplied?.starterIds || []);
      const activeWinnerSet = new Set(activeApplied?.winnerPlayerIds || []);
      const activeHasWinner = activeApplied?.winnerTeam === 'A' || activeApplied?.winnerTeam === 'B';
      setPlayers((currPlayers) => {
        const syncedPlayers = currPlayers.map((p) => {
          const rec = records[p.id] || { matchesPlayed: 0, wins: 0, draws: 0, losses: 0 };
          const activePlayed = activeStarterSet.has(p.id) ? 1 : 0;
          const activeWin = activeWinnerSet.has(p.id) ? 1 : 0;
          const activeLoss = activeHasWinner && activeStarterSet.has(p.id) && !activeWinnerSet.has(p.id) ? 1 : 0;
          return {
            ...p,
            matchesPlayed: rec.matchesPlayed + activePlayed,
            wins: rec.wins + activeWin,
            draws: rec.draws,
            losses: rec.losses + activeLoss,
            recordSyncVersion: CURRENT_RECORD_SYNC_VERSION,
          };
        });
        playersRef.current = syncedPlayers;
        queueMicrotask(() => savePlayersBatchToCloud(syncedPlayers));
        return syncedPlayers;
      });
      return next;
    });
  };

  const [posts, setPosts] = useState<LockerPost[]>(() => {
    try {
      localStorage.removeItem('revirfc_posts_v1');
      localStorage.removeItem('revirfc_posts_v2');
      localStorage.removeItem('revirfc_posts_v3');
      localStorage.removeItem('revirfc_posts_v4');
    } catch {}
    const saved = localStorage.getItem('revirfc_posts_v5');
    if (saved) {
      try {
        const parsed: LockerPost[] = JSON.parse(saved);
        if (
          Array.isArray(parsed) &&
          parsed.length > 0 &&
          !parsed.some((p) => p.text?.includes('Taktik Tahtası Açıldı') || (p as any).content?.includes('Taktik Tahtası Açıldı'))
        ) {
          return parsed;
        }
      } catch {}
    }
    return MOCK_POSTS;
  });

  const [ownAnonPostIds, setOwnAnonPostIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('revirfc_own_anon_posts_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return [];
  });

  const [photos, setPhotos] = useState<PhotoArchiveItem[]>(() => {
    try {
      localStorage.removeItem('revirfc_photos_v1');
      localStorage.removeItem('revirfc_photos_v2');
      localStorage.removeItem('revirfc_photos_v3');
      localStorage.removeItem('revirfc_photos_v4');
    } catch {}
    const saved = localStorage.getItem('revirfc_photos_v5');
    if (saved) {
      try {
        const parsed: PhotoArchiveItem[] = JSON.parse(saved);
        if (
          Array.isArray(parsed) &&
          parsed.length > 0 &&
          !parsed.some((p) => p.caption?.includes('Galibiyet Sevinci') || p.imageUrl?.includes('unsplash'))
        ) {
          return parsed;
        }
      } catch {}
    }
    return MOCK_PHOTOS;
  });

  const [debts, setDebts] = useState<DessertDebt[]>(() => {
    try {
      localStorage.removeItem('revirfc_debts_v1');
      localStorage.removeItem('revirfc_debts_v2');
      localStorage.removeItem('revirfc_debts_v3');
      localStorage.removeItem('revirfc_debts_v4');
    } catch {}
    const saved = localStorage.getItem('revirfc_debts_v5');
    if (saved) {
      try {
        const parsed: DessertDebt[] = JSON.parse(saved);
        if (
          Array.isArray(parsed) &&
          parsed.length > 0 &&
          !parsed.some((d) => d.description?.includes('Günün Bidonu seçildi + iddia kaybı'))
        ) {
          return parsed;
        }
      } catch {}
    }
    return MOCK_DEBTS;
  });

  const [activeTab, setActiveTab] = useState<NavTab>(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get('tab') === 'scouting' || url.searchParams.get('kurul')) {
      return 'scouting';
    }
    return 'squad';
  });

  // Scouting committee state
  const [evaluatorName, setEvaluatorName] = useState<string>(() => {
    const url = new URL(window.location.href);
    const param = url.searchParams.get('kurul');
    if (param) return param;
    return currentUser?.displayName?.split(' ')[0] || 'Alper';
  });

  const [scoutingView, setScoutingView] = useState<'wizard' | 'dashboard'>('wizard');

  const savedScoutingEntriesRef = useRef<PlayerScoutingEntry[]>([]);

  const [savedScoutingEntries, setSavedScoutingEntries] = useState<PlayerScoutingEntry[]>(() => {
    try {
      localStorage.removeItem('revirfc_scouting_v1');
      localStorage.removeItem('revirfc_scouting_v2');
      localStorage.removeItem('revirfc_scouting_v3');
      localStorage.removeItem('revirfc_scouting_v4');
      localStorage.removeItem('revirfc_scouting_v5');
      const saved = localStorage.getItem('revirfc_scouting_v6');
      if (saved) {
        const parsed: PlayerScoutingEntry[] = JSON.parse(saved);
        // Merge with initial entries to ensure Yüksel, Alper and Akif entries are present
        const entryKey = (e: PlayerScoutingEntry) => `${e.playerId}_${e.evaluatorName}`;
        const existingKeys = new Set(parsed.map(entryKey));
        const missingFromInitial = INITIAL_SCOUTING_ENTRIES.filter((e) => !existingKeys.has(entryKey(e)));
        return [...parsed, ...missingFromInitial];
      }
    } catch {}
    return INITIAL_SCOUTING_ENTRIES;
  });

  useEffect(() => {
    if (isTestMode || isTestModeRef.current) return;
    savedScoutingEntriesRef.current = savedScoutingEntries;
    safeSetItem('revirfc_scouting_v6', JSON.stringify(savedScoutingEntries));
  }, [savedScoutingEntries]);

  // Modals state
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const [checkInPlayer, setCheckInPlayer] = useState<Player | null>(null);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [isCommitteeModalOpen, setIsCommitteeModalOpen] = useState(false);
  const [showFirebaseModal, setShowFirebaseModal] = useState(false);
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [activeInviteToken, setActiveInviteToken] = useState<InviteToken | null>(null);

  // Check URL for ?invite=TOKEN or ?auth=1 (with iOS Safari same-origin redirect + Firestore validation)
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const inviteCode = params.get('invite');
      const authParam = params.get('auth');

      const authDomainHost = (import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '').trim();
      const ua = navigator.userAgent || '';
      const isMobileOrSafari =
        /iPhone|iPad|iPod|Android|Mobile/i.test(ua) ||
        (/Safari/i.test(ua) && !/Chrome|CriOS|Edg/i.test(ua));

      if (
        (inviteCode || authParam === '1') &&
        authDomainHost &&
        window.location.hostname !== authDomainHost &&
        window.location.hostname.endsWith('.web.app') &&
        isMobileOrSafari
      ) {
        const target = new URL(window.location.href);
        target.hostname = authDomainHost;
        window.location.replace(target.toString());
        return;
      }

      if (inviteCode) {
        try {
          sessionStorage.setItem('revirfc_pending_invite_v1', inviteCode);
          localStorage.setItem('revirfc_pending_invite_v1', inviteCode);
        } catch {}

        const found = findInviteById(inviteCode);
        if (found) {
          setActiveInviteToken(found);
          setShowAuthModal(true);
          fetchInviteStateFromCloud(inviteCode).then((state) => {
            if (state.revoked) {
              setActiveInviteToken(null);
            } else if (state.invite) {
              setActiveInviteToken(state.invite);
            }
          });
        } else {
          fetchInviteFromCloud(inviteCode).then((cloudInvite) => {
            if (cloudInvite) {
              const existing = getSavedInvites();
              if (!existing.some((i) => i.id === cloudInvite.id)) {
                saveInvites([cloudInvite, ...existing]);
              }
              setActiveInviteToken(cloudInvite);
              setShowAuthModal(true);
            }
          });
        }
      } else if (authParam === '1' && !currentUser) {
        setShowAuthModal(true);
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Google redirect dönüşünde onaylı kullanıcı oluşunca Auth penceresini otomatik kapat
  useEffect(() => {
    if (currentUser?.status === 'approved' && showAuthModal) {
      setShowAuthModal(false);
      setActiveInviteToken(null);
    }
  }, [currentUser?.status, showAuthModal]);

  // Keep invites synced from Firestore across devices
  useEffect(() => {
    const unsubscribe = subscribeToInvites((cloudInvites) => {
      if (!cloudInvites || cloudInvites.length === 0) return;
      const localList = getSavedInvites();
      const map = new Map<string, InviteToken>();
      localList.filter((i) => !isExcludedAdminInvite(i)).forEach((i) => map.set(i.id, i));
      cloudInvites.filter((i) => !isExcludedAdminInvite(i)).forEach((i) => {
        const prev = map.get(i.id);
        const accidentalAdminUse = Boolean(i.usedByEmail && isFounderAdminEmail(i.usedByEmail));
        const resolved: InviteToken = {
          ...prev,
          ...i,
          usedByEmail: accidentalAdminUse ? undefined : i.usedByEmail,
          usedAt: accidentalAdminUse ? undefined : i.usedAt,
          isRevoked: i.isRevoked,
        };
        if (accidentalAdminUse) {
          saveInviteToCloud(resolved);
        }
        map.set(i.id, resolved);
      });
      saveInvites(Array.from(map.values()));
    });
    return () => unsubscribe();
  }, []);

  const handleQuickCheckInForPlayer = (playerId: string) => {
    handleSaveCheckIn({
      playerId,
      timestamp: Date.now(),
      status: 'full',
      note: 'Kurul tarafından hızlı onaylandı',
      attendance: 'yes',
      canPayPitchFee: Boolean(match.checkIns[playerId]?.canPayPitchFee),
      canBringTea: Boolean(match.checkIns[playerId]?.canBringTea),
    });
  };

  const handleQuickCheckInAllMissing = () => {
    const missingIds = match.starters.filter((id) => !match.checkIns[id]);
    if (missingIds.length === 0) return;

    const newCheckIns = { ...match.checkIns };
    const now = Date.now();
    for (const id of missingIds) {
      newCheckIns[id] = {
        playerId: id,
        timestamp: now,
        status: 'full',
        note: 'Kurul tarafından toplu onaylandı',
        attendance: 'yes',
      };
    }

    const nextMatch: Match = {
      ...match,
      checkIns: newCheckIns,
    };
    setMatch(nextMatch);
    saveMatchToCloud(nextMatch);

    const changedPlayers: Player[] = [];
    const nextPlayers = players.map((p) => {
      if (!missingIds.includes(p.id)) return p;
      const updatedP: Player = {
        ...p,
        currentStatus: 'full',
        theme:
          p.theme === 'revir'
            ? getDefaultCardThemeForPlayer({ ...p, currentStatus: 'full' })
            : p.theme,
      };
      changedPlayers.push(updatedP);
      return updatedP;
    });
    setPlayers(nextPlayers);
    if (changedPlayers.length > 0) {
      savePlayersBatchToCloud(changedPlayers);
    }
  };

  // Sync state to LocalStorage
  // Oyuncu fotoğrafları (base64) localStorage kotasını doldurduğu için IndexedDB'ye taşınır;
  // localStorage'a yalnızca hafif "idb:" referanslı JSON yazılır. Önce görsel, sonra JSON yazılır.
  const playersPersistSeq = useRef(0);
  useEffect(() => {
    if (isTestMode || isTestModeRef.current) return;
    const seq = ++playersPersistSeq.current;
    externalizeImages(players, {
      prefix: 'player',
      keyOf: (p) => p.id,
      get: (p) => p.photoUrl,
      set: (p, url) => ({ ...p, photoUrl: url }),
    }).then((slim) => {
      if (seq !== playersPersistSeq.current || isTestModeRef.current) return; // daha yeni bir kayıt var
      safeSetItem('revirfc_players_v11', JSON.stringify(slim));
    });
  }, [players]);

  const hasPlayersCloudSyncedRef = useRef<boolean>(false);

  // Firestore Real-Time Sync & Seeding:
  // 1. If collection is empty, seed initial players.
  // 2. Real-time listener: when any player card (photo, nickname, position, badges) is updated,
  //    all active users receive the update immediately.
  useEffect(() => {
    seedPlayersIfEmpty(INITIAL_PLAYERS.map((p) => normalizePlayerThemeAndLegend(p)));

    const fallbackTimer = window.setTimeout(() => {
      setIsInitialCloudReady(true);
    }, 1800);

    const OBSOLETE_NICKNAMES = new Set([
      'White',
      'Balyoz Akif',
      'Beton Yüksel',
      'Dinamo',
      'Ciğersiz Baran',
      'Cambaz Can',
      'Savaşçı Cevdet',
      'Fırsatçı Elber',
      'Kule Efsane',
      'Sakin Stoper Sönmez',
      'Deparcı Sefa',
      'Halı Saha Gatussosu',
      'Pasör Metin',
      'Genç Dinamo Turap',
      'Casper İsmet',
      'Sigortacı İsmet',
      'Gelemedim Orhan',
      'Uzaktan Avcı Orhan',
      'Nöbetçi Mahmut',
      'İkinci Kaleci Selo',
      'Vizyoner Ömer',
      'Sert Bek Mustafa',
      'Omuz Koyan Mustafa',
      'Genç Yıldız Yusuf',
      'Dinamik Ferhun',
    ]);

    const unsubscribe = subscribeToPlayers((cloudPlayers) => {
      window.clearTimeout(fallbackTimer);
      setIsInitialCloudReady(true);
      hasPlayersCloudSyncedRef.current = true;
      if (cloudPlayers && cloudPlayers.length > 0) {
        const u = currentUserRef.current;
        const canPushGeneral = u?.status === 'approved' && (u.role === 'admin' || u.role === 'captain');
        const now = Date.now();
        const missingToPush: Player[] = [];

        // Only push missing initial players (e.g. newly added p23); NEVER overwrite existing Firestore cards/photos.
        if (canPushGeneral) {
          const cloudIds = new Set(cloudPlayers.map((cp) => cp.id));
          INITIAL_PLAYERS.forEach((initP) => {
            if (!cloudIds.has(initP.id)) {
              missingToPush.push(
                normalizePlayerThemeAndLegend({ ...initP, statsSyncVersion: CURRENT_STATS_SYNC_VERSION })
              );
            }
          });
        }

        setPlayers((prev) => {
          const batchToPush: Player[] = [...missingToPush];
          const cloudMap = new Map(cloudPlayers.map((cp) => [cp.id, cp]));
          const updated = prev.map((localP) => {
            const cloudP = cloudMap.get(localP.id);
            if (!cloudP) return localP;

            const initP = INITIAL_PLAYERS.find((ip) => ip.id === localP.id);

            // Yeni kaydedilen/fotoğrafı güncellenen kartı kısa süreli stale bulut anlık görüntüsüne karşı koru
            const pendingSaveAt = pendingLocalPlayerSavesRef.current.get(localP.id);
            if (pendingSaveAt && now - pendingSaveAt < 12000) {
              return localP;
            }

            // Yerel cihazda özel bir base64/idb fotoğraf varsa ve bulutta hâlâ varsayılan/idb görsel duruyorsa ezme
            const localHasCustomDataUrl = typeof localP.photoUrl === 'string' && localP.photoUrl.startsWith('data:image/');
            const localHasCustomPhoto = localHasCustomDataUrl || isIdbRef(localP.photoUrl);
            const cloudIsDefaultOrIdb =
              !cloudP.photoUrl ||
              cloudP.photoUrl.startsWith('/players/') ||
              cloudP.photoUrl === '/logo.jpg' ||
              isIdbRef(cloudP.photoUrl);

            // Eski log anındaki resmi lakapları buluttaki bayat lakaplara karşı koru
            const isStaleCloudNickname =
              !cloudP.nickname || OBSOLETE_NICKNAMES.has(cloudP.nickname);

            const effectiveNickname = isStaleCloudNickname
              ? (initP?.nickname ?? localP.nickname)
              : (cloudP.nickname || localP.nickname);

            const isCloudStatsMigrated = (cloudP.statsSyncVersion ?? 0) >= CURRENT_STATS_SYNC_VERSION;
            const isCloudRecordMigrated = (cloudP.recordSyncVersion ?? 0) >= CURRENT_RECORD_SYNC_VERSION;

            // Firestore (cloudP) birincil kaynaktır: kullanıcı/yönetici tüm kart ayarları (fotoğraf, forma no, ülke, kulüp, mevki, playstyle, stat) anlık senkronize olur.
            // İlk geçişte (statsSyncVersion < CURRENT_STATS_SYNC_VERSION) eski bayat matchDelta/ekran görüntüsü statları sıfırlanır; sonrasında cloudP statları önceliklidir.
            // Benzer şekilde recordSyncVersion < CURRENT_RECORD_SYNC_VERSION ise 8 resmi maçtan hesaplanan Maç/Galibiyet/Mağlubiyet değerleri yazılır.
            const merged: Player = normalizePlayerThemeAndLegend({
              ...localP,
              ...cloudP,
              name: cloudP.name ?? localP.name ?? initP?.name ?? '',
              nickname: effectiveNickname,
              position: cloudP.position ?? localP.position ?? initP?.position ?? 'MID',
              secondaryPositions: cloudP.secondaryPositions ?? localP.secondaryPositions,
              number: cloudP.number ?? localP.number ?? initP?.number ?? 10,
              nationality: cloudP.nationality ?? localP.nationality ?? initP?.nationality,
              nationName: cloudP.nationName ?? localP.nationName ?? initP?.nationName,
              flagUrl: cloudP.flagUrl ?? localP.flagUrl ?? initP?.flagUrl,
              clubId: cloudP.clubId ?? localP.clubId ?? initP?.clubId,
              clubName: cloudP.clubName ?? localP.clubName ?? initP?.clubName,
              clubLogoUrl: cloudP.clubLogoUrl ?? localP.clubLogoUrl ?? initP?.clubLogoUrl,
              playstyles: cloudP.playstyles ?? localP.playstyles ?? initP?.playstyles ?? [],
              baseOVR: isCloudStatsMigrated
                ? (cloudP.baseOVR ?? localP.baseOVR ?? initP?.baseOVR ?? 50)
                : (initP?.baseOVR ?? 50),
              currentOVR: isCloudStatsMigrated
                ? (cloudP.currentOVR ?? localP.currentOVR ?? initP?.currentOVR ?? 50)
                : (initP?.currentOVR ?? 50),
              stats: isCloudStatsMigrated
                ? (cloudP.stats ?? localP.stats ?? initP?.stats ?? { pac: 50, sho: 50, pas: 50, dri: 50, def: 50, phy: 50 })
                : (initP?.stats ?? { pac: 50, sho: 50, pas: 50, dri: 50, def: 50, phy: 50 }),
              adminStatOverride: isCloudStatsMigrated ? Boolean(cloudP.adminStatOverride) : false,
              adminStatOverrideAt: isCloudStatsMigrated ? cloudP.adminStatOverrideAt : undefined,
              statsSyncVersion: CURRENT_STATS_SYNC_VERSION,
              matchesPlayed: isCloudRecordMigrated
                ? (cloudP.matchesPlayed ?? localP.matchesPlayed ?? initP?.matchesPlayed ?? 0)
                : (initP?.matchesPlayed ?? 0),
              wins: isCloudRecordMigrated
                ? (cloudP.wins ?? localP.wins ?? initP?.wins ?? 0)
                : (initP?.wins ?? 0),
              draws: isCloudRecordMigrated
                ? (cloudP.draws ?? localP.draws ?? initP?.draws ?? 0)
                : (initP?.draws ?? 0),
              losses: isCloudRecordMigrated
                ? (cloudP.losses ?? localP.losses ?? initP?.losses ?? 0)
                : (initP?.losses ?? 0),
              recordSyncVersion: CURRENT_RECORD_SYNC_VERSION,
              isFormer: cloudP.isFormer ?? localP.isFormer,
              pendingNickname: cloudP.pendingNickname || undefined,
              inFormAwardedAt: cloudP.inFormAwardedAt ?? undefined,
              ownPlaystyle: cloudP.ownPlaystyle || undefined,
              committeePlaystyle: cloudP.committeePlaystyle || undefined,
              committeePlaystyleVotes: cloudP.committeePlaystyleVotes || undefined,
              seniorityRank: cloudP.seniorityRank ?? localP.seniorityRank,
              lastMatchSummary: isCloudStatsMigrated ? (cloudP.lastMatchSummary || localP.lastMatchSummary) : undefined,
              photoUrl: localHasCustomPhoto && cloudIsDefaultOrIdb ? localP.photoUrl : (cloudP.photoUrl || localP.photoUrl),
            });

            if ((!isCloudStatsMigrated || !isCloudRecordMigrated) && canPushGeneral) {
              batchToPush.push(merged);
            } else if (localHasCustomPhoto && cloudIsDefaultOrIdb && !pushedPhotoIdsRef.current.has(merged.id)) {
              if (
                localHasCustomDataUrl &&
                u?.status === 'approved' &&
                (canPushGeneral || u.claimedPlayerId === merged.id)
              ) {
                pushedPhotoIdsRef.current.add(merged.id);
                batchToPush.push(merged);
              } else {
                pendingPhotoPushIdsRef.current.add(merged.id);
              }
            }

            return merged;
          });

          // Ensure any missing player (e.g. Korkmaz p23) from INITIAL_PLAYERS or Firestore is present
          const existingIds = new Set(updated.map((p) => p.id));
          const missingFromCloud = cloudPlayers
            .filter((cp) => !existingIds.has(cp.id))
            .map((cp) => normalizePlayerThemeAndLegend(cp));
          const updatedIds = new Set([...existingIds, ...missingFromCloud.map((p) => p.id)]);
          const missingInit = INITIAL_PLAYERS.filter((p) => !updatedIds.has(p.id)).map((p) =>
            normalizePlayerThemeAndLegend(p)
          );

          if (batchToPush.length > 0) {
            queueMicrotask(() => {
              savePlayersBatchToCloud(batchToPush);
            });
          }

          return [...updated, ...missingFromCloud, ...missingInit];
        });
      }
    });

    return () => {
      window.clearTimeout(fallbackTimer);
      unsubscribe();
    };
  }, []);

  const playersRef = useRef(players);
  playersRef.current = players;

  const rehydrateSquadPhotos = (
    squad?: MatchSquad,
    sourcePlayers: Player[] = playersRef.current,
    checkInsMap: Record<string, CheckInEntry> = match.checkIns || {}
  ): MatchSquad | undefined => {
    if (!squad) return undefined;
    const pMap = new Map(sourcePlayers.map((p) => [p.id, p]));
    const refreshedPlayers = squad.players.map((item) => {
      const live = pMap.get(item.player.id);
      if (!live) return item;
      const eff = computeEffectivePlayer(live, checkInsMap[live.id]);
      return {
        ...item,
        player: { ...live, photoUrl: live.photoUrl || item.player.photoUrl },
        effectiveStats: eff.effectiveStats,
        effectiveOVR: eff.effectiveOVR,
      };
    });
    const normalizedSquad = normalizeSquadJerseyName(squad)!;
    return recomputeSquadTotals({ ...normalizedSquad, players: refreshedPlayers });
  };

  // Aktif Maç, Duvar, Galeri ve Tatlı Defteri için gerçek zamanlı bulut dinleyicileri
  useEffect(() => {
    const unsubMatch = subscribeToMatch((cloudMatch) => {
      if (cloudMatch) {
        const isLegacyPreV9 =
          !cloudMatch.id ||
          /^match-[1-8]$/.test(cloudMatch.id) ||
          Boolean(cloudMatch.title?.includes('8. Hafta'));
        if (isLegacyPreV9) {
          const u = currentUserRef.current;
          if (u?.status === 'approved' && (u.role === 'admin' || u.role === 'captain')) {
            saveMatchToCloud(MOCK_ACTIVE_MATCH);
          }
          return;
        }

        setMatch((prev) => {
          const checkInsMap = cloudMatch.checkIns || {};
          let nextAltTeamA = cloudMatch.altTeamA ?? prev.altTeamA;
          let nextAltTeamB = cloudMatch.altTeamB ?? prev.altTeamB;
          let nextAltFairness = cloudMatch.altFairnessRating ?? prev.altFairnessRating;

          if ((!nextAltTeamA || !nextAltTeamB) && cloudMatch.starters.length === 12) {
            const startersList = playersRef.current.filter((p) => cloudMatch.starters.includes(p.id));
            if (startersList.length === 12) {
              const balanced = run462BalancingAlgorithm(startersList, checkInsMap);
              nextAltTeamA = nextAltTeamA ?? balanced.alternative?.teamA;
              nextAltTeamB = nextAltTeamB ?? balanced.alternative?.teamB;
              nextAltFairness = nextAltFairness ?? balanced.alternative?.fairnessRating;
            }
          }

          let nextTeamA = rehydrateSquadPhotos(cloudMatch.teamA, playersRef.current, checkInsMap);
          let nextTeamB = rehydrateSquadPhotos(cloudMatch.teamB, playersRef.current, checkInsMap);
          let resolvedAltA = rehydrateSquadPhotos(nextAltTeamA, playersRef.current, checkInsMap);
          let resolvedAltB = rehydrateSquadPhotos(nextAltTeamB, playersRef.current, checkInsMap);

          if (!cloudMatch.awards?.isConfirmedByCommittee) {
            if (nextTeamA && nextTeamB && nextTeamA.players.length === 6 && nextTeamB.players.length === 6) {
              const applied = applySeniorityToSquadPair(nextTeamA, nextTeamB, playersRef.current);
              nextTeamA = applied.teamA;
              nextTeamB = applied.teamB;
            }
            if (resolvedAltA && resolvedAltB && resolvedAltA.players.length === 6 && resolvedAltB.players.length === 6) {
              const appliedAlt = applySeniorityToSquadPair(resolvedAltA, resolvedAltB, playersRef.current);
              resolvedAltA = appliedAlt.teamA;
              resolvedAltB = appliedAlt.teamB;
            }
          }

          return {
            ...cloudMatch,
            absentees: cloudMatch.absentees || [],
            pitchFeeVolunteerIds: cloudMatch.pitchFeeVolunteerIds || [],
            teaVolunteerIds: cloudMatch.teaVolunteerIds || [],
            checkIns: checkInsMap,
            isPollOpen: cloudMatch.isPollOpen ?? false,
            teamA: nextTeamA,
            teamB: nextTeamB,
            altTeamA: resolvedAltA,
            altTeamB: resolvedAltB,
            altFairnessRating: nextAltFairness,
            selectedLineupOption: cloudMatch.selectedLineupOption ?? prev.selectedLineupOption ?? 1,
          };
        });
      }
    });

    const unsubPosts = subscribeToPosts((cloudPosts) => {
      if (Array.isArray(cloudPosts)) {
        const isOldDummy = cloudPosts.some(
          (p) => p.text?.includes('Taktik Tahtası Açıldı') || (p as any).content?.includes('Taktik Tahtası Açıldı')
        );
        if (isOldDummy) {
          setPosts(MOCK_POSTS);
          return;
        }
        setPosts(cloudPosts);
      }
    });

    const unsubPhotos = subscribeToPhotos((cloudPhotos) => {
      if (cloudPhotos && cloudPhotos.length > 0) {
        const realPhotos = cloudPhotos.filter(
          (p) => !p.caption?.includes('Galibiyet Sevinci') && !p.imageUrl?.includes('unsplash')
        );
        if (realPhotos.length > 0) {
          setPhotos(realPhotos);
        }
      }
    });

    const unsubDebts = subscribeToDebts((cloudDebts) => {
      if (cloudDebts && cloudDebts.length > 0) {
        const isOldDummy = cloudDebts.some(
          (d) => d.description?.includes('Günün Bidonu seçildi + iddia kaybı')
        );
        if (isOldDummy) {
          setDebts(MOCK_DEBTS);
          return;
        }
        setDebts(cloudDebts);
      }
    });

    return () => {
      unsubMatch();
      unsubPosts();
      unsubPhotos();
      unsubDebts();
    };
  }, []);

  // Helper: Kök kurul puanlama konsensüsünü oyunculara otomatik uygulama
  const applyConsensusToSquad = (
    currentPlayers: Player[],
    scoutingEntries: PlayerScoutingEntry[]
  ): { updatedPlayers: Player[]; hasChanges: boolean } => {
    const to100 = (val: number) => (val <= 10 ? Math.round(val * 10) : Math.round(val));
    let hasChanges = false;

    const updatedPlayers = currentPlayers.map((player) => {
      // Seçenek A: Yönetici Modu ile stat/OVR manuel sabitlenmiş oyuncuların puanlarını kurul senkronu ezmez
      if (player.adminStatOverride) {
        return player;
      }

      const entries = scoutingEntries.filter(
        (e) =>
          e.playerId === player.id &&
          (COMMITTEE_MEMBERS as readonly string[]).includes(e.evaluatorName)
      );

      if (entries.length === 0) return player;

      const avgPac = entries.reduce((sum, e) => sum + to100(e.pac), 0) / entries.length;
      const avgSho = entries.reduce((sum, e) => sum + to100(e.sho), 0) / entries.length;
      const avgPas = entries.reduce((sum, e) => sum + to100(e.pas), 0) / entries.length;
      const avgDri = entries.reduce((sum, e) => sum + to100(e.dri), 0) / entries.length;
      const avgDef = entries.reduce((sum, e) => sum + to100(e.def), 0) / entries.length;
      const avgPhy = entries.reduce((sum, e) => sum + to100(e.phy), 0) / entries.length;

      const calculatedOVR = Math.round((avgPac + avgSho + avgPas + avgDri + avgDef + avgPhy) / 6);
      const currentExact = player.exactOVR ?? player.currentOVR ?? player.baseOVR;
      const exactDelta = currentExact - player.baseOVR;
      const nextBaseOVR = calculatedOVR;
      const nextExactOVR = Math.max(40, Math.min(97, Math.round((nextBaseOVR + exactDelta) * 1000) / 1000));
      const nextCurrentOVR = Math.max(40, Math.min(97, Math.round(nextExactOVR)));

      const nextStats = {
        pac: Math.min(99, Math.round(avgPac)),
        sho: Math.min(99, Math.round(avgSho)),
        pas: Math.min(99, Math.round(avgPas)),
        dri: Math.min(99, Math.round(avgDri)),
        def: Math.min(99, Math.round(avgDef)),
        phy: Math.min(99, Math.round(avgPhy)),
      };

      const shiftedStats = shiftPlayerStatsByDelta(nextStats, nextCurrentOVR - nextBaseOVR);

      const changed =
        player.baseOVR !== nextBaseOVR ||
        player.currentOVR !== nextCurrentOVR ||
        player.exactOVR !== nextExactOVR ||
        player.baseStats?.pac !== nextStats.pac ||
        player.baseStats?.sho !== nextStats.sho ||
        player.baseStats?.pas !== nextStats.pas ||
        player.baseStats?.dri !== nextStats.dri ||
        player.baseStats?.def !== nextStats.def ||
        player.baseStats?.phy !== nextStats.phy ||
        player.stats.pac !== shiftedStats.pac ||
        player.stats.sho !== shiftedStats.sho ||
        player.stats.pas !== shiftedStats.pas ||
        player.stats.dri !== shiftedStats.dri ||
        player.stats.def !== shiftedStats.def ||
        player.stats.phy !== shiftedStats.phy;

      if (changed) {
        hasChanges = true;
        return normalizePlayerThemeAndLegend({
          ...player,
          baseOVR: nextBaseOVR,
          exactOVR: nextExactOVR,
          currentOVR: nextCurrentOVR,
          baseStats: nextStats,
          stats: shiftedStats,
        });
      }

      return player;
    });

    return { updatedPlayers, hasChanges };
  };

  // Kurul Scouting Puanları için gerçek zamanlı bulut dinleyicisi
  useEffect(() => {
    const canPushConsensusPlayers = (list: Player[], u: typeof currentUserRef.current) =>
      Boolean(
        hasPlayersCloudSyncedRef.current &&
          u?.status === 'approved' &&
          (u.role === 'admin' || u.role === 'captain') &&
          list.every((p) => (p.statsSyncVersion ?? 0) >= CURRENT_STATS_SYNC_VERSION)
      );

    const unsubscribe = subscribeToScouting((cloudEntries, meta) => {
      const u = currentUserRef.current;
      const canPushGeneral = u?.status === 'approved' && (u.role === 'admin' || u.role === 'captain');
      const isCloudScoutingMigrated = (meta?.scoutingSyncVersion ?? 0) >= CURRENT_SCOUTING_SYNC_VERSION;

      if (!cloudEntries || cloudEntries.length === 0 || !isCloudScoutingMigrated) {
        if (canPushGeneral) {
          saveScoutingToCloud(INITIAL_SCOUTING_ENTRIES);
        }
        setSavedScoutingEntries(INITIAL_SCOUTING_ENTRIES);
        setPlayers((currPlayers) => {
          const { updatedPlayers, hasChanges } = applyConsensusToSquad(currPlayers, INITIAL_SCOUTING_ENTRIES);
          if (hasChanges) {
            playersRef.current = updatedPlayers;
            if (canPushConsensusPlayers(updatedPlayers, u)) {
              queueMicrotask(() => savePlayersBatchToCloud(updatedPlayers));
            }
            return updatedPlayers;
          }
          return currPlayers;
        });
        return;
      }

      if (canPushGeneral && cloudEntries.length < INITIAL_SCOUTING_ENTRIES.length) {
        saveScoutingToCloud(INITIAL_SCOUTING_ENTRIES);
      }
      setSavedScoutingEntries((prev) => {
        const map = new Map<string, PlayerScoutingEntry>();
        INITIAL_SCOUTING_ENTRIES.forEach((e) => map.set(`${e.playerId}_${e.evaluatorName}`, e));
        prev.forEach((e) => map.set(`${e.playerId}_${e.evaluatorName}`, e));
        cloudEntries.forEach((e) => map.set(`${e.playerId}_${e.evaluatorName}`, e));
        const mergedEntries = Array.from(map.values());

        // Otomatik konsensüs senkronizasyonu
        setPlayers((currPlayers) => {
          const { updatedPlayers, hasChanges } = applyConsensusToSquad(currPlayers, mergedEntries);
          if (hasChanges) {
            playersRef.current = updatedPlayers;
            if (canPushConsensusPlayers(updatedPlayers, u)) {
              queueMicrotask(() => savePlayersBatchToCloud(updatedPlayers));
            }
            return updatedPlayers;
          }
          return currPlayers;
        });

        return mergedEntries;
      });
    });

    return () => unsubscribe();
  }, []);

  // Açılışta "idb:" referanslarını gerçek görsellere çevir ve yetkili kullanıcıda buluta aktar
  useEffect(() => {
    let cancelled = false;
    hydrateImages(
      players,
      { get: (p) => p.photoUrl, set: (p, url) => ({ ...p, photoUrl: url }) },
      '/players/alper.png'
    ).then((hydrated) => {
      if (cancelled || isTestModeRef.current) return;
      if (hydrated.some((p, i) => p.photoUrl !== players[i].photoUrl)) {
        const u = currentUserRef.current;
        const canPushGeneral = u?.status === 'approved' && (u.role === 'admin' || u.role === 'captain');
        const hydratedToPush: Player[] = [];

        setPlayers((prev) =>
          prev.map((p) => {
            const h = hydrated.find((x) => x.id === p.id);
            if (h && isIdbRef(p.photoUrl)) {
              const updated = { ...p, photoUrl: h.photoUrl };
              if (
                typeof updated.photoUrl === 'string' &&
                updated.photoUrl.startsWith('data:image/') &&
                !pushedPhotoIdsRef.current.has(updated.id)
              ) {
                if (
                  u?.status === 'approved' &&
                  (canPushGeneral || u.claimedPlayerId === updated.id)
                ) {
                  pushedPhotoIdsRef.current.add(updated.id);
                  hydratedToPush.push(updated);
                } else {
                  pendingPhotoPushIdsRef.current.add(updated.id);
                }
              }
              return updated;
            }
            return p;
          })
        );

        hydratedToPush.forEach((p) => {
          savePlayerToCloud(p);
        });
      }
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Yetkili oturum (Admin/Kurul/Oyuncu) sonradan yüklendiğinde bekleyen yerel özel fotoğrafları buluta aktar
  useEffect(() => {
    if (isTestMode || isTestModeRef.current) return;
    if (!currentUser || currentUser.status !== 'approved' || pendingPhotoPushIdsRef.current.size === 0) return;
    const canPushGeneral = currentUser.role === 'admin' || currentUser.role === 'captain';

    for (const id of Array.from(pendingPhotoPushIdsRef.current)) {
      if (pushedPhotoIdsRef.current.has(id)) {
        pendingPhotoPushIdsRef.current.delete(id);
        continue;
      }
      const p = players.find((x) => x.id === id);
      if (!p || !p.photoUrl?.startsWith('data:image/')) continue;
      if (canPushGeneral || currentUser.claimedPlayerId === p.id) {
        pushedPhotoIdsRef.current.add(id);
        pendingPhotoPushIdsRef.current.delete(id);
        savePlayerToCloud(p);
      }
    }
  }, [currentUser, players]);

  useEffect(() => {
    if (isTestMode || isTestModeRef.current) return;
    safeSetItem('revirfc_match_v5', JSON.stringify(match));
  }, [match]);

  useEffect(() => {
    if (isTestMode || isTestModeRef.current) return;
    safeSetItem('revirfc_posts_v5', JSON.stringify(posts));
  }, [posts]);

  const photosPersistSeq = useRef(0);
  useEffect(() => {
    if (isTestMode || isTestModeRef.current) return;
    const seq = ++photosPersistSeq.current;
    externalizeImages(photos, {
      prefix: 'archive',
      keyOf: (p) => p.id,
      get: (p) => p.imageUrl,
      set: (p, url) => ({ ...p, imageUrl: url }),
    }).then((slim) => {
      if (seq !== photosPersistSeq.current || isTestModeRef.current) return;
      safeSetItem('revirfc_photos_v5', JSON.stringify(slim));
    });
  }, [photos]);

  useEffect(() => {
    let cancelled = false;
    hydrateImages(photos, { get: (p) => p.imageUrl, set: (p, url) => ({ ...p, imageUrl: url }) }).then((hydrated) => {
      if (cancelled || isTestModeRef.current) return;
      if (hydrated.some((p, i) => p.imageUrl !== photos[i].imageUrl)) {
        setPhotos((prev) =>
          prev.map((p) => {
            const h = hydrated.find((x) => x.id === p.id);
            return h && isIdbRef(p.imageUrl) ? { ...p, imageUrl: h.imageUrl } : p;
          })
        );
      }
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (isTestMode || isTestModeRef.current) return;
    safeSetItem('revirfc_debts_v5', JSON.stringify(debts));
  }, [debts]);

  // Depolama hatası olursa kullanıcıya görünür uyarı (sessizce kaybolmasın)
  const [storageError, setStorageError] = useState(false);
  useEffect(() => {
    const onErr = () => setStorageError(true);
    window.addEventListener(STORAGE_ERROR_EVENT, onErr);
    return () => window.removeEventListener(STORAGE_ERROR_EVENT, onErr);
  }, []);

  const access = getAccess(currentUser, players, adminMode);
  const isPendingUser = access.isPending;
  const isFormerUser = access.isFormer;
  const isAdminAccount = access.isAdminAccount;
  const isSuperAdmin = access.isSuperAdmin;
  // Kurul + Yönetici: kart/unvan/mevki yönetimi (ayrıntılı yetki matrisi: services/permissions.ts)
  const isAdminOrCaptain = access.isCommittee;
  const isApprovedUser = access.isApproved;
  const effectiveCanUseTestMode = canUseTestMode || access.isCommittee;

  // Current logged in member's claimed player
  const claimedPlayer = currentUser?.claimedPlayerId
    ? players.find((p) => p.id === currentUser.claimedPlayerId)
    : (isAdminOrCaptain ? players[0] : undefined);
  const isStarterInMatch = !isPendingUser && !isFormerUser && Boolean(claimedPlayer && match.starters.includes(claimedPlayer.id));

  // Zamansal aşama kontrolleri: yalnızca faz/yetki gerçekten değiştiğinde yeniden render tetikler
  const [lifecycleTick, setLifecycleTick] = useState<number>(() => Date.now());
  const lifecycleFlags = getMatchLifecycleFlags(match, lifecycleTick);
  const lifecycleSigRef = useRef('');
  lifecycleSigRef.current = `${match.id}|${lifecycleFlags.phase}|${lifecycleFlags.canPlayersEditPoll}|${lifecycleFlags.canCommitteeManagePoll}|${lifecycleFlags.canEditTactics}|${lifecycleFlags.canOpenRatingManually}|${lifecycleFlags.canVote360}|${lifecycleFlags.canSealAwards}`;

  useEffect(() => {
    const id = window.setInterval(() => {
      const now = Date.now();
      const next = getMatchLifecycleFlags(match, now);
      const nextSig = `${match.id}|${next.phase}|${next.canPlayersEditPoll}|${next.canCommitteeManagePoll}|${next.canEditTactics}|${next.canOpenRatingManually}|${next.canVote360}|${next.canSealAwards}`;
      if (nextSig !== lifecycleSigRef.current) {
        setLifecycleTick(now);
      }
    }, 30_000);
    return () => window.clearInterval(id);
  }, [match]);

  // Seyirci / Bekleyen veya yetkisi değişen kullanıcıda yasaklı sekmeyi kapatıp Kadro vitrinine yönlendir
  useEffect(() => {
    if (activeTab === 'admin' && !isSuperAdmin) {
      setActiveTab('squad');
    } else if (activeTab === 'scouting' && !isAdminOrCaptain) {
      setActiveTab('squad');
    } else if (
      !isApprovedUser &&
      (activeTab === 'match' || activeTab === 'rating' || activeTab === 'locker' || activeTab === 'analytics')
    ) {
      setActiveTab('squad');
    }
  }, [activeTab, isSuperAdmin, isAdminOrCaptain, isApprovedUser]);

  useEffect(() => {
    if (!isSuperAdmin && isApprovedUser) {
      const ownName = claimedPlayer?.name || currentUser?.displayName?.split(' ')[0];
      if (ownName) {
        setEvaluatorName(ownName);
      }
    }
  }, [isSuperAdmin, isApprovedUser, claimedPlayer?.name, currentUser?.displayName]);

  // Handle Check-in Save (preserves & syncs pitch fee + tea volunteer status)
  const handleSaveCheckIn = (checkIn: CheckInEntry) => {
    if (isFormerUser) return;
    const targetPlayer = players.find((p) => p.id === checkIn.playerId);
    if (isFormerPlayer(targetPlayer)) return;
    const allowedNow = isAdminOrCaptain
      ? lifecycleFlags.canCommitteeManagePoll
      : lifecycleFlags.canPlayersEditPoll;
    if (!allowedNow) return;

    const currentVolunteers = new Set(match.pitchFeeVolunteerIds || []);
    if (checkIn.canPayPitchFee) {
      currentVolunteers.add(checkIn.playerId);
    } else {
      currentVolunteers.delete(checkIn.playerId);
    }
    const nextVolunteers = Array.from(currentVolunteers);
    let nextPayerId = match.pitchFeePayerId;
    if (checkIn.canPayPitchFee && !nextPayerId) {
      nextPayerId = checkIn.playerId;
    } else if (!checkIn.canPayPitchFee && nextPayerId === checkIn.playerId) {
      nextPayerId = nextVolunteers[0];
    }

    const currentTeaVolunteers = new Set(match.teaVolunteerIds || []);
    if (checkIn.canBringTea) {
      currentTeaVolunteers.add(checkIn.playerId);
    } else {
      currentTeaVolunteers.delete(checkIn.playerId);
    }
    const nextTeaVolunteers = Array.from(currentTeaVolunteers);
    let nextTeaBringerId = match.teaBringerId;
    if (checkIn.canBringTea && !nextTeaBringerId) {
      nextTeaBringerId = checkIn.playerId;
    } else if (!checkIn.canBringTea && nextTeaBringerId === checkIn.playerId) {
      nextTeaBringerId = nextTeaVolunteers[0];
    }

    const nextMatch: Match = {
      ...match,
      pitchFeeVolunteerIds: nextVolunteers,
      pitchFeePayerId: nextPayerId,
      teaVolunteerIds: nextTeaVolunteers,
      teaBringerId: nextTeaBringerId,
      checkIns: {
        ...match.checkIns,
        [checkIn.playerId]: {
          ...checkIn,
          attendance: checkIn.attendance || 'yes',
        },
      },
    };
    setMatch(nextMatch);
    saveMatchToCloud(nextMatch);

    // Update player's status on card
    setPlayers((prev) =>
      prev.map((p) => {
        if (p.id !== checkIn.playerId) return p;
        const updatedPlayer: Player = {
          ...p,
          currentStatus: checkIn.status,
          theme:
            checkIn.status === 'light_injury'
              ? 'revir'
              : p.theme === 'revir'
              ? getDefaultCardThemeForPlayer({ ...p, currentStatus: checkIn.status })
              : p.theme,
        };
        savePlayerToCloud(updatedPlayer);
        return updatedPlayer;
      })
    );
  };

  // Handle saving customized player card with strict club rules:
  // 1. MVP ('totw') is strictly single (tekil). If updated is totw, any previous MVP drops to base theme.
  // 2. Bidon ('bidon') is strictly single (tekil). If updated is bidon, any previous Bidon drops to base theme.
  // 3. Etten Duvar ('wall') is strictly single (tekil). If updated is wall, any previous Duvar drops to base theme.
  // 4. Alev Atıyo! ('inform') is maximum 3. If a 4th is added, the oldest inform card automatically drops to base theme.
  const handleSavePlayerCard = (updated: Player) => {
    if (isPendingUser || (isFormerUser && !isSuperAdmin)) return;
    const getBaseTheme = (p: Player): CardTheme => getDefaultCardThemeForPlayer(p);
    const existingPlayer = players.find((p) => p.id === updated.id);
    if (existingPlayer && isFormerPlayer(existingPlayer) && !isSuperAdmin) {
      return;
    }
    const sanitizedPositions =
      !isAdminOrCaptain && existingPlayer
        ? {
            position: existingPlayer.position,
            secondaryPositions: existingPlayer.secondaryPositions,
          }
        : {};
    const sanitizedFormerFields = !isSuperAdmin && existingPlayer
      ? {
          isFormer: existingPlayer.isFormer,
          theme: updated.theme === 'nostalgia' ? existingPlayer.theme : updated.theme,
        }
      : {};

    const savedUpdatedPlayer: Player = normalizePlayerThemeAndLegend({
      ...updated,
      ...sanitizedPositions,
      ...sanitizedFormerFields,
      ...(isAdminOrCaptain ? { statsSyncVersion: CURRENT_STATS_SYNC_VERSION } : {}),
      inFormAwardedAt: updated.theme === 'inform' ? (updated.inFormAwardedAt || Date.now()) : undefined,
    });

    let demotedInformId: string | null = null;
    if (savedUpdatedPlayer.theme === 'inform') {
      const otherInForms = players.filter((p) => p.id !== savedUpdatedPlayer.id && p.theme === 'inform');
      if (otherInForms.length >= 3) {
        const sorted = [...otherInForms].sort((a, b) => (a.inFormAwardedAt || 0) - (b.inFormAwardedAt || 0));
        demotedInformId = sorted[0].id;
      }
    }

    const demotedPlayers: Player[] = [];
    const nextPlayers = players.map((p) => {
      if (p.id === savedUpdatedPlayer.id) {
        return savedUpdatedPlayer;
      }

      // Kural 1: Yönetici dahil 2 MVP olamaz. Yeni MVP seçilince eski MVP standart/legend'a düşer.
      if (savedUpdatedPlayer.theme === 'totw' && p.theme === 'totw') {
        const demoted: Player = { ...p, theme: getBaseTheme(p) };
        demotedPlayers.push(demoted);
        return demoted;
      }

      // Kural 2: Yönetici dahil 2 Bidon olamaz. Yeni Bidon seçilince eski Bidon standart/legend'a düşer.
      if (savedUpdatedPlayer.theme === 'bidon' && p.theme === 'bidon') {
        const demoted: Player = { ...p, theme: getBaseTheme(p) };
        demotedPlayers.push(demoted);
        return demoted;
      }

      // Kural 3: Yönetici dahil 2 Etten Duvar olamaz. Yeni Duvar seçilince eski Duvar standart/legend'a düşer.
      if (savedUpdatedPlayer.theme === 'wall' && p.theme === 'wall') {
        const demoted: Player = { ...p, theme: getBaseTheme(p) };
        demotedPlayers.push(demoted);
        return demoted;
      }

      // Kural 4: En fazla 3 Alev Atıyo! kartı olabilir. 4. eklendiğinde en eski alev standart/legend'a düşer.
      if (demotedInformId && p.id === demotedInformId) {
        const demoted: Player = { ...p, theme: getBaseTheme(p), inFormAwardedAt: undefined };
        demotedPlayers.push(demoted);
        return demoted;
      }

      return p;
    });

    pendingLocalPlayerSavesRef.current.set(savedUpdatedPlayer.id, Date.now());
    playersRef.current = nextPlayers;
    setPlayers(nextPlayers);

    // Synchronize match awards & live player stats/positions on squads
    const currentAwards = match.awards || {};
    let newMvpId = currentAwards.mvpId;
    let newWallId = currentAwards.wallId;
    let newBidonId = currentAwards.bidonId;
    let newInFormIds = [...(currentAwards.inFormIds || [])];

    if (savedUpdatedPlayer.theme === 'totw') {
      newMvpId = savedUpdatedPlayer.id;
      if (newWallId === savedUpdatedPlayer.id) newWallId = undefined;
      if (newBidonId === savedUpdatedPlayer.id) newBidonId = undefined;
      newInFormIds = newInFormIds.filter((id) => id !== savedUpdatedPlayer.id);
    } else if (savedUpdatedPlayer.theme === 'wall') {
      newWallId = savedUpdatedPlayer.id;
      if (newMvpId === savedUpdatedPlayer.id) newMvpId = undefined;
      if (newBidonId === savedUpdatedPlayer.id) newBidonId = undefined;
      newInFormIds = newInFormIds.filter((id) => id !== savedUpdatedPlayer.id);
    } else if (savedUpdatedPlayer.theme === 'bidon') {
      newBidonId = savedUpdatedPlayer.id;
      if (newMvpId === savedUpdatedPlayer.id) newMvpId = undefined;
      if (newWallId === savedUpdatedPlayer.id) newWallId = undefined;
      newInFormIds = newInFormIds.filter((id) => id !== savedUpdatedPlayer.id);
    } else if (savedUpdatedPlayer.theme === 'inform') {
      if (newMvpId === savedUpdatedPlayer.id) newMvpId = undefined;
      if (newWallId === savedUpdatedPlayer.id) newWallId = undefined;
      if (newBidonId === savedUpdatedPlayer.id) newBidonId = undefined;
      if (!newInFormIds.includes(savedUpdatedPlayer.id)) {
        if (newInFormIds.length >= 3) {
          newInFormIds = [...newInFormIds.slice(1), savedUpdatedPlayer.id];
        } else {
          newInFormIds.push(savedUpdatedPlayer.id);
        }
      }
    } else {
      if (newMvpId === savedUpdatedPlayer.id) newMvpId = undefined;
      if (newWallId === savedUpdatedPlayer.id) newWallId = undefined;
      if (newBidonId === savedUpdatedPlayer.id) newBidonId = undefined;
      newInFormIds = newInFormIds.filter((id) => id !== savedUpdatedPlayer.id);
    }

    const nextMatch: Match = {
      ...match,
      teamA: rehydrateSquadPhotos(match.teamA, nextPlayers, match.checkIns),
      teamB: rehydrateSquadPhotos(match.teamB, nextPlayers, match.checkIns),
      altTeamA: rehydrateSquadPhotos(match.altTeamA, nextPlayers, match.checkIns),
      altTeamB: rehydrateSquadPhotos(match.altTeamB, nextPlayers, match.checkIns),
      awards: {
        ...currentAwards,
        mvpId: newMvpId,
        wallId: newWallId,
        bidonId: newBidonId,
        inFormIds: newInFormIds,
      },
    };
    setMatch(nextMatch);
    saveMatchToCloud(nextMatch);

    // Cloud Sync: Kaydedilen oyuncu kartını + düşürülen eski ödüllü kartları buluta yaz
    savePlayerToCloudWithResult(savedUpdatedPlayer, { protectRestrictedFields: !isAdminOrCaptain })
      .then((res) => {
        window.setTimeout(() => {
          pendingLocalPlayerSavesRef.current.delete(savedUpdatedPlayer.id);
        }, 2500);
        if (!res.synced) {
          alert(`⚠️ Kart buluta (Firestore) kaydedilemedi: ${res.error || 'Yetki veya bağlantı hatası'}`);
          return;
        }
        if (res.player.photoUrl !== savedUpdatedPlayer.photoUrl) {
          setPlayers((prev) => {
            const updatedList = prev.map((p) =>
              p.id === res.player.id ? { ...p, photoUrl: res.player.photoUrl } : p
            );
            playersRef.current = updatedList;
            return updatedList;
          });
        }
      })
      .catch((err) => {
        pendingLocalPlayerSavesRef.current.delete(savedUpdatedPlayer.id);
        console.warn('Background cloud sync warning for player save:', err);
        alert('⚠️ Kart buluta kaydedilirken beklenmeyen bir hata oluştu.');
      });

    if (demotedPlayers.length > 0) {
      savePlayersBatchToCloud(demotedPlayers);
    }
  };

  // Run 462 balancing algorithm using freshest players state
  const handleRunBalancing = () => {
    if (!lifecycleFlags.canEditTactics) {
      alert('Maç tamamlandığı veya mühürlendiği için kadro yeniden dengelenemez.');
      return;
    }
    const latestPlayers = playersRef.current.length > 0 ? playersRef.current : players;
    const startersList = latestPlayers.filter((p) => match.starters.includes(p.id));
    if (startersList.length < 12) {
      alert('Dengeleme için 12 kişilik kadro dolmalıdır.');
      return;
    }

    const result = run462BalancingAlgorithm(startersList, match.checkIns);
    const nextMatch: Match = {
      ...match,
      teamA: result.teamA,
      teamB: result.teamB,
      fairnessRating: result.fairnessRating,
      altTeamA: result.alternative?.teamA,
      altTeamB: result.alternative?.teamB,
      altFairnessRating: result.alternative?.fairnessRating,
      selectedLineupOption: 1,
      stage: 'balancing',
    };
    setMatch(nextMatch);
    saveMatchToCloud(nextMatch);

    // Switch to tactics tab to see results!
    setActiveTab('tactics');
  };

  // Maçı manuel bitirip 360° oylamayı başlat (Kurul / Yönetici)
  const handleFinishMatchAndOpenRating = () => {
    if (!isAdminOrCaptain || !lifecycleFlags.canOpenRatingManually) return;
    const actorName = claimedPlayer?.name || currentUser?.displayName?.split(' ')[0] || 'Kurul';
    const latestPlayers = playersRef.current.length > 0 ? playersRef.current : players;
    const startersList = latestPlayers.filter((p) => match.starters.includes(p.id));

    let nextTeamA = match.teamA;
    let nextTeamB = match.teamB;
    let nextFairness = match.fairnessRating;
    let nextAltTeamA = match.altTeamA;
    let nextAltTeamB = match.altTeamB;
    let nextAltFairness = match.altFairnessRating;

    if (startersList.length === 12 && (!nextTeamA || !nextTeamB)) {
      const balanced = run462BalancingAlgorithm(startersList, match.checkIns);
      nextTeamA = balanced.teamA;
      nextTeamB = balanced.teamB;
      nextFairness = balanced.fairnessRating;
      nextAltTeamA = balanced.alternative?.teamA;
      nextAltTeamB = balanced.alternative?.teamB;
      nextAltFairness = balanced.alternative?.fairnessRating;
    }

    const nowIso = new Date().toISOString();
    const nextMatch: Match = {
      ...match,
      stage: 'rating',
      isPollOpen: false,
      ratingOpenedManually: true,
      ratingOpenedBy: actorName,
      ratingOpenedAt: nowIso,
      teamA: nextTeamA,
      teamB: nextTeamB,
      fairnessRating: nextFairness,
      altTeamA: nextAltTeamA,
      altTeamB: nextAltTeamB,
      altFairnessRating: nextAltFairness,
    };
    setMatch(nextMatch);
    saveMatchToCloud(nextMatch);
    setActiveTab('rating');
  };

  // İlk 12 doluyken yedekten asile takaslı geçiş (Asile Al ↑ hatasını önler)
  const handleSwapStarterWithWaitlist = (
    waitlistPlayerId: string,
    starterToRemoveId: string,
    moveRemovedTo: 'waitlist' | 'absent'
  ) => {
    if (!isAdminOrCaptain || !lifecycleFlags.canCommitteeManagePoll) return;
    if (!match.waitlist.includes(waitlistPlayerId) || !match.starters.includes(starterToRemoveId)) return;

    const latestPlayers = playersRef.current.length > 0 ? playersRef.current : players;
    const applySwap = (baseMatch: Match): Match => {
      let newStarters = baseMatch.starters.filter((id) => id !== starterToRemoveId);
      if (!newStarters.includes(waitlistPlayerId)) {
        newStarters.push(waitlistPlayerId);
      }
      let newWaitlist = baseMatch.waitlist.filter((id) => id !== waitlistPlayerId && id !== starterToRemoveId);
      let newAbsentees = (baseMatch.absentees || []).filter((id) => id !== waitlistPlayerId);
      const nextCheckIns = { ...baseMatch.checkIns };

      if (moveRemovedTo === 'waitlist') {
        newWaitlist = [starterToRemoveId, ...newWaitlist];
      } else {
        if (!newAbsentees.includes(starterToRemoveId)) {
          newAbsentees.push(starterToRemoveId);
        }
        const prevCi = nextCheckIns[starterToRemoveId];
        nextCheckIns[starterToRemoveId] = {
          playerId: starterToRemoveId,
          timestamp: Date.now(),
          status: prevCi?.status || 'full',
          note: prevCi?.note || 'Kurul değişikliği ile mazeretli',
          attendance: 'no',
          canPayPitchFee: false,
          canBringTea: false,
        };
      }

      const nextVolunteers = (baseMatch.pitchFeeVolunteerIds || []).filter((id) =>
        newStarters.includes(id) || newWaitlist.includes(id)
      );
      const nextPayerId =
        baseMatch.pitchFeePayerId === starterToRemoveId && moveRemovedTo === 'absent'
          ? nextVolunteers[0]
          : baseMatch.pitchFeePayerId;

      const nextTeaVolunteers = (baseMatch.teaVolunteerIds || []).filter((id) =>
        newStarters.includes(id) || newWaitlist.includes(id)
      );
      const nextTeaBringerId =
        baseMatch.teaBringerId === starterToRemoveId && moveRemovedTo === 'absent'
          ? nextTeaVolunteers[0]
          : baseMatch.teaBringerId;

      let updatedMatch: Match = {
        ...baseMatch,
        starters: newStarters,
        waitlist: newWaitlist,
        absentees: newAbsentees,
        pitchFeeVolunteerIds: nextVolunteers,
        pitchFeePayerId: nextPayerId,
        teaVolunteerIds: nextTeaVolunteers,
        teaBringerId: nextTeaBringerId,
        checkIns: nextCheckIns,
      };

      if (newStarters.length === 12) {
        const startersList = latestPlayers.filter((p) => newStarters.includes(p.id));
        if (startersList.length === 12) {
          const rebalanced = run462BalancingAlgorithm(startersList, nextCheckIns);
          updatedMatch = {
            ...updatedMatch,
            teamA: rebalanced.teamA,
            teamB: rebalanced.teamB,
            fairnessRating: rebalanced.fairnessRating,
            altTeamA: rebalanced.alternative?.teamA,
            altTeamB: rebalanced.alternative?.teamB,
            altFairnessRating: rebalanced.alternative?.fairnessRating,
            selectedLineupOption: updatedMatch.selectedLineupOption || 1,
          };
        }
      }
      return updatedMatch;
    };

    const nextLocal = applySwap(match);
    setMatch(nextLocal);
    mutateMatchInCloud(applySwap, nextLocal);
  };

  // Toggle starter participation (Sakatlandım / Çekiliyorum -> promote waitlist #1; or waitlist withdrawal)
  const handleToggleParticipation = (playerId: string) => {
    if (isPendingUser || isFormerUser) return;
    const targetPlayer = players.find((p) => p.id === playerId);
    if (isFormerPlayer(targetPlayer)) return;
    const allowedNow = isAdminOrCaptain
      ? lifecycleFlags.canCommitteeManagePoll
      : lifecycleFlags.canPlayersEditPoll;
    if (!allowedNow) return;

    const latestPlayers = playersRef.current.length > 0 ? playersRef.current : players;
    const applyToggle = (baseMatch: Match): Match => {
      const isStarter = baseMatch.starters.includes(playerId);
      const isWaitlist = baseMatch.waitlist.includes(playerId);
      let newStarters = [...baseMatch.starters];
      let newWaitlist = [...baseMatch.waitlist];

      if (isStarter) {
        newStarters = newStarters.filter((id) => id !== playerId);
        if (newWaitlist.length > 0) {
          const promoted = newWaitlist.shift()!;
          newStarters.push(promoted);
        }
      } else if (newStarters.length < 12) {
        newStarters = [...newStarters, playerId];
        newWaitlist = newWaitlist.filter((id) => id !== playerId);
      } else if (isWaitlist) {
        newWaitlist = newWaitlist.filter((id) => id !== playerId);
      } else {
        return baseMatch;
      }

      const nextVolunteers = (baseMatch.pitchFeeVolunteerIds || []).filter((id) => id !== playerId);
      const nextPayerId =
        baseMatch.pitchFeePayerId === playerId ? nextVolunteers[0] : baseMatch.pitchFeePayerId;
      const nextTeaVolunteers = (baseMatch.teaVolunteerIds || []).filter((id) => id !== playerId);
      const nextTeaBringerId =
        baseMatch.teaBringerId === playerId ? nextTeaVolunteers[0] : baseMatch.teaBringerId;
      const prevCheckIn = baseMatch.checkIns[playerId];
      const nextCheckIns = { ...baseMatch.checkIns };
      if (prevCheckIn && !newStarters.includes(playerId) && !newWaitlist.includes(playerId)) {
        delete nextCheckIns[playerId];
      }

      let nextMatch: Match = {
        ...baseMatch,
        starters: newStarters,
        waitlist: newWaitlist,
        absentees: (baseMatch.absentees || []).filter((id) => id !== playerId),
        pitchFeeVolunteerIds: nextVolunteers,
        pitchFeePayerId: nextPayerId,
        teaVolunteerIds: nextTeaVolunteers,
        teaBringerId: nextTeaBringerId,
        checkIns: nextCheckIns,
      };

      if (newStarters.length === 12) {
        const updatedStartersList = latestPlayers.filter((p) => newStarters.includes(p.id));
        if (updatedStartersList.length === 12) {
          const rebalanced = run462BalancingAlgorithm(updatedStartersList, nextCheckIns);
          nextMatch = {
            ...nextMatch,
            teamA: rebalanced.teamA,
            teamB: rebalanced.teamB,
            fairnessRating: rebalanced.fairnessRating,
            altTeamA: rebalanced.alternative?.teamA,
            altTeamB: rebalanced.alternative?.teamB,
            altFairnessRating: rebalanced.alternative?.fairnessRating,
            selectedLineupOption: 1,
          };
        }
      } else {
        nextMatch = {
          ...nextMatch,
          teamA: undefined,
          teamB: undefined,
          altTeamA: undefined,
          altTeamB: undefined,
          fairnessRating: undefined,
          altFairnessRating: undefined,
        };
      }
      return nextMatch;
    };

    const nextLocal = applyToggle(match);
    setMatch(nextLocal);
    mutateMatchInCloud(applyToggle, nextLocal);
  };

  // Site içi maç anketine katılım, form durumu, halı saha ödeme ve çay gönüllülüğü kaydet
  const handleJoinPollWithCheckIn = (
    playerId: string,
    status: PhysicalStatus,
    note?: string,
    attendance: PollAttendanceChoice = 'yes',
    canPayPitchFee: boolean = false,
    canBringTea: boolean = false
  ) => {
    if (isPendingUser || isFormerUser) return;
    const targetPlayer = players.find((p) => p.id === playerId);
    if (isFormerPlayer(targetPlayer)) return;
    const allowedNow = isAdminOrCaptain
      ? lifecycleFlags.canCommitteeManagePoll
      : lifecycleFlags.canPlayersEditPoll;
    if (!allowedNow) return;

    const cleanAttendance: PollAttendanceChoice = attendance === 'no' ? 'no' : 'yes';
    const cleanCanPay = cleanAttendance === 'yes' && Boolean(canPayPitchFee);
    const cleanCanBringTea = cleanAttendance === 'yes' && Boolean(canBringTea);

    const entry: CheckInEntry = {
      playerId,
      timestamp: Date.now(),
      status: cleanAttendance === 'yes' ? status : 'full',
      note: note?.trim() || undefined,
      attendance: cleanAttendance,
      canPayPitchFee: cleanCanPay,
      canBringTea: cleanCanBringTea,
    };

    let updatedPlayers = players;
    if (cleanAttendance === 'yes') {
      const protectedAwardThemes: CardTheme[] = ['totw', 'wall', 'bidon', 'inform'];
      updatedPlayers = players.map((p) => {
        if (p.id !== playerId) return p;
        const preserveAwardTheme = protectedAwardThemes.includes(p.theme);
        const updatedP: Player = {
          ...p,
          currentStatus: status,
          theme: preserveAwardTheme
            ? p.theme
            : status === 'light_injury'
            ? 'revir'
            : p.theme === 'revir'
            ? getDefaultCardThemeForPlayer({ ...p, currentStatus: status })
            : p.theme,
        };
        savePlayerToCloud(updatedP);
        return updatedP;
      });
      setPlayers(updatedPlayers);
    }

    const applyPollJoin = (baseMatch: Match): Match => {
      const newCheckIns = {
        ...baseMatch.checkIns,
        [playerId]: entry,
      };

      let newStarters = [...baseMatch.starters];
      let newWaitlist = [...baseMatch.waitlist];
      let newAbsentees = [...(baseMatch.absentees || [])];

      if (cleanAttendance === 'yes') {
        newAbsentees = newAbsentees.filter((id) => id !== playerId);
        const inStarters = newStarters.includes(playerId);
        const inWaitlist = newWaitlist.includes(playerId);
        if (!inStarters && !inWaitlist) {
          if (newStarters.length < 12) {
            newStarters.push(playerId);
          } else {
            newWaitlist.push(playerId);
          }
        }
      } else {
        // Gelemeyeceğim: asilden çıktıysa ilk yedeği asile al
        const wasStarter = newStarters.includes(playerId);
        newStarters = newStarters.filter((id) => id !== playerId);
        newWaitlist = newWaitlist.filter((id) => id !== playerId);
        if (wasStarter && newWaitlist.length > 0 && newStarters.length < 12) {
          const promoted = newWaitlist.shift()!;
          newStarters.push(promoted);
        }
        if (!newAbsentees.includes(playerId)) {
          newAbsentees.push(playerId);
        }
      }

      // Halı saha ücreti gönüllüleri ve resmi ödeyici senkronizasyonu
      const volunteerSet = new Set(baseMatch.pitchFeeVolunteerIds || []);
      if (cleanCanPay) {
        volunteerSet.add(playerId);
      } else {
        volunteerSet.delete(playerId);
      }
      const nextVolunteers = Array.from(volunteerSet).filter(
        (id) => newStarters.includes(id) || newWaitlist.includes(id)
      );
      let nextPayerId = baseMatch.pitchFeePayerId;
      if (cleanCanPay && !nextPayerId) {
        nextPayerId = playerId;
      } else if (!cleanCanPay && nextPayerId === playerId) {
        nextPayerId = nextVolunteers[0];
      }

      // Termos çay gönüllüleri senkronizasyonu
      const teaVolunteerSet = new Set(baseMatch.teaVolunteerIds || []);
      if (cleanCanBringTea) {
        teaVolunteerSet.add(playerId);
      } else {
        teaVolunteerSet.delete(playerId);
      }
      const nextTeaVolunteers = Array.from(teaVolunteerSet).filter(
        (id) => newStarters.includes(id) || newWaitlist.includes(id)
      );
      let nextTeaBringerId = baseMatch.teaBringerId;
      if (cleanCanBringTea && !nextTeaBringerId) {
        nextTeaBringerId = playerId;
      } else if (!cleanCanBringTea && nextTeaBringerId === playerId) {
        nextTeaBringerId = nextTeaVolunteers[0];
      }

      let nextMatch: Match = {
        ...baseMatch,
        starters: newStarters,
        waitlist: newWaitlist,
        absentees: newAbsentees,
        pitchFeeVolunteerIds: nextVolunteers,
        pitchFeePayerId: nextPayerId,
        teaVolunteerIds: nextTeaVolunteers,
        teaBringerId: nextTeaBringerId,
        checkIns: newCheckIns,
      };

      if (newStarters.length === 12) {
        const startersList = updatedPlayers.filter((p) => newStarters.includes(p.id));
        if (startersList.length === 12) {
          const res = run462BalancingAlgorithm(startersList, newCheckIns);
          nextMatch = {
            ...nextMatch,
            teamA: res.teamA,
            teamB: res.teamB,
            fairnessRating: res.fairnessRating,
            altTeamA: res.alternative?.teamA,
            altTeamB: res.alternative?.teamB,
            altFairnessRating: res.alternative?.fairnessRating,
            selectedLineupOption: nextMatch.selectedLineupOption || 1,
          };
        }
      } else {
        nextMatch = {
          ...nextMatch,
          teamA: undefined,
          teamB: undefined,
          altTeamA: undefined,
          altTeamB: undefined,
          fairnessRating: undefined,
          altFairnessRating: undefined,
        };
      }
      return nextMatch;
    };

    const nextLocal = applyPollJoin(match);
    setMatch(nextLocal);
    mutateMatchInCloud(applyPollJoin, nextLocal);
  };

  // Yönetici / Kurul: Yeni hafta maç anketi aç (önceki tamamlanmış maçı otomatik pastMatches'e arşivle) ve Soyunma Odasına duyur
  const handleCreateNewPoll = (config: PollConfigPayload) => {
    const shouldArchivePrev =
      Boolean(match.awards?.isConfirmedByCommittee) ||
      Boolean(match.teamA?.players?.length && match.teamB?.players?.length && match.starters.length === 12);

    if (shouldArchivePrev) {
      setPastMatches((prevPast) => {
        if (prevPast.some((pm) => pm.id === match.id)) return prevPast;
        const archivedPrev: Match = {
          ...match,
          stage: 'archived',
          isPollOpen: false,
        };
        const nextPast = [...prevPast, archivedPrev];
        savePastMatchesToCloud(nextPast);
        return nextPast;
      });
    }

    const openerName = claimedPlayer?.name || currentUser?.displayName?.split(' ')[0] || 'Kurul';
    const newMatch: Match = {
      id: `match-${Date.now()}`,
      title: config.title,
      date: config.date,
      matchTime: config.matchTime,
      pitchName: config.pitchName,
      pitchLocationUrl: config.pitchLocationUrl,
      pitchFee: config.pitchFee,
      pitchFeePayerId: undefined,
      pitchFeeVolunteerIds: [],
      teaBringerId: undefined,
      teaVolunteerIds: [],
      tacticalNotes: config.tacticalNotes,
      isPollOpen: config.isPollOpen,
      pollOpenedBy: openerName,
      pollOpenedAt: new Date().toISOString(),
      ratingOpenedManually: false,
      ratingOpenedBy: undefined,
      ratingOpenedAt: undefined,
      stage: 'check_in',
      starters: [],
      waitlist: [],
      absentees: [],
      checkIns: {},
      teamA: undefined,
      teamB: undefined,
      altTeamA: undefined,
      altTeamB: undefined,
      fairnessRating: undefined,
      altFairnessRating: undefined,
      selectedLineupOption: 1,
      score: undefined,
      ratings: [],
      ballots: [],
      awards: undefined,
      statsApplied: undefined,
      baselineOVRs: {},
      baselineExactOVRs: {},
    };
    setMatch(newMatch);
    saveMatchToCloud(newMatch);

    const formattedDay = new Date(config.date).toLocaleDateString('tr-TR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
    const announcement: LockerPost = {
      id: `post-${Date.now()}-poll`,
      matchId: newMatch.id,
      authorPlayerId: claimedPlayer?.id || 'system',
      authorName: `${openerName} • Maç Anketi Duyurusu 🗳️`,
      text: `📢 YENİ MAÇ ANKETİ AÇILDI: ${config.title}\n📅 ${formattedDay} • ⏰ ${config.matchTime}\n📍 ${config.pitchName}${config.pitchFee ? ` • 💳 Saha Ücreti: ${config.pitchFee}` : ''}\nMaç & Check-In ekranından katılım durumunu, formunu ve istersen "Bu hafta ben ödeyebilirim" seçeneğini işaretle! İlk 12 asil kadroya girer.`,
      isAnonymous: false,
      isHeadline: true,
      reactions: { fire: claimedPlayer ? [claimedPlayer.id] : [], laugh: [], violin: [], revir: [], goat: [] },
      createdAt: new Date().toISOString(),
    };
    const nextPosts = [announcement, ...posts];
    setPosts(nextPosts);
    mutatePostsInCloud(
      (latest) => [announcement, ...latest.filter((p) => p.id !== announcement.id)],
      nextPosts
    );
  };

  // Yönetici / Kurul: Mevcut anket bilgilerini (saat, saha, ücret, not, kilit) güncelle
  const handleUpdatePollConfig = (config: PollConfigPayload) => {
    const nextMatch: Match = {
      ...match,
      title: config.title,
      date: config.date,
      matchTime: config.matchTime,
      pitchName: config.pitchName,
      pitchLocationUrl: config.pitchLocationUrl,
      pitchFee: config.pitchFee,
      tacticalNotes: config.tacticalNotes,
      isPollOpen: config.isPollOpen,
    };
    setMatch(nextMatch);
    saveMatchToCloud(nextMatch);
  };

  // Yönetici / Kurul: Haftanın resmi halı saha ücreti ödeyicisini belirle veya kaldır
  const handleSelectPitchFeePayer = (playerId?: string) => {
    const nextVolunteers = playerId
      ? Array.from(new Set([...(match.pitchFeeVolunteerIds || []), playerId]))
      : match.pitchFeeVolunteerIds || [];
    const nextMatch: Match = {
      ...match,
      pitchFeePayerId: playerId,
      pitchFeeVolunteerIds: nextVolunteers,
    };
    setMatch(nextMatch);
    saveMatchToCloud(nextMatch);
  };

  // Yönetici / Kurul: Haftanın termos çay getirecek gönüllüsünü belirle veya kaldır
  const handleSelectTeaBringer = (playerId?: string) => {
    const nextTeaVolunteers = playerId
      ? Array.from(new Set([...(match.teaVolunteerIds || []), playerId]))
      : match.teaVolunteerIds || [];
    const nextMatch: Match = {
      ...match,
      teaBringerId: playerId,
      teaVolunteerIds: nextTeaVolunteers,
    };
    setMatch(nextMatch);
    saveMatchToCloud(nextMatch);
  };

  // Yeni hafta anketi başlat (geriye dönük sıfırlama yardımcısı)
  const handleResetMatchPoll = () => {
    if (
      !window.confirm(
        'Yeni hafta katılım anketini başlatmak istediğinize emin misiniz? Asil/yedek listesi, check-in ve oylamalar temizlenir.'
      )
    ) {
      return;
    }
    const nextMatch: Match = {
      ...match,
      stage: 'check_in',
      starters: [],
      waitlist: [],
      absentees: [],
      pitchFeePayerId: undefined,
      pitchFeeVolunteerIds: [],
      teaBringerId: undefined,
      teaVolunteerIds: [],
      checkIns: {},
      teamA: undefined,
      teamB: undefined,
      altTeamA: undefined,
      altTeamB: undefined,
      fairnessRating: undefined,
      altFairnessRating: undefined,
      selectedLineupOption: 1,
      score: undefined,
      ratings: [],
      ballots: [],
      awards: undefined,
      statsApplied: undefined,
      baselineOVRs: {},
    };
    setMatch(nextMatch);
    saveMatchToCloud(nextMatch);
  };

  // Geçmiş oynanan maçları seçme ve kadro / denge / 360° puanlamalarını görüntüleme
  const handleSelectPastMatch = (matchId: string) => {
    const selected = PAST_MATCHES.find((m: Match) => m.id === matchId);
    if (!selected) return;
    const startersList = players.filter((p) => selected.starters.includes(p.id));
    const balance = run462BalancingAlgorithm(startersList, selected.checkIns || {});
    const fullMatch: Match = {
      ...selected,
      teamA: balance.teamA,
      teamB: balance.teamB,
      fairnessRating: balance.fairnessRating,
      altTeamA: balance.alternative?.teamA,
      altTeamB: balance.alternative?.teamB,
      altFairnessRating: balance.alternative?.fairnessRating,
      selectedLineupOption: 1,
    };
    setMatch(fullMatch);
  };

  // Handle post-match 360 ratings and individual ballots (yalnızca maç bitince / 14:00 öncesi ve ilk 12'si)
  const handleSaveRatings = (votes: MatchRatingVote[], provisionalAwards: MatchAwards, ballot?: MatchBallot) => {
    if (isPendingUser || isFormerUser || !lifecycleFlags.canVote360 || !claimedPlayer || !match.starters.includes(claimedPlayer.id)) {
      return;
    }

    const latestPlayers = playersRef.current.length > 0 ? playersRef.current : players;
    const localResult = applyMatchRatingsToSquad({
      players: latestPlayers,
      match,
      votes,
      provisionalAwards,
      ballot,
    });

    setPlayers(localResult.updatedPlayers);
    savePlayersBatchToCloud(localResult.changedStarterPlayers);
    setMatch(localResult.nextMatch);

    mutateMatchInCloud((latestCloudMatch) => {
      const res = applyMatchRatingsToSquad({
        players: latestPlayers,
        match: latestCloudMatch,
        votes,
        provisionalAwards,
        ballot,
      });
      return res.nextMatch;
    }, localResult.nextMatch).then((syncedMatch) => {
      setMatch(syncedMatch);
    });
  };

  // Yönetici Modu: Gizli kıdem sıralamasını kaydet ve aktif takımlardaki Yelekli/Yeleksiz dağılımını güncelle
  const handleSaveSeniority = (orderedPlayerIds: string[]) => {
    if (!isSuperAdmin) return;
    const rankMap = new Map<string, number>();
    orderedPlayerIds.forEach((id, idx) => rankMap.set(id, idx + 1));

    const updatedPlayers = players.map((p) => {
      const rank = rankMap.get(p.id);
      return rank !== undefined ? { ...p, seniorityRank: rank } : p;
    });
    playersRef.current = updatedPlayers;
    setPlayers(updatedPlayers);
    savePlayersBatchToCloud(updatedPlayers);

    if (match.teamA && match.teamB) {
      const primary = applySeniorityToSquadPair(match.teamA, match.teamB, updatedPlayers);
      const alt =
        match.altTeamA && match.altTeamB
          ? applySeniorityToSquadPair(match.altTeamA, match.altTeamB, updatedPlayers)
          : undefined;
      const nextMatch: Match = {
        ...match,
        teamA: primary.teamA,
        teamB: primary.teamB,
        altTeamA: alt?.teamA,
        altTeamB: alt?.teamB,
      };
      setMatch(nextMatch);
      saveMatchToCloud(nextMatch);
    }

    setPastMatches((prevPast) => {
      let changed = false;
      const nextPast = prevPast.map((pm) => {
        if (pm.altTeamA && pm.altTeamB && pm.altTeamA.players.length === 6 && pm.altTeamB.players.length === 6) {
          const altApplied = applySeniorityToSquadPair(pm.altTeamA, pm.altTeamB, updatedPlayers);
          if (altApplied.teamA !== pm.altTeamA || altApplied.teamB !== pm.altTeamB) {
            changed = true;
            return { ...pm, altTeamA: altApplied.teamA, altTeamB: altApplied.teamB };
          }
        }
        return pm;
      });
      if (changed) {
        savePastMatchesToCloud(nextPast);
      }
      return changed ? nextPast : prevPast;
    });
  };

  // Handle Kurul Veto, Son Mühür, Otomatik Maç/Galibiyet İstatistiği & Resmi Kart Dağıtımı
  const handleCommitteeConfirmAwards = (finalAwards: MatchAwards) => {
    if (!isAdminOrCaptain || !lifecycleFlags.canSealAwards) return;
    const wasAlreadyConfirmed = Boolean(match.awards?.isConfirmedByCommittee);
    const prevAwards = match.awards;
    const useAltLineup = match.selectedLineupOption === 2 && Boolean(match.altTeamA && match.altTeamB);
    const activeSquadA = useAltLineup ? match.altTeamA : match.teamA;
    const activeSquadB = useAltLineup ? match.altTeamB : match.teamB;

    const starterIds = Array.from(
      new Set(
        activeSquadA && activeSquadB
          ? [
              ...activeSquadA.players.map((x) => x.player.id),
              ...activeSquadB.players.map((x) => x.player.id),
            ]
          : (match.starters || []).slice(0, 12)
      )
    );

    const winnerPlayerIds = Array.from(
      new Set(
        finalAwards.winnerTeam === 'A' && activeSquadA
          ? activeSquadA.players.map((x) => x.player.id)
          : finalAwards.winnerTeam === 'B' && activeSquadB
          ? activeSquadB.players.map((x) => x.player.id)
          : []
      )
    );

    const prevApplied = match.statsApplied;
    const starterSet = new Set(starterIds);
    const winnerSet = new Set(winnerPlayerIds);
    const prevStarterSet = new Set(prevApplied?.starterIds || []);
    const prevWinnerSet = new Set(prevApplied?.winnerPlayerIds || []);
    const hasWinner = finalAwards.winnerTeam === 'A' || finalAwards.winnerTeam === 'B';
    const prevHasWinner = prevApplied?.winnerTeam === 'A' || prevApplied?.winnerTeam === 'B';

    const updatedPlayers = players.map((p) => {
      const nextMatchesPlayed = Math.max(
        0,
        (p.matchesPlayed || 0) - (prevStarterSet.has(p.id) ? 1 : 0) + (starterSet.has(p.id) ? 1 : 0)
      );
      const nextWins = Math.max(
        0,
        (p.wins || 0) - (prevWinnerSet.has(p.id) ? 1 : 0) + (winnerSet.has(p.id) ? 1 : 0)
      );
      const prevWasLoser = prevHasWinner && prevStarterSet.has(p.id) && !prevWinnerSet.has(p.id);
      const nextIsLoser = hasWinner && starterSet.has(p.id) && !winnerSet.has(p.id);
      const nextLosses = Math.max(
        0,
        (p.losses || 0) - (prevWasLoser ? 1 : 0) + (nextIsLoser ? 1 : 0)
      );
      const nextRecordFields = {
        matchesPlayed: nextMatchesPlayed,
        wins: nextWins,
        losses: nextLosses,
        recordSyncVersion: CURRENT_RECORD_SYNC_VERSION,
      };

      // 1. Haftanın MVP'si (Efsane olsa bile hak ettiğinde MVP olabilir!)
      if (finalAwards.mvpId === p.id) {
        return { ...p, ...nextRecordFields, theme: 'totw' as const };
      }
      // 2. Haftanın Bidonu (Efsaneler ASLA bidon seçilemez!)
      if (finalAwards.bidonId === p.id && !isClubLegendPlayer(p)) {
        return { ...p, ...nextRecordFields, theme: 'bidon' as const };
      }
      // 3. Alev Atıyo! Kartları (Efsane olsa bile hak ettiğinde Alev Atıyo! olabilir!)
      if (finalAwards.inFormIds?.includes(p.id)) {
        return { ...p, ...nextRecordFields, theme: 'inform' as const };
      }
      // 4. Haftanın Etten Duvarı (En İyi Savunma / Kaleci)
      if (finalAwards.wallId === p.id) {
        return { ...p, ...nextRecordFields, theme: 'wall' as const };
      }
      // 5 & 6. Özel unvan almayanlar: Revir durumu korunur; aksi halde Efsaneler (İsmail, Gölcür, Cevdet) 'legend' temasına, standart oyuncular OVR seviyesine göre (Bronz/Gümüş/Altın) döner!
      return {
        ...p,
        ...nextRecordFields,
        theme: getDefaultCardThemeForPlayer(p),
      };
    });

    setPlayers(updatedPlayers);
    savePlayersBatchToCloud(updatedPlayers);

    const nextMatch: Match = {
      ...match,
      stage: 'archived',
      isPollOpen: false,
      awards: finalAwards,
      statsApplied: {
        starterIds,
        winnerPlayerIds,
        winnerTeam: finalAwards.winnerTeam,
      },
    };
    setMatch(nextMatch);
    mutateMatchInCloud((latest) => ({
      ...latest,
      stage: 'archived',
      isPollOpen: false,
      awards: finalAwards,
      statsApplied: nextMatch.statsApplied,
    }), nextMatch);

    // If Haftanın Bidonu chosen, upsert deterministic Thermos Tea debt (tekrar basımda mükerrer borç eklemez!)
    const deterministicDebtId = `debt-bidon-${match.id}`;
    const bidonPlayer = finalAwards.bidonId ? players.find((p) => p.id === finalAwards.bidonId) : undefined;
    const nextBidonDebt: DessertDebt | null = bidonPlayer
      ? {
          id: deterministicDebtId,
          debtorPlayerId: bidonPlayer.id,
          description: 'Maç sonu oylamasında Haftanın Bidonu seçildi! Haftaya sahaya koca bir termos çay getirecek ☕🫖',
          treatType: 'çay',
          status: 'pending',
          createdAt: new Date().toISOString(),
        }
      : null;

    const existingWithoutThisMatch = debts.filter((d) => d.id !== deterministicDebtId);
    const nextDebts = nextBidonDebt ? [nextBidonDebt, ...existingWithoutThisMatch] : existingWithoutThisMatch;
    if (nextBidonDebt || debts.some((d) => d.id === deterministicDebtId)) {
      setDebts(nextDebts);
      upsertBidonDebtInCloud(match.id, nextBidonDebt, nextDebts);
    }

    // Official Kurul Mührü Announcements in Soyunma Odası (ilk mühürde tam duyuru, güncellemede tek kısa not)
    const mvpPlayer = players.find((p) => p.id === finalAwards.mvpId);
    const wallPlayer = finalAwards.wallId ? players.find((p) => p.id === finalAwards.wallId) : undefined;
    const inFormPlayers = (finalAwards.inFormIds || [])
      .map((id) => players.find((p) => p.id === id))
      .filter(Boolean) as Player[];

    const newAnnouncements: LockerPost[] = [];

    if (wasAlreadyConfirmed) {
      const awardsChanged =
        prevAwards?.mvpId !== finalAwards.mvpId ||
        prevAwards?.wallId !== finalAwards.wallId ||
        prevAwards?.bidonId !== finalAwards.bidonId ||
        prevAwards?.winnerTeam !== finalAwards.winnerTeam ||
        (prevAwards?.inFormIds || []).join(',') !== (finalAwards.inFormIds || []).join(',');
      if (awardsChanged) {
        const editorLabel = finalAwards.updatedBy || finalAwards.confirmedBy || 'Kurul';
        newAnnouncements.push({
          id: `post-${Date.now()}-seal-update`,
          matchId: match.id,
          authorPlayerId: 'system',
          authorName: `${editorLabel} • Kurul Mührü Güncellemesi 🔏`,
          text: `🔏 ${match.title} mühür kararları ${editorLabel} tarafından güncellendi.${mvpPlayer ? ` MVP: ${mvpPlayer.name}` : ''}${wallPlayer ? ` • Duvar: ${wallPlayer.name}` : ''}${bidonPlayer ? ` • Bidon: ${bidonPlayer.name}` : ''}`,
          isAnonymous: false,
          reactions: { fire: [], laugh: [], violin: [], revir: [], goat: [] },
          createdAt: new Date().toISOString(),
        });
      }
    } else {
      if (mvpPlayer) {
        newAnnouncements.push({
          id: `post-${Date.now()}-mvp`,
          matchId: match.id,
          authorPlayerId: 'system',
          authorName: `${finalAwards.confirmedBy || 'Revir FC Kurul Mührü'} 🔏`,
          text: `🏆 HAFTANIN RESMİ MVP'Sİ: ${mvpPlayer.name}! Kurul mührü ve maç sonu oylarıyla haftanın en değerlisi tescillendi! 1 hafta boyunca parlayan Siyah-Kozmik Kristal MVP kartını göğsüne taktı! ⭐⚽`,
          isAnonymous: false,
          reactions: { fire: [mvpPlayer.id], laugh: [], violin: [], revir: [], goat: [mvpPlayer.id] },
          createdAt: new Date().toISOString(),
        });
      }

      if (wallPlayer) {
        newAnnouncements.push({
          id: `post-${Date.now()}-wall`,
          matchId: match.id,
          authorPlayerId: 'system',
          authorName: `${finalAwards.confirmedBy || 'Revir FC Kurul Mührü'} 🔏`,
          text: `🧱 HAFTANIN SAHA DUVARI: ${wallPlayer.name}! Kurul mührüyle sahada geçit vermeyen savunma/kaleci performansıyla tescillendi! 🧤🛡️`,
          isAnonymous: false,
          reactions: { fire: [wallPlayer.id], laugh: [], violin: [], revir: [], goat: [wallPlayer.id] },
          createdAt: new Date().toISOString(),
        });
      }

      if (bidonPlayer) {
        newAnnouncements.push({
          id: `post-${Date.now()}-bidon`,
          matchId: match.id,
          authorPlayerId: 'system',
          authorName: `${finalAwards.confirmedBy || 'Revir FC Kurul Mührü'} 🔏`,
          text: `🪵 HAFTANIN BİDONU: ${bidonPlayer.name}! Kurul kararıyla haftanın bidon kartı takıldı. Takıma haftaya koca bir termos sıcak çay getirme borcu yazıldı! Afiyet olsun! ☕🫖😂`,
          isAnonymous: false,
          reactions: { fire: [], laugh: [bidonPlayer.id], violin: [], revir: [], goat: [] },
          createdAt: new Date().toISOString(),
        });
      } else {
        newAnnouncements.push({
          id: `post-${Date.now()}-nobidon`,
          matchId: match.id,
          authorPlayerId: 'system',
          authorName: `${finalAwards.confirmedBy || 'Revir FC Kurul Mührü'} 🔏`,
          text: `👏 KURUL KARARI: Bu hafta kimseye Haftanın Bidonu verilmedi! Kurul tüm kadronun mücadelesinden memnun kaldı, çaylar kulüpten! ☕✨`,
          isAnonymous: false,
          reactions: { fire: [], laugh: [], violin: [], revir: [], goat: [] },
          createdAt: new Date().toISOString(),
        });
      }

      if (inFormPlayers.length > 0) {
        const names = inFormPlayers.map((p) => p.name).join(', ');
        newAnnouncements.push({
          id: `post-${Date.now()}-inform`,
          matchId: match.id,
          authorPlayerId: 'system',
          authorName: `${finalAwards.confirmedBy || 'Revir FC Kurul Mührü'} 🔏`,
          text: `🔥 ALEV ATIYO!: Kurul tarafından bu haftanın sahada durdurulamayan yıldızları ${names} seçildi! Alev Atıyo! kartları hayırlı olsun! ⚽`,
          isAnonymous: false,
          reactions: { fire: inFormPlayers.map((p) => p.id), laugh: [], violin: [], revir: [], goat: [] },
          createdAt: new Date().toISOString(),
        });
      }
    }

    if (newAnnouncements.length > 0) {
      const nextPosts = [...newAnnouncements, ...posts];
      setPosts(nextPosts);
      const newIds = new Set(newAnnouncements.map((p) => p.id));
      mutatePostsInCloud(
        (latest) => [...newAnnouncements, ...latest.filter((p) => !newIds.has(p.id))],
        nextPosts
      );
    }
  };

  // Add post (text posts -> app_state/locker_posts, photo posts -> photos/{id} docs to stay lightweight under 1 MiB)
  const handleAddPost = (
    text: string,
    isAnonymous: boolean,
    media?: { imageUrl: string; matchTitle?: string; taggedPlayerIds?: string[] }
  ) => {
    if (isPendingUser || isFormerUser) return;
    const authorId = isAnonymous ? 'anonymous' : (claimedPlayer?.id || 'guest');
    const authorName = isAnonymous ? 'Anonim Soyunma Odası Fısıltısı' : (claimedPlayer?.name || 'Misafir Oyuncu');
    const createdAt = new Date().toISOString();

    if (media?.imageUrl) {
      const newPhoto: PhotoArchiveItem = {
        id: `photo-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
        matchId: match.id,
        matchTitle: media.matchTitle || match.title || 'Soyunma Odası Anısı',
        imageUrl: media.imageUrl,
        caption: text,
        taggedPlayerIds: media.taggedPlayerIds || [],
        likes: [],
        emojiReactions: {},
        comments: [],
        authorPlayerId: claimedPlayer?.id,
        uploadedBy: claimedPlayer?.name || currentUser?.displayName?.split(' ')[0] || 'Üye',
        createdAt,
      };
      setPhotos((prev) => [newPhoto, ...prev]);
      savePhotoItemToCloud(newPhoto);
      return;
    }

    const newPost: LockerPost = {
      id: `post-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      matchId: match.id,
      authorPlayerId: authorId,
      authorName,
      authorPhoto: isAnonymous ? undefined : claimedPlayer?.photoUrl,
      text,
      isAnonymous,
      reactions: { fire: [], laugh: [], violin: [], revir: [], goat: [] },
      emojiReactions: {},
      comments: [],
      createdAt,
    };

    if (isAnonymous) {
      setOwnAnonPostIds((prev) => {
        const nextAnon = [newPost.id, ...prev.slice(0, 49)];
        if (!isTestModeRef.current) {
          try {
            localStorage.setItem('revirfc_own_anon_posts_v1', JSON.stringify(nextAnon));
          } catch {}
        }
        return nextAnon;
      });
    }

    const nextPosts = [newPost, ...posts];
    setPosts(nextPosts);
    mutatePostsInCloud(
      (latest) => [newPost, ...latest.filter((p) => p.id !== newPost.id)],
      nextPosts
    );
  };

  // Edit locker post or photo caption (WhatsApp-style 15 min window, author-only)
  const handleEditPost = (
    itemId: string,
    source: 'post' | 'photo',
    newText: string,
    newMatchTitle?: string
  ) => {
    const cleanText = newText.trim();
    if (!cleanText || isPendingUser || isFormerUser || !claimedPlayer) return;
    const editedAt = new Date().toISOString();

    if (source === 'post') {
      const target = posts.find((p) => p.id === itemId);
      if (!target || target.isDeleted) return;
      const isAuthor = target.isAnonymous
        ? ownAnonPostIds.includes(target.id)
        : target.authorPlayerId === claimedPlayer.id ||
          (!target.authorPlayerId && target.authorName === claimedPlayer.name);
      if (!isAuthor) return;
      if (Date.now() - new Date(target.createdAt).getTime() > LOCKER_EDIT_WINDOW_MS) {
        alert('WhatsApp tarzı 15 dakikalık düzenleme süresi doldu.');
        return;
      }

      const mutator = (list: LockerPost[]) =>
        list.map((p) =>
          p.id === itemId && !p.isDeleted ? { ...p, text: cleanText, editedAt } : p
        );
      const nextPosts = mutator(posts);
      setPosts(nextPosts);
      mutatePostsInCloud(mutator, nextPosts);
      return;
    }

    const targetPhoto = photos.find((ph) => ph.id === itemId);
    if (!targetPhoto || targetPhoto.isDeleted) return;
    const isPhotoAuthor =
      targetPhoto.authorPlayerId === claimedPlayer.id ||
      (!targetPhoto.authorPlayerId && targetPhoto.uploadedBy === claimedPlayer.name);
    if (!isPhotoAuthor) return;
    if (Date.now() - new Date(targetPhoto.createdAt).getTime() > LOCKER_EDIT_WINDOW_MS) {
      alert('WhatsApp tarzı 15 dakikalık düzenleme süresi doldu.');
      return;
    }

    const mutator = (ph: PhotoArchiveItem): PhotoArchiveItem =>
      ph.isDeleted
        ? ph
        : {
            ...ph,
            caption: cleanText,
            matchTitle: newMatchTitle !== undefined ? newMatchTitle.trim() : ph.matchTitle,
            editedAt,
          };
    const updatedPhoto = mutator(targetPhoto);
    setPhotos((prev) => prev.map((ph) => (ph.id === itemId ? updatedPhoto : ph)));
    mutatePhotoItemInCloud(itemId, mutator, updatedPhoto);
  };

  // Delete locker post or photo (WhatsApp-style "Herkesten Sil" within 48h or Committee anytime; Committee "purge" removes tombstone)
  const handleDeletePost = (
    itemId: string,
    source: 'post' | 'photo',
    mode: 'everyone' | 'purge'
  ) => {
    if (isPendingUser || isFormerUser || !claimedPlayer) return;
    if (mode === 'purge' && !isAdminOrCaptain) return;
    const deletedAt = new Date().toISOString();

    if (source === 'post') {
      const target = posts.find((p) => p.id === itemId);
      if (!target) return;
      const isAuthor = target.isAnonymous
        ? ownAnonPostIds.includes(target.id)
        : target.authorPlayerId === claimedPlayer.id ||
          (!target.authorPlayerId && target.authorName === claimedPlayer.name);
      const withinWindow = Date.now() - new Date(target.createdAt).getTime() <= LOCKER_DELETE_WINDOW_MS;

      if (mode === 'everyone') {
        if (target.isDeleted) return;
        if (!isAdminOrCaptain && !(isAuthor && withinWindow)) {
          alert('Herkesten silme süresi (48 saat) doldu; isterseniz "Benden Sil" seçeneğini kullanabilirsiniz.');
          return;
        }
        const mutator = (list: LockerPost[]) =>
          list.map((p) =>
            p.id === itemId
              ? {
                  ...p,
                  text: '',
                  imageUrl: undefined,
                  taggedPlayerIds: [],
                  isHeadline: false,
                  isDeleted: true,
                  deletedAt,
                  deletedBy: isAuthor ? ('author' as const) : ('committee' as const),
                  reactions: { fire: [], laugh: [], violin: [], revir: [], goat: [] },
                  emojiReactions: {},
                }
              : p
          );
        const nextPosts = mutator(posts);
        setPosts(nextPosts);
        mutatePostsInCloud(mutator, nextPosts);
      } else {
        const mutator = (list: LockerPost[]) => list.filter((p) => p.id !== itemId);
        const nextPosts = mutator(posts);
        setPosts(nextPosts);
        mutatePostsInCloud(mutator, nextPosts);
      }
      return;
    }

    const targetPhoto = photos.find((ph) => ph.id === itemId);
    if (!targetPhoto) return;
    const isPhotoAuthor =
      targetPhoto.authorPlayerId === claimedPlayer.id ||
      (!targetPhoto.authorPlayerId && targetPhoto.uploadedBy === claimedPlayer.name);
    const withinWindow = Date.now() - new Date(targetPhoto.createdAt).getTime() <= LOCKER_DELETE_WINDOW_MS;

    if (mode === 'everyone') {
      if (targetPhoto.isDeleted) return;
      if (!isAdminOrCaptain && !(isPhotoAuthor && withinWindow)) {
        alert('Herkesten silme süresi (48 saat) doldu; isterseniz "Benden Sil" seçeneğini kullanabilirsiniz.');
        return;
      }
    }

    const mutator = (ph: PhotoArchiveItem): PhotoArchiveItem => ({
      ...ph,
      caption: '',
      imageUrl: '',
      taggedPlayerIds: [],
      likes: [],
      emojiReactions: {},
      isHeadline: false,
      isDeleted: true,
      isPurged: mode === 'purge' ? true : ph.isPurged,
      deletedAt: ph.deletedAt || deletedAt,
      deletedBy: ph.deletedBy || (isPhotoAuthor ? 'author' : 'committee'),
    });
    const updatedPhoto = mutator(targetPhoto);
    setPhotos((prev) => prev.map((ph) => (ph.id === itemId ? updatedPhoto : ph)));
    mutatePhotoItemInCloud(itemId, mutator, updatedPhoto);
  };

  // React to locker room post (classic 5 reactions)
  const handleReactPost = (postId: string, reactionType: keyof LockerPost['reactions']) => {
    if (isPendingUser || isFormerUser) return;
    const raterId = claimedPlayer?.id || 'guest';
    const mutator = (list: LockerPost[]) =>
      list.map((p) => {
        if (p.id !== postId || p.isDeleted) return p;
        const currentList = p.reactions[reactionType] || [];
        const hasReacted = currentList.includes(raterId);

        const updatedList = hasReacted
          ? currentList.filter((id) => id !== raterId)
          : [...currentList, raterId];

        return {
          ...p,
          reactions: {
            ...p.reactions,
            [reactionType]: updatedList,
          },
        };
      });
    const nextPosts = mutator(posts);
    setPosts(nextPosts);
    mutatePostsInCloud(mutator, nextPosts);
  };

  // WhatsApp-style emoji reactions for unified locker posts & archived photos
  const handleToggleEmojiReaction = (itemId: string, source: 'post' | 'photo', emoji: string) => {
    if (isPendingUser || isFormerUser) return;
    const reactorId = claimedPlayer?.id || currentUser?.uid || 'guest';
    const toggleMap = (existing?: Record<string, string[]>) => {
      const nextMap: Record<string, string[]> = { ...(existing || {}) };
      const list = nextMap[emoji] || [];
      const exists = list.includes(reactorId);
      const updated = exists ? list.filter((id) => id !== reactorId) : [...list, reactorId];
      if (updated.length > 0) {
        nextMap[emoji] = updated;
      } else {
        delete nextMap[emoji];
      }
      return nextMap;
    };

    if (source === 'post') {
      const mutator = (list: LockerPost[]) =>
        list.map((p) =>
          p.id === itemId && !p.isDeleted ? { ...p, emojiReactions: toggleMap(p.emojiReactions) } : p
        );
      const nextPosts = mutator(posts);
      setPosts(nextPosts);
      mutatePostsInCloud(mutator, nextPosts);
      return;
    }

    const targetPhoto = photos.find((ph) => ph.id === itemId);
    if (!targetPhoto || targetPhoto.isDeleted) return;
    const mutator = (ph: PhotoArchiveItem): PhotoArchiveItem =>
      ph.isDeleted ? ph : { ...ph, emojiReactions: toggleMap(ph.emojiReactions) };
    const updatedPhoto = mutator(targetPhoto);
    setPhotos((prev) => prev.map((ph) => (ph.id === itemId ? updatedPhoto : ph)));
    mutatePhotoItemInCloud(itemId, mutator, updatedPhoto);
  };

  // Comments on unified locker posts & archived photos
  const handleAddComment = (itemId: string, source: 'post' | 'photo', text: string) => {
    const cleanText = text.trim();
    if (!cleanText || isPendingUser || isFormerUser) return;
    const newComment: LockerComment = {
      id: `cmt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      authorPlayerId: claimedPlayer?.id || currentUser?.uid || 'member',
      authorName: claimedPlayer?.name || currentUser?.displayName?.split(' ')[0] || 'Üye',
      authorPhoto: claimedPlayer?.photoUrl,
      text: cleanText,
      createdAt: new Date().toISOString(),
    };

    if (source === 'post') {
      const mutator = (list: LockerPost[]) =>
        list.map((p) =>
          p.id === itemId && !p.isDeleted
            ? {
                ...p,
                comments: [
                  ...(p.comments || []).filter((c) => c.id !== newComment.id),
                  newComment,
                ],
              }
            : p
        );
      const nextPosts = mutator(posts);
      setPosts(nextPosts);
      mutatePostsInCloud(mutator, nextPosts);
      return;
    }

    const targetPhoto = photos.find((ph) => ph.id === itemId);
    if (!targetPhoto || targetPhoto.isDeleted) return;
    const mutator = (ph: PhotoArchiveItem): PhotoArchiveItem =>
      ph.isDeleted
        ? ph
        : {
            ...ph,
            comments: [
              ...(ph.comments || []).filter((c) => c.id !== newComment.id),
              newComment,
            ],
          };
    const updatedPhoto = mutator(targetPhoto);
    setPhotos((prev) => prev.map((ph) => (ph.id === itemId ? updatedPhoto : ph)));
    mutatePhotoItemInCloud(itemId, mutator, updatedPhoto);
  };

  // Edit comment (WhatsApp 15 min window, author-only)
  const handleEditComment = (
    itemId: string,
    source: 'post' | 'photo',
    commentId: string,
    newText: string
  ) => {
    const cleanText = newText.trim();
    if (!cleanText || isPendingUser || isFormerUser || !claimedPlayer) return;
    const editedAt = new Date().toISOString();

    const updateComments = (comments?: LockerComment[]) =>
      (comments || []).map((c) => {
        if (c.id !== commentId || c.isDeleted) return c;
        const isAuthor =
          c.authorPlayerId === claimedPlayer.id ||
          (!c.authorPlayerId && c.authorName === claimedPlayer.name);
        if (!isAuthor) return c;
        if (Date.now() - new Date(c.createdAt).getTime() > LOCKER_EDIT_WINDOW_MS) return c;
        return { ...c, text: cleanText, editedAt };
      });

    if (source === 'post') {
      const mutator = (list: LockerPost[]) =>
        list.map((p) => (p.id === itemId ? { ...p, comments: updateComments(p.comments) } : p));
      const nextPosts = mutator(posts);
      setPosts(nextPosts);
      mutatePostsInCloud(mutator, nextPosts);
      return;
    }

    const targetPhoto = photos.find((ph) => ph.id === itemId);
    if (!targetPhoto) return;
    const mutator = (ph: PhotoArchiveItem): PhotoArchiveItem => ({
      ...ph,
      comments: updateComments(ph.comments),
    });
    const updatedPhoto = mutator(targetPhoto);
    setPhotos((prev) => prev.map((ph) => (ph.id === itemId ? updatedPhoto : ph)));
    mutatePhotoItemInCloud(itemId, mutator, updatedPhoto);
  };

  // Delete comment (WhatsApp 48h "Herkesten Sil" or Committee anytime; purge removes tombstone line)
  const handleDeleteComment = (
    itemId: string,
    source: 'post' | 'photo',
    commentId: string,
    purge: boolean = false
  ) => {
    if (isPendingUser || isFormerUser || !claimedPlayer) return;
    if (purge && !isAdminOrCaptain) return;
    const deletedAt = new Date().toISOString();

    const mutateComments = (comments?: LockerComment[]) => {
      const list = comments || [];
      if (purge) return list.filter((c) => c.id !== commentId);
      return list.map((c) => {
        if (c.id !== commentId || c.isDeleted) return c;
        const isAuthor =
          c.authorPlayerId === claimedPlayer.id ||
          (!c.authorPlayerId && c.authorName === claimedPlayer.name);
        const withinWindow = Date.now() - new Date(c.createdAt).getTime() <= LOCKER_DELETE_WINDOW_MS;
        if (!isAdminOrCaptain && !(isAuthor && withinWindow)) return c;
        return {
          ...c,
          text: '',
          isDeleted: true,
          deletedAt,
          deletedBy: isAuthor ? ('author' as const) : ('committee' as const),
        };
      });
    };

    if (source === 'post') {
      const mutator = (list: LockerPost[]) =>
        list.map((p) => (p.id === itemId ? { ...p, comments: mutateComments(p.comments) } : p));
      const nextPosts = mutator(posts);
      setPosts(nextPosts);
      mutatePostsInCloud(mutator, nextPosts);
      return;
    }

    const targetPhoto = photos.find((ph) => ph.id === itemId);
    if (!targetPhoto) return;
    const mutator = (ph: PhotoArchiveItem): PhotoArchiveItem => ({
      ...ph,
      comments: mutateComments(ph.comments),
    });
    const updatedPhoto = mutator(targetPhoto);
    setPhotos((prev) => prev.map((ph) => (ph.id === itemId ? updatedPhoto : ph)));
    mutatePhotoItemInCloud(itemId, mutator, updatedPhoto);
  };

  // Pin / unpin headline in unified locker room (Committee/Admin only)
  const handleToggleHeadline = (itemId: string, source: 'post' | 'photo') => {
    if (!isAdminOrCaptain) return;
    if (source === 'post') {
      const mutator = (list: LockerPost[]) =>
        list.map((p) => (p.id === itemId && !p.isDeleted ? { ...p, isHeadline: !p.isHeadline } : p));
      const nextPosts = mutator(posts);
      setPosts(nextPosts);
      mutatePostsInCloud(mutator, nextPosts);
      return;
    }

    const targetPhoto = photos.find((ph) => ph.id === itemId);
    if (!targetPhoto || targetPhoto.isDeleted) return;
    const mutator = (ph: PhotoArchiveItem): PhotoArchiveItem =>
      ph.isDeleted ? ph : { ...ph, isHeadline: !ph.isHeadline };
    const updatedPhoto = mutator(targetPhoto);
    setPhotos((prev) => prev.map((ph) => (ph.id === itemId ? updatedPhoto : ph)));
    mutatePhotoItemInCloud(itemId, mutator, updatedPhoto);
  };

  // Toggle debt status
  const handleToggleDebt = (debtId: string) => {
    if (isPendingUser || isFormerUser) return;
    const nextDebts: DessertDebt[] = debts.map((d) =>
      d.id === debtId ? { ...d, status: d.status === 'pending' ? 'paid' : 'pending' } : d
    );
    setDebts(nextDebts);
    saveDebtsToCloud(nextDebts);
  };

  // Add new debt
  const handleAddDebt = (debtorPlayerId: string, description: string, treatType: DessertDebt['treatType']) => {
    if (isPendingUser || isFormerUser) return;
    const newDebt: DessertDebt = {
      id: `debt-${Date.now()}`,
      debtorPlayerId,
      description,
      treatType,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
    const nextDebts = [newDebt, ...debts];
    setDebts(nextDebts);
    saveDebtsToCloud(nextDebts);
  };

  // Save scouting entry from committee member
  const handleSaveScoutingEntry = (entry: PlayerScoutingEntry) => {
    setSavedScoutingEntries((prev) => {
      const filtered = prev.filter(
        (e) => !(e.playerId === entry.playerId && e.evaluatorName === entry.evaluatorName)
      );
      const next = [...filtered, entry];
      saveScoutingToCloud(next, entry.evaluatorName);

      // Otomatikman anasayfada ve tüm sitede kurul puanlama algoritmasına göre oyuncu kartlarını güncelle
      setPlayers((currPlayers) => {
        const { updatedPlayers, hasChanges } = applyConsensusToSquad(currPlayers, next);
        if (hasChanges) {
          playersRef.current = updatedPlayers;
          savePlayersBatchToCloud(updatedPlayers);
          return updatedPlayers;
        }
        return currPlayers;
      });
      return next;
    });
  };

  // Apply consensus to all FC 27 cards and refresh match squads
  const handleApplyConsensusToPlayers = (updatedPlayers: Player[]) => {
    playersRef.current = updatedPlayers;
    setPlayers(updatedPlayers);
    savePlayersBatchToCloud(updatedPlayers);

    if (match.starters.length === 12 && match.teamA && match.teamB) {
      const startersList = updatedPlayers.filter((p) => match.starters.includes(p.id));
      if (startersList.length === 12) {
        const result = run462BalancingAlgorithm(startersList, match.checkIns);
        const nextMatch: Match = {
          ...match,
          teamA: result.teamA,
          teamB: result.teamB,
          fairnessRating: result.fairnessRating,
          altTeamA: result.alternative?.teamA,
          altTeamB: result.alternative?.teamB,
          altFairnessRating: result.alternative?.fairnessRating,
        };
        setMatch(nextMatch);
        saveMatchToCloud(nextMatch);
      }
    }
  };

  // Handle Admin approving a player's nickname change request
  const handleApproveNickname = (playerId: string) => {
    const targetPlayer = players.find((p) => p.id === playerId);
    if (!targetPlayer || !targetPlayer.pendingNickname) return;

    const approvedNick = targetPlayer.pendingNickname;
    const updatedTarget: Player = { ...targetPlayer, nickname: approvedNick, pendingNickname: undefined };
    savePlayerToCloud(updatedTarget);
    setPlayers((prev) =>
      prev.map((p) => (p.id === playerId ? updatedTarget : p))
    );

    // Announce in Soyunma Odası (Locker Room)
    const newAnnouncement: LockerPost = {
      id: `post-${Date.now()}-nick`,
      matchId: match.id,
      authorPlayerId: 'system',
      authorName: 'Revir FC Yönetim Kurulu 📢',
      text: `✨ ${targetPlayer.name} için talep edilen yeni saha lakabı "${approvedNick}" yönetim tarafından onaylandı! Yeni kartı kutlu olsun! ⚽`,
      isAnonymous: false,
      reactions: { fire: [playerId], laugh: [], violin: [], revir: [], goat: [] },
      createdAt: new Date().toISOString(),
    };
    const nextPosts = [newAnnouncement, ...posts];
    setPosts(nextPosts);
    mutatePostsInCloud(
      (latest) => [newAnnouncement, ...latest.filter((p) => p.id !== newAnnouncement.id)],
      nextPosts
    );
  };

  // Handle Admin rejecting a player's nickname change request
  const handleRejectNickname = (playerId: string) => {
    const targetPlayer = players.find((p) => p.id === playerId);
    if (targetPlayer) {
      savePlayerToCloud({ ...targetPlayer, pendingNickname: undefined });
    }
    setPlayers((prev) =>
      prev.map((p) => (p.id === playerId ? { ...p, pendingNickname: undefined } : p))
    );
  };

  const pendingUsersCount = allUsers.filter((u) => u.status === 'pending').length;
  const pendingNicknamesCount = players.filter((p) => Boolean(p.pendingNickname)).length;
  const totalAdminPendingCount = pendingUsersCount + pendingNicknamesCount;

  const closeAllWorkspaceModals = () => {
    setEditingPlayer(null);
    setCheckInPlayer(null);
    setShowRatingModal(false);
    setIsCommitteeModalOpen(false);
    setShowReminderModal(false);
    setShowAuthModal(false);
  };

  const handleEnterTestMode = () => {
    if (isTestMode || !effectiveCanUseTestMode) return;
    const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
    realSnapshotRef.current = {
      players: clone(players),
      match: clone(match),
      posts: clone(posts),
      photos: clone(photos),
      debts: clone(debts),
      scoutingEntries: clone(savedScoutingEntries),
    };
    closeAllWorkspaceModals();
    clearSandboxInvites();
    isTestModeRef.current = true;
    setCloudSandboxMode(true);

    const sb = createInitialSandboxState(players, posts, photos, debts, savedScoutingEntries);
    setPlayers(sb.players);
    playersRef.current = sb.players;
    setMatch(sb.match);
    setSavedScoutingEntries(sb.scoutingEntries);
    setPosts(sb.posts);
    setPhotos(sb.photos);
    setDebts(sb.debts);

    const preferredPlayer = canTestAdminView
      ? sb.players.find((p) => p.id === 'p1') || sb.players[0]
      : sb.players.find((p) => p.id === realCurrentUser?.claimedPlayerId) ||
        sb.players.find((p) => p.id === 'p2') ||
        sb.players[0];
    enterTestMode(
      sb.users,
      preferredPlayer?.id || 'p1',
      preferredPlayer?.name || 'Alper',
      canTestAdminView ? 'admin' : 'committee'
    );
  };

  const handleExitTestMode = () => {
    if (!isTestMode) return;
    closeAllWorkspaceModals();
    clearSandboxInvites();
    setCloudSandboxMode(false);
    isTestModeRef.current = false;

    const snap = realSnapshotRef.current;
    if (snap) {
      setPlayers(snap.players);
      playersRef.current = snap.players;
      setMatch(snap.match);
      setSavedScoutingEntries(snap.scoutingEntries);
      setPosts(snap.posts);
      setPhotos(snap.photos);
      setDebts(snap.debts);
      realSnapshotRef.current = null;
    }
    exitTestMode();
  };

  const handleResetTestMode = () => {
    if (!isTestMode) return;
    closeAllWorkspaceModals();
    const base = realSnapshotRef.current;
    const sb = createInitialSandboxState(
      base ? base.players : players,
      base ? base.posts : posts,
      base ? base.photos : photos,
      base ? base.debts : debts,
      base ? base.scoutingEntries : savedScoutingEntries
    );
    clearSandboxInvites();
    setPlayers(sb.players);
    playersRef.current = sb.players;
    setMatch(sb.match);
    setSavedScoutingEntries(sb.scoutingEntries);
    setPosts(sb.posts);
    setPhotos(sb.photos);
    setDebts(sb.debts);
    setSandboxUsers(sb.users);

    const preferredPlayer = canTestAdminView
      ? sb.players.find((p) => p.id === 'p1') || sb.players[0]
      : sb.players.find((p) => p.id === realCurrentUser?.claimedPlayerId) ||
        sb.players.find((p) => p.id === 'p2') ||
        sb.players[0];
    switchTestPersona(
      canTestAdminView ? 'admin' : 'committee',
      preferredPlayer?.id || 'p1',
      preferredPlayer?.name || 'Alper'
    );
  };

  const handleSimulatePoll = () => {
    if (!isTestMode) return;
    const res = simulateRandomPollCheckIns(players, match);
    setPlayers(res.players);
    playersRef.current = res.players;
    setMatch(res.match);
  };

  const handleSimulateRatings = () => {
    if (!isTestMode) return;
    const res = simulatePostMatchRatings(players, match);
    setPlayers(res.players);
    playersRef.current = res.players;
    setMatch(res.match);
  };

  const handleSimulateScouting = () => {
    if (!isTestMode) return;
    const entries = simulateFullCommitteeScouting(players);
    setSavedScoutingEntries(entries);
  };

  const handleSimulatePendingApprovals = () => {
    if (!isTestMode) return;
    const res = simulateSamplePendingApprovals(players, allUsers);
    setPlayers(res.players);
    playersRef.current = res.players;
    setSandboxUsers(res.users);
  };

  const handleJumpTabFromTestBar = (tab: NavTab) => {
    if (tab === 'admin') {
      if (!canTestAdminView) return;
      if (testRoleView !== 'admin') {
        const alperPlayer = players.find((p) => p.id === 'p1') || players[0];
        switchTestPersona('admin', alperPlayer?.id || 'p1', alperPlayer?.name || 'Alper');
      }
    } else if (tab === 'scouting' && testRoleView !== 'admin' && testRoleView !== 'committee') {
      const committeePlayer =
        players.find((p) => p.name === 'Yüksel') ||
        players.find((p) => p.id === 'p2') ||
        players[0];
      if (committeePlayer) {
        switchTestPersona('committee', committeePlayer.id, committeePlayer.name);
      }
    }
    setActiveTab(tab);
  };

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-clip bg-black text-white flex flex-col font-sans selection:bg-amber-500 selection:text-black">
      {/* Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        claimedPlayer={claimedPlayer}
        onOpenCardEdit={() => claimedPlayer && setEditingPlayer(claimedPlayer)}
        onOpenAuthModal={() => setShowAuthModal(true)}
        onOpenFirebaseModal={() => setShowFirebaseModal(true)}
        pendingApprovalCount={totalAdminPendingCount}
        matchStartersCount={match.starters.length}
        isTestMode={isTestMode}
        canUseTestMode={effectiveCanUseTestMode}
        onToggleTestMode={() => (isTestMode ? handleExitTestMode() : handleEnterTestMode())}
      />

      {/* Shell offset for desktop left icon rail */}
      <div className="flex-1 flex flex-col lg:pl-16">
      {isTestMode && (
        <TestModeControlBar
          players={players}
          match={match}
          testRoleView={testRoleView}
          activePlayerId={currentUser?.claimedPlayerId}
          pendingCount={totalAdminPendingCount}
          canTestAdminView={canTestAdminView}
          onSwitchPersona={switchTestPersona}
          onJumpTab={handleJumpTabFromTestBar}
          onSimulatePoll={handleSimulatePoll}
          onSimulateRatings={handleSimulateRatings}
          onSimulateScouting={handleSimulateScouting}
          onSimulatePendingApprovals={handleSimulatePendingApprovals}
          onResetTestMode={handleResetTestMode}
          onExitTestMode={handleExitTestMode}
        />
      )}
      {/* Kayıt (depolama) hatası: sessizce kaybolmasın */}
      {storageError && (
        <div className="bg-rose-700 text-white px-4 py-2.5 text-xs flex items-center justify-between gap-3 border-b border-rose-300/40">
          <p className="font-bold">
            ⚠️ Değişiklikler tarayıcıya kaydedilemedi (depolama dolu olabilir). Büyük fotoğrafları küçültüp tekrar deneyin; sayfayı yenilemeden önce işlemi tekrarlayın.
          </p>
          <button onClick={() => setStorageError(false)} className="shrink-0 px-2.5 py-1 rounded-lg bg-black/40 font-black cursor-pointer">
            Kapat
          </button>
        </div>
      )}

      {/* Spectator / Logged-out Banner */}
      {!currentUser && (
        <div className="bg-gradient-to-r from-neutral-900 via-amber-950/50 to-neutral-900 border-b border-amber-500/35 px-4 py-2.5">
          <div className="max-w-7xl mx-auto flex items-center justify-center sm:justify-start gap-2 text-xs">
            <div className="flex items-center gap-2 text-center sm:text-left">
              <span className="shrink-0 bg-amber-500/20 text-amber-300 border border-amber-500/35 text-[10px] font-black px-2.5 py-0.5 rounded-full">
                👁️ Seyirci Modu
              </span>
              <p className="text-neutral-200 font-medium">
                Şu an yalnızca görüntüleme modundasınız. Kendi kartınızı düzenlemek, ankete katılmak veya kurul/yönetici işlemleri için sağ üstten giriş yapabilirsiniz.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Pending User Showcase Notification Banner */}
      {currentUser?.status === 'pending' && (
        <div className="bg-gradient-to-r from-amber-600 via-amber-500 to-orange-600 text-black px-4 py-3 shadow-lg border-b border-amber-300/40">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5">
              <span className="text-xl">👋</span>
              <p className="font-bold text-neutral-950 text-xs sm:text-sm">
                <strong>Hoş geldin!</strong> Hesabın Kurul onayı bekliyor. Bu sırada takımı ve arkadaşlarının kartlarını inceleyebilirsin. Onaylandığında kendi kartını yönetebilecek ve maç kadrolarına katılabileceksin.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="bg-black/85 text-amber-300 text-[11px] font-black px-3 py-1 rounded-full flex items-center gap-1.5 shadow-sm">
                <Clock className="w-3.5 h-3.5 text-amber-400" /> Seyirci / Gözlemci Modu
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 max-w-[1400px] w-full mx-auto px-4 sm:px-5 py-6 overflow-x-clip">
        {activeTab === 'squad' && (
          !isInitialCloudReady && !isTestMode ? (
            <div className="space-y-6 animate-pulse">
              <div className="flex flex-col items-center gap-2 py-4">
                <div className="h-5 w-48 rounded-full bg-neutral-800/80" />
                <div className="h-3 w-72 rounded-full bg-neutral-900" />
              </div>
              <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,290px),1fr))] gap-x-6 lg:gap-x-7 gap-y-9 justify-items-center">
                {Array.from({ length: 8 }).map((_, idx) => (
                  <div
                    key={idx}
                    className="w-[288px] h-[386px] rounded-[28px] bg-gradient-to-b from-neutral-900 to-neutral-950 border border-neutral-800/80 shadow-xl flex flex-col justify-between p-6"
                  >
                    <div className="flex items-start justify-between">
                      <div className="space-y-2">
                        <div className="h-9 w-12 rounded-lg bg-neutral-800/80" />
                        <div className="h-4 w-10 rounded bg-neutral-800/60" />
                      </div>
                      <div className="w-32 h-32 rounded-2xl bg-neutral-800/50" />
                    </div>
                    <div className="space-y-3">
                      <div className="h-6 w-3/4 mx-auto rounded-lg bg-neutral-800/80" />
                      <div className="grid grid-cols-2 gap-2">
                        <div className="h-6 rounded-full bg-neutral-800/60" />
                        <div className="h-6 rounded-full bg-neutral-800/60" />
                      </div>
                      <div className="h-10 rounded-xl bg-neutral-800/50" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <SquadCardGallery
              players={players}
              onSelectPlayer={(p) => setEditingPlayer(p)}
            />
          )
        )}

        <Suspense fallback={<TabLoadingFallback />}>
        {activeTab === 'scouting' && (
          isAdminOrCaptain ? (
            <div className="space-y-4">
              {!isTestMode && !isSuperAdmin && (
                <div className="bg-gradient-to-r from-violet-950/75 via-fuchsia-950/55 to-neutral-900 border border-violet-500/40 rounded-3xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xl">
                  <div className="flex items-start gap-3">
                    <div className="p-2.5 rounded-2xl bg-violet-500/20 border border-violet-400/40 text-fuchsia-300 shrink-0">
                      <FlaskConical className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm sm:text-base font-black text-white">
                        🧪 Kurul Test / Simülasyon Modu (Sandbox)
                      </h3>
                      <p className="text-xs text-violet-200/80 mt-0.5 leading-relaxed">
                        Gerçek veritabanına hiç dokunmadan 22 kişilik anket, 462 taktik tahtası, 360° form anketi ve kurul/üye/seyirci görünümlerini canlı deneyin.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleEnterTestMode}
                    className="shrink-0 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-fuchsia-500 hover:bg-fuchsia-400 text-white text-xs font-black shadow-lg shadow-fuchsia-500/30 transition-all cursor-pointer active:scale-95"
                  >
                    <FlaskConical className="w-4 h-4" />
                    Test Modunu Başlat
                  </button>
                </div>
              )}
              {scoutingView === 'wizard' ? (
                <ScoutingWizard
                  players={players}
                  evaluatorName={evaluatorName}
                  onEvaluatorChange={setEvaluatorName}
                  savedEntries={savedScoutingEntries}
                  onSaveEntry={handleSaveScoutingEntry}
                  onFinishAll={() => setScoutingView('dashboard')}
                  onSwitchToDashboard={() => setScoutingView('dashboard')}
                  canSwitchEvaluator={isSuperAdmin}
                />
              ) : (
                <ScoutingAdminDashboard
                  players={players}
                  savedEntries={savedScoutingEntries}
                  onApplyConsensusToPlayers={handleApplyConsensusToPlayers}
                  onBackToWizard={() => setScoutingView('wizard')}
                  canApplyConsensus={isSuperAdmin}
                  canSwitchToAdminMode={isAdminAccount && !isSuperAdmin}
                  onSwitchToAdminMode={() => setAdminMode('admin')}
                />
              )}
            </div>
          ) : (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-3xl p-8 text-center shadow-lg max-w-xl mx-auto">
              <Lock className="w-9 h-9 text-amber-400 mx-auto mb-3" />
              <h3 className="text-base font-black text-white">⭐ Kök Kurul Puanlama Alanı</h3>
              <p className="text-xs text-neutral-300 mt-2 leading-relaxed">
                Bu alan yalnızca Kurul Üyeleri ve Yönetici yetkisine açıktır. Oyuncu kartlarındaki genel güçleri ve haftalık 360° puanlamaları kendi ilgili ekranlarından takip edebilirsiniz.
              </p>
            </div>
          )
        )}

        {activeTab === 'match' && isApprovedUser && (
          <SquadList
            match={match}
            players={players}
            claimedPlayer={claimedPlayer}
            lifecycleFlags={lifecycleFlags}
            onOpenCheckIn={(p) => setCheckInPlayer(p)}
            onJoinPollWithCheckIn={handleJoinPollWithCheckIn}
            onCreateNewPoll={handleCreateNewPoll}
            onUpdatePollConfig={handleUpdatePollConfig}
            onSelectPitchFeePayer={handleSelectPitchFeePayer}
            onSelectTeaBringer={handleSelectTeaBringer}
            onResetMatchPoll={handleResetMatchPoll}
            onRunBalancing={handleRunBalancing}
            onFinishMatchAndOpenRating={handleFinishMatchAndOpenRating}
            onOpenRating={() => {
              if (isStarterInMatch && lifecycleFlags.canVote360) setShowRatingModal(true);
            }}
            onOpenCommittee={() => {
              if (lifecycleFlags.canSealAwards) setIsCommitteeModalOpen(true);
            }}
            onToggleParticipation={handleToggleParticipation}
            onSwapStarterWithWaitlist={handleSwapStarterWithWaitlist}
            onOpenReminderHub={() => setShowReminderModal(true)}
            isPendingUser={isPendingUser}
            isFormerUser={isFormerUser}
            isAdmin={isAdminOrCaptain}
          />
        )}

        {activeTab === 'rating' && isApprovedUser && (() => {
          const starterPlayers = players.filter((p) => match.starters.includes(p.id));
          const ballotCount = match.ballots?.length || 0;
          const canVote360 = !isPendingUser && !isFormerUser && isStarterInMatch && lifecycleFlags.canVote360;
          const myBallotExists = Boolean(
            claimedPlayer && (match.ballots || []).some((b) => b.raterId === claimedPlayer.id)
          );
          const mvpP = match.awards?.mvpId ? players.find((p) => p.id === match.awards?.mvpId) : undefined;
          const wallP = match.awards?.wallId ? players.find((p) => p.id === match.awards?.wallId) : undefined;
          const bidonP = match.awards?.bidonId ? players.find((p) => p.id === match.awards?.bidonId) : undefined;
          const informPs = (match.awards?.inFormIds || [])
            .map((id) => players.find((p) => p.id === id))
            .filter(Boolean) as Player[];

          return (
            <div className="space-y-6">
              <div className="bg-gradient-to-br from-neutral-900 via-neutral-950 to-amber-950/20 border border-neutral-800 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="space-y-1.5">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[11px] font-black">
                      <Trophy className="w-3.5 h-3.5" />
                      3. Maç Sonu 360° Form Anketi &amp; Haftalık Karneler
                    </div>
                    <h2 className="text-xl sm:text-2xl font-black text-white">
                      {match.title}
                    </h2>
                    <p className="text-xs text-neutral-300 leading-relaxed max-w-2xl">
                      Formül: <strong className="text-amber-300">%75 Eski Form + %15 Maç Hedefi + %10 Kök Kurul Çapası</strong>.
                      Maç bittikten sonra ertesi gün 14:00&apos;a kadar yalnızca ilk 12&apos;de oynayanlar puansız sözel değerlendirme yapar; Kurul oyları <strong className="text-amber-300">2x</strong> ağırlıklı hesaplanır ve uç 1&apos;er oy kırpılır.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                    {canVote360 ? (
                      <button
                        type="button"
                        disabled={starterPlayers.length === 0}
                        onClick={() => setShowRatingModal(true)}
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed text-black font-black text-xs shadow-lg shadow-amber-500/20 transition-all cursor-pointer active:scale-95"
                      >
                        <Trophy className="w-4 h-4" />
                        {myBallotExists ? '360° Oylarımı Güncelle' : '360° Form Anketini Başlat'}
                      </button>
                    ) : !claimedPlayer ? (
                      <button
                        type="button"
                        onClick={() => setShowAuthModal(true)}
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-amber-300 font-black text-xs transition-all cursor-pointer"
                      >
                        <Lock className="w-3.5 h-3.5" />
                        Oylamak için Üye Girişi Yap
                      </button>
                    ) : (
                      <span
                        className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-neutral-900 border border-neutral-800 text-neutral-400 font-bold text-xs"
                      >
                        <Lock className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
                        {!isStarterInMatch
                          ? 'Yalnızca İlk 12 Oyuncusu Oylayabilir'
                          : lifecycleFlags.phase === 'pre_match' || lifecycleFlags.phase === 'live_match'
                          ? 'Maç Bitince Oylama Açılır'
                          : lifecycleFlags.phase === 'rating_closed'
                          ? '14:00 Oylama Süresi Doldu'
                          : 'Kurul Mühürlü • Oylama Kapandı'}
                      </span>
                    )}

                    {isAdminOrCaptain && lifecycleFlags.canOpenRatingManually && (
                      <button
                        type="button"
                        onClick={handleFinishMatchAndOpenRating}
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 border border-sky-400/45 text-sky-200 font-black text-xs transition-all cursor-pointer"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        🏁 Maçı Bitir / 360° Aç
                      </button>
                    )}

                    {isAdminOrCaptain && (
                      <button
                        type="button"
                        disabled={starterPlayers.length === 0 || !lifecycleFlags.canSealAwards}
                        onClick={() => setIsCommitteeModalOpen(true)}
                        title={
                          lifecycleFlags.canSealAwards
                            ? 'Oylama sandığını incele ve Kurul Mührünü bas / güncelle'
                            : 'Maç bitip 360° oylama açıldıktan sonra mühür basılabilir'
                        }
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 disabled:opacity-40 disabled:cursor-not-allowed border border-emerald-500/40 text-emerald-300 font-black text-xs transition-all cursor-pointer"
                      >
                        <ShieldCheck className="w-4 h-4" />
                        {match.awards?.isConfirmedByCommittee
                          ? `Mührü Düzenle (${match.awards.confirmedBy || 'Kurul'})`
                          : 'Kurul Mührü & Sonuçları Mühürle'}
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-neutral-800/80 text-xs">
                  <div className="bg-black/40 border border-neutral-800/80 rounded-2xl p-3">
                    <span className="text-[10px] text-neutral-400 uppercase font-bold block">Asil Maç Kadrosu</span>
                    <span className="text-base font-black text-white">{starterPlayers.length} / 12 Oyuncu</span>
                  </div>
                  <div className="bg-black/40 border border-neutral-800/80 rounded-2xl p-3">
                    <span className="text-[10px] text-neutral-400 uppercase font-bold block">Teslim Edilen Pusula</span>
                    <span className="text-base font-black text-amber-300">{ballotCount} Pusula</span>
                  </div>
                  <div className="bg-black/40 border border-neutral-800/80 rounded-2xl p-3">
                    <span className="text-[10px] text-neutral-400 uppercase font-bold block">Mühür Durumu</span>
                    <span className={`text-sm font-black inline-flex items-center gap-1 ${match.awards?.isConfirmedByCommittee ? 'text-emerald-400' : 'text-neutral-300'}`}>
                      {match.awards?.isConfirmedByCommittee ? (
                        <><CheckCircle2 className="w-4 h-4 shrink-0" /> {match.awards.confirmedBy ? `Mühürleyen: ${match.awards.confirmedBy}` : 'Kurul Mühürlü'}</>
                      ) : (
                        'Taslak / Oylamada'
                      )}
                    </span>
                    {match.awards?.updatedBy && (
                      <span className="text-[10px] text-emerald-300/75 block mt-0.5">
                        Son düzeltme: {match.awards.updatedBy}
                      </span>
                    )}
                  </div>
                  <div className="bg-black/40 border border-neutral-800/80 rounded-2xl p-3">
                    <span className="text-[10px] text-neutral-400 uppercase font-bold block">Maç Skoru</span>
                    <span className="text-base font-black text-white">
                      {match.score ? `Yelekli ${match.score.teamA} - ${match.score.teamB} Yeleksiz` : 'Henüz Girilmedi'}
                    </span>
                  </div>
                </div>
              </div>

              {(mvpP || wallP || bidonP || informPs.length > 0) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {mvpP && (
                    <div className="bg-neutral-900/90 border border-amber-500/40 rounded-2xl p-4 flex items-center gap-3">
                      <img src={mvpP.photoUrl} alt={mvpP.name} className="w-11 h-11 rounded-full object-cover border border-amber-400/50" />
                      <div>
                        <span className="text-[10px] font-black uppercase text-amber-400 block">👑 Haftanın MVP&apos;si</span>
                        <span className="text-sm font-black text-white">{mvpP.name}</span>
                      </div>
                    </div>
                  )}
                  {wallP && (
                    <div className="bg-neutral-900/90 border border-sky-500/40 rounded-2xl p-4 flex items-center gap-3">
                      <img src={wallP.photoUrl} alt={wallP.name} className="w-11 h-11 rounded-full object-cover border border-sky-400/50" />
                      <div>
                        <span className="text-[10px] font-black uppercase text-sky-400 block">🧱 Etten Duvar</span>
                        <span className="text-sm font-black text-white">{wallP.name}</span>
                      </div>
                    </div>
                  )}
                  {informPs.length > 0 && (
                    <div className="bg-neutral-900/90 border border-orange-500/40 rounded-2xl p-4">
                      <span className="text-[10px] font-black uppercase text-orange-400 block mb-1.5">🔥 Alev Atıyo!</span>
                      <div className="flex flex-wrap gap-1.5">
                        {informPs.map((ip) => (
                          <span key={ip.id} className="text-xs font-bold text-white bg-orange-500/15 border border-orange-500/30 px-2 py-0.5 rounded-full">
                            {ip.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {bidonP && (
                    <div className="bg-neutral-900/90 border border-rose-500/40 rounded-2xl p-4 flex items-center gap-3">
                      <img src={bidonP.photoUrl} alt={bidonP.name} className="w-11 h-11 rounded-full object-cover border border-rose-400/50" />
                      <div>
                        <span className="text-[10px] font-black uppercase text-rose-400 block">🛢️ Haftanın Bidonu</span>
                        <span className="text-sm font-black text-white">{bidonP.name}</span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {starterPlayers.length === 0 ? (
                <div className="bg-neutral-900/90 border border-neutral-800 rounded-3xl p-8 text-center space-y-3">
                  <Vote className="w-8 h-8 text-amber-400 mx-auto" />
                  <h3 className="text-base font-black text-white">Henüz Maç Kadrosu Oluşmadı</h3>
                  <p className="text-xs text-neutral-400 max-w-md mx-auto">
                    Maç anketinden ilk 12 asil kadro oluştuğunda oyuncular burada listelenir ve maç bitiminde 360° puanlama açılır.
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveTab('match')}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-black text-xs cursor-pointer"
                  >
                    <Vote className="w-4 h-4" /> Maç Anketine Git
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {starterPlayers.map((p) => {
                    const hasVotedThisPlayer = Boolean(
                      claimedPlayer &&
                        (match.ratings || []).some(
                          (v) => v.raterPlayerId === claimedPlayer.id && v.targetPlayerId === p.id
                        )
                    );
                    const delta = p.lastMatchSummary?.deltaOVR ?? 0;
                    const verbalSummary = p.lastMatchSummary
                      ? getVerbalRatingOption(p.lastMatchSummary.matchScore10)
                      : null;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setEditingPlayer(p)}
                        className="text-left bg-neutral-900/85 hover:bg-neutral-900 border border-neutral-800 hover:border-amber-500/40 rounded-2xl p-3.5 flex items-center justify-between gap-3 transition-all cursor-pointer"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <img
                            src={p.photoUrl}
                            alt={p.name}
                            className="w-11 h-11 rounded-full object-cover border border-neutral-700 shrink-0"
                          />
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-sm font-black text-white truncate">{p.name}</span>
                              {hasVotedThisPlayer && (
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                                  Oylandı
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-neutral-400 block">
                              {p.position} • {verbalSummary ? `Son Maç: ${verbalSummary.emoji} ${verbalSummary.label}` : 'Kök Puan Aktif'}
                            </span>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="text-lg font-black text-amber-400 block leading-none">{p.currentOVR}</span>
                          {p.lastMatchSummary && (
                            <span
                              className={`text-[10px] font-black ${
                                delta > 0 ? 'text-emerald-400' : delta < 0 ? 'text-rose-400' : 'text-neutral-500'
                              }`}
                            >
                              {delta > 0 ? `+${delta}` : delta} OVR
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })()}

        {activeTab === 'tactics' && (
          <TacticalPitch
            pastMatches={pastMatches}
            activeMatch={match}
            players={players}
            isAdmin={isAdminAccount || isSuperAdmin}
            canEditTactics={isSuperAdmin || (isAdminOrCaptain && lifecycleFlags.canEditTactics)}
            onUpdatePastMatch={handleUpdatePastMatch}
            teamA={match.teamA}
            teamB={match.teamB}
            altTeamA={match.altTeamA}
            altTeamB={match.altTeamB}
            checkIns={match.checkIns}
            matchTitle={match.title}
            matchDate={new Date(match.date).toLocaleDateString('tr-TR', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
            })}
            fairnessRating={match.fairnessRating}
            altFairnessRating={match.altFairnessRating}
            selectedOption={match.selectedLineupOption || 1}
            onSelectOption={(opt) => {
              const nextMatch: Match = { ...match, selectedLineupOption: opt };
              setMatch((prev) => ({ ...prev, selectedLineupOption: opt }));
              if (isAdminOrCaptain) {
                mutateMatchInCloud((latest) => ({ ...latest, selectedLineupOption: opt }), nextMatch);
              }
            }}
            onUpdateTeams={(nextTeamA: MatchSquad, nextTeamB: MatchSquad, isAlt: boolean) => {
              const diff = Math.abs(nextTeamA.totalOVR - nextTeamB.totalOVR);
              const updatedFairness = Math.max(60, Math.min(99, Math.round(100 - diff * 6)));
              const patch = (base: Match): Match =>
                isAlt
                  ? {
                      ...base,
                      altTeamA: nextTeamA,
                      altTeamB: nextTeamB,
                      altFairnessRating: updatedFairness,
                    }
                  : {
                      ...base,
                      teamA: nextTeamA,
                      teamB: nextTeamB,
                      fairnessRating: updatedFairness,
                    };
              const nextMatch = patch(match);
              setMatch(nextMatch);
              if (isAdminOrCaptain) {
                mutateMatchInCloud(patch, nextMatch);
              }
            }}
          />
        )}

        {activeTab === 'locker' && isApprovedUser && (
          <LockerRoomFeed
            posts={posts}
            photos={photos}
            players={players}
            currentPlayer={claimedPlayer}
            onAddPost={handleAddPost}
            onReact={handleReactPost}
            onToggleEmojiReaction={handleToggleEmojiReaction}
            onAddComment={handleAddComment}
            onEditPost={handleEditPost}
            onDeletePost={handleDeletePost}
            onEditComment={handleEditComment}
            onDeleteComment={handleDeleteComment}
            ownAnonPostIds={ownAnonPostIds}
            onToggleHeadline={handleToggleHeadline}
            canPinHeadline={isAdminOrCaptain}
            isReadOnly={isPendingUser || isFormerUser}
            readOnlyReason={isPendingUser ? 'pending' : isFormerUser ? 'former' : undefined}
          />
        )}

        {activeTab === 'analytics' && isApprovedUser && (
          <div className="space-y-8">
            <ChemistryMatrix
              players={players}
              pastMatches={
                match.awards?.isConfirmedByCommittee && !pastMatches.some((pm) => pm.id === match.id)
                  ? [...pastMatches, match]
                  : pastMatches
              }
            />
            <EgoIndexCard players={players} />
            {isPendingUser ? (
              <div className="bg-neutral-900/90 border border-neutral-800 rounded-3xl p-8 text-center shadow-xl">
                <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto mb-3">
                  <Lock className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-white">Kulüp Kasası ve Tatlı Çetelesi</h3>
                <p className="text-xs text-neutral-400 mt-1.5 max-w-md mx-auto leading-relaxed">
                  Aidat, kasa bakiyesi ve tatlı borçları yalnızca onaylı kulüp üyelerine açıktır.
                </p>
              </div>
            ) : (
              <DessertLedger
                debts={debts}
                players={players}
                onToggleDebt={handleToggleDebt}
                onAddDebt={handleAddDebt}
                isReadOnly={isFormerUser}
              />
            )}
          </div>
        )}

        {activeTab === 'admin' && isSuperAdmin && (
          <div className="space-y-6">
            {!isTestMode && (
              <div className="bg-gradient-to-r from-violet-950/75 via-fuchsia-950/55 to-neutral-900 border border-violet-500/40 rounded-3xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl">
                <div className="flex items-start gap-3">
                  <div className="p-2.5 rounded-2xl bg-violet-500/20 border border-violet-400/40 text-fuchsia-300 shrink-0">
                    <FlaskConical className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-black text-white flex items-center gap-2">
                      🧪 Yönetici Test / Simülasyon Modu (Sandbox)
                    </h3>
                    <p className="text-xs text-violet-200/80 mt-1 leading-relaxed">
                      22 üye, dolu maç anketi, taktik sahası, 360° puanlama ve kurul/üye/seyirci gözüyle tüm siteyi gerçek veritabanına ve tarayıcı hafızasına dokunmadan canlı test edin.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleEnterTestMode}
                  className="shrink-0 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-fuchsia-500 hover:bg-fuchsia-400 text-white text-xs font-black shadow-lg shadow-fuchsia-500/30 transition-all cursor-pointer active:scale-95"
                >
                  <FlaskConical className="w-4 h-4" />
                  Test Modunu Başlat
                </button>
              </div>
            )}
            <AdminApprovalPanel
              allUsers={allUsers}
              players={players}
              onApprove={approveUser}
              onReject={rejectUser}
              onApproveNickname={handleApproveNickname}
              onRejectNickname={handleRejectNickname}
            />
            <SeniorityManagerPanel
              players={players}
              activeStarterIds={match.starters}
              onSaveSeniority={handleSaveSeniority}
            />
            <InviteManagerModal players={players} />
          </div>
        )}
        </Suspense>
      </main>
      </div>

      {/* Modals */}
      <Suspense fallback={null}>
      {editingPlayer && (
        <CardCustomizer
          player={editingPlayer}
          allPlayers={players}
          isAdmin={isAdminOrCaptain}
          isSuperAdmin={isSuperAdmin}
          canEditPositions={isSuperAdmin || (isAdminOrCaptain && !isFormerPlayer(editingPlayer))}
          isPendingUser={isPendingUser}
          isOwnCard={Boolean(currentUser?.claimedPlayerId && currentUser.claimedPlayerId === editingPlayer.id)}
          canEdit={Boolean(
            isSuperAdmin ||
              (!isFormerUser &&
                !isFormerPlayer(editingPlayer) &&
                (isAdminOrCaptain || (isApprovedUser && currentUser?.claimedPlayerId === editingPlayer.id)))
          )}
          evaluatorName={evaluatorName}
          currentMatch={match}
          scoutingEntries={savedScoutingEntries}
          onSave={handleSavePlayerCard}
          onClose={() => setEditingPlayer(null)}
        />
      )}

      {checkInPlayer && (
        <CheckInModal
          player={checkInPlayer}
          currentCheckIn={match.checkIns[checkInPlayer.id]}
          onSave={handleSaveCheckIn}
          onClose={() => setCheckInPlayer(null)}
        />
      )}

      {showRatingModal && !isPendingUser && !isFormerUser && isStarterInMatch && claimedPlayer && lifecycleFlags.canVote360 && (
        <MatchRatingModal
          match={match}
          currentRaterPlayer={claimedPlayer}
          players={players}
          isCommittee={isAdminOrCaptain}
          onSaveRatings={handleSaveRatings}
          onClose={() => setShowRatingModal(false)}
        />
      )}

      {isCommitteeModalOpen && lifecycleFlags.canSealAwards && (
        <CommitteeDecisionModal
          isOpen={isCommitteeModalOpen}
          match={match}
          players={players}
          committeeMemberName={claimedPlayer?.name || currentUser?.displayName?.split(' ')[0] || 'Kurul'}
          onConfirmAwards={handleCommitteeConfirmAwards}
          onClose={() => setIsCommitteeModalOpen(false)}
        />
      )}

      {showFirebaseModal && (
        <FirebaseSetupModal onClose={() => setShowFirebaseModal(false)} />
      )}

      {showReminderModal && (
        <ReminderHubModal
          match={match}
          players={players}
          savedScoutingEntries={savedScoutingEntries}
          onQuickCheckInForPlayer={handleQuickCheckInForPlayer}
          onQuickCheckInAllMissing={handleQuickCheckInAllMissing}
          onClose={() => setShowReminderModal(false)}
        />
      )}

      {showAuthModal && (
        <AuthModal
          inviteToken={activeInviteToken}
          onClose={() => {
            setShowAuthModal(false);
            setActiveInviteToken(null);
          }}
          onSuccess={() => {
            setShowAuthModal(false);
            setActiveInviteToken(null);
          }}
        />
      )}
      </Suspense>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}