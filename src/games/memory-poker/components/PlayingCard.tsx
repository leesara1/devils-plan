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
        'group relative w-full h-full select-none card-perspective rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e5c158] focus-visible:ring-offset-2 focus-visible:ring-offset-[#090a0f]',
        interactive ? 'cursor-pointer transition-transform duration-150 hover:-translate-y-0.5 active:scale-[0.98]' : '',
        dimmed ? 'opacity-40' : 'opacity-100',
      ].join(' ')}
    >
      <div className={`card-inner rounded-xl ${faceUp ? '' : 'is-flipped'}`}>
        {/* Card Front */}
        <div
          className={[
            'card-face rounded-xl bg-[#faf7f0] border shadow-[0_8px_20px_rgba(0,0,0,0.48)] flex flex-col justify-between p-1.5 sm:p-2 overflow-hidden',
            isScoringHighlight
              ? 'border-[#e5c158] ring-2 ring-[#e5c158]'
              : hasToken
                ? 'border-[#d4af37] ring-2 ring-[#d4af37]/80'
                : isOptimalHint
                  ? 'border-sky-400 ring-2 ring-sky-400/80'
                  : 'border-[#ddd6c4]',
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

          {/* Coordinate marker */}
          {coord && (
            <span className="absolute top-1.5 right-1.5 font-mono-tabular text-[10px] font-semibold text-stone-400">
              {coord}
            </span>
          )}
        </div>

        {/* Card Back — Obsidian & Brushed Gold Geometric Inlay */}
        <div
          className={[
            'card-face card-face-back rounded-xl border shadow-[0_8px_20px_rgba(0,0,0,0.48)] overflow-hidden flex items-center justify-center',
            'bg-[#10131c]',
            p1Token
              ? 'border-[#e5c158] ring-2 ring-[#e5c158]'
              : 'border-[#2b3040] group-hover:border-[#d4af37]/65',
          ].join(' ')}
        >
          <svg
            aria-hidden="true"
            className="absolute inset-1.5 w-[calc(100%-0.75rem)] h-[calc(100%-0.75rem)] rounded-lg opacity-85"
            viewBox="0 0 100 140"
            preserveAspectRatio="none"
          >
            <defs>
              <pattern id={`obsidian-grid-${card.id}`} width="20" height="20" patternUnits="userSpaceOnUse">
                <path d="M 10 0 L 20 10 L 10 20 L 0 10 Z" fill="none" stroke="#d4af37" strokeWidth="0.7" strokeOpacity="0.28" />
                <line x1="0" y1="10" x2="20" y2="10" stroke="#94a3b8" strokeWidth="0.35" strokeOpacity="0.16" />
              </pattern>
            </defs>
            <rect x="2" y="2" width="96" height="136" rx="6" fill={`url(#obsidian-grid-${card.id})`} stroke="#d4af37" strokeWidth="1.2" strokeOpacity="0.45" />
            <rect x="7" y="7" width="86" height="126" rx="4" fill="none" stroke="#d4af37" strokeWidth="0.6" strokeOpacity="0.3" />
          </svg>

          {coord ? (
            <div className="relative z-10 flex flex-col items-center justify-center px-2.5 py-1 rounded-md bg-[#090b10]/92 border border-[#d4af37]/40">
              <span className="font-mono-tabular text-xs sm:text-sm font-bold text-[#f3e2a6] tracking-wider">
                {coord}
              </span>
            </div>
          ) : (
            <div className="relative z-10 w-7 h-7 rotate-45 border border-[#d4af37]/50 bg-[#090b10]/90 flex items-center justify-center">
              <span className="-rotate-45 text-[10px] text-[#e5c158]">♠</span>
            </div>
          )}
        </div>
      </div>

      {/* Golden Piece (P1) & Crimson Piece (AI/P2) Tokens */}
      {(p1Token || p2Token) && (
        <div className="pointer-events-none absolute -top-2 -right-2 z-20 flex items-center gap-1">
          {p1Token && (
            <div
              className="h-7 min-w-7 px-1.5 rounded-full bg-[#e5c158] text-[#141004] border-2 border-[#fff9e6] shadow-[0_3px_10px_rgba(0,0,0,0.65)] flex items-center justify-center font-mono-tabular text-[11px] font-bold tracking-tight"
              title="플레이어 1 선택 말"
            >
              P1
            </div>
          )}
          {p2Token && (
            <div
              className="h-7 min-w-7 px-1.5 rounded-md bg-rose-600 text-white border-2 border-rose-100 shadow-[0_3px_10px_rgba(0,0,0,0.65)] flex items-center justify-center font-mono-tabular text-[11px] font-bold tracking-tight"
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
