/* Engineering Log — self-contained (IIFE). Only touches #engineering-log and its own #el-lightbox. */
(function () {
  'use strict';

  /* ================================================================
     CONTENT — edit ONLY this array to manage entries.
     All paths are RELATIVE (no leading "/") so they work at /mee/.

     ADD an entry:       copy an object below, give it a unique `id`.
     ADD screenshots:    images: [{ src:'assets/engineering-log/images/fix-1.png', alt:'Describe the image' }, ...]
     ADD a video:        video: { src:'assets/engineering-log/videos/demo.mp4', poster:'assets/engineering-log/images/demo.jpg' }
                         (or an external video: video: { url:'https://youtu.be/...' } — large files should go here)
     ATTACH documents:   documents: [{ name:'Query script', path:'assets/engineering-log/documents/query.sql' }]
                         (type is taken from the extension; use `url:` instead of `path:` for external files)
     ADD GitHub link:    sourceUrl: 'https://github.com/rayan-isdb/your-repo'
     CHANGE category:    category: one of CATEGORIES below
     REMOVE an entry:    delete its { ... } object (or comment it out)
     Optional fields: thumbnail, images, video, documents, sourceUrl, result, date, technologies.
     ================================================================ */
  var CATEGORIES = ['All', 'Oracle SQL', 'PL/SQL', 'Oracle APEX', 'Frontend', 'Automation', 'API Integration', 'Database', 'Other'];

 
var engineeringLogEntries = [
  {
    id: 'job-hunter-workflow',
    title: 'Personal AI Job Hunter',
    description: 'An automated job-hunting workflow designed to collect relevant job opportunities, evaluate matches, reduce duplicate listings, and deliver notifications.',
    category: 'Automation',
    technologies: ['n8n', 'AI', 'Oracle Database', 'Telegram'],
    date: '2026-10',
    result: 'Workflow demonstration: job discovery and automated notifications.',
    video: {
      src: 'assets/engineering-log/videos/job-hunter.mp4'
    }
  }
];


  /* ================= rendering & interaction ================= */
  var root = document.getElementById('engineering-log');
  if (!root) return;
  var filtersEl = root.querySelector('.el-filters');
  var gridEl = root.querySelector('.el-grid');
  var emptyEl = root.querySelector('.el-empty');
  var active = 'All';
  var gallery = [], gi = 0, lastFocus = null, box = null;

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
  // Allow only http(s), mailto-free relative paths; rejects javascript:, data:, etc.
  function safeUrl(u) {
    if (typeof u !== 'string' || !u) return null;
    if (/^[a-z][a-z0-9+.-]*:/i.test(u)) return /^https?:/i.test(u) ? u : null;
    return u.replace(/^\/+/, ''); // force relative so GitHub project-site paths work
  }
  function isExternal(u) { return /^https?:/i.test(u); }
  function ext(u) { var m = /\.([a-z0-9]+)(?:[?#].*)?$/i.exec(u); return m ? m[1].toUpperCase() : 'LINK'; }

  function imgWithFallback(src, alt) {
    var s = safeUrl(src), i = el('img');
    i.alt = alt || '';
    i.loading = 'lazy';
    i.decoding = 'async';
    i.addEventListener('error', function () {
      if (i.parentNode) i.parentNode.replaceChild(el('div', 'el-fallback', 'Preview unavailable'), i);
    });
    if (s) i.src = s;
    return i;
  }

  function buildGallery(e) {
    var g = [];
    (e.images || []).forEach(function (im) {
      var s = safeUrl(im && im.src);
      if (s) g.push({ type: 'image', src: s, alt: im.alt || e.title });
    });
    if (e.video && e.video.src && safeUrl(e.video.src)) {
      g.push({ type: 'video', src: safeUrl(e.video.src), poster: safeUrl(e.video.poster), alt: e.title + ' (video)' });
    }
    return g;
  }

  function card(e) {
    var c = el('article', 'el-card');
    var g = buildGallery(e);
    var thumbSrc = e.thumbnail || (e.images && e.images[0] && e.images[0].src) || (e.video && e.video.poster);

    if (g.length) {
      var b = el('button', 'el-thumb');
      b.type = 'button';
      b.setAttribute('aria-label', 'Open preview: ' + e.title);
      b.appendChild(thumbSrc ? imgWithFallback(thumbSrc, e.title) : el('div', 'el-fallback', 'Open video'));
      var hasVideo = g[g.length - 1].type === 'video';
      var n = g.length;
      b.appendChild(el('span', 'el-badge', hasVideo ? '▶ VIDEO' + (n > 1 ? ' + ' + (n - 1) + ' IMG' : '') : n + (n > 1 ? ' IMAGES' : ' IMAGE')));
      b.addEventListener('click', function () { openBox(g, 0, b); });
      c.appendChild(b);
    } else if (thumbSrc) {
      var t = el('div', 'el-thumb'); t.appendChild(imgWithFallback(thumbSrc, e.title)); c.appendChild(t);
    }

    var body = el('div', 'el-body');
    var meta = el('div', 'el-meta');
    meta.appendChild(el('span', 'el-cat', e.category || 'Other'));
    if (e.date) meta.appendChild(el('span', 'el-date', e.date));
    body.appendChild(meta);
    body.appendChild(el('h3', 'el-title', e.title || 'Untitled'));
    if (e.description) body.appendChild(el('p', 'el-desc', e.description));
    if (e.result) body.appendChild(el('p', 'el-result', e.result));
    if (e.technologies && e.technologies.length) {
      var tg = el('div', 'el-tags');
      e.technologies.forEach(function (x) { tg.appendChild(el('span', 'el-tag', x)); });
      body.appendChild(tg);
    }

    var list = el('ul', 'el-docs');
    if (e.video && e.video.url && safeUrl(e.video.url)) list.appendChild(linkRow('VIDEO', 'Watch video', safeUrl(e.video.url), false));
    if (e.sourceUrl && safeUrl(e.sourceUrl)) list.appendChild(linkRow('CODE', 'Source code', safeUrl(e.sourceUrl), false));
    (e.documents || []).forEach(function (d) {
      var u = safeUrl(d && (d.path || d.url));
      if (u) list.appendChild(linkRow(ext(u), d.name || u.split('/').pop(), u, true));
    });
    if (list.children.length) body.appendChild(list);
    c.appendChild(body);
    return c;
  }

  function linkRow(type, name, url, downloadable) {
    var li = el('li', 'el-doc');
    li.appendChild(el('span', 'el-ext', type));
    li.appendChild(el('span', null, name));
    var open = el('a', 'el-link', 'Open'); open.href = url; open.target = '_blank'; open.rel = 'noopener noreferrer';
    li.appendChild(open);
    if (downloadable) {
      var dl = el('a', 'el-link', 'Download'); dl.href = url; dl.setAttribute('download', '');
      li.appendChild(dl);
      if (!isExternal(url)) { // friendly message if the file hasn't been uploaded yet
        [open, dl].forEach(function (a) {
          a.addEventListener('click', function (ev) {
            if (!window.fetch) return;
            ev.preventDefault();
            fetch(url, { method: 'HEAD' }).then(function (r) {
              if (r.ok) { if (a === open) window.open(url, '_blank', 'noopener'); else { var t = document.createElement('a'); t.href = url; t.download = ''; document.body.appendChild(t); t.click(); t.remove(); } }
              else note(li);
            }).catch(function () { window.open(url, '_blank', 'noopener'); });
          });
        });
      }
    }
    return li;
  }
  function note(li) {
    if (!li.querySelector('.el-note')) li.appendChild(el('span', 'el-note', 'File not found'));
  }

  function render() {
    gridEl.textContent = '';
    var shown = engineeringLogEntries.filter(function (e) { return active === 'All' || e.category === active; });
    shown.forEach(function (e) { gridEl.appendChild(card(e)); });
    emptyEl.hidden = shown.length > 0;
    emptyEl.textContent = engineeringLogEntries.length ? 'No entries in this category yet.' : 'No entries yet.';
  }

  function buildFilters() {
    CATEGORIES.forEach(function (cat) {
      var b = el('button', 'el-filter', cat);
      b.type = 'button';
      b.setAttribute('aria-pressed', cat === active ? 'true' : 'false');
      b.addEventListener('click', function () {
        active = cat;
        Array.prototype.forEach.call(filtersEl.children, function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
        render();
      });
      filtersEl.appendChild(b);
    });
  }

  /* ---------- lightbox ---------- */
  function ensureBox() {
    if (box) return;
    box = el('div'); box.id = 'el-lightbox';
    box.setAttribute('role', 'dialog'); box.setAttribute('aria-modal', 'true'); box.setAttribute('aria-label', 'Media preview');
    box.innerHTML = '<button type="button" class="el-ctl el-close" aria-label="Close preview">&times;</button>' +
      '<button type="button" class="el-ctl el-prev" aria-label="Previous">&#8249;</button>' +
      '<div class="el-stage"></div>' +
      '<button type="button" class="el-ctl el-next" aria-label="Next">&#8250;</button>';
    document.body.appendChild(box);
    box.addEventListener('click', function (ev) { if (ev.target === box) closeBox(); });
    box.querySelector('.el-close').addEventListener('click', closeBox);
    box.querySelector('.el-prev').addEventListener('click', function () { step(-1); });
    box.querySelector('.el-next').addEventListener('click', function () { step(1); });
  }
  function show() {
    var it = gallery[gi], stage = box.querySelector('.el-stage');
    stage.textContent = '';
    var m;
    if (it.type === 'video') {
      m = el('video'); m.controls = true; m.preload = 'metadata'; m.playsInline = true; // no autoplay
      if (it.poster) m.poster = it.poster;
      m.src = it.src;
    } else {
      m = el('img'); m.alt = it.alt || '';
      m.addEventListener('error', function () { stage.replaceChild(el('div', 'el-cap', 'Image could not be loaded'), m); });
      m.src = it.src;
    }
    stage.appendChild(m);
    stage.appendChild(el('div', 'el-cap', (it.alt || '') + (gallery.length > 1 ? '  (' + (gi + 1) + '/' + gallery.length + ')' : '')));
    var multi = gallery.length > 1;
    box.querySelector('.el-prev').hidden = !multi;
    box.querySelector('.el-next').hidden = !multi;
  }
  function step(d) { gi = (gi + d + gallery.length) % gallery.length; show(); }
  function onKey(ev) {
    if (ev.key === 'Escape') closeBox();
    else if (ev.key === 'ArrowRight' && gallery.length > 1) step(1);
    else if (ev.key === 'ArrowLeft' && gallery.length > 1) step(-1);
    else if (ev.key === 'Tab') { // keep focus inside dialog
      var f = Array.prototype.filter.call(box.querySelectorAll('button,video'), function (x) { return !x.hidden; });
      if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (ev.shiftKey && document.activeElement === first) { ev.preventDefault(); last.focus(); }
      else if (!ev.shiftKey && document.activeElement === last) { ev.preventDefault(); first.focus(); }
    }
  }
  function openBox(g, i, trigger) {
    ensureBox();
    gallery = g; gi = i; lastFocus = trigger;
    show();
    box.classList.add('el-open');
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKey);
    box.querySelector('.el-close').focus();
  }
  function closeBox() {
    if (!box) return;
    box.classList.remove('el-open');
    var v = box.querySelector('video'); if (v) v.pause();
    box.querySelector('.el-stage').textContent = ''; // stops any media download
    document.body.style.overflow = '';
    document.removeEventListener('keydown', onKey);
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  buildFilters();
  render();
})();
