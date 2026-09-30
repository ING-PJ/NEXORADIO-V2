'use client';

/**
 * SoundEffects manager for NEXO Studio & Live Cabina.
 * Uses Web Audio API to synthesize high-fidelity, crisp broadcast studio chimes
 * without relying on external media assets.
 */
class SoundEffects {
  private ctx: AudioContext | null = null;
  private soundEnabled: boolean = true;
  private lastChatSoundTime = 0;
  private lastRequestSoundTime = 0;
  private listeners: Set<(enabled: boolean) => void> = new Set();

  constructor() {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('nexo_studio_sound_alerts');
      this.soundEnabled = saved !== null ? saved === 'true' : true;
    }
  }

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    try {
      if (!this.ctx) {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) {
          this.ctx = new AudioCtx();
        }
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      return this.ctx;
    } catch {
      return null;
    }
  }

  public isEnabled(): boolean {
    return this.soundEnabled;
  }

  public setEnabled(enabled: boolean) {
    this.soundEnabled = enabled;
    if (typeof window !== 'undefined') {
      localStorage.setItem('nexo_studio_sound_alerts', String(enabled));
    }
    this.listeners.forEach((l) => l(enabled));
  }

  public toggle(): boolean {
    const next = !this.soundEnabled;
    this.setEnabled(next);
    if (next) {
      // Play a quick friendly confirmation blip
      this.playChatSound(false);
    }
    return next;
  }

  public subscribe(listener: (enabled: boolean) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Subtle, modern glass ping for new incoming chat messages.
   * Throttled to max 1 sound per 350ms to prevent spam bursts.
   */
  public playChatSound(suppressIfMicActive = false) {
    if (!this.soundEnabled || suppressIfMicActive) return;

    const nowMs = Date.now();
    if (nowMs - this.lastChatSoundTime < 350) return;
    this.lastChatSoundTime = nowMs;

    try {
      const ctx = this.getContext();
      if (!ctx) return;
      const t = ctx.currentTime;

      // Primary crystal sine chime (880 Hz -> A5, slight pitch drop to 830 Hz)
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, t);
      osc.frequency.exponentialRampToValueAtTime(830, t + 0.15);

      gain.gain.setValueAtTime(0.001, t);
      gain.gain.exponentialRampToValueAtTime(0.18, t + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);

      // Soft harmonic overtone (1760 Hz, A6)
      const oscOvertone = ctx.createOscillator();
      const gainOvertone = ctx.createGain();
      oscOvertone.type = 'triangle';
      oscOvertone.frequency.setValueAtTime(1760, t);

      gainOvertone.gain.setValueAtTime(0.001, t);
      gainOvertone.gain.exponentialRampToValueAtTime(0.06, t + 0.01);
      gainOvertone.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

      osc.connect(gain);
      gain.connect(ctx.destination);

      oscOvertone.connect(gainOvertone);
      gainOvertone.connect(ctx.destination);

      osc.start(t);
      osc.stop(t + 0.19);
      oscOvertone.start(t);
      oscOvertone.stop(t + 0.13);
    } catch {
      // AudioContext could be awaiting user gesture
    }
  }

  /**
   * Harmonious 3-note broadcast radio station alert chime for song requests & dedications.
   * D5 (587 Hz) -> F#5 (740 Hz) -> A5 (880 Hz).
   * Throttled to max 1 sound per 600ms.
   */
  public playRequestSound(suppressIfMicActive = false) {
    if (!this.soundEnabled || suppressIfMicActive) return;

    const nowMs = Date.now();
    if (nowMs - this.lastRequestSoundTime < 600) return;
    this.lastRequestSoundTime = nowMs;

    try {
      const ctx = this.getContext();
      if (!ctx) return;
      const t = ctx.currentTime;

      // 3 ascending notes: D5, F#5, A5
      const chord = [
        { freq: 587.33, offset: 0.0, dur: 0.16, gain: 0.18 },
        { freq: 739.99, offset: 0.09, dur: 0.18, gain: 0.20 },
        { freq: 880.0, offset: 0.18, dur: 0.35, gain: 0.22 },
      ];

      chord.forEach(({ freq, offset, dur, gain: targetGain }) => {
        const startTime = t + offset;
        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, startTime);

        gainNode.gain.setValueAtTime(0.0001, startTime);
        gainNode.gain.exponentialRampToValueAtTime(targetGain, startTime + 0.02);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, startTime + dur);

        osc.connect(gainNode);
        gainNode.connect(ctx.destination);

        osc.start(startTime);
        osc.stop(startTime + dur + 0.02);
      });
    } catch {
      // AudioContext could be blocked
    }
  }
}

export const soundEffects = new SoundEffects();
