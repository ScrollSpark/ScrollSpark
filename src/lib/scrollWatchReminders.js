/**
 * Hourly "Reactivate Scroll Watch?" reminders for 4 hours (browser tab must stay
 * alive; true background push requires a server + service worker push subscription).
 */

import { getLocalHourMinuteInTimezone, isWithinSleepWindowLocal } from '@/lib/sparkPersonalization';

const HOUR_MS = 60 * 60 * 1000;
const REMINDER_COUNT = 4;

let timeoutIds = [];
/** @type {{ sleepStart: string | null, sleepEnd: string | null, timezone: string } | null} */
let reminderOptions = null;

export function cancelScrollWatchReactivateReminders() {
  timeoutIds.forEach((id) => clearTimeout(id));
  timeoutIds = [];
  reminderOptions = null;
}

function showReactivateNotification() {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;
  try {
    const n = new Notification('Reactivate Scroll Watch?', {
      body: 'Open ScrollSpark when you are ready to track scrolling again.',
      tag: 'scrollwatch-reactivate',
      renotify: true,
    });
    n.onclick = () => {
      try {
        window.focus();
      } catch {
        /* ignore */
      }
      n.close();
    };
  } catch (e) {
    console.warn('Notification failed:', e);
  }
}

/**
 * Skips the notification when local time (user timezone) is inside profile sleep window.
 */
function maybeShowReactivateNotification() {
  const opts = reminderOptions;
  const tz =
    (opts?.timezone && String(opts.timezone).trim()) ||
    (typeof Intl !== 'undefined' && Intl.DateTimeFormat().resolvedOptions().timeZone) ||
    '';
  const sleepStart = opts?.sleepStart && String(opts.sleepStart).trim() ? opts.sleepStart : null;
  const sleepEnd = opts?.sleepEnd && String(opts.sleepEnd).trim() ? opts.sleepEnd : null;

  if (sleepStart && sleepEnd && tz) {
    const { hour, minute } = getLocalHourMinuteInTimezone(tz);
    if (isWithinSleepWindowLocal(hour, minute, sleepStart, sleepEnd)) {
      return;
    }
  }

  showReactivateNotification();
}

/**
 * @param {{ sleepStart?: string | null, sleepEnd?: string | null, timezone?: string | null }} [options]
 * From Settings → Extra profile: usual sleep (Fall asleep / Wake) + time zone.
 */
export function scheduleScrollWatchReactivateReminders(options = {}) {
  cancelScrollWatchReactivateReminders();
  reminderOptions = {
    sleepStart: options.sleepStart != null ? String(options.sleepStart) : null,
    sleepEnd: options.sleepEnd != null ? String(options.sleepEnd) : null,
    timezone:
      (options.timezone && String(options.timezone).trim()) ||
      (typeof Intl !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone : ''),
  };
  for (let i = 1; i <= REMINDER_COUNT; i += 1) {
    const id = setTimeout(maybeShowReactivateNotification, i * HOUR_MS);
    timeoutIds.push(id);
  }
}

/**
 * @returns {'granted' | 'denied' | 'default'}
 */
export async function requestNotificationPermissionIfNeeded() {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'denied';
  if (Notification.permission === 'granted') return 'granted';
  if (Notification.permission === 'denied') return 'denied';
  return Notification.requestPermission();
}
