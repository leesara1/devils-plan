import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface GradationRulesModalProps {
  open: boolean;
  onClose: () => void;
}

export const GradationRulesModal: React.FC<GradationRulesModalProps> = ({ open, onClose }) => {
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
      aria-label="그라데이션 게임 규칙"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl max-h-[88vh] overflow-y-auto obsidian-panel rounded-2xl p-6 sm:p-7 space-y-5 theme-text-secondary"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-4 border-b border-slate-200 dark:border-white/10 pb-4">
          <h2 className="font-display text-xl sm:text-2xl font-bold theme-text-gold-strong">
            그라데이션 게임 규칙
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

        <section className="space-y-2.5 text-sm leading-relaxed">
          <h3 className="text-sm font-semibold theme-text-gold">1. 배치</h3>
          <ul className="space-y-1.5 list-disc list-inside">
            <li>
              각자 <strong className="theme-text-primary">통 7개</strong>와 <strong className="theme-text-primary">숫자 큐브 20개(0~9 각 2개)</strong>를 받습니다.
            </li>
            <li>
              통마다 큐브를 1개씩 비공개로 넣습니다. 큐브 합은 <strong className="theme-text-rival">30 이하</strong>여야 하고, 숫자는 <strong className="theme-text-primary">왼쪽(1번 통)에서 오른쪽(7번 통)으로 갈수록 커져야</strong> 합니다.
            </li>
            <li>
              통 색은 <strong className="theme-text-primary">가운데(4번)가 가장 하얗고, 양 끝으로 갈수록 검정</strong>입니다. 그래서 3·5번, 2·6번, 1·7번 통은 색이 같습니다.
            </li>
            <li>
              상대에게는 통의 <strong className="theme-text-primary">색만 보이고 위치는 보이지 않습니다</strong>. 회색 통을 내면 그것이 작은 쪽(왼쪽)인지 큰 쪽(오른쪽)인지 상대는 알 수 없습니다.
            </li>
          </ul>
        </section>

        <section className="space-y-2.5 text-sm leading-relaxed">
          <h3 className="text-sm font-semibold theme-text-sky">2. 대결 (7라운드)</h3>
          <ul className="space-y-1.5 list-disc list-inside">
            <li>선 플레이어가 통 1개를 내면, 상대는 그 통의 색을 보고 자기 통 1개를 냅니다.</li>
            <li>두 통을 공개해 <strong className="theme-text-primary">큰 숫자가 1점</strong>을 얻습니다. 같으면 아무도 점수를 얻지 않습니다.</li>
            <li>라운드에서 이긴 사람이 다음 라운드의 선 플레이어가 됩니다. 비기면 선이 바뀌지 않습니다.</li>
            <li>한 번 낸 통은 다시 쓸 수 없습니다. 7라운드 뒤 점수가 높은 쪽이 대결에서 이깁니다. 동점이면 다시 배치해 재대결합니다.</li>
          </ul>
        </section>

        <section className="space-y-2.5 text-sm leading-relaxed">
          <h3 className="text-sm font-semibold theme-text-gold">3. 3인 서바이벌</h3>
          <ul className="space-y-1.5 list-disc list-inside">
            <li>3명 중 2명이 먼저 대결하고, 이긴 사람이 남은 1명과 대결합니다. 대결마다 새로 배치합니다.</li>
            <li>
              <strong className="theme-text-gold">2연승</strong>한 사람이 결승에 진출하고, 나머지 두 명은 탈락합니다. 직전 대결의 승자가 다음 대결의 선 플레이어입니다.
            </li>
          </ul>
        </section>

        <p className="text-xs theme-text-faint">
          원작에서 모호한 부분(같은 숫자 연속 배치 허용, 대결마다 새로 배치, 2연승 판정 방식)은 게임 진행에 맞게 정했습니다.
        </p>

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
