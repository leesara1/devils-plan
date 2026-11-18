import React from 'react';
import { ArrowRight, Eye, EyeOff, Trophy } from 'lucide-react';
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
    <div className="w-full obsidian-panel rounded-xl p-4 sm:p-6 space-y-5">
      {/* Winner header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-white/10">
        <div className="flex items-center gap-3.5">
          <div
            className={[
              'w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border',
              cmp === 1
                ? 'bg-gold-400/15 border-gold-400/50 text-gold-300'
                : cmp === -1
                  ? 'bg-rival-400/15 border-rival-400/50 text-rival-400'
                  : 'bg-lounge-sky-400/15 border-lounge-sky-400/50 text-lounge-sky-300',
            ].join(' ')}
          >
            <Trophy className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-display text-lg sm:text-xl font-bold text-white leading-tight">
              {headline}
            </h3>
            <p className="text-xs sm:text-sm text-lounge-slate-300 mt-0.5">{reason}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onToggleShowAllBoardCards}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-white/10 bg-obsidian-850 text-xs font-medium text-lounge-slate-200 hover:border-white/25 hover:text-white transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            {showAllBoardCards ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            {showAllBoardCards ? '선택 카드만 보기' : '전체 16장 확인'}
          </button>
          <button
            type="button"
            onClick={onNextAction}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-gold-400 text-gold-950 text-xs sm:text-sm font-bold hover:bg-gold-300 transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            {nextActionLabel}
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Hands comparison separated cleanly */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Player 1 Hand */}
        <div
          className={[
            'rounded-xl p-3.5 transition-colors border',
            cmp === 1
              ? 'bg-gold-400/[0.08] border-gold-400/50'
              : 'bg-obsidian-950/55 border-white/10',
          ].join(' ')}
        >
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2 text-sm">
              <span className="font-bold text-gold-200">플레이어 1</span>
              <span className="text-lounge-slate-500" aria-hidden="true">·</span>
              <span className="font-mono-tabular text-xs text-lounge-slate-400">
                {GRID_COORDS[p1Indices[0]]}, {GRID_COORDS[p1Indices[1]]}
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
                  <span className="text-[10px] font-mono-tabular text-lounge-slate-400">
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
            'rounded-xl p-3.5 transition-colors border',
            cmp === -1
              ? 'bg-rival-400/[0.08] border-rival-400/50'
              : 'bg-obsidian-950/55 border-white/10',
          ].join(' ')}
        >
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2 text-sm">
              <span className="font-bold text-rival-400">{opponentLabel}</span>
              <span className="text-lounge-slate-500" aria-hidden="true">·</span>
              <span className="font-mono-tabular text-xs text-lounge-slate-400">
                {GRID_COORDS[p2Indices[0]]}, {GRID_COORDS[p2Indices[1]]}
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
                  <span className="text-[10px] font-mono-tabular text-lounge-slate-400">
                    {isSelected ? GRID_COORDS[p2Indices[i]] : '공유'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Optimal possible board hand */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-white/10 text-xs text-lounge-slate-300">
        <div>
          <span className="text-lounge-sky-300 font-semibold">보드 최강 조합</span>{' '}
          <span className="font-mono-tabular text-gold-200 font-semibold">{optCoords}</span>
          <span className="mx-1.5 text-lounge-slate-500" aria-hidden="true">·</span>
          <span className="text-white font-medium">{optimalSolution.evaluation.descriptionKo}</span>
        </div>
        <span className="text-lounge-slate-400">
          {showAllBoardCards ? '전체 16장이 앞면으로 표시 중' : '선택한 카드만 앞면 공개'}
        </span>
      </div>
    </div>
  );
};
