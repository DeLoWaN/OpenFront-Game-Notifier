/**
 * CSS of the Lobby Board.
 */

import { BOARD_COLORS, BOARD_SIZES, COLORS, FONTS, RADIUS } from '@/config/theme';

export function getBoardStyles(): string {
  return `
    /* ===================== Lobby Board ===================== */
    /* The board is a child of OpenFront's page grid. It spans every column, and
       it breaks out of the page column to the width of the viewport minus a gutter.
       The view measures both variables in px. */
    .of-board {
      grid-column: 1 / -1;
      grid-row: 2;
      box-sizing: border-box;
      width: var(--of-board-width);
      margin-left: var(--of-board-left);
      border: 1px solid var(--of-hud-line-2);
      border-radius: ${RADIUS.xl};
      background: ${BOARD_COLORS.surface};
      color: var(--of-hud-text-1);
      font-family: ${FONTS.body};
      overflow: hidden;
    }
    .of-board-head {
      display: flex;
      align-items: center;
      gap: 14px;
      padding: 10px 16px;
      border-bottom: 1px solid var(--of-hud-line-1);
    }
    .of-board-title {
      font-weight: 800;
      letter-spacing: 0.3px;
    }
    .of-board-totals {
      font-size: 12px;
      color: var(--of-hud-text-2);
    }
    .of-board-grid {
      display: grid;
      grid-template-columns: 54px repeat(4, minmax(0, 1fr));
      gap: ${BOARD_SIZES.gridGapPx}px;
      align-items: stretch;
      padding: 14px 16px 16px;
    }
    .of-board-colhead {
      display: flex;
      align-items: baseline;
      gap: 8px;
      padding: 2px 4px 4px;
      font-size: 11px;
      font-weight: 800;
      letter-spacing: 1px;
      text-transform: uppercase;
      color: var(--of-hud-text-3);
    }
    .of-board-colhead b {
      font-size: 13px;
      letter-spacing: 0.6px;
      color: var(--of-hud-text-1);
    }
    .of-board-colhead em {
      font-style: normal;
      color: var(--of-hud-accent);
    }
    .of-board-rowlabel {
      display: flex;
      align-items: center;
      justify-content: center;
      border-right: 1px solid var(--of-hud-line-1);
      font-size: 11px;
      font-weight: 800;
      letter-spacing: 0.5px;
      color: var(--of-hud-text-4);
    }
    .of-board-rowlabel-live {
      color: ${BOARD_COLORS.live};
      text-transform: uppercase;
    }
    .of-board-cell {
      min-width: 0;
      display: flex;
    }
    .of-board-empty {
      flex: 1;
      min-height: ${BOARD_SIZES.cardMinHeightPx}px;
      border: 1px dashed var(--of-hud-line-1);
      border-radius: ${RADIUS.lg};
    }

    .of-board-card {
      /* The gauge height is also the bottom padding that keeps the content above the gauge. */
      --of-board-thumb-width: ${BOARD_SIZES.thumbWidthPx}px;
      --of-board-gauge-height: ${BOARD_SIZES.gaugeHeightPx}px;
      position: relative;
      box-sizing: border-box;
      flex: 1;
      min-width: 0;
      min-height: ${BOARD_SIZES.cardMinHeightPx}px;
      display: flex;
      align-items: stretch;
      padding: 0 0 var(--of-board-gauge-height);
      overflow: hidden;
      border: 1px solid var(--of-hud-line-2);
      border-radius: ${RADIUS.lg};
      background: var(--of-hud-bg-1);
      color: ${BOARD_COLORS.text};
      font-family: ${FONTS.body};
      font-size: 14px;
      line-height: 1.3;
      text-align: left;
      cursor: pointer;
    }
    .of-board-thumb {
      position: relative;
      z-index: 0;
      flex: none;
      width: var(--of-board-thumb-width);
      overflow: hidden;
      background: var(--of-hud-bg-2);
      pointer-events: none;
    }
    .of-board-thumb img {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .of-board-countdown {
      flex: none;
      padding: 1px 6px;
      border-radius: 4px;
      background: ${BOARD_COLORS.live};
      color: ${BOARD_COLORS.onLive};
      font: 800 11px/1.4 ${FONTS.mono};
      white-space: nowrap;
    }
    .of-board-text {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
      justify-content: center;
      gap: 5px;
      padding: 10px 10px 11px;
      background: var(--of-hud-bg-1);
    }
    .of-board-card:hover .of-board-text {
      background-color: ${BOARD_COLORS.textColumnHover};
    }
    /* The name takes the free width, so it wraps before the "New" badge and the countdown. */
    .of-board-nameline {
      display: flex;
      align-items: flex-start;
      gap: 6px;
      min-width: 0;
    }
    .of-board-map {
      flex: 1;
      min-width: 0;
      overflow-wrap: anywhere;
      font-size: 14px;
      font-weight: 800;
      line-height: 1.25;
      letter-spacing: 0.2px;
    }
    .of-board-formatline {
      display: flex;
      align-items: center;
      gap: 6px;
      min-width: 0;
    }
    .of-board-format {
      min-width: 0;
      font-size: 12px;
      line-height: 1.25;
      color: var(--of-hud-text-1);
    }
    .of-board-tag {
      flex: none;
      padding: 0 5px;
      border-radius: 3px;
      background: var(--of-hud-accent);
      font-size: 9px;
      font-weight: 800;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      line-height: 1.5;
      white-space: nowrap;
      color: ${BOARD_COLORS.onAccent};
    }
    .of-board-gauge {
      position: absolute;
      left: 0;
      right: 0;
      bottom: 0;
      z-index: 1;
      box-sizing: border-box;
      height: var(--of-board-gauge-height);
      display: flex;
      align-items: center;
      border-top: 1px solid var(--of-hud-line-3);
      background: ${BOARD_COLORS.gaugeTrack};
    }
    .of-board-fill {
      position: absolute;
      top: 0;
      bottom: 0;
      left: 0;
      background: ${BOARD_COLORS.gaugeFill};
    }
    .of-board-gauge-hot .of-board-fill {
      background: ${BOARD_COLORS.gaugeFillHot};
    }
    .of-board-players {
      position: relative;
      display: flex;
      align-items: center;
      gap: 5px;
      padding-left: 8px;
      font: 700 10.5px/1 ${FONTS.mono};
      white-space: nowrap;
      color: ${BOARD_COLORS.text};
      text-shadow: 0 1px 2px ${BOARD_COLORS.gaugeTextShadow};
    }
    .of-board-players svg {
      width: 11px;
      height: 11px;
      fill: currentColor;
      opacity: 0.9;
    }
    .of-board-percent {
      position: relative;
      margin-left: auto;
      padding-right: 8px;
      font: 700 10px/1 ${FONTS.mono};
      font-style: normal;
      color: var(--of-hud-text-2);
      text-shadow: 0 1px 2px ${BOARD_COLORS.gaugeTextShadow};
    }
    .of-board-mods {
      display: flex;
      flex-wrap: wrap;
      gap: 3px 4px;
    }
    .of-board-mod {
      padding: 1px 6px;
      border-radius: 4px;
      background: ${BOARD_COLORS.chip};
      font-size: 10.5px;
      line-height: 1.5;
      white-space: nowrap;
      color: var(--of-hud-text-2);
    }
    .of-board-mod-required {
      background: var(--of-hud-accent-soft);
      box-shadow: inset 0 0 0 1px var(--of-hud-accent);
      font-weight: 700;
      color: ${BOARD_COLORS.text};
    }
    .of-board-mod-blocked {
      background: ${BOARD_COLORS.blockedBg};
      text-decoration: line-through;
      color: ${BOARD_COLORS.blockedText};
    }
    .of-board-nomods {
      font-size: 10.5px;
      line-height: 1.5;
      font-style: italic;
      color: var(--of-hud-text-3);
    }
    /* The overlay paints the frame and the flash above every part of the card.
       It stays inside the card, so it never touches a neighbour. */
    .of-board-card::after {
      content: '';
      position: absolute;
      inset: 0;
      z-index: 3;
      border-radius: inherit;
      pointer-events: none;
    }
    /* The frame of the card under the pointer grows to 2 px, inside the card. */
    .of-board-card:hover::after {
      box-shadow: inset 0 0 0 2px var(--of-hud-text-3);
    }
    .of-board-card-match {
      border-color: ${BOARD_COLORS.live};
    }
    .of-board-card-match::after {
      box-shadow: inset 0 0 0 1px ${BOARD_COLORS.live};
    }
    .of-board-card-match:hover::after {
      box-shadow: inset 0 0 0 2px ${BOARD_COLORS.live};
    }
    .of-board-card-dim {
      opacity: 0.3;
      filter: grayscale(0.7);
    }
    .of-board-card-dim:hover {
      opacity: 0.8;
      filter: none;
    }
    .of-board-new {
      flex: none;
      padding: 1px 6px;
      border-radius: 4px;
      background: ${COLORS.accent};
      font-size: 10px;
      font-weight: 800;
      line-height: 1.6;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      color: ${BOARD_COLORS.onNew};
    }
    /* The flash follows a click on a notification. Its glow is inset, so it stays in the card. */
    @keyframes ofBoardFlash {
      0%, 100% {
        box-shadow: inset 0 0 0 1px ${BOARD_COLORS.live};
      }
      50% {
        box-shadow: inset 0 0 0 4px ${BOARD_COLORS.live}, inset 0 0 28px ${BOARD_COLORS.liveGlow};
      }
    }
    .of-board-card.of-board-card-flash::after {
      animation: ofBoardFlash 0.5s ease-in-out 4;
    }
    @media (prefers-reduced-motion: reduce) {
      .of-board-card.of-board-card-flash::after {
        animation: none;
        box-shadow: inset 0 0 0 4px ${BOARD_COLORS.live};
      }
    }
  `;
}
