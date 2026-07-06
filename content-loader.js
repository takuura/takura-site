/* TAKüRA content loader
   Renders the Music mixes and Dates sections from /content.json.
   Fails safe by design: if content.json is missing, invalid, or fails
   validation, this script does nothing and the hardcoded HTML already
   in index.html remains visible. Malformed JSON never blanks the page. */
(function () {
  'use strict';

  var SC_PREFIXES = [
    'https://soundcloud.com/takuura',
    'https://on.soundcloud.com/'
  ];

  function isSoundCloudUrl(u) {
    return typeof u === 'string' && SC_PREFIXES.some(function (p) {
      return u.indexOf(p) === 0;
    });
  }

  function esc(s) {
    var d = document.createElement('div');
    d.appendChild(document.createTextNode(String(s)));
    return d.innerHTML;
  }

  function scEmbed(url, height) {
    return '<iframe title="SoundCloud player" src="https://w.soundcloud.com/player/?url=' +
      encodeURIComponent(url) +
      '&color=%23c9a84c&auto_play=false&hide_related=true&show_comments=false' +
      '&show_user=false&show_reposts=false&show_teaser=false"' +
      ' height="' + height + '" style="width:100%;border:none;" loading="lazy"></iframe>';
  }

  function validMix(m) {
    return m && typeof m.title === 'string' && m.title.length > 0 &&
      isSoundCloudUrl(m.soundcloud_url);
  }

  function validGig(g) {
    return g && typeof g.venue === 'string' && g.venue.length > 0 &&
      typeof g.event === 'string' && g.event.length > 0 &&
      typeof g.date_line1 === 'string' && g.date_line1.length > 0;
  }

  fetch('/content.json?v=' + Date.now(), { cache: 'no-store' })
    .then(function (r) {
      if (!r.ok) { throw new Error('HTTP ' + r.status); }
      return r.json();
    })
    .then(function (c) {
      if (!c || !Array.isArray(c.music) || !Array.isArray(c.dates)) {
        throw new Error('content.json has wrong shape');
      }
      var mixes = c.music.filter(validMix);
      var gigs = c.dates.filter(validGig);
      if (c.music.length !== mixes.length || c.dates.length !== gigs.length) {
        throw new Error('validation failed: one or more items missing required fields');
      }
      if (gigs.length === 0) {
        throw new Error('no valid dates; keeping built-in content');
      }

      /* MUSIC: rebuild the mixes grid */
      var grid = document.querySelector('#music .music-grid');
      if (grid) {
        var html = '';
        if (isSoundCloudUrl(c.latest_mix_url)) {
          html += '<div class="mix-card reveal visible">' +
            '<p class="mix-label">Latest Mix · Afro House</p>' +
            scEmbed(c.latest_mix_url, 166) + '</div>';
        }
        mixes.forEach(function (m) {
          html += '<div class="mix-card reveal visible">' +
            '<p class="mix-label">' + esc(m.label || 'Mix · Afro House') + '</p>' +
            '<p class="mix-title">' + esc(m.title) + '</p>' +
            scEmbed(m.soundcloud_url, 80) + '</div>';
        });
        if (isSoundCloudUrl(c.weekly_playlist_url)) {
          html += '<div class="mix-card reveal visible">' +
            '<p class="mix-label">' + esc(c.weekly_playlist_label || 'Weekly Mixes · Curated') + '</p>' +
            scEmbed(c.weekly_playlist_url, 300) + '</div>';
        }
        if (html) { grid.innerHTML = html; }
      }

      /* DATES: rebuild the gig list */
      var list = document.querySelector('#dates .gig-list');
      if (list) {
        var dh = '';
        gigs.forEach(function (g) {
          var pastDim = g.past ? ' style="opacity:0.7;"' : '';
          var pastGold = g.past ? ' style="color:var(--gold);font-style:italic;"' : '';
          dh += '<div class="gig reveal visible"' + pastDim + '>' +
            '<div class="gig-date"' + pastGold + '>' + esc(g.date_line1) +
            (g.date_line2 ? '<br>' + esc(g.date_line2) : '') + '</div>' +
            '<div class="gig-info">' +
            '<p class="gig-venue">' + esc(g.venue) + '</p>' +
            '<p class="gig-event">' + esc(g.event) +
            (g.highlight ? ' · <span style="color:var(--gold);">' + esc(g.highlight) + '</span>' : '') +
            '</p></div>' +
            '<div class="gig-detail">' +
            (g.time ? '<p class="gig-time"' + pastGold + '>' + esc(g.time) + '</p>' : '') +
            (g.note ? '<p class="gig-cover">' + esc(g.note) + '</p>' : '') +
            '</div></div>';
        });
        if (c.updated_at) {
          dh += '<p style="font-size:12px;opacity:0.5;margin-top:16px;">Last updated: ' +
            esc(c.updated_at) + '</p>';
        }
        list.innerHTML = dh;
      }
    })
    .catch(function (e) {
      /* Fail safe: built-in hardcoded content stays visible. */
      console.warn('content.json not applied, using built-in content:', e.message);
    });
})();
