/**
 * LobbyDiscoveryEngine - core matching logic for notify-only discovery.
 */

import type { Lobby } from '@/types/game';
import type {
  DiscoveryCriteria,
  ModifierFilters,
  NumericModifierState,
} from './LobbyDiscoveryTypes';
import {
  getLobbyCapacity,
  getLobbyGameMode,
  getLobbyModifierValue,
  getLobbyTeamConfig,
  getPlayersPerTeam,
} from './LobbyDiscoveryHelpers';

const BOOLEAN_MODIFIER_KEYS: Array<keyof ModifierFilters> = [
  'isCompact',
  'isRandomSpawn',
  'isCrowded',
  'isHardNations',
  'isAlliancesDisabled',
  'isPortsDisabled',
  'isNukesDisabled',
  'isSAMsDisabled',
  'isPeaceTime',
  'isWaterNukes',
];

export class LobbyDiscoveryEngine {
  matchesCriteria(
    lobby: Lobby,
    criteriaList: DiscoveryCriteria[]
  ): boolean {
    if (!lobby || !lobby.gameConfig || !criteriaList || criteriaList.length === 0) {
      return false;
    }

    const gameMode = getLobbyGameMode(lobby);
    const lobbyCapacity = getLobbyCapacity(lobby);
    if (!gameMode || lobbyCapacity === null) {
      return false;
    }

    const lobbyTeamConfig = getLobbyTeamConfig(lobby);
    const teamComparisonCapacity =
      gameMode === 'Team'
        ? getPlayersPerTeam(lobbyTeamConfig, lobbyCapacity)
        : null;

    // Resolve the lobby's effective number of teams. OpenFront encodes a team
    // game's playerTeams either as a number (the team count) or as a named
    // players-per-team format ('Duos'/'Trios'/'Quads'), whose team count is
    // derived from capacity. 'Humans Vs Nations' has no numeric team count and
    // is matched by format identity instead, so it stays null here.
    const lobbyNumTeams = this.resolveLobbyTeamCount(
      lobbyTeamConfig,
      teamComparisonCapacity,
      lobbyCapacity
    );

    for (const criteria of criteriaList) {
      if (criteria.gameMode !== gameMode) {
        continue;
      }

      if (gameMode === 'Team') {
        if (criteria.teamCount !== null && criteria.teamCount !== undefined) {
          if (criteria.teamCount === '8+') {
            if (lobbyNumTeams === null || lobbyNumTeams < 8) {
              continue;
            }
          } else if (
            criteria.teamCount === 'Humans Vs Nations' ||
            criteria.teamCount === 'Duos' ||
            criteria.teamCount === 'Trios' ||
            criteria.teamCount === 'Quads'
          ) {
            // Named-format criteria match by format identity. The UI only emits
            // 'Humans Vs Nations' (Duos/Trios/Quads are stripped by criteria
            // sanitization); the others are handled defensively for parity.
            if (criteria.teamCount !== lobbyTeamConfig) {
              continue;
            }
          } else if (
            lobbyNumTeams === null ||
            criteria.teamCount !== lobbyNumTeams
          ) {
            // Numeric NUMBER OF TEAMS criterion: compare against the derived
            // team count so named-format lobbies ('Quads' + cap 24 => 6 teams)
            // match the user's numeric selection.
            continue;
          }
        }

        if (teamComparisonCapacity === null) {
          continue;
        }
      }

      const capacityToCompare = gameMode === 'Team' ? teamComparisonCapacity : lobbyCapacity;
      if (capacityToCompare === null) {
        continue;
      }

      // Humans Vs Nations has no fixed per-team player count (humans play against
      // AI nations, not structured teams), so the players-per-team range filter is
      // meaningless for that format. Skip it and match on format + modifiers only.
      if (lobbyTeamConfig !== 'Humans Vs Nations') {
        if (criteria.minPlayers !== null && capacityToCompare < criteria.minPlayers) {
          continue;
        }
        if (criteria.maxPlayers !== null && capacityToCompare > criteria.maxPlayers) {
          continue;
        }
      }

      if (!this.matchesModifiers(lobby, criteria.modifiers)) {
        continue;
      }

      return true;
    }

    return false;
  }

  /**
   * Resolve a lobby's effective number of teams from its team config.
   * - numeric config: the team count itself
   * - named players-per-team format ('Duos'/'Trios'/'Quads'): derived as
   *   floor(capacity / playersPerTeam)
   * - 'Humans Vs Nations' or missing/zero capacity: null (no numeric team count)
   */
  private resolveLobbyTeamCount(
    lobbyTeamConfig: ReturnType<typeof getLobbyTeamConfig>,
    playersPerTeam: number | null,
    lobbyCapacity: number | null
  ): number | null {
    if (typeof lobbyTeamConfig === 'number') {
      return lobbyTeamConfig;
    }
    if (lobbyTeamConfig === 'Humans Vs Nations') {
      return null;
    }
    if (playersPerTeam !== null && playersPerTeam > 0 && lobbyCapacity !== null) {
      return Math.floor(lobbyCapacity / playersPerTeam);
    }
    return null;
  }

  private matchesModifiers(
    lobby: Lobby,
    filters: ModifierFilters | undefined
  ): boolean {
    if (!filters) {
      return true;
    }

    for (const key of BOOLEAN_MODIFIER_KEYS) {
      const state = filters[key];
      if (!state || state === 'any') {
        continue;
      }

      const actual = Boolean(getLobbyModifierValue(lobby, key));
      if (state === 'blocked' && actual) {
        return false;
      }
      if (state === 'required' && !actual) {
        return false;
      }
    }

    if (!this.matchesNumericModifier(getLobbyModifierValue(lobby, 'startingGold'), filters.startingGold)) {
      return false;
    }

    if (!this.matchesNumericModifier(getLobbyModifierValue(lobby, 'goldMultiplier'), filters.goldMultiplier)) {
      return false;
    }

    return true;
  }

  private matchesNumericModifier(
    actualValue: boolean | number | undefined,
    states: NumericModifierState | undefined
  ): boolean {
    if (!states) {
      return true;
    }

    const numericActual =
      typeof actualValue === 'number' && Number.isFinite(actualValue)
        ? actualValue
        : null;

    const entries = Object.entries(states);
    if (entries.length === 0) {
      return true;
    }

    const blockedValues = entries
      .filter(([, state]) => state === 'blocked')
      .map(([value]) => Number(value));

    if (numericActual !== null && blockedValues.includes(numericActual)) {
      return false;
    }

    const requiredValues = entries
      .filter(([, state]) => state === 'required')
      .map(([value]) => Number(value));

    if (requiredValues.length > 0) {
      if (numericActual === null) {
        return false;
      }
      if (!requiredValues.includes(numericActual)) {
        return false;
      }
    }

    return true;
  }
}
