window.RealBlockBreaker.createAudio = function () {
'use strict';

// ---------------------------------------------------------------- audio
let audio = null, master = null, muted = false, volume = 1;   // volume = 0..1 as shown to the player; mapped to a perceptual gain curve below
function initAudio() {
  if (audio) return;
  try { audio = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { audio = null; return; }
  master = audio.createGain();   // every sound goes through this one node, so the volume setting applies to all of them at once
  master.gain.value = volume * volume;
  master.connect(audio.destination);
}
function noiseBuffer() {
  const len = audio.sampleRate * 0.3, buf = audio.createBuffer(1, len, audio.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  return buf;
}
let _noise = null;
function sfx(kind, vol = 1) {
  if (!audio || muted || volume <= 0) return;
  if (audio.state === 'suspended') audio.resume();
  const t = audio.currentTime;
  const g = audio.createGain(); g.connect(master);
  if (kind === 'tile' || kind === 'wall') {
    // steel clank: bright noise burst + short ringing partial
    if (!_noise) _noise = noiseBuffer();
    const src = audio.createBufferSource(); src.buffer = _noise;
    const f = audio.createBiquadFilter(); f.type = 'bandpass';
    f.frequency.value = kind === 'tile' ? 2600 : 1100; f.Q.value = 2.5;
    src.connect(f); f.connect(g);
    g.gain.setValueAtTime(0.45 * vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.07);
    src.start(t); src.stop(t + 0.08);
    const o = audio.createOscillator(); const og = audio.createGain();
    o.type = 'triangle'; o.frequency.setValueAtTime(kind === 'tile' ? 1320 : 420, t);
    o.frequency.exponentialRampToValueAtTime(kind === 'tile' ? 980 : 300, t + 0.06);
    og.gain.setValueAtTime(0.22 * vol, t); og.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
    o.connect(og); og.connect(master); o.start(t); o.stop(t + 0.15);
  } else if (kind === 'metal') {
    // chrome deflector ping
    [1, 2.76, 5.4].forEach((m, i) => {
      const o = audio.createOscillator(); const og = audio.createGain();
      o.type = 'sine'; o.frequency.value = 880 * m;
      og.gain.setValueAtTime(0.25 * vol / (i + 1), t); og.gain.exponentialRampToValueAtTime(0.001, t + 0.35 - i * 0.08);
      o.connect(og); og.connect(master); o.start(t); o.stop(t + 0.4);
    });
  } else if (kind === 'steel') {
    // solid steel block: dull heavy clang, lower and longer than a tile hit
    if (!_noise) _noise = noiseBuffer();
    const src = audio.createBufferSource(); src.buffer = _noise;
    const f = audio.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 700; f.Q.value = 1.8;
    src.connect(f); f.connect(g);
    g.gain.setValueAtTime(0.5 * vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
    src.start(t); src.stop(t + 0.1);
    [1, 1.83, 2.9].forEach((m, i) => {
      const o = audio.createOscillator(); const og = audio.createGain();
      o.type = i ? 'sine' : 'triangle'; o.frequency.value = 230 * m;
      og.gain.setValueAtTime(0.28 * vol / (i + 1), t); og.gain.exponentialRampToValueAtTime(0.001, t + 0.5 - i * 0.1);
      o.connect(og); og.connect(master); o.start(t); o.stop(t + 0.55);
    });
  } else if (kind === 'clink') {
    // ball-ball steel clink
    const o = audio.createOscillator(); o.type = 'triangle'; o.frequency.value = 2400;
    g.gain.setValueAtTime(0.25 * vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
    o.connect(g); o.start(t); o.stop(t + 0.07);
  } else if (kind === 'item') {
    // power-up pickup: quick rising two-note chime
    [660, 990].forEach((f, i) => {
      const o = audio.createOscillator(); const og = audio.createGain();
      o.type = 'square'; o.frequency.value = f;
      const s = t + i * 0.07;
      og.gain.setValueAtTime(0.0001, s); og.gain.linearRampToValueAtTime(0.12 * vol, s + 0.01); og.gain.exponentialRampToValueAtTime(0.001, s + 0.25);
      o.connect(og); og.connect(master); o.start(s); o.stop(s + 0.3);
    });
  } else if (kind === 'blast') {
    // BLAST shockwave: low thump under a pitch-dropping boom
    if (!_noise) _noise = noiseBuffer();
    const src = audio.createBufferSource(); src.buffer = _noise;
    const f = audio.createBiquadFilter(); f.type = 'lowpass'; f.frequency.setValueAtTime(1800, t); f.frequency.exponentialRampToValueAtTime(200, t + 0.25);
    src.connect(f); f.connect(g);
    g.gain.setValueAtTime(0.6 * vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.28);
    src.start(t); src.stop(t + 0.3);
    const o = audio.createOscillator(); const og = audio.createGain();
    o.type = 'sine'; o.frequency.setValueAtTime(180, t); o.frequency.exponentialRampToValueAtTime(45, t + 0.3);
    og.gain.setValueAtTime(0.4 * vol, t); og.gain.exponentialRampToValueAtTime(0.001, t + 0.32);
    o.connect(og); og.connect(master); o.start(t); o.stop(t + 0.35);
  } else if (kind === 'clear') {
    [523, 659, 784, 1047].forEach((f, i) => {
      const o = audio.createOscillator(); const og = audio.createGain();
      o.type = 'triangle'; o.frequency.value = f;
      const s = t + i * 0.09;
      og.gain.setValueAtTime(0.0001, s); og.gain.linearRampToValueAtTime(0.3, s + 0.02); og.gain.exponentialRampToValueAtTime(0.001, s + 0.5);
      o.connect(og); og.connect(master); o.start(s); o.stop(s + 0.55);
    });
  }
}

function toggleMute() { muted = !muted; return muted; }
// v is 0..1; squared so the slider feels linear to the ear (a 50% slider is roughly half as loud, not barely quieter)
function setVolume(v) {
  volume = Math.min(1, Math.max(0, v));
  if (master) master.gain.setTargetAtTime(volume * volume, audio.currentTime, 0.02);
}
function getVolume() { return volume; }
return { initAudio, sfx, toggleMute, setVolume, getVolume };
};
