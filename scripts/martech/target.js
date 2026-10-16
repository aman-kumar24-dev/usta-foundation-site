/**
 * Adobe Target via at.js 2.x — the aem.live "Adobe Target at.js (legacy)" pattern
 * (https://www.aem.live/developer/target-integration). Martech module for the eager
 * tab of the site config:
 *
 *   target.enabled         true | false
 *   target.clientCode      Target client code
 *   target.serverDomain    <client code>.tt.omtrdc.net
 *   target.imsOrgId        <org id>@AdobeOrg
 *   target.a4t             client | server | off   (true = server, false = off)
 *   target.flickerTimeout  max ms the first section waits for offers (0–3000; 0 = no wait)
 *
 * scripts.js runs the eager phase only on pages with `Target` metadata (any value
 * but off/false/no) and holds the first section until it resolves.
 * - Consent not required: loads at.js, requests the page-load offers and resolves
 *   once they are in (or after flickerTimeout). Offers are applied whenever sections
 *   and blocks finish decorating, so the first paint already shows them.
 * - Consent required: resolves at once (the page is not held) and loads Target only
 *   after the visitor consents; offers then apply on arrival.
 *
 * Analytics for Target (A4T), per target.a4t:
 * - server: the Experience Cloud ID service (VisitorAPI) is created first, so at.js
 *   and the Tags page view share the visitor ID and supplemental data ID.
 * - client: at.js logs client-side and target-a4t.js hands the payload to the Tags
 *   page view.
 * - off: no A4T.
 */
import { loadScript } from '../aem.js';

const VENDOR = `${window.hlx.codeBasePath}/scripts/martech/vendor`;
// at.js delivery timeout, carried over from the Tags "Adobe Target v2" extension;
// also the upper bound of target.flickerTimeout
const TIMEOUT = 3000;

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

const A4T_MODES = {
  client: 'client', server: 'server', true: 'server', off: 'off', false: 'off',
};

const RULES = {
  clientCode: (v) => /^[\w-]+$/.test(v),
  serverDomain: (v) => /^[\w-]+\.tt\.omtrdc\.net$/.test(v),
  imsOrgId: (v) => /^[A-F0-9]+@AdobeOrg$/i.test(v),
  a4t: (v) => Object.prototype.hasOwnProperty.call(A4T_MODES, v.toLowerCase()),
  flickerTimeout: (v) => /^\d+$/.test(v) && Number(v) <= TIMEOUT,
};

/**
 * Validated settings, or null (with one warning naming every problem).
 * @param {Record<string, string>} settings `target.*` rows without the prefix
 * @param {(message: string) => void} warn
 */
function readConfig(settings, warn) {
  const problems = Object.entries(RULES).flatMap(([key, valid]) => {
    const value = settings[key] || '';
    if (!value) return [`missing "${key}"`];
    return valid(value) ? [] : [`invalid value for "${key}"`];
  });
  if (problems.length) {
    warn(`${problems.join(', ')} — not loaded`);
    return null;
  }
  return {
    clientCode: settings.clientCode,
    serverDomain: settings.serverDomain,
    imsOrgId: settings.imsOrgId,
    a4t: A4T_MODES[settings.a4t.toLowerCase()],
    flickerTimeout: Number(settings.flickerTimeout),
  };
}

async function getAndApplyOffers(mode) {
  const response = await window.adobe.target.getOffers({ request: { execute: { pageLoad: {} } } });
  if (mode === 'client') {
    // expose the Analytics payload for the Tags page view (delayed phase)
    import('./target-a4t.js').then(({ captureA4T }) => captureA4T(response)).catch(() => {});
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

function addLink(rel, href, crossOrigin) {
  const link = document.createElement('link');
  link.rel = rel;
  link.href = href;
  if (crossOrigin) link.crossOrigin = crossOrigin;
  document.head.append(link);
}

/**
 * Load at.js and request the page-load offers.
 * @param {object} config validated settings
 * @param {boolean} hold resolve only once the offers are in (or flickerTimeout passed)
 * @param {(message: string) => void} warn
 */
async function startTarget(config, hold, warn) {
  if (window.adobe?.target) {
    warn('Adobe Target already loaded (Tags?) — site at.js skipped');
    return;
  }
  addLink('preconnect', `https://${config.serverDomain}`, 'use-credentials');
  // fetch at.js in parallel with VisitorAPI; it only runs once imported below
  addLink('modulepreload', `${VENDOR}/at.min.js`);
  if (config.a4t === 'server') {
    if (!window.Visitor) await loadScript(`${VENDOR}/VisitorAPI.min.js`);
    window.Visitor.getInstance(config.imsOrgId);
  }

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
    timeout: TIMEOUT,
    visitorApiTimeout: 2000,
    globalMboxName: 'target-global-mbox',
    decisioningMethod: 'server-side',
    // client: payload returned to the page (target-a4t.js); server: via sdid
    analyticsLogging: config.a4t === 'client' ? 'client_side' : 'server_side',
    supplementalDataIdParamTimeout: 30,
    deviceIdLifetime: 63244800000,
    sessionIdLifetime: 1860000,
  };
  let offersSettled;
  const offersReady = new Promise((resolve) => { offersSettled = resolve; });
  document.addEventListener('at-library-loaded', () => {
    getAndApplyOffers(config.a4t)
      .catch((e) => {
        // eslint-disable-next-line no-console
        console.error('Adobe Target offers failed', e);
      })
      .finally(offersSettled);
  }, { once: true });
  await import(`${VENDOR}/at.min.js`);

  // Anti-flicker: hold the caller (the first section's render) until the offers
  // are in, capped by target.flickerTimeout. Late offers still apply on arrival.
  if (hold && config.flickerTimeout > 0) {
    await Promise.race([offersReady, new Promise((resolve) => {
      setTimeout(resolve, config.flickerTimeout);
    })]);
  }
}

/**
 * @param {Record<string, string>} settings `target.*` rows without the prefix
 * @param {object} ctx loader context
 */
export default async function init(settings, ctx) {
  const config = readConfig(settings, ctx.warn);
  if (!config) return;
  if (ctx.consentRequired) {
    // never hold the page for consent: load Target once the visitor consents
    ctx.whenConsented()
      .then(() => startTarget(config, false, ctx.warn))
      .catch((e) => ctx.warn(`failed (${e.message})`));
    return;
  }
  await startTarget(config, true, ctx.warn);
}
