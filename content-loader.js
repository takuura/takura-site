/* TAKüRA content loader v3
   Renders THE RADAR rail, Latest Mixes, Releases, and Dates from /content.json.
   Fails safe by design: if content.json is missing, invalid, or fails
   validation, this script does nothing and the hardcoded HTML already
   in index.html remains visible. Malformed JSON never blanks the page.
   Schema notes: array order in content.json is canonical display order.
   The curated THE RADAR playlist is the canonical latest-mix surface; its
   top slot is owner-controlled via playlist order on SoundCloud.
   Required: updated_at (YYYY-MM-DD), weekly_playlist_url, music[].title,
   music[].soundcloud_url, releases[].title, dates[].date_line1,
   dates[].venue, dates[].event. Optional: label, weekly_playlist_label,
   date_line2, time, note, highlight, past, link_url (https), releases[]
   eyebrow, label_line, description, links[] ({text, url https}). */
(function () {
  'use strict';

  /* Canonical SoundCloud check via URL parsing: https, soundcloud.com host,
     path exactly /takuura or under /takuura/. Shortlinks are not accepted. */
  function isTakuraScUrl(u) {
    if (typeof u !== 'string') { return false; }
    try {
      var p = new URL(u);
      return p.protocol === 'https:' && p.hostname === 'soundcloud.com' &&
        (p.pathname === '/takuura' || p.pathname.indexOf('/takuura/') === 0);
    } catch (e) { return false; }
  }

  function isHttpsUrl(u) {
    if (typeof u !== 'string') { return false; }
    try { return new URL(u).protocol === 'https:'; } catch (e) { return false; }
  }

  function esc(s) {
    var d = document.createElement('div');
    d.appendChild(document.createTextNode(String(s)));
    return d.innerHTML;
  }

  function scEmbed(url, height, titleText) {
    return '<iframe title="' + esc('SoundCloud player: ' + titleText) + '"' +
      ' src="https://w.soundcloud.com/player/?url=' + encodeURIComponent(url) +
      '&color=%23c9a84c&auto_play=false&hide_related=true&show_comments=false' +
      '&show_user=false&show_reposts=false&show_teaser=false"' +
      ' height="' + height + '" style="width:100%;border:none;"' +
      ' loading="lazy" allow="autoplay"></iframe>';
  }

  function validMix(m) {
    return !!(m && typeof m.title === 'string' && m.title.length > 0 &&
      isTakuraScUrl(m.soundcloud_url));
  }

  function validRelease(rel) {
    if (!rel || typeof rel.title !== 'string' || rel.title.length === 0) { return false; }
    if (rel.links !== undefined) {
      if (!Array.isArray(rel.links)) { return false; }
      for (var i = 0; i < rel.links.length; i++) {
        var l = rel.links[i];
        if (!l || typeof l.text !== 'string' || !l.text || !isHttpsUrl(l.url)) { return false; }
      }
    }
    return true;
  }

  function validGig(g) {
    if (!g || typeof g.venue !== 'string' || g.venue.length === 0 ||
      typeof g.event !== 'string' || g.event.length === 0 ||
      typeof g.date_line1 !== 'string' || g.date_line1.length === 0) {
      return false;
    }
    if (g.link_url !== undefined && !isHttpsUrl(g.link_url)) { return false; }
    return true;
  }

  /* Freshness is bounded by Cache-Control: max-age=60 set in _headers,
     so plain fetch keeps caching useful while staying at most 60s stale. */
  fetch('/content.json')
    .then(function (r) {
      if (!r.ok) { throw new Error('HTTP ' + r.status); }
      return r.json();
    })
    .then(function (c) {
      if (!c || !Array.isArray(c.music) || !Array.isArray(c.dates) || !Array.isArray(c.releases)) {
        throw new Error('content.json has wrong shape');
      }
      if (typeof c.updated_at !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(c.updated_at)) {
        throw new Error('updated_at missing or not YYYY-MM-DD');
      }
      if (!isTakuraScUrl(c.weekly_playlist_url)) {
        throw new Error('weekly_playlist_url missing or not a soundcloud.com/takuura URL');
      }
      var mixes = c.music.filter(validMix);
      var releases = c.releases.filter(validRelease);
      var gigs = c.dates.filter(validGig);
      if (c.music.length !== mixes.length || c.dates.length !== gigs.length ||
        c.releases.length !== releases.length) {
        throw new Error('validation failed: one or more items missing required fields');
      }
      if (gigs.length === 0) {
        throw new Error('no valid dates; keeping built-in content');
      }

      /* THE RADAR: full-width curated playlist rail, newest episode on top. */
      var radar = document.querySelector('#music .radar-rail');
      if (radar) {
        var radarLabel = c.weekly_playlist_label || 'THE RADAR · Weekly Radio';
        radar.innerHTML = '<div class="mix-card reveal visible">' +
          '<p class="mix-label">' + esc(radarLabel) + '</p>' +
          scEmbed(c.weekly_playlist_url, 450, radarLabel) + '</div>';
      }

      /* LATEST MIXES: standalone mixes, array order is display order. */
      var grid = document.querySelector('#music .music-grid');
      if (grid) {
        var html = '';
        mixes.forEach(function (m) {
          html += '<div class="mix-card reveal visible">' +
            '<p class="mix-label">' + esc(m.label || 'Mix · Afro House') + '</p>' +
            '<p class="mix-title">' + esc(m.title) + '</p>' +
            scEmbed(m.soundcloud_url, 80, m.title) + '</div>';
        });
        if (html) { grid.innerHTML = html; }
      }

      /* RELEASES */
      var relWrap = document.querySelector('#music .releases-wrap');
      if (relWrap && releases.length > 0) {
        var rh = '<p class="mix-label reveal visible">Releases</p>';
        releases.forEach(function (rel) {
          var links = '';
          (rel.links || []).forEach(function (l) {
            links += '<a href="' + esc(l.url) + '" target="_blank" rel="noopener" class="listen-btn">' + esc(l.text) + '</a>';
          });
          rh += '<div class="release-card reveal visible" style="margin-top:16px;">' +
            '<div class="release-card-inner"><div>' +
            (rel.eyebrow ? '<p class="single-eyebrow">' + esc(rel.eyebrow) + '</p>' : '') +
            '<p class="release-title">' + esc(rel.title) + '</p>' +
            (rel.label_line ? '<p class="release-label">' + esc(rel.label_line) + '</p>' : '') +
            (rel.description ? '<p class="release-desc">' + esc(rel.description) + '</p>' : '') +
            '</div>' +
            (links ? '<div class="listen-links">' + links + '</div>' : '') +
            '</div></div>';
        });
        relWrap.innerHTML = rh;
      }

      /* DATES: array order is display order. */
      var list = document.querySelector('#dates .gig-list');
      if (list) {
        var dh = '';
        gigs.forEach(function (g) {
          var pastDim = g.past ? ' style="opacity:0.7;"' : '';
          var pastGold = g.past ? ' style="color:var(--gold);font-style:italic;"' : '';
          var venueHtml = g.link_url
            ? '<a href="' + esc(g.link_url) + '" target="_blank" rel="noopener">' + esc(g.venue) + '</a>'
            : esc(g.venue);
          dh += '<div class="gig reveal visible"' + pastDim + '>' +
            '<div class="gig-date"' + pastGold + '>' + esc(g.date_line1) +
            (g.date_line2 ? '<br>' + esc(g.date_line2) : '') + '</div>' +
            '<div class="gig-info">' +
            '<p class="gig-venue">' + venueHtml + '</p>' +
            '<p class="gig-event">' + esc(g.event) +
            (g.highlight ? ' · <span style="color:var(--gold);">' + esc(g.highlight) + '</span>' : '') +
            '</p></div>' +
            '<div class="gig-detail">' +
            (g.time ? '<p class="gig-time"' + pastGold + '>' + esc(g.time) + '</p>' : '') +
            (g.note ? '<p class="gig-cover">' + esc(g.note) + '</p>' : '') +
            '</div></div>';
        });
        dh += '<p style="font-size:12px;opacity:0.5;margin-top:16px;">Last updated: ' +
          esc(c.updated_at) + '</p>';
        list.innerHTML = dh;
      }
      document.body.setAttribute('data-content-source', 'json');
    })
    .catch(function (e) {
      /* Fail safe: built-in hardcoded content stays visible.
         data-content-source=fallback is the machine-checkable indicator. */
      document.body.setAttribute('data-content-source', 'fallback');
      console.warn('content.json not applied, using built-in content:', e.message);
    });
})();
