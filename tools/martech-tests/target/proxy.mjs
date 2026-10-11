// Test proxy in front of the local dev server (BASE_URL → :3100). Leave it running while testing.
// Page query parameters (read from the Referer for sub-requests):
//   ?tgt=1          page gets <meta name="target" content="on">; /site-config.json gets
//                   target.enabled=true and empty launch.* (isolates the at.js cost)
//   &a4t=<mode>     forces target.a4t: 0 | false | true | server | client
//   &keepLaunch=1   keeps the launch.* embeds
//   ?timer=2000     delayed-phase timer 2000 ms instead of 3000 ms (A/B without editing code)
import http from 'node:http';
import { BASE } from '../lib.mjs';

const PORT = Number(new URL(process.env.PROXY_URL || 'http://localhost:3100').port || 3100);

http.createServer(async (req, res) => {
  const url = new URL(req.url, BASE);
  const referer = req.headers.referer || '';
  const upstream = await fetch(url, { headers: { accept: req.headers.accept || '*/*' } });
  let body = Buffer.from(await upstream.arrayBuffer());
  const type = upstream.headers.get('content-type') || '';
  if (url.pathname === '/scripts/scripts.js' && referer.includes('timer=2000')) {
    body = Buffer.from(body.toString().replace('loadDelayed(), 3000)', 'loadDelayed(), 2000)'));
  } else if (url.pathname === '/site-config.json' && referer.includes('tgt=1')) {
    const json = JSON.parse(body.toString());
    const ref = new URL(referer);
    const a4t = ref.searchParams.get('a4t');
    const keepLaunch = ref.searchParams.get('keepLaunch') === '1';
    json.settings.data.forEach((row) => {
      if (row.key === 'target.enabled') row.value = 'true';
      if (row.key === 'target.a4t' && a4t) row.value = a4t === '0' ? 'false' : a4t;
      if (row.key.startsWith('launch.') && !keepLaunch) row.value = '';
    });
    body = Buffer.from(JSON.stringify(json));
  } else if (url.searchParams.get('tgt') === '1' && type.includes('text/html')) {
    body = Buffer.from(body.toString().replace('</head>', '<meta name="target" content="on"></head>'));
  }
  const headers = {};
  upstream.headers.forEach((v, k) => {
    if (!['content-encoding', 'content-length', 'transfer-encoding'].includes(k)) headers[k] = v;
  });
  res.writeHead(upstream.status, headers);
  res.end(body);
}).listen(PORT, () => console.log(`proxy on :${PORT} → ${BASE}`));
