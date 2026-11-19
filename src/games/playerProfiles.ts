export const AI_CHARACTER_NAMES = [
  '뽀로로',
  '크롱',
  '루피',
  '에디',
  '포비',
  '패티',
  '해리',
  '로디',
] as const;

export const DEFAULT_PLAYER_NAME = '도전자';
export const DEFAULT_P2_NAME = '상대 플레이어';
const PLAYER_NAME_STORAGE_KEY = 'devils_plan_player_name';

export function loadSavedPlayerName(): string {
  if (typeof window === 'undefined') {
    return '';
  }
  try {
    return window.localStorage.getItem(PLAYER_NAME_STORAGE_KEY) ?? '';
  } catch {
    return '';
  }
}

export function savePlayerName(name: string): void {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    const trimmed = name.trim();
    if (trimmed) {
      window.localStorage.setItem(PLAYER_NAME_STORAGE_KEY, trimmed);
    } else {
      window.localStorage.removeItem(PLAYER_NAME_STORAGE_KEY);
    }
  } catch {
    // Ignore storage quota / privacy mode errors
  }
}

export function resolvePlayerName(
  rawName: string | undefined,
  fallback: string = DEFAULT_PLAYER_NAME,
): string {
  const trimmed = (rawName ?? '').trim();
  return trimmed.length > 0 ? trimmed : fallback;
}

export function pickAiOpponents(
  count: number,
  excludedNames: string[] = [],
): string[] {
  const excludedSet = new Set(
    excludedNames.map((n) => n.trim().toLowerCase()).filter(Boolean),
  );
  const available = AI_CHARACTER_NAMES.filter(
    (name) => !excludedSet.has(name.toLowerCase()),
  );
  const pool = available.length > 0 ? [...available] : [...AI_CHARACTER_NAMES];

  for (let i = pool.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = pool[i];
    pool[i] = pool[j];
    pool[j] = temp;
  }

  const result: string[] = [];
  for (let i = 0; i < count; i += 1) {
    result.push(pool[i % pool.length]);
  }
  return result;
}

export function formatCompactBadgeName(name: string, maxChars: number = 4): string {
  const cleaned = name.replace(/\s+AI$/i, '').trim();
  if (!cleaned) {
    return '나';
  }
  const chars = Array.from(cleaned);
  if (chars.length <= maxChars) {
    return cleaned;
  }
  return `${chars.slice(0, maxChars).join('')}…`;
}
