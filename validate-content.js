/* Schema validator for content.json. Mirrors content-loader.js v3 exactly.
   Run locally with: node validate-content.js
   Also run automatically by the GitHub Action on every commit touching content.json.
   Array order in content.json is the canonical display order. The curated
   THE RADAR playlist is the canonical latest-mix surface. */
const fs = require('fs');

function fail(msg) {
  console.error('FAIL: ' + msg);
  process.exit(1);
}

let raw;
try {
  raw = fs.readFileSync('content.json', 'utf8');
} catch (e) {
  fail('content.json not found: ' + e.message);
}

let c;
try {
  c = JSON.parse(raw);
} catch (e) {
  fail('content.json is not valid JSON: ' + e.message);
}

function isTakuraScUrl(u) {
  if (typeof u !== 'string') return false;
  try {
    const p = new URL(u);
    return p.protocol === 'https:' && p.hostname === 'soundcloud.com' &&
      (p.pathname === '/takuura' || p.pathname.startsWith('/takuura/'));
  } catch (e) { return false; }
}

function isHttpsUrl(u) {
  if (typeof u !== 'string') return false;
  try { return new URL(u).protocol === 'https:'; } catch (e) { return false; }
}

if (typeof c.updated_at !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(c.updated_at)) {
  fail('updated_at is required and must be a YYYY-MM-DD string');
}
if (!isTakuraScUrl(c.weekly_playlist_url)) {
  fail('weekly_playlist_url is required and must be a full https://soundcloud.com/takuura/sets/... URL (no shortlinks, watch for the ghost profile)');
}
if (c.edits_playlist_url !== undefined && c.edits_playlist_url !== '' && !isTakuraScUrl(c.edits_playlist_url)) {
  fail('edits_playlist_url is optional but must be a full https://soundcloud.com/takuura/sets/... URL when present');
}
if (!Array.isArray(c.music)) fail('music must be an array');
if (!Array.isArray(c.releases)) fail('releases must be an array');
if (!Array.isArray(c.dates)) fail('dates must be an array');
if (c.dates.length === 0) fail('dates must have at least one entry');

c.music.forEach((m, i) => {
  if (!m.title) fail('music[' + i + '] missing title');
  if (!isTakuraScUrl(m.soundcloud_url)) fail('music[' + i + '] soundcloud_url must be a full https://soundcloud.com/takuura/... URL');
});

c.releases.forEach((rel, i) => {
  if (!rel.title) fail('releases[' + i + '] missing title');
  if (rel.links !== undefined) {
    if (!Array.isArray(rel.links)) fail('releases[' + i + '] links must be an array when present');
    rel.links.forEach((l, j) => {
      if (!l || !l.text) fail('releases[' + i + '] links[' + j + '] missing text');
      if (!isHttpsUrl(l.url)) fail('releases[' + i + '] links[' + j + '] url must be a valid https URL');
    });
  }
});

c.dates.forEach((g, i) => {
  if (!g.date_line1) fail('dates[' + i + '] missing date_line1');
  if (!g.venue) fail('dates[' + i + '] missing venue');
  if (!g.event) fail('dates[' + i + '] missing event');
  if (g.link_url !== undefined && !isHttpsUrl(g.link_url)) fail('dates[' + i + '] link_url must be a valid https URL when present');
});

console.log('OK: content.json is valid. ' + c.music.length + ' mix(es), ' + c.releases.length + ' release(s), ' + c.dates.length + ' date(s), updated ' + c.updated_at);
