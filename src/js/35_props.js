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
function paintTree(seed, kind) {
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
  const r = mulberry(seed), W = 40, H = 24, px = new Pix(W, H), c = r.pick([0xd02820, 0x2050c0, 0xf0f0f0, 0x202020, 0x40a060, 0xf0c020, 0x8a8a90, 0xe08040]);
  // the body shell, the seat, the handlebar, the mirror, two wheels
  px.poly([8, 10, 30, 10, 34, 14, 34, 17, 6, 17, 4, 13], c); px.poly([12, 6, 28, 6, 30, 10, 10, 10], shadeHex(c, 1.15));
  px.rect(10, 4, 18, 3, 0x202020); px.rect(26, 1, 2, 9, 0x303038); px.rect(27, 0, 4, 2, 0x303038); px.rect(32, 2, 3, 2, 0x8a8a9a);
  px.rect(6, 15, 28, 1, shadeHex(c, 0.6)); px.rect(2, 11, 4, 3, 0xd0d0d0);
  px.ellipse(9, 18, 6, 6, 0x202020); px.ellipse(31, 18, 6, 6, 0x202020); px.ellipse(9, 18, 3, 3, 0x9a9a9a); px.ellipse(31, 18, 3, 3, 0x9a9a9a); px.ellipse(9, 18, 1, 1, 0x404040); px.ellipse(31, 18, 1, 1, 0x404040);
  px.rect(35, 11, 3, 2, 0xf0e0a0);   // the headlamp
  px.outline(0x101014); return px;
}
function paintLamp(col) { const px = new Pix(16, 16); px.ellipse(8, 8, 7, 7, shadeHex(col, 0.7)); px.ellipse(8, 8, 5.5, 5.5, col); if (col !== 0x303034) px.ellipse(6.5, 6.5, 2, 2, shadeHex(col, 1.6)); return px; }
function paintBoat(seed) { const r = mulberry(seed), W = 100, H = 54, px = new Pix(W, H); const hull = r.pick([0xf2f2ee, 0x3060a0, 0xd04030]); px.poly([0, 30, W, 30, W - 10, 54, 10, 54], hull); px.rect(0, 30, W, 3, shadeHex(hull, 0.7)); px.rect(0, 40, W, 2, 0xd02820); px.rect(28, 12, 40, 18, 0x3a6a9a); px.rect(30, 14, 36, 8, 0x9ac0d8); for (let x = 32; x < 64; x += 8) px.rect(x, 14, 1, 8, 0x3a6a9a); px.rect(46, 0, 3, 12, 0x404048); px.rect(49, 1, 8, 5, 0xd02820); px.outline(0x101828); return px; }
function paintPerson(seed, step, down) {
  const r = mulberry(seed), W = 16, H = 28, px = new Pix(down ? 28 : W, down ? 16 : H), skin = r.pick([0xf0c8a0, 0xe0b088, 0xc89868]), top = r.pick([0xd02820, 0x2050c0, 0xf0f0f0, 0x202020, 0xf0c020, 0x40a060, 0xf080a0, 0x8080c0]), pants = r.pick([0x202030, 0x3a4a6a, 0x6a6a70, 0xe0e0e0, 0x8a6a4a]), hair = r.pick([0x202020, 0x4a3020, 0x101010, 0x8a6a3a]), bag = r() < 0.4 ? r.pick([0xd02820, 0x202020, 0xf0c020]) : null, cap = r() < 0.3 ? r.pick([0xd02820, 0xf0f0f0]) : null, sleeves = r() < 0.5;
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
function paintDigit(d, col) { const px = new Pix(14, 22); px.rect(0, 0, 14, 22, 0x141418); px.text(String(d), 7, 1, 19, col, { align: 'center', weight: 900, font: '"Russo One","Noto Sans TC",monospace' }); return px; }
function paintGlow(col) { const px = new Pix(24, 12); for (let y = 0; y < 12; y++) for (let x = 0; x < 24; x++) { const dx = (x + 0.5 - 12) / 12, dy = (y + 0.5 - 6) / 6, d = dx * dx + dy * dy; if (d < 1) px.dset(x, y, col, shadeHex(col, 1.6), 1 - d); } return px; }
// a cloud: a few overlapping soft lumps, lit from above, dithered at the edges
function paintCloud(seed) {
  const r = mulberry(seed), W = 96, H = 40, px = new Pix(W, H), lumps = [];
  for (let k = 0; k < 6; k++) lumps.push([14 + r() * (W - 28), 14 + r() * 14, 9 + r() * 11]);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { let d = 0; for (const [cx, cy, rr] of lumps) { const dx = (x - cx) / rr, dy = (y - cy) / (rr * 0.62); d = Math.max(d, 1 - (dx * dx + dy * dy)); } if (d <= 0) continue; const shade = y > 24 ? 0xd4dce8 : y > 16 ? 0xeef2f8 : 0xffffff; px.dset(x, y, shade, 0xffffff, Math.min(1, d * 2.2)); }
  return px;
}
// the job markers: a sign on a pole for a fare, an order, a trial; a floating diamond for where to go
function paintMarker(kind) {
  const px = new Pix(40, 64);
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
  for (let i = 0; i < 3; i++) propKind('boat' + i, paintBoat(1 + i), 5); for (let i = 0; i < 8; i++) { propKind('person' + i, paintPerson(600 + i * 5, false), 1.7); propKind('person' + i + 'w', paintPerson(600 + i * 5, true), 1.7); propKind('person' + i + 'd', paintPerson(600 + i * 5, false, true), 0.95); }
}
// ---------- placing ----------
function addProp(name, x, z, o) {
  const K = PROPS.kinds[name]; if (!K) return null;
  const p = Object.assign({ k: name, x, z, y: terrainH(x, z), flip: false, s: 1, i: PROPS.list.length }, o || {});
  if ((p.solid == null ? K.solid : p.solid) && K.r) addSolid({ x, z, r: K.r * p.s, h: K.hM * p.s * 0.18 });
  PROPS.list.push(p);
  return p;
}
