import React, { useMemo, useState } from 'react';
import { ArrowRight, BookOpen, RotateCcw } from 'lucide-react';
import {
  Heavy13PreviewDiagram,
  MemoryPokerPreviewDiagram,
} from './components/GameBoardIllustrations';
import { ThemeToggleButton } from './components/ThemeToggleButton';
import { GAMES_REGISTRY } from './games/registry';
import {
  CareerStats,
  clearModeStats,
  loadCareerStats,
} from './games/memory-poker/engine/stats';
import { RulesModal as MemoryPokerRulesModal } from './games/memory-poker/components/RulesModal';
import { Heavy13RulesModal } from './games/heavy-13/components/Heavy13RulesModal';
import { ThemeProvider } from './theme/ThemeContext';

function DevilsPlanHub() {
  const [activeGameId, setActiveGameId] = useState<string | null>(null);
  const [previewRulesGameId, setPreviewRulesGameId] = useState<string | null>(null);
  const [statsVersion, setStatsVersion] = useState(0);

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
    return <ActiveComponent onExitToHub={() => setActiveGameId(null)} />;
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
                  {game.id === 'memory-poker' ? (
                    <MemoryPokerPreviewDiagram />
                  ) : (
                    <Heavy13PreviewDiagram />
                  )}

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

                  <button
                    type="button"
                    onClick={() => setActiveGameId(game.id)}
                    className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-lg bg-gold-400 hover:bg-gold-300 text-gold-950 font-bold text-sm transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    플레이
                    <ArrowRight className="w-4 h-4" />
                  </button>
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
                  <div className="theme-text-faint">2P 로컬</div>
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
          <span>기억 포커 · 무거운 13</span>
        </div>
      </footer>

      <MemoryPokerRulesModal
        open={previewRulesGameId === 'memory-poker'}
        onClose={() => setPreviewRulesGameId(null)}
      />
      <Heavy13RulesModal
        open={previewRulesGameId === 'heavy-13'}
        onClose={() => setPreviewRulesGameId(null)}
      />
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
