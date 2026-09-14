// Late-game recovery: partial time payouts per wave (timed mode), combo-scaled ball damage, and the toughness cap.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const element = { addEventListener() {}, setAttribute() {}, style: {}, blur() {}, textContent: '', className: '',
  classList: { add() {}, remove() {}, toggle() {} } };
const context = vm.createContext({
  window: { addEventListener() {}, innerWidth: 600, innerHeight: 880 },
  navigator: { language: 'ja-JP' },
  document: { documentElement: {}, querySelectorAll: () => [], getElementById: () => element, addEventListener() {} },
  localStorage: { getItem: () => null, setItem() {} }, performance: { now: () => 0 },
  requestAnimationFrame() {}, Math,
});
const source = name => fs.readFileSync(path.join(__dirname, '../js', name), 'utf8');
vm.runInContext(source('core.js'), context);
vm.runInContext(source('i18n.js'), context);
Object.assign(context.window.EasyBlockBreaker, {
  createAudio: () => ({ initAudio() {}, sfx() {}, setVolume() {} }),
  createRenderer: () => ({ render() {} }),
});
vm.runInContext(source('game.js').replace('window.__rbb = state;',
  'window.test = { state, startGame, selectMode, hitBlock, spawnWave, multiplier, ballDamage }; window.__rbb = state;'), context);
const { state, startGame, selectMode, hitBlock, spawnWave, multiplier, ballDamage } = context.window.test;
const { TIME_LIMIT, WAVE_TIME_STEPS, WAVE_TIME_STEP_BONUS, EXTRA_HP_MAX, DAMAGE_PER_MULT } = context.window.EasyBlockBreaker;

const ball = () => ({ x: 300, y: 300, vx: 0, vy: -500, r: 13, passing: [] });
const live = () => state.blocks.filter(b => !b.steel && !b.dead && b.active);
// break one cube outright (whatever its toughness) with the combo reset, so the damage stays at 1 per hit
const breakOne = bl => { state.combo = 0; while (bl.hp > 0) hitBlock(bl, ball(), 0, -1); };

// --- C: timed mode pays WAVE_TIME_STEP_BONUS at each quarter of the quota, never for the clear itself
selectMode(false);
startGame();
for (const bl of state.blocks) bl.active = true;
const quota = state.waveQuota, cubes = live();
assert.ok(quota > WAVE_TIME_STEPS);
let expected = TIME_LIMIT;
for (let i = 0; i < quota - 1; i++) {
  breakOne(cubes[i]);
  const due = Math.min(WAVE_TIME_STEPS - 1, Math.floor((i + 1) * WAVE_TIME_STEPS / quota));
  expected = TIME_LIMIT + due * WAVE_TIME_STEP_BONUS;
  assert.equal(state.time, expected, `after ${i + 1}/${quota} breaks`);
}
assert.equal(state.waveTimeSteps, WAVE_TIME_STEPS - 1);
assert.equal(state.time, TIME_LIMIT + (WAVE_TIME_STEPS - 1) * WAVE_TIME_STEP_BONUS);
// the wave clear (handled in update) is left to the clear bonus; a fresh wave starts the steps over
spawnWave(2);
assert.equal(state.waveTimeSteps, 0);

// --- C: the infinite mode never pays time
selectMode(true);
startGame();
for (const bl of state.blocks) bl.active = true;
const t0 = state.time;
for (const bl of live()) breakOne(bl);
assert.equal(state.time, t0);
assert.equal(state.waveTimeSteps, 0);

// --- D: ball damage rises with the multiplier (x4 → 2, x8 → 3); BLAST splash always chips one point
selectMode(false);
startGame();
assert.equal(ballDamage(), 1);
state.combo = 4 * DAMAGE_PER_MULT;             // multiplier x5
assert.equal(multiplier(), 5);
assert.equal(ballDamage(), 2);
state.combo = 4 * 7;                           // multiplier x8 (the cap)
assert.equal(multiplier(), 8);
assert.equal(ballDamage(), 3);
const tough = { x: 100, y: 200, w: 34, h: 34, hp: 5, maxHp: 5, color: { base: '#fff', light: '#fff' }, active: true, steel: false };
state.combo = 4 * DAMAGE_PER_MULT;
hitBlock(tough, ball(), 0, -1);
assert.equal(tough.hp, 3, 'a ball hit at x5 takes two points');
hitBlock(tough, ball(), 0, -1, true);
assert.equal(tough.hp, 2, 'a splash hit takes one point regardless of the combo');
// the step up to two damage is announced once, on the hit that crosses the threshold
state.combo = 4 * (DAMAGE_PER_MULT - 1) - 1; state.popups = [];   // one hit short of multiplier x4
hitBlock(tough, ball(), 0, -1);
assert.equal(tough.hp, 1, 'the hit that raises the combo still uses the damage from before it');
assert.ok(state.popups.some(p => p.text === 'POWER x2'));

// --- D: toughness stops growing after EXTRA_HP_MAX full cycles
const baseHp = w => { spawnWave(w); return Math.max(...state.blocks.filter(b => !b.steel).map(b => b.maxHp)); };
const cycle = 7;   // LAYOUTS.length
const first = baseHp(1);
assert.equal(baseHp(1 + cycle), first + 1);
assert.equal(baseHp(1 + cycle * EXTRA_HP_MAX), first + EXTRA_HP_MAX);
assert.equal(baseHp(1 + cycle * (EXTRA_HP_MAX + 3)), first + EXTRA_HP_MAX, 'toughness is capped');
console.log('Recovery checks passed: partial time payouts, combo damage, toughness cap.');
