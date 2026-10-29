/**
 * Finds the parts of the lobby area on OpenFront's home page.
 *
 * The lobby area is one grid inside `game-mode-selector`. It holds the Solo
 * row, the FFA cell and a section. The section holds the Team card, the
 * Special card and the "See all" heading.
 */

const GRID_CLASS_MARKER = 'sm:grid-cols-[2fr_1fr]';

export interface HomeGridCells {
  ffaCell: HTMLElement | undefined;
  /** The cells of the section that hold a card: Team first, then Special. */
  cardCells: HTMLElement[];
}

/** The grid of the lobby area, or null when OpenFront's page has none. */
export function findHomeGrid(
  selector: Element | null = document.querySelector('game-mode-selector')
): HTMLElement | null {
  const grid = selector
    ? Array.from(selector.querySelectorAll('div')).find((element) =>
        element.className.includes(GRID_CLASS_MARKER)
      )
    : undefined;
  return grid ?? null;
}

export function isFfaCell(element: HTMLElement): boolean {
  return element.className.includes('sm:col-start-1') && element.className.includes('sm:row-start-2');
}

export function isCardSection(element: HTMLElement): boolean {
  return element.tagName === 'SECTION';
}

/** True for the two cells that the Lobby Board replaces: the FFA cell and the section. */
export function isLobbyCell(element: HTMLElement): boolean {
  return isCardSection(element) || isFfaCell(element);
}

/**
 * The FFA cell and the card cells of the section. Lit skips the cell of an
 * absent Queue, so the caller must tell the Team cell from the Special cell
 * with the lobby data.
 */
export function getHomeGridCells(grid: HTMLElement): HomeGridCells {
  const children = Array.from(grid.children) as HTMLElement[];
  const section = children.find(isCardSection);
  return {
    ffaCell: children.find(isFfaCell),
    cardCells: section
      ? (Array.from(section.children) as HTMLElement[]).filter((element) => element.tagName === 'DIV')
      : [],
  };
}
