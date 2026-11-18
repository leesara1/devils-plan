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
        : 'text-3xl sm:text-4xl';

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
        'group relative w-full h-full select-none card-perspective rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400 focus-visible:ring-offset-2 focus-visible:ring-offset-obsidian-900',
        interactive ? 'cursor-pointer transition-transform duration-150 hover:-translate-y-0.5 active:scale-[0.98]' : '',
        dimmed ? 'opacity-40' : 'opacity-100',
      ].join(' ')}
    >
      <div className={`card-inner rounded-lg ${faceUp ? '' : 'is-flipped'}`}>
        {/* Card Front — Clean Crisp Off-White */}
        <div
          className={[
            'card-face rounded-lg bg-[#faf9f6] border flex flex-col justify-between p-1.5 sm:p-2 overflow-hidden',
            isScoringHighlight
              ? 'border-gold-400 ring-2 ring-gold-400'
              : hasToken
                ? 'border-gold-400 ring-2 ring-gold-400/80'
                : isOptimalHint
                  ? 'border-lounge-sky-400 ring-2 ring-lounge-sky-400/80'
                  : 'border-[#d6d3cb]',
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

        {/* Card Back — Flat Minimalist Slate */}
        <div
          className={[
            'card-face card-face-back rounded-lg border bg-[#1a1e28] flex items-center justify-center',
            p1Token
              ? 'border-gold-400 ring-2 ring-gold-400'
              : 'border-white/12 group-hover:border-white/30',
          ].join(' ')}
        >
          {coord ? (
            <span className="font-mono-tabular text-xs sm:text-sm font-semibold text-lounge-slate-300 tracking-wide">
              {coord}
            </span>
          ) : (
            <span className="text-xs text-lounge-slate-500">♠</span>
          )}
        </div>
      </div>

      {/* Clean Flat Player Tokens */}
      {(p1Token || p2Token) && (
        <div className="pointer-events-none absolute -top-1.5 -right-1.5 z-20 flex items-center gap-1">
          {p1Token && (
            <div
              className="h-6 min-w-6 px-1.5 rounded-full bg-gold-400 text-gold-950 border border-obsidian-900 flex items-center justify-center font-mono-tabular text-[10px] font-bold"
              title="플레이어 1 선택 말"
            >
              P1
            </div>
          )}
          {p2Token && (
            <div
              className="h-6 min-w-6 px-1.5 rounded bg-rival-500 text-white border border-obsidian-900 flex items-center justify-center font-mono-tabular text-[10px] font-bold"
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
