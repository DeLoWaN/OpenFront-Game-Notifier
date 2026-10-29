import { readFileSync } from 'fs';
import { resolve } from 'path';
import { afterEach, describe, expect, it } from 'vitest';
import { getBoardStyles } from '@/styles/boardStyles';
import { BOARD_COLORS } from '@/config/theme';

describe('Lobby Board styles', () => {
  afterEach(() => {
    document.head.innerHTML = '';
    document.body.innerHTML = '';
  });

  function mountStyles(): void {
    const style = document.createElement('style');
    style.textContent = getBoardStyles();
    document.head.append(style);
  }

  const colorOf = (value: string): string => {
    const probe = document.createElement('i');
    probe.style.color = value;
    return probe.style.color;
  };

  it('has no pulse animation', () => {
    expect(getBoardStyles()).not.toContain('of-board-card-pulse');
    expect(getBoardStyles()).not.toContain('infinite');
  });

  it('frames a matching card in orange, inside the card', () => {
    mountStyles();
    const card = document.createElement('button');
    card.className = 'of-board-card of-board-card-match';
    document.body.append(card);

    const style = getComputedStyle(card);
    expect(style.borderColor).toBe(colorOf(BOARD_COLORS.live));
    expect(style.boxShadow).toMatch(/^inset /);
  });

  it('dims a card that does not match to 0.3 or less and restores it on hover', () => {
    const css = getBoardStyles();
    expect(css).toMatch(/\.of-board-card-dim \{[^}]*opacity: 0\.[0-3]\d?;/);
    expect(css).toMatch(/\.of-board-card-dim:hover \{[^}]*opacity: 0\.[5-9]/);
  });

  it('keeps the flash of a notification click inside the card', () => {
    mountStyles();
    const card = document.createElement('button');
    card.className = 'of-board-card of-board-card-flash';
    document.body.append(card);

    expect(getComputedStyle(card).animation).toContain('ofBoardFlash');
    const keyframes = getBoardStyles().match(/@keyframes ofBoardFlash \{[\s\S]*?\n    \}/)?.[0] ?? '';
    expect(keyframes).not.toBe('');
    const shadows = keyframes.match(/box-shadow:[^;]*;/g) ?? [];
    expect(shadows.length).toBeGreaterThan(0);
    // An outer shadow would spill over the neighbouring cards.
    for (const shadow of shadows) {
      for (const layer of shadow.replace('box-shadow:', '').replace(';', '').split(/,(?![^(]*\))/)) {
        expect(layer.trim()).toMatch(/^inset /);
      }
    }
  });

  it.each(['boardStyles.ts', 'boardChromeStyles.ts'])(
    'takes every colour of %s from the theme tokens',
    (file) => {
      const source = readFileSync(resolve(__dirname, '../../src/styles', file), 'utf8');
      expect(source.match(/#[0-9a-fA-F]{3,8}\b|rgba?\(/g)).toBeNull();
    }
  );
});
