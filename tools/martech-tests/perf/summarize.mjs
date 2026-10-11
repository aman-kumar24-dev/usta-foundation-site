// Usage: node summarize.mjs <label> [<label> ...]
// Median of each metric per mode (std-mobile, std-desktop, ext-*) for every label in $MARTECH_OUT/perf.
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { OUT } from '../lib.mjs';

const DIR = join(OUT, 'perf');
const THIRD_PARTY = /adobedtm|omtrdc|demdex|2o7\.net|hotjar|everesttech|adobe\.io|fundraiseup/;
const median = (a) => {
  const s = [...a].sort((x, y) => x - y);
  return s[Math.floor(s.length / 2)];
};

function metrics(r) {
  const a = r.audits;
  const reqs = a['network-requests']?.details?.items || [];
  const tp = reqs.filter((q) => THIRD_PARTY.test(q.url));
  const bootup = a['bootup-time']?.details?.items || [];
  return {
    perf: Math.round(r.categories.performance.score * 100),
    bp: r.categories['best-practices'] ? Math.round(r.categories['best-practices'].score * 100) : NaN,
    fcp: a['first-contentful-paint'].numericValue,
    lcp: a['largest-contentful-paint'].numericValue,
    tbt: a['total-blocking-time'].numericValue,
    cls: a['cumulative-layout-shift'].numericValue,
    si: a['speed-index'].numericValue,
    tpReqs: tp.length,
    tpKB: tp.reduce((s, q) => s + (q.transferSize || 0), 0) / 1024,
    tpMs: bootup.filter((b) => THIRD_PARTY.test(b.url)).reduce((s, b) => s + (b.total || 0), 0),
    launch: reqs.some((q) => /assets\.adobedtm\.com\/.*launch-/.test(q.url)),
    beacon: reqs.some((q) => /\/b\/ss\//.test(q.url)),
  };
}

process.argv.slice(2).forEach((label) => {
  const modes = {};
  readdirSync(join(DIR, label)).filter((f) => f.endsWith('.json')).forEach((f) => {
    const r = JSON.parse(readFileSync(join(DIR, label, f), 'utf8'));
    if (r.runtimeError) { console.log(`${label}/${f}: runtimeError ${r.runtimeError.code}`); return; }
    const mode = f.replace(/-\d+\.json$/, '');
    (modes[mode] ||= []).push(metrics(r));
  });
  console.log(`\n== ${label} ==`);
  console.log('mode         runs perf bp   FCP    LCP    TBT   CLS    SI     3p-req 3p-KB  3p-ms launch beacon');
  Object.keys(modes).sort().forEach((mode) => {
    const runs = modes[mode];
    const m = (k) => median(runs.map((x) => x[k]));
    const any = (k) => runs.filter((x) => x[k]).length;
    console.log([
      mode.padEnd(12), String(runs.length).padEnd(4), String(m('perf')).padEnd(4), String(m('bp')).padEnd(4),
      `${Math.round(m('fcp'))}`.padEnd(6), `${Math.round(m('lcp'))}`.padEnd(6), `${Math.round(m('tbt'))}`.padEnd(5),
      m('cls').toFixed(3).padEnd(6), `${Math.round(m('si'))}`.padEnd(6), String(m('tpReqs')).padEnd(6),
      m('tpKB').toFixed(0).padEnd(6), String(Math.round(m('tpMs'))).padEnd(5),
      `${any('launch')}/${runs.length}`.padEnd(6), `${any('beacon')}/${runs.length}`,
    ].join(' '));
  });
});
