import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface Heavy13RulesModalProps {
  open: boolean;
  onClose: () => void;
}

export const Heavy13RulesModal: React.FC<Heavy13RulesModalProps> = ({ open, onClose }) => {
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
      aria-label="무거운 13 게임 규칙"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl max-h-[88vh] overflow-y-auto obsidian-panel rounded-2xl p-6 sm:p-7 space-y-5 theme-text-secondary"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-4 border-b border-slate-200 dark:border-white/10 pb-4">
          <h2 className="font-display text-xl sm:text-2xl font-bold theme-text-gold-strong">
            무거운 13 게임 규칙
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="규칙 창 닫기"
            className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-lg border border-slate-300 bg-slate-50 text-slate-700 hover:border-slate-400 hover:text-slate-900 dark:border-lounge-slate-700 dark:bg-obsidian-850 dark:text-lounge-slate-300 dark:hover:border-gold-500/70 dark:hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <section className="space-y-2.5 text-sm leading-relaxed theme-text-secondary">
          <h3 className="text-sm font-semibold theme-text-gold">
            1. 기본 구성 및 목표
          </h3>
          <ul className="space-y-1.5 list-disc list-inside">
            <li>
              <strong className="theme-text-primary">빨강 · 초록 · 파랑</strong> 3개의 짐꾼 받침대가 중앙에 놓이며, 어느 받침대든 숫자 합이 <strong className="theme-text-rival">13 이상</strong>이 되지 않게 카드를 내야 합니다.
            </li>
            <li>
              3~7명이 참가하며, 1라운드의 <strong className="theme-text-gold">선 플레이어 표식은 무작위</strong>로 정해집니다.
            </li>
            <li>
              각 플레이어는 <strong className="theme-text-primary">바위 카드 7장(0~6)</strong>과 <strong className="theme-text-primary">색깔 칩 7개(빨×2, 초×2, 파×2, 레인보우×1)</strong>를 받습니다.
            </li>
            <li>
              매 라운드 3분 이내에 바위 카드 1장과 색깔 칩 1개를 비공개로 동시 제출합니다. (시간 초과 시 남은 카드·칩 중 무작위로 자동 제출됩니다.)
            </li>
          </ul>
        </section>

        <section className="space-y-2.5 text-sm leading-relaxed theme-text-secondary">
          <h3 className="text-sm font-semibold theme-text-sky">
            2. 공개 및 큐브 배치 순서
          </h3>
          <ol className="space-y-1.5 list-decimal list-inside">
            <li>제출 완료 후 색깔 칩을 먼저 공개하고, 이어서 바위 카드를 공개합니다.</li>
            <li>
              <strong className="theme-text-gold">레인보우 칩</strong>을 낸 플레이어가 가장 먼저 배치 순서를 가지며, <strong className="theme-text-gold">레인보우 칩끼리는 더 높은 숫자 카드를 낸 플레이어가 먼저</strong> 배치합니다.
            </li>
            <li>그다음 일반 칩 플레이어 중 <strong className="theme-text-gold">더 높은 숫자 카드</strong>를 낸 플레이어 순으로 배치합니다.</li>
            <li>같은 등급끼리는 <strong className="theme-text-sky">선 플레이어 표식</strong>을 가진 플레이어 기준 시계 방향으로 순서가 정해집니다.</li>
            <li>
              레인보우 칩을 낸 플레이어는 배치 시 3개의 받침대 중 원하는 색상을 고를 수 있으며, <strong className="theme-text-sky">일반 색깔 칩을 이미 다 쓴 색상 받침대에도</strong> 놓을 수 있습니다.
            </li>
          </ol>
        </section>

        <section className="space-y-2.5 text-sm leading-relaxed theme-text-secondary">
          <h3 className="text-sm font-semibold theme-text-gold">
            3. 패스(보류) 및 13 이상 벌점 규칙
          </h3>
          <ul className="space-y-1.5 list-disc list-inside">
            <li>
              자신의 배치 차례가 왔을 때 라운드당 <strong className="theme-text-primary">1회 패스</strong>할 수 있습니다. 단, <strong className="theme-text-rival">패스하지 않은 사람 중 배치 순서가 마지막인 플레이어는 패스할 수 없습니다.</strong>
            </li>
            <li>
              패스한 큐브들은 패스하지 않은 모든 큐브 배치가 끝난 뒤, <strong className="theme-text-sky">패스한 순서의 역순(마지막 패스자부터)</strong>으로 배치됩니다.
            </li>
            <li>
              배치로 인해 받침대 합계가 <strong className="theme-text-rival">정확히 13이 되거나 13을 초과(13 이상)</strong>하면, 배치 전 놓여 있던 큐브가 모두 수거되며 <strong className="theme-text-rival">수거된 큐브 개수만큼 벌점</strong>을 받습니다. (숫자 <strong className="theme-text-primary">0 바위 큐브도 큐브 1개</strong>로 셈하며, 방금 놓은 큐브는 받침대에 남습니다.)
            </li>
            <li>
              라운드 종료 시 그 라운드에서 <strong className="theme-text-gold">마지막으로 벌점을 받은 플레이어</strong>가 다음 라운드의 선 플레이어가 됩니다. <strong className="theme-text-sky">벌점을 받은 플레이어가 없으면 기존 선 플레이어가 유지</strong>됩니다.
            </li>
          </ul>
        </section>

        <section className="space-y-2 text-sm leading-relaxed theme-text-secondary">
          <h3 className="text-sm font-semibold theme-text-gold">
            4. 7라운드 재지급 &amp; 14라운드 최종 순위
          </h3>
          <p>
            7라운드 종료 후 동일한 카드와 칩 세트가 다시 지급되지만, <strong className="theme-text-primary">받침대 위의 큐브는 초기화되지 않고 그대로 이어집니다.</strong> 14라운드 종료 후 벌점이 가장 많은 플레이어가 최하위가 되며, 동점 시 <strong className="theme-text-rival">가장 최근에 벌점을 받은 플레이어</strong>가 더 낮은 순위가 됩니다. (벌점이 같고 둘 다 벌점을 받은 적이 없으면 공동 순위가 됩니다.) 최종 결과 하위 2명(5명 이하 테이블은 하위 1명)이 탈락합니다.
          </p>
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
