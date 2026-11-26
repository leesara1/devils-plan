import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, BookOpen, Circle, Play, Star, Triangle } from 'lucide-react';
import { GameScreenProps } from '../types';
import { ThemeToggleButton } from '../../components/ThemeToggleButton';
import { AuctionBingoPreviewDiagram } from '../../components/GameBoardIllustrations';
import { AuctionBingoRulesModal } from './components/AuctionBingoRulesModal';
import {
  AIDifficulty,
  BOARD,
  GameState,
  LINES,
  SHAPES,
  SHAPE_NAME,
  Shape,
  TOTAL_ROUNDS,
  chooseShape,
  createGame,
  finalStandings,
  nextRound,
  shownPrice,
  stepAI,
  submitBid,
  sum,
} from './engine/auctionBingo';

const AI_DIFFICULTY_LABEL: Record<AIDifficulty, string> = { normal: '쉬움', hard: '보통', master: '어려움' };
const AI_DIFFICULTY_DESC: Record<AIDifficulty, string> = {
  normal: '도형을 아무렇게나 고르고, 초반에 코인을 많이 씁니다.',
  hard: '필요한 도형을 고르지만 입찰이 들쭉날쭉합니다.',
  master: '필요한 도형을 고르고, 코인을 라운드에 맞춰 나눠 씁니다.',
};

const AI_DELAY_MS = 450;

const secondaryButton =
  'inline-flex items-center gap-2 h-9 px-3 rounded-lg border theme-border text-sm theme-text-secondary hover:text-slate-900 dark:hover:text-white hover:border-slate-400/70 dark:hover:border-white/25 transition-colors cursor-pointer whitespace-nowrap';
const primaryButton =
  'inline-flex items-center justify-center gap-2 h-11 px-5 rounded-lg bg-gold-400 hover:bg-gold-300 text-gold-950 font-medium text-sm transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed';
const neutralButton =
  'inline-flex items-center justify-center gap-2 h-11 px-5 rounded-lg theme-control theme-text-primary text-sm font-medium transition-colors cursor-pointer hover:border-slate-400/70 dark:hover:border-white/25 disabled:opacity-40 disabled:cursor-not-allowed';

const ShapeIcon: React.FC<{ shape: Shape; className?: string }> = ({ shape, className = 'w-5 h-5' }) => {
  const Icon = shape === 0 ? Triangle : shape === 1 ? Circle : Star;
  return <Icon className={className} aria-label={SHAPE_NAME[shape]} />;
};

/** 3×3 board. `filled` marks placed shapes; completed lines are drawn in the accent. */
const Board: React.FC<{ filled?: boolean[]; size?: 'sm' | 'md' }> = ({ filled, size = 'md' }) => {
  const done = new Set(
    LINES.filter((l) => filled && l.every((i) => filled[i])).flat(),
  );
  const cell = size === 'sm' ? 'w-7 h-7' : 'w-12 h-12 sm:w-14 sm:h-14';
  const icon = size === 'sm' ? 'w-3.5 h-3.5' : 'w-5 h-5';
  return (
    <div className="grid grid-cols-3 gap-1 w-max" role="img" aria-label="빙고판">
      {BOARD.map((shape, i) => {
        const on = !!filled?.[i];
        return (
          <div
            key={i}
            className={[
              cell,
              'rounded-md border flex items-center justify-center transition-colors',
              on
                ? done.has(i)
                  ? 'bg-gold-400 border-gold-400 text-gold-950'
                  : 'bg-slate-800 border-slate-800 text-white dark:bg-slate-200 dark:border-slate-200 dark:text-slate-900'
                : 'theme-border theme-text-muted',
            ].join(' ')}
          >
            <ShapeIcon shape={shape} className={icon} />
          </div>
        );
      })}
    </div>
  );
};

export function AuctionBingoGame({ onExitToHub }: GameScreenProps) {
  const [screen, setScreen] = useState<'TITLE' | 'GAME'>('TITLE');
  const [difficulty, setDifficulty] = useState<AIDifficulty>('hard');
  const [rulesOpen, setRulesOpen] = useState(false);
  const [game, setGame] = useState<GameState | null>(null);
  const [picked, setPicked] = useState<number[]>([]); // indexes into my coins

  const start = useCallback(() => {
    setGame(createGame(difficulty));
    setPicked([]);
    setScreen('GAME');
  }, [difficulty]);

  const hs = game?.humanSeat ?? 0;
  const me = game?.players[hs] ?? null;

  // AIs act once the human has committed for this phase.
  useEffect(() => {
    if (!game || rulesOpen) return;
    const humanDone =
      (game.phase === 'CHOOSE' && game.choices[hs] !== null) || (game.phase === 'BID' && game.bids[hs] !== null);
    if (!humanDone) return;
    const t = window.setTimeout(() => setGame((g) => (g ? stepAI(g) : g)), AI_DELAY_MS);
    return () => window.clearTimeout(t);
  }, [game, rulesOpen, hs]);

  // With no coins left the human cannot bid: submit nothing (ranked last).
  useEffect(() => {
    if (game && game.phase === 'BID' && game.bids[hs] === null && me && me.coins.length === 0) {
      setGame(submitBid(game, hs, []));
    }
  }, [game, hs, me]);

  useEffect(() => setPicked([]), [game?.round, game?.phase]);

  const myCoins = useMemo(() => (me ? [...me.coins].sort((a, b) => a - b) : []), [me]);
  const bidValue = sum(picked.map((i) => myCoins[i]));
  const lastRecord = game && game.history.length ? game.history[game.history.length - 1] : null;
  const showRecord = game?.phase === 'RESULT' || game?.phase === 'FINAL' ? lastRecord : null;
  const choicesPublic = game ? game.phase !== 'CHOOSE' : false;
  const shownChoices = game ? (game.phase === 'RESULT' || game.phase === 'FINAL' ? lastRecord?.choices : game.choices) : null;

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
            <span className="hidden sm:inline text-sm theme-text-muted">시즌 3 · 메인 매치</span>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setRulesOpen(true)} className={secondaryButton}>
              <BookOpen className="w-4 h-4" />
              게임 규칙
            </button>
            <ThemeToggleButton compact />
          </div>
        </div>

        {screen === 'TITLE' || !game || !me ? (
          <TitleScreen
            difficulty={difficulty}
            onChangeDifficulty={setDifficulty}
            onStart={start}
            onOpenRules={() => setRulesOpen(true)}
          />
        ) : game.phase === 'FINAL' ? (
          <FinalScreen game={game} onRestart={start} onTitle={() => setScreen('TITLE')} />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 items-start">
            <div className="space-y-6">
              <div className="flex items-baseline justify-between gap-3">
                <h1 className="font-display text-xl font-medium theme-text-primary">
                  {game.round}라운드
                  <span className="ml-2 text-sm theme-text-muted font-mono-tabular">/ {TOTAL_ROUNDS}</span>
                </h1>
                <span className="text-sm theme-text-muted">
                  {game.phase === 'CHOOSE' ? '도형 선택' : game.phase === 'BID' ? '입찰' : '결과'}
                </span>
              </div>

              {/* Shape boxes */}
              <div className="grid grid-cols-3 gap-3">
                {SHAPES.map((shape) => {
                  const chosen = game.choices[hs] === shape;
                  const choosers = (shownChoices ?? [])
                    .map((c, s) => (c === shape ? s : -1))
                    .filter((s) => s >= 0);
                  const price = showRecord ? shownPrice(showRecord, shape) : null;
                  const selectable = game.phase === 'CHOOSE' && game.choices[hs] === null;
                  return (
                    <button
                      key={shape}
                      type="button"
                      disabled={!selectable}
                      onClick={() => setGame((g) => (g ? chooseShape(g, hs, shape) : g))}
                      className={[
                        'obsidian-panel rounded-xl p-4 text-left flex flex-col gap-3 min-h-[148px] transition-colors',
                        chosen || (showRecord && showRecord.choices[hs] === shape)
                          ? 'border-slate-500 dark:border-white/40'
                          : '',
                        selectable ? 'cursor-pointer hover:border-slate-400/70 dark:hover:border-white/25' : 'cursor-default',
                      ].join(' ')}
                    >
                      <div className="flex items-center justify-between">
                        <span className="inline-flex items-center gap-2 theme-text-primary">
                          <ShapeIcon shape={shape} />
                          <span className="text-sm font-medium">{SHAPE_NAME[shape]}</span>
                        </span>
                        {choicesPublic && (
                          <span className="font-mono-tabular text-sm theme-text-secondary">{choosers.length}명</span>
                        )}
                      </div>
                      {choicesPublic ? (
                        <div className="flex flex-wrap gap-1">
                          {choosers.map((s) => (
                            <span
                              key={s}
                              className={[
                                'text-xs px-1.5 py-0.5 rounded',
                                s === hs ? 'theme-text-gold' : 'theme-text-secondary',
                              ].join(' ')}
                            >
                              {game.players[s].name}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs theme-text-muted">{chosen ? '선택함' : ''}</span>
                      )}
                      {showRecord && (
                        <div className="mt-auto text-sm">
                          <span className="theme-text-muted">낙찰가 </span>
                          <span className="font-mono-tabular theme-text-primary">
                            {price === null ? '—' : price === 'secret' ? '비공개' : `${price}원`}
                          </span>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Actions */}
              <div className="obsidian-panel rounded-xl p-4 sm:p-5 space-y-4">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-sm theme-text-secondary">내 코인</span>
                  <span className="font-mono-tabular text-sm theme-text-primary">
                    {sum(me.coins)}원 · 남은 라운드{' '}
                    {TOTAL_ROUNDS - game.round + (game.phase === 'RESULT' ? 0 : 1)}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {myCoins.map((v, i) => {
                    const on = picked.includes(i);
                    const canPick = game.phase === 'BID' && game.bids[hs] === null;
                    return (
                      <button
                        key={`${v}-${i}`}
                        type="button"
                        disabled={!canPick}
                        aria-pressed={on}
                        onClick={() => setPicked((p) => (on ? p.filter((x) => x !== i) : [...p, i]))}
                        className={[
                          'w-11 h-11 rounded-full border font-mono-tabular text-sm transition-colors',
                          on
                            ? 'bg-gold-400 border-gold-400 text-gold-950'
                            : 'theme-border theme-text-primary',
                          canPick ? 'cursor-pointer hover:border-slate-400/70 dark:hover:border-white/30' : 'cursor-default opacity-70',
                        ].join(' ')}
                      >
                        {v}
                      </button>
                    );
                  })}
                  {myCoins.length === 0 && <span className="text-sm theme-text-muted">코인 없음</span>}
                </div>

                {game.phase === 'CHOOSE' && (
                  <p className="text-sm theme-text-muted">
                    {game.choices[hs] === null ? '이름표를 넣을 도형을 고르세요' : '다른 플레이어를 기다리는 중'}
                  </p>
                )}

                {game.phase === 'BID' && (
                  <div className="flex items-center gap-3">
                    <span className="text-sm theme-text-secondary">
                      {game.choices[hs] !== null && <ShapeIcon shape={game.choices[hs] as Shape} className="inline w-4 h-4 -mt-0.5 mr-1" />}
                      입찰 <span className="font-mono-tabular theme-text-primary">{bidValue}원</span>
                    </span>
                    <button
                      type="button"
                      disabled={game.bids[hs] !== null || bidValue < 1}
                      onClick={() => setGame((g) => (g ? submitBid(g, hs, picked.map((i) => myCoins[i])) : g))}
                      className={`${primaryButton} ml-auto`}
                    >
                      {game.bids[hs] !== null ? '입찰 완료' : '입찰'}
                    </button>
                  </div>
                )}

                {game.phase === 'RESULT' && (
                  <div className="flex items-center gap-3">
                    <span className="text-sm theme-text-secondary">
                      내 입찰{' '}
                      <span className="font-mono-tabular theme-text-primary">
                        {lastRecord ? `${lastRecord.bids[hs]}원` : '—'}
                      </span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setGame((g) => (g ? nextRound(g) : g))}
                      className={`${primaryButton} ml-auto`}
                    >
                      {game.round >= TOTAL_ROUNDS ? '최종 결과' : '다음 라운드'}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Side: my board and round history */}
            <aside className="space-y-4">
              <div className="obsidian-panel rounded-xl p-4 space-y-3">
                <h2 className="text-sm font-medium theme-text-primary">내 빙고판</h2>
                <Board />
              </div>
              <div className="obsidian-panel rounded-xl p-4 space-y-2">
                <h2 className="text-sm font-medium theme-text-primary">라운드 기록</h2>
                {game.history.length === 0 ? (
                  <p className="text-sm theme-text-muted">아직 없음</p>
                ) : (
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="theme-text-muted">
                        <th className="text-left font-normal py-1">R</th>
                        <th className="text-left font-normal">내 선택</th>
                        <th className="text-right font-normal">내 입찰</th>
                        <th className="text-right font-normal">낙찰가</th>
                      </tr>
                    </thead>
                    <tbody className="font-mono-tabular">
                      {game.history.map((rec) => {
                        const mine = rec.choices[hs];
                        const p = mine === null ? null : shownPrice(rec, mine);
                        return (
                          <tr key={rec.round} className="border-t theme-border">
                            <td className="py-1.5 theme-text-muted">{rec.round}</td>
                            <td className="theme-text-secondary">
                              {mine === null ? '—' : <ShapeIcon shape={mine} className="w-3.5 h-3.5" />}
                            </td>
                            <td className="text-right theme-text-primary">{rec.bids[hs]}원</td>
                            <td className="text-right theme-text-primary">
                              {p === null ? '—' : p === 'secret' ? '비공개' : `${p}원`}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </aside>
          </div>
        )}
      </main>

      <AuctionBingoRulesModal open={rulesOpen} onClose={() => setRulesOpen(false)} />
    </div>
  );
}

const FinalScreen: React.FC<{ game: GameState; onRestart: () => void; onTitle: () => void }> = ({
  game,
  onRestart,
  onTitle,
}) => {
  const standings = finalStandings(game);
  const mine = standings.find((s) => s.seat === game.humanSeat);
  const last = Math.max(...standings.map((s) => s.rank));
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <div className="text-sm theme-text-muted">최종 결과</div>
        <h1 className="font-display display-tight text-3xl font-medium theme-text-primary">
          {mine ? `${mine.rank}위` : ''}
          {mine && mine.rank === last ? ' · 탈락' : ''}
        </h1>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {standings.map((s) => {
          const p = game.players[s.seat];
          const held = game.holdings[s.seat];
          return (
            <div
              key={s.seat}
              className={[
                'obsidian-panel rounded-xl p-4 flex gap-4',
                p.isHuman ? 'border-slate-500 dark:border-white/40' : '',
              ].join(' ')}
            >
              <Board filled={s.placement.filled} size="sm" />
              <div className="min-w-0 flex-1 space-y-1 text-sm">
                <div className="flex items-baseline justify-between gap-2">
                  <span className={p.isHuman ? 'theme-text-gold font-medium' : 'theme-text-primary font-medium'}>
                    {s.rank}위 · {p.name}
                  </span>
                  {s.rank === last && <span className="text-xs theme-text-rival">탈락</span>}
                </div>
                <div className="theme-text-secondary font-mono-tabular text-xs">
                  빙고 {s.lines} · 칸 {s.cells} · {s.coins}원
                </div>
                <div className="theme-text-muted text-xs font-mono-tabular">
                  △{held[0]} ○{held[1]} ☆{held[2]}
                  {s.autoLast ? ' · 입찰 불가' : ''}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex gap-2">
        <button type="button" onClick={onTitle} className={neutralButton}>
          타이틀로
        </button>
        <button type="button" onClick={onRestart} className={primaryButton}>
          다시 하기
        </button>
      </div>
    </div>
  );
};

const TitleScreen: React.FC<{
  difficulty: AIDifficulty;
  onChangeDifficulty: (d: AIDifficulty) => void;
  onStart: () => void;
  onOpenRules: () => void;
}> = ({ difficulty, onChangeDifficulty, onStart, onOpenRules }) => (
  <div className="my-auto grid grid-cols-1 lg:grid-cols-[1.05fr_0.95fr] gap-8 lg:gap-10 items-stretch">
    <div className="space-y-5">
      <div className="rounded-xl overflow-hidden border theme-border">
        <AuctionBingoPreviewDiagram />
      </div>
      <div className="space-y-2">
        <div className="text-sm theme-text-muted">메인 매치 · 7인 · 7라운드</div>
        <h1 className="font-display display-tight text-3xl sm:text-4xl font-medium theme-text-primary">경매 빙고</h1>
        <p className="text-base theme-text-secondary leading-relaxed">
          도형 상자를 고르고 코인 30원으로 입찰해 빙고판을 채우세요. 입찰한 코인은 낙찰받지 못해도 돌아오지 않고, 누가 낙찰받았는지는 끝날 때까지 공개되지 않습니다.
        </p>
      </div>
    </div>

    <div className="obsidian-panel rounded-2xl p-5 sm:p-6 flex flex-col gap-5">
      <div className="space-y-2">
        <div className="text-sm font-medium theme-text-primary">대전 방식</div>
        <div className="text-sm theme-text-secondary">1P vs AI 6명</div>
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
                difficulty === d
                  ? 'border-slate-500 dark:border-white/40 theme-text-primary font-medium'
                  : 'theme-border theme-text-secondary',
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
