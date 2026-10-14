/**
 * Hotjar. Martech module for the `script.hotjar` row (delayed tab):
 *
 *   script.hotjar  https://static.hotjar.com/c/hotjar-<site id>.js?sv=<version>
 *
 * Hotjar's script needs the snippet's page globals before it runs — without them
 * it stops with "_hjSettings is not defined" — so this sets window._hjSettings and
 * the hj() queue from the URL, then injects the script. The loader has already
 * waited for consent when it is required.
 */
const HOTJAR_URL = /^https:\/\/static\.hotjar\.com\/c\/hotjar-(\d+)\.js\?sv=(\d+)$/;

/**
 * @param {{ url: string }} settings `url` = the `script.hotjar` value
 * @param {object} ctx loader context
 */
export default function init({ url }, ctx) {
  const match = String(url).match(HOTJAR_URL);
  if (!match) {
    ctx.warn('invalid URL (expected https://static.hotjar.com/c/hotjar-<site id>.js?sv=<version>) — not loaded');
    return;
  }
  /* eslint-disable no-underscore-dangle */
  if (window.hj && window._hjSettings) return; // already on the page (e.g. loaded by Tags)
  window.hj = window.hj || function hj(...args) {
    (window.hj.q = window.hj.q || []).push(args);
  };
  window._hjSettings = { hjid: Number(match[1]), hjsv: Number(match[2]) };
  /* eslint-enable no-underscore-dangle */
  ctx.injectScript(url);
}
