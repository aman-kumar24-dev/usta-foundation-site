#!/usr/bin/env node
/**
 * CLI for the DA content sync (mirror aemdemos/foundation-usta → this site's DA repo).
 *
 *   npm run da:sync                      backup destination → mirror → bulk preview
 *   npm run da:sync -- --dry-run         list what would be copied, write nothing
 *   npm run da:sync -- --folders=/en,/nav.html   limit to paths
 *   npm run da:sync -- --no-preview | --no-backup
 *   npm run da:sync -- --source=org/repo --destination=org/repo
 *
 * Auth: DA_TOKEN env var if set (IMS token: read on source, write on destination);
 * in AEM Coder the admin.da.live / admin.hlx.page credentials are injected.
 * Files are added/overwritten, never deleted. Backups: migration-work/da-sync/backups/.
 */
/* eslint-disable no-console, import/extensions */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  syncRepos, previewPaths, toSitePath, parseRepo, listFiles, HIDDEN_FOLDERS, isPreviewable,
} from './da-sync.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const arg = (name, fallback) => {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
};
const flag = (name) => process.argv.includes(`--${name}`);

const source = parseRepo(arg('source', 'aemdemos/foundation-usta'));
const destination = parseRepo(arg('destination', 'aman-kumar24-dev/usta-foundation-site'));
const folders = arg('folders', '').split(',').map((s) => s.trim()).filter(Boolean);
const dryRun = flag('dry-run');
const token = process.env.DA_TOKEN;
const auth = token ? { Authorization: `Bearer ${token}` } : {};

/** Save every destination file that exists before it is overwritten. */
async function backupDestination() {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const out = join(ROOT, 'migration-work', 'da-sync', 'backups', stamp);
  const inScope = (f) => !folders.length
    || folders.some((p) => f.path === p || f.path.startsWith(`${p.replace(/\/$/, '')}/`));
  const hidden = await Promise.all(HIDDEN_FOLDERS.map((folder) => listFiles(destination, {
    token, folder,
  }).catch(() => [])));
  const files = [...await listFiles(destination, { token }), ...hidden.flat()].filter(inScope);
  for (let i = 0; i < files.length; i += 8) {
    // eslint-disable-next-line no-await-in-loop
    await Promise.all(files.slice(i, i + 8).map(async ({ path }) => {
      const res = await fetch(`https://admin.da.live/source/${destination}${path}`, { headers: auth });
      if (!res.ok) throw new Error(`backup ${path}: HTTP ${res.status}`);
      const file = join(out, path);
      mkdirSync(dirname(file), { recursive: true });
      writeFileSync(file, Buffer.from(await res.arrayBuffer()));
    }));
  }
  console.log(`backup: ${files.length} files → ${out}`);
}

const scope = folders.length ? ` (${folders.join(', ')})` : '';
console.log(`${dryRun ? '[dry run] ' : ''}${source} → ${destination}${scope}`);
if (!dryRun && !flag('no-backup')) await backupDestination();

const result = await syncRepos({
  source,
  destination,
  folders,
  srcToken: token,
  dryRun,
  onProgress: (done, total) => process.stdout.write(`\rcopied ${done}/${total}`),
});
process.stdout.write('\n');
const { total, copied, failed } = result;
console.log(JSON.stringify({ total, copied: copied.length, failed }, null, 1));
if (dryRun) result.files.forEach((p) => console.log(' ', p));

const previewable = result.copied.filter(isPreviewable);
if (!dryRun && !flag('no-preview') && previewable.length) {
  const { job } = await previewPaths(destination, previewable.map(toSitePath), { token });
  console.log(`preview job ${job?.name} (${job?.data?.paths?.length} paths): ${job?.state}`);
}
if (result.failed.length) process.exitCode = 1;
