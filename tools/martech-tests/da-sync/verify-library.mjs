// Read-only: check the DA Library in the destination — site config → Library sheets → documents,
// and that no entry still points at the source repo.
// Usage: node verify-library.mjs [dstOrg/dstRepo] [srcOrg/srcRepo]
import { daFetch } from '../lib.mjs';

const DST = process.argv[2] || 'aman-kumar24-dev/usta-foundation-site';
const SRC = process.argv[3] || 'aemdemos/foundation-usta';
const get = (p) => daFetch(`https://admin.da.live/source/${DST}${p}`);

const config = await (await daFetch(`https://admin.da.live/config/${DST}/`)).json();
let total = 0;
let missing = 0;
let pointingAtSource = 0;
for (const { title, path } of config.library.data) {
  const sheetPath = new URL(path).pathname.replace(`/${DST}`, '');
  const res = await get(sheetPath);
  console.log(`\n${title}: ${sheetPath} → HTTP ${res.status}`);
  if (!res.ok) { missing += 1; continue; }
  const json = await res.json();
  const rows = (json[':type'] === 'multi-sheet' ? json[json[':names'][0]] : json).data;
  for (const row of rows) {
    const ref = row.path || row.value || row.Path;
    if (!ref) continue;
    total += 1;
    if (ref.includes(`/${SRC}/`)) pointingAtSource += 1;
    const docPath = `${new URL(ref).pathname.replace(`/${DST}`, '')}.html`;
    const { ok } = await get(docPath);
    if (!ok) missing += 1;
    console.log(`  ${ok ? 'ok     ' : 'MISSING'} ${(row.name || row.key || '').padEnd(40)} ${docPath}`);
  }
  if (json.options) console.log(`  (+ options tab: ${json.options.data.length} row(s))`);
}
console.log(`\nentries: ${total}, missing docs/sheets: ${missing}, still pointing at ${SRC}: ${pointingAtSource}`);
