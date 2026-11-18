import { SUBMISSION_SECONDS } from './heavy13';

export interface SubmissionDeadline {
  turnKey: string;
  roundNumber: number;
  playerId: string;
  deadlineAt: number | null;
  remainingMs: number;
}

export function buildSubmissionTurnKey(
  matchSeq: number,
  roundNumber: number,
  playerId: string
): string {
  return `${matchSeq}:${roundNumber}:${playerId}`;
}

export function syncSubmissionDeadline(
  prev: SubmissionDeadline | null,
  params: {
    turnKey: string | null;
    roundNumber: number;
    playerId: string | null;
    isTimerActive: boolean;
    now: number;
    durationMs?: number;
  }
): SubmissionDeadline | null {
  const { turnKey, roundNumber, playerId, isTimerActive, now } = params;
  const durationMs = params.durationMs ?? SUBMISSION_SECONDS * 1000;

  if (!turnKey || !playerId) {
    return null;
  }

  // Fresh submission step (new match, new round, or next human player) -> fresh deadline
  if (!prev || prev.turnKey !== turnKey) {
    return {
      turnKey,
      roundNumber,
      playerId,
      remainingMs: durationMs,
      deadlineAt: isTimerActive ? now + durationMs : null,
    };
  }

  // Same turn resuming from pause / rules / transition modal
  if (isTimerActive && prev.deadlineAt === null) {
    return {
      ...prev,
      deadlineAt: now + prev.remainingMs,
    };
  }

  // Same turn pausing
  if (!isTimerActive && prev.deadlineAt !== null) {
    return {
      ...prev,
      remainingMs: Math.max(0, prev.deadlineAt - now),
      deadlineAt: null,
    };
  }

  return prev;
}

export function getSubmissionRemainingMs(
  deadline: SubmissionDeadline | null,
  currentTurnKey: string | null,
  now: number,
  durationMs: number = SUBMISSION_SECONDS * 1000
): number {
  if (!deadline || !currentTurnKey || deadline.turnKey !== currentTurnKey) {
    return durationMs;
  }
  if (deadline.deadlineAt !== null) {
    return Math.max(0, deadline.deadlineAt - now);
  }
  return deadline.remainingMs;
}

export function isSubmissionDeadlineExpired(
  deadline: SubmissionDeadline | null,
  currentTurnKey: string | null,
  currentPlayerId: string | null,
  now: number
): boolean {
  if (
    !deadline ||
    !currentTurnKey ||
    !currentPlayerId ||
    deadline.turnKey !== currentTurnKey ||
    deadline.playerId !== currentPlayerId ||
    deadline.deadlineAt === null
  ) {
    return false;
  }
  return now >= deadline.deadlineAt;
}
