/**
 * DA content sync — mirror one Document Authoring repo into another (cross-org).
 *
 * DA's own copy API (POST admin.da.live/copy/...) only works within one org, so
 * this reads every file from the source (GET /source) and writes it to the
 * destination (POST /source). Files are added/overwritten, never deleted.
 * Optionally previews the written paths via the AEM Admin API bulk preview.
 *
 * Shared by the CLI (cli.mjs) and the hosted POST endpoint (endpoint.mjs).
 * Runtime: Node 18+ / any fetch + FormData + Blob environment. No dependencies.
 */

const DA = 'https://admin.da.live';
const ADMIN = 'https://admin.hlx.page';

const TYPES = {
  html: 'text/html',
  json: 'application/json',
  pdf: 'application/pdf',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  svg: 'image/svg+xml',
  webp: 'image/webp',
  mp4: 'video/mp4',
};

/** Parse "org/repo" (leading/trailing slashes allowed). */
export function parseRepo(value) {
  const [org, repo] = String(value || '').replace(/^\/+|\/+$/g, '').split('/');
  if (!org || !repo || !/^[\w.-]+$/.test(org) || !/^[\w.-]+$/.test(repo)) {
    throw new Error(`Invalid repo "${value}" — expected "org/repo"`);
  }
  return `${org}/${repo}`;
}

function authHeaders(token) {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/** Recursively list files under `folder` ('' = root). Returns [{ path, lastModified }]. */
export async function listFiles(repo, { token, folder = '', fetchImpl = fetch } = {}) {
  const res = await fetchImpl(`${DA}/list/${repo}${folder}`, { headers: authHeaders(token) });
  if (!res.ok) throw new Error(`list ${repo}${folder}: HTTP ${res.status}`);
  const nested = await Promise.all((await res.json()).map((item) => {
    const rel = item.path.slice(repo.length + 1);
    return item.ext
      ? [{ path: rel, lastModified: item.lastModified }]
      : listFiles(repo, { token, folder: rel, fetchImpl });
  }));
  return nested.flat();
}

async function copyFile(source, destination, path, { srcToken, dstToken, fetchImpl }) {
  const got = await fetchImpl(`${DA}/source/${source}${path}`, { headers: authHeaders(srcToken) });
  if (!got.ok) throw new Error(`GET ${path}: HTTP ${got.status}`);
  const ext = path.split('.').pop().toLowerCase();
  const type = TYPES[ext] || got.headers.get('content-type') || 'application/octet-stream';
  const form = new FormData();
  form.append('data', new Blob([await got.arrayBuffer()], { type }), path.split('/').pop());
  const put = await fetchImpl(`${DA}/source/${destination}${path}`, {
    method: 'POST', headers: authHeaders(dstToken), body: form,
  });
  if (!put.ok) throw new Error(`POST ${path}: HTTP ${put.status}`);
}

/** DA path → site path for preview (/en/home.html → /en/home, /index.html → /). */
export function toSitePath(daPath) {
  if (daPath === '/index.html') return '/';
  if (daPath.endsWith('/index.html')) return daPath.slice(0, -'index.html'.length);
  return daPath.endsWith('.html') ? daPath.slice(0, -5) : daPath;
}

/**
 * Bulk-preview paths on the destination site (AEM Admin API). Returns the job info.
 * @param {string} site "org/site" as used by aem.page ({ref}--{site}--{org})
 */
export async function previewPaths(site, paths, { token, ref = 'main', fetchImpl = fetch } = {}) {
  const res = await fetchImpl(`${ADMIN}/preview/${site}/${ref}/*`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...authHeaders(token) },
    body: JSON.stringify({ paths, forceUpdate: true }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`bulk preview: HTTP ${res.status} ${text.slice(0, 200)}`);
  return JSON.parse(text || '{}');
}

/**
 * Mirror `source` into `destination`.
 * @param {object} opts
 * @param {string} opts.source "org/repo"
 * @param {string} opts.destination "org/repo"
 * @param {string[]} [opts.folders] limit to these top-level paths (e.g. ['/en', '/nav.html'])
 * @param {string} [opts.srcToken] / [opts.dstToken] DA bearer tokens (one token may cover both)
 * @param {boolean} [opts.dryRun] list only, write nothing
 * @param {number} [opts.concurrency]
 * @returns {Promise<{copied: string[], failed: {path: string, error: string}[], total: number}>}
 */
export async function syncRepos({
  source, destination, folders, srcToken, dstToken, dryRun = false, concurrency = 6,
  fetchImpl = fetch, onProgress = () => {},
}) {
  const src = parseRepo(source);
  const dst = parseRepo(destination);
  let files = await listFiles(src, { token: srcToken, fetchImpl });
  if (folders?.length) {
    files = files.filter((f) => folders.some((p) => f.path === p || f.path.startsWith(`${p.replace(/\/$/, '')}/`)));
  }
  const copied = [];
  const failed = [];
  if (!dryRun) {
    for (let i = 0; i < files.length; i += concurrency) {
      // eslint-disable-next-line no-await-in-loop
      await Promise.all(files.slice(i, i + concurrency).map(async ({ path }) => {
        try {
          await copyFile(src, dst, path, { srcToken, dstToken: dstToken || srcToken, fetchImpl });
          copied.push(path);
        } catch (e) {
          failed.push({ path, error: e.message });
        }
      }));
      onProgress(Math.min(i + concurrency, files.length), files.length);
    }
  }
  return {
    copied, failed, total: files.length, files: dryRun ? files.map((f) => f.path) : undefined,
  };
}
