import { SoundProfile } from './types';

const SOUND_PROFILE_KEY = 'chase-mail-sound-profile';

export function getSoundProfile(): SoundProfile {
  try {
    const saved = localStorage.getItem(SOUND_PROFILE_KEY);
    if (saved && ['executive', 'cyber', 'minimal', 'mute'].includes(saved)) {
      return saved as SoundProfile;
    }
  } catch {}
  return 'executive';
}

export function saveSoundProfile(profile: SoundProfile): void {
  try {
    localStorage.setItem(SOUND_PROFILE_KEY, profile);
  } catch {}
}

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return null;
    if (!audioCtx) audioCtx = new AudioCtx();
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    return audioCtx;
  } catch {
    return null;
  }
}

/**
 * High-fidelity Web Audio sound generator for system feedback
 */
export function playMailSound(
  event: 'receive' | 'send' | 'trash' | 'snooze' | 'action' | 'star' | 'archive' | 'theme' = 'receive',
  overrideProfile?: SoundProfile
): void {
  const profile = overrideProfile || getSoundProfile();
  if (profile === 'mute') return;

  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;

  if (profile === 'executive') {
    if (event === 'receive') {
      // Crystal two-tone harmonic chime
      playTone(ctx, 880, now, 0.4, 0.12);
      playTone(ctx, 1318.5, now + 0.12, 0.6, 0.15);
    } else if (event === 'send') {
      // Ascending sleek whoosh chime
      playTone(ctx, 587.33, now, 0.2, 0.1);
      playTone(ctx, 880, now + 0.08, 0.35, 0.12);
      playTone(ctx, 1174.66, now + 0.16, 0.5, 0.15);
    } else if (event === 'trash') {
      // Soft descending click
      playTone(ctx, 440, now, 0.2, 0.08);
      playTone(ctx, 293.66, now + 0.08, 0.25, 0.08);
    } else if (event === 'snooze') {
      // Gentle hourglass chime
      playTone(ctx, 659.25, now, 0.25, 0.1);
      playTone(ctx, 987.77, now + 0.1, 0.35, 0.12);
    } else if (event === 'star') {
      // Star shimmer sparkle
      playTone(ctx, 1046.5, now, 0.3, 0.1);
      playTone(ctx, 1567.98, now + 0.1, 0.5, 0.14);
    } else if (event === 'archive') {
      // Soft swift sweep
      playTone(ctx, 659.25, now, 0.2, 0.08);
      playTone(ctx, 523.25, now + 0.08, 0.25, 0.1);
    } else if (event === 'theme') {
      // Harmonic resonant flourish
      playTone(ctx, 523.25, now, 0.2, 0.1);
      playTone(ctx, 783.99, now + 0.08, 0.3, 0.12);
      playTone(ctx, 1046.5, now + 0.16, 0.4, 0.15);
    } else if (event === 'action') {
      // Quick crisp confirmation
      playTone(ctx, 1046.5, now, 0.18, 0.1);
    }
  } else if (profile === 'cyber') {
    if (event === 'receive') {
      playCyberBlip(ctx, 440, 1200, now, 0.18);
    } else if (event === 'send') {
      playCyberBlip(ctx, 600, 1600, now, 0.22);
    } else if (event === 'star') {
      playCyberBlip(ctx, 800, 2400, now, 0.15);
    } else if (event === 'theme') {
      playCyberBlip(ctx, 300, 1800, now, 0.25);
    } else if (event === 'action') {
      playCyberBlip(ctx, 700, 1400, now, 0.1);
    } else {
      playCyberBlip(ctx, 800, 300, now, 0.15);
    }
  } else if (profile === 'minimal') {
    // Subtle low acoustic wooden pop
    playTone(ctx, 320, now, 0.08, 0.04);
  }
}

function playTone(
  ctx: AudioContext,
  freq: number,
  startTime: number,
  duration: number,
  gainLevel: number
) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(freq, startTime);

  gain.gain.setValueAtTime(0.001, startTime);
  gain.gain.exponentialRampToValueAtTime(gainLevel, startTime + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(startTime);
  osc.stop(startTime + duration + 0.05);
}

function playCyberBlip(
  ctx: AudioContext,
  startFreq: number,
  endFreq: number,
  startTime: number,
  duration: number
) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'triangle';
  osc.frequency.setValueAtTime(startFreq, startTime);
  osc.frequency.exponentialRampToValueAtTime(endFreq, startTime + duration * 0.8);

  gain.gain.setValueAtTime(0.001, startTime);
  gain.gain.exponentialRampToValueAtTime(0.12, startTime + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(startTime);
  osc.stop(startTime + duration + 0.05);
}
