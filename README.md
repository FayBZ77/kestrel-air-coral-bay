# Kestrel Air — Coral Bay

![make.fun bounty](https://make.fun/badge/best-flight-game-20261126-0057.svg)
![rank](https://make.fun/badge/best-flight-game-20261126-0057/FayBZ77/kestrel-air-coral-bay/rank.svg)
![reward](https://make.fun/badge/best-flight-game-20261126-0057/FayBZ77/kestrel-air-coral-bay/reward.svg)

A 3D flight school in a single static site, built for the
[best-flight-game bounty on make.fun](https://make.fun/c/best-flight-game-20261126-0057).
You fly the Kestrel K-1, a high-wing trainer, around one island: a grass
field with a painted runway, a river down the west shore, a harbour town
with a lighthouse, and a nine-ring course strung over all of it. Take off,
chase the amber ring, and bring her home — landings are graded, the tank
runs dry, and bent aeroplanes score nothing.

The game is plain static files. Open `game/index.html` in a desktop
browser and it plays: no server, no network, every asset on disk
(Three.js is vendored under `game/vendor/`).

## Flying

| Key | What it does |
| --- | --- |
| W / S | throttle up / down |
| ↑ / ↓ or mouse | pitch (pull back to climb) |
| ← / → or A / D, or mouse | roll and turn |
| Space | brake |
| C | chase camera ↔ cockpit |
| P | pause |
| R | fly the sortie again |
| M | sound on / off |

The mouse works as a stick: hold it off-centre and the aeroplane follows.
Three sorties are on the board — a runway takeoff, an airborne ring run,
and a final approach — and the cockpit carries a full six-gauge panel
while the HUD shows altitude, airspeed, heading, vertical speed,
throttle and fuel at all times.

## How it is put together

`game/src/` is split by job, one file each:

- `config.js` — the island, the aeroplane and the sorties, as data
- `terrain.js` — the island height field, sea, river, sky and trees
- `city.js` — the harbour town and lighthouse
- `airport.js` — runway, PAPI lights, tower, hangars
- `aircraft.js` — the Kestrel K-1, built from primitives, panel included
- `rings.js` — the nine-ring course and its beacon
- `flight-model.js` — thrust, stall, turns, fuel, damage, graded landings
- `instruments.js` — the HUD and the drawn instrument panel
- `camera.js` — chase, cockpit and menu-orbit cameras
- `input.js` — keyboard and mouse
- `audio.js` — engine, wind, chimes and thuds, synthesised in WebAudio
- `main.js` — the boot, the loop and the scoring

`main.ts` is the hand-in program: it copies `game/` and `screenshots/`
to the output directory and writes `dossier.json` with the kit's own
library. `serve.ts` is a small local server for developing the game
(`node serve.ts`, then open http://localhost:8080).

## Licence

MIT — see `LICENSE`.
