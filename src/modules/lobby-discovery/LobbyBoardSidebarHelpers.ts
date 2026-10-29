/**
 * Pure helpers for the Lobby Board sidebar.
 */

import type { FilterSettings } from './LobbyDiscoveryFilters';
import type {
  ModifierFilters,
  ModifierFilterState,
  NumericModifierState,
} from './LobbyDiscoveryTypes';

const isSet = (state: ModifierFilterState | undefined): boolean =>
  state !== undefined && state !== 'any';

/** Counts the Modifier filters that a Criterion requires or blocks. */
function countModifierFilters(modifiers: ModifierFilters | undefined): number {
  if (!modifiers) return 0;
  let count = 0;
  for (const value of Object.values(modifiers) as Array<
    ModifierFilterState | NumericModifierState | undefined
  >) {
    if (typeof value === 'string') {
      if (isSet(value)) count++;
    } else if (value) {
      count += Object.values(value).filter(isSet).length;
    }
  }
  return count;
}

/** One short line that sums up the filters. The collapsed sidebar rail shows it. */
export function formatFilterSummary(settings: FilterSettings): string {
  const { criteria, mapFilter } = settings;
  const mapCount = Object.values(mapFilter).filter(isSet).length;
  if (criteria.length === 0 && mapCount === 0) return 'No filters';

  const modes: string[] = [];
  if (criteria.some((criterion) => criterion.gameMode === 'FFA')) modes.push('FFA');
  if (criteria.some((criterion) => criterion.gameMode === 'Team')) modes.push('Teams');
  // Every Criterion carries the same Modifier filters, so the largest count is the count.
  const modifierCount = Math.max(0, ...criteria.map((c) => countModifierFilters(c.modifiers)));

  const parts = [modes.length > 0 ? modes.join(' + ') : 'No mode'];
  if (modifierCount > 0) {
    parts.push(`${modifierCount} ${modifierCount === 1 ? 'modifier' : 'modifiers'}`);
  }
  if (mapCount > 0) parts.push(`${mapCount} ${mapCount === 1 ? 'map' : 'maps'}`);
  return parts.join(' · ');
}
