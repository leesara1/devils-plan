import React from 'react';
import { formatCompactBadgeName } from '../../playerProfiles';
import {
  CHIP_META,
  ChipType,
  OVERFLOW_THRESHOLD,
  PEDESTAL_META,
  PedestalColor,
  RockCube,
  RockNumber,
  getPedestalSum,
} from '../engine/heavy13';

interface RockCardButtonProps {
  value: RockNumber;
  selected: boolean;
  available: boolean;
  disabled?: boolean;
  onClick: () => void;
}

export const RockCardButton: React.FC<RockCardButtonProps> = ({
  value,
  selected,
  available,
  disabled,
  onClick,
}) => {
  const isDisabled = !available || disabled;

  return (
    <button
      type="button"
      disabled={isDisabled}
      onClick={onClick}
      aria-pressed={selected}
      aria-label={`바위 카드 ${value}`}
      className={[
        'relative flex flex-col items-center justify-center sm:justify-between rounded-lg border px-0.5 py-2 sm:p-2.5 min-h-[58px] sm:min-h-[76px] transition-all duration-150 select-none',
        !available
          ? 'bg-slate-100 border-slate-200 text-slate-400 dark:bg-obsidian-900 dark:border-white/[0.05] dark:text-lounge-slate-500/35 cursor-not-allowed'
          : selected
            ? 'bg-gold-400 text-gold-950 border-gold-300 -translate-y-0.5 cursor-pointer'
            : 'bg-white border-slate-300 text-slate-900 hover:border-slate-400 dark:bg-obsidian-800 dark:border-white/10 dark:text-white dark:hover:border-white/30 hover:-translate-y-0.5 cursor-pointer',
      ].join(' ')}
    >
      <span className="hidden sm:inline text-[10px] font-medium opacity-70">
        바위
      </span>
      <span className="font-mono-tabular text-xl sm:text-2xl font-bold leading-none">
        {value}
      </span>
      <span
        className={[
          'text-[9px] sm:text-[10px] font-mono-tabular whitespace-nowrap mt-1 sm:mt-0',
          selected
            ? 'text-gold-950/80 font-semibold'
            : available
              ? 'theme-text-muted'
              : 'text-slate-400/70 dark:text-lounge-slate-500/30',
        ].join(' ')}
      >
        {available ? (
          <>
            <span className="hidden sm:inline">무게 {value}</span>
            <span className="sm:hidden">선택</span>
          </>
        ) : (
          <>
            <span className="hidden sm:inline">사용됨</span>
            <span className="sm:hidden">사용</span>
          </>
        )}
      </span>
    </button>
  );
};

interface ChipTokenButtonProps {
  chip: ChipType;
  count: number;
  selected: boolean;
  disabled?: boolean;
  onClick: () => void;
}

const CHIP_STYLE: Record<
  ChipType,
  { ring: string; emblemFill: string; labelColor: string }
> = {
  red: {
    ring: 'border-rose-600/80 dark:border-rival-400/75',
    emblemFill: 'var(--color-rival-500)',
    labelColor: 'theme-text-rival',
  },
  green: {
    ring: 'border-emerald-600/80 dark:border-emerald-400/75',
    emblemFill: '#10b981',
    labelColor: 'theme-text-emerald',
  },
  blue: {
    ring: 'border-sky-600/80 dark:border-lounge-sky-400/75',
    emblemFill: 'var(--color-lounge-sky-500)',
    labelColor: 'theme-text-sky',
  },
  rainbow: {
    ring: 'border-amber-600/85 dark:border-gold-400/85',
    emblemFill: 'var(--color-gold-400)',
    labelColor: 'theme-text-gold',
  },
};

export const ChipTokenButton: React.FC<ChipTokenButtonProps> = ({
  chip,
  count,
  selected,
  disabled,
  onClick,
}) => {
  const isAvailable = count > 0;
  const isDisabled = !isAvailable || disabled;
  const style = CHIP_STYLE[chip];
  const meta = CHIP_META[chip];

  return (
    <button
      type="button"
      disabled={isDisabled}
      onClick={onClick}
      aria-pressed={selected}
      aria-label={`${meta.labelKo} 남은 개수 ${count}개`}
      className={[
        'relative flex items-center justify-between gap-2 rounded-lg border px-2.5 sm:px-3 py-2 min-h-[48px] sm:min-h-[54px] transition-colors duration-150 select-none',
        !isAvailable
          ? 'bg-slate-100 border-slate-200 dark:bg-obsidian-900 dark:border-white/[0.05] opacity-40 cursor-not-allowed'
          : selected
            ? 'bg-amber-50/75 border-gold-500 ring-1 ring-gold-500 dark:bg-obsidian-800 dark:border-gold-400 dark:ring-gold-400 cursor-pointer'
            : 'bg-white border-slate-300 hover:border-slate-400 dark:bg-obsidian-800/70 dark:border-white/10 dark:hover:border-white/25 cursor-pointer',
      ].join(' ')}
    >
      <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
        <span
          className={[
            'w-7 h-7 rounded-full border-2 flex items-center justify-center shrink-0 bg-slate-100 dark:bg-obsidian-900',
            style.ring,
          ].join(' ')}
          aria-hidden="true"
        >
          {chip === 'rainbow' ? (
            <svg viewBox="0 0 24 24" className="w-3.5 h-3.5">
              <polygon points="12,2 22,12 12,22 2,12" fill="url(#rainbowPrism)" />
              <defs>
                <linearGradient id="rainbowPrism" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#fb7185" />
                  <stop offset="50%" stopColor="#34d399" />
                  <stop offset="100%" stopColor="#38bdf8" />
                </linearGradient>
              </defs>
            </svg>
          ) : (
            <span
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: style.emblemFill }}
            />
          )}
        </span>
        <div className="text-left min-w-0">
          <div className={`text-xs sm:text-sm font-bold whitespace-nowrap ${style.labelColor}`}>
            {meta.labelKo}
          </div>
          <div className="hidden sm:block text-[11px] theme-text-muted">
            {chip === 'rainbow' ? '우선 배치 · 색 선택' : '해당 색 받침대'}
          </div>
        </div>
      </div>

      <span className="font-mono-tabular text-xs font-bold theme-text-primary shrink-0">
        ×{count}
      </span>
    </button>
  );
};

export interface PedestalBurstEffect {
  id: string;
  color: PedestalColor;
  actorName: string;
  penaltyAdded: number;
  sumAfter: number;
  cubes: RockCube[];
}

export const ChipMiniEmblem: React.FC<{ chip: ChipType; size?: 'sm' | 'md' }> = ({
  chip,
  size = 'sm',
}) => {
  const style = CHIP_STYLE[chip];
  const boxClass = size === 'md' ? 'w-7 h-7' : 'w-5 h-5';
  const dotClass = size === 'md' ? 'w-3 h-3' : 'w-2.5 h-2.5';

  return (
    <span
      className={[
        boxClass,
        'rounded-full border-2 flex items-center justify-center shrink-0 bg-slate-100 dark:bg-obsidian-950',
        style.ring,
      ].join(' ')}
      aria-hidden="true"
    >
      {chip === 'rainbow' ? (
        <svg viewBox="0 0 24 24" className={size === 'md' ? 'w-3.5 h-3.5' : 'w-2.5 h-2.5'}>
          <polygon points="12,2 22,12 12,22 2,12" fill="url(#rainbowPrismMini)" />
          <defs>
            <linearGradient id="rainbowPrismMini" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#fb7185" />
              <stop offset="50%" stopColor="#34d399" />
              <stop offset="100%" stopColor="#38bdf8" />
            </linearGradient>
          </defs>
        </svg>
      ) : (
        <span
          className={`${dotClass} rounded-full`}
          style={{ backgroundColor: style.emblemFill }}
        />
      )}
    </span>
  );
};

interface RevealFlipCardProps {
  value?: RockNumber;
  flipped: boolean;
  isHighlighted?: boolean;
}

export const RevealFlipCard: React.FC<RevealFlipCardProps> = ({
  value,
  flipped,
  isHighlighted,
}) => {
  return (
    <div
      className="card-perspective w-8 h-10 sm:w-11 sm:h-14 shrink-0"
      aria-label={flipped && value !== undefined ? `공개된 바위 카드 ${value}` : '비공개 바위 카드'}
    >
      <div className={`card-inner ${flipped ? 'is-flipped' : ''}`}>
        {/* Front (Hidden) */}
        <div className="card-face rounded-md border border-slate-300 bg-slate-200 dark:border-white/12 dark:bg-obsidian-900 flex items-center justify-center">
          <span className="font-mono-tabular text-[11px] font-semibold theme-text-muted">
            ?
          </span>
        </div>

        {/* Back (Revealed) */}
        <div
          className={[
            'card-face card-face-back rounded-md border flex flex-col items-center justify-center',
            isHighlighted
              ? 'bg-gold-400 border-gold-300 text-gold-950'
              : 'bg-white border-slate-300 text-slate-900 dark:bg-obsidian-800 dark:border-white/20 dark:text-white',
          ].join(' ')}
        >
          <span
            className={[
              'text-[7px] sm:text-[8px] font-medium leading-none',
              isHighlighted ? 'text-gold-950/75' : 'theme-text-muted',
            ].join(' ')}
          >
            바위
          </span>
          <span className="font-mono-tabular text-sm sm:text-lg font-bold leading-tight mt-0.5">
            {value ?? '?'}
          </span>
        </div>
      </div>
    </div>
  );
};

interface PedestalStationProps {
  color: PedestalColor;
  cubes: RockCube[];
  isHighlightedTarget?: boolean;
  isSelectableTarget?: boolean;
  previewAddValue?: number | null;
  isMyTurnPreview?: boolean;
  newlyPlacedCubeId?: string | null;
  burstEffect?: PedestalBurstEffect | null;
  onSelectTarget?: () => void;
}

const PEDESTAL_BORDER_CLASS: Record<PedestalColor, string> = {
  red: 'border-slate-200 dark:border-white/10',
  green: 'border-slate-200 dark:border-white/10',
  blue: 'border-slate-200 dark:border-white/10',
};

const PEDESTAL_BAR_BG: Record<PedestalColor, string> = {
  red: 'bg-rose-500 dark:bg-rival-400',
  green: 'bg-emerald-500 dark:bg-emerald-400',
  blue: 'bg-sky-500 dark:bg-lounge-sky-400',
};

const PEDESTAL_TEXT_COLOR: Record<PedestalColor, string> = {
  red: 'theme-text-rival',
  green: 'theme-text-emerald',
  blue: 'theme-text-sky',
};

export const PedestalStation: React.FC<PedestalStationProps> = ({
  color,
  cubes,
  isHighlightedTarget,
  isSelectableTarget,
  previewAddValue,
  isMyTurnPreview,
  newlyPlacedCubeId,
  burstEffect,
  onSelectTarget,
}) => {
  const sum = getPedestalSum(cubes);
  const meta = PEDESTAL_META[color];
  const fillPercent = Math.min(100, (sum / OVERFLOW_THRESHOLD) * 100);
  const projectedSum =
    previewAddValue !== null && previewAddValue !== undefined
      ? sum + previewAddValue
      : null;
  const wouldOverflow = projectedSum !== null && projectedSum >= OVERFLOW_THRESHOLD;
  const isDangerZone = sum >= 9;
  const isBursting = burstEffect !== null && burstEffect !== undefined && burstEffect.color === color;

  const WrapperTag = isSelectableTarget ? 'button' : 'div';

  return (
    <WrapperTag
      {...(isSelectableTarget
        ? {
            type: 'button' as const,
            onClick: onSelectTarget,
          }
        : {})}
      className={[
        'relative rounded-xl border p-2.5 sm:p-4 flex flex-col justify-between gap-2.5 sm:gap-3 text-left transition-colors duration-150 overflow-visible bg-slate-50/70 dark:bg-obsidian-900',
        isBursting ? 'animate-pedestal-shake border-rose-500 dark:border-rival-400' : '',
        !isBursting && isSelectableTarget
          ? 'cursor-pointer hover:border-gold-500 dark:hover:border-gold-400 ring-1 ring-gold-500/40 dark:ring-gold-400/40'
          : '',
        !isBursting && isHighlightedTarget
          ? 'border-gold-500 dark:border-gold-400'
          : !isBursting
            ? PEDESTAL_BORDER_CLASS[color]
            : '',
      ].join(' ')}
    >
      {/* Top 2px Color Marker */}
      <span
        aria-hidden="true"
        className={`pointer-events-none absolute top-0 inset-x-3 h-[2px] rounded-full ${PEDESTAL_BAR_BG[color]}`}
      />

      {/* Overflow Penalty Floating Popup */}
      {isBursting && burstEffect && (
        <div
          key={burstEffect.id}
          className="pointer-events-none absolute -top-4 left-1/2 -translate-x-1/2 z-30 animate-penalty-popup"
        >
          <div className="px-2.5 sm:px-3.5 py-1 rounded-lg bg-rose-50 border border-rose-400 dark:bg-rival-950 dark:border-rival-400 whitespace-nowrap flex items-center gap-1.5">
            <span className="text-[11px] sm:text-sm font-bold theme-text-primary max-w-[78px] sm:max-w-none truncate">
              {burstEffect.actorName}
            </span>
            <span className="font-mono-tabular text-[11px] sm:text-sm font-bold theme-text-rival">
              +{burstEffect.penaltyAdded}
            </span>
          </div>
        </div>
      )}

      {/* Turn / Selection Forecast Banner */}
      {projectedSum !== null && (
        <div
          className={[
            'rounded-lg border px-2 sm:px-2.5 py-1 sm:py-1.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-0.5 sm:gap-2 text-[10px] sm:text-xs font-semibold leading-tight',
            wouldOverflow
              ? 'bg-rose-50 border-rose-300 text-rose-700 dark:bg-rival-950/90 dark:border-rival-400/60 dark:text-rival-400'
              : isMyTurnPreview
                ? 'bg-emerald-50 border-emerald-300 text-emerald-700 dark:bg-emerald-950/70 dark:border-emerald-400/50 dark:text-emerald-300'
                : 'bg-amber-50 border-amber-300 text-amber-800 dark:bg-obsidian-800 dark:border-gold-400/50 dark:text-gold-200',
          ].join(' ')}
        >
          <span className="font-mono-tabular whitespace-nowrap">
            <span className="hidden sm:inline">놓으면 합계 {projectedSum}</span>
            <span className="sm:hidden">합계 {projectedSum}</span>
          </span>
          <span className="whitespace-nowrap">
            → {wouldOverflow ? `폭발(+${cubes.length})` : '안전'}
          </span>
        </div>
      )}

      {/* Header & Weight Meter */}
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-1">
          <div className="flex items-center gap-1.5 min-w-0">
            <span
              className={`w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-sm shrink-0 ${PEDESTAL_BAR_BG[color]}`}
              aria-hidden="true"
            />
            <span className={`text-xs sm:text-sm font-bold whitespace-nowrap ${PEDESTAL_TEXT_COLOR[color]}`}>
              <span className="hidden sm:inline">{meta.labelKo}</span>
              <span className="sm:hidden">{meta.shortKo}</span>
            </span>
          </div>
          <span className="font-mono-tabular text-[10px] sm:text-xs theme-text-muted whitespace-nowrap">
            <span className="hidden sm:inline">큐브 </span>
            {cubes.length}개
          </span>
        </div>

        <div className="flex items-baseline justify-between gap-1">
          <div className="font-mono-tabular text-2xl sm:text-3xl font-bold theme-text-primary leading-none">
            {sum}
            <span className="text-[11px] sm:text-xs font-normal theme-text-faint ml-0.5 sm:ml-1">
              /{OVERFLOW_THRESHOLD}
            </span>
          </div>
          <span
            className={[
              'text-[10px] sm:text-xs font-semibold font-mono-tabular whitespace-nowrap',
              isBursting || isDangerZone ? 'theme-text-rival' : 'theme-text-muted',
            ].join(' ')}
          >
            {isBursting ? (
              <>
                <span className="hidden sm:inline">합계 {burstEffect?.sumAfter} · 수거 완료</span>
                <span className="sm:hidden">수거 완료</span>
              </>
            ) : isDangerZone ? (
              <>
                <span className="hidden sm:inline">주의 (여유 {OVERFLOW_THRESHOLD - 1 - sum})</span>
                <span className="sm:hidden">주의 {OVERFLOW_THRESHOLD - 1 - sum}</span>
              </>
            ) : (
              `여유 ${OVERFLOW_THRESHOLD - 1 - sum}`
            )}
          </span>
        </div>

        <div className="relative w-full h-1.5 rounded-full bg-slate-200 dark:bg-obsidian-950 overflow-hidden">
          <div
            className={[
              'h-full transition-[width] duration-200',
              sum >= 10 ? 'bg-rose-600 dark:bg-rival-500' : PEDESTAL_BAR_BG[color],
            ].join(' ')}
            style={{ width: `${fillPercent}%` }}
          />
        </div>
      </div>

      {/* Stacked Rock Cubes */}
      <div className="relative min-h-[58px] sm:min-h-[86px] rounded-lg bg-slate-100/90 border border-slate-200 dark:bg-obsidian-950/75 dark:border-white/[0.06] p-1.5 sm:p-2 flex flex-wrap content-start gap-1.5 overflow-visible">
        {isBursting && burstEffect ? (
          burstEffect.cubes.map((cube, idx) => (
            <div
              key={`${burstEffect.id}-${cube.id}`}
              className={`w-7 h-8 sm:w-9 sm:h-10 rounded bg-rose-50 border border-rose-400 dark:bg-rival-950 dark:border-rival-400/75 flex flex-col items-center justify-center animate-cube-burst-${idx % 4}`}
            >
              <span className="font-mono-tabular text-xs sm:text-sm font-bold theme-text-rival leading-none">
                {cube.value}
              </span>
              <span className="text-[7px] sm:text-[9px] text-rose-600 dark:text-rival-400/80 truncate max-w-[26px] sm:max-w-[32px] mt-0.5">
                수거
              </span>
            </div>
          ))
        ) : cubes.length === 0 ? (
          <div className="w-full h-[44px] sm:h-[64px] flex items-center justify-center text-[10px] sm:text-xs theme-text-faint text-center">
            <span className="hidden sm:inline">놓인 바위 큐브 없음</span>
            <span className="sm:hidden">비어 있음</span>
          </div>
        ) : (
          cubes.map((cube) => {
            const isJustDropped = newlyPlacedCubeId === cube.id;
            return (
              <div
                key={cube.id}
                title={`${cube.ownerName} · R${cube.roundPlaced}`}
                className={[
                  'relative w-7 h-8 sm:w-9 sm:h-10 rounded flex flex-col items-center justify-center bg-white dark:bg-obsidian-800',
                  isJustDropped
                    ? 'border-2 border-gold-500 dark:border-gold-400 animate-cube-drop'
                    : 'border border-slate-300 dark:border-white/15',
                ].join(' ')}
              >
                <span className="font-mono-tabular text-xs sm:text-sm font-bold theme-text-primary leading-none">
                  {cube.value}
                </span>
                <span className="text-[7px] sm:text-[9px] theme-text-muted truncate max-w-[30px] sm:max-w-[38px] mt-0.5">
                  {formatCompactBadgeName(cube.ownerName, 4)}
                </span>
              </div>
            );
          })
        )}
      </div>

      {isSelectableTarget && (
        <div
          className={[
            'text-center text-[11px] sm:text-xs font-bold py-1.5 px-1 rounded-lg border min-h-[36px] flex items-center justify-center',
            wouldOverflow
              ? 'bg-rose-50 border-rose-300 text-rose-700 dark:bg-rival-950/75 dark:border-rival-400/60 dark:text-rival-400'
              : 'bg-amber-50 border-amber-400 text-amber-800 dark:bg-gold-400/15 dark:border-gold-400/60 dark:text-gold-300',
          ].join(' ')}
        >
          <span className="hidden sm:inline">
            이 받침대에 배치 ({wouldOverflow ? `벌점 ${cubes.length}점` : `합계 ${projectedSum}`})
          </span>
          <span className="sm:hidden">
            배치 ({wouldOverflow ? `+${cubes.length}` : projectedSum})
          </span>
        </div>
      )}
    </WrapperTag>
  );
};
