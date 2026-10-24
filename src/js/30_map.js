// ===================== the map of 高雄: the real city compressed onto a 3.6 km square =====================
// World units are metres, y up; x runs west→east, z north→south. The layout is the real one at 0.55 scale, surveyed
// from 美麗島站 (the origin of the "real" coordinates below): the harbour and 旗津 lie to the south-west, 柴山 in
// the north-west, 愛河 runs down through the west of the grid into the harbour, the 85 tower and the new bay stand
// south, 國道一號 runs up the east edge. Roads are polylines; they are cut into a graph of nodes and edges, and the
// blocks between them (the faces of that graph) are where the houses go.
const MAP = { W: 3600, px: 1.5, roads: [], water: [], sand: [], parks: [], ground: null, kind: null, kindW: 0, name: '高雄・港都', nodes: [], edges: [], faces: [], river: null, shore: null, qijin: null, lake: null, elev: [], lots: [], landmarks: {}, trenches: [] };
const RS = 0.55, RX = 1900, RZ = 1100;
const HILL = { x: 400, z: 470, rx: 560, rz: 780 };   // 柴山, an ellipse
const rx = (x) => RX + RS * x, rz = (z) => RZ + RS * z, R2 = (p) => [rx(p[0]), rz(p[1])];
// road kinds: width, lanes, the pavement beside them, and the class (0 = a lane with no lights, up to 4 = the motorway)
const RK = {
  boulevard: { w: 22, lanes: 6, sw: 5, median: 1.8, cls: 3, tile: 'rd_blvd' },
  avenue: { w: 16, lanes: 4, sw: 4, cls: 2, tile: 'rd_ave' },
  street: { w: 11, lanes: 2, sw: 3.5, cls: 1, tile: 'rd_street' },
  lane: { w: 7, lanes: 2, sw: 2, cls: 0, tile: 'rd_lane' },
  highway: { w: 20, lanes: 4, sw: 0, cls: 4, tile: 'rd_hwy', nohouse: true },
  ramp: { w: 8, lanes: 1, sw: 0, cls: 0, tile: 'rd_quay', nohouse: true },
  quay: { w: 10, lanes: 2, sw: 3, cls: 0, tile: 'rd_quay', nohouse: true },
  hill: { w: 8, lanes: 2, sw: 0, cls: 0, tile: 'rd_quay', nohouse: true },
  rural: { w: 8, lanes: 2, sw: 2, cls: 1, tile: 'rd_quay' },
  tunnel: { w: 10, lanes: 2, sw: 0, cls: 1, tile: 'rd_quay', nohouse: true },
};
// ground kinds, one byte per metre, for the tyres and the builders
const GK = { asphalt: 0, grass: 1, sand: 2, water: 3, gravel: 4, concrete: 5, kerb: 6, walk: 7, park: 8 };
const GK_MU = [1.0, 0.55, 0.5, 0.2, 0.7, 0.95, 0.9, 0.92, 0.6], GK_DRAG = [0, 0.09, 0.14, 0.6, 0.05, 0.0, 0.02, 0.01, 0.08];
function road(kind, pts, o) { const rd = Object.assign({ kind, pts, w: RK[kind].w, id: MAP.roads.length, lvl: 0 }, o || {}); MAP.roads.push(rd); return rd; }
function roadR(kind, pts, o) { return road(kind, pts.map(R2), o); }
// ---------- the layout ----------
function layoutMap() {
  // ---- the water: the harbour channel and the sea beyond it, 旗津 across the channel, 蓮池潭 in the north ----
  const shore = [[-3450, 400], [-3100, 800], [-2850, 1000], [-2400, 1150], [-1950, 1300], [-1450, 1500], [-1300, 1550], [-1000, 2000], [-800, 2500], [-500, 2900], [-350, 3300], [-200, 3900], [-150, 4600]];
  MAP.shore = shore.map(R2);
  MAP.water.push([...shore, [-150, 4700], [-3600, 4700], [-3600, 400]].map(R2));
  MAP.qijin = [[-3250, 1300], [-2950, 1650], [-2550, 2100], [-2050, 2700], [-1550, 3400], [-1250, 4000], [-1050, 4700], [-1400, 4700], [-1750, 4000], [-2050, 3400], [-2550, 2700], [-3050, 2100], [-3600, 1600], [-3600, 1300], [-3300, 1200]].map(R2);
  const sea = [[-1400, 4700], [-1750, 4000], [-2050, 3400], [-2550, 2700], [-3050, 2100], [-3600, 1600]];
  MAP.sand.push([...sea, ...sea.slice().reverse().map(([x, z]) => [x + 90, z - 70])].map(R2));   // 旗津海水浴場 along the sea side
  MAP.sand.push([[-3450, 400], [-3100, 800], [-3150, 860], [-3500, 470]].map(R2));   // 西子灣 beach
  MAP.lake = [[1110, 100], [1330, 60], [1470, 140], [1450, 320], [1300, 410], [1110, 380], [1050, 240]];
  MAP.water.push(MAP.lake);
  // ---- 愛河, from the north-east (愛河之心) down the west of the grid, bending west into the harbour ----
  MAP.river = [[-350, -2100], [-700, -1800], [-1000, -1450], [-1150, -1100], [-1220, -700], [-1250, -250], [-1250, 150], [-1300, 550], [-1390, 900], [-1420, 1250], [-1380, 1460], [-1360, 1560]].map(R2);
  // ---- parks: 中央公園, the rail-line park 台鐵園道, 蓮池潭's shore ----
  MAP.parks.push([[-640, 360], [-10, 360], [-10, 890], [-640, 890]].map(R2));   // 中央公園
  MAP.parks.push([[-2100, -1160], [2500, -1160], [2500, -1040], [-2100, -1040]].map(R2));
  MAP.parks.push([[1000, 30], [1540, 30], [1540, 470], [1000, 470]]);
  // ---- the east–west roads, north to south (real names) ----
  roadR('boulevard', [[-1500, -1400], [3000, -1400]], { name: '九如路' });
  roadR('boulevard', [[-1900, -950], [2600, -950]], { name: '建國路' });
  roadR('avenue', [[-2300, -650], [2400, -650]], { name: '七賢路' });
  roadR('street', [[-1000, -320], [1700, -320]], { name: '六合路', night: true });
  roadR('boulevard', [[-2100, 0], [2880, 0]], { name: '中正路' });
  roadR('street', [[-1250, 350], [1300, 350]], { name: '民生路' });
  roadR('street', [[-1200, 620], [-660, 620]], { name: '新田路' });
  roadR('boulevard', [[-2300, 900], [2400, 900]], { name: '五福路' });
  roadR('street', [[-700, 1100], [1400, 1100]], { name: '大同路' });
  roadR('street', [[-800, 1300], [2100, 1300]], { name: '青年路' });
  roadR('boulevard', [[-1000, 1750], [2900, 1750]], { name: '四維路' });
  roadR('street', [[350, 2000], [2300, 2000]], { name: '苓雅路' });
  roadR('boulevard', [[-800, 2300], [2900, 2300]], { name: '三多路' });
  roadR('avenue', [[-900, 2800], [1200, 2800]], { name: '新光路' });
  roadR('boulevard', [[-400, 3450], [2300, 3450]], { name: '中華五路' });
  roadR('avenue', [[-200, 3950], [2900, 3950]], { name: '一心路' });
  // ---- the north–south roads, west to east ----
  roadR('street', [[-2150, -700], [-2150, 1000]], { name: '大仁路' });
  roadR('street', [[-1950, -700], [-1950, 1250]], { name: '大勇路' });
  roadR('street', [[-1750, -700], [-1750, 1300]], { name: '大公路' });
  roadR('avenue', [[-1050, -650], [-1050, 2500], [-900, 2800], [-700, 3450]], { name: '成功路' });
  roadR('boulevard', [[-650, -2100], [-650, 3450]], { name: '中華路' });
  roadR('avenue', [[-300, -650], [-300, 350]], { name: '自強路' });
  roadR('avenue', [[-300, 900], [-300, 2800]], { name: '自強路' });
  roadR('boulevard', [[0, -2100], [0, 4700]], { name: '中山路' });
  roadR('street', [[350, -1000], [350, 3000]], { name: '林森路' });
  roadR('avenue', [[700, -1500], [700, 3450]], { name: '復興路' });
  roadR('boulevard', [[1100, -2100], [1100, 3950]], { name: '民族路' });
  roadR('avenue', [[1600, -1100], [1600, 3950]], { name: '光華路' });
  roadR('boulevard', [[2000, -1600], [2000, 3950]], { name: '凱旋路', tram: true });
  // the roads along both banks of 愛河
  const bank = (side) => MAP.river.filter((p, i) => i >= 2 && i <= 10).map((p, i, a) => { const q = a[Math.min(a.length - 1, i + 1)], o = a[Math.max(0, i - 1)], dx = q[0] - o[0], dz = q[1] - o[1], L = Math.hypot(dx, dz) || 1; return [p[0] + (-dz / L) * 48 * side, p[1] + (dx / L) * 48 * side]; });
  road('street', bank(1), { name: '河西路' }); road('street', bank(-1), { name: '河東路' });
  // ---- 哈瑪星 and 西子灣 in the west ----
  roadR('avenue', [[-2750, 450], [-2750, 1250]], { name: '臨海路' });
  roadR('avenue', [[-2450, -450], [-2450, 1280]], { name: '鼓山路' });
  roadR('rural', [[-2750, 700], [-3100, 720], [-3380, 620], [-3420, 300]], { name: '蓮海路' });
  roadR('street', [[-2450, 700], [-2750, 700]], { name: '哨船街' });
  const hill = []; for (let i = 0; i <= 16; i++) { const t = i / 16; hill.push([-2450 + Math.sin(t * 8.5) * 170 - t * 260, -450 - t * 1150]); }
  roadR('hill', hill, { name: '柴山路' });
  // ---- the quays: 駁二 to 真愛碼頭, then the new bay's waterfront ----
  roadR('quay', [[-2750, 980], [-2400, 1110], [-1950, 1255], [-1500, 1430]], { name: '駁二大道' });
  roadR('quay', [[-1270, 1560], [-965, 1975], [-765, 2475], [-465, 2875], [-315, 3275], [-165, 3875]], { name: '海邊路' });
  // ---- 旗津, down the spine of the island ----
  roadR('rural', [[-3150, 1360], [-2800, 1760], [-2350, 2320], [-1850, 3000], [-1420, 3700], [-1200, 4300], [-1100, 4700]], { name: '旗津路' });
  roadR('rural', [[-3250, 1420], [-3150, 1360]], { name: '廟前路' });
  // ---- 過港隧道: down under the harbour from the new bay's quay to 旗津 ----
  roadR('tunnel', [[-240, 3575], [-1420, 3700]], { name: '過港隧道', tunnel: true, depth: 9, rampL: 150 });
  // ---- 國道一號 up the east edge, elevated, with ramps at 中正 and 九如 ----
  roadR('highway', [[2900, -2100], [2900, 4700]], { name: '國道一號', lvl: 1, h: 9 });
  roadR('ramp', [[2881, -300], [2800, -150], [2680, -30], [2600, 0]], { name: '中正交流道', ramp: true, h0: 9, h1: 0 });
  roadR('ramp', [[2881, 300], [2800, 150], [2680, 30], [2600, 0]], { name: '中正交流道', ramp: true, h0: 9, h1: 0 });
  roadR('ramp', [[2881, -1700], [2800, -1550], [2680, -1430], [2600, -1400]], { name: '九如交流道', ramp: true, h0: 9, h1: 0 });
  roadR('ramp', [[2881, -1100], [2800, -1250], [2680, -1370], [2600, -1400]], { name: '九如交流道', ramp: true, h0: 9, h1: 0 });
  // the dense core: between these the gaps are filled with 巷 (lanes)
  MAP.core = { x0: rx(-2250), x1: rx(2450), z0: rz(-1650), z1: rz(4250) };
  MAP.landmarks = { 美麗島: R2([0, 0]), 高雄車站: R2([0, -1000]), 中央公園: R2([-320, 620]), 六合夜市: R2([-500, -320]), 八五大樓: R2([-420, 2560]), 駁二: R2([-1900, 1180]), 流行音樂中心: R2([-1180, 1700]), 展覽館: R2([-620, 2720]), 夢時代: R2([-500, 3300]), 龍虎塔: [1240, 360], 西子灣: R2([-3300, 560]), 旗津: R2([-3050, 1520]), 新光碼頭: R2([-700, 2600]), 真愛碼頭: R2([-1450, 1580]) };
}
// 巷: between named roads further apart than 130 m a lane is added halfway (two when further than 260), over the core
function autoLanes() {
  const C = MAP.core, named = MAP.roads.slice();
  const ew = named.filter((r) => Math.abs(r.pts[0][1] - r.pts[r.pts.length - 1][1]) < 1 && r.lvl === 0 && !r.ramp).map((r) => r.pts[0][1]).sort((a, b) => a - b);
  const ns = named.filter((r) => Math.abs(r.pts[0][0] - r.pts[r.pts.length - 1][0]) < 1 && r.lvl === 0 && !r.ramp).map((r) => r.pts[0][0]).sort((a, b) => a - b);
  const fill = (vals, mk) => { for (let i = 0; i + 1 < vals.length; i++) { const g = vals[i + 1] - vals[i]; if (g > 260) { mk(vals[i] + g / 3); mk(vals[i] + (2 * g) / 3); } else if (g > 130) mk(vals[i] + g / 2); } };
  fill(ew.filter((z) => z > C.z0 && z < C.z1), (z) => road('lane', [[C.x0, z], [C.x1, z]], { auto: true }));
  fill(ns.filter((x) => x > C.x0 && x < C.x1), (x) => road('lane', [[x, C.z0], [x, C.z1]], { auto: true }));
}
// roads are cut where they would run into water or up the hill: each dry run becomes a road of its own
function clipRoadsToLand() {
  const out = [];
  for (const rd of MAP.roads) {
    if (rd.lvl || rd.ramp || rd.tunnel || rd.kind === 'hill') { out.push(rd); continue; }
    const pts = rd.pts, runs = []; let cur = null;
    for (let i = 0; i + 1 < pts.length; i++) {
      const [ax, az] = pts[i], [bx, bz] = pts[i + 1], L = Math.hypot(bx - ax, bz - az), n = Math.max(1, Math.ceil(L / 4));
      for (let k = 0; k <= n; k++) {
        if (k === n && i + 2 < pts.length) break;
        const t = k / n, x = ax + (bx - ax) * t, z = az + (bz - az) * t, g = groundKind(x, z);
        // named roads bridge the river; lanes stop at it, at the parks and at the hill
        const ok = (g !== GK.water || (!rd.auto && riverDist(x, z) < 30)) && (rd.auto ? terrainH(x, z) < 4 && g !== GK.park : true) && (!rd.auto || !(x < MAP.core.x0 + 1 || x > MAP.core.x1 - 1));
        if (ok) { if (!cur) { cur = []; runs.push(cur); } if (!cur.length || Math.hypot(cur[cur.length - 1][0] - x, cur[cur.length - 1][1] - z) > 0.5) cur.push([x, z]); } else cur = null;
      }
    }
    for (const run of runs) {
      if (run.length < 2) continue;
      // keep only the polyline's corners plus the two ends: straight runs collapse back to their endpoints
      const simp = [run[0]]; for (let i = 1; i + 1 < run.length; i++) { const a = simp[simp.length - 1], b = run[i], c = run[i + 1], cross = (b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0]); if (Math.abs(cross) > 0.5) simp.push(b); } simp.push(run[run.length - 1]);
      let L = 0; for (let i = 1; i < simp.length; i++) L += Math.hypot(simp[i][0] - simp[i - 1][0], simp[i][1] - simp[i - 1][1]);
      if (L < 30) continue;
      out.push(Object.assign({}, rd, { pts: simp, id: out.length }));
    }
  }
  MAP.roads = out; MAP.roads.forEach((r, i) => (r.id = i));
}
// road ends are snapped onto the road they nearly reach, or trimmed back to the last road they crossed, so that no
// road stops short inside a block (a dead end in a block would be a spike in the block's outline)
function snapRoadEnds() {
  for (const rd of MAP.roads) {
    if (rd.lvl || rd.ramp || rd.kind === 'hill') continue;
    for (const end of [0, 1]) {
      const n = rd.pts.length; if (n < 2) continue;
      const P = end ? rd.pts[n - 1] : rd.pts[0], Q = end ? rd.pts[n - 2] : rd.pts[1];
      let dx = P[0] - Q[0], dz = P[1] - Q[1]; const L = Math.hypot(dx, dz) || 1; dx /= L; dz /= L;
      // crossings of the last segment, extended 45 m past the end, with every other road
      let fwd = null, back = null;
      for (const o of MAP.roads) {
        if (o === rd || o.lvl || o.ramp) continue;
        for (let i = 0; i + 1 < o.pts.length; i++) {
          const h = segX(Q[0], Q[1], P[0] + dx * 45, P[1] + dz * 45, o.pts[i][0], o.pts[i][1], o.pts[i + 1][0], o.pts[i + 1][1]); if (!h) continue;
          const s = h[0] * (L + 45);   // distance from Q along the segment
          if (s > L + 0.5) { if (!fwd || s < fwd) fwd = s; } else if (s < L - 0.5) { if (!back || s > back) back = s; }
        }
      }
      let s = null;
      if (fwd != null) s = fwd; else if (back != null && L - back < (rd.auto ? 70 : 60)) s = back;
      if (s == null) continue;
      const np = [Q[0] + dx * s, Q[1] + dz * s]; if (end) rd.pts[n - 1] = np; else rd.pts[0] = np;
    }
  }
}
// ---------- the graph: roads cut at every crossing into edges between nodes ----------
function segX(ax, az, bx, bz, cx, cz, dx, dz) {
  const r0 = bx - ax, r1 = bz - az, s0 = dx - cx, s1 = dz - cz, den = r0 * s1 - r1 * s0; if (Math.abs(den) < 1e-9) return null;
  const t = ((cx - ax) * s1 - (cz - az) * s0) / den, u = ((cx - ax) * r1 - (cz - az) * r0) / den;
  if (t < -1e-6 || t > 1 + 1e-6 || u < -1e-6 || u > 1 + 1e-6) return null; return [clamp(t, 0, 1), clamp(u, 0, 1)];
}
function buildGraph() {
  const nodes = [], nodeAt = new Map();
  const getNode = (x, z, lvl) => {
    const kx = Math.round(x / 3), kz = Math.round(z / 3);
    for (let i = kx - 1; i <= kx + 1; i++) for (let j = kz - 1; j <= kz + 1; j++) { const a = nodeAt.get(lvl + ':' + i + ',' + j); if (a) for (const n of a) if (Math.hypot(n.x - x, n.z - z) < 4) return n; }
    const n = { id: nodes.length, x, z, lvl, h: 0, edges: [], out: [] }; nodes.push(n); const key = lvl + ':' + kx + ',' + kz; if (!nodeAt.has(key)) nodeAt.set(key, []); nodeAt.get(key).push(n); return n;
  };
  for (const rd of MAP.roads) {
    rd.cum = [0]; for (let i = 1; i < rd.pts.length; i++) rd.cum.push(rd.cum[i - 1] + Math.hypot(rd.pts[i][0] - rd.pts[i - 1][0], rd.pts[i][1] - rd.pts[i - 1][1])); rd.len = rd.cum[rd.cum.length - 1];
    const p0 = rd.pts[0], p1 = rd.pts[rd.pts.length - 1];
    rd.ev = [{ s: 0, node: getNode(p0[0], p0[1], rd.ramp ? 1 : rd.lvl) }, { s: rd.len, node: getNode(p1[0], p1[1], rd.lvl) }];
  }
  // a road's end lying on another road is a T junction
  for (const rd of MAP.roads) for (const end of [0, 1]) {
    const ev = rd.ev[end], lvl = ev.node.lvl;
    for (const o of MAP.roads) { if (o === rd || o.ramp || o.lvl !== lvl) continue; const n = nearestOn(o, ev.node.x, ev.node.z); if (n && n.d < 2.5 && n.s > 1 && n.s < o.len - 1) o.ev.push({ s: n.s, node: ev.node }); }
  }
  // crossings
  for (let i = 0; i < MAP.roads.length; i++) for (let j = i + 1; j < MAP.roads.length; j++) {
    const A = MAP.roads[i], B = MAP.roads[j]; if (A.ramp || B.ramp || A.tunnel || B.tunnel || A.lvl !== B.lvl) continue;
    for (let a = 0; a + 1 < A.pts.length; a++) for (let b = 0; b + 1 < B.pts.length; b++) {
      const h = segX(A.pts[a][0], A.pts[a][1], A.pts[a + 1][0], A.pts[a + 1][1], B.pts[b][0], B.pts[b][1], B.pts[b + 1][0], B.pts[b + 1][1]); if (!h) continue;
      const sA = A.cum[a] + h[0] * (A.cum[a + 1] - A.cum[a]), sB = B.cum[b] + h[1] * (B.cum[b + 1] - B.cum[b]);
      const x = A.pts[a][0] + (A.pts[a + 1][0] - A.pts[a][0]) * h[0], z = A.pts[a][1] + (A.pts[a + 1][1] - A.pts[a][1]) * h[0], node = getNode(x, z, A.lvl);
      A.ev.push({ s: sA, node }); B.ev.push({ s: sB, node });
    }
  }
  // edges between consecutive events
  const edges = [];
  for (const rd of MAP.roads) {
    rd.ev.sort((p, q) => p.s - q.s);
    const ev = []; for (const e of rd.ev) { const last = ev[ev.length - 1]; if (last && (last.node === e.node || e.s - last.s < 2)) continue; ev.push(e); }
    for (let k = 0; k + 1 < ev.length; k++) {
      const s0 = ev[k].s, s1 = ev[k + 1].s, pts = [[ev[k].node.x, ev[k].node.z]];
      for (let i = 1; i + 1 < rd.pts.length; i++) if (rd.cum[i] > s0 + 1 && rd.cum[i] < s1 - 1) pts.push(rd.pts[i]);
      pts.push([ev[k + 1].node.x, ev[k + 1].node.z]);
      let len = 0; for (let i = 1; i < pts.length; i++) len += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
      const e = { id: edges.length, a: ev[k].node, b: ev[k + 1].node, pts, rd, kind: rd.kind, K: RK[rd.kind], w: rd.w, len, lvl: rd.lvl, s0, s1 };
      if (rd.h) { e.h0 = e.h1 = rd.h; } if (rd.ramp) { e.h0 = lerp(rd.h0, rd.h1, s0 / rd.len); e.h1 = lerp(rd.h0, rd.h1, s1 / rd.len); e.ramp = true; }
      if (rd.tunnel) { e.tunnel = true; e.h0 = tunnelH(rd, s0); e.h1 = tunnelH(rd, s1); }
      // a grade road crossing the river is a bridge
      if (!e.lvl && !e.ramp && riverCross(pts)) { e.bridge = true; e.h0 = e.h1 = 0; }
      if (rd.kind === 'hill') e.hill = true;
      edges.push(e); ev[k].node.edges.push(e); ev[k + 1].node.edges.push(e);
    }
  }
  for (const n of nodes) if (n.lvl) n.h = 9;
  for (const e of edges) if (e.ramp) { e.a.h = 9; }
  MAP.nodes = nodes; MAP.edges = edges;
  // the leaving direction of every edge at both ends, sorted round each node
  for (const e of edges) {
    const p = e.pts, d0 = [p[1][0] - p[0][0], p[1][1] - p[0][1]], d1 = [p[p.length - 2][0] - p[p.length - 1][0], p[p.length - 2][1] - p[p.length - 1][1]];
    e.a.out.push({ e, dir: 1, ang: Math.atan2(d0[1], d0[0]) }); e.b.out.push({ e, dir: -1, ang: Math.atan2(d1[1], d1[0]) });
  }
  for (const n of nodes) {
    n.out.sort((p, q) => p.ang - q.ang);
    const kinds = new Set(n.edges.filter((e) => e.K.cls >= 1).map((e) => e.rd.name || e.rd.id));
    n.lit = n.edges.length >= 3 && n.edges.filter((e) => e.K.cls >= 1).length >= 3 && kinds.size >= 2 && !n.lvl;
    n.ring = Math.hypot(n.x - MAP.landmarks.美麗島[0], n.z - MAP.landmarks.美麗島[1]) < 5;
    if (n.ring) n.lit = false;
    // how far back each edge's road stops short of the node centre: clear of the crossing roads
    for (const o of n.out) {
      let d = 0;
      for (const q of n.out) { if (q === o) continue; const s = Math.abs(Math.sin(q.ang - o.ang)); d = Math.max(d, (q.e.w / 2 + 0.2) / Math.max(0.42, s)); }
      if (n.ring) d = 46;
      o.trim = Math.min(d, Math.max(8, o.e.len * 0.45));
    }
  }
  for (const e of edges) { e.ta = e.a.out.find((o) => o.e === e).trim; e.tb = e.b.out.find((o) => o.e === e).trim; }
  MAP.elev = edges.filter((e) => e.h0 != null || e.hill);
  MAP.trenches = []; for (const rd of MAP.roads) if (rd.tunnel) { rd.len = rd.len || polyLen(rd.pts); let x0 = 1e9, z0 = 1e9, x1 = -1e9, z1 = -1e9; for (const [x, z] of rd.pts) { x0 = Math.min(x0, x); z0 = Math.min(z0, z); x1 = Math.max(x1, x); z1 = Math.max(z1, z); } MAP.trenches.push({ rd, pts: rd.pts, bb: [x0 - 16, z0 - 16, x1 + 16, z1 + 16] }); }
}
// the depth of a tunnel road at distance s along it: level at both mouths, down a ramp, flat beneath the water
function tunnelH(rd, s) { const L = rd.len || polyLen(rd.pts), R = rd.rampL; const k = s < R ? sstep(s / R) : s > L - R ? sstep((L - s) / R) : 1; return -rd.depth * k; }
function nearestOn(rd, x, z) {
  let best = null;
  for (let i = 0; i + 1 < rd.pts.length; i++) {
    const [ax, az] = rd.pts[i], [bx, bz] = rd.pts[i + 1], dx = bx - ax, dz = bz - az, L2 = dx * dx + dz * dz || 1, t = clamp(((x - ax) * dx + (z - az) * dz) / L2, 0, 1);
    const px = ax + dx * t, pz = az + dz * t, d = Math.hypot(x - px, z - pz);
    if (!best || d < best.d) best = { d, x: px, z: pz, s: rd.cum[i] + t * Math.sqrt(L2), yaw: Math.atan2(dx, dz), i, t };
  }
  return best;
}
function riverCross(pts) { for (let i = 0; i + 1 < pts.length; i++) for (let j = 0; j + 1 < MAP.river.length; j++) if (segX(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], MAP.river[j][0], MAP.river[j][1], MAP.river[j + 1][0], MAP.river[j + 1][1])) return true; return false; }
// ---------- the faces: every block is traced round by always taking the next road anticlockwise ----------
function buildFaces() {
  const seen = new Set(), faces = [];
  for (const n of MAP.nodes) for (const o0 of n.out) {
    if (o0.e.lvl || o0.e.ramp || o0.e.tunnel) continue;
    const k0 = o0.e.id * 2 + (o0.dir > 0 ? 1 : 0); if (seen.has(k0)) continue;
    const loop = []; let cur = o0, guard = 0;
    while (guard++ < 4000) {
      seen.add(cur.e.id * 2 + (cur.dir > 0 ? 1 : 0)); loop.push(cur);
      const at = cur.dir > 0 ? cur.e.b : cur.e.a, outs = at.out.filter((q) => !q.e.lvl && !q.e.ramp && !q.e.tunnel);
      const idx = outs.findIndex((q) => q.e === cur.e && q.dir === -cur.dir); if (idx < 0) break;
      cur = outs[(idx + 1) % outs.length];
      if (cur === o0) break;
    }
    if (cur !== o0) continue;
    // the polygon, with every polyline point, and each vertex's road widths
    const poly = [], wid = [], swd = [], eds = [];
    for (const o of loop) {
      const p = o.dir > 0 ? o.e.pts : o.e.pts.slice().reverse(), from = o.dir > 0 ? o.e.a : o.e.b, to = o.dir > 0 ? o.e.b : o.e.a;
      for (let i = 0; i + 1 < p.length; i++) {
        let q = p[i];
        // round the roundabout the block's corner is cut off, forty metres back along each road
        if (i === 0 && from.ring) { const d = [p[1][0] - p[0][0], p[1][1] - p[0][1]], L = Math.hypot(d[0], d[1]) || 1; q = [p[0][0] + d[0] / L * 42, p[0][1] + d[1] / L * 42]; }
        poly.push(q); wid.push(o.e.w / 2); swd.push(o.e.K.sw); eds.push(o.e);
      }
      if (to.ring) { const n = p.length, d = [p[n - 1][0] - p[n - 2][0], p[n - 1][1] - p[n - 2][1]], L = Math.hypot(d[0], d[1]) || 1; poly.push([p[n - 1][0] - d[0] / L * 42, p[n - 1][1] - d[1] / L * 42]); wid.push(1); swd.push(4); eds.push(null); }
    }
    let A = 0; for (let i = 0; i < poly.length; i++) { const p = poly[i], q = poly[(i + 1) % poly.length]; A += p[0] * q[1] - q[0] * p[1]; } A /= 2;
    if (A >= -60) continue;
    faces.push({ poly, wid, swd, eds, loop, area: -A });
  }
  for (const f of faces) {
    const cx = f.poly.reduce((s, p) => s + p[0], 0) / f.poly.length, cz = f.poly.reduce((s, p) => s + p[1], 0) / f.poly.length; f.cx = cx; f.cz = cz;
    f.kerb = offsetPoly(f.poly, f.wid); f.inner = f.kerb && offsetPoly(f.kerb, f.swd);
    f.kind = classifyFace(f);
  }
  MAP.faces = faces;
}
// a polygon moved inward (interior on the left of travel) by a distance per edge; null when it folds over
function offsetPoly(poly, dist) {
  const n = poly.length, out = [];
  for (let i = 0; i < n; i++) {
    const p0 = poly[(i + n - 1) % n], p1 = poly[i], p2 = poly[(i + 1) % n];
    const d0 = dist[(i + n - 1) % n], d1 = dist[i];
    let ax = p1[0] - p0[0], az = p1[1] - p0[1], L0 = Math.hypot(ax, az) || 1; ax /= L0; az /= L0;
    let bx = p2[0] - p1[0], bz = p2[1] - p1[1], L1 = Math.hypot(bx, bz) || 1; bx /= L1; bz /= L1;
    const n0 = [az, -ax], n1 = [bz, -bx];   // left normals
    // the offset lines' crossing: solve p1 + n0*d0 + a*t = p1 + n1*d1 + b*u
    const den = ax * bz - az * bx;
    if (Math.abs(den) < 0.08) {   // nearly straight, or a dead-end spike: a plain offset, or a point just past the end
      if (ax * bx + az * bz < -0.5) out.push([p1[0] + ax * d0, p1[1] + az * d0]);
      else out.push([p1[0] + (n0[0] + n1[0]) * 0.5 * (d0 + d1) * 0.5, p1[1] + (n0[1] + n1[1]) * 0.5 * (d0 + d1) * 0.5]);
      continue;
    }
    const ex = (n1[0] * d1 - n0[0] * d0), ez = (n1[1] * d1 - n0[1] * d0);
    const t = (ex * bz - ez * bx) / den;
    const qx = p1[0] + n0[0] * d0 + ax * t, qz = p1[1] + n0[1] * d0 + az * t;
    if (Math.hypot(qx - p1[0], qz - p1[1]) > Math.max(d0, d1) * 4 + 2) out.push([p1[0] + (n0[0] + n1[0]) * 0.5 * d1, p1[1] + (n0[1] + n1[1]) * 0.5 * d1]); else out.push([qx, qz]);
  }
  let A = 0; for (let i = 0; i < out.length; i++) { const p = out[i], q = out[(i + 1) % out.length]; A += p[0] * q[1] - q[0] * p[1]; }
  return A < -4 ? out : null;
}
function pointInPoly(poly, x, z) { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const a = poly[i], b = poly[j]; if ((a[1] > z) !== (b[1] > z) && x < ((b[0] - a[0]) * (z - a[1])) / (b[1] - a[1]) + a[0]) c = !c; } return c; }
function classifyFace(f) {
  if (!f.inner) return 'none';
  let water = 0, sand = 0, park = 0, hill = 0, N = 0;
  for (let i = 0; i < f.poly.length; i++) { const p = f.poly[i]; const x = lerp(p[0], f.cx, 0.5), z = lerp(p[1], f.cz, 0.5); const g = groundKind(x, z); N++; if (g === GK.water) water++; if (g === GK.sand) sand++; if (g === GK.park) park++; if (terrainH(x, z) > 5) hill++; }
  const gc = groundKind(f.cx, f.cz);
  if (water / N > 0.4 || gc === GK.water) return 'water';
  if (hill / N > 0.3 || terrainH(f.cx, f.cz) > 5) return 'hill';
  if (park / N > 0.4 || gc === GK.park) return 'park';
  if (sand / N > 0.4 || gc === GK.sand) return 'beach';
  if (pointInPoly(MAP.qijin, f.cx, f.cz)) return 'qijin';
  if (f.cx < MAP.core.x0 - 50 || f.cx > MAP.core.x1 + 50 || f.cz < MAP.core.z0 - 50 || f.cz > MAP.core.z1 + 50) return 'rural';
  if (riverDist(f.cx, f.cz) < 60) return 'bank';
  return 'city';
}
// which part of town: for the mix of houses
function district(x, z) {
  const X = (x - RX) / RS, Z = (z - RZ) / RS;
  if (X < -1500 && Z < 1400) return 'yancheng';           // 鹽埕、哈瑪星: the old town, low and tiled
  if (Z > 2450 && X < 900) return 'bay';                   // 亞洲新灣區: towers and glass
  if (Z > 3200) return 'south';                            // 前鎮: factories, tin roofs
  if (Math.abs(X) < 800 && Z > -1200 && Z < 1500) return 'centre';   // 新興、前金: the commercial heart
  return 'town';
}
// ---------- the ground picture and the kind map ----------
function polyPath(g, poly, k) { g.beginPath(); poly.forEach(([x, z], i) => (i ? g.lineTo(x * k, z * k) : g.moveTo(x * k, z * k))); g.closePath(); }
function strokePts(c, pts, w, kk) { c.lineWidth = w * kk; c.lineCap = 'butt'; c.lineJoin = 'round'; c.beginPath(); pts.forEach(([x, z], i) => (i ? c.lineTo(x * kk, z * kk) : c.moveTo(x * kk, z * kk))); c.stroke(); }
let KG = null;
function kindCanvas() { if (!KG) { const KW = MAP.W; MAP.kind = new Uint8Array(KW * KW); MAP.kindW = KW; KG = canvas(KW, KW).getContext('2d'); } return KG; }
function fillK(code, draw) { const kg = kindCanvas(); kg.fillStyle = kg.strokeStyle = '#' + (code * 16).toString(16).padStart(2, '0').repeat(3); draw(kg, 1); }
function readKinds() { const KW = MAP.kindW, kd = KG.getImageData(0, 0, KW, KW).data, kind = MAP.kind; for (let i = 0; i < KW * KW; i++) kind[i] = Math.round(kd[i * 4] / 16); }
// pass one: land and water, so roads can be clipped and faces classified
function paintKindsBase() {
  fillK(GK.grass, (c) => c.fillRect(0, 0, MAP.W, MAP.W));
  // the core is paved, except where the hill rises through it
  const C = MAP.core, kg = kindCanvas(); kg.fillStyle = '#505050'; kg.fillRect(C.x0, C.z0, C.x1 - C.x0, C.z1 - C.z0);
  fillK(GK.grass, (c) => { c.beginPath(); c.ellipse(HILL.x, HILL.z, HILL.rx * 0.834, HILL.rz * 0.834, 0, 0, TAU); c.fill(); });
  for (const p of MAP.parks) fillK(GK.park, (c) => { polyPath(c, p, 1); c.fill(); });
  for (const p of MAP.water) fillK(GK.water, (c) => { polyPath(c, p, 1); c.fill(); });
  fillK(GK.concrete, (c) => { polyPath(c, MAP.qijin, 1); c.fill(); });
  for (const p of MAP.sand) fillK(GK.sand, (c) => { polyPath(c, p, 1); c.fill(); });
  fillK(GK.water, (c) => strokePts(c, MAP.river, 44, 1));
  readKinds();
}
// pass two: the roads and their pavements
function paintKindsRoads() {
  for (const e of MAP.edges) if (!e.lvl && !e.ramp && !e.tunnel && e.K.sw) fillK(GK.walk, (c) => strokePts(c, e.pts, e.w + e.K.sw * 2, 1));
  for (const e of MAP.edges) if (!e.lvl && !e.ramp && !e.tunnel) fillK(GK.asphalt, (c) => strokePts(c, e.pts, e.w, 1));
  for (const n of MAP.nodes) if (n.ring) fillK(GK.asphalt, (c) => { c.beginPath(); c.arc(n.x, n.z, 46, 0, TAU); c.fill(); });
  readKinds();
}
function paintGround() {
  const W = MAP.W, px = MAP.px, N = Math.round(W / px), g = canvas(N, N).getContext('2d'), k = 1 / px;
  // the grass and the hill's forest, painted coarsely (three metres a pixel) and scaled up
  const M = N >> 1, gc = canvas(M, M).getContext('2d'), im = gc.createImageData(M, M), d = im.data, p2 = px * 2;
  for (let y = 0; y < M; y++) for (let x = 0; x < M; x++) {
    const wx = x * p2, wz = y * p2, h = terrainH(wx, wz), n = vnoise2(x * 0.06, y * 0.06) * 0.6 + vnoise2(x * 0.26, y * 0.26) * 0.4, i = (y * M + x) * 4;
    let c = h > 6 ? mixHex(0x3e6e2c, 0x6a9a44, n) : mixHex(0x6e9a46, 0x92b858, n);
    if (h > 40) c = mixHex(c, 0x56704a, clamp((h - 40) / 60, 0, 0.6));
    d[i] = c >> 16; d[i + 1] = (c >> 8) & 255; d[i + 2] = c & 255; d[i + 3] = 255;
  }
  gc.putImageData(im, 0, 0); g.imageSmoothingEnabled = true; g.drawImage(gc.canvas, 0, 0, N, N);
  // the city's yards, except where the hill rises through the core
  const C = MAP.core; g.fillStyle = '#a8a49c'; g.fillRect(C.x0 * k, C.z0 * k, (C.x1 - C.x0) * k, (C.z1 - C.z0) * k);
  g.fillStyle = '#4e7e34'; g.beginPath(); g.ellipse(HILL.x * k, HILL.z * k, HILL.rx * 0.834 * k, HILL.rz * 0.834 * k, 0, 0, TAU); g.fill();
  for (const f of MAP.faces) if (f.kind === 'city' || f.kind === 'bank') { g.fillStyle = f.kind === 'city' ? '#9e9a92' : '#88a860'; polyPath(g, f.kerb, k); g.fill(); }
  for (const p of MAP.parks) { g.fillStyle = '#5e9a40'; polyPath(g, p, k); g.fill(); }
  for (const p of MAP.water) { g.fillStyle = '#2c78ac'; polyPath(g, p, k); g.fill(); }
  g.fillStyle = '#b4ac9c'; polyPath(g, MAP.qijin, k); g.fill();
  for (const p of MAP.sand) { g.fillStyle = '#e4d4a4'; polyPath(g, p, k); g.fill(); }
  g.strokeStyle = '#3a84b4'; strokePts(g, MAP.river, 44, k);
  // the roads: pavement band, then the asphalt
  for (const e of MAP.edges) if (!e.lvl && !e.ramp && e.K.sw) { g.strokeStyle = '#cfcac0'; strokePts(g, e.pts, e.w + e.K.sw * 2, k); }
  for (const e of MAP.edges) if (!e.lvl && !e.ramp && !e.tunnel) { g.strokeStyle = e.K.cls >= 2 ? '#4e4e56' : '#585860'; strokePts(g, e.pts, e.w, k); }
  for (const e of MAP.edges) if (e.lvl || e.ramp) { g.strokeStyle = '#6a6a72'; strokePts(g, e.pts, e.w, k); }
  for (const e of MAP.edges) if (e.tunnel) { g.strokeStyle = '#7a6a72'; g.setLineDash([6 * k, 6 * k]); strokePts(g, e.pts, e.w * 0.5, k); g.setLineDash([]); }
  MAP.ground = g.canvas;
}
function groundKind(x, z) { const W = MAP.kindW, i = Math.floor(z), j = Math.floor(x); if (i < 0 || j < 0 || i >= W || j >= W) return GK.grass; return MAP.kind[i * W + j]; }
// ---------- heights ----------
function riverDist(x, z) {
  const R = MAP.river; if (!R) return 1e9; let best = 1e9;
  for (let i = 0; i + 1 < R.length; i++) {
    const [ax, az] = R[i], [bx, bz] = R[i + 1], dx = bx - ax, dz = bz - az, L2 = dx * dx + dz * dz || 1, t = clamp(((x - ax) * dx + (z - az) * dz) / L2, 0, 1);
    const d = Math.hypot(x - ax - dx * t, z - az - dz * t); if (d < best) best = d;
  }
  return best;
}
// the land: 柴山 in the north-west, 旗後山 at 旗津's tip, the river sunk into its channel, flat city everywhere else
function terrainH(x, z) {
  let h = 0;
  const dx = (x - HILL.x) / HILL.rx, dz = (z - HILL.z) / HILL.rz, r = Math.sqrt(dx * dx + dz * dz);
  if (r < 1) { const k = 1 - r; h += k * k * (3 - 2 * k) * 115 + vnoise2(x * 0.006, z * 0.006) * 6 * k; }
  const qx = (x - 112) / 130, qz = (z - 1787) / 120, q = Math.sqrt(qx * qx + qz * qz); if (q < 1) { const k = 1 - q; h += k * k * 26; }
  if (x > 1080 && x < 1400 && z > -10 && z < 1970) { const d = riverDist(x, z); if (d < 34) h -= 2.6 * sstep(clamp((34 - d) / 12, 0, 1)); }
  // the open cuts down into the tunnel
  for (const t of MAP.trenches) { if (x < t.bb[0] || x > t.bb[2] || z < t.bb[1] || z > t.bb[3]) continue; const n = nearestOnPts(t.pts, x, z); if (n.d < 13) { const floor = tunnelH(t.rd, n.s); if (floor < h) h = lerp(h, floor, sstep(clamp((13 - n.d) / 6, 0, 1))); } }
  return h;
}
// the surface under the car: the terrain, or an elevated road when the car is up on one
const GH = { tunnel: false };
function groundH(x, z, yNow) {
  let h = terrainH(x, z); GH.tunnel = false;
  for (const e of MAP.elev) {
    const bb = e.bb; if (x < bb[0] || x > bb[2] || z < bb[1] || z > bb[3]) continue;
    const n = nearestOnPts(e.pts, x, z); if (n.d > e.w / 2 + 2.5) continue;
    if (e.hill) { if (n.d < e.w / 2 + 1) h += 0.3; continue; }
    if (e.tunnel) { if (n.d <= e.w / 2 + 1) { GH.tunnel = true; return tunnelH(e.rd, e.s0 + n.s); } continue; }
    const t = n.s / Math.max(1, e.len), he = e.ramp ? lerp(e.h0, e.h1, sstep(t)) : e.h0;
    if (yNow == null || Math.abs(yNow - he) < 3.5 || he < 0.5) { h = Math.max(h, he - (n.d > e.w / 2 ? (n.d - e.w / 2) * 0.6 : 0)); }
  }
  return h;
}
function nearestOnPts(pts, x, z) {
  let best = { d: 1e9, s: 0 }, s0 = 0;
  for (let i = 0; i + 1 < pts.length; i++) {
    const [ax, az] = pts[i], [bx, bz] = pts[i + 1], dx = bx - ax, dz = bz - az, L = Math.hypot(dx, dz) || 1, t = clamp(((x - ax) * dx + (z - az) * dz) / (L * L), 0, 1);
    const d = Math.hypot(x - ax - dx * t, z - az - dz * t); if (d < best.d) best = { d, s: s0 + t * L, yaw: Math.atan2(dx, dz), x: ax + dx * t, z: az + dz * t };
    s0 += L;
  }
  return best;
}
// the nearest point on the road network: for spawning and the 回到路上 button
function nearestRoad(x, z, yNow) {
  let best = null;
  for (const e of MAP.edges) {
    if (e.h0 != null && e.h0 > 0.5 && (yNow == null || Math.abs(yNow - e.h0) > 3)) continue;
    const n = nearestOnPts(e.pts, x, z); if (!best || n.d < best.d) best = Object.assign(n, { e, rd: e.rd });
  }
  return best;
}
function buildMap() {
  layoutMap(); paintKindsBase(); autoLanes(); clipRoadsToLand(); snapRoadEnds(); buildGraph();
  for (const e of MAP.elev) { let x0 = 1e9, z0 = 1e9, x1 = -1e9, z1 = -1e9; for (const [x, z] of e.pts) { x0 = Math.min(x0, x); z0 = Math.min(z0, z); x1 = Math.max(x1, x); z1 = Math.max(z1, z); } e.bb = [x0 - 12, z0 - 12, x1 + 12, z1 + 12]; }
  buildFaces(); paintKindsRoads(); paintGround();
}
