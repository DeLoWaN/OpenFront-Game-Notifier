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

describe('LobbyDiscoveryUI', () => {
  let store: Map<string, any>;
  let ui: LobbyDiscoveryUI | null;

  /**
   * Sets up the homepage DOM with FFA + Special + Team lobby cards, mirroring
   * what OpenFront's game-mode-selector Lit component renders when all three
   * queue slots are filled.
   *
   * Also sets `selector.lobbies` on the custom element so that
   * `getQueueCardElements()` can determine which right-column section belongs to
   * 'special' vs 'team' (Lit renders them in that order; when a slot is absent
   * Lit emits `nothing` and the section div is not created, so positional
   * lookup breaks — we guard against that with `selector.lobbies`).
   */
  function mountHomepageCards(joined = false): void {
    document.body.innerHTML = `
      <div id="page-play">
        <game-mode-selector>
          <div class="grid grid-cols-1 sm:grid-cols-[2fr_1fr] gap-4">
            <div class="hidden sm:block">
              <button id="ffa-card" class="queue-card">FFA</button>
            </div>
            <div class="hidden sm:flex sm:flex-col sm:gap-4">
              <div class="flex-1 min-h-0">
                <button id="special-card" class="queue-card">Special</button>
              </div>
              <div class="flex-1 min-h-0">
                <button id="team-card" class="queue-card">Team</button>
              </div>
            </div>
          </div>
        </game-mode-selector>
      </div>
      <join-lobby-modal></join-lobby-modal>
      <host-lobby-modal></host-lobby-modal>
    `;

    // Mirror selector.lobbies so getQueueCardElements() maps right-column sections
    // correctly: rightSections[0]=special, rightSections[1]=team.
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
      <div class="grid grid-cols-1 sm:grid-cols-[2fr_1fr] gap-4">
        <div class="hidden sm:block">
          <button id="ffa-card" class="queue-card">FFA</button>
        </div>
        <div class="hidden sm:flex sm:flex-col sm:gap-4">
          <div class="flex-1 min-h-0">
            <button id="special-card" class="queue-card">Special</button>
          </div>
          <div class="flex-1 min-h-0">
            <button id="team-card" class="queue-card">Team</button>
          </div>
        </div>
      </div>
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

    expect(document.getElementById('openfront-discovery-panel')).toBeTruthy();
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

    ui = new LobbyDiscoveryUI();

    const panel = document.getElementById('openfront-discovery-panel') as HTMLDivElement;
    expect(panel.style.width).toBe('380px');
    expect(panel.querySelector('.of-resize-handle')).toBeFalsy();
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

  it('pulses team card when special queue is absent (right-column ordering regression)', () => {
    // Bug: when the special queue has no lobby, Lit renders `nothing` and removes
    // its div. The right column then has only one child (team). Old code looked
    // for team at rightSections[1] (undefined), so the team card never pulsed.
    // Fix: detect section presence from selector.lobbies and map accordingly.
    document.body.innerHTML = `
      <div id="page-play">
        <game-mode-selector>
          <div class="grid grid-cols-1 sm:grid-cols-[2fr_1fr] gap-4">
            <div class="hidden sm:block">
              <button id="ffa-card" class="queue-card">FFA</button>
            </div>
            <div class="hidden sm:flex sm:flex-col sm:gap-4">
              <div class="flex-1 min-h-0">
                <button id="team-card" class="queue-card">Team</button>
              </div>
            </div>
          </div>
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

  it('correctly maps special card to rightSections[0] when only special queue is present', () => {
    // When only the special slot has a lobby (team is absent), Lit renders one child in the
    // right column — the special div at rightSections[0]. Verify that the correct button is
    // found and pulsed when that lobby matches criteria.
    document.body.innerHTML = `
      <div id="page-play">
        <game-mode-selector>
          <div class="grid grid-cols-1 sm:grid-cols-[2fr_1fr] gap-4">
            <div class="hidden sm:block">
              <button id="ffa-card" class="queue-card">FFA</button>
            </div>
            <div class="hidden sm:flex sm:flex-col sm:gap-4">
              <div class="flex-1 min-h-0">
                <button id="special-card" class="queue-card">Special</button>
              </div>
            </div>
          </div>
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
    // Its button must be found at rightSections[0] (the only right-column section).
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
});
