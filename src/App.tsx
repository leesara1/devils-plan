import React, { useMemo, useState } from 'react';
import { ArrowRight, BookOpen, RotateCcw } from 'lucide-react';
import {
  Heavy13PreviewDiagram,
  MemoryPokerPreviewDiagram,
} from './components/GameBoardIllustrations';
import { GAMES_REGISTRY } from './games/registry';
import { MatchFilterCategory } from './games/types';
import {
  CareerStats,
  clearModeStats,
  loadCareerStats,
} from './games/memory-poker/engine/stats';
import { RulesModal as MemoryPokerRulesModal } from './games/memory-poker/components/RulesModal';
import { Heavy13RulesModal } from './games/heavy-13/components/Heavy13RulesModal';

export default function App() {
  const [activeGameId, setActiveGameId] = useState<string | null>(null);
  const [filter, setFilter] = useState<MatchFilterCategory>('all');
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
    const aiWinRate =
      aiTotal > 0 ? Math.round((careerStats.ai.p1Wins / aiTotal) * 100) : 0;

    return {
      totalRounds,
      aiWins: careerStats.ai.p1Wins,
      aiLosses: careerStats.ai.opponentWins,
      aiTotal,
      aiWinRate,
      localTotal,
    };
  }, [careerStats]);

  const filteredGames = useMemo(() => {
    if (filter === 'all') return GAMES_REGISTRY;
    return GAMES_REGISTRY.filter((game) => game.category === filter);
  }, [filter]);

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
    <div className="min-h-screen w-full overflow-x-hidden bg-obsidian-900 text-[#f3f4f6] flex flex-col">
      {/* Top Bar Contract: [Brand] — [4 nav links] — [1 primary action] */}
      <header className="sticky top-0 z-30 border-b border-white/[0.08] bg-obsidian-900/95 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 h-14 sm:h-16 flex items-center justify-between gap-8">
          <a
            href="#top"
            className="font-display text-base sm:text-lg font-bold tracking-tight text-white whitespace-nowrap shrink-0"
          >
            데블스 플랜 아카이브
          </a>

          <nav
            aria-label="주요 메뉴"
            className="hidden md:flex items-center gap-7 text-sm font-medium text-lounge-slate-400"
          >
            <a
              href="#matches"
              className="hover:text-white transition-colors whitespace-nowrap shrink-0"
            >
              매치 목록
            </a>
            <button
              type="button"
              onClick={() => setActiveGameId('memory-poker')}
              className="hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              기억 포커
            </button>
            <button
              type="button"
              onClick={() => setActiveGameId('heavy-13')}
              className="hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              무거운 13
            </button>
            <a
              href="#records"
              className="hover:text-white transition-colors whitespace-nowrap shrink-0"
            >
              플레이 기록
            </a>
          </nav>

          <div className="shrink-0">
            <button
              type="button"
              onClick={() => setActiveGameId('heavy-13')}
              className="px-4 py-2 rounded-lg bg-gold-400 hover:bg-gold-300 text-gold-950 text-xs sm:text-sm font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              바로 시작
            </button>
          </div>
        </div>
      </header>

      <main id="top" className="flex-1">
        {/* Compact Clean Intro & Filter Bar */}
        <section className="max-w-6xl mx-auto px-5 sm:px-8 pt-10 pb-8 sm:pt-12 sm:pb-10">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pb-8 border-b border-white/[0.08]">
            <div className="space-y-3 max-w-2xl">
              <div className="flex flex-wrap items-center gap-2 text-xs font-mono-tabular text-lounge-slate-400">
                <span className="text-gold-400 font-semibold">시즌 2 &amp; 3</span>
                <span aria-hidden="true">·</span>
                <span>웹 보드게임 아카이브</span>
                <span aria-hidden="true">·</span>
                <span>1P vs AI · 로컬 대전</span>
              </div>

              <h1 className="font-display text-2xl sm:text-4xl font-bold text-white leading-tight [text-wrap:balance]">
                데블스 플랜 두뇌 매치 셀렉션
              </h1>

              <p className="text-sm sm:text-base text-lounge-slate-400 leading-relaxed text-pretty">
                원작의 핵심 규칙을 그대로 옮긴 브라우저 게임 컬렉션입니다. 별도 설치 없이 AI 또는 로컬 대전으로 바로 플레이하세요.
              </p>
            </div>

            {/* Interactive Category Filter */}
            <div
              role="group"
              aria-label="매치 유형 필터"
              className="inline-flex items-center gap-1 p-1 rounded-lg bg-obsidian-850 border border-white/[0.08] self-start lg:self-auto"
            >
              {(
                [
                  { id: 'all', label: '전체' },
                  { id: 'memory', label: '기억 · 포커' },
                  { id: 'strategy', label: '수 싸움 · 심리' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setFilter(tab.id)}
                  className={[
                    'px-3.5 py-1.5 rounded-md text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer',
                    filter === tab.id
                      ? 'bg-obsidian-800 text-white'
                      : 'text-lounge-slate-400 hover:text-white',
                  ].join(' ')}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Minimal 4-Metric Inline Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-5 border-b border-white/[0.08] text-xs">
            <div>
              <span className="text-lounge-slate-500">구현 매치</span>
              <div className="mt-1 font-mono-tabular text-base font-bold text-white">
                {GAMES_REGISTRY.length}종
              </div>
            </div>
            <div>
              <span className="text-lounge-slate-500">지원 인원</span>
              <div className="mt-1 font-mono-tabular text-base font-bold text-white">
                1–7인
              </div>
            </div>
            <div>
              <span className="text-lounge-slate-500">기억 포커 전적</span>
              <div className="mt-1 font-mono-tabular text-base font-bold text-white">
                {memoryStats.totalRounds}R{' '}
                {memoryStats.aiTotal > 0 && (
                  <span className="text-xs font-normal text-lounge-slate-400">
                    (승률 {memoryStats.aiWinRate}%)
                  </span>
                )}
              </div>
            </div>
            <div>
              <span className="text-lounge-slate-500">무거운 13 구성</span>
              <div className="mt-1 font-mono-tabular text-base font-bold text-white">
                14라운드 · 2세트
              </div>
            </div>
          </div>
        </section>

        {/* Clean 2-Column Game Catalog Grid */}
        <section
          id="matches"
          aria-label="플레이 가능한 게임"
          className="max-w-6xl mx-auto px-5 sm:px-8 pb-14"
        >
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredGames.map((game) => (
              <article
                key={game.id}
                className="obsidian-panel rounded-xl overflow-hidden flex flex-col justify-between transition-transform duration-150 hover:-translate-y-0.5"
              >
                <div>
                  {/* Clean Flat 2D Vector Board Preview */}
                  {game.id === 'memory-poker' ? (
                    <MemoryPokerPreviewDiagram />
                  ) : (
                    <Heavy13PreviewDiagram />
                  )}

                  {/* Card Body */}
                  <div className="p-5 sm:p-6 space-y-4">
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2 text-xs font-mono-tabular text-lounge-slate-400">
                        <span className="text-gold-400 font-semibold">{game.seasonLabel}</span>
                        <span aria-hidden="true">·</span>
                        <span>{game.playersLabel}</span>
                        <span aria-hidden="true">·</span>
                        <span>{game.durationLabel}</span>
                      </div>

                      <div className="flex items-baseline justify-between gap-2">
                        <h2 className="font-display text-xl sm:text-2xl font-bold text-white">
                          {game.titleKo}
                        </h2>
                        <span className="font-mono-tabular text-xs text-lounge-slate-500">
                          {game.titleEn}
                        </span>
                      </div>

                      <p className="text-sm text-lounge-slate-300 leading-relaxed pt-1">
                        {game.description}
                      </p>
                    </div>

                    <ul className="divide-y divide-white/[0.06] border-t border-white/[0.06] text-xs text-lounge-slate-400">
                      {game.highlights.map((item, idx) => (
                        <li key={item} className="py-2 flex items-baseline gap-2.5">
                          <span className="font-mono-tabular text-[11px] text-lounge-slate-500 shrink-0">
                            0{idx + 1}
                          </span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Action Row */}
                <div className="px-5 pb-5 sm:px-6 sm:pb-6 pt-1 flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => setPreviewRulesGameId(game.id)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-lg border border-white/10 bg-obsidian-900 hover:border-white/25 hover:text-white text-xs sm:text-sm font-medium text-lounge-slate-300 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <BookOpen className="w-4 h-4 text-lounge-slate-400" />
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

        {/* Quiet Records & Controls Section */}
        <section
          id="records"
          aria-label="플레이 기록 및 단축키 안내"
          className="border-t border-white/[0.08] bg-obsidian-950/60"
        >
          <div className="max-w-6xl mx-auto px-5 sm:px-8 py-10 grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-display text-base sm:text-lg font-bold text-white">
                  기억 포커 누적 기록
                </h2>
                {memoryStats.totalRounds > 0 && (
                  <button
                    type="button"
                    onClick={handleClearMemoryStats}
                    className="inline-flex items-center gap-1 text-xs text-lounge-slate-400 hover:text-white transition-colors cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    초기화
                  </button>
                )}
              </div>

              <div className="grid grid-cols-3 border-y border-white/[0.08] divide-x divide-white/[0.08] text-xs">
                <div className="py-3 pr-3">
                  <div className="text-lounge-slate-500">총 라운드</div>
                  <div className="mt-1 font-mono-tabular text-base font-bold text-white">
                    {memoryStats.totalRounds}R
                  </div>
                </div>
                <div className="py-3 px-3">
                  <div className="text-lounge-slate-500">AI전 성적</div>
                  <div className="mt-1 font-mono-tabular text-base font-bold text-white">
                    {memoryStats.aiTotal > 0
                      ? `${memoryStats.aiWins}승 ${memoryStats.aiLosses}패`
                      : '0전'}
                  </div>
                </div>
                <div className="py-3 pl-3">
                  <div className="text-lounge-slate-500">2P 로컬</div>
                  <div className="mt-1 font-mono-tabular text-base font-bold text-white">
                    {memoryStats.localTotal}R
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h2 className="font-display text-base sm:text-lg font-bold text-white">
                조작 및 대전 안내
              </h2>
              <div className="divide-y divide-white/[0.08] border-y border-white/[0.08] text-xs sm:text-sm">
                <div className="py-2.5 flex items-center justify-between gap-3">
                  <span className="text-lounge-slate-300">대전 방식</span>
                  <span className="text-lounge-slate-400">1P vs AI (3단계) · 로컬 대전</span>
                </div>
                <div className="py-2.5 flex items-center justify-between gap-3">
                  <span className="text-lounge-slate-300">키보드 단축키</span>
                  <span className="font-mono-tabular text-xs text-lounge-slate-400">
                    Enter 확정 · Esc 일시정지 · M 음소거
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/[0.08] bg-obsidian-950">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 py-5 flex flex-wrap items-center justify-between gap-2 text-xs text-lounge-slate-500">
          <span>데블스 플랜 아카이브</span>
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
