import React from 'react';
import { Eye, EyeOff, ArrowRight, Trophy } from 'lucide-react';
import {
  BoardSolution,
  Card,
  GRID_COORDS,
  HandEvaluation,
  compareHands,
  explainComparison,
} from '../engine/poker';
import { PlayingCard } from './PlayingCard';

interface ShowdownPanelProps {
  p1Indices: [number, number];
  p2Indices: [number, number];
  gridCards: Card[];
  communityCards: Card[];
  p1Eval: HandEvaluation;
  p2Eval: HandEvaluation;
  optimalSolution: BoardSolution;
  opponentLabel: string;
  showAllBoardCards: boolean;
  onToggleShowAllBoardCards: () => void;
  onNextAction: () => void;
  nextActionLabel: string;
}

export const ShowdownPanel: React.FC<ShowdownPanelProps> = ({
  p1Indices,
  p2Indices,
  gridCards,
  communityCards,
  p1Eval,
  p2Eval,
  optimalSolution,
  opponentLabel,
  showAllBoardCards,
  onToggleShowAllBoardCards,
  onNextAction,
  nextActionLabel,
}) => {
  const cmp = compareHands(p1Eval, p2Eval);
  const reason = explainComparison(p1Eval, p2Eval);

  const p1Cards = [gridCards[p1Indices[0]], gridCards[p1Indices[1]], ...communityCards];
  const p2Cards = [gridCards[p2Indices[0]], gridCards[p2Indices[1]], ...communityCards];

  const headline =
    cmp === 1
      ? '플레이어 1 승리'
      : cmp === -1
        ? `${opponentLabel} 승리`
        : '무승부';

  const optCoords = `${GRID_COORDS[optimalSolution.indices[0]]} · ${GRID_COORDS[optimalSolution.indices[1]]}`;

  return (
    <div className="w-full rounded-2xl bg-[#092117]/95 border border-emerald-700/50 shadow-2xl p-4 sm:p-5 space-y-4">
      {/* Winner header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-emerald-800/60">
        <div className="flex items-center gap-3">
          <div
            className={[
              'w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border',
              cmp === 1
                ? 'bg-amber-400/15 border-amber-400/50 text-amber-300'
                : cmp === -1
                  ? 'bg-rose-500/15 border-rose-400/50 text-rose-300'
                  : 'bg-emerald-500/15 border-emerald-400/50 text-emerald-200',
            ].join(' ')}
          >
            <Trophy className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-display text-lg sm:text-xl font-bold text-white leading-tight">
              {headline}
            </h3>
            <p className="text-xs sm:text-sm text-emerald-200/85 mt-0.5">{reason}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onToggleShowAllBoardCards}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-emerald-700/60 bg-emerald-950/60 text-xs font-medium text-emerald-100 hover:bg-emerald-900/70 transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            {showAllBoardCards ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            {showAllBoardCards ? '선택 카드만 보기' : '전체 16장 확인'}
          </button>
          <button
            type="button"
            onClick={onNextAction}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-amber-400 text-[#1a1304] text-xs sm:text-sm font-bold hover:bg-amber-300 transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            {nextActionLabel}
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Hands comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
        {/* Player 1 Hand */}
        <div
          className={[
            'rounded-xl p-3.5 border transition-colors',
            cmp === 1
              ? 'bg-amber-400/[0.07] border-amber-400/50'
              : 'bg-[#061810]/80 border-emerald-800/50',
          ].join(' ')}
        >
          <div className="flex items-center justify-between gap-2 mb-2.5">
            <div className="flex items-center gap-2 text-sm">
              <span className="font-bold text-amber-300">플레이어 1</span>
              <span className="text-emerald-400/60" aria-hidden="true">·</span>
              <span className="font-mono-tabular text-xs text-emerald-200/80">
                선택 {GRID_COORDS[p1Indices[0]]}, {GRID_COORDS[p1Indices[1]]}
              </span>
            </div>
            <span className="text-xs sm:text-sm font-bold text-white">
              {p1Eval.descriptionKo}
            </span>
          </div>

          <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
            {p1Cards.map((card, i) => {
              const isSelected = i < 2;
              const isScoring = p1Eval.scoringCardIds.includes(card.id);
              return (
                <div key={`p1-${card.id}`} className="flex flex-col items-center gap-1">
                  <div className="w-full aspect-[5/7]">
                    <PlayingCard
                      card={card}
                      faceUp={true}
                      size="sm"
                      isScoringHighlight={isScoring}
                      dimmed={!isScoring}
                    />
                  </div>
                  <span className="text-[10px] font-mono-tabular text-emerald-300/75">
                    {isSelected ? GRID_COORDS[p1Indices[i]] : '공유'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Opponent Hand */}
        <div
          className={[
            'rounded-xl p-3.5 border transition-colors',
            cmp === -1
              ? 'bg-rose-500/[0.08] border-rose-400/50'
              : 'bg-[#061810]/80 border-emerald-800/50',
          ].join(' ')}
        >
          <div className="flex items-center justify-between gap-2 mb-2.5">
            <div className="flex items-center gap-2 text-sm">
              <span className="font-bold text-rose-300">{opponentLabel}</span>
              <span className="text-emerald-400/60" aria-hidden="true">·</span>
              <span className="font-mono-tabular text-xs text-emerald-200/80">
                선택 {GRID_COORDS[p2Indices[0]]}, {GRID_COORDS[p2Indices[1]]}
              </span>
            </div>
            <span className="text-xs sm:text-sm font-bold text-white">
              {p2Eval.descriptionKo}
            </span>
          </div>

          <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
            {p2Cards.map((card, i) => {
              const isSelected = i < 2;
              const isScoring = p2Eval.scoringCardIds.includes(card.id);
              return (
                <div key={`p2-${card.id}`} className="flex flex-col items-center gap-1">
                  <div className="w-full aspect-[5/7]">
                    <PlayingCard
                      card={card}
                      faceUp={true}
                      size="sm"
                      isScoringHighlight={isScoring}
                      dimmed={!isScoring}
                    />
                  </div>
                  <span className="text-[10px] font-mono-tabular text-emerald-300/75">
                    {isSelected ? GRID_COORDS[p2Indices[i]] : '공유'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Optimal possible board hand */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs text-emerald-200/80">
        <div>
          <span className="text-emerald-400 font-semibold">보드 최강 조합:</span>{' '}
          <span className="font-mono-tabular text-amber-200 font-semibold">{optCoords}</span>
          <span className="mx-1.5" aria-hidden="true">·</span>
          <span className="text-white font-medium">{optimalSolution.evaluation.descriptionKo}</span>
        </div>
        <span className="text-emerald-300/65">
          {showAllBoardCards ? '보드 위 나머지 카드들이 앞면으로 표시 중입니다' : '선택된 카드만 앞면으로 공개되었습니다'}
        </span>
      </div>
    </div>
  );
};
