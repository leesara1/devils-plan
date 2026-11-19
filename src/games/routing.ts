import { GAMES_REGISTRY } from './registry';

const BASE_DOCUMENT_TITLE = "데블스 플랜: 데드 어게인 · The Devil's Plan: Dead Again";

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function normalizeHubBase(path: string): string {
  let normalized = path.trim();
  if (!normalized.startsWith('/')) {
    normalized = `/${normalized}`;
  }
  if (!normalized.endsWith('/')) {
    normalized = `${normalized}/`;
  }
  return normalized.replace(/\/+/g, '/');
}

export interface ParsedGameRoute {
  hubBasePath: string;
  gameId: string | null;
}

export function parseGameRoute(pathname: string, hash: string = ''): ParsedGameRoute {
  const gameIds = GAMES_REGISTRY.map((g) => escapeRegex(g.id));
  if (gameIds.length === 0) {
    return { hubBasePath: normalizeHubBase(pathname), gameId: null };
  }

  const pathPattern = new RegExp(`^(.*?)/(${gameIds.join('|')})/?$`);
  const pathMatch = pathname.match(pathPattern);
  if (pathMatch) {
    const basePrefix = pathMatch[1] || '/';
    return {
      hubBasePath: normalizeHubBase(basePrefix),
      gameId: pathMatch[2],
    };
  }

  const hashPattern = new RegExp(`^#/(${gameIds.join('|')})/?$`);
  const hashMatch = hash.match(hashPattern);
  if (hashMatch) {
    return {
      hubBasePath: normalizeHubBase(pathname),
      gameId: hashMatch[1],
    };
  }

  return {
    hubBasePath: normalizeHubBase(pathname),
    gameId: null,
  };
}

export function buildGameUrl(hubBasePath: string, gameId: string | null): string {
  const base = normalizeHubBase(hubBasePath);
  if (!gameId) {
    return base;
  }
  return `${base}${gameId}`;
}

export function getDocumentTitleForGame(gameId: string | null): string {
  if (!gameId) {
    return BASE_DOCUMENT_TITLE;
  }
  const game = GAMES_REGISTRY.find((g) => g.id === gameId);
  if (!game) {
    return BASE_DOCUMENT_TITLE;
  }
  return `${game.titleKo} · 데블스 플랜: 데드 어게인`;
}
