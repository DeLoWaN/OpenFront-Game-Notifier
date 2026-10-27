import { describe, it, expect } from 'vitest';
import { LobbyDiscoveryEngine } from '@/modules/lobby-discovery/LobbyDiscoveryEngine';

const engine = new LobbyDiscoveryEngine();

describe('LobbyDiscoveryEngine', () => {
  it('matches FFA by lobby capacity', () => {
    const lobby = {
      gameID: 'ffa-1',
      publicGameType: 'ffa',
      numClients: 7,
      gameConfig: {
        gameMode: 'Free For All',
        maxPlayers: 20,
      },
    } as any;

    const criteria = [{ gameMode: 'FFA', teamCount: null, minPlayers: 10, maxPlayers: 30 }] as any;

    expect(engine.matchesCriteria(lobby, criteria)).toBe(true);
  });

  it('matches valid Team criteria by players per team', () => {
    const lobby = {
      gameID: 'team-1',
      publicGameType: 'team',
      numClients: 17,
      gameConfig: {
        gameMode: 'Team',
        teamCount: 4,
        maxClients: 32,
      },
      maxClients: 32,
    } as any;

    const criteria = [{ gameMode: 'Team', teamCount: 4, minPlayers: 4, maxPlayers: 8 }] as any;

    expect(engine.matchesCriteria(lobby, criteria)).toBe(true);
  });

  it('matches Humans Vs Nations by format alone, ignoring players-per-team range', () => {
    // HvN has no fixed team size, so the min/max range is skipped entirely.
    // The lobby matches as long as the format and modifiers align.
    const lobby = {
      gameID: 'hvn-1',
      publicGameType: 'special',
      numClients: 6,
      gameConfig: {
        gameMode: 'Team',
        playerTeams: 'Humans Vs Nations',
        maxClients: 40,
      },
      maxClients: 40,
    } as any;

    const criteria = [
      {
        gameMode: 'Team',
        teamCount: 'Humans Vs Nations',
        minPlayers: 30,
        maxPlayers: 50,
      },
    ] as any;

    expect(engine.matchesCriteria(lobby, criteria)).toBe(true);
  });

  it('treats special queue as source only and still applies Team rules', () => {
    const lobby = {
      gameID: 'team-2',
      publicGameType: 'special',
      gameConfig: {
        gameMode: 'Team',
        teamCount: 6,
        maxClients: 72,
      },
      maxClients: 72,
    } as any;

    const validRange = [{ gameMode: 'Team', teamCount: 6, minPlayers: 10, maxPlayers: 12 }] as any;

    expect(engine.matchesCriteria(lobby, validRange)).toBe(true);
  });

  it('rejects a Team lobby whose per-team count is above the criterion max (2x-locked range)', () => {
    // 2x-lock would be reflected in the criterion as maxPlayers = minPlayers * 2.
    // Lobby has 5 per team; criterion is [2, 4].
    const lobby = {
      gameID: 'team-2x-locked',
      publicGameType: 'team',
      gameConfig: {
        gameMode: 'Team',
        teamCount: 4,
        maxClients: 20,
      },
      maxClients: 20,
    } as any;

    const criteria = [{ gameMode: 'Team', teamCount: 4, minPlayers: 2, maxPlayers: 4 }] as any;

    expect(engine.matchesCriteria(lobby, criteria)).toBe(false);
  });

  it('matches Humans Vs Nations even when capacity far exceeds the players-per-team range', () => {
    // Bug regression: previously getPlayersPerTeam('Humans Vs Nations', cap) returned
    // the full capacity (62), causing the filter to compare 62 against maxPlayers (e.g. 6)
    // and silently reject every real HvN lobby. The range check is now skipped for HvN.
    const lobby = {
      gameID: 'hvn-cap',
      publicGameType: 'special',
      gameConfig: {
        gameMode: 'Team',
        playerTeams: 'Humans Vs Nations',
        maxClients: 62,
      },
      maxClients: 62,
    } as any;

    // Tight range that would always reject if capacity (62) were compared against it
    const tightRange = [
      { gameMode: 'Team', teamCount: 'Humans Vs Nations', minPlayers: 3, maxPlayers: 6 },
    ] as any;

    expect(engine.matchesCriteria(lobby, tightRange)).toBe(true);

    // Wide range still matches too
    const wideRange = [
      { gameMode: 'Team', teamCount: 'Humans Vs Nations', minPlayers: 40, maxPlayers: 70 },
    ] as any;

    expect(engine.matchesCriteria(lobby, wideRange)).toBe(true);
  });

  it('still respects modifier filters for Humans Vs Nations lobbies', () => {
    const lobby = {
      gameID: 'hvn-modifier',
      publicGameType: 'special',
      gameConfig: {
        gameMode: 'Team',
        playerTeams: 'Humans Vs Nations',
        maxClients: 62,
        publicGameModifiers: { isCrowded: true },
      },
      maxClients: 62,
    } as any;

    const requireCrowded = [
      { gameMode: 'Team', teamCount: 'Humans Vs Nations', minPlayers: 3, maxPlayers: 6, modifiers: { isCrowded: 'required' } },
    ] as any;
    const blockCrowded = [
      { gameMode: 'Team', teamCount: 'Humans Vs Nations', minPlayers: 3, maxPlayers: 6, modifiers: { isCrowded: 'blocked' } },
    ] as any;

    expect(engine.matchesCriteria(lobby, requireCrowded)).toBe(true);
    expect(engine.matchesCriteria(lobby, blockCrowded)).toBe(false);
  });

  it('applies blocked boolean and numeric modifier filters as an exclusion list', () => {
    const lobby = {
      gameID: 'spec-2',
      publicGameType: 'special',
      gameConfig: {
        gameMode: 'Free For All',
        maxPlayers: 25,
        publicGameModifiers: {
          isCompact: true,
          startingGold: 5000000,
          goldMultiplier: 2,
        },
      },
    } as any;

    const anyCriteria = [
      {
        gameMode: 'FFA',
        teamCount: null,
        minPlayers: 20,
        maxPlayers: 30,
        modifiers: {
          isCompact: 'any',
          startingGold: { 1000000: 'any', 5000000: 'any', 25000000: 'any' },
          goldMultiplier: { 2: 'any' },
        },
      },
    ] as any;

    const blockedCriteria = [
      {
        gameMode: 'FFA',
        teamCount: null,
        minPlayers: 20,
        maxPlayers: 30,
        modifiers: {
          isCompact: 'any',
          startingGold: { 1000000: 'any', 5000000: 'blocked', 25000000: 'any' },
          goldMultiplier: { 2: 'any' },
        },
      },
    ] as any;

    const blockedBooleanCriteria = [
      {
        gameMode: 'FFA',
        teamCount: null,
        minPlayers: 20,
        maxPlayers: 30,
        modifiers: {
          isCompact: 'blocked',
          startingGold: { 5000000: 'any' },
          goldMultiplier: { 2: 'any' },
        },
      },
    ] as any;

    expect(engine.matchesCriteria(lobby, anyCriteria)).toBe(true);
    expect(engine.matchesCriteria(lobby, blockedCriteria)).toBe(false);
    expect(engine.matchesCriteria(lobby, blockedBooleanCriteria)).toBe(false);
  });

  it('matches when a required boolean modifier is present', () => {
    const lobby = {
      gameID: 'ffa-required-on',
      publicGameType: 'ffa',
      gameConfig: {
        gameMode: 'Free For All',
        maxPlayers: 25,
        publicGameModifiers: { isCompact: true },
      },
    } as any;

    const criteria = [
      {
        gameMode: 'FFA',
        teamCount: null,
        minPlayers: 20,
        maxPlayers: 30,
        modifiers: { isCompact: 'required' },
      },
    ] as any;

    expect(engine.matchesCriteria(lobby, criteria)).toBe(true);
  });

  it('rejects when a required boolean modifier is absent', () => {
    const lobby = {
      gameID: 'ffa-required-off',
      publicGameType: 'ffa',
      gameConfig: {
        gameMode: 'Free For All',
        maxPlayers: 25,
        publicGameModifiers: {},
      },
    } as any;

    const criteria = [
      {
        gameMode: 'FFA',
        teamCount: null,
        minPlayers: 20,
        maxPlayers: 30,
        modifiers: { isCompact: 'required' },
      },
    ] as any;

    expect(engine.matchesCriteria(lobby, criteria)).toBe(false);
  });

  it('matches when a required numeric modifier value matches the lobby', () => {
    const lobby = {
      gameID: 'ffa-required-gold-match',
      publicGameType: 'ffa',
      gameConfig: {
        gameMode: 'Free For All',
        maxPlayers: 25,
        publicGameModifiers: { startingGold: 5000000 },
      },
    } as any;

    const criteria = [
      {
        gameMode: 'FFA',
        teamCount: null,
        minPlayers: 20,
        maxPlayers: 30,
        modifiers: {
          startingGold: { 5000000: 'required' },
        },
      },
    ] as any;

    expect(engine.matchesCriteria(lobby, criteria)).toBe(true);
  });

  it('rejects when a required numeric modifier value does not match the lobby', () => {
    const lobby = {
      gameID: 'ffa-required-gold-mismatch',
      publicGameType: 'ffa',
      gameConfig: {
        gameMode: 'Free For All',
        maxPlayers: 25,
        publicGameModifiers: { startingGold: 1000000 },
      },
    } as any;

    const criteria = [
      {
        gameMode: 'FFA',
        teamCount: null,
        minPlayers: 20,
        maxPlayers: 30,
        modifiers: {
          startingGold: { 5000000: 'required' },
        },
      },
    ] as any;

    expect(engine.matchesCriteria(lobby, criteria)).toBe(false);
  });

  it('excludes a lobby with publicGameModifiers.startingGold=1M when 1M is excluded (regression)', () => {
    const lobby = {
      gameID: 'lisbon-pgm-1m',
      publicGameType: 'team',
      gameConfig: {
        gameMode: 'Team',
        playerTeams: 'Quads',
        maxClients: 72,
        publicGameModifiers: { startingGold: 1_000_000 },
      },
      maxClients: 72,
    } as any;

    const criteria = [
      {
        gameMode: 'Team',
        teamCount: 'Quads',
        minPlayers: 1,
        maxPlayers: 62,
        modifiers: {
          startingGold: { 1000000: 'blocked', 5000000: 'any', 25000000: 'any' },
          goldMultiplier: { 2: 'any' },
        },
      },
    ] as any;

    expect(engine.matchesCriteria(lobby, criteria)).toBe(false);
  });

  it('excludes a lobby with host-set gameConfig.startingGold=1M when 1M is excluded', () => {
    // No publicGameModifiers; gold lives directly on gameConfig (host-set custom lobby).
    const lobby = {
      gameID: 'host-set-1m',
      publicGameType: 'team',
      gameConfig: {
        gameMode: 'Team',
        playerTeams: 'Quads',
        maxClients: 32,
        startingGold: 1_000_000,
      },
      maxClients: 32,
    } as any;

    const criteria = [
      {
        gameMode: 'Team',
        teamCount: 'Quads',
        minPlayers: 1,
        maxPlayers: 62,
        modifiers: {
          startingGold: { 1000000: 'blocked', 5000000: 'any', 25000000: 'any' },
        },
      },
    ] as any;

    expect(engine.matchesCriteria(lobby, criteria)).toBe(false);
  });

  it('tolerates null host-set gold values', () => {
    const lobby = {
      gameID: 'null-gold',
      publicGameType: 'team',
      gameConfig: {
        gameMode: 'Team',
        playerTeams: 'Quads',
        maxClients: 32,
        startingGold: null,
        goldMultiplier: null,
      },
      maxClients: 32,
    } as any;

    const criteria = [
      {
        gameMode: 'Team',
        teamCount: 'Quads',
        minPlayers: 1,
        maxPlayers: 62,
        modifiers: {
          startingGold: { 1000000: 'blocked' },
        },
      },
    ] as any;

    // No gold set → no exclusion firing → match (only blocked, no required).
    expect(engine.matchesCriteria(lobby, criteria)).toBe(true);
  });

  it('rejects when a required numeric modifier is absent from the lobby', () => {
    const lobby = {
      gameID: 'ffa-required-gold-missing',
      publicGameType: 'ffa',
      gameConfig: {
        gameMode: 'Free For All',
        maxPlayers: 25,
        publicGameModifiers: {},
      },
    } as any;

    const criteria = [
      {
        gameMode: 'FFA',
        teamCount: null,
        minPlayers: 20,
        maxPlayers: 30,
        modifiers: {
          startingGold: { 5000000: 'required' },
        },
      },
    ] as any;

    expect(engine.matchesCriteria(lobby, criteria)).toBe(false);
  });

  describe('LEMNOS-style lobby: 62 teams of 2 (special source, 124 capacity)', () => {
    // Reproduces the screenshot scenario: LEMNOS, 62 TEAMS OF 2, 61/124, CROWDED + WATER NUKES + 1M STARTING GOLD
    // Two possible wire shapes from OpenFront — numeric playerTeams vs named 'Duos' preset.

    const makeLemnos = (playerTeams: number | string) => ({
      gameID: 'lemnos-1',
      publicGameType: 'special',
      numClients: 61,
      gameConfig: {
        gameMode: 'Team',
        playerTeams,
        maxPlayers: 124,
        publicGameModifiers: {
          isCrowded: true,
          isWaterNukes: true,
          startingGold: 1_000_000,
        },
      },
    } as any);

    // All 8 format chips selected (HvN + 2 + 3 + 4 + 5 + 6 + 7 + 8+), PPT [2, 15]
    // This is the exact state shown in the screenshot (9 active filters = Teams + 8 chips).
    const allChipsCriteria = [
      { gameMode: 'Team', teamCount: 'Humans Vs Nations', minPlayers: 2, maxPlayers: 15 },
      { gameMode: 'Team', teamCount: 2, minPlayers: 2, maxPlayers: 15 },
      { gameMode: 'Team', teamCount: 3, minPlayers: 2, maxPlayers: 15 },
      { gameMode: 'Team', teamCount: 4, minPlayers: 2, maxPlayers: 15 },
      { gameMode: 'Team', teamCount: 5, minPlayers: 2, maxPlayers: 15 },
      { gameMode: 'Team', teamCount: 6, minPlayers: 2, maxPlayers: 15 },
      { gameMode: 'Team', teamCount: 7, minPlayers: 2, maxPlayers: 15 },
      { gameMode: 'Team', teamCount: '8+', minPlayers: 2, maxPlayers: 15 },
    ] as any;

    // No format chips selected, PPT [2, 15] — "filter disabled" state
    const noFormatCriteria = [
      { gameMode: 'Team', teamCount: null, minPlayers: 2, maxPlayers: 15 },
    ] as any;

    describe('playerTeams: 62 (numeric team count — most likely wire format)', () => {
      it('matches with all chips selected (8+ covers 62 teams, 2 PPT in [2,15])', () => {
        expect(engine.matchesCriteria(makeLemnos(62), allChipsCriteria)).toBe(true);
      });

      it('matches with no format chips (null teamCount, 2 PPT in [2,15])', () => {
        expect(engine.matchesCriteria(makeLemnos(62), noFormatCriteria)).toBe(true);
      });

      it('matches with only 8+ chip selected', () => {
        const criteria = [{ gameMode: 'Team', teamCount: '8+', minPlayers: 2, maxPlayers: 15 }] as any;
        expect(engine.matchesCriteria(makeLemnos(62), criteria)).toBe(true);
      });

      it('does not match with only HvN chip selected', () => {
        const criteria = [{ gameMode: 'Team', teamCount: 'Humans Vs Nations', minPlayers: 2, maxPlayers: 15 }] as any;
        expect(engine.matchesCriteria(makeLemnos(62), criteria)).toBe(false);
      });
    });

    describe('playerTeams: "Duos" (named preset — alternative wire format)', () => {
      it('matches with all chips selected — 8+ resolves Duos to 62 teams via capacity', () => {
        expect(engine.matchesCriteria(makeLemnos('Duos'), allChipsCriteria)).toBe(true);
      });

      it('matches with no format chips (null teamCount, getPlayersPerTeam("Duos")=2 in [2,15])', () => {
        expect(engine.matchesCriteria(makeLemnos('Duos'), noFormatCriteria)).toBe(true);
      });

      it('matches with only 8+ chip — resolves Duos+124 capacity to 62 teams >= 8', () => {
        const criteria = [{ gameMode: 'Team', teamCount: '8+', minPlayers: 2, maxPlayers: 15 }] as any;
        expect(engine.matchesCriteria(makeLemnos('Duos'), criteria)).toBe(true);
      });
    });
  });

  describe('numeric team-count criterion vs named-format lobbies', () => {
    // OpenFront sends playerTeams either as a number (team count) or as a named
    // format ('Duos'/'Trios'/'Quads') meaning fixed players-per-team, with the
    // team count derived from capacity. A numeric NUMBER OF TEAMS criterion must
    // match the lobby's *derived* team count, not the raw named string.

    const makeNamed = (playerTeams: string, maxPlayers: number) => ({
      gameID: `named-${playerTeams}-${maxPlayers}`,
      publicGameType: 'special',
      numClients: 0,
      gameConfig: {
        gameMode: 'Team',
        playerTeams,
        maxPlayers,
      },
    } as any);

    it('matches a "Quads" + 24 lobby ("6 teams of 4") against teamCount 6', () => {
      // 24 / 4 = 6 teams; players-per-team 4 within [3, 11].
      const criteria = [{ gameMode: 'Team', teamCount: 6, minPlayers: 3, maxPlayers: 11 }] as any;
      expect(engine.matchesCriteria(makeNamed('Quads', 24), criteria)).toBe(true);
    });

    it('matches a "Trios" + 9 lobby ("3 teams of 3") against teamCount 3', () => {
      const criteria = [{ gameMode: 'Team', teamCount: 3, minPlayers: 2, maxPlayers: 5 }] as any;
      expect(engine.matchesCriteria(makeNamed('Trios', 9), criteria)).toBe(true);
    });

    it('does not match a "Quads" + 24 lobby (6 teams) against teamCount 5', () => {
      const criteria = [{ gameMode: 'Team', teamCount: 5, minPlayers: 3, maxPlayers: 11 }] as any;
      expect(engine.matchesCriteria(makeNamed('Quads', 24), criteria)).toBe(false);
    });

    it('still matches a numeric-encoded lobby (playerTeams: 6) against teamCount 6', () => {
      const lobby = {
        gameID: 'numeric-6',
        publicGameType: 'special',
        numClients: 0,
        gameConfig: { gameMode: 'Team', playerTeams: 6, maxPlayers: 24 },
      } as any;
      const criteria = [{ gameMode: 'Team', teamCount: 6, minPlayers: 3, maxPlayers: 11 }] as any;
      expect(engine.matchesCriteria(lobby, criteria)).toBe(true);
    });
  });

  describe('8+ team count matching', () => {
    const make8PlusCriteria = (minPPT: number, maxPPT: number) => [
      { gameMode: 'Team', teamCount: '8+', minPlayers: minPPT, maxPlayers: maxPPT },
    ] as any;

    it('matches a lobby with exactly 8 teams', () => {
      const lobby = {
        gameID: '8teams-1',
        publicGameType: 'team',
        numClients: 16,
        gameConfig: {
          gameMode: 'Team',
          teamCount: 8,
          maxClients: 16,
        },
        maxClients: 16,
      } as any;
      // 8 teams, 16/8 = 2 players per team — within [2, 10]
      expect(engine.matchesCriteria(lobby, make8PlusCriteria(2, 10))).toBe(true);
    });

    it('matches a lobby with 10 teams', () => {
      const lobby = {
        gameID: '10teams-1',
        publicGameType: 'team',
        numClients: 14,
        gameConfig: {
          gameMode: 'Team',
          teamCount: 10,
          maxClients: 20,
        },
        maxClients: 20,
      } as any;
      // 10 teams, 20/10 = 2 players per team — within [2, 10]
      expect(engine.matchesCriteria(lobby, make8PlusCriteria(2, 10))).toBe(true);
    });

    it('does not match a lobby with 7 teams', () => {
      const lobby = {
        gameID: '7teams-1',
        publicGameType: 'team',
        numClients: 14,
        gameConfig: {
          gameMode: 'Team',
          teamCount: 7,
          maxClients: 14,
        },
        maxClients: 14,
      } as any;
      expect(engine.matchesCriteria(lobby, make8PlusCriteria(2, 10))).toBe(false);
    });

    it('respects players-per-team bounds for 8+ lobbies', () => {
      const lobby = {
        gameID: '10teams-big',
        publicGameType: 'team',
        numClients: 30,
        gameConfig: {
          gameMode: 'Team',
          teamCount: 10,
          maxClients: 100,
        },
        maxClients: 100,
      } as any;
      // 10 teams, 100/10 = 10 players per team — outside [2, 5]
      expect(engine.matchesCriteria(lobby, make8PlusCriteria(2, 5))).toBe(false);
    });

    it('does not match Humans Vs Nations with 8+ criteria', () => {
      const lobby = {
        gameID: 'hvn-1',
        publicGameType: 'special',
        numClients: 6,
        gameConfig: {
          gameMode: 'Team',
          playerTeams: 'Humans Vs Nations',
          maxClients: 60,
        },
        maxClients: 60,
      } as any;
      expect(engine.matchesCriteria(lobby, make8PlusCriteria(2, 62))).toBe(false);
    });
  });

  describe('Map Filter', () => {
    const ffaCriteria = [{ gameMode: 'FFA', teamCount: null, minPlayers: null, maxPlayers: null }] as any;
    const ffaOn = (gameMap: string | undefined) =>
      ({
        gameID: `ffa-${gameMap ?? 'none'}`,
        publicGameType: 'ffa',
        gameConfig: { gameMode: 'Free For All', maxPlayers: 40, gameMap },
      }) as any;

    it('rejects a lobby on a blocked map', () => {
      expect(engine.matchesCriteria(ffaOn('Alps'), ffaCriteria, { Alps: 'blocked' })).toBe(false);
      expect(engine.matchesCriteria(ffaOn('Europe'), ffaCriteria, { Alps: 'blocked' })).toBe(true);
    });

    it('matches only a required map once at least one map is required', () => {
      const filter = { Alps: 'required', Europe: 'required', Mars: 'any' } as const;
      expect(engine.matchesCriteria(ffaOn('Alps'), ffaCriteria, filter)).toBe(true);
      expect(engine.matchesCriteria(ffaOn('Europe'), ffaCriteria, filter)).toBe(true);
      expect(engine.matchesCriteria(ffaOn('Mars'), ffaCriteria, filter)).toBe(false);
    });

    it('lets a lobby without a map pass only when no map is required', () => {
      expect(engine.matchesCriteria(ffaOn(undefined), ffaCriteria, { Alps: 'blocked' })).toBe(true);
      expect(engine.matchesCriteria(ffaOn(undefined), ffaCriteria, { Alps: 'required' })).toBe(false);
    });

    it('applies the same Map Filter to every Criterion', () => {
      const teamLobby = {
        gameID: 'team-alps',
        publicGameType: 'team',
        gameConfig: { gameMode: 'Team', playerTeams: 2, maxPlayers: 40, gameMap: 'Alps' },
      } as any;
      const both = [
        ...ffaCriteria,
        { gameMode: 'Team', teamCount: null, minPlayers: null, maxPlayers: null },
      ] as any;
      expect(engine.matchesCriteria(teamLobby, both, { Alps: 'blocked' })).toBe(false);
      expect(engine.matchesCriteria(ffaOn('Alps'), both, { Alps: 'blocked' })).toBe(false);
    });
  });

  describe('Doomsday Clock and Trusted', () => {
    const ffaWith = (modifiers: object | undefined, extra: object = {}) =>
      ({
        gameID: 'ffa-mod',
        publicGameType: 'ffa',
        gameConfig: { gameMode: 'Free For All', maxPlayers: 25, publicGameModifiers: modifiers, ...extra },
      }) as any;
    const criteriaWith = (modifiers: object) =>
      [{ gameMode: 'FFA', teamCount: null, minPlayers: null, maxPlayers: null, modifiers }] as any;

    it('requires or blocks Doomsday Clock', () => {
      const doomsday = ffaWith({ isDoomsdayClock: true });
      const plain = ffaWith({});
      expect(engine.matchesCriteria(doomsday, criteriaWith({ isDoomsdayClock: 'required' }))).toBe(true);
      expect(engine.matchesCriteria(plain, criteriaWith({ isDoomsdayClock: 'required' }))).toBe(false);
      expect(engine.matchesCriteria(doomsday, criteriaWith({ isDoomsdayClock: 'blocked' }))).toBe(false);
      expect(engine.matchesCriteria(plain, criteriaWith({ isDoomsdayClock: 'blocked' }))).toBe(true);
    });

    it('reads Trusted from the game configuration', () => {
      const trusted = ffaWith({}, { trusted: true });
      const open = ffaWith({});
      expect(engine.matchesCriteria(trusted, criteriaWith({ isTrusted: 'required' }))).toBe(true);
      expect(engine.matchesCriteria(open, criteriaWith({ isTrusted: 'required' }))).toBe(false);
      expect(engine.matchesCriteria(trusted, criteriaWith({ isTrusted: 'blocked' }))).toBe(false);
    });
  });

  describe('Hosted and Custom Lobby configuration', () => {
    const criteriaWith = (modifiers: object) =>
      [{ gameMode: 'FFA', teamCount: null, minPlayers: null, maxPlayers: null, modifiers }] as any;
    const hosted = (config: object, extra: object = {}) =>
      ({
        gameID: 'hosted-1',
        publicGameType: 'hosted',
        gameConfig: { gameMode: 'Free For All', maxPlayers: 30, ...config },
        ...extra,
      }) as any;

    it.each([
      ['isRandomSpawn', { randomSpawn: true }],
      ['isAlliancesDisabled', { disableAlliances: true }],
      ['isWaterNukes', { waterNukes: true }],
      ['isDoomsdayClock', { doomsdayClock: { speed: 'fast' } }],
      ['isCompact', { gameMapSize: 'Compact' }],
      ['isNukesDisabled', { disabledUnits: ['Missile Silo', 'Atom Bomb', 'Hydrogen Bomb', 'MIRV'] }],
      ['isSAMsDisabled', { disabledUnits: ['SAM Launcher'] }],
    ])('reads %s from the raw configuration of a Hosted Lobby', (key, config) => {
      expect(engine.matchesCriteria(hosted(config), criteriaWith({ [key]: 'required' }))).toBe(true);
      expect(engine.matchesCriteria(hosted({}), criteriaWith({ [key]: 'required' }))).toBe(false);
    });

    it('does not treat a partial nuke ban as Nukes Disabled', () => {
      const atomOnly = hosted({ disabledUnits: ['Atom Bomb'] });
      expect(engine.matchesCriteria(atomOnly, criteriaWith({ isNukesDisabled: 'required' }))).toBe(false);
    });

    it('reads the raw configuration of a Custom Lobby in the Special Queue', () => {
      const custom = {
        gameID: 'custom-1',
        publicGameType: 'special',
        custom: true,
        gameConfig: { gameMode: 'Free For All', maxPlayers: 30, randomSpawn: true },
      } as any;
      expect(engine.matchesCriteria(custom, criteriaWith({ isRandomSpawn: 'required' }))).toBe(true);
    });

    it('treats Crowded, Hard Nations and Peace Time as absent', () => {
      const lobby = hosted({ difficulty: 'Hard', spawnImmunityDuration: 2400 });
      for (const key of ['isCrowded', 'isHardNations', 'isPeaceTime']) {
        expect(engine.matchesCriteria(lobby, criteriaWith({ [key]: 'required' }))).toBe(false);
        expect(engine.matchesCriteria(lobby, criteriaWith({ [key]: 'blocked' }))).toBe(true);
      }
    });

    it('reads the raw gold settings of a Hosted Lobby', () => {
      const lobby = hosted({ startingGold: 5_000_000, goldMultiplier: 2 });
      expect(engine.matchesCriteria(lobby, criteriaWith({ startingGold: { 5000000: 'required' } }))).toBe(true);
      expect(engine.matchesCriteria(lobby, criteriaWith({ goldMultiplier: { 2: 'blocked' } }))).toBe(false);
    });
  });

  describe('Humans Vs Nations is opt-in', () => {
    const hvn = {
      gameID: 'hvn-opt-in',
      publicGameType: 'special',
      gameConfig: { gameMode: 'Team', playerTeams: 'Humans Vs Nations', maxPlayers: 40 },
    } as any;
    const twoTeams = {
      gameID: 'two-teams',
      publicGameType: 'team',
      gameConfig: { gameMode: 'Team', playerTeams: 2, maxPlayers: 40 },
    } as any;

    it('does not match Humans Vs Nations from a Team Criterion with no format', () => {
      const anyTeam = [{ gameMode: 'Team', teamCount: null, minPlayers: null, maxPlayers: null }] as any;
      expect(engine.matchesCriteria(hvn, anyTeam)).toBe(false);
      expect(engine.matchesCriteria(twoTeams, anyTeam)).toBe(true);
    });

    it('matches Humans Vs Nations when its format is selected', () => {
      const hvnOnly = [{ gameMode: 'Team', teamCount: 'Humans Vs Nations', minPlayers: null, maxPlayers: null }] as any;
      expect(engine.matchesCriteria(hvn, hvnOnly)).toBe(true);
    });
  });
});
