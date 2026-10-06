# Pinball

A Space Cadet-style pinball game that runs in the browser. Three tables, each with its own
layout, look, sound effects and music, playable with a keyboard or on a phone.

**Play it:** https://pacificengine.github.io/Claude-Pinball/

Everything is plain JavaScript on an HTML canvas. There are no game libraries, and no image or
audio files: the sound and music are synthesized in the browser with the Web Audio API.

## Controls

### Keyboard

| Key | Action |
| --- | --- |
| `Z` or `←` | Left flippers |
| `/` or `→` | Right flippers |
| Hold `Space`, release | Pull and release the plunger (usable at any time) |
| `A` / `D` / `W` (or `↑`) | Nudge the table left / right / up |
| `M` | Music on or off |
| `N` | Sound effects on or off |
| `Esc` | Back to the table menu |
| `Enter` | Start a game from the menu, or return to the menu after game over |

On the table menu, `←` `→` (or `A` `D`) choose a table.

### Touch

| Gesture | Action |
| --- | --- |
| Hold the left or right half of the screen | That side's flippers (both thumbs work at once) |
| Drag a finger slowly downwards | Pull the plunger; lift to launch |
| Swipe fast left, right or up | Nudge the table |
| Tap a table card, tap it again | Choose it, then start |

Audio starts on the first key press or tap, because browsers do not allow sound before that.

## How it plays

You get three balls. The plunger launches the ball up the right-hand lane. A one-way gate stops
it dropping back in, and the plunger can be pulled again at any time if a ball is resting in
the lane.

- **Ball save:** for 10 seconds after a launch, a drained ball is returned for free.
- **Tilt:** every nudge adds to a hidden meter that drains over time. At 3 you get a `DANGER`
  warning; at 5 the machine tilts. A tilted ball drops the flippers and scores nothing, then the
  next ball plays normally.
- **Bumpers, slingshots and the spinner** score on contact (the spinner per turn, faster for a
  faster ball).
- **Rollover lanes A, B and C:** light all three to raise the bonus multiplier through x1, x2, x3
  and x5 for the rest of that ball.
- **Drop targets:** 50 points each, plus a 1,000 bonus for clearing a bank.
- **Wormholes:** paired holes that carry the ball from one to the other.
- **The ramp:** enter it fast and from the front, and it carries the ball along, keeping most of
  its speed. It cannot be entered from the side or the back.
- **Lock and multiball:** lock one ball for a free serve, lock a second to start two-ball
  multiball.
- **Skill shot:** after a launch, reach the middle top lane (B) before touching anything else.
- **Combos:** hits within two seconds of each other build a growing bonus.
- **Missions:** five rotate (bumpers, wormholes, drop targets, the ramp, the multiplier). Each pays
  a bonus and arms the left kickback, which saves one ball from the left outlane.
- **High scores** are kept per table in the browser.

## The tables

| Table | Layout | Sound |
| --- | --- | --- |
| **Classic** | A central vertical ramp flanked by four bumpers | Bright arcade chiptune, major key |
| **Deep space** | Long orbit rails and a diagonal ramp from lower right to upper left | Soft pads, slow minor-key ambience |
| **Haunted mansion** | A diagonal ramp the other way, two drop-target banks, an upper flipper on each side | Organ-like voices, a minor-key waltz |

The arch, plunger lane, lower flippers, outlanes and slingshots are shared by every table.

## Running it

The project uses [yarn](https://yarnpkg.com/).

```bash
yarn install
yarn dev      # start the dev server
yarn test     # run the tests once
yarn build    # production build into dist/
```

Run `yarn test` and `yarn build` before opening a pull request. There is no CI on pull requests.
Merging to `main` deploys to GitHub Pages (`.github/workflows/pages.yml`), which runs the tests and
the build first.

## How the code is organised

The rules and physics have no knowledge of the page, so they can be tested without a browser.

```
src/
  physics.js flipper.js      ball motion, collisions, flippers
  game.js                    the game loop and rules; owns the state
  table.js                   builds a table from a layout
  layouts/                   one file per playfield layout (plain data)
  tables/                    one file per table: layout + theme + sounds + music
  portals.js lock.js ...     one small module per table feature
  events.js                  every notable thing that happens is announced as an event
  audio/                     sound effects, music and the Web Audio engine
  gestures.js                touch gestures, as a pure recogniser
  render.js renderMenu.js    drawing
  main.js                    connects the keyboard, touch, audio and rendering to the game
test/                        Vitest tests (one file per area)
```

A few ideas hold it together:

- **Events are the seam.** The game announces things like `bumper`, `wormhole` and `multiball`.
  Sound effects, missions, combos and the skill shot all listen to those events instead of reaching
  into the rules.
- **Layouts and themes are data.** A table is a layout of objects on a shared base, a colour theme,
  a sound set and a music definition. The renderer and audio engine take those as arguments.
- **Audio logic is pure.** `soundFor` (event to tones) and `notesForStep` (music) are plain
  functions and are tested without any audio hardware. Only `audio/engine.js` touches Web Audio.

## Adding to it

**A new table** is one layout file, one table file and two list entries:

1. Copy `src/layouts/classic.js`, change the objects, and add it to `src/layouts/index.js`. A layout
   lists `orbit` rails, `bumpers`, `portals` (wormholes in pairs and exactly one `ramp`),
   `dropBanks`, `spinners`, a `lock`, and any `upperFlippers`.
2. Copy `src/tables/classic.js`, then give it a theme (it must have the same keys as the classic
   theme), a sound set and a music definition. Add it to `src/tables/index.js`.
3. Run `yarn test`. Every layout is checked automatically by `test/layoutRules.test.js`: nothing
   may overlap or sit in a ball-sized gap, the ramp corridor must be clear, a full plunger launch
   must reach the playfield, the skill shot must be reachable, and 60 random games must not leave a
   ball stuck. Fix the layout until it passes.

**A new mission** is one entry in the list in `src/missions.js`: the event it counts, how many it
needs and the reward.

**A new sound** is one case in `src/audio/sfx.js`, using the event's name.

**A new rule or feature** should announce itself with `emit(game, 'name', ...)` so sound and
missions can use it, and should come with tests first.

## Known gaps

- There is no pause, and no touch buttons for mute or for returning to the menu during play.
- The touch thresholds (a swipe is faster than about 800 px/s; the plunger is fully charged at
  160 px) are constants in `src/gestures.js`, chosen without a physical device to test on.
- The music and sound effects are synthesized and have been tested, but tuned by reasoning rather
  than by ear.
