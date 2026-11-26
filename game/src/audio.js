// Sound, synthesised live with WebAudio — no audio files. A two-oscillator
// engine note that follows the throttle, wind that rises with airspeed, a
// chime for a ring scored and a thud for rubber meeting runway.
(function () {
  let ctx = null, engineOsc = null, engineOsc2 = null, engineGain = null,
    windGain = null, master = null, muted = false, running = false;

  function build() {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain();
    master.gain.value = 0.16;
    master.connect(ctx.destination);

    engineOsc = ctx.createOscillator();
    engineOsc.type = 'sawtooth';
    engineOsc2 = ctx.createOscillator();
    engineOsc2.type = 'square';
    const engineFilter = ctx.createBiquadFilter();
    engineFilter.type = 'lowpass';
    engineFilter.frequency.value = 420;
    engineGain = ctx.createGain();
    engineGain.gain.value = 0;
    engineOsc.connect(engineFilter);
    engineOsc2.connect(engineFilter);
    engineFilter.connect(engineGain);
    engineGain.connect(master);
    engineOsc.start();
    engineOsc2.start();

    // Wind: looped noise through a bandpass.
    const len = ctx.sampleRate * 1.5;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    const noise = ctx.createBufferSource();
    noise.buffer = buf;
    noise.loop = true;
    const band = ctx.createBiquadFilter();
    band.type = 'bandpass';
    band.frequency.value = 640;
    band.Q.value = 0.6;
    windGain = ctx.createGain();
    windGain.gain.value = 0;
    noise.connect(band);
    band.connect(windGain);
    windGain.connect(master);
    noise.start();
    running = true;
  }

  KA.audio = {
    unlock() {
      if (!ctx) build();
      if (ctx.state === 'suspended') ctx.resume();
    },
    setEngine(throttle, speedRatio) {
      if (!running || muted) return;
      const t = ctx.currentTime;
      const rpm = 42 + throttle * 88;
      engineOsc.frequency.setTargetAtTime(rpm, t, 0.08);
      engineOsc2.frequency.setTargetAtTime(rpm * 1.5 + 3, t, 0.08);
      engineGain.gain.setTargetAtTime(0.05 + throttle * 0.5, t, 0.1);
      windGain.gain.setTargetAtTime(speedRatio * speedRatio * 0.6, t, 0.15);
    },
    chime() {
      if (!running || muted) return;
      const t = ctx.currentTime;
      for (const [dt, fq] of [[0, 880], [0.09, 1318]]) {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = 'sine';
        o.frequency.value = fq;
        g.gain.setValueAtTime(0.5, t + dt);
        g.gain.exponentialRampToValueAtTime(0.001, t + dt + 0.35);
        o.connect(g); g.connect(master);
        o.start(t + dt); o.stop(t + dt + 0.4);
      }
    },
    thud(strength) {
      if (!running || muted) return;
      const t = ctx.currentTime;
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(120, t);
      o.frequency.exponentialRampToValueAtTime(38, t + 0.22);
      g.gain.setValueAtTime(Math.min(0.9, 0.3 + strength * 0.2), t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
      o.connect(g); g.connect(master);
      o.start(t); o.stop(t + 0.32);
    },
    toggleMute() {
      muted = !muted;
      if (master) master.gain.value = muted ? 0 : 0.16;
      return muted;
    },
  };
})();
