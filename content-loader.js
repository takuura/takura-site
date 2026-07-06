/* TAKüRA content loader
   Renders the Music mixes and Dates sections from /content.json.
   Fails safe by design: if content.json is missing, invalid, or fails
   validation, this script does nothing and the hardcoded HTML already
   in index.html remains visible. Malformed JSON never blanks the page.
   Schema notes: array order in content.json is canonical display order.
   Required: updated_at (YYYY-MM-DD), latest_mix_url, weekly_playlist_url,
   music[].title, music[].soundcloud_url, dates[].date_line1, dates[].venue,
   dates[].event. Optional: label, date_line2, time, note, highlight, past,
   link_url (https, renders the venue as a link). */
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
      if (!c || !Array.isArray(c.music) || !Array.isArray(c.dates)) {
        throw new Error('content.json has wrong shape');
      }
      if (typeof c.updated_at !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(c.updated_at)) {
        throw new Error('updated_at missing or not YYYY-MM-DD');
      }
      if (!isTakuraScUrl(c.latest_mix_url)) {
        throw new Error('latest_mix_url missing or not a soundcloud.com/takuura URL');
      }
      if (!isTakuraScUrl(c.weekly_playlist_url)) {
        throw new Error('weekly_playlist_url missing or not a soundcloud.com/takuura URL');
      }
      var mixes = c.music.filter(validMix);
      var gigs = c.dates.filter(validGig);
      if (c.music.length !== mixes.length || c.dates.length !== gigs.length) {
        throw new Error('validation failed: one or more items missing required fields');
      }
      if (gigs.length === 0) {
        throw new Error('no valid dates; keeping built-in content');
      }

      /* MUSIC: rebuild the mixes grid. Array order is display order. */
      var grid = document.querySelector('#music .music-grid');
      if (grid) {
        var html = '<div class="mix-card reveal visible">' +
          '<p class="mix-label">Latest Mix · Afro House</p>' +
          scEmbed(c.latest_mix_url, 166, 'Latest mix') + '</div>';
        mixes.forEach(function (m) {
          html += '<div class="mix-card reveal visible">' +
            '<p class="mix-label">' + esc(m.label || 'Mix · Afro House') + '</p>' +
            '<p class="mix-title">' + esc(m.title) + '</p>' +
            scEmbed(m.soundcloud_url, 80, m.title) + '</div>';
        });
        html += '<div class="mix-card reveal visible">' +
          '<p class="mix-label">' + esc(c.weekly_playlist_label || 'Weekly Mixes · Curated') + '</p>' +
          scEmbed(c.weekly_playlist_url, 300, c.weekly_playlist_label || 'Weekly mixes playlist') + '</div>';
        grid.innerHTML = html;
      }

      /* DATES: rebuild the gig list. Array order is display order. */
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
