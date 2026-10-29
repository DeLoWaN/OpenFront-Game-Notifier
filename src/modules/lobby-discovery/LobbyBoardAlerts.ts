/**
 * The "New" badges of the Lobby Board cards. They live in memory only.
 *
 * A lobby gets a badge when it starts to match while the window has no focus.
 * The badge is keyed by the notification dedup key, so a lobby whose
 * configuration changes can get a new badge.
 */

export class LobbyBoardAlerts {
  private entries = new Map<string, string>();

  /** Gives the lobby of one key a badge. */
  alert(key: string, gameID: string): void {
    this.entries.set(key, gameID);
  }

  /** Forgets the badge of every key that is not in `matchedKeys`. */
  retain(matchedKeys: Set<string>): void {
    for (const key of [...this.entries.keys()]) {
      if (!matchedKeys.has(key)) this.entries.delete(key);
    }
  }

  /** Removes every badge. */
  clear(): void {
    this.entries.clear();
  }

  /** The `gameID` of every card that shows a badge. */
  getNewGameIds(): Set<string> {
    return new Set(this.entries.values());
  }
}
