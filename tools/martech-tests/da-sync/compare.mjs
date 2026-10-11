// Read-only: list two DA repos recursively (incl. the DA Library) and compare by path + lastModified.
// Writes <MARTECH_OUT>/da-sync/compare.json (used by backup.mjs).
// Usage: node compare.mjs [srcOrg/srcRepo] [dstOrg/dstRepo]
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { HIDDEN_FOLDERS, listFiles } from '../../da-sync/da-sync.mjs';
import { OUT } from '../lib.mjs';

const SRC = process.argv[2] || 'aemdemos/foundation-usta';
const DST = process.argv[3] || 'aman-kumar24-dev/usta-foundation-site';
const token = process.env.DA_TOKEN;

// DA listings omit dot-folders, so the Library is listed explicitly (missing folder = no files).
const listAll = async (repo) => (await Promise.all(['', ...HIDDEN_FOLDERS]
  .map((folder) => listFiles(repo, { token, folder }).catch((e) => (folder ? [] : Promise.reject(e))))))
  .flat();
const [src, dst] = await Promise.all([listAll(SRC), listAll(DST)]);
const dstMap = new Map(dst.map((f) => [f.path, f]));
const srcMap = new Map(src.map((f) => [f.path, f]));
const fmt = (t) => (t ? new Date(t).toISOString().slice(0, 16).replace('T', ' ') : '—');
const rows = {
  newerInSource: [], onlyInSource: [], newerInDest: [], same: [], onlyInDest: [],
};
src.forEach((s) => {
  const d = dstMap.get(s.path);
  if (!d) rows.onlyInSource.push(s);
  else if (s.lastModified > d.lastModified) rows.newerInSource.push({ ...s, dst: d.lastModified });
  else if (s.lastModified < d.lastModified) rows.newerInDest.push({ ...s, dst: d.lastModified });
  else rows.same.push(s);
});
dst.forEach((d) => { if (!srcMap.has(d.path)) rows.onlyInDest.push(d); });

const dir = join(OUT, 'da-sync');
mkdirSync(dir, { recursive: true });
writeFileSync(join(dir, 'compare.json'), JSON.stringify({
  SRC, DST, at: new Date().toISOString(), rows,
}, null, 1));
console.log(`${SRC}: ${src.length} files | ${DST}: ${dst.length} files`);
Object.entries(rows).forEach(([k, v]) => console.log(`${k.padEnd(14)} ${v.length}`));
['newerInSource', 'onlyInSource', 'newerInDest', 'onlyInDest'].forEach((k) => {
  if (!rows[k].length) return;
  console.log(`\n-- ${k}`);
  rows[k].slice(0, 40).forEach((f) => console.log(`  ${f.path.padEnd(70)} src ${fmt(srcMap.get(f.path)?.lastModified)}  dst ${fmt(dstMap.get(f.path)?.lastModified)}`));
  if (rows[k].length > 40) console.log(`  … +${rows[k].length - 40} more (see compare.json)`);
});
