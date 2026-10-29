import { readFileSync } from 'fs';
import { resolve } from 'path';
import { afterEach, describe, expect, it } from 'vitest';
import { getBoardStyles } from '@/styles/boardStyles';
import { BOARD_COLORS, BOARD_SIZES, COLORS, TIMING } from '@/config/theme';

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

  it('shows the hover state at once and fades it out when the pointer leaves', () => {
    // The hover rules set a zero duration, so only the way back uses the base transitions.
    expect(ruleBody('.of-board-card:hover')).toContain('transition-duration: 0s;');
    expect(ruleBody('.of-board-card:hover::after')).toContain('transition-duration: 0s;');
    expect(ruleBody('.of-board-card:hover .of-board-text')).toContain('transition-duration: 0s;');
    expect(ruleBody('.of-board-card')).toMatch(new RegExp(`transition: opacity ${TIMING.normal}`));
  });

  it('marks the card under the pointer with a 2 px inner frame and a lighter text column', () => {
    expect(ruleBody('.of-board-card::after')).toMatch(new RegExp(`transition: box-shadow ${TIMING.fast}`));
    expect(ruleBody('.of-board-card:hover::after')).toContain('box-shadow: inset 0 0 0 2px var(--of-hud-text-3);');
    expect(ruleBody('.of-board-card-match:hover::after')).toContain(
      `box-shadow: inset 0 0 0 2px ${BOARD_COLORS.live};`
    );
    // The match frame at rest is 1 px, so the hover frame is visibly thicker.
    expect(ruleBody('.of-board-card-match::after')).toContain(`box-shadow: inset 0 0 0 1px ${BOARD_COLORS.live};`);

    expect(ruleBody('.of-board-text')).toMatch(new RegExp(`transition: background-color ${TIMING.fast}`));
    expect(ruleBody('.of-board-card:hover .of-board-text')).toContain(
      `background-color: ${BOARD_COLORS.textColumnHover};`
    );
    expect(colorOf(BOARD_COLORS.textColumnHover)).not.toBe(colorOf(COLORS.bgSecondary));

    const media = getBoardStyles().match(/@media \(prefers-reduced-motion: reduce\) \{[\s\S]*?\n    \}\n/)?.[0] ?? '';
    expect(media).toMatch(/\.of-board-card::after,\s*\.of-board-text \{\s*transition: none;/);
  });

  it('puts the thumbnail in a 112 px column on the left, at full opacity', () => {
    expect(BOARD_SIZES.thumbWidthPx).toBe(112);
    expect(ruleBody('.of-board-card')).toContain('--of-board-thumb-width: 112px;');
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

  it('makes a card at least 120 px tall and spaces the cards 12 px apart', () => {
    expect(BOARD_SIZES.cardMinHeightPx).toBe(120);
    expect(BOARD_SIZES.gridGapPx).toBe(12);
    expect(ruleBody('.of-board-card')).toContain('min-height: 120px;');
    expect(ruleBody('.of-board-empty')).toContain('min-height: 120px;');
    expect(ruleBody('.of-board-grid')).toContain('gap: 12px;');
  });

  it('ends the map name line with the countdown, dark on orange, and lets the name wrap before it', () => {
    const nameLine = ruleBody('.of-board-nameline');
    expect(nameLine).toContain('display: flex;');
    expect(nameLine).toContain('align-items: flex-start;');
    const map = ruleBody('.of-board-map');
    expect(map).toContain('flex: 1;');
    expect(map).toContain('min-width: 0;');
    const countdown = ruleBody('.of-board-countdown');
    expect(countdown).not.toContain('position: absolute;');
    expect(countdown).toContain('flex: none;');
    expect(countdown).toContain(`background: ${BOARD_COLORS.live};`);
    expect(countdown).toContain(`color: ${BOARD_COLORS.onLive};`);
    expect(colorOf(BOARD_COLORS.onLive)).toBe('rgb(10, 6, 16)');
  });

  it('keeps the "New" badge in the flow of the name line, so it never covers the countdown or the name', () => {
    const badge = ruleBody('.of-board-new');
    expect(badge).not.toContain('position: absolute;');
    expect(badge).toContain('flex: none;');
    expect(getBoardStyles()).not.toContain(':has(> .of-board-new)');
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
