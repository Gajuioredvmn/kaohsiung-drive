// ===================== the illustrated city (插畫風): the atlas painted with ink lines, after 偷花喵 =====================
// Every tile of the pixel atlas has a twin here, drawn on a canvas in metres: flat colours, a dark purple ink round
// the things that matter, and the details of a 高雄 street — 二丁掛 tiles, 綠釉花磚 parapets, 鐵窗 cages, air-
// conditioners, red steel doors, rolling shutters, 水溝蓋, red kerb lines, 慢 on the road. Windows, shop fronts and
// signs carry a flag in the alpha channel so that after dark the city shader can light them.
const TK = { fac: 24, shop: 24, big: 14, tile: 32, road: 24, sign: 40 };   // pixels per metre
const FLAG_A = { sign: 0.9, shop: 0.8, win: 0.7 };
class TP {
  constructor(wM, hM, ppm, seed) {
    this.ppm = ppm; this.W = Math.max(2, Math.round(wM * ppm)); this.H = Math.max(2, Math.round(hM * ppm)); this.wM = this.W / ppm; this.hM = this.H / ppm;
    this.cv = canvas(this.W, this.H); this.g = this.cv.getContext('2d'); this.g.setTransform(ppm, 0, 0, ppm, 0, 0); this.g.lineJoin = 'round'; this.g.lineCap = 'round';
    this.flags = []; this.R = mulberry(seed || 1);
  }
  rect(x, y, w, h, col) { if (w <= 0 || h <= 0) return; this.g.fillStyle = col; this.g.fillRect(x, y, w, h); }
  ink(x, y, w, h, lw, col) { const g = this.g; g.strokeStyle = col || INK; g.lineWidth = lw || 0.06; g.strokeRect(x, y, w, h); }
  box(x, y, w, h, col, lw) { this.rect(x, y, w, h, col); if (lw !== 0) this.ink(x, y, w, h, lw); }
  rrPath(x, y, w, h, r) { const g = this.g; r = Math.min(r, w / 2, h / 2); g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
  rr(x, y, w, h, r, col, lw) { const g = this.g; this.rrPath(x, y, w, h, r); if (col) { g.fillStyle = col; g.fill(); } if (lw) { g.strokeStyle = INK; g.lineWidth = lw; g.stroke(); } }
  circle(x, y, r, col, lw) { const g = this.g; g.beginPath(); g.arc(x, y, r, 0, TAU); if (col) { g.fillStyle = col; g.fill(); } if (lw) { g.strokeStyle = INK; g.lineWidth = lw; g.stroke(); } }
  ell(x, y, rx, ry, col, lw) { const g = this.g; g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, TAU); if (col) { g.fillStyle = col; g.fill(); } if (lw) { g.strokeStyle = INK; g.lineWidth = lw; g.stroke(); } }
  poly(pts, col, lw) { const g = this.g; g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); if (col) { g.fillStyle = col; g.fill(); } if (lw) { g.strokeStyle = INK; g.lineWidth = lw; g.stroke(); } }
  line(x0, y0, x1, y1, col, lw) { const g = this.g; g.strokeStyle = col || INK; g.lineWidth = lw || 0.05; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke(); }
  // text in pixels (fonts misbehave at fractional sizes under a big transform); x, y, size in metres
  text(str, x, y, size, col, o) {
    o = o || {}; const g = this.g, k = this.ppm, px = Math.max(6, size * k); g.save(); g.setTransform(1, 0, 0, 1, 0, 0);
    g.font = (o.weight || 900) + ' ' + px.toFixed(1) + 'px ' + (o.font || '"Noto Sans TC","PingFang TC","Microsoft JhengHei",sans-serif'); g.textBaseline = 'middle'; g.textAlign = 'left';
    let tw = g.measureText(str).width, sx = 1; const maxW = o.maxW ? o.maxW * k : 0; if (maxW && tw > maxW) sx = maxW / tw; tw *= sx;
    const ox = (o.align === 'left' ? x * k : o.align === 'right' ? x * k - tw : x * k - tw / 2);
    g.translate(ox, y * k); g.scale(sx, o.sy || 1);
    if (o.stroke) { g.lineJoin = 'round'; g.lineWidth = o.stroke * k / sx; g.strokeStyle = o.strokeCol || INK; g.strokeText(str, 0, 0); }
    g.fillStyle = col; g.fillText(str, 0, 0); g.restore(); return tw / k;
  }
  vtext(str, cx, y0, y1, col, o) { const n = [...str].length, step = (y1 - y0) / n, size = Math.min(step * 0.9, (o && o.maxSize) || 9); [...str].forEach((ch, i) => this.text(ch, cx, y0 + step * (i + 0.5), size, col, o)); }
  dots(x, y, w, h, n, cols, r0, r1) { const g = this.g, R = this.R; for (let i = 0; i < n; i++) { g.fillStyle = cols[Math.floor(R() * cols.length)]; g.beginPath(); g.arc(x + R() * w, y + R() * h, r0 + R() * (r1 - r0), 0, TAU); g.fill(); } }
  // rain streaks down from a ledge
  grime(x, y, w, h, a) { const g = this.g, R = this.R; for (let i = 0; i < Math.max(1, w / 0.6); i++) { const gx = x + R() * w, gw = 0.08 + R() * 0.25, gh = h * (0.3 + R() * 0.7), gr = g.createLinearGradient(0, y, 0, y + gh); gr.addColorStop(0, 'rgba(40,32,52,' + a + ')'); gr.addColorStop(1, 'rgba(40,32,52,0)'); g.fillStyle = gr; g.fillRect(gx, y, gw, gh); } }
  vgrad(x, y, w, h, c0, c1) { const g = this.g, gr = g.createLinearGradient(0, y, 0, y + h); gr.addColorStop(0, c0); gr.addColorStop(1, c1); g.fillStyle = gr; g.fillRect(x, y, w, h); }
  flag(x, y, w, h, kind) { this.flags.push([x, y, w, h, FLAG_A[kind] || 1]); }
  done() {
    const g = this.g; g.save(); g.globalCompositeOperation = 'destination-out';
    for (const [x, y, w, h, a] of this.flags) { g.fillStyle = 'rgba(0,0,0,' + (1 - a).toFixed(3) + ')'; g.fillRect(x, y, w, h); }
    g.restore(); return wrapCanvas(this.cv);
  }
}
const tshade = (hex, k) => { const n = parseInt(hex.slice(1), 16); let r = n >> 16, g = (n >> 8) & 255, b = n & 255; if (k >= 0) { r += (255 - r) * k; g += (255 - g) * k; b += (255 - b) * k; } else { r *= 1 + k; g *= 1 + k; b *= 1 + k; } return '#' + [r, g, b].map((v) => clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0')).join(''); };
// ---------- the palette ----------
const TWALL = [['#efe6d2', 'tile'], ['#f3efe6', 'paint'], ['#e2cba4', 'tile'], ['#efc4a2', 'mosaic'], ['#eab3ad', 'paint'], ['#bcdcc4', 'mosaic'], ['#b8d2e6', 'tile'], ['#a7b3c6', 'paint'],
  ['#f0dc98', 'paint'], ['#c97a5c', 'brick'], ['#b58a64', 'tile'], ['#c8c4bc', 'stone'], ['#8fc0a2', 'mosaic'], ['#7eb2b0', 'tile'], ['#d99aa6', 'mosaic'], ['#e9dcc0', 'stone']];
const TSIGN = [['#d8463a', '#fff6e8'], ['#2f5fa8', '#fff6e8'], ['#f2c13a', '#2b2233'], ['#fff6e8', '#d8463a'], ['#3f8f5c', '#fff6e8'], ['#ef8a3a', '#fff6e8'], ['#253a6a', '#ffd84d'], ['#2b2233', '#ffd84d'], ['#fff6e8', '#2f5fa8'], ['#c2307a', '#fff6e8'], ['#1f8a8a', '#fff6e8']];
const TGLASS = ['#2c3a62', '#1c2440'], TCURT = ['#e8b4b8', '#f1d7a8', '#bcd6e8', '#d6e6c0', '#f4e6d8', '#e6c8e8'];
// ---------- materials: a wall surface in a colour, painted once as a repeating swatch and filled from it ----------
const TMAT = new Map();
function tMatCanvas(base, kind, ppm) {
  const key = base + kind + ppm; let c = TMAT.get(key); if (c) return c;
  const size = { tile: [2.3, 2.4], mosaic: [2, 2], brick: [2.4, 2.4], stone: [2, 2.2], paint: [2, 2] }[kind] || [2, 2];
  const p = new TP(size[0], size[1], ppm, strSeed(key)), g = p.g, R = p.R, w = size[0], h = size[1], line = tshade(base, -0.16);
  p.rect(0, 0, w, h, base);
  if (kind === 'tile') {   // 二丁掛: long thin tiles, staggered
    const tw = 0.23, th = 0.075;
    for (let yy = 0, r = 0; yy < h - 1e-6; yy += th, r++) for (let xx = -(r % 2) * tw / 2; xx < w; xx += tw) { const v = R(); if (v < 0.22 || v > 0.86) p.rect(xx + 0.01, yy + 0.01, tw - 0.02, th - 0.02, tshade(base, v < 0.22 ? -0.05 : 0.06)); }
    g.fillStyle = line; for (let yy = 0; yy < h - 1e-6; yy += th) g.fillRect(0, yy, w, 0.014);
    for (let yy = 0, r = 0; yy < h - 1e-6; yy += th, r++) for (let xx = -(r % 2) * tw / 2; xx < w; xx += tw) g.fillRect(xx, yy, 0.014, th);
  } else if (kind === 'mosaic') {   // 馬賽克: small squares
    const sq = 0.1; p.rect(0, 0, w, h, tshade(base, -0.1));
    for (let yy = 0; yy < h - 1e-6; yy += sq) for (let xx = 0; xx < w - 1e-6; xx += sq) { const v = R(); p.rect(xx + 0.008, yy + 0.008, sq - 0.016, sq - 0.016, v < 0.15 ? tshade(base, -0.06) : v > 0.9 ? tshade(base, 0.1) : base); }
  } else if (kind === 'brick') {
    const bw = 0.24, bh = 0.08; p.rect(0, 0, w, h, tshade(base, -0.28));
    for (let yy = 0, r = 0; yy < h - 1e-6; yy += bh, r++) for (let xx = -(r % 2) * bw / 2; xx < w; xx += bw) { const v = R(); p.rr(xx + 0.012, yy + 0.012, bw - 0.024, bh - 0.024, 0.02, v < 0.3 ? tshade(base, -0.08) : v > 0.8 ? tshade(base, 0.08) : base); }
  } else if (kind === 'stone') {   // 洗石子: a speckled render with joints
    p.dots(0, 0, w, h, w * h * 160, [tshade(base, -0.1), tshade(base, 0.08), tshade(base, -0.2)], 0.008, 0.02);
    g.fillStyle = line; g.fillRect(0, 1.1, w, 0.015);
  } else {   // a painted render, a little uneven
    p.dots(0, 0, w, h, w * h * 22, [tshade(base, -0.03), tshade(base, 0.04)], 0.03, 0.09);
  }
  c = p.cv; TMAT.set(key, c); return c;
}
function tWallBase(p, x, y, w, h, base, kind) {
  const g = p.g, k = p.ppm; g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = g.createPattern(tMatCanvas(base, kind, k), 'repeat'); g.fillRect(Math.floor(x * k), Math.floor(y * k), Math.ceil(w * k), Math.ceil(h * k)); g.restore();
}
// ---------- road surfaces ----------
const TASPH = '#62657a', TASPH_D = '#55586c', TASPH_L = '#6e7186', TLINE = '#f1ece0', TYEL = '#f2c94c', TRED = '#d64a3c';
function tAsphalt(p, x, y, w, h, dense) {
  p.rect(x, y, w, h, TASPH);
  p.dots(x, y, w, h, w * h * (dense || 14), [TASPH_D, TASPH_L, '#5b5e72', '#6a6d82'], 0.025, 0.06);
  const R = p.R, g = p.g;
  for (let i = 0; i < w * h * 0.01; i++) { g.fillStyle = 'rgba(40,40,60,0.16)'; p.rrPath(x + R() * w, y + R() * h, 0.8 + R() * 1.6, 0.6 + R() * 1.2, 0.2); g.fill(); }   // patches
  for (let i = 0; i < w * h * 0.012; i++) { g.strokeStyle = 'rgba(36,34,50,0.5)'; g.lineWidth = 0.035; g.beginPath(); let cx = x + R() * w, cy = y + R() * h; g.moveTo(cx, cy); for (let k = 0; k < 4; k++) { cx += (R() - 0.5) * 0.9; cy += (R() - 0.5) * 0.9; g.lineTo(cx, cy); } g.stroke(); }   // cracks
}
function tManhole(p, x, y, r) { p.circle(x, y, r + 0.05, '#4e4f5c'); p.circle(x, y, r, '#7a7b88'); const g = p.g; g.strokeStyle = '#5c5d6a'; g.lineWidth = 0.035; for (let i = -2; i <= 2; i++) { g.beginPath(); g.moveTo(x - r * 0.8, y + i * r * 0.3); g.lineTo(x + r * 0.8, y + i * r * 0.3); g.stroke(); } p.circle(x, y, r + 0.05, null, 0.04); }
function tRoad(kind) {
  const K = RK[kind], p = new TP(K.w, 10, TK.road, strSeed(kind)), W = p.wM, lw = 0.15;
  tAsphalt(p, 0, 0, W, 10);
  const dash = (x, col) => p.rect(x - lw / 2, 0, lw, 4, col), solid = (x, col, w) => p.rect(x - (w || lw) / 2, 0, w || lw, 10, col);
  if (kind === 'lane') { solid(0.12, TRED, 0.1); solid(W - 0.12, TRED, 0.1); }
  else if (kind === 'quay' || kind === 'ramp' || kind === 'hill') { solid(0.35, TLINE); solid(W - 0.35, TLINE); }
  else {
    if (kind === 'street' || kind === 'avenue' || kind === 'rural') { solid(0.1, TRED, 0.1); solid(W - 0.1, TRED, 0.1); }
    solid(0.32, TLINE); solid(W - 0.32, TLINE);
    const c = W / 2;
    if (K.lanes >= 4) { solid(c - 0.14, TYEL); solid(c + 0.14, TYEL); } else for (let y = 0; y < 10; y += 5) p.rect(c - lw / 2, y, lw, 2.5, TYEL);
    for (let l = 1; l < K.lanes / 2; l++) { const off = (l / (K.lanes / 2)) * (W / 2 - 0.32); dash(c - off, TLINE); dash(c + off, TLINE); }
    if (kind === 'boulevard') p.rect(c - 0.9, 0, 1.8, 10, '#8b8f8a');
    tManhole(p, W * (0.2 + p.R() * 0.2), 2 + p.R() * 6, 0.32);
  }
  return p.done();
}
function tWalk(seed) {
  const p = new TP(4, 4, TK.tile, seed), R = p.R, cols = [['#d3c9b6', '#a99f8b'], ['#d9c2b4', '#ad9686'], ['#c9c5bd', '#9e9a92'], ['#dccfb2', '#b0a283'], ['#cdbfae', '#a3937f']][seed % 5], [base, grout] = cols;
  const kind = seed % 3, s = kind === 1 ? 0.25 : 0.5;
  p.rect(0, 0, 4, 4, grout);
  if (kind === 2) { for (let y = 0, r = 0; y < 4; y += 0.2, r++) for (let x = -(r % 2) * 0.2; x < 4; x += 0.4) { const v = R(); p.rect(x + 0.02, y + 0.02, 0.36, 0.16, v < 0.2 ? tshade(base, -0.06) : v > 0.85 ? tshade(base, 0.07) : base); } }
  else for (let y = 0; y < 4; y += s) for (let x = 0; x < 4; x += s) { const v = R(); p.rect(x + 0.025, y + 0.025, s - 0.05, s - 0.05, v < 0.2 ? tshade(base, -0.06) : v > 0.85 ? tshade(base, 0.07) : base); }
  p.dots(0, 0, 4, 4, 60, [tshade(base, -0.1), tshade(base, 0.1)], 0.01, 0.025);
  for (let i = 0; i < 3; i++) { const g = p.g; g.fillStyle = 'rgba(60,50,40,0.1)'; g.beginPath(); g.ellipse(R() * 4, R() * 4, 0.3 + R() * 0.4, 0.2 + R() * 0.3, R() * 3, 0, TAU); g.fill(); }
  return p.done();
}
function tZebra() { const p = new TP(1, 6, 64); tAsphalt(p, 0, 0, 1, 6, 30); p.rect(0, 2.0, 0.5, 3.5, TLINE); p.rect(0, 0.8, 1, 0.4, TLINE); p.g.fillStyle = 'rgba(90,92,110,0.25)'; for (let i = 0; i < 10; i++) { p.g.beginPath(); p.g.arc(p.R() * 0.5, 2 + p.R() * 3.5, 0.02 + p.R() * 0.04, 0, TAU); p.g.fill(); } return p.done(); }
function tGrassPatch(p, x, y, w, h, base) {
  const R = p.R, g = p.g; p.rect(x, y, w, h, base || '#5f9c4e');
  for (let i = 0; i < w * h * 0.6; i++) { g.fillStyle = R() < 0.5 ? 'rgba(130,200,95,0.25)' : 'rgba(40,90,50,0.2)'; g.beginPath(); g.ellipse(x + R() * w, y + R() * h, 0.2 + R() * 0.3, 0.12 + R() * 0.2, R() * 3, 0, TAU); g.fill(); }
  g.lineWidth = 0.035;
  for (let i = 0; i < w * h * 9; i++) { const bx = x + R() * w, by = y + R() * h, s = 0.08 + R() * 0.08; g.strokeStyle = R() < 0.5 ? '#3f7a3c' : '#86c467'; g.beginPath(); g.moveTo(bx - s * 0.6, by - s); g.lineTo(bx, by); g.lineTo(bx + s * 0.5, by - s * 1.1); g.stroke(); }
  for (let i = 0; i < w * h * 0.5; i++) { const fx = x + R() * w, fy = y + R() * h, col = ['#fff4f0', '#ffd84d', '#ff9fc4'][Math.floor(R() * 3)]; g.fillStyle = col; for (let a = 0; a < 5; a++) { g.beginPath(); g.arc(fx + Math.cos(a * 1.26) * 0.045, fy + Math.sin(a * 1.26) * 0.045, 0.035, 0, TAU); g.fill(); } g.fillStyle = '#f2a33a'; g.beginPath(); g.arc(fx, fy, 0.025, 0, TAU); g.fill(); }
}
function tMedian() { const p = new TP(2, 5, 32, 9); tGrassPatch(p, 0, 0, 2, 5, '#5a9a4a'); for (const x of [0, 1.82]) { p.rect(x, 0, 0.18, 5, '#d9d4ca'); p.line(x === 0 ? 0.18 : 1.82, 0, x === 0 ? 0.18 : 1.82, 5, INK, 0.04); } return p.done(); }
function tGrass() { const p = new TP(4, 4, TK.tile, 7); tGrassPatch(p, 0, 0, 4, 4); return p.done(); }
function tConc() { const p = new TP(4, 4, TK.tile, 6); p.rect(0, 0, 4, 4, '#b9b6ae'); p.dots(0, 0, 4, 4, 300, ['#aeaba3', '#c4c1b9', '#a5a29a'], 0.015, 0.04); for (const v of [0, 2]) { p.rect(0, v, 4, 0.025, '#94918a'); p.rect(v, 0, 0.025, 4, '#94918a'); } return p.done(); }
function tWater() { const p = new TP(4, 4, TK.tile, 8), g = p.g; p.rect(0, 0, 4, 4, '#3f86b8'); g.strokeStyle = 'rgba(200,236,255,0.6)'; g.lineWidth = 0.05; for (let i = 0; i < 9; i++) { const x = p.R() * 4, y = p.R() * 4; g.beginPath(); g.arc(x, y, 0.25, Math.PI * 1.15, Math.PI * 1.85); g.stroke(); } return p.done(); }
function tAsphTile() { const p = new TP(4, 4, TK.tile, 5); tAsphalt(p, 0, 0, 4, 4, 20); return p.done(); }
function tPlain(col, ink) { const p = new TP(0.5, 0.5, 16); p.rect(0, 0, 0.5, 0.5, col); return p.done(); }
// ---------- walls that repeat (four metres square): the sides and backs of houses ----------
function tWallTile(seed, i) {
  const [base, kind] = TWALL[i % TWALL.length], p = new TP(4, 4, TK.tile, seed), R = p.R;
  tWallBase(p, 0, 0, 4, 4, base, kind);
  // floor lines every 3.4 m would not repeat in 4; a slab line at the tile's foot and head reads as storeys instead
  p.rect(0, 3.86, 4, 0.14, tshade(base, -0.22)); p.line(0, 3.86, 4, 3.86, INK, 0.035);
  if (R() < 0.55) { const x = 0.6 + R() * 1.6, y = 0.7 + R() * 0.8; tWindow(p, x, y, 1.1, 1.0, { cage: R() < 0.7, curtain: R() < 0.5 }); }
  if (R() < 0.45) { const x = R() < 0.5 ? 0.25 : 3.5; p.rect(x, 0, 0.14, 3.86, '#8e909c'); p.rect(x + 0.03, 0, 0.04, 3.86, '#b4b6c0'); p.line(x, 0, x, 3.86, INK, 0.03); p.line(x + 0.14, 0, x + 0.14, 3.86, INK, 0.03); }
  p.grime(0, 0, 4, 1.5, 0.08);
  return p.done();
}
// ---------- roofs (four metres square) ----------
function tRoofTile(seed, kind) {
  const p = new TP(4, 4, TK.tile, seed), R = p.R, g = p.g;
  if (kind === 'tin') {   // 鐵皮: corrugated, ribs every quarter metre
    const base = ['#6a8fbf', '#b8705a', '#c2c8cf', '#7fa07a', '#c99a62'][seed % 5];
    for (let x = 0; x < 4; x += 0.25) { p.rect(x, 0, 0.125, 4, tshade(base, 0.14)); p.rect(x + 0.125, 0, 0.125, 4, tshade(base, -0.12)); }
    for (let i = 0; i < 5; i++) { g.fillStyle = 'rgba(120,60,30,0.22)'; g.beginPath(); g.ellipse(R() * 4, R() * 4, 0.2 + R() * 0.4, 0.1 + R() * 0.2, 0, 0, TAU); g.fill(); }
    return p.done();
  }
  if (kind === 'tiles') { for (let y = 0; y < 4; y += 0.25) for (let x = -(Math.round(y * 4) % 2) * 0.15; x < 4; x += 0.3) { p.rr(x + 0.01, y, 0.28, 0.27, 0.12, tshade('#c8704a', (R() - 0.5) * 0.12)); p.g.strokeStyle = 'rgba(80,30,20,0.45)'; p.g.lineWidth = 0.025; p.g.beginPath(); p.g.arc(x + 0.15, y + 0.25, 0.13, 0.15, Math.PI - 0.15); p.g.stroke(); } return p.done(); }
  if (kind === 'glass') { p.rect(0, 0, 4, 4, '#3f7a96'); for (let v = 0; v < 4; v += 0.5) { p.rect(0, v, 4, 0.05, '#c6dbe6'); p.rect(v, 0, 0.05, 4, '#c6dbe6'); } g.fillStyle = 'rgba(255,255,255,0.18)'; g.beginPath(); g.moveTo(0.4, 0); g.lineTo(1.1, 0); g.lineTo(0, 1.4); g.lineTo(0, 0.6); g.closePath(); g.fill(); return p.done(); }
  // the flat concrete roofs of 高雄: 隔熱磚 insulation bricks, green waterproofing, or bare render
  const v = seed % 4;
  if (v === 0 || v === 3) {
    const base = v === 0 ? '#b8735c' : '#c98d6a'; p.rect(0, 0, 4, 4, tshade(base, -0.25));
    for (let y = 0; y < 4; y += 0.5) for (let x = 0; x < 4; x += 0.5) { const q = R(); p.rect(x + 0.03, y + 0.03, 0.44, 0.44, q < 0.2 ? tshade(base, -0.08) : q > 0.8 ? tshade(base, 0.07) : base); if (R() < 0.12) { g.fillStyle = 'rgba(60,40,40,0.18)'; g.fillRect(x + 0.08, y + 0.08, 0.2, 0.15); } }
  } else if (v === 1) { p.rect(0, 0, 4, 4, '#5f9a7e'); p.dots(0, 0, 4, 4, 80, ['#558e73', '#6aa88a'], 0.05, 0.15); for (let i = 0; i < 4; i++) { g.fillStyle = 'rgba(180,200,190,0.35)'; g.beginPath(); g.ellipse(R() * 4, R() * 4, 0.3 + R() * 0.5, 0.2 + R() * 0.3, R() * 3, 0, TAU); g.fill(); } }
  else { p.rect(0, 0, 4, 4, '#a9a59d'); p.dots(0, 0, 4, 4, 200, ['#9f9b93', '#b4b0a8'], 0.02, 0.06); }
  for (let i = 0; i < 4; i++) { g.fillStyle = 'rgba(40,30,40,0.12)'; g.beginPath(); g.ellipse(R() * 4, R() * 4, 0.3 + R() * 0.5, 0.2 + R() * 0.3, R() * 3, 0, TAU); g.fill(); }
  p.circle(3.6, 3.6, 0.08, '#3a3038');
  return p.done();
}
// ---------- the pieces of a house front ----------
// a window's flag is its own random number (0.60 to 0.74): the city shader lights each window as a whole, some on, some off
function tFlagNow(p, x, y, w, h, kind) { const g = p.g, a = kind === 'win' ? 0.6 + 0.14 * p.R() : (FLAG_A[kind] || 1); g.save(); g.globalCompositeOperation = 'destination-out'; g.fillStyle = 'rgba(0,0,0,' + (1 - a).toFixed(3) + ')'; g.fillRect(x, y, w, h); g.restore(); }
// 鐵窗: light bars over a dark outline, a row of curls along the top, a ledge for the pots
function tGrille(p, x, y, w, h, col, pots) {
  const g = p.g, n = Math.max(3, Math.round(w / 0.13)), step = w / n, dark = '#2a2e3c';
  const draw = (c, lw) => { g.strokeStyle = c; g.lineWidth = lw; g.beginPath(); for (let i = 0; i <= n; i++) { g.moveTo(x + i * step, y); g.lineTo(x + i * step, y + h); } for (const yy of [y, y + h * 0.5, y + h]) { g.moveTo(x, yy); g.lineTo(x + w, yy); } g.stroke(); g.beginPath(); for (let i = 0; i < n; i++) { g.moveTo(x + (i + 0.5) * step + step * 0.32, y + 0.14); g.arc(x + (i + 0.5) * step, y + 0.14, step * 0.32, 0, TAU); } g.stroke(); };
  draw(dark, 0.055); draw(col || '#d8dde6', 0.022);
  p.box(x - 0.04, y + h - 0.02, w + 0.08, 0.07, col || '#d8dde6', 0.03);
  if (pots) { const R = p.R; for (let px = x + 0.15; px < x + w - 0.3; px += 0.32 + R() * 0.25) { if (R() < 0.3) continue; p.rr(px, y + h - 0.2, 0.2, 0.18, 0.03, '#c9704a', 0.025); const leaf = R() < 0.5 ? '#5fae5a' : '#4f9a50'; p.circle(px + 0.1, y + h - 0.3, 0.13, leaf, 0.025); if (R() < 0.5) { g.fillStyle = ['#ff8fae', '#ffd84d', '#fff4f0', '#d83aa2'][Math.floor(R() * 4)]; for (let a = 0; a < 4; a++) { g.beginPath(); g.arc(px + 0.1 + Math.cos(a * 1.6) * 0.07, y + h - 0.33 + Math.sin(a * 1.6) * 0.05, 0.035, 0, TAU); g.fill(); } } } }
}
// 窗型冷氣: a white box under or beside the window, with its slats and a drip stain
function tAC(p, x, y, w, h) {
  w = w || 0.78; h = h || 0.52; p.grime(x + w * 0.3, y + h, w * 0.4, 1.2, 0.12);
  p.rr(x, y, w, h, 0.04, '#eef0f0', 0.04); p.rect(x + 0.06, y + 0.08, w - 0.12, h - 0.16, '#cfd4d8');
  const g = p.g; g.strokeStyle = '#8f96a0'; g.lineWidth = 0.025; g.beginPath(); for (let yy = y + 0.12; yy < y + h - 0.1; yy += 0.06) { g.moveTo(x + 0.08, yy); g.lineTo(x + w - 0.08, yy); } g.stroke();
  p.rect(x + w - 0.2, y + 0.04, 0.12, 0.05, '#5fae5a');
}
function tWindow(p, x, y, w, h, o) {
  o = o || {}; const R = p.R, g = p.g, frame = o.frame || '#e6e2d6';
  p.rect(x - 0.07, y - 0.07, w + 0.14, h + 0.14, frame);
  p.vgrad(x, y, w, h, TGLASS[0], TGLASS[1]);
  if (o.curtain) { const c = TCURT[Math.floor(R() * TCURT.length)], cw = w * (0.18 + R() * 0.12); p.rect(x, y, cw, h, c); p.rect(x + w - cw, y, cw, h, c); g.fillStyle = 'rgba(0,0,0,0.13)'; for (let i = 1; i < 3; i++) { g.fillRect(x + cw * i / 3, y, 0.02, h); g.fillRect(x + w - cw * i / 3, y, 0.02, h); } }
  g.fillStyle = 'rgba(170,200,255,0.2)'; g.beginPath(); g.moveTo(x + w * 0.16, y); g.lineTo(x + w * 0.36, y); g.lineTo(x + w * 0.1, y + h); g.lineTo(x - 0.0, y + h); g.lineTo(x, y + h * 0.75); g.closePath(); g.fill();
  tFlagNow(p, x, y, w, h, 'win');
  p.rect(x + w / 2 - 0.035, y, 0.07, h, frame); if (h > 1.1 && R() < 0.5) p.rect(x, y + h * 0.3, w, 0.05, frame);
  p.ink(x - 0.07, y - 0.07, w + 0.14, h + 0.14, 0.045);
  p.box(x - 0.14, y + h + 0.07, w + 0.28, 0.08, tshade(frame, -0.05), 0.03);
  p.grime(x, y + h + 0.15, w, 0.9, 0.07);
  if (o.cage) tGrille(p, x - 0.16, y - 0.18, w + 0.32, h + 0.36, o.cageCol, o.pots);
  if (o.ac) tAC(p, o.ac === 'left' ? x - 0.98 : x + w + 0.22, y + h - 0.56);
}
// a balcony's railing across a floor, with washing and pots behind it
function tBalcony(p, x, y, w, base) {
  const R = p.R, g = p.g, top = y, h = 1.05;
  if (R() < 0.6) { for (let i = 0; i < 3 + R() * 4; i++) { const lx = x + 0.2 + R() * (w - 0.6); p.rr(lx, top - 0.75 + R() * 0.15, 0.24 + R() * 0.12, 0.5 + R() * 0.25, 0.04, ['#ffffff', '#f2b8c0', '#8ab0e0', '#f0e080', '#5a5e70', '#7cc28a', '#f08a5a'][Math.floor(R() * 7)], 0.025); } g.strokeStyle = '#6a6e7a'; g.lineWidth = 0.02; g.beginPath(); g.moveTo(x + 0.1, top - 0.78); g.lineTo(x + w - 0.1, top - 0.78); g.stroke(); }
  if (R() < 0.5) {   // a solid parapet wall
    p.rect(x, top, w, h, tshade(base, 0.1)); p.rect(x, top, w, 0.08, tshade(base, 0.2)); p.ink(x, top, w, h, 0.04);
    for (let bx = x + 0.3; bx < x + w - 0.5; bx += 0.55) p.rr(bx, top + 0.3, 0.3, 0.5, 0.12, tshade(base, -0.12), 0.025);
  } else {
    const n = Math.round(w / 0.12); g.strokeStyle = '#2a2e3c'; g.lineWidth = 0.05; g.beginPath(); for (let i = 0; i <= n; i++) { g.moveTo(x + i * w / n, top); g.lineTo(x + i * w / n, top + h); } g.moveTo(x, top); g.lineTo(x + w, top); g.stroke();
    g.strokeStyle = '#c9ced8'; g.lineWidth = 0.02; g.stroke(); p.box(x, top - 0.03, w, 0.07, '#c9ced8', 0.03);
  }
  p.rect(x, top + h, w, 0.12, tshade(base, -0.25)); p.line(x, top + h + 0.12, x + w, top + h + 0.12, INK, 0.035);
}
// a shop's sign board: the board, a cream panel or not, the name in heavy type, sometimes bulbs and a phone number
function tSignBoard(p, x, y, w, h, name, R, o) {
  o = o || {}; const [bg, fg] = TSIGN[Math.floor(R() * TSIGN.length)], g = p.g, style = R();
  p.rect(x, y, w, h, bg);
  let tcol = fg, tx0 = x, tw = w;
  if (style < 0.35 && h > 0.6) { p.rr(x + 0.08, y + 0.08, w - 0.16, h - 0.16, 0.06, '#fff6e8'); tcol = bg === '#fff6e8' ? '#d8463a' : bg; g.strokeStyle = fg === '#fff6e8' ? '#ff8fae' : fg; g.lineWidth = 0.035; p.rrPath(x + 0.14, y + 0.14, w - 0.28, h - 0.28, 0.05); g.stroke(); }
  else if (style < 0.6 && w > 3) { p.circle(x + h * 0.55, y + h / 2, h * 0.34, '#fff6e8', 0.03); p.text(name ? name[0] : '店', x + h * 0.55, y + h / 2 + h * 0.02, h * 0.42, bg); tx0 = x + h * 1.05; tw = w - h * 1.1; }
  if (name) {
    const size = Math.min(h * 0.62, (tw - 0.3) / Math.max(1.6, [...name].length * 0.98));
    p.text(name, tx0 + tw / 2, y + h / 2 + h * 0.03, size, tcol, { maxW: tw - 0.3, stroke: style >= 0.6 && (tcol === '#fff6e8' || tcol === '#ffd84d') ? 0.05 : 0, strokeCol: tshade(bg, -0.45) });
    if (o.phone && w - size * [...name].length > 2.6) p.text('07-' + (200 + Math.floor(R() * 600)) + '-' + (1000 + Math.floor(R() * 9000)), x + w - 0.1, y + h - 0.16, h * 0.16, tcol, { align: 'right', weight: 700 });
  }
  if (R() < 0.25) for (let bx = x + 0.15; bx < x + w - 0.1; bx += 0.25) p.circle(bx, y + h - 0.07, 0.04, '#ffe27a');
  p.flag(x, y, w, h, 'sign');
  p.ink(x, y, w, h, 0.06);
}
// ---------- townhouse fronts: the floors above the arcade, with the shop's sign at the foot ----------
function tTownhouse(seed, wM, floors, dist) {
  const H = 0.5 + (floors - 1) * 3.4 + 1.2, p = new TP(wM, H, TK.fac, seed), R = p.R, W = p.wM;
  const pal = dist === 'yancheng' ? [0, 2, 3, 9, 10, 11, 15] : dist === 'bay' ? [1, 6, 7, 11, 13] : [0, 1, 2, 3, 4, 5, 6, 7, 8, 10, 12, 13, 14, 15];
  const [base, kind] = TWALL[pal[Math.floor(R() * pal.length)]];
  tWallBase(p, 0, 0, W, H - 1.2, base, kind);
  if (R() < 0.4) { const c2 = tshade(base, R() < 0.5 ? -0.12 : 0.1); for (const px_ of [0, W - 0.3]) { p.rect(px_, 0, 0.3, H - 1.2, c2); p.line(px_ === 0 ? 0.3 : W - 0.3, 0.5, px_ === 0 ? 0.3 : W - 0.3, H - 1.2, INK, 0.03); } }
  // the parapet: 綠釉花磚 lattice on the older ones
  if (R() < 0.35 && dist !== 'bay') {
    p.rect(0, 0, W, 0.5, '#e9e3d4'); const s = 0.34, n = Math.floor((W - 0.2) / (s + 0.06)), x0 = (W - n * (s + 0.06) + 0.06) / 2;
    for (let i = 0; i < n; i++) { const x = x0 + i * (s + 0.06), y = 0.07, q = s / 4; p.rect(x, y, s, s, '#3f8f6a'); for (let a = 0; a < 2; a++) for (let b = 0; b < 2; b++) p.circle(x + q + a * 2 * q, y + q + b * 2 * q, q * 0.62, '#e9e3d4'); p.circle(x + s / 2, y + s / 2, q * 0.45, '#5fb58a'); p.ink(x, y, s, s, 0.03); }
  } else p.rect(0, 0, W, 0.5, tshade(base, 0.12));
  p.rect(0, 0.42, W, 0.08, tshade(base, -0.25)); p.line(0, 0.5, W, 0.5, INK, 0.04);
  const nWin = W >= 5.5 ? 2 : 1, ww = nWin === 2 ? Math.min(1.9, (W - 1.6) / 2) : Math.min(2.3, W - 1.8), wh = 1.35;
  const cage = R() < 0.75, cageCol = R() < 0.7 ? '#d8dde6' : ['#7fbf9a', '#c27a5a', '#f2f2ee', '#8aa6c8'][Math.floor(R() * 4)], curtain = R() < 0.55, acP = R() < 0.65, balc = R() < 0.35, pipe = R() < 0.5;
  for (let f = 0; f < floors - 1; f++) {
    const y0 = 0.5 + f * 3.4, slab = y0 + 3.4;
    const bal = balc && (f > 0 || R() < 0.5);
    for (let k = 0; k < nWin; k++) {
      const x = nWin === 2 ? (W - 2 * ww - 0.7) / 2 + k * (ww + 0.7) : (W - ww) / 2;
      const ac = acP && R() < 0.5 && (nWin === 1 || k === 1) ? (nWin === 1 && R() < 0.5 ? 'left' : 'right') : null;
      tWindow(p, x, y0 + 0.75, ww, wh, { cage: cage && !bal && R() < 0.92, cageCol, curtain: curtain && R() < 0.7, ac: bal ? null : ac, pots: R() < 0.5 });
    }
    if (bal) tBalcony(p, 0.15, slab - 1.25, W - 0.3, base);
    if (f === 0 && R() < 0.28) tSignBoard(p, 0.25, y0 + 0.12, W - 0.5, 0.5, R.pick(SHOP_TYPES.class.concat(SHOP_TYPES.clinic, SHOP_TYPES.ktv)), R);
    p.rect(0, slab - 0.14, W, 0.14, tshade(base, -0.2)); p.line(0, slab - 0.14, W, slab - 0.14, INK, 0.035);
  }
  if (pipe) { const x = R() < 0.5 ? 0.12 : W - 0.26; p.rect(x, 0.5, 0.14, H - 1.7, '#8e909c'); p.rect(x + 0.03, 0.5, 0.04, H - 1.7, '#b4b6c0'); p.ink(x, 0.5, 0.14, H - 1.7, 0.03); }
  if (R() < 0.3) { const g = p.g; g.strokeStyle = '#3a3a48'; g.lineWidth = 0.03; g.beginPath(); g.moveTo(0, 1.4); g.quadraticCurveTo(W / 2, 1.7, W, 1.35); g.stroke(); }   // a sagging cable
  p.grime(0, 0.5, W, 1.4, 0.07);
  // the shop's sign across the foot, just above the arcade
  const type = R.pick(dist === 'centre' ? ['open', 'eat', 'tea', 'clinic', 'salon', 'open', 'eat', 'class', 'ktv', 'scooter'] : ['open', 'eat', 'tea', 'open', 'eat', 'scooter', 'shutter', 'clinic', 'salon', 'open']);
  const name = R.pick(SHOP_TYPES[type]);
  if (name) tSignBoard(p, 0, H - 1.2, W, 1.2, name, R, { phone: R() < 0.5 }); else { p.rect(0, H - 1.2, W, 1.2, tshade(base, -0.1)); p.ink(0, H - 1.2, W, 1.2, 0.05); }
  p.rect(0, H - 0.06, W, 0.06, INK);
  p.line(0.025, 0, 0.025, H, INK, 0.05); p.line(W - 0.025, 0, W - 0.025, H, INK, 0.05);
  return { px: p.done(), type, name };
}
// ---------- shop fronts: the ground floor inside the arcade, seven metres by four ----------
function tGoods(p, x, y, w, h, R, bright) {
  const g = p.g; p.rect(x, y, w, h, bright ? '#f4f2ea' : '#3a3240');
  for (let yy = y + 0.45; yy < y + h - 0.2; yy += 0.55) {
    p.rect(x + 0.05, yy, w - 0.1, 0.05, bright ? '#c9c2b2' : '#6a5a52');
    for (let xx = x + 0.1; xx < x + w - 0.2; xx += 0.14 + R() * 0.1) { const hh = 0.18 + R() * 0.2; p.rect(xx, yy - hh, 0.1 + R() * 0.06, hh, ['#e8504a', '#4f86d8', '#f2c94c', '#4fae6a', '#f6f1e6', '#ef8a3a', '#a86ad0', '#ff8fae'][Math.floor(R() * 8)]); }
  }
  g.fillStyle = 'rgba(0,0,0,0.12)'; g.fillRect(x, y, w, 0.12);
}
function tGlassFront(p, x, y, w, h, frame) {
  const g = p.g; g.fillStyle = 'rgba(200,236,255,0.22)'; g.fillRect(x, y, w, h);
  g.fillStyle = 'rgba(255,255,255,0.35)'; g.beginPath(); g.moveTo(x + w * 0.12, y); g.lineTo(x + w * 0.24, y); g.lineTo(x + w * 0.06, y + h); g.lineTo(x - 0.0, y + h); g.lineTo(x, y + h * 0.7); g.closePath(); g.fill();
  p.ink(x, y, w, h, 0.05); if (frame) { p.rect(x, y, w, 0.08, frame); p.rect(x, y + h - 0.08, w, 0.08, frame); }
}
function tDoor(p, x, y, w, h, R) { p.box(x, y, w, h, '#4a5a6a', 0.05); p.rect(x + 0.08, y + 0.08, w - 0.16, h - 0.12, '#9ccbe0'); p.g.fillStyle = 'rgba(255,255,255,0.35)'; p.g.fillRect(x + 0.14, y + 0.12, 0.08, h - 0.3); p.rect(x + w - 0.2, y + h * 0.5, 0.05, 0.25, '#2b2233'); tFlagNow(p, x + 0.08, y + 0.08, w - 0.16, h - 0.12, 'shop'); }
function tShop(seed, type) {
  const p = new TP(7, 4, TK.shop, seed), R = p.R, g = p.g, W = 7, H = 4;
  p.rect(0, 0, W, H, '#8a8278');
  switch (type) {
    case 'shutter': {
      const c = ['#9aa3ad', '#7d9c86', '#6f8db8', '#a8876a', '#b9bec4'][Math.floor(R() * 5)], sw = R() < 0.4 ? 5 : W;
      p.rect(0, 0, sw, H, c); for (let y = 0.4; y < H; y += 0.15) { p.rect(0, y, sw, 0.05, tshade(c, 0.18)); p.rect(0, y + 0.1, sw, 0.03, tshade(c, -0.25)); }
      p.box(0, 0, sw, 0.4, tshade(c, -0.3), 0.05); p.rect(0, H - 0.12, sw, 0.12, tshade(c, -0.35)); p.ink(0, 0.4, sw, H - 0.4, 0.05);
      if (R() < 0.5) { const bx = 0.6 + R() * 2; p.box(bx, 1.4, 1.1, 0.8, '#fff6e8', 0.04); p.text('出租', bx + 0.55, 1.72, 0.32, '#d8463a'); p.text('0912-' + (100 + Math.floor(R() * 899)), bx + 0.55, 2.05, 0.13, '#2b2233', { weight: 700 }); }
      if (sw < W) tDoor(p, 5.3, 0.9, 1.4, 3.1, R);
      break; }
    case 'cvs': {
      const [a, b] = [['#7a5ac8', '#f2c94c'], ['#1f9a9a', '#ff8fae'], ['#e8504a', '#f6f1e6'], ['#3a6ab8', '#ef8a3a']][seed % 4];
      tGoods(p, 0, 0.7, W, H - 0.7, R, true); tFlagNow(p, 0, 0.7, W, H - 0.7, 'shop'); tGlassFront(p, 0, 0.7, W, H - 0.7, '#d9dde2'); for (const x of [1.75, 3.5, 5.25]) p.rect(x - 0.04, 0.7, 0.08, H - 0.7, '#d9dde2');
      p.rect(0, 0, W, 0.35, a); p.rect(0, 0.35, W, 0.18, b); p.rect(0, 0.53, W, 0.1, a); p.ink(0, 0, W, 0.63, 0.05); p.flag(0, 0, W, 0.63, 'sign');
      tDoor(p, 2.9, 1.0, 1.2, 3.0, R); p.box(0.3, 1.3, 0.8, 0.9, '#f6f1e6', 0.03); p.text('24h', 0.7, 1.6, 0.26, a); p.text('咖啡', 0.7, 1.95, 0.2, '#2b2233');
      break; }
    case 'eat': {
      p.rect(0, 0, W, H, ['#3a3028', '#4a3a2a', '#2e2a34'][Math.floor(R() * 3)]); tFlagNow(p, 0, 0.5, W, H - 0.5, 'shop');
      p.box(0.25, 2.0, 3.0, 1.9, '#c9ccd2', 0.05); p.rect(0.3, 2.05, 2.9, 0.5, '#e8ecf0'); for (let x = 0.45; x < 3.0; x += 0.42) p.rr(x, 2.12, 0.34, 0.3, 0.06, ['#f2c94c', '#e8504a', '#f1e2a8', '#9a5a3a', '#7cc28a'][Math.floor(R() * 5)], 0.02);
      p.box(3.8, 0.7, 2.8, 1.9, '#fff6e8', 0.05); for (let y = 0.95; y < 2.5; y += 0.32) { p.rect(4.0, y, 1.5 + R() * 0.6, 0.12, '#d8463a'); p.rect(6.0, y, 0.4, 0.12, '#2b2233'); }
      for (let k = 0; k < 3; k++) { const lx = 0.7 + k * 1.1; p.line(lx, 0.1, lx, 0.35, '#2b2233', 0.03); p.ell(lx, 0.62, 0.24, 0.3, '#e83a3a', 0.035); p.rect(lx - 0.12, 0.3, 0.24, 0.07, '#f2c94c'); p.rect(lx - 0.12, 0.87, 0.24, 0.07, '#f2c94c'); }
      for (let k = 0; k < 4; k++) { const sx = 3.9 + k * 0.75; p.rr(sx, 3.35, 0.4, 0.12, 0.03, '#e8504a', 0.025); p.rect(sx + 0.05, 3.47, 0.05, 0.5, '#e8504a'); p.rect(sx + 0.3, 3.47, 0.05, 0.5, '#e8504a'); }
      break; }
    case 'tea': {
      const c = ['#2f9a7a', '#d8467a', '#3a6ab8', '#ef8a3a', '#7a5ac8'][Math.floor(R() * 5)];
      p.rect(0, 0, W, H, '#f6eedf'); tFlagNow(p, 0, 0.6, W, H - 0.6, 'shop'); p.rect(0, 0, W, 0.6, c); p.ink(0, 0, W, 0.6, 0.05); p.flag(0, 0, W, 0.6, 'sign');
      p.box(0.4, 0.85, W - 0.8, 1.15, '#fff8ea', 0.04); for (let x = 0.6; x < W - 0.7; x += 0.62) { p.rr(x, 1.0, 0.36, 0.55, 0.06, ['#f2d4a0', '#9ad6b0', '#f2a0a8', '#f6f1e6', '#c9a07a'][Math.floor(R() * 5)], 0.025); p.rect(x + 0.03, 1.2, 0.3, 0.06, c); p.circle(x + 0.18, 1.72, 0.1, '#2b2233'); }
      p.box(0, 2.6, W, 1.4, '#e9d8bc', 0.05); p.rect(0, 2.6, W, 0.12, tshade(c, 0.2)); for (let k = 0; k < 5; k++) p.rr(0.6 + k * 1.25, 2.1, 0.32, 0.48, 0.05, ['#f2d4a0', '#9ad6b0', '#f2a0a8'][k % 3], 0.025);
      break; }
    case 'scooter': {
      p.rect(0, 0, W, H, '#3a3640'); tFlagNow(p, 0, 0.4, W, H - 0.4, 'shop');
      for (let k = 0; k < 3; k++) { const sx = 0.5 + k * 2.1, c = ['#e8504a', '#3a6ab8', '#f6f1e6', '#2b2233', '#4fae6a'][Math.floor(R() * 5)]; p.circle(sx + 0.3, 3.55, 0.32, '#2b2233'); p.circle(sx + 1.4, 3.55, 0.32, '#2b2233'); p.circle(sx + 0.3, 3.55, 0.12, '#c9ccd2'); p.circle(sx + 1.4, 3.55, 0.12, '#c9ccd2'); p.poly([[sx + 0.1, 3.3], [sx + 0.5, 2.8], [sx + 1.1, 2.75], [sx + 1.55, 3.0], [sx + 1.7, 3.35], [sx + 0.2, 3.45]], c, 0.04); p.rr(sx + 0.55, 2.62, 0.62, 0.16, 0.05, '#2b2233'); p.line(sx + 1.5, 3.0, sx + 1.45, 2.45, '#2b2233', 0.06); }
      for (let k = 0; k < 4; k++) p.circle(6.55, 0.9 + k * 0.45, 0.3, '#2b2233', 0.02);
      p.box(0.4, 0.6, 2.4, 1.2, '#8a8e98', 0.04); for (let k = 0; k < 6; k++) p.line(0.6 + k * 0.35, 0.8, 0.6 + k * 0.35, 1.4, '#c9ccd2', 0.06);
      break; }
    case 'clinic': {
      p.rect(0, 0, W, H, '#f2f2ec'); tGoods(p, 0.25, 0.9, 3.8, 3.1, R, true); tFlagNow(p, 0.25, 0.9, 3.8, 3.1, 'shop'); g.fillStyle = 'rgba(240,248,255,0.7)'; for (let y = 1.0; y < 3.9; y += 0.18) g.fillRect(0.25, y, 3.8, 0.1); tGlassFront(p, 0.25, 0.9, 3.8, 3.1);
      tDoor(p, 4.7, 0.9, 1.5, 3.1, R); p.box(0.6, 0.2, 1.6, 0.55, '#3f9a5c', 0.04); for (let k = 0; k < 3; k++) p.circle(0.95 + k * 0.45, 0.47, 0.13, '#f6f1e6'); p.flag(0.6, 0.2, 1.6, 0.55, 'sign');
      p.box(4.9, 0.15, 1.1, 0.65, '#f6f1e6', 0.04); p.rect(5.37, 0.22, 0.16, 0.5, '#3f9a5c'); p.rect(5.15, 0.39, 0.6, 0.16, '#3f9a5c'); p.flag(4.9, 0.15, 1.1, 0.65, 'sign');
      break; }
    case 'salon': {
      p.rect(0, 0, W, H, '#ece2ea'); p.rect(1.1, 0.5, 5.5, 3.5, '#f6eef4'); tFlagNow(p, 1.1, 0.5, 5.5, 3.5, 'shop'); for (let k = 0; k < 3; k++) { p.rr(1.6 + k * 1.7, 2.5, 0.8, 1.2, 0.2, '#2b2233'); p.rr(1.5 + k * 1.7, 1.2, 1.0, 1.0, 0.1, '#bcd6e8', 0.03); } tGlassFront(p, 1.1, 0.5, 5.5, 3.5);
      p.rr(0.3, 0.6, 0.45, 2.4, 0.22, '#f6f1e6', 0.04); g.save(); p.rrPath(0.3, 0.6, 0.45, 2.4, 0.22); g.clip(); for (let y = 0; y < 3.2; y += 0.3) { g.fillStyle = (Math.round(y / 0.3) % 3 === 0) ? '#e8504a' : (Math.round(y / 0.3) % 3 === 1) ? '#f6f1e6' : '#3a6ab8'; g.beginPath(); g.moveTo(0.3, 0.6 + y); g.lineTo(0.75, 0.6 + y - 0.25); g.lineTo(0.75, 0.6 + y + 0.05); g.lineTo(0.3, 0.6 + y + 0.3); g.closePath(); g.fill(); } g.restore(); p.rr(0.3, 0.6, 0.45, 2.4, 0.22, null, 0.04); p.flag(0.3, 0.6, 0.45, 2.4, 'sign');
      break; }
    case 'bank': {
      const c = ['#3a6ab8', '#3f9a5c', '#d8463a'][Math.floor(R() * 3)]; p.rect(0, 0, W, H, '#dcdad2'); p.rect(0.4, 0.8, W - 0.8, 3.2, '#f2f0ea'); tFlagNow(p, 0.4, 0.8, W - 0.8, 3.2, 'shop'); tGlassFront(p, 0.4, 0.8, W - 0.8, 3.2, '#c9ccd2');
      p.rect(0, 0, W, 0.55, c); p.ink(0, 0, W, 0.55, 0.05); p.flag(0, 0, W, 0.55, 'sign'); p.box(2.6, 1.3, 1.8, 2.6, '#5a6270', 0.05); p.rect(2.85, 1.55, 1.3, 0.8, '#9ccbe0'); p.rect(2.85, 2.55, 1.3, 0.15, '#2b2233'); p.text('ATM', 3.5, 1.0, 0.28, '#fff6e8');
      break; }
    case 'class': case 'ktv': {
      const ktv = type === 'ktv'; p.rect(0, 0, W, H, ktv ? '#2a2236' : '#e9e6dc'); p.rect(0.3, 0.8, 4.0, 3.2, ktv ? '#3a2a4a' : '#f6f4ec'); tFlagNow(p, 0.3, 0.8, 4.0, 3.2, 'shop'); tGlassFront(p, 0.3, 0.8, 4.0, 3.2);
      tDoor(p, 4.9, 0.9, 1.6, 3.1, R);
      if (ktv) { for (let k = 0; k < 12; k++) { p.circle(0.3 + k * 0.58, 0.35, 0.09, ['#ff4fa0', '#4ff0ff', '#ffe04f'][k % 3]); } p.flag(0, 0.2, W, 0.3, 'sign'); }
      else for (let k = 0; k < 3; k++) { p.box(0.5 + k * 1.3, 1.2, 1.0, 1.3, ['#fff6e8', '#f2c94c', '#ff8fae'][k], 0.03); for (let y = 1.4; y < 2.3; y += 0.2) p.rect(0.62 + k * 1.3, y, 0.75, 0.06, '#2b2233'); }
      break; }
    default: {
      tGoods(p, 0, 0.5, W, H - 0.5, R, false); tFlagNow(p, 0, 0.5, W, H - 0.5, 'shop');
      if (R() < 0.5) tGlassFront(p, 0, 0.7, 3.4, 3.3, '#c9ccd2');
      tDoor(p, R() < 0.5 ? 5.0 : 0.25, 0.9, 1.4, 3.1, R);
      for (let k = 0; k < 4; k++) p.rr(3.9 + k * 0.7, 0.6, 0.45, 0.7 + (k % 2) * 0.4, 0.05, ['#e8504a', '#4f86d8', '#f2c94c', '#4fae6a'][k], 0.03);
    }
  }
  p.rect(0, 0, W, 0.1, '#4a4252'); p.line(0, 0.1, W, 0.1, INK, 0.04); p.rect(0, H - 0.08, W, 0.08, '#4a4252');
  return p.done();
}
// ---------- the taller buildings along the boulevards ----------
function tBig(seed, wM, floors, style) {
  const fh = 3.2, H = floors * fh + 1, p = new TP(wM, H, TK.big, seed), R = p.R, W = p.wM, g = p.g;
  const [base, kind] = TWALL[[0, 1, 6, 7, 11, 2, 13, 15][Math.floor(R() * 8)]];
  if (style === 'glass' || style === 'office') {
    const gc = ['#3f7a96', '#4a6f9a', '#3a8a8a', '#5a7aa8'][Math.floor(R() * 4)], span = style === 'glass' ? fh : 1.9, pw = style === 'glass' ? 1.5 : 1.25;
    p.rect(0, 0, W, H, style === 'glass' ? tshade(gc, -0.1) : base);
    for (let f = 0; f < floors; f++) {
      const y = 1 + f * fh; p.vgrad(0, y, W, span, tshade(gc, 0.15), tshade(gc, -0.12)); for (let x = 0; x < W; x += pw) tFlagNow(p, x + 0.05, y, Math.min(pw, W - x) - 0.1, span - 0.06, 'win');
      for (let x = 0; x <= W; x += pw) p.rect(x - 0.05, y, 0.1, span, '#d6e2ea');
      p.rect(0, y + span - 0.06, W, 0.06, '#d6e2ea'); p.line(0, y + span, W, y + span, INK, 0.04);
      if (style === 'office') { p.rect(0, y + span, W, fh - span, base); p.line(0, y + fh, W, y + fh, INK, 0.04); }
    }
    g.fillStyle = 'rgba(255,255,255,0.16)'; for (let k = 0; k < 3; k++) { const x0 = R() * W; g.beginPath(); g.moveTo(x0, 1); g.lineTo(x0 + 2.4, 1); g.lineTo(x0 - 4, H); g.lineTo(x0 - 6.4, H); g.closePath(); g.fill(); }
  } else {
    tWallBase(p, 0, 0, W, H, base, kind);
    const nWin = Math.max(2, Math.floor(W / 3.6)), ww = (W - 1.2) / nWin - 1.0;
    for (let f = 0; f < floors; f++) {
      const y0 = 1 + f * fh;
      for (let k = 0; k < nWin; k++) { const x = 0.6 + k * (ww + 1.0) + 0.5; tWindow(p, x, y0 + (style === 'apt' ? 0.45 : 0.6), ww, style === 'apt' ? 1.25 : 1.55, { curtain: R() < 0.4, cage: style === 'apt' && R() < 0.45, ac: style === 'apt' && R() < 0.3 && k === nWin - 1 ? 'right' : null }); }
      if (style === 'apt' && R() < 0.75) tBalcony(p, 0.2, y0 + fh - 1.3, W - 0.4, base);
      p.rect(0, y0 + fh - 0.16, W, 0.16, tshade(base, -0.2)); p.line(0, y0 + fh - 0.16, W, y0 + fh - 0.16, INK, 0.04);
    }
    p.grime(0, 1, W, H - 2, 0.06);
    if (style === 'hotel') { if (R() < 0.5) tSignBoard(p, 1, 1.5, W - 2, 2.4, R.pick(['港都大飯店', '國際商務飯店', '愛河大飯店', '南國飯店', '華王大飯店']), R); else { const x = W - 2.0; p.rect(x, 2, 1.6, Math.min(H - 6, 14), '#d8463a'); p.ink(x, 2, 1.6, Math.min(H - 6, 14), 0.08); p.vtext(R.pick(['大飯店', '商旅', '飯店']), x + 0.8, 2.6, 2 + Math.min(H - 7, 13), '#fff6e8', { maxSize: 1.3 }); p.flag(x, 2, 1.6, Math.min(H - 6, 14), 'sign'); } }
    if (style === 'commercial') for (let f = 0; f < Math.min(3, floors - 1); f++) if (R() < 0.85) { const w = W - 1.5 - R() * 3; tSignBoard(p, 0.4 + R() * (W - w - 0.8), 1 + f * fh + 0.3, w, 2.2, R.pick(SHOP_TYPES.class.concat(SHOP_TYPES.clinic, SHOP_TYPES.ktv, ['婚紗', '健身房', '補習', '牙醫診所', '聯合診所'])), R); }
  }
  p.rect(0, 0, W, 0.85, tshade(base, 0.12)); p.rect(0, 0.85, W, 0.15, tshade(base, -0.25)); p.line(0, 1, W, 1, INK, 0.05);
  p.rect(0, H - 1, W, 1, tshade(base, -0.12)); p.line(0, H - 1, W, H - 1, INK, 0.05);
  p.line(0.04, 0, 0.04, H, INK, 0.08); p.line(W - 0.04, 0, W - 0.04, H, INK, 0.08);
  return p.done();
}
// ---------- vertical signs: a word read top to bottom, lit at night ----------
function tVSign(seed) {
  const R = mulberry(seed), p = new TP(1.2, 4, TK.sign, seed), [bg, fg] = TSIGN[Math.floor(R() * TSIGN.length)], name = R.pick(VSIGN_NAMES).slice(0, 4);
  p.rect(0, 0, 1.2, 4, bg); if (R() < 0.5) { p.rr(0.1, 0.12, 1.0, 3.76, 0.08, '#fff6e8'); p.vtext(name, 0.6, 0.25, 3.75, bg === '#fff6e8' ? '#d8463a' : bg, { maxSize: 0.78 }); } else p.vtext(name, 0.6, 0.2, 3.8, fg, { maxSize: 0.8 });
  p.rect(0, 0, 1.2, 0.08, tshade(bg, 0.3)); p.flag(0, 0, 1.2, 4, 'sign'); p.ink(0, 0, 1.2, 4, 0.06);
  return p.done();
}
// ---------- street pieces ----------
function tColumn(seed) {   // 騎樓 pillars: tiled, a darker foot, posters stuck on
  const R = mulberry(seed), p = new TP(0.6, 4, 40, seed), [base, kind] = TWALL[[0, 2, 11, 3, 15][seed % 5]];
  tWallBase(p, 0, 0, 0.6, 4, base, kind === 'paint' ? 'tile' : kind); p.rect(0, 3.55, 0.6, 0.45, tshade(base, -0.3));
  if (R() < 0.7) { const y = 1.3 + R() * 1.2, c = ['#fff6e8', '#f2c94c', '#ff8fae', '#bfe0f2'][Math.floor(R() * 4)]; p.box(0.06, y, 0.48, 0.62, c, 0.02); for (let yy = y + 0.12; yy < y + 0.55; yy += 0.1) p.rect(0.12, yy, 0.36 * (0.5 + R() * 0.5), 0.035, '#2b2233'); }
  p.line(0.015, 0, 0.015, 4, INK, 0.03); p.line(0.585, 0, 0.585, 4, INK, 0.03);
  return p.done();
}
function tContainer(seed) {
  const p = new TP(12, 2.6, 16, seed), c = ['#d8503a', '#3a6ab8', '#2f9a6a', '#f2a23a', '#8a4aa0', '#9aa0a8', '#7a3a3a'][seed % 7];
  for (let x = 0; x < 12; x += 0.3) { p.rect(x, 0, 0.15, 2.6, tshade(c, 0.12)); p.rect(x + 0.15, 0, 0.15, 2.6, tshade(c, -0.1)); }
  p.box(0, 0, 12, 2.6, null, 0.08); p.rect(0, 0, 12, 0.18, tshade(c, -0.35)); p.rect(0, 2.42, 12, 0.18, tshade(c, -0.35));
  p.text(['PORT', 'KHH', 'SEA', 'LINE', 'BLUE'][seed % 5], 6, 1.0, 0.8, '#f6f1e6', { stroke: 0.06, strokeCol: tshade(c, -0.5) });
  return p.done();
}
function tWarehouse(seed, plain) {   // 駁二: corrugated sheds painted with murals (plain ones for the factories)
  const R = mulberry(seed), p = new TP(16, 8, 16, seed), c = plain ? ['#a9b2bc', '#b8b2a6', '#9aa6b2', '#c2bdb2'][seed % 4] : ['#9aa3ad', '#a8a297', '#8f98a2', '#b8b0a2'][seed % 4];
  for (let x = 0; x < 16; x += 0.4) { p.rect(x, 0, 0.2, 8, tshade(c, 0.1)); p.rect(x + 0.2, 0, 0.2, 8, tshade(c, -0.08)); }
  p.rect(0, 0, 16, 0.5, tshade(c, -0.35)); p.box(0.6, 4.8, 3.6, 3.2, '#3a3a48', 0.08); for (let y = 5.0; y < 8; y += 0.25) p.rect(0.7, y, 3.4, 0.06, '#50505e');
  if (plain) { for (let k = 0; k < 4; k++) p.box(6 + k * 2.4, 1.2, 1.6, 0.9, '#5a6a7a', 0.06); p.box(13, 4.8, 2.4, 3.2, tshade(c, -0.25), 0.06); p.rect(0, 7.6, 16, 0.4, tshade(c, -0.3)); }
  else if (R() < 0.85) { const cols = ['#f2c94c', '#e8504a', '#3a6ab8', '#4fae6a', '#f6f1e6', '#ef8a3a', '#ff8fae']; for (let k = 0; k < 8; k++) p.ell(5.6 + k * 1.25, 2.6 + Math.sin(k * 1.7) * 1.2, 0.9 + R() * 0.9, 0.8 + R() * 0.9, cols[k % cols.length], 0.06); p.text(R.pick(['駁二', '倉庫', 'PIER-2', 'ART']), 10.5, 5.6, 1.5, '#f6f1e6', { stroke: 0.12 }); }
  p.ink(0, 0, 16, 8, 0.1);
  return p.done();
}
function tBetel(seed) {   // 檳榔攤: a glass booth with a neon top
  const R = mulberry(seed), p = new TP(2.6, 2.6, 32, seed), neon = ['#ff4fa0', '#4ff0ff', '#ffe04f', '#4fff9a'][seed % 4];
  p.rect(0, 0, 2.6, 2.6, '#bcd9ea'); tFlagNow(p, 0, 0.8, 2.6, 1.8, 'shop');
  p.rect(0, 0, 2.6, 0.55, neon); p.rect(0, 0.55, 2.6, 0.12, ['#4fff80', '#ff4040', '#ffe04f'][seed % 3]); p.flag(0, 0, 2.6, 0.67, 'sign');
  p.text(R.pick(['檳榔', '阿娟檳榔', '雙星檳榔', '阿美檳榔']), 1.3, 0.3, 0.36, '#d8463a', { maxW: 2.4, stroke: 0.04, strokeCol: '#fff6e8' });
  p.box(0.15, 1.9, 2.3, 0.7, '#4a4a58', 0.04); for (let k = 0; k < 6; k++) p.rect(0.3 + k * 0.36, 1.98, 0.24, 0.18, ['#3f9a5c', '#d8463a', '#f2c94c'][k % 3]);
  p.ink(0, 0, 2.6, 2.6, 0.06); for (let y = 0.8; y < 2.6; y += 0.3) p.circle(2.52, y, 0.04, '#ffffff');
  return p.done();
}
function tBillboard(seed) {
  const R = mulberry(seed), p = new TP(12, 4, 20, seed), [bg, fg] = TSIGN[seed % TSIGN.length];
  p.rect(0, 0, 12, 4, bg); if (R() < 0.5) p.rr(0.3, 0.3, 11.4, 3.4, 0.3, '#fff6e8');
  const t = R.pick(['港都建設', '新成屋', '美語', '買房送車位', '牙科診所', '港都房屋', '歡迎光臨高雄', '新灣區', '健身房', '聯合醫院', '飲料', '汽車']);
  p.text(t, 6, 2.05, 1.9, R() < 0.5 && bg !== '#fff6e8' ? bg : fg === '#fff6e8' ? '#d8463a' : fg, { maxW: 11 });
  p.flag(0, 0, 12, 4, 'sign'); p.ink(0, 0, 12, 4, 0.12);
  return p.done();
}
function tRoadName(name) { const p = new TP(1.6, 0.4, 80); p.rect(0, 0, 1.6, 0.4, '#1f8a4a'); p.rr(0.03, 0.03, 1.54, 0.34, 0.04, null); p.g.strokeStyle = '#f6f1e6'; p.g.lineWidth = 0.02; p.g.stroke(); p.text(name, 0.8, 0.205, 0.26, '#f6f1e6', { maxW: 1.45 }); p.ink(0, 0, 1.6, 0.4, 0.02); return p.done(); }
function tTemple() { const p = new TP(4, 4, TK.tile, 3); p.rect(0, 0, 4, 4, '#c8382a'); for (let y = 0; y < 4; y += 1) { p.rect(0, y, 4, 0.12, '#f2c13a'); p.line(0, y + 0.12, 4, y + 0.12, INK, 0.03); } p.box(1.5, 1.5, 1.0, 2.5, '#5a2a18', 0.05); p.rect(1.6, 1.6, 0.8, 2.4, '#7a3a20'); for (let k = 0; k < 4; k++) p.circle(0.5 + k, 0.55, 0.15, '#f2c13a', 0.03); return p.done(); }
function tAwning(seed) {   // striped, with a scalloped hem
  const p = new TP(2, 1, 64, seed), [a, b] = [['#ff8fae', '#fff4ee'], ['#e8504a', '#f6f1e6'], ['#3f9a5c', '#f6f1e6'], ['#3a6ab8', '#f6f1e6']][seed % 4], sw = 0.25, g = p.g;
  for (let x = 0, i = 0; x < 2; x += sw, i++) p.rect(x, 0, sw, 0.78, i % 2 ? a : b);
  for (let x = 0, i = 0; x < 2; x += sw, i++) { g.fillStyle = i % 2 ? a : b; g.beginPath(); g.moveTo(x, 0.76); g.arc(x + sw / 2, 0.76, sw / 2, 0, Math.PI); g.closePath(); g.fill(); g.strokeStyle = INK; g.lineWidth = 0.03; g.beginPath(); g.arc(x + sw / 2, 0.76, sw / 2, 0, Math.PI); g.stroke(); }
  g.fillStyle = 'rgba(0,0,0,0.08)'; g.fillRect(0, 0.6, 2, 0.18); p.line(0, 0.02, 2, 0.02, INK, 0.04);
  return p.done();
}
function tJpRoof() { const p = new TP(4, 4, TK.tile, 4); for (let y = 0; y < 4; y += 0.25) for (let x = -(Math.round(y * 4) % 2) * 0.15; x < 4; x += 0.3) { p.rr(x + 0.01, y, 0.28, 0.27, 0.1, tshade('#4a5a5e', (p.R() - 0.5) * 0.15)); p.line(x + 0.02, y + 0.26, x + 0.27, y + 0.26, '#2a3234', 0.03); } return p.done(); }
function tGlass85() { const p = new TP(4, 4, TK.tile, 85); p.rect(0, 0, 4, 4, '#5a84a8'); for (let y = 0; y < 4; y += 1) { p.vgrad(0, y + 0.16, 4, 0.84, '#7aa4c8', '#5a84a8'); for (let x = 0; x < 4; x += 0.5) tFlagNow(p, x + 0.04, y + 0.16, 0.46, 0.84, 'win'); p.rect(0, y, 4, 0.16, '#c6d2dc'); } for (let x = 0; x < 4; x += 0.5) p.rect(x, 0, 0.04, 4, '#4a6a88'); p.g.fillStyle = 'rgba(255,255,255,0.14)'; p.g.beginPath(); p.g.moveTo(0.6, 0); p.g.lineTo(1.4, 0); p.g.lineTo(0, 2.4); p.g.lineTo(0, 1.2); p.g.closePath(); p.g.fill(); return p.done(); }
function tTank() { const p = new TP(1, 1, 64); for (let x = 0; x < 1; x += 0.125) { p.rect(x, 0, 0.0625, 1, '#e8edf2'); p.rect(x + 0.0625, 0, 0.0625, 1, '#a8b1bd'); } for (const y of [0.15, 0.5, 0.85]) p.rect(0, y, 1, 0.04, 'rgba(40,50,70,0.35)'); return p.done(); }
// the landmark signs and the MRT's
function tSign(text, fg, bg) {
  const p = new TP(6.4, 1.6, 40), B = cssHex(bg), F = cssHex(fg); p.rect(0, 0, 6.4, 1.6, B); p.rr(0.1, 0.1, 6.2, 1.4, 0.12, null); p.g.strokeStyle = tshade(B, 0.35); p.g.lineWidth = 0.05; p.g.stroke();
  p.text(text, 3.2, 0.82, 0.95, F, { maxW: 6.0 }); p.flag(0, 0, 6.4, 1.6, 'sign'); p.ink(0, 0, 6.4, 1.6, 0.07); return p.done();
}
function tMrt(col) { const p = new TP(3.2, 1, 40), C = cssHex(col); p.rect(0, 0, 3.2, 1, C); p.rr(0.1, 0.1, 3.0, 0.8, 0.1, '#fff6e8'); p.circle(0.5, 0.5, 0.26, C); p.text('M', 0.5, 0.52, 0.32, '#fff6e8'); p.text('高雄捷運', 1.85, 0.52, 0.42, C, { maxW: 2.4 }); p.flag(0, 0, 3.2, 1, 'sign'); p.ink(0, 0, 3.2, 1, 0.05); return p.done(); }
// ---------- paint the whole atlas in the illustrated style ----------
function atlasPaintToon() {
  const plains = { white: '#f6f1e6', dark: '#2e2b3a', black: '#1d1a26', red: '#d8463a', yellow: '#f2c13a', green: '#3f9a5c', grey: '#8e909c', steel: '#c5ccd6', blue: '#3a6ab8', orange: '#ef8a3a', kerb: '#d9d4ca', ceil: '#4a4252', sand: '#ecd9a6' };
  for (const k in plains) tile(k, tPlain(plains[k]));
  tile('tank', tTank());
  tile('asph', tAsphTile()); tile('conc', tConc()); tile('grass', tGrass()); tile('water', tWater());
  for (const k of Object.keys(RK)) if (!ATLAS.items.find((i) => i.name === RK[k].tile)) tile(RK[k].tile, tRoad(k));
  for (let i = 0; i < 3; i++) tile('walk' + i, tWalk(20 + i)); tile('zebra', tZebra()); tile('median', tMedian());
  for (let i = 0; i < 8; i++) tile('wall' + i, tWallTile(100 + i, (i * 5) % TWALL.length));
  for (let i = 0; i < 4; i++) tile('roof' + i, tRoofTile(200 + i, 'concrete')); for (let i = 0; i < 3; i++) tile('tin' + i, tRoofTile(210 + i, 'tin')); tile('rooftiles', tRoofTile(220, 'tiles')); tile('glassroof', tRoofTile(230, 'glass'));
  for (let i = 0; i < 4; i++) tile('col' + i, tColumn(300 + i)); for (let i = 0; i < 6; i++) tile('box' + i, tContainer(400 + i)); for (let i = 0; i < 4; i++) tile('wh' + i, tWarehouse(500 + i)); for (let i = 0; i < 4; i++) tile('shed' + i, tWarehouse(520 + i, true)); for (let i = 0; i < 3; i++) tile('betel' + i, tBetel(600 + i)); for (let i = 0; i < 6; i++) tile('bb' + i, tBillboard(700 + i));
  for (const type of Object.keys(SHOP_TYPES)) { if (type === 'hotel') continue; const n = type === 'shutter' || type === 'bank' || type === 'cvs' ? 4 : 8; ATLAS.shops[type] = []; for (let i = 0; i < n; i++) { const nm = 'sh_' + type + i; tile(nm, tShop(1000 + i * 13 + strSeed(type) % 97, type)); ATLAS.shops[type].push(nm); } }
  for (const dist of ['town', 'centre', 'yancheng', 'bay']) for (const w of [5, 6, 7]) for (let i = 0; i < 5; i++) {
    const floors = dist === 'yancheng' ? 2 + (i % 2) : dist === 'bay' ? 4 + (i % 2) : 3 + (i % 3), seed = strSeed(dist) + w * 31 + i * 7;
    const th = tTownhouse(seed, w, floors, dist), nm = 'th_' + dist + w + '_' + i; tile(nm, th.px);
    ATLAS.th.push({ name: nm, dist, w: w * 10, floors, type: th.type, shopName: th.name, hPx: th.px.h });
  }
  const bigs = [['apt', 16, 9], ['apt', 20, 12], ['apt', 14, 8], ['office', 20, 12], ['office', 24, 15], ['glass', 24, 18], ['glass', 30, 22], ['hotel', 22, 11], ['hotel', 18, 9], ['commercial', 16, 8], ['commercial', 20, 10], ['apt', 24, 14], ['office', 16, 10], ['glass', 20, 16]];
  bigs.forEach(([style, w, floors], i) => { const nm = 'big' + i; tile(nm, tBig(2000 + i * 17, w, floors, style)); ATLAS.bigs.push({ name: nm, style, w, floors, h: floors * 3.2 + 1.3 }); });
  for (let i = 0; i < 40; i++) { const nm = 'vs' + i; tile(nm, tVSign(3000 + i * 11)); ATLAS.vsigns.push(nm); }
  tile('temple', tTemple()); for (let i = 0; i < 4; i++) tile('awning' + i, tAwning(800 + i));
  tile('jproof', tJpRoof()); tile('glass85', tGlass85());
  const names = new Set(); for (const rd of MAP.roads) if (rd.name && !names.has(rd.name)) { names.add(rd.name); tile('rn_' + rd.name, tRoadName(rd.name)); }
  moreTiles();
  atlasBuild();
}
