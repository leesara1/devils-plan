import React, { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, BookOpen, RotateCcw } from 'lucide-react';
import {
  EquationSignalPreviewDiagram,
  GradationPreviewDiagram,
  HitStayPreviewDiagram,
  Heavy13PreviewDiagram,
  MemoryPokerPreviewDiagram,
  RussianRoulettePreviewDiagram,
} from './components/GameBoardIllustrations';
import { ThemeToggleButton } from './components/ThemeToggleButton';
import { GAMES_REGISTRY } from './games/registry';
import { GameEntry } from './games/types';
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
import { HitStayRulesModal } from './games/hit-stay/components/HitStayRulesModal';
import { ThemeProvider } from './theme/ThemeContext';

const PREVIEW_DIAGRAMS: Record<string, React.ComponentType> = {
  'memory-poker': MemoryPokerPreviewDiagram,
  'heavy-13': Heavy13PreviewDiagram,
  'russian-roulette': RussianRoulettePreviewDiagram,
  gradation: GradationPreviewDiagram,
  'equation-signal': EquationSignalPreviewDiagram,
  'hit-stay': HitStayPreviewDiagram,
};

const RULES_MODALS: Record<string, React.ComponentType<{ open: boolean; onClose: () => void }>> = {
  'memory-poker': MemoryPokerRulesModal,
  'heavy-13': Heavy13RulesModal,
  'russian-roulette': RouletteRulesModal,
  gradation: GradationRulesModal,
  'equation-signal': EquationRulesModal,
  'hit-stay': HitStayRulesModal,
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

  const featured = GAMES_REGISTRY[GAMES_REGISTRY.length - 1];
  const others = GAMES_REGISTRY.slice(0, -1);

  const renderCard = (game: GameEntry, variant: 'featured' | 'split' | 'stack') => {
    const Preview = PREVIEW_DIAGRAMS[game.id];
    const split = variant !== 'stack';
    const primary = variant === 'featured';
    return (
      <article
        key={game.id}
        className={[
          'obsidian-panel rounded-2xl overflow-hidden flex transition-colors duration-150 hover:border-slate-400/60 dark:hover:border-white/20',
          split ? 'flex-col md:flex-row md:col-span-2' : 'flex-col',
        ].join(' ')}
      >
        <div className={split ? 'md:w-[55%] shrink-0 md:border-r theme-border' : ''}>
          {Preview ? <Preview /> : null}
        </div>

        <div className={['flex flex-col justify-between gap-6 p-6', split ? 'md:justify-center md:p-8' : ''].join(' ')}>
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs theme-text-muted">
              <span className="font-mono-tabular theme-text-gold">{game.indexLabel}</span>
              <span>{game.seasonLabel.replace(/^시즌 \d+ · /, '')}</span>
              {primary && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>최근 추가</span>
                </>
              )}
            </div>

            <div className="flex items-baseline justify-between gap-3">
              <h2
                className={[
                  'font-display font-medium theme-text-primary',
                  primary ? 'display-tight text-2xl sm:text-3xl' : 'text-xl sm:text-2xl',
                ].join(' ')}
              >
                {game.titleKo}
              </h2>
              <span className="font-mono-tabular text-xs theme-text-faint whitespace-nowrap">{game.titleEn}</span>
            </div>

            <p className="text-sm theme-text-secondary leading-relaxed [text-wrap:pretty]">{game.description}</p>

            <div className="text-xs theme-text-muted">
              {game.playersLabel}
              <span className="mx-1.5" aria-hidden="true">·</span>
              {game.durationLabel}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPreviewRulesGameId(game.id)}
              className="inline-flex items-center gap-2 h-10 px-4 rounded-lg border theme-border theme-text-secondary text-sm hover:border-slate-400/70 hover:text-slate-900 dark:hover:border-white/25 dark:hover:text-white transition-colors whitespace-nowrap cursor-pointer"
            >
              <BookOpen className="w-4 h-4 theme-text-muted" strokeWidth={1.5} />
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
              className={[
                'ml-auto inline-flex items-center justify-center gap-2 h-10 px-5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap cursor-pointer',
                primary
                  ? 'bg-gold-400 hover:bg-gold-300 text-gold-950'
                  : 'theme-control theme-text-primary hover:border-slate-400/70 dark:hover:border-white/25',
              ].join(' ')}
            >
              플레이
              <ArrowRight className="w-4 h-4" strokeWidth={1.5} />
            </a>
          </div>
        </div>
      </article>
    );
  };

  return (
    <div className="min-h-screen w-full overflow-x-hidden theme-canvas flex flex-col transition-colors duration-150">
      <header className="sticky top-0 z-30 border-b theme-border bg-[#f4f5f8]/95 dark:bg-obsidian-900/95 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto px-5 sm:px-8 h-14 flex items-center justify-between gap-6">
          <a href="#top" className="font-display text-base font-semibold theme-text-primary whitespace-nowrap shrink-0">
            데블스 플랜
          </a>

          <div className="flex items-center gap-5 sm:gap-6 shrink-0">
            <nav aria-label="페이지 내비게이션" className="flex items-center gap-5 text-sm theme-text-muted">
              <a href="#matches" className="hover:text-slate-900 dark:hover:text-white transition-colors whitespace-nowrap">
                게임 목록
              </a>
              <a href="#records" className="hover:text-slate-900 dark:hover:text-white transition-colors whitespace-nowrap">
                플레이 기록
              </a>
            </nav>

            <ThemeToggleButton />
          </div>
        </div>
      </header>

      <main id="top" className="flex-1">
        <section className="max-w-5xl mx-auto px-5 sm:px-8 pt-12 pb-10 sm:pt-16 sm:pb-12">
          <div className="space-y-3 max-w-2xl">
            <div className="text-sm theme-text-muted">
              시즌 3<span className="mx-1.5" aria-hidden="true">·</span>게임 {GAMES_REGISTRY.length}개
            </div>
            <h1 className="font-display display-tight text-3xl sm:text-4xl font-medium theme-text-primary leading-tight [text-wrap:balance]">
              데블스 플랜: 데드 어게인
            </h1>
            <p className="text-base theme-text-secondary leading-relaxed [text-wrap:pretty]">
              시즌 3에 나온 두뇌 게임을 AI 상대로 바로 해볼 수 있게 옮겼습니다.
            </p>
          </div>
        </section>

        <section id="matches" aria-label="플레이 가능한 게임" className="max-w-5xl mx-auto px-5 sm:px-8 pb-16">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {renderCard(featured, 'featured')}
            {others.map((game, i) =>
              renderCard(game, others.length % 2 === 1 && i === others.length - 1 ? 'split' : 'stack'),
            )}
          </div>
        </section>

        <section
          id="records"
          aria-label="플레이 기록과 안내"
          className="border-t theme-border bg-slate-200/45 dark:bg-obsidian-950/60"
        >
          <div className="max-w-5xl mx-auto px-5 sm:px-8 py-10 grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-12">
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-display text-base font-medium theme-text-primary">기억 포커 누적 기록</h2>
                {memoryStats.totalRounds > 0 && (
                  <button
                    type="button"
                    onClick={handleClearMemoryStats}
                    className="inline-flex items-center gap-1.5 text-xs theme-text-muted hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" strokeWidth={1.5} />
                    초기화
                  </button>
                )}
              </div>

              <div className="grid grid-cols-3 border-y theme-border divide-x divide-slate-300/70 dark:divide-white/[0.08] text-xs">
                <div className="py-3 pr-3">
                  <div className="theme-text-muted">총 라운드</div>
                  <div className="mt-1 font-mono-tabular text-base font-medium theme-text-primary">
                    {memoryStats.totalRounds}R
                  </div>
                </div>
                <div className="py-3 px-3">
                  <div className="theme-text-muted">AI전 성적</div>
                  <div className="mt-1 font-mono-tabular text-base font-medium theme-text-primary">
                    {memoryStats.aiTotal > 0 ? `${memoryStats.aiWins}승 ${memoryStats.aiLosses}패` : '0전'}
                  </div>
                </div>
                <div className="py-3 pl-3">
                  <div className="theme-text-muted">로컬 대전</div>
                  <div className="mt-1 font-mono-tabular text-base font-medium theme-text-primary">
                    {memoryStats.localTotal}R
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h2 className="font-display text-base font-medium theme-text-primary">알아두기</h2>
              <div className="divide-y divide-slate-300/70 dark:divide-white/[0.08] border-y theme-border text-sm">
                <div className="py-3 flex items-center justify-between gap-4">
                  <span className="theme-text-secondary">대전 방식</span>
                  <span className="theme-text-muted text-right">1P vs AI · 기억 포커와 무거운 13은 로컬 대전도</span>
                </div>
                <div className="py-3 flex items-center justify-between gap-4">
                  <span className="theme-text-secondary">저장</span>
                  <span className="theme-text-muted text-right">기록과 테마는 이 브라우저에만 저장</span>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t theme-border bg-slate-200/70 dark:bg-obsidian-950">
        <div className="max-w-5xl mx-auto px-5 sm:px-8 py-4 flex flex-wrap items-center justify-between gap-2 text-xs theme-text-muted">
          <span>데블스 플랜 시즌 3 · 비공식 팬 제작</span>
          <span>규칙 출처 나무위키</span>
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
