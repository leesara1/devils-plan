import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface HitStayRulesModalProps {
  open: boolean;
  onClose: () => void;
}

export const HitStayRulesModal: React.FC<HitStayRulesModalProps> = ({ open, onClose }) => {
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
      aria-label="HIT, STAY 게임 규칙"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl max-h-[88vh] overflow-y-auto obsidian-panel rounded-2xl p-6 sm:p-7 space-y-5 theme-text-secondary"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-4 border-b border-slate-200 dark:border-white/10 pb-4">
          <h2 className="font-display text-xl sm:text-2xl font-bold theme-text-gold-strong">HIT, STAY 게임 규칙</h2>
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
          <h3 className="text-sm font-semibold theme-text-gold">1. 구성</h3>
          <ul className="space-y-1.5 list-disc list-inside">
            <li>
              5명이 각자 <strong className="theme-text-primary">칩 30개</strong>로 시작합니다. 첫 선 플레이어는 추첨으로 정하고, 라운드마다 왼쪽 사람에게 넘어갑니다.
            </li>
            <li>
              숫자 카드 35장: <span className="font-mono-tabular theme-text-primary">7×1, 6×2, 5×3, 4×4, 3×5, 2×6, 1×7, -1×7</span> (숫자×장수)
            </li>
            <li>
              라운드마다 8면체 주사위(5~12)로 <strong className="theme-text-rival">한계 숫자</strong>를 정합니다. 기본 베팅은 칩 1개이고, 10라운드마다 1개씩 늘어납니다.
            </li>
          </ul>
        </section>

        <section className="space-y-2.5 text-sm leading-relaxed">
          <h3 className="text-sm font-semibold theme-text-sky">2. 라운드 진행</h3>
          <ol className="space-y-1.5 list-decimal list-inside">
            <li>기본 베팅을 내고 카드 3장을 받습니다. 그중 1장을 골라 모두에게 공개합니다(동시 공개).</li>
            <li>
              <strong className="theme-text-primary">1차 베팅</strong>: 선 플레이어부터 콜(체크)·레이즈·포기 중 하나를 고릅니다. 베팅 상한은 남은 칩이 가장 적은 사람의 칩입니다.
            </li>
            <li>
              <strong className="theme-text-primary">HIT / STAY</strong>: 선 플레이어부터 돌아가며 HIT(카드 1장을 받아 공개) 또는 STAY를 고릅니다. STAY한 사람은 더 받지 않습니다. 모두 STAY하거나 카드가 떨어지면 끝납니다.
            </li>
            <li><strong className="theme-text-primary">2차 베팅</strong>: 같은 방식으로 한 번 더 베팅합니다.</li>
          </ol>
        </section>

        <section className="space-y-2.5 text-sm leading-relaxed">
          <h3 className="text-sm font-semibold theme-text-gold">3. 승부와 탈락</h3>
          <ul className="space-y-1.5 list-disc list-inside">
            <li>
              카드 합이 <strong className="theme-text-primary">한계 숫자에 가장 가까운(넘지 않은)</strong> 사람이 판돈을 가져갑니다. 한계를 넘으면 그 라운드 최하위입니다.
            </li>
            <li>합이 같으면 카드가 더 많은 쪽이 이깁니다. 그래도 같으면 판돈을 나누고, 나머지는 선 플레이어에 가까운 쪽이 가집니다.</li>
            <li>나머지가 모두 포기하면 남은 한 명이 판돈을 가져갑니다.</li>
            <li>
              칩이 0이 되면 <strong className="theme-text-rival">탈락</strong>입니다. 마지막 한 명이 남을 때까지 계속하며, 먼저 탈락할수록 낮은 순위입니다.
            </li>
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
