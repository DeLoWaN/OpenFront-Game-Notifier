import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LobbyDiscoveryUI } from '@/modules/lobby-discovery/LobbyDiscoveryUI';
import { STORAGE_KEYS } from '@/config/constants';
import { SoundUtils } from '@/utils/SoundUtils';
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

/**
 * Mirrors the home page grid of OpenFront's game-mode-selector: the FFA card in
 * the hero cell, then a section holding the Team card, the Special card and the
 * "See all" heading. Lit renders nothing for an absent Queue.
 */
function homepageGridHtml(queues: Array<'ffa' | 'team' | 'special'>): string {
  const card = (queue: string, rowClass: string) =>
    `<div class="min-w-0 sm:min-h-0 ${rowClass}"><button id="${queue}-card" class="group @container relative block">${queue}</button></div>`;
  return `
    <div class="flex flex-col gap-4 w-full sm:grid sm:grid-cols-[2fr_1fr] sm:grid-rows-[auto_min(24rem,40vh)_auto_auto]">
      <div class="grid grid-cols-3 gap-4 h-14 sm:col-span-2 sm:row-start-4"><button>Solo</button></div>
      ${queues.includes('ffa') ? '<div class="min-w-0 sm:col-start-1 sm:row-start-2"><button id="ffa-card" class="group @container relative block">ffa</button></div>' : ''}
      <section class="flex flex-col gap-4 min-w-0 sm:grid sm:grid-rows-[auto_1fr_1fr] sm:row-start-2 sm:col-start-2">
        ${queues.includes('team') ? card('team', 'sm:row-start-3') : ''}
        ${queues.includes('special') ? card('special', 'sm:row-start-2') : ''}
        <h2 class="min-w-0 sm:row-start-1"><button id="see-all" class="group/upcoming flex w-full">Upcoming See all 9</button></h2>
      </section>
    </div>
  `;
}

describe('LobbyDiscoveryUI', () => {
  let store: Map<string, any>;
  let ui: LobbyDiscoveryUI | null;

  /**
   * Sets up the home page with the FFA, Team and Special cards, and sets
   * `selector.lobbies` so the card lookup knows which Queues are present.
   */
  function mountHomepageCards(joined = false): void {
    document.body.innerHTML = `
      <div id="page-play">
        <game-mode-selector>
          ${homepageGridHtml(['ffa', 'team', 'special'])}
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

    const joinLobbyModal = document.querySelector('join-lobby-modal') as any;
    joinLobbyModal.currentLobbyId = joined ? 'joined-lobby' : '';
  }

  beforeEach(() => {
    vi.useFakeTimers();
    store = new Map();
    ui = null;

    (globalThis as any).GM_getValue = vi.fn((key: string, defaultValue?: unknown) => {
      return store.has(key) ? store.get(key) : defaultValue;
    });
    (globalThis as any).GM_setValue = vi.fn((key: string, value: unknown) => {
      store.set(key, value);
    });

    mountHomepageCards();
    vi.clearAllMocks();
    vi.mocked(BrowserNotificationUtils.isSupported).mockReturnValue(true);
    vi.mocked(BrowserNotificationUtils.isBackgrounded).mockReturnValue(true);
    vi.mocked(BrowserNotificationUtils.ensurePermission).mockResolvedValue(true);
    vi.mocked(BrowserNotificationUtils.show).mockReturnValue(true);
  });

  afterEach(() => {
    if (ui) {
      ui.cleanup();
      ui = null;
    }
    vi.clearAllTimers();
    vi.useRealTimers();
    document.body.innerHTML = '';
    delete (window as any).BOOTSTRAP_CONFIG;
    delete (globalThis as any).__ASSET_MANIFEST__;
    delete (globalThis as any).__CDN_BASE__;
  });

  it('keeps matching cards in one animated active state and deduplicates sound across repeated updates', () => {
    store.set(STORAGE_KEYS.lobbyDiscoverySettings, {
      criteria: [
        { gameMode: 'FFA', teamCount: null, minPlayers: null, maxPlayers: null },
        { gameMode: 'Team', teamCount: null, minPlayers: null, maxPlayers: null },
      ],
      discoveryEnabled: true,
      soundEnabled: true,
      isTeamTwoTimesMinEnabled: false,
    });

    ui = new LobbyDiscoveryUI();

    const lobbies = [
      {
        gameID: 'ffa-101',
        publicGameType: 'ffa',
        gameConfig: {
          gameMode: 'Free For All',
          maxPlayers: 25,
        },
      },
      {
        gameID: 'team-101',
        publicGameType: 'team',
        gameConfig: {
          gameMode: 'Team',
          teamCount: 2,
          maxClients: 10,
        },
      },
    ] as any;

    ui.receiveLobbyUpdate(lobbies);

    expect(document.querySelectorAll('.game-found-notification')).toHaveLength(0);
    expect(document.getElementById('ffa-card')?.classList.contains('of-discovery-card-active')).toBe(true);
    expect(document.getElementById('team-card')?.classList.contains('of-discovery-card-active')).toBe(true);
    expect(document.getElementById('special-card')?.classList.contains('of-discovery-card-active')).toBe(false);
    expect(document.querySelectorAll('.of-discovery-card-badge')).toHaveLength(0);
    expect(SoundUtils.playGameFoundSound).toHaveBeenCalledTimes(1);

    expect(document.getElementById('ffa-card')?.classList.contains('of-discovery-card-active')).toBe(
      true
    );
    expect(document.getElementById('team-card')?.classList.contains('of-discovery-card-active')).toBe(
      true
    );

    ui.receiveLobbyUpdate(lobbies);

    expect(SoundUtils.playGameFoundSound).toHaveBeenCalledTimes(1);
  });

  it('suppresses pulse and sound completely while already joined in a public lobby', () => {
    mountHomepageCards(true);
    store.set(STORAGE_KEYS.lobbyDiscoverySettings, {
      criteria: [{ gameMode: 'Team', teamCount: null, minPlayers: null, maxPlayers: null }],
      discoveryEnabled: true,
      soundEnabled: true,
      isTeamTwoTimesMinEnabled: false,
    });

    ui = new LobbyDiscoveryUI();

    const lobbies = [
      {
        gameID: 'team-202',
        publicGameType: 'team',
        gameConfig: {
          gameMode: 'Team',
          teamCount: 3,
          maxClients: 12,
        },
      },
    ] as any;

    ui.receiveLobbyUpdate(lobbies);

    expect(document.querySelectorAll('.game-found-notification')).toHaveLength(0);
    expect(document.querySelector('.of-discovery-card-active')).toBeFalsy();
    expect(SoundUtils.playGameFoundSound).not.toHaveBeenCalled();
  });

  it('resumes pulsing once the joined public lobby state is cleared', () => {
    mountHomepageCards(true);
    store.set(STORAGE_KEYS.lobbyDiscoverySettings, {
      criteria: [{ gameMode: 'FFA', teamCount: null, minPlayers: null, maxPlayers: null }],
      discoveryEnabled: true,
      soundEnabled: true,
      isTeamTwoTimesMinEnabled: false,
    });

    ui = new LobbyDiscoveryUI();

    const lobbies = [
      {
        gameID: 'ffa-303',
        publicGameType: 'ffa',
        gameConfig: {
          gameMode: 'Free For All',
          maxPlayers: 25,
        },
      },
    ] as any;

    ui.receiveLobbyUpdate(lobbies);
    expect(document.querySelector('.of-discovery-card-active')).toBeFalsy();

    const joinLobbyModal = document.querySelector('join-lobby-modal') as any;
    joinLobbyModal.currentLobbyId = '';

    ui.receiveLobbyUpdate(lobbies);

    expect(document.getElementById('ffa-card')?.classList.contains('of-discovery-card-active')).toBe(
      true
    );
    expect(SoundUtils.playGameFoundSound).toHaveBeenCalledTimes(1);
  });

  it('reapplies pulses after homepage cards render after the lobby update event', () => {
    document.body.innerHTML = `
      <div id="page-play">
        <game-mode-selector></game-mode-selector>
      </div>
      <join-lobby-modal></join-lobby-modal>
      <host-lobby-modal></host-lobby-modal>
    `;
    const joinLobbyModal = document.querySelector('join-lobby-modal') as any;
    joinLobbyModal.currentLobbyId = '';

    store.set(STORAGE_KEYS.lobbyDiscoverySettings, {
      criteria: [{ gameMode: 'FFA', teamCount: null, minPlayers: null, maxPlayers: null }],
      discoveryEnabled: true,
      soundEnabled: true,
      isTeamTwoTimesMinEnabled: false,
    });

    ui = new LobbyDiscoveryUI();

    const lobbies = [
      {
        gameID: 'ffa-late',
        publicGameType: 'ffa',
        gameConfig: {
          gameMode: 'Free For All',
          maxPlayers: 25,
        },
      },
    ] as any;

    ui.receiveLobbyUpdate(lobbies);
    expect(document.querySelector('.of-discovery-card-active')).toBeFalsy();

    const selector = document.querySelector('game-mode-selector') as HTMLElement;
    selector.innerHTML = `
      ${homepageGridHtml(['ffa', 'team', 'special'])}
    `;

    vi.advanceTimersByTime(32);

    expect(document.getElementById('ffa-card')?.classList.contains('of-discovery-card-active')).toBe(
      true
    );
  });

  it('pulses on the real 0.30 homepage structure without requiring a public-lobby element', () => {
    mountHomepageCards(false);
    document.querySelector('public-lobby')?.remove();
    store.set(STORAGE_KEYS.lobbyDiscoverySettings, {
      criteria: [{ gameMode: 'FFA', teamCount: null, minPlayers: null, maxPlayers: null }],
      discoveryEnabled: true,
      soundEnabled: true,
      isTeamTwoTimesMinEnabled: false,
    });

    ui = new LobbyDiscoveryUI();

    ui.receiveLobbyUpdate([
      {
        gameID: 'ffa-real-homepage',
        publicGameType: 'ffa',
        numClients: 12,
        gameConfig: {
          gameMode: 'Free For All',
          maxPlayers: 25,
        },
      },
    ] as any);

    expect(document.getElementById('ffa-card')?.classList.contains('of-discovery-card-active')).toBe(
      true
    );
  });

  it('removes the animated active state when a queue stops matching', () => {
    store.set(STORAGE_KEYS.lobbyDiscoverySettings, {
      criteria: [{ gameMode: 'FFA', teamCount: null, minPlayers: null, maxPlayers: null }],
      discoveryEnabled: true,
      soundEnabled: true,
      isTeamTwoTimesMinEnabled: false,
    });

    ui = new LobbyDiscoveryUI();

    const matchingLobbies = [
      {
        gameID: 'ffa-404',
        publicGameType: 'ffa',
        gameConfig: {
          gameMode: 'Free For All',
          maxPlayers: 25,
        },
      },
    ] as any;

    ui.receiveLobbyUpdate(matchingLobbies);
    expect(document.getElementById('ffa-card')?.classList.contains('of-discovery-card-active')).toBe(
      true
    );

    ui.receiveLobbyUpdate([]);

    expect(document.getElementById('ffa-card')?.classList.contains('of-discovery-card-active')).toBe(
      false
    );
  });

  it('supports FFA capacity filters up to 125 slots', () => {
    store.set(STORAGE_KEYS.lobbyDiscoverySettings, {
      criteria: [],
      discoveryEnabled: true,
      soundEnabled: true,
      isTeamTwoTimesMinEnabled: false,
    });

    ui = new LobbyDiscoveryUI();

    const maxSlider = document.getElementById('discovery-ffa-max-slider') as HTMLInputElement;
    const maxInput = document.getElementById('discovery-ffa-max') as HTMLInputElement;

    expect(maxSlider.max).toBe('1000');
    expect(maxInput.max).toBe('125');
  });

  it('caps Team capacity filters to 62 players per team', () => {
    store.set(STORAGE_KEYS.lobbyDiscoverySettings, {
      criteria: [],
      discoveryEnabled: true,
      soundEnabled: true,
      isTeamTwoTimesMinEnabled: false,
    });

    ui = new LobbyDiscoveryUI();

    const maxSlider = document.getElementById('discovery-team-max-slider') as HTMLInputElement;
    const maxInput = document.getElementById('discovery-team-max') as HTMLInputElement;

    expect(maxSlider.max).toBe('1000');
    expect(maxInput.max).toBe('62');
  });

  it('locks team max slider to 2x min and disables it when the 2x toggle is enabled', () => {
    store.set(STORAGE_KEYS.lobbyDiscoverySettings, {
      criteria: [],
      discoveryEnabled: true,
      soundEnabled: true,
      isTeamTwoTimesMinEnabled: false,
    });

    ui = new LobbyDiscoveryUI();

    // Use number inputs (change events) to set min=8, max=20 since slider
    // positions are now 0..1000 and RangeSlider owns that mapping.
    const minInput = document.getElementById('discovery-team-min') as HTMLInputElement;
    const maxInput = document.getElementById('discovery-team-max') as HTMLInputElement;
    const maxSlider = document.getElementById('discovery-team-max-slider') as HTMLInputElement;
    const twoTimesCheckbox = document.getElementById('discovery-team-two-times') as HTMLInputElement;

    minInput.value = '8';
    minInput.dispatchEvent(new Event('change'));
    maxInput.value = '20';
    maxInput.dispatchEvent(new Event('change'));

    twoTimesCheckbox.checked = true;
    twoTimesCheckbox.dispatchEvent(new Event('change'));

    // 2×8 = 16. valueToPosition(16, stops) = 720 (between stop 15@idx7 and 20@idx8).
    expect(maxInput.value).toBe('16');
    expect(maxSlider.value).toBe('720');
    expect(maxSlider.disabled).toBe(true);
    expect(maxSlider.classList.contains('is-max-locked')).toBe(true);
  });

  it('keeps the locked max value when the 2x toggle is turned off (no rollback)', () => {
    store.set(STORAGE_KEYS.lobbyDiscoverySettings, {
      criteria: [],
      discoveryEnabled: true,
      soundEnabled: true,
      isTeamTwoTimesMinEnabled: false,
    });

    ui = new LobbyDiscoveryUI();

    // Use number inputs (change events) to set min=5, max=30 (nearest stop to 40)
    // since slider positions are now 0..1000 and RangeSlider owns that mapping.
    const minInput = document.getElementById('discovery-team-min') as HTMLInputElement;
    const maxInput = document.getElementById('discovery-team-max') as HTMLInputElement;
    const maxSlider = document.getElementById('discovery-team-max-slider') as HTMLInputElement;
    const twoTimes = document.getElementById('discovery-team-two-times') as HTMLInputElement;

    minInput.value = '5';
    minInput.dispatchEvent(new Event('change'));
    maxInput.value = '30';
    maxInput.dispatchEvent(new Event('change'));

    twoTimes.checked = true;
    twoTimes.dispatchEvent(new Event('change'));
    // 2×5 = 10. valueToPosition(10, stops) = 600 (stop at idx 6).
    expect(maxInput.value).toBe('10');
    expect(maxSlider.value).toBe('600');
    expect(maxSlider.disabled).toBe(true);

    twoTimes.checked = false;
    twoTimes.dispatchEvent(new Event('change'));
    expect(maxInput.value).toBe('10');
    expect(maxSlider.value).toBe('600');
    expect(maxSlider.disabled).toBe(false);
    expect(maxSlider.classList.contains('is-max-locked')).toBe(false);
  });

  it('renders without the old player-list discovery slot and exposes FFA and 2x controls', () => {
    store.set(STORAGE_KEYS.lobbyDiscoverySettings, {
      criteria: [],
      discoveryEnabled: true,
      soundEnabled: true,
      desktopNotificationsEnabled: false,
      isTeamTwoTimesMinEnabled: false,
    });

    ui = new LobbyDiscoveryUI();

    // The Lobby Board holds the controls, so the floating panel does not show.
    expect(document.getElementById('openfront-discovery-panel')).toBeNull();
    expect(document.querySelector('.of-board-sidebar #discovery-ffa')).toBeTruthy();
    expect(document.getElementById('discovery-ffa')).toBeTruthy();
    expect(document.getElementById('discovery-team-hvn')).toBeTruthy();
    expect(document.getElementById('discovery-team-two-times')).toBeTruthy();
    expect(document.getElementById('discovery-desktop-toggle')).toBeTruthy();
    expect(document.getElementById('discovery-modes-rail')).toBeFalsy();
  });

  it('restores and persists the desktop notification toggle independently from sound', () => {
    store.set(STORAGE_KEYS.lobbyDiscoverySettings, {
      criteria: [],
      discoveryEnabled: true,
      soundEnabled: false,
      desktopNotificationsEnabled: true,
      isTeamTwoTimesMinEnabled: false,
    });

    ui = new LobbyDiscoveryUI();

    const soundToggle = document.getElementById('discovery-sound-toggle') as HTMLInputElement;
    const desktopToggle = document.getElementById('discovery-desktop-toggle') as HTMLInputElement;

    expect(soundToggle.checked).toBe(false);
    expect(desktopToggle.checked).toBe(true);

    desktopToggle.checked = false;
    desktopToggle.dispatchEvent(new Event('change'));

    expect(store.get(STORAGE_KEYS.lobbyDiscoverySettings)).toEqual({
      criteria: [],
      discoveryEnabled: true,
      soundEnabled: false,
      desktopNotificationsEnabled: false,
      isTeamTwoTimesMinEnabled: false,
      notifyUpcomingEnabled: true,
      includeHostedAndCustomLobbies: true,
      mapFilter: {},
    });
  });

  it('requests permission when enabling desktop notifications and reverts on denial', async () => {
    store.set(STORAGE_KEYS.lobbyDiscoverySettings, {
      criteria: [],
      discoveryEnabled: true,
      soundEnabled: true,
      desktopNotificationsEnabled: false,
      isTeamTwoTimesMinEnabled: false,
    });
    vi.mocked(BrowserNotificationUtils.ensurePermission).mockResolvedValue(false);

    ui = new LobbyDiscoveryUI();

    const desktopToggle = document.getElementById('discovery-desktop-toggle') as HTMLInputElement;
    desktopToggle.checked = true;
    desktopToggle.dispatchEvent(new Event('change'));
    await vi.waitFor(() => {
      expect(BrowserNotificationUtils.ensurePermission).toHaveBeenCalledTimes(1);
      expect(store.get(STORAGE_KEYS.lobbyDiscoverySettings)).toEqual({
        criteria: [],
        discoveryEnabled: true,
        soundEnabled: true,
        desktopNotificationsEnabled: false,
        isTeamTwoTimesMinEnabled: false,
        notifyUpcomingEnabled: true,
        includeHostedAndCustomLobbies: true,
        mapFilter: {},
      });
    });

    ui.cleanup();
    ui = new LobbyDiscoveryUI();

    expect((document.getElementById('discovery-desktop-toggle') as HTMLInputElement).checked).toBe(
      false
    );
  });

  it('ignores stale permission results if the desktop toggle is turned off before resolve', async () => {
    store.set(STORAGE_KEYS.lobbyDiscoverySettings, {
      criteria: [],
      discoveryEnabled: true,
      soundEnabled: true,
      desktopNotificationsEnabled: false,
      isTeamTwoTimesMinEnabled: false,
    });

    let resolvePermission!: (value: boolean) => void;
    const permissionPromise = new Promise<boolean>((resolve) => {
      resolvePermission = resolve;
    });
    vi.mocked(BrowserNotificationUtils.ensurePermission).mockImplementation(() => permissionPromise);

    ui = new LobbyDiscoveryUI();

    const desktopToggle = document.getElementById('discovery-desktop-toggle') as HTMLInputElement;
    desktopToggle.checked = true;
    desktopToggle.dispatchEvent(new Event('change'));

    desktopToggle.checked = false;
    desktopToggle.dispatchEvent(new Event('change'));
    resolvePermission(true);

    await vi.waitFor(() => {
      expect(store.get(STORAGE_KEYS.lobbyDiscoverySettings)).toEqual({
        criteria: [],
        discoveryEnabled: true,
        soundEnabled: true,
        desktopNotificationsEnabled: false,
        isTeamTwoTimesMinEnabled: false,
        notifyUpcomingEnabled: true,
        includeHostedAndCustomLobbies: true,
        mapFilter: {},
      });
    });
    expect(desktopToggle.checked).toBe(false);
  });

  it('sends one browser notification for a new match and deduplicates repeated updates', () => {
    store.set(STORAGE_KEYS.lobbyDiscoverySettings, {
      criteria: [{ gameMode: 'FFA', teamCount: null, minPlayers: null, maxPlayers: null }],
      discoveryEnabled: true,
      soundEnabled: false,
      desktopNotificationsEnabled: true,
      isTeamTwoTimesMinEnabled: false,
    });

    ui = new LobbyDiscoveryUI();

    const lobbies = [
      {
        gameID: 'ffa-desktop-1',
        publicGameType: 'ffa',
        gameConfig: {
          gameMode: 'Free For All',
          maxPlayers: 25,
        },
      },
    ] as any;

    ui.receiveLobbyUpdate(lobbies);
    ui.receiveLobbyUpdate(lobbies);

    expect(BrowserNotificationUtils.show).toHaveBeenCalledTimes(1);
    const [notificationPayload] = vi.mocked(BrowserNotificationUtils.show).mock.calls[0] ?? [];
    expect(notificationPayload).toBeTruthy();
    if (!notificationPayload) {
      throw new Error('Expected a browser notification payload');
    }
    expect(notificationPayload.title).toBe('FFA');
    expect(notificationPayload.body).toBe('25 slots');
    expect(typeof notificationPayload.tag).toBe('string');
    expect(SoundUtils.playGameFoundSound).not.toHaveBeenCalled();
  });

  it('delivers a desktop notification when a still-matching lobby moves from foreground to background', () => {
    store.set(STORAGE_KEYS.lobbyDiscoverySettings, {
      criteria: [{ gameMode: 'FFA', teamCount: null, minPlayers: null, maxPlayers: null }],
      discoveryEnabled: true,
      soundEnabled: false,
      desktopNotificationsEnabled: true,
      isTeamTwoTimesMinEnabled: false,
    });

    ui = new LobbyDiscoveryUI();
    vi.mocked(BrowserNotificationUtils.show).mockReturnValueOnce(false).mockReturnValueOnce(true);

    const lobbies = [
      {
        gameID: 'ffa-desktop-late',
        publicGameType: 'ffa',
        gameConfig: {
          gameMode: 'Free For All',
          maxPlayers: 25,
        },
      },
    ] as any;

    ui.receiveLobbyUpdate(lobbies);
    ui.receiveLobbyUpdate(lobbies);

    expect(BrowserNotificationUtils.show).toHaveBeenCalledTimes(2);
  });

  it('notifies on an upcoming [1] match without pulsing the live (featured) card', () => {
    store.set(STORAGE_KEYS.lobbyDiscoverySettings, {
      criteria: [{ gameMode: 'FFA', teamCount: null, minPlayers: 30, maxPlayers: null }],
      discoveryEnabled: true,
      soundEnabled: true,
      desktopNotificationsEnabled: true,
      isTeamTwoTimesMinEnabled: false,
      notifyUpcomingEnabled: true,
    });

    ui = new LobbyDiscoveryUI();

    // games.ffa[0] is the live lobby (too small → no match); games.ffa[1] is the
    // upcoming lobby (matches). The upcoming match notifies, but the *live* queue
    // card never pulses for an upcoming-only match.
    const lobbies = [
      {
        gameID: 'ffa-visible-too-small',
        publicGameType: 'ffa',
        gameConfig: { gameMode: 'Free For All', maxPlayers: 25 },
      },
      {
        gameID: 'ffa-upcoming-match',
        publicGameType: 'ffa',
        gameConfig: { gameMode: 'Free For All', maxPlayers: 40 },
      },
    ] as any;

    ui.receiveLobbyUpdate(lobbies);

    expect(document.getElementById('ffa-card')?.classList.contains('of-discovery-card-active')).toBe(
      false
    );
    expect(BrowserNotificationUtils.show).toHaveBeenCalledTimes(1);
    expect(SoundUtils.playGameFoundSound).toHaveBeenCalledTimes(1);
    // The upcoming card itself carries the match highlight.
    const ffaSlot = document.querySelector('.of-upcoming-slot[data-source="ffa"]');
    expect(ffaSlot?.querySelector('.of-upcoming-card-match')).toBeTruthy();
  });

  it('pulses the queue card when the featured (first) lobby matches', () => {
    store.set(STORAGE_KEYS.lobbyDiscoverySettings, {
      criteria: [{ gameMode: 'FFA', teamCount: null, minPlayers: 30, maxPlayers: null }],
      discoveryEnabled: true,
      soundEnabled: false,
      desktopNotificationsEnabled: false,
      isTeamTwoTimesMinEnabled: false,
    });

    ui = new LobbyDiscoveryUI();

    const lobbies = [
      {
        gameID: 'ffa-visible-match',
        publicGameType: 'ffa',
        gameConfig: { gameMode: 'Free For All', maxPlayers: 40 },
      },
      {
        gameID: 'ffa-hidden-too-small',
        publicGameType: 'ffa',
        gameConfig: { gameMode: 'Free For All', maxPlayers: 25 },
      },
    ] as any;

    ui.receiveLobbyUpdate(lobbies);

    expect(document.getElementById('ffa-card')?.classList.contains('of-discovery-card-active')).toBe(
      true
    );
  });

  it('cleanup clears queue card pulses without scheduling another sync tick', () => {
    store.set(STORAGE_KEYS.lobbyDiscoverySettings, {
      criteria: [{ gameMode: 'FFA', teamCount: null, minPlayers: null, maxPlayers: null }],
      discoveryEnabled: true,
      soundEnabled: false,
      isTeamTwoTimesMinEnabled: false,
    });

    ui = new LobbyDiscoveryUI();
    ui.receiveLobbyUpdate([
      {
        gameID: 'ffa-cleanup',
        publicGameType: 'ffa',
        gameConfig: {
          gameMode: 'Free For All',
          maxPlayers: 25,
        },
      },
    ] as any);

    expect(document.getElementById('ffa-card')?.classList.contains('of-discovery-card-active')).toBe(
      true
    );

    ui.cleanup();
    ui = null;
    vi.advanceTimersByTime(32);

    expect(document.getElementById('ffa-card')?.classList.contains('of-discovery-card-active')).toBe(
      false
    );
  });

  it('renders tri-state modifier chips that cycle Any → Required → Blocked', () => {
    store.set(STORAGE_KEYS.lobbyDiscoverySettings, {
      criteria: [],
      discoveryEnabled: true,
      soundEnabled: true,
      isTeamTwoTimesMinEnabled: false,
    });

    ui = new LobbyDiscoveryUI();

    const chip = document.getElementById('modifier-isCompact') as HTMLButtonElement;

    expect(chip).toBeTruthy();
    expect(chip.tagName).toBe('BUTTON');
    expect(document.querySelector('#modifier-isCompact input[type="radio"]')).toBeFalsy();
    expect(document.querySelector('#modifier-isCompact-allowed')).toBeFalsy();
    expect(document.querySelector('#modifier-isCompact-blocked')).toBeFalsy();
    expect(chip.dataset.state).toBe('any');
    expect(chip.getAttribute('aria-pressed')).toBe('false');

    chip.click();
    expect(chip.dataset.state).toBe('required');
    expect(chip.getAttribute('aria-pressed')).toBe('true');

    chip.click();
    expect(chip.dataset.state).toBe('blocked');
    expect(chip.getAttribute('aria-pressed')).toBe('true');

    chip.click();
    expect(chip.dataset.state).toBe('any');
    expect(chip.getAttribute('aria-pressed')).toBe('false');
  });

  it('keeps all filter sections visible and lets the body scroll when constrained', () => {
    store.set(STORAGE_KEYS.lobbyDiscoverySettings, {
      criteria: [],
      discoveryEnabled: true,
      soundEnabled: true,
      isTeamTwoTimesMinEnabled: false,
    });

    ui = new LobbyDiscoveryUI();

    const body = document.querySelector('.discovery-body') as HTMLDivElement;
    const content = document.querySelector('.discovery-content') as HTMLDivElement;
    const ffa = document.getElementById('discovery-ffa-config') as HTMLDivElement;
    const team = document.getElementById('discovery-team-config') as HTMLDivElement;
    const modifiers = document.querySelector('.discovery-modifier-grid') as HTMLDivElement;

    expect(body).toBeTruthy();
    expect(content).toBeTruthy();
    expect(ffa.style.display).not.toBe('none');
    expect(team.style.display).not.toBe('none');
    expect(modifiers).toBeTruthy();
    expect(getComputedStyle(content).overflowY).toBe('auto');
  });

  it('uses the design-tuned 380px default width with no resize handle', () => {
    store.set(STORAGE_KEYS.lobbyDiscoverySettings, {
      criteria: [],
      discoveryEnabled: true,
      soundEnabled: true,
      isTeamTwoTimesMinEnabled: false,
    });
    // The floating panel shows only when the Lobby Board cannot.
    document.body.innerHTML = '';

    ui = new LobbyDiscoveryUI();

    const panel = document.getElementById('openfront-discovery-panel') as HTMLDivElement;
    expect(panel.style.width).toBe('380px');
    expect(panel.querySelector('.of-resize-handle')).toBeFalsy();
  });

  it('offers Doomsday Clock and Trusted chips, saves them, and no Ports Disabled chip', () => {
    store.set(STORAGE_KEYS.lobbyDiscoverySettings, {
      criteria: [{ gameMode: 'FFA', teamCount: null, minPlayers: null, maxPlayers: null }],
      discoveryEnabled: true,
      soundEnabled: true,
      isTeamTwoTimesMinEnabled: false,
    });

    ui = new LobbyDiscoveryUI();

    expect(document.getElementById('modifier-isPortsDisabled')).toBeNull();
    (document.getElementById('modifier-isDoomsdayClock') as HTMLButtonElement).click();
    const trusted = document.getElementById('modifier-isTrusted') as HTMLButtonElement;
    trusted.click();
    trusted.click();

    const saved = store.get(STORAGE_KEYS.lobbyDiscoverySettings);
    expect(saved.criteria[0].modifiers.isDoomsdayClock).toBe('required');
    expect(saved.criteria[0].modifiers.isTrusted).toBe('blocked');
  });

  it('restores and persists the Hosted and Custom option, on by default', () => {
    ui = new LobbyDiscoveryUI();
    const toggle = document.getElementById('discovery-hosted-toggle') as HTMLInputElement;
    expect(toggle.checked).toBe(true);

    toggle.checked = false;
    toggle.dispatchEvent(new Event('change'));
    expect(store.get(STORAGE_KEYS.lobbyDiscoverySettings).includeHostedAndCustomLobbies).toBe(false);

    ui.cleanup();
    ui = new LobbyDiscoveryUI();
    expect((document.getElementById('discovery-hosted-toggle') as HTMLInputElement).checked).toBe(false);
  });

  it('exposes a Water Nukes modifier control as a tri-state chip', () => {
    store.set(STORAGE_KEYS.lobbyDiscoverySettings, {
      criteria: [],
      discoveryEnabled: true,
      soundEnabled: true,
      isTeamTwoTimesMinEnabled: false,
    });

    ui = new LobbyDiscoveryUI();

    const chip = document.getElementById('modifier-isWaterNukes') as HTMLButtonElement;
    expect(chip).toBeTruthy();
    expect(chip.tagName).toBe('BUTTON');
    expect(chip.dataset.state).toBe('any');
  });

  it('pulses the team card when the special queue is absent', () => {
    document.body.innerHTML = `
      <div id="page-play">
        <game-mode-selector>
          ${homepageGridHtml(['ffa', 'team'])}
        </game-mode-selector>
      </div>
      <join-lobby-modal></join-lobby-modal>
      <host-lobby-modal></host-lobby-modal>
    `;
    const selectorEl = document.querySelector('game-mode-selector') as any;
    selectorEl.lobbies = { games: { team: [{ gameID: 'team-placeholder' }] } };
    const joinModal = document.querySelector('join-lobby-modal') as any;
    joinModal.currentLobbyId = '';

    store.set(STORAGE_KEYS.lobbyDiscoverySettings, {
      criteria: [{ gameMode: 'Team', teamCount: null, minPlayers: null, maxPlayers: null }],
      discoveryEnabled: true,
      soundEnabled: false,
      isTeamTwoTimesMinEnabled: false,
    });

    ui = new LobbyDiscoveryUI();

    ui.receiveLobbyUpdate([
      {
        gameID: 'team-only',
        publicGameType: 'team',
        gameConfig: { gameMode: 'Team', teamCount: 2, maxClients: 10 },
      },
    ] as any);

    expect(document.getElementById('team-card')?.classList.contains('of-discovery-card-active')).toBe(true);
    expect(document.getElementById('ffa-card')?.classList.contains('of-discovery-card-active')).toBe(false);
  });

  it('pulses the special card when the team queue is absent', () => {
    document.body.innerHTML = `
      <div id="page-play">
        <game-mode-selector>
          ${homepageGridHtml(['ffa', 'special'])}
        </game-mode-selector>
      </div>
      <join-lobby-modal></join-lobby-modal>
      <host-lobby-modal></host-lobby-modal>
    `;
    const selectorEl = document.querySelector('game-mode-selector') as any;
    selectorEl.lobbies = { games: { special: [{ gameID: 'special-placeholder' }] } };
    const joinModal = document.querySelector('join-lobby-modal') as any;
    joinModal.currentLobbyId = '';

    store.set(STORAGE_KEYS.lobbyDiscoverySettings, {
      criteria: [{ gameMode: 'FFA', teamCount: null, minPlayers: null, maxPlayers: null }],
      discoveryEnabled: true,
      soundEnabled: false,
      isTeamTwoTimesMinEnabled: false,
    });

    ui = new LobbyDiscoveryUI();

    // A special-source lobby with FFA gameMode matches FFA criteria.
    ui.receiveLobbyUpdate([
      {
        gameID: 'special-only',
        publicGameType: 'special',
        gameConfig: { gameMode: 'Free For All', maxPlayers: 10 },
      },
    ] as any);

    expect(document.getElementById('special-card')?.classList.contains('of-discovery-card-active')).toBe(true);
    expect(document.getElementById('ffa-card')?.classList.contains('of-discovery-card-active')).toBe(false);
  });

  describe('team panel layout', () => {
    it('does not render discovery-team-duos, -trios, or -quads', () => {
      store.set(STORAGE_KEYS.lobbyDiscoverySettings, {
        criteria: [],
        discoveryEnabled: true,
        soundEnabled: true,
        isTeamTwoTimesMinEnabled: false,
      });

      ui = new LobbyDiscoveryUI();

      expect(document.getElementById('discovery-team-duos')).toBeNull();
      expect(document.getElementById('discovery-team-trios')).toBeNull();
      expect(document.getElementById('discovery-team-quads')).toBeNull();
      expect(document.getElementById('discovery-team-hvn')).not.toBeNull();
      expect(document.getElementById('discovery-team-2')).not.toBeNull();
    });

    it('renders FORMAT and NUMBER OF TEAMS subsections without All/None buttons', () => {
      Object.assign(globalThis as Record<string, unknown>, {
        GM_getValue: () => undefined,
        GM_setValue: () => undefined,
      });

      ui = new LobbyDiscoveryUI();

      const hvnChip = document.getElementById('discovery-team-hvn') as HTMLInputElement | null;
      expect(hvnChip).not.toBeNull();
      const hvnLabel = hvnChip?.closest('label');
      expect(hvnLabel?.textContent?.trim()).toBe('Humans Vs Nations');

      for (const n of [2, 3, 4, 5, 6, 7]) {
        const chip = document.getElementById(`discovery-team-${n}`) as HTMLInputElement | null;
        expect(chip).not.toBeNull();
        expect(chip?.closest('label')?.textContent?.trim()).toBe(String(n));
      }

      const chip8plus = document.getElementById('discovery-team-8plus') as HTMLInputElement | null;
      expect(chip8plus).not.toBeNull();
      expect(chip8plus?.closest('label')?.textContent?.trim()).toBe('8+');

      const labels = Array.from(document.querySelectorAll('.ld-format-label')).map((el) =>
        el.textContent?.trim()
      );
      expect(labels).toContain('FORMAT');
      expect(labels).toContain('NUMBER OF TEAMS');

      expect(document.getElementById('discovery-team-select-all')).toBeNull();
      expect(document.getElementById('discovery-team-deselect-all')).toBeNull();
    });
  });

  describe('Up Next strip', () => {
    function ffaLiveAndUpcoming(): any[] {
      return [
        // games.ffa[0] — live, too small to match minPlayers:30
        {
          gameID: 'ffa-live-small',
          publicGameType: 'ffa',
          gameConfig: { gameMode: 'Free For All', gameMap: 'Bering Sea', maxPlayers: 25 },
        },
        // games.ffa[1] — upcoming, matches minPlayers:30
        {
          gameID: 'ffa-upcoming-big',
          publicGameType: 'ffa',
          gameConfig: { gameMode: 'Free For All', gameMap: 'Europe', maxPlayers: 40 },
        },
      ];
    }

    it('notifies on an upcoming match when the toggle is on, and stays silent when off', () => {
      store.set(STORAGE_KEYS.lobbyDiscoverySettings, {
        criteria: [{ gameMode: 'FFA', teamCount: null, minPlayers: 30, maxPlayers: null }],
        discoveryEnabled: true,
        soundEnabled: true,
        desktopNotificationsEnabled: true,
        isTeamTwoTimesMinEnabled: false,
        notifyUpcomingEnabled: true,
      });

      ui = new LobbyDiscoveryUI();
      ui.receiveLobbyUpdate(ffaLiveAndUpcoming());

      // Upcoming match → sound + desktop notification, live card not pulsed.
      expect(SoundUtils.playGameFoundSound).toHaveBeenCalledTimes(1);
      expect(BrowserNotificationUtils.show).toHaveBeenCalledTimes(1);
      expect(
        document.getElementById('ffa-card')?.classList.contains('of-discovery-card-active')
      ).toBe(false);

      // Toggle off via the strip control → no new notification on the next update.
      vi.clearAllMocks();
      const toggle = document.getElementById('of-upcoming-toggle') as HTMLInputElement;
      expect(toggle.checked).toBe(true);
      toggle.checked = false;
      toggle.dispatchEvent(new Event('change'));

      ui.receiveLobbyUpdate(ffaLiveAndUpcoming());
      expect(SoundUtils.playGameFoundSound).not.toHaveBeenCalled();
      expect(BrowserNotificationUtils.show).not.toHaveBeenCalled();
      const ffaSlot = document.querySelector('.of-upcoming-slot[data-source="ffa"]');
      expect(ffaSlot?.querySelector('.of-upcoming-card-match')).toBeFalsy();
      // Display is independent of notify: the upcoming card still renders.
      expect(ffaSlot?.querySelector('.of-upcoming-card')).toBeTruthy();
    });

    it('does not change live-only matching behavior', () => {
      store.set(STORAGE_KEYS.lobbyDiscoverySettings, {
        criteria: [{ gameMode: 'FFA', teamCount: null, minPlayers: null, maxPlayers: null }],
        discoveryEnabled: true,
        soundEnabled: true,
        desktopNotificationsEnabled: false,
        isTeamTwoTimesMinEnabled: false,
        notifyUpcomingEnabled: true,
      });

      ui = new LobbyDiscoveryUI();
      ui.receiveLobbyUpdate([
        {
          gameID: 'ffa-live-match',
          publicGameType: 'ffa',
          gameConfig: { gameMode: 'Free For All', gameMap: 'Bering Sea', maxPlayers: 25 },
        },
      ] as any);

      expect(
        document.getElementById('ffa-card')?.classList.contains('of-discovery-card-active')
      ).toBe(true);
      expect(SoundUtils.playGameFoundSound).toHaveBeenCalledTimes(1);
    });

    it('renders an upcoming card with config and no countdown/timer', () => {
      Object.assign(globalThis as Record<string, unknown>, {
        GM_getValue: () => undefined,
        GM_setValue: () => undefined,
      });

      ui = new LobbyDiscoveryUI();
      ui.receiveLobbyUpdate(ffaLiveAndUpcoming());

      const card = document.querySelector(
        '.of-upcoming-slot[data-source="ffa"] .of-upcoming-card'
      ) as HTMLElement;
      expect(card).toBeTruthy();
      expect(card.querySelector('.of-upcoming-name')?.textContent).toBe('Europe');
      expect(card.querySelector('.of-upcoming-mode')?.textContent).toBe('Free For All');
      expect(card.querySelector('.of-upcoming-count')?.textContent).toContain('40 slots');
      expect(card.querySelector('.of-upcoming-chip')?.textContent?.trim()).toBe('Up next');
      // No countdown / timer is ever shown.
      expect(card.querySelector('.timer')).toBeNull();
      expect(card.textContent ?? '').not.toMatch(/\d+\s*(min|sec|s\b)/i);
    });

    it('renders a "No upcoming game" placeholder when a slot has no [1]', () => {
      Object.assign(globalThis as Record<string, unknown>, {
        GM_getValue: () => undefined,
        GM_setValue: () => undefined,
      });

      ui = new LobbyDiscoveryUI();
      // Only a live lobby for FFA — no upcoming entry.
      ui.receiveLobbyUpdate([
        {
          gameID: 'ffa-live-only',
          publicGameType: 'ffa',
          gameConfig: { gameMode: 'Free For All', gameMap: 'Bering Sea', maxPlayers: 25 },
        },
      ] as any);

      const ffaSlot = document.querySelector('.of-upcoming-slot[data-source="ffa"]');
      expect(ffaSlot?.querySelector('.of-upcoming-card')).toBeFalsy();
      expect(ffaSlot?.querySelector('.of-upcoming-empty')?.textContent).toBe('No upcoming game');
    });

    it('navigates to the game URL only on a real click, never from processing', () => {
      Object.assign(globalThis as Record<string, unknown>, {
        GM_getValue: () => undefined,
        GM_setValue: () => undefined,
      });
      // jsdom's window.location.assign is non-configurable, so spy on the
      // class seam that wraps it. This still proves the click → navigate wiring
      // and that processing never navigates.
      const navSpy = vi
        .spyOn(LobbyDiscoveryUI.prototype as any, 'navigateToGame')
        .mockImplementation(() => {});

      ui = new LobbyDiscoveryUI();
      ui.receiveLobbyUpdate(ffaLiveAndUpcoming());

      // Matching/processing alone must never navigate.
      expect(navSpy).not.toHaveBeenCalled();

      const card = document.querySelector(
        '.of-upcoming-slot[data-source="ffa"] .of-upcoming-card'
      ) as HTMLButtonElement;
      card.click();

      expect(navSpy).toHaveBeenCalledTimes(1);
      expect(navSpy).toHaveBeenCalledWith('/game/ffa-upcoming-big');
      navSpy.mockRestore();
    });

    it('reuses the same card DOM node across an unchanged refresh (no hover flicker)', () => {
      Object.assign(globalThis as Record<string, unknown>, {
        GM_getValue: () => undefined,
        GM_setValue: () => undefined,
      });

      ui = new LobbyDiscoveryUI();
      ui.receiveLobbyUpdate(ffaLiveAndUpcoming());

      const cardBefore = document.querySelector(
        '.of-upcoming-slot[data-source="ffa"] .of-upcoming-card'
      );
      expect(cardBefore).toBeTruthy();

      // A second identical update (and the 16ms pulse-sync re-apply) must not
      // rebuild the card — rebuilding swaps the node under the cursor and
      // restarts the hover animation, which reads as flicker.
      ui.receiveLobbyUpdate(ffaLiveAndUpcoming());
      vi.advanceTimersByTime(32);

      const cardAfter = document.querySelector(
        '.of-upcoming-slot[data-source="ffa"] .of-upcoming-card'
      );
      expect(cardAfter).toBe(cardBefore);
    });

    it('hides the strip off the lobby page / during a live game and shows it on the lobby page', async () => {
      const { LobbyUtils } = await import('@/utils/LobbyUtils');

      Object.assign(globalThis as Record<string, unknown>, {
        GM_getValue: () => undefined,
        GM_setValue: () => undefined,
      });

      ui = new LobbyDiscoveryUI();
      ui.receiveLobbyUpdate(ffaLiveAndUpcoming());

      const strip = document.getElementById('of-upcoming-strip') as HTMLElement;
      expect(strip).toBeTruthy();
      expect(strip.style.display).not.toBe('none');

      // Simulate leaving the lobby page (live game) — the strip hides.
      vi.mocked(LobbyUtils.isOnLobbyPage).mockReturnValue(false);
      ui.receiveLobbyUpdate(ffaLiveAndUpcoming());
      expect(strip.style.display).toBe('none');

      // Back on the lobby page — the strip shows again.
      vi.mocked(LobbyUtils.isOnLobbyPage).mockReturnValue(true);
      ui.receiveLobbyUpdate(ffaLiveAndUpcoming());
      expect(strip.style.display).not.toBe('none');
    });
  });

  describe('upcoming card map thumbnail asset resolution', () => {
    beforeEach(() => {
      store.set(STORAGE_KEYS.lobbyDiscoverySettings, {
        criteria: [{ gameMode: 'FFA', teamCount: null, minPlayers: null, maxPlayers: null }],
        discoveryEnabled: true,
        soundEnabled: false,
        desktopNotificationsEnabled: false,
        isTeamTwoTimesMinEnabled: false,
        notifyUpcomingEnabled: true,
      });
    });

    function ffaUpcoming(): any[] {
      return [
        {
          gameID: 'ffa-live',
          publicGameType: 'ffa',
          gameConfig: { gameMode: 'Free For All', gameMap: 'Bering Sea', maxPlayers: 25 },
        },
        {
          gameID: 'ffa-next',
          publicGameType: 'ffa',
          gameConfig: { gameMode: 'Free For All', gameMap: 'Europe', maxPlayers: 40 },
        },
      ];
    }

    function renderedUpcomingImgSrc(): string | null {
      ui = new LobbyDiscoveryUI();
      ui.receiveLobbyUpdate(ffaUpcoming());
      const img = document.querySelector(
        '.of-upcoming-slot[data-source="ffa"] .of-upcoming-art img'
      ) as HTMLImageElement | null;
      // getAttribute, not .src — jsdom resolves the property to an absolute URL.
      return img?.getAttribute('src') ?? null;
    }

    it('resolves the thumbnail from window.BOOTSTRAP_CONFIG (OpenFront V32)', () => {
      (window as any).BOOTSTRAP_CONFIG = {
        assetManifest: {
          'maps/europe/thumbnail.webp': '/_assets/maps/europe/thumbnail.5ffe4eb83aa5.webp',
        },
        cdnBase: 'https://cdn.ofedge.io/game_assets',
      };
      expect(renderedUpcomingImgSrc()).toBe(
        'https://cdn.ofedge.io/game_assets/_assets/maps/europe/thumbnail.5ffe4eb83aa5.webp'
      );
    });

    it('falls back to __ASSET_MANIFEST__/__CDN_BASE__ when BOOTSTRAP_CONFIG is absent', () => {
      (globalThis as any).__ASSET_MANIFEST__ = {
        'maps/europe/thumbnail.webp': '/_assets/maps/europe/thumbnail.5ffe4eb83aa5.webp',
      };
      (globalThis as any).__CDN_BASE__ = 'https://cdn.ofedge.io/game_assets';
      expect(renderedUpcomingImgSrc()).toBe(
        'https://cdn.ofedge.io/game_assets/_assets/maps/europe/thumbnail.5ffe4eb83aa5.webp'
      );
    });

    it('degrades to a relative path when no asset globals are present', () => {
      expect(renderedUpcomingImgSrc()).toBe('/maps/europe/thumbnail.webp');
    });
  });

  describe('See All View', () => {
    /**
     * Adds the See All View (`detailed-view-modal`), whose cards carry
     * `data-lobby-slot="<gameID>"`.
     */
    function mountSeeAll(slotIds: string[]): void {
      const view = document.createElement('detailed-view-modal');
      view.id = 'page-detailed-view';
      view.className = 'hidden w-full h-full page-content';
      document.body.appendChild(view);
      renderSeeAllSlots(slotIds);
    }

    function renderSeeAllSlots(slotIds: string[]): void {
      const view = document.getElementById('page-detailed-view')!;
      view.replaceChildren(
        ...slotIds.map((id) => {
          const slot = document.createElement('div');
          slot.dataset.lobbySlot = id;
          return slot;
        })
      );
    }

    const ffaLobby = (gameID: string, maxPlayers: number, extra: object = {}) => ({
      gameID,
      publicGameType: 'ffa',
      gameConfig: { gameMode: 'Free For All', gameMap: 'Europe', maxPlayers },
      ...extra,
    });

    // Only ffa[3] has room for 30+ players.
    function ffaQueueWithFourthMatch(): any[] {
      return [ffaLobby('ffa-0', 20), ffaLobby('ffa-1', 20), ffaLobby('ffa-2', 20), ffaLobby('ffa-3', 40)];
    }

    function bigFfaSettings(extra: object = {}): void {
      store.set(STORAGE_KEYS.lobbyDiscoverySettings, {
        criteria: [{ gameMode: 'FFA', teamCount: null, minPlayers: 30, maxPlayers: null }],
        discoveryEnabled: true,
        soundEnabled: true,
        desktopNotificationsEnabled: true,
        isTeamTwoTimesMinEnabled: false,
        notifyUpcomingEnabled: true,
        ...extra,
      });
    }

    const seeAllPulsing = () =>
      document.getElementById('see-all')?.classList.contains('of-discovery-card-active');
    const slotHighlighted = (id: string) =>
      document.querySelector(`[data-lobby-slot="${id}"]`)?.classList.contains('of-discovery-see-all-match');

    it('alerts on a match in fourth place, pulses "See all" and highlights its card', () => {
      mountSeeAll(['ffa-0', 'ffa-1', 'ffa-2', 'ffa-3']);
      bigFfaSettings();

      ui = new LobbyDiscoveryUI();
      ui.receiveLobbyUpdate(ffaQueueWithFourthMatch());

      expect(SoundUtils.playGameFoundSound).toHaveBeenCalledTimes(1);
      expect(BrowserNotificationUtils.show).toHaveBeenCalledTimes(1);
      expect(seeAllPulsing()).toBe(true);
      expect(slotHighlighted('ffa-3')).toBe(true);
      expect(slotHighlighted('ffa-2')).toBe(false);
      expect(document.getElementById('ffa-card')?.classList.contains('of-discovery-card-active')).toBe(false);
      expect(document.querySelector('.of-upcoming-card-match')).toBeNull();
    });

    it('stops pulsing "See all" and clears the highlight when the match leaves the feed', () => {
      mountSeeAll(['ffa-0', 'ffa-1', 'ffa-2', 'ffa-3']);
      bigFfaSettings();

      ui = new LobbyDiscoveryUI();
      ui.receiveLobbyUpdate(ffaQueueWithFourthMatch());
      ui.receiveLobbyUpdate(ffaQueueWithFourthMatch().slice(0, 3));

      expect(seeAllPulsing()).toBe(false);
      expect(slotHighlighted('ffa-3')).toBe(false);
    });

    it('keeps the highlight on the right card after the See All View re-renders', async () => {
      mountSeeAll(['ffa-0', 'ffa-1', 'ffa-2', 'ffa-3']);
      bigFfaSettings();

      ui = new LobbyDiscoveryUI();
      ui.receiveLobbyUpdate(ffaQueueWithFourthMatch());
      renderSeeAllSlots(['ffa-3', 'ffa-0', 'ffa-1', 'ffa-2']);
      await Promise.resolve();

      expect(slotHighlighted('ffa-3')).toBe(true);
      expect(slotHighlighted('ffa-0')).toBe(false);
    });

    it('evaluates the Hosted Queue and honours the Hosted and Custom option', () => {
      mountSeeAll(['hosted-1']);
      const hosted = [{ ...ffaLobby('hosted-1', 40), publicGameType: 'hosted' }];

      bigFfaSettings();
      ui = new LobbyDiscoveryUI();
      ui.receiveLobbyUpdate(hosted as any);
      expect(seeAllPulsing()).toBe(true);
      expect(slotHighlighted('hosted-1')).toBe(true);
      ui.cleanup();

      vi.clearAllMocks();
      bigFfaSettings({ includeHostedAndCustomLobbies: false });
      ui = new LobbyDiscoveryUI();
      ui.receiveLobbyUpdate(hosted as any);
      expect(seeAllPulsing()).toBe(false);
      expect(SoundUtils.playGameFoundSound).not.toHaveBeenCalled();
    });

    it('ignores a Custom Lobby in the Special Queue when the option is off', () => {
      bigFfaSettings({ includeHostedAndCustomLobbies: false });
      ui = new LobbyDiscoveryUI();
      ui.receiveLobbyUpdate([{ ...ffaLobby('custom-0', 40), publicGameType: 'special', custom: true }] as any);

      expect(document.getElementById('special-card')?.classList.contains('of-discovery-card-active')).toBe(false);
      expect(SoundUtils.playGameFoundSound).not.toHaveBeenCalled();
    });

    it('covers every Upcoming Lobby with the "notify upcoming" option', () => {
      mountSeeAll(['ffa-0', 'ffa-1', 'ffa-2', 'ffa-3']);
      bigFfaSettings({ notifyUpcomingEnabled: false });

      ui = new LobbyDiscoveryUI();
      ui.receiveLobbyUpdate(ffaQueueWithFourthMatch());

      expect(seeAllPulsing()).toBe(false);
      expect(slotHighlighted('ffa-3')).toBe(false);
      expect(SoundUtils.playGameFoundSound).not.toHaveBeenCalled();
    });

    it('keeps matching while the See All View replaces the play page', () => {
      mountSeeAll(['ffa-0', 'ffa-1', 'ffa-2', 'ffa-3']);
      document.getElementById('page-play')!.classList.add('hidden');
      document.getElementById('page-detailed-view')!.classList.remove('hidden');
      bigFfaSettings();

      ui = new LobbyDiscoveryUI();
      ui.receiveLobbyUpdate(ffaQueueWithFourthMatch());

      expect(slotHighlighted('ffa-3')).toBe(true);
    });

    it('opens the See All View on the Queue only when the user clicks the notification', () => {
      mountSeeAll(['ffa-0', 'ffa-1', 'ffa-2', 'ffa-3']);
      bigFfaSettings();
      const showPage = vi.fn();
      (window as any).showPage = showPage;
      const view = document.getElementById('page-detailed-view') as any;
      view.open = vi.fn();

      ui = new LobbyDiscoveryUI();
      ui.receiveLobbyUpdate(ffaQueueWithFourthMatch());

      expect(showPage).not.toHaveBeenCalled();
      const payload = vi.mocked(BrowserNotificationUtils.show).mock.calls[0]![0];
      payload.onClick!();

      expect(showPage).toHaveBeenCalledWith('page-detailed-view');
      expect(view.open).toHaveBeenCalledWith({ tab: 'ffa' });
      delete (window as any).showPage;
    });

    it('leaves the notification click of a Live Lobby match to focus the tab only', () => {
      bigFfaSettings();
      ui = new LobbyDiscoveryUI();
      ui.receiveLobbyUpdate([ffaLobby('ffa-0', 40)] as any);

      expect(vi.mocked(BrowserNotificationUtils.show).mock.calls[0]![0].onClick).toBeUndefined();
    });
  });

  describe('Maps section', () => {
    const mapChip = (gameMap: string) =>
      document.querySelector(`#discovery-maps-body [data-game-map="${gameMap}"]`) as HTMLButtonElement | null;
    const ffaOn = (gameID: string, gameMap: string) => ({
      gameID,
      publicGameType: 'ffa',
      gameConfig: { gameMode: 'Free For All', gameMap, maxPlayers: 40 },
    });

    function anyFfaSettings(extra: object = {}): void {
      store.set(STORAGE_KEYS.lobbyDiscoverySettings, {
        criteria: [{ gameMode: 'FFA', teamCount: null, minPlayers: null, maxPlayers: null }],
        discoveryEnabled: true,
        soundEnabled: true,
        isTeamTwoTimesMinEnabled: false,
        ...extra,
      });
    }

    it('starts collapsed and lists every map grouped by category with its OpenFront name', () => {
      ui = new LobbyDiscoveryUI();
      const toggle = document.getElementById('discovery-maps-toggle') as HTMLButtonElement;
      const body = document.getElementById('discovery-maps-body') as HTMLElement;

      expect(body.hidden).toBe(true);
      toggle.click();
      expect(body.hidden).toBe(false);
      expect(toggle.getAttribute('aria-expanded')).toBe('true');

      expect(mapChip('Baikal Nuke Wars')?.textContent?.trim()).toBe('Baikal (Nuke Wars)');
      expect(mapChip('Alps')?.closest('[data-category]')?.getAttribute('data-category')).toBe('europe');
      expect(document.querySelectorAll('#discovery-maps-body [data-game-map]').length).toBeGreaterThan(100);
    });

    it('shows a map in each of its categories and keeps its chips in sync', () => {
      ui = new LobbyDiscoveryUI();
      const aegean = () =>
        Array.from(document.querySelectorAll<HTMLButtonElement>('#discovery-maps-body [data-game-map="Aegean"]'));

      expect(aegean().map((chip) => chip.closest('[data-category]')?.getAttribute('data-category'))).toEqual([
        'europe',
        'asia',
      ]);
      aegean()[1]!.click();
      expect(aegean().map((chip) => chip.dataset.state)).toEqual(['required', 'required']);
    });

    it('cycles a map through any, required and blocked, saves it and applies it to matching', () => {
      anyFfaSettings();
      ui = new LobbyDiscoveryUI();
      const alps = mapChip('Alps')!;

      alps.click();
      expect(alps.dataset.state).toBe('required');
      alps.click();
      expect(alps.dataset.state).toBe('blocked');
      expect(store.get(STORAGE_KEYS.lobbyDiscoverySettings).mapFilter).toEqual({ Alps: 'blocked' });
      expect(document.getElementById('discovery-maps-summary')?.textContent).toBe('1 excluded');

      ui.receiveLobbyUpdate([ffaOn('ffa-alps', 'Alps')] as any);
      expect(document.getElementById('ffa-card')?.classList.contains('of-discovery-card-active')).toBe(false);
      ui.receiveLobbyUpdate([ffaOn('ffa-europe', 'Europe')] as any);
      expect(document.getElementById('ffa-card')?.classList.contains('of-discovery-card-active')).toBe(true);
    });

    it('restores the saved Map Filter and its summary', () => {
      anyFfaSettings({ mapFilter: { Alps: 'required', Europe: 'required', Mars: 'blocked' } });
      ui = new LobbyDiscoveryUI();

      expect(mapChip('Alps')?.dataset.state).toBe('required');
      expect(mapChip('Mars')?.dataset.state).toBe('blocked');
      expect(document.getElementById('discovery-maps-summary')?.textContent).toBe('2 required · 1 excluded');
    });

    it('filters the map list by a case-insensitive search on the name', () => {
      ui = new LobbyDiscoveryUI();
      const search = document.getElementById('discovery-maps-search') as HTMLInputElement;

      search.value = 'baikal';
      search.dispatchEvent(new Event('input'));

      expect(mapChip('Baikal')?.hidden).toBe(false);
      expect(mapChip('Baikal Nuke Wars')?.hidden).toBe(false);
      expect(mapChip('Alps')?.hidden).toBe(true);
      const europe = document.querySelector('#discovery-maps-body [data-category="europe"]') as HTMLElement;
      expect(europe.hidden).toBe(true);
    });

    it('clears the Map Filter with its own control and with "Reset all"', () => {
      anyFfaSettings({ mapFilter: { Alps: 'required' } });
      ui = new LobbyDiscoveryUI();

      (document.getElementById('discovery-maps-clear') as HTMLButtonElement).click();
      expect(mapChip('Alps')?.dataset.state).toBe('any');
      expect(store.get(STORAGE_KEYS.lobbyDiscoverySettings).mapFilter).toEqual({});

      mapChip('Mars')!.click();
      (document.getElementById('discovery-reset') as HTMLButtonElement).click();
      expect(store.get(STORAGE_KEYS.lobbyDiscoverySettings).mapFilter).toEqual({});
      expect(document.getElementById('discovery-maps-summary')?.textContent).toBe('Any map');
    });

    it('adds a map that only the feed knows to the "Other" group', () => {
      anyFfaSettings();
      ui = new LobbyDiscoveryUI();
      ui.receiveLobbyUpdate([ffaOn('ffa-new', 'Brand New Map')] as any);
      ui.receiveLobbyUpdate([ffaOn('ffa-new', 'Brand New Map')] as any);

      const chips = document.querySelectorAll('#discovery-maps-body [data-game-map="Brand New Map"]');
      expect(chips).toHaveLength(1);
      expect(chips[0]!.closest('[data-category]')?.getAttribute('data-category')).toBe('other');
    });
  });

  describe('collapsible sections', () => {
    const sections = ['modes', 'modifiers', 'maps', 'lobbies'];
    const toggle = (name: string) => document.getElementById(`discovery-${name}-toggle`) as HTMLButtonElement;
    const body = (name: string) => document.getElementById(`discovery-${name}-body`) as HTMLElement;

    it('opens Modes, Modifiers and Lobbies and collapses Maps by default', () => {
      ui = new LobbyDiscoveryUI();
      expect(sections.map((name) => [name, body(name).hidden, toggle(name).getAttribute('aria-expanded')])).toEqual([
        ['modes', false, 'true'],
        ['modifiers', false, 'true'],
        ['maps', true, 'false'],
        ['lobbies', false, 'true'],
      ]);
    });

    it('collapses and expands every section on click', () => {
      ui = new LobbyDiscoveryUI();
      for (const name of sections) {
        const wasHidden = body(name).hidden;
        toggle(name).click();
        expect(body(name).hidden).toBe(!wasHidden);
        expect(toggle(name).getAttribute('aria-expanded')).toBe(String(wasHidden));
      }
    });

    it('restores the collapsed sections after a page reload', () => {
      ui = new LobbyDiscoveryUI();
      toggle('modes').click();
      toggle('maps').click();
      ui.cleanup();

      ui = new LobbyDiscoveryUI();
      expect(body('modes').hidden).toBe(true);
      expect(body('maps').hidden).toBe(false);
      expect(body('modifiers').hidden).toBe(false);
    });
  });
});
