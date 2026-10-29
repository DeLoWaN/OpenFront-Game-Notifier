/**
 * LobbyDiscoveryUI - notify-only discovery interface for matching lobbies.
 */

import { STORAGE_KEYS } from '@/config/constants';
import { LobbyUtils } from '@/utils/LobbyUtils';
import { BrowserNotificationUtils } from '@/utils/BrowserNotificationUtils';
import { SoundUtils } from '@/utils/SoundUtils';
import { URLObserver } from '@/utils/URLObserver';
import type { Lobby } from '@/types/game';
import type {
  DiscoveryCriteria,
  LobbyDiscoverySettings,
  MapFilter,
  QueueSource,
} from './LobbyDiscoveryTypes';
import { LobbyDiscoveryEngine } from './LobbyDiscoveryEngine';
import {
  formatElapsedSince,
  getBrowserNotificationContent,
  getGameDetailsText,
  getLobbyQueueSource,
  isHostConfiguredLobby,
  normalizeSettings,
} from './LobbyDiscoveryHelpers';
import { LobbyDiscoveryFilters, type FilterChange } from './LobbyDiscoveryFilters';
import { LobbyBoardView } from './LobbyBoardView';
import { LobbyBoardAlerts, PULSE_DURATION_MS } from './LobbyBoardAlerts';

function isDebugEnabled(): boolean {
  try {
    if (typeof unsafeWindow !== 'undefined' && unsafeWindow.__OF_DEBUG_DISCOVERY === true) {
      return true;
    }
  } catch {
    // unsafeWindow not granted — fall through
  }
  if ((globalThis as { __OF_DEBUG_DISCOVERY?: boolean }).__OF_DEBUG_DISCOVERY === true) {
    return true;
  }
  try {
    if (typeof localStorage !== 'undefined' && localStorage.getItem('__OF_DEBUG_DISCOVERY') === 'true') {
      return true;
    }
  } catch {
    // localStorage may throw in privacy modes — fall through
  }
  return false;
}

interface DiscoveryMatch {
  lobby: Lobby;
  queue: QueueSource;
  // Only the See All View shows this lobby: it is past index 1 or in the Hosted Queue.
  seeAllOnly: boolean;
}

const SEE_ALL_VIEW_ID = 'page-detailed-view';
const SEE_ALL_MATCH_CLASS = 'of-discovery-see-all-match';

type PageWindow = Window & {
  showPage?: (pageId: string) => void;
  BOOTSTRAP_CONFIG?: { assetManifest?: Record<string, string>; cdnBase?: string };
  __ASSET_MANIFEST__?: Record<string, string>;
  __CDN_BASE__?: string;
};

// OpenFront's own globals live on the page window, not on the userscript sandbox window.
function getPageWindow(): PageWindow {
  try {
    if (typeof unsafeWindow !== 'undefined') {
      return unsafeWindow as unknown as PageWindow;
    }
  } catch {
    // unsafeWindow not granted — fall through to the sandbox window
  }
  return window as PageWindow;
}

const ICON_SOUND = `<svg viewBox="0 0 24 24"><path d="M11 5L6 9H2v6h4l5 4V5z"/><path d="M15.5 8.5a5 5 0 010 7"/><path d="M19 5a9 9 0 010 14"/></svg>`;
const ICON_BELL = `<svg viewBox="0 0 24 24"><path d="M6 8a6 6 0 1112 0c0 7 3 9 3 9H3s3-2 3-9z"/><path d="M10.3 21a1.94 1.94 0 003.4 0"/></svg>`;

export class LobbyDiscoveryUI {
  private discoveryEnabled = true;
  private searchStartTime: number | null = null;
  private lastMatchTime: number | null = null;
  private soundEnabled = true;
  private desktopNotificationsEnabled = false;
  private desktopNotificationRequestId = 0;
  private activeMatchSources: Set<QueueSource> = new Set();
  private seeAllPulseActive = false;
  private seeAllMatchIds: Set<string> = new Set();
  private seeAllObserver: MutationObserver | null = null;
  private observedSeeAllView: HTMLElement | null = null;
  private seenLobbies: Set<string> = new Set();
  private desktopNotifiedLobbies: Set<string> = new Set();
  private sleeping = false;
  private isDisposed = false;

  private lastLobbies: Lobby[] = [];

  private timerInterval: ReturnType<typeof setInterval> | null = null;
  private gameInfoInterval: ReturnType<typeof setInterval> | null = null;
  private pulseSyncTimeout: ReturnType<typeof setTimeout> | null = null;

  private panel!: HTMLDivElement;
  private filters!: LobbyDiscoveryFilters;
  private engine: LobbyDiscoveryEngine;
  private lobbyBoard: LobbyBoardView;
  private boardAlerts = new LobbyBoardAlerts();
  // One timer per alert: it redraws the board when the pulse ends.
  private pulseEndTimers = new Set<ReturnType<typeof setTimeout>>();
  // Offset to add to the local clock to get the feed's clock.
  private clockOffsetMs = 0;

  constructor() {
    this.engine = new LobbyDiscoveryEngine();
    this.lobbyBoard = new LobbyBoardView({
      onJoin: (gameID) => this.navigateToGame(`/game/${gameID}`),
      onCardSeen: (gameID) => this.handleCardSeen(gameID),
      getAssets: () => this.getAssetContext(),
    });
    this.loadSettings();
    this.createUI();
    this.updateSleepState();
    URLObserver.subscribe(() => this.updateSleepState());
  }

  private get criteriaList(): DiscoveryCriteria[] {
    return this.filters.getSettings().criteria;
  }

  private get mapFilter(): MapFilter {
    return this.filters.getSettings().mapFilter;
  }

  private get includeHostedAndCustomLobbies(): boolean {
    return this.filters.getSettings().includeHostedAndCustomLobbies;
  }

  receiveLobbyUpdate(lobbies: Lobby[], serverTime: number | null = null): void {
    this.lastLobbies = lobbies;
    if (serverTime !== null) this.clockOffsetMs = serverTime - Date.now();
    this.processLobbies(lobbies);
  }

  isSoundEnabled(): boolean {
    return this.soundEnabled;
  }

  private loadSettings(): void {
    const saved = GM_getValue<LobbyDiscoverySettings | null>(
      STORAGE_KEYS.lobbyDiscoverySettings,
      null
    );

    const settings = normalizeSettings(saved);
    GM_setValue(STORAGE_KEYS.lobbyDiscoverySettings, settings);

    this.soundEnabled = settings.soundEnabled;
    this.desktopNotificationsEnabled = settings.desktopNotificationsEnabled;
    this.discoveryEnabled = settings.discoveryEnabled;
    this.filters = new LobbyDiscoveryFilters({
      initial: {
        criteria: settings.criteria,
        isTeamTwoTimesMinEnabled: settings.isTeamTwoTimesMinEnabled,
        includeHostedAndCustomLobbies: settings.includeHostedAndCustomLobbies ?? true,
        mapFilter: settings.mapFilter ?? {},
      },
      onChange: (change) => this.handleFilterChange(change),
    });
  }

  private handleFilterChange(change: FilterChange): void {
    this.saveSettings();
    this.updateLobbyBoard(this.lastLobbies);
    if (change !== 'lobbies') this.syncSearchTimer({ resetStart: true });
    if (change !== 'criteria') this.processLobbies(this.lastLobbies);
  }

  private saveSettings(): void {
    const filterSettings = this.filters.getSettings();
    GM_setValue(STORAGE_KEYS.lobbyDiscoverySettings, {
      criteria: filterSettings.criteria,
      discoveryEnabled: this.discoveryEnabled,
      soundEnabled: this.soundEnabled,
      desktopNotificationsEnabled: this.desktopNotificationsEnabled,
      isTeamTwoTimesMinEnabled: filterSettings.isTeamTwoTimesMinEnabled,
      includeHostedAndCustomLobbies: filterSettings.includeHostedAndCustomLobbies,
      mapFilter: filterSettings.mapFilter,
    } satisfies LobbyDiscoverySettings);
  }

  private updateStatusText(): void {
    const text = document.getElementById('discovery-search-timer');
    if (!text) return;

    if (
      !this.discoveryEnabled ||
      this.criteriaList.length === 0 ||
      !this.isDiscoveryFeedbackAllowed()
    ) {
      text.textContent = '';
      text.style.display = 'none';
      return;
    }

    text.style.display = 'inline';
    if (this.lastMatchTime !== null) {
      text.textContent = `last match ${formatElapsedSince(this.lastMatchTime)}`;
    } else if (this.searchStartTime !== null) {
      text.textContent = `searching · ${formatElapsedSince(this.searchStartTime)}`;
    } else {
      text.textContent = 'awaiting filters';
    }
  }

  private updateCurrentGameInfo(): void {
    if (!LobbyUtils.isOnLobbyPage()) {
      this.filters.setCurrentGameInfo(null);
      return;
    }

    const publicLobby = document.querySelector('public-lobby') as any;
    if (!publicLobby || !Array.isArray(publicLobby.lobbies) || publicLobby.lobbies.length === 0) {
      this.filters.setCurrentGameInfo(null);
      return;
    }

    const currentLobby = publicLobby.lobbies[0];
    if (!currentLobby || !currentLobby.gameConfig) {
      this.filters.setCurrentGameInfo(null);
      return;
    }

    this.filters.setCurrentGameInfo(`Current game: ${getGameDetailsText(currentLobby)}`);
  }

  /** Group the flattened lobby snapshot by Queue, keeping the feed order. */
  private parseQueues(lobbies: Lobby[]): Map<QueueSource, Lobby[]> {
    const queues = new Map<QueueSource, Lobby[]>();
    for (const lobby of lobbies) {
      const queue = getLobbyQueueSource(lobby);
      if (!queue) continue;
      const queueLobbies = queues.get(queue) ?? [];
      queueLobbies.push(lobby);
      queues.set(queue, queueLobbies);
    }
    return queues;
  }

  private processLobbies(lobbies: Lobby[]): void {
    try {
      this.updateCurrentGameInfo();
      this.syncSearchTimer();

      const queues = this.parseQueues(lobbies);
      this.filters.addFeedOnlyMaps(lobbies);

      if (
        !this.discoveryEnabled ||
        this.criteriaList.length === 0 ||
        !this.isDiscoveryFeedbackAllowed()
      ) {
        this.seenLobbies.clear();
        this.desktopNotifiedLobbies.clear();
        this.boardAlerts.clear();
        this.updateQueueCardPulses(new Set());
        this.updateSeeAllSignals(false, new Set());
        this.updateStatusText();
        return;
      }

      // Signals: Live Lobby → home card; every other lobby → "See all" button.
      const liveMatchSources = new Set<QueueSource>();
      const seeAllMatchIds = new Set<string>();
      let hasSeeAllOnlyMatch = false;
      const matchedKeys = new Set<string>();
      const newMatches: DiscoveryMatch[] = [];
      const newAlerts: Array<{ key: string; gameID: string }> = [];

      const debugEnabled = isDebugEnabled();
      const evaluate = (lobby: Lobby, queue: QueueSource, index: number): void => {
        if (!this.includeHostedAndCustomLobbies && isHostConfiguredLobby(lobby)) return;

        const isLive = queue !== 'hosted' && index === 0;
        const seeAllOnly = !isLive;
        const matched = this.engine.matchesCriteria(lobby, this.criteriaList, this.mapFilter);
        if (debugEnabled) {
          console.log('[OF Discovery]', {
            lobbyId: lobby.gameID,
            queue,
            index,
            mode: lobby.gameConfig?.gameMode,
            map: lobby.gameConfig?.gameMap,
            playerTeams: lobby.gameConfig?.playerTeams,
            modifiers: lobby.gameConfig?.publicGameModifiers,
            hostGold: {
              startingGold: lobby.gameConfig?.startingGold,
              goldMultiplier: lobby.gameConfig?.goldMultiplier,
            },
            criteriaCount: this.criteriaList.length,
            matched,
          });
        }
        if (!matched) return;

        if (isLive) liveMatchSources.add(queue);
        else hasSeeAllOnlyMatch = true;
        seeAllMatchIds.add(lobby.gameID);

        const notificationKey = this.getNotificationKey(lobby);
        matchedKeys.add(notificationKey);
        if (!this.seenLobbies.has(notificationKey)) {
          newAlerts.push({ key: notificationKey, gameID: lobby.gameID });
        }
        if (!this.desktopNotifiedLobbies.has(notificationKey)) {
          newMatches.push({ lobby, queue, seeAllOnly });
        }
      };

      for (const [queue, queueLobbies] of queues) {
        queueLobbies.forEach((lobby, index) => evaluate(lobby, queue, index));
      }

      this.updateQueueCardPulses(liveMatchSources);
      this.updateSeeAllSignals(hasSeeAllOnlyMatch, seeAllMatchIds);
      this.boardAlerts.retain(matchedKeys);
      for (const { key, gameID } of newAlerts) this.startBoardAlert(key, gameID);
      if (newAlerts.length > 0) {
        this.lastMatchTime = Date.now();
        if (this.soundEnabled) SoundUtils.playGameFoundSound();
      }
      if (this.desktopNotificationsEnabled) {
        const deliveredKeys = new Set<string>();
        for (const { lobby, queue, seeAllOnly } of newMatches) {
          const content = getBrowserNotificationContent(lobby);
          const key = this.getNotificationKey(lobby);
          const delivered = BrowserNotificationUtils.show({
            title: content.title,
            body: content.body,
            tag: key,
            // Runs only from the user's click on the notification.
            onClick: seeAllOnly ? () => this.openSeeAllView(queue) : undefined,
          });
          if (delivered) deliveredKeys.add(key);
        }
        this.desktopNotifiedLobbies = new Set([
          ...[...this.desktopNotifiedLobbies].filter((k) => matchedKeys.has(k)),
          ...deliveredKeys,
        ]);
      } else {
        this.desktopNotifiedLobbies.clear();
      }

      this.seenLobbies = matchedKeys;
      if (matchedKeys.size === 0) this.lastMatchTime = null;
      this.updateStatusText();
    } catch (error) {
      console.error('[LobbyDiscovery] Error processing lobbies:', error);
    } finally {
      // The board needs the alert state, so it draws after the matching.
      this.updateLobbyBoard(lobbies);
    }
  }

  private startBoardAlert(key: string, gameID: string): void {
    this.boardAlerts.alert(key, gameID, Date.now());
    const timer = setTimeout(() => {
      this.pulseEndTimers.delete(timer);
      this.updateLobbyBoard(this.lastLobbies);
    }, PULSE_DURATION_MS);
    this.pulseEndTimers.add(timer);
  }

  private handleCardSeen(gameID: string): void {
    this.boardAlerts.markSeen(gameID);
    this.updateLobbyBoard(this.lastLobbies);
  }

  private updateLobbyBoard(lobbies: Lobby[]): void {
    if (this.sleeping || !this.isDiscoveryFeedbackAllowed()) {
      this.lobbyBoard.hide();
      return;
    }
    const isActive = this.discoveryEnabled && this.criteriaList.length > 0;
    const matchedIds = new Set<string>();
    if (isActive) {
      for (const lobby of lobbies) {
        const excluded = !this.includeHostedAndCustomLobbies && isHostConfiguredLobby(lobby);
        if (!excluded && this.engine.matchesCriteria(lobby, this.criteriaList, this.mapFilter)) {
          matchedIds.add(lobby.gameID);
        }
      }
    }
    this.lobbyBoard.render({
      lobbies,
      matchedIds: isActive ? matchedIds : null,
      clockOffsetMs: this.clockOffsetMs,
      alerts: this.boardAlerts.getStates(Date.now()),
    });
  }

  private getNotificationKey(lobby: Lobby): string {
    return JSON.stringify({
      gameID: lobby.gameID,
      map: lobby.gameConfig?.gameMap ?? null,
      mode: lobby.gameConfig?.gameMode ?? null,
      playerTeams: lobby.gameConfig?.playerTeams ?? lobby.gameConfig?.teamCount ?? null,
      capacity: lobby.gameConfig?.maxPlayers ?? lobby.maxClients ?? null,
      modifiers: lobby.gameConfig?.publicGameModifiers ?? {},
    });
  }

  private isDiscoveryFeedbackAllowed(): boolean {
    if (!LobbyUtils.isOnLobbyPage()) return false;

    // Opening the See All View hides the play page; matching must keep running there.
    const pagePlay = document.getElementById('page-play');
    if (pagePlay?.classList.contains('hidden') && !this.isSeeAllViewVisible()) return false;

    const publicLobby = document.querySelector('public-lobby') as
      | { isLobbyHighlighted?: boolean }
      | null;
    if (publicLobby?.isLobbyHighlighted === true) return false;

    const joinLobbyModal = document.querySelector('join-lobby-modal') as
      | { currentLobbyId?: string }
      | null;
    if (joinLobbyModal?.currentLobbyId) return false;

    const hostLobbyModal = document.querySelector('host-lobby-modal') as
      | { lobbyId?: string }
      | null;
    if (hostLobbyModal?.lobbyId) return false;

    return true;
  }

  private getQueueCardElements(): Partial<Record<QueueSource, HTMLElement>> {
    const selector = document.querySelector('game-mode-selector') as HTMLElement | null;
    if (!selector) return {};

    const grid = Array.from(selector.querySelectorAll('div')).find((element) =>
      element.className.includes('sm:grid-cols-[2fr_1fr]')
    );
    if (!(grid instanceof HTMLElement)) return {};

    // Lit skips the cell of an absent Queue, so the Team and Special positions come from the lobby data.
    const gridChildren = Array.from(grid.children) as HTMLElement[];
    const ffaCell = gridChildren.find(
      (el) => el.className.includes('sm:col-start-1') && el.className.includes('sm:row-start-2')
    );
    const section = gridChildren.find((el) => el.tagName === 'SECTION');
    const cardCells = section
      ? (Array.from(section.children) as HTMLElement[]).filter((el) => el.tagName === 'DIV')
      : [];

    const games = (selector as unknown as { lobbies?: { games?: Record<string, unknown[]> } })
      .lobbies?.games;
    const hasTeam = Array.isArray(games?.['team']) && games!['team'].length > 0;
    const hasSpecial = Array.isArray(games?.['special']) && games!['special'].length > 0;
    const teamCell = hasTeam ? cardCells[0] : undefined;
    const specialCell = hasSpecial ? cardCells[hasTeam ? 1 : 0] : undefined;

    return {
      ffa: ffaCell?.querySelector('button') as HTMLElement | undefined,
      team: teamCell?.querySelector('button') as HTMLElement | undefined,
      special: specialCell?.querySelector('button') as HTMLElement | undefined,
    };
  }

  private updateQueueCardPulses(nextSources: Set<QueueSource>): void {
    this.activeMatchSources = new Set(nextSources);
    this.applyQueueCardPulses();
    this.scheduleQueueCardPulseSync();
  }

  private isSeeAllViewVisible(): boolean {
    const view = document.getElementById(SEE_ALL_VIEW_ID);
    return !!view && !view.classList.contains('hidden');
  }

  private getSeeAllButton(): HTMLElement | null {
    return document.querySelector(
      'game-mode-selector button[class~="group/upcoming"]'
    ) as HTMLElement | null;
  }

  private updateSeeAllSignals(pulse: boolean, matchIds: Set<string>): void {
    this.seeAllPulseActive = pulse;
    this.seeAllMatchIds = matchIds;
    this.applySeeAllSignals();
  }

  private applySeeAllSignals(): void {
    this.getSeeAllButton()?.classList.toggle('of-discovery-card-active', this.seeAllPulseActive);
    this.observeSeeAllView();
    this.applySeeAllHighlights();
  }

  // The See All View renders its cards lazily and re-renders them on every feed
  // update, so the highlight is re-applied whenever its children change.
  private observeSeeAllView(): void {
    const view = document.getElementById(SEE_ALL_VIEW_ID);
    if (!view || view === this.observedSeeAllView) return;
    this.seeAllObserver?.disconnect();
    this.seeAllObserver = new MutationObserver(() => this.applySeeAllHighlights());
    this.seeAllObserver.observe(view, { childList: true, subtree: true });
    this.observedSeeAllView = view;
  }

  private applySeeAllHighlights(): void {
    const view = document.getElementById(SEE_ALL_VIEW_ID);
    if (!view) return;
    for (const slot of Array.from(view.querySelectorAll<HTMLElement>('[data-lobby-slot]'))) {
      slot.classList.toggle(SEE_ALL_MATCH_CLASS, this.seeAllMatchIds.has(slot.dataset.lobbySlot ?? ''));
    }
  }

  /** Opens the See All View on the lobby's Queue. Call only from a user click. */
  private openSeeAllView(queue: QueueSource): void {
    getPageWindow().showPage?.(SEE_ALL_VIEW_ID);
    // The view has no Hosted tab; its default "All" tab shows every Queue.
    if (queue === 'hosted') return;
    const view = document.getElementById(SEE_ALL_VIEW_ID) as
      | (HTMLElement & { open?: (args: { tab: string }) => void })
      | null;
    view?.open?.({ tab: queue });
  }

  private applyQueueCardPulses(): void {
    const cards = this.getQueueCardElements();
    for (const source of ['ffa', 'special', 'team'] as const) {
      const card = cards[source];
      if (!card) continue;
      card.classList.toggle('of-discovery-card-active', this.activeMatchSources.has(source));
    }
  }

  private scheduleQueueCardPulseSync(): void {
    if (this.pulseSyncTimeout) clearTimeout(this.pulseSyncTimeout);
    this.pulseSyncTimeout = setTimeout(() => {
      this.pulseSyncTimeout = null;
      this.applyQueueCardPulses();
      this.applySeeAllSignals();
    }, 16);
  }

  /**
   * Read OpenFront's asset manifest + CDN base from the page globals so board
   * cards reuse the exact CDN map thumbnails. Returns nulls when unavailable
   * (e.g. unsafeWindow not granted, or in tests).
   */
  private getAssetContext(): { manifest: Record<string, string> | null; cdnBase: string | null } {
    const win = getPageWindow();
    // OpenFront v0.32 reads assets from window.BOOTSTRAP_CONFIG, with the
    // globalThis.__ASSET_MANIFEST__/__CDN_BASE__ pair as its own fallback. Mirror
    // that precedence so board cards reuse the exact fingerprinted CDN
    // thumbnails; see OpenFront packages/shared/src/AssetUrls.ts (getAssetManifest/getCdnBase).
    return {
      manifest: win.BOOTSTRAP_CONFIG?.assetManifest ?? win.__ASSET_MANIFEST__ ?? null,
      cdnBase: win.BOOTSTRAP_CONFIG?.cdnBase ?? win.__CDN_BASE__ ?? null,
    };
  }

  private navigateToGame(url: string): void {
    window.location.assign(url);
  }

  private stopTimer(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  private startGameInfoUpdates(): void {
    this.stopGameInfoUpdates();
    this.updateCurrentGameInfo();
    this.gameInfoInterval = setInterval(() => this.updateCurrentGameInfo(), 1000);
  }

  private stopGameInfoUpdates(): void {
    if (this.gameInfoInterval) {
      clearInterval(this.gameInfoInterval);
      this.gameInfoInterval = null;
    }
  }

  private syncSearchTimer(options: { resetStart?: boolean } = {}): void {
    const { resetStart = false } = options;

    this.stopTimer();

    if (resetStart) {
      this.searchStartTime = null;
      this.lastMatchTime = null;
      this.seenLobbies.clear();
      this.desktopNotifiedLobbies.clear();
    }

    if (
      this.discoveryEnabled &&
      this.criteriaList.length > 0 &&
      this.isDiscoveryFeedbackAllowed()
    ) {
      if (this.searchStartTime === null) this.searchStartTime = Date.now();
      this.timerInterval = setInterval(() => this.updateStatusText(), 1000);
    } else {
      this.searchStartTime = null;
      this.lastMatchTime = null;
    }

    this.updateStatusText();
    this.updatePulseIndicator();
  }

  private updatePulseIndicator(): void {
    const pulse = document.querySelector('.ld-pulse') as HTMLElement | null;
    if (!pulse) return;
    const active = this.discoveryEnabled && this.criteriaList.length > 0;
    pulse.classList.toggle('is-paused', !active);
  }

  private setDiscoveryEnabled(enabled: boolean, options: { resetTimer?: boolean } = {}): void {
    this.discoveryEnabled = enabled;
    this.saveSettings();
    this.updateStatusLabel();
    this.syncSearchTimer({ resetStart: options.resetTimer ?? false });
  }

  private updateStatusLabel(): void {
    const label = document.querySelector('.ld-status-text strong') as HTMLElement | null;
    if (!label) return;
    label.textContent = this.discoveryEnabled ? 'Discovery active' : 'Discovery paused';
  }

  private setIconButtonState(checkboxId: string, on: boolean): void {
    const btn = document
      .getElementById(checkboxId)
      ?.closest('.ld-icon-btn') as HTMLElement | null;
    if (btn) btn.classList.toggle('is-on', on);
  }

  private loadUIFromSettings(): void {
    const soundCheckbox = document.getElementById('discovery-sound-toggle') as HTMLInputElement | null;
    if (soundCheckbox) {
      soundCheckbox.checked = this.soundEnabled;
      this.setIconButtonState('discovery-sound-toggle', this.soundEnabled);
    }

    const desktopCheckbox = document.getElementById('discovery-desktop-toggle') as HTMLInputElement | null;
    if (desktopCheckbox) {
      desktopCheckbox.checked = this.desktopNotificationsEnabled;
      this.setIconButtonState('discovery-desktop-toggle', this.desktopNotificationsEnabled);
    }

    this.updateStatusLabel();
  }

  private async handleDesktopNotificationToggleChange(
    desktopToggle: HTMLInputElement
  ): Promise<void> {
    const requestId = ++this.desktopNotificationRequestId;

    if (!desktopToggle.checked) {
      this.desktopNotificationsEnabled = false;
      this.setIconButtonState('discovery-desktop-toggle', false);
      this.saveSettings();
      return;
    }

    const granted = await BrowserNotificationUtils.ensurePermission();
    if (
      requestId !== this.desktopNotificationRequestId ||
      this.isDisposed ||
      !desktopToggle.isConnected ||
      !desktopToggle.checked
    ) {
      return;
    }

    this.desktopNotificationsEnabled = granted;
    desktopToggle.checked = granted;
    desktopToggle.toggleAttribute('checked', granted);
    this.setIconButtonState('discovery-desktop-toggle', granted);
    this.saveSettings();
  }

  private setupEventListeners(): void {
    document.getElementById('discovery-status')?.addEventListener('click', () => {
      this.setDiscoveryEnabled(!this.discoveryEnabled, { resetTimer: true });
    });

    for (const id of ['discovery-sound-toggle', 'discovery-desktop-toggle']) {
      const element = document.getElementById(id) as HTMLInputElement | null;
      element?.addEventListener('change', () => {
        if (id === 'discovery-sound-toggle') {
          this.soundEnabled = element.checked;
          this.setIconButtonState('discovery-sound-toggle', element.checked);
          this.saveSettings();
          return;
        }
        void this.handleDesktopNotificationToggleChange(element);
      });
    }
  }

  private renderIconButton(id: string, title: string, svg: string): string {
    return `
      <label class="ld-icon-btn" title="${title}" aria-label="${title}">
        <input type="checkbox" id="${id}">${svg}
      </label>
    `;
  }

  private createUI(): void {
    if (document.getElementById('openfront-discovery-panel')) return;

    this.panel = document.createElement('div');
    this.panel.id = 'openfront-discovery-panel';
    this.panel.className = 'of-panel discovery-panel';
    this.panel.style.width = '380px';
    this.panel.innerHTML = `
      <div class="ld-status">
        <span class="ld-pulse" aria-hidden="true"></span>
        <div class="ld-status-text" id="discovery-status" role="button" tabindex="0">
          <strong>Discovery active</strong>
          <span class="sep">·</span>
          <span class="meta" id="discovery-search-timer"></span>
        </div>
        <div class="ld-icons">
          ${this.renderIconButton('discovery-sound-toggle', 'Sound alert', ICON_SOUND)}
          ${this.renderIconButton('discovery-desktop-toggle', 'Desktop notification', ICON_BELL)}
        </div>
      </div>
      <div class="ld-head">
        <div class="ld-eyebrow">Notify + quick-join · never auto-joins</div>
        <h2 class="ld-title">OpenFront Game Notifier</h2>
      </div>
    `;

    document.body.appendChild(this.panel);

    this.filters.mount(this.panel);
    this.setupEventListeners();
    this.loadUIFromSettings();

    this.syncSearchTimer();
    this.startGameInfoUpdates();
  }

  private updateSleepState(): void {
    const onLobby = LobbyUtils.isOnLobbyPage();
    this.sleeping = !onLobby;

    if (this.sleeping) {
      this.panel.classList.add('hidden');
      this.stopTimer();
      this.stopGameInfoUpdates();
      this.updateQueueCardPulses(new Set());
      this.updateSeeAllSignals(false, new Set());
      this.lobbyBoard.hide();
    } else {
      this.panel.classList.remove('hidden');
      this.syncSearchTimer();
      this.startGameInfoUpdates();
      this.updateLobbyBoard(this.lastLobbies);
    }
  }

  cleanup(): void {
    this.isDisposed = true;
    this.stopTimer();
    this.stopGameInfoUpdates();
    if (this.pulseSyncTimeout) {
      clearTimeout(this.pulseSyncTimeout);
      this.pulseSyncTimeout = null;
    }
    this.activeMatchSources.clear();
    this.applyQueueCardPulses();
    this.updateSeeAllSignals(false, new Set());
    this.seeAllObserver?.disconnect();
    this.seeAllObserver = null;
    this.observedSeeAllView = null;
    for (const timer of this.pulseEndTimers) clearTimeout(timer);
    this.pulseEndTimers.clear();
    this.boardAlerts.clear();
    this.lobbyBoard.dispose();
    this.filters.cleanup();
    this.panel.parentNode?.removeChild(this.panel);
  }
}
