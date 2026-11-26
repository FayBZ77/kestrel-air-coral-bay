// Kestrel Air — Coral Bay: the hand-in program for the best-flight-game
// bounty. It copies the static game (game/) and the screenshots
// (screenshots/) out of this repository into the output directory and
// writes the dossier the judge reads, using the kit's own library so the
// bytes match what the gate rebuilds. Node 22, standard library only.
// Locally:  mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const repoDir = fileURLToPath(new URL('.', import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(outDir, { recursive: true });
cpSync(join(repoDir, 'game'), join(outDir, 'game'), { recursive: true });
mkdirSync(join(outDir, 'screenshots'), { recursive: true });
if (existsSync(join(repoDir, 'screenshots'))) {
  cpSync(join(repoDir, 'screenshots'), join(outDir, 'screenshots'), { recursive: true });
}

// The gate's caps for this competition, passed to the dossier builder so an
// oversize entry fails here first instead of at the scorer: at most 160 KiB
// of source text in the dossier, 4 screenshots of at most 256 KiB each, and
// a game tree of at most 993 entries / 48 MiB with paths under 1000 bytes.
const dossier = buildDossier(outDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
});
writeFileSync(join(outDir, 'dossier.json'), dossier);
