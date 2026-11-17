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
        'relative flex flex-col items-center justify-between rounded-xl border p-2.5 min-h-[76px] transition-all duration-150 select-none',
        !available
          ? 'bg-obsidian-950/60 border-lounge-slate-800/70 text-lounge-slate-500/45 cursor-not-allowed'
          : selected
            ? 'bg-gold-400 text-gold-950 border-gold-200 -translate-y-1 shadow-[0_8px_20px_rgba(229,193,88,0.28)] cursor-pointer'
            : 'bg-obsidian-850 border-lounge-slate-700 text-gold-100 hover:border-gold-400/70 hover:-translate-y-0.5 cursor-pointer',
      ].join(' ')}
    >
      <span className="text-[10px] font-semibold opacity-75">바위</span>
      <span className="font-mono-tabular text-2xl font-bold leading-none">
        {value}
      </span>
      <span
        className={[
          'text-[10px] font-mono-tabular',
          selected ? 'text-gold-950/80' : available ? 'text-lounge-slate-400' : 'text-lounge-slate-500/40',
        ].join(' ')}
      >
        {available ? `무게 ${value}` : '사용됨'}
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
        'relative flex items-center justify-between gap-2.5 rounded-xl border px-3 py-2.5 min-h-[54px] transition-all duration-150 select-none',
        !isAvailable
          ? 'bg-obsidian-950/60 border-lounge-slate-800/70 opacity-40 cursor-not-allowed'
          : selected
            ? 'bg-obsidian-800 border-gold-300 ring-2 ring-gold-400/70 -translate-y-0.5 cursor-pointer'
            : 'bg-obsidian-850 border-lounge-slate-700 hover:border-gold-500/70 cursor-pointer',
      ].join(' ')}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <span
          className={[
            'w-8 h-8 rounded-full border-2 flex items-center justify-center shrink-0 bg-obsidian-900',
            style.ring,
          ].join(' ')}
          aria-hidden="true"
        >
          {chip === 'rainbow' ? (
            <svg viewBox="0 0 24 24" className="w-4 h-4">
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
              className="w-3.5 h-3.5 rounded-full"
              style={{ backgroundColor: style.emblemFill }}
            />
          )}
        </span>
        <div className="text-left min-w-0">
          <div className={`text-xs sm:text-sm font-bold whitespace-nowrap ${style.labelColor}`}>
            {meta.labelKo}
          </div>
          <div className="text-[11px] text-lounge-slate-400">
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

interface PedestalStationProps {
  color: PedestalColor;
  cubes: RockCube[];
  isHighlightedTarget?: boolean;
  isSelectableTarget?: boolean;
  previewAddValue?: number | null;
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
  onSelectTarget,
}) => {
  const sum = getPedestalSum(cubes);
  const meta = PEDESTAL_META[color];
  const fillPercent = Math.min(100, (sum / OVERFLOW_THRESHOLD) * 100);
  const projectedSum = previewAddValue !== null && previewAddValue !== undefined ? sum + previewAddValue : null;
  const wouldOverflow = projectedSum !== null && projectedSum >= OVERFLOW_THRESHOLD;
  const isDangerZone = sum >= 9;

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
        'relative rounded-2xl border p-4 flex flex-col justify-between gap-3.5 text-left transition-all duration-150',
        'bg-obsidian-850/95',
        isSelectableTarget
          ? 'cursor-pointer hover:-translate-y-0.5 hover:border-gold-300 ring-1 ring-gold-400/50'
          : '',
        isHighlightedTarget
          ? 'border-gold-400 shadow-[0_0_24px_rgba(229,193,88,0.2)]'
          : PEDESTAL_BORDER_CLASS[color],
      ].join(' ')}
    >
      {/* Top Color Strip */}
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span
              className={`w-3 h-3 rounded-sm shrink-0 ${PEDESTAL_BAR_BG[color]}`}
              aria-hidden="true"
            />
            <span className={`text-sm font-bold ${PEDESTAL_TEXT_COLOR[color]}`}>
              {meta.labelKo}
            </span>
          </div>
          <span className="font-mono-tabular text-xs text-lounge-slate-400">
            큐브 {cubes.length}개
          </span>
        </div>

        {/* Weight Meter toward 13 */}
        <div className="flex items-baseline justify-between gap-2">
          <div className="font-mono-tabular text-2xl sm:text-3xl font-bold text-white">
            {sum}
            <span className="text-xs font-normal text-lounge-slate-400 ml-1">
              / {OVERFLOW_THRESHOLD}
            </span>
          </div>
          <span
            className={[
              'text-xs font-semibold font-mono-tabular',
              projectedSum !== null
                ? wouldOverflow
                  ? 'text-rival-400'
                  : 'text-gold-200'
                : isDangerZone
                  ? 'text-rival-400'
                  : 'text-lounge-slate-400',
            ].join(' ')}
          >
            {projectedSum !== null
              ? wouldOverflow
                ? `예상 ${projectedSum} · 폭발 (+${cubes.length}벌점)`
                : `예상 ${projectedSum} · 안전`
              : isDangerZone
                ? `폭발 주의 (여유 ${OVERFLOW_THRESHOLD - 1 - sum})`
                : `여유 ${OVERFLOW_THRESHOLD - 1 - sum}`}
          </span>
        </div>

        <div className="w-full h-2 rounded-full bg-obsidian-950 overflow-hidden border border-white/5">
          <div
            className={[
              'h-full transition-[width] duration-200',
              sum >= 10 ? 'bg-rival-500' : PEDESTAL_BAR_BG[color],
            ].join(' ')}
            style={{ width: `${fillPercent}%` }}
          />
        </div>
      </div>

      {/* Stacked Rock Cubes */}
      <div className="min-h-[82px] rounded-xl bg-obsidian-950/75 border border-lounge-slate-800 p-2.5 flex flex-wrap content-start gap-2">
        {cubes.length === 0 ? (
          <div className="w-full h-[60px] flex items-center justify-center text-xs text-lounge-slate-500">
            놓인 바위 큐브 없음
          </div>
        ) : (
          cubes.map((cube) => (
            <div
              key={cube.id}
              title={`${cube.ownerName} · R${cube.roundPlaced}`}
              className="w-10 h-11 rounded-lg bg-obsidian-800 border border-gold-500/40 flex flex-col items-center justify-center shadow-sm"
            >
              <span className="font-mono-tabular text-base font-bold text-gold-100 leading-none">
                {cube.value}
              </span>
              <span className="text-[9px] text-lounge-slate-400 truncate max-w-[34px] mt-0.5">
                {cube.ownerName.replace(' AI', '').replace('플레이어 ', 'P').replace('나 (P1)', 'P1')}
              </span>
            </div>
          ))
        )}
      </div>

      {isSelectableTarget && (
        <div
          className={[
            'text-center text-xs font-bold py-1.5 rounded-lg border',
            wouldOverflow
              ? 'bg-rival-950/70 border-rival-400/60 text-rival-400'
              : 'bg-gold-400/15 border-gold-400/60 text-gold-200',
          ].join(' ')}
        >
          이 받침대에 배치 ({wouldOverflow ? `벌점 ${cubes.length}점` : `합계 ${projectedSum}`})
        </div>
      )}
    </WrapperTag>
  );
};
