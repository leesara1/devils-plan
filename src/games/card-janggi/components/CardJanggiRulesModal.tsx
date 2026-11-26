import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface CardJanggiRulesModalProps {
  open: boolean;
  onClose: () => void;
}

export const CardJanggiRulesModal: React.FC<CardJanggiRulesModalProps> = ({ open, onClose }) => {
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
      aria-label="카드 장기 게임 규칙"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl max-h-[88vh] overflow-y-auto obsidian-panel rounded-2xl p-6 sm:p-7 space-y-5 theme-text-secondary"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-4 border-b border-slate-200 dark:border-white/10 pb-4">
          <h2 className="font-display text-xl sm:text-2xl font-medium theme-text-primary">카드 장기 게임 규칙</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="규칙 창 닫기"
            className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-lg border theme-border theme-text-secondary hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <section className="space-y-2.5 text-sm leading-relaxed">
          <h3 className="text-sm font-medium theme-text-primary">구성</h3>
          <ul className="space-y-1.5 list-disc list-inside">
            <li>5×5 판에서 각자 큰 말 1개와 작은 말 3개를 정해진 자리에 놓고 시작합니다.</li>
            <li>
              행마 카드 5장: <strong className="theme-text-primary">쥐</strong> 상하좌우 1칸, <strong className="theme-text-primary">말</strong> 나이트 행마, <strong className="theme-text-primary">원숭이</strong> 주변 8칸, <strong className="theme-text-primary">코끼리</strong> 대각선으로 막힐 때까지, <strong className="theme-text-primary">기린</strong> 상하좌우 2칸(뛰어넘음)
            </li>
          </ul>
        </section>

        <section className="space-y-2.5 text-sm leading-relaxed">
          <h3 className="text-sm font-medium theme-text-primary">진행</h3>
          <ol className="space-y-1.5 list-decimal list-inside">
            <li>선공은 5장 모두, 후공은 5장 중 4장을 골라 쓸 순서를 비공개로 정합니다. 각자 다음에 쓸 카드 1장은 앞면으로 공개됩니다.</li>
            <li>선공부터 번갈아, 공개된 카드대로 자기 말 하나를 움직입니다. 상대 말이 있는 칸으로 가면 그 말을 잡습니다. 움직일 수 있는 말이 없으면 넘깁니다.</li>
            <li>정한 카드를 다 쓰면 그 사람은 다시 순서를 정합니다.</li>
          </ol>
        </section>

        <section className="space-y-2.5 text-sm leading-relaxed">
          <h3 className="text-sm font-medium theme-text-primary">승패</h3>
          <ul className="space-y-1.5 list-disc list-inside">
            <li>상대 큰 말을 잡거나, 내 큰 말이 상대 큰 말의 시작 칸에 도착하면 라운드에서 이깁니다.</li>
            <li>3라운드 중 2승하면 승리합니다. 라운드마다 선공이 바뀝니다. 60수 안에 승부가 나지 않으면 그 라운드는 다시 합니다.</li>
          </ul>
        </section>

        <div className="pt-2 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 h-10 rounded-lg bg-gold-400 hover:bg-gold-300 text-gold-950 font-medium text-sm transition-colors cursor-pointer"
          >
            확인
          </button>
        </div>
      </div>
    </div>
  );
};
