import React from 'react';
import { HelpCircle, X } from 'lucide-react';
import { CHIP_META, ChipType } from '../engine/heavy13';
import { RoundPhase } from '../engine/heavy13Reducer';

interface Heavy13Round1HintProps {
  phase: RoundPhase;
  isHumanPlacementTurn: boolean;
  activeChip?: ChipType;
  humanCanPass: boolean;
  isBurstAnimating: boolean;
  onDismiss: () => void;
}

export const Heavy13Round1Hint: React.FC<Heavy13Round1HintProps> = ({
  phase,
  isHumanPlacementTurn,
  activeChip,
  humanCanPass,
  isBurstAnimating,
  onDismiss,
}) => {
  const copy = (() => {
    switch (phase) {
      case 'SUBMISSION':
        return {
          title: '1라운드 안내 · 비공개 제출',
          body: '바위 카드(0~6) 1장과 색깔 칩 1개를 고르세요. 숫자가 클수록 먼저 배치되고, 레인보우 칩은 가장 먼저 놓습니다. 카드 0은 안전한 방어용으로 아껴둘 수 있습니다.',
        };
      case 'PASS_TO_HUMAN':
        return {
          title: '1라운드 안내 · 기기 전달',
          body: '이전 플레이어의 선택은 숨겨졌습니다. 다음 플레이어가 준비되면 선택 시작을 누르세요.',
        };
      case 'REVEAL_CHIPS':
        return {
          title: '1라운드 안내 · 색깔 칩 공개',
          body: '먼저 모두의 색깔 칩만 공개됩니다. 어떤 받침대에 사람이 몰릴지 미리 예측해 보세요.',
        };
      case 'REVEAL_CARDS':
        return {
          title: '1라운드 안내 · 순서 확정',
          body: '배치 순서는 레인보우 칩 → 높은 바위 숫자 → 선(선 플레이어) 시계 방향입니다.',
        };
      case 'PLACEMENT_STEP':
        if (isBurstAnimating) {
          return {
            title: '1라운드 안내 · 13 이상 수거',
            body: '받침대 합이 13 이상이 되면 방금 올린 큐브는 빼고 기존 큐브 수만큼 벌점을 받으며 받침대가 비워집니다.',
          };
        }
        if (isHumanPlacementTurn) {
          if (activeChip === 'rainbow') {
            return {
              title: '1라운드 안내 · 레인보우 배치',
              body: '원하는 받침대를 눌러 놓으세요. 위쪽 미리보기에서 합계 12 이하는 안전(초록), 13 이상은 폭발(빨강)으로 표시됩니다.',
            };
          }
          return {
            title: '1라운드 안내 · 내 배치 차례',
            body: humanCanPass
              ? `지금 놓기 위험하면 '패스 (후순위)'를 눌러 다른 사람이 받침대를 비운 뒤 마지막에 역순으로 놓을 수 있습니다.`
              : `아직 패스하지 않은 사람 중 마지막 순서이므로 패스할 수 없습니다. ${activeChip ? CHIP_META[activeChip].labelKo : ''}에 배치하세요.`,
          };
        }
        return {
          title: '1라운드 안내 · 상대 배치',
          body: '다른 플레이어가 받침대에 바위 큐브를 올리거나 패스하는 중입니다. 13이 넘으면 그 받침대가 비워집니다.',
        };
      case 'ROUND_SUMMARY':
        return {
          title: '1라운드 안내 · 선 플레이어 이동',
          body: '이 라운드에서 가장 마지막에 벌점을 받은 사람이 다음 라운드 선 플레이어가 됩니다. 벌점자가 없으면 기존 선이 유지됩니다.',
        };
    }
  })();

  return (
    <aside
      aria-label="1라운드 도움말"
      className="relative obsidian-sky-panel rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 flex items-start justify-between gap-2.5"
    >
      <div className="flex items-start gap-2 sm:gap-2.5 min-w-0">
        <HelpCircle className="w-4 h-4 sm:w-5 sm:h-5 theme-text-sky shrink-0 mt-0.5" />
        <div className="min-w-0 space-y-0.5">
          <div className="text-[11px] sm:text-xs font-bold theme-text-sky">
            {copy.title}
          </div>
          <p className="text-[11px] sm:text-xs theme-text-secondary leading-relaxed">
            {copy.body}
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={onDismiss}
        className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1.5 min-h-[36px] rounded-lg border border-sky-300 bg-white hover:bg-sky-50 text-[11px] font-semibold text-slate-700 hover:text-slate-900 dark:border-lounge-sky-400/40 dark:bg-obsidian-900/70 dark:hover:bg-obsidian-800 dark:text-lounge-slate-200 dark:hover:text-white transition-colors cursor-pointer whitespace-nowrap"
      >
        <X className="w-3.5 h-3.5" />
        도움말 끄기
      </button>
    </aside>
  );
};
