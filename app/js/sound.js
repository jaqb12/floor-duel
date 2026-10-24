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
  function noise(duration, { gain = 0.2, at = 0, when = null, dest = null, filter = 'highpass', freq = 1000, q = 1, attack = 0.002, pan = 0 } = {}) {
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
    let out = src.connect(f).connect(vol);
    if (pan) {
      const p = ctx.createStereoPanner();
      p.pan.value = pan;
      out = out.connect(p);
    }
    out.connect(dest || master);
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

  // ---------- tension music: builds up as the active clock runs down ----------
  // level 0 = calm (12 s or more left), 1 = last moment. The app updates it every frame.

  const tension = { timer: null, gain: null, drone: null, next: 0, step: 0, level: 0 };

  function startTension() {
    unlock();
    if (!ready() || tension.timer) return;
    const now = ctx.currentTime;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(1, now + 1.5);
    gain.connect(master);
    // Low, slowly opening drone: two detuned saws through a lowpass filter.
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.Q.value = 6;
    const droneGain = ctx.createGain();
    droneGain.gain.value = 0.05;
    const oscs = [0, 7].map(detune => {
      const o = ctx.createOscillator();
      o.type = 'sawtooth';
      o.detune.value = detune;
      o.connect(filter);
      o.start(now);
      return o;
    });
    filter.connect(droneGain).connect(gain);
    tension.gain = gain;
    tension.drone = { oscs, filter, droneGain };
    tension.next = now + 0.1;
    tension.step = 0;
    setTensionLevel(tension.level);
    tension.timer = setInterval(scheduleTension, 25);
  }

  function setTensionLevel(level) {
    tension.level = Math.max(0, Math.min(1, level));
    if (!tension.drone) return;
    const t = ctx.currentTime;
    const l = tension.level;
    for (const o of tension.drone.oscs) o.frequency.setTargetAtTime(midi(33 + l * 12), t, 0.3);
    tension.drone.filter.frequency.setTargetAtTime(250 + l * l * 3500, t, 0.3);
    tension.drone.droneGain.gain.setTargetAtTime(0.04 + l * 0.08, t, 0.3);
  }

  // Heartbeat that speeds up, a rising high ostinato from level 0.35, snare ticks from 0.7.
  function scheduleTension() {
    const dest = tension.gain;
    while (tension.next < ctx.currentTime + LOOKAHEAD) {
      const t = tension.next;
      const l = tension.level;
      const beat = 0.75 - 0.5 * l;   // seconds per heartbeat
      const sub = beat / 4;          // sixteenth of a beat
      const pos = tension.step % 4;
      if (pos === 0) {
        tone(62, 0.22, { when: t, dest, gain: 0.5 + 0.3 * l, slideTo: 40 });
        tone(55, 0.25, { when: t + beat * 0.3, dest, gain: 0.35 + 0.25 * l, slideTo: 38 });
      }
      if (l > 0.35) {
        const pitch = 69 + Math.round(l * 10) + (pos % 2 ? 1 : 0);
        tone(midi(pitch), sub * 0.8, { when: t, dest, type: 'triangle', gain: 0.03 + 0.07 * (l - 0.35) });
      }
      if (l > 0.7 && pos % 2 === 1) {
        noise(0.05, { when: t, dest, gain: 0.05 + 0.15 * (l - 0.7), filter: 'bandpass', freq: 2200, q: 0.8 });
      }
      tension.next += sub;
      tension.step++;
    }
  }

  function stopTension() {
    if (!tension.timer) return;
    clearInterval(tension.timer);
    tension.timer = null;
    const { gain, drone } = tension;
    const t = ctx.currentTime;
    gain.gain.setTargetAtTime(0.0001, t, 0.2);
    for (const o of drone.oscs) o.stop(t + 1.5);
    setTimeout(() => gain.disconnect(), 1800);
    tension.gain = null;
    tension.drone = null;
  }

  // Round start like on TV: three short beeps (3, 2, 1) and a long high one when the clock starts.
  function countdown(seconds) {
    unlock();
    for (let i = 0; i < seconds; i++) {
      tone(880, 0.18, { at: i, type: 'square', gain: 0.12 });
    }
    tone(1760, 0.7, { at: seconds, type: 'square', gain: 0.14 });
    tone(880, 0.7, { at: seconds, type: 'sine', gain: 0.2 });
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
    // A crowd: each person claps at their own pitch, pace and place in the stereo image,
    // and people stop at different moments. A soft noise bed fills the gaps.
    applause() {
      const length = 4.5;
      for (let p = 0; p < 28; p++) {
        const freq = 900 + Math.random() * 1800;
        const pan = Math.random() * 1.6 - 0.8;
        const rate = 3.5 + Math.random() * 3;              // claps per second
        const stopAt = length - 1.6 + Math.random() * 1.6;
        for (let at = Math.random() * 0.25; at < stopAt; at += (1 / rate) * (0.85 + Math.random() * 0.3)) {
          const swell = Math.min(1, at / 0.4) * (at > stopAt - 0.6 ? (stopAt - at) / 0.6 : 1);
          noise(0.012 + Math.random() * 0.012, { at, gain: (0.05 + Math.random() * 0.05) * swell, filter: 'bandpass', freq, q: 1.2, attack: 0.001, pan });
          noise(0.02, { at, gain: 0.02 * swell, filter: 'lowpass', freq: 500, pan });
        }
      }
      noise(length, { gain: 0.035, filter: 'bandpass', freq: 2500, q: 0.4, attack: 0.4 });
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
      if (!enabled) {
        stopMusic();
        stopTension();
      }
    },
    setVolume(percent) {
      volume = Math.max(0, Math.min(100, percent)) / 100;
      if (master) master.gain.setTargetAtTime(volume, ctx.currentTime, 0.02);
    },
    startMusic,
    stopMusic,
    startTension,
    stopTension,
    setTensionLevel,
    isTensionPlaying: () => !!tension.timer,
    countdown,
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
