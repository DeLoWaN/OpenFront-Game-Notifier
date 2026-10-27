/**
 * CSS styles for the userscript UI.
 * Uses CSS-in-JS with theme tokens for consistent styling.
 */

import { COLORS, RADIUS, SHADOWS, TIMING, FONTS } from '@/config/theme';
import { Z_INDEX } from '@/config/constants';

export function getStyles(): string {
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

    /* Native join-modal player highlights — re-themed to blue accent */
    .of-current-player-boost {
      box-shadow: 0 0 0 1px var(--of-hud-accent), 0 0 16px var(--of-hud-accent-soft);
      background: linear-gradient(90deg, var(--of-hud-accent-soft), rgba(${COLORS.accentShadow}, 0.06));
    }
    .of-current-player-team-boost {
      box-shadow: inset 0 0 0 1px var(--of-hud-accent-line), 0 0 20px var(--of-hud-accent-soft);
    }

    /* Queue card pulse — orange alarm contrast against the blue panel (intentional) */
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
  `;
}
