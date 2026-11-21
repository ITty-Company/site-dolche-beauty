/* Dolché Beauty — scroll film (video.currentTime scrub, chapters by film time), «uvgloed» lamp bloom overlay, «druppel» portal,
   D1 pan film, kleurwaaier, vormkiezer, laag-voor-laag schema, panorama, «lakstreek» page transition. No frameworks (Lenis only for inertia). */
(function () {
  'use strict';
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var mobile = matchMedia('(max-width:760px)').matches;
  var fine = matchMedia('(hover:hover) and (pointer:fine)').matches;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return [].slice.call((r || document).querySelectorAll(s)); };
  var clamp = function (x, a, b) { return x < a ? a : x > b ? b : x; };
  var ease = function (x) { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); };
  var pad = function (n) { return ('0' + n).slice(-2); };
  var dpr = Math.min(window.devicePixelRatio || 1, 2);
  var WA_CONFIRMED = false; // zodra Dolché Beauty WhatsApp bevestigt: true → label «nog te bevestigen» verdwijnt
  if (WA_CONFIRMED) $$('.wa-note').forEach(function (n) { n.remove(); });
  var root = document.documentElement;

  /* ---------- page transition «lakstreek»: one wide stroke of rose gel, then a clear top-coat stroke ---------- */
  var ORDER = ['index.html', 'behandelingen.html', 'afspraak.html', 'over-ons.html', 'contact.html'];
  var LBL = { 'index.html': 'home.', 'behandelingen.html': 'behandelingen.', 'afspraak.html': 'afspraak.', 'over-ons.html': 'over ons.', 'contact.html': 'contact.', '404.html': 'home.' };
  var lak = $('#lak');
  function fileOf(u) { var f = u.pathname.split('/').pop(); return f || 'index.html'; }
  if (lak) {
    var lblEl = $('.lbl', lak);
    if (window.__pl) lblEl.textContent = window.__pl;
    if (root.classList.contains('pl-closed')) {
      requestAnimationFrame(function () { requestAnimationFrame(function () {
        root.classList.remove('pl-noanim'); root.classList.add('pl-exit'); root.classList.remove('pl-closed');
        setTimeout(function () { root.classList.remove('pl-exit', 'pl-back'); }, 1400);
      }); });
    }
    addEventListener('pageshow', function (e) { if (e.persisted) root.classList.remove('pl-closed', 'pl-noanim', 'pl-back', 'pl-exit'); });
    document.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest('a[href]');
      if (!a || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0 || a.target || a.hasAttribute('download')) return;
      var u = new URL(a.href, location.href);
      if (u.origin !== location.origin || !/\.html$|\/$/.test(u.pathname)) return;
      var to = fileOf(u), from = fileOf(location);
      if (to === from && u.search === location.search) return;
      e.preventDefault();
      var back = ORDER.indexOf(to) < ORDER.indexOf(from);
      var lbl = LBL[to] || 'home.';
      lblEl.textContent = lbl;
      try { sessionStorage.setItem('lak', JSON.stringify({ l: lbl, b: back })); } catch (er) {}
      root.classList.add('pl-noanim'); root.classList.remove('pl-exit');
      root.classList.toggle('pl-back', back);
      requestAnimationFrame(function () {
        root.classList.remove('pl-noanim');
        requestAnimationFrame(function () { root.classList.add('pl-closed'); });
      });
      setTimeout(function () { location.href = u.href; }, reduce ? 220 : 720);
    });
  }

  /* ---------- header ---------- */
  var hd = $('.hd'), burger = $('.burger');
  if (burger) {
    burger.addEventListener('click', function () {
      var o = document.body.classList.toggle('menu-open'); burger.setAttribute('aria-expanded', o);
    });
    $$('.nav a').forEach(function (a) { a.addEventListener('click', function () { document.body.classList.remove('menu-open'); burger.setAttribute('aria-expanded', false); }); });
    addEventListener('keydown', function (e) { if (e.key === 'Escape') { document.body.classList.remove('menu-open'); burger.setAttribute('aria-expanded', false); } });
  }

  /* autoplay loops (afspraak / contact hero + finale): nothing with reduced motion */
  $$('video[data-auto]').forEach(function (v) {
    if (reduce) return;
    var go = function () {
      if (v.src) return;
      v.src = v.dataset.src; v.muted = true; v.loop = true;
      v.addEventListener('playing', function () { v.classList.add('on'); });
      var p = v.play(); if (p && p.catch) p.catch(function () {});
    };
    var ob = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (e.isIntersecting) { go(); if (v.paused) { var p = v.play(); if (p && p.catch) p.catch(function () {}); } }
        else if (v.src) v.pause();
      });
    }, { rootMargin: '200px' });
    ob.observe(v);
  });

  function loadBlob(url, onProgress) {
    return fetch(url).then(function (r) {
      if (!r.ok) throw new Error('http ' + r.status);
      var total = +r.headers.get('content-length') || 0;
      if (!r.body || !total || !window.ReadableStream) return r.blob();
      var rd = r.body.getReader(), got = 0, parts = [];
      return (function pump() {
        return rd.read().then(function (x) {
          if (x.done) return new Blob(parts, { type: 'video/mp4' });
          parts.push(x.value); got += x.value.length; onProgress && onProgress(got / total);
          return pump();
        });
      })();
    }).then(function (b) { return URL.createObjectURL(b); });
  }

  /* ---------- scroll films (video scrub) + pan film (D1) ---------- */
  var scrubs = $$('.film,.pan').map(function (film) {
    if (reduce) { film.classList.add('still'); return null; }
    var isPan = film.classList.contains('pan');
    var CH = JSON.parse($('script[type="application/json"]', film).textContent);
    if (mobile) CH.forEach(function (c) { /* mobile film is re-framed: use its own frame fractions */
      ['o', 'g', 'cz', 'rp', 'lp', 'pt'].forEach(function (k) { if (c[k + 'm']) c[k] = c[k + 'm']; });
    });
    var N = CH.length, hero = $('.fhero,.phead', film);
    var rests = (hero ? [{ at: 0, ch: -1, c: .5, z: 1 }] : []).concat(CH.map(function (c, i) { return { at: c.at || 0, ch: i, c: c.c, z: mobile && c.zm ? c.zm : c.z }; }));
    var M = rests.length, HOLD = isPan ? .5 : .7;
    var stage = $('.stage', film), V = $('video', film), IMG = $('img.flat', film), cv = $('canvas.fx', film), ctx = cv.getContext('2d');
    var T = $('.ftitle', film), H2 = $('h2', T), S = $('p', T), cards = $$('.fcard', film);
    var hudT = $('.hud .hl', film), tcEl = $('.hud .tc', film), load = $('.hud .load s', film);
    var nail = $('.nail', film), hint = $('.fhint', film), fade = $('.fade', film), tag = $('.ftag', film), hud = $('.hud', film);
    var big = $('.bigword', film), bigS = big && $('span', big), uv = $('.uvgloed', film);
    var uvT = film.dataset.uv ? film.dataset.uv.split(',').map(Number) : null;
    var uvCh = CH.filter(function (c) { return c.lp; })[0];
    var VW = mobile ? 480 : 1280, VH = mobile ? 768 : 720, IW = 1344, IH = 752;
    var label = film.dataset.hud || '', total = +film.dataset.total || N, portalNext = film.hasAttribute('data-portal');
    var cur = -2, vt = 0, want = 0, pS = 0, words = [], ready = false, dur = +film.dataset.dur || 0;
    var FX = { mode: 'dust', k: 1, parts: [], t0: performance.now(), ch: 0, vis: 0 };

    if (V) {
      var src = mobile ? film.dataset.srcM : film.dataset.src;
      if (mobile && film.dataset.posterM) V.poster = film.dataset.posterM;
      V.muted = true;
      V.addEventListener('loadedmetadata', function () { V.pause(); ready = true; VW = V.videoWidth || VW; VH = V.videoHeight || VH; dur = V.duration || dur; V.currentTime = vt = want; });
    }
    var started = false;
    function start() {
      if (started || !V) return; started = true;
      loadBlob(src, function (k) { if (load) load.style.width = (k * 100) + '%'; })
        .then(function (u) { V.src = u; if (load) load.parentNode.style.opacity = 0; })
        .catch(function () { V.src = src; });
    }
    if (V && film.getBoundingClientRect().top < innerHeight * 2.5) start();

    cards.concat(hero ? $$('.low', hero) : []).forEach(function (cd) {
      var m = $('.more', cd);
      if (m) m.addEventListener('click', function () { var x = cd.classList.toggle('x'); m.textContent = x ? 'minder −' : 'lees verder +'; m.setAttribute('aria-expanded', x); });
    });

    function setTitle(i) {
      if (i < 0) { H2.innerHTML = ''; S.textContent = ''; words = []; }
      else {
        var c = CH[i];
        H2.innerHTML = c.t.replace(/<em>(.*?)<\/em>/g, function (m, x) { return x.split(' ').map(function (w) { return '\u0001' + w; }).join(' '); })
          .split(' ').map(function (w) { return w.charAt(0) === '\u0001' ? '<span class="w"><em>' + w.slice(1) + '</em></span>' : '<span class="w">' + w + '</span>'; }).join(' ');
        H2.setAttribute('aria-label', c.t.replace(/<[^>]+>/g, ''));
        S.textContent = c.s || '';
        words = $$('.w', H2);
        T.classList.remove('tl', 'tr', 'tc'); T.classList.add(c.pos || 'tl');
        T.classList.toggle('sm', c.fs === 'sm');
        if (!mobile) { T.style.width = c.tw || ''; T.style.top = c.ty ? c.ty + 'vh' : ''; }
        else T.style.top = c.tym ? (c.tym * 100) + 'vh' : '';
      }
      var j = Math.max(i, 0);
      if (hudT) hudT.textContent = label + ' · ' + pad(j + 1) + ' / ' + pad(total);
      if (bigS && CH[j].w && bigS.textContent !== CH[j].w) {
        bigS.classList.add('off');
        clearTimeout(setTitle.t);
        setTitle.t = setTimeout(function () { bigS.textContent = CH[j].w; bigS.classList.remove('off'); }, 320);
      }
    }
    var seg = function (f) { return ease((f - .18) / .64); };
    function size() { cv.width = stage.clientWidth * dpr; cv.height = stage.clientHeight * dpr; }
    size(); addEventListener('resize', size);

    /* camera (video): scale about (ox, oy); ends at S=1.03 so the portal continues from the exact frame */
    var cam = { S: 1, ox: 0, oy: 0 };
    function cover() {
      var W = stage.clientWidth, Hh = stage.clientHeight, s0 = Math.max(W / VW, Hh / VH);
      var dw = VW * s0, dh = VH * s0;
      return { W: W, H: Hh, dw: dw, dh: dh, ox: (W - dw) / 2, oy: (Hh - dh) / 2 };
    }
    /* frame fraction → screen px */
    var panS = { s: 1, tx: 0, ty: 0 };
    function toScreen(fx, fy) {
      if (isPan) return { x: panS.tx + fx * IW * panS.s, y: panS.ty + fy * IH * panS.s };
      var c = cover();
      var X = c.ox + fx * c.dw, Y = c.oy + fy * c.dh;
      return { x: cam.ox + (X - cam.ox) * cam.S, y: cam.oy + (Y - cam.oy) * cam.S };
    }
    function camera() {
      var c = cover();
      cam.S = 1.03 + .05 * Math.sin(Math.PI * pS); cam.ox = c.W / 2; cam.oy = c.H * (mobile ? .5 : .45);
      V.style.transformOrigin = cam.ox.toFixed(1) + 'px ' + cam.oy.toFixed(1) + 'px';
      V.style.transform = 'scale(' + cam.S.toFixed(4) + ')';
    }
    function panCam(i, e) {
      var W = stage.clientWidth, Hh = stage.clientHeight, s0 = Math.max(W / IW, Hh / IH);
      var a = rests[i], b = rests[Math.min(i + 1, M - 1)];
      var c = a.c + (b.c - a.c) * e, z = (a.z + (b.z - a.z) * e) * (1 - .07 * Math.sin(Math.PI * e));
      var s = s0 * z, DW = IW * s, DH = IH * s;
      var tx = clamp(W / 2 - c * DW, W - DW, 0), ty = clamp(Hh * (mobile ? .46 : .47) - .46 * DH, Hh - DH, 0);
      panS = { s: s, tx: tx, ty: ty };
      IMG.style.transform = 'translate3d(' + tx.toFixed(1) + 'px,' + ty.toFixed(1) + 'px,0) scale(' + s.toFixed(4) + ')';
    }

    function render() {
      var r = film.getBoundingClientRect(), tot = film.offsetHeight - innerHeight;
      if (r.bottom < -200 || r.top > innerHeight + 200) { if (r.top < innerHeight * 2.5) start(); return false; }
      start();
      var raw = clamp(-r.top / tot, 0, 1);
      pS += (raw - pS) * .2; if (Math.abs(raw - pS) < .0002) pS = raw;
      var u = Math.min(pS * (M - 1 + HOLD), M - 1), i = Math.min(Math.floor(u), M - 2), f = u - i;
      var e = seg(f);
      want = rests[i].at + (rests[i + 1].at - rests[i].at) * e;
      var near = f < .5 ? f : f - 1, nr = f < .5 ? i : i + 1, ch = rests[nr].ch;
      var vis = 1 - ease((Math.abs(near) - .1) / .22);
      if (ch !== cur) { cur = ch; setTitle(ch); }
      var heroO = hero ? 1 - ease(u / .42) : 0;
      if (V) camera(); else panCam(i, e);
      if (hero) {
        hero.style.opacity = heroO;
        hero.style.pointerEvents = heroO > .4 ? 'auto' : 'none'; hero.style.visibility = heroO < .01 ? 'hidden' : 'visible';
      }
      var endF = (portalNext ? 1 - ease((pS - .94) / .055) : 1) * ease((r.bottom - innerHeight * 1.02) / (innerHeight * .2)); /* nothing in the stage slides under the header */
      var tv = (ch < 0 ? 0 : vis) * endF;
      [hud, nail, tag].forEach(function (el) { if (el) el.style.opacity = endF; });
      var nW = words.length;
      words.forEach(function (sp, k) {
        var d = clamp((tv - k / Math.max(1, nW - 1) * .3) / .62, 0, 1);
        sp.style.opacity = d; sp.style.transform = 'translateY(' + ((1 - d) * .4).toFixed(3) + 'em)'; sp.style.filter = d > .99 ? 'none' : 'blur(' + ((1 - d) * 10).toFixed(1) + 'px)';
      });
      S.style.opacity = tv; T.style.setProperty('--sh', tv); T.style.opacity = tv < .02 ? 0 : 1;
      if (mobile && ch >= 0 && cards[ch]) cards[ch].style.top = (T.offsetTop + T.offsetHeight + 10) + 'px'; /* mobile: «lees verder +» chip right under the title */
      cards.forEach(function (el, k) {
        var o = k === ch ? ease((tv - .25) / .5) : 0;
        el.style.opacity = o; el.style.transform = 'translateY(' + ((1 - o) * 24) + 'px)'; el.classList.toggle('on', o > .6);
      });
      if (nail) nail.style.setProperty('--p', pS.toFixed(4));
      if (tcEl && dur) tcEl.textContent = '00:' + pad(Math.round(vt)) + ' / 00:' + pad(Math.round(dur));
      if (hint) hint.style.opacity = pS < .015 ? 1 : 0;
      if (fade) fade.style.opacity = ease((pS - .9) / .1);
      /* uvgloed: white-violet radial bloom from the lamp, timed to the bloom baked into the film */
      if (uv && uvT && uvCh) {
        var vtx = V ? vt : want, k2 = (vtx - uvT[0]) / (uvT[1] - uvT[0]);
        if (k2 > -.25 && k2 < 1.15) {
          var W = stage.clientWidth, Hh = stage.clientHeight;
          var src0 = toScreen(uvCh.lp[0], uvCh.lp[1]);
          var kk = clamp(k2, 0, 1), grow = ease(kk / .6);
          var cx = src0.x + (W / 2 - src0.x) * ease(kk), cy = src0.y + (Hh / 2 - src0.y) * ease(kk);
          var rad = uvCh.lp[2] * W + grow * Math.hypot(W, Hh) * 1.1;
          var o = k2 < 0 ? ease((k2 + .25) / .25) * .35 : k2 > 1 ? .0 : kk < .5 ? .35 + .55 * ease(kk / .5) : .9 * (1 - ease((kk - .5) / .5));
          uv.style.setProperty('--gx', cx.toFixed(1) + 'px'); uv.style.setProperty('--gy', cy.toFixed(1) + 'px'); uv.style.setProperty('--gr', Math.max(rad, 40).toFixed(1) + 'px');
          uv.style.opacity = clamp(o, 0, 1);
        } else uv.style.opacity = 0;
      }
      var cc = CH[Math.max(ch, 0)];
      if (big && !mobile && cc.o) {
        var p0 = toScreen(cc.o[0], cc.o[2]), p1 = toScreen(cc.o[1], cc.o[3]), bw = cc.b || [.5, .5], pb = toScreen(bw[0], bw[1]);
        big.style.setProperty('--hx', p0.x + 'px'); big.style.setProperty('--hy', p0.y + 'px');
        big.style.setProperty('--hw', (p1.x - p0.x) + 'px'); big.style.setProperty('--hh', (p1.y - p0.y) + 'px');
        big.style.setProperty('--bx', pb.x + 'px'); big.style.setProperty('--by', pb.y + 'px');
        big.style.opacity = (1 - heroO) * (.4 + .6 * vis) * endF;
      }
      FX.mode = cc.fx || 'dust'; FX.ch = Math.max(ch, 0); FX.k = .25 + .75 * (ch < 0 ? .6 : vis); FX.vis = ch < 0 ? 0 : vis;
      return true;
    }

    /* ---------- particles / light per chapter ---------- */
    function P(fx, fy) { var p = toScreen(fx, fy); return { x: p.x * dpr, y: p.y * dpr }; }
    function spawn() {
      var W = cv.width, Hh = cv.height, R = Math.random, m = FX.mode, c = CH[FX.ch], q;
      if (m === 'caustic' && c.cz && R() < .3) {
        q = P(c.cz[0] + R() * (c.cz[1] - c.cz[0]), c.cz[2] + R() * (c.cz[3] - c.cz[2]));
        var cols = ['255,170,190', '255,200,120', '205,225,140', '255,235,215'];
        return { x: q.x, y: q.y, vx: (R() - .5) * .3, vy: (R() - .5) * .12, r: (6 + R() * 18) * dpr, cau: 1, c: cols[Math.floor(R() * 4)], life: 0, up: 1, ph: R() * 6.28 };
      }
      if (m === 'beam' && R() < .7) { /* motes inside the low morning beam (top-right → lower-left) */
        var t = R(), w = (R() - .5) * .16;
        return { x: W * (1.02 - t * .75 + w), y: Hh * (.05 + t * .7 + w * .4), vx: -(.05 + R() * .15), vy: .03 + R() * .08, r: (.7 + R() * 2) * dpr, c: R() < .2 ? '255,214,224' : '255,250,242', a: .95, life: 0, up: 1 };
      }
      var warm = m === 'caustic' || c.warm;
      return { x: R() * W, y: R() * Hh * .85, vx: (R() - .3) * .2, vy: (R() - .5) * .16, r: (.7 + R() * 1.9) * dpr,
        c: warm ? (R() < .3 ? '250,190,150' : '255,230,200') : (R() < .12 ? '255,205,218' : (c.cool ? '246,244,255' : '255,250,244')), a: .85, life: 0, up: 1 };
    }
    function glint(sg, period, t) { /* top-coat gloss travelling along glass / tweezers */
      var ph = ((t / 1000) % period) / period; if (ph > .25) return;
      var k = ph / .25, a = P(sg[0], sg[1]), b = P(sg[2], sg[3]);
      var x = a.x + (b.x - a.x) * k, y = a.y + (b.y - a.y) * k, s = (12 + 18 * Math.sin(Math.PI * k)) * dpr, al = Math.sin(Math.PI * k) * FX.vis;
      var g = ctx.createRadialGradient(x, y, 0, x, y, s * 2.4);
      g.addColorStop(0, 'rgba(255,255,255,' + .85 * al + ')'); g.addColorStop(.4, 'rgba(255,225,235,' + .3 * al + ')'); g.addColorStop(1, 'rgba(255,220,230,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, s * 2.4, 0, 6.283); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,' + .9 * al + ')'; ctx.lineWidth = 1.1 * dpr;
      ctx.beginPath(); ctx.moveTo(x - s * 1.4, y); ctx.lineTo(x + s * 1.4, y); ctx.moveTo(x, y - s * .8); ctx.lineTo(x, y + s * .8); ctx.stroke();
    }
    function ripples(c, t) { /* soft rings spreading on the gel surface */
      var o = P(c.rp[0], c.rp[1]), RX = c.rp[2] * cv.width * (isPan ? 1 : cam.S);
      for (var n = 0; n < 3; n++) {
        var k = ((t / 2400) + n / 3) % 1, al = (1 - k) * .55 * FX.vis;
        ctx.strokeStyle = 'rgba(255,255,255,' + al + ')'; ctx.lineWidth = (1.6 - k) * dpr;
        ctx.beginPath(); ctx.ellipse(o.x, o.y, RX * (.25 + k * .75), RX * (.25 + k * .75) * .26, 0, 0, 6.283); ctx.stroke();
      }
    }
    function lampGlow(c, t) {
      var o = P(c.lp[0], c.lp[1]), Rr = c.lp[2] * cv.width * (.85 + .15 * Math.sin(t / 900));
      ctx.globalCompositeOperation = 'lighter';
      var g = ctx.createRadialGradient(o.x, o.y, 0, o.x, o.y, Rr);
      var a = (.22 + .1 * Math.sin(t / 900)) * (.4 + .6 * FX.vis);
      g.addColorStop(0, 'rgba(235,225,255,' + a + ')'); g.addColorStop(.45, 'rgba(190,160,240,' + a * .45 + ')'); g.addColorStop(1, 'rgba(190,160,240,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(o.x, o.y, Rr, 0, 6.283); ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
    }
    function petal(c, t) { /* one petal glides slowly over the silk */
      var k = ((t / 11000) % 1), e = ease(k), a = P(c.pt[0], c.pt[1]), b = P(c.pt[2], c.pt[3]);
      var x = a.x + (b.x - a.x) * e + Math.sin(k * 6.283 * 1.5) * 10 * dpr, y = a.y + (b.y - a.y) * e;
      var al = Math.sin(Math.PI * k) * FX.vis, s = 11 * dpr;
      ctx.save(); ctx.translate(x, y); ctx.rotate(-.6 + k * 2.2 + Math.sin(t / 700) * .15); ctx.globalAlpha = al;
      var g = ctx.createRadialGradient(-s * .2, -s * .2, 0, 0, 0, s * 1.4);
      g.addColorStop(0, '#FFE6EC'); g.addColorStop(.7, '#F4B6C6'); g.addColorStop(1, '#E58FA6');
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(0, -s); ctx.bezierCurveTo(s * 1.1, -s * .6, s * .9, s * .8, 0, s); ctx.bezierCurveTo(-s * .9, s * .8, -s * 1.1, -s * .6, 0, -s); ctx.fill();
      ctx.restore();
    }
    function beamLight(t) {
      var W = cv.width, Hh = cv.height, sh = Math.sin(t / 3000) * .04;
      var g = ctx.createLinearGradient(W * (.55 + sh), 0, W * (.25 + sh), Hh * .2);
      g.addColorStop(0, 'rgba(255,250,240,0)'); g.addColorStop(.5, 'rgba(255,250,240,' + .12 * FX.vis + ')'); g.addColorStop(1, 'rgba(255,250,240,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, Hh);
    }
    function tick() {
      var t = performance.now() - FX.t0;
      ctx.clearRect(0, 0, cv.width, cv.height);
      var m = FX.mode, c = CH[FX.ch];
      if (m === 'beam') beamLight(t);
      if (m === 'lamp' && c.lp) lampGlow(c, t);
      var nn = m === 'beam' ? 2 : 1;
      for (var k = 0; k < nn; k++) if (Math.random() < FX.k * (m === 'dust' ? .7 : .9)) FX.parts.push(spawn());
      FX.parts = FX.parts.filter(function (q) {
        q.x += q.vx; q.y += q.vy;
        if (q.up) { q.life += .008; if (q.life >= 1) q.up = 0; } else q.life -= .004;
        if (q.life <= 0 && !q.up || q.y > cv.height + 30 || q.y < -80 * dpr) return false;
        var al = clamp(q.life, 0, 1);
        if (q.cau) {
          var s = .5 + .5 * Math.sin(t / 260 + q.ph);
          ctx.globalCompositeOperation = 'lighter';
          ctx.fillStyle = 'rgba(' + q.c + ',' + (.2 * al * s) + ')';
          ctx.beginPath(); ctx.ellipse(q.x, q.y, q.r * (1 + s * .4), q.r * .42, Math.sin(t / 900 + q.ph) * .6, 0, 6.283); ctx.fill();
          ctx.globalCompositeOperation = 'source-over';
          return true;
        }
        ctx.beginPath(); ctx.arc(q.x, q.y, q.r, 0, 6.283);
        ctx.fillStyle = 'rgba(' + q.c + ',' + (al * q.a) + ')'; ctx.fill();
        return true;
      });
      if (FX.parts.length > 420) FX.parts.splice(0, FX.parts.length - 420);
      if (c.g && (m === 'glint' || m === 'petal')) glint(c.g, m === 'petal' ? 5 : 6, t);
      if (m === 'ripple' && c.rp) ripples(c, t);
      if (m === 'petal' && c.pt) petal(c, t);
    }
    function seek() {
      if (!V || !ready || !V.duration) { vt = want; return; }
      var tgt = Math.min(want, V.duration - .05);
      if (Math.abs(vt - tgt) > .002) { vt += (tgt - vt) * .3; if (Math.abs(vt - tgt) < .01) vt = tgt; if (!V.seeking) V.currentTime = vt; }
    }
    setTitle(hero ? -1 : 0);
    if (!V) panCam(0, 0);
    return { render: render, tick: tick, seek: seek };
  }).filter(Boolean);

  /* ---------- portal «druppel»: a drop of rose gel falls, lands, spreads into a glossy circle that opens K8 ---------- */
  var portals = $$('.portal').map(function (sec) {
    if (reduce) { sec.classList.add('still'); return null; }
    var stage = $('.pstage', sec), cv = $('canvas.gl', sec), txt = $('.ptext', sec), tag = $('.ptag', sec), dark = $('.pdark', sec), phud = $('.phud', sec);
    var A = mobile ? sec.dataset.aM : sec.dataset.a, B = mobile ? sec.dataset.bM : sec.dataset.b;
    var G = JSON.parse(mobile ? sec.dataset.gM : sec.dataset.g);
    var fbA = $('.pfb.a', sec), fbB = $('.pfb.b', sec);
    var gl = null, prog, U = {}, sizes = [[1, 1], [1, 1]], mx = 0, my = 0, smx = 0, smy = 0, t0 = performance.now();
    var more = $('.more', txt);
    if (more) more.addEventListener('click', function () { var x = txt.classList.toggle('x'); more.textContent = x ? 'minder −' : 'lees verder +'; more.setAttribute('aria-expanded', x); });
    try { gl = cv.getContext('webgl', { antialias: false, premultipliedAlpha: false }); } catch (e) { gl = null; }
    if (fbA) fbA.src = A; if (fbB) fbB.src = B;
    if (gl) {
      var vs = 'attribute vec2 p;varying vec2 uv;void main(){uv=p*.5+.5;gl_Position=vec4(p,0.,1.);}';
      var fs = [
        'precision highp float;varying vec2 uv;uniform sampler2D A,B;uniform vec2 R,SA,SB,MO,G,O;uniform float P,T,KB,Z;',
        'vec2 cov(vec2 u,vec2 s,float z,vec2 o){float ra=R.x/R.y,ia=s.x/s.y;vec2 sc=ra>ia?vec2(1.,ia/ra):vec2(ra/ia,1.);vec2 q=o+(u-o)/z;return (q-.5)*sc+.5;}',
        'void main(){float asp=R.x/R.y;vec2 g=vec2(G.x,1.-G.y);vec2 p=(uv-g)*vec2(asp,1.);',
        'float fall=smoothstep(0.,.36,P);float hit=smoothstep(.33,.4,P);',
        'float dy=mix(1.-g.y+.14,0.,fall*fall);',
        'float r0=.068*(1.-.55*hit);float st=1.+.7*fall*(1.-hit);',
        'vec2 q=p-vec2(0.,dy);q.y/=st;if(q.y>0.)q.x*=1.+q.y*14.;',
        'float fd=r0*r0/(dot(q,q)+1e-5);',
        'vec2 tp=p-vec2(0.,dy+.11*st);float ft=pow(r0*.42,2.)/(dot(tp,tp)+1e-5)*(1.-hit);',
        'float field=(fd+ft)*(1.-smoothstep(.4,.47,P));',
        'float Rr=mix(0.,length(vec2(asp,1.))*1.08+.1,smoothstep(.39,.97,P));',
        'float an=atan(p.y,p.x);float d=length(p)+(.011*sin(an*7.+T*1.3)+.006*sin(an*13.-T*.9))*hit*(1.-smoothstep(.85,1.,P));',
        'float rip=sin((d-Rr)*95.-T*5.)*exp(-max(d-Rr,0.)*16.)*hit*(1.-smoothstep(.8,1.,P));',
        'vec2 dir=p/(length(p)+1e-4);',
        'vec3 a=texture2D(A,cov(uv+vec2(dir.x/asp,dir.y)*rip*.0035,SA,Z*(1.+.04*P),O)).rgb;',
        'vec3 ROSE=vec3(.95,.52,.6),MILK=vec3(.953,.914,.933),WH=vec3(1.);',
        'vec3 col=a+WH*max(rip,0.)*.16;',
        'float m=smoothstep(1.,1.35,field);',
        'vec2 hq=q/r0-vec2(-.35,.35);float spec=pow(clamp(1.-length(hq)*1.6,0.,1.),2.);',
        'vec3 dropc=mix(ROSE,MILK,.18)*(.86+.14*clamp(-q.y/r0,-1.,1.))+WH*spec*.95;',
        'col=mix(col,dropc,m);col=mix(col,ROSE*.82,smoothstep(1.,1.35,field)*(1.-smoothstep(1.35,2.,field))*.35);',
        'float inD=smoothstep(Rr,Rr-.012,d);',
        'vec3 b=texture2D(B,cov(uv,SB,KB,vec2(.5))+MO*.008).rgb;',
        'float fr=1.-smoothstep(.9,1.,P);',
        'float rim=smoothstep(Rr-.085,Rr-.006,d)*inD;',
        'col=mix(col,b,inD);col=mix(col,mix(ROSE,MILK,.3),rim*.8*fr);',
        'float arc=smoothstep(Rr-.06,Rr-.035,d)*smoothstep(Rr-.012,Rr-.032,d)*pow(max(cos(an-2.3),0.),5.);',
        'col+=WH*arc*.85*fr*inD;',
        'col+=WH*exp(-dot(p,p)/.0025)*hit*(1.-smoothstep(.4,.58,P))*.7;',
        'gl_FragColor=vec4(clamp(col,0.,1.),1.);}'
      ].join('\n');
      var sh = function (t, s) { var o = gl.createShader(t); gl.shaderSource(o, s); gl.compileShader(o); if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(o)); return o; };
      try {
        prog = gl.createProgram(); gl.attachShader(prog, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(prog); gl.useProgram(prog);
        var bf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, bf); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
        var lp = gl.getAttribLocation(prog, 'p'); gl.enableVertexAttribArray(lp); gl.vertexAttribPointer(lp, 2, gl.FLOAT, false, 0, 0);
        ['A', 'B', 'R', 'SA', 'SB', 'MO', 'G', 'O', 'P', 'T', 'KB', 'Z'].forEach(function (k) { U[k] = gl.getUniformLocation(prog, k); });
        [A, B].forEach(function (url, i) {
          var tx = gl.createTexture();
          gl.activeTexture(gl.TEXTURE0 + i); gl.bindTexture(gl.TEXTURE_2D, tx);
          gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([246, 226, 222, 255]));
          ['TEXTURE_WRAP_S', 'TEXTURE_WRAP_T'].forEach(function (w) { gl.texParameteri(gl.TEXTURE_2D, gl[w], gl.CLAMP_TO_EDGE); });
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
          var im = new Image(); im.onload = function () {
            gl.activeTexture(gl.TEXTURE0 + i); gl.bindTexture(gl.TEXTURE_2D, tx); gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, im); sizes[i] = [im.naturalWidth, im.naturalHeight];
          }; im.src = url;
        });
        gl.uniform1i(U.A, 0); gl.uniform1i(U.B, 1);
        sec.classList.add('gl');
      } catch (e) { gl = null; }
    }
    function size() { var k = Math.min(dpr, 1.5); cv.width = stage.clientWidth * k; cv.height = stage.clientHeight * k; if (gl) gl.viewport(0, 0, cv.width, cv.height); }
    size(); addEventListener('resize', size);
    if (fine) addEventListener('mousemove', function (e) { mx = e.clientX / innerWidth * 2 - 1; my = -(e.clientY / innerHeight * 2 - 1); });
    var sm = 0;
    return function () {
      var r = sec.getBoundingClientRect(), tot = sec.offsetHeight - innerHeight;
      sec.classList.toggle('live', r.top <= 1);
      if (r.bottom < 0 || r.top > 1) return;
      var raw = clamp(-r.top / tot, 0, 1); sm += (raw - sm) * .2;
      var Pp = clamp(sm / .5, 0, 1), q = sm;
      var kb = 1 + .06 * ease((q - .5) / .5);
      smx += (mx - smx) * .05; smy += (my - smy) * .05;
      if (gl) {
        gl.uniform2f(U.R, cv.width, cv.height); gl.uniform2f(U.SA, sizes[0][0], sizes[0][1]); gl.uniform2f(U.SB, sizes[1][0], sizes[1][1]);
        gl.uniform2f(U.MO, smx, smy); gl.uniform2f(U.G, G[0], G[1]); gl.uniform2f(U.O, .5, mobile ? .5 : .55);
        gl.uniform1f(U.P, Pp); gl.uniform1f(U.T, (performance.now() - t0) / 1000); gl.uniform1f(U.KB, kb); gl.uniform1f(U.Z, 1.03);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      } else if (fbB) {
        fbB.style.setProperty('--r', (ease((Pp - .38) / .62) * 75) + '%');
        fbB.style.transform = 'scale(' + kb + ')';
      }
      stage.style.setProperty('--dust', ease((Pp - .6) / .3));
      var o = ease((q - .5) / .08) * (1 - ease((q - .9) / .06));
      txt.style.opacity = o; txt.style.translate = '0 ' + ((1 - o) * 40) + 'px'; txt.style.pointerEvents = o > .5 ? 'auto' : 'none';
      if (tag) tag.style.opacity = ease((Pp - .9) / .1) * (1 - ease((q - .84) / .06));
      if (phud) phud.style.opacity = ease((Pp - .9) / .1) * (1 - ease((q - .84) / .06));
      if (dark) dark.style.opacity = ease((q - .86) / .14);
    };
  }).filter(Boolean);

  /* ---------- reveals ---------- */
  $$('.words').forEach(function (el) {
    var i = 0;
    el.innerHTML = el.innerHTML.trim().split(/\s+/).map(function (w) { return '<span class="wd" style="--i:' + (i++) + '">' + w + '</span>'; }).join(' ');
  });
  $$('.fill p').forEach(function (p) {
    p.innerHTML = p.innerHTML.trim().split(/\s+(?![^<]*>)/).map(function (w) { return '<span class="wd">' + w + '</span>'; }).join(' ');
  });
  var io = new IntersectionObserver(function (es) {
    es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
  }, { threshold: .12 });
  $$('.rv,.words').forEach(function (el) { io.observe(el); });

  if (fine) $$('.glow-follow').forEach(function (el) {
    el.addEventListener('mousemove', function (e) {
      var r = el.getBoundingClientRect(); el.style.setProperty('--mx', (e.clientX - r.left) + 'px'); el.style.setProperty('--my', (e.clientY - r.top) + 'px');
    });
  });

  /* ---------- kleurwaaier: tap a tip → the big nail is painted in that colour ---------- */
  $$('.waaier').forEach(function (w) {
    var out = $('.kout', w), base = $('.kbase', out), col = $('.kcol', out), nm = $('.kbody b', out), tx = $('.kbody p', out), link = $('.kbody a', out);
    $$('.tip', w).forEach(function (t) {
      t.addEventListener('click', function () {
        $$('.tip', w).forEach(function (x) { x.setAttribute('aria-pressed', x === t); });
        base.setAttribute('fill', col.getAttribute('fill'));
        col.setAttribute('fill', t.dataset.c);
        out.classList.remove('paint'); void out.getBoundingClientRect(); out.classList.add('paint');
        out.classList.add('sw');
        setTimeout(function () {
          nm.textContent = t.dataset.n; tx.textContent = t.dataset.t;
          link.href = 'afspraak.html?dienst=gellak&kleur=' + t.dataset.id; out.classList.remove('sw');
        }, 220);
      });
    });
  });

  /* ---------- vormkiezer: the nail outline morphs between shapes ---------- */
  $$('.vorm').forEach(function (v) {
    var data = JSON.parse(($('#nailpaths') || {}).textContent || '{}'), shape = $('.vshape', v), name = $('.vname', v), txt = $('.vtxt', v);
    var nums = function (d) { return d.match(/-?\d+(\.\d+)?/g).map(Number); };
    var tmpl = data.amandel.split(/-?\d+(?:\.\d+)?/);
    var curN = nums(data.amandel), anim = 0;
    function morph(to) {
      var from = curN.slice(), dst = nums(data[to]), t0 = performance.now(), D = reduce ? 1 : 650;
      cancelAnimationFrame(anim);
      (function step(t) {
        var k = ease((t - t0) / D);
        curN = from.map(function (x, i) { return x + (dst[i] - x) * k; });
        var s = tmpl[0]; curN.forEach(function (x, i) { s += x.toFixed(2) + tmpl[i + 1]; });
        shape.setAttribute('d', s);
        if (k < 1) anim = requestAnimationFrame(step);
      })(t0);
    }
    $$('.schip', v).forEach(function (c) {
      c.addEventListener('click', function () {
        $$('.schip', v).forEach(function (x) { x.setAttribute('aria-pressed', x === c); });
        morph(c.dataset.id); name.textContent = c.textContent;
        txt.classList.add('sw'); setTimeout(function () { txt.textContent = c.dataset.t; txt.classList.remove('sw'); }, 200);
      });
    });
  });

  /* ---------- schema «laag voor laag»: layers draw with scroll ---------- */
  var schemas = $$('.schema').map(function (el) {
    var lys = $$('.ly', el), lis = $$('.layers li', el);
    return function () {
      var r = el.getBoundingClientRect(); if (r.bottom < 0 || r.top > innerHeight) return;
      var k = reduce ? 1 : clamp((innerHeight * .9 - r.top) / (innerHeight * .75), 0, 1);
      lys.forEach(function (p, i) { p.style.strokeDashoffset = 1 - clamp(k * 4.2 - i, 0, 1); });
      lis.forEach(function (li, i) { li.classList.toggle('on', k * 4.2 - i > .4); });
      el.style.setProperty('--k', k.toFixed(3));
    };
  });

  /* ---------- panorama: pinned, vertical scroll → horizontal track ---------- */
  var panos = $$('.pano').map(function (sec) {
    if (reduce) { sec.classList.add('still'); return null; }
    var track = $('.track', sec), bar = $('.pbar i', sec), over = 0;
    function size() { over = Math.max(0, track.scrollWidth - innerWidth); sec.style.setProperty('--pw', (over + innerHeight * 1.25) + 'px'); }
    size(); addEventListener('resize', size); addEventListener('load', size);
    var k = 0;
    return function () {
      var r = sec.getBoundingClientRect(); if (r.bottom < 0 || r.top > innerHeight) return;
      var raw = clamp((-r.top - innerHeight * .1) / (sec.offsetHeight - innerHeight * 1.2), 0, 1);
      k += (raw - k) * .18;
      track.style.transform = 'translate3d(' + (-k * over).toFixed(1) + 'px,0,0)';
      if (bar) bar.style.width = (k * 100) + '%';
    };
  }).filter(Boolean);

  /* ---------- ambient canvases: dust in light (warm / cool / pink), gel drops (404) ---------- */
  var ambient = $$('canvas.dust,canvas.drops').map(function (cv) {
    var ctx = cv.getContext('2d'), parts = [], kind = cv.dataset.k || 'warm', drops = cv.classList.contains('drops'), t0 = performance.now();
    function size() { cv.width = cv.clientWidth * dpr; cv.height = cv.clientHeight * dpr; }
    size(); addEventListener('resize', size);
    var host = cv.closest('.pstage');
    return function () {
      var r = cv.getBoundingClientRect(); if (r.bottom < 0 || r.top > innerHeight || !cv.width) return;
      var lvl = host ? +(getComputedStyle(host).getPropertyValue('--dust') || 0) : 1;
      var W = cv.width, H = cv.height, R = Math.random, t = performance.now() - t0;
      ctx.clearRect(0, 0, W, H);
      if (drops) { /* ripples on the gel dish of K4 + a slow falling drop */
        var cx = W * (mobile ? .5 : .475), cy = H * (mobile ? .55 : .66), RX = W * (mobile ? .3 : .1);
        for (var n = 0; n < 3; n++) {
          var k = ((t / 2600) + n / 3) % 1;
          ctx.strokeStyle = 'rgba(255,255,255,' + (1 - k) * .6 + ')'; ctx.lineWidth = (1.6 - k) * dpr;
          ctx.beginPath(); ctx.ellipse(cx, cy, RX * (.2 + k * .8), RX * (.2 + k * .8) * .26, 0, 0, 6.283); ctx.stroke();
        }
      }
      if (R() < .55 * Math.max(lvl, .05)) parts.push({ x: W * (.05 + R() * .95), y: R() * H, vx: -(.03 + R() * .16), vy: (R() - .6) * .2, r: (.7 + R() * 2) * dpr, life: 0, up: 1, rose: R() < (kind === 'pink' ? .5 : .18) });
      ctx.globalAlpha = host ? lvl : 1;
      parts = parts.filter(function (q) {
        q.x += q.vx; q.y += q.vy;
        if (q.up) { q.life += .006; if (q.life >= 1) q.up = 0; } else q.life -= .004;
        if (q.life <= 0 && !q.up) return false;
        ctx.beginPath(); ctx.arc(q.x, q.y, q.r, 0, 6.283);
        var base = kind === 'cool' ? '246,242,255' : kind === 'pink' ? '255,236,242' : '255,232,205';
        ctx.fillStyle = 'rgba(' + (q.rose ? '240,170,190' : base) + ',' + (.85 * q.life) + ')'; ctx.fill();
        return true;
      });
      ctx.globalAlpha = 1;
      if (parts.length > 240) parts.splice(0, parts.length - 240);
    };
  });

  /* ---------- steps line (J5): line draws with scroll, a rose drop rides it ---------- */
  var paths = $$('.path').map(function (el) {
    var pth = $('path.draw', el), dot = $('path.dot', el), steps = $$('.steps li', el), L = pth.getTotalLength();
    pth.style.strokeDasharray = L; pth.style.strokeDashoffset = L;
    return function () {
      var r = el.getBoundingClientRect(); if (r.bottom < 0 || r.top > innerHeight) return;
      var k = reduce ? 1 : clamp((innerHeight * .85 - r.top) / (innerHeight * .55), 0, 1);
      pth.style.strokeDashoffset = L * (1 - k);
      var pt = pth.getPointAtLength(L * k); dot.setAttribute('transform', 'translate(' + pt.x.toFixed(1) + ' ' + (pt.y - 4).toFixed(1) + ')');
      steps.forEach(function (s, i) { s.classList.toggle('on', k >= i / (steps.length - 1) - .02); });
      el.style.setProperty('--k', k.toFixed(3));
    };
  });

  /* ---------- scroll-linked extras ---------- */
  var par = $$('[data-par]'), marq = $$('.marq div'), fills = $$('.fill'), kb = $$('[data-kb]');
  var lmx = 0, lmy = 0;
  if (fine) addEventListener('mousemove', function (e) { lmx = e.clientX / innerWidth - .5; lmy = e.clientY / innerHeight - .5; });
  function extras() {
    var vh = innerHeight;
    if (hd) hd.classList.toggle('solid', scrollY > 40);
    document.body.classList.toggle('deep', scrollY > innerHeight * .5);
    if (reduce) return;
    par.forEach(function (el) {
      var r = el.parentNode.getBoundingClientRect(); if (r.bottom < 0 || r.top > vh) return;
      var k = (r.top + r.height / 2 - vh / 2) / vh;
      el.style.transform = 'translate3d(0,' + (k * -(+el.dataset.par || 50)) + 'px,0) scale(1.12)';
    });
    kb.forEach(function (el) {
      var r = el.parentNode.getBoundingClientRect(); if (r.bottom < 0 || r.top > vh) return;
      var k = clamp(1 - r.bottom / (vh + r.height), 0, 1);
      el.style.transform = 'translate3d(' + (lmx * -16) + 'px,' + (lmy * -10 + (k - .5) * -36) + 'px,0) scale(' + (1.04 + k * .05) + ')';
    });
    marq.forEach(function (el, i) { el.style.transform = 'translate3d(' + (-(scrollY * .25) % (el.scrollWidth / 2)) * (i % 2 ? -1 : 1) + 'px,0,0)'; });
    fills.forEach(function (el) {
      var r = el.getBoundingClientRect(); if (r.bottom < 0 || r.top > vh) return;
      var sp = $$('.wd', el), k = clamp((vh * .85 - r.top) / (r.height + vh * .15), 0, 1) * sp.length;
      sp.forEach(function (s, i) { s.classList.toggle('lit', i < k); });
      el.classList.toggle('done', k >= sp.length - .5);
    });
  }
  if (reduce) { $$('.fill .wd').forEach(function (s) { s.classList.add('lit'); }); $$('.fill').forEach(function (f) { f.classList.add('done'); }); }

  /* ---------- loop ---------- */
  var lenis = (window.Lenis && !reduce) ? new Lenis({ lerp: .1 }) : null;
  window.__lenis = lenis;
  (function raf(t) {
    if (lenis) lenis.raf(t);
    scrubs.forEach(function (f) { if (f.render()) { f.seek(); f.tick(); } });
    portals.forEach(function (p) { p(); });
    panos.forEach(function (p) { p(); });
    if (!reduce) ambient.forEach(function (a) { a(); });
    schemas.forEach(function (s) { s(); });
    paths.forEach(function (p) { p(); });
    extras();
    requestAnimationFrame(raf);
  })(0);
})();
