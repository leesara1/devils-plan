import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface EquationRulesModalProps {
  open: boolean;
  onClose: () => void;
}

const Chip: React.FC<{ tone: 'green' | 'yellow' | 'red'; children: React.ReactNode }> = ({ tone, children }) => (
  <span
    className={[
      'inline-flex items-center justify-center min-w-[22px] h-[22px] px-1 rounded font-mono-tabular text-xs font-bold align-middle',
      tone === 'green'
        ? 'bg-emerald-600 text-white'
        : tone === 'yellow'
          ? 'bg-gold-400 text-gold-950'
          : 'bg-rival-500 text-white',
    ].join(' ')}
  >
    {children}
  </span>
);

export const EquationRulesModal: React.FC<EquationRulesModalProps> = ({ open, onClose }) => {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/55 dark:bg-black/75 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="수식 신호등 게임 규칙"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl max-h-[88vh] overflow-y-auto obsidian-panel rounded-2xl p-6 sm:p-7 space-y-5 theme-text-secondary"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-4 border-b border-slate-200 dark:border-white/10 pb-4">
          <h2 className="font-display text-xl sm:text-2xl font-bold theme-text-gold-strong">수식 신호등 게임 규칙</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="규칙 창 닫기"
            className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-lg border border-slate-300 bg-slate-50 text-slate-700 hover:border-slate-400 hover:text-slate-900 dark:border-lounge-slate-700 dark:bg-obsidian-850 dark:text-lounge-slate-300 dark:hover:border-gold-500/70 dark:hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <section className="space-y-2.5 text-sm leading-relaxed">
          <h3 className="text-sm font-semibold theme-text-gold">1. 비밀 수식 만들기</h3>
          <ul className="space-y-1.5 list-disc list-inside">
            <li>
              각자 <strong className="theme-text-primary">9칸짜리 수식</strong>을 몰래 정합니다. 쓸 수 있는 기호는 <strong className="theme-text-primary">0~9, +, -, ×, ÷, =, ^</strong>입니다.
            </li>
            <li>등식이 성립해야 합니다. 예: <span className="font-mono-tabular theme-text-primary">13×4+8=60</span>, <span className="font-mono-tabular theme-text-primary">2^3+1=3^2</span></li>
            <li>기호를 연속으로 쓸 수 없고, 곱셈 기호를 생략할 수 없습니다. ^ 뒤에는 숫자가 와야 합니다.</li>
            <li>두 자리 이상 수를 0으로 시작할 수 없습니다(<span className="font-mono-tabular">07</span> 불가). = 는 정확히 1개입니다.</li>
            <li>계산 순서는 ^ → ×÷ → +- 입니다. 나눗셈 결과는 분수 그대로 정확하게 계산합니다.</li>
          </ul>
        </section>

        <section className="space-y-2.5 text-sm leading-relaxed">
          <h3 className="text-sm font-semibold theme-text-sky">2. 추측과 신호</h3>
          <ul className="space-y-1.5 list-disc list-inside">
            <li>매 턴 두 사람이 동시에 상대 수식을 추측합니다. 추측은 성립하지 않는 식이어도 됩니다.</li>
            <li>
              <Chip tone="green">초</Chip> 정확한 위치의 기호, <Chip tone="yellow">노</Chip> 정답에 있지만 위치가 다른 기호, <Chip tone="red">빨</Chip> 정답에 없는 기호입니다.
            </li>
            <li>
              정답에 1번만 있는 기호를 여러 번 쓰면 그중 하나만 초록이나 노랑이 되고, 나머지는 빨강입니다.
            </li>
          </ul>
        </section>

        <section className="space-y-2.5 text-sm leading-relaxed">
          <h3 className="text-sm font-semibold theme-text-gold">3. 승패</h3>
          <ul className="space-y-1.5 list-disc list-inside">
            <li>상대 수식을 먼저 맞힌 쪽이 이깁니다.</li>
            <li>같은 턴에 둘 다 맞히거나, 20턴 안에 아무도 못 맞히면 무승부입니다.</li>
          </ul>
        </section>

        <div className="pt-2 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-gold-400 hover:bg-gold-300 text-gold-950 font-bold text-sm transition-colors cursor-pointer"
          >
            확인
          </button>
        </div>
      </div>
    </div>
  );
};
