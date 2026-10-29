/**
 * LobbyDiscoveryFilters - the filter sections of the notifier.
 *
 * The sections are Modes, Modifiers, Maps and Lobbies, with the active filter
 * count and "Reset all". Any container can mount the component. It finds its
 * controls inside its own DOM, so two instances never read each other's controls.
 */

import {
  STORAGE_KEYS,
  TEAM_PLAYERS_PER_TEAM_STOPS,
  TEAM_MIN_PLAYERS_PER_TEAM,
  TEAM_MAX_PLAYERS_PER_TEAM,
} from '@/config/constants';
import {
  MAP_CATALOGUE,
  MAP_CATEGORY_LABELS,
  MAP_CATEGORY_ORDER,
  type MapCategory,
} from '@/config/mapCatalogue';
import type { Lobby } from '@/types/game';
import { escapeHtml } from '@/utils/HtmlUtils';
import { RangeSlider } from '@/modules/lobby-discovery/RangeSlider';
import type {
  DiscoveryCriteria,
  MapFilter,
  ModifierFilters,
  ModifierFilterState,
  TeamCount,
} from './LobbyDiscoveryTypes';

/** The filter values that the player edits in the sections. */
export interface FilterSettings {
  criteria: DiscoveryCriteria[];
  isTeamTwoTimesMinEnabled: boolean;
  includeHostedAndCustomLobbies: boolean;
  mapFilter: MapFilter;
}

/** What changed: the Criteria, the Map Filter or the "Lobbies" option. */
export type FilterChange = 'criteria' | 'maps' | 'lobbies';

export interface LobbyDiscoveryFiltersOptions {
  initial: FilterSettings;
  /** Called after every change that the player makes. `getSettings()` then returns the new values. */
  onChange: (change: FilterChange) => void;
}

const STARTING_GOLD_VALUES = [1_000_000, 5_000_000, 25_000_000] as const;
const GOLD_MULTIPLIER_VALUES = [2] as const;

const MODIFIER_BOOLEAN_IDS = [
  'modifier-isCompact',
  'modifier-isRandomSpawn',
  'modifier-isCrowded',
  'modifier-isHardNations',
  'modifier-isAlliancesDisabled',
  'modifier-isNukesDisabled',
  'modifier-isSAMsDisabled',
  'modifier-isPeaceTime',
  'modifier-isWaterNukes',
  'modifier-isDoomsdayClock',
  'modifier-isTrusted',
] as const;

const ALL_MODIFIER_IDS: string[] = [
  ...MODIFIER_BOOLEAN_IDS,
  ...STARTING_GOLD_VALUES.map((v) => `modifier-startingGold-${v}`),
  ...GOLD_MULTIPLIER_VALUES.map((v) => `modifier-goldMultiplier-${v}`),
];

const TEAM_COUNT_IDS: Array<[string, string]> = [
  ['discovery-team-hvn', 'Humans Vs Nations'],
  ['discovery-team-2', '2'],
  ['discovery-team-3', '3'],
  ['discovery-team-4', '4'],
  ['discovery-team-5', '5'],
  ['discovery-team-6', '6'],
  ['discovery-team-7', '7'],
  ['discovery-team-8plus', '8+'],
];

const ALL_TEAM_IDS: string[] = TEAM_COUNT_IDS.map(([id]) => id);

const PANEL_SECTIONS = ['modes', 'modifiers', 'maps', 'lobbies'] as const;
type PanelSection = (typeof PANEL_SECTIONS)[number];
const DEFAULT_COLLAPSED_SECTIONS: Record<PanelSection, boolean> = {
  modes: false,
  modifiers: false,
  maps: true,
  lobbies: false,
};

const ICON_CHECK = `<svg viewBox="0 0 24 24"><path d="M5 12l5 5L20 7"/></svg>`;
const ICON_CROSS = `<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>`;

function loadCollapsedSections(): Record<PanelSection, boolean> {
  const saved = GM_getValue<Partial<Record<PanelSection, unknown>> | null>(
    STORAGE_KEYS.lobbyDiscoveryCollapsedSections,
    null
  );
  const collapsed = { ...DEFAULT_COLLAPSED_SECTIONS };
  for (const section of PANEL_SECTIONS) {
    const value = saved?.[section];
    if (typeof value === 'boolean') collapsed[section] = value;
  }
  return collapsed;
}

function nextTriState(state: ModifierFilterState): ModifierFilterState {
  return state === 'any' ? 'required' : state === 'required' ? 'blocked' : 'any';
}

export class LobbyDiscoveryFilters {
  private criteria: DiscoveryCriteria[];
  private isTeamTwoTimesMinEnabled: boolean;
  private includeHostedAndCustomLobbies: boolean;
  private mapFilter: MapFilter;
  private collapsedSections: Record<PanelSection, boolean> = loadCollapsedSections();
  private knownMaps: Set<string> = new Set(MAP_CATALOGUE.map((entry) => entry.gameMap));
  private readonly onChange: (change: FilterChange) => void;

  private root: HTMLElement | null = null;
  private ffaSlider: RangeSlider | null = null;
  private teamSlider: RangeSlider | null = null;

  constructor(options: LobbyDiscoveryFiltersOptions) {
    this.criteria = options.initial.criteria;
    this.isTeamTwoTimesMinEnabled = options.initial.isTeamTwoTimesMinEnabled;
    this.includeHostedAndCustomLobbies = options.initial.includeHostedAndCustomLobbies;
    this.mapFilter = options.initial.mapFilter;
    this.onChange = options.onChange;
  }

  getSettings(): FilterSettings {
    return {
      criteria: this.criteria,
      isTeamTwoTimesMinEnabled: this.isTeamTwoTimesMinEnabled,
      includeHostedAndCustomLobbies: this.includeHostedAndCustomLobbies,
      mapFilter: this.mapFilter,
    };
  }

  /** Renders the sections into the container. A second call moves the sections to the new container. */
  mount(container: HTMLElement): void {
    this.cleanup();

    const root = document.createElement('div');
    root.className = 'discovery-body';
    root.innerHTML = this.renderBody();
    container.appendChild(root);
    this.root = root;

    this.setupEventListeners();
    this.loadUIFromSettings();
    for (const section of PANEL_SECTIONS) this.applySectionCollapse(section);

    this.ffaSlider = new RangeSlider({
      root,
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
      root,
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

    this.updateFilterCount();
  }

  /** Removes the sections from their container. The filter values stay in memory. */
  cleanup(): void {
    this.root?.remove();
    this.root = null;
    this.ffaSlider = null;
    this.teamSlider = null;
  }

  /** Shows the text, or hides the line when the text is null. */
  setCurrentGameInfo(text: string | null): void {
    const info = this.$('discovery-current-game-info');
    if (!info) return;
    info.style.display = text === null ? 'none' : 'block';
    if (text !== null) info.textContent = text;
  }

  // A map that OpenFront added after the catalogue was generated still gets a chip.
  addFeedOnlyMaps(lobbies: Lobby[]): void {
    for (const lobby of lobbies) {
      const gameMap = lobby.gameConfig?.gameMap?.trim();
      if (!gameMap || this.knownMaps.has(gameMap)) continue;
      this.knownMaps.add(gameMap);
      const mods = this.ensureMapGroup('other');
      if (!mods) continue;
      mods.insertAdjacentHTML('beforeend', this.renderMapChip(gameMap, gameMap));
      const chip = mods.lastElementChild as HTMLButtonElement;
      chip.addEventListener('click', () => this.cycleMapState(chip));
      this.applyTriState(chip, this.mapFilter[gameMap] ?? 'any');
      const search = this.$('discovery-maps-search') as HTMLInputElement | null;
      this.filterMapChips(search?.value ?? '');
    }
  }

  private $(id: string): HTMLElement | null {
    // An attribute selector: an id selector wrongly misses the element when the id exists twice in the document.
    return this.root?.querySelector<HTMLElement>(`[id="${id}"]`) ?? null;
  }

  private getNumberValue(id: string): number | null {
    const input = this.$(id) as HTMLInputElement | null;
    if (!input) return null;
    const val = parseInt(input.value, 10);
    return Number.isNaN(val) ? null : val;
  }

  private getModifierState(id: string): ModifierFilterState {
    const state = this.$(id)?.dataset.state;
    if (state === 'required' || state === 'blocked') return state;
    return 'any';
  }

  private setModifierState(id: string, state: ModifierFilterState): void {
    const button = this.$(id);
    if (button) this.applyTriState(button, state);
  }

  private applyTriState(button: HTMLElement, state: ModifierFilterState): void {
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
    this.setModifierState(id, nextTriState(this.getModifierState(id)));
  }

  private getMapChips(): HTMLButtonElement[] {
    return Array.from(
      this.root?.querySelectorAll<HTMLButtonElement>('[data-game-map]') ?? []
    );
  }

  private cycleMapState(chip: HTMLButtonElement): void {
    const gameMap = chip.dataset.gameMap ?? '';
    const next = nextTriState(this.mapFilter[gameMap] ?? 'any');
    const mapFilter = { ...this.mapFilter };
    if (next === 'any') delete mapFilter[gameMap];
    else mapFilter[gameMap] = next;
    this.setMapFilter(mapFilter);
  }

  private setMapFilter(mapFilter: MapFilter): void {
    this.mapFilter = mapFilter;
    this.syncMapChips();
    this.onChange('maps');
  }

  private syncMapChips(): void {
    for (const chip of this.getMapChips()) {
      this.applyTriState(chip, this.mapFilter[chip.dataset.gameMap ?? ''] ?? 'any');
    }
    const states = Object.values(this.mapFilter);
    const required = states.filter((state) => state === 'required').length;
    const blocked = states.filter((state) => state === 'blocked').length;
    const parts = [
      ...(required > 0 ? [`${required} required`] : []),
      ...(blocked > 0 ? [`${blocked} excluded`] : []),
    ];
    const summary = this.$('discovery-maps-summary');
    if (summary) summary.textContent = parts.length > 0 ? parts.join(' · ') : 'Any map';
  }

  private filterMapChips(query: string): void {
    const needle = query.trim().toLowerCase();
    for (const chip of this.getMapChips()) {
      chip.hidden = needle !== '' && !(chip.dataset.modName ?? '').toLowerCase().includes(needle);
    }
    for (const group of Array.from(
      this.root?.querySelectorAll<HTMLElement>('[data-category]') ?? []
    )) {
      group.hidden = !group.querySelector('[data-game-map]:not([hidden])');
    }
  }

  private ensureMapGroup(category: MapCategory): HTMLElement | null {
    const groups = this.$('discovery-maps-groups');
    if (!groups) return null;
    const existing = groups.querySelector(`[data-category="${category}"] .ld-mods`);
    if (existing) return existing as HTMLElement;
    groups.insertAdjacentHTML('beforeend', this.renderMapGroup(category, ''));
    return groups.querySelector(`[data-category="${category}"] .ld-mods`);
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
      isNukesDisabled: this.getModifierState('modifier-isNukesDisabled'),
      isSAMsDisabled: this.getModifierState('modifier-isSAMsDisabled'),
      isPeaceTime: this.getModifierState('modifier-isPeaceTime'),
      isWaterNukes: this.getModifierState('modifier-isWaterNukes'),
      isDoomsdayClock: this.getModifierState('modifier-isDoomsdayClock'),
      isTrusted: this.getModifierState('modifier-isTrusted'),
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

  private isChecked(id: string): boolean {
    return (this.$(id) as HTMLInputElement | null)?.checked === true;
  }

  private getAllTeamCountValues(): TeamCount[] {
    const values: TeamCount[] = [];
    for (const [id, value] of TEAM_COUNT_IDS) {
      if (!this.isChecked(id)) continue;
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
      const checkbox = this.$(id) as HTMLInputElement | null;
      if (!checkbox) continue;
      checkbox.checked = checked;
      this.syncChipState(id);
    }
  }

  private syncChipState(checkboxId: string): void {
    const checkbox = this.$(checkboxId) as HTMLInputElement | null;
    if (!checkbox) return;
    const chip = checkbox.closest('.ld-chip, .ld-mode-btn, .ld-2x') as HTMLElement | null;
    if (!chip) return;
    chip.classList.toggle('is-on', checkbox.checked);
    chip.setAttribute('aria-pressed', String(checkbox.checked));
  }

  private buildCriteriaFromUI(): DiscoveryCriteria[] {
    const modifiers = this.getModifierFiltersFromUI();
    const criteria: DiscoveryCriteria[] = [];

    if (this.isChecked('discovery-ffa')) {
      criteria.push({
        gameMode: 'FFA',
        teamCount: null,
        minPlayers: this.getNumberValue('discovery-ffa-min'),
        maxPlayers: this.getNumberValue('discovery-ffa-max'),
        modifiers,
      });
    }

    if (!this.isChecked('discovery-team')) return criteria;

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
    const num = this.$('discovery-filter-count');
    const wordEl = this.$('discovery-filter-word');
    if (!num || !wordEl) return;

    const formatsOn = ALL_TEAM_IDS.filter((id) => this.isChecked(id)).length;
    const modsOn = ALL_MODIFIER_IDS.filter((id) => this.getModifierState(id) !== 'any').length;

    const count =
      (this.isChecked('discovery-ffa') ? 1 : 0) +
      (this.isChecked('discovery-team') ? 1 : 0) +
      formatsOn +
      modsOn;
    num.textContent = String(count);
    wordEl.textContent = count === 1 ? 'filter' : 'filters';
  }

  private setModePanelActive(panelId: string, active: boolean): void {
    this.$(panelId)?.classList.toggle('is-off', !active);
  }

  private loadUIFromSettings(): void {
    const ffaCriteria = this.criteria.find((c) => c.gameMode === 'FFA');
    const teamCriteria = this.criteria.filter((c) => c.gameMode === 'Team');

    const ffaCheckbox = this.$('discovery-ffa') as HTMLInputElement | null;
    const teamCheckbox = this.$('discovery-team') as HTMLInputElement | null;
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
      const min = this.$('discovery-ffa-min') as HTMLInputElement | null;
      const max = this.$('discovery-ffa-max') as HTMLInputElement | null;
      if (min && ffaCriteria.minPlayers !== null) min.value = String(ffaCriteria.minPlayers);
      if (max && ffaCriteria.maxPlayers !== null) max.value = String(ffaCriteria.maxPlayers);
    }

    if (teamCriteria[0]) {
      const min = this.$('discovery-team-min') as HTMLInputElement | null;
      const max = this.$('discovery-team-max') as HTMLInputElement | null;
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
      this.setModifierState('modifier-isNukesDisabled', modifiers.isNukesDisabled ?? 'any');
      this.setModifierState('modifier-isSAMsDisabled', modifiers.isSAMsDisabled ?? 'any');
      this.setModifierState('modifier-isPeaceTime', modifiers.isPeaceTime ?? 'any');
      this.setModifierState('modifier-isWaterNukes', modifiers.isWaterNukes ?? 'any');
      this.setModifierState('modifier-isDoomsdayClock', modifiers.isDoomsdayClock ?? 'any');
      this.setModifierState('modifier-isTrusted', modifiers.isTrusted ?? 'any');

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

    const twoTimes = this.$('discovery-team-two-times') as HTMLInputElement | null;
    if (twoTimes) {
      twoTimes.checked = this.isTeamTwoTimesMinEnabled;
      this.syncChipState('discovery-team-two-times');
    }

    this.syncMapChips();

    const hostedToggle = this.$('discovery-hosted-toggle') as HTMLInputElement | null;
    if (hostedToggle) {
      hostedToggle.checked = this.includeHostedAndCustomLobbies;
      this.syncChipState('discovery-hosted-toggle');
    }

    this.updateFilterCount();
  }

  private setTeamCountSelections(values: Array<TeamCount | null | undefined>): void {
    for (const teamCount of values) {
      let checkbox: HTMLInputElement | null = null;
      if (teamCount === 'Humans Vs Nations') checkbox = this.$('discovery-team-hvn') as HTMLInputElement;
      else if (teamCount === '8+') checkbox = this.$('discovery-team-8plus') as HTMLInputElement;
      else if (typeof teamCount === 'number') checkbox = this.$(`discovery-team-${teamCount}`) as HTMLInputElement;
      if (checkbox) {
        checkbox.checked = true;
        this.syncChipState(checkbox.id);
      }
    }
  }

  private refreshCriteria(): void {
    this.criteria = this.buildCriteriaFromUI();
    this.updateFilterCount();
    this.onChange('criteria');
  }

  private resetAll(): void {
    const ffaCheckbox = this.$('discovery-ffa') as HTMLInputElement | null;
    const teamCheckbox = this.$('discovery-team') as HTMLInputElement | null;
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

    const twoTimes = this.$('discovery-team-two-times') as HTMLInputElement | null;
    if (twoTimes) {
      twoTimes.checked = false;
      this.syncChipState('discovery-team-two-times');
    }
    this.isTeamTwoTimesMinEnabled = false;

    for (const id of ALL_MODIFIER_IDS) this.setModifierState(id, 'any');
    this.mapFilter = {};
    this.syncMapChips();

    this.ffaSlider?.setRange(1, 125);
    this.teamSlider?.setRange(TEAM_MIN_PLAYERS_PER_TEAM, TEAM_MAX_PLAYERS_PER_TEAM);
    this.teamSlider?.applyLockState();

    this.refreshCriteria();
  }

  private setupEventListeners(): void {
    for (const [checkboxId, configId] of [
      ['discovery-ffa', 'discovery-ffa-config'],
      ['discovery-team', 'discovery-team-config'],
    ] as const) {
      const checkbox = this.$(checkboxId) as HTMLInputElement | null;
      checkbox?.addEventListener('change', () => {
        this.syncChipState(checkboxId);
        this.setModePanelActive(configId, checkbox.checked);
        this.refreshCriteria();
      });
    }

    const twoTimesCheckbox = this.$('discovery-team-two-times') as HTMLInputElement | null;
    twoTimesCheckbox?.addEventListener('change', () => {
      this.isTeamTwoTimesMinEnabled = twoTimesCheckbox.checked;
      this.syncChipState('discovery-team-two-times');
      this.teamSlider?.applyLockState();
      this.refreshCriteria();
    });

    for (const section of PANEL_SECTIONS) {
      this.$(`discovery-${section}-toggle`)?.addEventListener('click', () => {
        this.collapsedSections[section] = !this.collapsedSections[section];
        GM_setValue(STORAGE_KEYS.lobbyDiscoveryCollapsedSections, this.collapsedSections);
        this.applySectionCollapse(section);
      });
    }
    const mapsSearch = this.$('discovery-maps-search') as HTMLInputElement | null;
    mapsSearch?.addEventListener('input', () => this.filterMapChips(mapsSearch.value));
    this.$('discovery-maps-clear')?.addEventListener('click', () => {
      this.setMapFilter({});
    });
    for (const chip of this.getMapChips()) {
      chip.addEventListener('click', () => this.cycleMapState(chip));
    }

    const hostedToggle = this.$('discovery-hosted-toggle') as HTMLInputElement | null;
    hostedToggle?.addEventListener('change', () => {
      this.includeHostedAndCustomLobbies = hostedToggle.checked;
      this.syncChipState('discovery-hosted-toggle');
      this.onChange('lobbies');
    });

    this.$('discovery-reset')?.addEventListener('click', () => {
      this.resetAll();
    });

    for (const id of ALL_TEAM_IDS) {
      this.$(id)?.addEventListener('change', () => {
        this.syncChipState(id);
        this.refreshCriteria();
      });
    }

    for (const id of ALL_MODIFIER_IDS) {
      this.$(id)?.addEventListener('click', () => {
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

  private renderSectionToggle(section: PanelSection, label: string, asideHtml: string): string {
    return `
      <button type="button" class="ld-section-head ld-section-toggle" id="discovery-${section}-toggle" aria-expanded="true" aria-controls="discovery-${section}-body">
        <span class="ld-section-label">${label}</span>
        <span class="ld-section-head-end">${asideHtml}<span class="ld-section-chevron" aria-hidden="true"></span></span>
      </button>
    `;
  }

  private applySectionCollapse(section: PanelSection): void {
    const collapsed = this.collapsedSections[section];
    const body = this.$(`discovery-${section}-body`);
    if (body) body.hidden = collapsed;
    this.$(`discovery-${section}-toggle`)?.setAttribute('aria-expanded', String(!collapsed));
  }

  private renderMapChip(gameMap: string, name: string): string {
    const safeName = escapeHtml(name);
    return `
      <button type="button" class="ld-mod" data-game-map="${escapeHtml(gameMap)}" data-state="any" data-mod-name="${safeName}" aria-pressed="false" aria-label="${safeName}">
        <span class="ld-mod-ind"></span>
        <span class="ld-mod-name">${safeName}</span>
      </button>
    `;
  }

  private renderMapGroup(category: MapCategory, chipsHtml: string): string {
    return `
      <div class="ld-mod-group" data-category="${category}">
        <div class="ld-mod-group-label">${MAP_CATEGORY_LABELS[category]}</div>
        <div class="ld-mods">${chipsHtml}</div>
      </div>
    `;
  }

  private renderMapGroups(): string {
    return MAP_CATEGORY_ORDER.map((category) => {
      const entries = MAP_CATALOGUE.filter((entry) => entry.categories.includes(category));
      if (entries.length === 0) return '';
      return this.renderMapGroup(
        category,
        entries.map((entry) => this.renderMapChip(entry.gameMap, entry.name)).join('')
      );
    }).join('');
  }

  private renderBody(): string {
    return `
        <div class="discovery-content" style="overflow-y: auto;">
          <div class="ld-section">
            ${this.renderSectionToggle('modes', 'Modes', '<span class="ld-section-aside">Pick one or both</span>')}
            <div class="ld-section-body" id="discovery-modes-body">
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
          </div>

          <div class="ld-section">
            ${this.renderSectionToggle(
              'modifiers',
              'Modifiers',
              `<span class="ld-mods-legend">
                <span class="key"><span class="swatch"></span>Any</span>
                <span class="key"><span class="swatch req"></span>Req</span>
                <span class="key"><span class="swatch blk"></span>Excl</span>
              </span>`
            )}
            <div class="ld-section-body" id="discovery-modifiers-body">

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
                ${this.renderModifierChip('modifier-isNukesDisabled', 'Nukes Off')}
                ${this.renderModifierChip('modifier-isSAMsDisabled', 'SAMs Off')}
                ${this.renderModifierChip('modifier-isPeaceTime', 'Peace Time')}
                ${this.renderModifierChip('modifier-isWaterNukes', 'Water Nukes')}
                ${this.renderModifierChip('modifier-isDoomsdayClock', 'Doomsday Clock')}
                ${this.renderModifierChip('modifier-isTrusted', 'Trusted')}
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

          <div class="ld-section">
            ${this.renderSectionToggle('maps', 'Maps', '<span class="ld-section-aside" id="discovery-maps-summary">Any map</span>')}
            <div class="ld-section-body" id="discovery-maps-body">
              <div class="ld-maps-tools">
                <input type="search" id="discovery-maps-search" class="ld-maps-search" placeholder="Search maps" aria-label="Search maps">
                <button type="button" class="ld-maps-clear" id="discovery-maps-clear">Clear</button>
              </div>
              <div id="discovery-maps-groups">${this.renderMapGroups()}</div>
              <div class="ld-mods-hint">
                Applies to every mode. With a <strong class="req">Required</strong> map, only required maps match.
              </div>
            </div>
          </div>

          <div class="ld-section">
            ${this.renderSectionToggle('lobbies', 'Lobbies', '')}
            <div class="ld-section-body" id="discovery-lobbies-body">
              <label class="ld-2x" aria-pressed="false">
                <input type="checkbox" id="discovery-hosted-toggle">
                <span class="check">${ICON_CHECK}</span>
                <span class="lbl"><strong>Include hosted and custom lobbies</strong></span>
              </label>
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
    `;
  }
}
