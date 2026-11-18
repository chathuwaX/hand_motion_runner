/**
 * AudioManager.js
 * High-performance Web Audio API procedural sound synthesizer.
 * Generates custom sound effects (Jump, Slide, Coin, Crash, UI)
 * and an adaptive arcade synth soundtrack without external audio files.
 */

export class AudioManager {
  constructor() {
    this.ctx = null;
    this.isMuted = false;
    this.sfxVolume = 0.8;
    this.bgmVolume = 0.5;
    this.masterVolume = 0.8;
    this.bgmPlaying = false;
    this.bgmTimer = null;
    this.currentTempo = 120; // BPM

    // Master gain node
    this.masterGain = null;
    this.sfxGain = null;
    this.bgmGain = null;

    // Load saved settings
    this.loadSettings();
  }

  init() {
    if (this.ctx) return;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioContext();

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.masterVolume, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.setValueAtTime(this.sfxVolume, this.ctx.currentTime);
      this.sfxGain.connect(this.masterGain);

      this.bgmGain = this.ctx.createGain();
      this.bgmGain.gain.setValueAtTime(this.bgmVolume, this.ctx.currentTime);
      this.bgmGain.connect(this.masterGain);
    } catch (e) {
      console.warn('Web Audio API not supported or blocked:', e);
    }
  }

  unlock() {
    this.init();
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  loadSettings() {
    try {
      const saved = localStorage.getItem('motion_runner_audio');
      if (saved) {
        const data = JSON.parse(saved);
        if (typeof data.sfxVolume === 'number') this.sfxVolume = data.sfxVolume;
        if (typeof data.bgmVolume === 'number') this.bgmVolume = data.bgmVolume;
        if (typeof data.masterVolume === 'number') this.masterVolume = data.masterVolume;
        if (typeof data.isMuted === 'boolean') this.isMuted = data.isMuted;
      }
    } catch (e) {
      console.warn('Failed to load audio settings:', e);
    }
  }

  saveSettings() {
    try {
      localStorage.setItem('motion_runner_audio', JSON.stringify({
        sfxVolume: this.sfxVolume,
        bgmVolume: this.bgmVolume,
        masterVolume: this.masterVolume,
        isMuted: this.isMuted
      }));
    } catch (e) {
      console.warn('Failed to save audio settings:', e);
    }
  }

  setMasterVolume(val) {
    this.masterVolume = Math.max(0, Math.min(1, val));
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.masterVolume, this.ctx.currentTime);
    }
    this.saveSettings();
  }

  setSfxVolume(val) {
    this.sfxVolume = Math.max(0, Math.min(1, val));
    if (this.sfxGain && this.ctx) {
      this.sfxGain.gain.setValueAtTime(this.sfxVolume, this.ctx.currentTime);
    }
    this.saveSettings();
  }

  setBgmVolume(val) {
    this.bgmVolume = Math.max(0, Math.min(1, val));
    if (this.bgmGain && this.ctx) {
      this.bgmGain.gain.setValueAtTime(this.bgmVolume, this.ctx.currentTime);
    }
    this.saveSettings();
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.masterVolume, this.ctx.currentTime);
    }
    this.saveSettings();
    return this.isMuted;
  }

  // --- Procedural Sound Effects ---

  /** Jump SFX: Upward frequency pitch glide */
  playJump() {
    if (!this.ctx || this.isMuted) return;
    this.unlock();
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.exponentialRampToValueAtTime(520, now + 0.22);

    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.25);
  }

  /** Slide SFX: Low frequency swoosh with resonant filter */
  playSlide() {
    if (!this.ctx || this.isMuted) return;
    this.unlock();
    const now = this.ctx.currentTime;
    
    // Noise buffer for swoosh
    const bufferSize = this.ctx.sampleRate * 0.25;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(800, now);
    filter.frequency.exponentialRampToValueAtTime(180, now + 0.25);
    filter.Q.setValueAtTime(3.0, now);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.5, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    noise.start(now);
  }

  /** Lane switch SFX: Quick soft whoosh */
  playLaneSwitch() {
    if (!this.ctx || this.isMuted) return;
    this.unlock();
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(340, now);
    osc.frequency.exponentialRampToValueAtTime(220, now + 0.1);

    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.1);
  }

  /** Coin Collect SFX: Crystal clear double bell chime */
  playCoin() {
    if (!this.ctx || this.isMuted) return;
    this.unlock();
    const now = this.ctx.currentTime;

    const playChime = (freq, offset) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + offset);

      gain.gain.setValueAtTime(0.35, now + offset);
      gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.18);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(now + offset);
      osc.stop(now + offset + 0.2);
    };

    playChime(987.77, 0.0);  // B5
    playChime(1318.51, 0.07); // E6
  }

  /** Crash SFX: Low rumbling explosion with crunchy white noise */
  playCrash() {
    if (!this.ctx || this.isMuted) return;
    this.unlock();
    const now = this.ctx.currentTime;

    // Bass boom
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.exponentialRampToValueAtTime(30, now + 0.45);
    oscGain.gain.setValueAtTime(0.7, now);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
    osc.connect(oscGain);
    oscGain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.5);

    // Noise burst
    const bufferSize = this.ctx.sampleRate * 0.45;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(800, now);
    filter.frequency.exponentialRampToValueAtTime(100, now + 0.45);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.6, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.sfxGain);

    noise.start(now);
  }

  /** Gesture Recognized Cue: subtle affirmative beep */
  playGestureCue() {
    if (!this.ctx || this.isMuted) return;
    this.unlock();
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(659.25, now); // E5
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.06);
  }

  /** UI Click */
  playClick() {
    if (!this.ctx || this.isMuted) return;
    this.unlock();
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, now);
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.05);
  }

  // --- Dynamic Procedural Synth Soundtrack ---

  startBGM() {
    if (this.bgmPlaying || !this.ctx) {
      this.unlock();
    }
    this.bgmPlaying = true;
    let step = 0;

    // Bassline notes (Frequencies for D minor synth progression: D2, F2, G2, A2)
    const bassline = [
      73.42, 73.42, 87.31, 73.42,
      98.00, 73.42, 110.00, 98.00,
      73.42, 73.42, 87.31, 73.42,
      65.41, 65.41, 87.31, 98.00
    ];

    // Arpeggio melody (D minor pentatonic)
    const arp = [
      293.66, 349.23, 440.00, 523.25,
      587.33, 523.25, 440.00, 349.23,
      293.66, 392.00, 440.00, 587.33,
      659.25, 587.33, 440.00, 392.00
    ];

    const tick = () => {
      if (!this.bgmPlaying || !this.ctx) return;
      const now = this.ctx.currentTime;
      const beatInterval = 60 / (this.currentTempo * 4); // 16th notes

      // Schedule next event
      const curStep = step % 16;

      // 1. Synth Kick on beats 0, 4, 8, 12
      if (curStep % 4 === 0) {
        const kickOsc = this.ctx.createOscillator();
        const kickGain = this.ctx.createGain();
        kickOsc.type = 'sine';
        kickOsc.frequency.setValueAtTime(130, now);
        kickOsc.frequency.exponentialRampToValueAtTime(35, now + 0.12);
        kickGain.gain.setValueAtTime(0.35, now);
        kickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
        kickOsc.connect(kickGain);
        kickGain.connect(this.bgmGain);
        kickOsc.start(now);
        kickOsc.stop(now + 0.14);
      }

      // 2. Hi-Hat on every offbeat
      if (curStep % 2 === 1) {
        const hhBuffer = this.ctx.createBuffer(1, this.ctx.sampleRate * 0.04, this.ctx.sampleRate);
        const hhData = hhBuffer.getChannelData(0);
        for (let i = 0; i < hhData.length; i++) hhData[i] = (Math.random() * 2 - 1) * 0.12;
        const hhSource = this.ctx.createBufferSource();
        hhSource.buffer = hhBuffer;
        const hhFilter = this.ctx.createBiquadFilter();
        hhFilter.type = 'highpass';
        hhFilter.frequency.setValueAtTime(8000, now);
        hhSource.connect(hhFilter);
        hhFilter.connect(this.bgmGain);
        hhSource.start(now);
      }

      // 3. Bass synth
      const bassFreq = bassline[curStep];
      if (bassFreq) {
        const bassOsc = this.ctx.createOscillator();
        const bassGain = this.ctx.createGain();
        bassOsc.type = 'sawtooth';
        bassOsc.frequency.setValueAtTime(bassFreq, now);

        const bassFilter = this.ctx.createBiquadFilter();
        bassFilter.type = 'lowpass';
        bassFilter.frequency.setValueAtTime(450, now);

        bassGain.gain.setValueAtTime(0.18, now);
        bassGain.gain.exponentialRampToValueAtTime(0.001, now + beatInterval * 1.8);

        bassOsc.connect(bassFilter);
        bassFilter.connect(bassGain);
        bassGain.connect(this.bgmGain);

        bassOsc.start(now);
        bassOsc.stop(now + beatInterval * 2);
      }

      // 4. Arpeggiator lead (light pluck)
      if (curStep % 2 === 0) {
        const arpFreq = arp[curStep];
        const arpOsc = this.ctx.createOscillator();
        const arpGain = this.ctx.createGain();
        arpOsc.type = 'sine';
        arpOsc.frequency.setValueAtTime(arpFreq, now);

        arpGain.gain.setValueAtTime(0.08, now);
        arpGain.gain.exponentialRampToValueAtTime(0.001, now + beatInterval * 1.5);

        arpOsc.connect(arpGain);
        arpGain.connect(this.bgmGain);

        arpOsc.start(now);
        arpOsc.stop(now + beatInterval * 1.5);
      }

      step++;
      this.bgmTimer = setTimeout(tick, beatInterval * 1000);
    };

    tick();
  }

  stopBGM() {
    this.bgmPlaying = false;
    if (this.bgmTimer) {
      clearTimeout(this.bgmTimer);
      this.bgmTimer = null;
    }
  }

  updateTempo(gameSpeed) {
    // Gradually increase music tempo with game speed
    // e.g. base speed 18 -> 120 bpm, speed 36 -> 144 bpm
    const targetTempo = 120 + Math.min(30, (gameSpeed - 18) * 1.2);
    this.currentTempo = targetTempo;
  }
}

export const audioManager = new AudioManager();
