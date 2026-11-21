// Leonida Platinum Guide entry (Node 22, standard library only): the guide is
// this directory's app/ folder — plain static files a browser opens at
// app/index.html (ES modules, CSS, no build step), offline: it loads nothing
// over the network, and its trophy list and guides are app/data/trophies.json.
// The program hands it in: it copies app/ and screenshots/ from beside this
// file to /output and writes /output/dossier.json, the summary the judge reads
// (your screenshots, the first load's files and bytes, and your source), with
// the vendored make.fun library. Leave vendor/makefun-frontend.ts as it is:
// the scorer requires dossier.json to be byte for byte what its own copy writes.
//
// Before copying anything, this file validates the trophy data itself, so a
// broken list can never be submitted by accident: 55 entries, each with a
// unique official name and a non-empty guide, grades adding up to 1 platinum,
// 2 gold, 6 silver and 46 bronze, 28 hidden flags, and 1,350 PSN points.
//
// Serve it locally with `node serve.ts`, then open localhost:8080.
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { createHash } from 'node:crypto';
import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-frontend.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// --- Pre-build trophy gate (own code) -------------------------------------
type TrophyRow = { name: string; guide: string; grade: string; secret: boolean };

const POINTS_FOR_GRADE: Record<string, number> = { platinum: 300, gold: 90, silver: 30, bronze: 15 };
const EXPECTED_GRADES: Record<string, number> = { platinum: 1, gold: 2, silver: 6, bronze: 46 };

const trophyDoc = JSON.parse(readFileSync(join(here, 'app', 'data', 'trophies.json'), 'utf8')) as {
  trophies: TrophyRow[];
};
const rows = trophyDoc.trophies;
if (!Array.isArray(rows)) throw new Error('trophies.json: expected an object with a "trophies" array');
if (rows.length !== 55) throw new Error(`trophies.json: expected 55 trophies, found ${rows.length}`);

const seenNames = new Set<string>();
const gradeCounts: Record<string, number> = {};
let hiddenCount = 0;
let pointsTotal = 0;
for (const row of rows) {
  if (typeof row.name !== 'string' || !row.name.trim()) throw new Error('trophies.json: a trophy has no name');
  const key = row.name.trim().toLowerCase();
  if (seenNames.has(key)) throw new Error(`trophies.json: duplicate trophy name: ${row.name}`);
  seenNames.add(key);
  if (typeof row.guide !== 'string' || !row.guide.trim()) {
    throw new Error(`trophies.json: empty guide for trophy: ${row.name}`);
  }
  if (!Object.hasOwn(POINTS_FOR_GRADE, row.grade)) {
    throw new Error(`trophies.json: bad grade for ${row.name}: ${row.grade}`);
  }
  gradeCounts[row.grade] = (gradeCounts[row.grade] ?? 0) + 1;
  pointsTotal += POINTS_FOR_GRADE[row.grade];
  if (row.secret) hiddenCount += 1;
}
for (const [grade, expected] of Object.entries(EXPECTED_GRADES)) {
  if ((gradeCounts[grade] ?? 0) !== expected) {
    throw new Error(`trophies.json: expected ${expected} ${grade}, found ${gradeCounts[grade] ?? 0}`);
  }
}
if (hiddenCount !== 28) throw new Error(`trophies.json: expected 28 hidden trophies, found ${hiddenCount}`);
if (pointsTotal !== 1350) throw new Error(`trophies.json: expected 1350 PSN points, found ${pointsTotal}`);
console.log(
  `trophies ok: 55 entries (1 platinum, 2 gold, 6 silver, 46 bronze), ` +
  `${hiddenCount} hidden, ${pointsTotal} PSN points, all guides non-empty`,
);

// --- Copy the app and screenshots, then build the dossier ------------------
mkdirSync(out, { recursive: true });
cpSync(join(here, 'app'), join(out, 'app'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });

// The scorer's own caps (reference/gate.json): only text_max_bytes shapes the bytes; the others refuse an entry the
// scorer would refuse (more than 4 screenshots or one over 256 KiB; more than 993 files and directories in app/ or
// 48 MiB of app files: app/ counts beside /output's own 1000-entry cap, its screenshots/ and dossier.json).
const dossier = buildDossier(out, { text_max_bytes: 163840, screenshots: { max: 4, max_bytes: 262144 }, app_max_files: 993, app_max_bytes: 50331648 });
writeFileSync(join(out, 'dossier.json'), dossier);
console.log(
  `dossier ok: ${dossier.length} bytes, sha256 ${createHash('sha256').update(dossier).digest('hex')}`,
);
