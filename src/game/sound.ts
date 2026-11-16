export class SoundEngine {
  private ctx: AudioContext | null = null;
  public muted = false;
  private lastStretchAt = 0;

  private ensureCtx(): AudioContext | null {
    if (this.muted) return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public unlock() {
    this.ensureCtx();
  }

  public playStretch(power: number) {
    const nowMs = performance.now();
    if (nowMs - this.lastStretchAt < 110) return;
    this.lastStretchAt = nowMs;

    const ctx = this.ensureCtx();
    if (!ctx) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    const baseFreq = 110 + power * 180;
    osc.frequency.setValueAtTime(baseFreq, t);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.12, t + 0.06);
    gain.gain.setValueAtTime(0.04, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.07);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.08);
  }

  public playLaunch(power: number) {
    const ctx = this.ensureCtx();
    if (!ctx) return;
    const t = ctx.currentTime;

    // 1. Elastic slingshot twang
    const twang = ctx.createOscillator();
    const twangGain = ctx.createGain();
    twang.type = 'sawtooth';
    twang.frequency.setValueAtTime(140 + power * 90, t);
    twang.frequency.exponentialRampToValueAtTime(55, t + 0.22);
    twangGain.gain.setValueAtTime(0.18, t);
    twangGain.gain.exponentialRampToValueAtTime(0.001, t + 0.24);
    twang.connect(twangGain).connect(ctx.destination);
    twang.start(t);
    twang.stop(t + 0.25);

    // 2. Red Bird battle chirp!
    const chirp = ctx.createOscillator();
    const chirpGain = ctx.createGain();
    chirp.type = 'sine';
    chirp.frequency.setValueAtTime(520, t + 0.04);
    chirp.frequency.exponentialRampToValueAtTime(1120, t + 0.16);
    chirp.frequency.exponentialRampToValueAtTime(760, t + 0.26);
    chirpGain.gain.setValueAtTime(0.001, t);
    chirpGain.gain.linearRampToValueAtTime(0.16, t + 0.06);
    chirpGain.gain.exponentialRampToValueAtTime(0.001, t + 0.28);
    chirp.connect(chirpGain).connect(ctx.destination);
    chirp.start(t);
    chirp.stop(t + 0.3);
  }

  public playBoostChirp() {
    const ctx = this.ensureCtx();
    if (!ctx) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(700, t);
    osc.frequency.exponentialRampToValueAtTime(1600, t + 0.14);
    gain.gain.setValueAtTime(0.18, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.19);
  }

  public playImpact(material: 'wood' | 'ice' | 'stone' | 'ground', intensity: number) {
    const ctx = this.ensureCtx();
    if (!ctx) return;
    const vol = Math.min(0.25, Math.max(0.03, intensity * 0.025));
    const t = ctx.currentTime;

    if (material === 'ice') {
      // High crystalline chime + noise
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1500 + Math.random() * 600, t);
      osc.frequency.exponentialRampToValueAtTime(620, t + 0.12);
      gain.gain.setValueAtTime(vol, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.15);
      return;
    }

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = material === 'stone' ? 'triangle' : 'square';
    const startFreq = material === 'stone' ? 115 : material === 'wood' ? 210 : 150;
    osc.frequency.setValueAtTime(startFreq + Math.random() * 45, t);
    osc.frequency.exponentialRampToValueAtTime(42, t + 0.12);
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.15);
  }

  public playExplosion() {
    const ctx = this.ensureCtx();
    if (!ctx) return;
    const t = ctx.currentTime;

    // White noise burst through low-pass filter
    const bufferSize = Math.floor(ctx.sampleRate * 0.5);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.14));
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(650, t);
    filter.frequency.exponentialRampToValueAtTime(80, t + 0.45);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.4, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.48);

    noise.connect(filter).connect(gain).connect(ctx.destination);
    noise.start(t);

    // Sub boom
    const sub = ctx.createOscillator();
    const subGain = ctx.createGain();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(130, t);
    sub.frequency.exponentialRampToValueAtTime(28, t + 0.4);
    subGain.gain.setValueAtTime(0.35, t);
    subGain.gain.exponentialRampToValueAtTime(0.001, t + 0.42);
    sub.connect(subGain).connect(ctx.destination);
    sub.start(t);
    sub.stop(t + 0.43);
  }

  public playPigPop() {
    const ctx = this.ensureCtx();
    if (!ctx) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(320, t);
    osc.frequency.exponentialRampToValueAtTime(880, t + 0.08);
    osc.frequency.exponentialRampToValueAtTime(180, t + 0.18);
    gain.gain.setValueAtTime(0.22, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.21);
  }

  public playWinFanfare() {
    const ctx = this.ensureCtx();
    if (!ctx) return;
    const t = ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      const start = t + idx * 0.09;
      osc.frequency.setValueAtTime(freq, start);
      gain.gain.setValueAtTime(0.001, start);
      gain.gain.linearRampToValueAtTime(0.16, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.28);
      osc.connect(gain).connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.3);
    });
  }

  public playLoseTone() {
    const ctx = this.ensureCtx();
    if (!ctx) return;
    const t = ctx.currentTime;
    const notes = [392, 349.23, 311.13];
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      const start = t + idx * 0.14;
      osc.frequency.setValueAtTime(freq, start);
      gain.gain.setValueAtTime(0.12, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.24);
      osc.connect(gain).connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.25);
    });
  }
}
