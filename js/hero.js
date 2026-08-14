/* ==========================================================================
   HERO — carrousel "matières premières"
   Quatre univers (chocolat, gingembre, mangue, arachide) : chacun apporte sa
   palette, son texte et son ambiance animée (particules, rayons, lueur).
   Aucune dépendance externe.
   ========================================================================== */

const HERO_THEMES = [
  {
    id: 'chocolat',
    name: 'Chocolat',
    eyebrow: 'Récolte n°01 · Cacao',
    tagline: 'Le cacao ivoirien, fondu à la main',
    product: 'Tablettes · Pâte à tartiner · Cookies · Granola · Boisson chaude',
    badge: 'Meilleur Cacao de San Pédro · torréfaction lente',
    img: 'images/hero/chocolat.png',
    imgWidth: '82%',
    ink: 'light',
    accent: '#E9B872',
    glow: '233, 184, 114',
    ray: 0.07,
    gradient: 'radial-gradient(120% 120% at 72% 30%, #7A3F1B 0%, #43200E 42%, #1C0D06 100%)',
    particles: {
      shape: 'chip', count: 44,
      colors: ['#3B1C0D', '#6B3A18', '#C98B4B'],
      size: [3, 10], vy: [14, 34], vx: [-10, 10],
      spin: 0.9, opacity: [0.25, 0.6], twinkle: 0
    }
  },
  {
    id: 'gingembre',
    name: 'Gingembre',
    eyebrow: 'Racine n°02 · Gingembre',
    tagline: 'La racine qui réveille tout',
    product: 'Jus frais · Sirop · Confiture · Épices',
    badge: 'Gingembre Pur de Tiassalé · piquant vif',
    img: 'images/hero/gingembre.png',
    imgWidth: '86%',
    ink: 'dark',
    accent: '#B45309',
    glow: '255, 214, 102',
    ray: 0.16,
    gradient: 'radial-gradient(120% 120% at 66% 34%, #FFF3CE 0%, #FBD46B 45%, #E39A12 100%)',
    particles: {
      shape: 'spark', count: 64,
      colors: ['#FFFFFF', '#FFE9A8', '#F0A500'],
      size: [1.5, 4], vy: [-38, -14], vx: [-14, 14],
      spin: 0, opacity: [0.3, 0.85], twinkle: 1
    }
  },
  {
    id: 'mangue',
    name: 'Mangue',
    eyebrow: 'Verger n°03 · Mangue',
    tagline: 'Cueillie mûre, gorgée de soleil',
    product: 'Jus Frais · Confiture · Séchée · Liqueur de fruit',
    badge: 'Vergers de Korhogo · saison de mars',
    img: 'images/hero/mangue.png',
    imgWidth: '62%',
    ink: 'light',
    accent: '#FFE08A',
    glow: '255, 196, 74',
    ray: 0.22,
    gradient: 'radial-gradient(120% 120% at 70% 32%, #FFC221 0%, #F97316 44%, #B4300A 100%)',
    particles: {
      shape: 'drop', count: 46,
      colors: ['#FFFFFF', '#FFE8B0', '#FFD166'],
      size: [2, 6], vy: [26, 62], vx: [-6, 6],
      spin: 0, opacity: [0.25, 0.7], twinkle: 0.35
    }
  },
  {
    id: 'arachide',
    name: 'Arachide',
    eyebrow: 'Champ n°04 · Arachide',
    tagline: 'Le goût grillé de la savane',
    product: "Pâte d'arachide · Sucré au chocolat · Granola",
    badge: 'Recolte du nord du pays · salée à la main',
    img: 'images/hero/arachide.png',
    imgWidth: '96%',
    ink: 'light',
    accent: '#F2D5A8',
    glow: '226, 178, 118',
    ray: 0.10,
    gradient: 'radial-gradient(120% 120% at 68% 34%, #C8965E 0%, #8B5E34 46%, #3E2413 100%)',
    particles: {
      shape: 'flake', count: 38,
      colors: ['#F2D5A8', '#D9A566', '#8B5E34'],
      size: [3, 8], vy: [6, 20], vx: [-24, 24],
      spin: 0.5, opacity: [0.2, 0.55], twinkle: 0
    }
  }
];

const HERO_INTERVAL = 6200;

(function () {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let hero, stage, content, tabs, imgs, layerA, layerB, activeLayer;
  let index = 0, isAnimating = false, paused = false;
  let timerStart = 0, elapsed = 0, rafProgress = null;
  let field = null;

  /* ---------- Découpage du texte pour les révélations ---------- */

  function splitTitle(el, text) {
    el.classList.remove('is-in');
    el.innerHTML = '';
    [...text].forEach((c, i) => {
      const s = document.createElement('span');
      s.className = 'ch' + (c === ' ' ? ' sp' : '');
      s.textContent = c === ' ' ? '\u00A0' : c;
      s.style.setProperty('--d', 60 + i * 38 + 'ms');
      el.appendChild(s);
    });
    // force reflow puis lance la cascade
    void el.offsetWidth;
    el.classList.add('is-in');
  }

  function setLine(el, text, delay) {
    el.classList.remove('is-in');
    el.innerHTML = '<span class="hero-line"><i></i></span>';
    const inner = el.firstChild.firstChild;
    inner.textContent = text;
    const line = el.firstChild;
    line.style.setProperty('--d', delay + 'ms');
    void line.offsetWidth;
    line.classList.add('is-in');
  }

  /* ---------- Application d'un thème ---------- */

  function apply(next, instant) {
    const t = HERO_THEMES[next];

    hero.style.setProperty('--t-accent', t.accent);
    hero.style.setProperty('--t-glow', t.glow);
    hero.style.setProperty('--ray-opacity', t.ray);
    hero.style.setProperty('--t-ink', t.ink === 'dark' ? '#2A1A0B' : '#FFFFFF');
    hero.dataset.ink = t.ink;
    hero.dataset.theme = t.id;

    // Crossfade des deux calques de fond
    const incoming = activeLayer === layerA ? layerB : layerA;
    incoming.style.background = t.gradient;
    incoming.classList.add('is-on');
    activeLayer.classList.remove('is-on');
    activeLayer = incoming;

    // Images : la sortante s'échappe, l'entrante monte
    imgs.forEach((img, i) => {
      if (i === next) {
        img.classList.remove('is-leaving');
        img.style.setProperty('--img-w', t.imgWidth);
        // reset avant transition pour rejouer l'entrée
        img.classList.remove('is-active');
        void img.offsetWidth;
        img.classList.add('is-active');
      } else if (img.classList.contains('is-active')) {
        img.classList.remove('is-active');
        img.classList.add('is-leaving');
        setTimeout(() => img.classList.remove('is-leaving'), 700);
      }
    });

    // Texte
    document.getElementById('heroBadgeText').textContent = t.badge;
    setLine(document.getElementById('heroEyebrow'), t.eyebrow, 40);
    splitTitle(document.getElementById('heroFruitName'), t.name);
    setLine(document.getElementById('heroTagline'), t.tagline, 220);
    setLine(document.getElementById('heroProduct'), t.product, 320);

    tabs.forEach((tab, i) => {
      tab.classList.toggle('is-active', i === next);
      if (i !== next) tab.style.setProperty('--p', 0);
    });

    if (field) field.setTheme(t.particles);

    index = next;
    if (!instant) restartTimer();
  }

  function go(next) {
    next = (next + HERO_THEMES.length) % HERO_THEMES.length;
    if (next === index || isAnimating) return;
    isAnimating = true;
    apply(next);
    setTimeout(() => { isAnimating = false; }, 620);
  }

  /* ---------- Défilement automatique + jauge sur l'onglet actif ---------- */

  function restartTimer() {
    elapsed = 0;
    timerStart = performance.now();
  }

  function tickProgress(now) {
    rafProgress = requestAnimationFrame(tickProgress);
    if (paused) { timerStart = now - elapsed; return; }
    elapsed = now - timerStart;
    const p = Math.min(elapsed / HERO_INTERVAL, 1);
    tabs[index]?.style.setProperty('--p', p.toFixed(4));
    if (p >= 1) go(index + 1);
  }

  function setPaused(v) { paused = v; }

  /* ---------- Parallaxe pointeur (lissée) ---------- */

  function parallax() {
    let tx = 0, ty = 0, cx = 0, cy = 0;

    hero.addEventListener('pointermove', (e) => {
      const r = hero.getBoundingClientRect();
      tx = (e.clientX - r.left) / r.width - 0.5;
      ty = (e.clientY - r.top) / r.height - 0.5;
    });
    hero.addEventListener('pointerleave', () => { tx = 0; ty = 0; });

    (function loop() {
      requestAnimationFrame(loop);
      cx += (tx - cx) * 0.06;
      cy += (ty - cy) * 0.06;
      stage.style.transform =
        `translate3d(${cx * 34}px, ${cy * 26}px, 0) rotateX(${-cy * 4}deg) rotateY(${cx * 5}deg)`;
      content.style.transform = `translate3d(${cx * -12}px, ${cy * -8}px, 0)`;
    })();
  }

  /* ---------- Glisser / balayer ---------- */

  function swipe() {
    let x0 = null;
    hero.addEventListener('pointerdown', (e) => {
      x0 = e.clientX;
      hero.classList.add('is-dragging');
    });
    const end = (e) => {
      if (x0 === null) return;
      const dx = e.clientX - x0;
      x0 = null;
      hero.classList.remove('is-dragging');
      if (Math.abs(dx) > 60) go(index + (dx < 0 ? 1 : -1));
    };
    hero.addEventListener('pointerup', end);
    hero.addEventListener('pointercancel', () => { x0 = null; hero.classList.remove('is-dragging'); });
  }

  /* ---------- Champ de particules ---------- */

  function createField(canvas) {
    const ctx = canvas.getContext('2d');
    let w = 0, h = 0, dpr = Math.min(window.devicePixelRatio || 1, 2);
    let cfg = null, parts = [], target = null, blend = 1, last = performance.now();

    function resize() {
      const r = canvas.getBoundingClientRect();
      w = r.width; h = r.height;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    const rnd = (a, b) => a + Math.random() * (b - a);
    const pick = (arr) => arr[(Math.random() * arr.length) | 0];

    function spawn(c, fromEdge) {
      const up = c.vy[1] < 0;
      return {
        x: rnd(-40, w + 40),
        y: fromEdge ? (up ? h + rnd(0, 60) : -rnd(0, 60)) : rnd(0, h),
        r: rnd(c.size[0], c.size[1]),
        vx: rnd(c.vx[0], c.vx[1]),
        vy: rnd(c.vy[0], c.vy[1]),
        a: rnd(c.opacity[0], c.opacity[1]),
        rot: Math.random() * Math.PI * 2,
        spin: rnd(-c.spin, c.spin),
        color: pick(c.colors),
        seed: Math.random() * Math.PI * 2,
        sway: rnd(0.3, 1.2)
      };
    }

    function build(c, fromEdge) {
      parts = [];
      const n = Math.round(c.count * Math.min(1, w / 900 + 0.35));
      for (let i = 0; i < n; i++) parts.push(spawn(c, fromEdge && Math.random() > 0.4));
    }

    function draw(p, t) {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.globalAlpha = p.a * blend * (cfg.twinkle
        ? 0.45 + 0.55 * Math.abs(Math.sin(t * 1.6 + p.seed))
        : 1);
      ctx.fillStyle = p.color;

      switch (cfg.shape) {
        case 'chip': {                       // éclat de chocolat qui tombe
          ctx.rotate(p.rot);
          const s = p.r;
          ctx.beginPath();
          ctx.moveTo(-s, -s * 0.7);
          ctx.lineTo(s * 0.8, -s);
          ctx.lineTo(s, s * 0.6);
          ctx.lineTo(-s * 0.7, s);
          ctx.closePath();
          ctx.fill();
          break;
        }
        case 'spark': {                      // étincelle chaude qui monte
          ctx.shadowColor = p.color;
          ctx.shadowBlur = p.r * 4;
          ctx.beginPath();
          ctx.arc(0, 0, p.r, 0, Math.PI * 2);
          ctx.fill();
          break;
        }
        case 'drop': {                       // goutte de jus
          ctx.beginPath();
          ctx.moveTo(0, -p.r * 1.8);
          ctx.quadraticCurveTo(p.r, 0, 0, p.r);
          ctx.quadraticCurveTo(-p.r, 0, 0, -p.r * 1.8);
          ctx.fill();
          break;
        }
        default: {                           // éclat de coque qui plane
          ctx.rotate(p.rot);
          ctx.beginPath();
          ctx.ellipse(0, 0, p.r, p.r * 0.42, 0, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.restore();
    }

    function frame(now) {
      requestAnimationFrame(frame);
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      const t = now * 0.001;

      // fondu entre deux ambiances : on efface, on reconstruit, on remonte
      if (target) {
        blend -= dt * 2.6;
        if (blend <= 0) { cfg = target; target = null; build(cfg, true); blend = 0; }
      } else if (blend < 1) {
        blend = Math.min(1, blend + dt * 1.6);
      }

      ctx.clearRect(0, 0, w, h);
      if (!cfg || document.hidden) return;

      for (const p of parts) {
        p.x += (p.vx + Math.sin(t * p.sway + p.seed) * 8) * dt;
        p.y += p.vy * dt;
        p.rot += p.spin * dt;

        const up = p.vy < 0;
        if (up && p.y < -60) Object.assign(p, spawn(cfg, false), { y: h + 20 });
        else if (!up && p.y > h + 60) Object.assign(p, spawn(cfg, false), { y: -20 });
        if (p.x < -60) p.x = w + 40;
        if (p.x > w + 60) p.x = -40;

        draw(p, t);
      }
    }

    const remeasure = () => { resize(); if (cfg && w > 0) build(cfg, false); };
    resize();
    window.addEventListener('resize', remeasure);
    window.addEventListener('load', remeasure);
    if (window.ResizeObserver) new ResizeObserver(remeasure).observe(canvas);
    requestAnimationFrame(frame);

    return {
      setTheme(c) {
        if (!cfg) { cfg = c; build(c, false); blend = 1; return; }
        target = c;
      }
    };
  }

  /* ---------- Démarrage ---------- */

  function init() {
    hero = document.getElementById('heroSection');
    if (!hero) return;

    stage   = document.getElementById('heroStage');
    content = document.getElementById('heroContent');
    imgs    = [...hero.querySelectorAll('.hero-img')];
    tabs    = [...hero.querySelectorAll('.hero-tab')];
    layerA  = hero.querySelector('[data-layer="a"]');
    layerB  = hero.querySelector('[data-layer="b"]');
    activeLayer = layerB;   // apply() basculera sur A

    const canvas = document.getElementById('heroParticles');
    if (canvas && !reduced) field = createField(canvas);

    tabs.forEach((tab, i) => tab.addEventListener('click', () => go(i)));
    document.getElementById('heroPrev')?.addEventListener('click', () => go(index - 1));
    document.getElementById('heroNext')?.addEventListener('click', () => go(index + 1));

    document.addEventListener('keydown', (e) => {
      if (hero.getBoundingClientRect().bottom < 120) return;
      if (e.key === 'ArrowRight') go(index + 1);
      if (e.key === 'ArrowLeft')  go(index - 1);
    });

    hero.addEventListener('pointerenter', () => setPaused(true));
    hero.addEventListener('pointerleave', () => setPaused(false));
    document.addEventListener('visibilitychange', () => setPaused(document.hidden));

    if (!reduced) { parallax(); swipe(); }

    apply(0, true);
    restartTimer();
    rafProgress = requestAnimationFrame(tickProgress);
  }

  document.addEventListener('DOMContentLoaded', init);
})();