import React, { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, BookOpen, RotateCcw } from 'lucide-react';
import {
  EquationSignalPreviewDiagram,
  GradationPreviewDiagram,
  Heavy13PreviewDiagram,
  MemoryPokerPreviewDiagram,
  RussianRoulettePreviewDiagram,
} from './components/GameBoardIllustrations';
import { ThemeToggleButton } from './components/ThemeToggleButton';
import { GAMES_REGISTRY } from './games/registry';
import {
  buildGameUrl,
  getDocumentTitleForGame,
  parseGameRoute,
} from './games/routing';
import {
  CareerStats,
  clearModeStats,
  loadCareerStats,
} from './games/memory-poker/engine/stats';
import { RulesModal as MemoryPokerRulesModal } from './games/memory-poker/components/RulesModal';
import { Heavy13RulesModal } from './games/heavy-13/components/Heavy13RulesModal';
import { RouletteRulesModal } from './games/russian-roulette/components/RouletteRulesModal';
import { GradationRulesModal } from './games/gradation/components/GradationRulesModal';
import { EquationRulesModal } from './games/equation-signal/components/EquationRulesModal';
import { ThemeProvider } from './theme/ThemeContext';

const PREVIEW_DIAGRAMS: Record<string, React.ComponentType> = {
  'memory-poker': MemoryPokerPreviewDiagram,
  'heavy-13': Heavy13PreviewDiagram,
  'russian-roulette': RussianRoulettePreviewDiagram,
  gradation: GradationPreviewDiagram,
  'equation-signal': EquationSignalPreviewDiagram,
};

const RULES_MODALS: Record<string, React.ComponentType<{ open: boolean; onClose: () => void }>> = {
  'memory-poker': MemoryPokerRulesModal,
  'heavy-13': Heavy13RulesModal,
  'russian-roulette': RouletteRulesModal,
  gradation: GradationRulesModal,
  'equation-signal': EquationRulesModal,
};

const GameLoadingScreen: React.FC<{ title: string }> = ({ title }) => (
  <div className="min-h-screen w-full theme-canvas flex items-center justify-center" role="status">
    <div className="flex flex-col items-center gap-3">
      <div className="w-8 h-8 rounded-full border-2 border-gold-400 border-t-transparent animate-spin motion-reduce:animate-none" />
      <span className="text-sm theme-text-muted">{title} 불러오는 중…</span>
    </div>
  </div>
);

/**
 * Catches a failed game-chunk download — typically a tab opened before a new
 * deploy asking for a chunk filename that no longer exists — and offers a reload.
 */
class GameLoadBoundary extends React.Component<
  { children: React.ReactNode; onExitToHub: () => void },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="min-h-screen w-full theme-canvas flex items-center justify-center p-6">
        <div className="obsidian-panel rounded-2xl p-6 max-w-sm w-full text-center space-y-4">
          <h1 className="font-display text-lg font-bold theme-text-primary">게임을 불러오지 못했습니다</h1>
          <p className="text-sm theme-text-muted">
            네트워크가 끊겼거나 사이트가 새로 배포되었을 수 있습니다. 새로고침하면 대부분 해결됩니다.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={this.props.onExitToHub}
              className="flex-1 px-4 py-2.5 rounded-xl border border-slate-300/80 dark:border-white/10 theme-control text-sm font-medium theme-text-secondary cursor-pointer"
            >
              매치 목록
            </button>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="flex-1 px-4 py-2.5 rounded-xl bg-gold-400 hover:bg-gold-300 text-gold-950 font-bold text-sm cursor-pointer"
            >
              새로고침
            </button>
          </div>
        </div>
      </div>
    );
  }
}

function DevilsPlanHub() {
  const initialRoute = useMemo(
    () => parseGameRoute(window.location.pathname, window.location.hash),
    [],
  );
  const hubBasePathRef = useRef<string>(initialRoute.hubBasePath);

  const [activeGameId, setActiveGameId] = useState<string | null>(initialRoute.gameId);
  const [previewRulesGameId, setPreviewRulesGameId] = useState<string | null>(null);
  const [statsVersion, setStatsVersion] = useState(0);

  const navigateToGame = useCallback((gameId: string | null) => {
    const targetUrl = buildGameUrl(hubBasePathRef.current, gameId);
    if (window.location.pathname !== targetUrl || window.location.hash) {
      window.history.pushState({ gameId }, '', targetUrl);
    }
    setActiveGameId(gameId);
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, []);

  useEffect(() => {
    const onPopState = () => {
      const parsed = parseGameRoute(window.location.pathname, window.location.hash);
      setActiveGameId(parsed.gameId);
      setPreviewRulesGameId(null);
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  useEffect(() => {
    document.title = getDocumentTitleForGame(activeGameId);
  }, [activeGameId]);

  const careerStats: CareerStats = useMemo(() => {
    return loadCareerStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeGameId, statsVersion]);

  const memoryStats = useMemo(() => {
    const aiTotal =
      careerStats.ai.p1Wins + careerStats.ai.opponentWins + careerStats.ai.draws;
    const localTotal =
      careerStats.local2p.p1Wins +
      careerStats.local2p.opponentWins +
      careerStats.local2p.draws;
    const totalRounds = aiTotal + localTotal;

    return {
      totalRounds,
      aiWins: careerStats.ai.p1Wins,
      aiLosses: careerStats.ai.opponentWins,
      aiTotal,
      localTotal,
    };
  }, [careerStats]);

  const activeGame = activeGameId
    ? GAMES_REGISTRY.find((game) => game.id === activeGameId) ?? null
    : null;

  if (activeGame) {
    const ActiveComponent = activeGame.component;
    return (
      <GameLoadBoundary key={activeGame.id} onExitToHub={() => navigateToGame(null)}>
        <Suspense fallback={<GameLoadingScreen title={activeGame.titleKo} />}>
          <ActiveComponent onExitToHub={() => navigateToGame(null)} />
        </Suspense>
      </GameLoadBoundary>
    );
  }

  const handleClearMemoryStats = () => {
    const next = clearModeStats(careerStats, 'ai');
    clearModeStats(next, 'local2p');
    setStatsVersion((v) => v + 1);
  };

  return (
    <div className="min-h-screen w-full overflow-x-hidden theme-canvas flex flex-col transition-colors duration-150">
      {/* Minimal Single-Row Header with Right Theme Toggle */}
      <header className="sticky top-0 z-30 border-b theme-border bg-[#f4f5f8]/95 dark:bg-obsidian-900/95 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto px-5 sm:px-8 h-14 flex items-center justify-between gap-6">
          <a
            href="#top"
            className="font-display text-base font-bold tracking-tight theme-text-primary whitespace-nowrap shrink-0"
          >
            데블스 플랜
          </a>

          <div className="flex items-center gap-5 sm:gap-6 shrink-0">
            <nav
              aria-label="페이지 내비게이션"
              className="flex items-center gap-5 text-xs sm:text-sm font-medium theme-text-muted"
            >
              <a
                href="#matches"
                className="hover:text-slate-900 dark:hover:text-white transition-colors whitespace-nowrap shrink-0"
              >
                게임 목록
              </a>
              <a
                href="#records"
                className="hover:text-slate-900 dark:hover:text-white transition-colors whitespace-nowrap shrink-0"
              >
                플레이 기록
              </a>
            </nav>

            <ThemeToggleButton />
          </div>
        </div>
      </header>

      <main id="top" className="flex-1">
        {/* Clean Page Header */}
        <section className="max-w-5xl mx-auto px-5 sm:px-8 pt-10 pb-8 sm:pt-14 sm:pb-10">
          <div className="pb-8 border-b theme-border">
            <div className="space-y-2.5 max-w-2xl">
              <div className="flex flex-wrap items-center gap-2 text-xs font-mono-tabular theme-text-muted">
                <span className="theme-text-gold font-semibold">시즌 3</span>
                <span aria-hidden="true">·</span>
                <span>1P vs AI · 로컬 대전</span>
              </div>

              <h1 className="font-display text-2xl sm:text-4xl font-bold theme-text-primary leading-tight [text-wrap:balance]">
                데블스 플랜: 데드 어게인
              </h1>

              <p className="text-sm sm:text-base theme-text-muted leading-relaxed text-pretty">
                원작의 핵심 규칙을 그대로 구현한 웹 보드게임입니다. 원하는 게임을 선택해 바로 플레이하세요.
              </p>
            </div>
          </div>
        </section>

        {/* Clean 2-Column Game Cards */}
        <section
          id="matches"
          aria-label="플레이 가능한 게임"
          className="max-w-5xl mx-auto px-5 sm:px-8 pb-14"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {GAMES_REGISTRY.map((game) => (
              <article
                key={game.id}
                className="obsidian-panel rounded-xl overflow-hidden flex flex-col justify-between transition-transform duration-150 hover:-translate-y-0.5"
              >
                <div>
                  {(() => {
                    const Preview = PREVIEW_DIAGRAMS[game.id];
                    return Preview ? <Preview /> : null;
                  })()}

                  <div className="p-5 sm:p-6 space-y-3">
                    <div className="flex flex-wrap items-center gap-2 text-xs font-mono-tabular theme-text-muted">
                      <span className="theme-text-gold font-semibold">{game.seasonLabel}</span>
                      <span aria-hidden="true">·</span>
                      <span>{game.playersLabel}</span>
                      <span aria-hidden="true">·</span>
                      <span>{game.durationLabel}</span>
                    </div>

                    <div className="flex items-baseline justify-between gap-2">
                      <h2 className="font-display text-xl sm:text-2xl font-bold theme-text-primary">
                        {game.titleKo}
                      </h2>
                      <span className="font-mono-tabular text-xs theme-text-faint">
                        {game.titleEn}
                      </span>
                    </div>

                    <p className="text-sm theme-text-secondary leading-relaxed">
                      {game.description}
                    </p>
                  </div>
                </div>

                {/* Single Clear Action Row per Game */}
                <div className="px-5 pb-5 sm:px-6 sm:pb-6 pt-2 flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => setPreviewRulesGameId(game.id)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-lg border border-slate-300/90 bg-slate-50 hover:border-slate-400 hover:text-slate-900 dark:border-white/10 dark:bg-obsidian-900 dark:hover:border-white/25 dark:hover:text-white text-xs sm:text-sm font-medium theme-text-secondary transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <BookOpen className="w-4 h-4 theme-text-muted" />
                    규칙 보기
                  </button>

                  <a
                    href={buildGameUrl(hubBasePathRef.current, game.id)}
                    onMouseEnter={() => void game.preload()}
                    onFocus={() => void game.preload()}
                    onTouchStart={() => void game.preload()}
                    onClick={(e) => {
                      if (!e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey && e.button === 0) {
                        e.preventDefault();
                        navigateToGame(game.id);
                      }
                    }}
                    className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-lg bg-gold-400 hover:bg-gold-300 text-gold-950 font-bold text-sm transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    플레이
                    <ArrowRight className="w-4 h-4" />
                  </a>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* Quiet Records & Controls Footer Section */}
        <section
          id="records"
          aria-label="플레이 기록 및 단축키 안내"
          className="border-t theme-border bg-slate-200/45 dark:bg-obsidian-950/60"
        >
          <div className="max-w-5xl mx-auto px-5 sm:px-8 py-9 grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-display text-base font-bold theme-text-primary">
                  기억 포커 누적 기록
                </h2>
                {memoryStats.totalRounds > 0 && (
                  <button
                    type="button"
                    onClick={handleClearMemoryStats}
                    className="inline-flex items-center gap-1 text-xs theme-text-muted hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    초기화
                  </button>
                )}
              </div>

              <div className="grid grid-cols-3 border-y theme-border divide-x divide-slate-300/70 dark:divide-white/[0.08] text-xs">
                <div className="py-3 pr-3">
                  <div className="theme-text-faint">총 라운드</div>
                  <div className="mt-1 font-mono-tabular text-base font-bold theme-text-primary">
                    {memoryStats.totalRounds}R
                  </div>
                </div>
                <div className="py-3 px-3">
                  <div className="theme-text-faint">AI전 성적</div>
                  <div className="mt-1 font-mono-tabular text-base font-bold theme-text-primary">
                    {memoryStats.aiTotal > 0
                      ? `${memoryStats.aiWins}승 ${memoryStats.aiLosses}패`
                      : '0전'}
                  </div>
                </div>
                <div className="py-3 pl-3">
                  <div className="theme-text-faint">로컬 대전</div>
                  <div className="mt-1 font-mono-tabular text-base font-bold theme-text-primary">
                    {memoryStats.localTotal}R
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h2 className="font-display text-base font-bold theme-text-primary">
                단축키 안내
              </h2>
              <div className="divide-y divide-slate-300/70 dark:divide-white/[0.08] border-y theme-border text-xs sm:text-sm">
                <div className="py-2.5 flex items-center justify-between gap-3">
                  <span className="theme-text-secondary">대전 방식</span>
                  <span className="theme-text-muted">1P vs AI · 로컬 대전</span>
                </div>
                <div className="py-2.5 flex items-center justify-between gap-3">
                  <span className="theme-text-secondary">키보드 조작</span>
                  <span className="font-mono-tabular text-xs theme-text-muted">
                    Enter 확정 · Esc 일시정지 · M 음소거
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t theme-border bg-slate-200/70 dark:bg-obsidian-950">
        <div className="max-w-5xl mx-auto px-5 sm:px-8 py-4 flex flex-wrap items-center justify-between gap-2 text-xs theme-text-faint">
          <span>데블스 플랜 · 시즌 3</span>
          <span>{GAMES_REGISTRY.map((g) => g.titleKo).join(' · ')}</span>
        </div>
      </footer>

      {Object.entries(RULES_MODALS).map(([gameId, Modal]) => (
        <Modal
          key={gameId}
          open={previewRulesGameId === gameId}
          onClose={() => setPreviewRulesGameId(null)}
        />
      ))}
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <DevilsPlanHub />
    </ThemeProvider>
  );
}
