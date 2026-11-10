import { Player, CheckInEntry, MatchSquad, PlayerStats, PreferredPosition } from '../types';

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

// Assign 6 tactical roles on the Halı Saha pitch: 1 GK, 2 DEF, 2 MID, 1 FWD
function assignSquadRoles(players: { player: Player; effectiveStats: PlayerStats; effectiveOVR: number }[]): CalculatedPlayer[] {
  // Sort players to find best fits for each role
  const sorted = [...players];
  const assigned: CalculatedPlayer[] = [];

  // 1. Pick Goalkeeper: Priority to preferred GK or highest DEF+PHY with low PAC (or injured)
  sorted.sort((a, b) => {
    const aIsGk = a.player.position === 'GK' ? 100 : 0;
    const bIsGk = b.player.position === 'GK' ? 100 : 0;
    const aGkScore = aIsGk + (a.effectiveStats.def + a.effectiveStats.phy) - a.effectiveStats.pac * 0.5;
    const bGkScore = bIsGk + (b.effectiveStats.def + b.effectiveStats.phy) - b.effectiveStats.pac * 0.5;
    return bGkScore - aGkScore;
  });
  const gk = sorted.shift()!;
  assigned.push({ ...gk, assignedRole: 'GK' });

  // 2. Pick 2 Defenders: Priority to DEF position or highest DEF stat
  sorted.sort((a, b) => {
    const aDefScore = (a.player.position === 'DEF' ? 50 : 0) + a.effectiveStats.def * 1.5;
    const bDefScore = (b.player.position === 'DEF' ? 50 : 0) + b.effectiveStats.def * 1.5;
    return bDefScore - aDefScore;
  });
  const def1 = sorted.shift()!;
  const def2 = sorted.shift()!;
  assigned.push({ ...def1, assignedRole: 'DEF' });
  assigned.push({ ...def2, assignedRole: 'DEF' });

  // 3. Pick 1 Striker / FWD: Priority to FWD position or highest SHO stat
  sorted.sort((a, b) => {
    const aShoScore = (a.player.position === 'FWD' ? 50 : 0) + a.effectiveStats.sho * 1.5;
    const bShoScore = (b.player.position === 'FWD' ? 50 : 0) + b.effectiveStats.sho * 1.5;
    return bShoScore - aShoScore;
  });
  const fwd = sorted.shift()!;
  assigned.push({ ...fwd, assignedRole: 'FWD' });

  // 4. Remaining 2 are Midfielders (MID)
  for (const mid of sorted) {
    assigned.push({ ...mid, assignedRole: 'MID' });
  }

  return assigned;
}

export interface BalanceResult {
  teamA: MatchSquad;
  teamB: MatchSquad;
  diffOVR: number;
  fairnessRating: number; // 0 - 100%
  evaluatedCount: number;
}

export function run462BalancingAlgorithm(
  starters: Player[],
  checkIns: Record<string, CheckInEntry>
): BalanceResult {
  if (starters.length !== 12) {
    throw new Error('Dengeleme algoritması tam 12 oyuncu gerektirir.');
  }

  // Precompute effective stats for all 12
  const enriched = starters.map((p) => {
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

  let bestCombination: typeof candidates | null = null;
  let minPenalty = Number.MAX_VALUE;
  let bestDiff = 0;

  for (const combo of combinations) {
    const currentTeamA = [fixedPlayer, ...combo];
    const teamAIds = new Set(currentTeamA.map((x) => x.player.id));
    const currentTeamB = enriched.filter((x) => !teamAIds.has(x.player.id));

    // Calculate metrics
    const ovrA = currentTeamA.reduce((sum, p) => sum + p.effectiveOVR, 0) / 6;
    const ovrB = currentTeamB.reduce((sum, p) => sum + p.effectiveOVR, 0) / 6;
    const diffOVR = Math.abs(ovrA - ovrB);

    // Defense & Goalkeeper balance check
    const gkDefCountA = currentTeamA.filter((x) => x.player.position === 'GK' || x.player.position === 'DEF').length;
    const gkDefCountB = currentTeamB.filter((x) => x.player.position === 'GK' || x.player.position === 'DEF').length;
    const defImbalance = Math.abs(gkDefCountA - gkDefCountB);

    // Revir / Injury / Fatigue distribution penalty (Prevent 2 injured/tired in one team and 0 in other)
    const tiredInjuredA = currentTeamA.filter((x) => x.checkIn?.status === 'light_injury' || x.checkIn?.status === 'tired').length;
    const tiredInjuredB = currentTeamB.filter((x) => x.checkIn?.status === 'light_injury' || x.checkIn?.status === 'tired').length;
    const fatigueImbalance = Math.abs(tiredInjuredA - tiredInjuredB);

    // Composite penalty score
    const penalty = diffOVR * 3.5 + defImbalance * 2.0 + fatigueImbalance * 2.5;

    if (penalty < minPenalty) {
      minPenalty = penalty;
      bestCombination = combo;
      bestDiff = diffOVR;
    }
  }

  // Build optimal teams
  const finalTeamA = [fixedPlayer, ...bestCombination!];
  const teamAIds = new Set(finalTeamA.map((x) => x.player.id));
  const finalTeamB = enriched.filter((x) => !teamAIds.has(x.player.id));

  const squadAPlayers = assignSquadRoles(finalTeamA);
  const squadBPlayers = assignSquadRoles(finalTeamB);

  const totalOvrA = Math.round(squadAPlayers.reduce((sum, p) => sum + p.effectiveOVR, 0) / 6);
  const totalOvrB = Math.round(squadBPlayers.reduce((sum, p) => sum + p.effectiveOVR, 0) / 6);

  const avgPacA = Math.round(squadAPlayers.reduce((sum, p) => sum + p.effectiveStats.pac, 0) / 6);
  const avgPacB = Math.round(squadBPlayers.reduce((sum, p) => sum + p.effectiveStats.pac, 0) / 6);

  const avgDefA = Math.round(squadAPlayers.reduce((sum, p) => sum + p.effectiveStats.def, 0) / 6);
  const avgDefB = Math.round(squadBPlayers.reduce((sum, p) => sum + p.effectiveStats.def, 0) / 6);

  const fairness = Math.max(60, Math.min(99, Math.round(100 - bestDiff * 6)));

  return {
    teamA: {
      name: 'Yeşil Takım',
      color: 'green',
      players: squadAPlayers,
      totalOVR: totalOvrA,
      avgPAC: avgPacA,
      avgDEF: avgDefA,
    },
    teamB: {
      name: 'Beyaz Takım',
      color: 'white',
      players: squadBPlayers,
      totalOVR: totalOvrB,
      avgPAC: avgPacB,
      avgDEF: avgDefB,
    },
    diffOVR: Math.round(bestDiff * 10) / 10,
    fairnessRating: fairness,
    evaluatedCount: combinations.length, // exactly 462
  };
}
