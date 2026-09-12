window.RealBlockBreaker.createRenderer = function (canvas, state, multiplier) {
'use strict';

const { W, H, HUD_H, WALL, L, Rgt, T, B, ZONE_W, ZONE_MAX_ANGLE, ITEM_W, ITEM_H, ITEMS, rand } = window.RealBlockBreaker;
const ctx = canvas.getContext('2d');
canvas.width = W; canvas.height = H;

// ---------------------------------------------------------------- textures
// brushed stainless: base gradient across the brushing direction + many faint scratches along it
function makeBrushedTexture(w, h, stops, vertical, alphaMax, count) {
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  const c = cv.getContext('2d');
  const g = vertical ? c.createLinearGradient(0, 0, w, 0) : c.createLinearGradient(0, 0, 0, h);
  stops.forEach(([p, col]) => g.addColorStop(p, col));
  c.fillStyle = g; c.fillRect(0, 0, w, h);
  c.lineWidth = 1;
  for (let i = 0; i < count; i++) {
    const a = rand(0, alphaMax), light = Math.random() < 0.5;
    c.strokeStyle = light ? `rgba(255,255,255,${a})` : `rgba(0,0,0,${a * 1.4})`;
    const px = rand(0, w), py = rand(0, h), len = rand(20, 180);
    c.beginPath(); c.moveTo(px, py);
    if (vertical) c.lineTo(px, py + len); else c.lineTo(px + len, py);
    c.stroke();
  }
  return cv;
}
// matte black powder coat: flat base, fine speckle, soft vignette
function makeMatteTexture(w, h) {
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  const c = cv.getContext('2d');
  c.fillStyle = '#1c1f23'; c.fillRect(0, 0, w, h);
  c.fillStyle = 'rgba(255,255,255,.035)';
  for (let i = 0; i < 9000; i++) c.fillRect(rand(0, w), rand(0, h), 1, 1);
  const v = c.createRadialGradient(w / 2, h / 2, 80, w / 2, h / 2, Math.max(w, h) * 0.62);
  v.addColorStop(0, 'rgba(255,255,255,.04)'); v.addColorStop(1, 'rgba(0,0,0,.35)');
  c.fillStyle = v; c.fillRect(0, 0, w, h);
  return cv;
}
const STEEL = [[0, '#9aa1a8'], [0.25, '#d6dbe0'], [0.5, '#aab1b8'], [0.75, '#c9ced4'], [1, '#858c93']];
const LED_WARM = '#ffd9a3';        // warm-white LED strip along the rails
const boardTex = makeMatteTexture(W, H);
const railTexH = makeBrushedTexture(W, WALL, STEEL, false, 0.10, 500);        // top / bottom rails
const railTexV = makeBrushedTexture(WALL, H, STEEL, true, 0.10, 500);         // side rails

function hexBolt(c, x, y, r, tone = '#c9ced4') {
  c.save();
  c.fillStyle = 'rgba(0,0,0,.45)'; c.beginPath(); c.arc(x + 1, y + 1.5, r + 1, 0, Math.PI * 2); c.fill();
  const g = c.createRadialGradient(x - r * 0.4, y - r * 0.4, 1, x, y, r);
  g.addColorStop(0, '#f4f6f8'); g.addColorStop(0.5, tone); g.addColorStop(1, '#4e555c');
  c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill();
  // hex socket
  c.fillStyle = 'rgba(0,0,0,.55)'; c.beginPath();
  for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3 + 0.3, hr = r * 0.5; c[i ? 'lineTo' : 'moveTo'](x + Math.cos(a) * hr, y + Math.sin(a) * hr); }
  c.closePath(); c.fill();
  c.restore();
}

// static background (rails + board + HUD bezel)
const bgCanvas = document.createElement('canvas'); bgCanvas.width = W; bgCanvas.height = H;
(function drawStaticBackground() {
  const c = bgCanvas.getContext('2d');
  // stainless rails: horizontal brushing on top/bottom, vertical on the sides
  c.drawImage(railTexH, 0, HUD_H); c.drawImage(railTexH, 0, B);
  c.drawImage(railTexV, 0, 0); c.drawImage(railTexV, Rgt, 0);
  // mitre seams at the corners
  c.strokeStyle = 'rgba(0,0,0,.35)'; c.lineWidth = 1;
  [[0, HUD_H, L, T], [W, HUD_H, Rgt, T], [0, H, L, B], [W, H, Rgt, B]].forEach(([x0, y0, x1, y1]) => {
    c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke();
  });
  // board interior
  c.save(); c.beginPath(); c.rect(L, T, Rgt - L, B - T); c.clip();
  c.drawImage(boardTex, 0, 0);
  // inner shadow from the rails
  const sh = 18;
  [[L, 0, L + sh, 0], [Rgt, 0, Rgt - sh, 0], [0, T, 0, T + sh], [0, B, 0, B - sh]].forEach(([x0, y0, x1, y1]) => {
    const g = c.createLinearGradient(x0, y0, x1, y1);
    g.addColorStop(0, 'rgba(0,0,0,.55)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = g; c.fillRect(L, T, Rgt - L, B - T);
  });
  c.restore();
  // rail lip: bright edge on the inside, dark groove a little further out
  c.strokeStyle = 'rgba(255,255,255,.55)'; c.lineWidth = 1; c.strokeRect(L - 0.5, T - 0.5, Rgt - L + 1, B - T + 1);
  c.strokeStyle = 'rgba(0,0,0,.6)'; c.strokeRect(L - 3.5, T - 3.5, Rgt - L + 7, B - T + 7);
  // warm-white LED strip running just inside the rails
  c.save(); c.lineJoin = 'round';
  for (let i = 2; i >= 1; i--) {
    c.shadowColor = LED_WARM; c.shadowBlur = 8 * i; c.strokeStyle = LED_WARM; c.globalAlpha = 0.5; c.lineWidth = 1.5;
    c.strokeRect(L + 5, T + 5, Rgt - L - 10, B - T - 10);
  }
  c.shadowBlur = 0; c.globalAlpha = 1; c.strokeStyle = '#fff'; c.lineWidth = 0.7;
  c.strokeRect(L + 5, T + 5, Rgt - L - 10, B - T - 10);
  c.restore();
  // hex socket bolts at the corners and mid-rails
  [[14, HUD_H + 14], [W - 14, HUD_H + 14], [14, H - 14], [W - 14, H - 14], [14, (T + B) / 2], [W - 14, (T + B) / 2]]
    .forEach(([x, y]) => hexBolt(c, x, y, 6));
  // HUD bezel: polished chrome with a black glass window
  const pg = c.createLinearGradient(0, 0, 0, HUD_H);
  pg.addColorStop(0, '#e9edf0'); pg.addColorStop(0.18, '#7f868e'); pg.addColorStop(0.5, '#c7ccd1'); pg.addColorStop(0.85, '#5b626a'); pg.addColorStop(1, '#d9dee3');
  c.fillStyle = pg; c.fillRect(0, 0, W, HUD_H);
  c.fillStyle = '#05070c'; roundRect(c, 6, 6, W - 12, HUD_H - 14, 4); c.fill();
  c.fillStyle = 'rgba(255,255,255,.35)'; c.fillRect(0, 0, W, 1);
})();

// ---------------------------------------------------------------- rendering
function roundRect(c, x, y, w, h, r) {
  c.beginPath(); c.moveTo(x + r, y); c.lineTo(x + w - r, y); c.quadraticCurveTo(x + w, y, x + w, y + r);
  c.lineTo(x + w, y + h - r); c.quadraticCurveTo(x + w, y + h, x + w - r, y + h); c.lineTo(x + r, y + h);
  c.quadraticCurveTo(x, y + h, x, y + h - r); c.lineTo(x, y + r); c.quadraticCurveTo(x, y, x + r, y); c.closePath();
}

// cubes sit edge to edge, so each one is drawn as a square with a bevelled rim
// (light top/left, dark bottom/right) instead of a rounded, inset tile
function blockTransform(bl) {
  const s = bl.spawn <= 0 ? 0 : 1 - Math.pow(1 - bl.spawn, 3);
  if (s <= 0) return false;
  const cx = bl.x + bl.w / 2, cy = bl.y + bl.h / 2;
  ctx.translate(cx, cy); ctx.scale(s, s);
  if (bl.wobble > 0) ctx.rotate(Math.sin(bl.wobble * 20) * 0.04 * bl.wobble);
  ctx.translate(-cx, -cy);
  return true;
}
// empty socket left by a broken cube: a dark recess that fills with fresh paint as the cube regrows
function drawSocket(bl) {
  const x = bl.x, y = bl.y, w = bl.w, h = bl.h, k = Math.min(1, bl.regrow / bl.regrowT);
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,.4)'; ctx.fillRect(x + 2, y + 2, w - 4, h - 4);
  ctx.strokeStyle = 'rgba(255,255,255,.08)'; ctx.lineWidth = 1; ctx.strokeRect(x + 2.5, y + 2.5, w - 5, h - 5);
  const fh = (h - 8) * k;
  ctx.globalAlpha = 0.2 + 0.25 * k; ctx.fillStyle = bl.color.base;
  ctx.fillRect(x + 4, y + h - 4 - fh, w - 8, fh);
  // rim flickers just before the cube comes back
  if (k > 0.8) {
    ctx.globalAlpha = (k - 0.8) / 0.2 * (0.5 + 0.5 * Math.sin(bl.regrow * 18));
    ctx.strokeStyle = bl.color.light; ctx.strokeRect(x + 2.5, y + 2.5, w - 5, h - 5);
  }
  ctx.restore();
}
function drawBlockShadow(bl) {
  if (bl.dead) return;
  ctx.save();
  if (blockTransform(bl)) { ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.fillRect(bl.x + 3, bl.y + 5, bl.w, bl.h); }
  ctx.restore();
}
function drawBlock(bl) {
  if (bl.dead) return;
  ctx.save();
  if (!blockTransform(bl)) { ctx.restore(); return; }
  const x = bl.x, y = bl.y, w = bl.w, h = bl.h, bv = Math.max(3, Math.round(w * 0.12));   // bevel width
  // painted face fills the whole cell
  const tg = ctx.createLinearGradient(x, y, x + w, y + h);
  tg.addColorStop(0, bl.color.light); tg.addColorStop(0.5, bl.color.base); tg.addColorStop(1, bl.color.dark);
  ctx.fillStyle = tg; ctx.fillRect(x, y, w, h);
  // brushed lines through the paint (inner face only)
  ctx.save(); ctx.beginPath(); ctx.rect(x + bv, y + bv, w - bv * 2, h - bv * 2); ctx.clip(); ctx.lineWidth = 1;
  for (let i = 0, ly = y + bv + 1; ly < y + h - bv; i++, ly += 1.7) {
    ctx.strokeStyle = i % 2 ? 'rgba(255,255,255,.07)' : 'rgba(0,0,0,.10)';
    ctx.beginPath(); ctx.moveTo(x, ly); ctx.lineTo(x + w, ly); ctx.stroke();
  }
  ctx.restore();
  // bevelled rim: lit top + left, shaded bottom + right (mitred at the corners)
  ctx.fillStyle = 'rgba(255,255,255,.28)';
  ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w - bv, y + bv); ctx.lineTo(x + bv, y + bv); ctx.lineTo(x + bv, y + h - bv); ctx.lineTo(x, y + h); ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(0,0,0,.38)';
  ctx.beginPath(); ctx.moveTo(x + w, y + h); ctx.lineTo(x, y + h); ctx.lineTo(x + bv, y + h - bv); ctx.lineTo(x + w - bv, y + h - bv); ctx.lineTo(x + w - bv, y + bv); ctx.lineTo(x + w, y); ctx.closePath(); ctx.fill();
  // steel seam between neighbouring cubes
  ctx.strokeStyle = 'rgba(0,0,0,.55)'; ctx.lineWidth = 1; ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  ctx.strokeStyle = 'rgba(255,255,255,.18)'; ctx.strokeRect(x + bv + 0.5, y + bv + 0.5, w - bv * 2 - 1, h - bv * 2 - 1);
  // damage: paint scratched down to bare metal on multi-hit blocks
  if (bl.maxHp > 1) {
    const dmg = bl.maxHp - bl.hp;
    ctx.strokeStyle = 'rgba(0,0,0,.6)'; ctx.lineWidth = 1.2;
    for (let i = 0; i < dmg; i++) {
      const sx = x + w * (0.3 + 0.4 * ((i * 7) % 3) / 2), sy = y + bv + 3;
      ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx - 8 + (i % 2) * 16, sy + h * 0.35); ctx.lineTo(sx + 3 - (i % 2) * 10, sy + h - bv * 2 - 6); ctx.stroke();
      ctx.strokeStyle = 'rgba(220,226,232,.7)'; ctx.lineWidth = 0.8;
      ctx.beginPath(); ctx.moveTo(sx + 1, sy); ctx.lineTo(sx - 7 + (i % 2) * 16, sy + h * 0.35); ctx.lineTo(sx + 4 - (i % 2) * 10, sy + h - bv * 2 - 6); ctx.stroke();
      ctx.strokeStyle = 'rgba(0,0,0,.6)'; ctx.lineWidth = 1.2;
    }
    if (bl.maxHp >= 3) {
      ctx.strokeStyle = 'rgba(255,255,255,.5)'; ctx.lineWidth = 1.5; ctx.strokeRect(x + bv + 3, y + bv + 3, w - bv * 2 - 6, h - bv * 2 - 6);
    }
  }
  ctx.restore();
}

function drawZone() {
  const z = state.zone, x0 = z.x - ZONE_W / 2, y0 = B - 2, h = WALL - 4;
  // chrome plate set into the bottom rail
  ctx.save();
  const pg = ctx.createLinearGradient(x0, y0, x0 + ZONE_W, y0 + h);
  pg.addColorStop(0, '#5b6269'); pg.addColorStop(0.3, '#dfe4e8'); pg.addColorStop(0.5, '#ffffff'); pg.addColorStop(0.7, '#c2c8ce'); pg.addColorStop(1, '#4d545b');
  ctx.fillStyle = pg; roundRect(ctx, x0, y0, ZONE_W, h, 4); ctx.fill();
  // engraved center mark + tick marks showing the reflection angle map
  ctx.strokeStyle = 'rgba(0,0,0,.45)'; ctx.lineWidth = 1.2;
  for (let i = -3; i <= 3; i++) {
    const tx = z.x + i * (ZONE_W / 8);
    ctx.beginPath(); ctx.moveTo(tx, y0 + 4); ctx.lineTo(tx, y0 + (i === 0 ? 14 : 8)); ctx.stroke();
  }
  ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.lineWidth = 1; roundRect(ctx, x0 + 1, y0 + 1, ZONE_W - 2, h - 2, 3); ctx.stroke();
  // active LED strip on the interior edge (glows when hit)
  const glow = 0.55 + z.flash * 0.45;
  ctx.shadowColor = `rgba(255,217,163,${glow})`; ctx.shadowBlur = 12 + z.flash * 18;
  ctx.fillStyle = `rgba(255,233,198,${0.8 + z.flash * 0.2})`;
  ctx.fillRect(x0 + 2, B - 3, ZONE_W - 4, 3);
  ctx.restore();
  // aim guide: faint fan showing possible exit angles
  ctx.save();
  ctx.globalAlpha = 0.12 + z.flash * 0.15;
  ctx.strokeStyle = LED_WARM; ctx.lineWidth = 1;
  for (let i = -2; i <= 2; i++) {
    const t = i / 2, ang = t * ZONE_MAX_ANGLE, sx = z.x + t * ZONE_W / 2;
    ctx.beginPath(); ctx.moveTo(sx, B - 3); ctx.lineTo(sx + Math.sin(ang) * 60, B - 3 - Math.cos(ang) * 60); ctx.stroke();
  }
  ctx.restore();
}

function drawBall(b) {
  const x = b.x, y = b.y, R = b.r;
  // faint motion blur trail
  for (let i = b.trail.length - 1; i >= 1; i--) {
    const t = b.trail[i]; ctx.globalAlpha = 0.05 * (1 - i / b.trail.length);
    ctx.fillStyle = '#c8ccd0'; ctx.beginPath(); ctx.arc(t.x, t.y, R, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
  // contact shadow on the board (light comes from upper-left)
  const sg = ctx.createRadialGradient(x + 4, y + 6, R * 0.2, x + 4, y + 6, R * 1.7);
  sg.addColorStop(0, 'rgba(0,0,0,.6)'); sg.addColorStop(0.6, 'rgba(0,0,0,.28)'); sg.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = sg; ctx.beginPath(); ctx.ellipse(x + 4, y + 6, R * 1.6, R * 1.35, 0, 0, Math.PI * 2); ctx.fill();
  // chrome body
  const bg = ctx.createRadialGradient(x - R * 0.42, y - R * 0.45, R * 0.05, x - R * 0.1, y - R * 0.1, R * 1.15);
  bg.addColorStop(0, '#ffffff'); bg.addColorStop(0.18, '#eef1f3'); bg.addColorStop(0.45, '#aeb5bb');
  bg.addColorStop(0.72, '#5f666d'); bg.addColorStop(0.92, '#2b3035'); bg.addColorStop(1, '#1a1d21');
  ctx.fillStyle = bg; ctx.beginPath(); ctx.arc(x, y, R, 0, Math.PI * 2); ctx.fill();
  // environment reflection: bright "sky" on top, dark steel board on the lower half, rail glint at the bottom
  ctx.save(); ctx.beginPath(); ctx.arc(x, y, R, 0, Math.PI * 2); ctx.clip();
  const eg = ctx.createLinearGradient(0, y - R, 0, y + R);
  eg.addColorStop(0, 'rgba(255,255,255,.15)'); eg.addColorStop(0.40, 'rgba(255,255,255,0)');
  eg.addColorStop(0.47, 'rgba(10,12,14,.55)'); eg.addColorStop(0.60, 'rgba(40,44,48,.45)');
  eg.addColorStop(0.85, 'rgba(20,22,25,.35)'); eg.addColorStop(1, 'rgba(220,225,230,.35)');
  ctx.fillStyle = eg; ctx.fillRect(x - R, y - R, R * 2, R * 2);
  // dark edge band (fresnel)
  const fg = ctx.createRadialGradient(x, y, R * 0.8, x, y, R);
  fg.addColorStop(0, 'rgba(0,0,0,0)'); fg.addColorStop(1, 'rgba(0,0,0,.45)');
  ctx.fillStyle = fg; ctx.fillRect(x - R, y - R, R * 2, R * 2);
  ctx.restore();
  // sharp specular highlights
  ctx.fillStyle = 'rgba(255,255,255,.95)';
  ctx.beginPath(); ctx.ellipse(x - R * 0.40, y - R * 0.44, R * 0.26, R * 0.17, -0.7, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.5)';
  ctx.beginPath(); ctx.arc(x + R * 0.35, y + R * 0.45, R * 0.10, 0, Math.PI * 2); ctx.fill();
  // rim light along lower edge
  ctx.strokeStyle = 'rgba(255,250,240,.35)'; ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.arc(x, y, R - 1, 0.35, Math.PI - 0.35); ctx.stroke();
}

// power-up token: a machined chrome chip with a coloured LED label, tumbling as it falls
function drawItem(it) {
  const def = ITEMS[it.type], w = ITEM_W, h = ITEM_H;
  ctx.save();
  ctx.translate(it.x, it.y); ctx.rotate(Math.sin(it.t * 2.4) * 0.18);
  // drop shadow on the board
  ctx.fillStyle = 'rgba(0,0,0,.5)'; roundRect(ctx, -w / 2 + 3, -h / 2 + 5, w, h, 5); ctx.fill();
  // chrome body
  const g = ctx.createLinearGradient(-w / 2, -h / 2, w / 2, h / 2);
  g.addColorStop(0, '#5b6269'); g.addColorStop(0.3, '#dfe4e8'); g.addColorStop(0.5, '#ffffff'); g.addColorStop(0.7, '#c2c8ce'); g.addColorStop(1, '#4d545b');
  ctx.fillStyle = g; roundRect(ctx, -w / 2, -h / 2, w, h, 5); ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,.55)'; ctx.lineWidth = 1; roundRect(ctx, -w / 2 + 0.5, -h / 2 + 0.5, w - 1, h - 1, 5); ctx.stroke();
  // black glass window with the LED label
  ctx.fillStyle = '#05070c'; roundRect(ctx, -w / 2 + 4, -h / 2 + 4, w - 8, h - 8, 3); ctx.fill();
  const pulse = 0.75 + 0.25 * Math.sin(it.t * 9);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = '800 11px "JetBrains Mono", "Menlo", "SF Mono", Consolas, monospace';
  ctx.shadowColor = def.color; ctx.shadowBlur = 8 * pulse; ctx.fillStyle = def.color;
  ctx.fillText(def.label, 0, 1);
  ctx.restore();
}
// active power-ups: small LED chips with a draining timer bar, bottom-left of the board
function drawEffects() {
  const fx = state.effects;
  let x = L + 10;
  const y = B - 30, w = 64, h = 20;
  for (const k in fx) {
    if (fx[k] <= 0) continue;
    const def = ITEMS[k], frac = fx[k] / def.dur, blink = fx[k] < 2 && Math.floor(fx[k] * 6) % 2 === 0;
    ctx.save();
    ctx.globalAlpha = blink ? 0.45 : 0.9;
    ctx.fillStyle = 'rgba(0,0,0,.6)'; roundRect(ctx, x, y, w, h, 3); ctx.fill();
    ctx.strokeStyle = def.color; ctx.lineWidth = 1; roundRect(ctx, x + 0.5, y + 0.5, w - 1, h - 1, 3); ctx.stroke();
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.font = '800 10px "JetBrains Mono", "Menlo", "SF Mono", Consolas, monospace';
    ctx.shadowColor = def.color; ctx.shadowBlur = 6; ctx.fillStyle = def.color;
    ctx.fillText(def.label, x + 6, y + 8);
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(255,255,255,.15)'; ctx.fillRect(x + 6, y + h - 5, w - 12, 2);
    ctx.fillStyle = def.color; ctx.fillRect(x + 6, y + h - 5, (w - 12) * frac, 2);
    ctx.restore();
    x += w + 6;
  }
}

function drawParticles() {
  for (const p of state.particles) {
    const k = 1 - p.t / p.life;
    if (p.ring) {
      ctx.globalAlpha = k * 0.7; ctx.strokeStyle = '#ffe9a8'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(p.x, p.y, 6 + (1 - k) * 40, Math.PI, Math.PI * 2); ctx.stroke();
      continue;
    }
    ctx.save(); ctx.globalAlpha = k; ctx.translate(p.x, p.y); ctx.rotate(p.rot);
    ctx.fillStyle = p.color; ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
    ctx.restore();
  }
  ctx.globalAlpha = 1;
}
function drawPopups() {
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  for (const p of state.popups) {
    const k = p.t;
    ctx.globalAlpha = k < 0.7 ? 1 : 1 - (k - 0.7) / 0.3;
    ctx.font = `800 ${p.size}px -apple-system, Helvetica, Arial, sans-serif`;
    ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,.8)';
    ctx.strokeText(p.text, p.x, p.y - k * 40); ctx.fillStyle = p.color; ctx.fillText(p.text, p.x, p.y - k * 40);
  }
  ctx.globalAlpha = 1;
}
function drawBanner() {
  const bn = state.banner; if (!bn) return;
  const k = bn.t / bn.dur, a = k < 0.15 ? k / 0.15 : k > 0.75 ? (1 - k) / 0.25 : 1;
  ctx.save(); ctx.globalAlpha = a; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const y = (T + B) / 2;
  ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fillRect(L, y - 44, Rgt - L, 88);
  ctx.font = '900 44px -apple-system, Helvetica, Arial, sans-serif';
  ctx.fillStyle = LED_BLUE; ctx.strokeStyle = 'rgba(0,0,0,.6)'; ctx.lineWidth = 4;
  ctx.strokeText(bn.text, W / 2, y - (bn.sub ? 12 : 0)); ctx.fillText(bn.text, W / 2, y - (bn.sub ? 12 : 0));
  if (bn.sub) { ctx.font = '700 20px -apple-system, Helvetica, Arial, sans-serif'; ctx.fillStyle = '#fff'; ctx.strokeText(bn.sub, W / 2, y + 24); ctx.fillText(bn.sub, W / 2, y + 24); }
  ctx.restore();
}
// HUD: white-blue LED digits on black glass
const LED_BLUE = '#dff6ff', LED_BLUE_GLOW = '#8fd8ff';
function drawHUD() {
  ctx.save();
  ctx.textBaseline = 'middle';
  const plate = (x, w, label, value, valueColor = LED_BLUE) => {
    const y = 12, h = HUD_H - 24;
    ctx.fillStyle = 'rgba(255,255,255,.03)'; roundRect(ctx, x, y, w, h, 3); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.10)'; ctx.lineWidth = 1; roundRect(ctx, x + 0.5, y + 0.5, w - 1, h - 1, 3); ctx.stroke();
    ctx.textAlign = 'left'; ctx.font = '600 10px "Chakra Petch", "Helvetica Neue", Arial, sans-serif'; ctx.fillStyle = '#6f8aa6';
    ctx.fillText(label, x + 9, y + 12);
    ctx.save();
    ctx.shadowColor = valueColor === LED_BLUE ? LED_BLUE_GLOW : valueColor; ctx.shadowBlur = 10;
    ctx.textAlign = 'right'; ctx.font = '800 22px "JetBrains Mono", "Menlo", "SF Mono", Consolas, monospace'; ctx.fillStyle = valueColor;
    ctx.fillText(value, x + w - 9, y + h - 17);
    ctx.restore();
  };
  const t = Math.ceil(state.time);
  // plate layout: BEST lives inside the SCORE plate as a small caption so 6-7 digit scores never overflow
  const SX = 12, SW = 284, TX = 306, TW = 110, CX = 426, CW = 86, WX = 522, WW = 66;
  plate(SX, SW, 'SCORE', state.score.toLocaleString());
  plate(TX, TW, 'TIME', t.toString(), t <= 10 && state.mode === 'playing' && (Math.floor(state.time * 4) % 2 === 0) ? '#ff5a4a' : t <= 10 ? '#ffb1a8' : LED_BLUE);
  // COMBO: big digits = hit count (+1 per hit), small badge = score multiplier, bar = progress to next multiplier
  plate(CX, CW, 'COMBO', state.combo.toString(), state.combo > 0 ? '#ffffff' : LED_BLUE);
  plate(WX, WW, 'WAVE', state.wave.toString());
  // BEST: small caption in the SCORE plate's label row; turns gold while the current run is beating it
  const beating = state.mode === 'playing' && state.score > 0 && state.score >= state.best;
  ctx.textAlign = 'right'; ctx.font = '700 10px "JetBrains Mono", "Menlo", "SF Mono", Consolas, monospace';
  ctx.fillStyle = beating ? '#ffd27a' : '#a9c8dc';
  ctx.fillText('BEST ' + state.best.toLocaleString(), SX + SW - 9, 12 + 12);
  if (state.mode === 'playing') {
    ctx.textAlign = 'right'; ctx.font = '700 10px "JetBrains Mono", "Menlo", "SF Mono", Consolas, monospace';
    ctx.fillStyle = multiplier() > 1 ? '#ffd27a' : '#6f8aa6';
    ctx.fillText('x' + multiplier(), CX + CW - 9, 12 + 12);
    const cx = CX + 8, cw = CW - 16, cy = HUD_H - 15;
    ctx.fillStyle = 'rgba(143,216,255,.12)'; ctx.fillRect(cx, cy, cw, 3);
    ctx.fillStyle = LED_BLUE; ctx.fillRect(cx, cy, cw * ((state.combo % 4) / 4), 3);
    // WAVE: bar = breaks toward the clear quota
    const wx = WX + 8, ww = WW - 16;
    ctx.fillStyle = 'rgba(143,216,255,.12)'; ctx.fillRect(wx, cy, ww, 3);
    ctx.fillStyle = '#ffd27a'; ctx.fillRect(wx, cy, ww * Math.min(1, state.waveBroken / Math.max(1, state.waveQuota)), 3);
  }
  ctx.restore();
}

// impact feedback: state.glow is a smoothed 0..1 value that swells after a block breaks and eases back
function drawImpactGlow() {
  const k = state.glow;
  if (k <= 0.005) return;
  ctx.save();
  // rail LEDs flare up in the colour of the block that just broke
  const col = state.hitColor ? state.hitColor.light : LED_WARM;
  ctx.lineJoin = 'round'; ctx.strokeStyle = col; ctx.shadowColor = col;
  for (let i = 3; i >= 1; i--) {
    ctx.shadowBlur = 10 * i + k * 14; ctx.globalAlpha = k * 0.45; ctx.lineWidth = 1.5 + k;
    ctx.strokeRect(L + 5, T + 5, Rgt - L - 10, B - T - 10);
  }
  ctx.shadowBlur = 0; ctx.globalAlpha = k * 0.9; ctx.strokeStyle = '#fff'; ctx.lineWidth = 1;
  ctx.strokeRect(L + 5, T + 5, Rgt - L - 10, B - T - 10);
  ctx.restore();
}
function drawImpactFlash() {
  const k = state.glow;
  if (k <= 0.005) return;
  ctx.save();
  ctx.globalAlpha = k * 0.1;
  ctx.fillStyle = state.hitColor ? state.hitColor.light : '#fff';
  ctx.fillRect(L, T, Rgt - L, B - T);
  ctx.restore();
}

function render() {
  ctx.save();
  ctx.drawImage(bgCanvas, 0, 0);
  drawImpactGlow();
  // play area clip for blocks/balls
  ctx.save(); ctx.beginPath(); ctx.rect(L, T, Rgt - L, B - T); ctx.clip();
  for (const bl of state.blocks) if (bl.dead) drawSocket(bl);   // sockets lie flat on the board, under everything
  for (const bl of state.blocks) drawBlockShadow(bl);   // shadows first so they never paint over a neighbour
  for (const bl of state.blocks) drawBlock(bl);
  drawParticles();
  for (const it of state.items) drawItem(it);
  for (const b of state.balls) drawBall(b);
  drawEffects();
  drawPopups();
  drawImpactFlash();
  ctx.restore();
  drawZone();
  drawBanner();
  ctx.restore();
  drawHUD();
}

return { render };
};
