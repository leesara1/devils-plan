import React from 'react';

export const MemoryPokerPreviewDiagram: React.FC = () => {
  const coords = [
    'A1', 'A2', 'A3', 'A4',
    'B1', 'B2', 'B3', 'B4',
    'C1', 'C2', 'C3', 'C4',
    'D1', 'D2', 'D3', 'D4',
  ];

  return (
    <div
      aria-hidden="true"
      className="w-full aspect-[16/9] bg-[#eef1f5] dark:bg-[#191d26] border-b border-slate-200 dark:border-white/[0.08] p-5 sm:p-6 flex items-center justify-center gap-6 sm:gap-8 select-none overflow-hidden"
    >
      {/* Left: Clean 4x4 Mini Card Grid */}
      <div className="grid grid-cols-4 gap-1.5 sm:gap-2 w-[148px] sm:w-[172px] shrink-0">
        {coords.map((coord, idx) => {
          const isP1 = idx === 5;
          const isP2 = idx === 10;
          const isFaceUp = idx === 1 || idx === 5;
          return (
            <div
              key={coord}
              className={[
                'relative aspect-[5/7] rounded border flex items-center justify-center font-mono-tabular text-[9px] font-semibold',
                isFaceUp
                  ? 'bg-[#ffffff] dark:bg-[#faf9f6] border-slate-300 dark:border-[#d6d3cb] text-[#111827] shadow-2xs'
                  : 'bg-[#e2e7ef] dark:bg-[#232938] border-slate-300/80 dark:border-white/10 text-slate-600 dark:text-slate-300',
                isP1 ? 'ring-1 ring-[#ca8a04] dark:ring-[#eab308]' : isP2 ? 'ring-1 ring-[#e11d48] dark:ring-[#fb7185]' : '',
              ].join(' ')}
            >
              {idx === 1 ? (
                <span className="text-[#dc2626] font-bold">A♥</span>
              ) : idx === 5 ? (
                <span className="text-[#111827] font-bold">K♠</span>
              ) : (
                <span>{coord}</span>
              )}
              {isP1 && (
                <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-[#eab308] text-[#1c1503] text-[7px] font-bold flex items-center justify-center">
                  1
                </span>
              )}
              {isP2 && (
                <span className="absolute -top-1 -right-1 w-3 h-3 rounded-sm bg-[#e11d48] text-white text-[7px] font-bold flex items-center justify-center">
                  2
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Right: 3 Community Cards + Hand Rank Preview */}
      <div className="flex flex-col gap-3 min-w-0">
        <div className="text-[11px] text-slate-600 dark:text-slate-400">
          공유 카드
        </div>
        <div className="flex items-center gap-2">
          {[
            { rank: 'K', suit: '♦', red: true },
            { rank: 'Q', suit: '♠', red: false },
            { rank: '10', suit: '♠', red: false },
          ].map((c) => (
            <div
              key={`${c.rank}${c.suit}`}
              className="w-10 sm:w-12 aspect-[5/7] rounded-md bg-white dark:bg-[#faf9f6] border border-slate-300 dark:border-[#d6d3cb] shadow-2xs flex flex-col items-center justify-center font-mono-tabular"
            >
              <span
                className={`text-xs sm:text-sm font-bold leading-none ${
                  c.red ? 'text-[#dc2626]' : 'text-[#111827]'
                }`}
              >
                {c.rank}
              </span>
              <span
                className={`text-xs mt-0.5 leading-none ${
                  c.red ? 'text-[#dc2626]' : 'text-[#111827]'
                }`}
              >
                {c.suit}
              </span>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2 text-[11px] font-mono-tabular text-slate-700 dark:text-slate-300">
          <span className="text-[#a16207] dark:text-[#eab308] font-semibold">20s</span>
          <span className="text-slate-400 dark:text-slate-600">·</span>
          <span>5-Card Hold&apos;em</span>
        </div>
      </div>
    </div>
  );
};

export const Heavy13PreviewDiagram: React.FC = () => {
  const pedestals = [
    { label: '빨강', sum: 10, accentLight: '#e11d48', accentDark: '#fb7185', cubes: [4, 3, 3], danger: true },
    { label: '초록', sum: 7, accentLight: '#059669', accentDark: '#34d399', cubes: [5, 2], danger: false },
    { label: '파랑', sum: 4, accentLight: '#0284c7', accentDark: '#38bdf8', cubes: [4], danger: false },
  ];

  return (
    <div
      aria-hidden="true"
      className="w-full aspect-[16/9] bg-[#eef1f5] dark:bg-[#191d26] border-b border-slate-200 dark:border-white/[0.08] p-5 sm:p-6 flex flex-col justify-center gap-4 select-none overflow-hidden"
    >
      {/* 3 Minimal Pedestals */}
      <div className="grid grid-cols-3 gap-2.5 sm:gap-3 w-full max-w-[360px] mx-auto">
        {pedestals.map((ped) => (
          <div
            key={ped.label}
            className="rounded-lg bg-white dark:bg-[#232938] border border-slate-200 dark:border-white/10 p-2.5 flex flex-col gap-2"
          >
            <div className="flex items-center justify-between text-[10px]">
              <span className="font-semibold text-slate-800 dark:text-slate-200">{ped.label}</span>
              <span
                className={[
                  'font-mono-tabular font-bold',
                  ped.danger
                    ? 'text-[#be123c] dark:text-[#fb7185]'
                    : 'text-slate-600 dark:text-slate-300',
                ].join(' ')}
              >
                {ped.sum}/13
              </span>
            </div>

            <div className="w-full h-1 rounded-full bg-slate-200 dark:bg-[#14171f] overflow-hidden">
              <div
                className="h-full rounded-full dark:hidden"
                style={{
                  width: `${Math.min(100, (ped.sum / 13) * 100)}%`,
                  backgroundColor: ped.accentLight,
                }}
              />
              <div
                className="h-full rounded-full hidden dark:block"
                style={{
                  width: `${Math.min(100, (ped.sum / 13) * 100)}%`,
                  backgroundColor: ped.accentDark,
                }}
              />
            </div>

            <div className="flex items-center gap-1 pt-0.5">
              {ped.cubes.map((val, idx) => (
                <div
                  key={`${ped.label}-${idx}`}
                  className="w-6 h-6 rounded bg-slate-100 dark:bg-[#181c24] border border-slate-300/80 dark:border-white/15 flex items-center justify-center font-mono-tabular text-[10px] font-bold text-slate-900 dark:text-slate-100"
                >
                  {val}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Bottom Rock Cards Strip */}
      <div className="flex items-center justify-center gap-1.5">
        {[0, 1, 2, 3, 4, 5, 6].map((num) => (
          <div
            key={num}
            className={[
              'w-6 h-8 rounded border flex items-center justify-center font-mono-tabular text-[11px] font-bold',
              num === 3
                ? 'bg-[#eab308] border-[#ca8a04] dark:border-[#eab308] text-[#1c1503]'
                : num === 6
                  ? 'bg-slate-200/70 dark:bg-[#14171f] border-slate-300/60 dark:border-white/5 text-slate-400 dark:text-slate-600'
                  : 'bg-white dark:bg-[#232938] border-slate-300 dark:border-white/15 text-slate-800 dark:text-slate-200',
            ].join(' ')}
          >
            {num}
          </div>
        ))}
      </div>
    </div>
  );
};

export const RussianRoulettePreviewDiagram: React.FC = () => {
  // chamber states for the mini preview: bullet, known-empty, unknown
  const chambers: Array<'bullet' | 'empty' | 'unknown'> = [
    'unknown', 'empty', 'bullet', 'unknown', 'empty', 'unknown',
  ];
  const seats = ['1P', '크롱', '루피', '에디', '포비', '패티'];

  return (
    <div
      aria-hidden="true"
      className="w-full aspect-[16/9] bg-[#eef1f5] dark:bg-[#191d26] border-b border-slate-200 dark:border-white/[0.08] p-4 flex items-center justify-center gap-6 sm:gap-10 select-none overflow-hidden"
    >
      <div className="relative h-full aspect-square max-h-[200px]">
        <div className="absolute inset-[6%] rounded-full bg-white/70 dark:bg-[#232938] border border-slate-200 dark:border-white/10" />
        {/* barrel toward seat 0 (bottom) */}
        <div className="absolute left-1/2 top-1/2 w-[9px] h-[34%] -translate-x-1/2 rounded-b-full bg-[#eab308]" />
        <div className="absolute left-1/2 top-1/2 w-[30%] aspect-square -translate-x-1/2 -translate-y-1/2 rounded-full bg-slate-300 dark:bg-[#2a303f]" />
        {chambers.map((state, i) => {
          const angle = ((90 + 60 * i) * Math.PI) / 180;
          return (
            <div
              key={`c${i}`}
              className={[
                'absolute w-[15%] aspect-square -translate-x-1/2 -translate-y-1/2 rounded-full border-2 flex items-center justify-center text-[9px] font-bold',
                state === 'bullet'
                  ? 'bg-[#fff1f2] dark:bg-[#3a1820] border-[#e11d48] text-[#be123c] dark:text-[#fb7185]'
                  : state === 'empty'
                    ? 'bg-[#ecfdf5] dark:bg-[#102a22] border-[#059669] text-[#047857] dark:text-[#6ee7b7]'
                    : 'bg-white dark:bg-[#181c24] border-slate-300 dark:border-white/15 text-slate-500 dark:text-slate-400',
              ].join(' ')}
              style={{ left: `${50 + 22 * Math.cos(angle)}%`, top: `${50 + 22 * Math.sin(angle)}%` }}
            >
              {state === 'bullet' ? '탄' : state === 'empty' ? '빈' : '?'}
            </div>
          );
        })}
        {seats.map((name, i) => {
          const angle = ((90 + 60 * i) * Math.PI) / 180;
          return (
            <div
              key={name}
              className={[
                'absolute -translate-x-1/2 -translate-y-1/2 px-1.5 py-0.5 rounded-md border text-[9px] font-semibold whitespace-nowrap',
                i === 0
                  ? 'bg-[#fef9c3] dark:bg-[#2a2410] border-[#ca8a04] text-[#854d0e] dark:text-[#fcd34d]'
                  : 'bg-white dark:bg-[#212632] border-slate-300 dark:border-white/10 text-slate-700 dark:text-slate-300',
              ].join(' ')}
              style={{ left: `${50 + 44 * Math.cos(angle)}%`, top: `${50 + 44 * Math.sin(angle)}%` }}
            >
              {name}
            </div>
          );
        })}
      </div>

      <div className="hidden sm:flex flex-col gap-1.5 text-[11px] font-mono-tabular text-slate-700 dark:text-slate-300">
        {[
          ['공개 조사', '1'],
          ['비공개 조사', '2'],
          ['회전 1·2칸', '3·4'],
          ['조작', '6'],
        ].map(([label, cost]) => (
          <div key={label} className="flex items-center justify-between gap-4">
            <span>{label}</span>
            <span className="text-[#a16207] dark:text-[#eab308] font-bold">{cost}</span>
          </div>
        ))}
        <div className="pt-1 text-slate-500 dark:text-slate-500">크레딧 16 · 총알 2</div>
      </div>
    </div>
  );
};

export const GradationPreviewDiagram: React.FC = () => {
  const mine = [0, 1, 2, 4, 6, 8, 9];
  const theirs: (number | null)[] = [null, 2, null, null, 5, null, null];
  // White in the middle tube, darkening toward both ends (same shade = same colour).
  const tube = (i: number, _hue: number) => {
    const l = [97, 72, 44, 14][Math.abs(i - 3)];
    return { backgroundColor: `hsl(220 8% ${l}%)`, color: l < 55 ? '#fff' : '#111827' };
  };
  return (
    <div
      aria-hidden="true"
      className="w-full aspect-[16/9] bg-[#eef1f5] dark:bg-[#191d26] border-b border-slate-200 dark:border-white/[0.08] p-5 flex flex-col items-center justify-center gap-3 select-none overflow-hidden"
    >
      <div className="flex gap-1.5 sm:gap-2">
        {theirs.map((v, i) => (
          <div
            key={`o${i}`}
            className={[
              'w-7 sm:w-8 h-11 sm:h-12 rounded-t-full rounded-b-lg border border-black/10 dark:border-white/15 flex items-center justify-center font-mono-tabular text-sm font-bold',
              i === 4 ? 'ring-2 ring-[#e11d48]' : '',
            ].join(' ')}
            style={tube(i, 205)}
          >
            {v ?? '?'}
          </div>
        ))}
      </div>
      <div className="text-[10px] font-mono-tabular text-slate-600 dark:text-slate-400">
        6 &gt; 5 · 1P +1
      </div>
      <div className="flex gap-1.5 sm:gap-2">
        {mine.map((v, i) => (
          <div
            key={`m${i}`}
            className={[
              'w-7 sm:w-8 h-11 sm:h-12 rounded-t-full rounded-b-lg border border-black/10 dark:border-white/15 flex items-center justify-center font-mono-tabular text-sm font-bold',
              i === 4 ? 'ring-2 ring-[#059669]' : '',
            ].join(' ')}
            style={tube(i, 42)}
          >
            {v}
          </div>
        ))}
      </div>
      <div className="text-[10px] font-mono-tabular text-slate-500">합 30 이하 · 오름차순</div>
    </div>
  );
};

export const EquationSignalPreviewDiagram: React.FC = () => {
  const rows: Array<Array<[string, 'g' | 'y' | 'r']>> = [
    // Real signals for guesses against 13×4+8=60
    [['4', 'y'], ['8', 'y'], ['-', 'r'], ['9', 'r'], ['×', 'y'], ['5', 'r'], ['=', 'g'], ['3', 'y'], ['9', 'r']],
    [['1', 'g'], ['3', 'g'], ['×', 'g'], ['2', 'r'], ['+', 'g'], ['6', 'y'], ['=', 'g'], ['3', 'r'], ['2', 'r']],
    [['1', 'g'], ['3', 'g'], ['×', 'g'], ['4', 'g'], ['+', 'g'], ['8', 'g'], ['=', 'g'], ['6', 'g'], ['0', 'g']],
  ];
  const tone = {
    g: 'bg-[#059669] text-white border-[#059669]',
    y: 'bg-[#eab308] text-[#1c1503] border-[#eab308]',
    r: 'bg-[#e11d48] text-white border-[#e11d48]',
  };
  return (
    <div
      aria-hidden="true"
      className="w-full aspect-[16/9] bg-[#eef1f5] dark:bg-[#191d26] border-b border-slate-200 dark:border-white/[0.08] p-5 flex flex-col items-center justify-center gap-1.5 select-none overflow-hidden"
    >
      {rows.map((row, r) => (
        <div key={r} className="flex gap-1">
          {row.map(([c, t], i) => (
            <div
              key={i}
              className={`w-6 h-7 sm:w-7 sm:h-8 rounded border flex items-center justify-center font-mono-tabular text-xs sm:text-sm font-bold ${tone[t]}`}
            >
              {c}
            </div>
          ))}
        </div>
      ))}
      <div className="pt-1.5 text-[10px] font-mono-tabular text-slate-600 dark:text-slate-400">
        9칸 · 0–9 + - × ÷ = ^
      </div>
    </div>
  );
};

export const HitStayPreviewDiagram: React.FC = () => {
  const card = (v: number | null, key: string, accent = false) => (
    <div
      key={key}
      className={[
        'w-8 h-11 sm:w-9 sm:h-12 rounded-md border-2 flex items-center justify-center font-mono-tabular text-sm font-bold',
        v === null
          ? 'border-slate-400/60 dark:border-white/15 bg-[repeating-linear-gradient(45deg,#cbd5e1_0_4px,#e2e8f0_4px_8px)] dark:bg-[repeating-linear-gradient(45deg,#2a303f_0_4px,#212632_4px_8px)]'
          : `bg-white dark:bg-[#faf9f6] ${accent ? 'border-[#eab308]' : 'border-slate-300 dark:border-[#d6d3cb]'} ${v < 0 ? 'text-[#e11d48]' : 'text-[#111827]'}`,
      ].join(' ')}
    >
      {v ?? ''}
    </div>
  );
  return (
    <div
      aria-hidden="true"
      className="w-full aspect-[16/9] bg-[#eef1f5] dark:bg-[#191d26] border-b border-slate-200 dark:border-white/[0.08] p-5 flex items-center justify-center gap-6 sm:gap-10 select-none overflow-hidden"
    >
      <div className="flex flex-col items-center gap-1">
        <div className="w-16 h-16 sm:w-20 sm:h-20 rotate-45 rounded-lg bg-white dark:bg-[#232938] border border-slate-300 dark:border-white/10 flex items-center justify-center">
          <span className="-rotate-45 font-mono-tabular text-2xl sm:text-3xl font-bold text-[#be123c] dark:text-[#fb7185]">9</span>
        </div>
        <span className="mt-3 text-[10px] font-mono-tabular text-slate-600 dark:text-slate-400">한계 5–12</span>
      </div>
      <div className="flex flex-col gap-2">
        <div className="flex gap-1.5">{[card(null, 'a'), card(4, 'b', true), card(null, 'c')]}</div>
        <div className="flex gap-1.5 items-center">
          {[card(3, 'd'), card(-1, 'e', true), card(2, 'f')]}
          <span className="ml-1 text-[11px] font-mono-tabular font-bold text-[#047857] dark:text-[#6ee7b7]">= 4 +HIT</span>
        </div>
        <div className="flex gap-2 text-[10px] font-mono-tabular text-slate-600 dark:text-slate-400">
          <span className="text-[#a16207] dark:text-[#eab308] font-bold">HIT</span>
          <span>·</span>
          <span>STAY</span>
          <span>·</span>
          <span>칩 30개</span>
        </div>
      </div>
    </div>
  );
};
