/**
 * LobbyDataManager - Publishes every lobby of every Queue from OpenFront's
 * `public-lobbies-update` DOM event, in Queue order.
 */

import type { Lobby, PublicGamesResponse } from '@/types/game';

type LobbyCallback = (lobbies: Lobby[]) => void;

const QUEUE_ORDER = ['ffa', 'team', 'special', 'hosted'] as const;

interface LobbyDataManagerSingleton {
  subscribers: LobbyCallback[];
  lastLobbies: Lobby[];
  started: boolean;
  publicLobbiesListener: ((event: Event) => void) | null;
  start(): void;
  stop(): void;
  subscribe(callback: LobbyCallback): void;
  notifySubscribers(): void;
  handlePublicLobbiesUpdate(event: Event): void;
  extractLobbies(payload: unknown): Lobby[];
}

export const LobbyDataManager: LobbyDataManagerSingleton = {
  subscribers: [],
  lastLobbies: [],
  started: false,
  publicLobbiesListener: null,

  start() {
    if (this.started) {
      return;
    }

    this.started = true;
    this.publicLobbiesListener = (event) => this.handlePublicLobbiesUpdate(event);
    document.addEventListener('public-lobbies-update', this.publicLobbiesListener);
  },

  stop() {
    if (!this.started) {
      return;
    }

    this.started = false;
    if (this.publicLobbiesListener) {
      document.removeEventListener('public-lobbies-update', this.publicLobbiesListener);
      this.publicLobbiesListener = null;
    }
  },

  subscribe(callback: LobbyCallback) {
    this.subscribers.push(callback);
    if (this.lastLobbies.length > 0) {
      callback(this.lastLobbies);
    }
  },

  notifySubscribers() {
    this.subscribers.forEach((cb) => cb(this.lastLobbies));
  },

  handlePublicLobbiesUpdate(event: Event) {
    const payload = (event as CustomEvent<{ payload?: unknown }>).detail?.payload;
    this.lastLobbies = this.extractLobbies(payload);
    this.notifySubscribers();
  },

  extractLobbies(payload: unknown): Lobby[] {
    if (!payload || typeof payload !== 'object') {
      return [];
    }

    if (Array.isArray((payload as { lobbies?: Lobby[] }).lobbies)) {
      return (payload as { lobbies: Lobby[] }).lobbies;
    }

    const games = (payload as PublicGamesResponse).games;
    if (!games) {
      return [];
    }

    return QUEUE_ORDER.flatMap((queue) =>
      (games[queue] ?? []).map((lobby) => ({
        ...lobby,
        publicGameType: lobby.publicGameType ?? queue,
      }))
    );
  },
};
