import React from 'react';

export interface GameScreenProps {
  onExitToHub?: () => void;
}

export interface GameEntry {
  id: string;
  indexLabel: string;
  titleKo: string;
  titleEn: string;
  description: string;
  playersLabel: string;
  durationLabel: string;
  status: 'playable' | 'preparing';
  component: React.ComponentType<GameScreenProps>;
}
