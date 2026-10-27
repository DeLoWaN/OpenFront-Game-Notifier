import { afterEach, describe, expect, it } from 'vitest';
import { LobbyUtils } from '@/utils/LobbyUtils';

describe('LobbyUtils.isOnLobbyPage', () => {
  afterEach(() => {
    document.body.className = '';
    document.body.innerHTML = '';
  });

  it('reports the home page as the lobby page', () => {
    document.body.innerHTML = '<div id="page-play"></div>';
    expect(LobbyUtils.isOnLobbyPage()).toBe(true);
  });

  it('reports a game as not the lobby page when OpenFront marks the body in-game', () => {
    // Streamer mode keeps the URL free of `?live`, so only the body class shows the game.
    document.body.innerHTML = '<div id="page-play"></div>';
    document.body.classList.add('in-game');
    expect(LobbyUtils.isOnLobbyPage()).toBe(false);
  });
});
