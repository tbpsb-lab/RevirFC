import {
  Player,
  CheckInEntry,
  MatchSquad,
  PlayerStats,
  PreferredPosition,
  TacticalFormation,
  getPlayerSeniorityRank,
} from '../types';

export interface CalculatedPlayer {
  player: Player;
  effectiveStats: PlayerStats;
  effectiveOVR: number;
  assignedRole: PreferredPosition;
}

export function computeEffectivePlayer(player: Player, checkIn?: CheckInEntry): { effectiveStats: PlayerStats; effectiveOVR: number } {
  const status = checkIn?.status || 'full';
  const base = { ...player.stats };
  let ovr = player.currentOVR;

  if (status === 'light_injury') {
    // Hafif Sakatlık / Kas Çekmesi: Kondisyon (PAC) -%25, genel güç -%10
    base.pac = Math.round(base.pac * 0.75);
    base.phy = Math.round(base.phy * 0.85);
    ovr = Math.round(ovr * 0.90);
  } else if (status === 'tired') {
    // Yorgun / Uykusuz / Nöbet: Kondisyon (PAC) -%15
    base.pac = Math.round(base.pac * 0.85);
    ovr = Math.max(50, ovr - 2);
  } else if (status === 'extra_fit') {
    // Ekstra Formda / İdmanlı: Kondisyon (PAC) +%5
    base.pac = Math.min(99, Math.round(base.pac * 1.05));
    ovr = Math.min(99, ovr + 1);
  }

  return {
    effectiveStats: base,
    effectiveOVR: ovr,
  };
}

// Generate C(11, 5) = 462 combinations
function getCombinations<T>(array: T[], size: number): T[][] {
  const result: T[][] = [];

  function helper(startIndex: number, current: T[]) {
    if (current.length === size) {
      result.push([...current]);
      return;
    }
    for (let i = startIndex; i < array.length; i++) {
      current.push(array[i]);
      helper(i + 1, current);
      current.pop();
    }
  }

  helper(0, []);
  return result;
}

function getRoleAffinityScore(
  item: { player: Player; effectiveStats: PlayerStats; effectiveOVR: number },
  role: PreferredPosition
): number {
  const isPrimary = item.player.position === role;
  const isSecondary = !isPrimary && Boolean(item.player.secondaryPositions?.includes(role));
  const positionBonus = isPrimary ? 500 : isSecondary ? 240 : 0;
  const gkOutfieldPenalty =
    !isPrimary && !isSecondary && item.player.position === 'GK' && role !== 'GK' ? -80 : 0;

  let statScore = 0;
  if (role === 'GK') {
    statScore =
      item.effectiveStats.def * 0.55 +
      item.effectiveStats.phy * 0.35 +
      (100 - item.effectiveStats.pac) * 0.1;
  } else if (role === 'DEF') {
    statScore = item.effectiveStats.def * 0.75 + item.effectiveStats.phy * 0.25;
  } else if (role === 'MID') {
    statScore =
      item.effectiveStats.pas * 0.65 +
      item.effectiveStats.dri * 0.25 +
      item.effectiveStats.def * 0.1;
  } else {
    statScore =
      item.effectiveStats.sho * 0.7 +
      item.effectiveStats.pac * 0.25 +
      item.effectiveStats.dri * 0.05;
  }

  return positionBonus + gkOutfieldPenalty + statScore;
}

function getFormationSlots(formation: TacticalFormation): PreferredPosition[] {
  return formation === '2-1-2'
    ? ['GK', 'DEF', 'DEF', 'MID', 'FWD', 'FWD']
    : ['GK', 'DEF', 'DEF', 'MID', 'MID', 'FWD'];
}

function scoreFormationAssignment(
  players: { player: Player; effectiveStats: PlayerStats; effectiveOVR: number }[],
  formation: TacticalFormation
): { players: CalculatedPlayer[]; fitScore: number } {
  const slots = getFormationSlots(formation);

  // 6 oyunculuk kadroda tüm permütasyonları (6! = 720) tarayarak
  // ana mevki (+500) ve ek mevki (+240) uyumunu en üst düzeye çıkaran dağılımı bul
  if (players.length === slots.length) {
    const scoreMatrix = players.map((p) => ({
      GK: getRoleAffinityScore(p, 'GK'),
      DEF: getRoleAffinityScore(p, 'DEF'),
      MID: getRoleAffinityScore(p, 'MID'),
      FWD: getRoleAffinityScore(p, 'FWD'),
    }));

    const used = new Array<boolean>(players.length).fill(false);
    const currentAssign = new Array<number>(slots.length).fill(-1);
    let bestScore = -Infinity;
    let bestAssign: number[] = [];

    const search = (slotIdx: number, accScore: number) => {
      if (slotIdx === slots.length) {
        if (accScore > bestScore) {
          bestScore = accScore;
          bestAssign = [...currentAssign];
        }
        return;
      }

      const role = slots[slotIdx];
      for (let i = 0; i < players.length; i++) {
        if (used[i]) continue;
        used[i] = true;
        currentAssign[slotIdx] = i;
        search(slotIdx + 1, accScore + scoreMatrix[i][role]);
        used[i] = false;
      }
    };

    search(0, 0);

    const assigned: CalculatedPlayer[] = bestAssign.map((playerIdx, slotIdx) => ({
      ...players[playerIdx],
      assignedRole: slots[slotIdx],
    }));

    return { players: assigned, fitScore: bestScore };
  }

  // Fallback for non-6 squad lengths
  const remaining = [...players];
  const assigned: CalculatedPlayer[] = [];
  for (const role of slots) {
    if (remaining.length === 0) break;
    remaining.sort((a, b) => getRoleAffinityScore(b, role) - getRoleAffinityScore(a, role));
    const chosen = remaining.shift()!;
    assigned.push({ ...chosen, assignedRole: role });
  }
  const fitScore = assigned.reduce((sum, item) => sum + getRoleAffinityScore(item, item.assignedRole), 0);
  return { players: assigned, fitScore };
}

// Assign 6 tactical roles on the Halı Saha pitch: supports both 2-2-1 (1 GK, 2 DEF, 2 MID, 1 FWD) and 2-1-2 (1 GK, 2 DEF, 1 MID, 2 FWD)
export function assignSquadRoles(
  players: { player: Player; effectiveStats: PlayerStats; effectiveOVR: number }[],
  preferredFormation?: TacticalFormation
): { players: CalculatedPlayer[]; formation: TacticalFormation } {
  if (preferredFormation) {
    const res = scoreFormationAssignment(players, preferredFormation);
    return { players: res.players, formation: preferredFormation };
  }

  const f221 = scoreFormationAssignment(players, '2-2-1');
  const f212 = scoreFormationAssignment(players, '2-1-2');

  if (f212.fitScore > f221.fitScore) {
    return { players: f212.players, formation: '2-1-2' };
  }
  return { players: f221.players, formation: '2-2-1' };
}

export function recomputeSquadTotals(squad: MatchSquad): MatchSquad {
  const count = squad.players.length || 1;
  const totalOVR = Math.round(squad.players.reduce((sum, p) => sum + p.effectiveOVR, 0) / count);
  const avgPAC = Math.round(squad.players.reduce((sum, p) => sum + p.effectiveStats.pac, 0) / count);
  const avgDEF = Math.round(squad.players.reduce((sum, p) => sum + p.effectiveStats.def, 0) / count);
  const fwdCount = squad.players.filter((p) => p.assignedRole === 'FWD').length;
  const midCount = squad.players.filter((p) => p.assignedRole === 'MID').length;
  const derivedFormation: TacticalFormation =
    fwdCount === 2 && midCount === 1
      ? '2-1-2'
      : fwdCount === 1 && midCount === 2
      ? '2-2-1'
      : (squad.formation || '2-2-1');

  return {
    ...squad,
    formation: derivedFormation,
    totalOVR,
    avgPAC,
    avgDEF,
  };
}

export function applyFormationToSquad(
  squad: MatchSquad,
  formation: TacticalFormation,
  checkIns?: Record<string, CheckInEntry>,
  livePlayers?: Player[]
): MatchSquad {
  const liveMap = livePlayers ? new Map(livePlayers.map((p) => [p.id, p])) : null;
  const inputs = squad.players.map((item) => {
    const resolvedPlayer = liveMap?.get(item.player.id) || item.player;
    if (checkIns || liveMap) {
      const eff = computeEffectivePlayer(resolvedPlayer, checkIns?.[resolvedPlayer.id]);
      return { player: resolvedPlayer, ...eff };
    }
    return {
      player: resolvedPlayer,
      effectiveStats: item.effectiveStats,
      effectiveOVR: item.effectiveOVR,
    };
  });

  const { players: assignedPlayers } = assignSquadRoles(inputs, formation);
  return recomputeSquadTotals({
    ...squad,
    formation,
    players: assignedPlayers,
  });
}

export interface TacticalCommentaryPoint {
  icon: string;
  title: string;
  text: string;
}

type ScoredMember = {
  player: Player;
  effectiveStats: PlayerStats;
  effectiveOVR: number;
  checkIn?: CheckInEntry;
};

function countPositionWeight(team: ScoredMember[], pos: PreferredPosition): number {
  return team.reduce((sum, x) => {
    if (x.player.position === pos) return sum + 1;
    if (x.player.secondaryPositions?.includes(pos)) return sum + 0.5;
    return sum;
  }, 0);
}

function computeMatchupPenalty(
  teamA: ScoredMember[],
  teamB: ScoredMember[],
  checkIns?: Record<string, CheckInEntry>
): { penalty: number; diffOVR: number; fairnessRating: number } {
  const lenA = teamA.length || 1;
  const lenB = teamB.length || 1;
  const ovrA = teamA.reduce((sum, p) => sum + p.effectiveOVR, 0) / lenA;
  const ovrB = teamB.reduce((sum, p) => sum + p.effectiveOVR, 0) / lenB;
  const diffOVR = Math.abs(ovrA - ovrB);

  const pacA = teamA.reduce((sum, p) => sum + p.effectiveStats.pac, 0) / lenA;
  const pacB = teamB.reduce((sum, p) => sum + p.effectiveStats.pac, 0) / lenB;
  const diffPAC = Math.abs(pacA - pacB);

  const defA = teamA.reduce((sum, p) => sum + p.effectiveStats.def, 0) / lenA;
  const defB = teamB.reduce((sum, p) => sum + p.effectiveStats.def, 0) / lenB;
  const diffDEF = Math.abs(defA - defB);

  const gkImbalance = Math.abs(countPositionWeight(teamA, 'GK') - countPositionWeight(teamB, 'GK'));
  const defImbalance = Math.abs(countPositionWeight(teamA, 'DEF') - countPositionWeight(teamB, 'DEF'));
  const fwdImbalance = Math.abs(countPositionWeight(teamA, 'FWD') - countPositionWeight(teamB, 'FWD'));

  const tiredInjuredA = teamA.filter((x) => {
    const st = x.checkIn?.status ?? checkIns?.[x.player.id]?.status;
    return st === 'light_injury' || st === 'tired';
  }).length;
  const tiredInjuredB = teamB.filter((x) => {
    const st = x.checkIn?.status ?? checkIns?.[x.player.id]?.status;
    return st === 'light_injury' || st === 'tired';
  }).length;
  const fatigueImbalance = Math.abs(tiredInjuredA - tiredInjuredB);

  const penalty =
    diffOVR * 3.5 +
    diffPAC * 0.25 +
    diffDEF * 0.25 +
    gkImbalance * 4.5 +
    defImbalance * 2.2 +
    fwdImbalance * 1.8 +
    fatigueImbalance * 2.5;

  const fairnessRating = Math.max(60, Math.min(99, Math.round(99 - penalty * 1.1)));
  return { penalty, diffOVR, fairnessRating };
}

export function computeSquadFairnessRating(
  teamA: MatchSquad,
  teamB: MatchSquad,
  checkIns?: Record<string, CheckInEntry>
): number {
  return computeMatchupPenalty(teamA.players, teamB.players, checkIns).fairnessRating;
}

export function generateHumanTacticalCommentary(params: {
  teamA: MatchSquad;
  teamB: MatchSquad;
  altTeamA?: MatchSquad;
  altTeamB?: MatchSquad;
  checkIns?: Record<string, CheckInEntry>;
  isViewingAlt?: boolean;
}): TacticalCommentaryPoint[] {
  const { teamA, teamB, altTeamA, altTeamB, checkIns, isViewingAlt = false } = params;
  const points: TacticalCommentaryPoint[] = [];

  const joinNames = (items: MatchSquad['players']) => items.map((x) => x.player.name).join(', ');
  const avgMetric = (items: MatchSquad['players'], fn: (item: MatchSquad['players'][number]) => number) =>
    items.length > 0 ? Math.round(items.reduce((s, x) => s + fn(x), 0) / items.length) : 0;

  // 1. Hücum & Forvet Paylaşımı
  const getAttackers = (squad: MatchSquad) => {
    const byRole = squad.players.filter((x) => x.assignedRole === 'FWD' || x.player.position === 'FWD');
    const pool = byRole.length > 0 ? byRole : [...squad.players];
    return [...pool].sort(
      (a, b) => b.effectiveStats.sho + b.effectiveOVR - (a.effectiveStats.sho + a.effectiveOVR)
    );
  };
  const attA = getAttackers(teamA);
  const attB = getAttackers(teamB);
  if (attA[0] && attB[0]) {
    const leadA = attA[0];
    const leadB = attB[0];
    points.push({
      icon: '🎯',
      title: 'Hücum & Gol Silahlarının Ayrıştırılması',
      text: `İlk 12'ye giren en tehlikeli bitiricilerden ${leadA.player.name} (${leadA.effectiveOVR} OVR / ${leadA.effectiveStats.sho} Şut) ile ${leadB.player.name} (${leadB.effectiveOVR} OVR / ${leadB.effectiveStats.sho} Şut) tek takımda yığılıp dengeleri bozmasın diye iki ayrı takıma hücum lideri olarak verildi. (${teamA.name} hücum hattı: ${joinNames(attA)} • ${teamB.name} hücum hattı: ${joinNames(attB)}).`,
    });
  }

  // 2. Kaleci (GK) & Arka Alan Telafisi
  const pureGkA = teamA.players.find((x) => x.player.position === 'GK');
  const pureGkB = teamB.players.find((x) => x.player.position === 'GK');
  const assignedGkA = teamA.players.find((x) => x.assignedRole === 'GK') || teamA.players[0];
  const assignedGkB = teamB.players.find((x) => x.assignedRole === 'GK') || teamB.players[0];

  if (pureGkA && pureGkB) {
    points.push({
      icon: '🧤',
      title: 'Kaleci Dengesi İki Tarafta da Sağlandı',
      text: `Kadrolarda her iki takıma da doğal kaleci (${pureGkA.player.name} ve ${pureGkB.player.name}) düştüğü için kale bölgesi eşit şartlarla dengelendi.`,
    });
  } else if (pureGkA || pureGkB) {
    const gkSide = pureGkA ? teamA : teamB;
    const noGkSide = pureGkA ? teamB : teamA;
    const pureGk = pureGkA || pureGkB!;
    const fallbackGk = noGkSide.players.find((x) => x.assignedRole === 'GK') || noGkSide.players[0];
    points.push({
      icon: '🧤',
      title: 'Doğal Kaleci Eksikliğinde Saha İçi Telafi',
      text: `İlk 12'de yalnızca ${gkSide.name} takımında doğal kaleci (${pureGk.player.name}) bulunurken ${noGkSide.name} tarafında doğrudan kaleci yoktu; bu yüzden kalede ${fallbackGk.player.name} (${fallbackGk.player.position}) görevlendirildi ve kaleci farkını kapatmak adına ${noGkSide.name} takımının alan savunması (${noGkSide.avgDEF} SAV) ile genel OVR gücü (${noGkSide.totalOVR} vs ${gkSide.totalOVR}) yukarıda tutulup denge kuruldu.`,
    });
  } else if (assignedGkA && assignedGkB) {
    points.push({
      icon: '🧤',
      title: 'Doğal Kalecisiz Kadroda Eldiven Paylaşımı',
      text: `İlk 12 oyuncuda doğal kaleci yer almadığı için eldivenleri mevki yatkınlığına göre ${assignedGkA.player.name} (${teamA.name}) ve ${assignedGkB.player.name} (${teamB.name}) aldı; iki kale eşit şartta kaldığı için ağırlık orta saha ve savunma dengesine verildi.`,
    });
  }

  // 3. Savunma (DEF) Bloklarının Eşleştirilmesi
  const defA = teamA.players.filter((x) => x.assignedRole === 'DEF');
  const defB = teamB.players.filter((x) => x.assignedRole === 'DEF');
  if (defA.length > 0 && defB.length > 0) {
    const defPowerA = avgMetric(defA, (x) => Math.round((x.effectiveStats.def + x.effectiveStats.phy) / 2));
    const defPowerB = avgMetric(defB, (x) => Math.round((x.effectiveStats.def + x.effectiveStats.phy) / 2));
    points.push({
      icon: '🛡️',
      title: 'Savunma İkilileri & Fiziksel Direnç Uyumu',
      text: `${teamA.name} savunmasındaki ${joinNames(defA)} (${defPowerA} ort. SAV/FİZ) ile ${teamB.name} savunmasındaki ${joinNames(defB)} (${defPowerB} ort. SAV/FİZ) oyuncularının toplam defansif direnci birbirine çok yakın çıktığı için karşılıklı savunma blokları olarak ayrıldı.`,
    });
  }

  // 4. Orta Saha, Tempo (PAC) & Oyun Aklı Telafisi
  const midA = teamA.players.filter((x) => x.assignedRole === 'MID');
  const midB = teamB.players.filter((x) => x.assignedRole === 'MID');
  const pacDiff = teamA.avgPAC - teamB.avgPAC;
  if (Math.abs(pacDiff) >= 3) {
    const fastTeam = pacDiff > 0 ? teamA : teamB;
    const steadyTeam = pacDiff > 0 ? teamB : teamA;
    const steadyMids = pacDiff > 0 ? midB : midA;
    const steadyAvgPas = avgMetric(steadyTeam.players, (x) => x.effectiveStats.pas);
    const fastAvgPas = avgMetric(fastTeam.players, (x) => x.effectiveStats.pas);
    points.push({
      icon: '⚡',
      title: 'Tempo & Oyun Kurucu Dengelemesi',
      text: `${fastTeam.name} koşu temposunda (+${Math.abs(pacDiff)} Hız • ${fastTeam.avgPAC} vs ${steadyTeam.avgPAC}) daha seri görünse de, ${steadyTeam.name} tarafına ${steadyMids.length > 0 ? `${joinNames(steadyMids)} liderliğinde ` : ''}daha yüksek pas vizyonu (${steadyAvgPas} vs ${fastAvgPas} PAS) ve sert savunma (${steadyTeam.avgDEF} SAV) verilerek maç içi denge ${teamA.totalOVR}-${teamB.totalOVR} OVR bandında kilitlendi.`,
    });
  } else {
    points.push({
      icon: '⚡',
      title: 'Orta Saha Pas & Tempo Paralelliği',
      text: `${teamA.name} (${joinNames(midA) || 'orta hat'}) ile ${teamB.name} (${joinNames(midB) || 'orta hat'}) arasında hem koşu temposu (${teamA.avgPAC} vs ${teamB.avgPAC} Hız) hem de genel takım gücü (${teamA.totalOVR} vs ${teamB.totalOVR} OVR) başa baş seviyede tutuldu.`,
    });
  }

  // 5. Sağlık / Yorgunluk / Ekstra Form Çarpanı
  const statusNotes: string[] = [];
  const collectCheckInNotes = (squad: MatchSquad) => {
    squad.players.forEach((x) => {
      const st = checkIns?.[x.player.id]?.status || x.player.currentStatus;
      if (st === 'light_injury') statusNotes.push(`${x.player.name} (${squad.name} - Hafif Sakat)`);
      else if (st === 'tired') statusNotes.push(`${x.player.name} (${squad.name} - Yorgun)`);
      else if (st === 'extra_fit') statusNotes.push(`${x.player.name} (${squad.name} - Ekstra Formda)`);
    });
  };
  collectCheckInNotes(teamA);
  collectCheckInNotes(teamB);

  if (statusNotes.length > 0) {
    points.push({
      icon: '🩺',
      title: 'Maç Öncesi Check-In & Fiziksel Durum Etkisi',
      text: `Ankette özel kondisyon durumu bildirilen isimler — ${statusNotes.join(', ')} — efektif güç düşüş/artış çarpanlarıyla hesaplanıp bir takımda yorgunluk veya sakatlık birikmeyecek şekilde takımlara dağıtıldı.`,
    });
  }

  // 6. 1. Seçenek vs 2. Alternatif Farkı
  if (altTeamA && altTeamB) {
    const teamAIds = new Set(teamA.players.map((x) => x.player.id));
    const movedFromAtoB = teamA.players
      .filter((x) => altTeamB.players.some((y) => y.player.id === x.player.id))
      .map((x) => x.player.name);
    const movedFromBtoA = altTeamA.players
      .filter((x) => !teamAIds.has(x.player.id))
      .map((x) => x.player.name);

    if (movedFromAtoB.length > 0 && movedFromBtoA.length > 0) {
      points.push({
        icon: '🔄',
        title: isViewingAlt ? '2. Alternatif vs 1. En Dengeli Farkı' : '1. En Dengeli ile 2. Alternatif Arasındaki Fark',
        text: isViewingAlt
          ? `Şu an incelediğiniz 2. Alternatif kadroda, 1. En Dengeli seçeneğe kıyasla ${teamA.name} takımındaki ${movedFromAtoB.join(', ')} ile ${teamB.name} takımındaki ${movedFromBtoA.join(', ')} takımlar arasında yer değiştirmiş durumdadır.`
          : `2. Alternatif seçildiğinde 1. kadrodan farklı olarak ${teamA.name} takımındaki ${movedFromAtoB.join(', ')} ile ${teamB.name} takımındaki ${movedFromBtoA.join(', ')} takımlar arasında yer değiştirir; dengeyi bozmadan saha içi ikili kimyasını yenilemek istediğinizde seçilebilir.`,
      });
    }
  }

  return points;
}

export interface BalanceResult {
  teamA: MatchSquad;
  teamB: MatchSquad;
  diffOVR: number;
  fairnessRating: number; // 0 - 100%
  evaluatedCount: number;
  alternative?: {
    teamA: MatchSquad;
    teamB: MatchSquad;
    diffOVR: number;
    fairnessRating: number;
  };
}

function getSquadBestSeniorityRank(players: CalculatedPlayer[]): number {
  if (players.length === 0) return Number.MAX_SAFE_INTEGER;
  return Math.min(...players.map((item) => getPlayerSeniorityRank(item.player)));
}

/**
 * Gizli kıdem kuralı: ilk 12 asil kadro içindeki en kıdemli oyuncunun (en düşük rank)
 * bulunduğu takım her zaman 'Yeleksiz' (teamB, white), diğer takım 'Yelekli' (teamA, green) olur.
 */
export function applySeniorityToSquadPair(
  firstSquad: MatchSquad,
  secondSquad: MatchSquad,
  livePlayers?: Player[]
): { teamA: MatchSquad; teamB: MatchSquad } {
  const liveMap = livePlayers ? new Map(livePlayers.map((p) => [p.id, p])) : null;
  const syncPlayers = (squad: MatchSquad): CalculatedPlayer[] =>
    squad.players.map((item) => {
      const updated = liveMap?.get(item.player.id) || item.player;
      return { ...item, player: updated };
    });

  const firstPlayers = syncPlayers(firstSquad);
  const secondPlayers = syncPlayers(secondSquad);

  const rankFirst = getSquadBestSeniorityRank(firstPlayers);
  const rankSecond = getSquadBestSeniorityRank(secondPlayers);

  const firstIsYeleksiz = rankFirst <= rankSecond;
  const yeleksizBase = firstIsYeleksiz ? firstSquad : secondSquad;
  const yeleksizPlayers = firstIsYeleksiz ? firstPlayers : secondPlayers;
  const yelekliBase = firstIsYeleksiz ? secondSquad : firstSquad;
  const yelekliPlayers = firstIsYeleksiz ? secondPlayers : firstPlayers;

  return {
    teamA: {
      ...yelekliBase,
      name: 'Yelekli',
      color: 'green',
      players: yelekliPlayers,
    },
    teamB: {
      ...yeleksizBase,
      name: 'Yeleksiz',
      color: 'white',
      players: yeleksizPlayers,
    },
  };
}

export function run462BalancingAlgorithm(
  starters: Player[],
  checkIns: Record<string, CheckInEntry>
): BalanceResult {
  if (starters.length !== 12) {
    throw new Error('Dengeleme algoritması tam 12 oyuncu gerektirir.');
  }

  // Precompute effective stats for all 12
  const enriched: ScoredMember[] = starters.map((p) => {
    const { effectiveStats, effectiveOVR } = computeEffectivePlayer(p, checkIns[p.id]);
    return {
      player: p,
      effectiveStats,
      effectiveOVR,
      checkIn: checkIns[p.id],
    };
  });

  // Fix player 0 in Team A to prevent duplicate mirrored permutations
  const fixedPlayer = enriched[0];
  const candidates = enriched.slice(1); // 11 players

  // C(11, 5) = 462 combinations
  const combinations = getCombinations(candidates, 5);

  const scoredCombos: {
    combo: typeof candidates;
    penalty: number;
    diffOVR: number;
    fairnessRating: number;
  }[] = [];

  for (const combo of combinations) {
    const currentTeamA = [fixedPlayer, ...combo];
    const teamAIds = new Set(currentTeamA.map((x) => x.player.id));
    const currentTeamB = enriched.filter((x) => !teamAIds.has(x.player.id));

    const { penalty, diffOVR, fairnessRating } = computeMatchupPenalty(
      currentTeamA,
      currentTeamB,
      checkIns
    );

    scoredCombos.push({ combo, penalty, diffOVR, fairnessRating });
  }

  scoredCombos.sort((a, b) => a.penalty - b.penalty);

  const buildSquadPair = (
    combo: typeof candidates,
    bestDiff: number,
    computedFairness: number
  ) => {
    const finalTeamA = [fixedPlayer, ...combo];
    const teamAIds = new Set(finalTeamA.map((x) => x.player.id));
    const finalTeamB = enriched.filter((x) => !teamAIds.has(x.player.id));

    const { players: squadAPlayers, formation: formationA } = assignSquadRoles(finalTeamA);
    const { players: squadBPlayers, formation: formationB } = assignSquadRoles(finalTeamB);

    const totalOvrA = Math.round(squadAPlayers.reduce((sum, p) => sum + p.effectiveOVR, 0) / 6);
    const totalOvrB = Math.round(squadBPlayers.reduce((sum, p) => sum + p.effectiveOVR, 0) / 6);

    const avgPacA = Math.round(squadAPlayers.reduce((sum, p) => sum + p.effectiveStats.pac, 0) / 6);
    const avgPacB = Math.round(squadBPlayers.reduce((sum, p) => sum + p.effectiveStats.pac, 0) / 6);

    const avgDefA = Math.round(squadAPlayers.reduce((sum, p) => sum + p.effectiveStats.def, 0) / 6);
    const avgDefB = Math.round(squadBPlayers.reduce((sum, p) => sum + p.effectiveStats.def, 0) / 6);

    const rawA: MatchSquad = {
      name: 'Yelekli',
      color: 'green',
      formation: formationA,
      players: squadAPlayers,
      totalOVR: totalOvrA,
      avgPAC: avgPacA,
      avgDEF: avgDefA,
    };

    const rawB: MatchSquad = {
      name: 'Yeleksiz',
      color: 'white',
      formation: formationB,
      players: squadBPlayers,
      totalOVR: totalOvrB,
      avgPAC: avgPacB,
      avgDEF: avgDefB,
    };

    const { teamA, teamB } = applySeniorityToSquadPair(rawA, rawB);

    return {
      teamA,
      teamB,
      diffOVR: Math.round(bestDiff * 10) / 10,
      fairnessRating: computedFairness,
    };
  };

  const bestEntry = scoredCombos[0];
  const bestComboIds = new Set(bestEntry.combo.map((x) => x.player.id));
  const altEntry =
    scoredCombos.slice(1).find((item) => {
      const overlap = item.combo.filter((x) => bestComboIds.has(x.player.id)).length;
      const swappedPairs = 5 - overlap;
      return swappedPairs >= 2 && swappedPairs <= 3;
    }) ||
    scoredCombos.slice(1).find((item) => {
      const overlap = item.combo.filter((x) => bestComboIds.has(x.player.id)).length;
      return 5 - overlap >= 2;
    }) ||
    scoredCombos[1];

  const primary = buildSquadPair(bestEntry.combo, bestEntry.diffOVR, bestEntry.fairnessRating);
  const rawAlternative = altEntry
    ? buildSquadPair(
        altEntry.combo,
        altEntry.diffOVR,
        Math.min(primary.fairnessRating, altEntry.fairnessRating)
      )
    : undefined;

  return {
    ...primary,
    evaluatedCount: combinations.length, // exactly 462
    alternative: rawAlternative,
  };
}
