import React, { useMemo, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import arenaBackdrop from './assets/images/obsidian_brass_arena_1794918534030.jpg';
import { GAMES_REGISTRY } from './games/registry';
import { loadCareerStats } from './games/memory-poker/engine/stats';

export default function App() {
  const [activeGameId, setActiveGameId] = useState<string | null>(null);
  const [bgFailed, setBgFailed] = useState(false);

  const memoryStats = useMemo(() => {
    const stats = loadCareerStats();
    const totalAi = stats.ai.p1Wins + stats.ai.opponentWins + stats.ai.draws;
    const total2p = stats.local2p.p1Wins + stats.local2p.opponentWins + stats.local2p.draws;
    return {
      totalRounds: totalAi + total2p,
      aiWins: stats.ai.p1Wins,
      aiTotal: totalAi,
    };
  }, [activeGameId]);

  const activeGame = activeGameId
    ? GAMES_REGISTRY.find((game) => game.id === activeGameId) ?? null
    : null;

  if (activeGame) {
    const ActiveComponent = activeGame.component;
    return <ActiveComponent onExitToHub={() => setActiveGameId(null)} />;
  }

  return (
    <div className="relative min-h-screen w-full overflow-x-hidden bg-obsidian-900 text-[#f3f1ec] flex flex-col">
      {/* Architectural Obsidian & Brass Lounge Backdrop */}
      <div className="pointer-events-none fixed inset-0 z-0">
        {!bgFailed && (
          <img
            src={arenaBackdrop}
            alt="옵시디언과 브러시드 골드 전략 게임 테이블 배경"
            referrerPolicy="no-referrer"
            onError={() => setBgFailed(true)}
            className="w-full h-full object-cover opacity-45"
          />
        )}
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(circle at 50% 35%, rgba(22, 25, 34, 0.35) 0%, rgba(9, 10, 15, 0.88) 70%, rgba(7, 8, 12, 0.98) 100%)',
          }}
        />
      </div>

      {/* Main Game Lounge Hub */}
      <main className="relative z-10 flex-1 flex flex-col justify-between max-w-6xl w-full mx-auto px-6 py-8 sm:px-10 sm:py-12">
        {/* Clean Minimal Top Bar */}
        <div className="flex items-center justify-between gap-4 pb-6 border-b border-white/10">
          <span className="font-mono-tabular text-xs font-semibold tracking-[0.22em] text-gold-500">
            THE DEVIL&apos;S PLAN · DEAD AGAIN
          </span>
          <span className="font-mono-tabular text-xs text-lounge-sky-300">
            {memoryStats.totalRounds > 0
              ? `누적 플레이 ${memoryStats.totalRounds}라운드`
              : '아레나 로비'}
          </span>
        </div>

        {/* Central Hero & Game Selector */}
        <div className="my-auto py-8 space-y-10">
          <header className="space-y-4 max-w-3xl">
            <svg
              viewBox="0 0 540 94"
              className="w-full max-w-[520px] h-auto"
              role="img"
              aria-label="데블스 플랜: 데드 어게인"
            >
              {/* Golden Piece Emblem */}
              <g transform="translate(4, 9)">
                <polygon
                  points="36,2 68,20 68,56 36,74 4,56 4,20"
                  fill="var(--color-obsidian-800)"
                  stroke="var(--color-gold-500)"
                  strokeWidth="2"
                />
                <polygon
                  points="36,11 60,25 60,51 36,65 12,51 12,25"
                  fill="none"
                  stroke="var(--color-lounge-sky-400)"
                  strokeOpacity="0.4"
                  strokeWidth="1"
                />
                <polygon points="36,24 48,38 36,52 24,38" fill="var(--color-gold-400)" />
              </g>

              <text
                x="92"
                y="47"
                fill="var(--color-gold-100)"
                fontSize="35"
                fontWeight="700"
                fontFamily="Fraunces, Noto Sans KR, serif"
                letterSpacing="-0.02em"
              >
                데블스 플랜: 데드 어게인
              </text>
              <line
                x1="94"
                y1="60"
                x2="478"
                y2="60"
                stroke="var(--color-gold-500)"
                strokeOpacity="0.45"
                strokeWidth="1"
              />
              <text
                x="94"
                y="80"
                fill="var(--color-lounge-sky-300)"
                fontSize="12"
                fontWeight="600"
                fontFamily="Plus Jakarta Sans, sans-serif"
                letterSpacing="0.24em"
              >
                PSYCHOLOGICAL &amp; MEMORY MATCHES
              </text>
            </svg>

            <p className="text-sm sm:text-base text-lounge-slate-300 leading-relaxed text-pretty">
              기억력과 추리, 수 싸움으로 승부하는 두뇌 게임 아카이브입니다. 입장할 매치를 선택하세요.
            </p>
          </header>

          {/* Game Launcher Cards */}
          <section aria-label="매치 선택" className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {GAMES_REGISTRY.map((game) => {
              const isPlayable = game.status === 'playable';
              return (
                <button
                  key={game.id}
                  type="button"
                  onClick={() => setActiveGameId(game.id)}
                  className={[
                    'group relative text-left rounded-2xl p-6 sm:p-7 transition-all duration-150 flex flex-col justify-between gap-7 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400',
                    isPlayable
                      ? 'obsidian-panel hover:border-gold-400/75 hover:-translate-y-0.5'
                      : 'obsidian-sky-panel hover:border-lounge-sky-400/65 hover:-translate-y-0.5',
                  ].join(' ')}
                >
                  {/* Architectural Corner Brackets */}
                  <span
                    aria-hidden="true"
                    className={[
                      'pointer-events-none absolute top-3 left-3 w-3 h-3 border-t border-l',
                      isPlayable ? 'border-gold-500/70' : 'border-lounge-sky-400/50',
                    ].join(' ')}
                  />
                  <span
                    aria-hidden="true"
                    className={[
                      'pointer-events-none absolute bottom-3 right-3 w-3 h-3 border-b border-r',
                      isPlayable ? 'border-gold-500/70' : 'border-lounge-sky-400/50',
                    ].join(' ')}
                  />

                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-3 text-xs">
                      <span className="font-mono-tabular font-semibold tracking-wider text-gold-400">
                        MATCH {game.indexLabel} · {game.titleEn}
                      </span>
                      <span className={isPlayable ? 'text-lounge-sky-300 font-semibold' : 'text-lounge-slate-400'}>
                        {isPlayable ? '입장 가능' : '개발 준비 중'}
                      </span>
                    </div>

                    <h2 className="font-display text-2xl sm:text-3xl font-bold text-gold-100">
                      {game.titleKo}
                    </h2>

                    <p className="text-sm text-lounge-slate-300 leading-relaxed">
                      {game.description}
                    </p>
                  </div>

                  <div className="pt-4 border-t border-white/10 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-xs text-lounge-slate-400 font-mono-tabular">
                      <span>{game.playersLabel}</span>
                      <span aria-hidden="true">·</span>
                      <span>
                        {game.id === 'memory-poker' && memoryStats.aiTotal > 0
                          ? `AI전 ${memoryStats.aiWins}/${memoryStats.aiTotal}승`
                          : game.durationLabel}
                      </span>
                    </div>

                    <span
                      className={[
                        'inline-flex items-center gap-1.5 text-sm font-bold whitespace-nowrap transition-transform duration-150 group-hover:translate-x-0.5',
                        isPlayable ? 'text-gold-200' : 'text-lounge-sky-300',
                      ].join(' ')}
                    >
                      {isPlayable ? '매치 입장' : '슬롯 확인'}
                      <ArrowRight className="w-4 h-4" />
                    </span>
                  </div>
                </button>
              );
            })}
          </section>
        </div>

        <footer className="pt-6 border-t border-white/10 flex flex-wrap items-center justify-between gap-2 text-xs text-lounge-slate-500">
          <span>매치를 선택하면 전용 아레나로 이동합니다</span>
          <span className="font-mono-tabular">Click to Enter · Esc to Pause</span>
        </footer>
      </main>
    </div>
  );
}
