/* eslint-disable no-console, no-restricted-globals, no-underscore-dangle */
/*
 * Consent audit: maps every vendor on a page to the OneTrust category it is listed
 * under, and flags anything running while its category is off.
 *
 * Paste into the DevTools console (or save as a Snippet under Sources > Snippets)
 * on any page that loads OneTrust: usta.com, ustacoaching.com, redballtennis.com...
 *
 *   consentAudit.run()              print the report for the current consent state
 *   consentAudit.set('C0002,C0004') set categories (C0001 is always on), then reload
 *   consentAudit.json()             last report as an object, for copying
 *
 * Workflow: set a state, let the page reload, re-run the snippet, compare reports.
 * Gating rule used: a tag with several categories needs ALL of them (tested on usta.com).
 */
(() => {
  const VENDOR_URLS = [
    ['Adobe Launch', /assets\.adobedtm\.com\/(launch|[0-9a-f]{12}\/[0-9a-f]{12}\/launch)/],
    ['Adobe Analytics', /AppMeasurement|\.sc\.omtrdc\.net|\/b\/ss\//],
    ['Adobe Target', /\.tt\.omtrdc\.net|\/at\.js|\/mbox/],
    ['Adobe Visitor/AAM', /demdex\.net/],
    ['Hotjar', /hotjar\.(com|io)/],
    ['Google Ad Manager', /pubads|securepubads|gampad|\/gpt\.js/],
    ['Google Ads/gtag', /googletagmanager\.com|googleadservices|googleads\.g\.doubleclick|google\.com\/ccm|google\.com\/pagead/],
    ['DoubleClick Floodlight', /(ad|fls)\.doubleclick\.net|\.fls\.doubleclick\.net/],
    ['Meta Pixel', /connect\.facebook\.net|facebook\.com\/tr/],
    ['Simpli.fi', /simpli\.fi/],
    ['bttrack', /bttrack\.com/],
    ['Zendesk', /zdassets\.com|zopim\.com|zendesk/],
    ['YouTube', /youtube(-nocookie)?\.com|ytimg\.com/],
    ['Vimeo', /vimeo\.com/],
    ['Stripe', /stripe\.com/],
    ['Fundraise Up', /fundraiseup\.com|fndrsp\.net/],
    ['Feroot', /feroot\.com/],
    ['Google Maps', /maps\.googleapis\.com|maps\.gstatic\.com/],
    ['OneTrust', /cookielaw\.org|onetrust/i],
    ['UsableNet', /usablenet/],
  ];

  const VENDOR_COOKIES = [
    ['Adobe', /^(s_|AMCV|mbox|at_check|mboxEdge|sat_track|TEST_AMCV)/],
    ['Hotjar', /^_hj/],
    ['Google', /^(_ga|_gid|__utm|_gcl|__gads|__gpi|__eoi|NID|SEARCH_SAMESITE|CONSENT)/],
    ['Meta', /^(_fbp|_fbc|fr$)/],
    ['Cloudflare', /^(__cf|_cfuvid|cf_)/],
    ['Akamai', /^(_abck|ak_bmsc|bm_)/],
    ['AWS load balancer', /^AWSALB/],
    ['OneTrust', /^Optanon/],
    ['Stripe', /^__stripe/],
    ['Zendesk', /^(__zlcmid|_zendesk|ZD-)/],
  ];

  const GLOBALS = {
    'Adobe Launch (_satellite)': () => typeof window._satellite !== 'undefined',
    'Adobe Target (adobe.target)': () => !!(window.adobe && window.adobe.target),
    'Hotjar (hj)': () => typeof window.hj === 'function',
    'Meta Pixel (fbq)': () => typeof window.fbq === 'function',
    'Zendesk (zE)': () => typeof window.zE === 'function',
    'Google Ad Manager (googletag.pubads)': () => !!(window.googletag && window.googletag.pubads),
  };

  const first = (list, value) => (list.find(([, re]) => re.test(value)) || [])[0];
  const uniq = (list) => [...new Set(list)];

  function cookieRegex(name) {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/(x{3,}|#{3,})/g, '.+');
    return new RegExp(name.endsWith('_') ? `^${escaped}` : `^${escaped}$`);
  }

  function readInventory(domainData) {
    const cookies = [];
    const hosts = [];
    domainData.Groups.forEach((group) => {
      const id = group.CustomGroupId;
      (group.FirstPartyCookies || []).forEach((c) => cookies.push({ id, re: cookieRegex(c.Name) }));
      (group.Hosts || []).forEach((h) => {
        hosts.push({ id, host: h.HostName.replace(/^https?:\/\//, '').replace(/^\./, '') });
        (h.Cookies || []).forEach((c) => cookies.push({ id, re: cookieRegex(c.Name) }));
      });
    });
    return { cookies, hosts };
  }

  function run() {
    const ot = window.Optanon;
    const domainData = ot && ot.GetDomainData && ot.GetDomainData();
    if (!domainData) {
      console.warn('consentAudit: OneTrust (Optanon) is not on this page, so there is no banner to audit.');
      return null;
    }
    const active = String(window.OnetrustActiveGroups || '').split(',').filter(Boolean);
    const isOn = (id) => active.includes(id);
    const names = Object.fromEntries(domainData.Groups.map((g) => [g.CustomGroupId, g.GroupName]));
    const inv = readInventory(domainData);
    const listedFor = (host) => uniq(inv.hosts
      .filter((h) => host === h.host || host.endsWith(`.${h.host}`)).map((h) => h.id));

    const report = {
      page: location.href,
      consent: {},
      tags: [],
      hosts: [],
      cookies: [],
      globals: {},
      issues: [],
    };
    Object.keys(names).sort().forEach((id) => { report.consent[`${id} ${names[id]}`] = isOn(id) ? 'ON' : 'off'; });

    // 1. script tags OneTrust gates (class optanon-category-...)
    const tagByHost = {};
    document.querySelectorAll('script[class*="optanon-category"]').forEach((el) => {
      const required = (el.className.match(/C000\d/g) || []);
      const src = el.src || '(inline)';
      const running = el.type !== 'text/plain';
      const allOn = required.every(isOn);
      let host = '';
      try { host = new URL(src).hostname; } catch (e) { /* inline tag */ }
      tagByHost[host] = required;
      report.tags.push({
        vendor: first(VENDOR_URLS, src) || host || 'inline',
        gate: required.join(' + '),
        state: running ? 'RUNNING' : 'blocked',
        src: src.slice(0, 80),
      });
      if (running && !allOn) {
        report.issues.push(`FAIL tag running while a required category is off: ${src.slice(0, 70)} needs ${required.join('+')}`);
      }
    });

    // 2. every host the page contacted
    const seen = {};
    performance.getEntriesByType('resource').forEach((r) => {
      let host;
      try { host = new URL(r.name).hostname; } catch (e) { return; }
      if (host === location.hostname) return;
      const vendor = first(VENDOR_URLS, r.name);
      if (!vendor && !seen[host]) seen[host] = { vendor: '(unlabelled)', count: 0 };
      const entry = seen[host] || (seen[host] = { vendor, count: 0 });
      entry.vendor = vendor || entry.vendor;
      entry.count += 1;
    });
    Object.keys(seen).sort().forEach((host) => {
      const listed = listedFor(host);
      const gate = tagByHost[host] || [];
      const row = {
        host,
        vendor: seen[host].vendor,
        requests: seen[host].count,
        'banner lists it under': listed.join(', ') || '-',
        'tag gate': gate.join(' + ') || '-',
      };
      report.hosts.push(row);
      if (listed.length && listed.every((id) => !isOn(id)) && !listed.includes('C0001')) {
        report.issues.push(`WARN ${host} (${row.vendor}) loaded but listed only under off categories: ${listed.join(', ')}`);
      }
    });

    // 3. cookies on this page
    document.cookie.split('; ').filter(Boolean).map((c) => c.split('=')[0]).forEach((name) => {
      const listed = uniq(inv.cookies.filter((c) => c.re.test(name)).map((c) => c.id));
      report.cookies.push({
        cookie: name,
        vendor: first(VENDOR_COOKIES, name) || '-',
        'banner lists it under': listed.join(', ') || 'UNCLASSIFIED',
      });
      if (listed.length && listed.every((id) => !isOn(id))) {
        report.issues.push(`WARN cookie ${name} exists but all its categories are off: ${listed.join(', ')}`);
      }
      if (!listed.length) report.issues.push(`INFO cookie ${name} is not in the OneTrust inventory`);
    });

    // 4. tools that are live
    Object.entries(GLOBALS).forEach(([label, test]) => { report.globals[label] = test() ? 'loaded' : '-'; });

    window.consentAudit.last = report;
    console.group(`Consent audit: ${location.hostname}`);
    console.log('Consent state'); console.table(report.consent);
    console.log('Gated script tags'); console.table(report.tags);
    console.log('Hosts contacted'); console.table(report.hosts);
    console.log('Cookies'); console.table(report.cookies);
    console.log('Tools live'); console.table(report.globals);
    console.log(report.issues.length ? `Issues (${report.issues.length})` : 'No issues found');
    report.issues.forEach((i) => console.log(i));
    console.groupEnd();
    return report;
  }

  function set(ids) {
    const want = String(ids).split(',').map((s) => s.trim()).filter(Boolean);
    const all = ['C0001', 'C0002', 'C0003', 'C0004', 'C0005'];
    const value = all.map((id) => `${id}:${id === 'C0001' || want.includes(id) ? 1 : 0}`).join(',');
    window.Optanon.UpdateConsent('Category', value);
    console.log(`consentAudit: set ${value}. Reloading; paste the script again after load.`);
    setTimeout(() => location.reload(), 500);
  }

  window.consentAudit = { run, set, json: () => JSON.stringify(window.consentAudit.last, null, 2) };
  run();
})();
