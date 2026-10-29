/**
 * Pure helpers for the Lobby Board: the board columns, the card model and the
 * countdown. DOM building lives in LobbyBoardView.
 */

import type { Lobby } from '@/types/game';
import type { DiscoveryCriteria, ModifierFilters, ModifierFilterState, QueueSource } from './LobbyDiscoveryTypes';
import {
  formatStartingGold,
  getLobbyCapacity,
  getLobbyCurrentPlayers,
  getLobbyGameMode,
  getLobbyMapThumbnailUrl,
  getLobbyModifierValue,
  getLobbyQueueSource,
  getLobbyTeamConfig,
  getMapDisplayName,
  getPlayersPerTeam,
} from './LobbyDiscoveryHelpers';

/** The board columns, left to right. */
export const BOARD_QUEUES: ReadonlyArray<{ queue: QueueSource; label: string }> = [
  { queue: 'ffa', label: 'FFA' },
  { queue: 'team', label: 'Team' },
  { queue: 'special', label: 'Special' },
  { queue: 'hosted', label: 'Hosted' },
];

export interface BoardCardModel {
  gameID: string;
  queue: QueueSource;
  mapName: string;
  thumbnailUrl: string | null;
  /** The timestamp, on the feed's clock, that the countdown runs to. Null for a lobby without a countdown. */
  countdownTargetMs: number | null;
  /** The team format in plain words. */
  formatText: string;
  /** Null when the feed gives no player count. */
  players: number | null;
  /** Null when the feed gives no capacity. */
  capacity: number | null;
  /** The share of the capacity that the players fill, from 0 to 100. */
  fillPercent: number;
  modifiers: BoardModifier[];
  isCustom: boolean;
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
 * A Live Lobby counts down to `startsAt`, and a Hosted Lobby to `autoStartAt`.
 * Any other lobby has no start time: it starts as soon as it is full.
 */
export function getBoardCountdownTarget(lobby: Lobby, queue: QueueSource, queuePosition: number): number | null {
  if (queue === 'hosted') return typeof lobby.autoStartAt === 'number' ? lobby.autoStartAt : null;
  if (queuePosition === 0 && typeof lobby.startsAt === 'number') return lobby.startsAt;
  return null;
}

/** "12 / 24 players", or "5 players" when the capacity is unknown. */
export function getBoardPlayersText(players: number | null, capacity: number | null): string {
  const count = players ?? 0;
  if (capacity === null) return `${count} ${count === 1 ? 'player' : 'players'}`;
  return `${count} / ${capacity} players`;
}

export function buildBoardCardModel(
  lobby: Lobby,
  queue: QueueSource,
  queuePosition: number,
  assetManifest?: Record<string, string> | null,
  cdnBase?: string | null,
  criteria: DiscoveryCriteria[] = []
): BoardCardModel {
  const players = getLobbyCurrentPlayers(lobby);
  const capacity = getLobbyCapacity(lobby);
  return {
    gameID: lobby.gameID,
    queue,
    mapName: getMapDisplayName(lobby.gameConfig?.gameMap?.trim() || 'Unknown map'),
    thumbnailUrl: getLobbyMapThumbnailUrl(lobby, assetManifest, cdnBase),
    countdownTargetMs: getBoardCountdownTarget(lobby, queue, queuePosition),
    formatText: getBoardFormatText(lobby),
    players,
    capacity,
    fillPercent:
      players !== null && capacity ? Math.min(100, Math.round((players / capacity) * 100)) : 0,
    modifiers: getBoardModifiers(lobby, criteria),
    isCustom: lobby.custom === true,
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

/**
 * The team format in plain words: "Free for all · 55 players", "7 teams of 16",
 * "Quads · 11 teams of 4", "Humans vs Nations · 105 humans". Named team
 * formats resolve to their derived team count, as the matcher does.
 */
export function getBoardFormatText(lobby: Lobby): string {
  const gameMode = getLobbyGameMode(lobby);
  const capacity = getLobbyCapacity(lobby);

  if (gameMode === 'FFA') {
    return capacity !== null ? `Free for all · ${capacity} players` : 'Free for all';
  }
  if (gameMode !== 'Team') return 'Unsupported mode';

  const teamConfig = getLobbyTeamConfig(lobby);
  if (teamConfig === 'Humans Vs Nations') {
    return capacity !== null ? `Humans vs Nations · ${capacity} humans` : 'Humans vs Nations';
  }

  const playersPerTeam = getPlayersPerTeam(teamConfig, capacity);
  const isNamed = teamConfig === 'Duos' || teamConfig === 'Trios' || teamConfig === 'Quads';
  let teamsText: string | null = null;
  if (isNamed) {
    teamsText =
      playersPerTeam !== null && capacity !== null
        ? `${Math.floor(capacity / playersPerTeam)} teams of ${playersPerTeam}`
        : null;
    return teamsText ? `${teamConfig} · ${teamsText}` : teamConfig;
  }
  if (typeof teamConfig === 'number') {
    return playersPerTeam !== null ? `${teamConfig} teams of ${playersPerTeam}` : `${teamConfig} teams`;
  }
  return 'Teams';
}

/** How the filters treat a Modifier that a lobby has on. */
export type BoardModifierState = 'neutral' | 'required' | 'blocked';

export interface BoardModifier {
  /** The full name, the same as the filter chip. */
  name: string;
  state: BoardModifierState;
}

// The boolean Modifiers, in the order of the filter chips.
const BOOLEAN_MODIFIER_NAMES: ReadonlyArray<[keyof ModifierFilters, string]> = [
  ['isCompact', 'Compact'],
  ['isRandomSpawn', 'Random Spawn'],
  ['isCrowded', 'Crowded'],
  ['isHardNations', 'Hard Nations'],
  ['isAlliancesDisabled', 'Alliances Off'],
  ['isNukesDisabled', 'Nukes Off'],
  ['isSAMsDisabled', 'SAMs Off'],
  ['isPeaceTime', 'Peace Time'],
  ['isWaterNukes', 'Water Nukes'],
  ['isDoomsdayClock', 'Doomsday Clock'],
  ['isTrusted', 'Trusted'],
];

function toBoardState(state: ModifierFilterState | undefined): BoardModifierState {
  return state === 'required' || state === 'blocked' ? state : 'neutral';
}

/**
 * Every Modifier that a lobby has on, by its full chip name, in the order of
 * the filter chips. The state tells whether the filters of the lobby's game
 * mode require or block it.
 */
export function getBoardModifiers(lobby: Lobby, criteria: DiscoveryCriteria[]): BoardModifier[] {
  const gameMode = getLobbyGameMode(lobby);
  const filters = criteria.find((criterion) => criterion.gameMode === gameMode && criterion.modifiers)?.modifiers;
  const modifiers: BoardModifier[] = [];

  for (const [key, name] of BOOLEAN_MODIFIER_NAMES) {
    if (getLobbyModifierValue(lobby, key)) {
      modifiers.push({ name, state: toBoardState(filters?.[key] as ModifierFilterState | undefined) });
    }
  }

  const startingGold = getLobbyModifierValue(lobby, 'startingGold');
  if (typeof startingGold === 'number') {
    modifiers.push({
      name: `Start Gold ${formatStartingGold(startingGold)}`,
      state: toBoardState(filters?.startingGold?.[startingGold]),
    });
  }

  const goldMultiplier = getLobbyModifierValue(lobby, 'goldMultiplier');
  if (typeof goldMultiplier === 'number') {
    modifiers.push({
      name: `Gold ×${goldMultiplier}`,
      state: toBoardState(filters?.goldMultiplier?.[goldMultiplier]),
    });
  }

  return modifiers;
}
