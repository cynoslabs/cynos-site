/**
 * Web Audio API — tactile clicks, error thuds, binaural focus, industrial ambience.
 * No external assets. Comments in English.
 */
(function (global) {
  'use strict';

  var ctx = null;
  var ambienceNodes = null;
  var binauralNodes = null;

  function getCtx() {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    return ctx;
  }

  function resume() {
    var c = getCtx();
    if (c.state === 'suspended') c.resume();
  }

  /** Mechanical click — high-frequency transient (sound pack varies envelope) */
  function playTactileClick(pack) {
    resume();
    var c = getCtx();
    var now = c.currentTime;
    var g = c.createGain();
    g.connect(c.destination);
    g.gain.setValueAtTime(0.0001, now);

    if (pack === 'cherry') {
      var o = c.createOscillator();
      o.type = 'square';
      o.frequency.setValueAtTime(2800, now);
      o.frequency.exponentialRampToValueAtTime(1200, now + 0.012);
      o.connect(g);
      g.gain.exponentialRampToValueAtTime(0.12, now + 0.002);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 0.035);
      o.start(now);
      o.stop(now + 0.04);
      return;
    }
    if (pack === 'typewriter') {
      var buf = c.createBuffer(1, Math.floor(c.sampleRate * 0.03), c.sampleRate);
      var d = buf.getChannelData(0);
      for (var i = 0; i < d.length; i++) {
        d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (d.length * 0.25)) * 0.4;
      }
      var src = c.createBufferSource();
      src.buffer = buf;
      var f = c.createBiquadFilter();
      f.type = 'bandpass';
      f.frequency.value = 1800;
      src.connect(f);
      f.connect(g);
      g.gain.setValueAtTime(0.14, now);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 0.028);
      src.start(now);
      return;
    }
    var osc = c.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(4200, now);
    osc.frequency.exponentialRampToValueAtTime(2200, now + 0.008);
    osc.connect(g);
    g.gain.exponentialRampToValueAtTime(0.09, now + 0.001);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.022);
    osc.start(now);
    osc.stop(now + 0.025);
  }

  /** Low thud on mistake */
  function playErrorThud() {
    resume();
    var c = getCtx();
    var now = c.currentTime;
    var o = c.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(90, now);
    o.frequency.exponentialRampToValueAtTime(45, now + 0.12);
    var g = c.createGain();
    g.gain.setValueAtTime(0.11, now);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);
    o.connect(g);
    g.connect(c.destination);
    o.start(now);
    o.stop(now + 0.2);
  }

  function stopAmbience() {
    if (ambienceNodes) {
      try {
        ambienceNodes.osc.stop();
        ambienceNodes.osc.disconnect();
        if (ambienceNodes.ns) {
          ambienceNodes.ns.stop();
          ambienceNodes.ns.disconnect();
        }
        ambienceNodes.master.disconnect();
      } catch (_) {}
      ambienceNodes = null;
    }
    if (binauralNodes) {
      try {
        binauralNodes.left.stop();
        binauralNodes.right.stop();
        binauralNodes.merger.disconnect();
        if (binauralNodes.gain) binauralNodes.gain.disconnect();
      } catch (_) {}
      binauralNodes = null;
    }
  }

  /**
   * 40 Hz binaural beat: left 200 Hz, right 240 Hz (use headphones).
   */
  function startBinauralFocus() {
    resume();
    stopAmbience();
    var c = getCtx();
    var merger = c.createChannelMerger(2);
    var g = c.createGain();
    g.gain.value = 0.06;
    g.connect(c.destination);

    var L = c.createOscillator();
    L.type = 'sine';
    L.frequency.value = 200;
    var R = c.createOscillator();
    R.type = 'sine';
    R.frequency.value = 240;

    var gl = c.createGain();
    var gr = c.createGain();
    gl.gain.value = 0.5;
    gr.gain.value = 0.5;
    L.connect(gl);
    R.connect(gr);
    gl.connect(merger, 0, 0);
    gr.connect(merger, 0, 1);
    merger.connect(g);

    L.start();
    R.start();
    binauralNodes = { left: L, right: R, merger: merger, gain: g };
  }

  /** Low industrial drone + filtered noise (lofi-industrial ambience) */
  function startIndustrialAmbience() {
    resume();
    stopAmbience();
    var c = getCtx();
    var master = c.createGain();
    master.gain.value = 0.045;
    master.connect(c.destination);

    var o = c.createOscillator();
    o.type = 'sawtooth';
    o.frequency.value = 55;
    var flt = c.createBiquadFilter();
    flt.type = 'lowpass';
    flt.frequency.value = 220;
    o.connect(flt);
    flt.connect(master);

    var bufSize = c.sampleRate * 2;
    var noiseBuf = c.createBuffer(1, bufSize, c.sampleRate);
    var nd = noiseBuf.getChannelData(0);
    for (var i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
    var ns = c.createBufferSource();
    ns.buffer = noiseBuf;
    ns.loop = true;
    var nf = c.createBiquadFilter();
    nf.type = 'bandpass';
    nf.frequency.value = 400;
    nf.Q.value = 0.7;
    ns.connect(nf);
    nf.connect(master);

    o.start();
    ns.start();
    ambienceNodes = { osc: o, ns: ns, master: master };
  }

  function setFocusAmbience(mode, enabled) {
    stopAmbience();
    if (!enabled) return;
    if (mode === 'binaural') startBinauralFocus();
    else startIndustrialAmbience();
  }

  /** Legacy beeps (streak, tick, end) — respect global mute in caller */
  function playTone(type) {
    resume();
    var c = getCtx();
    var now = c.currentTime;
    var o = c.createOscillator();
    var g = c.createGain();
    o.connect(g);
    g.connect(c.destination);
    if (type === 'ok') {
      o.frequency.setValueAtTime(660, now);
      o.frequency.setValueAtTime(880, now + 0.07);
      g.gain.setValueAtTime(0.1, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
      o.start(now);
      o.stop(now + 0.18);
      return;
    }
    if (type === 'tick') {
      o.frequency.value = 1100;
      g.gain.setValueAtTime(0.03, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
      o.start(now);
      o.stop(now + 0.05);
      return;
    }
    if (type === 'end') {
      o.frequency.setValueAtTime(440, now);
      o.frequency.setValueAtTime(330, now + 0.2);
      g.gain.setValueAtTime(0.1, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
      o.start(now);
      o.stop(now + 0.4);
      return;
    }
    if (type === 'streak') {
      [440, 554, 659, 880].forEach(function (f, i) {
        var o2 = c.createOscillator();
        var g2 = c.createGain();
        o2.connect(g2);
        g2.connect(c.destination);
        var tt = now + i * 0.08;
        o2.frequency.value = f;
        g2.gain.setValueAtTime(0.08, tt);
        g2.gain.exponentialRampToValueAtTime(0.001, tt + 0.16);
        o2.start(tt);
        o2.stop(tt + 0.16);
      });
      return;
    }
  }

  global.CynosAudio = {
    resume: resume,
    tactile: playTactileClick,
    thud: playErrorThud,
    tone: playTone,
    setFocusAmbience: setFocusAmbience,
    stopAmbience: stopAmbience,
    getContext: getCtx,
  };
})(typeof window !== 'undefined' ? window : globalThis);
