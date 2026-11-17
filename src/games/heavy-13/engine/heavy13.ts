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
  submissionsByPlayer: Record<string, SecretSubmission>;
  passedPlayerIds: string[];
  penaltiesByPlayer: Record<string, number>;
  cumulativeByPlayer: Record<string, number>;
  firstPlayerIdBefore: string;
  firstPlayerIdAfter: string;
  logs: PlacementEventLog[];
}

export function computeRemainingInCurrentSet(
  playerId: string,
  roundHistory: RoundHistoryRecord[],
  currentRoundNumber: number
): { cards: RockNumber[]; chips: ChipCounts } {
  const setStartRound = currentRoundNumber <= HALF_ROUND ? 1 : HALF_ROUND + 1;
  const setEndRound = currentRoundNumber <= HALF_ROUND ? HALF_ROUND : TOTAL_ROUNDS;

  const usedCards = new Set<RockNumber>();
  const chips: ChipCounts = createFullChips();

  for (const rec of roundHistory) {
    if (rec.roundNumber < setStartRound || rec.roundNumber > setEndRound) continue;
    const sub = rec.submissionsByPlayer[playerId];
    if (!sub) continue;
    usedCards.add(sub.card);
    chips[sub.chip] = Math.max(0, chips[sub.chip] - 1);
  }

  return {
    cards: ROCK_NUMBERS.filter((num) => !usedCards.has(num)),
    chips,
  };
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

export type PlayerCount = 3 | 4 | 5 | 6 | 7;

export function createInitialPlayers(
  playerCount: PlayerCount,
  humanSeatIndices: number[],
  mode: 'ai' | 'local'
): PlayerState[] {
  const aiNames = [
    '강지연 AI',
    '최민혁 AI',
    '윤서진 AI',
    '박도현 AI',
    '이수아 AI',
    '정태호 AI',
    '한예린 AI',
  ];
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

export interface RankedPlayer {
  player: PlayerState;
  rank: number;
  isTied: boolean;
  isEliminated: boolean;
}

/**
 * Final Rankings:
 * - Fewer penalty points ranks higher (1st place = lowest penalty).
 * - Most penalty points is last place.
 * - Tie-breaker: most recently penalized player (higher lastPenaltySeq) ranks LOWER.
 * - Players with identical penalty points who have NEVER been penalized (lastPenaltySeq === 0) share the same rank.
 * - Bottom 1 player is eliminated when total players <= 5; bottom 2 players are eliminated when total players >= 6.
 */
export function computeFinalRankings(players: PlayerState[]): RankedPlayer[] {
  const sorted = [...players].sort((a, b) => {
    if (a.penaltyPoints !== b.penaltyPoints) {
      return a.penaltyPoints - b.penaltyPoints;
    }
    if (a.lastPenaltySeq !== b.lastPenaltySeq) {
      return a.lastPenaltySeq - b.lastPenaltySeq;
    }
    return a.seatIndex - b.seatIndex;
  });

  const eliminationCount = sorted.length <= 5 ? 1 : 2;
  const ranks: number[] = [];

  for (let i = 0; i < sorted.length; i += 1) {
    if (
      i > 0 &&
      sorted[i].penaltyPoints === sorted[i - 1].penaltyPoints &&
      sorted[i].lastPenaltySeq === 0 &&
      sorted[i - 1].lastPenaltySeq === 0
    ) {
      ranks.push(ranks[i - 1]);
    } else {
      ranks.push(i + 1);
    }
  }

  return sorted.map((player, idx) => {
    const rank = ranks[idx];
    const isTied = ranks.filter((r) => r === rank).length > 1;
    const isEliminated = idx >= sorted.length - eliminationCount;
    return {
      player,
      rank,
      isTied,
      isEliminated,
    };
  });
}

// ==================== AI STRATEGY ENGINE ====================

function getPublicOpponentPools(
  selfId: string,
  allPlayers: PlayerState[],
  roundHistory: RoundHistoryRecord[],
  roundNumber: number
): Array<{
  player: PlayerState;
  cards: RockNumber[];
  chips: ChipCounts;
}> {
  return allPlayers
    .filter((p) => p.id !== selfId)
    .map((p) => {
      const remaining = computeRemainingInCurrentSet(p.id, roundHistory, roundNumber);
      return {
        player: p,
        cards: remaining.cards,
        chips: remaining.chips,
      };
    });
}

function getClockwiseDistance(seatIndex: number, firstPlayerSeat: number, totalPlayers: number): number {
  return (seatIndex - firstPlayerSeat + totalPlayers) % totalPlayers;
}

function goesBefore(
  aIsRainbow: boolean,
  aCard: RockNumber,
  aSeat: number,
  bIsRainbow: boolean,
  bCard: RockNumber,
  bSeat: number,
  firstPlayerSeat: number,
  totalPlayers: number
): boolean {
  if (aIsRainbow !== bIsRainbow) return aIsRainbow;
  if (aCard !== bCard) return aCard > bCard;
  return (
    getClockwiseDistance(aSeat, firstPlayerSeat, totalPlayers) <
    getClockwiseDistance(bSeat, firstPlayerSeat, totalPlayers)
  );
}

/**
 * Estimates opponent play probabilities strictly from publicly known remaining
 * cards/chips in the current set and current pedestal sums.
 */
function estimateOpponentActionWeights(
  oppCards: RockNumber[],
  oppChips: ChipCounts,
  pedestalSums: Record<PedestalColor, number>,
  remainingRoundsInHalf: number
): Array<{ card: RockNumber; chip: ChipType; weight: number }> {
  const availableChips = getAvailableChipTypes(oppChips);
  const candidates: Array<{ card: RockNumber; chip: ChipType; weight: number }> = [];

  for (const card of oppCards) {
    for (const chip of availableChips) {
      let w = 1.0;

      if (chip === 'rainbow') {
        const anySafe = PEDESTAL_COLORS.some((c) => pedestalSums[c] + card < OVERFLOW_THRESHOLD);
        const dangerCount = PEDESTAL_COLORS.filter((c) => pedestalSums[c] >= 9).length;
        // Opponents save rainbow unless pedestals are crowded or late in set
        if (!anySafe) {
          w = 0.25;
        } else if (remainingRoundsInHalf <= 1) {
          w = 2.4;
        } else if (dangerCount >= 2) {
          w = 1.5;
        } else {
          w = 0.45;
        }
      } else {
        const afterSum = pedestalSums[chip] + card;
        if (afterSum >= OVERFLOW_THRESHOLD) {
          // Opponents strongly avoid playing into an immediate burst
          w = card <= 2 ? 0.18 : 0.08;
        } else {
          const headroom = OVERFLOW_THRESHOLD - 1 - afterSum;
          w = 1.8 + (12 - headroom) * 0.15;
          // Opponents save '0' for high-tension pedestals
          if (card === 0 && pedestalSums[chip] <= 8) {
            w *= 0.35;
          } else if (card === 0 && pedestalSums[chip] >= 10) {
            w *= 2.2;
          }
          // Prefer chip color they still have 2 of
          if (oppChips[chip] === 2) {
            w *= 1.25;
          }
        }
      }

      candidates.push({ card, chip, weight: w });
    }
  }

  const totalWeight = candidates.reduce((acc, item) => acc + item.weight, 0);
  if (totalWeight <= 0) return candidates;
  return candidates.map((item) => ({ ...item, weight: item.weight / totalWeight }));
}

/**
 * Deterministic public-information risk & turn-order evaluation for a candidate (card, chip).
 */
function evaluateSubmissionCandidate(
  myCard: RockNumber,
  myChip: ChipType,
  self: PlayerState,
  opponentPools: Array<{ player: PlayerState; cards: RockNumber[]; chips: ChipCounts }>,
  pedestals: PedestalsState,
  firstPlayerSeat: number,
  remainingRoundsInHalf: number,
  difficulty: AIDifficulty
): number {
  const totalPlayers = opponentPools.length + 1;
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

  // Precompute opponent distributions from public pools only
  const oppDistributions = opponentPools.map((opp) => ({
    player: opp.player,
    dist: estimateOpponentActionWeights(opp.cards, opp.chips, sums, remainingRoundsInHalf),
  }));

  // 1. Expected placement position (0 = first, totalPlayers - 1 = last)
  let expectedBeforeCount = 0;
  for (const opp of oppDistributions) {
    let pBefore = 0;
    for (const item of opp.dist) {
      if (
        goesBefore(
          item.chip === 'rainbow',
          item.card,
          opp.player.seatIndex,
          myChip === 'rainbow',
          myCard,
          self.seatIndex,
          firstPlayerSeat,
          totalPlayers
        )
      ) {
        pBefore += item.weight;
      }
    }
    expectedBeforeCount += pBefore;
  }

  // 2. For each pedestal color, compute expected weight added BEFORE my turn & burst-reset probability
  const colorPressureBefore: Record<PedestalColor, number> = { red: 0, green: 0, blue: 0 };
  const colorBurstResetProb: Record<PedestalColor, number> = { red: 0, green: 0, blue: 0 };
  const colorContestAfter: Record<PedestalColor, number> = { red: 0, green: 0, blue: 0 };

  for (const opp of oppDistributions) {
    for (const item of opp.dist) {
      if (item.chip === 'rainbow') continue;
      const c = item.chip;
      const oppBefore = goesBefore(
        false,
        item.card,
        opp.player.seatIndex,
        myChip === 'rainbow',
        myCard,
        self.seatIndex,
        firstPlayerSeat,
        totalPlayers
      );

      if (oppBefore) {
        colorPressureBefore[c] += item.weight * item.card;
        if (sums[c] + item.card >= OVERFLOW_THRESHOLD) {
          colorBurstResetProb[c] += item.weight;
        }
      } else {
        colorContestAfter[c] += item.weight;
      }
    }
  }

  // Helper to evaluate landing on a specific pedestal color given arrival order
  const scoreLandingOnColor = (targetColor: PedestalColor): number => {
    const baseSum = sums[targetColor];
    const baseCount = counts[targetColor];

    // If opponents before me have high chance of bursting this pedestal, effective arrival sum drops
    const resetProb = Math.min(0.85, colorBurstResetProb[targetColor]);
    const nonBurstAdd = Math.max(0, colorPressureBefore[targetColor] - resetProb * 4.5);
    const expectedSumAtTurn =
      (1 - resetProb) * (baseSum + nonBurstAdd) + resetProb * 3.5;
    const expectedCountAtTurn =
      (1 - resetProb) * (baseCount + nonBurstAdd / 3.2) + resetProb * 1.0;

    const projectedAfter = expectedSumAtTurn + myCard;
    const directAfter = baseSum + myCard;

    let utility = 30;

    // Immediate burst check
    if (directAfter >= OVERFLOW_THRESHOLD) {
      // Only tolerable if someone before us is likely to burst & reset it first!
      const expectedPenalty = (1 - resetProb) * baseCount;
      utility -= expectedPenalty * 14;
      // Late order (lower card) gives a better chance to pass or let others burst first
      utility += expectedBeforeCount * 1.4;
      return utility;
    }

    // Arrival overflow risk (even if safe right now, earlier players could push it over 13!)
    if (projectedAfter >= OVERFLOW_THRESHOLD) {
      const overshoot = projectedAfter - (OVERFLOW_THRESHOLD - 1);
      const overflowLikelihood = Math.min(0.95, 0.28 + overshoot * 0.14);
      const estimatedPenalty = overflowLikelihood * expectedCountAtTurn;
      utility -= estimatedPenalty * 13;
    } else {
      // Safe landing! Reward putting pedestal into 10..12 if opponents are still behind on this color
      const headroom = OVERFLOW_THRESHOLD - 1 - projectedAfter;
      if (headroom <= 2 && colorContestAfter[targetColor] > 0.25) {
        utility += 6.5 - headroom * 1.2;
      } else {
        utility += Math.max(0, 4 - headroom * 0.35);
      }
    }

    // Slight bonus for acting earlier when pedestal is in the mid-danger zone (5..9)
    if (baseSum >= 5 && baseSum <= 9 && myChip !== 'rainbow') {
      const lateRatio = totalPlayers > 1 ? expectedBeforeCount / (totalPlayers - 1) : 0;
      utility -= lateRatio * 3.5;
    }

    return utility;
  };

  if (myChip === 'rainbow') {
    const bestColorScore = Math.max(
      ...PEDESTAL_COLORS.map((c) => scoreLandingOnColor(c))
    );

    // Conserve Rainbow chip for dangerous boards!
    const safeNormalExists = getAvailableChipTypes(self.chips)
      .filter((ch): ch is PedestalColor => ch !== 'rainbow')
      .some((ch) =>
        self.cards.some((c) => sums[ch] + c < OVERFLOW_THRESHOLD - 1)
      );

    const dangerPressure = PEDESTAL_COLORS.filter((c) => sums[c] >= 9).length;
    let rainbowConservePenalty = 0;
    if (remainingRoundsInHalf > 0) {
      if (safeNormalExists && dangerPressure === 0) {
        rainbowConservePenalty = 16 + remainingRoundsInHalf * 1.8;
      } else if (safeNormalExists && dangerPressure === 1) {
        rainbowConservePenalty = 10 + remainingRoundsInHalf * 1.3;
      } else if (remainingRoundsInHalf > 2) {
        rainbowConservePenalty = 5;
      }
    }

    // Also conserve high-value Rainbow+0/1 combo unless urgent
    if (myCard === 0 && remainingRoundsInHalf > 1) {
      rainbowConservePenalty += 8;
    }

    return bestColorScore - rainbowConservePenalty;
  }

  let totalScore = scoreLandingOnColor(myChip);

  // Conserve '0' card for true defensive emergencies (pedestal sum >= 9)
  if (myCard === 0) {
    const targetSum = sums[myChip];
    const hasOtherPlayable = self.cards.some((c) => c > 0 && targetSum + c < OVERFLOW_THRESHOLD);
    if (targetSum >= 10) {
      // Clutch defensive save!
      totalScore += 11;
    } else if (targetSum >= 8) {
      totalScore += 4;
    } else if (hasOtherPlayable && remainingRoundsInHalf > 0) {
      totalScore -= 9 + remainingRoundsInHalf * 1.4;
    }
  }

  // Conserve high cards (5, 6) slightly if we only have empty pedestals and mid cards available
  if (myCard >= 5 && sums[myChip] >= 7) {
    // Playing 5/6 on a 7+ pedestal risks hitting 12-13 immediately
    if (sums[myChip] + myCard >= OVERFLOW_THRESHOLD) {
      totalScore -= 6;
    }
  }

  if (difficulty === 'normal') {
    // Normal difficulty intentionally mixes in noise/mistakes
    totalScore += (Math.random() - 0.5) * 18;
  } else if (difficulty === 'hard') {
    totalScore += (Math.random() - 0.5) * 3.5;
  }
  // Master difficulty follows the exact calculation deterministically (zero noise)

  return totalScore;
}

export function chooseAISubmission(
  player: PlayerState,
  allPlayers: PlayerState[],
  roundHistory: RoundHistoryRecord[],
  pedestals: PedestalsState,
  firstPlayerSeat: number,
  roundNumber: number,
  difficulty: AIDifficulty
): SecretSubmission {
  const availableChips = getAvailableChipTypes(player.chips);
  const remainingInHalf =
    roundNumber <= HALF_ROUND
      ? HALF_ROUND - roundNumber
      : TOTAL_ROUNDS - roundNumber;

  // Strictly use public history pools for opponents — never peek at secret current-round submissions
  const opponentPools = getPublicOpponentPools(
    player.id,
    allPlayers,
    roundHistory,
    roundNumber
  );

  const scored: Array<{ card: RockNumber; chip: ChipType; score: number }> = [];

  for (const card of player.cards) {
    for (const chip of availableChips) {
      const score = evaluateSubmissionCandidate(
        card,
        chip,
        player,
        opponentPools,
        pedestals,
        firstPlayerSeat,
        remainingInHalf,
        difficulty
      );
      scored.push({ card, chip, score });
    }
  }

  scored.sort((a, b) => b.score - a.score);

  // Normal difficulty occasionally picks the 2nd or 3rd option as a human-like mistake
  if (difficulty === 'normal' && scored.length > 1 && Math.random() < 0.28) {
    const altIdx = Math.min(scored.length - 1, Math.random() < 0.7 ? 1 : 2);
    return {
      playerId: player.id,
      card: scored[altIdx].card,
      chip: scored[altIdx].chip,
    };
  }

  return {
    playerId: player.id,
    card: scored[0].card,
    chip: scored[0].chip,
  };
}

/**
 * Simulates what happens to the 3 pedestals if the current AI player PASSES,
 * using ONLY the already-revealed (chip, card) entries in `remainingInitialQueue`.
 * Note: Any player in `remainingInitialQueue` who places immediately OR passes
 * (and enters LIFO deferred stack above us) will execute BEFORE our deferred turn returns.
 */
function simulatePedestalsAfterPass(
  pedestals: PedestalsState,
  remainingInitialQueue: TurnOrderEntry[]
): PedestalsState {
  let simPedestals = pedestals;
  const simDeferredAfterMe: TurnOrderEntry[] = [];

  for (let i = 0; i < remainingInitialQueue.length; i += 1) {
    const opp = remainingInitialQueue[i];
    const isLastInInitial = i === remainingInitialQueue.length - 1;

    if (opp.chip === 'rainbow') {
      const safeColors = PEDESTAL_COLORS.filter(
        (c) => getPedestalSum(simPedestals[c]) + opp.card < OVERFLOW_THRESHOLD
      );
      if (safeColors.length > 0) {
        // Opponent picks highest safe sum to pressure others
        const target = [...safeColors].sort(
          (a, b) => getPedestalSum(simPedestals[b]) - getPedestalSum(simPedestals[a])
        )[0];
        simPedestals = resolveCubePlacement(simPedestals, target, {
          id: `sim-${i}`,
          value: opp.card,
          ownerId: opp.playerId,
          ownerName: opp.playerId,
          roundPlaced: 0,
        }).nextPedestals;
      } else if (!isLastInInitial) {
        simDeferredAfterMe.push(opp);
      } else {
        const minTarget = [...PEDESTAL_COLORS].sort(
          (a, b) => simPedestals[a].length - simPedestals[b].length
        )[0];
        simPedestals = resolveCubePlacement(simPedestals, minTarget, {
          id: `sim-${i}`,
          value: opp.card,
          ownerId: opp.playerId,
          ownerName: opp.playerId,
          roundPlaced: 0,
        }).nextPedestals;
      }
      continue;
    }

    const curSum = getPedestalSum(simPedestals[opp.chip]);
    const wouldOverflow = curSum + opp.card >= OVERFLOW_THRESHOLD;

    if (!wouldOverflow || isLastInInitial) {
      simPedestals = resolveCubePlacement(simPedestals, opp.chip, {
        id: `sim-${i}`,
        value: opp.card,
        ownerId: opp.playerId,
        ownerName: opp.playerId,
        roundPlaced: 0,
      }).nextPedestals;
    } else {
      // Opponent passes -> enters LIFO stack above us
      simDeferredAfterMe.push(opp);
    }
  }

  // Players who passed AFTER us execute in reverse order BEFORE our deferred turn returns
  for (let i = simDeferredAfterMe.length - 1; i >= 0; i -= 1) {
    const opp = simDeferredAfterMe[i];
    if (opp.chip === 'rainbow') {
      const safeColors = PEDESTAL_COLORS.filter(
        (c) => getPedestalSum(simPedestals[c]) + opp.card < OVERFLOW_THRESHOLD
      );
      const target =
        safeColors.length > 0
          ? [...safeColors].sort(
              (a, b) => getPedestalSum(simPedestals[b]) - getPedestalSum(simPedestals[a])
            )[0]
          : [...PEDESTAL_COLORS].sort(
              (a, b) => simPedestals[a].length - simPedestals[b].length
            )[0];
      simPedestals = resolveCubePlacement(simPedestals, target, {
        id: `sim-def-${i}`,
        value: opp.card,
        ownerId: opp.playerId,
        ownerName: opp.playerId,
        roundPlaced: 0,
      }).nextPedestals;
    } else {
      simPedestals = resolveCubePlacement(simPedestals, opp.chip, {
        id: `sim-def-${i}`,
        value: opp.card,
        ownerId: opp.playerId,
        ownerName: opp.playerId,
        roundPlaced: 0,
      }).nextPedestals;
    }
  }

  return simPedestals;
}

function getImmediatePenalty(
  pedestals: PedestalsState,
  color: PedestalColor,
  cardValue: RockNumber
): number {
  const sum = getPedestalSum(pedestals[color]);
  return sum + cardValue >= OVERFLOW_THRESHOLD ? pedestals[color].length : 0;
}

export function chooseAIRainbowDecision(
  pedestals: PedestalsState,
  cardValue: RockNumber,
  canPass: boolean,
  remainingInitialQueue: TurnOrderEntry[],
  difficulty: AIDifficulty
): { shouldPass: boolean; targetColor: PedestalColor } {
  const safeColors = PEDESTAL_COLORS.filter(
    (c) => getPedestalSum(pedestals[c]) + cardValue < OVERFLOW_THRESHOLD
  );

  if (safeColors.length > 0) {
    if (difficulty === 'normal') {
      const sorted = [...safeColors].sort(
        (a, b) => getPedestalSum(pedestals[a]) - getPedestalSum(pedestals[b])
      );
      return { shouldPass: false, targetColor: sorted[0] };
    }

    // Hard / Master: choose safe color that creates maximum trap pressure for revealed players behind us
    const ranked = [...safeColors].sort((a, b) => {
      const afterA = getPedestalSum(pedestals[a]) + cardValue;
      const afterB = getPedestalSum(pedestals[b]) + cardValue;

      const trapA = remainingInitialQueue.filter(
        (e) => e.chip === a && afterA + e.card >= OVERFLOW_THRESHOLD
      ).length;
      const trapB = remainingInitialQueue.filter(
        (e) => e.chip === b && afterB + e.card >= OVERFLOW_THRESHOLD
      ).length;

      if (trapA !== trapB) return trapB - trapA;
      return afterB - afterA;
    });
    return { shouldPass: false, targetColor: ranked[0] };
  }

  // All 3 pedestals would overflow right now!
  const bestMinNow = [...PEDESTAL_COLORS].sort((a, b) => {
    const countDiff = pedestals[a].length - pedestals[b].length;
    if (countDiff !== 0) return countDiff;
    return getPedestalSum(pedestals[a]) - getPedestalSum(pedestals[b]);
  })[0];
  const immediatePenalty = pedestals[bestMinNow].length;

  if (canPass && remainingInitialQueue.length > 0) {
    const pedestalsAfterPass = simulatePedestalsAfterPass(pedestals, remainingInitialQueue);
    const minPenaltyAfterPass = Math.min(
      ...PEDESTAL_COLORS.map((c) => getImmediatePenalty(pedestalsAfterPass, c, cardValue))
    );

    if (difficulty === 'normal') {
      // Normal AI sometimes passes even if unhelpful, or misses a helpful pass
      if (Math.random() < 0.35) return { shouldPass: true, targetColor: bestMinNow };
      return { shouldPass: minPenaltyAfterPass < immediatePenalty, targetColor: bestMinNow };
    }

    // Hard & Master: strictly pass ONLY if passing actually reduces penalty!
    if (minPenaltyAfterPass < immediatePenalty) {
      return { shouldPass: true, targetColor: bestMinNow };
    }
  }

  return { shouldPass: false, targetColor: bestMinNow };
}

export function shouldAINormalChipPass(
  pedestals: PedestalsState,
  entry: TurnOrderEntry,
  remainingInitialQueue: TurnOrderEntry[],
  difficulty: AIDifficulty
): boolean {
  if (entry.chip === 'rainbow') return false;
  if (remainingInitialQueue.length === 0) return false;

  const immediatePenalty = getImmediatePenalty(pedestals, entry.chip, entry.card);
  const pedestalsAfterPass = simulatePedestalsAfterPass(pedestals, remainingInitialQueue);
  const penaltyAfterPass = getImmediatePenalty(pedestalsAfterPass, entry.chip, entry.card);

  if (difficulty === 'normal') {
    // Normal makes occasional judgment errors
    if (immediatePenalty > 0 && Math.random() < 0.25) return true;
    if (penaltyAfterPass < immediatePenalty) return Math.random() < 0.7;
    return false;
  }

  // Hard & Master: ONLY pass when simulating the remaining revealed queue shows
  // passing strictly reduces the penalty we will receive! (Never pass unconditionally)
  return penaltyAfterPass < immediatePenalty;
}
