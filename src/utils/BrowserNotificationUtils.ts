export interface BrowserNotificationPayload {
  title: string;
  body: string;
  tag: string;
  /** Runs after the window gets focus, when the user clicks the notification. */
  onClick?: () => void;
}

interface BrowserNotificationUtilsSingleton {
  isSupported(): boolean;
  isBackgrounded(): boolean;
  ensurePermission(): Promise<boolean>;
  show(payload: BrowserNotificationPayload): boolean;
  focusWindow(): void;
}

export const BrowserNotificationUtils: BrowserNotificationUtilsSingleton = {
  isSupported() {
    return typeof Notification !== 'undefined';
  },

  isBackgrounded() {
    const hidden =
      document.visibilityState === 'hidden' ||
      document.hidden;
    const focused =
      typeof document.hasFocus === 'function' ? document.hasFocus() : true;

    return hidden || !focused;
  },

  async ensurePermission() {
    if (typeof Notification === 'undefined') {
      return false;
    }

    if (Notification.permission === 'granted') {
      return true;
    }

    if (Notification.permission === 'denied') {
      return false;
    }

    try {
      return (await Notification.requestPermission()) === 'granted';
    } catch (error) {
      console.warn('[BrowserNotificationUtils] Permission request failed:', error);
      return false;
    }
  },

  show(payload) {
    if (!this.isSupported() || !this.isBackgrounded()) {
      return false;
    }

    if (Notification.permission === 'granted') {
      const notification = new Notification(payload.title, {
        body: payload.body,
      });
      notification.onclick = () => {
        this.focusWindow();
        payload.onClick?.();
        notification.close();
      };
      return true;
    }

    return false;
  },

  focusWindow() {
    window.focus();
  },
};
