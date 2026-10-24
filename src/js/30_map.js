// ===================== the map of 高雄: a hand-laid road network on a 2.4 km square, drawn into the ground =====================
// World units are metres, y up. The square runs x 0..W (west→east), z 0..W (north→south). The harbour and the sea lie to
// the west and south-west, 柴山 rises in the north-west, the grid of the old city fills the middle, 愛河 cuts down
// through it to the harbour. Roads are polylines with a width and a kind; the ground is one big pixel picture.
const MAP = { W: 2400, px: 0.6, roads: [], water: [], sand: [], parks: [], props: [], ground: null, kind: null, kindW: 0, name: '高雄・港都' };
const RK = { boulevard: { w: 22, lanes: 6, kerb: true }, street: { w: 12, lanes: 2, kerb: true }, lane: { w: 7, lanes: 2, kerb: false }, highway: { w: 20, lanes: 4, kerb: false, barrier: true }, hill: { w: 8, lanes: 2, kerb: false }, quay: { w: 14, lanes: 2, kerb: false } };
// ground kinds, one byte per metre, for the tyres: what the car is rolling on
const GK = { asphalt: 0, grass: 1, sand: 2, water: 3, gravel: 4, concrete: 5, kerb: 6 };
const GK_MU = [1.0, 0.55, 0.5, 0.2, 0.7, 0.95, 0.9], GK_DRAG = [0, 0.09, 0.14, 0.6, 0.05, 0.0, 0.02];
function road(kind, pts, o) { MAP.roads.push(Object.assign({ kind, pts, w: RK[kind].w }, o || {})); }
function buildMap() {
  const W = MAP.W, r = mulberry(7);
  // ---- water: the harbour down the west side and the sea along the south; 愛河 ----
  MAP.water.push([[0, 0], [430, 0], [470, 600], [520, 1100], [480, 1700], [560, 2400], [0, 2400]]);
  MAP.water.push([[560, 2400], [2400, 2400], [2400, 2260], [1700, 2250], [1200, 2200], [900, 2300]]);
  // 旗津: the sand bar across the mouth of the harbour
  MAP.sand.push([[120, 1500], [330, 1540], [360, 2400], [60, 2400]]);
  MAP.parks.push([[1250, 150], [1650, 150], [1650, 520], [1250, 520]]);   // 蓮池潭 parkland (the lake is water)
  MAP.water.push([[1330, 220], [1600, 230], [1580, 460], [1320, 440]]);
  // 愛河 from the north down to the harbour
  const river = []; for (let z = 0; z <= 2300; z += 100) river.push([1000 + Math.sin(z / 380) * 70 + z * 0.02, z]);
  MAP.river = river;
  // ---- the grid of the old city: boulevards every 480 m, streets every 160 ----
  for (let x = 640; x <= 2240; x += 480) road('boulevard', [[x, 80], [x, 2200]], { name: x === 1120 ? '中山路' : x === 1600 ? '中華路' : x === 2080 ? '民族路' : '大順路' });
  for (let z = 400; z <= 2000; z += 480) road('boulevard', [[480, z], [2360, z]], { name: z === 880 ? '五福路' : z === 1360 ? '新田路' : z === 1840 ? '新光路' : '博愛路' });
  for (let x = 800; x <= 2240; x += 160) if ((x - 640) % 480) road('street', [[x, 160], [x, 2160]]);
  for (let z = 240; z <= 2160; z += 160) if ((z - 400) % 480) road('street', [[520, z], [2360, z]]);
  // ---- the harbour quay along the water, the 85 tower's waterfront boulevard ----
  road('quay', [[500, 700], [560, 1100], [520, 1700], [600, 2150]], { name: '海邊路' });
  road('boulevard', [[560, 2150], [1150, 2120], [1700, 2140], [2360, 2160]], { name: '成功路' });
  // ---- 柴山: the hill road winding up into the north-west ----
  const hill = []; for (let i = 0; i <= 14; i++) { const t = i / 14; hill.push([560 + Math.sin(t * 9) * 90 + t * 60, 700 - t * 620]); }
  road('hill', hill, { name: '柴山路' });
  // ---- the highway: elevated along the east, with two ramps down ----
  road('highway', [[2330, 0], [2330, 2400]], { name: '國道一號', elev: 7 });
  road('lane', [[2300, 560], [2240, 640], [2160, 700]], { ramp: true }); road('lane', [[2300, 1480], [2240, 1560], [2160, 1620]], { ramp: true });
  // ---- 旗津 road down the sand bar ----
  road('lane', [[200, 1560], [230, 2000], [220, 2380]], { name: '旗津路' });
  // ---- the ground picture and the kind map ----
  paintGround();
}
// polygon fill helper on a canvas
function polyPath(g, poly, k) { g.beginPath(); poly.forEach(([x, z], i) => (i ? g.lineTo(x * k, z * k) : g.moveTo(x * k, z * k))); g.closePath(); }
function paintGround() {
  const W = MAP.W, px = MAP.px, N = Math.round(W / px), g = canvas(N, N).getContext('2d'), k = 1 / px;
  // the kinds, at one byte per metre
  const KW = W, kind = new Uint8Array(KW * KW); MAP.kind = kind; MAP.kindW = KW;
  const kg = canvas(KW, KW).getContext('2d');
  const fillK = (code, draw) => { kg.fillStyle = '#' + (code * 16).toString(16).padStart(2, '0').repeat(3); draw(kg, 1); };
  // soil and grass with a little noise
  g.fillStyle = '#6a9a3e'; g.fillRect(0, 0, N, N);
  const im = g.getImageData(0, 0, N, N), d = im.data;
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const n = vnoise2(x * 0.02, y * 0.02) * 0.6 + vnoise2(x * 0.11, y * 0.11) * 0.4, i = (y * N + x) * 4; const c = mixHex(0x5e8c38, 0x86b84a, n); d[i] = c >> 16; d[i + 1] = (c >> 8) & 255; d[i + 2] = c & 255; }
  g.putImageData(im, 0, 0);
  fillK(GK.grass, (c) => c.fillRect(0, 0, KW, KW));
  // the city's blocks: paved courtyards and lanes between the houses are concrete-grey
  g.fillStyle = '#9a9690'; g.fillRect(520 * k, 160 * k, (2360 - 520) * k, (2160 - 160) * k);
  fillK(GK.concrete, (c) => c.fillRect(520, 160, 2360 - 520, 2160 - 160));
  for (const p of MAP.parks) { g.fillStyle = '#5e9a40'; polyPath(g, p, k); g.fill(); fillK(GK.grass, (c) => { polyPath(c, p, 1); c.fill(); }); }
  for (const p of MAP.sand) { g.fillStyle = '#e2d2a0'; polyPath(g, p, k); g.fill(); fillK(GK.sand, (c) => { polyPath(c, p, 1); c.fill(); }); }
  // the river: a band along its centreline
  g.strokeStyle = '#2f7fb0'; g.lineWidth = 46 * k; g.lineCap = 'round'; g.beginPath(); MAP.river.forEach(([x, z], i) => (i ? g.lineTo(x * k, z * k) : g.moveTo(x * k, z * k))); g.stroke();
  fillK(GK.water, (c) => { c.strokeStyle = c.fillStyle; c.lineWidth = 46; c.beginPath(); MAP.river.forEach(([x, z], i) => (i ? c.lineTo(x, z) : c.moveTo(x, z))); c.stroke(); });
  for (const p of MAP.water) { g.fillStyle = '#2a74a8'; polyPath(g, p, k); g.fill(); fillK(GK.water, (c) => { polyPath(c, p, 1); c.fill(); }); }
  // roads: kerb band, then asphalt, then the lane lines; bridges where they cross the river
  const strokeRoad = (c, rd, w, kk) => { c.lineWidth = w * kk; c.lineCap = 'butt'; c.lineJoin = 'round'; c.beginPath(); rd.pts.forEach(([x, z], i) => (i ? c.lineTo(x * kk, z * kk) : c.moveTo(x * kk, z * kk))); c.stroke(); };
  for (const rd of MAP.roads) if (RK[rd.kind].kerb) { g.strokeStyle = '#d8d4cc'; strokeRoad(g, rd, rd.w + 3.6, k); }
  for (const rd of MAP.roads) { g.strokeStyle = rd.kind === 'highway' ? '#4a4a52' : '#55555c'; strokeRoad(g, rd, rd.w, k); }
  fillK(GK.asphalt, (c) => { for (const rd of MAP.roads) { c.strokeStyle = c.fillStyle; strokeRoad(c, rd, rd.w, 1); } });
  // lane lines
  for (const rd of MAP.roads) {
    const K = RK[rd.kind], lanes = K.lanes; if (lanes < 2) continue;
    g.setLineDash([4 * k, 6 * k]); g.lineWidth = Math.max(1, 0.25 * k);
    for (let l = 1; l < lanes; l++) {
      const off = (l / lanes - 0.5) * rd.w, centre = l * 2 === lanes;
      g.strokeStyle = centre ? '#f2d24a' : '#f0f0f0'; g.setLineDash(centre ? [] : [4 * k, 6 * k]);
      g.beginPath();
      for (let i = 0; i < rd.pts.length; i++) {
        const [x, z] = rd.pts[i], q = rd.pts[Math.min(rd.pts.length - 1, i + 1)], p = rd.pts[Math.max(0, i - 1)], dx = q[0] - p[0], dz = q[1] - p[1], L = Math.hypot(dx, dz) || 1, nx = -dz / L, nz = dx / L;
        const X = (x + nx * off) * k, Z = (z + nz * off) * k; i ? g.lineTo(X, Z) : g.moveTo(X, Z);
      }
      g.stroke();
    }
    g.setLineDash([]);
  }
  // zebra crossings at the boulevard corners
  g.fillStyle = '#f0f0f0';
  for (let x = 640; x <= 2240; x += 480) for (let z = 400; z <= 2000; z += 480) for (let s = -1; s <= 1; s += 2) { for (let i = 0; i < 9; i++) { g.fillRect((x - 10 + i * 2.4) * k, (z + s * 14 - 1.5) * k, 1.2 * k, 3 * k); g.fillRect((x + s * 14 - 1.5) * k, (z - 10 + i * 2.4) * k, 3 * k, 1.2 * k); } }
  // read the kinds back
  const kd = kg.getImageData(0, 0, KW, KW).data; for (let i = 0; i < KW * KW; i++) kind[i] = Math.round(kd[i * 4] / 16);
  MAP.ground = g.canvas;
}
function groundKind(x, z) { const W = MAP.kindW, i = Math.floor(z), j = Math.floor(x); if (i < 0 || j < 0 || i >= W || j >= W) return GK.grass; return MAP.kind[i * W + j]; }
// the terrain height: 柴山 in the north-west, a gentle fall to the water, flat city; the highway is a separate deck
function terrainH(x, z) {
  const dx = (x - 560) / 420, dz = (z - 180) / 380, hill = Math.max(0, 1 - Math.sqrt(dx * dx + dz * dz));
  return hill * hill * 95 + vnoise2(x * 0.004, z * 0.004) * 2.5 * hill;
}
// the nearest point on the road network to a point, with the road's heading there: for spawning, the minimap, traffic later
function nearestRoad(x, z) {
  let best = null;
  for (const rd of MAP.roads) for (let i = 0; i + 1 < rd.pts.length; i++) {
    const [ax, az] = rd.pts[i], [bx, bz] = rd.pts[i + 1], dx = bx - ax, dz = bz - az, L2 = dx * dx + dz * dz || 1, t = clamp(((x - ax) * dx + (z - az) * dz) / L2, 0, 1);
    const px = ax + dx * t, pz = az + dz * t, d = Math.hypot(x - px, z - pz);
    if (!best || d < best.d) best = { d, x: px, z: pz, yaw: Math.atan2(dx, dz), rd };
  }
  return best;
}
