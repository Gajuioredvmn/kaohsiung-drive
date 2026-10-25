// ===================== the city: road surfaces, pavements, houses and street furniture built from the map =====================
// Everything static is one of two things: a quad in a chunk's mesh (road strips, pavements, junctions) or an instanced
// box (every house, column, sign, pole, tank and shed). Boxes carry their own tiles: the front gets a facade picture,
// the sides and top a repeating tile. The city is cut into 300 m chunks so the renderer can skip what is far away.
const CITY = { size: 300, chunks: new Map(), signals: [], lots: [], lamps: [], wheel: null, stats: {} };
class Geo {
  constructor() { this.p = []; this.n = []; this.uv = []; this.t = []; this.c = []; this.i = []; this.nv = 0; }
  // a, b, c, d anticlockwise as seen from the front; uv = [u0, v0, u1, v1] with a at (u0, v0), c at (u1, v1)
  quad(a, b, c, d, uv, tile, col, nrm) {
    let nx, ny, nz;
    if (nrm) { nx = nrm[0]; ny = nrm[1]; nz = nrm[2]; } else { const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = d[0] - a[0], vy = d[1] - a[1], vz = d[2] - a[2]; nx = uy * vz - uz * vy; ny = uz * vx - ux * vz; nz = ux * vy - uy * vx; const L = Math.hypot(nx, ny, nz) || 1; nx /= L; ny /= L; nz /= L; }
    const k = this.nv, cc = col || WHITE3;
    const push = (p, u, v) => { this.p.push(p[0], p[1], p[2]); this.n.push(nx, ny, nz); this.uv.push(u, v); this.t.push(tile[0], tile[1], tile[2], tile[3]); this.c.push(cc[0], cc[1], cc[2]); };
    push(a, uv[0], uv[1]); push(b, uv[2], uv[1]); push(c, uv[2], uv[3]); push(d, uv[0], uv[3]);
    this.i.push(k, k + 1, k + 2, k, k + 2, k + 3); this.nv += 4;
  }
  // a flat polygon (anticlockwise seen from above is not required: it is fanned and faces up), uv from the world
  fan(pts, y, tile, scale, col) {
    const k = this.nv, cc = col || WHITE3, s = 1 / (scale || 4);
    for (const p of pts) { this.p.push(p[0], y, p[1]); this.n.push(0, 1, 0); this.uv.push(p[0] * s, p[1] * s); this.t.push(tile[0], tile[1], tile[2], tile[3]); this.c.push(cc[0], cc[1], cc[2]); }
    for (let i = 1; i + 1 < pts.length; i++) this.i.push(k, k + i + 1, k + i);
    this.nv += pts.length;
  }
  build() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(this.n, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2));
    g.setAttribute('tile', new THREE.Float32BufferAttribute(this.t, 4)); g.setAttribute('color', new THREE.Float32BufferAttribute(this.c, 3));
    g.setIndex(this.i); g.computeBoundingSphere(); return g;
  }
}
const WHITE3 = [1, 1, 1];
// repS, repT: metres per repeat of the side and top tiles (0 stretches the tile over the face); repF: how much of the front tile's width shows
const BOX_STRIDE = 25;
class Boxes { constructor() { this.a = []; this.n = 0; } add(x, y, z, yaw, w, h, d, tf, ts, tt, col, repS, repT, repF) { const c = col || WHITE3; this.a.push(x, y, z, w, h, d, yaw, tf[0], tf[1], tf[2], tf[3], ts[0], ts[1], ts[2], ts[3], tt[0], tt[1], tt[2], tt[3], c[0], c[1], c[2], repS == null ? 4 : repS, repT == null ? 4 : repT, repF == null ? 1 : repF); this.n++; } }
function chunkAt(x, z) { const s = CITY.size, key = Math.floor(x / s) + ',' + Math.floor(z / s); let c = CITY.chunks.get(key); if (!c) { c = { key, cx: (Math.floor(x / s) + 0.5) * s, cz: (Math.floor(z / s) + 0.5) * s, geo: new Geo(), top: new Geo(), boxes: new Boxes(), hmax: 10 }; CITY.chunks.set(key, c); } return c; }
// a box: (x, z) is the middle of its front edge on the ground, yaw its facing (0 = facing south, +z), w across the front, h up, d back
function box(x, y, z, yaw, w, h, d, tf, ts, tt, col, repS, repT, repF) { const c = chunkAt(x, z); c.boxes.add(x, y, z, yaw, w, h, d, tf, ts, tt, col, repS, repT, repF); if (y + h > c.hmax) c.hmax = y + h; }
// ---------- colliders: oriented boxes and circles the car cannot pass through ----------
const SOL = { grid: new Map(), cell: 40, list: [] };
function addSolid(s) {
  if (s.y0 == null) s.y0 = terrainH(s.x, s.z);   // the base: a thing on the ground, unless told it stands on a deck or a tunnel floor
  SOL.list.push(s); const c = SOL.cell, R = s.r != null ? s.r : Math.hypot(s.hx, s.hz);
  for (let i = Math.floor((s.x - R) / c); i <= Math.floor((s.x + R) / c); i++) for (let j = Math.floor((s.z - R) / c); j <= Math.floor((s.z + R) / c); j++) { const key = i + ',' + j; let a = SOL.grid.get(key); if (!a) SOL.grid.set(key, (a = [])); a.push(s); }
}
const _sn = [];
function solidsNear(x, z, R) { _sn.length = 0; const c = SOL.cell; for (let i = Math.floor((x - R) / c); i <= Math.floor((x + R) / c); i++) for (let j = Math.floor((z - R) / c); j <= Math.floor((z + R) / c); j++) { const a = SOL.grid.get(i + ',' + j); if (a) for (const s of a) if (!_sn.includes(s)) _sn.push(s); } return _sn; }
// a solid for a box placed like box(): the oriented footprint
function boxSolid(x, z, yaw, w, d, h) { const s = Math.sin(yaw), c = Math.cos(yaw); addSolid({ x: x - s * d / 2, z: z - c * d / 2, yaw, hx: w / 2, hz: d / 2, h: h == null ? 100 : h }); }
// under an elevated deck (not a tunnel, not a hill road): nothing tall is built there
function underDeck(x, z, m) {
  for (const e of MAP.elev) { if (e.tunnel || e.hill) continue; const bb = e.bb; if (x < bb[0] - m || x > bb[2] + m || z < bb[1] - m || z > bb[3] + m) continue; const n = nearestOnPts(e.pts, x, z); if (n.d < e.w / 2 + m) return true; }
  return false;
}
function inLot(x, z, m) { for (const L of CITY.lots) if (x > L[0] - (m || 0) && x < L[2] + (m || 0) && z > L[1] - (m || 0) && z < L[3] + (m || 0)) return true; return underDeck(x, z, (m || 0) + 3); }
function lot(x0, z0, x1, z1) { CITY.lots.push([Math.min(x0, x1), Math.min(z0, z1), Math.max(x0, x1), Math.max(z0, z1)]); }
// ---------- helpers along polylines ----------
function polyLen(pts) { let L = 0; for (let i = 1; i < pts.length; i++) L += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); return L; }
// the part of a polyline between s0 and s1 (distances along it)
function polyCut(pts, s0, s1) {
  const out = []; let s = 0;
  for (let i = 0; i + 1 < pts.length; i++) {
    const [ax, az] = pts[i], [bx, bz] = pts[i + 1], L = Math.hypot(bx - ax, bz - az); if (L < 1e-6) continue;
    const e0 = Math.max(s0, s), e1 = Math.min(s1, s + L);
    if (e1 > e0) { const t0 = (e0 - s) / L, t1 = (e1 - s) / L; if (!out.length) out.push([ax + (bx - ax) * t0, az + (bz - az) * t0]); out.push([ax + (bx - ax) * t1, az + (bz - az) * t1]); }
    s += L;
  }
  return out;
}
// left and right offsets at every vertex of a polyline (mitred at the corners)
function polyOffsets(pts, half) {
  const n = pts.length, L = [], R = [];
  for (let i = 0; i < n; i++) {
    const p = pts[i], a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)];
    let d0x = p[0] - a[0], d0z = p[1] - a[1], d1x = b[0] - p[0], d1z = b[1] - p[1];
    const l0 = Math.hypot(d0x, d0z) || 1, l1 = Math.hypot(d1x, d1z) || 1; d0x /= l0; d0z /= l0; d1x /= l1; d1z /= l1;
    if (i === 0) { d0x = d1x; d0z = d1z; } if (i === n - 1) { d1x = d0x; d1z = d0z; }
    let mx = d0x + d1x, mz = d0z + d1z; const ml = Math.hypot(mx, mz) || 1; mx /= ml; mz /= ml;
    const cosH = mx * d1x + mz * d1z, k = half / Math.max(0.45, cosH);
    const nx = mz, nz = -mx;   // left of travel
    L.push([p[0] + nx * k, p[1] + nz * k]); R.push([p[0] - nx * k, p[1] - nz * k]);
  }
  return { L, R };
}
// the height of a road edge at distance s along the edge's own polyline
function edgeH(e, s) { if (e.h0 == null) return 0; if (e.tunnel) return tunnelH(e.rd, e.s0 + s); if (!e.ramp) return e.h0; return lerp(e.h0, e.h1, sstep(clamp(s / Math.max(1, e.len), 0, 1))); }
function surfY(e, x, z, s) { return (e.bridge ? 0 : e.h0 != null ? 0 : terrainH(x, z)) + edgeH(e, s) + (e.kind === 'hill' ? 0.3 : 0.03); }
// a vertical wall from (x,z) along (dx,dz) for w metres, facing the right of travel
function wall(g, x, z, dx, dz, w, y0, y1, tile, uvw, uvh, col) { const x1 = x + dx * w, z1 = z + dz * w; g.quad([x, y0, z], [x1, y0, z1], [x1, y1, z1], [x, y1, z], [0, 0, uvw == null ? 1 : w / uvw, uvh == null ? 1 : (y1 - y0) / uvh], tile, col); }
// ---------- the roads ----------
function buildRoads() {
  for (const e of MAP.edges) {
    const ov = STYLE.toon ? 0.8 : 0, s0 = Math.max(0, Math.min(e.ta, e.len * 0.49) - (e.a.out && e.a.out.length > 1 ? ov : 0)), s1 = Math.min(e.len, e.len - Math.min(e.tb, e.len * 0.49) + (e.b.out && e.b.out.length > 1 ? ov : 0));
    if (s1 - s0 < 0.5) continue;
    const pts = polyCut(e.pts, s0, s1); if (pts.length < 2) continue;
    // long or sloping strips are subdivided so the height can follow the ground
    const fine = []; let acc = 0; const step = (e.ramp || e.tunnel || e.kind === 'hill' || e.bridge) ? 8 : 20;
    for (let i = 0; i + 1 < pts.length; i++) { const [ax, az] = pts[i], [bx, bz] = pts[i + 1], L = Math.hypot(bx - ax, bz - az), n = Math.max(1, Math.ceil(L / step)); for (let k = 0; k < n; k++) fine.push([ax + (bx - ax) * k / n, az + (bz - az) * k / n]); }
    fine.push(pts[pts.length - 1]);
    const off = polyOffsets(fine, e.w / 2), tile = T(e.K.tile), c = chunkAt(fine[Math.floor(fine.length / 2)][0], fine[Math.floor(fine.length / 2)][1]);   // (each quad goes into its own chunk below)
    let s = s0; const ys = [];
    for (let i = 0; i < fine.length; i++) { if (i) s += Math.hypot(fine[i][0] - fine[i - 1][0], fine[i][1] - fine[i - 1][1]); ys.push(surfY(e, fine[i][0], fine[i][1], s)); }
    s = s0;
    for (let i = 0; i + 1 < fine.length; i++) {
      const L0 = off.L[i], R0 = off.R[i], L1 = off.L[i + 1], R1 = off.R[i + 1], seg = Math.hypot(fine[i + 1][0] - fine[i][0], fine[i + 1][1] - fine[i][1]);
      chunkAt((fine[i][0] + fine[i + 1][0]) / 2, (fine[i][1] + fine[i + 1][1]) / 2).geo.quad([L0[0], ys[i], L0[1]], [R0[0], ys[i], R0[1]], [R1[0], ys[i + 1], R1[1]], [L1[0], ys[i + 1], L1[1]], [0, s / 10, 1, (s + seg) / 10], tile, null, [0, 1, 0]);
      s += seg;
    }
    e.strip = { pts: fine, off, ys };
    // the median of a boulevard: a raised strip with a kerb, broken near the junctions
    if (e.K.median && s1 - s0 > 30) buildMedian(e, c);
    if (e.bridge) buildBridge(e, c);
    if (e.tunnel) buildTunnel(e, c); else if (e.h0 != null && !e.bridge) buildViaduct(e, c);
    // the approaches: a crossing and a stop line at every lit junction
    for (const end of [0, 1]) { const n = end ? e.b : e.a; if (n.lit || n.ring) buildApproach(e, end, c); }
  }
  for (const n of MAP.nodes) buildJunction(n);
}
function buildApproach(e, end, c) {
  const t = end ? e.tb : e.ta, L = e.len, s0 = end ? L - t - 6 : t, s1 = end ? L - t : t + 6; if (s0 < 0 || s1 > L) return;
  const pts = polyCut(e.pts, s0, s1); if (pts.length < 2) return;
  const a = pts[0], b = pts[pts.length - 1], dx = b[0] - a[0], dz = b[1] - a[1], Ls = Math.hypot(dx, dz) || 1, ux = dx / Ls, uz = dz / Ls, nx = uz, nz = -ux, h = e.w / 2;
  const y = surfY(e, a[0], a[1], s0) + 0.004, tile = T('zebra'); c = chunkAt((a[0] + b[0]) / 2, (a[1] + b[1]) / 2);
  // the tile's v runs from the junction outward, u across the road once a metre
  const A = [a[0] + nx * h, y, a[1] + nz * h], B = [a[0] - nx * h, y, a[1] - nz * h], C = [b[0] - nx * h, y, b[1] - nz * h], D = [b[0] + nx * h, y, b[1] + nz * h];
  c.top.quad(A, B, C, D, end ? [0, 1, e.w, 0] : [0, 0, e.w, 1], tile, null, [0, 1, 0]);
}
function buildJunction(n) {
  if (n.out.length < 2 && !n.ring) return;
  const pts = [];
  if (n.ring) { for (let k = 0; k < 24; k++) pts.push([n.x + Math.cos(k / 24 * TAU) * 46, n.z + Math.sin(k / 24 * TAU) * 46]); }
  else for (const o of n.out) { const e = o.e, d = o.dir > 0 ? [e.pts[1][0] - e.pts[0][0], e.pts[1][1] - e.pts[0][1]] : [e.pts[e.pts.length - 2][0] - e.pts[e.pts.length - 1][0], e.pts[e.pts.length - 2][1] - e.pts[e.pts.length - 1][1]], L = Math.hypot(d[0], d[1]) || 1, ux = d[0] / L, uz = d[1] / L, h = e.w / 2, t = Math.min(o.trim, e.len * 0.49); pts.push([n.x + ux * t + uz * h, n.z + uz * t - ux * h], [n.x + ux * t - uz * h, n.z + uz * t + ux * h]); }
  const hull = convexHull(pts); if (hull.length < 3) return;
  const c = chunkAt(n.x, n.z), y = (n.h || 0) + (n.h ? 0 : terrainH(n.x, n.z)) + 0.02;
  c.top.fan(hull, y, T('asph'), 4);
  if (n.ring) { const isl = []; for (let k = 0; k < 24; k++) isl.push([n.x + Math.cos(k / 24 * TAU) * 20, n.z + Math.sin(k / 24 * TAU) * 20]); c.top.fan(isl, y + 0.2, T('grass'), 4); for (let k = 0; k < 24; k++) { const a = isl[k], b = isl[(k + 1) % 24]; wall(c.geo, b[0], b[1], (a[0] - b[0]) / Math.hypot(a[0] - b[0], a[1] - b[1]), (a[1] - b[1]) / Math.hypot(a[0] - b[0], a[1] - b[1]), Math.hypot(a[0] - b[0], a[1] - b[1]), y, y + 0.2, T('kerb')); } addSolid({ x: n.x, z: n.z, r: 20, h: 0.3 }); }
}
function convexHull(pts) {
  const P = pts.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]); if (P.length < 3) return P;
  const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo = []; for (const p of P) { while (lo.length >= 2 && cross(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p); }
  const up = []; for (let i = P.length - 1; i >= 0; i--) { const p = P[i]; while (up.length >= 2 && cross(up[up.length - 2], up[up.length - 1], p) <= 0) up.pop(); up.push(p); }
  up.pop(); lo.pop(); return lo.concat(up);
}
function buildMedian(e, c) {
  const S = e.strip, pts = S.pts, hw = e.K.median / 2, tile = T('median'), kerb = T('kerb');
  const off = polyOffsets(pts, hw); let s = 0;
  const i0 = 1, i1 = pts.length - 2;   // the median stops short of the strip's ends, leaving the turning lanes
  if (i1 <= i0) return;
  for (let i = i0; i < i1; i++) {
    const L0 = off.L[i], R0 = off.R[i], L1 = off.L[i + 1], R1 = off.R[i + 1], y0 = S.ys[i] + 0.18, y1 = S.ys[i + 1] + 0.18, seg = Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]);
    const g = chunkAt((pts[i][0] + pts[i + 1][0]) / 2, (pts[i][1] + pts[i + 1][1]) / 2).geo;
    g.quad([L0[0], y0, L0[1]], [R0[0], y0, R0[1]], [R1[0], y1, R1[1]], [L1[0], y1, L1[1]], [0, s / 5, 1, (s + seg) / 5], tile, null, [0, 1, 0]);
    const dx = (pts[i + 1][0] - pts[i][0]) / seg, dz = (pts[i + 1][1] - pts[i][1]) / seg;
    wall(g, R0[0], R0[1], dx, dz, seg, y0 - 0.18, y0, kerb); wall(g, L1[0], L1[1], -dx, -dz, seg, y0 - 0.18, y0, kerb);
    s += seg;
  }
  // the ends of the median are capped
  for (const [i, dir] of [[i0, -1], [i1, 1]]) { const p = pts[i], q = pts[i + dir] || p; const dx = (q[0] - p[0]), dz = (q[1] - p[1]), L = Math.hypot(dx, dz) || 1; const ux = dx / L, uz = dz / L; wall(c.geo, p[0] - uz * hw * (dir > 0 ? -1 : 1), p[1] + ux * hw * (dir > 0 ? -1 : 1), uz * (dir > 0 ? 1 : -1), -ux * (dir > 0 ? 1 : -1), hw * 2, S.ys[i], S.ys[i] + 0.18, kerb); }
  // trees and lamps down the middle
  const r = mulberry(e.id * 7 + 3), d0 = Math.hypot(pts[1][0] - pts[0][0], pts[1][1] - pts[0][1]), d1 = polyLen(pts) - Math.hypot(pts[pts.length - 1][0] - pts[pts.length - 2][0], pts[pts.length - 1][1] - pts[pts.length - 2][1]);
  let t = d0 + 6;
  while (t < d1 - 6) { const p = polyAt(pts, t), y = S.ys[Math.min(S.ys.length - 1, p.i)] + 0.18; if (r() < 0.6) addProp(r() < 0.5 ? 'palm' + r.int(0, 1) : 'tree' + r.int(0, 2), p.x, p.z, { s: 0.8 + r() * 0.4, y }); else lampPost(p.x, p.z, p.yaw, true, y); t += 14 + r() * 8; }
  if (e.rd.tram) buildTram(e, c, off);
}
function polyAt(pts, s) { let acc = 0; for (let i = 0; i + 1 < pts.length; i++) { const L = Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]); if (acc + L >= s) { const t = (s - acc) / L; return { x: pts[i][0] + (pts[i + 1][0] - pts[i][0]) * t, z: pts[i][1] + (pts[i + 1][1] - pts[i][1]) * t, yaw: Math.atan2(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]), i }; } acc += L; } const p = pts[pts.length - 1]; return { x: p[0], z: p[1], yaw: 0, i: pts.length - 1 }; }
function buildTram(e, c, off) {
  const S = e.strip, pts = S.pts, steel = T('steel');
  for (let i = 1; i + 2 < pts.length; i++) { const seg = Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]), yaw = Math.atan2(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]); for (const o of [-0.72, 0.72]) { const nx = Math.cos(yaw), nz = -Math.sin(yaw); box(pts[i][0] + nx * o, S.ys[i] + 0.18, pts[i][1] + nz * o, yaw + Math.PI, 0.1, 0.08, seg, steel, steel, steel); } }
}
function buildBridge(e, c) {
  const S = e.strip, pts = S.pts, hw = e.w / 2, rail = T('steel'), conc = T('conc'), off = polyOffsets(pts, hw + 0.3);
  for (let i = 0; i + 1 < pts.length; i++) {
    const seg = Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]), yaw = Math.atan2(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]);
    for (const side of ['L', 'R']) { const p = off[side][i]; box(p[0], S.ys[i], p[1], yaw + Math.PI, 0.25, 1.1, seg, rail, rail, rail); }
    box(pts[i][0], S.ys[i] - 1.2, pts[i][1], yaw + Math.PI, e.w + 1, 1.2, seg, conc, conc, conc);
  }
  for (const side of ['L', 'R']) addSolidsAlong(off[side], 0.2);
}
function buildViaduct(e, c) {
  const S = e.strip, pts = S.pts, hw = e.w / 2, conc = T('conc'), kerb = T('kerb'), off = polyOffsets(pts, hw + 0.2), rampTops = MAP.roads.filter((rd) => rd.ramp).map((rd) => rd.pts[0]);
  for (let i = 0; i + 1 < pts.length; i++) {
    const seg = Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]), yaw = Math.atan2(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]), y = Math.min(S.ys[i], S.ys[i + 1]);
    // a ramp's foot merges into the road: its barriers and deck begin once it has risen a little; and the
    // motorway's barrier is left open where a ramp joins it
    const mx = (pts[i][0] + pts[i + 1][0]) / 2, mz = (pts[i][1] + pts[i + 1][1]) / 2, gap = !e.ramp && rampTops.some((q) => Math.hypot(q[0] - mx, q[1] - mz) < 36);
    if (y > 0.6 && !gap) for (const side of ['L', 'R']) { const p = off[side][i]; box(p[0], S.ys[i], p[1], yaw + Math.PI, 0.4, 1.0, seg, kerb, kerb, kerb); }
    if (y > 0.3) box(pts[i][0], y - 1.5, pts[i][1], yaw + Math.PI, e.w + 1, 1.5 + Math.abs(S.ys[i + 1] - S.ys[i]), seg, conc, conc, conc);
    if (i % 3 === 0 && y > 2) box(pts[i][0], terrainH(pts[i][0], pts[i][1]), pts[i][1], yaw, 2.2, y - 1.5, 2.2, conc, conc, conc);
  }
  for (const side of ['L', 'R']) for (let i = 0; i + 1 < pts.length; i++) { const mx = (pts[i][0] + pts[i + 1][0]) / 2, mz = (pts[i][1] + pts[i + 1][1]) / 2; if (Math.min(S.ys[i], S.ys[i + 1]) <= 0.6 || (!e.ramp && rampTops.some((q) => Math.hypot(q[0] - mx, q[1] - mz) < 36))) continue; addSolidsAlong([off[side][i], off[side][i + 1]], 0.5, { y0: Math.min(S.ys[i], S.ys[i + 1]) - 0.3, h: 1.6 }); }
}
// the tunnel: retaining walls down the open cuts, then walls and a roof once it is under the water
function buildTunnel(e, c) {
  const S = e.strip, pts = S.pts, hw = e.w / 2, conc = T('conc'), dark = T('ceil'), off = polyOffsets(pts, hw + 0.4);
  for (let i = 1; i + 2 < pts.length; i++) {   // the mouths stay open: no wall across the junction with the road outside
    const seg = Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]), yaw = Math.atan2(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]), y = Math.min(S.ys[i], S.ys[i + 1]), top = Math.max(S.ys[i], S.ys[i + 1]);
    const covered = y < TUN_COVER;
    // each piece is drawn a little longer than its segment, so the pieces overlap round a bend instead of leaving wedges
    const ux = Math.sin(yaw), uz = Math.cos(yaw);
    for (const side of ['L', 'R']) { const p = off[side][i], ground = Math.max(0.2, terrainH(p[0], p[1]) + 0.3); box(p[0] - ux * 0.4, y - 0.2, p[1] - uz * 0.4, yaw + Math.PI, 0.8, covered ? 5.6 : Math.max(1.2, ground - y + 0.4), seg + 0.8, conc, conc, conc, null, 4, 4); }
    if (covered) box(pts[i][0] - ux * 1.2, top + 5.2, pts[i][1] - uz * 1.2, yaw + Math.PI, e.w + 2.4, 0.6, seg + 2.4, dark, dark, conc, null, 4, 4);
    if (covered && i % 2 === 0) box(pts[i][0], top + 4.9, pts[i][1], yaw + Math.PI, 1.2, 0.3, 0.6, T('white'), T('white'), T('white'));
    for (const side of ['L', 'R']) addSolidsAlong([off[side][i], off[side][i + 1]], 0.4, { y0: y - 0.3, h: covered ? 6 : Math.max(1.5, terrainH(off[side][i][0], off[side][i][1]) - y + 0.7) });
  }
}
function addSolidsAlong(pts, hw, o) { for (let i = 0; i + 1 < pts.length; i++) { const dx = pts[i + 1][0] - pts[i][0], dz = pts[i + 1][1] - pts[i][1], L = Math.hypot(dx, dz); if (L < 0.5) continue; addSolid({ x: (pts[i][0] + pts[i + 1][0]) / 2, z: (pts[i][1] + pts[i + 1][1]) / 2, yaw: Math.atan2(dx, dz), hx: hw, hz: L / 2, y0: o && o.y0 != null ? o.y0 : null, h: o && o.h != null ? o.h : null }); } }
// ---------- the pavements: a ring round every block, with its kerb ----------
function buildPavements() {
  for (const f of MAP.faces) {
    if (!f.inner || f.kind === 'water' || f.kind === 'hill' || f.kind === 'none' || f.kind === 'bank') continue;
    const K = f.kerb, S = f.inner, n = K.length, tile = T('walk' + (f.area | 0) % 3), kerb = T('kerb');
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n, sw = f.swd[i]; if (sw < 0.5) continue;
      const a = K[i], b = K[j], c = S[j], d = S[i];
      const L = Math.hypot(b[0] - a[0], b[1] - a[1]); if (L < 0.3) continue;
      // in pieces where a tunnel's open cut crosses the pavement (the cut's mouth stays open)
      const runs = []; let run = null;
      for (let t = 0; t <= 1.0001; t += Math.min(1, 2 / L)) { const tt = Math.min(1, t), cut = inOpenCut(lerp(a[0], b[0], tt), lerp(a[1], b[1], tt), -11); if (!cut) { if (!run) { run = [tt, tt]; runs.push(run); } run[1] = tt; } else run = null; }
      for (const [t0, t1] of runs) {
        if (t1 - t0 < 0.02 / L * 2) continue;
        const A = [lerp(a[0], b[0], t0), lerp(a[1], b[1], t0)], B = [lerp(a[0], b[0], t1), lerp(a[1], b[1], t1)], Cc = [lerp(d[0], c[0], t1), lerp(d[1], c[1], t1)], D = [lerp(d[0], c[0], t0), lerp(d[1], c[1], t0)];
        const y = terrainH((A[0] + Cc[0]) / 2, (A[1] + Cc[1]) / 2) + 0.14, Lr = L * (t1 - t0), g = chunkAt((A[0] + Cc[0]) / 2, (A[1] + Cc[1]) / 2).geo;
        g.quad([A[0], y, A[1]], [B[0], y, B[1]], [Cc[0], y, Cc[1]], [D[0], y, D[1]], [0, 0, Lr / 4, sw / 4], tile, null, [0, 1, 0]);
        const dx = (b[0] - a[0]) / L, dz = (b[1] - a[1]) / L;
        wall(g, A[0], A[1], dx, dz, Lr, y - 0.14, y, kerb);
      }
    }
  }
}
// ---------- the houses ----------
const TH_W = [5, 6, 7];
function pickTH(r, dist, w) { const list = ATLAS.th.filter((t) => t.dist === dist && t.w === w * 10); return list[r.int(0, list.length - 1)]; }
function buildBlocks() {
  const r = mulberry(99); let houses = 0, bigs = 0, inner = 0;
  for (const f of MAP.faces) {
    if (!f.inner || f.kind !== 'city' || (typeof inIndustry === 'function' && inIndustry(f.cx, f.cz))) continue;
    const S = f.inner, n = S.length, dist = district(f.cx, f.cz);
    const reserve = 16;
    for (let i = 0; i < n; i++) {
      const a = S[i], b = S[(i + 1) % n], L = Math.hypot(b[0] - a[0], b[1] - a[1]); if (L < 9) continue;
      const dx = (b[0] - a[0]) / L, dz = (b[1] - a[1]) / L, nx = -dz, nz = dx;   // n points to the road (right of travel); houses face it
      const yaw = Math.atan2(nx, nz), e = f.eds[i], cls = e ? e.K.cls : 1, big = cls >= 2 && dist !== 'yancheng';
      if (e && e.K.nohouse) continue;
      const rowEnd = L - reserve, y0 = terrainH(a[0], a[1]) + 0.14;
      let s = 0, first = true, prevH = 0;
      while (s < rowEnd) {
        const rem = rowEnd - s;
        if (big && r() < (dist === 'bay' ? 0.6 : 0.3) && rem > 14) {
          const B = ATLAS.bigs[r.int(0, ATLAS.bigs.length - 1)]; if (B.w <= rem) {
            const cx = a[0] + dx * (s + B.w / 2), cz = a[1] + dz * (s + B.w / 2), depth = Math.min(18, 14 + r() * 4);
            if (!inLot(cx - nx * depth / 2, cz - nz * depth / 2, 2)) { bigBuilding(cx, y0, cz, yaw, B, depth, r, dist); boxSolid(cx, cz, yaw, B.w, depth); s += B.w + 0.3; bigs++; prevH = B.h; first = false; continue; }
          }
        }
        const w = TH_W[r.int(0, 2)]; if (w > rem) { if (rem >= 5 && !first) { /* a narrow gap: the alley */ } break; }
        const th = pickTH(r, dist, w); if (!th) break;
        const cx = a[0] + dx * (s + w / 2), cz = a[1] + dz * (s + w / 2), depth = 10 + r.int(0, 3) * 2;
        if (inLot(cx - nx * depth / 2, cz - nz * depth / 2, 2)) { s += w; continue; }
        const H = townhouse(cx, y0, cz, yaw, w, depth, th, r, dist, first, prevH);
        boxSolid(cx, cz, yaw, w, depth); s += w; houses++; first = false; prevH = H;
      }
      // the column at the end of the row
      if (!first) { const ex = a[0] + dx * s, ez = a[1] + dz * s; box(ex - dx * 0.25, y0, ez, yaw, 0.5, 4, 0.5, T('col' + r.int(0, 3)), T('col' + r.int(0, 3)), T('conc')); }
    }
    inner += fillInterior(f, r, dist);
  }
  CITY.stats.houses = houses; CITY.stats.bigs = bigs; CITY.stats.inner = inner;
}
function townhouse(cx, y0, cz, yaw, w, depth, th, r, dist, first, prevH) {
  const floors = th.floors, H = 4 + (floors - 1) * 3.4 + 0.5 + (r() - 0.5) * 0.3, tint = [0.92 + r() * 0.12, 0.92 + r() * 0.12, 0.92 + r() * 0.12];
  const sx = Math.sin(yaw), cz_ = Math.cos(yaw), ax = Math.cos(yaw), az = -Math.sin(yaw);   // facing (sx, cz_) toward the road; along the row (ax, az)
  const wallT = T('wall' + r.int(0, 7)), roofT = T(r() < 0.3 ? 'tin' + r.int(0, 2) : 'roof' + r.int(0, 3)), colT = T('col' + r.int(0, 3));
  // the upper floors, overhanging the arcade; the shop set back under them; a column at the house's start
  box(cx, y0 + 4, cz, yaw, w, H - 4, depth, T(th.name), wallT, roofT, tint, 4, 4);
  const shopList = ATLAS.shops[th.type] || ATLAS.shops.open, shop = T(shopList[r.int(0, shopList.length - 1)]);
  box(cx - sx * 3.4, y0, cz - cz_ * 3.4, yaw, w, 4, depth - 3.4, shop, wallT, T('ceil'), tint, 4, 4, w / 7);
  box(cx - ax * (w / 2 - 0.25), y0, cz - az * (w / 2 - 0.25), yaw, 0.5, 4, 0.5, colT, colT, T('conc'));
  // the roof: a tin shed on many, a water tank on most
  if (r() < 0.55) box(cx - sx * (depth * 0.35), y0 + H, cz - cz_ * (depth * 0.35), yaw, w - 1.2, 2.6, depth * 0.55, T('wall' + r.int(0, 7)), T('wall' + r.int(0, 7)), T('tin' + r.int(0, 2)), tint, 4, 4);
  if (r() < 0.7) { const tx = (r() - 0.5) * (w - 2), tz = 1.5 + r() * (depth - 4); box(cx + ax * tx - sx * tz, y0 + H, cz + az * tx - cz_ * tz, yaw, 1.1, 1.3, 1.1, T('tank'), T('tank'), T('steel')); }
  // a vertical signboard out over the pavement
  if (r() < 0.32 && H > 8) { const vs = T(ATLAS.vsigns[r.int(0, ATLAS.vsigns.length - 1)]), side = r() < 0.5 ? 1 : -1, px = cx + ax * side * (w / 2 - 0.5), pz = cz + az * side * (w / 2 - 0.5); box(px + sx * 0.65, y0 + 4.4, pz + cz_ * 0.65, yaw + Math.PI / 2, 1.2, Math.min(4, H - 4.8), 0.22, vs, vs, T('dark'), null, 0, 0); }
  // a scooter or two parked under the arcade's edge, and the odd potted plant
  if (r() < 0.5) addProp('scooter' + r.int(0, 3), cx + sx * 1.2 + ax * (r() - 0.5) * (w - 2), cz + cz_ * 1.2 + az * (r() - 0.5) * (w - 2), { flip: r() < 0.5, y: y0 });
  return H;
}
function bigBuilding(cx, y0, cz, yaw, B, depth, r, dist) {
  const sx = Math.sin(yaw), cz_ = Math.cos(yaw), ax = Math.cos(yaw), az = -Math.sin(yaw), H = B.h, wallT = T('wall' + r.int(0, 7)), roofT = T('roof' + r.int(0, 3));
  box(cx, y0 + 4, cz, yaw, B.w, H - 4, depth, T(B.name), B.style === 'glass' ? T('glass85') : wallT, roofT, null, B.style === 'glass' ? 4 : 4, 4);
  // shops along the ground floor behind the columns
  const nShop = Math.max(1, Math.round(B.w / 7)), sw = B.w / nShop, types = B.style === 'hotel' ? ['hotel'] : B.style === 'office' || B.style === 'glass' ? ['bank', 'cvs', 'tea', 'open', 'clinic'] : ['open', 'eat', 'tea', 'cvs', 'clinic', 'salon', 'ktv', 'class'];
  for (let k = 0; k < nShop; k++) {
    const t = types[r.int(0, types.length - 1)], list = ATLAS.shops[t] || ATLAS.shops.open, shop = T(list[r.int(0, list.length - 1)]), ox = (k + 0.5) * sw - B.w / 2;
    box(cx + ax * ox - sx * 3.4, y0, cz + az * ox - cz_ * 3.4, yaw, sw, 4, depth - 3.4, shop, wallT, T('ceil'), null, 4, 4, Math.min(1, sw / 7));
    box(cx + ax * (ox - sw / 2 + 0.3), y0, cz + az * (ox - sw / 2 + 0.3), yaw, 0.6, 4, 0.6, T('conc'), T('conc'), T('conc'));
  }
  if (r() < 0.5) box(cx - sx * depth * 0.5, y0 + H + 2, cz - cz_ * depth * 0.5, yaw, Math.min(12, B.w - 2), 4, 0.3, T('bb' + r.int(0, 5)), T('dark'), T('dark'), null, 0, 0);
  for (let k = 0; k < 2; k++) box(cx + ax * (r() - 0.5) * (B.w - 3) - sx * (2 + r() * (depth - 4)), y0 + H, cz + az * (r() - 0.5) * (B.w - 3) - cz_ * (2 + r() * (depth - 4)), yaw, 1.4, 1.6, 1.4, T('tank'), T('tank'), T('steel'));
  if (r() < 0.3 && B.style !== 'glass') { const vs = T(ATLAS.vsigns[r.int(0, ATLAS.vsigns.length - 1)]); box(cx + ax * (B.w / 2 - 0.6) + sx * 0.7, y0 + 5, cz + az * (B.w / 2 - 0.6) + cz_ * 0.7, yaw + Math.PI / 2, 1.3, 6, 0.25, vs, vs, T('dark'), null, 0, 0); }
}
// the middle of a block: low houses in rows, seen only from above or down the alleys
function fillInterior(f, r, dist) {
  const inner = offsetPoly(f.inner, f.inner.map(() => 17)); if (!inner) return 0;
  let x0 = 1e9, z0 = 1e9, x1 = -1e9, z1 = -1e9; for (const p of inner) { x0 = Math.min(x0, p[0]); z0 = Math.min(z0, p[1]); x1 = Math.max(x1, p[0]); z1 = Math.max(z1, p[1]); }
  if (x1 - x0 < 10 || z1 - z0 < 10) return 0;
  let n = 0; const wallT = T('wall' + r.int(0, 7));
  for (let z = z0 + 5; z < z1 - 4; z += 9) for (let x = x0 + 5; x < x1 - 4; x += 8) {
    if (r() < 0.25 || !pointInPoly(inner, x, z) || !pointInPoly(inner, x + 6, z + 7) || inLot(x, z, 4) || inLot(x + 6, z + 7, 4)) continue;
    const h = 3.4 * (2 + r.int(0, 2)) + 0.5, w = 6 + r() * 2, d = 7 + r() * 2;
    box(x + w / 2, terrainH(x, z), z + d, 0, w, h, d, T('wall' + r.int(0, 7)), wallT, T(r() < 0.5 ? 'tin' + r.int(0, 2) : 'roof' + r.int(0, 3)), null, 4, 4);
    addSolid({ x: x + w / 2, z: z + d / 2, yaw: 0, hx: w / 2, hz: d / 2, y0: terrainH(x, z), h: h + 0.5 }); n++;
  }
  return n;
}
// ---------- street furniture ----------
function lampPost(x, z, yaw, dbl, y) {
  const y0 = y == null ? terrainH(x, z) + 0.14 : y, pole = T('grey'), lamp = T('white');
  box(x, y0, z, yaw, 0.22, 7.5, 0.22, pole, pole, pole);
  const ax = Math.cos(yaw), az = -Math.sin(yaw);
  for (const side of dbl ? [-1, 1] : [1]) CITY.lamps.push({ x: x + ax * side * 2.0, y: y0 + 6.9, z: z + az * side * 2.0 });
  for (const side of dbl ? [-1, 1] : [1]) { box(x + ax * side * 1.1, y0 + 7.2, z + az * side * 1.1, yaw, 2.2, 0.16, 0.16, pole, pole, pole); box(x + ax * side * 2.0, y0 + 7.0, z + az * side * 2.0, yaw, 0.7, 0.25, 0.35, lamp, lamp, pole); }
  addSolid({ x, z, r: 0.25, h: 0.6 });
}
function buildFurniture() {
  const r = mulberry(1234);
  for (const e of MAP.edges) {
    if (e.lvl || e.ramp || e.tunnel || !e.strip || e.K.cls < 1 || e.kind === 'rural') continue;
    const S = e.strip, pts = S.pts, L = polyLen(pts), hw = e.w / 2, sw = e.K.sw;
    // lamps alternate sides down the street; trees between them on the wider roads; scooters along the kerb
    for (let s = STYLE.toon ? 7 : 12, k = 0; s < L - 6; s += STYLE.toon ? 19 : 26, k++) {
      const p = polyAt(pts, s), side = e.K.cls >= 3 ? 0 : (k % 2 ? 1 : -1), nx = Math.cos(p.yaw), nz = -Math.sin(p.yaw);
      if (e.K.cls < 3) { const x = p.x + nx * (hw + 0.6) * side, z = p.z + nz * (hw + 0.6) * side; if (!inLot(x, z)) lampPost(x, z, p.yaw + (side > 0 ? Math.PI / 2 : -Math.PI / 2), false); }
      else for (const sd of [-1, 1]) { const x = p.x + nx * (hw + 0.6) * sd, z = p.z + nz * (hw + 0.6) * sd; if (!inLot(x, z)) lampPost(x, z, p.yaw + (sd > 0 ? Math.PI / 2 : -Math.PI / 2), false); }
      if (e.K.cls >= 2 && sw >= 4) for (const sd of [-1, 1]) if (r() < 0.8) { const x = p.x + nx * (hw + 1.4) * sd + Math.sin(p.yaw) * 10, z = p.z + nz * (hw + 1.4) * sd + Math.cos(p.yaw) * 10; if (!inLot(x, z)) addProp('tree' + r.int(0, 2), x, z, { s: 0.7 + r() * 0.4 }); }
    }
    for (let s = 6; s < L - 6; s += 9) if (r() < 0.45) { const p = polyAt(pts, s), sd = r() < 0.5 ? 1 : -1, nx = Math.cos(p.yaw), nz = -Math.sin(p.yaw), n = r.int(1, 4); for (let k = 0; k < n; k++) { const x = p.x + nx * (hw + 1.0) * sd + Math.sin(p.yaw) * k * 1.1, z = p.z + nz * (hw + 1.0) * sd + Math.cos(p.yaw) * k * 1.1; if (!inLot(x, z)) addProp('scooter' + r.int(0, 3), x, z, { flip: sd > 0 }); } }
    // bus stops on the boulevards
    if (e.K.cls >= 2 && L > 80 && r() < 0.5) { const p = polyAt(pts, L * 0.6), sd = r() < 0.5 ? 1 : -1, nx = Math.cos(p.yaw), nz = -Math.sin(p.yaw), x = p.x + nx * (hw + 2.2) * sd, z = p.z + nz * (hw + 2.2) * sd; if (!inLot(x, z)) busStop(x, z, p.yaw + (sd > 0 ? -Math.PI / 2 : Math.PI / 2)); }
  }
  // traffic lights at every lit junction, one for each approach, across the junction on the driver's right
  for (const n of MAP.nodes) if (n.lit) for (const o of n.out) signal(n, o);
  // the betel-nut stalls on some corners
  for (const n of MAP.nodes) if (n.lit && r() < 0.12) { const o = n.out[r.int(0, n.out.length - 1)], e = o.e, d = o.dir > 0 ? [e.pts[1][0] - e.pts[0][0], e.pts[1][1] - e.pts[0][1]] : [e.pts[e.pts.length - 2][0] - e.pts[e.pts.length - 1][0], e.pts[e.pts.length - 2][1] - e.pts[e.pts.length - 1][1]], L = Math.hypot(d[0], d[1]) || 1, ux = d[0] / L, uz = d[1] / L, x = n.x + ux * (o.trim + 9) + uz * (e.w / 2 + 1.8), z = n.z + uz * (o.trim + 9) - ux * (e.w / 2 + 1.8); if (!inLot(x, z)) betelStall(x, z, Math.atan2(-uz, ux), r); }
}
const BUSSTOPS = [];
function busStop(x, z, yaw) { BUSSTOPS.push({ x, z, yaw }); const y0 = terrainH(x, z) + 0.14, st = T('steel'), wh = T('white'); box(x, y0, z, yaw, 4, 0.1, 1.6, st, st, st); box(x, y0 + 2.4, z, yaw, 4.2, 0.2, 1.8, wh, wh, T('blue')); for (const s of [-1.9, 1.9]) { const ax = Math.cos(yaw), az = -Math.sin(yaw); box(x + ax * s, y0, z + az * s, yaw, 0.12, 2.4, 0.12, st, st, st); } box(x, y0 + 0.4, z, yaw, 3.6, 0.5, 0.5, T('green'), T('green'), T('green')); addSolid({ x, z, r: 1.4, h: 2.6 }); }
function betelStall(x, z, yaw, r) { const y0 = terrainH(x, z) + 0.14, t = T('betel' + r.int(0, 2)); box(x, y0, z, yaw, 2.6, 2.6, 2.0, t, T('steel'), T('tin1')); addSolid({ x, z, r: 1.6, h: 2.8 }); }
function signal(n, o) {
  const e = o.e, d = o.dir > 0 ? [e.pts[1][0] - e.pts[0][0], e.pts[1][1] - e.pts[0][1]] : [e.pts[e.pts.length - 2][0] - e.pts[e.pts.length - 1][0], e.pts[e.pts.length - 2][1] - e.pts[e.pts.length - 1][1]], L = Math.hypot(d[0], d[1]) || 1;
  const ox = d[0] / L, oz = d[1] / L;            // out of the junction along this edge
  const ux = -ox, uz = -oz, rx_ = -uz, rz_ = ux;   // the approaching driver's heading and right-hand side
  const far = Math.min(o.trim, 30) + 1.0, px = n.x + ux * far + rx_ * (e.w / 2 + 0.9), pz = n.z + uz * far + rz_ * (e.w / 2 + 0.9), y0 = terrainH(px, pz) + 0.14;
  const pole = T('grey'), dark = T('dark'), yawArm = Math.atan2(-rz_, rx_);   // a box whose width runs along r: the arm reaches left over the road
  box(px, y0, pz, yawArm, 0.25, 6.2, 0.25, pole, pole, pole);
  const armL = e.w / 2 + 1.0; box(px - rx_ * armL / 2, y0 + 5.7, pz - rz_ * armL / 2, yawArm, armL, 0.16, 0.16, pole, pole, pole);
  const hx = px - rx_ * (armL - 0.6), hz = pz - rz_ * (armL - 0.6), yawHead = Math.atan2(-ux, -uz);   // the head faces the approaching driver
  box(hx, y0 + 5.0, hz, yawHead, 1.15, 0.4, 0.3, dark, dark, dark);
  // the lamps: red on the driver's left, then yellow, then green; billboards a little in front of the head
  const lamps = []; for (let k = 0; k < 3; k++) { const off = (k - 1) * 0.36; lamps.push(addProp('lamp_off', hx + rx_ * off - ux * 0.17, hz + rz_ * off - uz * 0.17, { y: y0 + 5.03, solid: false })); }
  // the countdown display under the head
  box(hx, y0 + 4.45, hz, yawHead, 0.7, 0.5, 0.25, dark, dark, dark);
  // the road's name on the pole
  if (e.rd.name && ATLAS.tiles['rn_' + e.rd.name]) box(px + rx_ * 0.2, y0 + 3.0, pz + rz_ * 0.2, yawHead, 1.6, 0.4, 0.06, T('rn_' + e.rd.name), T('green'), T('green'), null, 0, 0);
  addSolid({ x: px, z: pz, r: 0.3, h: 0.6 });
  // which phase this approach belongs to: edges within 45° of the node's first out are phase 0
  const a0 = n.out[0].ang, dAng = Math.abs(angWrap(o.ang - a0)), phase = (dAng < Math.PI / 4 || dAng > 3 * Math.PI / 4) ? 0 : 1;
  CITY.signals.push({ node: n, edge: e, dir: o.dir, phase, lamps, x: hx, z: hz, y: y0 + 4.45, rx: rx_, rz: rz_, ux, uz });
}
// ---------- build it all ----------
function buildCity() {
  const t0 = performance.now();
  buildLandmarkLots();
  buildRoads(); buildPavements(); buildBlocks(); buildFurniture(); buildLandmarks(); buildNature();
  CITY.stats.ms = Math.round(performance.now() - t0);
  let boxes = 0, quads = 0; for (const c of CITY.chunks.values()) { boxes += c.boxes.n; quads += (c.geo.nv + c.top.nv) / 4; } CITY.stats.boxes = boxes; CITY.stats.quads = quads; CITY.stats.chunks = CITY.chunks.size;
}
// ---------- the lights' cycle: two phases of green with a yellow and an all-red between, each junction on its own clock ----------
const SIG_CYCLE = 64, SIG_GREEN = 27, SIG_YELLOW = 3, SIG_RED = 2;
function signalState(n, phase) {
  const t = (G.t + (n.id % 17) * 3.7) % SIG_CYCLE, half = SIG_CYCLE / 2, u = phase === 0 ? t : (t + half) % SIG_CYCLE;
  if (u < SIG_GREEN) return 'green'; if (u < SIG_GREEN + SIG_YELLOW) return 'yellow'; return 'red';
}
// seconds left in the present state of a signal
function signalRemain(n, phase) {
  const t = (G.t + (n.id % 17) * 3.7) % SIG_CYCLE, half = SIG_CYCLE / 2, u = phase === 0 ? t : (t + half) % SIG_CYCLE;
  if (u < SIG_GREEN) return SIG_GREEN - u; if (u < SIG_GREEN + SIG_YELLOW) return SIG_GREEN + SIG_YELLOW - u; return SIG_CYCLE - u;
}
function signalsUpdate() {
  for (const s of CITY.signals) {
    const st = signalState(s.node, s.phase); if (st === s.state) continue; s.state = st;
    propSetKind(s.lamps[0], st === 'red' ? 'lamp_red' : 'lamp_off'); propSetKind(s.lamps[1], st === 'yellow' ? 'lamp_yellow' : 'lamp_off'); propSetKind(s.lamps[2], st === 'green' ? 'lamp_green' : 'lamp_off');
  }
}
