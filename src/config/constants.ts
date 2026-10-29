/**
 * Application-wide configuration constants
 */

export const CONFIG = {
  threadCount: 20,
} as const;

/**
 * Storage keys for GM_getValue/GM_setValue
 * Using centralized keys prevents typos and makes refactoring easier
 */
export const STORAGE_KEYS = {
  lobbyDiscoverySettings: "OF_LOBBY_DISCOVERY_SETTINGS",
  lobbyDiscoveryCollapsedSections: "OF_LOBBY_DISCOVERY_COLLAPSED_SECTIONS",
  lobbyBoardSidebarCollapsed: "OF_LOBBY_BOARD_SIDEBAR_COLLAPSED",
} as const;

/**
 * Z-index layers for UI elements
 */
export const Z_INDEX = {
  panel: 9998,
  panelOverlay: 9999,
  modal: 10000,
  notification: 20000,
} as const;

/**
 * Type helper for storage keys
 */
export type StorageKey = typeof STORAGE_KEYS[keyof typeof STORAGE_KEYS];

/**
 * Stops for the "Players per team" slider — quasi-logarithmic spacing
 * with denser low-end resolution to match real-world team-lobby distribution.
 * Values must be strictly monotonically increasing.
 */
export const TEAM_PLAYERS_PER_TEAM_STOPS = [
  2, 3, 4, 5, 6, 8, 10, 15, 20, 30, 62,
] as const;

/**
 * Minimum players-per-team value. 1-per-team would be solo (FFA), so the
 * floor is 2.
 */
export const TEAM_MIN_PLAYERS_PER_TEAM = 2;

/**
 * Maximum players-per-team value (matches OpenFront's lobby capacity ceiling).
 */
export const TEAM_MAX_PLAYERS_PER_TEAM = 62;
