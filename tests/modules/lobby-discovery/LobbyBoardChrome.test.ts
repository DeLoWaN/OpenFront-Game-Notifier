import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LobbyDiscoveryUI } from '@/modules/lobby-discovery/LobbyDiscoveryUI';
import { STORAGE_KEYS } from '@/config/constants';
import { LobbyUtils } from '@/utils/LobbyUtils';
import { BrowserNotificationUtils } from '@/utils/BrowserNotificationUtils';

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

const HOMEPAGE_HTML = `
  <div id="page-column" style="overflow-x: clip">
    <div id="page-play">
      <game-mode-selector>
        <div id="lobby-grid" class="flex flex-col gap-4 w-full sm:grid sm:grid-cols-[2fr_1fr] sm:grid-rows-[auto_min(24rem,40vh)_auto_auto]">
          <div id="solo-row" class="grid grid-cols-3 gap-4 h-14 sm:col-span-2 sm:row-start-4"><button>Solo</button></div>
          <div id="ffa-cell" class="min-w-0 sm:col-start-1 sm:row-start-2"><button id="ffa-card" class="group @container relative block">ffa</button></div>
          <section id="side-section" class="flex flex-col gap-4 min-w-0 sm:grid sm:row-start-2 sm:col-start-2">
            <div class="min-w-0 sm:row-start-3"><button id="team-card" class="group @container relative block">team</button></div>
            <h2 class="min-w-0 sm:row-start-1"><button id="see-all" class="group/upcoming flex w-full">See all</button></h2>
          </section>
        </div>
      </game-mode-selector>
    </div>
    <join-lobby-modal></join-lobby-modal>
    <host-lobby-modal></host-lobby-modal>
  </div>
`;

function mountHomepage(): void {
  document.body.innerHTML = HOMEPAGE_HTML;
  (document.querySelector('join-lobby-modal') as any).currentLobbyId = '';
}

function ffa(gameID: string, config: Record<string, unknown> = {}) {
  return {
    gameID,
    publicGameType: 'ffa',
    numClients: 3,
    gameConfig: { gameMode: 'Free For All', gameMap: 'Europe', maxPlayers: 40, ...config },
  };
}

describe('Lobby Board sidebar and header', () => {
  let store: Map<string, any>;
  let ui: LobbyDiscoveryUI | null;

  const sidebar = () => document.querySelector('.of-board-sidebar') as HTMLElement | null;
  const sidebarToggle = () => document.getElementById('of-board-sidebar-toggle') as HTMLButtonElement;
  const sidebarBody = () => document.querySelector('.of-board-sidebar-body') as HTMLElement;
  const head = () => document.querySelector('.of-board-head') as HTMLElement;
  const panel = () => document.getElementById('openfront-discovery-panel');
  const card = () => document.querySelector('.of-board-card') as HTMLElement | null;

  const saved = () => store.get(STORAGE_KEYS.lobbyDiscoverySettings);
  const ffaCriterion = { gameMode: 'FFA', teamCount: null, minPlayers: null, maxPlayers: null };

  function seedSettings(extra: Record<string, unknown> = {}): void {
    store.set(STORAGE_KEYS.lobbyDiscoverySettings, {
      criteria: [ffaCriterion],
      discoveryEnabled: true,
      soundEnabled: true,
      desktopNotificationsEnabled: false,
      isTeamTwoTimesMinEnabled: false,
      ...extra,
    });
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
    vi.mocked(LobbyUtils.isOnLobbyPage).mockReturnValue(true);
    vi.mocked(BrowserNotificationUtils.ensurePermission).mockResolvedValue(true);
  });

  afterEach(() => {
    ui?.cleanup();
    ui = null;
    vi.clearAllTimers();
    vi.useRealTimers();
    document.body.innerHTML = '';
    vi.clearAllMocks();
  });

  describe('sidebar', () => {
    it('mounts the filter sections in a sidebar on the left of the cards', () => {
      ui = new LobbyDiscoveryUI();
      ui.receiveLobbyUpdate([ffa('ffa-0')] as any, NOW);

      expect(sidebar()).toBeTruthy();
      for (const id of [
        'discovery-ffa',
        'discovery-team',
        'discovery-modes-body',
        'discovery-modifiers-body',
        'discovery-maps-body',
        'discovery-reset',
        'discovery-filter-count',
      ]) {
        expect(sidebar()!.querySelector(`[id="${id}"]`), id).toBeTruthy();
      }
      const grid = document.querySelector('.of-board-grid') as HTMLElement;
      expect(
        sidebar()!.compareDocumentPosition(grid) & Node.DOCUMENT_POSITION_FOLLOWING
      ).toBeTruthy();
    });

    it('updates the cards at once when a filter inside the sidebar changes', () => {
      seedSettings();
      ui = new LobbyDiscoveryUI();
      ui.receiveLobbyUpdate([ffa('ffa-0')] as any, NOW);
      expect(card()?.classList.contains('of-board-card-match')).toBe(true);

      (sidebar()!.querySelector('[id="modifier-isCompact"]') as HTMLButtonElement).click();

      expect(card()?.classList.contains('of-board-card-dim')).toBe(true);
    });

    it('is open by default', () => {
      ui = new LobbyDiscoveryUI();
      ui.receiveLobbyUpdate([ffa('ffa-0')] as any, NOW);

      expect(sidebar()!.classList.contains('is-collapsed')).toBe(false);
      expect(sidebarBody().hidden).toBe(false);
      expect(sidebarToggle().getAttribute('aria-expanded')).toBe('true');
    });

    it('collapses to a rail with a summary of the filters and stores the choice', () => {
      seedSettings();
      ui = new LobbyDiscoveryUI();
      ui.receiveLobbyUpdate([ffa('ffa-0')] as any, NOW);

      sidebarToggle().click();

      expect(sidebar()!.classList.contains('is-collapsed')).toBe(true);
      expect(sidebarBody().hidden).toBe(true);
      expect(sidebarToggle().getAttribute('aria-expanded')).toBe('false');
      const summary = sidebar()!.querySelector('.of-board-sidebar-summary') as HTMLElement;
      expect(summary.hidden).toBe(false);
      expect(summary.textContent).toBe('FFA');
      expect(store.get(STORAGE_KEYS.lobbyBoardSidebarCollapsed)).toBe(true);
    });

    it('keeps the rail summary in step with the filters', () => {
      seedSettings();
      ui = new LobbyDiscoveryUI();
      ui.receiveLobbyUpdate([ffa('ffa-0')] as any, NOW);
      sidebarToggle().click();

      (sidebar()!.querySelector('[id="modifier-isCompact"]') as HTMLButtonElement).click();

      expect(sidebar()!.querySelector('.of-board-sidebar-summary')?.textContent).toBe(
        'FFA · 1 modifier'
      );
    });

    it('opens again from the rail', () => {
      ui = new LobbyDiscoveryUI();
      ui.receiveLobbyUpdate([ffa('ffa-0')] as any, NOW);
      sidebarToggle().click();

      sidebarToggle().click();

      expect(sidebar()!.classList.contains('is-collapsed')).toBe(false);
      expect(sidebarBody().hidden).toBe(false);
      expect(store.get(STORAGE_KEYS.lobbyBoardSidebarCollapsed)).toBe(false);
    });

    it('stays collapsed after a page reload', () => {
      ui = new LobbyDiscoveryUI();
      ui.receiveLobbyUpdate([ffa('ffa-0')] as any, NOW);
      sidebarToggle().click();
      ui.cleanup();
      mountHomepage();

      ui = new LobbyDiscoveryUI();
      ui.receiveLobbyUpdate([ffa('ffa-0')] as any, NOW);

      expect(sidebar()!.classList.contains('is-collapsed')).toBe(true);
      expect(sidebarBody().hidden).toBe(true);
    });

    it('keeps the filters and the collapsed state when OpenFront renders its page again', () => {
      ui = new LobbyDiscoveryUI();
      ui.receiveLobbyUpdate([ffa('ffa-0')] as any, NOW);
      sidebarToggle().click();
      (sidebar()!.querySelector('[data-game-map="Asia"]') as HTMLButtonElement).click();

      // Lit replaces the page grid, so the board is built again.
      document.getElementById('page-play')!.innerHTML = `<game-mode-selector>${
        HOMEPAGE_HTML.match(/<game-mode-selector>([\s\S]*)<\/game-mode-selector>/)![1]
      }</game-mode-selector>`;
      ui.receiveLobbyUpdate([ffa('ffa-0')] as any, NOW);

      expect(document.querySelectorAll('.of-board-sidebar')).toHaveLength(1);
      expect(sidebar()!.classList.contains('is-collapsed')).toBe(true);
      expect(sidebar()!.querySelector('[id="discovery-ffa"]')).toBeTruthy();
      expect(
        (sidebar()!.querySelector('[data-game-map="Asia"]') as HTMLButtonElement).dataset.state
      ).toBe('required');
      expect(head().querySelector('[id="discovery-sound-toggle"]')).toBeTruthy();
    });
  });

  describe('header controls', () => {
    it('holds the discovery status, the search timer, the sound toggle and the desktop toggle', () => {
      seedSettings();
      ui = new LobbyDiscoveryUI();
      ui.receiveLobbyUpdate([ffa('ffa-0')] as any, NOW);

      for (const id of [
        'discovery-status',
        'discovery-search-timer',
        'discovery-sound-toggle',
        'discovery-desktop-toggle',
      ]) {
        expect(head().querySelector(`[id="${id}"]`), id).toBeTruthy();
      }
      expect(head().querySelector('strong')?.textContent).toBe('Discovery active');
    });

    it('shows how long the search has run', () => {
      seedSettings();
      ui = new LobbyDiscoveryUI();
      ui.receiveLobbyUpdate([ffa('ffa-0', { gameMap: 'Asia' })] as any, NOW);
      // A Criterion that nothing matches keeps the search running.
      (sidebar()!.querySelector('[id="modifier-isCompact"]') as HTMLButtonElement).click();
      vi.advanceTimersByTime(65_000);

      expect(head().querySelector('[id="discovery-search-timer"]')?.textContent).toBe(
        'searching · 1m 5s'
      );
    });

    it('pauses and resumes discovery from the status, and stores the choice', () => {
      seedSettings();
      ui = new LobbyDiscoveryUI();
      ui.receiveLobbyUpdate([ffa('ffa-0')] as any, NOW);
      const status = head().querySelector('[id="discovery-status"]') as HTMLElement;

      status.click();
      expect(head().querySelector('strong')?.textContent).toBe('Discovery paused');
      expect(saved().discoveryEnabled).toBe(false);
      // A paused search greys no card.
      expect(card()?.classList.contains('of-board-card-match')).toBe(false);

      status.click();
      expect(head().querySelector('strong')?.textContent).toBe('Discovery active');
      expect(saved().discoveryEnabled).toBe(true);
      expect(card()?.classList.contains('of-board-card-match')).toBe(true);
    });

    it('turns the sound alert on and off and stores the choice', () => {
      seedSettings({ soundEnabled: false });
      ui = new LobbyDiscoveryUI();
      ui.receiveLobbyUpdate([ffa('ffa-0')] as any, NOW);
      const sound = head().querySelector('[id="discovery-sound-toggle"]') as HTMLInputElement;
      expect(sound.checked).toBe(false);

      sound.checked = true;
      sound.dispatchEvent(new Event('change'));

      expect(saved().soundEnabled).toBe(true);
      expect(ui.isSoundEnabled()).toBe(true);
      expect(sound.closest('.ld-icon-btn')?.classList.contains('is-on')).toBe(true);
    });

    it('asks for the notification permission before it turns desktop notifications on', async () => {
      seedSettings();
      ui = new LobbyDiscoveryUI();
      ui.receiveLobbyUpdate([ffa('ffa-0')] as any, NOW);
      const desktop = head().querySelector('[id="discovery-desktop-toggle"]') as HTMLInputElement;

      desktop.checked = true;
      desktop.dispatchEvent(new Event('change'));

      await vi.waitFor(() => expect(saved().desktopNotificationsEnabled).toBe(true));
      expect(BrowserNotificationUtils.ensurePermission).toHaveBeenCalledTimes(1);
      expect(desktop.checked).toBe(true);
    });

    it('turns the desktop toggle back off when the permission is denied', async () => {
      seedSettings();
      vi.mocked(BrowserNotificationUtils.ensurePermission).mockResolvedValue(false);
      ui = new LobbyDiscoveryUI();
      ui.receiveLobbyUpdate([ffa('ffa-0')] as any, NOW);
      const desktop = head().querySelector('[id="discovery-desktop-toggle"]') as HTMLInputElement;

      desktop.checked = true;
      desktop.dispatchEvent(new Event('change'));

      await vi.waitFor(() => expect(desktop.checked).toBe(false));
      expect(saved().desktopNotificationsEnabled).toBe(false);
    });

    it('restores the toggles from the saved settings', () => {
      seedSettings({ soundEnabled: false, desktopNotificationsEnabled: true });
      ui = new LobbyDiscoveryUI();
      ui.receiveLobbyUpdate([ffa('ffa-0')] as any, NOW);

      expect(
        (head().querySelector('[id="discovery-sound-toggle"]') as HTMLInputElement).checked
      ).toBe(false);
      expect(
        (head().querySelector('[id="discovery-desktop-toggle"]') as HTMLInputElement).checked
      ).toBe(true);
    });
  });

  describe('floating panel', () => {
    it('is absent while the Lobby Board shows', () => {
      ui = new LobbyDiscoveryUI();
      ui.receiveLobbyUpdate([ffa('ffa-0')] as any, NOW);

      expect(document.getElementById('of-lobby-board')?.style.display).not.toBe('none');
      expect(panel()).toBeNull();
      // The sections live in the sidebar, never twice on the page.
      expect(document.querySelectorAll('[id="discovery-ffa"]')).toHaveLength(1);
    });

    it('is absent off the lobby page too', () => {
      vi.mocked(LobbyUtils.isOnLobbyPage).mockReturnValue(false);
      ui = new LobbyDiscoveryUI();

      expect(panel()).toBeNull();
    });

    it('takes over the filters and the controls when the board cannot show', () => {
      document.body.innerHTML = '';
      ui = new LobbyDiscoveryUI();

      expect(panel()).toBeTruthy();
      expect(panel()!.style.width).toBe('380px');
      expect(panel()!.querySelector('[id="discovery-ffa"]')).toBeTruthy();
      expect(panel()!.querySelector('[id="discovery-sound-toggle"]')).toBeTruthy();
      expect(document.querySelectorAll('[id="discovery-ffa"]')).toHaveLength(1);
    });

    it('gives the filters and the controls to the board as soon as the board can show', () => {
      document.body.innerHTML = '';
      ui = new LobbyDiscoveryUI();
      expect(panel()).toBeTruthy();

      mountHomepage();
      ui.receiveLobbyUpdate([ffa('ffa-0')] as any, NOW);

      expect(panel()).toBeNull();
      expect(sidebar()!.querySelector('[id="discovery-ffa"]')).toBeTruthy();
      expect(head().querySelector('[id="discovery-sound-toggle"]')).toBeTruthy();
      expect(document.querySelectorAll('[id="discovery-ffa"]')).toHaveLength(1);
    });

    it('removes the panel on cleanup', () => {
      document.body.innerHTML = '';
      ui = new LobbyDiscoveryUI();
      ui.cleanup();
      ui = null;

      expect(panel()).toBeNull();
    });
  });
});
