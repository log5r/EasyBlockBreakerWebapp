const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const element = { addEventListener() {}, setAttribute() {}, style: {}, classList: { add() {}, remove() {}, toggle() {} } };
const math = Object.create(Math);
const context = vm.createContext({
  window: { addEventListener() {}, innerWidth: 600, innerHeight: 880 },
  navigator: { language: 'ja-JP' },
  document: { documentElement: {}, querySelectorAll: () => [], getElementById: () => element, addEventListener() {} },
  localStorage: { getItem: () => null, setItem() {} }, performance: { now: () => 0 },
  requestAnimationFrame() {}, Math: math,
});
const source = name => fs.readFileSync(path.join(__dirname, '../js', name), 'utf8');
vm.runInContext(source('core.js'), context);
vm.runInContext(source('i18n.js'), context);
Object.assign(context.window.RealBlockBreaker, {
  createAudio: () => ({ initAudio() {}, sfx() {}, setVolume() {} }),
  createRenderer: () => ({ render() {} }),
});
vm.runInContext(source('game.js').replace('window.__rbb = state;',
  'window.test = { state, startGame, tryDropItem }; window.__rbb = state;'), context);
const { state, startGame, tryDropItem } = context.window.test;
startGame();
math.random = () => 0.99;
for (let i = 0; i < 9; i++) tryDropItem(300, 200);
assert.equal(state.items.length, 0);
tryDropItem(300, 200);
assert.equal(state.items.length, 1, 'tenth eligible break guarantees a drop');
assert.equal(state.itemDropMisses, 0);
math.random = () => 0;
for (let i = 0; i < 100; i++) tryDropItem(300, 200);
assert.equal(state.items.length, 1, 'simultaneous splash/multi kills share the cooldown');
assert.equal(state.itemDropMisses, 0);
state.timeAlive = 1.249;
tryDropItem(300, 200);
assert.equal(state.items.length, 1);
state.timeAlive = 1.25;
tryDropItem(300, 200);
state.timeAlive = 2.5;
tryDropItem(300, 200);
state.timeAlive = 4;
tryDropItem(300, 200);
assert.equal(state.items.length, 3, 'falling items are capped');
assert.equal(state.itemDropMisses, 0);
state.items.pop();
tryDropItem(300, 200);
assert.equal(state.items.length, 3, 'drops resume when a slot opens');
startGame();
assert.equal(state.items.length, 0);
assert.equal(state.nextItemDropAt, 0);
assert.equal(state.itemDropMisses, 0);
state.mode = 'over';
tryDropItem(300, 200);
assert.equal(state.items.length, 0);

// Reproducible long-run check with limits cleared between eligible breaks.
startGame();
let seed = 12345, drops = 0, gap = 0, maxGap = 0;
math.random = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 2 ** 32);
for (let i = 0; i < 100000; i++) {
  state.items = []; state.timeAlive += 2; gap++;
  tryDropItem(300, 200);
  if (state.items.length) { drops++; maxGap = Math.max(maxGap, gap); gap = 0; }
}
assert.equal(maxGap, 10);
assert.ok(drops > 21500 && drops < 23500);
console.log(`Item drop checks passed: ${drops}/100000 eligible breaks, longest gap ${maxGap}.`);
