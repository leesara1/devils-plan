import { GameEntry } from './types';
import { MemoryPokerGame } from './memory-poker/MemoryPokerGame';
import { Heavy13Game } from './heavy-13/Heavy13Game';

export const GAMES_REGISTRY: GameEntry[] = [
  {
    id: 'memory-poker',
    indexLabel: '01',
    titleKo: '기억 포커',
    titleEn: 'Memory Poker',
    description:
      '16장의 카드를 20초 동안 암기한 뒤, 공유 카드 3장과 합쳐 가장 강력한 5장 홀덤 족보를 완성하는 기억력 포커 게임입니다.',
    playersLabel: '1P vs AI · 2P 로컬',
    durationLabel: '약 3분',
    status: 'playable',
    component: MemoryPokerGame,
  },
  {
    id: 'heavy-13',
    indexLabel: '02',
    titleKo: '무거운 13',
    titleEn: 'Heavy 13',
    description:
      '바위 카드(0~6)와 색깔 칩을 비공개로 제출해 3개의 받침대 합계가 13 이상이 되지 않도록 수 싸움을 벌이는 14라운드 전략 게임입니다.',
    playersLabel: '3–4인 AI · 로컬 대전',
    durationLabel: '14라운드',
    status: 'playable',
    component: Heavy13Game,
  },
];
