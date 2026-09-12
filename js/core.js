// Shared configuration and helpers; classic scripts also support file:// URLs.
window.RealBlockBreaker = (() => {
'use strict';

// ---------------------------------------------------------------- constants
const W = 600, H = 880;            // logical canvas size
const HUD_H = 76;                  // top plaque
const WALL = 28;                   // steel rail thickness
const L = WALL, Rgt = W - WALL, T = HUD_H + WALL, B = H - WALL;  // interior bounds
const R = 13;                      // ball radius
const BASE_SPEED = 520, MAX_SPEED = 960, MIN_SPEED = 340;
const WAVE_TIME_BONUS = 10;        // seconds added on a full clear
const ZONE_W = 150;                // deflector width
const ZONE_MAX_ANGLE = 68 * Math.PI / 180;
const TIME_LIMIT = 90;
const MAX_BALLS = 3;
// ---------------------------------------------------------------- regrowth
// a broken cube leaves its socket behind and regrows there after REGROW_PER_HP seconds per point of toughness;
// a wave clears once as many cubes as the layout holds have been broken (regrown ones count again)
const REGROW_PER_HP = 6;
// ---------------------------------------------------------------- steel
// indestructible cubes mixed into the layout from STEEL_FROM_WAVE on; the count grows every STEEL_STEP waves up to STEEL_MAX cells.
// they never split the board: a cell is only accepted if every non-steel cell stays reachable from the open floor
const STEEL_FROM_WAVE = 3, STEEL_STEP = 2, STEEL_MAX = 6;
const STEEL_COLOR = { name: 'steel', base: '#aab1b8', light: '#d6dbe0', dark: '#5b626a' };
// ---------------------------------------------------------------- items
// dropped by broken blocks; caught on the deflector, lost on the plain rail
const ITEM_DROP_CHANCE = 0.15;
const ITEM_W = 40, ITEM_H = 22;
const ITEM_GRAVITY = 420, ITEM_MAX_FALL = 300;
const MAX_MULTI_BALLS = 12;        // hard cap while the x2 effect stacks
const ITEMS = {
  speed: { label: 'SPEED', color: '#ff8a4a', dur: 8,  speedMul: 1.6, maxMul: 1.4 },
  big:   { label: 'BIG',   color: '#5fd6ff', dur: 10, radiusMul: 1.8 },
  multi: { label: 'x2',    color: '#ffd84f', dur: 10 },
  pierce:{ label: 'PIERCE',color: '#c46bff', dur: 8 },   // balls pass through cubes (one hit each) and only bounce off walls
};
// ---------------------------------------------------------------- utils
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const rand = (a, b) => a + Math.random() * (b - a);
const lerp = (a, b, t) => a + (b - a) * t;
const PALETTE = [
  { name: 'red',    base: '#c8412f', light: '#e8735f', dark: '#7d2418' },
  { name: 'orange', base: '#e07b28', light: '#f5a45c', dark: '#8f4a12' },
  { name: 'yellow', base: '#e3b535', light: '#f7d770', dark: '#94711a' },
  { name: 'green',  base: '#5e9e46', light: '#8bc674', dark: '#35622a' },
  { name: 'blue',   base: '#3f7fbf', light: '#71a9de', dark: '#224b78' },
  { name: 'purple', base: '#7e5aa6', light: '#a98acc', dark: '#4a3266' },
];

return { W, H, HUD_H, WALL, L, Rgt, T, B, R, BASE_SPEED, MAX_SPEED, MIN_SPEED, WAVE_TIME_BONUS, ZONE_W, ZONE_MAX_ANGLE, TIME_LIMIT, MAX_BALLS, REGROW_PER_HP,
         STEEL_FROM_WAVE, STEEL_STEP, STEEL_MAX, STEEL_COLOR, ITEM_DROP_CHANCE, ITEM_W, ITEM_H, ITEM_GRAVITY, ITEM_MAX_FALL, MAX_MULTI_BALLS, ITEMS, clamp, rand, lerp, PALETTE };
})();
