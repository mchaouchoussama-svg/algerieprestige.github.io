/* Algérie Prestige · animations d'interface. Aucune dépendance, ~4 Ko.
   Ciblage par attributs data-ap-* ou par sélecteurs configurables (window.AP_MOTION). */
(function () {
  'use strict';
  var d = document, root = d.documentElement;
  var RM = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var cfg = Object.assign({
    titles: '[data-ap-title], main h1, main h2, section h1, section h2',
    up: '[data-ap-up]',
    btn: '[data-ap-btn]',
    card: '[data-ap-card]'
  }, window.AP_MOTION || {});
  root.classList.add('ap-js'); window.__apm = 1;
  var $ = function (s, c) { return Array.prototype.slice.call((c || d).querySelectorAll(s)); };
  var io = 'IntersectionObserver' in window;

  /* observation unique : ajoute .ap-in à l'entrée dans l'écran */
  var seen = io ? new IntersectionObserver(function (es) {
    es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('ap-in'); seen.unobserve(e.target); } });
  }, { rootMargin: '0px 0px -12% 0px', threshold: 0.08 }) : null;
  function watch(el) {
    if (!seen) { el.classList.add('ap-in'); return; }
    var r = el.getBoundingClientRect();     // déjà à l'écran au chargement : apparition immédiate (hors marge d'observation)
    if (r.top < innerHeight && r.bottom > 0) { requestAnimationFrame(function () { el.classList.add('ap-in'); }); return; }
    seen.observe(el);
  }

  /* titres : découpe en mots en conservant les balises internes (em, span...) */
  function split(node, counter) {
    Array.prototype.slice.call(node.childNodes).forEach(function (c) {
      if (c.nodeType === 3) {
        var frag = d.createDocumentFragment();
        c.textContent.split(/(\s+)/).forEach(function (p) {
          if (!p) return;
          if (/^\s+$/.test(p)) { frag.appendChild(d.createTextNode(' ')); return; }
          var w = d.createElement('span'), i = d.createElement('span');
          w.className = 'ap-w'; i.className = 'ap-wi'; i.style.setProperty('--i', counter.n++); i.textContent = p;
          w.appendChild(i); frag.appendChild(w);
        });
        node.replaceChild(frag, c);
      } else if (c.nodeType === 1 && c.tagName !== 'BR') split(c, counter);
    });
  }
  $(cfg.titles).forEach(function (t) {
    if (t.dataset.apDone) return; t.dataset.apDone = '1';
    t.classList.add('ap-title'); split(t, { n: 0 }); watch(t);
  });

  /* textes et cartes */
  $(cfg.up).forEach(function (el) {
    var g = el.closest('[data-ap-stagger]');
    if (g) el.style.setProperty('--d', $(cfg.up, g).indexOf(el));
    el.classList.add('ap-up'); watch(el);
  });
  $('[data-ap-rule]').forEach(function (el) { el.classList.add('ap-rule'); watch(el); });
  $(cfg.btn).forEach(function (b) { b.classList.add('ap-btn'); });
  $(cfg.card).forEach(function (c) { c.classList.add('ap-card'); });

  /* compteurs : lit le nombre dans le texte, le restitue à l'identique à la fin */
  function count(el) {
    var raw = el.textContent.trim(), m = raw.match(/^(\D*?)([\d][\d\s .,]*)(.*)$/);
    if (!m) return;
    var target = parseFloat(m[2].replace(/[\s ]/g, '').replace(',', '.'));
    if (isNaN(target)) return;
    var dec = (m[2].split(/[.,]/)[1] || '').length, t0 = null, dur = 1700;
    var fmt = function (v) { return v.toLocaleString('fr-FR', { minimumFractionDigits: dec, maximumFractionDigits: dec }); };
    if (RM) return;
    el.style.minWidth = el.getBoundingClientRect().width + 'px';
    function frame(t) {
      if (t0 === null) t0 = t;
      var p = Math.min(1, (t - t0) / dur), e = p === 1 ? 1 : 1 - Math.pow(2, -10 * p);
      el.textContent = m[1] + fmt(target * e) + m[3];
      if (p < 1) requestAnimationFrame(frame); else el.textContent = raw;
    }
    requestAnimationFrame(frame);
  }
  var cio = io ? new IntersectionObserver(function (es) {
    es.forEach(function (e) { if (e.isIntersecting) { count(e.target); cio.unobserve(e.target); } });
  }, { threshold: 0.6 }) : null;
  if (cio) $('[data-ap-count]').forEach(function (el) { cio.observe(el); });

  /* parallaxe douce, uniquement pendant que le cadre est visible */
  var pars = $('[data-ap-par]').map(function (el) {
    var inner = el.firstElementChild; if (!inner) return null;
    el.classList.add('ap-par'); inner.classList.add('ap-par-in');
    return { el: el, inner: inner, k: parseFloat(el.dataset.apPar) || 0.06, vis: false };
  }).filter(Boolean);
  if (pars.length && io && !RM) {
    var pio = new IntersectionObserver(function (es) { es.forEach(function (e) { pars.forEach(function (p) { if (p.el === e.target) p.vis = e.isIntersecting; }); }); });
    pars.forEach(function (p) { pio.observe(p.el); });
    var tick = false;
    var run = function () {
      tick = false;
      pars.forEach(function (p) {
        if (!p.vis) return;
        var r = p.el.getBoundingClientRect(), c = r.top + r.height / 2 - innerHeight / 2;
        p.inner.style.setProperty('--py', (-c * p.k).toFixed(1) + 'px');
      });
    };
    var req = function () { if (!tick) { tick = true; requestAnimationFrame(run); } };
    addEventListener('scroll', req, { passive: true }); addEventListener('resize', req); req();
  }

  /* vidéos : chargement différé, lecture silencieuse en boucle seulement à l'écran */
  var conn = navigator.connection || {};
  var lite = conn.saveData || /(^|-)2g$/.test(conn.effectiveType || '');
  $('.ap-video').forEach(function (box) {
    var v = box.querySelector('video'); if (!v || !io) return;
    v.muted = true; v.setAttribute('playsinline', ''); v.removeAttribute('controls');
    if (box.dataset.poster) box.style.backgroundImage = 'url(' + box.dataset.poster + ')';
    if (RM || lite) return;                       // affiche seule si mouvement réduit ou connexion lente
    var loaded = false;
    function load() {
      if (loaded) return; loaded = true;
      var small = innerWidth <= 720 || conn.effectiveType === '3g';
      v.src = small ? box.dataset.sd : box.dataset.hd;
      v.load();
    }
    var vis = false;
    function go() { var p = v.play(); if (p && p.catch) p.catch(function () {}); }
    v.addEventListener('playing', function () { box.classList.add('ap-playing'); });
    v.addEventListener('loadeddata', function () { if (vis) go(); });   // visible avant la fin du chargement
    new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) load(); }); }, { rootMargin: '500px' }).observe(box);
    new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        vis = e.isIntersecting;
        if (!loaded) return;
        if (vis) go(); else v.pause();
      });
    }, { threshold: 0.35 }).observe(box);
  });

  /* transitions de page : fondu de sortie sur les liens internes */
  d.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href]');
    if (!a || RM || e.defaultPrevented || e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if (a.target && a.target !== '_self') return;
    var u; try { u = new URL(a.href, location.href); } catch (x) { return; }
    if (u.origin !== location.origin || (u.pathname === location.pathname && u.hash)) return;
    if (/\.(pdf|zip|mp4|jpg|png)$/i.test(u.pathname)) return;
    e.preventDefault(); root.classList.add('ap-leave');
    setTimeout(function () { location.href = u.href; }, 280);
  });
  addEventListener('pageshow', function (e) { if (e.persisted) root.classList.remove('ap-leave'); });

  /* filet de sécurité : si l'observateur ne s'est pas déclenché, tout devient visible */
  setTimeout(function () { $('.ap-title:not(.ap-in),.ap-up:not(.ap-in),.ap-rule:not(.ap-in)').forEach(function (el) { var r = el.getBoundingClientRect(); if (r.top < innerHeight) el.classList.add('ap-in'); }); }, 2500);
})();
