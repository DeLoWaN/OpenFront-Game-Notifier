import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BrowserNotificationUtils } from '@/utils/BrowserNotificationUtils';

describe('BrowserNotificationUtils', () => {
  const originalNotification = globalThis.Notification;
  const originalGMNotification = (globalThis as any).GM_notification;

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(document, 'hasFocus').mockReturnValue(true);
    vi.spyOn(window, 'focus').mockImplementation(() => {});
    vi.spyOn(document, 'hidden', 'get').mockReturnValue(false);
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible');
    delete (globalThis as any).GM_notification;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    if (originalNotification) {
      globalThis.Notification = originalNotification;
    } else {
      delete (globalThis as any).Notification;
    }
    if (originalGMNotification) {
      (globalThis as any).GM_notification = originalGMNotification;
    } else {
      delete (globalThis as any).GM_notification;
    }
  });

  it('requests native notification permission from the browser API', async () => {
    const requestPermission = vi.fn().mockResolvedValue('granted');
    const NotificationMock = vi.fn() as any;
    NotificationMock.permission = 'default';
    NotificationMock.requestPermission = requestPermission;
    globalThis.Notification = NotificationMock;

    await expect(BrowserNotificationUtils.ensurePermission()).resolves.toBe(true);
    expect(requestPermission).toHaveBeenCalledTimes(1);
  });

  it('uses the native Notification API for background notifications and focuses on click', () => {
    let clickHandler: VoidFunction | undefined;
    const close = vi.fn();
    const NotificationMock = vi.fn().mockImplementation(function (this: any) {
      this.close = close;
      return this;
    }) as any;
    NotificationMock.permission = 'granted';
    NotificationMock.requestPermission = vi.fn();
    vi.spyOn(document, 'hidden', 'get').mockReturnValue(true);
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');
    vi.spyOn(document, 'hasFocus').mockReturnValue(false);
    Object.defineProperty(NotificationMock.prototype, 'onclick', {
      configurable: true,
      set(handler) {
        clickHandler = handler;
      },
    });
    globalThis.Notification = NotificationMock;

    expect(
      BrowserNotificationUtils.show({
        title: 'OpenFront match found',
        body: 'FFA • 25 slots',
        tag: 'match-1',
      })
    ).toBe(true);

    expect(NotificationMock).toHaveBeenCalledWith('OpenFront match found', {
      body: 'FFA • 25 slots',
    });

    expect(clickHandler).toBeTypeOf('function');
    (clickHandler as VoidFunction)();

    expect(window.focus).toHaveBeenCalledTimes(1);
    expect(close).toHaveBeenCalledTimes(1);
  });

  it('runs the click action after focusing the window, and only on click', () => {
    let clickHandler: VoidFunction | undefined;
    const NotificationMock = vi.fn().mockImplementation(function (this: any) {
      this.close = vi.fn();
      return this;
    }) as any;
    NotificationMock.permission = 'granted';
    vi.spyOn(document, 'hidden', 'get').mockReturnValue(true);
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');
    vi.spyOn(document, 'hasFocus').mockReturnValue(false);
    Object.defineProperty(NotificationMock.prototype, 'onclick', {
      configurable: true,
      set(handler) {
        clickHandler = handler;
      },
    });
    globalThis.Notification = NotificationMock;
    const order: string[] = [];
    vi.mocked(window.focus).mockImplementation(() => order.push('focus'));
    const onClick = vi.fn(() => order.push('action'));

    BrowserNotificationUtils.show({ title: 't', body: 'b', tag: 'k', onClick });
    expect(onClick).not.toHaveBeenCalled();

    (clickHandler as VoidFunction)();
    expect(order).toEqual(['focus', 'action']);
  });

  it('does not report support when the native Notification API is unavailable', () => {
    const gmNotification = vi.fn();
    delete (globalThis as any).Notification;
    (globalThis as any).GM_notification = gmNotification;

    expect(BrowserNotificationUtils.isSupported()).toBe(false);
  });

  it('uses native Notification even when GM_notification is also available', () => {
    const gmNotification = vi.fn();
    const NotificationMock = vi.fn() as any;
    NotificationMock.permission = 'granted';
    NotificationMock.requestPermission = vi.fn();
    globalThis.Notification = NotificationMock;
    (globalThis as any).GM_notification = gmNotification;
    vi.spyOn(document, 'hidden', 'get').mockReturnValue(true);
    vi.spyOn(document, 'hasFocus').mockReturnValue(false);

    expect(
      BrowserNotificationUtils.show({
        title: 'OpenFront match found',
        body: 'Quads',
        tag: 'match-4',
      })
    ).toBe(true);

    expect(NotificationMock).toHaveBeenCalledTimes(1);
    expect(gmNotification).not.toHaveBeenCalled();
    const [, options] = NotificationMock.mock.calls[0] ?? [];
    expect(options?.tag).toBeUndefined();
  });

  it('suppresses browser notifications while the page is visible and focused', () => {
    const NotificationMock = vi.fn() as any;
    NotificationMock.permission = 'granted';
    NotificationMock.requestPermission = vi.fn();
    globalThis.Notification = NotificationMock;

    expect(
      BrowserNotificationUtils.show({
        title: 'OpenFront match found',
        body: 'Trios',
        tag: 'match-3',
      })
    ).toBe(false);

    expect(NotificationMock).not.toHaveBeenCalled();
  });
});
