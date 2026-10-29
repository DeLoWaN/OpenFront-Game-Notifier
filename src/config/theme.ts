/**
 * Design system tokens for consistent theming.
 * Warm-neutral dark palette with a blue accent.
 */

export const COLORS = {
  bgPrimary: '#0d0f10',
  bgSecondary: '#14171a',
  bgElevated: '#1a1e22',
  bgRaised: '#20252a',
  bgHover: 'rgba(255,255,255,0.04)',

  textPrimary: '#f2f1ee',
  textSecondary: '#c8c6c0',
  textMuted: '#8e8c85',
  textFaint: '#5a5853',

  border: 'rgba(255,255,255,0.06)',
  borderSubtle: 'rgba(255,255,255,0.10)',
  borderStrong: 'rgba(255,255,255,0.16)',

  accent: '#7aa7d4',
  accentSoft: 'rgba(122,167,212,0.14)',
  accentLine: 'rgba(122,167,212,0.32)',
  accentShadow: '122,167,212',

  warning: '#d4a056',
  warningSoft: 'rgba(212,160,86,0.14)',
  danger: '#d27a6b',
  dangerSoft: 'rgba(210,122,107,0.14)',
  dangerLine: 'rgba(210,122,107,0.30)',

  // legacy aliases — kept so other modules compile unchanged
  accentMuted: 'rgba(122,167,212,0.14)',
  accentHover: '#9bbfe0',
  accentAlt: '#9bbfe0',
  borderAccent: 'rgba(122,167,212,0.32)',
  highlight: 'rgba(122,167,212,0.20)',
  success: '#74c69d',
  successSolid: '#74c69d',
  error: '#d27a6b',
} as const;

/** Colours of the Lobby Board, which sit on a dark violet surface of their own. */
export const BOARD_COLORS = {
  surface: 'rgba(16, 10, 24, 0.92)',
  /** The orange of the Live row, the countdown and the frame of a matching card. */
  live: '#e8600c',
  /** The text on the orange countdown. */
  onLive: '#0a0610',
  /** The soft inner glow of the flash after a desktop notification click. */
  liveGlow: 'rgba(232, 96, 12, 0.45)',
  text: '#fff',
  /** The text on the accent tag. */
  onAccent: '#0d0a14',
  /** The text on the "New" badge. */
  onNew: '#0a0610',
  chip: 'rgba(255, 255, 255, 0.08)',
  blockedBg: 'rgba(200, 70, 50, 0.25)',
  blockedText: '#f2c4bb',
  /** The players gauge along the bottom of a card. */
  gaugeTrack: 'rgba(255, 255, 255, 0.04)',
  gaugeFill: 'rgba(159, 184, 166, 0.62)',
  /** The fill of a nearly full lobby. */
  gaugeFillHot: 'rgba(232, 96, 12, 0.65)',
  /** Keeps the white gauge text readable over the fill and over the empty track. */
  gaugeTextShadow: 'rgba(0, 0, 0, 0.7)',
  /** The text column of the card under the pointer: a little lighter than its rest colour. */
  textColumnHover: '#1d2126',
} as const;

/** Sizes of the Lobby Board, in px. */
export const BOARD_SIZES = {
  /** The width of the map thumbnail on the left of a card. */
  thumbWidthPx: 112,
  /** The height of the players gauge along the bottom of a card. */
  gaugeHeightPx: 18,
  /** The smallest card height, gauge included. A card with more modifier lines grows. */
  cardMinHeightPx: 120,
  /** The space between two rows and between two columns of the board. */
  gridGapPx: 12,
} as const;

export const FONTS = {
  body: "'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif",
  display: "'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif",
  mono: "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace",
} as const;

export const SPACING = {
  xs: '4px',
  sm: '8px',
  md: '12px',
  lg: '16px',
  xl: '20px',
  xxl: '24px',
} as const;

export const RADIUS = {
  sm: '6px',
  md: '7px',
  lg: '10px',
  xl: '14px',
} as const;

export const SHADOWS = {
  sm: '0 1px 3px rgba(0,0,0,0.4)',
  md: '0 2px 8px rgba(0,0,0,0.3)',
  lg: '0 1px 0 rgba(255,255,255,0.04) inset, 0 24px 48px rgba(0,0,0,0.45), 0 2px 8px rgba(0,0,0,0.3)',
} as const;

export const TIMING = {
  fast: '0.12s',
  normal: '0.2s',
  slow: '0.3s',
} as const;
