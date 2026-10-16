/*
 * Env selector — an Experience Workspace (DA) library plugin. The author picks
 * the content (a DA site) and the code branch, and Go opens the page open in
 * the editor with them. In its canvas URL the site is the second segment of
 * the hash (#/org/site/path) and the branch is `?ref=`, replaced, or added
 * when there is none (no ref means main). In the canvas, `?ref=` sets the
 * code branch for both the page preview and the plugins.
 *
 * The panel is a cross-origin iframe and cannot read the editor's URL, so the
 * URL is rebuilt from what DA sends the panel: the canvas hash and its ref.
 *
 * Both lists come from the DA sheet /.da/environments/config: tab `content`
 * for the content, tab `code` for the branches (`title` is the option text,
 * `value` the site or branch). Without the sheet, the branches fall back to
 * the options in the HTML. An open site or branch that is not listed (e.g. a
 * feature branch) is added to its list, so each list starts on what is open.
 * The editor path and every message live in the HTML.
 */

const SHEET_PATH = '/.da/environments/config.json';

// a branch or a site as it appears in an aem.page host: {branch}--{site}--{org}
const NAME = /^[a-z0-9-]+$/;
// the editor hash: #/org/site/path
const HASH = /^#\/[^\s#]+$/;

const $ = (selector) => document.querySelector(selector);
const form = $('.env-selector-form');
const contentSelect = form.elements.content;
const branchSelect = form.elements.branch;
const go = $('.env-selector-go');
const status = $('.env-selector-status');

const state = {
  actions: null,
  context: {},
  hash: null,
  current: { content: null, branch: null },
};

/**
 * Shows a message from the status element's data-*, with {content} and
 * {branch} filled in as highlighted names; data-tone (the message key)
 * colours its dot
 */
function say(key, names = {}) {
  status.dataset.tone = key;
  // split() keeps the captured placeholder names at the odd indexes
  const parts = (status.dataset[key] || '').split(/\{(content|branch)\}/).map((part, i) => {
    if (i % 2 === 0) return part;
    const name = document.createElement('span');
    name.className = 'env-selector-name';
    name.textContent = names[part] || '';
    return name;
  });
  // one element for the whole message, so it flows as text beside the dot
  const message = document.createElement('span');
  message.append(...parts.filter((part) => part !== ''));
  status.replaceChildren(message);
}

const listed = (select, value) => [...select.options].find((option) => option.value === value);

/** A value's name for messages: its title in the list, else the value itself */
const labelOf = (select, value) => (value && listed(select, value)?.textContent) || value;

/** The picked value, only when it is one of the listed options */
function chosen(select) {
  const { value } = select;
  return listed(select, value) && NAME.test(value) ? value : null;
}

/* ---- sheet ------------------------------------------------------------ */

const normalizeRow = (row) => Object.fromEntries(Object.entries(row)
  .map(([k, v]) => [k.trim().toLowerCase(), String(v ?? '').trim()]));

/**
 * A sheet tab's rows as options, in sheet order. Rows whose value is not a
 * site or branch name are skipped, and so are repeated values.
 * @returns {{title: string, value: string}[]|null} null when none
 */
function tabOptions(json, tab) {
  const rows = json?.[tab]?.data;
  if (!Array.isArray(rows)) return null;
  const options = new Map();
  rows.map(normalizeRow).forEach(({ title, value }) => {
    if (NAME.test(value || '') && !options.has(value)) options.set(value, title || value);
  });
  return options.size ? [...options].map(([value, title]) => ({ title, value })) : null;
}

/** The sheet's content and branch options; an empty object when it cannot be read */
async function loadSheet({ org, repo } = {}, actions = {}) {
  if (!org || !repo || !actions.daFetch) return {};
  try {
    const resp = await actions.daFetch(`https://admin.da.live/source/${org}/${repo}${SHEET_PATH}`);
    if (!resp.ok) return {};
    const json = await resp.json();
    return { content: tabOptions(json, 'content'), branch: tabOptions(json, 'code') };
  } catch {
    return {};
  }
}

/** Replaces a list's options, after its prompt, with the given ones */
function renderOptions(select, options) {
  [...select.options].slice(1).forEach((option) => option.remove());
  select.append(...options.map(({ title, value }) => new Option(title, value)));
}

/**
 * Preselects the open content or branch. One the list does not have (e.g. a
 * feature branch) is added at the end, so the author can see it and pick it
 * again.
 */
function selectCurrent(select, value) {
  if (!value) return;
  if (!listed(select, value)) select.append(new Option(value, value));
  select.value = value;
}

/* ---- editor URL ------------------------------------------------------- */

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

/** The open page's hash split into org, site, path… */
const hashParts = () => (state.hash ? state.hash.slice(2).split('/') : []);

/**
 * The editor URL of the open page with the content as the hash's site and
 * the branch as `?ref=`. Relative, so DA resolves it against its own origin.
 */
function switchHref(content, branch) {
  const parts = hashParts();
  if (parts.length < 2) return null;
  parts[1] = content;
  const url = new URL(`${form.dataset.editor}#/${parts.join('/')}`, window.location.origin);
  url.searchParams.set('ref', branch);
  return `${url.pathname}${url.search}${url.hash}`;
}

/* ---- Go ----------------------------------------------------------------- */

/**
 * Go works only inside DA, once both lists have a pick (not their prompts),
 * and only when the picks differ from what the editor has open
 */
function updateGo() {
  const unchanged = contentSelect.value === state.current.content
    && branchSelect.value === state.current.branch;
  go.disabled = !state.actions?.setHref || !contentSelect.value || !branchSelect.value || unchanged;
}

contentSelect.addEventListener('change', updateGo);
branchSelect.addEventListener('change', updateGo);

form.addEventListener('submit', (e) => {
  e.preventDefault();
  if (go.disabled) return;
  const content = chosen(contentSelect);
  const branch = chosen(branchSelect);
  if (!content || !branch) {
    say('invalid');
    return;
  }
  const href = switchHref(content, branch);
  if (!href) {
    say('noPage');
    return;
  }
  say('switching', { content: labelOf(contentSelect, content), branch: labelOf(branchSelect, branch) });
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
  state.hash = editorHash(state.context);

  // the open site is the hash's second segment; the canvas sends its ?ref= as
  // context.ref, and main when the URL has none (canvas#/…)
  const [, site] = hashParts();
  const { ref } = state.context;
  if (NAME.test(site || '')) state.current.content = site;
  if (typeof ref === 'string' && NAME.test(ref)) state.current.branch = ref;

  const sheet = await loadSheet(state.context, state.actions);
  renderOptions(contentSelect, sheet.content || []);
  if (sheet.branch) renderOptions(branchSelect, sheet.branch);
  selectCurrent(contentSelect, state.current.content);
  selectCurrent(branchSelect, state.current.branch);

  if (state.current.content && state.current.branch) {
    say('current', {
      content: labelOf(contentSelect, state.current.content),
      branch: labelOf(branchSelect, state.current.branch),
    });
  }
  updateGo();
}

init();
