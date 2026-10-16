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
 * Content comes from the DA sheet /.da/environments/config, tab `content`
 * (`title` is the option text, `value` the site). An open site that is not
 * listed is added to the list, so it starts on what is open.
 *
 * CodeBase is an editable combobox. Its list has two groups: "Environments",
 * the sheet's `code` tab (else the branches in the HTML), and "All branches",
 * every code branch of the site from the EDS admin API (api.js), loaded in
 * the background with the token DA gives the panel. Without that list (no
 * permission, an error) the panel works from the sheet alone, as one list.
 * The author can also type or paste any branch: it is written the way DA and
 * AEM write a branch in a host name (lowercase, anything but a-z, 0-9 and -
 * becomes -), shown first, and what is typed narrows both groups. The editor
 * path and every message live in the HTML.
 */

import { fetchBranches } from './api.js';

const SHEET_PATH = '/.da/environments/config.json';

// a branch or a site as it appears in an aem.page host, {branch}--{site}--{org}:
// lowercase letters and digits, single hyphens between them (a -- would split the host)
const NAME = /^[a-z0-9]+(-[a-z0-9]+)*$/;
// the editor hash: #/org/site/path
const HASH = /^#\/[^\s#]+$/;
// {branch}--{site}--{org} is one DNS label
const HOST_LABEL_MAX = 63;

const $ = (selector) => document.querySelector(selector);
const form = $('.env-selector-form');
const contentSelect = form.elements.content;
const branchInput = form.elements.branch;
const branchToggle = $('.env-selector-toggle');
const branchPopup = $('.env-selector-popup');
const branchList = $('.env-selector-list');
const listNote = $('.env-selector-list-note');
const go = $('.env-selector-go');
const statusLine = $('.env-selector-status');

const state = {
  actions: null,
  context: {},
  hash: null,
  current: { content: null, branch: null },
  // "Environments": the sheet's code tab, else the branches in the HTML
  config: [...branchList.querySelectorAll('[role="option"]')]
    .map((option) => ({ title: option.textContent, value: option.dataset.value })),
  // "All branches": the admin API's names that are not in config; null when unavailable
  fetched: null,
  loading: false,
  // what was typed since the list opened, which narrows it
  query: '',
  // the highlighted row of the open list, -1 for none
  active: -1,
};

/**
 * Shows a message from the status element's data-*, with {content} and
 * {branch} filled in as highlighted names; data-tone (the message key)
 * colours its dot
 */
function say(key, names = {}) {
  statusLine.dataset.tone = key;
  // split() keeps the captured placeholder names at the odd indexes
  const parts = (statusLine.dataset[key] || '').split(/\{(content|branch)\}/).map((part, i) => {
    if (i % 2 === 0) return part;
    const name = document.createElement('span');
    name.className = 'env-selector-name';
    name.textContent = names[part] || '';
    return name;
  });
  // one element for the whole message, so it flows as text beside the dot
  const message = document.createElement('span');
  message.append(...parts.filter((part) => part !== ''));
  statusLine.replaceChildren(message);
}

const listed = (select, value) => [...select.options].find((option) => option.value === value);

/** A content's name for messages: its title in the list, else the value itself */
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

/** Replaces the content options, after the prompt, with the given ones */
function renderOptions(select, options) {
  [...select.options].slice(1).forEach((option) => option.remove());
  select.append(...options.map(({ title, value }) => new Option(title, value)));
}

/**
 * Preselects the open content. One the list does not have is added at the
 * end, so the author can see it and pick it again.
 */
function selectCurrent(select, value) {
  if (!value) return;
  if (!listed(select, value)) select.append(new Option(value, value));
  select.value = value;
}

/* ---- CodeBase: an editable combobox ------------------------------------- */

/** A typed branch as DA and AEM write it in a host name (cf. normalizeBranch in DA) */
const normalizeBranch = (text) => text.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-');

const asItem = (value) => ({ title: value, value });

/**
 * The listed branches by group. The open branch, when neither group has it,
 * is added to "All branches" (or to the one list without the API's).
 */
function listedGroups() {
  const config = [...state.config];
  const fetched = (state.fetched || []).map(asItem);
  const open = state.current.branch;
  if (open && ![...config, ...fetched].some((b) => b.value === open)) {
    (state.fetched?.length ? fetched : config).push(asItem(open));
  }
  return { config, fetched };
}

const listedBranches = () => Object.values(listedGroups()).flat();

/** A branch's name for messages and the field: its title in the list, else the branch */
const branchTitle = (value) => listedBranches().find((b) => b.value === value)?.title || value;

/**
 * The branch in the CodeBase field: a listed one, by its title or value, else
 * the typed text as a branch name; null when the field is empty
 */
function fieldBranch() {
  const text = branchInput.value.trim();
  if (!text) return null;
  const lower = text.toLowerCase();
  const match = listedBranches().find((b) => b.title.toLowerCase() === lower || b.value === lower);
  return match ? match.value : normalizeBranch(text);
}

/** True when a branch matches what was typed since the list opened */
function matchesQuery({ title, value }) {
  const query = state.query.trim().toLowerCase();
  return !query || title.toLowerCase().includes(query) || value.includes(normalizeBranch(query));
}

/**
 * The rows of the open list: a typed branch that is not listed (always
 * shown), then each group narrowed to what was typed
 */
function branchRows() {
  const { config, fetched } = listedGroups();
  const branch = fieldBranch();
  const isListed = [...config, ...fetched].some((b) => b.value === branch);
  const typed = branch && !isListed ? [asItem(branch)] : [];
  return { typed, config: config.filter(matchesQuery), fetched: fetched.filter(matchesQuery) };
}

const flatRows = () => Object.values(branchRows()).flat();

function renderBranchList() {
  const { typed, config, fetched } = branchRows();
  // two labelled groups once the admin API listed branches; one list without them
  const grouped = Boolean(state.fetched?.length);
  const branch = fieldBranch();
  let index = 0;
  const option = ({ title, value }) => {
    const row = document.createElement('div');
    row.id = `env-selector-branch-${index}`;
    row.setAttribute('role', 'option');
    row.setAttribute('aria-selected', String(value === branch));
    row.classList.toggle('is-active', index === state.active);
    row.dataset.value = value;
    row.title = title;
    row.textContent = title;
    index += 1;
    return row;
  };
  const group = (items, key) => {
    if (!items.length) return [];
    if (!grouped) return items.map(option);
    const label = document.createElement('div');
    label.id = `env-selector-group-${key}`;
    label.className = 'env-selector-group-label';
    label.textContent = branchList.dataset[`${key}Label`];
    const box = document.createElement('div');
    box.setAttribute('role', 'group');
    box.setAttribute('aria-labelledby', label.id);
    box.append(label, ...items.map(option));
    return [box];
  };
  branchList.replaceChildren(...typed.map(option), ...group(config, 'config'), ...group(fetched, 'fetched'));
  listNote.textContent = state.loading ? listNote.dataset.loading : '';

  if (state.active >= 0) {
    branchInput.setAttribute('aria-activedescendant', `env-selector-branch-${state.active}`);
    branchList.querySelector('.is-active')?.scrollIntoView({ block: 'nearest' });
  } else {
    branchInput.removeAttribute('aria-activedescendant');
  }
}

const isOpen = () => !branchPopup.hidden;

function setOpen(open) {
  if (!open) {
    state.active = -1;
    state.query = '';
  }
  branchPopup.hidden = !open;
  [branchInput, branchToggle].forEach((el) => el.setAttribute('aria-expanded', String(open)));
  renderBranchList();
}

/** Opens the whole list: what is in the field does not narrow it until the author types */
function openFull() {
  if (isOpen()) return;
  state.query = '';
  setOpen(true);
}

/** Shows a listed branch by its title and a typed one in host-name form */
function settleBranchField() {
  const branch = fieldBranch();
  if (branch) branchInput.value = branchTitle(branch);
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

/** True when {branch}--{site}--{org} would not fit in one DNS label */
function tooLong(branch, content) {
  const [org] = hashParts();
  return Boolean(branch && content && org)
    && `${branch}--${content}--${org}`.length > HOST_LABEL_MAX;
}

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

/* ---- Go and the status line ----------------------------------------------- */

function sayCurrent() {
  const { content, branch } = state.current;
  if (content && branch) {
    say('current', { content: labelOf(contentSelect, content), branch: branchTitle(branch) });
  } else {
    statusLine.textContent = '';
  }
}

/**
 * Go works only inside DA, with a content and a branch that make a preview
 * host, and only when they differ from what the editor has open. A branch
 * that is too long is said at once; one that is not a host name only once the
 * field is left (`settled`), so typing "feature-" on the way to "feature-x"
 * does not flash an error.
 */
function refresh({ settled = false } = {}) {
  const content = contentSelect.value;
  const branch = fieldBranch();
  const bad = Boolean(branch) && !NAME.test(branch);
  const long = tooLong(branch, content);
  const unchanged = content === state.current.content && branch === state.current.branch;
  go.disabled = !state.actions?.setHref || !content || !branch || bad || long || unchanged;
  if (long) say('tooLong', { branch });
  else if (bad && settled) say('badBranch', { branch });
  else if (state.actions && !bad) sayCurrent();
}

contentSelect.addEventListener('change', refresh);

branchInput.addEventListener('input', () => {
  state.query = branchInput.value;
  state.active = -1;
  setOpen(true);
  refresh();
});
branchInput.addEventListener('click', openFull);
branchInput.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
    e.preventDefault();
    openFull();
    const rows = flatRows();
    if (!rows.length) return;
    const step = e.key === 'ArrowDown' ? 1 : -1;
    if (state.active < 0) state.active = step > 0 ? 0 : rows.length - 1;
    else state.active = (state.active + step + rows.length) % rows.length;
    renderBranchList();
  } else if (e.key === 'Enter' && isOpen() && state.active >= 0) {
    e.preventDefault();
    branchInput.value = flatRows()[state.active].title;
    setOpen(false);
    refresh();
  } else if (e.key === 'Escape' && isOpen()) {
    e.preventDefault();
    setOpen(false);
  }
});
branchToggle.addEventListener('click', () => {
  if (isOpen()) setOpen(false);
  else openFull();
  branchInput.focus();
});
// a click on a row must not take the focus out of the field
branchPopup.addEventListener('mousedown', (e) => e.preventDefault());
branchList.addEventListener('click', (e) => {
  const option = e.target.closest('[role="option"]');
  if (!option) return;
  branchInput.value = option.textContent;
  setOpen(false);
  refresh();
});
branchInput.closest('.env-selector-combo').addEventListener('focusout', (e) => {
  if (e.currentTarget.contains(e.relatedTarget)) return;
  setOpen(false);
  settleBranchField();
  refresh({ settled: true });
});

form.addEventListener('submit', (e) => {
  e.preventDefault();
  if (go.disabled) return;
  setOpen(false);
  const content = chosen(contentSelect);
  const branch = fieldBranch();
  if (!content || !NAME.test(branch || '')) {
    say('invalid');
    return;
  }
  const href = switchHref(content, branch);
  if (!href) {
    say('noPage');
    return;
  }
  settleBranchField();
  say('switching', { content: labelOf(contentSelect, content), branch: branchTitle(branch) });
  // the panel is a cross-origin iframe: DA's page navigates itself
  state.actions.setHref(href);
});

/**
 * The site's code branches from the admin API that are branch names, once
 * each; null when the API gives none (the panel then works from the sheet)
 */
async function loadFetchedBranches({ org, repo } = {}, token = '') {
  const { branches } = await fetchBranches(org, repo, token);
  const names = [...new Set(branches)].filter((name) => NAME.test(name));
  return names.length ? names : null;
}

const timeout = (ms) => new Promise((resolve) => { setTimeout(() => resolve(null), ms); });

async function init() {
  let sdk = null;
  try {
    // eslint-disable-next-line import/no-unresolved -- remote DA App SDK
    const { default: DA_SDK } = await import('https://da.live/nx/utils/sdk.js');
    // the SDK only resolves inside DA; stand alone there is no page to switch
    sdk = await Promise.race([DA_SDK, timeout(3000)]);
  } catch { /* not in DA */ }

  statusLine.textContent = '';
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

  // the branch list loads in the background, alongside the sheet
  const fetching = loadFetchedBranches(state.context, sdk.token);
  state.loading = true;

  const sheet = await loadSheet(state.context, state.actions);
  renderOptions(contentSelect, sheet.content || []);
  selectCurrent(contentSelect, state.current.content);
  if (sheet.branch) state.config = sheet.branch;
  if (state.current.branch) branchInput.value = branchTitle(state.current.branch);
  renderBranchList();
  refresh();

  // the API's branches that config does not have go in "All branches"
  const names = await fetching;
  state.loading = false;
  const fetched = (names || []).filter((name) => !state.config.some((b) => b.value === name));
  state.fetched = fetched.length ? fetched.sort() : null;
  state.active = -1;
  renderBranchList();
  refresh();
}

init();
