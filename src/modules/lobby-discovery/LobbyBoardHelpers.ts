/**
 * Pure helpers for the Lobby Board: the board columns, the card model and the
 * time badge. DOM building lives in LobbyBoardView.
 */

import type { Lobby } from '@/types/game';
import type { QueueSource } from './LobbyDiscoveryTypes';
import { getLobbyMapThumbnailUrl, getLobbyQueueSource, getMapDisplayName } from './LobbyDiscoveryHelpers';

/** The board columns, left to right. */
export const BOARD_QUEUES: ReadonlyArray<{ queue: QueueSource; label: string }> = [
  { queue: 'ffa', label: 'FFA' },
  { queue: 'team', label: 'Team' },
  { queue: 'special', label: 'Special' },
  { queue: 'hosted', label: 'Hosted' },
];

export type BoardBadge =
  /** A live countdown to `targetMs`, a timestamp on the feed's clock. */
  | { kind: 'countdown'; targetMs: number }
  | { kind: 'text'; text: string };

export interface BoardCardModel {
  gameID: string;
  queue: QueueSource;
  /** Zero for the first lobby of a Queue. */
  queuePosition: number;
  mapName: string;
  thumbnailUrl: string | null;
  badge: BoardBadge;
}

/** Groups the lobbies by Queue and keeps the feed order inside each Queue. */
export function groupLobbiesByQueue(lobbies: Lobby[]): Record<QueueSource, Lobby[]> {
  const queues: Record<QueueSource, Lobby[]> = { ffa: [], team: [], special: [], hosted: [] };
  for (const lobby of lobbies) {
    const queue = getLobbyQueueSource(lobby);
    if (queue) queues[queue].push(lobby);
  }
  return queues;
}

/** The row label of a Queue Position: "Live" for the first, then "#1", "#2", and so on. */
export function getRowLabel(queuePosition: number): string {
  return queuePosition === 0 ? 'Live' : `#${queuePosition}`;
}

/** Formats a duration as "m:ss". A negative duration reads "0:00". */
export function formatCountdown(remainingMs: number): string {
  const totalSeconds = Math.max(0, Math.ceil(remainingMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

/**
 * A Live Lobby counts down to `startsAt`. A Hosted Lobby counts down to
 * `autoStartAt` when OpenFront gives it. Any other lobby shows its Queue
 * Position, because it also starts as soon as it is full.
 */
export function getBoardBadge(lobby: Lobby, queue: QueueSource, queuePosition: number): BoardBadge {
  if (queue === 'hosted') {
    if (typeof lobby.autoStartAt === 'number') {
      return { kind: 'countdown', targetMs: lobby.autoStartAt };
    }
  } else if (queuePosition === 0) {
    if (typeof lobby.startsAt === 'number') {
      return { kind: 'countdown', targetMs: lobby.startsAt };
    }
    return { kind: 'text', text: 'Live' };
  }
  return { kind: 'text', text: `Queue ${queuePosition}` };
}

export function buildBoardCardModel(
  lobby: Lobby,
  queue: QueueSource,
  queuePosition: number,
  assetManifest?: Record<string, string> | null,
  cdnBase?: string | null
): BoardCardModel {
  return {
    gameID: lobby.gameID,
    queue,
    queuePosition,
    mapName: getMapDisplayName(lobby.gameConfig?.gameMap?.trim() || 'Unknown map'),
    thumbnailUrl: getLobbyMapThumbnailUrl(lobby, assetManifest, cdnBase),
    badge: getBoardBadge(lobby, queue, queuePosition),
  };
}

/** "1 lobby", "3 lobbies". */
export function formatLobbyCount(count: number): string {
  return `${count} ${count === 1 ? 'lobby' : 'lobbies'}`;
}

/** "1 match", "3 matches". */
export function formatMatchCount(count: number): string {
  return `${count} ${count === 1 ? 'match' : 'matches'}`;
}
