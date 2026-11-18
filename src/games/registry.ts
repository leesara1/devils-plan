import { GameEntry } from './types';
import { MemoryPokerGame } from './memory-poker/MemoryPokerGame';
import { Heavy13Game } from './heavy-13/Heavy13Game';

export const GAMES_REGISTRY: GameEntry[] = [
  {
    id: 'memory-poker',
    indexLabel: '01',
    seasonLabel: '시즌 2 · 데스매치',
    matchFormatLabel: '1:1 기억력 포커',
    category: 'memory',
    titleKo: '기억 포커',
    titleEn: 'Memory Poker',
    description:
      '4×4 보드에 놓인 16장의 카드를 20초 동안 암기한 뒤, 뒤집힌 상태에서 공유 카드 3장과 합쳐 가장 강한 5장 홀덤 족보를 완성하는 기억력 대결입니다.',
    playersLabel: '1P vs AI · 2P 로컬',
    durationLabel: '단판 · 3판 2선승',
    highlights: [
      '20초 동안 16장 위치와 숫자·문양 암기',
      '공유 카드 3장 확인 후 비공개 말 2개 배치',
      '5장 홀덤 족보 판정 및 보드 최강 조합 복기',
    ],
    status: 'playable',
    component: MemoryPokerGame,
  },
  {
    id: 'heavy-13',
    indexLabel: '02',
    seasonLabel: '시즌 3 · 메인 매치',
    matchFormatLabel: '다인원 심리 수 싸움',
    category: 'strategy',
    titleKo: '무거운 13',
    titleEn: 'Heavy 13',
    description:
      '바위 카드(0~6)와 색깔 칩을 비공개로 제출해 빨강·초록·파랑 3개의 받침대 합계가 13 이상이 되지 않도록 수 싸움을 벌이는 14라운드 전략 게임입니다.',
    playersLabel: '3–7인 AI · 로컬 대전',
    durationLabel: '14라운드 (2세트)',
    highlights: [
      '레인보우 칩 우선 · 높은 바위 숫자 순 배치',
      '라운드당 1회 패스 후 역순(LIFO) 배치 심리전',
      '받침대 합계 13 이상 시 기존 큐브 수만큼 벌점',
    ],
    status: 'playable',
    component: Heavy13Game,
  },
];
