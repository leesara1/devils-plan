import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface AuctionBingoRulesModalProps {
  open: boolean;
  onClose: () => void;
}

export const AuctionBingoRulesModal: React.FC<AuctionBingoRulesModalProps> = ({ open, onClose }) => {
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
      aria-label="경매 빙고 게임 규칙"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl max-h-[88vh] overflow-y-auto obsidian-panel rounded-2xl p-6 sm:p-7 space-y-5 theme-text-secondary"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-4 border-b border-slate-200 dark:border-white/10 pb-4">
          <h2 className="font-display text-xl sm:text-2xl font-medium theme-text-primary">경매 빙고 게임 규칙</h2>
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
            <li>7명이 같은 모양의 빙고판(△○△ / ○☆○ / ☆○△)을 하나씩 받습니다.</li>
            <li>
              코인은 1원 3개, 2원 3개, 3원 2개, 5원 1개, 10원 1개로 <strong className="theme-text-primary">합계 30원</strong>입니다. 코인은 쪼갤 수 없습니다.
            </li>
            <li>게임은 7라운드입니다.</li>
          </ul>
        </section>

        <section className="space-y-2.5 text-sm leading-relaxed">
          <h3 className="text-sm font-medium theme-text-primary">라운드 진행</h3>
          <ol className="space-y-1.5 list-decimal list-inside">
            <li>△, ○, ☆ 상자 중 하나에 이름표를 비공개로 넣습니다. 모두 넣으면 누가 어디에 넣었는지 공개됩니다.</li>
            <li>
              이름표를 넣은 도형에 1원 이상을 비공개로 입찰합니다. 입찰한 코인은 <strong className="theme-text-primary">낙찰 여부와 상관없이 회수</strong>됩니다.
            </li>
            <li>
              도형마다 가장 많이 낸 사람이, 그 도형을 고른 인원 수만큼 도형을 받습니다. 동점이면 동점자끼리 똑같이 나누고 남는 도형은 버립니다.
            </li>
            <li>
              결과로는 <strong className="theme-text-primary">낙찰가만</strong> 공개되고, 누가 받았는지는 공개되지 않습니다. 낙찰가가 가장 높은 도형의 가격은 비공개입니다.
            </li>
            <li>1원도 낼 수 없으면 자동으로 최하위가 됩니다.</li>
          </ol>
        </section>

        <section className="space-y-2.5 text-sm leading-relaxed">
          <h3 className="text-sm font-medium theme-text-primary">순위</h3>
          <ul className="space-y-1.5 list-disc list-inside">
            <li>7라운드 뒤 받은 도형을 공개해, 빙고 줄이 가장 많이 나오도록 같은 모양 칸에 자동으로 배치합니다. 놓을 칸이 없는 도형은 버립니다.</li>
            <li>빙고 줄 수, 채운 칸 수, 남은 코인 순으로 순위를 정합니다. 7위는 탈락입니다.</li>
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
