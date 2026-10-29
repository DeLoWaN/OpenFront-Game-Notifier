import { describe, expect, it } from 'vitest';
import { formatFilterSummary } from '@/modules/lobby-discovery/LobbyBoardSidebarHelpers';
import type { FilterSettings } from '@/modules/lobby-discovery/LobbyDiscoveryTypes';

const settings = (overrides: Partial<FilterSettings> = {}): FilterSettings => ({
  criteria: [],
  isTeamTwoTimesMinEnabled: false,
  includeHostedAndCustomLobbies: true,
  mapFilter: {},
  ...overrides,
});

describe('formatFilterSummary', () => {
  it('says that no filter is set when there is no Criterion', () => {
    expect(formatFilterSummary(settings())).toBe('No filters');
  });

  it('names the modes of the Criteria once each', () => {
    const summary = formatFilterSummary(
      settings({
        criteria: [
          { gameMode: 'FFA', teamCount: null, minPlayers: null, maxPlayers: null },
          { gameMode: 'Team', teamCount: 4, minPlayers: null, maxPlayers: null },
          { gameMode: 'Team', teamCount: 5, minPlayers: null, maxPlayers: null },
        ],
      })
    );
    expect(summary).toBe('FFA + Teams');
  });

  it('counts the Modifiers that a filter requires or blocks, and the maps with a state', () => {
    const summary = formatFilterSummary(
      settings({
        criteria: [
          {
            gameMode: 'FFA',
            teamCount: null,
            minPlayers: null,
            maxPlayers: null,
            modifiers: {
              isCompact: 'required',
              isCrowded: 'blocked',
              isTrusted: 'any',
              startingGold: { 5000000: 'required', 1000000: 'any' },
              goldMultiplier: { 2: 'blocked' },
            },
          },
        ],
        mapFilter: { Europe: 'required', Asia: 'blocked', World: 'any' },
      })
    );
    expect(summary).toBe('FFA · 4 modifiers · 2 maps');
  });

  it('uses the singular for one modifier and one map', () => {
    const summary = formatFilterSummary(
      settings({
        criteria: [
          {
            gameMode: 'Team',
            teamCount: null,
            minPlayers: null,
            maxPlayers: null,
            modifiers: { isCompact: 'required' },
          },
        ],
        mapFilter: { Europe: 'required' },
      })
    );
    expect(summary).toBe('Teams · 1 modifier · 1 map');
  });

  it('still reports the maps when no mode is on', () => {
    expect(formatFilterSummary(settings({ mapFilter: { Europe: 'blocked' } }))).toBe(
      'No mode · 1 map'
    );
  });
});
