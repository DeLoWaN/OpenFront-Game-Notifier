/**
 * Type definitions for the lobby discovery module.
 */

/** The Lobby Board, or OpenFront's own lobby area with the floating panel. */
export type BoardMode = 'board' | 'original';
export type QueueSource = 'ffa' | 'team' | 'special' | 'hosted';
export type DiscoveryGameMode = 'FFA' | 'Team';
export type TeamCount = 'Duos' | 'Trios' | 'Quads' | 'Humans Vs Nations' | '8+' | number;
export type ModifierFilterState = 'any' | 'required' | 'blocked';

export interface NumericModifierState {
  [value: number]: ModifierFilterState | undefined;
}

export interface ModifierFilters {
  isCompact?: ModifierFilterState;
  isRandomSpawn?: ModifierFilterState;
  isCrowded?: ModifierFilterState;
  isHardNations?: ModifierFilterState;
  isAlliancesDisabled?: ModifierFilterState;
  isNukesDisabled?: ModifierFilterState;
  isSAMsDisabled?: ModifierFilterState;
  isPeaceTime?: ModifierFilterState;
  isWaterNukes?: ModifierFilterState;
  isDoomsdayClock?: ModifierFilterState;
  isTrusted?: ModifierFilterState;
  startingGold?: NumericModifierState;
  goldMultiplier?: NumericModifierState;
}

/** Tri-state per map, keyed by the lobby's `gameMap` value. */
export type MapFilter = Record<string, ModifierFilterState>;

export interface DiscoveryCriteria {
  gameMode: DiscoveryGameMode;
  teamCount?: TeamCount | null;
  minPlayers: number | null;
  maxPlayers: number | null;
  modifiers?: ModifierFilters;
}

export interface LobbyDiscoverySettings {
  criteria: DiscoveryCriteria[];
  discoveryEnabled: boolean;
  soundEnabled: boolean;
  desktopNotificationsEnabled: boolean;
  isTeamTwoTimesMinEnabled: boolean;
  isTeamThreeTimesMinEnabled?: boolean;
  includeHostedAndCustomLobbies?: boolean;
  mapFilter?: MapFilter;
}
