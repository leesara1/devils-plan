import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  BookOpen,
  Crosshair,
  Eye,
  EyeOff,
  Play,
  RotateCw,
  Shuffle,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { GameScreenProps } from '../types';
import { ThemeToggleButton } from '../../components/ThemeToggleButton';
import { RussianRoulettePreviewDiagram } from '../../components/GameBoardIllustrations';
import { RouletteRulesModal } from './components/RouletteRulesModal';
import { rouletteSound } from './audio/rouletteSound';
import {
  ACTION_META,
  AIDifficulty,
  ChamberIntel,
  GAME_END_BROKE_COUNT,
  MANIPULATION_TARGET,
  RouletteAction,
  RouletteActionKind,
  RouletteLogEntry,
  RouletteState,
  SEAT_COUNT,
  actionCost,
  applyRouletteAction,
  brokeCount,
  chamberAtSeat,
  chooseAIAction,
  computeFiringSequence,
  createInitialRouletteState,
  estimateBulletProbabilities,
  manipulationWouldComplete,
  muzzleSeat,
  othersManipulationsSince,
  pairChambers,
  seatFacingChamber,
} from './engine/roulette';

const AI_DIFFICULTY_LABEL: Record<AIDifficulty, string> = {
  normal: '쉬움',
  hard: '보통',
  master: '어려움',
};

const AI_DIFFICULTY_DESC: Record<AIDifficulty, string> = {
  normal: '조작 가능성을 의심하지 않고, 판단이 자주 흔들립니다.',
  hard: '조작 횟수를 따져 정보의 신뢰도를 깎고, 종료 시점을 계산합니다.',
  master: '보통과 같은 판단을 거의 실수 없이 합니다.',
};

const AI_TURN_DELAY_MS = 1100;
const FIRING_START_DELAY_MS = 1400;
const FIRING_STEP_MS = 1100;

type Screen = 'TITLE' | 'GAME';

const SEAT_RADIUS = 41;
const CHAMBER_RADIUS = 21;

function angleForOffset(offset: number): number {
  // Viewer sits at the bottom (90deg); increasing seat index goes clockwise on screen.
  return 90 + 60 * offset;
}

function polar(angleDeg: number, radiusPct: number) {
  const rad = (angleDeg * Math.PI) / 180;
  return { left: `${50 + radiusPct * Math.cos(rad)}%`, top: `${50 + radiusPct * Math.sin(rad)}%` };
}

function chamberLabel(c: number): string {
  return `${c + 1}번 약실`;
}

function pairLabel(pairStart: number): string {
  const [a, b] = pairChambers(pairStart);
  return `약실 ${a + 1}·${b + 1}`;
}

function bulletWord(b: boolean): string {
  return b ? '탄' : '빈';
}

/* ------------------------------------------------------------------ */
/* Board                                                               */
/* ------------------------------------------------------------------ */

interface BoardProps {
  game: RouletteState;
  selectedPair: number | null;
  pairSelectable: boolean;
  onSelectChamber: (c: number) => void;
  revealedShots: number;
  revealAll: boolean;
}

const RouletteBoard: React.FC<BoardProps> = ({
  game,
  selectedPair,
  pairSelectable,
  onSelectChamber,
  revealedShots,
  revealAll,
}) => {
  const viewer = game.humanSeat;
  const shots = useMemo(
    () => (game.phase === 'PLAYING' ? [] : computeFiringSequence(game)),
    [game],
  );
  const shotBySeat = new Map(shots.map((s) => [s.seat, s]));
  const revealedSeatSet = new Set(shots.slice(0, revealedShots).map((s) => s.seat));
  const activeShotSeat =
    game.phase === 'FIRING' && revealedShots > 0 ? shots[revealedShots - 1]?.seat : null;
  const selected: number[] = selectedPair !== null ? pairChambers(selectedPair) : [];
  const muzzle = muzzleSeat(game.rotation);
  const ringRotation = 60 * game.rotation;
  const myChamber = chamberAtSeat(viewer, game.rotation);

  return (
    <div className="relative w-full max-w-[520px] mx-auto aspect-square select-none">
      {/* Table */}
      <div className="absolute inset-[9%] rounded-full bg-[#e9edf3] dark:bg-[#1b2029] border border-slate-300/70 dark:border-white/[0.07]" />
      <div className="absolute inset-[30%] rounded-full border border-dashed border-slate-300 dark:border-white/10" />

      {/* Rotating gun: barrel + cylinder */}
      <div
        className="absolute inset-0 transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none"
        style={{ transform: `rotate(${ringRotation}deg)` }}
      >
        {/* Barrel points at chamber 0's seat */}
        <div
          className="absolute left-1/2 top-1/2 h-[10px] origin-left"
          style={{
            width: '30%',
            transform: `translateY(-50%) rotate(${angleForOffset(0 - viewer)}deg)`,
          }}
        >
          <div className="absolute right-0 top-1/2 -translate-y-1/2 h-[10px] w-[38%] rounded-r-full bg-gold-400/90 dark:bg-gold-400/80" />
        </div>

        <div className="absolute left-1/2 top-1/2 w-[26%] aspect-square -translate-x-1/2 -translate-y-1/2 rounded-full bg-slate-300/80 dark:bg-obsidian-800 border border-slate-400/50 dark:border-white/10" />

        {Array.from({ length: SEAT_COUNT }, (_, c) => {
          const pos = polar(angleForOffset(c - viewer), CHAMBER_RADIUS);
          const info: ChamberIntel | null = game.intel[viewer][c];
          const stale = info ? othersManipulationsSince(game, viewer, info.learnedAtTurn) : 0;
          const facingSeat = seatFacingChamber(c, game.rotation);
          const truthVisible = revealAll || revealedSeatSet.has(facingSeat);
          const isSelected = selected.includes(c);
          const isMine = c === myChamber;

          let face: React.ReactNode;
          let tone =
            'bg-white dark:bg-[#2a303f] border-slate-300 dark:border-white/15 text-slate-500 dark:text-slate-400';
          if (truthVisible) {
            face = bulletWord(game.chambers[c]);
            tone = game.chambers[c]
              ? 'bg-rival-500 border-rival-500 text-white'
              : 'bg-slate-100 dark:bg-[#1f2430] border-slate-300 dark:border-white/15 text-slate-500 dark:text-slate-400';
          } else if (info) {
            face = bulletWord(info.bullet);
            tone = info.bullet
              ? 'bg-[#fff1f2] dark:bg-[#3a1820] border-rival-500 dark:border-rival-400 text-[#be123c] dark:text-rival-400'
              : 'bg-[#ecfdf5] dark:bg-[#102a22] border-emerald-600/60 dark:border-emerald-400/50 text-emerald-700 dark:text-emerald-300';
          } else {
            face = '?';
          }

          return (
            <button
              key={c}
              type="button"
              disabled={!pairSelectable}
              onClick={() => onSelectChamber(c)}
              aria-label={`${chamberLabel(c)}${info ? ` (${bulletWord(info.bullet)})` : ''}`}
              className={[
                'absolute w-[13%] aspect-square -translate-x-1/2 -translate-y-1/2 rounded-full border-2 flex items-center justify-center transition-colors',
                tone,
                isSelected ? 'ring-4 ring-sky-400/70 dark:ring-lounge-sky-400/60' : '',
                isMine && !isSelected ? 'ring-2 ring-gold-400/80' : '',
                pairSelectable ? 'cursor-pointer hover:border-sky-500' : 'cursor-default',
              ].join(' ')}
              style={pos}
            >
              <span
                className="flex flex-col items-center leading-none transition-transform duration-700 motion-reduce:transition-none"
                style={{ transform: `rotate(${-ringRotation}deg)` }}
              >
                <span className="font-mono-tabular text-[9px] sm:text-[10px] opacity-70">{c + 1}</span>
                <span className="font-bold text-xs sm:text-sm">{face}</span>
              </span>
              {info && stale > 0 && !truthVisible && (
                <span
                  className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-gold-400 text-gold-950 text-[10px] font-bold flex items-center justify-center"
                  style={{ transform: `rotate(${-ringRotation}deg)` }}
                  title="이 정보를 얻은 뒤 다른 사람이 조작에 크레딧을 낸 횟수"
                >
                  {stale}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Seats (fixed) */}
      {game.players.map((p) => {
        const pos = polar(angleForOffset(p.seat - viewer), SEAT_RADIUS);
        const isTurn = game.phase === 'PLAYING' && game.turnSeat === p.seat;
        const isBroke = p.credits <= 0;
        const shot = shotBySeat.get(p.seat);
        const shotRevealed = revealedSeatSet.has(p.seat) || revealAll;
        const isActiveShot = activeShotSeat === p.seat;

        return (
          <div
            key={p.id}
            className={[
              'absolute -translate-x-1/2 -translate-y-1/2 w-[24%] min-w-[78px] rounded-xl border px-2 py-1.5 text-center transition-colors',
              shotRevealed && shot?.bullet
                ? 'bg-[#fff1f2] dark:bg-[#2d141c] border-rival-500 dark:border-rival-400'
                : shotRevealed
                  ? 'bg-[#ecfdf5] dark:bg-[#102a22] border-emerald-600/50 dark:border-emerald-400/40'
                  : 'bg-white dark:bg-obsidian-850 border-slate-300/90 dark:border-white/10',
              isTurn ? 'ring-2 ring-gold-400' : '',
              isActiveShot ? 'animate-pedestal-shake' : '',
            ].join(' ')}
            style={pos}
          >
            <div className="flex items-center justify-center gap-1 text-[10px] font-mono-tabular theme-text-faint">
              <span>{p.seat + 1}번</span>
              {muzzle === p.seat && game.phase === 'PLAYING' && (
                <Crosshair className="w-3 h-3 theme-text-gold" aria-label="총구" />
              )}
            </div>
            <div
              className={[
                'text-xs sm:text-sm font-bold truncate',
                p.isHuman ? 'theme-text-gold' : 'theme-text-primary',
              ].join(' ')}
            >
              {p.name}
            </div>
            <div className="text-[10px] mt-0.5 font-medium">
              {shotRevealed ? (
                shot?.bullet ? (
                  <span className="theme-text-rival font-bold">탈락</span>
                ) : (
                  <span className="theme-text-emerald font-bold">생존</span>
                )
              ) : isBroke ? (
                <span className="theme-text-rival">크레딧 0</span>
              ) : isTurn ? (
                <span className="theme-text-gold">차례</span>
              ) : (
                <span className="theme-text-faint">{p.isHuman ? `${p.credits} 크레딧` : '대기'}</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Log                                                                 */
/* ------------------------------------------------------------------ */

function describeLog(entry: RouletteLogEntry, game: RouletteState, revealSecrets: boolean): string {
  const actor = game.players[entry.seat];
  const name = actor.name;
  const isViewer = entry.seat === game.humanSeat;
  const showSecret = isViewer || revealSecrets;

  switch (entry.kind) {
    case 'PASS':
      return `${name} 패스 (크레딧 없음)`;
    case 'PUBLIC_SCAN': {
      const [r1, r2] = entry.publicResult ?? [false, false];
      const [a, b] = pairChambers(entry.pairStart ?? 0);
      return `${name} 공개 조사 · ${a + 1}번 ${bulletWord(r1)}, ${b + 1}번 ${bulletWord(r2)}`;
    }
    case 'PRIVATE_SCAN': {
      const base = `${name} 비공개 조사 · ${pairLabel(entry.pairStart ?? 0)}`;
      if (!showSecret || !entry.privateResult) return base;
      const [a, b] = pairChambers(entry.pairStart ?? 0);
      return `${base} → ${a + 1}번 ${bulletWord(entry.privateResult[0])}, ${b + 1}번 ${bulletWord(entry.privateResult[1])}`;
    }
    case 'ROTATE':
      return `${name} 총구 ${entry.steps}칸 회전`;
    case 'MANIPULATE': {
      const base = `${name} 조작에 크레딧 제출`;
      if (!showSecret) return base;
      const swap =
        entry.secretSwapPairStart !== null && entry.secretSwapPairStart !== undefined
          ? ` · ${pairLabel(entry.secretSwapPairStart)} 교환`
          : '';
      return `${base} (${entry.secretAmount})${swap}`;
    }
  }
}

function playActionSound(action: RouletteAction) {
  switch (action.kind) {
    case 'PUBLIC_SCAN':
    case 'PRIVATE_SCAN':
      rouletteSound.playScan();
      break;
    case 'ROTATE':
      rouletteSound.playRotate(action.steps);
      break;
    case 'MANIPULATE':
      rouletteSound.playManipulate();
      break;
  }
}

/* ------------------------------------------------------------------ */
/* Main                                                                */
/* ------------------------------------------------------------------ */

const ACTION_ORDER: RouletteActionKind[] = ['PUBLIC_SCAN', 'PRIVATE_SCAN', 'ROTATE', 'MANIPULATE'];

const ACTION_ICON: Record<RouletteActionKind, React.ReactNode> = {
  PUBLIC_SCAN: <Eye className="w-4 h-4" />,
  PRIVATE_SCAN: <EyeOff className="w-4 h-4" />,
  ROTATE: <RotateCw className="w-4 h-4" />,
  MANIPULATE: <Shuffle className="w-4 h-4" />,
};

const ACTION_COST_LABEL: Record<RouletteActionKind, string> = {
  PUBLIC_SCAN: '1',
  PRIVATE_SCAN: '2',
  ROTATE: '3 / 4',
  MANIPULATE: '1~3',
};

const secondaryButton =
  'inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300/80 bg-white text-xs font-medium text-slate-700 hover:border-slate-400 hover:text-slate-900 dark:border-white/10 dark:bg-obsidian-850 dark:text-lounge-slate-300 dark:hover:border-white/25 dark:hover:text-white transition-colors cursor-pointer whitespace-nowrap';

export function RussianRouletteGame({ onExitToHub }: GameScreenProps) {
  const [screen, setScreen] = useState<Screen>('TITLE');
  const [difficulty, setDifficulty] = useState<AIDifficulty>('hard');
  const [muted, setMuted] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [game, setGame] = useState<RouletteState | null>(null);

  const [actionKind, setActionKind] = useState<RouletteActionKind | null>(null);
  const [pairStart, setPairStart] = useState<number | null>(null);
  const [rotateSteps, setRotateSteps] = useState<1 | 2>(1);
  const [manipAmount, setManipAmount] = useState<1 | 2 | 3>(3);
  const [revealedShots, setRevealedShots] = useState(0);
  const [resultOpen, setResultOpen] = useState(false);

  const toggleMute = useCallback(() => {
    setMuted((prev) => {
      rouletteSound.setMuted(!prev);
      return !prev;
    });
  }, []);

  const resetSelection = useCallback(() => {
    setActionKind(null);
    setPairStart(null);
    setRotateSteps(1);
  }, []);

  const startMatch = useCallback(() => {
    setGame(createInitialRouletteState(difficulty));
    resetSelection();
    setRevealedShots(0);
    setResultOpen(false);
    setScreen('GAME');
  }, [difficulty, resetSelection]);

  const human = game ? game.players[game.humanSeat] : null;
  const isHumanTurn =
    !!game && game.phase === 'PLAYING' && game.turnSeat === game.humanSeat && !rulesOpen;

  // Clamp the manipulation amount to what the player can afford.
  useEffect(() => {
    if (human && manipAmount > human.credits && human.credits > 0) {
      setManipAmount(Math.min(3, human.credits) as 1 | 2 | 3);
    }
  }, [human, manipAmount]);

  const pendingAction: RouletteAction | null = useMemo(() => {
    if (!game || !human || !actionKind) return null;
    switch (actionKind) {
      case 'PUBLIC_SCAN':
      case 'PRIVATE_SCAN':
        return pairStart === null ? null : { kind: actionKind, pairStart };
      case 'ROTATE':
        return { kind: 'ROTATE', steps: rotateSteps };
      case 'MANIPULATE': {
        const completes = manipulationWouldComplete(human, manipAmount);
        if (completes && pairStart === null) return null;
        return {
          kind: 'MANIPULATE',
          amount: manipAmount,
          swapPairStart: completes ? pairStart : null,
        };
      }
    }
  }, [game, human, actionKind, pairStart, rotateSteps, manipAmount]);

  const pendingAffordable =
    !!pendingAction && !!human && human.credits >= actionCost(pendingAction);

  const needsPair =
    actionKind === 'PUBLIC_SCAN' ||
    actionKind === 'PRIVATE_SCAN' ||
    (actionKind === 'MANIPULATE' && !!human && manipulationWouldComplete(human, manipAmount));

  const confirmAction = useCallback(() => {
    if (!game || !isHumanTurn || !pendingAction || !pendingAffordable) return;
    playActionSound(pendingAction);
    setGame(applyRouletteAction(game, game.humanSeat, pendingAction));
    resetSelection();
  }, [game, isHumanTurn, pendingAction, pendingAffordable, resetSelection]);

  // AI turns
  useEffect(() => {
    if (!game || game.phase !== 'PLAYING' || rulesOpen) return;
    if (game.turnSeat === game.humanSeat) return;
    const timer = window.setTimeout(() => {
      const action = chooseAIAction(game, game.turnSeat);
      playActionSound(action);
      setGame(applyRouletteAction(game, game.turnSeat, action));
    }, AI_TURN_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [game, rulesOpen]);

  // Firing sequence
  useEffect(() => {
    if (!game || game.phase !== 'FIRING' || rulesOpen) return;
    const shots = computeFiringSequence(game);
    if (revealedShots >= shots.length) {
      const timer = window.setTimeout(() => {
        setGame({ ...game, phase: 'RESULT' });
        setResultOpen(true);
      }, 900);
      return () => window.clearTimeout(timer);
    }
    const delay = revealedShots === 0 ? FIRING_START_DELAY_MS : FIRING_STEP_MS;
    const timer = window.setTimeout(() => {
      const shot = shots[revealedShots];
      if (shot.bullet) rouletteSound.playBang();
      else rouletteSound.playEmptyClick();
      setRevealedShots((n) => n + 1);
    }, delay);
    return () => window.clearTimeout(timer);
  }, [game, revealedShots, rulesOpen]);

  // Keyboard shortcuts
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (rulesOpen) return;
      if (e.target instanceof HTMLInputElement) return;
      if (e.key === 'Enter' && screen === 'GAME') confirmAction();
      if (e.key === 'm' || e.key === 'M') toggleMute();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [rulesOpen, screen, confirmAction, toggleMute]);

  const topBar = (
    <div className="flex items-center justify-between gap-3 pb-4 border-b border-slate-200 dark:border-white/[0.08]">
      <div className="flex items-center gap-3 min-w-0">
        {screen === 'GAME' ? (
          <button type="button" onClick={() => setScreen('TITLE')} className={secondaryButton}>
            <ArrowLeft className="w-4 h-4 text-slate-500 dark:text-lounge-slate-400" />
            타이틀
          </button>
        ) : (
          onExitToHub && (
            <button type="button" onClick={onExitToHub} className={secondaryButton}>
              <ArrowLeft className="w-4 h-4 text-slate-500 dark:text-lounge-slate-400" />
              매치 목록
            </button>
          )
        )}
        <span className="hidden sm:inline font-mono-tabular text-xs theme-text-faint truncate">
          시즌 3 · 감옥 매치
        </span>
      </div>
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => setRulesOpen(true)} className={secondaryButton}>
          <BookOpen className="w-4 h-4 text-slate-500 dark:text-lounge-slate-400" />
          게임 규칙
        </button>
        <ThemeToggleButton compact />
        <button
          type="button"
          onClick={toggleMute}
          aria-label={muted ? '소리 켜기' : '음소거'}
          className="min-w-[38px] min-h-[38px] inline-flex items-center justify-center rounded-lg border border-slate-300/80 bg-white text-slate-700 hover:border-slate-400 dark:border-white/10 dark:bg-obsidian-850 dark:text-lounge-slate-300 dark:hover:border-white/25 transition-colors cursor-pointer"
        >
          {muted ? (
            <VolumeX className="w-4 h-4 theme-text-rival" />
          ) : (
            <Volume2 className="w-4 h-4 theme-text-gold" />
          )}
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen w-full overflow-x-hidden theme-canvas flex flex-col">
      <main className="flex-1 flex flex-col px-4 py-5 sm:px-8 sm:py-7 max-w-6xl w-full mx-auto gap-6">
        {topBar}

        {screen === 'TITLE' || !game || !human ? (
          <TitleScreen
            difficulty={difficulty}
            onChangeDifficulty={setDifficulty}
            onStart={startMatch}
            onOpenRules={() => setRulesOpen(true)}
          />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[1.15fr_0.85fr] gap-6 items-start">
            {/* Board column */}
            <section className="obsidian-panel rounded-2xl p-3 sm:p-5 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono-tabular theme-text-muted px-1">
                <span>
                  <span className="theme-text-gold font-semibold">{game.round}라운드</span>
                  <span className="mx-1.5" aria-hidden="true">·</span>
                  선 {game.players[game.roundStartSeat].name}
                </span>
                <span>
                  크레딧 0 인원{' '}
                  <span
                    className={
                      brokeCount(game) >= GAME_END_BROKE_COUNT - 1
                        ? 'theme-text-rival font-bold'
                        : 'theme-text-primary font-semibold'
                    }
                  >
                    {brokeCount(game)}/{GAME_END_BROKE_COUNT}
                  </span>
                </span>
              </div>

              <RouletteBoard
                game={game}
                selectedPair={needsPair ? pairStart : null}
                pairSelectable={isHumanTurn && needsPair}
                onSelectChamber={(c) => {
                  rouletteSound.playSelect();
                  setPairStart(c);
                }}
                revealedShots={revealedShots}
                revealAll={game.phase === 'RESULT'}
              />

              <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[11px] theme-text-faint px-1">
                <span>
                  <Crosshair className="inline w-3 h-3 theme-text-gold -mt-0.5" /> 총구
                </span>
                <span>금색 테두리: 내 앞 약실</span>
                <span>숫자 배지: 확인 후 다른 사람의 조작 제출 횟수</span>
              </div>
            </section>

            {/* Side column */}
            <section className="space-y-4">
              <StatusPanel game={game} />

              {game.phase === 'PLAYING' && (
                <div className="obsidian-panel rounded-2xl p-4 sm:p-5 space-y-4">
                  {isHumanTurn ? (
                    <>
                      <div className="flex items-baseline justify-between">
                        <h2 className="font-display text-base font-bold theme-text-primary">내 차례</h2>
                        <span className="text-xs theme-text-muted">행동 1개 선택</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {ACTION_ORDER.map((kind) => {
                          const minCost = kind === 'ROTATE' ? 3 : kind === 'PRIVATE_SCAN' ? 2 : 1;
                          const disabled = human.credits < minCost;
                          const active = actionKind === kind;
                          return (
                            <button
                              key={kind}
                              type="button"
                              disabled={disabled}
                              onClick={() => {
                                rouletteSound.playSelect();
                                setActionKind(kind);
                                setPairStart(null);
                                if (kind === 'ROTATE') setRotateSteps(human.credits >= 3 ? 1 : 2);
                              }}
                              className={[
                                'text-left rounded-xl border p-3 transition-colors',
                                active
                                  ? 'border-gold-400 bg-gold-100/60 dark:bg-gold-400/10'
                                  : 'border-slate-300/80 dark:border-white/10 theme-control hover:border-slate-400 dark:hover:border-white/25',
                                disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer',
                              ].join(' ')}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="inline-flex items-center gap-1.5 text-sm font-semibold theme-text-primary">
                                  {ACTION_ICON[kind]}
                                  {ACTION_META[kind].labelKo}
                                </span>
                                <span className="font-mono-tabular text-xs theme-text-gold font-bold">
                                  {ACTION_COST_LABEL[kind]}
                                </span>
                              </div>
                              <p className="mt-1 text-[11px] leading-snug theme-text-muted">
                                {ACTION_META[kind].descKo}
                              </p>
                            </button>
                          );
                        })}
                      </div>

                      {actionKind === 'ROTATE' && (
                        <div className="flex gap-2">
                          {([1, 2] as const).map((steps) => {
                            const cost = steps === 1 ? 3 : 4;
                            const nextChamber = chamberAtSeat(game.humanSeat, game.rotation + steps);
                            const info = game.intel[game.humanSeat][nextChamber];
                            return (
                              <button
                                key={steps}
                                type="button"
                                disabled={human.credits < cost}
                                onClick={() => setRotateSteps(steps)}
                                className={[
                                  'flex-1 rounded-lg border px-3 py-2 text-xs text-left transition-colors',
                                  rotateSteps === steps
                                    ? 'border-gold-400 bg-gold-100/60 dark:bg-gold-400/10'
                                    : 'border-slate-300/80 dark:border-white/10 theme-control',
                                  human.credits < cost ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer',
                                ].join(' ')}
                              >
                                <div className="font-semibold theme-text-primary">
                                  {steps}칸 회전 · {cost}
                                </div>
                                <div className="theme-text-muted mt-0.5">
                                  내 앞: {chamberLabel(nextChamber)}
                                  {info ? ` (${bulletWord(info.bullet)})` : ' (?)'}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {actionKind === 'MANIPULATE' && (
                        <div className="space-y-2">
                          <div className="flex gap-2">
                            {([1, 2, 3] as const).map((amt) => (
                              <button
                                key={amt}
                                type="button"
                                disabled={human.credits < amt}
                                onClick={() => {
                                  setManipAmount(amt);
                                  setPairStart(null);
                                }}
                                className={[
                                  'flex-1 rounded-lg border py-2 text-sm font-mono-tabular font-bold transition-colors',
                                  manipAmount === amt
                                    ? 'border-gold-400 bg-gold-100/60 dark:bg-gold-400/10 theme-text-primary'
                                    : 'border-slate-300/80 dark:border-white/10 theme-control theme-text-secondary',
                                  human.credits < amt ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer',
                                ].join(' ')}
                              >
                                +{amt}
                              </button>
                            ))}
                          </div>
                          <p className="text-xs theme-text-muted">
                            적립 {human.manipProgress} → {Math.min(MANIPULATION_TARGET, human.manipProgress + manipAmount)}/{MANIPULATION_TARGET}
                            {manipulationWouldComplete(human, manipAmount) && (
                              <span className="theme-text-gold font-semibold">
                                {' '}· 조작 완성! 바꿀 약실 쌍을 고르세요
                                {human.manipProgress + manipAmount > MANIPULATION_TARGET &&
                                  ` (초과 ${human.manipProgress + manipAmount - MANIPULATION_TARGET} 소멸)`}
                              </span>
                            )}
                          </p>
                        </div>
                      )}

                      {needsPair && (
                        <p className="text-xs obsidian-sky-panel rounded-lg px-3 py-2 theme-text-sky">
                          {pairStart === null
                            ? '보드에서 약실을 누르세요. 누른 약실과 시계 방향 다음 약실이 한 쌍입니다.'
                            : `${pairLabel(pairStart)} 선택됨 (${game.players[seatFacingChamber(pairStart, game.rotation)].name}·${game.players[seatFacingChamber(pairStart + 1, game.rotation)].name} 앞)`}
                        </p>
                      )}

                      <button
                        type="button"
                        onClick={confirmAction}
                        disabled={!pendingAction || !pendingAffordable}
                        className="w-full inline-flex items-center justify-center gap-1.5 px-5 py-3 rounded-xl bg-gold-400 hover:bg-gold-300 text-gold-950 font-bold text-sm transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        확정
                        {pendingAction && (
                          <span className="font-mono-tabular">(-{actionCost(pendingAction)})</span>
                        )}
                      </button>
                    </>
                  ) : (
                    <div className="text-sm theme-text-muted py-2 text-center">
                      {human.credits <= 0
                        ? '크레딧을 모두 써서 남은 차례는 자동으로 패스됩니다.'
                        : `${game.players[game.turnSeat].name} 차례입니다…`}
                    </div>
                  )}
                </div>
              )}

              {game.phase !== 'PLAYING' && (
                <div className="obsidian-panel rounded-2xl p-4 sm:p-5 space-y-3 text-center">
                  <div className="font-display text-lg font-bold theme-text-rival">격발</div>
                  <p className="text-sm theme-text-muted">
                    {game.players[muzzleSeat(game.rotation)].name}부터 시계 방향으로 쏩니다.
                  </p>
                  {game.phase === 'RESULT' && (
                    <button
                      type="button"
                      onClick={() => setResultOpen(true)}
                      className="px-4 py-2 rounded-lg bg-gold-400 hover:bg-gold-300 text-gold-950 font-bold text-sm cursor-pointer"
                    >
                      결과 보기
                    </button>
                  )}
                </div>
              )}

              <LogPanel game={game} />
            </section>
          </div>
        )}
      </main>

      <RouletteRulesModal open={rulesOpen} onClose={() => setRulesOpen(false)} />

      {game && resultOpen && (
        <ResultModal
          game={game}
          onClose={() => setResultOpen(false)}
          onRestart={startMatch}
          onTitle={() => {
            setResultOpen(false);
            setScreen('TITLE');
          }}
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Sub-panels                                                          */
/* ------------------------------------------------------------------ */

const StatusPanel: React.FC<{ game: RouletteState }> = ({ game }) => {
  const me = game.players[game.humanSeat];
  const myChamber = chamberAtSeat(game.humanSeat, game.rotation);
  const myInfo = game.intel[game.humanSeat][myChamber];
  const probs = estimateBulletProbabilities(game, game.humanSeat);
  const risk = Math.round(probs[myChamber] * 100);
  const manipCounts = game.players.map(
    (p) => game.manipEvents.filter((e) => e.seat === p.seat).length,
  );

  return (
    <div className="obsidian-panel rounded-2xl p-4 sm:p-5 space-y-4">
      <div className="grid grid-cols-3 divide-x divide-slate-200 dark:divide-white/[0.08] text-xs">
        <div className="pr-3">
          <div className="theme-text-faint">내 크레딧</div>
          <div className="mt-1 font-mono-tabular text-2xl font-bold theme-text-gold">{me.credits}</div>
        </div>
        <div className="px-3">
          <div className="theme-text-faint">조작 적립</div>
          <div className="mt-1 font-mono-tabular text-2xl font-bold theme-text-primary">
            {me.manipProgress}
            <span className="text-sm theme-text-faint">/{MANIPULATION_TARGET}</span>
          </div>
        </div>
        <div className="pl-3">
          <div className="theme-text-faint">내 앞 위험도</div>
          <div
            className={[
              'mt-1 font-mono-tabular text-2xl font-bold',
              risk >= 50 ? 'theme-text-rival' : risk <= 10 ? 'theme-text-emerald' : 'theme-text-primary',
            ].join(' ')}
          >
            {risk}%
          </div>
        </div>
      </div>
      <p className="text-xs theme-text-muted">
        내 앞은 <strong className="theme-text-primary">{chamberLabel(myChamber)}</strong>
        {myInfo
          ? ` · 확인 결과 ${bulletWord(myInfo.bullet)} (${myInfo.round}라운드)`
          : ' · 아직 확인하지 않음'}
        . 위험도는 지금까지의 정보와 조작 가능성으로 계산한 추정치입니다.
      </p>
      <div className="border-t theme-border pt-3">
        <div className="text-[11px] theme-text-faint mb-1.5">공개된 조작 제출 횟수</div>
        <div className="flex flex-wrap gap-1.5">
          {game.players.map((p) => (
            <span
              key={p.id}
              className="inline-flex items-center gap-1 rounded-md theme-control px-2 py-1 text-[11px]"
            >
              <span className={p.isHuman ? 'theme-text-gold font-semibold' : 'theme-text-secondary'}>
                {p.name}
              </span>
              <span className="font-mono-tabular font-bold theme-text-primary">{manipCounts[p.seat]}</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

const LogPanel: React.FC<{ game: RouletteState }> = ({ game }) => {
  const entries = [...game.log].reverse().slice(0, 40);
  return (
    <div className="obsidian-panel rounded-2xl p-4 sm:p-5">
      <h3 className="font-display text-sm font-bold theme-text-primary mb-2">진행 기록</h3>
      {entries.length === 0 ? (
        <p className="text-xs theme-text-faint">{game.players[game.turnSeat].name}부터 시작합니다.</p>
      ) : (
        <ol className="space-y-1 max-h-64 overflow-y-auto pr-1">
          {entries.map((e) => (
            <li
              key={e.id}
              className={[
                'text-xs leading-relaxed flex gap-2',
                e.seat === game.humanSeat ? 'theme-text-primary' : 'theme-text-secondary',
              ].join(' ')}
            >
              <span className="font-mono-tabular theme-text-faint shrink-0">R{e.round}</span>
              <span>{describeLog(e, game, game.phase === 'RESULT')}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
};

interface ResultModalProps {
  game: RouletteState;
  onClose: () => void;
  onRestart: () => void;
  onTitle: () => void;
}

const ResultModal: React.FC<ResultModalProps> = ({ game, onClose, onRestart, onTitle }) => {
  const shots = computeFiringSequence(game);
  const humanShot = shots.find((s) => s.seat === game.humanSeat);
  const survived = !humanShot?.bullet;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/55 dark:bg-black/75 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="러시안 룰렛 결과"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg max-h-[88vh] overflow-y-auto obsidian-panel rounded-2xl p-6 space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-center space-y-1">
          <div className="font-mono-tabular text-xs theme-text-faint">RESULT</div>
          <h2
            className={[
              'font-display text-3xl font-bold',
              survived ? 'theme-text-emerald' : 'theme-text-rival',
            ].join(' ')}
          >
            {survived ? '생존' : '탈락'}
          </h2>
          <p className="text-sm theme-text-muted">
            {survived ? '빈 약실이었습니다. 다음 매치로 갑니다.' : '총알이 든 약실이 당신을 향해 있었습니다.'}
          </p>
        </div>

        <table className="w-full text-xs">
          <thead>
            <tr className="theme-text-faint border-b theme-border">
              <th className="text-left font-medium py-1.5">순서</th>
              <th className="text-left font-medium">플레이어</th>
              <th className="text-left font-medium">약실</th>
              <th className="text-right font-medium">남은 크레딧</th>
              <th className="text-right font-medium">조작</th>
              <th className="text-right font-medium">결과</th>
            </tr>
          </thead>
          <tbody>
            {shots.map((s) => {
              const p = game.players[s.seat];
              return (
                <tr key={s.seat} className="border-b theme-border last:border-0">
                  <td className="py-1.5 font-mono-tabular theme-text-faint">{s.order}</td>
                  <td className={p.isHuman ? 'theme-text-gold font-semibold' : 'theme-text-primary'}>
                    {p.name}
                  </td>
                  <td className="font-mono-tabular theme-text-secondary">{s.chamber + 1}번</td>
                  <td className="text-right font-mono-tabular theme-text-secondary">{p.credits}</td>
                  <td className="text-right font-mono-tabular theme-text-secondary">
                    {p.manipSpentTotal}
                    {p.swapsDone > 0 && <span className="theme-text-gold"> · 교환 {p.swapsDone}</span>}
                  </td>
                  <td
                    className={[
                      'text-right font-bold',
                      s.bullet ? 'theme-text-rival' : 'theme-text-emerald',
                    ].join(' ')}
                  >
                    {s.bullet ? '탈락' : '생존'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={onTitle}
            className="flex-1 px-4 py-2.5 rounded-xl border border-slate-300/80 dark:border-white/10 theme-control text-sm font-medium theme-text-secondary cursor-pointer"
          >
            타이틀로
          </button>
          <button
            type="button"
            onClick={onRestart}
            className="flex-1 px-4 py-2.5 rounded-xl bg-gold-400 hover:bg-gold-300 text-gold-950 font-bold text-sm cursor-pointer"
          >
            다시 하기
          </button>
        </div>
      </div>
    </div>
  );
};

interface TitleScreenProps {
  difficulty: AIDifficulty;
  onChangeDifficulty: (d: AIDifficulty) => void;
  onStart: () => void;
  onOpenRules: () => void;
}

const TitleScreen: React.FC<TitleScreenProps> = ({
  difficulty,
  onChangeDifficulty,
  onStart,
  onOpenRules,
}) => (
  <div className="my-auto grid grid-cols-1 lg:grid-cols-[1.05fr_0.95fr] gap-8 lg:gap-10 items-stretch">
    <div className="space-y-5">
      <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-white/[0.08]">
        <RussianRoulettePreviewDiagram />
      </div>
      <div className="space-y-2">
        <div className="font-mono-tabular text-xs theme-text-muted">
          감옥 매치 · 6인 · 크레딧 16
        </div>
        <h1 className="font-display display-tight text-3xl sm:text-4xl font-medium theme-text-primary">러시안 룰렛</h1>
        <p className="text-sm sm:text-base theme-text-secondary leading-relaxed text-pretty pt-1">
          약실 6개 중 <strong className="theme-text-rival font-semibold">2개에 총알</strong>이 있습니다. 크레딧으로 약실을 조사하고, 총구를 돌리고, 몰래 약실을 바꾸세요.{' '}
          <strong className="theme-text-primary font-semibold">3명이 크레딧을 다 쓰면</strong> 격발합니다.
        </p>
      </div>
    </div>

    <div className="obsidian-panel rounded-2xl p-5 sm:p-6 flex flex-col gap-5">
      <div className="space-y-2">
        <div className="text-sm font-semibold theme-text-primary">대전 방식</div>
        <div className="text-sm theme-text-secondary">1P vs AI 5명</div>
      </div>
      <div className="space-y-2">
        <div className="text-sm font-semibold theme-text-primary">AI 난이도</div>
        <div className="grid grid-cols-3 gap-2">
          {(Object.keys(AI_DIFFICULTY_LABEL) as AIDifficulty[]).map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => onChangeDifficulty(d)}
              className={[
                'rounded-lg border py-2 text-sm font-semibold transition-colors cursor-pointer',
                difficulty === d
                  ? 'border-gold-400 bg-gold-100/60 dark:bg-gold-400/10 theme-text-primary'
                  : 'border-slate-300/80 dark:border-white/10 theme-control theme-text-secondary',
              ].join(' ')}
            >
              {AI_DIFFICULTY_LABEL[d]}
            </button>
          ))}
        </div>
        <p className="text-xs theme-text-muted">{AI_DIFFICULTY_DESC[difficulty]}</p>
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs border-y theme-border py-3">
        <div>
          <div className="theme-text-faint">탈락</div>
          <div className="font-semibold theme-text-primary mt-0.5">총알 맞은 2명</div>
        </div>
        <div>
          <div className="theme-text-faint">종료 조건</div>
          <div className="font-semibold theme-text-primary mt-0.5">크레딧 0인 사람 3명</div>
        </div>
      </div>
      <div className="mt-auto flex gap-2">
        <button
          type="button"
          onClick={onOpenRules}
          className="px-4 py-3 rounded-xl border border-slate-300/80 dark:border-white/10 theme-control text-sm font-medium theme-text-secondary cursor-pointer inline-flex items-center gap-1.5"
        >
          <BookOpen className="w-4 h-4" />
          규칙
        </button>
        <button
          type="button"
          onClick={onStart}
          className="flex-1 inline-flex items-center justify-center gap-1.5 px-5 py-3 rounded-xl bg-gold-400 hover:bg-gold-300 text-gold-950 font-bold text-sm transition-colors cursor-pointer"
        >
          <Play className="w-4 h-4" />
          게임 시작
        </button>
      </div>
    </div>
  </div>
);

