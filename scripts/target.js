/**
 * Adobe Target via at.js 2.x — the aem.live "Adobe Target at.js (legacy)"
 * pattern (https://www.aem.live/developer/target-integration).
 *
 * scripts.js imports this module in the eager phase only on pages with `Target`
 * metadata, and waits for the returned promise before rendering the first
 * section. The promise resolves once the page-load offers have arrived (or after
 * the site's `target.flickerTimeout`, default 1000 ms; 0 = only wait for at.js,
 * the plain aem.live behaviour). Offers are applied whenever sections/blocks
 * finish decorating, so the first section's first paint already shows them.
 *
 * Analytics for Target (A4T), per the site's `target.a4t`:
 * - `true` / `server`: the Experience Cloud ID service (VisitorAPI) is created
 *   first, so at.js and the Analytics page view (Tags, delayed phase) share the
 *   same visitor ID and supplemental data ID. The Tags ECID extension reuses this
 *   instance (Visitor.getInstance per org).
 * - `client`: no VisitorAPI; at.js logs client-side and target-a4t.js hands the
 *   returned payload to the Tags page view.
 * - `false`: no A4T.
 */
import { loadScript } from './aem.js';
import { getSiteConfig } from './site-config.js';
import { onTargetConsent } from './consent-check.js';

const VENDOR = `${window.hlx.codeBasePath}/scripts/vendor`;

/**
 * Run `fn` for everything already decorated, then again each time a section or
 * block finishes loading (or something is added to <body>, e.g. header/footer).
 */
function onDecoratedElement(fn) {
  if (document.querySelector('[data-block-status="loaded"],[data-section-status="loaded"]')) {
    fn();
  }
  const observer = new MutationObserver((mutations) => {
    if (mutations.some((m) => m.target.tagName === 'BODY'
      || m.target.dataset.sectionStatus === 'loaded'
      || m.target.dataset.blockStatus === 'loaded')) {
      fn();
    }
  });
  observer.observe(document.querySelector('main'), {
    subtree: true,
    attributes: true,
    attributeFilter: ['data-block-status', 'data-section-status'],
  });
  observer.observe(document.body, { childList: true });
}

/** Convert jQuery-style `:eq(n)` (used by the Target VEC) to standard CSS. */
function toCssSelector(selector) {
  return selector.replace(/(\.\S+)?:eq\((\d+)\)/g, (_, clss, i) => `:nth-child(${Number(i) + 1}${clss ? ` of ${clss})` : ''}`);
}

/**
 * The element an offer / metric targets, or null if it isn't in the DOM yet.
 * Items without a selector (e.g. custom code) count as found, so they are
 * applied once and not re-applied on the next decoration pass.
 */
function findTarget(item) {
  const selector = item.cssSelector || (item.selector && toCssSelector(item.selector));
  if (!selector) return document.body;
  try {
    return document.querySelector(selector);
  } catch {
    return null; // invalid selector — keep it, never matches
  }
}

/**
 * A4T mode from the site config: `client` (client-side logging, target-a4t.js,
 * no VisitorAPI), `server` (true; VisitorAPI + server-side logging) or `off`.
 */
function a4tMode(config) {
  if (config.a4t === 'client') return 'client';
  return config.a4t ? 'server' : 'off';
}

async function getAndApplyOffers(mode) {
  const response = await window.adobe.target.getOffers({ request: { execute: { pageLoad: {} } } });
  if (mode === 'client') {
    // expose the Analytics payload for the Tags page view (delayed phase)
    import('./target-a4t.js').then(({ captureA4T }) => captureA4T(response));
  }
  const pageLoad = response?.execute?.pageLoad;
  if (!pageLoad) return;
  const { options = [], metrics = [] } = pageLoad;
  onDecoratedElement(() => {
    window.adobe.target.applyOffers({ response });
    // Drop what has now been applied, so later passes only apply what is still
    // waiting for its element to be decorated.
    options.forEach((o) => { o.content = (o.content || []).filter((c) => !findTarget(c)); });
    for (let i = metrics.length - 1; i >= 0; i -= 1) {
      if (findTarget(metrics[i])) metrics.splice(i, 1);
    }
  });
}

/** Experience Cloud ID service instance for A4T (shared with Tags). */
async function initVisitor(imsOrgId) {
  if (!window.Visitor) await loadScript(`${VENDOR}/VisitorAPI.min.js`);
  window.Visitor.getInstance(imsOrgId);
}

function addLink(rel, href, crossOrigin) {
  const link = document.createElement('link');
  link.rel = rel;
  link.href = href;
  if (crossOrigin) link.crossOrigin = crossOrigin;
  document.head.append(link);
}

/**
 * Load at.js and request page-load offers. Caller has already checked the
 * site flag and, when required, Targeting consent.
 * @param {object} config site target config
 */
async function startTarget(config) {
  if (window.adobe?.target) {
    // eslint-disable-next-line no-console
    console.warn('Adobe Target already loaded (Tags?) — skipping site at.js');
    return;
  }

  const mode = a4tMode(config);
  addLink('preconnect', `https://${config.serverDomain}`, 'use-credentials');
  // fetch at.js in parallel with VisitorAPI; it only runs once imported below
  addLink('modulepreload', `${VENDOR}/at.min.js`);
  if (mode === 'server') await initVisitor(config.imsOrgId);

  window.targetGlobalSettings = {
    clientCode: config.clientCode,
    serverDomain: config.serverDomain,
    imsOrgId: config.imsOrgId,
    // aem.live recommended settings — offers are requested/applied by this module
    bodyHidingEnabled: false,
    pageLoadEnabled: false,
    viewsEnabled: false,
    withWebGLRenderer: false,
    secureOnly: true,
    // aem.page / aem.live are public suffixes: keep cookies on this host
    cookieDomain: window.location.hostname,
    // carried over from the Tags "Adobe Target v2" extension
    timeout: 3000,
    visitorApiTimeout: 2000,
    globalMboxName: 'target-global-mbox',
    decisioningMethod: 'server-side',
    // client: payload returned to the page (target-a4t.js); server: via sdid
    analyticsLogging: mode === 'client' ? 'client_side' : 'server_side',
    supplementalDataIdParamTimeout: 30,
    deviceIdLifetime: 63244800000,
    sessionIdLifetime: 1860000,
  };
  let offersSettled;
  const offersReady = new Promise((resolve) => { offersSettled = resolve; });
  document.addEventListener('at-library-loaded', () => {
    getAndApplyOffers(mode)
      .catch((e) => {
        // eslint-disable-next-line no-console
        console.error('Adobe Target offers failed', e);
      })
      .finally(offersSettled);
  }, { once: true });
  await import(`${VENDOR}/at.min.js`);

  // Anti-flicker: hold the caller (the first section's render) until the offers
  // are in, capped by target.flickerTimeout. Offers are applied as each section
  // finishes loading; late offers (after the cap) still apply when they arrive.
  const cap = Number(config.flickerTimeout ?? 1000);
  if (cap > 0) {
    await Promise.race([offersReady, new Promise((resolve) => { setTimeout(resolve, cap); })]);
  }
}

/**
 * Load at.js for the current site (if enabled) and request page-load offers.
 * When consent is required, returns immediately and loads only after the
 * visitor accepts Targeting cookies, so the banner does not block first paint.
 * @returns {Promise<void>} resolves once at.js has loaded, or once the wait
 * for consent has been registered
 */
export default async function initTarget() {
  const { site } = await getSiteConfig();
  const config = site?.target;
  if (!config?.enabled) return;
  if (site.consentRequired) {
    onTargetConsent(() => { startTarget(config); });
    return;
  }
  await startTarget(config);
}
