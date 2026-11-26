import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, BookOpen, Play, RotateCcw, Shuffle, Trophy } from 'lucide-react';
import { GameScreenProps } from '../types';
import { ThemeToggleButton } from '../../components/ThemeToggleButton';
import { GradationPreviewDiagram } from '../../components/GameBoardIllustrations';
import { DEFAULT_PLAYER_NAME, pickAiOpponents } from '../playerProfiles';
import { GradationRulesModal } from './components/GradationRulesModal';
import {
  AIDifficulty,
  COPIES_PER_DIGIT,
  DIGITS,
  DuelState,
  MAX_SUM,
  Placement,
  RoundRecord,
  Side,
  SurvivalState,
  TUBE_COUNT,
  actingSide,
  chooseAIPlacement,
  chooseAITube,
  createDuel,
  createSurvival,
  currentRound,
  digitCounts,
  duelWinner,
  SHADE_COUNT,
  SHADE_NAME_KO,
  opponentView,
  shadeTubes,
  tubeShade,
  other,
  placementSum,
  playTube,
  recordSurvivalDuel,
  samplePlacement,
  simulateAIDuel,
  validatePlacement,
} from './engine/gradation';

type Mode = 'survival' | 'duel';
type Stage = 'PLACEMENT' | 'DUEL' | 'DUEL_RESULT' | 'SPECTATE' | 'FINAL';

const HUMAN_ID = 'human';

const AI_DIFFICULTY_LABEL: Record<AIDifficulty, string> = {
  normal: '쉬움',
  hard: '보통',
  master: '어려움',
};

const AI_DIFFICULTY_DESC: Record<AIDifficulty, string> = {
  normal: '배치는 무작위, 대응은 감으로 합니다.',
  hard: '공개된 숫자로 내 배치를 추정해 수를 고릅니다.',
  master: '배치까지 미리 시뮬레이션하고 수를 깊게 읽습니다.',
};

const AI_DELAY_MS = 900;
const AFTER_REVEAL_DELAY_MS = 1500;

const secondaryButton =
  'inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300/80 bg-white text-xs font-medium text-slate-700 hover:border-slate-400 hover:text-slate-900 dark:border-white/10 dark:bg-obsidian-850 dark:text-lounge-slate-300 dark:hover:border-white/25 dark:hover:text-white transition-colors cursor-pointer whitespace-nowrap';

const primaryButton =
  'inline-flex items-center justify-center gap-1.5 px-5 py-3 rounded-xl bg-gold-400 hover:bg-gold-300 text-gold-950 font-bold text-sm transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed';

/* ------------------------------------------------------------------ */
/* Tube                                                                */
/* ------------------------------------------------------------------ */

/** Gradation: white in the middle tube, darkening toward both ends. */
const SHADE_LIGHTNESS = [97, 72, 44, 14];

function shadeColor(shade: number): { bg: string; fg: string } {
  const l = SHADE_LIGHTNESS[shade];
  return { bg: `hsl(220 8% ${l}%)`, fg: l < 55 ? '#ffffff' : '#111827' };
}

interface TubeProps {
  shade: number;
  label?: string | null;
  value: number | null;
  hidden?: boolean;
  used?: boolean;
  selectable?: boolean;
  active?: boolean;
  outcome?: 'win' | 'lose' | 'tie' | null;
  hint?: string | null;
  ariaLabel?: string;
  onClick?: () => void;
}

const Tube: React.FC<TubeProps> = ({
  shade,
  label,
  value,
  hidden,
  used,
  selectable,
  active,
  outcome,
  hint,
  ariaLabel,
  onClick,
}) => {
  const { bg, fg } = shadeColor(shade);
  return (
    <button
      type="button"
      disabled={!selectable}
      onClick={onClick}
      aria-label={ariaLabel ?? `${SHADE_NAME_KO[shade]} 통${hidden || value === null ? '' : ` ${value}`}`}
      className={[
        'relative flex flex-col items-center gap-1 transition-transform',
        selectable ? 'cursor-pointer hover:-translate-y-1' : 'cursor-default',
        active ? '-translate-y-1.5' : '',
      ].join(' ')}
    >
      <span className="h-3 font-mono-tabular text-[10px] theme-text-faint">{label ?? ''}</span>
      <span
        className={[
          'w-9 sm:w-11 h-16 sm:h-20 rounded-t-full rounded-b-xl border-2 flex items-center justify-center font-mono-tabular font-bold text-lg sm:text-xl',
          used ? 'opacity-35' : '',
          active ? 'border-gold-400 ring-2 ring-gold-400/60' : 'border-slate-400/60 dark:border-white/25',
          outcome === 'win' ? 'ring-2 ring-emerald-500' : '',
          outcome === 'lose' ? 'ring-2 ring-rival-500' : '',
          outcome === 'tie' ? 'ring-2 ring-sky-400' : '',
        ].join(' ')}
        style={{ backgroundColor: bg, color: fg }}
      >
        {hidden ? '?' : value ?? ''}
      </span>
      <span className="h-3 font-mono-tabular text-[9px] theme-text-faint whitespace-nowrap">
        {hint ?? ''}
      </span>
    </button>
  );
};

/* ------------------------------------------------------------------ */
/* Placement                                                           */
/* ------------------------------------------------------------------ */

interface PlacementPanelProps {
  opponentName: string;
  onConfirm: (p: Placement) => void;
}

const PlacementPanel: React.FC<PlacementPanelProps> = ({ opponentName, onConfirm }) => {
  const [picked, setPicked] = useState<number[]>([]);
  const sorted = useMemo(() => [...picked].sort((a, b) => a - b), [picked]);
  const counts = digitCounts(picked);
  const sum = placementSum(picked);
  const complete = picked.length === TUBE_COUNT;
  const valid = complete && validatePlacement(sorted) === null;

  const addDigit = (d: number) => {
    if (picked.length >= TUBE_COUNT || counts[d] >= COPIES_PER_DIGIT) return;
    setPicked((prev) => [...prev, d]);
  };

  const removeAt = (sortedIndex: number) => {
    const value = sorted[sortedIndex];
    setPicked((prev) => {
      const idx = prev.indexOf(value);
      return idx < 0 ? prev : [...prev.slice(0, idx), ...prev.slice(idx + 1)];
    });
  };

  return (
    <div className="obsidian-panel rounded-2xl p-5 sm:p-6 space-y-5 max-w-2xl w-full mx-auto">
      <div className="space-y-1">
        <div className="font-mono-tabular text-xs theme-text-faint">PLACEMENT · vs {opponentName}</div>
        <h2 className="font-display text-xl font-bold theme-text-primary">통 7개에 큐브를 넣으세요</h2>
        <p className="text-sm theme-text-muted">
          숫자를 누르면 작은 수부터 자동으로 정렬됩니다. 합은 {MAX_SUM} 이하, 숫자마다 {COPIES_PER_DIGIT}개까지 쓸 수 있습니다. 통을 누르면 빠집니다.
        </p>
      </div>

      <div className="flex justify-center gap-1.5 sm:gap-2.5">
        {Array.from({ length: TUBE_COUNT }, (_, i) => (
          <Tube
            key={i}
            shade={tubeShade(i)}
            label={`${i + 1}`}
            ariaLabel={`${i + 1}번 통 ${sorted[i] ?? '비어 있음'}`}
            value={sorted[i] ?? null}
            selectable={sorted[i] !== undefined}
            onClick={() => removeAt(i)}
          />
        ))}
      </div>

      <div className="flex items-center justify-center gap-2 text-sm">
        <span className="theme-text-muted">합계</span>
        <span
          className={[
            'font-mono-tabular text-xl font-bold',
            sum > MAX_SUM ? 'theme-text-rival' : 'theme-text-primary',
          ].join(' ')}
        >
          {sum}
        </span>
        <span className="theme-text-faint font-mono-tabular">/ {MAX_SUM}</span>
      </div>

      <div className="grid grid-cols-5 gap-2">
        {DIGITS.map((d) => {
          const left = COPIES_PER_DIGIT - counts[d];
          const disabled = left <= 0 || complete;
          return (
            <button
              key={d}
              type="button"
              disabled={disabled}
              onClick={() => addDigit(d)}
              className={[
                'rounded-xl border py-2.5 flex flex-col items-center transition-colors',
                disabled
                  ? 'opacity-35 cursor-not-allowed border-slate-300/60 dark:border-white/5'
                  : 'cursor-pointer theme-control hover:border-gold-400',
              ].join(' ')}
            >
              <span className="font-mono-tabular text-lg font-bold theme-text-primary">{d}</span>
              <span className="text-[10px] theme-text-faint">남은 {left}</span>
            </button>
          );
        })}
      </div>

      <div className="flex gap-2">
        <button type="button" onClick={() => setPicked([])} className={secondaryButton}>
          <RotateCcw className="w-4 h-4" />
          초기화
        </button>
        <button type="button" onClick={() => setPicked(samplePlacement())} className={secondaryButton}>
          <Shuffle className="w-4 h-4" />
          무작위
        </button>
        <button
          type="button"
          disabled={!valid}
          onClick={() => onConfirm(sorted)}
          className={`${primaryButton} flex-1`}
        >
          {complete && sum > MAX_SUM ? `합이 ${MAX_SUM}을 넘습니다` : complete ? '배치 확정' : `${TUBE_COUNT - picked.length}개 더 고르세요`}
        </button>
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Duel board                                                          */
/* ------------------------------------------------------------------ */

/** The opponent's tubes as the human sees them: grouped by colour, positions hidden. */
const OpponentShades: React.FC<{
  duel: DuelState;
  humanSide: Side;
  lastRound: RoundRecord | null;
  outcome: 'win' | 'lose' | 'tie' | null;
}> = ({ duel, humanSide, lastRound, outcome }) => {
  const view = opponentView(duel, humanSide);

  return (
    <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 sm:gap-x-6">
      {Array.from({ length: SHADE_COUNT }, (_, idx) => SHADE_COUNT - 1 - idx).map((shade) => {
        const total = shadeTubes(shade).length;
        const revealed = view.revealedByShade[shade];
        const hiddenCount = total - revealed.length;
        return (
          <div key={shade} className="flex flex-col items-center gap-1">
            <div className="flex gap-1 sm:gap-1.5">
              {revealed.map((r) => {
                const isLast = !!lastRound && lastRound.round === r.round;
                return (
                  <Tube
                    key={`r${r.round}`}
                    shade={shade}
                    value={r.value}
                    used={!isLast}
                    outcome={isLast ? outcome : null}
                  />
                );
              })}
              {Array.from({ length: hiddenCount }, (_, k) => (
                <Tube
                  key={`h${k}`}
                  shade={shade}
                  value={null}
                  hidden
                  active={k === 0 && view.pendingShade === shade}
                />
              ))}
            </div>
            <span className="text-[10px] theme-text-faint">{SHADE_NAME_KO[shade]}</span>
          </div>
        );
      })}
    </div>
  );
};

interface DuelBoardProps {
  duel: DuelState;
  humanSide: Side;
  names: [string, string];
  lastRound: RoundRecord | null;
  onPlay: (tube: number) => void;
}

const DuelBoard: React.FC<DuelBoardProps> = ({ duel, humanSide, names, lastRound, onPlay }) => {
  const aiSide = other(humanSide);
  const myTurn = !duel.finished && actingSide(duel) === humanSide;
  const iLead = duel.leader === humanSide;
  const outcomeOf = (side: Side, tube: number): 'win' | 'lose' | 'tie' | null => {
    if (!lastRound || lastRound.tubes[side] !== tube) return null;
    // Rings are always from the human's point of view: green = I won the round.
    if (lastRound.winner === null) return 'tie';
    return lastRound.winner === humanSide ? 'win' : 'lose';
  };

  let prompt: string;
  if (duel.finished) prompt = '대결이 끝났습니다.';
  else if (myTurn && duel.pendingLead === null) prompt = '선공입니다. 낼 통을 고르세요.';
  else if (myTurn) prompt = `${names[aiSide]}이(가) ${SHADE_NAME_KO[tubeShade(duel.pendingLead!)]} 통을 냈습니다.`;
  else if (duel.pendingLead === null) prompt = `${names[aiSide]}이(가) 선공 통을 고르는 중…`;
  else prompt = `${names[aiSide]}이(가) 대응할 통을 고르는 중…`;

  return (
    <div className="obsidian-panel rounded-2xl p-4 sm:p-6 space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div className="text-xs font-mono-tabular theme-text-muted">
          <span className="theme-text-gold font-semibold">
            {Math.min(currentRound(duel), TUBE_COUNT)}/{TUBE_COUNT}라운드
          </span>
          <span className="mx-1.5" aria-hidden="true">·</span>
          선 {names[duel.leader]}
        </div>
        <div className="flex items-center gap-3 font-mono-tabular">
          <span className="text-sm theme-text-gold font-semibold">{names[humanSide]}</span>
          <span className="text-2xl font-bold theme-text-primary">
            {duel.scores[humanSide]} : {duel.scores[aiSide]}
          </span>
          <span className="text-sm theme-text-sky font-semibold">{names[aiSide]}</span>
        </div>
      </div>

      {/* Opponent */}
      <div className="space-y-1">
        <div className="text-xs theme-text-muted">
          {names[aiSide]}의 통
        </div>
        <OpponentShades
          duel={duel}
          humanSide={humanSide}
          lastRound={lastRound}
          outcome={lastRound ? outcomeOf(aiSide, lastRound.tubes[aiSide]) : null}
        />
      </div>

      <div
        className={[
          'rounded-xl px-4 py-3 text-sm text-center',
          myTurn ? 'obsidian-sky-panel theme-text-sky font-medium' : 'theme-control theme-text-muted',
        ].join(' ')}
      >
        {lastRound && (
          <div className="text-xs mb-1 theme-text-secondary">
            지난 라운드: {names[humanSide]} {lastRound.values[humanSide]} vs {lastRound.values[aiSide]}{' '}
            {names[aiSide]} →{' '}
            {lastRound.winner === null
              ? '무승부'
              : lastRound.winner === humanSide
                ? <span className="theme-text-emerald font-semibold">승리</span>
                : <span className="theme-text-rival font-semibold">패배</span>}
          </div>
        )}
        {prompt}
      </div>

      {/* Me */}
      <div className="space-y-1">
        <div className="text-xs theme-text-muted">
          내 통 {iLead && myTurn ? '(선공)' : ''}
        </div>
        <div className="flex justify-center gap-1.5 sm:gap-2.5">
          {Array.from({ length: TUBE_COUNT }, (_, i) => {
            const used = duel.used[humanSide][i];
            const isMyPendingLead = duel.pendingLead === i && duel.leader === humanSide;
            return (
              <Tube
                key={i}
                shade={tubeShade(i)}
                label={`${i + 1}`}
                ariaLabel={`${i + 1}번 통 ${duel.placements[humanSide][i]}`}
                value={duel.placements[humanSide][i]}
                used={used && outcomeOf(humanSide, i) === null}
                active={isMyPendingLead}
                selectable={myTurn && !used}
                outcome={outcomeOf(humanSide, i)}
                onClick={() => onPlay(i)}
              />
            );
          })}
        </div>
      </div>

      <RoundTable duel={duel} names={names} humanSide={humanSide} hideTubesOf={aiSide} />
    </div>
  );
};

const RoundTable: React.FC<{
  duel: DuelState;
  names: [string, string];
  humanSide: Side | null;
  /** During a live duel the opponent's tube positions are secret: show only the colour. */
  hideTubesOf?: Side;
}> = ({ duel, names, humanSide, hideTubesOf }) => {
  const tubeLabel = (side: Side, tube: number) =>
    side === hideTubesOf ? SHADE_NAME_KO[tubeShade(tube)] : `${tube + 1}번`;
  if (duel.history.length === 0) return null;
  return (
    <table className="w-full text-xs">
      <thead>
        <tr className="theme-text-faint border-b theme-border">
          <th className="text-left font-medium py-1.5">R</th>
          <th className="text-left font-medium">선</th>
          <th className="text-right font-medium">{names[0]}</th>
          <th className="text-right font-medium">{names[1]}</th>
          <th className="text-right font-medium">승자</th>
        </tr>
      </thead>
      <tbody>
        {duel.history.map((r) => (
          <tr key={r.round} className="border-b theme-border last:border-0">
            <td className="py-1.5 font-mono-tabular theme-text-faint">{r.round}</td>
            <td className="theme-text-secondary">{names[r.leader]}</td>
            <td className="text-right font-mono-tabular theme-text-primary">
              {r.values[0]} <span className="theme-text-faint">({tubeLabel(0, r.tubes[0])})</span>
            </td>
            <td className="text-right font-mono-tabular theme-text-primary">
              {r.values[1]} <span className="theme-text-faint">({tubeLabel(1, r.tubes[1])})</span>
            </td>
            <td
              className={[
                'text-right font-semibold',
                r.winner === null
                  ? 'theme-text-faint'
                  : humanSide === null
                    ? 'theme-text-primary'
                    : r.winner === humanSide
                      ? 'theme-text-emerald'
                      : 'theme-text-rival',
              ].join(' ')}
            >
              {r.winner === null ? '무' : names[r.winner]}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

/* ------------------------------------------------------------------ */
/* Main                                                                */
/* ------------------------------------------------------------------ */

export function GradationGame({ onExitToHub }: GameScreenProps) {
  const [screen, setScreen] = useState<'TITLE' | 'GAME'>('TITLE');
  const [mode, setMode] = useState<Mode>('survival');
  const [difficulty, setDifficulty] = useState<AIDifficulty>('hard');
  const [rulesOpen, setRulesOpen] = useState(false);

  const [names, setNames] = useState<Record<string, string>>({});
  const [survival, setSurvival] = useState<SurvivalState | null>(null);
  const [stage, setStage] = useState<Stage>('PLACEMENT');
  const [duel, setDuel] = useState<DuelState | null>(null);
  const [spectateDraws, setSpectateDraws] = useState(0);

  const pairNames = useMemo<[string, string]>(
    () => (survival ? [names[survival.pair[0]], names[survival.pair[1]]] : ['', '']),
    [survival, names],
  );
  const humanSide: Side | null = survival
    ? survival.pair[0] === HUMAN_ID
      ? 0
      : survival.pair[1] === HUMAN_ID
        ? 1
        : null
    : null;

  /**
   * Begin the duel for the current pair: the human places, or an AI-vs-AI duel is
   * simulated. Drawn AI duels are replayed automatically (recorded as draws) so the
   * player is not asked to click through a chain of rematches.
   */
  const beginDuel = useCallback(
    (s: SurvivalState) => {
      setSurvival(s);
      if (s.pair.includes(HUMAN_ID)) {
        setDuel(null);
        setStage('PLACEMENT');
        return;
      }
      let current = s;
      let sim: DuelState;
      let rematches = 0;
      for (;;) {
        sim = simulateAIDuel(
          { placement: chooseAIPlacement(difficulty), difficulty },
          { placement: chooseAIPlacement(difficulty), difficulty },
          0,
        );
        if (duelWinner(sim) !== null || rematches >= 20) break;
        current = recordSurvivalDuel(current, sim.scores, null);
        rematches += 1;
      }
      setSurvival(current);
      setSpectateDraws(rematches);
      setDuel(sim);
      setStage('SPECTATE');
    },
    [difficulty],
  );

  const startMatch = useCallback(() => {
    const aiCount = mode === 'survival' ? 2 : 1;
    const aiNames = pickAiOpponents(aiCount, [DEFAULT_PLAYER_NAME]);
    const ids = [HUMAN_ID, ...aiNames.map((_, i) => `ai-${i + 1}`)];
    const nameMap: Record<string, string> = { [HUMAN_ID]: DEFAULT_PLAYER_NAME };
    aiNames.forEach((n, i) => {
      nameMap[`ai-${i + 1}`] = n;
    });
    setNames(nameMap);
    setScreen('GAME');
    beginDuel(createSurvival(ids));
  }, [mode, beginDuel]);

  const confirmPlacement = useCallback(
    (placement: Placement) => {
      if (!survival || humanSide === null) return;
      const aiPlacement = chooseAIPlacement(difficulty);
      const placements: [Placement, Placement] =
        humanSide === 0 ? [placement, aiPlacement] : [aiPlacement, placement];
      setDuel(createDuel(placements[0], placements[1], 0));
      setStage('DUEL');
    },
    [survival, humanSide, difficulty],
  );

  const humanPlay = useCallback(
    (tube: number) => {
      if (!duel || humanSide === null || stage !== 'DUEL') return;
      setDuel(playTube(duel, humanSide, tube));
    },
    [duel, humanSide, stage],
  );

  // AI moves during a human duel
  useEffect(() => {
    if (stage !== 'DUEL' || !duel || humanSide === null || rulesOpen) return;
    if (duel.finished) {
      const t = window.setTimeout(() => setStage('DUEL_RESULT'), AFTER_REVEAL_DELAY_MS);
      return () => window.clearTimeout(t);
    }
    const aiSide = other(humanSide);
    if (actingSide(duel) !== aiSide) return;
    const justRevealed = duel.pendingLead === null && duel.history.length > 0;
    const t = window.setTimeout(
      () => setDuel(playTube(duel, aiSide, chooseAITube(duel, aiSide, difficulty))),
      justRevealed ? AFTER_REVEAL_DELAY_MS : AI_DELAY_MS,
    );
    return () => window.clearTimeout(t);
  }, [stage, duel, humanSide, difficulty, rulesOpen]);

  const advanceAfterDuel = useCallback(() => {
    if (!survival || !duel) return;
    const next = recordSurvivalDuel(survival, duel.scores, duelWinner(duel));
    if (next.champion) {
      setSurvival(next);
      setStage('FINAL');
      return;
    }
    beginDuel(next);
  }, [survival, duel, beginDuel]);

  const lastRound = duel && duel.history.length > 0 ? duel.history[duel.history.length - 1] : null;

  return (
    <div className="min-h-screen w-full overflow-x-hidden theme-canvas flex flex-col">
      <main className="flex-1 flex flex-col px-4 py-5 sm:px-8 sm:py-7 max-w-5xl w-full mx-auto gap-6">
        <div className="flex items-center justify-between gap-3 pb-4 border-b border-slate-200 dark:border-white/[0.08]">
          <div className="flex items-center gap-3 min-w-0">
            {screen === 'GAME' ? (
              <button type="button" onClick={() => setScreen('TITLE')} className={secondaryButton}>
                <ArrowLeft className="w-4 h-4 text-slate-500 dark:text-lounge-slate-400" />
                타이틀
              </button>
            ) : (
              onExitToHub && (
                <button type="button" onClick={onExitToHub} className={secondaryButton}>
                  <ArrowLeft className="w-4 h-4 text-slate-500 dark:text-lounge-slate-400" />
                  매치 목록
                </button>
              )
            )}
            <span className="hidden sm:inline font-mono-tabular text-xs theme-text-faint">
              시즌 3 · 감옥 매치
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setRulesOpen(true)} className={secondaryButton}>
              <BookOpen className="w-4 h-4 text-slate-500 dark:text-lounge-slate-400" />
              게임 규칙
            </button>
            <ThemeToggleButton compact />
          </div>
        </div>

        {screen === 'TITLE' || !survival ? (
          <TitleScreen
            mode={mode}
            difficulty={difficulty}
            onChangeMode={setMode}
            onChangeDifficulty={setDifficulty}
            onStart={startMatch}
            onOpenRules={() => setRulesOpen(true)}
          />
        ) : (
          <div className="space-y-4">
            {mode === 'survival' && <SurvivalStrip survival={survival} names={names} />}

            {stage === 'PLACEMENT' && humanSide !== null && (
              <PlacementPanel
                key={survival.duelNumber}
                opponentName={pairNames[other(humanSide)]}
                onConfirm={confirmPlacement}
              />
            )}

            {stage === 'DUEL' && duel && humanSide !== null && (
              <DuelBoard
                duel={duel}
                humanSide={humanSide}
                names={pairNames}
                lastRound={lastRound}
                onPlay={humanPlay}
              />
            )}

            {(stage === 'DUEL_RESULT' || stage === 'SPECTATE') && duel && (
              <DuelResultPanel
                duel={duel}
                names={pairNames}
                humanSide={humanSide}
                spectating={stage === 'SPECTATE'}
                priorDraws={stage === 'SPECTATE' ? spectateDraws : 0}
                onNext={advanceAfterDuel}
              />
            )}

            {stage === 'FINAL' && survival.champion && (
              <FinalPanel
                survival={survival}
                names={names}
                onRestart={startMatch}
                onTitle={() => setScreen('TITLE')}
              />
            )}
          </div>
        )}
      </main>

      <GradationRulesModal open={rulesOpen} onClose={() => setRulesOpen(false)} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Panels                                                              */
/* ------------------------------------------------------------------ */

const SurvivalStrip: React.FC<{ survival: SurvivalState; names: Record<string, string> }> = ({
  survival,
  names,
}) => (
  <div className="obsidian-panel rounded-2xl px-4 py-3 flex flex-wrap items-center justify-between gap-3">
    <div className="text-xs font-mono-tabular theme-text-muted">
      <span className="theme-text-gold font-semibold">
        {survival.champion ? `서바이벌 종료 · 대결 ${survival.results.length}회` : `${survival.duelNumber}번째 대결`}
      </span>
      {!survival.champion && (
        <>
          <span className="mx-1.5" aria-hidden="true">·</span>
          {names[survival.pair[0]]} vs {names[survival.pair[1]]}
          {survival.waiting && ` · 대기 ${names[survival.waiting]}`}
        </>
      )}
    </div>
    <div className="flex gap-2">
      {survival.participants.map((id) => (
        <span key={id} className="inline-flex items-center gap-1.5 rounded-md theme-control px-2 py-1 text-xs">
          <span className={id === HUMAN_ID ? 'theme-text-gold font-semibold' : 'theme-text-secondary'}>
            {names[id]}
          </span>
          <span className="font-mono-tabular font-bold theme-text-primary">
            {survival.streaks[id]}연승
          </span>
        </span>
      ))}
    </div>
  </div>
);

interface DuelResultPanelProps {
  duel: DuelState;
  names: [string, string];
  humanSide: Side | null;
  spectating: boolean;
  priorDraws: number;
  onNext: () => void;
}

const DuelResultPanel: React.FC<DuelResultPanelProps> = ({
  duel,
  names,
  humanSide,
  spectating,
  priorDraws,
  onNext,
}) => {
  const winner = duelWinner(duel);
  let headline: string;
  let tone = 'theme-text-primary';
  if (winner === null) headline = '무승부 · 재대결';
  else if (humanSide === null) headline = `${names[winner]} 승리`;
  else if (winner === humanSide) {
    headline = '대결 승리';
    tone = 'theme-text-emerald';
  } else {
    headline = '대결 패배';
    tone = 'theme-text-rival';
  }

  return (
    <div className="obsidian-panel rounded-2xl p-5 sm:p-6 space-y-5 max-w-2xl w-full mx-auto">
      <div className="text-center space-y-1">
        <div className="font-mono-tabular text-xs theme-text-faint">
          {spectating ? '관전 결과' : 'DUEL RESULT'}
        </div>
        <h2 className={`font-display text-2xl sm:text-3xl font-bold ${tone}`}>{headline}</h2>
        <div className="font-mono-tabular text-lg theme-text-secondary">
          {names[0]} {duel.scores[0]} : {duel.scores[1]} {names[1]}
        </div>
        {priorDraws > 0 && (
          <div className="text-xs theme-text-muted">무승부 {priorDraws}회 뒤 재대결에서 승부가 났습니다.</div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 text-xs">
        {([0, 1] as Side[]).map((side) => (
          <div key={side} className="theme-control rounded-xl p-3 space-y-1">
            <div className="theme-text-faint">{names[side]}의 배치</div>
            <div className="font-mono-tabular text-base font-semibold theme-text-primary">
              {duel.placements[side].join(' ')}
            </div>
          </div>
        ))}
      </div>

      <RoundTable duel={duel} names={names} humanSide={humanSide} />

      <button type="button" onClick={onNext} className={`${primaryButton} w-full`}>
        {winner === null ? (spectating ? '재대결 보기' : '재대결 배치하기') : '계속'}
      </button>
    </div>
  );
};

interface FinalPanelProps {
  survival: SurvivalState;
  names: Record<string, string>;
  onRestart: () => void;
  onTitle: () => void;
}

const FinalPanel: React.FC<FinalPanelProps> = ({ survival, names, onRestart, onTitle }) => {
  const won = survival.champion === HUMAN_ID;
  const isSurvival = survival.participants.length > 2;
  return (
    <div className="obsidian-panel rounded-2xl p-6 space-y-5 max-w-xl w-full mx-auto text-center">
      <Trophy className={`w-10 h-10 mx-auto ${won ? 'theme-text-gold' : 'theme-text-faint'}`} />
      <div className="space-y-1">
        <h2 className={`font-display text-3xl font-bold ${won ? 'theme-text-emerald' : 'theme-text-rival'}`}>
          {won ? (isSurvival ? '결승 진출' : '승리') : isSurvival ? '탈락' : '패배'}
        </h2>
        <p className="text-sm theme-text-muted">
          {isSurvival
            ? `${names[survival.champion as string]}이(가) 2연승으로 결승에 진출했습니다.`
            : `${names[survival.champion as string]}의 승리입니다.`}
        </p>
      </div>
      <ol className="text-xs text-left space-y-1 border-y theme-border py-3">
        {survival.results.map((r) => (
          <li key={r.duelNumber} className="flex justify-between gap-3">
            <span className="theme-text-secondary">
              {r.duelNumber}. {names[r.pair[0]]} vs {names[r.pair[1]]}
            </span>
            <span className="font-mono-tabular theme-text-primary">
              {r.scores[0]}:{r.scores[1]} · {r.winner ? names[r.winner] : '무승부'}
            </span>
          </li>
        ))}
      </ol>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onTitle}
          className="flex-1 px-4 py-2.5 rounded-xl border border-slate-300/80 dark:border-white/10 theme-control text-sm font-medium theme-text-secondary cursor-pointer"
        >
          타이틀로
        </button>
        <button type="button" onClick={onRestart} className={`${primaryButton} flex-1 py-2.5`}>
          다시 하기
        </button>
      </div>
    </div>
  );
};

interface TitleScreenProps {
  mode: Mode;
  difficulty: AIDifficulty;
  onChangeMode: (m: Mode) => void;
  onChangeDifficulty: (d: AIDifficulty) => void;
  onStart: () => void;
  onOpenRules: () => void;
}

const optionButton = (active: boolean) =>
  [
    'rounded-lg border py-2 px-2 text-sm font-semibold transition-colors cursor-pointer',
    active
      ? 'border-gold-400 bg-gold-100/60 dark:bg-gold-400/10 theme-text-primary'
      : 'border-slate-300/80 dark:border-white/10 theme-control theme-text-secondary',
  ].join(' ');

const TitleScreen: React.FC<TitleScreenProps> = ({
  mode,
  difficulty,
  onChangeMode,
  onChangeDifficulty,
  onStart,
  onOpenRules,
}) => (
  <div className="my-auto grid grid-cols-1 lg:grid-cols-[1.05fr_0.95fr] gap-8 lg:gap-10 items-stretch">
    <div className="space-y-5">
      <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-white/[0.08]">
        <GradationPreviewDiagram />
      </div>
      <div className="space-y-2">
        <div className="font-mono-tabular text-xs theme-text-muted">감옥 매치 · 통 7개 · 합 30 이하</div>
        <h1 className="font-display display-tight text-3xl sm:text-4xl font-medium theme-text-primary">그라데이션</h1>
        <p className="text-sm sm:text-base theme-text-secondary leading-relaxed text-pretty pt-1">
          큐브 7개를 <strong className="theme-text-primary font-semibold">오름차순, 합 30 이하</strong>로 몰래 배치하고, 통을 하나씩 맞붙여 더 큰 숫자로 점수를 따세요. 상대 통의 번호만 보고 숫자를 읽어내는 1:1 심리전입니다.
        </p>
      </div>
    </div>

    <div className="obsidian-panel rounded-2xl p-5 sm:p-6 flex flex-col gap-5">
      <div className="space-y-2">
        <div className="text-sm font-semibold theme-text-primary">대전 방식</div>
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={() => onChangeMode('survival')} className={optionButton(mode === 'survival')}>
            3인 서바이벌
          </button>
          <button type="button" onClick={() => onChangeMode('duel')} className={optionButton(mode === 'duel')}>
            1:1 단판
          </button>
        </div>
        <p className="text-xs theme-text-muted">
          {mode === 'survival'
            ? '1P와 AI 2명이 승자 잔류 방식으로 대결합니다. 2연승하면 결승 진출입니다.'
            : 'AI 1명과 한 번 대결합니다. 비기면 재대결합니다.'}
        </p>
      </div>
      <div className="space-y-2">
        <div className="text-sm font-semibold theme-text-primary">AI 난이도</div>
        <div className="grid grid-cols-3 gap-2">
          {(Object.keys(AI_DIFFICULTY_LABEL) as AIDifficulty[]).map((d) => (
            <button key={d} type="button" onClick={() => onChangeDifficulty(d)} className={optionButton(difficulty === d)}>
              {AI_DIFFICULTY_LABEL[d]}
            </button>
          ))}
        </div>
        <p className="text-xs theme-text-muted">{AI_DIFFICULTY_DESC[difficulty]}</p>
      </div>
      <div className="mt-auto flex gap-2">
        <button
          type="button"
          onClick={onOpenRules}
          className="px-4 py-3 rounded-xl border border-slate-300/80 dark:border-white/10 theme-control text-sm font-medium theme-text-secondary cursor-pointer inline-flex items-center gap-1.5"
        >
          <BookOpen className="w-4 h-4" />
          규칙
        </button>
        <button type="button" onClick={onStart} className={`${primaryButton} flex-1`}>
          <Play className="w-4 h-4" />
          게임 시작
        </button>
      </div>
    </div>
  </div>
);
