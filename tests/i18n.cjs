const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
function load(navigator) {
  const elements = new Map();
  const element = () => ({ style: {}, attrs: {}, listeners: {}, classList: { add() {}, remove() {}, toggle() {} },
    addEventListener(event, cb) { this.listeners[event] = cb; },
    setAttribute(name, value) { this.attrs[name] = value; } });
  const translated = [...html.matchAll(/data-i18n="([^"]+)"/g)].map(m => ({ ...element(), dataset: { i18n: m[1] } }));
  const document = { documentElement: {}, addEventListener() {},
    getElementById(id) { if (!elements.has(id)) elements.set(id, element()); return elements.get(id); },
    querySelectorAll: selector => selector === '[data-i18n]' ? translated : [] };
  const context = vm.createContext({ navigator, document,
    window: { addEventListener() {}, innerWidth: 600, innerHeight: 880 },
    localStorage: { getItem: () => null, setItem() {} }, performance: { now: () => 0 }, requestAnimationFrame() {} });
  for (const file of ['core.js', 'i18n.js']) vm.runInContext(fs.readFileSync(path.join(root, 'js', file), 'utf8'), context);
  let muted = false;
  Object.assign(context.window.EasyBlockBreaker, {
    createAudio: () => ({ initAudio() {}, sfx() {}, setVolume() {}, toggleMute: () => muted = !muted }),
    createRenderer: () => ({ render() {} }),
  });
  vm.runInContext(fs.readFileSync(path.join(root, 'js/game.js'), 'utf8'), context);
  return { context, document, translated };
}
for (const [navigator, expected] of [
  [{ languages: ['ja-JP', 'en-US'] }, 'ja'], [{ languages: ['en-GB', 'ja'] }, 'en'],
  [{ languages: ['fr-FR', 'ja'] }, 'ja'], [{ languages: ['de', 'fr'] }, 'en'],
  [{ language: 'JA-jp' }, 'ja'], [{ languages: [], language: 'en-US' }, 'en'], [{}, 'en'],
]) {
  const { context, document, translated } = load(navigator);
  assert.equal(document.documentElement.lang, expected);
  for (const el of translated) {
    assert.ok(el.innerHTML && el.innerHTML !== el.dataset.i18n, `missing translation: ${el.dataset.i18n}`);
    if (expected === 'en') assert.doesNotMatch(el.innerHTML, /[ぁ-んァ-ヶ一-龠]/);
  }
  const click = id => document.getElementById(id).listeners.click();
  click('startBtn');
  const state = context.window.__rbb;
  assert.equal(state.mode, 'playing');
  state.score = 1234; state.wave = 3; state.blocksBroken = 42; state.maxCombo = 17;
  document.getElementById('pauseBtn').listeners.click({ target: { blur() {} } });
  assert.equal(state.paused, true);
  assert.equal(document.getElementById('pauseBtn').attrs['aria-label'], expected === 'en' ? 'Resume (P)' : '再開 (P)');
  click('finishBtn');
  assert.equal(state.mode, 'over');
  assert.equal(state.best, 1234);
  assert.equal(document.getElementById('finalStats').textContent, expected === 'en'
    ? 'WAVE 3 reached / Blocks broken: 42 / Max combo: 17' : 'WAVE 3 到達 ／ ブロック 42 個 ／ 最大コンボ 17');
  click('retryBtn');
  assert.equal(state.score, 0);
  document.getElementById('mute').listeners.click({ target: { blur() {} } });
  assert.equal(document.getElementById('mute').attrs['aria-label'], expected === 'en' ? 'Unmute (M)' : 'ミュート解除 (M)');
}
console.log('Language selection, translation coverage, results, retry, pause and mute checks passed.');
