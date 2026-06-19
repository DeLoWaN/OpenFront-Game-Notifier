/**
 * LobbyDiscoveryUI - notify-only discovery interface for matching lobbies.
 */

import { STORAGE_KEYS, TEAM_PLAYERS_PER_TEAM_STOPS, TEAM_MIN_PLAYERS_PER_TEAM, TEAM_MAX_PLAYERS_PER_TEAM } from '@/config/constants';
import { LobbyUtils } from '@/utils/LobbyUtils';
import { BrowserNotificationUtils } from '@/utils/BrowserNotificationUtils';
import { SoundUtils } from '@/utils/SoundUtils';
import { URLObserver } from '@/utils/URLObserver';
import type { Lobby } from '@/types/game';
import type {
  DiscoveryCriteria,
  LobbyDiscoverySettings,
  ModifierFilters,
  ModifierFilterState,
  QueueSource,
  TeamCount,
} from './LobbyDiscoveryTypes';
import { LobbyDiscoveryEngine } from './LobbyDiscoveryEngine';
import type { UpcomingCardModel } from './LobbyDiscoveryHelpers';
import {
  buildUpcomingCardModel,
  formatElapsedSince,
  getBrowserNotificationContent,
  getGameDetailsText,
  getLobbyQueueSource,
  normalizeSettings,
} from './LobbyDiscoveryHelpers';
import { RangeSlider } from '@/modules/lobby-discovery/RangeSlider';

const STARTING_GOLD_VALUES = [1_000_000, 5_000_000, 25_000_000] as const;
const GOLD_MULTIPLIER_VALUES = [2] as const;

const MODIFIER_BOOLEAN_IDS = [
  'modifier-isCompact',
  'modifier-isRandomSpawn',
  'modifier-isCrowded',
  'modifier-isHardNations',
  'modifier-isAlliancesDisabled',
  'modifier-isPortsDisabled',
  'modifier-isNukesDisabled',
  'modifier-isSAMsDisabled',
  'modifier-isPeaceTime',
  'modifier-isWaterNukes',
] as const;

const TEAM_PRESET_IDS: Array<[string, string, number | null]> = [
  ['discovery-team-hvn', 'Humans Vs Nations', null],
];

const TEAM_COUNT_IDS: Array<[string, string]> = [
  ['discovery-team-2', '2'],
  ['discovery-team-3', '3'],
  ['discovery-team-4', '4'],
  ['discovery-team-5', '5'],
  ['discovery-team-6', '6'],
  ['discovery-team-7', '7'],
  ['discovery-team-8plus', '8+'],
];

const ALL_TEAM_IDS: string[] = [
  ...TEAM_PRESET_IDS.map(([id]) => id),
  ...TEAM_COUNT_IDS.map(([id]) => id),
];

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

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Order of slots in the Up Next strip: FFA in the wide left column, special
// then team stacked in the narrow right column — mirroring the native grid.
const UPCOMING_SOURCE_ORDER: QueueSource[] = ['ffa', 'special', 'team'];

const ICON_PLAYERS = `<svg viewBox="0 0 20 20" fill="currentColor"><path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z"/></svg>`;

const ICON_CHECK = `<svg viewBox="0 0 24 24"><path d="M5 12l5 5L20 7"/></svg>`;
const ICON_CROSS = `<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>`;
const ICON_SOUND = `<svg viewBox="0 0 24 24"><path d="M11 5L6 9H2v6h4l5 4V5z"/><path d="M15.5 8.5a5 5 0 010 7"/><path d="M19 5a9 9 0 010 14"/></svg>`;
const ICON_BELL = `<svg viewBox="0 0 24 24"><path d="M6 8a6 6 0 1112 0c0 7 3 9 3 9H3s3-2 3-9z"/><path d="M10.3 21a1.94 1.94 0 003.4 0"/></svg>`;

export class LobbyDiscoveryUI {
  private discoveryEnabled = true;
  private criteriaList: DiscoveryCriteria[] = [];
  private searchStartTime: number | null = null;
  private lastMatchTime: number | null = null;
  private soundEnabled = true;
  private desktopNotificationsEnabled = false;
  private notifyUpcomingEnabled = true;
  private desktopNotificationRequestId = 0;
  private activeMatchSources: Set<QueueSource> = new Set();
  private seenLobbies: Set<string> = new Set();
  private desktopNotifiedLobbies: Set<string> = new Set();
  private isTeamTwoTimesMinEnabled = false;
  private ffaSlider: RangeSlider | null = null;
  private teamSlider: RangeSlider | null = null;
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
  private engine: LobbyDiscoveryEngine;

  constructor() {
    this.engine = new LobbyDiscoveryEngine();
    this.loadSettings();
    this.createUI();
    this.updateSleepState();
    URLObserver.subscribe(() => this.updateSleepState());
  }

  receiveLobbyUpdate(lobbies: Lobby[]): void {
    this.lastLobbies = lobbies;
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

    this.criteriaList = settings.criteria;
    this.soundEnabled = settings.soundEnabled;
    this.desktopNotificationsEnabled = settings.desktopNotificationsEnabled;
    this.discoveryEnabled = settings.discoveryEnabled;
    this.isTeamTwoTimesMinEnabled = settings.isTeamTwoTimesMinEnabled;
    this.notifyUpcomingEnabled = settings.notifyUpcomingEnabled ?? true;
  }

  private saveSettings(): void {
    GM_setValue(STORAGE_KEYS.lobbyDiscoverySettings, {
      criteria: this.criteriaList,
      discoveryEnabled: this.discoveryEnabled,
      soundEnabled: this.soundEnabled,
      desktopNotificationsEnabled: this.desktopNotificationsEnabled,
      isTeamTwoTimesMinEnabled: this.isTeamTwoTimesMinEnabled,
      notifyUpcomingEnabled: this.notifyUpcomingEnabled,
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
    const gameInfoElement = document.getElementById('discovery-current-game-info');
    if (!gameInfoElement || !LobbyUtils.isOnLobbyPage()) {
      if (gameInfoElement) gameInfoElement.style.display = 'none';
      return;
    }

    const publicLobby = document.querySelector('public-lobby') as any;
    if (!publicLobby || !Array.isArray(publicLobby.lobbies) || publicLobby.lobbies.length === 0) {
      gameInfoElement.style.display = 'none';
      return;
    }

    const currentLobby = publicLobby.lobbies[0];
    if (!currentLobby || !currentLobby.gameConfig) {
      gameInfoElement.style.display = 'none';
      return;
    }

    gameInfoElement.style.display = 'block';
    gameInfoElement.textContent = `Current game: ${getGameDetailsText(currentLobby)}`;
  }

  /**
   * Group the flattened lobby snapshot by source into its live (`[0]`) and
   * upcoming (`[1]`) entries. OpenFront's feed provides at most these two per
   * slot, in that order; `extractLobbies` preserves the ordering.
   */
  private parseSlots(lobbies: Lobby[]): Map<QueueSource, LobbySlot> {
    const slots = new Map<QueueSource, LobbySlot>();
    for (const lobby of lobbies) {
      const source = getLobbyQueueSource(lobby);
      if (!source) continue;
      const slot = slots.get(source) ?? {};
      if (!slot.live) slot.live = lobby;
      else if (!slot.upcoming) slot.upcoming = lobby;
      slots.set(source, slot);
    }
    return slots;
  }

  private processLobbies(lobbies: Lobby[]): void {
    try {
      this.updateCurrentGameInfo();
      this.syncSearchTimer();

      const slots = this.parseSlots(lobbies);

      if (
        !this.discoveryEnabled ||
        this.criteriaList.length === 0 ||
        !this.isDiscoveryFeedbackAllowed()
      ) {
        this.seenLobbies.clear();
        this.desktopNotifiedLobbies.clear();
        this.updateQueueCardPulses(new Set());
        // Display is independent of notification gating: still surface the
        // upcoming games (without any match highlight) while on the lobby page.
        this.renderUpcomingStrip(slots, new Set());
        this.updateStatusText();
        return;
      }

      // Live (featured `[0]`) matches pulse the native queue card. Upcoming
      // (`[1]`) matches highlight our own Up Next card and are gated behind the
      // notifyUpcoming toggle. Dedup keys include gameID, so live vs upcoming
      // for the same slot dedupe independently.
      const liveMatchSources = new Set<QueueSource>();
      const upcomingMatchSources = new Set<QueueSource>();
      const matchedKeys = new Set<string>();
      const newMatches: Lobby[] = [];
      let hasNewMatch = false;

      const debugEnabled = isDebugEnabled();
      const evaluate = (
        lobby: Lobby | undefined,
        source: QueueSource,
        kind: 'live' | 'upcoming'
      ): void => {
        if (!lobby) return;
        const matched = this.engine.matchesCriteria(lobby, this.criteriaList);
        if (debugEnabled) {
          console.log('[OF Discovery]', {
            lobbyId: lobby.gameID,
            source,
            kind,
            mode: lobby.gameConfig?.gameMode,
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

        if (kind === 'live') {
          liveMatchSources.add(source);
        } else {
          // Upcoming matches notify (and highlight) only when the toggle is on.
          if (!this.notifyUpcomingEnabled) return;
          upcomingMatchSources.add(source);
        }

        const notificationKey = this.getNotificationKey(lobby);
        matchedKeys.add(notificationKey);
        if (!this.seenLobbies.has(notificationKey)) hasNewMatch = true;
        if (!this.desktopNotifiedLobbies.has(notificationKey)) newMatches.push(lobby);
      };

      for (const [source, slot] of slots) {
        evaluate(slot.live, source, 'live');
        evaluate(slot.upcoming, source, 'upcoming');
      }

      this.updateQueueCardPulses(liveMatchSources);
      this.renderUpcomingStrip(slots, upcomingMatchSources);
      if (hasNewMatch) {
        this.lastMatchTime = Date.now();
        if (this.soundEnabled) SoundUtils.playGameFoundSound();
      }
      if (this.desktopNotificationsEnabled) {
        const deliveredKeys = new Set<string>();
        for (const lobby of newMatches) {
          const content = getBrowserNotificationContent(lobby);
          const key = this.getNotificationKey(lobby);
          const delivered = BrowserNotificationUtils.show({
            title: content.title,
            body: content.body,
            tag: key,
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

  private getNotificationKey(lobby: Lobby): string {
    return JSON.stringify({
      gameID: lobby.gameID,
      mode: lobby.gameConfig?.gameMode ?? null,
      playerTeams: lobby.gameConfig?.playerTeams ?? lobby.gameConfig?.teamCount ?? null,
      capacity: lobby.gameConfig?.maxPlayers ?? lobby.maxClients ?? null,
      modifiers: lobby.gameConfig?.publicGameModifiers ?? {},
    });
  }

  private isDiscoveryFeedbackAllowed(): boolean {
    if (!LobbyUtils.isOnLobbyPage()) return false;

    const pagePlay = document.getElementById('page-play');
    if (pagePlay?.classList.contains('hidden')) return false;

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

    const desktopGrid = Array.from(selector.querySelectorAll('div')).find((element) =>
      element.className.includes('sm:grid-cols-[2fr_1fr]')
    );
    if (!(desktopGrid instanceof HTMLElement)) return {};

    // Find columns by class, not by position. When a lobby slot is absent Lit
    // renders `nothing` (no DOM node), so positional destructuring breaks.
    // Left col: `hidden sm:block` (FFA). Right col: `hidden sm:flex sm:flex-col`.
    const gridChildren = Array.from(desktopGrid.children) as HTMLElement[];
    const leftColumn = gridChildren.find((el) => el.className.includes('sm:block'));
    const rightColumn = gridChildren.find((el) => el.className.includes('sm:flex-col'));
    const rightSections = rightColumn ? (Array.from(rightColumn.children) as HTMLElement[]) : [];

    // The right column renders special first, team second — but only the present
    // slots get a DOM node (Lit uses `nothing` for absent ones). Use the lobby
    // data to know which slots are live so we can map sections correctly.
    // Note: `selector.lobbies` is the Lit JS property updated synchronously;
    // the 16 ms deferred re-apply in scheduleQueueCardPulseSync() ensures the
    // DOM has caught up by the time pulses are finalised.
    const games = (selector as unknown as { lobbies?: { games?: Record<string, unknown[]> } })
      .lobbies?.games;
    const hasSpecial = Array.isArray(games?.['special']) && games!['special'].length > 0;
    const hasTeam = Array.isArray(games?.['team']) && games!['team'].length > 0;

    // Map sections: if both present → [0]=special, [1]=team; if only one → [0]=that one.
    const specialSection = hasSpecial ? rightSections[0] : undefined;
    const teamSection = hasTeam ? (hasSpecial ? rightSections[1] : rightSections[0]) : undefined;

    return {
      ffa: leftColumn?.querySelector('button') as HTMLElement | undefined,
      special: specialSection?.querySelector('button') as HTMLElement | undefined,
      team: teamSection?.querySelector('button') as HTMLElement | undefined,
    };
  }

  private updateQueueCardPulses(nextSources: Set<QueueSource>): void {
    this.activeMatchSources = new Set(nextSources);
    this.applyQueueCardPulses();
    this.scheduleQueueCardPulseSync();
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
    type AssetGlobals = {
      BOOTSTRAP_CONFIG?: { assetManifest?: Record<string, string>; cdnBase?: string };
      __ASSET_MANIFEST__?: Record<string, string>;
      __CDN_BASE__?: string;
    };
    let win: AssetGlobals | undefined;
    try {
      if (typeof unsafeWindow !== 'undefined') {
        win = unsafeWindow as unknown as AssetGlobals;
      }
    } catch {
      // unsafeWindow not granted — fall through to the page window
    }
    if (!win && typeof window !== 'undefined') {
      win = window as unknown as AssetGlobals;
    }
    // OpenFront v0.32 reads assets from window.BOOTSTRAP_CONFIG, with the
    // globalThis.__ASSET_MANIFEST__/__CDN_BASE__ pair as its own fallback. Mirror
    // that precedence so upcoming cards reuse the exact fingerprinted CDN
    // thumbnails; see OpenFront src/core/AssetUrls.ts (getAssetManifest/getCdnBase).
    // The earlier ASSET_MANIFEST/CDN_BASE globals were removed in v0.32, so reading
    // them yielded null and every card fell back to a non-existent relative path.
    return {
      manifest: win?.BOOTSTRAP_CONFIG?.assetManifest ?? win?.__ASSET_MANIFEST__ ?? null,
      cdnBase: win?.BOOTSTRAP_CONFIG?.cdnBase ?? win?.__CDN_BASE__ ?? null,
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

  private getNumberValue(id: string): number | null {
    const input = document.getElementById(id) as HTMLInputElement | null;
    if (!input) return null;
    const val = parseInt(input.value, 10);
    return Number.isNaN(val) ? null : val;
  }

  private getModifierState(id: string): ModifierFilterState {
    const button = document.getElementById(id) as HTMLButtonElement | null;
    const state = button?.dataset.state;
    if (state === 'required' || state === 'blocked') return state;
    return 'any';
  }

  private setModifierState(id: string, state: ModifierFilterState): void {
    const button = document.getElementById(id) as HTMLButtonElement | null;
    if (!button) return;
    button.dataset.state = state;
    button.setAttribute('aria-pressed', String(state !== 'any'));
    const baseLabel = button.dataset.modName ?? button.getAttribute('aria-label') ?? '';
    const stateWord = state === 'blocked' ? 'excluded' : state;
    if (baseLabel) {
      button.setAttribute('aria-label', state === 'any' ? baseLabel : `${baseLabel} · ${stateWord}`);
    }
    const ind = button.querySelector('.ld-mod-ind') as HTMLElement | null;
    if (ind) {
      if (state === 'required') ind.innerHTML = ICON_CHECK;
      else if (state === 'blocked') ind.innerHTML = ICON_CROSS;
      else ind.innerHTML = '';
    }
  }

  private cycleModifierState(id: string): void {
    const cur = this.getModifierState(id);
    const next: ModifierFilterState =
      cur === 'any' ? 'required' : cur === 'required' ? 'blocked' : 'any';
    this.setModifierState(id, next);
  }

  private getNumericModifierState(
    ids: Record<number, string>
  ): Record<number, ModifierFilterState> | undefined {
    const states: Record<number, ModifierFilterState> = {};
    for (const [numericValue, id] of Object.entries(ids)) {
      states[Number(numericValue)] = this.getModifierState(id);
    }
    return states;
  }

  private getModifierFiltersFromUI(): ModifierFilters {
    return {
      isCompact: this.getModifierState('modifier-isCompact'),
      isRandomSpawn: this.getModifierState('modifier-isRandomSpawn'),
      isCrowded: this.getModifierState('modifier-isCrowded'),
      isHardNations: this.getModifierState('modifier-isHardNations'),
      isAlliancesDisabled: this.getModifierState('modifier-isAlliancesDisabled'),
      isPortsDisabled: this.getModifierState('modifier-isPortsDisabled'),
      isNukesDisabled: this.getModifierState('modifier-isNukesDisabled'),
      isSAMsDisabled: this.getModifierState('modifier-isSAMsDisabled'),
      isPeaceTime: this.getModifierState('modifier-isPeaceTime'),
      isWaterNukes: this.getModifierState('modifier-isWaterNukes'),
      startingGold: this.getNumericModifierState({
        1000000: 'modifier-startingGold-1000000',
        5000000: 'modifier-startingGold-5000000',
        25000000: 'modifier-startingGold-25000000',
      }),
      goldMultiplier: this.getNumericModifierState({
        2: 'modifier-goldMultiplier-2',
      }),
    };
  }

  private getAllTeamCountValues(): TeamCount[] {
    const values: TeamCount[] = [];
    for (const id of ALL_TEAM_IDS) {
      const checkbox = document.getElementById(id) as HTMLInputElement | null;
      if (!checkbox?.checked) continue;
      const value = checkbox.value;
      if (value === 'Humans Vs Nations' || value === '8+') {
        values.push(value);
      } else {
        const numeric = parseInt(value, 10);
        if (!Number.isNaN(numeric)) values.push(numeric);
      }
    }
    return values;
  }

  private setAllTeamCounts(checked: boolean): void {
    for (const id of ALL_TEAM_IDS) {
      const checkbox = document.getElementById(id) as HTMLInputElement | null;
      if (!checkbox) continue;
      checkbox.checked = checked;
      this.syncChipState(id);
    }
  }

  private syncChipState(checkboxId: string): void {
    const checkbox = document.getElementById(checkboxId) as HTMLInputElement | null;
    if (!checkbox) return;
    const chip = checkbox.closest('.ld-chip, .ld-mode-btn, .ld-2x') as HTMLElement | null;
    if (!chip) return;
    chip.classList.toggle('is-on', checkbox.checked);
    chip.setAttribute('aria-pressed', String(checkbox.checked));
  }

  private buildCriteriaFromUI(): DiscoveryCriteria[] {
    const modifiers = this.getModifierFiltersFromUI();
    const criteria: DiscoveryCriteria[] = [];

    const ffaCheckbox = document.getElementById('discovery-ffa') as HTMLInputElement | null;
    if (ffaCheckbox?.checked) {
      criteria.push({
        gameMode: 'FFA',
        teamCount: null,
        minPlayers: this.getNumberValue('discovery-ffa-min'),
        maxPlayers: this.getNumberValue('discovery-ffa-max'),
        modifiers,
      });
    }

    const teamCheckbox = document.getElementById('discovery-team') as HTMLInputElement | null;
    if (!teamCheckbox?.checked) return criteria;

    const teamCounts = this.getAllTeamCountValues();
    if (teamCounts.length === 0) {
      criteria.push({
        gameMode: 'Team',
        teamCount: null,
        minPlayers: this.getNumberValue('discovery-team-min'),
        maxPlayers: this.getNumberValue('discovery-team-max'),
        modifiers,
      });
      return criteria;
    }

    for (const teamCount of teamCounts) {
      criteria.push({
        gameMode: 'Team',
        teamCount,
        minPlayers: this.getNumberValue('discovery-team-min'),
        maxPlayers: this.getNumberValue('discovery-team-max'),
        modifiers,
      });
    }

    return criteria;
  }

  private updateFilterCount(): void {
    const num = document.getElementById('discovery-filter-count');
    const wordEl = document.getElementById('discovery-filter-word');
    if (!num || !wordEl) return;

    const ffaOn = (document.getElementById('discovery-ffa') as HTMLInputElement | null)?.checked;
    const teamOn = (document.getElementById('discovery-team') as HTMLInputElement | null)?.checked;
    const formatsOn = ALL_TEAM_IDS.filter(
      (id) => (document.getElementById(id) as HTMLInputElement | null)?.checked
    ).length;
    const modsOn = [
      ...MODIFIER_BOOLEAN_IDS,
      ...STARTING_GOLD_VALUES.map((v) => `modifier-startingGold-${v}`),
      ...GOLD_MULTIPLIER_VALUES.map((v) => `modifier-goldMultiplier-${v}`),
    ].filter((id) => this.getModifierState(id) !== 'any').length;

    const count = (ffaOn ? 1 : 0) + (teamOn ? 1 : 0) + formatsOn + modsOn;
    num.textContent = String(count);
    wordEl.textContent = count === 1 ? 'filter' : 'filters';
  }

  private setModePanelActive(panelId: string, active: boolean): void {
    const el = document.getElementById(panelId);
    if (el) el.classList.toggle('is-off', !active);
  }

  private setIconButtonState(checkboxId: string, on: boolean): void {
    const btn = document
      .getElementById(checkboxId)
      ?.closest('.ld-icon-btn') as HTMLElement | null;
    if (btn) btn.classList.toggle('is-on', on);
  }

  private loadUIFromSettings(): void {
    const ffaCriteria = this.criteriaList.find((c) => c.gameMode === 'FFA');
    const teamCriteria = this.criteriaList.filter((c) => c.gameMode === 'Team');

    const ffaCheckbox = document.getElementById('discovery-ffa') as HTMLInputElement | null;
    const teamCheckbox = document.getElementById('discovery-team') as HTMLInputElement | null;
    if (ffaCheckbox) {
      ffaCheckbox.checked = !!ffaCriteria;
      this.syncChipState('discovery-ffa');
      this.setModePanelActive('discovery-ffa-config', !!ffaCriteria);
    }
    if (teamCheckbox) {
      teamCheckbox.checked = teamCriteria.length > 0;
      this.syncChipState('discovery-team');
      this.setModePanelActive('discovery-team-config', teamCriteria.length > 0);
    }

    if (ffaCriteria) {
      const min = document.getElementById('discovery-ffa-min') as HTMLInputElement | null;
      const max = document.getElementById('discovery-ffa-max') as HTMLInputElement | null;
      if (min && ffaCriteria.minPlayers !== null) min.value = String(ffaCriteria.minPlayers);
      if (max && ffaCriteria.maxPlayers !== null) max.value = String(ffaCriteria.maxPlayers);
    }

    if (teamCriteria[0]) {
      const min = document.getElementById('discovery-team-min') as HTMLInputElement | null;
      const max = document.getElementById('discovery-team-max') as HTMLInputElement | null;
      if (min && teamCriteria[0].minPlayers !== null) min.value = String(teamCriteria[0].minPlayers);
      if (max && teamCriteria[0].maxPlayers !== null) max.value = String(teamCriteria[0].maxPlayers);
      this.setTeamCountSelections(teamCriteria.map((c) => c.teamCount));
    }

    const modifiers = (ffaCriteria ?? teamCriteria[0])?.modifiers;
    if (modifiers) {
      this.setModifierState('modifier-isCompact', modifiers.isCompact ?? 'any');
      this.setModifierState('modifier-isRandomSpawn', modifiers.isRandomSpawn ?? 'any');
      this.setModifierState('modifier-isCrowded', modifiers.isCrowded ?? 'any');
      this.setModifierState('modifier-isHardNations', modifiers.isHardNations ?? 'any');
      this.setModifierState('modifier-isAlliancesDisabled', modifiers.isAlliancesDisabled ?? 'any');
      this.setModifierState('modifier-isPortsDisabled', modifiers.isPortsDisabled ?? 'any');
      this.setModifierState('modifier-isNukesDisabled', modifiers.isNukesDisabled ?? 'any');
      this.setModifierState('modifier-isSAMsDisabled', modifiers.isSAMsDisabled ?? 'any');
      this.setModifierState('modifier-isPeaceTime', modifiers.isPeaceTime ?? 'any');
      this.setModifierState('modifier-isWaterNukes', modifiers.isWaterNukes ?? 'any');

      for (const value of STARTING_GOLD_VALUES) {
        this.setModifierState(
          `modifier-startingGold-${value}`,
          modifiers.startingGold?.[value] ?? 'any'
        );
      }
      for (const value of GOLD_MULTIPLIER_VALUES) {
        this.setModifierState(
          `modifier-goldMultiplier-${value}`,
          modifiers.goldMultiplier?.[value] ?? 'any'
        );
      }
    }

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

    const twoTimes = document.getElementById('discovery-team-two-times') as HTMLInputElement | null;
    if (twoTimes) {
      twoTimes.checked = this.isTeamTwoTimesMinEnabled;
      this.syncChipState('discovery-team-two-times');
    }

    this.updateFilterCount();
    this.updateStatusLabel();
  }

  private setTeamCountSelections(values: Array<TeamCount | null | undefined>): void {
    for (const teamCount of values) {
      let checkbox: HTMLInputElement | null = null;
      if (teamCount === 'Humans Vs Nations') checkbox = document.getElementById('discovery-team-hvn') as HTMLInputElement;
      else if (teamCount === '8+') checkbox = document.getElementById('discovery-team-8plus') as HTMLInputElement;
      else if (typeof teamCount === 'number') checkbox = document.getElementById(`discovery-team-${teamCount}`) as HTMLInputElement;
      if (checkbox) {
        checkbox.checked = true;
        this.syncChipState(checkbox.id);
      }
    }
  }

  private refreshCriteria(): void {
    this.criteriaList = this.buildCriteriaFromUI();
    this.saveSettings();
    this.updateFilterCount();
    this.syncSearchTimer({ resetStart: true });
  }

  private resetAll(): void {
    const ffaCheckbox = document.getElementById('discovery-ffa') as HTMLInputElement | null;
    const teamCheckbox = document.getElementById('discovery-team') as HTMLInputElement | null;
    if (ffaCheckbox) {
      ffaCheckbox.checked = false;
      this.syncChipState('discovery-ffa');
      this.setModePanelActive('discovery-ffa-config', false);
    }
    if (teamCheckbox) {
      teamCheckbox.checked = false;
      this.syncChipState('discovery-team');
      this.setModePanelActive('discovery-team-config', false);
    }

    this.setAllTeamCounts(false);

    const twoTimes = document.getElementById('discovery-team-two-times') as HTMLInputElement | null;
    if (twoTimes) {
      twoTimes.checked = false;
      this.syncChipState('discovery-team-two-times');
      this.isTeamTwoTimesMinEnabled = false;
    }

    for (const id of MODIFIER_BOOLEAN_IDS) this.setModifierState(id, 'any');
    for (const v of STARTING_GOLD_VALUES) this.setModifierState(`modifier-startingGold-${v}`, 'any');
    for (const v of GOLD_MULTIPLIER_VALUES) this.setModifierState(`modifier-goldMultiplier-${v}`, 'any');

    this.ffaSlider?.setRange(1, 125);
    this.teamSlider?.setRange(TEAM_MIN_PLAYERS_PER_TEAM, TEAM_MAX_PLAYERS_PER_TEAM);
    this.teamSlider?.applyLockState();

    this.refreshCriteria();
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

    for (const [checkboxId, configId] of [
      ['discovery-ffa', 'discovery-ffa-config'],
      ['discovery-team', 'discovery-team-config'],
    ] as const) {
      const checkbox = document.getElementById(checkboxId) as HTMLInputElement | null;
      checkbox?.addEventListener('change', () => {
        this.syncChipState(checkboxId);
        this.setModePanelActive(configId, checkbox.checked);
        this.refreshCriteria();
      });
    }

    const twoTimesCheckbox = document.getElementById('discovery-team-two-times') as HTMLInputElement | null;
    twoTimesCheckbox?.addEventListener('change', () => {
      this.isTeamTwoTimesMinEnabled = twoTimesCheckbox.checked;
      this.syncChipState('discovery-team-two-times');
      this.teamSlider?.applyLockState();
      this.refreshCriteria();
    });

    document.getElementById('discovery-reset')?.addEventListener('click', () => {
      this.resetAll();
    });

    for (const id of [...ALL_TEAM_IDS, 'discovery-sound-toggle', 'discovery-desktop-toggle']) {
      const element = document.getElementById(id) as HTMLInputElement | null;
      if (!element) continue;
      element.addEventListener('change', () => {
        if (id === 'discovery-sound-toggle') {
          this.soundEnabled = element.checked;
          this.setIconButtonState('discovery-sound-toggle', element.checked);
          this.saveSettings();
          return;
        }
        if (id === 'discovery-desktop-toggle') {
          void this.handleDesktopNotificationToggleChange(element);
          return;
        }
        this.syncChipState(id);
        this.refreshCriteria();
      });
    }

    const allModifierIds: string[] = [
      ...MODIFIER_BOOLEAN_IDS,
      ...STARTING_GOLD_VALUES.map((v) => `modifier-startingGold-${v}`),
      ...GOLD_MULTIPLIER_VALUES.map((v) => `modifier-goldMultiplier-${v}`),
    ];
    for (const id of allModifierIds) {
      const button = document.getElementById(id) as HTMLButtonElement | null;
      button?.addEventListener('click', () => {
        this.cycleModifierState(id);
        this.refreshCriteria();
      });
    }
  }

  private renderModeButton(id: string, label: string): string {
    return `
      <label class="ld-mode-btn" aria-pressed="false">
        <input type="checkbox" id="${id}" value="${id === 'discovery-ffa' ? 'FFA' : 'Team'}">
        <span class="check">${ICON_CHECK}</span>
        <span>${label}</span>
      </label>
    `;
  }

  private renderChip(id: string, value: string, label: string): string {
    return `
      <label class="ld-chip" aria-pressed="false">
        <input type="checkbox" id="${id}" value="${value}">${label}
      </label>
    `;
  }

  private renderModifierChip(id: string, name: string): string {
    return `
      <button type="button" class="ld-mod" id="${id}" data-state="any" data-mod-name="${name}" aria-pressed="false" aria-label="${name}">
        <span class="ld-mod-ind"></span>
        <span class="ld-mod-name">${name}</span>
      </button>
    `;
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
      <div class="discovery-body">
        <div class="discovery-content" style="overflow-y: auto;">
          <div class="ld-section">
            <div class="ld-section-head">
              <div class="ld-section-label">Modes</div>
              <div class="ld-section-aside">Pick one or both</div>
            </div>
            <div class="ld-modes">
              ${this.renderModeButton('discovery-ffa', 'FFA')}
              ${this.renderModeButton('discovery-team', 'Teams')}
            </div>

            <div class="ld-mode-panel" id="discovery-ffa-config">
              <div class="ld-mode-panel-head">
                <span class="dot"></span>
                <span class="title">FFA · Lobby capacity</span>
              </div>
              <div class="ld-slider-row" id="discovery-ffa-slider-row">
                <div class="ld-slider-label">
                  <span>Players</span>
                  <span class="val">
                    <div class="ld-stepper" data-role="min">
                      <button type="button" class="ld-step-btn" data-action="dec" data-target="min" aria-label="Decrease minimum">−</button>
                      <input type="number" id="discovery-ffa-min" min="1" max="125" value="1" inputmode="numeric">
                      <button type="button" class="ld-step-btn" data-action="inc" data-target="min" aria-label="Increase minimum">+</button>
                    </div>
                    <span class="sep">–</span>
                    <div class="ld-stepper" data-role="max">
                      <button type="button" class="ld-step-btn" data-action="dec" data-target="max" aria-label="Decrease maximum">−</button>
                      <input type="number" id="discovery-ffa-max" min="1" max="125" value="125" inputmode="numeric">
                      <button type="button" class="ld-step-btn" data-action="inc" data-target="max" aria-label="Increase maximum">+</button>
                    </div>
                  </span>
                </div>
                <div class="ld-range" id="discovery-ffa-range-root">
                  <div class="track"><div class="track-fill" id="discovery-ffa-range-fill"></div></div>
                  <input type="range" id="discovery-ffa-min-slider" min="0" max="1000" value="0" class="capacity-slider capacity-slider-min">
                  <input type="range" id="discovery-ffa-max-slider" min="0" max="1000" value="1000" class="capacity-slider capacity-slider-max">
                </div>
              </div>
            </div>

            <div class="ld-mode-panel" id="discovery-team-config">
              <div class="ld-mode-panel-head">
                <span class="dot"></span>
                <span class="title">Teams · Format & size</span>
              </div>
              <div class="ld-format-label">FORMAT</div>
              <div class="ld-formats">
                ${this.renderChip('discovery-team-hvn', 'Humans Vs Nations', 'Humans Vs Nations')}
              </div>
              <div class="ld-format-label" style="margin-top: 10px;">NUMBER OF TEAMS</div>
              <div class="ld-formats" style="margin-bottom: 14px;">
                ${this.renderChip('discovery-team-2', '2', '2')}
                ${this.renderChip('discovery-team-3', '3', '3')}
                ${this.renderChip('discovery-team-4', '4', '4')}
                ${this.renderChip('discovery-team-5', '5', '5')}
                ${this.renderChip('discovery-team-6', '6', '6')}
                ${this.renderChip('discovery-team-7', '7', '7')}
                ${this.renderChip('discovery-team-8plus', '8+', '8+')}
              </div>
              <div class="ld-slider-row" id="discovery-team-slider-row">
                <div class="ld-slider-label">
                  <span>Players per team</span>
                  <span class="val">
                    <div class="ld-stepper" data-role="min">
                      <button type="button" class="ld-step-btn" data-action="dec" data-target="min" aria-label="Decrease minimum">−</button>
                      <input type="number" id="discovery-team-min" min="2" max="62" value="2" inputmode="numeric">
                      <button type="button" class="ld-step-btn" data-action="inc" data-target="min" aria-label="Increase minimum">+</button>
                    </div>
                    <span class="sep">–</span>
                    <div class="ld-stepper" data-role="max">
                      <button type="button" class="ld-step-btn" data-action="dec" data-target="max" aria-label="Decrease maximum">−</button>
                      <input type="number" id="discovery-team-max" min="2" max="62" value="62" inputmode="numeric">
                      <button type="button" class="ld-step-btn" data-action="inc" data-target="max" aria-label="Increase maximum">+</button>
                    </div>
                  </span>
                </div>
                <div class="ld-range" id="discovery-team-range-root">
                  <div class="track"><div class="track-fill" id="discovery-team-range-fill"></div></div>
                  <input type="range" id="discovery-team-min-slider" min="0" max="1000" value="0" class="capacity-slider capacity-slider-min">
                  <input type="range" id="discovery-team-max-slider" min="0" max="1000" value="1000" class="capacity-slider capacity-slider-max">
                </div>
                <div class="ld-ticks" id="discovery-team-ticks"></div>
              </div>
              <label class="ld-2x" aria-pressed="false">
                <input type="checkbox" id="discovery-team-two-times">
                <span class="check">${ICON_CHECK}</span>
                <span class="lbl"><strong>Lock max-per-team to 2× the min</strong></span>
              </label>
              <div class="ld-current-game-info" id="discovery-current-game-info" style="display: none;"></div>
            </div>
          </div>

          <div class="ld-section">
            <div class="ld-section-head">
              <div class="ld-section-label">Modifiers</div>
              <div class="ld-mods-legend">
                <span class="key"><span class="swatch"></span>Any</span>
                <span class="key"><span class="swatch req"></span>Req</span>
                <span class="key"><span class="swatch blk"></span>Excl</span>
              </div>
            </div>

            <div class="ld-mod-group">
              <div class="ld-mod-group-label">Map</div>
              <div class="ld-mods discovery-modifier-grid">
                ${this.renderModifierChip('modifier-isCompact', 'Compact')}
                ${this.renderModifierChip('modifier-isRandomSpawn', 'Random Spawn')}
                ${this.renderModifierChip('modifier-isCrowded', 'Crowded')}
                ${this.renderModifierChip('modifier-isHardNations', 'Hard Nations')}
              </div>
            </div>

            <div class="ld-mod-group">
              <div class="ld-mod-group-label">Gameplay</div>
              <div class="ld-mods">
                ${this.renderModifierChip('modifier-isAlliancesDisabled', 'Alliances Off')}
                ${this.renderModifierChip('modifier-isPortsDisabled', 'Ports Off')}
                ${this.renderModifierChip('modifier-isNukesDisabled', 'Nukes Off')}
                ${this.renderModifierChip('modifier-isSAMsDisabled', 'SAMs Off')}
                ${this.renderModifierChip('modifier-isPeaceTime', 'Peace Time')}
                ${this.renderModifierChip('modifier-isWaterNukes', 'Water Nukes')}
              </div>
            </div>

            <div class="ld-mod-group">
              <div class="ld-mod-group-label">Economy</div>
              <div class="ld-mods">
                ${this.renderModifierChip('modifier-startingGold-1000000', 'Start Gold 1M')}
                ${this.renderModifierChip('modifier-startingGold-5000000', 'Start Gold 5M')}
                ${this.renderModifierChip('modifier-startingGold-25000000', 'Start Gold 25M')}
                ${this.renderModifierChip('modifier-goldMultiplier-2', 'Gold ×2')}
              </div>
            </div>

            <div class="ld-mods-hint">
              Click to cycle <strong>Any</strong> → <strong class="req">Required</strong> → <strong class="blk">Excluded</strong>.
            </div>
          </div>
        </div>
        <div class="discovery-footer">
          <div class="summary">
            <span class="num" id="discovery-filter-count">0</span>
            <span>active <span id="discovery-filter-word">filters</span></span>
          </div>
          <button type="button" class="reset" id="discovery-reset">Reset all</button>
        </div>
      </div>
    `;

    document.body.appendChild(this.panel);

    this.setupEventListeners();
    this.loadUIFromSettings();

    this.ffaSlider = new RangeSlider({
      containerId: 'discovery-ffa-slider-row',
      rangeRootId: 'discovery-ffa-range-root',
      minSliderId: 'discovery-ffa-min-slider',
      maxSliderId: 'discovery-ffa-max-slider',
      minInputId: 'discovery-ffa-min',
      maxInputId: 'discovery-ffa-max',
      fillId: 'discovery-ffa-range-fill',
      bounds: { min: 1, max: 125 },
      onChange: () => this.refreshCriteria(),
    });

    this.teamSlider = new RangeSlider({
      containerId: 'discovery-team-slider-row',
      rangeRootId: 'discovery-team-range-root',
      minSliderId: 'discovery-team-min-slider',
      maxSliderId: 'discovery-team-max-slider',
      minInputId: 'discovery-team-min',
      maxInputId: 'discovery-team-max',
      fillId: 'discovery-team-range-fill',
      ticksContainerId: 'discovery-team-ticks',
      bounds: {
        min: TEAM_MIN_PLAYERS_PER_TEAM,
        max: TEAM_MAX_PLAYERS_PER_TEAM,
      },
      stops: TEAM_PLAYERS_PER_TEAM_STOPS,
      lockMaxToTwiceMin: () => this.isTeamTwoTimesMinEnabled,
      onChange: () => this.refreshCriteria(),
    });

    this.updateStatusLabel();
    this.updateFilterCount();
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
      this.hideUpcomingStrip();
    } else {
      this.panel.classList.remove('hidden');
      this.syncSearchTimer();
      this.startGameInfoUpdates();
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
    this.upcomingStrip?.parentNode?.removeChild(this.upcomingStrip);
    this.upcomingStrip = null;
    this.lastUpcomingSlots = new Map();
    this.lastUpcomingMatchSources = new Set();
    this.upcomingSlotSignatures.clear();
    this.panel.parentNode?.removeChild(this.panel);
  }
}
