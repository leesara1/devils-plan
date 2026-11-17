export type Suit = 'S' | 'H' | 'D' | 'C';
export type Rank = 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14;

export interface Card {
  id: string;
  suit: Suit;
  rank: Rank;
}

export type HandCategory = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

export interface HandEvaluation {
  category: HandCategory;
  categoryNameKo: string;
  categoryNameEn: string;
  tieBreakers: number[];
  scoringCardIds: string[];
  descriptionKo: string;
}

export type AIDifficulty = 'normal' | 'hard' | 'master';

export const SUIT_SYMBOL: Record<Suit, string> = {
  S: '♠',
  H: '♥',
  D: '♦',
  C: '♣',
};

export const SUIT_NAME_KO: Record<Suit, string> = {
  S: '스페이드',
  H: '하트',
  D: '다이아',
  C: '클로버',
};

export const RANK_LABEL: Record<Rank, string> = {
  2: '2',
  3: '3',
  4: '4',
  5: '5',
  6: '6',
  7: '7',
  8: '8',
  9: '9',
  10: '10',
  11: 'J',
  12: 'Q',
  13: 'K',
  14: 'A',
};

export const GRID_COORDS = [
  'A1', 'B1', 'C1', 'D1',
  'A2', 'B2', 'C2', 'D2',
  'A3', 'B3', 'C3', 'D3',
  'A4', 'B4', 'C4', 'D4',
] as const;

export const HAND_RANKINGS_META: Array<{
  category: HandCategory;
  nameKo: string;
  nameEn: string;
  summaryKo: string;
}> = [
  { category: 9, nameKo: '스트레이트 플러시', nameEn: 'Straight Flush', summaryKo: '숫자가 이어지고 문양이 같은 카드 5장' },
  { category: 8, nameKo: '포카드', nameEn: 'Four of a Kind', summaryKo: '숫자가 같은 카드 4장' },
  { category: 7, nameKo: '풀하우스', nameEn: 'Full House', summaryKo: '트리플(3장) + 원페어(2장)' },
  { category: 6, nameKo: '플러시', nameEn: 'Flush', summaryKo: '문양이 같은 카드 5장' },
  { category: 5, nameKo: '스트레이트', nameEn: 'Straight', summaryKo: '숫자가 연속으로 이어지는 카드 5장' },
  { category: 4, nameKo: '트리플', nameEn: 'Three of a Kind', summaryKo: '숫자가 같은 카드 3장' },
  { category: 3, nameKo: '투페어', nameEn: 'Two Pair', summaryKo: '2쌍의 페어 (2장 + 2장)' },
  { category: 2, nameKo: '원페어', nameEn: 'One Pair', summaryKo: '숫자가 같은 카드 2장' },
  { category: 1, nameKo: '하이카드', nameEn: 'High Card', summaryKo: '족보 미완성 시 가장 높은 숫자 카드 1장' },
];

export function createShuffledDeck(): Card[] {
  const suits: Suit[] = ['S', 'H', 'D', 'C'];
  const ranks: Rank[] = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];
  const deck: Card[] = [];

  for (const suit of suits) {
    for (const rank of ranks) {
      deck.push({
        id: `${suit}-${rank}`,
        suit,
        rank,
      });
    }
  }

  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }

  return deck;
}

export function formatRank(rank: number): string {
  return RANK_LABEL[rank as Rank] ?? String(rank);
}

function getStraightHighCard(sortedDescRanks: number[]): number | null {
  if (sortedDescRanks.length !== 5) return null;
  const unique = new Set(sortedDescRanks);
  if (unique.size !== 5) return null;

  // Normal straight: max - min === 4
  if (sortedDescRanks[0] - sortedDescRanks[4] === 4) {
    return sortedDescRanks[0];
  }

  // Wheel straight: A-5-4-3-2
  if (
    sortedDescRanks[0] === 14 &&
    sortedDescRanks[1] === 5 &&
    sortedDescRanks[2] === 4 &&
    sortedDescRanks[3] === 3 &&
    sortedDescRanks[4] === 2
  ) {
    return 5;
  }

  return null;
}

export function evaluateFiveCardHand(cards: Card[]): HandEvaluation {
  if (cards.length !== 5) {
    throw new Error(`Expected 5 cards for evaluation, received ${cards.length}`);
  }

  const sortedCards = [...cards].sort((a, b) => b.rank - a.rank);
  const ranksDesc = sortedCards.map((c) => c.rank);
  const isFlush = sortedCards.every((c) => c.suit === sortedCards[0].suit);
  const straightHigh = getStraightHighCard(ranksDesc);
  const isStraight = straightHigh !== null;

  // Group counts by rank
  const rankGroups = new Map<Rank, Card[]>();
  for (const card of sortedCards) {
    const existing = rankGroups.get(card.rank) ?? [];
    existing.push(card);
    rankGroups.set(card.rank, existing);
  }

  // Sort groups by (count desc, rank desc)
  const groups = Array.from(rankGroups.entries()).sort((a, b) => {
    if (b[1].length !== a[1].length) return b[1].length - a[1].length;
    return b[0] - a[0];
  });

  // 9. Straight Flush
  if (isFlush && isStraight && straightHigh !== null) {
    const label = straightHigh === 14 ? '로열 스트레이트 플러시' : `${formatRank(straightHigh)} 하이 스트레이트 플러시`;
    return {
      category: 9,
      categoryNameKo: '스트레이트 플러시',
      categoryNameEn: 'Straight Flush',
      tieBreakers: [straightHigh],
      scoringCardIds: sortedCards.map((c) => c.id),
      descriptionKo: label,
    };
  }

  // 8. Four of a Kind
  if (groups[0][1].length === 4) {
    const quadRank = groups[0][0];
    const kickerRank = groups[1][0];
    return {
      category: 8,
      categoryNameKo: '포카드',
      categoryNameEn: 'Four of a Kind',
      tieBreakers: [quadRank, kickerRank],
      scoringCardIds: groups[0][1].map((c) => c.id),
      descriptionKo: `${formatRank(quadRank)} 포카드 (키커 ${formatRank(kickerRank)})`,
    };
  }

  // 7. Full House
  if (groups[0][1].length === 3 && groups[1][1].length === 2) {
    const tripleRank = groups[0][0];
    const pairRank = groups[1][0];
    return {
      category: 7,
      categoryNameKo: '풀하우스',
      categoryNameEn: 'Full House',
      tieBreakers: [tripleRank, pairRank],
      scoringCardIds: sortedCards.map((c) => c.id),
      descriptionKo: `${formatRank(tripleRank)} 풀하우스 (${formatRank(tripleRank)}·${formatRank(pairRank)})`,
    };
  }

  // 6. Flush
  if (isFlush) {
    return {
      category: 6,
      categoryNameKo: '플러시',
      categoryNameEn: 'Flush',
      tieBreakers: ranksDesc,
      scoringCardIds: sortedCards.map((c) => c.id),
      descriptionKo: `${SUIT_SYMBOL[sortedCards[0].suit]} ${formatRank(ranksDesc[0])} 하이 플러시`,
    };
  }

  // 5. Straight
  if (isStraight && straightHigh !== null) {
    return {
      category: 5,
      categoryNameKo: '스트레이트',
      categoryNameEn: 'Straight',
      tieBreakers: [straightHigh],
      scoringCardIds: sortedCards.map((c) => c.id),
      descriptionKo: `${formatRank(straightHigh)} 하이 스트레이트`,
    };
  }

  // 4. Three of a Kind
  if (groups[0][1].length === 3) {
    const tripleRank = groups[0][0];
    const kickers = groups.slice(1).map((g) => g[0]);
    return {
      category: 4,
      categoryNameKo: '트리플',
      categoryNameEn: 'Three of a Kind',
      tieBreakers: [tripleRank, ...kickers],
      scoringCardIds: groups[0][1].map((c) => c.id),
      descriptionKo: `${formatRank(tripleRank)} 트리플`,
    };
  }

  // 3. Two Pair
  if (groups[0][1].length === 2 && groups[1][1].length === 2) {
    const highPair = groups[0][0];
    const lowPair = groups[1][0];
    const kicker = groups[2][0];
    return {
      category: 3,
      categoryNameKo: '투페어',
      categoryNameEn: 'Two Pair',
      tieBreakers: [highPair, lowPair, kicker],
      scoringCardIds: [...groups[0][1], ...groups[1][1]].map((c) => c.id),
      descriptionKo: `${formatRank(highPair)}·${formatRank(lowPair)} 투페어`,
    };
  }

  // 2. One Pair
  if (groups[0][1].length === 2) {
    const pairRank = groups[0][0];
    const kickers = groups.slice(1).map((g) => g[0]);
    return {
      category: 2,
      categoryNameKo: '원페어',
      categoryNameEn: 'One Pair',
      tieBreakers: [pairRank, ...kickers],
      scoringCardIds: groups[0][1].map((c) => c.id),
      descriptionKo: `${formatRank(pairRank)} 원페어`,
    };
  }

  // 1. High Card
  return {
    category: 1,
    categoryNameKo: '하이카드',
    categoryNameEn: 'High Card',
    tieBreakers: ranksDesc,
    scoringCardIds: [sortedCards[0].id],
    descriptionKo: `${formatRank(ranksDesc[0])} 하이카드`,
  };
}

export function compareHands(a: HandEvaluation, b: HandEvaluation): -1 | 0 | 1 {
  if (a.category !== b.category) {
    return a.category > b.category ? 1 : -1;
  }

  const len = Math.max(a.tieBreakers.length, b.tieBreakers.length);
  for (let i = 0; i < len; i++) {
    const av = a.tieBreakers[i] ?? 0;
    const bv = b.tieBreakers[i] ?? 0;
    if (av !== bv) {
      return av > bv ? 1 : -1;
    }
  }

  return 0;
}

export function explainComparison(p1: HandEvaluation, p2: HandEvaluation): string {
  const cmp = compareHands(p1, p2);
  if (cmp === 0) {
    return `동일한 ${p1.categoryNameKo} 구성으로 무승부입니다 (문양 미비교)`;
  }

  const winner = cmp === 1 ? p1 : p2;
  const loser = cmp === 1 ? p2 : p1;
  const winnerTag = cmp === 1 ? 'P1' : '상대';

  if (winner.category !== loser.category) {
    return `${winner.categoryNameKo} 조합이 ${loser.categoryNameKo}보다 높아 ${winnerTag} 승리`;
  }

  // Same category tie-breaker explanation
  for (let i = 0; i < winner.tieBreakers.length; i++) {
    if (winner.tieBreakers[i] !== loser.tieBreakers[i]) {
      const wRank = formatRank(winner.tieBreakers[i]);
      const lRank = formatRank(loser.tieBreakers[i]);
      const isPrimaryCombo =
        (winner.category === 9 && i === 0) ||
        (winner.category === 8 && i === 0) ||
        (winner.category === 7 && i <= 1) ||
        (winner.category === 6 && i === 0) ||
        (winner.category === 5 && i === 0) ||
        (winner.category === 4 && i === 0) ||
        (winner.category === 3 && i <= 1) ||
        (winner.category === 2 && i === 0) ||
        (winner.category === 1 && i === 0);

      if (isPrimaryCombo) {
        return `같은 ${winner.categoryNameKo} 중 더 높은 숫자(${wRank} > ${lRank})로 ${winnerTag} 승리`;
      }
      return `조합 숫자가 같아 나머지 카드(${wRank} > ${lRank})가 더 큰 ${winnerTag} 승리`;
    }
  }

  return `${winnerTag} 승리`;
}

export interface BoardSolution {
  indices: [number, number];
  evaluation: HandEvaluation;
}

export function findBestBoardCombination(
  gridCards: Card[],
  communityCards: Card[]
): BoardSolution {
  let bestIndices: [number, number] = [0, 1];
  let bestEval = evaluateFiveCardHand([gridCards[0], gridCards[1], ...communityCards]);

  for (let i = 0; i < gridCards.length; i++) {
    for (let j = i + 1; j < gridCards.length; j++) {
      const evalResult = evaluateFiveCardHand([gridCards[i], gridCards[j], ...communityCards]);
      if (compareHands(evalResult, bestEval) === 1) {
        bestEval = evalResult;
        bestIndices = [i, j];
      }
    }
  }

  return { indices: bestIndices, evaluation: bestEval };
}

export function selectAICards(
  gridCards: Card[],
  communityCards: Card[],
  difficulty: AIDifficulty
): [number, number] {
  const allIndices = gridCards.map((_, idx) => idx);

  if (difficulty === 'master') {
    return findBestBoardCombination(gridCards, communityCards).indices;
  }

  // Normal remembers ~10 cards (62.5%), Hard remembers ~13 cards (81%)
  const memoryCount = difficulty === 'normal' ? 10 : 13;
  const shuffledIndices = [...allIndices];
  for (let i = shuffledIndices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffledIndices[i], shuffledIndices[j]] = [shuffledIndices[j], shuffledIndices[i]];
  }
  const remembered = shuffledIndices.slice(0, memoryCount);

  // Evaluate all pairs among remembered indices
  const candidates: Array<{ indices: [number, number]; evaluation: HandEvaluation }> = [];
  for (let a = 0; a < remembered.length; a++) {
    for (let b = a + 1; b < remembered.length; b++) {
      const i = remembered[a];
      const j = remembered[b];
      const evaluation = evaluateFiveCardHand([gridCards[i], gridCards[j], ...communityCards]);
      candidates.push({ indices: [i, j], evaluation });
    }
  }

  candidates.sort((x, y) => compareHands(y.evaluation, x.evaluation));

  // Normal AI occasionally picks the 2nd or 3rd best remembered pair (~25% chance)
  if (difficulty === 'normal' && candidates.length > 2 && Math.random() < 0.25) {
    const pickIdx = Math.random() < 0.65 ? 1 : 2;
    return candidates[pickIdx].indices;
  }

  return candidates[0].indices;
}
