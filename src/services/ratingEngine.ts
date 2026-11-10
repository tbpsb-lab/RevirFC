import { MatchRatingVote } from '../types';

export interface PlayerRatingCalculation {
  playerId: string;
  matchScore10: number; // 1-10
  matchScore100: number; // 10-100
  oldOVR: number;
  newOVR: number;
  deltaOVR: number;
  selfScore: number;
  peerAverageScore: number;
  egoDelta: number; // selfScore - peerAverageScore
  egoLabel: 'Özgüven Patlaması' | 'Gizli Kahraman' | 'Gerçekçi Usta';
  trimmedMinVote?: number;
  trimmedMaxVote?: number;
}

/**
 * Trimmed Weighted Mean Filter:
 * Discards 1 lowest and 1 highest peer vote to eliminate friendly 10s and troll 1s.
 * Weighted: 50% Opponent, 40% Teammates, 10% Self Rating.
 */
export function calculatePlayerMatchRating(params: {
  playerId: string;
  oldOVR: number;
  votes: MatchRatingVote[];
  teammateIds: Set<string>;
  opponentIds: Set<string>;
}): PlayerRatingCalculation {
  const { playerId, oldOVR, votes, teammateIds, opponentIds } = params;

  // Filter votes for this player
  const playerVotes = votes.filter((v) => v.targetPlayerId === playerId);

  // Separate self vote, teammate votes, and opponent votes
  let selfScore = 7.0; // default if not provided
  const teammateScores: number[] = [];
  const opponentScores: number[] = [];
  const allPeerScores: number[] = [];

  for (const v of playerVotes) {
    if (v.raterPlayerId === playerId) {
      selfScore = v.score;
    } else if (opponentIds.has(v.raterPlayerId)) {
      opponentScores.push(v.score);
      allPeerScores.push(v.score);
    } else if (teammateIds.has(v.raterPlayerId)) {
      teammateScores.push(v.score);
      allPeerScores.push(v.score);
    } else {
      allPeerScores.push(v.score);
    }
  }

  // Outlier trimming on peer votes (only if 3 or more peer votes exist)
  let trimmedMinVote: number | undefined;
  let trimmedMaxVote: number | undefined;
  let filteredPeerScores = [...allPeerScores];

  if (filteredPeerScores.length >= 3) {
    filteredPeerScores.sort((a, b) => a - b);
    trimmedMinVote = filteredPeerScores.shift(); // remove lowest
    trimmedMaxVote = filteredPeerScores.pop();   // remove highest
  }

  // Calculate peer average
  const peerAverageScore =
    filteredPeerScores.length > 0
      ? filteredPeerScores.reduce((sum, s) => sum + s, 0) / filteredPeerScores.length
      : selfScore;

  // Weighted formula
  const oppAvg = opponentScores.length > 0
    ? opponentScores.reduce((a, b) => a + b, 0) / opponentScores.length
    : peerAverageScore;

  const teamAvg = teammateScores.length > 0
    ? teammateScores.reduce((a, b) => a + b, 0) / teammateScores.length
    : peerAverageScore;

  // Match rating (1 - 10)
  const matchScore10 = Math.round((0.50 * oppAvg + 0.40 * teamAvg + 0.10 * selfScore) * 10) / 10;
  // Normalized to 10 - 100 for EA Sports FC OVR scale
  const matchScore100 = matchScore10 * 10;

  // Exponential Moving Average (EMA) Update:
  // New OVR = Round(0.85 * Old OVR + 0.15 * Normalized Match Score)
  const newOVR = Math.round(0.85 * oldOVR + 0.15 * matchScore100);
  const deltaOVR = newOVR - oldOVR;

  // Ego / Modesty Index (Self - Reality)
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
    deltaOVR,
    selfScore,
    peerAverageScore: Math.round(peerAverageScore * 10) / 10,
    egoDelta,
    egoLabel,
    trimmedMinVote,
    trimmedMaxVote,
  };
}
