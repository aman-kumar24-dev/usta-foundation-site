// Read-only: byte-compare every source file with the destination copy (SHA-256) after a sync.
// Note: /.da/library sheets differ on purpose (their links are rewritten to the destination).
// Usage: node verify.mjs [srcOrg/srcRepo] [dstOrg/dstRepo]
import { createHash } from 'node:crypto';
import { HIDDEN_FOLDERS, listFiles } from '../../da-sync/da-sync.mjs';
import { daFetch } from '../lib.mjs';

const SRC = process.argv[2] || 'aemdemos/foundation-usta';
const DST = process.argv[3] || 'aman-kumar24-dev/usta-foundation-site';
const hash = async (repo, p) => {
  const r = await daFetch(`https://admin.da.live/source/${repo}${p}`);
  if (!r.ok) return `HTTP ${r.status}`;
  return createHash('sha256').update(Buffer.from(await r.arrayBuffer())).digest('hex');
};
const files = (await Promise.all(['', ...HIDDEN_FOLDERS]
  .map((folder) => listFiles(SRC, { token: process.env.DA_TOKEN, folder }).catch((e) => (folder ? [] : Promise.reject(e))))))
  .flat();
const diff = [];
for (let i = 0; i < files.length; i += 8) {
  await Promise.all(files.slice(i, i + 8).map(async ({ path }) => {
    const [a, b] = await Promise.all([hash(SRC, path), hash(DST, path)]);
    if (a !== b) diff.push({ path, src: a.slice(0, 12), dst: b.slice(0, 12) });
  }));
}
const byExt = files.reduce((m, f) => {
  const e = f.path.split('.').pop();
  m[e] = (m[e] || 0) + 1;
  return m;
}, {});
console.log(`checked ${files.length} files ${JSON.stringify(byExt)} — identical: ${files.length - diff.length}, different: ${diff.length}`);
diff.slice(0, 20).forEach((d) => console.log(' ', d.path, d.src, d.dst));
