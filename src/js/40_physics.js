// ===================== the car: a planar rigid body on four tyres =====================
// Metres, kilograms, seconds. The body has mass, yaw inertia, a centre of gravity at some height between the axles;
// the four tyres each carry a load that shifts with braking, acceleration and cornering, and each gives a force from
// its slip (a Pacejka-style curve, with a friction circle so braking and cornering share the grip). The engine has a
// torque curve through a gearbox and a final drive; drag and rolling resistance take it back. Nothing here is faked
// with a curvature push: the car goes where the tyres send it.
const CAR = {
  spec: null, x: 1200, z: 1360, y: 0, yaw: 0, vx: 0, vy: 0, r: 0, rpm: 1000, gear: 1, auto: true, throttle: 0, brake: 0, hand: 0, steer: 0, steerIn: 0,
  slipF: 0, slipR: 0, slipK: 0, loadF: 0.5, aLon: 0, aLat: 0, surface: 0, mu: 1, air: 0, kmh: 0, shiftT: 0, damage: 0, wheelW: 0, crashT: 0,
  P: null, trail: [],
};
// a car's physical numbers from its arcade spec: the spec's 0..1 sliders become real quantities
function carPhysics(spec) {
  const m = 1050 + spec.mass * 900, L = spec.L * 0.62, W = spec.W * 0.82;
  const drive = spec.drive || (spec.acc > 0.8 ? 'rwd' : spec.grip > 0.8 ? 'awd' : spec.mass > 0.6 ? 'fwd' : 'rwd');
  const mid = spec.cockpit && spec.cockpit[0] < 0.4;   // a mid-engined car carries its weight further back
  const a = L * (mid ? 0.56 : drive === 'fwd' ? 0.42 : 0.5), b = L - a;
  const vtop = spec.top / 3.6;
  // engine: peak torque chosen so the top speed is reached at the redline in top gear against drag
  const red = (spec.engine === 'v12' ? 8200 : spec.engine === 'i4' || spec.engine === 'turbo' ? 7200 : 6800), rw = 0.32;
  const gearsN = spec.gears, ratios = []; for (let g = 1; g <= gearsN; g++) ratios.push(3.4 * Math.pow(0.72, g - 1) * (gearsN === 5 ? 1.08 : 1));
  const cdA = 0.35 * (1.8 + spec.W * 0.3) * 0.55, rr = 0.012;
  const final = (red / 60) * TAU * rw / (vtop * ratios[gearsN - 1]) / 1.05;
  const dragTop = 0.5 * 1.2 * cdA * vtop * vtop + rr * m * 9.81, pk = (dragTop * rw) / (ratios[gearsN - 1] * final) / 0.78;   // Nm at the engine, top gear at the redline is 78% of peak
  const Tpeak = pk * (1 + 0.55 * spec.acc);
  return { m, L, W, a, b, h: 0.42 + 0.12 * (1 - spec.grip), Iz: m * (L * L + W * W) / 12 * 1.15, drive, mu: 0.88 + 0.32 * spec.grip, cs: 9 + 6 * spec.grip, cdA, rr, rw, red, idle: 950, ratios, final, Tpeak, brakeF: m * 9.81 * (1.05 + 0.25 * spec.grip), steerMax: (28 + 10 * spec.steer) * D2R, steerRate: 2.4 + 2.0 * spec.steer, engI: 0.25 };
}
function carSetup(spec, auto) {
  CAR.spec = spec; CAR.P = carPhysics(spec); CAR.auto = auto !== false;
  Object.assign(CAR, { vx: 0, vy: 0, r: 0, rpm: CAR.P.idle, gear: 1, throttle: 0, brake: 0, hand: 0, steer: 0, slipF: 0, slipR: 0, slipK: 0, damage: 0, crashT: 0, trail: [] });
}
// engine torque at this rpm and throttle, with a touch of engine braking off the throttle
function engineTorque(P, rpm, th) {
  const r = rpm / P.red, curve = clamp(0.45 + 1.4 * r - 0.95 * r * r, 0.3, 1.0);
  const drive = P.Tpeak * curve * th * (rpm >= P.red ? 0 : 1);
  const brake = -P.Tpeak * 0.12 * (0.3 + 0.7 * r) * (1 - th);
  return drive + brake;
}
// one tyre: load Fz, longitudinal slip ratio κ, slip angle α, friction μ → forces along and across the tyre
const _tf = [0, 0];
function tyreForce(Fz, kappa, alpha, mu, cs) {
  if (Fz <= 0) { _tf[0] = 0; _tf[1] = 0; return _tf; }
  const peak = mu * Fz;
  // combined slip: the two demands are compared against the one circle of grip
  const sx = kappa * cs * 2.2, sy = Math.tan(alpha) * cs, s = Math.hypot(sx, sy);
  const B = 1.0, C = 1.55, f = s < 1e-6 ? 0 : Math.sin(C * Math.atan(B * s)) * (1 - 0.06 * clamp(s - 1, 0, 3));   // past the peak the grip falls away a little
  const F = peak * f;
  _tf[0] = s < 1e-6 ? 0 : F * sx / s; _tf[1] = s < 1e-6 ? 0 : -F * sy / s;   // drive slip pulls forward; a positive slip angle pushes the tyre the other way
  return _tf;
}
function carShift(g) { if (g < 1 || g > CAR.P.ratios.length || g === CAR.gear) return; CAR.gear = g; CAR.shiftT = 0.18; }
function carStep(dt) {
  const C = CAR, P = C.P; if (!P) return;
  // the ground under each end, and what it is made of
  // (GH.tunnel is set by the last groundH call anywhere, so it is asked here for the car's own spot)
  groundH(C.x, C.z, C.y); C.inTunnel = GH.tunnel;
  C.surface = C.inTunnel ? GK.asphalt : groundKind(C.x, C.z); C.mu = GK_MU[C.surface]; const gdrag = GK_DRAG[C.surface];
  // ---- steering: the wheel moves at a finite rate, and less lock is available at speed ----
  // the input is right-positive; the body frame's steer is left-positive. Small tilts give fine steering (the input
  // is raised to a power), and the lock on offer shrinks with speed so a full tilt at 80 km/h is a lane change, not a spin
  const vfwd = Math.max(0, C.vx), lockK = Math.max(0.1, 1 / (1 + vfwd / 9));
  const inp = Math.sign(C.steerIn) * Math.pow(Math.abs(C.steerIn), 1.5);
  const target = -inp * P.steerMax * lockK;
  C.steer += clamp(target - C.steer, -P.steerRate * dt, P.steerRate * dt);
  // ---- reverse: standing still, the brake pedal held with no throttle puts it in R; the throttle takes it back to 1 ----
  if (Math.abs(C.vx) < 0.4) { if (C.brake > 0.3 && C.throttle < 0.05) { C.revT = (C.revT || 0) + dt; if (C.revT > 0.35) C.rev = true; } else C.revT = 0; if (C.throttle > 0.3 && C.brake < 0.05) C.rev = false; }
  let th = C.throttle, br = C.brake;
  if (C.rev) { th = C.brake; br = C.throttle; }   // in reverse the pedals swap roles: the brake pedal is the reverse throttle
  // ---- gearbox ----
  if (C.shiftT > 0) C.shiftT -= dt;
  const ratio = (C.rev ? -P.ratios[0] * 1.1 : P.ratios[C.gear - 1]) * P.final;
  const wheelRpm = (Math.abs(C.vx) / P.rw) * 60 / TAU, rpmFromWheels = wheelRpm * Math.abs(ratio);
  // the clutch is out except during a shift; pulling away the engine sits near the idle until the wheels catch up
  const clutchIn = C.shiftT > 0;
  if (clutchIn) C.rpm = lerp(C.rpm, P.idle + th * (P.red * 0.8 - P.idle), clamp(dt * 7, 0, 1));
  else C.rpm = lerp(C.rpm, Math.max(P.idle + th * 900 * clamp(1 - Math.abs(C.vx) / 4, 0, 1), rpmFromWheels), clamp(dt * 30, 0, 1));
  C.rpm = clamp(C.rpm, P.idle * 0.6, P.red * 1.03);
  if (C.auto && !C.rev && C.shiftT <= 0 && C.vx > 2) { if (C.rpm > P.red * 0.96 && C.gear < P.ratios.length) carShift(C.gear + 1); else if (C.rpm < P.red * 0.42 && C.gear > 1 && th < 0.95) carShift(C.gear - 1); else if (C.rpm < P.red * 0.3 && C.gear > 1) carShift(C.gear - 1); }
  if (C.rev && C.gear !== 1) C.gear = 1;
  const Teng = clutchIn ? 0 : engineTorque(P, C.rpm, th);
  const Fdrive = (Teng * ratio) / P.rw;
  // ---- loads: static split, then the transfer from acceleration (last step's) ----
  const g = 9.81, Wt = P.m * g, FzF0 = Wt * P.b / P.L, FzR0 = Wt * P.a / P.L;
  const dLon = (P.m * C.aLon * P.h) / P.L, FzF = Math.max(0.05 * Wt, FzF0 - dLon), FzR = Math.max(0.05 * Wt, FzR0 + dLon);
  C.loadF = FzF / Wt;
  // ---- slip angles at each axle ----
  // each axle's velocity in its wheel's own frame (the front wheel is turned by the steer angle); the slip angle is the
  // lateral part against the magnitude of the rolling part, so it stays sane rolling backward too (a car nudged back off
  // a wall used to get slip angles of ninety degrees, every tyre saturated sideways, and no drive left to pull away)
  const cs0 = Math.cos(C.steer), sn0 = Math.sin(C.steer), vfy = C.vy + P.a * C.r;
  const vFl = C.vx * cs0 + vfy * sn0, vFt = vfy * cs0 - C.vx * sn0;
  // at a crawl the slip angles mean little (the kinematic blend below steers the car), so they fade out, which also keeps the friction circle free for pulling away
  const lowK = clamp(Math.abs(C.vx) / 1.5, 0.1, 1);
  const aF = Math.atan2(vFt, Math.max(Math.abs(vFl), 0.3)) * lowK, aR = Math.atan2(C.vy - P.b * C.r, Math.max(Math.abs(C.vx), 0.3)) * lowK;
  // ---- longitudinal demand per axle: drive on the driven axle, brakes on both (60/40), handbrake locks the rear ----
  const Fb = P.brakeF * br * (C.vx < 0 ? -1 : 1);
  let FxF = -Fb * 0.62, FxR = -Fb * 0.38;
  if (P.drive === 'rwd') FxR += Fdrive; else if (P.drive === 'fwd') FxF += Fdrive; else { FxF += Fdrive * 0.4; FxR += Fdrive * 0.6; }
  if (Math.abs(C.vx) < 0.3 && th < 0.05 && br > 0) { FxF = FxR = 0; }   // brakes hold a standing car, they do not pull it the other way
  // the demand becomes a slip ratio the tyre curve answers: a saturated tyre spins or locks, and gives less
  const muF = P.mu * C.mu, muR = P.mu * C.mu;
  const kF = clamp(FxF / Math.max(1, muF * FzF * P.cs * 2.2), -1.2, 1.2), kR = C.hand > 0.5 ? -1.5 : clamp(FxR / Math.max(1, muR * FzR * P.cs * 2.2), -1.2, 1.2);
  const tf = tyreForce(FzF, kF, aF, muF, P.cs), FxFt = tf[0], FyFt = tf[1];
  const tr = tyreForce(FzR, kR, aR, C.hand > 0.5 ? muR * 0.72 : muR, P.cs), FxRt = tr[0], FyRt = tr[1];
  // wheelspin and lock-up for the sound and the smoke
  const spd = clamp((Math.abs(C.vx) - 3) / 4, 0, 1);   // a crawling car is not sliding, whatever the angles say
  C.slipF = clamp(Math.abs(aF) / 0.2 + Math.abs(kF), 0, 2) * spd; C.slipR = clamp(Math.abs(aR) / 0.2 + Math.abs(kR), 0, 2) * spd; C.slipK = Math.max(C.slipF, C.slipR);
  // ---- sum in the body frame; the front tyre's force turns with the wheel ----
  const cs = Math.cos(C.steer), sn = Math.sin(C.steer);
  const Fx = FxFt * cs - FyFt * sn + FxRt, Fy = FxFt * sn + FyFt * cs + FyRt;
  const Mz = P.a * (FxFt * sn + FyFt * cs) - P.b * FyRt;
  // drag and rolling resistance, plus the ground's own drag (grass, sand, water)
  const v2 = C.vx * Math.abs(C.vx), Fdrag = -0.5 * 1.2 * P.cdA * v2 - P.rr * Wt * Math.sign(C.vx) * clamp(Math.abs(C.vx) * 4, 0, 1) - gdrag * Wt * Math.sign(C.vx) * clamp(Math.abs(C.vx), 0, 1);
  const ax = (Fx + Fdrag) / P.m + C.vy * C.r, ay = Fy / P.m - C.vx * C.r;
  if (window.__dbgPhys) C.dbg = { aF, aR, kF, kR, FxFt, FyFt, FxRt, FyRt, Fx, Fy, Mz, Fdrive, Teng, rpm: C.rpm, Fdrag, steer: C.steer, lowK, FzF, FzR };
  C.aLon = (Fx + Fdrag) / P.m; C.aLat = Fy / P.m;
  C.vx += ax * dt; C.vy += ay * dt; C.r += (Mz / P.Iz) * dt;
  // the drift assist: once the tail is well out, the yaw is damped so a slide can be held and gathered up, not spun
  if (C.assist !== false) { const beta = Math.abs(Math.atan2(C.vy, Math.max(2, Math.abs(C.vx)))); if (beta > 0.25) { const k = clamp((beta - 0.25) / 0.5, 0, 1); C.r -= C.r * k * 2.2 * dt; if (Math.sign(C.steer) === -Math.sign(C.r) && Math.abs(C.steer) > 0.05) C.vy -= C.vy * k * 1.5 * dt; } }
  // at a crawl the slip model loses meaning: blend toward the kinematic bicycle (the rear axle rolls without slip)
  const slow = clamp(1 - Math.abs(C.vx) / 4, 0, 1);
  if (slow > 0) { const rk = (C.vx * Math.tan(C.steer)) / P.L, vyk = rk * P.b; C.r = lerp(C.r, rk, slow); C.vy = lerp(C.vy, vyk, slow); }
  if (Math.abs(C.vx) < 0.15 && th < 0.05) { C.vx = 0; C.vy = 0; C.r = 0; }
  // ---- integrate the pose ----
  C.yaw += C.r * dt;
  const sy = Math.sin(C.yaw), cy = Math.cos(C.yaw);
  C.x += (C.vx * sy + C.vy * cy) * dt; C.z += (C.vx * cy - C.vy * sy) * dt;
  // the ground under the car, which may be a viaduct; off an edge it falls
  const gh = groundH(C.x, C.z, C.y);
  if (C.y > gh + 0.08) { C.vyv = (C.vyv || 0) - 9.81 * dt; C.y += C.vyv * dt; if (C.y <= gh) { C.y = gh; if (C.vyv < -3) { C.vx *= 0.85; if (typeof onCarHit === 'function') onCarHit(-C.vyv * 0.6); } C.vyv = 0; } }
  else { if (gh - C.y > 0.5 && Math.abs(C.vx) > 1) { /* a step up: a kerb or a ramp foot */ } C.y = gh; C.vyv = 0; }
  // bumping up onto the pavement costs speed and shakes the car
  if (C.surface === GK.walk && C.lastSurface === GK.asphalt && Math.abs(C.vx) > 2) { C.vx *= 0.88; C.vy *= 0.7; if (typeof onKerb === 'function') onKerb(); }
  C.lastSurface = C.surface;
  C.kmh = Math.abs(C.vx) * 3.6;
  if (C.rev && C.vx > 1) C.rev = false;
  // a smear of the tyre marks the renderer lays down
  if (C.slipK > 1.05 && Math.abs(C.vx) > 3) { C.trail.push([C.x, C.z, C.yaw, 1]); if (C.trail.length > 400) C.trail.shift(); }
  // the world's edges and the water: a hard stop at the map's rim, a drowning drag in the water
  if (C.x < 4) { C.x = 4; C.vx *= 0.3; } if (C.z < 4) { C.z = 4; C.vx *= 0.3; } if (C.x > MAP.W - 4) { C.x = MAP.W - 4; C.vx *= 0.3; } if (C.z > MAP.W - 4) { C.z = MAP.W - 4; C.vx *= 0.3; }
  propsCollide(dt);
}
// hitting the solid things of the city: the car is two discs, one over each axle; each is pushed out of any box
// (oriented) or post (round) it overlaps, along the shortest way, and the speed into it is lost with a jolt
function propsCollide(dt) {
  const C = CAR, near = solidsNear(C.x, C.z, 10); if (!near.length) return;
  const sy = Math.sin(C.yaw), cy = Math.cos(C.yaw), rc = C.P.W * 0.5 * 0.95;
  for (let k = 0; k < 2; k++) {
    const off = k === 0 ? C.P.a * 0.95 : -C.P.b * 0.95, px = C.x + sy * off, pz = C.z + cy * off;
    for (const s of near) {
      if (C.y > s.y0 + (s.h == null ? 100 : s.h) + 0.2 || C.y < s.y0 - 2.5) continue;   // above it (a deck over a street) or below it (a tunnel under a block)
      let nx, nz, pen;
      if (s.r != null) { const dx = px - s.x, dz = pz - s.z, d = Math.hypot(dx, dz), min = s.r + rc; if (d >= min) continue; nx = d > 1e-3 ? dx / d : 1; nz = d > 1e-3 ? dz / d : 0; pen = min - d; }
      else {
        const c = Math.cos(s.yaw), sn = Math.sin(s.yaw), dx = px - s.x, dz = pz - s.z, lu = dx * c - dz * sn, lv = dx * sn + dz * c;
        if (Math.abs(lu) > s.hx + rc || Math.abs(lv) > s.hz + rc) continue;
        const cu = clamp(lu, -s.hx, s.hx), cv = clamp(lv, -s.hz, s.hz), du = lu - cu, dv = lv - cv, d = Math.hypot(du, dv);
        if (d >= rc) continue;
        let lnx, lnz;
        if (d > 1e-3) { lnx = du / d; lnz = dv / d; pen = rc - d; }
        else { const toL = lu + s.hx, toR = s.hx - lu, toT = lv + s.hz, toB = s.hz - lv, m = Math.min(toL, toR, toT, toB); lnx = m === toL ? -1 : m === toR ? 1 : 0; lnz = m === toT ? -1 : m === toB ? 1 : 0; pen = m + rc; }
        nx = lnx * c + lnz * sn; nz = -lnx * sn + lnz * c;
      }
      C.x += nx * pen; C.z += nz * pen; carBounce(nx, nz);
    }
  }
}
// is the point inside a solid lower than y? (for the camera)
function solidAt(x, y, z, pad) {
  for (const s of solidsNear(x, z, 4)) {
    if (y > s.y0 + (s.h == null ? 100 : s.h) || y < s.y0 - 1) continue; if (s.h == null && s.r != null && s.r < 0.6) continue;
    if (s.r != null) { if (Math.hypot(x - s.x, z - s.z) < s.r + (pad || 0)) return s; continue; }
    const c = Math.cos(s.yaw), sn = Math.sin(s.yaw), dx = x - s.x, dz = z - s.z, lu = dx * c - dz * sn, lv = dx * sn + dz * c;
    if (Math.abs(lu) < s.hx + (pad || 0) && Math.abs(lv) < s.hz + (pad || 0)) return s;
  }
  return null;
}
function carBounce(nx, nz) {
  const C = CAR, sy = Math.sin(C.yaw), cy = Math.cos(C.yaw);
  // world velocity, the part into the wall removed and a little given back
  let wx = C.vx * sy + C.vy * cy, wz = C.vx * cy - C.vy * sy;
  const into = wx * nx + wz * nz;
  if (into >= 0) return;
  wx -= into * nx * 1.25; wz -= into * nz * 1.25;
  C.vx = wx * sy + wz * cy; C.vy = wx * cy - wz * sy;
  C.r *= 0.5; C.r += (Math.random() - 0.5) * Math.min(2, -into * 0.08);
  C.crashT = Math.max(C.crashT, Math.min(1, -into / 12));
  C.damage = Math.min(1, C.damage + Math.max(0, -into - 2) * 0.012);
  if (typeof onCarHit === 'function') onCarHit(-into);
}
