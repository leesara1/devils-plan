import { HandCategory, HAND_RANKINGS_META } from './poker';

export type StatsMode = 'ai' | 'local2p';

export interface ModeStats {
  p1Wins: number;
  opponentWins: number;
  draws: number;
  p1Hands: Record<HandCategory, number>;
  opponentHands: Record<HandCategory, number>;
}

export type CareerStats = Record<StatsMode, ModeStats>;

const STORAGE_KEY = 'memory-poker-stats-v1';

function createEmptyHandMap(): Record<HandCategory, number> {
  return {
    1: 0,
    2: 0,
    3: 0,
    4: 0,
    5: 0,
    6: 0,
    7: 0,
    8: 0,
    9: 0,
  };
}

export function createEmptyModeStats(): ModeStats {
  return {
    p1Wins: 0,
    opponentWins: 0,
    draws: 0,
    p1Hands: createEmptyHandMap(),
    opponentHands: createEmptyHandMap(),
  };
}

export function createEmptyCareerStats(): CareerStats {
  return {
    ai: createEmptyModeStats(),
    local2p: createEmptyModeStats(),
  };
}

function normalizeModeStats(raw: Partial<ModeStats> | undefined): ModeStats {
  const base = createEmptyModeStats();
  if (!raw) return base;
  base.p1Wins = typeof raw.p1Wins === 'number' && raw.p1Wins >= 0 ? raw.p1Wins : 0;
  base.opponentWins = typeof raw.opponentWins === 'number' && raw.opponentWins >= 0 ? raw.opponentWins : 0;
  base.draws = typeof raw.draws === 'number' && raw.draws >= 0 ? raw.draws : 0;

  for (const meta of HAND_RANKINGS_META) {
    const cat = meta.category;
    const p1Val = raw.p1Hands?.[cat];
    const oppVal = raw.opponentHands?.[cat];
    base.p1Hands[cat] = typeof p1Val === 'number' && p1Val >= 0 ? p1Val : 0;
    base.opponentHands[cat] = typeof oppVal === 'number' && oppVal >= 0 ? oppVal : 0;
  }
  return base;
}

export function loadCareerStats(): CareerStats {
  if (typeof window === 'undefined') return createEmptyCareerStats();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return createEmptyCareerStats();
    const parsed = JSON.parse(raw) as Partial<CareerStats>;
    return {
      ai: normalizeModeStats(parsed.ai),
      local2p: normalizeModeStats(parsed.local2p),
    };
  } catch {
    return createEmptyCareerStats();
  }
}

export function saveCareerStats(stats: CareerStats): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
  } catch {
    // Ignore storage quota or private-mode restrictions
  }
}

export function recordRoundInStats(
  prev: CareerStats,
  mode: StatsMode,
  winner: 'p1' | 'p2' | 'draw',
  p1Category: HandCategory,
  opponentCategory: HandCategory
): CareerStats {
  const modePrev = prev[mode];
  const updatedMode: ModeStats = {
    p1Wins: modePrev.p1Wins + (winner === 'p1' ? 1 : 0),
    opponentWins: modePrev.opponentWins + (winner === 'p2' ? 1 : 0),
    draws: modePrev.draws + (winner === 'draw' ? 1 : 0),
    p1Hands: {
      ...modePrev.p1Hands,
      [p1Category]: (modePrev.p1Hands[p1Category] ?? 0) + 1,
    },
    opponentHands: {
      ...modePrev.opponentHands,
      [opponentCategory]: (modePrev.opponentHands[opponentCategory] ?? 0) + 1,
    },
  };

  const next: CareerStats = {
    ...prev,
    [mode]: updatedMode,
  };
  saveCareerStats(next);
  return next;
}

export function clearModeStats(prev: CareerStats, mode: StatsMode): CareerStats {
  const next: CareerStats = {
    ...prev,
    [mode]: createEmptyModeStats(),
  };
  saveCareerStats(next);
  return next;
}

export const HAND_SHORT_LABEL: Record<HandCategory, string> = {
  1: '하이카드',
  2: '원페어',
  3: '투페어',
  4: '트리플',
  5: '스트레이트',
  6: '플러시',
  7: '풀하우스',
  8: '포카드',
  9: '스티플',
};
