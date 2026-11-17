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
  red: 'text-rival-400',
  green: 'text-emerald-300',
  blue: 'text-lounge-sky-300',
  rainbow: 'text-gold-300',
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
          <h2 className="text-sm sm:text-base font-bold text-gold-200">
            지난 라운드 기록
          </h2>
          <span className="font-mono-tabular text-xs text-lounge-slate-400">
            칩 · 바위 카드 · 패스 여부 · 라운드 벌점
          </span>
        </div>

        {roundHistory.length === 0 ? (
          <div className="obsidian-subpanel rounded-xl px-4 py-5 text-center text-xs sm:text-sm text-lounge-slate-400">
            1라운드가 종료되면 각 플레이어가 제출한 칩·카드, 패스 여부, 받은 벌점이 표로 표시됩니다.
          </div>
        ) : (
          <div className="obsidian-subpanel rounded-xl overflow-x-auto">
            <table className="w-full min-w-[540px] text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-white/10 text-lounge-slate-400">
                  <th className="sticky left-0 z-10 bg-obsidian-850 px-3 py-2.5 font-semibold whitespace-nowrap">
                    라운드
                  </th>
                  {players.map((p) => (
                    <th
                      key={p.id}
                      className="px-3 py-2.5 font-semibold text-lounge-slate-200 whitespace-nowrap"
                    >
                      {p.seatIndex + 1}번 · {p.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {roundHistory.map((rec) => (
                  <tr key={rec.roundNumber} className="hover:bg-white/[0.02]">
                    <td className="sticky left-0 z-10 bg-obsidian-850 px-3 py-2.5 font-mono-tabular font-bold text-gold-400 whitespace-nowrap border-r border-white/5">
                      R{rec.roundNumber}
                      {rec.roundNumber === HALF_ROUND && (
                        <span className="ml-1 text-[10px] font-normal text-lounge-sky-300">
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
                          <td key={p.id} className="px-3 py-2.5 text-lounge-slate-500">
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
                            <span className="text-lounge-slate-500">·</span>
                            <span className="font-bold text-gold-100">{sub.card}</span>
                            {passed && (
                              <span className="text-[11px] font-semibold text-lounge-sky-300 ml-0.5">
                                패스
                              </span>
                            )}
                          </div>
                          {penalty > 0 && (
                            <div className="font-mono-tabular text-[11px] font-bold text-rival-400 mt-0.5">
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
          <h3 className="text-xs sm:text-sm font-bold text-lounge-sky-300">
            각 플레이어가 이번 세트에서 아직 안 낸 카드 · 칩 (세트 {activeSetNumber} · {setRangeLabel})
          </h3>
          <span className="text-[11px] text-lounge-slate-400">
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
                  <span className="font-semibold text-white truncate">
                    {p.seatIndex + 1}번 · {p.name}
                  </span>
                  <span className="font-mono-tabular text-lounge-slate-400 whitespace-nowrap">
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
                              ? 'bg-obsidian-800 border-gold-500/45 text-gold-100'
                              : 'bg-obsidian-950/60 border-lounge-slate-800/70 text-lounge-slate-500/35 line-through',
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
                              : 'text-lounge-slate-500/35'
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
