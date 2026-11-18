import React from 'react';
import { Crown, RotateCcw, Trophy } from 'lucide-react';
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
import { PlayerState, RankedPlayer, RoundHistoryRecord } from '../engine/heavy13';
import { Heavy13ResultBoard } from './Heavy13ResultBoard';

const PLAYER_CHART_COLORS = [
  'var(--color-gold-400)',
  'var(--color-lounge-sky-400)',
  'var(--color-rival-400)',
  '#34d399',
  '#c084fc',
  '#fb923c',
  '#2dd4bf',
];

interface Heavy13ResultModalProps {
  players: PlayerState[];
  finalRankings: RankedPlayer[];
  roundHistory: RoundHistoryRecord[];
  penaltyProgressionData: Record<string, string | number>[];
  onPlayAgain: () => void;
  onReturnToTitle: () => void;
  onExitToHub?: () => void;
}

export const Heavy13ResultModal: React.FC<Heavy13ResultModalProps> = ({
  players,
  finalRankings,
  roundHistory,
  penaltyProgressionData,
  onPlayAgain,
  onReturnToTitle,
  onExitToHub,
}) => {
  const topWinners = finalRankings.filter((r) => r.rank === 1);
  const eliminationCount = players.length <= 5 ? 1 : 2;
  const headline =
    topWinners.length > 1
      ? `${topWinners.map((w) => w.player.name).join(', ')} 공동 우승`
      : `${topWinners[0]?.player.name ?? ''} 최종 우승`;

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/55 dark:bg-black/80 p-2.5 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="무거운 13 최종 결과"
    >
      <div className="w-full max-w-4xl max-h-[94vh] overflow-y-auto obsidian-panel rounded-xl p-3.5 sm:p-7 space-y-4 sm:space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-amber-100 border border-amber-300 theme-text-gold dark:bg-gold-400/15 dark:border-gold-400/50 flex items-center justify-center shrink-0">
            <Trophy className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div className="min-w-0">
            <h2 className="font-display text-xl sm:text-2xl font-bold theme-text-primary truncate">
              {headline}
            </h2>
            <p className="text-xs sm:text-sm theme-text-secondary mt-0.5">
              14라운드 종료 · 하위 {eliminationCount}명 탈락 (동점 시 최근 벌점자가 하위, 무벌점 동점은 공동 순위)
            </p>
          </div>
        </div>

        {/* Standings Table */}
        <div className="obsidian-subpanel rounded-xl divide-y divide-slate-200 dark:divide-white/10">
          {finalRankings.map((item) => {
            const { player: p, rank, isTied, isEliminated } = item;
            const isWinner = rank === 1;
            return (
              <div
                key={p.id}
                className="flex items-center justify-between gap-2 sm:gap-3 px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm"
              >
                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                  <span
                    className={[
                      'font-mono-tabular font-bold min-w-[44px] sm:min-w-[54px] whitespace-nowrap',
                      isWinner
                        ? 'theme-text-gold'
                        : isEliminated
                          ? 'theme-text-rival'
                          : 'theme-text-secondary',
                    ].join(' ')}
                  >
                    {isTied ? `공동 ${rank}위` : `${rank}위`}
                  </span>
                  <span className="font-semibold theme-text-primary truncate flex items-center gap-1.5">
                    {isWinner && <Crown className="w-4 h-4 theme-text-gold shrink-0" />}
                    {p.name}
                  </span>
                  {isEliminated && (
                    <span className="text-[10px] sm:text-xs font-bold theme-text-rival border border-rose-300 bg-rose-50 dark:border-rival-400/50 dark:bg-rival-950/60 px-1.5 sm:px-2 py-0.5 rounded whitespace-nowrap shrink-0">
                      탈락
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2.5 sm:gap-4 text-[11px] sm:text-xs font-mono-tabular shrink-0">
                  <span className="theme-text-muted">
                    {p.lastPenaltyRound !== null ? (
                      <>
                        <span className="hidden sm:inline">최근 벌점 </span>R{p.lastPenaltyRound}
                      </>
                    ) : (
                      <>
                        <span className="hidden sm:inline">벌점 기록 없음</span>
                        <span className="sm:hidden">무벌점</span>
                      </>
                    )}
                  </span>
                  <span
                    className={[
                      'text-xs sm:text-sm font-bold',
                      isEliminated
                        ? 'theme-text-rival'
                        : isWinner
                          ? 'theme-text-gold-strong'
                          : 'theme-text-primary',
                    ].join(' ')}
                  >
                    {p.penaltyPoints}점
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Broadcast-Style Round Penalty Board & Per-Player Stats */}
        <Heavy13ResultBoard finalRankings={finalRankings} roundHistory={roundHistory} />

        {/* Penalty Progression Line Chart */}
        <div className="obsidian-subpanel rounded-xl p-3 sm:p-4 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-xs sm:text-sm font-semibold theme-text-secondary">
              라운드별 누적 벌점 추이 (1R–14R)
            </h3>
            <span className="font-mono-tabular text-xs theme-text-sky">
              낮을수록 유리
            </span>
          </div>
          <div className="w-full h-[210px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={penaltyProgressionData}
                margin={{ top: 8, right: 12, left: -16, bottom: 2 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--chart-grid)"
                  vertical={false}
                />
                <XAxis
                  dataKey="round"
                  stroke="var(--text-muted)"
                  tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
                  axisLine={{ stroke: 'var(--chart-axis)' }}
                  tickLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  stroke="var(--text-muted)"
                  tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--surface-panel)',
                    borderColor: 'var(--border-subtle)',
                    color: 'var(--text-primary)',
                    borderRadius: '0.5rem',
                    fontSize: '12px',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '6px' }} />
                {players.map((p, idx) => (
                  <Line
                    key={p.id}
                    type="monotone"
                    dataKey={p.id}
                    name={p.name}
                    stroke={PLAYER_CHART_COLORS[idx % PLAYER_CHART_COLORS.length]}
                    strokeWidth={2.2}
                    dot={{ r: 3 }}
                    isAnimationActive={false}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2.5 sm:gap-3 pt-1">
          {onExitToHub && (
            <button
              type="button"
              onClick={onExitToHub}
              className="min-h-[44px] px-4 py-2.5 rounded-lg border border-slate-300 bg-white text-sm font-medium text-slate-700 hover:border-slate-400 hover:text-slate-900 dark:border-white/10 dark:bg-transparent dark:text-lounge-slate-200 dark:hover:border-white/25 dark:hover:text-white transition-colors cursor-pointer"
            >
              게임 목록
            </button>
          )}
          <button
            type="button"
            onClick={onReturnToTitle}
            className="min-h-[44px] px-4 py-2.5 rounded-lg border border-slate-300 bg-white text-sm font-medium text-slate-700 hover:border-slate-400 hover:text-slate-900 dark:border-white/10 dark:bg-transparent dark:text-lounge-slate-200 dark:hover:border-white/25 dark:hover:text-white transition-colors cursor-pointer"
          >
            타이틀로
          </button>
          <button
            type="button"
            onClick={onPlayAgain}
            className="flex-1 sm:flex-none min-h-[44px] inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-lg bg-gold-400 hover:bg-gold-300 text-gold-950 font-bold text-sm transition-colors cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            다시 플레이
          </button>
        </div>
      </div>
    </div>
  );
};
