/**
 * Martech loader. scripts.js calls runPhase(phase) from each page-load phase;
 * it reads that phase's tab of the site config (`eager`, `lazy` or `delayed`, see
 * ../site-config.js) and loads what the tab lists:
 *
 *   script.<name>     https URL of a third-party script (e.g. `script.launch`,
 *                     `script.hotjar`) — injected once, async
 *   <module>.enabled  true | false — runs scripts/martech/<module>.js, a module
 *                     for a vendor that needs code (e.g. `target`); its other
 *                     `<module>.*` rows are its settings
 *
 * Consent (`consentRequired`): when required, scripts are injected only once the
 * visitor has consented; modules get `ctx.consentRequired` / `ctx.whenConsented()`
 * and decide themselves. Consent is signalled by the `consent.update` window event
 * ({ detail: { consented } }), with the latest state in `window.hlx.consent`.
 *
 * A module exports a default function `(settings, ctx)`; ctx = { consentRequired,
 * whenConsented(), warn(message) }. Modules never import each other.
 */
import { getSheet, isConsentRequired } from '../site-config.js';

const MODULE_NAME = /^[a-z][a-z0-9]*$/;
const SCRIPT_PREFIX = 'script.';

function warn(name, message) {
  // eslint-disable-next-line no-console
  console.warn(`[martech] ${name}: ${message}`);
}

/** Resolves once the visitor has consented; never resolves otherwise. */
function whenConsented() {
  if (window.hlx?.consent?.consented) return Promise.resolve();
  return new Promise((resolve) => {
    const listener = (e) => {
      if (!e.detail?.consented) return;
      window.removeEventListener('consent.update', listener);
      resolve();
    };
    window.addEventListener('consent.update', listener);
  });
}

/**
 * Inject a third-party script once (also skipped if the page already has it).
 * @param {string} key the `script.<name>` key, for warnings
 * @param {string} value script URL
 * @param {boolean} consentRequired wait for consent first
 */
async function injectScript(key, value, consentRequired) {
  let url = null;
  try {
    url = new URL(value);
  } catch (e) {
    // reported below
  }
  if (url?.protocol !== 'https:') {
    warn(key, 'invalid URL (https only) — not loaded');
    return;
  }
  if (consentRequired) await whenConsented();
  if ([...document.scripts].some((script) => script.src === url.href)) return;
  const script = document.createElement('script');
  script.src = url.href;
  script.async = true;
  document.head.append(script);
}

/**
 * Run scripts/martech/<name>.js with its settings.
 * @param {string} name module name
 * @param {Record<string, string>} sheet the phase's tab
 * @param {boolean} consentRequired
 */
async function runModule(name, sheet, consentRequired) {
  const enabled = sheet[`${name}.enabled`].toLowerCase();
  if (enabled === 'false') return;
  if (enabled !== 'true') {
    warn(name, 'invalid value for "enabled" — not loaded');
    return;
  }
  let init;
  try {
    ({ default: init } = await import(`./${name}.js`));
  } catch (e) {
    warn(name, 'module not found');
    return;
  }
  const prefix = `${name}.`;
  const settings = Object.create(null);
  Object.keys(sheet)
    .filter((key) => key.startsWith(prefix))
    .forEach((key) => { settings[key.slice(prefix.length)] = sheet[key]; });
  try {
    await init(settings, {
      consentRequired,
      whenConsented,
      warn: (message) => warn(name, message),
    });
  } catch (e) {
    warn(name, `failed (${e.message})`);
  }
}

async function run(phase) {
  const sheet = await getSheet(phase);
  const keys = Object.keys(sheet);
  const scripts = keys.filter((key) => key.startsWith(SCRIPT_PREFIX));
  const modules = keys
    .filter((key) => key.endsWith('.enabled') && !key.startsWith(SCRIPT_PREFIX))
    .map((key) => key.slice(0, -'.enabled'.length))
    .filter((name) => MODULE_NAME.test(name) && name !== 'loader');
  if (!scripts.length && !modules.length) return;

  const consentRequired = await isConsentRequired();
  // scripts may wait for consent — never hold the phase for them
  scripts.forEach((key) => injectScript(key, sheet[key], consentRequired));
  await Promise.allSettled(modules.map((name) => runModule(name, sheet, consentRequired)));
}

const runs = new Map();

/**
 * Load what the phase's tab lists. Runs once per page and never rejects;
 * resolves when the phase's modules have finished (not waiting for scripts
 * that wait for consent).
 * @param {'eager'|'lazy'|'delayed'} phase
 * @returns {Promise<void>}
 */
// eslint-disable-next-line import/prefer-default-export
export function runPhase(phase) {
  if (!runs.has(phase)) runs.set(phase, run(phase).catch(() => {}));
  return runs.get(phase);
}
