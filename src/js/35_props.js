// ===================== what stands on the map: buildings, trees, lamps, the harbour's cranes — painted pixels, placed along the roads =====================
// Every prop is a picture stood upright (a billboard that turns to face the camera about the vertical) with a footprint
// on the ground the car cannot pass through. Pictures are painted once into a few atlases; props only hold an index.
const PROPS = { kinds: {}, list: [], grid: new Map(), cell: 40, atlas: [] };
function propKind(name, px, hM, o) { PROPS.kinds[name] = Object.assign({ name, px, hM, wM: (hM * px.w) / px.h, solid: true, fx: 0, fz: 0 }, o || {}); }
// ---------- painters ----------
const PAL_WALL = [0xe8e0d0, 0xd8cfc0, 0xc8c8c8, 0xe0d6c8, 0xf0e8d8, 0xd0d8dc, 0xc9b9a0];
function paintTownhouse(seed, floors) {
  const r = mulberry(seed), W = 36, H = 22 + floors * 16, px = new Pix(W, H), wall = r.pick(PAL_WALL);
  px.rect(0, 0, W, H, wall);
  for (let f = 0; f < floors; f++) { const y = 8 + f * 16; for (let x = 4; x < W - 6; x += 10) { px.rect(x, y, 7, 9, 0x3a5a7a); px.rect(x + 1, y + 1, 5, 3, 0x9ac0e0); if (r() < 0.35) px.rect(x - 1, y + 9, 9, 2, 0x8a8a90); } if (r() < 0.5) px.rect(0, y + 13, W, 2, shadeHex(wall, 0.8)); }
  // the shop at the bottom with its sign, and a rooftop water tank
  px.rect(0, H - 14, W, 14, 0x404048); px.rect(3, H - 11, W - 6, 8, r.pick([0xd82a2a, 0x2a5ad0, 0xf2c21a, 0x18884a])); px.rect(2, H - 20, W - 4, 5, r.pick([0xff5a3a, 0xffd23a, 0x3ad0ff, 0xffffff]));
  px.rect(W - 10, 0, 6, 6, 0x9aa0a8); px.rect(W - 9, -2, 4, 2, 0x9aa0a8);
  px.outline(0x1a1820);
  return px;
}
function paintBlock(seed, floors) {
  const r = mulberry(seed), W = 64, H = 10 + floors * 14, px = new Pix(W, H), wall = r.pick([0xdcd6cc, 0xc8ccd0, 0xe8e2d4, 0xb8c4cc]);
  px.rect(0, 0, W, H, wall);
  for (let f = 0; f < floors; f++) { const y = 6 + f * 14; for (let x = 4; x < W - 6; x += 9) { px.rect(x, y, 6, 8, 0x2e4a66); px.rect(x + 1, y + 1, 4, 3, 0x8ab4d8); if (r() < 0.3) { px.rect(x - 1, y + 8, 8, 3, 0x7a8088); px.rect(x, y + 6, 6, 2, 0x4a5058); } } px.rect(0, y + 11, W, 1, shadeHex(wall, 0.82)); }
  px.rect(0, H - 8, W, 8, 0x3a3a44); for (let x = 3; x < W; x += 12) px.rect(x, H - 6, 8, 5, 0x8ab0c8);
  px.outline(0x1a1820);
  return px;
}
function paintTower(seed) {
  const r = mulberry(seed), W = 50, H = 200, px = new Pix(W, H), g = [0x1c4050, 0x2a6478, 0x3c8aa0, 0x6abccc];
  const blk = (x0, w, y0, y1) => { for (let y = y0; y < y1; y++) for (let x = x0; x < x0 + w; x++) { const e = x === x0 || x === x0 + w - 1; let c = e ? g[0] : x < x0 + w * 0.3 ? g[3] : x < x0 + w * 0.6 ? g[2] : g[1]; if (!e && y % 3 === 0) c = shadeHex(c, 0.8); px.set(x, y, c); } };
  blk(2, 16, 110, H); blk(32, 16, 110, H); blk(2, 46, 96, 110); blk(5, 40, 70, 96); blk(9, 32, 46, 70); blk(14, 22, 26, 46); blk(19, 12, 12, 26); for (let y = 0; y < 12; y++) px.set(25, y, 0xd8dce0); px.set(25, 0, 0xff3a3a);
  px.outline(0x0a1418);
  return px;
}
function paintTemple(seed) {
  const r = mulberry(seed), W = 70, H = 54, px = new Pix(W, H);
  px.rect(6, 22, 58, 32, 0xc8301e); px.rect(10, 30, 50, 24, 0xe0b060); for (let x = 12; x < 58; x += 10) px.rect(x, 32, 6, 20, 0x9a2a1a);
  px.poly([0, 22, 70, 22, 60, 10, 10, 10], 0x2a6a4a); px.poly([8, 10, 62, 10, 54, 2, 16, 2], 0x2a6a4a); px.rect(30, 0, 10, 3, 0xf2c21a);
  for (let x = 2; x < 70; x += 8) px.rect(x, 20, 3, 3, 0xf2c21a); px.rect(26, 36, 18, 18, 0x3a1a10);
  px.outline(0x1a1410);
  return px;
}
function paintTree(seed, kind) {
  const r = mulberry(seed);
  if (kind === 'palm') { const W = 30, H = 60, px = new Pix(W, H); px.rect(13, 20, 4, 40, 0x8a6a3a); for (let k = 0; k < 7; k++) { const a = (k / 7) * TAU; px.line(15, 20, 15 + Math.cos(a) * 13, 20 + Math.sin(a) * 9 - 4, 0x2a8a3a, 3); } px.ellipse(15, 18, 5, 4, 0x4ab04a); px.outline(0x102010); return px; }
  const W = 44, H = 50, px = new Pix(W, H), g = [0x1e5a2a, 0x2f7e30, 0x52a83c, 0x7acc4c];
  px.rect(19, 30, 6, 20, 0x5a4a30);
  for (let k = 0; k < 9; k++) { const x = 8 + r() * 28, y = 8 + r() * 18, R = 7 + r() * 7; for (let i = 0; i < 4; i++) px.ellipse(x - i, y - i * 1.2, R - i * 1.5, (R - i * 1.5) * 0.8, g[i]); }
  px.outline(0x102010);
  return px;
}
function paintLamp() { const px = new Pix(10, 40); px.rect(4, 4, 2, 36, 0x9aa0a8); px.rect(4, 2, 6, 3, 0x9aa0a8); px.rect(8, 4, 2, 2, 0xfff0a0); return px; }
function paintContainer(seed) { const r = mulberry(seed), px = new Pix(60, 28), c = r.pick([0xd8402a, 0x2a5ad0, 0x18884a, 0xf2a21a, 0x8a3a9a]); px.rect(0, 0, 60, 28, c); for (let x = 0; x < 60; x += 4) px.rect(x, 0, 1, 28, shadeHex(c, 0.75)); px.rect(0, 12, 60, 2, shadeHex(c, 1.2)); px.outline(0x101018); return px; }
function paintCrane() { const px = new Pix(70, 120); px.rect(10, 20, 6, 100, 0xd82a2a); px.rect(54, 20, 6, 100, 0xd82a2a); px.rect(4, 16, 62, 6, 0xd82a2a); px.rect(0, 10, 70, 5, 0xd82a2a); px.rect(30, 22, 10, 30, 0x404048); px.outline(0x200808); return px; }
function paintBoat(seed) { const r = mulberry(seed), px = new Pix(40, 22); px.poly([0, 12, 40, 12, 36, 22, 4, 22], 0xf2f2ee); px.rect(10, 4, 16, 8, 0x3a6a9a); px.rect(18, 0, 2, 5, 0x404048); px.outline(0x101828); return px; }
function paintStation() { const px = new Pix(120, 60); px.ellipse(60, 40, 58, 36, 0xd8dce4); px.ellipse(60, 40, 50, 30, 0x5a9ad0); for (let k = 0; k < 10; k++) px.line(60, 60, 8 + k * 11, 10, 0xffffff, 1); px.rect(0, 50, 120, 10, 0x8a9098); px.outline(0x182028); return px; }
function paintProps() {
  for (let i = 0; i < 6; i++) propKind('townhouse' + i, paintTownhouse(100 + i * 7, 3 + (i % 3)), 10 + (i % 3) * 3.2, { fx: 8, fz: 10 });
  for (let i = 0; i < 4; i++) propKind('block' + i, paintBlock(200 + i * 7, 6 + i * 2), 20 + i * 6, { fx: 18, fz: 14 });
  propKind('tower85', paintTower(1), 160, { fx: 26, fz: 26 }); propKind('temple', paintTemple(3), 14, { fx: 20, fz: 14 });
  for (let i = 0; i < 3; i++) propKind('banyan' + i, paintTree(300 + i * 7, 'banyan'), 9 + i, { r: 0.9 });
  for (let i = 0; i < 2; i++) propKind('palm' + i, paintTree(400 + i * 7, 'palm'), 11 + i * 2, { r: 0.5 });
  propKind('lamp', paintLamp(), 8, { r: 0.25 }); for (let i = 0; i < 4; i++) propKind('box' + i, paintContainer(500 + i * 7), 5.2, { fx: 12, fz: 5 });
  propKind('crane', paintCrane(), 40, { fx: 10, fz: 10 }); propKind('boat', paintBoat(1), 4, { solid: false }); propKind('station', paintStation(), 14, { fx: 30, fz: 14 });
}
// ---------- placing ----------
function addProp(name, x, z, o) {
  const K = PROPS.kinds[name]; if (!K) return;
  const p = Object.assign({ k: name, x, z, y: terrainH(x, z), flip: false, s: 1 }, o || {});
  if (p.solid == null ? K.solid : p.solid) { if (K.r) p.r = K.r * p.s; else { p.x0 = x - K.fx / 2 * p.s; p.x1 = x + K.fx / 2 * p.s; p.z0 = z - K.fz / 2 * p.s; p.z1 = z + K.fz / 2 * p.s; } }
  PROPS.list.push(p);
  const c = PROPS.cell, i0 = Math.floor((x - 20) / c), i1 = Math.floor((x + 20) / c), j0 = Math.floor((z - 20) / c), j1 = Math.floor((z + 20) / c);
  for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) { const key = i + ',' + j; let a = PROPS.grid.get(key); if (!a) PROPS.grid.set(key, (a = [])); a.push(p); }
  return p;
}
const _pn = [];
function propsNear(x, z, R) { _pn.length = 0; const c = PROPS.cell; for (let i = Math.floor((x - R) / c); i <= Math.floor((x + R) / c); i++) for (let j = Math.floor((z - R) / c); j <= Math.floor((z + R) / c); j++) { const a = PROPS.grid.get(i + ',' + j); if (a) for (const p of a) if (p.r != null || p.x0 != null) if (!_pn.includes(p)) _pn.push(p); } return _pn; }
// is this spot clear of road (with a margin), and on land?
function clearForBuilding(x, z, margin) { const n = nearestRoad(x, z); if (n && n.d < n.rd.w / 2 + margin) return false; const k = groundKind(x, z); return k !== GK.water; }
function placeProps() {
  const r = mulberry(11);
  // the city blocks: houses along every street, taller blocks along the boulevards, the odd temple
  for (const rd of MAP.roads) {
    const K = RK[rd.kind]; if (rd.kind === 'highway' || rd.kind === 'hill' || rd.kind === 'quay' || rd.ramp) continue;
    for (let i = 0; i + 1 < rd.pts.length; i++) {
      const [ax, az] = rd.pts[i], [bx, bz] = rd.pts[i + 1], dx = bx - ax, dz = bz - az, L = Math.hypot(dx, dz), ux = dx / L, uz = dz / L, nx = -uz, nz = ux;
      for (let s = 14; s < L - 14; s += (rd.kind === 'boulevard' ? 22 : 12)) {
        for (const side of [-1, 1]) {
          const off = rd.w / 2 + (rd.kind === 'boulevard' ? 12 : 6), x = ax + ux * s + nx * off * side, z = az + uz * s + nz * off * side;
          if (!clearForBuilding(x, z, 3) || x < 540 || x > 2340 || z < 180 || z > 2180) continue;
          if (rd.kind === 'boulevard') { if (r() < 0.04) addProp('temple', x, z); else if (r() < 0.45) addProp('block' + r.int(0, 3), x, z); else addProp('townhouse' + r.int(0, 5), x, z); }
          else if (r() < 0.9) addProp('townhouse' + r.int(0, 5), x, z);
        }
        if (rd.kind === 'boulevard' && (s / 22) % 2 === 0) for (const side of [-1, 1]) { const x = ax + ux * s + nx * (rd.w / 2 + 1.2) * side, z = az + uz * s + nz * (rd.w / 2 + 1.2) * side; addProp('lamp', x, z); if (r() < 0.5) addProp('palm' + r.int(0, 1), x + nx * 2 * side, z + nz * 2 * side); }
      }
    }
  }
  // the landmarks
  addProp('tower85', 640, 2060); addProp('station', 1150, 1332, { solid: false });
  // 柴山's trees, the park's trees, the sand bar's palms
  for (let i = 0; i < 700; i++) { const x = 60 + r() * 900, z = 20 + r() * 900; if (terrainH(x, z) > 6 && clearForBuilding(x, z, 5)) addProp('banyan' + r.int(0, 2), x, z, { s: 0.8 + r() * 0.6 }); }
  for (let i = 0; i < 90; i++) { const x = 1260 + r() * 380, z = 160 + r() * 350; if (clearForBuilding(x, z, 4)) addProp('banyan' + r.int(0, 2), x, z); }
  for (let i = 0; i < 80; i++) { const x = 70 + r() * 270, z = 1520 + r() * 860; if (groundKind(x, z) === GK.sand && clearForBuilding(x, z, 4)) addProp('palm' + r.int(0, 1), x, z); }
  // the harbour: containers in rows and cranes along the quay
  for (let z = 760; z < 1700; z += 60) for (let k = 0; k < 4; k++) addProp('box' + r.int(0, 3), 590 + k * 14, z + r() * 20);
  for (let z = 800; z < 1700; z += 220) addProp('crane', 545, z);
  for (let i = 0; i < 20; i++) addProp('boat', 200 + r() * 250, 300 + r() * 1100, { solid: false });
}
