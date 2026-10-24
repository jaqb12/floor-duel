// WebAudio sounds and music, no audio files (SPEC §8).
// Browsers start audio only after a user gesture, so every button calls unlock().
(function () {
  'use strict';
  window.Floor = window.Floor || {};

  let ctx = null;
  let master = null;     // all sounds -> master -> speakers
  let noiseBuffer = null;
  let enabled = true;
  let volume = 0.8;
  let onMusicChange = () => {};

  function unlock() {
    try {
      if (!ctx) {
        ctx = new AudioContext();
        master = ctx.createGain();
        master.gain.value = volume;
        master.connect(ctx.destination);
      }
      if (ctx.state === 'suspended') ctx.resume();
    } catch (e) {
      console.error('Audio unavailable', e);
    }
  }

  function ready() {
    return enabled && !!ctx && ctx.state !== 'closed';
  }

  const midi = n => 440 * Math.pow(2, (n - 69) / 12);

  // One enveloped oscillator. `when` is an AudioContext time (default: now + at).
  function tone(freq, duration, { type = 'sine', gain = 0.2, at = 0, when = null, dest = null, attack = 0.005, slideTo = null } = {}) {
    if (!ready()) return;
    const t = when === null ? ctx.currentTime + at : when;
    const osc = ctx.createOscillator();
    const vol = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t + duration);
    vol.gain.setValueAtTime(0.0001, t);
    vol.gain.exponentialRampToValueAtTime(gain, t + attack);
    vol.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    osc.connect(vol).connect(dest || master);
    osc.start(t);
    osc.stop(t + duration + 0.05);
  }

  // Filtered white noise burst: snares, hi-hats, cymbals, applause.
  function noise(duration, { gain = 0.2, at = 0, when = null, dest = null, filter = 'highpass', freq = 1000, q = 1, attack = 0.002 } = {}) {
    if (!ready()) return;
    if (!noiseBuffer) {
      noiseBuffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const data = noiseBuffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    }
    const t = when === null ? ctx.currentTime + at : when;
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer;
    src.loop = true;
    const f = ctx.createBiquadFilter();
    f.type = filter;
    f.frequency.value = freq;
    f.Q.value = q;
    const vol = ctx.createGain();
    vol.gain.setValueAtTime(0.0001, t);
    vol.gain.exponentialRampToValueAtTime(gain, t + attack);
    vol.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    src.connect(f).connect(vol).connect(dest || master);
    src.start(t, Math.random() * 0.5);
    src.stop(t + duration + 0.05);
  }

  // ---------- music: looping "get ready" groove (Am–F–C–G) ----------

  const BPM = 124;
  const STEP = 60 / BPM / 2; // eighth notes
  const CHORDS = [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]];
  const LOOKAHEAD = 0.25;
  const music = { timer: null, gain: null, step: 0, next: 0 };

  function kick(t, dest) {
    tone(150, 0.25, { when: t, dest, gain: 0.7, slideTo: 45 });
  }

  function scheduleStep(step, t, dest) {
    const bar = Math.floor(step / 8) % CHORDS.length;
    const beat = step % 8;
    const chord = CHORDS[bar];
    if (beat === 0 || beat === 4 || (beat === 7 && bar === 3)) kick(t, dest);
    if (beat === 2 || beat === 6) noise(0.18, { when: t, dest, gain: 0.25, filter: 'bandpass', freq: 1800, q: 0.7 });
    noise(0.04, { when: t, dest, gain: beat % 2 ? 0.05 : 0.08, freq: 7000 });
    if (beat !== 1 && beat !== 5) tone(midi(chord[0] - 24), STEP * 0.9, { when: t, dest, type: 'square', gain: 0.12 });
    tone(midi(chord[beat % 3] + 12), STEP * 0.8, { when: t, dest, type: 'triangle', gain: 0.1 });
    if (beat === 0) {
      for (const n of chord) tone(midi(n), STEP * 7.5, { when: t, dest, type: 'sawtooth', gain: 0.025, attack: 0.08 });
    }
  }

  function startMusic() {
    unlock();
    if (!ready() || music.timer) return;
    music.gain = ctx.createGain();
    music.gain.gain.value = 0.9;
    music.gain.connect(master);
    music.step = 0;
    music.next = ctx.currentTime + 0.05;
    const dest = music.gain;
    music.timer = setInterval(() => {
      while (music.next < ctx.currentTime + LOOKAHEAD) {
        scheduleStep(music.step, music.next, dest);
        music.next += STEP;
        music.step++;
      }
    }, 25);
    onMusicChange(true);
  }

  // Fades out notes already scheduled ahead.
  function stopMusic() {
    if (!music.timer) return;
    clearInterval(music.timer);
    music.timer = null;
    const g = music.gain;
    g.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.15);
    setTimeout(() => g.disconnect(), 1500);
    music.gain = null;
    onMusicChange(false);
  }

  // ---------- operator sound effects ----------

  const effects = {
    // Accelerating snare roll with a cymbal at the end.
    drumroll() {
      let at = 0;
      for (let gap = 0.12; at < 2.6; gap = Math.max(0.035, gap * 0.93)) {
        noise(0.09, { at, gain: 0.12 + at * 0.08, filter: 'bandpass', freq: 1900, q: 0.8 });
        at += gap;
      }
      noise(1.8, { at, gain: 0.5, freq: 5000 });
      tone(55, 0.6, { at, gain: 0.6, slideTo: 40 });
    },
    fanfare() {
      const notes = [[72, 0], [72, 0.15], [72, 0.3], [76, 0.45], [79, 0.75], [76, 1.0], [84, 1.15]];
      for (const [n, at] of notes) {
        tone(midi(n), 0.35, { at, type: 'sawtooth', gain: 0.12, attack: 0.02 });
        tone(midi(n - 12), 0.35, { at, type: 'square', gain: 0.05, attack: 0.02 });
      }
      for (const n of [72, 76, 79, 84]) tone(midi(n), 1.4, { at: 1.15, type: 'sawtooth', gain: 0.06, attack: 0.05 });
    },
    applause() {
      for (let i = 0; i < 160; i++) {
        const at = Math.random() * 3.2;
        const fade = at < 2.4 ? 1 : (3.2 - at) / 0.8;
        noise(0.03 + Math.random() * 0.03, { at, gain: (0.08 + Math.random() * 0.12) * fade, filter: 'bandpass', freq: 1200 + Math.random() * 2500, q: 1.5 });
      }
    },
    // Heartbeat-like low pulses.
    suspense() {
      for (let i = 0; i < 6; i++) {
        tone(60, 0.25, { at: i * 0.75, gain: 0.6, slideTo: 40 });
        tone(55, 0.3, { at: i * 0.75 + 0.22, gain: 0.45, slideTo: 38 });
      }
      tone(midi(45), 4.5, { type: 'sawtooth', gain: 0.03, attack: 1.5 });
    },
    gong() {
      for (const [f, g] of [[98, 0.5], [147, 0.25], [196, 0.18], [277, 0.1], [415, 0.06]]) {
        tone(f, 4, { gain: g, attack: 0.01 });
      }
      noise(0.6, { gain: 0.1, filter: 'lowpass', freq: 800 });
    },
    // "Wah wah" for a wrong answer.
    wrong() {
      tone(midi(58), 0.35, { type: 'triangle', gain: 0.35, slideTo: midi(57) });
      tone(midi(56), 0.9, { at: 0.35, type: 'triangle', gain: 0.35, slideTo: midi(52) });
    },
  };

  function play(name) {
    unlock();
    if (effects[name]) effects[name]();
  }

  Floor.sound = {
    unlock,
    setEnabled(on) {
      enabled = !!on;
      if (!enabled) stopMusic();
    },
    setVolume(percent) {
      volume = Math.max(0, Math.min(100, percent)) / 100;
      if (master) master.gain.setTargetAtTime(volume, ctx.currentTime, 0.02);
    },
    startMusic,
    stopMusic,
    isMusicPlaying: () => !!music.timer,
    setMusicListener: fn => { onMusicChange = fn; },
    play,
    tick: () => tone(1000, 0.05, { type: 'square', gain: 0.06 }),
    correct: () => {
      tone(880, 0.15);
      tone(1320, 0.3, { at: 0.08 });
    },
    pass: () => tone(196, 0.35, { type: 'triangle', gain: 0.3 }),
    timeout: () => {
      tone(110, 1.3, { type: 'sawtooth', gain: 0.2 });
      tone(117, 1.3, { type: 'sawtooth', gain: 0.2 });
    },
  };
})();
