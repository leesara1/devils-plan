import React, { useMemo } from 'react';
import {
  CHIP_META,
  HALF_ROUND,
  RankedPlayer,
  RoundHistoryRecord,
  TOTAL_ROUNDS,
} from '../engine/heavy13';

interface Heavy13ResultBoardProps {
  finalRankings: RankedPlayer[];
  roundHistory: RoundHistoryRecord[];
}

interface PlayerMatchStats {
  passCount: number;
  burstCount: number;
  maxSinglePenalty: number;
}

const ROUNDS_LIST = Array.from({ length: TOTAL_ROUNDS }, (_, i) => i + 1);

export const Heavy13ResultBoard: React.FC<Heavy13ResultBoardProps> = ({
  finalRankings,
  roundHistory,
}) => {
  const statsByPlayer = useMemo(() => {
    const map: Record<string, PlayerMatchStats> = {};
    for (const item of finalRankings) {
      map[item.player.id] = {
        passCount: 0,
        burstCount: 0,
        maxSinglePenalty: 0,
      };
    }

    for (const rec of roundHistory) {
      for (const pid of rec.passedPlayerIds) {
        if (map[pid]) map[pid].passCount += 1;
      }

      for (const log of rec.logs) {
        if (log.action === 'PLACE' && log.overflowed) {
          const stat = map[log.playerId];
          if (!stat) continue;
          const pts = log.collectedCount ?? 0;
          stat.burstCount += 1;
          if (pts > stat.maxSinglePenalty) {
            stat.maxSinglePenalty = pts;
          }
        }
      }
    }

    return map;
  }, [finalRankings, roundHistory]);

  const roundMap = useMemo(() => {
    const m = new Map<number, RoundHistoryRecord>();
    for (const rec of roundHistory) {
      m.set(rec.roundNumber, rec);
    }
    return m;
  }, [roundHistory]);

  return (
    <div className="space-y-4">
      {/* Broadcast-Style Round-by-Round Penalty Table */}
      <section
        aria-label="라운드별 벌점 표"
        className="obsidian-subpanel rounded-xl p-3 sm:p-4 space-y-2.5"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-xs sm:text-sm font-bold theme-text-gold-strong">
            라운드별 벌점 현황표 (1R–14R)
          </h3>
          <span className="font-mono-tabular text-[11px] theme-text-muted">
            1세트(1–7R) · 2세트(8–14R)
          </span>
        </div>

        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white dark:border-white/10 dark:bg-obsidian-950/75">
          <table className="w-full min-w-[660px] border-collapse text-center font-mono-tabular text-[11px] sm:text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-white/10 theme-text-muted bg-slate-100 dark:bg-obsidian-900/90">
                <th
                  scope="col"
                  className="sticky left-0 z-20 bg-slate-100 dark:bg-obsidian-900 px-2.5 sm:px-3 py-2 text-left font-sans font-semibold theme-text-secondary border-r border-slate-200 dark:border-white/10 whitespace-nowrap"
                >
                  플레이어
                </th>
                {ROUNDS_LIST.map((r) => (
                  <th
                    key={`h-r-${r}`}
                    scope="col"
                    className={[
                      'px-1.5 py-2 font-semibold whitespace-nowrap min-w-[34px]',
                      r === HALF_ROUND ? 'border-r border-amber-400/50 dark:border-gold-500/35' : '',
                      r <= HALF_ROUND ? 'theme-text-secondary' : 'theme-text-sky',
                    ].join(' ')}
                  >
                    {r}R
                  </th>
                ))}
                <th
                  scope="col"
                  className="px-2.5 py-2 font-bold theme-text-gold-strong border-l border-slate-200 dark:border-white/10 whitespace-nowrap"
                >
                  총점
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-white/5">
              {finalRankings.map(({ player: p, rank, isEliminated }) => {
                const isWinner = rank === 1;
                return (
                  <tr key={`row-${p.id}`} className="hover:bg-slate-50 dark:hover:bg-white/[0.02]">
                    <th
                      scope="row"
                      className="sticky left-0 z-10 bg-slate-100 dark:bg-obsidian-900/95 px-2.5 sm:px-3 py-2 text-left font-sans font-semibold border-r border-slate-200 dark:border-white/10 whitespace-nowrap"
                    >
                      <div className="flex items-center gap-1.5">
                        <span
                          className={[
                            'font-mono-tabular text-[11px] font-bold w-6 shrink-0',
                            isWinner
                              ? 'theme-text-gold'
                              : isEliminated
                                ? 'theme-text-rival'
                                : 'theme-text-muted',
                          ].join(' ')}
                        >
                          {rank}위
                        </span>
                        <span className="text-xs theme-text-primary truncate max-w-[92px] sm:max-w-[120px]">
                          {p.name}
                        </span>
                        {isEliminated && (
                          <span className="text-[10px] font-bold theme-text-rival shrink-0">
                            탈락
                          </span>
                        )}
                      </div>
                    </th>

                    {ROUNDS_LIST.map((r) => {
                      const rec = roundMap.get(r);
                      const pen = rec?.penaltiesByPlayer[p.id] ?? 0;
                      const sub = rec?.submissionsByPlayer[p.id];
                      const passed = rec?.passedPlayerIds.includes(p.id) ?? false;
                      const tooltip = sub
                        ? `${r}R · ${CHIP_META[sub.chip].shortKo}/${sub.card}${passed ? ' (패스)' : ''} · 벌점 ${pen}점`
                        : `${r}R`;

                      return (
                        <td
                          key={`cell-${p.id}-${r}`}
                          title={tooltip}
                          className={[
                            'px-1 py-2 whitespace-nowrap',
                            r === HALF_ROUND ? 'border-r border-amber-400/50 dark:border-gold-500/35' : '',
                            pen > 0
                              ? 'bg-rose-50 text-rose-700 dark:bg-rival-950/70 dark:text-rival-400 font-extrabold'
                              : 'theme-text-faint',
                          ].join(' ')}
                        >
                          {pen > 0 ? `+${pen}` : '0'}
                        </td>
                      );
                    })}

                    <td
                      className={[
                        'px-2.5 py-2 font-extrabold border-l border-slate-200 dark:border-white/10 whitespace-nowrap',
                        isEliminated
                          ? 'theme-text-rival'
                          : isWinner
                            ? 'theme-text-gold-strong'
                            : 'theme-text-primary',
                      ].join(' ')}
                    >
                      {p.penaltyPoints}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Player Match Statistics (Passes, Overflows, Largest Single Penalty) */}
      <section
        aria-label="플레이어별 경기 통계"
        className="obsidian-subpanel rounded-xl p-3 sm:p-4 space-y-2.5"
      >
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-xs sm:text-sm font-bold theme-text-sky">
            플레이어별 경기 통계
          </h3>
          <span className="text-[11px] theme-text-muted">
            패스 · 폭발 · 최대 단일 벌점
          </span>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white dark:border-white/10 dark:bg-obsidian-950/75 overflow-hidden">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-white/10 theme-text-muted bg-slate-100 dark:bg-obsidian-900/80">
                <th scope="col" className="px-2.5 sm:px-3 py-2 text-left font-semibold">
                  플레이어
                </th>
                <th scope="col" className="px-2 py-2 text-right font-semibold whitespace-nowrap">
                  패스
                </th>
                <th scope="col" className="px-2 py-2 text-right font-semibold whitespace-nowrap">
                  폭발
                </th>
                <th scope="col" className="px-2 py-2 text-right font-semibold whitespace-nowrap">
                  최대 벌점
                </th>
                <th scope="col" className="px-2.5 sm:px-3 py-2 text-right font-semibold whitespace-nowrap">
                  누적
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-white/5 font-mono-tabular">
              {finalRankings.map(({ player: p, rank, isEliminated }) => {
                const stat = statsByPlayer[p.id] ?? {
                  passCount: 0,
                  burstCount: 0,
                  maxSinglePenalty: 0,
                };
                const isWinner = rank === 1;
                return (
                  <tr key={`stat-${p.id}`} className="hover:bg-slate-50 dark:hover:bg-white/[0.02]">
                    <td className="px-2.5 sm:px-3 py-2 font-sans font-semibold theme-text-primary truncate max-w-[116px] sm:max-w-none">
                      {p.name}
                    </td>
                    <td className="px-2 py-2 text-right theme-text-sky whitespace-nowrap">
                      {stat.passCount}회
                    </td>
                    <td
                      className={[
                        'px-2 py-2 text-right whitespace-nowrap',
                        stat.burstCount > 0 ? 'theme-text-rival font-semibold' : 'theme-text-muted',
                      ].join(' ')}
                    >
                      {stat.burstCount}회
                    </td>
                    <td
                      className={[
                        'px-2 py-2 text-right whitespace-nowrap',
                        stat.maxSinglePenalty > 0
                          ? 'theme-text-gold-strong font-semibold'
                          : 'theme-text-faint',
                      ].join(' ')}
                    >
                      {stat.maxSinglePenalty > 0 ? `+${stat.maxSinglePenalty}점` : '0점'}
                    </td>
                    <td
                      className={[
                        'px-2.5 sm:px-3 py-2 text-right font-bold whitespace-nowrap',
                        isEliminated
                          ? 'theme-text-rival'
                          : isWinner
                            ? 'theme-text-gold-strong'
                            : 'theme-text-primary',
                      ].join(' ')}
                    >
                      {p.penaltyPoints}점
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
