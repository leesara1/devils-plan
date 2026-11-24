class RouletteSoundEngine {
  private ctx: AudioContext | null = null;
  private muted = false;

  private getContext(): AudioContext | null {
    if (this.muted || typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  setMuted(muted: boolean) {
    this.muted = muted;
  }

  private tone(freq: number, duration: number, type: OscillatorType, volume: number, delay = 0) {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + duration + 0.01);
  }

  private noise(duration: number, volume: number, filterFreq: number) {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * duration), ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i += 1) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / data.length) ** 2;
    }
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(filterFreq, now);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(volume, now);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    src.start(now);
  }

  playSelect() {
    this.tone(620, 0.07, 'sine', 0.06);
  }

  playScan() {
    this.tone(880, 0.09, 'sine', 0.05);
    this.tone(1175, 0.12, 'sine', 0.05, 0.08);
  }

  playRotate(steps: number) {
    for (let i = 0; i < steps * 2; i += 1) {
      this.tone(320, 0.04, 'square', 0.04, i * 0.09);
    }
  }

  playManipulate() {
    this.tone(220, 0.12, 'triangle', 0.06);
  }

  playEmptyClick() {
    this.tone(1400, 0.03, 'square', 0.08);
    this.tone(700, 0.05, 'square', 0.05, 0.02);
  }

  playBang() {
    this.noise(0.5, 0.5, 1800);
    this.tone(80, 0.35, 'sine', 0.25);
  }
}

export const rouletteSound = new RouletteSoundEngine();
