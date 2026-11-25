import React, { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  BookOpen,
  Pause,
  Play,
  RotateCcw,
  SkipForward,
  Trophy,
  Volume2,
  VolumeX,
} from 'lucide-react';
// Result charts (and recharts with them) load only when a match result is shown.
const loadCharts = () => import('./components/MemoryPokerCharts');
const ScoreProgressionChart = lazy(() => loadCharts().then((m) => ({ default: m.ScoreProgressionChart })));
const WinRatePieChart = lazy(() => loadCharts().then((m) => ({ default: m.WinRatePieChart })));
const HandComparisonChart = lazy(() => loadCharts().then((m) => ({ default: m.HandComparisonChart })));
import { soundEngine } from './audio/soundEngine';
import { PlayingCard } from './components/PlayingCard';
import { RulesModal } from './components/RulesModal';
import { ShowdownPanel } from './components/ShowdownPanel';
import {
  AIDifficulty,
  BoardSolution,
  Card,
  GRID_COORDS,
  HAND_RANKINGS_META,
  HandCategory,
  HandEvaluation,
  compareHands,
  createShuffledDeck,
  evaluateFiveCardHand,
  findBestBoardCombination,
  selectAICards,
} from './engine/poker';
import {
  CareerStats,
  HAND_SHORT_LABEL,
  clearModeStats,
  loadCareerStats,
  recordRoundInStats,
} from './engine/stats';
import { GameScreenProps } from '../types';
import {
  DEFAULT_PLAYER_NAME,
  formatCompactBadgeName,
  pickAiOpponents,
} from '../playerProfiles';
import { MemoryPokerPreviewDiagram } from '../../components/GameBoardIllustrations';
import { ThemeToggleButton } from '../../components/ThemeToggleButton';

const MEMORIZE_SECONDS = 20;

type GameShell = 'TITLE_MENU' | 'PLAYING' | 'PAUSED' | 'GAME_OVER';
type GameMode = 'ai' | 'local2p';
type MatchFormat = 'single' | 'bo3';
type RoundPhase =
  | 'MEMORIZE'
  | 'COMMUNITY_REVEAL'
  | 'P1_SELECT'
  | 'PASS_TO_P2'
  | 'P2_SELECT'
  | 'AI_THINKING'
  | 'SHOWDOWN';

interface RoundRecord {
  roundNumber: number;
  winner: 'p1' | 'p2' | 'draw';
  p1Eval: HandEvaluation;
  p2Eval: HandEvaluation;
}

const AI_DIFFICULTY_LABEL: Record<AIDifficulty, string> = {
  normal: '쉬움',
  hard: '보통',
  master: '어려움',
};

export function MemoryPokerGame({ onExitToHub }: GameScreenProps) {
  // Shell & Settings
  const [shell, setShell] = useState<GameShell>('TITLE_MENU');
  const [mode, setMode] = useState<GameMode>('ai');
  const [aiDifficulty, setAiDifficulty] = useState<AIDifficulty>('hard');
  const [matchFormat, setMatchFormat] = useState<MatchFormat>('single');
  const [muted, setMuted] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [activeAiName, setActiveAiName] = useState<string>(() => pickAiOpponents(1)[0]);

  // Round & Match State
  const [roundNumber, setRoundNumber] = useState(1);
  const [p1Score, setP1Score] = useState(0);
  const [p2Score, setP2Score] = useState(0);
  const [history, setHistory] = useState<RoundRecord[]>([]);
  const [careerStats, setCareerStats] = useState<CareerStats>(() => loadCareerStats());

  // Active Round Cards & Phase
  const [phase, setPhase] = useState<RoundPhase>('MEMORIZE');
  const [gridCards, setGridCards] = useState<Card[]>([]);
  const [communityCards, setCommunityCards] = useState<Card[]>([]);
  const [revealedCommunityCount, setRevealedCommunityCount] = useState(0);

  // Memorization Timer (seconds remaining)
  const [timeLeftMs, setTimeLeftMs] = useState(MEMORIZE_SECONDS * 1000);
  const lastTickSecondRef = useRef<number>(MEMORIZE_SECONDS);

  // Token placements ("말 배치")
  const [p1Selected, setP1Selected] = useState<number[]>([]);
  const [p2Selected, setP2Selected] = useState<number[]>([]);
  const [p1Eval, setP1Eval] = useState<HandEvaluation | null>(null);
  const [p2Eval, setP2Eval] = useState<HandEvaluation | null>(null);
  const [optimalSolution, setOptimalSolution] = useState<BoardSolution | null>(null);
  const [showAllBoardCards, setShowAllBoardCards] = useState(false);

  const p1DisplayName = DEFAULT_PLAYER_NAME;
  const p1ShortLabel = DEFAULT_PLAYER_NAME;
  const opponentName = mode === 'ai' ? activeAiName : '2P';
  const opponentLabel =
    mode === 'ai'
      ? `${activeAiName} (${AI_DIFFICULTY_LABEL[aiDifficulty]})`
      : opponentName;
  const opponentShortLabel = formatCompactBadgeName(opponentName, 5);

  const toggleMute = useCallback(() => {
    setMuted((prev) => {
      const next = !prev;
      soundEngine.setMuted(next);
      return next;
    });
  }, []);

  const setupNewRound = useCallback((nextRoundNumber: number) => {
    const deck = createShuffledDeck();
    const sixteen = deck.slice(0, 16);
    const threeCommunity = deck.slice(16, 19);

    setGridCards(sixteen);
    setCommunityCards(threeCommunity);
    setRevealedCommunityCount(0);
    setP1Selected([]);
    setP2Selected([]);
    setP1Eval(null);
    setP2Eval(null);
    setOptimalSolution(null);
    setShowAllBoardCards(false);
    setRoundNumber(nextRoundNumber);
    setTimeLeftMs(MEMORIZE_SECONDS * 1000);
    lastTickSecondRef.current = MEMORIZE_SECONDS;
    setPhase('MEMORIZE');
    soundEngine.playCardFlip();
  }, []);

  const startMatch = useCallback(() => {
    if (mode === 'ai') {
      setActiveAiName(pickAiOpponents(1, [p1DisplayName])[0]);
    }
    setP1Score(0);
    setP2Score(0);
    setHistory([]);
    setShell('PLAYING');
    setupNewRound(1);
  }, [mode, p1DisplayName, setupNewRound]);

  const finishMemorization = useCallback(() => {
    soundEngine.playCardFlip();
    setTimeLeftMs(0);
    setRevealedCommunityCount(0);
    setPhase('COMMUNITY_REVEAL');
  }, []);

  // 20-second memorization countdown
  useEffect(() => {
    if (shell !== 'PLAYING' || phase !== 'MEMORIZE' || rulesOpen) return;

    let lastFrame = performance.now();
    let rafId = 0;

    const tick = (now: number) => {
      const dt = Math.min(now - lastFrame, 100);
      lastFrame = now;

      setTimeLeftMs((prev) => {
        const next = Math.max(0, prev - dt);
        const ceilSec = Math.ceil(next / 1000);
        if (ceilSec !== lastTickSecondRef.current && ceilSec > 0 && ceilSec <= 5) {
          lastTickSecondRef.current = ceilSec;
          soundEngine.playTick(ceilSec <= 3);
        }
        if (next === 0) {
          return 0;
        }
        return next;
      });

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [shell, phase, rulesOpen]);

  // Trigger transition when memorization hits 0
  useEffect(() => {
    if (shell === 'PLAYING' && phase === 'MEMORIZE' && timeLeftMs <= 0) {
      finishMemorization();
    }
  }, [shell, phase, timeLeftMs, finishMemorization]);

  // Sequential community card reveal (3 cards)
  useEffect(() => {
    if (shell !== 'PLAYING' || phase !== 'COMMUNITY_REVEAL') return;

    const t1 = window.setTimeout(() => {
      setRevealedCommunityCount(1);
      soundEngine.playCommunityReveal(0);
    }, 180);
    const t2 = window.setTimeout(() => {
      setRevealedCommunityCount(2);
      soundEngine.playCommunityReveal(1);
    }, 460);
    const t3 = window.setTimeout(() => {
      setRevealedCommunityCount(3);
      soundEngine.playCommunityReveal(2);
    }, 740);
    const t4 = window.setTimeout(() => {
      setPhase('P1_SELECT');
    }, 1080);

    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.clearTimeout(t3);
      window.clearTimeout(t4);
    };
  }, [shell, phase]);

  // Resolve showdown once both players have selected 2 cards
  const resolveShowdown = useCallback(
    (p1Pair: [number, number], p2Pair: [number, number]) => {
      const p1Hand = evaluateFiveCardHand([
        gridCards[p1Pair[0]],
        gridCards[p1Pair[1]],
        ...communityCards,
      ]);
      const p2Hand = evaluateFiveCardHand([
        gridCards[p2Pair[0]],
        gridCards[p2Pair[1]],
        ...communityCards,
      ]);
      const optimal = findBestBoardCombination(gridCards, communityCards);

      const cmp = compareHands(p1Hand, p2Hand);
      const winner: 'p1' | 'p2' | 'draw' = cmp === 1 ? 'p1' : cmp === -1 ? 'p2' : 'draw';

      if (cmp === 1) {
        setP1Score((s) => s + 1);
        soundEngine.playShowdownWin();
      } else if (cmp === -1) {
        setP2Score((s) => s + 1);
        soundEngine.playShowdownLose();
      } else {
        soundEngine.playShowdownDraw();
      }

      setP1Eval(p1Hand);
      setP2Eval(p2Hand);
      setOptimalSolution(optimal);
      setHistory((prev) => [
        ...prev,
        {
          roundNumber,
          winner,
          p1Eval: p1Hand,
          p2Eval: p2Hand,
        },
      ]);
      setCareerStats((prev) =>
        recordRoundInStats(prev, mode, winner, p1Hand.category, p2Hand.category)
      );
      setPhase('SHOWDOWN');
    },
    [gridCards, communityCards, roundNumber, mode]
  );

  // AI Thinking beat -> Showdown
  useEffect(() => {
    if (shell !== 'PLAYING' || phase !== 'AI_THINKING') return;
    if (p1Selected.length !== 2) return;

    const timer = window.setTimeout(() => {
      const aiPair = selectAICards(gridCards, communityCards, aiDifficulty);
      setP2Selected(aiPair);
      resolveShowdown([p1Selected[0], p1Selected[1]], aiPair);
    }, 680);

    return () => window.clearTimeout(timer);
  }, [shell, phase, p1Selected, gridCards, communityCards, aiDifficulty, resolveShowdown]);

  // Board slot click for personal game board token placement
  const handleCardSlotClick = useCallback(
    (index: number) => {
      if (shell !== 'PLAYING') return;
      if (phase !== 'P1_SELECT' && phase !== 'P2_SELECT') return;

      const setter = phase === 'P1_SELECT' ? setP1Selected : setP2Selected;
      setter((prev) => {
        if (prev.includes(index)) {
          soundEngine.playTokenRemove();
          return prev.filter((item) => item !== index);
        }
        soundEngine.playTokenPlace();
        if (prev.length < 2) {
          return [...prev, index];
        }
        // Replace oldest placed token smoothly
        return [prev[1], index];
      });
    },
    [shell, phase]
  );

  const handleConfirmSelection = useCallback(() => {
    if (phase === 'P1_SELECT' && p1Selected.length === 2) {
      soundEngine.playConfirm();
      if (mode === 'ai') {
        setPhase('AI_THINKING');
      } else {
        setPhase('PASS_TO_P2');
      }
    } else if (phase === 'P2_SELECT' && p2Selected.length === 2) {
      soundEngine.playConfirm();
      resolveShowdown(
        [p1Selected[0], p1Selected[1]],
        [p2Selected[0], p2Selected[1]]
      );
    }
  }, [phase, p1Selected, p2Selected, mode, resolveShowdown]);

  const isMatchOverAfterCurrentRound = useMemo(() => {
    if (matchFormat === 'single') return true;
    return p1Score >= 2 || p2Score >= 2;
  }, [matchFormat, p1Score, p2Score]);

  const scoreProgressionData = useMemo(() => {
    let p1Running = 0;
    let p2Running = 0;
    const points: Array<{
      round: string;
      p1: number;
      opponent: number;
      summary: string;
    }> = [
      {
        round: '시작',
        p1: 0,
        opponent: 0,
        summary: '경기 시작 (0 : 0)',
      },
    ];

    for (const item of history) {
      if (item.winner === 'p1') p1Running += 1;
      else if (item.winner === 'p2') p2Running += 1;
      points.push({
        round: `R${item.roundNumber}`,
        p1: p1Running,
        opponent: p2Running,
        summary: `${p1ShortLabel} ${item.p1Eval.categoryNameKo} vs ${opponentShortLabel} ${item.p2Eval.categoryNameKo}`,
      });
    }

    return points;
  }, [history, p1ShortLabel, opponentShortLabel]);

  const activeStats = careerStats[mode];

  const winRateStats = useMemo(() => {
    const total = activeStats.p1Wins + activeStats.opponentWins + activeStats.draws;
    const p1Rate = total > 0 ? Math.round((activeStats.p1Wins / total) * 100) : 0;
    const oppRate = total > 0 ? Math.round((activeStats.opponentWins / total) * 100) : 0;
    const drawRate = total > 0 ? Math.max(0, 100 - p1Rate - oppRate) : 0;

    const slices = [
      { name: `${p1ShortLabel} 승리`, value: activeStats.p1Wins, color: 'var(--color-gold-400)', rate: p1Rate },
      { name: `${opponentShortLabel} 승리`, value: activeStats.opponentWins, color: 'var(--color-rival-400)', rate: oppRate },
      { name: '무승부', value: activeStats.draws, color: 'var(--color-lounge-sky-400)', rate: drawRate },
    ];

    return {
      total,
      p1Rate,
      slices,
      nonZeroSlices: slices.filter((s) => s.value > 0),
    };
  }, [activeStats, p1ShortLabel, opponentShortLabel]);

  const handComparisonData = useMemo(() => {
    const ordered = [...HAND_RANKINGS_META].sort((a, b) => a.category - b.category);
    return ordered.map((meta) => ({
      category: meta.category,
      shortName: HAND_SHORT_LABEL[meta.category],
      fullName: meta.nameKo,
      p1: activeStats.p1Hands[meta.category] ?? 0,
      opponent: activeStats.opponentHands[meta.category] ?? 0,
    }));
  }, [activeStats]);

  const topHandsSummary = useMemo(() => {
    const findTop = (map: Record<HandCategory, number>) => {
      let bestCat: HandCategory | null = null;
      let bestCount = 0;
      for (const meta of HAND_RANKINGS_META) {
        const count = map[meta.category] ?? 0;
        if (count > bestCount) {
          bestCount = count;
          bestCat = meta.category;
        }
      }
      if (!bestCat || bestCount === 0) return '기록 없음';
      const label = HAND_RANKINGS_META.find((m) => m.category === bestCat)?.nameKo ?? '';
      return `${label} (${bestCount}회)`;
    };

    return {
      p1Top: findTop(activeStats.p1Hands),
      oppTop: findTop(activeStats.opponentHands),
    };
  }, [activeStats]);

  const handleNextFromShowdown = useCallback(() => {
    if (isMatchOverAfterCurrentRound) {
      setShell('GAME_OVER');
    } else {
      setupNewRound(roundNumber + 1);
    }
  }, [isMatchOverAfterCurrentRound, setupNewRound, roundNumber]);

  // Global keyboard shortcuts (Enter, Space, Esc, M)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isTextInput =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        target?.isContentEditable;

      if (isTextInput) {
        if (e.key === 'Escape' && target instanceof HTMLElement) {
          target.blur();
        }
        return;
      }

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
        return;
      }

      if (rulesOpen) return;

      if (shell === 'TITLE_MENU' && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault();
        startMatch();
        return;
      }

      if (shell === 'PLAYING') {
        if (phase === 'MEMORIZE' && e.key === ' ') {
          e.preventDefault();
          finishMemorization();
          return;
        }
        if (e.key === 'Enter') {
          if (
            (phase === 'P1_SELECT' && p1Selected.length === 2) ||
            (phase === 'P2_SELECT' && p2Selected.length === 2)
          ) {
            e.preventDefault();
            handleConfirmSelection();
          } else if (phase === 'PASS_TO_P2') {
            e.preventDefault();
            setPhase('P2_SELECT');
          } else if (phase === 'SHOWDOWN') {
            e.preventDefault();
            handleNextFromShowdown();
          }
        }
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    shell,
    phase,
    rulesOpen,
    p1Selected.length,
    p2Selected.length,
    toggleMute,
    startMatch,
    finishMemorization,
    handleConfirmSelection,
    handleNextFromShowdown,
  ]);

  const activeSelection = phase === 'P1_SELECT' ? p1Selected : phase === 'P2_SELECT' ? p2Selected : [];
  const activePlayerLabel = phase === 'P1_SELECT' ? p1DisplayName : opponentName;
  const timerSecondsDisplay = (timeLeftMs / 1000).toFixed(1);
  const timerPercent = Math.max(0, Math.min(100, (timeLeftMs / (MEMORIZE_SECONDS * 1000)) * 100));

  const phaseTitle = (() => {
    switch (phase) {
      case 'MEMORIZE':
        return '16장 카드 암기';
      case 'COMMUNITY_REVEAL':
        return '공유 카드 공개';
      case 'P1_SELECT':
        return `${p1DisplayName} · 개인 게임판 말 배치`;
      case 'PASS_TO_P2':
        return `${opponentName} 차례 준비`;
      case 'P2_SELECT':
        return `${opponentName} · 개인 게임판 말 배치`;
      case 'AI_THINKING':
        return `${activeAiName} 말 배치 중`;
      case 'SHOWDOWN':
        return '카드 공개 및 족보 판정';
    }
  })();

  const phaseStepIndex = (() => {
    switch (phase) {
      case 'MEMORIZE':
        return 0;
      case 'COMMUNITY_REVEAL':
        return 1;
      case 'P1_SELECT':
      case 'PASS_TO_P2':
      case 'P2_SELECT':
      case 'AI_THINKING':
        return 2;
      case 'SHOWDOWN':
        return 3;
    }
  })();

  return (
    <div className="relative min-h-screen w-full overflow-x-hidden theme-canvas flex flex-col transition-colors duration-150">
      {/* ================= TITLE SCREEN ================= */}
      {shell === 'TITLE_MENU' && (
        <main className="relative z-10 flex-1 flex flex-col justify-between px-5 py-6 sm:px-8 sm:py-8 max-w-6xl w-full mx-auto gap-8">
          {/* Top minimal utility row */}
          <div className="flex items-center justify-between gap-3 pb-4 border-b theme-border">
            <div className="flex items-center gap-3">
              {onExitToHub && (
                <button
                  type="button"
                  onClick={onExitToHub}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300/90 bg-white/80 text-xs font-medium text-slate-700 hover:border-slate-400 hover:text-slate-900 dark:border-white/10 dark:bg-obsidian-850 dark:text-lounge-slate-300 dark:hover:border-white/25 dark:hover:text-white transition-colors cursor-pointer whitespace-nowrap"
                >
                  <ArrowLeft className="w-4 h-4 theme-text-muted" />
                  매치 목록
                </button>
              )}
              <span className="hidden sm:inline font-mono-tabular text-xs theme-text-faint">
                시즌 3 · 데스매치
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setRulesOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300/90 bg-white/80 text-xs font-medium text-slate-700 hover:border-slate-400 hover:text-slate-900 dark:border-white/10 dark:bg-obsidian-850 dark:text-lounge-slate-300 dark:hover:border-white/25 dark:hover:text-white transition-colors cursor-pointer whitespace-nowrap"
              >
                <BookOpen className="w-4 h-4 theme-text-muted" />
                규칙 및 족보
              </button>
              <ThemeToggleButton compact />
              <button
                type="button"
                onClick={toggleMute}
                aria-label={muted ? '소리 켜기' : '음소거'}
                className="min-w-[38px] min-h-[38px] inline-flex items-center justify-center rounded-lg border border-slate-300/90 bg-white/80 text-slate-700 hover:border-slate-400 hover:text-slate-900 dark:border-white/10 dark:bg-obsidian-850 dark:text-lounge-slate-300 dark:hover:border-white/25 dark:hover:text-white transition-colors cursor-pointer"
              >
                {muted ? <VolumeX className="w-4 h-4 theme-text-rival" /> : <Volume2 className="w-4 h-4 theme-text-gold" />}
              </button>
            </div>
          </div>

          {/* Center Hero Split */}
          <div className="my-auto grid grid-cols-1 lg:grid-cols-[1.05fr_0.95fr] gap-8 lg:gap-10 items-stretch">
            {/* Left: Clean Vector Board Diagram & Summary */}
            <div className="flex flex-col justify-between gap-6">
              <div className="space-y-5">
                <div className="rounded-xl overflow-hidden border theme-border">
                  <MemoryPokerPreviewDiagram />
                </div>

                <div className="space-y-2">
                  <div className="font-mono-tabular text-xs theme-text-muted">
                    MEMORY POKER · 16 CARDS · 20 SEC
                  </div>
                  <h1 className="font-display text-3xl sm:text-4xl font-bold theme-text-primary">
                    기억 포커
                  </h1>
                  <p className="text-sm sm:text-base theme-text-secondary leading-relaxed text-pretty pt-1">
                    52장 중 무작위 <strong className="theme-text-primary font-semibold">16장의 카드</strong>를 20초 동안 암기한 뒤,
                    공개되는 <strong className="theme-text-primary font-semibold">공유 카드 3장</strong>과 합쳐 가장 강력한 5장 홀덤 족보를 완성하세요.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-3 border-y theme-border divide-x divide-slate-300/70 dark:divide-white/[0.08] text-xs">
                <div className="py-3 pr-3">
                  <div className="theme-text-faint">1단계</div>
                  <div className="font-semibold theme-text-primary mt-0.5">16장 암기 (20초)</div>
                </div>
                <div className="py-3 px-3">
                  <div className="theme-text-faint">2단계</div>
                  <div className="font-semibold theme-text-primary mt-0.5">공유 카드 3장 공개</div>
                </div>
                <div className="py-3 pl-3">
                  <div className="theme-text-faint">3단계</div>
                  <div className="font-semibold theme-text-primary mt-0.5">비공개 말 2개 배치</div>
                </div>
              </div>
            </div>

            {/* Right: Mode Config & Primary Start CTA */}
            <div className="obsidian-panel rounded-xl p-5 sm:p-6 flex flex-col justify-between gap-6">
              <div className="space-y-4">
                <div className="pb-3 border-b theme-border flex items-center justify-between gap-2">
                  <h2 className="font-display text-base font-bold theme-text-primary">
                    매치 설정
                  </h2>
                  <span className="font-mono-tabular text-xs theme-text-muted">
                    1P vs AI · 2P 로컬
                  </span>
                </div>

                {/* Mode selector */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium theme-text-muted">
                    대전 방식
                  </label>
                  <div className="grid grid-cols-2 gap-1 p-1 rounded-lg obsidian-subpanel">
                    <button
                      type="button"
                      onClick={() => setMode('ai')}
                      className={[
                        'py-2 px-3 rounded-md text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap',
                        mode === 'ai'
                          ? 'bg-gold-400 text-gold-950 font-bold'
                          : 'theme-text-secondary hover:text-slate-900 dark:hover:text-white',
                      ].join(' ')}
                    >
                      1P vs AI
                    </button>
                    <button
                      type="button"
                      onClick={() => setMode('local2p')}
                      className={[
                        'py-2 px-3 rounded-md text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap',
                        mode === 'local2p'
                          ? 'bg-gold-400 text-gold-950 font-bold'
                          : 'theme-text-secondary hover:text-slate-900 dark:hover:text-white',
                      ].join(' ')}
                    >
                      2P 로컬 대전
                    </button>
                  </div>
                </div>

                {/* AI Difficulty (only in AI mode) */}
                {mode === 'ai' && (
                  <div className="space-y-1.5">
                    <label className="block text-xs font-medium theme-text-muted">
                      AI 기억력 난이도
                    </label>
                    <div className="grid grid-cols-3 gap-1 p-1 rounded-lg obsidian-subpanel">
                      {(['normal', 'hard', 'master'] as AIDifficulty[]).map((diff) => (
                        <button
                          key={diff}
                          type="button"
                          onClick={() => setAiDifficulty(diff)}
                          className={[
                            'py-2 px-2 rounded-md text-xs sm:text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap',
                            aiDifficulty === diff
                              ? 'bg-white text-slate-900 border border-slate-300 shadow-2xs dark:bg-obsidian-800 dark:text-white dark:border-white/15'
                              : 'theme-text-muted hover:text-slate-900 dark:hover:text-white',
                          ].join(' ')}
                        >
                          {AI_DIFFICULTY_LABEL[diff]}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Match format */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium theme-text-muted">
                    경기 형식
                  </label>
                  <div className="grid grid-cols-2 gap-1 p-1 rounded-lg obsidian-subpanel">
                    <button
                      type="button"
                      onClick={() => setMatchFormat('single')}
                      className={[
                        'py-2 px-3 rounded-md text-xs sm:text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap',
                        matchFormat === 'single'
                          ? 'bg-white text-slate-900 border border-slate-300 shadow-2xs dark:bg-obsidian-800 dark:text-white dark:border-white/15'
                          : 'theme-text-muted hover:text-slate-900 dark:hover:text-white',
                      ].join(' ')}
                    >
                      단판 승부
                    </button>
                    <button
                      type="button"
                      onClick={() => setMatchFormat('bo3')}
                      className={[
                        'py-2 px-3 rounded-md text-xs sm:text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap',
                        matchFormat === 'bo3'
                          ? 'bg-white text-slate-900 border border-slate-300 shadow-2xs dark:bg-obsidian-800 dark:text-white dark:border-white/15'
                          : 'theme-text-muted hover:text-slate-900 dark:hover:text-white',
                      ].join(' ')}
                    >
                      3판 2선승
                    </button>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={startMatch}
                className="w-full py-3 px-5 rounded-lg bg-gold-400 hover:bg-gold-300 text-gold-950 font-bold text-sm sm:text-base transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <Play className="w-4 h-4 fill-current" />
                게임 시작
              </button>
            </div>
          </div>

          {/* Single flat control-hint line */}
          <p className="text-center text-xs theme-text-faint tracking-wide">
            클릭: 말 배치 · Enter: 시작 및 확정 · Space: 암기 완료 · M: 음소거 · Esc: 일시정지
          </p>
        </main>
      )}

      {/* ================= ACTIVE PLAYING VIEW ================= */}
      {(shell === 'PLAYING' || shell === 'PAUSED' || shell === 'GAME_OVER') && (
        <div className="relative z-10 flex-1 flex flex-col max-w-6xl w-full mx-auto px-3 sm:px-6 py-3 sm:py-4 gap-3 sm:gap-4">
          {/* Unobtrusive Top HUD Bar */}
          <header className="obsidian-panel flex items-center justify-between gap-3 px-3.5 sm:px-5 py-2.5 rounded-xl">
            <div className="flex items-center gap-3 sm:gap-4 min-w-0">
              <span className="font-display font-bold text-base sm:text-lg theme-text-primary whitespace-nowrap">
                기억 포커
              </span>
              <span className="hidden sm:inline theme-text-faint" aria-hidden="true">·</span>
              <span className="hidden sm:inline text-xs sm:text-sm font-medium theme-text-secondary whitespace-nowrap">
                {matchFormat === 'single' ? '단판 승부' : `3판 2선승 · 라운드 ${roundNumber}`}
              </span>
              <span className="theme-text-faint" aria-hidden="true">·</span>
              <span className="text-xs sm:text-sm font-semibold theme-text-sky truncate">
                {phaseTitle}
              </span>
            </div>

            <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
              {/* Score tally */}
              <div className="flex items-center gap-2 text-xs sm:text-sm font-mono-tabular px-3 py-1 rounded-lg obsidian-subpanel">
                <span className="theme-text-gold font-bold">{p1ShortLabel} {p1Score}</span>
                <span className="theme-text-faint">:</span>
                <span className="theme-text-rival font-bold">{p2Score} {opponentShortLabel}</span>
              </div>

              <button
                type="button"
                onClick={() => setRulesOpen(true)}
                aria-label="게임 규칙 및 족보"
                className="min-w-[38px] min-h-[38px] flex items-center justify-center rounded-lg border border-slate-300/80 bg-white/80 text-slate-700 hover:border-slate-400 hover:text-slate-900 dark:border-white/10 dark:bg-obsidian-850 dark:text-lounge-slate-200 dark:hover:border-white/25 dark:hover:text-white transition-colors cursor-pointer"
              >
                <BookOpen className="w-4 h-4" />
              </button>
              <ThemeToggleButton compact />
              <button
                type="button"
                onClick={toggleMute}
                aria-label={muted ? '소리 켜기' : '음소거'}
                className="min-w-[38px] min-h-[38px] flex items-center justify-center rounded-lg border border-slate-300/80 bg-white/80 text-slate-700 hover:border-slate-400 hover:text-slate-900 dark:border-white/10 dark:bg-obsidian-850 dark:text-lounge-slate-200 dark:hover:border-white/25 dark:hover:text-white transition-colors cursor-pointer"
              >
                {muted ? <VolumeX className="w-4 h-4 theme-text-rival" /> : <Volume2 className="w-4 h-4" />}
              </button>
              <button
                type="button"
                onClick={() => setShell('PAUSED')}
                aria-label="일시정지"
                className="min-w-[38px] min-h-[38px] flex items-center justify-center rounded-lg border border-slate-300/80 bg-white/80 text-slate-700 hover:border-slate-400 hover:text-slate-900 dark:border-white/10 dark:bg-obsidian-850 dark:text-lounge-slate-200 dark:hover:border-white/25 dark:hover:text-white transition-colors cursor-pointer"
              >
                <Pause className="w-4 h-4" />
              </button>
            </div>
          </header>

          {/* 4-Step Round Progress Bar */}
          <div
            aria-label="라운드 진행 단계"
            className="grid grid-cols-4 gap-1.5 sm:gap-2 text-[11px] sm:text-xs font-mono-tabular"
          >
            {[
              '01. 16장 암기',
              '02. 공유 카드',
              '03. 말 2개 배치',
              '04. 족보 판정',
            ].map((label, idx) => {
              const isCurrent = idx === phaseStepIndex;
              const isDone = idx < phaseStepIndex;
              return (
                <div
                  key={label}
                  className={[
                    'px-2.5 py-1.5 rounded-lg border text-center truncate transition-colors',
                    isCurrent
                      ? 'bg-amber-50 border-amber-400 text-amber-800 dark:bg-gold-400/15 dark:border-gold-400/60 dark:text-gold-200 font-bold'
                      : isDone
                        ? 'obsidian-panel theme-text-secondary'
                        : 'obsidian-subpanel theme-text-faint',
                  ].join(' ')}
                >
                  {label}
                </div>
              );
            })}
          </div>

          {/* Main Tabletop Workspace */}
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-[minmax(0,450px)_1fr] gap-4 sm:gap-6 items-start">
            {/* LEFT: 4x4 Memory Grid / Personal Game Board */}
            <section className="felt-table-surface rounded-xl p-3.5 sm:p-4.5">
              <div className="flex items-center justify-between mb-3">
                <div className="text-xs sm:text-sm font-semibold theme-text-primary">
                  {phase === 'MEMORIZE'
                    ? '16장 카드 보드 (암기 중)'
                    : phase === 'P1_SELECT'
                      ? `${p1DisplayName} 개인 게임판`
                      : phase === 'P2_SELECT'
                        ? `${opponentName} 개인 게임판`
                        : '16장 카드 보드'}
                </div>
                <span className="font-mono-tabular text-xs theme-text-muted">
                  4 × 4 · A1–D4
                </span>
              </div>

              <div className="grid grid-cols-4 gap-2 sm:gap-2.5">
                {gridCards.map((card, idx) => {
                  const coord = GRID_COORDS[idx];
                  const isP1Pick =
                    (phase === 'P1_SELECT' && p1Selected.includes(idx)) ||
                    (phase === 'AI_THINKING' && p1Selected.includes(idx)) ||
                    (phase === 'SHOWDOWN' && p1Selected.includes(idx));

                  const isP2Pick =
                    (phase === 'P2_SELECT' && p2Selected.includes(idx)) ||
                    (phase === 'SHOWDOWN' && p2Selected.includes(idx));

                  const isFaceUp =
                    phase === 'MEMORIZE' ||
                    (phase === 'SHOWDOWN' && (showAllBoardCards || isP1Pick || isP2Pick));

                  const isInteractive = phase === 'P1_SELECT' || phase === 'P2_SELECT';

                  const isOptimalSlot =
                    phase === 'SHOWDOWN' &&
                    optimalSolution !== null &&
                    optimalSolution.indices.includes(idx);

                  const isDimmedInShowdown =
                    phase === 'SHOWDOWN' && showAllBoardCards && !isP1Pick && !isP2Pick;

                  return (
                    <div key={card.id} className="w-full aspect-[5/7] min-h-[68px]">
                      <PlayingCard
                        card={card}
                        coord={coord}
                        faceUp={isFaceUp}
                        interactive={isInteractive}
                        dimmed={isDimmedInShowdown}
                        isOptimalHint={isOptimalSlot && !isP1Pick && !isP2Pick}
                        p1Token={isP1Pick}
                        p2Token={isP2Pick}
                        p1Label={p1DisplayName}
                        p2Label={opponentName}
                        onClick={() => handleCardSlotClick(idx)}
                        size="md"
                      />
                    </div>
                  );
                })}
              </div>
            </section>

            {/* RIGHT: Community Cards + Phase Status / Controls / Showdown */}
            <div className="flex flex-col gap-4">
              {/* Community Cards Zone */}
              <section className="felt-table-surface rounded-xl p-4 sm:p-5">
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div>
                    <h2 className="text-sm sm:text-base font-bold theme-text-primary">
                      공유 카드 3장
                    </h2>
                    <p className="text-xs theme-text-muted mt-0.5">
                      {phase === 'MEMORIZE'
                        ? '20초 암기가 끝나면 공유 카드 3장이 공개됩니다.'
                        : '선택한 2장의 카드와 이 3장을 합쳐 5장 족보를 만듭니다.'}
                    </p>
                  </div>
                  <span className="font-mono-tabular text-xs theme-text-sky font-semibold whitespace-nowrap">
                    {revealedCommunityCount} / 3 공개
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-3 max-w-[340px] mx-auto sm:mx-0">
                  {communityCards.map((card, i) => (
                    <div key={card.id} className="w-full aspect-[5/7]">
                      <PlayingCard
                        card={card}
                        faceUp={phase !== 'MEMORIZE' && i < revealedCommunityCount}
                        size="lg"
                      />
                    </div>
                  ))}
                </div>
              </section>

              {/* Phase-Specific Control Panel */}
              {phase === 'MEMORIZE' && (
                <section className="obsidian-sky-panel rounded-xl p-4 sm:p-5 space-y-4">
                  <div className="flex items-end justify-between gap-4">
                    <div>
                      <span className="text-xs font-semibold theme-text-sky">
                        암기 제한 시간
                      </span>
                      <div className="font-mono-tabular text-3xl sm:text-4xl font-bold theme-text-primary mt-0.5">
                        {timerSecondsDisplay}
                        <span className="text-base font-normal theme-text-muted ml-1">초</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={finishMemorization}
                      className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-gold-400 hover:bg-gold-300 text-gold-950 font-bold text-xs sm:text-sm transition-colors cursor-pointer whitespace-nowrap shrink-0"
                    >
                      <SkipForward className="w-4 h-4" />
                      암기 완료 · 바로 시작
                    </button>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full h-2 rounded-full obsidian-subpanel overflow-hidden">
                    <div
                      className={[
                        'h-full transition-[width] duration-75',
                        timeLeftMs <= 5000 ? 'bg-rival-500' : 'bg-sky-500 dark:bg-lounge-sky-400',
                      ].join(' ')}
                      style={{ width: `${timerPercent}%` }}
                    />
                  </div>

                  <p className="text-xs theme-text-secondary">
                    카드 위치(A1–D4)와 숫자·문양을 함께 외우면 공유 카드 공개 후 빠르게 조합할 수 있습니다.
                  </p>
                </section>
              )}

              {phase === 'COMMUNITY_REVEAL' && (
                <section className="obsidian-sky-panel rounded-xl p-5 text-sm theme-text-sky font-medium">
                  공유 카드 3장을 테이블에 공개하고 있습니다...
                </section>
              )}

              {(phase === 'P1_SELECT' || phase === 'P2_SELECT') && (
                <section className="obsidian-panel rounded-xl p-4 sm:p-5 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h3 className="text-base font-bold theme-text-primary">
                        {activePlayerLabel} · 말 배치 ({activeSelection.length} / 2)
                      </h3>
                      <p className="text-xs theme-text-muted mt-0.5">
                        왼쪽 게임판에서 원하는 카드 위치 2곳을 클릭해 말을 놓으세요.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {[0, 1].map((slotIdx) => {
                      const chosenIndex = activeSelection[slotIdx];
                      const hasPick = chosenIndex !== undefined;
                      return (
                        <div
                          key={slotIdx}
                          className={[
                            'flex-1 rounded-lg border px-3.5 py-2.5 flex items-center justify-between',
                            hasPick
                              ? 'bg-amber-50 border-amber-400 text-amber-800 dark:bg-gold-400/10 dark:border-gold-400/60 dark:text-gold-200'
                              : 'obsidian-subpanel theme-text-faint',
                          ].join(' ')}
                        >
                          <span className="text-xs font-medium">말 {slotIdx + 1}</span>
                          <span className="font-mono-tabular text-sm font-bold">
                            {hasPick ? GRID_COORDS[chosenIndex] : '미선택'}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex items-center justify-between gap-3 pt-1">
                    <button
                      type="button"
                      disabled={activeSelection.length === 0}
                      onClick={() => {
                        soundEngine.playTokenRemove();
                        if (phase === 'P1_SELECT') setP1Selected([]);
                        else setP2Selected([]);
                      }}
                      className="px-3.5 py-2.5 rounded-lg border border-slate-300/90 text-xs sm:text-sm font-medium text-slate-700 hover:border-slate-400 hover:text-slate-900 dark:border-white/10 dark:text-lounge-slate-200 dark:hover:border-white/25 dark:hover:text-white disabled:opacity-40 disabled:pointer-events-none transition-colors cursor-pointer"
                    >
                      배치 초기화
                    </button>

                    <button
                      type="button"
                      disabled={activeSelection.length !== 2}
                      onClick={handleConfirmSelection}
                      className="px-5 py-2.5 rounded-lg bg-gold-400 hover:bg-gold-300 disabled:bg-slate-200 disabled:text-slate-400 dark:disabled:bg-lounge-slate-800 dark:disabled:text-lounge-slate-500 text-gold-950 font-bold text-sm transition-colors cursor-pointer disabled:cursor-not-allowed whitespace-nowrap"
                    >
                      선택 확정 (Enter)
                    </button>
                  </div>
                </section>
              )}

              {phase === 'PASS_TO_P2' && (
                <section className="obsidian-panel rounded-xl p-5 sm:p-6 space-y-4">
                  <h3 className="font-display text-xl font-bold theme-text-primary">
                    {p1DisplayName} 선택 완료
                  </h3>
                  <p className="text-sm theme-text-secondary leading-relaxed">
                    {p1DisplayName}의 말 위치는 비공개로 저장되었습니다. 화면을 <strong className="theme-text-primary">{opponentName}</strong>에게 넘긴 뒤 아래 버튼을 눌러 말을 배치하세요.
                  </p>
                  <button
                    type="button"
                    onClick={() => setPhase('P2_SELECT')}
                    className="px-5 py-3 rounded-lg bg-gold-400 hover:bg-gold-300 text-gold-950 font-bold text-sm transition-colors cursor-pointer"
                  >
                    {opponentName} 말 배치 시작 (Enter)
                  </button>
                </section>
              )}

              {phase === 'AI_THINKING' && (
                <section className="obsidian-sky-panel rounded-xl p-5 space-y-2">
                  <h3 className="text-base font-bold theme-text-sky">
                    {opponentLabel} 선택 중...
                  </h3>
                  <p className="text-xs sm:text-sm theme-text-secondary">
                    {activeAiName}가 자신의 게임판 위 2개 위치에 말을 배치하고 있습니다.
                  </p>
                </section>
              )}

              {phase === 'SHOWDOWN' && p1Eval && p2Eval && optimalSolution && p1Selected.length === 2 && p2Selected.length === 2 && (
                <ShowdownPanel
                  p1Indices={[p1Selected[0], p1Selected[1]]}
                  p2Indices={[p2Selected[0], p2Selected[1]]}
                  gridCards={gridCards}
                  communityCards={communityCards}
                  p1Eval={p1Eval}
                  p2Eval={p2Eval}
                  optimalSolution={optimalSolution}
                  p1Label={p1DisplayName}
                  opponentLabel={opponentLabel}
                  showAllBoardCards={showAllBoardCards}
                  onToggleShowAllBoardCards={() => setShowAllBoardCards((v) => !v)}
                  onNextAction={handleNextFromShowdown}
                  nextActionLabel={isMatchOverAfterCurrentRound ? '최종 결과 보기' : '다음 라운드'}
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* ================= PAUSE MODAL ================= */}
      {shell === 'PAUSED' && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/55 dark:bg-black/75 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="게임 일시정지"
        >
          <div className="w-full max-w-sm obsidian-panel rounded-xl p-6 space-y-4">
            <h2 className="font-display text-2xl font-bold theme-text-primary">일시정지</h2>
            <p className="text-sm theme-text-secondary">
              {phase === 'MEMORIZE' ? '암기 타이머가 일시정지되었습니다.' : '게임이 잠시 멈췄습니다.'}
            </p>
            <div className="flex flex-col gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setShell('PLAYING')}
                className="w-full py-2.5 px-4 rounded-lg bg-gold-400 hover:bg-gold-300 text-gold-950 font-bold text-sm transition-colors cursor-pointer"
              >
                계속하기 (Esc)
              </button>
              <button
                type="button"
                onClick={() => setRulesOpen(true)}
                className="w-full py-2.5 px-4 rounded-lg border border-slate-300/90 bg-slate-50 hover:border-slate-400 text-slate-700 hover:text-slate-900 dark:border-white/10 dark:bg-obsidian-850 dark:hover:border-white/25 dark:text-lounge-slate-200 dark:hover:text-white font-semibold text-sm transition-colors cursor-pointer"
              >
                규칙 및 족보 보기
              </button>
              <button
                type="button"
                onClick={startMatch}
                className="w-full py-2.5 px-4 rounded-lg border border-slate-300/90 bg-slate-50 hover:border-slate-400 text-slate-700 hover:text-slate-900 dark:border-white/10 dark:bg-obsidian-850 dark:hover:border-white/25 dark:text-lounge-slate-200 dark:hover:text-white font-semibold text-sm transition-colors cursor-pointer"
              >
                새 게임 다시 시작
              </button>
              <button
                type="button"
                onClick={() => setShell('TITLE_MENU')}
                className="w-full py-2.5 px-4 rounded-lg border border-slate-300/70 text-slate-600 hover:text-slate-900 hover:border-slate-400 dark:border-white/[0.08] dark:text-lounge-slate-400 dark:hover:text-white dark:hover:border-white/25 font-medium text-sm transition-colors cursor-pointer"
              >
                게임 타이틀로
              </button>
              {onExitToHub && (
                <button
                  type="button"
                  onClick={onExitToHub}
                  className="w-full py-2.5 px-4 rounded-lg border border-slate-300/70 text-slate-600 hover:text-slate-900 hover:border-slate-400 dark:border-white/[0.08] dark:text-lounge-slate-400 dark:hover:text-white dark:hover:border-white/25 font-medium text-sm transition-colors cursor-pointer"
                >
                  전체 게임 목록으로
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ================= MATCH GAME OVER MODAL ================= */}
      {shell === 'GAME_OVER' && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/55 dark:bg-black/80 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="최종 경기 결과"
        >
          <div className="w-full max-w-3xl max-h-[92vh] overflow-y-auto obsidian-panel rounded-xl p-5 sm:p-7 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-300 text-amber-700 dark:bg-gold-400/15 dark:border-gold-400/50 dark:text-gold-200 flex items-center justify-center shrink-0">
                  <Trophy className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="font-display text-2xl font-bold theme-text-primary">
                    {p1Score > p2Score
                      ? `${p1DisplayName} 최종 승리`
                      : p2Score > p1Score
                        ? `${opponentLabel} 최종 승리`
                        : '무승부 종료'}
                  </h2>
                  <p className="text-sm theme-text-secondary font-mono-tabular mt-0.5">
                    이번 경기 스코어 · {p1ShortLabel} {p1Score} : {p2Score} {opponentShortLabel}
                  </p>
                </div>
              </div>

              {winRateStats.total > 0 && (
                <button
                  type="button"
                  onClick={() => setCareerStats((prev) => clearModeStats(prev, mode))}
                  className="text-xs theme-text-muted hover:text-slate-900 dark:hover:text-white underline underline-offset-4 transition-colors cursor-pointer"
                >
                  누적 통계 초기화
                </button>
              )}
            </div>

            {/* Row 1: Score Progression Line Chart + Career Win Rate Pie Chart */}
            <div className="grid grid-cols-1 md:grid-cols-[1.35fr_1fr] gap-4">
              {/* Score Progression Line Chart */}
              <div className="obsidian-subpanel rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-xs sm:text-sm font-semibold theme-text-secondary">
                    이번 경기 점수 추이
                  </h3>
                  <span className="font-mono-tabular text-xs theme-text-sky">
                    총 {history.length}라운드
                  </span>
                </div>
                <div className="w-full h-[185px]">
                  <Suspense fallback={null}>
                    <ScoreProgressionChart
                      data={scoreProgressionData}
                      maxScore={Math.max(p1Score, p2Score)}
                      p1Name={p1DisplayName}
                      opponentName={opponentLabel}
                    />
                  </Suspense>
                </div>
              </div>

              {/* Cumulative Win Rate Pie Chart */}
              <div className="obsidian-subpanel rounded-xl p-4 flex flex-col justify-between gap-2">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-xs sm:text-sm font-semibold theme-text-secondary">
                    현재까지의 승률
                  </h3>
                  <span className="font-mono-tabular text-xs theme-text-sky">
                    누적 {winRateStats.total}라운드
                  </span>
                </div>

                {winRateStats.total === 0 ? (
                  <div className="h-[185px] flex items-center justify-center text-xs theme-text-muted">
                    기록된 라운드가 없습니다
                  </div>
                ) : (
                  <div className="flex items-center gap-3 h-[185px]">
                    <div className="relative w-[148px] h-[165px] shrink-0">
                      <Suspense fallback={null}>
                        <WinRatePieChart slices={winRateStats.nonZeroSlices} />
                      </Suspense>
                      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-[10px] theme-text-muted truncate max-w-[78px]">
                          {p1ShortLabel} 승률
                        </span>
                        <span className="font-mono-tabular text-lg font-bold theme-text-gold leading-tight">
                          {winRateStats.p1Rate}%
                        </span>
                      </div>
                    </div>

                    <div className="flex-1 space-y-2 text-xs">
                      {winRateStats.slices.map((slice) => (
                        <div key={slice.name} className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span
                              className="w-2.5 h-2.5 rounded-sm shrink-0"
                              style={{ backgroundColor: slice.color }}
                              aria-hidden="true"
                            />
                            <span className="theme-text-secondary truncate">{slice.name}</span>
                          </div>
                          <span className="font-mono-tabular font-semibold theme-text-primary whitespace-nowrap">
                            {slice.value}회 ({slice.rate}%)
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Row 2: Preferred vs Opponent Completed Hands Bar Chart */}
            <div className="obsidian-subpanel rounded-xl p-4 space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-xs sm:text-sm font-semibold theme-text-secondary">
                  {p1ShortLabel} 선호 족보 vs {opponentShortLabel} 완성 족보 비교
                </h3>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs theme-text-muted">
                  <span>
                    {p1ShortLabel} 최다: <strong className="theme-text-gold">{topHandsSummary.p1Top}</strong>
                  </span>
                  <span aria-hidden="true" className="theme-text-faint">·</span>
                  <span>
                    {opponentShortLabel} 최다:{' '}
                    <strong className="theme-text-rival">{topHandsSummary.oppTop}</strong>
                  </span>
                </div>
              </div>

              <div className="w-full h-[210px]">
                <Suspense fallback={null}>
                  <HandComparisonChart data={handComparisonData} p1Name={p1DisplayName} opponentName={opponentName} />
                </Suspense>
              </div>
            </div>

            {/* Round breakdown */}
            <div className="divide-y divide-slate-200 dark:divide-white/10 rounded-xl obsidian-subpanel">
              {history.map((item) => (
                <div
                  key={item.roundNumber}
                  className="flex items-center justify-between gap-3 px-4 py-2.5 text-xs sm:text-sm"
                >
                  <span className="font-mono-tabular theme-text-gold font-semibold shrink-0">
                    R{item.roundNumber}
                  </span>
                  <div className="flex-1 theme-text-secondary truncate">
                    <span>{p1ShortLabel}: {item.p1Eval.descriptionKo}</span>
                    <span className="mx-1.5 theme-text-faint" aria-hidden="true">vs</span>
                    <span>{opponentShortLabel}: {item.p2Eval.descriptionKo}</span>
                  </div>
                  <span
                    className={[
                      'font-bold whitespace-nowrap',
                      item.winner === 'p1'
                        ? 'theme-text-gold'
                        : item.winner === 'p2'
                          ? 'theme-text-rival'
                          : 'theme-text-sky',
                    ].join(' ')}
                  >
                    {item.winner === 'p1'
                      ? `${p1ShortLabel} 승`
                      : item.winner === 'p2'
                        ? `${opponentShortLabel} 승`
                        : '무승부'}
                  </span>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap items-center justify-end gap-3 pt-1">
              {onExitToHub && (
                <button
                  type="button"
                  onClick={onExitToHub}
                  className="px-4 py-2.5 rounded-lg border border-slate-300/90 text-sm font-medium text-slate-700 hover:border-slate-400 hover:text-slate-900 dark:border-white/10 dark:text-lounge-slate-200 dark:hover:border-white/25 dark:hover:text-white transition-colors cursor-pointer"
                >
                  게임 목록
                </button>
              )}
              <button
                type="button"
                onClick={() => setShell('TITLE_MENU')}
                className="px-4 py-2.5 rounded-lg border border-slate-300/90 text-sm font-medium text-slate-700 hover:border-slate-400 hover:text-slate-900 dark:border-white/10 dark:text-lounge-slate-200 dark:hover:border-white/25 dark:hover:text-white transition-colors cursor-pointer"
              >
                타이틀로
              </button>
              <button
                type="button"
                onClick={startMatch}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg bg-gold-400 hover:bg-gold-300 text-gold-950 font-bold text-sm transition-colors cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                다시 플레이
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rules Modal */}
      <RulesModal open={rulesOpen} onClose={() => setRulesOpen(false)} />
    </div>
  );
}
