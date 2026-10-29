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

  describe('"New" badge', () => {
    const card = (gameID: string): HTMLElement | null =>
      document.querySelector(`.of-board-card[data-game-id="${gameID}"]`);
    const newBadge = (gameID: string): Element | null | undefined =>
      card(gameID)?.querySelector('.of-board-new');

    it('gives the card that alerted a "New" badge, and no other card', () => {
      bigFfaSettings();

      ui = new LobbyDiscoveryUI();
      ui.receiveLobbyUpdate(ffaQueue(true) as any, NOW);

      expect(newBadge('ffa-4')?.textContent).toBe('New');
      expect(newBadge('ffa-3')).toBeNull();
    });

    it('puts the badge on the map name line, just left of the countdown', () => {
      bigFfaSettings();

      ui = new LobbyDiscoveryUI();
      const withStart = (queue: any[]) => [{ ...queue[0], startsAt: NOW + 60_000 }, ...queue.slice(1)];
      ui.receiveLobbyUpdate(withStart(ffaQueue(false)) as any, NOW);
      ui.receiveLobbyUpdate(
        withStart([{ ...ffa('ffa-0', 40) }, ...ffaQueue(false).slice(1)]) as any,
        NOW
      );

      const nameLine = card('ffa-0')?.querySelector('.of-board-nameline');
      expect(Array.from(nameLine?.children ?? []).map((child) => child.className)).toEqual([
        'of-board-map',
        'of-board-new',
        'of-board-countdown',
      ]);
    });

    it('keeps the badge across feed updates, without a second alert', () => {
      bigFfaSettings();

      ui = new LobbyDiscoveryUI();
      ui.receiveLobbyUpdate(ffaQueue(true) as any, NOW);
      vi.advanceTimersByTime(3_000);
      ui.receiveLobbyUpdate(ffaQueue(true) as any, NOW + 3_000);

      expect(newBadge('ffa-4')).toBeTruthy();
      expect(SoundUtils.playGameFoundSound).toHaveBeenCalledTimes(1);
    });

    describe('window focus', () => {
      /** The window gets or loses focus: the mock answers, then the event fires. */
      const setFocus = (focused: boolean): void => {
        vi.mocked(BrowserNotificationUtils.isBackgrounded).mockReturnValue(!focused);
        window.dispatchEvent(new Event(focused ? 'focus' : 'blur'));
      };
      const setVisibility = (state: 'visible' | 'hidden'): void => {
        Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => state });
        document.dispatchEvent(new Event('visibilitychange'));
      };

      afterEach(() => {
        delete (document as any).visibilityState;
      });

      it('gives no badge to a match that arrives while the window has focus, but still plays the sound', () => {
        bigFfaSettings();
        vi.mocked(BrowserNotificationUtils.isBackgrounded).mockReturnValue(false);

        ui = new LobbyDiscoveryUI();
        ui.receiveLobbyUpdate(ffaQueue(true) as any, NOW);

        expect(card('ffa-4')).toBeTruthy();
        expect(newBadge('ffa-4')).toBeNull();
        expect(SoundUtils.playGameFoundSound).toHaveBeenCalledTimes(1);
        expect(BrowserNotificationUtils.show).toHaveBeenCalledTimes(1);
      });

      it('keeps the badge when the window gets focus, and removes it when the window loses focus again', () => {
        bigFfaSettings();

        ui = new LobbyDiscoveryUI();
        ui.receiveLobbyUpdate(ffaQueue(true) as any, NOW);
        expect(newBadge('ffa-4')).toBeTruthy();

        setFocus(true);
        expect(newBadge('ffa-4')).toBeTruthy();
        ui.receiveLobbyUpdate(ffaQueue(true) as any, NOW);
        expect(newBadge('ffa-4')).toBeTruthy();

        setFocus(false);
        expect(newBadge('ffa-4')).toBeNull();
        ui.receiveLobbyUpdate(ffaQueue(true) as any, NOW);
        expect(newBadge('ffa-4')).toBeNull();
      });

      it('keeps the badge when the window blurs because focus moves into an iframe of the page', () => {
        bigFfaSettings();

        ui = new LobbyDiscoveryUI();
        ui.receiveLobbyUpdate(ffaQueue(true) as any, NOW);
        // The document still has focus: the focus is inside one of its frames.
        const hasFocus = vi.spyOn(document, 'hasFocus').mockReturnValue(true);
        window.dispatchEvent(new Event('blur'));
        expect(newBadge('ffa-4')).toBeTruthy();

        hasFocus.mockReturnValue(false);
        window.dispatchEvent(new Event('blur'));
        expect(newBadge('ffa-4')).toBeNull();
        hasFocus.mockRestore();
      });

      it('removes the badge when the tab becomes hidden, and not when it becomes visible', () => {
        bigFfaSettings();

        ui = new LobbyDiscoveryUI();
        ui.receiveLobbyUpdate(ffaQueue(true) as any, NOW);

        setVisibility('visible');
        expect(newBadge('ffa-4')).toBeTruthy();

        setVisibility('hidden');
        expect(newBadge('ffa-4')).toBeNull();
      });

      it('does not remove the badge when the pointer passes over the card', () => {
        bigFfaSettings();

        ui = new LobbyDiscoveryUI();
        ui.receiveLobbyUpdate(ffaQueue(true) as any, NOW);
        card('ffa-4')!.dispatchEvent(new Event('pointerenter'));
        card('ffa-4')!.dispatchEvent(new Event('mouseover', { bubbles: true }));

        expect(newBadge('ffa-4')).toBeTruthy();
      });

      it('plays no second sound when the window loses focus while the lobby keeps matching', () => {
        bigFfaSettings();

        ui = new LobbyDiscoveryUI();
        ui.receiveLobbyUpdate(ffaQueue(true) as any, NOW);
        setFocus(true);
        setFocus(false);
        ui.receiveLobbyUpdate(ffaQueue(true) as any, NOW);

        expect(SoundUtils.playGameFoundSound).toHaveBeenCalledTimes(1);
        expect(BrowserNotificationUtils.show).toHaveBeenCalledTimes(1);
      });

      it('stops listening to the window when the notifier is cleaned up', () => {
        bigFfaSettings();
        const removed = vi.spyOn(window, 'removeEventListener');
        const removedDocument = vi.spyOn(document, 'removeEventListener');

        ui = new LobbyDiscoveryUI();
        ui.cleanup();
        ui = null;

        expect(removed.mock.calls.map(([type]) => type)).toContain('blur');
        expect(removedDocument.mock.calls.map(([type]) => type)).toContain('visibilitychange');
        removed.mockRestore();
        removedDocument.mockRestore();
      });
    });

    it('never pulses a card, and keeps the badge while the window stays out of focus', () => {
      bigFfaSettings();

      ui = new LobbyDiscoveryUI();
      ui.receiveLobbyUpdate(ffaQueue(true) as any, NOW);
      expect(document.querySelector('.of-board-card-pulse')).toBeNull();

      vi.advanceTimersByTime(10_000);
      expect(newBadge('ffa-4')).toBeTruthy();
      expect(document.querySelector('.of-board-card-pulse')).toBeNull();
    });

    it('badges the card again when the lobby stops matching and matches again', () => {
      bigFfaSettings();

      ui = new LobbyDiscoveryUI();
      ui.receiveLobbyUpdate(ffaQueue(true) as any, NOW);
      window.dispatchEvent(new Event('blur'));
      expect(newBadge('ffa-4')).toBeNull();

      ui.receiveLobbyUpdate(ffaQueue(false) as any, NOW);
      ui.receiveLobbyUpdate(ffaQueue(true) as any, NOW);

      expect(newBadge('ffa-4')).toBeTruthy();
    });

    it('shows no badge when the lobby matches but discovery is paused', () => {
      bigFfaSettings({ discoveryEnabled: false });

      ui = new LobbyDiscoveryUI();
      ui.receiveLobbyUpdate(ffaQueue(true) as any, NOW);

      expect(newBadge('ffa-4')).toBeNull();
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
      'keeps the board visible but raises no alert while %s',
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
        expect(document.querySelector('.of-discovery-card-active')).toBeNull();
      }
    );

    it.each(gates)(
      'alerts for a lobby that matches when %s opens and closes without a feed update in between',
      (_name, open, close) => {
        bigFfaSettings();
        open();
        ui = new LobbyDiscoveryUI();
        ui.receiveLobbyUpdate(ffaQueue(true) as any, NOW);

        close();
        ui.receiveLobbyUpdate(ffaQueue(true) as any, NOW);

        // The lobby began to match while the window hid the alerts: it alerts once, when they come back.
        expect(SoundUtils.playGameFoundSound).toHaveBeenCalledTimes(1);
        expect(card('ffa-4')?.querySelector('.of-board-new')).toBeTruthy();
      }
    );

    it('does not alert again for a lobby that keeps matching while a window opens and closes', () => {
      bigFfaSettings();
      ui = new LobbyDiscoveryUI();
      ui.receiveLobbyUpdate(ffaQueue(true) as any, NOW);
      expect(SoundUtils.playGameFoundSound).toHaveBeenCalledTimes(1);
      expect(BrowserNotificationUtils.show).toHaveBeenCalledTimes(1);

      setJoinLobby('joined-lobby');
      ui.receiveLobbyUpdate(ffaQueue(true) as any, NOW);
      setJoinLobby('');
      ui.receiveLobbyUpdate(ffaQueue(true) as any, NOW);

      expect(SoundUtils.playGameFoundSound).toHaveBeenCalledTimes(1);
      expect(BrowserNotificationUtils.show).toHaveBeenCalledTimes(1);
    });

    it('alerts again for a lobby that stops matching while a window is open and matches again after', () => {
      bigFfaSettings();
      ui = new LobbyDiscoveryUI();
      ui.receiveLobbyUpdate(ffaQueue(true) as any, NOW);

      setJoinLobby('joined-lobby');
      ui.receiveLobbyUpdate(ffaQueue(false) as any, NOW);
      setJoinLobby('');
      ui.receiveLobbyUpdate(ffaQueue(true) as any, NOW);

      expect(SoundUtils.playGameFoundSound).toHaveBeenCalledTimes(2);
    });

    it('shows the badge of an earlier alert again when the window closes', () => {
      bigFfaSettings();
      ui = new LobbyDiscoveryUI();
      ui.receiveLobbyUpdate(ffaQueue(true) as any, NOW);

      setJoinLobby('joined-lobby');
      ui.receiveLobbyUpdate(ffaQueue(true) as any, NOW);
      expect(card('ffa-4')?.querySelector('.of-board-new')).toBeNull();

      setJoinLobby('');
      ui.receiveLobbyUpdate(ffaQueue(true) as any, NOW);
      expect(card('ffa-4')?.querySelector('.of-board-new')).toBeTruthy();
    });
  });

  describe('filter change', () => {
    const card = (gameID: string): HTMLElement | null =>
      document.querySelector(`.of-board-card[data-game-id="${gameID}"]`);

    it('drops the badge of a card that no longer matches', () => {
      bigFfaSettings();
      ui = new LobbyDiscoveryUI();
      ui.receiveLobbyUpdate(ffaQueue(true) as any, NOW);
      expect(card('ffa-4')?.querySelector('.of-board-new')).toBeTruthy();

      // One click makes Compact a required Modifier. The lobby is not compact.
      (document.getElementById('modifier-isCompact') as HTMLButtonElement).click();

      expect(card('ffa-4')?.querySelector('.of-board-new')).toBeNull();
    });

    it('keeps the badge of a card that still matches', () => {
      bigFfaSettings();
      ui = new LobbyDiscoveryUI();
      ui.receiveLobbyUpdate(ffaQueue(true) as any, NOW);

      // Two clicks block Asia. The lobby is on Europe, so it still matches.
      const asia = document.querySelector('[data-game-map="Asia"]') as HTMLButtonElement;
      asia.click();
      asia.click();
      expect(asia.dataset.state).toBe('blocked');

      expect(card('ffa-4')?.querySelector('.of-board-new')).toBeTruthy();
    });
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
