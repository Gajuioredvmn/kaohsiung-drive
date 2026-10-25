// ===================== people: walkers on the pavements, crossing at the lights, stepping out of the car's way =====================
// Every block's pavement is a loop; walkers stroll round it either way. At a lit junction a crossing joins the loops on
// either side of each road; a walker at its end crosses when that road's traffic has the red. A car bearing down
// makes them hop aside (and if it does hit one, they are knocked over, lie there a moment, and get up).
// per: one walker to so many metres of pavement at most; seen: how far off one may appear in view (fading in)
const PEO = { loops: [], crossings: [], list: [], max: 380, near: 170, far: 220, per: 12, seen: 80, spawnT: 0, stats: {}, cand: null };
function buildWalkways() {
  for (const f of MAP.faces) {
    if (!f.kerb || !f.inner || f.kind === 'water' || f.kind === 'hill' || f.kind === 'none' || f.kind === 'bank') continue;
    const mid = offsetPoly(f.kerb, f.swd.map((w) => Math.max(0.5, w / 2))); if (!mid) continue;
    const pts = mid.slice(); pts.push(mid[0]);
    const loop = { pts, len: polyLen(pts), face: f, id: PEO.loops.length, people: 0 }; PEO.loops.push(loop); f.walk = loop;
  }
  // crossings: at every lit junction, across each road at its zebra, from pavement to pavement
  for (const n of MAP.nodes) {
    if (!n.lit) continue;
    for (const o of n.out) {
      const e = o.e, d = o.dir > 0 ? [e.pts[1][0] - e.pts[0][0], e.pts[1][1] - e.pts[0][1]] : [e.pts[e.pts.length - 2][0] - e.pts[e.pts.length - 1][0], e.pts[e.pts.length - 2][1] - e.pts[e.pts.length - 1][1]], L = Math.hypot(d[0], d[1]) || 1, ux = d[0] / L, uz = d[1] / L;
      const t = Math.min(o.trim, e.len * 0.49) + 3, cx = n.x + ux * t, cz = n.z + uz * t, hw = e.w / 2 + e.K.sw / 2, nx = -uz, nz = ux;
      const A = [cx + nx * hw, cz + nz * hw], B = [cx - nx * hw, cz - nz * hw];
      const la = loopNear(A[0], A[1]), lb = loopNear(B[0], B[1]); if (!la || !lb) continue;
      const c = { id: PEO.crossings.length, A, B, la, lb, sa: la.s, sb: lb.s, node: n, e, phase: null, len: Math.hypot(B[0] - A[0], B[1] - A[1]) };
      const q = n.out.find((x) => x.e === e), a0 = n.out[0].ang, dAng = Math.abs(angWrap(q.ang - a0)); c.phase = (dAng < Math.PI / 4 || dAng > 3 * Math.PI / 4) ? 0 : 1;
      PEO.crossings.push(c); (la.loop.cross = la.loop.cross || []).push({ c, end: 'A', s: la.s }); (lb.loop.cross = lb.loop.cross || []).push({ c, end: 'B', s: lb.s });
    }
  }
  PEO.stats.loops = PEO.loops.length; PEO.stats.crossings = PEO.crossings.length;
}
// the nearest pavement loop point to a spot (within 6 m)
function loopNear(x, z) {
  let best = null;
  for (const l of PEO.loops) { const f = l.face; if (x < f.cx - 400 || x > f.cx + 400 || z < f.cz - 400 || z > f.cz + 400) continue; const n = nearestOnPts(l.pts, x, z); if (n.d < 6 && (!best || n.d < best.d)) best = { loop: l, s: n.s, d: n.d, x: n.x, z: n.z }; }
  return best;
}
function walkSignal(c) { return signalState(c.node, c.phase) === 'red'; }   // the road's traffic is held: walk
const _pr = mulberry(777);
function spawnWalker(r) {
  const C = plr(), K = (PEO.cand = nearCands(PEO.loops, PEO.near + 40, PEO.cand, 20)); if (!K.list.length) return; let tries = 0;
  while (tries++ < 10) {
    const l = candPick(K, r); if (l.people >= 1 + l.len / PEO.per) continue;
    const s = r() * l.len, p = polyAt(l.pts, s), d = Math.hypot(p.x - C.x, p.z - C.z); if (d < 25 || d > PEO.near) continue;
    let fade = false;
    if (R3.cam && G.mode === 'drive' && G.t > 1) { const dx = p.x - R3.cam.position.x, dz = p.z - R3.cam.position.z, L = Math.hypot(dx, dz) || 1; if ((dx * Math.sin(CAMV.az) + dz * Math.cos(CAMV.az)) / L > 0.5) { if (d < PEO.seen) continue; fade = true; } }
    const w = { loop: l, s, dir: r() < 0.5 ? 1 : -1, v: 1.0 + r() * 0.7, kind: 'person' + r.int(0, STYLE.toon ? TPEOPLE.length - 1 : 7), x: p.x, z: p.z, y: 0, yaw: 0, side: (r() - 0.5) * 1.6, cross: null, cs: 0, wait: 0, knocked: 0, dodge: 0, anim: r() * 10, id: Math.random() };
    if (fade) w.born = G.t;
    l.people++; PEO.list.push(w); walkerPose(w); return w;
  }
}
function walkerPose(w) {
  if (w.cross) { const c = w.cross, t = clamp(w.cs / c.len, 0, 1), fx = w.cend === 'A' ? c.A : c.B, tx = w.cend === 'A' ? c.B : c.A; w.x = lerp(fx[0], tx[0], t); w.z = lerp(fx[1], tx[1], t); w.yaw = Math.atan2(tx[0] - fx[0], tx[1] - fx[1]); }
  else { const p = pathAt(w.loop, w.s), rx_ = Math.cos(p.yaw), rz_ = -Math.sin(p.yaw); w.x = p.x + rx_ * w.side; w.z = p.z + rz_ * w.side; w.yaw = w.dir > 0 ? p.yaw : p.yaw + Math.PI; }
  if (w.knocked > 0 && w.ko) { w.x += w.ko[0]; w.z += w.ko[1]; } else if (w.ko && !(w.knocked > 0)) w.ko = null;   // knocked back a step, while down
  if (!(Math.abs(w.x - w.gx) + Math.abs(w.z - w.gz) < 1)) { w.y = terrainH(w.x, w.z) + 0.14; w.gx = w.x; w.gz = w.z; }   // (the ground again only every metre)
}
function peopleTick(dt) {
  const C = CAR, P = plr(), r = _pr, driving = !HERO.on;
  PEO.spawnT -= dt; if (PEO.list.length < PEO.max && PEO.spawnT <= 0) { PEO.spawnT = 0.05; spawnWalker(r); }
  const pv = Math.hypot(C.vx, C.vy), hx = Math.sin(C.yaw), hz = Math.cos(C.yaw);
  for (let i = PEO.list.length - 1; i >= 0; i--) {
    const w = PEO.list[i], px_ = w.x - P.x, pz_ = w.z - P.z, dx = w.x - C.x, dz = w.z - C.z, d2 = dx * dx + dz * dz;
    if (px_ * px_ + pz_ * pz_ > PEO.far * PEO.far) { w.loop.people--; PEO.list.splice(i, 1); continue; }
    const fleeing = w.flee > 0;
    w.anim += dt * ((fleeing ? 3.6 : w.v) + 1);
    if (w.knocked > 0) { w.knocked -= dt; walkerPose(w); continue; }
    // running from trouble: along the pavement, away from it, fast
    if (fleeing) {
      w.flee -= dt; w.wait = 0; w.dodge = 0;
      if (w.cross) { w.cs += 3.6 * dt; if (w.cs >= w.cross.len) { const c = w.cross, to = w.cend === 'A' ? c.lb : c.la; w.loop.people--; w.loop = to.loop; w.loop.people++; w.s = to.s; w.cross = null; } walkerPose(w); continue; }
      if (w.fleeDir == null) { const p = pathAt(w.loop, w.s), tx = Math.sin(p.yaw), tz = Math.cos(p.yaw); w.fleeDir = (w.x - w.fx) * tx + (w.z - w.fz) * tz >= 0 ? 1 : -1; w.dir = w.fleeDir; }
      w.s += 3.6 * w.dir * dt; const L = w.loop.len; if (w.s < 0) w.s += L; if (w.s >= L) w.s -= L; walkerPose(w); continue;
    }
    // the car coming: hop aside, then stand a moment
    if (driving && d2 < 10 * 10 && pv > 1.5 && Math.abs(w.y - C.y) < 3) {
      const ahead = dx * hx + dz * hz, lat = dx * hz - dz * hx;
      if (ahead > 0 && ahead < 10 && Math.abs(lat) < 2.6 && w.dodge <= 0) { w.dodge = 1.2; w.dodgeDir = lat >= 0 ? 1 : -1; }
    }
    if (w.dodge > 0) {
      w.dodge -= dt; const rxp = hz, rzp = -hx;   // the car's right-hand side
      if (w.dodge > 0.5) { w.x += rxp * w.dodgeDir * 4 * dt; w.z += rzp * w.dodgeDir * 4 * dt; w.side = clamp(w.side + w.dodgeDir * 4 * dt * (w.loop ? 1 : 0), -2.5, 2.5); }
      w.y = terrainH(w.x, w.z) + 0.14; continue;
    }
    if (w.cross) {
      w.cs += w.v * dt;
      if (w.cs >= w.cross.len) { const c = w.cross, to = w.cend === 'A' ? c.lb : c.la; w.loop.people--; w.loop = to.loop; w.loop.people++; w.s = to.s; w.cross = null; w.dir = r() < 0.5 ? 1 : -1; w.side = (r() - 0.5) * 1.2; }
      walkerPose(w); continue;
    }
    // along the loop; at a crossing's end, maybe wait for the walk light and cross
    if (w.wait > 0) { w.wait -= dt; const c = w.waitC; if (walkSignal(c.c)) { w.cross = c.c; w.cend = c.end; w.cs = 0; w.wait = 0; w.waitC = null; } walkerPose(w); continue; }
    const s0 = w.s; w.s += w.v * w.dir * dt; const L = w.loop.len; if (w.s < 0) w.s += L; if (w.s >= L) w.s -= L;
    if (w.loop.cross && r() < dt * 0.4) { for (const c of w.loop.cross) { if (Math.abs(c.s - w.s) < 2.5) { w.wait = 8; w.waitC = c; w.s = c.s; break; } } }
    walkerPose(w);
  }
  peopleCollide();
  PEO.stats.n = PEO.list.length;
}
// a walker hit by the car is knocked over (and the car feels a bump)
function peopleCollide() {
  const C = CAR; if (C.ghost || !C.P || HERO.on) return; const sy = Math.sin(C.yaw), cy = Math.cos(C.yaw), hl = C.P.L * 0.55, hw = C.P.W * 0.5;
  for (const w of PEO.list.concat(FREEW)) {
    const dx = w.x - C.x, dz = w.z - C.z; if (dx * dx + dz * dz > 16 || w.knocked > 0 || Math.abs(w.y - C.y) > 3) continue;
    const lu = dx * cy - dz * sy, lv = dx * sy + dz * cy;   // across, along the car
    if (Math.abs(lu) < hw + 0.3 && Math.abs(lv) < hl + 0.3) { w.knocked = 3.5; const kx = sy * 2.5 + (Math.random() - 0.5), kz = cy * 2.5 + (Math.random() - 0.5); if (w.free) { w.x += kx; w.z += kz; } else w.ko = [kx, kz]; C.vx *= 0.93; scareNear(w.x, w.z, 18); if (typeof onPersonHit === 'function') onPersonHit(); }
  }
}
