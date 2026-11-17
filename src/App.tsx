import React, { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import feltTableImage from './assets/images/memory_poker_felt_table_1794895838152.jpg';
import { GAMES_REGISTRY } from './games/registry';

export default function App() {
  const [activeGameId, setActiveGameId] = useState<string | null>(null);
  const [bgFailed, setBgFailed] = useState(false);

  const activeGame = activeGameId
    ? GAMES_REGISTRY.find((game) => game.id === activeGameId) ?? null
    : null;

  if (activeGame) {
    const ActiveComponent = activeGame.component;
    return <ActiveComponent onExitToHub={() => setActiveGameId(null)} />;
  }

  return (
    <div className="relative min-h-screen w-full overflow-x-hidden bg-[#061c13] text-[#f5f3ee] flex flex-col">
      {/* Felt Table Backdrop */}
      <div className="pointer-events-none fixed inset-0 z-0">
        {!bgFailed && (
          <img
            src={feltTableImage}
            alt="에메랄드 펠트 게임 테이블 배경"
            referrerPolicy="no-referrer"
            onError={() => setBgFailed(true)}
            className="w-full h-full object-cover opacity-50"
          />
        )}
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(circle at 50% 35%, rgba(11, 59, 39, 0.42) 0%, rgba(5, 22, 15, 0.9) 72%, rgba(3, 14, 9, 0.98) 100%)',
          }}
        />
      </div>

      {/* Main Game Selection Hub */}
      <main className="relative z-10 flex-1 flex flex-col justify-between max-w-5xl w-full mx-auto px-6 py-10 sm:px-10 sm:py-14">
        <div className="my-auto space-y-10">
          {/* Hub Header */}
          <header className="space-y-4">
            <svg
              viewBox="0 0 420 90"
              className="w-full max-w-[380px] h-auto"
              role="img"
              aria-label="데블스 플랜 게임 아케이드"
            >
              <g transform="translate(4, 8)">
                <polygon
                  points="32,4 58,20 58,52 32,68 6,52 6,20"
                  fill="#0b281c"
                  stroke="#d97706"
                  strokeWidth="2"
                />
                <text
                  x="32"
                  y="44"
                  textAnchor="middle"
                  fill="#fef3c7"
                  fontSize="24"
                  fontWeight="700"
                  fontFamily="Fraunces, serif"
                >
                  ♠
                </text>
              </g>
              <text
                x="82"
                y="45"
                fill="#fef3c7"
                fontSize="36"
                fontWeight="700"
                fontFamily="Fraunces, Noto Sans KR, serif"
                letterSpacing="-0.02em"
              >
                게임 컬렉션
              </text>
              <text
                x="84"
                y="70"
                fill="#a7f3d0"
                fontSize="13"
                fontWeight="600"
                fontFamily="Plus Jakarta Sans, sans-serif"
                letterSpacing="0.2em"
              >
                STRATEGY &amp; MEMORY GAMES
              </text>
            </svg>

            <p className="max-w-xl text-sm sm:text-base text-emerald-100/85 leading-relaxed text-pretty">
              플레이할 게임을 선택하세요. 각 게임은 독립된 모듈로 구성되어 새로운 게임이 계속 추가됩니다.
            </p>
          </header>

          {/* Game Launcher Grid */}
          <section aria-label="게임 목록" className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {GAMES_REGISTRY.map((game) => {
              const isPlayable = game.status === 'playable';
              return (
                <button
                  key={game.id}
                  type="button"
                  onClick={() => setActiveGameId(game.id)}
                  className={[
                    'group text-left rounded-2xl p-6 sm:p-7 border transition-all duration-150 flex flex-col justify-between gap-6 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400',
                    isPlayable
                      ? 'bg-[#082419]/92 border-emerald-600/60 hover:border-amber-400/75 hover:-translate-y-0.5 shadow-xl'
                      : 'bg-[#071c14]/75 border-emerald-800/55 hover:border-emerald-600/70 hover:-translate-y-0.5',
                  ].join(' ')}
                >
                  <div className="space-y-3">
                    {/* Unboxed editorial metadata */}
                    <div className="flex items-center justify-between gap-3 text-xs">
                      <span className="font-mono-tabular font-bold text-amber-300">
                        {game.indexLabel}. {game.titleEn}
                      </span>
                      <span className={isPlayable ? 'text-emerald-300 font-semibold' : 'text-emerald-400/70'}>
                        {isPlayable ? '플레이 가능' : '개발 준비 중'}
                      </span>
                    </div>

                    <h2 className="font-display text-2xl sm:text-3xl font-bold text-white">
                      {game.titleKo}
                    </h2>

                    <p className="text-sm text-emerald-100/80 leading-relaxed">
                      {game.description}
                    </p>
                  </div>

                  <div className="pt-4 border-t border-emerald-800/50 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-xs text-emerald-200/75">
                      <span>{game.playersLabel}</span>
                      <span aria-hidden="true">·</span>
                      <span>{game.durationLabel}</span>
                    </div>

                    <span
                      className={[
                        'inline-flex items-center gap-1.5 text-sm font-bold whitespace-nowrap transition-transform duration-150 group-hover:translate-x-0.5',
                        isPlayable ? 'text-amber-300' : 'text-emerald-200/80',
                      ].join(' ')}
                    >
                      {isPlayable ? '게임 시작' : '슬롯 열기'}
                      <ArrowRight className="w-4 h-4" />
                    </span>
                  </div>
                </button>
              );
            })}
          </section>
        </div>

        <footer className="pt-8 text-xs text-emerald-300/60">
          게임을 선택해 바로 플레이하거나 새 게임 슬롯을 확장할 수 있습니다.
        </footer>
      </main>
    </div>
  );
}
