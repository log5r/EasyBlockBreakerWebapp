const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const element = { addEventListener() {}, setAttribute() {}, style: {}, classList: { add() {}, remove() {}, toggle() {} } };
const context = vm.createContext({
  window: { addEventListener() {}, innerWidth: 600, innerHeight: 880 },
  navigator: { language: 'ja-JP' },
  document: { documentElement: {}, querySelectorAll: () => [], getElementById: () => element, addEventListener() {} },
  localStorage: { getItem: () => null, setItem() {} }, performance: { now: () => 0 },
  requestAnimationFrame() {},
});
const source = name => fs.readFileSync(path.join(__dirname, '../js', name), 'utf8');
vm.runInContext(source('core.js'), context);
vm.runInContext(source('i18n.js'), context);
Object.assign(context.window.EasyBlockBreaker, {
  createAudio: () => ({ initAudio() {}, sfx() {}, setVolume() {} }),
  createRenderer: () => ({ render() {} }),
});
vm.runInContext(source('game.js').replace('window.__rbb = state;',
  'window.test = { state, startGame, spawnWave, update, COLS }; window.__rbb = state;'), context);
const { state, startGame, spawnWave, update, COLS } = context.window.test;
const { STEEL_FROM_WAVE } = context.window.EasyBlockBreaker;

// placement: every steel cell touches a non-steel cell or the open floor row, so a ball over it can always get out
let cellsChecked = 0;
for (let trial = 0; trial < 200; trial++) for (let wave = STEEL_FROM_WAVE; wave < STEEL_FROM_WAVE + 12; wave++) {
  spawnWave(wave);
  const steel = new Set(state.blocks.filter(b => b.steel).map(b => b.col + ',' + b.row));
  const rows = state.blocks.reduce((m, b) => Math.max(m, b.row), 0) + 1;
  for (const k of steel) {
    const [c, r] = k.split(',').map(Number);
    const exit = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dc, dr]) => {
      const nc = c + dc, nr = r + dr;
      return nc >= 0 && nc < COLS && nr >= 0 && nr <= rows && !steel.has(nc + ',' + nr);
    });
    assert.ok(exit, `wave ${wave}: steel cell ${k} is walled in by steel and rails`);
    cellsChecked++;
  }
}
assert.ok(cellsChecked > 0);

// activation: a steel cell neither rises nor comes solid while a ball is over any part of it, then all four cubes
// come solid together once the ball has left
startGame();
spawnWave(STEEL_FROM_WAVE);
const cell = state.steelCells[0];
assert.equal(cell.cubes.length, 4);
const ball = state.balls[0];
ball.x = cell.x + cell.w - 1; ball.y = cell.y + cell.h - 1; ball.vx = 0; ball.vy = 0;   // bottom-right corner cube only
const spawnBefore = cell.cubes.map(c => c.spawn);
for (let i = 0; i < 300; i++) update(1 / 60);
assert.deepEqual(cell.cubes.map(c => c.spawn), spawnBefore, 'steel cell keeps waiting while a ball is over it');
assert.ok(cell.cubes.every(c => !c.active), 'no cube of the cell comes solid while a ball is over it');
assert.ok(state.blocks.filter(b => !b.steel).every(b => b.spawn >= 1), 'breakable cubes keep rising meanwhile');
ball.x = cell.x + cell.w + ball.r + 3; ball.y = cell.y + cell.h + ball.r + 3;   // just clear of the cell
let activatedAt = -1;
for (let i = 0; i < 120 && activatedAt < 0; i++) {
  update(1 / 60);
  const solid = cell.cubes.filter(c => c.active).length;
  assert.ok(solid === 0 || solid === 4, 'steel cubes come solid all at once');
  if (solid === 4) activatedAt = i;
}
assert.ok(activatedAt >= 0, 'steel cell comes solid once the ball is clear');
console.log(`Steel checks passed: ${cellsChecked} cells had an exit; cell came solid ${activatedAt + 1} frames after the ball left.`);
