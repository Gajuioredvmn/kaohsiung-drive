// ===================== traffic: lanes drawn from the road graph, and the cars, scooters and buses that follow them =====================
// Every edge gets right-hand lanes in both directions; at every node each arriving lane is joined to the leaving
// lanes by a curve (straight on, right, left). Vehicles follow their lane at a distance s, keep their gap with the
// IDM car-following law, stop at red lights, give way when turning left and when entering a junction that is in
// use, and treat the player as one more car ahead. They are spawned and retired around the player.
const TR = { lanes: [], conns: [], veh: [], max: 340, near: 430, far: 600, spawnT: 0, byEdge: new Map(), stats: {} };
const LANE_V = { boulevard: 14, avenue: 12.5, street: 10, lane: 7, highway: 24, ramp: 10, quay: 10, hill: 8, rural: 9 };
function offsetPts(pts, off) {   // the polyline moved to the right of travel by off metres (mitred)
  const o = polyOffsets(pts, Math.abs(off)); return off >= 0 ? o.R : o.L;
}
function buildLanes() {
  let id = 0;
  for (const e of MAP.edges) {
    if (e.ramp || e.len < 8) continue;   // tunnels get lanes like any road
    const nPer = Math.max(1, Math.floor(e.K.lanes / 2)), medW = e.K.median || 0, laneW = (e.w - medW) / (nPer * 2);
    const s0 = Math.min(e.ta, e.len * 0.49), s1 = e.len - Math.min(e.tb, e.len * 0.49), base = polyCut(e.pts, s0, s1); if (base.length < 2) continue;
    const list = [];
    for (const dir of [1, -1]) {
      const pts0 = dir > 0 ? base : base.slice().reverse();
      for (let k = 0; k < nPer; k++) {
        const off = medW / 2 + (k + 0.5) * laneW, pts = offsetPts(pts0, off), len = polyLen(pts);
        const lane = { id: id++, e, dir, k, nPer, pts, len, from: dir > 0 ? e.a : e.b, to: dir > 0 ? e.b : e.a, vmax: LANE_V[e.kind] || 10, next: [], veh: [], laneW };
        TR.lanes.push(lane); list.push(lane);
      }
    }
    TR.byEdge.set(e, list);
  }
  // the joins at every node
  for (const n of MAP.nodes) {
    const ins = TR.lanes.filter((l) => l.to === n), outs = TR.lanes.filter((l) => l.from === n); n.lanesIn = ins;
    for (const li of ins) {
      const p = li.pts, a = p[p.length - 2], b = p[p.length - 1], dIn = Math.atan2(b[1] - a[1], b[0] - a[0]);
      for (const lo of outs) {
        if (lo.e === li.e) continue;   // no U-turns
        const q = lo.pts, dOut = Math.atan2(q[1][1] - q[0][1], q[1][0] - q[0][0]), dA = angWrap(dOut - dIn);
        const turn = Math.abs(dA) < 0.5 ? 'straight' : dA > 0 ? 'right' : 'left';
        if (n.ring) { if (lo.k !== Math.min(li.k, lo.nPer - 1)) continue; }
        else {
        if (turn === 'straight' && lo.k !== Math.min(li.k, lo.nPer - 1)) continue;
        if (turn === 'right' && !(li.k === li.nPer - 1 && lo.k === lo.nPer - 1)) continue;
        if (turn === 'left' && !(li.k === 0 && lo.k === 0)) continue;
        if (Math.abs(dA) > 2.6) continue;
        }
        // a curve from the end of one to the start of the other; round the roundabout it follows the circle, the island on the left
        const P0 = b, P3 = q[0], d = Math.hypot(P3[0] - P0[0], P3[1] - P0[1]), k = Math.max(2, d * 0.45);
        const P1 = [P0[0] + Math.cos(dIn) * k, P0[1] + Math.sin(dIn) * k], P2 = [P3[0] - Math.cos(dOut) * k, P3[1] - Math.sin(dOut) * k];
        const pts = []; const N = turn === 'straight' ? 3 : 8;
        if (n.ring) {
          const R = 31 + li.k * 3.4, ph = (x, z) => Math.atan2(-(z - n.z), x - n.x);
          let a0 = ph(P0[0], P0[1]), a1 = ph(P3[0], P3[1]); while (a1 <= a0 + 0.2) a1 += TAU;
          pts.push(P0); const M = Math.max(4, Math.ceil((a1 - a0) / 0.22));
          for (let i = 0; i <= M; i++) { const a = a0 + (a1 - a0) * i / M; pts.push([n.x + Math.cos(a) * R, n.z - Math.sin(a) * R]); }
          pts.push(P3);
        } else for (let i = 0; i <= N; i++) { const t = i / N, u = 1 - t; pts.push([u * u * u * P0[0] + 3 * u * u * t * P1[0] + 3 * u * t * t * P2[0] + t * t * t * P3[0], u * u * u * P0[1] + 3 * u * u * t * P1[1] + 3 * u * t * t * P2[1] + t * t * t * P3[1]]); }
        const c = { id: TR.conns.length, from: li, to: lo, pts, len: polyLen(pts), turn, node: n, veh: [], vmax: n.ring ? 8 : turn === 'straight' ? li.vmax : 5 };
        TR.conns.push(c); li.next.push(c); (n.conns = n.conns || []).push(c);
      }
    }
  }
  // which signal phase each lane's end belongs to, as the lights were laid out
  for (const l of TR.lanes) { const n = l.to; if (!n.lit) continue; const o = n.out.find((q) => q.e === l.e); const a0 = n.out[0].ang, dAng = Math.abs(angWrap(o.ang - a0)); l.phase = (dAng < Math.PI / 4 || dAng > 3 * Math.PI / 4) ? 0 : 1; }
  // the bus stops beside the kerb-side lanes
  for (const b of BUSSTOPS) for (const l of TR.lanes) { if (l.k !== l.nPer - 1) continue; const n = nearestOnPts(l.pts, b.x, b.z); if (n.d < 6 && n.s > 10 && n.s < l.len - 10) { const rx_ = Math.cos(n.yaw), rz_ = -Math.sin(n.yaw); if ((b.x - n.x) * rx_ + (b.z - n.z) * rz_ > 0) (l.stops = l.stops || []).push(n.s); } }
  TR.stats.lanes = TR.lanes.length; TR.stats.conns = TR.conns.length;
}
// ---------- vehicles ----------
const KIND_W = { car: 1.8, truck: 1.9, bus: 2.5, scooter: 0.8 };
function pickKind(r, lane) {
  const cls = lane.e.K.cls, u = r();
  if (lane.e.kind === 'highway') return u < 0.6 ? 'sedan' + r.int(0, 7) : u < 0.7 ? 'taxi' : u < 0.8 ? 'blue' + r.int(0, 2) : u < 0.9 ? 'bus' + r.int(0, 2) : u < 0.95 ? 'gravel' : 'suv' + r.int(0, 2);
  if (cls >= 2) return u < 0.3 ? 'scooter' + r.int(0, 7) : u < 0.62 ? 'sedan' + r.int(0, 7) : u < 0.72 ? 'taxi' : u < 0.8 ? 'blue' + r.int(0, 2) : u < 0.87 ? 'bus' + r.int(0, 2) : u < 0.92 ? 'suv' + r.int(0, 2) : u < 0.97 ? 'wagon' + r.int(0, 1) : 'pickup' + r.int(0, 1);
  return u < 0.5 ? 'scooter' + r.int(0, 7) : u < 0.8 ? 'sedan' + r.int(0, 7) : u < 0.88 ? 'blue' + r.int(0, 2) : u < 0.94 ? 'wagon' + r.int(0, 1) : 'pickup' + r.int(0, 1);
}
function spawnVehicle(lane, s, r) {
  const kind = pickKind(r, lane), K = TRF.kinds[kind]; if (!K) return null;
  if (K.type === 'bus' && lane.e.K.cls < 2) return null;
  const v = { kind, K, type: K.type, L: K.L, W: KIND_W[K.type] || 1.8, lane, conn: null, s, v: lane.vmax * (0.7 + r() * 0.3), x: 0, z: 0, y: 0, yaw: 0, wait: 0, nextC: null, side: K.type === 'scooter' ? 1.0 : 0, brake: 0, horn: 0, id: Math.random() };
  v.v0 = lane.vmax * (K.type === 'scooter' ? 0.95 : K.type === 'bus' || K.type === 'truck' ? 0.85 : 1.0) * (0.9 + r() * 0.2);
  v.a = K.type === 'scooter' ? 2.4 : K.type === 'bus' ? 1.2 : 1.8; v.b = 2.5; v.T = K.type === 'scooter' ? 0.8 : 1.3; v.s0 = 2.2;
  lane.veh.push(v); TR.veh.push(v); vehPose(v); return v;
}
function vehPose(v) {
  const path = v.conn || v.lane, p = polyAt(path.pts, v.s);
  // scooters keep to the kerb side of their lane
  const rx_ = Math.cos(p.yaw), rz_ = -Math.sin(p.yaw), side = v.side * (path.laneW ? (path.laneW / 2 - 0.6) : 0.8);
  v.x = p.x + rx_ * side; v.z = p.z + rz_ * side; v.yaw = p.yaw; const e = v.lane.e; v.y = groundH(v.x, v.z, e.tunnel ? tunnelH(e.rd, e.s0 + Math.min(v.s, e.len)) : e.h0 != null ? e.h0 : 0);
}
function chooseNext(v, r) {
  const opts = v.lane.next; if (!opts.length) return null;
  if (v.cop) { let best = null, bd = 1e9; for (const c of opts) { const q = polyAt(c.to.pts, Math.min(40, c.to.len - 1)), d = Math.hypot(q.x - CAR.x, q.z - CAR.z) + (c.turn === 'straight' ? 0 : 10); if (d < bd) { bd = d; best = c; } } return best; }
  const w = opts.map((c) => (c.turn === 'straight' ? 0.62 : c.turn === 'right' ? 0.23 : 0.15) * (c.to.e.K.cls >= 1 ? 1 : 0.5));
  let t = r() * w.reduce((a, b) => a + b, 0); for (let i = 0; i < opts.length; i++) { t -= w[i]; if (t <= 0) return opts[i]; } return opts[opts.length - 1];
}
// IDM: the acceleration toward the wanted speed, held back by the gap to whatever is ahead
function idm(v, gap, dv) {
  const free = v.a * (1 - Math.pow(Math.max(0, v.v) / v.v0, 4));
  if (gap == null) return free;
  const sStar = v.s0 + Math.max(0, v.v * v.T + (v.v * dv) / (2 * Math.sqrt(v.a * v.b)));
  return free - v.a * Math.pow(sStar / Math.max(0.3, gap), 2);
}
const _trr = mulberry(4242);
function trafficTick(dt) {
  const C = CAR, r = _trr;
  // spawn around the player, retire what is far away
  TR.spawnT -= dt;
  if (TR.veh.length < TR.max && TR.spawnT <= 0) { TR.spawnT = 0.08; trafficSpawn(r); }
  for (let i = TR.veh.length - 1; i >= 0; i--) { const v = TR.veh[i]; if (!v.cop && Math.hypot(v.x - C.x, v.z - C.z) > TR.far) { retire(v, i); } }
  // sort each lane by distance so every vehicle knows its leader
  for (const l of TR.lanes) if (l.veh.length > 1) l.veh.sort((p, q) => p.s - q.s);
  for (const c of TR.conns) if (c.veh.length > 1) c.veh.sort((p, q) => p.s - q.s);
  const pv = Math.hypot(C.vx, C.vy), phx = Math.sin(C.yaw) * C.vx + Math.cos(C.yaw) * C.vy, phz = Math.cos(C.yaw) * C.vx - Math.sin(C.yaw) * C.vy;
  for (let i = 0; i < TR.veh.length; i++) {
    const v = TR.veh[i], path = v.conn || v.lane, list = path.veh, idx = list.indexOf(v);
    let gap = null, dv = 0;
    // the one ahead on this path
    if (idx >= 0 && idx + 1 < list.length) { const w = list[idx + 1]; gap = w.s - v.s - (w.L + v.L) / 2; dv = v.v - w.v;
      if (v.cop && !v.conn && w.v < 4 && gap < 14) { if (copSwitchLane(v)) { gap = null; dv = 0; } else { v.pushT = (v.pushT || 0) + dt; if (v.pushT > 2) { gap = null; dv = 0; } } } else v.pushT = 0; }
    else {
      // or the first one on what comes next
      const nxt = v.conn ? v.conn.to : (v.nextC || (v.nextC = chooseNext(v, r)));
      if (nxt && nxt.veh.length) { const w = nxt.veh[0]; const g = (path.len - v.s) + w.s - (w.L + v.L) / 2; if (g < 60) { gap = g; dv = v.v - w.v; } }
      if (!v.conn && v.nextC && v.nextC.to.veh.length && gap == null) { const w = v.nextC.to.veh[0]; const g = (path.len - v.s) + v.nextC.len + w.s - (w.L + v.L) / 2; if (g < 60) { gap = g; dv = v.v - w.v; } }
    }
    // a bus pulls in at its stops for a while
    if (v.type === 'bus' && !v.conn && v.lane.stops) {
      if (v.dwell > 0) { v.dwell -= dt; gap = 0.05; dv = v.v; }
      else for (const ss of v.lane.stops) { const g = ss - v.s - v.L / 2; if (g > -1 && g < 40 && v.lastStop !== ss) { if (g < 0.6) { v.dwell = 5 + r() * 4; v.lastStop = ss; } else if (gap == null || g < gap) { gap = Math.max(0.05, g); dv = v.v; } break; } }
    }
    // the lights, and giving way, at the end of the lane
    if (!v.conn) {
      const n = v.lane.to, rem = v.lane.len - v.s - v.L / 2, stopGap = rem - 1.0;
      if (n.lit && !v.cop) {
        const st = signalState(n, v.lane.phase);
        const must = st === 'red' || (st === 'yellow' && stopGap > v.v * v.v / (2 * 3.5) + 2);
        if (must && stopGap < 60 && (gap == null || stopGap < gap)) { gap = Math.max(0.05, stopGap); dv = v.v; }
        // turning left across the oncoming traffic
        if (!must && v.nextC && v.nextC.turn === 'left' && rem < 12 && oncoming(v, n)) { if (gap == null || stopGap < gap) { gap = Math.max(0.05, stopGap); dv = v.v; } }
      } else if (rem < 10 && n.edges.length >= 3 && !v.cop) {
        // an unlit junction: wait for whoever is already in it, or coming down a bigger road; never for ever
        if (junctionBusy(v, n) && v.wait < 6) { if (gap == null || stopGap < gap) { gap = Math.max(0.05, stopGap); dv = v.v; } v.wait += dt; } else v.wait = Math.max(0, v.wait - dt * 0.5);
      }
    }
    // the player, when on this vehicle's path ahead
    const dpx = C.x - v.x, dpz = C.z - v.z;
    if (!v.cop && dpx * dpx + dpz * dpz < 70 * 70) {
      const n = nearestOnPts(path.pts, C.x, C.z);
      // a player who just sits there is, after a while, nudged past rather than waited on for ever
      const blocked = n.d < v.W / 2 + C.P.W / 2 + 0.5 && n.s > v.s && n.s - v.s < 8 && v.v < 0.3 && pv < 0.5;
      v.blockT = blocked ? (v.blockT || 0) + dt : 0;
      if (n.d < v.W / 2 + C.P.W / 2 + 0.5 && n.s > v.s && v.blockT < 3.5) { const g = n.s - v.s - (v.L + C.P.L) / 2; if (gap == null || g < gap) { gap = Math.max(0.05, g); const hx = Math.sin(n.yaw), hz = Math.cos(n.yaw); dv = v.v - (phx * hx + phz * hz); } }
      // a stopped or sideways player right in front: stop and lean on the horn
      if (gap != null && gap < 3 && v.v < 1 && pv < 1) { if (v.horn <= 0 && r() < dt * 0.3) { v.horn = 1.5; sfxHornFar(Math.hypot(dpx, dpz)); } }
    }
    if (v.horn > 0) v.horn -= dt;
    // the whoosh of something passing close by at speed
    { const rel = Math.abs(v.v - (phx * Math.sin(v.yaw) + phz * Math.cos(v.yaw))), dd = Math.sqrt(dpx * dpx + dpz * dpz); if (dd < 6 && rel > 8 && !v.passed) { v.passed = true; const side = Math.sign(dpx * (-Math.cos(C.yaw)) * -1 + dpz * Math.sin(C.yaw)); if (typeof sfxPass === 'function') sfxPass(clamp(rel / 30, 0.3, 1), -side, v.type === 'bus' ? 'bus' : v.type === 'truck' ? 'gravel' : 'car'); } else if (dd > 12) v.passed = false; }
    const acc = idm(v, gap, dv);
    v.v = Math.max(0, v.v + clamp(acc, -6, 3) * dt); v.brake = acc < -0.8 ? 1 : 0;
    const vmaxHere = v.conn ? v.conn.vmax : v.lane.vmax; if (v.v > vmaxHere * 1.1) v.v = vmaxHere * 1.1;
    v.s += v.v * dt;
    // onto the next path
    if (v.s >= path.len) {
      const over = v.s - path.len;
      if (v.conn) { const l = v.conn.to; rm(v.conn.veh, v); v.conn = null; v.lane = l; l.veh.push(v); v.s = over; v.nextC = null; }
      else { const c = v.nextC || chooseNext(v, r); rm(v.lane.veh, v); if (!c) { retire(v, i); i--; continue; } v.conn = c; c.veh.push(v); v.s = over; v.nextC = null; v.wait = 0; }
    }
    vehPose(v);
  }
  trafficCollide(dt);
  TR.stats.n = TR.veh.length;
}
function rm(list, v) { const i = list.indexOf(v); if (i >= 0) list.splice(i, 1); }
function retire(v, i) { rm((v.conn || v.lane).veh, v); TR.veh.splice(i, 1); }
// is anyone coming the other way, about to cross the junction?
function oncoming(v, n) {
  for (const l of n.lanesIn || []) {
    if (l.e === v.lane.e) continue;
    const dA = Math.abs(angWrap(n.out.find((q) => q.e === l.e).ang - n.out.find((q) => q.e === v.lane.e).ang)); if (dA < 2.4) continue;   // only the opposite approach
    for (const w of l.veh) { const rem = l.len - w.s; if (rem < 35 && w.v > 1.5 && (!w.nextC || w.nextC.turn !== 'left')) return true; }
  }
  return false;
}
function junctionBusy(v, n) {
  // someone from another road is in the junction and moving (or from a road as big as ours)
  const cls = v.lane.e.K.cls;
  for (const c of n.conns || []) if (c.veh.length && c.from.e !== v.lane.e && (c.from.e.K.cls >= cls || c.veh.some((w) => w.v > 0.5))) return true;
  // a bigger road's traffic close to the junction has the right of way over a lane
  if (v.lane.e.K.cls === 0) for (const l of n.lanesIn || []) if (l.e !== v.lane.e && l.e.K.cls > 0) for (const w of l.veh) if (l.len - w.s < 25 && w.v > 2) return true;
  return false;
}
function trafficSpawn(r, minD) {
  const C = CAR; let tries = 0;
  while (tries++ < 12) {
    const l = TR.lanes[r.int(0, TR.lanes.length - 1)]; if (l.len < 30) continue;
    const s = 8 + r() * (l.len - 16), p = polyAt(l.pts, s), d = Math.hypot(p.x - C.x, p.z - C.z);
    if (d < (minD || 40) || d > TR.near) continue;
    // never in plain view: behind or well to the side of the camera, or far enough to be lost in the haze
    if (!minD && d < 330 && R3.cam) { const dx = p.x - R3.cam.position.x, dz = p.z - R3.cam.position.z, L = Math.hypot(dx, dz) || 1, fx = Math.sin(CAMV.az), fz = Math.cos(CAMV.az); if ((dx * fx + dz * fz) / L > 0.45) continue; }
    // not on top of another, and not too dense for the road
    const want = l.e.K.cls >= 3 ? 1 / 45 : l.e.K.cls === 2 ? 1 / 55 : l.e.K.cls === 1 ? 1 / 80 : 1 / 160;
    if (l.veh.length >= Math.max(1, Math.floor(l.len * want))) continue;
    let ok = true; for (const w of l.veh) if (Math.abs(w.s - s) < 12) { ok = false; break; } if (!ok) continue;
    spawnVehicle(l, s, r); return;
  }
}
// the player against the traffic: two discs under the car against each vehicle's box; both feel it
function trafficCollide(dt) {
  const C = CAR, sy = Math.sin(C.yaw), cy = Math.cos(C.yaw), rc = C.P.W * 0.5 * 0.9;
  for (const v of TR.veh) {
    const dx = v.x - C.x, dz = v.z - C.z; if (dx * dx + dz * dz > 100) continue;
    const c = Math.cos(v.yaw), sn = Math.sin(v.yaw), hx = v.W / 2, hz = v.L / 2, cx = v.x - sn * 0, cz = v.z - c * 0;
    for (let k = 0; k < 2; k++) {
      const off = k === 0 ? C.P.a * 0.95 : -C.P.b * 0.95, px = C.x + sy * off, pz = C.z + cy * off;
      const ddx = px - cx, ddz = pz - cz, lu = ddx * c - ddz * sn, lv = ddx * sn + ddz * c;
      if (Math.abs(lu) > hx + rc || Math.abs(lv) > hz + rc) continue;
      const cu = clamp(lu, -hx, hx), cv = clamp(lv, -hz, hz), du = lu - cu, dv = lv - cv, d = Math.hypot(du, dv); if (d >= rc) continue;
      let lnx, lnz, pen; if (d > 1e-3) { lnx = du / d; lnz = dv / d; pen = rc - d; } else { const toL = lu + hx, toR = hx - lu, toT = lv + hz, toB = hz - lv, m = Math.min(toL, toR, toT, toB); lnx = m === toL ? -1 : m === toR ? 1 : 0; lnz = m === toT ? -1 : m === toB ? 1 : 0; pen = m + rc; }
      const nx = lnx * c + lnz * sn, nz = -lnx * sn + lnz * c;
      C.x += nx * pen; C.z += nz * pen; carBounce(nx, nz);
      v.v *= v.cop ? 0.85 : 0.6; if (v.horn <= 0) v.horn = 2; if (typeof onTrafficHit === 'function') onTrafficHit(v); if (typeof sfxHornFar === 'function' && Math.random() < 0.3) sfxHornFar(3);
    }
  }
}

// at the start of a drive: the traffic already out and about, none of it within sixty metres of the car
function trafficReset() {
  for (const v of TR.veh) rm((v.conn || v.lane).veh, v); TR.veh.length = 0;
  for (const w of PEO.list) w.loop.people--; PEO.list.length = 0;
  const r = _trr; for (let i = 0; i < TR.max * 0.7; i++) trafficSpawn(r, 60);
  for (let i = 0; i < PEO.max * 0.7; i++) spawnWalker(_pr);
  for (let k = 0; k < 90; k++) { for (const l of TR.lanes) if (l.veh.length > 1) l.veh.sort((p, q) => p.s - q.s); for (const v of TR.veh) { v.s += v.v * 0.1; if (v.s >= (v.conn || v.lane).len - 2) v.s = (v.conn || v.lane).len - 2; vehPose(v); } }
  // and nothing left sitting on top of us after the roll-forward
  const C = CAR; for (let i = TR.veh.length - 1; i >= 0; i--) { const v = TR.veh[i]; if (Math.hypot(v.x - C.x, v.z - C.z) < 35) retire(v, i); }
}

// a police car set loose on a lane some way off, already moving, hunting the player
function spawnCop(r) {
  const C = CAR;
  for (let t = 0; t < 40; t++) {
    const l = TR.lanes[r.int(0, TR.lanes.length - 1)]; if (l.e.K.cls < 1 || l.len < 30 || l.e.lvl) continue;
    const s = 5 + r() * (l.len - 10), p = polyAt(l.pts, s), d = Math.hypot(p.x - C.x, p.z - C.z); if (d < 120 || d > 320) continue;
    if (Math.sin(p.yaw) * (C.x - p.x) + Math.cos(p.yaw) * (C.z - p.z) < 0.3 * d) continue;   // heading our way
    const K = TRF.kinds.police, v = { kind: 'police', K, type: 'car', L: K.L, W: 1.8, lane: l, conn: null, s, v: 12, x: 0, z: 0, y: 0, yaw: 0, wait: 0, nextC: null, side: 0, brake: 0, horn: 0, id: Math.random(), cop: true, v0: 23, a: 3.8, b: 3, T: 0.6, s0: 1.5 };
    l.veh.push(v); TR.veh.push(v); vehPose(v); return v;
  }
  return null;
}

// a patrol car moves over to a neighbouring lane of the same road if there is room there
function copSwitchLane(v) {
  const l = v.lane, list = TR.byEdge.get(l.e) || [];
  for (const m of list) {
    if (m === l || m.dir !== l.dir || Math.abs(m.k - l.k) !== 1) continue;
    let ok = true; for (const w of m.veh) if (Math.abs(w.s - v.s) < 12) { ok = false; break; }
    if (!ok) continue;
    rm(l.veh, v); v.lane = m; m.veh.push(v); v.nextC = null; return true;
  }
  return false;
}
