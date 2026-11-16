import { Match } from '../types';

export type MatchPhase =
  | 'pre_match'
  | 'live_match'
  | 'rating_open'
  | 'rating_closed'
  | 'sealed';

export interface MatchTiming {
  startAt: Date;
  endAt: Date;
  ratingDeadlineAt: Date;
}

export interface MatchLifecycleFlags {
  phase: MatchPhase;
  timing: MatchTiming;
  /** Üyeler anketten katılım/form/check-in/çekilme değiştirebilir mi */
  canPlayersEditPoll: boolean;
  /** Kurul/Yönetici anket kadrosuna müdahale edebilir mi (maç başlamadan önce veya anket açıkken) */
  canCommitteeManagePoll: boolean;
  /** 462 dengeleme ve taktik tahtası değişikliği yapılabilir mi */
  canEditTactics: boolean;
  /** Kurul/Yönetici maç saatini beklemeden "Maçı Bitir & 360° Aç" diyebilir mi */
  canOpenRatingManually: boolean;
  /** İlk 12 oyuncuları 360° form anketinde oy verebilir / güncelleyebilir mi */
  canVote360: boolean;
  /** Kurul Karar Masası'nı açıp mühür basabilir veya mühürlü kararı güncelleyebilir mi */
  canSealAwards: boolean;
  /** Mühürlenmiş ve tamamlanmış maç mı */
  isSealed: boolean;
}

/**
 * Maçın tarih (match.date) ve saat aralığından (match.matchTime, örn: "21:00 - 22:00", "23:00 - 00:00")
 * tek bir kesin başlangıç, bitiş ve ertesi gün 14:00 oylama kapanış zamanı üretir.
 */
export function getMatchTiming(match: Pick<Match, 'date' | 'matchTime'>): MatchTiming {
  const base = match.date ? new Date(match.date) : new Date();
  const safeBase = Number.isNaN(base.getTime()) ? new Date() : base;

  const matches = Array.from((match.matchTime || '').matchAll(/(\d{1,2}):(\d{2})/g));
  const sh = matches[0]
    ? Math.min(23, Math.max(0, Number(matches[0][1])))
    : safeBase.getHours();
  const sm = matches[0]
    ? Math.min(59, Math.max(0, Number(matches[0][2])))
    : safeBase.getMinutes();

  const startAt = new Date(
    safeBase.getFullYear(),
    safeBase.getMonth(),
    safeBase.getDate(),
    sh,
    sm,
    0,
    0
  );

  let endAt: Date;
  if (matches[1]) {
    const eh = Math.min(23, Math.max(0, Number(matches[1][1])));
    const em = Math.min(59, Math.max(0, Number(matches[1][2])));
    endAt = new Date(
      safeBase.getFullYear(),
      safeBase.getMonth(),
      safeBase.getDate(),
      eh,
      em,
      0,
      0
    );
    if (eh * 60 + em <= sh * 60 + sm) {
      endAt.setDate(endAt.getDate() + 1);
    }
  } else {
    endAt = new Date(startAt.getTime() + 60 * 60 * 1000);
  }

  const ratingDeadlineAt = new Date(
    startAt.getFullYear(),
    startAt.getMonth(),
    startAt.getDate() + 1,
    14,
    0,
    0,
    0
  );

  return { startAt, endAt, ratingDeadlineAt };
}

export function getMatchPhase(match: Match, nowMs: number = Date.now()): MatchPhase {
  if (match.awards?.isConfirmedByCommittee || match.stage === 'archived') {
    return 'sealed';
  }

  const timing = getMatchTiming(match);
  const hasEndedByClock = nowMs >= timing.endAt.getTime();
  const isPastDeadline = nowMs >= timing.ratingDeadlineAt.getTime();

  if (match.ratingOpenedManually || match.stage === 'rating' || hasEndedByClock) {
    return isPastDeadline ? 'rating_closed' : 'rating_open';
  }

  if (nowMs >= timing.startAt.getTime()) {
    return 'live_match';
  }

  return 'pre_match';
}

export function getMatchLifecycleFlags(match: Match, nowMs: number = Date.now()): MatchLifecycleFlags {
  const timing = getMatchTiming(match);
  const phase = getMatchPhase(match, nowMs);
  const isPollUnlocked = match.isPollOpen !== false;

  return {
    phase,
    timing,
    canPlayersEditPoll: phase === 'pre_match' && isPollUnlocked,
    canCommitteeManagePoll: phase === 'pre_match',
    canEditTactics: phase === 'pre_match' || phase === 'live_match',
    canOpenRatingManually: (phase === 'pre_match' || phase === 'live_match') && match.starters.length === 12,
    canVote360: phase === 'rating_open',
    canSealAwards: phase === 'rating_open' || phase === 'rating_closed' || phase === 'sealed',
    isSealed: phase === 'sealed',
  };
}
