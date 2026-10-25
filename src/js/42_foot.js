// ===================== on foot, GTA style: out of the car, fists, and any vehicle on the street =====================
// Stop, get out and walk (or run) about; punch whoever is in the way; get into any vehicle: the one left at the kerb,
// or one off the street (its driver is pulled out and runs off). Vehicles take damage: the player's smokes, loses power
// and at last breaks down; one on the street hit hard enough stops for good, smoking, and its driver gets out.
// The controls are kept simple: one stick to move (all the way out is a run), one button to punch (the hero turns to
// whoever is nearest), one to get in or out (from a few steps away the hero runs to the door by itself).
const HERO = { on: false, x: 0, z: 0, y: 0, yaw: 0, vx: 0, vz: 0, spd: 0, anim: 0, punchT: 0, punched: false, down: 0, wetT: 0, go: null, goT: 0, tgt: null, tgtT: 0 };
const PARK = [];      // vehicles the player has left: { spec, kind, x, z, y, yaw, damage, broken, slot }
const FOOT = { walk: 1.8, run: 5.4, r: 0.32, reach: 2.2, seek: 14, punch: 1.8 };
const FREEW = [];     // people off the pavements for a while: a driver pulled out, someone running from a fight
function plr() { return HERO.on ? HERO : CAR; }
// ---------- the vehicles of the street as the player drives them ----------
const TSPEC = {
  car: { top: 165, acc: 0.38, grip: 0.5, steer: 0.6, mass: 0.35, gears: 5, engine: 'i4', drive: 'fwd' },
  taxi: { top: 172, acc: 0.44, grip: 0.52, steer: 0.62, mass: 0.38, gears: 5, engine: 'i4', drive: 'fwd' },
  police: { top: 210, acc: 0.7, grip: 0.7, steer: 0.66, mass: 0.45, gears: 5, engine: 'v8', drive: 'rwd' },
  pickup: { top: 160, acc: 0.34, grip: 0.46, steer: 0.5, mass: 0.6, gears: 5, engine: 'i6', drive: 'rwd' },
  truck: { top: 125, acc: 0.3, grip: 0.46, steer: 0.52, mass: 1, m: 2400, tq: 1.6, gears: 5, engine: 'v8', drive: 'rwd' },
  bus: { top: 100, acc: 0.3, grip: 0.5, steer: 0.48, mass: 1, m: 5200, tq: 2.6, gears: 5, engine: 'v8', drive: 'rwd' },
  gravel: { top: 105, acc: 0.3, grip: 0.5, steer: 0.46, mass: 1, m: 5800, tq: 2.6, gears: 6, engine: 'v8', drive: 'rwd' },
  suv: { top: 178, acc: 0.44, grip: 0.52, steer: 0.55, mass: 0.7, gears: 5, engine: 'i6', drive: 'awd' },
  wagon: { top: 168, acc: 0.4, grip: 0.5, steer: 0.58, mass: 0.45, gears: 5, engine: 'i4', drive: 'fwd' },
  scooter: { top: 92, acc: 0.62, grip: 0.66, steer: 0.95, mass: 0, m: 190, gears: 4, engine: 'turbo', drive: 'rwd' },
};
const KIND_NAME = { car: '轎車', taxi: '計程車', police: '警車', pickup: '小貨卡', truck: '小貨車', bus: '公車', gravel: '砂石車', suv: '休旅車', wagon: '旅行車', scooter: '機車' };
function kindBase(kind) { return /^sedan/.test(kind) ? 'car' : kind === 'taxi' ? 'taxi' : kind === 'police' ? 'police' : /^pickup/.test(kind) ? 'pickup' : /^blue/.test(kind) ? 'truck' : /^bus/.test(kind) ? 'bus' : kind === 'gravel' ? 'gravel' : /^suv/.test(kind) ? 'suv' : /^wagon/.test(kind) ? 'wagon' : 'scooter'; }
const _tspec = {};
function trafficSpec(kind) {
  if (_tspec[kind]) return _tspec[kind];
  const K = TRF.kinds[kind], b = kindBase(kind);
  return (_tspec[kind] = Object.assign({ id: 'tr-' + kind, kind, base: b, name: KIND_NAME[b], L: K.L, W: K.W, color: 0x8a8e94, interior: 0x2a2a30 }, TSPEC[b]));
}
const vehName = (spec) => (spec && spec.base ? KIND_NAME[spec.base] : spec ? spec.name : '');
// ---------- the world's vehicles as seen from the hero: the nearest one that can be got into ----------
function boxGap(x, z, yaw, hw, hl, px, pz) { const c = Math.cos(yaw), s = Math.sin(yaw), dx = px - x, dz = pz - z, lu = dx * c - dz * s, lv = dx * s + dz * c; return Math.hypot(Math.max(0, Math.abs(lu) - hw), Math.max(0, Math.abs(lv) - hl)); }
function heroTarget(R) {
  const H = HERO; let best = null, bd = R;
  const consider = (kind, ref, x, z, y, yaw, W, L) => { if (Math.abs(y - H.y) > 2.5) return; const d = boxGap(x, z, yaw, W / 2, L / 2, H.x, H.z); if (d < bd) { bd = d; best = { kind, ref, d }; } };
  if (CAR.P) consider('own', CAR, CAR.x, CAR.z, CAR.y, CAR.yaw, CAR.spec.W, CAR.spec.L);
  for (const p of PARK) consider('park', p, p.x, p.z, p.y, p.yaw, p.spec.W, p.spec.L);
  // (one still on the move is no target: it would only be chased; a stopped one, or one crawling up to a light, is)
  for (const v of TR.veh) { const dx = v.x - H.x, dz = v.z - H.z; if (dx * dx + dz * dz > (R + 12) * (R + 12) || (v.v > 4 && !v.broken)) continue; consider('street', v, v.x, v.z, v.y, v.yaw, v.W, v.L); }
  return best;
}
// ---------- getting out ----------
function carAction() {
  if (G.mode !== 'drive' || G.paused) return;
  if (HERO.on) { heroSeekCar(); return; }
  if (CAR.kmh > 22) { hudMsg('太快了，先停下來', null, '#ffd23a', 1.2); return; }
  exitCar();
}
function exitCar() {
  const C = CAR, H = HERO, lx = Math.cos(C.yaw), lz = -Math.sin(C.yaw);   // the car's left: the driver's door (and on a scooter, step off to the left)
  const half = (C.spec.W || 1.8) / 2 + 0.55, fwd = C.spec.base === 'scooter' ? 0 : (C.spec.L || 4.5) * 0.08;
  let x = C.x + lx * half + Math.sin(C.yaw) * fwd, z = C.z + lz * half + Math.cos(C.yaw) * fwd;
  if (solidAt(x, C.y + 1, z, 0.3)) { x = C.x - lx * half; z = C.z - lz * half; }   // a wall on that side: out of the other door
  Object.assign(H, { on: true, x, z, y: groundH(x, z, C.y), yaw: C.yaw, vx: 0, vz: 0, spd: 0, punchT: 0, down: 0, go: null, wetT: 0 });
  C.throttle = 0; C.brake = 1; C.hand = 1; C.steerIn = 0;
  if (CAMV.view === 'cockpit') { CAMV.view = 'chase'; CAMV.fp = false; }
  CAMV.yawS = C.yaw; CAMV.off = 0; CAMV.clip = 1;
  engineStop(); sfxThud(0.25);
}
// ---------- getting in: run to it if it is a few steps off, then in (pulling the driver out if there is one) ----------
function heroSeekCar() {
  const H = HERO; if (H.down > 0) return;
  const t = heroTarget(FOOT.seek); if (!t) { hudMsg('附近沒有車', null, '#ffd23a', 1); return; }
  if (t.d <= FOOT.reach) { enterVehicle(t); return; }
  H.go = t; H.goT = 0;
}
function enterVehicle(t) {
  const H = HERO;
  if (t.kind === 'own') {
    if (CAR.broken) { hudMsg('這台壞了，開不動', '換一台吧', '#ff4f6d', 1.5); return; }
    H.on = false; H.go = null; if (AU.ctx) engineStart(CAR.spec.engine); camReset(); return;
  }
  if (t.kind === 'park') {
    const p = t.ref; if (p.broken) { hudMsg('這台壞了，開不動', null, '#ff4f6d', 1.5); return; }
    const old = parkSnapshot(); PARK.splice(PARK.indexOf(p), 1); PARK.push(old); carFromPark(p);
    H.on = false; H.go = null; if (AU.ctx) engineStart(CAR.spec.engine); camReset(); return;
  }
  const v = t.ref;
  if (v.broken) { hudMsg('這台壞了，開不動', null, '#ff4f6d', 1.5); return; }
  if (v.v > 5.5 && !v.cop) { hudMsg('追不上，等它停下來', null, '#ffd23a', 1); return; }
  carjack(v);
}
function parkSnapshot() { const C = CAR; return { spec: C.spec, kind: C.kind || null, x: C.x, z: C.z, y: C.y, yaw: C.yaw, damage: C.damage, broken: !!C.broken, slot: C.slot, slotP: C.slotP || null }; }
function carFromPark(p) {
  carSetup(p.spec, SET.auto); const C = CAR;
  Object.assign(C, { x: p.x, z: p.z, y: p.y, yaw: p.yaw, damage: p.damage, broken: p.broken, kind: p.kind, slot: p.slot, slotP: p.slotP || null });
  r3CarCurrent();
}
function carjack(v) {
  const H = HERO, i = TR.veh.indexOf(v); if (i < 0) return;
  // the car the hero came in stays where it was left (at most two are kept about)
  if (CAR.P) { PARK.push(parkSnapshot()); while (PARK.length > 2) parkDrop(PARK[0]); }
  const kind = v.kind, spec = trafficSpec(kind), hp = v.hp == null ? 1 : v.hp;
  retire(v, i);
  // the driver: out of the door, sprawled for a moment, then off at a run
  const lx = Math.cos(v.yaw), lz = -Math.sin(v.yaw), side = spec.base === 'scooter' ? 0.9 : v.W / 2 + 0.5;
  freeWalker('person' + Math.floor(Math.random() * (STYLE.toon ? TPEOPLE.length : 8)), v.x + lx * side, v.z + lz * side, v.y, 1.4, 6);
  carSetup(spec, SET.auto); const C = CAR;
  Object.assign(C, { x: v.x, z: v.z, y: v.y, yaw: v.yaw, vx: 0, vy: 0, r: 0, damage: clamp(1 - hp, 0, 0.95), broken: false, kind });
  C.slot = null; C.slotP = null;
  if (spec.base === 'scooter') { r3CarCurrent(riderKind(kind, 'hero')); C.slotP = r3KindSlot(riderKind(kind, 'none')); } else r3CarCurrent(kind);
  H.on = false; H.go = null; camReset();
  if (AU.ctx) engineStart(spec.engine); sfxThud(0.6);
  hudMsg((v.cop ? '搶了一台' : '搶到一台') + spec.name + '！', null, '#ffd23a', 1.6);
  if (v.cop) { const k = WANT.cops.indexOf(v); if (k >= 0) WANT.cops.splice(k, 1); heatUp(90, '搶警車'); } else heatUp(32, '搶車');
}
function parkDrop(p) { const k = PARK.indexOf(p); if (k >= 0) PARK.splice(k, 1); if (p.slot) r3SlotFree(p.slot); if (p.slotP) r3SlotFree(p.slotP); }
// ---------- the hero's step ----------
function heroStep(dt) {
  const H = HERO; if (!H.on) return;
  H.anim += dt * (0.55 + H.spd * 0.36);
  if (H.punchT > 0) { H.punchT -= dt; if (!H.punched && H.punchT < 0.22) { H.punched = true; punchLand(); } }
  // what is within reach, for the button's label (a few times a second is plenty)
  H.tgtT -= dt; if (H.tgtT <= 0) { H.tgtT = 0.15; H.tgt = heroTarget(FOOT.seek); }
  let wantSpd = 0, wantYaw = H.yaw;
  if (H.down > 0) { H.down -= dt; H.spd = 0; H.vx *= Math.pow(0.05, dt); H.vz *= Math.pow(0.05, dt); }
  else {
    const mx = CTL.move.x, my = CTL.move.y, mag = Math.min(1, Math.hypot(mx, my));
    if (H.go && mag > 0.25) H.go = null;   // the stick takes over from the run to the car
    if (H.go) {
      // running to the vehicle the player asked for; in once at its side
      const t = H.go, r = t.ref, x = t.kind === 'own' ? CAR.x : r.x, z = t.kind === 'own' ? CAR.z : r.z, y = t.kind === 'own' ? CAR.y : r.y, yaw = t.kind === 'own' ? CAR.yaw : r.yaw;
      const W = t.kind === 'street' ? r.W : (t.kind === 'own' ? CAR.spec : r.spec).W, L = t.kind === 'street' ? r.L : (t.kind === 'own' ? CAR.spec : r.spec).L;
      const gone = t.kind === 'street' ? !TR.veh.includes(r) : t.kind === 'park' ? !PARK.includes(r) : false;
      H.goT += dt;
      if (gone || H.goT > 5) H.go = null;
      else if (boxGap(x, z, yaw, W / 2, L / 2, H.x, H.z) <= FOOT.reach) { H.go = null; t.d = 0; enterVehicle(t); if (!H.on) return; }
      else { const lx = Math.cos(yaw), lz = -Math.sin(yaw), dx = x + lx * (W / 2 + 0.4) - H.x, dz = z + lz * (W / 2 + 0.4) - H.z; wantYaw = Math.atan2(dx, dz); wantSpd = FOOT.run; if (Math.abs(y - H.y) > 2.5) H.go = null; }
    } else if (mag > 0.14) {
      // the stick, turned by the camera: up is away from the camera, right is the screen's right
      const az = CAMV.az, dx = Math.sin(az) * my - Math.cos(az) * mx, dz = Math.cos(az) * my + Math.sin(az) * mx;
      wantYaw = Math.atan2(dx, dz);
      wantSpd = CTL.walk ? FOOT.walk : mag < 0.62 ? FOOT.walk * (0.55 + 0.45 * (mag - 0.14) / 0.48) : FOOT.run * clamp((mag - 0.45) / 0.4, 0.6, 1);
    }
    if (H.punchT > 0) wantSpd *= 0.15;
    H.yaw += clamp(angWrap(wantYaw - H.yaw), -13 * dt, 13 * dt);
    H.spd += clamp(wantSpd - H.spd, -24 * dt, 16 * dt);
    H.vx = Math.sin(H.yaw) * H.spd; H.vz = Math.cos(H.yaw) * H.spd;
  }
  H.x += H.vx * dt; H.z += H.vz * dt;
  heroCollide();
  // the ground, a viaduct, or a fall
  const gh = groundH(H.x, H.z, H.y);
  if (H.y > gh + 0.25) { H.vyv = (H.vyv || 0) - 9.81 * dt; H.y = Math.max(gh, H.y + H.vyv * dt); if (H.y === gh) H.vyv = 0; } else { H.y = gh; H.vyv = 0; }
  if (H.x < 4) H.x = 4; if (H.z < 4) H.z = 4; if (H.x > MAP.W - 4) H.x = MAP.W - 4; if (H.z > MAP.W - 4) H.z = MAP.W - 4;
  // in the water: back to the road
  if (groundKind(H.x, H.z) === GK.water && H.y < 1) { H.wetT += dt; if (H.wetT > 1.2) { const n = nearestRoad(H.x, H.z, H.y); if (n) { const lx = Math.cos(n.yaw), lz = -Math.sin(n.yaw); H.x = n.x + lx * (n.e.w / 2 + 1.5); H.z = n.z + lz * (n.e.w / 2 + 1.5); H.y = groundH(H.x, H.z, n.e.h0 || 0); } H.wetT = 0; hudMsg('游上岸了', null, '#7cd0ff', 1.5); } } else H.wetT = 0;
}
// the hero is a small disc: out of walls and posts, out of every vehicle's box; one coming at speed knocks him over
function heroCollide() {
  const H = HERO, R = FOOT.r;
  for (const s of solidsNear(H.x, H.z, 3)) {
    if (H.y > s.y0 + (s.h == null ? 100 : s.h) + 0.2 || H.y + 1.6 < s.y0) continue;
    if (s.r != null) { const dx = H.x - s.x, dz = H.z - s.z, d = Math.hypot(dx, dz), min = s.r + R; if (d < min) { const nx = d > 1e-3 ? dx / d : 1, nz = d > 1e-3 ? dz / d : 0; H.x += nx * (min - d); H.z += nz * (min - d); } continue; }
    const c = Math.cos(s.yaw), sn = Math.sin(s.yaw), dx = H.x - s.x, dz = H.z - s.z, lu = dx * c - dz * sn, lv = dx * sn + dz * c;
    if (Math.abs(lu) > s.hx + R || Math.abs(lv) > s.hz + R) continue;
    pushOutBox(c, sn, lu, lv, s.hx, s.hz, R);
  }
  const box = (x, z, y, yaw, hw, hl, v, ref) => {
    if (Math.abs(y - H.y) > 2) return; const c = Math.cos(yaw), sn = Math.sin(yaw), dx = H.x - x, dz = H.z - z, lu = dx * c - dz * sn, lv = dx * sn + dz * c;
    if (Math.abs(lu) > hw + R || Math.abs(lv) > hl + R) return;
    // a vehicle moving into the hero: down he goes, thrown along its way
    if (v && v > 2.4 && H.down <= 0 && lv > -hl * 0.2) { H.down = 1.6 + Math.min(1.4, v * 0.08); const k = 2.5 + v * 0.35; H.vx = Math.sin(yaw) * k + (lu >= 0 ? c : -c) * 1.2; H.vz = Math.cos(yaw) * k - (lu >= 0 ? sn : -sn) * 1.2; CAMV.shake = Math.max(CAMV.shake, 0.5); sfxThud(0.8); hudMsg('被車撞倒了！', null, '#ff4f6d', 1.4); if (ref) { ref.v *= 0.3; ref.horn = 2; } }
    pushOutBox(c, sn, lu, lv, hw, hl, R);
  };
  for (const v of TR.veh) { const dx = v.x - H.x, dz = v.z - H.z; if (dx * dx + dz * dz > 64) continue; box(v.x, v.z, v.y, v.yaw, v.W / 2, v.L / 2, v.broken ? 0 : v.v, v); }
  if (CAR.P) box(CAR.x, CAR.z, CAR.y, CAR.yaw, CAR.spec.W / 2 * 0.95, CAR.spec.L / 2 * 0.92, 0);
  for (const p of PARK) box(p.x, p.z, p.y, p.yaw, p.spec.W / 2 * 0.95, p.spec.L / 2 * 0.92, 0);
}
function pushOutBox(c, sn, lu, lv, hw, hl, R) {
  const H = HERO, cu = clamp(lu, -hw, hw), cv = clamp(lv, -hl, hl), du = lu - cu, dv = lv - cv, d = Math.hypot(du, dv); if (d >= R) return;
  let lnx, lnz, pen; if (d > 1e-3) { lnx = du / d; lnz = dv / d; pen = R - d; } else { const toL = lu + hw, toR = hw - lu, toT = lv + hl, toB = hl - lv, m = Math.min(toL, toR, toT, toB); lnx = m === toL ? -1 : m === toR ? 1 : 0; lnz = m === toT ? -1 : m === toB ? 1 : 0; pen = m + R; }
  H.x += (lnx * c + lnz * sn) * pen; H.z += (-lnx * sn + lnz * c) * pen;
}
// ---------- fists ----------
function heroPunch() {
  const H = HERO; if (!H.on || H.down > 0 || H.punchT > 0) return;
  // the punch turns to the nearest person within a couple of steps, so the player need not aim
  let best = null, bd = 2.6; for (const w of PEO.list.concat(FREEW)) { if (w.knocked > 0 || Math.abs(w.y - H.y) > 1.5) continue; const d = Math.hypot(w.x - H.x, w.z - H.z); if (d < bd) { bd = d; best = w; } }
  if (best) H.yaw = Math.atan2(best.x - H.x, best.z - H.z);
  H.punchT = 0.4; H.punched = false; H.go = null;
}
function punchLand() {
  const H = HERO, fx = Math.sin(H.yaw), fz = Math.cos(H.yaw); let hit = 0;
  for (const w of PEO.list.concat(FREEW)) {
    if (w.knocked > 0) continue; const dx = w.x - H.x, dz = w.z - H.z, d = Math.hypot(dx, dz);
    if (d > FOOT.punch || Math.abs(w.y - H.y) > 1.5 || (dx * fx + dz * fz) / (d || 1) < 0.3) continue;
    w.knocked = 3; w.ko = [fx * 0.9, fz * 0.9]; hit++;
    fxPow(H.x + fx * 0.7, H.y + 1.05, H.z + fz * 0.7);
  }
  if (hit) { sfxThud(0.9); CAMV.shake = Math.max(CAMV.shake, 0.25); heatUp(14, '打人'); scareNear(H.x, H.z, 24); return; }
  // or a vehicle: a dent, and its horn
  for (const v of TR.veh) { const d = boxGap(v.x, v.z, v.yaw, v.W / 2, v.L / 2, H.x + fx * 0.8, H.z + fz * 0.8); if (d < 0.35 && Math.abs(v.y - H.y) < 2) { vehHurt(v, 3.4); v.horn = 2; sfxClang(0.5); fxPow(H.x + fx * 0.7, H.y + 1.05, H.z + fz * 0.7); return; } }
}
// people round a fight run away from it
function scareNear(x, z, R) { for (const w of PEO.list) { if (w.knocked > 0) continue; const d = Math.hypot(w.x - x, w.z - z); if (d < R) { w.flee = 5 + Math.random() * 3; w.fx = x; w.fz = z; w.fleeDir = null; } } }
// someone off the pavement: runs from the hero for a while, then is gone
function freeWalker(kind, x, z, y, down, life) { const w = { kind, x, z, y, yaw: 0, anim: Math.random() * 10, knocked: down || 0, run: life || 6, life: life || 6, v: 3.4, free: true }; FREEW.push(w); if (FREEW.length > 16) FREEW.shift(); return w; }
function freeTick(dt) {
  const P = plr();
  for (let i = FREEW.length - 1; i >= 0; i--) {
    const w = FREEW[i];
    if (w.knocked > 0) { w.knocked -= dt; continue; }
    w.run -= dt; if (w.run < -0.8) { FREEW.splice(i, 1); continue; }
    const dx = w.x - P.x, dz = w.z - P.z, d = Math.hypot(dx, dz) || 1, yaw = Math.atan2(dx / d, dz / d);
    w.yaw = yaw; w.x += Math.sin(yaw) * w.v * dt; w.z += Math.cos(yaw) * w.v * dt; w.anim += dt * (w.v + 1);
    // walls turn them aside
    if (solidAt(w.x, w.y + 1, w.z, 0.3)) { w.x -= Math.sin(yaw) * w.v * dt * 2; w.z -= Math.cos(yaw) * w.v * dt * 2; w.x += Math.cos(yaw) * w.v * dt; w.z -= Math.sin(yaw) * w.v * dt; }
    w.y = terrainH(w.x, w.z) + 0.14;
  }
}
// ---------- damage ----------
// a vehicle of the street hurt by an impact at speed k (m/s): past a point it stops for good
function vehHurt(v, k) {
  if (v.cop) return; v.hp = (v.hp == null ? 1 : v.hp) - Math.max(0, k - 2.4) * 0.075;
  if (v.hp <= 0 && !v.broken) breakVehicle(v);
}
function breakVehicle(v) {
  v.broken = true; v.v = 0; v.brake = 0; v.brokeT = G.t; v.hp = 0;
  const lx = Math.cos(v.yaw), lz = -Math.sin(v.yaw), sc = kindBase(v.kind) === 'scooter';
  freeWalker('person' + Math.floor(Math.random() * (STYLE.toon ? TPEOPLE.length : 8)), v.x + lx * (sc ? 1 : v.W / 2 + 0.5), v.z + lz * (sc ? 1 : v.W / 2 + 0.5), v.y, sc ? 2.2 : 0.6, 7);
}
// the player's vehicle: power falls away with the damage, the engine dies at the end; smoke tells how bad it is
const DMG = { emitT: 0, said: false };
function carDamageTick(dt) {
  const C = CAR; if (!C.P) return;
  if (!C.broken && C.damage >= 1) {
    C.broken = true; if (!HERO.on) { engineStop(); hudMsg('引擎掛了！', '按「下車」，換一台吧', '#ff4f6d', 3); sfxCrash(0.6); }
  }
  // smoke out of the engine (the front, or a scooter's back)
  if (C.damage > 0.42) {
    DMG.emitT -= dt;
    if (DMG.emitT <= 0) {
      const k = clamp((C.damage - 0.42) / 0.58, 0, 1); DMG.emitT = lerp(0.5, 0.13, k);
      const off = C.spec.base === 'scooter' ? -0.5 : (C.P.a + 0.25), x = C.x + Math.sin(C.yaw) * off, z = C.z + Math.cos(C.yaw) * off;
      fxPuff(x, C.y + (C.spec.base === 'bus' || C.spec.base === 'gravel' ? 2.2 : 1.0), z, C.broken || C.damage > 0.92 ? 'smoke2' : C.damage > 0.7 ? 'smoke1' : 'smoke0', 0.45 + k * 0.35, 1.8);
    }
  }
}
// ---------- the little particles: smoke rising and spreading, a punch's burst ----------
const FXP = { list: [], max: 240, emitT: 0 };
function fxPuff(x, y, z, kind, s, life) { if (FXP.list.length >= FXP.max) FXP.list.shift(); FXP.list.push({ x, y, z, vx: (Math.random() - 0.5) * 0.5, vy: 1.1 + Math.random() * 0.5, vz: (Math.random() - 0.5) * 0.5, t: 0, life: life || 2.2, s0: s || 0.7, kind }); }
function fxPow(x, y, z) { if (FXP.list.length >= FXP.max) FXP.list.shift(); FXP.list.push({ x, y, z, vx: 0, vy: 0, vz: 0, t: 0, life: 0.32, s0: 0.9, kind: 'pow', pop: true }); }
function fxTick(dt) {
  const L = FXP.list;
  for (let i = L.length - 1; i >= 0; i--) { const p = L[i]; p.t += dt; if (p.t >= p.life) { L.splice(i, 1); continue; } p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt; p.vy *= Math.pow(0.6, dt); }
  // the wrecks on the street smoke, black; the ones only hurt, grey now and then
  FXP.emitT -= dt; if (FXP.emitT > 0) return; FXP.emitT = 0.22;
  const cam = R3.cam ? R3.cam.position : CAR;
  for (const v of TR.veh) {
    if (!(v.broken || (v.hp != null && v.hp < 0.5))) continue; const dx = v.x - cam.x, dz = v.z - cam.z; if (dx * dx + dz * dz > 140 * 140) continue;
    if (!v.broken && Math.random() < 0.6) continue;
    const off = kindBase(v.kind) === 'scooter' ? -0.4 : v.L * 0.32;
    fxPuff(v.x + Math.sin(v.yaw) * off, v.y + (v.type === 'bus' || v.type === 'truck' ? 2 : 1.0), v.z + Math.cos(v.yaw) * off, v.broken && G.t - v.brokeT < 40 ? 'smoke2' : 'smoke1', 0.7, 2.2);
  }
  for (const p of PARK) if (p.damage > 0.6 && Math.random() < 0.5) fxPuff(p.x + Math.sin(p.yaw) * p.spec.L * 0.3, p.y + 1, p.z + Math.cos(p.yaw) * p.spec.L * 0.3, p.broken ? 'smoke2' : 'smoke1', 0.6, 2.0);
}
// ---------- the start of a drive: everything from the last one cleared away ----------
function footReset() {
  HERO.on = false; HERO.go = null; HERO.down = 0; HERO.punchT = 0;
  for (const p of PARK.slice()) parkDrop(p); FREEW.length = 0; FXP.list.length = 0; DMG.emitT = 0;
  if (CAR.slotP) { r3SlotFree(CAR.slotP); CAR.slotP = null; } CAR.broken = false; CAR.kind = null;
}
// the parked ones are let go once far behind
function parkTick() { const P = plr(); for (const p of PARK.slice()) if (Math.hypot(p.x - P.x, p.z - P.z) > 650) parkDrop(p); }

// ---------- the pause menu's helps ----------
// the hero back on the pavement of the nearest road
function heroToRoad() { const H = HERO, n = nearestRoad(H.x, H.z, H.y); if (!n) return; const lx = Math.cos(n.yaw), lz = -Math.sin(n.yaw); H.x = n.x + lx * (n.e.w / 2 + 1.2); H.z = n.z + lz * (n.e.w / 2 + 1.2); H.y = groundH(H.x, H.z, n.e.h0 || 0); H.vx = H.vz = H.spd = 0; H.down = 0; H.go = null; CAMV.yawS = H.yaw; }
// a fresh one of the car picked in the showroom, brought to the kerb beside the player (the old one is left where it is)
function callCar() {
  if (G.mode !== 'drive') return; const P = plr(), n = nearestRoad(P.x, P.z, P.y); if (!n) return;
  if (CAR.P) { PARK.push(parkSnapshot()); CAR.slot = null; CAR.slotP = null; while (PARK.length > 2) parkDrop(PARK[0]); }
  const spec = CARS[G.carIdx || 0]; carSetup(spec, SET.auto);
  const rx = -Math.cos(n.yaw), rz = Math.sin(n.yaw), C = CAR; C.x = n.x + rx * n.e.w * 0.3; C.z = n.z + rz * n.e.w * 0.3; C.yaw = n.yaw; C.y = groundH(C.x, C.z, n.e.h0 || 0); C.kind = null;
  r3CarSet(spec); HERO.on = false; HERO.go = null; camReset(); if (AU.ctx) engineStart(spec.engine);
  hudMsg('新車送到了', null, '#7cf26a', 1.5);
}
