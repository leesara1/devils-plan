import React from 'react';
import { BookOpen, Pause, SkipForward, Volume2, VolumeX } from 'lucide-react';
import {
  CHIP_META,
  ChipType,
  HALF_ROUND,
  OVERFLOW_THRESHOLD,
  PEDESTAL_COLORS,
  PEDESTAL_META,
  PedestalColor,
  PedestalsState,
  PlacementEventLog,
  PlayerState,
  ROCK_NUMBERS,
  RockNumber,
  RoundHistoryRecord,
  SecretSubmission,
  TOTAL_ROUNDS,
  TurnOrderEntry,
  getPedestalSum,
} from '../engine/heavy13';
import { GameShell, RoundPhase } from '../engine/heavy13Reducer';
import { heavy13Sound } from '../audio/heavy13Sound';
import { Heavy13HistoryPanel } from './Heavy13HistoryPanel';
import {
  ChipMiniEmblem,
  ChipTokenButton,
  PedestalBurstEffect,
  PedestalStation,
  RevealFlipCard,
  RockCardButton,
} from './Heavy13Pieces';
import { Heavy13Round1Hint } from './Heavy13Round1Hint';

interface Heavy13PlayArenaProps {
  shell: GameShell;
  roundNumber: number;
  phase: RoundPhase;
  phaseTitle: string;
  memoryMode: boolean;
  muted: boolean;
  rulesOpen: boolean;
  submitTimeDisplay: string;
  submitTimeLeftMs: number;
  players: PlayerState[];
  pedestals: PedestalsState;
  firstPlayerSeat: number;
  submissions: Record<string, SecretSubmission>;
  revealedCardIds: string[];
  passedThisRoundIds: string[];
  placementQueue: TurnOrderEntry[];
  deferredPassStack: TurnOrderEntry[];
  previewPlacementOrder: TurnOrderEntry[];
  allCardsRevealed: boolean;
  roundLogs: PlacementEventLog[];
  roundHistory: RoundHistoryRecord[];
  roundLastPenaltyPlayerId: string | null;
  highlightedPedestal: PedestalColor | null;
  newlyPlacedCubeId: string | null;
  pedestalBurst: PedestalBurstEffect | null;
  showSet2Transition: boolean;
  round1HintsEnabled: boolean;
  currentSubmittingPlayer: PlayerState | null;
  activePlacementEntry: TurnOrderEntry | null;
  activePlacementPlayer: PlayerState | null;
  selectedCard: RockNumber | null;
  selectedChip: ChipType | null;
  isHumanPlacementTurn: boolean;
  humanCanPass: boolean;
  onSelectCard: (card: RockNumber) => void;
  onSelectChip: (chip: ChipType) => void;
  onConfirmSubmission: () => void;
  onBeginHumanSubmission: () => void;
  onStartPlacementImmediately: () => void;
  onExecutePlacement: (action: 'PASS' | 'PLACE', targetColor?: PedestalColor) => void;
  onNextRound: () => void;
  onDismissSet2Transition: () => void;
  onDismissRound1Hints: () => void;
  onOpenRules: () => void;
  onToggleMute: () => void;
  onPause: () => void;
  onResume: () => void;
  onRestartMatch: () => void;
  onReturnToTitle: () => void;
  onExitToHub?: () => void;
}

export const Heavy13PlayArena: React.FC<Heavy13PlayArenaProps> = ({
  shell,
  roundNumber,
  phase,
  phaseTitle,
  memoryMode,
  muted,
  rulesOpen,
  submitTimeDisplay,
  submitTimeLeftMs,
  players,
  pedestals,
  firstPlayerSeat,
  submissions,
  revealedCardIds,
  passedThisRoundIds,
  placementQueue,
  deferredPassStack,
  previewPlacementOrder,
  allCardsRevealed,
  roundLogs,
  roundHistory,
  roundLastPenaltyPlayerId,
  highlightedPedestal,
  newlyPlacedCubeId,
  pedestalBurst,
  showSet2Transition,
  round1HintsEnabled,
  currentSubmittingPlayer,
  activePlacementEntry,
  activePlacementPlayer,
  selectedCard,
  selectedChip,
  isHumanPlacementTurn,
  humanCanPass,
  onSelectCard,
  onSelectChip,
  onConfirmSubmission,
  onBeginHumanSubmission,
  onStartPlacementImmediately,
  onExecutePlacement,
  onNextRound,
  onDismissSet2Transition,
  onDismissRound1Hints,
  onOpenRules,
  onToggleMute,
  onPause,
  onResume,
  onRestartMatch,
  onReturnToTitle,
  onExitToHub,
}) => {
  const isBurstAnimating = pedestalBurst !== null;
  const isRainbowSelectionActive =
    isHumanPlacementTurn &&
    activePlacementEntry?.chip === 'rainbow' &&
    !isBurstAnimating;

  return (
    <>
      <div className="relative z-10 flex-1 flex flex-col max-w-6xl w-full mx-auto px-2.5 sm:px-6 py-2 sm:py-4 gap-2 sm:gap-4">
        {/* Top HUD */}
        <header className="obsidian-panel flex items-center justify-between gap-2 sm:gap-3 px-2.5 sm:px-4 py-1.5 sm:py-2.5 rounded-xl">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <span className="font-display font-bold text-sm sm:text-lg text-gold-200 whitespace-nowrap">
              무거운 13
            </span>
            <span className="text-lounge-slate-500" aria-hidden="true">·</span>
            <span className="font-mono-tabular text-xs sm:text-sm font-semibold text-lounge-slate-200 whitespace-nowrap">
              {roundNumber}/{TOTAL_ROUNDS}R
              <span className="hidden sm:inline text-lounge-slate-400 ml-1.5">
                (세트 {roundNumber <= HALF_ROUND ? '1' : '2'})
              </span>
            </span>
            <span className="hidden md:inline text-lounge-slate-500" aria-hidden="true">·</span>
            <span className="hidden md:inline text-xs sm:text-sm font-semibold text-lounge-sky-300 truncate">
              {phaseTitle}
            </span>
            {memoryMode && (
              <>
                <span className="hidden sm:inline text-lounge-slate-500" aria-hidden="true">·</span>
                <span className="hidden sm:inline text-xs font-semibold text-gold-300 whitespace-nowrap">
                  기억 모드
                </span>
              </>
            )}
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {phase === 'SUBMISSION' && (
              <span
                className={[
                  'font-mono-tabular text-xs sm:text-sm font-bold px-2 sm:px-2.5 py-1 rounded-lg obsidian-subpanel',
                  submitTimeLeftMs <= 15000 ? 'text-rival-400' : 'text-lounge-sky-300',
                ].join(' ')}
              >
                {submitTimeDisplay}
              </span>
            )}
            <button
              type="button"
              onClick={onOpenRules}
              aria-label="게임 규칙"
              className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-lg border border-lounge-slate-700 bg-obsidian-850 text-lounge-slate-200 hover:border-gold-500/70 hover:text-white transition-colors cursor-pointer"
            >
              <BookOpen className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onToggleMute}
              aria-label={muted ? '소리 켜기' : '음소거'}
              className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-lg border border-lounge-slate-700 bg-obsidian-850 text-lounge-slate-200 hover:border-gold-500/70 hover:text-white transition-colors cursor-pointer"
            >
              {muted ? (
                <VolumeX className="w-4 h-4 text-rival-400" />
              ) : (
                <Volume2 className="w-4 h-4 text-gold-400" />
              )}
            </button>
            <button
              type="button"
              onClick={onPause}
              aria-label="일시정지"
              className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-lg border border-lounge-slate-700 bg-obsidian-850 text-lounge-slate-200 hover:border-gold-500/70 hover:text-white transition-colors cursor-pointer"
            >
              <Pause className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Player Seating Strip (Clockwise order) */}
        <section
          aria-label="플레이어 현황"
          className={`grid gap-1.5 sm:gap-2.5 ${
            players.length === 3
              ? 'grid-cols-3'
              : players.length === 4
                ? 'grid-cols-2 lg:grid-cols-4'
                : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4'
          }`}
        >
          {players.map((p) => {
            const isFirst = p.seatIndex === firstPlayerSeat;
            const isTurn =
              (phase === 'SUBMISSION' && currentSubmittingPlayer?.id === p.id) ||
              (phase === 'PLACEMENT_STEP' && activePlacementPlayer?.id === p.id);
            const sub = submissions[p.id];
            const showChip =
              sub &&
              (phase === 'REVEAL_CHIPS' ||
                phase === 'REVEAL_CARDS' ||
                phase === 'PLACEMENT_STEP' ||
                phase === 'ROUND_SUMMARY');
            const isCardFlipped =
              sub &&
              (phase === 'PLACEMENT_STEP' ||
                phase === 'ROUND_SUMMARY' ||
                (phase === 'REVEAL_CARDS' && revealedCardIds.includes(p.id)));
            const hasPassed = passedThisRoundIds.includes(p.id);

            return (
              <div
                key={p.id}
                className={[
                  'rounded-lg sm:rounded-xl border px-2.5 sm:px-3.5 py-1.5 sm:py-2.5 flex items-center justify-between gap-1.5 sm:gap-2.5 transition-colors',
                  isTurn
                    ? 'bg-obsidian-800 border-gold-400 shadow-[0_0_16px_rgba(229,193,88,0.16)]'
                    : 'bg-obsidian-850/90 border-lounge-slate-700/80',
                ].join(' ')}
              >
                <div className="min-w-0 flex-1 space-y-0.5 sm:space-y-1.5">
                  <div className="flex items-center justify-between gap-1">
                    <div className="flex items-center gap-1 sm:gap-1.5 min-w-0">
                      <span className="font-mono-tabular text-[10px] sm:text-[11px] text-lounge-slate-400 shrink-0">
                        {p.seatIndex + 1}번
                      </span>
                      <span className="text-[11px] sm:text-sm font-bold text-white truncate">
                        {p.name}
                      </span>
                    </div>
                    {isFirst && (
                      <span className="text-[10px] sm:text-[11px] font-bold text-gold-300 shrink-0">
                        선
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs">
                    <span className="font-mono-tabular text-rival-400 font-bold whitespace-nowrap">
                      벌점 {p.penaltyPoints}
                    </span>
                    <span className="text-lounge-slate-500" aria-hidden="true">·</span>
                    {showChip ? (
                      <span className="inline-flex items-center gap-1 sm:gap-1.5 font-mono-tabular text-lounge-slate-300 whitespace-nowrap">
                        <ChipMiniEmblem chip={sub.chip} size="sm" />
                        <span>{CHIP_META[sub.chip].shortKo}</span>
                        {hasPassed && (
                          <span className="text-lounge-sky-300 font-semibold">(패스)</span>
                        )}
                      </span>
                    ) : (
                      <span className="font-mono-tabular text-lounge-slate-400 whitespace-nowrap">
                        {p.cards.length}장
                      </span>
                    )}
                  </div>
                </div>

                {showChip && sub && (
                  <RevealFlipCard
                    value={sub.card}
                    flipped={Boolean(isCardFlipped)}
                    isHighlighted={isTurn}
                  />
                )}
              </div>
            );
          })}
        </section>

        {/* Round 1 Contextual Guidance Bubble */}
        {roundNumber === 1 &&
          round1HintsEnabled &&
          shell === 'PLAYING' &&
          !showSet2Transition &&
          !rulesOpen && (
            <Heavy13Round1Hint
              phase={phase}
              isHumanPlacementTurn={isHumanPlacementTurn}
              activeChip={activePlacementEntry?.chip}
              humanCanPass={humanCanPass}
              isBurstAnimating={isBurstAnimating}
              onDismiss={onDismissRound1Hints}
            />
          )}

        {/* Staged Reveal & Large Placement Order Showcase */}
        {(phase === 'REVEAL_CHIPS' || phase === 'REVEAL_CARDS') && (
          <section className="obsidian-sky-panel rounded-2xl p-4 sm:p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="space-y-1">
                <h2 className="font-display text-lg sm:text-xl font-bold text-gold-200">
                  {phase === 'REVEAL_CHIPS'
                    ? '1단계 · 색깔 칩 공개'
                    : allCardsRevealed
                      ? '이번 라운드 배치 순서 확정'
                      : `2단계 · 바위 카드 공개 (${revealedCardIds.length}/${players.length})`}
                </h2>
                <p className="text-xs sm:text-sm text-lounge-slate-300">
                  {phase === 'REVEAL_CHIPS'
                    ? '모든 플레이어의 색깔 칩이 공개되었습니다. 잠시 후 시계 방향으로 바위 카드가 한 장씩 뒤집힙니다.'
                    : allCardsRevealed
                      ? `레인보우 우선 · 높은 숫자 순 · 선(${players.find((pl) => pl.seatIndex === firstPlayerSeat)?.name ?? ''}) 기준 시계 방향`
                      : '선 플레이어부터 시계 방향으로 제출한 바위 카드를 공개하고 있습니다...'}
                </p>
              </div>

              {phase === 'REVEAL_CARDS' && (
                <button
                  type="button"
                  onClick={onStartPlacementImmediately}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-gold-400 hover:bg-gold-300 text-gold-950 font-bold text-sm transition-colors cursor-pointer whitespace-nowrap"
                >
                  <SkipForward className="w-4 h-4" />
                  바로 배치 진행
                </button>
              )}
            </div>

            {phase === 'REVEAL_CARDS' && allCardsRevealed && previewPlacementOrder.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-2.5 pt-1">
                {previewPlacementOrder.map((entry, idx) => {
                  const p = players.find((pl) => pl.id === entry.playerId);
                  if (!p) return null;
                  return (
                    <div
                      key={`order-spotlight-${entry.playerId}`}
                      className="animate-order-reveal rounded-xl border border-gold-400/50 bg-obsidian-900/95 px-3 py-3 flex flex-col justify-between gap-2 shadow-md"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono-tabular text-sm sm:text-base font-extrabold text-gold-300">
                          {idx + 1}번
                        </span>
                        <ChipMiniEmblem chip={entry.chip} size="sm" />
                      </div>
                      <div className="text-xs sm:text-sm font-bold text-white truncate">
                        {p.name}
                      </div>
                      <div className="flex items-center justify-between gap-1 text-[11px] font-mono-tabular text-lounge-slate-300 pt-1 border-t border-white/10">
                        <span>{CHIP_META[entry.chip].shortKo}</span>
                        <span className="font-bold text-gold-200">바위 {entry.card}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {/* Center Stage: 3 Bearer Pedestals + Live Placement Queue/Feed */}
        <div className="grid grid-cols-1 lg:grid-cols-[1.6fr_1fr] gap-2.5 sm:gap-4 items-stretch">
          {/* 3 Pedestals */}
          <section className="obsidian-panel rounded-2xl p-2.5 sm:p-5 flex flex-col justify-between gap-2 sm:gap-3">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-xs sm:text-base font-bold text-gold-200">
                짐꾼 받침대 (13 이상 수거)
              </h2>
              <span className="text-[11px] sm:text-xs text-lounge-slate-400 truncate">
                {isBurstAnimating
                  ? '수거 연출 진행 중...'
                  : isRainbowSelectionActive
                    ? '배치할 받침대 선택'
                    : isHumanPlacementTurn
                      ? '합계·안전 여부 확인'
                      : '12 이하 안전'}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-1.5 sm:gap-3">
              {PEDESTAL_COLORS.map((color) => {
                const previewValue =
                  isHumanPlacementTurn &&
                  !isBurstAnimating &&
                  activePlacementEntry &&
                  (activePlacementEntry.chip === 'rainbow' ||
                    activePlacementEntry.chip === color)
                    ? activePlacementEntry.card
                    : phase === 'SUBMISSION' &&
                        selectedCard !== null &&
                        (selectedChip === color || selectedChip === 'rainbow')
                      ? selectedCard
                      : null;

                return (
                  <PedestalStation
                    key={color}
                    color={color}
                    cubes={pedestals[color]}
                    isHighlightedTarget={
                      highlightedPedestal === color ||
                      (phase === 'PLACEMENT_STEP' && activePlacementEntry?.chip === color)
                    }
                    isSelectableTarget={isRainbowSelectionActive}
                    previewAddValue={previewValue}
                    isMyTurnPreview={isHumanPlacementTurn}
                    newlyPlacedCubeId={newlyPlacedCubeId}
                    burstEffect={pedestalBurst}
                    onSelectTarget={
                      isRainbowSelectionActive
                        ? () => onExecutePlacement('PLACE', color)
                        : undefined
                    }
                  />
                );
              })}
            </div>
          </section>

          {/* Right: Placement Queue & Round Log */}
          <aside
            className={[
              'obsidian-panel rounded-2xl p-3 sm:p-5 flex-col justify-between gap-3',
              phase === 'SUBMISSION' || phase === 'PASS_TO_HUMAN' ? 'hidden lg:flex' : 'flex',
            ].join(' ')}
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-sm font-bold text-lounge-sky-300">
                  배치 순서 및 진행 기록
                </h2>
                <span className="font-mono-tabular text-xs text-lounge-slate-400">
                  {phase === 'SUBMISSION' || phase === 'PASS_TO_HUMAN'
                    ? '비공개 제출 중'
                    : `로그 ${roundLogs.length}건`}
                </span>
              </div>

              {(phase === 'REVEAL_CARDS' || phase === 'PLACEMENT_STEP') && (
                <div className="obsidian-subpanel rounded-xl p-3 space-y-2">
                  <div className="text-[11px] font-semibold text-lounge-slate-400">
                    남은 배치 대기열
                  </div>
                  <div className="flex flex-wrap gap-1.5 text-xs">
                    {placementQueue.map((entry, idx) => {
                      const p = players.find((pl) => pl.id === entry.playerId);
                      return (
                        <span
                          key={`${entry.playerId}-q-${idx}`}
                          className={[
                            'font-mono-tabular px-2 py-1 rounded border',
                            idx === 0 && phase === 'PLACEMENT_STEP'
                              ? 'bg-gold-400/20 border-gold-400 text-gold-200 font-bold'
                              : 'bg-obsidian-900 border-lounge-slate-700 text-lounge-slate-300',
                          ].join(' ')}
                        >
                          {p?.name.replace(' AI', '')} ({CHIP_META[entry.chip].shortKo}/{entry.card})
                        </span>
                      );
                    })}
                    {[...deferredPassStack]
                      .reverse()
                      .map((entry, idx) => {
                        const p = players.find((pl) => pl.id === entry.playerId);
                        return (
                          <span
                            key={`${entry.playerId}-def-${idx}`}
                            className="font-mono-tabular px-2 py-1 rounded border border-lounge-sky-400/40 bg-lounge-sky-900/40 text-lounge-sky-200"
                          >
                            보류: {p?.name.replace(' AI', '')} ({entry.card})
                          </span>
                        );
                      })}
                  </div>
                </div>
              )}

              <div className="obsidian-subpanel rounded-xl p-3 space-y-1.5 max-h-[210px] overflow-y-auto text-xs">
                {roundLogs.length === 0 ? (
                  <p className="text-lounge-slate-500 py-4 text-center">
                    큐브가 배치되면 이곳에 기록이 표시됩니다.
                  </p>
                ) : (
                  roundLogs.map((log) => (
                    <div
                      key={log.id}
                      className="flex items-center justify-between gap-2 py-1 border-b border-white/5 last:border-none"
                    >
                      <span className="text-lounge-slate-200 truncate">
                        <strong className="text-white">{log.playerName}</strong>
                        {log.action === 'PASS'
                          ? ` · 패스 (바위 ${log.card} 후순위)`
                          : ` · ${PEDESTAL_META[log.targetColor!].shortKo}에 +${log.card}`}
                      </span>
                      {log.action === 'PLACE' && (
                        <span
                          className={[
                            'font-mono-tabular font-semibold whitespace-nowrap',
                            log.overflowed ? 'text-rival-400' : 'text-lounge-slate-400',
                          ].join(' ')}
                        >
                          {log.overflowed
                            ? `폭발(${log.sumAfter}) +${log.collectedCount}벌점`
                            : `${log.sumBefore}→${log.sumAfter}`}
                        </span>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </aside>
        </div>

        {/* Bottom Interactive Action Deck */}
        {phase === 'SUBMISSION' && currentSubmittingPlayer && (
          <section className="obsidian-panel rounded-2xl p-2.5 sm:p-5 space-y-2.5 sm:space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3">
              <div className="flex items-center justify-between sm:block gap-2">
                <h3 className="text-xs sm:text-base font-bold text-gold-200 truncate">
                  {currentSubmittingPlayer.name} · 카드 및 칩 선택
                </h3>
                <p className="hidden sm:block text-xs text-lounge-slate-400 mt-0.5">
                  바위 카드 1장과 색깔 칩 1개를 선택한 뒤 제출하세요.
                </p>
              </div>
              <button
                type="button"
                disabled={selectedCard === null || selectedChip === null}
                onClick={onConfirmSubmission}
                className="w-full sm:w-auto min-h-[44px] px-5 py-2.5 rounded-xl bg-gold-400 hover:bg-gold-300 disabled:bg-lounge-slate-800 disabled:text-lounge-slate-500 text-gold-950 font-bold text-sm transition-colors cursor-pointer disabled:cursor-not-allowed whitespace-nowrap"
              >
                비공개 제출 확정
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-2.5 sm:gap-4">
              {/* 7 Rock Cards (0..6) */}
              <div className="space-y-1 sm:space-y-1.5">
                <div className="text-[11px] sm:text-xs font-semibold text-lounge-slate-400">
                  바위 카드 ({currentSubmittingPlayer.cards.length}/7장)
                </div>
                <div className="grid grid-cols-7 gap-1 sm:gap-2">
                  {ROCK_NUMBERS.map((num) => (
                    <RockCardButton
                      key={num}
                      value={num}
                      available={currentSubmittingPlayer.cards.includes(num)}
                      selected={selectedCard === num}
                      onClick={() => {
                        heavy13Sound.playSelect();
                        onSelectCard(num);
                      }}
                    />
                  ))}
                </div>
              </div>

              {/* 4 Chip Types */}
              <div className="space-y-1 sm:space-y-1.5">
                <div className="text-[11px] sm:text-xs font-semibold text-lounge-slate-400">
                  색깔 칩
                </div>
                <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
                  {(['red', 'green', 'blue', 'rainbow'] as ChipType[]).map((chip) => (
                    <ChipTokenButton
                      key={chip}
                      chip={chip}
                      count={currentSubmittingPlayer.chips[chip]}
                      selected={selectedChip === chip}
                      onClick={() => {
                        heavy13Sound.playSelect();
                        onSelectChip(chip);
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}

        {phase === 'PASS_TO_HUMAN' && currentSubmittingPlayer && (
          <section className="obsidian-sky-panel rounded-2xl p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
            <div className="space-y-1">
              <h3 className="font-display text-lg sm:text-xl font-bold text-gold-200">
                {currentSubmittingPlayer.name} 차례 준비
              </h3>
              <p className="text-xs sm:text-sm text-lounge-slate-300">
                이전 플레이어의 제출은 비공개 저장되었습니다. 화면을 <strong className="text-white">{currentSubmittingPlayer.name}</strong>에게 넘겨주세요.
              </p>
            </div>
            <button
              type="button"
              onClick={onBeginHumanSubmission}
              className="w-full sm:w-auto min-h-[44px] px-5 py-3 rounded-xl bg-gold-400 hover:bg-gold-300 text-gold-950 font-bold text-sm transition-colors cursor-pointer whitespace-nowrap"
            >
              선택 시작
            </button>
          </section>
        )}

        {phase === 'PLACEMENT_STEP' && activePlacementEntry && activePlacementPlayer && (
          <section className="obsidian-panel rounded-2xl p-3 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
            {activePlacementPlayer.isHuman ? (
              <>
                <div className="space-y-1">
                  <h3 className="text-sm sm:text-base font-bold text-gold-200">
                    {activePlacementPlayer.name}의 배치 차례 · {CHIP_META[activePlacementEntry.chip].labelKo} (바위 {activePlacementEntry.card})
                  </h3>
                  <p className="text-xs sm:text-sm text-lounge-slate-300">
                    {isBurstAnimating
                      ? '받침대 폭발·수거 연출이 끝난 뒤 배치할 수 있습니다.'
                      : activePlacementEntry.chip === 'rainbow'
                        ? '위 3개 받침대 중 원하는 색상을 선택해 배치하거나, 1회 패스해 순서를 뒤로 미룰 수 있습니다.'
                        : (() => {
                            const curSum = getPedestalSum(pedestals[activePlacementEntry.chip]);
                            const nextSum = curSum + activePlacementEntry.card;
                            const willBoom = nextSum >= OVERFLOW_THRESHOLD;
                            return willBoom
                              ? `${PEDESTAL_META[activePlacementEntry.chip].labelKo}에 배치 시 합계 ${nextSum}으로 폭발합니다! (벌점 +${pedestals[activePlacementEntry.chip].length}점)`
                              : `${PEDESTAL_META[activePlacementEntry.chip].labelKo} 배치 후 합계는 ${nextSum}입니다.`;
                          })()}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 w-full sm:w-auto">
                  {humanCanPass && (
                    <button
                      type="button"
                      disabled={isBurstAnimating}
                      onClick={() => onExecutePlacement('PASS')}
                      className="flex-1 sm:flex-none min-h-[44px] px-4 py-2.5 rounded-xl border border-lounge-sky-400/60 bg-lounge-sky-900/50 hover:bg-lounge-sky-900 disabled:opacity-45 disabled:cursor-not-allowed text-lounge-sky-200 font-semibold text-xs sm:text-sm transition-colors cursor-pointer whitespace-nowrap"
                    >
                      패스 (후순위)
                    </button>
                  )}

                  {activePlacementEntry.chip === 'rainbow' ? (
                    PEDESTAL_COLORS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        disabled={isBurstAnimating}
                        onClick={() => onExecutePlacement('PLACE', c)}
                        className="flex-1 sm:flex-none min-h-[44px] px-3.5 sm:px-4 py-2.5 rounded-xl bg-gold-400 hover:bg-gold-300 disabled:opacity-45 disabled:cursor-not-allowed text-gold-950 font-bold text-xs sm:text-sm transition-colors cursor-pointer whitespace-nowrap"
                      >
                        {PEDESTAL_META[c].shortKo} 배치
                      </button>
                    ))
                  ) : (
                    <button
                      type="button"
                      disabled={isBurstAnimating}
                      onClick={() =>
                        onExecutePlacement('PLACE', activePlacementEntry.chip as PedestalColor)
                      }
                      className="flex-1 sm:flex-none min-h-[44px] px-5 py-2.5 rounded-xl bg-gold-400 hover:bg-gold-300 disabled:opacity-45 disabled:cursor-not-allowed text-gold-950 font-bold text-sm transition-colors cursor-pointer whitespace-nowrap"
                    >
                      {PEDESTAL_META[activePlacementEntry.chip].shortKo} 받침대에 배치
                    </button>
                  )}
                </div>
              </>
            ) : (
              <div className="space-y-1">
                <h3 className="text-base font-bold text-lounge-sky-300">
                  {activePlacementPlayer.name} 배치 중...
                </h3>
                <p className="text-xs sm:text-sm text-lounge-slate-300">
                  {isBurstAnimating
                    ? '수거 연출 완료 후 다음 배치가 이어집니다.'
                    : `${CHIP_META[activePlacementEntry.chip].labelKo} · 바위 ${activePlacementEntry.card} 배치를 결정하고 있습니다.`}
                </p>
              </div>
            )}
          </section>
        )}

        {phase === 'ROUND_SUMMARY' && (
          <section className="obsidian-panel rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-1">
              <h3 className="font-display text-xl font-bold text-gold-200">
                라운드 {roundNumber} 종료
              </h3>
              <p className="text-xs sm:text-sm text-lounge-slate-300">
                {roundLastPenaltyPlayerId
                  ? `마지막 벌점자 ${players.find((p) => p.id === roundLastPenaltyPlayerId)?.name} 님이 다음 라운드 선 플레이어가 됩니다.`
                  : '이번 라운드에는 벌점자가 없어 기존 선 플레이어가 유지됩니다.'}
                {roundNumber === HALF_ROUND && (
                  <strong className="text-lounge-sky-300 ml-1.5">
                    · 7라운드 완료! 다음 라운드부터 카드와 칩 세트가 새로 지급됩니다 (받침대 유지).
                  </strong>
                )}
              </p>
            </div>

            <button
              type="button"
              onClick={onNextRound}
              className="px-5 py-3 rounded-xl bg-gold-400 hover:bg-gold-300 text-gold-950 font-bold text-sm transition-colors cursor-pointer whitespace-nowrap"
            >
              {roundNumber >= TOTAL_ROUNDS
                ? '최종 순위 보기'
                : `라운드 ${roundNumber + 1} 시작`}
            </button>
          </section>
        )}

        {!memoryMode && (
          <Heavy13HistoryPanel
            players={players}
            roundHistory={roundHistory}
            currentRoundNumber={roundNumber}
          />
        )}
      </div>

      {/* Pause Modal */}
      {shell === 'PAUSED' && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/80 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="일시정지"
        >
          <div className="w-full max-w-sm obsidian-panel rounded-2xl p-6 space-y-4">
            <h2 className="font-display text-2xl font-bold text-gold-200">일시정지</h2>
            <p className="text-sm text-lounge-slate-300">무거운 13 경기가 잠시 멈췄습니다.</p>
            <div className="flex flex-col gap-2.5 pt-1">
              <button
                type="button"
                onClick={onResume}
                className="w-full py-2.5 px-4 rounded-xl bg-gold-400 hover:bg-gold-300 text-gold-950 font-bold text-sm transition-colors cursor-pointer"
              >
                계속하기 (Esc)
              </button>
              <button
                type="button"
                onClick={onOpenRules}
                className="w-full py-2.5 px-4 rounded-xl border border-lounge-slate-700 bg-obsidian-850 hover:border-gold-500/70 text-lounge-slate-200 font-semibold text-sm transition-colors cursor-pointer"
              >
                게임 규칙 보기
              </button>
              <button
                type="button"
                onClick={onRestartMatch}
                className="w-full py-2.5 px-4 rounded-xl border border-lounge-slate-700 bg-obsidian-850 hover:border-gold-500/70 text-lounge-slate-200 font-semibold text-sm transition-colors cursor-pointer"
              >
                새 게임 다시 시작
              </button>
              <button
                type="button"
                onClick={onReturnToTitle}
                className="w-full py-2.5 px-4 rounded-xl border border-lounge-slate-800 text-lounge-slate-400 hover:text-white hover:border-lounge-slate-500 font-medium text-sm transition-colors cursor-pointer"
              >
                게임 타이틀로
              </button>
              {onExitToHub && (
                <button
                  type="button"
                  onClick={onExitToHub}
                  className="w-full py-2.5 px-4 rounded-xl border border-lounge-slate-800 text-lounge-slate-400 hover:text-white hover:border-lounge-slate-500 font-medium text-sm transition-colors cursor-pointer"
                >
                  전체 게임 목록으로
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Set 2 Replenishment Transition Modal */}
      {shell === 'PLAYING' && showSet2Transition && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/85 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="2세트 시작 및 카드 재지급 안내"
        >
          <div className="w-full max-w-xl obsidian-panel rounded-2xl p-6 sm:p-8 space-y-6 animate-order-reveal">
            <div className="space-y-2 text-center">
              <div className="font-mono-tabular text-xs font-bold tracking-widest text-lounge-sky-300">
                SET 2 · 라운드 8–14
              </div>
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-gold-200">
                2세트 시작 · 카드 재지급
              </h2>
              <p className="text-sm text-lounge-slate-300 leading-relaxed">
                7라운드가 종료되어 모든 플레이어에게 바위 카드와 색깔 칩 한 세트가 새로 지급되었습니다.
                <br />
                <strong className="text-white">기존 받침대 위의 바위 큐브는 초기화되지 않고 그대로 이어집니다.</strong>
              </p>
            </div>

            <div className="obsidian-subpanel rounded-xl p-4 space-y-3">
              <div className="text-xs font-semibold text-lounge-slate-400">
                전원 재지급 세트 구성
              </div>
              <div className="flex flex-wrap items-center justify-center gap-1.5">
                {ROCK_NUMBERS.map((num) => (
                  <div
                    key={`set2-card-${num}`}
                    className="w-9 h-11 rounded-lg bg-obsidian-800 border border-gold-400/60 flex items-center justify-center font-mono-tabular text-base font-bold text-gold-100"
                  >
                    {num}
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap items-center justify-center gap-4 pt-1 text-xs text-lounge-slate-300 font-mono-tabular">
                <span className="inline-flex items-center gap-1.5">
                  <ChipMiniEmblem chip="red" size="sm" />
                  빨강 ×2
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <ChipMiniEmblem chip="green" size="sm" />
                  초록 ×2
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <ChipMiniEmblem chip="blue" size="sm" />
                  파랑 ×2
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <ChipMiniEmblem chip="rainbow" size="sm" />
                  레인보우 ×1
                </span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              {PEDESTAL_COLORS.map((color) => {
                const curSum = getPedestalSum(pedestals[color]);
                return (
                  <div
                    key={`set2-ped-${color}`}
                    className="obsidian-subpanel rounded-xl p-3 text-center space-y-1"
                  >
                    <div className="text-xs font-bold text-lounge-slate-300">
                      {PEDESTAL_META[color].shortKo} 받침대
                    </div>
                    <div className="font-mono-tabular text-xl font-extrabold text-white">
                      {curSum}
                      <span className="text-xs font-normal text-lounge-slate-400"> / 13</span>
                    </div>
                    <div className="font-mono-tabular text-[11px] text-lounge-slate-400">
                      큐브 {pedestals[color].length}개 유지
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
              <span className="text-xs text-lounge-slate-300">
                8라운드 선 플레이어:{' '}
                <strong className="text-gold-200">
                  {players.find((p) => p.seatIndex === firstPlayerSeat)?.name ?? ''}
                </strong>
              </span>
              <button
                type="button"
                onClick={onDismissSet2Transition}
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gold-400 hover:bg-gold-300 text-gold-950 font-bold text-sm transition-colors cursor-pointer whitespace-nowrap"
              >
                라운드 8 시작하기
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
