/**
 * CSS of the Lobby Board sidebar and header controls.
 */

import { RADIUS, TIMING } from '@/config/theme';

export function getBoardChromeStyles(): string {
  return `
    /* ===================== Lobby Board sidebar and header ===================== */
    .of-board-controls {
      margin-left: auto;
      display: flex;
      align-items: center;
    }
    .of-board-controls .ld-status {
      padding: 0;
      border-bottom: 0;
      background: none;
      gap: 12px;
    }
    .of-board-controls .ld-status-text {
      flex: none;
    }

    .of-board-main {
      display: flex;
      align-items: flex-start;
    }
    .of-board-main > .of-board-grid {
      flex: 1;
      min-width: 0;
    }

    .of-board-sidebar {
      flex: 0 0 340px;
      width: 340px;
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
      /* The filter sections scroll inside the sidebar on a short screen. */
      max-height: calc(100vh - 120px);
      margin: 14px 0 16px 16px;
      border: 1px solid var(--of-hud-line-1);
      border-radius: ${RADIUS.lg};
      background: var(--of-hud-bg-1);
      font-family: inherit;
      user-select: none;
    }
    .of-board-sidebar-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px 10px 8px 14px;
      border-bottom: 1px solid var(--of-hud-line-1);
    }
    .of-board-sidebar-title {
      font-size: 11px;
      font-weight: 800;
      letter-spacing: 1px;
      text-transform: uppercase;
      color: var(--of-hud-text-3);
    }
    .of-board-sidebar-toggle {
      appearance: none;
      width: 26px;
      height: 26px;
      border: 0;
      border-radius: 7px;
      background: transparent;
      color: var(--of-hud-text-3);
      font-size: 16px;
      line-height: 1;
      cursor: pointer;
      transition: background ${TIMING.fast}, color ${TIMING.fast};
    }
    .of-board-sidebar-toggle:hover {
      background: var(--of-hud-bg-3);
      color: var(--of-hud-text-1);
    }
    .of-board-sidebar-body {
      display: flex;
      flex-direction: column;
      flex: 1;
      min-height: 0;
    }
    .of-board-sidebar-body[hidden],
    .of-board-sidebar-summary[hidden] {
      display: none;
    }
    .of-board-sidebar-summary {
      margin: 0 auto;
      padding: 14px 0;
      writing-mode: vertical-rl;
      transform: rotate(180deg);
      font-size: 11px;
      color: var(--of-hud-text-2);
      white-space: nowrap;
    }
    .of-board-sidebar.is-collapsed {
      flex-basis: 46px;
      width: 46px;
    }
    .of-board-sidebar.is-collapsed .of-board-sidebar-head {
      justify-content: center;
      padding: 8px 0;
      border-bottom: 0;
    }
    .of-board-sidebar.is-collapsed .of-board-sidebar-title {
      display: none;
    }

    /* The sidebar is too narrow for the label and both steppers on one line. */
    .of-board-sidebar .ld-slider-label {
      flex-direction: column;
      align-items: flex-start;
      gap: 6px;
    }
    .of-board-sidebar .ld-slider-label .val {
      display: flex;
      align-items: center;
      flex-wrap: nowrap;
      white-space: nowrap;
    }

    /* The floating panel's slots take no box of their own. */
    .ld-panel-slot {
      display: contents;
    }
  `;
}
