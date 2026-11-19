import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  GraduationCap,
  Play,
  RotateCcw,
  X,
} from 'lucide-react';
import { heavy13Sound } from '../audio/heavy13Sound';
import {
  CHIP_META,
  ChipType,
  PEDESTAL_META,
  PedestalColor,
  PedestalsState,
  RockCube,
  RockNumber,
} from '../engine/heavy13';
import { ChipMiniEmblem, PedestalBurstEffect, PedestalStation } from './Heavy13Pieces';

interface Heavy13TutorialModalProps {
  open: boolean;
  onClose: () => void;
  onStartRealMatch: () => void;
}

interface OrderCandidate {
  id: string;
  name: string;
  chip: ChipType;
  card: RockNumber;
  isFirst: boolean;
}

const ORDER_CANDIDATES: OrderCandidate[] = [
  { id: 'p1', name: '플레이어', chip: 'green', card: 6, isFirst: false },
  { id: 'p2', name: '뽀로로', chip: 'red', card: 6, isFirst: true },
  { id: 'p3', name: '루피', chip: 'rainbow', card: 1, isFirst: false },
  { id: 'p4', name: '크롱', chip: 'blue', card: 4, isFirst: false },
];

const EXPECTED_ORDER_IDS = ['p3', 'p2', 'p1', 'p4'];

function makeDemoPedestals(
  redVals: RockNumber[],
  greenVals: RockNumber[],
  blueVals: RockNumber[]
): PedestalsState {
  const build = (vals: RockNumber[], color: string): RockCube[] =>
    vals.map((value, idx) => ({
      id: `tut-${color}-${idx}-${value}`,
      value,
      ownerId: `demo-${idx}`,
      ownerName: ['뽀로로', '루피', '크롱'][idx % 3],
      roundPlaced: idx + 1,
    }));
  return {
    red: build(redVals, 'red'),
    green: build(greenVals, 'green'),
    blue: build(blueVals, 'blue'),
  };
}

export const Heavy13TutorialModal: React.FC<Heavy13TutorialModalProps> = ({
  open,
  onClose,
  onStartRealMatch,
}) => {
  const [step, setStep] = useState(0);

  // Step 0: Order Determination
  const [pickedOrder, setPickedOrder] = useState<string[]>([]);
  const [orderFeedback, setOrderFeedback] = useState<string | null>(null);

  // Step 1: 13 Overflow & Collection
  const [step2Pedestals, setStep2Pedestals] = useState<PedestalsState>(() =>
    makeDemoPedestals([4, 3, 3], [5, 2], [4])
  );
  const [step2Burst, setStep2Burst] = useState<PedestalBurstEffect | null>(null);
  const [step2Done, setStep2Done] = useState(false);
  const [step2Msg, setStep2Msg] = useState<string>(
    '빨강 받침대(합 10, 큐브 3개)에 바위 3을 직접 놓아 13 폭발이 어떻게 일어나는지 체험해 보세요.'
  );

  // Step 2: Pass & LIFO
  const [step3Pedestals, setStep3Pedestals] = useState<PedestalsState>(() =>
    makeDemoPedestals([4, 3, 3], [5, 2], [2])
  );
  const [step3Burst, setStep3Burst] = useState<PedestalBurstEffect | null>(null);
  const [step3Status, setStep3Status] = useState<'idle' | 'animating' | 'passed_success' | 'placed_fail'>('idle');
  const [step3Log, setStep3Log] = useState<string[]>([
    '현재 차례: 1번 플레이어 — 빨강 칩 + 바위 4',
    '대기 2번: 루피 — 빨강 칩 + 바위 3 (놓으면 10+3=13 폭발 예정!)',
  ]);

  // Step 3: Rainbow Chip
  const [step4Pedestals, setStep4Pedestals] = useState<PedestalsState>(() =>
    makeDemoPedestals([5, 3, 3], [6, 4], [3, 2])
  );
  const [step4Burst, setStep4Burst] = useState<PedestalBurstEffect | null>(null);
  const [step4Status, setStep4Status] = useState<'idle' | 'burst_fail' | 'safe_done'>('idle');
  const [step4Msg, setStep4Msg] = useState<string>(
    '레인보우 칩 + 바위 2를 들고 있습니다. 안전한 받침대(추천: 초록 합 10→12)를 직접 눌러 배치해 보세요!'
  );

  const timersRef = useRef<number[]>([]);

  const clearTimers = () => {
    timersRef.current.forEach((id) => window.clearTimeout(id));
    timersRef.current = [];
  };

  useEffect(() => {
    return () => clearTimers();
  }, []);

  const resetAllSteps = () => {
    clearTimers();
    setStep(0);
    setPickedOrder([]);
    setOrderFeedback(null);
    setStep2Pedestals(makeDemoPedestals([4, 3, 3], [5, 2], [4]));
    setStep2Burst(null);
    setStep2Done(false);
    setStep2Msg(
      '빨강 받침대(합 10, 큐브 3개)에 바위 3을 직접 놓아 13 폭발이 어떻게 일어나는지 체험해 보세요.'
    );
    setStep3Pedestals(makeDemoPedestals([4, 3, 3], [5, 2], [2]));
    setStep3Burst(null);
    setStep3Status('idle');
    setStep3Log([
      '현재 차례: 1번 플레이어 — 빨강 칩 + 바위 4',
      '대기 2번: 루피 — 빨강 칩 + 바위 3 (놓으면 10+3=13 폭발 예정!)',
    ]);
    setStep4Pedestals(makeDemoPedestals([5, 3, 3], [6, 4], [3, 2]));
    setStep4Burst(null);
    setStep4Status('idle');
    setStep4Msg(
      '레인보우 칩 + 바위 2를 들고 있습니다. 안전한 받침대(추천: 초록 합 10→12)를 직접 눌러 배치해 보세요!'
    );
  };

  useEffect(() => {
    if (open) {
      resetAllSteps();
    } else {
      clearTimers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  const STEP_TITLES = [
    '1. 순서 결정',
    '2. 13 폭발 · 수거',
    '3. 패스 & 역순',
    '4. 레인보우 칩',
  ];

  const canGoNext =
    (step === 0 && pickedOrder.length === EXPECTED_ORDER_IDS.length) ||
    (step === 1 && step2Done) ||
    (step === 2 && step3Status === 'passed_success') ||
    (step === 3 && step4Status === 'safe_done');

  // Step 1 handler
  const handlePickOrderCandidate = (candidate: OrderCandidate) => {
    if (pickedOrder.includes(candidate.id)) return;
    const expectedId = EXPECTED_ORDER_IDS[pickedOrder.length];
    if (candidate.id === expectedId) {
      heavy13Sound.playSelect();
      const next = [...pickedOrder, candidate.id];
      setPickedOrder(next);
      if (next.length === 1) {
        setOrderFeedback('정답! 레인보우 칩(루피)은 숫자 1이어도 무조건 가장 먼저 놓습니다.');
      } else if (next.length === 2) {
        setOrderFeedback('정답! 같은 6일 때는 선 플레이어(뽀로로) 기준 시계 방향 우선입니다.');
      } else if (next.length === 3) {
        setOrderFeedback('정답! 뽀로로 다음 시계 방향인 플레이어가 3번째입니다.');
      } else {
        setOrderFeedback('완벽합니다! 순서 규칙(레인보우 → 높은 숫자 → 선 기준 시계 방향)을 마스터했습니다.');
      }
    } else {
      if (pickedOrder.length === 0) {
        setOrderFeedback('힌트: 숫자보다 먼저 "레인보우 칩"을 낸 플레이어가 최우선입니다!');
      } else if (pickedOrder.length === 1) {
        setOrderFeedback('힌트: 남은 중 가장 큰 숫자는 6입니다. 6이 두 명이라면 선(뽀로로)부터 시계 방향입니다!');
      } else {
        setOrderFeedback('힌트: 6을 낸 플레이어가 4를 낸 크롱보다 먼저입니다.');
      }
    }
  };

  // Step 2 handler
  const handleStep2Place = () => {
    if (step2Burst || step2Done) return;
    const preRed = step2Pedestals.red;
    const newCube: RockCube = {
      id: 'tut-red-new-3',
      value: 3,
      ownerId: 'p1',
      ownerName: '플레이어',
      roundPlaced: 4,
    };
    heavy13Sound.playOverflowPenalty();
    setStep2Burst({
      id: 'tut-burst-step2',
      color: 'red',
      actorName: '플레이어',
      penaltyAdded: preRed.length,
      sumAfter: 13,
      cubes: [...preRed, newCube],
    });
    setStep2Pedestals((prev) => ({ ...prev, red: [] }));
    const t = window.setTimeout(() => {
      setStep2Burst(null);
      setStep2Done(true);
      setStep2Msg(
        '폭발 완료! 10 + 3 = 정확히 13도 수거 대상입니다. 기존 큐브 3개만큼 벌점(+3)을 받고 빨강 받침대는 비워졌습니다.'
      );
    }, 1100);
    timersRef.current.push(t);
  };

  // Step 3 handlers
  const handleStep3DirectPlace = () => {
    if (step3Status !== 'idle') return;
    const preRed = step3Pedestals.red;
    const newCube: RockCube = {
      id: 'tut-s3-p1-4',
      value: 4,
      ownerId: 'p1',
      ownerName: '플레이어',
      roundPlaced: 4,
    };
    heavy13Sound.playOverflowPenalty();
    setStep3Burst({
      id: 'tut-burst-step3-fail',
      color: 'red',
      actorName: '플레이어',
      penaltyAdded: preRed.length,
      sumAfter: 14,
      cubes: [...preRed, newCube],
    });
    setStep3Pedestals((prev) => ({ ...prev, red: [] }));
    setStep3Status('placed_fail');
    setStep3Log([
      '플레이어가 빨강에 +4 배치 → 합계 14 폭발! 벌점 +3점을 받았습니다.',
      '아래 "다시 시도"를 눌러 이번에는 "패스 (후순위)"를 선택해 보세요!',
    ]);
    const t = window.setTimeout(() => setStep3Burst(null), 1100);
    timersRef.current.push(t);
  };

  const handleStep3Pass = () => {
    if (step3Status !== 'idle') return;
    heavy13Sound.playPass();
    setStep3Status('animating');
    setStep3Log(['1) 플레이어 패스 선택! 순서를 뒤로 미룹니다.']);

    const t1 = window.setTimeout(() => {
      const preRed = step3Pedestals.red;
      const aiCube: RockCube = {
        id: 'tut-s3-ai-3',
        value: 3,
        ownerId: 'ai2',
        ownerName: '루피',
        roundPlaced: 4,
      };
      heavy13Sound.playOverflowPenalty();
      setStep3Burst({
        id: 'tut-burst-step3-ai',
        color: 'red',
        actorName: '루피',
        penaltyAdded: preRed.length,
        sumAfter: 13,
        cubes: [...preRed, aiCube],
      });
      setStep3Pedestals((prev) => ({ ...prev, red: [] }));
      setStep3Log((prev) => [
        ...prev,
        '2) 루피가 빨강에 +3 배치 → 10+3=13 폭발! 루피 벌점 +3 · 빨강 비워짐!',
      ]);
    }, 650);

    const t2 = window.setTimeout(() => {
      setStep3Burst(null);
      heavy13Sound.playStonePlace();
      setStep3Pedestals((prev) => ({
        ...prev,
        red: [
          {
            id: 'tut-s3-p1-safe4',
            value: 4,
            ownerId: 'p1',
            ownerName: '플레이어',
            roundPlaced: 4,
          },
        ],
      }));
      setStep3Status('passed_success');
      setStep3Log((prev) => [
        ...prev,
        '3) 마지막 후순위로 플레이어가 빈 빨강(0→4)에 안전 배치! 벌점 0점으로 위기 탈출!',
      ]);
    }, 1850);

    timersRef.current.push(t1, t2);
  };

  // Step 4 handler
  const handleStep4SelectColor = (color: PedestalColor) => {
    if (step4Burst || step4Status === 'safe_done') return;
    if (color === 'red') {
      const preRed = step4Pedestals.red;
      const newCube: RockCube = {
        id: 'tut-s4-red-2',
        value: 2,
        ownerId: 'p1',
        ownerName: '플레이어',
        roundPlaced: 5,
      };
      heavy13Sound.playOverflowPenalty();
      setStep4Burst({
        id: 'tut-burst-step4',
        color: 'red',
        actorName: '플레이어',
        penaltyAdded: preRed.length,
        sumAfter: 13,
        cubes: [...preRed, newCube],
      });
      setStep4Pedestals((prev) => ({ ...prev, red: [] }));
      setStep4Status('burst_fail');
      setStep4Msg('빨강은 합계 11+2=13으로 폭발합니다! "초록" 또는 "파랑"으로 다시 선택해 보세요.');
      const t = window.setTimeout(() => {
        setStep4Burst(null);
        setStep4Pedestals(makeDemoPedestals([5, 3, 3], [6, 4], [3, 2]));
      }, 1100);
      timersRef.current.push(t);
      return;
    }

    heavy13Sound.playStonePlace();
    setStep4Pedestals((prev) => ({
      ...prev,
      [color]: [
        ...prev[color],
        {
          id: `tut-s4-${color}-2`,
          value: 2,
          ownerId: 'p1',
          ownerName: '플레이어',
          roundPlaced: 5,
        },
      ],
    }));
    setStep4Status('safe_done');
    setStep4Msg(
      color === 'green'
        ? '완벽한 선택! 초록 합계 12를 만들어 안전하게 피하고 뒤 플레이어들에게 13 압박을 넘겼습니다.'
        : `${PEDESTAL_META[color].shortKo} 받침대에 안전하게 배치했습니다! 레인보우는 다 쓴 색에도 놓을 수 있는 만능 칩입니다.`
    );
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/55 dark:bg-black/80 p-2.5 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="무거운 13 튜토리얼"
    >
      <div className="w-full max-w-3xl max-h-[94vh] overflow-y-auto obsidian-panel rounded-xl p-4 sm:p-6 space-y-4 sm:space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-200 dark:border-white/10">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-sky-50 border border-sky-300 theme-text-sky dark:bg-lounge-sky-900/50 dark:border-lounge-sky-400/40 flex items-center justify-center shrink-0">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="font-display text-lg sm:text-xl font-bold theme-text-primary truncate">
                무거운 13 인터랙티브 튜토리얼
              </h2>
              <p className="text-[11px] sm:text-xs theme-text-muted">
                핵심 규칙 4가지를 직접 눌러보며 익혀보세요.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="튜토리얼 닫기"
            className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-lg border border-slate-300 bg-slate-50 text-slate-700 hover:border-slate-400 hover:text-slate-900 dark:border-white/10 dark:bg-obsidian-850 dark:text-lounge-slate-300 dark:hover:border-white/25 dark:hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Stepper Tabs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 p-1 rounded-xl obsidian-subpanel">
          {STEP_TITLES.map((label, idx) => (
            <button
              key={label}
              type="button"
              onClick={() => setStep(idx)}
              className={[
                'py-2 px-2 rounded-lg text-[11px] sm:text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap',
                step === idx
                  ? 'bg-gold-400 text-gold-950 font-bold'
                  : 'text-slate-600 hover:text-slate-900 dark:text-lounge-slate-300 dark:hover:text-white',
              ].join(' ')}
            >
              {label}
            </button>
          ))}
        </div>

        {/* STEP 0: ORDER DETERMINATION */}
        {step === 0 && (
          <div className="space-y-4">
            <div className="obsidian-subpanel rounded-xl p-3.5 sm:p-4 space-y-1.5">
              <div className="text-xs sm:text-sm font-bold theme-text-gold-strong">
                미션: 이번 라운드 배치 순서(1번 → 4번)대로 플레이어를 클릭하세요!
              </div>
              <p className="text-xs theme-text-secondary">
                현재 선 플레이어는 <strong className="theme-text-gold">뽀로로 (2번 자리)</strong>입니다.
                규칙: <strong>레인보우 칩 우선 → 높은 바위 숫자 → 선 기준 시계 방향</strong>
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {ORDER_CANDIDATES.map((c, idx) => {
                const pickedRank = pickedOrder.indexOf(c.id);
                const isPicked = pickedRank !== -1;
                return (
                  <button
                    key={c.id}
                    type="button"
                    disabled={isPicked}
                    onClick={() => handlePickOrderCandidate(c)}
                    className={[
                      'rounded-xl border p-3 text-left transition-all flex flex-col justify-between gap-2 min-h-[96px]',
                      isPicked
                        ? 'bg-emerald-50 border-emerald-400 dark:bg-emerald-950/50 dark:border-emerald-400/70 cursor-default'
                        : 'bg-white border-slate-300 hover:border-gold-500 dark:bg-obsidian-850 dark:border-lounge-slate-700 dark:hover:border-gold-400 cursor-pointer',
                    ].join(' ')}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-mono-tabular text-[11px] theme-text-muted">
                        {idx + 1}번 자리 {c.isFirst ? '· 선' : ''}
                      </span>
                      {isPicked && (
                        <span className="font-mono-tabular text-xs font-extrabold theme-text-emerald">
                          {pickedRank + 1}순위
                        </span>
                      )}
                    </div>
                    <div className="text-sm font-bold theme-text-primary">{c.name}</div>
                    <div className="flex items-center justify-between pt-1 border-t border-slate-200 dark:border-white/10 text-xs font-mono-tabular">
                      <span className="inline-flex items-center gap-1.5 theme-text-secondary">
                        <ChipMiniEmblem chip={c.chip} size="sm" />
                        {CHIP_META[c.chip].shortKo}
                      </span>
                      <span className="font-bold theme-text-gold-strong">바위 {c.card}</span>
                    </div>
                  </button>
                );
              })}
            </div>

            {orderFeedback && (
              <div
                className={[
                  'rounded-xl border px-3.5 py-2.5 text-xs sm:text-sm font-semibold flex items-center gap-2',
                  pickedOrder.length === EXPECTED_ORDER_IDS.length
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-800 dark:bg-emerald-950/60 dark:border-emerald-400/60 dark:text-emerald-200'
                    : 'bg-sky-50 border-sky-300 text-sky-800 dark:bg-obsidian-850 dark:border-lounge-sky-400/50 dark:text-lounge-sky-200',
                ].join(' ')}
              >
                {pickedOrder.length === EXPECTED_ORDER_IDS.length && (
                  <CheckCircle2 className="w-4 h-4 theme-text-emerald shrink-0" />
                )}
                <span>{orderFeedback}</span>
              </div>
            )}
          </div>
        )}

        {/* STEP 1: 13 OVERFLOW & COLLECTION */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="obsidian-subpanel rounded-xl p-3.5 sm:p-4 space-y-1">
              <div className="text-xs sm:text-sm font-bold theme-text-gold-strong">
                미션: 빨강 받침대(합 10)에 바위 3을 올려 정확히 13 폭발 체험하기
              </div>
              <p className="text-xs theme-text-secondary">{step2Msg}</p>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {(['red', 'green', 'blue'] as PedestalColor[]).map((color) => (
                <PedestalStation
                  key={color}
                  color={color}
                  cubes={step2Pedestals[color]}
                  isHighlightedTarget={color === 'red'}
                  isSelectableTarget={color === 'red' && !step2Done && !step2Burst}
                  previewAddValue={color === 'red' && !step2Done ? 3 : null}
                  isMyTurnPreview={true}
                  burstEffect={step2Burst}
                  onSelectTarget={color === 'red' ? handleStep2Place : undefined}
                />
              ))}
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2">
              {step2Done && (
                <button
                  type="button"
                  onClick={() => {
                    setStep2Pedestals(makeDemoPedestals([4, 3, 3], [5, 2], [4]));
                    setStep2Burst(null);
                    setStep2Done(false);
                    setStep2Msg(
                      '빨강 받침대(합 10, 큐브 3개)에 바위 3을 직접 놓아 13 폭발이 어떻게 일어나는지 체험해 보세요.'
                    );
                  }}
                  className="min-h-[44px] inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-300 bg-white text-slate-700 hover:text-slate-900 dark:border-lounge-slate-700 dark:bg-transparent dark:text-lounge-slate-200 dark:hover:text-white text-xs sm:text-sm font-semibold cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  다시 체험
                </button>
              )}
              {!step2Done && (
                <button
                  type="button"
                  disabled={Boolean(step2Burst)}
                  onClick={handleStep2Place}
                  className="min-h-[44px] px-5 py-2.5 rounded-xl bg-gold-400 hover:bg-gold-300 disabled:opacity-45 text-gold-950 font-bold text-sm cursor-pointer"
                >
                  빨강 받침대에 바위 3 배치
                </button>
              )}
            </div>
          </div>
        )}

        {/* STEP 2: PASS & LIFO */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="obsidian-subpanel rounded-xl p-3.5 sm:p-4 space-y-1">
              <div className="text-xs sm:text-sm font-bold theme-text-gold-strong">
                미션: 13 폭발 위기에서 &apos;패스 (후순위)&apos;로 벌점 회피하기
              </div>
              <p className="text-xs theme-text-secondary">
                내가 먼저 빨강(합 10)에 바위 4를 놓으면 폭발합니다. 하지만 뒤에 <strong className="theme-text-primary">루피(빨강/3)</strong>가 기다리고 있습니다!
                <span className="block theme-text-muted mt-0.5">
                  ※ 여러 명이 패스하면 패스한 순서의 역순(LIFO)으로 놓으며, 패스하지 않은 마지막 사람은 패스 불가
                </span>
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {(['red', 'green', 'blue'] as PedestalColor[]).map((color) => (
                <PedestalStation
                  key={color}
                  color={color}
                  cubes={step3Pedestals[color]}
                  isHighlightedTarget={color === 'red'}
                  previewAddValue={color === 'red' && step3Status === 'idle' ? 4 : null}
                  isMyTurnPreview={true}
                  burstEffect={step3Burst}
                />
              ))}
            </div>

            <div className="obsidian-subpanel rounded-xl p-3 space-y-1 text-xs theme-text-secondary">
              {step3Log.map((line, i) => (
                <div key={i}>{line}</div>
              ))}
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2">
              {step3Status !== 'idle' && step3Status !== 'animating' && (
                <button
                  type="button"
                  onClick={() => {
                    clearTimers();
                    setStep3Pedestals(makeDemoPedestals([4, 3, 3], [5, 2], [2]));
                    setStep3Burst(null);
                    setStep3Status('idle');
                    setStep3Log([
                      '현재 차례: 1번 플레이어 — 빨강 칩 + 바위 4',
                      '대기 2번: 루피 — 빨강 칩 + 바위 3 (놓으면 10+3=13 폭발 예정!)',
                    ]);
                  }}
                  className="min-h-[44px] inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-300 bg-white text-slate-700 hover:text-slate-900 dark:border-lounge-slate-700 dark:bg-transparent dark:text-lounge-slate-200 dark:hover:text-white text-xs sm:text-sm font-semibold cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  다시 시도
                </button>
              )}

              {step3Status === 'idle' && (
                <>
                  <button
                    type="button"
                    onClick={handleStep3Pass}
                    className="min-h-[44px] px-4 py-2.5 rounded-xl border border-sky-300 bg-sky-50 hover:bg-sky-100 text-sky-700 dark:border-lounge-sky-400/60 dark:bg-lounge-sky-900/50 dark:hover:bg-lounge-sky-900 dark:text-lounge-sky-200 font-bold text-sm cursor-pointer"
                  >
                    패스 (후순위)
                  </button>
                  <button
                    type="button"
                    onClick={handleStep3DirectPlace}
                    className="min-h-[44px] px-4 py-2.5 rounded-xl bg-gold-400 hover:bg-gold-300 text-gold-950 font-bold text-sm cursor-pointer"
                  >
                    빨강 받침대에 배치
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {/* STEP 3: RAINBOW CHIP */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="obsidian-subpanel rounded-xl p-3.5 sm:p-4 space-y-1">
              <div className="text-xs sm:text-sm font-bold theme-text-gold-strong">
                미션: 레인보우 칩 + 바위 2로 원하는 안전한 받침대 선택하기
              </div>
              <p className="text-xs theme-text-secondary">{step4Msg}</p>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {(['red', 'green', 'blue'] as PedestalColor[]).map((color) => (
                <PedestalStation
                  key={color}
                  color={color}
                  cubes={step4Pedestals[color]}
                  isSelectableTarget={step4Status !== 'safe_done' && !step4Burst}
                  previewAddValue={step4Status !== 'safe_done' ? 2 : null}
                  isMyTurnPreview={true}
                  burstEffect={step4Burst}
                  onSelectTarget={() => handleStep4SelectColor(color)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Footer Navigation */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-200 dark:border-white/10">
          <div className="text-xs theme-text-muted font-mono-tabular">
            단계 {step + 1} / {STEP_TITLES.length}
          </div>

          <div className="flex items-center gap-2">
            {step > 0 && (
              <button
                type="button"
                onClick={() => setStep((s) => Math.max(0, s - 1))}
                className="min-h-[44px] px-4 py-2 rounded-xl border border-slate-300 bg-white text-slate-700 hover:text-slate-900 dark:border-lounge-slate-700 dark:bg-transparent dark:text-lounge-slate-200 dark:hover:text-white text-xs sm:text-sm font-semibold cursor-pointer"
              >
                이전
              </button>
            )}

            {step < STEP_TITLES.length - 1 ? (
              <button
                type="button"
                onClick={() => setStep((s) => Math.min(STEP_TITLES.length - 1, s + 1))}
                className={[
                  'min-h-[44px] inline-flex items-center gap-1.5 px-5 py-2 rounded-xl font-bold text-xs sm:text-sm transition-colors cursor-pointer',
                  canGoNext
                    ? 'bg-gold-400 hover:bg-gold-300 text-gold-950'
                    : 'border border-slate-300 bg-slate-50 text-slate-700 hover:border-gold-500 dark:border-lounge-slate-600 dark:bg-obsidian-850 dark:text-lounge-slate-200 dark:hover:border-gold-400',
                ].join(' ')}
              >
                다음 단계
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onStartRealMatch();
                }}
                className="min-h-[44px] inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-gold-400 hover:bg-gold-300 text-gold-950 font-bold text-xs sm:text-sm cursor-pointer"
              >
                <Play className="w-4 h-4 fill-current" />
                실전 게임 시작하기
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
