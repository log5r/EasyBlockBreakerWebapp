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

return { W, H, HUD_H, WALL, L, Rgt, T, B, R, BASE_SPEED, MAX_SPEED, MIN_SPEED, WAVE_TIME_BONUS, ZONE_W, ZONE_MAX_ANGLE, TIME_LIMIT, MAX_BALLS, clamp, rand, lerp, PALETTE };
})();
