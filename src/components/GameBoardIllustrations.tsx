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
      className="w-full aspect-[16/9] bg-[#101218] border-b border-white/[0.07] p-5 sm:p-6 flex items-center justify-center gap-6 sm:gap-8 select-none overflow-hidden"
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
                  ? 'bg-[#faf9f6] border-[#d6d3cb] text-[#111827]'
                  : 'bg-[#1a1e28] border-white/10 text-slate-400',
                isP1 ? 'ring-1 ring-[#eab308]' : isP2 ? 'ring-1 ring-[#fb7185]' : '',
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
        <div className="text-[10px] font-mono-tabular text-slate-400 tracking-wide">
          COMMUNITY CARDS
        </div>
        <div className="flex items-center gap-2">
          {[
            { rank: 'K', suit: '♦', red: true },
            { rank: 'Q', suit: '♠', red: false },
            { rank: '10', suit: '♠', red: false },
          ].map((c) => (
            <div
              key={`${c.rank}${c.suit}`}
              className="w-10 sm:w-12 aspect-[5/7] rounded-md bg-[#faf9f6] border border-[#d6d3cb] flex flex-col items-center justify-center font-mono-tabular"
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
        <div className="flex items-center gap-2 text-[11px] font-mono-tabular text-slate-300">
          <span className="text-[#eab308] font-semibold">20s</span>
          <span className="text-slate-600">·</span>
          <span>5-Card Hold&apos;em</span>
        </div>
      </div>
    </div>
  );
};

export const Heavy13PreviewDiagram: React.FC = () => {
  const pedestals = [
    { label: '빨강', sum: 10, accent: '#fb7185', cubes: [4, 3, 3], danger: true },
    { label: '초록', sum: 7, accent: '#34d399', cubes: [5, 2], danger: false },
    { label: '파랑', sum: 4, accent: '#38bdf8', cubes: [4], danger: false },
  ];

  return (
    <div
      aria-hidden="true"
      className="w-full aspect-[16/9] bg-[#101218] border-b border-white/[0.07] p-5 sm:p-6 flex flex-col justify-center gap-4 select-none overflow-hidden"
    >
      {/* 3 Minimal Pedestals */}
      <div className="grid grid-cols-3 gap-2.5 sm:gap-3 w-full max-w-[360px] mx-auto">
        {pedestals.map((ped) => (
          <div
            key={ped.label}
            className="rounded-lg bg-[#161922] border border-white/10 p-2.5 flex flex-col gap-2"
          >
            <div className="flex items-center justify-between text-[10px]">
              <span className="font-semibold text-slate-200">{ped.label}</span>
              <span
                className="font-mono-tabular font-bold"
                style={{ color: ped.danger ? '#fb7185' : '#cbd5e1' }}
              >
                {ped.sum}/13
              </span>
            </div>

            <div className="w-full h-1 rounded-full bg-[#0a0b0f] overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${Math.min(100, (ped.sum / 13) * 100)}%`,
                  backgroundColor: ped.accent,
                }}
              />
            </div>

            <div className="flex items-center gap-1 pt-0.5">
              {ped.cubes.map((val, idx) => (
                <div
                  key={`${ped.label}-${idx}`}
                  className="w-6 h-6 rounded bg-[#0e1015] border border-white/15 flex items-center justify-center font-mono-tabular text-[10px] font-bold text-slate-100"
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
                ? 'bg-[#eab308] border-[#eab308] text-[#1c1503]'
                : num === 6
                  ? 'bg-[#0e1015] border-white/5 text-slate-600'
                  : 'bg-[#161922] border-white/15 text-slate-200',
            ].join(' ')}
          >
            {num}
          </div>
        ))}
      </div>
    </div>
  );
};
