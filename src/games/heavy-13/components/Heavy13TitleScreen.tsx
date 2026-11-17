import React from 'react';
import {
  ArrowLeft,
  BookOpen,
  GraduationCap,
  Play,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { AIDifficulty, PlayerCount } from '../engine/heavy13';
import { GameMode } from '../engine/heavy13Reducer';

const AI_DIFFICULTY_LABEL: Record<AIDifficulty, string> = {
  normal: '보통',
  hard: '어려움',
  master: '마스터',
};

interface Heavy13TitleScreenProps {
  mode: GameMode;
  playerCount: PlayerCount;
  startingSeatChoice: number;
  aiDifficulty: AIDifficulty;
  memoryMode: boolean;
  muted: boolean;
  onChangeMode: (mode: GameMode) => void;
  onChangePlayerCount: (count: PlayerCount) => void;
  onChangeStartingSeatChoice: (seat: number) => void;
  onChangeAiDifficulty: (diff: AIDifficulty) => void;
  onChangeMemoryMode: (memoryMode: boolean) => void;
  onToggleMute: () => void;
  onOpenRules: () => void;
  onOpenTutorial: () => void;
  onStartMatch: () => void;
  onExitToHub?: () => void;
}

export const Heavy13TitleScreen: React.FC<Heavy13TitleScreenProps> = ({
  mode,
  playerCount,
  startingSeatChoice,
  aiDifficulty,
  memoryMode,
  muted,
  onChangeMode,
  onChangePlayerCount,
  onChangeStartingSeatChoice,
  onChangeAiDifficulty,
  onChangeMemoryMode,
  onToggleMute,
  onOpenRules,
  onOpenTutorial,
  onStartMatch,
  onExitToHub,
}) => {
  return (
    <main className="relative z-10 flex-1 flex flex-col justify-between px-6 py-8 sm:px-10 sm:py-10 max-w-6xl w-full mx-auto">
      <div className="flex items-center justify-between gap-2">
        <div>
          {onExitToHub && (
            <button
              type="button"
              onClick={onExitToHub}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-lounge-slate-700 bg-obsidian-850/90 text-xs font-medium text-lounge-slate-200 hover:border-gold-500/70 hover:text-white transition-colors cursor-pointer whitespace-nowrap"
            >
              <ArrowLeft className="w-4 h-4 text-gold-400" />
              게임 목록
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onOpenTutorial}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-lounge-sky-400/50 bg-lounge-sky-900/40 text-xs font-semibold text-lounge-sky-200 hover:border-lounge-sky-300 hover:text-white transition-colors cursor-pointer whitespace-nowrap"
          >
            <GraduationCap className="w-4 h-4 text-lounge-sky-300" />
            튜토리얼
          </button>
          <button
            type="button"
            onClick={onOpenRules}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-lounge-slate-700 bg-obsidian-850/90 text-xs font-medium text-lounge-slate-200 hover:border-gold-500/70 hover:text-white transition-colors cursor-pointer whitespace-nowrap"
          >
            <BookOpen className="w-4 h-4 text-gold-400" />
            게임 규칙
          </button>
          <button
            type="button"
            onClick={onToggleMute}
            aria-label={muted ? '소리 켜기' : '음소거'}
            className="min-w-[40px] min-h-[40px] inline-flex items-center justify-center rounded-lg border border-lounge-slate-700 bg-obsidian-850/90 text-lounge-slate-200 hover:border-gold-500/70 hover:text-white transition-colors cursor-pointer"
          >
            {muted ? (
              <VolumeX className="w-4 h-4 text-rival-400" />
            ) : (
              <Volume2 className="w-4 h-4 text-gold-400" />
            )}
          </button>
        </div>
      </div>

      <div className="my-auto grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-10 items-center py-6">
        {/* Left: SVG Title Lockup & Brief */}
        <div className="space-y-6">
          <svg
            viewBox="0 0 480 132"
            className="w-full max-w-[460px] h-auto"
            role="img"
            aria-label="무거운 13 Heavy 13"
          >
            {/* Weighted Pedestal & Cubes Emblem */}
            <g transform="translate(8, 14)">
              <rect
                x="4"
                y="66"
                width="70"
                height="18"
                rx="4"
                fill="var(--color-obsidian-850)"
                stroke="var(--color-gold-500)"
                strokeWidth="2"
              />
              <rect
                x="14"
                y="38"
                width="24"
                height="24"
                rx="4"
                fill="var(--color-obsidian-800)"
                stroke="var(--color-lounge-sky-400)"
                strokeWidth="2"
              />
              <text
                x="26"
                y="55"
                textAnchor="middle"
                fill="var(--color-lounge-sky-300)"
                fontSize="14"
                fontWeight="700"
                fontFamily="JetBrains Mono, monospace"
              >
                6
              </text>
              <rect
                x="42"
                y="38"
                width="24"
                height="24"
                rx="4"
                fill="var(--color-obsidian-800)"
                stroke="var(--color-rival-400)"
                strokeWidth="2"
              />
              <text
                x="54"
                y="55"
                textAnchor="middle"
                fill="var(--color-rival-400)"
                fontSize="14"
                fontWeight="700"
                fontFamily="JetBrains Mono, monospace"
              >
                6
              </text>
              <rect
                x="27"
                y="10"
                width="24"
                height="24"
                rx="4"
                fill="var(--color-gold-400)"
              />
              <text
                x="39"
                y="27"
                textAnchor="middle"
                fill="var(--color-gold-950)"
                fontSize="13"
                fontWeight="700"
                fontFamily="JetBrains Mono, monospace"
              >
                1
              </text>
            </g>

            <text
              x="104"
              y="66"
              fill="var(--color-gold-100)"
              fontSize="48"
              fontWeight="700"
              fontFamily="Fraunces, Noto Sans KR, serif"
              letterSpacing="-0.02em"
            >
              무거운 13
            </text>
            <line
              x1="106"
              y1="82"
              x2="368"
              y2="82"
              stroke="var(--color-gold-500)"
              strokeOpacity="0.48"
              strokeWidth="1.5"
            />
            <text
              x="106"
              y="108"
              fill="var(--color-lounge-sky-300)"
              fontSize="16"
              fontWeight="600"
              fontFamily="Plus Jakarta Sans, sans-serif"
              letterSpacing="0.24em"
            >
              HEAVY 13
            </text>
          </svg>

          <p className="max-w-lg text-base sm:text-lg text-lounge-slate-300 leading-relaxed text-pretty">
            빨강·초록·파랑 3개의 받침대 합계가 <strong className="text-rival-400 font-semibold">13 이상</strong>이 되지 않도록 바위 카드(0~6)와 색깔 칩을 제출해 <strong className="text-gold-200 font-semibold">14라운드</strong> 동안 벌점을 피하세요.
          </p>

          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs sm:text-sm text-lounge-slate-400">
            <span>바위 카드 0~6 · 색깔 칩 7개</span>
            <span aria-hidden="true">·</span>
            <span>7R 후 손패 재지급 (받침대 유지)</span>
            <span aria-hidden="true">·</span>
            <span>라운드당 1회 패스 역순 배치</span>
          </div>
        </div>

        {/* Right: Match Configuration */}
        <div className="obsidian-panel rounded-2xl p-6 sm:p-7 space-y-4">
          {/* Mode */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-lounge-slate-400">
              대전 방식
            </label>
            <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl obsidian-subpanel">
              <button
                type="button"
                onClick={() => onChangeMode('ai')}
                className={[
                  'py-2.5 px-3 rounded-lg text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap',
                  mode === 'ai'
                    ? 'bg-gold-400 text-gold-950'
                    : 'text-lounge-slate-300 hover:text-white',
                ].join(' ')}
              >
                1P vs AI
              </button>
              <button
                type="button"
                onClick={() => onChangeMode('local')}
                className={[
                  'py-2.5 px-3 rounded-lg text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap',
                  mode === 'local'
                    ? 'bg-gold-400 text-gold-950'
                    : 'text-lounge-slate-300 hover:text-white',
                ].join(' ')}
              >
                로컬 멀티 대전
              </button>
            </div>
          </div>

          {/* Player Count (3 to 7) */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-lounge-slate-400">
              참가 인원
            </label>
            <div className="grid grid-cols-5 gap-1.5 p-1 rounded-xl obsidian-subpanel">
              {([3, 4, 5, 6, 7] as const).map((count) => (
                <button
                  key={count}
                  type="button"
                  onClick={() => {
                    onChangePlayerCount(count);
                    if (startingSeatChoice >= count) onChangeStartingSeatChoice(0);
                  }}
                  className={[
                    'py-2 px-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap',
                    playerCount === count
                      ? 'bg-lounge-slate-700/90 text-gold-200 border border-gold-500/40'
                      : 'text-lounge-slate-300 hover:text-white',
                  ].join(' ')}
                >
                  {count}인
                </button>
              ))}
            </div>
          </div>

          {/* Seat Position (in AI mode) */}
          {mode === 'ai' && (
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-lounge-slate-400">
                내 좌석 선택 (1라운드 선 플레이어는 무작위 추첨)
              </label>
              <div className="flex flex-wrap gap-1.5 p-1.5 rounded-xl obsidian-subpanel">
                {Array.from({ length: playerCount }, (_, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => onChangeStartingSeatChoice(idx)}
                    className={[
                      'flex-1 min-w-[64px] py-2 px-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap',
                      startingSeatChoice === idx
                        ? 'bg-lounge-slate-700/90 text-gold-200 border border-gold-500/40'
                        : 'text-lounge-slate-300 hover:text-white',
                    ].join(' ')}
                  >
                    {idx + 1}번 자리
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* AI Difficulty */}
          {mode === 'ai' && (
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-lounge-slate-400">
                AI 전략 난이도
              </label>
              <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl obsidian-subpanel">
                {(['normal', 'hard', 'master'] as AIDifficulty[]).map((diff) => (
                  <button
                    key={diff}
                    type="button"
                    onClick={() => onChangeAiDifficulty(diff)}
                    className={[
                      'py-2 px-2 rounded-lg text-xs sm:text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap',
                      aiDifficulty === diff
                        ? 'bg-lounge-slate-700/90 text-gold-200 border border-gold-500/40'
                        : 'text-lounge-slate-300 hover:text-white',
                    ].join(' ')}
                  >
                    {AI_DIFFICULTY_LABEL[diff]}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Memory Mode (Original No-History Mode) */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-lounge-slate-400">
              기억 모드 (원작 방식)
            </label>
            <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl obsidian-subpanel">
              <button
                type="button"
                onClick={() => onChangeMemoryMode(false)}
                className={[
                  'py-2 px-2.5 rounded-lg text-xs sm:text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap',
                  !memoryMode
                    ? 'bg-lounge-slate-700/90 text-gold-200 border border-gold-500/40'
                    : 'text-lounge-slate-300 hover:text-white',
                ].join(' ')}
              >
                기록 패널 표시
              </button>
              <button
                type="button"
                onClick={() => onChangeMemoryMode(true)}
                className={[
                  'py-2 px-2.5 rounded-lg text-xs sm:text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap',
                  memoryMode
                    ? 'bg-lounge-sky-900/80 text-lounge-sky-200 border border-lounge-sky-400/50'
                    : 'text-lounge-slate-300 hover:text-white',
                ].join(' ')}
              >
                기억 모드 (숨김)
              </button>
            </div>
          </div>

          <div className="grid grid-cols-[auto_1fr] gap-2.5 mt-2">
            <button
              type="button"
              onClick={onOpenTutorial}
              className="min-h-[48px] py-3 px-4 rounded-xl border border-lounge-sky-400/50 bg-lounge-sky-900/40 hover:bg-lounge-sky-900/70 text-lounge-sky-200 font-bold text-sm transition-colors flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <GraduationCap className="w-4 h-4 text-lounge-sky-300" />
              튜토리얼
            </button>
            <button
              type="button"
              onClick={onStartMatch}
              className="w-full min-h-[48px] py-3.5 px-5 rounded-xl bg-gold-400 hover:bg-gold-300 text-gold-950 font-bold text-base shadow-lg transition-colors flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap"
            >
              <Play className="w-5 h-5 fill-current" />
              게임 시작 (14라운드)
            </button>
          </div>
        </div>
      </div>

      <p className="text-center text-xs text-lounge-slate-500 tracking-wide">
        제출 제한 시간 3분 · Esc: 일시정지 · M: 음소거
      </p>
    </main>
  );
};
