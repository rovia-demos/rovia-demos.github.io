(() => {
  'use strict';
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const mobile = () => matchMedia('(max-width: 900px)').matches;

  /* hauteur d'écran mesurée une fois ; recalcul seulement si la largeur change */
  let lastW = innerWidth;
  const onWidth = [];
  addEventListener('resize', () => {
    if (innerWidth === lastW) return;
    lastW = innerWidth;
    document.documentElement.style.setProperty('--vh', innerHeight / 100 + 'px');
    onWidth.forEach(f => f());
  });

  /* ---------- en-tête ---------- */
  const top = $('#top-bar');
  const hero = $('.hero');
  const onScroll = () => top.classList.toggle('is-solid', scrollY > 40);
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  const burger = $('.burger');
  const setMenu = open => {
    top.classList.toggle('is-open', open);
    burger.setAttribute('aria-expanded', open);
    burger.setAttribute('aria-label', open ? 'Fermer le menu' : 'Ouvrir le menu');
    document.body.style.overflow = open ? 'hidden' : '';
  };
  burger.addEventListener('click', () => setMenu(!top.classList.contains('is-open')));
  $$('#nav a').forEach(a => a.addEventListener('click', () => setMenu(false)));
  addEventListener('keydown', e => { if (e.key === 'Escape' && top.classList.contains('is-open')) { setMenu(false); burger.focus(); } });

  /* ---------- apparitions ---------- */
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
  }), { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
  $$('.reveal').forEach(el => io.observe(el));

  /* ---------- avis qui défilent dans le hero ---------- */
  const hq = $$('.hq__list blockquote');
  if (hq.length > 1 && !reduce) {
    let i = 0, hold = false;
    const box = $('.hero__quote');
    box.addEventListener('pointerenter', () => { hold = true; });
    box.addEventListener('pointerleave', () => { hold = false; });
    setInterval(() => {
      if (document.hidden || hold) return;
      hq[i].classList.remove('is-on');
      i = (i + 1) % hq.length;
      hq[i].classList.add('is-on');
    }, 5200);
  }

  /* ---------- services : la photo change pendant le défilement ---------- */
  const stageImgs = $$('.svc__frame img');
  const count = $('.svc__count');
  const items = $$('.svc__item');
  const setSvc = k => {
    items.forEach(it => it.classList.toggle('is-on', it.dataset.k === k));
    stageImgs.forEach(im => im.classList.toggle('is-on', im.dataset.k === k));
    count.textContent = String(+k + 1).padStart(2, '0');
  };
  const svcIO = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) setSvc(e.target.dataset.k); }),
    { rootMargin: '-45% 0px -45% 0px' });
  items.forEach(it => svcIO.observe(it));
  setSvc('0');

  /* ---------- avant / après ---------- */
  const pairs = [
    { k: 'terrasse', a: 'Après : terrasse en dalles de pierre', c: 'Un terrain nu devenu une terrasse en pierre, face aux collines.' },
    { k: 'muret', a: 'Après : muret enduit et clôture neuve', c: 'Un vieux grillage remplacé par un muret enduit et une clôture neuve.' },
    { k: 'soutenement', a: 'Après : mur de soutènement neuf', c: 'Un talus qui s’effondrait, retenu par un mur de soutènement.' },
    { k: 'dalle', a: 'Après : dalle béton dans une cour', c: 'Une cour en terre et vieux béton cassé devenue une dalle béton plane.' }
  ];
  const viewer = $('.ba__viewer');
  const range = $('.ba__range');
  const imA = $('.ba__after'), imB = $('.ba__before'), cap = $('.ba__cap');
  const setPos = v => { v = Math.max(0, Math.min(100, v)); viewer.style.setProperty('--pos', v + '%'); range.value = v; };
  range.addEventListener('input', () => setPos(+range.value));
  let drag = false;
  const fromX = x => { const r = viewer.getBoundingClientRect(); setPos((x - r.left) / r.width * 100); };
  viewer.addEventListener('pointerdown', e => { drag = true; viewer.setPointerCapture(e.pointerId); fromX(e.clientX); });
  viewer.addEventListener('pointermove', e => { if (drag) fromX(e.clientX); });
  ['pointerup', 'pointercancel'].forEach(t => viewer.addEventListener(t, () => { drag = false; }));
  const src = (k, s) => ({ src: `img/${k}-${s}-1168.webp`, srcset: `img/${k}-${s}-800.webp 800w, img/${k}-${s}-1168.webp 1168w` });
  $$('.ba__tabs button').forEach(b => b.addEventListener('click', () => {
    const p = pairs[+b.dataset.i];
    $$('.ba__tabs button').forEach(x => x.setAttribute('aria-selected', x === b));
    viewer.classList.add('is-loading');
    const A = src(p.k, 'apres'), B = src(p.k, 'avant');
    const pre = [A, B].map(o => { const im = new Image(); im.sizes = imA.sizes; im.srcset = o.srcset; im.src = o.src; return im.decode ? im.decode().catch(() => {}) : Promise.resolve(); });
    Promise.all(pre).then(() => {
      Object.assign(imA, A); imA.alt = p.a;
      Object.assign(imB, B);
      cap.textContent = p.c;
      viewer.classList.remove('is-loading');
      setPos(50);
    });
  }));
  /* petit geste d'invitation la première fois que le curseur est visible */
  if (!reduce) {
    new IntersectionObserver(([e], o) => {
      if (!e.isIntersecting) return;
      o.disconnect();
      const t0 = performance.now();
      const step = t => {
        const p = Math.min(1, (t - t0) / 1600);
        if (drag) return;
        setPos(50 + Math.sin(p * Math.PI * 2) * 14 * (1 - p));
        if (p < 1) requestAnimationFrame(step);
      };
      setTimeout(() => requestAnimationFrame(step), 500);
    }, { threshold: 0.6 }).observe(viewer);
  }

  /* ---------- réalisations : filtres + grille sans trou ---------- */
  const grid = $('#grid');
  const tiles = $$('#grid li');
  const moreW = $('#more-works');
  let filter = 'tout', expanded = false;
  const layout = () => {
    const cols = mobile() ? 2 : 4;
    const limit = expanded ? Infinity : (mobile() ? 6 : 8);
    const match = tiles.filter(li => filter === 'tout' || li.dataset.c === filter);
    tiles.forEach(li => { li.hidden = true; li.classList.remove('is-wide'); li.style.gridColumn = ''; li.style.aspectRatio = ''; });
    const shown = match.slice(0, limit);
    shown.forEach(li => { li.hidden = false; });
    const r = shown.length % cols;
    if (r) {
      const last = shown[shown.length - 1], span = cols - r + 1;
      const gap = parseFloat(getComputedStyle(grid).columnGap) || 0;
      const cw = (grid.clientWidth - gap * (cols - 1)) / cols;
      last.classList.add('is-wide');
      last.style.gridColumn = `span ${span}`;
      last.style.aspectRatio = `${(span * cw + (span - 1) * gap) / cw} / 1`;
    }
    moreW.parentElement.hidden = shown.length >= match.length;
  };
  $$('.filters button').forEach(b => b.addEventListener('click', () => {
    $$('.filters button').forEach(x => x.setAttribute('aria-pressed', x === b));
    filter = b.dataset.f; expanded = false; layout();
    tiles.filter(li => !li.hidden).forEach((li, i) => { li.classList.remove('is-new'); void li.offsetWidth; li.style.animationDelay = i * 40 + 'ms'; li.classList.add('is-new'); });
  }));
  moreW.addEventListener('click', () => {
    const before = tiles.filter(li => !li.hidden).length;
    expanded = true; layout();
    const now = tiles.filter(li => !li.hidden);
    now.slice(before).forEach((li, i) => { li.style.animationDelay = i * 40 + 'ms'; li.classList.add('is-new'); });
    const next = now[before] && now[before].querySelector('button');
    if (next) next.focus({ preventScroll: true });
  });
  layout();
  onWidth.push(layout);

  /* ---------- visionneuse ---------- */
  const lb = $('#lb'), lbFig = $('#lb-fig'), lbCap = $('#lb-cap');
  let cur = 0, list = [];
  const show = i => {
    cur = (i + list.length) % list.length;
    const b = list[cur], im = b.querySelector('img');
    const big = new Image();
    big.src = b.dataset.full; big.alt = im.alt;
    lbFig.replaceChildren(big);
    lbCap.textContent = b.querySelector('span').textContent;
  };
  grid.addEventListener('click', e => {
    const b = e.target.closest('.tile'); if (!b) return;
    list = tiles.filter(li => !li.hidden).map(li => li.querySelector('.tile'));
    show(list.indexOf(b));
    lb.showModal();
  });
  $('.lb__x').addEventListener('click', () => lb.close());
  $('.lb__prev').addEventListener('click', () => show(cur - 1));
  $('.lb__next').addEventListener('click', () => show(cur + 1));
  lb.addEventListener('click', e => { if (e.target === lb || e.target === lbFig) lb.close(); });
  lb.addEventListener('keydown', e => { if (e.key === 'ArrowLeft') show(cur - 1); if (e.key === 'ArrowRight') show(cur + 1); });
  let tx = null;
  lb.addEventListener('touchstart', e => { tx = e.touches[0].clientX; }, { passive: true });
  lb.addEventListener('touchend', e => { if (tx === null) return; const d = e.changedTouches[0].clientX - tx; if (Math.abs(d) > 50) show(cur + (d < 0 ? 1 : -1)); tx = null; });

  /* ---------- compteurs ---------- */
  const counters = $$('[data-count]');
  const cIO = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return;
    cIO.unobserve(e.target);
    const el = e.target, end = parseFloat(el.dataset.count), dec = el.dataset.count.includes('.') ? 1 : 0;
    const fmt = v => v.toFixed(dec).replace('.', ',');
    if (reduce) { el.textContent = fmt(end); return; }
    const t0 = performance.now(), d = 1400;
    const step = t => { const p = Math.min(1, (t - t0) / d), k = 1 - Math.pow(1 - p, 3); el.textContent = fmt(end * k); if (p < 1) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  }), { threshold: 0.6 });
  counters.forEach(c => cIO.observe(c));

  /* ---------- avis : afficher plus (mobile) ---------- */
  $('#more-rv').addEventListener('click', () => { $('#rv').classList.add('is-all'); });

  /* ---------- formulaire (démo : aucune donnée envoyée) ---------- */
  const form = $('#form'), type = $('#f-type');
  $$('[data-type]').forEach(a => a.addEventListener('click', () => { type.value = a.dataset.type; }));
  const ph = $('#f-ph'), thumbs = $('#thumbs');
  ph.addEventListener('change', () => {
    thumbs.replaceChildren(...[...ph.files].slice(0, 8).map(f => {
      const li = document.createElement('li'), im = document.createElement('img');
      im.src = URL.createObjectURL(f); im.alt = f.name; li.append(im); return li;
    }));
    $('.drop__t').textContent = ph.files.length ? `${ph.files.length} photo${ph.files.length > 1 ? 's' : ''} ajoutée${ph.files.length > 1 ? 's' : ''}` : 'Ajouter des photos';
  });
  const req = ['#f-type', '#f-ville', '#f-nom', '#f-tel'].map(s => $(s));
  req.forEach(el => el.addEventListener('input', () => el.classList.remove('is-bad')));
  form.addEventListener('submit', e => {
    e.preventDefault();
    const bad = req.filter(el => !el.value.trim() || (el.id === 'f-tel' && el.value.replace(/\D/g, '').length < 9));
    req.forEach(el => el.classList.toggle('is-bad', bad.includes(el)));
    $('#form-err').hidden = !bad.length;
    if (bad.length) { bad[0].focus(); return; }
    form.hidden = true;
    const done = $('#done'); done.hidden = false; done.focus();
  });

  /* ---------- barre de contact mobile ---------- */
  const mbar = $('#mbar'), ctas = $('#hero-ctas');
  new IntersectionObserver(([e]) => {
    mbar.classList.toggle('is-on', !e.isIntersecting && e.boundingClientRect.top < 0);
  }).observe(ctas);
})();
