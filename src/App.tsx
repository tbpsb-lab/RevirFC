import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import {
  Player,
  Match,
  LockerPost,
  PhotoArchiveItem,
  DessertDebt,
  CheckInEntry,
  MatchRatingVote,
  MatchAwards,
  PlayerScoutingEntry,
} from './types';
import {
  INITIAL_PLAYERS,
  MOCK_ACTIVE_MATCH,
  MOCK_POSTS,
  MOCK_PHOTOS,
  MOCK_DEBTS,
} from './services/mockData';
import { run462BalancingAlgorithm } from './services/balancingEngine';
import { calculatePlayerMatchRating } from './services/ratingEngine';

import { Navbar, NavTab } from './components/layout/Navbar';
import { PendingApprovalGate } from './components/layout/PendingApprovalGate';
import { FirebaseSetupModal } from './components/layout/FirebaseSetupModal';

import { SquadCardGallery } from './components/card/SquadCardGallery';
import { CardCustomizer } from './components/card/CardCustomizer';
import { SquadList } from './components/checkin/SquadList';
import { CheckInModal } from './components/checkin/CheckInModal';
import { TacticalPitch } from './components/match/TacticalPitch';
import { MatchRatingModal } from './components/rating/MatchRatingModal';
import { LockerRoomFeed } from './components/locker/LockerRoomFeed';
import { PhotoGallery } from './components/locker/PhotoGallery';
import { ChemistryMatrix } from './components/stats/ChemistryMatrix';
import { EgoIndexCard } from './components/stats/EgoIndexCard';
import { DessertLedger } from './components/stats/DessertLedger';
import { AdminApprovalPanel } from './components/admin/AdminApprovalPanel';
import { ScoutingWizard } from './components/scouting/ScoutingWizard';
import { ScoutingAdminDashboard } from './components/scouting/ScoutingAdminDashboard';
import { ReminderHubModal } from './components/reminder/ReminderHubModal';

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
      // Guarantee İsmail Abi & Gölcür Abi are updated to Legend
      parsed = parsed.map((p) => {
        if (p.id === 'p4') {
          return {
            ...p,
            name: 'İsmail Abi',
            theme: 'legend',
            baseOVR: 88,
            currentOVR: Math.max(p.currentOVR, 88),
          };
        }
        if (p.id === 'p9') {
          return {
            ...p,
            name: 'Gölcür Abi',
            theme: 'legend',
            baseOVR: 88,
            currentOVR: Math.max(p.currentOVR, 88),
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
    const saved = localStorage.getItem('revirfc_scouting_v2');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('revirfc_scouting_v2', JSON.stringify(savedScoutingEntries));
  }, [savedScoutingEntries]);

  // Modals state
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const [checkInPlayer, setCheckInPlayer] = useState<Player | null>(null);
  const [showRatingModal, setShowRatingModal] = useState(false);
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
  useEffect(() => {
    localStorage.setItem('revirfc_players_v3', JSON.stringify(players));
  }, [players]);

  useEffect(() => {
    localStorage.setItem('revirfc_match_v2', JSON.stringify(match));
  }, [match]);

  useEffect(() => {
    localStorage.setItem('revirfc_posts_v2', JSON.stringify(posts));
  }, [posts]);

  useEffect(() => {
    localStorage.setItem('revirfc_photos_v2', JSON.stringify(photos));
  }, [photos]);

  useEffect(() => {
    localStorage.setItem('revirfc_debts_v2', JSON.stringify(debts));
  }, [debts]);

  // Current logged in member's claimed player
  const claimedPlayer = players.find((p) => p.id === currentUser?.claimedPlayerId) || players[0];

  // 1. Approval Gate Check: If pending, block all club data!
  if (currentUser?.status === 'pending') {
    return (
      <div className="min-h-screen bg-black text-white">
        <Navbar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          claimedPlayer={undefined}
          onOpenFirebaseModal={() => setShowFirebaseModal(true)}
        />
        <PendingApprovalGate />
        {showFirebaseModal && <FirebaseSetupModal onClose={() => setShowFirebaseModal(false)} />}
      </div>
    );
  }

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
              theme: checkIn.status === 'light_injury' ? 'revir' : p.theme === 'revir' ? 'gold' : p.theme,
            }
          : p
      )
    );
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

  // Handle post-match 360 ratings and EMA updates
  const handleSaveRatings = (votes: MatchRatingVote[], awards: MatchAwards) => {
    const startersList = players.filter((p) => match.starters.includes(p.id));
    const teamAIds = new Set(match.teamA?.players.map((x) => x.player.id) || []);
    const teamBIds = new Set(match.teamB?.players.map((x) => x.player.id) || []);

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

      // Update theme: İsmail Abi & Gölcür Abi always remain Legend
      let newTheme = p.theme;
      if (p.id === 'p4' || p.id === 'p9') {
        newTheme = 'legend';
      } else if (awards.mvpId === p.id) {
        newTheme = 'totw';
      } else if (awards.bidonId === p.id) {
        newTheme = 'bidon';
      } else if (calc.deltaOVR >= 2) {
        newTheme = 'inform';
      } else if (p.theme === 'totw' || p.theme === 'bidon') {
        newTheme = 'gold'; // previous MVP / Bidon resets to gold
      }

      return {
        ...p,
        currentOVR: calc.newOVR,
        egoIndex: calc.egoDelta,
        theme: newTheme,
        formTrend: calc.deltaOVR > 0 ? ('up' as const) : calc.deltaOVR < 0 ? ('down' as const) : ('stable' as const),
      };
    });

    setPlayers(updatedPlayers);
    setMatch((prev) => ({
      ...prev,
      stage: 'rating',
      awards,
      ratings: votes,
    }));

    // If Günün Bidonu chosen, add funny Baklava debt to ledger
    if (awards.bidonId) {
      const bidonPlayer = players.find((p) => p.id === awards.bidonId);
      if (bidonPlayer) {
        setDebts((prev) => [
          {
            id: `debt-${Date.now()}`,
            debtorPlayerId: bidonPlayer.id,
            description: 'Maç sonu oylamasında Günün Bidonu seçildi! Baklava ısmarlayacak 🪵🍯',
            treatType: 'baklava',
            status: 'pending',
            createdAt: new Date().toISOString(),
          },
          ...prev,
        ]);
      }
    }
  };

  // Add post to locker room
  const handleAddPost = (text: string, isAnonymous: boolean) => {
    const newPost: LockerPost = {
      id: `post-${Date.now()}`,
      matchId: match.id,
      authorPlayerId: isAnonymous ? 'anonymous' : claimedPlayer.id,
      authorName: isAnonymous ? 'Anonim Soyunma Odası Fısıltısı' : claimedPlayer.name,
      authorPhoto: isAnonymous ? undefined : claimedPlayer.photoUrl,
      text,
      isAnonymous,
      reactions: { fire: [], laugh: [], violin: [], revir: [], goat: [] },
      createdAt: new Date().toISOString(),
    };
    setPosts((prev) => [newPost, ...prev]);
  };

  // React to locker room post
  const handleReactPost = (postId: string, reactionType: keyof LockerPost['reactions']) => {
    setPosts((prev) =>
      prev.map((p) => {
        if (p.id !== postId) return p;
        const currentList = p.reactions[reactionType] || [];
        const hasReacted = currentList.includes(claimedPlayer.id);

        const updatedList = hasReacted
          ? currentList.filter((id) => id !== claimedPlayer.id)
          : [...currentList, claimedPlayer.id];

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
      likes: [claimedPlayer.id],
      createdAt: new Date().toISOString(),
    };
    setPhotos((prev) => [item, ...prev]);
  };

  // Like photo
  const handleLikePhoto = (photoId: string) => {
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

  return (
    <div className="min-h-screen bg-black text-white flex flex-col font-sans selection:bg-amber-500 selection:text-black">
      {/* Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        claimedPlayer={claimedPlayer}
        onOpenCardEdit={() => setEditingPlayer(claimedPlayer)}
        onOpenFirebaseModal={() => setShowFirebaseModal(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-6">
        {activeTab === 'squad' && (
          <SquadCardGallery
            players={players}
            onSelectPlayer={(p) => setEditingPlayer(p)}
          />
        )}

        {activeTab === 'scouting' && (
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
        )}

        {activeTab === 'match' && (
          <SquadList
            match={match}
            players={players}
            claimedPlayer={claimedPlayer}
            onOpenCheckIn={(p) => setCheckInPlayer(p)}
            onRunBalancing={handleRunBalancing}
            onOpenRating={() => setShowRatingModal(true)}
            onToggleParticipation={handleToggleParticipation}
            onOpenReminderHub={() => setShowReminderModal(true)}
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
          />
        )}

        {activeTab === 'gallery' && (
          <PhotoGallery
            photos={photos}
            players={players}
            currentPlayer={claimedPlayer}
            onAddPhoto={handleAddPhoto}
            onLikePhoto={handleLikePhoto}
          />
        )}

        {activeTab === 'analytics' && (
          <div className="space-y-8">
            <ChemistryMatrix players={players} />
            <EgoIndexCard players={players} />
            <DessertLedger
              debts={debts}
              players={players}
              onToggleDebt={handleToggleDebt}
              onAddDebt={handleAddDebt}
            />
          </div>
        )}

        {activeTab === 'admin' && currentUser?.role === 'admin' && (
          <AdminApprovalPanel
            allUsers={allUsers}
            players={players}
            onApprove={approveUser}
            onReject={rejectUser}
          />
        )}
      </main>

      {/* Modals */}
      {editingPlayer && (
        <CardCustomizer
          player={editingPlayer}
          isAdmin={currentUser?.role === 'admin'}
          onSave={(updated) => {
            setPlayers((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
          }}
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
          currentRaterPlayer={claimedPlayer}
          players={players}
          onSaveRatings={handleSaveRatings}
          onClose={() => setShowRatingModal(false)}
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
