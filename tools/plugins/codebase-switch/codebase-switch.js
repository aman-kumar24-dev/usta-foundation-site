/*
 * Codebase switch — an Experience Workspace (DA) library plugin. The author
 * picks a code branch and Go reloads the editor with it: the branch replaces
 * {branch} in the form's data-url (codebase-switch.html) and DA navigates to
 * that URL. In the canvas, `?ref=` sets the code branch for both the page
 * preview and the plugins, so the editor reloads on that branch's code.
 *
 * The branch list, the URL and every message live in the HTML.
 */

// a branch as it appears in an aem.page host: {branch}--{site}--{org}
const BRANCH = /^[a-z0-9-]+$/;

const $ = (selector) => document.querySelector(selector);
const form = $('.codebase-switch-form');
const select = form.elements.branch;
const go = $('.codebase-switch-go');
const status = $('.codebase-switch-status');

const state = { actions: null };

function say(key, branch = '') {
  status.textContent = (status.dataset[key] || '').replace('{branch}', branch);
}

const listed = (value) => [...select.options].find((option) => option.value === value);

/** The chosen branch, only when it is one of the listed options */
function chosenBranch() {
  const { value } = select;
  return listed(value) && BRANCH.test(value) ? value : null;
}

form.addEventListener('submit', (e) => {
  e.preventDefault();
  const branch = chosenBranch();
  if (!branch) {
    say('invalid');
    return;
  }
  const url = form.dataset.url.replace('{branch}', encodeURIComponent(branch));
  say('switching', branch);
  // the panel is a cross-origin iframe: DA's page navigates itself (https URLs only)
  if (state.actions?.setHref) state.actions.setHref(url);
  else window.open(url, '_top');
});

const timeout = (ms) => new Promise((resolve) => { setTimeout(() => resolve(null), ms); });

async function init() {
  let sdk = null;
  try {
    // eslint-disable-next-line import/no-unresolved -- remote DA App SDK
    const { default: DA_SDK } = await import('https://da.live/nx/utils/sdk.js');
    // the SDK only resolves inside DA; stand alone, Go opens DA itself
    sdk = await Promise.race([DA_SDK, timeout(3000)]);
  } catch { /* not in DA */ }
  state.actions = sdk?.actions || null;

  if (!sdk) {
    say('standalone');
  } else {
    // the canvas passes its ?ref= as context.ref (main when there is none)
    const current = sdk.context?.ref;
    const known = typeof current === 'string' && BRANCH.test(current);
    const option = known && listed(current);
    if (option) {
      option.textContent = select.dataset.current.replace('{branch}', current);
      select.value = current;
    }
    if (known) say('current', current);
    else status.textContent = '';
  }
  go.disabled = false;
}

init();
