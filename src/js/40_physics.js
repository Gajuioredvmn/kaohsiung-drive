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
  C.surface = groundKind(C.x, C.z); C.mu = GK_MU[C.surface]; const gdrag = GK_DRAG[C.surface];
  // ---- steering: the wheel moves at a finite rate, and less lock is available at speed ----
  const vfwd = Math.max(0, C.vx), lockK = 1 / (1 + vfwd * vfwd / 900);
  const target = C.steerIn * P.steerMax * (0.35 + 0.65 * lockK);
  C.steer += clamp(target - C.steer, -P.steerRate * dt, P.steerRate * dt);
  // ---- gearbox ----
  if (C.shiftT > 0) C.shiftT -= dt;
  const ratio = P.ratios[C.gear - 1] * P.final;
  const wheelRpm = (C.vx / P.rw) * 60 / TAU, rpmFromWheels = wheelRpm * ratio;
  // the clutch is out except during a shift; pulling away the engine sits near the idle until the wheels catch up
  const clutchIn = C.shiftT > 0;
  if (clutchIn) C.rpm = lerp(C.rpm, P.idle + C.throttle * (P.red * 0.8 - P.idle), clamp(dt * 7, 0, 1));
  else C.rpm = lerp(C.rpm, Math.max(P.idle + C.throttle * 900 * clamp(1 - C.vx / 4, 0, 1), rpmFromWheels), clamp(dt * 30, 0, 1));
  C.rpm = clamp(C.rpm, P.idle * 0.6, P.red * 1.03);
  if (C.auto && C.shiftT <= 0 && C.vx > 2) { if (C.rpm > P.red * 0.96 && C.gear < P.ratios.length) carShift(C.gear + 1); else if (C.rpm < P.red * 0.42 && C.gear > 1 && C.throttle < 0.95) carShift(C.gear - 1); else if (C.rpm < P.red * 0.3 && C.gear > 1) carShift(C.gear - 1); }
  const Teng = clutchIn ? 0 : engineTorque(P, C.rpm, C.throttle);
  const Fdrive = (Teng * ratio) / P.rw;
  // ---- loads: static split, then the transfer from acceleration (last step's) ----
  const g = 9.81, Wt = P.m * g, FzF0 = Wt * P.b / P.L, FzR0 = Wt * P.a / P.L;
  const dLon = (P.m * C.aLon * P.h) / P.L, FzF = Math.max(0.05 * Wt, FzF0 - dLon), FzR = Math.max(0.05 * Wt, FzR0 + dLon);
  C.loadF = FzF / Wt;
  // ---- slip angles at each axle ----
  const vxs = Math.max(Math.abs(C.vx), 1.5) * Math.sign(C.vx || 1);
  const aF = Math.atan2(C.vy + P.a * C.r, vxs) - C.steer, aR = Math.atan2(C.vy - P.b * C.r, vxs);
  // ---- longitudinal demand per axle: drive on the driven axle, brakes on both (60/40), handbrake locks the rear ----
  const Fb = P.brakeF * C.brake;
  let FxF = -Fb * 0.62, FxR = -Fb * 0.38;
  if (P.drive === 'rwd') FxR += Fdrive; else if (P.drive === 'fwd') FxF += Fdrive; else { FxF += Fdrive * 0.4; FxR += Fdrive * 0.6; }
  if (C.vx < 0.3 && FxF + FxR < 0 && C.throttle < 0.05) { FxF = FxR = 0; }   // brakes hold a standing car, they do not pull it backwards
  // the demand becomes a slip ratio the tyre curve answers: a saturated tyre spins or locks, and gives less
  const muF = P.mu * C.mu, muR = P.mu * C.mu;
  const kF = clamp(FxF / Math.max(1, muF * FzF * P.cs * 2.2), -1.2, 1.2), kR = C.hand > 0.5 ? -1.5 : clamp(FxR / Math.max(1, muR * FzR * P.cs * 2.2), -1.2, 1.2);
  const tf = tyreForce(FzF, kF, aF, muF, P.cs), FxFt = tf[0], FyFt = tf[1];
  const tr = tyreForce(FzR, kR, aR, C.hand > 0.5 ? muR * 0.72 : muR, P.cs), FxRt = tr[0], FyRt = tr[1];
  // wheelspin and lock-up for the sound and the smoke
  C.slipF = clamp(Math.abs(aF) / 0.2 + Math.abs(kF), 0, 2); C.slipR = clamp(Math.abs(aR) / 0.2 + Math.abs(kR), 0, 2); C.slipK = Math.max(C.slipF, C.slipR);
  // ---- sum in the body frame; the front tyre's force turns with the wheel ----
  const cs = Math.cos(C.steer), sn = Math.sin(C.steer);
  const Fx = FxFt * cs - FyFt * sn + FxRt, Fy = FxFt * sn + FyFt * cs + FyRt;
  const Mz = P.a * (FxFt * sn + FyFt * cs) - P.b * FyRt;
  // drag and rolling resistance, plus the ground's own drag (grass, sand, water)
  const v2 = C.vx * Math.abs(C.vx), Fdrag = -0.5 * 1.2 * P.cdA * v2 - P.rr * Wt * Math.sign(C.vx) * clamp(Math.abs(C.vx) * 4, 0, 1) - gdrag * Wt * Math.sign(C.vx) * clamp(Math.abs(C.vx), 0, 1);
  const ax = (Fx + Fdrag) / P.m + C.vy * C.r, ay = Fy / P.m - C.vx * C.r;
  C.aLon = (Fx + Fdrag) / P.m; C.aLat = Fy / P.m;
  C.vx += ax * dt; C.vy += ay * dt; C.r += (Mz / P.Iz) * dt;
  // at a crawl the slip model loses meaning: blend toward the kinematic bicycle (the rear axle rolls without slip)
  const slow = clamp(1 - Math.abs(C.vx) / 4, 0, 1);
  if (slow > 0) { const rk = (C.vx * Math.tan(C.steer)) / P.L, vyk = rk * P.b; C.r = lerp(C.r, rk, slow); C.vy = lerp(C.vy, vyk, slow); }
  if (Math.abs(C.vx) < 0.15 && C.throttle < 0.05) { C.vx = 0; C.vy = 0; C.r = 0; }
  // ---- integrate the pose ----
  C.yaw += C.r * dt;
  const sy = Math.sin(C.yaw), cy = Math.cos(C.yaw);
  C.x += (C.vx * sy + C.vy * cy) * dt; C.z += (C.vx * cy - C.vy * sy) * dt;
  C.y = terrainH(C.x, C.z);
  C.kmh = Math.abs(C.vx) * 3.6;
  // a smear of the tyre marks the renderer lays down
  if (C.slipK > 1.05 && Math.abs(C.vx) > 3) { C.trail.push([C.x, C.z, C.yaw, 1]); if (C.trail.length > 400) C.trail.shift(); }
  // the world's edges and the water: a hard stop at the map's rim, a drowning drag in the water
  if (C.x < 4) { C.x = 4; C.vx *= 0.3; } if (C.z < 4) { C.z = 4; C.vx *= 0.3; } if (C.x > MAP.W - 4) { C.x = MAP.W - 4; C.vx *= 0.3; } if (C.z > MAP.W - 4) { C.z = MAP.W - 4; C.vx *= 0.3; }
  propsCollide(dt);
}
// hitting the solid things of the map: pushed out along the shortest way, the speed into it lost, a jolt
function propsCollide(dt) {
  const C = CAR; const near = propsNear(C.x, C.z, 12); if (!near.length) return;
  const sy = Math.sin(C.yaw), cy = Math.cos(C.yaw), hl = C.P.L * 0.8, hw = C.P.W * 0.5;
  for (const p of near) {
    // the car as a box in the prop's frame (props are axis-aligned boxes or circles)
    if (p.r) {
      const dx = C.x - p.x, dz = C.z - p.z, d = Math.hypot(dx, dz), min = p.r + hw * 0.9;
      if (d < min) { const nx = dx / (d || 1), nz = dz / (d || 1); C.x = p.x + nx * min; C.z = p.z + nz * min; carBounce(nx, nz); }
    } else {
      const cx = clamp(C.x, p.x0, p.x1), cz = clamp(C.z, p.z0, p.z1), dx = C.x - cx, dz = C.z - cz, d = Math.hypot(dx, dz);
      // the car's own extent toward the box: a corner's reach
      const reach = hw * 0.95 + (Math.abs(sy) * hl + Math.abs(cy) * hw - hw * 0.95) * 0.5;
      if (d < reach) {
        let nx, nz; if (d > 0.01) { nx = dx / d; nz = dz / d; } else { const toL = C.x - p.x0, toR = p.x1 - C.x, toT = C.z - p.z0, toB = p.z1 - C.z, m = Math.min(toL, toR, toT, toB); nx = m === toL ? -1 : m === toR ? 1 : 0; nz = m === toT ? -1 : m === toB ? 1 : 0; }
        C.x = cx + nx * reach; C.z = cz + nz * reach; carBounce(nx, nz);
      }
    }
  }
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
