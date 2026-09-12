# Real Block Breaker

**English** | [日本語](README.ja.md)

A browser game where a silver ball rolls around inside a steel cabinet and you smash as many blocks as you can before time runs out.
Written in plain HTML / CSS / JavaScript (Canvas 2D + Web Audio API) — no build step, no dependencies.

## How to play

- The bottom of the playfield is a wall, so the ball never drops out. There are no lives; you compete for score within a **90-second time limit**.
- Slide the **chrome deflector** on the bottom wall left and right. When the ball hits it, it is launched at an **angle that depends on where it struck**. Use this to steer the ball where you want it.
- Breaking blocks in a row builds a combo, and every 4 hits raises the score multiplier (up to x8). Hitting any wall other than the deflector breaks the combo.
- Broken blocks **regrow in place** after a while. The delay is proportional to toughness (toughness × 6 s); the empty socket shows a gauge while it regrows.
- Breaking as many cubes as the layout holds **clears the wave** (regrown blocks count again; the bar under WAVE shows progress). That awards bonus points and **extra time (+10 s)**, spawns a new wave of blocks, and adds one more ball (up to 3). Blocks get tougher and balls get faster as the waves go on.
- Broken blocks occasionally drop an **item**. Catch it on the deflector to activate a timed power-up; items that land on any other part of the bottom wall vanish.
  - **SPEED** (8 s): the balls move much faster.
  - **BIG** (10 s): the balls grow larger.
  - **x2** (10 s): the number of balls doubles (the extra balls disappear when it wears off).
- Your best score is saved in the browser's `localStorage`.

### Controls

| Action | Input |
| --- | --- |
| Move deflector | Mouse / touch, or <kbd>←</kbd> <kbd>→</kbd> / <kbd>A</kbd> <kbd>D</kbd> |
| Start / retry | <kbd>Space</kbd> / <kbd>Enter</kbd> or the on-screen button |
| Toggle mute | <kbd>M</kbd> or the button in the top-right corner |

## Running

Just open `index.html` in a browser.

To serve it locally instead:

```bash
python3 -m http.server 8765
```

Then open http://localhost:8765/.

## Project layout

```
index.html        Page structure
css/style.css     Styles
js/core.js        Shared configuration and helpers
js/audio.js       Sound effects
js/renderer.js    Canvas drawing and textures
js/game.js        Game state, rules, controls, and loop
```

## License

[MIT License](LICENSE) © 2026 log5
