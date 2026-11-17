export type PedestalColor = 'red' | 'green' | 'blue';
export type ChipType = PedestalColor | 'rainbow';
export type RockNumber = 0 | 1 | 2 | 3 | 4 | 5 | 6;
export type AIDifficulty = 'normal' | 'hard' | 'master';

export const PEDESTAL_COLORS: PedestalColor[] = ['red', 'green', 'blue'];
export const ROCK_NUMBERS: RockNumber[] = [0, 1, 2, 3, 4, 5, 6];
export const TOTAL_ROUNDS = 14;
export const HALF_ROUND = 7;
export const OVERFLOW_THRESHOLD = 13;
export const SUBMISSION_SECONDS = 180;

export const PEDESTAL_META: Record<
  PedestalColor,
  { labelKo: string; shortKo: string; cssVar: string }
> = {
  red: { labelKo: '빨강 받침대', shortKo: '빨강', cssVar: 'var(--color-rival-400)' },
  green: { labelKo: '초록 받침대', shortKo: '초록', cssVar: '#34d399' },
  blue: { labelKo: '파랑 받침대', shortKo: '파랑', cssVar: 'var(--color-lounge-sky-400)' },
};

export const CHIP_META: Record<
  ChipType,
  { labelKo: string; shortKo: string }
> = {
  red: { labelKo: '빨강 칩', shortKo: '빨' },
  green: { labelKo: '초록 칩', shortKo: '초' },
  blue: { labelKo: '파랑 칩', shortKo: '파' },
  rainbow: { labelKo: '레인보우 칩', shortKo: '레' },
};

export interface RockCube {
  id: string;
  value: RockNumber;
  ownerId: string;
  ownerName: string;
  roundPlaced: number;
}

export type PedestalsState = Record<PedestalColor, RockCube[]>;

export interface ChipCounts {
  red: number;
  green: number;
  blue: number;
  rainbow: number;
}

export interface PlayerState {
  id: string;
  name: string;
  seatIndex: number; // 0 .. n-1 clockwise
  isHuman: boolean;
  cards: RockNumber[];
  chips: ChipCounts;
  penaltyPoints: number;
  lastPenaltySeq: number; // 0 = never penalized; higher = more recent
  lastPenaltyRound: number | null;
}

export interface SecretSubmission {
  playerId: string;
  card: RockNumber;
  chip: ChipType;
}

export interface TurnOrderEntry {
  playerId: string;
  seatIndex: number;
  card: RockNumber;
  chip: ChipType;
  isDeferredPass: boolean;
}

export interface PlacementEventLog {
  id: string;
  playerId: string;
  playerName: string;
  chip: ChipType;
  card: RockNumber;
  action: 'PASS' | 'PLACE';
  targetColor?: PedestalColor;
  sumBefore?: number;
  sumAfter?: number;
  overflowed?: boolean;
  collectedCount?: number;
}

export interface RoundHistoryRecord {
  roundNumber: number;
  penaltiesByPlayer: Record<string, number>;
  cumulativeByPlayer: Record<string, number>;
  firstPlayerIdBefore: string;
  firstPlayerIdAfter: string;
  logs: PlacementEventLog[];
}

export function createEmptyPedestals(): PedestalsState {
  return {
    red: [],
    green: [],
    blue: [],
  };
}

export function getPedestalSum(cubes: RockCube[]): number {
  return cubes.reduce((acc, cube) => acc + cube.value, 0);
}

export function createFullCards(): RockNumber[] {
  return [0, 1, 2, 3, 4, 5, 6];
}

export function createFullChips(): ChipCounts {
  return {
    red: 2,
    green: 2,
    blue: 2,
    rainbow: 1,
  };
}

export function createInitialPlayers(
  playerCount: 3 | 4,
  humanSeatIndices: number[],
  mode: 'ai' | 'local'
): PlayerState[] {
  const aiNames = ['강지연 AI', '최민혁 AI', '윤서진 AI', '박도현 AI'];
  let aiNameIdx = 0;

  return Array.from({ length: playerCount }, (_, seatIndex) => {
    const isHuman = humanSeatIndices.includes(seatIndex);
    let name: string;
    if (mode === 'local') {
      name = `플레이어 ${seatIndex + 1}`;
    } else if (isHuman) {
      name = '나 (P1)';
    } else {
      name = aiNames[aiNameIdx % aiNames.length];
      aiNameIdx += 1;
    }

    return {
      id: `seat-${seatIndex}`,
      name,
      seatIndex,
      isHuman,
      cards: createFullCards(),
      chips: createFullChips(),
      penaltyPoints: 0,
      lastPenaltySeq: 0,
      lastPenaltyRound: null,
    };
  });
}

export function replenishPlayerHands(players: PlayerState[]): PlayerState[] {
  return players.map((p) => ({
    ...p,
    cards: createFullCards(),
    chips: createFullChips(),
  }));
}

export function getAvailableChipTypes(chips: ChipCounts): ChipType[] {
  const list: ChipType[] = [];
  if (chips.red > 0) list.push('red');
  if (chips.green > 0) list.push('green');
  if (chips.blue > 0) list.push('blue');
  if (chips.rainbow > 0) list.push('rainbow');
  return list;
}

/**
 * Placement Order Rules:
 * 1. Rainbow chip players go first.
 * 2. Higher rock card number goes next (6 > 5 > ... > 0).
 * 3. Ties are broken clockwise starting from the player holding the First Player marker.
 */
export function computePlacementOrder(
  submissions: Record<string, SecretSubmission>,
  players: PlayerState[],
  firstPlayerSeat: number
): TurnOrderEntry[] {
  const n = players.length;

  const entries: TurnOrderEntry[] = players.map((player) => {
    const sub = submissions[player.id];
    return {
      playerId: player.id,
      seatIndex: player.seatIndex,
      card: sub.card,
      chip: sub.chip,
      isDeferredPass: false,
    };
  });

  entries.sort((a, b) => {
    const aRainbow = a.chip === 'rainbow' ? 0 : 1;
    const bRainbow = b.chip === 'rainbow' ? 0 : 1;
    if (aRainbow !== bRainbow) return aRainbow - bRainbow;

    if (a.card !== b.card) return b.card - a.card;

    const aClock = (a.seatIndex - firstPlayerSeat + n) % n;
    const bClock = (b.seatIndex - firstPlayerSeat + n) % n;
    return aClock - bClock;
  });

  return entries;
}

export interface PlacementResolution {
  nextPedestals: PedestalsState;
  overflowed: boolean;
  sumBefore: number;
  sumAfter: number;
  collectedCubes: RockCube[];
  penaltyAdded: number;
}

/**
 * Places a rock cube onto the target pedestal.
 * If new sum >= 13:
 *  - All cubes on the pedestal BEFORE this placement are collected as penalty points (count of cubes).
 *  - The newly placed cube remains on the pedestal as the new base.
 */
export function resolveCubePlacement(
  pedestals: PedestalsState,
  targetColor: PedestalColor,
  cube: RockCube
): PlacementResolution {
  const existing = pedestals[targetColor];
  const sumBefore = getPedestalSum(existing);
  const sumAfter = sumBefore + cube.value;

  if (sumAfter >= OVERFLOW_THRESHOLD) {
    return {
      nextPedestals: {
        ...pedestals,
        [targetColor]: [cube],
      },
      overflowed: true,
      sumBefore,
      sumAfter,
      collectedCubes: existing,
      penaltyAdded: existing.length,
    };
  }

  return {
    nextPedestals: {
      ...pedestals,
      [targetColor]: [...existing, cube],
    },
    overflowed: false,
    sumBefore,
    sumAfter,
    collectedCubes: [],
    penaltyAdded: 0,
  };
}

/**
 * Final Rankings:
 * - Fewer penalty points ranks higher (1st place = lowest penalty).
 * - Most penalty points is last place.
 * - Tie-breaker: most recently penalized player (higher lastPenaltySeq) ranks LOWER.
 */
export function computeFinalRankings(players: PlayerState[]): PlayerState[] {
  return [...players].sort((a, b) => {
    if (a.penaltyPoints !== b.penaltyPoints) {
      return a.penaltyPoints - b.penaltyPoints;
    }
    if (a.lastPenaltySeq !== b.lastPenaltySeq) {
      return a.lastPenaltySeq - b.lastPenaltySeq;
    }
    return a.seatIndex - b.seatIndex;
  });
}

// ==================== AI STRATEGY ENGINE ====================

function evaluateSubmissionScore(
  card: RockNumber,
  chip: ChipType,
  pedestals: PedestalsState,
  remainingRoundsInHalf: number,
  difficulty: AIDifficulty
): number {
  const sums: Record<PedestalColor, number> = {
    red: getPedestalSum(pedestals.red),
    green: getPedestalSum(pedestals.green),
    blue: getPedestalSum(pedestals.blue),
  };
  const counts: Record<PedestalColor, number> = {
    red: pedestals.red.length,
    green: pedestals.green.length,
    blue: pedestals.blue.length,
  };

  if (chip === 'rainbow') {
    // Find best pedestal if we use rainbow
    let bestOutcome = -Infinity;
    for (const color of PEDESTAL_COLORS) {
      const safeMargin = OVERFLOW_THRESHOLD - 1 - (sums[color] + card);
      if (safeMargin >= 0) {
        bestOutcome = Math.max(bestOutcome, 18 - safeMargin * 0.4);
      } else {
        bestOutcome = Math.max(bestOutcome, -counts[color] * 9);
      }
    }
    // Conserving rainbow for later critical rounds is valuable in hard/master
    const hoardPenalty =
      difficulty === 'normal' ? 2 : remainingRoundsInHalf > 2 ? 12 : 1;
    return bestOutcome - hoardPenalty;
  }

  const currentSum = sums[chip];
  const cubeCount = counts[chip];
  const afterSum = currentSum + card;

  if (afterSum >= OVERFLOW_THRESHOLD) {
    // Guaranteed overflow unless someone clears it before us!
    // Higher card gives earlier turn (bad if we want someone else to overflow first),
    // lower card + pass might let another player clear it.
    const penaltyRisk = cubeCount * 10;
    const bailoutBonus = card <= 2 ? 4 : 0;
    return -penaltyRisk + bailoutBonus;
  }

  const headroom = OVERFLOW_THRESHOLD - 1 - afterSum; // 0..12
  let score = 20;

  // Prefer landing safely near 9-12 to pressure later players without bursting
  if (headroom === 0) score += 8; // puts pedestal at exact 12!
  else if (headroom <= 2) score += 5;
  else if (headroom <= 5) score += 2;

  // Risk adjustment: if pedestal is already high (e.g., 7..11) and we play a small card (0..3),
  // someone playing a higher card earlier might push it to 13 or push it dangerously close!
  if (currentSum >= 7 && card <= 3 && difficulty !== 'normal') {
    // Small cards go AFTER high cards -> high chance someone else overflows or pushes it to 11-12
    score += 3;
  }

  // Save '0' card as an emergency shield in hard/master when not needed
  if (card === 0 && currentSum <= 8) {
    score -= difficulty === 'master' ? 11 : difficulty === 'hard' ? 7 : 2;
  }

  // In normal mode add slight noise
  if (difficulty === 'normal') {
    score += (Math.random() - 0.5) * 14;
  } else if (difficulty === 'hard') {
    score += (Math.random() - 0.5) * 4;
  } else {
    score += (Math.random() - 0.5) * 1.5;
  }

  return score;
}

export function chooseAISubmission(
  player: PlayerState,
  pedestals: PedestalsState,
  roundNumber: number,
  difficulty: AIDifficulty
): SecretSubmission {
  const availableChips = getAvailableChipTypes(player.chips);
  const remainingInHalf =
    roundNumber <= HALF_ROUND
      ? HALF_ROUND - roundNumber
      : TOTAL_ROUNDS - roundNumber;

  let bestCard = player.cards[0];
  let bestChip = availableChips[0];
  let bestScore = -Infinity;

  for (const card of player.cards) {
    for (const chip of availableChips) {
      const score = evaluateSubmissionScore(
        card,
        chip,
        pedestals,
        remainingInHalf,
        difficulty
      );
      if (score > bestScore) {
        bestScore = score;
        bestCard = card;
        bestChip = chip;
      }
    }
  }

  return {
    playerId: player.id,
    card: bestCard,
    chip: bestChip,
  };
}

export function chooseAIRainbowDecision(
  pedestals: PedestalsState,
  cardValue: RockNumber,
  canPass: boolean,
  remainingUnplacedEntries: TurnOrderEntry[],
  difficulty: AIDifficulty
): { shouldPass: boolean; targetColor: PedestalColor } {
  // Check safe pedestals
  const safeColors = PEDESTAL_COLORS.filter(
    (c) => getPedestalSum(pedestals[c]) + cardValue < OVERFLOW_THRESHOLD
  );

  if (safeColors.length > 0) {
    // Pick safe pedestal that pushes sum highest (pressures opponents) on master/hard, or lowest on normal
    const sorted = [...safeColors].sort((a, b) => {
      const sumA = getPedestalSum(pedestals[a]);
      const sumB = getPedestalSum(pedestals[b]);
      return difficulty === 'normal' ? sumA - sumB : sumB - sumA;
    });
    return { shouldPass: false, targetColor: sorted[0] };
  }

  // All 3 pedestals would overflow!
  if (canPass && remainingUnplacedEntries.length > 0 && difficulty !== 'normal') {
    return { shouldPass: true, targetColor: 'red' };
  }

  // Pick pedestal with fewest existing cubes to minimize penalty
  const sortedMinPenalty = [...PEDESTAL_COLORS].sort((a, b) => {
    const countDiff = pedestals[a].length - pedestals[b].length;
    if (countDiff !== 0) return countDiff;
    return getPedestalSum(pedestals[a]) - getPedestalSum(pedestals[b]);
  });

  return { shouldPass: false, targetColor: sortedMinPenalty[0] };
}

export function shouldAINormalChipPass(
  pedestals: PedestalsState,
  entry: TurnOrderEntry,
  remainingUnplacedEntries: TurnOrderEntry[],
  difficulty: AIDifficulty
): boolean {
  if (entry.chip === 'rainbow') return false;
  if (remainingUnplacedEntries.length === 0) return false;

  const currentSum = getPedestalSum(pedestals[entry.chip]);
  const wouldOverflow = currentSum + entry.card >= OVERFLOW_THRESHOLD;

  if (wouldOverflow) {
    if (difficulty === 'normal') return Math.random() < 0.55;
    // Smart pass: maybe a player behind us also has this color or rainbow and will blow it up first!
    return true;
  }

  // Master AI might also pass on high-tension board (sum >= 10) if other players with same color are behind
  if (
    difficulty === 'master' &&
    currentSum >= 10 &&
    entry.card > 0 &&
    remainingUnplacedEntries.some(
      (other) => other.chip === entry.chip && other.card >= 2
    )
  ) {
    return true;
  }

  return false;
}
