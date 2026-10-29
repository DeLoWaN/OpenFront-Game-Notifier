/**
 * LobbyDataManager - Publishes every lobby of every Queue from OpenFront's
 * `public-lobbies-update` DOM event, in Queue order.
 */

import type { Lobby, PublicGamesResponse } from '@/types/game';

/** `serverTime` is the feed's own clock in milliseconds, or null when the feed has none. */
type LobbyCallback = (lobbies: Lobby[], serverTime: number | null) => void;

const QUEUE_ORDER = ['ffa', 'team', 'special', 'hosted'] as const;

interface LobbyDataManagerSingleton {
  subscribers: LobbyCallback[];
  lastLobbies: Lobby[];
  lastServerTime: number | null;
  started: boolean;
  publicLobbiesListener: ((event: Event) => void) | null;
  start(): void;
  stop(): void;
  subscribe(callback: LobbyCallback): void;
  notifySubscribers(): void;
  handlePublicLobbiesUpdate(event: Event): void;
  extractLobbies(payload: unknown): Lobby[];
  extractServerTime(payload: unknown): number | null;
}

export const LobbyDataManager: LobbyDataManagerSingleton = {
  subscribers: [],
  lastLobbies: [],
  lastServerTime: null,
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
      callback(this.lastLobbies, this.lastServerTime);
    }
  },

  notifySubscribers() {
    this.subscribers.forEach((cb) => cb(this.lastLobbies, this.lastServerTime));
  },

  handlePublicLobbiesUpdate(event: Event) {
    const payload = (event as CustomEvent<{ payload?: unknown }>).detail?.payload;
    this.lastLobbies = this.extractLobbies(payload);
    this.lastServerTime = this.extractServerTime(payload);
    this.notifySubscribers();
  },

  extractServerTime(payload: unknown): number | null {
    const serverTime = (payload as { serverTime?: unknown } | null | undefined)?.serverTime;
    return typeof serverTime === 'number' && Number.isFinite(serverTime) ? serverTime : null;
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
