import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, BookOpen, Crown, Play, RotateCcw } from 'lucide-react';
import { GameScreenProps } from '../types';
import { ThemeToggleButton } from '../../components/ThemeToggleButton';
import { CardJanggiPreviewDiagram } from '../../components/GameBoardIllustrations';
import { pickAiOpponents } from '../playerProfiles';
import { CardJanggiRulesModal } from './components/CardJanggiRulesModal';
import {
  AIDifficulty,
  CARDS,
  CARD_DESC,
  CARD_NAME,
  Card,
  MAX_ROUNDS,
  MatchState,
  Move,
  Piece,
  SIZE,
  arrange,
  canPlay,
  chooseAIMove,
  chooseAIOrder,
  currentCard,
  destinations,
  finishRound,
  legalMoves,
  newMatch,
  playCard,
  setSize,
  targetSquare,
  WINS_NEEDED,
} from './engine/cardJanggi';

const AI_DIFFICULTY_LABEL: Record<AIDifficulty, string> = { normal: '쉬움', hard: '보통', master: '어려움' };
const AI_DIFFICULTY_DESC: Record<AIDifficulty, string> = {
  normal: '한 수 앞만 보고, 카드 순서를 아무렇게나 정합니다.',
  hard: '세 수 앞을 읽고, 카드 순서를 계산해서 정합니다.',
  master: '다섯 수 앞을 읽고, 카드 순서를 계산해서 정합니다.',
};

const HUMAN = 0;
const AI = 1;
const AI_DELAY_MS = 550;

const secondaryButton =
  'inline-flex items-center gap-2 h-9 px-3 rounded-lg border theme-border text-sm theme-text-secondary hover:text-slate-900 dark:hover:text-white hover:border-slate-400/70 dark:hover:border-white/25 transition-colors cursor-pointer whitespace-nowrap';
const primaryButton =
  'inline-flex items-center justify-center gap-2 h-11 px-5 rounded-lg bg-gold-400 hover:bg-gold-300 text-gold-950 font-medium text-sm transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed';
const neutralButton =
  'inline-flex items-center justify-center gap-2 h-11 px-5 rounded-lg theme-control theme-text-primary text-sm font-medium transition-colors cursor-pointer hover:border-slate-400/70 dark:hover:border-white/25 disabled:opacity-40 disabled:cursor-not-allowed';

/* ------------------------------------------------------------------ */
/* Card tile with its movement pattern                                 */
/* ------------------------------------------------------------------ */

function patternCells(card: Card): Set<string> {
  const centre: Piece = { id: 'x', side: 0, big: false, r: 2, c: 2 };
  return new Set(destinations([centre], centre, card).map(([r, c]) => `${r},${c}`));
}

const CardTile: React.FC<{
  card: Card;
  state?: 'next' | 'queued' | 'used' | 'hidden' | 'plain';
  order?: number | null;
  onClick?: () => void;
  disabled?: boolean;
  compact?: boolean;
}> = ({ card, state = 'plain', order = null, onClick, disabled, compact }) => {
  const cells = useMemo(() => patternCells(card), [card]);
  if (state === 'hidden') {
    return (
      <div
        aria-label="뒷면 카드"
        className={`${compact ? 'w-14 h-[72px]' : 'w-20 h-28'} rounded-lg border theme-border bg-[repeating-linear-gradient(45deg,#cbd5e1_0_4px,#e2e8f0_4px_8px)] dark:bg-[repeating-linear-gradient(45deg,#2a303f_0_4px,#212632_4px_8px)]`}
      />
    );
  }
  const dot = compact ? 'w-1.5 h-1.5' : 'w-2 h-2';
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || !onClick}
      aria-label={`${CARD_NAME[card]} 카드 · ${CARD_DESC[card]}`}
      className={[
        compact ? 'w-14 h-[72px] p-1.5 gap-1' : 'w-20 h-28 p-2 gap-1.5',
        'relative rounded-lg border flex flex-col items-center justify-between transition-colors',
        state === 'next' ? 'border-gold-400 ring-1 ring-gold-400/60' : 'theme-border',
        state === 'used' ? 'opacity-40' : '',
        onClick && !disabled ? 'cursor-pointer hover:border-slate-400/70 dark:hover:border-white/30' : 'cursor-default',
        'obsidian-panel',
      ].join(' ')}
    >
      <span className={`${compact ? 'text-xs' : 'text-sm'} font-medium theme-text-primary`}>{CARD_NAME[card]}</span>
      <span className="grid grid-cols-5 gap-[2px]">
        {Array.from({ length: 25 }, (_, i) => {
          const r = Math.floor(i / 5);
          const c = i % 5;
          const on = cells.has(`${r},${c}`);
          const mid = r === 2 && c === 2;
          return (
            <span
              key={i}
              className={[
                dot,
                'rounded-[1px]',
                mid ? 'bg-slate-500 dark:bg-slate-300' : on ? 'bg-gold-500 dark:bg-gold-400' : 'bg-slate-200 dark:bg-white/10',
              ].join(' ')}
            />
          );
        })}
      </span>
      {order !== null && (
        <span className="absolute -top-2 -left-2 w-5 h-5 rounded-full bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900 text-[11px] font-mono-tabular flex items-center justify-center">
          {order}
        </span>
      )}
    </button>
  );
};

/* ------------------------------------------------------------------ */
/* Board                                                               */
/* ------------------------------------------------------------------ */

const BoardView: React.FC<{
  pieces: Piece[];
  selected: string | null;
  targets: Set<string>;
  lastMove: { from: string; to: string } | null;
  onSquare: (r: number, c: number) => void;
}> = ({ pieces, selected, targets, lastMove, onSquare }) => {
  const goals = new Set([targetSquare(0), targetSquare(1)].map(([r, c]) => `${r},${c}`));
  return (
    <div className="grid grid-cols-5 grid-rows-5 gap-1 w-full max-w-[400px] mx-auto aspect-square" role="grid" aria-label="카드 장기 판">
      {Array.from({ length: SIZE * SIZE }, (_, i) => {
        const r = Math.floor(i / SIZE);
        const c = i % SIZE;
        const key = `${r},${c}`;
        const piece = pieces.find((p) => p.r === r && p.c === c);
        const isTarget = targets.has(key);
        const isLast = lastMove && (lastMove.from === key || lastMove.to === key);
        return (
          <button
            key={key}
            type="button"
            onClick={() => onSquare(r, c)}
            aria-label={`${'abcde'[c]}${SIZE - r}${piece ? (piece.side === HUMAN ? ' 내 ' : ' 상대 ') + (piece.big ? '큰 말' : '작은 말') : ''}`}
            className={[
              'relative rounded-md border flex items-center justify-center transition-colors',
              isLast ? 'bg-slate-200/70 dark:bg-white/[0.07]' : 'bg-slate-100/60 dark:bg-white/[0.03]',
              selected && piece?.id === selected ? 'border-gold-400' : 'theme-border',
              isTarget ? 'cursor-pointer' : 'cursor-default',
            ].join(' ')}
          >
            {goals.has(key) && !piece && (
              <span className="absolute w-3 h-3 rounded-full border theme-border" aria-hidden="true" />
            )}
            {piece && (
              <span
                className={[
                  'rounded-full flex items-center justify-center',
                  piece.big ? 'w-[72%] h-[72%]' : 'w-[50%] h-[50%]',
                  piece.side === HUMAN
                    ? 'bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900'
                    : 'bg-rival-500 text-white',
                ].join(' ')}
              >
                {piece.big && <Crown className="w-1/2 h-1/2" />}
              </span>
            )}
            {isTarget && (
              <span
                className={[
                  'absolute rounded-full',
                  piece ? 'inset-1 border-2 border-gold-400' : 'w-3 h-3 bg-gold-400',
                ].join(' ')}
                aria-hidden="true"
              />
            )}
          </button>
        );
      })}
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Main                                                                */
/* ------------------------------------------------------------------ */

export function CardJanggiGame({ onExitToHub }: GameScreenProps) {
  const [screen, setScreen] = useState<'TITLE' | 'GAME'>('TITLE');
  const [difficulty, setDifficulty] = useState<AIDifficulty>('hard');
  const [rulesOpen, setRulesOpen] = useState(false);
  const [match, setMatch] = useState<MatchState | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [draft, setDraft] = useState<Card[]>([]);
  const [lastMove, setLastMove] = useState<{ from: string; to: string } | null>(null);

  const start = useCallback(() => {
    setMatch(newMatch(difficulty, pickAiOpponents(1)[0]));
    setSelected(null);
    setDraft([]);
    setLastMove(null);
    setScreen('GAME');
  }, [difficulty]);

  const round = match?.round ?? null;
  const card = round ? currentCard(round) : null;
  const myTurn = !!round && canPlay(round) && round.turn === HUMAN && !rulesOpen;
  const myMoves: Move[] = useMemo(
    () => (round && myTurn && card ? legalMoves(round.pieces, HUMAN, card) : []),
    [round, myTurn, card],
  );
  const targets = useMemo(
    () => new Set(myMoves.filter((m) => m.pieceId === selected).map((m) => `${m.r},${m.c}`)),
    [myMoves, selected],
  );

  const applyMove = useCallback((m: MatchState, move: Move | null) => {
    const mover = move ? m.round.pieces.find((p) => p.id === move.pieceId) : null;
    if (mover && move) setLastMove({ from: `${mover.r},${mover.c}`, to: `${move.r},${move.c}` });
    return { ...m, round: playCard(m.round, move) };
  }, []);

  // AI: arrange when needed, then move on its turn.
  useEffect(() => {
    if (!match || !round || rulesOpen || round.winner !== null) return;
    if (round.needArrange[AI]) {
      const t = window.setTimeout(() => {
        setMatch((m) => (m ? { ...m, round: arrange(m.round, AI, chooseAIOrder(m.round, AI, m.difficulty)) } : m));
      }, 200);
      return () => window.clearTimeout(t);
    }
    if (canPlay(round) && round.turn === AI) {
      const t = window.setTimeout(() => {
        setMatch((m) => (m ? applyMove(m, chooseAIMove(m.round, m.difficulty)) : m));
      }, AI_DELAY_MS);
      return () => window.clearTimeout(t);
    }
  }, [match, round, rulesOpen, applyMove]);

  const onSquare = (r: number, c: number) => {
    if (!match || !round || !myTurn) return;
    const key = `${r},${c}`;
    if (selected && targets.has(key)) {
      setMatch(applyMove(match, { pieceId: selected, r, c }));
      setSelected(null);
      return;
    }
    const piece = round.pieces.find((p) => p.r === r && p.c === c && p.side === HUMAN);
    setSelected(piece && myMoves.some((m) => m.pieceId === piece.id) ? piece.id : null);
  };

  const needMyOrder = !!round && round.needArrange[HUMAN] && round.winner === null;
  const orderSize = round ? setSize(round, HUMAN) : 5;

  return (
    <div className="min-h-screen w-full overflow-x-hidden theme-canvas flex flex-col">
      <main className="flex-1 flex flex-col px-4 py-5 sm:px-8 sm:py-7 max-w-6xl w-full mx-auto gap-6">
        <div className="flex items-center justify-between gap-3 pb-4 border-b theme-border">
          <div className="flex items-center gap-3 min-w-0">
            {screen === 'GAME' ? (
              <button type="button" onClick={() => setScreen('TITLE')} className={secondaryButton}>
                <ArrowLeft className="w-4 h-4" />
                타이틀
              </button>
            ) : (
              onExitToHub && (
                <button type="button" onClick={onExitToHub} className={secondaryButton}>
                  <ArrowLeft className="w-4 h-4" />
                  매치 목록
                </button>
              )
            )}
            <span className="hidden sm:inline text-sm theme-text-muted">시즌 3 · 결승 1회전</span>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setRulesOpen(true)} className={secondaryButton}>
              <BookOpen className="w-4 h-4" />
              게임 규칙
            </button>
            <ThemeToggleButton compact />
          </div>
        </div>

        {screen === 'TITLE' || !match || !round ? (
          <TitleScreen
            difficulty={difficulty}
            onChangeDifficulty={setDifficulty}
            onStart={start}
            onOpenRules={() => setRulesOpen(true)}
          />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6 items-start">
            <div className="space-y-4">
              <div className="flex items-baseline justify-between gap-3">
                <h1 className="font-display text-xl font-medium theme-text-primary">
                  {match.roundNumber}라운드
                  <span className="ml-2 text-sm theme-text-muted">{round.first === HUMAN ? '내가 선공' : '상대 선공'}</span>
                </h1>
                <span className="font-mono-tabular text-sm theme-text-secondary">
                  1P {match.wins[HUMAN]} : {match.wins[AI]} {match.aiName}
                </span>
              </div>

              {/* Opponent's cards */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                <span className="text-sm theme-text-muted sm:w-16 shrink-0">{match.aiName}</span>
                <div className="flex gap-2 flex-wrap">
                  {round.queues[AI].map((c, i) =>
                    i === 0 ? <CardTile key={`ai-${i}`} card={c} state="next" compact /> : <CardTile key={`ai-${i}`} card={c} state="hidden" compact />,
                  )}
                  {round.used[AI].map((c, i) => (
                    <CardTile key={`aiu-${i}`} card={c} state="used" compact />
                  ))}
                </div>
              </div>

              <BoardView
                pieces={round.pieces}
                selected={selected}
                targets={targets}
                lastMove={lastMove}
                onSquare={onSquare}
              />

              {/* My cards */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                <span className="text-sm theme-text-gold sm:w-16 shrink-0">1P</span>
                <div className="flex gap-2 flex-wrap">
                  {round.queues[HUMAN].map((c, i) => (
                    <CardTile key={`me-${i}`} card={c} state={i === 0 ? 'next' : 'queued'} order={i + 1} compact />
                  ))}
                  {round.used[HUMAN].map((c, i) => (
                    <CardTile key={`meu-${i}`} card={c} state="used" compact />
                  ))}
                </div>
              </div>
            </div>

            <aside className="space-y-4">
              {needMyOrder ? (
                <div className="obsidian-panel rounded-xl p-4 space-y-4">
                  <div className="flex items-baseline justify-between">
                    <h2 className="text-sm font-medium theme-text-primary">카드 순서 정하기</h2>
                    <span className="text-xs theme-text-muted font-mono-tabular">
                      {draft.length} / {orderSize}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {CARDS.map((c) => {
                      const idx = draft.indexOf(c);
                      return (
                        <CardTile
                          key={c}
                          card={c}
                          order={idx >= 0 ? idx + 1 : null}
                          state={idx >= 0 ? 'next' : 'plain'}
                          disabled={idx < 0 && draft.length >= orderSize}
                          onClick={() =>
                            setDraft((d) => (d.includes(c) ? d.filter((x) => x !== c) : d.length < orderSize ? [...d, c] : d))
                          }
                        />
                      );
                    })}
                  </div>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setDraft([])} className={neutralButton}>
                      <RotateCcw className="w-4 h-4" />
                      다시
                    </button>
                    <button
                      type="button"
                      disabled={draft.length !== orderSize}
                      onClick={() => {
                        setMatch((m) => (m ? { ...m, round: arrange(m.round, HUMAN, draft) } : m));
                        setDraft([]);
                      }}
                      className={`${primaryButton} flex-1`}
                    >
                      순서 확정
                    </button>
                  </div>
                </div>
              ) : round.winner !== null ? (
                <div className="obsidian-panel rounded-xl p-4 space-y-3">
                  <h2
                    className={[
                      'font-display text-2xl font-medium',
                      round.winner === HUMAN ? 'theme-text-emerald' : round.winner === AI ? 'theme-text-rival' : 'theme-text-primary',
                    ].join(' ')}
                  >
                    {round.winner === 'draw' ? '무승부' : round.winner === HUMAN ? '라운드 승리' : '라운드 패배'}
                  </h2>
                  <p className="text-sm theme-text-secondary">
                    {round.winReason === 'capture'
                      ? '큰 말을 잡았습니다'
                      : round.winReason === 'reach'
                        ? '큰 말이 상대 시작 칸에 도착했습니다'
                        : '60수 안에 승부가 나지 않았습니다'}
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setMatch((m) => (m ? finishRound(m) : m));
                      setLastMove(null);
                      setSelected(null);
                    }}
                    className={`${primaryButton} w-full`}
                  >
                    {(() => {
                      const w = round.winner;
                      const wins: [number, number] = [...match.wins];
                      if (w !== 'draw') wins[w] += 1;
                      return wins[0] >= WINS_NEEDED || wins[1] >= WINS_NEEDED || match.results.length + 1 >= MAX_ROUNDS ? '최종 결과' : '다음 라운드';
                    })()}
                  </button>
                </div>
              ) : (
                <div className="obsidian-panel rounded-xl p-4 space-y-3">
                  <h2 className="text-sm font-medium theme-text-primary">
                    {myTurn ? '내 차례' : round.needArrange[AI] ? `${match.aiName}이(가) 순서를 정하는 중` : `${match.aiName} 차례`}
                  </h2>
                  {myTurn && card && (
                    <>
                      <p className="text-sm theme-text-secondary">
                        {CARD_NAME[card]} · {CARD_DESC[card]}
                      </p>
                      {myMoves.length === 0 && (
                        <button
                          type="button"
                          onClick={() => setMatch(applyMove(match, null))}
                          className={`${neutralButton} w-full`}
                        >
                          넘기기
                        </button>
                      )}
                    </>
                  )}
                </div>
              )}

              <div className="obsidian-panel rounded-xl p-4 space-y-2">
                <h2 className="text-sm font-medium theme-text-primary">기록</h2>
                {round.log.length === 0 ? (
                  <p className="text-sm theme-text-muted">아직 없음</p>
                ) : (
                  <ol className="space-y-1 text-xs max-h-56 overflow-y-auto">
                    {[...round.log].reverse().map((e, i) => (
                      <li key={round.log.length - i} className={e.side === HUMAN ? 'theme-text-primary' : 'theme-text-secondary'}>
                        <span className="font-mono-tabular theme-text-muted mr-2">{round.log.length - i}</span>
                        {e.side === HUMAN ? '1P' : match.aiName} · {CARD_NAME[e.card]} · {e.text}
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            </aside>
          </div>
        )}
      </main>

      <CardJanggiRulesModal open={rulesOpen} onClose={() => setRulesOpen(false)} />

      {match?.over && screen === 'GAME' && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/55 dark:bg-black/75 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="카드 장기 최종 결과"
        >
          <div className="w-full max-w-sm obsidian-panel rounded-2xl p-6 space-y-5 text-center">
            <div className="space-y-1">
              <div className="text-sm theme-text-muted">최종 결과</div>
              <h2
                className={[
                  'font-display text-3xl font-medium',
                  match.wins[HUMAN] > match.wins[AI] ? 'theme-text-emerald' : match.wins[HUMAN] < match.wins[AI] ? 'theme-text-rival' : 'theme-text-primary',
                ].join(' ')}
              >
                {match.wins[HUMAN] > match.wins[AI] ? '승리' : match.wins[HUMAN] < match.wins[AI] ? '패배' : '무승부'}
              </h2>
              <p className="font-mono-tabular text-sm theme-text-secondary">
                1P {match.wins[HUMAN]} : {match.wins[AI]} {match.aiName}
              </p>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => setScreen('TITLE')} className={`${neutralButton} flex-1`}>
                타이틀로
              </button>
              <button type="button" onClick={start} className={`${primaryButton} flex-1`}>
                다시 하기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const TitleScreen: React.FC<{
  difficulty: AIDifficulty;
  onChangeDifficulty: (d: AIDifficulty) => void;
  onStart: () => void;
  onOpenRules: () => void;
}> = ({ difficulty, onChangeDifficulty, onStart, onOpenRules }) => (
  <div className="my-auto grid grid-cols-1 lg:grid-cols-[1.05fr_0.95fr] gap-8 lg:gap-10 items-stretch">
    <div className="space-y-5">
      <div className="rounded-xl overflow-hidden border theme-border">
        <CardJanggiPreviewDiagram />
      </div>
      <div className="space-y-2">
        <div className="text-sm theme-text-muted">결승 1회전 · 1:1 · 3판 2선승</div>
        <h1 className="font-display display-tight text-3xl sm:text-4xl font-medium theme-text-primary">카드 장기</h1>
        <p className="text-base theme-text-secondary leading-relaxed">
          행마 카드 5장을 쓸 순서를 미리 정하고, 그 순서대로 말을 움직여 상대 큰 말을 잡거나 큰 말을 상대 시작 칸에 보내세요.
        </p>
      </div>
    </div>

    <div className="obsidian-panel rounded-2xl p-5 sm:p-6 flex flex-col gap-5">
      <div className="space-y-2">
        <div className="text-sm font-medium theme-text-primary">대전 방식</div>
        <div className="text-sm theme-text-secondary">1P vs AI · 첫 라운드 선공은 동전 던지기</div>
      </div>
      <div className="space-y-2">
        <div className="text-sm font-medium theme-text-primary">AI 난이도</div>
        <div className="grid grid-cols-3 gap-2">
          {(Object.keys(AI_DIFFICULTY_LABEL) as AIDifficulty[]).map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => onChangeDifficulty(d)}
              aria-pressed={difficulty === d}
              className={[
                'h-10 rounded-lg border text-sm transition-colors cursor-pointer',
                difficulty === d ? 'border-slate-500 dark:border-white/40 theme-text-primary font-medium' : 'theme-border theme-text-secondary',
              ].join(' ')}
            >
              {AI_DIFFICULTY_LABEL[d]}
            </button>
          ))}
        </div>
        <p className="text-xs theme-text-muted">{AI_DIFFICULTY_DESC[difficulty]}</p>
      </div>
      <div className="mt-auto flex gap-2">
        <button type="button" onClick={onOpenRules} className={neutralButton}>
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
