/*
 * Env selector — an Experience Workspace (DA) library plugin. The author picks
 * a code branch and Go reloads the page open in the editor with it: the page's
 * URL gets `?ref=<branch>`, replacing the current ref, or adding it when there
 * is none (no ref means main). In the canvas, `?ref=` sets the code branch for
 * both the page preview and the plugins.
 *
 * The panel is a cross-origin iframe and cannot read the editor's URL, so the
 * URL is rebuilt from what DA sends the panel: the canvas hash
 * (#/org/site/path) and its ref. The branch list, the editor path and every
 * message live in the HTML.
 */

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

form.addEventListener('submit', (e) => {
  e.preventDefault();
  if (!state.actions?.setHref) {
    say('standalone');
    return;
  }
  const branch = chosenBranch();
  if (!branch) {
    say('invalid');
    return;
  }
  if (branch === state.current) {
    say('same', branch);
    return;
  }
  const href = switchHref(branch);
  if (!href) {
    say('noPage');
    return;
  }
  say('switching', branch);
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

  if (!sdk?.actions) {
    say('standalone');
    return;
  }
  state.actions = sdk.actions;
  state.context = sdk.context || {};

  // the canvas sends its ?ref= as context.ref, main when the URL has none
  const current = state.context.ref;
  if (typeof current === 'string' && BRANCH.test(current)) {
    state.current = current;
    const option = listed(current);
    if (option) {
      option.textContent = select.dataset.current.replace('{branch}', current);
      select.value = current;
    }
    say('current', current);
  } else {
    status.textContent = '';
  }
  go.disabled = false;
}

init();
