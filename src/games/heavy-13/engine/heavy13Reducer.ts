import {
  AIDifficulty,
  ChipType,
  HALF_ROUND,
  PedestalColor,
  PedestalsState,
  PlacementEventLog,
  PlayerCount,
  PlayerState,
  RockCube,
  RockNumber,
  RoundHistoryRecord,
  SecretSubmission,
  TOTAL_ROUNDS,
  TurnOrderEntry,
  chooseAISubmission,
  computePlacementOrder,
  createEmptyPedestals,
  createInitialPlayers,
  replenishPlayerHands,
  resolveCubePlacement,
} from './heavy13';

export type GameShell = 'TITLE_MENU' | 'PLAYING' | 'PAUSED' | 'GAME_OVER';
export type GameMode = 'ai' | 'local';
export type RoundPhase =
  | 'SUBMISSION'
  | 'PASS_TO_HUMAN'
  | 'REVEAL_CHIPS'
  | 'REVEAL_CARDS'
  | 'PLACEMENT_STEP'
  | 'ROUND_SUMMARY';

export type LastPlacementEffect =
  | {
      kind: 'PASS';
      effectId: string;
    }
  | {
      kind: 'PLACE_SAFE';
      effectId: string;
      cubeId: string;
      color: PedestalColor;
    }
  | {
      kind: 'PLACE_BURST';
      effectId: string;
      burstId: string;
      color: PedestalColor;
      actorName: string;
      penaltyAdded: number;
      sumAfter: number;
      cubes: RockCube[];
    };

export interface Heavy13MatchState {
  shell: GameShell;
  mode: GameMode;
  playerCount: PlayerCount;
  aiDifficulty: AIDifficulty;
  roundNumber: number;
  players: PlayerState[];
  pedestals: PedestalsState;
  firstPlayerSeat: number;
  penaltySeq: number;
  roundHistory: RoundHistoryRecord[];
  phase: RoundPhase;
  humanSubmitQueue: number[];
  submissions: Record<string, SecretSubmission>;
  placementQueue: TurnOrderEntry[];
  deferredPassStack: TurnOrderEntry[];
  passedThisRoundIds: string[];
  roundLogs: PlacementEventLog[];
  roundPenalties: Record<string, number>;
  roundLastPenaltyPlayerId: string | null;
  highlightedPedestal: PedestalColor | null;
  showSet2Transition: boolean;
  cubeCounter: number;
  effectSeq: number;
  lastPlacementEffect: LastPlacementEffect | null;
}

export type Heavy13Action =
  | {
      type: 'START_MATCH';
      mode: GameMode;
      playerCount: PlayerCount;
      startingSeatChoice: number;
      aiDifficulty: AIDifficulty;
      initialFirstSeat?: number;
    }
  | {
      type: 'COMMIT_SUBMISSION';
      playerId: string;
      card: RockNumber;
      chip: ChipType;
    }
  | { type: 'BEGIN_HUMAN_SUBMISSION' }
  | { type: 'ADVANCE_TO_REVEAL_CARDS' }
  | { type: 'ADVANCE_TO_PLACEMENT' }
  | {
      type: 'EXECUTE_PLACEMENT';
      action: 'PASS' | 'PLACE';
      targetColor?: PedestalColor;
    }
  | { type: 'NEXT_ROUND' }
  | { type: 'DISMISS_SET2_TRANSITION' }
  | { type: 'SET_SHELL'; shell: GameShell };

export function createInitialMatchState(): Heavy13MatchState {
  return {
    shell: 'TITLE_MENU',
    mode: 'ai',
    playerCount: 4,
    aiDifficulty: 'hard',
    roundNumber: 1,
    players: [],
    pedestals: createEmptyPedestals(),
    firstPlayerSeat: 0,
    penaltySeq: 0,
    roundHistory: [],
    phase: 'SUBMISSION',
    humanSubmitQueue: [],
    submissions: {},
    placementQueue: [],
    deferredPassStack: [],
    passedThisRoundIds: [],
    roundLogs: [],
    roundPenalties: {},
    roundLastPenaltyPlayerId: null,
    highlightedPedestal: null,
    showSet2Transition: false,
    cubeCounter: 0,
    effectSeq: 0,
    lastPlacementEffect: null,
  };
}

function buildHumanSubmitQueue(
  currentPlayers: PlayerState[],
  firstSeat: number
): number[] {
  const n = currentPlayers.length;
  const orderedSeats = Array.from(
    { length: n },
    (_, offset) => (firstSeat + offset) % n
  );
  return orderedSeats.filter((seat) =>
    currentPlayers.some((p) => p.seatIndex === seat && p.isHuman)
  );
}

function createRoundStartPatch(
  nextRound: number,
  currentPlayers: PlayerState[],
  firstSeat: number
): Pick<
  Heavy13MatchState,
  | 'roundNumber'
  | 'humanSubmitQueue'
  | 'submissions'
  | 'placementQueue'
  | 'deferredPassStack'
  | 'passedThisRoundIds'
  | 'roundLogs'
  | 'roundPenalties'
  | 'roundLastPenaltyPlayerId'
  | 'highlightedPedestal'
  | 'lastPlacementEffect'
  | 'phase'
> {
  return {
    roundNumber: nextRound,
    humanSubmitQueue: buildHumanSubmitQueue(currentPlayers, firstSeat),
    submissions: {},
    placementQueue: [],
    deferredPassStack: [],
    passedThisRoundIds: [],
    roundLogs: [],
    roundPenalties: {},
    roundLastPenaltyPlayerId: null,
    highlightedPedestal: null,
    lastPlacementEffect: null,
    phase: 'SUBMISSION',
  };
}

function advanceAfterStepState(
  state: Heavy13MatchState,
  nextQueue: TurnOrderEntry[],
  nextPassStack: TurnOrderEntry[],
  nextPlayers: PlayerState[],
  nextPedestals: PedestalsState,
  nextPassedIds: string[],
  nextLogs: PlacementEventLog[],
  nextRoundPenalties: Record<string, number>,
  nextLastPenaltyId: string | null,
  nextHighlighted: PedestalColor | null,
  nextPenaltySeq: number,
  nextCubeCounter: number,
  nextEffectSeq: number,
  nextEffect: LastPlacementEffect | null
): Heavy13MatchState {
  if (nextQueue.length > 0) {
    return {
      ...state,
      players: nextPlayers,
      pedestals: nextPedestals,
      placementQueue: nextQueue,
      deferredPassStack: nextPassStack,
      passedThisRoundIds: nextPassedIds,
      roundLogs: nextLogs,
      roundPenalties: nextRoundPenalties,
      roundLastPenaltyPlayerId: nextLastPenaltyId,
      highlightedPedestal: nextHighlighted,
      penaltySeq: nextPenaltySeq,
      cubeCounter: nextCubeCounter,
      effectSeq: nextEffectSeq,
      lastPlacementEffect: nextEffect,
    };
  }

  if (nextPassStack.length > 0) {
    // Reverse pass order (LIFO) for deferred placements — no more passing allowed
    const reversedDeferred = [...nextPassStack]
      .reverse()
      .map((entry) => ({ ...entry, isDeferredPass: true }));
    return {
      ...state,
      players: nextPlayers,
      pedestals: nextPedestals,
      placementQueue: reversedDeferred,
      deferredPassStack: [],
      passedThisRoundIds: nextPassedIds,
      roundLogs: nextLogs,
      roundPenalties: nextRoundPenalties,
      roundLastPenaltyPlayerId: nextLastPenaltyId,
      highlightedPedestal: nextHighlighted,
      penaltySeq: nextPenaltySeq,
      cubeCounter: nextCubeCounter,
      effectSeq: nextEffectSeq,
      lastPlacementEffect: nextEffect,
    };
  }

  // All players placed -> finish round
  const nextFirstPlayerObj = nextLastPenaltyId
    ? nextPlayers.find((p) => p.id === nextLastPenaltyId)
    : null;
  const nextFirstSeat = nextFirstPlayerObj
    ? nextFirstPlayerObj.seatIndex
    : state.firstPlayerSeat;
  const prevFirstPlayerObj = nextPlayers.find(
    (p) => p.seatIndex === state.firstPlayerSeat
  );

  const cumulativeByPlayer: Record<string, number> = {};
  for (const p of nextPlayers) {
    cumulativeByPlayer[p.id] = p.penaltyPoints;
  }

  const nextHistoryRecord: RoundHistoryRecord = {
    roundNumber: state.roundNumber,
    submissionsByPlayer: state.submissions,
    passedPlayerIds: nextPassedIds,
    penaltiesByPlayer: nextRoundPenalties,
    cumulativeByPlayer,
    firstPlayerIdBefore: prevFirstPlayerObj?.id ?? nextPlayers[0].id,
    firstPlayerIdAfter:
      nextFirstPlayerObj?.id ?? prevFirstPlayerObj?.id ?? nextPlayers[0].id,
    logs: nextLogs,
  };

  return {
    ...state,
    players: nextPlayers,
    pedestals: nextPedestals,
    firstPlayerSeat: nextFirstSeat,
    placementQueue: [],
    deferredPassStack: [],
    passedThisRoundIds: nextPassedIds,
    roundLogs: nextLogs,
    roundPenalties: nextRoundPenalties,
    roundLastPenaltyPlayerId: nextLastPenaltyId,
    highlightedPedestal: nextHighlighted,
    penaltySeq: nextPenaltySeq,
    cubeCounter: nextCubeCounter,
    effectSeq: nextEffectSeq,
    lastPlacementEffect: nextEffect,
    roundHistory: [...state.roundHistory, nextHistoryRecord],
    phase: 'ROUND_SUMMARY',
  };
}

export function heavy13Reducer(
  state: Heavy13MatchState,
  action: Heavy13Action
): Heavy13MatchState {
  switch (action.type) {
    case 'START_MATCH': {
      const clampedSeat = Math.min(action.startingSeatChoice, action.playerCount - 1);
      const humanSeats =
        action.mode === 'ai'
          ? [clampedSeat]
          : Array.from({ length: action.playerCount }, (_, idx) => idx);

      const initialPlayers = createInitialPlayers(
        action.playerCount,
        humanSeats,
        action.mode
      );
      const firstSeat =
        action.initialFirstSeat !== undefined
          ? action.initialFirstSeat % action.playerCount
          : Math.floor(Math.random() * action.playerCount);

      return {
        ...createInitialMatchState(),
        shell: 'PLAYING',
        mode: action.mode,
        playerCount: action.playerCount,
        aiDifficulty: action.aiDifficulty,
        players: initialPlayers,
        firstPlayerSeat: firstSeat,
        ...createRoundStartPatch(1, initialPlayers, firstSeat),
      };
    }

    case 'COMMIT_SUBMISSION': {
      if (state.shell !== 'PLAYING' || state.phase !== 'SUBMISSION') return state;
      const submittingPlayer = state.players.find((p) => p.id === action.playerId);
      if (!submittingPlayer) return state;

      // Deduct card & chip from submitting player's hand immediately
      const updatedPlayers = state.players.map((p) => {
        if (p.id !== action.playerId) return p;
        return {
          ...p,
          cards: p.cards.filter((c) => c !== action.card),
          chips: {
            ...p.chips,
            [action.chip]: Math.max(0, p.chips[action.chip] - 1),
          },
        };
      });

      const nextSubmissions: Record<string, SecretSubmission> = {
        ...state.submissions,
        [action.playerId]: {
          playerId: action.playerId,
          card: action.card,
          chip: action.chip,
        },
      };

      const remainingHumanSeats = state.humanSubmitQueue.slice(1);
      if (remainingHumanSeats.length > 0) {
        return {
          ...state,
          players: updatedPlayers,
          submissions: nextSubmissions,
          humanSubmitQueue: remainingHumanSeats,
          phase: 'PASS_TO_HUMAN',
        };
      }

      // All humans submitted -> compute AI submissions strictly from public history & pedestals
      const finalSubmissions: Record<string, SecretSubmission> = {
        ...nextSubmissions,
      };
      const finalPlayers = updatedPlayers.map((p) => {
        if (p.isHuman) return p;
        const aiSub = chooseAISubmission(
          p,
          state.players,
          state.roundHistory,
          state.pedestals,
          state.firstPlayerSeat,
          state.roundNumber,
          state.aiDifficulty
        );
        finalSubmissions[p.id] = aiSub;
        return {
          ...p,
          cards: p.cards.filter((c) => c !== aiSub.card),
          chips: {
            ...p.chips,
            [aiSub.chip]: Math.max(0, p.chips[aiSub.chip] - 1),
          },
        };
      });

      return {
        ...state,
        players: finalPlayers,
        submissions: finalSubmissions,
        humanSubmitQueue: [],
        phase: 'REVEAL_CHIPS',
      };
    }

    case 'BEGIN_HUMAN_SUBMISSION': {
      if (state.phase !== 'PASS_TO_HUMAN') return state;
      return {
        ...state,
        phase: 'SUBMISSION',
      };
    }

    case 'ADVANCE_TO_REVEAL_CARDS': {
      if (state.phase !== 'REVEAL_CHIPS') return state;
      return {
        ...state,
        phase: 'REVEAL_CARDS',
      };
    }

    case 'ADVANCE_TO_PLACEMENT': {
      if (state.phase !== 'REVEAL_CARDS') return state;
      const ordered = computePlacementOrder(
        state.submissions,
        state.players,
        state.firstPlayerSeat
      );
      return {
        ...state,
        placementQueue: ordered,
        deferredPassStack: [],
        phase: 'PLACEMENT_STEP',
      };
    }

    case 'EXECUTE_PLACEMENT': {
      if (
        state.shell !== 'PLAYING' ||
        state.phase !== 'PLACEMENT_STEP' ||
        state.placementQueue.length === 0
      ) {
        return state;
      }

      const head = state.placementQueue[0];
      const actor = state.players.find((p) => p.id === head.playerId);
      if (!actor) return state;

      const remainingQueue = state.placementQueue.slice(1);
      const nextEffectSeq = state.effectSeq + 1;

      if (action.action === 'PASS') {
        if (
          head.isDeferredPass ||
          state.passedThisRoundIds.includes(actor.id) ||
          state.placementQueue.length <= 1
        ) {
          return state;
        }

        const logEntry: PlacementEventLog = {
          id: `log-${state.roundNumber}-${state.roundLogs.length + 1}`,
          playerId: actor.id,
          playerName: actor.name,
          chip: head.chip,
          card: head.card,
          action: 'PASS',
        };

        return advanceAfterStepState(
          state,
          remainingQueue,
          [...state.deferredPassStack, head],
          state.players,
          state.pedestals,
          [...state.passedThisRoundIds, actor.id],
          [...state.roundLogs, logEntry],
          state.roundPenalties,
          state.roundLastPenaltyPlayerId,
          null,
          state.penaltySeq,
          state.cubeCounter,
          nextEffectSeq,
          {
            kind: 'PASS',
            effectId: `eff-${nextEffectSeq}`,
          }
        );
      }

      // PLACE action
      const resolvedColor: PedestalColor =
        head.chip === 'rainbow' ? (action.targetColor ?? 'red') : head.chip;

      const nextCubeCounter = state.cubeCounter + 1;
      const cubeId = `cube-${state.roundNumber}-${nextCubeCounter}`;
      const preCubes = state.pedestals[resolvedColor];
      const newCube: RockCube = {
        id: cubeId,
        value: head.card,
        ownerId: actor.id,
        ownerName: actor.name,
        roundPlaced: state.roundNumber,
      };
      const resolution = resolveCubePlacement(
        state.pedestals,
        resolvedColor,
        newCube
      );

      let nextPlayers = state.players;
      let nextPenaltySeq = state.penaltySeq;
      let nextRoundPenalties = state.roundPenalties;
      let nextLastPenaltyId = state.roundLastPenaltyPlayerId;
      let nextEffect: LastPlacementEffect;

      if (resolution.overflowed && resolution.penaltyAdded > 0) {
        nextPenaltySeq = state.penaltySeq + 1;
        nextPlayers = state.players.map((p) =>
          p.id === actor.id
            ? {
                ...p,
                penaltyPoints: p.penaltyPoints + resolution.penaltyAdded,
                lastPenaltySeq: nextPenaltySeq,
                lastPenaltyRound: state.roundNumber,
              }
            : p
        );
        nextRoundPenalties = {
          ...state.roundPenalties,
          [actor.id]:
            (state.roundPenalties[actor.id] ?? 0) + resolution.penaltyAdded,
        };
        nextLastPenaltyId = actor.id;
        nextEffect = {
          kind: 'PLACE_BURST',
          effectId: `eff-${nextEffectSeq}`,
          burstId: `burst-${state.roundNumber}-${nextCubeCounter}`,
          color: resolvedColor,
          actorName: actor.name.replace(' AI', ''),
          penaltyAdded: resolution.penaltyAdded,
          sumAfter: resolution.sumAfter,
          cubes: [...preCubes, newCube],
        };
      } else {
        nextEffect = {
          kind: 'PLACE_SAFE',
          effectId: `eff-${nextEffectSeq}`,
          cubeId,
          color: resolvedColor,
        };
      }

      const logEntry: PlacementEventLog = {
        id: `log-${state.roundNumber}-${state.roundLogs.length + 1}`,
        playerId: actor.id,
        playerName: actor.name,
        chip: head.chip,
        card: head.card,
        action: 'PLACE',
        targetColor: resolvedColor,
        sumBefore: resolution.sumBefore,
        sumAfter: resolution.sumAfter,
        overflowed: resolution.overflowed,
        collectedCount: resolution.penaltyAdded,
      };

      return advanceAfterStepState(
        state,
        remainingQueue,
        state.deferredPassStack,
        nextPlayers,
        resolution.nextPedestals,
        state.passedThisRoundIds,
        [...state.roundLogs, logEntry],
        nextRoundPenalties,
        nextLastPenaltyId,
        resolvedColor,
        nextPenaltySeq,
        nextCubeCounter,
        nextEffectSeq,
        nextEffect
      );
    }

    case 'NEXT_ROUND': {
      if (state.phase !== 'ROUND_SUMMARY') return state;
      if (state.roundNumber >= TOTAL_ROUNDS) {
        return {
          ...state,
          shell: 'GAME_OVER',
        };
      }

      if (state.roundNumber === HALF_ROUND) {
        const replenished = replenishPlayerHands(state.players);
        return {
          ...state,
          players: replenished,
          showSet2Transition: true,
          ...createRoundStartPatch(
            state.roundNumber + 1,
            replenished,
            state.firstPlayerSeat
          ),
        };
      }

      return {
        ...state,
        showSet2Transition: false,
        ...createRoundStartPatch(
          state.roundNumber + 1,
          state.players,
          state.firstPlayerSeat
        ),
      };
    }

    case 'DISMISS_SET2_TRANSITION': {
      return {
        ...state,
        showSet2Transition: false,
      };
    }

    case 'SET_SHELL': {
      return {
        ...state,
        shell: action.shell,
      };
    }

    default:
      return state;
  }
}
