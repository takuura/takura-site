/* Schema validator for content.json.
   Run locally with: node validate-content.js
   Also run automatically by the GitHub Action on every commit touching content.json. */
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

const SC_PREFIXES = ['https://soundcloud.com/takuura', 'https://on.soundcloud.com/'];
const isSc = (u) => typeof u === 'string' && SC_PREFIXES.some((p) => u.startsWith(p));

if (typeof c.updated_at !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(c.updated_at)) {
  fail('updated_at must be a YYYY-MM-DD string');
}
if (c.latest_mix_url !== '' && !isSc(c.latest_mix_url)) {
  fail('latest_mix_url must be empty or a soundcloud.com/takuura URL (watch for the ghost profile)');
}
if (c.weekly_playlist_url !== '' && !isSc(c.weekly_playlist_url)) {
  fail('weekly_playlist_url must be empty or a soundcloud.com/takuura URL');
}
if (!Array.isArray(c.music)) fail('music must be an array');
if (!Array.isArray(c.dates)) fail('dates must be an array');

c.music.forEach((m, i) => {
  if (!m.title) fail('music[' + i + '] missing title');
  if (!isSc(m.soundcloud_url)) fail('music[' + i + '] soundcloud_url must point to soundcloud.com/takuura');
});

c.dates.forEach((g, i) => {
  if (!g.date_line1) fail('dates[' + i + '] missing date_line1');
  if (!g.venue) fail('dates[' + i + '] missing venue');
  if (!g.event) fail('dates[' + i + '] missing event');
});

console.log('OK: content.json is valid. ' + c.music.length + ' mix(es), ' + c.dates.length + ' date(s), updated ' + c.updated_at);
