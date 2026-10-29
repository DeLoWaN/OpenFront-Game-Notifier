import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LobbyDiscoveryFilters } from '@/modules/lobby-discovery/LobbyDiscoveryFilters';
import type { FilterChange } from '@/modules/lobby-discovery/LobbyDiscoveryFilters';
import type { FilterSettings } from '@/modules/lobby-discovery/LobbyDiscoveryTypes';
import { STORAGE_KEYS } from '@/config/constants';
import type { Lobby } from '@/types/game';

const EMPTY_SETTINGS: FilterSettings = {
  criteria: [],
  isTeamTwoTimesMinEnabled: false,
  includeHostedAndCustomLobbies: true,
  mapFilter: {},
};

describe('LobbyDiscoveryFilters', () => {
  let store: Map<string, unknown>;
  let changes: FilterChange[];
  let filters: LobbyDiscoveryFilters | null;

  function create(initial: Partial<FilterSettings> = {}): LobbyDiscoveryFilters {
    filters = new LobbyDiscoveryFilters({
      initial: { ...EMPTY_SETTINGS, ...initial },
      onChange: (change) => changes.push(change),
    });
    return filters;
  }

  // The container is never attached to the document: the component must find its
  // controls inside its own DOM, never through `document`.
  function mountDetached(instance: LobbyDiscoveryFilters): HTMLElement {
    const container = document.createElement('div');
    instance.mount(container);
    return container;
  }

  const byId = <T extends HTMLElement>(root: ParentNode, id: string): T =>
    root.querySelector(`[id="${id}"]`) as T;

  // A checkbox in a detached tree does not fire `change` on click, so the test fires it.
  const flip = (checkbox: HTMLInputElement): void => {
    checkbox.checked = !checkbox.checked;
    checkbox.dispatchEvent(new Event('change', { bubbles: true }));
  };

  beforeEach(() => {
    store = new Map();
    changes = [];
    filters = null;
    (globalThis as any).GM_getValue = vi.fn((key: string, defaultValue?: unknown) =>
      store.has(key) ? store.get(key) : defaultValue
    );
    (globalThis as any).GM_setValue = vi.fn((key: string, value: unknown) => {
      store.set(key, value);
    });
  });

  afterEach(() => {
    filters?.cleanup();
    document.body.innerHTML = '';
  });

  describe('mount and cleanup', () => {
    it('renders the four sections, the active filter count and "Reset all" into the container', () => {
      const container = mountDetached(create());

      for (const section of ['modes', 'modifiers', 'maps', 'lobbies']) {
        expect(byId(container, `discovery-${section}-toggle`)).toBeTruthy();
        expect(byId(container, `discovery-${section}-body`)).toBeTruthy();
      }
      expect(byId(container, 'discovery-filter-count').textContent).toBe('0');
      expect(byId(container, 'discovery-filter-word').textContent).toBe('filters');
      expect(byId(container, 'discovery-reset').textContent).toBe('Reset all');
    });

    it('renders nothing outside the container', () => {
      mountDetached(create());
      expect(document.getElementById('discovery-ffa')).toBeNull();
    });

    it('removes everything it rendered on cleanup', () => {
      const instance = create();
      const container = mountDetached(instance);
      instance.cleanup();
      expect(container.childElementCount).toBe(0);
    });

    it('shows the saved filters when it mounts', () => {
      const container = mountDetached(
        create({
          criteria: [
            {
              gameMode: 'Team',
              teamCount: 7,
              minPlayers: 3,
              maxPlayers: 16,
              modifiers: { isRandomSpawn: 'required', isCompact: 'blocked' },
            },
          ],
          includeHostedAndCustomLobbies: false,
          mapFilter: { World: 'required' },
        })
      );

      expect(byId<HTMLInputElement>(container, 'discovery-team').checked).toBe(true);
      expect(byId<HTMLInputElement>(container, 'discovery-ffa').checked).toBe(false);
      expect(byId<HTMLInputElement>(container, 'discovery-team-7').checked).toBe(true);
      expect(byId<HTMLInputElement>(container, 'discovery-team-min').value).toBe('3');
      expect(byId(container, 'modifier-isRandomSpawn').dataset.state).toBe('required');
      expect(byId(container, 'modifier-isCompact').dataset.state).toBe('blocked');
      expect(byId<HTMLInputElement>(container, 'discovery-hosted-toggle').checked).toBe(false);
      expect(byId(container, 'discovery-maps-summary').textContent).toBe('1 required');
      // Team mode + 1 team format + 2 modifiers.
      expect(byId(container, 'discovery-filter-count').textContent).toBe('4');
    });
  });

  describe('filter changes', () => {
    it('reports a criteria change and exposes the new criteria when a mode is switched on', () => {
      const instance = create();
      const container = mountDetached(instance);

      flip(byId<HTMLInputElement>(container, 'discovery-ffa'));

      expect(changes).toEqual(['criteria']);
      const [criterion] = instance.getSettings().criteria;
      expect(instance.getSettings().criteria).toHaveLength(1);
      expect(criterion?.gameMode).toBe('FFA');
      expect(criterion?.teamCount).toBeNull();
      expect(byId(container, 'discovery-filter-count').textContent).toBe('1');
      expect(byId(container, 'discovery-filter-word').textContent).toBe('filter');
    });

    it('cycles a Modifier through required and blocked and reports each step', () => {
      const instance = create();
      const container = mountDetached(instance);
      flip(byId<HTMLInputElement>(container, 'discovery-ffa'));
      changes.length = 0;

      const chip = byId(container, 'modifier-isCompact');
      chip.click();
      expect(instance.getSettings().criteria[0]!.modifiers?.isCompact).toBe('required');
      chip.click();
      expect(instance.getSettings().criteria[0]!.modifiers?.isCompact).toBe('blocked');
      chip.click();
      expect(instance.getSettings().criteria[0]!.modifiers?.isCompact).toBe('any');
      expect(changes).toEqual(['criteria', 'criteria', 'criteria']);
    });

    it('reports a map change and exposes the Map Filter when a map chip is clicked', () => {
      const instance = create();
      const container = mountDetached(instance);

      container.querySelector<HTMLElement>('[data-game-map="World"]')!.click();

      expect(changes).toEqual(['maps']);
      expect(instance.getSettings().mapFilter).toEqual({ World: 'required' });
      expect(byId(container, 'discovery-maps-summary').textContent).toBe('1 required');
    });

    it('clears the Map Filter from the maps "Clear" button', () => {
      const instance = create({ mapFilter: { World: 'blocked' } });
      const container = mountDetached(instance);

      byId(container, 'discovery-maps-clear').click();

      expect(changes).toEqual(['maps']);
      expect(instance.getSettings().mapFilter).toEqual({});
      expect(byId(container, 'discovery-maps-summary').textContent).toBe('Any map');
    });

    it('reports a lobbies change when the hosted and custom option is switched', () => {
      const instance = create();
      const container = mountDetached(instance);

      flip(byId<HTMLInputElement>(container, 'discovery-hosted-toggle'));

      expect(changes).toEqual(['lobbies']);
      expect(instance.getSettings().includeHostedAndCustomLobbies).toBe(false);
    });

    it('resets every filter and reports one criteria change on "Reset all"', () => {
      const instance = create({
        criteria: [
          {
            gameMode: 'FFA',
            teamCount: null,
            minPlayers: 10,
            maxPlayers: 50,
            modifiers: { isCompact: 'required' },
          },
        ],
        mapFilter: { World: 'required' },
      });
      const container = mountDetached(instance);

      byId(container, 'discovery-reset').click();

      expect(changes).toEqual(['criteria']);
      expect(instance.getSettings()).toEqual({
        criteria: [],
        isTeamTwoTimesMinEnabled: false,
        includeHostedAndCustomLobbies: true,
        mapFilter: {},
      });
      expect(byId(container, 'modifier-isCompact').dataset.state).toBe('any');
      expect(byId(container, 'discovery-maps-summary').textContent).toBe('Any map');
      expect(byId(container, 'discovery-filter-count').textContent).toBe('0');
    });

    it('keeps the player slider in step with its number inputs', () => {
      const instance = create();
      const container = mountDetached(instance);
      flip(byId<HTMLInputElement>(container, 'discovery-ffa'));
      changes.length = 0;

      const max = byId<HTMLInputElement>(container, 'discovery-ffa-max');
      max.value = '40';
      max.dispatchEvent(new Event('change', { bubbles: true }));

      expect(changes).toEqual(['criteria']);
      expect(instance.getSettings().criteria[0]!.maxPlayers).toBe(40);
    });
  });

  describe('maps missing from the catalogue', () => {
    it('adds a chip for a map that only the feed knows, once', () => {
      const instance = create();
      const container = mountDetached(instance);
      const lobby = { gameID: 'g1', gameConfig: { gameMap: 'Brand New Map' } } as unknown as Lobby;

      instance.addFeedOnlyMaps([lobby]);
      instance.addFeedOnlyMaps([lobby]);

      const chips = container.querySelectorAll('[data-game-map="Brand New Map"]');
      expect(chips).toHaveLength(1);
      (chips[0] as HTMLElement).click();
      expect(instance.getSettings().mapFilter).toEqual({ 'Brand New Map': 'required' });
    });
  });

  describe('current game info', () => {
    it('shows and hides the text of the current game', () => {
      const instance = create();
      const container = mountDetached(instance);
      const info = byId(container, 'discovery-current-game-info');

      instance.setCurrentGameInfo('Current game: 7 teams of 16');
      expect(info.style.display).toBe('block');
      expect(info.textContent).toBe('Current game: 7 teams of 16');

      instance.setCurrentGameInfo(null);
      expect(info.style.display).toBe('none');
    });
  });

  describe('collapsed sections', () => {
    const sections = ['modes', 'modifiers', 'maps', 'lobbies'] as const;

    it('opens every section but Maps by default', () => {
      const container = mountDetached(create());
      expect(
        sections.map((name) => [name, byId(container, `discovery-${name}-body`).hidden])
      ).toEqual([
        ['modes', false],
        ['modifiers', false],
        ['maps', true],
        ['lobbies', false],
      ]);
    });

    it('saves the collapsed state of a section and restores it in a new component', () => {
      const first = create();
      const firstContainer = mountDetached(first);
      byId(firstContainer, 'discovery-modes-toggle').click();
      byId(firstContainer, 'discovery-maps-toggle').click();
      expect(store.get(STORAGE_KEYS.lobbyDiscoveryCollapsedSections)).toEqual({
        modes: true,
        modifiers: false,
        maps: false,
        lobbies: false,
      });
      first.cleanup();

      const secondContainer = mountDetached(create());
      expect(byId(secondContainer, 'discovery-modes-body').hidden).toBe(true);
      expect(byId(secondContainer, 'discovery-maps-body').hidden).toBe(false);
      expect(byId(secondContainer, 'discovery-modes-toggle').getAttribute('aria-expanded')).toBe(
        'false'
      );
    });
  });

  describe('two mounted components', () => {
    it('keeps each component to its own controls', () => {
      const first = create();
      const second = new LobbyDiscoveryFilters({
        initial: EMPTY_SETTINGS,
        onChange: () => {},
      });
      const firstContainer = document.createElement('div');
      const secondContainer = document.createElement('div');
      document.body.append(firstContainer, secondContainer);
      first.mount(firstContainer);
      second.mount(secondContainer);

      flip(byId<HTMLInputElement>(secondContainer, 'discovery-ffa'));
      byId(secondContainer, 'discovery-maps-toggle').click();

      expect(first.getSettings().criteria).toEqual([]);
      expect(second.getSettings().criteria).toHaveLength(1);
      expect(byId<HTMLInputElement>(firstContainer, 'discovery-ffa').checked).toBe(false);
      expect(byId(firstContainer, 'discovery-maps-body').hidden).toBe(true);
      expect(changes).toEqual([]);
      second.cleanup();
    });
  });
});
