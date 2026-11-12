import React, { useState, useEffect, useRef } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import {
  Player,
  CardTheme,
  Match,
  LockerPost,
  PhotoArchiveItem,
  DessertDebt,
  CheckInEntry,
  MatchRatingVote,
  MatchAwards,
  MatchBallot,
  PlayerScoutingEntry,
} from './types';
import {
  INITIAL_PLAYERS,
  INITIAL_SCOUTING_ENTRIES,
  MOCK_ACTIVE_MATCH,
  MOCK_POSTS,
  MOCK_PHOTOS,
  MOCK_DEBTS,
} from './services/mockData';
import { run462BalancingAlgorithm } from './services/balancingEngine';
import { calculatePlayerMatchRating } from './services/ratingEngine';
import { safeSetItem, STORAGE_ERROR_EVENT } from './services/safeStorage';
import { externalizeImages, hydrateImages, isIdbRef } from './services/photoStore';
import { getAccess } from './services/permissions';

import { Navbar, NavTab } from './components/layout/Navbar';
import { PendingApprovalGate } from './components/layout/PendingApprovalGate';
import { FirebaseSetupModal } from './components/layout/FirebaseSetupModal';

import { SquadCardGallery } from './components/card/SquadCardGallery';
import { CardCustomizer } from './components/card/CardCustomizer';
import { SquadList } from './components/checkin/SquadList';
import { CheckInModal } from './components/checkin/CheckInModal';
import { TacticalPitch } from './components/match/TacticalPitch';
import { MatchRatingModal } from './components/rating/MatchRatingModal';
import { CommitteeDecisionModal } from './components/rating/CommitteeDecisionModal';
import { LockerRoomFeed } from './components/locker/LockerRoomFeed';
import { PhotoGallery } from './components/locker/PhotoGallery';
import { ChemistryMatrix } from './components/stats/ChemistryMatrix';
import { EgoIndexCard } from './components/stats/EgoIndexCard';
import { DessertLedger } from './components/stats/DessertLedger';
import { AdminApprovalPanel } from './components/admin/AdminApprovalPanel';
import { ScoutingWizard } from './components/scouting/ScoutingWizard';
import { ScoutingAdminDashboard } from './components/scouting/ScoutingAdminDashboard';
import { ReminderHubModal } from './components/reminder/ReminderHubModal';
import { Lock, Clock } from 'lucide-react';

function MainApp() {
  const { currentUser, allUsers, approveUser, rejectUser } = useAuth();

  // Local state persisted in localStorage (version 3 with 5+1 themes, İsmail Abi & Gölcür Abi Legend)
  const [players, setPlayers] = useState<Player[]>(() => {
    try {
      localStorage.removeItem('revirfc_players_v1');
    } catch {}

    const saved = localStorage.getItem('revirfc_players_v3') || localStorage.getItem('revirfc_players_v2');
    if (!saved) return INITIAL_PLAYERS;
    try {
      let parsed: Player[] = JSON.parse(saved);
      // If old dummy players exist in storage, purge and reload real 22 players
      if (parsed.some((p) => p.name === 'Mert Kayra' || p.name === 'Burak Demir')) {
        return INITIAL_PLAYERS;
      }
      // Guarantee İsmail, Gölcür & Cevdet are updated to Legend
      parsed = parsed.map((p) => {
        if (p.id === 'p4') {
          return {
            ...p,
            name: 'İsmail',
            isLegend: true,
            theme: p.theme === 'totw' || p.theme === 'inform' || p.theme === 'revir' ? p.theme : 'legend',
            baseOVR: 88,
            currentOVR: Math.max(p.currentOVR, 88),
          };
        }
        if (p.id === 'p9') {
          return {
            ...p,
            name: 'Gölcür',
            isLegend: true,
            theme: p.theme === 'totw' || p.theme === 'inform' || p.theme === 'revir' ? p.theme : 'legend',
            baseOVR: 88,
            currentOVR: Math.max(p.currentOVR, 88),
          };
        }
        if (p.id === 'p7') {
          return {
            ...p,
            name: 'Cevdet',
            isLegend: true,
            theme: p.theme === 'totw' || p.theme === 'inform' || p.theme === 'revir' ? p.theme : 'legend',
            baseOVR: Math.max(p.baseOVR, 86),
            currentOVR: Math.max(p.currentOVR, 86),
          };
        }
        if (p.id === 'p1') {
          return {
            ...p,
            nickname: p.nickname === 'Büyük Kaptan' ? 'White' : p.nickname,
            photoUrl: p.photoUrl && !p.photoUrl.includes('unsplash') ? p.photoUrl : '/players/alper.png',
          };
        }
        return p;
      });
      const existingIds = new Set(parsed.map((p) => p.id));
      const missing = INITIAL_PLAYERS.filter((p) => !existingIds.has(p.id));
      return [...parsed, ...missing];
    } catch {
      return INITIAL_PLAYERS;
    }
  });

  const [match, setMatch] = useState<Match>(() => {
    try {
      localStorage.removeItem('revirfc_match_v1');
    } catch {}

    const saved = localStorage.getItem('revirfc_match_v2');
    if (saved) {
      try {
        const parsed: Match = JSON.parse(saved);
        if (parsed.starters.includes('p1') && parsed.starters.length === 12) {
          return parsed;
        }
      } catch {}
    }

    const startersList = INITIAL_PLAYERS.filter((p) =>
      MOCK_ACTIVE_MATCH.starters.includes(p.id)
    );
    const balance = run462BalancingAlgorithm(startersList, MOCK_ACTIVE_MATCH.checkIns);
    return {
      ...MOCK_ACTIVE_MATCH,
      teamA: balance.teamA,
      teamB: balance.teamB,
    };
  });

  const [posts, setPosts] = useState<LockerPost[]>(() => {
    try {
      localStorage.removeItem('revirfc_posts_v1');
    } catch {}
    const saved = localStorage.getItem('revirfc_posts_v2');
    return saved ? JSON.parse(saved) : MOCK_POSTS;
  });

  const [photos, setPhotos] = useState<PhotoArchiveItem[]>(() => {
    try {
      localStorage.removeItem('revirfc_photos_v1');
    } catch {}
    const saved = localStorage.getItem('revirfc_photos_v2');
    return saved ? JSON.parse(saved) : MOCK_PHOTOS;
  });

  const [debts, setDebts] = useState<DessertDebt[]>(() => {
    try {
      localStorage.removeItem('revirfc_debts_v1');
    } catch {}
    const saved = localStorage.getItem('revirfc_debts_v2');
    return saved ? JSON.parse(saved) : MOCK_DEBTS;
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

  const [savedScoutingEntries, setSavedScoutingEntries] = useState<PlayerScoutingEntry[]>(() => {
    try {
      const saved = localStorage.getItem('revirfc_scouting_v2');
      if (saved) {
        const parsed: PlayerScoutingEntry[] = JSON.parse(saved);
        // Merge with initial entries to ensure Yüksel and Alper entries are present if not overwritten
        const entryKey = (e: PlayerScoutingEntry) => `${e.playerId}_${e.evaluatorName}`;
        const existingKeys = new Set(parsed.map(entryKey));
        const missingFromInitial = INITIAL_SCOUTING_ENTRIES.filter((e) => !existingKeys.has(entryKey(e)));
        return [...parsed, ...missingFromInitial];
      }
    } catch {}
    return INITIAL_SCOUTING_ENTRIES;
  });

  useEffect(() => {
    safeSetItem('revirfc_scouting_v2', JSON.stringify(savedScoutingEntries));
  }, [savedScoutingEntries]);

  // Modals state
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const [checkInPlayer, setCheckInPlayer] = useState<Player | null>(null);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [isCommitteeModalOpen, setIsCommitteeModalOpen] = useState(false);
  const [showFirebaseModal, setShowFirebaseModal] = useState(false);
  const [showReminderModal, setShowReminderModal] = useState(false);

  const handleQuickCheckInForPlayer = (playerId: string) => {
    handleSaveCheckIn({
      playerId,
      timestamp: Date.now(),
      status: 'full',
      note: 'Kaptan tarafından hızlı onaylandı',
    });
  };

  // Sync state to LocalStorage
  // Oyuncu fotoğrafları (base64) localStorage kotasını doldurduğu için IndexedDB'ye taşınır;
  // localStorage'a yalnızca hafif "idb:" referanslı JSON yazılır. Önce görsel, sonra JSON yazılır.
  const playersPersistSeq = useRef(0);
  useEffect(() => {
    const seq = ++playersPersistSeq.current;
    externalizeImages(players, {
      prefix: 'player',
      keyOf: (p) => p.id,
      get: (p) => p.photoUrl,
      set: (p, url) => ({ ...p, photoUrl: url }),
    }).then((slim) => {
      if (seq !== playersPersistSeq.current) return; // daha yeni bir kayıt var
      safeSetItem('revirfc_players_v3', JSON.stringify(slim));
    });
  }, [players]);

  // Açılışta "idb:" referanslarını gerçek görsellere çevir
  useEffect(() => {
    let cancelled = false;
    hydrateImages(
      players,
      { get: (p) => p.photoUrl, set: (p, url) => ({ ...p, photoUrl: url }) },
      '/players/alper.png'
    ).then((hydrated) => {
      if (cancelled) return;
      if (hydrated.some((p, i) => p.photoUrl !== players[i].photoUrl)) {
        // Hydrate sırasında kullanıcı bir değişiklik yaptıysa onu ezme: yalnızca fotoğraf alanını uygula
        setPlayers((prev) =>
          prev.map((p) => {
            const h = hydrated.find((x) => x.id === p.id);
            return h && isIdbRef(p.photoUrl) ? { ...p, photoUrl: h.photoUrl } : p;
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
    safeSetItem('revirfc_match_v2', JSON.stringify(match));
  }, [match]);

  useEffect(() => {
    safeSetItem('revirfc_posts_v2', JSON.stringify(posts));
  }, [posts]);

  const photosPersistSeq = useRef(0);
  useEffect(() => {
    const seq = ++photosPersistSeq.current;
    externalizeImages(photos, {
      prefix: 'archive',
      keyOf: (p) => p.id,
      get: (p) => p.imageUrl,
      set: (p, url) => ({ ...p, imageUrl: url }),
    }).then((slim) => {
      if (seq !== photosPersistSeq.current) return;
      safeSetItem('revirfc_photos_v2', JSON.stringify(slim));
    });
  }, [photos]);

  useEffect(() => {
    let cancelled = false;
    hydrateImages(photos, { get: (p) => p.imageUrl, set: (p, url) => ({ ...p, imageUrl: url }) }).then((hydrated) => {
      if (cancelled) return;
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
    safeSetItem('revirfc_debts_v2', JSON.stringify(debts));
  }, [debts]);

  // Depolama hatası olursa kullanıcıya görünür uyarı (sessizce kaybolmasın)
  const [storageError, setStorageError] = useState(false);
  useEffect(() => {
    const onErr = () => setStorageError(true);
    window.addEventListener(STORAGE_ERROR_EVENT, onErr);
    return () => window.removeEventListener(STORAGE_ERROR_EVENT, onErr);
  }, []);

  const access = getAccess(currentUser, players);
  const isPendingUser = access.isPending;
  const isSuperAdmin = access.isSuperAdmin;
  // Kurul + Yönetici: kart/unvan/mevki yönetimi (ayrıntılı yetki matrisi: services/permissions.ts)
  const isAdminOrCaptain = access.isCommittee;
  const isApprovedUser = access.isApproved;

  // Current logged in member's claimed player
  const claimedPlayer = currentUser?.claimedPlayerId
    ? players.find((p) => p.id === currentUser.claimedPlayerId)
    : (isAdminOrCaptain ? players[0] : undefined);

  // Handle Check-in Save
  const handleSaveCheckIn = (checkIn: CheckInEntry) => {
    setMatch((prev) => ({
      ...prev,
      checkIns: {
        ...prev.checkIns,
        [checkIn.playerId]: checkIn,
      },
    }));

    // Update player's status on card
    setPlayers((prev) =>
      prev.map((p) =>
        p.id === checkIn.playerId
          ? {
              ...p,
              currentStatus: checkIn.status,
              theme:
                checkIn.status === 'light_injury'
                  ? 'revir'
                  : p.theme === 'revir'
                  ? p.isLegend
                    ? 'legend'
                    : 'gold'
                  : p.theme,
            }
          : p
      )
    );
  };

  // Handle saving customized player card with strict club rules:
  // 1. MVP ('totw') is strictly single (tekil). If updated is totw, any previous MVP drops to legend/gold.
  // 2. Bidon ('bidon') is strictly single (tekil). If updated is bidon, any previous Bidon drops to legend/gold.
  // 3. Ateş Ediyo! ('inform') is maximum 3. If a 4th is added, the oldest inform card automatically drops to legend/gold.
  const handleSavePlayerCard = (updated: Player) => {
    const getBaseTheme = (p: Player): CardTheme => {
      if (p.currentStatus === 'light_injury') return 'revir';
      if (p.isLegend) return 'legend';
      return 'gold';
    };

    setPlayers((prev) => {
      let demotedInformId: string | null = null;
      if (updated.theme === 'inform') {
        const otherInForms = prev.filter((p) => p.id !== updated.id && p.theme === 'inform');
        if (otherInForms.length >= 3) {
          const sorted = [...otherInForms].sort((a, b) => {
            const timeA = a.inFormAwardedAt || 0;
            const timeB = b.inFormAwardedAt || 0;
            return timeA - timeB;
          });
          demotedInformId = sorted[0].id;
        }
      }

      return prev.map((p) => {
        if (p.id === updated.id) {
          return {
            ...updated,
            inFormAwardedAt: updated.theme === 'inform' ? (updated.inFormAwardedAt || Date.now()) : undefined,
          };
        }

        // Kural 1: Yönetici dahil 2 MVP olamaz. Yeni MVP seçilince eski MVP gold/legend'a düşer.
        if (updated.theme === 'totw' && p.theme === 'totw') {
          return {
            ...p,
            theme: getBaseTheme(p),
          };
        }

        // Kural 2: Yönetici dahil 2 Bidon olamaz. Yeni Bidon seçilince eski Bidon gold/legend'a düşer.
        if (updated.theme === 'bidon' && p.theme === 'bidon') {
          return {
            ...p,
            theme: getBaseTheme(p),
          };
        }

        // Kural 3: En fazla 3 Ateş Ediyo! kartı olabilir. 4. eklendiğinde en eski alev gold/legend'a düşer.
        if (demotedInformId && p.id === demotedInformId) {
          return {
            ...p,
            theme: getBaseTheme(p),
            inFormAwardedAt: undefined,
          };
        }

        return p;
      });
    });

    // Synchronize match awards state
    setMatch((prevMatch) => {
      const currentAwards = prevMatch.awards || {};
      let newMvpId = currentAwards.mvpId;
      let newBidonId = currentAwards.bidonId;
      let newInFormIds = [...(currentAwards.inFormIds || [])];

      if (updated.theme === 'totw') {
        newMvpId = updated.id;
        if (newBidonId === updated.id) newBidonId = undefined;
        newInFormIds = newInFormIds.filter((id) => id !== updated.id);
      } else if (updated.theme === 'bidon') {
        newBidonId = updated.id;
        if (newMvpId === updated.id) newMvpId = undefined;
        newInFormIds = newInFormIds.filter((id) => id !== updated.id);
      } else if (updated.theme === 'inform') {
        if (newMvpId === updated.id) newMvpId = undefined;
        if (newBidonId === updated.id) newBidonId = undefined;
        if (!newInFormIds.includes(updated.id)) {
          if (newInFormIds.length >= 3) {
            newInFormIds = [...newInFormIds.slice(1), updated.id];
          } else {
            newInFormIds.push(updated.id);
          }
        }
      } else {
        if (newMvpId === updated.id) newMvpId = undefined;
        if (newBidonId === updated.id) newBidonId = undefined;
        newInFormIds = newInFormIds.filter((id) => id !== updated.id);
      }

      return {
        ...prevMatch,
        awards: {
          ...currentAwards,
          mvpId: newMvpId,
          bidonId: newBidonId,
          inFormIds: newInFormIds,
        },
      };
    });
  };

  // Run 462 balancing algorithm
  const handleRunBalancing = () => {
    const startersList = players.filter((p) => match.starters.includes(p.id));
    if (startersList.length < 12) {
      alert('Dengeleme için 12 kişilik kadro dolmalıdır.');
      return;
    }

    const result = run462BalancingAlgorithm(startersList, match.checkIns);
    setMatch((prev) => ({
      ...prev,
      teamA: result.teamA,
      teamB: result.teamB,
      stage: 'balancing',
    }));

    // Switch to tactics tab to see results!
    setActiveTab('tactics');
  };

  // Toggle starter participation (Sakatlandım / Çekiliyorum -> promote waitlist #1)
  const handleToggleParticipation = (playerId: string) => {
    const isStarter = match.starters.includes(playerId);

    if (isStarter) {
      // Starter withdraws: Remove from starters, promote waitlist[0]
      const newStarters = match.starters.filter((id) => id !== playerId);
      let newWaitlist = [...match.waitlist];

      if (newWaitlist.length > 0) {
        const promoted = newWaitlist.shift()!;
        newStarters.push(promoted);
      }

      setMatch((prev) => ({
        ...prev,
        starters: newStarters,
        waitlist: newWaitlist,
      }));
    } else {
      // Manual promote from waitlist to starters if room exists
      if (match.starters.length < 12) {
        setMatch((prev) => ({
          ...prev,
          starters: [...prev.starters, playerId],
          waitlist: prev.waitlist.filter((id) => id !== playerId),
        }));
      }
    }
  };

  // Handle post-match 360 ratings and individual ballots
  const handleSaveRatings = (votes: MatchRatingVote[], provisionalAwards: MatchAwards, ballot?: MatchBallot) => {
    const teamAIds = new Set(match.teamA?.players.map((x) => x.player.id) || []);
    const teamBIds = new Set(match.teamB?.players.map((x) => x.player.id) || []);

    // Check if awards were already sealed by Kurul
    const isAlreadyConfirmed = Boolean(match.awards?.isConfirmedByCommittee);
    const activeAwards = isAlreadyConfirmed ? match.awards! : provisionalAwards;

    const updatedPlayers = players.map((p) => {
      if (!match.starters.includes(p.id)) return p;

      const isTeamA = teamAIds.has(p.id);
      const teammateIds = isTeamA ? teamAIds : teamBIds;
      const opponentIds = isTeamA ? teamBIds : teamAIds;

      const calc = calculatePlayerMatchRating({
        playerId: p.id,
        oldOVR: p.currentOVR,
        votes,
        teammateIds,
        opponentIds,
      });

      // Update theme:
      let newTheme = p.theme;
      if (activeAwards.mvpId === p.id) {
        newTheme = 'totw';
      } else if (activeAwards.bidonId === p.id && !p.isLegend) {
        newTheme = 'bidon';
      } else if (activeAwards.inFormIds?.includes(p.id)) {
        newTheme = 'inform';
      } else if (p.currentStatus === 'light_injury') {
        newTheme = 'revir';
      } else if (p.theme === 'totw' || p.theme === 'bidon' || p.theme === 'inform' || p.theme === 'revir') {
        newTheme = p.isLegend ? 'legend' : 'gold';
      } else if (p.isLegend) {
        newTheme = 'legend';
      }

      return {
        ...p,
        currentOVR: calc.newOVR,
        egoIndex: calc.egoDelta,
        theme: newTheme,
        formTrend: calc.deltaOVR > 0 ? ('up' as const) : calc.deltaOVR < 0 ? ('down' as const) : ('stable' as const),
      };
    });

    // Update ballot collection
    const updatedBallots = ballot
      ? [...(match.ballots || []).filter((b) => b.raterId !== ballot.raterId), ballot]
      : (match.ballots || []);

    setPlayers(updatedPlayers);
    setMatch((prev) => ({
      ...prev,
      stage: 'rating',
      awards: activeAwards,
      ratings: votes,
      ballots: updatedBallots,
    }));
  };

  // Handle Kurul Veto, Son Mühür & Resmi Kart Dağıtımı
  const handleCommitteeConfirmAwards = (finalAwards: MatchAwards) => {
    const updatedPlayers = players.map((p) => {
      // 1. Haftanın MVP'si (Efsane olsa bile hak ettiğinde MVP olabilir!)
      if (finalAwards.mvpId === p.id) {
        return { ...p, theme: 'totw' as const };
      }
      // 2. Haftanın Bidonu (Efsaneler ASLA bidon seçilemez!)
      if (finalAwards.bidonId === p.id && !p.isLegend) {
        return { ...p, theme: 'bidon' as const };
      }
      // 3. Ateş Ediyo! Kartları (Efsane olsa bile hak ettiğinde Ateş Ediyo! olabilir!)
      if (finalAwards.inFormIds?.includes(p.id)) {
        return { ...p, theme: 'inform' as const };
      }
      // 4. Eğer aktif hafif sakatlık (revir) check-in durumu varsa korunur
      if (p.currentStatus === 'light_injury') {
        return { ...p, theme: 'revir' as const };
      }
      // 5. Özel unvan almayanlar: Efsaneler 'legend' temasına, standart oyuncular 'gold'a döner!
      if (p.isLegend) {
        return { ...p, theme: 'legend' as const };
      }
      return { ...p, theme: 'gold' as const };
    });

    setPlayers(updatedPlayers);
    setMatch((prev) => ({
      ...prev,
      stage: 'rating',
      awards: finalAwards,
    }));

    // If Haftanın Bidonu chosen, add funny Thermos Tea debt to ledger (Termosla Çay ☕)
    if (finalAwards.bidonId) {
      const bidonPlayer = players.find((p) => p.id === finalAwards.bidonId);
      if (bidonPlayer) {
        setDebts((prev) => [
          {
            id: `debt-${Date.now()}`,
            debtorPlayerId: bidonPlayer.id,
            description: 'Maç sonu oylamasında Haftanın Bidonu seçildi! Haftaya sahaya koca bir termos çay getirecek ☕🫖',
            treatType: 'çay',
            status: 'pending',
            createdAt: new Date().toISOString(),
          },
          ...prev,
        ]);
      }
    }

    // Official Kurul Mührü Announcements in Soyunma Odası (Locker Room)
    const mvpPlayer = players.find((p) => p.id === finalAwards.mvpId);
    const bidonPlayer = finalAwards.bidonId ? players.find((p) => p.id === finalAwards.bidonId) : undefined;
    const inFormPlayers = (finalAwards.inFormIds || [])
      .map((id) => players.find((p) => p.id === id))
      .filter(Boolean) as Player[];

    const newAnnouncements: LockerPost[] = [];

    if (mvpPlayer) {
      newAnnouncements.push({
        id: `post-${Date.now()}-mvp`,
        matchId: match.id,
        authorPlayerId: 'system',
        authorName: 'Revir FC Kurul Mührü 🔏',
        text: `🏆 HAFTANIN RESMİ MVP'Sİ: ${mvpPlayer.name}! Kurul mührü ve maç sonu oylarıyla haftanın en değerlisi tescillendi! 1 hafta boyunca parlayan Siyah-Kozmik Kristal MVP kartını göğsüne taktı! ⭐⚽`,
        isAnonymous: false,
        reactions: { fire: [mvpPlayer.id], laugh: [], violin: [], revir: [], goat: [mvpPlayer.id] },
        createdAt: new Date().toISOString(),
      });
    }

    if (bidonPlayer) {
      newAnnouncements.push({
        id: `post-${Date.now()}-bidon`,
        matchId: match.id,
        authorPlayerId: 'system',
        authorName: 'Revir FC Kurul Mührü 🔏',
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
        authorName: 'Revir FC Kurul Mührü 🔏',
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
        authorName: 'Revir FC Kurul Mührü 🔏',
        text: `🔥 ATEŞ EDİYO!: Kurul tarafından bu haftanın sahada durdurulamayan yıldızları ${names} seçildi! Ateş Ediyo! kartları hayırlı olsun! 🔥⚽`,
        isAnonymous: false,
        reactions: { fire: inFormPlayers.map((p) => p.id), laugh: [], violin: [], revir: [], goat: [] },
        createdAt: new Date().toISOString(),
      });
    }

    setPosts((prev) => [...newAnnouncements, ...prev]);
  };

  // Add post to locker room
  const handleAddPost = (text: string, isAnonymous: boolean) => {
    const authorId = isAnonymous ? 'anonymous' : (claimedPlayer?.id || 'guest');
    const authorName = isAnonymous ? 'Anonim Soyunma Odası Fısıltısı' : (claimedPlayer?.name || 'Misafir Oyuncu');
    const newPost: LockerPost = {
      id: `post-${Date.now()}`,
      matchId: match.id,
      authorPlayerId: authorId,
      authorName,
      authorPhoto: isAnonymous ? undefined : claimedPlayer?.photoUrl,
      text,
      isAnonymous,
      reactions: { fire: [], laugh: [], violin: [], revir: [], goat: [] },
      createdAt: new Date().toISOString(),
    };
    setPosts((prev) => [newPost, ...prev]);
  };

  // React to locker room post
  const handleReactPost = (postId: string, reactionType: keyof LockerPost['reactions']) => {
    const raterId = claimedPlayer?.id || 'guest';
    setPosts((prev) =>
      prev.map((p) => {
        if (p.id !== postId) return p;
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
      })
    );
  };

  // Add photo to archive
  const handleAddPhoto = (newPhoto: Omit<PhotoArchiveItem, 'id' | 'createdAt' | 'likes'>) => {
    const item: PhotoArchiveItem = {
      ...newPhoto,
      id: `photo-${Date.now()}`,
      likes: claimedPlayer ? [claimedPlayer.id] : [],
      createdAt: new Date().toISOString(),
    };
    setPhotos((prev) => [item, ...prev]);
  };

  // Like photo
  const handleLikePhoto = (photoId: string) => {
    if (!claimedPlayer) return;
    setPhotos((prev) =>
      prev.map((p) => {
        if (p.id !== photoId) return p;
        const hasLiked = p.likes.includes(claimedPlayer.id);
        return {
          ...p,
          likes: hasLiked ? p.likes.filter((id) => id !== claimedPlayer.id) : [...p.likes, claimedPlayer.id],
        };
      })
    );
  };

  // Toggle debt status
  const handleToggleDebt = (debtId: string) => {
    setDebts((prev) =>
      prev.map((d) => (d.id === debtId ? { ...d, status: d.status === 'pending' ? 'paid' : 'pending' } : d))
    );
  };

  // Add new debt
  const handleAddDebt = (debtorPlayerId: string, description: string, treatType: DessertDebt['treatType']) => {
    const newDebt: DessertDebt = {
      id: `debt-${Date.now()}`,
      debtorPlayerId,
      description,
      treatType,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
    setDebts((prev) => [newDebt, ...prev]);
  };

  // Save scouting entry from committee member
  const handleSaveScoutingEntry = (entry: PlayerScoutingEntry) => {
    setSavedScoutingEntries((prev) => {
      const filtered = prev.filter(
        (e) => !(e.playerId === entry.playerId && e.evaluatorName === entry.evaluatorName)
      );
      return [...filtered, entry];
    });
  };

  // Apply consensus to all 20 FC 27 cards
  const handleApplyConsensusToPlayers = (updatedPlayers: Player[]) => {
    setPlayers(updatedPlayers);
  };

  // Handle Admin approving a player's nickname change request
  const handleApproveNickname = (playerId: string) => {
    const targetPlayer = players.find((p) => p.id === playerId);
    if (!targetPlayer || !targetPlayer.pendingNickname) return;

    const approvedNick = targetPlayer.pendingNickname;
    setPlayers((prev) =>
      prev.map((p) =>
        p.id === playerId ? { ...p, nickname: approvedNick, pendingNickname: undefined } : p
      )
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
    setPosts((prev) => [newAnnouncement, ...prev]);
  };

  // Handle Admin rejecting a player's nickname change request
  const handleRejectNickname = (playerId: string) => {
    setPlayers((prev) =>
      prev.map((p) => (p.id === playerId ? { ...p, pendingNickname: undefined } : p))
    );
  };

  const pendingUsersCount = allUsers.filter((u) => u.status === 'pending').length;
  const pendingNicknamesCount = players.filter((p) => Boolean(p.pendingNickname)).length;
  const totalAdminPendingCount = pendingUsersCount + pendingNicknamesCount;

  return (
    <div className="min-h-screen bg-black text-white flex flex-col font-sans selection:bg-amber-500 selection:text-black">
      {/* Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        claimedPlayer={claimedPlayer}
        onOpenCardEdit={() => claimedPlayer && setEditingPlayer(claimedPlayer)}
        onOpenFirebaseModal={() => setShowFirebaseModal(true)}
        pendingApprovalCount={totalAdminPendingCount}
      />

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

      {/* Pending User Showcase Notification Banner */}
      {isPendingUser && (
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
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-6">
        {activeTab === 'squad' && (
          <SquadCardGallery
            players={players}
            onSelectPlayer={(p) => setEditingPlayer(p)}
          />
        )}

        {activeTab === 'scouting' && (
          isPendingUser ? (
            <div className="space-y-6">
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-3xl p-6 text-center shadow-lg">
                <Lock className="w-8 h-8 text-amber-400 mx-auto mb-2" />
                <h3 className="text-base font-bold text-white">⭐ Kurul & Scouting Değerlendirmesi</h3>
                <p className="text-xs text-neutral-300 mt-1.5 max-w-lg mx-auto leading-relaxed">
                  Maç sonu scouting değerlendirmesi yapabilmek ve puan verebilmek için Kurul tarafından onaylanmış üye olmalısınız. Aşağıdaki konsensüs tablosundan mevcut puanları inceleyebilirsiniz.
                </p>
              </div>
              <ScoutingAdminDashboard
                players={players}
                savedEntries={savedScoutingEntries}
                onApplyConsensusToPlayers={() => {}}
                onBackToWizard={() => {}}
                isReadOnly={true}
              />
            </div>
          ) : (
            scoutingView === 'wizard' ? (
              <ScoutingWizard
                players={players}
                evaluatorName={evaluatorName}
                onEvaluatorChange={setEvaluatorName}
                savedEntries={savedScoutingEntries}
                onSaveEntry={handleSaveScoutingEntry}
                onFinishAll={() => setScoutingView('dashboard')}
                onSwitchToDashboard={() => setScoutingView('dashboard')}
              />
            ) : (
              <ScoutingAdminDashboard
                players={players}
                savedEntries={savedScoutingEntries}
                onApplyConsensusToPlayers={handleApplyConsensusToPlayers}
                onBackToWizard={() => setScoutingView('wizard')}
              />
            )
          )
        )}

        {activeTab === 'match' && (
          <SquadList
            match={match}
            players={players}
            claimedPlayer={claimedPlayer}
            onOpenCheckIn={(p) => setCheckInPlayer(p)}
            onRunBalancing={handleRunBalancing}
            onOpenRating={() => setShowRatingModal(true)}
            onOpenCommittee={() => setIsCommitteeModalOpen(true)}
            onToggleParticipation={handleToggleParticipation}
            onOpenReminderHub={() => setShowReminderModal(true)}
            isPendingUser={isPendingUser}
            isAdmin={isAdminOrCaptain}
          />
        )}

        {activeTab === 'tactics' && match.teamA && match.teamB && (
          <TacticalPitch
            teamA={match.teamA}
            teamB={match.teamB}
            matchTitle={match.title}
            matchDate={new Date(match.date).toLocaleDateString('tr-TR', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
            })}
          />
        )}

        {activeTab === 'locker' && (
          <LockerRoomFeed
            posts={posts}
            currentPlayer={claimedPlayer}
            onAddPost={handleAddPost}
            onReact={handleReactPost}
            isReadOnly={isPendingUser}
          />
        )}

        {activeTab === 'gallery' && (
          <PhotoGallery
            photos={photos}
            players={players}
            currentPlayer={claimedPlayer}
            onAddPhoto={handleAddPhoto}
            onLikePhoto={handleLikePhoto}
            isReadOnly={isPendingUser}
          />
        )}

        {activeTab === 'analytics' && (
          <div className="space-y-8">
            <ChemistryMatrix players={players} />
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
              />
            )}
          </div>
        )}

        {activeTab === 'admin' && currentUser?.role === 'admin' && (
          <AdminApprovalPanel
            allUsers={allUsers}
            players={players}
            onApprove={approveUser}
            onReject={rejectUser}
            onApproveNickname={handleApproveNickname}
            onRejectNickname={handleRejectNickname}
          />
        )}
      </main>

      {/* Modals */}
      {editingPlayer && (
        <CardCustomizer
          player={editingPlayer}
          allPlayers={players}
          isAdmin={isAdminOrCaptain}
          isSuperAdmin={isSuperAdmin}
          canEditPositions={isAdminOrCaptain}
          isPendingUser={isPendingUser}
          isOwnCard={Boolean(currentUser?.claimedPlayerId && currentUser.claimedPlayerId === editingPlayer.id)}
          canEdit={Boolean(isAdminOrCaptain || (isApprovedUser && currentUser?.claimedPlayerId === editingPlayer.id))}
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

      {showRatingModal && (
        <MatchRatingModal
          match={match}
          currentRaterPlayer={claimedPlayer || players[0]}
          players={players}
          onSaveRatings={handleSaveRatings}
          onClose={() => setShowRatingModal(false)}
        />
      )}

      {isCommitteeModalOpen && (
        <CommitteeDecisionModal
          isOpen={isCommitteeModalOpen}
          match={match}
          players={players}
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
          onClose={() => setShowReminderModal(false)}
        />
      )}
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
