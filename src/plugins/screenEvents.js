import { registerPlugin } from '@capacitor/core';

const webImpl = () => ({
  addListener() {
    return Promise.resolve({ remove: async () => {} });
  },
});

/**
 * Android: {@code ACTION_SCREEN_OFF} / {@code ACTION_SCREEN_ON}.
 * iOS: {@code UIApplication} protected-data notifications (lock ≈ off, unlock ≈ on).
 * Web: no-op (use visibility heuristics).
 */
export const ScreenEvents = registerPlugin('ScreenEvents', {
  web: webImpl,
});
