// ==UserScript==
// @name         OpenFront Game Notifier
// @namespace    https://openfront.io/
// @version      2.12.0
// @description  Notifies you when a public OpenFront lobby matches your filters (mode, team format, capacity, modifiers) via in-page highlight, sound, and optional desktop notifications. Never auto-joins.
// @homepageURL  https://github.com/DeLoWaN/openfront-game-notifier
// @downloadURL  https://raw.githubusercontent.com/DeLoWaN/openfront-game-notifier/main/dist/bundle.user.js
// @updateURL    https://raw.githubusercontent.com/DeLoWaN/openfront-game-notifier/main/dist/bundle.user.js
// @author       DeLoVaN + SyntaxMenace + DeepSeek + Claude
// @match        https://openfront.io/
// @match        https://openfront.io/*
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_addStyle
// @grant        unsafeWindow
// @license      UNLICENSED
// ==/UserScript==

"use strict";
(() => {
  // src/config/theme.ts
  var COLORS = {
    bgPrimary: "#0d0f10",
    bgSecondary: "#14171a",
    bgElevated: "#1a1e22",
    bgRaised: "#20252a",
    bgHover: "rgba(255,255,255,0.04)",
    textPrimary: "#f2f1ee",
    textSecondary: "#c8c6c0",
    textMuted: "#8e8c85",
    textFaint: "#5a5853",
    border: "rgba(255,255,255,0.06)",
    borderSubtle: "rgba(255,255,255,0.10)",
    borderStrong: "rgba(255,255,255,0.16)",
    accent: "#7aa7d4",
    accentSoft: "rgba(122,167,212,0.14)",
    accentLine: "rgba(122,167,212,0.32)",
    accentShadow: "122,167,212",
    warning: "#d4a056",
    warningSoft: "rgba(212,160,86,0.14)",
    danger: "#d27a6b",
    dangerSoft: "rgba(210,122,107,0.14)",
    dangerLine: "rgba(210,122,107,0.30)",
    // legacy aliases — kept so other modules compile unchanged
    accentMuted: "rgba(122,167,212,0.14)",
    accentHover: "#9bbfe0",
    accentAlt: "#9bbfe0",
    borderAccent: "rgba(122,167,212,0.32)",
    highlight: "rgba(122,167,212,0.20)",
    success: "#74c69d",
    successSolid: "#74c69d",
    error: "#d27a6b"
  };
  var FONTS = {
    body: "'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif",
    display: "'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif",
    mono: "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace"
  };
  var RADIUS = {
    sm: "6px",
    md: "7px",
    lg: "10px",
    xl: "14px"
  };
  var SHADOWS = {
    sm: "0 1px 3px rgba(0,0,0,0.4)",
    md: "0 2px 8px rgba(0,0,0,0.3)",
    lg: "0 1px 0 rgba(255,255,255,0.04) inset, 0 24px 48px rgba(0,0,0,0.45), 0 2px 8px rgba(0,0,0,0.3)"
  };
  var TIMING = {
    fast: "0.12s",
    normal: "0.2s",
    slow: "0.3s"
  };

  // src/config/constants.ts
  var STORAGE_KEYS = {
    lobbyDiscoverySettings: "OF_LOBBY_DISCOVERY_SETTINGS",
    lobbyDiscoveryCollapsedSections: "OF_LOBBY_DISCOVERY_COLLAPSED_SECTIONS"
  };
  var Z_INDEX = {
    panel: 9998,
    panelOverlay: 9999,
    modal: 1e4,
    notification: 2e4
  };
  var TEAM_PLAYERS_PER_TEAM_STOPS = [
    2,
    3,
    4,
    5,
    6,
    8,
    10,
    15,
    20,
    30,
    62
  ];
  var TEAM_MIN_PLAYERS_PER_TEAM = 2;
  var TEAM_MAX_PLAYERS_PER_TEAM = 62;

  // src/styles/boardStyles.ts
  function getBoardStyles() {
    return `
    /* ===================== Lobby Board ===================== */
    /* The board is a child of OpenFront's page grid. It spans every column, and
       it breaks out of the page column to the full width of the screen. */
    .of-board {
      grid-column: 1 / -1;
      grid-row: 2;
      box-sizing: border-box;
      width: calc(100vw - 32px);
      margin-left: calc(50% - 50vw + 16px);
      border: 1px solid var(--of-hud-line-2);
      border-radius: ${RADIUS.xl};
      background: rgba(16, 10, 24, 0.92);
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
      color: #e8600c;
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
      min-height: 84px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      align-items: flex-start;
      padding: 8px;
      overflow: hidden;
      border: 1px solid var(--of-hud-line-2);
      border-radius: ${RADIUS.lg};
      background: var(--of-hud-bg-1);
      color: #fff;
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
    .of-board-thumb::after {
      content: '';
      position: absolute;
      inset: 0;
      background: linear-gradient(180deg, rgba(10, 6, 16, 0) 30%, rgba(10, 6, 16, 0.85) 100%);
    }
    .of-board-badge,
    .of-board-map {
      position: relative;
      z-index: 1;
    }
    .of-board-badge {
      padding: 2px 6px;
      border: 1px solid var(--of-hud-line-3);
      border-radius: 4px;
      background: rgba(0, 0, 0, 0.6);
      font-size: 10px;
      font-weight: 800;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      line-height: 1.3;
      white-space: nowrap;
      color: #ddd;
    }
    .of-board-badge[data-countdown-to] {
      border-color: transparent;
      background: #e8600c;
      color: #fff;
      font-family: ${FONTS.mono};
    }
    .of-board-map {
      max-width: 100%;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-weight: 800;
      letter-spacing: 0.2px;
    }
    .of-board-card-match {
      border-color: ${COLORS.accentLine};
      box-shadow: inset 0 0 0 1px ${COLORS.accentLine};
    }
    .of-board-card-dim {
      opacity: 0.42;
    }
    .of-board-card-dim:hover {
      opacity: 0.8;
    }
  `;
  }

  // src/styles/styles.ts
  function getStyles() {
    return `
    :root {
      --of-hud-accent: ${COLORS.accent};
      --of-hud-accent-soft: ${COLORS.accentSoft};
      --of-hud-accent-line: ${COLORS.accentLine};
      --of-hud-bg-0: ${COLORS.bgPrimary};
      --of-hud-bg-1: ${COLORS.bgSecondary};
      --of-hud-bg-2: ${COLORS.bgElevated};
      --of-hud-bg-3: ${COLORS.bgRaised};
      --of-hud-text-1: ${COLORS.textPrimary};
      --of-hud-text-2: ${COLORS.textSecondary};
      --of-hud-text-3: ${COLORS.textMuted};
      --of-hud-text-4: ${COLORS.textFaint};
      --of-hud-line-1: ${COLORS.border};
      --of-hud-line-2: ${COLORS.borderSubtle};
      --of-hud-line-3: ${COLORS.borderStrong};
      --of-hud-danger: ${COLORS.danger};
      --of-hud-danger-soft: ${COLORS.dangerSoft};
      --of-hud-danger-line: ${COLORS.dangerLine};
    }

    @keyframes ofPanelEnter {
      from { opacity: 0; transform: translateY(10px); }
      to   { opacity: 1; transform: translateY(0); }
    }

    @keyframes livePulse {
      0%   { box-shadow: 0 0 0 0 rgba(${COLORS.accentShadow}, 0.5); }
      70%  { box-shadow: 0 0 0 8px rgba(${COLORS.accentShadow}, 0); }
      100% { box-shadow: 0 0 0 0 rgba(${COLORS.accentShadow}, 0); }
    }

    .of-panel {
      position: fixed;
      background: linear-gradient(180deg, var(--of-hud-bg-2) 0%, var(--of-hud-bg-1) 100%);
      border: 1px solid var(--of-hud-line-2);
      border-radius: ${RADIUS.xl};
      box-shadow: ${SHADOWS.lg};
      font-family: ${FONTS.body};
      color: var(--of-hud-text-1);
      user-select: none;
      z-index: ${Z_INDEX.panel};
      display: flex;
      flex-direction: column;
      overflow: hidden;
      animation: ofPanelEnter ${TIMING.slow} ease;
    }
    .of-panel.hidden { display: none; }

    .discovery-panel {
      top: 24px;
      right: 24px;
      width: 380px;
      max-height: calc(100vh - 48px);
    }

    .discovery-body {
      display: flex;
      flex-direction: column;
      min-height: 0;
      flex: 1;
      overflow: hidden;
    }

    /* Status pill */
    .ld-status {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 14px;
      border-bottom: 1px solid var(--of-hud-line-1);
      background: linear-gradient(180deg, rgba(255,255,255,0.02) 0%, transparent 100%);
    }
    .ld-pulse {
      position: relative;
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--of-hud-accent);
      box-shadow: 0 0 0 0 var(--of-hud-accent);
      animation: livePulse 2s cubic-bezier(.4,0,.2,1) infinite;
      flex-shrink: 0;
    }
    .ld-pulse.is-paused {
      background: var(--of-hud-text-4);
      animation: none;
      box-shadow: none;
    }
    .ld-status-text {
      flex: 1;
      min-width: 0;
      display: flex;
      align-items: baseline;
      gap: 6px;
      font-size: 12px;
      color: var(--of-hud-text-2);
      cursor: pointer;
    }
    .ld-status-text strong {
      font-weight: 500;
      color: var(--of-hud-text-1);
      letter-spacing: 0.01em;
    }
    .ld-status-text .sep { color: var(--of-hud-text-4); }
    .ld-status-text .meta {
      font-family: ${FONTS.mono};
      font-size: 11px;
      color: var(--of-hud-text-3);
      font-variant-numeric: tabular-nums;
    }
    .ld-icons {
      display: flex;
      gap: 4px;
      flex-shrink: 0;
    }
    .ld-icon-btn {
      appearance: none;
      border: 0;
      cursor: pointer;
      width: 26px;
      height: 26px;
      display: grid;
      place-items: center;
      border-radius: 7px;
      background: transparent;
      color: var(--of-hud-text-3);
      transition: background ${TIMING.fast}, color ${TIMING.fast};
      padding: 0;
    }
    .ld-icon-btn:hover {
      background: var(--of-hud-bg-3);
      color: var(--of-hud-text-1);
    }
    .ld-icon-btn.is-on {
      background: var(--of-hud-accent-soft);
      color: var(--of-hud-accent);
    }
    .ld-icon-btn svg {
      width: 14px;
      height: 14px;
      fill: none;
      stroke: currentColor;
      stroke-width: 1.6;
      stroke-linecap: round;
      stroke-linejoin: round;
    }
    .ld-icon-btn input { display: none; }
    .ld-mode-btn input { display: none; }
    .ld-chip input { display: none; }

    /* Header */
    .ld-head {
      padding: 16px 18px 12px;
      border-bottom: 1px solid var(--of-hud-line-1);
      flex-shrink: 0;
    }
    .ld-eyebrow {
      font-family: ${FONTS.mono};
      font-size: 10px;
      letter-spacing: 0.16em;
      text-transform: uppercase;
      color: var(--of-hud-text-4);
      margin-bottom: 4px;
    }
    .ld-title {
      font-family: ${FONTS.display};
      font-size: 18px;
      font-weight: 600;
      letter-spacing: -0.01em;
      color: var(--of-hud-text-1);
      margin: 0;
    }

    /* Scroll body */
    .discovery-content {
      flex: 1;
      min-height: 0;
      overflow-y: auto;
      overflow-x: hidden;
      scrollbar-width: thin;
      scrollbar-color: rgba(255,255,255,0.08) transparent;
    }
    .discovery-content::-webkit-scrollbar { width: 8px; }
    .discovery-content::-webkit-scrollbar-track { background: transparent; }
    .discovery-content::-webkit-scrollbar-thumb {
      background: rgba(255,255,255,0.08);
      border-radius: 4px;
      border: 2px solid transparent;
      background-clip: content-box;
    }

    .ld-section {
      padding: 16px 18px 14px;
      border-bottom: 1px solid var(--of-hud-line-1);
    }
    .ld-section:last-child { border-bottom: 0; }

    .ld-section-head {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      margin-bottom: 12px;
    }
    .ld-section-label {
      font-family: ${FONTS.mono};
      font-size: 10px;
      letter-spacing: 0.16em;
      text-transform: uppercase;
      color: var(--of-hud-text-3);
    }
    .ld-section-aside {
      font-size: 11px;
      color: var(--of-hud-text-4);
    }

    /* Mode segmented selector */
    .ld-modes {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 6px;
      padding: 4px;
      background: var(--of-hud-bg-0);
      border: 1px solid var(--of-hud-line-1);
      border-radius: 10px;
      margin-bottom: 14px;
    }
    .ld-mode-btn {
      appearance: none;
      border: 0;
      cursor: pointer;
      background: transparent;
      color: var(--of-hud-text-3);
      padding: 8px 10px;
      border-radius: 7px;
      font: inherit;
      font-size: 12px;
      font-weight: 500;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      transition: background ${TIMING.fast}, color ${TIMING.fast};
    }
    .ld-mode-btn:hover { color: var(--of-hud-text-1); }
    .ld-mode-btn.is-on {
      background: var(--of-hud-bg-3);
      color: var(--of-hud-text-1);
      box-shadow: 0 1px 0 rgba(255,255,255,0.04) inset, 0 1px 2px rgba(0,0,0,0.3);
    }
    .ld-mode-btn .check {
      width: 14px;
      height: 14px;
      border-radius: 4px;
      border: 1.5px solid var(--of-hud-text-4);
      display: grid;
      place-items: center;
      transition: background ${TIMING.fast}, border-color ${TIMING.fast};
      flex-shrink: 0;
    }
    .ld-mode-btn.is-on .check {
      background: var(--of-hud-accent);
      border-color: var(--of-hud-accent);
    }
    .ld-mode-btn.is-on .check svg {
      width: 9px;
      height: 9px;
      stroke: var(--of-hud-bg-0);
      stroke-width: 2.5;
      fill: none;
      stroke-linecap: round;
      stroke-linejoin: round;
    }

    /* Mode panel */
    .ld-mode-panel {
      background: rgba(0,0,0,0.18);
      border: 1px solid var(--of-hud-line-1);
      border-radius: 10px;
      padding: 14px;
      margin-bottom: 10px;
      transition: opacity ${TIMING.normal};
    }
    .ld-mode-panel.is-off {
      opacity: 0.4;
      pointer-events: none;
    }
    .ld-mode-panel-head {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 12px;
    }
    .ld-mode-panel-head .dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: var(--of-hud-accent);
    }
    .ld-mode-panel.is-off .ld-mode-panel-head .dot {
      background: var(--of-hud-text-4);
    }
    .ld-mode-panel-head .title {
      font-size: 12px;
      font-weight: 600;
      letter-spacing: 0.02em;
      color: var(--of-hud-text-1);
      text-transform: uppercase;
    }

    .ld-format-label {
      font-size: 11px;
      color: var(--of-hud-text-4);
      font-family: ${FONTS.mono};
      letter-spacing: 0.06em;
      margin-bottom: 6px;
    }

    /* Format chips */
    .ld-formats {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
      margin-bottom: 6px;
    }
    .ld-formats:last-of-type { margin-bottom: 14px; }
    .ld-chip {
      appearance: none;
      cursor: pointer;
      background: var(--of-hud-bg-3);
      color: var(--of-hud-text-3);
      padding: 5px 10px;
      border-radius: 6px;
      font: inherit;
      font-size: 11px;
      font-weight: 500;
      border: 1px solid transparent;
      transition: background ${TIMING.fast}, color ${TIMING.fast}, border-color ${TIMING.fast};
    }
    .ld-chip:hover { color: var(--of-hud-text-1); }
    .ld-chip.is-on {
      background: var(--of-hud-accent-soft);
      color: var(--of-hud-accent);
      border-color: var(--of-hud-accent-line);
    }

    /* Slider */
    .ld-slider-row { margin-bottom: 4px; }
    .ld-slider-label {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      font-size: 11px;
      color: var(--of-hud-text-3);
      margin-bottom: 8px;
    }
    .ld-slider-label .val {
      font-family: ${FONTS.mono};
      color: var(--of-hud-text-1);
      font-variant-numeric: tabular-nums;
    }
    .ld-slider-label .val .sep {
      color: var(--of-hud-text-4);
      margin: 0 4px;
    }
    .ld-range {
      --lo: 0%;
      --hi: 100%;
      position: relative;
      height: 22px;
      margin: 0 6px;
    }
    .capacity-slider.is-max-locked::-webkit-slider-thumb {
      opacity: 0.45;
      cursor: not-allowed;
    }
    .capacity-slider.is-max-locked::-moz-range-thumb {
      opacity: 0.45;
      cursor: not-allowed;
    }
    .capacity-slider.is-max-locked {
      pointer-events: none;
    }
    .ld-range .track {
      position: absolute;
      left: -6px;
      right: -6px;
      top: 9px;
      height: 4px;
      background: var(--of-hud-bg-3);
      border-radius: 2px;
    }
    .ld-range .track-fill {
      position: absolute;
      top: 0;
      bottom: 0;
      left: var(--lo);
      right: calc(100% - var(--hi));
      background: var(--of-hud-accent);
      border-radius: 2px;
    }
    .capacity-slider {
      position: absolute;
      left: -6px;
      right: -6px;
      width: calc(100% + 12px);
      top: 0;
      height: 22px;
      appearance: none;
      -webkit-appearance: none;
      background: transparent;
      pointer-events: none;
      margin: 0;
      outline: none;
    }
    .capacity-slider::-webkit-slider-thumb {
      -webkit-appearance: none;
      appearance: none;
      width: 14px;
      height: 14px;
      border-radius: 50%;
      background: var(--of-hud-text-1);
      border: 1px solid rgba(0,0,0,0.4);
      box-shadow: ${SHADOWS.sm};
      pointer-events: auto;
      cursor: grab;
    }
    .capacity-slider::-moz-range-thumb {
      width: 14px;
      height: 14px;
      border-radius: 50%;
      background: var(--of-hud-text-1);
      border: 1px solid rgba(0,0,0,0.4);
      box-shadow: ${SHADOWS.sm};
      pointer-events: auto;
      cursor: grab;
    }
    .capacity-slider-min { z-index: 2; }
    .capacity-slider-max { z-index: 1; }

    /* Stepper (number input + - / + buttons) */
    .ld-stepper {
      display: inline-flex;
      align-items: center;
      gap: 2px;
      background: rgba(0,0,0,0.25);
      border: 1px solid var(--of-hud-line-1);
      border-radius: 6px;
      padding: 2px 4px;
      font-family: ${FONTS.mono};
    }
    .ld-stepper input[type="number"] {
      width: 2.5em;
      background: transparent;
      border: none;
      color: var(--of-hud-text-1);
      font: inherit;
      text-align: center;
      padding: 0 2px;
      font-variant-numeric: tabular-nums;
      -moz-appearance: textfield;
    }
    .ld-stepper input[type="number"]::-webkit-outer-spin-button,
    .ld-stepper input[type="number"]::-webkit-inner-spin-button {
      -webkit-appearance: none;
      margin: 0;
    }
    .ld-stepper input[type="number"]:focus { outline: none; color: var(--of-hud-accent); }
    .ld-stepper input[type="number"]:disabled { opacity: 0.45; cursor: not-allowed; }
    .ld-step-btn {
      width: 18px; height: 18px;
      display: inline-flex; align-items: center; justify-content: center;
      background: transparent;
      border: none;
      color: var(--of-hud-text-3);
      cursor: pointer;
      border-radius: 3px;
      font: inherit;
      line-height: 1;
      padding: 0;
    }
    .ld-step-btn:hover:not(:disabled) {
      background: var(--of-hud-bg-3);
      color: var(--of-hud-text-1);
    }
    .ld-step-btn:disabled { opacity: 0.45; cursor: not-allowed; }

    /* Ticks under the slider track */
    .ld-ticks {
      position: relative;
      height: 18px;
      margin: 6px 6px 4px;
      pointer-events: none;
    }
    .ld-tick {
      position: absolute;
      top: 0;
      width: 1px;
      height: 4px;
      background: var(--of-hud-text-4);
      transform: translateX(-0.5px);
    }
    .ld-tick-label {
      position: absolute;
      top: 6px;
      transform: translateX(-50%);
      font-family: ${FONTS.mono};
      font-size: 10px;
      color: var(--of-hud-text-3);
      font-variant-numeric: tabular-nums;
    }

    /* 2x card */
    .ld-2x {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-top: 10px;
      padding: 8px 10px;
      background: rgba(0,0,0,0.2);
      border: 1px solid var(--of-hud-line-1);
      border-radius: 7px;
      cursor: pointer;
      user-select: none;
    }
    .ld-2x .check {
      width: 14px;
      height: 14px;
      border-radius: 4px;
      border: 1.5px solid var(--of-hud-text-4);
      display: grid;
      place-items: center;
      flex-shrink: 0;
      transition: background ${TIMING.fast}, border-color ${TIMING.fast};
    }
    .ld-2x.is-on .check {
      background: var(--of-hud-accent);
      border-color: var(--of-hud-accent);
    }
    .ld-2x.is-on .check svg {
      width: 9px;
      height: 9px;
      stroke: var(--of-hud-bg-0);
      stroke-width: 2.5;
      fill: none;
      stroke-linecap: round;
      stroke-linejoin: round;
    }
    .ld-2x .lbl {
      font-size: 11px;
      color: var(--of-hud-text-2);
    }
    .ld-2x .lbl strong {
      font-family: ${FONTS.mono};
      font-weight: 500;
      color: var(--of-hud-text-1);
    }
    .ld-2x .lbl .hint {
      color: var(--of-hud-text-4);
      margin-left: 6px;
    }
    .ld-2x input { display: none; }

    /* Current game info */
    .ld-current-game-info {
      margin-top: 10px;
      padding: 6px 10px;
      background: var(--of-hud-accent-soft);
      border: 1px solid var(--of-hud-accent-line);
      border-radius: ${RADIUS.sm};
      font-size: 11px;
      color: var(--of-hud-text-2);
      text-align: center;
    }

    /* Modifiers */
    .ld-mods-legend {
      display: flex;
      gap: 10px;
      font-size: 10px;
      color: var(--of-hud-text-4);
      font-family: ${FONTS.mono};
      letter-spacing: 0.06em;
    }
    .ld-mods-legend .key {
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }
    .ld-mods-legend .swatch {
      width: 8px;
      height: 8px;
      border-radius: 2px;
      background: var(--of-hud-bg-3);
    }
    .ld-mods-legend .swatch.req { background: var(--of-hud-accent); }
    .ld-mods-legend .swatch.blk { background: var(--of-hud-danger); }

    .ld-mod-group {
      margin-bottom: 10px;
    }
    .ld-mod-group:last-child { margin-bottom: 0; }
    .ld-mod-group-label {
      font-size: 10px;
      color: var(--of-hud-text-4);
      font-family: ${FONTS.mono};
      letter-spacing: 0.12em;
      text-transform: uppercase;
      margin-bottom: 6px;
    }
    .ld-mods {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 4px 8px;
    }
    .ld-mod {
      appearance: none;
      cursor: pointer;
      background: transparent;
      color: var(--of-hud-text-2);
      padding: 7px 8px 7px 9px;
      border-radius: 7px;
      font: inherit;
      font-size: 12px;
      display: flex;
      align-items: center;
      gap: 8px;
      transition: background ${TIMING.fast}, color ${TIMING.fast}, border-color ${TIMING.fast};
      text-align: left;
      border: 1px solid transparent;
    }
    .ld-mod-name { font-weight: 500; }
    .ld-mod:hover {
      background: rgba(255,255,255,0.025);
      color: var(--of-hud-text-1);
    }
    .ld-mod-ind {
      width: 14px;
      height: 14px;
      border-radius: 4px;
      border: 1.5px solid var(--of-hud-text-4);
      flex-shrink: 0;
      display: grid;
      place-items: center;
      transition: background ${TIMING.fast}, border-color ${TIMING.fast};
    }
    .ld-mod-ind svg {
      width: 9px;
      height: 9px;
      fill: none;
      stroke-width: 2.5;
      stroke-linecap: round;
      stroke-linejoin: round;
    }
    .ld-mod[data-state="required"] {
      color: var(--of-hud-text-1);
      background: var(--of-hud-accent-soft);
      border-color: var(--of-hud-accent-line);
    }
    .ld-mod[data-state="required"] .ld-mod-ind {
      background: var(--of-hud-accent);
      border-color: var(--of-hud-accent);
    }
    .ld-mod[data-state="required"] .ld-mod-ind svg {
      stroke: var(--of-hud-bg-0);
    }
    .ld-mod[data-state="blocked"] {
      color: var(--of-hud-text-2);
      background: var(--of-hud-danger-soft);
      border-color: var(--of-hud-danger-line);
    }
    .ld-mod[data-state="blocked"] .ld-mod-name {
      text-decoration: line-through;
      text-decoration-color: rgba(210,122,107,0.6);
      text-decoration-thickness: 1px;
    }
    .ld-mod[data-state="blocked"] .ld-mod-ind {
      background: var(--of-hud-danger);
      border-color: var(--of-hud-danger);
    }
    .ld-mod[data-state="blocked"] .ld-mod-ind svg {
      stroke: var(--of-hud-bg-0);
    }
    .ld-mod-name {
      flex: 1;
      min-width: 0;
    }
    .ld-section-toggle {
      appearance: none;
      width: 100%;
      background: transparent;
      border: 0;
      padding: 0;
      font: inherit;
      color: inherit;
      cursor: pointer;
      text-align: left;
    }
    .ld-section-toggle[aria-expanded="false"] { margin-bottom: 0; }
    .ld-section-toggle:hover .ld-section-label { color: var(--of-hud-text-1); }
    .ld-section-head-end {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .ld-section-chevron {
      width: 6px;
      height: 6px;
      border-right: 1.5px solid var(--of-hud-text-4);
      border-bottom: 1.5px solid var(--of-hud-text-4);
      transform: translateY(-2px) rotate(45deg);
      transition: transform ${TIMING.fast};
    }
    .ld-section-toggle[aria-expanded="false"] .ld-section-chevron {
      transform: rotate(-45deg);
    }
    .ld-section-body[hidden] { display: none; }
    .ld-maps-tools {
      display: flex;
      gap: 6px;
      margin-bottom: 10px;
    }
    .ld-maps-search {
      flex: 1;
      min-width: 0;
      background: var(--of-hud-bg-0);
      border: 1px solid var(--of-hud-line-1);
      border-radius: 7px;
      color: var(--of-hud-text-1);
      font: inherit;
      font-size: 12px;
      padding: 6px 9px;
    }
    .ld-maps-search:focus {
      outline: none;
      border-color: var(--of-hud-accent-line);
    }
    .ld-maps-clear {
      appearance: none;
      background: transparent;
      border: 1px solid var(--of-hud-line-1);
      border-radius: 7px;
      color: var(--of-hud-text-3);
      font: inherit;
      font-size: 11px;
      padding: 6px 10px;
      cursor: pointer;
    }
    .ld-maps-clear:hover { color: var(--of-hud-text-1); }
    .ld-mod[hidden], .ld-mod-group[hidden] { display: none; }

    .ld-mods-hint {
      font-size: 11px;
      color: var(--of-hud-text-4);
      margin-top: 8px;
      line-height: 1.5;
    }
    .ld-mods-hint strong { font-weight: 500; }
    .ld-mods-hint .req { color: var(--of-hud-accent); }
    .ld-mods-hint .blk { color: var(--of-hud-danger); }

    /* Footer */
    .discovery-footer {
      padding: 10px 14px;
      border-top: 1px solid var(--of-hud-line-1);
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: rgba(0,0,0,0.15);
      flex-shrink: 0;
    }
    .discovery-footer .summary {
      font-size: 11px;
      color: var(--of-hud-text-3);
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .discovery-footer .summary .num {
      font-family: ${FONTS.mono};
      color: var(--of-hud-text-1);
      font-variant-numeric: tabular-nums;
    }
    .discovery-footer .reset {
      appearance: none;
      border: 0;
      cursor: pointer;
      background: transparent;
      color: var(--of-hud-text-3);
      font: inherit;
      font-size: 11px;
      padding: 4px 8px;
      border-radius: 6px;
      transition: background ${TIMING.fast}, color ${TIMING.fast};
    }
    .discovery-footer .reset:hover {
      color: var(--of-hud-text-1);
      background: rgba(255,255,255,0.04);
    }

    /* Native join-modal player highlights \u2014 re-themed to blue accent */
    .of-current-player-boost {
      box-shadow: 0 0 0 1px var(--of-hud-accent), 0 0 16px var(--of-hud-accent-soft);
      background: linear-gradient(90deg, var(--of-hud-accent-soft), rgba(${COLORS.accentShadow}, 0.06));
    }
    .of-current-player-team-boost {
      box-shadow: inset 0 0 0 1px var(--of-hud-accent-line), 0 0 20px var(--of-hud-accent-soft);
    }

    /* Queue card pulse \u2014 orange alarm contrast against the blue panel (intentional) */
    @keyframes discoveryCardActiveBeacon {
      0% {
        box-shadow:
          0 0 0 3px rgba(255, 168, 38, 0.98) inset,
          0 0 28px rgba(255, 122, 26, 0.42);
        filter: saturate(1.08) brightness(1.04);
      }
      50% {
        box-shadow:
          0 0 0 4px rgba(255, 209, 102, 1) inset,
          0 0 48px rgba(255, 122, 26, 0.72),
          0 0 0 12px rgba(255, 168, 38, 0.18);
        filter: saturate(1.2) brightness(1.14);
      }
      100% {
        box-shadow:
          0 0 0 3px rgba(255, 168, 38, 0.98) inset,
          0 0 28px rgba(255, 122, 26, 0.42);
        filter: saturate(1.08) brightness(1.04);
      }
    }
    .of-discovery-card-active {
      border-color: rgba(255, 168, 38, 0.96) !important;
      transition:
        box-shadow ${TIMING.fast},
        filter ${TIMING.fast},
        border-color ${TIMING.fast};
      animation: discoveryCardActiveBeacon 1.45s ease-in-out infinite;
    }

    /* A matching card in OpenFront's See All View. */
    .of-discovery-see-all-match {
      border-radius: 1rem;
      animation: discoveryCardActiveBeacon 1.45s ease-in-out infinite;
    }

    /* ===================== Up Next strip ===================== */
    .of-upcoming {
      margin: 18px 0 0;
      font-family: ${FONTS.body};
      color: var(--of-hud-text-1);
    }

    .of-upcoming-head {
      display: flex;
      align-items: center;
      gap: 12px;
      margin: 0 0 12px;
    }
    .of-upcoming-lbl {
      font-size: 10.5px;
      font-weight: 800;
      letter-spacing: 1.8px;
      text-transform: uppercase;
      color: var(--of-hud-text-3);
    }
    .of-upcoming-rule {
      flex: 1;
      height: 1px;
      background: var(--of-hud-line-1);
    }
    .of-upcoming-toggle {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 11px;
      font-weight: 600;
      color: var(--of-hud-text-2);
      cursor: pointer;
      user-select: none;
    }
    .of-upcoming-toggle input {
      position: absolute;
      opacity: 0;
      width: 0;
      height: 0;
    }
    .of-upcoming-sw {
      position: relative;
      width: 30px;
      height: 17px;
      border-radius: 999px;
      background: var(--of-hud-bg-3);
      box-shadow: inset 0 0 0 1px var(--of-hud-line-2);
      transition: background ${TIMING.fast};
      flex: none;
    }
    .of-upcoming-sw::after {
      content: '';
      position: absolute;
      top: 2px;
      left: 2px;
      width: 13px;
      height: 13px;
      border-radius: 50%;
      background: var(--of-hud-text-2);
      transition: transform ${TIMING.fast}, background ${TIMING.fast};
    }
    .of-upcoming-toggle input:checked + .of-upcoming-sw {
      background: var(--of-hud-accent);
      box-shadow: inset 0 0 0 1px var(--of-hud-accent-line);
    }
    .of-upcoming-toggle input:checked + .of-upcoming-sw::after {
      transform: translateX(13px);
      background: var(--of-hud-bg-0);
    }

    .of-upcoming-grid {
      display: grid;
      grid-template-columns: 2fr 1fr;
      gap: 16px;
    }
    .of-upcoming-col {
      display: flex;
      flex-direction: column;
      gap: 16px;
      min-height: 0;
    }
    .of-upcoming-slot {
      min-height: 124px;
      display: flex;
    }

    .of-upcoming-empty {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      border-radius: ${RADIUS.xl};
      border: 1.5px dashed rgba(255, 255, 255, 0.3);
      background: var(--of-hud-bg-1);
      color: var(--of-hud-text-3);
      font-size: 12px;
      font-weight: 600;
      letter-spacing: 0.4px;
    }

    .of-upcoming-card {
      position: relative;
      width: 100%;
      min-height: 124px;
      /* Flex column + space-between: tags flow at the top, the name bar is
         pinned to the bottom, and the card GROWS to fit its tags instead of
         letting them overlap the name. */
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      border: 1.5px dashed rgba(255, 255, 255, 0.3);
      border-radius: ${RADIUS.xl};
      background: var(--of-hud-bg-1);
      color: #fff;
      text-transform: uppercase;
      text-align: left;
      overflow: hidden;
      cursor: pointer;
      padding: 0;
      transition: transform ${TIMING.normal}, border-color ${TIMING.fast};
    }
    .of-upcoming-card:hover {
      transform: scale(1.02);
      border-color: rgba(255, 255, 255, 0.5);
    }
    .of-upcoming-art {
      position: absolute;
      inset: 0;
      z-index: 0;
      border-radius: ${RADIUS.xl};
      overflow: hidden;
      pointer-events: none;
    }
    .of-upcoming-art img {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      object-fit: cover;
      object-position: center;
      opacity: 0.45;
      filter: grayscale(0.55) brightness(0.82);
    }
    .of-upcoming-art::after {
      content: '';
      position: absolute;
      inset: 0;
      background: linear-gradient(180deg, rgba(10, 12, 13, 0.25), rgba(10, 12, 13, 0.6));
    }
    .of-upcoming-toprow {
      position: relative;
      z-index: 1;
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 8px;
      padding: 8px 8px 0;
    }
    .of-upcoming-tags {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 4px;
      max-width: 62%;
      min-width: 0;
    }
    .of-upcoming-tag {
      max-width: 100%;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.6px;
      padding: 3px 7px;
      border-radius: 4px;
      background: rgba(10, 12, 13, 0.7);
      border: 1px solid var(--of-hud-line-3);
      color: var(--of-hud-text-3);
    }
    .of-upcoming-tag-more {
      color: var(--of-hud-text-2);
    }
    .of-upcoming-chip {
      display: flex;
      align-items: center;
      gap: 5px;
      font-size: 10px;
      font-weight: 800;
      letter-spacing: 1.2px;
      padding: 4px 8px;
      border-radius: 4px;
      background: rgba(10, 12, 13, 0.78);
      color: var(--of-hud-text-2);
      border: 1px solid var(--of-hud-line-3);
      white-space: nowrap;
    }
    .of-upcoming-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: var(--of-hud-text-3);
    }
    .of-upcoming-bot {
      position: relative;
      z-index: 1;
      display: flex;
      flex-direction: column;
      gap: 2px;
      padding: 8px 12px;
      background: rgba(0, 0, 0, 0.55);
      backdrop-filter: blur(8px);
    }
    .of-upcoming-metarow {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      min-width: 0;
    }
    .of-upcoming-count {
      flex: none;
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.8px;
      color: var(--of-hud-text-3);
    }
    .of-upcoming-count svg {
      height: 14px;
      width: 14px;
    }
    .of-upcoming-name {
      font-size: 15px;
      font-weight: 700;
      letter-spacing: 0.8px;
      line-height: 1.1;
      color: var(--of-hud-text-2);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .of-upcoming-mode {
      flex: 1;
      min-width: 0;
      font-size: 11px;
      font-weight: 400;
      letter-spacing: 0.6px;
      color: rgba(255, 255, 255, 0.7);
      text-transform: none;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    /* Matched upcoming card: of-discovery-card-active supplies the beacon ring
       for parity with a live match; these refine the chip + name emphasis. */
    .of-upcoming-card-match {
      border-style: solid;
    }
    .of-upcoming-card-match .of-upcoming-chip {
      color: var(--of-hud-accent);
      border-color: var(--of-hud-accent-line);
      background: var(--of-hud-accent-soft);
    }
    .of-upcoming-card-match .of-upcoming-dot {
      background: var(--of-hud-accent);
    }
    .of-upcoming-card-match .of-upcoming-name {
      color: #fff;
    }

    ${getBoardStyles()}
  `;
  }

  // src/utils/SoundUtils.ts
  var SoundUtils = {
    gameFoundAudio: null,
    gameStartAudio: null,
    audioUnlocked: false,
    /**
     * Preload sound files and set up audio unlock
     * Call this early in application lifecycle
     */
    preloadSounds() {
      try {
        this.gameFoundAudio = new Audio(
          "https://github.com/DeLoWaN/openfront-game-notifier/raw/refs/heads/main/notification_sounds/new-notification-014-363678.mp3"
        );
        this.gameFoundAudio.volume = 0.5;
        this.gameFoundAudio.preload = "auto";
        this.gameStartAudio = new Audio(
          "https://github.com/DeLoWaN/openfront-game-notifier/raw/refs/heads/main/notification_sounds/opening-bell-421471.mp3"
        );
        this.gameStartAudio.volume = 0.5;
        this.gameStartAudio.preload = "auto";
        this.setupAudioUnlock();
      } catch (e) {
        console.warn("[SoundUtils] Could not preload audio:", e);
      }
    },
    /**
     * Set up audio unlock mechanism
     * Browsers require user interaction before playing audio
     */
    setupAudioUnlock() {
      const unlockAudio = () => {
        if (this.audioUnlocked)
          return;
        const unlockPromises = [];
        if (this.gameFoundAudio) {
          this.gameFoundAudio.volume = 0.01;
          unlockPromises.push(
            this.gameFoundAudio.play().then(() => {
              if (this.gameFoundAudio) {
                this.gameFoundAudio.pause();
                this.gameFoundAudio.currentTime = 0;
                this.gameFoundAudio.volume = 0.5;
              }
            }).catch(() => {
            })
          );
        }
        if (this.gameStartAudio) {
          this.gameStartAudio.volume = 0.01;
          unlockPromises.push(
            this.gameStartAudio.play().then(() => {
              if (this.gameStartAudio) {
                this.gameStartAudio.pause();
                this.gameStartAudio.currentTime = 0;
                this.gameStartAudio.volume = 0.5;
              }
            }).catch(() => {
            })
          );
        }
        Promise.all(unlockPromises).then(() => {
          this.audioUnlocked = true;
          console.log("[SoundUtils] Audio unlocked successfully");
          document.removeEventListener("click", unlockAudio);
          document.removeEventListener("keydown", unlockAudio);
          document.removeEventListener("touchstart", unlockAudio);
        });
      };
      document.addEventListener("click", unlockAudio, { once: true });
      document.addEventListener("keydown", unlockAudio, { once: true });
      document.addEventListener("touchstart", unlockAudio, { once: true });
    },
    /**
     * Play the "game found" notification sound
     */
    playGameFoundSound() {
      if (this.gameFoundAudio) {
        console.log("[SoundUtils] Attempting to play game found sound");
        this.gameFoundAudio.currentTime = 0;
        this.gameFoundAudio.play().catch((err) => {
          console.warn("[SoundUtils] Failed to play game found sound:", err);
        });
      } else {
        console.warn("[SoundUtils] Game found audio not initialized");
      }
    },
    /**
     * Play the "game start" notification sound
     */
    playGameStartSound() {
      if (this.gameStartAudio) {
        console.log("[SoundUtils] Attempting to play game start sound");
        this.gameStartAudio.currentTime = 0;
        this.gameStartAudio.play().catch((err) => {
          console.warn("[SoundUtils] Failed to play game start sound:", err);
        });
      } else {
        console.warn("[SoundUtils] Game start audio not initialized");
      }
    }
  };

  // src/utils/URLObserver.ts
  var URLObserver = {
    callbacks: [],
    lastUrl: location.href,
    initialized: false,
    /**
     * Initialize URL monitoring
     * Only runs once, subsequent calls are ignored
     */
    init() {
      if (this.initialized) {
        return;
      }
      this.initialized = true;
      const checkUrl = () => {
        if (location.href !== this.lastUrl) {
          this.lastUrl = location.href;
          this.notify();
        }
      };
      window.addEventListener("popstate", checkUrl);
      window.addEventListener("hashchange", checkUrl);
      const originalPushState = history.pushState;
      const originalReplaceState = history.replaceState;
      history.pushState = function(...args) {
        originalPushState.apply(history, args);
        setTimeout(checkUrl, 0);
      };
      history.replaceState = function(...args) {
        originalReplaceState.apply(history, args);
        setTimeout(checkUrl, 0);
      };
      setInterval(checkUrl, 200);
    },
    /**
     * Subscribe to URL change notifications
     * Automatically initializes observer if not already initialized
     */
    subscribe(callback) {
      this.callbacks.push(callback);
      this.init();
    },
    /**
     * Notify all subscribers of URL change
     */
    notify() {
      this.callbacks.forEach((cb) => cb(location.href));
    }
  };

  // src/data/LobbyDataManager.ts
  var QUEUE_ORDER = ["ffa", "team", "special", "hosted"];
  var LobbyDataManager = {
    subscribers: [],
    lastLobbies: [],
    lastServerTime: null,
    started: false,
    publicLobbiesListener: null,
    start() {
      if (this.started) {
        return;
      }
      this.started = true;
      this.publicLobbiesListener = (event) => this.handlePublicLobbiesUpdate(event);
      document.addEventListener("public-lobbies-update", this.publicLobbiesListener);
    },
    stop() {
      if (!this.started) {
        return;
      }
      this.started = false;
      if (this.publicLobbiesListener) {
        document.removeEventListener("public-lobbies-update", this.publicLobbiesListener);
        this.publicLobbiesListener = null;
      }
    },
    subscribe(callback) {
      this.subscribers.push(callback);
      if (this.lastLobbies.length > 0) {
        callback(this.lastLobbies, this.lastServerTime);
      }
    },
    notifySubscribers() {
      this.subscribers.forEach((cb) => cb(this.lastLobbies, this.lastServerTime));
    },
    handlePublicLobbiesUpdate(event) {
      const payload = event.detail?.payload;
      this.lastLobbies = this.extractLobbies(payload);
      this.lastServerTime = this.extractServerTime(payload);
      this.notifySubscribers();
    },
    extractServerTime(payload) {
      const serverTime = payload?.serverTime;
      return typeof serverTime === "number" && Number.isFinite(serverTime) ? serverTime : null;
    },
    extractLobbies(payload) {
      if (!payload || typeof payload !== "object") {
        return [];
      }
      if (Array.isArray(payload.lobbies)) {
        return payload.lobbies;
      }
      const games = payload.games;
      if (!games) {
        return [];
      }
      return QUEUE_ORDER.flatMap(
        (queue) => (games[queue] ?? []).map((lobby) => ({
          ...lobby,
          publicGameType: lobby.publicGameType ?? queue
        }))
      );
    }
  };

  // src/utils/LobbyUtils.ts
  var LobbyUtils = {
    lastActionTime: 0,
    debounceDelay: 800,
    /**
     * Get the lobby join/leave button from the DOM
     * v0.29.0: Query button inside public-lobby component
     */
    getLobbyButton() {
      const publicLobby = document.querySelector("public-lobby");
      return publicLobby?.querySelector("button.group.relative.isolate");
    },
    /**
     * Check if lobby can be joined right now
     * v0.29.0: Use component's internal state instead of CSS classes
     */
    canJoinLobby() {
      const publicLobby = document.querySelector("public-lobby");
      if (!publicLobby)
        return false;
      const btn = this.getLobbyButton();
      return !!(btn && !publicLobby.isLobbyHighlighted && publicLobby.lobbies && publicLobby.lobbies.length > 0 && !btn.disabled && btn.offsetParent !== null);
    },
    /**
     * Verify lobby state matches expected state
     * v0.29.0: Check component state instead of button classes
     *
     * @param expectedState - 'in' if expecting to be in lobby, 'out' if expecting to be out
     */
    verifyState(expectedState) {
      const publicLobby = document.querySelector("public-lobby");
      if (!publicLobby)
        return false;
      const btn = this.getLobbyButton();
      if (!btn || btn.disabled || btn.offsetParent === null) {
        return false;
      }
      if (expectedState === "in") {
        return publicLobby.isLobbyHighlighted === true;
      }
      if (expectedState === "out") {
        return !!(!publicLobby.isLobbyHighlighted && publicLobby.lobbies && publicLobby.lobbies.length > 0);
      }
      return false;
    },
    /**
     * Attempt to join the lobby with debouncing
     * Returns true if join was attempted, false if debounced or unable to join
     */
    tryJoinLobby() {
      const now = Date.now();
      if (now - this.lastActionTime < this.debounceDelay) {
        return false;
      }
      const btn = this.getLobbyButton();
      const publicLobby = document.querySelector("public-lobby");
      if (btn && publicLobby && !publicLobby.isLobbyHighlighted && publicLobby.lobbies && publicLobby.lobbies.length > 0 && !btn.disabled && btn.offsetParent !== null) {
        this.lastActionTime = now;
        btn.click();
        setTimeout(() => {
          if (!this.verifyState("in")) {
            console.warn("[LobbyUtils] Join may have failed, state not updated");
          }
        }, 100);
        return true;
      }
      return false;
    },
    /**
     * Determine if we're currently on the lobby page (vs in-game)
     * v0.29.0: Multiple checks to handle various page states
     */
    isOnLobbyPage() {
      if (document.body.classList.contains("in-game")) {
        return false;
      }
      const pageGame = document.getElementById("page-game");
      if (pageGame && !pageGame.classList.contains("hidden")) {
        return false;
      }
      const gameCanvas = document.querySelector("canvas");
      if (gameCanvas && gameCanvas.offsetParent !== null) {
        const rect = gameCanvas.getBoundingClientRect();
        if (rect.width > 100 && rect.height > 100) {
          return false;
        }
      }
      const publicLobby = document.querySelector("public-lobby");
      if (publicLobby && publicLobby.offsetParent !== null) {
        return true;
      }
      if (publicLobby && publicLobby.offsetParent === null) {
        return false;
      }
      const pagePlay = document.getElementById("page-play");
      if (pagePlay && !pagePlay.classList.contains("hidden")) {
        if (publicLobby) {
          return true;
        }
      }
      const currentPath = window.location.pathname.replace(/\/+$/, "") || "/";
      return currentPath === "/" || currentPath === "/public-lobby";
    }
  };

  // src/utils/BrowserNotificationUtils.ts
  var BrowserNotificationUtils = {
    isSupported() {
      return typeof Notification !== "undefined";
    },
    isBackgrounded() {
      const hidden = document.visibilityState === "hidden" || document.hidden;
      const focused = typeof document.hasFocus === "function" ? document.hasFocus() : true;
      return hidden || !focused;
    },
    async ensurePermission() {
      if (typeof Notification === "undefined") {
        return false;
      }
      if (Notification.permission === "granted") {
        return true;
      }
      if (Notification.permission === "denied") {
        return false;
      }
      try {
        return await Notification.requestPermission() === "granted";
      } catch (error) {
        console.warn("[BrowserNotificationUtils] Permission request failed:", error);
        return false;
      }
    },
    show(payload) {
      if (!this.isSupported() || !this.isBackgrounded()) {
        return false;
      }
      if (Notification.permission === "granted") {
        const notification = new Notification(payload.title, {
          body: payload.body
        });
        notification.onclick = () => {
          this.focusWindow();
          payload.onClick?.();
          notification.close();
        };
        return true;
      }
      return false;
    },
    focusWindow() {
      window.focus();
    }
  };

  // src/config/mapCatalogue.ts
  var MAP_CATEGORY_LABELS = {
    world: "World",
    continental: "Continental",
    europe: "Europe",
    asia: "Asia",
    north_america: "North America",
    africa: "Africa",
    south_america: "South America",
    oceania: "Oceania",
    antarctica: "Antarctica",
    countries: "Countries",
    cosmic: "Cosmic",
    fictional: "Fictional",
    arcade: "Arcade",
    tournament: "Tournament",
    other: "Other"
  };
  var MAP_CATEGORY_ORDER = [
    "world",
    "continental",
    "europe",
    "asia",
    "north_america",
    "africa",
    "south_america",
    "oceania",
    "antarctica",
    "countries",
    "cosmic",
    "fictional",
    "arcade",
    "tournament",
    "other"
  ];
  var MAP_CATALOGUE = [
    { gameMap: "Achiran", name: "Achiran", categories: ["europe", "fictional"] },
    { gameMap: "Aegean", name: "Aegean", categories: ["europe", "asia"] },
    { gameMap: "Africa", name: "Africa", categories: ["continental", "africa"] },
    { gameMap: "Alps", name: "Alps", categories: ["europe"] },
    { gameMap: "Amazon River", name: "Amazon River", categories: ["south_america"] },
    { gameMap: "Antarctica", name: "Antarctica", categories: ["continental", "antarctica"] },
    { gameMap: "ArchipelagoSea", name: "Archipelago Sea", categories: ["europe"] },
    { gameMap: "Arctic", name: "Arctic", categories: ["europe", "asia", "north_america"] },
    { gameMap: "Asia", name: "Asia", categories: ["continental", "asia"] },
    { gameMap: "Australia", name: "Australia", categories: ["oceania"] },
    { gameMap: "Bab el-Mandeb Strait", name: "Bab el-Mandeb Strait", categories: ["asia", "africa"] },
    { gameMap: "Baikal", name: "Baikal", categories: ["asia"] },
    { gameMap: "Baikal Nuke Wars", name: "Baikal (Nuke Wars)", categories: ["fictional"] },
    { gameMap: "Baja California", name: "Baja California", categories: ["north_america"] },
    { gameMap: "Balkans", name: "Balkans", categories: ["europe"] },
    { gameMap: "Balkhash", name: "Balkhash", categories: ["asia"] },
    { gameMap: "Baltics", name: "Baltics", categories: ["europe"] },
    { gameMap: "Benelux", name: "Benelux", categories: ["europe", "countries"] },
    { gameMap: "Bering Sea", name: "Bering Sea", categories: ["asia", "north_america"] },
    { gameMap: "Bering Strait", name: "Bering Strait", categories: ["asia", "north_america"] },
    { gameMap: "Between Two Seas", name: "Between Two Seas", categories: ["europe", "asia"] },
    { gameMap: "Black Sea", name: "Black Sea", categories: ["europe", "asia"] },
    { gameMap: "Bosphorus Straits", name: "Bosphorus Straits", categories: ["europe", "asia"] },
    { gameMap: "Brain Rot", name: "Brain Rot", categories: ["arcade"] },
    { gameMap: "Branching Paths", name: "Branching Paths", categories: ["arcade"] },
    { gameMap: "Britannia", name: "Britannia", categories: ["europe"] },
    { gameMap: "Britannia Classic", name: "Britannia (Classic)", categories: ["europe"] },
    { gameMap: "Canary Islands", name: "Canary Islands", categories: ["africa"] },
    { gameMap: "Cape Cod", name: "Cape Cod", categories: ["north_america"] },
    { gameMap: "Cape Of Good Hope", name: "Cape Of Good Hope", categories: ["africa"] },
    { gameMap: "Caribbean", name: "Caribbean", categories: ["north_america"] },
    { gameMap: "Caspian Sea", name: "Caspian Sea", categories: ["asia"] },
    { gameMap: "Caucasus", name: "Caucasus", categories: ["europe", "asia"] },
    { gameMap: "Central America", name: "Central America", categories: ["north_america"] },
    { gameMap: "Channel Islands", name: "Channel Islands", categories: ["north_america"] },
    { gameMap: "China", name: "China", categories: ["asia", "countries"] },
    { gameMap: "Chopping Block", name: "Chopping Block", categories: ["arcade"] },
    { gameMap: "Clearwater Lakes", name: "Clearwater Lakes", categories: ["north_america"] },
    { gameMap: "Conakry", name: "Conakry", categories: ["africa"] },
    { gameMap: "Crimea", name: "Crimea", categories: ["europe"] },
    { gameMap: "Danish Straits", name: "Danish Straits", categories: ["europe"] },
    { gameMap: "Deglaciated Antarctica", name: "Deglaciated Antarctica", categories: ["antarctica", "fictional"] },
    { gameMap: "Didier", name: "Didier", categories: ["arcade"] },
    { gameMap: "Didier France", name: "Didier (France)", categories: ["arcade"] },
    { gameMap: "Dyslexdria", name: "Dyslexdria", categories: ["world", "fictional"] },
    { gameMap: "East Asia", name: "East Asia", categories: ["asia"] },
    { gameMap: "Europe", name: "Europe", categories: ["continental", "europe"] },
    { gameMap: "Europe Classic", name: "Europe (Classic)", categories: ["continental", "europe"] },
    { gameMap: "Falkland Islands", name: "Falkland Islands", categories: ["south_america"] },
    { gameMap: "Faroe Islands", name: "Faroe Islands", categories: ["europe"] },
    { gameMap: "Finger Lakes", name: "Finger Lakes", categories: ["north_america"] },
    { gameMap: "Four Islands", name: "Four Islands", categories: ["fictional"] },
    { gameMap: "France", name: "France", categories: ["europe", "countries"] },
    { gameMap: "Gateway to the Atlantic", name: "Gateway to the Atlantic", categories: ["europe"] },
    { gameMap: "Germany", name: "Germany", categories: ["europe", "countries"] },
    { gameMap: "Giant World Map", name: "Giant World Map", categories: ["world"] },
    { gameMap: "Great Lakes", name: "Great Lakes", categories: ["north_america"] },
    { gameMap: "Gulf Of Guinea", name: "Gulf Of Guinea", categories: ["africa"] },
    { gameMap: "Gulf Of Mexico", name: "Gulf Of Mexico", categories: ["north_america"] },
    { gameMap: "Gulf of St. Lawrence", name: "Gulf of St. Lawrence", categories: ["north_america"] },
    { gameMap: "Halkidiki", name: "Halkidiki", categories: ["europe"] },
    { gameMap: "Hawaii", name: "Hawaii", categories: ["oceania"] },
    { gameMap: "Hecate Strait", name: "Hecate Strait", categories: ["north_america"] },
    { gameMap: "Hong Kong", name: "Hong Kong", categories: ["asia"] },
    { gameMap: "Horn Of Africa", name: "Horn Of Africa", categories: ["africa"] },
    { gameMap: "Iceland", name: "Iceland", categories: ["europe"] },
    { gameMap: "Indian Subcontinent", name: "Indian Subcontinent", categories: ["asia"] },
    { gameMap: "Irish Sea", name: "Irish Sea", categories: ["europe"] },
    { gameMap: "Italia", name: "Italia", categories: ["europe"] },
    { gameMap: "Japan", name: "Japan", categories: ["asia", "countries"] },
    { gameMap: "Juan De Fuca Strait", name: "Juan De Fuca Strait", categories: ["north_america"] },
    { gameMap: "Korea", name: "Korea", categories: ["asia", "countries"] },
    { gameMap: "Labyrinth", name: "Labyrinth", categories: ["arcade"] },
    { gameMap: "Las Vegas Strip", name: "Las Vegas Strip", categories: ["north_america"] },
    { gameMap: "Lemnos", name: "Lemnos", categories: ["europe"] },
    { gameMap: "Levant", name: "Levant", categories: ["asia"] },
    { gameMap: "Lisbon", name: "Lisbon", categories: ["europe"] },
    { gameMap: "Los Angeles", name: "Los Angeles", categories: ["north_america"] },
    { gameMap: "Luna", name: "Luna", categories: ["cosmic"] },
    { gameMap: "Madagascar", name: "Madagascar", categories: ["africa"] },
    { gameMap: "Manicouagan", name: "Manicouagan", categories: ["north_america"] },
    { gameMap: "Mare Nostrum", name: "Mare Nostrum", categories: ["europe", "asia", "africa"] },
    { gameMap: "Mars", name: "Mars", categories: ["cosmic"] },
    { gameMap: "Mena", name: "MENA", categories: ["asia", "africa"] },
    { gameMap: "Middle East", name: "Middle East", categories: ["asia"] },
    { gameMap: "MilkyWay", name: "Milky Way", categories: ["cosmic"] },
    { gameMap: "Mississippi River", name: "Mississippi River", categories: ["north_america"] },
    { gameMap: "Montreal", name: "Montreal", categories: ["north_america"] },
    { gameMap: "More Than Luck", name: "More Than Luck", categories: ["arcade"] },
    { gameMap: "New York City", name: "New York City", categories: ["north_america"] },
    { gameMap: "New Zealand", name: "New Zealand", categories: ["oceania"] },
    { gameMap: "Nile Delta", name: "Nile Delta", categories: ["africa"] },
    { gameMap: "North America", name: "North America", categories: ["continental", "north_america"] },
    { gameMap: "Northwest Passage", name: "Northwest Passage", categories: ["north_america"] },
    { gameMap: "Oceania", name: "Oceania", categories: ["continental", "oceania"] },
    { gameMap: "Ommatrypta", name: "Ommatrypta", categories: ["arcade"] },
    { gameMap: "Onion", name: "Onion", categories: ["arcade"] },
    { gameMap: "Pangaea", name: "Pangaea", categories: ["fictional"] },
    { gameMap: "Passage", name: "Passage", categories: ["fictional"] },
    { gameMap: "Pluto", name: "Pluto", categories: ["cosmic"] },
    { gameMap: "Pulicat Lake", name: "Pulicat Lake", categories: ["asia"] },
    { gameMap: "Qing China", name: "Qing China", categories: ["asia", "countries"] },
    { gameMap: "Rio de Janeiro", name: "Rio de Janeiro", categories: ["south_america"] },
    { gameMap: "Russia", name: "Russia", categories: ["europe", "asia", "countries"] },
    { gameMap: "San Francisco", name: "San Francisco", categories: ["north_america"] },
    { gameMap: "Scandinavia", name: "Scandinavia", categories: ["europe"] },
    { gameMap: "Sierpinski", name: "Sierpinski", categories: ["arcade"] },
    { gameMap: "Sol", name: "Sol", categories: ["cosmic"] },
    { gameMap: "South America", name: "South America", categories: ["continental", "south_america"] },
    { gameMap: "SoutheastAsia", name: "Southeast Asia", categories: ["asia"] },
    { gameMap: "Strait of Gibraltar", name: "Strait of Gibraltar", categories: ["europe", "africa"] },
    { gameMap: "Strait of Hormuz", name: "Strait of Hormuz", categories: ["asia"] },
    { gameMap: "Strait Of Malacca", name: "Strait Of Malacca", categories: ["asia"] },
    { gameMap: "Surrounded", name: "Surrounded", categories: ["fictional"] },
    { gameMap: "Svalmel", name: "Svalmel", categories: ["europe", "north_america", "fictional"] },
    { gameMap: "Taiwan Strait", name: "Taiwan Strait", categories: ["asia"] },
    { gameMap: "The Box", name: "The Box", categories: ["arcade"] },
    { gameMap: "Tierra Del Fuego", name: "Tierra Del Fuego", categories: ["south_america"] },
    { gameMap: "Titan", name: "Titan", categories: ["cosmic"] },
    { gameMap: "Tourney 2 Teams", name: "Tourney 2 Teams", categories: ["tournament"] },
    { gameMap: "Tourney 3 Teams", name: "Tourney 3 Teams", categories: ["tournament"] },
    { gameMap: "Tourney 4 Teams", name: "Tourney 4 Teams", categories: ["tournament"] },
    { gameMap: "Tourney 8 Teams", name: "Tourney 8 Teams", categories: ["tournament"] },
    { gameMap: "Traders Dream", name: "Traders Dream", categories: ["fictional"] },
    { gameMap: "Two Lakes", name: "Two Lakes", categories: ["europe"] },
    { gameMap: "United States", name: "United States", categories: ["north_america", "countries"] },
    { gameMap: "Vancouver Island", name: "Vancouver Island", categories: ["north_america"] },
    { gameMap: "Venice", name: "Venice", categories: ["europe"] },
    { gameMap: "Vietnam", name: "Vietnam", categories: ["asia", "countries"] },
    { gameMap: "Warship Warship", name: "Warship Warship", categories: ["arcade"] },
    { gameMap: "World", name: "World", categories: ["world"] },
    { gameMap: "World Inverted", name: "World Inverted", categories: ["world", "fictional"] },
    { gameMap: "Yangtze River", name: "Yangtze River", categories: ["asia"] },
    { gameMap: "Yellow Sea", name: "Yellow Sea", categories: ["asia"] },
    { gameMap: "Yenisei", name: "Yenisei", categories: ["asia"] }
  ];

  // src/modules/lobby-discovery/LobbyDiscoveryHelpers.ts
  var DEFAULT_MODIFIER_FILTER_STATE = "any";
  function normalizeGameMode(mode) {
    if (!mode)
      return null;
    const lower = mode.toLowerCase().trim();
    if (lower === "free for all" || lower === "ffa" || lower === "free-for-all") {
      return "FFA";
    }
    if (lower === "team" || lower === "teams") {
      return "Team";
    }
    return null;
  }
  var MAP_NAMES = new Map(MAP_CATALOGUE.map((entry) => [entry.gameMap, entry.name]));
  function getMapDisplayName(gameMap) {
    return MAP_NAMES.get(gameMap) ?? gameMap;
  }
  function getLobbyGameMode(lobby) {
    return normalizeGameMode(lobby.gameConfig?.gameMode);
  }
  function getLobbyQueueSource(lobby) {
    const source = lobby.publicGameType?.toLowerCase().trim();
    if (source === "ffa" || source === "team" || source === "special" || source === "hosted") {
      return source;
    }
    return null;
  }
  function parseTeamCount(value) {
    if (value === "Duos" || value === "Trios" || value === "Quads" || value === "Humans Vs Nations" || value === "8+") {
      return value;
    }
    if (typeof value === "number" && Number.isFinite(value) && value > 0) {
      return value;
    }
    if (typeof value === "string") {
      const parsed = parseInt(value, 10);
      if (!Number.isNaN(parsed) && parsed > 0) {
        return parsed;
      }
    }
    return null;
  }
  function getLobbyTeamConfig(lobby) {
    const config = lobby.gameConfig;
    if (!config || getLobbyGameMode(lobby) !== "Team")
      return null;
    const playerTeams = parseTeamCount(config.playerTeams ?? null);
    if (playerTeams !== null) {
      return playerTeams;
    }
    return parseTeamCount(config.teamCount ?? config.teams ?? null);
  }
  function getLobbyCapacity(lobby) {
    const config = lobby.gameConfig;
    if (!config)
      return null;
    return config.maxPlayers ?? config.maxClients ?? config.maxPlayersPerGame ?? lobby.maxClients ?? null;
  }
  function getPlayersPerTeam(playerTeams, gameCapacity) {
    if (!playerTeams || !gameCapacity)
      return null;
    if (playerTeams === "Duos")
      return 2;
    if (playerTeams === "Trios")
      return 3;
    if (playerTeams === "Quads")
      return 4;
    if (playerTeams === "Humans Vs Nations")
      return gameCapacity;
    if (typeof playerTeams === "number" && playerTeams > 0) {
      return Math.floor(gameCapacity / playerTeams);
    }
    return null;
  }
  function isHostConfiguredLobby(lobby) {
    return getLobbyQueueSource(lobby) === "hosted" || lobby.custom === true;
  }
  var NUKE_UNIT_TYPES = ["Atom Bomb", "Hydrogen Bomb", "MIRV"];
  function getHostConfiguredModifierValue(lobby, key) {
    const config = lobby.gameConfig;
    const disabledUnits = config?.disabledUnits ?? [];
    switch (key) {
      case "isCompact":
        return config?.gameMapSize === "Compact";
      case "isRandomSpawn":
        return config?.randomSpawn === true;
      case "isAlliancesDisabled":
        return config?.disableAlliances === true;
      case "isNukesDisabled":
        return NUKE_UNIT_TYPES.every((unit) => disabledUnits.includes(unit));
      case "isSAMsDisabled":
        return disabledUnits.includes("SAM Launcher");
      case "isWaterNukes":
        return config?.waterNukes === true;
      case "isDoomsdayClock":
        return config?.doomsdayClock !== void 0 && config.doomsdayClock.enabled !== false;
      case "isTrusted":
        return config?.trusted;
      case "startingGold":
        return config?.startingGold ?? void 0;
      case "goldMultiplier":
        return config?.goldMultiplier ?? void 0;
      default:
        return void 0;
    }
  }
  function getLobbyModifierValue(lobby, key) {
    if (isHostConfiguredLobby(lobby)) {
      return getHostConfiguredModifierValue(lobby, key);
    }
    const modifiers = lobby.gameConfig?.publicGameModifiers;
    switch (key) {
      case "isCompact":
        return modifiers?.isCompact;
      case "isRandomSpawn":
        return modifiers?.isRandomSpawn;
      case "isCrowded":
        return modifiers?.isCrowded;
      case "isHardNations":
        return modifiers?.isHardNations;
      case "isAlliancesDisabled":
        return modifiers?.isAlliancesDisabled;
      case "isNukesDisabled":
        return modifiers?.isNukesDisabled;
      case "isSAMsDisabled":
        return modifiers?.isSAMsDisabled;
      case "isPeaceTime":
        return modifiers?.isPeaceTime;
      case "isWaterNukes":
        return modifiers?.isWaterNukes;
      case "isDoomsdayClock":
        return modifiers?.isDoomsdayClock;
      case "isTrusted":
        return lobby.gameConfig?.trusted;
      case "startingGold":
        return modifiers?.startingGold ?? lobby.gameConfig?.startingGold ?? void 0;
      case "goldMultiplier":
        return modifiers?.goldMultiplier ?? lobby.gameConfig?.goldMultiplier ?? void 0;
      default:
        return void 0;
    }
  }
  function getGameDetailsText(lobby) {
    const gameMode = getLobbyGameMode(lobby);
    const teamConfig = getLobbyTeamConfig(lobby);
    const capacity = getLobbyCapacity(lobby);
    if (gameMode === "FFA") {
      return capacity !== null ? `FFA \u2022 ${capacity} slots` : "FFA";
    }
    if (gameMode !== "Team") {
      return "Unsupported mode";
    }
    if (teamConfig === "Humans Vs Nations") {
      return capacity !== null ? `Humans Vs Nations (${capacity})` : "Humans Vs Nations";
    }
    if (teamConfig === "Duos")
      return "Duos";
    if (teamConfig === "Trios")
      return "Trios";
    if (teamConfig === "Quads")
      return "Quads";
    if (typeof teamConfig === "number" && capacity !== null) {
      const playersPerTeam = getPlayersPerTeam(teamConfig, capacity);
      return playersPerTeam !== null ? `${teamConfig} teams (${playersPerTeam} per team)` : `${teamConfig} teams`;
    }
    return "Team";
  }
  function getLobbyModeLabel(lobby) {
    const gameMode = getLobbyGameMode(lobby);
    const teamConfig = getLobbyTeamConfig(lobby);
    if (gameMode === "FFA") {
      return "FFA";
    }
    if (gameMode !== "Team") {
      return "Unsupported mode";
    }
    if (teamConfig === "Humans Vs Nations") {
      return "Humans Vs Nations";
    }
    if (teamConfig === "Duos" || teamConfig === "Trios" || teamConfig === "Quads") {
      return teamConfig;
    }
    if (typeof teamConfig === "number") {
      return `${teamConfig} teams`;
    }
    return "Team";
  }
  function formatStartingGold(value) {
    if (value >= 1e6 && value % 1e6 === 0) {
      return `${value / 1e6}M`;
    }
    if (value >= 1e3 && value % 1e3 === 0) {
      return `${value / 1e3}K`;
    }
    return String(value);
  }
  function getActiveModifierLabels(lobby) {
    const has = (key) => Boolean(getLobbyModifierValue(lobby, key));
    const labels = [];
    if (has("isCompact"))
      labels.push("Compact");
    if (has("isRandomSpawn"))
      labels.push("Random");
    if (has("isCrowded"))
      labels.push("Crowded");
    if (has("isHardNations"))
      labels.push("Hard");
    const startingGold = getLobbyModifierValue(lobby, "startingGold");
    if (typeof startingGold === "number") {
      labels.push(formatStartingGold(startingGold));
    }
    const goldMultiplier = getLobbyModifierValue(lobby, "goldMultiplier");
    if (typeof goldMultiplier === "number") {
      labels.push(`x${goldMultiplier}`);
    }
    if (has("isAlliancesDisabled"))
      labels.push("No Alliances");
    if (has("isNukesDisabled"))
      labels.push("No Nukes");
    if (has("isSAMsDisabled"))
      labels.push("No SAMs");
    if (has("isPeaceTime"))
      labels.push("Peace");
    if (has("isWaterNukes"))
      labels.push("Water Nukes");
    if (has("isDoomsdayClock"))
      labels.push("Doomsday");
    if (has("isTrusted"))
      labels.push("Trusted");
    return labels;
  }
  function getBrowserNotificationContent(lobby) {
    const titleParts = [];
    const mapName = lobby.gameConfig?.gameMap?.trim();
    const capacity = getLobbyCapacity(lobby);
    const teamConfig = getLobbyTeamConfig(lobby);
    const modeLabel = getLobbyModeLabel(lobby);
    if (mapName) {
      titleParts.push(getMapDisplayName(mapName));
    }
    if (getLobbyGameMode(lobby) === "Team" && teamConfig !== "Humans Vs Nations") {
      titleParts.push(modeLabel);
      const playersPerTeam = getPlayersPerTeam(teamConfig, capacity);
      if (playersPerTeam !== null) {
        titleParts.push(`${playersPerTeam}/team`);
      }
    } else {
      titleParts.push(modeLabel);
    }
    const queue = getLobbyQueueSource(lobby);
    if (queue === "hosted") {
      titleParts.push("Hosted");
    } else if (lobby.custom === true) {
      titleParts.push("Custom");
    } else if (queue === "special") {
      titleParts.push("Special");
    }
    const bodyParts = [];
    if (capacity !== null) {
      bodyParts.push(`${capacity} slots`);
    }
    const activeModifiers = getActiveModifierLabels(lobby);
    if (activeModifiers.length > 0) {
      bodyParts.push(activeModifiers.join(", "));
    }
    return {
      title: titleParts.join(" \u2022 "),
      body: bodyParts.join(" \u2022 ")
    };
  }
  function sanitizeNumber(value) {
    return typeof value === "number" && Number.isFinite(value) ? value : null;
  }
  function sanitizeModifierFilterState(value) {
    if (value === "blocked" || value === "rejected") {
      return "blocked";
    }
    if (value === "required") {
      return "required";
    }
    if (value === "any" || value === "allowed" || value === "indifferent") {
      return "any";
    }
    return DEFAULT_MODIFIER_FILTER_STATE;
  }
  function sanitizeNumericModifierState(value) {
    if (!value || typeof value !== "object") {
      return void 0;
    }
    const sanitized = {};
    for (const [key, triState] of Object.entries(value)) {
      const numericKey = Number(key);
      if (Number.isFinite(numericKey)) {
        sanitized[numericKey] = sanitizeModifierFilterState(triState);
      }
    }
    return Object.keys(sanitized).length > 0 ? sanitized : void 0;
  }
  function sanitizeModifierFilters(value) {
    if (!value || typeof value !== "object") {
      return void 0;
    }
    const candidate = value;
    const sanitized = {
      isCompact: sanitizeModifierFilterState(candidate.isCompact),
      isRandomSpawn: sanitizeModifierFilterState(candidate.isRandomSpawn),
      isCrowded: sanitizeModifierFilterState(candidate.isCrowded),
      isHardNations: sanitizeModifierFilterState(candidate.isHardNations),
      isAlliancesDisabled: sanitizeModifierFilterState(candidate.isAlliancesDisabled),
      isNukesDisabled: sanitizeModifierFilterState(candidate.isNukesDisabled),
      isSAMsDisabled: sanitizeModifierFilterState(candidate.isSAMsDisabled),
      isPeaceTime: sanitizeModifierFilterState(candidate.isPeaceTime),
      isWaterNukes: sanitizeModifierFilterState(candidate.isWaterNukes),
      isDoomsdayClock: sanitizeModifierFilterState(candidate.isDoomsdayClock),
      isTrusted: sanitizeModifierFilterState(candidate.isTrusted),
      startingGold: sanitizeNumericModifierState(candidate.startingGold),
      goldMultiplier: sanitizeNumericModifierState(candidate.goldMultiplier)
    };
    return sanitized;
  }
  function sanitizeCriteriaTeamCount(value) {
    const parsed = parseTeamCount(value);
    if (parsed === "Duos" || parsed === "Trios" || parsed === "Quads") {
      return null;
    }
    return parsed;
  }
  function sanitizeCriteria(criteria) {
    if (!Array.isArray(criteria)) {
      return [];
    }
    const sanitized = [];
    for (const entry of criteria) {
      const candidate = entry;
      const gameMode = normalizeGameMode(candidate.gameMode ?? null);
      if (!gameMode) {
        continue;
      }
      let minPlayers = sanitizeNumber(candidate.minPlayers);
      let maxPlayers = sanitizeNumber(candidate.maxPlayers);
      if (gameMode === "Team") {
        if (typeof minPlayers === "number" && minPlayers < TEAM_MIN_PLAYERS_PER_TEAM) {
          minPlayers = TEAM_MIN_PLAYERS_PER_TEAM;
        }
        if (typeof minPlayers === "number" && typeof maxPlayers === "number" && maxPlayers < minPlayers) {
          maxPlayers = minPlayers;
        }
      }
      sanitized.push({
        gameMode,
        teamCount: gameMode === "Team" ? sanitizeCriteriaTeamCount(candidate.teamCount ?? null) : null,
        minPlayers,
        maxPlayers,
        modifiers: sanitizeModifierFilters(candidate.modifiers)
      });
    }
    return sanitized;
  }
  function formatElapsedSince(timestampMs, now = Date.now()) {
    const elapsed = Math.max(0, Math.floor((now - timestampMs) / 1e3));
    return `${Math.floor(elapsed / 60)}m ${elapsed % 60}s`;
  }
  function getLobbyModeText(lobby) {
    const gameMode = getLobbyGameMode(lobby);
    if (gameMode === "FFA")
      return "Free For All";
    if (gameMode !== "Team")
      return "Unsupported mode";
    const teamConfig = getLobbyTeamConfig(lobby);
    const capacity = getLobbyCapacity(lobby);
    if (teamConfig === "Humans Vs Nations") {
      return capacity !== null ? `${capacity} Humans vs ${capacity} Nations` : "Humans vs Nations";
    }
    let playersPerTeam = null;
    if (teamConfig === "Duos")
      playersPerTeam = 2;
    else if (teamConfig === "Trios")
      playersPerTeam = 3;
    else if (teamConfig === "Quads")
      playersPerTeam = 4;
    let teamCount = null;
    if (playersPerTeam !== null) {
      teamCount = capacity !== null ? Math.floor(capacity / playersPerTeam) : null;
    } else if (typeof teamConfig === "number") {
      teamCount = teamConfig;
      playersPerTeam = capacity !== null && teamConfig > 0 ? Math.floor(capacity / teamConfig) : null;
    }
    if (teamCount === null)
      return "Teams";
    return playersPerTeam !== null ? `${teamCount} teams of ${playersPerTeam}` : `${teamCount} teams`;
  }
  function getLobbyMapThumbnailUrl(lobby, assetManifest, cdnBase) {
    const mapName = lobby.gameConfig?.gameMap?.trim();
    if (!mapName)
      return null;
    const normalizedMap = mapName.toLowerCase().replace(/[\s.()]+/g, "");
    if (!normalizedMap)
      return null;
    const path = `maps/${encodeURIComponent(normalizedMap)}/thumbnail.webp`;
    const directUrl = assetManifest?.[`maps/${normalizedMap}/thumbnail.webp`];
    if (directUrl) {
      const base = (cdnBase ?? "").replace(/\/+$/, "");
      return base ? `${base}${directUrl}` : directUrl;
    }
    return `/${path}`;
  }
  function buildUpcomingCardModel(lobby, assetManifest, cdnBase) {
    const capacity = getLobbyCapacity(lobby);
    return {
      gameID: lobby.gameID,
      mapName: getMapDisplayName(lobby.gameConfig?.gameMap?.trim() || "Unknown map"),
      modeText: getLobbyModeText(lobby),
      capacityLabel: capacity !== null ? `${capacity} slots` : "",
      modifierLabels: getActiveModifierLabels(lobby),
      thumbnailUrl: getLobbyMapThumbnailUrl(lobby, assetManifest, cdnBase)
    };
  }
  function sanitizeMapFilter(value) {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return {};
    }
    const sanitized = {};
    for (const [gameMap, state] of Object.entries(value)) {
      if (gameMap && (state === "required" || state === "blocked")) {
        sanitized[gameMap] = state;
      }
    }
    return sanitized;
  }
  function normalizeSettings(current) {
    return {
      criteria: sanitizeCriteria(current?.criteria),
      discoveryEnabled: typeof current?.discoveryEnabled === "boolean" ? current.discoveryEnabled : true,
      soundEnabled: typeof current?.soundEnabled === "boolean" ? current.soundEnabled : true,
      desktopNotificationsEnabled: typeof current?.desktopNotificationsEnabled === "boolean" ? current.desktopNotificationsEnabled : false,
      isTeamTwoTimesMinEnabled: typeof current?.isTeamTwoTimesMinEnabled === "boolean" ? current.isTeamTwoTimesMinEnabled : !!current?.isTeamThreeTimesMinEnabled,
      notifyUpcomingEnabled: typeof current?.notifyUpcomingEnabled === "boolean" ? current.notifyUpcomingEnabled : true,
      includeHostedAndCustomLobbies: typeof current?.includeHostedAndCustomLobbies === "boolean" ? current.includeHostedAndCustomLobbies : true,
      mapFilter: sanitizeMapFilter(current?.mapFilter)
    };
  }

  // src/modules/lobby-discovery/LobbyDiscoveryEngine.ts
  var BOOLEAN_MODIFIER_KEYS = [
    "isCompact",
    "isRandomSpawn",
    "isCrowded",
    "isHardNations",
    "isAlliancesDisabled",
    "isNukesDisabled",
    "isSAMsDisabled",
    "isPeaceTime",
    "isWaterNukes",
    "isDoomsdayClock",
    "isTrusted"
  ];
  var LobbyDiscoveryEngine = class {
    matchesCriteria(lobby, criteriaList, mapFilter = {}) {
      if (!lobby || !lobby.gameConfig || !criteriaList || criteriaList.length === 0) {
        return false;
      }
      if (!this.matchesMapFilter(lobby.gameConfig.gameMap, mapFilter)) {
        return false;
      }
      const gameMode = getLobbyGameMode(lobby);
      const lobbyCapacity = getLobbyCapacity(lobby);
      if (!gameMode || lobbyCapacity === null) {
        return false;
      }
      const lobbyTeamConfig = getLobbyTeamConfig(lobby);
      const teamComparisonCapacity = gameMode === "Team" ? getPlayersPerTeam(lobbyTeamConfig, lobbyCapacity) : null;
      const lobbyNumTeams = this.resolveLobbyTeamCount(
        lobbyTeamConfig,
        teamComparisonCapacity,
        lobbyCapacity
      );
      for (const criteria of criteriaList) {
        if (criteria.gameMode !== gameMode) {
          continue;
        }
        if (gameMode === "Team") {
          const hasFormat = criteria.teamCount !== null && criteria.teamCount !== void 0;
          if (!hasFormat && lobbyTeamConfig === "Humans Vs Nations") {
            continue;
          }
          if (hasFormat) {
            if (criteria.teamCount === "8+") {
              if (lobbyNumTeams === null || lobbyNumTeams < 8) {
                continue;
              }
            } else if (criteria.teamCount === "Humans Vs Nations" || criteria.teamCount === "Duos" || criteria.teamCount === "Trios" || criteria.teamCount === "Quads") {
              if (criteria.teamCount !== lobbyTeamConfig) {
                continue;
              }
            } else if (lobbyNumTeams === null || criteria.teamCount !== lobbyNumTeams) {
              continue;
            }
          }
          if (teamComparisonCapacity === null) {
            continue;
          }
        }
        const capacityToCompare = gameMode === "Team" ? teamComparisonCapacity : lobbyCapacity;
        if (capacityToCompare === null) {
          continue;
        }
        if (lobbyTeamConfig !== "Humans Vs Nations") {
          if (criteria.minPlayers !== null && capacityToCompare < criteria.minPlayers) {
            continue;
          }
          if (criteria.maxPlayers !== null && capacityToCompare > criteria.maxPlayers) {
            continue;
          }
        }
        if (!this.matchesModifiers(lobby, criteria.modifiers)) {
          continue;
        }
        return true;
      }
      return false;
    }
    /**
     * Resolve a lobby's effective number of teams from its team config.
     * - numeric config: the team count itself
     * - named players-per-team format ('Duos'/'Trios'/'Quads'): derived as
     *   floor(capacity / playersPerTeam)
     * - 'Humans Vs Nations' or missing/zero capacity: null (no numeric team count)
     */
    resolveLobbyTeamCount(lobbyTeamConfig, playersPerTeam, lobbyCapacity) {
      if (typeof lobbyTeamConfig === "number") {
        return lobbyTeamConfig;
      }
      if (lobbyTeamConfig === "Humans Vs Nations") {
        return null;
      }
      if (playersPerTeam !== null && playersPerTeam > 0 && lobbyCapacity !== null) {
        return Math.floor(lobbyCapacity / playersPerTeam);
      }
      return null;
    }
    matchesMapFilter(gameMap, mapFilter) {
      if (gameMap !== void 0 && mapFilter[gameMap] === "blocked") {
        return false;
      }
      const hasRequiredMap = Object.values(mapFilter).some((state) => state === "required");
      if (hasRequiredMap) {
        return gameMap !== void 0 && mapFilter[gameMap] === "required";
      }
      return true;
    }
    matchesModifiers(lobby, filters) {
      if (!filters) {
        return true;
      }
      for (const key of BOOLEAN_MODIFIER_KEYS) {
        const state = filters[key];
        if (!state || state === "any") {
          continue;
        }
        const actual = Boolean(getLobbyModifierValue(lobby, key));
        if (state === "blocked" && actual) {
          return false;
        }
        if (state === "required" && !actual) {
          return false;
        }
      }
      if (!this.matchesNumericModifier(getLobbyModifierValue(lobby, "startingGold"), filters.startingGold)) {
        return false;
      }
      if (!this.matchesNumericModifier(getLobbyModifierValue(lobby, "goldMultiplier"), filters.goldMultiplier)) {
        return false;
      }
      return true;
    }
    matchesNumericModifier(actualValue, states) {
      if (!states) {
        return true;
      }
      const numericActual = typeof actualValue === "number" && Number.isFinite(actualValue) ? actualValue : null;
      const entries = Object.entries(states);
      if (entries.length === 0) {
        return true;
      }
      const blockedValues = entries.filter(([, state]) => state === "blocked").map(([value]) => Number(value));
      if (numericActual !== null && blockedValues.includes(numericActual)) {
        return false;
      }
      const requiredValues = entries.filter(([, state]) => state === "required").map(([value]) => Number(value));
      if (requiredValues.length > 0) {
        if (numericActual === null) {
          return false;
        }
        if (!requiredValues.includes(numericActual)) {
          return false;
        }
      }
      return true;
    }
  };

  // src/modules/lobby-discovery/RangeSliderHelpers.ts
  function clampToStops(value, stops) {
    if (stops.length === 0)
      return value;
    const lo = stops[0];
    const hi = stops[stops.length - 1];
    if (value < lo)
      return lo;
    if (value > hi)
      return hi;
    return value;
  }
  function valueToPosition(value, stops) {
    if (stops.length < 2)
      return 0;
    const clamped = clampToStops(value, stops);
    const lastIdx = stops.length - 1;
    if (clamped >= stops[lastIdx])
      return 1;
    if (clamped <= stops[0])
      return 0;
    for (let i = 0; i < lastIdx; i++) {
      const lo = stops[i];
      const hi = stops[i + 1];
      if (clamped >= lo && clamped <= hi) {
        const segFrac = (clamped - lo) / (hi - lo);
        return (i + segFrac) / lastIdx;
      }
    }
    return 1;
  }
  function positionToValue(position, stops) {
    if (stops.length < 2)
      return stops[0] ?? 0;
    const lastIdx = stops.length - 1;
    if (position <= 0)
      return stops[0];
    if (position >= 1)
      return stops[lastIdx];
    const t = position * lastIdx;
    const i = Math.floor(t);
    const frac = t - i;
    const raw = stops[i] + frac * (stops[i + 1] - stops[i]);
    return Math.round(raw);
  }

  // src/modules/lobby-discovery/RangeSlider.ts
  var POSITION_RANGE = 1e3;
  var RangeSlider = class {
    constructor(cfg) {
      this.onMinSliderInput = () => {
        const position = parseInt(this.minSlider.value, 10) / POSITION_RANGE;
        const value = positionToValue(position, this.stops);
        this.applyValues(value, this.lastMax, { fireOnChange: true, changed: "min" });
      };
      this.onMaxSliderInput = () => {
        const position = parseInt(this.maxSlider.value, 10) / POSITION_RANGE;
        const value = positionToValue(position, this.stops);
        this.applyValues(this.lastMin, value, { fireOnChange: true, changed: "max" });
      };
      this.onMinInputChange = () => {
        const parsed = parseInt(this.minInput.value, 10);
        if (!Number.isFinite(parsed)) {
          this.applyValues(this.lastMin, this.lastMax, { fireOnChange: false, changed: "both" });
          return;
        }
        const clamped = clampToStops(parsed, [this.cfg.bounds.min, this.cfg.bounds.max]);
        this.applyValues(clamped, this.lastMax, { fireOnChange: true, changed: "min" });
      };
      this.onMaxInputChange = () => {
        const parsed = parseInt(this.maxInput.value, 10);
        if (!Number.isFinite(parsed)) {
          this.applyValues(this.lastMin, this.lastMax, { fireOnChange: false, changed: "both" });
          return;
        }
        const clamped = clampToStops(parsed, [this.cfg.bounds.min, this.cfg.bounds.max]);
        this.applyValues(this.lastMin, clamped, { fireOnChange: true, changed: "max" });
      };
      this.cfg = cfg;
      this.stops = cfg.stops ?? [cfg.bounds.min, cfg.bounds.max];
      this.minSlider = document.getElementById(cfg.minSliderId);
      this.maxSlider = document.getElementById(cfg.maxSliderId);
      this.minInput = document.getElementById(cfg.minInputId);
      this.maxInput = document.getElementById(cfg.maxInputId);
      this.rangeRoot = document.getElementById(cfg.rangeRootId);
      this.container = document.getElementById(cfg.containerId);
      if (!this.minSlider || !this.maxSlider || !this.minInput || !this.maxInput) {
        throw new Error(`RangeSlider: missing required element in ${cfg.rangeRootId}`);
      }
      this.minSlider.min = "0";
      this.minSlider.max = String(POSITION_RANGE);
      this.maxSlider.min = "0";
      this.maxSlider.max = String(POSITION_RANGE);
      this.lastMin = this.readInputClamped(this.minInput, cfg.bounds.min);
      this.lastMax = this.readInputClamped(this.maxInput, cfg.bounds.max);
      if (this.lastMax < this.lastMin)
        this.lastMax = this.lastMin;
      this.minSlider.addEventListener("input", this.onMinSliderInput);
      this.maxSlider.addEventListener("input", this.onMaxSliderInput);
      this.minInput.addEventListener("change", this.onMinInputChange);
      this.maxInput.addEventListener("change", this.onMaxInputChange);
      this.applyValues(this.lastMin, this.lastMax, { fireOnChange: false, changed: "both" });
      this.renderTicks();
      this.wireSteppers();
      this.applyLockState();
    }
    /** Toggle the disabled appearance + behavior on max-side controls. */
    applyLockState() {
      const locked = !!this.cfg.lockMaxToTwiceMin?.();
      this.maxSlider.disabled = locked;
      this.maxSlider.classList.toggle("is-max-locked", locked);
      this.maxInput.disabled = locked;
      if (this.container) {
        this.container.querySelectorAll('.ld-step-btn[data-target="max"]').forEach((btn) => {
          btn.disabled = locked;
        });
      }
      if (locked) {
        this.applyValues(this.lastMin, this.lastMax, { fireOnChange: false, changed: "min" });
      }
    }
    /** Public setter — used when min is auto-bumped from outside (e.g. team-count chips). */
    setMin(value) {
      this.applyValues(value, this.lastMax, { fireOnChange: true, changed: "min" });
    }
    /** Public setter — used by reset / load. */
    setRange(min, max) {
      this.applyValues(min, max, { fireOnChange: false, changed: "both" });
    }
    readInputClamped(el, fallback) {
      const parsed = parseInt(el.value, 10);
      if (!Number.isFinite(parsed))
        return fallback;
      return clampToStops(parsed, [this.cfg.bounds.min, this.cfg.bounds.max]);
    }
    applyValues(min, max, opts) {
      let nextMin = min;
      let nextMax = max;
      if (this.cfg.lockMaxToTwiceMin?.()) {
        nextMax = clampToStops(nextMin * 2, [this.cfg.bounds.min, this.cfg.bounds.max]);
      }
      if (nextMin > nextMax) {
        const side = opts.changed ?? "both";
        if (side === "min") {
          nextMax = nextMin;
        } else if (side === "max") {
          nextMin = nextMax;
        } else {
          nextMin = Math.min(min, max);
          nextMax = Math.max(min, max);
        }
      }
      this.lastMin = nextMin;
      this.lastMax = nextMax;
      this.minInput.value = String(nextMin);
      this.maxInput.value = String(nextMax);
      this.minSlider.value = String(Math.round(valueToPosition(nextMin, this.stops) * POSITION_RANGE));
      this.maxSlider.value = String(Math.round(valueToPosition(nextMax, this.stops) * POSITION_RANGE));
      if (this.rangeRoot) {
        const lo = valueToPosition(nextMin, this.stops) * 100;
        const hi = valueToPosition(nextMax, this.stops) * 100;
        this.rangeRoot.style.setProperty("--lo", `${lo}%`);
        this.rangeRoot.style.setProperty("--hi", `${hi}%`);
      }
      if (opts.fireOnChange)
        this.cfg.onChange(nextMin, nextMax);
    }
    renderTicks() {
      if (!this.cfg.ticksContainerId || !this.cfg.stops)
        return;
      const container = document.getElementById(this.cfg.ticksContainerId);
      if (!container)
        return;
      container.innerHTML = "";
      for (const stop of this.cfg.stops) {
        const pct = valueToPosition(stop, this.cfg.stops) * 100;
        const tick = document.createElement("div");
        tick.className = "ld-tick";
        tick.style.left = `${pct}%`;
        const label = document.createElement("span");
        label.className = "ld-tick-label";
        label.style.left = `${pct}%`;
        label.textContent = String(stop);
        container.appendChild(tick);
        container.appendChild(label);
      }
    }
    wireSteppers() {
      if (!this.container)
        return;
      const buttons = this.container.querySelectorAll(".ld-step-btn");
      buttons.forEach((btn) => {
        const target = btn.dataset.target;
        const action = btn.dataset.action;
        if (!target || !action)
          return;
        btn.addEventListener("click", () => {
          const delta = action === "inc" ? 1 : -1;
          if (target === "min") {
            const next = clampToStops(
              this.lastMin + delta,
              [this.cfg.bounds.min, this.cfg.bounds.max]
            );
            this.applyValues(next, this.lastMax, { fireOnChange: true, changed: "min" });
          } else {
            const next = clampToStops(
              this.lastMax + delta,
              [this.cfg.bounds.min, this.cfg.bounds.max]
            );
            this.applyValues(this.lastMin, next, { fireOnChange: true, changed: "max" });
          }
        });
      });
    }
  };

  // src/modules/lobby-discovery/LobbyBoardHelpers.ts
  var BOARD_QUEUES = [
    { queue: "ffa", label: "FFA" },
    { queue: "team", label: "Team" },
    { queue: "special", label: "Special" },
    { queue: "hosted", label: "Hosted" }
  ];
  function groupLobbiesByQueue(lobbies) {
    const queues = { ffa: [], team: [], special: [], hosted: [] };
    for (const lobby of lobbies) {
      const queue = getLobbyQueueSource(lobby);
      if (queue)
        queues[queue].push(lobby);
    }
    return queues;
  }
  function getRowLabel(queuePosition) {
    return queuePosition === 0 ? "Live" : `#${queuePosition}`;
  }
  function formatCountdown(remainingMs) {
    const totalSeconds = Math.max(0, Math.ceil(remainingMs / 1e3));
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${String(seconds).padStart(2, "0")}`;
  }
  function getBoardBadge(lobby, queue, queuePosition) {
    if (queue === "hosted") {
      if (typeof lobby.autoStartAt === "number") {
        return { kind: "countdown", targetMs: lobby.autoStartAt };
      }
    } else if (queuePosition === 0) {
      if (typeof lobby.startsAt === "number") {
        return { kind: "countdown", targetMs: lobby.startsAt };
      }
      return { kind: "text", text: "Live" };
    }
    return { kind: "text", text: `Queue ${queuePosition}` };
  }
  function buildBoardCardModel(lobby, queue, queuePosition, assetManifest, cdnBase) {
    return {
      gameID: lobby.gameID,
      queue,
      queuePosition,
      mapName: getMapDisplayName(lobby.gameConfig?.gameMap?.trim() || "Unknown map"),
      thumbnailUrl: getLobbyMapThumbnailUrl(lobby, assetManifest, cdnBase),
      badge: getBoardBadge(lobby, queue, queuePosition)
    };
  }
  function formatLobbyCount(count) {
    return `${count} ${count === 1 ? "lobby" : "lobbies"}`;
  }
  function formatMatchCount(count) {
    return `${count} ${count === 1 ? "match" : "matches"}`;
  }

  // src/modules/lobby-discovery/LobbyBoardView.ts
  var BOARD_ID = "of-lobby-board";
  var GRID_CLASS_MARKER = "sm:grid-cols-[2fr_1fr]";
  var LobbyBoardView = class {
    constructor(options) {
      this.options = options;
      this.root = null;
      this.pageGrid = null;
      // Inline styles of OpenFront's own elements, saved before the board changes them.
      this.savedStyles = [];
      this.clockOffsetMs = 0;
      this.tickInterval = null;
      this.totals = null;
      this.grid = null;
      this.rowCount = -1;
      this.cards = /* @__PURE__ */ new Map();
      this.signatures = /* @__PURE__ */ new Map();
    }
    /** Shows the board in place of OpenFront's lobby cells and fills it. Safe to call on every update. */
    render(state) {
      const root = this.ensureMounted();
      if (!root || !this.grid)
        return;
      root.style.display = "";
      this.takeOverPage();
      this.clockOffsetMs = state.clockOffsetMs;
      const queues = groupLobbiesByQueue(state.lobbies);
      const rowCount = Math.max(0, ...BOARD_QUEUES.map(({ queue }) => queues[queue].length));
      if (rowCount !== this.rowCount)
        this.buildGrid(rowCount);
      const { manifest, cdnBase } = this.options.getAssets();
      const liveIds = /* @__PURE__ */ new Set();
      const { matchedIds } = state;
      const countMatches = (lobbies) => matchedIds ? lobbies.filter((lobby) => matchedIds.has(lobby.gameID)).length : 0;
      for (const { queue } of BOARD_QUEUES) {
        this.renderColumnHead(queue, queues[queue].length, matchedIds ? countMatches(queues[queue]) : null);
      }
      if (this.totals) {
        const totalLobbies = BOARD_QUEUES.reduce((sum, { queue }) => sum + queues[queue].length, 0);
        const totalMatches = BOARD_QUEUES.reduce((sum, { queue }) => sum + countMatches(queues[queue]), 0);
        this.totals.textContent = `${formatMatchCount(totalMatches)} \xB7 ${formatLobbyCount(totalLobbies)}`;
      }
      for (const { queue } of BOARD_QUEUES) {
        for (let row = 0; row < rowCount; row++) {
          const cell = this.getCell(queue, row);
          const lobby = queues[queue][row];
          if (!cell)
            continue;
          if (!lobby) {
            if (!cell.querySelector(".of-board-empty"))
              cell.replaceChildren(this.buildEmpty());
            continue;
          }
          liveIds.add(lobby.gameID);
          const model = buildBoardCardModel(lobby, queue, row, manifest, cdnBase);
          const card = this.cards.get(lobby.gameID) ?? this.createCard(lobby.gameID);
          this.updateCard(card, model);
          card.classList.toggle("of-board-card-match", matchedIds?.has(lobby.gameID) === true);
          card.classList.toggle("of-board-card-dim", matchedIds !== null && !matchedIds.has(lobby.gameID));
          if (card.parentElement !== cell)
            cell.replaceChildren(card);
        }
      }
      for (const gameID of [...this.cards.keys()]) {
        if (!liveIds.has(gameID)) {
          this.cards.get(gameID)?.remove();
          this.cards.delete(gameID);
          this.signatures.delete(gameID);
        }
      }
      this.tickCountdowns();
      if (!this.tickInterval) {
        this.tickInterval = setInterval(() => this.tickCountdowns(), 1e3);
      }
    }
    /** Hides the board and gives OpenFront's lobby area back as it was. */
    hide() {
      this.stopTicking();
      if (this.root)
        this.root.style.display = "none";
      this.restorePage();
    }
    dispose() {
      this.stopTicking();
      this.restorePage();
      this.root?.remove();
      this.root = null;
      this.pageGrid = null;
      this.totals = null;
      this.grid = null;
      this.rowCount = -1;
      this.cards.clear();
      this.signatures.clear();
    }
    /**
     * Hides the lobby cells, lets the board take its own height and lifts the
     * `overflow-x: clip` of the page column so the board can use the full width.
     */
    takeOverPage() {
      const pageGrid = this.pageGrid;
      if (!pageGrid)
        return;
      for (const child of Array.from(pageGrid.children)) {
        if (child !== this.root && this.isLobbyCell(child))
          this.setStyle(child, "display", "none");
      }
      this.setStyle(pageGrid, "grid-template-rows", "auto");
      for (let ancestor = pageGrid.parentElement; ancestor && ancestor !== document.documentElement; ancestor = ancestor.parentElement) {
        if (getComputedStyle(ancestor).overflowX === "clip") {
          this.setStyle(ancestor, "overflow-x", "visible");
        }
      }
    }
    /** The FFA cell, and the section with the Team card, the Special card and the "See all" heading. */
    isLobbyCell(element) {
      return element.tagName === "SECTION" || element.className.includes("sm:col-start-1") && element.className.includes("sm:row-start-2");
    }
    setStyle(element, property, value) {
      if (!this.savedStyles.some((saved) => saved.element === element && saved.property === property)) {
        this.savedStyles.push({ element, property, value: element.style.getPropertyValue(property) });
      }
      element.style.setProperty(property, value);
    }
    restorePage() {
      for (const { element, property, value } of this.savedStyles) {
        if (value)
          element.style.setProperty(property, value);
        else
          element.style.removeProperty(property);
        if (element.getAttribute("style") === "")
          element.removeAttribute("style");
      }
      this.savedStyles = [];
    }
    stopTicking() {
      if (this.tickInterval)
        clearInterval(this.tickInterval);
      this.tickInterval = null;
    }
    /** Updates the text of every countdown badge. It does not rebuild any card. */
    tickCountdowns() {
      const now = Date.now() + this.clockOffsetMs;
      for (const badge of Array.from(
        this.grid?.querySelectorAll(".of-board-badge[data-countdown-to]") ?? []
      )) {
        const text = formatCountdown(Number(badge.dataset.countdownTo) - now);
        if (badge.textContent !== text)
          badge.textContent = text;
      }
    }
    getCell(queue, row) {
      return this.grid?.querySelector(`.of-board-cell[data-queue="${queue}"][data-row="${row}"]`) ?? null;
    }
    /** Finds the grid of OpenFront's home page and puts the board before its first child. */
    ensureMounted() {
      if (this.root?.isConnected)
        return this.root;
      const selector = document.querySelector("game-mode-selector");
      const pageGrid = selector ? Array.from(selector.querySelectorAll("div")).find(
        (el) => el.className.includes(GRID_CLASS_MARKER)
      ) : null;
      if (!pageGrid)
        return null;
      const root = document.createElement("div");
      root.id = BOARD_ID;
      root.className = "of-board";
      const head = document.createElement("div");
      head.className = "of-board-head";
      const title = document.createElement("span");
      title.className = "of-board-title";
      title.textContent = "Lobby Board";
      const totals = document.createElement("span");
      totals.className = "of-board-totals";
      head.append(title, totals);
      const grid = document.createElement("div");
      grid.className = "of-board-grid";
      root.append(head, grid);
      pageGrid.insertBefore(root, pageGrid.firstChild);
      this.root = root;
      this.pageGrid = pageGrid;
      this.totals = totals;
      this.grid = grid;
      this.rowCount = -1;
      return root;
    }
    buildGrid(rowCount) {
      const grid = this.grid;
      const children = [document.createElement("div")];
      for (const { queue, label } of BOARD_QUEUES) {
        const head = document.createElement("div");
        head.className = "of-board-colhead";
        head.dataset.queue = queue;
        head.append(document.createElement("b"), document.createElement("span"), document.createElement("em"));
        head.firstElementChild.textContent = label;
        children.push(head);
      }
      for (let row = 0; row < rowCount; row++) {
        const rowLabel = document.createElement("div");
        rowLabel.className = `of-board-rowlabel${row === 0 ? " of-board-rowlabel-live" : ""}`;
        rowLabel.textContent = getRowLabel(row);
        children.push(rowLabel);
        for (const { queue } of BOARD_QUEUES) {
          const cell = document.createElement("div");
          cell.className = "of-board-cell";
          cell.dataset.queue = queue;
          cell.dataset.row = String(row);
          children.push(cell);
        }
      }
      grid.replaceChildren(...children);
      this.rowCount = rowCount;
    }
    renderColumnHead(queue, lobbyCount, matchCount) {
      const head = this.grid?.querySelector(`.of-board-colhead[data-queue="${queue}"]`);
      if (!head)
        return;
      const [, count, matches] = Array.from(head.children);
      count.textContent = formatLobbyCount(lobbyCount);
      matches.textContent = matchCount ? `\xB7 ${formatMatchCount(matchCount)}` : "";
    }
    buildEmpty() {
      const empty = document.createElement("div");
      empty.className = "of-board-empty";
      return empty;
    }
    createCard(gameID) {
      const card = document.createElement("button");
      card.type = "button";
      card.className = "of-board-card";
      card.dataset.gameId = gameID;
      card.addEventListener("click", () => this.options.onJoin(gameID));
      this.cards.set(gameID, card);
      return card;
    }
    updateCard(card, model) {
      const signature = JSON.stringify([model.mapName, model.thumbnailUrl, model.badge]);
      if (this.signatures.get(model.gameID) === signature)
        return;
      this.signatures.set(model.gameID, signature);
      const thumb = document.createElement("span");
      thumb.className = "of-board-thumb";
      if (model.thumbnailUrl) {
        const img = document.createElement("img");
        img.src = model.thumbnailUrl;
        img.alt = "";
        img.loading = "lazy";
        thumb.append(img);
      }
      const badge = document.createElement("span");
      badge.className = "of-board-badge";
      if (model.badge.kind === "countdown") {
        badge.dataset.countdownTo = String(model.badge.targetMs);
      } else {
        badge.textContent = model.badge.text;
      }
      const name = document.createElement("span");
      name.className = "of-board-map";
      name.textContent = model.mapName;
      card.setAttribute("aria-label", `Open ${model.mapName} in OpenFront's join modal`);
      card.replaceChildren(thumb, badge, name);
    }
  };

  // src/modules/lobby-discovery/LobbyDiscoveryUI.ts
  var STARTING_GOLD_VALUES = [1e6, 5e6, 25e6];
  var GOLD_MULTIPLIER_VALUES = [2];
  var MODIFIER_BOOLEAN_IDS = [
    "modifier-isCompact",
    "modifier-isRandomSpawn",
    "modifier-isCrowded",
    "modifier-isHardNations",
    "modifier-isAlliancesDisabled",
    "modifier-isNukesDisabled",
    "modifier-isSAMsDisabled",
    "modifier-isPeaceTime",
    "modifier-isWaterNukes",
    "modifier-isDoomsdayClock",
    "modifier-isTrusted"
  ];
  var TEAM_PRESET_IDS = [
    ["discovery-team-hvn", "Humans Vs Nations", null]
  ];
  var TEAM_COUNT_IDS = [
    ["discovery-team-2", "2"],
    ["discovery-team-3", "3"],
    ["discovery-team-4", "4"],
    ["discovery-team-5", "5"],
    ["discovery-team-6", "6"],
    ["discovery-team-7", "7"],
    ["discovery-team-8plus", "8+"]
  ];
  var ALL_TEAM_IDS = [
    ...TEAM_PRESET_IDS.map(([id]) => id),
    ...TEAM_COUNT_IDS.map(([id]) => id)
  ];
  function isDebugEnabled() {
    try {
      if (typeof unsafeWindow !== "undefined" && unsafeWindow.__OF_DEBUG_DISCOVERY === true) {
        return true;
      }
    } catch {
    }
    if (globalThis.__OF_DEBUG_DISCOVERY === true) {
      return true;
    }
    try {
      if (typeof localStorage !== "undefined" && localStorage.getItem("__OF_DEBUG_DISCOVERY") === "true") {
        return true;
      }
    } catch {
    }
    return false;
  }
  var PANEL_SECTIONS = ["modes", "modifiers", "maps", "lobbies"];
  var DEFAULT_COLLAPSED_SECTIONS = {
    modes: false,
    modifiers: false,
    maps: true,
    lobbies: false
  };
  function loadCollapsedSections() {
    const saved = GM_getValue(
      STORAGE_KEYS.lobbyDiscoveryCollapsedSections,
      null
    );
    const collapsed = { ...DEFAULT_COLLAPSED_SECTIONS };
    for (const section of PANEL_SECTIONS) {
      const value = saved?.[section];
      if (typeof value === "boolean")
        collapsed[section] = value;
    }
    return collapsed;
  }
  var SEE_ALL_VIEW_ID = "page-detailed-view";
  var SEE_ALL_MATCH_CLASS = "of-discovery-see-all-match";
  function getPageWindow() {
    try {
      if (typeof unsafeWindow !== "undefined") {
        return unsafeWindow;
      }
    } catch {
    }
    return window;
  }
  function nextTriState(state) {
    return state === "any" ? "required" : state === "required" ? "blocked" : "any";
  }
  function escapeHtml(value) {
    return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  var UPCOMING_SOURCE_ORDER = ["ffa", "special", "team"];
  var ICON_PLAYERS = `<svg viewBox="0 0 20 20" fill="currentColor"><path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z"/></svg>`;
  var ICON_CHECK = `<svg viewBox="0 0 24 24"><path d="M5 12l5 5L20 7"/></svg>`;
  var ICON_CROSS = `<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>`;
  var ICON_SOUND = `<svg viewBox="0 0 24 24"><path d="M11 5L6 9H2v6h4l5 4V5z"/><path d="M15.5 8.5a5 5 0 010 7"/><path d="M19 5a9 9 0 010 14"/></svg>`;
  var ICON_BELL = `<svg viewBox="0 0 24 24"><path d="M6 8a6 6 0 1112 0c0 7 3 9 3 9H3s3-2 3-9z"/><path d="M10.3 21a1.94 1.94 0 003.4 0"/></svg>`;
  var LobbyDiscoveryUI = class {
    constructor() {
      this.discoveryEnabled = true;
      this.criteriaList = [];
      this.searchStartTime = null;
      this.lastMatchTime = null;
      this.soundEnabled = true;
      this.desktopNotificationsEnabled = false;
      this.notifyUpcomingEnabled = true;
      this.includeHostedAndCustomLobbies = true;
      this.mapFilter = {};
      this.knownMaps = new Set(MAP_CATALOGUE.map((entry) => entry.gameMap));
      this.collapsedSections = loadCollapsedSections();
      this.desktopNotificationRequestId = 0;
      this.activeMatchSources = /* @__PURE__ */ new Set();
      this.seeAllPulseActive = false;
      this.seeAllMatchIds = /* @__PURE__ */ new Set();
      this.seeAllObserver = null;
      this.observedSeeAllView = null;
      this.seenLobbies = /* @__PURE__ */ new Set();
      this.desktopNotifiedLobbies = /* @__PURE__ */ new Set();
      this.isTeamTwoTimesMinEnabled = false;
      this.ffaSlider = null;
      this.teamSlider = null;
      this.sleeping = false;
      this.isDisposed = false;
      this.lastLobbies = [];
      this.upcomingStrip = null;
      this.lastUpcomingSlots = /* @__PURE__ */ new Map();
      this.lastUpcomingMatchSources = /* @__PURE__ */ new Set();
      // Per-slot render signature: lets us skip rebuilding a card whose content is
      // unchanged, so the ~1s lobby refresh (and the 16ms pulse re-apply) don't
      // swap the DOM node under the cursor and restart the hover animation.
      this.upcomingSlotSignatures = /* @__PURE__ */ new Map();
      this.timerInterval = null;
      this.gameInfoInterval = null;
      this.pulseSyncTimeout = null;
      // Offset to add to the local clock to get the feed's clock.
      this.clockOffsetMs = 0;
      this.engine = new LobbyDiscoveryEngine();
      this.lobbyBoard = new LobbyBoardView({
        onJoin: (gameID) => this.navigateToGame(`/game/${gameID}`),
        getAssets: () => this.getAssetContext()
      });
      this.loadSettings();
      this.createUI();
      this.updateSleepState();
      URLObserver.subscribe(() => this.updateSleepState());
    }
    receiveLobbyUpdate(lobbies, serverTime = null) {
      this.lastLobbies = lobbies;
      if (serverTime !== null)
        this.clockOffsetMs = serverTime - Date.now();
      this.processLobbies(lobbies);
    }
    isSoundEnabled() {
      return this.soundEnabled;
    }
    loadSettings() {
      const saved = GM_getValue(
        STORAGE_KEYS.lobbyDiscoverySettings,
        null
      );
      const settings = normalizeSettings(saved);
      GM_setValue(STORAGE_KEYS.lobbyDiscoverySettings, settings);
      this.criteriaList = settings.criteria;
      this.soundEnabled = settings.soundEnabled;
      this.desktopNotificationsEnabled = settings.desktopNotificationsEnabled;
      this.discoveryEnabled = settings.discoveryEnabled;
      this.isTeamTwoTimesMinEnabled = settings.isTeamTwoTimesMinEnabled;
      this.notifyUpcomingEnabled = settings.notifyUpcomingEnabled ?? true;
      this.includeHostedAndCustomLobbies = settings.includeHostedAndCustomLobbies ?? true;
      this.mapFilter = settings.mapFilter ?? {};
    }
    saveSettings() {
      GM_setValue(STORAGE_KEYS.lobbyDiscoverySettings, {
        criteria: this.criteriaList,
        discoveryEnabled: this.discoveryEnabled,
        soundEnabled: this.soundEnabled,
        desktopNotificationsEnabled: this.desktopNotificationsEnabled,
        isTeamTwoTimesMinEnabled: this.isTeamTwoTimesMinEnabled,
        notifyUpcomingEnabled: this.notifyUpcomingEnabled,
        includeHostedAndCustomLobbies: this.includeHostedAndCustomLobbies,
        mapFilter: this.mapFilter
      });
    }
    updateStatusText() {
      const text = document.getElementById("discovery-search-timer");
      if (!text)
        return;
      if (!this.discoveryEnabled || this.criteriaList.length === 0 || !this.isDiscoveryFeedbackAllowed()) {
        text.textContent = "";
        text.style.display = "none";
        return;
      }
      text.style.display = "inline";
      if (this.lastMatchTime !== null) {
        text.textContent = `last match ${formatElapsedSince(this.lastMatchTime)}`;
      } else if (this.searchStartTime !== null) {
        text.textContent = `searching \xB7 ${formatElapsedSince(this.searchStartTime)}`;
      } else {
        text.textContent = "awaiting filters";
      }
    }
    updateCurrentGameInfo() {
      const gameInfoElement = document.getElementById("discovery-current-game-info");
      if (!gameInfoElement || !LobbyUtils.isOnLobbyPage()) {
        if (gameInfoElement)
          gameInfoElement.style.display = "none";
        return;
      }
      const publicLobby = document.querySelector("public-lobby");
      if (!publicLobby || !Array.isArray(publicLobby.lobbies) || publicLobby.lobbies.length === 0) {
        gameInfoElement.style.display = "none";
        return;
      }
      const currentLobby = publicLobby.lobbies[0];
      if (!currentLobby || !currentLobby.gameConfig) {
        gameInfoElement.style.display = "none";
        return;
      }
      gameInfoElement.style.display = "block";
      gameInfoElement.textContent = `Current game: ${getGameDetailsText(currentLobby)}`;
    }
    /** Group the flattened lobby snapshot by Queue, keeping the feed order. */
    parseQueues(lobbies) {
      const queues = /* @__PURE__ */ new Map();
      for (const lobby of lobbies) {
        const queue = getLobbyQueueSource(lobby);
        if (!queue)
          continue;
        const queueLobbies = queues.get(queue) ?? [];
        queueLobbies.push(lobby);
        queues.set(queue, queueLobbies);
      }
      return queues;
    }
    /** The Up Next strip shows the first two lobbies of the FFA, Team and Special Queues. */
    toUpNextSlots(queues) {
      const slots = /* @__PURE__ */ new Map();
      for (const queue of UPCOMING_SOURCE_ORDER) {
        const queueLobbies = queues.get(queue);
        if (queueLobbies?.length) {
          slots.set(queue, { live: queueLobbies[0], upcoming: queueLobbies[1] });
        }
      }
      return slots;
    }
    processLobbies(lobbies) {
      try {
        this.updateLobbyBoard(lobbies);
        this.updateCurrentGameInfo();
        this.syncSearchTimer();
        const queues = this.parseQueues(lobbies);
        const slots = this.toUpNextSlots(queues);
        this.addFeedOnlyMaps(lobbies);
        if (!this.discoveryEnabled || this.criteriaList.length === 0 || !this.isDiscoveryFeedbackAllowed()) {
          this.seenLobbies.clear();
          this.desktopNotifiedLobbies.clear();
          this.updateQueueCardPulses(/* @__PURE__ */ new Set());
          this.updateSeeAllSignals(false, /* @__PURE__ */ new Set());
          this.renderUpcomingStrip(slots, /* @__PURE__ */ new Set());
          this.updateStatusText();
          return;
        }
        const liveMatchSources = /* @__PURE__ */ new Set();
        const upcomingMatchSources = /* @__PURE__ */ new Set();
        const seeAllMatchIds = /* @__PURE__ */ new Set();
        let hasSeeAllOnlyMatch = false;
        const matchedKeys = /* @__PURE__ */ new Set();
        const newMatches = [];
        let hasNewMatch = false;
        const debugEnabled = isDebugEnabled();
        const evaluate = (lobby, queue, index) => {
          if (!this.includeHostedAndCustomLobbies && isHostConfiguredLobby(lobby))
            return;
          const isLive = queue !== "hosted" && index === 0;
          const seeAllOnly = queue === "hosted" || index > 1;
          const matched = this.engine.matchesCriteria(lobby, this.criteriaList, this.mapFilter);
          if (debugEnabled) {
            console.log("[OF Discovery]", {
              lobbyId: lobby.gameID,
              queue,
              index,
              mode: lobby.gameConfig?.gameMode,
              map: lobby.gameConfig?.gameMap,
              playerTeams: lobby.gameConfig?.playerTeams,
              modifiers: lobby.gameConfig?.publicGameModifiers,
              hostGold: {
                startingGold: lobby.gameConfig?.startingGold,
                goldMultiplier: lobby.gameConfig?.goldMultiplier
              },
              criteriaCount: this.criteriaList.length,
              matched
            });
          }
          if (!matched)
            return;
          if (isLive) {
            liveMatchSources.add(queue);
          } else {
            if (!this.notifyUpcomingEnabled)
              return;
            if (seeAllOnly)
              hasSeeAllOnlyMatch = true;
            else
              upcomingMatchSources.add(queue);
          }
          seeAllMatchIds.add(lobby.gameID);
          const notificationKey = this.getNotificationKey(lobby);
          matchedKeys.add(notificationKey);
          if (!this.seenLobbies.has(notificationKey))
            hasNewMatch = true;
          if (!this.desktopNotifiedLobbies.has(notificationKey)) {
            newMatches.push({ lobby, queue, seeAllOnly });
          }
        };
        for (const [queue, queueLobbies] of queues) {
          queueLobbies.forEach((lobby, index) => evaluate(lobby, queue, index));
        }
        this.updateQueueCardPulses(liveMatchSources);
        this.updateSeeAllSignals(hasSeeAllOnlyMatch, seeAllMatchIds);
        this.renderUpcomingStrip(slots, upcomingMatchSources);
        if (hasNewMatch) {
          this.lastMatchTime = Date.now();
          if (this.soundEnabled)
            SoundUtils.playGameFoundSound();
        }
        if (this.desktopNotificationsEnabled) {
          const deliveredKeys = /* @__PURE__ */ new Set();
          for (const { lobby, queue, seeAllOnly } of newMatches) {
            const content = getBrowserNotificationContent(lobby);
            const key = this.getNotificationKey(lobby);
            const delivered = BrowserNotificationUtils.show({
              title: content.title,
              body: content.body,
              tag: key,
              // Runs only from the user's click on the notification.
              onClick: seeAllOnly ? () => this.openSeeAllView(queue) : void 0
            });
            if (delivered)
              deliveredKeys.add(key);
          }
          this.desktopNotifiedLobbies = /* @__PURE__ */ new Set([
            ...[...this.desktopNotifiedLobbies].filter((k) => matchedKeys.has(k)),
            ...deliveredKeys
          ]);
        } else {
          this.desktopNotifiedLobbies.clear();
        }
        this.seenLobbies = matchedKeys;
        if (matchedKeys.size === 0)
          this.lastMatchTime = null;
        this.updateStatusText();
      } catch (error) {
        console.error("[LobbyDiscovery] Error processing lobbies:", error);
      }
    }
    updateLobbyBoard(lobbies) {
      if (this.sleeping || !this.isDiscoveryFeedbackAllowed()) {
        this.lobbyBoard.hide();
        return;
      }
      const isActive = this.discoveryEnabled && this.criteriaList.length > 0;
      const matchedIds = /* @__PURE__ */ new Set();
      if (isActive) {
        for (const lobby of lobbies) {
          const excluded = !this.includeHostedAndCustomLobbies && isHostConfiguredLobby(lobby);
          if (!excluded && this.engine.matchesCriteria(lobby, this.criteriaList, this.mapFilter)) {
            matchedIds.add(lobby.gameID);
          }
        }
      }
      this.lobbyBoard.render({
        lobbies,
        matchedIds: isActive ? matchedIds : null,
        clockOffsetMs: this.clockOffsetMs
      });
    }
    getNotificationKey(lobby) {
      return JSON.stringify({
        gameID: lobby.gameID,
        map: lobby.gameConfig?.gameMap ?? null,
        mode: lobby.gameConfig?.gameMode ?? null,
        playerTeams: lobby.gameConfig?.playerTeams ?? lobby.gameConfig?.teamCount ?? null,
        capacity: lobby.gameConfig?.maxPlayers ?? lobby.maxClients ?? null,
        modifiers: lobby.gameConfig?.publicGameModifiers ?? {}
      });
    }
    isDiscoveryFeedbackAllowed() {
      if (!LobbyUtils.isOnLobbyPage())
        return false;
      const pagePlay = document.getElementById("page-play");
      if (pagePlay?.classList.contains("hidden") && !this.isSeeAllViewVisible())
        return false;
      const publicLobby = document.querySelector("public-lobby");
      if (publicLobby?.isLobbyHighlighted === true)
        return false;
      const joinLobbyModal = document.querySelector("join-lobby-modal");
      if (joinLobbyModal?.currentLobbyId)
        return false;
      const hostLobbyModal = document.querySelector("host-lobby-modal");
      if (hostLobbyModal?.lobbyId)
        return false;
      return true;
    }
    getQueueCardElements() {
      const selector = document.querySelector("game-mode-selector");
      if (!selector)
        return {};
      const grid = Array.from(selector.querySelectorAll("div")).find(
        (element) => element.className.includes("sm:grid-cols-[2fr_1fr]")
      );
      if (!(grid instanceof HTMLElement))
        return {};
      const gridChildren = Array.from(grid.children);
      const ffaCell = gridChildren.find(
        (el) => el.className.includes("sm:col-start-1") && el.className.includes("sm:row-start-2")
      );
      const section = gridChildren.find((el) => el.tagName === "SECTION");
      const cardCells = section ? Array.from(section.children).filter((el) => el.tagName === "DIV") : [];
      const games = selector.lobbies?.games;
      const hasTeam = Array.isArray(games?.["team"]) && games["team"].length > 0;
      const hasSpecial = Array.isArray(games?.["special"]) && games["special"].length > 0;
      const teamCell = hasTeam ? cardCells[0] : void 0;
      const specialCell = hasSpecial ? cardCells[hasTeam ? 1 : 0] : void 0;
      return {
        ffa: ffaCell?.querySelector("button"),
        team: teamCell?.querySelector("button"),
        special: specialCell?.querySelector("button")
      };
    }
    updateQueueCardPulses(nextSources) {
      this.activeMatchSources = new Set(nextSources);
      this.applyQueueCardPulses();
      this.scheduleQueueCardPulseSync();
    }
    isSeeAllViewVisible() {
      const view = document.getElementById(SEE_ALL_VIEW_ID);
      return !!view && !view.classList.contains("hidden");
    }
    getSeeAllButton() {
      return document.querySelector(
        'game-mode-selector button[class~="group/upcoming"]'
      );
    }
    updateSeeAllSignals(pulse, matchIds) {
      this.seeAllPulseActive = pulse;
      this.seeAllMatchIds = matchIds;
      this.applySeeAllSignals();
    }
    applySeeAllSignals() {
      this.getSeeAllButton()?.classList.toggle("of-discovery-card-active", this.seeAllPulseActive);
      this.observeSeeAllView();
      this.applySeeAllHighlights();
    }
    // The See All View renders its cards lazily and re-renders them on every feed
    // update, so the highlight is re-applied whenever its children change.
    observeSeeAllView() {
      const view = document.getElementById(SEE_ALL_VIEW_ID);
      if (!view || view === this.observedSeeAllView)
        return;
      this.seeAllObserver?.disconnect();
      this.seeAllObserver = new MutationObserver(() => this.applySeeAllHighlights());
      this.seeAllObserver.observe(view, { childList: true, subtree: true });
      this.observedSeeAllView = view;
    }
    applySeeAllHighlights() {
      const view = document.getElementById(SEE_ALL_VIEW_ID);
      if (!view)
        return;
      for (const slot of Array.from(view.querySelectorAll("[data-lobby-slot]"))) {
        slot.classList.toggle(SEE_ALL_MATCH_CLASS, this.seeAllMatchIds.has(slot.dataset.lobbySlot ?? ""));
      }
    }
    /** Opens the See All View on the lobby's Queue. Call only from a user click. */
    openSeeAllView(queue) {
      getPageWindow().showPage?.(SEE_ALL_VIEW_ID);
      if (queue === "hosted")
        return;
      const view = document.getElementById(SEE_ALL_VIEW_ID);
      view?.open?.({ tab: queue });
    }
    applyQueueCardPulses() {
      const cards = this.getQueueCardElements();
      for (const source of ["ffa", "special", "team"]) {
        const card = cards[source];
        if (!card)
          continue;
        card.classList.toggle("of-discovery-card-active", this.activeMatchSources.has(source));
      }
    }
    scheduleQueueCardPulseSync() {
      if (this.pulseSyncTimeout)
        clearTimeout(this.pulseSyncTimeout);
      this.pulseSyncTimeout = setTimeout(() => {
        this.pulseSyncTimeout = null;
        this.applyQueueCardPulses();
        this.applySeeAllSignals();
        this.renderUpcomingStrip(this.lastUpcomingSlots, this.lastUpcomingMatchSources);
      }, 16);
    }
    /**
     * Read OpenFront's asset manifest + CDN base from the page globals so upcoming
     * cards reuse the exact CDN map thumbnails. Returns nulls when unavailable
     * (e.g. unsafeWindow not granted, or in tests).
     */
    getAssetContext() {
      const win = getPageWindow();
      return {
        manifest: win.BOOTSTRAP_CONFIG?.assetManifest ?? win.__ASSET_MANIFEST__ ?? null,
        cdnBase: win.BOOTSTRAP_CONFIG?.cdnBase ?? win.__CDN_BASE__ ?? null
      };
    }
    ensureUpcomingStrip() {
      const existing = document.getElementById("of-upcoming-strip");
      if (existing) {
        this.upcomingStrip = existing;
        return existing;
      }
      const selector = document.querySelector("game-mode-selector");
      if (!selector || !selector.parentNode)
        return null;
      const strip = document.createElement("div");
      strip.id = "of-upcoming-strip";
      strip.className = "of-upcoming";
      strip.innerHTML = `
      <div class="of-upcoming-head">
        <span class="of-upcoming-lbl">Up Next</span>
        <span class="of-upcoming-rule"></span>
        <label class="of-upcoming-toggle">
          <input type="checkbox" id="of-upcoming-toggle">
          <span class="of-upcoming-sw" aria-hidden="true"></span>
          <span>Notify on upcoming games</span>
        </label>
      </div>
      <div class="of-upcoming-grid">
        <div class="of-upcoming-slot" data-source="ffa"></div>
        <div class="of-upcoming-col">
          <div class="of-upcoming-slot" data-source="special"></div>
          <div class="of-upcoming-slot" data-source="team"></div>
        </div>
      </div>
    `;
      selector.parentNode.insertBefore(strip, selector.nextSibling);
      this.upcomingStrip = strip;
      this.upcomingSlotSignatures.clear();
      const toggle = strip.querySelector("#of-upcoming-toggle");
      if (toggle) {
        toggle.checked = this.notifyUpcomingEnabled;
        toggle.addEventListener("change", () => {
          this.notifyUpcomingEnabled = toggle.checked;
          this.saveSettings();
          this.processLobbies(this.lastLobbies);
        });
      }
      return strip;
    }
    renderUpcomingStrip(slots, matchedSources) {
      this.lastUpcomingSlots = slots;
      this.lastUpcomingMatchSources = matchedSources;
      const strip = this.ensureUpcomingStrip();
      if (!strip)
        return;
      const visible = !this.sleeping && this.isDiscoveryFeedbackAllowed();
      strip.style.display = visible ? "" : "none";
      if (!visible)
        return;
      const toggle = strip.querySelector("#of-upcoming-toggle");
      if (toggle && toggle.checked !== this.notifyUpcomingEnabled) {
        toggle.checked = this.notifyUpcomingEnabled;
      }
      const { manifest, cdnBase } = this.getAssetContext();
      for (const source of UPCOMING_SOURCE_ORDER) {
        const container = strip.querySelector(
          `.of-upcoming-slot[data-source="${source}"]`
        );
        if (!container)
          continue;
        const slot = slots.get(source);
        const matched = matchedSources.has(source);
        const model = slot?.live && slot.upcoming ? buildUpcomingCardModel(slot.upcoming, manifest, cdnBase) : null;
        const signature = !slot?.live ? "hidden" : !model ? "empty" : JSON.stringify([
          model.gameID,
          matched,
          model.mapName,
          model.modeText,
          model.capacityLabel,
          model.modifierLabels,
          model.thumbnailUrl
        ]);
        if (this.upcomingSlotSignatures.get(source) === signature)
          continue;
        this.upcomingSlotSignatures.set(source, signature);
        if (signature === "hidden") {
          container.style.display = "none";
          container.replaceChildren();
        } else if (signature === "empty") {
          container.style.display = "";
          const empty = document.createElement("div");
          empty.className = "of-upcoming-empty";
          empty.textContent = "No upcoming game";
          container.replaceChildren(empty);
        } else {
          container.style.display = "";
          container.replaceChildren(this.buildUpcomingCardElement(model, matched));
        }
      }
    }
    buildUpcomingCardElement(model, matched) {
      const card = document.createElement("button");
      card.type = "button";
      card.className = `of-upcoming-card${matched ? " of-upcoming-card-match of-discovery-card-active" : ""}`;
      const MAX_VISIBLE_TAGS = 3;
      const shownLabels = model.modifierLabels.slice(0, MAX_VISIBLE_TAGS);
      const extraTags = model.modifierLabels.length - shownLabels.length;
      let tagsHtml = shownLabels.map((label) => `<span class="of-upcoming-tag">${escapeHtml(label)}</span>`).join("");
      if (extraTags > 0) {
        tagsHtml += `<span class="of-upcoming-tag of-upcoming-tag-more">+${extraTags}</span>`;
      }
      const artHtml = model.thumbnailUrl ? `<img src="${escapeHtml(model.thumbnailUrl)}" alt="" loading="lazy">` : "";
      const chipText = matched ? "Match \xB7 up next" : "Up next";
      card.setAttribute("aria-label", `Open ${model.mapName} in OpenFront's join modal`);
      card.innerHTML = `
      <span class="of-upcoming-art">${artHtml}</span>
      <span class="of-upcoming-toprow">
        <span class="of-upcoming-tags">${tagsHtml}</span>
        <span class="of-upcoming-chip"><span class="of-upcoming-dot"></span>${chipText}</span>
      </span>
      <span class="of-upcoming-bot">
        <span class="of-upcoming-name">${escapeHtml(model.mapName)}</span>
        <span class="of-upcoming-metarow">
          <span class="of-upcoming-mode">${escapeHtml(model.modeText)}</span>
          ${model.capacityLabel ? `<span class="of-upcoming-count">${ICON_PLAYERS}${escapeHtml(model.capacityLabel)}</span>` : ""}
        </span>
      </span>
    `;
      card.addEventListener("click", () => this.navigateToGame(`/game/${model.gameID}`));
      return card;
    }
    navigateToGame(url) {
      window.location.assign(url);
    }
    hideUpcomingStrip() {
      if (this.upcomingStrip)
        this.upcomingStrip.style.display = "none";
    }
    stopTimer() {
      if (this.timerInterval) {
        clearInterval(this.timerInterval);
        this.timerInterval = null;
      }
    }
    startGameInfoUpdates() {
      this.stopGameInfoUpdates();
      this.updateCurrentGameInfo();
      this.gameInfoInterval = setInterval(() => this.updateCurrentGameInfo(), 1e3);
    }
    stopGameInfoUpdates() {
      if (this.gameInfoInterval) {
        clearInterval(this.gameInfoInterval);
        this.gameInfoInterval = null;
      }
    }
    syncSearchTimer(options = {}) {
      const { resetStart = false } = options;
      this.stopTimer();
      if (resetStart) {
        this.searchStartTime = null;
        this.lastMatchTime = null;
        this.seenLobbies.clear();
        this.desktopNotifiedLobbies.clear();
      }
      if (this.discoveryEnabled && this.criteriaList.length > 0 && this.isDiscoveryFeedbackAllowed()) {
        if (this.searchStartTime === null)
          this.searchStartTime = Date.now();
        this.timerInterval = setInterval(() => this.updateStatusText(), 1e3);
      } else {
        this.searchStartTime = null;
        this.lastMatchTime = null;
      }
      this.updateStatusText();
      this.updatePulseIndicator();
    }
    updatePulseIndicator() {
      const pulse = document.querySelector(".ld-pulse");
      if (!pulse)
        return;
      const active = this.discoveryEnabled && this.criteriaList.length > 0;
      pulse.classList.toggle("is-paused", !active);
    }
    setDiscoveryEnabled(enabled, options = {}) {
      this.discoveryEnabled = enabled;
      this.saveSettings();
      this.updateStatusLabel();
      this.syncSearchTimer({ resetStart: options.resetTimer ?? false });
    }
    updateStatusLabel() {
      const label = document.querySelector(".ld-status-text strong");
      if (!label)
        return;
      label.textContent = this.discoveryEnabled ? "Discovery active" : "Discovery paused";
    }
    getNumberValue(id) {
      const input = document.getElementById(id);
      if (!input)
        return null;
      const val = parseInt(input.value, 10);
      return Number.isNaN(val) ? null : val;
    }
    getModifierState(id) {
      const button = document.getElementById(id);
      const state = button?.dataset.state;
      if (state === "required" || state === "blocked")
        return state;
      return "any";
    }
    setModifierState(id, state) {
      const button = document.getElementById(id);
      if (button)
        this.applyTriState(button, state);
    }
    applyTriState(button, state) {
      button.dataset.state = state;
      button.setAttribute("aria-pressed", String(state !== "any"));
      const baseLabel = button.dataset.modName ?? button.getAttribute("aria-label") ?? "";
      const stateWord = state === "blocked" ? "excluded" : state;
      if (baseLabel) {
        button.setAttribute("aria-label", state === "any" ? baseLabel : `${baseLabel} \xB7 ${stateWord}`);
      }
      const ind = button.querySelector(".ld-mod-ind");
      if (ind) {
        if (state === "required")
          ind.innerHTML = ICON_CHECK;
        else if (state === "blocked")
          ind.innerHTML = ICON_CROSS;
        else
          ind.innerHTML = "";
      }
    }
    cycleModifierState(id) {
      this.setModifierState(id, nextTriState(this.getModifierState(id)));
    }
    getMapChips() {
      return Array.from(
        document.querySelectorAll("#discovery-maps-body [data-game-map]")
      );
    }
    cycleMapState(chip) {
      const gameMap = chip.dataset.gameMap ?? "";
      const next = nextTriState(this.mapFilter[gameMap] ?? "any");
      const mapFilter = { ...this.mapFilter };
      if (next === "any")
        delete mapFilter[gameMap];
      else
        mapFilter[gameMap] = next;
      this.setMapFilter(mapFilter);
    }
    setMapFilter(mapFilter) {
      this.mapFilter = mapFilter;
      this.syncMapChips();
      this.saveSettings();
      this.syncSearchTimer({ resetStart: true });
      this.processLobbies(this.lastLobbies);
    }
    syncMapChips() {
      for (const chip of this.getMapChips()) {
        this.applyTriState(chip, this.mapFilter[chip.dataset.gameMap ?? ""] ?? "any");
      }
      const states = Object.values(this.mapFilter);
      const required = states.filter((state) => state === "required").length;
      const blocked = states.filter((state) => state === "blocked").length;
      const parts = [
        ...required > 0 ? [`${required} required`] : [],
        ...blocked > 0 ? [`${blocked} excluded`] : []
      ];
      const summary = document.getElementById("discovery-maps-summary");
      if (summary)
        summary.textContent = parts.length > 0 ? parts.join(" \xB7 ") : "Any map";
    }
    filterMapChips(query) {
      const needle = query.trim().toLowerCase();
      for (const chip of this.getMapChips()) {
        chip.hidden = needle !== "" && !(chip.dataset.modName ?? "").toLowerCase().includes(needle);
      }
      for (const group of Array.from(
        document.querySelectorAll("#discovery-maps-body [data-category]")
      )) {
        group.hidden = !group.querySelector("[data-game-map]:not([hidden])");
      }
    }
    // A map that OpenFront added after the catalogue was generated still gets a chip.
    addFeedOnlyMaps(lobbies) {
      for (const lobby of lobbies) {
        const gameMap = lobby.gameConfig?.gameMap?.trim();
        if (!gameMap || this.knownMaps.has(gameMap))
          continue;
        this.knownMaps.add(gameMap);
        const mods = this.ensureMapGroup("other");
        if (!mods)
          continue;
        mods.insertAdjacentHTML("beforeend", this.renderMapChip(gameMap, gameMap));
        const chip = mods.lastElementChild;
        chip.addEventListener("click", () => this.cycleMapState(chip));
        this.applyTriState(chip, this.mapFilter[gameMap] ?? "any");
        const search = document.getElementById("discovery-maps-search");
        this.filterMapChips(search?.value ?? "");
      }
    }
    ensureMapGroup(category) {
      const groups = document.getElementById("discovery-maps-groups");
      if (!groups)
        return null;
      const existing = groups.querySelector(`[data-category="${category}"] .ld-mods`);
      if (existing)
        return existing;
      groups.insertAdjacentHTML("beforeend", this.renderMapGroup(category, ""));
      return groups.querySelector(`[data-category="${category}"] .ld-mods`);
    }
    getNumericModifierState(ids) {
      const states = {};
      for (const [numericValue, id] of Object.entries(ids)) {
        states[Number(numericValue)] = this.getModifierState(id);
      }
      return states;
    }
    getModifierFiltersFromUI() {
      return {
        isCompact: this.getModifierState("modifier-isCompact"),
        isRandomSpawn: this.getModifierState("modifier-isRandomSpawn"),
        isCrowded: this.getModifierState("modifier-isCrowded"),
        isHardNations: this.getModifierState("modifier-isHardNations"),
        isAlliancesDisabled: this.getModifierState("modifier-isAlliancesDisabled"),
        isNukesDisabled: this.getModifierState("modifier-isNukesDisabled"),
        isSAMsDisabled: this.getModifierState("modifier-isSAMsDisabled"),
        isPeaceTime: this.getModifierState("modifier-isPeaceTime"),
        isWaterNukes: this.getModifierState("modifier-isWaterNukes"),
        isDoomsdayClock: this.getModifierState("modifier-isDoomsdayClock"),
        isTrusted: this.getModifierState("modifier-isTrusted"),
        startingGold: this.getNumericModifierState({
          1e6: "modifier-startingGold-1000000",
          5e6: "modifier-startingGold-5000000",
          25e6: "modifier-startingGold-25000000"
        }),
        goldMultiplier: this.getNumericModifierState({
          2: "modifier-goldMultiplier-2"
        })
      };
    }
    getAllTeamCountValues() {
      const values = [];
      for (const id of ALL_TEAM_IDS) {
        const checkbox = document.getElementById(id);
        if (!checkbox?.checked)
          continue;
        const value = checkbox.value;
        if (value === "Humans Vs Nations" || value === "8+") {
          values.push(value);
        } else {
          const numeric = parseInt(value, 10);
          if (!Number.isNaN(numeric))
            values.push(numeric);
        }
      }
      return values;
    }
    setAllTeamCounts(checked) {
      for (const id of ALL_TEAM_IDS) {
        const checkbox = document.getElementById(id);
        if (!checkbox)
          continue;
        checkbox.checked = checked;
        this.syncChipState(id);
      }
    }
    syncChipState(checkboxId) {
      const checkbox = document.getElementById(checkboxId);
      if (!checkbox)
        return;
      const chip = checkbox.closest(".ld-chip, .ld-mode-btn, .ld-2x");
      if (!chip)
        return;
      chip.classList.toggle("is-on", checkbox.checked);
      chip.setAttribute("aria-pressed", String(checkbox.checked));
    }
    buildCriteriaFromUI() {
      const modifiers = this.getModifierFiltersFromUI();
      const criteria = [];
      const ffaCheckbox = document.getElementById("discovery-ffa");
      if (ffaCheckbox?.checked) {
        criteria.push({
          gameMode: "FFA",
          teamCount: null,
          minPlayers: this.getNumberValue("discovery-ffa-min"),
          maxPlayers: this.getNumberValue("discovery-ffa-max"),
          modifiers
        });
      }
      const teamCheckbox = document.getElementById("discovery-team");
      if (!teamCheckbox?.checked)
        return criteria;
      const teamCounts = this.getAllTeamCountValues();
      if (teamCounts.length === 0) {
        criteria.push({
          gameMode: "Team",
          teamCount: null,
          minPlayers: this.getNumberValue("discovery-team-min"),
          maxPlayers: this.getNumberValue("discovery-team-max"),
          modifiers
        });
        return criteria;
      }
      for (const teamCount of teamCounts) {
        criteria.push({
          gameMode: "Team",
          teamCount,
          minPlayers: this.getNumberValue("discovery-team-min"),
          maxPlayers: this.getNumberValue("discovery-team-max"),
          modifiers
        });
      }
      return criteria;
    }
    updateFilterCount() {
      const num = document.getElementById("discovery-filter-count");
      const wordEl = document.getElementById("discovery-filter-word");
      if (!num || !wordEl)
        return;
      const ffaOn = document.getElementById("discovery-ffa")?.checked;
      const teamOn = document.getElementById("discovery-team")?.checked;
      const formatsOn = ALL_TEAM_IDS.filter(
        (id) => document.getElementById(id)?.checked
      ).length;
      const modsOn = [
        ...MODIFIER_BOOLEAN_IDS,
        ...STARTING_GOLD_VALUES.map((v) => `modifier-startingGold-${v}`),
        ...GOLD_MULTIPLIER_VALUES.map((v) => `modifier-goldMultiplier-${v}`)
      ].filter((id) => this.getModifierState(id) !== "any").length;
      const count = (ffaOn ? 1 : 0) + (teamOn ? 1 : 0) + formatsOn + modsOn;
      num.textContent = String(count);
      wordEl.textContent = count === 1 ? "filter" : "filters";
    }
    setModePanelActive(panelId, active) {
      const el = document.getElementById(panelId);
      if (el)
        el.classList.toggle("is-off", !active);
    }
    setIconButtonState(checkboxId, on) {
      const btn = document.getElementById(checkboxId)?.closest(".ld-icon-btn");
      if (btn)
        btn.classList.toggle("is-on", on);
    }
    loadUIFromSettings() {
      const ffaCriteria = this.criteriaList.find((c) => c.gameMode === "FFA");
      const teamCriteria = this.criteriaList.filter((c) => c.gameMode === "Team");
      const ffaCheckbox = document.getElementById("discovery-ffa");
      const teamCheckbox = document.getElementById("discovery-team");
      if (ffaCheckbox) {
        ffaCheckbox.checked = !!ffaCriteria;
        this.syncChipState("discovery-ffa");
        this.setModePanelActive("discovery-ffa-config", !!ffaCriteria);
      }
      if (teamCheckbox) {
        teamCheckbox.checked = teamCriteria.length > 0;
        this.syncChipState("discovery-team");
        this.setModePanelActive("discovery-team-config", teamCriteria.length > 0);
      }
      if (ffaCriteria) {
        const min = document.getElementById("discovery-ffa-min");
        const max = document.getElementById("discovery-ffa-max");
        if (min && ffaCriteria.minPlayers !== null)
          min.value = String(ffaCriteria.minPlayers);
        if (max && ffaCriteria.maxPlayers !== null)
          max.value = String(ffaCriteria.maxPlayers);
      }
      if (teamCriteria[0]) {
        const min = document.getElementById("discovery-team-min");
        const max = document.getElementById("discovery-team-max");
        if (min && teamCriteria[0].minPlayers !== null)
          min.value = String(teamCriteria[0].minPlayers);
        if (max && teamCriteria[0].maxPlayers !== null)
          max.value = String(teamCriteria[0].maxPlayers);
        this.setTeamCountSelections(teamCriteria.map((c) => c.teamCount));
      }
      const modifiers = (ffaCriteria ?? teamCriteria[0])?.modifiers;
      if (modifiers) {
        this.setModifierState("modifier-isCompact", modifiers.isCompact ?? "any");
        this.setModifierState("modifier-isRandomSpawn", modifiers.isRandomSpawn ?? "any");
        this.setModifierState("modifier-isCrowded", modifiers.isCrowded ?? "any");
        this.setModifierState("modifier-isHardNations", modifiers.isHardNations ?? "any");
        this.setModifierState("modifier-isAlliancesDisabled", modifiers.isAlliancesDisabled ?? "any");
        this.setModifierState("modifier-isNukesDisabled", modifiers.isNukesDisabled ?? "any");
        this.setModifierState("modifier-isSAMsDisabled", modifiers.isSAMsDisabled ?? "any");
        this.setModifierState("modifier-isPeaceTime", modifiers.isPeaceTime ?? "any");
        this.setModifierState("modifier-isWaterNukes", modifiers.isWaterNukes ?? "any");
        this.setModifierState("modifier-isDoomsdayClock", modifiers.isDoomsdayClock ?? "any");
        this.setModifierState("modifier-isTrusted", modifiers.isTrusted ?? "any");
        for (const value of STARTING_GOLD_VALUES) {
          this.setModifierState(
            `modifier-startingGold-${value}`,
            modifiers.startingGold?.[value] ?? "any"
          );
        }
        for (const value of GOLD_MULTIPLIER_VALUES) {
          this.setModifierState(
            `modifier-goldMultiplier-${value}`,
            modifiers.goldMultiplier?.[value] ?? "any"
          );
        }
      }
      const soundCheckbox = document.getElementById("discovery-sound-toggle");
      if (soundCheckbox) {
        soundCheckbox.checked = this.soundEnabled;
        this.setIconButtonState("discovery-sound-toggle", this.soundEnabled);
      }
      const desktopCheckbox = document.getElementById("discovery-desktop-toggle");
      if (desktopCheckbox) {
        desktopCheckbox.checked = this.desktopNotificationsEnabled;
        this.setIconButtonState("discovery-desktop-toggle", this.desktopNotificationsEnabled);
      }
      const twoTimes = document.getElementById("discovery-team-two-times");
      if (twoTimes) {
        twoTimes.checked = this.isTeamTwoTimesMinEnabled;
        this.syncChipState("discovery-team-two-times");
      }
      this.syncMapChips();
      const hostedToggle = document.getElementById("discovery-hosted-toggle");
      if (hostedToggle) {
        hostedToggle.checked = this.includeHostedAndCustomLobbies;
        this.syncChipState("discovery-hosted-toggle");
      }
      this.updateFilterCount();
      this.updateStatusLabel();
    }
    setTeamCountSelections(values) {
      for (const teamCount of values) {
        let checkbox = null;
        if (teamCount === "Humans Vs Nations")
          checkbox = document.getElementById("discovery-team-hvn");
        else if (teamCount === "8+")
          checkbox = document.getElementById("discovery-team-8plus");
        else if (typeof teamCount === "number")
          checkbox = document.getElementById(`discovery-team-${teamCount}`);
        if (checkbox) {
          checkbox.checked = true;
          this.syncChipState(checkbox.id);
        }
      }
    }
    refreshCriteria() {
      this.criteriaList = this.buildCriteriaFromUI();
      this.saveSettings();
      this.updateFilterCount();
      this.updateLobbyBoard(this.lastLobbies);
      this.syncSearchTimer({ resetStart: true });
    }
    resetAll() {
      const ffaCheckbox = document.getElementById("discovery-ffa");
      const teamCheckbox = document.getElementById("discovery-team");
      if (ffaCheckbox) {
        ffaCheckbox.checked = false;
        this.syncChipState("discovery-ffa");
        this.setModePanelActive("discovery-ffa-config", false);
      }
      if (teamCheckbox) {
        teamCheckbox.checked = false;
        this.syncChipState("discovery-team");
        this.setModePanelActive("discovery-team-config", false);
      }
      this.setAllTeamCounts(false);
      const twoTimes = document.getElementById("discovery-team-two-times");
      if (twoTimes) {
        twoTimes.checked = false;
        this.syncChipState("discovery-team-two-times");
        this.isTeamTwoTimesMinEnabled = false;
      }
      for (const id of MODIFIER_BOOLEAN_IDS)
        this.setModifierState(id, "any");
      for (const v of STARTING_GOLD_VALUES)
        this.setModifierState(`modifier-startingGold-${v}`, "any");
      for (const v of GOLD_MULTIPLIER_VALUES)
        this.setModifierState(`modifier-goldMultiplier-${v}`, "any");
      this.mapFilter = {};
      this.syncMapChips();
      this.ffaSlider?.setRange(1, 125);
      this.teamSlider?.setRange(TEAM_MIN_PLAYERS_PER_TEAM, TEAM_MAX_PLAYERS_PER_TEAM);
      this.teamSlider?.applyLockState();
      this.refreshCriteria();
    }
    async handleDesktopNotificationToggleChange(desktopToggle) {
      const requestId = ++this.desktopNotificationRequestId;
      if (!desktopToggle.checked) {
        this.desktopNotificationsEnabled = false;
        this.setIconButtonState("discovery-desktop-toggle", false);
        this.saveSettings();
        return;
      }
      const granted = await BrowserNotificationUtils.ensurePermission();
      if (requestId !== this.desktopNotificationRequestId || this.isDisposed || !desktopToggle.isConnected || !desktopToggle.checked) {
        return;
      }
      this.desktopNotificationsEnabled = granted;
      desktopToggle.checked = granted;
      desktopToggle.toggleAttribute("checked", granted);
      this.setIconButtonState("discovery-desktop-toggle", granted);
      this.saveSettings();
    }
    setupEventListeners() {
      document.getElementById("discovery-status")?.addEventListener("click", () => {
        this.setDiscoveryEnabled(!this.discoveryEnabled, { resetTimer: true });
      });
      for (const [checkboxId, configId] of [
        ["discovery-ffa", "discovery-ffa-config"],
        ["discovery-team", "discovery-team-config"]
      ]) {
        const checkbox = document.getElementById(checkboxId);
        checkbox?.addEventListener("change", () => {
          this.syncChipState(checkboxId);
          this.setModePanelActive(configId, checkbox.checked);
          this.refreshCriteria();
        });
      }
      const twoTimesCheckbox = document.getElementById("discovery-team-two-times");
      twoTimesCheckbox?.addEventListener("change", () => {
        this.isTeamTwoTimesMinEnabled = twoTimesCheckbox.checked;
        this.syncChipState("discovery-team-two-times");
        this.teamSlider?.applyLockState();
        this.refreshCriteria();
      });
      for (const section of PANEL_SECTIONS) {
        document.getElementById(`discovery-${section}-toggle`)?.addEventListener("click", () => {
          this.collapsedSections[section] = !this.collapsedSections[section];
          GM_setValue(STORAGE_KEYS.lobbyDiscoveryCollapsedSections, this.collapsedSections);
          this.applySectionCollapse(section);
        });
      }
      const mapsSearch = document.getElementById("discovery-maps-search");
      mapsSearch?.addEventListener("input", () => this.filterMapChips(mapsSearch.value));
      document.getElementById("discovery-maps-clear")?.addEventListener("click", () => {
        this.setMapFilter({});
      });
      for (const chip of this.getMapChips()) {
        chip.addEventListener("click", () => this.cycleMapState(chip));
      }
      const hostedToggle = document.getElementById("discovery-hosted-toggle");
      hostedToggle?.addEventListener("change", () => {
        this.includeHostedAndCustomLobbies = hostedToggle.checked;
        this.syncChipState("discovery-hosted-toggle");
        this.saveSettings();
        this.processLobbies(this.lastLobbies);
      });
      document.getElementById("discovery-reset")?.addEventListener("click", () => {
        this.resetAll();
      });
      for (const id of [...ALL_TEAM_IDS, "discovery-sound-toggle", "discovery-desktop-toggle"]) {
        const element = document.getElementById(id);
        if (!element)
          continue;
        element.addEventListener("change", () => {
          if (id === "discovery-sound-toggle") {
            this.soundEnabled = element.checked;
            this.setIconButtonState("discovery-sound-toggle", element.checked);
            this.saveSettings();
            return;
          }
          if (id === "discovery-desktop-toggle") {
            void this.handleDesktopNotificationToggleChange(element);
            return;
          }
          this.syncChipState(id);
          this.refreshCriteria();
        });
      }
      const allModifierIds = [
        ...MODIFIER_BOOLEAN_IDS,
        ...STARTING_GOLD_VALUES.map((v) => `modifier-startingGold-${v}`),
        ...GOLD_MULTIPLIER_VALUES.map((v) => `modifier-goldMultiplier-${v}`)
      ];
      for (const id of allModifierIds) {
        const button = document.getElementById(id);
        button?.addEventListener("click", () => {
          this.cycleModifierState(id);
          this.refreshCriteria();
        });
      }
    }
    renderModeButton(id, label) {
      return `
      <label class="ld-mode-btn" aria-pressed="false">
        <input type="checkbox" id="${id}" value="${id === "discovery-ffa" ? "FFA" : "Team"}">
        <span class="check">${ICON_CHECK}</span>
        <span>${label}</span>
      </label>
    `;
    }
    renderChip(id, value, label) {
      return `
      <label class="ld-chip" aria-pressed="false">
        <input type="checkbox" id="${id}" value="${value}">${label}
      </label>
    `;
    }
    renderModifierChip(id, name) {
      return `
      <button type="button" class="ld-mod" id="${id}" data-state="any" data-mod-name="${name}" aria-pressed="false" aria-label="${name}">
        <span class="ld-mod-ind"></span>
        <span class="ld-mod-name">${name}</span>
      </button>
    `;
    }
    renderSectionToggle(section, label, asideHtml) {
      return `
      <button type="button" class="ld-section-head ld-section-toggle" id="discovery-${section}-toggle" aria-expanded="true" aria-controls="discovery-${section}-body">
        <span class="ld-section-label">${label}</span>
        <span class="ld-section-head-end">${asideHtml}<span class="ld-section-chevron" aria-hidden="true"></span></span>
      </button>
    `;
    }
    applySectionCollapse(section) {
      const collapsed = this.collapsedSections[section];
      const body = document.getElementById(`discovery-${section}-body`);
      if (body)
        body.hidden = collapsed;
      document.getElementById(`discovery-${section}-toggle`)?.setAttribute("aria-expanded", String(!collapsed));
    }
    renderMapChip(gameMap, name) {
      const safeName = escapeHtml(name);
      return `
      <button type="button" class="ld-mod" data-game-map="${escapeHtml(gameMap)}" data-state="any" data-mod-name="${safeName}" aria-pressed="false" aria-label="${safeName}">
        <span class="ld-mod-ind"></span>
        <span class="ld-mod-name">${safeName}</span>
      </button>
    `;
    }
    renderMapGroup(category, chipsHtml) {
      return `
      <div class="ld-mod-group" data-category="${category}">
        <div class="ld-mod-group-label">${MAP_CATEGORY_LABELS[category]}</div>
        <div class="ld-mods">${chipsHtml}</div>
      </div>
    `;
    }
    renderMapGroups() {
      return MAP_CATEGORY_ORDER.map((category) => {
        const entries = MAP_CATALOGUE.filter((entry) => entry.categories.includes(category));
        if (entries.length === 0)
          return "";
        return this.renderMapGroup(
          category,
          entries.map((entry) => this.renderMapChip(entry.gameMap, entry.name)).join("")
        );
      }).join("");
    }
    renderIconButton(id, title, svg) {
      return `
      <label class="ld-icon-btn" title="${title}" aria-label="${title}">
        <input type="checkbox" id="${id}">${svg}
      </label>
    `;
    }
    createUI() {
      if (document.getElementById("openfront-discovery-panel"))
        return;
      this.panel = document.createElement("div");
      this.panel.id = "openfront-discovery-panel";
      this.panel.className = "of-panel discovery-panel";
      this.panel.style.width = "380px";
      this.panel.innerHTML = `
      <div class="ld-status">
        <span class="ld-pulse" aria-hidden="true"></span>
        <div class="ld-status-text" id="discovery-status" role="button" tabindex="0">
          <strong>Discovery active</strong>
          <span class="sep">\xB7</span>
          <span class="meta" id="discovery-search-timer"></span>
        </div>
        <div class="ld-icons">
          ${this.renderIconButton("discovery-sound-toggle", "Sound alert", ICON_SOUND)}
          ${this.renderIconButton("discovery-desktop-toggle", "Desktop notification", ICON_BELL)}
        </div>
      </div>
      <div class="ld-head">
        <div class="ld-eyebrow">Notify + quick-join \xB7 never auto-joins</div>
        <h2 class="ld-title">OpenFront Game Notifier</h2>
      </div>
      <div class="discovery-body">
        <div class="discovery-content" style="overflow-y: auto;">
          <div class="ld-section">
            ${this.renderSectionToggle("modes", "Modes", '<span class="ld-section-aside">Pick one or both</span>')}
            <div class="ld-section-body" id="discovery-modes-body">
            <div class="ld-modes">
              ${this.renderModeButton("discovery-ffa", "FFA")}
              ${this.renderModeButton("discovery-team", "Teams")}
            </div>

            <div class="ld-mode-panel" id="discovery-ffa-config">
              <div class="ld-mode-panel-head">
                <span class="dot"></span>
                <span class="title">FFA \xB7 Lobby capacity</span>
              </div>
              <div class="ld-slider-row" id="discovery-ffa-slider-row">
                <div class="ld-slider-label">
                  <span>Players</span>
                  <span class="val">
                    <div class="ld-stepper" data-role="min">
                      <button type="button" class="ld-step-btn" data-action="dec" data-target="min" aria-label="Decrease minimum">\u2212</button>
                      <input type="number" id="discovery-ffa-min" min="1" max="125" value="1" inputmode="numeric">
                      <button type="button" class="ld-step-btn" data-action="inc" data-target="min" aria-label="Increase minimum">+</button>
                    </div>
                    <span class="sep">\u2013</span>
                    <div class="ld-stepper" data-role="max">
                      <button type="button" class="ld-step-btn" data-action="dec" data-target="max" aria-label="Decrease maximum">\u2212</button>
                      <input type="number" id="discovery-ffa-max" min="1" max="125" value="125" inputmode="numeric">
                      <button type="button" class="ld-step-btn" data-action="inc" data-target="max" aria-label="Increase maximum">+</button>
                    </div>
                  </span>
                </div>
                <div class="ld-range" id="discovery-ffa-range-root">
                  <div class="track"><div class="track-fill" id="discovery-ffa-range-fill"></div></div>
                  <input type="range" id="discovery-ffa-min-slider" min="0" max="1000" value="0" class="capacity-slider capacity-slider-min">
                  <input type="range" id="discovery-ffa-max-slider" min="0" max="1000" value="1000" class="capacity-slider capacity-slider-max">
                </div>
              </div>
            </div>

            <div class="ld-mode-panel" id="discovery-team-config">
              <div class="ld-mode-panel-head">
                <span class="dot"></span>
                <span class="title">Teams \xB7 Format & size</span>
              </div>
              <div class="ld-format-label">FORMAT</div>
              <div class="ld-formats">
                ${this.renderChip("discovery-team-hvn", "Humans Vs Nations", "Humans Vs Nations")}
              </div>
              <div class="ld-format-label" style="margin-top: 10px;">NUMBER OF TEAMS</div>
              <div class="ld-formats" style="margin-bottom: 14px;">
                ${this.renderChip("discovery-team-2", "2", "2")}
                ${this.renderChip("discovery-team-3", "3", "3")}
                ${this.renderChip("discovery-team-4", "4", "4")}
                ${this.renderChip("discovery-team-5", "5", "5")}
                ${this.renderChip("discovery-team-6", "6", "6")}
                ${this.renderChip("discovery-team-7", "7", "7")}
                ${this.renderChip("discovery-team-8plus", "8+", "8+")}
              </div>
              <div class="ld-slider-row" id="discovery-team-slider-row">
                <div class="ld-slider-label">
                  <span>Players per team</span>
                  <span class="val">
                    <div class="ld-stepper" data-role="min">
                      <button type="button" class="ld-step-btn" data-action="dec" data-target="min" aria-label="Decrease minimum">\u2212</button>
                      <input type="number" id="discovery-team-min" min="2" max="62" value="2" inputmode="numeric">
                      <button type="button" class="ld-step-btn" data-action="inc" data-target="min" aria-label="Increase minimum">+</button>
                    </div>
                    <span class="sep">\u2013</span>
                    <div class="ld-stepper" data-role="max">
                      <button type="button" class="ld-step-btn" data-action="dec" data-target="max" aria-label="Decrease maximum">\u2212</button>
                      <input type="number" id="discovery-team-max" min="2" max="62" value="62" inputmode="numeric">
                      <button type="button" class="ld-step-btn" data-action="inc" data-target="max" aria-label="Increase maximum">+</button>
                    </div>
                  </span>
                </div>
                <div class="ld-range" id="discovery-team-range-root">
                  <div class="track"><div class="track-fill" id="discovery-team-range-fill"></div></div>
                  <input type="range" id="discovery-team-min-slider" min="0" max="1000" value="0" class="capacity-slider capacity-slider-min">
                  <input type="range" id="discovery-team-max-slider" min="0" max="1000" value="1000" class="capacity-slider capacity-slider-max">
                </div>
                <div class="ld-ticks" id="discovery-team-ticks"></div>
              </div>
              <label class="ld-2x" aria-pressed="false">
                <input type="checkbox" id="discovery-team-two-times">
                <span class="check">${ICON_CHECK}</span>
                <span class="lbl"><strong>Lock max-per-team to 2\xD7 the min</strong></span>
              </label>
              <div class="ld-current-game-info" id="discovery-current-game-info" style="display: none;"></div>
            </div>
            </div>
          </div>

          <div class="ld-section">
            ${this.renderSectionToggle(
        "modifiers",
        "Modifiers",
        `<span class="ld-mods-legend">
                <span class="key"><span class="swatch"></span>Any</span>
                <span class="key"><span class="swatch req"></span>Req</span>
                <span class="key"><span class="swatch blk"></span>Excl</span>
              </span>`
      )}
            <div class="ld-section-body" id="discovery-modifiers-body">

            <div class="ld-mod-group">
              <div class="ld-mod-group-label">Map</div>
              <div class="ld-mods discovery-modifier-grid">
                ${this.renderModifierChip("modifier-isCompact", "Compact")}
                ${this.renderModifierChip("modifier-isRandomSpawn", "Random Spawn")}
                ${this.renderModifierChip("modifier-isCrowded", "Crowded")}
                ${this.renderModifierChip("modifier-isHardNations", "Hard Nations")}
              </div>
            </div>

            <div class="ld-mod-group">
              <div class="ld-mod-group-label">Gameplay</div>
              <div class="ld-mods">
                ${this.renderModifierChip("modifier-isAlliancesDisabled", "Alliances Off")}
                ${this.renderModifierChip("modifier-isNukesDisabled", "Nukes Off")}
                ${this.renderModifierChip("modifier-isSAMsDisabled", "SAMs Off")}
                ${this.renderModifierChip("modifier-isPeaceTime", "Peace Time")}
                ${this.renderModifierChip("modifier-isWaterNukes", "Water Nukes")}
                ${this.renderModifierChip("modifier-isDoomsdayClock", "Doomsday Clock")}
                ${this.renderModifierChip("modifier-isTrusted", "Trusted")}
              </div>
            </div>

            <div class="ld-mod-group">
              <div class="ld-mod-group-label">Economy</div>
              <div class="ld-mods">
                ${this.renderModifierChip("modifier-startingGold-1000000", "Start Gold 1M")}
                ${this.renderModifierChip("modifier-startingGold-5000000", "Start Gold 5M")}
                ${this.renderModifierChip("modifier-startingGold-25000000", "Start Gold 25M")}
                ${this.renderModifierChip("modifier-goldMultiplier-2", "Gold \xD72")}
              </div>
            </div>

            <div class="ld-mods-hint">
              Click to cycle <strong>Any</strong> \u2192 <strong class="req">Required</strong> \u2192 <strong class="blk">Excluded</strong>.
            </div>
            </div>
          </div>

          <div class="ld-section">
            ${this.renderSectionToggle("maps", "Maps", '<span class="ld-section-aside" id="discovery-maps-summary">Any map</span>')}
            <div class="ld-section-body" id="discovery-maps-body">
              <div class="ld-maps-tools">
                <input type="search" id="discovery-maps-search" class="ld-maps-search" placeholder="Search maps" aria-label="Search maps">
                <button type="button" class="ld-maps-clear" id="discovery-maps-clear">Clear</button>
              </div>
              <div id="discovery-maps-groups">${this.renderMapGroups()}</div>
              <div class="ld-mods-hint">
                Applies to every mode. With a <strong class="req">Required</strong> map, only required maps match.
              </div>
            </div>
          </div>

          <div class="ld-section">
            ${this.renderSectionToggle("lobbies", "Lobbies", "")}
            <div class="ld-section-body" id="discovery-lobbies-body">
              <label class="ld-2x" aria-pressed="false">
                <input type="checkbox" id="discovery-hosted-toggle">
                <span class="check">${ICON_CHECK}</span>
                <span class="lbl"><strong>Include hosted and custom lobbies</strong></span>
              </label>
            </div>
          </div>
        </div>
        <div class="discovery-footer">
          <div class="summary">
            <span class="num" id="discovery-filter-count">0</span>
            <span>active <span id="discovery-filter-word">filters</span></span>
          </div>
          <button type="button" class="reset" id="discovery-reset">Reset all</button>
        </div>
      </div>
    `;
      document.body.appendChild(this.panel);
      this.setupEventListeners();
      this.loadUIFromSettings();
      for (const section of PANEL_SECTIONS)
        this.applySectionCollapse(section);
      this.ffaSlider = new RangeSlider({
        containerId: "discovery-ffa-slider-row",
        rangeRootId: "discovery-ffa-range-root",
        minSliderId: "discovery-ffa-min-slider",
        maxSliderId: "discovery-ffa-max-slider",
        minInputId: "discovery-ffa-min",
        maxInputId: "discovery-ffa-max",
        fillId: "discovery-ffa-range-fill",
        bounds: { min: 1, max: 125 },
        onChange: () => this.refreshCriteria()
      });
      this.teamSlider = new RangeSlider({
        containerId: "discovery-team-slider-row",
        rangeRootId: "discovery-team-range-root",
        minSliderId: "discovery-team-min-slider",
        maxSliderId: "discovery-team-max-slider",
        minInputId: "discovery-team-min",
        maxInputId: "discovery-team-max",
        fillId: "discovery-team-range-fill",
        ticksContainerId: "discovery-team-ticks",
        bounds: {
          min: TEAM_MIN_PLAYERS_PER_TEAM,
          max: TEAM_MAX_PLAYERS_PER_TEAM
        },
        stops: TEAM_PLAYERS_PER_TEAM_STOPS,
        lockMaxToTwiceMin: () => this.isTeamTwoTimesMinEnabled,
        onChange: () => this.refreshCriteria()
      });
      this.updateStatusLabel();
      this.updateFilterCount();
      this.syncSearchTimer();
      this.startGameInfoUpdates();
    }
    updateSleepState() {
      const onLobby = LobbyUtils.isOnLobbyPage();
      this.sleeping = !onLobby;
      if (this.sleeping) {
        this.panel.classList.add("hidden");
        this.stopTimer();
        this.stopGameInfoUpdates();
        this.updateQueueCardPulses(/* @__PURE__ */ new Set());
        this.updateSeeAllSignals(false, /* @__PURE__ */ new Set());
        this.hideUpcomingStrip();
        this.lobbyBoard.hide();
      } else {
        this.panel.classList.remove("hidden");
        this.syncSearchTimer();
        this.startGameInfoUpdates();
        this.updateLobbyBoard(this.lastLobbies);
      }
    }
    cleanup() {
      this.isDisposed = true;
      this.stopTimer();
      this.stopGameInfoUpdates();
      if (this.pulseSyncTimeout) {
        clearTimeout(this.pulseSyncTimeout);
        this.pulseSyncTimeout = null;
      }
      this.activeMatchSources.clear();
      this.applyQueueCardPulses();
      this.updateSeeAllSignals(false, /* @__PURE__ */ new Set());
      this.seeAllObserver?.disconnect();
      this.seeAllObserver = null;
      this.observedSeeAllView = null;
      this.upcomingStrip?.parentNode?.removeChild(this.upcomingStrip);
      this.upcomingStrip = null;
      this.lastUpcomingSlots = /* @__PURE__ */ new Map();
      this.lastUpcomingMatchSources = /* @__PURE__ */ new Set();
      this.upcomingSlotSignatures.clear();
      this.lobbyBoard.dispose();
      this.panel.parentNode?.removeChild(this.panel);
    }
  };

  // src/modules/lobby-discovery/CurrentPlayerHighlighter.ts
  var CurrentPlayerHighlighter = class {
    constructor() {
      this.observer = null;
      this.animationFrameId = null;
    }
    start() {
      if (this.observer) {
        return;
      }
      this.observer = new MutationObserver(() => this.scheduleApplyHighlights());
      this.observer.observe(document.body, {
        attributes: false,
        childList: true,
        subtree: true
      });
      this.applyHighlights();
    }
    stop() {
      this.observer?.disconnect();
      this.observer = null;
      if (this.animationFrameId !== null) {
        cancelAnimationFrame(this.animationFrameId);
        this.animationFrameId = null;
      }
    }
    scheduleApplyHighlights() {
      if (this.animationFrameId !== null) {
        return;
      }
      this.animationFrameId = requestAnimationFrame(() => {
        this.animationFrameId = null;
        this.applyHighlights();
      });
    }
    applyHighlights() {
      for (const view of Array.from(document.querySelectorAll("lobby-player-view"))) {
        this.applyHighlightToView(view);
      }
    }
    applyHighlightToView(view) {
      this.clearHighlights(view);
      const nativeFfaRows = Array.from(
        view.querySelectorAll(".player-tag.current-player")
      );
      if (nativeFfaRows.length > 0) {
        nativeFfaRows.forEach((row) => row.classList.add("of-current-player-boost"));
        return;
      }
      const nativeTeamRows = this.getNativeTeamRows(view);
      nativeTeamRows.forEach((row) => row.classList.add("of-current-player-boost"));
      const nativeTeamCards = this.getNativeTeamCards(view);
      nativeTeamCards.forEach((card) => card.classList.add("of-current-player-team-boost"));
      if (nativeTeamRows.length > 0 || nativeTeamCards.length > 0) {
        return;
      }
      this.applyFallbackHighlight(view);
    }
    clearHighlights(view) {
      view.querySelectorAll(".of-current-player-boost").forEach((element) => {
        element.classList.remove("of-current-player-boost");
      });
      view.querySelectorAll(".of-current-player-team-boost").forEach((element) => {
        element.classList.remove("of-current-player-team-boost");
      });
    }
    getNativeTeamRows(view) {
      return Array.from(view.querySelectorAll("div")).filter((element) => {
        const classList = element.classList;
        return classList.contains("bg-sky-600/20") && classList.contains("border-sky-500/40");
      });
    }
    getNativeTeamCards(view) {
      return Array.from(view.querySelectorAll("div")).filter((element) => {
        const classList = element.classList;
        return classList.contains("rounded-xl") && classList.contains("border-sky-500/60");
      });
    }
    applyFallbackHighlight(view) {
      const currentClientID = view.currentClientID;
      const clients = Array.isArray(view.clients) ? view.clients : [];
      if (!currentClientID || clients.length === 0) {
        return;
      }
      const currentClientIndex = clients.findIndex(
        (client) => client?.clientID === currentClientID
      );
      if (currentClientIndex < 0) {
        return;
      }
      const currentClient = clients[currentClientIndex];
      const displayName = this.formatDisplayName(currentClient);
      const ffaRows = Array.from(view.querySelectorAll(".player-tag"));
      if (ffaRows[currentClientIndex]) {
        ffaRows[currentClientIndex].classList.add("of-current-player-boost");
        return;
      }
      const exactRows = Array.from(view.querySelectorAll("[data-client-id]")).filter(
        (row) => row.dataset.clientId === currentClientID
      );
      exactRows.forEach((row) => row.classList.add("of-current-player-boost"));
      const matchingTextRows = this.findRowsByDisplayName(view, displayName);
      matchingTextRows.forEach((row) => row.classList.add("of-current-player-boost"));
      const teamCards = Array.from(view.querySelectorAll(".rounded-xl"));
      const teamPreview = Array.isArray(view.teamPreview) ? view.teamPreview : [];
      const activePreviews = teamPreview.filter(
        (preview) => Array.isArray(preview.players) && preview.players.length > 0
      );
      const currentTeamIndex = activePreviews.findIndex(
        (preview) => Array.isArray(preview.players) && preview.players.some((player) => player?.clientID === currentClientID)
      );
      if (currentTeamIndex >= 0 && teamCards[currentTeamIndex]) {
        teamCards[currentTeamIndex].classList.add("of-current-player-team-boost");
        const cardRows = this.findRowsByDisplayName(teamCards[currentTeamIndex], displayName);
        cardRows.forEach((row) => row.classList.add("of-current-player-boost"));
      }
    }
    formatDisplayName(client) {
      if (!client?.username) {
        return "";
      }
      return client.clanTag ? `[${client.clanTag}] ${client.username}` : client.username;
    }
    findRowsByDisplayName(root, displayName) {
      if (!displayName) {
        return [];
      }
      const matches = [];
      for (const element of Array.from(root.querySelectorAll("span, div"))) {
        const text = element.textContent?.trim();
        if (!text || text !== displayName) {
          continue;
        }
        const row = element.closest("[data-client-id]") ?? element.closest(".player-tag") ?? element.closest(".team-player-row") ?? element.closest("div");
        if (row && !matches.includes(row)) {
          matches.push(row);
        }
      }
      return matches;
    }
  };

  // src/main.ts
  (function() {
    "use strict";
    console.log("[OpenFront Game Notifier] Initializing adaptation for OpenFront 0.30...");
    GM_addStyle(getStyles());
    SoundUtils.preloadSounds();
    URLObserver.init();
    LobbyDataManager.start();
    const lobbyDiscovery = new LobbyDiscoveryUI();
    const currentPlayerHighlighter = new CurrentPlayerHighlighter();
    LobbyDataManager.subscribe((lobbies, serverTime) => {
      lobbyDiscovery.receiveLobbyUpdate(lobbies, serverTime);
    });
    currentPlayerHighlighter.start();
    const isLiveGameUrl = (url) => {
      try {
        return new URL(url).searchParams.has("live");
      } catch {
        return false;
      }
    };
    let wasLive = isLiveGameUrl(location.href);
    URLObserver.subscribe((url) => {
      const isLive = isLiveGameUrl(url);
      if (!wasLive && isLive && lobbyDiscovery.isSoundEnabled()) {
        SoundUtils.playGameStartSound();
      }
      wasLive = isLive;
    });
    console.log("[OpenFront Game Notifier] Ready! \u{1F680}");
  })();
})();
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsiLi4vc3JjL2NvbmZpZy90aGVtZS50cyIsICIuLi9zcmMvY29uZmlnL2NvbnN0YW50cy50cyIsICIuLi9zcmMvc3R5bGVzL2JvYXJkU3R5bGVzLnRzIiwgIi4uL3NyYy9zdHlsZXMvc3R5bGVzLnRzIiwgIi4uL3NyYy91dGlscy9Tb3VuZFV0aWxzLnRzIiwgIi4uL3NyYy91dGlscy9VUkxPYnNlcnZlci50cyIsICIuLi9zcmMvZGF0YS9Mb2JieURhdGFNYW5hZ2VyLnRzIiwgIi4uL3NyYy91dGlscy9Mb2JieVV0aWxzLnRzIiwgIi4uL3NyYy91dGlscy9Ccm93c2VyTm90aWZpY2F0aW9uVXRpbHMudHMiLCAiLi4vc3JjL2NvbmZpZy9tYXBDYXRhbG9ndWUudHMiLCAiLi4vc3JjL21vZHVsZXMvbG9iYnktZGlzY292ZXJ5L0xvYmJ5RGlzY292ZXJ5SGVscGVycy50cyIsICIuLi9zcmMvbW9kdWxlcy9sb2JieS1kaXNjb3ZlcnkvTG9iYnlEaXNjb3ZlcnlFbmdpbmUudHMiLCAiLi4vc3JjL21vZHVsZXMvbG9iYnktZGlzY292ZXJ5L1JhbmdlU2xpZGVySGVscGVycy50cyIsICIuLi9zcmMvbW9kdWxlcy9sb2JieS1kaXNjb3ZlcnkvUmFuZ2VTbGlkZXIudHMiLCAiLi4vc3JjL21vZHVsZXMvbG9iYnktZGlzY292ZXJ5L0xvYmJ5Qm9hcmRIZWxwZXJzLnRzIiwgIi4uL3NyYy9tb2R1bGVzL2xvYmJ5LWRpc2NvdmVyeS9Mb2JieUJvYXJkVmlldy50cyIsICIuLi9zcmMvbW9kdWxlcy9sb2JieS1kaXNjb3ZlcnkvTG9iYnlEaXNjb3ZlcnlVSS50cyIsICIuLi9zcmMvbW9kdWxlcy9sb2JieS1kaXNjb3ZlcnkvQ3VycmVudFBsYXllckhpZ2hsaWdodGVyLnRzIiwgIi4uL3NyYy9tYWluLnRzIl0sCiAgInNvdXJjZXNDb250ZW50IjogWyIvKipcbiAqIERlc2lnbiBzeXN0ZW0gdG9rZW5zIGZvciBjb25zaXN0ZW50IHRoZW1pbmcuXG4gKiBXYXJtLW5ldXRyYWwgZGFyayBwYWxldHRlIHdpdGggYSBibHVlIGFjY2VudC5cbiAqL1xuXG5leHBvcnQgY29uc3QgQ09MT1JTID0ge1xuICBiZ1ByaW1hcnk6ICcjMGQwZjEwJyxcbiAgYmdTZWNvbmRhcnk6ICcjMTQxNzFhJyxcbiAgYmdFbGV2YXRlZDogJyMxYTFlMjInLFxuICBiZ1JhaXNlZDogJyMyMDI1MmEnLFxuICBiZ0hvdmVyOiAncmdiYSgyNTUsMjU1LDI1NSwwLjA0KScsXG5cbiAgdGV4dFByaW1hcnk6ICcjZjJmMWVlJyxcbiAgdGV4dFNlY29uZGFyeTogJyNjOGM2YzAnLFxuICB0ZXh0TXV0ZWQ6ICcjOGU4Yzg1JyxcbiAgdGV4dEZhaW50OiAnIzVhNTg1MycsXG5cbiAgYm9yZGVyOiAncmdiYSgyNTUsMjU1LDI1NSwwLjA2KScsXG4gIGJvcmRlclN1YnRsZTogJ3JnYmEoMjU1LDI1NSwyNTUsMC4xMCknLFxuICBib3JkZXJTdHJvbmc6ICdyZ2JhKDI1NSwyNTUsMjU1LDAuMTYpJyxcblxuICBhY2NlbnQ6ICcjN2FhN2Q0JyxcbiAgYWNjZW50U29mdDogJ3JnYmEoMTIyLDE2NywyMTIsMC4xNCknLFxuICBhY2NlbnRMaW5lOiAncmdiYSgxMjIsMTY3LDIxMiwwLjMyKScsXG4gIGFjY2VudFNoYWRvdzogJzEyMiwxNjcsMjEyJyxcblxuICB3YXJuaW5nOiAnI2Q0YTA1NicsXG4gIHdhcm5pbmdTb2Z0OiAncmdiYSgyMTIsMTYwLDg2LDAuMTQpJyxcbiAgZGFuZ2VyOiAnI2QyN2E2YicsXG4gIGRhbmdlclNvZnQ6ICdyZ2JhKDIxMCwxMjIsMTA3LDAuMTQpJyxcbiAgZGFuZ2VyTGluZTogJ3JnYmEoMjEwLDEyMiwxMDcsMC4zMCknLFxuXG4gIC8vIGxlZ2FjeSBhbGlhc2VzIFx1MjAxNCBrZXB0IHNvIG90aGVyIG1vZHVsZXMgY29tcGlsZSB1bmNoYW5nZWRcbiAgYWNjZW50TXV0ZWQ6ICdyZ2JhKDEyMiwxNjcsMjEyLDAuMTQpJyxcbiAgYWNjZW50SG92ZXI6ICcjOWJiZmUwJyxcbiAgYWNjZW50QWx0OiAnIzliYmZlMCcsXG4gIGJvcmRlckFjY2VudDogJ3JnYmEoMTIyLDE2NywyMTIsMC4zMiknLFxuICBoaWdobGlnaHQ6ICdyZ2JhKDEyMiwxNjcsMjEyLDAuMjApJyxcbiAgc3VjY2VzczogJyM3NGM2OWQnLFxuICBzdWNjZXNzU29saWQ6ICcjNzRjNjlkJyxcbiAgZXJyb3I6ICcjZDI3YTZiJyxcbn0gYXMgY29uc3Q7XG5cbmV4cG9ydCBjb25zdCBGT05UUyA9IHtcbiAgYm9keTogXCInSW50ZXInLCBzeXN0ZW0tdWksIC1hcHBsZS1zeXN0ZW0sICdTZWdvZSBVSScsIHNhbnMtc2VyaWZcIixcbiAgZGlzcGxheTogXCInSW50ZXInLCBzeXN0ZW0tdWksIC1hcHBsZS1zeXN0ZW0sICdTZWdvZSBVSScsIHNhbnMtc2VyaWZcIixcbiAgbW9ubzogXCInSmV0QnJhaW5zIE1vbm8nLCB1aS1tb25vc3BhY2UsIFNGTW9uby1SZWd1bGFyLCBNZW5sbywgbW9ub3NwYWNlXCIsXG59IGFzIGNvbnN0O1xuXG5leHBvcnQgY29uc3QgU1BBQ0lORyA9IHtcbiAgeHM6ICc0cHgnLFxuICBzbTogJzhweCcsXG4gIG1kOiAnMTJweCcsXG4gIGxnOiAnMTZweCcsXG4gIHhsOiAnMjBweCcsXG4gIHh4bDogJzI0cHgnLFxufSBhcyBjb25zdDtcblxuZXhwb3J0IGNvbnN0IFJBRElVUyA9IHtcbiAgc206ICc2cHgnLFxuICBtZDogJzdweCcsXG4gIGxnOiAnMTBweCcsXG4gIHhsOiAnMTRweCcsXG59IGFzIGNvbnN0O1xuXG5leHBvcnQgY29uc3QgU0hBRE9XUyA9IHtcbiAgc206ICcwIDFweCAzcHggcmdiYSgwLDAsMCwwLjQpJyxcbiAgbWQ6ICcwIDJweCA4cHggcmdiYSgwLDAsMCwwLjMpJyxcbiAgbGc6ICcwIDFweCAwIHJnYmEoMjU1LDI1NSwyNTUsMC4wNCkgaW5zZXQsIDAgMjRweCA0OHB4IHJnYmEoMCwwLDAsMC40NSksIDAgMnB4IDhweCByZ2JhKDAsMCwwLDAuMyknLFxufSBhcyBjb25zdDtcblxuZXhwb3J0IGNvbnN0IFRJTUlORyA9IHtcbiAgZmFzdDogJzAuMTJzJyxcbiAgbm9ybWFsOiAnMC4ycycsXG4gIHNsb3c6ICcwLjNzJyxcbn0gYXMgY29uc3Q7XG4iLCAiLyoqXG4gKiBBcHBsaWNhdGlvbi13aWRlIGNvbmZpZ3VyYXRpb24gY29uc3RhbnRzXG4gKi9cblxuZXhwb3J0IGNvbnN0IENPTkZJRyA9IHtcbiAgdGhyZWFkQ291bnQ6IDIwLFxufSBhcyBjb25zdDtcblxuLyoqXG4gKiBTdG9yYWdlIGtleXMgZm9yIEdNX2dldFZhbHVlL0dNX3NldFZhbHVlXG4gKiBVc2luZyBjZW50cmFsaXplZCBrZXlzIHByZXZlbnRzIHR5cG9zIGFuZCBtYWtlcyByZWZhY3RvcmluZyBlYXNpZXJcbiAqL1xuZXhwb3J0IGNvbnN0IFNUT1JBR0VfS0VZUyA9IHtcbiAgbG9iYnlEaXNjb3ZlcnlTZXR0aW5nczogXCJPRl9MT0JCWV9ESVNDT1ZFUllfU0VUVElOR1NcIixcbiAgbG9iYnlEaXNjb3ZlcnlDb2xsYXBzZWRTZWN0aW9uczogXCJPRl9MT0JCWV9ESVNDT1ZFUllfQ09MTEFQU0VEX1NFQ1RJT05TXCIsXG59IGFzIGNvbnN0O1xuXG4vKipcbiAqIFotaW5kZXggbGF5ZXJzIGZvciBVSSBlbGVtZW50c1xuICovXG5leHBvcnQgY29uc3QgWl9JTkRFWCA9IHtcbiAgcGFuZWw6IDk5OTgsXG4gIHBhbmVsT3ZlcmxheTogOTk5OSxcbiAgbW9kYWw6IDEwMDAwLFxuICBub3RpZmljYXRpb246IDIwMDAwLFxufSBhcyBjb25zdDtcblxuLyoqXG4gKiBUeXBlIGhlbHBlciBmb3Igc3RvcmFnZSBrZXlzXG4gKi9cbmV4cG9ydCB0eXBlIFN0b3JhZ2VLZXkgPSB0eXBlb2YgU1RPUkFHRV9LRVlTW2tleW9mIHR5cGVvZiBTVE9SQUdFX0tFWVNdO1xuXG4vKipcbiAqIFN0b3BzIGZvciB0aGUgXCJQbGF5ZXJzIHBlciB0ZWFtXCIgc2xpZGVyIFx1MjAxNCBxdWFzaS1sb2dhcml0aG1pYyBzcGFjaW5nXG4gKiB3aXRoIGRlbnNlciBsb3ctZW5kIHJlc29sdXRpb24gdG8gbWF0Y2ggcmVhbC13b3JsZCB0ZWFtLWxvYmJ5IGRpc3RyaWJ1dGlvbi5cbiAqIFZhbHVlcyBtdXN0IGJlIHN0cmljdGx5IG1vbm90b25pY2FsbHkgaW5jcmVhc2luZy5cbiAqL1xuZXhwb3J0IGNvbnN0IFRFQU1fUExBWUVSU19QRVJfVEVBTV9TVE9QUyA9IFtcbiAgMiwgMywgNCwgNSwgNiwgOCwgMTAsIDE1LCAyMCwgMzAsIDYyLFxuXSBhcyBjb25zdDtcblxuLyoqXG4gKiBNaW5pbXVtIHBsYXllcnMtcGVyLXRlYW0gdmFsdWUuIDEtcGVyLXRlYW0gd291bGQgYmUgc29sbyAoRkZBKSwgc28gdGhlXG4gKiBmbG9vciBpcyAyLlxuICovXG5leHBvcnQgY29uc3QgVEVBTV9NSU5fUExBWUVSU19QRVJfVEVBTSA9IDI7XG5cbi8qKlxuICogTWF4aW11bSBwbGF5ZXJzLXBlci10ZWFtIHZhbHVlIChtYXRjaGVzIE9wZW5Gcm9udCdzIGxvYmJ5IGNhcGFjaXR5IGNlaWxpbmcpLlxuICovXG5leHBvcnQgY29uc3QgVEVBTV9NQVhfUExBWUVSU19QRVJfVEVBTSA9IDYyO1xuIiwgIi8qKlxuICogQ1NTIG9mIHRoZSBMb2JieSBCb2FyZC5cbiAqL1xuXG5pbXBvcnQgeyBDT0xPUlMsIEZPTlRTLCBSQURJVVMsIFRJTUlORyB9IGZyb20gJ0AvY29uZmlnL3RoZW1lJztcblxuZXhwb3J0IGZ1bmN0aW9uIGdldEJvYXJkU3R5bGVzKCk6IHN0cmluZyB7XG4gIHJldHVybiBgXG4gICAgLyogPT09PT09PT09PT09PT09PT09PT09IExvYmJ5IEJvYXJkID09PT09PT09PT09PT09PT09PT09PSAqL1xuICAgIC8qIFRoZSBib2FyZCBpcyBhIGNoaWxkIG9mIE9wZW5Gcm9udCdzIHBhZ2UgZ3JpZC4gSXQgc3BhbnMgZXZlcnkgY29sdW1uLCBhbmRcbiAgICAgICBpdCBicmVha3Mgb3V0IG9mIHRoZSBwYWdlIGNvbHVtbiB0byB0aGUgZnVsbCB3aWR0aCBvZiB0aGUgc2NyZWVuLiAqL1xuICAgIC5vZi1ib2FyZCB7XG4gICAgICBncmlkLWNvbHVtbjogMSAvIC0xO1xuICAgICAgZ3JpZC1yb3c6IDI7XG4gICAgICBib3gtc2l6aW5nOiBib3JkZXItYm94O1xuICAgICAgd2lkdGg6IGNhbGMoMTAwdncgLSAzMnB4KTtcbiAgICAgIG1hcmdpbi1sZWZ0OiBjYWxjKDUwJSAtIDUwdncgKyAxNnB4KTtcbiAgICAgIGJvcmRlcjogMXB4IHNvbGlkIHZhcigtLW9mLWh1ZC1saW5lLTIpO1xuICAgICAgYm9yZGVyLXJhZGl1czogJHtSQURJVVMueGx9O1xuICAgICAgYmFja2dyb3VuZDogcmdiYSgxNiwgMTAsIDI0LCAwLjkyKTtcbiAgICAgIGNvbG9yOiB2YXIoLS1vZi1odWQtdGV4dC0xKTtcbiAgICAgIGZvbnQtZmFtaWx5OiAke0ZPTlRTLmJvZHl9O1xuICAgICAgb3ZlcmZsb3c6IGhpZGRlbjtcbiAgICB9XG4gICAgLm9mLWJvYXJkLWhlYWQge1xuICAgICAgZGlzcGxheTogZmxleDtcbiAgICAgIGFsaWduLWl0ZW1zOiBjZW50ZXI7XG4gICAgICBnYXA6IDE0cHg7XG4gICAgICBwYWRkaW5nOiAxMHB4IDE2cHg7XG4gICAgICBib3JkZXItYm90dG9tOiAxcHggc29saWQgdmFyKC0tb2YtaHVkLWxpbmUtMSk7XG4gICAgfVxuICAgIC5vZi1ib2FyZC10aXRsZSB7XG4gICAgICBmb250LXdlaWdodDogODAwO1xuICAgICAgbGV0dGVyLXNwYWNpbmc6IDAuM3B4O1xuICAgIH1cbiAgICAub2YtYm9hcmQtdG90YWxzIHtcbiAgICAgIGZvbnQtc2l6ZTogMTJweDtcbiAgICAgIGNvbG9yOiB2YXIoLS1vZi1odWQtdGV4dC0yKTtcbiAgICB9XG4gICAgLm9mLWJvYXJkLWdyaWQge1xuICAgICAgZGlzcGxheTogZ3JpZDtcbiAgICAgIGdyaWQtdGVtcGxhdGUtY29sdW1uczogNTRweCByZXBlYXQoNCwgbWlubWF4KDAsIDFmcikpO1xuICAgICAgZ2FwOiA4cHggMTBweDtcbiAgICAgIGFsaWduLWl0ZW1zOiBzdHJldGNoO1xuICAgICAgcGFkZGluZzogMTRweCAxNnB4IDE2cHg7XG4gICAgfVxuICAgIC5vZi1ib2FyZC1jb2xoZWFkIHtcbiAgICAgIGRpc3BsYXk6IGZsZXg7XG4gICAgICBhbGlnbi1pdGVtczogYmFzZWxpbmU7XG4gICAgICBnYXA6IDhweDtcbiAgICAgIHBhZGRpbmc6IDJweCA0cHggNHB4O1xuICAgICAgZm9udC1zaXplOiAxMXB4O1xuICAgICAgZm9udC13ZWlnaHQ6IDgwMDtcbiAgICAgIGxldHRlci1zcGFjaW5nOiAxcHg7XG4gICAgICB0ZXh0LXRyYW5zZm9ybTogdXBwZXJjYXNlO1xuICAgICAgY29sb3I6IHZhcigtLW9mLWh1ZC10ZXh0LTMpO1xuICAgIH1cbiAgICAub2YtYm9hcmQtY29saGVhZCBiIHtcbiAgICAgIGZvbnQtc2l6ZTogMTNweDtcbiAgICAgIGxldHRlci1zcGFjaW5nOiAwLjZweDtcbiAgICAgIGNvbG9yOiB2YXIoLS1vZi1odWQtdGV4dC0xKTtcbiAgICB9XG4gICAgLm9mLWJvYXJkLWNvbGhlYWQgZW0ge1xuICAgICAgZm9udC1zdHlsZTogbm9ybWFsO1xuICAgICAgY29sb3I6IHZhcigtLW9mLWh1ZC1hY2NlbnQpO1xuICAgIH1cbiAgICAub2YtYm9hcmQtcm93bGFiZWwge1xuICAgICAgZGlzcGxheTogZmxleDtcbiAgICAgIGFsaWduLWl0ZW1zOiBjZW50ZXI7XG4gICAgICBqdXN0aWZ5LWNvbnRlbnQ6IGNlbnRlcjtcbiAgICAgIGJvcmRlci1yaWdodDogMXB4IHNvbGlkIHZhcigtLW9mLWh1ZC1saW5lLTEpO1xuICAgICAgZm9udC1zaXplOiAxMXB4O1xuICAgICAgZm9udC13ZWlnaHQ6IDgwMDtcbiAgICAgIGxldHRlci1zcGFjaW5nOiAwLjVweDtcbiAgICAgIGNvbG9yOiB2YXIoLS1vZi1odWQtdGV4dC00KTtcbiAgICB9XG4gICAgLm9mLWJvYXJkLXJvd2xhYmVsLWxpdmUge1xuICAgICAgY29sb3I6ICNlODYwMGM7XG4gICAgICB0ZXh0LXRyYW5zZm9ybTogdXBwZXJjYXNlO1xuICAgIH1cbiAgICAub2YtYm9hcmQtY2VsbCB7XG4gICAgICBtaW4td2lkdGg6IDA7XG4gICAgICBkaXNwbGF5OiBmbGV4O1xuICAgIH1cbiAgICAub2YtYm9hcmQtZW1wdHkge1xuICAgICAgZmxleDogMTtcbiAgICAgIG1pbi1oZWlnaHQ6IDg0cHg7XG4gICAgICBib3JkZXI6IDFweCBkYXNoZWQgdmFyKC0tb2YtaHVkLWxpbmUtMSk7XG4gICAgICBib3JkZXItcmFkaXVzOiAke1JBRElVUy5sZ307XG4gICAgfVxuXG4gICAgLm9mLWJvYXJkLWNhcmQge1xuICAgICAgcG9zaXRpb246IHJlbGF0aXZlO1xuICAgICAgZmxleDogMTtcbiAgICAgIG1pbi13aWR0aDogMDtcbiAgICAgIG1pbi1oZWlnaHQ6IDg0cHg7XG4gICAgICBkaXNwbGF5OiBmbGV4O1xuICAgICAgZmxleC1kaXJlY3Rpb246IGNvbHVtbjtcbiAgICAgIGp1c3RpZnktY29udGVudDogc3BhY2UtYmV0d2VlbjtcbiAgICAgIGFsaWduLWl0ZW1zOiBmbGV4LXN0YXJ0O1xuICAgICAgcGFkZGluZzogOHB4O1xuICAgICAgb3ZlcmZsb3c6IGhpZGRlbjtcbiAgICAgIGJvcmRlcjogMXB4IHNvbGlkIHZhcigtLW9mLWh1ZC1saW5lLTIpO1xuICAgICAgYm9yZGVyLXJhZGl1czogJHtSQURJVVMubGd9O1xuICAgICAgYmFja2dyb3VuZDogdmFyKC0tb2YtaHVkLWJnLTEpO1xuICAgICAgY29sb3I6ICNmZmY7XG4gICAgICB0ZXh0LWFsaWduOiBsZWZ0O1xuICAgICAgY3Vyc29yOiBwb2ludGVyO1xuICAgICAgdHJhbnNpdGlvbjogb3BhY2l0eSAke1RJTUlORy5ub3JtYWx9LCBib3JkZXItY29sb3IgJHtUSU1JTkcuZmFzdH07XG4gICAgfVxuICAgIC5vZi1ib2FyZC10aHVtYiB7XG4gICAgICBwb3NpdGlvbjogYWJzb2x1dGU7XG4gICAgICBpbnNldDogMDtcbiAgICAgIHotaW5kZXg6IDA7XG4gICAgICBwb2ludGVyLWV2ZW50czogbm9uZTtcbiAgICB9XG4gICAgLm9mLWJvYXJkLXRodW1iIGltZyB7XG4gICAgICB3aWR0aDogMTAwJTtcbiAgICAgIGhlaWdodDogMTAwJTtcbiAgICAgIG9iamVjdC1maXQ6IGNvdmVyO1xuICAgICAgb3BhY2l0eTogMC41NTtcbiAgICB9XG4gICAgLm9mLWJvYXJkLXRodW1iOjphZnRlciB7XG4gICAgICBjb250ZW50OiAnJztcbiAgICAgIHBvc2l0aW9uOiBhYnNvbHV0ZTtcbiAgICAgIGluc2V0OiAwO1xuICAgICAgYmFja2dyb3VuZDogbGluZWFyLWdyYWRpZW50KDE4MGRlZywgcmdiYSgxMCwgNiwgMTYsIDApIDMwJSwgcmdiYSgxMCwgNiwgMTYsIDAuODUpIDEwMCUpO1xuICAgIH1cbiAgICAub2YtYm9hcmQtYmFkZ2UsXG4gICAgLm9mLWJvYXJkLW1hcCB7XG4gICAgICBwb3NpdGlvbjogcmVsYXRpdmU7XG4gICAgICB6LWluZGV4OiAxO1xuICAgIH1cbiAgICAub2YtYm9hcmQtYmFkZ2Uge1xuICAgICAgcGFkZGluZzogMnB4IDZweDtcbiAgICAgIGJvcmRlcjogMXB4IHNvbGlkIHZhcigtLW9mLWh1ZC1saW5lLTMpO1xuICAgICAgYm9yZGVyLXJhZGl1czogNHB4O1xuICAgICAgYmFja2dyb3VuZDogcmdiYSgwLCAwLCAwLCAwLjYpO1xuICAgICAgZm9udC1zaXplOiAxMHB4O1xuICAgICAgZm9udC13ZWlnaHQ6IDgwMDtcbiAgICAgIGxldHRlci1zcGFjaW5nOiAwLjVweDtcbiAgICAgIHRleHQtdHJhbnNmb3JtOiB1cHBlcmNhc2U7XG4gICAgICBsaW5lLWhlaWdodDogMS4zO1xuICAgICAgd2hpdGUtc3BhY2U6IG5vd3JhcDtcbiAgICAgIGNvbG9yOiAjZGRkO1xuICAgIH1cbiAgICAub2YtYm9hcmQtYmFkZ2VbZGF0YS1jb3VudGRvd24tdG9dIHtcbiAgICAgIGJvcmRlci1jb2xvcjogdHJhbnNwYXJlbnQ7XG4gICAgICBiYWNrZ3JvdW5kOiAjZTg2MDBjO1xuICAgICAgY29sb3I6ICNmZmY7XG4gICAgICBmb250LWZhbWlseTogJHtGT05UUy5tb25vfTtcbiAgICB9XG4gICAgLm9mLWJvYXJkLW1hcCB7XG4gICAgICBtYXgtd2lkdGg6IDEwMCU7XG4gICAgICBvdmVyZmxvdzogaGlkZGVuO1xuICAgICAgdGV4dC1vdmVyZmxvdzogZWxsaXBzaXM7XG4gICAgICB3aGl0ZS1zcGFjZTogbm93cmFwO1xuICAgICAgZm9udC13ZWlnaHQ6IDgwMDtcbiAgICAgIGxldHRlci1zcGFjaW5nOiAwLjJweDtcbiAgICB9XG4gICAgLm9mLWJvYXJkLWNhcmQtbWF0Y2gge1xuICAgICAgYm9yZGVyLWNvbG9yOiAke0NPTE9SUy5hY2NlbnRMaW5lfTtcbiAgICAgIGJveC1zaGFkb3c6IGluc2V0IDAgMCAwIDFweCAke0NPTE9SUy5hY2NlbnRMaW5lfTtcbiAgICB9XG4gICAgLm9mLWJvYXJkLWNhcmQtZGltIHtcbiAgICAgIG9wYWNpdHk6IDAuNDI7XG4gICAgfVxuICAgIC5vZi1ib2FyZC1jYXJkLWRpbTpob3ZlciB7XG4gICAgICBvcGFjaXR5OiAwLjg7XG4gICAgfVxuICBgO1xufVxuIiwgIi8qKlxuICogQ1NTIHN0eWxlcyBmb3IgdGhlIHVzZXJzY3JpcHQgVUkuXG4gKiBVc2VzIENTUy1pbi1KUyB3aXRoIHRoZW1lIHRva2VucyBmb3IgY29uc2lzdGVudCBzdHlsaW5nLlxuICovXG5cbmltcG9ydCB7IENPTE9SUywgUkFESVVTLCBTSEFET1dTLCBUSU1JTkcsIEZPTlRTIH0gZnJvbSAnQC9jb25maWcvdGhlbWUnO1xuaW1wb3J0IHsgWl9JTkRFWCB9IGZyb20gJ0AvY29uZmlnL2NvbnN0YW50cyc7XG5pbXBvcnQgeyBnZXRCb2FyZFN0eWxlcyB9IGZyb20gJy4vYm9hcmRTdHlsZXMnO1xuXG5leHBvcnQgZnVuY3Rpb24gZ2V0U3R5bGVzKCk6IHN0cmluZyB7XG4gIHJldHVybiBgXG4gICAgOnJvb3Qge1xuICAgICAgLS1vZi1odWQtYWNjZW50OiAke0NPTE9SUy5hY2NlbnR9O1xuICAgICAgLS1vZi1odWQtYWNjZW50LXNvZnQ6ICR7Q09MT1JTLmFjY2VudFNvZnR9O1xuICAgICAgLS1vZi1odWQtYWNjZW50LWxpbmU6ICR7Q09MT1JTLmFjY2VudExpbmV9O1xuICAgICAgLS1vZi1odWQtYmctMDogJHtDT0xPUlMuYmdQcmltYXJ5fTtcbiAgICAgIC0tb2YtaHVkLWJnLTE6ICR7Q09MT1JTLmJnU2Vjb25kYXJ5fTtcbiAgICAgIC0tb2YtaHVkLWJnLTI6ICR7Q09MT1JTLmJnRWxldmF0ZWR9O1xuICAgICAgLS1vZi1odWQtYmctMzogJHtDT0xPUlMuYmdSYWlzZWR9O1xuICAgICAgLS1vZi1odWQtdGV4dC0xOiAke0NPTE9SUy50ZXh0UHJpbWFyeX07XG4gICAgICAtLW9mLWh1ZC10ZXh0LTI6ICR7Q09MT1JTLnRleHRTZWNvbmRhcnl9O1xuICAgICAgLS1vZi1odWQtdGV4dC0zOiAke0NPTE9SUy50ZXh0TXV0ZWR9O1xuICAgICAgLS1vZi1odWQtdGV4dC00OiAke0NPTE9SUy50ZXh0RmFpbnR9O1xuICAgICAgLS1vZi1odWQtbGluZS0xOiAke0NPTE9SUy5ib3JkZXJ9O1xuICAgICAgLS1vZi1odWQtbGluZS0yOiAke0NPTE9SUy5ib3JkZXJTdWJ0bGV9O1xuICAgICAgLS1vZi1odWQtbGluZS0zOiAke0NPTE9SUy5ib3JkZXJTdHJvbmd9O1xuICAgICAgLS1vZi1odWQtZGFuZ2VyOiAke0NPTE9SUy5kYW5nZXJ9O1xuICAgICAgLS1vZi1odWQtZGFuZ2VyLXNvZnQ6ICR7Q09MT1JTLmRhbmdlclNvZnR9O1xuICAgICAgLS1vZi1odWQtZGFuZ2VyLWxpbmU6ICR7Q09MT1JTLmRhbmdlckxpbmV9O1xuICAgIH1cblxuICAgIEBrZXlmcmFtZXMgb2ZQYW5lbEVudGVyIHtcbiAgICAgIGZyb20geyBvcGFjaXR5OiAwOyB0cmFuc2Zvcm06IHRyYW5zbGF0ZVkoMTBweCk7IH1cbiAgICAgIHRvICAgeyBvcGFjaXR5OiAxOyB0cmFuc2Zvcm06IHRyYW5zbGF0ZVkoMCk7IH1cbiAgICB9XG5cbiAgICBAa2V5ZnJhbWVzIGxpdmVQdWxzZSB7XG4gICAgICAwJSAgIHsgYm94LXNoYWRvdzogMCAwIDAgMCByZ2JhKCR7Q09MT1JTLmFjY2VudFNoYWRvd30sIDAuNSk7IH1cbiAgICAgIDcwJSAgeyBib3gtc2hhZG93OiAwIDAgMCA4cHggcmdiYSgke0NPTE9SUy5hY2NlbnRTaGFkb3d9LCAwKTsgfVxuICAgICAgMTAwJSB7IGJveC1zaGFkb3c6IDAgMCAwIDAgcmdiYSgke0NPTE9SUy5hY2NlbnRTaGFkb3d9LCAwKTsgfVxuICAgIH1cblxuICAgIC5vZi1wYW5lbCB7XG4gICAgICBwb3NpdGlvbjogZml4ZWQ7XG4gICAgICBiYWNrZ3JvdW5kOiBsaW5lYXItZ3JhZGllbnQoMTgwZGVnLCB2YXIoLS1vZi1odWQtYmctMikgMCUsIHZhcigtLW9mLWh1ZC1iZy0xKSAxMDAlKTtcbiAgICAgIGJvcmRlcjogMXB4IHNvbGlkIHZhcigtLW9mLWh1ZC1saW5lLTIpO1xuICAgICAgYm9yZGVyLXJhZGl1czogJHtSQURJVVMueGx9O1xuICAgICAgYm94LXNoYWRvdzogJHtTSEFET1dTLmxnfTtcbiAgICAgIGZvbnQtZmFtaWx5OiAke0ZPTlRTLmJvZHl9O1xuICAgICAgY29sb3I6IHZhcigtLW9mLWh1ZC10ZXh0LTEpO1xuICAgICAgdXNlci1zZWxlY3Q6IG5vbmU7XG4gICAgICB6LWluZGV4OiAke1pfSU5ERVgucGFuZWx9O1xuICAgICAgZGlzcGxheTogZmxleDtcbiAgICAgIGZsZXgtZGlyZWN0aW9uOiBjb2x1bW47XG4gICAgICBvdmVyZmxvdzogaGlkZGVuO1xuICAgICAgYW5pbWF0aW9uOiBvZlBhbmVsRW50ZXIgJHtUSU1JTkcuc2xvd30gZWFzZTtcbiAgICB9XG4gICAgLm9mLXBhbmVsLmhpZGRlbiB7IGRpc3BsYXk6IG5vbmU7IH1cblxuICAgIC5kaXNjb3ZlcnktcGFuZWwge1xuICAgICAgdG9wOiAyNHB4O1xuICAgICAgcmlnaHQ6IDI0cHg7XG4gICAgICB3aWR0aDogMzgwcHg7XG4gICAgICBtYXgtaGVpZ2h0OiBjYWxjKDEwMHZoIC0gNDhweCk7XG4gICAgfVxuXG4gICAgLmRpc2NvdmVyeS1ib2R5IHtcbiAgICAgIGRpc3BsYXk6IGZsZXg7XG4gICAgICBmbGV4LWRpcmVjdGlvbjogY29sdW1uO1xuICAgICAgbWluLWhlaWdodDogMDtcbiAgICAgIGZsZXg6IDE7XG4gICAgICBvdmVyZmxvdzogaGlkZGVuO1xuICAgIH1cblxuICAgIC8qIFN0YXR1cyBwaWxsICovXG4gICAgLmxkLXN0YXR1cyB7XG4gICAgICBkaXNwbGF5OiBmbGV4O1xuICAgICAgYWxpZ24taXRlbXM6IGNlbnRlcjtcbiAgICAgIGdhcDogMTBweDtcbiAgICAgIHBhZGRpbmc6IDEwcHggMTRweDtcbiAgICAgIGJvcmRlci1ib3R0b206IDFweCBzb2xpZCB2YXIoLS1vZi1odWQtbGluZS0xKTtcbiAgICAgIGJhY2tncm91bmQ6IGxpbmVhci1ncmFkaWVudCgxODBkZWcsIHJnYmEoMjU1LDI1NSwyNTUsMC4wMikgMCUsIHRyYW5zcGFyZW50IDEwMCUpO1xuICAgIH1cbiAgICAubGQtcHVsc2Uge1xuICAgICAgcG9zaXRpb246IHJlbGF0aXZlO1xuICAgICAgd2lkdGg6IDhweDtcbiAgICAgIGhlaWdodDogOHB4O1xuICAgICAgYm9yZGVyLXJhZGl1czogNTAlO1xuICAgICAgYmFja2dyb3VuZDogdmFyKC0tb2YtaHVkLWFjY2VudCk7XG4gICAgICBib3gtc2hhZG93OiAwIDAgMCAwIHZhcigtLW9mLWh1ZC1hY2NlbnQpO1xuICAgICAgYW5pbWF0aW9uOiBsaXZlUHVsc2UgMnMgY3ViaWMtYmV6aWVyKC40LDAsLjIsMSkgaW5maW5pdGU7XG4gICAgICBmbGV4LXNocmluazogMDtcbiAgICB9XG4gICAgLmxkLXB1bHNlLmlzLXBhdXNlZCB7XG4gICAgICBiYWNrZ3JvdW5kOiB2YXIoLS1vZi1odWQtdGV4dC00KTtcbiAgICAgIGFuaW1hdGlvbjogbm9uZTtcbiAgICAgIGJveC1zaGFkb3c6IG5vbmU7XG4gICAgfVxuICAgIC5sZC1zdGF0dXMtdGV4dCB7XG4gICAgICBmbGV4OiAxO1xuICAgICAgbWluLXdpZHRoOiAwO1xuICAgICAgZGlzcGxheTogZmxleDtcbiAgICAgIGFsaWduLWl0ZW1zOiBiYXNlbGluZTtcbiAgICAgIGdhcDogNnB4O1xuICAgICAgZm9udC1zaXplOiAxMnB4O1xuICAgICAgY29sb3I6IHZhcigtLW9mLWh1ZC10ZXh0LTIpO1xuICAgICAgY3Vyc29yOiBwb2ludGVyO1xuICAgIH1cbiAgICAubGQtc3RhdHVzLXRleHQgc3Ryb25nIHtcbiAgICAgIGZvbnQtd2VpZ2h0OiA1MDA7XG4gICAgICBjb2xvcjogdmFyKC0tb2YtaHVkLXRleHQtMSk7XG4gICAgICBsZXR0ZXItc3BhY2luZzogMC4wMWVtO1xuICAgIH1cbiAgICAubGQtc3RhdHVzLXRleHQgLnNlcCB7IGNvbG9yOiB2YXIoLS1vZi1odWQtdGV4dC00KTsgfVxuICAgIC5sZC1zdGF0dXMtdGV4dCAubWV0YSB7XG4gICAgICBmb250LWZhbWlseTogJHtGT05UUy5tb25vfTtcbiAgICAgIGZvbnQtc2l6ZTogMTFweDtcbiAgICAgIGNvbG9yOiB2YXIoLS1vZi1odWQtdGV4dC0zKTtcbiAgICAgIGZvbnQtdmFyaWFudC1udW1lcmljOiB0YWJ1bGFyLW51bXM7XG4gICAgfVxuICAgIC5sZC1pY29ucyB7XG4gICAgICBkaXNwbGF5OiBmbGV4O1xuICAgICAgZ2FwOiA0cHg7XG4gICAgICBmbGV4LXNocmluazogMDtcbiAgICB9XG4gICAgLmxkLWljb24tYnRuIHtcbiAgICAgIGFwcGVhcmFuY2U6IG5vbmU7XG4gICAgICBib3JkZXI6IDA7XG4gICAgICBjdXJzb3I6IHBvaW50ZXI7XG4gICAgICB3aWR0aDogMjZweDtcbiAgICAgIGhlaWdodDogMjZweDtcbiAgICAgIGRpc3BsYXk6IGdyaWQ7XG4gICAgICBwbGFjZS1pdGVtczogY2VudGVyO1xuICAgICAgYm9yZGVyLXJhZGl1czogN3B4O1xuICAgICAgYmFja2dyb3VuZDogdHJhbnNwYXJlbnQ7XG4gICAgICBjb2xvcjogdmFyKC0tb2YtaHVkLXRleHQtMyk7XG4gICAgICB0cmFuc2l0aW9uOiBiYWNrZ3JvdW5kICR7VElNSU5HLmZhc3R9LCBjb2xvciAke1RJTUlORy5mYXN0fTtcbiAgICAgIHBhZGRpbmc6IDA7XG4gICAgfVxuICAgIC5sZC1pY29uLWJ0bjpob3ZlciB7XG4gICAgICBiYWNrZ3JvdW5kOiB2YXIoLS1vZi1odWQtYmctMyk7XG4gICAgICBjb2xvcjogdmFyKC0tb2YtaHVkLXRleHQtMSk7XG4gICAgfVxuICAgIC5sZC1pY29uLWJ0bi5pcy1vbiB7XG4gICAgICBiYWNrZ3JvdW5kOiB2YXIoLS1vZi1odWQtYWNjZW50LXNvZnQpO1xuICAgICAgY29sb3I6IHZhcigtLW9mLWh1ZC1hY2NlbnQpO1xuICAgIH1cbiAgICAubGQtaWNvbi1idG4gc3ZnIHtcbiAgICAgIHdpZHRoOiAxNHB4O1xuICAgICAgaGVpZ2h0OiAxNHB4O1xuICAgICAgZmlsbDogbm9uZTtcbiAgICAgIHN0cm9rZTogY3VycmVudENvbG9yO1xuICAgICAgc3Ryb2tlLXdpZHRoOiAxLjY7XG4gICAgICBzdHJva2UtbGluZWNhcDogcm91bmQ7XG4gICAgICBzdHJva2UtbGluZWpvaW46IHJvdW5kO1xuICAgIH1cbiAgICAubGQtaWNvbi1idG4gaW5wdXQgeyBkaXNwbGF5OiBub25lOyB9XG4gICAgLmxkLW1vZGUtYnRuIGlucHV0IHsgZGlzcGxheTogbm9uZTsgfVxuICAgIC5sZC1jaGlwIGlucHV0IHsgZGlzcGxheTogbm9uZTsgfVxuXG4gICAgLyogSGVhZGVyICovXG4gICAgLmxkLWhlYWQge1xuICAgICAgcGFkZGluZzogMTZweCAxOHB4IDEycHg7XG4gICAgICBib3JkZXItYm90dG9tOiAxcHggc29saWQgdmFyKC0tb2YtaHVkLWxpbmUtMSk7XG4gICAgICBmbGV4LXNocmluazogMDtcbiAgICB9XG4gICAgLmxkLWV5ZWJyb3cge1xuICAgICAgZm9udC1mYW1pbHk6ICR7Rk9OVFMubW9ub307XG4gICAgICBmb250LXNpemU6IDEwcHg7XG4gICAgICBsZXR0ZXItc3BhY2luZzogMC4xNmVtO1xuICAgICAgdGV4dC10cmFuc2Zvcm06IHVwcGVyY2FzZTtcbiAgICAgIGNvbG9yOiB2YXIoLS1vZi1odWQtdGV4dC00KTtcbiAgICAgIG1hcmdpbi1ib3R0b206IDRweDtcbiAgICB9XG4gICAgLmxkLXRpdGxlIHtcbiAgICAgIGZvbnQtZmFtaWx5OiAke0ZPTlRTLmRpc3BsYXl9O1xuICAgICAgZm9udC1zaXplOiAxOHB4O1xuICAgICAgZm9udC13ZWlnaHQ6IDYwMDtcbiAgICAgIGxldHRlci1zcGFjaW5nOiAtMC4wMWVtO1xuICAgICAgY29sb3I6IHZhcigtLW9mLWh1ZC10ZXh0LTEpO1xuICAgICAgbWFyZ2luOiAwO1xuICAgIH1cblxuICAgIC8qIFNjcm9sbCBib2R5ICovXG4gICAgLmRpc2NvdmVyeS1jb250ZW50IHtcbiAgICAgIGZsZXg6IDE7XG4gICAgICBtaW4taGVpZ2h0OiAwO1xuICAgICAgb3ZlcmZsb3cteTogYXV0bztcbiAgICAgIG92ZXJmbG93LXg6IGhpZGRlbjtcbiAgICAgIHNjcm9sbGJhci13aWR0aDogdGhpbjtcbiAgICAgIHNjcm9sbGJhci1jb2xvcjogcmdiYSgyNTUsMjU1LDI1NSwwLjA4KSB0cmFuc3BhcmVudDtcbiAgICB9XG4gICAgLmRpc2NvdmVyeS1jb250ZW50Ojotd2Via2l0LXNjcm9sbGJhciB7IHdpZHRoOiA4cHg7IH1cbiAgICAuZGlzY292ZXJ5LWNvbnRlbnQ6Oi13ZWJraXQtc2Nyb2xsYmFyLXRyYWNrIHsgYmFja2dyb3VuZDogdHJhbnNwYXJlbnQ7IH1cbiAgICAuZGlzY292ZXJ5LWNvbnRlbnQ6Oi13ZWJraXQtc2Nyb2xsYmFyLXRodW1iIHtcbiAgICAgIGJhY2tncm91bmQ6IHJnYmEoMjU1LDI1NSwyNTUsMC4wOCk7XG4gICAgICBib3JkZXItcmFkaXVzOiA0cHg7XG4gICAgICBib3JkZXI6IDJweCBzb2xpZCB0cmFuc3BhcmVudDtcbiAgICAgIGJhY2tncm91bmQtY2xpcDogY29udGVudC1ib3g7XG4gICAgfVxuXG4gICAgLmxkLXNlY3Rpb24ge1xuICAgICAgcGFkZGluZzogMTZweCAxOHB4IDE0cHg7XG4gICAgICBib3JkZXItYm90dG9tOiAxcHggc29saWQgdmFyKC0tb2YtaHVkLWxpbmUtMSk7XG4gICAgfVxuICAgIC5sZC1zZWN0aW9uOmxhc3QtY2hpbGQgeyBib3JkZXItYm90dG9tOiAwOyB9XG5cbiAgICAubGQtc2VjdGlvbi1oZWFkIHtcbiAgICAgIGRpc3BsYXk6IGZsZXg7XG4gICAgICBhbGlnbi1pdGVtczogYmFzZWxpbmU7XG4gICAgICBqdXN0aWZ5LWNvbnRlbnQ6IHNwYWNlLWJldHdlZW47XG4gICAgICBtYXJnaW4tYm90dG9tOiAxMnB4O1xuICAgIH1cbiAgICAubGQtc2VjdGlvbi1sYWJlbCB7XG4gICAgICBmb250LWZhbWlseTogJHtGT05UUy5tb25vfTtcbiAgICAgIGZvbnQtc2l6ZTogMTBweDtcbiAgICAgIGxldHRlci1zcGFjaW5nOiAwLjE2ZW07XG4gICAgICB0ZXh0LXRyYW5zZm9ybTogdXBwZXJjYXNlO1xuICAgICAgY29sb3I6IHZhcigtLW9mLWh1ZC10ZXh0LTMpO1xuICAgIH1cbiAgICAubGQtc2VjdGlvbi1hc2lkZSB7XG4gICAgICBmb250LXNpemU6IDExcHg7XG4gICAgICBjb2xvcjogdmFyKC0tb2YtaHVkLXRleHQtNCk7XG4gICAgfVxuXG4gICAgLyogTW9kZSBzZWdtZW50ZWQgc2VsZWN0b3IgKi9cbiAgICAubGQtbW9kZXMge1xuICAgICAgZGlzcGxheTogZ3JpZDtcbiAgICAgIGdyaWQtdGVtcGxhdGUtY29sdW1uczogMWZyIDFmcjtcbiAgICAgIGdhcDogNnB4O1xuICAgICAgcGFkZGluZzogNHB4O1xuICAgICAgYmFja2dyb3VuZDogdmFyKC0tb2YtaHVkLWJnLTApO1xuICAgICAgYm9yZGVyOiAxcHggc29saWQgdmFyKC0tb2YtaHVkLWxpbmUtMSk7XG4gICAgICBib3JkZXItcmFkaXVzOiAxMHB4O1xuICAgICAgbWFyZ2luLWJvdHRvbTogMTRweDtcbiAgICB9XG4gICAgLmxkLW1vZGUtYnRuIHtcbiAgICAgIGFwcGVhcmFuY2U6IG5vbmU7XG4gICAgICBib3JkZXI6IDA7XG4gICAgICBjdXJzb3I6IHBvaW50ZXI7XG4gICAgICBiYWNrZ3JvdW5kOiB0cmFuc3BhcmVudDtcbiAgICAgIGNvbG9yOiB2YXIoLS1vZi1odWQtdGV4dC0zKTtcbiAgICAgIHBhZGRpbmc6IDhweCAxMHB4O1xuICAgICAgYm9yZGVyLXJhZGl1czogN3B4O1xuICAgICAgZm9udDogaW5oZXJpdDtcbiAgICAgIGZvbnQtc2l6ZTogMTJweDtcbiAgICAgIGZvbnQtd2VpZ2h0OiA1MDA7XG4gICAgICBkaXNwbGF5OiBmbGV4O1xuICAgICAgYWxpZ24taXRlbXM6IGNlbnRlcjtcbiAgICAgIGp1c3RpZnktY29udGVudDogY2VudGVyO1xuICAgICAgZ2FwOiA4cHg7XG4gICAgICB0cmFuc2l0aW9uOiBiYWNrZ3JvdW5kICR7VElNSU5HLmZhc3R9LCBjb2xvciAke1RJTUlORy5mYXN0fTtcbiAgICB9XG4gICAgLmxkLW1vZGUtYnRuOmhvdmVyIHsgY29sb3I6IHZhcigtLW9mLWh1ZC10ZXh0LTEpOyB9XG4gICAgLmxkLW1vZGUtYnRuLmlzLW9uIHtcbiAgICAgIGJhY2tncm91bmQ6IHZhcigtLW9mLWh1ZC1iZy0zKTtcbiAgICAgIGNvbG9yOiB2YXIoLS1vZi1odWQtdGV4dC0xKTtcbiAgICAgIGJveC1zaGFkb3c6IDAgMXB4IDAgcmdiYSgyNTUsMjU1LDI1NSwwLjA0KSBpbnNldCwgMCAxcHggMnB4IHJnYmEoMCwwLDAsMC4zKTtcbiAgICB9XG4gICAgLmxkLW1vZGUtYnRuIC5jaGVjayB7XG4gICAgICB3aWR0aDogMTRweDtcbiAgICAgIGhlaWdodDogMTRweDtcbiAgICAgIGJvcmRlci1yYWRpdXM6IDRweDtcbiAgICAgIGJvcmRlcjogMS41cHggc29saWQgdmFyKC0tb2YtaHVkLXRleHQtNCk7XG4gICAgICBkaXNwbGF5OiBncmlkO1xuICAgICAgcGxhY2UtaXRlbXM6IGNlbnRlcjtcbiAgICAgIHRyYW5zaXRpb246IGJhY2tncm91bmQgJHtUSU1JTkcuZmFzdH0sIGJvcmRlci1jb2xvciAke1RJTUlORy5mYXN0fTtcbiAgICAgIGZsZXgtc2hyaW5rOiAwO1xuICAgIH1cbiAgICAubGQtbW9kZS1idG4uaXMtb24gLmNoZWNrIHtcbiAgICAgIGJhY2tncm91bmQ6IHZhcigtLW9mLWh1ZC1hY2NlbnQpO1xuICAgICAgYm9yZGVyLWNvbG9yOiB2YXIoLS1vZi1odWQtYWNjZW50KTtcbiAgICB9XG4gICAgLmxkLW1vZGUtYnRuLmlzLW9uIC5jaGVjayBzdmcge1xuICAgICAgd2lkdGg6IDlweDtcbiAgICAgIGhlaWdodDogOXB4O1xuICAgICAgc3Ryb2tlOiB2YXIoLS1vZi1odWQtYmctMCk7XG4gICAgICBzdHJva2Utd2lkdGg6IDIuNTtcbiAgICAgIGZpbGw6IG5vbmU7XG4gICAgICBzdHJva2UtbGluZWNhcDogcm91bmQ7XG4gICAgICBzdHJva2UtbGluZWpvaW46IHJvdW5kO1xuICAgIH1cblxuICAgIC8qIE1vZGUgcGFuZWwgKi9cbiAgICAubGQtbW9kZS1wYW5lbCB7XG4gICAgICBiYWNrZ3JvdW5kOiByZ2JhKDAsMCwwLDAuMTgpO1xuICAgICAgYm9yZGVyOiAxcHggc29saWQgdmFyKC0tb2YtaHVkLWxpbmUtMSk7XG4gICAgICBib3JkZXItcmFkaXVzOiAxMHB4O1xuICAgICAgcGFkZGluZzogMTRweDtcbiAgICAgIG1hcmdpbi1ib3R0b206IDEwcHg7XG4gICAgICB0cmFuc2l0aW9uOiBvcGFjaXR5ICR7VElNSU5HLm5vcm1hbH07XG4gICAgfVxuICAgIC5sZC1tb2RlLXBhbmVsLmlzLW9mZiB7XG4gICAgICBvcGFjaXR5OiAwLjQ7XG4gICAgICBwb2ludGVyLWV2ZW50czogbm9uZTtcbiAgICB9XG4gICAgLmxkLW1vZGUtcGFuZWwtaGVhZCB7XG4gICAgICBkaXNwbGF5OiBmbGV4O1xuICAgICAgYWxpZ24taXRlbXM6IGNlbnRlcjtcbiAgICAgIGdhcDogOHB4O1xuICAgICAgbWFyZ2luLWJvdHRvbTogMTJweDtcbiAgICB9XG4gICAgLmxkLW1vZGUtcGFuZWwtaGVhZCAuZG90IHtcbiAgICAgIHdpZHRoOiA2cHg7XG4gICAgICBoZWlnaHQ6IDZweDtcbiAgICAgIGJvcmRlci1yYWRpdXM6IDUwJTtcbiAgICAgIGJhY2tncm91bmQ6IHZhcigtLW9mLWh1ZC1hY2NlbnQpO1xuICAgIH1cbiAgICAubGQtbW9kZS1wYW5lbC5pcy1vZmYgLmxkLW1vZGUtcGFuZWwtaGVhZCAuZG90IHtcbiAgICAgIGJhY2tncm91bmQ6IHZhcigtLW9mLWh1ZC10ZXh0LTQpO1xuICAgIH1cbiAgICAubGQtbW9kZS1wYW5lbC1oZWFkIC50aXRsZSB7XG4gICAgICBmb250LXNpemU6IDEycHg7XG4gICAgICBmb250LXdlaWdodDogNjAwO1xuICAgICAgbGV0dGVyLXNwYWNpbmc6IDAuMDJlbTtcbiAgICAgIGNvbG9yOiB2YXIoLS1vZi1odWQtdGV4dC0xKTtcbiAgICAgIHRleHQtdHJhbnNmb3JtOiB1cHBlcmNhc2U7XG4gICAgfVxuXG4gICAgLmxkLWZvcm1hdC1sYWJlbCB7XG4gICAgICBmb250LXNpemU6IDExcHg7XG4gICAgICBjb2xvcjogdmFyKC0tb2YtaHVkLXRleHQtNCk7XG4gICAgICBmb250LWZhbWlseTogJHtGT05UUy5tb25vfTtcbiAgICAgIGxldHRlci1zcGFjaW5nOiAwLjA2ZW07XG4gICAgICBtYXJnaW4tYm90dG9tOiA2cHg7XG4gICAgfVxuXG4gICAgLyogRm9ybWF0IGNoaXBzICovXG4gICAgLmxkLWZvcm1hdHMge1xuICAgICAgZGlzcGxheTogZmxleDtcbiAgICAgIGZsZXgtd3JhcDogd3JhcDtcbiAgICAgIGdhcDogNHB4O1xuICAgICAgbWFyZ2luLWJvdHRvbTogNnB4O1xuICAgIH1cbiAgICAubGQtZm9ybWF0czpsYXN0LW9mLXR5cGUgeyBtYXJnaW4tYm90dG9tOiAxNHB4OyB9XG4gICAgLmxkLWNoaXAge1xuICAgICAgYXBwZWFyYW5jZTogbm9uZTtcbiAgICAgIGN1cnNvcjogcG9pbnRlcjtcbiAgICAgIGJhY2tncm91bmQ6IHZhcigtLW9mLWh1ZC1iZy0zKTtcbiAgICAgIGNvbG9yOiB2YXIoLS1vZi1odWQtdGV4dC0zKTtcbiAgICAgIHBhZGRpbmc6IDVweCAxMHB4O1xuICAgICAgYm9yZGVyLXJhZGl1czogNnB4O1xuICAgICAgZm9udDogaW5oZXJpdDtcbiAgICAgIGZvbnQtc2l6ZTogMTFweDtcbiAgICAgIGZvbnQtd2VpZ2h0OiA1MDA7XG4gICAgICBib3JkZXI6IDFweCBzb2xpZCB0cmFuc3BhcmVudDtcbiAgICAgIHRyYW5zaXRpb246IGJhY2tncm91bmQgJHtUSU1JTkcuZmFzdH0sIGNvbG9yICR7VElNSU5HLmZhc3R9LCBib3JkZXItY29sb3IgJHtUSU1JTkcuZmFzdH07XG4gICAgfVxuICAgIC5sZC1jaGlwOmhvdmVyIHsgY29sb3I6IHZhcigtLW9mLWh1ZC10ZXh0LTEpOyB9XG4gICAgLmxkLWNoaXAuaXMtb24ge1xuICAgICAgYmFja2dyb3VuZDogdmFyKC0tb2YtaHVkLWFjY2VudC1zb2Z0KTtcbiAgICAgIGNvbG9yOiB2YXIoLS1vZi1odWQtYWNjZW50KTtcbiAgICAgIGJvcmRlci1jb2xvcjogdmFyKC0tb2YtaHVkLWFjY2VudC1saW5lKTtcbiAgICB9XG5cbiAgICAvKiBTbGlkZXIgKi9cbiAgICAubGQtc2xpZGVyLXJvdyB7IG1hcmdpbi1ib3R0b206IDRweDsgfVxuICAgIC5sZC1zbGlkZXItbGFiZWwge1xuICAgICAgZGlzcGxheTogZmxleDtcbiAgICAgIGp1c3RpZnktY29udGVudDogc3BhY2UtYmV0d2VlbjtcbiAgICAgIGFsaWduLWl0ZW1zOiBiYXNlbGluZTtcbiAgICAgIGZvbnQtc2l6ZTogMTFweDtcbiAgICAgIGNvbG9yOiB2YXIoLS1vZi1odWQtdGV4dC0zKTtcbiAgICAgIG1hcmdpbi1ib3R0b206IDhweDtcbiAgICB9XG4gICAgLmxkLXNsaWRlci1sYWJlbCAudmFsIHtcbiAgICAgIGZvbnQtZmFtaWx5OiAke0ZPTlRTLm1vbm99O1xuICAgICAgY29sb3I6IHZhcigtLW9mLWh1ZC10ZXh0LTEpO1xuICAgICAgZm9udC12YXJpYW50LW51bWVyaWM6IHRhYnVsYXItbnVtcztcbiAgICB9XG4gICAgLmxkLXNsaWRlci1sYWJlbCAudmFsIC5zZXAge1xuICAgICAgY29sb3I6IHZhcigtLW9mLWh1ZC10ZXh0LTQpO1xuICAgICAgbWFyZ2luOiAwIDRweDtcbiAgICB9XG4gICAgLmxkLXJhbmdlIHtcbiAgICAgIC0tbG86IDAlO1xuICAgICAgLS1oaTogMTAwJTtcbiAgICAgIHBvc2l0aW9uOiByZWxhdGl2ZTtcbiAgICAgIGhlaWdodDogMjJweDtcbiAgICAgIG1hcmdpbjogMCA2cHg7XG4gICAgfVxuICAgIC5jYXBhY2l0eS1zbGlkZXIuaXMtbWF4LWxvY2tlZDo6LXdlYmtpdC1zbGlkZXItdGh1bWIge1xuICAgICAgb3BhY2l0eTogMC40NTtcbiAgICAgIGN1cnNvcjogbm90LWFsbG93ZWQ7XG4gICAgfVxuICAgIC5jYXBhY2l0eS1zbGlkZXIuaXMtbWF4LWxvY2tlZDo6LW1vei1yYW5nZS10aHVtYiB7XG4gICAgICBvcGFjaXR5OiAwLjQ1O1xuICAgICAgY3Vyc29yOiBub3QtYWxsb3dlZDtcbiAgICB9XG4gICAgLmNhcGFjaXR5LXNsaWRlci5pcy1tYXgtbG9ja2VkIHtcbiAgICAgIHBvaW50ZXItZXZlbnRzOiBub25lO1xuICAgIH1cbiAgICAubGQtcmFuZ2UgLnRyYWNrIHtcbiAgICAgIHBvc2l0aW9uOiBhYnNvbHV0ZTtcbiAgICAgIGxlZnQ6IC02cHg7XG4gICAgICByaWdodDogLTZweDtcbiAgICAgIHRvcDogOXB4O1xuICAgICAgaGVpZ2h0OiA0cHg7XG4gICAgICBiYWNrZ3JvdW5kOiB2YXIoLS1vZi1odWQtYmctMyk7XG4gICAgICBib3JkZXItcmFkaXVzOiAycHg7XG4gICAgfVxuICAgIC5sZC1yYW5nZSAudHJhY2stZmlsbCB7XG4gICAgICBwb3NpdGlvbjogYWJzb2x1dGU7XG4gICAgICB0b3A6IDA7XG4gICAgICBib3R0b206IDA7XG4gICAgICBsZWZ0OiB2YXIoLS1sbyk7XG4gICAgICByaWdodDogY2FsYygxMDAlIC0gdmFyKC0taGkpKTtcbiAgICAgIGJhY2tncm91bmQ6IHZhcigtLW9mLWh1ZC1hY2NlbnQpO1xuICAgICAgYm9yZGVyLXJhZGl1czogMnB4O1xuICAgIH1cbiAgICAuY2FwYWNpdHktc2xpZGVyIHtcbiAgICAgIHBvc2l0aW9uOiBhYnNvbHV0ZTtcbiAgICAgIGxlZnQ6IC02cHg7XG4gICAgICByaWdodDogLTZweDtcbiAgICAgIHdpZHRoOiBjYWxjKDEwMCUgKyAxMnB4KTtcbiAgICAgIHRvcDogMDtcbiAgICAgIGhlaWdodDogMjJweDtcbiAgICAgIGFwcGVhcmFuY2U6IG5vbmU7XG4gICAgICAtd2Via2l0LWFwcGVhcmFuY2U6IG5vbmU7XG4gICAgICBiYWNrZ3JvdW5kOiB0cmFuc3BhcmVudDtcbiAgICAgIHBvaW50ZXItZXZlbnRzOiBub25lO1xuICAgICAgbWFyZ2luOiAwO1xuICAgICAgb3V0bGluZTogbm9uZTtcbiAgICB9XG4gICAgLmNhcGFjaXR5LXNsaWRlcjo6LXdlYmtpdC1zbGlkZXItdGh1bWIge1xuICAgICAgLXdlYmtpdC1hcHBlYXJhbmNlOiBub25lO1xuICAgICAgYXBwZWFyYW5jZTogbm9uZTtcbiAgICAgIHdpZHRoOiAxNHB4O1xuICAgICAgaGVpZ2h0OiAxNHB4O1xuICAgICAgYm9yZGVyLXJhZGl1czogNTAlO1xuICAgICAgYmFja2dyb3VuZDogdmFyKC0tb2YtaHVkLXRleHQtMSk7XG4gICAgICBib3JkZXI6IDFweCBzb2xpZCByZ2JhKDAsMCwwLDAuNCk7XG4gICAgICBib3gtc2hhZG93OiAke1NIQURPV1Muc219O1xuICAgICAgcG9pbnRlci1ldmVudHM6IGF1dG87XG4gICAgICBjdXJzb3I6IGdyYWI7XG4gICAgfVxuICAgIC5jYXBhY2l0eS1zbGlkZXI6Oi1tb3otcmFuZ2UtdGh1bWIge1xuICAgICAgd2lkdGg6IDE0cHg7XG4gICAgICBoZWlnaHQ6IDE0cHg7XG4gICAgICBib3JkZXItcmFkaXVzOiA1MCU7XG4gICAgICBiYWNrZ3JvdW5kOiB2YXIoLS1vZi1odWQtdGV4dC0xKTtcbiAgICAgIGJvcmRlcjogMXB4IHNvbGlkIHJnYmEoMCwwLDAsMC40KTtcbiAgICAgIGJveC1zaGFkb3c6ICR7U0hBRE9XUy5zbX07XG4gICAgICBwb2ludGVyLWV2ZW50czogYXV0bztcbiAgICAgIGN1cnNvcjogZ3JhYjtcbiAgICB9XG4gICAgLmNhcGFjaXR5LXNsaWRlci1taW4geyB6LWluZGV4OiAyOyB9XG4gICAgLmNhcGFjaXR5LXNsaWRlci1tYXggeyB6LWluZGV4OiAxOyB9XG5cbiAgICAvKiBTdGVwcGVyIChudW1iZXIgaW5wdXQgKyAtIC8gKyBidXR0b25zKSAqL1xuICAgIC5sZC1zdGVwcGVyIHtcbiAgICAgIGRpc3BsYXk6IGlubGluZS1mbGV4O1xuICAgICAgYWxpZ24taXRlbXM6IGNlbnRlcjtcbiAgICAgIGdhcDogMnB4O1xuICAgICAgYmFja2dyb3VuZDogcmdiYSgwLDAsMCwwLjI1KTtcbiAgICAgIGJvcmRlcjogMXB4IHNvbGlkIHZhcigtLW9mLWh1ZC1saW5lLTEpO1xuICAgICAgYm9yZGVyLXJhZGl1czogNnB4O1xuICAgICAgcGFkZGluZzogMnB4IDRweDtcbiAgICAgIGZvbnQtZmFtaWx5OiAke0ZPTlRTLm1vbm99O1xuICAgIH1cbiAgICAubGQtc3RlcHBlciBpbnB1dFt0eXBlPVwibnVtYmVyXCJdIHtcbiAgICAgIHdpZHRoOiAyLjVlbTtcbiAgICAgIGJhY2tncm91bmQ6IHRyYW5zcGFyZW50O1xuICAgICAgYm9yZGVyOiBub25lO1xuICAgICAgY29sb3I6IHZhcigtLW9mLWh1ZC10ZXh0LTEpO1xuICAgICAgZm9udDogaW5oZXJpdDtcbiAgICAgIHRleHQtYWxpZ246IGNlbnRlcjtcbiAgICAgIHBhZGRpbmc6IDAgMnB4O1xuICAgICAgZm9udC12YXJpYW50LW51bWVyaWM6IHRhYnVsYXItbnVtcztcbiAgICAgIC1tb3otYXBwZWFyYW5jZTogdGV4dGZpZWxkO1xuICAgIH1cbiAgICAubGQtc3RlcHBlciBpbnB1dFt0eXBlPVwibnVtYmVyXCJdOjotd2Via2l0LW91dGVyLXNwaW4tYnV0dG9uLFxuICAgIC5sZC1zdGVwcGVyIGlucHV0W3R5cGU9XCJudW1iZXJcIl06Oi13ZWJraXQtaW5uZXItc3Bpbi1idXR0b24ge1xuICAgICAgLXdlYmtpdC1hcHBlYXJhbmNlOiBub25lO1xuICAgICAgbWFyZ2luOiAwO1xuICAgIH1cbiAgICAubGQtc3RlcHBlciBpbnB1dFt0eXBlPVwibnVtYmVyXCJdOmZvY3VzIHsgb3V0bGluZTogbm9uZTsgY29sb3I6IHZhcigtLW9mLWh1ZC1hY2NlbnQpOyB9XG4gICAgLmxkLXN0ZXBwZXIgaW5wdXRbdHlwZT1cIm51bWJlclwiXTpkaXNhYmxlZCB7IG9wYWNpdHk6IDAuNDU7IGN1cnNvcjogbm90LWFsbG93ZWQ7IH1cbiAgICAubGQtc3RlcC1idG4ge1xuICAgICAgd2lkdGg6IDE4cHg7IGhlaWdodDogMThweDtcbiAgICAgIGRpc3BsYXk6IGlubGluZS1mbGV4OyBhbGlnbi1pdGVtczogY2VudGVyOyBqdXN0aWZ5LWNvbnRlbnQ6IGNlbnRlcjtcbiAgICAgIGJhY2tncm91bmQ6IHRyYW5zcGFyZW50O1xuICAgICAgYm9yZGVyOiBub25lO1xuICAgICAgY29sb3I6IHZhcigtLW9mLWh1ZC10ZXh0LTMpO1xuICAgICAgY3Vyc29yOiBwb2ludGVyO1xuICAgICAgYm9yZGVyLXJhZGl1czogM3B4O1xuICAgICAgZm9udDogaW5oZXJpdDtcbiAgICAgIGxpbmUtaGVpZ2h0OiAxO1xuICAgICAgcGFkZGluZzogMDtcbiAgICB9XG4gICAgLmxkLXN0ZXAtYnRuOmhvdmVyOm5vdCg6ZGlzYWJsZWQpIHtcbiAgICAgIGJhY2tncm91bmQ6IHZhcigtLW9mLWh1ZC1iZy0zKTtcbiAgICAgIGNvbG9yOiB2YXIoLS1vZi1odWQtdGV4dC0xKTtcbiAgICB9XG4gICAgLmxkLXN0ZXAtYnRuOmRpc2FibGVkIHsgb3BhY2l0eTogMC40NTsgY3Vyc29yOiBub3QtYWxsb3dlZDsgfVxuXG4gICAgLyogVGlja3MgdW5kZXIgdGhlIHNsaWRlciB0cmFjayAqL1xuICAgIC5sZC10aWNrcyB7XG4gICAgICBwb3NpdGlvbjogcmVsYXRpdmU7XG4gICAgICBoZWlnaHQ6IDE4cHg7XG4gICAgICBtYXJnaW46IDZweCA2cHggNHB4O1xuICAgICAgcG9pbnRlci1ldmVudHM6IG5vbmU7XG4gICAgfVxuICAgIC5sZC10aWNrIHtcbiAgICAgIHBvc2l0aW9uOiBhYnNvbHV0ZTtcbiAgICAgIHRvcDogMDtcbiAgICAgIHdpZHRoOiAxcHg7XG4gICAgICBoZWlnaHQ6IDRweDtcbiAgICAgIGJhY2tncm91bmQ6IHZhcigtLW9mLWh1ZC10ZXh0LTQpO1xuICAgICAgdHJhbnNmb3JtOiB0cmFuc2xhdGVYKC0wLjVweCk7XG4gICAgfVxuICAgIC5sZC10aWNrLWxhYmVsIHtcbiAgICAgIHBvc2l0aW9uOiBhYnNvbHV0ZTtcbiAgICAgIHRvcDogNnB4O1xuICAgICAgdHJhbnNmb3JtOiB0cmFuc2xhdGVYKC01MCUpO1xuICAgICAgZm9udC1mYW1pbHk6ICR7Rk9OVFMubW9ub307XG4gICAgICBmb250LXNpemU6IDEwcHg7XG4gICAgICBjb2xvcjogdmFyKC0tb2YtaHVkLXRleHQtMyk7XG4gICAgICBmb250LXZhcmlhbnQtbnVtZXJpYzogdGFidWxhci1udW1zO1xuICAgIH1cblxuICAgIC8qIDJ4IGNhcmQgKi9cbiAgICAubGQtMngge1xuICAgICAgZGlzcGxheTogZmxleDtcbiAgICAgIGFsaWduLWl0ZW1zOiBjZW50ZXI7XG4gICAgICBnYXA6IDhweDtcbiAgICAgIG1hcmdpbi10b3A6IDEwcHg7XG4gICAgICBwYWRkaW5nOiA4cHggMTBweDtcbiAgICAgIGJhY2tncm91bmQ6IHJnYmEoMCwwLDAsMC4yKTtcbiAgICAgIGJvcmRlcjogMXB4IHNvbGlkIHZhcigtLW9mLWh1ZC1saW5lLTEpO1xuICAgICAgYm9yZGVyLXJhZGl1czogN3B4O1xuICAgICAgY3Vyc29yOiBwb2ludGVyO1xuICAgICAgdXNlci1zZWxlY3Q6IG5vbmU7XG4gICAgfVxuICAgIC5sZC0yeCAuY2hlY2sge1xuICAgICAgd2lkdGg6IDE0cHg7XG4gICAgICBoZWlnaHQ6IDE0cHg7XG4gICAgICBib3JkZXItcmFkaXVzOiA0cHg7XG4gICAgICBib3JkZXI6IDEuNXB4IHNvbGlkIHZhcigtLW9mLWh1ZC10ZXh0LTQpO1xuICAgICAgZGlzcGxheTogZ3JpZDtcbiAgICAgIHBsYWNlLWl0ZW1zOiBjZW50ZXI7XG4gICAgICBmbGV4LXNocmluazogMDtcbiAgICAgIHRyYW5zaXRpb246IGJhY2tncm91bmQgJHtUSU1JTkcuZmFzdH0sIGJvcmRlci1jb2xvciAke1RJTUlORy5mYXN0fTtcbiAgICB9XG4gICAgLmxkLTJ4LmlzLW9uIC5jaGVjayB7XG4gICAgICBiYWNrZ3JvdW5kOiB2YXIoLS1vZi1odWQtYWNjZW50KTtcbiAgICAgIGJvcmRlci1jb2xvcjogdmFyKC0tb2YtaHVkLWFjY2VudCk7XG4gICAgfVxuICAgIC5sZC0yeC5pcy1vbiAuY2hlY2sgc3ZnIHtcbiAgICAgIHdpZHRoOiA5cHg7XG4gICAgICBoZWlnaHQ6IDlweDtcbiAgICAgIHN0cm9rZTogdmFyKC0tb2YtaHVkLWJnLTApO1xuICAgICAgc3Ryb2tlLXdpZHRoOiAyLjU7XG4gICAgICBmaWxsOiBub25lO1xuICAgICAgc3Ryb2tlLWxpbmVjYXA6IHJvdW5kO1xuICAgICAgc3Ryb2tlLWxpbmVqb2luOiByb3VuZDtcbiAgICB9XG4gICAgLmxkLTJ4IC5sYmwge1xuICAgICAgZm9udC1zaXplOiAxMXB4O1xuICAgICAgY29sb3I6IHZhcigtLW9mLWh1ZC10ZXh0LTIpO1xuICAgIH1cbiAgICAubGQtMnggLmxibCBzdHJvbmcge1xuICAgICAgZm9udC1mYW1pbHk6ICR7Rk9OVFMubW9ub307XG4gICAgICBmb250LXdlaWdodDogNTAwO1xuICAgICAgY29sb3I6IHZhcigtLW9mLWh1ZC10ZXh0LTEpO1xuICAgIH1cbiAgICAubGQtMnggLmxibCAuaGludCB7XG4gICAgICBjb2xvcjogdmFyKC0tb2YtaHVkLXRleHQtNCk7XG4gICAgICBtYXJnaW4tbGVmdDogNnB4O1xuICAgIH1cbiAgICAubGQtMnggaW5wdXQgeyBkaXNwbGF5OiBub25lOyB9XG5cbiAgICAvKiBDdXJyZW50IGdhbWUgaW5mbyAqL1xuICAgIC5sZC1jdXJyZW50LWdhbWUtaW5mbyB7XG4gICAgICBtYXJnaW4tdG9wOiAxMHB4O1xuICAgICAgcGFkZGluZzogNnB4IDEwcHg7XG4gICAgICBiYWNrZ3JvdW5kOiB2YXIoLS1vZi1odWQtYWNjZW50LXNvZnQpO1xuICAgICAgYm9yZGVyOiAxcHggc29saWQgdmFyKC0tb2YtaHVkLWFjY2VudC1saW5lKTtcbiAgICAgIGJvcmRlci1yYWRpdXM6ICR7UkFESVVTLnNtfTtcbiAgICAgIGZvbnQtc2l6ZTogMTFweDtcbiAgICAgIGNvbG9yOiB2YXIoLS1vZi1odWQtdGV4dC0yKTtcbiAgICAgIHRleHQtYWxpZ246IGNlbnRlcjtcbiAgICB9XG5cbiAgICAvKiBNb2RpZmllcnMgKi9cbiAgICAubGQtbW9kcy1sZWdlbmQge1xuICAgICAgZGlzcGxheTogZmxleDtcbiAgICAgIGdhcDogMTBweDtcbiAgICAgIGZvbnQtc2l6ZTogMTBweDtcbiAgICAgIGNvbG9yOiB2YXIoLS1vZi1odWQtdGV4dC00KTtcbiAgICAgIGZvbnQtZmFtaWx5OiAke0ZPTlRTLm1vbm99O1xuICAgICAgbGV0dGVyLXNwYWNpbmc6IDAuMDZlbTtcbiAgICB9XG4gICAgLmxkLW1vZHMtbGVnZW5kIC5rZXkge1xuICAgICAgZGlzcGxheTogaW5saW5lLWZsZXg7XG4gICAgICBhbGlnbi1pdGVtczogY2VudGVyO1xuICAgICAgZ2FwOiA0cHg7XG4gICAgfVxuICAgIC5sZC1tb2RzLWxlZ2VuZCAuc3dhdGNoIHtcbiAgICAgIHdpZHRoOiA4cHg7XG4gICAgICBoZWlnaHQ6IDhweDtcbiAgICAgIGJvcmRlci1yYWRpdXM6IDJweDtcbiAgICAgIGJhY2tncm91bmQ6IHZhcigtLW9mLWh1ZC1iZy0zKTtcbiAgICB9XG4gICAgLmxkLW1vZHMtbGVnZW5kIC5zd2F0Y2gucmVxIHsgYmFja2dyb3VuZDogdmFyKC0tb2YtaHVkLWFjY2VudCk7IH1cbiAgICAubGQtbW9kcy1sZWdlbmQgLnN3YXRjaC5ibGsgeyBiYWNrZ3JvdW5kOiB2YXIoLS1vZi1odWQtZGFuZ2VyKTsgfVxuXG4gICAgLmxkLW1vZC1ncm91cCB7XG4gICAgICBtYXJnaW4tYm90dG9tOiAxMHB4O1xuICAgIH1cbiAgICAubGQtbW9kLWdyb3VwOmxhc3QtY2hpbGQgeyBtYXJnaW4tYm90dG9tOiAwOyB9XG4gICAgLmxkLW1vZC1ncm91cC1sYWJlbCB7XG4gICAgICBmb250LXNpemU6IDEwcHg7XG4gICAgICBjb2xvcjogdmFyKC0tb2YtaHVkLXRleHQtNCk7XG4gICAgICBmb250LWZhbWlseTogJHtGT05UUy5tb25vfTtcbiAgICAgIGxldHRlci1zcGFjaW5nOiAwLjEyZW07XG4gICAgICB0ZXh0LXRyYW5zZm9ybTogdXBwZXJjYXNlO1xuICAgICAgbWFyZ2luLWJvdHRvbTogNnB4O1xuICAgIH1cbiAgICAubGQtbW9kcyB7XG4gICAgICBkaXNwbGF5OiBncmlkO1xuICAgICAgZ3JpZC10ZW1wbGF0ZS1jb2x1bW5zOiAxZnIgMWZyO1xuICAgICAgZ2FwOiA0cHggOHB4O1xuICAgIH1cbiAgICAubGQtbW9kIHtcbiAgICAgIGFwcGVhcmFuY2U6IG5vbmU7XG4gICAgICBjdXJzb3I6IHBvaW50ZXI7XG4gICAgICBiYWNrZ3JvdW5kOiB0cmFuc3BhcmVudDtcbiAgICAgIGNvbG9yOiB2YXIoLS1vZi1odWQtdGV4dC0yKTtcbiAgICAgIHBhZGRpbmc6IDdweCA4cHggN3B4IDlweDtcbiAgICAgIGJvcmRlci1yYWRpdXM6IDdweDtcbiAgICAgIGZvbnQ6IGluaGVyaXQ7XG4gICAgICBmb250LXNpemU6IDEycHg7XG4gICAgICBkaXNwbGF5OiBmbGV4O1xuICAgICAgYWxpZ24taXRlbXM6IGNlbnRlcjtcbiAgICAgIGdhcDogOHB4O1xuICAgICAgdHJhbnNpdGlvbjogYmFja2dyb3VuZCAke1RJTUlORy5mYXN0fSwgY29sb3IgJHtUSU1JTkcuZmFzdH0sIGJvcmRlci1jb2xvciAke1RJTUlORy5mYXN0fTtcbiAgICAgIHRleHQtYWxpZ246IGxlZnQ7XG4gICAgICBib3JkZXI6IDFweCBzb2xpZCB0cmFuc3BhcmVudDtcbiAgICB9XG4gICAgLmxkLW1vZC1uYW1lIHsgZm9udC13ZWlnaHQ6IDUwMDsgfVxuICAgIC5sZC1tb2Q6aG92ZXIge1xuICAgICAgYmFja2dyb3VuZDogcmdiYSgyNTUsMjU1LDI1NSwwLjAyNSk7XG4gICAgICBjb2xvcjogdmFyKC0tb2YtaHVkLXRleHQtMSk7XG4gICAgfVxuICAgIC5sZC1tb2QtaW5kIHtcbiAgICAgIHdpZHRoOiAxNHB4O1xuICAgICAgaGVpZ2h0OiAxNHB4O1xuICAgICAgYm9yZGVyLXJhZGl1czogNHB4O1xuICAgICAgYm9yZGVyOiAxLjVweCBzb2xpZCB2YXIoLS1vZi1odWQtdGV4dC00KTtcbiAgICAgIGZsZXgtc2hyaW5rOiAwO1xuICAgICAgZGlzcGxheTogZ3JpZDtcbiAgICAgIHBsYWNlLWl0ZW1zOiBjZW50ZXI7XG4gICAgICB0cmFuc2l0aW9uOiBiYWNrZ3JvdW5kICR7VElNSU5HLmZhc3R9LCBib3JkZXItY29sb3IgJHtUSU1JTkcuZmFzdH07XG4gICAgfVxuICAgIC5sZC1tb2QtaW5kIHN2ZyB7XG4gICAgICB3aWR0aDogOXB4O1xuICAgICAgaGVpZ2h0OiA5cHg7XG4gICAgICBmaWxsOiBub25lO1xuICAgICAgc3Ryb2tlLXdpZHRoOiAyLjU7XG4gICAgICBzdHJva2UtbGluZWNhcDogcm91bmQ7XG4gICAgICBzdHJva2UtbGluZWpvaW46IHJvdW5kO1xuICAgIH1cbiAgICAubGQtbW9kW2RhdGEtc3RhdGU9XCJyZXF1aXJlZFwiXSB7XG4gICAgICBjb2xvcjogdmFyKC0tb2YtaHVkLXRleHQtMSk7XG4gICAgICBiYWNrZ3JvdW5kOiB2YXIoLS1vZi1odWQtYWNjZW50LXNvZnQpO1xuICAgICAgYm9yZGVyLWNvbG9yOiB2YXIoLS1vZi1odWQtYWNjZW50LWxpbmUpO1xuICAgIH1cbiAgICAubGQtbW9kW2RhdGEtc3RhdGU9XCJyZXF1aXJlZFwiXSAubGQtbW9kLWluZCB7XG4gICAgICBiYWNrZ3JvdW5kOiB2YXIoLS1vZi1odWQtYWNjZW50KTtcbiAgICAgIGJvcmRlci1jb2xvcjogdmFyKC0tb2YtaHVkLWFjY2VudCk7XG4gICAgfVxuICAgIC5sZC1tb2RbZGF0YS1zdGF0ZT1cInJlcXVpcmVkXCJdIC5sZC1tb2QtaW5kIHN2ZyB7XG4gICAgICBzdHJva2U6IHZhcigtLW9mLWh1ZC1iZy0wKTtcbiAgICB9XG4gICAgLmxkLW1vZFtkYXRhLXN0YXRlPVwiYmxvY2tlZFwiXSB7XG4gICAgICBjb2xvcjogdmFyKC0tb2YtaHVkLXRleHQtMik7XG4gICAgICBiYWNrZ3JvdW5kOiB2YXIoLS1vZi1odWQtZGFuZ2VyLXNvZnQpO1xuICAgICAgYm9yZGVyLWNvbG9yOiB2YXIoLS1vZi1odWQtZGFuZ2VyLWxpbmUpO1xuICAgIH1cbiAgICAubGQtbW9kW2RhdGEtc3RhdGU9XCJibG9ja2VkXCJdIC5sZC1tb2QtbmFtZSB7XG4gICAgICB0ZXh0LWRlY29yYXRpb246IGxpbmUtdGhyb3VnaDtcbiAgICAgIHRleHQtZGVjb3JhdGlvbi1jb2xvcjogcmdiYSgyMTAsMTIyLDEwNywwLjYpO1xuICAgICAgdGV4dC1kZWNvcmF0aW9uLXRoaWNrbmVzczogMXB4O1xuICAgIH1cbiAgICAubGQtbW9kW2RhdGEtc3RhdGU9XCJibG9ja2VkXCJdIC5sZC1tb2QtaW5kIHtcbiAgICAgIGJhY2tncm91bmQ6IHZhcigtLW9mLWh1ZC1kYW5nZXIpO1xuICAgICAgYm9yZGVyLWNvbG9yOiB2YXIoLS1vZi1odWQtZGFuZ2VyKTtcbiAgICB9XG4gICAgLmxkLW1vZFtkYXRhLXN0YXRlPVwiYmxvY2tlZFwiXSAubGQtbW9kLWluZCBzdmcge1xuICAgICAgc3Ryb2tlOiB2YXIoLS1vZi1odWQtYmctMCk7XG4gICAgfVxuICAgIC5sZC1tb2QtbmFtZSB7XG4gICAgICBmbGV4OiAxO1xuICAgICAgbWluLXdpZHRoOiAwO1xuICAgIH1cbiAgICAubGQtc2VjdGlvbi10b2dnbGUge1xuICAgICAgYXBwZWFyYW5jZTogbm9uZTtcbiAgICAgIHdpZHRoOiAxMDAlO1xuICAgICAgYmFja2dyb3VuZDogdHJhbnNwYXJlbnQ7XG4gICAgICBib3JkZXI6IDA7XG4gICAgICBwYWRkaW5nOiAwO1xuICAgICAgZm9udDogaW5oZXJpdDtcbiAgICAgIGNvbG9yOiBpbmhlcml0O1xuICAgICAgY3Vyc29yOiBwb2ludGVyO1xuICAgICAgdGV4dC1hbGlnbjogbGVmdDtcbiAgICB9XG4gICAgLmxkLXNlY3Rpb24tdG9nZ2xlW2FyaWEtZXhwYW5kZWQ9XCJmYWxzZVwiXSB7IG1hcmdpbi1ib3R0b206IDA7IH1cbiAgICAubGQtc2VjdGlvbi10b2dnbGU6aG92ZXIgLmxkLXNlY3Rpb24tbGFiZWwgeyBjb2xvcjogdmFyKC0tb2YtaHVkLXRleHQtMSk7IH1cbiAgICAubGQtc2VjdGlvbi1oZWFkLWVuZCB7XG4gICAgICBkaXNwbGF5OiBmbGV4O1xuICAgICAgYWxpZ24taXRlbXM6IGNlbnRlcjtcbiAgICAgIGdhcDogMTBweDtcbiAgICB9XG4gICAgLmxkLXNlY3Rpb24tY2hldnJvbiB7XG4gICAgICB3aWR0aDogNnB4O1xuICAgICAgaGVpZ2h0OiA2cHg7XG4gICAgICBib3JkZXItcmlnaHQ6IDEuNXB4IHNvbGlkIHZhcigtLW9mLWh1ZC10ZXh0LTQpO1xuICAgICAgYm9yZGVyLWJvdHRvbTogMS41cHggc29saWQgdmFyKC0tb2YtaHVkLXRleHQtNCk7XG4gICAgICB0cmFuc2Zvcm06IHRyYW5zbGF0ZVkoLTJweCkgcm90YXRlKDQ1ZGVnKTtcbiAgICAgIHRyYW5zaXRpb246IHRyYW5zZm9ybSAke1RJTUlORy5mYXN0fTtcbiAgICB9XG4gICAgLmxkLXNlY3Rpb24tdG9nZ2xlW2FyaWEtZXhwYW5kZWQ9XCJmYWxzZVwiXSAubGQtc2VjdGlvbi1jaGV2cm9uIHtcbiAgICAgIHRyYW5zZm9ybTogcm90YXRlKC00NWRlZyk7XG4gICAgfVxuICAgIC5sZC1zZWN0aW9uLWJvZHlbaGlkZGVuXSB7IGRpc3BsYXk6IG5vbmU7IH1cbiAgICAubGQtbWFwcy10b29scyB7XG4gICAgICBkaXNwbGF5OiBmbGV4O1xuICAgICAgZ2FwOiA2cHg7XG4gICAgICBtYXJnaW4tYm90dG9tOiAxMHB4O1xuICAgIH1cbiAgICAubGQtbWFwcy1zZWFyY2gge1xuICAgICAgZmxleDogMTtcbiAgICAgIG1pbi13aWR0aDogMDtcbiAgICAgIGJhY2tncm91bmQ6IHZhcigtLW9mLWh1ZC1iZy0wKTtcbiAgICAgIGJvcmRlcjogMXB4IHNvbGlkIHZhcigtLW9mLWh1ZC1saW5lLTEpO1xuICAgICAgYm9yZGVyLXJhZGl1czogN3B4O1xuICAgICAgY29sb3I6IHZhcigtLW9mLWh1ZC10ZXh0LTEpO1xuICAgICAgZm9udDogaW5oZXJpdDtcbiAgICAgIGZvbnQtc2l6ZTogMTJweDtcbiAgICAgIHBhZGRpbmc6IDZweCA5cHg7XG4gICAgfVxuICAgIC5sZC1tYXBzLXNlYXJjaDpmb2N1cyB7XG4gICAgICBvdXRsaW5lOiBub25lO1xuICAgICAgYm9yZGVyLWNvbG9yOiB2YXIoLS1vZi1odWQtYWNjZW50LWxpbmUpO1xuICAgIH1cbiAgICAubGQtbWFwcy1jbGVhciB7XG4gICAgICBhcHBlYXJhbmNlOiBub25lO1xuICAgICAgYmFja2dyb3VuZDogdHJhbnNwYXJlbnQ7XG4gICAgICBib3JkZXI6IDFweCBzb2xpZCB2YXIoLS1vZi1odWQtbGluZS0xKTtcbiAgICAgIGJvcmRlci1yYWRpdXM6IDdweDtcbiAgICAgIGNvbG9yOiB2YXIoLS1vZi1odWQtdGV4dC0zKTtcbiAgICAgIGZvbnQ6IGluaGVyaXQ7XG4gICAgICBmb250LXNpemU6IDExcHg7XG4gICAgICBwYWRkaW5nOiA2cHggMTBweDtcbiAgICAgIGN1cnNvcjogcG9pbnRlcjtcbiAgICB9XG4gICAgLmxkLW1hcHMtY2xlYXI6aG92ZXIgeyBjb2xvcjogdmFyKC0tb2YtaHVkLXRleHQtMSk7IH1cbiAgICAubGQtbW9kW2hpZGRlbl0sIC5sZC1tb2QtZ3JvdXBbaGlkZGVuXSB7IGRpc3BsYXk6IG5vbmU7IH1cblxuICAgIC5sZC1tb2RzLWhpbnQge1xuICAgICAgZm9udC1zaXplOiAxMXB4O1xuICAgICAgY29sb3I6IHZhcigtLW9mLWh1ZC10ZXh0LTQpO1xuICAgICAgbWFyZ2luLXRvcDogOHB4O1xuICAgICAgbGluZS1oZWlnaHQ6IDEuNTtcbiAgICB9XG4gICAgLmxkLW1vZHMtaGludCBzdHJvbmcgeyBmb250LXdlaWdodDogNTAwOyB9XG4gICAgLmxkLW1vZHMtaGludCAucmVxIHsgY29sb3I6IHZhcigtLW9mLWh1ZC1hY2NlbnQpOyB9XG4gICAgLmxkLW1vZHMtaGludCAuYmxrIHsgY29sb3I6IHZhcigtLW9mLWh1ZC1kYW5nZXIpOyB9XG5cbiAgICAvKiBGb290ZXIgKi9cbiAgICAuZGlzY292ZXJ5LWZvb3RlciB7XG4gICAgICBwYWRkaW5nOiAxMHB4IDE0cHg7XG4gICAgICBib3JkZXItdG9wOiAxcHggc29saWQgdmFyKC0tb2YtaHVkLWxpbmUtMSk7XG4gICAgICBkaXNwbGF5OiBmbGV4O1xuICAgICAgYWxpZ24taXRlbXM6IGNlbnRlcjtcbiAgICAgIGp1c3RpZnktY29udGVudDogc3BhY2UtYmV0d2VlbjtcbiAgICAgIGJhY2tncm91bmQ6IHJnYmEoMCwwLDAsMC4xNSk7XG4gICAgICBmbGV4LXNocmluazogMDtcbiAgICB9XG4gICAgLmRpc2NvdmVyeS1mb290ZXIgLnN1bW1hcnkge1xuICAgICAgZm9udC1zaXplOiAxMXB4O1xuICAgICAgY29sb3I6IHZhcigtLW9mLWh1ZC10ZXh0LTMpO1xuICAgICAgZGlzcGxheTogZmxleDtcbiAgICAgIGFsaWduLWl0ZW1zOiBjZW50ZXI7XG4gICAgICBnYXA6IDZweDtcbiAgICB9XG4gICAgLmRpc2NvdmVyeS1mb290ZXIgLnN1bW1hcnkgLm51bSB7XG4gICAgICBmb250LWZhbWlseTogJHtGT05UUy5tb25vfTtcbiAgICAgIGNvbG9yOiB2YXIoLS1vZi1odWQtdGV4dC0xKTtcbiAgICAgIGZvbnQtdmFyaWFudC1udW1lcmljOiB0YWJ1bGFyLW51bXM7XG4gICAgfVxuICAgIC5kaXNjb3ZlcnktZm9vdGVyIC5yZXNldCB7XG4gICAgICBhcHBlYXJhbmNlOiBub25lO1xuICAgICAgYm9yZGVyOiAwO1xuICAgICAgY3Vyc29yOiBwb2ludGVyO1xuICAgICAgYmFja2dyb3VuZDogdHJhbnNwYXJlbnQ7XG4gICAgICBjb2xvcjogdmFyKC0tb2YtaHVkLXRleHQtMyk7XG4gICAgICBmb250OiBpbmhlcml0O1xuICAgICAgZm9udC1zaXplOiAxMXB4O1xuICAgICAgcGFkZGluZzogNHB4IDhweDtcbiAgICAgIGJvcmRlci1yYWRpdXM6IDZweDtcbiAgICAgIHRyYW5zaXRpb246IGJhY2tncm91bmQgJHtUSU1JTkcuZmFzdH0sIGNvbG9yICR7VElNSU5HLmZhc3R9O1xuICAgIH1cbiAgICAuZGlzY292ZXJ5LWZvb3RlciAucmVzZXQ6aG92ZXIge1xuICAgICAgY29sb3I6IHZhcigtLW9mLWh1ZC10ZXh0LTEpO1xuICAgICAgYmFja2dyb3VuZDogcmdiYSgyNTUsMjU1LDI1NSwwLjA0KTtcbiAgICB9XG5cbiAgICAvKiBOYXRpdmUgam9pbi1tb2RhbCBwbGF5ZXIgaGlnaGxpZ2h0cyBcdTIwMTQgcmUtdGhlbWVkIHRvIGJsdWUgYWNjZW50ICovXG4gICAgLm9mLWN1cnJlbnQtcGxheWVyLWJvb3N0IHtcbiAgICAgIGJveC1zaGFkb3c6IDAgMCAwIDFweCB2YXIoLS1vZi1odWQtYWNjZW50KSwgMCAwIDE2cHggdmFyKC0tb2YtaHVkLWFjY2VudC1zb2Z0KTtcbiAgICAgIGJhY2tncm91bmQ6IGxpbmVhci1ncmFkaWVudCg5MGRlZywgdmFyKC0tb2YtaHVkLWFjY2VudC1zb2Z0KSwgcmdiYSgke0NPTE9SUy5hY2NlbnRTaGFkb3d9LCAwLjA2KSk7XG4gICAgfVxuICAgIC5vZi1jdXJyZW50LXBsYXllci10ZWFtLWJvb3N0IHtcbiAgICAgIGJveC1zaGFkb3c6IGluc2V0IDAgMCAwIDFweCB2YXIoLS1vZi1odWQtYWNjZW50LWxpbmUpLCAwIDAgMjBweCB2YXIoLS1vZi1odWQtYWNjZW50LXNvZnQpO1xuICAgIH1cblxuICAgIC8qIFF1ZXVlIGNhcmQgcHVsc2UgXHUyMDE0IG9yYW5nZSBhbGFybSBjb250cmFzdCBhZ2FpbnN0IHRoZSBibHVlIHBhbmVsIChpbnRlbnRpb25hbCkgKi9cbiAgICBAa2V5ZnJhbWVzIGRpc2NvdmVyeUNhcmRBY3RpdmVCZWFjb24ge1xuICAgICAgMCUge1xuICAgICAgICBib3gtc2hhZG93OlxuICAgICAgICAgIDAgMCAwIDNweCByZ2JhKDI1NSwgMTY4LCAzOCwgMC45OCkgaW5zZXQsXG4gICAgICAgICAgMCAwIDI4cHggcmdiYSgyNTUsIDEyMiwgMjYsIDAuNDIpO1xuICAgICAgICBmaWx0ZXI6IHNhdHVyYXRlKDEuMDgpIGJyaWdodG5lc3MoMS4wNCk7XG4gICAgICB9XG4gICAgICA1MCUge1xuICAgICAgICBib3gtc2hhZG93OlxuICAgICAgICAgIDAgMCAwIDRweCByZ2JhKDI1NSwgMjA5LCAxMDIsIDEpIGluc2V0LFxuICAgICAgICAgIDAgMCA0OHB4IHJnYmEoMjU1LCAxMjIsIDI2LCAwLjcyKSxcbiAgICAgICAgICAwIDAgMCAxMnB4IHJnYmEoMjU1LCAxNjgsIDM4LCAwLjE4KTtcbiAgICAgICAgZmlsdGVyOiBzYXR1cmF0ZSgxLjIpIGJyaWdodG5lc3MoMS4xNCk7XG4gICAgICB9XG4gICAgICAxMDAlIHtcbiAgICAgICAgYm94LXNoYWRvdzpcbiAgICAgICAgICAwIDAgMCAzcHggcmdiYSgyNTUsIDE2OCwgMzgsIDAuOTgpIGluc2V0LFxuICAgICAgICAgIDAgMCAyOHB4IHJnYmEoMjU1LCAxMjIsIDI2LCAwLjQyKTtcbiAgICAgICAgZmlsdGVyOiBzYXR1cmF0ZSgxLjA4KSBicmlnaHRuZXNzKDEuMDQpO1xuICAgICAgfVxuICAgIH1cbiAgICAub2YtZGlzY292ZXJ5LWNhcmQtYWN0aXZlIHtcbiAgICAgIGJvcmRlci1jb2xvcjogcmdiYSgyNTUsIDE2OCwgMzgsIDAuOTYpICFpbXBvcnRhbnQ7XG4gICAgICB0cmFuc2l0aW9uOlxuICAgICAgICBib3gtc2hhZG93ICR7VElNSU5HLmZhc3R9LFxuICAgICAgICBmaWx0ZXIgJHtUSU1JTkcuZmFzdH0sXG4gICAgICAgIGJvcmRlci1jb2xvciAke1RJTUlORy5mYXN0fTtcbiAgICAgIGFuaW1hdGlvbjogZGlzY292ZXJ5Q2FyZEFjdGl2ZUJlYWNvbiAxLjQ1cyBlYXNlLWluLW91dCBpbmZpbml0ZTtcbiAgICB9XG5cbiAgICAvKiBBIG1hdGNoaW5nIGNhcmQgaW4gT3BlbkZyb250J3MgU2VlIEFsbCBWaWV3LiAqL1xuICAgIC5vZi1kaXNjb3Zlcnktc2VlLWFsbC1tYXRjaCB7XG4gICAgICBib3JkZXItcmFkaXVzOiAxcmVtO1xuICAgICAgYW5pbWF0aW9uOiBkaXNjb3ZlcnlDYXJkQWN0aXZlQmVhY29uIDEuNDVzIGVhc2UtaW4tb3V0IGluZmluaXRlO1xuICAgIH1cblxuICAgIC8qID09PT09PT09PT09PT09PT09PT09PSBVcCBOZXh0IHN0cmlwID09PT09PT09PT09PT09PT09PT09PSAqL1xuICAgIC5vZi11cGNvbWluZyB7XG4gICAgICBtYXJnaW46IDE4cHggMCAwO1xuICAgICAgZm9udC1mYW1pbHk6ICR7Rk9OVFMuYm9keX07XG4gICAgICBjb2xvcjogdmFyKC0tb2YtaHVkLXRleHQtMSk7XG4gICAgfVxuXG4gICAgLm9mLXVwY29taW5nLWhlYWQge1xuICAgICAgZGlzcGxheTogZmxleDtcbiAgICAgIGFsaWduLWl0ZW1zOiBjZW50ZXI7XG4gICAgICBnYXA6IDEycHg7XG4gICAgICBtYXJnaW46IDAgMCAxMnB4O1xuICAgIH1cbiAgICAub2YtdXBjb21pbmctbGJsIHtcbiAgICAgIGZvbnQtc2l6ZTogMTAuNXB4O1xuICAgICAgZm9udC13ZWlnaHQ6IDgwMDtcbiAgICAgIGxldHRlci1zcGFjaW5nOiAxLjhweDtcbiAgICAgIHRleHQtdHJhbnNmb3JtOiB1cHBlcmNhc2U7XG4gICAgICBjb2xvcjogdmFyKC0tb2YtaHVkLXRleHQtMyk7XG4gICAgfVxuICAgIC5vZi11cGNvbWluZy1ydWxlIHtcbiAgICAgIGZsZXg6IDE7XG4gICAgICBoZWlnaHQ6IDFweDtcbiAgICAgIGJhY2tncm91bmQ6IHZhcigtLW9mLWh1ZC1saW5lLTEpO1xuICAgIH1cbiAgICAub2YtdXBjb21pbmctdG9nZ2xlIHtcbiAgICAgIGRpc3BsYXk6IGZsZXg7XG4gICAgICBhbGlnbi1pdGVtczogY2VudGVyO1xuICAgICAgZ2FwOiA4cHg7XG4gICAgICBmb250LXNpemU6IDExcHg7XG4gICAgICBmb250LXdlaWdodDogNjAwO1xuICAgICAgY29sb3I6IHZhcigtLW9mLWh1ZC10ZXh0LTIpO1xuICAgICAgY3Vyc29yOiBwb2ludGVyO1xuICAgICAgdXNlci1zZWxlY3Q6IG5vbmU7XG4gICAgfVxuICAgIC5vZi11cGNvbWluZy10b2dnbGUgaW5wdXQge1xuICAgICAgcG9zaXRpb246IGFic29sdXRlO1xuICAgICAgb3BhY2l0eTogMDtcbiAgICAgIHdpZHRoOiAwO1xuICAgICAgaGVpZ2h0OiAwO1xuICAgIH1cbiAgICAub2YtdXBjb21pbmctc3cge1xuICAgICAgcG9zaXRpb246IHJlbGF0aXZlO1xuICAgICAgd2lkdGg6IDMwcHg7XG4gICAgICBoZWlnaHQ6IDE3cHg7XG4gICAgICBib3JkZXItcmFkaXVzOiA5OTlweDtcbiAgICAgIGJhY2tncm91bmQ6IHZhcigtLW9mLWh1ZC1iZy0zKTtcbiAgICAgIGJveC1zaGFkb3c6IGluc2V0IDAgMCAwIDFweCB2YXIoLS1vZi1odWQtbGluZS0yKTtcbiAgICAgIHRyYW5zaXRpb246IGJhY2tncm91bmQgJHtUSU1JTkcuZmFzdH07XG4gICAgICBmbGV4OiBub25lO1xuICAgIH1cbiAgICAub2YtdXBjb21pbmctc3c6OmFmdGVyIHtcbiAgICAgIGNvbnRlbnQ6ICcnO1xuICAgICAgcG9zaXRpb246IGFic29sdXRlO1xuICAgICAgdG9wOiAycHg7XG4gICAgICBsZWZ0OiAycHg7XG4gICAgICB3aWR0aDogMTNweDtcbiAgICAgIGhlaWdodDogMTNweDtcbiAgICAgIGJvcmRlci1yYWRpdXM6IDUwJTtcbiAgICAgIGJhY2tncm91bmQ6IHZhcigtLW9mLWh1ZC10ZXh0LTIpO1xuICAgICAgdHJhbnNpdGlvbjogdHJhbnNmb3JtICR7VElNSU5HLmZhc3R9LCBiYWNrZ3JvdW5kICR7VElNSU5HLmZhc3R9O1xuICAgIH1cbiAgICAub2YtdXBjb21pbmctdG9nZ2xlIGlucHV0OmNoZWNrZWQgKyAub2YtdXBjb21pbmctc3cge1xuICAgICAgYmFja2dyb3VuZDogdmFyKC0tb2YtaHVkLWFjY2VudCk7XG4gICAgICBib3gtc2hhZG93OiBpbnNldCAwIDAgMCAxcHggdmFyKC0tb2YtaHVkLWFjY2VudC1saW5lKTtcbiAgICB9XG4gICAgLm9mLXVwY29taW5nLXRvZ2dsZSBpbnB1dDpjaGVja2VkICsgLm9mLXVwY29taW5nLXN3OjphZnRlciB7XG4gICAgICB0cmFuc2Zvcm06IHRyYW5zbGF0ZVgoMTNweCk7XG4gICAgICBiYWNrZ3JvdW5kOiB2YXIoLS1vZi1odWQtYmctMCk7XG4gICAgfVxuXG4gICAgLm9mLXVwY29taW5nLWdyaWQge1xuICAgICAgZGlzcGxheTogZ3JpZDtcbiAgICAgIGdyaWQtdGVtcGxhdGUtY29sdW1uczogMmZyIDFmcjtcbiAgICAgIGdhcDogMTZweDtcbiAgICB9XG4gICAgLm9mLXVwY29taW5nLWNvbCB7XG4gICAgICBkaXNwbGF5OiBmbGV4O1xuICAgICAgZmxleC1kaXJlY3Rpb246IGNvbHVtbjtcbiAgICAgIGdhcDogMTZweDtcbiAgICAgIG1pbi1oZWlnaHQ6IDA7XG4gICAgfVxuICAgIC5vZi11cGNvbWluZy1zbG90IHtcbiAgICAgIG1pbi1oZWlnaHQ6IDEyNHB4O1xuICAgICAgZGlzcGxheTogZmxleDtcbiAgICB9XG5cbiAgICAub2YtdXBjb21pbmctZW1wdHkge1xuICAgICAgZmxleDogMTtcbiAgICAgIGRpc3BsYXk6IGZsZXg7XG4gICAgICBhbGlnbi1pdGVtczogY2VudGVyO1xuICAgICAganVzdGlmeS1jb250ZW50OiBjZW50ZXI7XG4gICAgICB3aWR0aDogMTAwJTtcbiAgICAgIGJvcmRlci1yYWRpdXM6ICR7UkFESVVTLnhsfTtcbiAgICAgIGJvcmRlcjogMS41cHggZGFzaGVkIHJnYmEoMjU1LCAyNTUsIDI1NSwgMC4zKTtcbiAgICAgIGJhY2tncm91bmQ6IHZhcigtLW9mLWh1ZC1iZy0xKTtcbiAgICAgIGNvbG9yOiB2YXIoLS1vZi1odWQtdGV4dC0zKTtcbiAgICAgIGZvbnQtc2l6ZTogMTJweDtcbiAgICAgIGZvbnQtd2VpZ2h0OiA2MDA7XG4gICAgICBsZXR0ZXItc3BhY2luZzogMC40cHg7XG4gICAgfVxuXG4gICAgLm9mLXVwY29taW5nLWNhcmQge1xuICAgICAgcG9zaXRpb246IHJlbGF0aXZlO1xuICAgICAgd2lkdGg6IDEwMCU7XG4gICAgICBtaW4taGVpZ2h0OiAxMjRweDtcbiAgICAgIC8qIEZsZXggY29sdW1uICsgc3BhY2UtYmV0d2VlbjogdGFncyBmbG93IGF0IHRoZSB0b3AsIHRoZSBuYW1lIGJhciBpc1xuICAgICAgICAgcGlubmVkIHRvIHRoZSBib3R0b20sIGFuZCB0aGUgY2FyZCBHUk9XUyB0byBmaXQgaXRzIHRhZ3MgaW5zdGVhZCBvZlxuICAgICAgICAgbGV0dGluZyB0aGVtIG92ZXJsYXAgdGhlIG5hbWUuICovXG4gICAgICBkaXNwbGF5OiBmbGV4O1xuICAgICAgZmxleC1kaXJlY3Rpb246IGNvbHVtbjtcbiAgICAgIGp1c3RpZnktY29udGVudDogc3BhY2UtYmV0d2VlbjtcbiAgICAgIGJvcmRlcjogMS41cHggZGFzaGVkIHJnYmEoMjU1LCAyNTUsIDI1NSwgMC4zKTtcbiAgICAgIGJvcmRlci1yYWRpdXM6ICR7UkFESVVTLnhsfTtcbiAgICAgIGJhY2tncm91bmQ6IHZhcigtLW9mLWh1ZC1iZy0xKTtcbiAgICAgIGNvbG9yOiAjZmZmO1xuICAgICAgdGV4dC10cmFuc2Zvcm06IHVwcGVyY2FzZTtcbiAgICAgIHRleHQtYWxpZ246IGxlZnQ7XG4gICAgICBvdmVyZmxvdzogaGlkZGVuO1xuICAgICAgY3Vyc29yOiBwb2ludGVyO1xuICAgICAgcGFkZGluZzogMDtcbiAgICAgIHRyYW5zaXRpb246IHRyYW5zZm9ybSAke1RJTUlORy5ub3JtYWx9LCBib3JkZXItY29sb3IgJHtUSU1JTkcuZmFzdH07XG4gICAgfVxuICAgIC5vZi11cGNvbWluZy1jYXJkOmhvdmVyIHtcbiAgICAgIHRyYW5zZm9ybTogc2NhbGUoMS4wMik7XG4gICAgICBib3JkZXItY29sb3I6IHJnYmEoMjU1LCAyNTUsIDI1NSwgMC41KTtcbiAgICB9XG4gICAgLm9mLXVwY29taW5nLWFydCB7XG4gICAgICBwb3NpdGlvbjogYWJzb2x1dGU7XG4gICAgICBpbnNldDogMDtcbiAgICAgIHotaW5kZXg6IDA7XG4gICAgICBib3JkZXItcmFkaXVzOiAke1JBRElVUy54bH07XG4gICAgICBvdmVyZmxvdzogaGlkZGVuO1xuICAgICAgcG9pbnRlci1ldmVudHM6IG5vbmU7XG4gICAgfVxuICAgIC5vZi11cGNvbWluZy1hcnQgaW1nIHtcbiAgICAgIHBvc2l0aW9uOiBhYnNvbHV0ZTtcbiAgICAgIGluc2V0OiAwO1xuICAgICAgd2lkdGg6IDEwMCU7XG4gICAgICBoZWlnaHQ6IDEwMCU7XG4gICAgICBvYmplY3QtZml0OiBjb3ZlcjtcbiAgICAgIG9iamVjdC1wb3NpdGlvbjogY2VudGVyO1xuICAgICAgb3BhY2l0eTogMC40NTtcbiAgICAgIGZpbHRlcjogZ3JheXNjYWxlKDAuNTUpIGJyaWdodG5lc3MoMC44Mik7XG4gICAgfVxuICAgIC5vZi11cGNvbWluZy1hcnQ6OmFmdGVyIHtcbiAgICAgIGNvbnRlbnQ6ICcnO1xuICAgICAgcG9zaXRpb246IGFic29sdXRlO1xuICAgICAgaW5zZXQ6IDA7XG4gICAgICBiYWNrZ3JvdW5kOiBsaW5lYXItZ3JhZGllbnQoMTgwZGVnLCByZ2JhKDEwLCAxMiwgMTMsIDAuMjUpLCByZ2JhKDEwLCAxMiwgMTMsIDAuNikpO1xuICAgIH1cbiAgICAub2YtdXBjb21pbmctdG9wcm93IHtcbiAgICAgIHBvc2l0aW9uOiByZWxhdGl2ZTtcbiAgICAgIHotaW5kZXg6IDE7XG4gICAgICBkaXNwbGF5OiBmbGV4O1xuICAgICAgYWxpZ24taXRlbXM6IGZsZXgtc3RhcnQ7XG4gICAgICBqdXN0aWZ5LWNvbnRlbnQ6IHNwYWNlLWJldHdlZW47XG4gICAgICBnYXA6IDhweDtcbiAgICAgIHBhZGRpbmc6IDhweCA4cHggMDtcbiAgICB9XG4gICAgLm9mLXVwY29taW5nLXRhZ3Mge1xuICAgICAgZGlzcGxheTogZmxleDtcbiAgICAgIGZsZXgtZGlyZWN0aW9uOiBjb2x1bW47XG4gICAgICBhbGlnbi1pdGVtczogZmxleC1zdGFydDtcbiAgICAgIGdhcDogNHB4O1xuICAgICAgbWF4LXdpZHRoOiA2MiU7XG4gICAgICBtaW4td2lkdGg6IDA7XG4gICAgfVxuICAgIC5vZi11cGNvbWluZy10YWcge1xuICAgICAgbWF4LXdpZHRoOiAxMDAlO1xuICAgICAgb3ZlcmZsb3c6IGhpZGRlbjtcbiAgICAgIHRleHQtb3ZlcmZsb3c6IGVsbGlwc2lzO1xuICAgICAgd2hpdGUtc3BhY2U6IG5vd3JhcDtcbiAgICAgIGZvbnQtc2l6ZTogMTFweDtcbiAgICAgIGZvbnQtd2VpZ2h0OiA3MDA7XG4gICAgICBsZXR0ZXItc3BhY2luZzogMC42cHg7XG4gICAgICBwYWRkaW5nOiAzcHggN3B4O1xuICAgICAgYm9yZGVyLXJhZGl1czogNHB4O1xuICAgICAgYmFja2dyb3VuZDogcmdiYSgxMCwgMTIsIDEzLCAwLjcpO1xuICAgICAgYm9yZGVyOiAxcHggc29saWQgdmFyKC0tb2YtaHVkLWxpbmUtMyk7XG4gICAgICBjb2xvcjogdmFyKC0tb2YtaHVkLXRleHQtMyk7XG4gICAgfVxuICAgIC5vZi11cGNvbWluZy10YWctbW9yZSB7XG4gICAgICBjb2xvcjogdmFyKC0tb2YtaHVkLXRleHQtMik7XG4gICAgfVxuICAgIC5vZi11cGNvbWluZy1jaGlwIHtcbiAgICAgIGRpc3BsYXk6IGZsZXg7XG4gICAgICBhbGlnbi1pdGVtczogY2VudGVyO1xuICAgICAgZ2FwOiA1cHg7XG4gICAgICBmb250LXNpemU6IDEwcHg7XG4gICAgICBmb250LXdlaWdodDogODAwO1xuICAgICAgbGV0dGVyLXNwYWNpbmc6IDEuMnB4O1xuICAgICAgcGFkZGluZzogNHB4IDhweDtcbiAgICAgIGJvcmRlci1yYWRpdXM6IDRweDtcbiAgICAgIGJhY2tncm91bmQ6IHJnYmEoMTAsIDEyLCAxMywgMC43OCk7XG4gICAgICBjb2xvcjogdmFyKC0tb2YtaHVkLXRleHQtMik7XG4gICAgICBib3JkZXI6IDFweCBzb2xpZCB2YXIoLS1vZi1odWQtbGluZS0zKTtcbiAgICAgIHdoaXRlLXNwYWNlOiBub3dyYXA7XG4gICAgfVxuICAgIC5vZi11cGNvbWluZy1kb3Qge1xuICAgICAgd2lkdGg6IDZweDtcbiAgICAgIGhlaWdodDogNnB4O1xuICAgICAgYm9yZGVyLXJhZGl1czogNTAlO1xuICAgICAgYmFja2dyb3VuZDogdmFyKC0tb2YtaHVkLXRleHQtMyk7XG4gICAgfVxuICAgIC5vZi11cGNvbWluZy1ib3Qge1xuICAgICAgcG9zaXRpb246IHJlbGF0aXZlO1xuICAgICAgei1pbmRleDogMTtcbiAgICAgIGRpc3BsYXk6IGZsZXg7XG4gICAgICBmbGV4LWRpcmVjdGlvbjogY29sdW1uO1xuICAgICAgZ2FwOiAycHg7XG4gICAgICBwYWRkaW5nOiA4cHggMTJweDtcbiAgICAgIGJhY2tncm91bmQ6IHJnYmEoMCwgMCwgMCwgMC41NSk7XG4gICAgICBiYWNrZHJvcC1maWx0ZXI6IGJsdXIoOHB4KTtcbiAgICB9XG4gICAgLm9mLXVwY29taW5nLW1ldGFyb3cge1xuICAgICAgZGlzcGxheTogZmxleDtcbiAgICAgIGFsaWduLWl0ZW1zOiBjZW50ZXI7XG4gICAgICBqdXN0aWZ5LWNvbnRlbnQ6IHNwYWNlLWJldHdlZW47XG4gICAgICBnYXA6IDhweDtcbiAgICAgIG1pbi13aWR0aDogMDtcbiAgICB9XG4gICAgLm9mLXVwY29taW5nLWNvdW50IHtcbiAgICAgIGZsZXg6IG5vbmU7XG4gICAgICBkaXNwbGF5OiBpbmxpbmUtZmxleDtcbiAgICAgIGFsaWduLWl0ZW1zOiBjZW50ZXI7XG4gICAgICBnYXA6IDRweDtcbiAgICAgIGZvbnQtc2l6ZTogMTFweDtcbiAgICAgIGZvbnQtd2VpZ2h0OiA3MDA7XG4gICAgICBsZXR0ZXItc3BhY2luZzogMC44cHg7XG4gICAgICBjb2xvcjogdmFyKC0tb2YtaHVkLXRleHQtMyk7XG4gICAgfVxuICAgIC5vZi11cGNvbWluZy1jb3VudCBzdmcge1xuICAgICAgaGVpZ2h0OiAxNHB4O1xuICAgICAgd2lkdGg6IDE0cHg7XG4gICAgfVxuICAgIC5vZi11cGNvbWluZy1uYW1lIHtcbiAgICAgIGZvbnQtc2l6ZTogMTVweDtcbiAgICAgIGZvbnQtd2VpZ2h0OiA3MDA7XG4gICAgICBsZXR0ZXItc3BhY2luZzogMC44cHg7XG4gICAgICBsaW5lLWhlaWdodDogMS4xO1xuICAgICAgY29sb3I6IHZhcigtLW9mLWh1ZC10ZXh0LTIpO1xuICAgICAgb3ZlcmZsb3c6IGhpZGRlbjtcbiAgICAgIHRleHQtb3ZlcmZsb3c6IGVsbGlwc2lzO1xuICAgICAgd2hpdGUtc3BhY2U6IG5vd3JhcDtcbiAgICB9XG4gICAgLm9mLXVwY29taW5nLW1vZGUge1xuICAgICAgZmxleDogMTtcbiAgICAgIG1pbi13aWR0aDogMDtcbiAgICAgIGZvbnQtc2l6ZTogMTFweDtcbiAgICAgIGZvbnQtd2VpZ2h0OiA0MDA7XG4gICAgICBsZXR0ZXItc3BhY2luZzogMC42cHg7XG4gICAgICBjb2xvcjogcmdiYSgyNTUsIDI1NSwgMjU1LCAwLjcpO1xuICAgICAgdGV4dC10cmFuc2Zvcm06IG5vbmU7XG4gICAgICBvdmVyZmxvdzogaGlkZGVuO1xuICAgICAgdGV4dC1vdmVyZmxvdzogZWxsaXBzaXM7XG4gICAgICB3aGl0ZS1zcGFjZTogbm93cmFwO1xuICAgIH1cblxuICAgIC8qIE1hdGNoZWQgdXBjb21pbmcgY2FyZDogb2YtZGlzY292ZXJ5LWNhcmQtYWN0aXZlIHN1cHBsaWVzIHRoZSBiZWFjb24gcmluZ1xuICAgICAgIGZvciBwYXJpdHkgd2l0aCBhIGxpdmUgbWF0Y2g7IHRoZXNlIHJlZmluZSB0aGUgY2hpcCArIG5hbWUgZW1waGFzaXMuICovXG4gICAgLm9mLXVwY29taW5nLWNhcmQtbWF0Y2gge1xuICAgICAgYm9yZGVyLXN0eWxlOiBzb2xpZDtcbiAgICB9XG4gICAgLm9mLXVwY29taW5nLWNhcmQtbWF0Y2ggLm9mLXVwY29taW5nLWNoaXAge1xuICAgICAgY29sb3I6IHZhcigtLW9mLWh1ZC1hY2NlbnQpO1xuICAgICAgYm9yZGVyLWNvbG9yOiB2YXIoLS1vZi1odWQtYWNjZW50LWxpbmUpO1xuICAgICAgYmFja2dyb3VuZDogdmFyKC0tb2YtaHVkLWFjY2VudC1zb2Z0KTtcbiAgICB9XG4gICAgLm9mLXVwY29taW5nLWNhcmQtbWF0Y2ggLm9mLXVwY29taW5nLWRvdCB7XG4gICAgICBiYWNrZ3JvdW5kOiB2YXIoLS1vZi1odWQtYWNjZW50KTtcbiAgICB9XG4gICAgLm9mLXVwY29taW5nLWNhcmQtbWF0Y2ggLm9mLXVwY29taW5nLW5hbWUge1xuICAgICAgY29sb3I6ICNmZmY7XG4gICAgfVxuXG4gICAgJHtnZXRCb2FyZFN0eWxlcygpfVxuICBgO1xufVxuIiwgIi8qKlxuICogU291bmRVdGlscyAtIE1hbmFnZXMgYXVkaW8gbm90aWZpY2F0aW9ucyBmb3IgdGhlIHVzZXJzY3JpcHRcbiAqXG4gKiBSZXNwb25zaWJpbGl0aWVzOlxuICogLSBQcmVsb2FkIHNvdW5kIGZpbGVzIGZyb20gcmVtb3RlIFVSTHNcbiAqIC0gSGFuZGxlIGJyb3dzZXIgYXVkaW8gdW5sb2NrIChyZXF1aXJlZCBmb3IgYXV0b3BsYXkpXG4gKiAtIFBsYXkgc291bmRzIGZvciBnYW1lIGV2ZW50cyAoZm91bmQsIHN0YXJ0KVxuICpcbiAqIE5vdGU6IE1vZGVybiBicm93c2VycyByZXF1aXJlIHVzZXIgaW50ZXJhY3Rpb24gYmVmb3JlIHBsYXlpbmcgYXVkaW9cbiAqIFRoaXMgdXRpbGl0eSBoYW5kbGVzIHRoYXQgYnkgdW5sb2NraW5nIG9uIGZpcnN0IGNsaWNrL2tleWRvd24vdG91Y2hcbiAqL1xuXG5pbnRlcmZhY2UgU291bmRVdGlsc1NpbmdsZXRvbiB7XG4gIGdhbWVGb3VuZEF1ZGlvOiBIVE1MQXVkaW9FbGVtZW50IHwgbnVsbDtcbiAgZ2FtZVN0YXJ0QXVkaW86IEhUTUxBdWRpb0VsZW1lbnQgfCBudWxsO1xuICBhdWRpb1VubG9ja2VkOiBib29sZWFuO1xuICBwcmVsb2FkU291bmRzKCk6IHZvaWQ7XG4gIHNldHVwQXVkaW9VbmxvY2soKTogdm9pZDtcbiAgcGxheUdhbWVGb3VuZFNvdW5kKCk6IHZvaWQ7XG4gIHBsYXlHYW1lU3RhcnRTb3VuZCgpOiB2b2lkO1xufVxuXG5leHBvcnQgY29uc3QgU291bmRVdGlsczogU291bmRVdGlsc1NpbmdsZXRvbiA9IHtcbiAgZ2FtZUZvdW5kQXVkaW86IG51bGwsXG4gIGdhbWVTdGFydEF1ZGlvOiBudWxsLFxuICBhdWRpb1VubG9ja2VkOiBmYWxzZSxcblxuICAvKipcbiAgICogUHJlbG9hZCBzb3VuZCBmaWxlcyBhbmQgc2V0IHVwIGF1ZGlvIHVubG9ja1xuICAgKiBDYWxsIHRoaXMgZWFybHkgaW4gYXBwbGljYXRpb24gbGlmZWN5Y2xlXG4gICAqL1xuICBwcmVsb2FkU291bmRzKCkge1xuICAgIHRyeSB7XG4gICAgICAvLyBHYW1lIGZvdW5kIG5vdGlmaWNhdGlvbiBzb3VuZFxuICAgICAgdGhpcy5nYW1lRm91bmRBdWRpbyA9IG5ldyBBdWRpbyhcbiAgICAgICAgJ2h0dHBzOi8vZ2l0aHViLmNvbS9EZUxvV2FOL29wZW5mcm9udC1nYW1lLW5vdGlmaWVyL3Jhdy9yZWZzL2hlYWRzL21haW4vbm90aWZpY2F0aW9uX3NvdW5kcy9uZXctbm90aWZpY2F0aW9uLTAxNC0zNjM2NzgubXAzJ1xuICAgICAgKTtcbiAgICAgIHRoaXMuZ2FtZUZvdW5kQXVkaW8udm9sdW1lID0gMC41O1xuICAgICAgdGhpcy5nYW1lRm91bmRBdWRpby5wcmVsb2FkID0gJ2F1dG8nO1xuXG4gICAgICAvLyBHYW1lIHN0YXJ0IG5vdGlmaWNhdGlvbiBzb3VuZFxuICAgICAgdGhpcy5nYW1lU3RhcnRBdWRpbyA9IG5ldyBBdWRpbyhcbiAgICAgICAgJ2h0dHBzOi8vZ2l0aHViLmNvbS9EZUxvV2FOL29wZW5mcm9udC1nYW1lLW5vdGlmaWVyL3Jhdy9yZWZzL2hlYWRzL21haW4vbm90aWZpY2F0aW9uX3NvdW5kcy9vcGVuaW5nLWJlbGwtNDIxNDcxLm1wMydcbiAgICAgICk7XG4gICAgICB0aGlzLmdhbWVTdGFydEF1ZGlvLnZvbHVtZSA9IDAuNTtcbiAgICAgIHRoaXMuZ2FtZVN0YXJ0QXVkaW8ucHJlbG9hZCA9ICdhdXRvJztcblxuICAgICAgLy8gU2V0IHVwIGF1ZGlvIHVubG9jayBvbiBmaXJzdCB1c2VyIGludGVyYWN0aW9uXG4gICAgICB0aGlzLnNldHVwQXVkaW9VbmxvY2soKTtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICBjb25zb2xlLndhcm4oJ1tTb3VuZFV0aWxzXSBDb3VsZCBub3QgcHJlbG9hZCBhdWRpbzonLCBlKTtcbiAgICB9XG4gIH0sXG5cbiAgLyoqXG4gICAqIFNldCB1cCBhdWRpbyB1bmxvY2sgbWVjaGFuaXNtXG4gICAqIEJyb3dzZXJzIHJlcXVpcmUgdXNlciBpbnRlcmFjdGlvbiBiZWZvcmUgcGxheWluZyBhdWRpb1xuICAgKi9cbiAgc2V0dXBBdWRpb1VubG9jaygpIHtcbiAgICBjb25zdCB1bmxvY2tBdWRpbyA9ICgpID0+IHtcbiAgICAgIGlmICh0aGlzLmF1ZGlvVW5sb2NrZWQpIHJldHVybjtcblxuICAgICAgLy8gVHJ5IHRvIHBsYXkgYW5kIGltbWVkaWF0ZWx5IHBhdXNlIGJvdGggYXVkaW8gZWxlbWVudHMgdG8gdW5sb2NrIHRoZW1cbiAgICAgIGNvbnN0IHVubG9ja1Byb21pc2VzOiBQcm9taXNlPHZvaWQ+W10gPSBbXTtcblxuICAgICAgaWYgKHRoaXMuZ2FtZUZvdW5kQXVkaW8pIHtcbiAgICAgICAgdGhpcy5nYW1lRm91bmRBdWRpby52b2x1bWUgPSAwLjAxOyAvLyBWZXJ5IHF1aWV0XG4gICAgICAgIHVubG9ja1Byb21pc2VzLnB1c2goXG4gICAgICAgICAgdGhpcy5nYW1lRm91bmRBdWRpb1xuICAgICAgICAgICAgLnBsYXkoKVxuICAgICAgICAgICAgLnRoZW4oKCkgPT4ge1xuICAgICAgICAgICAgICBpZiAodGhpcy5nYW1lRm91bmRBdWRpbykge1xuICAgICAgICAgICAgICAgIHRoaXMuZ2FtZUZvdW5kQXVkaW8ucGF1c2UoKTtcbiAgICAgICAgICAgICAgICB0aGlzLmdhbWVGb3VuZEF1ZGlvLmN1cnJlbnRUaW1lID0gMDtcbiAgICAgICAgICAgICAgICB0aGlzLmdhbWVGb3VuZEF1ZGlvLnZvbHVtZSA9IDAuNTsgLy8gUmVzdG9yZSB2b2x1bWVcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIC5jYXRjaCgoKSA9PiB7XG4gICAgICAgICAgICAgIC8vIElnbm9yZSBlcnJvcnMgZHVyaW5nIHVubG9jayBhdHRlbXB0XG4gICAgICAgICAgICB9KVxuICAgICAgICApO1xuICAgICAgfVxuXG4gICAgICBpZiAodGhpcy5nYW1lU3RhcnRBdWRpbykge1xuICAgICAgICB0aGlzLmdhbWVTdGFydEF1ZGlvLnZvbHVtZSA9IDAuMDE7IC8vIFZlcnkgcXVpZXRcbiAgICAgICAgdW5sb2NrUHJvbWlzZXMucHVzaChcbiAgICAgICAgICB0aGlzLmdhbWVTdGFydEF1ZGlvXG4gICAgICAgICAgICAucGxheSgpXG4gICAgICAgICAgICAudGhlbigoKSA9PiB7XG4gICAgICAgICAgICAgIGlmICh0aGlzLmdhbWVTdGFydEF1ZGlvKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5nYW1lU3RhcnRBdWRpby5wYXVzZSgpO1xuICAgICAgICAgICAgICAgIHRoaXMuZ2FtZVN0YXJ0QXVkaW8uY3VycmVudFRpbWUgPSAwO1xuICAgICAgICAgICAgICAgIHRoaXMuZ2FtZVN0YXJ0QXVkaW8udm9sdW1lID0gMC41OyAvLyBSZXN0b3JlIHZvbHVtZVxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KVxuICAgICAgICAgICAgLmNhdGNoKCgpID0+IHtcbiAgICAgICAgICAgICAgLy8gSWdub3JlIGVycm9ycyBkdXJpbmcgdW5sb2NrIGF0dGVtcHRcbiAgICAgICAgICAgIH0pXG4gICAgICAgICk7XG4gICAgICB9XG5cbiAgICAgIFByb21pc2UuYWxsKHVubG9ja1Byb21pc2VzKS50aGVuKCgpID0+IHtcbiAgICAgICAgdGhpcy5hdWRpb1VubG9ja2VkID0gdHJ1ZTtcbiAgICAgICAgY29uc29sZS5sb2coJ1tTb3VuZFV0aWxzXSBBdWRpbyB1bmxvY2tlZCBzdWNjZXNzZnVsbHknKTtcbiAgICAgICAgLy8gUmVtb3ZlIGxpc3RlbmVycyBhZnRlciB1bmxvY2tcbiAgICAgICAgZG9jdW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcignY2xpY2snLCB1bmxvY2tBdWRpbyk7XG4gICAgICAgIGRvY3VtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoJ2tleWRvd24nLCB1bmxvY2tBdWRpbyk7XG4gICAgICAgIGRvY3VtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoJ3RvdWNoc3RhcnQnLCB1bmxvY2tBdWRpbyk7XG4gICAgICB9KTtcbiAgICB9O1xuXG4gICAgLy8gTGlzdGVuIGZvciBhbnkgdXNlciBpbnRlcmFjdGlvbiAob25jZSBlYWNoKVxuICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgdW5sb2NrQXVkaW8sIHsgb25jZTogdHJ1ZSB9KTtcbiAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKCdrZXlkb3duJywgdW5sb2NrQXVkaW8sIHsgb25jZTogdHJ1ZSB9KTtcbiAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKCd0b3VjaHN0YXJ0JywgdW5sb2NrQXVkaW8sIHsgb25jZTogdHJ1ZSB9KTtcbiAgfSxcblxuICAvKipcbiAgICogUGxheSB0aGUgXCJnYW1lIGZvdW5kXCIgbm90aWZpY2F0aW9uIHNvdW5kXG4gICAqL1xuICBwbGF5R2FtZUZvdW5kU291bmQoKSB7XG4gICAgaWYgKHRoaXMuZ2FtZUZvdW5kQXVkaW8pIHtcbiAgICAgIGNvbnNvbGUubG9nKCdbU291bmRVdGlsc10gQXR0ZW1wdGluZyB0byBwbGF5IGdhbWUgZm91bmQgc291bmQnKTtcbiAgICAgIHRoaXMuZ2FtZUZvdW5kQXVkaW8uY3VycmVudFRpbWUgPSAwO1xuICAgICAgdGhpcy5nYW1lRm91bmRBdWRpby5wbGF5KCkuY2F0Y2goKGVycikgPT4ge1xuICAgICAgICBjb25zb2xlLndhcm4oJ1tTb3VuZFV0aWxzXSBGYWlsZWQgdG8gcGxheSBnYW1lIGZvdW5kIHNvdW5kOicsIGVycik7XG4gICAgICB9KTtcbiAgICB9IGVsc2Uge1xuICAgICAgY29uc29sZS53YXJuKCdbU291bmRVdGlsc10gR2FtZSBmb3VuZCBhdWRpbyBub3QgaW5pdGlhbGl6ZWQnKTtcbiAgICB9XG4gIH0sXG5cbiAgLyoqXG4gICAqIFBsYXkgdGhlIFwiZ2FtZSBzdGFydFwiIG5vdGlmaWNhdGlvbiBzb3VuZFxuICAgKi9cbiAgcGxheUdhbWVTdGFydFNvdW5kKCkge1xuICAgIGlmICh0aGlzLmdhbWVTdGFydEF1ZGlvKSB7XG4gICAgICBjb25zb2xlLmxvZygnW1NvdW5kVXRpbHNdIEF0dGVtcHRpbmcgdG8gcGxheSBnYW1lIHN0YXJ0IHNvdW5kJyk7XG4gICAgICB0aGlzLmdhbWVTdGFydEF1ZGlvLmN1cnJlbnRUaW1lID0gMDtcbiAgICAgIHRoaXMuZ2FtZVN0YXJ0QXVkaW8ucGxheSgpLmNhdGNoKChlcnIpID0+IHtcbiAgICAgICAgY29uc29sZS53YXJuKCdbU291bmRVdGlsc10gRmFpbGVkIHRvIHBsYXkgZ2FtZSBzdGFydCBzb3VuZDonLCBlcnIpO1xuICAgICAgfSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbnNvbGUud2FybignW1NvdW5kVXRpbHNdIEdhbWUgc3RhcnQgYXVkaW8gbm90IGluaXRpYWxpemVkJyk7XG4gICAgfVxuICB9LFxufTtcbiIsICIvKipcbiAqIFVSTE9ic2VydmVyIC0gRGV0ZWN0cyBVUkwgY2hhbmdlcyBpbiBzaW5nbGUtcGFnZSBhcHBsaWNhdGlvbnNcbiAqXG4gKiBSZXNwb25zaWJpbGl0aWVzOlxuICogLSBNb25pdG9yIFVSTCBjaGFuZ2VzIChpbmNsdWRpbmcgU1BBIG5hdmlnYXRpb24gdmlhIHB1c2hTdGF0ZS9yZXBsYWNlU3RhdGUpXG4gKiAtIE5vdGlmeSBzdWJzY3JpYmVycyB3aGVuIFVSTCBjaGFuZ2VzXG4gKiAtIEhhbmRsZSBwb3BzdGF0ZSBhbmQgaGFzaGNoYW5nZSBldmVudHNcbiAqIC0gRmFsbGJhY2sgcG9sbGluZyBldmVyeSAyMDBtcyB0byBjYXRjaCBhbnkgbWlzc2VkIGNoYW5nZXNcbiAqL1xuXG50eXBlIFVSTENhbGxiYWNrID0gKHVybDogc3RyaW5nKSA9PiB2b2lkO1xuXG5pbnRlcmZhY2UgVVJMT2JzZXJ2ZXJTaW5nbGV0b24ge1xuICBjYWxsYmFja3M6IFVSTENhbGxiYWNrW107XG4gIGxhc3RVcmw6IHN0cmluZztcbiAgaW5pdGlhbGl6ZWQ6IGJvb2xlYW47XG4gIGluaXQoKTogdm9pZDtcbiAgc3Vic2NyaWJlKGNhbGxiYWNrOiBVUkxDYWxsYmFjayk6IHZvaWQ7XG4gIG5vdGlmeSgpOiB2b2lkO1xufVxuXG5leHBvcnQgY29uc3QgVVJMT2JzZXJ2ZXI6IFVSTE9ic2VydmVyU2luZ2xldG9uID0ge1xuICBjYWxsYmFja3M6IFtdLFxuICBsYXN0VXJsOiBsb2NhdGlvbi5ocmVmLFxuICBpbml0aWFsaXplZDogZmFsc2UsXG5cbiAgLyoqXG4gICAqIEluaXRpYWxpemUgVVJMIG1vbml0b3JpbmdcbiAgICogT25seSBydW5zIG9uY2UsIHN1YnNlcXVlbnQgY2FsbHMgYXJlIGlnbm9yZWRcbiAgICovXG4gIGluaXQoKSB7XG4gICAgaWYgKHRoaXMuaW5pdGlhbGl6ZWQpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdGhpcy5pbml0aWFsaXplZCA9IHRydWU7XG5cbiAgICBjb25zdCBjaGVja1VybCA9ICgpID0+IHtcbiAgICAgIGlmIChsb2NhdGlvbi5ocmVmICE9PSB0aGlzLmxhc3RVcmwpIHtcbiAgICAgICAgdGhpcy5sYXN0VXJsID0gbG9jYXRpb24uaHJlZjtcbiAgICAgICAgdGhpcy5ub3RpZnkoKTtcbiAgICAgIH1cbiAgICB9O1xuXG4gICAgLy8gTGlzdGVuIGZvciBicm93c2VyIG5hdmlnYXRpb24gZXZlbnRzXG4gICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ3BvcHN0YXRlJywgY2hlY2tVcmwpO1xuICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdoYXNoY2hhbmdlJywgY2hlY2tVcmwpO1xuXG4gICAgLy8gSW50ZXJjZXB0IGhpc3RvcnkucHVzaFN0YXRlIGFuZCBoaXN0b3J5LnJlcGxhY2VTdGF0ZVxuICAgIC8vIChTUEEgZnJhbWV3b3JrcyB1c2UgdGhlc2UgZm9yIG5hdmlnYXRpb24gd2l0aG91dCBwYWdlIHJlbG9hZClcbiAgICBjb25zdCBvcmlnaW5hbFB1c2hTdGF0ZSA9IGhpc3RvcnkucHVzaFN0YXRlO1xuICAgIGNvbnN0IG9yaWdpbmFsUmVwbGFjZVN0YXRlID0gaGlzdG9yeS5yZXBsYWNlU3RhdGU7XG5cbiAgICBoaXN0b3J5LnB1c2hTdGF0ZSA9IGZ1bmN0aW9uICguLi5hcmdzOiBQYXJhbWV0ZXJzPHR5cGVvZiBoaXN0b3J5LnB1c2hTdGF0ZT4pIHtcbiAgICAgIG9yaWdpbmFsUHVzaFN0YXRlLmFwcGx5KGhpc3RvcnksIGFyZ3MpO1xuICAgICAgc2V0VGltZW91dChjaGVja1VybCwgMCk7XG4gICAgfTtcblxuICAgIGhpc3RvcnkucmVwbGFjZVN0YXRlID0gZnVuY3Rpb24gKC4uLmFyZ3M6IFBhcmFtZXRlcnM8dHlwZW9mIGhpc3RvcnkucmVwbGFjZVN0YXRlPikge1xuICAgICAgb3JpZ2luYWxSZXBsYWNlU3RhdGUuYXBwbHkoaGlzdG9yeSwgYXJncyk7XG4gICAgICBzZXRUaW1lb3V0KGNoZWNrVXJsLCAwKTtcbiAgICB9O1xuXG4gICAgLy8gRmFsbGJhY2sgcG9sbGluZyB0byBjYXRjaCBhbnkgbWlzc2VkIGNoYW5nZXNcbiAgICBzZXRJbnRlcnZhbChjaGVja1VybCwgMjAwKTtcbiAgfSxcblxuICAvKipcbiAgICogU3Vic2NyaWJlIHRvIFVSTCBjaGFuZ2Ugbm90aWZpY2F0aW9uc1xuICAgKiBBdXRvbWF0aWNhbGx5IGluaXRpYWxpemVzIG9ic2VydmVyIGlmIG5vdCBhbHJlYWR5IGluaXRpYWxpemVkXG4gICAqL1xuICBzdWJzY3JpYmUoY2FsbGJhY2s6IFVSTENhbGxiYWNrKSB7XG4gICAgdGhpcy5jYWxsYmFja3MucHVzaChjYWxsYmFjayk7XG4gICAgdGhpcy5pbml0KCk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIE5vdGlmeSBhbGwgc3Vic2NyaWJlcnMgb2YgVVJMIGNoYW5nZVxuICAgKi9cbiAgbm90aWZ5KCkge1xuICAgIHRoaXMuY2FsbGJhY2tzLmZvckVhY2goKGNiKSA9PiBjYihsb2NhdGlvbi5ocmVmKSk7XG4gIH0sXG59O1xuIiwgIi8qKlxuICogTG9iYnlEYXRhTWFuYWdlciAtIFB1Ymxpc2hlcyBldmVyeSBsb2JieSBvZiBldmVyeSBRdWV1ZSBmcm9tIE9wZW5Gcm9udCdzXG4gKiBgcHVibGljLWxvYmJpZXMtdXBkYXRlYCBET00gZXZlbnQsIGluIFF1ZXVlIG9yZGVyLlxuICovXG5cbmltcG9ydCB0eXBlIHsgTG9iYnksIFB1YmxpY0dhbWVzUmVzcG9uc2UgfSBmcm9tICdAL3R5cGVzL2dhbWUnO1xuXG4vKiogYHNlcnZlclRpbWVgIGlzIHRoZSBmZWVkJ3Mgb3duIGNsb2NrIGluIG1pbGxpc2Vjb25kcywgb3IgbnVsbCB3aGVuIHRoZSBmZWVkIGhhcyBub25lLiAqL1xudHlwZSBMb2JieUNhbGxiYWNrID0gKGxvYmJpZXM6IExvYmJ5W10sIHNlcnZlclRpbWU6IG51bWJlciB8IG51bGwpID0+IHZvaWQ7XG5cbmNvbnN0IFFVRVVFX09SREVSID0gWydmZmEnLCAndGVhbScsICdzcGVjaWFsJywgJ2hvc3RlZCddIGFzIGNvbnN0O1xuXG5pbnRlcmZhY2UgTG9iYnlEYXRhTWFuYWdlclNpbmdsZXRvbiB7XG4gIHN1YnNjcmliZXJzOiBMb2JieUNhbGxiYWNrW107XG4gIGxhc3RMb2JiaWVzOiBMb2JieVtdO1xuICBsYXN0U2VydmVyVGltZTogbnVtYmVyIHwgbnVsbDtcbiAgc3RhcnRlZDogYm9vbGVhbjtcbiAgcHVibGljTG9iYmllc0xpc3RlbmVyOiAoKGV2ZW50OiBFdmVudCkgPT4gdm9pZCkgfCBudWxsO1xuICBzdGFydCgpOiB2b2lkO1xuICBzdG9wKCk6IHZvaWQ7XG4gIHN1YnNjcmliZShjYWxsYmFjazogTG9iYnlDYWxsYmFjayk6IHZvaWQ7XG4gIG5vdGlmeVN1YnNjcmliZXJzKCk6IHZvaWQ7XG4gIGhhbmRsZVB1YmxpY0xvYmJpZXNVcGRhdGUoZXZlbnQ6IEV2ZW50KTogdm9pZDtcbiAgZXh0cmFjdExvYmJpZXMocGF5bG9hZDogdW5rbm93bik6IExvYmJ5W107XG4gIGV4dHJhY3RTZXJ2ZXJUaW1lKHBheWxvYWQ6IHVua25vd24pOiBudW1iZXIgfCBudWxsO1xufVxuXG5leHBvcnQgY29uc3QgTG9iYnlEYXRhTWFuYWdlcjogTG9iYnlEYXRhTWFuYWdlclNpbmdsZXRvbiA9IHtcbiAgc3Vic2NyaWJlcnM6IFtdLFxuICBsYXN0TG9iYmllczogW10sXG4gIGxhc3RTZXJ2ZXJUaW1lOiBudWxsLFxuICBzdGFydGVkOiBmYWxzZSxcbiAgcHVibGljTG9iYmllc0xpc3RlbmVyOiBudWxsLFxuXG4gIHN0YXJ0KCkge1xuICAgIGlmICh0aGlzLnN0YXJ0ZWQpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICB0aGlzLnN0YXJ0ZWQgPSB0cnVlO1xuICAgIHRoaXMucHVibGljTG9iYmllc0xpc3RlbmVyID0gKGV2ZW50KSA9PiB0aGlzLmhhbmRsZVB1YmxpY0xvYmJpZXNVcGRhdGUoZXZlbnQpO1xuICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ3B1YmxpYy1sb2JiaWVzLXVwZGF0ZScsIHRoaXMucHVibGljTG9iYmllc0xpc3RlbmVyKTtcbiAgfSxcblxuICBzdG9wKCkge1xuICAgIGlmICghdGhpcy5zdGFydGVkKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdGhpcy5zdGFydGVkID0gZmFsc2U7XG4gICAgaWYgKHRoaXMucHVibGljTG9iYmllc0xpc3RlbmVyKSB7XG4gICAgICBkb2N1bWVudC5yZW1vdmVFdmVudExpc3RlbmVyKCdwdWJsaWMtbG9iYmllcy11cGRhdGUnLCB0aGlzLnB1YmxpY0xvYmJpZXNMaXN0ZW5lcik7XG4gICAgICB0aGlzLnB1YmxpY0xvYmJpZXNMaXN0ZW5lciA9IG51bGw7XG4gICAgfVxuICB9LFxuXG4gIHN1YnNjcmliZShjYWxsYmFjazogTG9iYnlDYWxsYmFjaykge1xuICAgIHRoaXMuc3Vic2NyaWJlcnMucHVzaChjYWxsYmFjayk7XG4gICAgaWYgKHRoaXMubGFzdExvYmJpZXMubGVuZ3RoID4gMCkge1xuICAgICAgY2FsbGJhY2sodGhpcy5sYXN0TG9iYmllcywgdGhpcy5sYXN0U2VydmVyVGltZSk7XG4gICAgfVxuICB9LFxuXG4gIG5vdGlmeVN1YnNjcmliZXJzKCkge1xuICAgIHRoaXMuc3Vic2NyaWJlcnMuZm9yRWFjaCgoY2IpID0+IGNiKHRoaXMubGFzdExvYmJpZXMsIHRoaXMubGFzdFNlcnZlclRpbWUpKTtcbiAgfSxcblxuICBoYW5kbGVQdWJsaWNMb2JiaWVzVXBkYXRlKGV2ZW50OiBFdmVudCkge1xuICAgIGNvbnN0IHBheWxvYWQgPSAoZXZlbnQgYXMgQ3VzdG9tRXZlbnQ8eyBwYXlsb2FkPzogdW5rbm93biB9PikuZGV0YWlsPy5wYXlsb2FkO1xuICAgIHRoaXMubGFzdExvYmJpZXMgPSB0aGlzLmV4dHJhY3RMb2JiaWVzKHBheWxvYWQpO1xuICAgIHRoaXMubGFzdFNlcnZlclRpbWUgPSB0aGlzLmV4dHJhY3RTZXJ2ZXJUaW1lKHBheWxvYWQpO1xuICAgIHRoaXMubm90aWZ5U3Vic2NyaWJlcnMoKTtcbiAgfSxcblxuICBleHRyYWN0U2VydmVyVGltZShwYXlsb2FkOiB1bmtub3duKTogbnVtYmVyIHwgbnVsbCB7XG4gICAgY29uc3Qgc2VydmVyVGltZSA9IChwYXlsb2FkIGFzIHsgc2VydmVyVGltZT86IHVua25vd24gfSB8IG51bGwgfCB1bmRlZmluZWQpPy5zZXJ2ZXJUaW1lO1xuICAgIHJldHVybiB0eXBlb2Ygc2VydmVyVGltZSA9PT0gJ251bWJlcicgJiYgTnVtYmVyLmlzRmluaXRlKHNlcnZlclRpbWUpID8gc2VydmVyVGltZSA6IG51bGw7XG4gIH0sXG5cbiAgZXh0cmFjdExvYmJpZXMocGF5bG9hZDogdW5rbm93bik6IExvYmJ5W10ge1xuICAgIGlmICghcGF5bG9hZCB8fCB0eXBlb2YgcGF5bG9hZCAhPT0gJ29iamVjdCcpIHtcbiAgICAgIHJldHVybiBbXTtcbiAgICB9XG5cbiAgICBpZiAoQXJyYXkuaXNBcnJheSgocGF5bG9hZCBhcyB7IGxvYmJpZXM/OiBMb2JieVtdIH0pLmxvYmJpZXMpKSB7XG4gICAgICByZXR1cm4gKHBheWxvYWQgYXMgeyBsb2JiaWVzOiBMb2JieVtdIH0pLmxvYmJpZXM7XG4gICAgfVxuXG4gICAgY29uc3QgZ2FtZXMgPSAocGF5bG9hZCBhcyBQdWJsaWNHYW1lc1Jlc3BvbnNlKS5nYW1lcztcbiAgICBpZiAoIWdhbWVzKSB7XG4gICAgICByZXR1cm4gW107XG4gICAgfVxuXG4gICAgcmV0dXJuIFFVRVVFX09SREVSLmZsYXRNYXAoKHF1ZXVlKSA9PlxuICAgICAgKGdhbWVzW3F1ZXVlXSA/PyBbXSkubWFwKChsb2JieSkgPT4gKHtcbiAgICAgICAgLi4ubG9iYnksXG4gICAgICAgIHB1YmxpY0dhbWVUeXBlOiBsb2JieS5wdWJsaWNHYW1lVHlwZSA/PyBxdWV1ZSxcbiAgICAgIH0pKVxuICAgICk7XG4gIH0sXG59O1xuIiwgIi8qKlxuICogTG9iYnlVdGlscyAtIEhlbHBlciBmdW5jdGlvbnMgZm9yIGludGVyYWN0aW5nIHdpdGggT3BlbkZyb250LmlvIGxvYmJ5IFVJXG4gKlxuICogUmVzcG9uc2liaWxpdGllczpcbiAqIC0gUXVlcnkgRE9NIGZvciBsb2JieS1yZWxhdGVkIGVsZW1lbnRzXG4gKiAtIERldGVybWluZSBsb2JieSBzdGF0ZSAoY2FuIGpvaW4sIGN1cnJlbnRseSBpbiBsb2JieSwgZXRjLilcbiAqIC0gUGVyZm9ybSBsb2JieSBqb2luL2xlYXZlIGFjdGlvbnMgd2l0aCBkZWJvdW5jaW5nXG4gKiAtIERldGVjdCB3aGV0aGVyIHVzZXIgaXMgb24gbG9iYnkgcGFnZSB2cyBpbi1nYW1lXG4gKlxuICogQ29tcGF0aWJsZSB3aXRoIE9wZW5Gcm9udC5pbyB2MC4yOS4wK1xuICovXG5cbi8qKlxuICogVHlwZSBhdWdtZW50YXRpb24gZm9yIHB1YmxpYy1sb2JieSBjdXN0b20gZWxlbWVudFxuICogT3BlbkZyb250LmlvIHVzZXMgY3VzdG9tIHdlYiBjb21wb25lbnRzIHdpdGggdGhlc2UgcHJvcGVydGllc1xuICovXG5pbnRlcmZhY2UgUHVibGljTG9iYnlFbGVtZW50IGV4dGVuZHMgRWxlbWVudCB7XG4gIGlzTG9iYnlIaWdobGlnaHRlZD86IGJvb2xlYW47XG4gIGxvYmJpZXM/OiBhbnlbXTtcbn1cblxuaW50ZXJmYWNlIExvYmJ5VXRpbHNTaW5nbGV0b24ge1xuICBsYXN0QWN0aW9uVGltZTogbnVtYmVyO1xuICBkZWJvdW5jZURlbGF5OiBudW1iZXI7XG4gIGdldExvYmJ5QnV0dG9uKCk6IEhUTUxCdXR0b25FbGVtZW50IHwgbnVsbDtcbiAgY2FuSm9pbkxvYmJ5KCk6IGJvb2xlYW47XG4gIHZlcmlmeVN0YXRlKGV4cGVjdGVkU3RhdGU6ICdpbicgfCAnb3V0Jyk6IGJvb2xlYW47XG4gIHRyeUpvaW5Mb2JieSgpOiBib29sZWFuO1xuICBpc09uTG9iYnlQYWdlKCk6IGJvb2xlYW47XG59XG5cbmV4cG9ydCBjb25zdCBMb2JieVV0aWxzOiBMb2JieVV0aWxzU2luZ2xldG9uID0ge1xuICBsYXN0QWN0aW9uVGltZTogMCxcbiAgZGVib3VuY2VEZWxheTogODAwLFxuXG4gIC8qKlxuICAgKiBHZXQgdGhlIGxvYmJ5IGpvaW4vbGVhdmUgYnV0dG9uIGZyb20gdGhlIERPTVxuICAgKiB2MC4yOS4wOiBRdWVyeSBidXR0b24gaW5zaWRlIHB1YmxpYy1sb2JieSBjb21wb25lbnRcbiAgICovXG4gIGdldExvYmJ5QnV0dG9uKCk6IEhUTUxCdXR0b25FbGVtZW50IHwgbnVsbCB7XG4gICAgY29uc3QgcHVibGljTG9iYnkgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCdwdWJsaWMtbG9iYnknKTtcbiAgICByZXR1cm4gcHVibGljTG9iYnk/LnF1ZXJ5U2VsZWN0b3IoJ2J1dHRvbi5ncm91cC5yZWxhdGl2ZS5pc29sYXRlJykgYXMgSFRNTEJ1dHRvbkVsZW1lbnQgfCBudWxsO1xuICB9LFxuXG4gIC8qKlxuICAgKiBDaGVjayBpZiBsb2JieSBjYW4gYmUgam9pbmVkIHJpZ2h0IG5vd1xuICAgKiB2MC4yOS4wOiBVc2UgY29tcG9uZW50J3MgaW50ZXJuYWwgc3RhdGUgaW5zdGVhZCBvZiBDU1MgY2xhc3Nlc1xuICAgKi9cbiAgY2FuSm9pbkxvYmJ5KCk6IGJvb2xlYW4ge1xuICAgIGNvbnN0IHB1YmxpY0xvYmJ5ID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcigncHVibGljLWxvYmJ5JykgYXMgUHVibGljTG9iYnlFbGVtZW50IHwgbnVsbDtcbiAgICBpZiAoIXB1YmxpY0xvYmJ5KSByZXR1cm4gZmFsc2U7XG5cbiAgICBjb25zdCBidG4gPSB0aGlzLmdldExvYmJ5QnV0dG9uKCk7XG4gICAgcmV0dXJuICEhKFxuICAgICAgYnRuICYmXG4gICAgICAhcHVibGljTG9iYnkuaXNMb2JieUhpZ2hsaWdodGVkICYmXG4gICAgICBwdWJsaWNMb2JieS5sb2JiaWVzICYmXG4gICAgICBwdWJsaWNMb2JieS5sb2JiaWVzLmxlbmd0aCA+IDAgJiZcbiAgICAgICFidG4uZGlzYWJsZWQgJiZcbiAgICAgIGJ0bi5vZmZzZXRQYXJlbnQgIT09IG51bGxcbiAgICApO1xuICB9LFxuXG4gIC8qKlxuICAgKiBWZXJpZnkgbG9iYnkgc3RhdGUgbWF0Y2hlcyBleHBlY3RlZCBzdGF0ZVxuICAgKiB2MC4yOS4wOiBDaGVjayBjb21wb25lbnQgc3RhdGUgaW5zdGVhZCBvZiBidXR0b24gY2xhc3Nlc1xuICAgKlxuICAgKiBAcGFyYW0gZXhwZWN0ZWRTdGF0ZSAtICdpbicgaWYgZXhwZWN0aW5nIHRvIGJlIGluIGxvYmJ5LCAnb3V0JyBpZiBleHBlY3RpbmcgdG8gYmUgb3V0XG4gICAqL1xuICB2ZXJpZnlTdGF0ZShleHBlY3RlZFN0YXRlOiAnaW4nIHwgJ291dCcpOiBib29sZWFuIHtcbiAgICBjb25zdCBwdWJsaWNMb2JieSA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJ3B1YmxpYy1sb2JieScpIGFzIFB1YmxpY0xvYmJ5RWxlbWVudCB8IG51bGw7XG4gICAgaWYgKCFwdWJsaWNMb2JieSkgcmV0dXJuIGZhbHNlO1xuXG4gICAgY29uc3QgYnRuID0gdGhpcy5nZXRMb2JieUJ1dHRvbigpO1xuICAgIGlmICghYnRuIHx8IGJ0bi5kaXNhYmxlZCB8fCBidG4ub2Zmc2V0UGFyZW50ID09PSBudWxsKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgaWYgKGV4cGVjdGVkU3RhdGUgPT09ICdpbicpIHtcbiAgICAgIHJldHVybiBwdWJsaWNMb2JieS5pc0xvYmJ5SGlnaGxpZ2h0ZWQgPT09IHRydWU7XG4gICAgfVxuXG4gICAgaWYgKGV4cGVjdGVkU3RhdGUgPT09ICdvdXQnKSB7XG4gICAgICByZXR1cm4gISEoXG4gICAgICAgICFwdWJsaWNMb2JieS5pc0xvYmJ5SGlnaGxpZ2h0ZWQgJiZcbiAgICAgICAgcHVibGljTG9iYnkubG9iYmllcyAmJlxuICAgICAgICBwdWJsaWNMb2JieS5sb2JiaWVzLmxlbmd0aCA+IDBcbiAgICAgICk7XG4gICAgfVxuXG4gICAgcmV0dXJuIGZhbHNlO1xuICB9LFxuXG4gIC8qKlxuICAgKiBBdHRlbXB0IHRvIGpvaW4gdGhlIGxvYmJ5IHdpdGggZGVib3VuY2luZ1xuICAgKiBSZXR1cm5zIHRydWUgaWYgam9pbiB3YXMgYXR0ZW1wdGVkLCBmYWxzZSBpZiBkZWJvdW5jZWQgb3IgdW5hYmxlIHRvIGpvaW5cbiAgICovXG4gIHRyeUpvaW5Mb2JieSgpOiBib29sZWFuIHtcbiAgICBjb25zdCBub3cgPSBEYXRlLm5vdygpO1xuXG4gICAgLy8gRGVib3VuY2U6IHByZXZlbnQgcmFwaWQtZmlyZSBqb2luIGF0dGVtcHRzXG4gICAgaWYgKG5vdyAtIHRoaXMubGFzdEFjdGlvblRpbWUgPCB0aGlzLmRlYm91bmNlRGVsYXkpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICBjb25zdCBidG4gPSB0aGlzLmdldExvYmJ5QnV0dG9uKCk7XG4gICAgY29uc3QgcHVibGljTG9iYnkgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCdwdWJsaWMtbG9iYnknKSBhcyBQdWJsaWNMb2JieUVsZW1lbnQgfCBudWxsO1xuXG4gICAgaWYgKFxuICAgICAgYnRuICYmXG4gICAgICBwdWJsaWNMb2JieSAmJlxuICAgICAgIXB1YmxpY0xvYmJ5LmlzTG9iYnlIaWdobGlnaHRlZCAmJlxuICAgICAgcHVibGljTG9iYnkubG9iYmllcyAmJlxuICAgICAgcHVibGljTG9iYnkubG9iYmllcy5sZW5ndGggPiAwICYmXG4gICAgICAhYnRuLmRpc2FibGVkICYmXG4gICAgICBidG4ub2Zmc2V0UGFyZW50ICE9PSBudWxsXG4gICAgKSB7XG4gICAgICB0aGlzLmxhc3RBY3Rpb25UaW1lID0gbm93O1xuICAgICAgYnRuLmNsaWNrKCk7XG5cbiAgICAgIC8vIFZlcmlmeSBqb2luIHdhcyBzdWNjZXNzZnVsIGFmdGVyIGEgc2hvcnQgZGVsYXlcbiAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICBpZiAoIXRoaXMudmVyaWZ5U3RhdGUoJ2luJykpIHtcbiAgICAgICAgICBjb25zb2xlLndhcm4oJ1tMb2JieVV0aWxzXSBKb2luIG1heSBoYXZlIGZhaWxlZCwgc3RhdGUgbm90IHVwZGF0ZWQnKTtcbiAgICAgICAgfVxuICAgICAgfSwgMTAwKTtcblxuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuXG4gICAgcmV0dXJuIGZhbHNlO1xuICB9LFxuXG4gIC8qKlxuICAgKiBEZXRlcm1pbmUgaWYgd2UncmUgY3VycmVudGx5IG9uIHRoZSBsb2JieSBwYWdlICh2cyBpbi1nYW1lKVxuICAgKiB2MC4yOS4wOiBNdWx0aXBsZSBjaGVja3MgdG8gaGFuZGxlIHZhcmlvdXMgcGFnZSBzdGF0ZXNcbiAgICovXG4gIGlzT25Mb2JieVBhZ2UoKTogYm9vbGVhbiB7XG4gICAgLy8gT3BlbkZyb250IG1hcmtzIHRoZSBib2R5IGR1cmluZyBhIGdhbWUsIGFsc28gaW4gc3RyZWFtZXIgbW9kZSB3aGVyZSB0aGUgVVJMIGhhcyBubyBgP2xpdmVgLlxuICAgIGlmIChkb2N1bWVudC5ib2R5LmNsYXNzTGlzdC5jb250YWlucygnaW4tZ2FtZScpKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgLy8gRmlyc3QgY2hlY2s6IElmIGdhbWUgcGFnZSBleGlzdHMgYW5kIGlzIHZpc2libGUsIHdlJ3JlIGRlZmluaXRlbHkgaW4gZ2FtZVxuICAgIGNvbnN0IHBhZ2VHYW1lID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3BhZ2UtZ2FtZScpO1xuICAgIGlmIChwYWdlR2FtZSAmJiAhcGFnZUdhbWUuY2xhc3NMaXN0LmNvbnRhaW5zKCdoaWRkZW4nKSkge1xuICAgICAgcmV0dXJuIGZhbHNlOyAvLyBXZSdyZSBkZWZpbml0ZWx5IGluIGEgZ2FtZVxuICAgIH1cblxuICAgIC8vIFNlY29uZCBjaGVjazogTG9vayBmb3IgdmlzaWJsZSBnYW1lIGNhbnZhcyAoc3Ryb25nIGluZGljYXRvciBvZiBhY3RpdmUgZ2FtZSlcbiAgICBjb25zdCBnYW1lQ2FudmFzID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignY2FudmFzJykgYXMgSFRNTEVsZW1lbnQgfCBudWxsO1xuICAgIGlmIChnYW1lQ2FudmFzICYmIGdhbWVDYW52YXMub2Zmc2V0UGFyZW50ICE9PSBudWxsKSB7XG4gICAgICBjb25zdCByZWN0ID0gZ2FtZUNhbnZhcy5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcbiAgICAgIGlmIChyZWN0LndpZHRoID4gMTAwICYmIHJlY3QuaGVpZ2h0ID4gMTAwKSB7XG4gICAgICAgIC8vIENhbnZhcyBpcyB2aXNpYmxlIHdpdGggcmVhc29uYWJsZSBkaW1lbnNpb25zLCBsaWtlbHkgaW4gZ2FtZVxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gVGhpcmQgY2hlY2s6IExvb2sgZm9yIHB1YmxpYy1sb2JieSBjb21wb25lbnQgdmlzaWJpbGl0eVxuICAgIGNvbnN0IHB1YmxpY0xvYmJ5ID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcigncHVibGljLWxvYmJ5JykgYXMgSFRNTEVsZW1lbnQgfCBudWxsO1xuICAgIGlmIChwdWJsaWNMb2JieSAmJiBwdWJsaWNMb2JieS5vZmZzZXRQYXJlbnQgIT09IG51bGwpIHtcbiAgICAgIC8vIFB1YmxpYyBsb2JieSBpcyB2aXNpYmxlIGFuZCByZW5kZXJlZCAtIHdlJ3JlIGluIGxvYmJ5XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG5cbiAgICAvLyBGb3VydGggY2hlY2s6IElmIHB1YmxpYy1sb2JieSBleGlzdHMgYnV0IGlzIGhpZGRlbiwgd2UncmUgTk9UIGluIGxvYmJ5XG4gICAgaWYgKHB1YmxpY0xvYmJ5ICYmIHB1YmxpY0xvYmJ5Lm9mZnNldFBhcmVudCA9PT0gbnVsbCkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIC8vIEZpZnRoIGNoZWNrOiBwYWdlLXBsYXkgdmlzaWJpbGl0eVxuICAgIGNvbnN0IHBhZ2VQbGF5ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3BhZ2UtcGxheScpO1xuICAgIGlmIChwYWdlUGxheSAmJiAhcGFnZVBsYXkuY2xhc3NMaXN0LmNvbnRhaW5zKCdoaWRkZW4nKSkge1xuICAgICAgLy8gV2UncmUgb24gdGhlIHBsYXkgcGFnZSAtIGNoZWNrIGlmIHdlIGhhdmUgYSBsb2JieSBjb21wb25lbnRcbiAgICAgIGlmIChwdWJsaWNMb2JieSkge1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBGYWxsYmFjayB0byBVUkwgY2hlY2tcbiAgICBjb25zdCBjdXJyZW50UGF0aCA9IHdpbmRvdy5sb2NhdGlvbi5wYXRobmFtZS5yZXBsYWNlKC9cXC8rJC8sICcnKSB8fCAnLyc7XG4gICAgcmV0dXJuIGN1cnJlbnRQYXRoID09PSAnLycgfHwgY3VycmVudFBhdGggPT09ICcvcHVibGljLWxvYmJ5JztcbiAgfSxcbn07XG4iLCAiZXhwb3J0IGludGVyZmFjZSBCcm93c2VyTm90aWZpY2F0aW9uUGF5bG9hZCB7XG4gIHRpdGxlOiBzdHJpbmc7XG4gIGJvZHk6IHN0cmluZztcbiAgdGFnOiBzdHJpbmc7XG4gIC8qKiBSdW5zIGFmdGVyIHRoZSB3aW5kb3cgZ2V0cyBmb2N1cywgd2hlbiB0aGUgdXNlciBjbGlja3MgdGhlIG5vdGlmaWNhdGlvbi4gKi9cbiAgb25DbGljaz86ICgpID0+IHZvaWQ7XG59XG5cbmludGVyZmFjZSBCcm93c2VyTm90aWZpY2F0aW9uVXRpbHNTaW5nbGV0b24ge1xuICBpc1N1cHBvcnRlZCgpOiBib29sZWFuO1xuICBpc0JhY2tncm91bmRlZCgpOiBib29sZWFuO1xuICBlbnN1cmVQZXJtaXNzaW9uKCk6IFByb21pc2U8Ym9vbGVhbj47XG4gIHNob3cocGF5bG9hZDogQnJvd3Nlck5vdGlmaWNhdGlvblBheWxvYWQpOiBib29sZWFuO1xuICBmb2N1c1dpbmRvdygpOiB2b2lkO1xufVxuXG5leHBvcnQgY29uc3QgQnJvd3Nlck5vdGlmaWNhdGlvblV0aWxzOiBCcm93c2VyTm90aWZpY2F0aW9uVXRpbHNTaW5nbGV0b24gPSB7XG4gIGlzU3VwcG9ydGVkKCkge1xuICAgIHJldHVybiB0eXBlb2YgTm90aWZpY2F0aW9uICE9PSAndW5kZWZpbmVkJztcbiAgfSxcblxuICBpc0JhY2tncm91bmRlZCgpIHtcbiAgICBjb25zdCBoaWRkZW4gPVxuICAgICAgZG9jdW1lbnQudmlzaWJpbGl0eVN0YXRlID09PSAnaGlkZGVuJyB8fFxuICAgICAgZG9jdW1lbnQuaGlkZGVuO1xuICAgIGNvbnN0IGZvY3VzZWQgPVxuICAgICAgdHlwZW9mIGRvY3VtZW50Lmhhc0ZvY3VzID09PSAnZnVuY3Rpb24nID8gZG9jdW1lbnQuaGFzRm9jdXMoKSA6IHRydWU7XG5cbiAgICByZXR1cm4gaGlkZGVuIHx8ICFmb2N1c2VkO1xuICB9LFxuXG4gIGFzeW5jIGVuc3VyZVBlcm1pc3Npb24oKSB7XG4gICAgaWYgKHR5cGVvZiBOb3RpZmljYXRpb24gPT09ICd1bmRlZmluZWQnKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgaWYgKE5vdGlmaWNhdGlvbi5wZXJtaXNzaW9uID09PSAnZ3JhbnRlZCcpIHtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cblxuICAgIGlmIChOb3RpZmljYXRpb24ucGVybWlzc2lvbiA9PT0gJ2RlbmllZCcpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICB0cnkge1xuICAgICAgcmV0dXJuIChhd2FpdCBOb3RpZmljYXRpb24ucmVxdWVzdFBlcm1pc3Npb24oKSkgPT09ICdncmFudGVkJztcbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgY29uc29sZS53YXJuKCdbQnJvd3Nlck5vdGlmaWNhdGlvblV0aWxzXSBQZXJtaXNzaW9uIHJlcXVlc3QgZmFpbGVkOicsIGVycm9yKTtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gIH0sXG5cbiAgc2hvdyhwYXlsb2FkKSB7XG4gICAgaWYgKCF0aGlzLmlzU3VwcG9ydGVkKCkgfHwgIXRoaXMuaXNCYWNrZ3JvdW5kZWQoKSkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIGlmIChOb3RpZmljYXRpb24ucGVybWlzc2lvbiA9PT0gJ2dyYW50ZWQnKSB7XG4gICAgICBjb25zdCBub3RpZmljYXRpb24gPSBuZXcgTm90aWZpY2F0aW9uKHBheWxvYWQudGl0bGUsIHtcbiAgICAgICAgYm9keTogcGF5bG9hZC5ib2R5LFxuICAgICAgfSk7XG4gICAgICBub3RpZmljYXRpb24ub25jbGljayA9ICgpID0+IHtcbiAgICAgICAgdGhpcy5mb2N1c1dpbmRvdygpO1xuICAgICAgICBwYXlsb2FkLm9uQ2xpY2s/LigpO1xuICAgICAgICBub3RpZmljYXRpb24uY2xvc2UoKTtcbiAgICAgIH07XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG5cbiAgICByZXR1cm4gZmFsc2U7XG4gIH0sXG5cbiAgZm9jdXNXaW5kb3coKSB7XG4gICAgd2luZG93LmZvY3VzKCk7XG4gIH0sXG59O1xuIiwgIi8qKlxuICogT3BlbkZyb250IG1hcHMgd2l0aCB0aGVpciBFbmdsaXNoIG5hbWVzIGFuZCBtYXAgcGlja2VyIGNhdGVnb3JpZXMuXG4gKiBNaXJyb3JzIE9wZW5Gcm9udCdzIEdhbWVNYXBUeXBlIGVudW0sIHJlc291cmNlcy9sYW5nL2VuLmpzb24gYW5kIG1hcCBpbmZvOyByZWZyZXNoIGl0IGJ5IGhhbmQuXG4gKi9cblxuZXhwb3J0IGludGVyZmFjZSBNYXBDYXRhbG9ndWVFbnRyeSB7XG4gIC8qKiBUaGUgYGdhbWVDb25maWcuZ2FtZU1hcGAgd2lyZSB2YWx1ZS4gKi9cbiAgZ2FtZU1hcDogc3RyaW5nO1xuICBuYW1lOiBzdHJpbmc7XG4gIGNhdGVnb3JpZXM6IHJlYWRvbmx5IE1hcENhdGVnb3J5W107XG59XG5cbmV4cG9ydCB0eXBlIE1hcENhdGVnb3J5ID1cbiAgfCAnd29ybGQnXG4gIHwgJ2NvbnRpbmVudGFsJ1xuICB8ICdldXJvcGUnXG4gIHwgJ2FzaWEnXG4gIHwgJ25vcnRoX2FtZXJpY2EnXG4gIHwgJ2FmcmljYSdcbiAgfCAnc291dGhfYW1lcmljYSdcbiAgfCAnb2NlYW5pYSdcbiAgfCAnYW50YXJjdGljYSdcbiAgfCAnY291bnRyaWVzJ1xuICB8ICdjb3NtaWMnXG4gIHwgJ2ZpY3Rpb25hbCdcbiAgfCAnYXJjYWRlJ1xuICB8ICd0b3VybmFtZW50J1xuICB8ICdvdGhlcic7XG5cbmV4cG9ydCBjb25zdCBNQVBfQ0FURUdPUllfTEFCRUxTOiBSZWNvcmQ8TWFwQ2F0ZWdvcnksIHN0cmluZz4gPSB7XG4gIHdvcmxkOiAnV29ybGQnLFxuICBjb250aW5lbnRhbDogJ0NvbnRpbmVudGFsJyxcbiAgZXVyb3BlOiAnRXVyb3BlJyxcbiAgYXNpYTogJ0FzaWEnLFxuICBub3J0aF9hbWVyaWNhOiAnTm9ydGggQW1lcmljYScsXG4gIGFmcmljYTogJ0FmcmljYScsXG4gIHNvdXRoX2FtZXJpY2E6ICdTb3V0aCBBbWVyaWNhJyxcbiAgb2NlYW5pYTogJ09jZWFuaWEnLFxuICBhbnRhcmN0aWNhOiAnQW50YXJjdGljYScsXG4gIGNvdW50cmllczogJ0NvdW50cmllcycsXG4gIGNvc21pYzogJ0Nvc21pYycsXG4gIGZpY3Rpb25hbDogJ0ZpY3Rpb25hbCcsXG4gIGFyY2FkZTogJ0FyY2FkZScsXG4gIHRvdXJuYW1lbnQ6ICdUb3VybmFtZW50JyxcbiAgb3RoZXI6ICdPdGhlcicsXG59O1xuXG5leHBvcnQgY29uc3QgTUFQX0NBVEVHT1JZX09SREVSOiByZWFkb25seSBNYXBDYXRlZ29yeVtdID0gW1xuICAnd29ybGQnLFxuICAnY29udGluZW50YWwnLFxuICAnZXVyb3BlJyxcbiAgJ2FzaWEnLFxuICAnbm9ydGhfYW1lcmljYScsXG4gICdhZnJpY2EnLFxuICAnc291dGhfYW1lcmljYScsXG4gICdvY2VhbmlhJyxcbiAgJ2FudGFyY3RpY2EnLFxuICAnY291bnRyaWVzJyxcbiAgJ2Nvc21pYycsXG4gICdmaWN0aW9uYWwnLFxuICAnYXJjYWRlJyxcbiAgJ3RvdXJuYW1lbnQnLFxuICAnb3RoZXInLFxuXTtcblxuZXhwb3J0IGNvbnN0IE1BUF9DQVRBTE9HVUU6IHJlYWRvbmx5IE1hcENhdGFsb2d1ZUVudHJ5W10gPSBbXG4gIHsgZ2FtZU1hcDogJ0FjaGlyYW4nLCBuYW1lOiAnQWNoaXJhbicsIGNhdGVnb3JpZXM6IFsnZXVyb3BlJywgJ2ZpY3Rpb25hbCddIH0sXG4gIHsgZ2FtZU1hcDogJ0FlZ2VhbicsIG5hbWU6ICdBZWdlYW4nLCBjYXRlZ29yaWVzOiBbJ2V1cm9wZScsICdhc2lhJ10gfSxcbiAgeyBnYW1lTWFwOiAnQWZyaWNhJywgbmFtZTogJ0FmcmljYScsIGNhdGVnb3JpZXM6IFsnY29udGluZW50YWwnLCAnYWZyaWNhJ10gfSxcbiAgeyBnYW1lTWFwOiAnQWxwcycsIG5hbWU6ICdBbHBzJywgY2F0ZWdvcmllczogWydldXJvcGUnXSB9LFxuICB7IGdhbWVNYXA6ICdBbWF6b24gUml2ZXInLCBuYW1lOiAnQW1hem9uIFJpdmVyJywgY2F0ZWdvcmllczogWydzb3V0aF9hbWVyaWNhJ10gfSxcbiAgeyBnYW1lTWFwOiAnQW50YXJjdGljYScsIG5hbWU6ICdBbnRhcmN0aWNhJywgY2F0ZWdvcmllczogWydjb250aW5lbnRhbCcsICdhbnRhcmN0aWNhJ10gfSxcbiAgeyBnYW1lTWFwOiAnQXJjaGlwZWxhZ29TZWEnLCBuYW1lOiAnQXJjaGlwZWxhZ28gU2VhJywgY2F0ZWdvcmllczogWydldXJvcGUnXSB9LFxuICB7IGdhbWVNYXA6ICdBcmN0aWMnLCBuYW1lOiAnQXJjdGljJywgY2F0ZWdvcmllczogWydldXJvcGUnLCAnYXNpYScsICdub3J0aF9hbWVyaWNhJ10gfSxcbiAgeyBnYW1lTWFwOiAnQXNpYScsIG5hbWU6ICdBc2lhJywgY2F0ZWdvcmllczogWydjb250aW5lbnRhbCcsICdhc2lhJ10gfSxcbiAgeyBnYW1lTWFwOiAnQXVzdHJhbGlhJywgbmFtZTogJ0F1c3RyYWxpYScsIGNhdGVnb3JpZXM6IFsnb2NlYW5pYSddIH0sXG4gIHsgZ2FtZU1hcDogJ0JhYiBlbC1NYW5kZWIgU3RyYWl0JywgbmFtZTogJ0JhYiBlbC1NYW5kZWIgU3RyYWl0JywgY2F0ZWdvcmllczogWydhc2lhJywgJ2FmcmljYSddIH0sXG4gIHsgZ2FtZU1hcDogJ0JhaWthbCcsIG5hbWU6ICdCYWlrYWwnLCBjYXRlZ29yaWVzOiBbJ2FzaWEnXSB9LFxuICB7IGdhbWVNYXA6ICdCYWlrYWwgTnVrZSBXYXJzJywgbmFtZTogJ0JhaWthbCAoTnVrZSBXYXJzKScsIGNhdGVnb3JpZXM6IFsnZmljdGlvbmFsJ10gfSxcbiAgeyBnYW1lTWFwOiAnQmFqYSBDYWxpZm9ybmlhJywgbmFtZTogJ0JhamEgQ2FsaWZvcm5pYScsIGNhdGVnb3JpZXM6IFsnbm9ydGhfYW1lcmljYSddIH0sXG4gIHsgZ2FtZU1hcDogJ0JhbGthbnMnLCBuYW1lOiAnQmFsa2FucycsIGNhdGVnb3JpZXM6IFsnZXVyb3BlJ10gfSxcbiAgeyBnYW1lTWFwOiAnQmFsa2hhc2gnLCBuYW1lOiAnQmFsa2hhc2gnLCBjYXRlZ29yaWVzOiBbJ2FzaWEnXSB9LFxuICB7IGdhbWVNYXA6ICdCYWx0aWNzJywgbmFtZTogJ0JhbHRpY3MnLCBjYXRlZ29yaWVzOiBbJ2V1cm9wZSddIH0sXG4gIHsgZ2FtZU1hcDogJ0JlbmVsdXgnLCBuYW1lOiAnQmVuZWx1eCcsIGNhdGVnb3JpZXM6IFsnZXVyb3BlJywgJ2NvdW50cmllcyddIH0sXG4gIHsgZ2FtZU1hcDogJ0JlcmluZyBTZWEnLCBuYW1lOiAnQmVyaW5nIFNlYScsIGNhdGVnb3JpZXM6IFsnYXNpYScsICdub3J0aF9hbWVyaWNhJ10gfSxcbiAgeyBnYW1lTWFwOiAnQmVyaW5nIFN0cmFpdCcsIG5hbWU6ICdCZXJpbmcgU3RyYWl0JywgY2F0ZWdvcmllczogWydhc2lhJywgJ25vcnRoX2FtZXJpY2EnXSB9LFxuICB7IGdhbWVNYXA6ICdCZXR3ZWVuIFR3byBTZWFzJywgbmFtZTogJ0JldHdlZW4gVHdvIFNlYXMnLCBjYXRlZ29yaWVzOiBbJ2V1cm9wZScsICdhc2lhJ10gfSxcbiAgeyBnYW1lTWFwOiAnQmxhY2sgU2VhJywgbmFtZTogJ0JsYWNrIFNlYScsIGNhdGVnb3JpZXM6IFsnZXVyb3BlJywgJ2FzaWEnXSB9LFxuICB7IGdhbWVNYXA6ICdCb3NwaG9ydXMgU3RyYWl0cycsIG5hbWU6ICdCb3NwaG9ydXMgU3RyYWl0cycsIGNhdGVnb3JpZXM6IFsnZXVyb3BlJywgJ2FzaWEnXSB9LFxuICB7IGdhbWVNYXA6ICdCcmFpbiBSb3QnLCBuYW1lOiAnQnJhaW4gUm90JywgY2F0ZWdvcmllczogWydhcmNhZGUnXSB9LFxuICB7IGdhbWVNYXA6ICdCcmFuY2hpbmcgUGF0aHMnLCBuYW1lOiAnQnJhbmNoaW5nIFBhdGhzJywgY2F0ZWdvcmllczogWydhcmNhZGUnXSB9LFxuICB7IGdhbWVNYXA6ICdCcml0YW5uaWEnLCBuYW1lOiAnQnJpdGFubmlhJywgY2F0ZWdvcmllczogWydldXJvcGUnXSB9LFxuICB7IGdhbWVNYXA6ICdCcml0YW5uaWEgQ2xhc3NpYycsIG5hbWU6ICdCcml0YW5uaWEgKENsYXNzaWMpJywgY2F0ZWdvcmllczogWydldXJvcGUnXSB9LFxuICB7IGdhbWVNYXA6ICdDYW5hcnkgSXNsYW5kcycsIG5hbWU6ICdDYW5hcnkgSXNsYW5kcycsIGNhdGVnb3JpZXM6IFsnYWZyaWNhJ10gfSxcbiAgeyBnYW1lTWFwOiAnQ2FwZSBDb2QnLCBuYW1lOiAnQ2FwZSBDb2QnLCBjYXRlZ29yaWVzOiBbJ25vcnRoX2FtZXJpY2EnXSB9LFxuICB7IGdhbWVNYXA6ICdDYXBlIE9mIEdvb2QgSG9wZScsIG5hbWU6ICdDYXBlIE9mIEdvb2QgSG9wZScsIGNhdGVnb3JpZXM6IFsnYWZyaWNhJ10gfSxcbiAgeyBnYW1lTWFwOiAnQ2FyaWJiZWFuJywgbmFtZTogJ0NhcmliYmVhbicsIGNhdGVnb3JpZXM6IFsnbm9ydGhfYW1lcmljYSddIH0sXG4gIHsgZ2FtZU1hcDogJ0Nhc3BpYW4gU2VhJywgbmFtZTogJ0Nhc3BpYW4gU2VhJywgY2F0ZWdvcmllczogWydhc2lhJ10gfSxcbiAgeyBnYW1lTWFwOiAnQ2F1Y2FzdXMnLCBuYW1lOiAnQ2F1Y2FzdXMnLCBjYXRlZ29yaWVzOiBbJ2V1cm9wZScsICdhc2lhJ10gfSxcbiAgeyBnYW1lTWFwOiAnQ2VudHJhbCBBbWVyaWNhJywgbmFtZTogJ0NlbnRyYWwgQW1lcmljYScsIGNhdGVnb3JpZXM6IFsnbm9ydGhfYW1lcmljYSddIH0sXG4gIHsgZ2FtZU1hcDogJ0NoYW5uZWwgSXNsYW5kcycsIG5hbWU6ICdDaGFubmVsIElzbGFuZHMnLCBjYXRlZ29yaWVzOiBbJ25vcnRoX2FtZXJpY2EnXSB9LFxuICB7IGdhbWVNYXA6ICdDaGluYScsIG5hbWU6ICdDaGluYScsIGNhdGVnb3JpZXM6IFsnYXNpYScsICdjb3VudHJpZXMnXSB9LFxuICB7IGdhbWVNYXA6ICdDaG9wcGluZyBCbG9jaycsIG5hbWU6ICdDaG9wcGluZyBCbG9jaycsIGNhdGVnb3JpZXM6IFsnYXJjYWRlJ10gfSxcbiAgeyBnYW1lTWFwOiAnQ2xlYXJ3YXRlciBMYWtlcycsIG5hbWU6ICdDbGVhcndhdGVyIExha2VzJywgY2F0ZWdvcmllczogWydub3J0aF9hbWVyaWNhJ10gfSxcbiAgeyBnYW1lTWFwOiAnQ29uYWtyeScsIG5hbWU6ICdDb25ha3J5JywgY2F0ZWdvcmllczogWydhZnJpY2EnXSB9LFxuICB7IGdhbWVNYXA6ICdDcmltZWEnLCBuYW1lOiAnQ3JpbWVhJywgY2F0ZWdvcmllczogWydldXJvcGUnXSB9LFxuICB7IGdhbWVNYXA6ICdEYW5pc2ggU3RyYWl0cycsIG5hbWU6ICdEYW5pc2ggU3RyYWl0cycsIGNhdGVnb3JpZXM6IFsnZXVyb3BlJ10gfSxcbiAgeyBnYW1lTWFwOiAnRGVnbGFjaWF0ZWQgQW50YXJjdGljYScsIG5hbWU6ICdEZWdsYWNpYXRlZCBBbnRhcmN0aWNhJywgY2F0ZWdvcmllczogWydhbnRhcmN0aWNhJywgJ2ZpY3Rpb25hbCddIH0sXG4gIHsgZ2FtZU1hcDogJ0RpZGllcicsIG5hbWU6ICdEaWRpZXInLCBjYXRlZ29yaWVzOiBbJ2FyY2FkZSddIH0sXG4gIHsgZ2FtZU1hcDogJ0RpZGllciBGcmFuY2UnLCBuYW1lOiAnRGlkaWVyIChGcmFuY2UpJywgY2F0ZWdvcmllczogWydhcmNhZGUnXSB9LFxuICB7IGdhbWVNYXA6ICdEeXNsZXhkcmlhJywgbmFtZTogJ0R5c2xleGRyaWEnLCBjYXRlZ29yaWVzOiBbJ3dvcmxkJywgJ2ZpY3Rpb25hbCddIH0sXG4gIHsgZ2FtZU1hcDogJ0Vhc3QgQXNpYScsIG5hbWU6ICdFYXN0IEFzaWEnLCBjYXRlZ29yaWVzOiBbJ2FzaWEnXSB9LFxuICB7IGdhbWVNYXA6ICdFdXJvcGUnLCBuYW1lOiAnRXVyb3BlJywgY2F0ZWdvcmllczogWydjb250aW5lbnRhbCcsICdldXJvcGUnXSB9LFxuICB7IGdhbWVNYXA6ICdFdXJvcGUgQ2xhc3NpYycsIG5hbWU6ICdFdXJvcGUgKENsYXNzaWMpJywgY2F0ZWdvcmllczogWydjb250aW5lbnRhbCcsICdldXJvcGUnXSB9LFxuICB7IGdhbWVNYXA6ICdGYWxrbGFuZCBJc2xhbmRzJywgbmFtZTogJ0ZhbGtsYW5kIElzbGFuZHMnLCBjYXRlZ29yaWVzOiBbJ3NvdXRoX2FtZXJpY2EnXSB9LFxuICB7IGdhbWVNYXA6ICdGYXJvZSBJc2xhbmRzJywgbmFtZTogJ0Zhcm9lIElzbGFuZHMnLCBjYXRlZ29yaWVzOiBbJ2V1cm9wZSddIH0sXG4gIHsgZ2FtZU1hcDogJ0ZpbmdlciBMYWtlcycsIG5hbWU6ICdGaW5nZXIgTGFrZXMnLCBjYXRlZ29yaWVzOiBbJ25vcnRoX2FtZXJpY2EnXSB9LFxuICB7IGdhbWVNYXA6ICdGb3VyIElzbGFuZHMnLCBuYW1lOiAnRm91ciBJc2xhbmRzJywgY2F0ZWdvcmllczogWydmaWN0aW9uYWwnXSB9LFxuICB7IGdhbWVNYXA6ICdGcmFuY2UnLCBuYW1lOiAnRnJhbmNlJywgY2F0ZWdvcmllczogWydldXJvcGUnLCAnY291bnRyaWVzJ10gfSxcbiAgeyBnYW1lTWFwOiAnR2F0ZXdheSB0byB0aGUgQXRsYW50aWMnLCBuYW1lOiAnR2F0ZXdheSB0byB0aGUgQXRsYW50aWMnLCBjYXRlZ29yaWVzOiBbJ2V1cm9wZSddIH0sXG4gIHsgZ2FtZU1hcDogJ0dlcm1hbnknLCBuYW1lOiAnR2VybWFueScsIGNhdGVnb3JpZXM6IFsnZXVyb3BlJywgJ2NvdW50cmllcyddIH0sXG4gIHsgZ2FtZU1hcDogJ0dpYW50IFdvcmxkIE1hcCcsIG5hbWU6ICdHaWFudCBXb3JsZCBNYXAnLCBjYXRlZ29yaWVzOiBbJ3dvcmxkJ10gfSxcbiAgeyBnYW1lTWFwOiAnR3JlYXQgTGFrZXMnLCBuYW1lOiAnR3JlYXQgTGFrZXMnLCBjYXRlZ29yaWVzOiBbJ25vcnRoX2FtZXJpY2EnXSB9LFxuICB7IGdhbWVNYXA6ICdHdWxmIE9mIEd1aW5lYScsIG5hbWU6ICdHdWxmIE9mIEd1aW5lYScsIGNhdGVnb3JpZXM6IFsnYWZyaWNhJ10gfSxcbiAgeyBnYW1lTWFwOiAnR3VsZiBPZiBNZXhpY28nLCBuYW1lOiAnR3VsZiBPZiBNZXhpY28nLCBjYXRlZ29yaWVzOiBbJ25vcnRoX2FtZXJpY2EnXSB9LFxuICB7IGdhbWVNYXA6ICdHdWxmIG9mIFN0LiBMYXdyZW5jZScsIG5hbWU6ICdHdWxmIG9mIFN0LiBMYXdyZW5jZScsIGNhdGVnb3JpZXM6IFsnbm9ydGhfYW1lcmljYSddIH0sXG4gIHsgZ2FtZU1hcDogJ0hhbGtpZGlraScsIG5hbWU6ICdIYWxraWRpa2knLCBjYXRlZ29yaWVzOiBbJ2V1cm9wZSddIH0sXG4gIHsgZ2FtZU1hcDogJ0hhd2FpaScsIG5hbWU6ICdIYXdhaWknLCBjYXRlZ29yaWVzOiBbJ29jZWFuaWEnXSB9LFxuICB7IGdhbWVNYXA6ICdIZWNhdGUgU3RyYWl0JywgbmFtZTogJ0hlY2F0ZSBTdHJhaXQnLCBjYXRlZ29yaWVzOiBbJ25vcnRoX2FtZXJpY2EnXSB9LFxuICB7IGdhbWVNYXA6ICdIb25nIEtvbmcnLCBuYW1lOiAnSG9uZyBLb25nJywgY2F0ZWdvcmllczogWydhc2lhJ10gfSxcbiAgeyBnYW1lTWFwOiAnSG9ybiBPZiBBZnJpY2EnLCBuYW1lOiAnSG9ybiBPZiBBZnJpY2EnLCBjYXRlZ29yaWVzOiBbJ2FmcmljYSddIH0sXG4gIHsgZ2FtZU1hcDogJ0ljZWxhbmQnLCBuYW1lOiAnSWNlbGFuZCcsIGNhdGVnb3JpZXM6IFsnZXVyb3BlJ10gfSxcbiAgeyBnYW1lTWFwOiAnSW5kaWFuIFN1YmNvbnRpbmVudCcsIG5hbWU6ICdJbmRpYW4gU3ViY29udGluZW50JywgY2F0ZWdvcmllczogWydhc2lhJ10gfSxcbiAgeyBnYW1lTWFwOiAnSXJpc2ggU2VhJywgbmFtZTogJ0lyaXNoIFNlYScsIGNhdGVnb3JpZXM6IFsnZXVyb3BlJ10gfSxcbiAgeyBnYW1lTWFwOiAnSXRhbGlhJywgbmFtZTogJ0l0YWxpYScsIGNhdGVnb3JpZXM6IFsnZXVyb3BlJ10gfSxcbiAgeyBnYW1lTWFwOiAnSmFwYW4nLCBuYW1lOiAnSmFwYW4nLCBjYXRlZ29yaWVzOiBbJ2FzaWEnLCAnY291bnRyaWVzJ10gfSxcbiAgeyBnYW1lTWFwOiAnSnVhbiBEZSBGdWNhIFN0cmFpdCcsIG5hbWU6ICdKdWFuIERlIEZ1Y2EgU3RyYWl0JywgY2F0ZWdvcmllczogWydub3J0aF9hbWVyaWNhJ10gfSxcbiAgeyBnYW1lTWFwOiAnS29yZWEnLCBuYW1lOiAnS29yZWEnLCBjYXRlZ29yaWVzOiBbJ2FzaWEnLCAnY291bnRyaWVzJ10gfSxcbiAgeyBnYW1lTWFwOiAnTGFieXJpbnRoJywgbmFtZTogJ0xhYnlyaW50aCcsIGNhdGVnb3JpZXM6IFsnYXJjYWRlJ10gfSxcbiAgeyBnYW1lTWFwOiAnTGFzIFZlZ2FzIFN0cmlwJywgbmFtZTogJ0xhcyBWZWdhcyBTdHJpcCcsIGNhdGVnb3JpZXM6IFsnbm9ydGhfYW1lcmljYSddIH0sXG4gIHsgZ2FtZU1hcDogJ0xlbW5vcycsIG5hbWU6ICdMZW1ub3MnLCBjYXRlZ29yaWVzOiBbJ2V1cm9wZSddIH0sXG4gIHsgZ2FtZU1hcDogJ0xldmFudCcsIG5hbWU6ICdMZXZhbnQnLCBjYXRlZ29yaWVzOiBbJ2FzaWEnXSB9LFxuICB7IGdhbWVNYXA6ICdMaXNib24nLCBuYW1lOiAnTGlzYm9uJywgY2F0ZWdvcmllczogWydldXJvcGUnXSB9LFxuICB7IGdhbWVNYXA6ICdMb3MgQW5nZWxlcycsIG5hbWU6ICdMb3MgQW5nZWxlcycsIGNhdGVnb3JpZXM6IFsnbm9ydGhfYW1lcmljYSddIH0sXG4gIHsgZ2FtZU1hcDogJ0x1bmEnLCBuYW1lOiAnTHVuYScsIGNhdGVnb3JpZXM6IFsnY29zbWljJ10gfSxcbiAgeyBnYW1lTWFwOiAnTWFkYWdhc2NhcicsIG5hbWU6ICdNYWRhZ2FzY2FyJywgY2F0ZWdvcmllczogWydhZnJpY2EnXSB9LFxuICB7IGdhbWVNYXA6ICdNYW5pY291YWdhbicsIG5hbWU6ICdNYW5pY291YWdhbicsIGNhdGVnb3JpZXM6IFsnbm9ydGhfYW1lcmljYSddIH0sXG4gIHsgZ2FtZU1hcDogJ01hcmUgTm9zdHJ1bScsIG5hbWU6ICdNYXJlIE5vc3RydW0nLCBjYXRlZ29yaWVzOiBbJ2V1cm9wZScsICdhc2lhJywgJ2FmcmljYSddIH0sXG4gIHsgZ2FtZU1hcDogJ01hcnMnLCBuYW1lOiAnTWFycycsIGNhdGVnb3JpZXM6IFsnY29zbWljJ10gfSxcbiAgeyBnYW1lTWFwOiAnTWVuYScsIG5hbWU6ICdNRU5BJywgY2F0ZWdvcmllczogWydhc2lhJywgJ2FmcmljYSddIH0sXG4gIHsgZ2FtZU1hcDogJ01pZGRsZSBFYXN0JywgbmFtZTogJ01pZGRsZSBFYXN0JywgY2F0ZWdvcmllczogWydhc2lhJ10gfSxcbiAgeyBnYW1lTWFwOiAnTWlsa3lXYXknLCBuYW1lOiAnTWlsa3kgV2F5JywgY2F0ZWdvcmllczogWydjb3NtaWMnXSB9LFxuICB7IGdhbWVNYXA6ICdNaXNzaXNzaXBwaSBSaXZlcicsIG5hbWU6ICdNaXNzaXNzaXBwaSBSaXZlcicsIGNhdGVnb3JpZXM6IFsnbm9ydGhfYW1lcmljYSddIH0sXG4gIHsgZ2FtZU1hcDogJ01vbnRyZWFsJywgbmFtZTogJ01vbnRyZWFsJywgY2F0ZWdvcmllczogWydub3J0aF9hbWVyaWNhJ10gfSxcbiAgeyBnYW1lTWFwOiAnTW9yZSBUaGFuIEx1Y2snLCBuYW1lOiAnTW9yZSBUaGFuIEx1Y2snLCBjYXRlZ29yaWVzOiBbJ2FyY2FkZSddIH0sXG4gIHsgZ2FtZU1hcDogJ05ldyBZb3JrIENpdHknLCBuYW1lOiAnTmV3IFlvcmsgQ2l0eScsIGNhdGVnb3JpZXM6IFsnbm9ydGhfYW1lcmljYSddIH0sXG4gIHsgZ2FtZU1hcDogJ05ldyBaZWFsYW5kJywgbmFtZTogJ05ldyBaZWFsYW5kJywgY2F0ZWdvcmllczogWydvY2VhbmlhJ10gfSxcbiAgeyBnYW1lTWFwOiAnTmlsZSBEZWx0YScsIG5hbWU6ICdOaWxlIERlbHRhJywgY2F0ZWdvcmllczogWydhZnJpY2EnXSB9LFxuICB7IGdhbWVNYXA6ICdOb3J0aCBBbWVyaWNhJywgbmFtZTogJ05vcnRoIEFtZXJpY2EnLCBjYXRlZ29yaWVzOiBbJ2NvbnRpbmVudGFsJywgJ25vcnRoX2FtZXJpY2EnXSB9LFxuICB7IGdhbWVNYXA6ICdOb3J0aHdlc3QgUGFzc2FnZScsIG5hbWU6ICdOb3J0aHdlc3QgUGFzc2FnZScsIGNhdGVnb3JpZXM6IFsnbm9ydGhfYW1lcmljYSddIH0sXG4gIHsgZ2FtZU1hcDogJ09jZWFuaWEnLCBuYW1lOiAnT2NlYW5pYScsIGNhdGVnb3JpZXM6IFsnY29udGluZW50YWwnLCAnb2NlYW5pYSddIH0sXG4gIHsgZ2FtZU1hcDogJ09tbWF0cnlwdGEnLCBuYW1lOiAnT21tYXRyeXB0YScsIGNhdGVnb3JpZXM6IFsnYXJjYWRlJ10gfSxcbiAgeyBnYW1lTWFwOiAnT25pb24nLCBuYW1lOiAnT25pb24nLCBjYXRlZ29yaWVzOiBbJ2FyY2FkZSddIH0sXG4gIHsgZ2FtZU1hcDogJ1BhbmdhZWEnLCBuYW1lOiAnUGFuZ2FlYScsIGNhdGVnb3JpZXM6IFsnZmljdGlvbmFsJ10gfSxcbiAgeyBnYW1lTWFwOiAnUGFzc2FnZScsIG5hbWU6ICdQYXNzYWdlJywgY2F0ZWdvcmllczogWydmaWN0aW9uYWwnXSB9LFxuICB7IGdhbWVNYXA6ICdQbHV0bycsIG5hbWU6ICdQbHV0bycsIGNhdGVnb3JpZXM6IFsnY29zbWljJ10gfSxcbiAgeyBnYW1lTWFwOiAnUHVsaWNhdCBMYWtlJywgbmFtZTogJ1B1bGljYXQgTGFrZScsIGNhdGVnb3JpZXM6IFsnYXNpYSddIH0sXG4gIHsgZ2FtZU1hcDogJ1FpbmcgQ2hpbmEnLCBuYW1lOiAnUWluZyBDaGluYScsIGNhdGVnb3JpZXM6IFsnYXNpYScsICdjb3VudHJpZXMnXSB9LFxuICB7IGdhbWVNYXA6ICdSaW8gZGUgSmFuZWlybycsIG5hbWU6ICdSaW8gZGUgSmFuZWlybycsIGNhdGVnb3JpZXM6IFsnc291dGhfYW1lcmljYSddIH0sXG4gIHsgZ2FtZU1hcDogJ1J1c3NpYScsIG5hbWU6ICdSdXNzaWEnLCBjYXRlZ29yaWVzOiBbJ2V1cm9wZScsICdhc2lhJywgJ2NvdW50cmllcyddIH0sXG4gIHsgZ2FtZU1hcDogJ1NhbiBGcmFuY2lzY28nLCBuYW1lOiAnU2FuIEZyYW5jaXNjbycsIGNhdGVnb3JpZXM6IFsnbm9ydGhfYW1lcmljYSddIH0sXG4gIHsgZ2FtZU1hcDogJ1NjYW5kaW5hdmlhJywgbmFtZTogJ1NjYW5kaW5hdmlhJywgY2F0ZWdvcmllczogWydldXJvcGUnXSB9LFxuICB7IGdhbWVNYXA6ICdTaWVycGluc2tpJywgbmFtZTogJ1NpZXJwaW5za2knLCBjYXRlZ29yaWVzOiBbJ2FyY2FkZSddIH0sXG4gIHsgZ2FtZU1hcDogJ1NvbCcsIG5hbWU6ICdTb2wnLCBjYXRlZ29yaWVzOiBbJ2Nvc21pYyddIH0sXG4gIHsgZ2FtZU1hcDogJ1NvdXRoIEFtZXJpY2EnLCBuYW1lOiAnU291dGggQW1lcmljYScsIGNhdGVnb3JpZXM6IFsnY29udGluZW50YWwnLCAnc291dGhfYW1lcmljYSddIH0sXG4gIHsgZ2FtZU1hcDogJ1NvdXRoZWFzdEFzaWEnLCBuYW1lOiAnU291dGhlYXN0IEFzaWEnLCBjYXRlZ29yaWVzOiBbJ2FzaWEnXSB9LFxuICB7IGdhbWVNYXA6ICdTdHJhaXQgb2YgR2licmFsdGFyJywgbmFtZTogJ1N0cmFpdCBvZiBHaWJyYWx0YXInLCBjYXRlZ29yaWVzOiBbJ2V1cm9wZScsICdhZnJpY2EnXSB9LFxuICB7IGdhbWVNYXA6ICdTdHJhaXQgb2YgSG9ybXV6JywgbmFtZTogJ1N0cmFpdCBvZiBIb3JtdXonLCBjYXRlZ29yaWVzOiBbJ2FzaWEnXSB9LFxuICB7IGdhbWVNYXA6ICdTdHJhaXQgT2YgTWFsYWNjYScsIG5hbWU6ICdTdHJhaXQgT2YgTWFsYWNjYScsIGNhdGVnb3JpZXM6IFsnYXNpYSddIH0sXG4gIHsgZ2FtZU1hcDogJ1N1cnJvdW5kZWQnLCBuYW1lOiAnU3Vycm91bmRlZCcsIGNhdGVnb3JpZXM6IFsnZmljdGlvbmFsJ10gfSxcbiAgeyBnYW1lTWFwOiAnU3ZhbG1lbCcsIG5hbWU6ICdTdmFsbWVsJywgY2F0ZWdvcmllczogWydldXJvcGUnLCAnbm9ydGhfYW1lcmljYScsICdmaWN0aW9uYWwnXSB9LFxuICB7IGdhbWVNYXA6ICdUYWl3YW4gU3RyYWl0JywgbmFtZTogJ1RhaXdhbiBTdHJhaXQnLCBjYXRlZ29yaWVzOiBbJ2FzaWEnXSB9LFxuICB7IGdhbWVNYXA6ICdUaGUgQm94JywgbmFtZTogJ1RoZSBCb3gnLCBjYXRlZ29yaWVzOiBbJ2FyY2FkZSddIH0sXG4gIHsgZ2FtZU1hcDogJ1RpZXJyYSBEZWwgRnVlZ28nLCBuYW1lOiAnVGllcnJhIERlbCBGdWVnbycsIGNhdGVnb3JpZXM6IFsnc291dGhfYW1lcmljYSddIH0sXG4gIHsgZ2FtZU1hcDogJ1RpdGFuJywgbmFtZTogJ1RpdGFuJywgY2F0ZWdvcmllczogWydjb3NtaWMnXSB9LFxuICB7IGdhbWVNYXA6ICdUb3VybmV5IDIgVGVhbXMnLCBuYW1lOiAnVG91cm5leSAyIFRlYW1zJywgY2F0ZWdvcmllczogWyd0b3VybmFtZW50J10gfSxcbiAgeyBnYW1lTWFwOiAnVG91cm5leSAzIFRlYW1zJywgbmFtZTogJ1RvdXJuZXkgMyBUZWFtcycsIGNhdGVnb3JpZXM6IFsndG91cm5hbWVudCddIH0sXG4gIHsgZ2FtZU1hcDogJ1RvdXJuZXkgNCBUZWFtcycsIG5hbWU6ICdUb3VybmV5IDQgVGVhbXMnLCBjYXRlZ29yaWVzOiBbJ3RvdXJuYW1lbnQnXSB9LFxuICB7IGdhbWVNYXA6ICdUb3VybmV5IDggVGVhbXMnLCBuYW1lOiAnVG91cm5leSA4IFRlYW1zJywgY2F0ZWdvcmllczogWyd0b3VybmFtZW50J10gfSxcbiAgeyBnYW1lTWFwOiAnVHJhZGVycyBEcmVhbScsIG5hbWU6ICdUcmFkZXJzIERyZWFtJywgY2F0ZWdvcmllczogWydmaWN0aW9uYWwnXSB9LFxuICB7IGdhbWVNYXA6ICdUd28gTGFrZXMnLCBuYW1lOiAnVHdvIExha2VzJywgY2F0ZWdvcmllczogWydldXJvcGUnXSB9LFxuICB7IGdhbWVNYXA6ICdVbml0ZWQgU3RhdGVzJywgbmFtZTogJ1VuaXRlZCBTdGF0ZXMnLCBjYXRlZ29yaWVzOiBbJ25vcnRoX2FtZXJpY2EnLCAnY291bnRyaWVzJ10gfSxcbiAgeyBnYW1lTWFwOiAnVmFuY291dmVyIElzbGFuZCcsIG5hbWU6ICdWYW5jb3V2ZXIgSXNsYW5kJywgY2F0ZWdvcmllczogWydub3J0aF9hbWVyaWNhJ10gfSxcbiAgeyBnYW1lTWFwOiAnVmVuaWNlJywgbmFtZTogJ1ZlbmljZScsIGNhdGVnb3JpZXM6IFsnZXVyb3BlJ10gfSxcbiAgeyBnYW1lTWFwOiAnVmlldG5hbScsIG5hbWU6ICdWaWV0bmFtJywgY2F0ZWdvcmllczogWydhc2lhJywgJ2NvdW50cmllcyddIH0sXG4gIHsgZ2FtZU1hcDogJ1dhcnNoaXAgV2Fyc2hpcCcsIG5hbWU6ICdXYXJzaGlwIFdhcnNoaXAnLCBjYXRlZ29yaWVzOiBbJ2FyY2FkZSddIH0sXG4gIHsgZ2FtZU1hcDogJ1dvcmxkJywgbmFtZTogJ1dvcmxkJywgY2F0ZWdvcmllczogWyd3b3JsZCddIH0sXG4gIHsgZ2FtZU1hcDogJ1dvcmxkIEludmVydGVkJywgbmFtZTogJ1dvcmxkIEludmVydGVkJywgY2F0ZWdvcmllczogWyd3b3JsZCcsICdmaWN0aW9uYWwnXSB9LFxuICB7IGdhbWVNYXA6ICdZYW5ndHplIFJpdmVyJywgbmFtZTogJ1lhbmd0emUgUml2ZXInLCBjYXRlZ29yaWVzOiBbJ2FzaWEnXSB9LFxuICB7IGdhbWVNYXA6ICdZZWxsb3cgU2VhJywgbmFtZTogJ1llbGxvdyBTZWEnLCBjYXRlZ29yaWVzOiBbJ2FzaWEnXSB9LFxuICB7IGdhbWVNYXA6ICdZZW5pc2VpJywgbmFtZTogJ1llbmlzZWknLCBjYXRlZ29yaWVzOiBbJ2FzaWEnXSB9LFxuXTtcblxuIiwgIi8qKlxuICogSGVscGVyIGZ1bmN0aW9ucyBmb3IgdGhlIGxvYmJ5IGRpc2NvdmVyeSBtb2R1bGUuXG4gKiBQdXJlIGZ1bmN0aW9ucyB3aXRoIG5vIHNpZGUgZWZmZWN0cy5cbiAqL1xuXG5pbXBvcnQgeyBURUFNX01JTl9QTEFZRVJTX1BFUl9URUFNIH0gZnJvbSAnQC9jb25maWcvY29uc3RhbnRzJztcbmltcG9ydCB7IE1BUF9DQVRBTE9HVUUgfSBmcm9tICdAL2NvbmZpZy9tYXBDYXRhbG9ndWUnO1xuaW1wb3J0IHR5cGUgeyBMb2JieSB9IGZyb20gJ0AvdHlwZXMvZ2FtZSc7XG5pbXBvcnQgdHlwZSB7XG4gIERpc2NvdmVyeUNyaXRlcmlhLFxuICBEaXNjb3ZlcnlHYW1lTW9kZSxcbiAgTG9iYnlEaXNjb3ZlcnlTZXR0aW5ncyxcbiAgTWFwRmlsdGVyLFxuICBNb2RpZmllckZpbHRlcnMsXG4gIE1vZGlmaWVyRmlsdGVyU3RhdGUsXG4gIE51bWVyaWNNb2RpZmllclN0YXRlLFxuICBRdWV1ZVNvdXJjZSxcbiAgVGVhbUNvdW50LFxufSBmcm9tICcuL0xvYmJ5RGlzY292ZXJ5VHlwZXMnO1xuXG5jb25zdCBERUZBVUxUX01PRElGSUVSX0ZJTFRFUl9TVEFURTogTW9kaWZpZXJGaWx0ZXJTdGF0ZSA9ICdhbnknO1xuXG5leHBvcnQgZnVuY3Rpb24gbm9ybWFsaXplR2FtZU1vZGUoXG4gIG1vZGU6IHN0cmluZyB8IG51bGwgfCB1bmRlZmluZWRcbik6IERpc2NvdmVyeUdhbWVNb2RlIHwgbnVsbCB7XG4gIGlmICghbW9kZSkgcmV0dXJuIG51bGw7XG5cbiAgY29uc3QgbG93ZXIgPSBtb2RlLnRvTG93ZXJDYXNlKCkudHJpbSgpO1xuICBpZiAoXG4gICAgbG93ZXIgPT09ICdmcmVlIGZvciBhbGwnIHx8XG4gICAgbG93ZXIgPT09ICdmZmEnIHx8XG4gICAgbG93ZXIgPT09ICdmcmVlLWZvci1hbGwnXG4gICkge1xuICAgIHJldHVybiAnRkZBJztcbiAgfVxuICBpZiAobG93ZXIgPT09ICd0ZWFtJyB8fCBsb3dlciA9PT0gJ3RlYW1zJykge1xuICAgIHJldHVybiAnVGVhbSc7XG4gIH1cbiAgcmV0dXJuIG51bGw7XG59XG5cbmNvbnN0IE1BUF9OQU1FUyA9IG5ldyBNYXAoTUFQX0NBVEFMT0dVRS5tYXAoKGVudHJ5KSA9PiBbZW50cnkuZ2FtZU1hcCwgZW50cnkubmFtZV0pKTtcblxuLyoqIE9wZW5Gcm9udCdzIEVuZ2xpc2ggbmFtZSBmb3IgYSBgZ2FtZU1hcGAgdmFsdWUsIG9yIHRoZSB2YWx1ZSBpdHNlbGYgZm9yIGFuIHVua25vd24gbWFwLiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldE1hcERpc3BsYXlOYW1lKGdhbWVNYXA6IHN0cmluZyk6IHN0cmluZyB7XG4gIHJldHVybiBNQVBfTkFNRVMuZ2V0KGdhbWVNYXApID8/IGdhbWVNYXA7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXRMb2JieUdhbWVNb2RlKGxvYmJ5OiBMb2JieSk6IERpc2NvdmVyeUdhbWVNb2RlIHwgbnVsbCB7XG4gIHJldHVybiBub3JtYWxpemVHYW1lTW9kZShsb2JieS5nYW1lQ29uZmlnPy5nYW1lTW9kZSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXRMb2JieVF1ZXVlU291cmNlKGxvYmJ5OiBMb2JieSk6IFF1ZXVlU291cmNlIHwgbnVsbCB7XG4gIGNvbnN0IHNvdXJjZSA9IGxvYmJ5LnB1YmxpY0dhbWVUeXBlPy50b0xvd2VyQ2FzZSgpLnRyaW0oKTtcbiAgaWYgKHNvdXJjZSA9PT0gJ2ZmYScgfHwgc291cmNlID09PSAndGVhbScgfHwgc291cmNlID09PSAnc3BlY2lhbCcgfHwgc291cmNlID09PSAnaG9zdGVkJykge1xuICAgIHJldHVybiBzb3VyY2U7XG4gIH1cbiAgcmV0dXJuIG51bGw7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBwYXJzZVRlYW1Db3VudChcbiAgdmFsdWU6IHN0cmluZyB8IG51bWJlciB8IG51bGwgfCB1bmRlZmluZWRcbik6IFRlYW1Db3VudCB8IG51bGwge1xuICBpZiAoXG4gICAgdmFsdWUgPT09ICdEdW9zJyB8fFxuICAgIHZhbHVlID09PSAnVHJpb3MnIHx8XG4gICAgdmFsdWUgPT09ICdRdWFkcycgfHxcbiAgICB2YWx1ZSA9PT0gJ0h1bWFucyBWcyBOYXRpb25zJyB8fFxuICAgIHZhbHVlID09PSAnOCsnXG4gICkge1xuICAgIHJldHVybiB2YWx1ZTtcbiAgfVxuXG4gIGlmICh0eXBlb2YgdmFsdWUgPT09ICdudW1iZXInICYmIE51bWJlci5pc0Zpbml0ZSh2YWx1ZSkgJiYgdmFsdWUgPiAwKSB7XG4gICAgcmV0dXJuIHZhbHVlO1xuICB9XG5cbiAgaWYgKHR5cGVvZiB2YWx1ZSA9PT0gJ3N0cmluZycpIHtcbiAgICBjb25zdCBwYXJzZWQgPSBwYXJzZUludCh2YWx1ZSwgMTApO1xuICAgIGlmICghTnVtYmVyLmlzTmFOKHBhcnNlZCkgJiYgcGFyc2VkID4gMCkge1xuICAgICAgcmV0dXJuIHBhcnNlZDtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gbnVsbDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGdldExvYmJ5VGVhbUNvbmZpZyhsb2JieTogTG9iYnkpOiBUZWFtQ291bnQgfCBudWxsIHtcbiAgY29uc3QgY29uZmlnID0gbG9iYnkuZ2FtZUNvbmZpZztcbiAgaWYgKCFjb25maWcgfHwgZ2V0TG9iYnlHYW1lTW9kZShsb2JieSkgIT09ICdUZWFtJykgcmV0dXJuIG51bGw7XG5cbiAgY29uc3QgcGxheWVyVGVhbXMgPSBwYXJzZVRlYW1Db3VudChjb25maWcucGxheWVyVGVhbXMgPz8gbnVsbCk7XG4gIGlmIChwbGF5ZXJUZWFtcyAhPT0gbnVsbCkge1xuICAgIHJldHVybiBwbGF5ZXJUZWFtcztcbiAgfVxuXG4gIHJldHVybiBwYXJzZVRlYW1Db3VudChjb25maWcudGVhbUNvdW50ID8/IGNvbmZpZy50ZWFtcyA/PyBudWxsKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGdldExvYmJ5Q2FwYWNpdHkobG9iYnk6IExvYmJ5KTogbnVtYmVyIHwgbnVsbCB7XG4gIGNvbnN0IGNvbmZpZyA9IGxvYmJ5LmdhbWVDb25maWc7XG4gIGlmICghY29uZmlnKSByZXR1cm4gbnVsbDtcblxuICByZXR1cm4gKFxuICAgIGNvbmZpZy5tYXhQbGF5ZXJzID8/XG4gICAgY29uZmlnLm1heENsaWVudHMgPz9cbiAgICBjb25maWcubWF4UGxheWVyc1BlckdhbWUgPz9cbiAgICBsb2JieS5tYXhDbGllbnRzID8/XG4gICAgbnVsbFxuICApO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZ2V0TG9iYnlDdXJyZW50UGxheWVycyhsb2JieTogTG9iYnkpOiBudW1iZXIgfCBudWxsIHtcbiAgaWYgKHR5cGVvZiBsb2JieS5udW1DbGllbnRzID09PSAnbnVtYmVyJykge1xuICAgIHJldHVybiBsb2JieS5udW1DbGllbnRzO1xuICB9XG4gIHJldHVybiBudWxsO1xufVxuXG4vLyAnOCsnIGlzIGEgY3JpdGVyaWEtb25seSBzZW50aW5lbCBhbmQgaXMgbmV2ZXIgcGFzc2VkIGhlcmUgZnJvbSBsb2JieSBkYXRhIChPcGVuRnJvbnQgc2VuZHMgbnVtZXJpYyB0ZWFtIGNvdW50cylcbmV4cG9ydCBmdW5jdGlvbiBnZXRQbGF5ZXJzUGVyVGVhbShcbiAgcGxheWVyVGVhbXM6IFRlYW1Db3VudCB8IG51bGwgfCB1bmRlZmluZWQsXG4gIGdhbWVDYXBhY2l0eTogbnVtYmVyIHwgbnVsbFxuKTogbnVtYmVyIHwgbnVsbCB7XG4gIGlmICghcGxheWVyVGVhbXMgfHwgIWdhbWVDYXBhY2l0eSkgcmV0dXJuIG51bGw7XG5cbiAgaWYgKHBsYXllclRlYW1zID09PSAnRHVvcycpIHJldHVybiAyO1xuICBpZiAocGxheWVyVGVhbXMgPT09ICdUcmlvcycpIHJldHVybiAzO1xuICBpZiAocGxheWVyVGVhbXMgPT09ICdRdWFkcycpIHJldHVybiA0O1xuICBpZiAocGxheWVyVGVhbXMgPT09ICdIdW1hbnMgVnMgTmF0aW9ucycpIHJldHVybiBnYW1lQ2FwYWNpdHk7XG5cbiAgaWYgKHR5cGVvZiBwbGF5ZXJUZWFtcyA9PT0gJ251bWJlcicgJiYgcGxheWVyVGVhbXMgPiAwKSB7XG4gICAgcmV0dXJuIE1hdGguZmxvb3IoZ2FtZUNhcGFjaXR5IC8gcGxheWVyVGVhbXMpO1xuICB9XG5cbiAgcmV0dXJuIG51bGw7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXRMb2JieU1vZGlmaWVycyhsb2JieTogTG9iYnkpOiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPiB7XG4gIHJldHVybiBsb2JieS5nYW1lQ29uZmlnPy5wdWJsaWNHYW1lTW9kaWZpZXJzXG4gICAgPyB7IC4uLmxvYmJ5LmdhbWVDb25maWcucHVibGljR2FtZU1vZGlmaWVycyB9XG4gICAgOiB7fTtcbn1cblxuLyoqIFRydWUgZm9yIGEgSG9zdGVkIG9yIEN1c3RvbSBMb2JieSwgd2hvc2UgaG9zdCBjaG9zZSB0aGUgY29uZmlndXJhdGlvbi4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc0hvc3RDb25maWd1cmVkTG9iYnkobG9iYnk6IExvYmJ5KTogYm9vbGVhbiB7XG4gIHJldHVybiBnZXRMb2JieVF1ZXVlU291cmNlKGxvYmJ5KSA9PT0gJ2hvc3RlZCcgfHwgbG9iYnkuY3VzdG9tID09PSB0cnVlO1xufVxuXG5jb25zdCBOVUtFX1VOSVRfVFlQRVMgPSBbJ0F0b20gQm9tYicsICdIeWRyb2dlbiBCb21iJywgJ01JUlYnXSBhcyBjb25zdDtcblxuLy8gQSBIb3N0ZWQgb3IgQ3VzdG9tIExvYmJ5IGhhcyBvbmx5IHJhdyBnYW1lIHNldHRpbmdzLCBhbmQgQ3Jvd2RlZCwgSGFyZCBOYXRpb25zIGFuZCBQZWFjZSBUaW1lIGhhdmUgbm8gcmF3IGVxdWl2YWxlbnQuXG5mdW5jdGlvbiBnZXRIb3N0Q29uZmlndXJlZE1vZGlmaWVyVmFsdWUoXG4gIGxvYmJ5OiBMb2JieSxcbiAga2V5OiBrZXlvZiBNb2RpZmllckZpbHRlcnNcbik6IGJvb2xlYW4gfCBudW1iZXIgfCB1bmRlZmluZWQge1xuICBjb25zdCBjb25maWcgPSBsb2JieS5nYW1lQ29uZmlnO1xuICBjb25zdCBkaXNhYmxlZFVuaXRzID0gY29uZmlnPy5kaXNhYmxlZFVuaXRzID8/IFtdO1xuXG4gIHN3aXRjaCAoa2V5KSB7XG4gICAgY2FzZSAnaXNDb21wYWN0JzpcbiAgICAgIHJldHVybiBjb25maWc/LmdhbWVNYXBTaXplID09PSAnQ29tcGFjdCc7XG4gICAgY2FzZSAnaXNSYW5kb21TcGF3bic6XG4gICAgICByZXR1cm4gY29uZmlnPy5yYW5kb21TcGF3biA9PT0gdHJ1ZTtcbiAgICBjYXNlICdpc0FsbGlhbmNlc0Rpc2FibGVkJzpcbiAgICAgIHJldHVybiBjb25maWc/LmRpc2FibGVBbGxpYW5jZXMgPT09IHRydWU7XG4gICAgY2FzZSAnaXNOdWtlc0Rpc2FibGVkJzpcbiAgICAgIHJldHVybiBOVUtFX1VOSVRfVFlQRVMuZXZlcnkoKHVuaXQpID0+IGRpc2FibGVkVW5pdHMuaW5jbHVkZXModW5pdCkpO1xuICAgIGNhc2UgJ2lzU0FNc0Rpc2FibGVkJzpcbiAgICAgIHJldHVybiBkaXNhYmxlZFVuaXRzLmluY2x1ZGVzKCdTQU0gTGF1bmNoZXInKTtcbiAgICBjYXNlICdpc1dhdGVyTnVrZXMnOlxuICAgICAgcmV0dXJuIGNvbmZpZz8ud2F0ZXJOdWtlcyA9PT0gdHJ1ZTtcbiAgICBjYXNlICdpc0Rvb21zZGF5Q2xvY2snOlxuICAgICAgcmV0dXJuIGNvbmZpZz8uZG9vbXNkYXlDbG9jayAhPT0gdW5kZWZpbmVkICYmIGNvbmZpZy5kb29tc2RheUNsb2NrLmVuYWJsZWQgIT09IGZhbHNlO1xuICAgIGNhc2UgJ2lzVHJ1c3RlZCc6XG4gICAgICByZXR1cm4gY29uZmlnPy50cnVzdGVkO1xuICAgIGNhc2UgJ3N0YXJ0aW5nR29sZCc6XG4gICAgICByZXR1cm4gY29uZmlnPy5zdGFydGluZ0dvbGQgPz8gdW5kZWZpbmVkO1xuICAgIGNhc2UgJ2dvbGRNdWx0aXBsaWVyJzpcbiAgICAgIHJldHVybiBjb25maWc/LmdvbGRNdWx0aXBsaWVyID8/IHVuZGVmaW5lZDtcbiAgICBkZWZhdWx0OlxuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gZ2V0TG9iYnlNb2RpZmllclZhbHVlKFxuICBsb2JieTogTG9iYnksXG4gIGtleToga2V5b2YgTW9kaWZpZXJGaWx0ZXJzXG4pOiBib29sZWFuIHwgbnVtYmVyIHwgdW5kZWZpbmVkIHtcbiAgaWYgKGlzSG9zdENvbmZpZ3VyZWRMb2JieShsb2JieSkpIHtcbiAgICByZXR1cm4gZ2V0SG9zdENvbmZpZ3VyZWRNb2RpZmllclZhbHVlKGxvYmJ5LCBrZXkpO1xuICB9XG5cbiAgY29uc3QgbW9kaWZpZXJzID0gbG9iYnkuZ2FtZUNvbmZpZz8ucHVibGljR2FtZU1vZGlmaWVycztcblxuICBzd2l0Y2ggKGtleSkge1xuICAgIGNhc2UgJ2lzQ29tcGFjdCc6XG4gICAgICByZXR1cm4gbW9kaWZpZXJzPy5pc0NvbXBhY3Q7XG4gICAgY2FzZSAnaXNSYW5kb21TcGF3bic6XG4gICAgICByZXR1cm4gbW9kaWZpZXJzPy5pc1JhbmRvbVNwYXduO1xuICAgIGNhc2UgJ2lzQ3Jvd2RlZCc6XG4gICAgICByZXR1cm4gbW9kaWZpZXJzPy5pc0Nyb3dkZWQ7XG4gICAgY2FzZSAnaXNIYXJkTmF0aW9ucyc6XG4gICAgICByZXR1cm4gbW9kaWZpZXJzPy5pc0hhcmROYXRpb25zO1xuICAgIGNhc2UgJ2lzQWxsaWFuY2VzRGlzYWJsZWQnOlxuICAgICAgcmV0dXJuIG1vZGlmaWVycz8uaXNBbGxpYW5jZXNEaXNhYmxlZDtcbiAgICBjYXNlICdpc051a2VzRGlzYWJsZWQnOlxuICAgICAgcmV0dXJuIG1vZGlmaWVycz8uaXNOdWtlc0Rpc2FibGVkO1xuICAgIGNhc2UgJ2lzU0FNc0Rpc2FibGVkJzpcbiAgICAgIHJldHVybiBtb2RpZmllcnM/LmlzU0FNc0Rpc2FibGVkO1xuICAgIGNhc2UgJ2lzUGVhY2VUaW1lJzpcbiAgICAgIHJldHVybiBtb2RpZmllcnM/LmlzUGVhY2VUaW1lO1xuICAgIGNhc2UgJ2lzV2F0ZXJOdWtlcyc6XG4gICAgICByZXR1cm4gbW9kaWZpZXJzPy5pc1dhdGVyTnVrZXM7XG4gICAgY2FzZSAnaXNEb29tc2RheUNsb2NrJzpcbiAgICAgIHJldHVybiBtb2RpZmllcnM/LmlzRG9vbXNkYXlDbG9jaztcbiAgICBjYXNlICdpc1RydXN0ZWQnOlxuICAgICAgcmV0dXJuIGxvYmJ5LmdhbWVDb25maWc/LnRydXN0ZWQ7XG4gICAgY2FzZSAnc3RhcnRpbmdHb2xkJzpcbiAgICAgIHJldHVybiBtb2RpZmllcnM/LnN0YXJ0aW5nR29sZCA/PyBsb2JieS5nYW1lQ29uZmlnPy5zdGFydGluZ0dvbGQgPz8gdW5kZWZpbmVkO1xuICAgIGNhc2UgJ2dvbGRNdWx0aXBsaWVyJzpcbiAgICAgIHJldHVybiBtb2RpZmllcnM/LmdvbGRNdWx0aXBsaWVyID8/IGxvYmJ5LmdhbWVDb25maWc/LmdvbGRNdWx0aXBsaWVyID8/IHVuZGVmaW5lZDtcbiAgICBkZWZhdWx0OlxuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gZ2V0R2FtZURldGFpbHNUZXh0KGxvYmJ5OiBMb2JieSk6IHN0cmluZyB7XG4gIGNvbnN0IGdhbWVNb2RlID0gZ2V0TG9iYnlHYW1lTW9kZShsb2JieSk7XG4gIGNvbnN0IHRlYW1Db25maWcgPSBnZXRMb2JieVRlYW1Db25maWcobG9iYnkpO1xuICBjb25zdCBjYXBhY2l0eSA9IGdldExvYmJ5Q2FwYWNpdHkobG9iYnkpO1xuXG4gIGlmIChnYW1lTW9kZSA9PT0gJ0ZGQScpIHtcbiAgICByZXR1cm4gY2FwYWNpdHkgIT09IG51bGwgPyBgRkZBIFx1MjAyMiAke2NhcGFjaXR5fSBzbG90c2AgOiAnRkZBJztcbiAgfVxuXG4gIGlmIChnYW1lTW9kZSAhPT0gJ1RlYW0nKSB7XG4gICAgcmV0dXJuICdVbnN1cHBvcnRlZCBtb2RlJztcbiAgfVxuXG4gIGlmICh0ZWFtQ29uZmlnID09PSAnSHVtYW5zIFZzIE5hdGlvbnMnKSB7XG4gICAgcmV0dXJuIGNhcGFjaXR5ICE9PSBudWxsID8gYEh1bWFucyBWcyBOYXRpb25zICgke2NhcGFjaXR5fSlgIDogJ0h1bWFucyBWcyBOYXRpb25zJztcbiAgfVxuXG4gIGlmICh0ZWFtQ29uZmlnID09PSAnRHVvcycpIHJldHVybiAnRHVvcyc7XG4gIGlmICh0ZWFtQ29uZmlnID09PSAnVHJpb3MnKSByZXR1cm4gJ1RyaW9zJztcbiAgaWYgKHRlYW1Db25maWcgPT09ICdRdWFkcycpIHJldHVybiAnUXVhZHMnO1xuXG4gIGlmICh0eXBlb2YgdGVhbUNvbmZpZyA9PT0gJ251bWJlcicgJiYgY2FwYWNpdHkgIT09IG51bGwpIHtcbiAgICBjb25zdCBwbGF5ZXJzUGVyVGVhbSA9IGdldFBsYXllcnNQZXJUZWFtKHRlYW1Db25maWcsIGNhcGFjaXR5KTtcbiAgICByZXR1cm4gcGxheWVyc1BlclRlYW0gIT09IG51bGxcbiAgICAgID8gYCR7dGVhbUNvbmZpZ30gdGVhbXMgKCR7cGxheWVyc1BlclRlYW19IHBlciB0ZWFtKWBcbiAgICAgIDogYCR7dGVhbUNvbmZpZ30gdGVhbXNgO1xuICB9XG5cbiAgcmV0dXJuICdUZWFtJztcbn1cblxuZXhwb3J0IGludGVyZmFjZSBCcm93c2VyTm90aWZpY2F0aW9uQ29udGVudCB7XG4gIHRpdGxlOiBzdHJpbmc7XG4gIGJvZHk6IHN0cmluZztcbn1cblxuZnVuY3Rpb24gZ2V0TG9iYnlNb2RlTGFiZWwobG9iYnk6IExvYmJ5KTogc3RyaW5nIHtcbiAgY29uc3QgZ2FtZU1vZGUgPSBnZXRMb2JieUdhbWVNb2RlKGxvYmJ5KTtcbiAgY29uc3QgdGVhbUNvbmZpZyA9IGdldExvYmJ5VGVhbUNvbmZpZyhsb2JieSk7XG5cbiAgaWYgKGdhbWVNb2RlID09PSAnRkZBJykge1xuICAgIHJldHVybiAnRkZBJztcbiAgfVxuXG4gIGlmIChnYW1lTW9kZSAhPT0gJ1RlYW0nKSB7XG4gICAgcmV0dXJuICdVbnN1cHBvcnRlZCBtb2RlJztcbiAgfVxuXG4gIGlmICh0ZWFtQ29uZmlnID09PSAnSHVtYW5zIFZzIE5hdGlvbnMnKSB7XG4gICAgcmV0dXJuICdIdW1hbnMgVnMgTmF0aW9ucyc7XG4gIH1cblxuICBpZiAodGVhbUNvbmZpZyA9PT0gJ0R1b3MnIHx8IHRlYW1Db25maWcgPT09ICdUcmlvcycgfHwgdGVhbUNvbmZpZyA9PT0gJ1F1YWRzJykge1xuICAgIHJldHVybiB0ZWFtQ29uZmlnO1xuICB9XG5cbiAgaWYgKHR5cGVvZiB0ZWFtQ29uZmlnID09PSAnbnVtYmVyJykge1xuICAgIHJldHVybiBgJHt0ZWFtQ29uZmlnfSB0ZWFtc2A7XG4gIH1cblxuICByZXR1cm4gJ1RlYW0nO1xufVxuXG5mdW5jdGlvbiBmb3JtYXRTdGFydGluZ0dvbGQodmFsdWU6IG51bWJlcik6IHN0cmluZyB7XG4gIGlmICh2YWx1ZSA+PSAxXzAwMF8wMDAgJiYgdmFsdWUgJSAxXzAwMF8wMDAgPT09IDApIHtcbiAgICByZXR1cm4gYCR7dmFsdWUgLyAxXzAwMF8wMDB9TWA7XG4gIH1cblxuICBpZiAodmFsdWUgPj0gMV8wMDAgJiYgdmFsdWUgJSAxXzAwMCA9PT0gMCkge1xuICAgIHJldHVybiBgJHt2YWx1ZSAvIDFfMDAwfUtgO1xuICB9XG5cbiAgcmV0dXJuIFN0cmluZyh2YWx1ZSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXRBY3RpdmVNb2RpZmllckxhYmVscyhsb2JieTogTG9iYnkpOiBzdHJpbmdbXSB7XG4gIGNvbnN0IGhhcyA9IChrZXk6IGtleW9mIE1vZGlmaWVyRmlsdGVycyk6IGJvb2xlYW4gPT4gQm9vbGVhbihnZXRMb2JieU1vZGlmaWVyVmFsdWUobG9iYnksIGtleSkpO1xuICBjb25zdCBsYWJlbHM6IHN0cmluZ1tdID0gW107XG5cbiAgaWYgKGhhcygnaXNDb21wYWN0JykpIGxhYmVscy5wdXNoKCdDb21wYWN0Jyk7XG4gIGlmIChoYXMoJ2lzUmFuZG9tU3Bhd24nKSkgbGFiZWxzLnB1c2goJ1JhbmRvbScpO1xuICBpZiAoaGFzKCdpc0Nyb3dkZWQnKSkgbGFiZWxzLnB1c2goJ0Nyb3dkZWQnKTtcbiAgaWYgKGhhcygnaXNIYXJkTmF0aW9ucycpKSBsYWJlbHMucHVzaCgnSGFyZCcpO1xuXG4gIGNvbnN0IHN0YXJ0aW5nR29sZCA9IGdldExvYmJ5TW9kaWZpZXJWYWx1ZShsb2JieSwgJ3N0YXJ0aW5nR29sZCcpO1xuICBpZiAodHlwZW9mIHN0YXJ0aW5nR29sZCA9PT0gJ251bWJlcicpIHtcbiAgICBsYWJlbHMucHVzaChmb3JtYXRTdGFydGluZ0dvbGQoc3RhcnRpbmdHb2xkKSk7XG4gIH1cblxuICBjb25zdCBnb2xkTXVsdGlwbGllciA9IGdldExvYmJ5TW9kaWZpZXJWYWx1ZShsb2JieSwgJ2dvbGRNdWx0aXBsaWVyJyk7XG4gIGlmICh0eXBlb2YgZ29sZE11bHRpcGxpZXIgPT09ICdudW1iZXInKSB7XG4gICAgbGFiZWxzLnB1c2goYHgke2dvbGRNdWx0aXBsaWVyfWApO1xuICB9XG5cbiAgaWYgKGhhcygnaXNBbGxpYW5jZXNEaXNhYmxlZCcpKSBsYWJlbHMucHVzaCgnTm8gQWxsaWFuY2VzJyk7XG4gIGlmIChoYXMoJ2lzTnVrZXNEaXNhYmxlZCcpKSBsYWJlbHMucHVzaCgnTm8gTnVrZXMnKTtcbiAgaWYgKGhhcygnaXNTQU1zRGlzYWJsZWQnKSkgbGFiZWxzLnB1c2goJ05vIFNBTXMnKTtcbiAgaWYgKGhhcygnaXNQZWFjZVRpbWUnKSkgbGFiZWxzLnB1c2goJ1BlYWNlJyk7XG4gIGlmIChoYXMoJ2lzV2F0ZXJOdWtlcycpKSBsYWJlbHMucHVzaCgnV2F0ZXIgTnVrZXMnKTtcbiAgaWYgKGhhcygnaXNEb29tc2RheUNsb2NrJykpIGxhYmVscy5wdXNoKCdEb29tc2RheScpO1xuICBpZiAoaGFzKCdpc1RydXN0ZWQnKSkgbGFiZWxzLnB1c2goJ1RydXN0ZWQnKTtcblxuICByZXR1cm4gbGFiZWxzO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZ2V0QnJvd3Nlck5vdGlmaWNhdGlvbkNvbnRlbnQobG9iYnk6IExvYmJ5KTogQnJvd3Nlck5vdGlmaWNhdGlvbkNvbnRlbnQge1xuICBjb25zdCB0aXRsZVBhcnRzOiBzdHJpbmdbXSA9IFtdO1xuICBjb25zdCBtYXBOYW1lID0gbG9iYnkuZ2FtZUNvbmZpZz8uZ2FtZU1hcD8udHJpbSgpO1xuICBjb25zdCBjYXBhY2l0eSA9IGdldExvYmJ5Q2FwYWNpdHkobG9iYnkpO1xuICBjb25zdCB0ZWFtQ29uZmlnID0gZ2V0TG9iYnlUZWFtQ29uZmlnKGxvYmJ5KTtcbiAgY29uc3QgbW9kZUxhYmVsID0gZ2V0TG9iYnlNb2RlTGFiZWwobG9iYnkpO1xuXG4gIGlmIChtYXBOYW1lKSB7XG4gICAgdGl0bGVQYXJ0cy5wdXNoKGdldE1hcERpc3BsYXlOYW1lKG1hcE5hbWUpKTtcbiAgfVxuXG4gIGlmIChnZXRMb2JieUdhbWVNb2RlKGxvYmJ5KSA9PT0gJ1RlYW0nICYmIHRlYW1Db25maWcgIT09ICdIdW1hbnMgVnMgTmF0aW9ucycpIHtcbiAgICB0aXRsZVBhcnRzLnB1c2gobW9kZUxhYmVsKTtcbiAgICBjb25zdCBwbGF5ZXJzUGVyVGVhbSA9IGdldFBsYXllcnNQZXJUZWFtKHRlYW1Db25maWcsIGNhcGFjaXR5KTtcbiAgICBpZiAocGxheWVyc1BlclRlYW0gIT09IG51bGwpIHtcbiAgICAgIHRpdGxlUGFydHMucHVzaChgJHtwbGF5ZXJzUGVyVGVhbX0vdGVhbWApO1xuICAgIH1cbiAgfSBlbHNlIHtcbiAgICB0aXRsZVBhcnRzLnB1c2gobW9kZUxhYmVsKTtcbiAgfVxuXG4gIGNvbnN0IHF1ZXVlID0gZ2V0TG9iYnlRdWV1ZVNvdXJjZShsb2JieSk7XG4gIGlmIChxdWV1ZSA9PT0gJ2hvc3RlZCcpIHtcbiAgICB0aXRsZVBhcnRzLnB1c2goJ0hvc3RlZCcpO1xuICB9IGVsc2UgaWYgKGxvYmJ5LmN1c3RvbSA9PT0gdHJ1ZSkge1xuICAgIHRpdGxlUGFydHMucHVzaCgnQ3VzdG9tJyk7XG4gIH0gZWxzZSBpZiAocXVldWUgPT09ICdzcGVjaWFsJykge1xuICAgIHRpdGxlUGFydHMucHVzaCgnU3BlY2lhbCcpO1xuICB9XG5cbiAgY29uc3QgYm9keVBhcnRzOiBzdHJpbmdbXSA9IFtdO1xuICBpZiAoY2FwYWNpdHkgIT09IG51bGwpIHtcbiAgICBib2R5UGFydHMucHVzaChgJHtjYXBhY2l0eX0gc2xvdHNgKTtcbiAgfVxuXG4gIGNvbnN0IGFjdGl2ZU1vZGlmaWVycyA9IGdldEFjdGl2ZU1vZGlmaWVyTGFiZWxzKGxvYmJ5KTtcbiAgaWYgKGFjdGl2ZU1vZGlmaWVycy5sZW5ndGggPiAwKSB7XG4gICAgYm9keVBhcnRzLnB1c2goYWN0aXZlTW9kaWZpZXJzLmpvaW4oJywgJykpO1xuICB9XG5cbiAgcmV0dXJuIHtcbiAgICB0aXRsZTogdGl0bGVQYXJ0cy5qb2luKCcgXHUyMDIyICcpLFxuICAgIGJvZHk6IGJvZHlQYXJ0cy5qb2luKCcgXHUyMDIyICcpLFxuICB9O1xufVxuXG5mdW5jdGlvbiBzYW5pdGl6ZU51bWJlcih2YWx1ZTogdW5rbm93bik6IG51bWJlciB8IG51bGwge1xuICByZXR1cm4gdHlwZW9mIHZhbHVlID09PSAnbnVtYmVyJyAmJiBOdW1iZXIuaXNGaW5pdGUodmFsdWUpID8gdmFsdWUgOiBudWxsO1xufVxuXG5mdW5jdGlvbiBzYW5pdGl6ZU1vZGlmaWVyRmlsdGVyU3RhdGUodmFsdWU6IHVua25vd24pOiBNb2RpZmllckZpbHRlclN0YXRlIHtcbiAgaWYgKHZhbHVlID09PSAnYmxvY2tlZCcgfHwgdmFsdWUgPT09ICdyZWplY3RlZCcpIHtcbiAgICByZXR1cm4gJ2Jsb2NrZWQnO1xuICB9XG5cbiAgaWYgKHZhbHVlID09PSAncmVxdWlyZWQnKSB7XG4gICAgcmV0dXJuICdyZXF1aXJlZCc7XG4gIH1cblxuICBpZiAodmFsdWUgPT09ICdhbnknIHx8IHZhbHVlID09PSAnYWxsb3dlZCcgfHwgdmFsdWUgPT09ICdpbmRpZmZlcmVudCcpIHtcbiAgICByZXR1cm4gJ2FueSc7XG4gIH1cblxuICByZXR1cm4gREVGQVVMVF9NT0RJRklFUl9GSUxURVJfU1RBVEU7XG59XG5cbmZ1bmN0aW9uIHNhbml0aXplTnVtZXJpY01vZGlmaWVyU3RhdGUodmFsdWU6IHVua25vd24pOiBOdW1lcmljTW9kaWZpZXJTdGF0ZSB8IHVuZGVmaW5lZCB7XG4gIGlmICghdmFsdWUgfHwgdHlwZW9mIHZhbHVlICE9PSAnb2JqZWN0Jykge1xuICAgIHJldHVybiB1bmRlZmluZWQ7XG4gIH1cblxuICBjb25zdCBzYW5pdGl6ZWQ6IE51bWVyaWNNb2RpZmllclN0YXRlID0ge307XG4gIGZvciAoY29uc3QgW2tleSwgdHJpU3RhdGVdIG9mIE9iamVjdC5lbnRyaWVzKHZhbHVlIGFzIFJlY29yZDxzdHJpbmcsIHVua25vd24+KSkge1xuICAgIGNvbnN0IG51bWVyaWNLZXkgPSBOdW1iZXIoa2V5KTtcbiAgICBpZiAoTnVtYmVyLmlzRmluaXRlKG51bWVyaWNLZXkpKSB7XG4gICAgICBzYW5pdGl6ZWRbbnVtZXJpY0tleV0gPSBzYW5pdGl6ZU1vZGlmaWVyRmlsdGVyU3RhdGUodHJpU3RhdGUpO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiBPYmplY3Qua2V5cyhzYW5pdGl6ZWQpLmxlbmd0aCA+IDAgPyBzYW5pdGl6ZWQgOiB1bmRlZmluZWQ7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBzYW5pdGl6ZU1vZGlmaWVyRmlsdGVycyh2YWx1ZTogdW5rbm93bik6IE1vZGlmaWVyRmlsdGVycyB8IHVuZGVmaW5lZCB7XG4gIGlmICghdmFsdWUgfHwgdHlwZW9mIHZhbHVlICE9PSAnb2JqZWN0Jykge1xuICAgIHJldHVybiB1bmRlZmluZWQ7XG4gIH1cblxuICBjb25zdCBjYW5kaWRhdGUgPSB2YWx1ZSBhcyBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPjtcbiAgY29uc3Qgc2FuaXRpemVkOiBNb2RpZmllckZpbHRlcnMgPSB7XG4gICAgaXNDb21wYWN0OiBzYW5pdGl6ZU1vZGlmaWVyRmlsdGVyU3RhdGUoY2FuZGlkYXRlLmlzQ29tcGFjdCksXG4gICAgaXNSYW5kb21TcGF3bjogc2FuaXRpemVNb2RpZmllckZpbHRlclN0YXRlKGNhbmRpZGF0ZS5pc1JhbmRvbVNwYXduKSxcbiAgICBpc0Nyb3dkZWQ6IHNhbml0aXplTW9kaWZpZXJGaWx0ZXJTdGF0ZShjYW5kaWRhdGUuaXNDcm93ZGVkKSxcbiAgICBpc0hhcmROYXRpb25zOiBzYW5pdGl6ZU1vZGlmaWVyRmlsdGVyU3RhdGUoY2FuZGlkYXRlLmlzSGFyZE5hdGlvbnMpLFxuICAgIGlzQWxsaWFuY2VzRGlzYWJsZWQ6IHNhbml0aXplTW9kaWZpZXJGaWx0ZXJTdGF0ZShjYW5kaWRhdGUuaXNBbGxpYW5jZXNEaXNhYmxlZCksXG4gICAgaXNOdWtlc0Rpc2FibGVkOiBzYW5pdGl6ZU1vZGlmaWVyRmlsdGVyU3RhdGUoY2FuZGlkYXRlLmlzTnVrZXNEaXNhYmxlZCksXG4gICAgaXNTQU1zRGlzYWJsZWQ6IHNhbml0aXplTW9kaWZpZXJGaWx0ZXJTdGF0ZShjYW5kaWRhdGUuaXNTQU1zRGlzYWJsZWQpLFxuICAgIGlzUGVhY2VUaW1lOiBzYW5pdGl6ZU1vZGlmaWVyRmlsdGVyU3RhdGUoY2FuZGlkYXRlLmlzUGVhY2VUaW1lKSxcbiAgICBpc1dhdGVyTnVrZXM6IHNhbml0aXplTW9kaWZpZXJGaWx0ZXJTdGF0ZShjYW5kaWRhdGUuaXNXYXRlck51a2VzKSxcbiAgICBpc0Rvb21zZGF5Q2xvY2s6IHNhbml0aXplTW9kaWZpZXJGaWx0ZXJTdGF0ZShjYW5kaWRhdGUuaXNEb29tc2RheUNsb2NrKSxcbiAgICBpc1RydXN0ZWQ6IHNhbml0aXplTW9kaWZpZXJGaWx0ZXJTdGF0ZShjYW5kaWRhdGUuaXNUcnVzdGVkKSxcbiAgICBzdGFydGluZ0dvbGQ6IHNhbml0aXplTnVtZXJpY01vZGlmaWVyU3RhdGUoY2FuZGlkYXRlLnN0YXJ0aW5nR29sZCksXG4gICAgZ29sZE11bHRpcGxpZXI6IHNhbml0aXplTnVtZXJpY01vZGlmaWVyU3RhdGUoY2FuZGlkYXRlLmdvbGRNdWx0aXBsaWVyKSxcbiAgfTtcblxuICByZXR1cm4gc2FuaXRpemVkO1xufVxuXG4vLyBTYXZlZC1zZXR0aW5ncyBtaWdyYXRpb24gb25seS4gcGFyc2VUZWFtQ291bnQgbXVzdCBzdGF5IHBlcm1pc3NpdmVcbi8vIGZvciBsb2JieS1kYXRhIHBhcnNpbmcgXHUyMDE0ICdEdW9zJyAvICdUcmlvcycgLyAnUXVhZHMnIHN0aWxsIGFycml2ZSBmcm9tIE9wZW5Gcm9udC5cbmZ1bmN0aW9uIHNhbml0aXplQ3JpdGVyaWFUZWFtQ291bnQoXG4gIHZhbHVlOiBzdHJpbmcgfCBudW1iZXIgfCBudWxsIHwgdW5kZWZpbmVkXG4pOiBUZWFtQ291bnQgfCBudWxsIHtcbiAgY29uc3QgcGFyc2VkID0gcGFyc2VUZWFtQ291bnQodmFsdWUpO1xuICBpZiAocGFyc2VkID09PSAnRHVvcycgfHwgcGFyc2VkID09PSAnVHJpb3MnIHx8IHBhcnNlZCA9PT0gJ1F1YWRzJykge1xuICAgIHJldHVybiBudWxsO1xuICB9XG4gIHJldHVybiBwYXJzZWQ7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBzYW5pdGl6ZUNyaXRlcmlhKGNyaXRlcmlhOiB1bmtub3duKTogRGlzY292ZXJ5Q3JpdGVyaWFbXSB7XG4gIGlmICghQXJyYXkuaXNBcnJheShjcml0ZXJpYSkpIHtcbiAgICByZXR1cm4gW107XG4gIH1cblxuICBjb25zdCBzYW5pdGl6ZWQ6IERpc2NvdmVyeUNyaXRlcmlhW10gPSBbXTtcblxuICBmb3IgKGNvbnN0IGVudHJ5IG9mIGNyaXRlcmlhKSB7XG4gICAgY29uc3QgY2FuZGlkYXRlID0gZW50cnkgYXMge1xuICAgICAgZ2FtZU1vZGU/OiBzdHJpbmcgfCBudWxsO1xuICAgICAgdGVhbUNvdW50Pzogc3RyaW5nIHwgbnVtYmVyIHwgbnVsbDtcbiAgICAgIG1pblBsYXllcnM/OiBudW1iZXIgfCBudWxsO1xuICAgICAgbWF4UGxheWVycz86IG51bWJlciB8IG51bGw7XG4gICAgICBtb2RpZmllcnM/OiBNb2RpZmllckZpbHRlcnMgfCBudWxsO1xuICAgIH07XG5cbiAgICBjb25zdCBnYW1lTW9kZSA9IG5vcm1hbGl6ZUdhbWVNb2RlKGNhbmRpZGF0ZS5nYW1lTW9kZSA/PyBudWxsKTtcbiAgICBpZiAoIWdhbWVNb2RlKSB7XG4gICAgICBjb250aW51ZTtcbiAgICB9XG5cbiAgICBsZXQgbWluUGxheWVycyA9IHNhbml0aXplTnVtYmVyKGNhbmRpZGF0ZS5taW5QbGF5ZXJzKTtcbiAgICBsZXQgbWF4UGxheWVycyA9IHNhbml0aXplTnVtYmVyKGNhbmRpZGF0ZS5tYXhQbGF5ZXJzKTtcblxuICAgIGlmIChnYW1lTW9kZSA9PT0gJ1RlYW0nKSB7XG4gICAgICBpZiAodHlwZW9mIG1pblBsYXllcnMgPT09ICdudW1iZXInICYmIG1pblBsYXllcnMgPCBURUFNX01JTl9QTEFZRVJTX1BFUl9URUFNKSB7XG4gICAgICAgIG1pblBsYXllcnMgPSBURUFNX01JTl9QTEFZRVJTX1BFUl9URUFNO1xuICAgICAgfVxuICAgICAgaWYgKFxuICAgICAgICB0eXBlb2YgbWluUGxheWVycyA9PT0gJ251bWJlcicgJiZcbiAgICAgICAgdHlwZW9mIG1heFBsYXllcnMgPT09ICdudW1iZXInICYmXG4gICAgICAgIG1heFBsYXllcnMgPCBtaW5QbGF5ZXJzXG4gICAgICApIHtcbiAgICAgICAgbWF4UGxheWVycyA9IG1pblBsYXllcnM7XG4gICAgICB9XG4gICAgfVxuXG4gICAgc2FuaXRpemVkLnB1c2goe1xuICAgICAgZ2FtZU1vZGUsXG4gICAgICB0ZWFtQ291bnQ6IGdhbWVNb2RlID09PSAnVGVhbScgPyBzYW5pdGl6ZUNyaXRlcmlhVGVhbUNvdW50KGNhbmRpZGF0ZS50ZWFtQ291bnQgPz8gbnVsbCkgOiBudWxsLFxuICAgICAgbWluUGxheWVycyxcbiAgICAgIG1heFBsYXllcnMsXG4gICAgICBtb2RpZmllcnM6IHNhbml0aXplTW9kaWZpZXJGaWx0ZXJzKGNhbmRpZGF0ZS5tb2RpZmllcnMpLFxuICAgIH0pO1xuICB9XG5cbiAgcmV0dXJuIHNhbml0aXplZDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGZvcm1hdEVsYXBzZWRTaW5jZSh0aW1lc3RhbXBNczogbnVtYmVyLCBub3c6IG51bWJlciA9IERhdGUubm93KCkpOiBzdHJpbmcge1xuICBjb25zdCBlbGFwc2VkID0gTWF0aC5tYXgoMCwgTWF0aC5mbG9vcigobm93IC0gdGltZXN0YW1wTXMpIC8gMTAwMCkpO1xuICByZXR1cm4gYCR7TWF0aC5mbG9vcihlbGFwc2VkIC8gNjApfW0gJHtlbGFwc2VkICUgNjB9c2A7XG59XG5cbi8qKlxuICogTW9kZS9mb3JtYXQgbGluZSBmb3IgYSBsb2JieSBjYXJkLCBtaXJyb3JpbmcgT3BlbkZyb250J3Mgb3duIGNhcmQgdGl0bGVcbiAqIChnZXRMb2JieVRpdGxlIGluIEdhbWVNb2RlU2VsZWN0b3IpOiBGRkEgXHUyMTkyIFwiRnJlZSBGb3IgQWxsXCI7IHRlYW0gbG9iYmllcyBcdTIxOTJcbiAqIFwiPG4+IHRlYW1zIG9mIDxwbGF5ZXJzUGVyVGVhbT5cIiBcdTIwMTQgaW5jbHVkaW5nIER1b3MvVHJpb3MvUXVhZHMsIHdoaWNoIE9wZW5Gcm9udFxuICogcmVuZGVycyBhcyBcInRlYW1zIG9mIDIvMy80XCIgcmF0aGVyIHRoYW4gdGhlIG5hbWVkIGZvcm1hdC4gQ2FwYWNpdHkgaXMgc2hvd25cbiAqIHNlcGFyYXRlbHkgb24gdXBjb21pbmcgY2FyZHMuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRMb2JieU1vZGVUZXh0KGxvYmJ5OiBMb2JieSk6IHN0cmluZyB7XG4gIGNvbnN0IGdhbWVNb2RlID0gZ2V0TG9iYnlHYW1lTW9kZShsb2JieSk7XG5cbiAgaWYgKGdhbWVNb2RlID09PSAnRkZBJykgcmV0dXJuICdGcmVlIEZvciBBbGwnO1xuICBpZiAoZ2FtZU1vZGUgIT09ICdUZWFtJykgcmV0dXJuICdVbnN1cHBvcnRlZCBtb2RlJztcblxuICBjb25zdCB0ZWFtQ29uZmlnID0gZ2V0TG9iYnlUZWFtQ29uZmlnKGxvYmJ5KTtcbiAgY29uc3QgY2FwYWNpdHkgPSBnZXRMb2JieUNhcGFjaXR5KGxvYmJ5KTtcblxuICBpZiAodGVhbUNvbmZpZyA9PT0gJ0h1bWFucyBWcyBOYXRpb25zJykge1xuICAgIHJldHVybiBjYXBhY2l0eSAhPT0gbnVsbCA/IGAke2NhcGFjaXR5fSBIdW1hbnMgdnMgJHtjYXBhY2l0eX0gTmF0aW9uc2AgOiAnSHVtYW5zIHZzIE5hdGlvbnMnO1xuICB9XG5cbiAgLy8gUmVzb2x2ZSBwbGF5ZXJzLXBlci10ZWFtIGFuZCB0ZWFtIGNvdW50IGZvciBldmVyeSB0ZWFtIGZvcm1hdC5cbiAgbGV0IHBsYXllcnNQZXJUZWFtOiBudW1iZXIgfCBudWxsID0gbnVsbDtcbiAgaWYgKHRlYW1Db25maWcgPT09ICdEdW9zJykgcGxheWVyc1BlclRlYW0gPSAyO1xuICBlbHNlIGlmICh0ZWFtQ29uZmlnID09PSAnVHJpb3MnKSBwbGF5ZXJzUGVyVGVhbSA9IDM7XG4gIGVsc2UgaWYgKHRlYW1Db25maWcgPT09ICdRdWFkcycpIHBsYXllcnNQZXJUZWFtID0gNDtcblxuICBsZXQgdGVhbUNvdW50OiBudW1iZXIgfCBudWxsID0gbnVsbDtcbiAgaWYgKHBsYXllcnNQZXJUZWFtICE9PSBudWxsKSB7XG4gICAgdGVhbUNvdW50ID0gY2FwYWNpdHkgIT09IG51bGwgPyBNYXRoLmZsb29yKGNhcGFjaXR5IC8gcGxheWVyc1BlclRlYW0pIDogbnVsbDtcbiAgfSBlbHNlIGlmICh0eXBlb2YgdGVhbUNvbmZpZyA9PT0gJ251bWJlcicpIHtcbiAgICB0ZWFtQ291bnQgPSB0ZWFtQ29uZmlnO1xuICAgIHBsYXllcnNQZXJUZWFtID0gY2FwYWNpdHkgIT09IG51bGwgJiYgdGVhbUNvbmZpZyA+IDAgPyBNYXRoLmZsb29yKGNhcGFjaXR5IC8gdGVhbUNvbmZpZykgOiBudWxsO1xuICB9XG5cbiAgaWYgKHRlYW1Db3VudCA9PT0gbnVsbCkgcmV0dXJuICdUZWFtcyc7XG4gIHJldHVybiBwbGF5ZXJzUGVyVGVhbSAhPT0gbnVsbCA/IGAke3RlYW1Db3VudH0gdGVhbXMgb2YgJHtwbGF5ZXJzUGVyVGVhbX1gIDogYCR7dGVhbUNvdW50fSB0ZWFtc2A7XG59XG5cbi8qKlxuICogUmVzb2x2ZSBhIGxvYmJ5J3MgbWFwIHRodW1ibmFpbCBVUkwgdGhlIHNhbWUgd2F5IE9wZW5Gcm9udCBkb2VzXG4gKiAoYG1hcHMvPG5vcm1hbGlzZWRNYXA+L3RodW1ibmFpbC53ZWJwYCB2aWEgaXRzIGFzc2V0IG1hbmlmZXN0ICsgQ0ROIGJhc2UpLlxuICogTWlycm9ycyBPcGVuRnJvbnQncyBidWlsZEFzc2V0VXJsIHNvIGNhcmRzIHJldXNlIHRoZSBleGFjdCBDRE4gYXJ0LiBGYWxscyBiYWNrXG4gKiB0byBhIHJlbGF0aXZlIHBhdGggd2hlbiB0aGUgbWFuaWZlc3QvQ0ROIGJhc2UgYXJlIHVuYXZhaWxhYmxlIChlLmcuIGluIHRlc3RzKTtcbiAqIGEgYnJva2VuIGltYWdlIHRoZW4gZGVncmFkZXMgdG8gdGhlIGRpbW1lZCBjYXJkIGJhY2tncm91bmQuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRMb2JieU1hcFRodW1ibmFpbFVybChcbiAgbG9iYnk6IExvYmJ5LFxuICBhc3NldE1hbmlmZXN0PzogUmVjb3JkPHN0cmluZywgc3RyaW5nPiB8IG51bGwsXG4gIGNkbkJhc2U/OiBzdHJpbmcgfCBudWxsXG4pOiBzdHJpbmcgfCBudWxsIHtcbiAgY29uc3QgbWFwTmFtZSA9IGxvYmJ5LmdhbWVDb25maWc/LmdhbWVNYXA/LnRyaW0oKTtcbiAgaWYgKCFtYXBOYW1lKSByZXR1cm4gbnVsbDtcblxuICAvLyBNaXJyb3IgT3BlbkZyb250J3Mgbm9ybWFsaXphdGlvbiAoc3JjL2NvcmUvQXNzZXRVcmxzLnRzICsgR2FtZVByZXZpZXdCdWlsZGVyKTpcbiAgLy8gc3RyaXAgd2hpdGVzcGFjZSwgZG90cywgQU5EIHBhcmVudGhlc2VzIHNvIHBhcmVudGhlc2l6ZWQgbWFwIG5hbWVzIHJlc29sdmUgdG9cbiAgLy8gdGhlIHNhbWUgbWFuaWZlc3Qga2V5IE9wZW5Gcm9udCB1c2VzLlxuICBjb25zdCBub3JtYWxpemVkTWFwID0gbWFwTmFtZS50b0xvd2VyQ2FzZSgpLnJlcGxhY2UoL1tcXHMuKCldKy9nLCAnJyk7XG4gIGlmICghbm9ybWFsaXplZE1hcCkgcmV0dXJuIG51bGw7XG5cbiAgY29uc3QgcGF0aCA9IGBtYXBzLyR7ZW5jb2RlVVJJQ29tcG9uZW50KG5vcm1hbGl6ZWRNYXApfS90aHVtYm5haWwud2VicGA7XG4gIGNvbnN0IGRpcmVjdFVybCA9IGFzc2V0TWFuaWZlc3Q/LltgbWFwcy8ke25vcm1hbGl6ZWRNYXB9L3RodW1ibmFpbC53ZWJwYF07XG4gIGlmIChkaXJlY3RVcmwpIHtcbiAgICBjb25zdCBiYXNlID0gKGNkbkJhc2UgPz8gJycpLnJlcGxhY2UoL1xcLyskLywgJycpO1xuICAgIHJldHVybiBiYXNlID8gYCR7YmFzZX0ke2RpcmVjdFVybH1gIDogZGlyZWN0VXJsO1xuICB9XG5cbiAgcmV0dXJuIGAvJHtwYXRofWA7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgVXBjb21pbmdDYXJkTW9kZWwge1xuICBnYW1lSUQ6IHN0cmluZztcbiAgbWFwTmFtZTogc3RyaW5nO1xuICBtb2RlVGV4dDogc3RyaW5nO1xuICBjYXBhY2l0eUxhYmVsOiBzdHJpbmc7XG4gIG1vZGlmaWVyTGFiZWxzOiBzdHJpbmdbXTtcbiAgdGh1bWJuYWlsVXJsOiBzdHJpbmcgfCBudWxsO1xufVxuXG4vKipcbiAqIERpc3BsYXkgbW9kZWwgZm9yIGFuIHVwY29taW5nIChcIlVwIE5leHRcIikgY2FyZC4gUHVyZSBcdTIwMTQgRE9NIGJ1aWxkaW5nIGxpdmVzIGluXG4gKiBMb2JieURpc2NvdmVyeVVJLiBDYXBhY2l0eSBpcyByZW5kZXJlZCBhcyB0b3RhbCBzbG90cyAoXCJOIHNsb3RzXCIpIGJlY2F1c2UgYW5cbiAqIHVwY29taW5nIGdhbWUgaGFzIG5vIGN1cnJlbnQgcGxheWVyIGNvdW50IHVudGlsIGl0IGlzIHByb21vdGVkIHRvIGxpdmUuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBidWlsZFVwY29taW5nQ2FyZE1vZGVsKFxuICBsb2JieTogTG9iYnksXG4gIGFzc2V0TWFuaWZlc3Q/OiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+IHwgbnVsbCxcbiAgY2RuQmFzZT86IHN0cmluZyB8IG51bGxcbik6IFVwY29taW5nQ2FyZE1vZGVsIHtcbiAgY29uc3QgY2FwYWNpdHkgPSBnZXRMb2JieUNhcGFjaXR5KGxvYmJ5KTtcbiAgcmV0dXJuIHtcbiAgICBnYW1lSUQ6IGxvYmJ5LmdhbWVJRCxcbiAgICBtYXBOYW1lOiBnZXRNYXBEaXNwbGF5TmFtZShsb2JieS5nYW1lQ29uZmlnPy5nYW1lTWFwPy50cmltKCkgfHwgJ1Vua25vd24gbWFwJyksXG4gICAgbW9kZVRleHQ6IGdldExvYmJ5TW9kZVRleHQobG9iYnkpLFxuICAgIGNhcGFjaXR5TGFiZWw6IGNhcGFjaXR5ICE9PSBudWxsID8gYCR7Y2FwYWNpdHl9IHNsb3RzYCA6ICcnLFxuICAgIG1vZGlmaWVyTGFiZWxzOiBnZXRBY3RpdmVNb2RpZmllckxhYmVscyhsb2JieSksXG4gICAgdGh1bWJuYWlsVXJsOiBnZXRMb2JieU1hcFRodW1ibmFpbFVybChsb2JieSwgYXNzZXRNYW5pZmVzdCwgY2RuQmFzZSksXG4gIH07XG59XG5cbi8vIFN0b3JlcyBvbmx5IHJlcXVpcmVkIGFuZCBibG9ja2VkIG1hcHMsIHNvIGFuIHVuc2V0IG1hcCBhbmQgJ2FueScgcmVhZCB0aGUgc2FtZS5cbmV4cG9ydCBmdW5jdGlvbiBzYW5pdGl6ZU1hcEZpbHRlcih2YWx1ZTogdW5rbm93bik6IE1hcEZpbHRlciB7XG4gIGlmICghdmFsdWUgfHwgdHlwZW9mIHZhbHVlICE9PSAnb2JqZWN0JyB8fCBBcnJheS5pc0FycmF5KHZhbHVlKSkge1xuICAgIHJldHVybiB7fTtcbiAgfVxuXG4gIGNvbnN0IHNhbml0aXplZDogTWFwRmlsdGVyID0ge307XG4gIGZvciAoY29uc3QgW2dhbWVNYXAsIHN0YXRlXSBvZiBPYmplY3QuZW50cmllcyh2YWx1ZSBhcyBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPikpIHtcbiAgICBpZiAoZ2FtZU1hcCAmJiAoc3RhdGUgPT09ICdyZXF1aXJlZCcgfHwgc3RhdGUgPT09ICdibG9ja2VkJykpIHtcbiAgICAgIHNhbml0aXplZFtnYW1lTWFwXSA9IHN0YXRlO1xuICAgIH1cbiAgfVxuICByZXR1cm4gc2FuaXRpemVkO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gbm9ybWFsaXplU2V0dGluZ3MoXG4gIGN1cnJlbnQ6IExvYmJ5RGlzY292ZXJ5U2V0dGluZ3MgfCBudWxsIHwgdW5kZWZpbmVkXG4pOiBMb2JieURpc2NvdmVyeVNldHRpbmdzIHtcbiAgcmV0dXJuIHtcbiAgICBjcml0ZXJpYTogc2FuaXRpemVDcml0ZXJpYShjdXJyZW50Py5jcml0ZXJpYSksXG4gICAgZGlzY292ZXJ5RW5hYmxlZDpcbiAgICAgIHR5cGVvZiBjdXJyZW50Py5kaXNjb3ZlcnlFbmFibGVkID09PSAnYm9vbGVhbicgPyBjdXJyZW50LmRpc2NvdmVyeUVuYWJsZWQgOiB0cnVlLFxuICAgIHNvdW5kRW5hYmxlZDogdHlwZW9mIGN1cnJlbnQ/LnNvdW5kRW5hYmxlZCA9PT0gJ2Jvb2xlYW4nID8gY3VycmVudC5zb3VuZEVuYWJsZWQgOiB0cnVlLFxuICAgIGRlc2t0b3BOb3RpZmljYXRpb25zRW5hYmxlZDpcbiAgICAgIHR5cGVvZiBjdXJyZW50Py5kZXNrdG9wTm90aWZpY2F0aW9uc0VuYWJsZWQgPT09ICdib29sZWFuJ1xuICAgICAgICA/IGN1cnJlbnQuZGVza3RvcE5vdGlmaWNhdGlvbnNFbmFibGVkXG4gICAgICAgIDogZmFsc2UsXG4gICAgaXNUZWFtVHdvVGltZXNNaW5FbmFibGVkOlxuICAgICAgdHlwZW9mIGN1cnJlbnQ/LmlzVGVhbVR3b1RpbWVzTWluRW5hYmxlZCA9PT0gJ2Jvb2xlYW4nXG4gICAgICAgID8gY3VycmVudC5pc1RlYW1Ud29UaW1lc01pbkVuYWJsZWRcbiAgICAgICAgOiAhIWN1cnJlbnQ/LmlzVGVhbVRocmVlVGltZXNNaW5FbmFibGVkLFxuICAgIG5vdGlmeVVwY29taW5nRW5hYmxlZDpcbiAgICAgIHR5cGVvZiBjdXJyZW50Py5ub3RpZnlVcGNvbWluZ0VuYWJsZWQgPT09ICdib29sZWFuJ1xuICAgICAgICA/IGN1cnJlbnQubm90aWZ5VXBjb21pbmdFbmFibGVkXG4gICAgICAgIDogdHJ1ZSxcbiAgICBpbmNsdWRlSG9zdGVkQW5kQ3VzdG9tTG9iYmllczpcbiAgICAgIHR5cGVvZiBjdXJyZW50Py5pbmNsdWRlSG9zdGVkQW5kQ3VzdG9tTG9iYmllcyA9PT0gJ2Jvb2xlYW4nXG4gICAgICAgID8gY3VycmVudC5pbmNsdWRlSG9zdGVkQW5kQ3VzdG9tTG9iYmllc1xuICAgICAgICA6IHRydWUsXG4gICAgbWFwRmlsdGVyOiBzYW5pdGl6ZU1hcEZpbHRlcihjdXJyZW50Py5tYXBGaWx0ZXIpLFxuICB9O1xufVxuIiwgIi8qKlxuICogTG9iYnlEaXNjb3ZlcnlFbmdpbmUgLSBjb3JlIG1hdGNoaW5nIGxvZ2ljIGZvciBub3RpZnktb25seSBkaXNjb3ZlcnkuXG4gKi9cblxuaW1wb3J0IHR5cGUgeyBMb2JieSB9IGZyb20gJ0AvdHlwZXMvZ2FtZSc7XG5pbXBvcnQgdHlwZSB7XG4gIERpc2NvdmVyeUNyaXRlcmlhLFxuICBNYXBGaWx0ZXIsXG4gIE1vZGlmaWVyRmlsdGVycyxcbiAgTnVtZXJpY01vZGlmaWVyU3RhdGUsXG59IGZyb20gJy4vTG9iYnlEaXNjb3ZlcnlUeXBlcyc7XG5pbXBvcnQge1xuICBnZXRMb2JieUNhcGFjaXR5LFxuICBnZXRMb2JieUdhbWVNb2RlLFxuICBnZXRMb2JieU1vZGlmaWVyVmFsdWUsXG4gIGdldExvYmJ5VGVhbUNvbmZpZyxcbiAgZ2V0UGxheWVyc1BlclRlYW0sXG59IGZyb20gJy4vTG9iYnlEaXNjb3ZlcnlIZWxwZXJzJztcblxuY29uc3QgQk9PTEVBTl9NT0RJRklFUl9LRVlTOiBBcnJheTxrZXlvZiBNb2RpZmllckZpbHRlcnM+ID0gW1xuICAnaXNDb21wYWN0JyxcbiAgJ2lzUmFuZG9tU3Bhd24nLFxuICAnaXNDcm93ZGVkJyxcbiAgJ2lzSGFyZE5hdGlvbnMnLFxuICAnaXNBbGxpYW5jZXNEaXNhYmxlZCcsXG4gICdpc051a2VzRGlzYWJsZWQnLFxuICAnaXNTQU1zRGlzYWJsZWQnLFxuICAnaXNQZWFjZVRpbWUnLFxuICAnaXNXYXRlck51a2VzJyxcbiAgJ2lzRG9vbXNkYXlDbG9jaycsXG4gICdpc1RydXN0ZWQnLFxuXTtcblxuZXhwb3J0IGNsYXNzIExvYmJ5RGlzY292ZXJ5RW5naW5lIHtcbiAgbWF0Y2hlc0NyaXRlcmlhKFxuICAgIGxvYmJ5OiBMb2JieSxcbiAgICBjcml0ZXJpYUxpc3Q6IERpc2NvdmVyeUNyaXRlcmlhW10sXG4gICAgbWFwRmlsdGVyOiBNYXBGaWx0ZXIgPSB7fVxuICApOiBib29sZWFuIHtcbiAgICBpZiAoIWxvYmJ5IHx8ICFsb2JieS5nYW1lQ29uZmlnIHx8ICFjcml0ZXJpYUxpc3QgfHwgY3JpdGVyaWFMaXN0Lmxlbmd0aCA9PT0gMCkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIGlmICghdGhpcy5tYXRjaGVzTWFwRmlsdGVyKGxvYmJ5LmdhbWVDb25maWcuZ2FtZU1hcCwgbWFwRmlsdGVyKSkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIGNvbnN0IGdhbWVNb2RlID0gZ2V0TG9iYnlHYW1lTW9kZShsb2JieSk7XG4gICAgY29uc3QgbG9iYnlDYXBhY2l0eSA9IGdldExvYmJ5Q2FwYWNpdHkobG9iYnkpO1xuICAgIGlmICghZ2FtZU1vZGUgfHwgbG9iYnlDYXBhY2l0eSA9PT0gbnVsbCkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIGNvbnN0IGxvYmJ5VGVhbUNvbmZpZyA9IGdldExvYmJ5VGVhbUNvbmZpZyhsb2JieSk7XG4gICAgY29uc3QgdGVhbUNvbXBhcmlzb25DYXBhY2l0eSA9XG4gICAgICBnYW1lTW9kZSA9PT0gJ1RlYW0nXG4gICAgICAgID8gZ2V0UGxheWVyc1BlclRlYW0obG9iYnlUZWFtQ29uZmlnLCBsb2JieUNhcGFjaXR5KVxuICAgICAgICA6IG51bGw7XG5cbiAgICAvLyBSZXNvbHZlIHRoZSBsb2JieSdzIGVmZmVjdGl2ZSBudW1iZXIgb2YgdGVhbXMuIE9wZW5Gcm9udCBlbmNvZGVzIGEgdGVhbVxuICAgIC8vIGdhbWUncyBwbGF5ZXJUZWFtcyBlaXRoZXIgYXMgYSBudW1iZXIgKHRoZSB0ZWFtIGNvdW50KSBvciBhcyBhIG5hbWVkXG4gICAgLy8gcGxheWVycy1wZXItdGVhbSBmb3JtYXQgKCdEdW9zJy8nVHJpb3MnLydRdWFkcycpLCB3aG9zZSB0ZWFtIGNvdW50IGlzXG4gICAgLy8gZGVyaXZlZCBmcm9tIGNhcGFjaXR5LiAnSHVtYW5zIFZzIE5hdGlvbnMnIGhhcyBubyBudW1lcmljIHRlYW0gY291bnQgYW5kXG4gICAgLy8gaXMgbWF0Y2hlZCBieSBmb3JtYXQgaWRlbnRpdHkgaW5zdGVhZCwgc28gaXQgc3RheXMgbnVsbCBoZXJlLlxuICAgIGNvbnN0IGxvYmJ5TnVtVGVhbXMgPSB0aGlzLnJlc29sdmVMb2JieVRlYW1Db3VudChcbiAgICAgIGxvYmJ5VGVhbUNvbmZpZyxcbiAgICAgIHRlYW1Db21wYXJpc29uQ2FwYWNpdHksXG4gICAgICBsb2JieUNhcGFjaXR5XG4gICAgKTtcblxuICAgIGZvciAoY29uc3QgY3JpdGVyaWEgb2YgY3JpdGVyaWFMaXN0KSB7XG4gICAgICBpZiAoY3JpdGVyaWEuZ2FtZU1vZGUgIT09IGdhbWVNb2RlKSB7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuXG4gICAgICBpZiAoZ2FtZU1vZGUgPT09ICdUZWFtJykge1xuICAgICAgICBjb25zdCBoYXNGb3JtYXQgPSBjcml0ZXJpYS50ZWFtQ291bnQgIT09IG51bGwgJiYgY3JpdGVyaWEudGVhbUNvdW50ICE9PSB1bmRlZmluZWQ7XG4gICAgICAgIC8vIEh1bWFucyBWcyBOYXRpb25zIG1hdGNoZXMgb25seSB3aGVuIHRoZSBDcml0ZXJpb24gc2VsZWN0cyBpdC5cbiAgICAgICAgaWYgKCFoYXNGb3JtYXQgJiYgbG9iYnlUZWFtQ29uZmlnID09PSAnSHVtYW5zIFZzIE5hdGlvbnMnKSB7XG4gICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGhhc0Zvcm1hdCkge1xuICAgICAgICAgIGlmIChjcml0ZXJpYS50ZWFtQ291bnQgPT09ICc4KycpIHtcbiAgICAgICAgICAgIGlmIChsb2JieU51bVRlYW1zID09PSBudWxsIHx8IGxvYmJ5TnVtVGVhbXMgPCA4KSB7XG4gICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0gZWxzZSBpZiAoXG4gICAgICAgICAgICBjcml0ZXJpYS50ZWFtQ291bnQgPT09ICdIdW1hbnMgVnMgTmF0aW9ucycgfHxcbiAgICAgICAgICAgIGNyaXRlcmlhLnRlYW1Db3VudCA9PT0gJ0R1b3MnIHx8XG4gICAgICAgICAgICBjcml0ZXJpYS50ZWFtQ291bnQgPT09ICdUcmlvcycgfHxcbiAgICAgICAgICAgIGNyaXRlcmlhLnRlYW1Db3VudCA9PT0gJ1F1YWRzJ1xuICAgICAgICAgICkge1xuICAgICAgICAgICAgLy8gTmFtZWQtZm9ybWF0IGNyaXRlcmlhIG1hdGNoIGJ5IGZvcm1hdCBpZGVudGl0eS4gVGhlIFVJIG9ubHkgZW1pdHNcbiAgICAgICAgICAgIC8vICdIdW1hbnMgVnMgTmF0aW9ucycgKER1b3MvVHJpb3MvUXVhZHMgYXJlIHN0cmlwcGVkIGJ5IGNyaXRlcmlhXG4gICAgICAgICAgICAvLyBzYW5pdGl6YXRpb24pOyB0aGUgb3RoZXJzIGFyZSBoYW5kbGVkIGRlZmVuc2l2ZWx5IGZvciBwYXJpdHkuXG4gICAgICAgICAgICBpZiAoY3JpdGVyaWEudGVhbUNvdW50ICE9PSBsb2JieVRlYW1Db25maWcpIHtcbiAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSBlbHNlIGlmIChcbiAgICAgICAgICAgIGxvYmJ5TnVtVGVhbXMgPT09IG51bGwgfHxcbiAgICAgICAgICAgIGNyaXRlcmlhLnRlYW1Db3VudCAhPT0gbG9iYnlOdW1UZWFtc1xuICAgICAgICAgICkge1xuICAgICAgICAgICAgLy8gTnVtZXJpYyBOVU1CRVIgT0YgVEVBTVMgY3JpdGVyaW9uOiBjb21wYXJlIGFnYWluc3QgdGhlIGRlcml2ZWRcbiAgICAgICAgICAgIC8vIHRlYW0gY291bnQgc28gbmFtZWQtZm9ybWF0IGxvYmJpZXMgKCdRdWFkcycgKyBjYXAgMjQgPT4gNiB0ZWFtcylcbiAgICAgICAgICAgIC8vIG1hdGNoIHRoZSB1c2VyJ3MgbnVtZXJpYyBzZWxlY3Rpb24uXG4gICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBpZiAodGVhbUNvbXBhcmlzb25DYXBhY2l0eSA9PT0gbnVsbCkge1xuICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IGNhcGFjaXR5VG9Db21wYXJlID0gZ2FtZU1vZGUgPT09ICdUZWFtJyA/IHRlYW1Db21wYXJpc29uQ2FwYWNpdHkgOiBsb2JieUNhcGFjaXR5O1xuICAgICAgaWYgKGNhcGFjaXR5VG9Db21wYXJlID09PSBudWxsKSB7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuXG4gICAgICAvLyBIdW1hbnMgVnMgTmF0aW9ucyBoYXMgbm8gZml4ZWQgcGVyLXRlYW0gcGxheWVyIGNvdW50IChodW1hbnMgcGxheSBhZ2FpbnN0XG4gICAgICAvLyBBSSBuYXRpb25zLCBub3Qgc3RydWN0dXJlZCB0ZWFtcyksIHNvIHRoZSBwbGF5ZXJzLXBlci10ZWFtIHJhbmdlIGZpbHRlciBpc1xuICAgICAgLy8gbWVhbmluZ2xlc3MgZm9yIHRoYXQgZm9ybWF0LiBTa2lwIGl0IGFuZCBtYXRjaCBvbiBmb3JtYXQgKyBtb2RpZmllcnMgb25seS5cbiAgICAgIGlmIChsb2JieVRlYW1Db25maWcgIT09ICdIdW1hbnMgVnMgTmF0aW9ucycpIHtcbiAgICAgICAgaWYgKGNyaXRlcmlhLm1pblBsYXllcnMgIT09IG51bGwgJiYgY2FwYWNpdHlUb0NvbXBhcmUgPCBjcml0ZXJpYS5taW5QbGF5ZXJzKSB7XG4gICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGNyaXRlcmlhLm1heFBsYXllcnMgIT09IG51bGwgJiYgY2FwYWNpdHlUb0NvbXBhcmUgPiBjcml0ZXJpYS5tYXhQbGF5ZXJzKSB7XG4gICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgaWYgKCF0aGlzLm1hdGNoZXNNb2RpZmllcnMobG9iYnksIGNyaXRlcmlhLm1vZGlmaWVycykpIHtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cblxuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZXNvbHZlIGEgbG9iYnkncyBlZmZlY3RpdmUgbnVtYmVyIG9mIHRlYW1zIGZyb20gaXRzIHRlYW0gY29uZmlnLlxuICAgKiAtIG51bWVyaWMgY29uZmlnOiB0aGUgdGVhbSBjb3VudCBpdHNlbGZcbiAgICogLSBuYW1lZCBwbGF5ZXJzLXBlci10ZWFtIGZvcm1hdCAoJ0R1b3MnLydUcmlvcycvJ1F1YWRzJyk6IGRlcml2ZWQgYXNcbiAgICogICBmbG9vcihjYXBhY2l0eSAvIHBsYXllcnNQZXJUZWFtKVxuICAgKiAtICdIdW1hbnMgVnMgTmF0aW9ucycgb3IgbWlzc2luZy96ZXJvIGNhcGFjaXR5OiBudWxsIChubyBudW1lcmljIHRlYW0gY291bnQpXG4gICAqL1xuICBwcml2YXRlIHJlc29sdmVMb2JieVRlYW1Db3VudChcbiAgICBsb2JieVRlYW1Db25maWc6IFJldHVyblR5cGU8dHlwZW9mIGdldExvYmJ5VGVhbUNvbmZpZz4sXG4gICAgcGxheWVyc1BlclRlYW06IG51bWJlciB8IG51bGwsXG4gICAgbG9iYnlDYXBhY2l0eTogbnVtYmVyIHwgbnVsbFxuICApOiBudW1iZXIgfCBudWxsIHtcbiAgICBpZiAodHlwZW9mIGxvYmJ5VGVhbUNvbmZpZyA9PT0gJ251bWJlcicpIHtcbiAgICAgIHJldHVybiBsb2JieVRlYW1Db25maWc7XG4gICAgfVxuICAgIGlmIChsb2JieVRlYW1Db25maWcgPT09ICdIdW1hbnMgVnMgTmF0aW9ucycpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICBpZiAocGxheWVyc1BlclRlYW0gIT09IG51bGwgJiYgcGxheWVyc1BlclRlYW0gPiAwICYmIGxvYmJ5Q2FwYWNpdHkgIT09IG51bGwpIHtcbiAgICAgIHJldHVybiBNYXRoLmZsb29yKGxvYmJ5Q2FwYWNpdHkgLyBwbGF5ZXJzUGVyVGVhbSk7XG4gICAgfVxuICAgIHJldHVybiBudWxsO1xuICB9XG5cbiAgcHJpdmF0ZSBtYXRjaGVzTWFwRmlsdGVyKGdhbWVNYXA6IHN0cmluZyB8IHVuZGVmaW5lZCwgbWFwRmlsdGVyOiBNYXBGaWx0ZXIpOiBib29sZWFuIHtcbiAgICBpZiAoZ2FtZU1hcCAhPT0gdW5kZWZpbmVkICYmIG1hcEZpbHRlcltnYW1lTWFwXSA9PT0gJ2Jsb2NrZWQnKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIGNvbnN0IGhhc1JlcXVpcmVkTWFwID0gT2JqZWN0LnZhbHVlcyhtYXBGaWx0ZXIpLnNvbWUoKHN0YXRlKSA9PiBzdGF0ZSA9PT0gJ3JlcXVpcmVkJyk7XG4gICAgaWYgKGhhc1JlcXVpcmVkTWFwKSB7XG4gICAgICByZXR1cm4gZ2FtZU1hcCAhPT0gdW5kZWZpbmVkICYmIG1hcEZpbHRlcltnYW1lTWFwXSA9PT0gJ3JlcXVpcmVkJztcbiAgICB9XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cblxuICBwcml2YXRlIG1hdGNoZXNNb2RpZmllcnMoXG4gICAgbG9iYnk6IExvYmJ5LFxuICAgIGZpbHRlcnM6IE1vZGlmaWVyRmlsdGVycyB8IHVuZGVmaW5lZFxuICApOiBib29sZWFuIHtcbiAgICBpZiAoIWZpbHRlcnMpIHtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cblxuICAgIGZvciAoY29uc3Qga2V5IG9mIEJPT0xFQU5fTU9ESUZJRVJfS0VZUykge1xuICAgICAgY29uc3Qgc3RhdGUgPSBmaWx0ZXJzW2tleV07XG4gICAgICBpZiAoIXN0YXRlIHx8IHN0YXRlID09PSAnYW55Jykge1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cblxuICAgICAgY29uc3QgYWN0dWFsID0gQm9vbGVhbihnZXRMb2JieU1vZGlmaWVyVmFsdWUobG9iYnksIGtleSkpO1xuICAgICAgaWYgKHN0YXRlID09PSAnYmxvY2tlZCcgJiYgYWN0dWFsKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cbiAgICAgIGlmIChzdGF0ZSA9PT0gJ3JlcXVpcmVkJyAmJiAhYWN0dWFsKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAoIXRoaXMubWF0Y2hlc051bWVyaWNNb2RpZmllcihnZXRMb2JieU1vZGlmaWVyVmFsdWUobG9iYnksICdzdGFydGluZ0dvbGQnKSwgZmlsdGVycy5zdGFydGluZ0dvbGQpKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgaWYgKCF0aGlzLm1hdGNoZXNOdW1lcmljTW9kaWZpZXIoZ2V0TG9iYnlNb2RpZmllclZhbHVlKGxvYmJ5LCAnZ29sZE11bHRpcGxpZXInKSwgZmlsdGVycy5nb2xkTXVsdGlwbGllcikpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuXG4gIHByaXZhdGUgbWF0Y2hlc051bWVyaWNNb2RpZmllcihcbiAgICBhY3R1YWxWYWx1ZTogYm9vbGVhbiB8IG51bWJlciB8IHVuZGVmaW5lZCxcbiAgICBzdGF0ZXM6IE51bWVyaWNNb2RpZmllclN0YXRlIHwgdW5kZWZpbmVkXG4gICk6IGJvb2xlYW4ge1xuICAgIGlmICghc3RhdGVzKSB7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG5cbiAgICBjb25zdCBudW1lcmljQWN0dWFsID1cbiAgICAgIHR5cGVvZiBhY3R1YWxWYWx1ZSA9PT0gJ251bWJlcicgJiYgTnVtYmVyLmlzRmluaXRlKGFjdHVhbFZhbHVlKVxuICAgICAgICA/IGFjdHVhbFZhbHVlXG4gICAgICAgIDogbnVsbDtcblxuICAgIGNvbnN0IGVudHJpZXMgPSBPYmplY3QuZW50cmllcyhzdGF0ZXMpO1xuICAgIGlmIChlbnRyaWVzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuXG4gICAgY29uc3QgYmxvY2tlZFZhbHVlcyA9IGVudHJpZXNcbiAgICAgIC5maWx0ZXIoKFssIHN0YXRlXSkgPT4gc3RhdGUgPT09ICdibG9ja2VkJylcbiAgICAgIC5tYXAoKFt2YWx1ZV0pID0+IE51bWJlcih2YWx1ZSkpO1xuXG4gICAgaWYgKG51bWVyaWNBY3R1YWwgIT09IG51bGwgJiYgYmxvY2tlZFZhbHVlcy5pbmNsdWRlcyhudW1lcmljQWN0dWFsKSkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIGNvbnN0IHJlcXVpcmVkVmFsdWVzID0gZW50cmllc1xuICAgICAgLmZpbHRlcigoWywgc3RhdGVdKSA9PiBzdGF0ZSA9PT0gJ3JlcXVpcmVkJylcbiAgICAgIC5tYXAoKFt2YWx1ZV0pID0+IE51bWJlcih2YWx1ZSkpO1xuXG4gICAgaWYgKHJlcXVpcmVkVmFsdWVzLmxlbmd0aCA+IDApIHtcbiAgICAgIGlmIChudW1lcmljQWN0dWFsID09PSBudWxsKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cbiAgICAgIGlmICghcmVxdWlyZWRWYWx1ZXMuaW5jbHVkZXMobnVtZXJpY0FjdHVhbCkpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiB0cnVlO1xuICB9XG59XG4iLCAiLyoqXG4gKiBQdXJlIG1hcHBpbmcgaGVscGVycyBmb3IgdGhlIGR1YWwtdGh1bWIgcmFuZ2Ugc2xpZGVyLlxuICpcbiAqIFRoZSBzbGlkZXIgc3RvcmVzIGEgXCJwb3NpdGlvblwiIGluIFswLCAxXSAobWFwcGVkIHRvIGEgMC4uMTAwMCBuYXRpdmUgcmFuZ2VcbiAqIGlucHV0KSBhbmQgYSBcInZhbHVlXCIgKGFuIGludGVnZXIgaW4gW3N0b3BzWzBdLCBzdG9wc1tzdG9wcy5sZW5ndGggLSAxXV0pLlxuICogVGhlc2UgaGVscGVycyB0cmFuc2xhdGUgYmV0d2VlbiB0aGUgdHdvLlxuICovXG5cbmV4cG9ydCBmdW5jdGlvbiBjbGFtcFRvU3RvcHModmFsdWU6IG51bWJlciwgc3RvcHM6IHJlYWRvbmx5IG51bWJlcltdKTogbnVtYmVyIHtcbiAgaWYgKHN0b3BzLmxlbmd0aCA9PT0gMCkgcmV0dXJuIHZhbHVlO1xuICBjb25zdCBsbyA9IHN0b3BzWzBdITtcbiAgY29uc3QgaGkgPSBzdG9wc1tzdG9wcy5sZW5ndGggLSAxXSE7XG4gIGlmICh2YWx1ZSA8IGxvKSByZXR1cm4gbG87XG4gIGlmICh2YWx1ZSA+IGhpKSByZXR1cm4gaGk7XG4gIHJldHVybiB2YWx1ZTtcbn1cblxuLyoqXG4gKiBNYXAgYW4gaW50ZWdlciB2YWx1ZSB0byBhIHBvc2l0aW9uIGluIFswLCAxXSB1c2luZyBgc3RvcHNgIGFzIGFuY2hvciBwb2ludHMuXG4gKiBFYWNoIHN0b3Agc2l0cyBhdCBldmVubHktc3BhY2VkIHBvc2l0aW9uIGBpIC8gKHN0b3BzLmxlbmd0aCAtIDEpYC5cbiAqIFZhbHVlcyBiZXR3ZWVuIHN0b3BzIGludGVycG9sYXRlIGxpbmVhcmx5IHdpdGhpbiB0aGVpciBzZWdtZW50LlxuICovXG5leHBvcnQgZnVuY3Rpb24gdmFsdWVUb1Bvc2l0aW9uKHZhbHVlOiBudW1iZXIsIHN0b3BzOiByZWFkb25seSBudW1iZXJbXSk6IG51bWJlciB7XG4gIGlmIChzdG9wcy5sZW5ndGggPCAyKSByZXR1cm4gMDtcbiAgY29uc3QgY2xhbXBlZCA9IGNsYW1wVG9TdG9wcyh2YWx1ZSwgc3RvcHMpO1xuICBjb25zdCBsYXN0SWR4ID0gc3RvcHMubGVuZ3RoIC0gMTtcbiAgaWYgKGNsYW1wZWQgPj0gc3RvcHNbbGFzdElkeF0hKSByZXR1cm4gMTtcbiAgaWYgKGNsYW1wZWQgPD0gc3RvcHNbMF0hKSByZXR1cm4gMDtcblxuICBmb3IgKGxldCBpID0gMDsgaSA8IGxhc3RJZHg7IGkrKykge1xuICAgIGNvbnN0IGxvID0gc3RvcHNbaV0hO1xuICAgIGNvbnN0IGhpID0gc3RvcHNbaSArIDFdITtcbiAgICBpZiAoY2xhbXBlZCA+PSBsbyAmJiBjbGFtcGVkIDw9IGhpKSB7XG4gICAgICBjb25zdCBzZWdGcmFjID0gKGNsYW1wZWQgLSBsbykgLyAoaGkgLSBsbyk7XG4gICAgICByZXR1cm4gKGkgKyBzZWdGcmFjKSAvIGxhc3RJZHg7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIDE7XG59XG5cbi8qKlxuICogSW52ZXJzZSBvZiBgdmFsdWVUb1Bvc2l0aW9uYC4gTWFwcyBhIHBvc2l0aW9uIGluIFswLCAxXSB0byBhbiBpbnRlZ2VyIHZhbHVlXG4gKiBieSBpbnRlcnBvbGF0aW5nIHdpdGhpbiB0aGUgc2VnbWVudCBjb250YWluaW5nIHRoZSBwb3NpdGlvbiwgdGhlbiByb3VuZGluZy5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHBvc2l0aW9uVG9WYWx1ZShwb3NpdGlvbjogbnVtYmVyLCBzdG9wczogcmVhZG9ubHkgbnVtYmVyW10pOiBudW1iZXIge1xuICBpZiAoc3RvcHMubGVuZ3RoIDwgMikgcmV0dXJuIHN0b3BzWzBdID8/IDA7XG4gIGNvbnN0IGxhc3RJZHggPSBzdG9wcy5sZW5ndGggLSAxO1xuICBpZiAocG9zaXRpb24gPD0gMCkgcmV0dXJuIHN0b3BzWzBdITtcbiAgaWYgKHBvc2l0aW9uID49IDEpIHJldHVybiBzdG9wc1tsYXN0SWR4XSE7XG5cbiAgY29uc3QgdCA9IHBvc2l0aW9uICogbGFzdElkeDtcbiAgY29uc3QgaSA9IE1hdGguZmxvb3IodCk7XG4gIGNvbnN0IGZyYWMgPSB0IC0gaTtcbiAgLy8gaSBjYW4gZXF1YWwgbGFzdElkeCBvbmx5IGlmIHBvc2l0aW9uID09PSAxLCBoYW5kbGVkIGFib3ZlLlxuICBjb25zdCByYXcgPSBzdG9wc1tpXSEgKyBmcmFjICogKHN0b3BzW2kgKyAxXSEgLSBzdG9wc1tpXSEpO1xuICByZXR1cm4gTWF0aC5yb3VuZChyYXcpO1xufVxuXG4iLCAiaW1wb3J0IHtcbiAgY2xhbXBUb1N0b3BzLFxuICBwb3NpdGlvblRvVmFsdWUsXG4gIHZhbHVlVG9Qb3NpdGlvbixcbn0gZnJvbSAnQC9tb2R1bGVzL2xvYmJ5LWRpc2NvdmVyeS9SYW5nZVNsaWRlckhlbHBlcnMnO1xuXG5leHBvcnQgaW50ZXJmYWNlIFJhbmdlU2xpZGVyQ29uZmlnIHtcbiAgY29udGFpbmVySWQ6IHN0cmluZzsgICAgIC8vIDxkaXYgY2xhc3M9XCJsZC1zbGlkZXItcm93XCI+IG91dGVyIGNvbnRhaW5lcjsgc2NvcGUgZm9yIHN0ZXBwZXIgYnV0dG9uc1xuICByYW5nZVJvb3RJZDogc3RyaW5nOyAgICAgLy8gPGRpdiBjbGFzcz1cImxkLXJhbmdlXCI+IGVsZW1lbnQgcmVjZWl2aW5nIC0tbG8vLS1oaSBDU1MgdmFyc1xuICBtaW5TbGlkZXJJZDogc3RyaW5nOyAgICAgLy8gPGlucHV0IHR5cGU9XCJyYW5nZVwiPiAwLi4xMDAwIGZvciBtaW4gcG9zaXRpb25cbiAgbWF4U2xpZGVySWQ6IHN0cmluZzsgICAgIC8vIDxpbnB1dCB0eXBlPVwicmFuZ2VcIj4gMC4uMTAwMCBmb3IgbWF4IHBvc2l0aW9uXG4gIG1pbklucHV0SWQ6IHN0cmluZzsgICAgICAvLyA8aW5wdXQgdHlwZT1cIm51bWJlclwiPiBmb3IgbWluIHZhbHVlXG4gIG1heElucHV0SWQ6IHN0cmluZzsgICAgICAvLyA8aW5wdXQgdHlwZT1cIm51bWJlclwiPiBmb3IgbWF4IHZhbHVlXG4gIGZpbGxJZDogc3RyaW5nOyAgICAgICAgICAvLyA8ZGl2PiB3aG9zZSAtLWxvIC8gLS1oaSBDU1MgdmFycyBkcmF3IHRoZSBmaWxsXG4gIHRpY2tzQ29udGFpbmVySWQ/OiBzdHJpbmc7XG4gIGJvdW5kczogeyBtaW46IG51bWJlcjsgbWF4OiBudW1iZXIgfTtcbiAgc3RvcHM/OiByZWFkb25seSBudW1iZXJbXTtcbiAgbG9ja01heFRvVHdpY2VNaW4/OiAoKSA9PiBib29sZWFuO1xuICBvbkNoYW5nZTogKG1pbjogbnVtYmVyLCBtYXg6IG51bWJlcikgPT4gdm9pZDtcbn1cblxuY29uc3QgUE9TSVRJT05fUkFOR0UgPSAxMDAwO1xuXG5leHBvcnQgY2xhc3MgUmFuZ2VTbGlkZXIge1xuICBwcml2YXRlIHJlYWRvbmx5IG1pblNsaWRlcjogSFRNTElucHV0RWxlbWVudDtcbiAgcHJpdmF0ZSByZWFkb25seSBtYXhTbGlkZXI6IEhUTUxJbnB1dEVsZW1lbnQ7XG4gIHByaXZhdGUgcmVhZG9ubHkgbWluSW5wdXQ6IEhUTUxJbnB1dEVsZW1lbnQ7XG4gIHByaXZhdGUgcmVhZG9ubHkgbWF4SW5wdXQ6IEhUTUxJbnB1dEVsZW1lbnQ7XG4gIHByaXZhdGUgcmVhZG9ubHkgcmFuZ2VSb290OiBIVE1MRWxlbWVudCB8IG51bGw7XG4gIHByaXZhdGUgcmVhZG9ubHkgY29udGFpbmVyOiBIVE1MRWxlbWVudCB8IG51bGw7XG4gIHByaXZhdGUgcmVhZG9ubHkgc3RvcHM6IHJlYWRvbmx5IG51bWJlcltdO1xuICBwcml2YXRlIHJlYWRvbmx5IGNmZzogUmFuZ2VTbGlkZXJDb25maWc7XG4gIHByaXZhdGUgbGFzdE1pbjogbnVtYmVyO1xuICBwcml2YXRlIGxhc3RNYXg6IG51bWJlcjtcblxuICBjb25zdHJ1Y3RvcihjZmc6IFJhbmdlU2xpZGVyQ29uZmlnKSB7XG4gICAgdGhpcy5jZmcgPSBjZmc7XG4gICAgdGhpcy5zdG9wcyA9IGNmZy5zdG9wcyA/PyBbY2ZnLmJvdW5kcy5taW4sIGNmZy5ib3VuZHMubWF4XTtcbiAgICB0aGlzLm1pblNsaWRlciA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKGNmZy5taW5TbGlkZXJJZCkgYXMgSFRNTElucHV0RWxlbWVudDtcbiAgICB0aGlzLm1heFNsaWRlciA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKGNmZy5tYXhTbGlkZXJJZCkgYXMgSFRNTElucHV0RWxlbWVudDtcbiAgICB0aGlzLm1pbklucHV0ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoY2ZnLm1pbklucHV0SWQpIGFzIEhUTUxJbnB1dEVsZW1lbnQ7XG4gICAgdGhpcy5tYXhJbnB1dCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKGNmZy5tYXhJbnB1dElkKSBhcyBIVE1MSW5wdXRFbGVtZW50O1xuICAgIHRoaXMucmFuZ2VSb290ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoY2ZnLnJhbmdlUm9vdElkKTtcbiAgICB0aGlzLmNvbnRhaW5lciA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKGNmZy5jb250YWluZXJJZCk7XG5cbiAgICBpZiAoIXRoaXMubWluU2xpZGVyIHx8ICF0aGlzLm1heFNsaWRlciB8fCAhdGhpcy5taW5JbnB1dCB8fCAhdGhpcy5tYXhJbnB1dCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBSYW5nZVNsaWRlcjogbWlzc2luZyByZXF1aXJlZCBlbGVtZW50IGluICR7Y2ZnLnJhbmdlUm9vdElkfWApO1xuICAgIH1cblxuICAgIHRoaXMubWluU2xpZGVyLm1pbiA9ICcwJztcbiAgICB0aGlzLm1pblNsaWRlci5tYXggPSBTdHJpbmcoUE9TSVRJT05fUkFOR0UpO1xuICAgIHRoaXMubWF4U2xpZGVyLm1pbiA9ICcwJztcbiAgICB0aGlzLm1heFNsaWRlci5tYXggPSBTdHJpbmcoUE9TSVRJT05fUkFOR0UpO1xuXG4gICAgdGhpcy5sYXN0TWluID0gdGhpcy5yZWFkSW5wdXRDbGFtcGVkKHRoaXMubWluSW5wdXQsIGNmZy5ib3VuZHMubWluKTtcbiAgICB0aGlzLmxhc3RNYXggPSB0aGlzLnJlYWRJbnB1dENsYW1wZWQodGhpcy5tYXhJbnB1dCwgY2ZnLmJvdW5kcy5tYXgpO1xuICAgIGlmICh0aGlzLmxhc3RNYXggPCB0aGlzLmxhc3RNaW4pIHRoaXMubGFzdE1heCA9IHRoaXMubGFzdE1pbjtcblxuICAgIHRoaXMubWluU2xpZGVyLmFkZEV2ZW50TGlzdGVuZXIoJ2lucHV0JywgdGhpcy5vbk1pblNsaWRlcklucHV0KTtcbiAgICB0aGlzLm1heFNsaWRlci5hZGRFdmVudExpc3RlbmVyKCdpbnB1dCcsIHRoaXMub25NYXhTbGlkZXJJbnB1dCk7XG4gICAgdGhpcy5taW5JbnB1dC5hZGRFdmVudExpc3RlbmVyKCdjaGFuZ2UnLCB0aGlzLm9uTWluSW5wdXRDaGFuZ2UpO1xuICAgIHRoaXMubWF4SW5wdXQuYWRkRXZlbnRMaXN0ZW5lcignY2hhbmdlJywgdGhpcy5vbk1heElucHV0Q2hhbmdlKTtcblxuICAgIHRoaXMuYXBwbHlWYWx1ZXModGhpcy5sYXN0TWluLCB0aGlzLmxhc3RNYXgsIHsgZmlyZU9uQ2hhbmdlOiBmYWxzZSwgY2hhbmdlZDogJ2JvdGgnIH0pO1xuICAgIHRoaXMucmVuZGVyVGlja3MoKTtcbiAgICB0aGlzLndpcmVTdGVwcGVycygpO1xuICAgIHRoaXMuYXBwbHlMb2NrU3RhdGUoKTtcbiAgfVxuXG4gIC8qKiBUb2dnbGUgdGhlIGRpc2FibGVkIGFwcGVhcmFuY2UgKyBiZWhhdmlvciBvbiBtYXgtc2lkZSBjb250cm9scy4gKi9cbiAgYXBwbHlMb2NrU3RhdGUoKTogdm9pZCB7XG4gICAgY29uc3QgbG9ja2VkID0gISF0aGlzLmNmZy5sb2NrTWF4VG9Ud2ljZU1pbj8uKCk7XG4gICAgdGhpcy5tYXhTbGlkZXIuZGlzYWJsZWQgPSBsb2NrZWQ7XG4gICAgdGhpcy5tYXhTbGlkZXIuY2xhc3NMaXN0LnRvZ2dsZSgnaXMtbWF4LWxvY2tlZCcsIGxvY2tlZCk7XG4gICAgdGhpcy5tYXhJbnB1dC5kaXNhYmxlZCA9IGxvY2tlZDtcblxuICAgIGlmICh0aGlzLmNvbnRhaW5lcikge1xuICAgICAgdGhpcy5jb250YWluZXJcbiAgICAgICAgLnF1ZXJ5U2VsZWN0b3JBbGw8SFRNTEJ1dHRvbkVsZW1lbnQ+KCcubGQtc3RlcC1idG5bZGF0YS10YXJnZXQ9XCJtYXhcIl0nKVxuICAgICAgICAuZm9yRWFjaCgoYnRuKSA9PiB7IGJ0bi5kaXNhYmxlZCA9IGxvY2tlZDsgfSk7XG4gICAgfVxuXG4gICAgaWYgKGxvY2tlZCkge1xuICAgICAgLy8gUmUtYXBwbHkgdGhlIDJcdTAwRDcgY29uc3RyYWludCBzbyB2aXN1YWwgc3RhdGUgbWF0Y2hlcy5cbiAgICAgIC8vIE1pbiBpcyB0aGUgc291cmNlIG9mIHRydXRoOyBtYXggZm9sbG93cyBmcm9tIGl0LlxuICAgICAgdGhpcy5hcHBseVZhbHVlcyh0aGlzLmxhc3RNaW4sIHRoaXMubGFzdE1heCwgeyBmaXJlT25DaGFuZ2U6IGZhbHNlLCBjaGFuZ2VkOiAnbWluJyB9KTtcbiAgICB9XG4gIH1cblxuICAvKiogUHVibGljIHNldHRlciBcdTIwMTQgdXNlZCB3aGVuIG1pbiBpcyBhdXRvLWJ1bXBlZCBmcm9tIG91dHNpZGUgKGUuZy4gdGVhbS1jb3VudCBjaGlwcykuICovXG4gIHNldE1pbih2YWx1ZTogbnVtYmVyKTogdm9pZCB7XG4gICAgdGhpcy5hcHBseVZhbHVlcyh2YWx1ZSwgdGhpcy5sYXN0TWF4LCB7IGZpcmVPbkNoYW5nZTogdHJ1ZSwgY2hhbmdlZDogJ21pbicgfSk7XG4gIH1cblxuICAvKiogUHVibGljIHNldHRlciBcdTIwMTQgdXNlZCBieSByZXNldCAvIGxvYWQuICovXG4gIHNldFJhbmdlKG1pbjogbnVtYmVyLCBtYXg6IG51bWJlcik6IHZvaWQge1xuICAgIHRoaXMuYXBwbHlWYWx1ZXMobWluLCBtYXgsIHsgZmlyZU9uQ2hhbmdlOiBmYWxzZSwgY2hhbmdlZDogJ2JvdGgnIH0pO1xuICB9XG5cbiAgcHJpdmF0ZSByZWFkSW5wdXRDbGFtcGVkKGVsOiBIVE1MSW5wdXRFbGVtZW50LCBmYWxsYmFjazogbnVtYmVyKTogbnVtYmVyIHtcbiAgICBjb25zdCBwYXJzZWQgPSBwYXJzZUludChlbC52YWx1ZSwgMTApO1xuICAgIGlmICghTnVtYmVyLmlzRmluaXRlKHBhcnNlZCkpIHJldHVybiBmYWxsYmFjaztcbiAgICByZXR1cm4gY2xhbXBUb1N0b3BzKHBhcnNlZCwgW3RoaXMuY2ZnLmJvdW5kcy5taW4sIHRoaXMuY2ZnLmJvdW5kcy5tYXhdKTtcbiAgfVxuXG4gIHByaXZhdGUgb25NaW5TbGlkZXJJbnB1dCA9ICgpOiB2b2lkID0+IHtcbiAgICBjb25zdCBwb3NpdGlvbiA9IHBhcnNlSW50KHRoaXMubWluU2xpZGVyLnZhbHVlLCAxMCkgLyBQT1NJVElPTl9SQU5HRTtcbiAgICBjb25zdCB2YWx1ZSA9IHBvc2l0aW9uVG9WYWx1ZShwb3NpdGlvbiwgdGhpcy5zdG9wcyk7XG4gICAgdGhpcy5hcHBseVZhbHVlcyh2YWx1ZSwgdGhpcy5sYXN0TWF4LCB7IGZpcmVPbkNoYW5nZTogdHJ1ZSwgY2hhbmdlZDogJ21pbicgfSk7XG4gIH07XG5cbiAgcHJpdmF0ZSBvbk1heFNsaWRlcklucHV0ID0gKCk6IHZvaWQgPT4ge1xuICAgIGNvbnN0IHBvc2l0aW9uID0gcGFyc2VJbnQodGhpcy5tYXhTbGlkZXIudmFsdWUsIDEwKSAvIFBPU0lUSU9OX1JBTkdFO1xuICAgIGNvbnN0IHZhbHVlID0gcG9zaXRpb25Ub1ZhbHVlKHBvc2l0aW9uLCB0aGlzLnN0b3BzKTtcbiAgICB0aGlzLmFwcGx5VmFsdWVzKHRoaXMubGFzdE1pbiwgdmFsdWUsIHsgZmlyZU9uQ2hhbmdlOiB0cnVlLCBjaGFuZ2VkOiAnbWF4JyB9KTtcbiAgfTtcblxuICBwcml2YXRlIG9uTWluSW5wdXRDaGFuZ2UgPSAoKTogdm9pZCA9PiB7XG4gICAgY29uc3QgcGFyc2VkID0gcGFyc2VJbnQodGhpcy5taW5JbnB1dC52YWx1ZSwgMTApO1xuICAgIGlmICghTnVtYmVyLmlzRmluaXRlKHBhcnNlZCkpIHtcbiAgICAgIHRoaXMuYXBwbHlWYWx1ZXModGhpcy5sYXN0TWluLCB0aGlzLmxhc3RNYXgsIHsgZmlyZU9uQ2hhbmdlOiBmYWxzZSwgY2hhbmdlZDogJ2JvdGgnIH0pO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBjb25zdCBjbGFtcGVkID0gY2xhbXBUb1N0b3BzKHBhcnNlZCwgW3RoaXMuY2ZnLmJvdW5kcy5taW4sIHRoaXMuY2ZnLmJvdW5kcy5tYXhdKTtcbiAgICB0aGlzLmFwcGx5VmFsdWVzKGNsYW1wZWQsIHRoaXMubGFzdE1heCwgeyBmaXJlT25DaGFuZ2U6IHRydWUsIGNoYW5nZWQ6ICdtaW4nIH0pO1xuICB9O1xuXG4gIHByaXZhdGUgb25NYXhJbnB1dENoYW5nZSA9ICgpOiB2b2lkID0+IHtcbiAgICBjb25zdCBwYXJzZWQgPSBwYXJzZUludCh0aGlzLm1heElucHV0LnZhbHVlLCAxMCk7XG4gICAgaWYgKCFOdW1iZXIuaXNGaW5pdGUocGFyc2VkKSkge1xuICAgICAgdGhpcy5hcHBseVZhbHVlcyh0aGlzLmxhc3RNaW4sIHRoaXMubGFzdE1heCwgeyBmaXJlT25DaGFuZ2U6IGZhbHNlLCBjaGFuZ2VkOiAnYm90aCcgfSk7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGNvbnN0IGNsYW1wZWQgPSBjbGFtcFRvU3RvcHMocGFyc2VkLCBbdGhpcy5jZmcuYm91bmRzLm1pbiwgdGhpcy5jZmcuYm91bmRzLm1heF0pO1xuICAgIHRoaXMuYXBwbHlWYWx1ZXModGhpcy5sYXN0TWluLCBjbGFtcGVkLCB7IGZpcmVPbkNoYW5nZTogdHJ1ZSwgY2hhbmdlZDogJ21heCcgfSk7XG4gIH07XG5cbiAgcHJpdmF0ZSBhcHBseVZhbHVlcyhcbiAgICBtaW46IG51bWJlcixcbiAgICBtYXg6IG51bWJlcixcbiAgICBvcHRzOiB7IGZpcmVPbkNoYW5nZTogYm9vbGVhbjsgY2hhbmdlZD86ICdtaW4nIHwgJ21heCcgfCAnYm90aCcgfVxuICApOiB2b2lkIHtcbiAgICBsZXQgbmV4dE1pbiA9IG1pbjtcbiAgICBsZXQgbmV4dE1heCA9IG1heDtcblxuICAgIC8vIExvY2stbWF4LXRvLTJcdTAwRDcgdGFrZXMgcHJlY2VkZW5jZSB3aGVuIGFjdGl2ZS5cbiAgICBpZiAodGhpcy5jZmcubG9ja01heFRvVHdpY2VNaW4/LigpKSB7XG4gICAgICBuZXh0TWF4ID0gY2xhbXBUb1N0b3BzKG5leHRNaW4gKiAyLCBbdGhpcy5jZmcuYm91bmRzLm1pbiwgdGhpcy5jZmcuYm91bmRzLm1heF0pO1xuICAgIH1cblxuICAgIGlmIChuZXh0TWluID4gbmV4dE1heCkge1xuICAgICAgY29uc3Qgc2lkZSA9IG9wdHMuY2hhbmdlZCA/PyAnYm90aCc7XG4gICAgICBpZiAoc2lkZSA9PT0gJ21pbicpIHtcbiAgICAgICAgLy8gQ2FsbGVyIHJhaXNlZCBtaW47IG1heCBmb2xsb3dzLlxuICAgICAgICBuZXh0TWF4ID0gbmV4dE1pbjtcbiAgICAgIH0gZWxzZSBpZiAoc2lkZSA9PT0gJ21heCcpIHtcbiAgICAgICAgLy8gQ2FsbGVyIGxvd2VyZWQgbWF4OyBtaW4gZm9sbG93cy5cbiAgICAgICAgbmV4dE1pbiA9IG5leHRNYXg7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAvLyBCb3RoIGNoYW5nZWQgc2ltdWx0YW5lb3VzbHkgXHUyMDE0IG5vcm1hbGl6ZSBzeW1tZXRyaWNhbGx5LlxuICAgICAgICBuZXh0TWluID0gTWF0aC5taW4obWluLCBtYXgpO1xuICAgICAgICBuZXh0TWF4ID0gTWF0aC5tYXgobWluLCBtYXgpO1xuICAgICAgfVxuICAgIH1cblxuICAgIHRoaXMubGFzdE1pbiA9IG5leHRNaW47XG4gICAgdGhpcy5sYXN0TWF4ID0gbmV4dE1heDtcblxuICAgIHRoaXMubWluSW5wdXQudmFsdWUgPSBTdHJpbmcobmV4dE1pbik7XG4gICAgdGhpcy5tYXhJbnB1dC52YWx1ZSA9IFN0cmluZyhuZXh0TWF4KTtcbiAgICB0aGlzLm1pblNsaWRlci52YWx1ZSA9IFN0cmluZyhNYXRoLnJvdW5kKHZhbHVlVG9Qb3NpdGlvbihuZXh0TWluLCB0aGlzLnN0b3BzKSAqIFBPU0lUSU9OX1JBTkdFKSk7XG4gICAgdGhpcy5tYXhTbGlkZXIudmFsdWUgPSBTdHJpbmcoTWF0aC5yb3VuZCh2YWx1ZVRvUG9zaXRpb24obmV4dE1heCwgdGhpcy5zdG9wcykgKiBQT1NJVElPTl9SQU5HRSkpO1xuXG4gICAgaWYgKHRoaXMucmFuZ2VSb290KSB7XG4gICAgICBjb25zdCBsbyA9IHZhbHVlVG9Qb3NpdGlvbihuZXh0TWluLCB0aGlzLnN0b3BzKSAqIDEwMDtcbiAgICAgIGNvbnN0IGhpID0gdmFsdWVUb1Bvc2l0aW9uKG5leHRNYXgsIHRoaXMuc3RvcHMpICogMTAwO1xuICAgICAgdGhpcy5yYW5nZVJvb3Quc3R5bGUuc2V0UHJvcGVydHkoJy0tbG8nLCBgJHtsb30lYCk7XG4gICAgICB0aGlzLnJhbmdlUm9vdC5zdHlsZS5zZXRQcm9wZXJ0eSgnLS1oaScsIGAke2hpfSVgKTtcbiAgICB9XG5cbiAgICBpZiAob3B0cy5maXJlT25DaGFuZ2UpIHRoaXMuY2ZnLm9uQ2hhbmdlKG5leHRNaW4sIG5leHRNYXgpO1xuICB9XG5cbiAgcHJpdmF0ZSByZW5kZXJUaWNrcygpOiB2b2lkIHtcbiAgICBpZiAoIXRoaXMuY2ZnLnRpY2tzQ29udGFpbmVySWQgfHwgIXRoaXMuY2ZnLnN0b3BzKSByZXR1cm47XG4gICAgY29uc3QgY29udGFpbmVyID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQodGhpcy5jZmcudGlja3NDb250YWluZXJJZCk7XG4gICAgaWYgKCFjb250YWluZXIpIHJldHVybjtcblxuICAgIGNvbnRhaW5lci5pbm5lckhUTUwgPSAnJztcbiAgICBmb3IgKGNvbnN0IHN0b3Agb2YgdGhpcy5jZmcuc3RvcHMpIHtcbiAgICAgIGNvbnN0IHBjdCA9IHZhbHVlVG9Qb3NpdGlvbihzdG9wLCB0aGlzLmNmZy5zdG9wcykgKiAxMDA7XG4gICAgICBjb25zdCB0aWNrID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gICAgICB0aWNrLmNsYXNzTmFtZSA9ICdsZC10aWNrJztcbiAgICAgIHRpY2suc3R5bGUubGVmdCA9IGAke3BjdH0lYDtcbiAgICAgIGNvbnN0IGxhYmVsID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnc3BhbicpO1xuICAgICAgbGFiZWwuY2xhc3NOYW1lID0gJ2xkLXRpY2stbGFiZWwnO1xuICAgICAgbGFiZWwuc3R5bGUubGVmdCA9IGAke3BjdH0lYDtcbiAgICAgIGxhYmVsLnRleHRDb250ZW50ID0gU3RyaW5nKHN0b3ApO1xuICAgICAgY29udGFpbmVyLmFwcGVuZENoaWxkKHRpY2spO1xuICAgICAgY29udGFpbmVyLmFwcGVuZENoaWxkKGxhYmVsKTtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIHdpcmVTdGVwcGVycygpOiB2b2lkIHtcbiAgICBpZiAoIXRoaXMuY29udGFpbmVyKSByZXR1cm47XG4gICAgY29uc3QgYnV0dG9ucyA9IHRoaXMuY29udGFpbmVyLnF1ZXJ5U2VsZWN0b3JBbGw8SFRNTEJ1dHRvbkVsZW1lbnQ+KCcubGQtc3RlcC1idG4nKTtcbiAgICBidXR0b25zLmZvckVhY2goKGJ0bikgPT4ge1xuICAgICAgY29uc3QgdGFyZ2V0ID0gYnRuLmRhdGFzZXQudGFyZ2V0IGFzICdtaW4nIHwgJ21heCcgfCB1bmRlZmluZWQ7XG4gICAgICBjb25zdCBhY3Rpb24gPSBidG4uZGF0YXNldC5hY3Rpb24gYXMgJ2luYycgfCAnZGVjJyB8IHVuZGVmaW5lZDtcbiAgICAgIGlmICghdGFyZ2V0IHx8ICFhY3Rpb24pIHJldHVybjtcbiAgICAgIGJ0bi5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsICgpID0+IHtcbiAgICAgICAgY29uc3QgZGVsdGEgPSBhY3Rpb24gPT09ICdpbmMnID8gMSA6IC0xO1xuICAgICAgICBpZiAodGFyZ2V0ID09PSAnbWluJykge1xuICAgICAgICAgIGNvbnN0IG5leHQgPSBjbGFtcFRvU3RvcHMoXG4gICAgICAgICAgICB0aGlzLmxhc3RNaW4gKyBkZWx0YSxcbiAgICAgICAgICAgIFt0aGlzLmNmZy5ib3VuZHMubWluLCB0aGlzLmNmZy5ib3VuZHMubWF4XVxuICAgICAgICAgICk7XG4gICAgICAgICAgdGhpcy5hcHBseVZhbHVlcyhuZXh0LCB0aGlzLmxhc3RNYXgsIHsgZmlyZU9uQ2hhbmdlOiB0cnVlLCBjaGFuZ2VkOiAnbWluJyB9KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBjb25zdCBuZXh0ID0gY2xhbXBUb1N0b3BzKFxuICAgICAgICAgICAgdGhpcy5sYXN0TWF4ICsgZGVsdGEsXG4gICAgICAgICAgICBbdGhpcy5jZmcuYm91bmRzLm1pbiwgdGhpcy5jZmcuYm91bmRzLm1heF1cbiAgICAgICAgICApO1xuICAgICAgICAgIHRoaXMuYXBwbHlWYWx1ZXModGhpcy5sYXN0TWluLCBuZXh0LCB7IGZpcmVPbkNoYW5nZTogdHJ1ZSwgY2hhbmdlZDogJ21heCcgfSk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH0pO1xuICB9XG59XG4iLCAiLyoqXG4gKiBQdXJlIGhlbHBlcnMgZm9yIHRoZSBMb2JieSBCb2FyZDogdGhlIGJvYXJkIGNvbHVtbnMsIHRoZSBjYXJkIG1vZGVsIGFuZCB0aGVcbiAqIHRpbWUgYmFkZ2UuIERPTSBidWlsZGluZyBsaXZlcyBpbiBMb2JieUJvYXJkVmlldy5cbiAqL1xuXG5pbXBvcnQgdHlwZSB7IExvYmJ5IH0gZnJvbSAnQC90eXBlcy9nYW1lJztcbmltcG9ydCB0eXBlIHsgUXVldWVTb3VyY2UgfSBmcm9tICcuL0xvYmJ5RGlzY292ZXJ5VHlwZXMnO1xuaW1wb3J0IHsgZ2V0TG9iYnlNYXBUaHVtYm5haWxVcmwsIGdldExvYmJ5UXVldWVTb3VyY2UsIGdldE1hcERpc3BsYXlOYW1lIH0gZnJvbSAnLi9Mb2JieURpc2NvdmVyeUhlbHBlcnMnO1xuXG4vKiogVGhlIGJvYXJkIGNvbHVtbnMsIGxlZnQgdG8gcmlnaHQuICovXG5leHBvcnQgY29uc3QgQk9BUkRfUVVFVUVTOiBSZWFkb25seUFycmF5PHsgcXVldWU6IFF1ZXVlU291cmNlOyBsYWJlbDogc3RyaW5nIH0+ID0gW1xuICB7IHF1ZXVlOiAnZmZhJywgbGFiZWw6ICdGRkEnIH0sXG4gIHsgcXVldWU6ICd0ZWFtJywgbGFiZWw6ICdUZWFtJyB9LFxuICB7IHF1ZXVlOiAnc3BlY2lhbCcsIGxhYmVsOiAnU3BlY2lhbCcgfSxcbiAgeyBxdWV1ZTogJ2hvc3RlZCcsIGxhYmVsOiAnSG9zdGVkJyB9LFxuXTtcblxuZXhwb3J0IHR5cGUgQm9hcmRCYWRnZSA9XG4gIC8qKiBBIGxpdmUgY291bnRkb3duIHRvIGB0YXJnZXRNc2AsIGEgdGltZXN0YW1wIG9uIHRoZSBmZWVkJ3MgY2xvY2suICovXG4gIHwgeyBraW5kOiAnY291bnRkb3duJzsgdGFyZ2V0TXM6IG51bWJlciB9XG4gIHwgeyBraW5kOiAndGV4dCc7IHRleHQ6IHN0cmluZyB9O1xuXG5leHBvcnQgaW50ZXJmYWNlIEJvYXJkQ2FyZE1vZGVsIHtcbiAgZ2FtZUlEOiBzdHJpbmc7XG4gIHF1ZXVlOiBRdWV1ZVNvdXJjZTtcbiAgLyoqIFplcm8gZm9yIHRoZSBmaXJzdCBsb2JieSBvZiBhIFF1ZXVlLiAqL1xuICBxdWV1ZVBvc2l0aW9uOiBudW1iZXI7XG4gIG1hcE5hbWU6IHN0cmluZztcbiAgdGh1bWJuYWlsVXJsOiBzdHJpbmcgfCBudWxsO1xuICBiYWRnZTogQm9hcmRCYWRnZTtcbn1cblxuLyoqIEdyb3VwcyB0aGUgbG9iYmllcyBieSBRdWV1ZSBhbmQga2VlcHMgdGhlIGZlZWQgb3JkZXIgaW5zaWRlIGVhY2ggUXVldWUuICovXG5leHBvcnQgZnVuY3Rpb24gZ3JvdXBMb2JiaWVzQnlRdWV1ZShsb2JiaWVzOiBMb2JieVtdKTogUmVjb3JkPFF1ZXVlU291cmNlLCBMb2JieVtdPiB7XG4gIGNvbnN0IHF1ZXVlczogUmVjb3JkPFF1ZXVlU291cmNlLCBMb2JieVtdPiA9IHsgZmZhOiBbXSwgdGVhbTogW10sIHNwZWNpYWw6IFtdLCBob3N0ZWQ6IFtdIH07XG4gIGZvciAoY29uc3QgbG9iYnkgb2YgbG9iYmllcykge1xuICAgIGNvbnN0IHF1ZXVlID0gZ2V0TG9iYnlRdWV1ZVNvdXJjZShsb2JieSk7XG4gICAgaWYgKHF1ZXVlKSBxdWV1ZXNbcXVldWVdLnB1c2gobG9iYnkpO1xuICB9XG4gIHJldHVybiBxdWV1ZXM7XG59XG5cbi8qKiBUaGUgcm93IGxhYmVsIG9mIGEgUXVldWUgUG9zaXRpb246IFwiTGl2ZVwiIGZvciB0aGUgZmlyc3QsIHRoZW4gXCIjMVwiLCBcIiMyXCIsIGFuZCBzbyBvbi4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRSb3dMYWJlbChxdWV1ZVBvc2l0aW9uOiBudW1iZXIpOiBzdHJpbmcge1xuICByZXR1cm4gcXVldWVQb3NpdGlvbiA9PT0gMCA/ICdMaXZlJyA6IGAjJHtxdWV1ZVBvc2l0aW9ufWA7XG59XG5cbi8qKiBGb3JtYXRzIGEgZHVyYXRpb24gYXMgXCJtOnNzXCIuIEEgbmVnYXRpdmUgZHVyYXRpb24gcmVhZHMgXCIwOjAwXCIuICovXG5leHBvcnQgZnVuY3Rpb24gZm9ybWF0Q291bnRkb3duKHJlbWFpbmluZ01zOiBudW1iZXIpOiBzdHJpbmcge1xuICBjb25zdCB0b3RhbFNlY29uZHMgPSBNYXRoLm1heCgwLCBNYXRoLmNlaWwocmVtYWluaW5nTXMgLyAxMDAwKSk7XG4gIGNvbnN0IG1pbnV0ZXMgPSBNYXRoLmZsb29yKHRvdGFsU2Vjb25kcyAvIDYwKTtcbiAgY29uc3Qgc2Vjb25kcyA9IHRvdGFsU2Vjb25kcyAlIDYwO1xuICByZXR1cm4gYCR7bWludXRlc306JHtTdHJpbmcoc2Vjb25kcykucGFkU3RhcnQoMiwgJzAnKX1gO1xufVxuXG4vKipcbiAqIEEgTGl2ZSBMb2JieSBjb3VudHMgZG93biB0byBgc3RhcnRzQXRgLiBBIEhvc3RlZCBMb2JieSBjb3VudHMgZG93biB0b1xuICogYGF1dG9TdGFydEF0YCB3aGVuIE9wZW5Gcm9udCBnaXZlcyBpdC4gQW55IG90aGVyIGxvYmJ5IHNob3dzIGl0cyBRdWV1ZVxuICogUG9zaXRpb24sIGJlY2F1c2UgaXQgYWxzbyBzdGFydHMgYXMgc29vbiBhcyBpdCBpcyBmdWxsLlxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0Qm9hcmRCYWRnZShsb2JieTogTG9iYnksIHF1ZXVlOiBRdWV1ZVNvdXJjZSwgcXVldWVQb3NpdGlvbjogbnVtYmVyKTogQm9hcmRCYWRnZSB7XG4gIGlmIChxdWV1ZSA9PT0gJ2hvc3RlZCcpIHtcbiAgICBpZiAodHlwZW9mIGxvYmJ5LmF1dG9TdGFydEF0ID09PSAnbnVtYmVyJykge1xuICAgICAgcmV0dXJuIHsga2luZDogJ2NvdW50ZG93bicsIHRhcmdldE1zOiBsb2JieS5hdXRvU3RhcnRBdCB9O1xuICAgIH1cbiAgfSBlbHNlIGlmIChxdWV1ZVBvc2l0aW9uID09PSAwKSB7XG4gICAgaWYgKHR5cGVvZiBsb2JieS5zdGFydHNBdCA9PT0gJ251bWJlcicpIHtcbiAgICAgIHJldHVybiB7IGtpbmQ6ICdjb3VudGRvd24nLCB0YXJnZXRNczogbG9iYnkuc3RhcnRzQXQgfTtcbiAgICB9XG4gICAgcmV0dXJuIHsga2luZDogJ3RleHQnLCB0ZXh0OiAnTGl2ZScgfTtcbiAgfVxuICByZXR1cm4geyBraW5kOiAndGV4dCcsIHRleHQ6IGBRdWV1ZSAke3F1ZXVlUG9zaXRpb259YCB9O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gYnVpbGRCb2FyZENhcmRNb2RlbChcbiAgbG9iYnk6IExvYmJ5LFxuICBxdWV1ZTogUXVldWVTb3VyY2UsXG4gIHF1ZXVlUG9zaXRpb246IG51bWJlcixcbiAgYXNzZXRNYW5pZmVzdD86IFJlY29yZDxzdHJpbmcsIHN0cmluZz4gfCBudWxsLFxuICBjZG5CYXNlPzogc3RyaW5nIHwgbnVsbFxuKTogQm9hcmRDYXJkTW9kZWwge1xuICByZXR1cm4ge1xuICAgIGdhbWVJRDogbG9iYnkuZ2FtZUlELFxuICAgIHF1ZXVlLFxuICAgIHF1ZXVlUG9zaXRpb24sXG4gICAgbWFwTmFtZTogZ2V0TWFwRGlzcGxheU5hbWUobG9iYnkuZ2FtZUNvbmZpZz8uZ2FtZU1hcD8udHJpbSgpIHx8ICdVbmtub3duIG1hcCcpLFxuICAgIHRodW1ibmFpbFVybDogZ2V0TG9iYnlNYXBUaHVtYm5haWxVcmwobG9iYnksIGFzc2V0TWFuaWZlc3QsIGNkbkJhc2UpLFxuICAgIGJhZGdlOiBnZXRCb2FyZEJhZGdlKGxvYmJ5LCBxdWV1ZSwgcXVldWVQb3NpdGlvbiksXG4gIH07XG59XG5cbi8qKiBcIjEgbG9iYnlcIiwgXCIzIGxvYmJpZXNcIi4gKi9cbmV4cG9ydCBmdW5jdGlvbiBmb3JtYXRMb2JieUNvdW50KGNvdW50OiBudW1iZXIpOiBzdHJpbmcge1xuICByZXR1cm4gYCR7Y291bnR9ICR7Y291bnQgPT09IDEgPyAnbG9iYnknIDogJ2xvYmJpZXMnfWA7XG59XG5cbi8qKiBcIjEgbWF0Y2hcIiwgXCIzIG1hdGNoZXNcIi4gKi9cbmV4cG9ydCBmdW5jdGlvbiBmb3JtYXRNYXRjaENvdW50KGNvdW50OiBudW1iZXIpOiBzdHJpbmcge1xuICByZXR1cm4gYCR7Y291bnR9ICR7Y291bnQgPT09IDEgPyAnbWF0Y2gnIDogJ21hdGNoZXMnfWA7XG59XG4iLCAiLyoqXG4gKiBMb2JieUJvYXJkVmlldyAtIHJlbmRlcnMgdGhlIExvYmJ5IEJvYXJkIGludG8gT3BlbkZyb250J3MgYGdhbWUtbW9kZS1zZWxlY3RvcmAuXG4gKlxuICogVGhlIGJvYXJkIGlzIGEgZ3JpZCB3aXRoIG9uZSBjb2x1bW4gcGVyIFF1ZXVlIGFuZCBvbmUgcm93IHBlciBRdWV1ZSBQb3NpdGlvbi5cbiAqIENhcmRzIHVwZGF0ZSBpbiBwbGFjZSwga2V5ZWQgYnkgYGdhbWVJRGAuXG4gKi9cblxuaW1wb3J0IHR5cGUgeyBMb2JieSB9IGZyb20gJ0AvdHlwZXMvZ2FtZSc7XG5pbXBvcnQgdHlwZSB7IFF1ZXVlU291cmNlIH0gZnJvbSAnLi9Mb2JieURpc2NvdmVyeVR5cGVzJztcbmltcG9ydCB7XG4gIEJPQVJEX1FVRVVFUyxcbiAgYnVpbGRCb2FyZENhcmRNb2RlbCxcbiAgZm9ybWF0Q291bnRkb3duLFxuICBmb3JtYXRMb2JieUNvdW50LFxuICBmb3JtYXRNYXRjaENvdW50LFxuICBnZXRSb3dMYWJlbCxcbiAgZ3JvdXBMb2JiaWVzQnlRdWV1ZSxcbiAgdHlwZSBCb2FyZENhcmRNb2RlbCxcbn0gZnJvbSAnLi9Mb2JieUJvYXJkSGVscGVycyc7XG5cbmV4cG9ydCBpbnRlcmZhY2UgTG9iYnlCb2FyZEFzc2V0cyB7XG4gIG1hbmlmZXN0OiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+IHwgbnVsbDtcbiAgY2RuQmFzZTogc3RyaW5nIHwgbnVsbDtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBMb2JieUJvYXJkT3B0aW9ucyB7XG4gIC8qKiBDYWxsZWQgZnJvbSBhIGNhcmQncyBjbGljayBoYW5kbGVyIG9ubHkuICovXG4gIG9uSm9pbjogKGdhbWVJRDogc3RyaW5nKSA9PiB2b2lkO1xuICBnZXRBc3NldHM6ICgpID0+IExvYmJ5Qm9hcmRBc3NldHM7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgTG9iYnlCb2FyZFN0YXRlIHtcbiAgbG9iYmllczogTG9iYnlbXTtcbiAgLyoqXG4gICAqIFRoZSBgZ2FtZUlEYCBvZiBldmVyeSBsb2JieSB0aGF0IG1hdGNoZXMgdGhlIENyaXRlcmlhLiBOdWxsIHdoaWxlIG5vXG4gICAqIENyaXRlcmlvbiBpcyBhY3RpdmU6IHRoZW4gbm8gY2FyZCBpcyBhIG1hdGNoIGFuZCBubyBjYXJkIGlzIGdyZXllZC5cbiAgICovXG4gIG1hdGNoZWRJZHM6IFNldDxzdHJpbmc+IHwgbnVsbDtcbiAgLyoqIE9mZnNldCB0byBhZGQgdG8gdGhlIGxvY2FsIGNsb2NrIHRvIGdldCB0aGUgZmVlZCdzIGNsb2NrLiAqL1xuICBjbG9ja09mZnNldE1zOiBudW1iZXI7XG59XG5cbmNvbnN0IEJPQVJEX0lEID0gJ29mLWxvYmJ5LWJvYXJkJztcbmNvbnN0IEdSSURfQ0xBU1NfTUFSS0VSID0gJ3NtOmdyaWQtY29scy1bMmZyXzFmcl0nO1xuXG5pbnRlcmZhY2UgU2F2ZWRTdHlsZSB7XG4gIGVsZW1lbnQ6IEhUTUxFbGVtZW50O1xuICBwcm9wZXJ0eTogc3RyaW5nO1xuICB2YWx1ZTogc3RyaW5nO1xufVxuXG5leHBvcnQgY2xhc3MgTG9iYnlCb2FyZFZpZXcge1xuICBwcml2YXRlIHJvb3Q6IEhUTUxEaXZFbGVtZW50IHwgbnVsbCA9IG51bGw7XG4gIHByaXZhdGUgcGFnZUdyaWQ6IEhUTUxFbGVtZW50IHwgbnVsbCA9IG51bGw7XG4gIC8vIElubGluZSBzdHlsZXMgb2YgT3BlbkZyb250J3Mgb3duIGVsZW1lbnRzLCBzYXZlZCBiZWZvcmUgdGhlIGJvYXJkIGNoYW5nZXMgdGhlbS5cbiAgcHJpdmF0ZSBzYXZlZFN0eWxlczogU2F2ZWRTdHlsZVtdID0gW107XG4gIHByaXZhdGUgY2xvY2tPZmZzZXRNcyA9IDA7XG4gIHByaXZhdGUgdGlja0ludGVydmFsOiBSZXR1cm5UeXBlPHR5cGVvZiBzZXRJbnRlcnZhbD4gfCBudWxsID0gbnVsbDtcbiAgcHJpdmF0ZSB0b3RhbHM6IEhUTUxFbGVtZW50IHwgbnVsbCA9IG51bGw7XG4gIHByaXZhdGUgZ3JpZDogSFRNTERpdkVsZW1lbnQgfCBudWxsID0gbnVsbDtcbiAgcHJpdmF0ZSByb3dDb3VudCA9IC0xO1xuICBwcml2YXRlIGNhcmRzID0gbmV3IE1hcDxzdHJpbmcsIEhUTUxCdXR0b25FbGVtZW50PigpO1xuICBwcml2YXRlIHNpZ25hdHVyZXMgPSBuZXcgTWFwPHN0cmluZywgc3RyaW5nPigpO1xuXG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgcmVhZG9ubHkgb3B0aW9uczogTG9iYnlCb2FyZE9wdGlvbnMpIHt9XG5cbiAgLyoqIFNob3dzIHRoZSBib2FyZCBpbiBwbGFjZSBvZiBPcGVuRnJvbnQncyBsb2JieSBjZWxscyBhbmQgZmlsbHMgaXQuIFNhZmUgdG8gY2FsbCBvbiBldmVyeSB1cGRhdGUuICovXG4gIHJlbmRlcihzdGF0ZTogTG9iYnlCb2FyZFN0YXRlKTogdm9pZCB7XG4gICAgY29uc3Qgcm9vdCA9IHRoaXMuZW5zdXJlTW91bnRlZCgpO1xuICAgIGlmICghcm9vdCB8fCAhdGhpcy5ncmlkKSByZXR1cm47XG4gICAgcm9vdC5zdHlsZS5kaXNwbGF5ID0gJyc7XG4gICAgdGhpcy50YWtlT3ZlclBhZ2UoKTtcbiAgICB0aGlzLmNsb2NrT2Zmc2V0TXMgPSBzdGF0ZS5jbG9ja09mZnNldE1zO1xuXG4gICAgY29uc3QgcXVldWVzID0gZ3JvdXBMb2JiaWVzQnlRdWV1ZShzdGF0ZS5sb2JiaWVzKTtcbiAgICBjb25zdCByb3dDb3VudCA9IE1hdGgubWF4KDAsIC4uLkJPQVJEX1FVRVVFUy5tYXAoKHsgcXVldWUgfSkgPT4gcXVldWVzW3F1ZXVlXS5sZW5ndGgpKTtcbiAgICBpZiAocm93Q291bnQgIT09IHRoaXMucm93Q291bnQpIHRoaXMuYnVpbGRHcmlkKHJvd0NvdW50KTtcblxuICAgIGNvbnN0IHsgbWFuaWZlc3QsIGNkbkJhc2UgfSA9IHRoaXMub3B0aW9ucy5nZXRBc3NldHMoKTtcbiAgICBjb25zdCBsaXZlSWRzID0gbmV3IFNldDxzdHJpbmc+KCk7XG4gICAgY29uc3QgeyBtYXRjaGVkSWRzIH0gPSBzdGF0ZTtcbiAgICBjb25zdCBjb3VudE1hdGNoZXMgPSAobG9iYmllczogTG9iYnlbXSk6IG51bWJlciA9PlxuICAgICAgbWF0Y2hlZElkcyA/IGxvYmJpZXMuZmlsdGVyKChsb2JieSkgPT4gbWF0Y2hlZElkcy5oYXMobG9iYnkuZ2FtZUlEKSkubGVuZ3RoIDogMDtcblxuICAgIGZvciAoY29uc3QgeyBxdWV1ZSB9IG9mIEJPQVJEX1FVRVVFUykge1xuICAgICAgdGhpcy5yZW5kZXJDb2x1bW5IZWFkKHF1ZXVlLCBxdWV1ZXNbcXVldWVdLmxlbmd0aCwgbWF0Y2hlZElkcyA/IGNvdW50TWF0Y2hlcyhxdWV1ZXNbcXVldWVdKSA6IG51bGwpO1xuICAgIH1cbiAgICBpZiAodGhpcy50b3RhbHMpIHtcbiAgICAgIGNvbnN0IHRvdGFsTG9iYmllcyA9IEJPQVJEX1FVRVVFUy5yZWR1Y2UoKHN1bSwgeyBxdWV1ZSB9KSA9PiBzdW0gKyBxdWV1ZXNbcXVldWVdLmxlbmd0aCwgMCk7XG4gICAgICBjb25zdCB0b3RhbE1hdGNoZXMgPSBCT0FSRF9RVUVVRVMucmVkdWNlKChzdW0sIHsgcXVldWUgfSkgPT4gc3VtICsgY291bnRNYXRjaGVzKHF1ZXVlc1txdWV1ZV0pLCAwKTtcbiAgICAgIHRoaXMudG90YWxzLnRleHRDb250ZW50ID0gYCR7Zm9ybWF0TWF0Y2hDb3VudCh0b3RhbE1hdGNoZXMpfSBcdTAwQjcgJHtmb3JtYXRMb2JieUNvdW50KHRvdGFsTG9iYmllcyl9YDtcbiAgICB9XG5cbiAgICBmb3IgKGNvbnN0IHsgcXVldWUgfSBvZiBCT0FSRF9RVUVVRVMpIHtcbiAgICAgIGZvciAobGV0IHJvdyA9IDA7IHJvdyA8IHJvd0NvdW50OyByb3crKykge1xuICAgICAgICBjb25zdCBjZWxsID0gdGhpcy5nZXRDZWxsKHF1ZXVlLCByb3cpO1xuICAgICAgICBjb25zdCBsb2JieSA9IHF1ZXVlc1txdWV1ZV1bcm93XTtcbiAgICAgICAgaWYgKCFjZWxsKSBjb250aW51ZTtcbiAgICAgICAgaWYgKCFsb2JieSkge1xuICAgICAgICAgIGlmICghY2VsbC5xdWVyeVNlbGVjdG9yKCcub2YtYm9hcmQtZW1wdHknKSkgY2VsbC5yZXBsYWNlQ2hpbGRyZW4odGhpcy5idWlsZEVtcHR5KCkpO1xuICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG4gICAgICAgIGxpdmVJZHMuYWRkKGxvYmJ5LmdhbWVJRCk7XG4gICAgICAgIGNvbnN0IG1vZGVsID0gYnVpbGRCb2FyZENhcmRNb2RlbChsb2JieSwgcXVldWUsIHJvdywgbWFuaWZlc3QsIGNkbkJhc2UpO1xuICAgICAgICBjb25zdCBjYXJkID0gdGhpcy5jYXJkcy5nZXQobG9iYnkuZ2FtZUlEKSA/PyB0aGlzLmNyZWF0ZUNhcmQobG9iYnkuZ2FtZUlEKTtcbiAgICAgICAgdGhpcy51cGRhdGVDYXJkKGNhcmQsIG1vZGVsKTtcbiAgICAgICAgY2FyZC5jbGFzc0xpc3QudG9nZ2xlKCdvZi1ib2FyZC1jYXJkLW1hdGNoJywgbWF0Y2hlZElkcz8uaGFzKGxvYmJ5LmdhbWVJRCkgPT09IHRydWUpO1xuICAgICAgICBjYXJkLmNsYXNzTGlzdC50b2dnbGUoJ29mLWJvYXJkLWNhcmQtZGltJywgbWF0Y2hlZElkcyAhPT0gbnVsbCAmJiAhbWF0Y2hlZElkcy5oYXMobG9iYnkuZ2FtZUlEKSk7XG4gICAgICAgIGlmIChjYXJkLnBhcmVudEVsZW1lbnQgIT09IGNlbGwpIGNlbGwucmVwbGFjZUNoaWxkcmVuKGNhcmQpO1xuICAgICAgfVxuICAgIH1cblxuICAgIGZvciAoY29uc3QgZ2FtZUlEIG9mIFsuLi50aGlzLmNhcmRzLmtleXMoKV0pIHtcbiAgICAgIGlmICghbGl2ZUlkcy5oYXMoZ2FtZUlEKSkge1xuICAgICAgICB0aGlzLmNhcmRzLmdldChnYW1lSUQpPy5yZW1vdmUoKTtcbiAgICAgICAgdGhpcy5jYXJkcy5kZWxldGUoZ2FtZUlEKTtcbiAgICAgICAgdGhpcy5zaWduYXR1cmVzLmRlbGV0ZShnYW1lSUQpO1xuICAgICAgfVxuICAgIH1cblxuICAgIHRoaXMudGlja0NvdW50ZG93bnMoKTtcbiAgICBpZiAoIXRoaXMudGlja0ludGVydmFsKSB7XG4gICAgICB0aGlzLnRpY2tJbnRlcnZhbCA9IHNldEludGVydmFsKCgpID0+IHRoaXMudGlja0NvdW50ZG93bnMoKSwgMTAwMCk7XG4gICAgfVxuICB9XG5cbiAgLyoqIEhpZGVzIHRoZSBib2FyZCBhbmQgZ2l2ZXMgT3BlbkZyb250J3MgbG9iYnkgYXJlYSBiYWNrIGFzIGl0IHdhcy4gKi9cbiAgaGlkZSgpOiB2b2lkIHtcbiAgICB0aGlzLnN0b3BUaWNraW5nKCk7XG4gICAgaWYgKHRoaXMucm9vdCkgdGhpcy5yb290LnN0eWxlLmRpc3BsYXkgPSAnbm9uZSc7XG4gICAgdGhpcy5yZXN0b3JlUGFnZSgpO1xuICB9XG5cbiAgZGlzcG9zZSgpOiB2b2lkIHtcbiAgICB0aGlzLnN0b3BUaWNraW5nKCk7XG4gICAgdGhpcy5yZXN0b3JlUGFnZSgpO1xuICAgIHRoaXMucm9vdD8ucmVtb3ZlKCk7XG4gICAgdGhpcy5yb290ID0gbnVsbDtcbiAgICB0aGlzLnBhZ2VHcmlkID0gbnVsbDtcbiAgICB0aGlzLnRvdGFscyA9IG51bGw7XG4gICAgdGhpcy5ncmlkID0gbnVsbDtcbiAgICB0aGlzLnJvd0NvdW50ID0gLTE7XG4gICAgdGhpcy5jYXJkcy5jbGVhcigpO1xuICAgIHRoaXMuc2lnbmF0dXJlcy5jbGVhcigpO1xuICB9XG5cbiAgLyoqXG4gICAqIEhpZGVzIHRoZSBsb2JieSBjZWxscywgbGV0cyB0aGUgYm9hcmQgdGFrZSBpdHMgb3duIGhlaWdodCBhbmQgbGlmdHMgdGhlXG4gICAqIGBvdmVyZmxvdy14OiBjbGlwYCBvZiB0aGUgcGFnZSBjb2x1bW4gc28gdGhlIGJvYXJkIGNhbiB1c2UgdGhlIGZ1bGwgd2lkdGguXG4gICAqL1xuICBwcml2YXRlIHRha2VPdmVyUGFnZSgpOiB2b2lkIHtcbiAgICBjb25zdCBwYWdlR3JpZCA9IHRoaXMucGFnZUdyaWQ7XG4gICAgaWYgKCFwYWdlR3JpZCkgcmV0dXJuO1xuXG4gICAgZm9yIChjb25zdCBjaGlsZCBvZiBBcnJheS5mcm9tKHBhZ2VHcmlkLmNoaWxkcmVuKSBhcyBIVE1MRWxlbWVudFtdKSB7XG4gICAgICBpZiAoY2hpbGQgIT09IHRoaXMucm9vdCAmJiB0aGlzLmlzTG9iYnlDZWxsKGNoaWxkKSkgdGhpcy5zZXRTdHlsZShjaGlsZCwgJ2Rpc3BsYXknLCAnbm9uZScpO1xuICAgIH1cbiAgICAvLyBPcGVuRnJvbnQgZ2l2ZXMgdGhlIGxvYmJ5IHJvdyBhIGZpeGVkIGhlaWdodC5cbiAgICB0aGlzLnNldFN0eWxlKHBhZ2VHcmlkLCAnZ3JpZC10ZW1wbGF0ZS1yb3dzJywgJ2F1dG8nKTtcblxuICAgIGZvciAoXG4gICAgICBsZXQgYW5jZXN0b3IgPSBwYWdlR3JpZC5wYXJlbnRFbGVtZW50O1xuICAgICAgYW5jZXN0b3IgJiYgYW5jZXN0b3IgIT09IGRvY3VtZW50LmRvY3VtZW50RWxlbWVudDtcbiAgICAgIGFuY2VzdG9yID0gYW5jZXN0b3IucGFyZW50RWxlbWVudFxuICAgICkge1xuICAgICAgaWYgKGdldENvbXB1dGVkU3R5bGUoYW5jZXN0b3IpLm92ZXJmbG93WCA9PT0gJ2NsaXAnKSB7XG4gICAgICAgIHRoaXMuc2V0U3R5bGUoYW5jZXN0b3IsICdvdmVyZmxvdy14JywgJ3Zpc2libGUnKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICAvKiogVGhlIEZGQSBjZWxsLCBhbmQgdGhlIHNlY3Rpb24gd2l0aCB0aGUgVGVhbSBjYXJkLCB0aGUgU3BlY2lhbCBjYXJkIGFuZCB0aGUgXCJTZWUgYWxsXCIgaGVhZGluZy4gKi9cbiAgcHJpdmF0ZSBpc0xvYmJ5Q2VsbChlbGVtZW50OiBIVE1MRWxlbWVudCk6IGJvb2xlYW4ge1xuICAgIHJldHVybiAoXG4gICAgICBlbGVtZW50LnRhZ05hbWUgPT09ICdTRUNUSU9OJyB8fFxuICAgICAgKGVsZW1lbnQuY2xhc3NOYW1lLmluY2x1ZGVzKCdzbTpjb2wtc3RhcnQtMScpICYmIGVsZW1lbnQuY2xhc3NOYW1lLmluY2x1ZGVzKCdzbTpyb3ctc3RhcnQtMicpKVxuICAgICk7XG4gIH1cblxuICBwcml2YXRlIHNldFN0eWxlKGVsZW1lbnQ6IEhUTUxFbGVtZW50LCBwcm9wZXJ0eTogc3RyaW5nLCB2YWx1ZTogc3RyaW5nKTogdm9pZCB7XG4gICAgaWYgKCF0aGlzLnNhdmVkU3R5bGVzLnNvbWUoKHNhdmVkKSA9PiBzYXZlZC5lbGVtZW50ID09PSBlbGVtZW50ICYmIHNhdmVkLnByb3BlcnR5ID09PSBwcm9wZXJ0eSkpIHtcbiAgICAgIHRoaXMuc2F2ZWRTdHlsZXMucHVzaCh7IGVsZW1lbnQsIHByb3BlcnR5LCB2YWx1ZTogZWxlbWVudC5zdHlsZS5nZXRQcm9wZXJ0eVZhbHVlKHByb3BlcnR5KSB9KTtcbiAgICB9XG4gICAgZWxlbWVudC5zdHlsZS5zZXRQcm9wZXJ0eShwcm9wZXJ0eSwgdmFsdWUpO1xuICB9XG5cbiAgcHJpdmF0ZSByZXN0b3JlUGFnZSgpOiB2b2lkIHtcbiAgICBmb3IgKGNvbnN0IHsgZWxlbWVudCwgcHJvcGVydHksIHZhbHVlIH0gb2YgdGhpcy5zYXZlZFN0eWxlcykge1xuICAgICAgaWYgKHZhbHVlKSBlbGVtZW50LnN0eWxlLnNldFByb3BlcnR5KHByb3BlcnR5LCB2YWx1ZSk7XG4gICAgICBlbHNlIGVsZW1lbnQuc3R5bGUucmVtb3ZlUHJvcGVydHkocHJvcGVydHkpO1xuICAgICAgaWYgKGVsZW1lbnQuZ2V0QXR0cmlidXRlKCdzdHlsZScpID09PSAnJykgZWxlbWVudC5yZW1vdmVBdHRyaWJ1dGUoJ3N0eWxlJyk7XG4gICAgfVxuICAgIHRoaXMuc2F2ZWRTdHlsZXMgPSBbXTtcbiAgfVxuXG4gIHByaXZhdGUgc3RvcFRpY2tpbmcoKTogdm9pZCB7XG4gICAgaWYgKHRoaXMudGlja0ludGVydmFsKSBjbGVhckludGVydmFsKHRoaXMudGlja0ludGVydmFsKTtcbiAgICB0aGlzLnRpY2tJbnRlcnZhbCA9IG51bGw7XG4gIH1cblxuICAvKiogVXBkYXRlcyB0aGUgdGV4dCBvZiBldmVyeSBjb3VudGRvd24gYmFkZ2UuIEl0IGRvZXMgbm90IHJlYnVpbGQgYW55IGNhcmQuICovXG4gIHByaXZhdGUgdGlja0NvdW50ZG93bnMoKTogdm9pZCB7XG4gICAgY29uc3Qgbm93ID0gRGF0ZS5ub3coKSArIHRoaXMuY2xvY2tPZmZzZXRNcztcbiAgICBmb3IgKGNvbnN0IGJhZGdlIG9mIEFycmF5LmZyb20oXG4gICAgICB0aGlzLmdyaWQ/LnF1ZXJ5U2VsZWN0b3JBbGw8SFRNTEVsZW1lbnQ+KCcub2YtYm9hcmQtYmFkZ2VbZGF0YS1jb3VudGRvd24tdG9dJykgPz8gW11cbiAgICApKSB7XG4gICAgICBjb25zdCB0ZXh0ID0gZm9ybWF0Q291bnRkb3duKE51bWJlcihiYWRnZS5kYXRhc2V0LmNvdW50ZG93blRvKSAtIG5vdyk7XG4gICAgICBpZiAoYmFkZ2UudGV4dENvbnRlbnQgIT09IHRleHQpIGJhZGdlLnRleHRDb250ZW50ID0gdGV4dDtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIGdldENlbGwocXVldWU6IFF1ZXVlU291cmNlLCByb3c6IG51bWJlcik6IEhUTUxFbGVtZW50IHwgbnVsbCB7XG4gICAgcmV0dXJuIChcbiAgICAgIHRoaXMuZ3JpZD8ucXVlcnlTZWxlY3RvcihgLm9mLWJvYXJkLWNlbGxbZGF0YS1xdWV1ZT1cIiR7cXVldWV9XCJdW2RhdGEtcm93PVwiJHtyb3d9XCJdYCkgPz8gbnVsbFxuICAgICk7XG4gIH1cblxuICAvKiogRmluZHMgdGhlIGdyaWQgb2YgT3BlbkZyb250J3MgaG9tZSBwYWdlIGFuZCBwdXRzIHRoZSBib2FyZCBiZWZvcmUgaXRzIGZpcnN0IGNoaWxkLiAqL1xuICBwcml2YXRlIGVuc3VyZU1vdW50ZWQoKTogSFRNTERpdkVsZW1lbnQgfCBudWxsIHtcbiAgICBpZiAodGhpcy5yb290Py5pc0Nvbm5lY3RlZCkgcmV0dXJuIHRoaXMucm9vdDtcblxuICAgIGNvbnN0IHNlbGVjdG9yID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignZ2FtZS1tb2RlLXNlbGVjdG9yJyk7XG4gICAgY29uc3QgcGFnZUdyaWQgPSBzZWxlY3RvclxuICAgICAgPyBBcnJheS5mcm9tKHNlbGVjdG9yLnF1ZXJ5U2VsZWN0b3JBbGwoJ2RpdicpKS5maW5kKChlbCkgPT5cbiAgICAgICAgICBlbC5jbGFzc05hbWUuaW5jbHVkZXMoR1JJRF9DTEFTU19NQVJLRVIpXG4gICAgICAgIClcbiAgICAgIDogbnVsbDtcbiAgICBpZiAoIXBhZ2VHcmlkKSByZXR1cm4gbnVsbDtcblxuICAgIGNvbnN0IHJvb3QgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgICByb290LmlkID0gQk9BUkRfSUQ7XG4gICAgcm9vdC5jbGFzc05hbWUgPSAnb2YtYm9hcmQnO1xuICAgIGNvbnN0IGhlYWQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgICBoZWFkLmNsYXNzTmFtZSA9ICdvZi1ib2FyZC1oZWFkJztcbiAgICBjb25zdCB0aXRsZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3NwYW4nKTtcbiAgICB0aXRsZS5jbGFzc05hbWUgPSAnb2YtYm9hcmQtdGl0bGUnO1xuICAgIHRpdGxlLnRleHRDb250ZW50ID0gJ0xvYmJ5IEJvYXJkJztcbiAgICBjb25zdCB0b3RhbHMgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdzcGFuJyk7XG4gICAgdG90YWxzLmNsYXNzTmFtZSA9ICdvZi1ib2FyZC10b3RhbHMnO1xuICAgIGhlYWQuYXBwZW5kKHRpdGxlLCB0b3RhbHMpO1xuICAgIGNvbnN0IGdyaWQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgICBncmlkLmNsYXNzTmFtZSA9ICdvZi1ib2FyZC1ncmlkJztcbiAgICByb290LmFwcGVuZChoZWFkLCBncmlkKTtcbiAgICBwYWdlR3JpZC5pbnNlcnRCZWZvcmUocm9vdCwgcGFnZUdyaWQuZmlyc3RDaGlsZCk7XG5cbiAgICB0aGlzLnJvb3QgPSByb290O1xuICAgIHRoaXMucGFnZUdyaWQgPSBwYWdlR3JpZDtcbiAgICB0aGlzLnRvdGFscyA9IHRvdGFscztcbiAgICB0aGlzLmdyaWQgPSBncmlkO1xuICAgIHRoaXMucm93Q291bnQgPSAtMTtcbiAgICByZXR1cm4gcm9vdDtcbiAgfVxuXG4gIHByaXZhdGUgYnVpbGRHcmlkKHJvd0NvdW50OiBudW1iZXIpOiB2b2lkIHtcbiAgICBjb25zdCBncmlkID0gdGhpcy5ncmlkITtcbiAgICBjb25zdCBjaGlsZHJlbjogSFRNTEVsZW1lbnRbXSA9IFtkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKV07XG4gICAgZm9yIChjb25zdCB7IHF1ZXVlLCBsYWJlbCB9IG9mIEJPQVJEX1FVRVVFUykge1xuICAgICAgY29uc3QgaGVhZCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICAgICAgaGVhZC5jbGFzc05hbWUgPSAnb2YtYm9hcmQtY29saGVhZCc7XG4gICAgICBoZWFkLmRhdGFzZXQucXVldWUgPSBxdWV1ZTtcbiAgICAgIGhlYWQuYXBwZW5kKGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2InKSwgZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnc3BhbicpLCBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdlbScpKTtcbiAgICAgIGhlYWQuZmlyc3RFbGVtZW50Q2hpbGQhLnRleHRDb250ZW50ID0gbGFiZWw7XG4gICAgICBjaGlsZHJlbi5wdXNoKGhlYWQpO1xuICAgIH1cbiAgICBmb3IgKGxldCByb3cgPSAwOyByb3cgPCByb3dDb3VudDsgcm93KyspIHtcbiAgICAgIGNvbnN0IHJvd0xhYmVsID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gICAgICByb3dMYWJlbC5jbGFzc05hbWUgPSBgb2YtYm9hcmQtcm93bGFiZWwke3JvdyA9PT0gMCA/ICcgb2YtYm9hcmQtcm93bGFiZWwtbGl2ZScgOiAnJ31gO1xuICAgICAgcm93TGFiZWwudGV4dENvbnRlbnQgPSBnZXRSb3dMYWJlbChyb3cpO1xuICAgICAgY2hpbGRyZW4ucHVzaChyb3dMYWJlbCk7XG4gICAgICBmb3IgKGNvbnN0IHsgcXVldWUgfSBvZiBCT0FSRF9RVUVVRVMpIHtcbiAgICAgICAgY29uc3QgY2VsbCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICAgICAgICBjZWxsLmNsYXNzTmFtZSA9ICdvZi1ib2FyZC1jZWxsJztcbiAgICAgICAgY2VsbC5kYXRhc2V0LnF1ZXVlID0gcXVldWU7XG4gICAgICAgIGNlbGwuZGF0YXNldC5yb3cgPSBTdHJpbmcocm93KTtcbiAgICAgICAgY2hpbGRyZW4ucHVzaChjZWxsKTtcbiAgICAgIH1cbiAgICB9XG4gICAgZ3JpZC5yZXBsYWNlQ2hpbGRyZW4oLi4uY2hpbGRyZW4pO1xuICAgIHRoaXMucm93Q291bnQgPSByb3dDb3VudDtcbiAgfVxuXG4gIHByaXZhdGUgcmVuZGVyQ29sdW1uSGVhZChcbiAgICBxdWV1ZTogUXVldWVTb3VyY2UsXG4gICAgbG9iYnlDb3VudDogbnVtYmVyLFxuICAgIG1hdGNoQ291bnQ6IG51bWJlciB8IG51bGxcbiAgKTogdm9pZCB7XG4gICAgY29uc3QgaGVhZCA9IHRoaXMuZ3JpZD8ucXVlcnlTZWxlY3RvcihgLm9mLWJvYXJkLWNvbGhlYWRbZGF0YS1xdWV1ZT1cIiR7cXVldWV9XCJdYCk7XG4gICAgaWYgKCFoZWFkKSByZXR1cm47XG4gICAgY29uc3QgWywgY291bnQsIG1hdGNoZXNdID0gQXJyYXkuZnJvbShoZWFkLmNoaWxkcmVuKTtcbiAgICBjb3VudCEudGV4dENvbnRlbnQgPSBmb3JtYXRMb2JieUNvdW50KGxvYmJ5Q291bnQpO1xuICAgIG1hdGNoZXMhLnRleHRDb250ZW50ID0gbWF0Y2hDb3VudCA/IGBcdTAwQjcgJHtmb3JtYXRNYXRjaENvdW50KG1hdGNoQ291bnQpfWAgOiAnJztcbiAgfVxuXG4gIHByaXZhdGUgYnVpbGRFbXB0eSgpOiBIVE1MRWxlbWVudCB7XG4gICAgY29uc3QgZW1wdHkgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgICBlbXB0eS5jbGFzc05hbWUgPSAnb2YtYm9hcmQtZW1wdHknO1xuICAgIHJldHVybiBlbXB0eTtcbiAgfVxuXG4gIHByaXZhdGUgY3JlYXRlQ2FyZChnYW1lSUQ6IHN0cmluZyk6IEhUTUxCdXR0b25FbGVtZW50IHtcbiAgICBjb25zdCBjYXJkID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnYnV0dG9uJyk7XG4gICAgY2FyZC50eXBlID0gJ2J1dHRvbic7XG4gICAgY2FyZC5jbGFzc05hbWUgPSAnb2YtYm9hcmQtY2FyZCc7XG4gICAgY2FyZC5kYXRhc2V0LmdhbWVJZCA9IGdhbWVJRDtcbiAgICAvLyBOYXZpZ2F0aW9uIGhhcHBlbnMgb25seSBmcm9tIHRoaXMgcmVhbCBjbGljaywgbmV2ZXIgZnJvbSBhIGZlZWQgdXBkYXRlIG9yIGEgdGltZXIuXG4gICAgY2FyZC5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsICgpID0+IHRoaXMub3B0aW9ucy5vbkpvaW4oZ2FtZUlEKSk7XG4gICAgdGhpcy5jYXJkcy5zZXQoZ2FtZUlELCBjYXJkKTtcbiAgICByZXR1cm4gY2FyZDtcbiAgfVxuXG4gIHByaXZhdGUgdXBkYXRlQ2FyZChjYXJkOiBIVE1MQnV0dG9uRWxlbWVudCwgbW9kZWw6IEJvYXJkQ2FyZE1vZGVsKTogdm9pZCB7XG4gICAgY29uc3Qgc2lnbmF0dXJlID0gSlNPTi5zdHJpbmdpZnkoW21vZGVsLm1hcE5hbWUsIG1vZGVsLnRodW1ibmFpbFVybCwgbW9kZWwuYmFkZ2VdKTtcbiAgICBpZiAodGhpcy5zaWduYXR1cmVzLmdldChtb2RlbC5nYW1lSUQpID09PSBzaWduYXR1cmUpIHJldHVybjtcbiAgICB0aGlzLnNpZ25hdHVyZXMuc2V0KG1vZGVsLmdhbWVJRCwgc2lnbmF0dXJlKTtcblxuICAgIGNvbnN0IHRodW1iID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnc3BhbicpO1xuICAgIHRodW1iLmNsYXNzTmFtZSA9ICdvZi1ib2FyZC10aHVtYic7XG4gICAgaWYgKG1vZGVsLnRodW1ibmFpbFVybCkge1xuICAgICAgY29uc3QgaW1nID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnaW1nJyk7XG4gICAgICBpbWcuc3JjID0gbW9kZWwudGh1bWJuYWlsVXJsO1xuICAgICAgaW1nLmFsdCA9ICcnO1xuICAgICAgaW1nLmxvYWRpbmcgPSAnbGF6eSc7XG4gICAgICB0aHVtYi5hcHBlbmQoaW1nKTtcbiAgICB9XG5cbiAgICBjb25zdCBiYWRnZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3NwYW4nKTtcbiAgICBiYWRnZS5jbGFzc05hbWUgPSAnb2YtYm9hcmQtYmFkZ2UnO1xuICAgIGlmIChtb2RlbC5iYWRnZS5raW5kID09PSAnY291bnRkb3duJykge1xuICAgICAgLy8gVGhlIHRleHQgaXMgc2V0IGJ5IHRpY2tDb3VudGRvd25zLCB3aGljaCBrbm93cyB0aGUgY2xvY2sgb2Zmc2V0LlxuICAgICAgYmFkZ2UuZGF0YXNldC5jb3VudGRvd25UbyA9IFN0cmluZyhtb2RlbC5iYWRnZS50YXJnZXRNcyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGJhZGdlLnRleHRDb250ZW50ID0gbW9kZWwuYmFkZ2UudGV4dDtcbiAgICB9XG5cbiAgICBjb25zdCBuYW1lID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnc3BhbicpO1xuICAgIG5hbWUuY2xhc3NOYW1lID0gJ29mLWJvYXJkLW1hcCc7XG4gICAgbmFtZS50ZXh0Q29udGVudCA9IG1vZGVsLm1hcE5hbWU7XG5cbiAgICBjYXJkLnNldEF0dHJpYnV0ZSgnYXJpYS1sYWJlbCcsIGBPcGVuICR7bW9kZWwubWFwTmFtZX0gaW4gT3BlbkZyb250J3Mgam9pbiBtb2RhbGApO1xuICAgIGNhcmQucmVwbGFjZUNoaWxkcmVuKHRodW1iLCBiYWRnZSwgbmFtZSk7XG4gIH1cbn1cbiIsICIvKipcbiAqIExvYmJ5RGlzY292ZXJ5VUkgLSBub3RpZnktb25seSBkaXNjb3ZlcnkgaW50ZXJmYWNlIGZvciBtYXRjaGluZyBsb2JiaWVzLlxuICovXG5cbmltcG9ydCB7IFNUT1JBR0VfS0VZUywgVEVBTV9QTEFZRVJTX1BFUl9URUFNX1NUT1BTLCBURUFNX01JTl9QTEFZRVJTX1BFUl9URUFNLCBURUFNX01BWF9QTEFZRVJTX1BFUl9URUFNIH0gZnJvbSAnQC9jb25maWcvY29uc3RhbnRzJztcbmltcG9ydCB7IExvYmJ5VXRpbHMgfSBmcm9tICdAL3V0aWxzL0xvYmJ5VXRpbHMnO1xuaW1wb3J0IHsgQnJvd3Nlck5vdGlmaWNhdGlvblV0aWxzIH0gZnJvbSAnQC91dGlscy9Ccm93c2VyTm90aWZpY2F0aW9uVXRpbHMnO1xuaW1wb3J0IHsgU291bmRVdGlscyB9IGZyb20gJ0AvdXRpbHMvU291bmRVdGlscyc7XG5pbXBvcnQgeyBVUkxPYnNlcnZlciB9IGZyb20gJ0AvdXRpbHMvVVJMT2JzZXJ2ZXInO1xuaW1wb3J0IHR5cGUgeyBMb2JieSB9IGZyb20gJ0AvdHlwZXMvZ2FtZSc7XG5pbXBvcnQgdHlwZSB7XG4gIERpc2NvdmVyeUNyaXRlcmlhLFxuICBMb2JieURpc2NvdmVyeVNldHRpbmdzLFxuICBNYXBGaWx0ZXIsXG4gIE1vZGlmaWVyRmlsdGVycyxcbiAgTW9kaWZpZXJGaWx0ZXJTdGF0ZSxcbiAgUXVldWVTb3VyY2UsXG4gIFRlYW1Db3VudCxcbn0gZnJvbSAnLi9Mb2JieURpc2NvdmVyeVR5cGVzJztcbmltcG9ydCB7IExvYmJ5RGlzY292ZXJ5RW5naW5lIH0gZnJvbSAnLi9Mb2JieURpc2NvdmVyeUVuZ2luZSc7XG5pbXBvcnQgdHlwZSB7IFVwY29taW5nQ2FyZE1vZGVsIH0gZnJvbSAnLi9Mb2JieURpc2NvdmVyeUhlbHBlcnMnO1xuaW1wb3J0IHtcbiAgYnVpbGRVcGNvbWluZ0NhcmRNb2RlbCxcbiAgZm9ybWF0RWxhcHNlZFNpbmNlLFxuICBnZXRCcm93c2VyTm90aWZpY2F0aW9uQ29udGVudCxcbiAgZ2V0R2FtZURldGFpbHNUZXh0LFxuICBnZXRMb2JieVF1ZXVlU291cmNlLFxuICBpc0hvc3RDb25maWd1cmVkTG9iYnksXG4gIG5vcm1hbGl6ZVNldHRpbmdzLFxufSBmcm9tICcuL0xvYmJ5RGlzY292ZXJ5SGVscGVycyc7XG5pbXBvcnQgeyBSYW5nZVNsaWRlciB9IGZyb20gJ0AvbW9kdWxlcy9sb2JieS1kaXNjb3ZlcnkvUmFuZ2VTbGlkZXInO1xuaW1wb3J0IHsgTG9iYnlCb2FyZFZpZXcgfSBmcm9tICcuL0xvYmJ5Qm9hcmRWaWV3JztcbmltcG9ydCB7XG4gIE1BUF9DQVRBTE9HVUUsXG4gIE1BUF9DQVRFR09SWV9MQUJFTFMsXG4gIE1BUF9DQVRFR09SWV9PUkRFUixcbiAgdHlwZSBNYXBDYXRlZ29yeSxcbn0gZnJvbSAnQC9jb25maWcvbWFwQ2F0YWxvZ3VlJztcblxuY29uc3QgU1RBUlRJTkdfR09MRF9WQUxVRVMgPSBbMV8wMDBfMDAwLCA1XzAwMF8wMDAsIDI1XzAwMF8wMDBdIGFzIGNvbnN0O1xuY29uc3QgR09MRF9NVUxUSVBMSUVSX1ZBTFVFUyA9IFsyXSBhcyBjb25zdDtcblxuY29uc3QgTU9ESUZJRVJfQk9PTEVBTl9JRFMgPSBbXG4gICdtb2RpZmllci1pc0NvbXBhY3QnLFxuICAnbW9kaWZpZXItaXNSYW5kb21TcGF3bicsXG4gICdtb2RpZmllci1pc0Nyb3dkZWQnLFxuICAnbW9kaWZpZXItaXNIYXJkTmF0aW9ucycsXG4gICdtb2RpZmllci1pc0FsbGlhbmNlc0Rpc2FibGVkJyxcbiAgJ21vZGlmaWVyLWlzTnVrZXNEaXNhYmxlZCcsXG4gICdtb2RpZmllci1pc1NBTXNEaXNhYmxlZCcsXG4gICdtb2RpZmllci1pc1BlYWNlVGltZScsXG4gICdtb2RpZmllci1pc1dhdGVyTnVrZXMnLFxuICAnbW9kaWZpZXItaXNEb29tc2RheUNsb2NrJyxcbiAgJ21vZGlmaWVyLWlzVHJ1c3RlZCcsXG5dIGFzIGNvbnN0O1xuXG5jb25zdCBURUFNX1BSRVNFVF9JRFM6IEFycmF5PFtzdHJpbmcsIHN0cmluZywgbnVtYmVyIHwgbnVsbF0+ID0gW1xuICBbJ2Rpc2NvdmVyeS10ZWFtLWh2bicsICdIdW1hbnMgVnMgTmF0aW9ucycsIG51bGxdLFxuXTtcblxuY29uc3QgVEVBTV9DT1VOVF9JRFM6IEFycmF5PFtzdHJpbmcsIHN0cmluZ10+ID0gW1xuICBbJ2Rpc2NvdmVyeS10ZWFtLTInLCAnMiddLFxuICBbJ2Rpc2NvdmVyeS10ZWFtLTMnLCAnMyddLFxuICBbJ2Rpc2NvdmVyeS10ZWFtLTQnLCAnNCddLFxuICBbJ2Rpc2NvdmVyeS10ZWFtLTUnLCAnNSddLFxuICBbJ2Rpc2NvdmVyeS10ZWFtLTYnLCAnNiddLFxuICBbJ2Rpc2NvdmVyeS10ZWFtLTcnLCAnNyddLFxuICBbJ2Rpc2NvdmVyeS10ZWFtLThwbHVzJywgJzgrJ10sXG5dO1xuXG5jb25zdCBBTExfVEVBTV9JRFM6IHN0cmluZ1tdID0gW1xuICAuLi5URUFNX1BSRVNFVF9JRFMubWFwKChbaWRdKSA9PiBpZCksXG4gIC4uLlRFQU1fQ09VTlRfSURTLm1hcCgoW2lkXSkgPT4gaWQpLFxuXTtcblxuZnVuY3Rpb24gaXNEZWJ1Z0VuYWJsZWQoKTogYm9vbGVhbiB7XG4gIHRyeSB7XG4gICAgaWYgKHR5cGVvZiB1bnNhZmVXaW5kb3cgIT09ICd1bmRlZmluZWQnICYmIHVuc2FmZVdpbmRvdy5fX09GX0RFQlVHX0RJU0NPVkVSWSA9PT0gdHJ1ZSkge1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICB9IGNhdGNoIHtcbiAgICAvLyB1bnNhZmVXaW5kb3cgbm90IGdyYW50ZWQgXHUyMDE0IGZhbGwgdGhyb3VnaFxuICB9XG4gIGlmICgoZ2xvYmFsVGhpcyBhcyB7IF9fT0ZfREVCVUdfRElTQ09WRVJZPzogYm9vbGVhbiB9KS5fX09GX0RFQlVHX0RJU0NPVkVSWSA9PT0gdHJ1ZSkge1xuICAgIHJldHVybiB0cnVlO1xuICB9XG4gIHRyeSB7XG4gICAgaWYgKHR5cGVvZiBsb2NhbFN0b3JhZ2UgIT09ICd1bmRlZmluZWQnICYmIGxvY2FsU3RvcmFnZS5nZXRJdGVtKCdfX09GX0RFQlVHX0RJU0NPVkVSWScpID09PSAndHJ1ZScpIHtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgfSBjYXRjaCB7XG4gICAgLy8gbG9jYWxTdG9yYWdlIG1heSB0aHJvdyBpbiBwcml2YWN5IG1vZGVzIFx1MjAxNCBmYWxsIHRocm91Z2hcbiAgfVxuICByZXR1cm4gZmFsc2U7XG59XG5cbmludGVyZmFjZSBMb2JieVNsb3Qge1xuICBsaXZlPzogTG9iYnk7XG4gIHVwY29taW5nPzogTG9iYnk7XG59XG5cbmludGVyZmFjZSBEaXNjb3ZlcnlNYXRjaCB7XG4gIGxvYmJ5OiBMb2JieTtcbiAgcXVldWU6IFF1ZXVlU291cmNlO1xuICAvLyBPbmx5IHRoZSBTZWUgQWxsIFZpZXcgc2hvd3MgdGhpcyBsb2JieTogaXQgaXMgcGFzdCBpbmRleCAxIG9yIGluIHRoZSBIb3N0ZWQgUXVldWUuXG4gIHNlZUFsbE9ubHk6IGJvb2xlYW47XG59XG5cbmNvbnN0IFBBTkVMX1NFQ1RJT05TID0gWydtb2RlcycsICdtb2RpZmllcnMnLCAnbWFwcycsICdsb2JiaWVzJ10gYXMgY29uc3Q7XG50eXBlIFBhbmVsU2VjdGlvbiA9ICh0eXBlb2YgUEFORUxfU0VDVElPTlMpW251bWJlcl07XG5jb25zdCBERUZBVUxUX0NPTExBUFNFRF9TRUNUSU9OUzogUmVjb3JkPFBhbmVsU2VjdGlvbiwgYm9vbGVhbj4gPSB7XG4gIG1vZGVzOiBmYWxzZSxcbiAgbW9kaWZpZXJzOiBmYWxzZSxcbiAgbWFwczogdHJ1ZSxcbiAgbG9iYmllczogZmFsc2UsXG59O1xuXG5mdW5jdGlvbiBsb2FkQ29sbGFwc2VkU2VjdGlvbnMoKTogUmVjb3JkPFBhbmVsU2VjdGlvbiwgYm9vbGVhbj4ge1xuICBjb25zdCBzYXZlZCA9IEdNX2dldFZhbHVlPFBhcnRpYWw8UmVjb3JkPFBhbmVsU2VjdGlvbiwgdW5rbm93bj4+IHwgbnVsbD4oXG4gICAgU1RPUkFHRV9LRVlTLmxvYmJ5RGlzY292ZXJ5Q29sbGFwc2VkU2VjdGlvbnMsXG4gICAgbnVsbFxuICApO1xuICBjb25zdCBjb2xsYXBzZWQgPSB7IC4uLkRFRkFVTFRfQ09MTEFQU0VEX1NFQ1RJT05TIH07XG4gIGZvciAoY29uc3Qgc2VjdGlvbiBvZiBQQU5FTF9TRUNUSU9OUykge1xuICAgIGNvbnN0IHZhbHVlID0gc2F2ZWQ/LltzZWN0aW9uXTtcbiAgICBpZiAodHlwZW9mIHZhbHVlID09PSAnYm9vbGVhbicpIGNvbGxhcHNlZFtzZWN0aW9uXSA9IHZhbHVlO1xuICB9XG4gIHJldHVybiBjb2xsYXBzZWQ7XG59XG5cbmNvbnN0IFNFRV9BTExfVklFV19JRCA9ICdwYWdlLWRldGFpbGVkLXZpZXcnO1xuY29uc3QgU0VFX0FMTF9NQVRDSF9DTEFTUyA9ICdvZi1kaXNjb3Zlcnktc2VlLWFsbC1tYXRjaCc7XG5cbnR5cGUgUGFnZVdpbmRvdyA9IFdpbmRvdyAmIHtcbiAgc2hvd1BhZ2U/OiAocGFnZUlkOiBzdHJpbmcpID0+IHZvaWQ7XG4gIEJPT1RTVFJBUF9DT05GSUc/OiB7IGFzc2V0TWFuaWZlc3Q/OiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+OyBjZG5CYXNlPzogc3RyaW5nIH07XG4gIF9fQVNTRVRfTUFOSUZFU1RfXz86IFJlY29yZDxzdHJpbmcsIHN0cmluZz47XG4gIF9fQ0ROX0JBU0VfXz86IHN0cmluZztcbn07XG5cbi8vIE9wZW5Gcm9udCdzIG93biBnbG9iYWxzIGxpdmUgb24gdGhlIHBhZ2Ugd2luZG93LCBub3Qgb24gdGhlIHVzZXJzY3JpcHQgc2FuZGJveCB3aW5kb3cuXG5mdW5jdGlvbiBnZXRQYWdlV2luZG93KCk6IFBhZ2VXaW5kb3cge1xuICB0cnkge1xuICAgIGlmICh0eXBlb2YgdW5zYWZlV2luZG93ICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgcmV0dXJuIHVuc2FmZVdpbmRvdyBhcyB1bmtub3duIGFzIFBhZ2VXaW5kb3c7XG4gICAgfVxuICB9IGNhdGNoIHtcbiAgICAvLyB1bnNhZmVXaW5kb3cgbm90IGdyYW50ZWQgXHUyMDE0IGZhbGwgdGhyb3VnaCB0byB0aGUgc2FuZGJveCB3aW5kb3dcbiAgfVxuICByZXR1cm4gd2luZG93IGFzIFBhZ2VXaW5kb3c7XG59XG5cbmZ1bmN0aW9uIG5leHRUcmlTdGF0ZShzdGF0ZTogTW9kaWZpZXJGaWx0ZXJTdGF0ZSk6IE1vZGlmaWVyRmlsdGVyU3RhdGUge1xuICByZXR1cm4gc3RhdGUgPT09ICdhbnknID8gJ3JlcXVpcmVkJyA6IHN0YXRlID09PSAncmVxdWlyZWQnID8gJ2Jsb2NrZWQnIDogJ2FueSc7XG59XG5cbmZ1bmN0aW9uIGVzY2FwZUh0bWwodmFsdWU6IHN0cmluZyk6IHN0cmluZyB7XG4gIHJldHVybiB2YWx1ZVxuICAgIC5yZXBsYWNlKC8mL2csICcmYW1wOycpXG4gICAgLnJlcGxhY2UoLzwvZywgJyZsdDsnKVxuICAgIC5yZXBsYWNlKC8+L2csICcmZ3Q7JylcbiAgICAucmVwbGFjZSgvXCIvZywgJyZxdW90OycpO1xufVxuXG4vLyBPcmRlciBvZiBzbG90cyBpbiB0aGUgVXAgTmV4dCBzdHJpcDogRkZBIGluIHRoZSB3aWRlIGxlZnQgY29sdW1uLCBzcGVjaWFsXG4vLyB0aGVuIHRlYW0gc3RhY2tlZCBpbiB0aGUgbmFycm93IHJpZ2h0IGNvbHVtbiBcdTIwMTQgbWlycm9yaW5nIHRoZSBuYXRpdmUgZ3JpZC5cbmNvbnN0IFVQQ09NSU5HX1NPVVJDRV9PUkRFUjogUXVldWVTb3VyY2VbXSA9IFsnZmZhJywgJ3NwZWNpYWwnLCAndGVhbSddO1xuXG5jb25zdCBJQ09OX1BMQVlFUlMgPSBgPHN2ZyB2aWV3Qm94PVwiMCAwIDIwIDIwXCIgZmlsbD1cImN1cnJlbnRDb2xvclwiPjxwYXRoIGQ9XCJNMTMgNmEzIDMgMCAxMS02IDAgMyAzIDAgMDE2IDB6TTE4IDhhMiAyIDAgMTEtNCAwIDIgMiAwIDAxNCAwek0xNCAxNWE0IDQgMCAwMC04IDB2M2g4di0zek02IDhhMiAyIDAgMTEtNCAwIDIgMiAwIDAxNCAwek0xNiAxOHYtM2E1Ljk3MiA1Ljk3MiAwIDAwLS43NS0yLjkwNkEzLjAwNSAzLjAwNSAwIDAxMTkgMTV2M2gtM3pNNC43NSAxMi4wOTRBNS45NzMgNS45NzMgMCAwMDQgMTV2M0gxdi0zYTMgMyAwIDAxMy43NS0yLjkwNnpcIi8+PC9zdmc+YDtcblxuY29uc3QgSUNPTl9DSEVDSyA9IGA8c3ZnIHZpZXdCb3g9XCIwIDAgMjQgMjRcIj48cGF0aCBkPVwiTTUgMTJsNSA1TDIwIDdcIi8+PC9zdmc+YDtcbmNvbnN0IElDT05fQ1JPU1MgPSBgPHN2ZyB2aWV3Qm94PVwiMCAwIDI0IDI0XCI+PHBhdGggZD1cIk02IDZsMTIgMTJNMTggNkw2IDE4XCIvPjwvc3ZnPmA7XG5jb25zdCBJQ09OX1NPVU5EID0gYDxzdmcgdmlld0JveD1cIjAgMCAyNCAyNFwiPjxwYXRoIGQ9XCJNMTEgNUw2IDlIMnY2aDRsNSA0VjV6XCIvPjxwYXRoIGQ9XCJNMTUuNSA4LjVhNSA1IDAgMDEwIDdcIi8+PHBhdGggZD1cIk0xOSA1YTkgOSAwIDAxMCAxNFwiLz48L3N2Zz5gO1xuY29uc3QgSUNPTl9CRUxMID0gYDxzdmcgdmlld0JveD1cIjAgMCAyNCAyNFwiPjxwYXRoIGQ9XCJNNiA4YTYgNiAwIDExMTIgMGMwIDcgMyA5IDMgOUgzczMtMiAzLTl6XCIvPjxwYXRoIGQ9XCJNMTAuMyAyMWExLjk0IDEuOTQgMCAwMDMuNCAwXCIvPjwvc3ZnPmA7XG5cbmV4cG9ydCBjbGFzcyBMb2JieURpc2NvdmVyeVVJIHtcbiAgcHJpdmF0ZSBkaXNjb3ZlcnlFbmFibGVkID0gdHJ1ZTtcbiAgcHJpdmF0ZSBjcml0ZXJpYUxpc3Q6IERpc2NvdmVyeUNyaXRlcmlhW10gPSBbXTtcbiAgcHJpdmF0ZSBzZWFyY2hTdGFydFRpbWU6IG51bWJlciB8IG51bGwgPSBudWxsO1xuICBwcml2YXRlIGxhc3RNYXRjaFRpbWU6IG51bWJlciB8IG51bGwgPSBudWxsO1xuICBwcml2YXRlIHNvdW5kRW5hYmxlZCA9IHRydWU7XG4gIHByaXZhdGUgZGVza3RvcE5vdGlmaWNhdGlvbnNFbmFibGVkID0gZmFsc2U7XG4gIHByaXZhdGUgbm90aWZ5VXBjb21pbmdFbmFibGVkID0gdHJ1ZTtcbiAgcHJpdmF0ZSBpbmNsdWRlSG9zdGVkQW5kQ3VzdG9tTG9iYmllcyA9IHRydWU7XG4gIHByaXZhdGUgbWFwRmlsdGVyOiBNYXBGaWx0ZXIgPSB7fTtcbiAgcHJpdmF0ZSBrbm93bk1hcHM6IFNldDxzdHJpbmc+ID0gbmV3IFNldChNQVBfQ0FUQUxPR1VFLm1hcCgoZW50cnkpID0+IGVudHJ5LmdhbWVNYXApKTtcbiAgcHJpdmF0ZSBjb2xsYXBzZWRTZWN0aW9uczogUmVjb3JkPFBhbmVsU2VjdGlvbiwgYm9vbGVhbj4gPSBsb2FkQ29sbGFwc2VkU2VjdGlvbnMoKTtcbiAgcHJpdmF0ZSBkZXNrdG9wTm90aWZpY2F0aW9uUmVxdWVzdElkID0gMDtcbiAgcHJpdmF0ZSBhY3RpdmVNYXRjaFNvdXJjZXM6IFNldDxRdWV1ZVNvdXJjZT4gPSBuZXcgU2V0KCk7XG4gIHByaXZhdGUgc2VlQWxsUHVsc2VBY3RpdmUgPSBmYWxzZTtcbiAgcHJpdmF0ZSBzZWVBbGxNYXRjaElkczogU2V0PHN0cmluZz4gPSBuZXcgU2V0KCk7XG4gIHByaXZhdGUgc2VlQWxsT2JzZXJ2ZXI6IE11dGF0aW9uT2JzZXJ2ZXIgfCBudWxsID0gbnVsbDtcbiAgcHJpdmF0ZSBvYnNlcnZlZFNlZUFsbFZpZXc6IEhUTUxFbGVtZW50IHwgbnVsbCA9IG51bGw7XG4gIHByaXZhdGUgc2VlbkxvYmJpZXM6IFNldDxzdHJpbmc+ID0gbmV3IFNldCgpO1xuICBwcml2YXRlIGRlc2t0b3BOb3RpZmllZExvYmJpZXM6IFNldDxzdHJpbmc+ID0gbmV3IFNldCgpO1xuICBwcml2YXRlIGlzVGVhbVR3b1RpbWVzTWluRW5hYmxlZCA9IGZhbHNlO1xuICBwcml2YXRlIGZmYVNsaWRlcjogUmFuZ2VTbGlkZXIgfCBudWxsID0gbnVsbDtcbiAgcHJpdmF0ZSB0ZWFtU2xpZGVyOiBSYW5nZVNsaWRlciB8IG51bGwgPSBudWxsO1xuICBwcml2YXRlIHNsZWVwaW5nID0gZmFsc2U7XG4gIHByaXZhdGUgaXNEaXNwb3NlZCA9IGZhbHNlO1xuXG4gIHByaXZhdGUgbGFzdExvYmJpZXM6IExvYmJ5W10gPSBbXTtcbiAgcHJpdmF0ZSB1cGNvbWluZ1N0cmlwOiBIVE1MRGl2RWxlbWVudCB8IG51bGwgPSBudWxsO1xuICBwcml2YXRlIGxhc3RVcGNvbWluZ1Nsb3RzOiBNYXA8UXVldWVTb3VyY2UsIExvYmJ5U2xvdD4gPSBuZXcgTWFwKCk7XG4gIHByaXZhdGUgbGFzdFVwY29taW5nTWF0Y2hTb3VyY2VzOiBTZXQ8UXVldWVTb3VyY2U+ID0gbmV3IFNldCgpO1xuICAvLyBQZXItc2xvdCByZW5kZXIgc2lnbmF0dXJlOiBsZXRzIHVzIHNraXAgcmVidWlsZGluZyBhIGNhcmQgd2hvc2UgY29udGVudCBpc1xuICAvLyB1bmNoYW5nZWQsIHNvIHRoZSB+MXMgbG9iYnkgcmVmcmVzaCAoYW5kIHRoZSAxNm1zIHB1bHNlIHJlLWFwcGx5KSBkb24ndFxuICAvLyBzd2FwIHRoZSBET00gbm9kZSB1bmRlciB0aGUgY3Vyc29yIGFuZCByZXN0YXJ0IHRoZSBob3ZlciBhbmltYXRpb24uXG4gIHByaXZhdGUgdXBjb21pbmdTbG90U2lnbmF0dXJlczogTWFwPFF1ZXVlU291cmNlLCBzdHJpbmc+ID0gbmV3IE1hcCgpO1xuXG4gIHByaXZhdGUgdGltZXJJbnRlcnZhbDogUmV0dXJuVHlwZTx0eXBlb2Ygc2V0SW50ZXJ2YWw+IHwgbnVsbCA9IG51bGw7XG4gIHByaXZhdGUgZ2FtZUluZm9JbnRlcnZhbDogUmV0dXJuVHlwZTx0eXBlb2Ygc2V0SW50ZXJ2YWw+IHwgbnVsbCA9IG51bGw7XG4gIHByaXZhdGUgcHVsc2VTeW5jVGltZW91dDogUmV0dXJuVHlwZTx0eXBlb2Ygc2V0VGltZW91dD4gfCBudWxsID0gbnVsbDtcblxuICBwcml2YXRlIHBhbmVsITogSFRNTERpdkVsZW1lbnQ7XG4gIHByaXZhdGUgZW5naW5lOiBMb2JieURpc2NvdmVyeUVuZ2luZTtcbiAgcHJpdmF0ZSBsb2JieUJvYXJkOiBMb2JieUJvYXJkVmlldztcbiAgLy8gT2Zmc2V0IHRvIGFkZCB0byB0aGUgbG9jYWwgY2xvY2sgdG8gZ2V0IHRoZSBmZWVkJ3MgY2xvY2suXG4gIHByaXZhdGUgY2xvY2tPZmZzZXRNcyA9IDA7XG5cbiAgY29uc3RydWN0b3IoKSB7XG4gICAgdGhpcy5lbmdpbmUgPSBuZXcgTG9iYnlEaXNjb3ZlcnlFbmdpbmUoKTtcbiAgICB0aGlzLmxvYmJ5Qm9hcmQgPSBuZXcgTG9iYnlCb2FyZFZpZXcoe1xuICAgICAgb25Kb2luOiAoZ2FtZUlEKSA9PiB0aGlzLm5hdmlnYXRlVG9HYW1lKGAvZ2FtZS8ke2dhbWVJRH1gKSxcbiAgICAgIGdldEFzc2V0czogKCkgPT4gdGhpcy5nZXRBc3NldENvbnRleHQoKSxcbiAgICB9KTtcbiAgICB0aGlzLmxvYWRTZXR0aW5ncygpO1xuICAgIHRoaXMuY3JlYXRlVUkoKTtcbiAgICB0aGlzLnVwZGF0ZVNsZWVwU3RhdGUoKTtcbiAgICBVUkxPYnNlcnZlci5zdWJzY3JpYmUoKCkgPT4gdGhpcy51cGRhdGVTbGVlcFN0YXRlKCkpO1xuICB9XG5cbiAgcmVjZWl2ZUxvYmJ5VXBkYXRlKGxvYmJpZXM6IExvYmJ5W10sIHNlcnZlclRpbWU6IG51bWJlciB8IG51bGwgPSBudWxsKTogdm9pZCB7XG4gICAgdGhpcy5sYXN0TG9iYmllcyA9IGxvYmJpZXM7XG4gICAgaWYgKHNlcnZlclRpbWUgIT09IG51bGwpIHRoaXMuY2xvY2tPZmZzZXRNcyA9IHNlcnZlclRpbWUgLSBEYXRlLm5vdygpO1xuICAgIHRoaXMucHJvY2Vzc0xvYmJpZXMobG9iYmllcyk7XG4gIH1cblxuICBpc1NvdW5kRW5hYmxlZCgpOiBib29sZWFuIHtcbiAgICByZXR1cm4gdGhpcy5zb3VuZEVuYWJsZWQ7XG4gIH1cblxuICBwcml2YXRlIGxvYWRTZXR0aW5ncygpOiB2b2lkIHtcbiAgICBjb25zdCBzYXZlZCA9IEdNX2dldFZhbHVlPExvYmJ5RGlzY292ZXJ5U2V0dGluZ3MgfCBudWxsPihcbiAgICAgIFNUT1JBR0VfS0VZUy5sb2JieURpc2NvdmVyeVNldHRpbmdzLFxuICAgICAgbnVsbFxuICAgICk7XG5cbiAgICBjb25zdCBzZXR0aW5ncyA9IG5vcm1hbGl6ZVNldHRpbmdzKHNhdmVkKTtcbiAgICBHTV9zZXRWYWx1ZShTVE9SQUdFX0tFWVMubG9iYnlEaXNjb3ZlcnlTZXR0aW5ncywgc2V0dGluZ3MpO1xuXG4gICAgdGhpcy5jcml0ZXJpYUxpc3QgPSBzZXR0aW5ncy5jcml0ZXJpYTtcbiAgICB0aGlzLnNvdW5kRW5hYmxlZCA9IHNldHRpbmdzLnNvdW5kRW5hYmxlZDtcbiAgICB0aGlzLmRlc2t0b3BOb3RpZmljYXRpb25zRW5hYmxlZCA9IHNldHRpbmdzLmRlc2t0b3BOb3RpZmljYXRpb25zRW5hYmxlZDtcbiAgICB0aGlzLmRpc2NvdmVyeUVuYWJsZWQgPSBzZXR0aW5ncy5kaXNjb3ZlcnlFbmFibGVkO1xuICAgIHRoaXMuaXNUZWFtVHdvVGltZXNNaW5FbmFibGVkID0gc2V0dGluZ3MuaXNUZWFtVHdvVGltZXNNaW5FbmFibGVkO1xuICAgIHRoaXMubm90aWZ5VXBjb21pbmdFbmFibGVkID0gc2V0dGluZ3Mubm90aWZ5VXBjb21pbmdFbmFibGVkID8/IHRydWU7XG4gICAgdGhpcy5pbmNsdWRlSG9zdGVkQW5kQ3VzdG9tTG9iYmllcyA9IHNldHRpbmdzLmluY2x1ZGVIb3N0ZWRBbmRDdXN0b21Mb2JiaWVzID8/IHRydWU7XG4gICAgdGhpcy5tYXBGaWx0ZXIgPSBzZXR0aW5ncy5tYXBGaWx0ZXIgPz8ge307XG4gIH1cblxuICBwcml2YXRlIHNhdmVTZXR0aW5ncygpOiB2b2lkIHtcbiAgICBHTV9zZXRWYWx1ZShTVE9SQUdFX0tFWVMubG9iYnlEaXNjb3ZlcnlTZXR0aW5ncywge1xuICAgICAgY3JpdGVyaWE6IHRoaXMuY3JpdGVyaWFMaXN0LFxuICAgICAgZGlzY292ZXJ5RW5hYmxlZDogdGhpcy5kaXNjb3ZlcnlFbmFibGVkLFxuICAgICAgc291bmRFbmFibGVkOiB0aGlzLnNvdW5kRW5hYmxlZCxcbiAgICAgIGRlc2t0b3BOb3RpZmljYXRpb25zRW5hYmxlZDogdGhpcy5kZXNrdG9wTm90aWZpY2F0aW9uc0VuYWJsZWQsXG4gICAgICBpc1RlYW1Ud29UaW1lc01pbkVuYWJsZWQ6IHRoaXMuaXNUZWFtVHdvVGltZXNNaW5FbmFibGVkLFxuICAgICAgbm90aWZ5VXBjb21pbmdFbmFibGVkOiB0aGlzLm5vdGlmeVVwY29taW5nRW5hYmxlZCxcbiAgICAgIGluY2x1ZGVIb3N0ZWRBbmRDdXN0b21Mb2JiaWVzOiB0aGlzLmluY2x1ZGVIb3N0ZWRBbmRDdXN0b21Mb2JiaWVzLFxuICAgICAgbWFwRmlsdGVyOiB0aGlzLm1hcEZpbHRlcixcbiAgICB9IHNhdGlzZmllcyBMb2JieURpc2NvdmVyeVNldHRpbmdzKTtcbiAgfVxuXG4gIHByaXZhdGUgdXBkYXRlU3RhdHVzVGV4dCgpOiB2b2lkIHtcbiAgICBjb25zdCB0ZXh0ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2Rpc2NvdmVyeS1zZWFyY2gtdGltZXInKTtcbiAgICBpZiAoIXRleHQpIHJldHVybjtcblxuICAgIGlmIChcbiAgICAgICF0aGlzLmRpc2NvdmVyeUVuYWJsZWQgfHxcbiAgICAgIHRoaXMuY3JpdGVyaWFMaXN0Lmxlbmd0aCA9PT0gMCB8fFxuICAgICAgIXRoaXMuaXNEaXNjb3ZlcnlGZWVkYmFja0FsbG93ZWQoKVxuICAgICkge1xuICAgICAgdGV4dC50ZXh0Q29udGVudCA9ICcnO1xuICAgICAgdGV4dC5zdHlsZS5kaXNwbGF5ID0gJ25vbmUnO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHRleHQuc3R5bGUuZGlzcGxheSA9ICdpbmxpbmUnO1xuICAgIGlmICh0aGlzLmxhc3RNYXRjaFRpbWUgIT09IG51bGwpIHtcbiAgICAgIHRleHQudGV4dENvbnRlbnQgPSBgbGFzdCBtYXRjaCAke2Zvcm1hdEVsYXBzZWRTaW5jZSh0aGlzLmxhc3RNYXRjaFRpbWUpfWA7XG4gICAgfSBlbHNlIGlmICh0aGlzLnNlYXJjaFN0YXJ0VGltZSAhPT0gbnVsbCkge1xuICAgICAgdGV4dC50ZXh0Q29udGVudCA9IGBzZWFyY2hpbmcgXHUwMEI3ICR7Zm9ybWF0RWxhcHNlZFNpbmNlKHRoaXMuc2VhcmNoU3RhcnRUaW1lKX1gO1xuICAgIH0gZWxzZSB7XG4gICAgICB0ZXh0LnRleHRDb250ZW50ID0gJ2F3YWl0aW5nIGZpbHRlcnMnO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgdXBkYXRlQ3VycmVudEdhbWVJbmZvKCk6IHZvaWQge1xuICAgIGNvbnN0IGdhbWVJbmZvRWxlbWVudCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdkaXNjb3ZlcnktY3VycmVudC1nYW1lLWluZm8nKTtcbiAgICBpZiAoIWdhbWVJbmZvRWxlbWVudCB8fCAhTG9iYnlVdGlscy5pc09uTG9iYnlQYWdlKCkpIHtcbiAgICAgIGlmIChnYW1lSW5mb0VsZW1lbnQpIGdhbWVJbmZvRWxlbWVudC5zdHlsZS5kaXNwbGF5ID0gJ25vbmUnO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGNvbnN0IHB1YmxpY0xvYmJ5ID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcigncHVibGljLWxvYmJ5JykgYXMgYW55O1xuICAgIGlmICghcHVibGljTG9iYnkgfHwgIUFycmF5LmlzQXJyYXkocHVibGljTG9iYnkubG9iYmllcykgfHwgcHVibGljTG9iYnkubG9iYmllcy5sZW5ndGggPT09IDApIHtcbiAgICAgIGdhbWVJbmZvRWxlbWVudC5zdHlsZS5kaXNwbGF5ID0gJ25vbmUnO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGNvbnN0IGN1cnJlbnRMb2JieSA9IHB1YmxpY0xvYmJ5LmxvYmJpZXNbMF07XG4gICAgaWYgKCFjdXJyZW50TG9iYnkgfHwgIWN1cnJlbnRMb2JieS5nYW1lQ29uZmlnKSB7XG4gICAgICBnYW1lSW5mb0VsZW1lbnQuc3R5bGUuZGlzcGxheSA9ICdub25lJztcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBnYW1lSW5mb0VsZW1lbnQuc3R5bGUuZGlzcGxheSA9ICdibG9jayc7XG4gICAgZ2FtZUluZm9FbGVtZW50LnRleHRDb250ZW50ID0gYEN1cnJlbnQgZ2FtZTogJHtnZXRHYW1lRGV0YWlsc1RleHQoY3VycmVudExvYmJ5KX1gO1xuICB9XG5cbiAgLyoqIEdyb3VwIHRoZSBmbGF0dGVuZWQgbG9iYnkgc25hcHNob3QgYnkgUXVldWUsIGtlZXBpbmcgdGhlIGZlZWQgb3JkZXIuICovXG4gIHByaXZhdGUgcGFyc2VRdWV1ZXMobG9iYmllczogTG9iYnlbXSk6IE1hcDxRdWV1ZVNvdXJjZSwgTG9iYnlbXT4ge1xuICAgIGNvbnN0IHF1ZXVlcyA9IG5ldyBNYXA8UXVldWVTb3VyY2UsIExvYmJ5W10+KCk7XG4gICAgZm9yIChjb25zdCBsb2JieSBvZiBsb2JiaWVzKSB7XG4gICAgICBjb25zdCBxdWV1ZSA9IGdldExvYmJ5UXVldWVTb3VyY2UobG9iYnkpO1xuICAgICAgaWYgKCFxdWV1ZSkgY29udGludWU7XG4gICAgICBjb25zdCBxdWV1ZUxvYmJpZXMgPSBxdWV1ZXMuZ2V0KHF1ZXVlKSA/PyBbXTtcbiAgICAgIHF1ZXVlTG9iYmllcy5wdXNoKGxvYmJ5KTtcbiAgICAgIHF1ZXVlcy5zZXQocXVldWUsIHF1ZXVlTG9iYmllcyk7XG4gICAgfVxuICAgIHJldHVybiBxdWV1ZXM7XG4gIH1cblxuICAvKiogVGhlIFVwIE5leHQgc3RyaXAgc2hvd3MgdGhlIGZpcnN0IHR3byBsb2JiaWVzIG9mIHRoZSBGRkEsIFRlYW0gYW5kIFNwZWNpYWwgUXVldWVzLiAqL1xuICBwcml2YXRlIHRvVXBOZXh0U2xvdHMocXVldWVzOiBNYXA8UXVldWVTb3VyY2UsIExvYmJ5W10+KTogTWFwPFF1ZXVlU291cmNlLCBMb2JieVNsb3Q+IHtcbiAgICBjb25zdCBzbG90cyA9IG5ldyBNYXA8UXVldWVTb3VyY2UsIExvYmJ5U2xvdD4oKTtcbiAgICBmb3IgKGNvbnN0IHF1ZXVlIG9mIFVQQ09NSU5HX1NPVVJDRV9PUkRFUikge1xuICAgICAgY29uc3QgcXVldWVMb2JiaWVzID0gcXVldWVzLmdldChxdWV1ZSk7XG4gICAgICBpZiAocXVldWVMb2JiaWVzPy5sZW5ndGgpIHtcbiAgICAgICAgc2xvdHMuc2V0KHF1ZXVlLCB7IGxpdmU6IHF1ZXVlTG9iYmllc1swXSwgdXBjb21pbmc6IHF1ZXVlTG9iYmllc1sxXSB9KTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHNsb3RzO1xuICB9XG5cbiAgcHJpdmF0ZSBwcm9jZXNzTG9iYmllcyhsb2JiaWVzOiBMb2JieVtdKTogdm9pZCB7XG4gICAgdHJ5IHtcbiAgICAgIHRoaXMudXBkYXRlTG9iYnlCb2FyZChsb2JiaWVzKTtcbiAgICAgIHRoaXMudXBkYXRlQ3VycmVudEdhbWVJbmZvKCk7XG4gICAgICB0aGlzLnN5bmNTZWFyY2hUaW1lcigpO1xuXG4gICAgICBjb25zdCBxdWV1ZXMgPSB0aGlzLnBhcnNlUXVldWVzKGxvYmJpZXMpO1xuICAgICAgY29uc3Qgc2xvdHMgPSB0aGlzLnRvVXBOZXh0U2xvdHMocXVldWVzKTtcbiAgICAgIHRoaXMuYWRkRmVlZE9ubHlNYXBzKGxvYmJpZXMpO1xuXG4gICAgICBpZiAoXG4gICAgICAgICF0aGlzLmRpc2NvdmVyeUVuYWJsZWQgfHxcbiAgICAgICAgdGhpcy5jcml0ZXJpYUxpc3QubGVuZ3RoID09PSAwIHx8XG4gICAgICAgICF0aGlzLmlzRGlzY292ZXJ5RmVlZGJhY2tBbGxvd2VkKClcbiAgICAgICkge1xuICAgICAgICB0aGlzLnNlZW5Mb2JiaWVzLmNsZWFyKCk7XG4gICAgICAgIHRoaXMuZGVza3RvcE5vdGlmaWVkTG9iYmllcy5jbGVhcigpO1xuICAgICAgICB0aGlzLnVwZGF0ZVF1ZXVlQ2FyZFB1bHNlcyhuZXcgU2V0KCkpO1xuICAgICAgICB0aGlzLnVwZGF0ZVNlZUFsbFNpZ25hbHMoZmFsc2UsIG5ldyBTZXQoKSk7XG4gICAgICAgIC8vIERpc3BsYXkgaXMgaW5kZXBlbmRlbnQgb2Ygbm90aWZpY2F0aW9uIGdhdGluZzogc3RpbGwgc3VyZmFjZSB0aGVcbiAgICAgICAgLy8gdXBjb21pbmcgZ2FtZXMgKHdpdGhvdXQgYW55IG1hdGNoIGhpZ2hsaWdodCkgd2hpbGUgb24gdGhlIGxvYmJ5IHBhZ2UuXG4gICAgICAgIHRoaXMucmVuZGVyVXBjb21pbmdTdHJpcChzbG90cywgbmV3IFNldCgpKTtcbiAgICAgICAgdGhpcy51cGRhdGVTdGF0dXNUZXh0KCk7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgLy8gU2lnbmFsczogTGl2ZSBMb2JieSBcdTIxOTIgaG9tZSBjYXJkOyBpbmRleCAxIFx1MjE5MiBVcCBOZXh0IGNhcmQ7IG90aGVycyBhbmQgSG9zdGVkIFx1MjE5MiBcIlNlZSBhbGxcIiBidXR0b24uXG4gICAgICBjb25zdCBsaXZlTWF0Y2hTb3VyY2VzID0gbmV3IFNldDxRdWV1ZVNvdXJjZT4oKTtcbiAgICAgIGNvbnN0IHVwY29taW5nTWF0Y2hTb3VyY2VzID0gbmV3IFNldDxRdWV1ZVNvdXJjZT4oKTtcbiAgICAgIGNvbnN0IHNlZUFsbE1hdGNoSWRzID0gbmV3IFNldDxzdHJpbmc+KCk7XG4gICAgICBsZXQgaGFzU2VlQWxsT25seU1hdGNoID0gZmFsc2U7XG4gICAgICBjb25zdCBtYXRjaGVkS2V5cyA9IG5ldyBTZXQ8c3RyaW5nPigpO1xuICAgICAgY29uc3QgbmV3TWF0Y2hlczogRGlzY292ZXJ5TWF0Y2hbXSA9IFtdO1xuICAgICAgbGV0IGhhc05ld01hdGNoID0gZmFsc2U7XG5cbiAgICAgIGNvbnN0IGRlYnVnRW5hYmxlZCA9IGlzRGVidWdFbmFibGVkKCk7XG4gICAgICBjb25zdCBldmFsdWF0ZSA9IChsb2JieTogTG9iYnksIHF1ZXVlOiBRdWV1ZVNvdXJjZSwgaW5kZXg6IG51bWJlcik6IHZvaWQgPT4ge1xuICAgICAgICBpZiAoIXRoaXMuaW5jbHVkZUhvc3RlZEFuZEN1c3RvbUxvYmJpZXMgJiYgaXNIb3N0Q29uZmlndXJlZExvYmJ5KGxvYmJ5KSkgcmV0dXJuO1xuXG4gICAgICAgIGNvbnN0IGlzTGl2ZSA9IHF1ZXVlICE9PSAnaG9zdGVkJyAmJiBpbmRleCA9PT0gMDtcbiAgICAgICAgY29uc3Qgc2VlQWxsT25seSA9IHF1ZXVlID09PSAnaG9zdGVkJyB8fCBpbmRleCA+IDE7XG4gICAgICAgIGNvbnN0IG1hdGNoZWQgPSB0aGlzLmVuZ2luZS5tYXRjaGVzQ3JpdGVyaWEobG9iYnksIHRoaXMuY3JpdGVyaWFMaXN0LCB0aGlzLm1hcEZpbHRlcik7XG4gICAgICAgIGlmIChkZWJ1Z0VuYWJsZWQpIHtcbiAgICAgICAgICBjb25zb2xlLmxvZygnW09GIERpc2NvdmVyeV0nLCB7XG4gICAgICAgICAgICBsb2JieUlkOiBsb2JieS5nYW1lSUQsXG4gICAgICAgICAgICBxdWV1ZSxcbiAgICAgICAgICAgIGluZGV4LFxuICAgICAgICAgICAgbW9kZTogbG9iYnkuZ2FtZUNvbmZpZz8uZ2FtZU1vZGUsXG4gICAgICAgICAgICBtYXA6IGxvYmJ5LmdhbWVDb25maWc/LmdhbWVNYXAsXG4gICAgICAgICAgICBwbGF5ZXJUZWFtczogbG9iYnkuZ2FtZUNvbmZpZz8ucGxheWVyVGVhbXMsXG4gICAgICAgICAgICBtb2RpZmllcnM6IGxvYmJ5LmdhbWVDb25maWc/LnB1YmxpY0dhbWVNb2RpZmllcnMsXG4gICAgICAgICAgICBob3N0R29sZDoge1xuICAgICAgICAgICAgICBzdGFydGluZ0dvbGQ6IGxvYmJ5LmdhbWVDb25maWc/LnN0YXJ0aW5nR29sZCxcbiAgICAgICAgICAgICAgZ29sZE11bHRpcGxpZXI6IGxvYmJ5LmdhbWVDb25maWc/LmdvbGRNdWx0aXBsaWVyLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGNyaXRlcmlhQ291bnQ6IHRoaXMuY3JpdGVyaWFMaXN0Lmxlbmd0aCxcbiAgICAgICAgICAgIG1hdGNoZWQsXG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCFtYXRjaGVkKSByZXR1cm47XG5cbiAgICAgICAgaWYgKGlzTGl2ZSkge1xuICAgICAgICAgIGxpdmVNYXRjaFNvdXJjZXMuYWRkKHF1ZXVlKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBpZiAoIXRoaXMubm90aWZ5VXBjb21pbmdFbmFibGVkKSByZXR1cm47XG4gICAgICAgICAgaWYgKHNlZUFsbE9ubHkpIGhhc1NlZUFsbE9ubHlNYXRjaCA9IHRydWU7XG4gICAgICAgICAgZWxzZSB1cGNvbWluZ01hdGNoU291cmNlcy5hZGQocXVldWUpO1xuICAgICAgICB9XG4gICAgICAgIHNlZUFsbE1hdGNoSWRzLmFkZChsb2JieS5nYW1lSUQpO1xuXG4gICAgICAgIGNvbnN0IG5vdGlmaWNhdGlvbktleSA9IHRoaXMuZ2V0Tm90aWZpY2F0aW9uS2V5KGxvYmJ5KTtcbiAgICAgICAgbWF0Y2hlZEtleXMuYWRkKG5vdGlmaWNhdGlvbktleSk7XG4gICAgICAgIGlmICghdGhpcy5zZWVuTG9iYmllcy5oYXMobm90aWZpY2F0aW9uS2V5KSkgaGFzTmV3TWF0Y2ggPSB0cnVlO1xuICAgICAgICBpZiAoIXRoaXMuZGVza3RvcE5vdGlmaWVkTG9iYmllcy5oYXMobm90aWZpY2F0aW9uS2V5KSkge1xuICAgICAgICAgIG5ld01hdGNoZXMucHVzaCh7IGxvYmJ5LCBxdWV1ZSwgc2VlQWxsT25seSB9KTtcbiAgICAgICAgfVxuICAgICAgfTtcblxuICAgICAgZm9yIChjb25zdCBbcXVldWUsIHF1ZXVlTG9iYmllc10gb2YgcXVldWVzKSB7XG4gICAgICAgIHF1ZXVlTG9iYmllcy5mb3JFYWNoKChsb2JieSwgaW5kZXgpID0+IGV2YWx1YXRlKGxvYmJ5LCBxdWV1ZSwgaW5kZXgpKTtcbiAgICAgIH1cblxuICAgICAgdGhpcy51cGRhdGVRdWV1ZUNhcmRQdWxzZXMobGl2ZU1hdGNoU291cmNlcyk7XG4gICAgICB0aGlzLnVwZGF0ZVNlZUFsbFNpZ25hbHMoaGFzU2VlQWxsT25seU1hdGNoLCBzZWVBbGxNYXRjaElkcyk7XG4gICAgICB0aGlzLnJlbmRlclVwY29taW5nU3RyaXAoc2xvdHMsIHVwY29taW5nTWF0Y2hTb3VyY2VzKTtcbiAgICAgIGlmIChoYXNOZXdNYXRjaCkge1xuICAgICAgICB0aGlzLmxhc3RNYXRjaFRpbWUgPSBEYXRlLm5vdygpO1xuICAgICAgICBpZiAodGhpcy5zb3VuZEVuYWJsZWQpIFNvdW5kVXRpbHMucGxheUdhbWVGb3VuZFNvdW5kKCk7XG4gICAgICB9XG4gICAgICBpZiAodGhpcy5kZXNrdG9wTm90aWZpY2F0aW9uc0VuYWJsZWQpIHtcbiAgICAgICAgY29uc3QgZGVsaXZlcmVkS2V5cyA9IG5ldyBTZXQ8c3RyaW5nPigpO1xuICAgICAgICBmb3IgKGNvbnN0IHsgbG9iYnksIHF1ZXVlLCBzZWVBbGxPbmx5IH0gb2YgbmV3TWF0Y2hlcykge1xuICAgICAgICAgIGNvbnN0IGNvbnRlbnQgPSBnZXRCcm93c2VyTm90aWZpY2F0aW9uQ29udGVudChsb2JieSk7XG4gICAgICAgICAgY29uc3Qga2V5ID0gdGhpcy5nZXROb3RpZmljYXRpb25LZXkobG9iYnkpO1xuICAgICAgICAgIGNvbnN0IGRlbGl2ZXJlZCA9IEJyb3dzZXJOb3RpZmljYXRpb25VdGlscy5zaG93KHtcbiAgICAgICAgICAgIHRpdGxlOiBjb250ZW50LnRpdGxlLFxuICAgICAgICAgICAgYm9keTogY29udGVudC5ib2R5LFxuICAgICAgICAgICAgdGFnOiBrZXksXG4gICAgICAgICAgICAvLyBSdW5zIG9ubHkgZnJvbSB0aGUgdXNlcidzIGNsaWNrIG9uIHRoZSBub3RpZmljYXRpb24uXG4gICAgICAgICAgICBvbkNsaWNrOiBzZWVBbGxPbmx5ID8gKCkgPT4gdGhpcy5vcGVuU2VlQWxsVmlldyhxdWV1ZSkgOiB1bmRlZmluZWQsXG4gICAgICAgICAgfSk7XG4gICAgICAgICAgaWYgKGRlbGl2ZXJlZCkgZGVsaXZlcmVkS2V5cy5hZGQoa2V5KTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLmRlc2t0b3BOb3RpZmllZExvYmJpZXMgPSBuZXcgU2V0KFtcbiAgICAgICAgICAuLi5bLi4udGhpcy5kZXNrdG9wTm90aWZpZWRMb2JiaWVzXS5maWx0ZXIoKGspID0+IG1hdGNoZWRLZXlzLmhhcyhrKSksXG4gICAgICAgICAgLi4uZGVsaXZlcmVkS2V5cyxcbiAgICAgICAgXSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLmRlc2t0b3BOb3RpZmllZExvYmJpZXMuY2xlYXIoKTtcbiAgICAgIH1cblxuICAgICAgdGhpcy5zZWVuTG9iYmllcyA9IG1hdGNoZWRLZXlzO1xuICAgICAgaWYgKG1hdGNoZWRLZXlzLnNpemUgPT09IDApIHRoaXMubGFzdE1hdGNoVGltZSA9IG51bGw7XG4gICAgICB0aGlzLnVwZGF0ZVN0YXR1c1RleHQoKTtcbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgY29uc29sZS5lcnJvcignW0xvYmJ5RGlzY292ZXJ5XSBFcnJvciBwcm9jZXNzaW5nIGxvYmJpZXM6JywgZXJyb3IpO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgdXBkYXRlTG9iYnlCb2FyZChsb2JiaWVzOiBMb2JieVtdKTogdm9pZCB7XG4gICAgaWYgKHRoaXMuc2xlZXBpbmcgfHwgIXRoaXMuaXNEaXNjb3ZlcnlGZWVkYmFja0FsbG93ZWQoKSkge1xuICAgICAgdGhpcy5sb2JieUJvYXJkLmhpZGUoKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgY29uc3QgaXNBY3RpdmUgPSB0aGlzLmRpc2NvdmVyeUVuYWJsZWQgJiYgdGhpcy5jcml0ZXJpYUxpc3QubGVuZ3RoID4gMDtcbiAgICBjb25zdCBtYXRjaGVkSWRzID0gbmV3IFNldDxzdHJpbmc+KCk7XG4gICAgaWYgKGlzQWN0aXZlKSB7XG4gICAgICBmb3IgKGNvbnN0IGxvYmJ5IG9mIGxvYmJpZXMpIHtcbiAgICAgICAgY29uc3QgZXhjbHVkZWQgPSAhdGhpcy5pbmNsdWRlSG9zdGVkQW5kQ3VzdG9tTG9iYmllcyAmJiBpc0hvc3RDb25maWd1cmVkTG9iYnkobG9iYnkpO1xuICAgICAgICBpZiAoIWV4Y2x1ZGVkICYmIHRoaXMuZW5naW5lLm1hdGNoZXNDcml0ZXJpYShsb2JieSwgdGhpcy5jcml0ZXJpYUxpc3QsIHRoaXMubWFwRmlsdGVyKSkge1xuICAgICAgICAgIG1hdGNoZWRJZHMuYWRkKGxvYmJ5LmdhbWVJRCk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgdGhpcy5sb2JieUJvYXJkLnJlbmRlcih7XG4gICAgICBsb2JiaWVzLFxuICAgICAgbWF0Y2hlZElkczogaXNBY3RpdmUgPyBtYXRjaGVkSWRzIDogbnVsbCxcbiAgICAgIGNsb2NrT2Zmc2V0TXM6IHRoaXMuY2xvY2tPZmZzZXRNcyxcbiAgICB9KTtcbiAgfVxuXG4gIHByaXZhdGUgZ2V0Tm90aWZpY2F0aW9uS2V5KGxvYmJ5OiBMb2JieSk6IHN0cmluZyB7XG4gICAgcmV0dXJuIEpTT04uc3RyaW5naWZ5KHtcbiAgICAgIGdhbWVJRDogbG9iYnkuZ2FtZUlELFxuICAgICAgbWFwOiBsb2JieS5nYW1lQ29uZmlnPy5nYW1lTWFwID8/IG51bGwsXG4gICAgICBtb2RlOiBsb2JieS5nYW1lQ29uZmlnPy5nYW1lTW9kZSA/PyBudWxsLFxuICAgICAgcGxheWVyVGVhbXM6IGxvYmJ5LmdhbWVDb25maWc/LnBsYXllclRlYW1zID8/IGxvYmJ5LmdhbWVDb25maWc/LnRlYW1Db3VudCA/PyBudWxsLFxuICAgICAgY2FwYWNpdHk6IGxvYmJ5LmdhbWVDb25maWc/Lm1heFBsYXllcnMgPz8gbG9iYnkubWF4Q2xpZW50cyA/PyBudWxsLFxuICAgICAgbW9kaWZpZXJzOiBsb2JieS5nYW1lQ29uZmlnPy5wdWJsaWNHYW1lTW9kaWZpZXJzID8/IHt9LFxuICAgIH0pO1xuICB9XG5cbiAgcHJpdmF0ZSBpc0Rpc2NvdmVyeUZlZWRiYWNrQWxsb3dlZCgpOiBib29sZWFuIHtcbiAgICBpZiAoIUxvYmJ5VXRpbHMuaXNPbkxvYmJ5UGFnZSgpKSByZXR1cm4gZmFsc2U7XG5cbiAgICAvLyBPcGVuaW5nIHRoZSBTZWUgQWxsIFZpZXcgaGlkZXMgdGhlIHBsYXkgcGFnZTsgbWF0Y2hpbmcgbXVzdCBrZWVwIHJ1bm5pbmcgdGhlcmUuXG4gICAgY29uc3QgcGFnZVBsYXkgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgncGFnZS1wbGF5Jyk7XG4gICAgaWYgKHBhZ2VQbGF5Py5jbGFzc0xpc3QuY29udGFpbnMoJ2hpZGRlbicpICYmICF0aGlzLmlzU2VlQWxsVmlld1Zpc2libGUoKSkgcmV0dXJuIGZhbHNlO1xuXG4gICAgY29uc3QgcHVibGljTG9iYnkgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCdwdWJsaWMtbG9iYnknKSBhc1xuICAgICAgfCB7IGlzTG9iYnlIaWdobGlnaHRlZD86IGJvb2xlYW4gfVxuICAgICAgfCBudWxsO1xuICAgIGlmIChwdWJsaWNMb2JieT8uaXNMb2JieUhpZ2hsaWdodGVkID09PSB0cnVlKSByZXR1cm4gZmFsc2U7XG5cbiAgICBjb25zdCBqb2luTG9iYnlNb2RhbCA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJ2pvaW4tbG9iYnktbW9kYWwnKSBhc1xuICAgICAgfCB7IGN1cnJlbnRMb2JieUlkPzogc3RyaW5nIH1cbiAgICAgIHwgbnVsbDtcbiAgICBpZiAoam9pbkxvYmJ5TW9kYWw/LmN1cnJlbnRMb2JieUlkKSByZXR1cm4gZmFsc2U7XG5cbiAgICBjb25zdCBob3N0TG9iYnlNb2RhbCA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJ2hvc3QtbG9iYnktbW9kYWwnKSBhc1xuICAgICAgfCB7IGxvYmJ5SWQ/OiBzdHJpbmcgfVxuICAgICAgfCBudWxsO1xuICAgIGlmIChob3N0TG9iYnlNb2RhbD8ubG9iYnlJZCkgcmV0dXJuIGZhbHNlO1xuXG4gICAgcmV0dXJuIHRydWU7XG4gIH1cblxuICBwcml2YXRlIGdldFF1ZXVlQ2FyZEVsZW1lbnRzKCk6IFBhcnRpYWw8UmVjb3JkPFF1ZXVlU291cmNlLCBIVE1MRWxlbWVudD4+IHtcbiAgICBjb25zdCBzZWxlY3RvciA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJ2dhbWUtbW9kZS1zZWxlY3RvcicpIGFzIEhUTUxFbGVtZW50IHwgbnVsbDtcbiAgICBpZiAoIXNlbGVjdG9yKSByZXR1cm4ge307XG5cbiAgICBjb25zdCBncmlkID0gQXJyYXkuZnJvbShzZWxlY3Rvci5xdWVyeVNlbGVjdG9yQWxsKCdkaXYnKSkuZmluZCgoZWxlbWVudCkgPT5cbiAgICAgIGVsZW1lbnQuY2xhc3NOYW1lLmluY2x1ZGVzKCdzbTpncmlkLWNvbHMtWzJmcl8xZnJdJylcbiAgICApO1xuICAgIGlmICghKGdyaWQgaW5zdGFuY2VvZiBIVE1MRWxlbWVudCkpIHJldHVybiB7fTtcblxuICAgIC8vIExpdCBza2lwcyB0aGUgY2VsbCBvZiBhbiBhYnNlbnQgUXVldWUsIHNvIHRoZSBUZWFtIGFuZCBTcGVjaWFsIHBvc2l0aW9ucyBjb21lIGZyb20gdGhlIGxvYmJ5IGRhdGEuXG4gICAgY29uc3QgZ3JpZENoaWxkcmVuID0gQXJyYXkuZnJvbShncmlkLmNoaWxkcmVuKSBhcyBIVE1MRWxlbWVudFtdO1xuICAgIGNvbnN0IGZmYUNlbGwgPSBncmlkQ2hpbGRyZW4uZmluZChcbiAgICAgIChlbCkgPT4gZWwuY2xhc3NOYW1lLmluY2x1ZGVzKCdzbTpjb2wtc3RhcnQtMScpICYmIGVsLmNsYXNzTmFtZS5pbmNsdWRlcygnc206cm93LXN0YXJ0LTInKVxuICAgICk7XG4gICAgY29uc3Qgc2VjdGlvbiA9IGdyaWRDaGlsZHJlbi5maW5kKChlbCkgPT4gZWwudGFnTmFtZSA9PT0gJ1NFQ1RJT04nKTtcbiAgICBjb25zdCBjYXJkQ2VsbHMgPSBzZWN0aW9uXG4gICAgICA/IChBcnJheS5mcm9tKHNlY3Rpb24uY2hpbGRyZW4pIGFzIEhUTUxFbGVtZW50W10pLmZpbHRlcigoZWwpID0+IGVsLnRhZ05hbWUgPT09ICdESVYnKVxuICAgICAgOiBbXTtcblxuICAgIGNvbnN0IGdhbWVzID0gKHNlbGVjdG9yIGFzIHVua25vd24gYXMgeyBsb2JiaWVzPzogeyBnYW1lcz86IFJlY29yZDxzdHJpbmcsIHVua25vd25bXT4gfSB9KVxuICAgICAgLmxvYmJpZXM/LmdhbWVzO1xuICAgIGNvbnN0IGhhc1RlYW0gPSBBcnJheS5pc0FycmF5KGdhbWVzPy5bJ3RlYW0nXSkgJiYgZ2FtZXMhWyd0ZWFtJ10ubGVuZ3RoID4gMDtcbiAgICBjb25zdCBoYXNTcGVjaWFsID0gQXJyYXkuaXNBcnJheShnYW1lcz8uWydzcGVjaWFsJ10pICYmIGdhbWVzIVsnc3BlY2lhbCddLmxlbmd0aCA+IDA7XG4gICAgY29uc3QgdGVhbUNlbGwgPSBoYXNUZWFtID8gY2FyZENlbGxzWzBdIDogdW5kZWZpbmVkO1xuICAgIGNvbnN0IHNwZWNpYWxDZWxsID0gaGFzU3BlY2lhbCA/IGNhcmRDZWxsc1toYXNUZWFtID8gMSA6IDBdIDogdW5kZWZpbmVkO1xuXG4gICAgcmV0dXJuIHtcbiAgICAgIGZmYTogZmZhQ2VsbD8ucXVlcnlTZWxlY3RvcignYnV0dG9uJykgYXMgSFRNTEVsZW1lbnQgfCB1bmRlZmluZWQsXG4gICAgICB0ZWFtOiB0ZWFtQ2VsbD8ucXVlcnlTZWxlY3RvcignYnV0dG9uJykgYXMgSFRNTEVsZW1lbnQgfCB1bmRlZmluZWQsXG4gICAgICBzcGVjaWFsOiBzcGVjaWFsQ2VsbD8ucXVlcnlTZWxlY3RvcignYnV0dG9uJykgYXMgSFRNTEVsZW1lbnQgfCB1bmRlZmluZWQsXG4gICAgfTtcbiAgfVxuXG4gIHByaXZhdGUgdXBkYXRlUXVldWVDYXJkUHVsc2VzKG5leHRTb3VyY2VzOiBTZXQ8UXVldWVTb3VyY2U+KTogdm9pZCB7XG4gICAgdGhpcy5hY3RpdmVNYXRjaFNvdXJjZXMgPSBuZXcgU2V0KG5leHRTb3VyY2VzKTtcbiAgICB0aGlzLmFwcGx5UXVldWVDYXJkUHVsc2VzKCk7XG4gICAgdGhpcy5zY2hlZHVsZVF1ZXVlQ2FyZFB1bHNlU3luYygpO1xuICB9XG5cbiAgcHJpdmF0ZSBpc1NlZUFsbFZpZXdWaXNpYmxlKCk6IGJvb2xlYW4ge1xuICAgIGNvbnN0IHZpZXcgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChTRUVfQUxMX1ZJRVdfSUQpO1xuICAgIHJldHVybiAhIXZpZXcgJiYgIXZpZXcuY2xhc3NMaXN0LmNvbnRhaW5zKCdoaWRkZW4nKTtcbiAgfVxuXG4gIHByaXZhdGUgZ2V0U2VlQWxsQnV0dG9uKCk6IEhUTUxFbGVtZW50IHwgbnVsbCB7XG4gICAgcmV0dXJuIGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoXG4gICAgICAnZ2FtZS1tb2RlLXNlbGVjdG9yIGJ1dHRvbltjbGFzc349XCJncm91cC91cGNvbWluZ1wiXSdcbiAgICApIGFzIEhUTUxFbGVtZW50IHwgbnVsbDtcbiAgfVxuXG4gIHByaXZhdGUgdXBkYXRlU2VlQWxsU2lnbmFscyhwdWxzZTogYm9vbGVhbiwgbWF0Y2hJZHM6IFNldDxzdHJpbmc+KTogdm9pZCB7XG4gICAgdGhpcy5zZWVBbGxQdWxzZUFjdGl2ZSA9IHB1bHNlO1xuICAgIHRoaXMuc2VlQWxsTWF0Y2hJZHMgPSBtYXRjaElkcztcbiAgICB0aGlzLmFwcGx5U2VlQWxsU2lnbmFscygpO1xuICB9XG5cbiAgcHJpdmF0ZSBhcHBseVNlZUFsbFNpZ25hbHMoKTogdm9pZCB7XG4gICAgdGhpcy5nZXRTZWVBbGxCdXR0b24oKT8uY2xhc3NMaXN0LnRvZ2dsZSgnb2YtZGlzY292ZXJ5LWNhcmQtYWN0aXZlJywgdGhpcy5zZWVBbGxQdWxzZUFjdGl2ZSk7XG4gICAgdGhpcy5vYnNlcnZlU2VlQWxsVmlldygpO1xuICAgIHRoaXMuYXBwbHlTZWVBbGxIaWdobGlnaHRzKCk7XG4gIH1cblxuICAvLyBUaGUgU2VlIEFsbCBWaWV3IHJlbmRlcnMgaXRzIGNhcmRzIGxhemlseSBhbmQgcmUtcmVuZGVycyB0aGVtIG9uIGV2ZXJ5IGZlZWRcbiAgLy8gdXBkYXRlLCBzbyB0aGUgaGlnaGxpZ2h0IGlzIHJlLWFwcGxpZWQgd2hlbmV2ZXIgaXRzIGNoaWxkcmVuIGNoYW5nZS5cbiAgcHJpdmF0ZSBvYnNlcnZlU2VlQWxsVmlldygpOiB2b2lkIHtcbiAgICBjb25zdCB2aWV3ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoU0VFX0FMTF9WSUVXX0lEKTtcbiAgICBpZiAoIXZpZXcgfHwgdmlldyA9PT0gdGhpcy5vYnNlcnZlZFNlZUFsbFZpZXcpIHJldHVybjtcbiAgICB0aGlzLnNlZUFsbE9ic2VydmVyPy5kaXNjb25uZWN0KCk7XG4gICAgdGhpcy5zZWVBbGxPYnNlcnZlciA9IG5ldyBNdXRhdGlvbk9ic2VydmVyKCgpID0+IHRoaXMuYXBwbHlTZWVBbGxIaWdobGlnaHRzKCkpO1xuICAgIHRoaXMuc2VlQWxsT2JzZXJ2ZXIub2JzZXJ2ZSh2aWV3LCB7IGNoaWxkTGlzdDogdHJ1ZSwgc3VidHJlZTogdHJ1ZSB9KTtcbiAgICB0aGlzLm9ic2VydmVkU2VlQWxsVmlldyA9IHZpZXc7XG4gIH1cblxuICBwcml2YXRlIGFwcGx5U2VlQWxsSGlnaGxpZ2h0cygpOiB2b2lkIHtcbiAgICBjb25zdCB2aWV3ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoU0VFX0FMTF9WSUVXX0lEKTtcbiAgICBpZiAoIXZpZXcpIHJldHVybjtcbiAgICBmb3IgKGNvbnN0IHNsb3Qgb2YgQXJyYXkuZnJvbSh2aWV3LnF1ZXJ5U2VsZWN0b3JBbGw8SFRNTEVsZW1lbnQ+KCdbZGF0YS1sb2JieS1zbG90XScpKSkge1xuICAgICAgc2xvdC5jbGFzc0xpc3QudG9nZ2xlKFNFRV9BTExfTUFUQ0hfQ0xBU1MsIHRoaXMuc2VlQWxsTWF0Y2hJZHMuaGFzKHNsb3QuZGF0YXNldC5sb2JieVNsb3QgPz8gJycpKTtcbiAgICB9XG4gIH1cblxuICAvKiogT3BlbnMgdGhlIFNlZSBBbGwgVmlldyBvbiB0aGUgbG9iYnkncyBRdWV1ZS4gQ2FsbCBvbmx5IGZyb20gYSB1c2VyIGNsaWNrLiAqL1xuICBwcml2YXRlIG9wZW5TZWVBbGxWaWV3KHF1ZXVlOiBRdWV1ZVNvdXJjZSk6IHZvaWQge1xuICAgIGdldFBhZ2VXaW5kb3coKS5zaG93UGFnZT8uKFNFRV9BTExfVklFV19JRCk7XG4gICAgLy8gVGhlIHZpZXcgaGFzIG5vIEhvc3RlZCB0YWI7IGl0cyBkZWZhdWx0IFwiQWxsXCIgdGFiIHNob3dzIGV2ZXJ5IFF1ZXVlLlxuICAgIGlmIChxdWV1ZSA9PT0gJ2hvc3RlZCcpIHJldHVybjtcbiAgICBjb25zdCB2aWV3ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoU0VFX0FMTF9WSUVXX0lEKSBhc1xuICAgICAgfCAoSFRNTEVsZW1lbnQgJiB7IG9wZW4/OiAoYXJnczogeyB0YWI6IHN0cmluZyB9KSA9PiB2b2lkIH0pXG4gICAgICB8IG51bGw7XG4gICAgdmlldz8ub3Blbj8uKHsgdGFiOiBxdWV1ZSB9KTtcbiAgfVxuXG4gIHByaXZhdGUgYXBwbHlRdWV1ZUNhcmRQdWxzZXMoKTogdm9pZCB7XG4gICAgY29uc3QgY2FyZHMgPSB0aGlzLmdldFF1ZXVlQ2FyZEVsZW1lbnRzKCk7XG4gICAgZm9yIChjb25zdCBzb3VyY2Ugb2YgWydmZmEnLCAnc3BlY2lhbCcsICd0ZWFtJ10gYXMgY29uc3QpIHtcbiAgICAgIGNvbnN0IGNhcmQgPSBjYXJkc1tzb3VyY2VdO1xuICAgICAgaWYgKCFjYXJkKSBjb250aW51ZTtcbiAgICAgIGNhcmQuY2xhc3NMaXN0LnRvZ2dsZSgnb2YtZGlzY292ZXJ5LWNhcmQtYWN0aXZlJywgdGhpcy5hY3RpdmVNYXRjaFNvdXJjZXMuaGFzKHNvdXJjZSkpO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgc2NoZWR1bGVRdWV1ZUNhcmRQdWxzZVN5bmMoKTogdm9pZCB7XG4gICAgaWYgKHRoaXMucHVsc2VTeW5jVGltZW91dCkgY2xlYXJUaW1lb3V0KHRoaXMucHVsc2VTeW5jVGltZW91dCk7XG4gICAgdGhpcy5wdWxzZVN5bmNUaW1lb3V0ID0gc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICB0aGlzLnB1bHNlU3luY1RpbWVvdXQgPSBudWxsO1xuICAgICAgdGhpcy5hcHBseVF1ZXVlQ2FyZFB1bHNlcygpO1xuICAgICAgdGhpcy5hcHBseVNlZUFsbFNpZ25hbHMoKTtcbiAgICAgIC8vIExpdCByZS1yZW5kZXJzIHRoZSBuYXRpdmUgZ3JpZDsgcmUtYXBwbHkgdGhlIFVwIE5leHQgc3RyaXAgZnJvbSB0aGVcbiAgICAgIC8vIGxhc3Qga25vd24gc3RhdGUgc28gaXQgc3Vydml2ZXMgYSByZS1yZW5kZXIgdGhhdCBsYW5kcyB3aXRoaW4gMTYgbXMuXG4gICAgICB0aGlzLnJlbmRlclVwY29taW5nU3RyaXAodGhpcy5sYXN0VXBjb21pbmdTbG90cywgdGhpcy5sYXN0VXBjb21pbmdNYXRjaFNvdXJjZXMpO1xuICAgIH0sIDE2KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZWFkIE9wZW5Gcm9udCdzIGFzc2V0IG1hbmlmZXN0ICsgQ0ROIGJhc2UgZnJvbSB0aGUgcGFnZSBnbG9iYWxzIHNvIHVwY29taW5nXG4gICAqIGNhcmRzIHJldXNlIHRoZSBleGFjdCBDRE4gbWFwIHRodW1ibmFpbHMuIFJldHVybnMgbnVsbHMgd2hlbiB1bmF2YWlsYWJsZVxuICAgKiAoZS5nLiB1bnNhZmVXaW5kb3cgbm90IGdyYW50ZWQsIG9yIGluIHRlc3RzKS5cbiAgICovXG4gIHByaXZhdGUgZ2V0QXNzZXRDb250ZXh0KCk6IHsgbWFuaWZlc3Q6IFJlY29yZDxzdHJpbmcsIHN0cmluZz4gfCBudWxsOyBjZG5CYXNlOiBzdHJpbmcgfCBudWxsIH0ge1xuICAgIGNvbnN0IHdpbiA9IGdldFBhZ2VXaW5kb3coKTtcbiAgICAvLyBPcGVuRnJvbnQgdjAuMzIgcmVhZHMgYXNzZXRzIGZyb20gd2luZG93LkJPT1RTVFJBUF9DT05GSUcsIHdpdGggdGhlXG4gICAgLy8gZ2xvYmFsVGhpcy5fX0FTU0VUX01BTklGRVNUX18vX19DRE5fQkFTRV9fIHBhaXIgYXMgaXRzIG93biBmYWxsYmFjay4gTWlycm9yXG4gICAgLy8gdGhhdCBwcmVjZWRlbmNlIHNvIHVwY29taW5nIGNhcmRzIHJldXNlIHRoZSBleGFjdCBmaW5nZXJwcmludGVkIENETlxuICAgIC8vIHRodW1ibmFpbHM7IHNlZSBPcGVuRnJvbnQgcGFja2FnZXMvc2hhcmVkL3NyYy9Bc3NldFVybHMudHMgKGdldEFzc2V0TWFuaWZlc3QvZ2V0Q2RuQmFzZSkuXG4gICAgcmV0dXJuIHtcbiAgICAgIG1hbmlmZXN0OiB3aW4uQk9PVFNUUkFQX0NPTkZJRz8uYXNzZXRNYW5pZmVzdCA/PyB3aW4uX19BU1NFVF9NQU5JRkVTVF9fID8/IG51bGwsXG4gICAgICBjZG5CYXNlOiB3aW4uQk9PVFNUUkFQX0NPTkZJRz8uY2RuQmFzZSA/PyB3aW4uX19DRE5fQkFTRV9fID8/IG51bGwsXG4gICAgfTtcbiAgfVxuXG4gIHByaXZhdGUgZW5zdXJlVXBjb21pbmdTdHJpcCgpOiBIVE1MRGl2RWxlbWVudCB8IG51bGwge1xuICAgIGNvbnN0IGV4aXN0aW5nID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ29mLXVwY29taW5nLXN0cmlwJykgYXMgSFRNTERpdkVsZW1lbnQgfCBudWxsO1xuICAgIGlmIChleGlzdGluZykge1xuICAgICAgdGhpcy51cGNvbWluZ1N0cmlwID0gZXhpc3Rpbmc7XG4gICAgICByZXR1cm4gZXhpc3Rpbmc7XG4gICAgfVxuXG4gICAgY29uc3Qgc2VsZWN0b3IgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCdnYW1lLW1vZGUtc2VsZWN0b3InKTtcbiAgICBpZiAoIXNlbGVjdG9yIHx8ICFzZWxlY3Rvci5wYXJlbnROb2RlKSByZXR1cm4gbnVsbDtcblxuICAgIGNvbnN0IHN0cmlwID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gICAgc3RyaXAuaWQgPSAnb2YtdXBjb21pbmctc3RyaXAnO1xuICAgIHN0cmlwLmNsYXNzTmFtZSA9ICdvZi11cGNvbWluZyc7XG4gICAgc3RyaXAuaW5uZXJIVE1MID0gYFxuICAgICAgPGRpdiBjbGFzcz1cIm9mLXVwY29taW5nLWhlYWRcIj5cbiAgICAgICAgPHNwYW4gY2xhc3M9XCJvZi11cGNvbWluZy1sYmxcIj5VcCBOZXh0PC9zcGFuPlxuICAgICAgICA8c3BhbiBjbGFzcz1cIm9mLXVwY29taW5nLXJ1bGVcIj48L3NwYW4+XG4gICAgICAgIDxsYWJlbCBjbGFzcz1cIm9mLXVwY29taW5nLXRvZ2dsZVwiPlxuICAgICAgICAgIDxpbnB1dCB0eXBlPVwiY2hlY2tib3hcIiBpZD1cIm9mLXVwY29taW5nLXRvZ2dsZVwiPlxuICAgICAgICAgIDxzcGFuIGNsYXNzPVwib2YtdXBjb21pbmctc3dcIiBhcmlhLWhpZGRlbj1cInRydWVcIj48L3NwYW4+XG4gICAgICAgICAgPHNwYW4+Tm90aWZ5IG9uIHVwY29taW5nIGdhbWVzPC9zcGFuPlxuICAgICAgICA8L2xhYmVsPlxuICAgICAgPC9kaXY+XG4gICAgICA8ZGl2IGNsYXNzPVwib2YtdXBjb21pbmctZ3JpZFwiPlxuICAgICAgICA8ZGl2IGNsYXNzPVwib2YtdXBjb21pbmctc2xvdFwiIGRhdGEtc291cmNlPVwiZmZhXCI+PC9kaXY+XG4gICAgICAgIDxkaXYgY2xhc3M9XCJvZi11cGNvbWluZy1jb2xcIj5cbiAgICAgICAgICA8ZGl2IGNsYXNzPVwib2YtdXBjb21pbmctc2xvdFwiIGRhdGEtc291cmNlPVwic3BlY2lhbFwiPjwvZGl2PlxuICAgICAgICAgIDxkaXYgY2xhc3M9XCJvZi11cGNvbWluZy1zbG90XCIgZGF0YS1zb3VyY2U9XCJ0ZWFtXCI+PC9kaXY+XG4gICAgICAgIDwvZGl2PlxuICAgICAgPC9kaXY+XG4gICAgYDtcblxuICAgIHNlbGVjdG9yLnBhcmVudE5vZGUuaW5zZXJ0QmVmb3JlKHN0cmlwLCBzZWxlY3Rvci5uZXh0U2libGluZyk7XG4gICAgdGhpcy51cGNvbWluZ1N0cmlwID0gc3RyaXA7XG4gICAgLy8gRnJlc2ggRE9NIFx1MjAxNCBpbnZhbGlkYXRlIGNhY2hlZCBzaWduYXR1cmVzIHNvIGV2ZXJ5IHNsb3QgcmUtcmVuZGVycyBvbmNlLlxuICAgIHRoaXMudXBjb21pbmdTbG90U2lnbmF0dXJlcy5jbGVhcigpO1xuXG4gICAgY29uc3QgdG9nZ2xlID0gc3RyaXAucXVlcnlTZWxlY3RvcignI29mLXVwY29taW5nLXRvZ2dsZScpIGFzIEhUTUxJbnB1dEVsZW1lbnQgfCBudWxsO1xuICAgIGlmICh0b2dnbGUpIHtcbiAgICAgIHRvZ2dsZS5jaGVja2VkID0gdGhpcy5ub3RpZnlVcGNvbWluZ0VuYWJsZWQ7XG4gICAgICB0b2dnbGUuYWRkRXZlbnRMaXN0ZW5lcignY2hhbmdlJywgKCkgPT4ge1xuICAgICAgICB0aGlzLm5vdGlmeVVwY29taW5nRW5hYmxlZCA9IHRvZ2dsZS5jaGVja2VkO1xuICAgICAgICB0aGlzLnNhdmVTZXR0aW5ncygpO1xuICAgICAgICB0aGlzLnByb2Nlc3NMb2JiaWVzKHRoaXMubGFzdExvYmJpZXMpO1xuICAgICAgfSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHN0cmlwO1xuICB9XG5cbiAgcHJpdmF0ZSByZW5kZXJVcGNvbWluZ1N0cmlwKFxuICAgIHNsb3RzOiBNYXA8UXVldWVTb3VyY2UsIExvYmJ5U2xvdD4sXG4gICAgbWF0Y2hlZFNvdXJjZXM6IFNldDxRdWV1ZVNvdXJjZT5cbiAgKTogdm9pZCB7XG4gICAgdGhpcy5sYXN0VXBjb21pbmdTbG90cyA9IHNsb3RzO1xuICAgIHRoaXMubGFzdFVwY29taW5nTWF0Y2hTb3VyY2VzID0gbWF0Y2hlZFNvdXJjZXM7XG5cbiAgICBjb25zdCBzdHJpcCA9IHRoaXMuZW5zdXJlVXBjb21pbmdTdHJpcCgpO1xuICAgIGlmICghc3RyaXApIHJldHVybjtcblxuICAgIGNvbnN0IHZpc2libGUgPSAhdGhpcy5zbGVlcGluZyAmJiB0aGlzLmlzRGlzY292ZXJ5RmVlZGJhY2tBbGxvd2VkKCk7XG4gICAgc3RyaXAuc3R5bGUuZGlzcGxheSA9IHZpc2libGUgPyAnJyA6ICdub25lJztcbiAgICBpZiAoIXZpc2libGUpIHJldHVybjtcblxuICAgIGNvbnN0IHRvZ2dsZSA9IHN0cmlwLnF1ZXJ5U2VsZWN0b3IoJyNvZi11cGNvbWluZy10b2dnbGUnKSBhcyBIVE1MSW5wdXRFbGVtZW50IHwgbnVsbDtcbiAgICBpZiAodG9nZ2xlICYmIHRvZ2dsZS5jaGVja2VkICE9PSB0aGlzLm5vdGlmeVVwY29taW5nRW5hYmxlZCkge1xuICAgICAgdG9nZ2xlLmNoZWNrZWQgPSB0aGlzLm5vdGlmeVVwY29taW5nRW5hYmxlZDtcbiAgICB9XG5cbiAgICBjb25zdCB7IG1hbmlmZXN0LCBjZG5CYXNlIH0gPSB0aGlzLmdldEFzc2V0Q29udGV4dCgpO1xuXG4gICAgZm9yIChjb25zdCBzb3VyY2Ugb2YgVVBDT01JTkdfU09VUkNFX09SREVSKSB7XG4gICAgICBjb25zdCBjb250YWluZXIgPSBzdHJpcC5xdWVyeVNlbGVjdG9yKFxuICAgICAgICBgLm9mLXVwY29taW5nLXNsb3RbZGF0YS1zb3VyY2U9XCIke3NvdXJjZX1cIl1gXG4gICAgICApIGFzIEhUTUxFbGVtZW50IHwgbnVsbDtcbiAgICAgIGlmICghY29udGFpbmVyKSBjb250aW51ZTtcblxuICAgICAgY29uc3Qgc2xvdCA9IHNsb3RzLmdldChzb3VyY2UpO1xuICAgICAgY29uc3QgbWF0Y2hlZCA9IG1hdGNoZWRTb3VyY2VzLmhhcyhzb3VyY2UpO1xuICAgICAgLy8gT25seSBzaG93IGEgc2xvdCB0aGF0IGV4aXN0cyBpbiB0aGUgbGl2ZSBncmlkIChoYXMgYSBmZWF0dXJlZCBgWzBdYCksXG4gICAgICAvLyBzbyB0aGUgVXAgTmV4dCBjb2x1bW5zIGxpbmUgdXAgd2l0aCB0aGUgbmF0aXZlIGxvYmJ5IGNhcmRzLlxuICAgICAgY29uc3QgbW9kZWwgPVxuICAgICAgICBzbG90Py5saXZlICYmIHNsb3QudXBjb21pbmdcbiAgICAgICAgICA/IGJ1aWxkVXBjb21pbmdDYXJkTW9kZWwoc2xvdC51cGNvbWluZywgbWFuaWZlc3QsIGNkbkJhc2UpXG4gICAgICAgICAgOiBudWxsO1xuXG4gICAgICBjb25zdCBzaWduYXR1cmUgPSAhc2xvdD8ubGl2ZVxuICAgICAgICA/ICdoaWRkZW4nXG4gICAgICAgIDogIW1vZGVsXG4gICAgICAgICAgPyAnZW1wdHknXG4gICAgICAgICAgOiBKU09OLnN0cmluZ2lmeShbXG4gICAgICAgICAgICAgIG1vZGVsLmdhbWVJRCxcbiAgICAgICAgICAgICAgbWF0Y2hlZCxcbiAgICAgICAgICAgICAgbW9kZWwubWFwTmFtZSxcbiAgICAgICAgICAgICAgbW9kZWwubW9kZVRleHQsXG4gICAgICAgICAgICAgIG1vZGVsLmNhcGFjaXR5TGFiZWwsXG4gICAgICAgICAgICAgIG1vZGVsLm1vZGlmaWVyTGFiZWxzLFxuICAgICAgICAgICAgICBtb2RlbC50aHVtYm5haWxVcmwsXG4gICAgICAgICAgICBdKTtcblxuICAgICAgLy8gU2tpcCBzbG90cyB3aG9zZSByZW5kZXJlZCBjb250ZW50IGlzIGlkZW50aWNhbCBcdTIwMTQgdGhpcyBpcyB3aGF0IHByZXZlbnRzXG4gICAgICAvLyB0aGUgaG92ZXIgZmxpY2tlciBvbiBldmVyeSByZWZyZXNoLlxuICAgICAgaWYgKHRoaXMudXBjb21pbmdTbG90U2lnbmF0dXJlcy5nZXQoc291cmNlKSA9PT0gc2lnbmF0dXJlKSBjb250aW51ZTtcbiAgICAgIHRoaXMudXBjb21pbmdTbG90U2lnbmF0dXJlcy5zZXQoc291cmNlLCBzaWduYXR1cmUpO1xuXG4gICAgICBpZiAoc2lnbmF0dXJlID09PSAnaGlkZGVuJykge1xuICAgICAgICBjb250YWluZXIuc3R5bGUuZGlzcGxheSA9ICdub25lJztcbiAgICAgICAgY29udGFpbmVyLnJlcGxhY2VDaGlsZHJlbigpO1xuICAgICAgfSBlbHNlIGlmIChzaWduYXR1cmUgPT09ICdlbXB0eScpIHtcbiAgICAgICAgY29udGFpbmVyLnN0eWxlLmRpc3BsYXkgPSAnJztcbiAgICAgICAgY29uc3QgZW1wdHkgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgICAgICAgZW1wdHkuY2xhc3NOYW1lID0gJ29mLXVwY29taW5nLWVtcHR5JztcbiAgICAgICAgZW1wdHkudGV4dENvbnRlbnQgPSAnTm8gdXBjb21pbmcgZ2FtZSc7XG4gICAgICAgIGNvbnRhaW5lci5yZXBsYWNlQ2hpbGRyZW4oZW1wdHkpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY29udGFpbmVyLnN0eWxlLmRpc3BsYXkgPSAnJztcbiAgICAgICAgY29udGFpbmVyLnJlcGxhY2VDaGlsZHJlbih0aGlzLmJ1aWxkVXBjb21pbmdDYXJkRWxlbWVudChtb2RlbCEsIG1hdGNoZWQpKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBwcml2YXRlIGJ1aWxkVXBjb21pbmdDYXJkRWxlbWVudChtb2RlbDogVXBjb21pbmdDYXJkTW9kZWwsIG1hdGNoZWQ6IGJvb2xlYW4pOiBIVE1MQnV0dG9uRWxlbWVudCB7XG4gICAgY29uc3QgY2FyZCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2J1dHRvbicpO1xuICAgIGNhcmQudHlwZSA9ICdidXR0b24nO1xuICAgIC8vIEEgbWF0Y2hlZCB1cGNvbWluZyBjYXJkIHJldXNlcyB0aGUgbGl2ZSBtYXRjaCBiZWFjb24gKG9mLWRpc2NvdmVyeS1jYXJkLWFjdGl2ZSlcbiAgICAvLyBmb3IgaWRlbnRpY2FsIGhpZ2hsaWdodCBwYXJpdHksIHBsdXMgYSBtYXJrZXIgY2xhc3MgZm9yIGNoaXAvdGFnIGVtcGhhc2lzLlxuICAgIGNhcmQuY2xhc3NOYW1lID0gYG9mLXVwY29taW5nLWNhcmQke1xuICAgICAgbWF0Y2hlZCA/ICcgb2YtdXBjb21pbmctY2FyZC1tYXRjaCBvZi1kaXNjb3ZlcnktY2FyZC1hY3RpdmUnIDogJydcbiAgICB9YDtcblxuICAgIC8vIENhcCB0aGUgdmlzaWJsZSBtb2RpZmllciB0YWdzIHNvIGEgaGVhdmlseS1tb2RpZmllZCBsb2JieSBjYW4ndCBzdGFjayB0YWdzXG4gICAgLy8gZG93biBvdmVyIHRoZSBtYXAgbmFtZTsgdGhlIG92ZXJmbG93IGNvbGxhcHNlcyBpbnRvIGEgXCIrTlwiIGNoaXAuXG4gICAgY29uc3QgTUFYX1ZJU0lCTEVfVEFHUyA9IDM7XG4gICAgY29uc3Qgc2hvd25MYWJlbHMgPSBtb2RlbC5tb2RpZmllckxhYmVscy5zbGljZSgwLCBNQVhfVklTSUJMRV9UQUdTKTtcbiAgICBjb25zdCBleHRyYVRhZ3MgPSBtb2RlbC5tb2RpZmllckxhYmVscy5sZW5ndGggLSBzaG93bkxhYmVscy5sZW5ndGg7XG4gICAgbGV0IHRhZ3NIdG1sID0gc2hvd25MYWJlbHNcbiAgICAgIC5tYXAoKGxhYmVsKSA9PiBgPHNwYW4gY2xhc3M9XCJvZi11cGNvbWluZy10YWdcIj4ke2VzY2FwZUh0bWwobGFiZWwpfTwvc3Bhbj5gKVxuICAgICAgLmpvaW4oJycpO1xuICAgIGlmIChleHRyYVRhZ3MgPiAwKSB7XG4gICAgICB0YWdzSHRtbCArPSBgPHNwYW4gY2xhc3M9XCJvZi11cGNvbWluZy10YWcgb2YtdXBjb21pbmctdGFnLW1vcmVcIj4rJHtleHRyYVRhZ3N9PC9zcGFuPmA7XG4gICAgfVxuXG4gICAgY29uc3QgYXJ0SHRtbCA9IG1vZGVsLnRodW1ibmFpbFVybFxuICAgICAgPyBgPGltZyBzcmM9XCIke2VzY2FwZUh0bWwobW9kZWwudGh1bWJuYWlsVXJsKX1cIiBhbHQ9XCJcIiBsb2FkaW5nPVwibGF6eVwiPmBcbiAgICAgIDogJyc7XG4gICAgY29uc3QgY2hpcFRleHQgPSBtYXRjaGVkID8gJ01hdGNoIFx1MDBCNyB1cCBuZXh0JyA6ICdVcCBuZXh0JztcblxuICAgIC8vIE5vIGJlc3Bva2UgXCJKb2luXCIgYnV0dG9uOiB0aGUgd2hvbGUgY2FyZCBpcyBjbGlja2FibGUgYW5kIHNjYWxlcyBvbiBob3ZlcixcbiAgICAvLyBleGFjdGx5IGxpa2UgT3BlbkZyb250J3MgbmF0aXZlIGxvYmJ5IGNhcmRzLCBzbyB0aGUgYWZmb3JkYW5jZSBpcyBhbHJlYWR5XG4gICAgLy8gZmFtaWxpYXIuIFRoZSBhcmlhLWxhYmVsIGtlZXBzIHRoZSBtYW51YWwtam9pbiBpbnRlbnQgYWNjZXNzaWJsZS5cbiAgICBjYXJkLnNldEF0dHJpYnV0ZSgnYXJpYS1sYWJlbCcsIGBPcGVuICR7bW9kZWwubWFwTmFtZX0gaW4gT3BlbkZyb250J3Mgam9pbiBtb2RhbGApO1xuXG4gICAgY2FyZC5pbm5lckhUTUwgPSBgXG4gICAgICA8c3BhbiBjbGFzcz1cIm9mLXVwY29taW5nLWFydFwiPiR7YXJ0SHRtbH08L3NwYW4+XG4gICAgICA8c3BhbiBjbGFzcz1cIm9mLXVwY29taW5nLXRvcHJvd1wiPlxuICAgICAgICA8c3BhbiBjbGFzcz1cIm9mLXVwY29taW5nLXRhZ3NcIj4ke3RhZ3NIdG1sfTwvc3Bhbj5cbiAgICAgICAgPHNwYW4gY2xhc3M9XCJvZi11cGNvbWluZy1jaGlwXCI+PHNwYW4gY2xhc3M9XCJvZi11cGNvbWluZy1kb3RcIj48L3NwYW4+JHtjaGlwVGV4dH08L3NwYW4+XG4gICAgICA8L3NwYW4+XG4gICAgICA8c3BhbiBjbGFzcz1cIm9mLXVwY29taW5nLWJvdFwiPlxuICAgICAgICA8c3BhbiBjbGFzcz1cIm9mLXVwY29taW5nLW5hbWVcIj4ke2VzY2FwZUh0bWwobW9kZWwubWFwTmFtZSl9PC9zcGFuPlxuICAgICAgICA8c3BhbiBjbGFzcz1cIm9mLXVwY29taW5nLW1ldGFyb3dcIj5cbiAgICAgICAgICA8c3BhbiBjbGFzcz1cIm9mLXVwY29taW5nLW1vZGVcIj4ke2VzY2FwZUh0bWwobW9kZWwubW9kZVRleHQpfTwvc3Bhbj5cbiAgICAgICAgICAke1xuICAgICAgICAgICAgbW9kZWwuY2FwYWNpdHlMYWJlbFxuICAgICAgICAgICAgICA/IGA8c3BhbiBjbGFzcz1cIm9mLXVwY29taW5nLWNvdW50XCI+JHtJQ09OX1BMQVlFUlN9JHtlc2NhcGVIdG1sKG1vZGVsLmNhcGFjaXR5TGFiZWwpfTwvc3Bhbj5gXG4gICAgICAgICAgICAgIDogJydcbiAgICAgICAgICB9XG4gICAgICAgIDwvc3Bhbj5cbiAgICAgIDwvc3Bhbj5cbiAgICBgO1xuXG4gICAgLy8gVXNlci1nZXN0dXJlIG9ubHk6IG5hdmlnYXRpb24gaGFwcGVucyBzb2xlbHkgZnJvbSB0aGlzIHJlYWwgY2xpY2sgZXZlbnQsXG4gICAgLy8gbmV2ZXIgZnJvbSBtYXRjaGluZywgd2F0Y2hlcnMsIG9yIHRpbWVycy4gT3BlbkZyb250J3Mgcm91dGVyIG9wZW5zIGl0c1xuICAgIC8vIG93biBqb2luIG1vZGFsOyB0aGUgdXNlciBzdGlsbCBjb25maXJtcyBlbnRyeSB0aGVyZS5cbiAgICBjYXJkLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgKCkgPT4gdGhpcy5uYXZpZ2F0ZVRvR2FtZShgL2dhbWUvJHttb2RlbC5nYW1lSUR9YCkpO1xuXG4gICAgcmV0dXJuIGNhcmQ7XG4gIH1cblxuICBwcml2YXRlIG5hdmlnYXRlVG9HYW1lKHVybDogc3RyaW5nKTogdm9pZCB7XG4gICAgd2luZG93LmxvY2F0aW9uLmFzc2lnbih1cmwpO1xuICB9XG5cbiAgcHJpdmF0ZSBoaWRlVXBjb21pbmdTdHJpcCgpOiB2b2lkIHtcbiAgICBpZiAodGhpcy51cGNvbWluZ1N0cmlwKSB0aGlzLnVwY29taW5nU3RyaXAuc3R5bGUuZGlzcGxheSA9ICdub25lJztcbiAgfVxuXG4gIHByaXZhdGUgc3RvcFRpbWVyKCk6IHZvaWQge1xuICAgIGlmICh0aGlzLnRpbWVySW50ZXJ2YWwpIHtcbiAgICAgIGNsZWFySW50ZXJ2YWwodGhpcy50aW1lckludGVydmFsKTtcbiAgICAgIHRoaXMudGltZXJJbnRlcnZhbCA9IG51bGw7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBzdGFydEdhbWVJbmZvVXBkYXRlcygpOiB2b2lkIHtcbiAgICB0aGlzLnN0b3BHYW1lSW5mb1VwZGF0ZXMoKTtcbiAgICB0aGlzLnVwZGF0ZUN1cnJlbnRHYW1lSW5mbygpO1xuICAgIHRoaXMuZ2FtZUluZm9JbnRlcnZhbCA9IHNldEludGVydmFsKCgpID0+IHRoaXMudXBkYXRlQ3VycmVudEdhbWVJbmZvKCksIDEwMDApO1xuICB9XG5cbiAgcHJpdmF0ZSBzdG9wR2FtZUluZm9VcGRhdGVzKCk6IHZvaWQge1xuICAgIGlmICh0aGlzLmdhbWVJbmZvSW50ZXJ2YWwpIHtcbiAgICAgIGNsZWFySW50ZXJ2YWwodGhpcy5nYW1lSW5mb0ludGVydmFsKTtcbiAgICAgIHRoaXMuZ2FtZUluZm9JbnRlcnZhbCA9IG51bGw7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBzeW5jU2VhcmNoVGltZXIob3B0aW9uczogeyByZXNldFN0YXJ0PzogYm9vbGVhbiB9ID0ge30pOiB2b2lkIHtcbiAgICBjb25zdCB7IHJlc2V0U3RhcnQgPSBmYWxzZSB9ID0gb3B0aW9ucztcblxuICAgIHRoaXMuc3RvcFRpbWVyKCk7XG5cbiAgICBpZiAocmVzZXRTdGFydCkge1xuICAgICAgdGhpcy5zZWFyY2hTdGFydFRpbWUgPSBudWxsO1xuICAgICAgdGhpcy5sYXN0TWF0Y2hUaW1lID0gbnVsbDtcbiAgICAgIHRoaXMuc2VlbkxvYmJpZXMuY2xlYXIoKTtcbiAgICAgIHRoaXMuZGVza3RvcE5vdGlmaWVkTG9iYmllcy5jbGVhcigpO1xuICAgIH1cblxuICAgIGlmIChcbiAgICAgIHRoaXMuZGlzY292ZXJ5RW5hYmxlZCAmJlxuICAgICAgdGhpcy5jcml0ZXJpYUxpc3QubGVuZ3RoID4gMCAmJlxuICAgICAgdGhpcy5pc0Rpc2NvdmVyeUZlZWRiYWNrQWxsb3dlZCgpXG4gICAgKSB7XG4gICAgICBpZiAodGhpcy5zZWFyY2hTdGFydFRpbWUgPT09IG51bGwpIHRoaXMuc2VhcmNoU3RhcnRUaW1lID0gRGF0ZS5ub3coKTtcbiAgICAgIHRoaXMudGltZXJJbnRlcnZhbCA9IHNldEludGVydmFsKCgpID0+IHRoaXMudXBkYXRlU3RhdHVzVGV4dCgpLCAxMDAwKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5zZWFyY2hTdGFydFRpbWUgPSBudWxsO1xuICAgICAgdGhpcy5sYXN0TWF0Y2hUaW1lID0gbnVsbDtcbiAgICB9XG5cbiAgICB0aGlzLnVwZGF0ZVN0YXR1c1RleHQoKTtcbiAgICB0aGlzLnVwZGF0ZVB1bHNlSW5kaWNhdG9yKCk7XG4gIH1cblxuICBwcml2YXRlIHVwZGF0ZVB1bHNlSW5kaWNhdG9yKCk6IHZvaWQge1xuICAgIGNvbnN0IHB1bHNlID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignLmxkLXB1bHNlJykgYXMgSFRNTEVsZW1lbnQgfCBudWxsO1xuICAgIGlmICghcHVsc2UpIHJldHVybjtcbiAgICBjb25zdCBhY3RpdmUgPSB0aGlzLmRpc2NvdmVyeUVuYWJsZWQgJiYgdGhpcy5jcml0ZXJpYUxpc3QubGVuZ3RoID4gMDtcbiAgICBwdWxzZS5jbGFzc0xpc3QudG9nZ2xlKCdpcy1wYXVzZWQnLCAhYWN0aXZlKTtcbiAgfVxuXG4gIHByaXZhdGUgc2V0RGlzY292ZXJ5RW5hYmxlZChlbmFibGVkOiBib29sZWFuLCBvcHRpb25zOiB7IHJlc2V0VGltZXI/OiBib29sZWFuIH0gPSB7fSk6IHZvaWQge1xuICAgIHRoaXMuZGlzY292ZXJ5RW5hYmxlZCA9IGVuYWJsZWQ7XG4gICAgdGhpcy5zYXZlU2V0dGluZ3MoKTtcbiAgICB0aGlzLnVwZGF0ZVN0YXR1c0xhYmVsKCk7XG4gICAgdGhpcy5zeW5jU2VhcmNoVGltZXIoeyByZXNldFN0YXJ0OiBvcHRpb25zLnJlc2V0VGltZXIgPz8gZmFsc2UgfSk7XG4gIH1cblxuICBwcml2YXRlIHVwZGF0ZVN0YXR1c0xhYmVsKCk6IHZvaWQge1xuICAgIGNvbnN0IGxhYmVsID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignLmxkLXN0YXR1cy10ZXh0IHN0cm9uZycpIGFzIEhUTUxFbGVtZW50IHwgbnVsbDtcbiAgICBpZiAoIWxhYmVsKSByZXR1cm47XG4gICAgbGFiZWwudGV4dENvbnRlbnQgPSB0aGlzLmRpc2NvdmVyeUVuYWJsZWQgPyAnRGlzY292ZXJ5IGFjdGl2ZScgOiAnRGlzY292ZXJ5IHBhdXNlZCc7XG4gIH1cblxuICBwcml2YXRlIGdldE51bWJlclZhbHVlKGlkOiBzdHJpbmcpOiBudW1iZXIgfCBudWxsIHtcbiAgICBjb25zdCBpbnB1dCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKGlkKSBhcyBIVE1MSW5wdXRFbGVtZW50IHwgbnVsbDtcbiAgICBpZiAoIWlucHV0KSByZXR1cm4gbnVsbDtcbiAgICBjb25zdCB2YWwgPSBwYXJzZUludChpbnB1dC52YWx1ZSwgMTApO1xuICAgIHJldHVybiBOdW1iZXIuaXNOYU4odmFsKSA/IG51bGwgOiB2YWw7XG4gIH1cblxuICBwcml2YXRlIGdldE1vZGlmaWVyU3RhdGUoaWQ6IHN0cmluZyk6IE1vZGlmaWVyRmlsdGVyU3RhdGUge1xuICAgIGNvbnN0IGJ1dHRvbiA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKGlkKSBhcyBIVE1MQnV0dG9uRWxlbWVudCB8IG51bGw7XG4gICAgY29uc3Qgc3RhdGUgPSBidXR0b24/LmRhdGFzZXQuc3RhdGU7XG4gICAgaWYgKHN0YXRlID09PSAncmVxdWlyZWQnIHx8IHN0YXRlID09PSAnYmxvY2tlZCcpIHJldHVybiBzdGF0ZTtcbiAgICByZXR1cm4gJ2FueSc7XG4gIH1cblxuICBwcml2YXRlIHNldE1vZGlmaWVyU3RhdGUoaWQ6IHN0cmluZywgc3RhdGU6IE1vZGlmaWVyRmlsdGVyU3RhdGUpOiB2b2lkIHtcbiAgICBjb25zdCBidXR0b24gPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChpZCkgYXMgSFRNTEJ1dHRvbkVsZW1lbnQgfCBudWxsO1xuICAgIGlmIChidXR0b24pIHRoaXMuYXBwbHlUcmlTdGF0ZShidXR0b24sIHN0YXRlKTtcbiAgfVxuXG4gIHByaXZhdGUgYXBwbHlUcmlTdGF0ZShidXR0b246IEhUTUxFbGVtZW50LCBzdGF0ZTogTW9kaWZpZXJGaWx0ZXJTdGF0ZSk6IHZvaWQge1xuICAgIGJ1dHRvbi5kYXRhc2V0LnN0YXRlID0gc3RhdGU7XG4gICAgYnV0dG9uLnNldEF0dHJpYnV0ZSgnYXJpYS1wcmVzc2VkJywgU3RyaW5nKHN0YXRlICE9PSAnYW55JykpO1xuICAgIGNvbnN0IGJhc2VMYWJlbCA9IGJ1dHRvbi5kYXRhc2V0Lm1vZE5hbWUgPz8gYnV0dG9uLmdldEF0dHJpYnV0ZSgnYXJpYS1sYWJlbCcpID8/ICcnO1xuICAgIGNvbnN0IHN0YXRlV29yZCA9IHN0YXRlID09PSAnYmxvY2tlZCcgPyAnZXhjbHVkZWQnIDogc3RhdGU7XG4gICAgaWYgKGJhc2VMYWJlbCkge1xuICAgICAgYnV0dG9uLnNldEF0dHJpYnV0ZSgnYXJpYS1sYWJlbCcsIHN0YXRlID09PSAnYW55JyA/IGJhc2VMYWJlbCA6IGAke2Jhc2VMYWJlbH0gXHUwMEI3ICR7c3RhdGVXb3JkfWApO1xuICAgIH1cbiAgICBjb25zdCBpbmQgPSBidXR0b24ucXVlcnlTZWxlY3RvcignLmxkLW1vZC1pbmQnKSBhcyBIVE1MRWxlbWVudCB8IG51bGw7XG4gICAgaWYgKGluZCkge1xuICAgICAgaWYgKHN0YXRlID09PSAncmVxdWlyZWQnKSBpbmQuaW5uZXJIVE1MID0gSUNPTl9DSEVDSztcbiAgICAgIGVsc2UgaWYgKHN0YXRlID09PSAnYmxvY2tlZCcpIGluZC5pbm5lckhUTUwgPSBJQ09OX0NST1NTO1xuICAgICAgZWxzZSBpbmQuaW5uZXJIVE1MID0gJyc7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBjeWNsZU1vZGlmaWVyU3RhdGUoaWQ6IHN0cmluZyk6IHZvaWQge1xuICAgIHRoaXMuc2V0TW9kaWZpZXJTdGF0ZShpZCwgbmV4dFRyaVN0YXRlKHRoaXMuZ2V0TW9kaWZpZXJTdGF0ZShpZCkpKTtcbiAgfVxuXG4gIHByaXZhdGUgZ2V0TWFwQ2hpcHMoKTogSFRNTEJ1dHRvbkVsZW1lbnRbXSB7XG4gICAgcmV0dXJuIEFycmF5LmZyb20oXG4gICAgICBkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsPEhUTUxCdXR0b25FbGVtZW50PignI2Rpc2NvdmVyeS1tYXBzLWJvZHkgW2RhdGEtZ2FtZS1tYXBdJylcbiAgICApO1xuICB9XG5cbiAgcHJpdmF0ZSBjeWNsZU1hcFN0YXRlKGNoaXA6IEhUTUxCdXR0b25FbGVtZW50KTogdm9pZCB7XG4gICAgY29uc3QgZ2FtZU1hcCA9IGNoaXAuZGF0YXNldC5nYW1lTWFwID8/ICcnO1xuICAgIGNvbnN0IG5leHQgPSBuZXh0VHJpU3RhdGUodGhpcy5tYXBGaWx0ZXJbZ2FtZU1hcF0gPz8gJ2FueScpO1xuICAgIGNvbnN0IG1hcEZpbHRlciA9IHsgLi4udGhpcy5tYXBGaWx0ZXIgfTtcbiAgICBpZiAobmV4dCA9PT0gJ2FueScpIGRlbGV0ZSBtYXBGaWx0ZXJbZ2FtZU1hcF07XG4gICAgZWxzZSBtYXBGaWx0ZXJbZ2FtZU1hcF0gPSBuZXh0O1xuICAgIHRoaXMuc2V0TWFwRmlsdGVyKG1hcEZpbHRlcik7XG4gIH1cblxuICBwcml2YXRlIHNldE1hcEZpbHRlcihtYXBGaWx0ZXI6IE1hcEZpbHRlcik6IHZvaWQge1xuICAgIHRoaXMubWFwRmlsdGVyID0gbWFwRmlsdGVyO1xuICAgIHRoaXMuc3luY01hcENoaXBzKCk7XG4gICAgdGhpcy5zYXZlU2V0dGluZ3MoKTtcbiAgICB0aGlzLnN5bmNTZWFyY2hUaW1lcih7IHJlc2V0U3RhcnQ6IHRydWUgfSk7XG4gICAgdGhpcy5wcm9jZXNzTG9iYmllcyh0aGlzLmxhc3RMb2JiaWVzKTtcbiAgfVxuXG4gIHByaXZhdGUgc3luY01hcENoaXBzKCk6IHZvaWQge1xuICAgIGZvciAoY29uc3QgY2hpcCBvZiB0aGlzLmdldE1hcENoaXBzKCkpIHtcbiAgICAgIHRoaXMuYXBwbHlUcmlTdGF0ZShjaGlwLCB0aGlzLm1hcEZpbHRlcltjaGlwLmRhdGFzZXQuZ2FtZU1hcCA/PyAnJ10gPz8gJ2FueScpO1xuICAgIH1cbiAgICBjb25zdCBzdGF0ZXMgPSBPYmplY3QudmFsdWVzKHRoaXMubWFwRmlsdGVyKTtcbiAgICBjb25zdCByZXF1aXJlZCA9IHN0YXRlcy5maWx0ZXIoKHN0YXRlKSA9PiBzdGF0ZSA9PT0gJ3JlcXVpcmVkJykubGVuZ3RoO1xuICAgIGNvbnN0IGJsb2NrZWQgPSBzdGF0ZXMuZmlsdGVyKChzdGF0ZSkgPT4gc3RhdGUgPT09ICdibG9ja2VkJykubGVuZ3RoO1xuICAgIGNvbnN0IHBhcnRzID0gW1xuICAgICAgLi4uKHJlcXVpcmVkID4gMCA/IFtgJHtyZXF1aXJlZH0gcmVxdWlyZWRgXSA6IFtdKSxcbiAgICAgIC4uLihibG9ja2VkID4gMCA/IFtgJHtibG9ja2VkfSBleGNsdWRlZGBdIDogW10pLFxuICAgIF07XG4gICAgY29uc3Qgc3VtbWFyeSA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdkaXNjb3ZlcnktbWFwcy1zdW1tYXJ5Jyk7XG4gICAgaWYgKHN1bW1hcnkpIHN1bW1hcnkudGV4dENvbnRlbnQgPSBwYXJ0cy5sZW5ndGggPiAwID8gcGFydHMuam9pbignIFx1MDBCNyAnKSA6ICdBbnkgbWFwJztcbiAgfVxuXG4gIHByaXZhdGUgZmlsdGVyTWFwQ2hpcHMocXVlcnk6IHN0cmluZyk6IHZvaWQge1xuICAgIGNvbnN0IG5lZWRsZSA9IHF1ZXJ5LnRyaW0oKS50b0xvd2VyQ2FzZSgpO1xuICAgIGZvciAoY29uc3QgY2hpcCBvZiB0aGlzLmdldE1hcENoaXBzKCkpIHtcbiAgICAgIGNoaXAuaGlkZGVuID0gbmVlZGxlICE9PSAnJyAmJiAhKGNoaXAuZGF0YXNldC5tb2ROYW1lID8/ICcnKS50b0xvd2VyQ2FzZSgpLmluY2x1ZGVzKG5lZWRsZSk7XG4gICAgfVxuICAgIGZvciAoY29uc3QgZ3JvdXAgb2YgQXJyYXkuZnJvbShcbiAgICAgIGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGw8SFRNTEVsZW1lbnQ+KCcjZGlzY292ZXJ5LW1hcHMtYm9keSBbZGF0YS1jYXRlZ29yeV0nKVxuICAgICkpIHtcbiAgICAgIGdyb3VwLmhpZGRlbiA9ICFncm91cC5xdWVyeVNlbGVjdG9yKCdbZGF0YS1nYW1lLW1hcF06bm90KFtoaWRkZW5dKScpO1xuICAgIH1cbiAgfVxuXG4gIC8vIEEgbWFwIHRoYXQgT3BlbkZyb250IGFkZGVkIGFmdGVyIHRoZSBjYXRhbG9ndWUgd2FzIGdlbmVyYXRlZCBzdGlsbCBnZXRzIGEgY2hpcC5cbiAgcHJpdmF0ZSBhZGRGZWVkT25seU1hcHMobG9iYmllczogTG9iYnlbXSk6IHZvaWQge1xuICAgIGZvciAoY29uc3QgbG9iYnkgb2YgbG9iYmllcykge1xuICAgICAgY29uc3QgZ2FtZU1hcCA9IGxvYmJ5LmdhbWVDb25maWc/LmdhbWVNYXA/LnRyaW0oKTtcbiAgICAgIGlmICghZ2FtZU1hcCB8fCB0aGlzLmtub3duTWFwcy5oYXMoZ2FtZU1hcCkpIGNvbnRpbnVlO1xuICAgICAgdGhpcy5rbm93bk1hcHMuYWRkKGdhbWVNYXApO1xuICAgICAgY29uc3QgbW9kcyA9IHRoaXMuZW5zdXJlTWFwR3JvdXAoJ290aGVyJyk7XG4gICAgICBpZiAoIW1vZHMpIGNvbnRpbnVlO1xuICAgICAgbW9kcy5pbnNlcnRBZGphY2VudEhUTUwoJ2JlZm9yZWVuZCcsIHRoaXMucmVuZGVyTWFwQ2hpcChnYW1lTWFwLCBnYW1lTWFwKSk7XG4gICAgICBjb25zdCBjaGlwID0gbW9kcy5sYXN0RWxlbWVudENoaWxkIGFzIEhUTUxCdXR0b25FbGVtZW50O1xuICAgICAgY2hpcC5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsICgpID0+IHRoaXMuY3ljbGVNYXBTdGF0ZShjaGlwKSk7XG4gICAgICB0aGlzLmFwcGx5VHJpU3RhdGUoY2hpcCwgdGhpcy5tYXBGaWx0ZXJbZ2FtZU1hcF0gPz8gJ2FueScpO1xuICAgICAgY29uc3Qgc2VhcmNoID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2Rpc2NvdmVyeS1tYXBzLXNlYXJjaCcpIGFzIEhUTUxJbnB1dEVsZW1lbnQgfCBudWxsO1xuICAgICAgdGhpcy5maWx0ZXJNYXBDaGlwcyhzZWFyY2g/LnZhbHVlID8/ICcnKTtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIGVuc3VyZU1hcEdyb3VwKGNhdGVnb3J5OiBNYXBDYXRlZ29yeSk6IEhUTUxFbGVtZW50IHwgbnVsbCB7XG4gICAgY29uc3QgZ3JvdXBzID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2Rpc2NvdmVyeS1tYXBzLWdyb3VwcycpO1xuICAgIGlmICghZ3JvdXBzKSByZXR1cm4gbnVsbDtcbiAgICBjb25zdCBleGlzdGluZyA9IGdyb3Vwcy5xdWVyeVNlbGVjdG9yKGBbZGF0YS1jYXRlZ29yeT1cIiR7Y2F0ZWdvcnl9XCJdIC5sZC1tb2RzYCk7XG4gICAgaWYgKGV4aXN0aW5nKSByZXR1cm4gZXhpc3RpbmcgYXMgSFRNTEVsZW1lbnQ7XG4gICAgZ3JvdXBzLmluc2VydEFkamFjZW50SFRNTCgnYmVmb3JlZW5kJywgdGhpcy5yZW5kZXJNYXBHcm91cChjYXRlZ29yeSwgJycpKTtcbiAgICByZXR1cm4gZ3JvdXBzLnF1ZXJ5U2VsZWN0b3IoYFtkYXRhLWNhdGVnb3J5PVwiJHtjYXRlZ29yeX1cIl0gLmxkLW1vZHNgKTtcbiAgfVxuXG4gIHByaXZhdGUgZ2V0TnVtZXJpY01vZGlmaWVyU3RhdGUoXG4gICAgaWRzOiBSZWNvcmQ8bnVtYmVyLCBzdHJpbmc+XG4gICk6IFJlY29yZDxudW1iZXIsIE1vZGlmaWVyRmlsdGVyU3RhdGU+IHwgdW5kZWZpbmVkIHtcbiAgICBjb25zdCBzdGF0ZXM6IFJlY29yZDxudW1iZXIsIE1vZGlmaWVyRmlsdGVyU3RhdGU+ID0ge307XG4gICAgZm9yIChjb25zdCBbbnVtZXJpY1ZhbHVlLCBpZF0gb2YgT2JqZWN0LmVudHJpZXMoaWRzKSkge1xuICAgICAgc3RhdGVzW051bWJlcihudW1lcmljVmFsdWUpXSA9IHRoaXMuZ2V0TW9kaWZpZXJTdGF0ZShpZCk7XG4gICAgfVxuICAgIHJldHVybiBzdGF0ZXM7XG4gIH1cblxuICBwcml2YXRlIGdldE1vZGlmaWVyRmlsdGVyc0Zyb21VSSgpOiBNb2RpZmllckZpbHRlcnMge1xuICAgIHJldHVybiB7XG4gICAgICBpc0NvbXBhY3Q6IHRoaXMuZ2V0TW9kaWZpZXJTdGF0ZSgnbW9kaWZpZXItaXNDb21wYWN0JyksXG4gICAgICBpc1JhbmRvbVNwYXduOiB0aGlzLmdldE1vZGlmaWVyU3RhdGUoJ21vZGlmaWVyLWlzUmFuZG9tU3Bhd24nKSxcbiAgICAgIGlzQ3Jvd2RlZDogdGhpcy5nZXRNb2RpZmllclN0YXRlKCdtb2RpZmllci1pc0Nyb3dkZWQnKSxcbiAgICAgIGlzSGFyZE5hdGlvbnM6IHRoaXMuZ2V0TW9kaWZpZXJTdGF0ZSgnbW9kaWZpZXItaXNIYXJkTmF0aW9ucycpLFxuICAgICAgaXNBbGxpYW5jZXNEaXNhYmxlZDogdGhpcy5nZXRNb2RpZmllclN0YXRlKCdtb2RpZmllci1pc0FsbGlhbmNlc0Rpc2FibGVkJyksXG4gICAgICBpc051a2VzRGlzYWJsZWQ6IHRoaXMuZ2V0TW9kaWZpZXJTdGF0ZSgnbW9kaWZpZXItaXNOdWtlc0Rpc2FibGVkJyksXG4gICAgICBpc1NBTXNEaXNhYmxlZDogdGhpcy5nZXRNb2RpZmllclN0YXRlKCdtb2RpZmllci1pc1NBTXNEaXNhYmxlZCcpLFxuICAgICAgaXNQZWFjZVRpbWU6IHRoaXMuZ2V0TW9kaWZpZXJTdGF0ZSgnbW9kaWZpZXItaXNQZWFjZVRpbWUnKSxcbiAgICAgIGlzV2F0ZXJOdWtlczogdGhpcy5nZXRNb2RpZmllclN0YXRlKCdtb2RpZmllci1pc1dhdGVyTnVrZXMnKSxcbiAgICAgIGlzRG9vbXNkYXlDbG9jazogdGhpcy5nZXRNb2RpZmllclN0YXRlKCdtb2RpZmllci1pc0Rvb21zZGF5Q2xvY2snKSxcbiAgICAgIGlzVHJ1c3RlZDogdGhpcy5nZXRNb2RpZmllclN0YXRlKCdtb2RpZmllci1pc1RydXN0ZWQnKSxcbiAgICAgIHN0YXJ0aW5nR29sZDogdGhpcy5nZXROdW1lcmljTW9kaWZpZXJTdGF0ZSh7XG4gICAgICAgIDEwMDAwMDA6ICdtb2RpZmllci1zdGFydGluZ0dvbGQtMTAwMDAwMCcsXG4gICAgICAgIDUwMDAwMDA6ICdtb2RpZmllci1zdGFydGluZ0dvbGQtNTAwMDAwMCcsXG4gICAgICAgIDI1MDAwMDAwOiAnbW9kaWZpZXItc3RhcnRpbmdHb2xkLTI1MDAwMDAwJyxcbiAgICAgIH0pLFxuICAgICAgZ29sZE11bHRpcGxpZXI6IHRoaXMuZ2V0TnVtZXJpY01vZGlmaWVyU3RhdGUoe1xuICAgICAgICAyOiAnbW9kaWZpZXItZ29sZE11bHRpcGxpZXItMicsXG4gICAgICB9KSxcbiAgICB9O1xuICB9XG5cbiAgcHJpdmF0ZSBnZXRBbGxUZWFtQ291bnRWYWx1ZXMoKTogVGVhbUNvdW50W10ge1xuICAgIGNvbnN0IHZhbHVlczogVGVhbUNvdW50W10gPSBbXTtcbiAgICBmb3IgKGNvbnN0IGlkIG9mIEFMTF9URUFNX0lEUykge1xuICAgICAgY29uc3QgY2hlY2tib3ggPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChpZCkgYXMgSFRNTElucHV0RWxlbWVudCB8IG51bGw7XG4gICAgICBpZiAoIWNoZWNrYm94Py5jaGVja2VkKSBjb250aW51ZTtcbiAgICAgIGNvbnN0IHZhbHVlID0gY2hlY2tib3gudmFsdWU7XG4gICAgICBpZiAodmFsdWUgPT09ICdIdW1hbnMgVnMgTmF0aW9ucycgfHwgdmFsdWUgPT09ICc4KycpIHtcbiAgICAgICAgdmFsdWVzLnB1c2godmFsdWUpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY29uc3QgbnVtZXJpYyA9IHBhcnNlSW50KHZhbHVlLCAxMCk7XG4gICAgICAgIGlmICghTnVtYmVyLmlzTmFOKG51bWVyaWMpKSB2YWx1ZXMucHVzaChudW1lcmljKTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHZhbHVlcztcbiAgfVxuXG4gIHByaXZhdGUgc2V0QWxsVGVhbUNvdW50cyhjaGVja2VkOiBib29sZWFuKTogdm9pZCB7XG4gICAgZm9yIChjb25zdCBpZCBvZiBBTExfVEVBTV9JRFMpIHtcbiAgICAgIGNvbnN0IGNoZWNrYm94ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoaWQpIGFzIEhUTUxJbnB1dEVsZW1lbnQgfCBudWxsO1xuICAgICAgaWYgKCFjaGVja2JveCkgY29udGludWU7XG4gICAgICBjaGVja2JveC5jaGVja2VkID0gY2hlY2tlZDtcbiAgICAgIHRoaXMuc3luY0NoaXBTdGF0ZShpZCk7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBzeW5jQ2hpcFN0YXRlKGNoZWNrYm94SWQ6IHN0cmluZyk6IHZvaWQge1xuICAgIGNvbnN0IGNoZWNrYm94ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoY2hlY2tib3hJZCkgYXMgSFRNTElucHV0RWxlbWVudCB8IG51bGw7XG4gICAgaWYgKCFjaGVja2JveCkgcmV0dXJuO1xuICAgIGNvbnN0IGNoaXAgPSBjaGVja2JveC5jbG9zZXN0KCcubGQtY2hpcCwgLmxkLW1vZGUtYnRuLCAubGQtMngnKSBhcyBIVE1MRWxlbWVudCB8IG51bGw7XG4gICAgaWYgKCFjaGlwKSByZXR1cm47XG4gICAgY2hpcC5jbGFzc0xpc3QudG9nZ2xlKCdpcy1vbicsIGNoZWNrYm94LmNoZWNrZWQpO1xuICAgIGNoaXAuc2V0QXR0cmlidXRlKCdhcmlhLXByZXNzZWQnLCBTdHJpbmcoY2hlY2tib3guY2hlY2tlZCkpO1xuICB9XG5cbiAgcHJpdmF0ZSBidWlsZENyaXRlcmlhRnJvbVVJKCk6IERpc2NvdmVyeUNyaXRlcmlhW10ge1xuICAgIGNvbnN0IG1vZGlmaWVycyA9IHRoaXMuZ2V0TW9kaWZpZXJGaWx0ZXJzRnJvbVVJKCk7XG4gICAgY29uc3QgY3JpdGVyaWE6IERpc2NvdmVyeUNyaXRlcmlhW10gPSBbXTtcblxuICAgIGNvbnN0IGZmYUNoZWNrYm94ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2Rpc2NvdmVyeS1mZmEnKSBhcyBIVE1MSW5wdXRFbGVtZW50IHwgbnVsbDtcbiAgICBpZiAoZmZhQ2hlY2tib3g/LmNoZWNrZWQpIHtcbiAgICAgIGNyaXRlcmlhLnB1c2goe1xuICAgICAgICBnYW1lTW9kZTogJ0ZGQScsXG4gICAgICAgIHRlYW1Db3VudDogbnVsbCxcbiAgICAgICAgbWluUGxheWVyczogdGhpcy5nZXROdW1iZXJWYWx1ZSgnZGlzY292ZXJ5LWZmYS1taW4nKSxcbiAgICAgICAgbWF4UGxheWVyczogdGhpcy5nZXROdW1iZXJWYWx1ZSgnZGlzY292ZXJ5LWZmYS1tYXgnKSxcbiAgICAgICAgbW9kaWZpZXJzLFxuICAgICAgfSk7XG4gICAgfVxuXG4gICAgY29uc3QgdGVhbUNoZWNrYm94ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2Rpc2NvdmVyeS10ZWFtJykgYXMgSFRNTElucHV0RWxlbWVudCB8IG51bGw7XG4gICAgaWYgKCF0ZWFtQ2hlY2tib3g/LmNoZWNrZWQpIHJldHVybiBjcml0ZXJpYTtcblxuICAgIGNvbnN0IHRlYW1Db3VudHMgPSB0aGlzLmdldEFsbFRlYW1Db3VudFZhbHVlcygpO1xuICAgIGlmICh0ZWFtQ291bnRzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgY3JpdGVyaWEucHVzaCh7XG4gICAgICAgIGdhbWVNb2RlOiAnVGVhbScsXG4gICAgICAgIHRlYW1Db3VudDogbnVsbCxcbiAgICAgICAgbWluUGxheWVyczogdGhpcy5nZXROdW1iZXJWYWx1ZSgnZGlzY292ZXJ5LXRlYW0tbWluJyksXG4gICAgICAgIG1heFBsYXllcnM6IHRoaXMuZ2V0TnVtYmVyVmFsdWUoJ2Rpc2NvdmVyeS10ZWFtLW1heCcpLFxuICAgICAgICBtb2RpZmllcnMsXG4gICAgICB9KTtcbiAgICAgIHJldHVybiBjcml0ZXJpYTtcbiAgICB9XG5cbiAgICBmb3IgKGNvbnN0IHRlYW1Db3VudCBvZiB0ZWFtQ291bnRzKSB7XG4gICAgICBjcml0ZXJpYS5wdXNoKHtcbiAgICAgICAgZ2FtZU1vZGU6ICdUZWFtJyxcbiAgICAgICAgdGVhbUNvdW50LFxuICAgICAgICBtaW5QbGF5ZXJzOiB0aGlzLmdldE51bWJlclZhbHVlKCdkaXNjb3ZlcnktdGVhbS1taW4nKSxcbiAgICAgICAgbWF4UGxheWVyczogdGhpcy5nZXROdW1iZXJWYWx1ZSgnZGlzY292ZXJ5LXRlYW0tbWF4JyksXG4gICAgICAgIG1vZGlmaWVycyxcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIHJldHVybiBjcml0ZXJpYTtcbiAgfVxuXG4gIHByaXZhdGUgdXBkYXRlRmlsdGVyQ291bnQoKTogdm9pZCB7XG4gICAgY29uc3QgbnVtID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2Rpc2NvdmVyeS1maWx0ZXItY291bnQnKTtcbiAgICBjb25zdCB3b3JkRWwgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnZGlzY292ZXJ5LWZpbHRlci13b3JkJyk7XG4gICAgaWYgKCFudW0gfHwgIXdvcmRFbCkgcmV0dXJuO1xuXG4gICAgY29uc3QgZmZhT24gPSAoZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2Rpc2NvdmVyeS1mZmEnKSBhcyBIVE1MSW5wdXRFbGVtZW50IHwgbnVsbCk/LmNoZWNrZWQ7XG4gICAgY29uc3QgdGVhbU9uID0gKGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdkaXNjb3ZlcnktdGVhbScpIGFzIEhUTUxJbnB1dEVsZW1lbnQgfCBudWxsKT8uY2hlY2tlZDtcbiAgICBjb25zdCBmb3JtYXRzT24gPSBBTExfVEVBTV9JRFMuZmlsdGVyKFxuICAgICAgKGlkKSA9PiAoZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoaWQpIGFzIEhUTUxJbnB1dEVsZW1lbnQgfCBudWxsKT8uY2hlY2tlZFxuICAgICkubGVuZ3RoO1xuICAgIGNvbnN0IG1vZHNPbiA9IFtcbiAgICAgIC4uLk1PRElGSUVSX0JPT0xFQU5fSURTLFxuICAgICAgLi4uU1RBUlRJTkdfR09MRF9WQUxVRVMubWFwKCh2KSA9PiBgbW9kaWZpZXItc3RhcnRpbmdHb2xkLSR7dn1gKSxcbiAgICAgIC4uLkdPTERfTVVMVElQTElFUl9WQUxVRVMubWFwKCh2KSA9PiBgbW9kaWZpZXItZ29sZE11bHRpcGxpZXItJHt2fWApLFxuICAgIF0uZmlsdGVyKChpZCkgPT4gdGhpcy5nZXRNb2RpZmllclN0YXRlKGlkKSAhPT0gJ2FueScpLmxlbmd0aDtcblxuICAgIGNvbnN0IGNvdW50ID0gKGZmYU9uID8gMSA6IDApICsgKHRlYW1PbiA/IDEgOiAwKSArIGZvcm1hdHNPbiArIG1vZHNPbjtcbiAgICBudW0udGV4dENvbnRlbnQgPSBTdHJpbmcoY291bnQpO1xuICAgIHdvcmRFbC50ZXh0Q29udGVudCA9IGNvdW50ID09PSAxID8gJ2ZpbHRlcicgOiAnZmlsdGVycyc7XG4gIH1cblxuICBwcml2YXRlIHNldE1vZGVQYW5lbEFjdGl2ZShwYW5lbElkOiBzdHJpbmcsIGFjdGl2ZTogYm9vbGVhbik6IHZvaWQge1xuICAgIGNvbnN0IGVsID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQocGFuZWxJZCk7XG4gICAgaWYgKGVsKSBlbC5jbGFzc0xpc3QudG9nZ2xlKCdpcy1vZmYnLCAhYWN0aXZlKTtcbiAgfVxuXG4gIHByaXZhdGUgc2V0SWNvbkJ1dHRvblN0YXRlKGNoZWNrYm94SWQ6IHN0cmluZywgb246IGJvb2xlYW4pOiB2b2lkIHtcbiAgICBjb25zdCBidG4gPSBkb2N1bWVudFxuICAgICAgLmdldEVsZW1lbnRCeUlkKGNoZWNrYm94SWQpXG4gICAgICA/LmNsb3Nlc3QoJy5sZC1pY29uLWJ0bicpIGFzIEhUTUxFbGVtZW50IHwgbnVsbDtcbiAgICBpZiAoYnRuKSBidG4uY2xhc3NMaXN0LnRvZ2dsZSgnaXMtb24nLCBvbik7XG4gIH1cblxuICBwcml2YXRlIGxvYWRVSUZyb21TZXR0aW5ncygpOiB2b2lkIHtcbiAgICBjb25zdCBmZmFDcml0ZXJpYSA9IHRoaXMuY3JpdGVyaWFMaXN0LmZpbmQoKGMpID0+IGMuZ2FtZU1vZGUgPT09ICdGRkEnKTtcbiAgICBjb25zdCB0ZWFtQ3JpdGVyaWEgPSB0aGlzLmNyaXRlcmlhTGlzdC5maWx0ZXIoKGMpID0+IGMuZ2FtZU1vZGUgPT09ICdUZWFtJyk7XG5cbiAgICBjb25zdCBmZmFDaGVja2JveCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdkaXNjb3ZlcnktZmZhJykgYXMgSFRNTElucHV0RWxlbWVudCB8IG51bGw7XG4gICAgY29uc3QgdGVhbUNoZWNrYm94ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2Rpc2NvdmVyeS10ZWFtJykgYXMgSFRNTElucHV0RWxlbWVudCB8IG51bGw7XG4gICAgaWYgKGZmYUNoZWNrYm94KSB7XG4gICAgICBmZmFDaGVja2JveC5jaGVja2VkID0gISFmZmFDcml0ZXJpYTtcbiAgICAgIHRoaXMuc3luY0NoaXBTdGF0ZSgnZGlzY292ZXJ5LWZmYScpO1xuICAgICAgdGhpcy5zZXRNb2RlUGFuZWxBY3RpdmUoJ2Rpc2NvdmVyeS1mZmEtY29uZmlnJywgISFmZmFDcml0ZXJpYSk7XG4gICAgfVxuICAgIGlmICh0ZWFtQ2hlY2tib3gpIHtcbiAgICAgIHRlYW1DaGVja2JveC5jaGVja2VkID0gdGVhbUNyaXRlcmlhLmxlbmd0aCA+IDA7XG4gICAgICB0aGlzLnN5bmNDaGlwU3RhdGUoJ2Rpc2NvdmVyeS10ZWFtJyk7XG4gICAgICB0aGlzLnNldE1vZGVQYW5lbEFjdGl2ZSgnZGlzY292ZXJ5LXRlYW0tY29uZmlnJywgdGVhbUNyaXRlcmlhLmxlbmd0aCA+IDApO1xuICAgIH1cblxuICAgIGlmIChmZmFDcml0ZXJpYSkge1xuICAgICAgY29uc3QgbWluID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2Rpc2NvdmVyeS1mZmEtbWluJykgYXMgSFRNTElucHV0RWxlbWVudCB8IG51bGw7XG4gICAgICBjb25zdCBtYXggPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnZGlzY292ZXJ5LWZmYS1tYXgnKSBhcyBIVE1MSW5wdXRFbGVtZW50IHwgbnVsbDtcbiAgICAgIGlmIChtaW4gJiYgZmZhQ3JpdGVyaWEubWluUGxheWVycyAhPT0gbnVsbCkgbWluLnZhbHVlID0gU3RyaW5nKGZmYUNyaXRlcmlhLm1pblBsYXllcnMpO1xuICAgICAgaWYgKG1heCAmJiBmZmFDcml0ZXJpYS5tYXhQbGF5ZXJzICE9PSBudWxsKSBtYXgudmFsdWUgPSBTdHJpbmcoZmZhQ3JpdGVyaWEubWF4UGxheWVycyk7XG4gICAgfVxuXG4gICAgaWYgKHRlYW1Dcml0ZXJpYVswXSkge1xuICAgICAgY29uc3QgbWluID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2Rpc2NvdmVyeS10ZWFtLW1pbicpIGFzIEhUTUxJbnB1dEVsZW1lbnQgfCBudWxsO1xuICAgICAgY29uc3QgbWF4ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2Rpc2NvdmVyeS10ZWFtLW1heCcpIGFzIEhUTUxJbnB1dEVsZW1lbnQgfCBudWxsO1xuICAgICAgaWYgKG1pbiAmJiB0ZWFtQ3JpdGVyaWFbMF0ubWluUGxheWVycyAhPT0gbnVsbCkgbWluLnZhbHVlID0gU3RyaW5nKHRlYW1Dcml0ZXJpYVswXS5taW5QbGF5ZXJzKTtcbiAgICAgIGlmIChtYXggJiYgdGVhbUNyaXRlcmlhWzBdLm1heFBsYXllcnMgIT09IG51bGwpIG1heC52YWx1ZSA9IFN0cmluZyh0ZWFtQ3JpdGVyaWFbMF0ubWF4UGxheWVycyk7XG4gICAgICB0aGlzLnNldFRlYW1Db3VudFNlbGVjdGlvbnModGVhbUNyaXRlcmlhLm1hcCgoYykgPT4gYy50ZWFtQ291bnQpKTtcbiAgICB9XG5cbiAgICBjb25zdCBtb2RpZmllcnMgPSAoZmZhQ3JpdGVyaWEgPz8gdGVhbUNyaXRlcmlhWzBdKT8ubW9kaWZpZXJzO1xuICAgIGlmIChtb2RpZmllcnMpIHtcbiAgICAgIHRoaXMuc2V0TW9kaWZpZXJTdGF0ZSgnbW9kaWZpZXItaXNDb21wYWN0JywgbW9kaWZpZXJzLmlzQ29tcGFjdCA/PyAnYW55Jyk7XG4gICAgICB0aGlzLnNldE1vZGlmaWVyU3RhdGUoJ21vZGlmaWVyLWlzUmFuZG9tU3Bhd24nLCBtb2RpZmllcnMuaXNSYW5kb21TcGF3biA/PyAnYW55Jyk7XG4gICAgICB0aGlzLnNldE1vZGlmaWVyU3RhdGUoJ21vZGlmaWVyLWlzQ3Jvd2RlZCcsIG1vZGlmaWVycy5pc0Nyb3dkZWQgPz8gJ2FueScpO1xuICAgICAgdGhpcy5zZXRNb2RpZmllclN0YXRlKCdtb2RpZmllci1pc0hhcmROYXRpb25zJywgbW9kaWZpZXJzLmlzSGFyZE5hdGlvbnMgPz8gJ2FueScpO1xuICAgICAgdGhpcy5zZXRNb2RpZmllclN0YXRlKCdtb2RpZmllci1pc0FsbGlhbmNlc0Rpc2FibGVkJywgbW9kaWZpZXJzLmlzQWxsaWFuY2VzRGlzYWJsZWQgPz8gJ2FueScpO1xuICAgICAgdGhpcy5zZXRNb2RpZmllclN0YXRlKCdtb2RpZmllci1pc051a2VzRGlzYWJsZWQnLCBtb2RpZmllcnMuaXNOdWtlc0Rpc2FibGVkID8/ICdhbnknKTtcbiAgICAgIHRoaXMuc2V0TW9kaWZpZXJTdGF0ZSgnbW9kaWZpZXItaXNTQU1zRGlzYWJsZWQnLCBtb2RpZmllcnMuaXNTQU1zRGlzYWJsZWQgPz8gJ2FueScpO1xuICAgICAgdGhpcy5zZXRNb2RpZmllclN0YXRlKCdtb2RpZmllci1pc1BlYWNlVGltZScsIG1vZGlmaWVycy5pc1BlYWNlVGltZSA/PyAnYW55Jyk7XG4gICAgICB0aGlzLnNldE1vZGlmaWVyU3RhdGUoJ21vZGlmaWVyLWlzV2F0ZXJOdWtlcycsIG1vZGlmaWVycy5pc1dhdGVyTnVrZXMgPz8gJ2FueScpO1xuICAgICAgdGhpcy5zZXRNb2RpZmllclN0YXRlKCdtb2RpZmllci1pc0Rvb21zZGF5Q2xvY2snLCBtb2RpZmllcnMuaXNEb29tc2RheUNsb2NrID8/ICdhbnknKTtcbiAgICAgIHRoaXMuc2V0TW9kaWZpZXJTdGF0ZSgnbW9kaWZpZXItaXNUcnVzdGVkJywgbW9kaWZpZXJzLmlzVHJ1c3RlZCA/PyAnYW55Jyk7XG5cbiAgICAgIGZvciAoY29uc3QgdmFsdWUgb2YgU1RBUlRJTkdfR09MRF9WQUxVRVMpIHtcbiAgICAgICAgdGhpcy5zZXRNb2RpZmllclN0YXRlKFxuICAgICAgICAgIGBtb2RpZmllci1zdGFydGluZ0dvbGQtJHt2YWx1ZX1gLFxuICAgICAgICAgIG1vZGlmaWVycy5zdGFydGluZ0dvbGQ/Llt2YWx1ZV0gPz8gJ2FueSdcbiAgICAgICAgKTtcbiAgICAgIH1cbiAgICAgIGZvciAoY29uc3QgdmFsdWUgb2YgR09MRF9NVUxUSVBMSUVSX1ZBTFVFUykge1xuICAgICAgICB0aGlzLnNldE1vZGlmaWVyU3RhdGUoXG4gICAgICAgICAgYG1vZGlmaWVyLWdvbGRNdWx0aXBsaWVyLSR7dmFsdWV9YCxcbiAgICAgICAgICBtb2RpZmllcnMuZ29sZE11bHRpcGxpZXI/Llt2YWx1ZV0gPz8gJ2FueSdcbiAgICAgICAgKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBjb25zdCBzb3VuZENoZWNrYm94ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2Rpc2NvdmVyeS1zb3VuZC10b2dnbGUnKSBhcyBIVE1MSW5wdXRFbGVtZW50IHwgbnVsbDtcbiAgICBpZiAoc291bmRDaGVja2JveCkge1xuICAgICAgc291bmRDaGVja2JveC5jaGVja2VkID0gdGhpcy5zb3VuZEVuYWJsZWQ7XG4gICAgICB0aGlzLnNldEljb25CdXR0b25TdGF0ZSgnZGlzY292ZXJ5LXNvdW5kLXRvZ2dsZScsIHRoaXMuc291bmRFbmFibGVkKTtcbiAgICB9XG5cbiAgICBjb25zdCBkZXNrdG9wQ2hlY2tib3ggPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnZGlzY292ZXJ5LWRlc2t0b3AtdG9nZ2xlJykgYXMgSFRNTElucHV0RWxlbWVudCB8IG51bGw7XG4gICAgaWYgKGRlc2t0b3BDaGVja2JveCkge1xuICAgICAgZGVza3RvcENoZWNrYm94LmNoZWNrZWQgPSB0aGlzLmRlc2t0b3BOb3RpZmljYXRpb25zRW5hYmxlZDtcbiAgICAgIHRoaXMuc2V0SWNvbkJ1dHRvblN0YXRlKCdkaXNjb3ZlcnktZGVza3RvcC10b2dnbGUnLCB0aGlzLmRlc2t0b3BOb3RpZmljYXRpb25zRW5hYmxlZCk7XG4gICAgfVxuXG4gICAgY29uc3QgdHdvVGltZXMgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnZGlzY292ZXJ5LXRlYW0tdHdvLXRpbWVzJykgYXMgSFRNTElucHV0RWxlbWVudCB8IG51bGw7XG4gICAgaWYgKHR3b1RpbWVzKSB7XG4gICAgICB0d29UaW1lcy5jaGVja2VkID0gdGhpcy5pc1RlYW1Ud29UaW1lc01pbkVuYWJsZWQ7XG4gICAgICB0aGlzLnN5bmNDaGlwU3RhdGUoJ2Rpc2NvdmVyeS10ZWFtLXR3by10aW1lcycpO1xuICAgIH1cblxuICAgIHRoaXMuc3luY01hcENoaXBzKCk7XG5cbiAgICBjb25zdCBob3N0ZWRUb2dnbGUgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnZGlzY292ZXJ5LWhvc3RlZC10b2dnbGUnKSBhcyBIVE1MSW5wdXRFbGVtZW50IHwgbnVsbDtcbiAgICBpZiAoaG9zdGVkVG9nZ2xlKSB7XG4gICAgICBob3N0ZWRUb2dnbGUuY2hlY2tlZCA9IHRoaXMuaW5jbHVkZUhvc3RlZEFuZEN1c3RvbUxvYmJpZXM7XG4gICAgICB0aGlzLnN5bmNDaGlwU3RhdGUoJ2Rpc2NvdmVyeS1ob3N0ZWQtdG9nZ2xlJyk7XG4gICAgfVxuXG4gICAgdGhpcy51cGRhdGVGaWx0ZXJDb3VudCgpO1xuICAgIHRoaXMudXBkYXRlU3RhdHVzTGFiZWwoKTtcbiAgfVxuXG4gIHByaXZhdGUgc2V0VGVhbUNvdW50U2VsZWN0aW9ucyh2YWx1ZXM6IEFycmF5PFRlYW1Db3VudCB8IG51bGwgfCB1bmRlZmluZWQ+KTogdm9pZCB7XG4gICAgZm9yIChjb25zdCB0ZWFtQ291bnQgb2YgdmFsdWVzKSB7XG4gICAgICBsZXQgY2hlY2tib3g6IEhUTUxJbnB1dEVsZW1lbnQgfCBudWxsID0gbnVsbDtcbiAgICAgIGlmICh0ZWFtQ291bnQgPT09ICdIdW1hbnMgVnMgTmF0aW9ucycpIGNoZWNrYm94ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2Rpc2NvdmVyeS10ZWFtLWh2bicpIGFzIEhUTUxJbnB1dEVsZW1lbnQ7XG4gICAgICBlbHNlIGlmICh0ZWFtQ291bnQgPT09ICc4KycpIGNoZWNrYm94ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2Rpc2NvdmVyeS10ZWFtLThwbHVzJykgYXMgSFRNTElucHV0RWxlbWVudDtcbiAgICAgIGVsc2UgaWYgKHR5cGVvZiB0ZWFtQ291bnQgPT09ICdudW1iZXInKSBjaGVja2JveCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKGBkaXNjb3ZlcnktdGVhbS0ke3RlYW1Db3VudH1gKSBhcyBIVE1MSW5wdXRFbGVtZW50O1xuICAgICAgaWYgKGNoZWNrYm94KSB7XG4gICAgICAgIGNoZWNrYm94LmNoZWNrZWQgPSB0cnVlO1xuICAgICAgICB0aGlzLnN5bmNDaGlwU3RhdGUoY2hlY2tib3guaWQpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgcmVmcmVzaENyaXRlcmlhKCk6IHZvaWQge1xuICAgIHRoaXMuY3JpdGVyaWFMaXN0ID0gdGhpcy5idWlsZENyaXRlcmlhRnJvbVVJKCk7XG4gICAgdGhpcy5zYXZlU2V0dGluZ3MoKTtcbiAgICB0aGlzLnVwZGF0ZUZpbHRlckNvdW50KCk7XG4gICAgdGhpcy51cGRhdGVMb2JieUJvYXJkKHRoaXMubGFzdExvYmJpZXMpO1xuICAgIHRoaXMuc3luY1NlYXJjaFRpbWVyKHsgcmVzZXRTdGFydDogdHJ1ZSB9KTtcbiAgfVxuXG4gIHByaXZhdGUgcmVzZXRBbGwoKTogdm9pZCB7XG4gICAgY29uc3QgZmZhQ2hlY2tib3ggPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnZGlzY292ZXJ5LWZmYScpIGFzIEhUTUxJbnB1dEVsZW1lbnQgfCBudWxsO1xuICAgIGNvbnN0IHRlYW1DaGVja2JveCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdkaXNjb3ZlcnktdGVhbScpIGFzIEhUTUxJbnB1dEVsZW1lbnQgfCBudWxsO1xuICAgIGlmIChmZmFDaGVja2JveCkge1xuICAgICAgZmZhQ2hlY2tib3guY2hlY2tlZCA9IGZhbHNlO1xuICAgICAgdGhpcy5zeW5jQ2hpcFN0YXRlKCdkaXNjb3ZlcnktZmZhJyk7XG4gICAgICB0aGlzLnNldE1vZGVQYW5lbEFjdGl2ZSgnZGlzY292ZXJ5LWZmYS1jb25maWcnLCBmYWxzZSk7XG4gICAgfVxuICAgIGlmICh0ZWFtQ2hlY2tib3gpIHtcbiAgICAgIHRlYW1DaGVja2JveC5jaGVja2VkID0gZmFsc2U7XG4gICAgICB0aGlzLnN5bmNDaGlwU3RhdGUoJ2Rpc2NvdmVyeS10ZWFtJyk7XG4gICAgICB0aGlzLnNldE1vZGVQYW5lbEFjdGl2ZSgnZGlzY292ZXJ5LXRlYW0tY29uZmlnJywgZmFsc2UpO1xuICAgIH1cblxuICAgIHRoaXMuc2V0QWxsVGVhbUNvdW50cyhmYWxzZSk7XG5cbiAgICBjb25zdCB0d29UaW1lcyA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdkaXNjb3ZlcnktdGVhbS10d28tdGltZXMnKSBhcyBIVE1MSW5wdXRFbGVtZW50IHwgbnVsbDtcbiAgICBpZiAodHdvVGltZXMpIHtcbiAgICAgIHR3b1RpbWVzLmNoZWNrZWQgPSBmYWxzZTtcbiAgICAgIHRoaXMuc3luY0NoaXBTdGF0ZSgnZGlzY292ZXJ5LXRlYW0tdHdvLXRpbWVzJyk7XG4gICAgICB0aGlzLmlzVGVhbVR3b1RpbWVzTWluRW5hYmxlZCA9IGZhbHNlO1xuICAgIH1cblxuICAgIGZvciAoY29uc3QgaWQgb2YgTU9ESUZJRVJfQk9PTEVBTl9JRFMpIHRoaXMuc2V0TW9kaWZpZXJTdGF0ZShpZCwgJ2FueScpO1xuICAgIGZvciAoY29uc3QgdiBvZiBTVEFSVElOR19HT0xEX1ZBTFVFUykgdGhpcy5zZXRNb2RpZmllclN0YXRlKGBtb2RpZmllci1zdGFydGluZ0dvbGQtJHt2fWAsICdhbnknKTtcbiAgICBmb3IgKGNvbnN0IHYgb2YgR09MRF9NVUxUSVBMSUVSX1ZBTFVFUykgdGhpcy5zZXRNb2RpZmllclN0YXRlKGBtb2RpZmllci1nb2xkTXVsdGlwbGllci0ke3Z9YCwgJ2FueScpO1xuICAgIHRoaXMubWFwRmlsdGVyID0ge307XG4gICAgdGhpcy5zeW5jTWFwQ2hpcHMoKTtcblxuICAgIHRoaXMuZmZhU2xpZGVyPy5zZXRSYW5nZSgxLCAxMjUpO1xuICAgIHRoaXMudGVhbVNsaWRlcj8uc2V0UmFuZ2UoVEVBTV9NSU5fUExBWUVSU19QRVJfVEVBTSwgVEVBTV9NQVhfUExBWUVSU19QRVJfVEVBTSk7XG4gICAgdGhpcy50ZWFtU2xpZGVyPy5hcHBseUxvY2tTdGF0ZSgpO1xuXG4gICAgdGhpcy5yZWZyZXNoQ3JpdGVyaWEoKTtcbiAgfVxuXG4gIHByaXZhdGUgYXN5bmMgaGFuZGxlRGVza3RvcE5vdGlmaWNhdGlvblRvZ2dsZUNoYW5nZShcbiAgICBkZXNrdG9wVG9nZ2xlOiBIVE1MSW5wdXRFbGVtZW50XG4gICk6IFByb21pc2U8dm9pZD4ge1xuICAgIGNvbnN0IHJlcXVlc3RJZCA9ICsrdGhpcy5kZXNrdG9wTm90aWZpY2F0aW9uUmVxdWVzdElkO1xuXG4gICAgaWYgKCFkZXNrdG9wVG9nZ2xlLmNoZWNrZWQpIHtcbiAgICAgIHRoaXMuZGVza3RvcE5vdGlmaWNhdGlvbnNFbmFibGVkID0gZmFsc2U7XG4gICAgICB0aGlzLnNldEljb25CdXR0b25TdGF0ZSgnZGlzY292ZXJ5LWRlc2t0b3AtdG9nZ2xlJywgZmFsc2UpO1xuICAgICAgdGhpcy5zYXZlU2V0dGluZ3MoKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBjb25zdCBncmFudGVkID0gYXdhaXQgQnJvd3Nlck5vdGlmaWNhdGlvblV0aWxzLmVuc3VyZVBlcm1pc3Npb24oKTtcbiAgICBpZiAoXG4gICAgICByZXF1ZXN0SWQgIT09IHRoaXMuZGVza3RvcE5vdGlmaWNhdGlvblJlcXVlc3RJZCB8fFxuICAgICAgdGhpcy5pc0Rpc3Bvc2VkIHx8XG4gICAgICAhZGVza3RvcFRvZ2dsZS5pc0Nvbm5lY3RlZCB8fFxuICAgICAgIWRlc2t0b3BUb2dnbGUuY2hlY2tlZFxuICAgICkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHRoaXMuZGVza3RvcE5vdGlmaWNhdGlvbnNFbmFibGVkID0gZ3JhbnRlZDtcbiAgICBkZXNrdG9wVG9nZ2xlLmNoZWNrZWQgPSBncmFudGVkO1xuICAgIGRlc2t0b3BUb2dnbGUudG9nZ2xlQXR0cmlidXRlKCdjaGVja2VkJywgZ3JhbnRlZCk7XG4gICAgdGhpcy5zZXRJY29uQnV0dG9uU3RhdGUoJ2Rpc2NvdmVyeS1kZXNrdG9wLXRvZ2dsZScsIGdyYW50ZWQpO1xuICAgIHRoaXMuc2F2ZVNldHRpbmdzKCk7XG4gIH1cblxuICBwcml2YXRlIHNldHVwRXZlbnRMaXN0ZW5lcnMoKTogdm9pZCB7XG4gICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2Rpc2NvdmVyeS1zdGF0dXMnKT8uYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCAoKSA9PiB7XG4gICAgICB0aGlzLnNldERpc2NvdmVyeUVuYWJsZWQoIXRoaXMuZGlzY292ZXJ5RW5hYmxlZCwgeyByZXNldFRpbWVyOiB0cnVlIH0pO1xuICAgIH0pO1xuXG4gICAgZm9yIChjb25zdCBbY2hlY2tib3hJZCwgY29uZmlnSWRdIG9mIFtcbiAgICAgIFsnZGlzY292ZXJ5LWZmYScsICdkaXNjb3ZlcnktZmZhLWNvbmZpZyddLFxuICAgICAgWydkaXNjb3ZlcnktdGVhbScsICdkaXNjb3ZlcnktdGVhbS1jb25maWcnXSxcbiAgICBdIGFzIGNvbnN0KSB7XG4gICAgICBjb25zdCBjaGVja2JveCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKGNoZWNrYm94SWQpIGFzIEhUTUxJbnB1dEVsZW1lbnQgfCBudWxsO1xuICAgICAgY2hlY2tib3g/LmFkZEV2ZW50TGlzdGVuZXIoJ2NoYW5nZScsICgpID0+IHtcbiAgICAgICAgdGhpcy5zeW5jQ2hpcFN0YXRlKGNoZWNrYm94SWQpO1xuICAgICAgICB0aGlzLnNldE1vZGVQYW5lbEFjdGl2ZShjb25maWdJZCwgY2hlY2tib3guY2hlY2tlZCk7XG4gICAgICAgIHRoaXMucmVmcmVzaENyaXRlcmlhKCk7XG4gICAgICB9KTtcbiAgICB9XG5cbiAgICBjb25zdCB0d29UaW1lc0NoZWNrYm94ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2Rpc2NvdmVyeS10ZWFtLXR3by10aW1lcycpIGFzIEhUTUxJbnB1dEVsZW1lbnQgfCBudWxsO1xuICAgIHR3b1RpbWVzQ2hlY2tib3g/LmFkZEV2ZW50TGlzdGVuZXIoJ2NoYW5nZScsICgpID0+IHtcbiAgICAgIHRoaXMuaXNUZWFtVHdvVGltZXNNaW5FbmFibGVkID0gdHdvVGltZXNDaGVja2JveC5jaGVja2VkO1xuICAgICAgdGhpcy5zeW5jQ2hpcFN0YXRlKCdkaXNjb3ZlcnktdGVhbS10d28tdGltZXMnKTtcbiAgICAgIHRoaXMudGVhbVNsaWRlcj8uYXBwbHlMb2NrU3RhdGUoKTtcbiAgICAgIHRoaXMucmVmcmVzaENyaXRlcmlhKCk7XG4gICAgfSk7XG5cbiAgICBmb3IgKGNvbnN0IHNlY3Rpb24gb2YgUEFORUxfU0VDVElPTlMpIHtcbiAgICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKGBkaXNjb3ZlcnktJHtzZWN0aW9ufS10b2dnbGVgKT8uYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCAoKSA9PiB7XG4gICAgICAgIHRoaXMuY29sbGFwc2VkU2VjdGlvbnNbc2VjdGlvbl0gPSAhdGhpcy5jb2xsYXBzZWRTZWN0aW9uc1tzZWN0aW9uXTtcbiAgICAgICAgR01fc2V0VmFsdWUoU1RPUkFHRV9LRVlTLmxvYmJ5RGlzY292ZXJ5Q29sbGFwc2VkU2VjdGlvbnMsIHRoaXMuY29sbGFwc2VkU2VjdGlvbnMpO1xuICAgICAgICB0aGlzLmFwcGx5U2VjdGlvbkNvbGxhcHNlKHNlY3Rpb24pO1xuICAgICAgfSk7XG4gICAgfVxuICAgIGNvbnN0IG1hcHNTZWFyY2ggPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnZGlzY292ZXJ5LW1hcHMtc2VhcmNoJykgYXMgSFRNTElucHV0RWxlbWVudCB8IG51bGw7XG4gICAgbWFwc1NlYXJjaD8uYWRkRXZlbnRMaXN0ZW5lcignaW5wdXQnLCAoKSA9PiB0aGlzLmZpbHRlck1hcENoaXBzKG1hcHNTZWFyY2gudmFsdWUpKTtcbiAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnZGlzY292ZXJ5LW1hcHMtY2xlYXInKT8uYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCAoKSA9PiB7XG4gICAgICB0aGlzLnNldE1hcEZpbHRlcih7fSk7XG4gICAgfSk7XG4gICAgZm9yIChjb25zdCBjaGlwIG9mIHRoaXMuZ2V0TWFwQ2hpcHMoKSkge1xuICAgICAgY2hpcC5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsICgpID0+IHRoaXMuY3ljbGVNYXBTdGF0ZShjaGlwKSk7XG4gICAgfVxuXG4gICAgY29uc3QgaG9zdGVkVG9nZ2xlID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2Rpc2NvdmVyeS1ob3N0ZWQtdG9nZ2xlJykgYXMgSFRNTElucHV0RWxlbWVudCB8IG51bGw7XG4gICAgaG9zdGVkVG9nZ2xlPy5hZGRFdmVudExpc3RlbmVyKCdjaGFuZ2UnLCAoKSA9PiB7XG4gICAgICB0aGlzLmluY2x1ZGVIb3N0ZWRBbmRDdXN0b21Mb2JiaWVzID0gaG9zdGVkVG9nZ2xlLmNoZWNrZWQ7XG4gICAgICB0aGlzLnN5bmNDaGlwU3RhdGUoJ2Rpc2NvdmVyeS1ob3N0ZWQtdG9nZ2xlJyk7XG4gICAgICB0aGlzLnNhdmVTZXR0aW5ncygpO1xuICAgICAgdGhpcy5wcm9jZXNzTG9iYmllcyh0aGlzLmxhc3RMb2JiaWVzKTtcbiAgICB9KTtcblxuICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdkaXNjb3ZlcnktcmVzZXQnKT8uYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCAoKSA9PiB7XG4gICAgICB0aGlzLnJlc2V0QWxsKCk7XG4gICAgfSk7XG5cbiAgICBmb3IgKGNvbnN0IGlkIG9mIFsuLi5BTExfVEVBTV9JRFMsICdkaXNjb3Zlcnktc291bmQtdG9nZ2xlJywgJ2Rpc2NvdmVyeS1kZXNrdG9wLXRvZ2dsZSddKSB7XG4gICAgICBjb25zdCBlbGVtZW50ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoaWQpIGFzIEhUTUxJbnB1dEVsZW1lbnQgfCBudWxsO1xuICAgICAgaWYgKCFlbGVtZW50KSBjb250aW51ZTtcbiAgICAgIGVsZW1lbnQuYWRkRXZlbnRMaXN0ZW5lcignY2hhbmdlJywgKCkgPT4ge1xuICAgICAgICBpZiAoaWQgPT09ICdkaXNjb3Zlcnktc291bmQtdG9nZ2xlJykge1xuICAgICAgICAgIHRoaXMuc291bmRFbmFibGVkID0gZWxlbWVudC5jaGVja2VkO1xuICAgICAgICAgIHRoaXMuc2V0SWNvbkJ1dHRvblN0YXRlKCdkaXNjb3Zlcnktc291bmQtdG9nZ2xlJywgZWxlbWVudC5jaGVja2VkKTtcbiAgICAgICAgICB0aGlzLnNhdmVTZXR0aW5ncygpO1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBpZiAoaWQgPT09ICdkaXNjb3ZlcnktZGVza3RvcC10b2dnbGUnKSB7XG4gICAgICAgICAgdm9pZCB0aGlzLmhhbmRsZURlc2t0b3BOb3RpZmljYXRpb25Ub2dnbGVDaGFuZ2UoZWxlbWVudCk7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuc3luY0NoaXBTdGF0ZShpZCk7XG4gICAgICAgIHRoaXMucmVmcmVzaENyaXRlcmlhKCk7XG4gICAgICB9KTtcbiAgICB9XG5cbiAgICBjb25zdCBhbGxNb2RpZmllcklkczogc3RyaW5nW10gPSBbXG4gICAgICAuLi5NT0RJRklFUl9CT09MRUFOX0lEUyxcbiAgICAgIC4uLlNUQVJUSU5HX0dPTERfVkFMVUVTLm1hcCgodikgPT4gYG1vZGlmaWVyLXN0YXJ0aW5nR29sZC0ke3Z9YCksXG4gICAgICAuLi5HT0xEX01VTFRJUExJRVJfVkFMVUVTLm1hcCgodikgPT4gYG1vZGlmaWVyLWdvbGRNdWx0aXBsaWVyLSR7dn1gKSxcbiAgICBdO1xuICAgIGZvciAoY29uc3QgaWQgb2YgYWxsTW9kaWZpZXJJZHMpIHtcbiAgICAgIGNvbnN0IGJ1dHRvbiA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKGlkKSBhcyBIVE1MQnV0dG9uRWxlbWVudCB8IG51bGw7XG4gICAgICBidXR0b24/LmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgKCkgPT4ge1xuICAgICAgICB0aGlzLmN5Y2xlTW9kaWZpZXJTdGF0ZShpZCk7XG4gICAgICAgIHRoaXMucmVmcmVzaENyaXRlcmlhKCk7XG4gICAgICB9KTtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIHJlbmRlck1vZGVCdXR0b24oaWQ6IHN0cmluZywgbGFiZWw6IHN0cmluZyk6IHN0cmluZyB7XG4gICAgcmV0dXJuIGBcbiAgICAgIDxsYWJlbCBjbGFzcz1cImxkLW1vZGUtYnRuXCIgYXJpYS1wcmVzc2VkPVwiZmFsc2VcIj5cbiAgICAgICAgPGlucHV0IHR5cGU9XCJjaGVja2JveFwiIGlkPVwiJHtpZH1cIiB2YWx1ZT1cIiR7aWQgPT09ICdkaXNjb3ZlcnktZmZhJyA/ICdGRkEnIDogJ1RlYW0nfVwiPlxuICAgICAgICA8c3BhbiBjbGFzcz1cImNoZWNrXCI+JHtJQ09OX0NIRUNLfTwvc3Bhbj5cbiAgICAgICAgPHNwYW4+JHtsYWJlbH08L3NwYW4+XG4gICAgICA8L2xhYmVsPlxuICAgIGA7XG4gIH1cblxuICBwcml2YXRlIHJlbmRlckNoaXAoaWQ6IHN0cmluZywgdmFsdWU6IHN0cmluZywgbGFiZWw6IHN0cmluZyk6IHN0cmluZyB7XG4gICAgcmV0dXJuIGBcbiAgICAgIDxsYWJlbCBjbGFzcz1cImxkLWNoaXBcIiBhcmlhLXByZXNzZWQ9XCJmYWxzZVwiPlxuICAgICAgICA8aW5wdXQgdHlwZT1cImNoZWNrYm94XCIgaWQ9XCIke2lkfVwiIHZhbHVlPVwiJHt2YWx1ZX1cIj4ke2xhYmVsfVxuICAgICAgPC9sYWJlbD5cbiAgICBgO1xuICB9XG5cbiAgcHJpdmF0ZSByZW5kZXJNb2RpZmllckNoaXAoaWQ6IHN0cmluZywgbmFtZTogc3RyaW5nKTogc3RyaW5nIHtcbiAgICByZXR1cm4gYFxuICAgICAgPGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgY2xhc3M9XCJsZC1tb2RcIiBpZD1cIiR7aWR9XCIgZGF0YS1zdGF0ZT1cImFueVwiIGRhdGEtbW9kLW5hbWU9XCIke25hbWV9XCIgYXJpYS1wcmVzc2VkPVwiZmFsc2VcIiBhcmlhLWxhYmVsPVwiJHtuYW1lfVwiPlxuICAgICAgICA8c3BhbiBjbGFzcz1cImxkLW1vZC1pbmRcIj48L3NwYW4+XG4gICAgICAgIDxzcGFuIGNsYXNzPVwibGQtbW9kLW5hbWVcIj4ke25hbWV9PC9zcGFuPlxuICAgICAgPC9idXR0b24+XG4gICAgYDtcbiAgfVxuXG4gIHByaXZhdGUgcmVuZGVyU2VjdGlvblRvZ2dsZShzZWN0aW9uOiBQYW5lbFNlY3Rpb24sIGxhYmVsOiBzdHJpbmcsIGFzaWRlSHRtbDogc3RyaW5nKTogc3RyaW5nIHtcbiAgICByZXR1cm4gYFxuICAgICAgPGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgY2xhc3M9XCJsZC1zZWN0aW9uLWhlYWQgbGQtc2VjdGlvbi10b2dnbGVcIiBpZD1cImRpc2NvdmVyeS0ke3NlY3Rpb259LXRvZ2dsZVwiIGFyaWEtZXhwYW5kZWQ9XCJ0cnVlXCIgYXJpYS1jb250cm9scz1cImRpc2NvdmVyeS0ke3NlY3Rpb259LWJvZHlcIj5cbiAgICAgICAgPHNwYW4gY2xhc3M9XCJsZC1zZWN0aW9uLWxhYmVsXCI+JHtsYWJlbH08L3NwYW4+XG4gICAgICAgIDxzcGFuIGNsYXNzPVwibGQtc2VjdGlvbi1oZWFkLWVuZFwiPiR7YXNpZGVIdG1sfTxzcGFuIGNsYXNzPVwibGQtc2VjdGlvbi1jaGV2cm9uXCIgYXJpYS1oaWRkZW49XCJ0cnVlXCI+PC9zcGFuPjwvc3Bhbj5cbiAgICAgIDwvYnV0dG9uPlxuICAgIGA7XG4gIH1cblxuICBwcml2YXRlIGFwcGx5U2VjdGlvbkNvbGxhcHNlKHNlY3Rpb246IFBhbmVsU2VjdGlvbik6IHZvaWQge1xuICAgIGNvbnN0IGNvbGxhcHNlZCA9IHRoaXMuY29sbGFwc2VkU2VjdGlvbnNbc2VjdGlvbl07XG4gICAgY29uc3QgYm9keSA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKGBkaXNjb3ZlcnktJHtzZWN0aW9ufS1ib2R5YCk7XG4gICAgaWYgKGJvZHkpIGJvZHkuaGlkZGVuID0gY29sbGFwc2VkO1xuICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKGBkaXNjb3ZlcnktJHtzZWN0aW9ufS10b2dnbGVgKT8uc2V0QXR0cmlidXRlKCdhcmlhLWV4cGFuZGVkJywgU3RyaW5nKCFjb2xsYXBzZWQpKTtcbiAgfVxuXG4gIHByaXZhdGUgcmVuZGVyTWFwQ2hpcChnYW1lTWFwOiBzdHJpbmcsIG5hbWU6IHN0cmluZyk6IHN0cmluZyB7XG4gICAgY29uc3Qgc2FmZU5hbWUgPSBlc2NhcGVIdG1sKG5hbWUpO1xuICAgIHJldHVybiBgXG4gICAgICA8YnV0dG9uIHR5cGU9XCJidXR0b25cIiBjbGFzcz1cImxkLW1vZFwiIGRhdGEtZ2FtZS1tYXA9XCIke2VzY2FwZUh0bWwoZ2FtZU1hcCl9XCIgZGF0YS1zdGF0ZT1cImFueVwiIGRhdGEtbW9kLW5hbWU9XCIke3NhZmVOYW1lfVwiIGFyaWEtcHJlc3NlZD1cImZhbHNlXCIgYXJpYS1sYWJlbD1cIiR7c2FmZU5hbWV9XCI+XG4gICAgICAgIDxzcGFuIGNsYXNzPVwibGQtbW9kLWluZFwiPjwvc3Bhbj5cbiAgICAgICAgPHNwYW4gY2xhc3M9XCJsZC1tb2QtbmFtZVwiPiR7c2FmZU5hbWV9PC9zcGFuPlxuICAgICAgPC9idXR0b24+XG4gICAgYDtcbiAgfVxuXG4gIHByaXZhdGUgcmVuZGVyTWFwR3JvdXAoY2F0ZWdvcnk6IE1hcENhdGVnb3J5LCBjaGlwc0h0bWw6IHN0cmluZyk6IHN0cmluZyB7XG4gICAgcmV0dXJuIGBcbiAgICAgIDxkaXYgY2xhc3M9XCJsZC1tb2QtZ3JvdXBcIiBkYXRhLWNhdGVnb3J5PVwiJHtjYXRlZ29yeX1cIj5cbiAgICAgICAgPGRpdiBjbGFzcz1cImxkLW1vZC1ncm91cC1sYWJlbFwiPiR7TUFQX0NBVEVHT1JZX0xBQkVMU1tjYXRlZ29yeV19PC9kaXY+XG4gICAgICAgIDxkaXYgY2xhc3M9XCJsZC1tb2RzXCI+JHtjaGlwc0h0bWx9PC9kaXY+XG4gICAgICA8L2Rpdj5cbiAgICBgO1xuICB9XG5cbiAgcHJpdmF0ZSByZW5kZXJNYXBHcm91cHMoKTogc3RyaW5nIHtcbiAgICByZXR1cm4gTUFQX0NBVEVHT1JZX09SREVSLm1hcCgoY2F0ZWdvcnkpID0+IHtcbiAgICAgIGNvbnN0IGVudHJpZXMgPSBNQVBfQ0FUQUxPR1VFLmZpbHRlcigoZW50cnkpID0+IGVudHJ5LmNhdGVnb3JpZXMuaW5jbHVkZXMoY2F0ZWdvcnkpKTtcbiAgICAgIGlmIChlbnRyaWVzLmxlbmd0aCA9PT0gMCkgcmV0dXJuICcnO1xuICAgICAgcmV0dXJuIHRoaXMucmVuZGVyTWFwR3JvdXAoXG4gICAgICAgIGNhdGVnb3J5LFxuICAgICAgICBlbnRyaWVzLm1hcCgoZW50cnkpID0+IHRoaXMucmVuZGVyTWFwQ2hpcChlbnRyeS5nYW1lTWFwLCBlbnRyeS5uYW1lKSkuam9pbignJylcbiAgICAgICk7XG4gICAgfSkuam9pbignJyk7XG4gIH1cblxuICBwcml2YXRlIHJlbmRlckljb25CdXR0b24oaWQ6IHN0cmluZywgdGl0bGU6IHN0cmluZywgc3ZnOiBzdHJpbmcpOiBzdHJpbmcge1xuICAgIHJldHVybiBgXG4gICAgICA8bGFiZWwgY2xhc3M9XCJsZC1pY29uLWJ0blwiIHRpdGxlPVwiJHt0aXRsZX1cIiBhcmlhLWxhYmVsPVwiJHt0aXRsZX1cIj5cbiAgICAgICAgPGlucHV0IHR5cGU9XCJjaGVja2JveFwiIGlkPVwiJHtpZH1cIj4ke3N2Z31cbiAgICAgIDwvbGFiZWw+XG4gICAgYDtcbiAgfVxuXG4gIHByaXZhdGUgY3JlYXRlVUkoKTogdm9pZCB7XG4gICAgaWYgKGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdvcGVuZnJvbnQtZGlzY292ZXJ5LXBhbmVsJykpIHJldHVybjtcblxuICAgIHRoaXMucGFuZWwgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgICB0aGlzLnBhbmVsLmlkID0gJ29wZW5mcm9udC1kaXNjb3ZlcnktcGFuZWwnO1xuICAgIHRoaXMucGFuZWwuY2xhc3NOYW1lID0gJ29mLXBhbmVsIGRpc2NvdmVyeS1wYW5lbCc7XG4gICAgdGhpcy5wYW5lbC5zdHlsZS53aWR0aCA9ICczODBweCc7XG4gICAgdGhpcy5wYW5lbC5pbm5lckhUTUwgPSBgXG4gICAgICA8ZGl2IGNsYXNzPVwibGQtc3RhdHVzXCI+XG4gICAgICAgIDxzcGFuIGNsYXNzPVwibGQtcHVsc2VcIiBhcmlhLWhpZGRlbj1cInRydWVcIj48L3NwYW4+XG4gICAgICAgIDxkaXYgY2xhc3M9XCJsZC1zdGF0dXMtdGV4dFwiIGlkPVwiZGlzY292ZXJ5LXN0YXR1c1wiIHJvbGU9XCJidXR0b25cIiB0YWJpbmRleD1cIjBcIj5cbiAgICAgICAgICA8c3Ryb25nPkRpc2NvdmVyeSBhY3RpdmU8L3N0cm9uZz5cbiAgICAgICAgICA8c3BhbiBjbGFzcz1cInNlcFwiPlx1MDBCNzwvc3Bhbj5cbiAgICAgICAgICA8c3BhbiBjbGFzcz1cIm1ldGFcIiBpZD1cImRpc2NvdmVyeS1zZWFyY2gtdGltZXJcIj48L3NwYW4+XG4gICAgICAgIDwvZGl2PlxuICAgICAgICA8ZGl2IGNsYXNzPVwibGQtaWNvbnNcIj5cbiAgICAgICAgICAke3RoaXMucmVuZGVySWNvbkJ1dHRvbignZGlzY292ZXJ5LXNvdW5kLXRvZ2dsZScsICdTb3VuZCBhbGVydCcsIElDT05fU09VTkQpfVxuICAgICAgICAgICR7dGhpcy5yZW5kZXJJY29uQnV0dG9uKCdkaXNjb3ZlcnktZGVza3RvcC10b2dnbGUnLCAnRGVza3RvcCBub3RpZmljYXRpb24nLCBJQ09OX0JFTEwpfVxuICAgICAgICA8L2Rpdj5cbiAgICAgIDwvZGl2PlxuICAgICAgPGRpdiBjbGFzcz1cImxkLWhlYWRcIj5cbiAgICAgICAgPGRpdiBjbGFzcz1cImxkLWV5ZWJyb3dcIj5Ob3RpZnkgKyBxdWljay1qb2luIFx1MDBCNyBuZXZlciBhdXRvLWpvaW5zPC9kaXY+XG4gICAgICAgIDxoMiBjbGFzcz1cImxkLXRpdGxlXCI+T3BlbkZyb250IEdhbWUgTm90aWZpZXI8L2gyPlxuICAgICAgPC9kaXY+XG4gICAgICA8ZGl2IGNsYXNzPVwiZGlzY292ZXJ5LWJvZHlcIj5cbiAgICAgICAgPGRpdiBjbGFzcz1cImRpc2NvdmVyeS1jb250ZW50XCIgc3R5bGU9XCJvdmVyZmxvdy15OiBhdXRvO1wiPlxuICAgICAgICAgIDxkaXYgY2xhc3M9XCJsZC1zZWN0aW9uXCI+XG4gICAgICAgICAgICAke3RoaXMucmVuZGVyU2VjdGlvblRvZ2dsZSgnbW9kZXMnLCAnTW9kZXMnLCAnPHNwYW4gY2xhc3M9XCJsZC1zZWN0aW9uLWFzaWRlXCI+UGljayBvbmUgb3IgYm90aDwvc3Bhbj4nKX1cbiAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJsZC1zZWN0aW9uLWJvZHlcIiBpZD1cImRpc2NvdmVyeS1tb2Rlcy1ib2R5XCI+XG4gICAgICAgICAgICA8ZGl2IGNsYXNzPVwibGQtbW9kZXNcIj5cbiAgICAgICAgICAgICAgJHt0aGlzLnJlbmRlck1vZGVCdXR0b24oJ2Rpc2NvdmVyeS1mZmEnLCAnRkZBJyl9XG4gICAgICAgICAgICAgICR7dGhpcy5yZW5kZXJNb2RlQnV0dG9uKCdkaXNjb3ZlcnktdGVhbScsICdUZWFtcycpfVxuICAgICAgICAgICAgPC9kaXY+XG5cbiAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJsZC1tb2RlLXBhbmVsXCIgaWQ9XCJkaXNjb3ZlcnktZmZhLWNvbmZpZ1wiPlxuICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwibGQtbW9kZS1wYW5lbC1oZWFkXCI+XG4gICAgICAgICAgICAgICAgPHNwYW4gY2xhc3M9XCJkb3RcIj48L3NwYW4+XG4gICAgICAgICAgICAgICAgPHNwYW4gY2xhc3M9XCJ0aXRsZVwiPkZGQSBcdTAwQjcgTG9iYnkgY2FwYWNpdHk8L3NwYW4+XG4gICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwibGQtc2xpZGVyLXJvd1wiIGlkPVwiZGlzY292ZXJ5LWZmYS1zbGlkZXItcm93XCI+XG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImxkLXNsaWRlci1sYWJlbFwiPlxuICAgICAgICAgICAgICAgICAgPHNwYW4+UGxheWVyczwvc3Bhbj5cbiAgICAgICAgICAgICAgICAgIDxzcGFuIGNsYXNzPVwidmFsXCI+XG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJsZC1zdGVwcGVyXCIgZGF0YS1yb2xlPVwibWluXCI+XG4gICAgICAgICAgICAgICAgICAgICAgPGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgY2xhc3M9XCJsZC1zdGVwLWJ0blwiIGRhdGEtYWN0aW9uPVwiZGVjXCIgZGF0YS10YXJnZXQ9XCJtaW5cIiBhcmlhLWxhYmVsPVwiRGVjcmVhc2UgbWluaW11bVwiPlx1MjIxMjwvYnV0dG9uPlxuICAgICAgICAgICAgICAgICAgICAgIDxpbnB1dCB0eXBlPVwibnVtYmVyXCIgaWQ9XCJkaXNjb3ZlcnktZmZhLW1pblwiIG1pbj1cIjFcIiBtYXg9XCIxMjVcIiB2YWx1ZT1cIjFcIiBpbnB1dG1vZGU9XCJudW1lcmljXCI+XG4gICAgICAgICAgICAgICAgICAgICAgPGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgY2xhc3M9XCJsZC1zdGVwLWJ0blwiIGRhdGEtYWN0aW9uPVwiaW5jXCIgZGF0YS10YXJnZXQ9XCJtaW5cIiBhcmlhLWxhYmVsPVwiSW5jcmVhc2UgbWluaW11bVwiPis8L2J1dHRvbj5cbiAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgIDxzcGFuIGNsYXNzPVwic2VwXCI+XHUyMDEzPC9zcGFuPlxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwibGQtc3RlcHBlclwiIGRhdGEtcm9sZT1cIm1heFwiPlxuICAgICAgICAgICAgICAgICAgICAgIDxidXR0b24gdHlwZT1cImJ1dHRvblwiIGNsYXNzPVwibGQtc3RlcC1idG5cIiBkYXRhLWFjdGlvbj1cImRlY1wiIGRhdGEtdGFyZ2V0PVwibWF4XCIgYXJpYS1sYWJlbD1cIkRlY3JlYXNlIG1heGltdW1cIj5cdTIyMTI8L2J1dHRvbj5cbiAgICAgICAgICAgICAgICAgICAgICA8aW5wdXQgdHlwZT1cIm51bWJlclwiIGlkPVwiZGlzY292ZXJ5LWZmYS1tYXhcIiBtaW49XCIxXCIgbWF4PVwiMTI1XCIgdmFsdWU9XCIxMjVcIiBpbnB1dG1vZGU9XCJudW1lcmljXCI+XG4gICAgICAgICAgICAgICAgICAgICAgPGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgY2xhc3M9XCJsZC1zdGVwLWJ0blwiIGRhdGEtYWN0aW9uPVwiaW5jXCIgZGF0YS10YXJnZXQ9XCJtYXhcIiBhcmlhLWxhYmVsPVwiSW5jcmVhc2UgbWF4aW11bVwiPis8L2J1dHRvbj5cbiAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICA8L3NwYW4+XG4gICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImxkLXJhbmdlXCIgaWQ9XCJkaXNjb3ZlcnktZmZhLXJhbmdlLXJvb3RcIj5cbiAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ0cmFja1wiPjxkaXYgY2xhc3M9XCJ0cmFjay1maWxsXCIgaWQ9XCJkaXNjb3ZlcnktZmZhLXJhbmdlLWZpbGxcIj48L2Rpdj48L2Rpdj5cbiAgICAgICAgICAgICAgICAgIDxpbnB1dCB0eXBlPVwicmFuZ2VcIiBpZD1cImRpc2NvdmVyeS1mZmEtbWluLXNsaWRlclwiIG1pbj1cIjBcIiBtYXg9XCIxMDAwXCIgdmFsdWU9XCIwXCIgY2xhc3M9XCJjYXBhY2l0eS1zbGlkZXIgY2FwYWNpdHktc2xpZGVyLW1pblwiPlxuICAgICAgICAgICAgICAgICAgPGlucHV0IHR5cGU9XCJyYW5nZVwiIGlkPVwiZGlzY292ZXJ5LWZmYS1tYXgtc2xpZGVyXCIgbWluPVwiMFwiIG1heD1cIjEwMDBcIiB2YWx1ZT1cIjEwMDBcIiBjbGFzcz1cImNhcGFjaXR5LXNsaWRlciBjYXBhY2l0eS1zbGlkZXItbWF4XCI+XG4gICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgPC9kaXY+XG5cbiAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJsZC1tb2RlLXBhbmVsXCIgaWQ9XCJkaXNjb3ZlcnktdGVhbS1jb25maWdcIj5cbiAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImxkLW1vZGUtcGFuZWwtaGVhZFwiPlxuICAgICAgICAgICAgICAgIDxzcGFuIGNsYXNzPVwiZG90XCI+PC9zcGFuPlxuICAgICAgICAgICAgICAgIDxzcGFuIGNsYXNzPVwidGl0bGVcIj5UZWFtcyBcdTAwQjcgRm9ybWF0ICYgc2l6ZTwvc3Bhbj5cbiAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJsZC1mb3JtYXQtbGFiZWxcIj5GT1JNQVQ8L2Rpdj5cbiAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImxkLWZvcm1hdHNcIj5cbiAgICAgICAgICAgICAgICAke3RoaXMucmVuZGVyQ2hpcCgnZGlzY292ZXJ5LXRlYW0taHZuJywgJ0h1bWFucyBWcyBOYXRpb25zJywgJ0h1bWFucyBWcyBOYXRpb25zJyl9XG4gICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwibGQtZm9ybWF0LWxhYmVsXCIgc3R5bGU9XCJtYXJnaW4tdG9wOiAxMHB4O1wiPk5VTUJFUiBPRiBURUFNUzwvZGl2PlxuICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwibGQtZm9ybWF0c1wiIHN0eWxlPVwibWFyZ2luLWJvdHRvbTogMTRweDtcIj5cbiAgICAgICAgICAgICAgICAke3RoaXMucmVuZGVyQ2hpcCgnZGlzY292ZXJ5LXRlYW0tMicsICcyJywgJzInKX1cbiAgICAgICAgICAgICAgICAke3RoaXMucmVuZGVyQ2hpcCgnZGlzY292ZXJ5LXRlYW0tMycsICczJywgJzMnKX1cbiAgICAgICAgICAgICAgICAke3RoaXMucmVuZGVyQ2hpcCgnZGlzY292ZXJ5LXRlYW0tNCcsICc0JywgJzQnKX1cbiAgICAgICAgICAgICAgICAke3RoaXMucmVuZGVyQ2hpcCgnZGlzY292ZXJ5LXRlYW0tNScsICc1JywgJzUnKX1cbiAgICAgICAgICAgICAgICAke3RoaXMucmVuZGVyQ2hpcCgnZGlzY292ZXJ5LXRlYW0tNicsICc2JywgJzYnKX1cbiAgICAgICAgICAgICAgICAke3RoaXMucmVuZGVyQ2hpcCgnZGlzY292ZXJ5LXRlYW0tNycsICc3JywgJzcnKX1cbiAgICAgICAgICAgICAgICAke3RoaXMucmVuZGVyQ2hpcCgnZGlzY292ZXJ5LXRlYW0tOHBsdXMnLCAnOCsnLCAnOCsnKX1cbiAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJsZC1zbGlkZXItcm93XCIgaWQ9XCJkaXNjb3ZlcnktdGVhbS1zbGlkZXItcm93XCI+XG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImxkLXNsaWRlci1sYWJlbFwiPlxuICAgICAgICAgICAgICAgICAgPHNwYW4+UGxheWVycyBwZXIgdGVhbTwvc3Bhbj5cbiAgICAgICAgICAgICAgICAgIDxzcGFuIGNsYXNzPVwidmFsXCI+XG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJsZC1zdGVwcGVyXCIgZGF0YS1yb2xlPVwibWluXCI+XG4gICAgICAgICAgICAgICAgICAgICAgPGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgY2xhc3M9XCJsZC1zdGVwLWJ0blwiIGRhdGEtYWN0aW9uPVwiZGVjXCIgZGF0YS10YXJnZXQ9XCJtaW5cIiBhcmlhLWxhYmVsPVwiRGVjcmVhc2UgbWluaW11bVwiPlx1MjIxMjwvYnV0dG9uPlxuICAgICAgICAgICAgICAgICAgICAgIDxpbnB1dCB0eXBlPVwibnVtYmVyXCIgaWQ9XCJkaXNjb3ZlcnktdGVhbS1taW5cIiBtaW49XCIyXCIgbWF4PVwiNjJcIiB2YWx1ZT1cIjJcIiBpbnB1dG1vZGU9XCJudW1lcmljXCI+XG4gICAgICAgICAgICAgICAgICAgICAgPGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgY2xhc3M9XCJsZC1zdGVwLWJ0blwiIGRhdGEtYWN0aW9uPVwiaW5jXCIgZGF0YS10YXJnZXQ9XCJtaW5cIiBhcmlhLWxhYmVsPVwiSW5jcmVhc2UgbWluaW11bVwiPis8L2J1dHRvbj5cbiAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgIDxzcGFuIGNsYXNzPVwic2VwXCI+XHUyMDEzPC9zcGFuPlxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwibGQtc3RlcHBlclwiIGRhdGEtcm9sZT1cIm1heFwiPlxuICAgICAgICAgICAgICAgICAgICAgIDxidXR0b24gdHlwZT1cImJ1dHRvblwiIGNsYXNzPVwibGQtc3RlcC1idG5cIiBkYXRhLWFjdGlvbj1cImRlY1wiIGRhdGEtdGFyZ2V0PVwibWF4XCIgYXJpYS1sYWJlbD1cIkRlY3JlYXNlIG1heGltdW1cIj5cdTIyMTI8L2J1dHRvbj5cbiAgICAgICAgICAgICAgICAgICAgICA8aW5wdXQgdHlwZT1cIm51bWJlclwiIGlkPVwiZGlzY292ZXJ5LXRlYW0tbWF4XCIgbWluPVwiMlwiIG1heD1cIjYyXCIgdmFsdWU9XCI2MlwiIGlucHV0bW9kZT1cIm51bWVyaWNcIj5cbiAgICAgICAgICAgICAgICAgICAgICA8YnV0dG9uIHR5cGU9XCJidXR0b25cIiBjbGFzcz1cImxkLXN0ZXAtYnRuXCIgZGF0YS1hY3Rpb249XCJpbmNcIiBkYXRhLXRhcmdldD1cIm1heFwiIGFyaWEtbGFiZWw9XCJJbmNyZWFzZSBtYXhpbXVtXCI+KzwvYnV0dG9uPlxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgIDwvc3Bhbj5cbiAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwibGQtcmFuZ2VcIiBpZD1cImRpc2NvdmVyeS10ZWFtLXJhbmdlLXJvb3RcIj5cbiAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ0cmFja1wiPjxkaXYgY2xhc3M9XCJ0cmFjay1maWxsXCIgaWQ9XCJkaXNjb3ZlcnktdGVhbS1yYW5nZS1maWxsXCI+PC9kaXY+PC9kaXY+XG4gICAgICAgICAgICAgICAgICA8aW5wdXQgdHlwZT1cInJhbmdlXCIgaWQ9XCJkaXNjb3ZlcnktdGVhbS1taW4tc2xpZGVyXCIgbWluPVwiMFwiIG1heD1cIjEwMDBcIiB2YWx1ZT1cIjBcIiBjbGFzcz1cImNhcGFjaXR5LXNsaWRlciBjYXBhY2l0eS1zbGlkZXItbWluXCI+XG4gICAgICAgICAgICAgICAgICA8aW5wdXQgdHlwZT1cInJhbmdlXCIgaWQ9XCJkaXNjb3ZlcnktdGVhbS1tYXgtc2xpZGVyXCIgbWluPVwiMFwiIG1heD1cIjEwMDBcIiB2YWx1ZT1cIjEwMDBcIiBjbGFzcz1cImNhcGFjaXR5LXNsaWRlciBjYXBhY2l0eS1zbGlkZXItbWF4XCI+XG4gICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImxkLXRpY2tzXCIgaWQ9XCJkaXNjb3ZlcnktdGVhbS10aWNrc1wiPjwvZGl2PlxuICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgPGxhYmVsIGNsYXNzPVwibGQtMnhcIiBhcmlhLXByZXNzZWQ9XCJmYWxzZVwiPlxuICAgICAgICAgICAgICAgIDxpbnB1dCB0eXBlPVwiY2hlY2tib3hcIiBpZD1cImRpc2NvdmVyeS10ZWFtLXR3by10aW1lc1wiPlxuICAgICAgICAgICAgICAgIDxzcGFuIGNsYXNzPVwiY2hlY2tcIj4ke0lDT05fQ0hFQ0t9PC9zcGFuPlxuICAgICAgICAgICAgICAgIDxzcGFuIGNsYXNzPVwibGJsXCI+PHN0cm9uZz5Mb2NrIG1heC1wZXItdGVhbSB0byAyXHUwMEQ3IHRoZSBtaW48L3N0cm9uZz48L3NwYW4+XG4gICAgICAgICAgICAgIDwvbGFiZWw+XG4gICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJsZC1jdXJyZW50LWdhbWUtaW5mb1wiIGlkPVwiZGlzY292ZXJ5LWN1cnJlbnQtZ2FtZS1pbmZvXCIgc3R5bGU9XCJkaXNwbGF5OiBub25lO1wiPjwvZGl2PlxuICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICA8L2Rpdj5cblxuICAgICAgICAgIDxkaXYgY2xhc3M9XCJsZC1zZWN0aW9uXCI+XG4gICAgICAgICAgICAke3RoaXMucmVuZGVyU2VjdGlvblRvZ2dsZShcbiAgICAgICAgICAgICAgJ21vZGlmaWVycycsXG4gICAgICAgICAgICAgICdNb2RpZmllcnMnLFxuICAgICAgICAgICAgICBgPHNwYW4gY2xhc3M9XCJsZC1tb2RzLWxlZ2VuZFwiPlxuICAgICAgICAgICAgICAgIDxzcGFuIGNsYXNzPVwia2V5XCI+PHNwYW4gY2xhc3M9XCJzd2F0Y2hcIj48L3NwYW4+QW55PC9zcGFuPlxuICAgICAgICAgICAgICAgIDxzcGFuIGNsYXNzPVwia2V5XCI+PHNwYW4gY2xhc3M9XCJzd2F0Y2ggcmVxXCI+PC9zcGFuPlJlcTwvc3Bhbj5cbiAgICAgICAgICAgICAgICA8c3BhbiBjbGFzcz1cImtleVwiPjxzcGFuIGNsYXNzPVwic3dhdGNoIGJsa1wiPjwvc3Bhbj5FeGNsPC9zcGFuPlxuICAgICAgICAgICAgICA8L3NwYW4+YFxuICAgICAgICAgICAgKX1cbiAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJsZC1zZWN0aW9uLWJvZHlcIiBpZD1cImRpc2NvdmVyeS1tb2RpZmllcnMtYm9keVwiPlxuXG4gICAgICAgICAgICA8ZGl2IGNsYXNzPVwibGQtbW9kLWdyb3VwXCI+XG4gICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJsZC1tb2QtZ3JvdXAtbGFiZWxcIj5NYXA8L2Rpdj5cbiAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImxkLW1vZHMgZGlzY292ZXJ5LW1vZGlmaWVyLWdyaWRcIj5cbiAgICAgICAgICAgICAgICAke3RoaXMucmVuZGVyTW9kaWZpZXJDaGlwKCdtb2RpZmllci1pc0NvbXBhY3QnLCAnQ29tcGFjdCcpfVxuICAgICAgICAgICAgICAgICR7dGhpcy5yZW5kZXJNb2RpZmllckNoaXAoJ21vZGlmaWVyLWlzUmFuZG9tU3Bhd24nLCAnUmFuZG9tIFNwYXduJyl9XG4gICAgICAgICAgICAgICAgJHt0aGlzLnJlbmRlck1vZGlmaWVyQ2hpcCgnbW9kaWZpZXItaXNDcm93ZGVkJywgJ0Nyb3dkZWQnKX1cbiAgICAgICAgICAgICAgICAke3RoaXMucmVuZGVyTW9kaWZpZXJDaGlwKCdtb2RpZmllci1pc0hhcmROYXRpb25zJywgJ0hhcmQgTmF0aW9ucycpfVxuICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgIDwvZGl2PlxuXG4gICAgICAgICAgICA8ZGl2IGNsYXNzPVwibGQtbW9kLWdyb3VwXCI+XG4gICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJsZC1tb2QtZ3JvdXAtbGFiZWxcIj5HYW1lcGxheTwvZGl2PlxuICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwibGQtbW9kc1wiPlxuICAgICAgICAgICAgICAgICR7dGhpcy5yZW5kZXJNb2RpZmllckNoaXAoJ21vZGlmaWVyLWlzQWxsaWFuY2VzRGlzYWJsZWQnLCAnQWxsaWFuY2VzIE9mZicpfVxuICAgICAgICAgICAgICAgICR7dGhpcy5yZW5kZXJNb2RpZmllckNoaXAoJ21vZGlmaWVyLWlzTnVrZXNEaXNhYmxlZCcsICdOdWtlcyBPZmYnKX1cbiAgICAgICAgICAgICAgICAke3RoaXMucmVuZGVyTW9kaWZpZXJDaGlwKCdtb2RpZmllci1pc1NBTXNEaXNhYmxlZCcsICdTQU1zIE9mZicpfVxuICAgICAgICAgICAgICAgICR7dGhpcy5yZW5kZXJNb2RpZmllckNoaXAoJ21vZGlmaWVyLWlzUGVhY2VUaW1lJywgJ1BlYWNlIFRpbWUnKX1cbiAgICAgICAgICAgICAgICAke3RoaXMucmVuZGVyTW9kaWZpZXJDaGlwKCdtb2RpZmllci1pc1dhdGVyTnVrZXMnLCAnV2F0ZXIgTnVrZXMnKX1cbiAgICAgICAgICAgICAgICAke3RoaXMucmVuZGVyTW9kaWZpZXJDaGlwKCdtb2RpZmllci1pc0Rvb21zZGF5Q2xvY2snLCAnRG9vbXNkYXkgQ2xvY2snKX1cbiAgICAgICAgICAgICAgICAke3RoaXMucmVuZGVyTW9kaWZpZXJDaGlwKCdtb2RpZmllci1pc1RydXN0ZWQnLCAnVHJ1c3RlZCcpfVxuICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgIDwvZGl2PlxuXG4gICAgICAgICAgICA8ZGl2IGNsYXNzPVwibGQtbW9kLWdyb3VwXCI+XG4gICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJsZC1tb2QtZ3JvdXAtbGFiZWxcIj5FY29ub215PC9kaXY+XG4gICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJsZC1tb2RzXCI+XG4gICAgICAgICAgICAgICAgJHt0aGlzLnJlbmRlck1vZGlmaWVyQ2hpcCgnbW9kaWZpZXItc3RhcnRpbmdHb2xkLTEwMDAwMDAnLCAnU3RhcnQgR29sZCAxTScpfVxuICAgICAgICAgICAgICAgICR7dGhpcy5yZW5kZXJNb2RpZmllckNoaXAoJ21vZGlmaWVyLXN0YXJ0aW5nR29sZC01MDAwMDAwJywgJ1N0YXJ0IEdvbGQgNU0nKX1cbiAgICAgICAgICAgICAgICAke3RoaXMucmVuZGVyTW9kaWZpZXJDaGlwKCdtb2RpZmllci1zdGFydGluZ0dvbGQtMjUwMDAwMDAnLCAnU3RhcnQgR29sZCAyNU0nKX1cbiAgICAgICAgICAgICAgICAke3RoaXMucmVuZGVyTW9kaWZpZXJDaGlwKCdtb2RpZmllci1nb2xkTXVsdGlwbGllci0yJywgJ0dvbGQgXHUwMEQ3MicpfVxuICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgIDwvZGl2PlxuXG4gICAgICAgICAgICA8ZGl2IGNsYXNzPVwibGQtbW9kcy1oaW50XCI+XG4gICAgICAgICAgICAgIENsaWNrIHRvIGN5Y2xlIDxzdHJvbmc+QW55PC9zdHJvbmc+IFx1MjE5MiA8c3Ryb25nIGNsYXNzPVwicmVxXCI+UmVxdWlyZWQ8L3N0cm9uZz4gXHUyMTkyIDxzdHJvbmcgY2xhc3M9XCJibGtcIj5FeGNsdWRlZDwvc3Ryb25nPi5cbiAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgPC9kaXY+XG5cbiAgICAgICAgICA8ZGl2IGNsYXNzPVwibGQtc2VjdGlvblwiPlxuICAgICAgICAgICAgJHt0aGlzLnJlbmRlclNlY3Rpb25Ub2dnbGUoJ21hcHMnLCAnTWFwcycsICc8c3BhbiBjbGFzcz1cImxkLXNlY3Rpb24tYXNpZGVcIiBpZD1cImRpc2NvdmVyeS1tYXBzLXN1bW1hcnlcIj5BbnkgbWFwPC9zcGFuPicpfVxuICAgICAgICAgICAgPGRpdiBjbGFzcz1cImxkLXNlY3Rpb24tYm9keVwiIGlkPVwiZGlzY292ZXJ5LW1hcHMtYm9keVwiPlxuICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwibGQtbWFwcy10b29sc1wiPlxuICAgICAgICAgICAgICAgIDxpbnB1dCB0eXBlPVwic2VhcmNoXCIgaWQ9XCJkaXNjb3ZlcnktbWFwcy1zZWFyY2hcIiBjbGFzcz1cImxkLW1hcHMtc2VhcmNoXCIgcGxhY2Vob2xkZXI9XCJTZWFyY2ggbWFwc1wiIGFyaWEtbGFiZWw9XCJTZWFyY2ggbWFwc1wiPlxuICAgICAgICAgICAgICAgIDxidXR0b24gdHlwZT1cImJ1dHRvblwiIGNsYXNzPVwibGQtbWFwcy1jbGVhclwiIGlkPVwiZGlzY292ZXJ5LW1hcHMtY2xlYXJcIj5DbGVhcjwvYnV0dG9uPlxuICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgPGRpdiBpZD1cImRpc2NvdmVyeS1tYXBzLWdyb3Vwc1wiPiR7dGhpcy5yZW5kZXJNYXBHcm91cHMoKX08L2Rpdj5cbiAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImxkLW1vZHMtaGludFwiPlxuICAgICAgICAgICAgICAgIEFwcGxpZXMgdG8gZXZlcnkgbW9kZS4gV2l0aCBhIDxzdHJvbmcgY2xhc3M9XCJyZXFcIj5SZXF1aXJlZDwvc3Ryb25nPiBtYXAsIG9ubHkgcmVxdWlyZWQgbWFwcyBtYXRjaC5cbiAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICA8L2Rpdj5cblxuICAgICAgICAgIDxkaXYgY2xhc3M9XCJsZC1zZWN0aW9uXCI+XG4gICAgICAgICAgICAke3RoaXMucmVuZGVyU2VjdGlvblRvZ2dsZSgnbG9iYmllcycsICdMb2JiaWVzJywgJycpfVxuICAgICAgICAgICAgPGRpdiBjbGFzcz1cImxkLXNlY3Rpb24tYm9keVwiIGlkPVwiZGlzY292ZXJ5LWxvYmJpZXMtYm9keVwiPlxuICAgICAgICAgICAgICA8bGFiZWwgY2xhc3M9XCJsZC0yeFwiIGFyaWEtcHJlc3NlZD1cImZhbHNlXCI+XG4gICAgICAgICAgICAgICAgPGlucHV0IHR5cGU9XCJjaGVja2JveFwiIGlkPVwiZGlzY292ZXJ5LWhvc3RlZC10b2dnbGVcIj5cbiAgICAgICAgICAgICAgICA8c3BhbiBjbGFzcz1cImNoZWNrXCI+JHtJQ09OX0NIRUNLfTwvc3Bhbj5cbiAgICAgICAgICAgICAgICA8c3BhbiBjbGFzcz1cImxibFwiPjxzdHJvbmc+SW5jbHVkZSBob3N0ZWQgYW5kIGN1c3RvbSBsb2JiaWVzPC9zdHJvbmc+PC9zcGFuPlxuICAgICAgICAgICAgICA8L2xhYmVsPlxuICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgPC9kaXY+XG4gICAgICAgIDwvZGl2PlxuICAgICAgICA8ZGl2IGNsYXNzPVwiZGlzY292ZXJ5LWZvb3RlclwiPlxuICAgICAgICAgIDxkaXYgY2xhc3M9XCJzdW1tYXJ5XCI+XG4gICAgICAgICAgICA8c3BhbiBjbGFzcz1cIm51bVwiIGlkPVwiZGlzY292ZXJ5LWZpbHRlci1jb3VudFwiPjA8L3NwYW4+XG4gICAgICAgICAgICA8c3Bhbj5hY3RpdmUgPHNwYW4gaWQ9XCJkaXNjb3ZlcnktZmlsdGVyLXdvcmRcIj5maWx0ZXJzPC9zcGFuPjwvc3Bhbj5cbiAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICA8YnV0dG9uIHR5cGU9XCJidXR0b25cIiBjbGFzcz1cInJlc2V0XCIgaWQ9XCJkaXNjb3ZlcnktcmVzZXRcIj5SZXNldCBhbGw8L2J1dHRvbj5cbiAgICAgICAgPC9kaXY+XG4gICAgICA8L2Rpdj5cbiAgICBgO1xuXG4gICAgZG9jdW1lbnQuYm9keS5hcHBlbmRDaGlsZCh0aGlzLnBhbmVsKTtcblxuICAgIHRoaXMuc2V0dXBFdmVudExpc3RlbmVycygpO1xuICAgIHRoaXMubG9hZFVJRnJvbVNldHRpbmdzKCk7XG4gICAgZm9yIChjb25zdCBzZWN0aW9uIG9mIFBBTkVMX1NFQ1RJT05TKSB0aGlzLmFwcGx5U2VjdGlvbkNvbGxhcHNlKHNlY3Rpb24pO1xuXG4gICAgdGhpcy5mZmFTbGlkZXIgPSBuZXcgUmFuZ2VTbGlkZXIoe1xuICAgICAgY29udGFpbmVySWQ6ICdkaXNjb3ZlcnktZmZhLXNsaWRlci1yb3cnLFxuICAgICAgcmFuZ2VSb290SWQ6ICdkaXNjb3ZlcnktZmZhLXJhbmdlLXJvb3QnLFxuICAgICAgbWluU2xpZGVySWQ6ICdkaXNjb3ZlcnktZmZhLW1pbi1zbGlkZXInLFxuICAgICAgbWF4U2xpZGVySWQ6ICdkaXNjb3ZlcnktZmZhLW1heC1zbGlkZXInLFxuICAgICAgbWluSW5wdXRJZDogJ2Rpc2NvdmVyeS1mZmEtbWluJyxcbiAgICAgIG1heElucHV0SWQ6ICdkaXNjb3ZlcnktZmZhLW1heCcsXG4gICAgICBmaWxsSWQ6ICdkaXNjb3ZlcnktZmZhLXJhbmdlLWZpbGwnLFxuICAgICAgYm91bmRzOiB7IG1pbjogMSwgbWF4OiAxMjUgfSxcbiAgICAgIG9uQ2hhbmdlOiAoKSA9PiB0aGlzLnJlZnJlc2hDcml0ZXJpYSgpLFxuICAgIH0pO1xuXG4gICAgdGhpcy50ZWFtU2xpZGVyID0gbmV3IFJhbmdlU2xpZGVyKHtcbiAgICAgIGNvbnRhaW5lcklkOiAnZGlzY292ZXJ5LXRlYW0tc2xpZGVyLXJvdycsXG4gICAgICByYW5nZVJvb3RJZDogJ2Rpc2NvdmVyeS10ZWFtLXJhbmdlLXJvb3QnLFxuICAgICAgbWluU2xpZGVySWQ6ICdkaXNjb3ZlcnktdGVhbS1taW4tc2xpZGVyJyxcbiAgICAgIG1heFNsaWRlcklkOiAnZGlzY292ZXJ5LXRlYW0tbWF4LXNsaWRlcicsXG4gICAgICBtaW5JbnB1dElkOiAnZGlzY292ZXJ5LXRlYW0tbWluJyxcbiAgICAgIG1heElucHV0SWQ6ICdkaXNjb3ZlcnktdGVhbS1tYXgnLFxuICAgICAgZmlsbElkOiAnZGlzY292ZXJ5LXRlYW0tcmFuZ2UtZmlsbCcsXG4gICAgICB0aWNrc0NvbnRhaW5lcklkOiAnZGlzY292ZXJ5LXRlYW0tdGlja3MnLFxuICAgICAgYm91bmRzOiB7XG4gICAgICAgIG1pbjogVEVBTV9NSU5fUExBWUVSU19QRVJfVEVBTSxcbiAgICAgICAgbWF4OiBURUFNX01BWF9QTEFZRVJTX1BFUl9URUFNLFxuICAgICAgfSxcbiAgICAgIHN0b3BzOiBURUFNX1BMQVlFUlNfUEVSX1RFQU1fU1RPUFMsXG4gICAgICBsb2NrTWF4VG9Ud2ljZU1pbjogKCkgPT4gdGhpcy5pc1RlYW1Ud29UaW1lc01pbkVuYWJsZWQsXG4gICAgICBvbkNoYW5nZTogKCkgPT4gdGhpcy5yZWZyZXNoQ3JpdGVyaWEoKSxcbiAgICB9KTtcblxuICAgIHRoaXMudXBkYXRlU3RhdHVzTGFiZWwoKTtcbiAgICB0aGlzLnVwZGF0ZUZpbHRlckNvdW50KCk7XG4gICAgdGhpcy5zeW5jU2VhcmNoVGltZXIoKTtcbiAgICB0aGlzLnN0YXJ0R2FtZUluZm9VcGRhdGVzKCk7XG4gIH1cblxuICBwcml2YXRlIHVwZGF0ZVNsZWVwU3RhdGUoKTogdm9pZCB7XG4gICAgY29uc3Qgb25Mb2JieSA9IExvYmJ5VXRpbHMuaXNPbkxvYmJ5UGFnZSgpO1xuICAgIHRoaXMuc2xlZXBpbmcgPSAhb25Mb2JieTtcblxuICAgIGlmICh0aGlzLnNsZWVwaW5nKSB7XG4gICAgICB0aGlzLnBhbmVsLmNsYXNzTGlzdC5hZGQoJ2hpZGRlbicpO1xuICAgICAgdGhpcy5zdG9wVGltZXIoKTtcbiAgICAgIHRoaXMuc3RvcEdhbWVJbmZvVXBkYXRlcygpO1xuICAgICAgdGhpcy51cGRhdGVRdWV1ZUNhcmRQdWxzZXMobmV3IFNldCgpKTtcbiAgICAgIHRoaXMudXBkYXRlU2VlQWxsU2lnbmFscyhmYWxzZSwgbmV3IFNldCgpKTtcbiAgICAgIHRoaXMuaGlkZVVwY29taW5nU3RyaXAoKTtcbiAgICAgIHRoaXMubG9iYnlCb2FyZC5oaWRlKCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMucGFuZWwuY2xhc3NMaXN0LnJlbW92ZSgnaGlkZGVuJyk7XG4gICAgICB0aGlzLnN5bmNTZWFyY2hUaW1lcigpO1xuICAgICAgdGhpcy5zdGFydEdhbWVJbmZvVXBkYXRlcygpO1xuICAgICAgdGhpcy51cGRhdGVMb2JieUJvYXJkKHRoaXMubGFzdExvYmJpZXMpO1xuICAgIH1cbiAgfVxuXG4gIGNsZWFudXAoKTogdm9pZCB7XG4gICAgdGhpcy5pc0Rpc3Bvc2VkID0gdHJ1ZTtcbiAgICB0aGlzLnN0b3BUaW1lcigpO1xuICAgIHRoaXMuc3RvcEdhbWVJbmZvVXBkYXRlcygpO1xuICAgIGlmICh0aGlzLnB1bHNlU3luY1RpbWVvdXQpIHtcbiAgICAgIGNsZWFyVGltZW91dCh0aGlzLnB1bHNlU3luY1RpbWVvdXQpO1xuICAgICAgdGhpcy5wdWxzZVN5bmNUaW1lb3V0ID0gbnVsbDtcbiAgICB9XG4gICAgdGhpcy5hY3RpdmVNYXRjaFNvdXJjZXMuY2xlYXIoKTtcbiAgICB0aGlzLmFwcGx5UXVldWVDYXJkUHVsc2VzKCk7XG4gICAgdGhpcy51cGRhdGVTZWVBbGxTaWduYWxzKGZhbHNlLCBuZXcgU2V0KCkpO1xuICAgIHRoaXMuc2VlQWxsT2JzZXJ2ZXI/LmRpc2Nvbm5lY3QoKTtcbiAgICB0aGlzLnNlZUFsbE9ic2VydmVyID0gbnVsbDtcbiAgICB0aGlzLm9ic2VydmVkU2VlQWxsVmlldyA9IG51bGw7XG4gICAgdGhpcy51cGNvbWluZ1N0cmlwPy5wYXJlbnROb2RlPy5yZW1vdmVDaGlsZCh0aGlzLnVwY29taW5nU3RyaXApO1xuICAgIHRoaXMudXBjb21pbmdTdHJpcCA9IG51bGw7XG4gICAgdGhpcy5sYXN0VXBjb21pbmdTbG90cyA9IG5ldyBNYXAoKTtcbiAgICB0aGlzLmxhc3RVcGNvbWluZ01hdGNoU291cmNlcyA9IG5ldyBTZXQoKTtcbiAgICB0aGlzLnVwY29taW5nU2xvdFNpZ25hdHVyZXMuY2xlYXIoKTtcbiAgICB0aGlzLmxvYmJ5Qm9hcmQuZGlzcG9zZSgpO1xuICAgIHRoaXMucGFuZWwucGFyZW50Tm9kZT8ucmVtb3ZlQ2hpbGQodGhpcy5wYW5lbCk7XG4gIH1cbn1cbiIsICIvKipcbiAqIEFkZGl0aXZlIGVuaGFuY2VyIGZvciB0aGUgbmF0aXZlIGpvaW4tbG9iYnkgbW9kYWwgcGxheWVyIGxpc3QuXG4gKi9cblxuaW50ZXJmYWNlIExvYmJ5Q2xpZW50IHtcbiAgY2xpZW50SUQ/OiBzdHJpbmc7XG4gIHVzZXJuYW1lPzogc3RyaW5nO1xuICBjbGFuVGFnPzogc3RyaW5nIHwgbnVsbDtcbn1cblxuaW50ZXJmYWNlIFRlYW1QcmV2aWV3IHtcbiAgcGxheWVycz86IExvYmJ5Q2xpZW50W107XG59XG5cbmludGVyZmFjZSBMb2JieVBsYXllclZpZXdFbGVtZW50IGV4dGVuZHMgSFRNTEVsZW1lbnQge1xuICBjdXJyZW50Q2xpZW50SUQ/OiBzdHJpbmc7XG4gIGNsaWVudHM/OiBMb2JieUNsaWVudFtdO1xuICB0ZWFtUHJldmlldz86IFRlYW1QcmV2aWV3W107XG59XG5cbmV4cG9ydCBjbGFzcyBDdXJyZW50UGxheWVySGlnaGxpZ2h0ZXIge1xuICBwcml2YXRlIG9ic2VydmVyOiBNdXRhdGlvbk9ic2VydmVyIHwgbnVsbCA9IG51bGw7XG4gIHByaXZhdGUgYW5pbWF0aW9uRnJhbWVJZDogbnVtYmVyIHwgbnVsbCA9IG51bGw7XG5cbiAgc3RhcnQoKTogdm9pZCB7XG4gICAgaWYgKHRoaXMub2JzZXJ2ZXIpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICB0aGlzLm9ic2VydmVyID0gbmV3IE11dGF0aW9uT2JzZXJ2ZXIoKCkgPT4gdGhpcy5zY2hlZHVsZUFwcGx5SGlnaGxpZ2h0cygpKTtcbiAgICB0aGlzLm9ic2VydmVyLm9ic2VydmUoZG9jdW1lbnQuYm9keSwge1xuICAgICAgYXR0cmlidXRlczogZmFsc2UsXG4gICAgICBjaGlsZExpc3Q6IHRydWUsXG4gICAgICBzdWJ0cmVlOiB0cnVlLFxuICAgIH0pO1xuXG4gICAgdGhpcy5hcHBseUhpZ2hsaWdodHMoKTtcbiAgfVxuXG4gIHN0b3AoKTogdm9pZCB7XG4gICAgdGhpcy5vYnNlcnZlcj8uZGlzY29ubmVjdCgpO1xuICAgIHRoaXMub2JzZXJ2ZXIgPSBudWxsO1xuXG4gICAgaWYgKHRoaXMuYW5pbWF0aW9uRnJhbWVJZCAhPT0gbnVsbCkge1xuICAgICAgY2FuY2VsQW5pbWF0aW9uRnJhbWUodGhpcy5hbmltYXRpb25GcmFtZUlkKTtcbiAgICAgIHRoaXMuYW5pbWF0aW9uRnJhbWVJZCA9IG51bGw7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBzY2hlZHVsZUFwcGx5SGlnaGxpZ2h0cygpOiB2b2lkIHtcbiAgICBpZiAodGhpcy5hbmltYXRpb25GcmFtZUlkICE9PSBudWxsKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdGhpcy5hbmltYXRpb25GcmFtZUlkID0gcmVxdWVzdEFuaW1hdGlvbkZyYW1lKCgpID0+IHtcbiAgICAgIHRoaXMuYW5pbWF0aW9uRnJhbWVJZCA9IG51bGw7XG4gICAgICB0aGlzLmFwcGx5SGlnaGxpZ2h0cygpO1xuICAgIH0pO1xuICB9XG5cbiAgcHJpdmF0ZSBhcHBseUhpZ2hsaWdodHMoKTogdm9pZCB7XG4gICAgZm9yIChjb25zdCB2aWV3IG9mIEFycmF5LmZyb20oZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbCgnbG9iYnktcGxheWVyLXZpZXcnKSkpIHtcbiAgICAgIHRoaXMuYXBwbHlIaWdobGlnaHRUb1ZpZXcodmlldyBhcyBMb2JieVBsYXllclZpZXdFbGVtZW50KTtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIGFwcGx5SGlnaGxpZ2h0VG9WaWV3KHZpZXc6IExvYmJ5UGxheWVyVmlld0VsZW1lbnQpOiB2b2lkIHtcbiAgICB0aGlzLmNsZWFySGlnaGxpZ2h0cyh2aWV3KTtcblxuICAgIGNvbnN0IG5hdGl2ZUZmYVJvd3MgPSBBcnJheS5mcm9tKFxuICAgICAgdmlldy5xdWVyeVNlbGVjdG9yQWxsPEhUTUxFbGVtZW50PignLnBsYXllci10YWcuY3VycmVudC1wbGF5ZXInKVxuICAgICk7XG4gICAgaWYgKG5hdGl2ZUZmYVJvd3MubGVuZ3RoID4gMCkge1xuICAgICAgbmF0aXZlRmZhUm93cy5mb3JFYWNoKChyb3cpID0+IHJvdy5jbGFzc0xpc3QuYWRkKCdvZi1jdXJyZW50LXBsYXllci1ib29zdCcpKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBjb25zdCBuYXRpdmVUZWFtUm93cyA9IHRoaXMuZ2V0TmF0aXZlVGVhbVJvd3Modmlldyk7XG4gICAgbmF0aXZlVGVhbVJvd3MuZm9yRWFjaCgocm93KSA9PiByb3cuY2xhc3NMaXN0LmFkZCgnb2YtY3VycmVudC1wbGF5ZXItYm9vc3QnKSk7XG5cbiAgICBjb25zdCBuYXRpdmVUZWFtQ2FyZHMgPSB0aGlzLmdldE5hdGl2ZVRlYW1DYXJkcyh2aWV3KTtcbiAgICBuYXRpdmVUZWFtQ2FyZHMuZm9yRWFjaCgoY2FyZCkgPT4gY2FyZC5jbGFzc0xpc3QuYWRkKCdvZi1jdXJyZW50LXBsYXllci10ZWFtLWJvb3N0JykpO1xuXG4gICAgaWYgKG5hdGl2ZVRlYW1Sb3dzLmxlbmd0aCA+IDAgfHwgbmF0aXZlVGVhbUNhcmRzLmxlbmd0aCA+IDApIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICB0aGlzLmFwcGx5RmFsbGJhY2tIaWdobGlnaHQodmlldyk7XG4gIH1cblxuICBwcml2YXRlIGNsZWFySGlnaGxpZ2h0cyh2aWV3OiBQYXJlbnROb2RlKTogdm9pZCB7XG4gICAgdmlldy5xdWVyeVNlbGVjdG9yQWxsKCcub2YtY3VycmVudC1wbGF5ZXItYm9vc3QnKS5mb3JFYWNoKChlbGVtZW50KSA9PiB7XG4gICAgICBlbGVtZW50LmNsYXNzTGlzdC5yZW1vdmUoJ29mLWN1cnJlbnQtcGxheWVyLWJvb3N0Jyk7XG4gICAgfSk7XG4gICAgdmlldy5xdWVyeVNlbGVjdG9yQWxsKCcub2YtY3VycmVudC1wbGF5ZXItdGVhbS1ib29zdCcpLmZvckVhY2goKGVsZW1lbnQpID0+IHtcbiAgICAgIGVsZW1lbnQuY2xhc3NMaXN0LnJlbW92ZSgnb2YtY3VycmVudC1wbGF5ZXItdGVhbS1ib29zdCcpO1xuICAgIH0pO1xuICB9XG5cbiAgcHJpdmF0ZSBnZXROYXRpdmVUZWFtUm93cyh2aWV3OiBQYXJlbnROb2RlKTogSFRNTEVsZW1lbnRbXSB7XG4gICAgcmV0dXJuIEFycmF5LmZyb20odmlldy5xdWVyeVNlbGVjdG9yQWxsPEhUTUxFbGVtZW50PignZGl2JykpLmZpbHRlcigoZWxlbWVudCkgPT4ge1xuICAgICAgY29uc3QgY2xhc3NMaXN0ID0gZWxlbWVudC5jbGFzc0xpc3Q7XG4gICAgICByZXR1cm4gKFxuICAgICAgICBjbGFzc0xpc3QuY29udGFpbnMoJ2JnLXNreS02MDAvMjAnKSAmJlxuICAgICAgICBjbGFzc0xpc3QuY29udGFpbnMoJ2JvcmRlci1za3ktNTAwLzQwJylcbiAgICAgICk7XG4gICAgfSk7XG4gIH1cblxuICBwcml2YXRlIGdldE5hdGl2ZVRlYW1DYXJkcyh2aWV3OiBQYXJlbnROb2RlKTogSFRNTEVsZW1lbnRbXSB7XG4gICAgcmV0dXJuIEFycmF5LmZyb20odmlldy5xdWVyeVNlbGVjdG9yQWxsPEhUTUxFbGVtZW50PignZGl2JykpLmZpbHRlcigoZWxlbWVudCkgPT4ge1xuICAgICAgY29uc3QgY2xhc3NMaXN0ID0gZWxlbWVudC5jbGFzc0xpc3Q7XG4gICAgICByZXR1cm4gY2xhc3NMaXN0LmNvbnRhaW5zKCdyb3VuZGVkLXhsJykgJiYgY2xhc3NMaXN0LmNvbnRhaW5zKCdib3JkZXItc2t5LTUwMC82MCcpO1xuICAgIH0pO1xuICB9XG5cbiAgcHJpdmF0ZSBhcHBseUZhbGxiYWNrSGlnaGxpZ2h0KHZpZXc6IExvYmJ5UGxheWVyVmlld0VsZW1lbnQpOiB2b2lkIHtcbiAgICBjb25zdCBjdXJyZW50Q2xpZW50SUQgPSB2aWV3LmN1cnJlbnRDbGllbnRJRDtcbiAgICBjb25zdCBjbGllbnRzID0gQXJyYXkuaXNBcnJheSh2aWV3LmNsaWVudHMpID8gdmlldy5jbGllbnRzIDogW107XG4gICAgaWYgKCFjdXJyZW50Q2xpZW50SUQgfHwgY2xpZW50cy5sZW5ndGggPT09IDApIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBjb25zdCBjdXJyZW50Q2xpZW50SW5kZXggPSBjbGllbnRzLmZpbmRJbmRleChcbiAgICAgIChjbGllbnQpID0+IGNsaWVudD8uY2xpZW50SUQgPT09IGN1cnJlbnRDbGllbnRJRFxuICAgICk7XG4gICAgaWYgKGN1cnJlbnRDbGllbnRJbmRleCA8IDApIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBjb25zdCBjdXJyZW50Q2xpZW50ID0gY2xpZW50c1tjdXJyZW50Q2xpZW50SW5kZXhdO1xuICAgIGNvbnN0IGRpc3BsYXlOYW1lID0gdGhpcy5mb3JtYXREaXNwbGF5TmFtZShjdXJyZW50Q2xpZW50KTtcblxuICAgIGNvbnN0IGZmYVJvd3MgPSBBcnJheS5mcm9tKHZpZXcucXVlcnlTZWxlY3RvckFsbDxIVE1MRWxlbWVudD4oJy5wbGF5ZXItdGFnJykpO1xuICAgIGlmIChmZmFSb3dzW2N1cnJlbnRDbGllbnRJbmRleF0pIHtcbiAgICAgIGZmYVJvd3NbY3VycmVudENsaWVudEluZGV4XS5jbGFzc0xpc3QuYWRkKCdvZi1jdXJyZW50LXBsYXllci1ib29zdCcpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGNvbnN0IGV4YWN0Um93cyA9IEFycmF5LmZyb20odmlldy5xdWVyeVNlbGVjdG9yQWxsPEhUTUxFbGVtZW50PignW2RhdGEtY2xpZW50LWlkXScpKS5maWx0ZXIoXG4gICAgICAocm93KSA9PiByb3cuZGF0YXNldC5jbGllbnRJZCA9PT0gY3VycmVudENsaWVudElEXG4gICAgKTtcbiAgICBleGFjdFJvd3MuZm9yRWFjaCgocm93KSA9PiByb3cuY2xhc3NMaXN0LmFkZCgnb2YtY3VycmVudC1wbGF5ZXItYm9vc3QnKSk7XG5cbiAgICBjb25zdCBtYXRjaGluZ1RleHRSb3dzID0gdGhpcy5maW5kUm93c0J5RGlzcGxheU5hbWUodmlldywgZGlzcGxheU5hbWUpO1xuICAgIG1hdGNoaW5nVGV4dFJvd3MuZm9yRWFjaCgocm93KSA9PiByb3cuY2xhc3NMaXN0LmFkZCgnb2YtY3VycmVudC1wbGF5ZXItYm9vc3QnKSk7XG5cbiAgICBjb25zdCB0ZWFtQ2FyZHMgPSBBcnJheS5mcm9tKHZpZXcucXVlcnlTZWxlY3RvckFsbDxIVE1MRWxlbWVudD4oJy5yb3VuZGVkLXhsJykpO1xuICAgIGNvbnN0IHRlYW1QcmV2aWV3ID0gQXJyYXkuaXNBcnJheSh2aWV3LnRlYW1QcmV2aWV3KSA/IHZpZXcudGVhbVByZXZpZXcgOiBbXTtcbiAgICBjb25zdCBhY3RpdmVQcmV2aWV3cyA9IHRlYW1QcmV2aWV3LmZpbHRlcihcbiAgICAgIChwcmV2aWV3KSA9PiBBcnJheS5pc0FycmF5KHByZXZpZXcucGxheWVycykgJiYgcHJldmlldy5wbGF5ZXJzLmxlbmd0aCA+IDBcbiAgICApO1xuICAgIGNvbnN0IGN1cnJlbnRUZWFtSW5kZXggPSBhY3RpdmVQcmV2aWV3cy5maW5kSW5kZXgoKHByZXZpZXcpID0+XG4gICAgICBBcnJheS5pc0FycmF5KHByZXZpZXcucGxheWVycykgJiZcbiAgICAgIHByZXZpZXcucGxheWVycy5zb21lKChwbGF5ZXIpID0+IHBsYXllcj8uY2xpZW50SUQgPT09IGN1cnJlbnRDbGllbnRJRClcbiAgICApO1xuXG4gICAgaWYgKGN1cnJlbnRUZWFtSW5kZXggPj0gMCAmJiB0ZWFtQ2FyZHNbY3VycmVudFRlYW1JbmRleF0pIHtcbiAgICAgIHRlYW1DYXJkc1tjdXJyZW50VGVhbUluZGV4XS5jbGFzc0xpc3QuYWRkKCdvZi1jdXJyZW50LXBsYXllci10ZWFtLWJvb3N0Jyk7XG5cbiAgICAgIGNvbnN0IGNhcmRSb3dzID0gdGhpcy5maW5kUm93c0J5RGlzcGxheU5hbWUodGVhbUNhcmRzW2N1cnJlbnRUZWFtSW5kZXhdLCBkaXNwbGF5TmFtZSk7XG4gICAgICBjYXJkUm93cy5mb3JFYWNoKChyb3cpID0+IHJvdy5jbGFzc0xpc3QuYWRkKCdvZi1jdXJyZW50LXBsYXllci1ib29zdCcpKTtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIGZvcm1hdERpc3BsYXlOYW1lKGNsaWVudDogTG9iYnlDbGllbnQgfCB1bmRlZmluZWQpOiBzdHJpbmcge1xuICAgIGlmICghY2xpZW50Py51c2VybmFtZSkge1xuICAgICAgcmV0dXJuICcnO1xuICAgIH1cblxuICAgIHJldHVybiBjbGllbnQuY2xhblRhZyA/IGBbJHtjbGllbnQuY2xhblRhZ31dICR7Y2xpZW50LnVzZXJuYW1lfWAgOiBjbGllbnQudXNlcm5hbWU7XG4gIH1cblxuICBwcml2YXRlIGZpbmRSb3dzQnlEaXNwbGF5TmFtZShyb290OiBQYXJlbnROb2RlLCBkaXNwbGF5TmFtZTogc3RyaW5nKTogSFRNTEVsZW1lbnRbXSB7XG4gICAgaWYgKCFkaXNwbGF5TmFtZSkge1xuICAgICAgcmV0dXJuIFtdO1xuICAgIH1cblxuICAgIGNvbnN0IG1hdGNoZXM6IEhUTUxFbGVtZW50W10gPSBbXTtcblxuICAgIGZvciAoY29uc3QgZWxlbWVudCBvZiBBcnJheS5mcm9tKHJvb3QucXVlcnlTZWxlY3RvckFsbDxIVE1MRWxlbWVudD4oJ3NwYW4sIGRpdicpKSkge1xuICAgICAgY29uc3QgdGV4dCA9IGVsZW1lbnQudGV4dENvbnRlbnQ/LnRyaW0oKTtcbiAgICAgIGlmICghdGV4dCB8fCB0ZXh0ICE9PSBkaXNwbGF5TmFtZSkge1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cblxuICAgICAgY29uc3Qgcm93ID1cbiAgICAgICAgZWxlbWVudC5jbG9zZXN0PEhUTUxFbGVtZW50PignW2RhdGEtY2xpZW50LWlkXScpID8/XG4gICAgICAgIGVsZW1lbnQuY2xvc2VzdDxIVE1MRWxlbWVudD4oJy5wbGF5ZXItdGFnJykgPz9cbiAgICAgICAgZWxlbWVudC5jbG9zZXN0PEhUTUxFbGVtZW50PignLnRlYW0tcGxheWVyLXJvdycpID8/XG4gICAgICAgIGVsZW1lbnQuY2xvc2VzdDxIVE1MRWxlbWVudD4oJ2RpdicpO1xuXG4gICAgICBpZiAocm93ICYmICFtYXRjaGVzLmluY2x1ZGVzKHJvdykpIHtcbiAgICAgICAgbWF0Y2hlcy5wdXNoKHJvdyk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIG1hdGNoZXM7XG4gIH1cbn1cbiIsICIvKipcbiAqIE9wZW5Gcm9udCBHYW1lIE5vdGlmaWVyXG4gKlxuICogTWFpbiBlbnRyeSBwb2ludCBmb3IgdGhlIHVzZXJzY3JpcHQuXG4gKi9cblxuaW1wb3J0IHsgZ2V0U3R5bGVzIH0gZnJvbSAnQC9zdHlsZXMvc3R5bGVzJztcbmltcG9ydCB7IFNvdW5kVXRpbHMgfSBmcm9tICdAL3V0aWxzL1NvdW5kVXRpbHMnO1xuaW1wb3J0IHsgVVJMT2JzZXJ2ZXIgfSBmcm9tICdAL3V0aWxzL1VSTE9ic2VydmVyJztcbmltcG9ydCB7IExvYmJ5RGF0YU1hbmFnZXIgfSBmcm9tICdAL2RhdGEvTG9iYnlEYXRhTWFuYWdlcic7XG5pbXBvcnQgeyBMb2JieURpc2NvdmVyeVVJIH0gZnJvbSAnQC9tb2R1bGVzL2xvYmJ5LWRpc2NvdmVyeS9Mb2JieURpc2NvdmVyeVVJJztcbmltcG9ydCB7IEN1cnJlbnRQbGF5ZXJIaWdobGlnaHRlciB9IGZyb20gJ0AvbW9kdWxlcy9sb2JieS1kaXNjb3ZlcnkvQ3VycmVudFBsYXllckhpZ2hsaWdodGVyJztcblxuKGZ1bmN0aW9uICgpIHtcbiAgJ3VzZSBzdHJpY3QnO1xuXG4gIGNvbnNvbGUubG9nKCdbT3BlbkZyb250IEdhbWUgTm90aWZpZXJdIEluaXRpYWxpemluZyBhZGFwdGF0aW9uIGZvciBPcGVuRnJvbnQgMC4zMC4uLicpO1xuXG4gIEdNX2FkZFN0eWxlKGdldFN0eWxlcygpKTtcbiAgU291bmRVdGlscy5wcmVsb2FkU291bmRzKCk7XG4gIFVSTE9ic2VydmVyLmluaXQoKTtcbiAgTG9iYnlEYXRhTWFuYWdlci5zdGFydCgpO1xuXG4gIGNvbnN0IGxvYmJ5RGlzY292ZXJ5ID0gbmV3IExvYmJ5RGlzY292ZXJ5VUkoKTtcbiAgY29uc3QgY3VycmVudFBsYXllckhpZ2hsaWdodGVyID0gbmV3IEN1cnJlbnRQbGF5ZXJIaWdobGlnaHRlcigpO1xuXG4gIExvYmJ5RGF0YU1hbmFnZXIuc3Vic2NyaWJlKChsb2JiaWVzLCBzZXJ2ZXJUaW1lKSA9PiB7XG4gICAgbG9iYnlEaXNjb3ZlcnkucmVjZWl2ZUxvYmJ5VXBkYXRlKGxvYmJpZXMsIHNlcnZlclRpbWUpO1xuICB9KTtcblxuICBjdXJyZW50UGxheWVySGlnaGxpZ2h0ZXIuc3RhcnQoKTtcblxuICAvLyBPcGVuRnJvbnQgYWRkcyBgP2xpdmVgIHRvIHRoZSBVUkwgZXhhY3RseSB3aGVuIHRoZSBzZXJ2ZXInc1xuICAvLyBTZXJ2ZXJTdGFydEdhbWVNZXNzYWdlIGFycml2ZXMgKGhpc3RvcnkucHVzaFN0YXRlIGluIE9wZW5Gcm9udCdzXG4gIC8vIE1haW4udHMpLiBUcmVhdCB0aGUgZmFsc2VcdTIxOTJ0cnVlIHRyYW5zaXRpb24gYXMgXCJnYW1lIGp1c3Qgc3RhcnRlZFwiLlxuICBjb25zdCBpc0xpdmVHYW1lVXJsID0gKHVybDogc3RyaW5nKTogYm9vbGVhbiA9PiB7XG4gICAgdHJ5IHtcbiAgICAgIHJldHVybiBuZXcgVVJMKHVybCkuc2VhcmNoUGFyYW1zLmhhcygnbGl2ZScpO1xuICAgIH0gY2F0Y2gge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgfTtcblxuICBsZXQgd2FzTGl2ZSA9IGlzTGl2ZUdhbWVVcmwobG9jYXRpb24uaHJlZik7XG4gIFVSTE9ic2VydmVyLnN1YnNjcmliZSgodXJsKSA9PiB7XG4gICAgY29uc3QgaXNMaXZlID0gaXNMaXZlR2FtZVVybCh1cmwpO1xuICAgIGlmICghd2FzTGl2ZSAmJiBpc0xpdmUgJiYgbG9iYnlEaXNjb3ZlcnkuaXNTb3VuZEVuYWJsZWQoKSkge1xuICAgICAgU291bmRVdGlscy5wbGF5R2FtZVN0YXJ0U291bmQoKTtcbiAgICB9XG4gICAgd2FzTGl2ZSA9IGlzTGl2ZTtcbiAgfSk7XG5cbiAgY29uc29sZS5sb2coJ1tPcGVuRnJvbnQgR2FtZSBOb3RpZmllcl0gUmVhZHkhIFx1RDgzRFx1REU4MCcpO1xufSkoKTtcbiJdLAogICJtYXBwaW5ncyI6ICI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUtPLE1BQU0sU0FBUztBQUFBLElBQ3BCLFdBQVc7QUFBQSxJQUNYLGFBQWE7QUFBQSxJQUNiLFlBQVk7QUFBQSxJQUNaLFVBQVU7QUFBQSxJQUNWLFNBQVM7QUFBQSxJQUVULGFBQWE7QUFBQSxJQUNiLGVBQWU7QUFBQSxJQUNmLFdBQVc7QUFBQSxJQUNYLFdBQVc7QUFBQSxJQUVYLFFBQVE7QUFBQSxJQUNSLGNBQWM7QUFBQSxJQUNkLGNBQWM7QUFBQSxJQUVkLFFBQVE7QUFBQSxJQUNSLFlBQVk7QUFBQSxJQUNaLFlBQVk7QUFBQSxJQUNaLGNBQWM7QUFBQSxJQUVkLFNBQVM7QUFBQSxJQUNULGFBQWE7QUFBQSxJQUNiLFFBQVE7QUFBQSxJQUNSLFlBQVk7QUFBQSxJQUNaLFlBQVk7QUFBQTtBQUFBLElBR1osYUFBYTtBQUFBLElBQ2IsYUFBYTtBQUFBLElBQ2IsV0FBVztBQUFBLElBQ1gsY0FBYztBQUFBLElBQ2QsV0FBVztBQUFBLElBQ1gsU0FBUztBQUFBLElBQ1QsY0FBYztBQUFBLElBQ2QsT0FBTztBQUFBLEVBQ1Q7QUFFTyxNQUFNLFFBQVE7QUFBQSxJQUNuQixNQUFNO0FBQUEsSUFDTixTQUFTO0FBQUEsSUFDVCxNQUFNO0FBQUEsRUFDUjtBQVdPLE1BQU0sU0FBUztBQUFBLElBQ3BCLElBQUk7QUFBQSxJQUNKLElBQUk7QUFBQSxJQUNKLElBQUk7QUFBQSxJQUNKLElBQUk7QUFBQSxFQUNOO0FBRU8sTUFBTSxVQUFVO0FBQUEsSUFDckIsSUFBSTtBQUFBLElBQ0osSUFBSTtBQUFBLElBQ0osSUFBSTtB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LE1BQU0sSUFBSTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEscUJBUVYsTUFBTSxPQUFPO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLHFCQXVDYixNQUFNLElBQUk7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSwrQkFxQ0EsT0FBTyxJQUFJLFdBQVcsT0FBTyxJQUFJO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLCtCQWVqQyxPQUFPLElBQUksa0JBQWtCLE9BQU8sSUFBSTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSw0QkF3QjNDLE9BQU8sTUFBTTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEscUJBZ0NwQixNQUFNLElBQUk7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsK0JBd0JBLE9BQU8sSUFBSSxXQUFXLE9BQU8sSUFBSSxrQkFBa0IsT0FBTyxJQUFJO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxxQkFvQnhFLE1BQU0sSUFBSTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxvQkFrRVgsUUFBUSxFQUFFO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsb0JBVVYsUUFBUSxFQUFFO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEscUJBZ0JULE1BQU0sSUFBSTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxxQkF5RFYsTUFBTSxJQUFJO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLCtCQTJCQSxPQUFPLElBQUksa0JBQWtCLE9BQU8sSUFBSTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEscUJBb0JsRCxNQUFNLElBQUk7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSx1QkFnQlIsT0FBTyxFQUFFO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLHFCQVlYLE1BQU0sSUFBSTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxxQkF3QlYsTUFBTSxJQUFJO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsK0JBc0JBLE9BQU8sSUFBSSxXQUFXLE9BQU8sSUFBSSxrQkFBa0IsT0FBTyxJQUFJO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSwrQkFpQjlELE9BQU8sSUFBSSxrQkFBa0IsT0FBTyxJQUFJO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsOEJBbUV6QyxPQUFPLElBQUk7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLHFCQW9FcEIsTUFBTSxJQUFJO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSwrQkFjQSxPQUFPLElBQUksV0FBVyxPQUFPLElBQUk7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSwyRUFVVyxPQUFPLFlBQVk7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxxQkErQnpFLE9BQU8sSUFBSTtBQUFBLGlCQUNmLE9BQU8sSUFBSTtBQUFBLHVCQUNMLE9BQU8sSUFBSTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLHFCQWFiLE1BQU0sSUFBSTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSwrQkE2Q0EsT0FBTyxJQUFJO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLDhCQVlaLE9BQU8sSUFBSSxnQkFBZ0IsT0FBTyxJQUFJO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLHVCQWlDN0MsT0FBTyxFQUFFO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSx1QkFvQlQsT0FBTyxFQUFFO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSw4QkFRRixPQUFPLE1BQU0sa0JBQWtCLE9BQU8sSUFBSTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLHVCQVVqRCxPQUFPLEVBQUU7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7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
