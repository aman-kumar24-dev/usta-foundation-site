/*
 * Env selector — an Experience Workspace (DA) library plugin. The author picks
 * a code branch and Go reloads the page open in the editor with it: the page's
 * URL gets `?ref=<branch>`, replacing the current ref, or adding it when there
 * is none (no ref means main). In the canvas, `?ref=` sets the code branch for
 * both the page preview and the plugins.
 *
 * The panel is a cross-origin iframe and cannot read the editor's URL, so the
 * URL is rebuilt from what DA sends the panel: the canvas hash
 * (#/org/site/path) and its ref.
 *
 * The branches come from the DA sheet /.da/environments/config (tab `code`:
 * `title` is the option text, `value` the branch); the options in the HTML
 * are the fallback when the sheet cannot be read. The editor path and every
 * message live in the HTML.
 */

const SHEET_PATH = '/.da/environments/config.json';
const SHEET_TAB = 'code';

// a branch as it appears in an aem.page host: {branch}--{site}--{org}
const BRANCH = /^[a-z0-9-]+$/;
// the editor hash: #/org/site/path
const HASH = /^#\/[^\s#]+$/;

const $ = (selector) => document.querySelector(selector);
const form = $('.env-selector-form');
const select = form.elements.branch;
const go = $('.env-selector-go');
const status = $('.env-selector-status');

const state = { actions: null, context: {}, current: null };

function say(key, branch = '') {
  status.textContent = (status.dataset[key] || '').replace('{branch}', branch);
}

const listed = (value) => [...select.options].find((option) => option.value === value);

/** A branch's name for messages: its title in the list, else the branch itself */
const labelOf = (value) => {
  const option = value && listed(value);
  return option ? option.dataset.title || option.textContent : value;
};

/* ---- sheet ------------------------------------------------------------ */

const normalizeRow = (row) => Object.fromEntries(Object.entries(row)
  .map(([k, v]) => [k.trim().toLowerCase(), String(v ?? '').trim()]));

/**
 * The branches in the sheet's `code` tab, in sheet order. Rows whose value
 * is not a branch name are skipped, and so are repeated values.
 * @returns {Promise<{title: string, value: string}[]|null>} null when none
 */
async function loadBranches({ org, repo } = {}, actions = {}) {
  if (!org || !repo || !actions.daFetch) return null;
  try {
    const resp = await actions.daFetch(`https://admin.da.live/source/${org}/${repo}${SHEET_PATH}`);
    if (!resp.ok) return null;
    const rows = (await resp.json())?.[SHEET_TAB]?.data;
    if (!Array.isArray(rows)) return null;
    const branches = new Map();
    rows.map(normalizeRow).forEach(({ title, value }) => {
      if (BRANCH.test(value || '') && !branches.has(value)) branches.set(value, title || value);
    });
    return branches.size ? [...branches].map(([value, title]) => ({ title, value })) : null;
  } catch {
    return null;
  }
}

/** Replaces the built-in options, after the "Select a branch" prompt, with the sheet's */
function renderBranches(branches) {
  const [prompt] = select.options;
  select.replaceChildren(prompt, ...branches.map(({ title, value }) => new Option(title, value)));
}

/** The chosen branch, only when it is one of the listed options */
function chosenBranch() {
  const { value } = select;
  return listed(value) && BRANCH.test(value) ? value : null;
}

/**
 * The hash of the page open in the editor. The canvas sends it as `hash`;
 * otherwise it is built from org, repo and path.
 */
function editorHash({
  hash, org, repo, path = '',
} = {}) {
  const built = org && repo ? `#/${org}/${repo}${path}` : '';
  return [hash, built].find((h) => typeof h === 'string' && HASH.test(h)) || null;
}

/**
 * The editor URL of the open page with `?ref=` set to the branch. Relative,
 * so DA resolves it against its own origin.
 */
function switchHref(branch) {
  const hash = editorHash(state.context);
  if (!hash) return null;
  const url = new URL(`${form.dataset.editor}${hash}`, window.location.origin);
  url.searchParams.set('ref', branch);
  return `${url.pathname}${url.search}${url.hash}`;
}

/**
 * Go works only inside DA, for a picked branch (not the "Select a branch"
 * prompt) that differs from the editor's current one
 */
function updateGo() {
  go.disabled = !state.actions?.setHref || !select.value || select.value === state.current;
}

select.addEventListener('change', updateGo);

form.addEventListener('submit', (e) => {
  e.preventDefault();
  if (go.disabled) return;
  const branch = chosenBranch();
  if (!branch) {
    say('invalid');
    return;
  }
  const href = switchHref(branch);
  if (!href) {
    say('noPage');
    return;
  }
  say('switching', labelOf(branch));
  // the panel is a cross-origin iframe: DA's page navigates itself
  state.actions.setHref(href);
});

const timeout = (ms) => new Promise((resolve) => { setTimeout(() => resolve(null), ms); });

async function init() {
  let sdk = null;
  try {
    // eslint-disable-next-line import/no-unresolved -- remote DA App SDK
    const { default: DA_SDK } = await import('https://da.live/nx/utils/sdk.js');
    // the SDK only resolves inside DA; stand alone there is no page to switch
    sdk = await Promise.race([DA_SDK, timeout(3000)]);
  } catch { /* not in DA */ }

  status.textContent = '';
  if (!sdk?.actions) return;
  state.actions = sdk.actions;
  state.context = sdk.context || {};
  const branches = await loadBranches(state.context, state.actions);
  if (branches) renderBranches(branches);

  // the canvas sends its ?ref= as context.ref, and main when the URL has none
  // (canvas#/…), so main is preselected then too; an unlisted branch keeps the prompt
  const current = state.context.ref;
  if (typeof current === 'string' && BRANCH.test(current)) {
    state.current = current;
    const option = listed(current);
    if (option) {
      option.dataset.title = option.textContent;
      option.textContent = select.dataset.current.replace('{branch}', option.dataset.title);
      select.value = current;
    }
    say('current', labelOf(current));
  }
  updateGo();
}

init();
