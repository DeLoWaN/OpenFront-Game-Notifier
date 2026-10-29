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

  /** The declarations of the first rule that has this exact selector. */
  const ruleBody = (selector: string): string => {
    const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return getBoardStyles().match(new RegExp(`(?<!,)\\n\\s*${escaped} \\{([^}]*)\\}`))?.[1] ?? '';
  };

  const zIndexOf = (selector: string): number => Number(ruleBody(selector).match(/z-index: (\d+);/)?.[1] ?? 0);

  it('frames a matching card in orange with an overlay above the thumbnail, the text and the gauge', () => {
    mountStyles();
    const card = document.createElement('button');
    card.className = 'of-board-card of-board-card-match';
    document.body.append(card);

    expect(getComputedStyle(card).borderColor).toBe(colorOf(BOARD_COLORS.live));
    // The thumbnail and the text column paint over a shadow on the card itself.
    expect(getComputedStyle(card).boxShadow).toBe('');

    const overlay = ruleBody('.of-board-card::after');
    expect(overlay).toMatch(/position: absolute;/);
    expect(overlay).toMatch(/inset: 0;/);
    expect(overlay).toMatch(/pointer-events: none;/);
    const overlayZ = zIndexOf('.of-board-card::after');
    for (const part of ['.of-board-thumb', '.of-board-countdown', '.of-board-gauge', '.of-board-new']) {
      expect(overlayZ, part).toBeGreaterThan(zIndexOf(part));
    }

    const frame = ruleBody('.of-board-card-match::after');
    expect(frame).toContain(BOARD_COLORS.live);
    expect(frame).toMatch(/box-shadow: inset /);
  });

  it('dims a card that does not match to 0.3 or less and restores it on hover', () => {
    const css = getBoardStyles();
    expect(css).toMatch(/\.of-board-card-dim \{[^}]*opacity: 0\.[0-3]\d?;/);
    expect(css).toMatch(/\.of-board-card-dim:hover \{[^}]*opacity: 0\.[5-9]/);
  });

  it('puts the thumbnail in an 84 px column on the left, at full opacity', () => {
    expect(ruleBody('.of-board-card')).toContain('--of-board-thumb-width: 84px;');
    const thumb = ruleBody('.of-board-thumb');
    expect(thumb).toContain('width: var(--of-board-thumb-width);');
    expect(thumb).toContain('flex: none;');
    expect(ruleBody('.of-board-thumb img')).not.toContain('opacity');
  });

  it('puts the text column on the solid dark background of the card', () => {
    expect(ruleBody('.of-board-card')).toContain('background: var(--of-hud-bg-1);');
    const text = ruleBody('.of-board-text');
    expect(text).toContain('background: var(--of-hud-bg-1);');
    expect(text).toContain('flex: 1;');
    expect(text).toContain('min-width: 0;');
  });

  it('shows the countdown dark on orange at the top-left corner of the thumbnail', () => {
    const countdown = ruleBody('.of-board-countdown');
    expect(countdown).toContain('position: absolute;');
    expect(countdown).toMatch(/top: \d+px;/);
    expect(countdown).toMatch(/left: \d+px;/);
    expect(countdown).toContain(`background: ${BOARD_COLORS.live};`);
    expect(countdown).toContain(`color: ${BOARD_COLORS.onLive};`);
    expect(colorOf(BOARD_COLORS.onLive)).toBe('rgb(10, 6, 16)');
  });

  it('puts the "New" badge at the top-right corner, away from the countdown, and keeps the map name clear of it', () => {
    const badge = ruleBody('.of-board-new');
    expect(badge).toMatch(/right: \d+px;/);
    expect(badge).not.toMatch(/left:/);
    expect(ruleBody('.of-board-card:has(> .of-board-new) .of-board-map')).toMatch(/padding-right: \d+px;/);
  });

  it('draws the players gauge as an 18 px band along the whole card bottom, with room reserved for it', () => {
    const card = ruleBody('.of-board-card');
    expect(card).toContain('--of-board-gauge-height: 18px;');
    expect(card).toContain('padding: 0 0 var(--of-board-gauge-height);');
    const gauge = ruleBody('.of-board-gauge');
    expect(gauge).toContain('position: absolute;');
    expect(gauge).toContain('left: 0;');
    expect(gauge).toContain('right: 0;');
    expect(gauge).toContain('bottom: 0;');
    expect(gauge).toContain('height: var(--of-board-gauge-height);');
    expect(gauge).toContain(`background: ${BOARD_COLORS.gaugeTrack};`);
    expect(gauge).toMatch(/border-top: 1px solid/);
    expect(ruleBody('.of-board-fill')).toContain(`background: ${BOARD_COLORS.gaugeFill};`);
    expect(ruleBody('.of-board-gauge-hot .of-board-fill')).toContain(`background: ${BOARD_COLORS.gaugeFillHot};`);
    expect(colorOf(BOARD_COLORS.gaugeTrack)).toBe('rgba(255, 255, 255, 0.04)');
    expect(colorOf(BOARD_COLORS.gaugeFill)).toBe('rgba(159, 184, 166, 0.62)');
    expect(colorOf(BOARD_COLORS.gaugeFillHot)).toBe('rgba(232, 96, 12, 0.65)');
  });

  it('writes the gauge text in bold mono white with a light shadow, the count left and the percentage right', () => {
    const players = ruleBody('.of-board-players');
    expect(players).toMatch(/font: 700 10(\.5)?px\/1 /);
    expect(players).toContain(`color: ${BOARD_COLORS.text};`);
    expect(players).toContain(`text-shadow: 0 1px 2px ${BOARD_COLORS.gaugeTextShadow};`);
    const percent = ruleBody('.of-board-percent');
    expect(percent).toContain('margin-left: auto;');
    expect(percent).toMatch(/font: 700 10(\.5)?px\/1 /);
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
