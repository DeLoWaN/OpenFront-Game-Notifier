/**
 * LobbyBoardView - renders the Lobby Board into OpenFront's `game-mode-selector`.
 *
 * The board is a grid with one column per Queue and one row per Queue Position.
 * Cards update in place, keyed by `gameID`.
 */

import type { Lobby } from '@/types/game';
import type { DiscoveryCriteria, QueueSource } from './LobbyDiscoveryTypes';
import {
  BOARD_QUEUES,
  buildBoardCardModel,
  formatCountdown,
  formatLobbyCount,
  formatMatchCount,
  getRowLabel,
  groupLobbiesByQueue,
  type BoardCardModel,
} from './LobbyBoardHelpers';
import {
  appearCard,
  canAnimate,
  finishAnimations,
  readPlacement,
  slideCard,
  type CardPlacement,
} from './LobbyBoardMotion';
import { LobbyBoardSidebar } from './LobbyBoardSidebar';
import { findHomeGrid, isLobbyCell } from '@/utils/HomePageUtils';

export interface LobbyBoardAssets {
  manifest: Record<string, string> | null;
  cdnBase: string | null;
}

export interface LobbyBoardOptions {
  /** Called from a card's click handler only. */
  onJoin: (gameID: string) => void;
  getAssets: () => LobbyBoardAssets;
}

/** The places where the board hosts the filter component and the header controls. */
export interface LobbyBoardHosts {
  sidebarBody: HTMLElement;
  controls: HTMLElement;
}

export interface LobbyBoardState {
  lobbies: Lobby[];
  /**
   * The `gameID` of every lobby that matches the Criteria. Null while no
   * Criterion is active: then no card is a match and no card is greyed.
   */
  matchedIds: Set<string> | null;
  /** Offset to add to the local clock to get the feed's clock. */
  clockOffsetMs: number;
  /** The active Criteria. They tell which Modifiers a card shows as required or blocked. */
  criteria?: DiscoveryCriteria[];
  /** The `gameID` of every card that shows the "New" badge. */
  newGameIds: Set<string>;
}

const BOARD_ID = 'of-lobby-board';
const FLASH_DURATION_MS = 2_000;
const GUTTER_PX = 16;

/** The nodes of a card that change with its model. They are built once and then updated in place. */
interface CardParts {
  thumb: HTMLElement;
  badge: HTMLElement;
  top: HTMLElement;
  name: HTMLElement;
  format: HTMLElement;
  players: HTMLElement;
  bar: HTMLElement;
  fill: HTMLElement;
  modifiers: HTMLElement;
}

interface SavedStyle {
  element: HTMLElement;
  property: string;
  value: string;
}

export class LobbyBoardView {
  private root: HTMLDivElement | null = null;
  private hosts: LobbyBoardHosts | null = null;
  private readonly sidebar = new LobbyBoardSidebar();
  private pageGrid: HTMLElement | null = null;
  // Inline styles of OpenFront's own elements, saved before the board changes them.
  private savedStyles: SavedStyle[] = [];
  private clockOffsetMs = 0;
  private tickInterval: ReturnType<typeof setInterval> | null = null;
  private totals: HTMLElement | null = null;
  private grid: HTMLDivElement | null = null;
  private rowCount = -1;
  private cards = new Map<string, HTMLButtonElement>();
  private cardParts = new WeakMap<HTMLButtonElement, CardParts>();
  private signatures = new Map<string, string>();
  private flashTimers = new Map<string, ReturnType<typeof setTimeout>>();
  // False until a render shows a lobby: that render shows every card without motion.
  private hasShownCards = false;
  private resizeObserver: ResizeObserver | null = null;
  private observedGrid: HTMLElement | null = null;
  private readonly onWindowResize = (): void => this.measureLayout();

  constructor(private readonly options: LobbyBoardOptions) {}

  /** Shows the board in place of OpenFront's lobby cells and fills it. Safe to call on every update. */
  render(state: LobbyBoardState): void {
    const wasShowing = this.isShowing();
    const root = this.ensureMounted();
    if (!root || !this.grid) return;
    const animate = canAnimate();
    const placementsBefore = animate && wasShowing ? this.readPlacements() : new Map<string, CardPlacement>();
    const createdCards: HTMLButtonElement[] = [];
    root.style.display = '';
    this.takeOverPage();
    this.startMeasuringLayout();
    this.clockOffsetMs = state.clockOffsetMs;

    const queues = groupLobbiesByQueue(state.lobbies);
    const rowCount = Math.max(0, ...BOARD_QUEUES.map(({ queue }) => queues[queue].length));
    if (rowCount !== this.rowCount) this.buildGrid(rowCount);

    const { manifest, cdnBase } = this.options.getAssets();
    const liveIds = new Set<string>();
    const { matchedIds } = state;
    const countMatches = (lobbies: Lobby[]): number =>
      matchedIds ? lobbies.filter((lobby) => matchedIds.has(lobby.gameID)).length : 0;

    for (const { queue } of BOARD_QUEUES) {
      this.renderColumnHead(queue, queues[queue].length, matchedIds ? countMatches(queues[queue]) : null);
    }
    if (this.totals) {
      const totalLobbies = BOARD_QUEUES.reduce((sum, { queue }) => sum + queues[queue].length, 0);
      const totalMatches = BOARD_QUEUES.reduce((sum, { queue }) => sum + countMatches(queues[queue]), 0);
      this.totals.textContent = `${formatMatchCount(totalMatches)} · ${formatLobbyCount(totalLobbies)}`;
    }

    for (const { queue } of BOARD_QUEUES) {
      for (let row = 0; row < rowCount; row++) {
        const cell = this.getCell(queue, row);
        const lobby = queues[queue][row];
        if (!cell) continue;
        if (!lobby) {
          if (!cell.querySelector('.of-board-empty')) cell.replaceChildren(this.buildEmpty());
          continue;
        }
        liveIds.add(lobby.gameID);
        const model = buildBoardCardModel(lobby, queue, row, manifest, cdnBase, state.criteria);
        let card = this.cards.get(lobby.gameID);
        if (!card) {
          card = this.createCard(lobby.gameID);
          createdCards.push(card);
        }
        this.updateCard(card, model);
        this.applyNewBadge(card, state.newGameIds.has(lobby.gameID));
        card.classList.toggle('of-board-card-match', matchedIds?.has(lobby.gameID) === true);
        card.classList.toggle('of-board-card-dim', matchedIds !== null && !matchedIds.has(lobby.gameID));
        if (card.parentElement !== cell) cell.replaceChildren(card);
      }
    }

    for (const gameID of [...this.cards.keys()]) {
      if (!liveIds.has(gameID)) {
        this.cards.get(gameID)?.remove();
        this.cards.delete(gameID);
        this.signatures.delete(gameID);
      }
    }

    if (animate) this.playMotion(placementsBefore, createdCards);
    if (liveIds.size > 0) this.hasShownCards = true;

    this.tickCountdowns();
    if (!this.tickInterval) {
      this.tickInterval = setInterval(() => this.tickCountdowns(), 1000);
    }
  }

  /** True while the board is on the page and visible. */
  isShowing(): boolean {
    return !!this.root?.isConnected && this.root.style.display !== 'none';
  }

  /** Scrolls a card into view and flashes it. Does nothing when the lobby is not on the board. */
  flashCard(gameID: string): void {
    const card = this.cards.get(gameID);
    if (!card) return;
    card.scrollIntoView?.({ block: 'center', behavior: 'smooth' });
    clearTimeout(this.flashTimers.get(gameID));
    card.classList.add('of-board-card-flash');
    this.flashTimers.set(
      gameID,
      setTimeout(() => {
        this.flashTimers.delete(gameID);
        card.classList.remove('of-board-card-flash');
      }, FLASH_DURATION_MS)
    );
  }

  /** The containers of the sidebar and the header, or null while the board is not on the page. */
  getHosts(): LobbyBoardHosts | null {
    return this.root?.isConnected ? this.hosts : null;
  }

  /** Sets the line that the collapsed sidebar rail shows. */
  setFilterSummary(text: string): void {
    this.sidebar.setSummary(text);
  }

  /** Hides the board and gives OpenFront's lobby area back as it was. */
  hide(): void {
    this.hasShownCards = false;
    this.stopTicking();
    this.stopMeasuringLayout();
    if (this.root) this.root.style.display = 'none';
    this.restorePage();
  }

  dispose(): void {
    this.stopTicking();
    this.stopMeasuringLayout();
    for (const timer of this.flashTimers.values()) clearTimeout(timer);
    this.flashTimers.clear();
    this.restorePage();
    this.root?.remove();
    this.root = null;
    this.hosts = null;
    this.pageGrid = null;
    this.totals = null;
    this.grid = null;
    this.rowCount = -1;
    this.hasShownCards = false;
    this.cards.clear();
    this.signatures.clear();
  }

  private readPlacements(): Map<string, CardPlacement> {
    const placements = new Map<string, CardPlacement>();
    for (const [gameID, card] of this.cards) {
      const placement = readPlacement(card);
      if (placement) placements.set(gameID, placement);
    }
    return placements;
  }

  /** Slides the cards that changed cell and fades in the new ones. */
  private playMotion(placementsBefore: Map<string, CardPlacement>, createdCards: HTMLButtonElement[]): void {
    // A card in the middle of a slide or a fade-in has a transform that shifts its box.
    for (const card of this.cards.values()) finishAnimations(card);
    for (const [gameID, from] of placementsBefore) {
      const card = this.cards.get(gameID);
      const to = card ? readPlacement(card) : null;
      if (card && to) slideCard(card, from, to);
    }
    if (!this.hasShownCards) return;
    for (const card of createdCards) appearCard(card);
  }

  /**
   * Hides the lobby cells, lets the board take its own height and lifts the
   * `overflow-x: clip` of the page column so the board can use the full width.
   */
  private takeOverPage(): void {
    const pageGrid = this.pageGrid;
    if (!pageGrid) return;

    for (const child of Array.from(pageGrid.children) as HTMLElement[]) {
      if (child !== this.root && isLobbyCell(child)) this.setStyle(child, 'display', 'none');
    }
    // OpenFront gives the lobby row a fixed height.
    this.setStyle(pageGrid, 'grid-template-rows', 'auto');
    // The board is wider than the page column; its width must not stretch the `auto` minimum of the tracks.
    this.setStyle(pageGrid, 'grid-template-columns', 'minmax(0, 2fr) minmax(0, 1fr)');

    for (
      let ancestor = pageGrid.parentElement;
      ancestor && ancestor !== document.documentElement;
      ancestor = ancestor.parentElement
    ) {
      if (getComputedStyle(ancestor).overflowX === 'clip') {
        this.setStyle(ancestor, 'overflow-x', 'visible');
      }
    }
  }

  /** Sets the board's left offset and width, so its edges sit one gutter from the viewport edges. */
  private measureLayout(): void {
    if (!this.root || !this.pageGrid) return;
    // clientWidth excludes the vertical scrollbar, which 100vw includes.
    const width = document.documentElement.clientWidth - 2 * GUTTER_PX;
    const left = GUTTER_PX - this.pageGrid.getBoundingClientRect().left;
    this.root.style.setProperty('--of-board-left', `${left}px`);
    this.root.style.setProperty('--of-board-width', `${width}px`);
  }

  private startMeasuringLayout(): void {
    this.measureLayout();
    const pageGrid = this.pageGrid;
    if (!pageGrid) return;
    if (this.resizeObserver && this.observedGrid === pageGrid) return;
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    window.addEventListener('resize', this.onWindowResize);
    if (typeof ResizeObserver === 'undefined') return;
    this.resizeObserver = new ResizeObserver(() => this.measureLayout());
    this.resizeObserver.observe(document.documentElement);
    this.resizeObserver.observe(pageGrid);
    this.observedGrid = pageGrid;
  }

  private stopMeasuringLayout(): void {
    window.removeEventListener('resize', this.onWindowResize);
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    this.observedGrid = null;
  }

  private setStyle(element: HTMLElement, property: string, value: string): void {
    if (!this.savedStyles.some((saved) => saved.element === element && saved.property === property)) {
      this.savedStyles.push({ element, property, value: element.style.getPropertyValue(property) });
    }
    element.style.setProperty(property, value);
  }

  private restorePage(): void {
    for (const { element, property, value } of this.savedStyles) {
      if (value) element.style.setProperty(property, value);
      else element.style.removeProperty(property);
      if (element.getAttribute('style') === '') element.removeAttribute('style');
    }
    this.savedStyles = [];
  }

  private stopTicking(): void {
    if (this.tickInterval) clearInterval(this.tickInterval);
    this.tickInterval = null;
  }

  /** Updates the text of every countdown badge. It does not rebuild any card. */
  private tickCountdowns(): void {
    const now = Date.now() + this.clockOffsetMs;
    for (const badge of Array.from(
      this.grid?.querySelectorAll<HTMLElement>('.of-board-badge[data-countdown-to]') ?? []
    )) {
      const text = formatCountdown(Number(badge.dataset.countdownTo) - now);
      if (badge.textContent !== text) badge.textContent = text;
    }
  }

  private getCell(queue: QueueSource, row: number): HTMLElement | null {
    return (
      this.grid?.querySelector(`.of-board-cell[data-queue="${queue}"][data-row="${row}"]`) ?? null
    );
  }

  /** True while the board is on the page, or when OpenFront's page has a grid that can hold it. */
  canMount(): boolean {
    return !!this.root?.isConnected || findHomeGrid() !== null;
  }

  /** Finds the grid of OpenFront's home page and puts the board before its first child. */
  private ensureMounted(): HTMLDivElement | null {
    if (this.root?.isConnected) return this.root;

    const pageGrid = findHomeGrid();
    if (!pageGrid) return null;

    const root = document.createElement('div');
    root.id = BOARD_ID;
    root.className = 'of-board';
    const head = document.createElement('div');
    head.className = 'of-board-head';
    const title = document.createElement('span');
    title.className = 'of-board-title';
    title.textContent = 'Lobby Board';
    const totals = document.createElement('span');
    totals.className = 'of-board-totals';
    const controls = document.createElement('div');
    controls.className = 'of-board-controls';
    head.append(title, totals, controls);
    const { element: sidebar, body: sidebarBody } = this.sidebar.build();
    const grid = document.createElement('div');
    grid.className = 'of-board-grid';
    const main = document.createElement('div');
    main.className = 'of-board-main';
    main.append(sidebar, grid);
    root.append(head, main);
    pageGrid.insertBefore(root, pageGrid.firstChild);

    this.root = root;
    this.hosts = { sidebarBody, controls };
    this.pageGrid = pageGrid;
    this.totals = totals;
    this.grid = grid;
    this.rowCount = -1;
    return root;
  }

  private buildGrid(rowCount: number): void {
    const grid = this.grid!;
    const children: HTMLElement[] = [document.createElement('div')];
    for (const { queue, label } of BOARD_QUEUES) {
      const head = document.createElement('div');
      head.className = 'of-board-colhead';
      head.dataset.queue = queue;
      head.append(document.createElement('b'), document.createElement('span'), document.createElement('em'));
      head.firstElementChild!.textContent = label;
      children.push(head);
    }
    for (let row = 0; row < rowCount; row++) {
      const rowLabel = document.createElement('div');
      rowLabel.className = `of-board-rowlabel${row === 0 ? ' of-board-rowlabel-live' : ''}`;
      rowLabel.textContent = getRowLabel(row);
      children.push(rowLabel);
      for (const { queue } of BOARD_QUEUES) {
        const cell = document.createElement('div');
        cell.className = 'of-board-cell';
        cell.dataset.queue = queue;
        cell.dataset.row = String(row);
        children.push(cell);
      }
    }
    grid.replaceChildren(...children);
    this.rowCount = rowCount;
  }

  private renderColumnHead(
    queue: QueueSource,
    lobbyCount: number,
    matchCount: number | null
  ): void {
    const head = this.grid?.querySelector(`.of-board-colhead[data-queue="${queue}"]`);
    if (!head) return;
    const [, count, matches] = Array.from(head.children);
    count!.textContent = formatLobbyCount(lobbyCount);
    matches!.textContent = matchCount ? `· ${formatMatchCount(matchCount)}` : '';
  }

  private buildEmpty(): HTMLElement {
    const empty = document.createElement('div');
    empty.className = 'of-board-empty';
    return empty;
  }

  private createCard(gameID: string): HTMLButtonElement {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'of-board-card';
    card.dataset.gameId = gameID;
    // Navigation happens only from this real click, never from a feed update or a timer.
    card.addEventListener('click', () => this.options.onJoin(gameID));

    const thumb = this.createSpan('of-board-thumb');
    const badge = this.createSpan('of-board-badge');
    const top = this.createSpan('of-board-top');
    top.append(badge);
    const name = this.createSpan('of-board-map');
    const format = this.createSpan('of-board-format');
    const playersRow = this.createSpan('of-board-playersrow');
    const players = this.createSpan('of-board-players');
    const bar = this.createSpan('of-board-bar');
    const fill = document.createElement('i');
    fill.className = 'of-board-fill';
    bar.append(fill);
    playersRow.append(players, bar);
    const modifiers = this.createSpan('of-board-mods');
    const body = this.createSpan('of-board-body');
    body.append(name, format, playersRow, modifiers);
    card.append(thumb, top, body);

    this.cardParts.set(card, { thumb, badge, top, name, format, players, bar, fill, modifiers });
    this.cards.set(gameID, card);
    return card;
  }

  private createSpan(className: string): HTMLSpanElement {
    const span = document.createElement('span');
    span.className = className;
    return span;
  }

  /** Shows the "New" badge of a card. The badge is a child that updateCard never touches. */
  private applyNewBadge(card: HTMLButtonElement, isNew: boolean): void {
    const badge = Array.from(card.children).find((child) => child.classList.contains('of-board-new'));
    if (isNew) {
      if (badge) return;
      const newBadge = document.createElement('span');
      newBadge.className = 'of-board-new';
      newBadge.textContent = 'New';
      card.append(newBadge);
    } else {
      badge?.remove();
    }
  }

  /** Writes the model into the nodes of the card. A node whose value did not change is not touched. */
  private updateCard(card: HTMLButtonElement, model: BoardCardModel): void {
    const signature = JSON.stringify(model);
    if (this.signatures.get(model.gameID) === signature) return;
    this.signatures.set(model.gameID, signature);

    const parts = this.cardParts.get(card);
    if (!parts) return;

    this.updateThumbnail(parts.thumb, model.thumbnailUrl);

    if (model.badge.kind === 'countdown') {
      // The text is set by tickCountdowns, which knows the clock offset.
      parts.badge.dataset.countdownTo = String(model.badge.targetMs);
    } else {
      delete parts.badge.dataset.countdownTo;
      this.setText(parts.badge, model.badge.text);
    }
    this.reconcileChildren(
      parts.top,
      1,
      model.tags.map((tag) => ({ className: 'of-board-tag', text: tag }))
    );

    this.setText(parts.name, model.mapName);
    this.setText(parts.format, model.formatText);
    this.setText(
      parts.players,
      model.capacity === null ? String(model.players ?? '') : `${model.players ?? 0} / ${model.capacity}`
    );
    parts.bar.className = `of-board-bar${model.fillPercent >= 80 ? ' of-board-bar-hot' : ''}`;
    parts.fill.style.width = `${model.fillPercent}%`;

    this.reconcileChildren(
      parts.modifiers,
      0,
      model.modifiers.length === 0
        ? [{ className: 'of-board-nomods', text: 'No modifiers' }]
        : model.modifiers.map((modifier) => ({
            className: `of-board-mod${modifier.state === 'neutral' ? '' : ` of-board-mod-${modifier.state}`}`,
            text: modifier.name,
          }))
    );

    card.setAttribute('aria-label', `Open ${model.mapName} in OpenFront's join modal`);
  }

  /** Keeps the image node while its URL stays the same. A card without a thumbnail has no image. */
  private updateThumbnail(thumb: HTMLElement, url: string | null): void {
    const img = thumb.querySelector('img');
    if (!url) {
      img?.remove();
      return;
    }
    if (img) {
      if (img.getAttribute('src') !== url) img.src = url;
      return;
    }
    const created = document.createElement('img');
    created.src = url;
    created.alt = '';
    created.loading = 'lazy';
    thumb.append(created);
  }

  /** Makes the children of `parent`, from index `from` on, match `wanted`. It reuses the nodes it has. */
  private reconcileChildren(
    parent: HTMLElement,
    from: number,
    wanted: Array<{ className: string; text: string }>
  ): void {
    const existing = Array.from(parent.children).slice(from) as HTMLElement[];
    wanted.forEach(({ className, text }, index) => {
      const node = existing[index] ?? parent.appendChild(this.createSpan(className));
      if (node.className !== className) node.className = className;
      this.setText(node, text);
    });
    for (const extra of existing.slice(wanted.length)) extra.remove();
  }

  private setText(node: HTMLElement, text: string): void {
    if (node.textContent !== text) node.textContent = text;
  }
}
