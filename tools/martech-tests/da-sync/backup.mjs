// Read-only full backup of the destination repo (every file in compare.json's destination listing).
// Run compare.mjs first. Output: <MARTECH_OUT>/da-sync/backup-<date>/<path>
// Usage: node backup.mjs [org/repo]
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { OUT, daFetch } from '../lib.mjs';

const DIR = join(OUT, 'da-sync');
const { DST, rows } = JSON.parse(readFileSync(join(DIR, 'compare.json'), 'utf8'));
const repo = process.argv[2] || DST;
const paths = [...rows.newerInSource, ...rows.newerInDest, ...rows.same, ...rows.onlyInDest].map((f) => f.path);
const out = join(DIR, `backup-${new Date().toISOString().slice(0, 10)}`);

const done = [];
const failed = [];
for (let i = 0; i < paths.length; i += 8) {
  await Promise.all(paths.slice(i, i + 8).map(async (p) => {
    const res = await daFetch(`https://admin.da.live/source/${repo}${p}`);
    if (!res.ok) { failed.push(`${p} ${res.status}`); return; }
    const file = join(out, p);
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, Buffer.from(await res.arrayBuffer()));
    done.push(p);
  }));
}
console.log(`backed up ${done.length}/${paths.length} files from ${repo} to ${out}`);
if (failed.length) console.log('failed:', failed);
