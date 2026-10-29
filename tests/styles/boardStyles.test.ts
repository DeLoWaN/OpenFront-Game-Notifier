import { readFileSync } from 'fs';
import { resolve } from 'path';
import { afterEach, describe, expect, it } from 'vitest';
import { getBoardStyles } from '@/styles/boardStyles';
import { BOARD_COLORS, BOARD_SIZES, COLORS } from '@/config/theme';

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

  /** The body of the `@container` block with this exact condition, or '' when there is none. */
  const containerBlock = (condition: string): string => {
    const css = getBoardStyles();
    const start = css.indexOf(`@container ${condition} {`);
    return start < 0 ? '' : css.slice(start, css.indexOf('\n    }\n', start));
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

  it('dims a card that does not match to 0.3 in grayscale, and lifts it only to 0.5 on hover, still grayscale', () => {
    const dim = ruleBody('.of-board-card-dim');
    expect(dim).toContain('opacity: 0.3;');
    expect(dim).toMatch(/filter: grayscale\(/);
    const dimHover = ruleBody('.of-board-card-dim:hover');
    expect(dimHover).toContain('opacity: 0.5;');
    expect(dimHover).not.toContain('filter');
  });

  it('switches the hover state on and off at once, so only one card looks highlighted', () => {
    for (const selector of ['.of-board-card', '.of-board-card::after', '.of-board-text', '.of-board-join']) {
      expect(ruleBody(selector)).not.toContain('transition');
    }
  });

  it('gives the hovered matching card a 2 px orange frame and an orange-tinted text column', () => {
    // The match frame at rest is 1 px, so the hover frame is visibly thicker.
    expect(ruleBody('.of-board-card-match::after')).toContain(`box-shadow: inset 0 0 0 1px ${BOARD_COLORS.live};`);
    expect(ruleBody('.of-board-card-match:hover::after')).toContain(
      `box-shadow: inset 0 0 0 2px ${BOARD_COLORS.live};`
    );
    expect(ruleBody('.of-board-card-match:hover .of-board-text')).toContain(
      `background-color: ${BOARD_COLORS.matchTextColumnHover};`
    );
    expect(colorOf(BOARD_COLORS.matchTextColumnHover)).toBe('rgb(54, 35, 24)');
  });

  it('gives a hovered non-matching card a thin 1 px neutral frame and keeps its text column dark', () => {
    expect(ruleBody('.of-board-card-dim:hover::after')).toContain('box-shadow: inset 0 0 0 1px var(--of-hud-text-3);');
    expect(getBoardStyles()).not.toContain('.of-board-card-dim:hover .of-board-text');
    // No hover rule reaches every card: the match state or the matching-off state chooses it.
    expect(ruleBody('.of-board-card:hover::after')).toBe('');
    expect(ruleBody('.of-board-card:hover .of-board-text')).toBe('');
  });

  it('gives every hovered card a 2 px grey frame and a lighter text column while matching is off', () => {
    expect(ruleBody('.of-board-matching-off .of-board-card:hover::after')).toContain(
      'box-shadow: inset 0 0 0 2px var(--of-hud-text-3);'
    );
    expect(ruleBody('.of-board-matching-off .of-board-card:hover .of-board-text')).toContain(
      `background-color: ${BOARD_COLORS.textColumnHover};`
    );
    expect(colorOf(BOARD_COLORS.textColumnHover)).not.toBe(colorOf(COLORS.bgSecondary));
  });

  it('puts the thumbnail in a 112 px column on the left, at full opacity', () => {
    expect(BOARD_SIZES.thumbWidthPx).toBe(112);
    expect(ruleBody('.of-board-card')).toContain('--of-board-thumb-width: 112px;');
    const thumb = ruleBody('.of-board-thumb');
    expect(thumb).toContain('width: var(--of-board-thumb-width);');
    expect(thumb).toContain('flex: none;');
    expect(ruleBody('.of-board-thumb img')).not.toContain('opacity');
  });

  it('sizes the thumbnail column by the card width: 112 px, then 64 px under 300 px, then 48 px under 200 px', () => {
    expect(BOARD_SIZES).toMatchObject({
      thumbWidthPx: 112,
      thumbWidthNarrowPx: 64,
      thumbWidthNarrowestPx: 48,
      narrowCardBelowPx: 300,
      narrowestCardBelowPx: 200,
    });
    // The cell is the container, so the card width decides.
    expect(ruleBody('.of-board-cell')).toContain('container-type: inline-size;');
    const narrow = `(width < ${BOARD_SIZES.narrowCardBelowPx}px)`;
    const narrowest = `(width < ${BOARD_SIZES.narrowestCardBelowPx}px)`;
    expect(containerBlock(narrow)).toContain(`--of-board-thumb-width: ${BOARD_SIZES.thumbWidthNarrowPx}px;`);
    expect(containerBlock(narrowest)).toContain(`--of-board-thumb-width: ${BOARD_SIZES.thumbWidthNarrowestPx}px;`);
    // Both blocks have the same selector, so the later one wins on a card that matches both.
    const css = getBoardStyles();
    expect(css.indexOf(`@container ${narrowest}`)).toBeGreaterThan(css.indexOf(`@container ${narrow}`));
  });

  it('fills the full card height above the gauge with a centred slice of the map', () => {
    expect(ruleBody('.of-board-card')).toContain('align-items: stretch;');
    const thumb = ruleBody('.of-board-thumb');
    expect(thumb).not.toMatch(/(^|[^-])height:|aspect-ratio/);
    const img = ruleBody('.of-board-thumb img');
    expect(img).toContain('inset: 0;');
    expect(img).toContain('height: 100%;');
    expect(img).toContain('object-fit: cover;');
    expect(img).toContain('object-position: center;');
  });

  it('starts the text column at the top of a card that is taller than its text', () => {
    expect(ruleBody('.of-board-text')).toContain('justify-content: flex-start;');
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
    expect(map).toContain('flex: 1 1 auto;');
    const countdown = ruleBody('.of-board-countdown');
    expect(countdown).not.toContain('position: absolute;');
    expect(countdown).toContain('flex: none;');
    expect(countdown).toContain(`background: ${BOARD_COLORS.live};`);
    expect(countdown).toContain(`color: ${BOARD_COLORS.onLive};`);
    expect(colorOf(BOARD_COLORS.onLive)).toBe('rgb(10, 6, 16)');
  });

  it('breaks the map name and the format only between words, unless one word is longer than the line', () => {
    expect(getBoardStyles()).not.toContain('overflow-wrap: anywhere');
    for (const selector of ['.of-board-map', '.of-board-format']) {
      expect(ruleBody(selector), selector).toContain('overflow-wrap: break-word;');
      expect(ruleBody(selector), selector).not.toContain('word-break');
    }
  });

  it('moves the countdown under the map name when the longest word of the name does not fit beside it', () => {
    expect(ruleBody('.of-board-nameline')).toContain('flex-wrap: wrap;');
    const map = ruleBody('.of-board-map');
    // The longest word sets the size that decides the line break; the name then grows into the free width.
    expect(map).toContain('width: min-content;');
    expect(map).toContain('flex: 1 1 auto;');
    // A word longer than the whole line still breaks inside the line.
    expect(map).toContain('max-width: 100%;');
    expect(map).not.toContain('min-width: 0;');
  });

  it('keeps the "New" badge in the flow of the name line, so it never covers the countdown or the name', () => {
    const badge = ruleBody('.of-board-new');
    expect(badge).not.toContain('position: absolute;');
    expect(badge).toContain('flex: none;');
    expect(getBoardStyles()).not.toContain(':has(> .of-board-new)');
  });

  it('draws the players gauge as an 18 px band along the card bottom, with room reserved for it', () => {
    const card = ruleBody('.of-board-card');
    expect(card).toContain('--of-board-gauge-height: 18px;');
    expect(card).toContain('padding: 0 0 var(--of-board-gauge-height);');
    const gauge = ruleBody('.of-board-gauge');
    expect(gauge).toContain('position: absolute;');
    expect(gauge).toContain('left: 0;');
    // The gauge track ends where the Join slot starts.
    expect(gauge).toContain('right: var(--of-board-join-width);');
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

  it('writes the gauge text in bold mono white with a light shadow, the percentage right after the count', () => {
    const players = ruleBody('.of-board-players');
    expect(players).toMatch(/font: 700 10(\.5)?px\/1 /);
    expect(players).toContain(`color: ${BOARD_COLORS.text};`);
    expect(players).toContain(`text-shadow: 0 1px 2px ${BOARD_COLORS.gaugeTextShadow};`);
    const percent = ruleBody('.of-board-percent');
    expect(percent).not.toContain('margin-left: auto;');
    expect(percent).toContain('margin-left: 5px;');
    expect(percent).toMatch(/font: 700 10(\.5)?px\/1 /);
  });

  it('puts a "Join ›" label in a fixed 58 px slot at the right end of the gauge band, under the frame overlay', () => {
    expect(BOARD_SIZES.joinWidthPx).toBe(58);
    expect(ruleBody('.of-board-card')).toContain('--of-board-join-width: 58px;');
    // The fill width is a percentage of the gauge, which ends before the slot, and its text never runs under the slot.
    expect(ruleBody('.of-board-gauge')).toContain('overflow: hidden;');
    expect(ruleBody('.of-board-fill')).toContain('left: 0;');

    const join = ruleBody('.of-board-join');
    expect(join).toContain('position: absolute;');
    expect(join).toContain('right: 0;');
    expect(join).toContain('bottom: 0;');
    expect(join).toContain('width: var(--of-board-join-width);');
    expect(join).toContain('height: var(--of-board-gauge-height);');
    expect(join).toContain(`background: ${BOARD_COLORS.joinRest};`);
    expect(join).toContain(`color: ${BOARD_COLORS.joinRestText};`);
    expect(zIndexOf('.of-board-join')).toBeGreaterThan(zIndexOf('.of-board-gauge'));
    expect(zIndexOf('.of-board-join')).toBeLessThan(zIndexOf('.of-board-card::after'));
  });

  it('hides the word "players" on the gauge of a card narrower than 260 px, so the text ends before the Join slot', () => {
    expect(BOARD_SIZES.playersWordHiddenBelowPx).toBe(260);
    const block = containerBlock(`(width < ${BOARD_SIZES.playersWordHiddenBelowPx}px)`);
    expect(block).toMatch(/\.of-board-players \.of-board-word \{\s*display: none;/);
    // A longer text is cut at the gauge end, under the Join slot never.
    expect(ruleBody('.of-board-gauge')).toContain('right: var(--of-board-join-width);');
    expect(ruleBody('.of-board-gauge')).toContain('overflow: hidden;');
  });

  it('turns the Join label solid orange on a hovered match, and only a lighter grey on any other hovered card', () => {
    const matchHover = ruleBody('.of-board-card-match:hover .of-board-join');
    expect(matchHover).toContain(`background: ${BOARD_COLORS.live};`);
    expect(matchHover).toContain(`color: ${BOARD_COLORS.onLive};`);

    const dimHover = ruleBody('.of-board-card-dim:hover .of-board-join');
    expect(dimHover).toContain(`background: ${BOARD_COLORS.joinHover};`);
    expect(dimHover).toContain(`color: ${BOARD_COLORS.joinHoverText};`);

    // Orange means a match, so the label stays grey while no card can match.
    const offHover = ruleBody('.of-board-matching-off .of-board-card:hover .of-board-join');
    expect(offHover).toContain(`background: ${BOARD_COLORS.joinNeutralHover};`);
    expect(offHover).not.toContain(BOARD_COLORS.live);

    const greys = [BOARD_COLORS.joinRest, BOARD_COLORS.joinHover, BOARD_COLORS.joinNeutralHover].map(colorOf);
    expect(new Set(greys).size).toBe(3);
    expect(greys).not.toContain(colorOf(BOARD_COLORS.live));
  });

  it('gives the Custom tag the height of a Modifier chip, so it sits in the chips row without a gap', () => {
    const chip = ruleBody('.of-board-mod');
    expect(chip).toContain('padding: 1px 6px;');
    expect(chip).toContain('font-size: 10.5px;');
    expect(chip).toContain('line-height: 1.5;');
    const tag = ruleBody('.of-board-tag');
    expect(tag).toContain('padding: 1px 5px;');
    // 10.5 px × 1.5, the line box of a chip.
    expect(tag).toContain('line-height: 15.75px;');
    expect(tag).toContain('border-radius: 4px;');
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
