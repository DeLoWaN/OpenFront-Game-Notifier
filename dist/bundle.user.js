// ==UserScript==
// @name         OpenFront Game Notifier
// @namespace    https://openfront.io/
// @version      2.11.2
// @description  Notifies you when a public OpenFront lobby matches your filters (mode, team format, capacity, modifiers) via in-page highlight, sound, and optional desktop notifications. Never auto-joins.
// @homepageURL  https://github.com/DeLoWaN/openfront-autojoin-lobby
// @downloadURL  https://raw.githubusercontent.com/DeLoWaN/openfront-autojoin-lobby/main/dist/bundle.user.js
// @updateURL    https://raw.githubusercontent.com/DeLoWaN/openfront-autojoin-lobby/main/dist/bundle.user.js
// @author       DeLoVaN + SyntaxMenace + DeepSeek + Claude
// @match        https://openfront.io/
// @match        https://openfront.io/*
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_addStyle
// @grant        unsafeWindow
// @license      UNLICENSED
// ==/UserScript==

"use strict";(()=>{var m={bgPrimary:"#0d0f10",bgSecondary:"#14171a",bgElevated:"#1a1e22",bgRaised:"#20252a",bgHover:"rgba(255,255,255,0.04)",textPrimary:"#f2f1ee",textSecondary:"#c8c6c0",textMuted:"#8e8c85",textFaint:"#5a5853",border:"rgba(255,255,255,0.06)",borderSubtle:"rgba(255,255,255,0.10)",borderStrong:"rgba(255,255,255,0.16)",accent:"#7aa7d4",accentSoft:"rgba(122,167,212,0.14)",accentLine:"rgba(122,167,212,0.32)",accentShadow:"122,167,212",warning:"#d4a056",warningSoft:"rgba(212,160,86,0.14)",danger:"#d27a6b",dangerSoft:"rgba(210,122,107,0.14)",dangerLine:"rgba(210,122,107,0.30)",accentMuted:"rgba(122,167,212,0.14)",accentHover:"#9bbfe0",accentAlt:"#9bbfe0",borderAccent:"rgba(122,167,212,0.32)",highlight:"rgba(122,167,212,0.20)",success:"#74c69d",successSolid:"#74c69d",error:"#d27a6b"},g={body:"'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif",display:"'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif",mono:"'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace"};var S={sm:"6px",md:"7px",lg:"10px",xl:"14px"},N={sm:"0 1px 3px rgba(0,0,0,0.4)",md:"0 2px 8px rgba(0,0,0,0.3)",lg:"0 1px 0 rgba(255,255,255,0.04) inset, 0 24px 48px rgba(0,0,0,0.45), 0 2px 8px rgba(0,0,0,0.3)"},u={fast:"0.12s",normal:"0.2s",slow:"0.3s"};var X={threadCount:20,lobbyPollingRate:1e3},P={lobbyDiscoverySettings:"OF_LOBBY_DISCOVERY_SETTINGS"},J={panel:9998,panelOverlay:9999,modal:1e4,notification:2e4},Z=[2,3,4,5,6,8,10,15,20,30,62],M=2,z=62;function ee(){return`
    :root {
      --of-hud-accent: ${m.accent};
      --of-hud-accent-soft: ${m.accentSoft};
      --of-hud-accent-line: ${m.accentLine};
      --of-hud-bg-0: ${m.bgPrimary};
      --of-hud-bg-1: ${m.bgSecondary};
      --of-hud-bg-2: ${m.bgElevated};
      --of-hud-bg-3: ${m.bgRaised};
      --of-hud-text-1: ${m.textPrimary};
      --of-hud-text-2: ${m.textSecondary};
      --of-hud-text-3: ${m.textMuted};
      --of-hud-text-4: ${m.textFaint};
      --of-hud-line-1: ${m.border};
      --of-hud-line-2: ${m.borderSubtle};
      --of-hud-line-3: ${m.borderStrong};
      --of-hud-danger: ${m.danger};
      --of-hud-danger-soft: ${m.dangerSoft};
      --of-hud-danger-line: ${m.dangerLine};
    }

    @keyframes ofPanelEnter {
      from { opacity: 0; transform: translateY(10px); }
      to   { opacity: 1; transform: translateY(0); }
    }

    @keyframes livePulse {
      0%   { box-shadow: 0 0 0 0 rgba(${m.accentShadow}, 0.5); }
      70%  { box-shadow: 0 0 0 8px rgba(${m.accentShadow}, 0); }
      100% { box-shadow: 0 0 0 0 rgba(${m.accentShadow}, 0); }
    }

    .of-panel {
      position: fixed;
      background: linear-gradient(180deg, var(--of-hud-bg-2) 0%, var(--of-hud-bg-1) 100%);
      border: 1px solid var(--of-hud-line-2);
      border-radius: ${S.xl};
      box-shadow: ${N.lg};
      font-family: ${g.body};
      color: var(--of-hud-text-1);
      user-select: none;
      z-index: ${J.panel};
      display: flex;
      flex-direction: column;
      overflow: hidden;
      animation: ofPanelEnter ${u.slow} ease;
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
      font-family: ${g.mono};
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
      transition: background ${u.fast}, color ${u.fast};
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
      font-family: ${g.mono};
      font-size: 10px;
      letter-spacing: 0.16em;
      text-transform: uppercase;
      color: var(--of-hud-text-4);
      margin-bottom: 4px;
    }
    .ld-title {
      font-family: ${g.display};
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
      font-family: ${g.mono};
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
      transition: background ${u.fast}, color ${u.fast};
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
      transition: background ${u.fast}, border-color ${u.fast};
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
      transition: opacity ${u.normal};
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
      font-family: ${g.mono};
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
      transition: background ${u.fast}, color ${u.fast}, border-color ${u.fast};
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
      font-family: ${g.mono};
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
      box-shadow: ${N.sm};
      pointer-events: auto;
      cursor: grab;
    }
    .capacity-slider::-moz-range-thumb {
      width: 14px;
      height: 14px;
      border-radius: 50%;
      background: var(--of-hud-text-1);
      border: 1px solid rgba(0,0,0,0.4);
      box-shadow: ${N.sm};
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
      font-family: ${g.mono};
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
      font-family: ${g.mono};
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
      transition: background ${u.fast}, border-color ${u.fast};
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
      font-family: ${g.mono};
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
      border-radius: ${S.sm};
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
      font-family: ${g.mono};
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
      font-family: ${g.mono};
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
      transition: background ${u.fast}, color ${u.fast}, border-color ${u.fast};
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
      transition: background ${u.fast}, border-color ${u.fast};
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
      font-family: ${g.mono};
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
      transition: background ${u.fast}, color ${u.fast};
    }
    .discovery-footer .reset:hover {
      color: var(--of-hud-text-1);
      background: rgba(255,255,255,0.04);
    }

    /* Native join-modal player highlights \u2014 re-themed to blue accent */
    .of-current-player-boost {
      box-shadow: 0 0 0 1px var(--of-hud-accent), 0 0 16px var(--of-hud-accent-soft);
      background: linear-gradient(90deg, var(--of-hud-accent-soft), rgba(${m.accentShadow}, 0.06));
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
        box-shadow ${u.fast},
        filter ${u.fast},
        border-color ${u.fast};
      animation: discoveryCardActiveBeacon 1.45s ease-in-out infinite;
    }

    /* ===================== Up Next strip ===================== */
    .of-upcoming {
      margin: 18px 0 0;
      font-family: ${g.body};
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
      transition: background ${u.fast};
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
      transition: transform ${u.fast}, background ${u.fast};
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
      border-radius: ${S.xl};
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
      border-radius: ${S.xl};
      background: var(--of-hud-bg-1);
      color: #fff;
      text-transform: uppercase;
      text-align: left;
      overflow: hidden;
      cursor: pointer;
      padding: 0;
      transition: transform ${u.normal}, border-color ${u.fast};
    }
    .of-upcoming-card:hover {
      transform: scale(1.02);
      border-color: rgba(255, 255, 255, 0.5);
    }
    .of-upcoming-art {
      position: absolute;
      inset: 0;
      z-index: 0;
      border-radius: ${S.xl};
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
  `}var w={gameFoundAudio:null,gameStartAudio:null,audioUnlocked:!1,preloadSounds(){try{this.gameFoundAudio=new Audio("https://github.com/DeLoWaN/openfront-autojoin-lobby/raw/refs/heads/main/notification_sounds/new-notification-014-363678.mp3"),this.gameFoundAudio.volume=.5,this.gameFoundAudio.preload="auto",this.gameStartAudio=new Audio("https://github.com/DeLoWaN/openfront-autojoin-lobby/raw/refs/heads/main/notification_sounds/opening-bell-421471.mp3"),this.gameStartAudio.volume=.5,this.gameStartAudio.preload="auto",this.setupAudioUnlock()}catch(n){console.warn("[SoundUtils] Could not preload audio:",n)}},setupAudioUnlock(){let n=()=>{if(this.audioUnlocked)return;let e=[];this.gameFoundAudio&&(this.gameFoundAudio.volume=.01,e.push(this.gameFoundAudio.play().then(()=>{this.gameFoundAudio&&(this.gameFoundAudio.pause(),this.gameFoundAudio.currentTime=0,this.gameFoundAudio.volume=.5)}).catch(()=>{}))),this.gameStartAudio&&(this.gameStartAudio.volume=.01,e.push(this.gameStartAudio.play().then(()=>{this.gameStartAudio&&(this.gameStartAudio.pause(),this.gameStartAudio.currentTime=0,this.gameStartAudio.volume=.5)}).catch(()=>{}))),Promise.all(e).then(()=>{this.audioUnlocked=!0,console.log("[SoundUtils] Audio unlocked successfully"),document.removeEventListener("click",n),document.removeEventListener("keydown",n),document.removeEventListener("touchstart",n)})};document.addEventListener("click",n,{once:!0}),document.addEventListener("keydown",n,{once:!0}),document.addEventListener("touchstart",n,{once:!0})},playGameFoundSound(){this.gameFoundAudio?(console.log("[SoundUtils] Attempting to play game found sound"),this.gameFoundAudio.currentTime=0,this.gameFoundAudio.play().catch(n=>{console.warn("[SoundUtils] Failed to play game found sound:",n)})):console.warn("[SoundUtils] Game found audio not initialized")},playGameStartSound(){this.gameStartAudio?(console.log("[SoundUtils] Attempting to play game start sound"),this.gameStartAudio.currentTime=0,this.gameStartAudio.play().catch(n=>{console.warn("[SoundUtils] Failed to play game start sound:",n)})):console.warn("[SoundUtils] Game start audio not initialized")}};var C={callbacks:[],lastUrl:location.href,initialized:!1,init(){if(this.initialized)return;this.initialized=!0;let n=()=>{location.href!==this.lastUrl&&(this.lastUrl=location.href,this.notify())};window.addEventListener("popstate",n),window.addEventListener("hashchange",n);let e=history.pushState,t=history.replaceState;history.pushState=function(...i){e.apply(history,i),setTimeout(n,0)},history.replaceState=function(...i){t.apply(history,i),setTimeout(n,0)},setInterval(n,200)},subscribe(n){this.callbacks.push(n),this.init()},notify(){this.callbacks.forEach(n=>n(location.href))}};var q={subscribers:[],fallbackInterval:null,fallbackStartTimeout:null,lastLobbies:[],pollingRate:X.lobbyPollingRate,started:!1,publicLobbiesListener:null,start(){this.started||(this.started=!0,this.publicLobbiesListener=n=>this.handlePublicLobbiesUpdate(n),document.addEventListener("public-lobbies-update",this.publicLobbiesListener),this.scheduleFallbackPolling())},stop(){this.started&&(this.started=!1,this.publicLobbiesListener&&(document.removeEventListener("public-lobbies-update",this.publicLobbiesListener),this.publicLobbiesListener=null),this.fallbackStartTimeout&&(clearTimeout(this.fallbackStartTimeout),this.fallbackStartTimeout=null),this.stopFallbackPolling())},subscribe(n){this.subscribers.push(n),this.lastLobbies.length>0&&n(this.lastLobbies)},scheduleFallbackPolling(){!this.started||this.fallbackInterval||this.fallbackStartTimeout||(this.fallbackStartTimeout=setTimeout(()=>{this.fallbackStartTimeout=null,this.startFallbackPolling()},this.pollingRate*2))},startFallbackPolling(){this.fallbackInterval||(this.fetchData(),this.fallbackInterval=setInterval(()=>void this.fetchData(),this.pollingRate))},stopFallbackPolling(){this.fallbackInterval&&(clearInterval(this.fallbackInterval),this.fallbackInterval=null)},async fetchData(){if(!(location.pathname!=="/"&&!location.pathname.startsWith("/public-lobby")))try{let n=await fetch("/api/public_lobbies");if(n.status===429){console.warn("[Bundle] Rate limited.");return}if(!n.ok){console.warn(`[Bundle] API error: ${n.status}`);return}let e=await n.json();this.lastLobbies=this.extractLobbies(e),this.notifySubscribers()}catch(n){console.error("[Bundle] API Error:",n)}},notifySubscribers(){this.subscribers.forEach(n=>n(this.lastLobbies))},handlePublicLobbiesUpdate(n){this.fallbackStartTimeout&&(clearTimeout(this.fallbackStartTimeout),this.fallbackStartTimeout=null),this.stopFallbackPolling();let e=n.detail?.payload;this.lastLobbies=this.extractLobbies(e),this.notifySubscribers(),this.scheduleFallbackPolling()},extractLobbies(n){if(!n||typeof n!="object")return[];if(Array.isArray(n.lobbies))return n.lobbies;let e=n.games;return e?["ffa","team","special"].flatMap(t=>(e[t]??[]).map(i=>({...i,publicGameType:i.publicGameType??t}))):[]}};var D={lastActionTime:0,debounceDelay:800,getLobbyButton(){return document.querySelector("public-lobby")?.querySelector("button.group.relative.isolate")},canJoinLobby(){let n=document.querySelector("public-lobby");if(!n)return!1;let e=this.getLobbyButton();return!!(e&&!n.isLobbyHighlighted&&n.lobbies&&n.lobbies.length>0&&!e.disabled&&e.offsetParent!==null)},verifyState(n){let e=document.querySelector("public-lobby");if(!e)return!1;let t=this.getLobbyButton();return!t||t.disabled||t.offsetParent===null?!1:n==="in"?e.isLobbyHighlighted===!0:n==="out"?!!(!e.isLobbyHighlighted&&e.lobbies&&e.lobbies.length>0):!1},tryJoinLobby(){let n=Date.now();if(n-this.lastActionTime<this.debounceDelay)return!1;let e=this.getLobbyButton(),t=document.querySelector("public-lobby");return e&&t&&!t.isLobbyHighlighted&&t.lobbies&&t.lobbies.length>0&&!e.disabled&&e.offsetParent!==null?(this.lastActionTime=n,e.click(),setTimeout(()=>{this.verifyState("in")||console.warn("[LobbyUtils] Join may have failed, state not updated")},100),!0):!1},isOnLobbyPage(){let n=document.getElementById("page-game");if(n&&!n.classList.contains("hidden"))return!1;let e=document.querySelector("canvas");if(e&&e.offsetParent!==null){let a=e.getBoundingClientRect();if(a.width>100&&a.height>100)return!1}let t=document.querySelector("public-lobby");if(t&&t.offsetParent!==null)return!0;if(t&&t.offsetParent===null)return!1;let i=document.getElementById("page-play");if(i&&!i.classList.contains("hidden")&&t)return!0;let o=window.location.pathname.replace(/\/+$/,"")||"/";return o==="/"||o==="/public-lobby"}};var V={isSupported(){return typeof Notification<"u"},isBackgrounded(){let n=document.visibilityState==="hidden"||document.hidden,e=typeof document.hasFocus=="function"?document.hasFocus():!0;return n||!e},async ensurePermission(){if(typeof Notification>"u")return!1;if(Notification.permission==="granted")return!0;if(Notification.permission==="denied")return!1;try{return await Notification.requestPermission()==="granted"}catch(n){return console.warn("[BrowserNotificationUtils] Permission request failed:",n),!1}},show(n){if(!this.isSupported()||!this.isBackgrounded())return!1;if(Notification.permission==="granted"){let e=new Notification(n.title,{body:n.body});return e.onclick=()=>{this.focusWindow(),e.close()},!0}return!1},focusWindow(){window.focus()}};var ce="any";function ne(n){if(!n)return null;let e=n.toLowerCase().trim();return e==="free for all"||e==="ffa"||e==="free-for-all"?"FFA":e==="team"||e==="teams"?"Team":null}function x(n){return ne(n.gameConfig?.gameMode)}function oe(n){let e=n.publicGameType?.toLowerCase().trim();return e==="ffa"||e==="team"||e==="special"?e:null}function Q(n){if(n==="Duos"||n==="Trios"||n==="Quads"||n==="Humans Vs Nations"||n==="8+"||typeof n=="number"&&Number.isFinite(n)&&n>0)return n;if(typeof n=="string"){let e=parseInt(n,10);if(!Number.isNaN(e)&&e>0)return e}return null}function L(n){let e=n.gameConfig;if(!e||x(n)!=="Team")return null;let t=Q(e.playerTeams??null);return t!==null?t:Q(e.teamCount??e.teams??null)}function k(n){let e=n.gameConfig;return e?e.maxPlayers??e.maxClients??e.maxPlayersPerGame??n.maxClients??null:null}function $(n,e){return!n||!e?null:n==="Duos"?2:n==="Trios"?3:n==="Quads"?4:n==="Humans Vs Nations"?e:typeof n=="number"&&n>0?Math.floor(e/n):null}function H(n,e){let t=n.gameConfig?.publicGameModifiers;switch(e){case"isCompact":return t?.isCompact;case"isRandomSpawn":return t?.isRandomSpawn;case"isCrowded":return t?.isCrowded;case"isHardNations":return t?.isHardNations;case"isAlliancesDisabled":return t?.isAlliancesDisabled;case"isPortsDisabled":return t?.isPortsDisabled;case"isNukesDisabled":return t?.isNukesDisabled;case"isSAMsDisabled":return t?.isSAMsDisabled;case"isPeaceTime":return t?.isPeaceTime;case"isWaterNukes":return t?.isWaterNukes;case"startingGold":return t?.startingGold??n.gameConfig?.startingGold??void 0;case"goldMultiplier":return t?.goldMultiplier??n.gameConfig?.goldMultiplier??void 0;default:return}}function ae(n){let e=x(n),t=L(n),i=k(n);if(e==="FFA")return i!==null?`FFA \u2022 ${i} slots`:"FFA";if(e!=="Team")return"Unsupported mode";if(t==="Humans Vs Nations")return i!==null?`Humans Vs Nations (${i})`:"Humans Vs Nations";if(t==="Duos")return"Duos";if(t==="Trios")return"Trios";if(t==="Quads")return"Quads";if(typeof t=="number"&&i!==null){let o=$(t,i);return o!==null?`${t} teams (${o} per team)`:`${t} teams`}return"Team"}function ue(n){let e=x(n),t=L(n);return e==="FFA"?"FFA":e!=="Team"?"Unsupported mode":t==="Humans Vs Nations"?"Humans Vs Nations":t==="Duos"||t==="Trios"||t==="Quads"?t:typeof t=="number"?`${t} teams`:"Team"}function pe(n){return n>=1e6&&n%1e6===0?`${n/1e6}M`:n>=1e3&&n%1e3===0?`${n/1e3}K`:String(n)}function se(n){let e=n.gameConfig?.publicGameModifiers,t=[];e?.isCompact&&t.push("Compact"),e?.isRandomSpawn&&t.push("Random"),e?.isCrowded&&t.push("Crowded"),e?.isHardNations&&t.push("Hard");let i=e?.startingGold??n.gameConfig?.startingGold;typeof i=="number"&&t.push(pe(i));let o=e?.goldMultiplier??n.gameConfig?.goldMultiplier;return typeof o=="number"&&t.push(`x${o}`),e?.isAlliancesDisabled&&t.push("No Alliances"),e?.isPortsDisabled&&t.push("No Ports"),e?.isNukesDisabled&&t.push("No Nukes"),e?.isSAMsDisabled&&t.push("No SAMs"),e?.isPeaceTime&&t.push("Peace"),e?.isWaterNukes&&t.push("Water Nukes"),t}function re(n){let e=[],t=n.gameConfig?.gameMap?.trim(),i=k(n),o=L(n),a=ue(n);if(t&&e.push(t),x(n)==="Team"&&o!=="Humans Vs Nations"){e.push(a);let l=$(o,i);l!==null&&e.push(`${l}/team`)}else e.push(a);let s=[];i!==null&&s.push(`${i} slots`);let r=se(n);return r.length>0&&s.push(r.join(", ")),{title:e.join(" \u2022 "),body:s.join(" \u2022 ")}}function te(n){return typeof n=="number"&&Number.isFinite(n)?n:null}function y(n){return n==="blocked"||n==="rejected"?"blocked":n==="required"?"required":n==="any"||n==="allowed"||n==="indifferent"?"any":ce}function ie(n){if(!n||typeof n!="object")return;let e={};for(let[t,i]of Object.entries(n)){let o=Number(t);Number.isFinite(o)&&(e[o]=y(i))}return Object.keys(e).length>0?e:void 0}function me(n){if(!n||typeof n!="object")return;let e=n;return{isCompact:y(e.isCompact),isRandomSpawn:y(e.isRandomSpawn),isCrowded:y(e.isCrowded),isHardNations:y(e.isHardNations),isAlliancesDisabled:y(e.isAlliancesDisabled),isPortsDisabled:y(e.isPortsDisabled),isNukesDisabled:y(e.isNukesDisabled),isSAMsDisabled:y(e.isSAMsDisabled),isPeaceTime:y(e.isPeaceTime),isWaterNukes:y(e.isWaterNukes),startingGold:ie(e.startingGold),goldMultiplier:ie(e.goldMultiplier)}}function fe(n){let e=Q(n);return e==="Duos"||e==="Trios"||e==="Quads"?null:e}function he(n){if(!Array.isArray(n))return[];let e=[];for(let t of n){let i=t,o=ne(i.gameMode??null);if(!o)continue;let a=te(i.minPlayers),s=te(i.maxPlayers);o==="Team"&&(typeof a=="number"&&a<M&&(a=M),typeof a=="number"&&typeof s=="number"&&s<a&&(s=a)),e.push({gameMode:o,teamCount:o==="Team"?fe(i.teamCount??null):null,minPlayers:a,maxPlayers:s,modifiers:me(i.modifiers)})}return e}function j(n,e=Date.now()){let t=Math.max(0,Math.floor((e-n)/1e3));return`${Math.floor(t/60)}m ${t%60}s`}function be(n){let e=x(n);if(e==="FFA")return"Free For All";if(e!=="Team")return"Unsupported mode";let t=L(n),i=k(n);if(t==="Humans Vs Nations")return i!==null?`${i} Humans vs ${i} Nations`:"Humans vs Nations";let o=null;t==="Duos"?o=2:t==="Trios"?o=3:t==="Quads"&&(o=4);let a=null;return o!==null?a=i!==null?Math.floor(i/o):null:typeof t=="number"&&(a=t,o=i!==null&&t>0?Math.floor(i/t):null),a===null?"Teams":o!==null?`${a} teams of ${o}`:`${a} teams`}function ge(n,e,t){let i=n.gameConfig?.gameMap?.trim();if(!i)return null;let o=i.toLowerCase().replace(/[\s.()]+/g,"");if(!o)return null;let a=`maps/${encodeURIComponent(o)}/thumbnail.webp`,s=e?.[`maps/${o}/thumbnail.webp`];if(s){let r=(t??"").replace(/\/+$/,"");return r?`${r}${s}`:s}return`/${a}`}function le(n,e,t){let i=k(n);return{gameID:n.gameID,mapName:n.gameConfig?.gameMap?.trim()||"Unknown map",modeText:be(n),capacityLabel:i!==null?`${i} slots`:"",modifierLabels:se(n),thumbnailUrl:ge(n,e,t)}}function de(n){return{criteria:he(n?.criteria),discoveryEnabled:typeof n?.discoveryEnabled=="boolean"?n.discoveryEnabled:!0,soundEnabled:typeof n?.soundEnabled=="boolean"?n.soundEnabled:!0,desktopNotificationsEnabled:typeof n?.desktopNotificationsEnabled=="boolean"?n.desktopNotificationsEnabled:!1,isTeamTwoTimesMinEnabled:typeof n?.isTeamTwoTimesMinEnabled=="boolean"?n.isTeamTwoTimesMinEnabled:!!n?.isTeamThreeTimesMinEnabled,notifyUpcomingEnabled:typeof n?.notifyUpcomingEnabled=="boolean"?n.notifyUpcomingEnabled:!0}}var ye=["isCompact","isRandomSpawn","isCrowded","isHardNations","isAlliancesDisabled","isPortsDisabled","isNukesDisabled","isSAMsDisabled","isPeaceTime","isWaterNukes"],F=class{matchesCriteria(e,t){if(!e||!e.gameConfig||!t||t.length===0)return!1;let i=x(e),o=k(e);if(!i||o===null)return!1;let a=L(e),s=i==="Team"?$(a,o):null,r=this.resolveLobbyTeamCount(a,s,o);for(let l of t){if(l.gameMode!==i)continue;if(i==="Team"){if(l.teamCount!==null&&l.teamCount!==void 0){if(l.teamCount==="8+"){if(r===null||r<8)continue}else if(l.teamCount==="Humans Vs Nations"||l.teamCount==="Duos"||l.teamCount==="Trios"||l.teamCount==="Quads"){if(l.teamCount!==a)continue}else if(r===null||l.teamCount!==r)continue}if(s===null)continue}let d=i==="Team"?s:o;if(d!==null&&!(a!=="Humans Vs Nations"&&(l.minPlayers!==null&&d<l.minPlayers||l.maxPlayers!==null&&d>l.maxPlayers))&&this.matchesModifiers(e,l.modifiers))return!0}return!1}resolveLobbyTeamCount(e,t,i){return typeof e=="number"?e:e==="Humans Vs Nations"?null:t!==null&&t>0&&i!==null?Math.floor(i/t):null}matchesModifiers(e,t){if(!t)return!0;for(let i of ye){let o=t[i];if(!o||o==="any")continue;let a=!!H(e,i);if(o==="blocked"&&a||o==="required"&&!a)return!1}return!(!this.matchesNumericModifier(H(e,"startingGold"),t.startingGold)||!this.matchesNumericModifier(H(e,"goldMultiplier"),t.goldMultiplier))}matchesNumericModifier(e,t){if(!t)return!0;let i=typeof e=="number"&&Number.isFinite(e)?e:null,o=Object.entries(t);if(o.length===0)return!0;let a=o.filter(([,r])=>r==="blocked").map(([r])=>Number(r));if(i!==null&&a.includes(i))return!1;let s=o.filter(([,r])=>r==="required").map(([r])=>Number(r));return!(s.length>0&&(i===null||!s.includes(i)))}};function v(n,e){if(e.length===0)return n;let t=e[0],i=e[e.length-1];return n<t?t:n>i?i:n}function T(n,e){if(e.length<2)return 0;let t=v(n,e),i=e.length-1;if(t>=e[i])return 1;if(t<=e[0])return 0;for(let o=0;o<i;o++){let a=e[o],s=e[o+1];if(t>=a&&t<=s){let r=(t-a)/(s-a);return(o+r)/i}}return 1}function W(n,e){if(e.length<2)return e[0]??0;let t=e.length-1;if(n<=0)return e[0];if(n>=1)return e[t];let i=n*t,o=Math.floor(i),a=i-o,s=e[o]+a*(e[o+1]-e[o]);return Math.round(s)}var E=1e3,I=class{constructor(e){this.onMinSliderInput=()=>{let e=parseInt(this.minSlider.value,10)/E,t=W(e,this.stops);this.applyValues(t,this.lastMax,{fireOnChange:!0,changed:"min"})};this.onMaxSliderInput=()=>{let e=parseInt(this.maxSlider.value,10)/E,t=W(e,this.stops);this.applyValues(this.lastMin,t,{fireOnChange:!0,changed:"max"})};this.onMinInputChange=()=>{let e=parseInt(this.minInput.value,10);if(!Number.isFinite(e)){this.applyValues(this.lastMin,this.lastMax,{fireOnChange:!1,changed:"both"});return}let t=v(e,[this.cfg.bounds.min,this.cfg.bounds.max]);this.applyValues(t,this.lastMax,{fireOnChange:!0,changed:"min"})};this.onMaxInputChange=()=>{let e=parseInt(this.maxInput.value,10);if(!Number.isFinite(e)){this.applyValues(this.lastMin,this.lastMax,{fireOnChange:!1,changed:"both"});return}let t=v(e,[this.cfg.bounds.min,this.cfg.bounds.max]);this.applyValues(this.lastMin,t,{fireOnChange:!0,changed:"max"})};if(this.cfg=e,this.stops=e.stops??[e.bounds.min,e.bounds.max],this.minSlider=document.getElementById(e.minSliderId),this.maxSlider=document.getElementById(e.maxSliderId),this.minInput=document.getElementById(e.minInputId),this.maxInput=document.getElementById(e.maxInputId),this.rangeRoot=document.getElementById(e.rangeRootId),this.container=document.getElementById(e.containerId),!this.minSlider||!this.maxSlider||!this.minInput||!this.maxInput)throw new Error(`RangeSlider: missing required element in ${e.rangeRootId}`);this.minSlider.min="0",this.minSlider.max=String(E),this.maxSlider.min="0",this.maxSlider.max=String(E),this.lastMin=this.readInputClamped(this.minInput,e.bounds.min),this.lastMax=this.readInputClamped(this.maxInput,e.bounds.max),this.lastMax<this.lastMin&&(this.lastMax=this.lastMin),this.minSlider.addEventListener("input",this.onMinSliderInput),this.maxSlider.addEventListener("input",this.onMaxSliderInput),this.minInput.addEventListener("change",this.onMinInputChange),this.maxInput.addEventListener("change",this.onMaxInputChange),this.applyValues(this.lastMin,this.lastMax,{fireOnChange:!1,changed:"both"}),this.renderTicks(),this.wireSteppers(),this.applyLockState()}applyLockState(){let e=!!this.cfg.lockMaxToTwiceMin?.();this.maxSlider.disabled=e,this.maxSlider.classList.toggle("is-max-locked",e),this.maxInput.disabled=e,this.container&&this.container.querySelectorAll('.ld-step-btn[data-target="max"]').forEach(t=>{t.disabled=e}),e&&this.applyValues(this.lastMin,this.lastMax,{fireOnChange:!1,changed:"min"})}setMin(e){this.applyValues(e,this.lastMax,{fireOnChange:!0,changed:"min"})}setRange(e,t){this.applyValues(e,t,{fireOnChange:!1,changed:"both"})}readInputClamped(e,t){let i=parseInt(e.value,10);return Number.isFinite(i)?v(i,[this.cfg.bounds.min,this.cfg.bounds.max]):t}applyValues(e,t,i){let o=e,a=t;if(this.cfg.lockMaxToTwiceMin?.()&&(a=v(o*2,[this.cfg.bounds.min,this.cfg.bounds.max])),o>a){let s=i.changed??"both";s==="min"?a=o:s==="max"?o=a:(o=Math.min(e,t),a=Math.max(e,t))}if(this.lastMin=o,this.lastMax=a,this.minInput.value=String(o),this.maxInput.value=String(a),this.minSlider.value=String(Math.round(T(o,this.stops)*E)),this.maxSlider.value=String(Math.round(T(a,this.stops)*E)),this.rangeRoot){let s=T(o,this.stops)*100,r=T(a,this.stops)*100;this.rangeRoot.style.setProperty("--lo",`${s}%`),this.rangeRoot.style.setProperty("--hi",`${r}%`)}i.fireOnChange&&this.cfg.onChange(o,a)}renderTicks(){if(!this.cfg.ticksContainerId||!this.cfg.stops)return;let e=document.getElementById(this.cfg.ticksContainerId);if(e){e.innerHTML="";for(let t of this.cfg.stops){let i=T(t,this.cfg.stops)*100,o=document.createElement("div");o.className="ld-tick",o.style.left=`${i}%`;let a=document.createElement("span");a.className="ld-tick-label",a.style.left=`${i}%`,a.textContent=String(t),e.appendChild(o),e.appendChild(a)}}}wireSteppers(){if(!this.container)return;this.container.querySelectorAll(".ld-step-btn").forEach(t=>{let i=t.dataset.target,o=t.dataset.action;!i||!o||t.addEventListener("click",()=>{let a=o==="inc"?1:-1;if(i==="min"){let s=v(this.lastMin+a,[this.cfg.bounds.min,this.cfg.bounds.max]);this.applyValues(s,this.lastMax,{fireOnChange:!0,changed:"min"})}else{let s=v(this.lastMax+a,[this.cfg.bounds.min,this.cfg.bounds.max]);this.applyValues(this.lastMin,s,{fireOnChange:!0,changed:"max"})}})})}};var R=[1e6,5e6,25e6],U=[2],Y=["modifier-isCompact","modifier-isRandomSpawn","modifier-isCrowded","modifier-isHardNations","modifier-isAlliancesDisabled","modifier-isPortsDisabled","modifier-isNukesDisabled","modifier-isSAMsDisabled","modifier-isPeaceTime","modifier-isWaterNukes"],ve=[["discovery-team-hvn","Humans Vs Nations",null]],xe=[["discovery-team-2","2"],["discovery-team-3","3"],["discovery-team-4","4"],["discovery-team-5","5"],["discovery-team-6","6"],["discovery-team-7","7"],["discovery-team-8plus","8+"]],B=[...ve.map(([n])=>n),...xe.map(([n])=>n)];function Se(){try{if(typeof unsafeWindow<"u"&&unsafeWindow.__OF_DEBUG_DISCOVERY===!0)return!0}catch{}if(globalThis.__OF_DEBUG_DISCOVERY===!0)return!0;try{if(typeof localStorage<"u"&&localStorage.getItem("__OF_DEBUG_DISCOVERY")==="true")return!0}catch{}return!1}function A(n){return n.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}var Me=["ffa","special","team"],Le='<svg viewBox="0 0 20 20" fill="currentColor"><path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z"/></svg>',K='<svg viewBox="0 0 24 24"><path d="M5 12l5 5L20 7"/></svg>',ke='<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>',Te='<svg viewBox="0 0 24 24"><path d="M11 5L6 9H2v6h4l5 4V5z"/><path d="M15.5 8.5a5 5 0 010 7"/><path d="M19 5a9 9 0 010 14"/></svg>',Ee='<svg viewBox="0 0 24 24"><path d="M6 8a6 6 0 1112 0c0 7 3 9 3 9H3s3-2 3-9z"/><path d="M10.3 21a1.94 1.94 0 003.4 0"/></svg>',_=class{constructor(){this.discoveryEnabled=!0;this.criteriaList=[];this.searchStartTime=null;this.lastMatchTime=null;this.soundEnabled=!0;this.desktopNotificationsEnabled=!1;this.notifyUpcomingEnabled=!0;this.desktopNotificationRequestId=0;this.activeMatchSources=new Set;this.seenLobbies=new Set;this.desktopNotifiedLobbies=new Set;this.isTeamTwoTimesMinEnabled=!1;this.ffaSlider=null;this.teamSlider=null;this.sleeping=!1;this.isDisposed=!1;this.lastLobbies=[];this.upcomingStrip=null;this.lastUpcomingSlots=new Map;this.lastUpcomingMatchSources=new Set;this.upcomingSlotSignatures=new Map;this.timerInterval=null;this.gameInfoInterval=null;this.pulseSyncTimeout=null;this.engine=new F,this.loadSettings(),this.createUI(),this.updateSleepState(),C.subscribe(()=>this.updateSleepState())}receiveLobbyUpdate(e){this.lastLobbies=e,this.processLobbies(e)}isSoundEnabled(){return this.soundEnabled}loadSettings(){let e=GM_getValue(P.lobbyDiscoverySettings,null),t=de(e);GM_setValue(P.lobbyDiscoverySettings,t),this.criteriaList=t.criteria,this.soundEnabled=t.soundEnabled,this.desktopNotificationsEnabled=t.desktopNotificationsEnabled,this.discoveryEnabled=t.discoveryEnabled,this.isTeamTwoTimesMinEnabled=t.isTeamTwoTimesMinEnabled,this.notifyUpcomingEnabled=t.notifyUpcomingEnabled??!0}saveSettings(){GM_setValue(P.lobbyDiscoverySettings,{criteria:this.criteriaList,discoveryEnabled:this.discoveryEnabled,soundEnabled:this.soundEnabled,desktopNotificationsEnabled:this.desktopNotificationsEnabled,isTeamTwoTimesMinEnabled:this.isTeamTwoTimesMinEnabled,notifyUpcomingEnabled:this.notifyUpcomingEnabled})}updateStatusText(){let e=document.getElementById("discovery-search-timer");if(e){if(!this.discoveryEnabled||this.criteriaList.length===0||!this.isDiscoveryFeedbackAllowed()){e.textContent="",e.style.display="none";return}e.style.display="inline",this.lastMatchTime!==null?e.textContent=`last match ${j(this.lastMatchTime)}`:this.searchStartTime!==null?e.textContent=`searching \xB7 ${j(this.searchStartTime)}`:e.textContent="awaiting filters"}}updateCurrentGameInfo(){let e=document.getElementById("discovery-current-game-info");if(!e||!D.isOnLobbyPage()){e&&(e.style.display="none");return}let t=document.querySelector("public-lobby");if(!t||!Array.isArray(t.lobbies)||t.lobbies.length===0){e.style.display="none";return}let i=t.lobbies[0];if(!i||!i.gameConfig){e.style.display="none";return}e.style.display="block",e.textContent=`Current game: ${ae(i)}`}parseSlots(e){let t=new Map;for(let i of e){let o=oe(i);if(!o)continue;let a=t.get(o)??{};a.live?a.upcoming||(a.upcoming=i):a.live=i,t.set(o,a)}return t}processLobbies(e){try{this.updateCurrentGameInfo(),this.syncSearchTimer();let t=this.parseSlots(e);if(!this.discoveryEnabled||this.criteriaList.length===0||!this.isDiscoveryFeedbackAllowed()){this.seenLobbies.clear(),this.desktopNotifiedLobbies.clear(),this.updateQueueCardPulses(new Set),this.renderUpcomingStrip(t,new Set),this.updateStatusText();return}let i=new Set,o=new Set,a=new Set,s=[],r=!1,l=Se(),d=(c,h,f)=>{if(!c)return;let b=this.engine.matchesCriteria(c,this.criteriaList);if(l&&console.log("[OF Discovery]",{lobbyId:c.gameID,source:h,kind:f,mode:c.gameConfig?.gameMode,playerTeams:c.gameConfig?.playerTeams,modifiers:c.gameConfig?.publicGameModifiers,hostGold:{startingGold:c.gameConfig?.startingGold,goldMultiplier:c.gameConfig?.goldMultiplier},criteriaCount:this.criteriaList.length,matched:b}),!b)return;if(f==="live")i.add(h);else{if(!this.notifyUpcomingEnabled)return;o.add(h)}let p=this.getNotificationKey(c);a.add(p),this.seenLobbies.has(p)||(r=!0),this.desktopNotifiedLobbies.has(p)||s.push(c)};for(let[c,h]of t)d(h.live,c,"live"),d(h.upcoming,c,"upcoming");if(this.updateQueueCardPulses(i),this.renderUpcomingStrip(t,o),r&&(this.lastMatchTime=Date.now(),this.soundEnabled&&w.playGameFoundSound()),this.desktopNotificationsEnabled){let c=new Set;for(let h of s){let f=re(h),b=this.getNotificationKey(h);V.show({title:f.title,body:f.body,tag:b})&&c.add(b)}this.desktopNotifiedLobbies=new Set([...[...this.desktopNotifiedLobbies].filter(h=>a.has(h)),...c])}else this.desktopNotifiedLobbies.clear();this.seenLobbies=a,a.size===0&&(this.lastMatchTime=null),this.updateStatusText()}catch(t){console.error("[LobbyDiscovery] Error processing lobbies:",t)}}getNotificationKey(e){return JSON.stringify({gameID:e.gameID,mode:e.gameConfig?.gameMode??null,playerTeams:e.gameConfig?.playerTeams??e.gameConfig?.teamCount??null,capacity:e.gameConfig?.maxPlayers??e.maxClients??null,modifiers:e.gameConfig?.publicGameModifiers??{}})}isDiscoveryFeedbackAllowed(){return!(!D.isOnLobbyPage()||document.getElementById("page-play")?.classList.contains("hidden")||document.querySelector("public-lobby")?.isLobbyHighlighted===!0||document.querySelector("join-lobby-modal")?.currentLobbyId||document.querySelector("host-lobby-modal")?.lobbyId)}getQueueCardElements(){let e=document.querySelector("game-mode-selector");if(!e)return{};let t=Array.from(e.querySelectorAll("div")).find(f=>f.className.includes("sm:grid-cols-[2fr_1fr]"));if(!(t instanceof HTMLElement))return{};let i=Array.from(t.children),o=i.find(f=>f.className.includes("sm:block")),a=i.find(f=>f.className.includes("sm:flex-col")),s=a?Array.from(a.children):[],r=e.lobbies?.games,l=Array.isArray(r?.special)&&r.special.length>0,d=Array.isArray(r?.team)&&r.team.length>0,c=l?s[0]:void 0,h=d?l?s[1]:s[0]:void 0;return{ffa:o?.querySelector("button"),special:c?.querySelector("button"),team:h?.querySelector("button")}}updateQueueCardPulses(e){this.activeMatchSources=new Set(e),this.applyQueueCardPulses(),this.scheduleQueueCardPulseSync()}applyQueueCardPulses(){let e=this.getQueueCardElements();for(let t of["ffa","special","team"]){let i=e[t];i&&i.classList.toggle("of-discovery-card-active",this.activeMatchSources.has(t))}}scheduleQueueCardPulseSync(){this.pulseSyncTimeout&&clearTimeout(this.pulseSyncTimeout),this.pulseSyncTimeout=setTimeout(()=>{this.pulseSyncTimeout=null,this.applyQueueCardPulses(),this.renderUpcomingStrip(this.lastUpcomingSlots,this.lastUpcomingMatchSources)},16)}getAssetContext(){let e;try{typeof unsafeWindow<"u"&&(e=unsafeWindow)}catch{}return!e&&typeof window<"u"&&(e=window),{manifest:e?.BOOTSTRAP_CONFIG?.assetManifest??e?.__ASSET_MANIFEST__??null,cdnBase:e?.BOOTSTRAP_CONFIG?.cdnBase??e?.__CDN_BASE__??null}}ensureUpcomingStrip(){let e=document.getElementById("of-upcoming-strip");if(e)return this.upcomingStrip=e,e;let t=document.querySelector("game-mode-selector");if(!t||!t.parentNode)return null;let i=document.createElement("div");i.id="of-upcoming-strip",i.className="of-upcoming",i.innerHTML=`
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
    `,t.parentNode.insertBefore(i,t.nextSibling),this.upcomingStrip=i,this.upcomingSlotSignatures.clear();let o=i.querySelector("#of-upcoming-toggle");return o&&(o.checked=this.notifyUpcomingEnabled,o.addEventListener("change",()=>{this.notifyUpcomingEnabled=o.checked,this.saveSettings(),this.processLobbies(this.lastLobbies)})),i}renderUpcomingStrip(e,t){this.lastUpcomingSlots=e,this.lastUpcomingMatchSources=t;let i=this.ensureUpcomingStrip();if(!i)return;let o=!this.sleeping&&this.isDiscoveryFeedbackAllowed();if(i.style.display=o?"":"none",!o)return;let a=i.querySelector("#of-upcoming-toggle");a&&a.checked!==this.notifyUpcomingEnabled&&(a.checked=this.notifyUpcomingEnabled);let{manifest:s,cdnBase:r}=this.getAssetContext();for(let l of Me){let d=i.querySelector(`.of-upcoming-slot[data-source="${l}"]`);if(!d)continue;let c=e.get(l),h=t.has(l),f=c?.live&&c.upcoming?le(c.upcoming,s,r):null,b=c?.live?f?JSON.stringify([f.gameID,h,f.mapName,f.modeText,f.capacityLabel,f.modifierLabels,f.thumbnailUrl]):"empty":"hidden";if(this.upcomingSlotSignatures.get(l)!==b)if(this.upcomingSlotSignatures.set(l,b),b==="hidden")d.style.display="none",d.replaceChildren();else if(b==="empty"){d.style.display="";let p=document.createElement("div");p.className="of-upcoming-empty",p.textContent="No upcoming game",d.replaceChildren(p)}else d.style.display="",d.replaceChildren(this.buildUpcomingCardElement(f,h))}}buildUpcomingCardElement(e,t){let i=document.createElement("button");i.type="button",i.className=`of-upcoming-card${t?" of-upcoming-card-match of-discovery-card-active":""}`;let a=e.modifierLabels.slice(0,3),s=e.modifierLabels.length-a.length,r=a.map(c=>`<span class="of-upcoming-tag">${A(c)}</span>`).join("");s>0&&(r+=`<span class="of-upcoming-tag of-upcoming-tag-more">+${s}</span>`);let l=e.thumbnailUrl?`<img src="${A(e.thumbnailUrl)}" alt="" loading="lazy">`:"",d=t?"Match \xB7 up next":"Up next";return i.setAttribute("aria-label",`Open ${e.mapName} in OpenFront's join modal`),i.innerHTML=`
      <span class="of-upcoming-art">${l}</span>
      <span class="of-upcoming-toprow">
        <span class="of-upcoming-tags">${r}</span>
        <span class="of-upcoming-chip"><span class="of-upcoming-dot"></span>${d}</span>
      </span>
      <span class="of-upcoming-bot">
        <span class="of-upcoming-name">${A(e.mapName)}</span>
        <span class="of-upcoming-metarow">
          <span class="of-upcoming-mode">${A(e.modeText)}</span>
          ${e.capacityLabel?`<span class="of-upcoming-count">${Le}${A(e.capacityLabel)}</span>`:""}
        </span>
      </span>
    `,i.addEventListener("click",()=>this.navigateToGame(`/game/${e.gameID}`)),i}navigateToGame(e){window.location.assign(e)}hideUpcomingStrip(){this.upcomingStrip&&(this.upcomingStrip.style.display="none")}stopTimer(){this.timerInterval&&(clearInterval(this.timerInterval),this.timerInterval=null)}startGameInfoUpdates(){this.stopGameInfoUpdates(),this.updateCurrentGameInfo(),this.gameInfoInterval=setInterval(()=>this.updateCurrentGameInfo(),1e3)}stopGameInfoUpdates(){this.gameInfoInterval&&(clearInterval(this.gameInfoInterval),this.gameInfoInterval=null)}syncSearchTimer(e={}){let{resetStart:t=!1}=e;this.stopTimer(),t&&(this.searchStartTime=null,this.lastMatchTime=null,this.seenLobbies.clear(),this.desktopNotifiedLobbies.clear()),this.discoveryEnabled&&this.criteriaList.length>0&&this.isDiscoveryFeedbackAllowed()?(this.searchStartTime===null&&(this.searchStartTime=Date.now()),this.timerInterval=setInterval(()=>this.updateStatusText(),1e3)):(this.searchStartTime=null,this.lastMatchTime=null),this.updateStatusText(),this.updatePulseIndicator()}updatePulseIndicator(){let e=document.querySelector(".ld-pulse");if(!e)return;let t=this.discoveryEnabled&&this.criteriaList.length>0;e.classList.toggle("is-paused",!t)}setDiscoveryEnabled(e,t={}){this.discoveryEnabled=e,this.saveSettings(),this.updateStatusLabel(),this.syncSearchTimer({resetStart:t.resetTimer??!1})}updateStatusLabel(){let e=document.querySelector(".ld-status-text strong");e&&(e.textContent=this.discoveryEnabled?"Discovery active":"Discovery paused")}getNumberValue(e){let t=document.getElementById(e);if(!t)return null;let i=parseInt(t.value,10);return Number.isNaN(i)?null:i}getModifierState(e){let i=document.getElementById(e)?.dataset.state;return i==="required"||i==="blocked"?i:"any"}setModifierState(e,t){let i=document.getElementById(e);if(!i)return;i.dataset.state=t,i.setAttribute("aria-pressed",String(t!=="any"));let o=i.dataset.modName??i.getAttribute("aria-label")??"",a=t==="blocked"?"excluded":t;o&&i.setAttribute("aria-label",t==="any"?o:`${o} \xB7 ${a}`);let s=i.querySelector(".ld-mod-ind");s&&(t==="required"?s.innerHTML=K:t==="blocked"?s.innerHTML=ke:s.innerHTML="")}cycleModifierState(e){let t=this.getModifierState(e),i=t==="any"?"required":t==="required"?"blocked":"any";this.setModifierState(e,i)}getNumericModifierState(e){let t={};for(let[i,o]of Object.entries(e))t[Number(i)]=this.getModifierState(o);return t}getModifierFiltersFromUI(){return{isCompact:this.getModifierState("modifier-isCompact"),isRandomSpawn:this.getModifierState("modifier-isRandomSpawn"),isCrowded:this.getModifierState("modifier-isCrowded"),isHardNations:this.getModifierState("modifier-isHardNations"),isAlliancesDisabled:this.getModifierState("modifier-isAlliancesDisabled"),isPortsDisabled:this.getModifierState("modifier-isPortsDisabled"),isNukesDisabled:this.getModifierState("modifier-isNukesDisabled"),isSAMsDisabled:this.getModifierState("modifier-isSAMsDisabled"),isPeaceTime:this.getModifierState("modifier-isPeaceTime"),isWaterNukes:this.getModifierState("modifier-isWaterNukes"),startingGold:this.getNumericModifierState({1e6:"modifier-startingGold-1000000",5e6:"modifier-startingGold-5000000",25e6:"modifier-startingGold-25000000"}),goldMultiplier:this.getNumericModifierState({2:"modifier-goldMultiplier-2"})}}getAllTeamCountValues(){let e=[];for(let t of B){let i=document.getElementById(t);if(!i?.checked)continue;let o=i.value;if(o==="Humans Vs Nations"||o==="8+")e.push(o);else{let a=parseInt(o,10);Number.isNaN(a)||e.push(a)}}return e}setAllTeamCounts(e){for(let t of B){let i=document.getElementById(t);i&&(i.checked=e,this.syncChipState(t))}}syncChipState(e){let t=document.getElementById(e);if(!t)return;let i=t.closest(".ld-chip, .ld-mode-btn, .ld-2x");i&&(i.classList.toggle("is-on",t.checked),i.setAttribute("aria-pressed",String(t.checked)))}buildCriteriaFromUI(){let e=this.getModifierFiltersFromUI(),t=[];if(document.getElementById("discovery-ffa")?.checked&&t.push({gameMode:"FFA",teamCount:null,minPlayers:this.getNumberValue("discovery-ffa-min"),maxPlayers:this.getNumberValue("discovery-ffa-max"),modifiers:e}),!document.getElementById("discovery-team")?.checked)return t;let a=this.getAllTeamCountValues();if(a.length===0)return t.push({gameMode:"Team",teamCount:null,minPlayers:this.getNumberValue("discovery-team-min"),maxPlayers:this.getNumberValue("discovery-team-max"),modifiers:e}),t;for(let s of a)t.push({gameMode:"Team",teamCount:s,minPlayers:this.getNumberValue("discovery-team-min"),maxPlayers:this.getNumberValue("discovery-team-max"),modifiers:e});return t}updateFilterCount(){let e=document.getElementById("discovery-filter-count"),t=document.getElementById("discovery-filter-word");if(!e||!t)return;let i=document.getElementById("discovery-ffa")?.checked,o=document.getElementById("discovery-team")?.checked,a=B.filter(l=>document.getElementById(l)?.checked).length,s=[...Y,...R.map(l=>`modifier-startingGold-${l}`),...U.map(l=>`modifier-goldMultiplier-${l}`)].filter(l=>this.getModifierState(l)!=="any").length,r=(i?1:0)+(o?1:0)+a+s;e.textContent=String(r),t.textContent=r===1?"filter":"filters"}setModePanelActive(e,t){let i=document.getElementById(e);i&&i.classList.toggle("is-off",!t)}setIconButtonState(e,t){let i=document.getElementById(e)?.closest(".ld-icon-btn");i&&i.classList.toggle("is-on",t)}loadUIFromSettings(){let e=this.criteriaList.find(d=>d.gameMode==="FFA"),t=this.criteriaList.filter(d=>d.gameMode==="Team"),i=document.getElementById("discovery-ffa"),o=document.getElementById("discovery-team");if(i&&(i.checked=!!e,this.syncChipState("discovery-ffa"),this.setModePanelActive("discovery-ffa-config",!!e)),o&&(o.checked=t.length>0,this.syncChipState("discovery-team"),this.setModePanelActive("discovery-team-config",t.length>0)),e){let d=document.getElementById("discovery-ffa-min"),c=document.getElementById("discovery-ffa-max");d&&e.minPlayers!==null&&(d.value=String(e.minPlayers)),c&&e.maxPlayers!==null&&(c.value=String(e.maxPlayers))}if(t[0]){let d=document.getElementById("discovery-team-min"),c=document.getElementById("discovery-team-max");d&&t[0].minPlayers!==null&&(d.value=String(t[0].minPlayers)),c&&t[0].maxPlayers!==null&&(c.value=String(t[0].maxPlayers)),this.setTeamCountSelections(t.map(h=>h.teamCount))}let a=(e??t[0])?.modifiers;if(a){this.setModifierState("modifier-isCompact",a.isCompact??"any"),this.setModifierState("modifier-isRandomSpawn",a.isRandomSpawn??"any"),this.setModifierState("modifier-isCrowded",a.isCrowded??"any"),this.setModifierState("modifier-isHardNations",a.isHardNations??"any"),this.setModifierState("modifier-isAlliancesDisabled",a.isAlliancesDisabled??"any"),this.setModifierState("modifier-isPortsDisabled",a.isPortsDisabled??"any"),this.setModifierState("modifier-isNukesDisabled",a.isNukesDisabled??"any"),this.setModifierState("modifier-isSAMsDisabled",a.isSAMsDisabled??"any"),this.setModifierState("modifier-isPeaceTime",a.isPeaceTime??"any"),this.setModifierState("modifier-isWaterNukes",a.isWaterNukes??"any");for(let d of R)this.setModifierState(`modifier-startingGold-${d}`,a.startingGold?.[d]??"any");for(let d of U)this.setModifierState(`modifier-goldMultiplier-${d}`,a.goldMultiplier?.[d]??"any")}let s=document.getElementById("discovery-sound-toggle");s&&(s.checked=this.soundEnabled,this.setIconButtonState("discovery-sound-toggle",this.soundEnabled));let r=document.getElementById("discovery-desktop-toggle");r&&(r.checked=this.desktopNotificationsEnabled,this.setIconButtonState("discovery-desktop-toggle",this.desktopNotificationsEnabled));let l=document.getElementById("discovery-team-two-times");l&&(l.checked=this.isTeamTwoTimesMinEnabled,this.syncChipState("discovery-team-two-times")),this.updateFilterCount(),this.updateStatusLabel()}setTeamCountSelections(e){for(let t of e){let i=null;t==="Humans Vs Nations"?i=document.getElementById("discovery-team-hvn"):t==="8+"?i=document.getElementById("discovery-team-8plus"):typeof t=="number"&&(i=document.getElementById(`discovery-team-${t}`)),i&&(i.checked=!0,this.syncChipState(i.id))}}refreshCriteria(){this.criteriaList=this.buildCriteriaFromUI(),this.saveSettings(),this.updateFilterCount(),this.syncSearchTimer({resetStart:!0})}resetAll(){let e=document.getElementById("discovery-ffa"),t=document.getElementById("discovery-team");e&&(e.checked=!1,this.syncChipState("discovery-ffa"),this.setModePanelActive("discovery-ffa-config",!1)),t&&(t.checked=!1,this.syncChipState("discovery-team"),this.setModePanelActive("discovery-team-config",!1)),this.setAllTeamCounts(!1);let i=document.getElementById("discovery-team-two-times");i&&(i.checked=!1,this.syncChipState("discovery-team-two-times"),this.isTeamTwoTimesMinEnabled=!1);for(let o of Y)this.setModifierState(o,"any");for(let o of R)this.setModifierState(`modifier-startingGold-${o}`,"any");for(let o of U)this.setModifierState(`modifier-goldMultiplier-${o}`,"any");this.ffaSlider?.setRange(1,125),this.teamSlider?.setRange(M,z),this.teamSlider?.applyLockState(),this.refreshCriteria()}async handleDesktopNotificationToggleChange(e){let t=++this.desktopNotificationRequestId;if(!e.checked){this.desktopNotificationsEnabled=!1,this.setIconButtonState("discovery-desktop-toggle",!1),this.saveSettings();return}let i=await V.ensurePermission();t!==this.desktopNotificationRequestId||this.isDisposed||!e.isConnected||!e.checked||(this.desktopNotificationsEnabled=i,e.checked=i,e.toggleAttribute("checked",i),this.setIconButtonState("discovery-desktop-toggle",i),this.saveSettings())}setupEventListeners(){document.getElementById("discovery-status")?.addEventListener("click",()=>{this.setDiscoveryEnabled(!this.discoveryEnabled,{resetTimer:!0})});for(let[i,o]of[["discovery-ffa","discovery-ffa-config"],["discovery-team","discovery-team-config"]]){let a=document.getElementById(i);a?.addEventListener("change",()=>{this.syncChipState(i),this.setModePanelActive(o,a.checked),this.refreshCriteria()})}let e=document.getElementById("discovery-team-two-times");e?.addEventListener("change",()=>{this.isTeamTwoTimesMinEnabled=e.checked,this.syncChipState("discovery-team-two-times"),this.teamSlider?.applyLockState(),this.refreshCriteria()}),document.getElementById("discovery-reset")?.addEventListener("click",()=>{this.resetAll()});for(let i of[...B,"discovery-sound-toggle","discovery-desktop-toggle"]){let o=document.getElementById(i);o&&o.addEventListener("change",()=>{if(i==="discovery-sound-toggle"){this.soundEnabled=o.checked,this.setIconButtonState("discovery-sound-toggle",o.checked),this.saveSettings();return}if(i==="discovery-desktop-toggle"){this.handleDesktopNotificationToggleChange(o);return}this.syncChipState(i),this.refreshCriteria()})}let t=[...Y,...R.map(i=>`modifier-startingGold-${i}`),...U.map(i=>`modifier-goldMultiplier-${i}`)];for(let i of t)document.getElementById(i)?.addEventListener("click",()=>{this.cycleModifierState(i),this.refreshCriteria()})}renderModeButton(e,t){return`
      <label class="ld-mode-btn" aria-pressed="false">
        <input type="checkbox" id="${e}" value="${e==="discovery-ffa"?"FFA":"Team"}">
        <span class="check">${K}</span>
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
    `}renderIconButton(e,t,i){return`
      <label class="ld-icon-btn" title="${t}" aria-label="${t}">
        <input type="checkbox" id="${e}">${i}
      </label>
    `}createUI(){document.getElementById("openfront-discovery-panel")||(this.panel=document.createElement("div"),this.panel.id="openfront-discovery-panel",this.panel.className="of-panel discovery-panel",this.panel.style.width="380px",this.panel.innerHTML=`
      <div class="ld-status">
        <span class="ld-pulse" aria-hidden="true"></span>
        <div class="ld-status-text" id="discovery-status" role="button" tabindex="0">
          <strong>Discovery active</strong>
          <span class="sep">\xB7</span>
          <span class="meta" id="discovery-search-timer"></span>
        </div>
        <div class="ld-icons">
          ${this.renderIconButton("discovery-sound-toggle","Sound alert",Te)}
          ${this.renderIconButton("discovery-desktop-toggle","Desktop notification",Ee)}
        </div>
      </div>
      <div class="ld-head">
        <div class="ld-eyebrow">Notify + quick-join \xB7 never auto-joins</div>
        <h2 class="ld-title">OpenFront Game Notifier</h2>
      </div>
      <div class="discovery-body">
        <div class="discovery-content" style="overflow-y: auto;">
          <div class="ld-section">
            <div class="ld-section-head">
              <div class="ld-section-label">Modes</div>
              <div class="ld-section-aside">Pick one or both</div>
            </div>
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
                <span class="check">${K}</span>
                <span class="lbl"><strong>Lock max-per-team to 2\xD7 the min</strong></span>
              </label>
              <div class="ld-current-game-info" id="discovery-current-game-info" style="display: none;"></div>
            </div>
          </div>

          <div class="ld-section">
            <div class="ld-section-head">
              <div class="ld-section-label">Modifiers</div>
              <div class="ld-mods-legend">
                <span class="key"><span class="swatch"></span>Any</span>
                <span class="key"><span class="swatch req"></span>Req</span>
                <span class="key"><span class="swatch blk"></span>Excl</span>
              </div>
            </div>

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
                ${this.renderModifierChip("modifier-isPortsDisabled","Ports Off")}
                ${this.renderModifierChip("modifier-isNukesDisabled","Nukes Off")}
                ${this.renderModifierChip("modifier-isSAMsDisabled","SAMs Off")}
                ${this.renderModifierChip("modifier-isPeaceTime","Peace Time")}
                ${this.renderModifierChip("modifier-isWaterNukes","Water Nukes")}
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
        <div class="discovery-footer">
          <div class="summary">
            <span class="num" id="discovery-filter-count">0</span>
            <span>active <span id="discovery-filter-word">filters</span></span>
          </div>
          <button type="button" class="reset" id="discovery-reset">Reset all</button>
        </div>
      </div>
    `,document.body.appendChild(this.panel),this.setupEventListeners(),this.loadUIFromSettings(),this.ffaSlider=new I({containerId:"discovery-ffa-slider-row",rangeRootId:"discovery-ffa-range-root",minSliderId:"discovery-ffa-min-slider",maxSliderId:"discovery-ffa-max-slider",minInputId:"discovery-ffa-min",maxInputId:"discovery-ffa-max",fillId:"discovery-ffa-range-fill",bounds:{min:1,max:125},onChange:()=>this.refreshCriteria()}),this.teamSlider=new I({containerId:"discovery-team-slider-row",rangeRootId:"discovery-team-range-root",minSliderId:"discovery-team-min-slider",maxSliderId:"discovery-team-max-slider",minInputId:"discovery-team-min",maxInputId:"discovery-team-max",fillId:"discovery-team-range-fill",ticksContainerId:"discovery-team-ticks",bounds:{min:M,max:z},stops:Z,lockMaxToTwiceMin:()=>this.isTeamTwoTimesMinEnabled,onChange:()=>this.refreshCriteria()}),this.updateStatusLabel(),this.updateFilterCount(),this.syncSearchTimer(),this.startGameInfoUpdates())}updateSleepState(){let e=D.isOnLobbyPage();this.sleeping=!e,this.sleeping?(this.panel.classList.add("hidden"),this.stopTimer(),this.stopGameInfoUpdates(),this.updateQueueCardPulses(new Set),this.hideUpcomingStrip()):(this.panel.classList.remove("hidden"),this.syncSearchTimer(),this.startGameInfoUpdates())}cleanup(){this.isDisposed=!0,this.stopTimer(),this.stopGameInfoUpdates(),this.pulseSyncTimeout&&(clearTimeout(this.pulseSyncTimeout),this.pulseSyncTimeout=null),this.activeMatchSources.clear(),this.applyQueueCardPulses(),this.upcomingStrip?.parentNode?.removeChild(this.upcomingStrip),this.upcomingStrip=null,this.lastUpcomingSlots=new Map,this.lastUpcomingMatchSources=new Set,this.upcomingSlotSignatures.clear(),this.panel.parentNode?.removeChild(this.panel)}};var G=class{constructor(){this.observer=null;this.animationFrameId=null}start(){this.observer||(this.observer=new MutationObserver(()=>this.scheduleApplyHighlights()),this.observer.observe(document.body,{attributes:!1,childList:!0,subtree:!0}),this.applyHighlights())}stop(){this.observer?.disconnect(),this.observer=null,this.animationFrameId!==null&&(cancelAnimationFrame(this.animationFrameId),this.animationFrameId=null)}scheduleApplyHighlights(){this.animationFrameId===null&&(this.animationFrameId=requestAnimationFrame(()=>{this.animationFrameId=null,this.applyHighlights()}))}applyHighlights(){for(let e of Array.from(document.querySelectorAll("lobby-player-view")))this.applyHighlightToView(e)}applyHighlightToView(e){this.clearHighlights(e);let t=Array.from(e.querySelectorAll(".player-tag.current-player"));if(t.length>0){t.forEach(a=>a.classList.add("of-current-player-boost"));return}let i=this.getNativeTeamRows(e);i.forEach(a=>a.classList.add("of-current-player-boost"));let o=this.getNativeTeamCards(e);o.forEach(a=>a.classList.add("of-current-player-team-boost")),!(i.length>0||o.length>0)&&this.applyFallbackHighlight(e)}clearHighlights(e){e.querySelectorAll(".of-current-player-boost").forEach(t=>{t.classList.remove("of-current-player-boost")}),e.querySelectorAll(".of-current-player-team-boost").forEach(t=>{t.classList.remove("of-current-player-team-boost")})}getNativeTeamRows(e){return Array.from(e.querySelectorAll("div")).filter(t=>{let i=t.classList;return i.contains("bg-sky-600/20")&&i.contains("border-sky-500/40")})}getNativeTeamCards(e){return Array.from(e.querySelectorAll("div")).filter(t=>{let i=t.classList;return i.contains("rounded-xl")&&i.contains("border-sky-500/60")})}applyFallbackHighlight(e){let t=e.currentClientID,i=Array.isArray(e.clients)?e.clients:[];if(!t||i.length===0)return;let o=i.findIndex(p=>p?.clientID===t);if(o<0)return;let a=i[o],s=this.formatDisplayName(a),r=Array.from(e.querySelectorAll(".player-tag"));if(r[o]){r[o].classList.add("of-current-player-boost");return}Array.from(e.querySelectorAll("[data-client-id]")).filter(p=>p.dataset.clientId===t).forEach(p=>p.classList.add("of-current-player-boost")),this.findRowsByDisplayName(e,s).forEach(p=>p.classList.add("of-current-player-boost"));let c=Array.from(e.querySelectorAll(".rounded-xl")),b=(Array.isArray(e.teamPreview)?e.teamPreview:[]).filter(p=>Array.isArray(p.players)&&p.players.length>0).findIndex(p=>Array.isArray(p.players)&&p.players.some(O=>O?.clientID===t));b>=0&&c[b]&&(c[b].classList.add("of-current-player-team-boost"),this.findRowsByDisplayName(c[b],s).forEach(O=>O.classList.add("of-current-player-boost")))}formatDisplayName(e){return e?.username?e.clanTag?`[${e.clanTag}] ${e.username}`:e.username:""}findRowsByDisplayName(e,t){if(!t)return[];let i=[];for(let o of Array.from(e.querySelectorAll("span, div"))){let a=o.textContent?.trim();if(!a||a!==t)continue;let s=o.closest("[data-client-id]")??o.closest(".player-tag")??o.closest(".team-player-row")??o.closest("div");s&&!i.includes(s)&&i.push(s)}return i}};(function(){"use strict";console.log("[OpenFront Game Notifier] Initializing adaptation for OpenFront 0.30..."),GM_addStyle(ee()),w.preloadSounds(),C.init(),q.start();let n=new _,e=new G;q.subscribe(o=>{n.receiveLobbyUpdate(o)}),e.start();let t=o=>{try{return new URL(o).searchParams.has("live")}catch{return!1}},i=t(location.href);C.subscribe(o=>{let a=t(o);!i&&a&&n.isSoundEnabled()&&w.playGameStartSound(),i=a}),console.log("[OpenFront Game Notifier] Ready! \u{1F680}")})();})();
