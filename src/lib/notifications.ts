// ============================================================
// Chase Mail Notification & Audio Engine
// Web Notifications, Web Audio Chime, App Badges & PWA Alerts
// ============================================================

export interface NotificationPreferences {
  systemNotifications: boolean;
  soundEnabled: boolean;
  appBadgeEnabled: boolean;
}

const PREFS_KEY = 'chase-mail-notification-prefs';

export function getNotificationPreferences(): NotificationPreferences {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch {}
  return {
    systemNotifications: true,
    soundEnabled: true,
    appBadgeEnabled: true
  };
}

export function saveNotificationPreferences(prefs: NotificationPreferences): void {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch {}
}

let audioCtx: AudioContext | null = null;

/**
 * Modern luxury two-tone audio chime synthesized via Web Audio API.
 * Requires no external audio assets or network downloads.
 */
export function playChimeSound(): void {
  const prefs = getNotificationPreferences();
  if (!prefs.soundEnabled) return;

  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;

    if (!audioCtx) {
      audioCtx = new AudioCtx();
    }

    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }

    const now = audioCtx.currentTime;

    // Harmonic Tone 1: 587.33 Hz (D5) - warm celestial onset
    const osc1 = audioCtx.createOscillator();
    const gain1 = audioCtx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, now);
    gain1.gain.setValueAtTime(0.12, now);
    gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.38);

    osc1.connect(gain1);
    gain1.connect(audioCtx.destination);
    osc1.start(now);
    osc1.stop(now + 0.38);

    // Harmonic Tone 2: 880 Hz (A5) - clear crystal chime resolution
    const osc2 = audioCtx.createOscillator();
    const gain2 = audioCtx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880, now + 0.12);
    gain2.gain.setValueAtTime(0.18, now + 0.12);
    gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.65);

    osc2.connect(gain2);
    gain2.connect(audioCtx.destination);
    osc2.start(now + 0.12);
    osc2.stop(now + 0.65);
  } catch (err) {
    console.warn('[Chase Mail Audio] Could not play notification chime:', err);
  }
}

/**
 * Updates the PWA App Icon Badge on home screen, dock, or taskbar.
 */
export function updateAppBadge(count: number): void {
  const prefs = getNotificationPreferences();
  if (!prefs.appBadgeEnabled) return;

  try {
    if ('setAppBadge' in navigator) {
      if (count > 0) {
        (navigator as any).setAppBadge(count).catch(() => {});
      } else {
        (navigator as any).clearAppBadge().catch(() => {});
      }
    }
  } catch {}
}

/**
 * Requests notification permission from user.
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    return 'denied';
  }
  try {
    return await Notification.requestPermission();
  } catch (err) {
    console.warn('[Chase Mail] Notification request error:', err);
    return Notification.permission;
  }
}

/**
 * Dispatches a native operating system / mobile push notification.
 */
export async function showSystemNotification(
  title: string,
  options?: NotificationOptions & { onClick?: () => void }
): Promise<Notification | null> {
  const prefs = getNotificationPreferences();
  if (!prefs.systemNotifications) return null;
  if (!('Notification' in window) || Notification.permission !== 'granted') return null;

  try {
    // Try service worker first for mobile background delivery
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg && 'showNotification' in reg) {
        await reg.showNotification(title, {
          icon: '/apple-touch-icon.png',
          badge: '/icon-192.png',
          vibrate: [200, 100, 200],
          ...options
        } as any);
        return null;
      }
    }

    const notif = new Notification(title, {
      icon: '/apple-touch-icon.png',
      badge: '/icon-192.png',
      ...options
    });

    if (options?.onClick) {
      notif.onclick = () => {
        window.focus();
        options.onClick!();
        notif.close();
      };
    }

    return notif;
  } catch (err) {
    console.warn('[Chase Mail] System notification error:', err);
    return null;
  }
}
