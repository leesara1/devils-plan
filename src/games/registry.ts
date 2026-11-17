import { GameEntry } from './types';
import { MemoryPokerGame } from './memory-poker/MemoryPokerGame';
import { SecondGameScreen } from './game-02/SecondGameScreen';

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
    id: 'game-02',
    indexLabel: '02',
    titleKo: '두 번째 게임',
    titleEn: 'Next Game Slot',
    description:
      '새로운 두뇌·심리 게임을 추가할 수 있도록 독립 모듈로 준비된 두 번째 게임 슬롯입니다.',
    playersLabel: '확장 예정',
    durationLabel: '준비 중',
    status: 'preparing',
    component: SecondGameScreen,
  },
];
