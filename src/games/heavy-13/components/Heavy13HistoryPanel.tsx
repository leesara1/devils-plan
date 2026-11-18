import React from 'react';
import {
  CHIP_META,
  ChipType,
  HALF_ROUND,
  PEDESTAL_META,
  PlayerState,
  ROCK_NUMBERS,
  RoundHistoryRecord,
  computeRemainingInCurrentSet,
} from '../engine/heavy13';

interface Heavy13HistoryPanelProps {
  players: PlayerState[];
  roundHistory: RoundHistoryRecord[];
  currentRoundNumber: number;
}

const CHIP_TEXT_COLOR: Record<ChipType, string> = {
  red: 'theme-text-rival',
  green: 'theme-text-emerald',
  blue: 'theme-text-sky',
  rainbow: 'theme-text-gold',
};

export const Heavy13HistoryPanel: React.FC<Heavy13HistoryPanelProps> = ({
  players,
  roundHistory,
  currentRoundNumber,
}) => {
  const activeSetNumber = currentRoundNumber <= HALF_ROUND ? 1 : 2;
  const setRangeLabel = activeSetNumber === 1 ? '1–7R' : '8–14R';

  return (
    <section
      aria-label="지난 라운드 기록 및 미사용 패"
      className="obsidian-panel rounded-2xl p-4 sm:p-5 space-y-5"
    >
      {/* Part 1: Round-by-Round History Table */}
      <div className="space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm sm:text-base font-bold theme-text-gold-strong">
            지난 라운드 기록
          </h2>
          <span className="font-mono-tabular text-xs theme-text-muted">
            칩 · 바위 카드 · 패스 여부 · 라운드 벌점
          </span>
        </div>

        {roundHistory.length === 0 ? (
          <div className="obsidian-subpanel rounded-xl px-4 py-5 text-center text-xs sm:text-sm theme-text-muted">
            1라운드가 종료되면 각 플레이어가 제출한 칩·카드, 패스 여부, 받은 벌점이 표로 표시됩니다.
          </div>
        ) : (
          <div className="obsidian-subpanel rounded-xl overflow-x-auto">
            <table className="w-full min-w-[540px] text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-white/10 theme-text-muted">
                  <th className="sticky left-0 z-10 bg-slate-100 dark:bg-obsidian-850 px-3 py-2.5 font-semibold whitespace-nowrap">
                    라운드
                  </th>
                  {players.map((p) => (
                    <th
                      key={p.id}
                      className="px-3 py-2.5 font-semibold theme-text-secondary whitespace-nowrap"
                    >
                      {p.seatIndex + 1}번 · {p.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-white/5">
                {roundHistory.map((rec) => (
                  <tr key={rec.roundNumber} className="hover:bg-slate-200/40 dark:hover:bg-white/[0.02]">
                    <td className="sticky left-0 z-10 bg-slate-100 dark:bg-obsidian-850 px-3 py-2.5 font-mono-tabular font-bold theme-text-gold whitespace-nowrap border-r border-slate-200 dark:border-white/5">
                      R{rec.roundNumber}
                      {rec.roundNumber === HALF_ROUND && (
                        <span className="ml-1 text-[10px] font-normal theme-text-sky">
                          (세트1 끝)
                        </span>
                      )}
                    </td>
                    {players.map((p) => {
                      const sub = rec.submissionsByPlayer[p.id];
                      const passed = rec.passedPlayerIds.includes(p.id);
                      const penalty = rec.penaltiesByPlayer[p.id] ?? 0;
                      const placeLog = rec.logs.find(
                        (l) => l.playerId === p.id && l.action === 'PLACE'
                      );
                      const rainbowTarget =
                        sub?.chip === 'rainbow' && placeLog?.targetColor
                          ? PEDESTAL_META[placeLog.targetColor].shortKo
                          : null;

                      if (!sub) {
                        return (
                          <td key={p.id} className="px-3 py-2.5 theme-text-faint">
                            -
                          </td>
                        );
                      }

                      return (
                        <td key={p.id} className="px-3 py-2.5 align-top whitespace-nowrap">
                          <div className="flex items-center gap-1.5 font-mono-tabular">
                            <span className={`font-bold ${CHIP_TEXT_COLOR[sub.chip]}`}>
                              {CHIP_META[sub.chip].shortKo}
                              {rainbowTarget ? `→${rainbowTarget}` : ''}
                            </span>
                            <span className="theme-text-faint">·</span>
                            <span className="font-bold theme-text-primary">{sub.card}</span>
                            {passed && (
                              <span className="text-[11px] font-semibold theme-text-sky ml-0.5">
                                패스
                              </span>
                            )}
                          </div>
                          {penalty > 0 && (
                            <div className="font-mono-tabular text-[11px] font-bold theme-text-rival mt-0.5">
                              벌점 +{penalty}점
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Part 2: Remaining Cards & Chips per Player in Current Set */}
      <div className="space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-xs sm:text-sm font-bold theme-text-sky">
            각 플레이어가 이번 세트에서 아직 안 낸 카드 · 칩 (세트 {activeSetNumber} · {setRangeLabel})
          </h3>
          <span className="text-[11px] theme-text-muted">
            지난 라운드 기록 기준 계산
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
          {players.map((p) => {
            const remaining = computeRemainingInCurrentSet(
              p.id,
              roundHistory,
              currentRoundNumber
            );
            return (
              <div
                key={p.id}
                className="obsidian-subpanel rounded-xl px-3.5 py-2.5 flex flex-col gap-2"
              >
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="font-semibold theme-text-primary truncate">
                    {p.seatIndex + 1}번 · {p.name}
                  </span>
                  <span className="font-mono-tabular theme-text-muted whitespace-nowrap">
                    남은 카드 {remaining.cards.length}장
                  </span>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2">
                  {/* Cards 0..6 */}
                  <div className="flex items-center gap-1" aria-label={`${p.name} 남은 바위 카드`}>
                    {ROCK_NUMBERS.map((num) => {
                      const hasCard = remaining.cards.includes(num);
                      return (
                        <span
                          key={num}
                          className={[
                            'w-6 h-6 rounded border font-mono-tabular text-xs font-bold inline-flex items-center justify-center',
                            hasCard
                              ? 'bg-white border-amber-400/70 text-slate-900 dark:bg-obsidian-800 dark:border-gold-500/45 dark:text-gold-100'
                              : 'bg-slate-200/70 border-slate-200 text-slate-400 dark:bg-obsidian-950/60 dark:border-lounge-slate-800/70 dark:text-lounge-slate-500/35 line-through',
                          ].join(' ')}
                        >
                          {num}
                        </span>
                      );
                    })}
                  </div>

                  {/* Chips R/G/B/Rainbow */}
                  <div className="flex items-center gap-2 font-mono-tabular text-xs">
                    {(['red', 'green', 'blue', 'rainbow'] as ChipType[]).map((chip) => {
                      const count = remaining.chips[chip];
                      return (
                        <span
                          key={chip}
                          className={
                            count > 0
                              ? `${CHIP_TEXT_COLOR[chip]} font-bold`
                              : 'text-slate-400/70 dark:text-lounge-slate-500/35'
                          }
                        >
                          {CHIP_META[chip].shortKo}×{count}
                        </span>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
