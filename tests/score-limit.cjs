const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

// one shared element stub: classList membership is tracked so overlay visibility can be asserted
const classes = new Set();
const element = { addEventListener() {}, setAttribute() {}, style: {}, blur() {}, textContent: '', className: '',
  classList: { add: c => classes.add(c), remove: c => classes.delete(c), toggle() {} } };
const stored = {};
const context = vm.createContext({
  window: { addEventListener() {}, innerWidth: 600, innerHeight: 880 },
  navigator: { language: 'ja-JP' },
  document: { documentElement: {}, querySelectorAll: () => [], getElementById: () => element, addEventListener() {} },
  localStorage: { getItem: k => (k in stored ? stored[k] : null), setItem: (k, v) => { stored[k] = String(v); } },
  performance: { now: () => 0 }, requestAnimationFrame() {}, Math,
});
const source = name => fs.readFileSync(path.join(__dirname, '../js', name), 'utf8');
vm.runInContext(source('core.js'), context);
vm.runInContext(source('i18n.js'), context);
Object.assign(context.window.EasyBlockBreaker, {
  createAudio: () => ({ initAudio() {}, sfx() {}, setVolume() {} }),
  createRenderer: () => ({ render() {} }),
});
vm.runInContext(source('game.js').replace('window.__rbb = state;',
  'window.test = { state, startGame, addScore, update, selectMode, showTitle, fmtTime }; window.__rbb = state;'), context);
const { state, startGame, addScore, update, selectMode, showTitle, fmtTime } = context.window.test;
const { SCORE_MAX, TIME_LIMIT, WAVE_TIME_BONUS } = context.window.EasyBlockBreaker;

// --- timed mode: the clock runs out and the run ends with TIME UP
selectMode(false);
startGame();
assert.equal(state.infinite, false);
state.balls = [];   // nothing breaks, so no wave clear extends the clock
for (let i = 0; i < TIME_LIMIT * 60 + 5; i++) update(1 / 60);
assert.equal(state.mode, 'over');
assert.equal(state.endReason, 'time');
assert.equal(state.time, 0);
assert.equal(element.textContent.includes('WAVE'), true);

// --- infinite mode: the clock never runs out; elapsed time is tracked instead
selectMode(true);
assert.equal(stored.rbb_mode, 'infinite');
startGame();
assert.equal(state.infinite, true);
state.balls = [];
for (let i = 0; i < TIME_LIMIT * 60 + 5; i++) update(1 / 60);
assert.equal(state.mode, 'playing', 'infinite mode keeps going past the timed limit');
assert.equal(state.time, TIME_LIMIT, 'the countdown is untouched in infinite mode');
assert.ok(state.timeAlive > TIME_LIMIT);
// a wave clear grants points but no extra time
state.waveBroken = state.waveQuota;
const before = state.score;
update(1 / 60);
assert.equal(state.wave, 2);
assert.ok(state.score > before);
assert.equal(state.time, TIME_LIMIT, 'no +10s in infinite mode');

assert.equal(fmtTime(3725), '1:02:05');
assert.equal(fmtTime(65), '1:05');
assert.equal(fmtTime(7), '0:07');

// --- score cap: every add clamps at SCORE_MAX and reaching it ends the run with SCORE LIMIT
state.score = SCORE_MAX - 5;
addScore(1);
assert.equal(state.mode, 'playing');
assert.equal(state.score, SCORE_MAX - 4);
addScore(1e6);
assert.equal(state.score, SCORE_MAX, 'score never exceeds SCORE_MAX');
assert.equal(state.mode, 'over');
assert.equal(state.endReason, 'limit');
assert.equal(stored.rbb_best_inf, String(SCORE_MAX), 'infinite best saved under its own key');
assert.equal(stored.rbb_best, undefined, 'timed best untouched');
assert.ok(element.textContent.includes(SCORE_MAX.toLocaleString()), 'limit message names the cap');
assert.equal(element.className, 'limit');
addScore(10);
assert.equal(state.score, SCORE_MAX, 'no points are added after the run ended');
// the SCORE LIMIT screen leads back to the title, not to a retry
showTitle();
assert.equal(state.mode, 'ready');
assert.equal(state.endReason, null);

// timed mode caps too, and keeps its own best
selectMode(false);
assert.equal(state.best, 0);
startGame();
state.score = SCORE_MAX - 1;
addScore(1);
assert.equal(state.endReason, 'limit');
assert.equal(stored.rbb_best, String(SCORE_MAX));
assert.equal(+stored.rbb_best, SCORE_MAX, 'the cap round-trips through localStorage without precision loss');

console.log('Score limit / infinite mode checks passed.');
