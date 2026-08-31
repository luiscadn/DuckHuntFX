/**
 * All sound is synthesised with the Web Audio API — no audio files.
 * One shared bus with a master gain, a lightweight SFX kit, and a small
 * chiptune loop that can be toggled from the menu.
 */

type Wave = OscillatorType;

class AudioBus {
  private ctx: AudioContext | null = null;
  private master!: GainNode;
  private musicGain!: GainNode;
  private sfxGain!: GainNode;
  private _muted = false;
  private _musicOn = true;
  private _sfxOn = true;
  private _intensity = 0;
  private _boss = false;
  private musicTimer: number | null = null;
  private step = 0;
  private nextNoteTime = 0;

  /** Must be called from a user gesture (click / keydown) to satisfy autoplay rules. */
  unlock(): void {
    if (!this.ctx) {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new Ctx();
      this.master = this.ctx.createGain();
      this.master.gain.value = this._muted ? 0 : 0.9;
      this.master.connect(this.ctx.destination);
      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = 0.35;
      this.musicGain.connect(this.master);
      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = 1;
      this.sfxGain.connect(this.master);
    }
    if (this.ctx.state === "suspended") void this.ctx.resume();
  }

  get muted(): boolean {
    return this._muted;
  }
  setMuted(m: boolean): void {
    this._muted = m;
    if (this.master) this.master.gain.value = m ? 0 : 0.9;
  }
  toggleMute(): boolean {
    this.setMuted(!this._muted);
    return this._muted;
  }

  get musicOn(): boolean {
    return this._musicOn;
  }
  setMusic(on: boolean): void {
    this._musicOn = on;
    if (on) this.startMusic();
    else this.stopMusic();
  }

  get sfxOn(): boolean {
    return this._sfxOn;
  }
  setSfx(on: boolean): void {
    this._sfxOn = on;
    if (this.sfxGain) this.sfxGain.gain.value = on ? 1 : 0;
  }

  /** Sync audio toggles from the persisted settings. */
  applySettings(s: { music: boolean; sfx: boolean }): void {
    this.setSfx(s.sfx);
    this.setMusic(s.music);
  }

  /** 0..3 — how many layers of the loop are playing. Set from the game scene. */
  setIntensity(n: number): void {
    this._intensity = Math.max(0, Math.min(3, Math.round(n)));
  }
  setBossMode(on: boolean): void {
    this._boss = on;
  }

  // ── low-level voices ─────────────────────────────────────────────

  private tone(opts: {
    freq: number;
    dur: number;
    type?: Wave;
    vol?: number;
    to?: number;
    attack?: number;
    delay?: number;
    dest?: AudioNode;
  }): void {
    if (!this.ctx) return;
    const t0 = this.ctx.currentTime + (opts.delay ?? 0);
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    const vol = opts.vol ?? 0.3;
    const atk = opts.attack ?? 0.005;
    osc.type = opts.type ?? "square";
    osc.frequency.setValueAtTime(opts.freq, t0);
    if (opts.to) osc.frequency.exponentialRampToValueAtTime(Math.max(1, opts.to), t0 + opts.dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + atk);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + opts.dur);
    osc.connect(g).connect(opts.dest ?? this.sfxGain);
    osc.start(t0);
    osc.stop(t0 + opts.dur + 0.02);
  }

  private noise(opts: {
    dur: number;
    vol?: number;
    type?: BiquadFilterType;
    freq?: number;
    to?: number;
    delay?: number;
  }): void {
    if (!this.ctx) return;
    const t0 = this.ctx.currentTime + (opts.delay ?? 0);
    const frames = Math.floor(this.ctx.sampleRate * opts.dur);
    const buf = this.ctx.createBuffer(1, frames, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < frames; i++) data[i] = Math.random() * 2 - 1;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const filter = this.ctx.createBiquadFilter();
    filter.type = opts.type ?? "lowpass";
    filter.frequency.setValueAtTime(opts.freq ?? 1200, t0);
    if (opts.to) filter.frequency.exponentialRampToValueAtTime(Math.max(40, opts.to), t0 + opts.dur);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(opts.vol ?? 0.3, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + opts.dur);
    src.connect(filter).connect(g).connect(this.sfxGain);
    src.start(t0);
    src.stop(t0 + opts.dur + 0.02);
  }

  // ── SFX kit ──────────────────────────────────────────────────────

  shoot(): void {
    this.noise({ dur: 0.16, vol: 0.5, type: "lowpass", freq: 3200, to: 300 });
    this.tone({ freq: 180, to: 60, dur: 0.14, type: "square", vol: 0.25 });
  }
  dryFire(): void {
    this.noise({ dur: 0.04, vol: 0.25, type: "highpass", freq: 2600 });
    this.tone({ freq: 900, to: 500, dur: 0.05, type: "square", vol: 0.12 });
  }
  reload(): void {
    this.tone({ freq: 320, dur: 0.06, type: "square", vol: 0.2 });
    this.tone({ freq: 520, dur: 0.06, type: "square", vol: 0.2, delay: 0.11 });
    this.noise({ dur: 0.05, vol: 0.18, freq: 1800, delay: 0.2 });
  }
  quack(): void {
    this.tone({ freq: 260, to: 150, dur: 0.12, type: "sawtooth", vol: 0.22 });
    this.tone({ freq: 220, to: 130, dur: 0.12, type: "sawtooth", vol: 0.18, delay: 0.1 });
  }
  hit(combo = 1): void {
    const base = 420 + combo * 90;
    this.tone({ freq: base, to: base * 1.9, dur: 0.12, type: "square", vol: 0.28 });
    this.tone({ freq: base * 1.5, dur: 0.09, type: "triangle", vol: 0.18, delay: 0.02 });
    this.noise({ dur: 0.08, vol: 0.15, freq: 5000, to: 1200 });
  }
  coin(): void {
    this.tone({ freq: 988, dur: 0.08, type: "square", vol: 0.2 });
    this.tone({ freq: 1319, dur: 0.14, type: "square", vol: 0.2, delay: 0.08 });
  }
  powerup(): void {
    for (let i = 0; i < 4; i++) {
      this.tone({ freq: 440 * Math.pow(1.26, i), dur: 0.09, type: "square", vol: 0.2, delay: i * 0.06 });
    }
  }
  clank(): void {
    this.tone({ freq: 1400, to: 600, dur: 0.06, type: "square", vol: 0.22 });
    this.noise({ dur: 0.08, vol: 0.22, type: "bandpass", freq: 2600, to: 900 });
    this.tone({ freq: 320, dur: 0.05, type: "triangle", vol: 0.14, delay: 0.02 });
  }
  explode(): void {
    this.noise({ dur: 0.5, vol: 0.55, type: "lowpass", freq: 1400, to: 60 });
    this.tone({ freq: 120, to: 40, dur: 0.4, type: "sawtooth", vol: 0.3 });
    this.tone({ freq: 60, to: 30, dur: 0.5, type: "square", vol: 0.22, delay: 0.04 });
  }
  thunder(): void {
    this.noise({ dur: 1.1, vol: 0.4, type: "lowpass", freq: 400, to: 40 });
    this.tone({ freq: 70, to: 32, dur: 0.9, type: "sawtooth", vol: 0.2, delay: 0.05 });
  }
  golden(): void {
    for (let i = 0; i < 5; i++) {
      this.tone({ freq: 1046 * Math.pow(1.18, i), dur: 0.12, type: "triangle", vol: 0.14, delay: i * 0.05 });
    }
  }
  comboLost(): void {
    this.tone({ freq: 520, to: 180, dur: 0.22, type: "sawtooth", vol: 0.18 });
  }
  achievement(): void {
    const notes = [659, 784, 988, 1319];
    notes.forEach((f, i) => this.tone({ freq: f, dur: 0.13, type: "square", vol: 0.2, delay: i * 0.09 }));
    this.tone({ freq: 1319, dur: 0.3, type: "triangle", vol: 0.14, delay: 0.36 });
  }
  /** Croc surfacing with a smug grin: a low hiss + a tail slap on the water. */
  taunt(): void {
    this.noise({ dur: 0.32, vol: 0.28, type: "highpass", freq: 3200, to: 1400 });
    this.tone({ freq: 90, to: 55, dur: 0.16, type: "sawtooth", vol: 0.2, delay: 0.18 });
    this.noise({ dur: 0.14, vol: 0.3, type: "lowpass", freq: 900, to: 120, delay: 0.18 });
  }
  chomp(): void {
    this.tone({ freq: 220, to: 60, dur: 0.07, type: "square", vol: 0.24 });
    this.noise({ dur: 0.06, vol: 0.26, type: "lowpass", freq: 1600, to: 200 });
  }
  levelUp(): void {
    const notes = [523, 659, 784, 1047];
    notes.forEach((f, i) => this.tone({ freq: f, dur: 0.16, type: "square", vol: 0.24, delay: i * 0.11 }));
  }
  gameOver(): void {
    const notes = [392, 330, 294, 196];
    notes.forEach((f, i) => this.tone({ freq: f, dur: 0.32, type: "triangle", vol: 0.3, delay: i * 0.2 }));
  }
  uiMove(): void {
    this.tone({ freq: 620, dur: 0.04, type: "square", vol: 0.12 });
  }
  uiConfirm(): void {
    this.tone({ freq: 660, dur: 0.07, type: "square", vol: 0.18 });
    this.tone({ freq: 990, dur: 0.09, type: "square", vol: 0.18, delay: 0.06 });
  }
  uiBack(): void {
    this.tone({ freq: 440, to: 300, dur: 0.09, type: "square", vol: 0.16 });
  }

  // ── weapon reports ───────────────────────────────────────────────

  shotgunBlast(): void {
    this.noise({ dur: 0.24, vol: 0.6, type: "lowpass", freq: 2600, to: 180 });
    this.tone({ freq: 150, to: 45, dur: 0.2, type: "square", vol: 0.3 });
  }
  rifleShot(): void {
    this.noise({ dur: 0.1, vol: 0.55, type: "highpass", freq: 1400 });
    this.tone({ freq: 260, to: 70, dur: 0.16, type: "sawtooth", vol: 0.3 });
    this.tone({ freq: 90, dur: 0.12, type: "square", vol: 0.2, delay: 0.02 });
  }
  smgShot(): void {
    this.noise({ dur: 0.05, vol: 0.32, type: "lowpass", freq: 2600, to: 600 });
    this.tone({ freq: 220, to: 120, dur: 0.05, type: "square", vol: 0.14 });
  }

  // ── adaptive chiptune loop ───────────────────────────────────────

  private readonly baseBass = [55, 55, 82.4, 55, 73.4, 73.4, 98, 82.4];
  private readonly baseLead = [
    440, 0, 523, 587, 659, 0, 587, 523, 494, 0, 587, 494, 440, 0, 392, 440,
  ];
  private readonly bossBass = [49, 49, 49, 58.3, 55, 55, 43.7, 49];
  private readonly bossLead = [
    587, 0, 698, 0, 622, 0, 587, 523, 466, 0, 523, 0, 587, 622, 698, 740,
  ];

  startMusic(): void {
    if (!this.ctx || !this._musicOn || this.musicTimer !== null) return;
    this.step = 0;
    this.nextNoteTime = this.ctx.currentTime + 0.1;
    this.musicTimer = window.setInterval(() => this.scheduler(), 25);
  }
  stopMusic(): void {
    if (this.musicTimer !== null) {
      clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
  }
  private scheduler(): void {
    if (!this.ctx) return;
    const bass = this._boss ? this.bossBass : this.baseBass;
    const lead = this._boss ? this.bossLead : this.baseLead;
    const bpm = this._boss ? 150 : 112;
    const spb = 60 / bpm / 2; // eighth notes

    while (this.nextNoteTime < this.ctx.currentTime + 0.15) {
      const s = this.step;
      const delay = this.nextNoteTime - this.ctx.currentTime;
      const i = this._intensity;

      this.tone({ freq: bass[s % bass.length], dur: spb * 0.9, type: "triangle", vol: 0.28, delay, dest: this.musicGain });
      if (this._boss || i >= 1) this.tone({ freq: bass[s % bass.length] / 2, dur: spb * 0.95, type: "square", vol: 0.16, delay, dest: this.musicGain });

      const note = lead[s % lead.length];
      if ((this._boss || i >= 1) && note > 0) {
        this.tone({ freq: note, dur: spb * 0.8, type: "square", vol: 0.12, delay, dest: this.musicGain });
        if (i >= 3) this.tone({ freq: note * 2, dur: spb * 0.5, type: "square", vol: 0.06, delay, dest: this.musicGain });
      }
      if (i >= 2 && s % 2 === 1) {
        this.tone({ freq: note > 0 ? note * 1.5 : 660, dur: spb * 0.4, type: "triangle", vol: 0.07, delay, dest: this.musicGain });
      }
      if ((i >= 2 || this._boss) && s % 2 === 0) this.noise({ dur: 0.03, vol: 0.06, freq: 9000, delay });
      if ((i >= 3 || this._boss) && s % 4 === 2) this.noise({ dur: 0.09, vol: 0.14, type: "bandpass", freq: 1800, delay });

      this.nextNoteTime += spb;
      this.step = (this.step + 1) % 16;
    }
  }
}

export const Audio = new AudioBus();
