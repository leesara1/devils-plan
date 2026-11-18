import React from 'react';

export interface GameScreenProps {
  onExitToHub?: () => void;
}

export type MatchFilterCategory = 'all' | 'memory' | 'strategy';

export interface GameEntry {
  id: string;
  indexLabel: string;
  seasonLabel: string;
  matchFormatLabel: string;
  category: Exclude<MatchFilterCategory, 'all'>;
  titleKo: string;
  titleEn: string;
  description: string;
  playersLabel: string;
  durationLabel: string;
  highlights: string[];
  status: 'playable' | 'preparing';
  component: React.ComponentType<GameScreenProps>;
}
