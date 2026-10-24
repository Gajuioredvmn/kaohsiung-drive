// ===================== solids: little 3D models of vehicles, painted face by face in flat pixel tones =====================
// A solid is a list of parts; each part is a loft through convex cross-sections along z (forward +), in metres,
// with the origin on the ground under the rear axle. Faces take a flat tone from which way they look (top, side,
// rear, underside); details (lamps, glass, plates) are extra polygons on the faces. One camera, one yaw, one Pix out.
// Nothing is lit: the tones are a palette, the way sprite artists coloured cars, and the outline closes the shape.
function solidPal(col) {
  const pale = ((col >> 16) & 255) + ((col >> 8) & 255) + (col & 255) > 600;
  return pale ? [0x40465a, 0x6c7284, 0x9aa0ae, col, mixHex(col, 0xffffff, 0.6), 0xffffff]
    : [shadeHex(col, 0.4), shadeHex(col, 0.6), shadeHex(col, 0.82), col, mixHex(col, 0xffffff, 0.3), mixHex(col, 0xffffff, 0.6)];
}
// a rectangular cross-section: pts run bottom-left, bottom-right, top-right, top-left (counter-clockwise, y up)
function rectSec(z, hw, y0, y1, o) { o = o || {}; const r = Math.min(o.r || 0, hw, (y1 - y0) / 2); return { z, pts: [[-hw + r, y0], [hw - r, y0], [hw, y0 + r], [hw, y1 - r], [hw - r, y1], [-hw + r, y1], [-hw, y1 - r], [-hw, y0 + r]] }; }
// a box from z0 to z1
function boxPart(hw, y0, y1, z0, z1, col, o) { return Object.assign({ secs: [rectSec(z0, hw, y0, y1, o), rectSec(z1, hw, y0, y1, o)], col }, o || {}); }
function solidRender(model, o) {
  // o: { yaw, D, H, ppm, W, Hpx, gy, outline }  model: { parts: [...], extras: [fn(ctx)], tyres: [...] }
  const px = new Pix(o.W, o.Hpx), cx = o.W / 2, cy = Math.cos(o.yaw), sy = Math.sin(o.yaw), f = o.ppm * o.D, Y0s = o.gy - (o.H * f) / o.D, PV = o.pivot || 0;
  const pr = (x, y, z) => { const X = x * cy + (z - PV) * sy, d = -x * sy + (z - PV) * cy + o.D; return [cx + (X * f) / d, Y0s - ((y - o.H) * f) / d, d]; };
  // the camera in model space: behind the pivot by D along the view, up H
  const cam = { x: o.D * sy, y: o.H, z: PV - o.D * cy };
  const angled = Math.abs(sy) > 0.02;
  const flat = (q) => { const r = []; for (const p of q) r.push(p[0], p[1]); return r; };
  const items = [];
  const face = (pts3, col, L, force) => {
    // outward normal from the winding; cull faces looking away from the camera
    const [a, b, c] = pts3;
    const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
    let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    const mx = (a[0] + c[0]) / 2, my = (a[1] + c[1]) / 2, mz = (a[2] + c[2]) / 2;
    if (!force && nx * (cam.x - mx) + ny * (cam.y - my) + nz * (cam.z - mz) <= 0) return;
    const q = pts3.map((p) => pr(p[0], p[1], p[2]));
    let d = 0; for (const p of q) d += p[2]; d /= q.length;
    items.push({ d, L: L || 1, draw: () => px.poly(flat(q), col) });
    return q;
  };
  const tone = (n, P, part) => {
    const [nx, ny, nz] = n;
    if (part.glass) return ny > 0.5 ? part.glass[1] : part.glass[0];
    if (ny < -0.3) return P[0];
    if (ny > 0.8) return P[4];
    if (nz < -0.55) return ny > 0.3 ? P[4] : P[3];
    if (nz > 0.55) return ny > 0.3 ? P[4] : P[2];
    if (ny > 0.3) return nx < 0 ? P[5] : P[3];
    return nx < 0 ? P[2] : P[1];
  };
  const normal = (pts3, cen) => {
    const [a, b, c] = pts3, ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
    let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    const mx = (a[0] + c[0]) / 2 - cen[0], my = (a[1] + c[1]) / 2 - cen[1], mz = (a[2] + c[2]) / 2 - cen[2];
    if (nx * mx + ny * my + nz * mz < 0) { nx = -nx; ny = -ny; nz = -nz; }
    const l = Math.hypot(nx, ny, nz) || 1; return [nx / l, ny / l, nz / l];
  };
  for (const part of model.parts) {
    const P = part.pal || solidPal(part.col), S = part.secs;
    // the part's centre, to orient normals outward
    let cxm = 0, cym = 0, czm = 0, n = 0; for (const s of S) for (const p of s.pts) { cxm += p[0]; cym += p[1]; czm += s.z; n++; } const cen = [cxm / n, cym / n, czm / n];
    const quads = [];
    for (let k = 0; k + 1 < S.length; k++) {
      const a = S[k], b = S[k + 1], m = a.pts.length;
      for (let e = 0; e < m; e++) {
        const e2 = (e + 1) % m;
        if (part.open && part.open(k, e)) continue;
        quads.push([[a.pts[e][0], a.pts[e][1], a.z], [a.pts[e2][0], a.pts[e2][1], a.z], [b.pts[e2][0], b.pts[e2][1], b.z], [b.pts[e][0], b.pts[e][1], b.z]]);
      }
    }
    if (!part.noCaps) {
      const a = S[0], b = S[S.length - 1];
      quads.push(a.pts.map((p) => [p[0], p[1], a.z]).reverse());
      quads.push(b.pts.map((p) => [p[0], p[1], b.z]));
    }
    for (const q of quads) {
      const nrm = normal(q, cen);
      // make the winding face outward, then let face() cull by the camera
      const [a, b, c] = q, ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
      const wx = uy * vz - uz * vy, wy = uz * vx - ux * vz, wz = ux * vy - uy * vx;
      const ordered = (wx * nrm[0] + wy * nrm[1] + wz * nrm[2]) >= 0 ? q : q.slice().reverse();
      face(ordered, part.tone ? part.tone(nrm, P) : tone(nrm, P, part), part.L || 1);
    }
  }
  // tyres: octagonal drums
  // in an angled view the wheels on the camera's side go over the body, as if seen in their arches; the far ones stay under
  const tyre = (t) => {
    const R = t.R, w = t.w, n = 8, ang = [];
    const near = angled && t.x !== 0 && Math.sign(t.x) === Math.sign(cam.x), TL = near ? 2 : 0;
    for (let k = 0; k < n; k++) ang.push(((k + 0.5) / n) * TAU);
    const ring = (x) => ang.map((a) => [x, R + Math.sin(a) * R, t.z + Math.cos(a) * R]);
    const A = ring(t.x - w / 2), B = ring(t.x + w / 2);
    for (let k = 0; k < n; k++) { const k2 = (k + 1) % n, ny = Math.sin(((k + 1) / n) * TAU), col = ny > 0.5 ? 0x4e4e5a : ny > -0.2 ? 0x3a3a46 : 0x26262e; face([A[k], B[k], B[k2], A[k2]], col, TL); face([A[k2], B[k2], B[k], A[k]], col, TL); }
    for (const [ring2, sx] of [[A, -1], [B, 1]]) {
      const q = ring2.map((p) => pr(p[0], p[1], p[2]));
      const outer = t.x === 0 || sx === Math.sign(t.x), toward = angled && outer && sx * (cam.x - (t.x + sx * w / 2)) > 0;
      if (!toward) continue;
      let d = 0; for (const p of q) d += p[2]; d /= q.length;
      items.push({ d: d - 0.02, L: TL, draw: () => { px.poly(flat(q), 0x18181c); const hub = ring2.map((p) => pr(p[0], R + (p[1] - R) * 0.55, t.z + (p[2] - t.z) * 0.55)); px.poly(flat(hub), t.rim || 0xb8bcc2); } });
    }
  };
  for (const t of model.tyres || []) tyre(t);
  // the shadow, under everything
  if (model.shadow) { const s = model.shadow; px.poly(flat([pr(-s.hw, 0, s.z0), pr(s.hw, 0, s.z0), pr(s.hw, 0, s.z1), pr(-s.hw, 0, s.z1)]), 0x110e18); }
  // extras: details drawn at a given depth; they get { pr, px, face, items, flat }
  const ctx = { pr, px, face, items, flat, cam, lights: [] };
  for (const ex of model.extras || []) ex(ctx);
  items.sort((u, v) => (u.L - v.L) || (v.d - u.d));
  for (const it of items) it.draw();
  if (o.outline !== false) px.outline(o.outline == null ? 0x140a1a : o.outline);
  return { px, lights: ctx.lights };
}
// a flat detail polygon on a face: points in (x, y, z), drawn at its own depth (slightly toward the camera)
function detail(ctx, pts3, col, bias) {
  const q = pts3.map((p) => ctx.pr(p[0], p[1], p[2]));
  let d = 0; for (const p of q) d += p[2]; d /= q.length;
  ctx.items.push({ d: d - (bias == null ? 0.01 : bias), L: 1, draw: () => ctx.px.poly(ctx.flat(q), col) });
  return q;
}
// a rectangle on the rear face (z = zr) or front face: u across, v up
function plate(ctx, z, u0, u1, v0, v1, col, bias) { return detail(ctx, [[u0, v0, z], [u1, v0, z], [u1, v1, z], [u0, v1, z]], col, bias); }
// record the screen box of a lamp so it can glow
function lampBox(ctx, q) { let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; for (const p of q) { x0 = Math.min(x0, p[0]); y0 = Math.min(y0, p[1]); x1 = Math.max(x1, p[0]); y1 = Math.max(y1, p[1]); } ctx.lights.push([Math.round(x0), Math.round(y0), Math.max(1, Math.round(x1 - x0)), Math.max(1, Math.round(y1 - y0))]); }
