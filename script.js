/* ==========================================================================
   Najee M. Ahmad - Underwater Portfolio  |  script.js
   --------------------------------------------------------------------------
   1.  Helpers
   2.  Pixel-art sprite engine (all art is drawn from text grids)
   3.  Scenery builders (clouds, creatures, particles, bubbles, reef)
   4.  Navigation and smooth scrolling
   5.  Scroll engine (depth, parallax, gauge, active zone)
   6.  Scroll-reveal
   7.  Hobby / skill cards
   8.  Project modal
   9.  Small extras (image fallbacks, copy email, year)
   ========================================================================== */
(function () {
  'use strict';

  /* ------------------------------ 1. HELPERS ----------------------------- */
  const $  = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
  const rand = (min, max) => Math.random() * (max - min) + min;
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const clamp = (v, min = 0, max = 1) => Math.min(max, Math.max(min, v));

  const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  const reducedMotion = () => motionQuery.matches;

  /* ------------------------ 2. PIXEL SPRITE ENGINE ----------------------- */
  // A sprite is an array of strings. Each character is a palette key; "." is empty.
  function makeGrid(w, h) {
    return Array.from({ length: h }, () => Array(w).fill('.'));
  }
  function put(g, x, y, c) {
    if (y >= 0 && y < g.length && x >= 0 && x < g[0].length) g[y][x] = c;
  }
  function span(g, y, x0, x1, c) {
    for (let x = x0; x < x1; x++) put(g, x, y, c);
  }
  function gridRows(g) {
    return g.map((r) => r.join(''));
  }

  function buildSvg(rows, pal) {
    const h = rows.length;
    const w = Math.max.apply(null, rows.map((r) => r.length));
    let rects = '';
    rows.forEach((row, y) => {
      let x = 0;
      while (x < row.length) {
        const c = row[x];
        if (!pal[c]) { x++; continue; }
        let x2 = x + 1;
        while (x2 < row.length && row[x2] === c) x2++;
        rects += '<rect x="' + x + '" y="' + y + '" width="' + (x2 - x) + '" height="1" fill="' + pal[c] + '"/>';
        x = x2;
      }
    });
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + w + ' ' + h +
      '" shape-rendering="crispEdges" preserveAspectRatio="xMidYMid meet" aria-hidden="true" focusable="false">' +
      rects + '</svg>';
  }

  /* ---- Procedural sprites ---- */
  function sharkSprite() {
    const g = makeGrid(40, 12);
    const R = [
      [0, [20, 22]], [1, [19, 24]], [2, [18, 26]], [3, [17, 28]],
      [4, [2, 5], [12, 31]], [5, [3, 7], [9, 35]], [6, [4, 38]], [7, [5, 40]], [8, [4, 39]],
      [9, [3, 7], [10, 36], [22, 26]], [10, [2, 5], [14, 30], [23, 28]], [11, [1, 4], [24, 28]]
    ];
    R.forEach((row) => {
      for (let i = 1; i < row.length; i++) span(g, row[0], row[i][0], row[i][1], 's');
    });
    put(g, 33, 6, 'e');
    return { rows: gridRows(g), pal: { s: '#06152A', e: '#9FE8FF' } };
  }

  function krakenSprite() {
    const g = makeGrid(40, 17);
    const body = [[14, 26], [10, 30], [7, 33], [5, 35], [4, 36], [3, 37], [2, 38], [2, 38], [1, 39], [1, 39], [1, 39], [1, 39], [1, 39], [2, 38], [3, 37]];
    body.forEach((r, y) => span(g, y, r[0], r[1], 'k'));
    span(g, 1, 12, 18, 'h'); span(g, 2, 9, 15, 'h'); span(g, 3, 7, 12, 'h'); span(g, 4, 6, 10, 'h');
    [[20, 3], [24, 4], [17, 5], [28, 6], [13, 6], [31, 8]].forEach((p) => { put(g, p[0], p[1], 'd'); put(g, p[0] + 1, p[1], 'd'); });
    span(g, 8, 6, 14, 'd'); span(g, 8, 26, 34, 'd');
    for (let y = 9; y <= 12; y++) { span(g, y, 7, 13, 'e'); span(g, y, 27, 33, 'e'); }
    
    span(g, 14, 17, 23, 'd');
    [[3, 8], [11, 15], [25, 29], [32, 37]].forEach((r) => span(g, 15, r[0], r[1], 'k'));
    [[3, 6], [12, 14], [26, 28], [33, 36]].forEach((r) => span(g, 16, r[0], r[1], 'k'));
    return { rows: gridRows(g), pal: { k: '#43205F', h: '#6B3A92', d: '#2A1240', e: '#FF8A1F', p: '#1A0500' } };
  }

  function tentacleSprite() {
    const W = 34, H = 64;
    const g = makeGrid(W, H);
    for (let y = 0; y < H; y++) {
      const s = y / (H - 1); // 0 = tip, 1 = base
      const half = Math.max(0, Math.round(0.5 + s * 3.2));
      const c = Math.round(W - 4 - 17 * Math.pow(1 - s, 1.7) + 3 * Math.sin(s * 10) * (1 - s * 0.6));
      for (let x = c - half; x <= c + half; x++) put(g, x, y, 'k');
      put(g, c - half, y, 'h');
      if (y % 3 === 1 && half >= 2) put(g, c - half + 1, y, 's');
    }
    return { rows: gridRows(g), pal: { k: '#43205F', h: '#6B3A92', s: '#D9A0E8' } };
  }

  function palmSprite() {
    const g = makeGrid(28, 34);
    const trunkX = (t) => Math.round(10 + t * 3 + Math.sin(t * 2) * 1.2);
    for (let y = 33; y >= 12; y--) {
      const x = trunkX((33 - y) / 21);
      put(g, x, y, 't'); put(g, x + 1, y, 't');
      if (y % 3 === 0) put(g, x + 1, y, 'u');
    }
    const cx = trunkX(1) + 1, cy = 11;
    // [direction, length, lift, droop]
    [[1, 11, 4, 2.0], [-1, 11, 4, 2.0], [1, 8, 2, 1.6], [-1, 8, 2, 1.6], [1, 6, 5, 3], [-1, 6, 5, 3]].forEach((f) => {
      const dir = f[0], len = f[1], lift = f[2], droop = f[3];
      for (let t = 0; t <= len; t++) {
        const x = cx + dir * t;
        const y = cy - Math.round(lift * Math.sin(Math.PI * t / (len * 1.3))) + Math.round(t * t / (len * droop * 1.1));
        if (t > 1 && g[y - 1] && g[y - 1][x] === '.') put(g, x, y - 1, 'h');
        put(g, x, y, 'g'); put(g, x, y + 1, 'g');
      }
    });
    put(g, cx - 1, cy + 1, 'n'); put(g, cx + 1, cy + 2, 'n'); put(g, cx, cy + 2, 'n');
    return { rows: gridRows(g), pal: { t: '#8A5A2B', u: '#6A4020', g: '#2EA05A', h: '#5CC97A', n: '#4A2D12' } };
  }

  function seaweedSprite() {
    const w = 8, h = 28;
    const g = makeGrid(w, h);
    for (let y = 0; y < h; y++) {
      const x = Math.round(3 + 1.8 * Math.sin((h - y) / 3.5));
      put(g, x, y, 'g'); put(g, x + 1, y, 'g');
      if ((h - y) % 7 === 3) put(g, x - 1, y, 'h');
      if ((h - y) % 7 === 0) put(g, x + 2, y, 'h');
    }
    return { rows: gridRows(g), pal: { g: '#2FA866', h: '#6FE096' } };
  }

  const SPRITES = {
    fish: {
      rows: [
        '....bbbbbb....',
        '.f.bbbbbbbbb..',
        'fffbbbbbbbbwkb',
        'ffffbbbbbbbbbb',
        'fffbllllllllbb',
        '.f.bllllllll..',
        '....bbbbbb....'
      ],
      pal: { b: '#FF9F43', l: '#FFD9A0', f: '#E8742A', w: '#FFFFF0', k: '#0B1F33' }
    },
    jelly: {
      rows: [
        '...ccccc...',
        '..ccccccc..',
        '.ccccccccc.',
        '.cgcccccgc.',
        'ccccccccccc',
        'ccccccccccc',
        '.c.c.c.c.c.',
        '.c.c...c.c.',
        '..c.c.c.c..',
        '.c...c...c.',
        '..c.....c..'
      ],
      pal: { c: '#7FF5FF', g: '#E6FFFF' }
    },
    crab: {
      rows: [
        'rr..k..k..rr',
        'rr..r..r..rr',
        '.rrrrrrrrrr.',
        '..rrrrrrrr..',
        '..rrrrrrrr..',
        '.r.r.r..r.r.'
      ],
      pal: { r: '#FF6B4A', k: '#0B1F33' }
    },
    starfish: {
      rows: [
        '....o....',
        '....o....',
        '...ooo...',
        'ooooooooo',
        '.ooooooo.',
        '..ooooo..',
        '..oo.oo..',
        '.oo...oo.',
        '.o.....o.'
      ],
      pal: { o: '#FF9F43' }
    },
    coral: {
      rows: [
        'p.....p....p..',
        'pp....pp...pp.',
        '.pp..pp...pp..',
        '.ppppppp.ppp..',
        '..ppqppppqpp..',
        '...pppppppp...',
        '....pppppp....',
        '....pppppp....',
        '...pppppppp...'
      ],
      pal: { p: '#FF7F9F', q: '#FFC0D0' }
    },
    cloud: {
      rows: [
        '......wwww..........',
        '....wwwwwwww..wwww..',
        '..wwwwwwwwwwwwwwwwww',
        '.wwwwwwwwwwwwwwwwwww',
        'wwwwwwwwwwwwwwwwwwww',
        '.ssssssssssssssssss.'
      ],
      pal: { w: '#FFFFFF', s: '#CFE9F7' }
    },
    'icon-browser': {
      rows: [
        'cccccccccc', 'cnnnnnnnnc', 'cnnnnnnnnc', 'cccccccccc', 'ciiiiiiiic',
        'ciooiyyyic', 'ciooiiiiic', 'ciiiiiiiic', 'cccccccccc'
      ],
      pal: { c: '#63D6D0', n: '#2E6F8E', i: '#FFFFF0', o: '#FF9F43', y: '#FFD93D' }
    },
    'icon-braces': {
      rows: [
        '..cc..cc..', '..c....c..', '..c....c..', '.c......c.', 'c........c',
        '.c......c.', '..c....c..', '..c....c..', '..cc..cc..'
      ],
      pal: { c: '#FFD93D' }
    },
    'icon-chip': {
      rows: [
        '..c.c.c.c..', '.nnnnnnnnn.', 'cnyyyyyyync', '.nyyoooyyn.', 'cnyyoooyync',
        '.nyyyyyyyn.', 'cnyyyyyyync', '.nnnnnnnnn.', '..c.c.c.c..'
      ],
      pal: { c: '#FFD93D', n: '#20B2AA', y: '#123B58', o: '#63D6D0' }
    },
    'icon-magnifier': {
      rows: [
        '..cccc....', '.c....c...', 'c.i....c..', 'c......c..', 'c......c..',
        'c......c..', '.c....c...', '..cccco...', '.......oo.', '........oo'
      ],
      pal: { c: '#63D6D0', i: '#FFFFF0', o: '#FF9F43' }
    },
    'icon-network': {
      rows: [
        '....ccc....', '....ccc....', '.....i.....', '.....i.....',
        '.iiiiiiiii.', '.i...i...i.', 'ccc.ccc.ccc', 'ccc.ccc.ccc'
      ],
      pal: { c: '#63D6D0', i: '#FFFFF0' }
    },
    'icon-gamepad': {
      rows: [
        '.ccccccccc.', 'ccciccccocc', 'cciiiccococ', 'ccciccccocc', 'ccccccccccc', '.cc.....cc.'
      ],
      pal: { c: '#7C8CFF', i: '#FFFFF0', o: '#FF7F9F' }
    },
    'icon-headphones': {
      rows: [
        '..cccccc..', '.c......c.', 'c........c', 'c........c', 'co......oc', 'co......oc', 'co......oc'
      ],
      pal: { c: '#63D6D0', o: '#FF7F9F' }
    },
    'icon-palette': {
      rows: [
        '..oooooo..', '.oooooooo.', 'ooyooopooo', 'oooooooooo', 'ooddooogoo', '.oooooooo.', '..oooooo..'
      ],
      pal: { o: '#E8B07A', p: '#FF7F9F', y: '#FFD93D', g: '#4CC27A', d: '#0B1F33' }
    }
  };
  SPRITES.shark = sharkSprite();
  SPRITES.kraken = krakenSprite();
  SPRITES.tentacle = tentacleSprite();
  SPRITES.palm = palmSprite();
  SPRITES.seaweed = seaweedSprite();

  /* ---- Update 2 sprites: boys, anglerfish, sport icons ---- */
  function anglerSprite() {
    const W = 46, H = 28;
    const g = makeGrid(W, H);
    const cx = 22, cy = 16, rx = 17, ry = 9;
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const d = Math.pow((x - cx) / rx, 2) + Math.pow((y - cy) / ry, 2);
        if (d <= 1) put(g, x, y, y > cy + 3 ? 'l' : 'b');
        else if (d <= 1.14 && y <= cy) put(g, x, y, 'd');
      }
    }
    // tail
    for (let i = 0; i < 9; i++) { span(g, cy - 4 + Math.round(i * 0.5), 5 - Math.floor(i / 2), 8, 'f'); span(g, cy + 4 - Math.round(i * 0.5), 5 - Math.floor(i / 2), 8, 'f'); }
    span(g, cy - 1, 0, 8, 'f'); span(g, cy, 0, 8, 'f'); span(g, cy + 1, 0, 8, 'f');
    // dorsal and pectoral fins
    for (let i = 0; i < 6; i++) span(g, 6 + i, 15 + i, 24 - i, 'f');
    for (let i = 0; i < 5; i++) span(g, cy + 5 + i, 18 - i, 24, 'f');
    // mouth: dark gap with teeth along the front
    for (let y = cy + 1; y <= cy + 4; y++) span(g, y, 33, 40, 'm');
    for (let x = 33; x <= 39; x += 3) { put(g, x, cy + 1, 't'); put(g, x, cy + 2, 't'); }
    for (let x = 34; x <= 40; x += 3) { put(g, x, cy + 4, 't'); put(g, x, cy + 3, 't'); }
    // eye
    span(g, cy - 4, 31, 35, 'e'); span(g, cy - 3, 31, 35, 'e'); put(g, 34, cy - 3, 'k'); put(g, 33, cy - 3, 'k');
    // stalk (esca) arching over the mouth, with lure at the tip
    const stalk = [[27, 8], [28, 6], [29, 5], [31, 4], [33, 3], [35, 3], [37, 3], [38, 4], [38, 5], [38, 6]];
    stalk.forEach((p) => put(g, p[0], p[1], 's'));
    span(g, 7, 37, 41, 'g'); span(g, 8, 37, 41, 'g'); span(g, 9, 38, 40, 'g');
    put(g, 38, 7, 'G'); put(g, 39, 8, 'G');
    return { rows: gridRows(g), pal: { b: '#3A5070', d: '#1B2A40', l: '#53708F', f: '#243650', m: '#06101C', t: '#E8F4FF', e: '#CFF8FF', k: '#04101A', s: '#2A3C57', g: '#7FF5FF', G: '#FFFFFF' } };
  }
  SPRITES.angler = anglerSprite();

  SPRITES['boy-swim'] = {
    rows: [
      '....hhhhh.....',
      '...hhhhhhh..ss',
      '...sssssss..ss',
      '...sssskss..s.',
      '...sssssss.ss.',
      '....sss.ssss..',
      '..ssssssssss..',
      'wwwwwwwwwwwwww',
      '.wwwwwwwwwwww.'
    ],
    pal: { s: '#E8B07A', h: '#2B1B12', k: '#0B1F33', w: '#63D6D0' }
  };
  SPRITES['boy-sit'] = {
    rows: [
      '....hhhhh....',
      '...hhhhhhh...',
      '...sssssss...',
      '...ssssskss..',
      '...sssssss...',
      '....sss......',
      '..ttttttt....',
      '.sttttttttss.',
      's.ttttttttss.',
      '..bbbbbbbbbs.',
      '..bbbbbbbbbs.',
      '..sss.....sss',
      '..ss......sss'
    ],
    pal: { s: '#E8B07A', h: '#2B1B12', k: '#0B1F33', t: '#FF6B4A', b: '#4FA3FF' }
  };
  SPRITES['boy-lie'] = {
    rows: [
      '................hhhh.',
      '...............hhhhhh',
      '...............ssskss',
      '...ttttttt...ssssssss',
      'bbbtttttttttsssss....',
      'bbbbbtttttttss.......',
      'sbbb.................',
      'ss...................'
    ],
    pal: { s: '#C98F5A', h: '#1A110C', k: '#0B1F33', t: '#FFD93D', b: '#7C8CFF' }
  };
  SPRITES['icon-ball'] = {
    rows: ['..oooooo..', '.ooonoooo.', 'oonnnnnnoo', 'ooooNooooo', 'oonnnnnnoo', 'oooonoooo.', '.ooonoooo.', '..oooooo..'].map(function (r) { return r.replace('N', 'n'); }),
    pal: { o: '#FF9F43', n: '#0B1F33' }
  };
  SPRITES['icon-shoe'] = {
    rows: ['.....cc.....', '....cccc....', '....cccc....', '...cccccc...', 'ccccccccccc.', 'cwwwwwwwwwwc', 'wwwwwwwwwwww'],
    pal: { c: '#63D6D0', w: '#FFFFF0' }
  };
  SPRITES['icon-dumbbell'] = {
    rows: ['cc......cc', 'cc......cc', 'ccgggggcc.', 'ccgggggcc.', 'cc......cc', 'cc......cc'].map(function (r) { return r.slice(0, 10); }),
    pal: { c: '#63D6D0', g: '#FFFFF0' }
  };

  const PALETTES = {
    turq:   { b: '#63D6D0', l: '#D8FFFC', f: '#20B2AA' },
    orange: { b: '#FF9F43', l: '#FFD9A0', f: '#E8742A' },
    blue:   { b: '#4FA3FF', l: '#BFE0FF', f: '#2C6FD6' },
    yellow: { b: '#FFD93D', l: '#FFF2A8', f: '#E3A91A' },
    pink:   { b: '#FF7F9F', l: '#FFD0DC', f: '#D9547A' },
    green:  { b: '#6FD68C', l: '#CFF5D8', f: '#3BA35A' },
    dim:    { b: '#2B7A94', l: '#4E9FB5', f: '#1D5A74' },
    coralPink:   { p: '#FF7F9F', q: '#FFC0D0' },
    coralOrange: { p: '#FF9F43', q: '#FFD08A' },
    coralPurple: { p: '#B47CFF', q: '#E0C8FF' },
    jellyCyan:   { c: '#7FF5FF', g: '#E6FFFF' },
    jellyPink:   { c: '#FF9BD2', g: '#FFE0F1' },
    jellyViolet: { c: '#B9A2FF', g: '#EEE6FF' },
    boyA: { s: '#E8B07A', h: '#2B1B12', w: '#63D6D0' },
    boyB: { s: '#C98F5A', h: '#6B3A1E', w: '#8CE8E3' },
    boyC: { s: '#F1C9A0', h: '#E3A91A', w: '#63D6D0' },
    boyD: { s: '#D9A06A', h: '#1A110C', t: '#4CC27A', b: '#FFD93D' },
    boyE: { s: '#B77C4A', h: '#0E0A08', t: '#FF7F9F', b: '#2C6FD6' }
  };

  const spriteCache = new Map();
  function renderSprite(name, paletteName) {
    const def = SPRITES[name];
    if (!def) return '';
    const key = name + '|' + (paletteName || '');
    if (!spriteCache.has(key)) {
      const pal = Object.assign({}, def.pal, PALETTES[paletteName] || {});
      spriteCache.set(key, buildSvg(def.rows, pal));
    }
    return spriteCache.get(key);
  }

  function mountSprites(scope) {
    $$('[data-sprite]', scope).forEach((el) => {
      el.innerHTML = renderSprite(el.dataset.sprite, el.dataset.palette);
    });
  }

  /* ------------------------- 3. SCENERY BUILDERS ------------------------- */
  function buildClouds() {
    const box = $('#clouds');
    if (!box) return;
    const specs = [
      { top: 9,  w: 190, dur: 150, delay: -20,  op: 0.95, x: 10 },
      { top: 20, w: 130, dur: 120, delay: -70,  op: 0.9,  x: 40 },
      { top: 30, w: 220, dur: 190, delay: -120, op: 0.8,  x: 5 },
      { top: 6,  w: 100, dur: 100, delay: -40,  op: 0.85, x: 55 },
      { top: 16, w: 160, dur: 170, delay: -150, op: 0.9,  x: 25 }
    ];
    specs.forEach((s) => {
      const c = document.createElement('div');
      c.className = 'cloud';
      c.style.cssText = 'top:' + s.top + '%;width:' + s.w + 'px;opacity:' + s.op +
        ';--x:' + s.x + '%;--dur:' + s.dur + 's;--delay:' + s.delay + 's;';
      c.innerHTML = renderSprite('cloud');
      box.appendChild(c);
    });
  }

  const FIELDS = {
    'fish-far': { count: 7, kind: 'fish',  w: [26, 40],   top: [6, 68],  dur: [70, 110],  op: [0.45, 0.65], palettes: ['turq', 'blue', 'yellow'] },
    'fish-mid': { count: 6, kind: 'fish',  w: [46, 72],   top: [10, 72], dur: [45, 70],   op: [0.9, 1],     palettes: ['orange', 'yellow', 'pink', 'blue', 'green'] },
    'sharks':   { count: 3, kind: 'shark', w: [320, 460], top: [6, 62],  dur: [110, 170], op: [0.55, 0.75] },
    'anglers':  { count: 6, kind: 'angler', w: [150, 340], top: [6, 84], dur: [55, 130], op: [0.55, 0.95] },
    'jellies':  { count: 8, kind: 'jelly', w: [34, 74],   top: [4, 84],  dur: [14, 26],   op: [0.75, 0.95], palettes: ['jellyCyan', 'jellyPink', 'jellyViolet'] }
  };

  function spawnField(field) {
    const cfg = FIELDS[field.dataset.field];
    if (!cfg) return;
    const frag = document.createDocumentFragment();
    for (let i = 0; i < cfg.count; i++) {
      const toLeft = cfg.kind !== 'jelly' && i % 2 === 1;
      const w = rand(cfg.w[0], cfg.w[1]);
      const dur = rand(cfg.dur[0], cfg.dur[1]);
      const el = document.createElement('div');
      el.className = 'creature creature-' + cfg.kind + (toLeft ? ' to-left' : '');
      el.style.cssText =
        '--x:' + rand(0, 60).toFixed(1) + '%;--w:' + w.toFixed(0) + 'px;--dur:' + dur.toFixed(1) +
        's;--delay:-' + rand(0, dur).toFixed(1) + 's;top:' + rand(cfg.top[0], cfg.top[1]).toFixed(1) +
        '%;opacity:' + rand(cfg.op[0], cfg.op[1]).toFixed(2) + ';';
      const pal = cfg.palettes ? pick(cfg.palettes) : undefined;
      let art = renderSprite(cfg.kind, pal);
      if (cfg.kind === 'angler') {
        art = '<span class="angler-wrap">' + art + '<i class="lure-glow"></i></span>';
      }
      el.innerHTML = '<div class="bob" style="--bob:' + rand(2.5, 5).toFixed(1) + 's;--bob-delay:-' +
        rand(0, 4).toFixed(1) + 's">' + art + '</div>';
      frag.appendChild(el);
    }
    field.appendChild(frag);
  }

  function spawnParticles(box) {
    const n = reducedMotion() ? 14 : 24;
    const frag = document.createDocumentFragment();
    for (let i = 0; i < n; i++) {
      const p = document.createElement('i');
      p.className = 'particle';
      p.style.cssText = 'left:' + rand(0, 100).toFixed(1) + '%;top:' + rand(0, 100).toFixed(1) +
        '%;--s:' + pick([2, 3, 4]) + 'px;--dur:' + rand(7, 16).toFixed(1) + 's;--delay:-' +
        rand(0, 16).toFixed(1) + 's;--dx:' + rand(-20, 20).toFixed(0) + 'px;';
      frag.appendChild(p);
    }
    box.appendChild(frag);
  }

  function spawnBubbles() {
    const box = $('#bubbles');
    if (!box) return;
    const frag = document.createDocumentFragment();
    for (let i = 0; i < 26; i++) {
      const b = document.createElement('span');
      b.className = 'bubble';
      b.style.cssText = 'left:' + rand(0, 100).toFixed(1) + '%;--s:' + pick([6, 8, 10, 12, 14, 18]) +
        'px;--dur:' + rand(10, 22).toFixed(1) + 's;--delay:-' + rand(0, 22).toFixed(1) +
        's;--sway:' + rand(-40, 40).toFixed(0) + 'px;';
      frag.appendChild(b);
    }
    box.appendChild(frag);
  }

  function buildReef() {
    const reef = $('#reef');
    if (!reef) return;
    const items = [
      { k: 'rock', l: -3, w: 170, h: 96, v: 'a' },
      { k: 's', s: 'coral', p: 'coralPink', l: 4, w: 104 },
      { k: 's', s: 'seaweed', l: 13, w: 34, sway: true },
      { k: 's', s: 'seaweed', l: 15.5, w: 28, sway: true },
      { k: 's', s: 'coral', p: 'coralOrange', l: 21, w: 76 },
      { k: 's', s: 'starfish', l: 30, w: 34, low: true },
      { k: 'rock', l: 33, w: 130, h: 70, v: 'b' },
      { k: 's', s: 'coral', p: 'coralPurple', l: 40, w: 110 },
      { k: 's', s: 'seaweed', l: 50, w: 36, sway: true },
      { k: 's', s: 'crab', l: 56, w: 52, low: true, scuttle: true },
      { k: 's', s: 'coral', p: 'coralPink', l: 63, w: 82 },
      { k: 'rock', l: 68, w: 150, h: 84, v: 'a' },
      { k: 's', s: 'seaweed', l: 77, w: 32, sway: true },
      { k: 's', s: 'coral', p: 'coralOrange', l: 82, w: 112 },
      { k: 's', s: 'seaweed', l: 92, w: 36, sway: true },
      { k: 'rock', l: 93, w: 140, h: 100, v: 'b' }
    ];
    const frag = document.createDocumentFragment();
    items.forEach((it) => {
      const el = document.createElement('div');
      if (it.k === 'rock') {
        el.className = 'reef-rock ' + it.v;
        el.style.cssText = 'left:' + it.l + '%;width:' + it.w + 'px;height:' + it.h + 'px;';
      } else {
        el.className = 'reef-item' + (it.low ? ' low' : '') + (it.sway ? ' sway' : '') + (it.scuttle ? ' scuttle' : '');
        el.style.cssText = 'left:' + it.l + '%;width:' + it.w + 'px;animation-delay:-' + rand(0, 5).toFixed(1) + 's;';
        el.innerHTML = renderSprite(it.s, it.p);
      }
      frag.appendChild(el);
    });
    reef.appendChild(frag);
  }

  /* ----------------- 4. NAVIGATION AND SMOOTH SCROLLING ------------------ */
  const header = $('#site-header');
  const navToggle = $('#nav-toggle');
  const navToggleLabel = $('#nav-toggle-label');
  const navMenu = $('#nav-menu');

  function setMenu(open) {
    if (!header || !navToggle) return;
    header.classList.toggle('is-open', open);
    navToggle.setAttribute('aria-expanded', String(open));
    if (navToggleLabel) navToggleLabel.textContent = open ? 'Close menu' : 'Open menu';
  }

  function scrollToZone(id) {
    const target = document.getElementById(id);
    if (!target) return;
    const top = id === 'surface' ? 0 : target.getBoundingClientRect().top + window.scrollY;
    window.scrollTo({ top: top, behavior: reducedMotion() ? 'auto' : 'smooth' });
    try { history.replaceState(null, '', '#' + id); } catch (err) { /* ignore (e.g. sandboxed previews) */ }
    target.setAttribute('tabindex', '-1');
    target.focus({ preventScroll: true });
  }

  function initNavigation() {
    if (navToggle) {
      navToggle.addEventListener('click', () => setMenu(!header.classList.contains('is-open')));
    }

    // Any link or button marked data-scroll / data-scroll-target
    document.addEventListener('click', (e) => {
      const el = e.target.closest('[data-scroll], [data-scroll-target]');
      if (!el) return;
      const id = el.dataset.scrollTarget || (el.getAttribute('href') || '').replace('#', '');
      if (!id || !document.getElementById(id)) return;
      e.preventDefault();
      setMenu(false);
      scrollToZone(id);
    });

    // Close the mobile menu with Escape or by clicking outside
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && header && header.classList.contains('is-open')) {
        setMenu(false);
        if (navToggle) navToggle.focus();
      }
    });
    document.addEventListener('click', (e) => {
      if (header && header.classList.contains('is-open') && !header.contains(e.target)) setMenu(false);
    });
    window.addEventListener('resize', () => { if (window.innerWidth > 860) setMenu(false); });
  }

  /* ---------------------- 5. SCROLL ENGINE (DEPTH) ----------------------- */
  const zones = $$('.zone');
  const zoneIds = zones.map((z) => z.id);
  const links = $$('[data-zone-link]');
  const ticks = $$('.gauge-tick');
  const layers = $$('.layer').map((el) => ({
    el: el,
    zone: zones.indexOf(el.closest('.zone')),
    speed: parseFloat(el.dataset.speed) || 0
  })).filter((l) => l.zone >= 0);
  const progressBar = $('#progress-bar');
  const gaugeFill = $('#gauge-fill');
  const gaugeMarker = $('#gauge-marker');
  const meters = $('#depth-meters');
  const bubbles = $('#bubbles');
  const vignette = $('#vignette');

  const METER_ANCHORS = [0, 12, 200, 3000, 10900]; // metres at: surface, shallows, abyss, depths, page bottom
  let tops = [], heights = [], maxScroll = 1;
  let activeZone = -1, queued = false, lastUw = -1, lastDepth = -1, lastMeters = '';

  function measure() {
    const y = window.scrollY;
    tops = zones.map((z) => z.getBoundingClientRect().top + y);
    heights = zones.map((z) => z.offsetHeight);
    maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    ticks.forEach((t) => {
      const i = parseInt(t.dataset.index, 10);
      if (tops[i] !== undefined) t.style.top = (clamp(tops[i] / maxScroll) * 100).toFixed(2) + '%';
    });
    requestUpdate();
  }

  function metersAt(y) {
    const pos = [0, tops[1], tops[2], tops[3], maxScroll];
    for (let i = 0; i < 4; i++) {
      if (y <= pos[i + 1] || i === 3) {
        const t = clamp((y - pos[i]) / Math.max(1, pos[i + 1] - pos[i]));
        return Math.round(METER_ANCHORS[i] + t * (METER_ANCHORS[i + 1] - METER_ANCHORS[i]));
      }
    }
    return 0;
  }

  function setActiveZone(idx) {
    activeZone = idx;
    links.forEach((a) => {
      const on = a.dataset.zoneLink === zoneIds[idx];
      a.classList.toggle('is-active', on);
      if (on) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current');
    });
  }

  function update() {
    queued = false;
    if (!tops.length) return;
    const y = window.scrollY;
    const vh = window.innerHeight;
    const p = clamp(y / maxScroll);

    // Progress bar + gauge
    if (progressBar) progressBar.style.transform = 'scaleX(' + p.toFixed(4) + ')';
    if (gaugeFill) gaugeFill.style.height = (p * 100).toFixed(2) + '%';
    if (gaugeMarker) gaugeMarker.style.top = (p * 100).toFixed(2) + '%';

    // Depth readout
    const m = metersAt(y).toLocaleString('en-US') + ' m';
    if (meters && m !== lastMeters) { meters.textContent = m; lastMeters = m; }

    // Underwater effects fade in as the shallows come into view
    const uw = clamp((y + vh * 0.55 - tops[1]) / (vh * 0.45));
    if (bubbles && Math.abs(uw - lastUw) > 0.01) { bubbles.style.opacity = uw.toFixed(2); lastUw = uw; }
    const dark = clamp(Math.pow(p, 1.15) * 1.1);
    if (vignette && Math.abs(dark - lastDepth) > 0.01) { vignette.style.opacity = dark.toFixed(2); lastDepth = dark; }

    // Active zone
    const line = y + vh * 0.35;
    let idx = 0;
    tops.forEach((t, i) => { if (line >= t) idx = i; });
    if (y >= maxScroll - 4) idx = zones.length - 1;
    if (idx !== activeZone) setActiveZone(idx);

    // Parallax layers
    if (!reducedMotion()) {
      const viewCenter = y + vh / 2;
      layers.forEach((l) => {
        const zTop = tops[l.zone], zH = heights[l.zone];
        const center = zTop + zH / 2;
        if (Math.abs(viewCenter - center) > zH / 2 + vh) return;
        const limit = zH * 0.12;
        const offset = clamp((viewCenter - center) * l.speed, -limit, limit);
        l.el.style.transform = 'translate3d(0,' + offset.toFixed(1) + 'px,0)';
      });
    }
  }

  function requestUpdate() {
    if (!queued) { queued = true; window.requestAnimationFrame(update); }
  }

  function initScrollEngine() {
    measure();
    window.addEventListener('scroll', requestUpdate, { passive: true });
    window.addEventListener('resize', measure);
    window.addEventListener('load', measure);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);
    if ('ResizeObserver' in window) {
      let pending = false;
      new ResizeObserver(() => {
        if (pending) return;
        pending = true;
        window.requestAnimationFrame(() => { pending = false; measure(); });
      }).observe(document.body);
    }

    // Pause animations in zones that are far off-screen
    if ('IntersectionObserver' in window) {
      const vis = new IntersectionObserver((entries) => {
        entries.forEach((e) => e.target.classList.toggle('is-offscreen', !e.isIntersecting));
      }, { rootMargin: '150px 0px' });
      zones.forEach((z) => vis.observe(z));
    }

    motionQuery.addEventListener
      ? motionQuery.addEventListener('change', () => { layers.forEach((l) => { l.el.style.transform = ''; }); requestUpdate(); })
      : null;
  }

  /* --------------------------- 6. SCROLL-REVEAL -------------------------- */
  function initReveal() {
    $$('[data-stagger]').forEach((group) => {
      $$(':scope > .reveal', group).forEach((el, i) => el.style.setProperty('--d', (i * 0.08).toFixed(2) + 's'));
    });
    const els = $$('.reveal');
    if ('IntersectionObserver' in window && !reducedMotion()) {
      const io = new IntersectionObserver((entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) { e.target.classList.add('is-visible'); io.unobserve(e.target); }
        });
      }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
      els.forEach((el) => io.observe(el));
    } else {
      els.forEach((el) => el.classList.add('is-visible'));
    }
  }

  /* ------------------------ 7. HOBBY / SKILL CARDS ----------------------- */
  function initCards() {
    $$('.card-toggle').forEach((btn) => {
      btn.addEventListener('click', () => {
        const card = btn.closest('.card');
        const open = btn.getAttribute('aria-expanded') === 'true';
        btn.setAttribute('aria-expanded', String(!open));
        card.classList.toggle('is-open', !open);
      });
    });
    $$('.meter').forEach((m) => {
      const level = parseInt(m.dataset.level, 10) || 0;
      for (let i = 0; i < 5; i++) {
        const seg = document.createElement('i');
        if (i < level) seg.className = 'on';
        m.appendChild(seg);
      }
    });
  }

  /* --------------------------- 8. PROJECT MODAL -------------------------- */
  const modal = $('#project-modal');
  const modalBody = $('#modal-body');
  const modalClose = $('#modal-close');
  let lastOpener = null;

  function openProject(btn) {
    const source = document.getElementById(btn.dataset.projectOpen);
    if (!source || !modal || !modalBody) return;
    modalBody.innerHTML = source.innerHTML;
    const title = $('h3', modalBody);
    if (title) title.id = 'modal-title';
    wireImages(modalBody);
    lastOpener = btn;
    document.body.classList.add('modal-open');
    if (typeof modal.showModal === 'function') modal.showModal(); else modal.setAttribute('open', '');
    modalBody.parentElement.scrollTop = 0;
  }

  function closeProject() {
    if (!modal) return;
    if (typeof modal.close === 'function' && modal.open) modal.close(); else onModalClosed();
  }

  function onModalClosed() {
    modal.removeAttribute('open');
    document.body.classList.remove('modal-open');
    if (lastOpener) { lastOpener.focus(); lastOpener = null; }
  }

  function initModal() {
    $$('[data-project-open]').forEach((btn) => btn.addEventListener('click', () => openProject(btn)));
    if (!modal) return;
    if (modalClose) modalClose.addEventListener('click', closeProject);
    modal.addEventListener('click', (e) => { if (e.target === modal) closeProject(); }); // click on backdrop
    modal.addEventListener('close', onModalClosed);
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && modal.hasAttribute('open') && typeof modal.showModal !== 'function') closeProject();
    });
  }

  /* ------------------------------ 9. EXTRAS ------------------------------ */
  // Hide broken images so the placeholder underneath is visible
  function wireImages(scope) {
    $$('img[data-fallback]', scope).forEach((img) => {
      const fail = () => img.classList.add('is-missing');
      img.addEventListener('error', fail, { once: true });
      if (img.complete && img.naturalWidth === 0) fail();
    });
  }

  const toast = $('#toast');
  let toastTimer = null;
  function showToast(msg) {
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 2600);
  }

  function initCopyEmail() {
    const btn = $('#copy-email');
    const link = $('#email-link');
    if (!btn || !link) return;
    btn.addEventListener('click', async () => {
      const email = link.textContent.trim();
      try {
        await navigator.clipboard.writeText(email);
        showToast('Email copied to clipboard!');
      } catch (err) {
        const range = document.createRange();
        range.selectNodeContents(link);
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
        showToast('Email selected. Press Ctrl+C (or Cmd+C) to copy.');
      }
    });
  }

  /* ------------------------- 10. SKILL BARS (UPDATE 2) -------------------- */
  function initSkillBars() {
    const bars = $$('.skill-bar');
    if (!bars.length) return;

    function fill(bar) {
      const level = clamp(parseFloat(bar.dataset.level) || 0, 0, 100);
      const fillEl = $('.skill-fill', bar);
      const label = bar.closest('.skill').querySelector('[data-pct]');
      bar.setAttribute('aria-valuenow', String(Math.round(level)));
      if (fillEl) fillEl.style.width = level + '%';
      if (!label) return;
      if (reducedMotion()) { label.textContent = Math.round(level) + '%'; return; }
      const start = performance.now(), dur = 1400;
      (function tick(now) {
        const t = clamp((now - start) / dur);
        const eased = 1 - Math.pow(1 - t, 3);
        label.textContent = Math.round(level * eased) + '%';
        if (t < 1) window.requestAnimationFrame(tick);
      })(start);
    }

    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver((entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) { fill(e.target); io.unobserve(e.target); }
        });
      }, { threshold: 0.4 });
      bars.forEach((b) => io.observe(b));
    } else {
      bars.forEach(fill);
    }
  }

  /* ------------------------- 11. FISH CURSOR (UPDATE 2) ------------------- */
  function initFishCursor() {
    const fine = window.matchMedia('(hover: hover) and (pointer: fine)');
    if (!fine.matches) return; // touch devices keep the normal cursor

    const fish = document.createElement('div');
    fish.className = 'fish-cursor';
    fish.setAttribute('aria-hidden', 'true');
    fish.innerHTML = '<div class="fish-flip"><div class="fish-bob">' +
      '<i class="fish-tail"></i><i class="fish-body"></i><i class="fish-fin"></i></div></div>';
    document.body.appendChild(fish);
    document.documentElement.classList.add('has-fish');

    let tx = -100, ty = -100, x = -100, y = -100, facingLeft = false, seen = false, raf = 0;
    const ease = reducedMotion() ? 1 : 0.18;

    function frame() {
      raf = 0;
      const dx = tx - x;
      x += dx * ease;
      y += (ty - y) * ease;
      if (Math.abs(dx) > 1.5) {
        const left = dx < 0;
        if (left !== facingLeft) { facingLeft = left; fish.classList.toggle('face-left', left); }
      }
      fish.style.transform = 'translate3d(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px,0)';
      if (Math.abs(tx - x) > 0.3 || Math.abs(ty - y) > 0.3) raf = window.requestAnimationFrame(frame);
    }
    function kick() { if (!raf) raf = window.requestAnimationFrame(frame); }

    window.addEventListener('mousemove', (e) => {
      tx = e.clientX; ty = e.clientY;
      if (!seen) { seen = true; x = tx; y = ty; fish.classList.add('is-on'); }
      kick();
    }, { passive: true });
    document.addEventListener('mouseleave', () => fish.classList.remove('is-on'));
    document.addEventListener('mouseenter', () => { if (seen) fish.classList.add('is-on'); });

    // If the device switches to touch, restore the normal cursor
    const off = () => {
      if (fine.matches) return;
      document.documentElement.classList.remove('has-fish');
      fish.remove();
    };
    if (fine.addEventListener) fine.addEventListener('change', off);
  }

  /* ------------------------ 12. MORE ABOUT ME PAGE (UPDATE 2) ------------- */
  function initAboutPage() {
    const page = $('#about-page');
    const scroller = $('#about-scroll');
    const openBtn = $('#open-about');
    if (!page || !scroller || !openBtn) return;
    const closeBtns = [$('#about-back'), $('#about-back-2')].filter(Boolean);
    let revealIO = null;

    function observeReveals() {
      const els = $$('.reveal', page);
      els.forEach((el) => el.classList.remove('is-visible'));
      if (revealIO) revealIO.disconnect();
      if ('IntersectionObserver' in window && !reducedMotion()) {
        revealIO = new IntersectionObserver((entries) => {
          entries.forEach((e) => {
            if (e.isIntersecting) { e.target.classList.add('is-visible'); revealIO.unobserve(e.target); }
          });
        }, { root: scroller, threshold: 0.12 });
        els.forEach((el) => revealIO.observe(el));
      } else {
        els.forEach((el) => el.classList.add('is-visible'));
      }
    }

    function open() {
      page.hidden = false;
      document.body.classList.add('modal-open');
      scroller.scrollTop = 0;
      observeReveals();
      window.requestAnimationFrame(() => {
        page.classList.add('is-open');
        scroller.focus({ preventScroll: true });
      });
      openBtn.setAttribute('aria-expanded', 'true');
    }
    function close() {
      page.classList.remove('is-open');
      document.body.classList.remove('modal-open');
      openBtn.setAttribute('aria-expanded', 'false');
      window.setTimeout(() => { if (!page.classList.contains('is-open')) page.hidden = true; }, reducedMotion() ? 0 : 480);
      openBtn.focus({ preventScroll: true });
    }

    openBtn.addEventListener('click', open);
    closeBtns.forEach((b) => b.addEventListener('click', close));
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && page.classList.contains('is-open')) close();
    });

    // Keep keyboard focus inside the page while it is open
    page.addEventListener('keydown', (e) => {
      if (e.key !== 'Tab') return;
      const f = $$('button, a[href]', page).filter((n) => n.offsetParent !== null);
      if (!f.length) return;
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });

    // Gentle parallax for the creature layer while scrolling the page
    const layer = $('.layer', page);
    if (layer && !reducedMotion()) {
      scroller.addEventListener('scroll', () => {
        layer.style.transform = 'translate3d(0,' + (-scroller.scrollTop * 0.08).toFixed(1) + 'px,0)';
      }, { passive: true });
    }

    // Bubbles for the page (reuses the .bubble style)
    const box = $('#about-bubbles');
    if (box) {
      const frag = document.createDocumentFragment();
      for (let i = 0; i < 16; i++) {
        const b = document.createElement('span');
        b.className = 'bubble';
        b.style.cssText = 'left:' + rand(0, 100).toFixed(1) + '%;--s:' + pick([6, 8, 10, 14]) +
          'px;--dur:' + rand(12, 24).toFixed(1) + 's;--delay:-' + rand(0, 24).toFixed(1) +
          's;--sway:' + rand(-30, 30).toFixed(0) + 'px;';
        frag.appendChild(b);
      }
      box.appendChild(frag);
    }
  }

  /* ------------------------ KRAKEN PUPILS FOLLOW THE CURSOR -------------- */
  function initKrakenPupils() {
    const head = $('.kraken-head');
    if (!head) return;
    const pupils = ['l', 'r'].map((side) => {
      const p = document.createElement('i');
      p.className = 'kpupil ' + side;
      head.appendChild(p);
      return p;
    });
    let px = null, py = null, queued = false;
    function aim() {
      queued = false;
      const r = head.getBoundingClientRect();
      if (px === null || r.bottom < 0 || r.top > window.innerHeight) return;
      const cell = r.width / 40;
      pupils.forEach((p, i) => {
        const cx = r.left + r.width * (i ? 0.75 : 0.25), cy = r.top + r.height * (11 / 17);
        const nx = clamp((px - cx) / 220, -1, 1), ny = clamp((py - cy) / 220, -1, 1);
        p.style.transform = 'translate(' + (Math.round(nx * 2) * cell).toFixed(1) + 'px,' +
          (Math.round(ny) * 0.5 * cell).toFixed(1) + 'px)';
      });
    }
    const request = () => { if (!queued) { queued = true; window.requestAnimationFrame(aim); } };
    window.addEventListener('pointermove', (e) => { px = e.clientX; py = e.clientY; request(); }, { passive: true });
    window.addEventListener('scroll', request, { passive: true });
  }

  /* ------------------------------- START UP ------------------------------ */
  function init() {
    mountSprites(document);
    initKrakenPupils();
    buildClouds();
    buildReef();
    $$('[data-field]').forEach(spawnField);
    $$('[data-particles]').forEach(spawnParticles);
    spawnBubbles();

    initNavigation();
    initReveal();
    initCards();
    initModal();
    initCopyEmail();
    wireImages(document);
    initSkillBars();
    initFishCursor();
    initAboutPage();

    const year = $('#year');
    if (year) year.textContent = new Date().getFullYear();

    initScrollEngine();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();