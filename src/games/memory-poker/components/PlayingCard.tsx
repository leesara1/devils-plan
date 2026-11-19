import React from 'react';
import { Card, RANK_LABEL, SUIT_SYMBOL } from '../engine/poker';
import { formatCompactBadgeName } from '../../playerProfiles';

interface PlayingCardProps {
  card: Card;
  coord?: string;
  faceUp: boolean;
  interactive?: boolean;
  dimmed?: boolean;
  isScoringHighlight?: boolean;
  isOptimalHint?: boolean;
  p1Token?: boolean;
  p2Token?: boolean;
  p1Label?: string;
  p2Label?: string;
  onClick?: () => void;
  size?: 'sm' | 'md' | 'lg';
}

export const PlayingCard: React.FC<PlayingCardProps> = ({
  card,
  coord,
  faceUp,
  interactive = false,
  dimmed = false,
  isScoringHighlight = false,
  isOptimalHint = false,
  p1Token = false,
  p2Token = false,
  p1Label = '나',
  p2Label = 'AI',
  onClick,
  size = 'lg',
}) => {
  const isRed = card.suit === 'H' || card.suit === 'D';
  const suitChar = SUIT_SYMBOL[card.suit];
  const rankStr = RANK_LABEL[card.rank];

  const hasToken = p1Token || p2Token;

  const cornerSize =
    size === 'sm'
      ? 'text-[11px] leading-none'
      : size === 'md'
        ? 'text-xs sm:text-sm leading-none'
        : 'text-xs sm:text-base leading-none';

  const centerSize =
    size === 'sm'
      ? 'text-lg'
      : size === 'md'
        ? 'text-2xl sm:text-3xl'
        : 'text-3xl sm:text-4xl';

  const WrapperTag = interactive ? 'button' : 'div';

  return (
    <WrapperTag
      type={interactive ? 'button' : undefined}
      onClick={interactive ? onClick : undefined}
      aria-label={
        coord
          ? `${coord} 위치 카드${faceUp ? ` ${rankStr} ${suitChar}` : ' (뒷면)'}${p1Token ? `, ${p1Label} 말 배치됨` : ''}${p2Token ? `, ${p2Label} 말 배치됨` : ''}`
          : faceUp
            ? `${rankStr} ${suitChar}`
            : '카드 뒷면'
      }
      className={[
        'group relative w-full h-full select-none card-perspective rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#f4f5f8] dark:focus-visible:ring-offset-obsidian-900',
        interactive ? 'cursor-pointer transition-transform duration-150 hover:-translate-y-0.5 active:scale-[0.98]' : '',
        dimmed ? 'opacity-40' : 'opacity-100',
      ].join(' ')}
    >
      <div className={`card-inner rounded-lg ${faceUp ? '' : 'is-flipped'}`}>
        {/* Card Front — Clean Crisp White / Off-White */}
        <div
          className={[
            'card-face rounded-lg bg-white dark:bg-[#faf9f6] border flex flex-col justify-between p-1.5 sm:p-2 overflow-hidden shadow-2xs',
            isScoringHighlight
              ? 'border-gold-500 dark:border-gold-400 ring-2 ring-gold-400'
              : hasToken
                ? 'border-gold-500 dark:border-gold-400 ring-2 ring-gold-400/80'
                : isOptimalHint
                  ? 'border-sky-500 dark:border-lounge-sky-400 ring-2 ring-sky-400/80'
                  : 'border-slate-300 dark:border-[#d6d3cb]',
          ].join(' ')}
        >
          {/* Top-left rank & suit */}
          <div
            className={`flex flex-col items-center self-start font-bold ${cornerSize} ${
              isRed ? 'text-[#dc2626]' : 'text-[#111827]'
            }`}
          >
            <span className="font-mono-tabular tracking-tight">{rankStr}</span>
            <span className="mt-0.5">{suitChar}</span>
          </div>

          {/* Center suit mark */}
          <div
            className={`flex items-center justify-center ${centerSize} ${
              isRed ? 'text-[#dc2626]' : 'text-[#111827]'
            }`}
          >
            <span aria-hidden="true">{suitChar}</span>
          </div>

          {/* Bottom-right inverted rank & suit */}
          <div
            className={`flex flex-col items-center self-end rotate-180 font-bold ${cornerSize} ${
              isRed ? 'text-[#dc2626]' : 'text-[#111827]'
            }`}
          >
            <span className="font-mono-tabular tracking-tight">{rankStr}</span>
            <span className="mt-0.5">{suitChar}</span>
          </div>

          {/* Coordinate marker */}
          {coord && (
            <span className="absolute top-1.5 right-1.5 font-mono-tabular text-[10px] font-semibold text-stone-400">
              {coord}
            </span>
          )}
        </div>

        {/* Card Back — Flat Minimalist Slate (Light & Dark) */}
        <div
          className={[
            'card-face card-face-back rounded-lg border flex items-center justify-center transition-colors',
            'bg-slate-200 dark:bg-[#232938]',
            p1Token
              ? 'border-gold-500 dark:border-gold-400 ring-2 ring-gold-400'
              : 'border-slate-300 group-hover:border-slate-400 dark:border-white/12 dark:group-hover:border-white/30',
          ].join(' ')}
        >
          {coord ? (
            <span className="font-mono-tabular text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 tracking-wide">
              {coord}
            </span>
          ) : (
            <span className="text-xs text-slate-500 dark:text-slate-400">♠</span>
          )}
        </div>
      </div>

      {/* Clean Flat Player Tokens */}
      {(p1Token || p2Token) && (
        <div className="pointer-events-none absolute -top-1.5 -right-1.5 z-20 flex items-center gap-1">
          {p1Token && (
            <div
              className="h-6 min-w-6 max-w-[54px] px-1.5 rounded-full bg-gold-400 text-gold-950 border border-white dark:border-obsidian-900 flex items-center justify-center font-mono-tabular text-[10px] font-bold truncate"
              title={`${p1Label} 선택 말`}
            >
              <span className="truncate">{formatCompactBadgeName(p1Label, 3)}</span>
            </div>
          )}
          {p2Token && (
            <div
              className="h-6 min-w-6 max-w-[54px] px-1.5 rounded bg-rival-500 text-white border border-white dark:border-obsidian-900 flex items-center justify-center font-mono-tabular text-[10px] font-bold truncate"
              title={`${p2Label} 선택 말`}
            >
              <span className="truncate">{formatCompactBadgeName(p2Label, 3)}</span>
            </div>
          )}
        </div>
      )}
    </WrapperTag>
  );
};
