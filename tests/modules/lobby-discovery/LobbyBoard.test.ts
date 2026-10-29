import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LobbyDiscoveryUI } from '@/modules/lobby-discovery/LobbyDiscoveryUI';
import { STORAGE_KEYS } from '@/config/constants';
import { LobbyUtils } from '@/utils/LobbyUtils';
import { getBoardStyles } from '@/styles/boardStyles';

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
 * Mirrors the lobby area of OpenFront's home page: a column that clips its
 * overflow, then the grid of game-mode-selector with the FFA cell, the section
 * with the Team card, the Special card and the "See all" heading, and the
 * Solo row.
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

function ffa(gameID: string, extra: Record<string, unknown> = {}, config: Record<string, unknown> = {}) {
  return {
    gameID,
    publicGameType: 'ffa',
    numClients: 3,
    gameConfig: { gameMode: 'Free For All', gameMap: 'Europe', maxPlayers: 40, ...config },
    ...extra,
  };
}

function team(gameID: string, extra: Record<string, unknown> = {}, config: Record<string, unknown> = {}) {
  return {
    gameID,
    publicGameType: 'team',
    numClients: 5,
    gameConfig: { gameMode: 'Team', gameMap: 'World', playerTeams: 4, maxPlayers: 24, ...config },
    ...extra,
  };
}

function hosted(gameID: string, extra: Record<string, unknown> = {}) {
  return {
    gameID,
    publicGameType: 'hosted',
    numClients: 2,
    gameConfig: { gameMode: 'Free For All', gameMap: 'Asia', maxPlayers: 20 },
    ...extra,
  };
}

function special(gameID: string, extra: Record<string, unknown> = {}) {
  return {
    gameID,
    publicGameType: 'special',
    numClients: 1,
    gameConfig: { gameMode: 'Free For All', gameMap: 'Africa', maxPlayers: 50 },
    ...extra,
  };
}

describe('Lobby Board', () => {
  let store: Map<string, any>;
  let ui: LobbyDiscoveryUI | null;

  const board = (): HTMLElement | null => document.getElementById('of-lobby-board');
  const cell = (queue: string, row: number): HTMLElement | null =>
    document.querySelector(`.of-board-cell[data-queue="${queue}"][data-row="${row}"]`);
  const cardIn = (queue: string, row: number): HTMLElement | null =>
    cell(queue, row)?.querySelector('.of-board-card') ?? null;

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
  });

  afterEach(() => {
    ui?.cleanup();
    ui = null;
    vi.clearAllTimers();
    vi.useRealTimers();
    document.body.innerHTML = '';
  });

  it('renders every lobby of every Queue in its column and row, with the right time badge', () => {
    ui = new LobbyDiscoveryUI();
    ui.receiveLobbyUpdate(
      [
        ffa('ffa-0', { startsAt: NOW + 65_000 }),
        ffa('ffa-1'),
        ffa('ffa-2', {}, { gameMap: 'Asia' }),
        team('team-0', { startsAt: NOW + 5_000 }),
        team('team-1'),
        special('special-0', { startsAt: NOW + 600_000 }),
        hosted('hosted-0', { autoStartAt: NOW + 120_000 }),
        hosted('hosted-1'),
      ] as any,
      NOW
    );

    expect(board()).toBeTruthy();
    expect(
      Array.from(board()!.querySelectorAll('.of-board-rowlabel')).map((el) => el.textContent)
    ).toEqual(['Live', '#1', '#2']);

    expect(cardIn('ffa', 0)?.dataset.gameId).toBe('ffa-0');
    expect(cardIn('ffa', 1)?.dataset.gameId).toBe('ffa-1');
    expect(cardIn('ffa', 2)?.dataset.gameId).toBe('ffa-2');
    expect(cardIn('team', 0)?.dataset.gameId).toBe('team-0');
    expect(cardIn('team', 1)?.dataset.gameId).toBe('team-1');
    expect(cardIn('special', 0)?.dataset.gameId).toBe('special-0');
    expect(cardIn('hosted', 0)?.dataset.gameId).toBe('hosted-0');
    expect(cardIn('hosted', 1)?.dataset.gameId).toBe('hosted-1');

    // A Queue that is shorter than the longest one gets empty placeholders.
    expect(cardIn('team', 2)).toBeNull();
    expect(cell('team', 2)?.querySelector('.of-board-empty')).toBeTruthy();
    expect(cell('special', 1)?.querySelector('.of-board-empty')).toBeTruthy();

    const badge = (queue: string, row: number) =>
      cardIn(queue, row)?.querySelector('.of-board-badge')?.textContent;
    expect(badge('ffa', 0)).toBe('1:05');
    expect(badge('team', 0)).toBe('0:05');
    expect(badge('special', 0)).toBe('10:00');
    expect(badge('hosted', 0)).toBe('2:00');
    expect(badge('ffa', 1)).toBe('Queue 1');
    expect(badge('ffa', 2)).toBe('Queue 2');
    expect(badge('hosted', 1)).toBe('Queue 1');

    expect(cardIn('ffa', 0)?.querySelector('.of-board-map')?.textContent).toBe('Europe');
    expect(cardIn('ffa', 2)?.querySelector('.of-board-map')?.textContent).toBe('Asia');
  });

  describe('match state', () => {
    function setCriteria(criteria: unknown[], extra: Record<string, unknown> = {}): void {
      store.set(STORAGE_KEYS.lobbyDiscoverySettings, {
        criteria,
        discoveryEnabled: true,
        soundEnabled: false,
        isTeamTwoTimesMinEnabled: false,
        ...extra,
      });
    }
    const ffaCriterion = { gameMode: 'FFA', teamCount: null, minPlayers: null, maxPlayers: null };

    it('marks a matching card as a match and greys every other card', () => {
      setCriteria([ffaCriterion]);
      ui = new LobbyDiscoveryUI();
      ui.receiveLobbyUpdate(
        [ffa('ffa-0'), ffa('ffa-1'), team('team-0'), team('team-1')] as any,
        NOW
      );

      expect(cardIn('ffa', 0)?.classList.contains('of-board-card-match')).toBe(true);
      expect(cardIn('ffa', 0)?.classList.contains('of-board-card-dim')).toBe(false);
      expect(cardIn('ffa', 1)?.classList.contains('of-board-card-match')).toBe(true);
      // A greyed card stays on the board.
      expect(cardIn('team', 0)?.classList.contains('of-board-card-dim')).toBe(true);
      expect(cardIn('team', 0)?.classList.contains('of-board-card-match')).toBe(false);
      expect(cardIn('team', 1)?.classList.contains('of-board-card-dim')).toBe(true);
    });

    it('shows the number of lobbies and matches in each column header and in the board header', () => {
      setCriteria([ffaCriterion]);
      ui = new LobbyDiscoveryUI();
      ui.receiveLobbyUpdate(
        [ffa('ffa-0'), ffa('ffa-1'), ffa('ffa-2'), team('team-0'), team('team-1')] as any,
        NOW
      );

      const head = (queue: string) =>
        document.querySelector(`.of-board-colhead[data-queue="${queue}"]`)?.textContent ?? '';
      expect(head('ffa')).toContain('FFA');
      expect(head('ffa')).toContain('3 lobbies');
      expect(head('ffa')).toContain('3 matches');
      expect(head('team')).toContain('2 lobbies');
      expect(head('team')).not.toContain('match');
      expect(head('special')).toContain('0 lobbies');
      expect(document.querySelector('.of-board-totals')?.textContent).toBe('3 matches · 5 lobbies');
    });

    it('updates the cards at once when a filter changes, without a new feed update', () => {
      setCriteria([ffaCriterion]);
      ui = new LobbyDiscoveryUI();
      ui.receiveLobbyUpdate([ffa('ffa-0')] as any, NOW);
      expect(cardIn('ffa', 0)?.classList.contains('of-board-card-match')).toBe(true);

      // One click makes Compact a required Modifier. The lobby is not compact.
      (document.getElementById('modifier-isCompact') as HTMLButtonElement).click();

      expect(cardIn('ffa', 0)?.classList.contains('of-board-card-dim')).toBe(true);
      expect(document.querySelector('.of-board-totals')?.textContent).toBe('0 matches · 1 lobby');
    });

    it('does not match a Hosted Lobby when Hosted and Custom Lobbies are excluded', () => {
      setCriteria([ffaCriterion], { includeHostedAndCustomLobbies: false });
      ui = new LobbyDiscoveryUI();
      ui.receiveLobbyUpdate([ffa('ffa-0'), hosted('hosted-0')] as any, NOW);

      expect(cardIn('ffa', 0)?.classList.contains('of-board-card-match')).toBe(true);
      expect(cardIn('hosted', 0)?.classList.contains('of-board-card-dim')).toBe(true);
    });

    it('greys no card while no Criterion is active', () => {
      setCriteria([]);
      ui = new LobbyDiscoveryUI();
      ui.receiveLobbyUpdate([ffa('ffa-0'), team('team-0')] as any, NOW);

      expect(board()?.querySelectorAll('.of-board-card-dim')).toHaveLength(0);
      expect(board()?.querySelectorAll('.of-board-card-match')).toHaveLength(0);
      expect(document.querySelector('.of-board-totals')?.textContent).toBe('0 matches · 2 lobbies');
    });
  });

  describe('joining', () => {
    it('opens the join window through /game/<gameID> on a card click, and never on a feed update', () => {
      const navSpy = vi
        .spyOn(LobbyDiscoveryUI.prototype as any, 'navigateToGame')
        .mockImplementation(() => {});

      ui = new LobbyDiscoveryUI();
      ui.receiveLobbyUpdate([ffa('ffa-0'), ffa('ffa-1'), team('team-0')] as any, NOW);
      ui.receiveLobbyUpdate([ffa('ffa-0'), ffa('ffa-1'), team('team-0')] as any, NOW);
      vi.advanceTimersByTime(5_000);
      expect(navSpy).not.toHaveBeenCalled();

      cardIn('ffa', 1)!.click();

      expect(navSpy).toHaveBeenCalledTimes(1);
      expect(navSpy).toHaveBeenCalledWith('/game/ffa-1');
      navSpy.mockRestore();
    });

    it('opens the join window of a lobby that is far down a Queue', () => {
      const navSpy = vi
        .spyOn(LobbyDiscoveryUI.prototype as any, 'navigateToGame')
        .mockImplementation(() => {});

      ui = new LobbyDiscoveryUI();
      ui.receiveLobbyUpdate([hosted('hosted-0'), hosted('hosted-1')] as any, NOW);
      cardIn('hosted', 1)!.click();

      expect(navSpy).toHaveBeenCalledWith('/game/hosted-1');
      navSpy.mockRestore();
    });
  });

  describe('page layout', () => {
    const pageColumn = () => document.getElementById('page-column') as HTMLElement;
    const isHidden = (id: string) => (document.getElementById(id) as HTMLElement).style.display === 'none';

    it('hides the lobby cells, keeps the other buttons and puts the board before them', () => {
      ui = new LobbyDiscoveryUI();
      ui.receiveLobbyUpdate([ffa('ffa-0')] as any, NOW);

      expect(isHidden('ffa-cell')).toBe(true);
      expect(isHidden('side-section')).toBe(true);
      expect(isHidden('solo-row')).toBe(false);

      const grid = document.getElementById('lobby-grid')!;
      expect(grid.firstElementChild).toBe(board());
    });

    it('lifts the clipping of the page column while the board shows and restores it on cleanup', () => {
      expect(getComputedStyle(pageColumn()).overflowX).toBe('clip');

      ui = new LobbyDiscoveryUI();
      ui.receiveLobbyUpdate([ffa('ffa-0')] as any, NOW);
      expect(getComputedStyle(pageColumn()).overflowX).toBe('visible');

      ui.cleanup();
      ui = null;
      expect(getComputedStyle(pageColumn()).overflowX).toBe('clip');
      expect(pageColumn().getAttribute('style')).toBe('overflow-x: clip;');
      expect(board()).toBeNull();
      expect(isHidden('ffa-cell')).toBe(false);
      expect(isHidden('side-section')).toBe(false);
    });

    describe('gutter', () => {
      class FakeResizeObserver {
        static instances: FakeResizeObserver[] = [];
        observed: Element[] = [];
        disconnected = false;
        constructor(public callback: () => void) {
          FakeResizeObserver.instances.push(this);
        }
        observe(element: Element): void {
          this.observed.push(element);
        }
        disconnect(): void {
          this.disconnected = true;
        }
      }
      let gridLeft: number;
      let viewportWidth: number;

      const pageGrid = () => document.getElementById('lobby-grid') as HTMLElement;
      const variable = (name: string) => board()!.style.getPropertyValue(name);

      beforeEach(() => {
        gridLeft = 50;
        viewportWidth = 1903;
        FakeResizeObserver.instances = [];
        (globalThis as any).ResizeObserver = FakeResizeObserver;
        pageGrid().getBoundingClientRect = () => ({ left: gridLeft }) as DOMRect;
        Object.defineProperty(document.documentElement, 'clientWidth', {
          configurable: true,
          get: () => viewportWidth,
        });
      });

      afterEach(() => {
        delete (globalThis as any).ResizeObserver;
        delete (document.documentElement as any).clientWidth;
      });

      it('puts the board 16 px from the left edge and 16 px from the right edge of the viewport', () => {
        ui = new LobbyDiscoveryUI();
        ui.receiveLobbyUpdate([ffa('ffa-0')] as any, NOW);

        const left = parseFloat(variable('--of-board-left'));
        const width = parseFloat(variable('--of-board-width'));
        expect(gridLeft + left).toBe(16);
        expect(gridLeft + left + width).toBe(viewportWidth - 16);
      });

      it('measures again when the window resizes', () => {
        ui = new LobbyDiscoveryUI();
        ui.receiveLobbyUpdate([ffa('ffa-0')] as any, NOW);

        gridLeft = 10;
        viewportWidth = 1600;
        window.dispatchEvent(new Event('resize'));

        expect(variable('--of-board-left')).toBe('6px');
        expect(variable('--of-board-width')).toBe('1568px');
      });

      it('measures again when the viewport or the page grid changes size', () => {
        ui = new LobbyDiscoveryUI();
        ui.receiveLobbyUpdate([ffa('ffa-0')] as any, NOW);

        const [observer] = FakeResizeObserver.instances;
        expect(observer!.observed).toEqual([document.documentElement, pageGrid()]);

        viewportWidth = 1500;
        observer!.callback();
        expect(variable('--of-board-width')).toBe('1468px');
      });

      it('stops measuring when the board is hidden or removed', () => {
        ui = new LobbyDiscoveryUI();
        ui.receiveLobbyUpdate([ffa('ffa-0')] as any, NOW);
        const [observer] = FakeResizeObserver.instances;

        ui.cleanup();
        ui = null;

        expect(observer!.disconnected).toBe(true);
        viewportWidth = 1000;
        window.dispatchEvent(new Event('resize'));
        expect(board()).toBeNull();
      });

      it('does not use the viewport unit, which counts the scrollbar', () => {
        ui = new LobbyDiscoveryUI();
        ui.receiveLobbyUpdate([ffa('ffa-0')] as any, NOW);

        expect(getBoardStyles()).not.toContain('vw');
        expect(getBoardStyles()).toContain('width: var(--of-board-width)');
        expect(getBoardStyles()).toContain('margin-left: var(--of-board-left)');
      });
    });

    it('leaves OpenFront\'s page untouched off the lobby page and during a game', () => {
      vi.mocked(LobbyUtils.isOnLobbyPage).mockReturnValue(false);
      ui = new LobbyDiscoveryUI();
      ui.receiveLobbyUpdate([ffa('ffa-0')] as any, NOW);

      expect(board()?.style.display ?? 'none').toBe('none');
      expect(getComputedStyle(pageColumn()).overflowX).toBe('clip');
      expect(isHidden('ffa-cell')).toBe(false);
      expect(isHidden('side-section')).toBe(false);
    });

    it('sleeps when a game starts, and shows the board again on the lobby page', () => {
      ui = new LobbyDiscoveryUI();
      ui.receiveLobbyUpdate([ffa('ffa-0')] as any, NOW);
      expect(board()?.style.display).not.toBe('none');

      vi.mocked(LobbyUtils.isOnLobbyPage).mockReturnValue(false);
      ui.receiveLobbyUpdate([ffa('ffa-0')] as any, NOW);
      expect(board()?.style.display).toBe('none');
      expect(getComputedStyle(pageColumn()).overflowX).toBe('clip');
      expect(isHidden('ffa-cell')).toBe(false);

      vi.mocked(LobbyUtils.isOnLobbyPage).mockReturnValue(true);
      ui.receiveLobbyUpdate([ffa('ffa-0')] as any, NOW);
      expect(board()?.style.display).not.toBe('none');
      expect(getComputedStyle(pageColumn()).overflowX).toBe('visible');
      expect(isHidden('ffa-cell')).toBe(true);
    });

    it('hides the board again as soon as the URL changes to a game, without a feed update', async () => {
      const { URLObserver } = await import('@/utils/URLObserver');
      ui = new LobbyDiscoveryUI();
      ui.receiveLobbyUpdate([ffa('ffa-0')] as any, NOW);
      const onUrlChange = vi.mocked(URLObserver.subscribe).mock.calls.at(-1)![0] as (url: string) => void;

      vi.mocked(LobbyUtils.isOnLobbyPage).mockReturnValue(false);
      onUrlChange('https://openfront.io/?live');

      expect(board()?.style.display).toBe('none');
      expect(getComputedStyle(pageColumn()).overflowX).toBe('clip');
    });

    it('does nothing when OpenFront has no lobby grid to hold the board', () => {
      document.getElementById('lobby-grid')!.className = 'unknown-layout';
      ui = new LobbyDiscoveryUI();
      ui.receiveLobbyUpdate([ffa('ffa-0')] as any, NOW);

      expect(board()).toBeNull();
      expect(isHidden('ffa-cell')).toBe(false);
      expect(getComputedStyle(pageColumn()).overflowX).toBe('clip');
    });
  });

  describe('countdowns and in-place updates', () => {
    const badgeOf = (queue: string, row: number) =>
      cardIn(queue, row)?.querySelector('.of-board-badge') as HTMLElement;

    it('corrects the countdown with the feed clock, so a wrong local clock does not shift it', () => {
      ui = new LobbyDiscoveryUI();
      // The local clock is 100 s behind the feed.
      ui.receiveLobbyUpdate([ffa('ffa-0', { startsAt: NOW + 100_000 + 65_000 })] as any, NOW + 100_000);

      expect(badgeOf('ffa', 0).textContent).toBe('1:05');
    });

    it('ticks each second without rebuilding the card, and stops at 0:00', () => {
      ui = new LobbyDiscoveryUI();
      ui.receiveLobbyUpdate([ffa('ffa-0', { startsAt: NOW + 3_000 })] as any, NOW);
      const card = cardIn('ffa', 0);
      const badge = badgeOf('ffa', 0);
      expect(badge.textContent).toBe('0:03');

      vi.advanceTimersByTime(1_000);
      expect(badgeOf('ffa', 0)).toBe(badge);
      expect(badge.textContent).toBe('0:02');

      vi.advanceTimersByTime(5_000);
      expect(badge.textContent).toBe('0:00');
      expect(cardIn('ffa', 0)).toBe(card);
    });

    it('does not tick while the board is hidden', () => {
      ui = new LobbyDiscoveryUI();
      ui.receiveLobbyUpdate([ffa('ffa-0', { startsAt: NOW + 60_000 })] as any, NOW);
      const badge = badgeOf('ffa', 0);

      vi.mocked(LobbyUtils.isOnLobbyPage).mockReturnValue(false);
      ui.receiveLobbyUpdate([ffa('ffa-0', { startsAt: NOW + 60_000 })] as any, NOW);
      vi.advanceTimersByTime(10_000);

      expect(badge.textContent).toBe('1:00');
    });

    it('keeps the same card node across an unchanged update', () => {
      ui = new LobbyDiscoveryUI();
      const lobbies = () => [ffa('ffa-0'), ffa('ffa-1'), team('team-0')] as any;
      ui.receiveLobbyUpdate(lobbies(), NOW);
      const before = cardIn('ffa', 1);
      const childBefore = before?.firstElementChild;

      ui.receiveLobbyUpdate(lobbies(), NOW);
      vi.advanceTimersByTime(32);

      expect(cardIn('ffa', 1)).toBe(before);
      expect(before?.firstElementChild).toBe(childBefore);
    });

    it('moves a card to its new row when the Queue advances, and drops a lobby that left the feed', () => {
      ui = new LobbyDiscoveryUI();
      ui.receiveLobbyUpdate([ffa('ffa-0'), ffa('ffa-1'), ffa('ffa-2')] as any, NOW);
      const second = cardIn('ffa', 1);

      // The Live Lobby starts and leaves; a new lobby joins at the end.
      ui.receiveLobbyUpdate([ffa('ffa-1'), ffa('ffa-2'), ffa('ffa-3')] as any, NOW);

      expect(cardIn('ffa', 0)).toBe(second);
      expect(cardIn('ffa', 0)?.dataset.gameId).toBe('ffa-1');
      expect(cardIn('ffa', 2)?.dataset.gameId).toBe('ffa-3');
      expect(document.querySelector('.of-board-card[data-game-id="ffa-0"]')).toBeNull();
      expect(cardIn('ffa', 0)?.querySelector('.of-board-badge')?.textContent).toBe('Live');
      expect(cardIn('ffa', 1)?.querySelector('.of-board-badge')?.textContent).toBe('Queue 1');
    });

    it('shrinks the board when the longest Queue gets shorter', () => {
      ui = new LobbyDiscoveryUI();
      ui.receiveLobbyUpdate([ffa('ffa-0'), ffa('ffa-1'), ffa('ffa-2')] as any, NOW);
      ui.receiveLobbyUpdate([ffa('ffa-0')] as any, NOW);

      expect(board()?.querySelectorAll('.of-board-rowlabel')).toHaveLength(1);
      expect(board()?.querySelectorAll('.of-board-card')).toHaveLength(1);
    });
  });

  describe('card content', () => {
    const text = (card: HTMLElement | null, selector: string) =>
      card?.querySelector(selector)?.textContent ?? null;
    const modifiers = (card: HTMLElement | null) =>
      Array.from(card?.querySelectorAll<HTMLElement>('.of-board-mod') ?? []).map((el) => [
        el.textContent,
        el.classList.contains('of-board-mod-required')
          ? 'required'
          : el.classList.contains('of-board-mod-blocked')
            ? 'blocked'
            : 'neutral',
      ]);

    it('shows the team format in plain words, the players and the capacity with a fill bar', () => {
      ui = new LobbyDiscoveryUI();
      ui.receiveLobbyUpdate(
        [
          ffa('ffa-0', { numClients: 10 }, { maxPlayers: 40 }),
          team('team-0', { numClients: 6 }, { playerTeams: 'Quads', maxPlayers: 44 }),
          team('team-1', { numClients: 5 }, { playerTeams: 7, maxPlayers: 112 }),
        ] as any,
        NOW
      );

      expect(text(cardIn('ffa', 0), '.of-board-format')).toBe('Free for all · 40 players');
      expect(text(cardIn('team', 0), '.of-board-format')).toBe('Quads · 11 teams of 4');
      expect(text(cardIn('team', 1), '.of-board-format')).toBe('7 teams of 16');

      expect(text(cardIn('ffa', 0), '.of-board-players')).toBe('10 / 40');
      expect(
        cardIn('ffa', 0)?.querySelector<HTMLElement>('.of-board-fill')?.style.width
      ).toBe('25%');
      expect(text(cardIn('team', 0), '.of-board-players')).toBe('6 / 44');
    });

    it('lists every active Modifier by its full name, without truncating it', () => {
      ui = new LobbyDiscoveryUI();
      ui.receiveLobbyUpdate(
        [
          ffa('ffa-0', {}, {
            publicGameModifiers: { isRandomSpawn: true, startingGold: 5_000_000, goldMultiplier: 2 },
          }),
        ] as any,
        NOW
      );

      expect(modifiers(cardIn('ffa', 0))).toEqual([
        ['Random Spawn', 'neutral'],
        ['Start Gold 5M', 'neutral'],
        ['Gold ×2', 'neutral'],
      ]);
    });

    it('says "No modifiers" on a card without Modifiers', () => {
      ui = new LobbyDiscoveryUI();
      ui.receiveLobbyUpdate([ffa('ffa-0')] as any, NOW);

      expect(modifiers(cardIn('ffa', 0))).toEqual([]);
      expect(text(cardIn('ffa', 0), '.of-board-nomods')).toBe('No modifiers');
    });

    it('makes a required Modifier stand out and strikes out a blocked one', () => {
      store.set(STORAGE_KEYS.lobbyDiscoverySettings, {
        criteria: [
          {
            gameMode: 'FFA',
            teamCount: null,
            minPlayers: null,
            maxPlayers: null,
            modifiers: { isRandomSpawn: 'required', isCrowded: 'blocked' },
          },
        ],
        discoveryEnabled: true,
        soundEnabled: false,
        isTeamTwoTimesMinEnabled: false,
      });
      ui = new LobbyDiscoveryUI();
      ui.receiveLobbyUpdate(
        [
          ffa('ffa-0', {}, { publicGameModifiers: { isRandomSpawn: true, isPeaceTime: true } }),
          ffa('ffa-1', {}, { publicGameModifiers: { isRandomSpawn: true, isCrowded: true } }),
        ] as any,
        NOW
      );

      expect(modifiers(cardIn('ffa', 0))).toEqual([
        ['Random Spawn', 'required'],
        ['Peace Time', 'neutral'],
      ]);
      expect(modifiers(cardIn('ffa', 1))).toEqual([
        ['Random Spawn', 'required'],
        ['Crowded', 'blocked'],
      ]);
    });

    it('updates the Modifier states when a filter changes', () => {
      store.set(STORAGE_KEYS.lobbyDiscoverySettings, {
        criteria: [{ gameMode: 'FFA', teamCount: null, minPlayers: null, maxPlayers: null }],
        discoveryEnabled: true,
        soundEnabled: false,
        isTeamTwoTimesMinEnabled: false,
      });
      ui = new LobbyDiscoveryUI();
      ui.receiveLobbyUpdate(
        [ffa('ffa-0', {}, { publicGameModifiers: { isRandomSpawn: true } })] as any,
        NOW
      );
      expect(modifiers(cardIn('ffa', 0))).toEqual([['Random Spawn', 'neutral']]);

      const chip = document.getElementById('modifier-isRandomSpawn') as HTMLButtonElement;
      chip.click();

      expect(modifiers(cardIn('ffa', 0))).toEqual([['Random Spawn', 'required']]);
    });

    it('tags a Hosted Lobby "Hosted" and a Custom Lobby "Custom"', () => {
      ui = new LobbyDiscoveryUI();
      ui.receiveLobbyUpdate(
        [
          ffa('ffa-0'),
          special('special-0'),
          special('special-1', { custom: true }),
          hosted('hosted-0'),
        ] as any,
        NOW
      );

      const tags = (card: HTMLElement | null) =>
        Array.from(card?.querySelectorAll('.of-board-tag') ?? []).map((el) => el.textContent);
      expect(tags(cardIn('ffa', 0))).toEqual([]);
      expect(tags(cardIn('special', 0))).toEqual([]);
      expect(tags(cardIn('special', 1))).toEqual(['Custom']);
      expect(tags(cardIn('hosted', 0))).toEqual(['Hosted']);
    });

    it('shows a countdown on a Hosted Lobby that has autoStartAt', () => {
      ui = new LobbyDiscoveryUI();
      ui.receiveLobbyUpdate(
        [ffa('ffa-0'), hosted('hosted-0', { autoStartAt: NOW + 90_000 })] as any,
        NOW
      );

      const badge = cardIn('hosted', 0)?.querySelector<HTMLElement>('.of-board-badge');
      expect(badge?.textContent).toBe('1:30');
      expect(badge?.dataset.countdownTo).toBe(String(NOW + 90_000));

      vi.advanceTimersByTime(10_000);
      expect(badge?.textContent).toBe('1:20');
    });

    it('does not show "Queue 0" on a Hosted Lobby without autoStartAt', () => {
      ui = new LobbyDiscoveryUI();
      ui.receiveLobbyUpdate([ffa('ffa-0'), hosted('hosted-0'), hosted('hosted-1')] as any, NOW);

      expect(text(cardIn('hosted', 0), '.of-board-badge')).toBe('Waiting');
      expect(text(cardIn('hosted', 1), '.of-board-badge')).toBe('Queue 1');
    });

    it('redraws the card when its player count changes', () => {
      ui = new LobbyDiscoveryUI();
      ui.receiveLobbyUpdate([ffa('ffa-0', { numClients: 10 })] as any, NOW);
      ui.receiveLobbyUpdate([ffa('ffa-0', { numClients: 30 })] as any, NOW);

      expect(text(cardIn('ffa', 0), '.of-board-players')).toBe('30 / 40');
    });

    it('updates a card in place: a new player count keeps the card, the image and the badge nodes', () => {
      ui = new LobbyDiscoveryUI();
      ui.receiveLobbyUpdate([ffa('ffa-0', { numClients: 10 })] as any, NOW);
      const before = cardIn('ffa', 0)!;
      const img = before.querySelector('img');
      const badge = before.querySelector('.of-board-badge');
      const fill = before.querySelector('.of-board-fill') as HTMLElement;
      expect(img).toBeTruthy();
      expect(fill.style.width).toBe('25%');

      ui.receiveLobbyUpdate([ffa('ffa-0', { numClients: 30 })] as any, NOW);

      const after = cardIn('ffa', 0)!;
      expect(after).toBe(before);
      expect(after.querySelector('img')).toBe(img);
      expect(after.querySelector('.of-board-badge')).toBe(badge);
      expect(after.querySelector('.of-board-fill')).toBe(fill);
      expect(fill.style.width).toBe('75%');
      expect(text(after, '.of-board-players')).toBe('30 / 40');
    });

    it('keeps the image node when the map stays the same and replaces it when the map changes', () => {
      ui = new LobbyDiscoveryUI();
      ui.receiveLobbyUpdate([ffa('ffa-0', {}, { gameMap: 'Europe' })] as any, NOW);
      const img = cardIn('ffa', 0)!.querySelector('img');
      ui.receiveLobbyUpdate([ffa('ffa-0', { numClients: 9 }, { gameMap: 'Europe' })] as any, NOW);
      expect(cardIn('ffa', 0)!.querySelector('img')).toBe(img);

      ui.receiveLobbyUpdate([ffa('ffa-0', {}, { gameMap: 'Asia' })] as any, NOW);
      expect(text(cardIn('ffa', 0), '.of-board-map')).toBe('Asia');
      expect(cardIn('ffa', 0)!.querySelector('img')?.getAttribute('src')).toContain('asia');
    });

    it('updates the Modifier chips in place when a filter changes', () => {
      store.set(STORAGE_KEYS.lobbyDiscoverySettings, {
        criteria: [{ gameMode: 'FFA', teamCount: null, minPlayers: null, maxPlayers: null }],
        discoveryEnabled: true,
        soundEnabled: false,
        isTeamTwoTimesMinEnabled: false,
      });
      ui = new LobbyDiscoveryUI();
      ui.receiveLobbyUpdate([ffa('ffa-0', {}, { publicGameModifiers: { isCompact: true } })] as any, NOW);
      const chip = cardIn('ffa', 0)!.querySelector('.of-board-mod');
      expect(chip?.textContent).toBe('Compact');

      (document.getElementById('modifier-isCompact') as HTMLButtonElement).click();

      const after = cardIn('ffa', 0)!.querySelector('.of-board-mod');
      expect(after?.classList.contains('of-board-mod-required')).toBe(true);
      expect(after).toBe(chip);
    });
  });
});
