import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  BookOpen,
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
import { soundEngine } from './audio/soundEngine';
import { PlayingCard } from './components/PlayingCard';
import { RulesModal } from './components/RulesModal';
import { ShowdownPanel } from './components/ShowdownPanel';
import {
  AIDifficulty,
  BoardSolution,
  Card,
  GRID_COORDS,
  HandEvaluation,
  compareHands,
  createShuffledDeck,
  evaluateFiveCardHand,
  findBestBoardCombination,
  selectAICards,
} from './engine/poker';
import feltTableImage from './assets/images/memory_poker_felt_table_1794895838152.jpg';

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
  normal: '보통',
  hard: '어려움',
  master: '마스터',
};

export default function App() {
  // Shell & Settings
  const [shell, setShell] = useState<GameShell>('TITLE_MENU');
  const [mode, setMode] = useState<GameMode>('ai');
  const [aiDifficulty, setAiDifficulty] = useState<AIDifficulty>('hard');
  const [matchFormat, setMatchFormat] = useState<MatchFormat>('single');
  const [muted, setMuted] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [bgFailed, setBgFailed] = useState(false);

  // Round & Match State
  const [roundNumber, setRoundNumber] = useState(1);
  const [p1Score, setP1Score] = useState(0);
  const [p2Score, setP2Score] = useState(0);
  const [history, setHistory] = useState<RoundRecord[]>([]);

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

  const opponentLabel = mode === 'ai' ? `AI (${AI_DIFFICULTY_LABEL[aiDifficulty]})` : '플레이어 2';
  const opponentShortLabel = mode === 'ai' ? 'AI' : 'P2';

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
    setP1Score(0);
    setP2Score(0);
    setHistory([]);
    setShell('PLAYING');
    setupNewRound(1);
  }, [setupNewRound]);

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
      setPhase('SHOWDOWN');
    },
    [gridCards, communityCards, roundNumber]
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
        summary: `P1 ${item.p1Eval.categoryNameKo} vs ${opponentShortLabel} ${item.p2Eval.categoryNameKo}`,
      });
    }

    return points;
  }, [history, opponentShortLabel]);

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
  const activePlayerLabel = phase === 'P1_SELECT' ? '플레이어 1' : '플레이어 2';
  const timerSecondsDisplay = (timeLeftMs / 1000).toFixed(1);
  const timerPercent = Math.max(0, Math.min(100, (timeLeftMs / (MEMORIZE_SECONDS * 1000)) * 100));

  const phaseTitle = (() => {
    switch (phase) {
      case 'MEMORIZE':
        return '16장 카드 암기';
      case 'COMMUNITY_REVEAL':
        return '공유 카드 공개';
      case 'P1_SELECT':
        return '플레이어 1 · 개인 게임판 말 배치';
      case 'PASS_TO_P2':
        return '플레이어 2 차례 준비';
      case 'P2_SELECT':
        return '플레이어 2 · 개인 게임판 말 배치';
      case 'AI_THINKING':
        return 'AI 말 배치 중';
      case 'SHOWDOWN':
        return '카드 공개 및 족보 판정';
    }
  })();

  return (
    <div className="relative min-h-screen w-full overflow-x-hidden bg-[#061c13] text-[#f5f3ee] flex flex-col">
      {/* Luxury Card Table Felt Backdrop */}
      <div className="pointer-events-none fixed inset-0 z-0">
        {!bgFailed && (
          <img
            src={feltTableImage}
            alt="에메랄드 펠트 카드 테이블 배경"
            referrerPolicy="no-referrer"
            onError={() => setBgFailed(true)}
            className="w-full h-full object-cover opacity-55"
          />
        )}
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(circle at 50% 40%, rgba(11, 59, 39, 0.42) 0%, rgba(5, 22, 15, 0.88) 72%, rgba(3, 14, 9, 0.97) 100%)',
          }}
        />
      </div>

      {/* ================= TITLE SCREEN ================= */}
      {shell === 'TITLE_MENU' && (
        <main className="relative z-10 flex-1 flex flex-col justify-between px-6 py-8 sm:px-10 sm:py-10 max-w-6xl w-full mx-auto">
          {/* Top minimal utility row */}
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setRulesOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-emerald-700/60 bg-[#082117]/80 text-xs font-medium text-emerald-100 hover:bg-emerald-900/70 transition-colors cursor-pointer"
            >
              <BookOpen className="w-4 h-4 text-amber-300" />
              규칙 및 족보
            </button>
            <button
              type="button"
              onClick={toggleMute}
              aria-label={muted ? '소리 켜기' : '음소거'}
              className="min-w-[40px] min-h-[40px] inline-flex items-center justify-center rounded-lg border border-emerald-700/60 bg-[#082117]/80 text-emerald-100 hover:bg-emerald-900/70 transition-colors cursor-pointer"
            >
              {muted ? <VolumeX className="w-4 h-4 text-rose-300" /> : <Volume2 className="w-4 h-4 text-amber-300" />}
            </button>
          </div>

          {/* Center Hero with 30-40% calm negative space */}
          <div className="my-auto grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-10 items-center py-6">
            {/* Left: Bespoke Inline SVG Title Lockup & concise game brief */}
            <div className="space-y-6">
              <svg
                viewBox="0 0 460 132"
                className="w-full max-w-[440px] h-auto"
                role="img"
                aria-label="기억 포커 Memory Poker"
              >
                {/* Decorative card fan crest */}
                <g transform="translate(8, 12)">
                  <rect
                    x="4"
                    y="14"
                    width="54"
                    height="78"
                    rx="7"
                    fill="#10263b"
                    stroke="#c9a45c"
                    strokeWidth="2"
                    transform="rotate(-10 31 53)"
                  />
                  <rect
                    x="22"
                    y="10"
                    width="54"
                    height="78"
                    rx="7"
                    fill="#faf8f2"
                    stroke="#e5dec9"
                    strokeWidth="2"
                    transform="rotate(6 49 49)"
                  />
                  <text
                    x="49"
                    y="42"
                    textAnchor="middle"
                    fill="#c81e1e"
                    fontSize="18"
                    fontWeight="700"
                    fontFamily="Fraunces, serif"
                    transform="rotate(6 49 49)"
                  >
                    A
                  </text>
                  <text
                    x="49"
                    y="66"
                    textAnchor="middle"
                    fill="#c81e1e"
                    fontSize="22"
                    transform="rotate(6 49 49)"
                  >
                    ♥
                  </text>
                </g>

                {/* Title Lockup */}
                <text
                  x="104"
                  y="66"
                  fill="#fef3c7"
                  fontSize="50"
                  fontWeight="700"
                  fontFamily="Fraunces, Noto Sans KR, serif"
                  letterSpacing="-0.02em"
                >
                  기억 포커
                </text>
                <line x1="106" y1="82" x2="368" y2="82" stroke="#d97706" strokeOpacity="0.45" strokeWidth="1.5" />
                <text
                  x="106"
                  y="108"
                  fill="#a7f3d0"
                  fontSize="16"
                  fontWeight="600"
                  fontFamily="Plus Jakarta Sans, sans-serif"
                  letterSpacing="0.22em"
                >
                  MEMORY POKER
                </text>
              </svg>

              <p className="max-w-lg text-base sm:text-lg text-emerald-100/90 leading-relaxed text-pretty">
                52장 중 무작위 <strong className="text-amber-200 font-semibold">16장의 카드</strong>를 20초 동안 암기한 뒤,
                공개되는 <strong className="text-amber-200 font-semibold">공유 카드 3장</strong>과 합쳐 가장 강력한 5장 홀덤 족보를 완성하세요.
              </p>

              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs sm:text-sm text-emerald-200/80">
                <span>16장 암기 (20초)</span>
                <span aria-hidden="true">·</span>
                <span>공유 카드 3장 공개</span>
                <span aria-hidden="true">·</span>
                <span>개인 게임판 말 2개 배치</span>
              </div>
            </div>

            {/* Right: Mode Config & Primary Start CTA */}
            <div className="rounded-2xl bg-[#082218]/90 border border-emerald-700/50 shadow-2xl p-6 sm:p-7 space-y-5">
              {/* Mode selector */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-emerald-200/80">
                  대전 방식
                </label>
                <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-[#04140d] border border-emerald-800/50">
                  <button
                    type="button"
                    onClick={() => setMode('ai')}
                    className={[
                      'py-2.5 px-3 rounded-lg text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap',
                      mode === 'ai'
                        ? 'bg-amber-400 text-[#1a1304]'
                        : 'text-emerald-200/80 hover:text-white',
                    ].join(' ')}
                  >
                    1P vs AI
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode('local2p')}
                    className={[
                      'py-2.5 px-3 rounded-lg text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap',
                      mode === 'local2p'
                        ? 'bg-amber-400 text-[#1a1304]'
                        : 'text-emerald-200/80 hover:text-white',
                    ].join(' ')}
                  >
                    2P 로컬 대전
                  </button>
                </div>
              </div>

              {/* AI Difficulty (only in AI mode) */}
              {mode === 'ai' && (
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-emerald-200/80">
                    AI 기억력 난이도
                  </label>
                  <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-[#04140d] border border-emerald-800/50">
                    {(['normal', 'hard', 'master'] as AIDifficulty[]).map((diff) => (
                      <button
                        key={diff}
                        type="button"
                        onClick={() => setAiDifficulty(diff)}
                        className={[
                          'py-2 px-2 rounded-lg text-xs sm:text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap',
                          aiDifficulty === diff
                            ? 'bg-emerald-700 text-white'
                            : 'text-emerald-200/75 hover:text-white',
                        ].join(' ')}
                      >
                        {AI_DIFFICULTY_LABEL[diff]}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Match format */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-emerald-200/80">
                  경기 형식
                </label>
                <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-[#04140d] border border-emerald-800/50">
                  <button
                    type="button"
                    onClick={() => setMatchFormat('single')}
                    className={[
                      'py-2 px-3 rounded-lg text-xs sm:text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap',
                      matchFormat === 'single'
                        ? 'bg-emerald-700 text-white'
                        : 'text-emerald-200/75 hover:text-white',
                    ].join(' ')}
                  >
                    단판 승부
                  </button>
                  <button
                    type="button"
                    onClick={() => setMatchFormat('bo3')}
                    className={[
                      'py-2 px-3 rounded-lg text-xs sm:text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap',
                      matchFormat === 'bo3'
                        ? 'bg-emerald-700 text-white'
                        : 'text-emerald-200/75 hover:text-white',
                    ].join(' ')}
                  >
                    3판 2선승
                  </button>
                </div>
              </div>

              <button
                type="button"
                onClick={startMatch}
                className="w-full py-3.5 px-6 rounded-xl bg-amber-400 hover:bg-amber-300 text-[#1a1304] font-bold text-base shadow-lg transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <Play className="w-5 h-5 fill-current" />
                게임 시작
              </button>
            </div>
          </div>

          {/* Single flat control-hint line */}
          <p className="text-center text-xs text-emerald-200/65 tracking-wide">
            클릭: 말 배치 · Enter: 시작 및 확정 · Space: 암기 완료 · M: 음소거 · Esc: 일시정지
          </p>
        </main>
      )}

      {/* ================= ACTIVE PLAYING VIEW ================= */}
      {(shell === 'PLAYING' || shell === 'PAUSED' || shell === 'GAME_OVER') && (
        <div className="relative z-10 flex-1 flex flex-col max-w-6xl w-full mx-auto px-3 sm:px-6 py-3 sm:py-4 gap-3 sm:gap-4">
          {/* Unobtrusive Top HUD Bar */}
          <header className="flex items-center justify-between gap-3 px-3 sm:px-4 py-2.5 rounded-xl bg-[#071f15]/90 border border-emerald-800/60">
            <div className="flex items-center gap-3 sm:gap-4 min-w-0">
              <span className="font-display font-bold text-base sm:text-lg text-amber-100 whitespace-nowrap">
                기억 포커
              </span>
              <span className="hidden sm:inline text-emerald-600" aria-hidden="true">·</span>
              <span className="hidden sm:inline text-xs sm:text-sm font-medium text-emerald-200/90 whitespace-nowrap">
                {matchFormat === 'single' ? '단판 승부' : `3판 2선승 · 라운드 ${roundNumber}`}
              </span>
              <span className="text-emerald-600" aria-hidden="true">·</span>
              <span className="text-xs sm:text-sm font-semibold text-white truncate">
                {phaseTitle}
              </span>
            </div>

            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              {/* Score tally */}
              <div className="flex items-center gap-2 text-xs sm:text-sm font-mono-tabular px-2.5 py-1 rounded-lg bg-[#04140d] border border-emerald-800/50">
                <span className="text-amber-300 font-bold">P1 {p1Score}</span>
                <span className="text-emerald-500">:</span>
                <span className="text-rose-300 font-bold">{p2Score} {opponentShortLabel}</span>
              </div>

              <button
                type="button"
                onClick={() => setRulesOpen(true)}
                aria-label="게임 규칙 및 족보"
                className="min-w-[38px] min-h-[38px] flex items-center justify-center rounded-lg border border-emerald-700/60 bg-[#082218] text-emerald-100 hover:bg-emerald-800/60 transition-colors cursor-pointer"
              >
                <BookOpen className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={toggleMute}
                aria-label={muted ? '소리 켜기' : '음소거'}
                className="min-w-[38px] min-h-[38px] flex items-center justify-center rounded-lg border border-emerald-700/60 bg-[#082218] text-emerald-100 hover:bg-emerald-800/60 transition-colors cursor-pointer"
              >
                {muted ? <VolumeX className="w-4 h-4 text-rose-300" /> : <Volume2 className="w-4 h-4 text-amber-300" />}
              </button>
              <button
                type="button"
                onClick={() => setShell('PAUSED')}
                aria-label="일시정지"
                className="min-w-[38px] min-h-[38px] flex items-center justify-center rounded-lg border border-emerald-700/60 bg-[#082218] text-emerald-100 hover:bg-emerald-800/60 transition-colors cursor-pointer"
              >
                <Pause className="w-4 h-4" />
              </button>
            </div>
          </header>

          {/* Main Tabletop Workspace */}
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-[minmax(0,440px)_1fr] gap-4 sm:gap-6 items-start">
            {/* LEFT: 4x4 Memory Grid / Personal Game Board */}
            <section className="rounded-2xl bg-[#072116]/85 border border-emerald-700/50 p-3.5 sm:p-4 shadow-xl">
              <div className="flex items-center justify-between mb-3">
                <div className="text-xs sm:text-sm font-semibold text-emerald-100">
                  {phase === 'MEMORIZE'
                    ? '16장 카드 보드 (암기 중)'
                    : phase === 'P1_SELECT'
                      ? '플레이어 1 개인 게임판'
                      : phase === 'P2_SELECT'
                        ? '플레이어 2 개인 게임판'
                        : '16장 카드 보드'}
                </div>
                <span className="font-mono-tabular text-xs text-emerald-300/75">
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
                        p2Label={opponentShortLabel}
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
              <section className="rounded-2xl bg-[#072116]/85 border border-emerald-700/50 p-4 sm:p-5 shadow-xl">
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div>
                    <h2 className="text-sm sm:text-base font-bold text-amber-100">
                      공유 카드 3장
                    </h2>
                    <p className="text-xs text-emerald-200/75 mt-0.5">
                      {phase === 'MEMORIZE'
                        ? '20초 암기가 끝나면 공유 카드 3장이 공개됩니다.'
                        : '선택한 2장의 카드와 이 3장을 합쳐 5장 족보를 만듭니다.'}
                    </p>
                  </div>
                  <span className="font-mono-tabular text-xs text-emerald-300/80 whitespace-nowrap">
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
                <section className="rounded-2xl bg-[#092419]/90 border border-amber-400/35 p-4 sm:p-5 space-y-4">
                  <div className="flex items-end justify-between gap-4">
                    <div>
                      <span className="text-xs font-semibold text-amber-300">
                        암기 제한 시간
                      </span>
                      <div className="font-mono-tabular text-3xl sm:text-4xl font-bold text-white mt-0.5">
                        {timerSecondsDisplay}
                        <span className="text-base font-normal text-emerald-200/80 ml-1">초</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={finishMemorization}
                      className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-[#1a1304] font-bold text-xs sm:text-sm transition-colors cursor-pointer whitespace-nowrap shrink-0"
                    >
                      <SkipForward className="w-4 h-4" />
                      암기 완료 · 바로 시작
                    </button>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full h-2.5 rounded-full bg-[#04140d] overflow-hidden border border-emerald-800/60">
                    <div
                      className={[
                        'h-full transition-[width] duration-75',
                        timeLeftMs <= 5000 ? 'bg-rose-400' : 'bg-amber-400',
                      ].join(' ')}
                      style={{ width: `${timerPercent}%` }}
                    />
                  </div>

                  <p className="text-xs text-emerald-200/80">
                    카드 위치(A1–D4)와 숫자·문양을 함께 외우면 공유 카드 공개 후 빠르게 조합할 수 있습니다.
                  </p>
                </section>
              )}

              {phase === 'COMMUNITY_REVEAL' && (
                <section className="rounded-2xl bg-[#092419]/90 border border-emerald-700/50 p-5 text-sm text-emerald-100">
                  공유 카드 3장을 테이블에 공개하고 있습니다...
                </section>
              )}

              {(phase === 'P1_SELECT' || phase === 'P2_SELECT') && (
                <section className="rounded-2xl bg-[#092419]/90 border border-emerald-700/50 p-4 sm:p-5 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h3 className="text-base font-bold text-white">
                        {activePlayerLabel} · 말 배치 ({activeSelection.length} / 2)
                      </h3>
                      <p className="text-xs text-emerald-200/80 mt-0.5">
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
                            'flex-1 rounded-xl border px-3.5 py-2.5 flex items-center justify-between',
                            hasPick
                              ? 'bg-amber-400/10 border-amber-400/60 text-amber-100'
                              : 'bg-[#051810] border-emerald-800/60 text-emerald-300/60',
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
                      className="px-3.5 py-2.5 rounded-xl border border-emerald-700/60 text-xs sm:text-sm font-medium text-emerald-100 hover:bg-emerald-900/60 disabled:opacity-40 disabled:pointer-events-none transition-colors cursor-pointer"
                    >
                      배치 초기화
                    </button>

                    <button
                      type="button"
                      disabled={activeSelection.length !== 2}
                      onClick={handleConfirmSelection}
                      className="px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 disabled:bg-emerald-900/60 disabled:text-emerald-400/60 text-[#1a1304] font-bold text-sm transition-colors cursor-pointer disabled:cursor-not-allowed whitespace-nowrap"
                    >
                      선택 확정 (Enter)
                    </button>
                  </div>
                </section>
              )}

              {phase === 'PASS_TO_P2' && (
                <section className="rounded-2xl bg-[#092419]/95 border border-amber-400/45 p-5 sm:p-6 space-y-4">
                  <h3 className="font-display text-xl font-bold text-amber-100">
                    플레이어 1 선택 완료
                  </h3>
                  <p className="text-sm text-emerald-100/90 leading-relaxed">
                    플레이어 1의 말 위치는 비공개로 저장되었습니다. 화면을 <strong>플레이어 2</strong>에게 넘긴 뒤 아래 버튼을 눌러 말을 배치하세요.
                  </p>
                  <button
                    type="button"
                    onClick={() => setPhase('P2_SELECT')}
                    className="px-5 py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-[#1a1304] font-bold text-sm transition-colors cursor-pointer"
                  >
                    플레이어 2 말 배치 시작 (Enter)
                  </button>
                </section>
              )}

              {phase === 'AI_THINKING' && (
                <section className="rounded-2xl bg-[#092419]/90 border border-emerald-700/50 p-5 space-y-2">
                  <h3 className="text-base font-bold text-amber-100">
                    {opponentLabel} 선택 중...
                  </h3>
                  <p className="text-xs sm:text-sm text-emerald-200/80">
                    상대가 자신의 게임판 위 2개 위치에 말을 배치하고 있습니다.
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
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/75 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="게임 일시정지"
        >
          <div className="w-full max-w-sm rounded-2xl bg-[#0b261b] border border-emerald-700/60 p-6 shadow-2xl space-y-4">
            <h2 className="font-display text-2xl font-bold text-amber-100">일시정지</h2>
            <p className="text-sm text-emerald-200/80">
              {phase === 'MEMORIZE' ? '암기 타이머가 일시정지되었습니다.' : '게임이 잠시 멈췄습니다.'}
            </p>
            <div className="flex flex-col gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setShell('PLAYING')}
                className="w-full py-2.5 px-4 rounded-xl bg-amber-400 hover:bg-amber-300 text-[#1a1304] font-bold text-sm transition-colors cursor-pointer"
              >
                계속하기 (Esc)
              </button>
              <button
                type="button"
                onClick={() => setRulesOpen(true)}
                className="w-full py-2.5 px-4 rounded-xl border border-emerald-700/60 bg-[#071d14] hover:bg-emerald-900/60 text-emerald-100 font-semibold text-sm transition-colors cursor-pointer"
              >
                규칙 및 족보 보기
              </button>
              <button
                type="button"
                onClick={startMatch}
                className="w-full py-2.5 px-4 rounded-xl border border-emerald-700/60 bg-[#071d14] hover:bg-emerald-900/60 text-emerald-100 font-semibold text-sm transition-colors cursor-pointer"
              >
                새 게임 다시 시작
              </button>
              <button
                type="button"
                onClick={() => setShell('TITLE_MENU')}
                className="w-full py-2.5 px-4 rounded-xl border border-emerald-800/60 text-emerald-300/90 hover:text-white hover:bg-emerald-950/60 font-medium text-sm transition-colors cursor-pointer"
              >
                타이틀 화면으로
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MATCH GAME OVER MODAL ================= */}
      {shell === 'GAME_OVER' && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/80 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="최종 경기 결과"
        >
          <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl bg-[#0b261b] border border-emerald-700/60 p-6 sm:p-7 shadow-2xl space-y-5">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-xl bg-amber-400/15 border border-amber-400/50 text-amber-300 flex items-center justify-center shrink-0">
                <Trophy className="w-6 h-6" />
              </div>
              <div>
                <h2 className="font-display text-2xl font-bold text-white">
                  {p1Score > p2Score
                    ? '플레이어 1 최종 승리'
                    : p2Score > p1Score
                      ? `${opponentLabel} 최종 승리`
                      : '무승부 종료'}
                </h2>
                <p className="text-sm text-emerald-200/85 font-mono-tabular mt-0.5">
                  최종 스코어 · P1 {p1Score} : {p2Score} {opponentShortLabel}
                </p>
              </div>
            </div>

            {/* Score Progression Line Chart */}
            <div className="rounded-xl border border-emerald-800/60 bg-[#061810] p-4 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-xs sm:text-sm font-semibold text-emerald-100">
                  라운드별 점수 추이
                </h3>
                <span className="font-mono-tabular text-xs text-emerald-300/75">
                  총 {history.length}라운드
                </span>
              </div>
              <div className="w-full h-[185px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={scoreProgressionData}
                    margin={{ top: 8, right: 14, left: -12, bottom: 2 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(16, 185, 129, 0.16)" vertical={false} />
                    <XAxis
                      dataKey="round"
                      stroke="#a7f3d0"
                      tick={{ fill: '#a7f3d0', fontSize: 12 }}
                      axisLine={{ stroke: 'rgba(16, 185, 129, 0.28)' }}
                      tickLine={false}
                    />
                    <YAxis
                      allowDecimals={false}
                      domain={[0, Math.max(2, p1Score, p2Score)]}
                      stroke="#a7f3d0"
                      tick={{ fill: '#a7f3d0', fontSize: 12 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      content={({ active, payload, label }) => {
                        if (!active || !payload || payload.length === 0) return null;
                        const point = payload[0].payload as {
                          round: string;
                          p1: number;
                          opponent: number;
                          summary: string;
                        };
                        return (
                          <div className="rounded-lg bg-[#071f15] border border-emerald-700/70 px-3 py-2 shadow-xl text-xs space-y-1">
                            <div className="font-mono-tabular font-bold text-white">{label}</div>
                            <div className="font-mono-tabular text-amber-300">
                              플레이어 1: {point.p1}점
                            </div>
                            <div className="font-mono-tabular text-rose-300">
                              {opponentLabel}: {point.opponent}점
                            </div>
                            <div className="text-emerald-200/80 pt-0.5 border-t border-emerald-800/60">
                              {point.summary}
                            </div>
                          </div>
                        );
                      }}
                    />
                    <Legend
                      wrapperStyle={{ fontSize: '12px', paddingTop: '6px' }}
                    />
                    <Line
                      type="linear"
                      dataKey="p1"
                      name="플레이어 1"
                      stroke="#fbbf24"
                      strokeWidth={2.5}
                      dot={{ r: 4, fill: '#fbbf24', stroke: '#1a1304', strokeWidth: 1.5 }}
                      activeDot={{ r: 6 }}
                      isAnimationActive={false}
                    />
                    <Line
                      type="linear"
                      dataKey="opponent"
                      name={opponentLabel}
                      stroke="#fb7185"
                      strokeWidth={2.5}
                      dot={{ r: 4, fill: '#fb7185', stroke: '#1f0810', strokeWidth: 1.5 }}
                      activeDot={{ r: 6 }}
                      isAnimationActive={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Round breakdown */}
            <div className="divide-y divide-emerald-800/50 rounded-xl border border-emerald-800/60 bg-[#061810]">
              {history.map((item) => (
                <div
                  key={item.roundNumber}
                  className="flex items-center justify-between gap-3 px-4 py-2.5 text-xs sm:text-sm"
                >
                  <span className="font-mono-tabular text-emerald-300 font-semibold shrink-0">
                    R{item.roundNumber}
                  </span>
                  <div className="flex-1 text-emerald-100/90 truncate">
                    <span>P1: {item.p1Eval.descriptionKo}</span>
                    <span className="mx-1.5 text-emerald-600" aria-hidden="true">vs</span>
                    <span>{opponentShortLabel}: {item.p2Eval.descriptionKo}</span>
                  </div>
                  <span
                    className={[
                      'font-bold whitespace-nowrap',
                      item.winner === 'p1'
                        ? 'text-amber-300'
                        : item.winner === 'p2'
                          ? 'text-rose-300'
                          : 'text-emerald-200',
                    ].join(' ')}
                  >
                    {item.winner === 'p1' ? 'P1 승' : item.winner === 'p2' ? `${opponentShortLabel} 승` : '무승부'}
                  </span>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap items-center justify-end gap-3 pt-1">
              <button
                type="button"
                onClick={() => setShell('TITLE_MENU')}
                className="px-4 py-2.5 rounded-xl border border-emerald-700/60 text-sm font-medium text-emerald-100 hover:bg-emerald-900/60 transition-colors cursor-pointer"
              >
                타이틀로
              </button>
              <button
                type="button"
                onClick={startMatch}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-[#1a1304] font-bold text-sm transition-colors cursor-pointer"
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
