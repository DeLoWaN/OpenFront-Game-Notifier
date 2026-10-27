// ==UserScript==
// @name         OpenFront Game Notifier
// @namespace    https://openfront.io/
// @version      2.12.0
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

"use strict";(()=>{var f={bgPrimary:"#0d0f10",bgSecondary:"#14171a",bgElevated:"#1a1e22",bgRaised:"#20252a",bgHover:"rgba(255,255,255,0.04)",textPrimary:"#f2f1ee",textSecondary:"#c8c6c0",textMuted:"#8e8c85",textFaint:"#5a5853",border:"rgba(255,255,255,0.06)",borderSubtle:"rgba(255,255,255,0.10)",borderStrong:"rgba(255,255,255,0.16)",accent:"#7aa7d4",accentSoft:"rgba(122,167,212,0.14)",accentLine:"rgba(122,167,212,0.32)",accentShadow:"122,167,212",warning:"#d4a056",warningSoft:"rgba(212,160,86,0.14)",danger:"#d27a6b",dangerSoft:"rgba(210,122,107,0.14)",dangerLine:"rgba(210,122,107,0.30)",accentMuted:"rgba(122,167,212,0.14)",accentHover:"#9bbfe0",accentAlt:"#9bbfe0",borderAccent:"rgba(122,167,212,0.32)",highlight:"rgba(122,167,212,0.20)",success:"#74c69d",successSolid:"#74c69d",error:"#d27a6b"},h={body:"'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif",display:"'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif",mono:"'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace"};var C={sm:"6px",md:"7px",lg:"10px",xl:"14px"},R={sm:"0 1px 3px rgba(0,0,0,0.4)",md:"0 2px 8px rgba(0,0,0,0.3)",lg:"0 1px 0 rgba(255,255,255,0.04) inset, 0 24px 48px rgba(0,0,0,0.45), 0 2px 8px rgba(0,0,0,0.3)"},m={fast:"0.12s",normal:"0.2s",slow:"0.3s"};var O={lobbyDiscoverySettings:"OF_LOBBY_DISCOVERY_SETTINGS"},oe={panel:9998,panelOverlay:9999,modal:1e4,notification:2e4},se=[2,3,4,5,6,8,10,15,20,30,62],T=2,J=62;function re(){return`
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
      border-radius: ${C.xl};
      box-shadow: ${R.lg};
      font-family: ${h.body};
      color: var(--of-hud-text-1);
      user-select: none;
      z-index: ${oe.panel};
      display: flex;
      flex-direction: column;
      overflow: hidden;
      animation: ofPanelEnter ${m.slow} ease;
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
      font-family: ${h.mono};
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
      transition: background ${m.fast}, color ${m.fast};
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
      font-family: ${h.mono};
      font-size: 10px;
      letter-spacing: 0.16em;
      text-transform: uppercase;
      color: var(--of-hud-text-4);
      margin-bottom: 4px;
    }
    .ld-title {
      font-family: ${h.display};
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
      font-family: ${h.mono};
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
      transition: background ${m.fast}, color ${m.fast};
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
      transition: background ${m.fast}, border-color ${m.fast};
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
      transition: opacity ${m.normal};
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
      font-family: ${h.mono};
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
      transition: background ${m.fast}, color ${m.fast}, border-color ${m.fast};
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
      font-family: ${h.mono};
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
      box-shadow: ${R.sm};
      pointer-events: auto;
      cursor: grab;
    }
    .capacity-slider::-moz-range-thumb {
      width: 14px;
      height: 14px;
      border-radius: 50%;
      background: var(--of-hud-text-1);
      border: 1px solid rgba(0,0,0,0.4);
      box-shadow: ${R.sm};
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
      font-family: ${h.mono};
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
      font-family: ${h.mono};
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
      transition: background ${m.fast}, border-color ${m.fast};
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
      font-family: ${h.mono};
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
      border-radius: ${C.sm};
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
      font-family: ${h.mono};
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
      font-family: ${h.mono};
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
      transition: background ${m.fast}, color ${m.fast}, border-color ${m.fast};
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
      transition: background ${m.fast}, border-color ${m.fast};
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
    .ld-maps-toggle {
      appearance: none;
      width: 100%;
      background: transparent;
      border: 0;
      padding: 0;
      font: inherit;
      cursor: pointer;
      text-align: left;
    }
    .ld-maps-toggle[aria-expanded="false"] { margin-bottom: 0; }
    .ld-maps-toggle:hover .ld-section-label { color: var(--of-hud-text-1); }
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
      font-family: ${h.mono};
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
      transition: background ${m.fast}, color ${m.fast};
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
        box-shadow ${m.fast},
        filter ${m.fast},
        border-color ${m.fast};
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
      font-family: ${h.body};
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
      transition: background ${m.fast};
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
      transition: transform ${m.fast}, background ${m.fast};
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
      border-radius: ${C.xl};
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
      border-radius: ${C.xl};
      background: var(--of-hud-bg-1);
      color: #fff;
      text-transform: uppercase;
      text-align: left;
      overflow: hidden;
      cursor: pointer;
      padding: 0;
      transition: transform ${m.normal}, border-color ${m.fast};
    }
    .of-upcoming-card:hover {
      transform: scale(1.02);
      border-color: rgba(255, 255, 255, 0.5);
    }
    .of-upcoming-art {
      position: absolute;
      inset: 0;
      z-index: 0;
      border-radius: ${C.xl};
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
  `}var D={gameFoundAudio:null,gameStartAudio:null,audioUnlocked:!1,preloadSounds(){try{this.gameFoundAudio=new Audio("https://github.com/DeLoWaN/openfront-autojoin-lobby/raw/refs/heads/main/notification_sounds/new-notification-014-363678.mp3"),this.gameFoundAudio.volume=.5,this.gameFoundAudio.preload="auto",this.gameStartAudio=new Audio("https://github.com/DeLoWaN/openfront-autojoin-lobby/raw/refs/heads/main/notification_sounds/opening-bell-421471.mp3"),this.gameStartAudio.volume=.5,this.gameStartAudio.preload="auto",this.setupAudioUnlock()}catch(a){console.warn("[SoundUtils] Could not preload audio:",a)}},setupAudioUnlock(){let a=()=>{if(this.audioUnlocked)return;let e=[];this.gameFoundAudio&&(this.gameFoundAudio.volume=.01,e.push(this.gameFoundAudio.play().then(()=>{this.gameFoundAudio&&(this.gameFoundAudio.pause(),this.gameFoundAudio.currentTime=0,this.gameFoundAudio.volume=.5)}).catch(()=>{}))),this.gameStartAudio&&(this.gameStartAudio.volume=.01,e.push(this.gameStartAudio.play().then(()=>{this.gameStartAudio&&(this.gameStartAudio.pause(),this.gameStartAudio.currentTime=0,this.gameStartAudio.volume=.5)}).catch(()=>{}))),Promise.all(e).then(()=>{this.audioUnlocked=!0,console.log("[SoundUtils] Audio unlocked successfully"),document.removeEventListener("click",a),document.removeEventListener("keydown",a),document.removeEventListener("touchstart",a)})};document.addEventListener("click",a,{once:!0}),document.addEventListener("keydown",a,{once:!0}),document.addEventListener("touchstart",a,{once:!0})},playGameFoundSound(){this.gameFoundAudio?(console.log("[SoundUtils] Attempting to play game found sound"),this.gameFoundAudio.currentTime=0,this.gameFoundAudio.play().catch(a=>{console.warn("[SoundUtils] Failed to play game found sound:",a)})):console.warn("[SoundUtils] Game found audio not initialized")},playGameStartSound(){this.gameStartAudio?(console.log("[SoundUtils] Attempting to play game start sound"),this.gameStartAudio.currentTime=0,this.gameStartAudio.play().catch(a=>{console.warn("[SoundUtils] Failed to play game start sound:",a)})):console.warn("[SoundUtils] Game start audio not initialized")}};var P={callbacks:[],lastUrl:location.href,initialized:!1,init(){if(this.initialized)return;this.initialized=!0;let a=()=>{location.href!==this.lastUrl&&(this.lastUrl=location.href,this.notify())};window.addEventListener("popstate",a),window.addEventListener("hashchange",a);let e=history.pushState,t=history.replaceState;history.pushState=function(...i){e.apply(history,i),setTimeout(a,0)},history.replaceState=function(...i){t.apply(history,i),setTimeout(a,0)},setInterval(a,200)},subscribe(a){this.callbacks.push(a),this.init()},notify(){this.callbacks.forEach(a=>a(location.href))}};var Se=["ffa","team","special","hosted"],X={subscribers:[],lastLobbies:[],started:!1,publicLobbiesListener:null,start(){this.started||(this.started=!0,this.publicLobbiesListener=a=>this.handlePublicLobbiesUpdate(a),document.addEventListener("public-lobbies-update",this.publicLobbiesListener))},stop(){this.started&&(this.started=!1,this.publicLobbiesListener&&(document.removeEventListener("public-lobbies-update",this.publicLobbiesListener),this.publicLobbiesListener=null))},subscribe(a){this.subscribers.push(a),this.lastLobbies.length>0&&a(this.lastLobbies)},notifySubscribers(){this.subscribers.forEach(a=>a(this.lastLobbies))},handlePublicLobbiesUpdate(a){let e=a.detail?.payload;this.lastLobbies=this.extractLobbies(e),this.notifySubscribers()},extractLobbies(a){if(!a||typeof a!="object")return[];if(Array.isArray(a.lobbies))return a.lobbies;let e=a.games;return e?Se.flatMap(t=>(e[t]??[]).map(i=>({...i,publicGameType:i.publicGameType??t}))):[]}};var U={lastActionTime:0,debounceDelay:800,getLobbyButton(){return document.querySelector("public-lobby")?.querySelector("button.group.relative.isolate")},canJoinLobby(){let a=document.querySelector("public-lobby");if(!a)return!1;let e=this.getLobbyButton();return!!(e&&!a.isLobbyHighlighted&&a.lobbies&&a.lobbies.length>0&&!e.disabled&&e.offsetParent!==null)},verifyState(a){let e=document.querySelector("public-lobby");if(!e)return!1;let t=this.getLobbyButton();return!t||t.disabled||t.offsetParent===null?!1:a==="in"?e.isLobbyHighlighted===!0:a==="out"?!!(!e.isLobbyHighlighted&&e.lobbies&&e.lobbies.length>0):!1},tryJoinLobby(){let a=Date.now();if(a-this.lastActionTime<this.debounceDelay)return!1;let e=this.getLobbyButton(),t=document.querySelector("public-lobby");return e&&t&&!t.isLobbyHighlighted&&t.lobbies&&t.lobbies.length>0&&!e.disabled&&e.offsetParent!==null?(this.lastActionTime=a,e.click(),setTimeout(()=>{this.verifyState("in")||console.warn("[LobbyUtils] Join may have failed, state not updated")},100),!0):!1},isOnLobbyPage(){if(document.body.classList.contains("in-game"))return!1;let a=document.getElementById("page-game");if(a&&!a.classList.contains("hidden"))return!1;let e=document.querySelector("canvas");if(e&&e.offsetParent!==null){let o=e.getBoundingClientRect();if(o.width>100&&o.height>100)return!1}let t=document.querySelector("public-lobby");if(t&&t.offsetParent!==null)return!0;if(t&&t.offsetParent===null)return!1;let i=document.getElementById("page-play");if(i&&!i.classList.contains("hidden")&&t)return!0;let n=window.location.pathname.replace(/\/+$/,"")||"/";return n==="/"||n==="/public-lobby"}};var Z={isSupported(){return typeof Notification<"u"},isBackgrounded(){let a=document.visibilityState==="hidden"||document.hidden,e=typeof document.hasFocus=="function"?document.hasFocus():!0;return a||!e},async ensurePermission(){if(typeof Notification>"u")return!1;if(Notification.permission==="granted")return!0;if(Notification.permission==="denied")return!1;try{return await Notification.requestPermission()==="granted"}catch(a){return console.warn("[BrowserNotificationUtils] Permission request failed:",a),!1}},show(a){if(!this.isSupported()||!this.isBackgrounded())return!1;if(Notification.permission==="granted"){let e=new Notification(a.title,{body:a.body});return e.onclick=()=>{this.focusWindow(),a.onClick?.(),e.close()},!0}return!1},focusWindow(){window.focus()}};var le={world:"World",continental:"Continental",europe:"Europe",asia:"Asia",north_america:"North America",africa:"Africa",south_america:"South America",oceania:"Oceania",antarctica:"Antarctica",countries:"Countries",cosmic:"Cosmic",fictional:"Fictional",arcade:"Arcade",tournament:"Tournament",other:"Other"},de=["world","continental","europe","asia","north_america","africa","south_america","oceania","antarctica","countries","cosmic","fictional","arcade","tournament","other"],F=[{gameMap:"Achiran",name:"Achiran",categories:["europe","fictional"]},{gameMap:"Aegean",name:"Aegean",categories:["europe","asia"]},{gameMap:"Africa",name:"Africa",categories:["continental","africa"]},{gameMap:"Alps",name:"Alps",categories:["europe"]},{gameMap:"Amazon River",name:"Amazon River",categories:["south_america"]},{gameMap:"Antarctica",name:"Antarctica",categories:["continental","antarctica"]},{gameMap:"ArchipelagoSea",name:"Archipelago Sea",categories:["europe"]},{gameMap:"Arctic",name:"Arctic",categories:["europe","asia","north_america"]},{gameMap:"Asia",name:"Asia",categories:["continental","asia"]},{gameMap:"Australia",name:"Australia",categories:["oceania"]},{gameMap:"Bab el-Mandeb Strait",name:"Bab el-Mandeb Strait",categories:["asia","africa"]},{gameMap:"Baikal",name:"Baikal",categories:["asia"]},{gameMap:"Baikal Nuke Wars",name:"Baikal (Nuke Wars)",categories:["fictional"]},{gameMap:"Baja California",name:"Baja California",categories:["north_america"]},{gameMap:"Balkans",name:"Balkans",categories:["europe"]},{gameMap:"Balkhash",name:"Balkhash",categories:["asia"]},{gameMap:"Baltics",name:"Baltics",categories:["europe"]},{gameMap:"Benelux",name:"Benelux",categories:["europe","countries"]},{gameMap:"Bering Sea",name:"Bering Sea",categories:["asia","north_america"]},{gameMap:"Bering Strait",name:"Bering Strait",categories:["asia","north_america"]},{gameMap:"Between Two Seas",name:"Between Two Seas",categories:["europe","asia"]},{gameMap:"Black Sea",name:"Black Sea",categories:["europe","asia"]},{gameMap:"Bosphorus Straits",name:"Bosphorus Straits",categories:["europe","asia"]},{gameMap:"Brain Rot",name:"Brain Rot",categories:["arcade"]},{gameMap:"Branching Paths",name:"Branching Paths",categories:["arcade"]},{gameMap:"Britannia",name:"Britannia",categories:["europe"]},{gameMap:"Britannia Classic",name:"Britannia (Classic)",categories:["europe"]},{gameMap:"Canary Islands",name:"Canary Islands",categories:["africa"]},{gameMap:"Cape Cod",name:"Cape Cod",categories:["north_america"]},{gameMap:"Cape Of Good Hope",name:"Cape Of Good Hope",categories:["africa"]},{gameMap:"Caribbean",name:"Caribbean",categories:["north_america"]},{gameMap:"Caspian Sea",name:"Caspian Sea",categories:["asia"]},{gameMap:"Caucasus",name:"Caucasus",categories:["europe","asia"]},{gameMap:"Central America",name:"Central America",categories:["north_america"]},{gameMap:"Channel Islands",name:"Channel Islands",categories:["north_america"]},{gameMap:"China",name:"China",categories:["asia","countries"]},{gameMap:"Chopping Block",name:"Chopping Block",categories:["arcade"]},{gameMap:"Clearwater Lakes",name:"Clearwater Lakes",categories:["north_america"]},{gameMap:"Conakry",name:"Conakry",categories:["africa"]},{gameMap:"Crimea",name:"Crimea",categories:["europe"]},{gameMap:"Danish Straits",name:"Danish Straits",categories:["europe"]},{gameMap:"Deglaciated Antarctica",name:"Deglaciated Antarctica",categories:["antarctica","fictional"]},{gameMap:"Didier",name:"Didier",categories:["arcade"]},{gameMap:"Didier France",name:"Didier (France)",categories:["arcade"]},{gameMap:"Dyslexdria",name:"Dyslexdria",categories:["world","fictional"]},{gameMap:"East Asia",name:"East Asia",categories:["asia"]},{gameMap:"Europe",name:"Europe",categories:["continental","europe"]},{gameMap:"Europe Classic",name:"Europe (Classic)",categories:["continental","europe"]},{gameMap:"Falkland Islands",name:"Falkland Islands",categories:["south_america"]},{gameMap:"Faroe Islands",name:"Faroe Islands",categories:["europe"]},{gameMap:"Finger Lakes",name:"Finger Lakes",categories:["north_america"]},{gameMap:"Four Islands",name:"Four Islands",categories:["fictional"]},{gameMap:"France",name:"France",categories:["europe","countries"]},{gameMap:"Gateway to the Atlantic",name:"Gateway to the Atlantic",categories:["europe"]},{gameMap:"Germany",name:"Germany",categories:["europe","countries"]},{gameMap:"Giant World Map",name:"Giant World Map",categories:["world"]},{gameMap:"Great Lakes",name:"Great Lakes",categories:["north_america"]},{gameMap:"Gulf Of Guinea",name:"Gulf Of Guinea",categories:["africa"]},{gameMap:"Gulf Of Mexico",name:"Gulf Of Mexico",categories:["north_america"]},{gameMap:"Gulf of St. Lawrence",name:"Gulf of St. Lawrence",categories:["north_america"]},{gameMap:"Halkidiki",name:"Halkidiki",categories:["europe"]},{gameMap:"Hawaii",name:"Hawaii",categories:["oceania"]},{gameMap:"Hecate Strait",name:"Hecate Strait",categories:["north_america"]},{gameMap:"Hong Kong",name:"Hong Kong",categories:["asia"]},{gameMap:"Horn Of Africa",name:"Horn Of Africa",categories:["africa"]},{gameMap:"Iceland",name:"Iceland",categories:["europe"]},{gameMap:"Indian Subcontinent",name:"Indian Subcontinent",categories:["asia"]},{gameMap:"Irish Sea",name:"Irish Sea",categories:["europe"]},{gameMap:"Italia",name:"Italia",categories:["europe"]},{gameMap:"Japan",name:"Japan",categories:["asia","countries"]},{gameMap:"Juan De Fuca Strait",name:"Juan De Fuca Strait",categories:["north_america"]},{gameMap:"Korea",name:"Korea",categories:["asia","countries"]},{gameMap:"Labyrinth",name:"Labyrinth",categories:["arcade"]},{gameMap:"Las Vegas Strip",name:"Las Vegas Strip",categories:["north_america"]},{gameMap:"Lemnos",name:"Lemnos",categories:["europe"]},{gameMap:"Levant",name:"Levant",categories:["asia"]},{gameMap:"Lisbon",name:"Lisbon",categories:["europe"]},{gameMap:"Los Angeles",name:"Los Angeles",categories:["north_america"]},{gameMap:"Luna",name:"Luna",categories:["cosmic"]},{gameMap:"Madagascar",name:"Madagascar",categories:["africa"]},{gameMap:"Manicouagan",name:"Manicouagan",categories:["north_america"]},{gameMap:"Mare Nostrum",name:"Mare Nostrum",categories:["europe","asia","africa"]},{gameMap:"Mars",name:"Mars",categories:["cosmic"]},{gameMap:"Mena",name:"MENA",categories:["asia","africa"]},{gameMap:"Middle East",name:"Middle East",categories:["asia"]},{gameMap:"MilkyWay",name:"Milky Way",categories:["cosmic"]},{gameMap:"Mississippi River",name:"Mississippi River",categories:["north_america"]},{gameMap:"Montreal",name:"Montreal",categories:["north_america"]},{gameMap:"More Than Luck",name:"More Than Luck",categories:["arcade"]},{gameMap:"New York City",name:"New York City",categories:["north_america"]},{gameMap:"New Zealand",name:"New Zealand",categories:["oceania"]},{gameMap:"Nile Delta",name:"Nile Delta",categories:["africa"]},{gameMap:"North America",name:"North America",categories:["continental","north_america"]},{gameMap:"Northwest Passage",name:"Northwest Passage",categories:["north_america"]},{gameMap:"Oceania",name:"Oceania",categories:["continental","oceania"]},{gameMap:"Ommatrypta",name:"Ommatrypta",categories:["arcade"]},{gameMap:"Onion",name:"Onion",categories:["arcade"]},{gameMap:"Pangaea",name:"Pangaea",categories:["fictional"]},{gameMap:"Passage",name:"Passage",categories:["fictional"]},{gameMap:"Pluto",name:"Pluto",categories:["cosmic"]},{gameMap:"Pulicat Lake",name:"Pulicat Lake",categories:["asia"]},{gameMap:"Qing China",name:"Qing China",categories:["asia","countries"]},{gameMap:"Rio de Janeiro",name:"Rio de Janeiro",categories:["south_america"]},{gameMap:"Russia",name:"Russia",categories:["europe","asia","countries"]},{gameMap:"San Francisco",name:"San Francisco",categories:["north_america"]},{gameMap:"Scandinavia",name:"Scandinavia",categories:["europe"]},{gameMap:"Sierpinski",name:"Sierpinski",categories:["arcade"]},{gameMap:"Sol",name:"Sol",categories:["cosmic"]},{gameMap:"South America",name:"South America",categories:["continental","south_america"]},{gameMap:"SoutheastAsia",name:"Southeast Asia",categories:["asia"]},{gameMap:"Strait of Gibraltar",name:"Strait of Gibraltar",categories:["europe","africa"]},{gameMap:"Strait of Hormuz",name:"Strait of Hormuz",categories:["asia"]},{gameMap:"Strait Of Malacca",name:"Strait Of Malacca",categories:["asia"]},{gameMap:"Surrounded",name:"Surrounded",categories:["fictional"]},{gameMap:"Svalmel",name:"Svalmel",categories:["europe","north_america","fictional"]},{gameMap:"Taiwan Strait",name:"Taiwan Strait",categories:["asia"]},{gameMap:"The Box",name:"The Box",categories:["arcade"]},{gameMap:"Tierra Del Fuego",name:"Tierra Del Fuego",categories:["south_america"]},{gameMap:"Titan",name:"Titan",categories:["cosmic"]},{gameMap:"Tourney 2 Teams",name:"Tourney 2 Teams",categories:["tournament"]},{gameMap:"Tourney 3 Teams",name:"Tourney 3 Teams",categories:["tournament"]},{gameMap:"Tourney 4 Teams",name:"Tourney 4 Teams",categories:["tournament"]},{gameMap:"Tourney 8 Teams",name:"Tourney 8 Teams",categories:["tournament"]},{gameMap:"Traders Dream",name:"Traders Dream",categories:["fictional"]},{gameMap:"Two Lakes",name:"Two Lakes",categories:["europe"]},{gameMap:"United States",name:"United States",categories:["north_america","countries"]},{gameMap:"Vancouver Island",name:"Vancouver Island",categories:["north_america"]},{gameMap:"Venice",name:"Venice",categories:["europe"]},{gameMap:"Vietnam",name:"Vietnam",categories:["asia","countries"]},{gameMap:"Warship Warship",name:"Warship Warship",categories:["arcade"]},{gameMap:"World",name:"World",categories:["world"]},{gameMap:"World Inverted",name:"World Inverted",categories:["world","fictional"]},{gameMap:"Yangtze River",name:"Yangtze River",categories:["asia"]},{gameMap:"Yellow Sea",name:"Yellow Sea",categories:["asia"]},{gameMap:"Yenisei",name:"Yenisei",categories:["asia"]}];var Le="any";function me(a){if(!a)return null;let e=a.toLowerCase().trim();return e==="free for all"||e==="ffa"||e==="free-for-all"?"FFA":e==="team"||e==="teams"?"Team":null}var Ce=new Map(F.map(a=>[a.gameMap,a.name]));function pe(a){return Ce.get(a)??a}function S(a){return me(a.gameConfig?.gameMode)}function G(a){let e=a.publicGameType?.toLowerCase().trim();return e==="ffa"||e==="team"||e==="special"||e==="hosted"?e:null}function ee(a){if(a==="Duos"||a==="Trios"||a==="Quads"||a==="Humans Vs Nations"||a==="8+"||typeof a=="number"&&Number.isFinite(a)&&a>0)return a;if(typeof a=="string"){let e=parseInt(a,10);if(!Number.isNaN(e)&&e>0)return e}return null}function k(a){let e=a.gameConfig;if(!e||S(a)!=="Team")return null;let t=ee(e.playerTeams??null);return t!==null?t:ee(e.teamCount??e.teams??null)}function E(a){let e=a.gameConfig;return e?e.maxPlayers??e.maxClients??e.maxPlayersPerGame??a.maxClients??null:null}function V(a,e){return!a||!e?null:a==="Duos"?2:a==="Trios"?3:a==="Quads"?4:a==="Humans Vs Nations"?e:typeof a=="number"&&a>0?Math.floor(e/a):null}function te(a){return G(a)==="hosted"||a.custom===!0}var Te=["Atom Bomb","Hydrogen Bomb","MIRV"];function ke(a,e){let t=a.gameConfig,i=t?.disabledUnits??[];switch(e){case"isCompact":return t?.gameMapSize==="Compact";case"isRandomSpawn":return t?.randomSpawn===!0;case"isAlliancesDisabled":return t?.disableAlliances===!0;case"isNukesDisabled":return Te.every(n=>i.includes(n));case"isSAMsDisabled":return i.includes("SAM Launcher");case"isWaterNukes":return t?.waterNukes===!0;case"isDoomsdayClock":return t?.doomsdayClock!==void 0&&t.doomsdayClock.enabled!==!1;case"isTrusted":return t?.trusted;case"startingGold":return t?.startingGold??void 0;case"goldMultiplier":return t?.goldMultiplier??void 0;default:return}}function M(a,e){if(te(a))return ke(a,e);let t=a.gameConfig?.publicGameModifiers;switch(e){case"isCompact":return t?.isCompact;case"isRandomSpawn":return t?.isRandomSpawn;case"isCrowded":return t?.isCrowded;case"isHardNations":return t?.isHardNations;case"isAlliancesDisabled":return t?.isAlliancesDisabled;case"isNukesDisabled":return t?.isNukesDisabled;case"isSAMsDisabled":return t?.isSAMsDisabled;case"isPeaceTime":return t?.isPeaceTime;case"isWaterNukes":return t?.isWaterNukes;case"isDoomsdayClock":return t?.isDoomsdayClock;case"isTrusted":return a.gameConfig?.trusted;case"startingGold":return t?.startingGold??a.gameConfig?.startingGold??void 0;case"goldMultiplier":return t?.goldMultiplier??a.gameConfig?.goldMultiplier??void 0;default:return}}function ge(a){let e=S(a),t=k(a),i=E(a);if(e==="FFA")return i!==null?`FFA \u2022 ${i} slots`:"FFA";if(e!=="Team")return"Unsupported mode";if(t==="Humans Vs Nations")return i!==null?`Humans Vs Nations (${i})`:"Humans Vs Nations";if(t==="Duos")return"Duos";if(t==="Trios")return"Trios";if(t==="Quads")return"Quads";if(typeof t=="number"&&i!==null){let n=V(t,i);return n!==null?`${t} teams (${n} per team)`:`${t} teams`}return"Team"}function Ee(a){let e=S(a),t=k(a);return e==="FFA"?"FFA":e!=="Team"?"Unsupported mode":t==="Humans Vs Nations"?"Humans Vs Nations":t==="Duos"||t==="Trios"||t==="Quads"?t:typeof t=="number"?`${t} teams`:"Team"}function we(a){return a>=1e6&&a%1e6===0?`${a/1e6}M`:a>=1e3&&a%1e3===0?`${a/1e3}K`:String(a)}function fe(a){let e=o=>!!M(a,o),t=[];e("isCompact")&&t.push("Compact"),e("isRandomSpawn")&&t.push("Random"),e("isCrowded")&&t.push("Crowded"),e("isHardNations")&&t.push("Hard");let i=M(a,"startingGold");typeof i=="number"&&t.push(we(i));let n=M(a,"goldMultiplier");return typeof n=="number"&&t.push(`x${n}`),e("isAlliancesDisabled")&&t.push("No Alliances"),e("isNukesDisabled")&&t.push("No Nukes"),e("isSAMsDisabled")&&t.push("No SAMs"),e("isPeaceTime")&&t.push("Peace"),e("isWaterNukes")&&t.push("Water Nukes"),e("isDoomsdayClock")&&t.push("Doomsday"),e("isTrusted")&&t.push("Trusted"),t}function he(a){let e=[],t=a.gameConfig?.gameMap?.trim(),i=E(a),n=k(a),o=Ee(a);if(t&&e.push(pe(t)),S(a)==="Team"&&n!=="Humans Vs Nations"){e.push(o);let d=V(n,i);d!==null&&e.push(`${d}/team`)}else e.push(o);let s=G(a);s==="hosted"?e.push("Hosted"):a.custom===!0?e.push("Custom"):s==="special"&&e.push("Special");let r=[];i!==null&&r.push(`${i} slots`);let l=fe(a);return l.length>0&&r.push(l.join(", ")),{title:e.join(" \u2022 "),body:r.join(" \u2022 ")}}function ce(a){return typeof a=="number"&&Number.isFinite(a)?a:null}function y(a){return a==="blocked"||a==="rejected"?"blocked":a==="required"?"required":a==="any"||a==="allowed"||a==="indifferent"?"any":Le}function ue(a){if(!a||typeof a!="object")return;let e={};for(let[t,i]of Object.entries(a)){let n=Number(t);Number.isFinite(n)&&(e[n]=y(i))}return Object.keys(e).length>0?e:void 0}function Ae(a){if(!a||typeof a!="object")return;let e=a;return{isCompact:y(e.isCompact),isRandomSpawn:y(e.isRandomSpawn),isCrowded:y(e.isCrowded),isHardNations:y(e.isHardNations),isAlliancesDisabled:y(e.isAlliancesDisabled),isNukesDisabled:y(e.isNukesDisabled),isSAMsDisabled:y(e.isSAMsDisabled),isPeaceTime:y(e.isPeaceTime),isWaterNukes:y(e.isWaterNukes),isDoomsdayClock:y(e.isDoomsdayClock),isTrusted:y(e.isTrusted),startingGold:ue(e.startingGold),goldMultiplier:ue(e.goldMultiplier)}}function Ie(a){let e=ee(a);return e==="Duos"||e==="Trios"||e==="Quads"?null:e}function Ne(a){if(!Array.isArray(a))return[];let e=[];for(let t of a){let i=t,n=me(i.gameMode??null);if(!n)continue;let o=ce(i.minPlayers),s=ce(i.maxPlayers);n==="Team"&&(typeof o=="number"&&o<T&&(o=T),typeof o=="number"&&typeof s=="number"&&s<o&&(s=o)),e.push({gameMode:n,teamCount:n==="Team"?Ie(i.teamCount??null):null,minPlayers:o,maxPlayers:s,modifiers:Ae(i.modifiers)})}return e}function ie(a,e=Date.now()){let t=Math.max(0,Math.floor((e-a)/1e3));return`${Math.floor(t/60)}m ${t%60}s`}function He(a){let e=S(a);if(e==="FFA")return"Free For All";if(e!=="Team")return"Unsupported mode";let t=k(a),i=E(a);if(t==="Humans Vs Nations")return i!==null?`${i} Humans vs ${i} Nations`:"Humans vs Nations";let n=null;t==="Duos"?n=2:t==="Trios"?n=3:t==="Quads"&&(n=4);let o=null;return n!==null?o=i!==null?Math.floor(i/n):null:typeof t=="number"&&(o=t,n=i!==null&&t>0?Math.floor(i/t):null),o===null?"Teams":n!==null?`${o} teams of ${n}`:`${o} teams`}function De(a,e,t){let i=a.gameConfig?.gameMap?.trim();if(!i)return null;let n=i.toLowerCase().replace(/[\s.()]+/g,"");if(!n)return null;let o=`maps/${encodeURIComponent(n)}/thumbnail.webp`,s=e?.[`maps/${n}/thumbnail.webp`];if(s){let r=(t??"").replace(/\/+$/,"");return r?`${r}${s}`:s}return`/${o}`}function be(a,e,t){let i=E(a);return{gameID:a.gameID,mapName:pe(a.gameConfig?.gameMap?.trim()||"Unknown map"),modeText:He(a),capacityLabel:i!==null?`${i} slots`:"",modifierLabels:fe(a),thumbnailUrl:De(a,e,t)}}function Pe(a){if(!a||typeof a!="object"||Array.isArray(a))return{};let e={};for(let[t,i]of Object.entries(a))t&&(i==="required"||i==="blocked")&&(e[t]=i);return e}function ye(a){return{criteria:Ne(a?.criteria),discoveryEnabled:typeof a?.discoveryEnabled=="boolean"?a.discoveryEnabled:!0,soundEnabled:typeof a?.soundEnabled=="boolean"?a.soundEnabled:!0,desktopNotificationsEnabled:typeof a?.desktopNotificationsEnabled=="boolean"?a.desktopNotificationsEnabled:!1,isTeamTwoTimesMinEnabled:typeof a?.isTeamTwoTimesMinEnabled=="boolean"?a.isTeamTwoTimesMinEnabled:!!a?.isTeamThreeTimesMinEnabled,notifyUpcomingEnabled:typeof a?.notifyUpcomingEnabled=="boolean"?a.notifyUpcomingEnabled:!0,includeHostedAndCustomLobbies:typeof a?.includeHostedAndCustomLobbies=="boolean"?a.includeHostedAndCustomLobbies:!0,mapFilter:Pe(a?.mapFilter)}}var Fe=["isCompact","isRandomSpawn","isCrowded","isHardNations","isAlliancesDisabled","isNukesDisabled","isSAMsDisabled","isPeaceTime","isWaterNukes","isDoomsdayClock","isTrusted"],q=class{matchesCriteria(e,t,i={}){if(!e||!e.gameConfig||!t||t.length===0||!this.matchesMapFilter(e.gameConfig.gameMap,i))return!1;let n=S(e),o=E(e);if(!n||o===null)return!1;let s=k(e),r=n==="Team"?V(s,o):null,l=this.resolveLobbyTeamCount(s,r,o);for(let d of t){if(d.gameMode!==n)continue;if(n==="Team"){if(d.teamCount!==null&&d.teamCount!==void 0){if(d.teamCount==="8+"){if(l===null||l<8)continue}else if(d.teamCount==="Humans Vs Nations"||d.teamCount==="Duos"||d.teamCount==="Trios"||d.teamCount==="Quads"){if(d.teamCount!==s)continue}else if(l===null||d.teamCount!==l)continue}if(r===null)continue}let c=n==="Team"?r:o;if(c!==null&&!(s!=="Humans Vs Nations"&&(d.minPlayers!==null&&c<d.minPlayers||d.maxPlayers!==null&&c>d.maxPlayers))&&this.matchesModifiers(e,d.modifiers))return!0}return!1}resolveLobbyTeamCount(e,t,i){return typeof e=="number"?e:e==="Humans Vs Nations"?null:t!==null&&t>0&&i!==null?Math.floor(i/t):null}matchesMapFilter(e,t){return e!==void 0&&t[e]==="blocked"?!1:Object.values(t).some(n=>n==="required")?e!==void 0&&t[e]==="required":!0}matchesModifiers(e,t){if(!t)return!0;for(let i of Fe){let n=t[i];if(!n||n==="any")continue;let o=!!M(e,i);if(n==="blocked"&&o||n==="required"&&!o)return!1}return!(!this.matchesNumericModifier(M(e,"startingGold"),t.startingGold)||!this.matchesNumericModifier(M(e,"goldMultiplier"),t.goldMultiplier))}matchesNumericModifier(e,t){if(!t)return!0;let i=typeof e=="number"&&Number.isFinite(e)?e:null,n=Object.entries(t);if(n.length===0)return!0;let o=n.filter(([,r])=>r==="blocked").map(([r])=>Number(r));if(i!==null&&o.includes(i))return!1;let s=n.filter(([,r])=>r==="required").map(([r])=>Number(r));return!(s.length>0&&(i===null||!s.includes(i)))}};function x(a,e){if(e.length===0)return a;let t=e[0],i=e[e.length-1];return a<t?t:a>i?i:a}function w(a,e){if(e.length<2)return 0;let t=x(a,e),i=e.length-1;if(t>=e[i])return 1;if(t<=e[0])return 0;for(let n=0;n<i;n++){let o=e[n],s=e[n+1];if(t>=o&&t<=s){let r=(t-o)/(s-o);return(n+r)/i}}return 1}function ae(a,e){if(e.length<2)return e[0]??0;let t=e.length-1;if(a<=0)return e[0];if(a>=1)return e[t];let i=a*t,n=Math.floor(i),o=i-n,s=e[n]+o*(e[n+1]-e[n]);return Math.round(s)}var A=1e3,B=class{constructor(e){this.onMinSliderInput=()=>{let e=parseInt(this.minSlider.value,10)/A,t=ae(e,this.stops);this.applyValues(t,this.lastMax,{fireOnChange:!0,changed:"min"})};this.onMaxSliderInput=()=>{let e=parseInt(this.maxSlider.value,10)/A,t=ae(e,this.stops);this.applyValues(this.lastMin,t,{fireOnChange:!0,changed:"max"})};this.onMinInputChange=()=>{let e=parseInt(this.minInput.value,10);if(!Number.isFinite(e)){this.applyValues(this.lastMin,this.lastMax,{fireOnChange:!1,changed:"both"});return}let t=x(e,[this.cfg.bounds.min,this.cfg.bounds.max]);this.applyValues(t,this.lastMax,{fireOnChange:!0,changed:"min"})};this.onMaxInputChange=()=>{let e=parseInt(this.maxInput.value,10);if(!Number.isFinite(e)){this.applyValues(this.lastMin,this.lastMax,{fireOnChange:!1,changed:"both"});return}let t=x(e,[this.cfg.bounds.min,this.cfg.bounds.max]);this.applyValues(this.lastMin,t,{fireOnChange:!0,changed:"max"})};if(this.cfg=e,this.stops=e.stops??[e.bounds.min,e.bounds.max],this.minSlider=document.getElementById(e.minSliderId),this.maxSlider=document.getElementById(e.maxSliderId),this.minInput=document.getElementById(e.minInputId),this.maxInput=document.getElementById(e.maxInputId),this.rangeRoot=document.getElementById(e.rangeRootId),this.container=document.getElementById(e.containerId),!this.minSlider||!this.maxSlider||!this.minInput||!this.maxInput)throw new Error(`RangeSlider: missing required element in ${e.rangeRootId}`);this.minSlider.min="0",this.minSlider.max=String(A),this.maxSlider.min="0",this.maxSlider.max=String(A),this.lastMin=this.readInputClamped(this.minInput,e.bounds.min),this.lastMax=this.readInputClamped(this.maxInput,e.bounds.max),this.lastMax<this.lastMin&&(this.lastMax=this.lastMin),this.minSlider.addEventListener("input",this.onMinSliderInput),this.maxSlider.addEventListener("input",this.onMaxSliderInput),this.minInput.addEventListener("change",this.onMinInputChange),this.maxInput.addEventListener("change",this.onMaxInputChange),this.applyValues(this.lastMin,this.lastMax,{fireOnChange:!1,changed:"both"}),this.renderTicks(),this.wireSteppers(),this.applyLockState()}applyLockState(){let e=!!this.cfg.lockMaxToTwiceMin?.();this.maxSlider.disabled=e,this.maxSlider.classList.toggle("is-max-locked",e),this.maxInput.disabled=e,this.container&&this.container.querySelectorAll('.ld-step-btn[data-target="max"]').forEach(t=>{t.disabled=e}),e&&this.applyValues(this.lastMin,this.lastMax,{fireOnChange:!1,changed:"min"})}setMin(e){this.applyValues(e,this.lastMax,{fireOnChange:!0,changed:"min"})}setRange(e,t){this.applyValues(e,t,{fireOnChange:!1,changed:"both"})}readInputClamped(e,t){let i=parseInt(e.value,10);return Number.isFinite(i)?x(i,[this.cfg.bounds.min,this.cfg.bounds.max]):t}applyValues(e,t,i){let n=e,o=t;if(this.cfg.lockMaxToTwiceMin?.()&&(o=x(n*2,[this.cfg.bounds.min,this.cfg.bounds.max])),n>o){let s=i.changed??"both";s==="min"?o=n:s==="max"?n=o:(n=Math.min(e,t),o=Math.max(e,t))}if(this.lastMin=n,this.lastMax=o,this.minInput.value=String(n),this.maxInput.value=String(o),this.minSlider.value=String(Math.round(w(n,this.stops)*A)),this.maxSlider.value=String(Math.round(w(o,this.stops)*A)),this.rangeRoot){let s=w(n,this.stops)*100,r=w(o,this.stops)*100;this.rangeRoot.style.setProperty("--lo",`${s}%`),this.rangeRoot.style.setProperty("--hi",`${r}%`)}i.fireOnChange&&this.cfg.onChange(n,o)}renderTicks(){if(!this.cfg.ticksContainerId||!this.cfg.stops)return;let e=document.getElementById(this.cfg.ticksContainerId);if(e){e.innerHTML="";for(let t of this.cfg.stops){let i=w(t,this.cfg.stops)*100,n=document.createElement("div");n.className="ld-tick",n.style.left=`${i}%`;let o=document.createElement("span");o.className="ld-tick-label",o.style.left=`${i}%`,o.textContent=String(t),e.appendChild(n),e.appendChild(o)}}}wireSteppers(){if(!this.container)return;this.container.querySelectorAll(".ld-step-btn").forEach(t=>{let i=t.dataset.target,n=t.dataset.action;!i||!n||t.addEventListener("click",()=>{let o=n==="inc"?1:-1;if(i==="min"){let s=x(this.lastMin+o,[this.cfg.bounds.min,this.cfg.bounds.max]);this.applyValues(s,this.lastMax,{fireOnChange:!0,changed:"min"})}else{let s=x(this.lastMax+o,[this.cfg.bounds.min,this.cfg.bounds.max]);this.applyValues(this.lastMin,s,{fireOnChange:!0,changed:"max"})}})})}};var z=[1e6,5e6,25e6],W=[2],ne=["modifier-isCompact","modifier-isRandomSpawn","modifier-isCrowded","modifier-isHardNations","modifier-isAlliancesDisabled","modifier-isNukesDisabled","modifier-isSAMsDisabled","modifier-isPeaceTime","modifier-isWaterNukes","modifier-isDoomsdayClock","modifier-isTrusted"],Be=[["discovery-team-hvn","Humans Vs Nations",null]],$e=[["discovery-team-2","2"],["discovery-team-3","3"],["discovery-team-4","4"],["discovery-team-5","5"],["discovery-team-6","6"],["discovery-team-7","7"],["discovery-team-8plus","8+"]],Q=[...Be.map(([a])=>a),...$e.map(([a])=>a)];function _e(){try{if(typeof unsafeWindow<"u"&&unsafeWindow.__OF_DEBUG_DISCOVERY===!0)return!0}catch{}if(globalThis.__OF_DEBUG_DISCOVERY===!0)return!0;try{if(typeof localStorage<"u"&&localStorage.getItem("__OF_DEBUG_DISCOVERY")==="true")return!0}catch{}return!1}var $="page-detailed-view",Re="of-discovery-see-all-match";function ve(){try{if(typeof unsafeWindow<"u")return unsafeWindow}catch{}return window}function xe(a){return a==="any"?"required":a==="required"?"blocked":"any"}function L(a){return a.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}var Me=["ffa","special","team"],Oe='<svg viewBox="0 0 20 20" fill="currentColor"><path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z"/></svg>',j='<svg viewBox="0 0 24 24"><path d="M5 12l5 5L20 7"/></svg>',Ue='<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>',Ge='<svg viewBox="0 0 24 24"><path d="M11 5L6 9H2v6h4l5 4V5z"/><path d="M15.5 8.5a5 5 0 010 7"/><path d="M19 5a9 9 0 010 14"/></svg>',Ve='<svg viewBox="0 0 24 24"><path d="M6 8a6 6 0 1112 0c0 7 3 9 3 9H3s3-2 3-9z"/><path d="M10.3 21a1.94 1.94 0 003.4 0"/></svg>',Y=class{constructor(){this.discoveryEnabled=!0;this.criteriaList=[];this.searchStartTime=null;this.lastMatchTime=null;this.soundEnabled=!0;this.desktopNotificationsEnabled=!1;this.notifyUpcomingEnabled=!0;this.includeHostedAndCustomLobbies=!0;this.mapFilter={};this.knownMaps=new Set(F.map(e=>e.gameMap));this.desktopNotificationRequestId=0;this.activeMatchSources=new Set;this.seeAllPulseActive=!1;this.seeAllMatchIds=new Set;this.seeAllObserver=null;this.observedSeeAllView=null;this.seenLobbies=new Set;this.desktopNotifiedLobbies=new Set;this.isTeamTwoTimesMinEnabled=!1;this.ffaSlider=null;this.teamSlider=null;this.sleeping=!1;this.isDisposed=!1;this.lastLobbies=[];this.upcomingStrip=null;this.lastUpcomingSlots=new Map;this.lastUpcomingMatchSources=new Set;this.upcomingSlotSignatures=new Map;this.timerInterval=null;this.gameInfoInterval=null;this.pulseSyncTimeout=null;this.engine=new q,this.loadSettings(),this.createUI(),this.updateSleepState(),P.subscribe(()=>this.updateSleepState())}receiveLobbyUpdate(e){this.lastLobbies=e,this.processLobbies(e)}isSoundEnabled(){return this.soundEnabled}loadSettings(){let e=GM_getValue(O.lobbyDiscoverySettings,null),t=ye(e);GM_setValue(O.lobbyDiscoverySettings,t),this.criteriaList=t.criteria,this.soundEnabled=t.soundEnabled,this.desktopNotificationsEnabled=t.desktopNotificationsEnabled,this.discoveryEnabled=t.discoveryEnabled,this.isTeamTwoTimesMinEnabled=t.isTeamTwoTimesMinEnabled,this.notifyUpcomingEnabled=t.notifyUpcomingEnabled??!0,this.includeHostedAndCustomLobbies=t.includeHostedAndCustomLobbies??!0,this.mapFilter=t.mapFilter??{}}saveSettings(){GM_setValue(O.lobbyDiscoverySettings,{criteria:this.criteriaList,discoveryEnabled:this.discoveryEnabled,soundEnabled:this.soundEnabled,desktopNotificationsEnabled:this.desktopNotificationsEnabled,isTeamTwoTimesMinEnabled:this.isTeamTwoTimesMinEnabled,notifyUpcomingEnabled:this.notifyUpcomingEnabled,includeHostedAndCustomLobbies:this.includeHostedAndCustomLobbies,mapFilter:this.mapFilter})}updateStatusText(){let e=document.getElementById("discovery-search-timer");if(e){if(!this.discoveryEnabled||this.criteriaList.length===0||!this.isDiscoveryFeedbackAllowed()){e.textContent="",e.style.display="none";return}e.style.display="inline",this.lastMatchTime!==null?e.textContent=`last match ${ie(this.lastMatchTime)}`:this.searchStartTime!==null?e.textContent=`searching \xB7 ${ie(this.searchStartTime)}`:e.textContent="awaiting filters"}}updateCurrentGameInfo(){let e=document.getElementById("discovery-current-game-info");if(!e||!U.isOnLobbyPage()){e&&(e.style.display="none");return}let t=document.querySelector("public-lobby");if(!t||!Array.isArray(t.lobbies)||t.lobbies.length===0){e.style.display="none";return}let i=t.lobbies[0];if(!i||!i.gameConfig){e.style.display="none";return}e.style.display="block",e.textContent=`Current game: ${ge(i)}`}parseQueues(e){let t=new Map;for(let i of e){let n=G(i);if(!n)continue;let o=t.get(n)??[];o.push(i),t.set(n,o)}return t}toUpNextSlots(e){let t=new Map;for(let i of Me){let n=e.get(i);n?.length&&t.set(i,{live:n[0],upcoming:n[1]})}return t}processLobbies(e){try{this.updateCurrentGameInfo(),this.syncSearchTimer();let t=this.parseQueues(e),i=this.toUpNextSlots(t);if(this.addFeedOnlyMaps(e),!this.discoveryEnabled||this.criteriaList.length===0||!this.isDiscoveryFeedbackAllowed()){this.seenLobbies.clear(),this.desktopNotifiedLobbies.clear(),this.updateQueueCardPulses(new Set),this.updateSeeAllSignals(!1,new Set),this.renderUpcomingStrip(i,new Set),this.updateStatusText();return}let n=new Set,o=new Set,s=new Set,r=!1,l=new Set,d=[],c=!1,b=_e(),g=(p,u,v)=>{if(!this.includeHostedAndCustomLobbies&&te(p))return;let I=u!=="hosted"&&v===0,N=u==="hosted"||v>1,H=this.engine.matchesCriteria(p,this.criteriaList,this.mapFilter);if(b&&console.log("[OF Discovery]",{lobbyId:p.gameID,queue:u,index:v,mode:p.gameConfig?.gameMode,map:p.gameConfig?.gameMap,playerTeams:p.gameConfig?.playerTeams,modifiers:p.gameConfig?.publicGameModifiers,hostGold:{startingGold:p.gameConfig?.startingGold,goldMultiplier:p.gameConfig?.goldMultiplier},criteriaCount:this.criteriaList.length,matched:H}),!H)return;if(I)n.add(u);else{if(!this.notifyUpcomingEnabled)return;N?r=!0:o.add(u)}s.add(p.gameID);let _=this.getNotificationKey(p);l.add(_),this.seenLobbies.has(_)||(c=!0),this.desktopNotifiedLobbies.has(_)||d.push({lobby:p,queue:u,seeAllOnly:N})};for(let[p,u]of t)u.forEach((v,I)=>g(v,p,I));if(this.updateQueueCardPulses(n),this.updateSeeAllSignals(r,s),this.renderUpcomingStrip(i,o),c&&(this.lastMatchTime=Date.now(),this.soundEnabled&&D.playGameFoundSound()),this.desktopNotificationsEnabled){let p=new Set;for(let{lobby:u,queue:v,seeAllOnly:I}of d){let N=he(u),H=this.getNotificationKey(u);Z.show({title:N.title,body:N.body,tag:H,onClick:I?()=>this.openSeeAllView(v):void 0})&&p.add(H)}this.desktopNotifiedLobbies=new Set([...[...this.desktopNotifiedLobbies].filter(u=>l.has(u)),...p])}else this.desktopNotifiedLobbies.clear();this.seenLobbies=l,l.size===0&&(this.lastMatchTime=null),this.updateStatusText()}catch(t){console.error("[LobbyDiscovery] Error processing lobbies:",t)}}getNotificationKey(e){return JSON.stringify({gameID:e.gameID,map:e.gameConfig?.gameMap??null,mode:e.gameConfig?.gameMode??null,playerTeams:e.gameConfig?.playerTeams??e.gameConfig?.teamCount??null,capacity:e.gameConfig?.maxPlayers??e.maxClients??null,modifiers:e.gameConfig?.publicGameModifiers??{}})}isDiscoveryFeedbackAllowed(){return!(!U.isOnLobbyPage()||document.getElementById("page-play")?.classList.contains("hidden")&&!this.isSeeAllViewVisible()||document.querySelector("public-lobby")?.isLobbyHighlighted===!0||document.querySelector("join-lobby-modal")?.currentLobbyId||document.querySelector("host-lobby-modal")?.lobbyId)}getQueueCardElements(){let e=document.querySelector("game-mode-selector");if(!e)return{};let t=Array.from(e.querySelectorAll("div")).find(g=>g.className.includes("sm:grid-cols-[2fr_1fr]"));if(!(t instanceof HTMLElement))return{};let i=Array.from(t.children),n=i.find(g=>g.className.includes("sm:col-start-1")&&g.className.includes("sm:row-start-2")),o=i.find(g=>g.tagName==="SECTION"),s=o?Array.from(o.children).filter(g=>g.tagName==="DIV"):[],r=e.lobbies?.games,l=Array.isArray(r?.team)&&r.team.length>0,d=Array.isArray(r?.special)&&r.special.length>0,c=l?s[0]:void 0,b=d?s[l?1:0]:void 0;return{ffa:n?.querySelector("button"),team:c?.querySelector("button"),special:b?.querySelector("button")}}updateQueueCardPulses(e){this.activeMatchSources=new Set(e),this.applyQueueCardPulses(),this.scheduleQueueCardPulseSync()}isSeeAllViewVisible(){let e=document.getElementById($);return!!e&&!e.classList.contains("hidden")}getSeeAllButton(){return document.querySelector('game-mode-selector button[class~="group/upcoming"]')}updateSeeAllSignals(e,t){this.seeAllPulseActive=e,this.seeAllMatchIds=t,this.applySeeAllSignals()}applySeeAllSignals(){this.getSeeAllButton()?.classList.toggle("of-discovery-card-active",this.seeAllPulseActive),this.observeSeeAllView(),this.applySeeAllHighlights()}observeSeeAllView(){let e=document.getElementById($);!e||e===this.observedSeeAllView||(this.seeAllObserver?.disconnect(),this.seeAllObserver=new MutationObserver(()=>this.applySeeAllHighlights()),this.seeAllObserver.observe(e,{childList:!0,subtree:!0}),this.observedSeeAllView=e)}applySeeAllHighlights(){let e=document.getElementById($);if(e)for(let t of Array.from(e.querySelectorAll("[data-lobby-slot]")))t.classList.toggle(Re,this.seeAllMatchIds.has(t.dataset.lobbySlot??""))}openSeeAllView(e){if(ve().showPage?.($),e==="hosted")return;document.getElementById($)?.open?.({tab:e})}applyQueueCardPulses(){let e=this.getQueueCardElements();for(let t of["ffa","special","team"]){let i=e[t];i&&i.classList.toggle("of-discovery-card-active",this.activeMatchSources.has(t))}}scheduleQueueCardPulseSync(){this.pulseSyncTimeout&&clearTimeout(this.pulseSyncTimeout),this.pulseSyncTimeout=setTimeout(()=>{this.pulseSyncTimeout=null,this.applyQueueCardPulses(),this.applySeeAllSignals(),this.renderUpcomingStrip(this.lastUpcomingSlots,this.lastUpcomingMatchSources)},16)}getAssetContext(){let e=ve();return{manifest:e.BOOTSTRAP_CONFIG?.assetManifest??e.__ASSET_MANIFEST__??null,cdnBase:e.BOOTSTRAP_CONFIG?.cdnBase??e.__CDN_BASE__??null}}ensureUpcomingStrip(){let e=document.getElementById("of-upcoming-strip");if(e)return this.upcomingStrip=e,e;let t=document.querySelector("game-mode-selector");if(!t||!t.parentNode)return null;let i=document.createElement("div");i.id="of-upcoming-strip",i.className="of-upcoming",i.innerHTML=`
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
    `,t.parentNode.insertBefore(i,t.nextSibling),this.upcomingStrip=i,this.upcomingSlotSignatures.clear();let n=i.querySelector("#of-upcoming-toggle");return n&&(n.checked=this.notifyUpcomingEnabled,n.addEventListener("change",()=>{this.notifyUpcomingEnabled=n.checked,this.saveSettings(),this.processLobbies(this.lastLobbies)})),i}renderUpcomingStrip(e,t){this.lastUpcomingSlots=e,this.lastUpcomingMatchSources=t;let i=this.ensureUpcomingStrip();if(!i)return;let n=!this.sleeping&&this.isDiscoveryFeedbackAllowed();if(i.style.display=n?"":"none",!n)return;let o=i.querySelector("#of-upcoming-toggle");o&&o.checked!==this.notifyUpcomingEnabled&&(o.checked=this.notifyUpcomingEnabled);let{manifest:s,cdnBase:r}=this.getAssetContext();for(let l of Me){let d=i.querySelector(`.of-upcoming-slot[data-source="${l}"]`);if(!d)continue;let c=e.get(l),b=t.has(l),g=c?.live&&c.upcoming?be(c.upcoming,s,r):null,p=c?.live?g?JSON.stringify([g.gameID,b,g.mapName,g.modeText,g.capacityLabel,g.modifierLabels,g.thumbnailUrl]):"empty":"hidden";if(this.upcomingSlotSignatures.get(l)!==p)if(this.upcomingSlotSignatures.set(l,p),p==="hidden")d.style.display="none",d.replaceChildren();else if(p==="empty"){d.style.display="";let u=document.createElement("div");u.className="of-upcoming-empty",u.textContent="No upcoming game",d.replaceChildren(u)}else d.style.display="",d.replaceChildren(this.buildUpcomingCardElement(g,b))}}buildUpcomingCardElement(e,t){let i=document.createElement("button");i.type="button",i.className=`of-upcoming-card${t?" of-upcoming-card-match of-discovery-card-active":""}`;let o=e.modifierLabels.slice(0,3),s=e.modifierLabels.length-o.length,r=o.map(c=>`<span class="of-upcoming-tag">${L(c)}</span>`).join("");s>0&&(r+=`<span class="of-upcoming-tag of-upcoming-tag-more">+${s}</span>`);let l=e.thumbnailUrl?`<img src="${L(e.thumbnailUrl)}" alt="" loading="lazy">`:"",d=t?"Match \xB7 up next":"Up next";return i.setAttribute("aria-label",`Open ${e.mapName} in OpenFront's join modal`),i.innerHTML=`
      <span class="of-upcoming-art">${l}</span>
      <span class="of-upcoming-toprow">
        <span class="of-upcoming-tags">${r}</span>
        <span class="of-upcoming-chip"><span class="of-upcoming-dot"></span>${d}</span>
      </span>
      <span class="of-upcoming-bot">
        <span class="of-upcoming-name">${L(e.mapName)}</span>
        <span class="of-upcoming-metarow">
          <span class="of-upcoming-mode">${L(e.modeText)}</span>
          ${e.capacityLabel?`<span class="of-upcoming-count">${Oe}${L(e.capacityLabel)}</span>`:""}
        </span>
      </span>
    `,i.addEventListener("click",()=>this.navigateToGame(`/game/${e.gameID}`)),i}navigateToGame(e){window.location.assign(e)}hideUpcomingStrip(){this.upcomingStrip&&(this.upcomingStrip.style.display="none")}stopTimer(){this.timerInterval&&(clearInterval(this.timerInterval),this.timerInterval=null)}startGameInfoUpdates(){this.stopGameInfoUpdates(),this.updateCurrentGameInfo(),this.gameInfoInterval=setInterval(()=>this.updateCurrentGameInfo(),1e3)}stopGameInfoUpdates(){this.gameInfoInterval&&(clearInterval(this.gameInfoInterval),this.gameInfoInterval=null)}syncSearchTimer(e={}){let{resetStart:t=!1}=e;this.stopTimer(),t&&(this.searchStartTime=null,this.lastMatchTime=null,this.seenLobbies.clear(),this.desktopNotifiedLobbies.clear()),this.discoveryEnabled&&this.criteriaList.length>0&&this.isDiscoveryFeedbackAllowed()?(this.searchStartTime===null&&(this.searchStartTime=Date.now()),this.timerInterval=setInterval(()=>this.updateStatusText(),1e3)):(this.searchStartTime=null,this.lastMatchTime=null),this.updateStatusText(),this.updatePulseIndicator()}updatePulseIndicator(){let e=document.querySelector(".ld-pulse");if(!e)return;let t=this.discoveryEnabled&&this.criteriaList.length>0;e.classList.toggle("is-paused",!t)}setDiscoveryEnabled(e,t={}){this.discoveryEnabled=e,this.saveSettings(),this.updateStatusLabel(),this.syncSearchTimer({resetStart:t.resetTimer??!1})}updateStatusLabel(){let e=document.querySelector(".ld-status-text strong");e&&(e.textContent=this.discoveryEnabled?"Discovery active":"Discovery paused")}getNumberValue(e){let t=document.getElementById(e);if(!t)return null;let i=parseInt(t.value,10);return Number.isNaN(i)?null:i}getModifierState(e){let i=document.getElementById(e)?.dataset.state;return i==="required"||i==="blocked"?i:"any"}setModifierState(e,t){let i=document.getElementById(e);i&&this.applyTriState(i,t)}applyTriState(e,t){e.dataset.state=t,e.setAttribute("aria-pressed",String(t!=="any"));let i=e.dataset.modName??e.getAttribute("aria-label")??"",n=t==="blocked"?"excluded":t;i&&e.setAttribute("aria-label",t==="any"?i:`${i} \xB7 ${n}`);let o=e.querySelector(".ld-mod-ind");o&&(t==="required"?o.innerHTML=j:t==="blocked"?o.innerHTML=Ue:o.innerHTML="")}cycleModifierState(e){this.setModifierState(e,xe(this.getModifierState(e)))}getMapChips(){return Array.from(document.querySelectorAll("#discovery-maps-body [data-game-map]"))}cycleMapState(e){let t=e.dataset.gameMap??"",i=xe(this.mapFilter[t]??"any"),n={...this.mapFilter};i==="any"?delete n[t]:n[t]=i,this.setMapFilter(n)}setMapFilter(e){this.mapFilter=e,this.syncMapChips(),this.saveSettings(),this.syncSearchTimer({resetStart:!0}),this.processLobbies(this.lastLobbies)}syncMapChips(){for(let s of this.getMapChips())this.applyTriState(s,this.mapFilter[s.dataset.gameMap??""]??"any");let e=Object.values(this.mapFilter),t=e.filter(s=>s==="required").length,i=e.filter(s=>s==="blocked").length,n=[...t>0?[`${t} required`]:[],...i>0?[`${i} excluded`]:[]],o=document.getElementById("discovery-maps-summary");o&&(o.textContent=n.length>0?n.join(" \xB7 "):"Any map")}filterMapChips(e){let t=e.trim().toLowerCase();for(let i of this.getMapChips())i.hidden=t!==""&&!(i.dataset.modName??"").toLowerCase().includes(t);for(let i of Array.from(document.querySelectorAll("#discovery-maps-body [data-category]")))i.hidden=!i.querySelector("[data-game-map]:not([hidden])")}addFeedOnlyMaps(e){for(let t of e){let i=t.gameConfig?.gameMap?.trim();if(!i||this.knownMaps.has(i))continue;this.knownMaps.add(i);let n=this.ensureMapGroup("other");if(!n)continue;n.insertAdjacentHTML("beforeend",this.renderMapChip(i,i));let o=n.lastElementChild;o.addEventListener("click",()=>this.cycleMapState(o)),this.applyTriState(o,this.mapFilter[i]??"any");let s=document.getElementById("discovery-maps-search");this.filterMapChips(s?.value??"")}}ensureMapGroup(e){let t=document.getElementById("discovery-maps-groups");if(!t)return null;let i=t.querySelector(`[data-category="${e}"] .ld-mods`);return i||(t.insertAdjacentHTML("beforeend",this.renderMapGroup(e,"")),t.querySelector(`[data-category="${e}"] .ld-mods`))}getNumericModifierState(e){let t={};for(let[i,n]of Object.entries(e))t[Number(i)]=this.getModifierState(n);return t}getModifierFiltersFromUI(){return{isCompact:this.getModifierState("modifier-isCompact"),isRandomSpawn:this.getModifierState("modifier-isRandomSpawn"),isCrowded:this.getModifierState("modifier-isCrowded"),isHardNations:this.getModifierState("modifier-isHardNations"),isAlliancesDisabled:this.getModifierState("modifier-isAlliancesDisabled"),isNukesDisabled:this.getModifierState("modifier-isNukesDisabled"),isSAMsDisabled:this.getModifierState("modifier-isSAMsDisabled"),isPeaceTime:this.getModifierState("modifier-isPeaceTime"),isWaterNukes:this.getModifierState("modifier-isWaterNukes"),isDoomsdayClock:this.getModifierState("modifier-isDoomsdayClock"),isTrusted:this.getModifierState("modifier-isTrusted"),startingGold:this.getNumericModifierState({1e6:"modifier-startingGold-1000000",5e6:"modifier-startingGold-5000000",25e6:"modifier-startingGold-25000000"}),goldMultiplier:this.getNumericModifierState({2:"modifier-goldMultiplier-2"})}}getAllTeamCountValues(){let e=[];for(let t of Q){let i=document.getElementById(t);if(!i?.checked)continue;let n=i.value;if(n==="Humans Vs Nations"||n==="8+")e.push(n);else{let o=parseInt(n,10);Number.isNaN(o)||e.push(o)}}return e}setAllTeamCounts(e){for(let t of Q){let i=document.getElementById(t);i&&(i.checked=e,this.syncChipState(t))}}syncChipState(e){let t=document.getElementById(e);if(!t)return;let i=t.closest(".ld-chip, .ld-mode-btn, .ld-2x");i&&(i.classList.toggle("is-on",t.checked),i.setAttribute("aria-pressed",String(t.checked)))}buildCriteriaFromUI(){let e=this.getModifierFiltersFromUI(),t=[];if(document.getElementById("discovery-ffa")?.checked&&t.push({gameMode:"FFA",teamCount:null,minPlayers:this.getNumberValue("discovery-ffa-min"),maxPlayers:this.getNumberValue("discovery-ffa-max"),modifiers:e}),!document.getElementById("discovery-team")?.checked)return t;let o=this.getAllTeamCountValues();if(o.length===0)return t.push({gameMode:"Team",teamCount:null,minPlayers:this.getNumberValue("discovery-team-min"),maxPlayers:this.getNumberValue("discovery-team-max"),modifiers:e}),t;for(let s of o)t.push({gameMode:"Team",teamCount:s,minPlayers:this.getNumberValue("discovery-team-min"),maxPlayers:this.getNumberValue("discovery-team-max"),modifiers:e});return t}updateFilterCount(){let e=document.getElementById("discovery-filter-count"),t=document.getElementById("discovery-filter-word");if(!e||!t)return;let i=document.getElementById("discovery-ffa")?.checked,n=document.getElementById("discovery-team")?.checked,o=Q.filter(l=>document.getElementById(l)?.checked).length,s=[...ne,...z.map(l=>`modifier-startingGold-${l}`),...W.map(l=>`modifier-goldMultiplier-${l}`)].filter(l=>this.getModifierState(l)!=="any").length,r=(i?1:0)+(n?1:0)+o+s;e.textContent=String(r),t.textContent=r===1?"filter":"filters"}setModePanelActive(e,t){let i=document.getElementById(e);i&&i.classList.toggle("is-off",!t)}setIconButtonState(e,t){let i=document.getElementById(e)?.closest(".ld-icon-btn");i&&i.classList.toggle("is-on",t)}loadUIFromSettings(){let e=this.criteriaList.find(c=>c.gameMode==="FFA"),t=this.criteriaList.filter(c=>c.gameMode==="Team"),i=document.getElementById("discovery-ffa"),n=document.getElementById("discovery-team");if(i&&(i.checked=!!e,this.syncChipState("discovery-ffa"),this.setModePanelActive("discovery-ffa-config",!!e)),n&&(n.checked=t.length>0,this.syncChipState("discovery-team"),this.setModePanelActive("discovery-team-config",t.length>0)),e){let c=document.getElementById("discovery-ffa-min"),b=document.getElementById("discovery-ffa-max");c&&e.minPlayers!==null&&(c.value=String(e.minPlayers)),b&&e.maxPlayers!==null&&(b.value=String(e.maxPlayers))}if(t[0]){let c=document.getElementById("discovery-team-min"),b=document.getElementById("discovery-team-max");c&&t[0].minPlayers!==null&&(c.value=String(t[0].minPlayers)),b&&t[0].maxPlayers!==null&&(b.value=String(t[0].maxPlayers)),this.setTeamCountSelections(t.map(g=>g.teamCount))}let o=(e??t[0])?.modifiers;if(o){this.setModifierState("modifier-isCompact",o.isCompact??"any"),this.setModifierState("modifier-isRandomSpawn",o.isRandomSpawn??"any"),this.setModifierState("modifier-isCrowded",o.isCrowded??"any"),this.setModifierState("modifier-isHardNations",o.isHardNations??"any"),this.setModifierState("modifier-isAlliancesDisabled",o.isAlliancesDisabled??"any"),this.setModifierState("modifier-isNukesDisabled",o.isNukesDisabled??"any"),this.setModifierState("modifier-isSAMsDisabled",o.isSAMsDisabled??"any"),this.setModifierState("modifier-isPeaceTime",o.isPeaceTime??"any"),this.setModifierState("modifier-isWaterNukes",o.isWaterNukes??"any"),this.setModifierState("modifier-isDoomsdayClock",o.isDoomsdayClock??"any"),this.setModifierState("modifier-isTrusted",o.isTrusted??"any");for(let c of z)this.setModifierState(`modifier-startingGold-${c}`,o.startingGold?.[c]??"any");for(let c of W)this.setModifierState(`modifier-goldMultiplier-${c}`,o.goldMultiplier?.[c]??"any")}let s=document.getElementById("discovery-sound-toggle");s&&(s.checked=this.soundEnabled,this.setIconButtonState("discovery-sound-toggle",this.soundEnabled));let r=document.getElementById("discovery-desktop-toggle");r&&(r.checked=this.desktopNotificationsEnabled,this.setIconButtonState("discovery-desktop-toggle",this.desktopNotificationsEnabled));let l=document.getElementById("discovery-team-two-times");l&&(l.checked=this.isTeamTwoTimesMinEnabled,this.syncChipState("discovery-team-two-times")),this.syncMapChips();let d=document.getElementById("discovery-hosted-toggle");d&&(d.checked=this.includeHostedAndCustomLobbies,this.syncChipState("discovery-hosted-toggle")),this.updateFilterCount(),this.updateStatusLabel()}setTeamCountSelections(e){for(let t of e){let i=null;t==="Humans Vs Nations"?i=document.getElementById("discovery-team-hvn"):t==="8+"?i=document.getElementById("discovery-team-8plus"):typeof t=="number"&&(i=document.getElementById(`discovery-team-${t}`)),i&&(i.checked=!0,this.syncChipState(i.id))}}refreshCriteria(){this.criteriaList=this.buildCriteriaFromUI(),this.saveSettings(),this.updateFilterCount(),this.syncSearchTimer({resetStart:!0})}resetAll(){let e=document.getElementById("discovery-ffa"),t=document.getElementById("discovery-team");e&&(e.checked=!1,this.syncChipState("discovery-ffa"),this.setModePanelActive("discovery-ffa-config",!1)),t&&(t.checked=!1,this.syncChipState("discovery-team"),this.setModePanelActive("discovery-team-config",!1)),this.setAllTeamCounts(!1);let i=document.getElementById("discovery-team-two-times");i&&(i.checked=!1,this.syncChipState("discovery-team-two-times"),this.isTeamTwoTimesMinEnabled=!1);for(let n of ne)this.setModifierState(n,"any");for(let n of z)this.setModifierState(`modifier-startingGold-${n}`,"any");for(let n of W)this.setModifierState(`modifier-goldMultiplier-${n}`,"any");this.mapFilter={},this.syncMapChips(),this.ffaSlider?.setRange(1,125),this.teamSlider?.setRange(T,J),this.teamSlider?.applyLockState(),this.refreshCriteria()}async handleDesktopNotificationToggleChange(e){let t=++this.desktopNotificationRequestId;if(!e.checked){this.desktopNotificationsEnabled=!1,this.setIconButtonState("discovery-desktop-toggle",!1),this.saveSettings();return}let i=await Z.ensurePermission();t!==this.desktopNotificationRequestId||this.isDisposed||!e.isConnected||!e.checked||(this.desktopNotificationsEnabled=i,e.checked=i,e.toggleAttribute("checked",i),this.setIconButtonState("discovery-desktop-toggle",i),this.saveSettings())}setupEventListeners(){document.getElementById("discovery-status")?.addEventListener("click",()=>{this.setDiscoveryEnabled(!this.discoveryEnabled,{resetTimer:!0})});for(let[r,l]of[["discovery-ffa","discovery-ffa-config"],["discovery-team","discovery-team-config"]]){let d=document.getElementById(r);d?.addEventListener("change",()=>{this.syncChipState(r),this.setModePanelActive(l,d.checked),this.refreshCriteria()})}let e=document.getElementById("discovery-team-two-times");e?.addEventListener("change",()=>{this.isTeamTwoTimesMinEnabled=e.checked,this.syncChipState("discovery-team-two-times"),this.teamSlider?.applyLockState(),this.refreshCriteria()});let t=document.getElementById("discovery-maps-toggle"),i=document.getElementById("discovery-maps-body");t?.addEventListener("click",()=>{i&&(i.hidden=!i.hidden,t.setAttribute("aria-expanded",String(!i.hidden)))});let n=document.getElementById("discovery-maps-search");n?.addEventListener("input",()=>this.filterMapChips(n.value)),document.getElementById("discovery-maps-clear")?.addEventListener("click",()=>{this.setMapFilter({})});for(let r of this.getMapChips())r.addEventListener("click",()=>this.cycleMapState(r));let o=document.getElementById("discovery-hosted-toggle");o?.addEventListener("change",()=>{this.includeHostedAndCustomLobbies=o.checked,this.syncChipState("discovery-hosted-toggle"),this.saveSettings(),this.processLobbies(this.lastLobbies)}),document.getElementById("discovery-reset")?.addEventListener("click",()=>{this.resetAll()});for(let r of[...Q,"discovery-sound-toggle","discovery-desktop-toggle"]){let l=document.getElementById(r);l&&l.addEventListener("change",()=>{if(r==="discovery-sound-toggle"){this.soundEnabled=l.checked,this.setIconButtonState("discovery-sound-toggle",l.checked),this.saveSettings();return}if(r==="discovery-desktop-toggle"){this.handleDesktopNotificationToggleChange(l);return}this.syncChipState(r),this.refreshCriteria()})}let s=[...ne,...z.map(r=>`modifier-startingGold-${r}`),...W.map(r=>`modifier-goldMultiplier-${r}`)];for(let r of s)document.getElementById(r)?.addEventListener("click",()=>{this.cycleModifierState(r),this.refreshCriteria()})}renderModeButton(e,t){return`
      <label class="ld-mode-btn" aria-pressed="false">
        <input type="checkbox" id="${e}" value="${e==="discovery-ffa"?"FFA":"Team"}">
        <span class="check">${j}</span>
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
    `}renderMapChip(e,t){let i=L(t);return`
      <button type="button" class="ld-mod" data-game-map="${L(e)}" data-state="any" data-mod-name="${i}" aria-pressed="false" aria-label="${i}">
        <span class="ld-mod-ind"></span>
        <span class="ld-mod-name">${i}</span>
      </button>
    `}renderMapGroup(e,t){return`
      <div class="ld-mod-group" data-category="${e}">
        <div class="ld-mod-group-label">${le[e]}</div>
        <div class="ld-mods">${t}</div>
      </div>
    `}renderMapGroups(){return de.map(e=>{let t=F.filter(i=>i.categories.includes(e));return t.length===0?"":this.renderMapGroup(e,t.map(i=>this.renderMapChip(i.gameMap,i.name)).join(""))}).join("")}renderIconButton(e,t,i){return`
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
          ${this.renderIconButton("discovery-sound-toggle","Sound alert",Ge)}
          ${this.renderIconButton("discovery-desktop-toggle","Desktop notification",Ve)}
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
                <span class="check">${j}</span>
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

          <div class="ld-section ld-maps">
            <button type="button" class="ld-section-head ld-maps-toggle" id="discovery-maps-toggle" aria-expanded="false" aria-controls="discovery-maps-body">
              <span class="ld-section-label">Maps</span>
              <span class="ld-section-aside" id="discovery-maps-summary">Any map</span>
            </button>
            <div id="discovery-maps-body" hidden>
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
            <div class="ld-section-head">
              <div class="ld-section-label">Lobbies</div>
            </div>
            <label class="ld-2x" aria-pressed="false">
              <input type="checkbox" id="discovery-hosted-toggle">
              <span class="check">${j}</span>
              <span class="lbl"><strong>Include hosted and custom lobbies</strong></span>
            </label>
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
    `,document.body.appendChild(this.panel),this.setupEventListeners(),this.loadUIFromSettings(),this.ffaSlider=new B({containerId:"discovery-ffa-slider-row",rangeRootId:"discovery-ffa-range-root",minSliderId:"discovery-ffa-min-slider",maxSliderId:"discovery-ffa-max-slider",minInputId:"discovery-ffa-min",maxInputId:"discovery-ffa-max",fillId:"discovery-ffa-range-fill",bounds:{min:1,max:125},onChange:()=>this.refreshCriteria()}),this.teamSlider=new B({containerId:"discovery-team-slider-row",rangeRootId:"discovery-team-range-root",minSliderId:"discovery-team-min-slider",maxSliderId:"discovery-team-max-slider",minInputId:"discovery-team-min",maxInputId:"discovery-team-max",fillId:"discovery-team-range-fill",ticksContainerId:"discovery-team-ticks",bounds:{min:T,max:J},stops:se,lockMaxToTwiceMin:()=>this.isTeamTwoTimesMinEnabled,onChange:()=>this.refreshCriteria()}),this.updateStatusLabel(),this.updateFilterCount(),this.syncSearchTimer(),this.startGameInfoUpdates())}updateSleepState(){let e=U.isOnLobbyPage();this.sleeping=!e,this.sleeping?(this.panel.classList.add("hidden"),this.stopTimer(),this.stopGameInfoUpdates(),this.updateQueueCardPulses(new Set),this.updateSeeAllSignals(!1,new Set),this.hideUpcomingStrip()):(this.panel.classList.remove("hidden"),this.syncSearchTimer(),this.startGameInfoUpdates())}cleanup(){this.isDisposed=!0,this.stopTimer(),this.stopGameInfoUpdates(),this.pulseSyncTimeout&&(clearTimeout(this.pulseSyncTimeout),this.pulseSyncTimeout=null),this.activeMatchSources.clear(),this.applyQueueCardPulses(),this.updateSeeAllSignals(!1,new Set),this.seeAllObserver?.disconnect(),this.seeAllObserver=null,this.observedSeeAllView=null,this.upcomingStrip?.parentNode?.removeChild(this.upcomingStrip),this.upcomingStrip=null,this.lastUpcomingSlots=new Map,this.lastUpcomingMatchSources=new Set,this.upcomingSlotSignatures.clear(),this.panel.parentNode?.removeChild(this.panel)}};var K=class{constructor(){this.observer=null;this.animationFrameId=null}start(){this.observer||(this.observer=new MutationObserver(()=>this.scheduleApplyHighlights()),this.observer.observe(document.body,{attributes:!1,childList:!0,subtree:!0}),this.applyHighlights())}stop(){this.observer?.disconnect(),this.observer=null,this.animationFrameId!==null&&(cancelAnimationFrame(this.animationFrameId),this.animationFrameId=null)}scheduleApplyHighlights(){this.animationFrameId===null&&(this.animationFrameId=requestAnimationFrame(()=>{this.animationFrameId=null,this.applyHighlights()}))}applyHighlights(){for(let e of Array.from(document.querySelectorAll("lobby-player-view")))this.applyHighlightToView(e)}applyHighlightToView(e){this.clearHighlights(e);let t=Array.from(e.querySelectorAll(".player-tag.current-player"));if(t.length>0){t.forEach(o=>o.classList.add("of-current-player-boost"));return}let i=this.getNativeTeamRows(e);i.forEach(o=>o.classList.add("of-current-player-boost"));let n=this.getNativeTeamCards(e);n.forEach(o=>o.classList.add("of-current-player-team-boost")),!(i.length>0||n.length>0)&&this.applyFallbackHighlight(e)}clearHighlights(e){e.querySelectorAll(".of-current-player-boost").forEach(t=>{t.classList.remove("of-current-player-boost")}),e.querySelectorAll(".of-current-player-team-boost").forEach(t=>{t.classList.remove("of-current-player-team-boost")})}getNativeTeamRows(e){return Array.from(e.querySelectorAll("div")).filter(t=>{let i=t.classList;return i.contains("bg-sky-600/20")&&i.contains("border-sky-500/40")})}getNativeTeamCards(e){return Array.from(e.querySelectorAll("div")).filter(t=>{let i=t.classList;return i.contains("rounded-xl")&&i.contains("border-sky-500/60")})}applyFallbackHighlight(e){let t=e.currentClientID,i=Array.isArray(e.clients)?e.clients:[];if(!t||i.length===0)return;let n=i.findIndex(u=>u?.clientID===t);if(n<0)return;let o=i[n],s=this.formatDisplayName(o),r=Array.from(e.querySelectorAll(".player-tag"));if(r[n]){r[n].classList.add("of-current-player-boost");return}Array.from(e.querySelectorAll("[data-client-id]")).filter(u=>u.dataset.clientId===t).forEach(u=>u.classList.add("of-current-player-boost")),this.findRowsByDisplayName(e,s).forEach(u=>u.classList.add("of-current-player-boost"));let c=Array.from(e.querySelectorAll(".rounded-xl")),p=(Array.isArray(e.teamPreview)?e.teamPreview:[]).filter(u=>Array.isArray(u.players)&&u.players.length>0).findIndex(u=>Array.isArray(u.players)&&u.players.some(v=>v?.clientID===t));p>=0&&c[p]&&(c[p].classList.add("of-current-player-team-boost"),this.findRowsByDisplayName(c[p],s).forEach(v=>v.classList.add("of-current-player-boost")))}formatDisplayName(e){return e?.username?e.clanTag?`[${e.clanTag}] ${e.username}`:e.username:""}findRowsByDisplayName(e,t){if(!t)return[];let i=[];for(let n of Array.from(e.querySelectorAll("span, div"))){let o=n.textContent?.trim();if(!o||o!==t)continue;let s=n.closest("[data-client-id]")??n.closest(".player-tag")??n.closest(".team-player-row")??n.closest("div");s&&!i.includes(s)&&i.push(s)}return i}};(function(){"use strict";console.log("[OpenFront Game Notifier] Initializing adaptation for OpenFront 0.30..."),GM_addStyle(re()),D.preloadSounds(),P.init(),X.start();let a=new Y,e=new K;X.subscribe(n=>{a.receiveLobbyUpdate(n)}),e.start();let t=n=>{try{return new URL(n).searchParams.has("live")}catch{return!1}},i=t(location.href);P.subscribe(n=>{let o=t(n);!i&&o&&a.isSoundEnabled()&&D.playGameStartSound(),i=o}),console.log("[OpenFront Game Notifier] Ready! \u{1F680}")})();})();
