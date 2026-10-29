/**
 * LobbyDiscoveryUI - notify-only discovery interface for matching lobbies.
 */

import { STORAGE_KEYS } from '@/config/constants';
import { LobbyUtils } from '@/utils/LobbyUtils';
import { BrowserNotificationUtils } from '@/utils/BrowserNotificationUtils';
import { SoundUtils } from '@/utils/SoundUtils';
import { URLObserver } from '@/utils/URLObserver';
import { escapeHtml } from '@/utils/HtmlUtils';
import type { Lobby } from '@/types/game';
import type {
  DiscoveryCriteria,
  LobbyDiscoverySettings,
  MapFilter,
  QueueSource,
} from './LobbyDiscoveryTypes';
import { LobbyDiscoveryEngine } from './LobbyDiscoveryEngine';
import type { UpcomingCardModel } from './LobbyDiscoveryHelpers';
import {
  buildUpcomingCardModel,
  formatElapsedSince,
  getBrowserNotificationContent,
  getGameDetailsText,
  getLobbyQueueSource,
  isHostConfiguredLobby,
  normalizeSettings,
} from './LobbyDiscoveryHelpers';
import { LobbyDiscoveryFilters, type FilterChange } from './LobbyDiscoveryFilters';
import { LobbyBoardView } from './LobbyBoardView';

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

interface LobbySlot {
  live?: Lobby;
  upcoming?: Lobby;
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

// Order of slots in the Up Next strip: FFA in the wide left column, special
// then team stacked in the narrow right column — mirroring the native grid.
const UPCOMING_SOURCE_ORDER: QueueSource[] = ['ffa', 'special', 'team'];

const ICON_PLAYERS = `<svg viewBox="0 0 20 20" fill="currentColor"><path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z"/></svg>`;

const ICON_SOUND = `<svg viewBox="0 0 24 24"><path d="M11 5L6 9H2v6h4l5 4V5z"/><path d="M15.5 8.5a5 5 0 010 7"/><path d="M19 5a9 9 0 010 14"/></svg>`;
const ICON_BELL = `<svg viewBox="0 0 24 24"><path d="M6 8a6 6 0 1112 0c0 7 3 9 3 9H3s3-2 3-9z"/><path d="M10.3 21a1.94 1.94 0 003.4 0"/></svg>`;

export class LobbyDiscoveryUI {
  private discoveryEnabled = true;
  private searchStartTime: number | null = null;
  private lastMatchTime: number | null = null;
  private soundEnabled = true;
  private desktopNotificationsEnabled = false;
  private notifyUpcomingEnabled = true;
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
  private upcomingStrip: HTMLDivElement | null = null;
  private lastUpcomingSlots: Map<QueueSource, LobbySlot> = new Map();
  private lastUpcomingMatchSources: Set<QueueSource> = new Set();
  // Per-slot render signature: lets us skip rebuilding a card whose content is
  // unchanged, so the ~1s lobby refresh (and the 16ms pulse re-apply) don't
  // swap the DOM node under the cursor and restart the hover animation.
  private upcomingSlotSignatures: Map<QueueSource, string> = new Map();

  private timerInterval: ReturnType<typeof setInterval> | null = null;
  private gameInfoInterval: ReturnType<typeof setInterval> | null = null;
  private pulseSyncTimeout: ReturnType<typeof setTimeout> | null = null;

  private panel!: HTMLDivElement;
  private filters!: LobbyDiscoveryFilters;
  private engine: LobbyDiscoveryEngine;
  private lobbyBoard: LobbyBoardView;
  // Offset to add to the local clock to get the feed's clock.
  private clockOffsetMs = 0;

  constructor() {
    this.engine = new LobbyDiscoveryEngine();
    this.lobbyBoard = new LobbyBoardView({
      onJoin: (gameID) => this.navigateToGame(`/game/${gameID}`),
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
    this.notifyUpcomingEnabled = settings.notifyUpcomingEnabled ?? true;
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
      notifyUpcomingEnabled: this.notifyUpcomingEnabled,
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

  /** The Up Next strip shows the first two lobbies of the FFA, Team and Special Queues. */
  private toUpNextSlots(queues: Map<QueueSource, Lobby[]>): Map<QueueSource, LobbySlot> {
    const slots = new Map<QueueSource, LobbySlot>();
    for (const queue of UPCOMING_SOURCE_ORDER) {
      const queueLobbies = queues.get(queue);
      if (queueLobbies?.length) {
        slots.set(queue, { live: queueLobbies[0], upcoming: queueLobbies[1] });
      }
    }
    return slots;
  }

  private processLobbies(lobbies: Lobby[]): void {
    try {
      this.updateLobbyBoard(lobbies);
      this.updateCurrentGameInfo();
      this.syncSearchTimer();

      const queues = this.parseQueues(lobbies);
      const slots = this.toUpNextSlots(queues);
      this.filters.addFeedOnlyMaps(lobbies);

      if (
        !this.discoveryEnabled ||
        this.criteriaList.length === 0 ||
        !this.isDiscoveryFeedbackAllowed()
      ) {
        this.seenLobbies.clear();
        this.desktopNotifiedLobbies.clear();
        this.updateQueueCardPulses(new Set());
        this.updateSeeAllSignals(false, new Set());
        // Display is independent of notification gating: still surface the
        // upcoming games (without any match highlight) while on the lobby page.
        this.renderUpcomingStrip(slots, new Set());
        this.updateStatusText();
        return;
      }

      // Signals: Live Lobby → home card; index 1 → Up Next card; others and Hosted → "See all" button.
      const liveMatchSources = new Set<QueueSource>();
      const upcomingMatchSources = new Set<QueueSource>();
      const seeAllMatchIds = new Set<string>();
      let hasSeeAllOnlyMatch = false;
      const matchedKeys = new Set<string>();
      const newMatches: DiscoveryMatch[] = [];
      let hasNewMatch = false;

      const debugEnabled = isDebugEnabled();
      const evaluate = (lobby: Lobby, queue: QueueSource, index: number): void => {
        if (!this.includeHostedAndCustomLobbies && isHostConfiguredLobby(lobby)) return;

        const isLive = queue !== 'hosted' && index === 0;
        const seeAllOnly = queue === 'hosted' || index > 1;
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

        if (isLive) {
          liveMatchSources.add(queue);
        } else {
          if (!this.notifyUpcomingEnabled) return;
          if (seeAllOnly) hasSeeAllOnlyMatch = true;
          else upcomingMatchSources.add(queue);
        }
        seeAllMatchIds.add(lobby.gameID);

        const notificationKey = this.getNotificationKey(lobby);
        matchedKeys.add(notificationKey);
        if (!this.seenLobbies.has(notificationKey)) hasNewMatch = true;
        if (!this.desktopNotifiedLobbies.has(notificationKey)) {
          newMatches.push({ lobby, queue, seeAllOnly });
        }
      };

      for (const [queue, queueLobbies] of queues) {
        queueLobbies.forEach((lobby, index) => evaluate(lobby, queue, index));
      }

      this.updateQueueCardPulses(liveMatchSources);
      this.updateSeeAllSignals(hasSeeAllOnlyMatch, seeAllMatchIds);
      this.renderUpcomingStrip(slots, upcomingMatchSources);
      if (hasNewMatch) {
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
    }
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
      // Lit re-renders the native grid; re-apply the Up Next strip from the
      // last known state so it survives a re-render that lands within 16 ms.
      this.renderUpcomingStrip(this.lastUpcomingSlots, this.lastUpcomingMatchSources);
    }, 16);
  }

  /**
   * Read OpenFront's asset manifest + CDN base from the page globals so upcoming
   * cards reuse the exact CDN map thumbnails. Returns nulls when unavailable
   * (e.g. unsafeWindow not granted, or in tests).
   */
  private getAssetContext(): { manifest: Record<string, string> | null; cdnBase: string | null } {
    const win = getPageWindow();
    // OpenFront v0.32 reads assets from window.BOOTSTRAP_CONFIG, with the
    // globalThis.__ASSET_MANIFEST__/__CDN_BASE__ pair as its own fallback. Mirror
    // that precedence so upcoming cards reuse the exact fingerprinted CDN
    // thumbnails; see OpenFront packages/shared/src/AssetUrls.ts (getAssetManifest/getCdnBase).
    return {
      manifest: win.BOOTSTRAP_CONFIG?.assetManifest ?? win.__ASSET_MANIFEST__ ?? null,
      cdnBase: win.BOOTSTRAP_CONFIG?.cdnBase ?? win.__CDN_BASE__ ?? null,
    };
  }

  private ensureUpcomingStrip(): HTMLDivElement | null {
    const existing = document.getElementById('of-upcoming-strip') as HTMLDivElement | null;
    if (existing) {
      this.upcomingStrip = existing;
      return existing;
    }

    const selector = document.querySelector('game-mode-selector');
    if (!selector || !selector.parentNode) return null;

    const strip = document.createElement('div');
    strip.id = 'of-upcoming-strip';
    strip.className = 'of-upcoming';
    strip.innerHTML = `
      <div class="of-upcoming-head">
        <span class="of-upcoming-lbl">Up Next</span>
        <span class="of-upcoming-rule"></span>
        <label class="of-upcoming-toggle">
          <input type="checkbox" id="of-upcoming-toggle">
          <span class="of-upcoming-sw" aria-hidden="true"></span>
          <span>Notify on upcoming games</span>
        </label>
      </div>
      <div class="of-upcoming-grid">
        <div class="of-upcoming-slot" data-source="ffa"></div>
        <div class="of-upcoming-col">
          <div class="of-upcoming-slot" data-source="special"></div>
          <div class="of-upcoming-slot" data-source="team"></div>
        </div>
      </div>
    `;

    selector.parentNode.insertBefore(strip, selector.nextSibling);
    this.upcomingStrip = strip;
    // Fresh DOM — invalidate cached signatures so every slot re-renders once.
    this.upcomingSlotSignatures.clear();

    const toggle = strip.querySelector('#of-upcoming-toggle') as HTMLInputElement | null;
    if (toggle) {
      toggle.checked = this.notifyUpcomingEnabled;
      toggle.addEventListener('change', () => {
        this.notifyUpcomingEnabled = toggle.checked;
        this.saveSettings();
        this.processLobbies(this.lastLobbies);
      });
    }

    return strip;
  }

  private renderUpcomingStrip(
    slots: Map<QueueSource, LobbySlot>,
    matchedSources: Set<QueueSource>
  ): void {
    this.lastUpcomingSlots = slots;
    this.lastUpcomingMatchSources = matchedSources;

    const strip = this.ensureUpcomingStrip();
    if (!strip) return;

    const visible = !this.sleeping && this.isDiscoveryFeedbackAllowed();
    strip.style.display = visible ? '' : 'none';
    if (!visible) return;

    const toggle = strip.querySelector('#of-upcoming-toggle') as HTMLInputElement | null;
    if (toggle && toggle.checked !== this.notifyUpcomingEnabled) {
      toggle.checked = this.notifyUpcomingEnabled;
    }

    const { manifest, cdnBase } = this.getAssetContext();

    for (const source of UPCOMING_SOURCE_ORDER) {
      const container = strip.querySelector(
        `.of-upcoming-slot[data-source="${source}"]`
      ) as HTMLElement | null;
      if (!container) continue;

      const slot = slots.get(source);
      const matched = matchedSources.has(source);
      // Only show a slot that exists in the live grid (has a featured `[0]`),
      // so the Up Next columns line up with the native lobby cards.
      const model =
        slot?.live && slot.upcoming
          ? buildUpcomingCardModel(slot.upcoming, manifest, cdnBase)
          : null;

      const signature = !slot?.live
        ? 'hidden'
        : !model
          ? 'empty'
          : JSON.stringify([
              model.gameID,
              matched,
              model.mapName,
              model.modeText,
              model.capacityLabel,
              model.modifierLabels,
              model.thumbnailUrl,
            ]);

      // Skip slots whose rendered content is identical — this is what prevents
      // the hover flicker on every refresh.
      if (this.upcomingSlotSignatures.get(source) === signature) continue;
      this.upcomingSlotSignatures.set(source, signature);

      if (signature === 'hidden') {
        container.style.display = 'none';
        container.replaceChildren();
      } else if (signature === 'empty') {
        container.style.display = '';
        const empty = document.createElement('div');
        empty.className = 'of-upcoming-empty';
        empty.textContent = 'No upcoming game';
        container.replaceChildren(empty);
      } else {
        container.style.display = '';
        container.replaceChildren(this.buildUpcomingCardElement(model!, matched));
      }
    }
  }

  private buildUpcomingCardElement(model: UpcomingCardModel, matched: boolean): HTMLButtonElement {
    const card = document.createElement('button');
    card.type = 'button';
    // A matched upcoming card reuses the live match beacon (of-discovery-card-active)
    // for identical highlight parity, plus a marker class for chip/tag emphasis.
    card.className = `of-upcoming-card${
      matched ? ' of-upcoming-card-match of-discovery-card-active' : ''
    }`;

    // Cap the visible modifier tags so a heavily-modified lobby can't stack tags
    // down over the map name; the overflow collapses into a "+N" chip.
    const MAX_VISIBLE_TAGS = 3;
    const shownLabels = model.modifierLabels.slice(0, MAX_VISIBLE_TAGS);
    const extraTags = model.modifierLabels.length - shownLabels.length;
    let tagsHtml = shownLabels
      .map((label) => `<span class="of-upcoming-tag">${escapeHtml(label)}</span>`)
      .join('');
    if (extraTags > 0) {
      tagsHtml += `<span class="of-upcoming-tag of-upcoming-tag-more">+${extraTags}</span>`;
    }

    const artHtml = model.thumbnailUrl
      ? `<img src="${escapeHtml(model.thumbnailUrl)}" alt="" loading="lazy">`
      : '';
    const chipText = matched ? 'Match · up next' : 'Up next';

    // No bespoke "Join" button: the whole card is clickable and scales on hover,
    // exactly like OpenFront's native lobby cards, so the affordance is already
    // familiar. The aria-label keeps the manual-join intent accessible.
    card.setAttribute('aria-label', `Open ${model.mapName} in OpenFront's join modal`);

    card.innerHTML = `
      <span class="of-upcoming-art">${artHtml}</span>
      <span class="of-upcoming-toprow">
        <span class="of-upcoming-tags">${tagsHtml}</span>
        <span class="of-upcoming-chip"><span class="of-upcoming-dot"></span>${chipText}</span>
      </span>
      <span class="of-upcoming-bot">
        <span class="of-upcoming-name">${escapeHtml(model.mapName)}</span>
        <span class="of-upcoming-metarow">
          <span class="of-upcoming-mode">${escapeHtml(model.modeText)}</span>
          ${
            model.capacityLabel
              ? `<span class="of-upcoming-count">${ICON_PLAYERS}${escapeHtml(model.capacityLabel)}</span>`
              : ''
          }
        </span>
      </span>
    `;

    // User-gesture only: navigation happens solely from this real click event,
    // never from matching, watchers, or timers. OpenFront's router opens its
    // own join modal; the user still confirms entry there.
    card.addEventListener('click', () => this.navigateToGame(`/game/${model.gameID}`));

    return card;
  }

  private navigateToGame(url: string): void {
    window.location.assign(url);
  }

  private hideUpcomingStrip(): void {
    if (this.upcomingStrip) this.upcomingStrip.style.display = 'none';
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
      this.hideUpcomingStrip();
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
    this.upcomingStrip?.parentNode?.removeChild(this.upcomingStrip);
    this.upcomingStrip = null;
    this.lastUpcomingSlots = new Map();
    this.lastUpcomingMatchSources = new Set();
    this.upcomingSlotSignatures.clear();
    this.lobbyBoard.dispose();
    this.filters.cleanup();
    this.panel.parentNode?.removeChild(this.panel);
  }
}
