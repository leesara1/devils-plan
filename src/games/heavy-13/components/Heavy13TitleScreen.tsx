import React from 'react';
import {
  ArrowLeft,
  BookOpen,
  GraduationCap,
  Play,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { Heavy13PreviewDiagram } from '../../../components/GameBoardIllustrations';
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
    <main className="relative z-10 flex-1 flex flex-col justify-between px-5 py-6 sm:px-8 sm:py-8 max-w-6xl w-full mx-auto gap-8">
      {/* Top Bar */}
      <div className="flex items-center justify-between gap-3 pb-4 border-b border-white/[0.08]">
        <div className="flex items-center gap-3">
          {onExitToHub && (
            <button
              type="button"
              onClick={onExitToHub}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-white/10 bg-obsidian-850 text-xs font-medium text-lounge-slate-300 hover:border-white/25 hover:text-white transition-colors cursor-pointer whitespace-nowrap"
            >
              <ArrowLeft className="w-4 h-4 text-lounge-slate-400" />
              매치 목록
            </button>
          )}
          <span className="hidden sm:inline font-mono-tabular text-xs text-lounge-slate-500">
            시즌 3 · 메인 매치
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onOpenTutorial}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-lounge-sky-400/40 bg-lounge-sky-900/30 text-xs font-semibold text-lounge-sky-200 hover:border-lounge-sky-300 transition-colors cursor-pointer whitespace-nowrap"
          >
            <GraduationCap className="w-4 h-4 text-lounge-sky-300" />
            튜토리얼
          </button>
          <button
            type="button"
            onClick={onOpenRules}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-white/10 bg-obsidian-850 text-xs font-medium text-lounge-slate-300 hover:border-white/25 hover:text-white transition-colors cursor-pointer whitespace-nowrap"
          >
            <BookOpen className="w-4 h-4 text-lounge-slate-400" />
            게임 규칙
          </button>
          <button
            type="button"
            onClick={onToggleMute}
            aria-label={muted ? '소리 켜기' : '음소거'}
            className="min-w-[38px] min-h-[38px] inline-flex items-center justify-center rounded-lg border border-white/10 bg-obsidian-850 text-lounge-slate-300 hover:border-white/25 hover:text-white transition-colors cursor-pointer"
          >
            {muted ? (
              <VolumeX className="w-4 h-4 text-rival-400" />
            ) : (
              <Volume2 className="w-4 h-4 text-gold-400" />
            )}
          </button>
        </div>
      </div>

      {/* Main Split */}
      <div className="my-auto grid grid-cols-1 lg:grid-cols-[1.05fr_0.95fr] gap-8 lg:gap-10 items-stretch">
        {/* Left: Clean Vector Diagram & Rule Summary */}
        <div className="flex flex-col justify-between gap-6">
          <div className="space-y-5">
            <div className="rounded-xl overflow-hidden border border-white/[0.08]">
              <Heavy13PreviewDiagram />
            </div>

            <div className="space-y-2">
              <div className="font-mono-tabular text-xs text-lounge-slate-400">
                HEAVY 13 · 14 ROUNDS · 3–7 PLAYERS
              </div>
              <h1 className="font-display text-3xl sm:text-4xl font-bold text-white">
                무거운 13
              </h1>
              <p className="text-sm sm:text-base text-lounge-slate-300 leading-relaxed text-pretty pt-1">
                빨강·초록·파랑 3개의 받침대 합계가 <strong className="text-rival-400 font-semibold">13 이상</strong>이 되지 않도록 바위 카드(0~6)와 색깔 칩을 제출해 <strong className="text-white font-semibold">14라운드</strong> 동안 벌점을 피하세요.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 border-y border-white/[0.08] divide-x divide-white/[0.08] text-xs">
            <div className="py-3 pr-3">
              <div className="text-lounge-slate-500">손패 구성</div>
              <div className="font-semibold text-white mt-0.5">바위 0~6 · 칩 7개</div>
            </div>
            <div className="py-3 px-3">
              <div className="text-lounge-slate-500">세트 전환</div>
              <div className="font-semibold text-white mt-0.5">7R 후 손패 재지급</div>
            </div>
            <div className="py-3 pl-3">
              <div className="text-lounge-slate-500">심리전</div>
              <div className="font-semibold text-white mt-0.5">라운드당 1회 역순 패스</div>
            </div>
          </div>
        </div>

        {/* Right: Match Configuration */}
        <div className="obsidian-panel rounded-xl p-5 sm:p-6 flex flex-col justify-between gap-5">
          <div className="space-y-4">
            <div className="pb-3 border-b border-white/[0.08] flex items-center justify-between gap-2">
              <h2 className="font-display text-base font-bold text-white">
                매치 설정
              </h2>
              <span className="font-mono-tabular text-xs text-lounge-slate-400">
                제출 제한 3분
              </span>
            </div>

            {/* Mode */}
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-lounge-slate-400">
                대전 방식
              </label>
              <div className="grid grid-cols-2 gap-1 p-1 rounded-lg bg-obsidian-900 border border-white/[0.07]">
                <button
                  type="button"
                  onClick={() => onChangeMode('ai')}
                  className={[
                    'py-2 px-3 rounded-md text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap',
                    mode === 'ai'
                      ? 'bg-gold-400 text-gold-950 font-bold'
                      : 'text-lounge-slate-300 hover:text-white',
                  ].join(' ')}
                >
                  1P vs AI
                </button>
                <button
                  type="button"
                  onClick={() => onChangeMode('local')}
                  className={[
                    'py-2 px-3 rounded-md text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap',
                    mode === 'local'
                      ? 'bg-gold-400 text-gold-950 font-bold'
                      : 'text-lounge-slate-300 hover:text-white',
                  ].join(' ')}
                >
                  로컬 멀티 대전
                </button>
              </div>
            </div>

            {/* Player Count (3 to 7) */}
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-lounge-slate-400">
                참가 인원
              </label>
              <div className="grid grid-cols-5 gap-1 p-1 rounded-lg bg-obsidian-900 border border-white/[0.07]">
                {([3, 4, 5, 6, 7] as const).map((count) => (
                  <button
                    key={count}
                    type="button"
                    onClick={() => {
                      onChangePlayerCount(count);
                      if (startingSeatChoice >= count) onChangeStartingSeatChoice(0);
                    }}
                    className={[
                      'py-2 px-1.5 rounded-md text-xs sm:text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap',
                      playerCount === count
                        ? 'bg-obsidian-800 text-white border border-white/15'
                        : 'text-lounge-slate-400 hover:text-white',
                    ].join(' ')}
                  >
                    {count}인
                  </button>
                ))}
              </div>
            </div>

            {/* Seat Position (in AI mode) */}
            {mode === 'ai' && (
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-lounge-slate-400">
                  내 좌석 선택 (1라운드 선 플레이어는 무작위 추첨)
                </label>
                <div className="flex flex-wrap gap-1 p-1 rounded-lg bg-obsidian-900 border border-white/[0.07]">
                  {Array.from({ length: playerCount }, (_, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => onChangeStartingSeatChoice(idx)}
                      className={[
                        'flex-1 min-w-[60px] py-1.5 px-2 rounded-md text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap',
                        startingSeatChoice === idx
                          ? 'bg-obsidian-800 text-white border border-white/15'
                          : 'text-lounge-slate-400 hover:text-white',
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
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-lounge-slate-400">
                  AI 전략 난이도
                </label>
                <div className="grid grid-cols-3 gap-1 p-1 rounded-lg bg-obsidian-900 border border-white/[0.07]">
                  {(['normal', 'hard', 'master'] as AIDifficulty[]).map((diff) => (
                    <button
                      key={diff}
                      type="button"
                      onClick={() => onChangeAiDifficulty(diff)}
                      className={[
                        'py-2 px-2 rounded-md text-xs sm:text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap',
                        aiDifficulty === diff
                          ? 'bg-obsidian-800 text-white border border-white/15'
                          : 'text-lounge-slate-400 hover:text-white',
                      ].join(' ')}
                    >
                      {AI_DIFFICULTY_LABEL[diff]}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Memory Mode */}
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-lounge-slate-400">
                기억 모드 (원작 방식)
              </label>
              <div className="grid grid-cols-2 gap-1 p-1 rounded-lg bg-obsidian-900 border border-white/[0.07]">
                <button
                  type="button"
                  onClick={() => onChangeMemoryMode(false)}
                  className={[
                    'py-2 px-2.5 rounded-md text-xs sm:text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap',
                    !memoryMode
                      ? 'bg-obsidian-800 text-white border border-white/15'
                      : 'text-lounge-slate-400 hover:text-white',
                  ].join(' ')}
                >
                  기록 패널 표시
                </button>
                <button
                  type="button"
                  onClick={() => onChangeMemoryMode(true)}
                  className={[
                    'py-2 px-2.5 rounded-md text-xs sm:text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap',
                    memoryMode
                      ? 'bg-lounge-sky-900/60 text-lounge-sky-200 border border-lounge-sky-400/40'
                      : 'text-lounge-slate-400 hover:text-white',
                  ].join(' ')}
                >
                  기억 모드 (숨김)
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-[auto_1fr] gap-2.5 pt-1">
            <button
              type="button"
              onClick={onOpenTutorial}
              className="min-h-[44px] py-2.5 px-4 rounded-lg border border-lounge-sky-400/40 bg-lounge-sky-900/30 hover:bg-lounge-sky-900/50 text-lounge-sky-200 font-semibold text-sm transition-colors flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <GraduationCap className="w-4 h-4 text-lounge-sky-300" />
              튜토리얼
            </button>
            <button
              type="button"
              onClick={onStartMatch}
              className="w-full min-h-[44px] py-3 px-5 rounded-lg bg-gold-400 hover:bg-gold-300 text-gold-950 font-bold text-sm sm:text-base transition-colors flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap"
            >
              <Play className="w-4 h-4 fill-current" />
              게임 시작 (14라운드)
            </button>
          </div>
        </div>
      </div>

      <p className="text-center text-xs text-lounge-slate-500">
        제출 제한 시간 3분 · Esc: 일시정지 · M: 음소거
      </p>
    </main>
  );
};
