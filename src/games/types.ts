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
  /** Loaded on demand so the hub doesn't ship every game up front. */
  component: React.LazyExoticComponent<React.ComponentType<GameScreenProps>>;
  /** Start downloading the game's chunk early (e.g. when the Play button is hovered). */
  preload: () => Promise<unknown>;
}

/** Build the lazy component + preload pair for a game screen module. */
export function lazyGame(
  load: () => Promise<React.ComponentType<GameScreenProps>>,
): Pick<GameEntry, 'component' | 'preload'> {
  let pending: Promise<React.ComponentType<GameScreenProps>> | null = null;
  const loadOnce = () => (pending ??= load());
  return {
    component: React.lazy(() => loadOnce().then((Component) => ({ default: Component }))),
    preload: loadOnce,
  };
}
