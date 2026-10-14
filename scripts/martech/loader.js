/**
 * Martech loader. scripts.js calls runPhase(phase) from each page-load phase;
 * it reads that phase's tab of the site config (`eager`, `lazy` or `delayed`, see
 * ../site-config.js) and loads what the tab lists:
 *
 *   script.<name>     https URL of a third-party script (e.g. `script.launch`,
 *                     `script.hotjar`). If <name> is in MODULES, the module
 *                     scripts/martech/<name>.js loads it (for scripts that need
 *                     page setup first); otherwise it is injected as a plain
 *                     async script tag. Once per page.
 *   <module>.enabled  true | false — runs scripts/martech/<module>.js (listed in
 *                     MODULES), a module for a vendor that needs code (e.g.
 *                     `target`); its other `<module>.*` rows are its settings
 *
 * Consent (`consentRequired`): when required, `script.*` rows are loaded only once
 * the visitor has consented; `<module>.enabled` modules get `ctx.consentRequired` /
 * `ctx.whenConsented()` and decide themselves. Consent is signalled by the
 * `consent.update` window event ({ detail: { consented } }), with the latest state
 * in `window.hlx.consent`.
 *
 * A module exports a default function `(settings, ctx)`; for a `script.<name>` row
 * the settings are `{ url }` plus any `<name>.*` rows. ctx = { consentRequired,
 * whenConsented(), injectScript(url), warn(message) }. Modules never import each
 * other.
 */
import { getSheet, isConsentRequired } from '../site-config.js';

/**
 * The modules in this folder. Only these are ever imported, so a config row can
 * never trigger a request for a file that does not exist. Add the name when
 * adding a module.
 */
const MODULES = ['hotjar'];

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
 * Inject a script once (skipped if the page already has it).
 * @param {string} src script URL (already validated)
 */
function injectScript(src) {
  if ([...document.scripts].some((script) => script.src === src)) return;
  const script = document.createElement('script');
  script.src = src;
  script.async = true;
  document.head.append(script);
}

/** Settings of a module: its `<name>.*` rows without the prefix. */
function moduleSettings(name, sheet) {
  const prefix = `${name}.`;
  const settings = Object.create(null);
  Object.keys(sheet)
    .filter((key) => key.startsWith(prefix))
    .forEach((key) => { settings[key.slice(prefix.length)] = sheet[key]; });
  return settings;
}

/**
 * Import scripts/martech/<name>.js and run it.
 * @param {string} name module name (in MODULES)
 * @param {Record<string, string>} settings
 * @param {boolean} consentRequired
 */
async function runModule(name, settings, consentRequired) {
  try {
    const { default: init } = await import(`./${name}.js`);
    await init(settings, {
      consentRequired,
      whenConsented,
      injectScript,
      warn: (message) => warn(name, message),
    });
  } catch (e) {
    warn(name, `failed (${e.message})`);
  }
}

/**
 * Load a `script.<name>` row: through its module if there is one, otherwise as
 * a plain script tag. Waits for consent when it is required.
 * @param {string} name the part after `script.`
 * @param {Record<string, string>} sheet the phase's tab
 * @param {boolean} consentRequired
 */
async function loadScript(name, sheet, consentRequired) {
  const key = `${SCRIPT_PREFIX}${name}`;
  let url = null;
  try {
    url = new URL(sheet[key]);
  } catch (e) {
    // reported below
  }
  if (url?.protocol !== 'https:') {
    warn(key, 'invalid URL (https only) — not loaded');
    return;
  }
  if (consentRequired) await whenConsented();
  if (MODULES.includes(name)) {
    await runModule(name, { ...moduleSettings(name, sheet), url: url.href }, consentRequired);
  } else {
    injectScript(url.href);
  }
}

/**
 * Run a `<module>.enabled` module.
 * @param {string} name module name
 * @param {Record<string, string>} sheet the phase's tab
 * @param {boolean} consentRequired
 */
async function loadModule(name, sheet, consentRequired) {
  const enabled = sheet[`${name}.enabled`].toLowerCase();
  if (enabled === 'false') return;
  if (enabled !== 'true') {
    warn(name, 'invalid value for "enabled" — not loaded');
    return;
  }
  if (!MODULES.includes(name)) {
    warn(name, 'unknown module — not loaded');
    return;
  }
  await runModule(name, moduleSettings(name, sheet), consentRequired);
}

async function run(phase) {
  const sheet = await getSheet(phase);
  const keys = Object.keys(sheet);
  const scripts = keys
    .filter((key) => key.startsWith(SCRIPT_PREFIX))
    .map((key) => key.slice(SCRIPT_PREFIX.length));
  const modules = keys
    .filter((key) => key.endsWith('.enabled') && !key.startsWith(SCRIPT_PREFIX))
    .map((key) => key.slice(0, -'.enabled'.length));
  if (!scripts.length && !modules.length) return;

  const consentRequired = await isConsentRequired();
  // scripts may wait for consent — never hold the phase for them
  scripts.forEach((name) => loadScript(name, sheet, consentRequired));
  await Promise.allSettled(modules.map((name) => loadModule(name, sheet, consentRequired)));
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
