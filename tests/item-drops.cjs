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
Object.assign(context.window.EasyBlockBreaker, {
  createAudio: () => ({ initAudio() {}, sfx() {}, setVolume() {} }),
  createRenderer: () => ({ render() {} }),
});
vm.runInContext(source('game.js').replace('window.__rbb = state;',
  'window.test = { state, startGame, tryDropItem, itemDropChance, updateItems }; window.__rbb = state;'), context);
const { state, startGame, tryDropItem, itemDropChance, updateItems } = context.window.test;
const { ITEM_DROP_CHANCE, ITEM_DROUGHT_GRACE, ITEM_DROUGHT_RAMP } = context.window.EasyBlockBreaker;
startGame();
// --- base chance: a roll at or above ITEM_DROP_CHANCE misses, below it drops
math.random = () => ITEM_DROP_CHANCE;
for (let i = 0; i < 50; i++) tryDropItem(300, 200);
assert.equal(state.items.length, 0, 'no break-count pity: misses alone never force a drop');
math.random = () => ITEM_DROP_CHANCE - 0.001;
tryDropItem(300, 200);
assert.equal(state.items.length, 1);
math.random = () => 0;
for (let i = 0; i < 100; i++) tryDropItem(300, 200);
assert.equal(state.items.length, 1, 'simultaneous splash/multi kills share the cooldown');
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
state.items.pop();
tryDropItem(300, 200);
assert.equal(state.items.length, 3, 'drops resume when a slot opens');
startGame();
assert.equal(state.items.length, 0);
assert.equal(state.nextItemDropAt, 0);
assert.equal(state.itemDrought, 0);
state.mode = 'over';
tryDropItem(300, 200);
assert.equal(state.items.length, 0);

// --- drought relief: the chance ramps from the base to 100% once the player has had nothing for a while
startGame();
assert.equal(itemDropChance(), ITEM_DROP_CHANCE);
state.itemDrought = ITEM_DROUGHT_GRACE;
assert.equal(itemDropChance(), ITEM_DROP_CHANCE, 'the grace period keeps the base chance');
state.itemDrought = ITEM_DROUGHT_GRACE + ITEM_DROUGHT_RAMP / 2;
assert.ok(Math.abs(itemDropChance() - (ITEM_DROP_CHANCE + 1) / 2) < 1e-9, 'halfway up the ramp');
state.itemDrought = ITEM_DROUGHT_GRACE + ITEM_DROUGHT_RAMP;
assert.equal(itemDropChance(), 1);
math.random = () => 0.999;
tryDropItem(300, 200);
assert.equal(state.items.length, 1, 'a full drought guarantees the next eligible break drops');
// the drought clock stops while an item is falling or a power-up runs, and resets once it is over
state.items = []; state.itemDrought = 5; state.effects.speed = 0;
updateItems(1);
assert.equal(state.itemDrought, 6);
state.effects.speed = 0.5;
updateItems(0.25);
assert.equal(state.itemDrought, 0, 'a running power-up resets the drought');
updateItems(0.5);                              // the effect expires during this step, so the clock already runs for it
assert.equal(state.effects.speed, 0);
assert.equal(state.itemDrought, 0.5);
updateItems(1);
assert.equal(state.itemDrought, 1.5, 'the clock restarts once the last effect ends');
state.items.push({ type: 'blast', x: 300, y: 200, vy: 0, t: 0 });
updateItems(0.1);
assert.equal(state.itemDrought, 0, 'a falling item resets the drought');

// Reproducible long-run check at the base chance with limits cleared between eligible breaks.
startGame();
let seed = 12345, drops = 0, gap = 0, maxGap = 0;
math.random = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 2 ** 32);
for (let i = 0; i < 100000; i++) {
  state.items = []; state.timeAlive += 2; state.itemDrought = 0; gap++;
  tryDropItem(300, 200);
  if (state.items.length) { drops++; maxGap = Math.max(maxGap, gap); gap = 0; }
}
assert.ok(drops > 19000 && drops < 21000);
console.log(`Item drop checks passed: ${drops}/100000 eligible breaks at the base chance, longest gap ${maxGap}.`);
