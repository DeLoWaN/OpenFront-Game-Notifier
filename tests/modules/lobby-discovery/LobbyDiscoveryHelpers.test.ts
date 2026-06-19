import { describe, it, expect } from 'vitest';
import {
  sanitizeCriteria,
  normalizeSettings,
  parseTeamCount,
  getLobbyTeamConfig,
  getLobbyGameMode,
  getLobbyCapacity,
  getLobbyCurrentPlayers,
  getLobbyModifiers,
  getLobbyQueueSource,
  getGameDetailsText,
  getBrowserNotificationContent,
  formatElapsedSince,
  getLobbyModifierValue,
  getActiveModifierLabels,
  getLobbyModeText,
  getLobbyMapThumbnailUrl,
  buildUpcomingCardModel,
} from '@/modules/lobby-discovery/LobbyDiscoveryHelpers';

describe('LobbyDiscoveryHelpers', () => {
  it('sanitizes legacy criteria by keeping FFA and Team entries', () => {
    const criteria = sanitizeCriteria([
      { gameMode: 'FFA', minPlayers: 10, maxPlayers: 30 },
      { gameMode: 'HvN', minPlayers: null, maxPlayers: null },
      { gameMode: 'Team', teamCount: 'Duos', minPlayers: 8, maxPlayers: 16 },
      { gameMode: 'team', teamCount: 3, minPlayers: 9, maxPlayers: 18 },
      {
        gameMode: 'Team',
        teamCount: 'Humans Vs Nations',
        minPlayers: 12,
        maxPlayers: 40,
      },
    ]);

    expect(criteria).toEqual([
      { gameMode: 'FFA', teamCount: null, minPlayers: 10, maxPlayers: 30 },
      { gameMode: 'Team', teamCount: null, minPlayers: 8, maxPlayers: 16 },
      { gameMode: 'Team', teamCount: 3, minPlayers: 9, maxPlayers: 18 },
      {
        gameMode: 'Team',
        teamCount: 'Humans Vs Nations',
        minPlayers: 12,
        maxPlayers: 40,
      },
    ]);
  });

  it('returns defaults when no settings are persisted', () => {
    const normalized = normalizeSettings(null);

    expect(normalized).toEqual({
      criteria: [],
      discoveryEnabled: true,
      soundEnabled: true,
      desktopNotificationsEnabled: false,
      isTeamTwoTimesMinEnabled: false,
      notifyUpcomingEnabled: true,
    });
  });

  it('preserves persisted settings on load', () => {
    const normalized = normalizeSettings({
      criteria: [{ gameMode: 'FFA', teamCount: null, minPlayers: 5, maxPlayers: 25 }],
      discoveryEnabled: true,
      soundEnabled: true,
      desktopNotificationsEnabled: true,
      isTeamTwoTimesMinEnabled: false,
    });

    expect(normalized.desktopNotificationsEnabled).toBe(true);
    expect(normalized.criteria).toHaveLength(1);
  });

  it('upgrades the legacy isTeamThreeTimesMinEnabled flag when isTeamTwoTimesMinEnabled is absent', () => {
    const normalized = normalizeSettings({
      criteria: [],
      discoveryEnabled: true,
      soundEnabled: true,
      desktopNotificationsEnabled: false,
      isTeamThreeTimesMinEnabled: true,
    } as any);

    expect(normalized.isTeamTwoTimesMinEnabled).toBe(true);
  });

  it('migrates legacy allowed/rejected modifier states to any/blocked, preserves required', () => {
    const criteria = sanitizeCriteria([
      {
        gameMode: 'FFA',
        minPlayers: 10,
        maxPlayers: 30,
        modifiers: {
          isCompact: 'allowed',
          isCrowded: 'rejected',
          isHardNations: 'required',
          isPeaceTime: 'indifferent',
          startingGold: {
            1000000: 'allowed',
            5000000: 'required',
            25000000: 'rejected',
          },
        },
      },
    ]);

    expect(criteria).toEqual([
      {
        gameMode: 'FFA',
        teamCount: null,
        minPlayers: 10,
        maxPlayers: 30,
        modifiers: {
          isCompact: 'any',
          isRandomSpawn: 'any',
          isCrowded: 'blocked',
          isHardNations: 'required',
          isAlliancesDisabled: 'any',
          isPortsDisabled: 'any',
          isNukesDisabled: 'any',
          isSAMsDisabled: 'any',
          isPeaceTime: 'any',
          isWaterNukes: 'any',
          startingGold: {
            1000000: 'any',
            5000000: 'required',
            25000000: 'blocked',
          },
        },
      },
    ]);
  });

  it('treats unknown modifier values as any (defensive default)', () => {
    const criteria = sanitizeCriteria([
      {
        gameMode: 'FFA',
        minPlayers: 10,
        maxPlayers: 30,
        modifiers: {
          isCompact: 'something-bogus' as any,
          startingGold: { 5000000: undefined as any },
        },
      },
    ]);

    expect(criteria[0]?.modifiers?.isCompact).toBe('any');
  });

  it('detects Humans Vs Nations as a valid team config', () => {
    const config = { gameMode: 'Team', playerTeams: 'Humans Vs Nations' } as any;
    const lobby = { gameID: 'hvn', gameConfig: config } as any;

    expect(getLobbyTeamConfig(lobby)).toBe('Humans Vs Nations');
  });

  it('reads 0.30 queue source, mode, capacity, occupancy, and modifiers', () => {
    const lobby = {
      gameID: 'spec-1',
      publicGameType: 'special',
      numClients: 11,
      gameConfig: {
        gameMode: 'Free For All',
        maxPlayers: 20,
        publicGameModifiers: {
          isCompact: true,
          isRandomSpawn: true,
          isCrowded: false,
          isHardNations: true,
          startingGold: 5000000,
          goldMultiplier: 2,
          isAlliancesDisabled: true,
          isPortsDisabled: true,
          isNukesDisabled: false,
          isSAMsDisabled: true,
          isPeaceTime: true,
        },
      },
    } as any;

    expect(getLobbyQueueSource(lobby)).toBe('special');
    expect(getLobbyGameMode(lobby)).toBe('FFA');
    expect(getLobbyCapacity(lobby)).toBe(20);
    expect(getLobbyCurrentPlayers(lobby)).toBe(11);
    expect(getLobbyModifiers(lobby)).toEqual({
      isCompact: true,
      isRandomSpawn: true,
      isCrowded: false,
      isHardNations: true,
      startingGold: 5000000,
      goldMultiplier: 2,
      isAlliancesDisabled: true,
      isPortsDisabled: true,
      isNukesDisabled: false,
      isSAMsDisabled: true,
      isPeaceTime: true,
    });
  });

  it('formats FFA details with explicit capacity wording', () => {
    const lobby = {
      gameID: 'ffa-text',
      publicGameType: 'ffa',
      gameConfig: {
        gameMode: 'Free For All',
        maxPlayers: 25,
      },
    } as any;

    expect(getGameDetailsText(lobby)).toBe('FFA • 25 slots');
  });

  it('builds compact browser notification content for team lobbies with map and modifiers', () => {
    const lobby = {
      gameID: 'team-notif',
      publicGameType: 'team',
      gameConfig: {
        gameMode: 'Team',
        playerTeams: 4,
        maxPlayers: 32,
        gameMap: 'Europe',
        publicGameModifiers: {
          isCompact: true,
          isRandomSpawn: true,
          startingGold: 5000000,
          goldMultiplier: 2,
          isAlliancesDisabled: true,
        },
      },
    } as any;

    expect(getBrowserNotificationContent(lobby)).toEqual({
      title: 'Europe • 4 teams • 8/team',
      body: '32 slots • Compact, Random, 5M, x2, No Alliances',
    });
  });

  it('reads startingGold and goldMultiplier from publicGameModifiers when present', () => {
    const lobby = {
      gameID: 'pgm',
      gameConfig: {
        gameMode: 'Free For All',
        publicGameModifiers: { startingGold: 5_000_000, goldMultiplier: 2 },
      },
    } as any;

    expect(getLobbyModifierValue(lobby, 'startingGold')).toBe(5_000_000);
    expect(getLobbyModifierValue(lobby, 'goldMultiplier')).toBe(2);
  });

  it('falls back to gameConfig.startingGold and gameConfig.goldMultiplier (host-set custom lobby)', () => {
    const lobby = {
      gameID: 'host',
      gameConfig: {
        gameMode: 'Team',
        startingGold: 1_000_000,
        goldMultiplier: 3,
      },
    } as any;

    expect(getLobbyModifierValue(lobby, 'startingGold')).toBe(1_000_000);
    expect(getLobbyModifierValue(lobby, 'goldMultiplier')).toBe(3);
  });

  it('treats null host-set gold as undefined', () => {
    const lobby = {
      gameID: 'null',
      gameConfig: {
        gameMode: 'Team',
        startingGold: null,
        goldMultiplier: null,
      },
    } as any;

    expect(getLobbyModifierValue(lobby, 'startingGold')).toBeUndefined();
    expect(getLobbyModifierValue(lobby, 'goldMultiplier')).toBeUndefined();
  });

  it('builds badge labels from the host-set fallback when publicGameModifiers is absent', () => {
    const lobby = {
      gameID: 'host-labels',
      gameConfig: {
        gameMode: 'Team',
        startingGold: 25_000_000,
        goldMultiplier: 2,
      },
    } as any;

    expect(getActiveModifierLabels(lobby)).toEqual(['25M', 'x2']);
  });

  it('formats elapsed time since a timestamp as Xm Ys', () => {
    const now = 1_000_000_000_000;
    expect(formatElapsedSince(now, now)).toBe('0m 0s');
    expect(formatElapsedSince(now - 12_000, now)).toBe('0m 12s');
    expect(formatElapsedSince(now - 75_000, now)).toBe('1m 15s');
    expect(formatElapsedSince(now + 1000, now)).toBe('0m 0s');
  });

  it('builds compact browser notification content for ffa lobbies', () => {
    const lobby = {
      gameID: 'ffa-notif',
      publicGameType: 'ffa',
      gameConfig: {
        gameMode: 'Free For All',
        maxPlayers: 25,
        gameMap: 'Black Sea',
        publicGameModifiers: {
          isCrowded: true,
          isPortsDisabled: true,
        },
      },
    } as any;

    expect(getBrowserNotificationContent(lobby)).toEqual({
      title: 'Black Sea • FFA',
      body: '25 slots • Crowded, No Ports',
    });
  });

  describe('sanitizeCriteria — Team minPlayers floor', () => {
    it('clamps Team minPlayers below 2 to 2', () => {
      const result = sanitizeCriteria([
        { gameMode: 'Team', teamCount: null, minPlayers: 1, maxPlayers: 62 },
      ]);
      expect(result).toHaveLength(1);
      expect(result[0]!.minPlayers).toBe(2);
      expect(result[0]!.maxPlayers).toBe(62);
    });

    it('clamps Team minPlayers below 2, bumps maxPlayers if needed', () => {
      const result = sanitizeCriteria([
        { gameMode: 'Team', teamCount: null, minPlayers: 1, maxPlayers: 1 },
      ]);
      expect(result).toHaveLength(1);
      expect(result[0]!.minPlayers).toBe(2);
      expect(result[0]!.maxPlayers).toBe(2);
    });

    it('preserves Team minPlayers >= 2 untouched even if not on stops list', () => {
      const result = sanitizeCriteria([
        { gameMode: 'Team', teamCount: 3, minPlayers: 7, maxPlayers: 12 },
      ]);
      expect(result).toHaveLength(1);
      expect(result[0]!.minPlayers).toBe(7);
      expect(result[0]!.maxPlayers).toBe(12);
    });

    it('does not apply the per-team floor to FFA criteria', () => {
      const result = sanitizeCriteria([
        { gameMode: 'FFA', teamCount: null, minPlayers: 1, maxPlayers: 125 },
      ]);
      expect(result).toHaveLength(1);
      expect(result[0]!.minPlayers).toBe(1);
      expect(result[0]!.maxPlayers).toBe(125);
    });
  });

  describe('sanitizeCriteria — drops deprecated string team counts', () => {
    it('coerces teamCount: "Duos" to null and preserves slider range', () => {
      const result = sanitizeCriteria([
        { gameMode: 'Team', teamCount: 'Duos', minPlayers: 4, maxPlayers: 12 },
      ]);
      expect(result).toHaveLength(1);
      expect(result[0]!.teamCount).toBeNull();
      expect(result[0]!.minPlayers).toBe(4);
      expect(result[0]!.maxPlayers).toBe(12);
    });

    it('coerces teamCount: "Trios" to null', () => {
      const result = sanitizeCriteria([
        { gameMode: 'Team', teamCount: 'Trios', minPlayers: 6, maxPlayers: 18 },
      ]);
      expect(result[0]!.teamCount).toBeNull();
    });

    it('coerces teamCount: "Quads" to null', () => {
      const result = sanitizeCriteria([
        { gameMode: 'Team', teamCount: 'Quads', minPlayers: 8, maxPlayers: 24 },
      ]);
      expect(result[0]!.teamCount).toBeNull();
    });

    it('preserves teamCount: "Humans Vs Nations"', () => {
      const result = sanitizeCriteria([
        { gameMode: 'Team', teamCount: 'Humans Vs Nations', minPlayers: 2, maxPlayers: 62 },
      ]);
      expect(result[0]!.teamCount).toBe('Humans Vs Nations');
    });

    it('preserves numeric teamCount', () => {
      const result = sanitizeCriteria([
        { gameMode: 'Team', teamCount: 4, minPlayers: 2, maxPlayers: 16 },
      ]);
      expect(result[0]!.teamCount).toBe(4);
    });
  });

  describe('parseTeamCount — 8+', () => {
    it('returns "8+" for the string literal "8+"', () => {
      expect(parseTeamCount('8+')).toBe('8+');
    });

    it('returns the number 8 for numeric input 8', () => {
      expect(parseTeamCount(8)).toBe(8);
    });
  });

  describe('sanitizeCriteria — 8+ team count', () => {
    it('preserves teamCount: "8+"', () => {
      const result = sanitizeCriteria([
        { gameMode: 'Team', teamCount: '8+', minPlayers: 2, maxPlayers: 62 },
      ]);
      expect(result[0]!.teamCount).toBe('8+');
    });

    it('round-trips "8+" through normalizeSettings', () => {
      const settings = normalizeSettings({
        criteria: [{ gameMode: 'Team', teamCount: '8+', minPlayers: 2, maxPlayers: 62 }],
        discoveryEnabled: true,
        soundEnabled: true,
        desktopNotificationsEnabled: false,
        isTeamTwoTimesMinEnabled: false,
      });
      expect(settings.criteria[0]!.teamCount).toBe('8+');
    });
  });

  describe('normalizeSettings — notifyUpcomingEnabled', () => {
    it('defaults notifyUpcomingEnabled to true for legacy settings missing the field', () => {
      const settings = normalizeSettings({
        criteria: [],
        discoveryEnabled: true,
        soundEnabled: true,
        desktopNotificationsEnabled: false,
        isTeamTwoTimesMinEnabled: false,
      } as any);
      expect(settings.notifyUpcomingEnabled).toBe(true);
    });

    it('defaults to true when no settings exist at all', () => {
      expect(normalizeSettings(null).notifyUpcomingEnabled).toBe(true);
    });

    it('preserves an explicit false', () => {
      const settings = normalizeSettings({
        criteria: [],
        discoveryEnabled: true,
        soundEnabled: true,
        desktopNotificationsEnabled: false,
        isTeamTwoTimesMinEnabled: false,
        notifyUpcomingEnabled: false,
      });
      expect(settings.notifyUpcomingEnabled).toBe(false);
    });
  });

  describe('getLobbyModeText', () => {
    it('labels FFA as "Free For All"', () => {
      expect(
        getLobbyModeText({ gameID: 'g', gameConfig: { gameMode: 'Free For All', maxPlayers: 21 } } as any)
      ).toBe('Free For All');
    });

    it('labels numeric team lobbies as "<n> teams of <ppt>" like OpenFront', () => {
      expect(
        getLobbyModeText({
          gameID: 'g',
          gameConfig: { gameMode: 'Team', teamCount: 7, maxPlayers: 105 },
        } as any)
      ).toBe('7 teams of 15');
    });

    it('labels Duos/Trios/Quads as "<n> teams of 2/3/4" rather than the named format', () => {
      expect(
        getLobbyModeText({
          gameID: 'g',
          gameConfig: { gameMode: 'Team', playerTeams: 'Quads', maxPlayers: 40 },
        } as any)
      ).toBe('10 teams of 4');
      expect(
        getLobbyModeText({
          gameID: 'g',
          gameConfig: { gameMode: 'Team', playerTeams: 'Duos', maxPlayers: 30 },
        } as any)
      ).toBe('15 teams of 2');
      expect(
        getLobbyModeText({
          gameID: 'g',
          gameConfig: { gameMode: 'Team', playerTeams: 'Trios', maxPlayers: 90 },
        } as any)
      ).toBe('30 teams of 3');
    });

    it('labels Humans Vs Nations with the human/nation counts', () => {
      expect(
        getLobbyModeText({
          gameID: 'g',
          gameConfig: { gameMode: 'Team', playerTeams: 'Humans Vs Nations', maxPlayers: 27 },
        } as any)
      ).toBe('27 Humans vs 27 Nations');
    });
  });

  describe('getLobbyMapThumbnailUrl', () => {
    it('resolves the CDN url from the asset manifest and base', () => {
      const lobby = { gameID: 'g', gameConfig: { gameMode: 'Free For All', gameMap: 'Bering Sea' } } as any;
      const manifest = { 'maps/beringsea/thumbnail.webp': '/_assets/maps/beringsea/thumbnail.abc.webp' };
      expect(getLobbyMapThumbnailUrl(lobby, manifest, 'https://cdn.ofedge.io')).toBe(
        'https://cdn.ofedge.io/_assets/maps/beringsea/thumbnail.abc.webp'
      );
    });

    it('falls back to a relative path when the manifest is unavailable', () => {
      const lobby = { gameID: 'g', gameConfig: { gameMode: 'Free For All', gameMap: 'Bering Sea' } } as any;
      expect(getLobbyMapThumbnailUrl(lobby, null, null)).toBe('/maps/beringsea/thumbnail.webp');
    });

    it('returns null when the lobby has no map', () => {
      expect(
        getLobbyMapThumbnailUrl({ gameID: 'g', gameConfig: { gameMode: 'Free For All' } } as any)
      ).toBeNull();
    });

    it('strips parentheses when normalizing the map name (OpenFront V32 parity)', () => {
      // OpenFront normalizes with /[\s.()]+/g; a parenthesized name must resolve
      // to the parens-stripped manifest key, not leave the "(...)" in the lookup.
      const lobby = {
        gameID: 'g',
        gameConfig: { gameMode: 'Free For All', gameMap: 'Faroe Islands (Test)' },
      } as any;
      const manifest = {
        'maps/faroeislandstest/thumbnail.webp': '/_assets/maps/faroeislandstest/thumbnail.abc.webp',
      };
      expect(getLobbyMapThumbnailUrl(lobby, manifest, 'https://cdn.ofedge.io')).toBe(
        'https://cdn.ofedge.io/_assets/maps/faroeislandstest/thumbnail.abc.webp'
      );
    });
  });

  describe('buildUpcomingCardModel', () => {
    it('describes capacity as total slots and never exposes a start time', () => {
      const model = buildUpcomingCardModel({
        gameID: 'up-1',
        gameConfig: {
          gameMode: 'Free For All',
          gameMap: 'Europe',
          maxPlayers: 21,
          publicGameModifiers: { isCompact: true },
        },
      } as any);
      expect(model.gameID).toBe('up-1');
      expect(model.mapName).toBe('Europe');
      expect(model.modeText).toBe('Free For All');
      expect(model.capacityLabel).toBe('21 slots');
      expect(model.modifierLabels).toContain('Compact');
      expect(model).not.toHaveProperty('startsAt');
    });
  });
});
