import React, { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { GameScreenProps } from '../types';
import { heavy13Sound } from './audio/heavy13Sound';
import { PedestalBurstEffect } from './components/Heavy13Pieces';
import { Heavy13PlayArena } from './components/Heavy13PlayArena';
import { Heavy13ResultModal } from './components/Heavy13ResultModal';
import { Heavy13RulesModal } from './components/Heavy13RulesModal';
import { Heavy13TitleScreen } from './components/Heavy13TitleScreen';
import { Heavy13TutorialModal } from './components/Heavy13TutorialModal';
import {
  AIDifficulty,
  ChipType,
  PedestalColor,
  PlayerCount,
  PlayerState,
  RockNumber,
  TOTAL_ROUNDS,
  chooseAIRainbowDecision,
  computeFinalRankings,
  computePlacementOrder,
  getAvailableChipTypes,
  shouldAINormalChipPass,
} from './engine/heavy13';
import {
  GameMode,
  createInitialMatchState,
  heavy13Reducer,
} from './engine/heavy13Reducer';
import {
  SubmissionDeadline,
  buildSubmissionTurnKey,
  getSubmissionRemainingMs,
  isSubmissionDeadlineExpired,
  syncSubmissionDeadline,
} from './engine/submissionDeadline';

export function Heavy13Game({ onExitToHub }: GameScreenProps) {
  // Title Configuration & UI Preferences
  const [mode, setMode] = useState<GameMode>('ai');
  const [playerCount, setPlayerCount] = useState<PlayerCount>(4);
  const [startingSeatChoice, setStartingSeatChoice] = useState<number>(0);
  const [aiDifficulty, setAiDifficulty] = useState<AIDifficulty>('hard');
  const [memoryMode, setMemoryMode] = useState(false);
  const [muted, setMuted] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [tutorialOpen, setTutorialOpen] = useState(false);
  const [round1HintsEnabled, setRound1HintsEnabled] = useState(true);

  // Pure Reducer Match Engine
  const [state, dispatch] = useReducer(heavy13Reducer, undefined, createInitialMatchState);

  // Transient UI Input & Presentation State
  const [matchSeq, setMatchSeq] = useState(1);
  const [selectedCard, setSelectedCard] = useState<RockNumber | null>(null);
  const [selectedChip, setSelectedChip] = useState<ChipType | null>(null);
  const [submissionDeadline, setSubmissionDeadline] = useState<SubmissionDeadline | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [revealedCardIds, setRevealedCardIds] = useState<string[]>([]);
  const [newlyPlacedCubeId, setNewlyPlacedCubeId] = useState<string | null>(null);
  const [pedestalBurst, setPedestalBurst] = useState<PedestalBurstEffect | null>(null);

  const cubeDropTimerRef = useRef<number | null>(null);
  const burstTimerRef = useRef<number | null>(null);
  const lastEffectSeqRef = useRef<number>(0);
  const prevPhaseRef = useRef(state.phase);
  const prevSet2Ref = useRef(state.showSet2Transition);
  const autoSubmittedTurnKeysRef = useRef<Set<string>>(new Set());

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

  const currentSubmittingSeat = state.humanSubmitQueue[0] ?? null;
  const currentSubmittingPlayer =
    currentSubmittingSeat !== null
      ? state.players.find((p) => p.seatIndex === currentSubmittingSeat) ?? null
      : null;

  const currentTurnKey =
    state.phase === 'SUBMISSION' && currentSubmittingPlayer
      ? buildSubmissionTurnKey(matchSeq, state.roundNumber, currentSubmittingPlayer.id)
      : null;

  const isSubmissionTimerActive =
    state.shell === 'PLAYING' &&
    state.phase === 'SUBMISSION' &&
    !rulesOpen &&
    !state.showSet2Transition &&
    currentSubmittingPlayer !== null;

  const submitTimeLeftMs = getSubmissionRemainingMs(
    submissionDeadline,
    currentTurnKey,
    nowMs
  );

  const activePlacementEntry = state.placementQueue[0] ?? null;
  const activePlacementPlayer = activePlacementEntry
    ? state.players.find((p) => p.id === activePlacementEntry.playerId) ?? null
    : null;

  const clearPresentationTimers = useCallback(() => {
    if (cubeDropTimerRef.current !== null) {
      window.clearTimeout(cubeDropTimerRef.current);
      cubeDropTimerRef.current = null;
    }
    if (burstTimerRef.current !== null) {
      window.clearTimeout(burstTimerRef.current);
      burstTimerRef.current = null;
    }
  }, []);

  const startMatch = useCallback(() => {
    clearPresentationTimers();
    lastEffectSeqRef.current = 0;
    autoSubmittedTurnKeysRef.current.clear();
    setMatchSeq((seq) => seq + 1);
    setSelectedCard(null);
    setSelectedChip(null);
    setSubmissionDeadline(null);
    setNowMs(Date.now());
    setRevealedCardIds([]);
    setNewlyPlacedCubeId(null);
    setPedestalBurst(null);
    dispatch({
      type: 'START_MATCH',
      mode,
      playerCount,
      startingSeatChoice,
      aiDifficulty,
    });
  }, [mode, playerCount, startingSeatChoice, aiDifficulty, clearPresentationTimers]);

  // Reset UI selection when entering a new SUBMISSION step
  useEffect(() => {
    if (state.phase === 'SUBMISSION') {
      setSelectedCard(null);
      setSelectedChip(null);
    }
  }, [currentTurnKey, state.phase]);

  // Issue a fresh deadline per (matchSeq, roundNumber, playerId) and pause/resume accurately
  useEffect(() => {
    const now = Date.now();
    setNowMs(now);
    setSubmissionDeadline((prev) =>
      syncSubmissionDeadline(prev, {
        turnKey: currentTurnKey,
        roundNumber: state.roundNumber,
        playerId: currentSubmittingPlayer?.id ?? null,
        isTimerActive: isSubmissionTimerActive,
        now,
      })
    );
  }, [currentTurnKey, state.roundNumber, currentSubmittingPlayer?.id, isSubmissionTimerActive]);

  // Sound cues for REVEAL_CHIPS, ROUND_SUMMARY (14R match end), and Set 2 Transition
  useEffect(() => {
    if (prevPhaseRef.current !== state.phase) {
      if (state.phase === 'REVEAL_CHIPS') {
        heavy13Sound.playReveal();
      } else if (state.phase === 'ROUND_SUMMARY' && state.roundNumber === TOTAL_ROUNDS) {
        heavy13Sound.playMatchEnd();
      }
      prevPhaseRef.current = state.phase;
    }
  }, [state.phase, state.roundNumber]);

  useEffect(() => {
    if (!prevSet2Ref.current && state.showSet2Transition) {
      heavy13Sound.playSetTransition();
    }
    prevSet2Ref.current = state.showSet2Transition;
  }, [state.showSet2Transition]);

  // Drive placement sound, drop animation, and burst animation from pure reducer effect
  useEffect(() => {
    if (!state.lastPlacementEffect || state.shell === 'TITLE_MENU') {
      lastEffectSeqRef.current = 0;
      clearPresentationTimers();
      setNewlyPlacedCubeId(null);
      setPedestalBurst(null);
      return;
    }

    if (state.effectSeq <= lastEffectSeqRef.current) return;
    lastEffectSeqRef.current = state.effectSeq;

    const eff = state.lastPlacementEffect;
    if (eff.kind === 'PASS') {
      heavy13Sound.playPass();
      return;
    }

    if (eff.kind === 'PLACE_BURST') {
      heavy13Sound.playOverflowPenalty();
      setNewlyPlacedCubeId(null);
      if (burstTimerRef.current !== null) window.clearTimeout(burstTimerRef.current);
      setPedestalBurst({
        id: eff.burstId,
        color: eff.color,
        actorName: eff.actorName,
        penaltyAdded: eff.penaltyAdded,
        sumAfter: eff.sumAfter,
        cubes: eff.cubes,
      });
      // Runs unconditionally so pausing or opening rules mid-burst never traps burst state
      burstTimerRef.current = window.setTimeout(() => {
        burstTimerRef.current = null;
        setPedestalBurst(null);
      }, 1100);
      return;
    }

    heavy13Sound.playStonePlace();
    setNewlyPlacedCubeId(eff.cubeId);
    if (cubeDropTimerRef.current !== null) window.clearTimeout(cubeDropTimerRef.current);
    cubeDropTimerRef.current = window.setTimeout(() => {
      cubeDropTimerRef.current = null;
      setNewlyPlacedCubeId(null);
    }, 550);
  }, [state.effectSeq, state.lastPlacementEffect, state.shell, clearPresentationTimers]);

  const commitHumanSubmission = useCallback(
    (player: PlayerState, card: RockNumber, chip: ChipType) => {
      heavy13Sound.playSubmit();
      setSelectedCard(null);
      setSelectedChip(null);
      setSubmissionDeadline(null);
      dispatch({
        type: 'COMMIT_SUBMISSION',
        playerId: player.id,
        card,
        chip,
      });
    },
    []
  );

  const handleConfirmSubmission = useCallback(() => {
    if (state.shell !== 'PLAYING' || state.phase !== 'SUBMISSION' || rulesOpen) return;
    if (!currentSubmittingPlayer || selectedCard === null || selectedChip === null) return;
    commitHumanSubmission(currentSubmittingPlayer, selectedCard, selectedChip);
  }, [
    state.shell,
    state.phase,
    rulesOpen,
    currentSubmittingPlayer,
    selectedCard,
    selectedChip,
    commitHumanSubmission,
  ]);

  // 3-minute submission deadline display tick & auto-submit strictly scoped to current turn's deadline
  useEffect(() => {
    if (
      !isSubmissionTimerActive ||
      !currentTurnKey ||
      !currentSubmittingPlayer ||
      !submissionDeadline ||
      submissionDeadline.turnKey !== currentTurnKey ||
      submissionDeadline.playerId !== currentSubmittingPlayer.id ||
      submissionDeadline.deadlineAt === null
    ) {
      return;
    }

    const deadlineAt = submissionDeadline.deadlineAt;
    if (deadlineAt === null) return;
    const capturedDeadline = submissionDeadline;
    const capturedTurnKey = currentTurnKey;
    const capturedPlayer = currentSubmittingPlayer;

    const tickInterval = window.setInterval(() => {
      setNowMs(Date.now());
    }, 200);

    let expireTimeout = 0;
    const scheduleExpirationCheck = () => {
      const delayMs = Math.max(0, deadlineAt - Date.now());
      expireTimeout = window.setTimeout(() => {
        const now = Date.now();
        setNowMs(now);

        if (now < deadlineAt) {
          scheduleExpirationCheck();
          return;
        }

        if (
          !isSubmissionDeadlineExpired(
            capturedDeadline,
            capturedTurnKey,
            capturedPlayer.id,
            now
          )
        ) {
          return;
        }

        if (autoSubmittedTurnKeysRef.current.has(capturedTurnKey)) {
          return;
        }
        autoSubmittedTurnKeysRef.current.add(capturedTurnKey);

        const remainingCards = capturedPlayer.cards;
        const availableChips = getAvailableChipTypes(capturedPlayer.chips);
        if (remainingCards.length > 0 && availableChips.length > 0) {
          const randomCard =
            remainingCards[Math.floor(Math.random() * remainingCards.length)];
          const randomChip =
            availableChips[Math.floor(Math.random() * availableChips.length)];
          commitHumanSubmission(capturedPlayer, randomCard, randomChip);
        }
      }, delayMs);
    };

    scheduleExpirationCheck();

    return () => {
      window.clearInterval(tickInterval);
      window.clearTimeout(expireTimeout);
    };
  }, [
    isSubmissionTimerActive,
    currentTurnKey,
    currentSubmittingPlayer,
    submissionDeadline,
    commitHumanSubmission,
  ]);

  // Staged reveal: Chips (2.5s) -> Cards flip one by one -> Placement order showcase -> Placement Step
  // Cleans up safely on Pause/Rules and resumes smoothly when returning to PLAYING.
  useEffect(() => {
    if (state.shell !== 'PLAYING' || rulesOpen) return;

    if (state.phase === 'REVEAL_CHIPS') {
      const timer = window.setTimeout(() => {
        setRevealedCardIds([]);
        dispatch({ type: 'ADVANCE_TO_REVEAL_CARDS' });
      }, 2500);
      return () => window.clearTimeout(timer);
    }

    if (state.phase === 'REVEAL_CARDS') {
      const n = state.players.length;
      const clockwisePlayers = Array.from({ length: n }, (_, offset) => {
        const seat = (state.firstPlayerSeat + offset) % n;
        return state.players.find((p) => p.seatIndex === seat);
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
        dispatch({ type: 'ADVANCE_TO_PLACEMENT' });
      }, finishMs);
      timers.push(advanceTimer);

      return () => {
        timers.forEach((id) => window.clearTimeout(id));
      };
    }
  }, [state.shell, state.phase, rulesOpen, state.players, state.firstPlayerSeat]);

  const startPlacementImmediately = useCallback(() => {
    if (state.shell !== 'PLAYING' || state.phase !== 'REVEAL_CARDS' || rulesOpen) return;
    setRevealedCardIds(state.players.map((p) => p.id));
    dispatch({ type: 'ADVANCE_TO_PLACEMENT' });
  }, [state.shell, state.phase, state.players, rulesOpen]);

  // Execute a Pass or Place for the head of placementQueue (strictly locked during burst animation)
  const executePlacementAction = useCallback(
    (action: 'PASS' | 'PLACE', targetColor?: PedestalColor) => {
      if (
        state.shell !== 'PLAYING' ||
        rulesOpen ||
        state.phase !== 'PLACEMENT_STEP' ||
        pedestalBurst !== null
      ) {
        return;
      }
      dispatch({ type: 'EXECUTE_PLACEMENT', action, targetColor });
    },
    [state.shell, rulesOpen, state.phase, pedestalBurst]
  );

  // Automatic AI turn during PLACEMENT_STEP (pauses during Rules/Pause/Burst animation and resumes cleanly)
  useEffect(() => {
    if (
      state.shell !== 'PLAYING' ||
      state.phase !== 'PLACEMENT_STEP' ||
      rulesOpen ||
      pedestalBurst !== null
    ) {
      return;
    }
    if (!activePlacementEntry || !activePlacementPlayer || activePlacementPlayer.isHuman) {
      return;
    }

    const timer = window.setTimeout(() => {
      const remainingInitialQueue = state.placementQueue.slice(1);
      const canPass =
        !activePlacementEntry.isDeferredPass &&
        !state.passedThisRoundIds.includes(activePlacementPlayer.id) &&
        remainingInitialQueue.length > 0;

      if (activePlacementEntry.chip === 'rainbow') {
        const decision = chooseAIRainbowDecision(
          state.pedestals,
          activePlacementEntry.card,
          canPass,
          remainingInitialQueue,
          state.aiDifficulty
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
        shouldAINormalChipPass(
          state.pedestals,
          activePlacementEntry,
          remainingInitialQueue,
          state.aiDifficulty
        )
      ) {
        executePlacementAction('PASS');
      } else {
        executePlacementAction('PLACE', activePlacementEntry.chip);
      }
    }, 760);

    return () => window.clearTimeout(timer);
  }, [
    state.shell,
    state.phase,
    rulesOpen,
    pedestalBurst,
    activePlacementEntry,
    activePlacementPlayer,
    state.placementQueue,
    state.passedThisRoundIds,
    state.pedestals,
    state.aiDifficulty,
    executePlacementAction,
  ]);

  // Global keyboard shortcuts (Esc to close modals/pause, M to mute)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'm' || e.key === 'M') {
        e.preventDefault();
        toggleMute();
        return;
      }
      if (e.key === 'Escape') {
        if (tutorialOpen) {
          setTutorialOpen(false);
          return;
        }
        if (rulesOpen) {
          setRulesOpen(false);
          return;
        }
        if (state.shell === 'PLAYING') {
          dispatch({ type: 'SET_SHELL', shell: 'PAUSED' });
        } else if (state.shell === 'PAUSED') {
          dispatch({ type: 'SET_SHELL', shell: 'PLAYING' });
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [state.shell, rulesOpen, tutorialOpen, toggleMute]);

  const finalRankings = useMemo(
    () => computeFinalRankings(state.players),
    [state.players]
  );

  const penaltyProgressionData = useMemo(() => {
    const startRow: Record<string, string | number> = { round: '시작' };
    for (const p of state.players) {
      startRow[p.id] = 0;
    }

    const rows = [startRow];
    for (const rec of state.roundHistory) {
      const row: Record<string, string | number> = { round: `R${rec.roundNumber}` };
      for (const p of state.players) {
        row[p.id] = rec.cumulativeByPlayer[p.id] ?? 0;
      }
      rows.push(row);
    }
    return rows;
  }, [state.players, state.roundHistory]);

  const submitTimeDisplay = useMemo(() => {
    const totalSec = Math.ceil(submitTimeLeftMs / 1000);
    const min = Math.floor(totalSec / 60);
    const sec = totalSec % 60;
    return `${min}:${String(sec).padStart(2, '0')}`;
  }, [submitTimeLeftMs]);

  const phaseTitle = (() => {
    switch (state.phase) {
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
        return `라운드 ${state.roundNumber} 종료`;
    }
  })();

  const previewPlacementOrder = useMemo(() => {
    if (
      (state.phase !== 'REVEAL_CHIPS' && state.phase !== 'REVEAL_CARDS') ||
      state.players.length === 0 ||
      Object.keys(state.submissions).length < state.players.length
    ) {
      return [];
    }
    return computePlacementOrder(
      state.submissions,
      state.players,
      state.firstPlayerSeat
    );
  }, [state.phase, state.players, state.submissions, state.firstPlayerSeat]);

  const allCardsRevealed =
    state.phase === 'REVEAL_CARDS' &&
    state.players.length > 0 &&
    revealedCardIds.length >= state.players.length;

  const isHumanPlacementTurn =
    state.phase === 'PLACEMENT_STEP' &&
    activePlacementEntry !== null &&
    activePlacementPlayer !== null &&
    activePlacementPlayer.isHuman;

  const humanCanPass =
    isHumanPlacementTurn &&
    !activePlacementEntry.isDeferredPass &&
    !state.passedThisRoundIds.includes(activePlacementPlayer.id) &&
    state.placementQueue.length > 1;

  return (
    <div className="relative min-h-screen w-full overflow-x-hidden bg-obsidian-900 text-[#f3f4f6] flex flex-col">

      {state.shell === 'TITLE_MENU' && (
        <Heavy13TitleScreen
          mode={mode}
          playerCount={playerCount}
          startingSeatChoice={startingSeatChoice}
          aiDifficulty={aiDifficulty}
          memoryMode={memoryMode}
          muted={muted}
          onChangeMode={setMode}
          onChangePlayerCount={setPlayerCount}
          onChangeStartingSeatChoice={setStartingSeatChoice}
          onChangeAiDifficulty={setAiDifficulty}
          onChangeMemoryMode={setMemoryMode}
          onToggleMute={toggleMute}
          onOpenRules={() => setRulesOpen(true)}
          onOpenTutorial={() => setTutorialOpen(true)}
          onStartMatch={startMatch}
          onExitToHub={onExitToHub}
        />
      )}

      {(state.shell === 'PLAYING' ||
        state.shell === 'PAUSED' ||
        state.shell === 'GAME_OVER') && (
        <Heavy13PlayArena
          shell={state.shell}
          roundNumber={state.roundNumber}
          phase={state.phase}
          phaseTitle={phaseTitle}
          memoryMode={memoryMode}
          muted={muted}
          rulesOpen={rulesOpen}
          submitTimeDisplay={submitTimeDisplay}
          submitTimeLeftMs={submitTimeLeftMs}
          players={state.players}
          pedestals={state.pedestals}
          firstPlayerSeat={state.firstPlayerSeat}
          submissions={state.submissions}
          revealedCardIds={revealedCardIds}
          passedThisRoundIds={state.passedThisRoundIds}
          placementQueue={state.placementQueue}
          deferredPassStack={state.deferredPassStack}
          previewPlacementOrder={previewPlacementOrder}
          allCardsRevealed={allCardsRevealed}
          roundLogs={state.roundLogs}
          roundHistory={state.roundHistory}
          roundLastPenaltyPlayerId={state.roundLastPenaltyPlayerId}
          highlightedPedestal={state.highlightedPedestal}
          newlyPlacedCubeId={newlyPlacedCubeId}
          pedestalBurst={pedestalBurst}
          showSet2Transition={state.showSet2Transition}
          round1HintsEnabled={round1HintsEnabled}
          currentSubmittingPlayer={currentSubmittingPlayer}
          activePlacementEntry={activePlacementEntry}
          activePlacementPlayer={activePlacementPlayer}
          selectedCard={selectedCard}
          selectedChip={selectedChip}
          isHumanPlacementTurn={isHumanPlacementTurn}
          humanCanPass={humanCanPass}
          onSelectCard={setSelectedCard}
          onSelectChip={setSelectedChip}
          onConfirmSubmission={handleConfirmSubmission}
          onBeginHumanSubmission={() => dispatch({ type: 'BEGIN_HUMAN_SUBMISSION' })}
          onStartPlacementImmediately={startPlacementImmediately}
          onExecutePlacement={executePlacementAction}
          onNextRound={() => dispatch({ type: 'NEXT_ROUND' })}
          onDismissSet2Transition={() => dispatch({ type: 'DISMISS_SET2_TRANSITION' })}
          onDismissRound1Hints={() => setRound1HintsEnabled(false)}
          onOpenRules={() => setRulesOpen(true)}
          onToggleMute={toggleMute}
          onPause={() => dispatch({ type: 'SET_SHELL', shell: 'PAUSED' })}
          onResume={() => dispatch({ type: 'SET_SHELL', shell: 'PLAYING' })}
          onRestartMatch={startMatch}
          onReturnToTitle={() => dispatch({ type: 'SET_SHELL', shell: 'TITLE_MENU' })}
          onExitToHub={onExitToHub}
        />
      )}

      {state.shell === 'GAME_OVER' && (
        <Heavy13ResultModal
          players={state.players}
          finalRankings={finalRankings}
          roundHistory={state.roundHistory}
          penaltyProgressionData={penaltyProgressionData}
          onPlayAgain={startMatch}
          onReturnToTitle={() => dispatch({ type: 'SET_SHELL', shell: 'TITLE_MENU' })}
          onExitToHub={onExitToHub}
        />
      )}

      <Heavy13RulesModal open={rulesOpen} onClose={() => setRulesOpen(false)} />
      <Heavy13TutorialModal
        open={tutorialOpen}
        onClose={() => setTutorialOpen(false)}
        onStartRealMatch={startMatch}
      />
    </div>
  );
}
