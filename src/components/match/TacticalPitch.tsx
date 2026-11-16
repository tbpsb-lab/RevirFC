import React, { useRef, useState, useEffect, useMemo } from 'react';
import {
  CheckInEntry,
  Match,
  MatchSquad,
  Player,
  PreferredPosition,
  TacticalFormation,
  getPlayerSeniorityRank,
} from '../../types';
import { FCCard } from '../card/FCCard';
import {
  applyFormationToSquad,
  recomputeSquadTotals,
  computeSquadFairnessRating,
  generateHumanTacticalCommentary,
} from '../../services/balancingEngine';
import { toPng } from 'html-to-image';
import {
  Download,
  Sparkles,
  ArrowLeftRight,
  Move,
  Lock,
  Unlock,
  Trophy,
  ShieldCheck,
  Calendar,
  AlertTriangle,
  Activity,
  ChevronRight,
  Info,
} from 'lucide-react';

interface Props {
  pastMatches?: Match[];
  activeMatch?: Match;
  selectedMatchId?: string;
  onSelectMatch?: (matchId: string) => void;
  onUpdatePastMatch?: (updatedMatch: Match) => void;
  isAdmin?: boolean;

  teamA?: MatchSquad;
  teamB?: MatchSquad;
  altTeamA?: MatchSquad;
  altTeamB?: MatchSquad;
  players?: Player[];
  checkIns?: Record<string, CheckInEntry>;
  matchTitle?: string;
  matchDate?: string;
  fairnessRating?: number;
  altFairnessRating?: number;
  selectedOption?: 1 | 2;
  onSelectOption?: (option: 1 | 2) => void;
  canEditTactics?: boolean;
  onUpdateTeams?: (teamA: MatchSquad, teamB: MatchSquad, isAlt: boolean) => void;
}

type SlotRef = {
  team: 'A' | 'B';
  playerId: string;
};

interface LiveCommentaryState {
  title: string;
  message: string;
  icon: string;
  time: string;
}

export const TacticalPitch: React.FC<Props> = ({
  pastMatches = [],
  activeMatch,
  selectedMatchId,
  onSelectMatch,
  onUpdatePastMatch,
  isAdmin = false,

  teamA: directTeamA,
  teamB: directTeamB,
  altTeamA: directAltTeamA,
  altTeamB: directAltTeamB,
  players = [],
  checkIns: directCheckIns,
  matchTitle: directTitle,
  matchDate: directDate,
  fairnessRating: directFairness = 98,
  altFairnessRating: directAltFairness,
  selectedOption = 1,
  onSelectOption,
  canEditTactics = false,
  onUpdateTeams,
}) => {
  const pitchRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);

  // Selected week/match tracking: aktif maçta 6v6 kadro hazırsa onu aç, değilse en güncel geçmiş maçı göster
  const hasActiveBalancedTeams = Boolean(
    activeMatch?.teamA?.players?.length && activeMatch?.teamB?.players?.length
  );
  const [currentMatchId, setCurrentMatchId] = useState<string>(() => {
    if (selectedMatchId) return selectedMatchId;
    if (hasActiveBalancedTeams && activeMatch) return activeMatch.id;
    if (pastMatches.length > 0) return pastMatches[pastMatches.length - 1].id;
    return activeMatch?.id || 'match-current';
  });

  useEffect(() => {
    if (selectedMatchId) {
      setCurrentMatchId(selectedMatchId);
    }
  }, [selectedMatchId]);

  const prevHadActiveTeamsRef = useRef(hasActiveBalancedTeams);
  useEffect(() => {
    if (!prevHadActiveTeamsRef.current && hasActiveBalancedTeams && activeMatch) {
      setCurrentMatchId(activeMatch.id);
    }
    prevHadActiveTeamsRef.current = hasActiveBalancedTeams;
  }, [hasActiveBalancedTeams, activeMatch]);

  // Determine current match object
  const currentMatch = useMemo(() => {
    if (activeMatch && currentMatchId === activeMatch.id) {
      return activeMatch;
    }
    const foundPast = pastMatches.find((m) => m.id === currentMatchId);
    if (foundPast) return foundPast;
    return activeMatch;
  }, [currentMatchId, pastMatches, activeMatch]);

  const isSealedMatch = Boolean(currentMatch && currentMatch.stage === 'archived');
  const isPastWhatsAppMatch = Boolean(currentMatch?.manualEvaluation?.isManualWhatsAppMatch);

  // Effective permission: on sealed matches, ONLY admin can edit!
  const effectiveCanEdit = isSealedMatch ? isAdmin : canEditTactics;

  // Active option (1: Manuel Oynanan / 1. En Dengeli, 2: 462 Algoritması / 2. Alternatif)
  const [activeOption, setActiveOption] = useState<1 | 2>(selectedOption);
  const [draggedSlot, setDraggedSlot] = useState<SlotRef | null>(null);
  const [dragOverKey, setDragOverKey] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<SlotRef | null>(null);

  // Live real-time commentary state
  const [liveCommentary, setLiveCommentary] = useState<LiveCommentaryState | null>(null);

  // Local overrides preview
  const [previewSquads, setPreviewSquads] = useState<{
    matchId: string;
    isAlt: boolean;
    teamA: MatchSquad;
    teamB: MatchSquad;
  } | null>(null);

  // Determine baseline squads
  const baseTeamA = currentMatch?.teamA || directTeamA;
  const baseTeamB = currentMatch?.teamB || directTeamB;
  const baseAltTeamA = currentMatch?.altTeamA || directAltTeamA;
  const baseAltTeamB = currentMatch?.altTeamB || directAltTeamB;
  const matchCheckIns = currentMatch?.checkIns || directCheckIns || {};

  const hasAlternative = Boolean(baseAltTeamA && baseAltTeamB);

  useEffect(() => {
    if (!hasAlternative && activeOption === 2) {
      setActiveOption(1);
    }
  }, [hasAlternative, activeOption]);

  useEffect(() => {
    if (!isPastWhatsAppMatch && !effectiveCanEdit) {
      setActiveOption(selectedOption);
    }
  }, [selectedOption, isPastWhatsAppMatch, effectiveCanEdit]);

  const isAlt = activeOption === 2 && hasAlternative;
  const rawDisplayTeamA = isAlt && baseAltTeamA ? baseAltTeamA : baseTeamA;
  const rawDisplayTeamB = isAlt && baseAltTeamB ? baseAltTeamB : baseTeamB;

  const displayTeamA =
    previewSquads && previewSquads.matchId === currentMatchId && previewSquads.isAlt === isAlt
      ? previewSquads.teamA
      : rawDisplayTeamA;
  const displayTeamB =
    previewSquads && previewSquads.matchId === currentMatchId && previewSquads.isAlt === isAlt
      ? previewSquads.teamB
      : rawDisplayTeamB;

  if (!displayTeamA || !displayTeamB) {
    return (
      <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-8 text-center text-neutral-400">
        <p>Taktik tahtası için kadro verisi henüz oluşturulmadı.</p>
      </div>
    );
  }

  // Multi-criteria fairness rating: Option 1 vs Option 2 calculated independently and fixed on buttons!
  const option1Fairness =
    currentMatch?.fairnessRating ??
    directFairness ??
    (baseTeamA && baseTeamB ? computeSquadFairnessRating(baseTeamA, baseTeamB, matchCheckIns) : 75);
  const option2Fairness =
    baseAltTeamA && baseAltTeamB
      ? (currentMatch?.altFairnessRating ?? directAltFairness ?? computeSquadFairnessRating(baseAltTeamA, baseAltTeamB, matchCheckIns))
      : undefined;

  const primaryFairness = option1Fairness;
  const secondaryFairness = option2Fairness;
  const displayFairness = hasAlternative
    ? isAlt
      ? (option2Fairness ?? option1Fairness)
      : option1Fairness
    : option1Fairness;

  const detectFormation = (squad: MatchSquad): TacticalFormation => {
    const fwdCount = squad.players.filter((p) => p.assignedRole === 'FWD').length;
    const midCount = squad.players.filter((p) => p.assignedRole === 'MID').length;
    if (fwdCount === 2 && midCount === 1) return '2-1-2';
    if (fwdCount === 1 && midCount === 2) return '2-2-1';
    if (squad.formation === '2-1-2' || squad.formation === '2-2-1') return squad.formation;
    return '2-2-1';
  };

  // Gizli Kıdem Kuralı: İlk 12'deki en kıdemli oyuncunun bulunduğu takım her zaman YELEKSİZ olur; diğer takım YELEKLİ olur.
  const resolvePlayerRank = (p: Player): number => {
    const live = players.find((lp) => lp.id === p.id);
    return getPlayerSeniorityRank(live || p);
  };
  const rankTeamA =
    displayTeamA.players.length > 0
      ? Math.min(...displayTeamA.players.map((p) => resolvePlayerRank(p.player)))
      : Number.MAX_SAFE_INTEGER;
  const rankTeamB =
    displayTeamB.players.length > 0
      ? Math.min(...displayTeamB.players.map((p) => resolvePlayerRank(p.player)))
      : Number.MAX_SAFE_INTEGER;
  const teamAIsYeleksiz = rankTeamA <= rankTeamB;

  const teamAYelekName = teamAIsYeleksiz ? 'Yeleksiz' : 'Yelekli';
  const teamBYelekName = teamAIsYeleksiz ? 'Yelekli' : 'Yeleksiz';
  const teamADisplayName = teamAYelekName;
  const teamBDisplayName = teamBYelekName;

  // Görsel Saha Kuralı: Üst yarı (Yeşil) = Yelekli, Alt yarı (Beyaz ton) = Yeleksiz
  const yelekliSlotTeam: 'A' | 'B' = teamAIsYeleksiz ? 'B' : 'A';
  const yeleksizSlotTeam: 'A' | 'B' = teamAIsYeleksiz ? 'A' : 'B';
  const yelekliSquad = yelekliSlotTeam === 'A' ? displayTeamA : displayTeamB;
  const yeleksizSquad = yeleksizSlotTeam === 'A' ? displayTeamA : displayTeamB;

  const formationA = detectFormation(displayTeamA);
  const formationB = detectFormation(displayTeamB);
  const yelekliFormation = yelekliSlotTeam === 'A' ? formationA : formationB;
  const yeleksizFormation = yeleksizSlotTeam === 'A' ? formationA : formationB;

  // Savunma (DEF) Ortalamaları
  const avgDefA =
    displayTeamA.avgDEF ??
    Math.round(
      displayTeamA.players.reduce((s, p) => s + (p.effectiveStats?.def ?? p.player.stats.def), 0) /
        Math.max(1, displayTeamA.players.length)
    );
  const avgDefB =
    displayTeamB.avgDEF ??
    Math.round(
      displayTeamB.players.reduce((s, p) => s + (p.effectiveStats?.def ?? p.player.stats.def), 0) /
        Math.max(1, displayTeamB.players.length)
    );
  const yelekliAvgDef = yelekliSlotTeam === 'A' ? avgDefA : avgDefB;
  const yeleksizAvgDef = yeleksizSlotTeam === 'A' ? avgDefA : avgDefB;

  const normalizePairNames = (sqA?: MatchSquad, sqB?: MatchSquad) => {
    if (!sqA || !sqB) return { sqA, sqB };
    const rA = sqA.players.length
      ? Math.min(...sqA.players.map((x) => resolvePlayerRank(x.player)))
      : Number.MAX_SAFE_INTEGER;
    const rB = sqB.players.length
      ? Math.min(...sqB.players.map((x) => resolvePlayerRank(x.player)))
      : Number.MAX_SAFE_INTEGER;
    const aIsYeleksiz = rA <= rB;
    return {
      sqA: { ...sqA, name: aIsYeleksiz ? 'Yeleksiz' : 'Yelekli' },
      sqB: { ...sqB, name: aIsYeleksiz ? 'Yelekli' : 'Yeleksiz' },
    };
  };
  const altNormalized = normalizePairNames(
    isAlt ? displayTeamA : baseAltTeamA,
    isAlt ? displayTeamB : baseAltTeamB
  );

  const humanCommentary = generateHumanTacticalCommentary({
    teamA: { ...yelekliSquad, name: 'Yelekli' },
    teamB: { ...yeleksizSquad, name: 'Yeleksiz' },
    altTeamA: altNormalized.sqA,
    altTeamB: altNormalized.sqB,
    checkIns: matchCheckIns,
    isViewingAlt: isAlt,
  });

  const handleWeekSwitch = (matchId: string) => {
    setCurrentMatchId(matchId);
    setSelectedSlot(null);
    setPreviewSquads(null);
    setActiveOption(1);
    onSelectMatch?.(matchId);
  };

  const handleOptionSwitch = (opt: 1 | 2) => {
    if (!isPastWhatsAppMatch && !effectiveCanEdit) return;
    setActiveOption(opt);
    setSelectedSlot(null);
    setPreviewSquads(null);
    if (!isPastWhatsAppMatch) {
      onSelectOption?.(opt);
    }
  };

  const commitSquadChanges = (nextA: MatchSquad, nextB: MatchSquad) => {
    setPreviewSquads({
      matchId: currentMatchId,
      isAlt,
      teamA: nextA,
      teamB: nextB,
    });

    if (isSealedMatch && onUpdatePastMatch && currentMatch) {
      const updatedMatch: Match = {
        ...currentMatch,
        teamA: isAlt ? currentMatch.teamA : nextA,
        teamB: isAlt ? currentMatch.teamB : nextB,
        altTeamA: isAlt ? nextA : currentMatch.altTeamA,
        altTeamB: isAlt ? nextB : currentMatch.altTeamB,
      };
      onUpdatePastMatch(updatedMatch);
    } else if (onUpdateTeams) {
      onUpdateTeams(nextA, nextB, isAlt);
    }
  };

  const handleFormationChange = (team: 'A' | 'B', formation: TacticalFormation) => {
    if (!effectiveCanEdit) return;
    setSelectedSlot(null);
    const nextA =
      team === 'A'
        ? applyFormationToSquad(displayTeamA, formation, matchCheckIns, players)
        : displayTeamA;
    const nextB =
      team === 'B'
        ? applyFormationToSquad(displayTeamB, formation, matchCheckIns, players)
        : displayTeamB;

    commitSquadChanges(nextA, nextB);

    const teamLabel = team === 'A' ? teamADisplayName : teamBDisplayName;
    setLiveCommentary({
      title: `📐 Formasyon Değişikliği: ${teamLabel} (${formation})`,
      message:
        formation === '2-1-2'
          ? `${teamLabel} çift forvetli (2-1-2) ofansif dizilişe geçti: İleride yoğun pres ve gol tehdidi artırıldı, orta saha geçiş savunması tek oyuncuya emanet.`
          : `${teamLabel} çift merkezli (2-2-1) dengeli dizilişe geçti: Orta saha pas kontrolü ve ikinci bölge savunma emniyeti önceliklendirildi.`,
      icon: '📐',
      time: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    });
  };

  const swapSlots = (source: SlotRef, target: SlotRef) => {
    if (!effectiveCanEdit) return;
    if (source.team === target.team && source.playerId === target.playerId) return;

    const nextAPlayers = [...displayTeamA.players];
    const nextBPlayers = [...displayTeamB.players];

    const srcList = source.team === 'A' ? nextAPlayers : nextBPlayers;
    const dstList = target.team === 'A' ? nextAPlayers : nextBPlayers;

    const srcIdx = srcList.findIndex((x) => x.player.id === source.playerId);
    const dstIdx = dstList.findIndex((x) => x.player.id === target.playerId);
    if (srcIdx === -1 || dstIdx === -1) return;

    const srcItem = srcList[srcIdx];
    const dstItem = dstList[dstIdx];

    srcList[srcIdx] = { ...dstItem, assignedRole: srcItem.assignedRole };
    dstList[dstIdx] = { ...srcItem, assignedRole: dstItem.assignedRole };

    const updatedA = recomputeSquadTotals({ ...displayTeamA, players: nextAPlayers });
    const updatedB = recomputeSquadTotals({ ...displayTeamB, players: nextBPlayers });

    commitSquadChanges(updatedA, updatedB);

    if (source.team !== target.team) {
      setLiveCommentary({
        title: `🔄 Takımlar Arası Oyuncu Takası: ${srcItem.player.name} 🔁 ${dstItem.player.name}`,
        message: `${srcItem.player.name} ile ${dstItem.player.name} karşılıklı takımlara takas edildi. Takımların OVR ve DEF dengesi anlık olarak güncellendi (${teamAYelekName} DEF: ${updatedA.avgDEF}, ${teamBYelekName} DEF: ${updatedB.avgDEF}).`,
        icon: '🔄',
        time: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      });
    } else {
      setLiveCommentary({
        title: `↔️ Saha İçi Rol Değişimi: ${srcItem.player.name} ↔️ ${dstItem.player.name}`,
        message: `${source.team === 'A' ? teamAYelekName : teamBYelekName} bünyesinde ${srcItem.player.name} (${srcItem.assignedRole}) ile ${dstItem.player.name} (${dstItem.assignedRole}) mevkilerini takas etti.`,
        icon: '↔️',
        time: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      });
    }
  };

  const changeSlotRole = (slot: SlotRef, newRole: PreferredPosition) => {
    if (!effectiveCanEdit) return;

    const currentSquad = slot.team === 'A' ? displayTeamA : displayTeamB;
    const targetPlayerItem = currentSquad.players.find((p) => p.player.id === slot.playerId);
    const oldRole = targetPlayerItem?.assignedRole || 'MID';

    const nextAPlayers =
      slot.team === 'A'
        ? displayTeamA.players.map((p) => (p.player.id === slot.playerId ? { ...p, assignedRole: newRole } : p))
        : displayTeamA.players;
    const nextBPlayers =
      slot.team === 'B'
        ? displayTeamB.players.map((p) => (p.player.id === slot.playerId ? { ...p, assignedRole: newRole } : p))
        : displayTeamB.players;

    const updatedA = recomputeSquadTotals({ ...displayTeamA, players: nextAPlayers });
    const updatedB = recomputeSquadTotals({ ...displayTeamB, players: nextBPlayers });
    setSelectedSlot(null);

    commitSquadChanges(updatedA, updatedB);

    // Canlı Türkçe Taktik Direktörü Yorumu
    const pName = targetPlayerItem?.player.name || 'Oyuncu';
    let commentaryMsg = '';
    if (oldRole === 'FWD' && newRole === 'MID') {
      commentaryMsg = `${pName} Forvet mevkiinden Orta Saha'ya çekildi: Orta saha pas temposu ve pres direnci artarken, ceza sahası içi bitirici tehdit sayısı azaldı. İlerideki tek forvete daha fazla yük binecek.`;
    } else if (oldRole === 'MID' && newRole === 'DEF') {
      commentaryMsg = `${pName} Orta Saha'dan Defans hattına çekildi: Savunma derinliği ve ikili mücadele sertliği yükseldi (Takım DEF: ${slot.team === 'A' ? updatedA.avgDEF : updatedB.avgDEF}), ancak hücuma çıkış temposu yavaşlayabilir.`;
    } else if (oldRole === 'DEF' && newRole === 'MID') {
      commentaryMsg = `${pName} Defans'tan Orta Saha'ya itildi: Orta sahada top kapma ve direnç yükseldi, fakat savunma arkasına atılan kontralarda kademe açığı riski doğdu.`;
    } else if (oldRole === 'MID' && newRole === 'FWD') {
      commentaryMsg = `${pName} Orta Saha'dan Forvet hattına alındı: Hücum bölgesinde çift forvet baskısı kuruldu, rakip stoperlerin rahat oyun kurması engellendi.`;
    } else if (newRole === 'GK') {
      commentaryMsg = `${pName} Kaleye geçti: Saha içi oyuncu sayısı 5'e düşerken, kaleci güvenliği tazelendi.`;
    } else {
      commentaryMsg = `${pName} ${oldRole} rolünden ${newRole} mevkiine geçirildi. Takımın saha içi görev dağılımı güncellendi.`;
    }

    setLiveCommentary({
      title: `⚡ Mevki Hamlesi: ${pName} (${oldRole} ➡️ ${newRole})`,
      message: commentaryMsg,
      icon: '⚡',
      time: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    });
  };

  const handleDownloadPng = async () => {
    if (!pitchRef.current) return;
    try {
      setIsExporting(true);
      setSelectedSlot(null);
      const dataUrl = await toPng(pitchRef.current, {
        cacheBust: true,
        quality: 0.95,
        backgroundColor: '#0a0d0a',
      });
      const link = document.createElement('a');
      link.download = `RevirFC_Kadro_${currentMatch?.title?.replace(/\s+/g, '_') || 'Taktik'}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('PNG export failed:', err);
    } finally {
      setIsExporting(false);
    }
  };

  // Mobile-only compact scaling so 2-2-1 / 2-1-2 rows stay side-by-side on phone screens without altering sm+/tablet/desktop
  const getMobileCardScaleClasses = (rowCount: number) => {
    if (rowCount >= 4) {
      return {
        box: 'w-[66px] h-[88px] sm:w-auto sm:h-auto',
        scaler: 'w-[180px] h-[241px] origin-top-left scale-[0.3667] flex sm:block sm:w-auto sm:h-auto sm:scale-100 sm:transform-none',
      };
    }
    if (rowCount === 3) {
      return {
        box: 'w-[88px] h-[118px] sm:w-auto sm:h-auto',
        scaler: 'w-[180px] h-[241px] origin-top-left scale-[0.4889] flex sm:block sm:w-auto sm:h-auto sm:scale-100 sm:transform-none',
      };
    }
    return {
      box: 'w-[118px] h-[158px] sm:w-auto sm:h-auto',
      scaler: 'w-[180px] h-[241px] origin-top-left scale-[0.6556] flex sm:block sm:w-auto sm:h-auto sm:scale-100 sm:transform-none',
    };
  };

  // Render a player card on the tactical pitch
  const renderPlayerBadge = (
    item: MatchSquad['players'][0],
    teamCode: 'A' | 'B',
    jerseyType: 'yelekli' | 'yeleksiz',
    rowCount = 1
  ) => {
    const slotKey = `${teamCode}:${item.player.id}`;
    const isSelected = selectedSlot?.team === teamCode && selectedSlot?.playerId === item.player.id;
    const isDragOver = dragOverKey === slotKey;
    const mobileScale = getMobileCardScaleClasses(rowCount);

    const livePlayer = players?.find((p) => p.id === item.player.id) || item.player;
    const safePhotoUrl =
      livePlayer.photoUrl && !livePlayer.photoUrl.startsWith('idb:')
        ? livePlayer.photoUrl
        : '/logo.jpg';

    return (
      <div
        key={item.player.id}
        draggable={effectiveCanEdit}
        onDragStart={(e) => {
          if (!effectiveCanEdit) return;
          setDraggedSlot({ team: teamCode, playerId: item.player.id });
          e.dataTransfer.effectAllowed = 'move';
          e.dataTransfer.setData('text/plain', slotKey);
        }}
        onDragOver={(e) => {
          if (!effectiveCanEdit) return;
          e.preventDefault();
          e.dataTransfer.dropEffect = 'move';
          if (dragOverKey !== slotKey) setDragOverKey(slotKey);
        }}
        onDragLeave={() => {
          if (dragOverKey === slotKey) setDragOverKey(null);
        }}
        onDrop={(e) => {
          if (!effectiveCanEdit) return;
          e.preventDefault();
          setDragOverKey(null);
          if (draggedSlot) {
            swapSlots(draggedSlot, { team: teamCode, playerId: item.player.id });
            setDraggedSlot(null);
          }
        }}
        onDragEnd={() => {
          setDraggedSlot(null);
          setDragOverKey(null);
        }}
        onClick={() => {
          if (!effectiveCanEdit) return;
          if (!selectedSlot) {
            setSelectedSlot({ team: teamCode, playerId: item.player.id });
          } else if (selectedSlot.team === teamCode && selectedSlot.playerId === item.player.id) {
            setSelectedSlot(null);
          } else {
            swapSlots(selectedSlot, { team: teamCode, playerId: item.player.id });
            setSelectedSlot(null);
          }
        }}
        className={`relative transition-all select-none ${
          effectiveCanEdit ? 'cursor-pointer hover:scale-105 active:scale-95' : 'cursor-default'
        } ${isSelected ? 'ring-4 ring-amber-400 rounded-xl sm:rounded-2xl shadow-2xl scale-105 z-30' : ''} ${
          isDragOver ? 'ring-4 ring-emerald-400 rounded-xl sm:rounded-2xl scale-110 z-30' : ''
        }`}
      >
        <div
          className={`relative rounded-xl sm:rounded-2xl p-0.5 ${
            jerseyType === 'yelekli'
              ? 'ring-2 ring-emerald-400/65 bg-emerald-500/10'
              : 'ring-2 ring-white/70 bg-white/15'
          }`}
        >
          <div
            className={`absolute -top-2 left-1/2 -translate-x-1/2 z-20 rounded-full px-2 py-0.5 text-[9px] font-black font-mono shadow-md border ${
              jerseyType === 'yelekli'
                ? 'bg-emerald-950/95 border-emerald-400 text-emerald-200'
                : 'bg-white text-neutral-900 border-white'
            }`}
          >
            {item.assignedRole}
          </div>
          <div className={mobileScale.box}>
            <div className={mobileScale.scaler}>
              <FCCard
                player={{
                  ...livePlayer,
                  photoUrl: safePhotoUrl,
                  currentOVR: item.effectiveOVR ?? livePlayer.currentOVR,
                  stats: {
                    pac: item.effectiveStats.pac,
                    sho: item.effectiveStats.sho,
                    pas: item.effectiveStats.pas,
                    dri: item.effectiveStats.dri,
                    def: item.effectiveStats.def,
                    phy: item.effectiveStats.phy,
                  },
                }}
                size="sm"
                interactive={false}
                showDownloadButton={false}
              />
            </div>
          </div>

          {effectiveCanEdit && (
            <div className="absolute -top-1 -right-1 bg-black/80 rounded-full p-1 border border-white/20 text-neutral-300 z-20">
              <Move className="w-2.5 h-2.5" />
            </div>
          )}
        </div>

        {isSelected && effectiveCanEdit && (
          <div
            onClick={(e) => e.stopPropagation()}
            className="absolute top-full left-1/2 -translate-x-1/2 mt-1.5 z-40 bg-neutral-900 border border-amber-400/80 rounded-xl p-1.5 shadow-2xl flex items-center gap-1 backdrop-blur-md"
          >
            {(['DEF', 'MID', 'FWD', 'GK'] as PreferredPosition[]).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => changeSlotRole({ team: teamCode, playerId: item.player.id }, r)}
                className={`px-2 py-1 rounded-lg text-[10px] font-black border cursor-pointer ${
                  item.assignedRole === r
                    ? 'bg-amber-400 text-black border-amber-400'
                    : 'bg-neutral-800 text-neutral-200 border-neutral-700 hover:bg-neutral-700'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderFormationRow = (
    rowPlayers: MatchSquad['players'],
    teamCode: 'A' | 'B',
    jerseyType: 'yelekli' | 'yeleksiz',
    rowType: 'gk' | 'def' | 'mid' | 'fwd'
  ) => {
    const wrapClass = rowPlayers.length >= 5 ? 'flex-wrap' : 'flex-nowrap sm:flex-wrap';
    const layoutClass =
      rowType === 'gk'
        ? 'justify-center gap-2 sm:gap-4'
        : rowType === 'def'
        ? 'justify-around gap-1.5 sm:gap-6 px-1 sm:px-8 md:px-14'
        : 'justify-around gap-1.5 sm:gap-6 px-1 sm:px-10 md:px-16';

    return (
      <div className={`flex ${wrapClass} ${layoutClass}`}>
        {rowPlayers.map((p) => renderPlayerBadge(p, teamCode, jerseyType, rowPlayers.length))}
      </div>
    );
  };

  const yelekliRoles = {
    gk: yelekliSquad.players.filter((p) => p.assignedRole === 'GK'),
    def: yelekliSquad.players.filter((p) => p.assignedRole === 'DEF'),
    mid: yelekliSquad.players.filter((p) => p.assignedRole === 'MID'),
    fwd: yelekliSquad.players.filter((p) => p.assignedRole === 'FWD'),
  };

  const yeleksizRoles = {
    fwd: yeleksizSquad.players.filter((p) => p.assignedRole === 'FWD'),
    mid: yeleksizSquad.players.filter((p) => p.assignedRole === 'MID'),
    def: yeleksizSquad.players.filter((p) => p.assignedRole === 'DEF'),
    gk: yeleksizSquad.players.filter((p) => p.assignedRole === 'GK'),
  };

  const orderedPastMatches = [...pastMatches]
    .map((m, idx) => ({ match: m, weekNumber: idx + 1 }))
    .sort((a, b) => {
      const diff = new Date(b.match.date).getTime() - new Date(a.match.date).getTime();
      return Number.isFinite(diff) && diff !== 0 ? diff : b.weekNumber - a.weekNumber;
    });
  const showActivePill = Boolean(activeMatch && !pastMatches.some((pm) => pm.id === activeMatch.id));

  return (
    <div className="space-y-5">
      {/* ================= 1. WEEK / MATCH SELECTOR TABS (Yeniden Eskiye) ================= */}
      {(pastMatches.length > 0 || showActivePill) && (
        <div className="bg-neutral-900/90 border border-neutral-800 rounded-3xl p-3 shadow-xl overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-2 min-w-max">
            <span className="text-xs font-black text-amber-400 uppercase tracking-wider pl-2 pr-1 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" /> Fikstür:
            </span>

            {showActivePill && activeMatch && (
              <button
                type="button"
                disabled={!hasActiveBalancedTeams}
                onClick={() => handleWeekSwitch(activeMatch.id)}
                title={
                  hasActiveBalancedTeams
                    ? 'Aktif hafta taktik tahtasını görüntüle'
                    : 'İlk 12 dolup 462 dengeleme çalıştırıldığında aktif olur'
                }
                className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
                  !hasActiveBalancedTeams
                    ? 'bg-neutral-950/60 border border-neutral-800 text-neutral-500 cursor-not-allowed opacity-70'
                    : currentMatchId === activeMatch.id
                    ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/25 ring-2 ring-emerald-400 cursor-pointer'
                    : 'bg-emerald-950/50 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-900/50 cursor-pointer'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>
                  {pastMatches.length + 1}. Hafta (
                  {activeMatch.awards?.isConfirmedByCommittee ? 'Mühürlü' : 'Planlama'})
                </span>
                <span
                  className={`text-[10px] ${
                    currentMatchId === activeMatch.id && hasActiveBalancedTeams
                      ? 'text-black/80'
                      : 'text-emerald-300/75'
                  }`}
                >
                  (
                  {new Date(activeMatch.date).toLocaleDateString('tr-TR', {
                    day: 'numeric',
                    month: 'short',
                  })}
                  )
                </span>
              </button>
            )}

            {orderedPastMatches.map(({ match: m, weekNumber }) => {
              const isActive = currentMatchId === m.id;
              const dateStr = new Date(m.date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
              const winnerDot = (() => {
                if (!m.awards?.winnerTeam) return null;
                if (m.awards.winnerTeam === 'draw') return '🤝';
                const rA = m.teamA?.players?.length
                  ? Math.min(...m.teamA.players.map((x) => resolvePlayerRank(x.player)))
                  : Number.MAX_SAFE_INTEGER;
                const rB = m.teamB?.players?.length
                  ? Math.min(...m.teamB.players.map((x) => resolvePlayerRank(x.player)))
                  : Number.MAX_SAFE_INTEGER;
                const yeleksizWon =
                  (m.awards.winnerTeam === 'A' && rA <= rB) ||
                  (m.awards.winnerTeam === 'B' && rB < rA);
                return yeleksizWon ? '⚪' : '🟢';
              })();
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => handleWeekSwitch(m.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    isActive
                      ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/25 ring-2 ring-amber-400 font-black'
                      : 'bg-neutral-950/80 border border-neutral-800 text-neutral-300 hover:text-white hover:border-neutral-700'
                  }`}
                >
                  <span>{weekNumber}. Hafta</span>
                  <span className={`text-[10px] ${isActive ? 'text-black/80' : 'text-neutral-400'}`}>({dateStr})</span>
                  {winnerDot && <span className="text-[10px]">{winnerDot}</span>}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ================= 2. TOP MATCH BANNER & STATUS BADGES ================= */}
      <div className="bg-gradient-to-br from-neutral-900 via-neutral-900 to-amber-950/30 border border-neutral-800 rounded-3xl p-4 sm:p-6 shadow-2xl relative overflow-hidden space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="space-y-1.5 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              {isSealedMatch ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-rose-500/15 text-rose-300 border border-rose-500/35">
                  <Lock className="w-3 h-3" /> Mühürlü Geçmiş Karşılaşma
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/15 text-emerald-300 border border-emerald-500/35">
                  <Sparkles className="w-3 h-3" /> Aktif Planlama
                </span>
              )}

              {isPastWhatsAppMatch && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                  📱 WhatsApp Manuel Kadrosu
                </span>
              )}

              {currentMatch?.awards?.winnerTeam && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-yellow-500/20 text-yellow-300 border border-yellow-500/40">
                  <Trophy className="w-3 h-3" />
                  Kazanan: {currentMatch.awards.winnerTeam === 'A' ? teamAYelekName : teamBYelekName}
                </span>
              )}
            </div>

            <h3 className="text-lg sm:text-2xl font-black text-white tracking-tight leading-snug">
              {currentMatch?.title || directTitle || 'Taktik Tahtası'}
            </h3>
            <p className="text-xs text-neutral-300">
              📅 {currentMatch?.date ? new Date(currentMatch.date).toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long' }) : directDate} • 📍 {currentMatch?.pitchName || 'Aksaz Halısaha'}
            </p>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
            <button
              type="button"
              onClick={handleDownloadPng}
              disabled={isExporting}
              className="bg-neutral-800 hover:bg-neutral-700 text-white font-bold text-xs px-3.5 py-2 rounded-xl border border-neutral-700 flex items-center gap-1.5 transition-transform active:scale-95 cursor-pointer disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5 text-amber-400" />
              <span>{isExporting ? 'Görsel Hazırlanıyor...' : 'PNG İndir'}</span>
            </button>
          </div>
        </div>

        {/* ================= TOGGLE: MANUEL OYNANAN vs ALGORİTMA SEÇİMİ ================= */}
        {hasAlternative && (
          <div className="pt-3 border-t border-white/10 flex flex-wrap items-center justify-between gap-3">
            {!isPastWhatsAppMatch && !effectiveCanEdit ? (
              <div className="inline-flex items-center gap-2 bg-black/60 px-3.5 py-2 rounded-2xl border border-neutral-800 text-xs font-black text-amber-300">
                <Lock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>
                  Kurul Seçimi: {isAlt ? '🥈 2. Alternatif Kadro' : '🥇 1. En Dengeli Kadro'}
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/20 border border-amber-500/30">
                  %{displayFairness}
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2 bg-black/60 p-1 rounded-2xl border border-neutral-800">
                <button
                  type="button"
                  onClick={() => handleOptionSwitch(1)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                    activeOption === 1
                      ? 'bg-gradient-to-r from-amber-500 to-yellow-400 text-black shadow-md'
                      : 'text-neutral-300 hover:text-white'
                  }`}
                >
                  <span>{isPastWhatsAppMatch ? '📱 WhatsApp Manuel (Oynanan)' : '🥇 1. En Dengeli Kadro'}</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-black/20">
                    %{primaryFairness}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => handleOptionSwitch(2)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                    activeOption === 2
                      ? 'bg-gradient-to-r from-sky-500 to-blue-400 text-black shadow-md'
                      : 'text-neutral-300 hover:text-white'
                  }`}
                >
                  <span>{isPastWhatsAppMatch ? '🤖 Algoritma Ne Seçerdi? (462)' : '🥈 2. Alternatif Kadro'}</span>
                  {secondaryFairness !== undefined && (
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-black/20">
                      %{secondaryFairness}
                    </span>
                  )}
                </button>
              </div>
            )}

            <div className="text-[11px] text-neutral-400">
              {isPastWhatsAppMatch ? (
                isAlt ? (
                  <span className="text-sky-300 font-bold">🤖 462 Kombinasyon Simülasyonu gösteriliyor</span>
                ) : (
                  <span className="text-amber-300 font-bold">📱 WhatsApp üzerinden kararlaştırılan orijinal maç kadrosu</span>
                )
              ) : isAlt ? (
                <span className="text-sky-300 font-bold">🥈 2. Alternatif Kadro gösteriliyor (%{displayFairness})</span>
              ) : (
                <span className="text-amber-300 font-bold">🥇 1. En Dengeli Kadro gösteriliyor (%{displayFairness})</span>
              )}
            </div>
          </div>
        )}

        {/* Lock note for non-admins on sealed matches */}
        {isSealedMatch && !effectiveCanEdit && (
          <div className="bg-neutral-950/80 border border-neutral-800 rounded-xl p-2.5 text-xs text-neutral-400 flex items-center gap-2">
            <Lock className="w-4 h-4 text-amber-400 shrink-0" />
            <span>Bu maç oynanmış ve mühürlenmiştir. Kadro ve saha yerleşimi yalnızca Kurul Yöneticisi tarafından güncellenebilir.</span>
          </div>
        )}
      </div>

      {/* ================= 3. MANUAL EVALUATION & CRITIQUE CARD (FOR PAST 8 MATCHES) ================= */}
      {isPastWhatsAppMatch && currentMatch?.manualEvaluation && (
        <div className="bg-neutral-900/95 border border-amber-500/30 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
            <div className="flex items-center gap-2">
              <span className="text-xl">📋</span>
              <h4 className="text-sm sm:text-base font-black text-amber-300">
                {currentMatch.manualEvaluation.critiqueTitle}
              </h4>
            </div>
            <span className="text-[10px] font-black uppercase px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30">
              Kurul Maç Analizi
            </span>
          </div>

          <div className="p-3 bg-sky-500/10 border border-sky-500/25 rounded-2xl text-xs text-sky-200 flex items-start gap-2.5">
            <Info className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              Bu geçmiş maç WhatsApp grubu üzerinden manuel olarak belirlenmiştir. <strong>9. maç ve sonrası doğrudan Revir FC 462 algoritması ile oluşturulacaktır.</strong>
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="bg-neutral-950/80 border border-neutral-800 rounded-2xl p-3.5 space-y-1.5">
              <span className="text-xs font-black text-emerald-400 flex items-center gap-1.5">
                🛡️ Savunma (DEF) Ortalamaları
              </span>
              <p className="text-[11px] text-neutral-300 leading-relaxed">
                {currentMatch.manualEvaluation.defSummary}
              </p>
            </div>

            <div className="bg-neutral-950/80 border border-neutral-800 rounded-2xl p-3.5 space-y-1.5">
              <span className="text-xs font-black text-amber-400 flex items-center gap-1.5">
                👥 Mevki &amp; Rol Dağılımı (GK/DEF/MID/FWD)
              </span>
              <p className="text-[11px] text-neutral-300 leading-relaxed">
                {currentMatch.manualEvaluation.roleDistributionSummary}
              </p>
            </div>

            <div className="bg-neutral-950/80 border border-neutral-800 rounded-2xl p-3.5 space-y-1.5">
              <span className="text-xs font-black text-rose-400 flex items-center gap-1.5">
                🩺 Anlık Form &amp; Sakatlık Çarpanları
              </span>
              <p className="text-[11px] text-neutral-300 leading-relaxed">
                {currentMatch.manualEvaluation.injuryFormSummary}
              </p>
            </div>
          </div>

          {currentMatch.manualEvaluation.bullets.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-white/5">
              <span className="text-xs font-bold text-neutral-300 block">Kadro Dengeleme ve Maç Sonucu Notları:</span>
              <ul className="space-y-1.5">
                {currentMatch.manualEvaluation.bullets.map((b, idx) => (
                  <li key={idx} className="text-xs text-neutral-300 flex items-start gap-2 bg-neutral-950/50 p-2.5 rounded-xl border border-white/5">
                    <span className="text-amber-400 font-bold shrink-0">•</span>
                    <span className="leading-relaxed">{b}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* ================= 4. THE TACTICAL PITCH ================= */}
      <div
        ref={pitchRef}
        className="relative bg-gradient-to-b from-[#0e2413] via-[#091a0d] to-[#040e06] p-1.5 sm:p-5 rounded-3xl border border-emerald-900/50 shadow-2xl overflow-hidden"
      >
        {/* Teams Header Bar on Field */}
        <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2 sm:mb-3">
          {/* Yelekli (Green Header) */}
          <div className="bg-emerald-950/90 border border-emerald-500/45 rounded-xl px-3 py-1.5 flex items-center justify-between gap-2 shadow-lg">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-3 h-3 rounded-full bg-emerald-400 shrink-0" />
              <span className="font-black text-emerald-300 text-xs sm:text-sm truncate">Yelekli</span>
              <span className="text-[10px] font-mono text-amber-300 font-bold shrink-0">OVR {yelekliSquad.totalOVR}</span>
              <span className="text-[10px] font-mono text-emerald-200 font-bold shrink-0">DEF {yelekliAvgDef}</span>
              <span className="text-[10px] font-mono text-neutral-300 shrink-0">HIZ {yelekliSquad.avgPAC}</span>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {effectiveCanEdit ? (
                (['2-2-1', '2-1-2'] as TacticalFormation[]).map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleFormationChange(yelekliSlotTeam, f);
                    }}
                    className={`px-2 py-0.5 rounded-lg text-[10px] font-mono font-black border cursor-pointer ${
                      yelekliFormation === f
                        ? 'bg-emerald-400 text-black border-emerald-300 shadow-sm'
                        : 'bg-black/45 text-neutral-300 border-white/15 hover:text-white'
                    }`}
                  >
                    {f}
                  </button>
                ))
              ) : (
                <span className="px-2 py-0.5 rounded-lg text-[10px] font-mono font-black bg-emerald-400/20 text-emerald-200 border border-emerald-400/35">
                  {yelekliFormation}
                </span>
              )}
            </div>
          </div>

          {/* Yeleksiz (White-Toned Header) */}
          <div className="bg-white/15 border border-white/60 rounded-xl px-3 py-1.5 flex items-center justify-between gap-2 shadow-lg backdrop-blur-sm">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-3 h-3 rounded-full bg-white shrink-0 ring-2 ring-white/40" />
              <span className="font-black text-white text-xs sm:text-sm truncate">Yeleksiz</span>
              <span className="text-[10px] font-mono text-amber-200 font-bold shrink-0">OVR {yeleksizSquad.totalOVR}</span>
              <span className="text-[10px] font-mono text-white font-bold shrink-0">DEF {yeleksizAvgDef}</span>
              <span className="text-[10px] font-mono text-neutral-100 shrink-0">HIZ {yeleksizSquad.avgPAC}</span>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {effectiveCanEdit ? (
                (['2-2-1', '2-1-2'] as TacticalFormation[]).map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleFormationChange(yeleksizSlotTeam, f);
                    }}
                    className={`px-2 py-0.5 rounded-lg text-[10px] font-mono font-black border cursor-pointer ${
                      yeleksizFormation === f
                        ? 'bg-white text-black border-white shadow-sm'
                        : 'bg-black/45 text-neutral-200 border-white/25 hover:text-white'
                    }`}
                  >
                    {f}
                  </button>
                ))
              ) : (
                <span className="px-2 py-0.5 rounded-lg text-[10px] font-mono font-black bg-white/25 text-white border border-white/40">
                  {yeleksizFormation}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Tactical Pitch Lines & Field */}
        <div className="relative border-2 border-white/35 rounded-xl min-h-[1400px] sm:min-h-[1200px] md:min-h-[1380px] p-1 sm:p-3 flex flex-col justify-between overflow-hidden bg-neutral-950/35">
          {/* Top Half Green Background Overlay (Yelekli) */}
          <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-emerald-600/35 via-emerald-800/30 to-emerald-950/20 border-b border-white/30 pointer-events-none" />
          {/* Bottom Half White-Toned Background Overlay (Yeleksiz) */}
          <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-b from-white/[0.10] via-slate-100/[0.18] to-white/[0.26] pointer-events-none" />

          {/* Center Line and Circle */}
          <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-white/40 -translate-y-1/2 z-[1]" />
          <div className="absolute top-1/2 left-1/2 w-20 h-20 sm:w-28 sm:h-28 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white/35 flex items-center justify-center overflow-hidden z-[1]">
            <img
              src="/logo.jpg"
              alt="Revir FC"
              className="w-14 h-14 sm:w-20 sm:h-20 rounded-full object-cover opacity-20 pointer-events-none select-none mix-blend-screen"
            />
          </div>
          <div className="absolute top-1/2 left-1/2 w-2 h-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/60 pointer-events-none z-[1]" />

          {/* Top Penalty Area */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-40 sm:w-52 h-12 sm:h-16 border-b-2 border-x-2 border-emerald-200/40 rounded-b-lg z-[1]" />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-20 sm:w-28 h-5 sm:h-7 border-b-2 border-x-2 border-emerald-200/25 z-[1]" />

          {/* Bottom Penalty Area */}
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-40 sm:w-52 h-12 sm:h-16 border-t-2 border-x-2 border-white/45 rounded-t-lg z-[1]" />
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-20 sm:w-28 h-5 sm:h-7 border-t-2 border-x-2 border-white/30 z-[1]" />

          {/* ================= YELEKLİ - TOP HALF (GREEN) ================= */}
          <div className="relative z-10 min-h-[700px] sm:min-h-[585px] md:min-h-[675px] flex flex-col justify-evenly gap-2.5 sm:gap-1.5 pt-8 pb-3 sm:py-1.5 sm:pb-3">
            <div className="absolute top-1.5 left-1.5 sm:top-2 sm:left-2.5 z-20 pointer-events-none">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-950/85 border border-emerald-400/50 text-[10px] font-black text-emerald-300 shadow">
                🟢 YELEKLİ YARI SAHASI
              </span>
            </div>

            {renderFormationRow(yelekliRoles.gk, yelekliSlotTeam, 'yelekli', 'gk')}
            {renderFormationRow(yelekliRoles.def, yelekliSlotTeam, 'yelekli', 'def')}
            {renderFormationRow(yelekliRoles.mid, yelekliSlotTeam, 'yelekli', 'mid')}
            {renderFormationRow(yelekliRoles.fwd, yelekliSlotTeam, 'yelekli', 'fwd')}
          </div>

          {/* ================= YELEKSİZ - BOTTOM HALF (WHITE TONE) ================= */}
          <div className="relative z-10 min-h-[700px] sm:min-h-[585px] md:min-h-[675px] flex flex-col justify-evenly gap-2.5 sm:gap-1.5 pt-3 pb-8 sm:pt-3 sm:py-1.5">
            <div className="absolute bottom-1.5 left-1.5 sm:bottom-2 sm:left-2.5 z-20 pointer-events-none">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/85 border border-white text-[10px] font-black text-neutral-900 shadow">
                ⚪ YELEKSİZ YARI SAHASI
              </span>
            </div>

            {renderFormationRow(yeleksizRoles.fwd, yeleksizSlotTeam, 'yeleksiz', 'fwd')}
            {renderFormationRow(yeleksizRoles.mid, yeleksizSlotTeam, 'yeleksiz', 'mid')}
            {renderFormationRow(yeleksizRoles.def, yeleksizSlotTeam, 'yeleksiz', 'def')}
            {renderFormationRow(yeleksizRoles.gk, yeleksizSlotTeam, 'yeleksiz', 'gk')}
          </div>
        </div>

        {/* Footer info inside image */}
        <div className="relative z-10 mt-2 pt-1.5 border-t border-white/10 flex items-center justify-between text-[10px] sm:text-[11px] text-white/60">
          <span>RevirFC Dijital Halı Saha Ekosistemi ({yelekliFormation} vs {yeleksizFormation})</span>
          <span>{isPastWhatsAppMatch && !isAlt ? 'WhatsApp Manuel Kadro' : 'C(11,5) = 462 Kadro Optimizasyonu'}</span>
        </div>
      </div>

      {/* ================= 5. LIVE REAL-TIME TACTICAL COMMENTARY BOX ================= */}
      {liveCommentary && (
        <div className="bg-gradient-to-r from-amber-950/70 via-neutral-900 to-neutral-950 border border-amber-500/50 rounded-2xl p-4 shadow-xl space-y-1.5 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="flex h-2.5 w-2.5 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
              </span>
              <span className="text-xs font-black text-amber-300 uppercase tracking-wide">
                Canlı Saha &amp; Taktik Direktörü Yorumu
              </span>
            </div>
            <span className="text-[10px] font-mono text-neutral-400">{liveCommentary.time}</span>
          </div>
          <div className="text-xs font-bold text-white flex items-center gap-1.5 pt-0.5">
            <span>{liveCommentary.icon}</span>
            <span>{liveCommentary.title}</span>
          </div>
          <p className="text-xs text-neutral-200 leading-relaxed">
            {liveCommentary.message}
          </p>
        </div>
      )}

      {/* ================= 6. ALGORITHM SUMMARY & MULTI-METRIC EXPLANATION ================= */}
      <div className="bg-neutral-900/90 border border-neutral-800 rounded-2xl p-4 sm:p-5 text-xs text-neutral-300 space-y-3 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h4 className="text-sm font-black text-amber-400 flex items-center gap-2">
            🧠 🥇 1. En Dengeli &amp; 🥈 2. Alternatif Kadrolar Nasıl Belirleniyor?
          </h4>
          <span className="text-[10px] font-mono text-emerald-300 bg-emerald-500/10 border border-emerald-500/25 px-2.5 py-0.5 rounded-full">
            462 Kombinasyon • Çok Kriterli Denge
          </span>
        </div>

        <p className="text-[11px] sm:text-xs text-neutral-400 leading-relaxed">
          Algoritma, ilk 12 asil oyuncunun oluşturabileceği tüm <strong className="text-neutral-200">C(11,5) = 462 farklı 6v6 maç eşleşmesini</strong> tek tek hesaplar. Puanlama yalnızca toplam OVR&apos;a göre değil; takımların <strong className="text-neutral-200">Hız/Kondisyon (PAC)</strong>, <strong className="text-neutral-200">Savunma (DEF)</strong> ortalamaları, <strong className="text-neutral-200">kaleci &amp; mevki (GK/DEF/MID/FWD) dağılımı</strong> ve oyuncuların ankette işaretlediği <strong className="text-neutral-200">anlık form/sakatlık çarpanları</strong> birlikte değerlendirilerek yapılır.
        </p>

        {/* Detailed Metrics Comparison */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
          <div className="bg-neutral-950/80 border border-amber-500/30 rounded-xl p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-amber-300">
                {isPastWhatsAppMatch && !isAlt ? '📱 WhatsApp Manuel Kadrosu' : '🥇 1. En Dengeli Kadro'}
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30">
                %{primaryFairness} Denge
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center text-[10px] font-mono">
              <div className="bg-neutral-900 p-1.5 rounded-lg border border-neutral-800">
                <span className="text-neutral-400 block">OVR (Yelekli / Yeleksiz)</span>
                <span className="font-bold text-white">{yelekliSquad.totalOVR} vs {yeleksizSquad.totalOVR}</span>
              </div>
              <div className="bg-neutral-900 p-1.5 rounded-lg border border-neutral-800">
                <span className="text-neutral-400 block">DEF</span>
                <span className="font-bold text-emerald-300">{yelekliAvgDef} vs {yeleksizAvgDef}</span>
              </div>
              <div className="bg-neutral-900 p-1.5 rounded-lg border border-neutral-800">
                <span className="text-neutral-400 block">HIZ</span>
                <span className="font-bold text-sky-300">{yelekliSquad.avgPAC} vs {yeleksizSquad.avgPAC}</span>
              </div>
            </div>
            <div className="text-[10px] text-neutral-400">
              Mevki Dağılımı (Yelekli / Yeleksiz): <strong>GK: {yelekliRoles.gk.length}/{yeleksizRoles.gk.length} • DEF: {yelekliRoles.def.length}/{yeleksizRoles.def.length} • MID: {yelekliRoles.mid.length}/{yeleksizRoles.mid.length} • FWD: {yelekliRoles.fwd.length}/{yeleksizRoles.fwd.length}</strong>
            </div>
          </div>

          <div className="bg-neutral-950/80 border border-sky-500/30 rounded-xl p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-sky-300">
                {isPastWhatsAppMatch ? '🤖 462 Algoritması Ne Seçerdi?' : '🥈 2. Alternatif Kadro'}
              </span>
              {hasAlternative && secondaryFairness !== undefined && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-500/15 text-sky-300 border border-sky-500/30">
                  %{secondaryFairness} Denge
                </span>
              )}
            </div>
            <p className="text-[11px] text-neutral-400 leading-relaxed">
              {isPastWhatsAppMatch
                ? '462 kombinasyon simülasyonu çalıştırıldığında iki takımın DEF ve mevki dağılımını çok daha dengeli kurarak sürpriz farkların önüne geçebilecek alternatif dizilim.'
                : '1. kadrodaki eşleşmeden bilerek farklılaştırılmış ama yüksek denge puanını koruyan ikinci ideal seçenek. Saha içi arkadaş kimyası veya farklı oyun tarzı istendiğinde alternatif sunar.'}
            </p>
          </div>
        </div>

        {/* Human Tactical Commentary */}
        {humanCommentary.length > 0 && (
          <div className="mt-3 pt-3 border-t border-neutral-800/90 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h5 className="text-xs font-black text-emerald-300 flex items-center gap-1.5">
                🎙️ Kadro İçi Taktik ve Oyuncu Analizleri
              </h5>
              <span className="text-[10px] text-neutral-400 font-mono">
                {isAlt ? '🥈 Algoritma Simülasyonu İnceleniyor' : '🥇 Mevcut Kadro İnceleniyor'}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {humanCommentary.map((item, idx) => (
                <div
                  key={idx}
                  className="bg-neutral-950/75 border border-neutral-800/90 rounded-xl p-2.5 space-y-1"
                >
                  <div className="text-[11px] font-black text-amber-300 flex items-center gap-1.5">
                    <span>{item.icon}</span>
                    <span>{item.title}</span>
                  </div>
                  <p className="text-[11px] text-neutral-300 leading-relaxed">{item.text}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
