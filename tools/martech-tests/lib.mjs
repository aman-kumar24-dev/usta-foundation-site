/**
 * Shared helpers for the martech test scripts (see README.md).
 *
 * Environment:
 *   BASE_URL     local dev server            (default http://localhost:3000)
 *   PROXY_URL    target/proxy.mjs            (default http://localhost:3100)
 *   BRANCH_URL   branch preview              (default aem-coder-branch preview)
 *   CHROME_PATH  Chromium binary, when Playwright's pinned build is not installed
 *   MARTECH_OUT  output folder               (default tools/martech-tests/out, git-ignored)
 *   DA_TOKEN     IMS token for admin.da.live (not needed where credentials are injected)
 */
import { chromium } from '@playwright/test';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const BASE = process.env.BASE_URL || 'http://localhost:3000';
export const PROXY = process.env.PROXY_URL || 'http://localhost:3100';
export const BRANCH_URL = process.env.BRANCH_URL
  || 'https://aem-coder-branch--usta-foundation-site--aman-kumar24-dev.aem.page';
export const OUT = process.env.MARTECH_OUT || join(dirname(fileURLToPath(import.meta.url)), 'out');

export const BEACON = /\/b\/ss\//;
export const DELIVERY = /tt\.omtrdc\.net\/rest\/v1\/delivery/;
export const LAUNCH = /assets\.adobedtm\.com\/.*launch-[^/]+\.min\.js/;
const GIF = Buffer.from('R0lGODlhAQABAAAAACw=', 'base64');

export function launchBrowser() {
  return chromium.launch({
    executablePath: process.env.CHROME_PATH || undefined,
    args: ['--disable-dev-shm-usage'],
  });
}

/** Answer Analytics beacons locally so test hits never reach Adobe. `target` = page or context. */
export function answerBeacons(target, onBeacon) {
  return target.route(BEACON, (route) => {
    if (onBeacon) onBeacon(route.request().url());
    return route.fulfill({ status: 200, contentType: 'image/gif', body: GIF });
  });
}

/** Serve `url` with `<meta name="target" content="on">` added (Target page without editing content). */
export function injectTargetMeta(page, url) {
  return page.route(url, async (route) => {
    const res = await route.fetch();
    const body = (await res.text()).replace('</head>', '<meta name="target" content="on"></head>');
    await route.fulfill({ response: res, body });
  });
}

/** Serve /site-config.json with some `settings` keys overridden ({ key: value }). */
export function overrideSheet(page, overrides) {
  return page.route('**/site-config.json', async (route) => {
    const res = await route.fetch();
    const json = await res.json();
    json.settings.data.forEach((row) => {
      if (row.key in overrides) row.value = overrides[row.key];
    });
    await route.fulfill({ response: res, body: JSON.stringify(json) });
  });
}

/** Records, in the first frame where the first section is visible, the h1 text (flicker check). */
export const FIRST_PAINT_PROBE = () => {
  window.firstPaintProbe = null;
  const tick = () => {
    const s = document.querySelector('main .section');
    if (s && s.dataset.sectionStatus === 'loaded' && getComputedStyle(s).display !== 'none') {
      const h = document.querySelector('main h1');
      window.firstPaintProbe = { t: Math.round(performance.now()), h1: h ? h.textContent.trim().slice(0, 60) : null };
      return;
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
};

/** fetch() against admin.da.live, adding DA_TOKEN when set. */
export function daFetch(url, init = {}) {
  const token = process.env.DA_TOKEN;
  const headers = { ...(init.headers || {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) };
  return fetch(url, { ...init, headers });
}

export const wait = (ms) => new Promise((r) => { setTimeout(r, ms); });
