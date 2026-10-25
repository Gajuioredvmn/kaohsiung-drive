// ===================== the billboards: trees, scooters, boats, signal lamps — painted pixels stood upright =====================
// Every prop is a picture that turns to face the camera about the vertical. Pictures are painted once into one atlas;
// props only hold an index. Trees and the like also register a round collider for the car.
const PROPS = { kinds: {}, list: [], atlas: null };
const PR = 16;   // pixels to the metre for the props
function propKind(name, px, hM, o) { PROPS.kinds[name] = Object.assign({ name, px, hM, wM: (hM * px.w) / px.h, solid: false }, o || {}); }
// a leafy blob: four tones from the shadowed underside up to the sunlit top, dithered between them, a rough edge
function blob(px, cx, cy, rx, ry, tones, r) {
  for (let j = Math.floor(cy - ry); j <= Math.ceil(cy + ry); j++) for (let i = Math.floor(cx - rx); i <= Math.ceil(cx + rx); i++) {
    const dx = (i + 0.5 - cx) / rx, dy = (j + 0.5 - cy) / ry, d2 = dx * dx + dy * dy; if (d2 > 1) continue;
    if (d2 > 0.72 && hash2(i * 1.3 + cx, j * 1.7 + cy) < (d2 - 0.72) * 2.5) continue;   // a ragged rim of leaves
    const l = clamp(0.55 - dy * 0.55 - dx * 0.2 + Math.sqrt(1 - d2) * 0.35, 0, 1), t = l * (tones.length - 1), k = Math.min(tones.length - 2, Math.floor(t));
    px.dset(i, j, tones[k], tones[k + 1], smooth(0.3, 0.7, t - k));
  }
}
// ---------- the illustrated trees: clumps of leaves with ink round each, a lighter top, little leaf marks ----------
function tClump(px, x, y, rx, ry, dark, mid, light, r, lw) {
  const g = px.g; g.lineWidth = lw || 1.1;
  g.fillStyle = cssHex(dark); g.strokeStyle = INK; g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, TAU); g.fill(); g.stroke();
  g.fillStyle = cssHex(mid); g.beginPath(); g.ellipse(x - rx * 0.12, y - ry * 0.16, rx * 0.84, ry * 0.76, 0, 0, TAU); g.fill();
  g.fillStyle = cssHex(light); g.beginPath(); g.ellipse(x - rx * 0.3, y - ry * 0.38, rx * 0.42, ry * 0.32, -0.3, 0, TAU); g.fill();
  g.strokeStyle = cssHex(shadeHex(dark, 0.85)); g.lineWidth = 0.8;
  for (let k = 0; k < 3; k++) { const a = r() * TAU, d = r() * 0.55, cx = x + Math.cos(a) * rx * d, cy = y + Math.sin(a) * ry * d * 0.8 + ry * 0.15, w = rx * 0.14; g.beginPath(); g.moveTo(cx - w, cy); g.lineTo(cx, cy - w * 0.9); g.lineTo(cx + w, cy); g.stroke(); }
}
function tTree(seed, kind) {
  const r = mulberry(seed);
  if (kind === 'palm') {
    const H = 11 * PR, W = 7 * PR, px = new VPix(W, H, 2), g = px.g, cx = W / 2, top = 2.2 * PR;
    // the trunk: a tapering curve, ringed
    g.lineCap = 'round'; const tx = (y) => cx + Math.sin((y - top) / H * 1.2) * 6 - 3;
    for (const [c, w] of [[INK, 9], [0x8a6a3a, 6.5]]) { g.strokeStyle = typeof c === 'string' ? c : cssHex(c); g.lineWidth = w; g.beginPath(); for (let y = top; y <= H - 2; y += 4) { const x = tx(y); if (y === top) g.moveTo(x, y); else g.lineTo(x, y); } g.stroke(); }
    g.strokeStyle = cssHex(0x6a4a2a); g.lineWidth = 1; for (let y = top + 6; y < H - 4; y += 7) { const x = tx(y); g.beginPath(); g.moveTo(x - 3, y); g.lineTo(x + 3, y + 1); g.stroke(); }
    // the fronds: thick dark strokes with a lighter spine
    for (let k = 0; k < 9; k++) {
      const a = (k / 9) * TAU + r() * 0.4, len = 2.6 * PR + r() * PR, ex = cx + Math.cos(a) * len, ey = top + Math.sin(a) * len * 0.5 + (0.6 + r() * 0.8) * 16, mx = cx + Math.cos(a) * len * 0.7, my = top + Math.sin(a) * len * 0.35 - 14;
      for (const [c, w] of [[INK, 9], ['#2f7a3a', 6.5], ['#5fae5a', 2.2]]) { g.strokeStyle = c; g.lineWidth = w; g.beginPath(); g.moveTo(cx, top); g.quadraticCurveTo(mx, my, ex, ey); g.stroke(); }
      g.strokeStyle = '#2f7a3a'; g.lineWidth = 1.2; for (let t = 0.3; t < 0.95; t += 0.12) { const u = 1 - t, x = u * u * cx + 2 * u * t * mx + t * t * ex, y = u * u * top + 2 * u * t * my + t * t * ey; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a + 1.2) * 5, y + 5); g.moveTo(x, y); g.lineTo(x + Math.cos(a - 1.2) * 5, y + 5); g.stroke(); }
    }
    for (let k = 0; k < 5; k++) { g.fillStyle = '#b07a3a'; g.strokeStyle = INK; g.lineWidth = 0.9; g.beginPath(); g.arc(cx - 5 + r() * 10, top + 5 + r() * 5, 2.4, 0, TAU); g.fill(); g.stroke(); }
    px.outline(); return px;
  }
  if (kind === 'tall') {   // 黑板樹: tiers on a straight trunk
    const H = 14 * PR, W = 8 * PR, px = new VPix(W, H, 2), cx = W / 2;
    px.rect(cx - 5, H * 0.42, 10, H * 0.58, 0x6a5238); px.rect(cx - 5, H * 0.42, 3, H * 0.58, 0x8a6e4e);
    for (let k = 5; k >= 0; k--) { const y = 12 + k * 26 + r() * 6, rx = Math.min(28 + k * 9 + r() * 10, W / 2 - 4), ry = 15 + r() * 6; tClump(px, cx + (r() - 0.5) * 10, y, rx, ry, 0x23602e, 0x3a8a3c, 0x6cbf58, r, 1.3); }
    px.outline(); return px;
  }
  const H = 9 * PR, W = 9 * PR, px = new VPix(W, H, 2), g = px.g, cx = W / 2, flame = kind === 'flame';
  // the trunk, forking
  g.lineCap = 'round';
  for (const [c, w] of [[INK, 10], ['#6e5238', 7]]) { g.strokeStyle = c; g.lineWidth = w; g.beginPath(); g.moveTo(cx, H - 2); g.lineTo(cx, H * 0.55); for (let k = 0; k < 3; k++) { const a = -Math.PI / 2 + (k - 1) * 0.7; g.moveTo(cx, H * 0.6); g.lineTo(cx + Math.cos(a) * 34, H * 0.6 + Math.sin(a) * 34); } g.stroke(); }
  g.strokeStyle = '#8e6e4e'; g.lineWidth = 2; g.beginPath(); g.moveTo(cx - 2, H - 4); g.lineTo(cx - 2, H * 0.62); g.stroke();
  const tones = flame ? [0x2f6a2c, 0x4a8e3a, 0x7cbc54] : [0x23602e, 0x3a8a3c, 0x6cbf58];
  const clumps = []; for (let k = 0; k < 11; k++) { const a = r() * TAU, d = Math.sqrt(r()) * 0.62; clumps.push([cx + Math.cos(a) * d * W * 0.36, H * 0.34 + Math.sin(a) * d * H * 0.2, 20 + r() * 14]); }
  clumps.push([cx, H * 0.26, 26]); clumps.sort((p, q) => q[1] - p[1]);
  for (const [x, y, R] of clumps) tClump(px, x, y, R, R * 0.82, tones[0], tones[1], tones[2], r, 1.3);
  if (flame) for (let k = 0; k < 26; k++) { const x = 14 + r() * (W - 28), y = 8 + r() * H * 0.45; if (!px.on(x, y)) continue; g.fillStyle = r() < 0.5 ? '#e8443a' : '#f2703a'; g.strokeStyle = INK; g.lineWidth = 0.7; g.beginPath(); g.arc(x, y, 3 + r() * 2, 0, TAU); g.fill(); g.stroke(); }
  px.outline(); return px;
}
// a cartoon cloud: white lumps, a lavender underside, a soft line round it
function tCloud(seed) {
  const r = mulberry(seed), W = 96, H = 40, px = new VPix(W, H, 3), g = px.g, lumps = [];
  for (let k = 0; k < 6; k++) lumps.push([16 + r() * (W - 32), 16 + r() * 10, 9 + r() * 9]);
  const all = (fill, dy, sc) => { g.fillStyle = fill; g.beginPath(); for (const [x, y, R] of lumps) { g.moveTo(x + R * sc, y + dy); g.ellipse(x, y + dy, R * sc, R * sc * 0.7, 0, 0, TAU); } g.fill(); };
  g.save(); g.translate(0, 0); all('#c9cfe6', 2, 1.0); all('#ffffff', -1, 0.92); g.restore();
  const sil = canvas(px.cw, px.ch), sg = sil.getContext('2d'); sg.drawImage(px.cv, 0, 0); sg.globalCompositeOperation = 'source-in'; sg.fillStyle = '#9aa6c8'; sg.fillRect(0, 0, px.cw, px.ch);
  const G = px.g; G.save(); G.setTransform(1, 0, 0, 1, 0, 0); G.globalCompositeOperation = 'destination-over'; for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; G.drawImage(sil, Math.cos(a) * 2, Math.sin(a) * 2); } G.restore();
  return px;
}
// ---------- the illustrated walkers: big round heads, thick inked limbs, seen from the side and walking ----------
// Drawn in units of a 40 × 58 box with the feet at (20, 56); a walker is 1.7 m tall, so about 34 units to the metre.
const TPEOPLE = [
  { name: '阿伯', hair: '#d9d9e0', style: 'bald', skin: '#e8b88a', shirt: '#f6f4ee', clothes: 'tank', pants: '#3f6fd0', shoes: '#3f6fd0', slippers: true, hunch: 1.2, brows: true },
  { name: '阿姨', hair: '#5a3a66', style: 'perm', skin: '#f2c8a0', shirt: '#e2557f', pants: '#3a3550', shoes: '#7a2b3b', bag: '#f2c94c' },
  { name: '上班族', hair: '#24202c', style: 'slick', skin: '#f0c49c', shirt: '#f4f6fa', clothes: 'tie', pants: '#2e3448', shoes: '#1a1a22', brief: '#5a3a2a' },
  { name: 'OL', hair: '#3a2a26', style: 'pony', skin: '#f6d0ac', shirt: '#bcd6e8', pants: '#2b2f45', skirt: true, shoes: '#2b2233', bag: '#c9704a' },
  { name: '男學生', hair: '#1f1d29', style: 'short', skin: '#f0c49c', shirt: '#f6f4ee', pants: '#2f4a7a', shorts: true, shoes: '#f6f1e6', pack: '#3a6ab8' },
  { name: '女學生', hair: '#2a2230', style: 'pony', skin: '#f6d0ac', shirt: '#f6f4ee', pants: '#253a6a', skirt: true, shoes: '#2b2233', pack: '#e8504a' },
  { name: '外送員', hair: '#26222e', style: 'cap', cap: '#ef8a3a', skin: '#e0b088', shirt: '#ef8a3a', pants: '#2a2f45', shoes: '#2a2a36', box: '#ef8a3a' },
  { name: '年輕人', hair: '#3a2a20', style: 'short', skin: '#f0c49c', shirt: '#7cc28a', clothes: 'hood', pants: '#4a6aa0', shoes: '#f6f1e6' },
  { name: '辣妹', hair: '#6b4a2a', style: 'long', skin: '#f6d0ac', shirt: '#ff8fae', pants: '#f6f1e6', shorts: true, shoes: '#f6f1e6', glasses: 'sun', blush: true },
  { name: '阿嬤', hair: '#c9c9d2', style: 'perm', skin: '#e8b88a', shirt: '#8fbf6a', clothes: 'flower', pants: '#4a4252', shoes: '#2b2233', hunch: 2, cane: true },
  { name: '工人', hair: '#26222e', style: 'helmet', cap: '#f2c13a', skin: '#c89868', shirt: '#4a6a9a', clothes: 'vest', pants: '#3a3a48', shoes: '#5a3a2a' },
  { name: '慢跑', hair: '#1f1d29', style: 'band', cap: '#e8504a', skin: '#e0b088', shirt: '#3a6ab8', clothes: 'tank', pants: '#2b2233', shorts: true, shoes: '#f2c94c' },
  { name: '觀光客', hair: '#c9a46a', style: 'hat', cap: '#f1e2a8', skin: '#f6d0ac', shirt: '#f2c94c', pants: '#c9a46a', shorts: true, shoes: '#8a6e4e', pack: '#4fae6a', camera: true },
  { name: '警察', hair: '#26222e', style: 'police', cap: '#253a6a', skin: '#f0c49c', shirt: '#9cbcd8', pants: '#253a6a', shoes: '#1a1a22', brows: true },
  { name: '阿公', hair: '#e8e8ee', style: 'short', skin: '#e0b088', shirt: '#f6f4ee', pants: '#7a5a3a', shoes: '#3a2a20', hunch: 1.6, fan: true, mustache: true },
  { name: '小朋友', hair: '#2a2230', style: 'bowl', skin: '#f6d0ac', shirt: '#f2c94c', pants: '#e8504a', shorts: true, shoes: '#3a6ab8', kid: true, blush: true },
];
function tShade(hex, k) { return typeof tshade === 'function' ? tshade(hex, k) : hex; }
// a walker seen from the right; ph is the step (0 to 1) or null standing still
function tPerson(spec, ph) {
  const px = new VPix(40, 58, 3), g = px.g, S = spec, X = 20, Y = 56, kid = S.kid ? 0.78 : 1;
  g.save(); g.translate(X, Y); g.scale(kid, kid); g.lineCap = 'round'; g.lineJoin = 'round';
  const walking = ph != null, sw = walking ? Math.sin(ph * TAU) : 0, bob = walking ? -Math.abs(Math.cos(ph * TAU)) * 1.0 : 0, hunch = S.hunch || 0;
  const hipY = -15 + bob, shY = -31 + bob + hunch * 0.6, headY = -41 + bob + hunch;
  const limb = (x0, y0, x1, y1, w, col, ink) => { if (ink !== false) { g.strokeStyle = INK; g.lineWidth = w + 2; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke(); } g.strokeStyle = col; g.lineWidth = w; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke(); };
  const eo = (x, y, rx, ry, col, rot) => { g.fillStyle = INK; g.beginPath(); g.ellipse(x, y, rx + 1, ry + 1, rot || 0, 0, TAU); g.fill(); g.fillStyle = col; g.beginPath(); g.ellipse(x, y, rx, ry, rot || 0, 0, TAU); g.fill(); };
  const e = (x, y, rx, ry, col, rot) => { g.fillStyle = col; g.beginPath(); g.ellipse(x, y, rx, ry, rot || 0, 0, TAU); g.fill(); };
  const blob = (pts, col, ink) => { g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); if (ink !== false) { g.strokeStyle = INK; g.lineWidth = 2; g.stroke(); } g.fillStyle = col; g.fill(); };
  const curve = (pts, col, w) => { g.strokeStyle = col; g.lineWidth = w; g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.stroke(); };
  const skinD = tShade(S.skin, -0.15), shirtD = tShade(S.shirt, -0.22);
  // the legs: the far one first, darker; shorts show the knees
  const leg = (x0, a, near, lift) => {
    const len = 12.5, fx = x0 + Math.sin(a) * len, fy = Math.min(-1.8, hipY + Math.cos(a) * len - (lift || 0)), pc = near ? S.pants : tShade(S.pants, -0.2);
    if (S.shorts || S.skirt) { const kx = x0 + Math.sin(a) * 5.5, ky = hipY + Math.cos(a) * 5.5; limb(kx, ky, fx, fy, 3.8, near ? S.skin : skinD); if (!S.skirt) limb(x0, hipY - 0.5, kx, ky, 5.8, pc); }
    else limb(x0, hipY, fx, fy, 5.2, pc);
    if (S.slippers) { eo(fx + 1.2, fy + 0.6, 3.6, 1.4, '#3f6fd0'); e(fx + 1.2, fy + 0.2, 2.6, 0.6, '#ffffff'); }
    else eo(fx + 1.5, fy + 0.4, 3.9, 2.0, near ? S.shoes : tShade(S.shoes, -0.2));
  };
  const lift = walking ? Math.max(0, Math.cos(ph * TAU)) * 2.2 : 0, lift2 = walking ? Math.max(0, -Math.cos(ph * TAU)) * 2.2 : 0;
  leg(-0.5, sw * 0.45, false, lift2);
  // the far arm
  const arm = (x0, y0, a, near) => {
    const L = 12, hx = x0 + Math.sin(a) * L, hy = y0 + Math.cos(a) * L;
    if (S.clothes === 'tank') limb(x0, y0, hx, hy, 3.6, near ? S.skin : skinD);
    else { const mx = x0 + Math.sin(a) * 6, my = y0 + Math.cos(a) * 6; limb(mx, my, hx, hy, 3.4, near ? S.skin : skinD); limb(x0, y0, mx, my, 4.6, near ? S.shirt : shirtD); }
    eo(hx, hy + 0.6, 2.2, 2.2, near ? S.skin : skinD);
    return [hx, hy];
  };
  if (S.pack) blob([[-9, shY + 1], [-3, shY], [-2.5, hipY - 1], [-9.5, hipY]], S.pack);
  if (S.box) { blob([[-13, shY - 3], [-3, shY - 3], [-3, hipY], [-13, hipY]], S.box); curve([[-12, shY + 3], [-4, shY + 3]], tShade(S.box, -0.3), 1.2); }
  arm(-0.5, shY + 2, -sw * 0.5, false);
  // the body
  const tw = 11, tb = S.skirt ? 13 : 11.5, top = shY, bot = hipY + 1.2;
  if (S.clothes === 'tank') { blob([[-tw / 2, top + 2], [-tw / 2 + 2, top], [tw / 2 - 2, top], [tw / 2, top + 2], [tb / 2, bot], [-tb / 2, bot]], S.skin); blob([[-tw / 2 + 2.4, top + 1.5], [-tw / 2 + 3.6, top], [tw / 2 - 3.6, top], [tw / 2 - 2.4, top + 1.5], [tb / 2 - 0.5, bot], [-tb / 2 + 0.5, bot]], S.shirt, false); }
  else blob([[-tw / 2, top + 1.5], [-tw / 2 + 2.5, top - 0.5], [tw / 2 - 2.5, top - 0.5], [tw / 2, top + 1.5], [tb / 2, bot], [0, bot + 0.6], [-tb / 2, bot]], S.shirt);
  e(2.4, (top + bot) / 2 + 2, tw * 0.32, (bot - top) * 0.45, shirtD);
  if (S.skirt) blob([[-tb / 2, bot - 2], [tb / 2, bot - 2], [tb / 2 + 2.2, bot + 6], [-tb / 2 - 2.2, bot + 6]], S.pants);
  if (S.clothes === 'tie') { blob([[1.8, top + 0.5], [4.2, top + 0.5], [3.4, top + 3]], '#f6f4ee', false); blob([[2.6, top + 2], [3.6, top + 2], [3.9, top + 9], [3.1, top + 10.5], [2.4, top + 9]], '#d63a4a', false); }
  if (S.clothes === 'vest') { blob([[-tw / 2 + 0.5, top + 1.5], [tw / 2 - 0.5, top + 1.5], [tb / 2 - 0.5, bot], [-tb / 2 + 0.5, bot]], '#ff8a2a'); limb(-tb / 2 + 1, bot - 5, tb / 2 - 1, bot - 5, 1.6, '#f2f6c8', false); limb(-tb / 2 + 1, bot - 2.4, tb / 2 - 1, bot - 2.4, 1.6, '#f2f6c8', false); }
  if (S.clothes === 'hood') { e(-3.5, top + 1, 4.5, 2.6, shirtD); curve([[4.2, top + 2], [4.6, top + 7]], '#f6f1e6', 0.8); }
  if (S.clothes === 'flower') for (let i = 0; i < 6; i++) { e(-4 + (i % 3) * 3.6, top + 3 + Math.floor(i / 3) * 5.5, 1.2, 1.2, i % 2 ? '#ff8fae' : '#fff4f0'); }
  if (S.clothes === 'tank' && S.shorts) { /* the jogger's number */ blob([[-2.5, top + 4], [3.5, top + 4], [3.5, top + 9], [-2.5, top + 9]], '#f6f1e6', false); }
  // the near arm, with whatever it holds
  const [hx, hy] = arm(0.5, shY + 2, sw * 0.5, true);
  if (S.brief) { blob([[hx - 3.5, hy + 1.5], [hx + 4, hy + 1.5], [hx + 4, hy + 7.5], [hx - 3.5, hy + 7.5]], S.brief); }
  if (S.bag) { curve([[hx, hy + 1], [hx + 1, hy + 4]], INK, 1); blob([[hx - 2.5, hy + 4], [hx + 4.5, hy + 4], [hx + 5, hy + 10], [hx - 3, hy + 10]], S.bag); }
  if (S.cane) { limb(hx + 1, hy + 1, hx + 3, 0, 1.6, '#8a5a3a'); }
  if (S.fan) { blob([[hx + 1, hy], [hx + 7, hy - 4], [hx + 8, hy + 2]], '#f2c94c'); }
  if (S.camera) { blob([[hx - 2, hy - 1], [hx + 4, hy - 1], [hx + 4, hy + 3], [hx - 2, hy + 3]], '#2b2233'); e(hx + 1, hy + 1, 1.2, 1.2, '#8fb6ff'); }
  // the head
  const R = 9.6, hx0 = 0.8, hy0 = headY, hair = S.hair;
  if (S.style === 'pony') blob([[-11.5, hy0 - 2], [-6.5, hy0 - 2], [-5.6, hy0 + 8], [-9, hy0 + 12], [-12.4, hy0 + 8]], hair);
  if (S.style === 'long') blob([[-10.5, hy0 - 5], [-2, hy0 - 6], [-1, hy0 + 10], [-8, hy0 + 13], [-11, hy0 + 8]], hair);
  if (S.style === 'perm') for (let i = 0; i < 9; i++) { const a = Math.PI * (0.9 + i / 8 * 1.2); eo(hx0 + Math.cos(a) * 9.5, hy0 - 1 + Math.sin(a) * 9, 4, 4, hair); }
  eo(hx0 - 3, hy0 + 1, 1.7, 2.2, S.skin);
  eo(hx0, hy0, R, R * 0.98, S.skin); e(hx0 + 2.5, hy0 + 3.5, R * 0.72, R * 0.5, tShade(S.skin, 0.07));
  const st = S.style;
  if (st === 'short' || st === 'slick' || st === 'band') { blob([[-9.2, hy0 + 1], [-9.6, hy0 - 6], [-4, hy0 - 10.8], [4, hy0 - 10.5], [9, hy0 - 5.6], [6, hy0 - 6.6], [1, hy0 - 5.8], [-3, hy0 - 3.6], [-5.4, hy0 + 2]], hair); if (st === 'slick') curve([[-6, hy0 - 7], [2, hy0 - 8.6], [7, hy0 - 6.4]], '#5a5868', 1); if (st === 'band') { blob([[-9.6, hy0 - 6.5], [9.4, hy0 - 6.5], [9.4, hy0 - 3.8], [-9.6, hy0 - 3.8]], S.cap); } }
  else if (st === 'pony' || st === 'long') { blob([[-9.4, hy0 + 3], [-9.8, hy0 - 6], [-4, hy0 - 10.8], [4, hy0 - 10.4], [9.2, hy0 - 5], [5, hy0 - 6], [0, hy0 - 4.6], [-4, hy0 - 2], [-6, hy0 + 4]], hair); if (st === 'pony') eo(-7.5, hy0 - 6.5, 1.8, 1.4, '#ff8fae'); }
  else if (st === 'perm') { blob([[-9.6, hy0 + 1], [-9, hy0 - 8], [-2, hy0 - 11.4], [5, hy0 - 10.4], [9.6, hy0 - 5], [6, hy0 - 5.2], [2, hy0 - 6.8], [-3, hy0 - 4]], hair); for (let i = 0; i < 5; i++) curve([[-6 + i * 3, hy0 - 9], [-5 + i * 3, hy0 - 7.6]], tShade(hair, 0.25), 1.1); }
  else if (st === 'bald') { e(hx0 - 3, hy0 - 6.5, 4.5, 2.4, tShade(S.skin, 0.18)); blob([[hx0 - 9.8, hy0 - 2], [hx0 - 10.3, hy0 + 3], [hx0 - 7.6, hy0 + 4], [hx0 - 7.2, hy0 - 1.6]], hair); }
  else if (st === 'bowl') { blob([[-9.8, hy0 + 2], [-9.6, hy0 - 7], [-3, hy0 - 11], [5, hy0 - 10.5], [9.8, hy0 - 5], [9.8, hy0 - 2.5], [-3, hy0 - 2.5], [-6, hy0 + 2]], hair); }
  else if (st === 'cap' || st === 'police') { blob([[-9.6, hy0 - 2], [-8.4, hy0 - 9], [0, hy0 - 12], [7, hy0 - 8.4], [8, hy0 - 3.6], [-6, hy0 - 3.6]], S.cap); blob([[5, hy0 - 4.6], [13.4, hy0 - 3.4], [13, hy0 - 2], [5, hy0 - 2.6]], tShade(S.cap, -0.2)); if (st === 'police') e(1, hy0 - 8, 2.4, 1.8, '#f2c13a'); blob([[-9.4, hy0 - 1.8], [-6, hy0 - 1.6], [-6.2, hy0 + 3], [-9.4, hy0 + 2]], hair, false); }
  else if (st === 'helmet') { blob([[-10.4, hy0 - 1], [-9.6, hy0 - 8.6], [-2, hy0 - 13], [6, hy0 - 11.6], [10, hy0 - 6], [12.4, hy0 - 2.4], [-10.4, hy0 - 2.4]], S.cap); curve([[-2, hy0 - 12.6], [5, hy0 - 3]], tShade(S.cap, -0.3), 1); }
  else if (st === 'hat') { blob([[-14, hy0 - 3.4], [14.5, hy0 - 3.4], [12, hy0 - 1.4], [-12, hy0 - 1.4]], S.cap); blob([[-8, hy0 - 3.4], [-7, hy0 - 11.5], [6, hy0 - 11.5], [7.5, hy0 - 3.4]], S.cap); limb(-7.6, hy0 - 4.6, 7.2, hy0 - 4.6, 1.8, '#e8504a', false); }
  // the face, turned to the right
  const eyeY = hy0 + 1.6, ex = 5.2;
  if (S.glasses === 'sun') { e(ex, eyeY, 2.8, 2.2, INK); curve([[ex - 3, eyeY - 1.6], [-2, eyeY - 2.2]], INK, 1); }
  else { e(ex, eyeY, 1.35, 1.9, INK); e(ex - 0.4, eyeY - 0.8, 0.5, 0.5, '#ffffff'); }
  if (S.brows) curve([[ex - 2, eyeY - 3.6], [ex + 1.6, eyeY - 3.2]], tShade(hair, -0.1), 1.4);
  if (S.blush) e(3.4, hy0 + 5.2, 1.9, 1.1, 'rgba(255,120,140,0.6)');
  curve([[9.4, hy0 + 2], [10.6, hy0 + 4], [9.2, hy0 + 4.8]], INK, 0.9);
  const mx = 6.8, my = hy0 + 6.6;
  if (S.mustache) blob([[mx - 1, my - 1.6], [mx + 3.2, my - 1.4], [mx + 3, my - 0.4], [mx - 0.6, my - 0.6]], hair, false);
  curve([[mx - 1, my - 0.4], [mx + 0.6, my + 0.4], [mx + 1.8, my - 0.2]], INK, 0.9);
  g.restore();
  return px;
}
// knocked over: the standing picture laid on its back
function tPersonDown(spec) {
  const up = tPerson(spec, null), px = new VPix(58, 40, 3), g = px.g;
  g.save(); g.translate(2, 38); g.rotate(-Math.PI / 2); g.drawImage(up.cv, 0, 0, 40, 58); g.restore();
  return px;
}
function paintTree(seed, kind) {
  if (STYLE.toon) return tTree(seed, kind);
  const r = mulberry(seed);
  if (kind === 'palm') {
    const H = 11 * PR, W = 7 * PR, px = new Pix(W, H), cx = W / 2, top = 2.2 * PR;
    // the trunk leans a little and is ringed
    for (let y = top; y < H; y++) { const x = cx + Math.sin((y - top) / H * 1.2) * 6 - 3, w = 5 + (y - top) / H * 5; px.rect(x - w / 2, y, w, 1, (y % 6 < 2) ? 0x6a4a2a : 0x8a6a3a); px.rect(x - w / 2, y, 2, 1, 0x9a7a4a); }
    const tones = [0x1a5a28, 0x2a7a34, 0x3a9a40, 0x62b84a];
    for (let k = 0; k < 9; k++) { const a = (k / 9) * TAU + r() * 0.4, len = 2.6 * PR + r() * PR, droop = 0.6 + r() * 0.8; px.curve(cx, top, cx + Math.cos(a) * len * 0.7, top + Math.sin(a) * len * 0.35 - 14, cx + Math.cos(a) * len, top + Math.sin(a) * len * 0.5 + droop * 16, tones[2], 10, 2, (x, y, t, w) => { for (let q = -w / 2; q <= w / 2; q += 1) px.dset(x, y + q, tones[1 + (q > 0 ? 0 : 1)], tones[Math.min(3, 2 + (q < -w / 4 ? 1 : 0))], 0.5 + t * 0.3); }); }
    blob(px, cx, top + 4, 10, 7, [0x3a7a2a, 0x5a9a3a, 0x7aba4a, 0x9ad060], r);
    for (let k = 0; k < 8; k++) px.rect(cx - 6 + r() * 12, top + 6 + r() * 6, 3, 3, 0xa0702a);   // the coconuts
    px.outline(0x0c200e); return px;
  }
  if (kind === 'tall') {   // 黑板樹: tiers of leaves on a straight trunk
    const H = 14 * PR, W = 8 * PR, px = new Pix(W, H), cx = W / 2, tones = [0x1a4a26, 0x2a6a30, 0x3e8e3a, 0x6ab84c];
    px.rect(cx - 5, H * 0.45, 10, H * 0.55, 0x5a4a30); px.rect(cx - 5, H * 0.45, 3, H * 0.55, 0x7a6a48);
    for (let k = 0; k < 6; k++) { const y = 10 + k * 26 + r() * 6, rx = 28 + k * 9 + r() * 10, ry = 16 + r() * 6; blob(px, cx + (r() - 0.5) * 10, y, Math.min(rx, W / 2 - 2), ry, tones, r); }
    px.outline(0x0c200e); return px;
  }
  const H = 9 * PR, W = 9 * PR, px = new Pix(W, H), cx = W / 2;
  const tones = kind === 'flame' ? [0x2a5a24, 0x3e7e30, 0x5aa040, 0x82c454] : [0x1e5a2a, 0x2f7e30, 0x52a83c, 0x7acc4c];
  // the trunk, forking into two or three branches
  px.rect(cx - 8, H * 0.5, 16, H * 0.5, 0x5a4a30); px.rect(cx - 8, H * 0.5, 5, H * 0.5, 0x7a6a48); px.rect(cx + 4, H * 0.5, 4, H * 0.5, 0x403020);
  for (let k = 0; k < 3; k++) { const a = -Math.PI / 2 + (k - 1) * 0.7 + (r() - 0.5) * 0.3; px.line(cx, H * 0.55, cx + Math.cos(a) * 40, H * 0.55 + Math.sin(a) * 40, 0x5a4a30, 6); }
  const n = 12; for (let k = 0; k < n; k++) { const a = r() * TAU, d = r() * 0.55, x = cx + Math.cos(a) * d * W * 0.42, y = H * 0.33 + Math.sin(a) * d * H * 0.26, R = 22 + r() * 22; blob(px, x, y, R, R * 0.8, tones, r); }
  blob(px, cx, H * 0.28, W * 0.3, H * 0.2, tones, r);
  if (kind === 'flame') for (let k = 0; k < 90; k++) { const x = 10 + r() * (W - 20), y = 6 + r() * H * 0.5; if (px.on(x, y)) { px.rect(x, y, 3, 2, r() < 0.5 ? 0xe03020 : 0xf05030); } }
  px.outline(0x0c200e);
  return px;
}
function paintScooter(seed) {
  const r = mulberry(seed), W = 40, H = 24, px = pen(W, H, 3), c = r.pick([0xd02820, 0x2050c0, 0xf0f0f0, 0x202020, 0x40a060, 0xf0c020, 0x8a8a90, 0xe08040]);
  // the body shell, the seat, the handlebar, the mirror, two wheels
  px.poly([8, 10, 30, 10, 34, 14, 34, 17, 6, 17, 4, 13], c); px.poly([12, 6, 28, 6, 30, 10, 10, 10], shadeHex(c, 1.15));
  px.rect(10, 4, 18, 3, 0x202020); px.rect(26, 1, 2, 9, 0x303038); px.rect(27, 0, 4, 2, 0x303038); px.rect(32, 2, 3, 2, 0x8a8a9a);
  px.rect(6, 15, 28, 1, shadeHex(c, 0.6)); px.rect(2, 11, 4, 3, 0xd0d0d0);
  px.ellipse(9, 18, 6, 6, 0x202020); px.ellipse(31, 18, 6, 6, 0x202020); px.ellipse(9, 18, 3, 3, 0x9a9a9a); px.ellipse(31, 18, 3, 3, 0x9a9a9a); px.ellipse(9, 18, 1, 1, 0x404040); px.ellipse(31, 18, 1, 1, 0x404040);
  px.rect(35, 11, 3, 2, 0xf0e0a0);   // the headlamp
  px.outline(0x101014); return px;
}
function paintLamp(col) { const px = pen(16, 16, 3); px.ellipse(8, 8, 7, 7, shadeHex(col, 0.7)); px.ellipse(8, 8, 5.5, 5.5, col); if (col !== 0x303034) px.ellipse(6.5, 6.5, 2, 2, shadeHex(col, 1.6)); return px; }
function paintBoat(seed) { const r = mulberry(seed), W = 100, H = 54, px = pen(W, H, 2); const hull = r.pick([0xf2f2ee, 0x3060a0, 0xd04030]); px.poly([0, 30, W, 30, W - 10, 54, 10, 54], hull); px.rect(0, 30, W, 3, shadeHex(hull, 0.7)); px.rect(0, 40, W, 2, 0xd02820); px.rect(28, 12, 40, 18, 0x3a6a9a); px.rect(30, 14, 36, 8, 0x9ac0d8); for (let x = 32; x < 64; x += 8) px.rect(x, 14, 1, 8, 0x3a6a9a); px.rect(46, 0, 3, 12, 0x404048); px.rect(49, 1, 8, 5, 0xd02820); px.outline(0x101828); return px; }
function paintPerson(seed, step, down) {
  const r = mulberry(seed), W = 16, H = 28, px = pen(down ? 28 : W, down ? 16 : H, 4), skin = r.pick([0xf0c8a0, 0xe0b088, 0xc89868]), top = r.pick([0xd02820, 0x2050c0, 0xf0f0f0, 0x202020, 0xf0c020, 0x40a060, 0xf080a0, 0x8080c0]), pants = r.pick([0x202030, 0x3a4a6a, 0x6a6a70, 0xe0e0e0, 0x8a6a4a]), hair = r.pick([0x202020, 0x4a3020, 0x101010, 0x8a6a3a]), bag = r() < 0.4 ? r.pick([0xd02820, 0x202020, 0xf0c020]) : null, cap = r() < 0.3 ? r.pick([0xd02820, 0xf0f0f0]) : null, sleeves = r() < 0.5;
  if (down) {   // flat on the ground, seen from the side
    px.rect(2, 6, 7, 6, top); px.rect(9, 7, 7, 4, pants); px.rect(16, 8, 4, 3, 0x202020); px.ellipse(3, 8, 3, 3, skin); px.rect(0, 5, 4, 2, hair); px.rect(5, 12, 6, 2, skin);
    px.outline(0x101014); return px;
  }
  px.ellipse(8, 5, 4, 5, skin); px.rect(4, 1, 8, 3, hair); if (cap) px.rect(4, 0, 8, 2, cap);
  px.rect(4, 10, 8, 9, top); px.rect(2, 11, 2, 7, skin); px.rect(12, 11, 2, 7, skin); if (sleeves) { px.rect(2, 11, 2, 3, top); px.rect(12, 11, 2, 3, top); }
  if (step) { px.rect(3, 19, 3, 8, pants); px.rect(10, 19, 3, 8, pants); px.rect(3, 27, 3, 1, 0x202020); px.rect(10, 27, 3, 1, 0x202020); px.rect(2, 12, 2, 6, skin); px.rect(12, 12, 2, 6, skin); }
  else { px.rect(4, 19, 3, 8, pants); px.rect(9, 19, 3, 8, pants); px.rect(4, 27, 3, 1, 0x202020); px.rect(9, 27, 3, 1, 0x202020); }
  if (bag) px.rect(12, 15, 3, 5, bag);
  px.outline(0x101014); return px;
}
function paintDigit(d, col) { const px = pen(14, 22, 3); px.rect(0, 0, 14, 22, 0x141418); px.text(String(d), 7, 1, 19, col, { align: 'center', weight: 900, font: '"Russo One","Noto Sans TC",monospace' }); return px; }
function paintGlow(col) { if (STYLE.toon) { const px = new VPix(24, 12, 3); px.ellipse(12, 6, 11.5, 5.5, shadeHex(col, 0.75)); px.ellipse(12, 6, 8, 3.8, col); px.ellipse(11, 5, 4, 2, shadeHex(col, 1.5)); return px; } const px = new Pix(24, 12); for (let y = 0; y < 12; y++) for (let x = 0; x < 24; x++) { const dx = (x + 0.5 - 12) / 12, dy = (y + 0.5 - 6) / 6, d = dx * dx + dy * dy; if (d < 1) px.dset(x, y, col, shadeHex(col, 1.6), 1 - d); } return px; }
// a cloud: a few overlapping soft lumps, lit from above, dithered at the edges
function paintCloud(seed) {
  if (STYLE.toon) return tCloud(seed);
  const r = mulberry(seed), W = 96, H = 40, px = new Pix(W, H), lumps = [];
  for (let k = 0; k < 6; k++) lumps.push([14 + r() * (W - 28), 14 + r() * 14, 9 + r() * 11]);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { let d = 0; for (const [cx, cy, rr] of lumps) { const dx = (x - cx) / rr, dy = (y - cy) / (rr * 0.62); d = Math.max(d, 1 - (dx * dx + dy * dy)); } if (d <= 0) continue; const shade = y > 24 ? 0xd4dce8 : y > 16 ? 0xeef2f8 : 0xffffff; px.dset(x, y, shade, 0xffffff, Math.min(1, d * 2.2)); }
  return px;
}
// the job markers: a sign on a pole for a fare, an order, a trial; a floating diamond for where to go
function paintMarker(kind) {
  const px = pen(40, 64, 3);
  if (kind === 'goal' || kind === 'cp') { const c = kind === 'goal' ? 0x30e0ff : 0xffa030; px.poly([20, 2, 38, 26, 20, 50, 2, 26], c); px.poly([20, 10, 31, 26, 20, 42, 9, 26], shadeHex(c, 1.5)); px.poly([20, 18, 25, 26, 20, 34, 15, 26], 0xffffff); px.outline(0x102030); return px; }
  px.rect(18, 30, 4, 34, 0x8a8a90); px.rect(14, 62, 12, 2, 0x606068);
  if (kind === 'taxi') { px.rect(2, 2, 36, 30, 0xf2c21a); px.rect(2, 2, 36, 2, 0xffe060); px.rect(6, 12, 28, 12, 0x202020); px.rect(10, 8, 20, 6, 0x202020); px.ellipse(11, 25, 4, 4, 0x202020); px.ellipse(29, 25, 4, 4, 0x202020); px.text('TAXI', 20, 3, 8, 0x202020, { align: 'center' }); }
  else if (kind === 'box') { px.rect(2, 2, 36, 30, 0xd02820); px.rect(8, 10, 24, 18, 0xc89060); px.rect(8, 10, 24, 4, 0xe0a870); px.rect(18, 10, 4, 18, 0xa07040); px.text('外送', 20, 1, 9, 0xffffff, { align: 'center' }); }
  else { px.rect(2, 2, 36, 30, 0xffffff); for (let y = 2; y < 32; y += 6) for (let x = 2; x < 38; x += 6) if (((x + y) / 6) % 2 < 1) px.rect(x, y, 6, 6, 0x202020); px.rect(2, 24, 36, 8, 0x2050c0); px.text('TIME', 20, 23, 8, 0xffffff, { align: 'center' }); }
  px.outline(0x101014); return px;
}
function paintProps() {
  propKind('mk_taxi', paintMarker('taxi'), 3.2); propKind('mk_box', paintMarker('box'), 3.2); propKind('mk_flag', paintMarker('flag'), 3.2); propKind('mk_goal', paintMarker('goal'), 2.4); propKind('mk_cp', paintMarker('cp'), 2.0);
  for (let d = 0; d < 10; d++) { propKind('dr' + d, paintDigit(d, 0xff3a3a), 0.44); propKind('dg' + d, paintDigit(d, 0x40f070), 0.44); }
  propKind('glow_red', paintGlow(0xff2020), 0.3); propKind('glow_head', paintGlow(0xfff0c0), 0.22); propKind('glow_lamp', paintGlow(0xffd890), 1.6);
  for (let i = 0; i < 4; i++) propKind('cloud' + i, paintCloud(900 + i * 17), 48, { shadow: 0 });
  for (let i = 0; i < 3; i++) propKind('tree' + i, paintTree(300 + i * 7, i === 2 ? 'flame' : 'banyan'), 9 + i, { r: 0.8, solid: true });
  for (let i = 0; i < 2; i++) propKind('palm' + i, paintTree(400 + i * 7, 'palm'), 10 + i * 2, { r: 0.5, solid: true });
  propKind('tall', paintTree(410, 'tall'), 14, { r: 0.6, solid: true });
  for (let i = 0; i < 4; i++) propKind('scooter' + i, paintScooter(500 + i * 3), 1.15);
  propKind('lamp_off', paintLamp(0x303034), 0.34); propKind('lamp_red', paintLamp(0xff3030), 0.34); propKind('lamp_yellow', paintLamp(0xffc020), 0.34); propKind('lamp_green', paintLamp(0x30e060), 0.34);
  for (let i = 0; i < 3; i++) propKind('boat' + i, paintBoat(1 + i), 5); if (STYLE.toon) TPEOPLE.forEach((sp, i) => { const h = sp.kid ? 1.7 : 1.7; propKind('person' + i, tPerson(sp, null), h); for (let f = 0; f < 4; f++) propKind('person' + i + 'w' + f, tPerson(sp, 0.25 + f * 0.25), h); propKind('person' + i + 'w', tPerson(sp, 0.25), h); propKind('person' + i + 'd', tPersonDown(sp), 1.17); });
  else for (let i = 0; i < 8; i++) { propKind('person' + i, paintPerson(600 + i * 5, false), 1.7); propKind('person' + i + 'w', paintPerson(600 + i * 5, true), 1.7); propKind('person' + i + 'd', paintPerson(600 + i * 5, false, true), 0.95); }
}
// ---------- placing ----------
function addProp(name, x, z, o) {
  const K = PROPS.kinds[name]; if (!K) return null;
  const p = Object.assign({ k: name, x, z, y: terrainH(x, z), flip: false, s: 1, i: PROPS.list.length }, o || {});
  if ((p.solid == null ? K.solid : p.solid) && K.r) addSolid({ x, z, r: K.r * p.s, h: K.hM * p.s * 0.18 });
  PROPS.list.push(p);
  return p;
}
