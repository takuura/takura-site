/* External link liveness check for content.json and _redirects.
   Run locally with: node check-links.js
   Also run by the GitHub Action (check-links.yml) on push and weekly.
   Collects every https URL from content.json (recursively) and every
   redirect target in _redirects, then requests each one and fails if
   any returns HTTP >= 400 or does not respond. */
const fs = require('fs');

function collectUrls(value, out) {
  if (typeof value === 'string') {
    if (value.startsWith('https://')) out.add(value);
  } else if (Array.isArray(value)) {
    value.forEach((v) => collectUrls(v, out));
  } else if (value && typeof value === 'object') {
    Object.values(value).forEach((v) => collectUrls(v, out));
  }
}

const urls = new Set();

collectUrls(JSON.parse(fs.readFileSync('content.json', 'utf8')), urls);

fs.readFileSync('_redirects', 'utf8').split('\n').forEach((line) => {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) return;
  trimmed.split(/\s+/).forEach((token) => {
    if (token.startsWith('https://')) urls.add(token);
  });
});

/* SoundCloud and ditto.fm sometimes reject HEAD, so fall back to GET.
   A browser-ish User-Agent avoids trivial bot blocks. */
const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (compatible; takura-site-link-check)',
  'Accept': 'text/html,application/xhtml+xml,*/*',
};

async function check(url) {
  for (const method of ['HEAD', 'GET']) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 20000);
    try {
      const res = await fetch(url, {
        method,
        headers: HEADERS,
        redirect: 'follow',
        signal: controller.signal,
      });
      if (res.ok) return { url, ok: true, status: res.status };
      if (method === 'GET') return { url, ok: false, status: res.status };
      /* HEAD not ok: retry with GET */
    } catch (e) {
      if (method === 'GET') return { url, ok: false, error: e.message };
    } finally {
      clearTimeout(timer);
    }
  }
  return { url, ok: false, error: 'unreachable' };
}

(async () => {
  const list = [...urls].sort();
  console.log('Checking ' + list.length + ' unique URL(s)...');
  const results = await Promise.all(list.map(check));
  let failed = 0;
  for (const r of results) {
    if (r.ok) {
      console.log('  OK   ' + r.url);
    } else {
      failed++;
      console.error('  DEAD ' + r.url + ' (' + (r.status || r.error) + ')');
    }
  }
  if (failed > 0) {
    console.error('FAIL: ' + failed + ' dead link(s)');
    process.exit(1);
  }
  console.log('OK: all ' + list.length + ' link(s) are live');
})();
