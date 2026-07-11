/* Drift check: content.json, the fallback HTML in index.html, and the
   meta description must all agree on the latest release title.
   Run locally with: node check-drift.js
   Also run by the GitHub Action (check-drift.yml) on every push touching
   content.json or index.html. releases[0] in content.json is canonical. */
const fs = require('fs');

function fail(msg) {
  console.error('FAIL: ' + msg);
  process.exit(1);
}

function decodeEntities(s) {
  return s
    .replace(/&uuml;/g, 'ü')
    .replace(/&middot;/g, '·')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
}

const content = JSON.parse(fs.readFileSync('content.json', 'utf8'));
const html = fs.readFileSync('index.html', 'utf8');

if (!Array.isArray(content.releases) || content.releases.length === 0) {
  fail('content.json has no releases');
}
const latest = content.releases[0].title;
if (typeof latest !== 'string' || latest.length === 0) {
  fail('content.json releases[0] has no title');
}

const metaMatch = html.match(/<meta name="description" content="([^"]*)"/);
if (!metaMatch) fail('index.html has no meta description');
const meta = decodeEntities(metaMatch[1]);
if (!meta.includes(latest)) {
  fail('meta description does not mention latest release "' + latest + '": ' + meta);
}

const fallbackMatch = html.match(/<p class="release-title">([^<]*)<\/p>/);
if (!fallbackMatch) fail('index.html fallback HTML has no release-title');
const fallbackTitle = decodeEntities(fallbackMatch[1]);
if (fallbackTitle !== latest) {
  fail('fallback HTML first release is "' + fallbackTitle + '" but content.json latest is "' + latest + '"');
}

console.log('OK: latest release "' + latest + '" agrees across content.json, fallback HTML, and meta description');
