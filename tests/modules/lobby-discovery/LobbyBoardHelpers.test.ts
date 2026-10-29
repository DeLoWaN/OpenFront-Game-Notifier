import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getBoardBadge, getBoardFormatText, getBoardModifiers } from '@/modules/lobby-discovery/LobbyBoardHelpers';
import { LobbyDiscoveryFilters } from '@/modules/lobby-discovery/LobbyDiscoveryFilters';
import type { DiscoveryCriteria } from '@/modules/lobby-discovery/LobbyDiscoveryTypes';

function lobby(gameConfig: Record<string, unknown>) {
  return { gameID: 'g', publicGameType: 'team', gameConfig } as any;
}

describe('getBoardFormatText', () => {
  it('names a free for all with its player capacity', () => {
    expect(getBoardFormatText(lobby({ gameMode: 'Free For All', maxPlayers: 55 }))).toBe(
      'Free for all · 55 players'
    );
  });

  it('shows a free for all without capacity as plain text', () => {
    expect(getBoardFormatText(lobby({ gameMode: 'Free For All' }))).toBe('Free for all');
  });

  it('writes numbered teams as "N teams of M"', () => {
    expect(getBoardFormatText(lobby({ gameMode: 'Team', playerTeams: 7, maxPlayers: 112 }))).toBe(
      '7 teams of 16'
    );
  });

  it('resolves Duos, Trios and Quads to their derived team count', () => {
    expect(getBoardFormatText(lobby({ gameMode: 'Team', playerTeams: 'Duos', maxPlayers: 20 }))).toBe(
      'Duos · 10 teams of 2'
    );
    expect(getBoardFormatText(lobby({ gameMode: 'Team', playerTeams: 'Trios', maxPlayers: 30 }))).toBe(
      'Trios · 10 teams of 3'
    );
    expect(getBoardFormatText(lobby({ gameMode: 'Team', playerTeams: 'Quads', maxPlayers: 44 }))).toBe(
      'Quads · 11 teams of 4'
    );
  });

  it('writes Humans Vs Nations with its number of humans', () => {
    expect(
      getBoardFormatText(lobby({ gameMode: 'Team', playerTeams: 'Humans Vs Nations', maxPlayers: 105 }))
    ).toBe('Humans vs Nations · 105 humans');
  });

  it('falls back to short text when the capacity is unknown', () => {
    expect(getBoardFormatText(lobby({ gameMode: 'Team', playerTeams: 7 }))).toBe('7 teams');
    expect(getBoardFormatText(lobby({ gameMode: 'Team', playerTeams: 'Humans Vs Nations' }))).toBe(
      'Humans vs Nations'
    );
    expect(getBoardFormatText(lobby({ gameMode: 'Team', playerTeams: 'Quads' }))).toBe('Quads');
    expect(getBoardFormatText(lobby({ gameMode: 'Team' }))).toBe('Teams');
  });
});

describe('getBoardModifiers', () => {
  const everyModifier = {
    isCompact: true,
    isRandomSpawn: true,
    isCrowded: true,
    isHardNations: true,
    isAlliancesDisabled: true,
    isNukesDisabled: true,
    isSAMsDisabled: true,
    isPeaceTime: true,
    isWaterNukes: true,
    isDoomsdayClock: true,
    startingGold: 5_000_000,
    goldMultiplier: 2,
  };
  const withModifiers = (publicGameModifiers: Record<string, unknown>, extra: Record<string, unknown> = {}) =>
    ({
      gameID: 'g',
      publicGameType: 'ffa',
      gameConfig: { gameMode: 'Free For All', maxPlayers: 20, publicGameModifiers, ...extra },
    }) as any;
  const criterion = (modifiers: DiscoveryCriteria['modifiers']): DiscoveryCriteria => ({
    gameMode: 'FFA',
    teamCount: null,
    minPlayers: null,
    maxPlayers: null,
    modifiers,
  });
  beforeEach(() => {
    (globalThis as any).GM_getValue = vi.fn((_key: string, defaultValue?: unknown) => defaultValue);
    (globalThis as any).GM_setValue = vi.fn();
  });

  const names = (lobby: any, criteria: DiscoveryCriteria[] = []) =>
    getBoardModifiers(lobby, criteria).map((modifier) => modifier.name);

  it('returns an empty list for a lobby without Modifiers', () => {
    expect(names(withModifiers({}))).toEqual([]);
  });

  it('gives each active Modifier its full filter chip name', () => {
    expect(names(withModifiers({ isRandomSpawn: true, startingGold: 5_000_000, goldMultiplier: 2 }))).toEqual([
      'Random Spawn',
      'Start Gold 5M',
      'Gold ×2',
    ]);
  });

  it('lists the Modifiers in the same order as the filter chips', () => {
    const lobby = withModifiers(everyModifier, { trusted: true });
    const chips = new LobbyDiscoveryFilters({
      initial: { criteria: [], isTeamTwoTimesMinEnabled: false, includeHostedAndCustomLobbies: true, mapFilter: {} },
      onChange: () => {},
    });
    const container = document.createElement('div');
    chips.mount(container);
    const chipNames = Array.from(container.querySelectorAll<HTMLElement>('.ld-mod[id^="modifier-"]')).map(
      (chip) => chip.dataset.modName!
    );
    chips.cleanup();

    // The lobby has one starting gold value, so the other two gold chips are absent.
    const expected = chipNames.filter((name) => name !== 'Start Gold 1M' && name !== 'Start Gold 25M');
    expect(names(lobby)).toEqual(expected);
  });

  it('formats a starting gold that has no chip', () => {
    expect(names(withModifiers({ startingGold: 2_000_000, goldMultiplier: 3 }))).toEqual([
      'Start Gold 2M',
      'Gold ×3',
    ]);
  });

  it('reads the raw settings of a Hosted Lobby', () => {
    const hosted = {
      gameID: 'h',
      publicGameType: 'hosted',
      gameConfig: { gameMode: 'Free For All', randomSpawn: true, trusted: true, gameMapSize: 'Compact' },
    } as any;
    expect(names(hosted)).toEqual(['Compact', 'Random Spawn', 'Trusted']);
  });

  it('marks a Modifier that the filters require, and one that they block', () => {
    const lobby = withModifiers({ isRandomSpawn: true, isCrowded: true, isPeaceTime: true });
    const states = getBoardModifiers(lobby, [
      criterion({ isRandomSpawn: 'required', isCrowded: 'blocked', isPeaceTime: 'any' }),
    ]).map((modifier) => [modifier.name, modifier.state]);
    expect(states).toEqual([
      ['Random Spawn', 'required'],
      ['Crowded', 'blocked'],
      ['Peace Time', 'neutral'],
    ]);
  });

  it('marks required and blocked numeric Modifiers by value', () => {
    const lobby = withModifiers({ startingGold: 5_000_000, goldMultiplier: 2 });
    const states = getBoardModifiers(lobby, [
      criterion({ startingGold: { 5000000: 'required' }, goldMultiplier: { 2: 'blocked' } }),
    ]).map((modifier) => [modifier.name, modifier.state]);
    expect(states).toEqual([
      ['Start Gold 5M', 'required'],
      ['Gold ×2', 'blocked'],
    ]);
  });

  it('uses only the Criteria of the lobby game mode', () => {
    const lobby = withModifiers({ isRandomSpawn: true });
    const teamCriterion: DiscoveryCriteria = {
      gameMode: 'Team',
      teamCount: null,
      minPlayers: null,
      maxPlayers: null,
      modifiers: { isRandomSpawn: 'blocked' },
    };
    expect(getBoardModifiers(lobby, [teamCriterion])[0]?.state).toBe('neutral');
  });
});

describe('getBoardBadge', () => {
  const hostedLobby = (extra: Record<string, unknown> = {}) =>
    ({ gameID: 'h', publicGameType: 'hosted', gameConfig: { gameMode: 'Free For All' }, ...extra }) as any;

  it('counts down to autoStartAt on a Hosted Lobby', () => {
    expect(getBoardBadge(hostedLobby({ autoStartAt: 5000 }), 'hosted', 0)).toEqual({
      kind: 'countdown',
      targetMs: 5000,
    });
  });

  it('never shows "Queue 0": a Hosted Queue has no Live Lobby', () => {
    expect(getBoardBadge(hostedLobby(), 'hosted', 0)).toEqual({ kind: 'text', text: 'Waiting' });
  });

  it('shows the Queue Position of a later Hosted Lobby', () => {
    expect(getBoardBadge(hostedLobby(), 'hosted', 2)).toEqual({ kind: 'text', text: 'Queue 2' });
  });
});
