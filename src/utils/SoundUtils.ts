/**
 * SoundUtils - Manages audio notifications for the userscript
 *
 * Responsibilities:
 * - Preload sound files from remote URLs
 * - Handle browser audio unlock (required for autoplay)
 * - Play sounds for game events (found, start)
 *
 * Note: Modern browsers require user interaction before playing audio
 * This utility handles that by unlocking on first click/keydown/touch
 */

interface SoundUtilsSingleton {
  gameFoundAudio: HTMLAudioElement | null;
  gameStartAudio: HTMLAudioElement | null;
  audioUnlocked: boolean;
  preloadSounds(): void;
  setupAudioUnlock(): void;
  playGameFoundSound(): void;
  playGameStartSound(): void;
}

export const SoundUtils: SoundUtilsSingleton = {
  gameFoundAudio: null,
  gameStartAudio: null,
  audioUnlocked: false,

  /**
   * Preload sound files and set up audio unlock
   * Call this early in application lifecycle
   */
  preloadSounds() {
    try {
      // Game found notification sound
      this.gameFoundAudio = new Audio(
        'https://github.com/DeLoWaN/openfront-game-notifier/raw/refs/heads/main/notification_sounds/new-notification-014-363678.mp3'
      );
      this.gameFoundAudio.volume = 0.5;
      this.gameFoundAudio.preload = 'auto';

      // Game start notification sound
      this.gameStartAudio = new Audio(
        'https://github.com/DeLoWaN/openfront-game-notifier/raw/refs/heads/main/notification_sounds/opening-bell-421471.mp3'
      );
      this.gameStartAudio.volume = 0.5;
      this.gameStartAudio.preload = 'auto';

      // Set up audio unlock on first user interaction
      this.setupAudioUnlock();
    } catch (e) {
      console.warn('[SoundUtils] Could not preload audio:', e);
    }
  },

  /**
   * Set up audio unlock mechanism
   * Browsers require user interaction before playing audio
   */
  setupAudioUnlock() {
    const unlockAudio = () => {
      if (this.audioUnlocked) return;

      // Try to play and immediately pause both audio elements to unlock them
      const unlockPromises: Promise<void>[] = [];

      if (this.gameFoundAudio) {
        this.gameFoundAudio.volume = 0.01; // Very quiet
        unlockPromises.push(
          this.gameFoundAudio
            .play()
            .then(() => {
              if (this.gameFoundAudio) {
                this.gameFoundAudio.pause();
                this.gameFoundAudio.currentTime = 0;
                this.gameFoundAudio.volume = 0.5; // Restore volume
              }
            })
            .catch(() => {
              // Ignore errors during unlock attempt
            })
        );
      }

      if (this.gameStartAudio) {
        this.gameStartAudio.volume = 0.01; // Very quiet
        unlockPromises.push(
          this.gameStartAudio
            .play()
            .then(() => {
              if (this.gameStartAudio) {
                this.gameStartAudio.pause();
                this.gameStartAudio.currentTime = 0;
                this.gameStartAudio.volume = 0.5; // Restore volume
              }
            })
            .catch(() => {
              // Ignore errors during unlock attempt
            })
        );
      }

      Promise.all(unlockPromises).then(() => {
        this.audioUnlocked = true;
        console.log('[SoundUtils] Audio unlocked successfully');
        // Remove listeners after unlock
        document.removeEventListener('click', unlockAudio);
        document.removeEventListener('keydown', unlockAudio);
        document.removeEventListener('touchstart', unlockAudio);
      });
    };

    // Listen for any user interaction (once each)
    document.addEventListener('click', unlockAudio, { once: true });
    document.addEventListener('keydown', unlockAudio, { once: true });
    document.addEventListener('touchstart', unlockAudio, { once: true });
  },

  /**
   * Play the "game found" notification sound
   */
  playGameFoundSound() {
    if (this.gameFoundAudio) {
      console.log('[SoundUtils] Attempting to play game found sound');
      this.gameFoundAudio.currentTime = 0;
      this.gameFoundAudio.play().catch((err) => {
        console.warn('[SoundUtils] Failed to play game found sound:', err);
      });
    } else {
      console.warn('[SoundUtils] Game found audio not initialized');
    }
  },

  /**
   * Play the "game start" notification sound
   */
  playGameStartSound() {
    if (this.gameStartAudio) {
      console.log('[SoundUtils] Attempting to play game start sound');
      this.gameStartAudio.currentTime = 0;
      this.gameStartAudio.play().catch((err) => {
        console.warn('[SoundUtils] Failed to play game start sound:', err);
      });
    } else {
      console.warn('[SoundUtils] Game start audio not initialized');
    }
  },
};
