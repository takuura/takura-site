# takura-site

TAKüRA's public DJ site (takura.live). Static single-file site, no build step.

## Architecture
- `index.html` is self-contained (inline CSS/JS/base64 images) and holds the
  FALLBACK content. `content-loader.js` hydrates music/releases/dates from
  `content.json` at runtime; if content.json is missing or invalid the
  hardcoded HTML stays visible. Never let the two drift far apart.
- `content.json` is the editing surface for mixes, releases, and dates.
  Array order = display order. `updated_at` must be YYYY-MM-DD.
- All SoundCloud URLs must be full `https://soundcloud.com/takuura/...`
  URLs. Shortlinks (on.soundcloud.com) are banned: there is a ghost
  profile risk. Playlist slugs spelled "takuera" are intentional.
- Run `node validate-content.js` after ANY change to content.json.
  CI (validate-content.yml) runs it too and will fail the push.

## Deploy
- Netlify project "takura", production = main branch, deploys to
  https://takura.live. Merging to main deploys automatically.
  `_headers` keeps content.json on a 60s cache; `_redirects` holds
  short URLs used on printed/social media, do not delete old
  redirect slugs.

## Editing rules
- Content updates (new mix, gig, release) belong in content.json, not
  index.html. When a release supersedes the "latest", also update the
  meta description and About copy in index.html (they are hardcoded).
- Brand: TAKüRA (u-umlaut), label Inner Moto, contact
  bookings@takura.live. Credential: WSET Level 2 Award in Wines,
  never write Level 3.
- Never commit secrets or .env files; this repo is public.
- Keep changes small and human-reviewable; this site is a brand asset
  for the 2028 residency goal.
