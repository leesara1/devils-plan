import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  BookOpen,
  Crown,
  Pause,
  Play,
  RotateCcw,
  SkipForward,
  Trophy,
  Volume2,
  VolumeX,
} from 'lucide-react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import arenaBackdrop from '../../assets/images/obsidian_brass_arena_1794918534030.jpg';
import { GameScreenProps } from '../types';
import { heavy13Sound } from './audio/heavy13Sound';
import { Heavy13HistoryPanel } from './components/Heavy13HistoryPanel';
import {
  ChipMiniEmblem,
  ChipTokenButton,
  PedestalBurstEffect,
  PedestalStation,
  RevealFlipCard,
  RockCardButton,
} from './components/Heavy13Pieces';
import { Heavy13ResultBoard } from './components/Heavy13ResultBoard';
import { Heavy13RulesModal } from './components/Heavy13RulesModal';
import {
  AIDifficulty,
  CHIP_META,
  ChipType,
  HALF_ROUND,
  OVERFLOW_THRESHOLD,
  PEDESTAL_COLORS,
  PEDESTAL_META,
  PedestalColor,
  PedestalsState,
  PlacementEventLog,
  PlayerCount,
  PlayerState,
  ROCK_NUMBERS,
  RockNumber,
  RoundHistoryRecord,
  SUBMISSION_SECONDS,
  SecretSubmission,
  TOTAL_ROUNDS,
  TurnOrderEntry,
  chooseAIRainbowDecision,
  chooseAISubmission,
  computeFinalRankings,
  computePlacementOrder,
  createEmptyPedestals,
  createInitialPlayers,
  getAvailableChipTypes,
  getPedestalSum,
  replenishPlayerHands,
  resolveCubePlacement,
  shouldAINormalChipPass,
} from './engine/heavy13';

type GameShell = 'TITLE_MENU' | 'PLAYING' | 'PAUSED' | 'GAME_OVER';
type GameMode = 'ai' | 'local';
type RoundPhase =
  | 'SUBMISSION'
  | 'PASS_TO_HUMAN'
  | 'REVEAL_CHIPS'
  | 'REVEAL_CARDS'
  | 'PLACEMENT_STEP'
  | 'ROUND_SUMMARY';

const AI_DIFFICULTY_LABEL: Record<AIDifficulty, string> = {
  normal: '보통',
  hard: '어려움',
  master: '마스터',
};

const PLAYER_CHART_COLORS = [
  'var(--color-gold-400)',
  'var(--color-lounge-sky-400)',
  'var(--color-rival-400)',
  '#34d399',
  '#c084fc',
  '#fb923c',
  '#2dd4bf',
];

export function Heavy13Game({ onExitToHub }: GameScreenProps) {
  // Shell & Configuration
  const [shell, setShell] = useState<GameShell>('TITLE_MENU');
  const [mode, setMode] = useState<GameMode>('ai');
  const [playerCount, setPlayerCount] = useState<PlayerCount>(4);
  const [startingSeatChoice, setStartingSeatChoice] = useState<number>(0);
  const [aiDifficulty, setAiDifficulty] = useState<AIDifficulty>('hard');
  const [memoryMode, setMemoryMode] = useState(false);
  const [muted, setMuted] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [bgFailed, setBgFailed] = useState(false);

  // Match State
  const [roundNumber, setRoundNumber] = useState(1);
  const [players, setPlayers] = useState<PlayerState[]>([]);
  const [pedestals, setPedestals] = useState<PedestalsState>(createEmptyPedestals);
  const [firstPlayerSeat, setFirstPlayerSeat] = useState(0);
  const [penaltySeq, setPenaltySeq] = useState(0);
  const [roundHistory, setRoundHistory] = useState<RoundHistoryRecord[]>([]);

  // Round State
  const [phase, setPhase] = useState<RoundPhase>('SUBMISSION');
  const [humanSubmitQueue, setHumanSubmitQueue] = useState<number[]>([]);
  const [submissions, setSubmissions] = useState<Record<string, SecretSubmission>>({});
  const [selectedCard, setSelectedCard] = useState<RockNumber | null>(null);
  const [selectedChip, setSelectedChip] = useState<ChipType | null>(null);
  const [submitTimeLeftMs, setSubmitTimeLeftMs] = useState(SUBMISSION_SECONDS * 1000);

  // Reveal & Placement Queue State
  const [placementQueue, setPlacementQueue] = useState<TurnOrderEntry[]>([]);
  const [deferredPassStack, setDeferredPassStack] = useState<TurnOrderEntry[]>([]);
  const [passedThisRoundIds, setPassedThisRoundIds] = useState<string[]>([]);
  const [roundLogs, setRoundLogs] = useState<PlacementEventLog[]>([]);
  const [roundPenalties, setRoundPenalties] = useState<Record<string, number>>({});
  const [roundLastPenaltyPlayerId, setRoundLastPenaltyPlayerId] = useState<string | null>(null);
  const [highlightedPedestal, setHighlightedPedestal] = useState<PedestalColor | null>(null);

  // Visual Presentation & Animation State (UI only; no rule changes)
  const [revealedCardIds, setRevealedCardIds] = useState<string[]>([]);
  const [newlyPlacedCubeId, setNewlyPlacedCubeId] = useState<string | null>(null);
  const [pedestalBurst, setPedestalBurst] = useState<PedestalBurstEffect | null>(null);
  const [showSet2Transition, setShowSet2Transition] = useState(false);

  const cubeCounterRef = useRef(0);
  const cubeDropTimerRef = useRef<number | null>(null);
  const burstTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (cubeDropTimerRef.current !== null) window.clearTimeout(cubeDropTimerRef.current);
      if (burstTimerRef.current !== null) window.clearTimeout(burstTimerRef.current);
    };
  }, []);

  const toggleMute = useCallback(() => {
    setMuted((prev) => {
      const next = !prev;
      heavy13Sound.setMuted(next);
      return next;
    });
  }, []);

  const currentSubmittingSeat = humanSubmitQueue[0] ?? null;
  const currentSubmittingPlayer =
    currentSubmittingSeat !== null
      ? players.find((p) => p.seatIndex === currentSubmittingSeat) ?? null
      : null;

  const activePlacementEntry = placementQueue[0] ?? null;
  const activePlacementPlayer = activePlacementEntry
    ? players.find((p) => p.id === activePlacementEntry.playerId) ?? null
    : null;

  const startRound = useCallback(
    (
      nextRound: number,
      currentPlayers: PlayerState[],
      currentFirstSeat: number
    ) => {
      // Build clockwise human submission queue starting from firstPlayerSeat
      const n = currentPlayers.length;
      const orderedSeats = Array.from({ length: n }, (_, offset) => (currentFirstSeat + offset) % n);
      const humanSeats = orderedSeats.filter((seat) =>
        currentPlayers.some((p) => p.seatIndex === seat && p.isHuman)
      );

      setRoundNumber(nextRound);
      setHumanSubmitQueue(humanSeats);
      setSubmissions({});
      setSelectedCard(null);
      setSelectedChip(null);
      setSubmitTimeLeftMs(SUBMISSION_SECONDS * 1000);
      setPlacementQueue([]);
      setDeferredPassStack([]);
      setPassedThisRoundIds([]);
      setRoundLogs([]);
      setRoundPenalties({});
      setRoundLastPenaltyPlayerId(null);
      setHighlightedPedestal(null);
      setRevealedCardIds([]);
      setNewlyPlacedCubeId(null);
      setPedestalBurst(null);
      setPhase('SUBMISSION');
    },
    []
  );

  const startMatch = useCallback(() => {
    const clampedSeat = Math.min(startingSeatChoice, playerCount - 1);
    const humanSeats =
      mode === 'ai'
        ? [clampedSeat]
        : Array.from({ length: playerCount }, (_, idx) => idx);

    const initialPlayers = createInitialPlayers(playerCount, humanSeats, mode);
    const randomFirstSeat = Math.floor(Math.random() * playerCount);
    cubeCounterRef.current = 0;

    setPlayers(initialPlayers);
    setPedestals(createEmptyPedestals());
    setFirstPlayerSeat(randomFirstSeat);
    setPenaltySeq(0);
    setRoundHistory([]);
    setShowSet2Transition(false);
    setShell('PLAYING');
    startRound(1, initialPlayers, randomFirstSeat);
  }, [mode, playerCount, startingSeatChoice, startRound]);

  // Helper to commit a human submission and advance either to next human or AI + Reveal
  const commitHumanSubmission = useCallback(
    (player: PlayerState, card: RockNumber, chip: ChipType) => {
      heavy13Sound.playSubmit();

      // Deduct card & chip from player's hand immediately
      const updatedPlayers = players.map((p) => {
        if (p.id !== player.id) return p;
        return {
          ...p,
          cards: p.cards.filter((c) => c !== card),
          chips: {
            ...p.chips,
            [chip]: Math.max(0, p.chips[chip] - 1),
          },
        };
      });

      const nextSubmissions: Record<string, SecretSubmission> = {
        ...submissions,
        [player.id]: { playerId: player.id, card, chip },
      };

      const remainingHumanSeats = humanSubmitQueue.slice(1);
      setSelectedCard(null);
      setSelectedChip(null);

      if (remainingHumanSeats.length > 0) {
        setPlayers(updatedPlayers);
        setSubmissions(nextSubmissions);
        setHumanSubmitQueue(remainingHumanSeats);
        setSubmitTimeLeftMs(SUBMISSION_SECONDS * 1000);
        setPhase('PASS_TO_HUMAN');
        return;
      }

      // All humans submitted -> compute AI submissions & deduct their cards/chips
      const finalSubmissions: Record<string, SecretSubmission> = { ...nextSubmissions };
      const finalPlayers = updatedPlayers.map((p) => {
        if (p.isHuman) return p;
        const aiSub = chooseAISubmission(
          p,
          players,
          roundHistory,
          pedestals,
          firstPlayerSeat,
          roundNumber,
          aiDifficulty
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

      setPlayers(finalPlayers);
      setSubmissions(finalSubmissions);
      setHumanSubmitQueue([]);
      heavy13Sound.playReveal();
      setPhase('REVEAL_CHIPS');
    },
    [players, submissions, humanSubmitQueue, roundHistory, pedestals, firstPlayerSeat, roundNumber, aiDifficulty]
  );

  const handleConfirmSubmission = useCallback(() => {
    if (shell !== 'PLAYING' || phase !== 'SUBMISSION') return;
    if (!currentSubmittingPlayer || selectedCard === null || selectedChip === null) return;
    commitHumanSubmission(currentSubmittingPlayer, selectedCard, selectedChip);
  }, [shell, phase, currentSubmittingPlayer, selectedCard, selectedChip, commitHumanSubmission]);

  // 3-minute submission timer
  useEffect(() => {
    if (shell !== 'PLAYING' || phase !== 'SUBMISSION' || rulesOpen || showSet2Transition) return;

    let last = performance.now();
    let rafId = 0;

    const tick = (now: number) => {
      const dt = Math.min(now - last, 120);
      last = now;
      setSubmitTimeLeftMs((prev) => Math.max(0, prev - dt));
      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [shell, phase, rulesOpen, showSet2Transition]);

  // Auto-submit random remaining card & chip if 3-minute timer expires
  useEffect(() => {
    if (shell !== 'PLAYING' || phase !== 'SUBMISSION' || showSet2Transition) return;
    if (submitTimeLeftMs > 0 || !currentSubmittingPlayer) return;

    const remainingCards = currentSubmittingPlayer.cards;
    const availableChips = getAvailableChipTypes(currentSubmittingPlayer.chips);

    if (remainingCards.length > 0 && availableChips.length > 0) {
      const randomCard = remainingCards[Math.floor(Math.random() * remainingCards.length)];
      const randomChip = availableChips[Math.floor(Math.random() * availableChips.length)];
      commitHumanSubmission(currentSubmittingPlayer, randomCard, randomChip);
    }
  }, [
    shell,
    phase,
    showSet2Transition,
    submitTimeLeftMs,
    currentSubmittingPlayer,
    commitHumanSubmission,
  ]);

  // Staged reveal: Chips (2.5s) -> Cards flip one by one -> Placement order showcase -> Placement Step
  useEffect(() => {
    if (shell !== 'PLAYING' || rulesOpen) return;

    if (phase === 'REVEAL_CHIPS') {
      const timer = window.setTimeout(() => {
        setRevealedCardIds([]);
        setPhase('REVEAL_CARDS');
      }, 2500);
      return () => window.clearTimeout(timer);
    }

    if (phase === 'REVEAL_CARDS') {
      const n = players.length;
      const clockwisePlayers = Array.from({ length: n }, (_, offset) => {
        const seat = (firstPlayerSeat + offset) % n;
        return players.find((p) => p.seatIndex === seat);
      }).filter((p): p is PlayerState => Boolean(p));

      setRevealedCardIds([]);
      const timers: number[] = [];

      clockwisePlayers.forEach((p, idx) => {
        const t = window.setTimeout(() => {
          heavy13Sound.playCardFlip();
          setRevealedCardIds((prev) => (prev.includes(p.id) ? prev : [...prev, p.id]));
        }, 160 + idx * 240);
        timers.push(t);
      });

      const finishMs = 160 + clockwisePlayers.length * 240 + 2100;
      const advanceTimer = window.setTimeout(() => {
        const ordered = computePlacementOrder(submissions, players, firstPlayerSeat);
        setPlacementQueue(ordered);
        setDeferredPassStack([]);
        setPhase('PLACEMENT_STEP');
      }, finishMs);
      timers.push(advanceTimer);

      return () => {
        timers.forEach((id) => window.clearTimeout(id));
      };
    }
  }, [shell, phase, rulesOpen, submissions, players, firstPlayerSeat]);

  const startPlacementImmediately = useCallback(() => {
    if (phase !== 'REVEAL_CARDS') return;
    setRevealedCardIds(players.map((p) => p.id));
    const ordered = computePlacementOrder(submissions, players, firstPlayerSeat);
    setPlacementQueue(ordered);
    setDeferredPassStack([]);
    setPhase('PLACEMENT_STEP');
  }, [phase, submissions, players, firstPlayerSeat]);

  // Advance queue or finish round after an action
  const advanceAfterStep = useCallback(
    (
      nextQueue: TurnOrderEntry[],
      nextPassStack: TurnOrderEntry[],
      nextPlayers: PlayerState[],
      nextLogs: PlacementEventLog[],
      nextRoundPenalties: Record<string, number>,
      nextLastPenaltyId: string | null
    ) => {
      if (nextQueue.length > 0) {
        setPlacementQueue(nextQueue);
        setDeferredPassStack(nextPassStack);
        return;
      }

      if (nextPassStack.length > 0) {
        // Reverse pass order (LIFO) for deferred placements — no more passing allowed
        const reversedDeferred = [...nextPassStack]
          .reverse()
          .map((entry) => ({ ...entry, isDeferredPass: true }));
        setPlacementQueue(reversedDeferred);
        setDeferredPassStack([]);
        return;
      }

      // All players placed -> finish round
      const nextFirstPlayerObj = nextLastPenaltyId
        ? nextPlayers.find((p) => p.id === nextLastPenaltyId)
        : null;
      const nextFirstSeat = nextFirstPlayerObj ? nextFirstPlayerObj.seatIndex : firstPlayerSeat;
      const prevFirstPlayerObj = nextPlayers.find((p) => p.seatIndex === firstPlayerSeat);

      const cumulativeByPlayer: Record<string, number> = {};
      for (const p of nextPlayers) {
        cumulativeByPlayer[p.id] = p.penaltyPoints;
      }

      setRoundHistory((prev) => [
        ...prev,
        {
          roundNumber,
          submissionsByPlayer: submissions,
          passedPlayerIds: passedThisRoundIds,
          penaltiesByPlayer: nextRoundPenalties,
          cumulativeByPlayer,
          firstPlayerIdBefore: prevFirstPlayerObj?.id ?? nextPlayers[0].id,
          firstPlayerIdAfter: nextFirstPlayerObj?.id ?? prevFirstPlayerObj?.id ?? nextPlayers[0].id,
          logs: nextLogs,
        },
      ]);

      setFirstPlayerSeat(nextFirstSeat);
      setPlacementQueue([]);
      setDeferredPassStack([]);
      setPhase('ROUND_SUMMARY');

      if (roundNumber === TOTAL_ROUNDS) {
        heavy13Sound.playMatchEnd();
      }
    },
    [firstPlayerSeat, roundNumber, submissions, passedThisRoundIds]
  );

  // Execute a Pass or Place for the head of placementQueue
  const executePlacementAction = useCallback(
    (action: 'PASS' | 'PLACE', targetColor?: PedestalColor) => {
      if (phase !== 'PLACEMENT_STEP' || placementQueue.length === 0) return;

      const head = placementQueue[0];
      const actor = players.find((p) => p.id === head.playerId);
      if (!actor) return;

      const remainingQueue = placementQueue.slice(1);

      if (action === 'PASS') {
        if (
          head.isDeferredPass ||
          passedThisRoundIds.includes(actor.id) ||
          placementQueue.length <= 1
        ) {
          return;
        }
        heavy13Sound.playPass();

        const logEntry: PlacementEventLog = {
          id: `log-${roundNumber}-${roundLogs.length + 1}`,
          playerId: actor.id,
          playerName: actor.name,
          chip: head.chip,
          card: head.card,
          action: 'PASS',
        };

        const nextLogs = [...roundLogs, logEntry];
        const nextPassStack = [...deferredPassStack, head];
        setPassedThisRoundIds((prev) => [...prev, actor.id]);
        setRoundLogs(nextLogs);
        setHighlightedPedestal(null);

        advanceAfterStep(
          remainingQueue,
          nextPassStack,
          players,
          nextLogs,
          roundPenalties,
          roundLastPenaltyPlayerId
        );
        return;
      }

      // PLACE action
      const resolvedColor: PedestalColor =
        head.chip === 'rainbow' ? (targetColor ?? 'red') : head.chip;

      cubeCounterRef.current += 1;
      const cubeId = `cube-${roundNumber}-${cubeCounterRef.current}`;
      const preCubes = pedestals[resolvedColor];
      const newCube = {
        id: cubeId,
        value: head.card,
        ownerId: actor.id,
        ownerName: actor.name,
        roundPlaced: roundNumber,
      };
      const resolution = resolveCubePlacement(pedestals, resolvedColor, newCube);

      setPedestals(resolution.nextPedestals);
      setHighlightedPedestal(resolvedColor);

      let nextPlayers = players;
      let nextPenaltySeq = penaltySeq;
      let nextRoundPenalties = roundPenalties;
      let nextLastPenaltyId = roundLastPenaltyPlayerId;

      if (resolution.overflowed && resolution.penaltyAdded > 0) {
        heavy13Sound.playOverflowPenalty();
        setNewlyPlacedCubeId(null);
        if (burstTimerRef.current !== null) window.clearTimeout(burstTimerRef.current);
        setPedestalBurst({
          id: `burst-${roundNumber}-${cubeCounterRef.current}`,
          color: resolvedColor,
          actorName: actor.name.replace(' AI', ''),
          penaltyAdded: resolution.penaltyAdded,
          sumAfter: resolution.sumAfter,
          cubes: [...preCubes, newCube],
        });
        burstTimerRef.current = window.setTimeout(() => {
          setPedestalBurst(null);
        }, 1100);

        nextPenaltySeq = penaltySeq + 1;
        setPenaltySeq(nextPenaltySeq);

        nextPlayers = players.map((p) =>
          p.id === actor.id
            ? {
                ...p,
                penaltyPoints: p.penaltyPoints + resolution.penaltyAdded,
                lastPenaltySeq: nextPenaltySeq,
                lastPenaltyRound: roundNumber,
              }
            : p
        );
        setPlayers(nextPlayers);

        nextRoundPenalties = {
          ...roundPenalties,
          [actor.id]: (roundPenalties[actor.id] ?? 0) + resolution.penaltyAdded,
        };
        setRoundPenalties(nextRoundPenalties);

        nextLastPenaltyId = actor.id;
        setRoundLastPenaltyPlayerId(actor.id);
      } else {
        heavy13Sound.playStonePlace();
        setNewlyPlacedCubeId(cubeId);
        if (cubeDropTimerRef.current !== null) window.clearTimeout(cubeDropTimerRef.current);
        cubeDropTimerRef.current = window.setTimeout(() => {
          setNewlyPlacedCubeId(null);
        }, 550);
      }

      const logEntry: PlacementEventLog = {
        id: `log-${roundNumber}-${roundLogs.length + 1}`,
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

      const nextLogs = [...roundLogs, logEntry];
      setRoundLogs(nextLogs);

      advanceAfterStep(
        remainingQueue,
        deferredPassStack,
        nextPlayers,
        nextLogs,
        nextRoundPenalties,
        nextLastPenaltyId
      );
    },
    [
      phase,
      placementQueue,
      players,
      passedThisRoundIds,
      roundNumber,
      roundLogs,
      deferredPassStack,
      roundPenalties,
      roundLastPenaltyPlayerId,
      pedestals,
      penaltySeq,
      advanceAfterStep,
    ]
  );

  // Automatic AI turn during PLACEMENT_STEP (waits cleanly if burst animation is playing)
  useEffect(() => {
    if (shell !== 'PLAYING' || phase !== 'PLACEMENT_STEP' || rulesOpen || pedestalBurst) return;
    if (!activePlacementEntry || !activePlacementPlayer || activePlacementPlayer.isHuman) return;

    const timer = window.setTimeout(() => {
      const remainingInitialQueue = placementQueue.slice(1);
      const canPass =
        !activePlacementEntry.isDeferredPass &&
        !passedThisRoundIds.includes(activePlacementPlayer.id) &&
        remainingInitialQueue.length > 0;

      if (activePlacementEntry.chip === 'rainbow') {
        const decision = chooseAIRainbowDecision(
          pedestals,
          activePlacementEntry.card,
          canPass,
          remainingInitialQueue,
          aiDifficulty
        );
        if (decision.shouldPass && canPass) {
          executePlacementAction('PASS');
        } else {
          executePlacementAction('PLACE', decision.targetColor);
        }
        return;
      }

      if (
        canPass &&
        shouldAINormalChipPass(pedestals, activePlacementEntry, remainingInitialQueue, aiDifficulty)
      ) {
        executePlacementAction('PASS');
      } else {
        executePlacementAction('PLACE', activePlacementEntry.chip);
      }
    }, 760);

    return () => window.clearTimeout(timer);
  }, [
    shell,
    phase,
    rulesOpen,
    pedestalBurst,
    activePlacementEntry,
    activePlacementPlayer,
    placementQueue,
    deferredPassStack,
    passedThisRoundIds,
    pedestals,
    aiDifficulty,
    executePlacementAction,
  ]);

  const handleNextRound = useCallback(() => {
    if (roundNumber >= TOTAL_ROUNDS) {
      setShell('GAME_OVER');
      return;
    }

    // After Round 7 ends, replenish full card & chip sets while KEEPING pedestals intact!
    if (roundNumber === HALF_ROUND) {
      const nextPlayers = replenishPlayerHands(players);
      setPlayers(nextPlayers);
      heavy13Sound.playSetTransition();
      startRound(roundNumber + 1, nextPlayers, firstPlayerSeat);
      setShowSet2Transition(true);
      return;
    }

    startRound(roundNumber + 1, players, firstPlayerSeat);
  }, [roundNumber, players, firstPlayerSeat, startRound]);

  // Global keyboard shortcuts (Esc to pause, M to mute)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'm' || e.key === 'M') {
        e.preventDefault();
        toggleMute();
        return;
      }
      if (e.key === 'Escape') {
        if (rulesOpen) {
          setRulesOpen(false);
          return;
        }
        if (shell === 'PLAYING') {
          setShell('PAUSED');
        } else if (shell === 'PAUSED') {
          setShell('PLAYING');
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [shell, rulesOpen, toggleMute]);

  const finalRankings = useMemo(() => computeFinalRankings(players), [players]);

  const penaltyProgressionData = useMemo(() => {
    const startRow: Record<string, string | number> = { round: '시작' };
    for (const p of players) {
      startRow[p.id] = 0;
    }

    const rows = [startRow];
    for (const rec of roundHistory) {
      const row: Record<string, string | number> = { round: `R${rec.roundNumber}` };
      for (const p of players) {
        row[p.id] = rec.cumulativeByPlayer[p.id] ?? 0;
      }
      rows.push(row);
    }
    return rows;
  }, [players, roundHistory]);

  const submitTimeDisplay = useMemo(() => {
    const totalSec = Math.ceil(submitTimeLeftMs / 1000);
    const min = Math.floor(totalSec / 60);
    const sec = totalSec % 60;
    return `${min}:${String(sec).padStart(2, '0')}`;
  }, [submitTimeLeftMs]);

  const phaseTitle = (() => {
    switch (phase) {
      case 'SUBMISSION':
        return '바위 카드 · 색깔 칩 비공개 제출';
      case 'PASS_TO_HUMAN':
        return '다음 플레이어 제출 준비';
      case 'REVEAL_CHIPS':
        return '색깔 칩 공개';
      case 'REVEAL_CARDS':
        return '바위 카드 공개 및 순서 결정';
      case 'PLACEMENT_STEP':
        return '바위 큐브 배치';
      case 'ROUND_SUMMARY':
        return `라운드 ${roundNumber} 종료`;
    }
  })();

  const previewPlacementOrder = useMemo(() => {
    if (
      (phase !== 'REVEAL_CHIPS' && phase !== 'REVEAL_CARDS') ||
      players.length === 0 ||
      Object.keys(submissions).length < players.length
    ) {
      return [];
    }
    return computePlacementOrder(submissions, players, firstPlayerSeat);
  }, [phase, players, submissions, firstPlayerSeat]);

  const allCardsRevealed =
    phase === 'REVEAL_CARDS' &&
    players.length > 0 &&
    revealedCardIds.length >= players.length;

  const isHumanPlacementTurn =
    phase === 'PLACEMENT_STEP' &&
    activePlacementEntry !== null &&
    activePlacementPlayer !== null &&
    activePlacementPlayer.isHuman;

  const humanCanPass =
    isHumanPlacementTurn &&
    !activePlacementEntry.isDeferredPass &&
    !passedThisRoundIds.includes(activePlacementPlayer.id) &&
    placementQueue.length > 1;

  const isRainbowSelectionActive =
    isHumanPlacementTurn && activePlacementEntry.chip === 'rainbow';

  return (
    <div className="relative min-h-screen w-full overflow-x-hidden bg-obsidian-900 text-[#f3f1ec] flex flex-col">
      {/* Studio Backdrop */}
      <div className="pointer-events-none fixed inset-0 z-0">
        {!bgFailed && (
          <img
            src={arenaBackdrop}
            alt="옵시디언과 브러시드 골드 아레나 배경"
            referrerPolicy="no-referrer"
            onError={() => setBgFailed(true)}
            className="w-full h-full object-cover opacity-35"
          />
        )}
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(circle at 50% 35%, rgba(22, 27, 42, 0.45) 0%, rgba(9, 10, 15, 0.9) 70%, rgba(7, 8, 12, 0.98) 100%)',
          }}
        />
      </div>

      {/* ================= TITLE SCREEN ================= */}
      {shell === 'TITLE_MENU' && (
        <main className="relative z-10 flex-1 flex flex-col justify-between px-6 py-8 sm:px-10 sm:py-10 max-w-6xl w-full mx-auto">
          <div className="flex items-center justify-between gap-2">
            <div>
              {onExitToHub && (
                <button
                  type="button"
                  onClick={onExitToHub}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-lounge-slate-700 bg-obsidian-850/90 text-xs font-medium text-lounge-slate-200 hover:border-gold-500/70 hover:text-white transition-colors cursor-pointer whitespace-nowrap"
                >
                  <ArrowLeft className="w-4 h-4 text-gold-400" />
                  게임 목록
                </button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setRulesOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-lounge-slate-700 bg-obsidian-850/90 text-xs font-medium text-lounge-slate-200 hover:border-gold-500/70 hover:text-white transition-colors cursor-pointer"
              >
                <BookOpen className="w-4 h-4 text-gold-400" />
                게임 규칙
              </button>
              <button
                type="button"
                onClick={toggleMute}
                aria-label={muted ? '소리 켜기' : '음소거'}
                className="min-w-[40px] min-h-[40px] inline-flex items-center justify-center rounded-lg border border-lounge-slate-700 bg-obsidian-850/90 text-lounge-slate-200 hover:border-gold-500/70 hover:text-white transition-colors cursor-pointer"
              >
                {muted ? (
                  <VolumeX className="w-4 h-4 text-rival-400" />
                ) : (
                  <Volume2 className="w-4 h-4 text-gold-400" />
                )}
              </button>
            </div>
          </div>

          <div className="my-auto grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-10 items-center py-6">
            {/* Left: SVG Title Lockup & Brief */}
            <div className="space-y-6">
              <svg
                viewBox="0 0 480 132"
                className="w-full max-w-[460px] h-auto"
                role="img"
                aria-label="무거운 13 Heavy 13"
              >
                {/* Weighted Pedestal & Cubes Emblem */}
                <g transform="translate(8, 14)">
                  <rect
                    x="4"
                    y="66"
                    width="70"
                    height="18"
                    rx="4"
                    fill="var(--color-obsidian-850)"
                    stroke="var(--color-gold-500)"
                    strokeWidth="2"
                  />
                  <rect
                    x="14"
                    y="38"
                    width="24"
                    height="24"
                    rx="4"
                    fill="var(--color-obsidian-800)"
                    stroke="var(--color-lounge-sky-400)"
                    strokeWidth="2"
                  />
                  <text
                    x="26"
                    y="55"
                    textAnchor="middle"
                    fill="var(--color-lounge-sky-300)"
                    fontSize="14"
                    fontWeight="700"
                    fontFamily="JetBrains Mono, monospace"
                  >
                    6
                  </text>
                  <rect
                    x="42"
                    y="38"
                    width="24"
                    height="24"
                    rx="4"
                    fill="var(--color-obsidian-800)"
                    stroke="var(--color-rival-400)"
                    strokeWidth="2"
                  />
                  <text
                    x="54"
                    y="55"
                    textAnchor="middle"
                    fill="var(--color-rival-400)"
                    fontSize="14"
                    fontWeight="700"
                    fontFamily="JetBrains Mono, monospace"
                  >
                    6
                  </text>
                  <rect
                    x="27"
                    y="10"
                    width="24"
                    height="24"
                    rx="4"
                    fill="var(--color-gold-400)"
                  />
                  <text
                    x="39"
                    y="27"
                    textAnchor="middle"
                    fill="var(--color-gold-950)"
                    fontSize="13"
                    fontWeight="700"
                    fontFamily="JetBrains Mono, monospace"
                  >
                    1
                  </text>
                </g>

                <text
                  x="104"
                  y="66"
                  fill="var(--color-gold-100)"
                  fontSize="48"
                  fontWeight="700"
                  fontFamily="Fraunces, Noto Sans KR, serif"
                  letterSpacing="-0.02em"
                >
                  무거운 13
                </text>
                <line
                  x1="106"
                  y1="82"
                  x2="368"
                  y2="82"
                  stroke="var(--color-gold-500)"
                  strokeOpacity="0.48"
                  strokeWidth="1.5"
                />
                <text
                  x="106"
                  y="108"
                  fill="var(--color-lounge-sky-300)"
                  fontSize="16"
                  fontWeight="600"
                  fontFamily="Plus Jakarta Sans, sans-serif"
                  letterSpacing="0.24em"
                >
                  HEAVY 13
                </text>
              </svg>

              <p className="max-w-lg text-base sm:text-lg text-lounge-slate-300 leading-relaxed text-pretty">
                빨강·초록·파랑 3개의 받침대 합계가 <strong className="text-rival-400 font-semibold">13 이상</strong>이 되지 않도록 바위 카드(0~6)와 색깔 칩을 제출해 <strong className="text-gold-200 font-semibold">14라운드</strong> 동안 벌점을 피하세요.
              </p>

              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs sm:text-sm text-lounge-slate-400">
                <span>바위 카드 0~6 · 색깔 칩 7개</span>
                <span aria-hidden="true">·</span>
                <span>7R 후 손패 재지급 (받침대 유지)</span>
                <span aria-hidden="true">·</span>
                <span>라운드당 1회 패스 역순 배치</span>
              </div>
            </div>

            {/* Right: Match Configuration */}
            <div className="obsidian-panel rounded-2xl p-6 sm:p-7 space-y-4">
              {/* Mode */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-lounge-slate-400">
                  대전 방식
                </label>
                <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl obsidian-subpanel">
                  <button
                    type="button"
                    onClick={() => setMode('ai')}
                    className={[
                      'py-2.5 px-3 rounded-lg text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap',
                      mode === 'ai'
                        ? 'bg-gold-400 text-gold-950'
                        : 'text-lounge-slate-300 hover:text-white',
                    ].join(' ')}
                  >
                    1P vs AI
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode('local')}
                    className={[
                      'py-2.5 px-3 rounded-lg text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap',
                      mode === 'local'
                        ? 'bg-gold-400 text-gold-950'
                        : 'text-lounge-slate-300 hover:text-white',
                    ].join(' ')}
                  >
                    로컬 멀티 대전
                  </button>
                </div>
              </div>

              {/* Player Count (3 to 7) */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-lounge-slate-400">
                  참가 인원
                </label>
                <div className="grid grid-cols-5 gap-1.5 p-1 rounded-xl obsidian-subpanel">
                  {([3, 4, 5, 6, 7] as const).map((count) => (
                    <button
                      key={count}
                      type="button"
                      onClick={() => {
                        setPlayerCount(count);
                        if (startingSeatChoice >= count) setStartingSeatChoice(0);
                      }}
                      className={[
                        'py-2 px-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap',
                        playerCount === count
                          ? 'bg-lounge-slate-700/90 text-gold-200 border border-gold-500/40'
                          : 'text-lounge-slate-300 hover:text-white',
                      ].join(' ')}
                    >
                      {count}인
                    </button>
                  ))}
                </div>
              </div>

              {/* Seat Position (in AI mode) */}
              {mode === 'ai' && (
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-lounge-slate-400">
                    내 좌석 선택 (1라운드 선 플레이어는 무작위 추첨)
                  </label>
                  <div className="flex flex-wrap gap-1.5 p-1.5 rounded-xl obsidian-subpanel">
                    {Array.from({ length: playerCount }, (_, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setStartingSeatChoice(idx)}
                        className={[
                          'flex-1 min-w-[64px] py-2 px-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap',
                          startingSeatChoice === idx
                            ? 'bg-lounge-slate-700/90 text-gold-200 border border-gold-500/40'
                            : 'text-lounge-slate-300 hover:text-white',
                        ].join(' ')}
                      >
                        {idx + 1}번 자리
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* AI Difficulty */}
              {mode === 'ai' && (
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-lounge-slate-400">
                    AI 전략 난이도
                  </label>
                  <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl obsidian-subpanel">
                    {(['normal', 'hard', 'master'] as AIDifficulty[]).map((diff) => (
                      <button
                        key={diff}
                        type="button"
                        onClick={() => setAiDifficulty(diff)}
                        className={[
                          'py-2 px-2 rounded-lg text-xs sm:text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap',
                          aiDifficulty === diff
                            ? 'bg-lounge-slate-700/90 text-gold-200 border border-gold-500/40'
                            : 'text-lounge-slate-300 hover:text-white',
                        ].join(' ')}
                      >
                        {AI_DIFFICULTY_LABEL[diff]}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Memory Mode (Original No-History Mode) */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-lounge-slate-400">
                  기억 모드 (원작 방식)
                </label>
                <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl obsidian-subpanel">
                  <button
                    type="button"
                    onClick={() => setMemoryMode(false)}
                    className={[
                      'py-2 px-2.5 rounded-lg text-xs sm:text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap',
                      !memoryMode
                        ? 'bg-lounge-slate-700/90 text-gold-200 border border-gold-500/40'
                        : 'text-lounge-slate-300 hover:text-white',
                    ].join(' ')}
                  >
                    기록 패널 표시
                  </button>
                  <button
                    type="button"
                    onClick={() => setMemoryMode(true)}
                    className={[
                      'py-2 px-2.5 rounded-lg text-xs sm:text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap',
                      memoryMode
                        ? 'bg-lounge-sky-900/80 text-lounge-sky-200 border border-lounge-sky-400/50'
                        : 'text-lounge-slate-300 hover:text-white',
                    ].join(' ')}
                  >
                    기억 모드 (숨김)
                  </button>
                </div>
              </div>

              <button
                type="button"
                onClick={startMatch}
                className="w-full py-3.5 px-6 rounded-xl bg-gold-400 hover:bg-gold-300 text-gold-950 font-bold text-base shadow-lg transition-colors flex items-center justify-center gap-2 cursor-pointer mt-2"
              >
                <Play className="w-5 h-5 fill-current" />
                게임 시작 (14라운드)
              </button>
            </div>
          </div>

          <p className="text-center text-xs text-lounge-slate-500 tracking-wide">
            제출 제한 시간 3분 · Esc: 일시정지 · M: 음소거
          </p>
        </main>
      )}

      {/* ================= ACTIVE PLAYING ARENA ================= */}
      {(shell === 'PLAYING' || shell === 'PAUSED' || shell === 'GAME_OVER') && (
        <div className="relative z-10 flex-1 flex flex-col max-w-6xl w-full mx-auto px-2.5 sm:px-6 py-2 sm:py-4 gap-2 sm:gap-4">
          {/* Top HUD */}
          <header className="obsidian-panel flex items-center justify-between gap-2 sm:gap-3 px-2.5 sm:px-4 py-1.5 sm:py-2.5 rounded-xl">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <span className="font-display font-bold text-sm sm:text-lg text-gold-200 whitespace-nowrap">
                무거운 13
              </span>
              <span className="text-lounge-slate-500" aria-hidden="true">·</span>
              <span className="font-mono-tabular text-xs sm:text-sm font-semibold text-lounge-slate-200 whitespace-nowrap">
                {roundNumber}/{TOTAL_ROUNDS}R
                <span className="hidden sm:inline text-lounge-slate-400 ml-1.5">
                  (세트 {roundNumber <= HALF_ROUND ? '1' : '2'})
                </span>
              </span>
              <span className="hidden md:inline text-lounge-slate-500" aria-hidden="true">·</span>
              <span className="hidden md:inline text-xs sm:text-sm font-semibold text-lounge-sky-300 truncate">
                {phaseTitle}
              </span>
              {memoryMode && (
                <>
                  <span className="hidden sm:inline text-lounge-slate-500" aria-hidden="true">·</span>
                  <span className="hidden sm:inline text-xs font-semibold text-gold-300 whitespace-nowrap">
                    기억 모드
                  </span>
                </>
              )}
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              {phase === 'SUBMISSION' && (
                <span
                  className={[
                    'font-mono-tabular text-xs sm:text-sm font-bold px-2 sm:px-2.5 py-1 rounded-lg obsidian-subpanel',
                    submitTimeLeftMs <= 15000 ? 'text-rival-400' : 'text-lounge-sky-300',
                  ].join(' ')}
                >
                  {submitTimeDisplay}
                </span>
              )}
              <button
                type="button"
                onClick={() => setRulesOpen(true)}
                aria-label="게임 규칙"
                className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-lg border border-lounge-slate-700 bg-obsidian-850 text-lounge-slate-200 hover:border-gold-500/70 hover:text-white transition-colors cursor-pointer"
              >
                <BookOpen className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={toggleMute}
                aria-label={muted ? '소리 켜기' : '음소거'}
                className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-lg border border-lounge-slate-700 bg-obsidian-850 text-lounge-slate-200 hover:border-gold-500/70 hover:text-white transition-colors cursor-pointer"
              >
                {muted ? (
                  <VolumeX className="w-4 h-4 text-rival-400" />
                ) : (
                  <Volume2 className="w-4 h-4 text-gold-400" />
                )}
              </button>
              <button
                type="button"
                onClick={() => setShell('PAUSED')}
                aria-label="일시정지"
                className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-lg border border-lounge-slate-700 bg-obsidian-850 text-lounge-slate-200 hover:border-gold-500/70 hover:text-white transition-colors cursor-pointer"
              >
                <Pause className="w-4 h-4" />
              </button>
            </div>
          </header>

          {/* Player Seating Strip (Clockwise order) */}
          <section
            aria-label="플레이어 현황"
            className={`grid gap-1.5 sm:gap-2.5 ${
              players.length === 3
                ? 'grid-cols-3'
                : players.length === 4
                  ? 'grid-cols-2 lg:grid-cols-4'
                  : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4'
            }`}
          >
            {players.map((p) => {
              const isFirst = p.seatIndex === firstPlayerSeat;
              const isTurn =
                (phase === 'SUBMISSION' && currentSubmittingPlayer?.id === p.id) ||
                (phase === 'PLACEMENT_STEP' && activePlacementPlayer?.id === p.id);
              const sub = submissions[p.id];
              const showChip =
                sub &&
                (phase === 'REVEAL_CHIPS' ||
                  phase === 'REVEAL_CARDS' ||
                  phase === 'PLACEMENT_STEP' ||
                  phase === 'ROUND_SUMMARY');
              const isCardFlipped =
                sub &&
                (phase === 'PLACEMENT_STEP' ||
                  phase === 'ROUND_SUMMARY' ||
                  (phase === 'REVEAL_CARDS' && revealedCardIds.includes(p.id)));
              const hasPassed = passedThisRoundIds.includes(p.id);

              return (
                <div
                  key={p.id}
                  className={[
                    'rounded-lg sm:rounded-xl border px-2.5 sm:px-3.5 py-1.5 sm:py-2.5 flex items-center justify-between gap-1.5 sm:gap-2.5 transition-colors',
                    isTurn
                      ? 'bg-obsidian-800 border-gold-400 shadow-[0_0_16px_rgba(229,193,88,0.16)]'
                      : 'bg-obsidian-850/90 border-lounge-slate-700/80',
                  ].join(' ')}
                >
                  <div className="min-w-0 flex-1 space-y-0.5 sm:space-y-1.5">
                    <div className="flex items-center justify-between gap-1">
                      <div className="flex items-center gap-1 sm:gap-1.5 min-w-0">
                        <span className="font-mono-tabular text-[10px] sm:text-[11px] text-lounge-slate-400 shrink-0">
                          {p.seatIndex + 1}번
                        </span>
                        <span className="text-[11px] sm:text-sm font-bold text-white truncate">
                          {p.name}
                        </span>
                      </div>
                      {isFirst && (
                        <span className="text-[10px] sm:text-[11px] font-bold text-gold-300 shrink-0">
                          선
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs">
                      <span className="font-mono-tabular text-rival-400 font-bold whitespace-nowrap">
                        벌점 {p.penaltyPoints}
                      </span>
                      <span className="text-lounge-slate-500" aria-hidden="true">·</span>
                      {showChip ? (
                        <span className="inline-flex items-center gap-1 sm:gap-1.5 font-mono-tabular text-lounge-slate-300 whitespace-nowrap">
                          <ChipMiniEmblem chip={sub.chip} size="sm" />
                          <span>{CHIP_META[sub.chip].shortKo}</span>
                          {hasPassed && (
                            <span className="text-lounge-sky-300 font-semibold">(패스)</span>
                          )}
                        </span>
                      ) : (
                        <span className="font-mono-tabular text-lounge-slate-400 whitespace-nowrap">
                          {p.cards.length}장
                        </span>
                      )}
                    </div>
                  </div>

                  {showChip && sub && (
                    <RevealFlipCard
                      value={sub.card}
                      flipped={Boolean(isCardFlipped)}
                      isHighlighted={isTurn}
                    />
                  )}
                </div>
              );
            })}
          </section>

          {/* Staged Reveal & Large Placement Order Showcase */}
          {(phase === 'REVEAL_CHIPS' || phase === 'REVEAL_CARDS') && (
            <section className="obsidian-sky-panel rounded-2xl p-4 sm:p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="space-y-1">
                  <h2 className="font-display text-lg sm:text-xl font-bold text-gold-200">
                    {phase === 'REVEAL_CHIPS'
                      ? '1단계 · 색깔 칩 공개'
                      : allCardsRevealed
                        ? '이번 라운드 배치 순서 확정'
                        : `2단계 · 바위 카드 공개 (${revealedCardIds.length}/${players.length})`}
                  </h2>
                  <p className="text-xs sm:text-sm text-lounge-slate-300">
                    {phase === 'REVEAL_CHIPS'
                      ? '모든 플레이어의 색깔 칩이 공개되었습니다. 잠시 후 시계 방향으로 바위 카드가 한 장씩 뒤집힙니다.'
                      : allCardsRevealed
                        ? `레인보우 우선 · 높은 숫자 순 · 선(${players.find((pl) => pl.seatIndex === firstPlayerSeat)?.name ?? ''}) 기준 시계 방향`
                        : '선 플레이어부터 시계 방향으로 제출한 바위 카드를 공개하고 있습니다...'}
                  </p>
                </div>

                {phase === 'REVEAL_CARDS' && (
                  <button
                    type="button"
                    onClick={startPlacementImmediately}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-gold-400 hover:bg-gold-300 text-gold-950 font-bold text-sm transition-colors cursor-pointer whitespace-nowrap"
                  >
                    <SkipForward className="w-4 h-4" />
                    바로 배치 진행
                  </button>
                )}
              </div>

              {phase === 'REVEAL_CARDS' && allCardsRevealed && previewPlacementOrder.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-2.5 pt-1">
                  {previewPlacementOrder.map((entry, idx) => {
                    const p = players.find((pl) => pl.id === entry.playerId);
                    if (!p) return null;
                    return (
                      <div
                        key={`order-spotlight-${entry.playerId}`}
                        className="animate-order-reveal rounded-xl border border-gold-400/50 bg-obsidian-900/95 px-3 py-3 flex flex-col justify-between gap-2 shadow-md"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono-tabular text-sm sm:text-base font-extrabold text-gold-300">
                            {idx + 1}번
                          </span>
                          <ChipMiniEmblem chip={entry.chip} size="sm" />
                        </div>
                        <div className="text-xs sm:text-sm font-bold text-white truncate">
                          {p.name}
                        </div>
                        <div className="flex items-center justify-between gap-1 text-[11px] font-mono-tabular text-lounge-slate-300 pt-1 border-t border-white/10">
                          <span>{CHIP_META[entry.chip].shortKo}</span>
                          <span className="font-bold text-gold-200">바위 {entry.card}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          )}

          {/* Center Stage: 3 Bearer Pedestals + Live Placement Queue/Feed */}
          <div className="grid grid-cols-1 lg:grid-cols-[1.6fr_1fr] gap-2.5 sm:gap-4 items-stretch">
            {/* 3 Pedestals */}
            <section className="obsidian-panel rounded-2xl p-2.5 sm:p-5 flex flex-col justify-between gap-2 sm:gap-3">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-xs sm:text-base font-bold text-gold-200">
                  짐꾼 받침대 (13 이상 수거)
                </h2>
                <span className="text-[11px] sm:text-xs text-lounge-slate-400 truncate">
                  {isRainbowSelectionActive
                    ? '배치할 받침대 선택'
                    : isHumanPlacementTurn
                      ? '합계·안전 여부 확인'
                      : '12 이하 안전'}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-1.5 sm:gap-3">
                {PEDESTAL_COLORS.map((color) => {
                  const previewValue =
                    isHumanPlacementTurn &&
                    (activePlacementEntry.chip === 'rainbow' ||
                      activePlacementEntry.chip === color)
                      ? activePlacementEntry.card
                      : phase === 'SUBMISSION' &&
                          selectedCard !== null &&
                          (selectedChip === color || selectedChip === 'rainbow')
                        ? selectedCard
                        : null;

                  return (
                    <PedestalStation
                      key={color}
                      color={color}
                      cubes={pedestals[color]}
                      isHighlightedTarget={
                        highlightedPedestal === color ||
                        (phase === 'PLACEMENT_STEP' && activePlacementEntry?.chip === color)
                      }
                      isSelectableTarget={isRainbowSelectionActive}
                      previewAddValue={previewValue}
                      isMyTurnPreview={isHumanPlacementTurn}
                      newlyPlacedCubeId={newlyPlacedCubeId}
                      burstEffect={pedestalBurst}
                      onSelectTarget={
                        isRainbowSelectionActive
                          ? () => executePlacementAction('PLACE', color)
                          : undefined
                      }
                    />
                  );
                })}
              </div>
            </section>

            {/* Right: Placement Queue & Round Log (collapsed on narrow mobile during submission so board + deck fit without scrolling) */}
            <aside
              className={[
                'obsidian-panel rounded-2xl p-3 sm:p-5 flex-col justify-between gap-3',
                phase === 'SUBMISSION' || phase === 'PASS_TO_HUMAN' ? 'hidden lg:flex' : 'flex',
              ].join(' ')}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-sm font-bold text-lounge-sky-300">
                    배치 순서 및 진행 기록
                  </h2>
                  <span className="font-mono-tabular text-xs text-lounge-slate-400">
                    {phase === 'SUBMISSION' || phase === 'PASS_TO_HUMAN'
                      ? '비공개 제출 중'
                      : `로그 ${roundLogs.length}건`}
                  </span>
                </div>

                {/* Live Placement Queue Preview */}
                {(phase === 'REVEAL_CARDS' || phase === 'PLACEMENT_STEP') && (
                  <div className="obsidian-subpanel rounded-xl p-3 space-y-2">
                    <div className="text-[11px] font-semibold text-lounge-slate-400">
                      남은 배치 대기열
                    </div>
                    <div className="flex flex-wrap gap-1.5 text-xs">
                      {placementQueue.map((entry, idx) => {
                        const p = players.find((pl) => pl.id === entry.playerId);
                        return (
                          <span
                            key={`${entry.playerId}-q-${idx}`}
                            className={[
                              'font-mono-tabular px-2 py-1 rounded border',
                              idx === 0 && phase === 'PLACEMENT_STEP'
                                ? 'bg-gold-400/20 border-gold-400 text-gold-200 font-bold'
                                : 'bg-obsidian-900 border-lounge-slate-700 text-lounge-slate-300',
                            ].join(' ')}
                          >
                            {p?.name.replace(' AI', '')} ({CHIP_META[entry.chip].shortKo}/{entry.card})
                          </span>
                        );
                      })}
                      {[...deferredPassStack]
                        .reverse()
                        .map((entry, idx) => {
                          const p = players.find((pl) => pl.id === entry.playerId);
                          return (
                            <span
                              key={`${entry.playerId}-def-${idx}`}
                              className="font-mono-tabular px-2 py-1 rounded border border-lounge-sky-400/40 bg-lounge-sky-900/40 text-lounge-sky-200"
                            >
                              보류: {p?.name.replace(' AI', '')} ({entry.card})
                            </span>
                          );
                        })}
                    </div>
                  </div>
                )}

                {/* Step-by-Step Logs */}
                <div className="obsidian-subpanel rounded-xl p-3 space-y-1.5 max-h-[210px] overflow-y-auto text-xs">
                  {roundLogs.length === 0 ? (
                    <p className="text-lounge-slate-500 py-4 text-center">
                      큐브가 배치되면 이곳에 기록이 표시됩니다.
                    </p>
                  ) : (
                    roundLogs.map((log) => (
                      <div
                        key={log.id}
                        className="flex items-center justify-between gap-2 py-1 border-b border-white/5 last:border-none"
                      >
                        <span className="text-lounge-slate-200 truncate">
                          <strong className="text-white">{log.playerName}</strong>
                          {log.action === 'PASS'
                            ? ` · 패스 (바위 ${log.card} 후순위)`
                            : ` · ${PEDESTAL_META[log.targetColor!].shortKo}에 +${log.card}`}
                        </span>
                        {log.action === 'PLACE' && (
                          <span
                            className={[
                              'font-mono-tabular font-semibold whitespace-nowrap',
                              log.overflowed ? 'text-rival-400' : 'text-lounge-slate-400',
                            ].join(' ')}
                          >
                            {log.overflowed
                              ? `폭발(${log.sumAfter}) +${log.collectedCount}벌점`
                              : `${log.sumBefore}→${log.sumAfter}`}
                          </span>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </aside>
          </div>

          {/* Bottom Interactive Action Deck */}
          {phase === 'SUBMISSION' && currentSubmittingPlayer && (
            <section className="obsidian-panel rounded-2xl p-2.5 sm:p-5 space-y-2.5 sm:space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3">
                <div className="flex items-center justify-between sm:block gap-2">
                  <h3 className="text-xs sm:text-base font-bold text-gold-200 truncate">
                    {currentSubmittingPlayer.name} · 카드 및 칩 선택
                  </h3>
                  <p className="hidden sm:block text-xs text-lounge-slate-400 mt-0.5">
                    바위 카드 1장과 색깔 칩 1개를 선택한 뒤 제출하세요.
                  </p>
                </div>
                <button
                  type="button"
                  disabled={selectedCard === null || selectedChip === null}
                  onClick={handleConfirmSubmission}
                  className="w-full sm:w-auto min-h-[44px] px-5 py-2.5 rounded-xl bg-gold-400 hover:bg-gold-300 disabled:bg-lounge-slate-800 disabled:text-lounge-slate-500 text-gold-950 font-bold text-sm transition-colors cursor-pointer disabled:cursor-not-allowed whitespace-nowrap"
                >
                  비공개 제출 확정
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-2.5 sm:gap-4">
                {/* 7 Rock Cards (0..6) */}
                <div className="space-y-1 sm:space-y-1.5">
                  <div className="text-[11px] sm:text-xs font-semibold text-lounge-slate-400">
                    바위 카드 ({currentSubmittingPlayer.cards.length}/7장)
                  </div>
                  <div className="grid grid-cols-7 gap-1 sm:gap-2">
                    {ROCK_NUMBERS.map((num) => (
                      <RockCardButton
                        key={num}
                        value={num}
                        available={currentSubmittingPlayer.cards.includes(num)}
                        selected={selectedCard === num}
                        onClick={() => {
                          heavy13Sound.playSelect();
                          setSelectedCard(num);
                        }}
                      />
                    ))}
                  </div>
                </div>

                {/* 4 Chip Types */}
                <div className="space-y-1 sm:space-y-1.5">
                  <div className="text-[11px] sm:text-xs font-semibold text-lounge-slate-400">
                    색깔 칩
                  </div>
                  <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
                    {(['red', 'green', 'blue', 'rainbow'] as ChipType[]).map((chip) => (
                      <ChipTokenButton
                        key={chip}
                        chip={chip}
                        count={currentSubmittingPlayer.chips[chip]}
                        selected={selectedChip === chip}
                        onClick={() => {
                          heavy13Sound.playSelect();
                          setSelectedChip(chip);
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </section>
          )}

          {phase === 'PASS_TO_HUMAN' && currentSubmittingPlayer && (
            <section className="obsidian-sky-panel rounded-2xl p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
              <div className="space-y-1">
                <h3 className="font-display text-lg sm:text-xl font-bold text-gold-200">
                  {currentSubmittingPlayer.name} 차례 준비
                </h3>
                <p className="text-xs sm:text-sm text-lounge-slate-300">
                  이전 플레이어의 제출은 비공개 저장되었습니다. 화면을 <strong className="text-white">{currentSubmittingPlayer.name}</strong>에게 넘겨주세요.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPhase('SUBMISSION')}
                className="w-full sm:w-auto min-h-[44px] px-5 py-3 rounded-xl bg-gold-400 hover:bg-gold-300 text-gold-950 font-bold text-sm transition-colors cursor-pointer whitespace-nowrap"
              >
                선택 시작
              </button>
            </section>
          )}

          {phase === 'PLACEMENT_STEP' && activePlacementEntry && activePlacementPlayer && (
            <section className="obsidian-panel rounded-2xl p-3 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
              {activePlacementPlayer.isHuman ? (
                <>
                  <div className="space-y-1">
                    <h3 className="text-sm sm:text-base font-bold text-gold-200">
                      {activePlacementPlayer.name}의 배치 차례 · {CHIP_META[activePlacementEntry.chip].labelKo} (바위 {activePlacementEntry.card})
                    </h3>
                    <p className="text-xs sm:text-sm text-lounge-slate-300">
                      {activePlacementEntry.chip === 'rainbow'
                        ? '위 3개 받침대 중 원하는 색상을 선택해 배치하거나, 1회 패스해 순서를 뒤로 미룰 수 있습니다.'
                        : (() => {
                            const curSum = getPedestalSum(pedestals[activePlacementEntry.chip]);
                            const nextSum = curSum + activePlacementEntry.card;
                            const willBoom = nextSum >= OVERFLOW_THRESHOLD;
                            return willBoom
                              ? `${PEDESTAL_META[activePlacementEntry.chip].labelKo}에 배치 시 합계 ${nextSum}으로 폭발합니다! (벌점 +${pedestals[activePlacementEntry.chip].length}점)`
                              : `${PEDESTAL_META[activePlacementEntry.chip].labelKo} 배치 후 합계는 ${nextSum}입니다.`;
                          })()}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 w-full sm:w-auto">
                    {humanCanPass && (
                      <button
                        type="button"
                        onClick={() => executePlacementAction('PASS')}
                        className="flex-1 sm:flex-none min-h-[44px] px-4 py-2.5 rounded-xl border border-lounge-sky-400/60 bg-lounge-sky-900/50 hover:bg-lounge-sky-900 text-lounge-sky-200 font-semibold text-xs sm:text-sm transition-colors cursor-pointer whitespace-nowrap"
                      >
                        패스 (후순위)
                      </button>
                    )}

                    {activePlacementEntry.chip === 'rainbow' ? (
                      PEDESTAL_COLORS.map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => executePlacementAction('PLACE', c)}
                          className="flex-1 sm:flex-none min-h-[44px] px-3.5 sm:px-4 py-2.5 rounded-xl bg-gold-400 hover:bg-gold-300 text-gold-950 font-bold text-xs sm:text-sm transition-colors cursor-pointer whitespace-nowrap"
                        >
                          {PEDESTAL_META[c].shortKo} 배치
                        </button>
                      ))
                    ) : (
                      <button
                        type="button"
                        onClick={() => executePlacementAction('PLACE', activePlacementEntry.chip as PedestalColor)}
                        className="flex-1 sm:flex-none min-h-[44px] px-5 py-2.5 rounded-xl bg-gold-400 hover:bg-gold-300 text-gold-950 font-bold text-sm transition-colors cursor-pointer whitespace-nowrap"
                      >
                        {PEDESTAL_META[activePlacementEntry.chip].shortKo} 받침대에 배치
                      </button>
                    )}
                  </div>
                </>
              ) : (
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-lounge-sky-300">
                    {activePlacementPlayer.name} 배치 중...
                  </h3>
                  <p className="text-xs sm:text-sm text-lounge-slate-300">
                    {CHIP_META[activePlacementEntry.chip].labelKo} · 바위 {activePlacementEntry.card} 배치를 결정하고 있습니다.
                  </p>
                </div>
              )}
            </section>
          )}

          {phase === 'ROUND_SUMMARY' && (
            <section className="obsidian-panel rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4">
              <div className="space-y-1">
                <h3 className="font-display text-xl font-bold text-gold-200">
                  라운드 {roundNumber} 종료
                </h3>
                <p className="text-xs sm:text-sm text-lounge-slate-300">
                  {roundLastPenaltyPlayerId
                    ? `마지막 벌점자 ${players.find((p) => p.id === roundLastPenaltyPlayerId)?.name} 님이 다음 라운드 선 플레이어가 됩니다.`
                    : '이번 라운드에는 벌점자가 없어 기존 선 플레이어가 유지됩니다.'}
                  {roundNumber === HALF_ROUND && (
                    <strong className="text-lounge-sky-300 ml-1.5">
                      · 7라운드 완료! 다음 라운드부터 카드와 칩 세트가 새로 지급됩니다 (받침대 유지).
                    </strong>
                  )}
                </p>
              </div>

              <button
                type="button"
                onClick={handleNextRound}
                className="px-5 py-3 rounded-xl bg-gold-400 hover:bg-gold-300 text-gold-950 font-bold text-sm transition-colors cursor-pointer whitespace-nowrap"
              >
                {roundNumber >= TOTAL_ROUNDS
                  ? '최종 순위 보기'
                  : `라운드 ${roundNumber + 1} 시작`}
              </button>
            </section>
          )}

          {!memoryMode && (
            <Heavy13HistoryPanel
              players={players}
              roundHistory={roundHistory}
              currentRoundNumber={roundNumber}
            />
          )}
        </div>
      )}

      {/* ================= PAUSE MODAL ================= */}
      {shell === 'PAUSED' && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/80 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="일시정지"
        >
          <div className="w-full max-w-sm obsidian-panel rounded-2xl p-6 space-y-4">
            <h2 className="font-display text-2xl font-bold text-gold-200">일시정지</h2>
            <p className="text-sm text-lounge-slate-300">무거운 13 경기가 잠시 멈췄습니다.</p>
            <div className="flex flex-col gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setShell('PLAYING')}
                className="w-full py-2.5 px-4 rounded-xl bg-gold-400 hover:bg-gold-300 text-gold-950 font-bold text-sm transition-colors cursor-pointer"
              >
                계속하기 (Esc)
              </button>
              <button
                type="button"
                onClick={() => setRulesOpen(true)}
                className="w-full py-2.5 px-4 rounded-xl border border-lounge-slate-700 bg-obsidian-850 hover:border-gold-500/70 text-lounge-slate-200 font-semibold text-sm transition-colors cursor-pointer"
              >
                게임 규칙 보기
              </button>
              <button
                type="button"
                onClick={startMatch}
                className="w-full py-2.5 px-4 rounded-xl border border-lounge-slate-700 bg-obsidian-850 hover:border-gold-500/70 text-lounge-slate-200 font-semibold text-sm transition-colors cursor-pointer"
              >
                새 게임 다시 시작
              </button>
              <button
                type="button"
                onClick={() => setShell('TITLE_MENU')}
                className="w-full py-2.5 px-4 rounded-xl border border-lounge-slate-800 text-lounge-slate-400 hover:text-white hover:border-lounge-slate-500 font-medium text-sm transition-colors cursor-pointer"
              >
                게임 타이틀로
              </button>
              {onExitToHub && (
                <button
                  type="button"
                  onClick={onExitToHub}
                  className="w-full py-2.5 px-4 rounded-xl border border-lounge-slate-800 text-lounge-slate-400 hover:text-white hover:border-lounge-slate-500 font-medium text-sm transition-colors cursor-pointer"
                >
                  전체 게임 목록으로
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ================= GAME OVER MODAL ================= */}
      {shell === 'GAME_OVER' && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/85 p-2.5 sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-label="무거운 13 최종 결과"
        >
          <div className="w-full max-w-4xl max-h-[94vh] overflow-y-auto obsidian-panel rounded-2xl p-3.5 sm:p-7 space-y-4 sm:space-y-5">
            {(() => {
              const topWinners = finalRankings.filter((r) => r.rank === 1);
              const eliminationCount = players.length <= 5 ? 1 : 2;
              const headline =
                topWinners.length > 1
                  ? `${topWinners.map((w) => w.player.name).join(', ')} 공동 우승`
                  : `${topWinners[0]?.player.name ?? ''} 최종 우승`;
              return (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gold-400/15 border border-gold-400/50 text-gold-200 flex items-center justify-center shrink-0">
                    <Trophy className="w-5 h-5 sm:w-6 sm:h-6" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="font-display text-xl sm:text-2xl font-bold text-white truncate">
                      {headline}
                    </h2>
                    <p className="text-xs sm:text-sm text-lounge-slate-300 mt-0.5">
                      14라운드 종료 · 하위 {eliminationCount}명 탈락 (동점 시 최근 벌점자가 하위, 무벌점 동점은 공동 순위)
                    </p>
                  </div>
                </div>
              );
            })()}

            {/* Standings Table */}
            <div className="obsidian-subpanel rounded-xl divide-y divide-white/10">
              {finalRankings.map((item) => {
                const { player: p, rank, isTied, isEliminated } = item;
                const isWinner = rank === 1;
                return (
                  <div
                    key={p.id}
                    className="flex items-center justify-between gap-2 sm:gap-3 px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm"
                  >
                    <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                      <span
                        className={[
                          'font-mono-tabular font-bold min-w-[44px] sm:min-w-[54px] whitespace-nowrap',
                          isWinner
                            ? 'text-gold-300'
                            : isEliminated
                              ? 'text-rival-400'
                              : 'text-lounge-slate-300',
                        ].join(' ')}
                      >
                        {isTied ? `공동 ${rank}위` : `${rank}위`}
                      </span>
                      <span className="font-semibold text-white truncate flex items-center gap-1.5">
                        {isWinner && <Crown className="w-4 h-4 text-gold-400 shrink-0" />}
                        {p.name}
                      </span>
                      {isEliminated && (
                        <span className="text-[10px] sm:text-xs font-bold text-rival-400 border border-rival-400/50 bg-rival-950/60 px-1.5 sm:px-2 py-0.5 rounded whitespace-nowrap shrink-0">
                          탈락
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2.5 sm:gap-4 text-[11px] sm:text-xs font-mono-tabular shrink-0">
                      <span className="text-lounge-slate-400">
                        {p.lastPenaltyRound !== null ? (
                          <>
                            <span className="hidden sm:inline">최근 벌점 </span>R{p.lastPenaltyRound}
                          </>
                        ) : (
                          <>
                            <span className="hidden sm:inline">벌점 기록 없음</span>
                            <span className="sm:hidden">무벌점</span>
                          </>
                        )}
                      </span>
                      <span
                        className={[
                          'text-xs sm:text-sm font-bold',
                          isEliminated ? 'text-rival-400' : isWinner ? 'text-gold-200' : 'text-white',
                        ].join(' ')}
                      >
                        {p.penaltyPoints}점
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Broadcast-Style Round Penalty Board & Per-Player Stats */}
            <Heavy13ResultBoard
              finalRankings={finalRankings}
              roundHistory={roundHistory}
            />

            {/* Penalty Progression Line Chart */}
            <div className="obsidian-subpanel rounded-xl p-3 sm:p-4 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-xs sm:text-sm font-semibold text-lounge-slate-200">
                  라운드별 누적 벌점 추이 (1R–14R)
                </h3>
                <span className="font-mono-tabular text-xs text-lounge-sky-300">
                  낮을수록 유리
                </span>
              </div>
              <div className="w-full h-[210px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={penaltyProgressionData}
                    margin={{ top: 8, right: 12, left: -16, bottom: 2 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="rgba(148, 163, 184, 0.14)"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="round"
                      stroke="var(--color-lounge-slate-400)"
                      tick={{ fill: 'var(--color-lounge-slate-300)', fontSize: 11 }}
                      axisLine={{ stroke: 'rgba(148, 163, 184, 0.25)' }}
                      tickLine={false}
                    />
                    <YAxis
                      allowDecimals={false}
                      stroke="var(--color-lounge-slate-400)"
                      tick={{ fill: 'var(--color-lounge-slate-300)', fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'var(--color-obsidian-850)',
                        borderColor: 'var(--color-lounge-slate-700)',
                        borderRadius: '0.5rem',
                        fontSize: '12px',
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '6px' }} />
                    {players.map((p, idx) => (
                      <Line
                        key={p.id}
                        type="monotone"
                        dataKey={p.id}
                        name={p.name}
                        stroke={PLAYER_CHART_COLORS[idx % PLAYER_CHART_COLORS.length]}
                        strokeWidth={2.2}
                        dot={{ r: 3 }}
                        isAnimationActive={false}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2.5 sm:gap-3 pt-1">
              {onExitToHub && (
                <button
                  type="button"
                  onClick={onExitToHub}
                  className="min-h-[44px] px-4 py-2.5 rounded-xl border border-lounge-slate-700 text-sm font-medium text-lounge-slate-200 hover:border-gold-500/70 hover:text-white transition-colors cursor-pointer"
                >
                  게임 목록
                </button>
              )}
              <button
                type="button"
                onClick={() => setShell('TITLE_MENU')}
                className="min-h-[44px] px-4 py-2.5 rounded-xl border border-lounge-slate-700 text-sm font-medium text-lounge-slate-200 hover:border-gold-500/70 hover:text-white transition-colors cursor-pointer"
              >
                타이틀로
              </button>
              <button
                type="button"
                onClick={startMatch}
                className="flex-1 sm:flex-none min-h-[44px] inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl bg-gold-400 hover:bg-gold-300 text-gold-950 font-bold text-sm transition-colors cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                다시 플레이
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= SET 2 REPLENISHMENT TRANSITION SCREEN ================= */}
      {shell === 'PLAYING' && showSet2Transition && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/85 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="2세트 시작 및 카드 재지급 안내"
        >
          <div className="w-full max-w-xl obsidian-panel rounded-2xl p-6 sm:p-8 space-y-6 animate-order-reveal">
            <div className="space-y-2 text-center">
              <div className="font-mono-tabular text-xs font-bold tracking-widest text-lounge-sky-300">
                SET 2 · 라운드 8–14
              </div>
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-gold-200">
                2세트 시작 · 카드 재지급
              </h2>
              <p className="text-sm text-lounge-slate-300 leading-relaxed">
                7라운드가 종료되어 모든 플레이어에게 바위 카드와 색깔 칩 한 세트가 새로 지급되었습니다.
                <br />
                <strong className="text-white">기존 받침대 위의 바위 큐브는 초기화되지 않고 그대로 이어집니다.</strong>
              </p>
            </div>

            {/* Replenished Kit Preview */}
            <div className="obsidian-subpanel rounded-xl p-4 space-y-3">
              <div className="text-xs font-semibold text-lounge-slate-400">
                전원 재지급 세트 구성
              </div>
              <div className="flex flex-wrap items-center justify-center gap-1.5">
                {ROCK_NUMBERS.map((num) => (
                  <div
                    key={`set2-card-${num}`}
                    className="w-9 h-11 rounded-lg bg-obsidian-800 border border-gold-400/60 flex items-center justify-center font-mono-tabular text-base font-bold text-gold-100"
                  >
                    {num}
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap items-center justify-center gap-4 pt-1 text-xs text-lounge-slate-300 font-mono-tabular">
                <span className="inline-flex items-center gap-1.5">
                  <ChipMiniEmblem chip="red" size="sm" />
                  빨강 ×2
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <ChipMiniEmblem chip="green" size="sm" />
                  초록 ×2
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <ChipMiniEmblem chip="blue" size="sm" />
                  파랑 ×2
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <ChipMiniEmblem chip="rainbow" size="sm" />
                  레인보우 ×1
                </span>
              </div>
            </div>

            {/* Preserved Pedestal Snapshot */}
            <div className="grid grid-cols-3 gap-2.5">
              {PEDESTAL_COLORS.map((color) => {
                const curSum = getPedestalSum(pedestals[color]);
                return (
                  <div
                    key={`set2-ped-${color}`}
                    className="obsidian-subpanel rounded-xl p-3 text-center space-y-1"
                  >
                    <div className="text-xs font-bold text-lounge-slate-300">
                      {PEDESTAL_META[color].shortKo} 받침대
                    </div>
                    <div className="font-mono-tabular text-xl font-extrabold text-white">
                      {curSum}
                      <span className="text-xs font-normal text-lounge-slate-400"> / 13</span>
                    </div>
                    <div className="font-mono-tabular text-[11px] text-lounge-slate-400">
                      큐브 {pedestals[color].length}개 유지
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
              <span className="text-xs text-lounge-slate-300">
                8라운드 선 플레이어:{' '}
                <strong className="text-gold-200">
                  {players.find((p) => p.seatIndex === firstPlayerSeat)?.name ?? ''}
                </strong>
              </span>
              <button
                type="button"
                onClick={() => setShowSet2Transition(false)}
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gold-400 hover:bg-gold-300 text-gold-950 font-bold text-sm transition-colors cursor-pointer whitespace-nowrap"
              >
                라운드 8 시작하기
              </button>
            </div>
          </div>
        </div>
      )}

      <Heavy13RulesModal open={rulesOpen} onClose={() => setRulesOpen(false)} />
    </div>
  );
}
