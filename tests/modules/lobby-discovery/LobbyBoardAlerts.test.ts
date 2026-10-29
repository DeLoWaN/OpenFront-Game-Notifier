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

  describe('"New" badge and pulse', () => {
    const card = (gameID: string): HTMLElement | null =>
      document.querySelector(`.of-board-card[data-game-id="${gameID}"]`);
    const newBadge = (gameID: string): Element | null | undefined =>
      card(gameID)?.querySelector('.of-board-new');
    const pulsing = (gameID: string): boolean | undefined =>
      card(gameID)?.classList.contains('of-board-card-pulse');

    it('gives the card that alerted a "New" badge and a pulse, and no other card', () => {
      bigFfaSettings();

      ui = new LobbyDiscoveryUI();
      ui.receiveLobbyUpdate(ffaQueue(true) as any, NOW);

      expect(newBadge('ffa-4')?.textContent).toBe('New');
      expect(pulsing('ffa-4')).toBe(true);
      expect(newBadge('ffa-3')).toBeNull();
      expect(pulsing('ffa-3')).toBe(false);
    });

    it('keeps the badge and the pulse across feed updates, without a second alert', () => {
      bigFfaSettings();

      ui = new LobbyDiscoveryUI();
      ui.receiveLobbyUpdate(ffaQueue(true) as any, NOW);
      vi.advanceTimersByTime(3_000);
      ui.receiveLobbyUpdate(ffaQueue(true) as any, NOW + 3_000);

      expect(newBadge('ffa-4')).toBeTruthy();
      expect(pulsing('ffa-4')).toBe(true);
      expect(SoundUtils.playGameFoundSound).toHaveBeenCalledTimes(1);
    });

    it('removes the badge when the pointer passes over the card', () => {
      bigFfaSettings();

      ui = new LobbyDiscoveryUI();
      ui.receiveLobbyUpdate(ffaQueue(true) as any, NOW);
      card('ffa-3')!.dispatchEvent(new Event('pointerenter'));
      expect(newBadge('ffa-4')).toBeTruthy();

      card('ffa-4')!.dispatchEvent(new Event('pointerenter'));
      expect(newBadge('ffa-4')).toBeNull();

      ui.receiveLobbyUpdate(ffaQueue(true) as any, NOW);
      expect(newBadge('ffa-4')).toBeNull();
    });

    it('stops the pulse after 10 seconds without a feed update, and keeps the badge until the pointer passes', () => {
      bigFfaSettings();

      ui = new LobbyDiscoveryUI();
      ui.receiveLobbyUpdate(ffaQueue(true) as any, NOW);

      vi.advanceTimersByTime(9_999);
      expect(pulsing('ffa-4')).toBe(true);

      vi.advanceTimersByTime(1);
      expect(pulsing('ffa-4')).toBe(false);
      expect(newBadge('ffa-4')).toBeTruthy();
    });

    it('badges and pulses the card again when the lobby stops matching and matches again', () => {
      bigFfaSettings();

      ui = new LobbyDiscoveryUI();
      ui.receiveLobbyUpdate(ffaQueue(true) as any, NOW);
      card('ffa-4')!.dispatchEvent(new Event('pointerenter'));
      vi.advanceTimersByTime(10_000);
      expect(newBadge('ffa-4')).toBeNull();

      ui.receiveLobbyUpdate(ffaQueue(false) as any, NOW);
      ui.receiveLobbyUpdate(ffaQueue(true) as any, NOW);

      expect(newBadge('ffa-4')).toBeTruthy();
      expect(pulsing('ffa-4')).toBe(true);
    });

    it('shows no badge and no pulse when the lobby matches but discovery is paused', () => {
      bigFfaSettings({ discoveryEnabled: false });

      ui = new LobbyDiscoveryUI();
      ui.receiveLobbyUpdate(ffaQueue(true) as any, NOW);

      expect(newBadge('ffa-4')).toBeNull();
      expect(pulsing('ffa-4')).toBe(false);
    });
  });

  describe('open join or host window', () => {
    const card = (gameID: string): HTMLElement | null =>
      document.querySelector(`.of-board-card[data-game-id="${gameID}"]`);
    const board = (): HTMLElement | null => document.getElementById('of-lobby-board');
    const setJoinLobby = (value: string): void => {
      (document.querySelector('join-lobby-modal') as any).currentLobbyId = value;
    };

    const gates: Array<[string, () => void, () => void]> = [
      [
        'the join window is open',
        () => setJoinLobby('joined-lobby'),
        () => setJoinLobby(''),
      ],
      [
        'the host window is open',
        () => ((document.querySelector('host-lobby-modal') as any).lobbyId = 'hosted-lobby'),
        () => ((document.querySelector('host-lobby-modal') as any).lobbyId = ''),
      ],
      [
        'a public lobby is highlighted',
        () => {
          const publicLobby = document.createElement('public-lobby') as any;
          publicLobby.isLobbyHighlighted = true;
          document.body.append(publicLobby);
        },
        () => document.querySelector('public-lobby')?.remove(),
      ],
    ];

    it.each(gates)(
      'keeps the board visible but raises no alert and no pulse while %s',
      (_name, open) => {
        bigFfaSettings();
        open();

        ui = new LobbyDiscoveryUI();
        ui.receiveLobbyUpdate(ffaQueue(true) as any, NOW);

        expect(board()?.style.display).not.toBe('none');
        expect(card('ffa-4')).toBeTruthy();
        expect(SoundUtils.playGameFoundSound).not.toHaveBeenCalled();
        expect(BrowserNotificationUtils.show).not.toHaveBeenCalled();
        expect(card('ffa-4')?.querySelector('.of-board-new')).toBeNull();
        expect(card('ffa-4')?.classList.contains('of-board-card-pulse')).toBe(false);
        expect(document.querySelector('.of-discovery-card-active')).toBeNull();
      }
    );
  });

  describe('desktop notification click', () => {
    const card = (gameID: string): HTMLElement | null =>
      document.querySelector(`.of-board-card[data-game-id="${gameID}"]`);
    let scrolled: Element[];

    beforeEach(() => {
      scrolled = [];
      // jsdom does not implement scrollIntoView.
      (HTMLElement.prototype as any).scrollIntoView = function (this: Element) {
        scrolled.push(this);
      };
    });

    afterEach(() => {
      delete (HTMLElement.prototype as any).scrollIntoView;
    });

    it('scrolls the card into view and flashes it, only when the user clicks', () => {
      bigFfaSettings();

      ui = new LobbyDiscoveryUI();
      ui.receiveLobbyUpdate(ffaQueue(true) as any, NOW);

      expect(BrowserNotificationUtils.show).toHaveBeenCalledTimes(1);
      expect(card('ffa-4')?.classList).not.toContain('of-board-card-flash');
      expect(scrolled).toEqual([]);

      // The notification utility focuses the tab, then runs this action.
      vi.mocked(BrowserNotificationUtils.show).mock.calls[0]![0].onClick!();

      expect(card('ffa-4')?.classList).toContain('of-board-card-flash');
      expect(scrolled).toEqual([card('ffa-4')]);

      vi.advanceTimersByTime(2_000);
      expect(card('ffa-4')?.classList).not.toContain('of-board-card-flash');
    });

    it('does nothing when the lobby has left the feed before the click', () => {
      bigFfaSettings();

      ui = new LobbyDiscoveryUI();
      ui.receiveLobbyUpdate(ffaQueue(true) as any, NOW);
      ui.receiveLobbyUpdate(ffaQueue(true).slice(0, 4) as any, NOW);

      expect(() => vi.mocked(BrowserNotificationUtils.show).mock.calls[0]![0].onClick!()).not.toThrow();
      expect(scrolled).toEqual([]);
    });

    it('opens the See All View for a lobby of Queue Position 4 when the Lobby Board cannot show', () => {
      bigFfaSettings();
      // OpenFront's home grid is gone, so the board has no place to mount.
      document.querySelector('game-mode-selector')!.innerHTML = '';
      const showPage = vi.fn();
      (window as any).showPage = showPage;

      ui = new LobbyDiscoveryUI();
      ui.receiveLobbyUpdate(ffaQueue(true) as any, NOW);
      vi.mocked(BrowserNotificationUtils.show).mock.calls[0]![0].onClick!();

      expect(showPage).toHaveBeenCalledWith('page-detailed-view');
      delete (window as any).showPage;
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
