/**
 * Alert state of the Lobby Board cards. It lives in memory only.
 *
 * An alert starts when a lobby starts to match. It is keyed by the
 * notification dedup key, so a lobby whose configuration changes alerts again.
 */

export interface CardAlertState {
  /** True until the pointer passes over the card. */
  isNew: boolean;
}

interface AlertEntry {
  gameID: string;
  isNew: boolean;
}

export class LobbyBoardAlerts {
  private entries = new Map<string, AlertEntry>();

  /** Starts, or restarts, the alert of one lobby key. */
  alert(key: string, gameID: string): void {
    this.entries.set(key, { gameID, isNew: true });
  }

  /** Clears the "New" state of every alert of a lobby. */
  markSeen(gameID: string): void {
    for (const entry of this.entries.values()) {
      if (entry.gameID === gameID) entry.isNew = false;
    }
  }

  /** Forgets the alert of every key that is not in `matchedKeys`. */
  retain(matchedKeys: Set<string>): void {
    for (const key of [...this.entries.keys()]) {
      if (!matchedKeys.has(key)) this.entries.delete(key);
    }
  }

  clear(): void {
    this.entries.clear();
  }

  /** The state of every card that has an alert, by `gameID`. */
  getStates(): Map<string, CardAlertState> {
    const states = new Map<string, CardAlertState>();
    for (const { gameID, isNew } of this.entries.values()) {
      states.set(gameID, { isNew: isNew || states.get(gameID)?.isNew === true });
    }
    return states;
  }
}
