/**
 * OpenFront Game Notifier
 *
 * Main entry point for the userscript.
 */

import { getStyles } from '@/styles/styles';
import { SoundUtils } from '@/utils/SoundUtils';
import { URLObserver } from '@/utils/URLObserver';
import { LobbyDataManager } from '@/data/LobbyDataManager';
import { LobbyDiscoveryUI } from '@/modules/lobby-discovery/LobbyDiscoveryUI';
import { CurrentPlayerHighlighter } from '@/modules/lobby-discovery/CurrentPlayerHighlighter';

(function () {
  'use strict';

  console.log('[OpenFront Game Notifier] Initializing adaptation for OpenFront 0.30...');

  GM_addStyle(getStyles());
  SoundUtils.preloadSounds();
  URLObserver.init();
  LobbyDataManager.start();

  const lobbyDiscovery = new LobbyDiscoveryUI();
  const currentPlayerHighlighter = new CurrentPlayerHighlighter();

  LobbyDataManager.subscribe((lobbies, serverTime) => {
    lobbyDiscovery.receiveLobbyUpdate(lobbies, serverTime);
  });

  currentPlayerHighlighter.start();

  // OpenFront adds `?live` to the URL exactly when the server's
  // ServerStartGameMessage arrives (history.pushState in OpenFront's
  // Main.ts). Treat the false→true transition as "game just started".
  const isLiveGameUrl = (url: string): boolean => {
    try {
      return new URL(url).searchParams.has('live');
    } catch {
      return false;
    }
  };

  let wasLive = isLiveGameUrl(location.href);
  URLObserver.subscribe((url) => {
    const isLive = isLiveGameUrl(url);
    if (!wasLive && isLive && lobbyDiscovery.isSoundEnabled()) {
      SoundUtils.playGameStartSound();
    }
    wasLive = isLive;
  });

  console.log('[OpenFront Game Notifier] Ready! 🚀');
})();
