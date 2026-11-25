import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, BookOpen, Delete, Play, Shuffle } from 'lucide-react';
import { GameScreenProps } from '../types';
import { ThemeToggleButton } from '../../components/ThemeToggleButton';
import { EquationSignalPreviewDiagram } from '../../components/GameBoardIllustrations';
import { pickAiOpponents } from '../playerProfiles';
import { EquationRulesModal } from './components/EquationRulesModal';
import {
  ALL_SYMBOLS,
  EQUATION_ISSUE_TEXT,
  EQUATION_LENGTH,
  Signal,
  randomEquation,
  scoreGuess,
  validateEquation,
} from './engine/equation';
import { AIDifficulty, GuessRecord, chooseAIGuess } from './engine/solver';

type Screen = 'TITLE' | 'SETUP' | 'PLAY';
type Outcome = 'win' | 'lose' | 'draw';

const MAX_TURNS = 20;

const AI_DIFFICULTY_LABEL: Record<AIDifficulty, string> = {
  normal: '쉬움',
  hard: '보통',
  master: '어려움',
};

const AI_DIFFICULTY_DESC: Record<AIDifficulty, string> = {
  normal: '최근 두 번의 추측만 제대로 기억합니다. 평균 10턴 안팎.',
  hard: '초록과 빨강은 모두 기억하지만 노랑은 흘려 봅니다. 평균 6~7턴.',
  master: '모든 신호를 빠짐없이 따집니다. 평균 4~5턴.',
};

const KEY_ALIASES: Record<string, string> = {
  '*': '×',
  x: '×',
  X: '×',
  '/': '÷',
};

const secondaryButton =
  'inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300/80 bg-white text-xs font-medium text-slate-700 hover:border-slate-400 hover:text-slate-900 dark:border-white/10 dark:bg-obsidian-850 dark:text-lounge-slate-300 dark:hover:border-white/25 dark:hover:text-white transition-colors cursor-pointer whitespace-nowrap';

const primaryButton =
  'inline-flex items-center justify-center gap-1.5 px-5 py-3 rounded-xl bg-gold-400 hover:bg-gold-300 text-gold-950 font-bold text-sm transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed';

const SIGNAL_CLASS: Record<Signal, string> = {
  green: 'bg-emerald-600 border-emerald-600 text-white',
  yellow: 'bg-gold-400 border-gold-400 text-gold-950',
  red: 'bg-rival-500 border-rival-500 text-white',
};

const SIGNAL_LABEL: Record<Signal, string> = { green: '초록', yellow: '노랑', red: '빨강' };

/* ------------------------------------------------------------------ */
/* Tiles & keypad                                                      */
/* ------------------------------------------------------------------ */

const TileRow: React.FC<{ chars: string[]; signals?: Signal[]; active?: boolean; small?: boolean }> = ({
  chars,
  signals,
  active,
  small,
}) => (
  <div className="flex justify-center gap-1 sm:gap-1.5">
    {Array.from({ length: EQUATION_LENGTH }, (_, i) => {
      const c = chars[i] ?? '';
      const sig = signals?.[i];
      return (
        <div
          key={i}
          aria-label={sig ? `${c} ${SIGNAL_LABEL[sig]}` : c || '빈 칸'}
          className={[
            small ? 'w-7 h-8 text-sm sm:w-8 sm:h-9' : 'w-9 h-11 text-lg sm:w-11 sm:h-12 sm:text-xl',
            'rounded-md border-2 flex items-center justify-center font-mono-tabular font-bold transition-colors',
            sig
              ? SIGNAL_CLASS[sig]
              : c
                ? 'theme-control border-slate-400 dark:border-white/30 theme-text-primary'
                : active
                  ? 'border-slate-300 dark:border-white/15 bg-transparent'
                  : 'border-slate-200 dark:border-white/[0.06] bg-transparent',
          ].join(' ')}
        >
          {c}
        </div>
      );
    })}
  </div>
);

interface KeypadProps {
  status?: Map<string, Signal>;
  onKey: (s: string) => void;
  onDelete: () => void;
  onSubmit: () => void;
  submitLabel: string;
  submitDisabled: boolean;
}

const Keypad: React.FC<KeypadProps> = ({ status, onKey, onDelete, onSubmit, submitLabel, submitDisabled }) => {
  const digits = ALL_SYMBOLS.slice(0, 10);
  const ops = ALL_SYMBOLS.slice(10);
  const keyClass = (s: string) => {
    const st = status?.get(s);
    return [
      'h-11 rounded-lg border font-mono-tabular text-base font-bold transition-colors cursor-pointer',
      st ? SIGNAL_CLASS[st] : 'theme-control theme-text-primary hover:border-gold-400',
    ].join(' ');
  };
  return (
    <div className="space-y-1.5 select-none">
      <div className="grid grid-cols-10 gap-1">
        {digits.map((s) => (
          <button key={s} type="button" className={keyClass(s)} onClick={() => onKey(s)}>
            {s}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-8 gap-1">
        {ops.map((s) => (
          <button key={s} type="button" className={keyClass(s)} onClick={() => onKey(s)}>
            {s}
          </button>
        ))}
        <button
          type="button"
          onClick={onDelete}
          aria-label="한 칸 지우기"
          className="h-11 rounded-lg border theme-control theme-text-secondary flex items-center justify-center cursor-pointer hover:border-gold-400"
        >
          <Delete className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={onSubmit}
          disabled={submitDisabled}
          className="col-span-1 h-11 rounded-lg bg-gold-400 hover:bg-gold-300 text-gold-950 text-xs font-bold cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {submitLabel}
        </button>
      </div>
    </div>
  );
};

/** Best known signal per symbol across all guesses (green > yellow > red). */
function keyStatus(history: GuessRecord[]): Map<string, Signal> {
  const rank: Record<Signal, number> = { red: 0, yellow: 1, green: 2 };
  const map = new Map<string, Signal>();
  history.forEach(({ guess, signals }) => {
    guess.forEach((g, i) => {
      const prev = map.get(g);
      if (!prev || rank[signals[i]] > rank[prev]) map.set(g, signals[i]);
    });
  });
  return map;
}

/* ------------------------------------------------------------------ */
/* Main                                                                */
/* ------------------------------------------------------------------ */

export function EquationSignalGame({ onExitToHub }: GameScreenProps) {
  const [screen, setScreen] = useState<Screen>('TITLE');
  const [difficulty, setDifficulty] = useState<AIDifficulty>('hard');
  const [rulesOpen, setRulesOpen] = useState(false);

  const [aiName, setAiName] = useState('AI');
  const [mySecret, setMySecret] = useState<string[]>([]);
  const [aiSecret, setAiSecret] = useState<string[]>([]);
  const [myGuesses, setMyGuesses] = useState<GuessRecord[]>([]);
  const [aiGuesses, setAiGuesses] = useState<GuessRecord[]>([]);
  const [input, setInput] = useState<string[]>([]);
  const [aiThinking, setAiThinking] = useState(false);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [resultOpen, setResultOpen] = useState(false);

  const turn = myGuesses.length + 1;
  const secretIssue = screen === 'SETUP' && input.length === EQUATION_LENGTH ? validateEquation(input) : null;
  const status = useMemo(() => keyStatus(myGuesses), [myGuesses]);

  const startSetup = useCallback(() => {
    setAiName(pickAiOpponents(1)[0]);
    setAiSecret(randomEquation());
    setMySecret([]);
    setMyGuesses([]);
    setAiGuesses([]);
    setInput([]);
    setOutcome(null);
    setResultOpen(false);
    setAiThinking(false);
    setScreen('SETUP');
  }, []);

  const typeKey = useCallback(
    (s: string) => {
      if (aiThinking || outcome) return;
      setInput((prev) => (prev.length >= EQUATION_LENGTH ? prev : [...prev, s]));
    },
    [aiThinking, outcome],
  );
  const deleteKey = useCallback(() => setInput((prev) => prev.slice(0, -1)), []);

  const confirmSecret = useCallback(() => {
    if (input.length !== EQUATION_LENGTH || validateEquation(input) !== null) return;
    setMySecret(input);
    setInput([]);
    setScreen('PLAY');
  }, [input]);

  const submitGuess = useCallback(() => {
    if (input.length !== EQUATION_LENGTH || aiThinking || outcome) return;
    const guess = input;
    setInput([]);
    setAiThinking(true);
    // Let the "thinking" state paint before the solver runs on the main thread.
    window.setTimeout(() => {
      const aiGuess = chooseAIGuess(aiGuesses, difficulty);
      const mine: GuessRecord = { guess, signals: scoreGuess(guess, aiSecret) };
      const theirs: GuessRecord = { guess: aiGuess, signals: scoreGuess(aiGuess, mySecret) };
      const nextMine = [...myGuesses, mine];
      const nextTheirs = [...aiGuesses, theirs];
      setMyGuesses(nextMine);
      setAiGuesses(nextTheirs);
      setAiThinking(false);

      const iSolved = mine.signals.every((s) => s === 'green');
      const aiSolved = theirs.signals.every((s) => s === 'green');
      let result: Outcome | null = null;
      if (iSolved && aiSolved) result = 'draw';
      else if (iSolved) result = 'win';
      else if (aiSolved) result = 'lose';
      else if (nextMine.length >= MAX_TURNS) result = 'draw';
      if (result) {
        setOutcome(result);
        window.setTimeout(() => setResultOpen(true), 700);
      }
    }, 60);
  }, [input, aiThinking, outcome, aiGuesses, myGuesses, difficulty, aiSecret, mySecret]);

  // Physical keyboard
  useEffect(() => {
    if (screen === 'TITLE' || rulesOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const key = KEY_ALIASES[e.key] ?? e.key;
      if ((ALL_SYMBOLS as readonly string[]).includes(key)) {
        e.preventDefault();
        typeKey(key);
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        deleteKey();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (screen === 'SETUP') confirmSecret();
        else submitGuess();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [screen, rulesOpen, typeKey, deleteKey, confirmSecret, submitGuess]);

  return (
    <div className="min-h-screen w-full overflow-x-hidden theme-canvas flex flex-col">
      <main className="flex-1 flex flex-col px-4 py-5 sm:px-8 sm:py-7 max-w-6xl w-full mx-auto gap-6">
        <div className="flex items-center justify-between gap-3 pb-4 border-b border-slate-200 dark:border-white/[0.08]">
          <div className="flex items-center gap-3 min-w-0">
            {screen !== 'TITLE' ? (
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
            <span className="hidden sm:inline font-mono-tabular text-xs theme-text-faint">시즌 3 · 결승 3회전</span>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setRulesOpen(true)} className={secondaryButton}>
              <BookOpen className="w-4 h-4 text-slate-500 dark:text-lounge-slate-400" />
              게임 규칙
            </button>
            <ThemeToggleButton compact />
          </div>
        </div>

        {screen === 'TITLE' && (
          <TitleScreen
            difficulty={difficulty}
            onChangeDifficulty={setDifficulty}
            onStart={startSetup}
            onOpenRules={() => setRulesOpen(true)}
          />
        )}

        {screen === 'SETUP' && (
          <div className="obsidian-panel rounded-2xl p-5 sm:p-6 space-y-5 max-w-xl w-full mx-auto">
            <div className="space-y-1">
              <div className="font-mono-tabular text-xs theme-text-faint">SECRET · vs {aiName}</div>
              <h2 className="font-display text-xl font-bold theme-text-primary">비밀 수식을 정하세요</h2>
              <p className="text-sm theme-text-muted">
                {aiName}이(가) 이 수식을 맞히려고 합니다. 9칸, 등식 성립, = 1개. 키보드로도 입력할 수 있습니다(* → ×, / → ÷).
              </p>
            </div>
            <TileRow chars={input} active />
            <p
              className={[
                'text-xs text-center min-h-[1rem]',
                secretIssue ? 'theme-text-rival' : 'theme-text-emerald',
              ].join(' ')}
            >
              {input.length < EQUATION_LENGTH
                ? `${EQUATION_LENGTH - input.length}칸 남음`
                : secretIssue
                  ? EQUATION_ISSUE_TEXT[secretIssue]
                  : '성립하는 수식입니다.'}
            </p>
            <Keypad
              onKey={typeKey}
              onDelete={deleteKey}
              onSubmit={confirmSecret}
              submitLabel="확정"
              submitDisabled={input.length !== EQUATION_LENGTH || secretIssue !== null}
            />
            <button type="button" onClick={() => setInput(randomEquation())} className={secondaryButton}>
              <Shuffle className="w-4 h-4" />
              무작위 수식
            </button>
          </div>
        )}

        {screen === 'PLAY' && (
          <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-6 items-start">
            <section className="obsidian-panel rounded-2xl p-4 sm:p-5 space-y-4">
              <div className="flex items-baseline justify-between gap-3">
                <h2 className="font-display text-base font-bold theme-text-primary">{aiName}의 수식 추리</h2>
                <span className="text-xs font-mono-tabular theme-text-muted">
                  <span className="theme-text-gold font-semibold">
                    {outcome ? myGuesses.length : Math.min(turn, MAX_TURNS)}턴
                  </span>{' '}
                  / {MAX_TURNS}
                </span>
              </div>
              <div className="space-y-1.5">
                {myGuesses.map((g, i) => (
                  <TileRow key={i} chars={g.guess} signals={g.signals} />
                ))}
                {!outcome && <TileRow chars={input} active />}
                {outcome && (
                  <div className="pt-2 text-center text-xs theme-text-muted">
                    {aiName}의 수식: <span className="font-mono-tabular font-bold theme-text-primary">{aiSecret.join('')}</span>
                  </div>
                )}
              </div>
              {!outcome && (
                <>
                  <p className="text-xs text-center min-h-[1rem] theme-text-muted">
                    {aiThinking
                      ? `${aiName}도 추리하는 중…`
                      : input.length < EQUATION_LENGTH
                        ? '추측은 성립하지 않는 식이어도 됩니다.'
                        : 'Enter 또는 제출을 누르세요.'}
                  </p>
                  <Keypad
                    status={status}
                    onKey={typeKey}
                    onDelete={deleteKey}
                    onSubmit={submitGuess}
                    submitLabel="제출"
                    submitDisabled={input.length !== EQUATION_LENGTH || aiThinking}
                  />
                </>
              )}
              {outcome && (
                <button type="button" onClick={() => setResultOpen(true)} className={`${primaryButton} w-full`}>
                  결과 보기
                </button>
              )}
            </section>

            <section className="obsidian-panel rounded-2xl p-4 sm:p-5 space-y-3">
              <div className="flex items-baseline justify-between gap-3">
                <h2 className="font-display text-base font-bold theme-text-primary">{aiName}의 추측</h2>
                <span className="text-xs theme-text-muted">내 수식이 얼마나 드러났는지</span>
              </div>
              <div className="theme-control rounded-lg px-3 py-2 flex items-center justify-between text-xs">
                <span className="theme-text-faint">내 비밀 수식</span>
                <span className="font-mono-tabular font-bold text-base tracking-wider theme-text-gold">
                  {mySecret.join('')}
                </span>
              </div>
              <div className="space-y-1.5">
                {aiGuesses.length === 0 ? (
                  <p className="text-xs theme-text-faint text-center py-4">첫 추측을 제출하면 {aiName}도 동시에 추측합니다.</p>
                ) : (
                  aiGuesses.map((g, i) => <TileRow key={i} chars={g.guess} signals={g.signals} small />)
                )}
              </div>
            </section>
          </div>
        )}
      </main>

      <EquationRulesModal open={rulesOpen} onClose={() => setRulesOpen(false)} />

      {resultOpen && outcome && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/55 dark:bg-black/75 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="수식 신호등 결과"
          onClick={() => setResultOpen(false)}
        >
          <div
            className="w-full max-w-md obsidian-panel rounded-2xl p-6 space-y-5 text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="space-y-1">
              <div className="font-mono-tabular text-xs theme-text-faint">RESULT · {myGuesses.length}턴</div>
              <h2
                className={[
                  'font-display text-3xl font-bold',
                  outcome === 'win' ? 'theme-text-emerald' : outcome === 'lose' ? 'theme-text-rival' : 'theme-text-primary',
                ].join(' ')}
              >
                {outcome === 'win' ? '승리' : outcome === 'lose' ? '패배' : '무승부'}
              </h2>
              <p className="text-sm theme-text-muted">
                {outcome === 'win'
                  ? `${aiName}보다 먼저 수식을 맞혔습니다.`
                  : outcome === 'lose'
                    ? `${aiName}이(가) 먼저 내 수식을 맞혔습니다.`
                    : myGuesses.length >= MAX_TURNS
                      ? `${MAX_TURNS}턴 안에 아무도 맞히지 못했습니다.`
                      : '같은 턴에 둘 다 맞혔습니다.'}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="theme-control rounded-xl p-3">
                <div className="theme-text-faint">{aiName}의 수식</div>
                <div className="mt-1 font-mono-tabular text-base font-bold theme-text-primary">{aiSecret.join('')}</div>
              </div>
              <div className="theme-control rounded-xl p-3">
                <div className="theme-text-faint">내 수식</div>
                <div className="mt-1 font-mono-tabular text-base font-bold theme-text-gold">{mySecret.join('')}</div>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setResultOpen(false)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-300/80 dark:border-white/10 theme-control text-sm font-medium theme-text-secondary cursor-pointer"
              >
                기록 보기
              </button>
              <button type="button" onClick={startSetup} className={`${primaryButton} flex-1 py-2.5`}>
                다시 하기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Title                                                               */
/* ------------------------------------------------------------------ */

interface TitleScreenProps {
  difficulty: AIDifficulty;
  onChangeDifficulty: (d: AIDifficulty) => void;
  onStart: () => void;
  onOpenRules: () => void;
}

const TitleScreen: React.FC<TitleScreenProps> = ({ difficulty, onChangeDifficulty, onStart, onOpenRules }) => (
  <div className="my-auto grid grid-cols-1 lg:grid-cols-[1.05fr_0.95fr] gap-8 lg:gap-10 items-stretch">
    <div className="space-y-5">
      <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-white/[0.08]">
        <EquationSignalPreviewDiagram />
      </div>
      <div className="space-y-2">
        <div className="font-mono-tabular text-xs theme-text-muted">EQUATION SIGNAL · 9 SYMBOLS · 1:1</div>
        <h1 className="font-display text-3xl sm:text-4xl font-bold theme-text-primary">수식 신호등</h1>
        <p className="text-sm sm:text-base theme-text-secondary leading-relaxed text-pretty pt-1">
          9칸짜리 비밀 수식을 정하고, 상대 수식을 추측해 <strong className="theme-text-emerald font-semibold">초록</strong>·
          <strong className="theme-text-gold font-semibold">노랑</strong>·<strong className="theme-text-rival font-semibold">빨강</strong> 신호로 범위를 좁히세요. 먼저 맞히는 쪽이 이깁니다.
        </p>
      </div>
    </div>

    <div className="obsidian-panel rounded-2xl p-5 sm:p-6 flex flex-col gap-5">
      <div className="space-y-2">
        <div className="text-sm font-semibold theme-text-primary">대전 방식</div>
        <div className="text-sm theme-text-secondary">1P vs AI · 동시 추측</div>
      </div>
      <div className="space-y-2">
        <div className="text-sm font-semibold theme-text-primary">AI 난이도</div>
        <div className="grid grid-cols-3 gap-2">
          {(Object.keys(AI_DIFFICULTY_LABEL) as AIDifficulty[]).map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => onChangeDifficulty(d)}
              className={[
                'rounded-lg border py-2 text-sm font-semibold transition-colors cursor-pointer',
                difficulty === d
                  ? 'border-gold-400 bg-gold-100/60 dark:bg-gold-400/10 theme-text-primary'
                  : 'border-slate-300/80 dark:border-white/10 theme-control theme-text-secondary',
              ].join(' ')}
            >
              {AI_DIFFICULTY_LABEL[d]}
            </button>
          ))}
        </div>
        <p className="text-xs theme-text-muted">{AI_DIFFICULTY_DESC[difficulty]}</p>
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs border-y theme-border py-3">
        <div>
          <div className="theme-text-faint">기호</div>
          <div className="font-semibold theme-text-primary mt-0.5 font-mono-tabular">0~9 + - × ÷ = ^</div>
        </div>
        <div>
          <div className="theme-text-faint">승리 조건</div>
          <div className="font-semibold theme-text-primary mt-0.5">상대 수식 먼저 맞히기</div>
        </div>
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
