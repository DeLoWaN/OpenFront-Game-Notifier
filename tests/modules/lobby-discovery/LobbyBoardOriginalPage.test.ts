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

/**
 * The home page of OpenFront: a column that clips its overflow, the grid of
 * game-mode-selector, and the See All View with one card per lobby slot.
 */
function mountHomepage(): void {
  document.body.innerHTML = `
    <div id="page-column" style="overflow-x: clip">
      <div id="page-play">
        <game-mode-selector>
          <div id="lobby-grid" class="flex flex-col gap-4 w-full sm:grid sm:grid-cols-[2fr_1fr] sm:grid-rows-[auto_min(24rem,40vh)_auto_auto]">
            <div id="solo-row" class="grid grid-cols-3 gap-4 h-14 sm:col-span-2 sm:row-start-4"><button>Solo</button></div>
            <div id="ffa-cell" class="min-w-0 sm:col-start-1 sm:row-start-2"><button id="ffa-card" class="group @container relative block">ffa</button></div>
            <section id="side-section" class="flex flex-col gap-4 min-w-0 sm:grid sm:row-start-2 sm:col-start-2">
              <div class="min-w-0 sm:row-start-3"><button id="team-card" class="group @container relative block">team</button></div>
              <div class="min-w-0 sm:row-start-2"><button id="special-card" class="group @container relative block">special</button></div>
              <h2 class="min-w-0 sm:row-start-1"><button id="see-all" class="group/upcoming flex w-full">See all</button></h2>
            </section>
          </div>
        </game-mode-selector>
      </div>
      <detailed-view-modal id="page-detailed-view" class="hidden">
        <div data-lobby-slot="ffa-0"></div>
        <div data-lobby-slot="ffa-3"></div>
      </detailed-view-modal>
      <join-lobby-modal></join-lobby-modal>
      <host-lobby-modal></host-lobby-modal>
    </div>
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

describe('Original page switch', () => {
  let store: Map<string, any>;
  let ui: LobbyDiscoveryUI | null;

  const board = () => document.getElementById('of-lobby-board');
  const panel = () => document.getElementById('openfront-discovery-panel');
  const pageColumn = () => document.getElementById('page-column') as HTMLElement;
  const ffaCell = () => document.getElementById('ffa-cell') as HTMLElement;
  const sideSection = () => document.getElementById('side-section') as HTMLElement;
  const boardVisible = () => !!board() && board()!.style.display !== 'none';
  const switchIn = (root: Element | null) =>
    root?.querySelector('[id="discovery-original-toggle"]') as HTMLInputElement | null;
  const boardHead = () => board()!.querySelector('.of-board-head');
  const ffaPulsing = () =>
    document.getElementById('ffa-card')!.classList.contains('of-discovery-card-active');
  const seeAllPulsing = () =>
    document.getElementById('see-all')!.classList.contains('of-discovery-card-active');
  const slotHighlighted = (id: string) =>
    document
      .querySelector(`[data-lobby-slot="${id}"]`)!
      .classList.contains('of-discovery-see-all-match');

  function bigFfaSettings(): void {
    store.set(STORAGE_KEYS.lobbyDiscoverySettings, {
      criteria: [{ gameMode: 'FFA', teamCount: null, minPlayers: 30, maxPlayers: null }],
      discoveryEnabled: true,
      soundEnabled: true,
      desktopNotificationsEnabled: true,
      isTeamTwoTimesMinEnabled: false,
    });
  }

  /** The Live Lobby (ffa-0) and a lobby at Queue Position 3 (ffa-3) both match. */
  const matchingFeed = (): any[] => [
    ffa('ffa-0', 40),
    ffa('ffa-1', 20),
    ffa('ffa-2', 20),
    ffa('ffa-3', 40),
  ];

  function start(): LobbyDiscoveryUI {
    ui = new LobbyDiscoveryUI();
    return ui;
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

  describe('the switch', () => {
    it('shows the Lobby Board by default, with the switch in its header and no floating panel', () => {
      start().receiveLobbyUpdate(matchingFeed(), NOW);

      expect(boardVisible()).toBe(true);
      expect(switchIn(boardHead())?.checked).toBe(false);
      expect(panel()).toBeNull();
    });

    it('hides the board, restores the lobby cells and the column clipping, and shows the floating panel', () => {
      start().receiveLobbyUpdate(matchingFeed(), NOW);
      expect(ffaCell().style.display).toBe('none');
      expect(sideSection().style.display).toBe('none');
      expect(pageColumn().style.overflowX).toBe('visible');

      switchIn(boardHead())!.click();

      expect(boardVisible()).toBe(false);
      expect(ffaCell().style.display).toBe('');
      expect(sideSection().style.display).toBe('');
      expect(pageColumn().style.overflowX).toBe('clip');
      expect(panel()).toBeTruthy();
      // The filter component and the switch live in the floating panel.
      expect(panel()!.querySelector('[id="discovery-hosted-toggle"]')).toBeTruthy();
      expect(switchIn(panel())?.checked).toBe(true);
    });

    it('returns to the board from the switch in the floating panel', () => {
      store.set(STORAGE_KEYS.lobbyBoardMode, 'original');
      start().receiveLobbyUpdate(matchingFeed(), NOW);
      expect(boardVisible()).toBe(false);
      expect(panel()).toBeTruthy();

      switchIn(panel())!.click();

      expect(boardVisible()).toBe(true);
      expect(ffaCell().style.display).toBe('none');
      expect(pageColumn().style.overflowX).toBe('visible');
      expect(panel()).toBeNull();
      expect(board()!.querySelector('[id="discovery-hosted-toggle"]')).toBeTruthy();
      expect(switchIn(boardHead())?.checked).toBe(false);
    });

    it('saves the mode and restores it after a reload', () => {
      start().receiveLobbyUpdate(matchingFeed(), NOW);
      switchIn(boardHead())!.click();
      expect(store.get(STORAGE_KEYS.lobbyBoardMode)).toBe('original');

      ui!.cleanup();
      mountHomepage();
      start().receiveLobbyUpdate(matchingFeed(), NOW);

      expect(boardVisible()).toBe(false);
      expect(ffaCell().style.display).toBe('');
      expect(panel()).toBeTruthy();
      expect(switchIn(panel())?.checked).toBe(true);

      switchIn(panel())!.click();
      expect(store.get(STORAGE_KEYS.lobbyBoardMode)).toBe('board');
    });

    it('falls back to the Lobby Board when the saved mode is unknown', () => {
      store.set(STORAGE_KEYS.lobbyBoardMode, 'something-else');
      start().receiveLobbyUpdate(matchingFeed(), NOW);

      expect(boardVisible()).toBe(true);
    });
  });

  describe('highlighting', () => {
    it('pulses the queue card and "See all" and highlights the See All View card in original page mode', () => {
      bigFfaSettings();
      store.set(STORAGE_KEYS.lobbyBoardMode, 'original');
      start().receiveLobbyUpdate(matchingFeed(), NOW);

      expect(ffaPulsing()).toBe(true);
      expect(seeAllPulsing()).toBe(true);
      expect(slotHighlighted('ffa-0')).toBe(true);
      expect(slotHighlighted('ffa-3')).toBe(true);
    });

    it('does not pulse or highlight anything in Lobby Board mode', () => {
      bigFfaSettings();
      start().receiveLobbyUpdate(matchingFeed(), NOW);
      vi.advanceTimersByTime(50);

      expect(boardVisible()).toBe(true);
      expect(ffaPulsing()).toBe(false);
      expect(seeAllPulsing()).toBe(false);
      expect(slotHighlighted('ffa-0')).toBe(false);
      expect(slotHighlighted('ffa-3')).toBe(false);
    });

    it('starts the highlighting when the switch turns on, and stops it when the switch turns off', () => {
      bigFfaSettings();
      start().receiveLobbyUpdate(matchingFeed(), NOW);
      expect(ffaPulsing()).toBe(false);

      switchIn(boardHead())!.click();
      expect(ffaPulsing()).toBe(true);
      expect(seeAllPulsing()).toBe(true);
      expect(slotHighlighted('ffa-3')).toBe(true);

      switchIn(panel())!.click();
      vi.advanceTimersByTime(50);
      expect(ffaPulsing()).toBe(false);
      expect(seeAllPulsing()).toBe(false);
      expect(slotHighlighted('ffa-3')).toBe(false);
    });
  });

  describe('desktop notification click', () => {
    it('opens the See All View for a lobby that the home page does not show, in original page mode', () => {
      bigFfaSettings();
      store.set(STORAGE_KEYS.lobbyBoardMode, 'original');
      const showPage = vi.fn();
      (window as any).showPage = showPage;
      try {
        start().receiveLobbyUpdate(matchingFeed(), NOW);
        const fourth = vi
          .mocked(BrowserNotificationUtils.show)
          .mock.calls.find(([options]) => options.tag?.includes('ffa-3'))!;
        expect(showPage).not.toHaveBeenCalled();

        fourth[0].onClick?.();

        expect(showPage).toHaveBeenCalledWith('page-detailed-view');
      } finally {
        delete (window as any).showPage;
      }
    });
  });

  describe('alerts follow the same rules in both modes', () => {
    for (const mode of ['board', 'original'] as const) {
      it(`plays one sound and sends one desktop notification per new match in ${mode} mode, and again after a lobby stops matching`, () => {
        bigFfaSettings();
        store.set(STORAGE_KEYS.lobbyBoardMode, mode);
        start().receiveLobbyUpdate(matchingFeed(), NOW);

        expect(SoundUtils.playGameFoundSound).toHaveBeenCalledTimes(1);
        expect(BrowserNotificationUtils.show).toHaveBeenCalledTimes(2);

        // A repeated update is silent.
        ui!.receiveLobbyUpdate(matchingFeed(), NOW);
        expect(SoundUtils.playGameFoundSound).toHaveBeenCalledTimes(1);
        expect(BrowserNotificationUtils.show).toHaveBeenCalledTimes(2);

        // The Queue Position 3 lobby stops matching, then matches again.
        ui!.receiveLobbyUpdate(
          [ffa('ffa-0', 40), ffa('ffa-1', 20), ffa('ffa-2', 20), ffa('ffa-3', 20)] as any,
          NOW
        );
        expect(SoundUtils.playGameFoundSound).toHaveBeenCalledTimes(1);
        ui!.receiveLobbyUpdate(matchingFeed(), NOW);
        expect(SoundUtils.playGameFoundSound).toHaveBeenCalledTimes(2);
        expect(BrowserNotificationUtils.show).toHaveBeenCalledTimes(3);
      });
    }

    it('keeps the alerts silent while discovery is paused, in both modes', () => {
      bigFfaSettings();
      store.set(STORAGE_KEYS.lobbyDiscoverySettings, {
        ...store.get(STORAGE_KEYS.lobbyDiscoverySettings),
        discoveryEnabled: false,
      });
      start().receiveLobbyUpdate(matchingFeed(), NOW);
      switchIn(boardHead())!.click();
      ui!.receiveLobbyUpdate(matchingFeed(), NOW);

      expect(SoundUtils.playGameFoundSound).not.toHaveBeenCalled();
      expect(BrowserNotificationUtils.show).not.toHaveBeenCalled();
    });

    it('does not alert a second time for a match the player already heard when the mode changes', () => {
      bigFfaSettings();
      start().receiveLobbyUpdate(matchingFeed(), NOW);
      expect(SoundUtils.playGameFoundSound).toHaveBeenCalledTimes(1);

      switchIn(boardHead())!.click();
      switchIn(panel())!.click();

      expect(SoundUtils.playGameFoundSound).toHaveBeenCalledTimes(1);
      expect(BrowserNotificationUtils.show).toHaveBeenCalledTimes(2);
    });
  });

  describe('gating', () => {
    it('shows neither the board nor the panel nor any highlight off the lobby page, in original page mode', () => {
      bigFfaSettings();
      store.set(STORAGE_KEYS.lobbyBoardMode, 'original');
      vi.mocked(LobbyUtils.isOnLobbyPage).mockReturnValue(false);
      start().receiveLobbyUpdate(matchingFeed(), NOW);

      expect(boardVisible()).toBe(false);
      expect(panel()).toBeNull();
      expect(ffaPulsing()).toBe(false);
    });
  });
});
