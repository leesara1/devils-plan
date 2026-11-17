import React from 'react';
import { Card, RANK_LABEL, SUIT_SYMBOL } from '../engine/poker';

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
        : 'text-2xl sm:text-4xl';

  const WrapperTag = interactive ? 'button' : 'div';

  return (
    <WrapperTag
      type={interactive ? 'button' : undefined}
      onClick={interactive ? onClick : undefined}
      aria-label={
        coord
          ? `${coord} 위치 카드${faceUp ? ` ${rankStr} ${suitChar}` : ' (뒷면)'}${p1Token ? ', P1 말 배치됨' : ''}${p2Token ? `, ${p2Label} 말 배치됨` : ''}`
          : faceUp
            ? `${rankStr} ${suitChar}`
            : '카드 뒷면'
      }
      className={[
        'group relative w-full h-full select-none card-perspective rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a2b1d]',
        interactive ? 'cursor-pointer transition-transform duration-150 hover:-translate-y-0.5 active:scale-[0.98]' : '',
        dimmed ? 'opacity-45' : 'opacity-100',
      ].join(' ')}
    >
      <div className={`card-inner rounded-xl ${faceUp ? '' : 'is-flipped'}`}>
        {/* Card Front */}
        <div
          className={[
            'card-face rounded-xl bg-[#faf8f2] border shadow-[0_6px_16px_rgba(0,0,0,0.38)] flex flex-col justify-between p-1.5 sm:p-2 overflow-hidden',
            isScoringHighlight
              ? 'border-amber-400 ring-2 ring-amber-400/90'
              : hasToken
                ? 'border-amber-300 ring-2 ring-amber-300/75'
                : isOptimalHint
                  ? 'border-emerald-400 ring-2 ring-emerald-400/75'
                  : 'border-[#e4dfd2]',
          ].join(' ')}
        >
          {/* Top-left rank & suit */}
          <div className={`flex flex-col items-center self-start font-bold ${cornerSize} ${isRed ? 'text-[#c81e1e]' : 'text-[#111827]'}`}>
            <span className="font-mono-tabular tracking-tight">{rankStr}</span>
            <span className="mt-0.5">{suitChar}</span>
          </div>

          {/* Center pip / court mark */}
          <div className={`flex items-center justify-center ${centerSize} ${isRed ? 'text-[#c81e1e]' : 'text-[#111827]'}`}>
            {card.rank >= 11 && card.rank <= 13 ? (
              <div className="flex flex-col items-center justify-center border border-current/20 rounded-md px-2 py-0.5 bg-current/[0.03]">
                <span className="font-display font-bold leading-none">{rankStr}</span>
                <span className="text-[10px] sm:text-xs leading-none mt-0.5">{suitChar}</span>
              </div>
            ) : (
              <span aria-hidden="true">{suitChar}</span>
            )}
          </div>

          {/* Bottom-right inverted rank & suit */}
          <div className={`flex flex-col items-center self-end rotate-180 font-bold ${cornerSize} ${isRed ? 'text-[#c81e1e]' : 'text-[#111827]'}`}>
            <span className="font-mono-tabular tracking-tight">{rankStr}</span>
            <span className="mt-0.5">{suitChar}</span>
          </div>

          {/* Coordinate marker on front during showdown/memorize */}
          {coord && (
            <span className="absolute top-1.5 right-1.5 font-mono-tabular text-[10px] font-semibold text-stone-400">
              {coord}
            </span>
          )}
        </div>

        {/* Card Back (for personal board hidden state) */}
        <div
          className={[
            'card-face card-face-back rounded-xl border shadow-[0_6px_16px_rgba(0,0,0,0.38)] overflow-hidden flex items-center justify-center',
            'bg-[#10263b]',
            p1Token
              ? 'border-amber-400 ring-2 ring-amber-400/90'
              : 'border-[#264666] group-hover:border-amber-300/60',
          ].join(' ')}
        >
          {/* Geometric SVG pattern */}
          <svg
            aria-hidden="true"
            className="absolute inset-1.5 w-[calc(100%-0.75rem)] h-[calc(100%-0.75rem)] rounded-lg opacity-80"
            viewBox="0 0 100 140"
            preserveAspectRatio="none"
          >
            <defs>
              <pattern id={`back-grid-${card.id}`} width="16" height="16" patternUnits="userSpaceOnUse">
                <path d="M 8 0 L 16 8 L 8 16 L 0 8 Z" fill="none" stroke="#c9a45c" strokeWidth="0.8" strokeOpacity="0.32" />
              </pattern>
            </defs>
            <rect x="2" y="2" width="96" height="136" rx="6" fill={`url(#back-grid-${card.id})`} stroke="#c9a45c" strokeWidth="1.5" strokeOpacity="0.45" />
            <rect x="7" y="7" width="86" height="126" rx="4" fill="none" stroke="#c9a45c" strokeWidth="0.7" strokeOpacity="0.35" />
          </svg>

          {coord ? (
            <div className="relative z-10 flex flex-col items-center justify-center px-2 py-1 rounded-md bg-[#0b1b2b]/90 border border-amber-300/30">
              <span className="font-mono-tabular text-xs sm:text-sm font-bold text-amber-100 tracking-wider">
                {coord}
              </span>
            </div>
          ) : (
            <div className="relative z-10 w-6 h-6 rounded-full border border-amber-300/40 bg-[#0b1b2b]/80 flex items-center justify-center text-[10px] text-amber-200/80">
              ♠
            </div>
          )}
        </div>
      </div>

      {/* Tactile Player Token Pieces ("말") placed on the personal board */}
      {(p1Token || p2Token) && (
        <div className="pointer-events-none absolute -top-2 -right-2 z-20 flex items-center gap-1">
          {p1Token && (
            <div
              className="h-7 min-w-7 px-1.5 rounded-full bg-amber-400 text-[#1c1404] border-2 border-[#fffbeb] shadow-[0_3px_10px_rgba(0,0,0,0.55)] flex items-center justify-center font-mono-tabular text-[11px] font-bold tracking-tight"
              title="플레이어 1 선택 말"
            >
              P1
            </div>
          )}
          {p2Token && (
            <div
              className="h-7 min-w-7 px-1.5 rounded-md bg-rose-500 text-white border-2 border-rose-100 shadow-[0_3px_10px_rgba(0,0,0,0.55)] flex items-center justify-center font-mono-tabular text-[11px] font-bold tracking-tight"
              title={`${p2Label} 선택 말`}
            >
              {p2Label}
            </div>
          )}
        </div>
      )}
    </WrapperTag>
  );
};
