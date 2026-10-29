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

"use strict";(()=>{var f={bgPrimary:"#0d0f10",bgSecondary:"#14171a",bgElevated:"#1a1e22",bgRaised:"#20252a",bgHover:"rgba(255,255,255,0.04)",textPrimary:"#f2f1ee",textSecondary:"#c8c6c0",textMuted:"#8e8c85",textFaint:"#5a5853",border:"rgba(255,255,255,0.06)",borderSubtle:"rgba(255,255,255,0.10)",borderStrong:"rgba(255,255,255,0.16)",accent:"#7aa7d4",accentSoft:"rgba(122,167,212,0.14)",accentLine:"rgba(122,167,212,0.32)",accentShadow:"122,167,212",warning:"#d4a056",warningSoft:"rgba(212,160,86,0.14)",danger:"#d27a6b",dangerSoft:"rgba(210,122,107,0.14)",dangerLine:"rgba(210,122,107,0.30)",accentMuted:"rgba(122,167,212,0.14)",accentHover:"#9bbfe0",accentAlt:"#9bbfe0",borderAccent:"rgba(122,167,212,0.32)",highlight:"rgba(122,167,212,0.20)",success:"#74c69d",successSolid:"#74c69d",error:"#d27a6b"},h={surface:"rgba(16, 10, 24, 0.92)",live:"#e8600c",liveGlow:"rgba(232, 96, 12, 0.45)",text:"#fff",textSoft:"#ddd",onAccent:"#0d0a14",onNew:"#0a0610",fill:"#9fb8a6",badgeBg:"rgba(0, 0, 0, 0.6)",track:"rgba(255, 255, 255, 0.09)",chip:"rgba(255, 255, 255, 0.08)",blockedBg:"rgba(200, 70, 50, 0.25)",blockedText:"#f2c4bb",panel:"rgba(10, 6, 16, 0.60)"},b={body:"'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif",display:"'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif",mono:"'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace"},ve={xs:"4px",sm:"8px",md:"12px",lg:"16px",xl:"20px",xxl:"24px"},E={sm:"6px",md:"7px",lg:"10px",xl:"14px"},q={sm:"0 1px 3px rgba(0,0,0,0.4)",md:"0 2px 8px rgba(0,0,0,0.3)",lg:"0 1px 0 rgba(255,255,255,0.04) inset, 0 24px 48px rgba(0,0,0,0.45), 0 2px 8px rgba(0,0,0,0.3)"},p={fast:"0.12s",normal:"0.2s",slow:"0.3s"};var M={lobbyDiscoverySettings:"OF_LOBBY_DISCOVERY_SETTINGS",lobbyDiscoveryCollapsedSections:"OF_LOBBY_DISCOVERY_COLLAPSED_SECTIONS",lobbyBoardSidebarCollapsed:"OF_LOBBY_BOARD_SIDEBAR_COLLAPSED",lobbyBoardMode:"OF_LOBBY_BOARD_MODE"},xe={panel:9998,panelOverlay:9999,modal:1e4,notification:2e4},Me=[2,3,4,5,6,8,10,15,20,30,62],$=2,ie=62;function Se(){return`
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
      border-radius: ${E.xl};
      background: ${h.surface};
      color: var(--of-hud-text-1);
      font-family: ${b.body};
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
      color: ${h.live};
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
      border-radius: ${E.lg};
    }

    .of-board-card {
      /* The text panel cancels this padding with a negative margin to reach the card edges. */
      --of-board-card-padding: ${ve.sm};
      position: relative;
      flex: 1;
      min-width: 0;
      min-height: 118px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      align-items: stretch;
      gap: 6px;
      padding: var(--of-board-card-padding);
      overflow: hidden;
      border: 1px solid var(--of-hud-line-2);
      border-radius: ${E.lg};
      background: var(--of-hud-bg-1);
      color: ${h.text};
      text-align: left;
      cursor: pointer;
      transition: opacity ${p.normal}, border-color ${p.fast};
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
    .of-board-body {
      display: flex;
      flex-direction: column;
      gap: 3px;
      margin: 0 calc(-1 * var(--of-board-card-padding)) calc(-1 * var(--of-board-card-padding));
      padding: 7px var(--of-board-card-padding) var(--of-board-card-padding);
      border-top: 1px solid var(--of-hud-line-3);
      background: ${h.panel};
    }
    .of-board-badge {
      padding: 2px 6px;
      border: 1px solid var(--of-hud-line-3);
      border-radius: 4px;
      background: ${h.badgeBg};
      font-size: 10px;
      font-weight: 800;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      line-height: 1.3;
      white-space: nowrap;
      color: ${h.textSoft};
    }
    .of-board-badge[data-countdown-to] {
      border-color: transparent;
      background: ${h.live};
      color: ${h.text};
      font-family: ${b.mono};
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
      color: ${h.onAccent};
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
      font-family: ${b.mono};
      color: var(--of-hud-text-2);
    }
    .of-board-bar {
      flex: 1;
      min-width: 40px;
      height: 5px;
      border-radius: 3px;
      background: ${h.track};
      overflow: hidden;
    }
    .of-board-fill {
      display: block;
      height: 100%;
      background: ${h.fill};
    }
    .of-board-bar-hot .of-board-fill {
      background: ${h.live};
    }
    .of-board-mods {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
    }
    .of-board-mod {
      padding: 1px 6px;
      border-radius: 4px;
      background: ${h.chip};
      font-size: 11px;
      white-space: nowrap;
      color: var(--of-hud-text-2);
    }
    .of-board-mod-required {
      background: var(--of-hud-accent-soft);
      box-shadow: inset 0 0 0 1px var(--of-hud-accent);
      font-weight: 700;
      color: ${h.text};
    }
    .of-board-mod-blocked {
      background: ${h.blockedBg};
      text-decoration: line-through;
      color: ${h.blockedText};
    }
    .of-board-nomods {
      font-size: 11px;
      font-style: italic;
      color: var(--of-hud-text-4);
    }
    /* The overlay paints the frame and the flash above the thumbnail and the text panel.
       It stays inside the card, so it never touches a neighbour. */
    .of-board-card::after {
      content: '';
      position: absolute;
      inset: 0;
      z-index: 3;
      border-radius: inherit;
      pointer-events: none;
    }
    .of-board-card-match {
      border-color: ${h.live};
    }
    .of-board-card-match::after {
      box-shadow: inset 0 0 0 1px ${h.live};
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
      background: ${f.accent};
      font-size: 10px;
      font-weight: 800;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      color: ${h.onNew};
    }
    /* The flash follows a click on a notification. Its glow is inset, so it stays in the card. */
    @keyframes ofBoardFlash {
      0%, 100% {
        box-shadow: inset 0 0 0 1px ${h.live};
      }
      50% {
        box-shadow: inset 0 0 0 4px ${h.live}, inset 0 0 28px ${h.liveGlow};
      }
    }
    .of-board-card.of-board-card-flash::after {
      animation: ofBoardFlash 0.5s ease-in-out 4;
    }
    @media (prefers-reduced-motion: reduce) {
      .of-board-card.of-board-card-flash::after {
        animation: none;
        box-shadow: inset 0 0 0 4px ${h.live};
      }
    }
  `}function Le(){return`
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
      border-radius: ${E.lg};
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
      transition: background ${p.fast}, color ${p.fast};
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

    /* The floating panel's slots take no box of their own. */
    .ld-panel-slot {
      display: contents;
    }
  `}function Ce(){return`
    :root {
      --of-hud-accent: ${f.accent};
      --of-hud-accent-soft: ${f.accentSoft};
      --of-hud-accent-line: ${f.accentLine};
      --of-hud-bg-0: ${f.bgPrimary};
      --of-hud-bg-1: ${f.bgSecondary};
      --of-hud-bg-2: ${f.bgElevated};
      --of-hud-bg-3: ${f.bgRaised};
      --of-hud-text-1: ${f.textPrimary};
      --of-hud-text-2: ${f.textSecondary};
      --of-hud-text-3: ${f.textMuted};
      --of-hud-text-4: ${f.textFaint};
      --of-hud-line-1: ${f.border};
      --of-hud-line-2: ${f.borderSubtle};
      --of-hud-line-3: ${f.borderStrong};
      --of-hud-danger: ${f.danger};
      --of-hud-danger-soft: ${f.dangerSoft};
      --of-hud-danger-line: ${f.dangerLine};
    }

    @keyframes ofPanelEnter {
      from { opacity: 0; transform: translateY(10px); }
      to   { opacity: 1; transform: translateY(0); }
    }

    @keyframes livePulse {
      0%   { box-shadow: 0 0 0 0 rgba(${f.accentShadow}, 0.5); }
      70%  { box-shadow: 0 0 0 8px rgba(${f.accentShadow}, 0); }
      100% { box-shadow: 0 0 0 0 rgba(${f.accentShadow}, 0); }
    }

    .of-panel {
      position: fixed;
      background: linear-gradient(180deg, var(--of-hud-bg-2) 0%, var(--of-hud-bg-1) 100%);
      border: 1px solid var(--of-hud-line-2);
      border-radius: ${E.xl};
      box-shadow: ${q.lg};
      font-family: ${b.body};
      color: var(--of-hud-text-1);
      user-select: none;
      z-index: ${xe.panel};
      display: flex;
      flex-direction: column;
      overflow: hidden;
      animation: ofPanelEnter ${p.slow} ease;
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
      font-family: ${b.mono};
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
      transition: background ${p.fast}, color ${p.fast};
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
    .ld-original-switch {
      display: flex;
      align-items: center;
      gap: 6px;
      flex-shrink: 0;
      font-size: 11px;
      color: var(--of-hud-text-3);
      cursor: pointer;
      user-select: none;
    }
    .ld-original-switch:hover { color: var(--of-hud-text-1); }
    .ld-original-switch input { display: none; }
    .ld-original-track {
      position: relative;
      width: 24px;
      height: 14px;
      border-radius: 7px;
      background: var(--of-hud-bg-3);
      transition: background ${p.fast};
    }
    .ld-original-track::after {
      content: '';
      position: absolute;
      top: 2px;
      left: 2px;
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: var(--of-hud-text-2);
      transition: transform ${p.fast};
    }
    .ld-original-switch input:checked + .ld-original-track { background: var(--of-hud-accent); }
    .ld-original-switch input:checked + .ld-original-track::after { transform: translateX(10px); }
    .ld-mode-btn input { display: none; }
    .ld-chip input { display: none; }

    /* Header */
    .ld-head {
      padding: 16px 18px 12px;
      border-bottom: 1px solid var(--of-hud-line-1);
      flex-shrink: 0;
    }
    .ld-eyebrow {
      font-family: ${b.mono};
      font-size: 10px;
      letter-spacing: 0.16em;
      text-transform: uppercase;
      color: var(--of-hud-text-4);
      margin-bottom: 4px;
    }
    .ld-title {
      font-family: ${b.display};
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
      font-family: ${b.mono};
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
      transition: background ${p.fast}, color ${p.fast};
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
      transition: background ${p.fast}, border-color ${p.fast};
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
      transition: opacity ${p.normal};
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
      font-family: ${b.mono};
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
      transition: background ${p.fast}, color ${p.fast}, border-color ${p.fast};
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
      font-family: ${b.mono};
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
      box-shadow: ${q.sm};
      pointer-events: auto;
      cursor: grab;
    }
    .capacity-slider::-moz-range-thumb {
      width: 14px;
      height: 14px;
      border-radius: 50%;
      background: var(--of-hud-text-1);
      border: 1px solid rgba(0,0,0,0.4);
      box-shadow: ${q.sm};
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
      font-family: ${b.mono};
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
      font-family: ${b.mono};
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
      transition: background ${p.fast}, border-color ${p.fast};
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
      font-family: ${b.mono};
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
      border-radius: ${E.sm};
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
      font-family: ${b.mono};
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
      font-family: ${b.mono};
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
      transition: background ${p.fast}, color ${p.fast}, border-color ${p.fast};
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
      transition: background ${p.fast}, border-color ${p.fast};
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
      transition: transform ${p.fast};
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
      font-family: ${b.mono};
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
      transition: background ${p.fast}, color ${p.fast};
    }
    .discovery-footer .reset:hover {
      color: var(--of-hud-text-1);
      background: rgba(255,255,255,0.04);
    }

    /* Native join-modal player highlights \u2014 re-themed to blue accent */
    .of-current-player-boost {
      box-shadow: 0 0 0 1px var(--of-hud-accent), 0 0 16px var(--of-hud-accent-soft);
      background: linear-gradient(90deg, var(--of-hud-accent-soft), rgba(${f.accentShadow}, 0.06));
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
        box-shadow ${p.fast},
        filter ${p.fast},
        border-color ${p.fast};
      animation: discoveryCardActiveBeacon 1.45s ease-in-out infinite;
    }

    /* A matching card in OpenFront's See All View. */
    .of-discovery-see-all-match {
      border-radius: 1rem;
      animation: discoveryCardActiveBeacon 1.45s ease-in-out infinite;
    }

    ${Se()}
    ${Le()}
  `}var F={gameFoundAudio:null,gameStartAudio:null,audioUnlocked:!1,preloadSounds(){try{this.gameFoundAudio=new Audio("https://github.com/DeLoWaN/openfront-game-notifier/raw/refs/heads/main/notification_sounds/new-notification-014-363678.mp3"),this.gameFoundAudio.volume=.5,this.gameFoundAudio.preload="auto",this.gameStartAudio=new Audio("https://github.com/DeLoWaN/openfront-game-notifier/raw/refs/heads/main/notification_sounds/opening-bell-421471.mp3"),this.gameStartAudio.volume=.5,this.gameStartAudio.preload="auto",this.setupAudioUnlock()}catch(a){console.warn("[SoundUtils] Could not preload audio:",a)}},setupAudioUnlock(){let a=()=>{if(this.audioUnlocked)return;let e=[];this.gameFoundAudio&&(this.gameFoundAudio.volume=.01,e.push(this.gameFoundAudio.play().then(()=>{this.gameFoundAudio&&(this.gameFoundAudio.pause(),this.gameFoundAudio.currentTime=0,this.gameFoundAudio.volume=.5)}).catch(()=>{}))),this.gameStartAudio&&(this.gameStartAudio.volume=.01,e.push(this.gameStartAudio.play().then(()=>{this.gameStartAudio&&(this.gameStartAudio.pause(),this.gameStartAudio.currentTime=0,this.gameStartAudio.volume=.5)}).catch(()=>{}))),Promise.all(e).then(()=>{this.audioUnlocked=!0,console.log("[SoundUtils] Audio unlocked successfully"),document.removeEventListener("click",a),document.removeEventListener("keydown",a),document.removeEventListener("touchstart",a)})};document.addEventListener("click",a,{once:!0}),document.addEventListener("keydown",a,{once:!0}),document.addEventListener("touchstart",a,{once:!0})},playGameFoundSound(){this.gameFoundAudio?(console.log("[SoundUtils] Attempting to play game found sound"),this.gameFoundAudio.currentTime=0,this.gameFoundAudio.play().catch(a=>{console.warn("[SoundUtils] Failed to play game found sound:",a)})):console.warn("[SoundUtils] Game found audio not initialized")},playGameStartSound(){this.gameStartAudio?(console.log("[SoundUtils] Attempting to play game start sound"),this.gameStartAudio.currentTime=0,this.gameStartAudio.play().catch(a=>{console.warn("[SoundUtils] Failed to play game start sound:",a)})):console.warn("[SoundUtils] Game start audio not initialized")}};var O={callbacks:[],lastUrl:location.href,initialized:!1,init(){if(this.initialized)return;this.initialized=!0;let a=()=>{location.href!==this.lastUrl&&(this.lastUrl=location.href,this.notify())};window.addEventListener("popstate",a),window.addEventListener("hashchange",a);let e=history.pushState,t=history.replaceState;history.pushState=function(...i){e.apply(history,i),setTimeout(a,0)},history.replaceState=function(...i){t.apply(history,i),setTimeout(a,0)},setInterval(a,200)},subscribe(a){this.callbacks.push(a),this.init()},notify(){this.callbacks.forEach(a=>a(location.href))}};var tt=["ffa","team","special","hosted"],ae={subscribers:[],lastLobbies:[],lastServerTime:null,started:!1,publicLobbiesListener:null,start(){this.started||(this.started=!0,this.publicLobbiesListener=a=>this.handlePublicLobbiesUpdate(a),document.addEventListener("public-lobbies-update",this.publicLobbiesListener))},stop(){this.started&&(this.started=!1,this.publicLobbiesListener&&(document.removeEventListener("public-lobbies-update",this.publicLobbiesListener),this.publicLobbiesListener=null))},subscribe(a){this.subscribers.push(a),this.lastLobbies.length>0&&a(this.lastLobbies,this.lastServerTime)},notifySubscribers(){this.subscribers.forEach(a=>a(this.lastLobbies,this.lastServerTime))},handlePublicLobbiesUpdate(a){let e=a.detail?.payload;this.lastLobbies=this.extractLobbies(e),this.lastServerTime=this.extractServerTime(e),this.notifySubscribers()},extractServerTime(a){let e=a?.serverTime;return typeof e=="number"&&Number.isFinite(e)?e:null},extractLobbies(a){if(!a||typeof a!="object")return[];if(Array.isArray(a.lobbies))return a.lobbies;let e=a.games;return e?tt.flatMap(t=>(e[t]??[]).map(i=>({...i,publicGameType:i.publicGameType??t}))):[]}};var B={lastActionTime:0,debounceDelay:800,getLobbyButton(){return document.querySelector("public-lobby")?.querySelector("button.group.relative.isolate")},canJoinLobby(){let a=document.querySelector("public-lobby");if(!a)return!1;let e=this.getLobbyButton();return!!(e&&!a.isLobbyHighlighted&&a.lobbies&&a.lobbies.length>0&&!e.disabled&&e.offsetParent!==null)},verifyState(a){let e=document.querySelector("public-lobby");if(!e)return!1;let t=this.getLobbyButton();return!t||t.disabled||t.offsetParent===null?!1:a==="in"?e.isLobbyHighlighted===!0:a==="out"?!!(!e.isLobbyHighlighted&&e.lobbies&&e.lobbies.length>0):!1},tryJoinLobby(){let a=Date.now();if(a-this.lastActionTime<this.debounceDelay)return!1;let e=this.getLobbyButton(),t=document.querySelector("public-lobby");return e&&t&&!t.isLobbyHighlighted&&t.lobbies&&t.lobbies.length>0&&!e.disabled&&e.offsetParent!==null?(this.lastActionTime=a,e.click(),setTimeout(()=>{this.verifyState("in")||console.warn("[LobbyUtils] Join may have failed, state not updated")},100),!0):!1},isOnLobbyPage(){if(document.body.classList.contains("in-game"))return!1;let a=document.getElementById("page-game");if(a&&!a.classList.contains("hidden"))return!1;let e=document.querySelector("canvas");if(e&&e.offsetParent!==null){let r=e.getBoundingClientRect();if(r.width>100&&r.height>100)return!1}let t=document.querySelector("public-lobby");if(t&&t.offsetParent!==null)return!0;if(t&&t.offsetParent===null)return!1;let i=document.getElementById("page-play");if(i&&!i.classList.contains("hidden")&&t)return!0;let o=window.location.pathname.replace(/\/+$/,"")||"/";return o==="/"||o==="/public-lobby"}};var z={isSupported(){return typeof Notification<"u"},isBackgrounded(){let a=document.visibilityState==="hidden"||document.hidden,e=typeof document.hasFocus=="function"?document.hasFocus():!0;return a||!e},async ensurePermission(){if(typeof Notification>"u")return!1;if(Notification.permission==="granted")return!0;if(Notification.permission==="denied")return!1;try{return await Notification.requestPermission()==="granted"}catch(a){return console.warn("[BrowserNotificationUtils] Permission request failed:",a),!1}},show(a){if(!this.isSupported()||!this.isBackgrounded())return!1;if(Notification.permission==="granted"){let e=new Notification(a.title,{body:a.body});return e.onclick=()=>{this.focusWindow(),a.onClick?.(),e.close()},!0}return!1},focusWindow(){window.focus()}};var it="sm:grid-cols-[2fr_1fr]";function _(a=document.querySelector("game-mode-selector")){return(a?Array.from(a.querySelectorAll("div")).find(t=>t.className.includes(it)):void 0)??null}function Te(a){return a.className.includes("sm:col-start-1")&&a.className.includes("sm:row-start-2")}function we(a){return a.tagName==="SECTION"}function Ee(a){return we(a)||Te(a)}function ke(a){let e=Array.from(a.children),t=e.find(we);return{ffaCell:e.find(Te),cardCells:t?Array.from(t.children).filter(i=>i.tagName==="DIV"):[]}}var Ae={world:"World",continental:"Continental",europe:"Europe",asia:"Asia",north_america:"North America",africa:"Africa",south_america:"South America",oceania:"Oceania",antarctica:"Antarctica",countries:"Countries",cosmic:"Cosmic",fictional:"Fictional",arcade:"Arcade",tournament:"Tournament",other:"Other"},Ie=["world","continental","europe","asia","north_america","africa","south_america","oceania","antarctica","countries","cosmic","fictional","arcade","tournament","other"],R=[{gameMap:"Achiran",name:"Achiran",categories:["europe","fictional"]},{gameMap:"Aegean",name:"Aegean",categories:["europe","asia"]},{gameMap:"Africa",name:"Africa",categories:["continental","africa"]},{gameMap:"Alps",name:"Alps",categories:["europe"]},{gameMap:"Amazon River",name:"Amazon River",categories:["south_america"]},{gameMap:"Antarctica",name:"Antarctica",categories:["continental","antarctica"]},{gameMap:"ArchipelagoSea",name:"Archipelago Sea",categories:["europe"]},{gameMap:"Arctic",name:"Arctic",categories:["europe","asia","north_america"]},{gameMap:"Asia",name:"Asia",categories:["continental","asia"]},{gameMap:"Australia",name:"Australia",categories:["oceania"]},{gameMap:"Bab el-Mandeb Strait",name:"Bab el-Mandeb Strait",categories:["asia","africa"]},{gameMap:"Baikal",name:"Baikal",categories:["asia"]},{gameMap:"Baikal Nuke Wars",name:"Baikal (Nuke Wars)",categories:["fictional"]},{gameMap:"Baja California",name:"Baja California",categories:["north_america"]},{gameMap:"Balkans",name:"Balkans",categories:["europe"]},{gameMap:"Balkhash",name:"Balkhash",categories:["asia"]},{gameMap:"Baltics",name:"Baltics",categories:["europe"]},{gameMap:"Benelux",name:"Benelux",categories:["europe","countries"]},{gameMap:"Bering Sea",name:"Bering Sea",categories:["asia","north_america"]},{gameMap:"Bering Strait",name:"Bering Strait",categories:["asia","north_america"]},{gameMap:"Between Two Seas",name:"Between Two Seas",categories:["europe","asia"]},{gameMap:"Black Sea",name:"Black Sea",categories:["europe","asia"]},{gameMap:"Bosphorus Straits",name:"Bosphorus Straits",categories:["europe","asia"]},{gameMap:"Brain Rot",name:"Brain Rot",categories:["arcade"]},{gameMap:"Branching Paths",name:"Branching Paths",categories:["arcade"]},{gameMap:"Britannia",name:"Britannia",categories:["europe"]},{gameMap:"Britannia Classic",name:"Britannia (Classic)",categories:["europe"]},{gameMap:"Canary Islands",name:"Canary Islands",categories:["africa"]},{gameMap:"Cape Cod",name:"Cape Cod",categories:["north_america"]},{gameMap:"Cape Of Good Hope",name:"Cape Of Good Hope",categories:["africa"]},{gameMap:"Caribbean",name:"Caribbean",categories:["north_america"]},{gameMap:"Caspian Sea",name:"Caspian Sea",categories:["asia"]},{gameMap:"Caucasus",name:"Caucasus",categories:["europe","asia"]},{gameMap:"Central America",name:"Central America",categories:["north_america"]},{gameMap:"Channel Islands",name:"Channel Islands",categories:["north_america"]},{gameMap:"China",name:"China",categories:["asia","countries"]},{gameMap:"Chopping Block",name:"Chopping Block",categories:["arcade"]},{gameMap:"Clearwater Lakes",name:"Clearwater Lakes",categories:["north_america"]},{gameMap:"Conakry",name:"Conakry",categories:["africa"]},{gameMap:"Crimea",name:"Crimea",categories:["europe"]},{gameMap:"Danish Straits",name:"Danish Straits",categories:["europe"]},{gameMap:"Deglaciated Antarctica",name:"Deglaciated Antarctica",categories:["antarctica","fictional"]},{gameMap:"Didier",name:"Didier",categories:["arcade"]},{gameMap:"Didier France",name:"Didier (France)",categories:["arcade"]},{gameMap:"Dyslexdria",name:"Dyslexdria",categories:["world","fictional"]},{gameMap:"East Asia",name:"East Asia",categories:["asia"]},{gameMap:"Europe",name:"Europe",categories:["continental","europe"]},{gameMap:"Europe Classic",name:"Europe (Classic)",categories:["continental","europe"]},{gameMap:"Falkland Islands",name:"Falkland Islands",categories:["south_america"]},{gameMap:"Faroe Islands",name:"Faroe Islands",categories:["europe"]},{gameMap:"Finger Lakes",name:"Finger Lakes",categories:["north_america"]},{gameMap:"Four Islands",name:"Four Islands",categories:["fictional"]},{gameMap:"France",name:"France",categories:["europe","countries"]},{gameMap:"Gateway to the Atlantic",name:"Gateway to the Atlantic",categories:["europe"]},{gameMap:"Germany",name:"Germany",categories:["europe","countries"]},{gameMap:"Giant World Map",name:"Giant World Map",categories:["world"]},{gameMap:"Great Lakes",name:"Great Lakes",categories:["north_america"]},{gameMap:"Gulf Of Guinea",name:"Gulf Of Guinea",categories:["africa"]},{gameMap:"Gulf Of Mexico",name:"Gulf Of Mexico",categories:["north_america"]},{gameMap:"Gulf of St. Lawrence",name:"Gulf of St. Lawrence",categories:["north_america"]},{gameMap:"Halkidiki",name:"Halkidiki",categories:["europe"]},{gameMap:"Hawaii",name:"Hawaii",categories:["oceania"]},{gameMap:"Hecate Strait",name:"Hecate Strait",categories:["north_america"]},{gameMap:"Hong Kong",name:"Hong Kong",categories:["asia"]},{gameMap:"Horn Of Africa",name:"Horn Of Africa",categories:["africa"]},{gameMap:"Iceland",name:"Iceland",categories:["europe"]},{gameMap:"Indian Subcontinent",name:"Indian Subcontinent",categories:["asia"]},{gameMap:"Irish Sea",name:"Irish Sea",categories:["europe"]},{gameMap:"Italia",name:"Italia",categories:["europe"]},{gameMap:"Japan",name:"Japan",categories:["asia","countries"]},{gameMap:"Juan De Fuca Strait",name:"Juan De Fuca Strait",categories:["north_america"]},{gameMap:"Korea",name:"Korea",categories:["asia","countries"]},{gameMap:"Labyrinth",name:"Labyrinth",categories:["arcade"]},{gameMap:"Las Vegas Strip",name:"Las Vegas Strip",categories:["north_america"]},{gameMap:"Lemnos",name:"Lemnos",categories:["europe"]},{gameMap:"Levant",name:"Levant",categories:["asia"]},{gameMap:"Lisbon",name:"Lisbon",categories:["europe"]},{gameMap:"Los Angeles",name:"Los Angeles",categories:["north_america"]},{gameMap:"Luna",name:"Luna",categories:["cosmic"]},{gameMap:"Madagascar",name:"Madagascar",categories:["africa"]},{gameMap:"Manicouagan",name:"Manicouagan",categories:["north_america"]},{gameMap:"Mare Nostrum",name:"Mare Nostrum",categories:["europe","asia","africa"]},{gameMap:"Mars",name:"Mars",categories:["cosmic"]},{gameMap:"Mena",name:"MENA",categories:["asia","africa"]},{gameMap:"Middle East",name:"Middle East",categories:["asia"]},{gameMap:"MilkyWay",name:"Milky Way",categories:["cosmic"]},{gameMap:"Mississippi River",name:"Mississippi River",categories:["north_america"]},{gameMap:"Montreal",name:"Montreal",categories:["north_america"]},{gameMap:"More Than Luck",name:"More Than Luck",categories:["arcade"]},{gameMap:"New York City",name:"New York City",categories:["north_america"]},{gameMap:"New Zealand",name:"New Zealand",categories:["oceania"]},{gameMap:"Nile Delta",name:"Nile Delta",categories:["africa"]},{gameMap:"North America",name:"North America",categories:["continental","north_america"]},{gameMap:"Northwest Passage",name:"Northwest Passage",categories:["north_america"]},{gameMap:"Oceania",name:"Oceania",categories:["continental","oceania"]},{gameMap:"Ommatrypta",name:"Ommatrypta",categories:["arcade"]},{gameMap:"Onion",name:"Onion",categories:["arcade"]},{gameMap:"Pangaea",name:"Pangaea",categories:["fictional"]},{gameMap:"Passage",name:"Passage",categories:["fictional"]},{gameMap:"Pluto",name:"Pluto",categories:["cosmic"]},{gameMap:"Pulicat Lake",name:"Pulicat Lake",categories:["asia"]},{gameMap:"Qing China",name:"Qing China",categories:["asia","countries"]},{gameMap:"Rio de Janeiro",name:"Rio de Janeiro",categories:["south_america"]},{gameMap:"Russia",name:"Russia",categories:["europe","asia","countries"]},{gameMap:"San Francisco",name:"San Francisco",categories:["north_america"]},{gameMap:"Scandinavia",name:"Scandinavia",categories:["europe"]},{gameMap:"Sierpinski",name:"Sierpinski",categories:["arcade"]},{gameMap:"Sol",name:"Sol",categories:["cosmic"]},{gameMap:"South America",name:"South America",categories:["continental","south_america"]},{gameMap:"SoutheastAsia",name:"Southeast Asia",categories:["asia"]},{gameMap:"Strait of Gibraltar",name:"Strait of Gibraltar",categories:["europe","africa"]},{gameMap:"Strait of Hormuz",name:"Strait of Hormuz",categories:["asia"]},{gameMap:"Strait Of Malacca",name:"Strait Of Malacca",categories:["asia"]},{gameMap:"Surrounded",name:"Surrounded",categories:["fictional"]},{gameMap:"Svalmel",name:"Svalmel",categories:["europe","north_america","fictional"]},{gameMap:"Taiwan Strait",name:"Taiwan Strait",categories:["asia"]},{gameMap:"The Box",name:"The Box",categories:["arcade"]},{gameMap:"Tierra Del Fuego",name:"Tierra Del Fuego",categories:["south_america"]},{gameMap:"Titan",name:"Titan",categories:["cosmic"]},{gameMap:"Tourney 2 Teams",name:"Tourney 2 Teams",categories:["tournament"]},{gameMap:"Tourney 3 Teams",name:"Tourney 3 Teams",categories:["tournament"]},{gameMap:"Tourney 4 Teams",name:"Tourney 4 Teams",categories:["tournament"]},{gameMap:"Tourney 8 Teams",name:"Tourney 8 Teams",categories:["tournament"]},{gameMap:"Traders Dream",name:"Traders Dream",categories:["fictional"]},{gameMap:"Two Lakes",name:"Two Lakes",categories:["europe"]},{gameMap:"United States",name:"United States",categories:["north_america","countries"]},{gameMap:"Vancouver Island",name:"Vancouver Island",categories:["north_america"]},{gameMap:"Venice",name:"Venice",categories:["europe"]},{gameMap:"Vietnam",name:"Vietnam",categories:["asia","countries"]},{gameMap:"Warship Warship",name:"Warship Warship",categories:["arcade"]},{gameMap:"World",name:"World",categories:["world"]},{gameMap:"World Inverted",name:"World Inverted",categories:["world","fictional"]},{gameMap:"Yangtze River",name:"Yangtze River",categories:["asia"]},{gameMap:"Yellow Sea",name:"Yellow Sea",categories:["asia"]},{gameMap:"Yenisei",name:"Yenisei",categories:["asia"]}];var at="any";function He(a){if(!a)return null;let e=a.toLowerCase().trim();return e==="free for all"||e==="ffa"||e==="free-for-all"?"FFA":e==="team"||e==="teams"?"Team":null}var ot=new Map(R.map(a=>[a.gameMap,a.name]));function re(a){return ot.get(a)??a}function k(a){return He(a.gameConfig?.gameMode)}function V(a){let e=a.publicGameType?.toLowerCase().trim();return e==="ffa"||e==="team"||e==="special"||e==="hosted"?e:null}function oe(a){if(a==="Duos"||a==="Trios"||a==="Quads"||a==="Humans Vs Nations"||a==="8+"||typeof a=="number"&&Number.isFinite(a)&&a>0)return a;if(typeof a=="string"){let e=parseInt(a,10);if(!Number.isNaN(e)&&e>0)return e}return null}function I(a){let e=a.gameConfig;if(!e||k(a)!=="Team")return null;let t=oe(e.playerTeams??null);return t!==null?t:oe(e.teamCount??e.teams??null)}function N(a){let e=a.gameConfig;return e?e.maxPlayers??e.maxClients??e.maxPlayersPerGame??a.maxClients??null:null}function De(a){return typeof a.numClients=="number"?a.numClients:null}function H(a,e){return!a||!e?null:a==="Duos"?2:a==="Trios"?3:a==="Quads"?4:a==="Humans Vs Nations"?e:typeof a=="number"&&a>0?Math.floor(e/a):null}function ne(a){return V(a)==="hosted"||a.custom===!0}var rt=["Atom Bomb","Hydrogen Bomb","MIRV"];function nt(a,e){let t=a.gameConfig,i=t?.disabledUnits??[];switch(e){case"isCompact":return t?.gameMapSize==="Compact";case"isRandomSpawn":return t?.randomSpawn===!0;case"isAlliancesDisabled":return t?.disableAlliances===!0;case"isNukesDisabled":return rt.every(o=>i.includes(o));case"isSAMsDisabled":return i.includes("SAM Launcher");case"isWaterNukes":return t?.waterNukes===!0;case"isDoomsdayClock":return t?.doomsdayClock!==void 0&&t.doomsdayClock.enabled!==!1;case"isTrusted":return t?.trusted;case"startingGold":return t?.startingGold??void 0;case"goldMultiplier":return t?.goldMultiplier??void 0;default:return}}function L(a,e){if(ne(a))return nt(a,e);let t=a.gameConfig?.publicGameModifiers;switch(e){case"isCompact":return t?.isCompact;case"isRandomSpawn":return t?.isRandomSpawn;case"isCrowded":return t?.isCrowded;case"isHardNations":return t?.isHardNations;case"isAlliancesDisabled":return t?.isAlliancesDisabled;case"isNukesDisabled":return t?.isNukesDisabled;case"isSAMsDisabled":return t?.isSAMsDisabled;case"isPeaceTime":return t?.isPeaceTime;case"isWaterNukes":return t?.isWaterNukes;case"isDoomsdayClock":return t?.isDoomsdayClock;case"isTrusted":return a.gameConfig?.trusted;case"startingGold":return t?.startingGold??a.gameConfig?.startingGold??void 0;case"goldMultiplier":return t?.goldMultiplier??a.gameConfig?.goldMultiplier??void 0;default:return}}function Pe(a){let e=k(a),t=I(a),i=N(a);if(e==="FFA")return i!==null?`FFA \u2022 ${i} slots`:"FFA";if(e!=="Team")return"Unsupported mode";if(t==="Humans Vs Nations")return i!==null?`Humans Vs Nations (${i})`:"Humans Vs Nations";if(t==="Duos")return"Duos";if(t==="Trios")return"Trios";if(t==="Quads")return"Quads";if(typeof t=="number"&&i!==null){let o=H(t,i);return o!==null?`${t} teams (${o} per team)`:`${t} teams`}return"Team"}function st(a){let e=k(a),t=I(a);return e==="FFA"?"FFA":e!=="Team"?"Unsupported mode":t==="Humans Vs Nations"?"Humans Vs Nations":t==="Duos"||t==="Trios"||t==="Quads"?t:typeof t=="number"?`${t} teams`:"Team"}function se(a){return a>=1e6&&a%1e6===0?`${a/1e6}M`:a>=1e3&&a%1e3===0?`${a/1e3}K`:String(a)}function lt(a){let e=r=>!!L(a,r),t=[];e("isCompact")&&t.push("Compact"),e("isRandomSpawn")&&t.push("Random"),e("isCrowded")&&t.push("Crowded"),e("isHardNations")&&t.push("Hard");let i=L(a,"startingGold");typeof i=="number"&&t.push(se(i));let o=L(a,"goldMultiplier");return typeof o=="number"&&t.push(`x${o}`),e("isAlliancesDisabled")&&t.push("No Alliances"),e("isNukesDisabled")&&t.push("No Nukes"),e("isSAMsDisabled")&&t.push("No SAMs"),e("isPeaceTime")&&t.push("Peace"),e("isWaterNukes")&&t.push("Water Nukes"),e("isDoomsdayClock")&&t.push("Doomsday"),e("isTrusted")&&t.push("Trusted"),t}function Fe(a){let e=[],t=a.gameConfig?.gameMap?.trim(),i=N(a),o=I(a),r=st(a);if(t&&e.push(re(t)),k(a)==="Team"&&o!=="Humans Vs Nations"){e.push(r);let d=H(o,i);d!==null&&e.push(`${d}/team`)}else e.push(r);let n=V(a);n==="hosted"?e.push("Hosted"):a.custom===!0?e.push("Custom"):n==="special"&&e.push("Special");let s=[];i!==null&&s.push(`${i} slots`);let l=lt(a);return l.length>0&&s.push(l.join(", ")),{title:e.join(" \u2022 "),body:s.join(" \u2022 ")}}function Ne(a){return typeof a=="number"&&Number.isFinite(a)?a:null}function S(a){return a==="blocked"||a==="rejected"?"blocked":a==="required"?"required":a==="any"||a==="allowed"||a==="indifferent"?"any":at}function $e(a){if(!a||typeof a!="object")return;let e={};for(let[t,i]of Object.entries(a)){let o=Number(t);Number.isFinite(o)&&(e[o]=S(i))}return Object.keys(e).length>0?e:void 0}function dt(a){if(!a||typeof a!="object")return;let e=a;return{isCompact:S(e.isCompact),isRandomSpawn:S(e.isRandomSpawn),isCrowded:S(e.isCrowded),isHardNations:S(e.isHardNations),isAlliancesDisabled:S(e.isAlliancesDisabled),isNukesDisabled:S(e.isNukesDisabled),isSAMsDisabled:S(e.isSAMsDisabled),isPeaceTime:S(e.isPeaceTime),isWaterNukes:S(e.isWaterNukes),isDoomsdayClock:S(e.isDoomsdayClock),isTrusted:S(e.isTrusted),startingGold:$e(e.startingGold),goldMultiplier:$e(e.goldMultiplier)}}function ct(a){let e=oe(a);return e==="Duos"||e==="Trios"||e==="Quads"?null:e}function ut(a){if(!Array.isArray(a))return[];let e=[];for(let t of a){let i=t,o=He(i.gameMode??null);if(!o)continue;let r=Ne(i.minPlayers),n=Ne(i.maxPlayers);o==="Team"&&(typeof r=="number"&&r<$&&(r=$),typeof r=="number"&&typeof n=="number"&&n<r&&(n=r)),e.push({gameMode:o,teamCount:o==="Team"?ct(i.teamCount??null):null,minPlayers:r,maxPlayers:n,modifiers:dt(i.modifiers)})}return e}function le(a,e=Date.now()){let t=Math.max(0,Math.floor((e-a)/1e3));return`${Math.floor(t/60)}m ${t%60}s`}function Oe(a,e,t){let i=a.gameConfig?.gameMap?.trim();if(!i)return null;let o=i.toLowerCase().replace(/[\s.()]+/g,"");if(!o)return null;let r=`maps/${encodeURIComponent(o)}/thumbnail.webp`,n=e?.[`maps/${o}/thumbnail.webp`];if(n){let s=(t??"").replace(/\/+$/,"");return s?`${s}${n}`:n}return`/${r}`}function pt(a){if(!a||typeof a!="object"||Array.isArray(a))return{};let e={};for(let[t,i]of Object.entries(a))t&&(i==="required"||i==="blocked")&&(e[t]=i);return e}function Be(a){return{criteria:ut(a?.criteria),discoveryEnabled:typeof a?.discoveryEnabled=="boolean"?a.discoveryEnabled:!0,soundEnabled:typeof a?.soundEnabled=="boolean"?a.soundEnabled:!0,desktopNotificationsEnabled:typeof a?.desktopNotificationsEnabled=="boolean"?a.desktopNotificationsEnabled:!1,isTeamTwoTimesMinEnabled:typeof a?.isTeamTwoTimesMinEnabled=="boolean"?a.isTeamTwoTimesMinEnabled:!!a?.isTeamThreeTimesMinEnabled,includeHostedAndCustomLobbies:typeof a?.includeHostedAndCustomLobbies=="boolean"?a.includeHostedAndCustomLobbies:!0,mapFilter:pt(a?.mapFilter)}}var mt=["isCompact","isRandomSpawn","isCrowded","isHardNations","isAlliancesDisabled","isNukesDisabled","isSAMsDisabled","isPeaceTime","isWaterNukes","isDoomsdayClock","isTrusted"],W=class{matchesCriteria(e,t,i={}){if(!e||!e.gameConfig||!t||t.length===0||!this.matchesMapFilter(e.gameConfig.gameMap,i))return!1;let o=k(e),r=N(e);if(!o||r===null)return!1;let n=I(e),s=o==="Team"?H(n,r):null,l=this.resolveLobbyTeamCount(n,s,r);for(let d of t){if(d.gameMode!==o)continue;if(o==="Team"){let m=d.teamCount!==null&&d.teamCount!==void 0;if(!m&&n==="Humans Vs Nations")continue;if(m){if(d.teamCount==="8+"){if(l===null||l<8)continue}else if(d.teamCount==="Humans Vs Nations"||d.teamCount==="Duos"||d.teamCount==="Trios"||d.teamCount==="Quads"){if(d.teamCount!==n)continue}else if(l===null||d.teamCount!==l)continue}if(s===null)continue}let c=o==="Team"?s:r;if(c!==null&&!(n!=="Humans Vs Nations"&&(d.minPlayers!==null&&c<d.minPlayers||d.maxPlayers!==null&&c>d.maxPlayers))&&this.matchesModifiers(e,d.modifiers))return!0}return!1}resolveLobbyTeamCount(e,t,i){return typeof e=="number"?e:e==="Humans Vs Nations"?null:t!==null&&t>0&&i!==null?Math.floor(i/t):null}matchesMapFilter(e,t){return e!==void 0&&t[e]==="blocked"?!1:Object.values(t).some(o=>o==="required")?e!==void 0&&t[e]==="required":!0}matchesModifiers(e,t){if(!t)return!0;for(let i of mt){let o=t[i];if(!o||o==="any")continue;let r=!!L(e,i);if(o==="blocked"&&r||o==="required"&&!r)return!1}return!(!this.matchesNumericModifier(L(e,"startingGold"),t.startingGold)||!this.matchesNumericModifier(L(e,"goldMultiplier"),t.goldMultiplier))}matchesNumericModifier(e,t){if(!t)return!0;let i=typeof e=="number"&&Number.isFinite(e)?e:null,o=Object.entries(t);if(o.length===0)return!0;let r=o.filter(([,s])=>s==="blocked").map(([s])=>Number(s));if(i!==null&&r.includes(i))return!1;let n=o.filter(([,s])=>s==="required").map(([s])=>Number(s));return!(n.length>0&&(i===null||!n.includes(i)))}};function de(a){return a.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}function A(a,e){if(e.length===0)return a;let t=e[0],i=e[e.length-1];return a<t?t:a>i?i:a}function D(a,e){if(e.length<2)return 0;let t=A(a,e),i=e.length-1;if(t>=e[i])return 1;if(t<=e[0])return 0;for(let o=0;o<i;o++){let r=e[o],n=e[o+1];if(t>=r&&t<=n){let s=(t-r)/(n-r);return(o+s)/i}}return 1}function ce(a,e){if(e.length<2)return e[0]??0;let t=e.length-1;if(a<=0)return e[0];if(a>=1)return e[t];let i=a*t,o=Math.floor(i),r=i-o,n=e[o]+r*(e[o+1]-e[o]);return Math.round(n)}var P=1e3,G=class{constructor(e){this.onMinSliderInput=()=>{let e=parseInt(this.minSlider.value,10)/P,t=ce(e,this.stops);this.applyValues(t,this.lastMax,{fireOnChange:!0,changed:"min"})};this.onMaxSliderInput=()=>{let e=parseInt(this.maxSlider.value,10)/P,t=ce(e,this.stops);this.applyValues(this.lastMin,t,{fireOnChange:!0,changed:"max"})};this.onMinInputChange=()=>{let e=parseInt(this.minInput.value,10);if(!Number.isFinite(e)){this.applyValues(this.lastMin,this.lastMax,{fireOnChange:!1,changed:"both"});return}let t=A(e,[this.cfg.bounds.min,this.cfg.bounds.max]);this.applyValues(t,this.lastMax,{fireOnChange:!0,changed:"min"})};this.onMaxInputChange=()=>{let e=parseInt(this.maxInput.value,10);if(!Number.isFinite(e)){this.applyValues(this.lastMin,this.lastMax,{fireOnChange:!1,changed:"both"});return}let t=A(e,[this.cfg.bounds.min,this.cfg.bounds.max]);this.applyValues(this.lastMin,t,{fireOnChange:!0,changed:"max"})};if(this.cfg=e,this.stops=e.stops??[e.bounds.min,e.bounds.max],this.root=e.root??document,this.minSlider=this.find(e.minSliderId),this.maxSlider=this.find(e.maxSliderId),this.minInput=this.find(e.minInputId),this.maxInput=this.find(e.maxInputId),this.rangeRoot=this.find(e.rangeRootId),this.container=this.find(e.containerId),!this.minSlider||!this.maxSlider||!this.minInput||!this.maxInput)throw new Error(`RangeSlider: missing required element in ${e.rangeRootId}`);this.minSlider.min="0",this.minSlider.max=String(P),this.maxSlider.min="0",this.maxSlider.max=String(P),this.lastMin=this.readInputClamped(this.minInput,e.bounds.min),this.lastMax=this.readInputClamped(this.maxInput,e.bounds.max),this.lastMax<this.lastMin&&(this.lastMax=this.lastMin),this.minSlider.addEventListener("input",this.onMinSliderInput),this.maxSlider.addEventListener("input",this.onMaxSliderInput),this.minInput.addEventListener("change",this.onMinInputChange),this.maxInput.addEventListener("change",this.onMaxInputChange),this.applyValues(this.lastMin,this.lastMax,{fireOnChange:!1,changed:"both"}),this.renderTicks(),this.wireSteppers(),this.applyLockState()}find(e){return this.root.querySelector(`[id="${e}"]`)}applyLockState(){let e=!!this.cfg.lockMaxToTwiceMin?.();this.maxSlider.disabled=e,this.maxSlider.classList.toggle("is-max-locked",e),this.maxInput.disabled=e,this.container&&this.container.querySelectorAll('.ld-step-btn[data-target="max"]').forEach(t=>{t.disabled=e}),e&&this.applyValues(this.lastMin,this.lastMax,{fireOnChange:!1,changed:"min"})}setMin(e){this.applyValues(e,this.lastMax,{fireOnChange:!0,changed:"min"})}setRange(e,t){this.applyValues(e,t,{fireOnChange:!1,changed:"both"})}readInputClamped(e,t){let i=parseInt(e.value,10);return Number.isFinite(i)?A(i,[this.cfg.bounds.min,this.cfg.bounds.max]):t}applyValues(e,t,i){let o=e,r=t;if(this.cfg.lockMaxToTwiceMin?.()&&(r=A(o*2,[this.cfg.bounds.min,this.cfg.bounds.max])),o>r){let n=i.changed??"both";n==="min"?r=o:n==="max"?o=r:(o=Math.min(e,t),r=Math.max(e,t))}if(this.lastMin=o,this.lastMax=r,this.minInput.value=String(o),this.maxInput.value=String(r),this.minSlider.value=String(Math.round(D(o,this.stops)*P)),this.maxSlider.value=String(Math.round(D(r,this.stops)*P)),this.rangeRoot){let n=D(o,this.stops)*100,s=D(r,this.stops)*100;this.rangeRoot.style.setProperty("--lo",`${n}%`),this.rangeRoot.style.setProperty("--hi",`${s}%`)}i.fireOnChange&&this.cfg.onChange(o,r)}renderTicks(){if(!this.cfg.ticksContainerId||!this.cfg.stops)return;let e=this.find(this.cfg.ticksContainerId);if(e){e.innerHTML="";for(let t of this.cfg.stops){let i=D(t,this.cfg.stops)*100,o=document.createElement("div");o.className="ld-tick",o.style.left=`${i}%`;let r=document.createElement("span");r.className="ld-tick-label",r.style.left=`${i}%`,r.textContent=String(t),e.appendChild(o),e.appendChild(r)}}}wireSteppers(){if(!this.container)return;this.container.querySelectorAll(".ld-step-btn").forEach(t=>{let i=t.dataset.target,o=t.dataset.action;!i||!o||t.addEventListener("click",()=>{let r=o==="inc"?1:-1;if(i==="min"){let n=A(this.lastMin+r,[this.cfg.bounds.min,this.cfg.bounds.max]);this.applyValues(n,this.lastMax,{fireOnChange:!0,changed:"min"})}else{let n=A(this.lastMax+r,[this.cfg.bounds.min,this.cfg.bounds.max]);this.applyValues(this.lastMin,n,{fireOnChange:!0,changed:"max"})}})})}};var Re=[1e6,5e6,25e6],Ge=[2],ft=["modifier-isCompact","modifier-isRandomSpawn","modifier-isCrowded","modifier-isHardNations","modifier-isAlliancesDisabled","modifier-isNukesDisabled","modifier-isSAMsDisabled","modifier-isPeaceTime","modifier-isWaterNukes","modifier-isDoomsdayClock","modifier-isTrusted"],ue=[...ft,...Re.map(a=>`modifier-startingGold-${a}`),...Ge.map(a=>`modifier-goldMultiplier-${a}`)],Ue=[["discovery-team-hvn","Humans Vs Nations"],["discovery-team-2","2"],["discovery-team-3","3"],["discovery-team-4","4"],["discovery-team-5","5"],["discovery-team-6","6"],["discovery-team-7","7"],["discovery-team-8plus","8+"]],pe=Ue.map(([a])=>a),me=["modes","modifiers","maps","lobbies"],ht={modes:!1,modifiers:!1,maps:!0,lobbies:!1},Q='<svg viewBox="0 0 24 24"><path d="M5 12l5 5L20 7"/></svg>',gt='<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>';function bt(){let a=GM_getValue(M.lobbyDiscoveryCollapsedSections,null),e={...ht};for(let t of me){let i=a?.[t];typeof i=="boolean"&&(e[t]=i)}return e}function _e(a){return a==="any"?"required":a==="required"?"blocked":"any"}var j=class{constructor(e){this.collapsedSections=bt();this.knownMaps=new Set(R.map(e=>e.gameMap));this.root=null;this.ffaSlider=null;this.teamSlider=null;this.criteria=e.initial.criteria,this.isTeamTwoTimesMinEnabled=e.initial.isTeamTwoTimesMinEnabled,this.includeHostedAndCustomLobbies=e.initial.includeHostedAndCustomLobbies,this.mapFilter=e.initial.mapFilter,this.onChange=e.onChange}getSettings(){return{criteria:this.criteria,isTeamTwoTimesMinEnabled:this.isTeamTwoTimesMinEnabled,includeHostedAndCustomLobbies:this.includeHostedAndCustomLobbies,mapFilter:this.mapFilter}}mount(e){this.cleanup();let t=document.createElement("div");t.className="discovery-body",t.innerHTML=this.renderBody(),e.appendChild(t),this.root=t,this.setupEventListeners(),this.loadUIFromSettings();for(let i of me)this.applySectionCollapse(i);this.ffaSlider=new G({root:t,containerId:"discovery-ffa-slider-row",rangeRootId:"discovery-ffa-range-root",minSliderId:"discovery-ffa-min-slider",maxSliderId:"discovery-ffa-max-slider",minInputId:"discovery-ffa-min",maxInputId:"discovery-ffa-max",fillId:"discovery-ffa-range-fill",bounds:{min:1,max:125},onChange:()=>this.refreshCriteria()}),this.teamSlider=new G({root:t,containerId:"discovery-team-slider-row",rangeRootId:"discovery-team-range-root",minSliderId:"discovery-team-min-slider",maxSliderId:"discovery-team-max-slider",minInputId:"discovery-team-min",maxInputId:"discovery-team-max",fillId:"discovery-team-range-fill",ticksContainerId:"discovery-team-ticks",bounds:{min:$,max:ie},stops:Me,lockMaxToTwiceMin:()=>this.isTeamTwoTimesMinEnabled,onChange:()=>this.refreshCriteria()}),this.updateFilterCount()}cleanup(){this.root?.remove(),this.root=null,this.ffaSlider=null,this.teamSlider=null}setCurrentGameInfo(e){let t=this.$("discovery-current-game-info");t&&(t.style.display=e===null?"none":"block",e!==null&&(t.textContent=e))}addFeedOnlyMaps(e){for(let t of e){let i=t.gameConfig?.gameMap?.trim();if(!i||this.knownMaps.has(i))continue;this.knownMaps.add(i);let o=this.ensureMapGroup("other");if(!o)continue;o.insertAdjacentHTML("beforeend",this.renderMapChip(i,i));let r=o.lastElementChild;r.addEventListener("click",()=>this.cycleMapState(r)),this.applyTriState(r,this.mapFilter[i]??"any");let n=this.$("discovery-maps-search");this.filterMapChips(n?.value??"")}}$(e){return this.root?.querySelector(`[id="${e}"]`)??null}getNumberValue(e){let t=this.$(e);if(!t)return null;let i=parseInt(t.value,10);return Number.isNaN(i)?null:i}getModifierState(e){let t=this.$(e)?.dataset.state;return t==="required"||t==="blocked"?t:"any"}setModifierState(e,t){let i=this.$(e);i&&this.applyTriState(i,t)}applyTriState(e,t){e.dataset.state=t,e.setAttribute("aria-pressed",String(t!=="any"));let i=e.dataset.modName??e.getAttribute("aria-label")??"",o=t==="blocked"?"excluded":t;i&&e.setAttribute("aria-label",t==="any"?i:`${i} \xB7 ${o}`);let r=e.querySelector(".ld-mod-ind");r&&(t==="required"?r.innerHTML=Q:t==="blocked"?r.innerHTML=gt:r.innerHTML="")}cycleModifierState(e){this.setModifierState(e,_e(this.getModifierState(e)))}getMapChips(){return Array.from(this.root?.querySelectorAll("[data-game-map]")??[])}cycleMapState(e){let t=e.dataset.gameMap??"",i=_e(this.mapFilter[t]??"any"),o={...this.mapFilter};i==="any"?delete o[t]:o[t]=i,this.setMapFilter(o)}setMapFilter(e){this.mapFilter=e,this.syncMapChips(),this.onChange("maps")}syncMapChips(){for(let n of this.getMapChips())this.applyTriState(n,this.mapFilter[n.dataset.gameMap??""]??"any");let e=Object.values(this.mapFilter),t=e.filter(n=>n==="required").length,i=e.filter(n=>n==="blocked").length,o=[...t>0?[`${t} required`]:[],...i>0?[`${i} excluded`]:[]],r=this.$("discovery-maps-summary");r&&(r.textContent=o.length>0?o.join(" \xB7 "):"Any map")}filterMapChips(e){let t=e.trim().toLowerCase();for(let i of this.getMapChips())i.hidden=t!==""&&!(i.dataset.modName??"").toLowerCase().includes(t);for(let i of Array.from(this.root?.querySelectorAll("[data-category]")??[]))i.hidden=!i.querySelector("[data-game-map]:not([hidden])")}ensureMapGroup(e){let t=this.$("discovery-maps-groups");if(!t)return null;let i=t.querySelector(`[data-category="${e}"] .ld-mods`);return i||(t.insertAdjacentHTML("beforeend",this.renderMapGroup(e,"")),t.querySelector(`[data-category="${e}"] .ld-mods`))}getNumericModifierState(e){let t={};for(let[i,o]of Object.entries(e))t[Number(i)]=this.getModifierState(o);return t}getModifierFiltersFromUI(){return{isCompact:this.getModifierState("modifier-isCompact"),isRandomSpawn:this.getModifierState("modifier-isRandomSpawn"),isCrowded:this.getModifierState("modifier-isCrowded"),isHardNations:this.getModifierState("modifier-isHardNations"),isAlliancesDisabled:this.getModifierState("modifier-isAlliancesDisabled"),isNukesDisabled:this.getModifierState("modifier-isNukesDisabled"),isSAMsDisabled:this.getModifierState("modifier-isSAMsDisabled"),isPeaceTime:this.getModifierState("modifier-isPeaceTime"),isWaterNukes:this.getModifierState("modifier-isWaterNukes"),isDoomsdayClock:this.getModifierState("modifier-isDoomsdayClock"),isTrusted:this.getModifierState("modifier-isTrusted"),startingGold:this.getNumericModifierState({1e6:"modifier-startingGold-1000000",5e6:"modifier-startingGold-5000000",25e6:"modifier-startingGold-25000000"}),goldMultiplier:this.getNumericModifierState({2:"modifier-goldMultiplier-2"})}}isChecked(e){return this.$(e)?.checked===!0}getAllTeamCountValues(){let e=[];for(let[t,i]of Ue)if(this.isChecked(t))if(i==="Humans Vs Nations"||i==="8+")e.push(i);else{let o=parseInt(i,10);Number.isNaN(o)||e.push(o)}return e}setAllTeamCounts(e){for(let t of pe){let i=this.$(t);i&&(i.checked=e,this.syncChipState(t))}}syncChipState(e){let t=this.$(e);if(!t)return;let i=t.closest(".ld-chip, .ld-mode-btn, .ld-2x");i&&(i.classList.toggle("is-on",t.checked),i.setAttribute("aria-pressed",String(t.checked)))}buildCriteriaFromUI(){let e=this.getModifierFiltersFromUI(),t=[];if(this.isChecked("discovery-ffa")&&t.push({gameMode:"FFA",teamCount:null,minPlayers:this.getNumberValue("discovery-ffa-min"),maxPlayers:this.getNumberValue("discovery-ffa-max"),modifiers:e}),!this.isChecked("discovery-team"))return t;let i=this.getAllTeamCountValues();if(i.length===0)return t.push({gameMode:"Team",teamCount:null,minPlayers:this.getNumberValue("discovery-team-min"),maxPlayers:this.getNumberValue("discovery-team-max"),modifiers:e}),t;for(let o of i)t.push({gameMode:"Team",teamCount:o,minPlayers:this.getNumberValue("discovery-team-min"),maxPlayers:this.getNumberValue("discovery-team-max"),modifiers:e});return t}updateFilterCount(){let e=this.$("discovery-filter-count"),t=this.$("discovery-filter-word");if(!e||!t)return;let i=pe.filter(n=>this.isChecked(n)).length,o=ue.filter(n=>this.getModifierState(n)!=="any").length,r=(this.isChecked("discovery-ffa")?1:0)+(this.isChecked("discovery-team")?1:0)+i+o;e.textContent=String(r),t.textContent=r===1?"filter":"filters"}setModePanelActive(e,t){this.$(e)?.classList.toggle("is-off",!t)}loadUIFromSettings(){let e=this.criteria.find(l=>l.gameMode==="FFA"),t=this.criteria.filter(l=>l.gameMode==="Team"),i=this.$("discovery-ffa"),o=this.$("discovery-team");if(i&&(i.checked=!!e,this.syncChipState("discovery-ffa"),this.setModePanelActive("discovery-ffa-config",!!e)),o&&(o.checked=t.length>0,this.syncChipState("discovery-team"),this.setModePanelActive("discovery-team-config",t.length>0)),e){let l=this.$("discovery-ffa-min"),d=this.$("discovery-ffa-max");l&&e.minPlayers!==null&&(l.value=String(e.minPlayers)),d&&e.maxPlayers!==null&&(d.value=String(e.maxPlayers))}if(t[0]){let l=this.$("discovery-team-min"),d=this.$("discovery-team-max");l&&t[0].minPlayers!==null&&(l.value=String(t[0].minPlayers)),d&&t[0].maxPlayers!==null&&(d.value=String(t[0].maxPlayers)),this.setTeamCountSelections(t.map(c=>c.teamCount))}let r=(e??t[0])?.modifiers;if(r){this.setModifierState("modifier-isCompact",r.isCompact??"any"),this.setModifierState("modifier-isRandomSpawn",r.isRandomSpawn??"any"),this.setModifierState("modifier-isCrowded",r.isCrowded??"any"),this.setModifierState("modifier-isHardNations",r.isHardNations??"any"),this.setModifierState("modifier-isAlliancesDisabled",r.isAlliancesDisabled??"any"),this.setModifierState("modifier-isNukesDisabled",r.isNukesDisabled??"any"),this.setModifierState("modifier-isSAMsDisabled",r.isSAMsDisabled??"any"),this.setModifierState("modifier-isPeaceTime",r.isPeaceTime??"any"),this.setModifierState("modifier-isWaterNukes",r.isWaterNukes??"any"),this.setModifierState("modifier-isDoomsdayClock",r.isDoomsdayClock??"any"),this.setModifierState("modifier-isTrusted",r.isTrusted??"any");for(let l of Re)this.setModifierState(`modifier-startingGold-${l}`,r.startingGold?.[l]??"any");for(let l of Ge)this.setModifierState(`modifier-goldMultiplier-${l}`,r.goldMultiplier?.[l]??"any")}let n=this.$("discovery-team-two-times");n&&(n.checked=this.isTeamTwoTimesMinEnabled,this.syncChipState("discovery-team-two-times")),this.syncMapChips();let s=this.$("discovery-hosted-toggle");s&&(s.checked=this.includeHostedAndCustomLobbies,this.syncChipState("discovery-hosted-toggle")),this.updateFilterCount()}setTeamCountSelections(e){for(let t of e){let i=null;t==="Humans Vs Nations"?i=this.$("discovery-team-hvn"):t==="8+"?i=this.$("discovery-team-8plus"):typeof t=="number"&&(i=this.$(`discovery-team-${t}`)),i&&(i.checked=!0,this.syncChipState(i.id))}}refreshCriteria(){this.criteria=this.buildCriteriaFromUI(),this.updateFilterCount(),this.onChange("criteria")}resetAll(){let e=this.$("discovery-ffa"),t=this.$("discovery-team");e&&(e.checked=!1,this.syncChipState("discovery-ffa"),this.setModePanelActive("discovery-ffa-config",!1)),t&&(t.checked=!1,this.syncChipState("discovery-team"),this.setModePanelActive("discovery-team-config",!1)),this.setAllTeamCounts(!1);let i=this.$("discovery-team-two-times");i&&(i.checked=!1,this.syncChipState("discovery-team-two-times")),this.isTeamTwoTimesMinEnabled=!1;for(let o of ue)this.setModifierState(o,"any");this.mapFilter={},this.syncMapChips(),this.ffaSlider?.setRange(1,125),this.teamSlider?.setRange($,ie),this.teamSlider?.applyLockState(),this.refreshCriteria()}setupEventListeners(){for(let[o,r]of[["discovery-ffa","discovery-ffa-config"],["discovery-team","discovery-team-config"]]){let n=this.$(o);n?.addEventListener("change",()=>{this.syncChipState(o),this.setModePanelActive(r,n.checked),this.refreshCriteria()})}let e=this.$("discovery-team-two-times");e?.addEventListener("change",()=>{this.isTeamTwoTimesMinEnabled=e.checked,this.syncChipState("discovery-team-two-times"),this.teamSlider?.applyLockState(),this.refreshCriteria()});for(let o of me)this.$(`discovery-${o}-toggle`)?.addEventListener("click",()=>{this.collapsedSections[o]=!this.collapsedSections[o],GM_setValue(M.lobbyDiscoveryCollapsedSections,this.collapsedSections),this.applySectionCollapse(o)});let t=this.$("discovery-maps-search");t?.addEventListener("input",()=>this.filterMapChips(t.value)),this.$("discovery-maps-clear")?.addEventListener("click",()=>{this.setMapFilter({})});for(let o of this.getMapChips())o.addEventListener("click",()=>this.cycleMapState(o));let i=this.$("discovery-hosted-toggle");i?.addEventListener("change",()=>{this.includeHostedAndCustomLobbies=i.checked,this.syncChipState("discovery-hosted-toggle"),this.onChange("lobbies")}),this.$("discovery-reset")?.addEventListener("click",()=>{this.resetAll()});for(let o of pe)this.$(o)?.addEventListener("change",()=>{this.syncChipState(o),this.refreshCriteria()});for(let o of ue)this.$(o)?.addEventListener("click",()=>{this.cycleModifierState(o),this.refreshCriteria()})}renderModeButton(e,t){return`
      <label class="ld-mode-btn" aria-pressed="false">
        <input type="checkbox" id="${e}" value="${e==="discovery-ffa"?"FFA":"Team"}">
        <span class="check">${Q}</span>
        <span>${t}</span>
      </label>
    `}renderChip(e,t,i){return`
      <label class="ld-chip" aria-pressed="false">
        <input type="checkbox" id="${e}" value="${t}">${i}
      </label>
    `}renderModifierChip(e,t){return`
      <button type="button" class="ld-mod" id="${e}" data-state="any" data-mod-name="${t}" aria-pressed="false" aria-label="${t}">
        <span class="ld-mod-ind"></span>
        <span class="ld-mod-name">${t}</span>
      </button>
    `}renderSectionToggle(e,t,i){return`
      <button type="button" class="ld-section-head ld-section-toggle" id="discovery-${e}-toggle" aria-expanded="true" aria-controls="discovery-${e}-body">
        <span class="ld-section-label">${t}</span>
        <span class="ld-section-head-end">${i}<span class="ld-section-chevron" aria-hidden="true"></span></span>
      </button>
    `}applySectionCollapse(e){let t=this.collapsedSections[e],i=this.$(`discovery-${e}-body`);i&&(i.hidden=t),this.$(`discovery-${e}-toggle`)?.setAttribute("aria-expanded",String(!t))}renderMapChip(e,t){let i=de(t);return`
      <button type="button" class="ld-mod" data-game-map="${de(e)}" data-state="any" data-mod-name="${i}" aria-pressed="false" aria-label="${i}">
        <span class="ld-mod-ind"></span>
        <span class="ld-mod-name">${i}</span>
      </button>
    `}renderMapGroup(e,t){return`
      <div class="ld-mod-group" data-category="${e}">
        <div class="ld-mod-group-label">${Ae[e]}</div>
        <div class="ld-mods">${t}</div>
      </div>
    `}renderMapGroups(){return Ie.map(e=>{let t=R.filter(i=>i.categories.includes(e));return t.length===0?"":this.renderMapGroup(e,t.map(i=>this.renderMapChip(i.gameMap,i.name)).join(""))}).join("")}renderBody(){return`
        <div class="discovery-content" style="overflow-y: auto;">
          <div class="ld-section">
            ${this.renderSectionToggle("modes","Modes",'<span class="ld-section-aside">Pick one or both</span>')}
            <div class="ld-section-body" id="discovery-modes-body">
            <div class="ld-modes">
              ${this.renderModeButton("discovery-ffa","FFA")}
              ${this.renderModeButton("discovery-team","Teams")}
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
                ${this.renderChip("discovery-team-hvn","Humans Vs Nations","Humans Vs Nations")}
              </div>
              <div class="ld-format-label" style="margin-top: 10px;">NUMBER OF TEAMS</div>
              <div class="ld-formats" style="margin-bottom: 14px;">
                ${this.renderChip("discovery-team-2","2","2")}
                ${this.renderChip("discovery-team-3","3","3")}
                ${this.renderChip("discovery-team-4","4","4")}
                ${this.renderChip("discovery-team-5","5","5")}
                ${this.renderChip("discovery-team-6","6","6")}
                ${this.renderChip("discovery-team-7","7","7")}
                ${this.renderChip("discovery-team-8plus","8+","8+")}
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
                <span class="check">${Q}</span>
                <span class="lbl"><strong>Lock max-per-team to 2\xD7 the min</strong></span>
              </label>
              <div class="ld-current-game-info" id="discovery-current-game-info" style="display: none;"></div>
            </div>
            </div>
          </div>

          <div class="ld-section">
            ${this.renderSectionToggle("modifiers","Modifiers",`<span class="ld-mods-legend">
                <span class="key"><span class="swatch"></span>Any</span>
                <span class="key"><span class="swatch req"></span>Req</span>
                <span class="key"><span class="swatch blk"></span>Excl</span>
              </span>`)}
            <div class="ld-section-body" id="discovery-modifiers-body">

            <div class="ld-mod-group">
              <div class="ld-mod-group-label">Map</div>
              <div class="ld-mods discovery-modifier-grid">
                ${this.renderModifierChip("modifier-isCompact","Compact")}
                ${this.renderModifierChip("modifier-isRandomSpawn","Random Spawn")}
                ${this.renderModifierChip("modifier-isCrowded","Crowded")}
                ${this.renderModifierChip("modifier-isHardNations","Hard Nations")}
              </div>
            </div>

            <div class="ld-mod-group">
              <div class="ld-mod-group-label">Gameplay</div>
              <div class="ld-mods">
                ${this.renderModifierChip("modifier-isAlliancesDisabled","Alliances Off")}
                ${this.renderModifierChip("modifier-isNukesDisabled","Nukes Off")}
                ${this.renderModifierChip("modifier-isSAMsDisabled","SAMs Off")}
                ${this.renderModifierChip("modifier-isPeaceTime","Peace Time")}
                ${this.renderModifierChip("modifier-isWaterNukes","Water Nukes")}
                ${this.renderModifierChip("modifier-isDoomsdayClock","Doomsday Clock")}
                ${this.renderModifierChip("modifier-isTrusted","Trusted")}
              </div>
            </div>

            <div class="ld-mod-group">
              <div class="ld-mod-group-label">Economy</div>
              <div class="ld-mods">
                ${this.renderModifierChip("modifier-startingGold-1000000","Start Gold 1M")}
                ${this.renderModifierChip("modifier-startingGold-5000000","Start Gold 5M")}
                ${this.renderModifierChip("modifier-startingGold-25000000","Start Gold 25M")}
                ${this.renderModifierChip("modifier-goldMultiplier-2","Gold \xD72")}
              </div>
            </div>

            <div class="ld-mods-hint">
              Click to cycle <strong>Any</strong> \u2192 <strong class="req">Required</strong> \u2192 <strong class="blk">Excluded</strong>.
            </div>
            </div>
          </div>

          <div class="ld-section">
            ${this.renderSectionToggle("maps","Maps",'<span class="ld-section-aside" id="discovery-maps-summary">Any map</span>')}
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
            ${this.renderSectionToggle("lobbies","Lobbies","")}
            <div class="ld-section-body" id="discovery-lobbies-body">
              <label class="ld-2x" aria-pressed="false">
                <input type="checkbox" id="discovery-hosted-toggle">
                <span class="check">${Q}</span>
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
    `}};var T=[{queue:"ffa",label:"FFA"},{queue:"team",label:"Team"},{queue:"special",label:"Special"},{queue:"hosted",label:"Hosted"}];function Y(a){let e={ffa:[],team:[],special:[],hosted:[]};for(let t of a){let i=V(t);i&&e[i].push(t)}return e}function qe(a){return a===0?"Live":`#${a}`}function ze(a){let e=Math.max(0,Math.ceil(a/1e3)),t=Math.floor(e/60),i=e%60;return`${t}:${String(i).padStart(2,"0")}`}function yt(a,e,t){if(e==="hosted"){if(typeof a.autoStartAt=="number")return{kind:"countdown",targetMs:a.autoStartAt};if(t===0)return{kind:"text",text:"Waiting"}}else if(t===0)return typeof a.startsAt=="number"?{kind:"countdown",targetMs:a.startsAt}:{kind:"text",text:"Live"};return{kind:"text",text:`Queue ${t}`}}function Ve(a,e,t,i,o,r=[]){let n=De(a),s=N(a),l=[];return e==="hosted"&&l.push("Hosted"),a.custom===!0&&l.push("Custom"),{gameID:a.gameID,queue:e,queuePosition:t,mapName:re(a.gameConfig?.gameMap?.trim()||"Unknown map"),thumbnailUrl:Oe(a,i,o),badge:yt(a,e,t),formatText:vt(a),players:n,capacity:s,fillPercent:n!==null&&s?Math.min(100,Math.round(n/s*100)):0,modifiers:Mt(a,r),tags:l}}function he(a){return`${a} ${a===1?"lobby":"lobbies"}`}function ge(a){return`${a} ${a===1?"match":"matches"}`}function vt(a){let e=k(a),t=N(a);if(e==="FFA")return t!==null?`Free for all \xB7 ${t} players`:"Free for all";if(e!=="Team")return"Unsupported mode";let i=I(a);if(i==="Humans Vs Nations")return t!==null?`Humans vs Nations \xB7 ${t} humans`:"Humans vs Nations";let o=H(i,t),r=i==="Duos"||i==="Trios"||i==="Quads",n=null;return r?(n=o!==null&&t!==null?`${Math.floor(t/o)} teams of ${o}`:null,n?`${i} \xB7 ${n}`:i):typeof i=="number"?o!==null?`${i} teams of ${o}`:`${i} teams`:"Teams"}var xt=[["isCompact","Compact"],["isRandomSpawn","Random Spawn"],["isCrowded","Crowded"],["isHardNations","Hard Nations"],["isAlliancesDisabled","Alliances Off"],["isNukesDisabled","Nukes Off"],["isSAMsDisabled","SAMs Off"],["isPeaceTime","Peace Time"],["isWaterNukes","Water Nukes"],["isDoomsdayClock","Doomsday Clock"],["isTrusted","Trusted"]];function fe(a){return a==="required"||a==="blocked"?a:"neutral"}function Mt(a,e){let t=k(a),i=e.find(s=>s.gameMode===t&&s.modifiers)?.modifiers,o=[];for(let[s,l]of xt)L(a,s)&&o.push({name:l,state:fe(i?.[s])});let r=L(a,"startingGold");typeof r=="number"&&o.push({name:`Start Gold ${se(r)}`,state:fe(i?.startingGold?.[r])});let n=L(a,"goldMultiplier");return typeof n=="number"&&o.push({name:`Gold \xD7${n}`,state:fe(i?.goldMultiplier?.[n])}),o}var We="ease-out";function Qe(){return typeof HTMLElement.prototype.animate!="function"?!1:!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches}function je(a){a.getAnimations?.().forEach(e=>e.finish())}function be(a){let e=a.parentElement;if(!e?.dataset.queue||e.dataset.row===void 0)return null;let{top:t,left:i}=a.getBoundingClientRect();return{queue:e.dataset.queue,row:e.dataset.row,top:t,left:i}}function Ye(a,e,t){if(e.queue===t.queue&&e.row===t.row)return;let i=e.left-t.left,o=e.top-t.top;i===0&&o===0||a.animate([{transform:`translate(${i}px, ${o}px)`},{transform:"translate(0px, 0px)"}],{duration:250,easing:We})}function Ke(a){let e=getComputedStyle(a).opacity||"1";a.animate([{opacity:"0",transform:"translateY(8px)"},{opacity:e,transform:"translateY(0px)"}],{duration:300,easing:We})}var St="\xAB",Lt="\xBB",K=class{constructor(){this.summary="";this.root=null;this.collapsed=GM_getValue(M.lobbyBoardSidebarCollapsed,!1)===!0}build(){let e=document.createElement("aside");e.className="of-board-sidebar",e.setAttribute("aria-label","Filters");let t=document.createElement("div");t.className="of-board-sidebar-head";let i=document.createElement("span");i.className="of-board-sidebar-title",i.textContent="Filters";let o=document.createElement("button");o.type="button",o.id="of-board-sidebar-toggle",o.className="of-board-sidebar-toggle",o.addEventListener("click",()=>this.setCollapsed(!this.collapsed)),t.append(i,o);let r=document.createElement("div");r.className="of-board-sidebar-body";let n=document.createElement("div");return n.className="of-board-sidebar-summary",e.append(t,r,n),this.root=e,this.apply(),{element:e,body:r}}setSummary(e){this.summary=e;let t=this.root?.querySelector(".of-board-sidebar-summary");t&&(t.textContent=e)}setCollapsed(e){this.collapsed=e,GM_setValue(M.lobbyBoardSidebarCollapsed,e),this.apply()}apply(){let e=this.root;if(!e)return;e.classList.toggle("is-collapsed",this.collapsed),e.querySelector(".of-board-sidebar-body").hidden=this.collapsed;let t=e.querySelector(".of-board-sidebar-summary");t.hidden=!this.collapsed,t.textContent=this.summary;let i=e.querySelector(".of-board-sidebar-toggle");i.textContent=this.collapsed?Lt:St,i.setAttribute("aria-expanded",String(!this.collapsed)),i.setAttribute("aria-label",this.collapsed?"Expand filters":"Collapse filters")}};var Ct="of-lobby-board",Tt=2e3,Je=16,J=class{constructor(e){this.options=e;this.root=null;this.hosts=null;this.sidebar=new K;this.pageGrid=null;this.savedStyles=[];this.clockOffsetMs=0;this.tickInterval=null;this.totals=null;this.grid=null;this.rowCount=-1;this.cards=new Map;this.cardParts=new WeakMap;this.signatures=new Map;this.flashTimers=new Map;this.hasShownCards=!1;this.resizeObserver=null;this.observedGrid=null;this.onWindowResize=()=>this.measureLayout()}render(e){let t=this.isShowing(),i=this.ensureMounted();if(!i||!this.grid)return;let o=Qe(),r=o&&t?this.readPlacements():new Map,n=[];i.style.display="",this.takeOverPage(),this.startMeasuringLayout(),this.clockOffsetMs=e.clockOffsetMs;let s=Y(e.lobbies),l=Math.max(0,...T.map(({queue:u})=>s[u].length));l!==this.rowCount&&this.buildGrid(l);let{manifest:d,cdnBase:c}=this.options.getAssets(),m=new Set,{matchedIds:y}=e,v=u=>y?u.filter(g=>y.has(g.gameID)).length:0;for(let{queue:u}of T)this.renderColumnHead(u,s[u].length,y?v(s[u]):null);if(this.totals){let u=T.reduce((C,{queue:x})=>C+s[x].length,0),g=T.reduce((C,{queue:x})=>C+v(s[x]),0);this.totals.textContent=`${ge(g)} \xB7 ${he(u)}`}for(let{queue:u}of T)for(let g=0;g<l;g++){let C=this.getCell(u,g),x=s[u][g];if(!C)continue;if(!x){C.querySelector(".of-board-empty")||C.replaceChildren(this.buildEmpty());continue}m.add(x.gameID);let et=Ve(x,u,g,d,c,e.criteria),w=this.cards.get(x.gameID);w||(w=this.createCard(x.gameID),n.push(w)),this.updateCard(w,et),this.applyNewBadge(w,e.newGameIds.has(x.gameID)),w.classList.toggle("of-board-card-match",y?.has(x.gameID)===!0),w.classList.toggle("of-board-card-dim",y!==null&&!y.has(x.gameID)),w.parentElement!==C&&C.replaceChildren(w)}for(let u of[...this.cards.keys()])m.has(u)||(this.cards.get(u)?.remove(),this.cards.delete(u),this.signatures.delete(u));o&&this.playMotion(r,n),m.size>0&&(this.hasShownCards=!0),this.tickCountdowns(),this.tickInterval||(this.tickInterval=setInterval(()=>this.tickCountdowns(),1e3))}isShowing(){return!!this.root?.isConnected&&this.root.style.display!=="none"}flashCard(e){let t=this.cards.get(e);t&&(t.scrollIntoView?.({block:"center",behavior:"smooth"}),clearTimeout(this.flashTimers.get(e)),t.classList.add("of-board-card-flash"),this.flashTimers.set(e,setTimeout(()=>{this.flashTimers.delete(e),t.classList.remove("of-board-card-flash")},Tt)))}getHosts(){return this.root?.isConnected?this.hosts:null}setFilterSummary(e){this.sidebar.setSummary(e)}hide(){this.hasShownCards=!1,this.stopTicking(),this.stopMeasuringLayout(),this.root&&(this.root.style.display="none"),this.restorePage()}dispose(){this.stopTicking(),this.stopMeasuringLayout();for(let e of this.flashTimers.values())clearTimeout(e);this.flashTimers.clear(),this.restorePage(),this.root?.remove(),this.root=null,this.hosts=null,this.pageGrid=null,this.totals=null,this.grid=null,this.rowCount=-1,this.hasShownCards=!1,this.cards.clear(),this.signatures.clear()}readPlacements(){let e=new Map;for(let[t,i]of this.cards){let o=be(i);o&&e.set(t,o)}return e}playMotion(e,t){for(let i of this.cards.values())je(i);for(let[i,o]of e){let r=this.cards.get(i),n=r?be(r):null;r&&n&&Ye(r,o,n)}if(this.hasShownCards)for(let i of t)Ke(i)}takeOverPage(){let e=this.pageGrid;if(e){for(let t of Array.from(e.children))t!==this.root&&Ee(t)&&this.setStyle(t,"display","none");this.setStyle(e,"grid-template-rows","auto");for(let t=e.parentElement;t&&t!==document.documentElement;t=t.parentElement)getComputedStyle(t).overflowX==="clip"&&this.setStyle(t,"overflow-x","visible")}}measureLayout(){if(!this.root||!this.pageGrid)return;let e=document.documentElement.clientWidth-2*Je,t=Je-this.pageGrid.getBoundingClientRect().left;this.root.style.setProperty("--of-board-left",`${t}px`),this.root.style.setProperty("--of-board-width",`${e}px`)}startMeasuringLayout(){this.measureLayout();let e=this.pageGrid;e&&(this.resizeObserver&&this.observedGrid===e||(this.resizeObserver?.disconnect(),this.resizeObserver=null,window.addEventListener("resize",this.onWindowResize),!(typeof ResizeObserver>"u")&&(this.resizeObserver=new ResizeObserver(()=>this.measureLayout()),this.resizeObserver.observe(document.documentElement),this.resizeObserver.observe(e),this.observedGrid=e)))}stopMeasuringLayout(){window.removeEventListener("resize",this.onWindowResize),this.resizeObserver?.disconnect(),this.resizeObserver=null,this.observedGrid=null}setStyle(e,t,i){this.savedStyles.some(o=>o.element===e&&o.property===t)||this.savedStyles.push({element:e,property:t,value:e.style.getPropertyValue(t)}),e.style.setProperty(t,i)}restorePage(){for(let{element:e,property:t,value:i}of this.savedStyles)i?e.style.setProperty(t,i):e.style.removeProperty(t),e.getAttribute("style")===""&&e.removeAttribute("style");this.savedStyles=[]}stopTicking(){this.tickInterval&&clearInterval(this.tickInterval),this.tickInterval=null}tickCountdowns(){let e=Date.now()+this.clockOffsetMs;for(let t of Array.from(this.grid?.querySelectorAll(".of-board-badge[data-countdown-to]")??[])){let i=ze(Number(t.dataset.countdownTo)-e);t.textContent!==i&&(t.textContent=i)}}getCell(e,t){return this.grid?.querySelector(`.of-board-cell[data-queue="${e}"][data-row="${t}"]`)??null}canMount(){return!!this.root?.isConnected||_()!==null}ensureMounted(){if(this.root?.isConnected)return this.root;let e=_();if(!e)return null;let t=document.createElement("div");t.id=Ct,t.className="of-board";let i=document.createElement("div");i.className="of-board-head";let o=document.createElement("span");o.className="of-board-title",o.textContent="Lobby Board";let r=document.createElement("span");r.className="of-board-totals";let n=document.createElement("div");n.className="of-board-controls",i.append(o,r,n);let{element:s,body:l}=this.sidebar.build(),d=document.createElement("div");d.className="of-board-grid";let c=document.createElement("div");return c.className="of-board-main",c.append(s,d),t.append(i,c),e.insertBefore(t,e.firstChild),this.root=t,this.hosts={sidebarBody:l,controls:n},this.pageGrid=e,this.totals=r,this.grid=d,this.rowCount=-1,t}buildGrid(e){let t=this.grid,i=[document.createElement("div")];for(let{queue:o,label:r}of T){let n=document.createElement("div");n.className="of-board-colhead",n.dataset.queue=o,n.append(document.createElement("b"),document.createElement("span"),document.createElement("em")),n.firstElementChild.textContent=r,i.push(n)}for(let o=0;o<e;o++){let r=document.createElement("div");r.className=`of-board-rowlabel${o===0?" of-board-rowlabel-live":""}`,r.textContent=qe(o),i.push(r);for(let{queue:n}of T){let s=document.createElement("div");s.className="of-board-cell",s.dataset.queue=n,s.dataset.row=String(o),i.push(s)}}t.replaceChildren(...i),this.rowCount=e}renderColumnHead(e,t,i){let o=this.grid?.querySelector(`.of-board-colhead[data-queue="${e}"]`);if(!o)return;let[,r,n]=Array.from(o.children);r.textContent=he(t),n.textContent=i?`\xB7 ${ge(i)}`:""}buildEmpty(){let e=document.createElement("div");return e.className="of-board-empty",e}createCard(e){let t=document.createElement("button");t.type="button",t.className="of-board-card",t.dataset.gameId=e,t.addEventListener("click",()=>this.options.onJoin(e));let i=this.createSpan("of-board-thumb"),o=this.createSpan("of-board-badge"),r=this.createSpan("of-board-top");r.append(o);let n=this.createSpan("of-board-map"),s=this.createSpan("of-board-format"),l=this.createSpan("of-board-playersrow"),d=this.createSpan("of-board-players"),c=this.createSpan("of-board-bar"),m=document.createElement("i");m.className="of-board-fill",c.append(m),l.append(d,c);let y=this.createSpan("of-board-mods"),v=this.createSpan("of-board-body");return v.append(n,s,l,y),t.append(i,r,v),this.cardParts.set(t,{thumb:i,badge:o,top:r,name:n,format:s,players:d,bar:c,fill:m,modifiers:y}),this.cards.set(e,t),t}createSpan(e){let t=document.createElement("span");return t.className=e,t}applyNewBadge(e,t){let i=Array.from(e.children).find(o=>o.classList.contains("of-board-new"));if(t){if(i)return;let o=document.createElement("span");o.className="of-board-new",o.textContent="New",e.append(o)}else i?.remove()}updateCard(e,t){let i=JSON.stringify(t);if(this.signatures.get(t.gameID)===i)return;this.signatures.set(t.gameID,i);let o=this.cardParts.get(e);o&&(this.updateThumbnail(o.thumb,t.thumbnailUrl),t.badge.kind==="countdown"?o.badge.dataset.countdownTo=String(t.badge.targetMs):(delete o.badge.dataset.countdownTo,this.setText(o.badge,t.badge.text)),this.reconcileChildren(o.top,1,t.tags.map(r=>({className:"of-board-tag",text:r}))),this.setText(o.name,t.mapName),this.setText(o.format,t.formatText),this.setText(o.players,t.capacity===null?String(t.players??""):`${t.players??0} / ${t.capacity}`),o.bar.className=`of-board-bar${t.fillPercent>=80?" of-board-bar-hot":""}`,o.fill.style.width=`${t.fillPercent}%`,this.reconcileChildren(o.modifiers,0,t.modifiers.length===0?[{className:"of-board-nomods",text:"No modifiers"}]:t.modifiers.map(r=>({className:`of-board-mod${r.state==="neutral"?"":` of-board-mod-${r.state}`}`,text:r.name}))),e.setAttribute("aria-label",`Open ${t.mapName} in OpenFront's join modal`))}updateThumbnail(e,t){let i=e.querySelector("img");if(!t){i?.remove();return}if(i){i.getAttribute("src")!==t&&(i.src=t);return}let o=document.createElement("img");o.src=t,o.alt="",o.loading="lazy",e.append(o)}reconcileChildren(e,t,i){let o=Array.from(e.children).slice(t);i.forEach(({className:r,text:n},s)=>{let l=o[s]??e.appendChild(this.createSpan(r));l.className!==r&&(l.className=r),this.setText(l,n)});for(let r of o.slice(i.length))r.remove()}setText(e,t){e.textContent!==t&&(e.textContent=t)}};var X=class{constructor(){this.entries=new Map}alert(e,t){this.entries.set(e,t)}retain(e){for(let t of[...this.entries.keys()])e.has(t)||this.entries.delete(t)}clear(){this.entries.clear()}getNewGameIds(){return new Set(this.entries.values())}};var ye=a=>a!==void 0&&a!=="any";function wt(a){if(!a)return 0;let e=0;for(let t of Object.values(a))typeof t=="string"?ye(t)&&e++:t&&(e+=Object.values(t).filter(ye).length);return e}function Xe(a){let{criteria:e,mapFilter:t}=a,i=Object.values(t).filter(ye).length;if(e.length===0&&i===0)return"No filters";let o=[];e.some(s=>s.gameMode==="FFA")&&o.push("FFA"),e.some(s=>s.gameMode==="Team")&&o.push("Teams");let r=Math.max(0,...e.map(s=>wt(s.modifiers))),n=[o.length>0?o.join(" + "):"No mode"];return r>0&&n.push(`${r} ${r===1?"modifier":"modifiers"}`),i>0&&n.push(`${i} ${i===1?"map":"maps"}`),n.join(" \xB7 ")}var Et='<svg viewBox="0 0 24 24"><path d="M11 5L6 9H2v6h4l5 4V5z"/><path d="M15.5 8.5a5 5 0 010 7"/><path d="M19 5a9 9 0 010 14"/></svg>',kt='<svg viewBox="0 0 24 24"><path d="M6 8a6 6 0 1112 0c0 7 3 9 3 9H3s3-2 3-9z"/><path d="M10.3 21a1.94 1.94 0 003.4 0"/></svg>',Z=class{constructor(e){this.options=e;this.searchActive=!1;this.timerText=null;this.root=null;this.discoveryEnabled=e.discoveryEnabled,this.soundEnabled=e.soundEnabled,this.desktopEnabled=e.desktopNotificationsEnabled,this.originalPage=e.originalPage}mount(e){this.cleanup();let t=document.createElement("div");t.className="ld-status",t.innerHTML=`
      <span class="ld-pulse" aria-hidden="true"></span>
      <div class="ld-status-text" id="discovery-status" role="button" tabindex="0">
        <strong>Discovery active</strong>
        <span class="sep">\xB7</span>
        <span class="meta" id="discovery-search-timer"></span>
      </div>
      <div class="ld-icons">
        ${this.renderIconButton("discovery-sound-toggle","Sound alert",Et)}
        ${this.renderIconButton("discovery-desktop-toggle","Desktop notification",kt)}
      </div>
      <label class="ld-original-switch" title="Show OpenFront's original lobby area">
        <input type="checkbox" id="discovery-original-toggle">
        <span class="ld-original-track" aria-hidden="true"></span>
        <span>Original page</span>
      </label>
    `,e.appendChild(t),this.root=t,this.$("discovery-status")?.addEventListener("click",()=>this.options.onToggleDiscovery()),this.$("discovery-sound-toggle")?.addEventListener("change",i=>{let o=i.target.checked;this.setSoundOn(o),this.options.onSoundChange(o)}),this.$("discovery-desktop-toggle")?.addEventListener("change",i=>{this.options.onDesktopChange(i.target.checked)}),this.$("discovery-original-toggle")?.addEventListener("change",i=>{let o=i.target.checked;this.originalPage=o,this.options.onOriginalPageChange(o)}),this.setSoundOn(this.soundEnabled),this.setOriginalPageOn(this.originalPage),this.setDesktopOn(this.desktopEnabled),this.setDiscoveryEnabled(this.discoveryEnabled),this.setSearchActive(this.searchActive),this.setTimerText(this.timerText)}cleanup(){this.root?.remove(),this.root=null}setDiscoveryEnabled(e){this.discoveryEnabled=e;let t=this.root?.querySelector(".ld-status-text strong");t&&(t.textContent=e?"Discovery active":"Discovery paused")}setSearchActive(e){this.searchActive=e,this.root?.querySelector(".ld-pulse")?.classList.toggle("is-paused",!e)}setTimerText(e){this.timerText=e;let t=this.$("discovery-search-timer");t&&(t.textContent=e??"",t.style.display=e===null?"none":"inline")}setSoundOn(e){this.soundEnabled=e,this.syncToggle("discovery-sound-toggle",e)}setDesktopOn(e){this.desktopEnabled=e,this.syncToggle("discovery-desktop-toggle",e)}setOriginalPageOn(e){this.originalPage=e,this.syncToggle("discovery-original-toggle",e)}syncToggle(e,t){let i=this.$(e);i&&(i.checked=t,i.toggleAttribute("checked",t),i.closest(".ld-icon-btn")?.classList.toggle("is-on",t))}$(e){return this.root?.querySelector(`[id="${e}"]`)??null}renderIconButton(e,t,i){return`
      <label class="ld-icon-btn" title="${t}" aria-label="${t}">
        <input type="checkbox" id="${e}">${i}
      </label>
    `}};function At(){try{if(typeof unsafeWindow<"u"&&unsafeWindow.__OF_DEBUG_DISCOVERY===!0)return!0}catch{}if(globalThis.__OF_DEBUG_DISCOVERY===!0)return!0;try{if(typeof localStorage<"u"&&localStorage.getItem("__OF_DEBUG_DISCOVERY")==="true")return!0}catch{}return!1}var U="page-detailed-view",It="of-discovery-see-all-match";function Ze(){try{if(typeof unsafeWindow<"u")return unsafeWindow}catch{}return window}var ee=class{constructor(){this.discoveryEnabled=!0;this.searchStartTime=null;this.lastMatchTime=null;this.soundEnabled=!0;this.desktopNotificationsEnabled=!1;this.desktopNotificationRequestId=0;this.activeMatchSources=new Set;this.seeAllPulseActive=!1;this.seeAllMatchIds=new Set;this.seeAllObserver=null;this.observedSeeAllView=null;this.seenLobbies=new Set;this.desktopNotifiedLobbies=new Set;this.sleeping=!1;this.boardMode="board";this.isDisposed=!1;this.lastLobbies=[];this.timerInterval=null;this.gameInfoInterval=null;this.pulseSyncTimeout=null;this.filtersHost=null;this.controlsHost=null;this.boardAlerts=new X;this.clockOffsetMs=0;this.handleFocusLost=()=>{this.boardAlerts.clear(),this.updateLobbyBoard(this.lastLobbies)};this.handleWindowBlur=()=>{document.hasFocus()||this.handleFocusLost()};this.handleVisibilityChange=()=>{document.visibilityState==="hidden"&&this.handleFocusLost()};this.engine=new W,this.lobbyBoard=new J({onJoin:e=>this.navigateToGame(`/game/${e}`),getAssets:()=>this.getAssetContext()}),this.loadSettings(),this.createUI(),this.updateSleepState(),O.subscribe(()=>this.updateSleepState()),window.addEventListener("blur",this.handleWindowBlur),document.addEventListener("visibilitychange",this.handleVisibilityChange)}get criteriaList(){return this.filters.getSettings().criteria}get mapFilter(){return this.filters.getSettings().mapFilter}get includeHostedAndCustomLobbies(){return this.filters.getSettings().includeHostedAndCustomLobbies}receiveLobbyUpdate(e,t=null){this.lastLobbies=e,t!==null&&(this.clockOffsetMs=t-Date.now()),this.processLobbies(e)}isSoundEnabled(){return this.soundEnabled}loadSettings(){let e=GM_getValue(M.lobbyDiscoverySettings,null),t=Be(e);GM_setValue(M.lobbyDiscoverySettings,t),this.soundEnabled=t.soundEnabled,this.desktopNotificationsEnabled=t.desktopNotificationsEnabled,this.discoveryEnabled=t.discoveryEnabled,this.boardMode=GM_getValue(M.lobbyBoardMode,"board")==="original"?"original":"board",this.controls=new Z({discoveryEnabled:t.discoveryEnabled,soundEnabled:t.soundEnabled,desktopNotificationsEnabled:t.desktopNotificationsEnabled,originalPage:this.boardMode==="original",onToggleDiscovery:()=>this.setDiscoveryEnabled(!this.discoveryEnabled,{resetTimer:!0}),onSoundChange:i=>{this.soundEnabled=i,this.saveSettings()},onDesktopChange:i=>void this.handleDesktopNotificationChange(i),onOriginalPageChange:i=>this.setBoardMode(i?"original":"board")}),this.filters=new j({initial:{criteria:t.criteria,isTeamTwoTimesMinEnabled:t.isTeamTwoTimesMinEnabled,includeHostedAndCustomLobbies:t.includeHostedAndCustomLobbies??!0,mapFilter:t.mapFilter??{}},onChange:i=>this.handleFilterChange(i)})}handleFilterChange(e){this.saveSettings(),this.dropAlertsOfNonMatches(),this.updateLobbyBoard(this.lastLobbies),e!=="lobbies"&&this.syncSearchTimer({resetStart:!0}),e!=="criteria"&&this.processLobbies(this.lastLobbies)}dropAlertsOfNonMatches(){let e=new Set;for(let{lobby:t,matched:i}of this.evaluateLobbies(this.lastLobbies))i&&e.add(this.getNotificationKey(t));this.boardAlerts.retain(e)}saveSettings(){let e=this.filters.getSettings();GM_setValue(M.lobbyDiscoverySettings,{criteria:e.criteria,discoveryEnabled:this.discoveryEnabled,soundEnabled:this.soundEnabled,desktopNotificationsEnabled:this.desktopNotificationsEnabled,isTeamTwoTimesMinEnabled:e.isTeamTwoTimesMinEnabled,includeHostedAndCustomLobbies:e.includeHostedAndCustomLobbies,mapFilter:e.mapFilter})}updateStatusText(){if(!this.discoveryEnabled||this.criteriaList.length===0||!this.isDiscoveryFeedbackAllowed()){this.controls.setTimerText(null);return}this.lastMatchTime!==null?this.controls.setTimerText(`last match ${le(this.lastMatchTime)}`):this.searchStartTime!==null?this.controls.setTimerText(`searching \xB7 ${le(this.searchStartTime)}`):this.controls.setTimerText("awaiting filters")}updateCurrentGameInfo(){if(!B.isOnLobbyPage()){this.filters.setCurrentGameInfo(null);return}let e=document.querySelector("public-lobby");if(!e||!Array.isArray(e.lobbies)||e.lobbies.length===0){this.filters.setCurrentGameInfo(null);return}let t=e.lobbies[0];if(!t||!t.gameConfig){this.filters.setCurrentGameInfo(null);return}this.filters.setCurrentGameInfo(`Current game: ${Pe(t)}`)}evaluateLobbies(e){let t=Y(e),i=[];for(let{queue:o}of T)t[o].forEach((r,n)=>{if(!this.includeHostedAndCustomLobbies&&ne(r))return;let s=this.engine.matchesCriteria(r,this.criteriaList,this.mapFilter);i.push({lobby:r,queue:o,index:n,matched:s})});return i}processLobbies(e){try{if(this.updateCurrentGameInfo(),this.syncSearchTimer(),this.filters.addFeedOnlyMaps(e),!this.discoveryEnabled||this.criteriaList.length===0){this.seenLobbies.clear(),this.desktopNotifiedLobbies.clear(),this.boardAlerts.clear(),this.updateQueueCardPulses(new Set),this.updateSeeAllSignals(!1,new Set),this.updateStatusText();return}let t=new Set,i=new Set,o=!1,r=new Set,n=[],s=[],l=At();for(let{lobby:c,queue:m,index:y,matched:v}of this.evaluateLobbies(e)){if(l&&console.log("[OF Discovery]",{lobbyId:c.gameID,queue:m,index:y,mode:c.gameConfig?.gameMode,map:c.gameConfig?.gameMap,playerTeams:c.gameConfig?.playerTeams,modifiers:c.gameConfig?.publicGameModifiers,hostGold:{startingGold:c.gameConfig?.startingGold,goldMultiplier:c.gameConfig?.goldMultiplier},criteriaCount:this.criteriaList.length,matched:v}),!v)continue;let u=m!=="hosted"&&y===0;u?t.add(m):o=!0,i.add(c.gameID);let g=this.getNotificationKey(c);r.add(g),this.seenLobbies.has(g)||s.push({key:g,gameID:c.gameID}),this.desktopNotifiedLobbies.has(g)||n.push({lobby:c,queue:m,seeAllOnly:!u})}if(!this.isDiscoveryFeedbackAllowed()){this.seenLobbies=new Set([...this.seenLobbies].filter(c=>r.has(c))),this.desktopNotifiedLobbies=new Set([...this.desktopNotifiedLobbies].filter(c=>r.has(c))),this.boardAlerts.retain(r),this.updateQueueCardPulses(new Set),this.updateSeeAllSignals(!1,new Set),this.updateStatusText();return}let d=!this.canShowBoard();this.updateQueueCardPulses(d?t:new Set),this.updateSeeAllSignals(d&&o,d?i:new Set),this.boardAlerts.retain(r);for(let{key:c,gameID:m}of s)this.badgeNewMatch(c,m);if(s.length>0&&(this.lastMatchTime=Date.now(),this.soundEnabled&&F.playGameFoundSound()),this.desktopNotificationsEnabled){let c=new Set;for(let{lobby:m,queue:y,seeAllOnly:v}of n){let u=Fe(m),g=this.getNotificationKey(m);z.show({title:u.title,body:u.body,tag:g,onClick:()=>this.handleNotificationClick(m.gameID,y,v)})&&c.add(g)}this.desktopNotifiedLobbies=new Set([...[...this.desktopNotifiedLobbies].filter(m=>r.has(m)),...c])}else this.desktopNotifiedLobbies.clear();this.seenLobbies=r,r.size===0&&(this.lastMatchTime=null),this.updateStatusText()}catch(t){console.error("[LobbyDiscovery] Error processing lobbies:",t)}finally{this.updateLobbyBoard(e)}}handleNotificationClick(e,t,i){this.lobbyBoard.isShowing()?this.lobbyBoard.flashCard(e):i&&this.openSeeAllView(t)}badgeNewMatch(e,t){z.isBackgrounded()&&this.boardAlerts.alert(e,t)}setBoardMode(e){e!==this.boardMode&&(this.boardMode=e,GM_setValue(M.lobbyBoardMode,e),this.controls.setOriginalPageOn(e==="original"),this.processLobbies(this.lastLobbies))}canShowBoard(){return this.boardMode==="board"&&this.lobbyBoard.canMount()}updateLobbyBoard(e){if(this.sleeping||this.boardMode==="original"||!B.isOnLobbyPage()){this.lobbyBoard.hide(),this.placeSurfaces();return}let t=this.discoveryEnabled&&this.criteriaList.length>0,i=new Set;if(t)for(let{lobby:o,matched:r}of this.evaluateLobbies(e))r&&i.add(o.gameID);this.lobbyBoard.render({lobbies:e,matchedIds:t?i:null,clockOffsetMs:this.clockOffsetMs,criteria:t?this.criteriaList:[],newGameIds:this.isDiscoveryFeedbackAllowed()?this.boardAlerts.getNewGameIds():new Set}),this.placeSurfaces()}getNotificationKey(e){return JSON.stringify({gameID:e.gameID,map:e.gameConfig?.gameMap??null,mode:e.gameConfig?.gameMode??null,playerTeams:e.gameConfig?.playerTeams??e.gameConfig?.teamCount??null,capacity:e.gameConfig?.maxPlayers??e.maxClients??null,modifiers:e.gameConfig?.publicGameModifiers??{}})}isDiscoveryFeedbackAllowed(){return!(!B.isOnLobbyPage()||document.getElementById("page-play")?.classList.contains("hidden")&&!this.isSeeAllViewVisible()||document.querySelector("public-lobby")?.isLobbyHighlighted===!0||document.querySelector("join-lobby-modal")?.currentLobbyId||document.querySelector("host-lobby-modal")?.lobbyId)}getQueueCardElements(){let e=document.querySelector("game-mode-selector"),t=_(e);if(!e||!t)return{};let{ffaCell:i,cardCells:o}=ke(t),r=e.lobbies?.games,n=Array.isArray(r?.team)&&r.team.length>0,s=Array.isArray(r?.special)&&r.special.length>0,l=n?o[0]:void 0,d=s?o[n?1:0]:void 0;return{ffa:i?.querySelector("button"),team:l?.querySelector("button"),special:d?.querySelector("button")}}updateQueueCardPulses(e){this.activeMatchSources=new Set(e),this.applyQueueCardPulses(),this.scheduleQueueCardPulseSync()}isSeeAllViewVisible(){let e=document.getElementById(U);return!!e&&!e.classList.contains("hidden")}getSeeAllButton(){return document.querySelector('game-mode-selector button[class~="group/upcoming"]')}updateSeeAllSignals(e,t){this.seeAllPulseActive=e,this.seeAllMatchIds=t,this.applySeeAllSignals()}applySeeAllSignals(){this.getSeeAllButton()?.classList.toggle("of-discovery-card-active",this.seeAllPulseActive),this.observeSeeAllView(),this.applySeeAllHighlights()}observeSeeAllView(){let e=document.getElementById(U);!e||e===this.observedSeeAllView||(this.seeAllObserver?.disconnect(),this.seeAllObserver=new MutationObserver(()=>this.applySeeAllHighlights()),this.seeAllObserver.observe(e,{childList:!0,subtree:!0}),this.observedSeeAllView=e)}applySeeAllHighlights(){let e=document.getElementById(U);if(e)for(let t of Array.from(e.querySelectorAll("[data-lobby-slot]")))t.classList.toggle(It,this.seeAllMatchIds.has(t.dataset.lobbySlot??""))}openSeeAllView(e){if(Ze().showPage?.(U),e==="hosted")return;document.getElementById(U)?.open?.({tab:e})}applyQueueCardPulses(){let e=this.getQueueCardElements();for(let t of["ffa","special","team"]){let i=e[t];i&&i.classList.toggle("of-discovery-card-active",this.activeMatchSources.has(t))}}scheduleQueueCardPulseSync(){this.pulseSyncTimeout&&clearTimeout(this.pulseSyncTimeout),this.pulseSyncTimeout=setTimeout(()=>{this.pulseSyncTimeout=null,this.applyQueueCardPulses(),this.applySeeAllSignals()},16)}getAssetContext(){let e=Ze();return{manifest:e.BOOTSTRAP_CONFIG?.assetManifest??e.__ASSET_MANIFEST__??null,cdnBase:e.BOOTSTRAP_CONFIG?.cdnBase??e.__CDN_BASE__??null}}navigateToGame(e){window.location.assign(e)}stopTimer(){this.timerInterval&&(clearInterval(this.timerInterval),this.timerInterval=null)}startGameInfoUpdates(){this.stopGameInfoUpdates(),this.updateCurrentGameInfo(),this.gameInfoInterval=setInterval(()=>this.updateCurrentGameInfo(),1e3)}stopGameInfoUpdates(){this.gameInfoInterval&&(clearInterval(this.gameInfoInterval),this.gameInfoInterval=null)}syncSearchTimer(e={}){let{resetStart:t=!1}=e;this.stopTimer(),t&&(this.searchStartTime=null,this.lastMatchTime=null,this.seenLobbies.clear(),this.desktopNotifiedLobbies.clear()),this.discoveryEnabled&&this.criteriaList.length>0&&this.isDiscoveryFeedbackAllowed()?(this.searchStartTime===null&&(this.searchStartTime=Date.now()),this.timerInterval=setInterval(()=>this.updateStatusText(),1e3)):(this.searchStartTime=null,this.lastMatchTime=null),this.updateStatusText(),this.updatePulseIndicator()}updatePulseIndicator(){this.controls.setSearchActive(this.discoveryEnabled&&this.criteriaList.length>0)}setDiscoveryEnabled(e,t={}){this.discoveryEnabled=e,this.saveSettings(),this.controls.setDiscoveryEnabled(e),this.syncSearchTimer({resetStart:t.resetTimer??!1}),this.updateLobbyBoard(this.lastLobbies)}async handleDesktopNotificationChange(e){let t=++this.desktopNotificationRequestId;if(!e){this.desktopNotificationsEnabled=!1,this.controls.setDesktopOn(!1),this.saveSettings();return}let i=await z.ensurePermission();t!==this.desktopNotificationRequestId||this.isDisposed||(this.desktopNotificationsEnabled=i,this.controls.setDesktopOn(i),this.saveSettings())}createUI(){this.panel=document.createElement("div"),this.panel.id="openfront-discovery-panel",this.panel.className="of-panel discovery-panel",this.panel.style.width="380px",this.panel.innerHTML=`
      <div class="ld-panel-slot" data-slot="controls"></div>
      <div class="ld-head">
        <div class="ld-eyebrow">Notify + quick-join \xB7 never auto-joins</div>
        <h2 class="ld-title">OpenFront Game Notifier</h2>
      </div>
      <div class="ld-panel-slot" data-slot="filters"></div>
    `,this.panelControlsSlot=this.panel.querySelector('[data-slot="controls"]'),this.panelFiltersSlot=this.panel.querySelector('[data-slot="filters"]'),this.syncSearchTimer(),this.startGameInfoUpdates()}placeSurfaces(){let e=this.boardMode==="board"?this.lobbyBoard.getHosts():null;e?(this.detachPanel(),this.mountSurfaces(e.controls,e.sidebarBody),this.lobbyBoard.setFilterSummary(Xe(this.filters.getSettings()))):this.sleeping?this.detachPanel():(this.panel.isConnected||document.body.appendChild(this.panel),this.mountSurfaces(this.panelControlsSlot,this.panelFiltersSlot))}mountSurfaces(e,t){(this.controlsHost!==e||!e.isConnected)&&(this.controls.mount(e),this.controlsHost=e),(this.filtersHost!==t||!t.isConnected)&&(this.filters.mount(t),this.filtersHost=t)}detachPanel(){this.panel.remove()}updateSleepState(){let e=B.isOnLobbyPage();this.sleeping=!e,this.sleeping?(this.stopTimer(),this.stopGameInfoUpdates(),this.updateQueueCardPulses(new Set),this.updateSeeAllSignals(!1,new Set),this.lobbyBoard.hide(),this.placeSurfaces()):(this.syncSearchTimer(),this.startGameInfoUpdates(),this.updateLobbyBoard(this.lastLobbies))}cleanup(){this.isDisposed=!0,window.removeEventListener("blur",this.handleWindowBlur),document.removeEventListener("visibilitychange",this.handleVisibilityChange),this.stopTimer(),this.stopGameInfoUpdates(),this.pulseSyncTimeout&&(clearTimeout(this.pulseSyncTimeout),this.pulseSyncTimeout=null),this.activeMatchSources.clear(),this.applyQueueCardPulses(),this.updateSeeAllSignals(!1,new Set),this.seeAllObserver?.disconnect(),this.seeAllObserver=null,this.observedSeeAllView=null,this.boardAlerts.clear(),this.lobbyBoard.dispose(),this.filters.cleanup(),this.controls.cleanup(),this.panel.remove()}};var te=class{constructor(){this.observer=null;this.animationFrameId=null}start(){this.observer||(this.observer=new MutationObserver(()=>this.scheduleApplyHighlights()),this.observer.observe(document.body,{attributes:!1,childList:!0,subtree:!0}),this.applyHighlights())}stop(){this.observer?.disconnect(),this.observer=null,this.animationFrameId!==null&&(cancelAnimationFrame(this.animationFrameId),this.animationFrameId=null)}scheduleApplyHighlights(){this.animationFrameId===null&&(this.animationFrameId=requestAnimationFrame(()=>{this.animationFrameId=null,this.applyHighlights()}))}applyHighlights(){for(let e of Array.from(document.querySelectorAll("lobby-player-view")))this.applyHighlightToView(e)}applyHighlightToView(e){this.clearHighlights(e);let t=Array.from(e.querySelectorAll(".player-tag.current-player"));if(t.length>0){t.forEach(r=>r.classList.add("of-current-player-boost"));return}let i=this.getNativeTeamRows(e);i.forEach(r=>r.classList.add("of-current-player-boost"));let o=this.getNativeTeamCards(e);o.forEach(r=>r.classList.add("of-current-player-team-boost")),!(i.length>0||o.length>0)&&this.applyFallbackHighlight(e)}clearHighlights(e){e.querySelectorAll(".of-current-player-boost").forEach(t=>{t.classList.remove("of-current-player-boost")}),e.querySelectorAll(".of-current-player-team-boost").forEach(t=>{t.classList.remove("of-current-player-team-boost")})}getNativeTeamRows(e){return Array.from(e.querySelectorAll("div")).filter(t=>{let i=t.classList;return i.contains("bg-sky-600/20")&&i.contains("border-sky-500/40")})}getNativeTeamCards(e){return Array.from(e.querySelectorAll("div")).filter(t=>{let i=t.classList;return i.contains("rounded-xl")&&i.contains("border-sky-500/60")})}applyFallbackHighlight(e){let t=e.currentClientID,i=Array.isArray(e.clients)?e.clients:[];if(!t||i.length===0)return;let o=i.findIndex(u=>u?.clientID===t);if(o<0)return;let r=i[o],n=this.formatDisplayName(r),s=Array.from(e.querySelectorAll(".player-tag"));if(s[o]){s[o].classList.add("of-current-player-boost");return}Array.from(e.querySelectorAll("[data-client-id]")).filter(u=>u.dataset.clientId===t).forEach(u=>u.classList.add("of-current-player-boost")),this.findRowsByDisplayName(e,n).forEach(u=>u.classList.add("of-current-player-boost"));let c=Array.from(e.querySelectorAll(".rounded-xl")),v=(Array.isArray(e.teamPreview)?e.teamPreview:[]).filter(u=>Array.isArray(u.players)&&u.players.length>0).findIndex(u=>Array.isArray(u.players)&&u.players.some(g=>g?.clientID===t));v>=0&&c[v]&&(c[v].classList.add("of-current-player-team-boost"),this.findRowsByDisplayName(c[v],n).forEach(g=>g.classList.add("of-current-player-boost")))}formatDisplayName(e){return e?.username?e.clanTag?`[${e.clanTag}] ${e.username}`:e.username:""}findRowsByDisplayName(e,t){if(!t)return[];let i=[];for(let o of Array.from(e.querySelectorAll("span, div"))){let r=o.textContent?.trim();if(!r||r!==t)continue;let n=o.closest("[data-client-id]")??o.closest(".player-tag")??o.closest(".team-player-row")??o.closest("div");n&&!i.includes(n)&&i.push(n)}return i}};(function(){"use strict";console.log("[OpenFront Game Notifier] Initializing adaptation for OpenFront 0.30..."),GM_addStyle(Ce()),F.preloadSounds(),O.init(),ae.start();let a=new ee,e=new te;ae.subscribe((o,r)=>{a.receiveLobbyUpdate(o,r)}),e.start();let t=o=>{try{return new URL(o).searchParams.has("live")}catch{return!1}},i=t(location.href);O.subscribe(o=>{let r=t(o);!i&&r&&a.isSoundEnabled()&&F.playGameStartSound(),i=r}),console.log("[OpenFront Game Notifier] Ready! \u{1F680}")})();})();
