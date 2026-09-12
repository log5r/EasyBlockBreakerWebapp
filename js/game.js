// Game state, rules, controls, and animation loop.
(() => {
'use strict';

const { W, H, HUD_H, WALL, L, Rgt, T, B, R, BASE_SPEED, MAX_SPEED, MIN_SPEED, WAVE_TIME_BONUS, ZONE_W, ZONE_MAX_ANGLE, TIME_LIMIT, MAX_BALLS, REGROW_PER_HP,
        ITEM_DROP_CHANCE, ITEM_W, ITEM_H, ITEM_GRAVITY, ITEM_MAX_FALL, MAX_MULTI_BALLS, ITEMS, clamp, rand, lerp, PALETTE } = window.RealBlockBreaker;
const canvas = document.getElementById('c');
const sound = window.RealBlockBreaker.createAudio();
const { initAudio, sfx } = sound;

// ---------------------------------------------------------------- game state
const state = {
  mode: 'ready',           // ready | playing | over
  score: 0, best: +(localStorage.getItem('rbb_best') || 0),
  time: TIME_LIMIT, wave: 1, combo: 0, maxCombo: 0, blocksBroken: 0,
  waveBroken: 0, waveQuota: 0,   // cubes broken this wave / breaks needed to clear it
  zone: { x: W / 2, target: W / 2, vx: 0, flash: 0 },
  balls: [], blocks: [], particles: [], popups: [], items: [],
  effects: { speed: 0, big: 0, multi: 0 },   // seconds left on each power-up
  banner: null, keys: {},
  impact: 0, glow: 0, hitColor: null,   // impact = pulse added per break; glow eases after it (LED flare + soft flash)
  timeAlive: 0,
};

function newBall(x, y, angle, speed, temp = false) {
  return { x, y, vx: Math.sin(angle) * speed, vy: -Math.cos(angle) * speed, r: ballRadius(), stuckT: 0, trail: [], temp };
}
function ballSpeed(b) { return Math.hypot(b.vx, b.vy); }
function setSpeed(b, s) { const cur = ballSpeed(b) || 1; b.vx *= s / cur; b.vy *= s / cur; }
function multiplier() { return 1 + Math.min(7, Math.floor(state.combo / 4)); }
// power-ups scale the speed band / radius while their timer runs
function baseSpeed() { return Math.min(MAX_SPEED * 0.8, BASE_SPEED + (state.wave - 1) * 25) * (state.effects.speed > 0 ? ITEMS.speed.speedMul : 1); }
function maxSpeed() { return MAX_SPEED * (state.effects.speed > 0 ? ITEMS.speed.maxMul : 1); }
function ballRadius() { return R * (state.effects.big > 0 ? ITEMS.big.radiusMul : 1); }
function permanentBalls() { return state.balls.filter(b => !b.temp).length; }

// ---------------------------------------------------------------- block layouts
// Layouts are designed on an 8-column grid; each design cell is split into SUB x SUB cubes
// that tile edge to edge and sit flush against the rails.
const COLS = 8, SUB = 2, CUBE = (Rgt - L) / (COLS * SUB);
const GRID_X0 = L, GRID_Y0 = T;
function mkBlock(col, row, hp, colorIdx) {
  const cubes = [];
  for (let j = 0; j < SUB; j++) for (let i = 0; i < SUB; i++) {
    cubes.push({ x: GRID_X0 + (col * SUB + i) * CUBE, y: GRID_Y0 + (row * SUB + j) * CUBE, w: CUBE, h: CUBE,
                 hp, maxHp: hp, color: PALETTE[colorIdx % PALETTE.length], spawn: 0, active: false, wobble: 0,
                 dead: false, regrow: 0, regrowT: 0 });   // dead cubes stay in the list as sockets until they regrow
  }
  return cubes;
}
const LAYOUTS = [
  // 0: classic grid
  (lv) => { const a = []; for (let r = 0; r < 4; r++) for (let c = 0; c < COLS; c++) a.push(mkBlock(c, r, r < 1 ? 2 : 1, r)); return a; },
  // 1: checker
  (lv) => { const a = []; for (let r = 0; r < 8; r++) for (let c = 0; c < COLS; c++) if ((r + c) % 2 === 0) a.push(mkBlock(c, r, 1 + (r < 2 ? 1 : 0), c)); return a; },
  // 2: diamond
  (lv) => { const a = []; for (let r = 0; r < 9; r++) for (let c = 0; c < COLS; c++) { const d = Math.abs(r - 4) + Math.abs(c - 3.5); if (d <= 4.5) a.push(mkBlock(c, r, d < 2 ? 3 : d < 3.5 ? 2 : 1, Math.floor(d))); } return a; },
  // 3: inverted pyramid
  (lv) => { const a = []; for (let r = 0; r < 6; r++) for (let c = 0; c < COLS; c++) if (c >= r * 0.6 && c < COLS - r * 0.6) a.push(mkBlock(c, r, 1 + (r === 0 ? 1 : 0), r + 1)); return a; },
  // 4: fortress columns
  (lv) => { const a = []; for (let r = 0; r < 9; r++) for (let c = 0; c < COLS; c++) { if (c === 0 || c === 7) a.push(mkBlock(c, r, 2, 4)); else if (r < 3 && c >= 2 && c <= 5) a.push(mkBlock(c, r, 3, 0)); else if (r === 6 && c % 2 === 1) a.push(mkBlock(c, r, 1, 2)); } return a; },
  // 5: random holes
  (lv) => { const a = []; for (let r = 0; r < 8; r++) for (let c = 0; c < COLS; c++) if (Math.random() < 0.7) a.push(mkBlock(c, r, 1 + (Math.random() < 0.3 ? 1 : 0), (r * 3 + c) % 6)); return a; },
  // 6: zigzag rows
  (lv) => { const a = []; for (let r = 0; r < 8; r++) for (let c = 0; c < COLS; c++) if ((c + (r % 2)) % 3 !== 0) a.push(mkBlock(c, r, r % 3 === 0 ? 2 : 1, r % 6)); return a; },
];
function spawnWave(wave) {
  const idx = (wave - 1) % LAYOUTS.length;
  const blocks = LAYOUTS[idx](wave).flat();
  const extraHp = Math.floor((wave - 1) / LAYOUTS.length);   // gets tougher each full cycle
  blocks.forEach((b, i) => { b.hp += extraHp; b.maxHp = b.hp; b.spawn = -i * 0.012; });
  state.blocks = blocks;
  state.waveBroken = 0; state.waveQuota = blocks.length;
}

// ---------------------------------------------------------------- start / reset
function startGame() {
  initAudio();
  Object.assign(state, { mode: 'playing', score: 0, time: TIME_LIMIT, wave: 1, combo: 0, maxCombo: 0, blocksBroken: 0,
                         particles: [], popups: [], items: [], effects: { speed: 0, big: 0, multi: 0 },
                         banner: null, impact: 0, glow: 0, timeAlive: 0 });
  state.zone.x = state.zone.target = W / 2; state.zone.vx = 0;
  state.balls = [newBall(W / 2, B - R - 40, rand(-0.5, 0.5), BASE_SPEED)];
  spawnWave(1);
  document.getElementById('start').classList.add('hidden');
  document.getElementById('over').classList.add('hidden');
  showBanner('WAVE 1', '', 1.2);
}
function endGame() {
  state.mode = 'over';
  if (state.score > state.best) { state.best = state.score; localStorage.setItem('rbb_best', state.best); }
  document.getElementById('finalScore').textContent = state.score.toLocaleString();
  document.getElementById('finalBest').textContent = 'BEST ' + state.best.toLocaleString();
  document.getElementById('finalStats').textContent =
    `WAVE ${state.wave} 到達 ／ ブロック ${state.blocksBroken} 個 ／ 最大コンボ ${state.maxCombo}`;
  document.getElementById('over').classList.remove('hidden');
}
function showBanner(text, sub, dur) { state.banner = { text, sub, t: 0, dur }; }
function popup(x, y, text, color = '#fff', size = 18) { state.popups.push({ x, y, text, color, size, t: 0 }); }

// ---------------------------------------------------------------- input
const zoneMin = L + ZONE_W / 2, zoneMax = Rgt - ZONE_W / 2;
function pointerToX(clientX) {
  const rect = canvas.getBoundingClientRect();
  return (clientX - rect.left) * (W / rect.width);
}
canvas.addEventListener('mousemove', e => { state.zone.target = clamp(pointerToX(e.clientX), zoneMin, zoneMax); });
canvas.addEventListener('touchstart', e => { e.preventDefault(); state.zone.target = clamp(pointerToX(e.touches[0].clientX), zoneMin, zoneMax); }, { passive: false });
canvas.addEventListener('touchmove', e => { e.preventDefault(); state.zone.target = clamp(pointerToX(e.touches[0].clientX), zoneMin, zoneMax); }, { passive: false });
window.addEventListener('keydown', e => {
  state.keys[e.key] = true;
  if (e.key === 'm' || e.key === 'M') toggleMute();
  if ((e.key === ' ' || e.key === 'Enter') && state.mode !== 'playing') startGame();
});
window.addEventListener('keyup', e => { state.keys[e.key] = false; });
document.getElementById('startBtn').addEventListener('click', startGame);
document.getElementById('retryBtn').addEventListener('click', startGame);
function toggleMute() { document.getElementById('mute').textContent = sound.toggleMute() ? '🔇' : '🔊'; }
document.getElementById('mute').addEventListener('click', e => { initAudio(); toggleMute(); e.target.blur(); });

// ---------------------------------------------------------------- physics
function hitBlock(bl, b, nx, ny) {
  bl.hp--; bl.wobble = 1;
  state.combo++; state.maxCombo = Math.max(state.maxCombo, state.combo);
  const px = clamp(b.x, bl.x, bl.x + bl.w), py = clamp(b.y, bl.y, bl.y + bl.h);
  if (bl.hp <= 0) {
    // the socket stays behind; tougher cubes take longer to regrow
    bl.dead = true; bl.active = false; bl.regrow = 0; bl.regrowT = REGROW_PER_HP * bl.maxHp;
    state.blocksBroken++; state.waveBroken++;
    const pts = 10 * bl.maxHp * multiplier();
    state.score += pts;
    popup(bl.x + bl.w / 2, bl.y + bl.h / 2, '+' + pts, bl.color.light, multiplier() > 1 ? 20 : 16);
    spawnSplinters(bl, px, py, 14);
    sfx('tile', 1);
    state.impact = Math.min(1, state.impact + 0.35); state.hitColor = bl.color;
    if (state.mode === 'playing' && Math.random() < ITEM_DROP_CHANCE) spawnItem(bl.x + bl.w / 2, bl.y + bl.h / 2);
  } else {
    spawnSplinters(bl, px, py, 5);
    sfx('tile', 0.6);
  }
  // tiny speed kick on impact keeps things lively
  setSpeed(b, clamp(ballSpeed(b) + 6, MIN_SPEED, maxSpeed()));
}
function spawnSplinters(bl, px, py, n) {
  for (let i = 0; i < n; i++) {
    const a = rand(0, Math.PI * 2), s = rand(60, 260);
    state.particles.push({ x: px, y: py, vx: Math.cos(a) * s, vy: Math.sin(a) * s, rot: rand(0, 6.28), vr: rand(-10, 10),
      w: rand(3, 8), h: rand(1.5, 3), life: rand(0.4, 0.9), t: 0, color: Math.random() < 0.5 ? bl.color.base : '#b8bfc6' });
  }
}

function stepBall(b, dt) {
  b.x += b.vx * dt; b.y += b.vy * dt;
  const R = b.r;   // radius grows under the BIG power-up
  let hitWall = false;

  // side & top walls
  if (b.x - R < L) { b.x = L + R; if (b.vx < 0) b.vx = -b.vx; hitWall = true; }
  if (b.x + R > Rgt) { b.x = Rgt - R; if (b.vx > 0) b.vx = -b.vx; hitWall = true; }
  if (b.y - R < T) { b.y = T + R; if (b.vy < 0) b.vy = -b.vy; hitWall = true; }
  // bottom wall (never falls out)
  if (b.y + R > B) {
    b.y = B - R;
    if (b.vy > 0) {
      const z = state.zone;
      if (Math.abs(b.x - z.x) <= ZONE_W / 2) {
        // --- deflector: angle set by where the ball lands, not by incoming direction
        const t = clamp((b.x - z.x) / (ZONE_W / 2), -1, 1);
        const ang = t * ZONE_MAX_ANGLE;
        const sp = clamp(ballSpeed(b) * 1.10 + 30, MIN_SPEED, maxSpeed());
        b.vx = Math.sin(ang) * sp + z.vx * 0.22;     // slice from moving deflector
        b.vy = -Math.cos(ang) * sp;
        setSpeed(b, clamp(ballSpeed(b), MIN_SPEED, maxSpeed()));
        z.flash = 1; sfx('metal', 0.9);
        state.particles.push({ x: b.x, y: B, ring: true, t: 0, life: 0.35 });
      } else {
        b.vy = -b.vy * 0.92;                          // plain steel rail, loses a bit of energy
        if (state.combo > 0) popup(b.x, B - 40, 'COMBO LOST', '#ffb08a', 13);
        state.combo = 0;
        hitWall = true;
      }
    }
  }
  if (hitWall) {
    sfx('wall', 0.5);
    // tiny realistic imperfection + avoid dead-flat loops
    const sp = ballSpeed(b), a = Math.atan2(b.vy, b.vx) + rand(-0.012, 0.012);
    b.vx = Math.cos(a) * sp; b.vy = Math.sin(a) * sp;
  }

  // blocks: cubes touch each other, so resolve against the deepest overlap only —
  // otherwise a neighbour's corner could deflect a ball that hit a flat shared face
  let hit = null, hcx = 0, hcy = 0, hd2 = R * R;
  for (const bl of state.blocks) {
    if (!bl.active || bl.dead) continue;
    const cx = clamp(b.x, bl.x, bl.x + bl.w), cy = clamp(b.y, bl.y, bl.y + bl.h);
    const dx = b.x - cx, dy = b.y - cy, d2 = dx * dx + dy * dy;
    if (d2 < hd2) { hit = bl; hcx = cx; hcy = cy; hd2 = d2; }
  }
  if (hit) {
    const bl = hit, cx = hcx, cy = hcy, d2 = hd2, dx = b.x - cx, dy = b.y - cy;
    let nx, ny;
    if (d2 > 1e-6) { const d = Math.sqrt(d2); nx = dx / d; ny = dy / d; b.x = cx + nx * R; b.y = cy + ny * R; }
    else {
      const pl = b.x - bl.x, pr = bl.x + bl.w - b.x, pt = b.y - bl.y, pb = bl.y + bl.h - b.y, m = Math.min(pl, pr, pt, pb);
      if (m === pl) { nx = -1; ny = 0; b.x = bl.x - R; } else if (m === pr) { nx = 1; ny = 0; b.x = bl.x + bl.w + R; }
      else if (m === pt) { nx = 0; ny = -1; b.y = bl.y - R; } else { nx = 0; ny = 1; b.y = bl.y + bl.h + R; }
    }
    const vn = b.vx * nx + b.vy * ny;
    if (vn < 0) { b.vx -= 2 * vn * nx; b.vy -= 2 * vn * ny; }
    hitBlock(bl, b, nx, ny);
  }

  // anti-stall: if the ball is nearly horizontal / vertical for too long, nudge it
  const sp = ballSpeed(b);
  if (Math.abs(b.vy) < sp * 0.08 || Math.abs(b.vx) < sp * 0.05) b.stuckT += dt; else b.stuckT = 0;
  if (b.stuckT > 1.5) {
    const a = Math.atan2(b.vy, b.vx) + (Math.random() < 0.5 ? 0.25 : -0.25);
    b.vx = Math.cos(a) * sp; b.vy = Math.sin(a) * sp; b.stuckT = 0;
  }
}
function ballBallCollisions() {
  const bs = state.balls;
  for (let i = 0; i < bs.length; i++) for (let j = i + 1; j < bs.length; j++) {
    const a = bs[i], b = bs[j];
    const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy), rr = a.r + b.r;
    if (d >= rr || d === 0) continue;
    const nx = dx / d, ny = dy / d, overlap = rr - d;
    a.x -= nx * overlap / 2; a.y -= ny * overlap / 2; b.x += nx * overlap / 2; b.y += ny * overlap / 2;
    const rvx = b.vx - a.vx, rvy = b.vy - a.vy, vn = rvx * nx + rvy * ny;
    if (vn < 0) { a.vx += vn * nx; a.vy += vn * ny; b.vx -= vn * nx; b.vy -= vn * ny; sfx('clink', 0.7); }
  }
}

// ---------------------------------------------------------------- items & power-ups
function spawnItem(x, y) {
  const keys = Object.keys(ITEMS), type = keys[Math.floor(Math.random() * keys.length)];
  state.items.push({ type, x: clamp(x, L + ITEM_W / 2, Rgt - ITEM_W / 2), y, vy: rand(-60, 20), t: 0 });
}
function applyItem(type) {
  const def = ITEMS[type], fx = state.effects;
  fx[type] = def.dur;   // timer first so baseSpeed() / ballRadius() already read the boost below
  if (type === 'multi') {
    // double the current set (temp balls included, so it stacks) up to a hard cap
    const src = state.balls.slice();
    for (const b of src) {
      if (state.balls.length >= MAX_MULTI_BALLS) break;
      const a = Math.atan2(b.vy, b.vx) + (Math.random() < 0.5 ? 0.6 : -0.6), sp = ballSpeed(b);
      const nb = newBall(b.x, b.y, 0, sp, true);
      nb.vx = Math.cos(a) * sp; nb.vy = Math.sin(a) * sp; nb.r = b.r;
      state.balls.push(nb);
    }
  } else if (type === 'speed') {
    for (const b of state.balls) setSpeed(b, clamp(Math.max(ballSpeed(b), baseSpeed()), MIN_SPEED, maxSpeed()));
  }
  popup(state.zone.x, B - 70, def.label + '!', def.color, 20);
  sfx('item');
}
function endEffect(type) {
  if (type === 'multi') state.balls = state.balls.filter(b => !b.temp);
}
function updateItems(dt) {
  const z = state.zone;
  for (const it of state.items) {
    it.t += dt;
    it.vy = Math.min(it.vy + ITEM_GRAVITY * dt, ITEM_MAX_FALL);
    it.y += it.vy * dt;
    if (it.y + ITEM_H / 2 < B) continue;
    // reached the bottom rail: caught on the deflector or lost
    it.dead = true;
    if (Math.abs(it.x - z.x) <= ZONE_W / 2 + ITEM_W / 2) {
      z.flash = 1;
      applyItem(it.type);
      state.particles.push({ x: it.x, y: B, ring: true, t: 0, life: 0.35 });
    } else {
      spawnSplinters({ color: { base: ITEMS[it.type].color } }, it.x, B - 4, 6);
    }
  }
  state.items = state.items.filter(it => !it.dead);
  const fx = state.effects;
  for (const k in fx) {
    if (fx[k] <= 0) continue;
    fx[k] -= dt;
    if (fx[k] <= 0) { fx[k] = 0; endEffect(k); }
  }
}

function update(dt) {
  // deflector movement (keys or pointer)
  const z = state.zone;
  const kdir = (state.keys['ArrowRight'] || state.keys['d'] || state.keys['D'] ? 1 : 0) - (state.keys['ArrowLeft'] || state.keys['a'] || state.keys['A'] ? 1 : 0);
  if (kdir) z.target = clamp(z.target + kdir * 620 * dt, zoneMin, zoneMax);
  const prev = z.x;
  z.x = lerp(z.x, z.target, 1 - Math.pow(0.0005, dt));
  z.vx = lerp(z.vx, (z.x - prev) / dt, 0.4);
  z.flash = Math.max(0, z.flash - dt * 3);

  if (state.mode !== 'playing') return;
  state.time -= dt; state.timeAlive += dt;
  if (state.time <= 0) { state.time = 0; endGame(); return; }

  // block regrowth / spawn animation / activation
  for (const bl of state.blocks) {
    if (bl.dead) {
      bl.regrow += dt;
      if (bl.regrow >= bl.regrowT) { bl.dead = false; bl.hp = bl.maxHp; bl.spawn = 0; bl.wobble = 0; }
      continue;
    }
    bl.spawn = Math.min(1, bl.spawn + dt * 2.2);
    if (bl.wobble > 0) bl.wobble = Math.max(0, bl.wobble - dt * 5);
    if (!bl.active && bl.spawn >= 1) {
      // don't activate on top of a ball
      const overlap = state.balls.some(b => b.x + b.r > bl.x - 2 && b.x - b.r < bl.x + bl.w + 2 && b.y + b.r > bl.y - 2 && b.y - b.r < bl.y + bl.h + 2);
      if (!overlap) bl.active = true;
    }
  }

  updateItems(dt);

  // balls: substep so fast balls never tunnel
  const targetR = ballRadius();
  for (const b of state.balls) {
    const s = ballSpeed(b);
    // roll friction toward base speed
    setSpeed(b, lerp(s, baseSpeed(), 1 - Math.pow(0.75, dt)));
    // radius eases toward the BIG target so the ball swells / shrinks instead of popping
    b.r = lerp(b.r, targetR, 1 - Math.pow(0.002, dt));
    const n = Math.max(1, Math.ceil(ballSpeed(b) * dt / (b.r * 0.5)));
    for (let i = 0; i < n; i++) stepBall(b, dt / n);
    b.trail.unshift({ x: b.x, y: b.y }); if (b.trail.length > 6) b.trail.pop();
  }
  ballBallCollisions();

  // wave clear: the break quota is met, so whatever is still standing shatters and the next layout drops in
  if (state.waveBroken >= state.waveQuota) {
    for (const bl of state.blocks) if (!bl.dead && bl.active) spawnSplinters(bl, bl.x + bl.w / 2, bl.y + bl.h / 2, 2);
    const bonus = 1000 + 500 * (state.wave - 1);
    state.score += bonus;
    state.time += WAVE_TIME_BONUS;
    state.wave++;
    showBanner('ALL CLEAR!', `+${bonus}  +${WAVE_TIME_BONUS}s  →  WAVE ${state.wave}`, 2.0);
    sfx('clear');
    spawnWave(state.wave);
    if (permanentBalls() < MAX_BALLS) {
      state.balls.push(newBall(state.zone.x, B - R - 30, rand(-0.6, 0.6), baseSpeed()));
      popup(state.zone.x, B - 70, '+1 BALL', '#ffe9a8', 16);
    }
  }

  // particles / popups / banner
  for (const p of state.particles) {
    p.t += dt;
    if (!p.ring) { p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= Math.pow(0.02, dt); p.vy *= Math.pow(0.02, dt); p.rot += p.vr * dt; }
  }
  state.particles = state.particles.filter(p => p.t < p.life);
  for (const p of state.popups) p.t += dt;
  state.popups = state.popups.filter(p => p.t < 1.0);
  if (state.banner) { state.banner.t += dt; if (state.banner.t > state.banner.dur) state.banner = null; }
  // glow chases impact with a lag so the light swells and fades instead of snapping on
  state.impact = Math.max(0, state.impact - dt * 2.5);
  state.glow += (state.impact - state.glow) * (1 - Math.exp(-dt * 9));
}

const { render } = window.RealBlockBreaker.createRenderer(canvas, state, multiplier);

// ---------------------------------------------------------------- loop & layout
let last = performance.now();
function frame(now) {
  let dt = (now - last) / 1000; last = now;
  dt = Math.min(dt, 1 / 30);
  update(dt);
  render();
  requestAnimationFrame(frame);
}
function fit() {
  const vw = window.innerWidth, vh = window.innerHeight, s = Math.min(vw / W, vh / H) * 0.98;
  canvas.style.width = (W * s) + 'px'; canvas.style.height = (H * s) + 'px';
}
window.addEventListener('resize', fit); fit();

// idle demo before start: a ball rolling around so the board isn't empty
state.balls = [newBall(W / 2, B - R - 40, 0.4, BASE_SPEED)];
spawnWave(1);
state.blocks.forEach(b => { b.spawn = 1; b.active = true; });
requestAnimationFrame(frame);
window.__rbb = state; // デバッグ用（DevTools から状態を確認できる）
})();
