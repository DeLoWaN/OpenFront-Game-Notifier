import { afterEach, describe, expect, it } from 'vitest';
import {
  findHomeGrid,
  getHomeGridCells,
  isCardSection,
  isFfaCell,
  isLobbyCell,
} from '@/utils/HomePageUtils';

const GRID_HTML = `
  <game-mode-selector>
    <div class="outer"><div id="grid" class="flex sm:grid sm:grid-cols-[2fr_1fr]">
      <div id="solo" class="grid sm:col-span-2 sm:row-start-4"><button>Solo</button></div>
      <div id="ffa" class="min-w-0 sm:col-start-1 sm:row-start-2"><button>ffa</button></div>
      <section id="side">
        <div id="team"><button>team</button></div>
        <div id="special"><button>special</button></div>
        <h2><button>See all</button></h2>
      </section>
    </div></div>
  </game-mode-selector>
`;

describe('HomePageUtils', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  describe('findHomeGrid', () => {
    it('finds the grid inside game-mode-selector', () => {
      document.body.innerHTML = GRID_HTML;
      expect(findHomeGrid()?.id).toBe('grid');
    });

    it('finds the grid inside a given selector element', () => {
      document.body.innerHTML = GRID_HTML;
      expect(findHomeGrid(document.querySelector('game-mode-selector'))?.id).toBe('grid');
    });

    it('returns null when the grid class is gone or there is no selector', () => {
      document.body.innerHTML = '<game-mode-selector><div class="flex"></div></game-mode-selector>';
      expect(findHomeGrid()).toBeNull();
      document.body.innerHTML = '';
      expect(findHomeGrid()).toBeNull();
    });
  });

  describe('cell tests', () => {
    it('tell the FFA cell and the section from the other children of the grid', () => {
      document.body.innerHTML = GRID_HTML;
      const solo = document.getElementById('solo')!;
      const ffa = document.getElementById('ffa')!;
      const side = document.getElementById('side')!;

      expect(isFfaCell(ffa)).toBe(true);
      expect(isFfaCell(solo)).toBe(false);
      expect(isCardSection(side)).toBe(true);
      expect(isCardSection(ffa)).toBe(false);
      expect([solo, ffa, side].map(isLobbyCell)).toEqual([false, true, true]);
    });
  });

  describe('getHomeGridCells', () => {
    it('returns the FFA cell and the card cells of the section, without the heading', () => {
      document.body.innerHTML = GRID_HTML;
      const cells = getHomeGridCells(findHomeGrid()!);

      expect(cells.ffaCell?.id).toBe('ffa');
      expect(cells.cardCells.map((cell) => cell.id)).toEqual(['team', 'special']);
    });

    it('returns no cell for an empty grid', () => {
      document.body.innerHTML =
        '<game-mode-selector><div class="sm:grid-cols-[2fr_1fr]"></div></game-mode-selector>';
      const cells = getHomeGridCells(findHomeGrid()!);

      expect(cells.ffaCell).toBeUndefined();
      expect(cells.cardCells).toEqual([]);
    });
  });
});
