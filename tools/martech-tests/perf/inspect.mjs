// Usage: node inspect.mjs <label> [file]   (file default: first std-mobile run)
// Per-run overview of a label (perf, LCP, TBT, failing Best Practices audits, which martech loaded),
// then details of one run: third-party-cookies, console errors, top main-thread scripts.
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { OUT } from '../lib.mjs';

const [label, file] = process.argv.slice(2);
const DIR = join(OUT, 'perf', label);
const read = (f) => JSON.parse(readFileSync(join(DIR, f), 'utf8'));
const files = readdirSync(DIR).filter((f) => f.endsWith('.json')).sort();

files.forEach((f) => {
  const r = read(f);
  if (r.runtimeError) { console.log(f, 'runtimeError', r.runtimeError.code); return; }
  const a = r.audits;
  const has = (re) => a['network-requests'].details.items.some((q) => re.test(q.url));
  const bpFail = r.categories['best-practices'].auditRefs
    .filter((x) => x.weight > 0 && a[x.id].score !== null && a[x.id].score < 1).map((x) => x.id);
  console.log(
    f.padEnd(20),
    'perf',
    Math.round(r.categories.performance.score * 100),
    'LCP',
    Math.round(a['largest-contentful-paint'].numericValue),
    'TBT',
    Math.round(a['total-blocking-time'].numericValue),
    '| tags',
    has(/launch-/),
    'at.js',
    has(/vendor\/at\.min/),
    'visitor',
    has(/VisitorAPI/),
    'delivery',
    has(/rest\/v1\/delivery/),
    'fundraiseup',
    has(/cdn\.fundraiseup\.com\/widget/),
    'hotjar',
    has(/static\.hotjar\.com/),
    '| bpFail',
    bpFail.join(',') || '-',
  );
});

const one = file || files.find((f) => f.startsWith('std-mobile')) || files[0];
const a = read(one).audits;
console.log(`\n--- ${label}/${one}`);
['third-party-cookies', 'errors-in-console', 'inspector-issues', 'deprecations'].forEach((id) => {
  if (!a[id]) return;
  const items = (a[id].details?.items || []).slice(0, 6)
    .map((i) => [i.source, i.url, i.description, i.name, i.issueType].filter(Boolean).join(' ').slice(0, 160));
  console.log(`\n${id} (score ${a[id].score})`, items);
});
console.log('\nbootup (total / scripting ms):');
(a['bootup-time'].details.items || []).slice(0, 10)
  .forEach((b) => console.log(' ', b.url.slice(0, 80).padEnd(80), Math.round(b.total), Math.round(b.scripting)));
