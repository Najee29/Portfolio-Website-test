/* about.js - image fallbacks, scroll reveal, Spotify song boxes, and the canvas ocean with anglerfish */
(function () {
  'use strict';
  const $$ = (s) => Array.from(document.querySelectorAll(s));
  const rnd = (a, b) => Math.random() * (b - a) + a;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const TAU = Math.PI * 2;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---- Missing images show their placeholder ---- */
  $$('img[data-fallback]').forEach((img) => {
    const fail = () => img.classList.add('is-missing');
    img.addEventListener('error', fail, { once: true });
    if (img.complete && !img.naturalWidth) fail();
  });

  /* ---- Scroll reveal ---- */
  const els = $$('.reveal');
  if ('IntersectionObserver' in window && !reduce) {
    const io = new IntersectionObserver((list) => list.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
    }), { threshold: 0.12 });
    els.forEach((el) => io.observe(el));
  } else els.forEach((el) => el.classList.add('in'));

  /* ---- Favorite songs: click a box to open its Spotify player ---- */
  const songs = $$('.song');
  function closeSong(card) {
    card.classList.remove('is-open');
    card.querySelector('.song-head').setAttribute('aria-expanded', 'false');
    const f = card.querySelector('iframe');
    // removing the source after the animation stops the music
    window.setTimeout(() => { if (!card.classList.contains('is-open')) f.removeAttribute('src'); }, 400);
  }
  songs.forEach((card) => {
    const head = card.querySelector('.song-head'), frame = card.querySelector('iframe');
    head.addEventListener('click', () => {
      if (card.classList.contains('is-open')) { closeSong(card); return; }
      songs.forEach((o) => { if (o !== card && o.classList.contains('is-open')) closeSong(o); });
      if (!frame.getAttribute('src')) frame.setAttribute('src', frame.dataset.src);
      card.classList.add('is-open');
      head.setAttribute('aria-expanded', 'true');
    });
  });

  /* ---- Fish cursor (same as the main page; mouse users only) ---- */
  (function () {
    const fine = window.matchMedia('(hover: hover) and (pointer: fine)');
    if (!fine.matches) return;
    const fish = document.createElement('div');
    fish.className = 'fish-cursor';
    fish.setAttribute('aria-hidden', 'true');
    fish.innerHTML = '<div class="fish-flip"><div class="fish-bob"><i class="fish-tail"></i><i class="fish-body"></i><i class="fish-fin"></i></div></div>';
    document.body.appendChild(fish);
    document.documentElement.classList.add('has-fish');
    let tx = -100, ty = -100, x = -100, y = -100, left = false, seen = false, raf = 0;
    const ease = reduce ? 1 : 0.18;
    function step() {
      raf = 0;
      const dx = tx - x;
      x += dx * ease; y += (ty - y) * ease;
      if (Math.abs(dx) > 1.5 && (dx < 0) !== left) { left = dx < 0; fish.classList.toggle('face-left', left); }
      fish.style.transform = 'translate3d(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px,0)';
      if (Math.abs(tx - x) > 0.3 || Math.abs(ty - y) > 0.3) raf = window.requestAnimationFrame(step);
    }
    window.addEventListener('mousemove', (e) => {
      tx = e.clientX; ty = e.clientY;
      if (!seen) { seen = true; x = tx; y = ty; fish.classList.add('is-on'); }
      if (!raf) raf = window.requestAnimationFrame(step);
    }, { passive: true });
    document.addEventListener('mouseleave', () => fish.classList.remove('is-on'));
    document.addEventListener('mouseenter', () => { if (seen) fish.classList.add('is-on'); });
  })();

  /* ---- Parallax layers and page-leave fade ---- */
  if (!reduce) {
    let q = false;
    window.addEventListener('scroll', () => {
      if (q) return;
      q = true;
      window.requestAnimationFrame(() => { document.documentElement.style.setProperty('--sy', window.scrollY); q = false; });
    }, { passive: true });
  }
  $$('a[data-leave]').forEach((a) => a.addEventListener('click', (e) => {
    if (e.defaultPrevented || e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || reduce) return;
    e.preventDefault();
    document.body.classList.add('leaving');
    window.setTimeout(() => { window.location.href = a.href; }, 320);
  }));
  window.addEventListener('pageshow', () => document.body.classList.remove('leaving'));

  /* ---- Canvas ocean ---- */
  const cv = document.getElementById('sea');
  if (!cv || !cv.getContext) return;
  const cx = cv.getContext('2d');
  let W = 0, H = 0;
  function resize() {
    const d = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth; H = window.innerHeight;
    cv.width = W * d; cv.height = H * d;
    cx.setTransform(d, 0, 0, d, 0, 0);
  }
  resize();
  window.addEventListener('resize', resize);

  // Pre-rendered glow sprite (cheap to draw many times)
  const glow = document.createElement('canvas');
  glow.width = glow.height = 64;
  const gg = glow.getContext('2d');
  const rg = gg.createRadialGradient(32, 32, 0, 32, 32, 32);
  rg.addColorStop(0, 'rgba(230,255,255,1)');
  rg.addColorStop(0.25, 'rgba(92,244,255,.6)');
  rg.addColorStop(1, 'rgba(32,178,170,0)');
  gg.fillStyle = rg; gg.fillRect(0, 0, 64, 64);
  const drawGlow = (x, y, s, a) => { cx.globalAlpha = a; cx.drawImage(glow, x - s / 2, y - s / 2, s, s); cx.globalAlpha = 1; };

  /* Pointer (never blocks clicks: the canvas has pointer-events:none) */
  const ptr = { x: -999, y: -999, t: 0, mouse: false };
  function onPtr(e) {
    ptr.x = e.clientX; ptr.y = e.clientY; ptr.t = performance.now();
    ptr.mouse = e.pointerType === 'mouse';
  }
  window.addEventListener('pointermove', onPtr, { passive: true });
  window.addEventListener('pointerdown', onPtr, { passive: true });
  document.addEventListener('mouseleave', () => { ptr.mouse = false; ptr.t = 0; });
  const pointerActive = (now) => ptr.mouse || now - ptr.t < 2500;

  /* Ambient particles */
  const bubbles = Array.from({ length: reduce ? 10 : 26 }, () => ({
    x: rnd(0, 1), y: rnd(0, 1), r: rnd(2, 7), v: rnd(18, 50), ph: rnd(0, TAU)
  }));
  const plankton = Array.from({ length: reduce ? 20 : 55 }, () => ({
    x: rnd(0, 1), y: rnd(0, 1), r: rnd(0.8, 2), vx: rnd(-6, 6), vy: rnd(-8, 4), ph: rnd(0, TAU)
  }));
  const sparks = [];
  function burst(x, y, n) {
    for (let i = 0; i < n && sparks.length < 220; i++) {
      const a = rnd(0, TAU), s = rnd(50, 240), life = rnd(0.4, 0.95);
      sparks.push({ x: x, y: y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: life, max: life, r: rnd(3, 7) });
    }
  }

  /* ---- Anglerfish ---- */
  const DETECT = 190;
  const angDiff = (a, b) => ((b - a + Math.PI) % TAU + TAU) % TAU - Math.PI;

  function Fish() {
    this.s = rnd(0.8, 1.3) * (W < 700 ? 0.75 : 1);
    this.x = rnd(0, W); this.y = rnd(H * 0.15, H * 0.85);
    this.h = rnd(0, TAU); this.base = rnd(34, 62); this.v = this.base;
    this.st = 'swim'; this.t = 0; this.cool = rnd(0.5, 3);
    this.jaw = 0.1; this.ph = rnd(0, TAU); this.wob = rnd(0, 6);
    this.tx = 0; this.ty = 0; this.flash = 0; this.near = 0; this.fired = false;
  }
  Fish.prototype.turn = function (target, step) {
    const d = angDiff(this.h, target);
    this.h += clamp(d, -step, step);
    return d;
  };
  Fish.prototype.mouth = function () {
    return { x: this.x + Math.cos(this.h) * 44 * this.s, y: this.y + Math.sin(this.h) * 44 * this.s };
  };
  Fish.prototype.update = function (dt, now) {
    const px = ptr.x, py = ptr.y;
    this.ph += dt * (4 + this.v / 16);
    this.wob += dt;
    this.t += dt; this.cool -= dt; this.flash = Math.max(0, this.flash - dt * 3);
    let jawT = 0.1 + 0.08 * Math.sin(this.wob * 2);
    const dist = Math.hypot(px - this.x, py - this.y);
    this.near = pointerActive(now) ? clamp(1 - dist / (DETECT * 1.6), 0, 1) : 0;

    if (this.st === 'swim') {
      this.h += Math.sin(this.wob * 0.7 + this.s * 5) * dt * 0.5;
      const m = 90;
      if (this.x < m || this.x > W - m || this.y < m || this.y > H - m) {
        this.turn(Math.atan2(H / 2 - this.y, W / 2 - this.x), dt * 1.6);
      }
      this.v += (this.base - this.v) * dt * 2;
      if (!reduce && this.cool <= 0 && pointerActive(now) && dist < DETECT) { this.st = 'turn'; this.t = 0; }
    } else if (this.st === 'turn') {
      const d = this.turn(Math.atan2(py - this.y, px - this.x), dt * 6);
      this.v += (18 - this.v) * dt * 6; jawT = 0.35;
      if (Math.abs(d) < 0.2 || this.t > 0.8) { this.st = 'lunge'; this.t = 0; this.tx = px; this.ty = py; scatter(this.x, this.y); }
      else if (!pointerActive(now) || dist > DETECT * 1.7) { this.st = 'swim'; }
    } else if (this.st === 'lunge') {
      this.turn(Math.atan2(this.ty - this.y, this.tx - this.x), dt * 9);
      this.v += (600 - this.v) * dt * 10; jawT = 1;
      if (Math.random() < 0.6) sparks.push({ x: this.x - Math.cos(this.h) * 30 * this.s, y: this.y - Math.sin(this.h) * 30 * this.s, vx: rnd(-20, 20), vy: rnd(-20, 20), life: 0.5, max: 0.5, r: 3 });
      if (Math.hypot(this.tx - this.x, this.ty - this.y) < 40 * this.s || this.t > 0.75) { this.st = 'bite'; this.t = 0; this.fired = false; }
    } else if (this.st === 'bite') {
      jawT = 0; this.jaw -= dt * 9; this.v *= 0.9;
      if (!this.fired) { const m = this.mouth(); burst(m.x, m.y, 26); this.flash = 1; this.fired = true; }
      if (this.t > 0.3) {
        this.st = 'flee'; this.t = 0;
        this.h = Math.atan2(this.y - this.ty, this.x - this.tx) + rnd(-0.7, 0.7);
        this.v = 300;
      }
    } else { // flee
      jawT = 0.05; this.v += (this.base * 1.2 - this.v) * dt * 1.4;
      if (this.t > 1.5) { this.st = 'swim'; this.cool = rnd(2.5, 4.5); }
    }

    this.jaw += (jawT - this.jaw) * Math.min(1, dt * 12);
    this.x = clamp(this.x + Math.cos(this.h) * this.v * dt, -150, W + 150);
    this.y = clamp(this.y + Math.sin(this.h) * this.v * dt, -100, H + 100);
  };
  Fish.prototype.draw = function (now) {
    const j = this.jaw * 0.75;
    cx.save();
    cx.translate(this.x, this.y); cx.rotate(this.h);
    if (Math.cos(this.h) < 0) cx.scale(1, -1); // stay upright when facing left
    cx.scale(this.s, this.s);
    cx.globalAlpha = 0.9;
    // tail + dorsal fin
    cx.fillStyle = '#1a2c45';
    cx.save(); cx.translate(-36, 0); cx.rotate(Math.sin(this.ph) * 0.35);
    cx.beginPath(); cx.moveTo(6, 0); cx.lineTo(-30, -20); cx.quadraticCurveTo(-20, 0, -30, 20); cx.closePath(); cx.fill();
    cx.restore();
    cx.beginPath(); cx.moveTo(-8, -22); cx.lineTo(-24, -42); cx.lineTo(8, -24); cx.fill();
    // mouth cavity (dark) between the upper lip and the swinging lower jaw
    const tipX = 8 + 34 * Math.cos(j) + 4 * Math.sin(j), tipY = 10 + 34 * Math.sin(j) - 4 * Math.cos(j);
    cx.fillStyle = '#02050a';
    cx.beginPath(); cx.moveTo(8, 10); cx.lineTo(42, 4); cx.lineTo(tipX, tipY); cx.closePath(); cx.fill();
    // lower jaw
    cx.save(); cx.translate(8, 10); cx.rotate(j);
    cx.fillStyle = '#14233a';
    cx.beginPath(); cx.moveTo(0, -2); cx.lineTo(34, -4); cx.lineTo(36, 5); cx.lineTo(0, 8); cx.closePath(); cx.fill();
    cx.fillStyle = '#EAF6FF';
    for (let i = 0; i < 4; i++) { const tx = 8 + i * 8; cx.beginPath(); cx.moveTo(tx, -3); cx.lineTo(tx + 3, -3); cx.lineTo(tx + 1.5, -9); cx.fill(); }
    cx.restore();
    // body
    const g = cx.createLinearGradient(0, -26, 0, 26);
    g.addColorStop(0, '#34527a'); g.addColorStop(1, '#0c1829');
    cx.fillStyle = g; cx.beginPath(); cx.ellipse(0, 0, 40, 26, 0, 0, TAU); cx.fill();
    // upper teeth
    cx.fillStyle = '#EAF6FF';
    for (let i = 0; i < 3; i++) { const tx = 22 + i * 7; cx.beginPath(); cx.moveTo(tx, 5); cx.lineTo(tx + 3, 5); cx.lineTo(tx + 1.5, 11); cx.fill(); }
    // eye
    cx.fillStyle = '#CFF8FF'; cx.beginPath(); cx.arc(24, -8, 6, 0, TAU); cx.fill();
    cx.fillStyle = '#04101A'; cx.beginPath(); cx.arc(25.5, -8, this.st === 'lunge' ? 4 : 3, 0, TAU); cx.fill();
    // stalk + lure
    const sw = Math.sin(now / 420 + this.ph * 0.2) * 5;
    const lx = 52 + sw * 0.5, ly = -42 + sw;
    cx.strokeStyle = '#2b4264'; cx.lineWidth = 2.5; cx.beginPath();
    cx.moveTo(14, -23); cx.quadraticCurveTo(30, -66 + sw, lx, ly); cx.stroke();
    cx.globalCompositeOperation = 'lighter';
    drawGlow(lx, ly, 70 + 14 * Math.sin(now / 300 + this.ph) + this.flash * 70 + this.near * 60, 0.95);
    cx.globalCompositeOperation = 'source-over';
    cx.fillStyle = '#EFFFFF'; cx.beginPath(); cx.arc(lx, ly, 3.5, 0, TAU); cx.fill();
    cx.restore();
  };

  const count = reduce ? 2 : (W < 700 ? 3 : 5);
  const fish = Array.from({ length: count }, () => new Fish());

  /* ---- Tiny fish (scatter when an anglerfish lunges) and distant silhouettes ---- */
  const minnows = Array.from({ length: reduce ? 6 : 16 }, () => ({ x: rnd(0, W), y: rnd(0, H), vx: 0, vy: 0, d: rnd(0.6, 1.2) }));
  const sils = Array.from({ length: 3 }, (_, i) => ({ x: rnd(0, W), y: H * (0.2 + i * 0.25), v: rnd(6, 14) * (i % 2 ? -1 : 1), s: rnd(2.2, 3.4) }));
  function scatter(x, y) {
    minnows.forEach((m) => {
      const dx = m.x - x, dy = m.y - y, d = Math.hypot(dx, dy);
      if (d < 260) { const k = (1 - d / 260) * 400 / (d || 1); m.vx += dx * k; m.vy += dy * k; }
    });
  }
  function tinyFish(x, y, s, dir) {
    cx.save(); cx.translate(x, y); cx.scale(dir * s, s);
    cx.beginPath(); cx.ellipse(0, 0, 7, 3.5, 0, 0, TAU); cx.moveTo(-6, 0); cx.lineTo(-12, -4); cx.lineTo(-12, 4); cx.fill();
    cx.restore();
  }
  function drawLife(dt) {
    cx.fillStyle = '#04101A'; cx.globalAlpha = 0.16;
    sils.forEach((f) => {
      f.x += f.v * dt;
      if (f.x > W + 250) f.x = -250; else if (f.x < -250) f.x = W + 250;
      tinyFish(f.x, f.y, f.s * 9, f.v > 0 ? 1 : -1);
    });
    cx.fillStyle = '#7FF5FF'; cx.globalAlpha = 0.5;
    minnows.forEach((m) => {
      const damp = 1 - Math.min(1, dt * 1.5);
      m.vx *= damp; m.vy *= damp;
      m.x += (m.vx + 30 * m.d) * dt; m.y = clamp(m.y + m.vy * dt, 0, H);
      if (m.x > W + 20) { m.x = -20; m.y = rnd(0, H); } else if (m.x < -20) m.x = W + 20;
      tinyFish(m.x, m.y, m.d * 0.9, 1);
    });
    cx.globalAlpha = 1;
  }

  /* ---- Main loop ---- */
  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    cx.clearRect(0, 0, W, H);
    drawLife(dt);
    // plankton
    cx.fillStyle = 'rgba(160,255,250,.7)';
    plankton.forEach((p) => {
      p.x += (p.vx / W) * dt; p.y += (p.vy / H) * dt; p.ph += dt;
      if (pointerActive(now)) {
        const dx = p.x * W - ptr.x, dy = p.y * H - ptr.y, dd = Math.hypot(dx, dy);
        if (dd < 120 && dd > 1) { p.x += (dx / dd) * 90 * dt / W; p.y += (dy / dd) * 90 * dt / H; }
      }
      if (p.x < 0) p.x = 1;
      if (p.x > 1) p.x = 0;
      if (p.y < 0) p.y = 1;
      if (p.y > 1) p.y = 0;
      cx.globalAlpha = 0.35 + 0.35 * Math.sin(p.ph * 1.5);
      cx.fillRect(p.x * W, p.y * H, p.r, p.r);
    });
    // bubbles
    cx.lineWidth = 1.5; cx.strokeStyle = 'rgba(220,255,255,.55)'; cx.globalAlpha = 0.7;
    bubbles.forEach((b) => {
      b.y -= (b.v / H) * dt; b.ph += dt * 1.5;
      if (b.y < -0.05) { b.y = 1.05; b.x = rnd(0, 1); }
      const bx = b.x * W + Math.sin(b.ph) * 12;
      cx.beginPath(); cx.arc(bx, b.y * H, b.r, 0, TAU); cx.stroke();
    });
    cx.globalAlpha = 1;

    fish.forEach((f) => { f.update(dt, now); f.draw(now); });

    // bite sparks
    cx.globalCompositeOperation = 'lighter';
    for (let i = sparks.length - 1; i >= 0; i--) {
      const s = sparks[i];
      s.life -= dt;
      if (s.life <= 0) { sparks.splice(i, 1); continue; }
      s.x += s.vx * dt; s.y += s.vy * dt; s.vx *= 0.96; s.vy *= 0.96;
      drawGlow(s.x, s.y, s.r * 4, s.life / s.max);
    }
    cx.globalCompositeOperation = 'source-over';
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();