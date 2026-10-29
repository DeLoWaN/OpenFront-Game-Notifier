import { readFileSync } from 'fs';
import { resolve } from 'path';
import { afterEach, describe, expect, it } from 'vitest';
import { getBoardStyles } from '@/styles/boardStyles';
import { BOARD_COLORS, SPACING } from '@/config/theme';

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

  /** The declarations of the first rule that has this exact selector. */
  const ruleBody = (selector: string): string => {
    const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return getBoardStyles().match(new RegExp(`(?<!,)\\n\\s*${escaped} \\{([^}]*)\\}`))?.[1] ?? '';
  };

  it('frames a matching card in orange with an overlay above the thumbnail and the text panel', () => {
    mountStyles();
    const card = document.createElement('button');
    card.className = 'of-board-card of-board-card-match';
    document.body.append(card);

    expect(getComputedStyle(card).borderColor).toBe(colorOf(BOARD_COLORS.live));
    // The thumbnail and the text panel paint over a shadow on the card itself.
    expect(getComputedStyle(card).boxShadow).toBe('');

    const overlay = ruleBody('.of-board-card::after');
    expect(overlay).toMatch(/position: absolute;/);
    expect(overlay).toMatch(/inset: 0;/);
    expect(overlay).toMatch(/pointer-events: none;/);
    const overlayZ = Number(overlay.match(/z-index: (\d+);/)?.[1]);
    const bodyZ = Number(ruleBody('.of-board-top,\n    .of-board-body').match(/z-index: (\d+);/)?.[1]);
    expect(overlayZ).toBeGreaterThan(bodyZ);

    const frame = ruleBody('.of-board-card-match::after');
    expect(frame).toContain(BOARD_COLORS.live);
    expect(frame).toMatch(/box-shadow: inset /);
  });

  it('dims a card that does not match to 0.3 or less and restores it on hover', () => {
    const css = getBoardStyles();
    expect(css).toMatch(/\.of-board-card-dim \{[^}]*opacity: 0\.[0-3]\d?;/);
    expect(css).toMatch(/\.of-board-card-dim:hover \{[^}]*opacity: 0\.[5-9]/);
  });

  it('puts the text block of a card on a dark panel that reaches the card edges', () => {
    mountStyles();
    const card = document.createElement('button');
    card.className = 'of-board-card';
    const body = document.createElement('span');
    body.className = 'of-board-body';
    card.append(body);
    document.body.append(card);

    const style = getComputedStyle(body);
    expect(style.backgroundColor).toBe(colorOf(BOARD_COLORS.panel));
    expect(colorOf(BOARD_COLORS.panel)).toBe('rgba(10, 6, 16, 0.6)');
    // The card padding and the negative margin of the panel share one custom property.
    const bodyRule = ruleBody('.of-board-body');
    expect(bodyRule).toContain(
      'margin: 0 calc(-1 * var(--of-board-card-padding)) calc(-1 * var(--of-board-card-padding));'
    );
    expect(ruleBody('.of-board-card')).toContain('padding: var(--of-board-card-padding);');
    expect(ruleBody('.of-board-card')).toContain(`--of-board-card-padding: ${SPACING.sm};`);
    expect(getBoardStyles()).toMatch(/\.of-board-body \{[^}]*border-top: 1px solid/);
  });

  it('shows the thumbnail without a bottom gradient', () => {
    const css = getBoardStyles();
    expect(css).not.toContain('of-board-thumb::after');
    expect(css).not.toContain('linear-gradient');
  });

  it('keeps the flash of a notification click inside the card, on the overlay', () => {
    const css = getBoardStyles();
    expect(ruleBody('.of-board-card.of-board-card-flash::after')).toContain('animation: ofBoardFlash');
    const keyframes = css.match(/@keyframes ofBoardFlash \{[\s\S]*?\n    \}/)?.[0] ?? '';
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

  it('does not animate the flash when the user prefers reduced motion, and keeps a static outline', () => {
    const css = getBoardStyles();
    const media = css.match(/@media \(prefers-reduced-motion: reduce\) \{[\s\S]*?\n    \}\n/)?.[0] ?? '';
    expect(media).toContain('.of-board-card.of-board-card-flash::after');
    expect(media).toContain('animation: none;');
    expect(media).toMatch(/box-shadow: inset 0 0 0 4px/);
  });

  it.each(['boardStyles.ts', 'boardChromeStyles.ts'])(
    'takes every colour of %s from the theme tokens',
    (file) => {
      const source = readFileSync(resolve(__dirname, '../../src/styles', file), 'utf8');
      expect(source.match(/#[0-9a-fA-F]{3,8}\b|rgba?\(/g)).toBeNull();
    }
  );
});
