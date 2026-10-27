import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LobbyDataManager } from '@/data/LobbyDataManager';
import type { Lobby } from '@/types/game';

function dispatchPayload(payload: unknown): void {
  document.dispatchEvent(new CustomEvent('public-lobbies-update', { detail: { payload } }));
}

describe('LobbyDataManager', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.useFakeTimers();
    LobbyDataManager.stop();
    LobbyDataManager.subscribers = [];
    LobbyDataManager.lastLobbies = [];
    globalThis.fetch = vi.fn() as any;
  });

  afterEach(() => {
    LobbyDataManager.stop();
    LobbyDataManager.subscribers = [];
    LobbyDataManager.lastLobbies = [];
    globalThis.fetch = originalFetch;
    vi.useRealTimers();
  });

  it('publishes every lobby of every Queue, the Hosted Queue included, in Queue order', () => {
    const received: Lobby[][] = [];
    LobbyDataManager.start();
    LobbyDataManager.subscribe((lobbies) => received.push(lobbies));

    dispatchPayload({
      serverTime: 1,
      games: {
        ffa: [
          { gameID: 'ffa-0', gameConfig: { gameMode: 'Free For All' } },
          { gameID: 'ffa-1', gameConfig: { gameMode: 'Free For All' } },
          { gameID: 'ffa-2', gameConfig: { gameMode: 'Free For All' } },
        ],
        team: [{ gameID: 'team-0', gameConfig: { gameMode: 'Team' } }],
        hosted: [{ gameID: 'hosted-0', gameConfig: { gameMode: 'Free For All' } }],
      },
    });

    expect(received).toHaveLength(1);
    expect(received[0]!.map((lobby) => [lobby.gameID, lobby.publicGameType])).toEqual([
      ['ffa-0', 'ffa'],
      ['ffa-1', 'ffa'],
      ['ffa-2', 'ffa'],
      ['team-0', 'team'],
      ['hosted-0', 'hosted'],
    ]);
  });

  it('never calls an HTTP endpoint, even when no feed update arrives', async () => {
    LobbyDataManager.start();

    await vi.advanceTimersByTimeAsync(60_000);

    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it('stops publishing after stop()', () => {
    const received: Lobby[][] = [];
    LobbyDataManager.start();
    LobbyDataManager.subscribe((lobbies) => received.push(lobbies));
    LobbyDataManager.stop();

    dispatchPayload({ games: { ffa: [{ gameID: 'late', gameConfig: { gameMode: 'Free For All' } }] } });

    expect(received).toHaveLength(0);
  });
});
