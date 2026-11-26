import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface RouletteRulesModalProps {
  open: boolean;
  onClose: () => void;
}

export const RouletteRulesModal: React.FC<RouletteRulesModalProps> = ({ open, onClose }) => {
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
      aria-label="러시안 룰렛 게임 규칙"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl max-h-[88vh] overflow-y-auto obsidian-panel rounded-2xl p-6 sm:p-7 space-y-5 theme-text-secondary"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-4 border-b border-slate-200 dark:border-white/10 pb-4">
          <h2 className="font-display text-xl sm:text-2xl font-bold theme-text-gold-strong">
            러시안 룰렛 게임 규칙
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
          <h3 className="text-sm font-semibold theme-text-gold">1. 기본 구성</h3>
          <ul className="space-y-1.5 list-disc list-inside">
            <li>
              <strong className="theme-text-primary">6명</strong>이 원형으로 앉고, 중앙에 <strong className="theme-text-primary">약실 6개</strong>짜리 총이 놓입니다. 약실 6개 중 <strong className="theme-text-rival">2개에 총알</strong>이 들어 있으며 위치는 아무도 모릅니다.
            </li>
            <li>각 약실은 한 명의 플레이어를 향하고 있습니다. 총이 돌면 약실도 함께 돕니다.</li>
            <li>
              모든 플레이어는 <strong className="theme-text-gold">크레딧 16개</strong>로 시작합니다. 남은 크레딧은 본인만 볼 수 있습니다.
            </li>
            <li>1번 자리부터 시작하며, 라운드마다 선 플레이어가 시계 방향으로 한 칸씩 넘어갑니다.</li>
          </ul>
        </section>

        <section className="space-y-2.5 text-sm leading-relaxed">
          <h3 className="text-sm font-semibold theme-text-sky">2. 차례마다 행동 1개</h3>
          <ul className="space-y-1.5 list-disc list-inside">
            <li>
              <strong className="theme-text-primary">공개 조사 (1)</strong>: 인접한 약실 2개에 총알이 있는지 전원에게 공개합니다.
            </li>
            <li>
              <strong className="theme-text-primary">비공개 조사 (2)</strong>: 인접한 약실 2개를 나만 확인합니다. 어느 약실을 봤는지는 공개됩니다.
            </li>
            <li>
              <strong className="theme-text-primary">1칸 회전 (3) · 2칸 회전 (4)</strong>: 총구를 시계 방향으로 1칸 또는 2칸 돌립니다.
            </li>
            <li>
              <strong className="theme-text-primary">조작 (6)</strong>: 한 번에 6을 낼 수 없습니다. 차례마다 1~3 크레딧을 비공개로 적립해 합이 6이 되면, 인접한 약실 2개의 내용물을 <strong className="theme-text-rival">몰래 맞바꿉니다</strong>. 6을 넘긴 크레딧은 사라집니다. 다른 사람에게는 조작에 크레딧을 냈다는 사실만 보이고, 금액과 교환 여부는 보이지 않습니다.
            </li>
            <li>크레딧을 모두 쓴 플레이어는 이후 차례를 자동으로 패스합니다.</li>
          </ul>
        </section>

        <section className="space-y-2.5 text-sm leading-relaxed">
          <h3 className="text-sm font-semibold theme-text-gold">3. 종료와 격발</h3>
          <ul className="space-y-1.5 list-disc list-inside">
            <li>
              <strong className="theme-text-primary">3명이 크레딧을 모두 쓰는 순간</strong> 게임이 끝납니다.
            </li>
            <li>
              총구가 향한 플레이어부터 시계 방향으로 한 명씩 격발합니다. 자기 앞 약실에 총알이 있던 <strong className="theme-text-rival">2명이 탈락</strong>하고, 나머지 4명은 생존합니다.
            </li>
          </ul>
        </section>

        <section className="space-y-2 text-sm leading-relaxed">
          <h3 className="text-sm font-semibold theme-text-sky">4. 정보 읽기 팁</h3>
          <p>
            확인한 약실 정보에는 <strong className="theme-text-primary">그 뒤 다른 사람이 조작에 크레딧을 낸 횟수</strong>가 함께 표시됩니다. 이 숫자가 클수록 누군가 몰래 약실을 바꿨을 수 있습니다.
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
