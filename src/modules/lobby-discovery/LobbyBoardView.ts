/**
 * LobbyBoardView - renders the Lobby Board into OpenFront's `game-mode-selector`.
 *
 * The board is a grid with one column per Queue and one row per Queue Position.
 * Cards update in place, keyed by `gameID`.
 */

import type { Lobby } from '@/types/game';
import type { QueueSource } from './LobbyDiscoveryTypes';
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

export interface LobbyBoardAssets {
  manifest: Record<string, string> | null;
  cdnBase: string | null;
}

export interface LobbyBoardOptions {
  /** Called from a card's click handler only. */
  onJoin: (gameID: string) => void;
  getAssets: () => LobbyBoardAssets;
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
}

const BOARD_ID = 'of-lobby-board';
const GRID_CLASS_MARKER = 'sm:grid-cols-[2fr_1fr]';

interface SavedStyle {
  element: HTMLElement;
  property: string;
  value: string;
}

export class LobbyBoardView {
  private root: HTMLDivElement | null = null;
  private pageGrid: HTMLElement | null = null;
  // Inline styles of OpenFront's own elements, saved before the board changes them.
  private savedStyles: SavedStyle[] = [];
  private clockOffsetMs = 0;
  private tickInterval: ReturnType<typeof setInterval> | null = null;
  private totals: HTMLElement | null = null;
  private grid: HTMLDivElement | null = null;
  private rowCount = -1;
  private cards = new Map<string, HTMLButtonElement>();
  private signatures = new Map<string, string>();

  constructor(private readonly options: LobbyBoardOptions) {}

  /** Shows the board in place of OpenFront's lobby cells and fills it. Safe to call on every update. */
  render(state: LobbyBoardState): void {
    const root = this.ensureMounted();
    if (!root || !this.grid) return;
    root.style.display = '';
    this.takeOverPage();
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
        const model = buildBoardCardModel(lobby, queue, row, manifest, cdnBase);
        const card = this.cards.get(lobby.gameID) ?? this.createCard(lobby.gameID);
        this.updateCard(card, model);
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

    this.tickCountdowns();
    if (!this.tickInterval) {
      this.tickInterval = setInterval(() => this.tickCountdowns(), 1000);
    }
  }

  /** Hides the board and gives OpenFront's lobby area back as it was. */
  hide(): void {
    this.stopTicking();
    if (this.root) this.root.style.display = 'none';
    this.restorePage();
  }

  dispose(): void {
    this.stopTicking();
    this.restorePage();
    this.root?.remove();
    this.root = null;
    this.pageGrid = null;
    this.totals = null;
    this.grid = null;
    this.rowCount = -1;
    this.cards.clear();
    this.signatures.clear();
  }

  /**
   * Hides the lobby cells, lets the board take its own height and lifts the
   * `overflow-x: clip` of the page column so the board can use the full width.
   */
  private takeOverPage(): void {
    const pageGrid = this.pageGrid;
    if (!pageGrid) return;

    for (const child of Array.from(pageGrid.children) as HTMLElement[]) {
      if (child !== this.root && this.isLobbyCell(child)) this.setStyle(child, 'display', 'none');
    }
    // OpenFront gives the lobby row a fixed height.
    this.setStyle(pageGrid, 'grid-template-rows', 'auto');

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

  /** The FFA cell, and the section with the Team card, the Special card and the "See all" heading. */
  private isLobbyCell(element: HTMLElement): boolean {
    return (
      element.tagName === 'SECTION' ||
      (element.className.includes('sm:col-start-1') && element.className.includes('sm:row-start-2'))
    );
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

  /** Finds the grid of OpenFront's home page and puts the board before its first child. */
  private ensureMounted(): HTMLDivElement | null {
    if (this.root?.isConnected) return this.root;

    const selector = document.querySelector('game-mode-selector');
    const pageGrid = selector
      ? Array.from(selector.querySelectorAll('div')).find((el) =>
          el.className.includes(GRID_CLASS_MARKER)
        )
      : null;
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
    head.append(title, totals);
    const grid = document.createElement('div');
    grid.className = 'of-board-grid';
    root.append(head, grid);
    pageGrid.insertBefore(root, pageGrid.firstChild);

    this.root = root;
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
    this.cards.set(gameID, card);
    return card;
  }

  private updateCard(card: HTMLButtonElement, model: BoardCardModel): void {
    const signature = JSON.stringify([model.mapName, model.thumbnailUrl, model.badge]);
    if (this.signatures.get(model.gameID) === signature) return;
    this.signatures.set(model.gameID, signature);

    const thumb = document.createElement('span');
    thumb.className = 'of-board-thumb';
    if (model.thumbnailUrl) {
      const img = document.createElement('img');
      img.src = model.thumbnailUrl;
      img.alt = '';
      img.loading = 'lazy';
      thumb.append(img);
    }

    const badge = document.createElement('span');
    badge.className = 'of-board-badge';
    if (model.badge.kind === 'countdown') {
      // The text is set by tickCountdowns, which knows the clock offset.
      badge.dataset.countdownTo = String(model.badge.targetMs);
    } else {
      badge.textContent = model.badge.text;
    }

    const name = document.createElement('span');
    name.className = 'of-board-map';
    name.textContent = model.mapName;

    card.setAttribute('aria-label', `Open ${model.mapName} in OpenFront's join modal`);
    card.replaceChildren(thumb, badge, name);
  }
}
