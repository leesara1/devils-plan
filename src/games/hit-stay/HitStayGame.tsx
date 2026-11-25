import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, BookOpen, Crown, FastForward, Minus, Play, Plus, Trophy } from 'lucide-react';
import { GameScreenProps } from '../types';
import { ThemeToggleButton } from '../../components/ThemeToggleButton';
import { HitStayPreviewDiagram } from '../../components/GameBoardIllustrations';
import { HitStayRulesModal } from './components/HitStayRulesModal';
import {
  AIDifficulty,
  GameState,
  HCard,
  Hand,
  applyBet,
  applyHit,
  createGame,
  handSum,
  legalRaiseMax,
  nextRound,
  setReveal,
  stepAI,
  toCall,
} from './engine/hitStay';

const AI_DIFFICULTY_LABEL: Record<AIDifficulty, string> = {
  normal: '쉬움',
  hard: '보통',
  master: '어려움',
};

const AI_DIFFICULTY_DESC: Record<AIDifficulty, string> = {
  normal: '일찍 멈추고, 베팅 판단이 자주 흔들립니다.',
  hard: '적당히 과감하게 받고, 판돈 대비 승률로 베팅합니다.',
  master: '가장 과감하게 받고, 승률을 정밀하게 계산하며 가끔 블러핑합니다.',
};

type Speed = 'normal' | 'fast';
const AI_DELAY: Record<Speed, number> = { normal: 750, fast: 220 };

const PHASE_LABEL: Record<GameState['phase'], string> = {
  REVEAL: '카드 공개',
  BET1: '1차 베팅',
  HIT: 'HIT / STAY',
  BET2: '2차 베팅',
  SHOWDOWN: '승부',
  GAME_OVER: '게임 종료',
};

const secondaryButton =
  'inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300/80 bg-white text-xs font-medium text-slate-700 hover:border-slate-400 hover:text-slate-900 dark:border-white/10 dark:bg-obsidian-850 dark:text-lounge-slate-300 dark:hover:border-white/25 dark:hover:text-white transition-colors cursor-pointer whitespace-nowrap';

const primaryButton =
  'inline-flex items-center justify-center gap-1.5 px-5 py-3 rounded-xl bg-gold-400 hover:bg-gold-300 text-gold-950 font-bold text-sm transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed';

const ghostButton =
  'inline-flex items-center justify-center gap-1.5 px-4 py-3 rounded-xl border border-slate-300/80 dark:border-white/10 theme-control text-sm font-semibold theme-text-secondary cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed';

/* ------------------------------------------------------------------ */
/* Cards                                                               */
/* ------------------------------------------------------------------ */

const CardFace: React.FC<{
  card: HCard | null;
  hidden?: boolean;
  highlight?: boolean;
  small?: boolean;
  selectable?: boolean;
  label?: string;
  onClick?: () => void;
}> = ({ card, hidden, highlight, small, selectable, label, onClick }) => {
  const size = small ? 'w-7 h-10 text-sm' : 'w-11 h-16 text-xl';
  const base = `${size} rounded-md border-2 flex items-center justify-center font-mono-tabular font-bold shrink-0 transition-transform`;
  if (hidden || !card) {
    return (
      <div
        aria-label="뒷면 카드"
        className={`${base} border-slate-400/60 dark:border-white/15 bg-[repeating-linear-gradient(45deg,#cbd5e1_0_4px,#e2e8f0_4px_8px)] dark:bg-[repeating-linear-gradient(45deg,#2a303f_0_4px,#212632_4px_8px)]`}
      />
    );
  }
  const negative = card.value < 0;
  return (
    <button
      type="button"
      disabled={!selectable}
      onClick={onClick}
      aria-label={label ?? `카드 ${card.value}`}
      className={[
        base,
        'bg-white dark:bg-[#faf9f6]',
        negative ? 'text-rival-500' : 'text-slate-900',
        highlight ? 'border-gold-400 ring-2 ring-gold-400/60 -translate-y-1' : 'border-slate-300 dark:border-[#d6d3cb]',
        selectable ? 'cursor-pointer hover:-translate-y-1 hover:border-gold-400' : 'cursor-default',
      ].join(' ')}
    >
      {card.value}
    </button>
  );
};

/* ------------------------------------------------------------------ */
/* Seats                                                               */
/* ------------------------------------------------------------------ */

const SeatPanel: React.FC<{ game: GameState; seat: number }> = ({ game, seat }) => {
  const p = game.players[seat];
  const h = game.hands[seat];
  const isTurn = game.turnSeat === seat;
  const showdown = (game.phase === 'SHOWDOWN' || game.phase === 'GAME_OVER') && !!game.result;
  const won = showdown && game.result!.winners.includes(seat);
  const showAll = showdown && !!h && !h.folded && !game.result!.byFold;

  if (!h) {
    return (
      <div className="obsidian-subpanel rounded-xl p-3 opacity-50">
        <div className="text-sm font-semibold theme-text-secondary truncate">{p.name}</div>
        <div className="text-xs theme-text-rival mt-1">
          탈락 · {p.finishRank}위
        </div>
      </div>
    );
  }

  return (
    <div
      className={[
        'rounded-xl p-3 border transition-colors',
        won
          ? 'bg-[#ecfdf5] dark:bg-[#102a22] border-emerald-500/60'
          : isTurn
            ? 'obsidian-panel border-gold-400 ring-1 ring-gold-400/50'
            : 'obsidian-subpanel',
        h.folded ? 'opacity-55' : '',
      ].join(' ')}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1 min-w-0">
          {game.dealerSeat === seat && <Crown className="w-3.5 h-3.5 theme-text-gold shrink-0" aria-label="선 플레이어" />}
          <span className="text-sm font-semibold theme-text-primary truncate">{p.name}</span>
        </div>
        <span className="font-mono-tabular text-xs theme-text-gold font-bold">{p.chips}칩</span>
      </div>
      <div className="flex gap-1 mt-2 min-h-[40px] flex-wrap">
        {h.cards.map((c, i) => {
          const revealedPublicly = h.revealedIndex === i && game.phase !== 'REVEAL';
          return <CardFace key={c.id} card={c} hidden={!(revealedPublicly || showAll)} small />;
        })}
        {h.hits.map((c) => (
          <CardFace key={c.id} card={c} small />
        ))}
      </div>
      <div className="mt-1.5 flex items-center justify-between text-[11px]">
        <span className="theme-text-faint">베팅 {h.committedRound}</span>
        <span className="font-medium">
          {h.folded ? (
            <span className="theme-text-rival">포기</span>
          ) : showAll ? (
            <span className={won ? 'theme-text-emerald font-bold' : 'theme-text-secondary'}>
              합 {handSum(h)}
              {handSum(h) > game.limit ? ' (초과)' : ''}
            </span>
          ) : h.stayed ? (
            <span className="theme-text-sky">STAY</span>
          ) : isTurn ? (
            <span className="theme-text-gold">차례</span>
          ) : null}
        </span>
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Main                                                                */
/* ------------------------------------------------------------------ */

export function HitStayGame({ onExitToHub }: GameScreenProps) {
  const [screen, setScreen] = useState<'TITLE' | 'GAME'>('TITLE');
  const [difficulty, setDifficulty] = useState<AIDifficulty>('hard');
  const [speed, setSpeed] = useState<Speed>('normal');
  const [rulesOpen, setRulesOpen] = useState(false);
  const [game, setGame] = useState<GameState | null>(null);
  const [raiseBy, setRaiseBy] = useState(1);
  const [overDismissed, setOverDismissed] = useState(false);

  const start = useCallback(() => {
    setGame(createGame(difficulty));
    setOverDismissed(false);
    setScreen('GAME');
  }, [difficulty]);

  const hs = game?.humanSeat ?? 0;
  const myHand: Hand | null = game ? game.hands[hs] : null;
  const me = game ? game.players[hs] : null;
  const humanOut = !!me && me.finishRank !== null;
  const myTurn = !!game && game.turnSeat === hs && !rulesOpen;
  const needReveal = !!game && game.phase === 'REVEAL' && !!myHand && myHand.revealedIndex === null;

  // Drive AI decisions (and auto-advance rounds once the human is out).
  useEffect(() => {
    if (!game || rulesOpen || screen !== 'GAME') return;
    const delay = humanOut ? 60 : AI_DELAY[speed];
    if (game.phase === 'REVEAL') {
      const aiPending = game.hands.some((h, s) => h && h.revealedIndex === null && s !== hs);
      if (!aiPending) return;
      const t = window.setTimeout(() => setGame((g) => (g ? stepAI(g) : g)), 200);
      return () => window.clearTimeout(t);
    }
    if ((game.phase === 'BET1' || game.phase === 'BET2' || game.phase === 'HIT') && game.turnSeat !== hs) {
      const t = window.setTimeout(() => setGame((g) => (g ? stepAI(g) : g)), delay);
      return () => window.clearTimeout(t);
    }
    if (game.phase === 'SHOWDOWN' && humanOut) {
      const t = window.setTimeout(() => setGame((g) => (g ? nextRound(g) : g)), delay * 3);
      return () => window.clearTimeout(t);
    }
  }, [game, rulesOpen, screen, speed, hs, humanOut]);

  // Keep the raise stepper inside the legal range.
  const raiseMax = game ? legalRaiseMax(game) : 0;
  useEffect(() => {
    setRaiseBy((r) => Math.max(1, Math.min(r, Math.max(1, raiseMax))));
  }, [raiseMax]);

  /** Fast-forward to the end once the human can no longer act. */
  const finishInstantly = useCallback(() => {
    setGame((g) => {
      if (!g) return g;
      let s = g;
      let guard = 0;
      while (s.phase !== 'GAME_OVER' && guard++ < 50000) {
        s = s.phase === 'SHOWDOWN' ? nextRound(s) : stepAI(s, Math.random, true);
      }
      return s;
    });
  }, []);

  const owe = game ? toCall(game, hs) : 0;
  const mySum = myHand ? handSum(myHand) : 0;

  const opponents = useMemo(
    () => (game ? game.players.map((p) => p.seat).filter((s) => s !== hs) : []),
    [game, hs],
  );

  return (
    <div className="min-h-screen w-full overflow-x-hidden theme-canvas flex flex-col">
      <main className="flex-1 flex flex-col px-4 py-5 sm:px-8 sm:py-7 max-w-6xl w-full mx-auto gap-5">
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
            <span className="hidden sm:inline font-mono-tabular text-xs theme-text-faint">시즌 3 · 메인 매치</span>
          </div>
          <div className="flex items-center gap-2">
            {screen === 'GAME' && (
              <button
                type="button"
                onClick={() => setSpeed((s) => (s === 'normal' ? 'fast' : 'normal'))}
                aria-pressed={speed === 'fast'}
                className={secondaryButton}
              >
                <FastForward className={`w-4 h-4 ${speed === 'fast' ? 'theme-text-gold' : 'text-slate-500'}`} />
                {speed === 'fast' ? '빠르게' : '보통 속도'}
              </button>
            )}
            <button type="button" onClick={() => setRulesOpen(true)} className={secondaryButton}>
              <BookOpen className="w-4 h-4 text-slate-500 dark:text-lounge-slate-400" />
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
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-5 items-start">
            <div className="space-y-4">
              {/* Opponents */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {opponents.map((s) => (
                  <SeatPanel key={s} game={game} seat={s} />
                ))}
              </div>

              {/* Centre */}
              <div className="obsidian-panel rounded-2xl p-4 grid grid-cols-3 divide-x divide-slate-200 dark:divide-white/[0.08] text-center">
                <div className="px-2">
                  <div className="text-[11px] theme-text-faint">한계 숫자</div>
                  <div className="font-mono-tabular text-3xl font-bold theme-text-rival">{game.limit}</div>
                </div>
                <div className="px-2">
                  <div className="text-[11px] theme-text-faint">판돈</div>
                  <div className="font-mono-tabular text-3xl font-bold theme-text-gold">
                    {game.phase === 'SHOWDOWN' || game.phase === 'GAME_OVER' ? game.result?.pot ?? 0 : game.pot}
                  </div>
                </div>
                <div className="px-2">
                  <div className="text-[11px] theme-text-faint">{game.round}라운드</div>
                  <div className="text-sm font-semibold theme-text-primary mt-1.5">{PHASE_LABEL[game.phase]}</div>
                  <div className="text-[11px] theme-text-muted">기본 베팅 {game.baseBet} · 남은 카드 {game.deck.length}</div>
                </div>
              </div>

              {/* Me */}
              <div
                className={[
                  'rounded-2xl p-4 sm:p-5 space-y-4 border',
                  myTurn || needReveal ? 'obsidian-panel border-gold-400' : 'obsidian-panel',
                ].join(' ')}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-1.5">
                    {game.dealerSeat === hs && <Crown className="w-4 h-4 theme-text-gold" aria-label="선 플레이어" />}
                    <span className="font-display text-base font-bold theme-text-gold">{me.name}</span>
                    <span className="font-mono-tabular text-sm theme-text-primary font-semibold">{me.chips}칩</span>
                  </div>
                  {myHand && (
                    <span
                      className={[
                        'font-mono-tabular text-sm font-bold',
                        mySum > game.limit ? 'theme-text-rival' : mySum === game.limit ? 'theme-text-emerald' : 'theme-text-primary',
                      ].join(' ')}
                    >
                      내 합 {mySum} / {game.limit}
                    </span>
                  )}
                </div>

                {myHand ? (
                  <div className="flex gap-2 flex-wrap">
                    {myHand.cards.map((c, i) => (
                      <div key={c.id} className="flex flex-col items-center gap-1">
                        <CardFace
                          card={c}
                          highlight={myHand.revealedIndex === i}
                          selectable={needReveal}
                          label={needReveal ? `${c.value} 공개하기` : undefined}
                          onClick={() => setGame((g) => (g ? setReveal(g, hs, i) : g))}
                        />
                        <span className="text-[10px] theme-text-faint h-3">{myHand.revealedIndex === i ? '공개' : ''}</span>
                      </div>
                    ))}
                    {myHand.hits.map((c) => (
                      <div key={c.id} className="flex flex-col items-center gap-1">
                        <CardFace card={c} />
                        <span className="text-[10px] theme-text-faint h-3">HIT</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm theme-text-rival">탈락했습니다 · {me.finishRank}위</p>
                )}

                {/* Actions */}
                {needReveal && (
                  <p className="text-sm theme-text-sky font-medium">모두에게 공개할 카드 1장을 고르세요.</p>
                )}

                {myTurn && (game.phase === 'BET1' || game.phase === 'BET2') && (
                  <div className="space-y-3">
                    <div className="text-xs theme-text-muted">
                      콜 금액 <strong className="theme-text-primary">{owe}</strong> · 이번 베팅 최고 {game.currentBet} · 상한 {game.streetCap}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={owe === 0}
                        onClick={() => setGame((g) => (g ? applyBet(g, hs, { type: 'fold' }) : g))}
                        className={ghostButton}
                      >
                        포기
                      </button>
                      <button
                        type="button"
                        onClick={() => setGame((g) => (g ? applyBet(g, hs, { type: 'call' }) : g))}
                        className={ghostButton}
                      >
                        {owe === 0 ? '체크' : `콜 ${owe}`}
                      </button>
                      <div className="flex items-center gap-1 rounded-xl border border-slate-300/80 dark:border-white/10 theme-control px-1">
                        <button
                          type="button"
                          aria-label="레이즈 줄이기"
                          disabled={raiseMax <= 0 || raiseBy <= 1}
                          onClick={() => setRaiseBy((r) => Math.max(1, r - 1))}
                          className="p-2 theme-text-secondary disabled:opacity-30 cursor-pointer"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <span className="font-mono-tabular font-bold w-6 text-center theme-text-primary">{raiseBy}</span>
                        <button
                          type="button"
                          aria-label="레이즈 늘리기"
                          disabled={raiseMax <= 0 || raiseBy >= raiseMax}
                          onClick={() => setRaiseBy((r) => Math.min(raiseMax, r + 1))}
                          className="p-2 theme-text-secondary disabled:opacity-30 cursor-pointer"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                      <button
                        type="button"
                        disabled={raiseMax <= 0}
                        onClick={() => setGame((g) => (g ? applyBet(g, hs, { type: 'raise', amount: raiseBy }) : g))}
                        className={primaryButton}
                      >
                        레이즈 +{raiseBy}
                      </button>
                    </div>
                  </div>
                )}

                {myTurn && game.phase === 'HIT' && (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setGame((g) => (g ? applyHit(g, hs, true) : g))}
                      className={`${primaryButton} flex-1`}
                    >
                      HIT
                    </button>
                    <button
                      type="button"
                      onClick={() => setGame((g) => (g ? applyHit(g, hs, false) : g))}
                      className={`${ghostButton} flex-1`}
                    >
                      STAY
                    </button>
                  </div>
                )}

                {!myTurn && !needReveal && myHand && game.phase !== 'SHOWDOWN' && game.phase !== 'GAME_OVER' && (
                  <p className="text-sm theme-text-muted">
                    {myHand.folded
                      ? '이번 라운드는 포기했습니다.'
                      : game.turnSeat !== null
                        ? `${game.players[game.turnSeat].name} 차례…`
                        : '다른 플레이어를 기다리는 중…'}
                  </p>
                )}

                {game.phase === 'SHOWDOWN' && game.result && (
                  <div className="space-y-3">
                    <p className="text-sm theme-text-primary">
                      <strong className="theme-text-emerald">
                        {game.result.winners.map((s) => game.players[s].name).join(', ')}
                      </strong>{' '}
                      {game.result.byFold
                        ? '외 전원 포기 — 판돈 획득'
                        : game.result.allBusted
                          ? '— 전원 한계 초과, 합이 가장 작아 판돈 획득'
                          : `— 한계 ${game.limit}에 가장 가까워 판돈 획득`}{' '}
                      (+{game.result.pot})
                    </p>
                    {!humanOut && (
                      <button
                        type="button"
                        onClick={() => setGame((g) => (g ? nextRound(g) : g))}
                        className={`${primaryButton} w-full`}
                      >
                        다음 라운드
                      </button>
                    )}
                  </div>
                )}

                {humanOut && game.phase !== 'GAME_OVER' && (
                  <button type="button" onClick={finishInstantly} className={`${ghostButton} w-full`}>
                    <FastForward className="w-4 h-4" />
                    끝까지 바로 보기
                  </button>
                )}
              </div>
            </div>

            {/* Log */}
            <aside className="obsidian-panel rounded-2xl p-4">
              <h3 className="font-display text-sm font-bold theme-text-primary mb-2">진행 기록</h3>
              <ol className="space-y-1 max-h-[60vh] overflow-y-auto pr-1 text-xs">
                {[...game.log].reverse().slice(0, 60).map((e) => (
                  <li
                    key={e.id}
                    className={
                      e.seat === null
                        ? 'theme-text-gold font-semibold pt-1'
                        : e.seat === hs
                          ? 'theme-text-primary'
                          : 'theme-text-secondary'
                    }
                  >
                    {e.text}
                  </li>
                ))}
              </ol>
            </aside>
          </div>
        )}
      </main>

      <HitStayRulesModal open={rulesOpen} onClose={() => setRulesOpen(false)} />

      {game && game.phase === 'GAME_OVER' && !overDismissed && screen === 'GAME' && (
        <FinalModal game={game} onClose={() => setOverDismissed(true)} onRestart={start} onTitle={() => setScreen('TITLE')} />
      )}
    </div>
  );
}

const FinalModal: React.FC<{
  game: GameState;
  onClose: () => void;
  onRestart: () => void;
  onTitle: () => void;
}> = ({ game, onClose, onRestart, onTitle }) => {
  const standings = [...game.players].sort((a, b) => (a.finishRank ?? 99) - (b.finishRank ?? 99));
  const me = game.players[game.humanSeat];
  const won = me.finishRank === 1;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/55 dark:bg-black/75 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="HIT, STAY 최종 순위"
      onClick={onClose}
    >
      <div className="w-full max-w-md obsidian-panel rounded-2xl p-6 space-y-5" onClick={(e) => e.stopPropagation()}>
        <div className="text-center space-y-1">
          <Trophy className={`w-9 h-9 mx-auto ${won ? 'theme-text-gold' : 'theme-text-faint'}`} />
          <h2 className={`font-display text-3xl font-bold ${won ? 'theme-text-emerald' : 'theme-text-primary'}`}>
            {won ? '최종 1위' : `${me.finishRank}위`}
          </h2>
          <p className="text-sm theme-text-muted">{game.round}라운드 만에 승부가 났습니다.</p>
        </div>
        <ol className="divide-y divide-slate-200 dark:divide-white/[0.08] border-y theme-border text-sm">
          {standings.map((p) => (
            <li key={p.id} className="flex items-center justify-between py-2">
              <span className={p.isHuman ? 'theme-text-gold font-semibold' : 'theme-text-primary'}>
                {p.finishRank}위 · {p.name}
              </span>
              <span className="text-xs theme-text-muted font-mono-tabular">
                {p.finishRank === 1 ? `${p.chips}칩` : `${p.eliminatedRound}R 탈락`}
              </span>
            </li>
          ))}
        </ol>
        <div className="flex gap-2">
          <button type="button" onClick={onTitle} className={`${ghostButton} flex-1 py-2.5`}>
            타이틀로
          </button>
          <button type="button" onClick={onRestart} className={`${primaryButton} flex-1 py-2.5`}>
            다시 하기
          </button>
        </div>
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
      <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-white/[0.08]">
        <HitStayPreviewDiagram />
      </div>
      <div className="space-y-2">
        <div className="font-mono-tabular text-xs theme-text-muted">HIT, STAY · 5 PLAYERS · 30 CHIPS</div>
        <h1 className="font-display text-3xl sm:text-4xl font-bold theme-text-primary">HIT, STAY</h1>
        <p className="text-sm sm:text-base theme-text-secondary leading-relaxed text-pretty pt-1">
          주사위로 정한 <strong className="theme-text-rival font-semibold">한계 숫자</strong>에 가장 가깝게, 넘지 않게 카드를 모으세요. 카드 3장 중 1장만 공개하고 두 번의 베팅으로 칩을 따냅니다. 칩이 떨어지면 탈락, 마지막 1명이 살아남습니다.
        </p>
      </div>
    </div>

    <div className="obsidian-panel rounded-2xl p-5 sm:p-6 flex flex-col gap-5">
      <div className="space-y-2">
        <div className="text-sm font-semibold theme-text-primary">대전 방식</div>
        <div className="text-sm theme-text-secondary">1P vs AI 4명</div>
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
          <div className="theme-text-faint">카드</div>
          <div className="font-semibold theme-text-primary mt-0.5 font-mono-tabular">-1 ~ 7 · 35장</div>
        </div>
        <div>
          <div className="theme-text-faint">한계 숫자</div>
          <div className="font-semibold theme-text-primary mt-0.5">8면체 주사위 5~12</div>
        </div>
      </div>
      <div className="mt-auto flex gap-2">
        <button type="button" onClick={onOpenRules} className={ghostButton}>
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
