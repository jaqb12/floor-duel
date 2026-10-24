// WebAudio sounds, no audio files (SPEC §8).
// Browsers start audio only after a user gesture, so unlock() runs on START.
(function () {
  'use strict';
  window.Floor = window.Floor || {};

  let ctx = null;
  let enabled = true;

  function unlock() {
    try {
      if (!ctx) ctx = new AudioContext();
      if (ctx.state === 'suspended') ctx.resume();
    } catch (e) {
      console.error('Audio unavailable', e);
    }
  }

  function tone(freq, duration, { type = 'sine', gain = 0.2, at = 0 } = {}) {
    if (!enabled || !ctx || ctx.state !== 'running') return;
    const t = ctx.currentTime + at;
    const osc = ctx.createOscillator();
    const vol = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    vol.gain.setValueAtTime(gain, t);
    vol.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    osc.connect(vol).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + duration + 0.05);
  }

  Floor.sound = {
    unlock,
    setEnabled: on => { enabled = !!on; },
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
