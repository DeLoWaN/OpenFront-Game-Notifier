/**
 * CSS of the Lobby Board.
 */

import { BOARD_COLORS, COLORS, FONTS, RADIUS, TIMING } from '@/config/theme';

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
      gap: 8px 10px;
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
      min-height: 84px;
      border: 1px dashed var(--of-hud-line-1);
      border-radius: ${RADIUS.lg};
    }

    .of-board-card {
      position: relative;
      flex: 1;
      min-width: 0;
      min-height: 118px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      align-items: stretch;
      gap: 6px;
      padding: 8px;
      overflow: hidden;
      border: 1px solid var(--of-hud-line-2);
      border-radius: ${RADIUS.lg};
      background: var(--of-hud-bg-1);
      color: ${BOARD_COLORS.text};
      text-align: left;
      cursor: pointer;
      transition: opacity ${TIMING.normal}, border-color ${TIMING.fast};
    }
    .of-board-thumb {
      position: absolute;
      inset: 0;
      z-index: 0;
      pointer-events: none;
    }
    .of-board-thumb img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      opacity: 0.55;
    }
    .of-board-top,
    .of-board-body {
      position: relative;
      z-index: 1;
      min-width: 0;
    }
    .of-board-top {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 4px;
    }
    /* The negative margin cancels the card padding, so the panel reaches the card edges. */
    .of-board-body {
      display: flex;
      flex-direction: column;
      gap: 3px;
      margin: 0 -8px -8px;
      padding: 7px 8px 8px;
      border-top: 1px solid var(--of-hud-line-3);
      background: ${BOARD_COLORS.panel};
    }
    .of-board-badge {
      padding: 2px 6px;
      border: 1px solid var(--of-hud-line-3);
      border-radius: 4px;
      background: ${BOARD_COLORS.badgeBg};
      font-size: 10px;
      font-weight: 800;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      line-height: 1.3;
      white-space: nowrap;
      color: ${BOARD_COLORS.textSoft};
    }
    .of-board-badge[data-countdown-to] {
      border-color: transparent;
      background: ${BOARD_COLORS.live};
      color: ${BOARD_COLORS.text};
      font-family: ${FONTS.mono};
    }
    .of-board-tag {
      padding: 2px 6px;
      border-radius: 4px;
      background: var(--of-hud-accent);
      font-size: 10px;
      font-weight: 800;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      line-height: 1.3;
      color: ${BOARD_COLORS.onAccent};
    }
    .of-board-map {
      max-width: 100%;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-weight: 800;
      letter-spacing: 0.2px;
    }
    .of-board-format {
      font-size: 12px;
      color: var(--of-hud-text-1);
    }
    .of-board-playersrow {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 11px;
      font-family: ${FONTS.mono};
      color: var(--of-hud-text-2);
    }
    .of-board-bar {
      flex: 1;
      min-width: 40px;
      height: 5px;
      border-radius: 3px;
      background: ${BOARD_COLORS.track};
      overflow: hidden;
    }
    .of-board-fill {
      display: block;
      height: 100%;
      background: ${BOARD_COLORS.fill};
    }
    .of-board-bar-hot .of-board-fill {
      background: ${BOARD_COLORS.live};
    }
    .of-board-mods {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
    }
    .of-board-mod {
      padding: 1px 6px;
      border-radius: 4px;
      background: ${BOARD_COLORS.chip};
      font-size: 11px;
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
      font-size: 11px;
      font-style: italic;
      color: var(--of-hud-text-4);
    }
    /* The frame stays inside the card, so it never touches a neighbour. */
    .of-board-card-match {
      border-color: ${BOARD_COLORS.live};
      box-shadow: inset 0 0 0 1px ${BOARD_COLORS.live};
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
      position: absolute;
      top: 6px;
      right: 6px;
      z-index: 2;
      padding: 2px 6px;
      border-radius: 4px;
      background: ${COLORS.accent};
      font-size: 10px;
      font-weight: 800;
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
    .of-board-card.of-board-card-flash {
      animation: ofBoardFlash 0.5s ease-in-out 4;
    }
  `;
}
