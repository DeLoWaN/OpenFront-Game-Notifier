import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LobbyDiscoveryUI } from '@/modules/lobby-discovery/LobbyDiscoveryUI';
import { STORAGE_KEYS } from '@/config/constants';
import { SoundUtils } from '@/utils/SoundUtils';
import { BrowserNotificationUtils } from '@/utils/BrowserNotificationUtils';
import { LobbyUtils } from '@/utils/LobbyUtils';

vi.mock('@/utils/LobbyUtils', () => ({
  LobbyUtils: {
    isOnLobbyPage: vi.fn(() => true),
  },
}));

vi.mock('@/utils/URLObserver', () => ({
  URLObserver: {
    subscribe: vi.fn(),
  },
}));

vi.mock('@/utils/SoundUtils', () => ({
  SoundUtils: {
    playGameFoundSound: vi.fn(),
    preloadSounds: vi.fn(),
  },
}));

vi.mock('@/utils/BrowserNotificationUtils', () => ({
  BrowserNotificationUtils: {
    isSupported: vi.fn(() => true),
    isBackgrounded: vi.fn(() => true),
    ensurePermission: vi.fn(async () => true),
    show: vi.fn(() => true),
    focusWindow: vi.fn(),
  },
}));

const NOW = 1_700_000_000_000;

/** The lobby area of OpenFront's home page, as the Lobby Board finds it. */
function mountHomepage(): void {
  document.body.innerHTML = `
    <div id="page-play">
      <game-mode-selector>
        <div class="flex flex-col gap-4 w-full sm:grid sm:grid-cols-[2fr_1fr] sm:grid-rows-[auto_min(24rem,40vh)_auto_auto]">
          <div class="grid grid-cols-3 gap-4 h-14 sm:col-span-2 sm:row-start-4"><button>Solo</button></div>
          <div class="min-w-0 sm:col-start-1 sm:row-start-2"><button id="ffa-card" class="group @container relative block">ffa</button></div>
          <section class="flex flex-col gap-4 min-w-0 sm:grid sm:row-start-2 sm:col-start-2">
            <div class="min-w-0 sm:row-start-3"><button id="team-card" class="group @container relative block">team</button></div>
            <div class="min-w-0 sm:row-start-2"><button id="special-card" class="group @container relative block">special</button></div>
            <h2 class="min-w-0 sm:row-start-1"><button id="see-all" class="group/upcoming flex w-full">See all</button></h2>
          </section>
        </div>
      </game-mode-selector>
    </div>
    <join-lobby-modal></join-lobby-modal>
    <host-lobby-modal></host-lobby-modal>
  `;
  const selectorEl = document.querySelector('game-mode-selector') as any;
  selectorEl.lobbies = {
    games: {
      ffa: [{ gameID: 'ffa-placeholder' }],
      special: [{ gameID: 'special-placeholder' }],
      team: [{ gameID: 'team-placeholder' }],
    },
  };
  (document.querySelector('join-lobby-modal') as any).currentLobbyId = '';
}

function ffa(gameID: string, maxPlayers: number) {
  return {
    gameID,
    publicGameType: 'ffa',
    numClients: 3,
    gameConfig: { gameMode: 'Free For All', gameMap: 'Europe', maxPlayers },
  };
}

describe('Lobby Board alerts', () => {
  let store: Map<string, any>;
  let ui: LobbyDiscoveryUI | null;

  /** Saves one Criterion that matches an FFA lobby of 30 players or more. */
  function bigFfaSettings(extra: Record<string, unknown> = {}): void {
    store.set(STORAGE_KEYS.lobbyDiscoverySettings, {
      criteria: [{ gameMode: 'FFA', teamCount: null, minPlayers: 30, maxPlayers: null }],
      discoveryEnabled: true,
      soundEnabled: true,
      desktopNotificationsEnabled: true,
      isTeamTwoTimesMinEnabled: false,
      ...extra,
    });
  }

  /** An FFA Queue of five small lobbies, with a big one at Queue Position 4 when `big` is set. */
  function ffaQueue(big: boolean): any[] {
    return [
      ffa('ffa-0', 20),
      ffa('ffa-1', 20),
      ffa('ffa-2', 20),
      ffa('ffa-3', 20),
      ffa('ffa-4', big ? 40 : 20),
    ];
  }

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    store = new Map();
    ui = null;
    (globalThis as any).GM_getValue = vi.fn((key: string, defaultValue?: unknown) =>
      store.has(key) ? store.get(key) : defaultValue
    );
    (globalThis as any).GM_setValue = vi.fn((key: string, value: unknown) => {
      store.set(key, value);
    });
    mountHomepage();
    vi.clearAllMocks();
    vi.mocked(LobbyUtils.isOnLobbyPage).mockReturnValue(true);
    vi.mocked(BrowserNotificationUtils.isBackgrounded).mockReturnValue(true);
    vi.mocked(BrowserNotificationUtils.show).mockReturnValue(true);
  });

  afterEach(() => {
    ui?.cleanup();
    ui = null;
    vi.clearAllTimers();
    vi.useRealTimers();
    document.body.innerHTML = '';
  });

  describe('alert at every Queue Position', () => {
    it('plays the sound once and sends one desktop notification for a match at Queue Position 4', () => {
      bigFfaSettings();

      ui = new LobbyDiscoveryUI();
      ui.receiveLobbyUpdate(ffaQueue(false) as any, NOW);
      expect(SoundUtils.playGameFoundSound).not.toHaveBeenCalled();

      ui.receiveLobbyUpdate(ffaQueue(true) as any, NOW);
      ui.receiveLobbyUpdate(ffaQueue(true) as any, NOW);
      ui.receiveLobbyUpdate(ffaQueue(true) as any, NOW);

      expect(SoundUtils.playGameFoundSound).toHaveBeenCalledTimes(1);
      expect(BrowserNotificationUtils.show).toHaveBeenCalledTimes(1);
    });

    it('alerts again when a lobby stops matching and then matches again', () => {
      bigFfaSettings();

      ui = new LobbyDiscoveryUI();
      ui.receiveLobbyUpdate(ffaQueue(true) as any, NOW);
      ui.receiveLobbyUpdate(ffaQueue(false) as any, NOW);
      ui.receiveLobbyUpdate(ffaQueue(true) as any, NOW);

      expect(SoundUtils.playGameFoundSound).toHaveBeenCalledTimes(2);
    });
  });

  describe('Up Next removal', () => {
    it('renders no Up Next element and saves no "notify upcoming" value', () => {
      bigFfaSettings({ notifyUpcomingEnabled: false });

      ui = new LobbyDiscoveryUI();
      ui.receiveLobbyUpdate(ffaQueue(true) as any, NOW);

      expect(document.getElementById('of-upcoming-strip')).toBeNull();
      expect(document.querySelector('[class*="of-upcoming"]')).toBeNull();
      expect(document.body.textContent).not.toMatch(/up next|notify on upcoming/i);
      expect(store.get(STORAGE_KEYS.lobbyDiscoverySettings)).not.toHaveProperty(
        'notifyUpcomingEnabled'
      );
    });
  });
});
