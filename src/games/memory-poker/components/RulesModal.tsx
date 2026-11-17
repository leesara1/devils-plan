import React from 'react';
import { X } from 'lucide-react';
import { HAND_RANKINGS_META } from '../engine/poker';

interface RulesModalProps {
  open: boolean;
  onClose: () => void;
}

export const RulesModal: React.FC<RulesModalProps> = ({ open, onClose }) => {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="rules-modal-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl max-h-[88vh] overflow-y-auto obsidian-panel rounded-2xl text-[#f3f1ec] p-6 sm:p-7"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 pb-4 border-b border-white/10">
          <div>
            <h2 id="rules-modal-title" className="font-display text-2xl font-bold text-gold-200">
              기억 포커 규칙 및 족보
            </h2>
            <p className="mt-1 text-sm text-lounge-slate-300">
              52장 중 무작위 16장을 20초간 암기하고, 공유 카드 3장과 합쳐 최고의 5장 조합을 만드세요.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="규칙 창 닫기"
            className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-lg border border-lounge-slate-700 text-lounge-slate-300 hover:text-white hover:border-gold-500/60 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-5 space-y-5 text-sm leading-relaxed">
          <section className="space-y-2">
            <h3 className="font-semibold text-gold-400 text-base">진행 순서</h3>
            <ol className="list-decimal list-inside space-y-1.5 text-lounge-slate-200">
              <li>
                <strong className="text-white">카드 암기 (20초)</strong>: 4×4 게임판에 놓인 16장의 카드를 20초 동안 기억합니다.
              </li>
              <li>
                <strong className="text-white">공유 카드 공개 (3장)</strong>: 16장이 뒷면으로 뒤집힌 뒤, 중앙에 공유 카드 3장이 공개됩니다.
              </li>
              <li>
                <strong className="text-white">개인 게임판 말 배치 (2장)</strong>: 암기한 16장 중 공유 카드 3장을 포함해 가장 강한 족보를 만들 수 있는 2곳에 말(피스)을 배치합니다.
              </li>
              <li>
                <strong className="text-white">카드 공개 및 승패 판정</strong>: 두 플레이어의 선택이 끝나면 카드를 공개해 5장 홀덤 족보로 승패를 겨룹니다.
              </li>
            </ol>
          </section>

          <section className="space-y-2.5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="font-semibold text-gold-400 text-base">홀덤 족보 (높은 순서)</h3>
              <span className="text-xs text-lounge-sky-300">
                동일 족보 시 높은 숫자 우선 · 문양 비교 없음
              </span>
            </div>
            <div className="divide-y divide-white/10 rounded-xl obsidian-subpanel">
              {HAND_RANKINGS_META.map((item, idx) => (
                <div
                  key={item.category}
                  className="flex items-center justify-between gap-4 px-4 py-2.5"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="font-mono-tabular text-xs font-semibold text-gold-400 w-5 shrink-0">
                      {idx + 1}.
                    </span>
                    <span className="font-semibold text-white whitespace-nowrap">
                      {item.nameKo}
                    </span>
                  </div>
                  <span className="text-xs sm:text-sm text-lounge-slate-300 text-right">
                    {item.summaryKo}
                  </span>
                </div>
              ))}
            </div>
            <p className="text-xs text-lounge-slate-400 pt-1">
              같은 조합끼리는 조합을 이룬 숫자가 더 큰 쪽이 승리하며, 그 숫자까지 동일하면 조합 외 나머지 카드(키커)의 숫자가 더 큰 쪽이 승리합니다.
            </p>
          </section>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-lg bg-gold-400 text-gold-950 font-bold text-sm hover:bg-gold-300 transition-colors cursor-pointer"
          >
            확인
          </button>
        </div>
      </div>
    </div>
  );
};
