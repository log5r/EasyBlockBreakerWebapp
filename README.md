# Easy Block Breaker

**English** | [日本語](README.ja.md)

A browser game where a silver ball rolls around inside a steel cabinet and you smash as many blocks as you can. Play a 90-second **Time Attack** or the **Infinite mode** with no time limit.
Written in plain HTML / CSS / JavaScript (Canvas 2D + Web Audio API) — no build step, no dependencies.

The interface automatically selects Japanese or English from your browser’s language preferences, falling back to English if neither is listed.

## How to play

- The bottom of the playfield is a wall, so the ball never drops out. There are no lives; you compete for score. Pick a mode on the title screen:
  - **Time Attack**: compete for score within a **90-second time limit**. Clearing a wave adds time.
  - **Infinite mode**: no time limit; the TIME plate in the HUD shows elapsed time instead (and no time is added). Use "Finish & save score" on the pause screen to go to the results screen.
- Slide the **blue-lit deflector** on the bottom wall left and right. When the ball hits it, it is launched at an **angle that depends on where it struck**. Use this to steer the ball where you want it.
- Breaking blocks in a row builds a combo, and every 4 hits raises the score multiplier (up to x8). Hitting any wall other than the deflector breaks the combo. From **x4 each ball hit deals 2 damage**, and **3 at x8**, so tough blocks go down faster (shown as ⚡2 / ⚡3 in the COMBO plate; BLAST shockwaves always deal 1).
- Broken blocks **regrow in place** after a while. The delay is proportional to toughness (toughness × 6 s); the empty socket shows a gauge while it regrows.
- Breaking as many cubes as the layout holds **clears the wave** (regrown blocks count again; the bar under WAVE shows progress). That awards bonus points and **extra time (+10 s, Time Attack only)**, spawns a new wave of blocks, and adds one more ball (up to 3). In Time Attack, **reaching 1/4, 2/4 and 3/4 of the quota also pays +2 s each** before the clear. Blocks get tougher (+1 toughness every 7 waves, up to +2) and balls get faster as the waves go on.
- From wave 3 on, **steel blocks** (riveted stainless slabs) are mixed into the layout. They can never be broken, only bounce the ball, and don't count toward the clear quota (PIERCE doesn't go through them either). One more appears every 2 waves, up to 6. They are only placed where they **don't split the board into more connected regions** — i.e. they never seal off a pocket the ball can't get into — so an unclearable wave is impossible.
- Broken blocks occasionally drop an **item**. Catch it on the deflector to activate a timed power-up; items that land on any other part of the bottom wall vanish.
  - Each eligible break has a **20%** drop chance. After **6 seconds** with no power-up running and nothing falling, the chance climbs, reaching 100% at **16 seconds** (catching an item or a running effect resets it). Drops are at least 1.25 seconds apart, with at most three items falling at once; breaks during either limit do not roll. All four item types are equally likely.
  - **SPEED** (8 s): the balls move much faster.
  - **BLAST** (10 s): every cube that breaks sends out a shockwave that deals one hit to each edge-adjacent cube (cubes broken by the shockwave don't chain).
  - **x2** (10 s): the number of balls doubles (the extra balls disappear when it wears off).
  - **PIERCE** (8 s): the balls pass straight through blocks (each block takes one hit per pass) and only bounce off the walls.
- Your best score is saved per mode in the browser's `localStorage` (the last mode you picked is remembered too).
- The score is capped at `Number.MAX_SAFE_INTEGER` (9,007,199,254,740,991), the largest integer JavaScript numbers represent exactly. You will never realistically reach it, but if you do, scoring stops there and a "SCORE LIMIT" screen shows a message before returning to the title.

### Controls

| Action | Input |
| --- | --- |
| Move deflector | Mouse / touch, or <kbd>←</kbd> <kbd>→</kbd> / <kbd>A</kbd> <kbd>D</kbd> |
| Start / retry | <kbd>Space</kbd> / <kbd>Enter</kbd> or the on-screen button |
| Pause / resume | <kbd>P</kbd> / <kbd>Esc</kbd> or the button in the top-right corner (auto-pauses when the tab is hidden); the pause screen also lets you finish now (results screen with the current score) or quit to the title without saving |
| Toggle mute | <kbd>M</kbd> or the button in the top-right corner |
| Volume | Slider on the title screen and the pause screen (remembered in `localStorage`) |

## Running

Just open `index.html` in a browser.

To serve it locally instead:

```bash
python3 -m http.server 8765
```

Then open http://localhost:8765/.

## Deploy to Cloudflare

Requires Node.js 22 or later and a Cloudflare account:

```bash
npx wrangler@4.131.1 login
npx wrangler@4.131.1 deploy
```

`wrangler.jsonc` configures the `easy-block-breaker` Worker. Deployment automatically runs `scripts/prepare-deploy.cjs` to copy only the game files and license into `dist/`, then publishes them as static assets on `workers.dev`.

## Project layout

```
index.html        Page structure
css/style.css     Styles
js/core.js        Shared configuration and helpers
js/i18n.js        Language selection and translations
js/audio.js       Sound effects
js/renderer.js    Canvas drawing and textures
js/game.js        Game state, rules, controls, and loop
```

## License

[MIT License](LICENSE) © 2026 log5
