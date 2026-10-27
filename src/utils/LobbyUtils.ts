/**
 * LobbyUtils - Helper functions for interacting with OpenFront.io lobby UI
 *
 * Responsibilities:
 * - Query DOM for lobby-related elements
 * - Determine lobby state (can join, currently in lobby, etc.)
 * - Perform lobby join/leave actions with debouncing
 * - Detect whether user is on lobby page vs in-game
 *
 * Compatible with OpenFront.io v0.29.0+
 */

/**
 * Type augmentation for public-lobby custom element
 * OpenFront.io uses custom web components with these properties
 */
interface PublicLobbyElement extends Element {
  isLobbyHighlighted?: boolean;
  lobbies?: any[];
}

interface LobbyUtilsSingleton {
  lastActionTime: number;
  debounceDelay: number;
  getLobbyButton(): HTMLButtonElement | null;
  canJoinLobby(): boolean;
  verifyState(expectedState: 'in' | 'out'): boolean;
  tryJoinLobby(): boolean;
  isOnLobbyPage(): boolean;
}

export const LobbyUtils: LobbyUtilsSingleton = {
  lastActionTime: 0,
  debounceDelay: 800,

  /**
   * Get the lobby join/leave button from the DOM
   * v0.29.0: Query button inside public-lobby component
   */
  getLobbyButton(): HTMLButtonElement | null {
    const publicLobby = document.querySelector('public-lobby');
    return publicLobby?.querySelector('button.group.relative.isolate') as HTMLButtonElement | null;
  },

  /**
   * Check if lobby can be joined right now
   * v0.29.0: Use component's internal state instead of CSS classes
   */
  canJoinLobby(): boolean {
    const publicLobby = document.querySelector('public-lobby') as PublicLobbyElement | null;
    if (!publicLobby) return false;

    const btn = this.getLobbyButton();
    return !!(
      btn &&
      !publicLobby.isLobbyHighlighted &&
      publicLobby.lobbies &&
      publicLobby.lobbies.length > 0 &&
      !btn.disabled &&
      btn.offsetParent !== null
    );
  },

  /**
   * Verify lobby state matches expected state
   * v0.29.0: Check component state instead of button classes
   *
   * @param expectedState - 'in' if expecting to be in lobby, 'out' if expecting to be out
   */
  verifyState(expectedState: 'in' | 'out'): boolean {
    const publicLobby = document.querySelector('public-lobby') as PublicLobbyElement | null;
    if (!publicLobby) return false;

    const btn = this.getLobbyButton();
    if (!btn || btn.disabled || btn.offsetParent === null) {
      return false;
    }

    if (expectedState === 'in') {
      return publicLobby.isLobbyHighlighted === true;
    }

    if (expectedState === 'out') {
      return !!(
        !publicLobby.isLobbyHighlighted &&
        publicLobby.lobbies &&
        publicLobby.lobbies.length > 0
      );
    }

    return false;
  },

  /**
   * Attempt to join the lobby with debouncing
   * Returns true if join was attempted, false if debounced or unable to join
   */
  tryJoinLobby(): boolean {
    const now = Date.now();

    // Debounce: prevent rapid-fire join attempts
    if (now - this.lastActionTime < this.debounceDelay) {
      return false;
    }

    const btn = this.getLobbyButton();
    const publicLobby = document.querySelector('public-lobby') as PublicLobbyElement | null;

    if (
      btn &&
      publicLobby &&
      !publicLobby.isLobbyHighlighted &&
      publicLobby.lobbies &&
      publicLobby.lobbies.length > 0 &&
      !btn.disabled &&
      btn.offsetParent !== null
    ) {
      this.lastActionTime = now;
      btn.click();

      // Verify join was successful after a short delay
      setTimeout(() => {
        if (!this.verifyState('in')) {
          console.warn('[LobbyUtils] Join may have failed, state not updated');
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
  isOnLobbyPage(): boolean {
    // OpenFront marks the body during a game, also in streamer mode where the URL has no `?live`.
    if (document.body.classList.contains('in-game')) {
      return false;
    }

    // First check: If game page exists and is visible, we're definitely in game
    const pageGame = document.getElementById('page-game');
    if (pageGame && !pageGame.classList.contains('hidden')) {
      return false; // We're definitely in a game
    }

    // Second check: Look for visible game canvas (strong indicator of active game)
    const gameCanvas = document.querySelector('canvas') as HTMLElement | null;
    if (gameCanvas && gameCanvas.offsetParent !== null) {
      const rect = gameCanvas.getBoundingClientRect();
      if (rect.width > 100 && rect.height > 100) {
        // Canvas is visible with reasonable dimensions, likely in game
        return false;
      }
    }

    // Third check: Look for public-lobby component visibility
    const publicLobby = document.querySelector('public-lobby') as HTMLElement | null;
    if (publicLobby && publicLobby.offsetParent !== null) {
      // Public lobby is visible and rendered - we're in lobby
      return true;
    }

    // Fourth check: If public-lobby exists but is hidden, we're NOT in lobby
    if (publicLobby && publicLobby.offsetParent === null) {
      return false;
    }

    // Fifth check: page-play visibility
    const pagePlay = document.getElementById('page-play');
    if (pagePlay && !pagePlay.classList.contains('hidden')) {
      // We're on the play page - check if we have a lobby component
      if (publicLobby) {
        return true;
      }
    }

    // Fallback to URL check
    const currentPath = window.location.pathname.replace(/\/+$/, '') || '/';
    return currentPath === '/' || currentPath === '/public-lobby';
  },
};
