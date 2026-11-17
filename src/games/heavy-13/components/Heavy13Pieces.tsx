import React from 'react';
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
        'relative flex flex-col items-center justify-center sm:justify-between rounded-xl border px-0.5 py-2 sm:p-2.5 min-h-[58px] sm:min-h-[76px] transition-all duration-150 select-none',
        !available
          ? 'bg-obsidian-950/60 border-lounge-slate-800/70 text-lounge-slate-500/45 cursor-not-allowed'
          : selected
            ? 'bg-gold-400 text-gold-950 border-gold-200 -translate-y-1 shadow-[0_8px_20px_rgba(229,193,88,0.28)] cursor-pointer'
            : 'bg-obsidian-850 border-lounge-slate-700 text-gold-100 hover:border-gold-400/70 hover:-translate-y-0.5 cursor-pointer',
      ].join(' ')}
    >
      <span className="hidden sm:inline text-[10px] font-semibold opacity-75">바위</span>
      <span className="font-mono-tabular text-xl sm:text-2xl font-bold leading-none">
        {value}
      </span>
      <span
        className={[
          'text-[9px] sm:text-[10px] font-mono-tabular whitespace-nowrap mt-1 sm:mt-0',
          selected
            ? 'text-gold-950/80'
            : available
              ? 'text-lounge-slate-400'
              : 'text-lounge-slate-500/40',
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
    ring: 'border-rival-400/75',
    emblemFill: 'var(--color-rival-400)',
    labelColor: 'text-rival-400',
  },
  green: {
    ring: 'border-emerald-400/75',
    emblemFill: '#34d399',
    labelColor: 'text-emerald-300',
  },
  blue: {
    ring: 'border-lounge-sky-400/75',
    emblemFill: 'var(--color-lounge-sky-400)',
    labelColor: 'text-lounge-sky-300',
  },
  rainbow: {
    ring: 'border-gold-400/85',
    emblemFill: 'var(--color-gold-400)',
    labelColor: 'text-gold-200',
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
        'relative flex items-center justify-between gap-2 rounded-xl border px-2.5 sm:px-3 py-2 sm:py-2.5 min-h-[48px] sm:min-h-[54px] transition-all duration-150 select-none',
        !isAvailable
          ? 'bg-obsidian-950/60 border-lounge-slate-800/70 opacity-40 cursor-not-allowed'
          : selected
            ? 'bg-obsidian-800 border-gold-300 ring-2 ring-gold-400/70 -translate-y-0.5 cursor-pointer'
            : 'bg-obsidian-850 border-lounge-slate-700 hover:border-gold-500/70 cursor-pointer',
      ].join(' ')}
    >
      <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
        <span
          className={[
            'w-7 h-7 sm:w-8 sm:h-8 rounded-full border-2 flex items-center justify-center shrink-0 bg-obsidian-900',
            style.ring,
          ].join(' ')}
          aria-hidden="true"
        >
          {chip === 'rainbow' ? (
            <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 sm:w-4 sm:h-4">
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
              className="w-3 h-3 sm:w-3.5 sm:h-3.5 rounded-full"
              style={{ backgroundColor: style.emblemFill }}
            />
          )}
        </span>
        <div className="text-left min-w-0">
          <div className={`text-xs sm:text-sm font-bold whitespace-nowrap ${style.labelColor}`}>
            {meta.labelKo}
          </div>
          <div className="hidden sm:block text-[11px] text-lounge-slate-400">
            {chip === 'rainbow' ? '우선 배치 · 색 선택' : '해당 색 받침대'}
          </div>
        </div>
      </div>

      <span className="font-mono-tabular text-xs font-bold text-gold-100 shrink-0">
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
        'rounded-full border-2 flex items-center justify-center shrink-0 bg-obsidian-950',
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
    <div className="card-perspective w-8 h-10 sm:w-11 sm:h-14 shrink-0" aria-label={flipped && value !== undefined ? `공개된 바위 카드 ${value}` : '비공개 바위 카드'}>
      <div className={`card-inner ${flipped ? 'is-flipped' : ''}`}>
        {/* Front (Hidden) */}
        <div className="card-face rounded-md sm:rounded-lg border border-lounge-slate-700 bg-obsidian-950 flex flex-col items-center justify-center shadow-inner">
          <div className="w-4 h-4 sm:w-5 sm:h-5 rounded border border-gold-500/35 rotate-45 flex items-center justify-center">
            <span className="-rotate-45 font-mono-tabular text-[10px] sm:text-[11px] font-bold text-gold-300/80">
              ?
            </span>
          </div>
        </div>

        {/* Back (Revealed) */}
        <div
          className={[
            'card-face card-face-back rounded-md sm:rounded-lg border flex flex-col items-center justify-center shadow-md',
            isHighlighted
              ? 'bg-gold-400 border-gold-200 text-gold-950'
              : 'bg-obsidian-800 border-gold-400/75 text-gold-100',
          ].join(' ')}
        >
          <span
            className={[
              'text-[7px] sm:text-[8px] font-semibold leading-none',
              isHighlighted ? 'text-gold-950/75' : 'text-lounge-slate-400',
            ].join(' ')}
          >
            바위
          </span>
          <span className="font-mono-tabular text-sm sm:text-lg font-extrabold leading-tight mt-0.5">
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
  red: 'border-rival-400/50',
  green: 'border-emerald-400/50',
  blue: 'border-lounge-sky-400/50',
};

const PEDESTAL_BAR_BG: Record<PedestalColor, string> = {
  red: 'bg-rival-400',
  green: 'bg-emerald-400',
  blue: 'bg-lounge-sky-400',
};

const PEDESTAL_TEXT_COLOR: Record<PedestalColor, string> = {
  red: 'text-rival-400',
  green: 'text-emerald-300',
  blue: 'text-lounge-sky-300',
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
        'relative rounded-xl sm:rounded-2xl border p-2 sm:p-4 flex flex-col justify-between gap-2 sm:gap-3 text-left transition-all duration-150',
        'bg-obsidian-850/95',
        isBursting ? 'animate-pedestal-shake border-rival-400 shadow-[0_0_30px_rgba(251,113,133,0.35)]' : '',
        !isBursting && isSelectableTarget
          ? 'cursor-pointer hover:-translate-y-0.5 hover:border-gold-300 ring-1 ring-gold-400/50'
          : '',
        !isBursting && isHighlightedTarget
          ? 'border-gold-400 shadow-[0_0_24px_rgba(229,193,88,0.2)]'
          : !isBursting
            ? PEDESTAL_BORDER_CLASS[color]
            : '',
      ].join(' ')}
    >
      {/* Overflow Penalty Floating Popup */}
      {isBursting && burstEffect && (
        <div
          key={burstEffect.id}
          className="pointer-events-none absolute -top-4 left-1/2 -translate-x-1/2 z-30 animate-penalty-popup"
        >
          <div className="px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-xl bg-rival-950 border-2 border-rival-400 shadow-[0_10px_28px_rgba(225,29,72,0.5)] whitespace-nowrap flex items-center gap-1.5 sm:gap-2">
            <span className="text-[11px] sm:text-sm font-extrabold text-white max-w-[78px] sm:max-w-none truncate">
              {burstEffect.actorName}
            </span>
            <span className="font-mono-tabular text-[11px] sm:text-sm font-extrabold text-rival-400">
              +{burstEffect.penaltyAdded}
            </span>
          </div>
        </div>
      )}

      {/* Prominent Turn / Selection Forecast Banner on Top of Pedestal */}
      {projectedSum !== null && (
        <div
          className={[
            'rounded-lg sm:rounded-xl border px-1.5 sm:px-3 py-1 sm:py-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-0.5 sm:gap-2 text-[10px] sm:text-xs font-bold leading-tight',
            wouldOverflow
              ? 'bg-rival-950/85 border-rival-400/75 text-rival-400'
              : isMyTurnPreview
                ? 'bg-emerald-950/75 border-emerald-400/70 text-emerald-300'
                : 'bg-gold-950/80 border-gold-400/60 text-gold-200',
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

      {/* Top Color Strip */}
      <div className="space-y-1.5 sm:space-y-2">
        <div className="flex items-center justify-between gap-1">
          <div className="flex items-center gap-1.5 min-w-0">
            <span
              className={`w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-sm shrink-0 ${PEDESTAL_BAR_BG[color]}`}
              aria-hidden="true"
            />
            <span className={`text-xs sm:text-sm font-bold whitespace-nowrap ${PEDESTAL_TEXT_COLOR[color]}`}>
              <span className="hidden sm:inline">{meta.labelKo}</span>
              <span className="sm:hidden">{meta.shortKo}</span>
            </span>
          </div>
          <span className="font-mono-tabular text-[10px] sm:text-xs text-lounge-slate-400 whitespace-nowrap">
            <span className="hidden sm:inline">큐브 </span>
            {cubes.length}개
          </span>
        </div>

        {/* Weight Meter toward 13 */}
        <div className="flex items-baseline justify-between gap-1">
          <div className="font-mono-tabular text-xl sm:text-3xl font-bold text-white leading-none">
            {sum}
            <span className="text-[10px] sm:text-xs font-normal text-lounge-slate-400 ml-0.5 sm:ml-1">
              /{OVERFLOW_THRESHOLD}
            </span>
          </div>
          <span
            className={[
              'text-[10px] sm:text-xs font-semibold font-mono-tabular whitespace-nowrap',
              isBursting
                ? 'text-rival-400'
                : isDangerZone
                  ? 'text-rival-400'
                  : 'text-lounge-slate-400',
            ].join(' ')}
          >
            {isBursting ? (
              <>
                <span className="hidden sm:inline">합계 {burstEffect?.sumAfter} · 수거 완료</span>
                <span className="sm:hidden">수거 완료</span>
              </>
            ) : isDangerZone ? (
              <>
                <span className="hidden sm:inline">폭발 주의 (여유 {OVERFLOW_THRESHOLD - 1 - sum})</span>
                <span className="sm:hidden">주의 {OVERFLOW_THRESHOLD - 1 - sum}</span>
              </>
            ) : (
              `여유 ${OVERFLOW_THRESHOLD - 1 - sum}`
            )}
          </span>
        </div>

        <div className="w-full h-1.5 sm:h-2 rounded-full bg-obsidian-950 overflow-hidden border border-white/5">
          <div
            className={[
              'h-full transition-[width] duration-200',
              sum >= 10 ? 'bg-rival-500' : PEDESTAL_BAR_BG[color],
            ].join(' ')}
            style={{ width: `${fillPercent}%` }}
          />
        </div>
      </div>

      {/* Stacked Rock Cubes (with Drop & Burst Fly-Away Staging) */}
      <div className="relative min-h-[56px] sm:min-h-[84px] rounded-lg sm:rounded-xl bg-obsidian-950/75 border border-lounge-slate-800 p-1.5 sm:p-2.5 flex flex-wrap content-start gap-1 sm:gap-2 overflow-visible">
        {isBursting && burstEffect ? (
          burstEffect.cubes.map((cube, idx) => (
            <div
              key={`${burstEffect.id}-${cube.id}`}
              className={`w-7 h-8 sm:w-10 sm:h-11 rounded-md sm:rounded-lg bg-rival-950 border border-rival-400/80 flex flex-col items-center justify-center shadow-md animate-cube-burst-${idx % 4}`}
            >
              <span className="font-mono-tabular text-xs sm:text-base font-bold text-rival-400 leading-none">
                {cube.value}
              </span>
              <span className="text-[7px] sm:text-[9px] text-rival-400/80 truncate max-w-[26px] sm:max-w-[34px] mt-0.5">
                수거
              </span>
            </div>
          ))
        ) : cubes.length === 0 ? (
          <div className="w-full h-[42px] sm:h-[60px] flex items-center justify-center text-[10px] sm:text-xs text-lounge-slate-500 text-center">
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
                  'w-7 h-8 sm:w-10 sm:h-11 rounded-md sm:rounded-lg flex flex-col items-center justify-center shadow-sm',
                  isJustDropped
                    ? 'bg-obsidian-800 border-2 border-gold-300 shadow-[0_0_14px_rgba(229,193,88,0.35)] animate-cube-drop'
                    : 'bg-obsidian-800 border border-gold-500/40',
                ].join(' ')}
              >
                <span className="font-mono-tabular text-xs sm:text-base font-bold text-gold-100 leading-none">
                  {cube.value}
                </span>
                <span className="text-[7px] sm:text-[9px] text-lounge-slate-400 truncate max-w-[26px] sm:max-w-[34px] mt-0.5">
                  {cube.ownerName.replace(' AI', '').replace('플레이어 ', 'P').replace('나 (P1)', 'P1')}
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
              ? 'bg-rival-950/70 border-rival-400/60 text-rival-400'
              : 'bg-gold-400/15 border-gold-400/60 text-gold-200',
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
