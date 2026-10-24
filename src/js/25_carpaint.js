// ===================== the cars, pixel by pixel =====================
// Each car is painted from behind (the race view) and from the side (showroom and endings) straight from its numbers:
// width, tail height, the shape of the deck, its tail lights, its extras and its two passengers.
// Steering frames lean the top of the car into the turn and show a strip of its flank.
const CAR_STEERS = [-2, -1, 0, 1, 2];        // full left, half left, straight, half right, full right
const CPX = 68;                            // pixels per metre across the car in the race view; frames are drawn 1:1
const CFW = 224, CFH = 124, CGY = 112;     // frame size, and the row the rear tyres stand on
const CAR_REAR = 1.3;                      // the rear wheels' contact line lies this far behind PC.s
function carPal(col) {
  // six steps from shadow to highlight, saturated, the way arcade sprites are coloured
  const pale = ((col >> 16) & 255) + ((col >> 8) & 255) + (col & 255) > 600;
  return pale ? [0x40465a, 0x6c7284, 0x9aa0ae, col, mixHex(col, 0xffffff, 0.6), 0xffffff]
    : [shadeHex(col, 0.4), shadeHex(col, 0.6), shadeHex(col, 0.82), col, mixHex(col, 0xffffff, 0.3), mixHex(col, 0xffffff, 0.6)];
}
const OUTL = 0x140a1a;
// ---------- one passenger seen from behind: the back of the head above the seat ----------
function paintHeadBack(px, x, y, o, phase) {
  // x, y: the centre of the head
  if (o.dog) {
    const fur = [0x7a3e14, 0xb86a2e, 0xe0a058];
    px.ellipse(x, y + 1, 5.5, 5, fur[1]); px.rect(x - 3, y - 2, 5, 2, fur[2]);
    px.poly([x - 6, y - 1, x - 4, y - 8 + phase, x - 1, y - 2], fur[0]); px.poly([x + 1, y - 2, x + 4, y - 8 - phase, x + 6, y - 1], fur[0]);
    px.rect(x - 5, y + 5, 10, 1, 0xd8242a);
    return;
  }
  const hair = o.hair || 0x1a1410, H = [shadeHex(hair, 0.62), hair, mixHex(shadeHex(hair, 1.6), 0xffffff, 0.18)];
  const sh = o.shirt || 0xffffff, skin = o.skin || 0xf2c8a0;
  // shoulders over the seat back
  px.ellipse(x, y + 9, 9, 3.5, shadeHex(sh, 0.9)); px.rect(x - 8, y + 6, 16, 2, sh);
  px.rect(x - 1, y + 4, 3, 2, shadeHex(skin, 0.85));
  if (o.style === 'long' || o.veil) {
    const c = o.veil ? [0xc8ccd8, 0xeef0f6, 0xffffff] : H;
    for (let i = 0; i < 5; i++) { const sx = x - 5 + i * 2.4, wv = Math.round(Math.sin(phase * 3 + i * 1.4)); px.rect(sx + wv, y + 1, 2, 6 + (i % 2) * 2, c[1 + (i & 1)]); }
    if (o.veil) { px.poly([x - 7, y - 1, x + 7, y - 1, x + 11 + phase, y + 11, x - 11 + phase, y + 11], 0xf4f6fc); px.rect(x - 7, y + 10, 17, 1, 0xd8dce8); }
  }
  if (o.style === 'cap') {
    px.ellipse(x, y + 0.5, 5.5, 5.5, H[1]);
    px.ellipse(x, y - 1, 5.6, 4.4, o.capCol || 0xd8242a); px.rect(x - 5, y + 1, 10, 1, shadeHex(o.capCol || 0xd8242a, 0.6));
    px.rect(x - 2, y - 4, 3, 1, mixHex(o.capCol || 0xd8242a, 0xffffff, 0.5));
    return;
  }
  const C = o.style === 'old' ? [0x9a9a94, 0xc8c8c0, 0xf0f0e8] : H;
  px.ellipse(x, y, 5.5, 6.5, C[1]);
  px.rect(x - 5, y + 3, 10, 2, C[0]);                        // the shade at the nape
  px.rect(x - 2, y - 5, 4, 1, C[2]); px.rect(x - 4, y - 4, 3, 1, C[2]);   // a gleam on top
  px.set(x - 6, y + 1, skin); px.set(x + 5, y + 1, skin);   // ears
  if (o.style === 'bob') { px.rect(x - 6, y, 12, 5, C[1]); px.rect(x - 6, y + 4, 12, 1, C[0]); }
  if (o.style === 'pony') { const wv = Math.round(Math.sin(phase * 3) * 1.5); px.rect(x - 1 + wv, y + 5, 3, 5, C[1]); px.set(x + wv, y + 5, C[2]); }
  if (o.scarf) { const wv = Math.round(Math.sin(phase * 3 + 1) * 1.5); px.rect(x + 3, y + 5, 3, 2, o.scarf); px.rect(x + 6 + wv, y + 6, 5, 2, o.scarf); px.rect(x + 10 + wv * 2, y + 7, 3, 1, shadeHex(o.scarf, 0.75)); }
}
// ---------- the car as a small solid: a lofted body, four tyres, the cockpit, painted face by face in flat tones ----------
// Every frame is the same solid turned about its rear axle and seen from one fixed camera, so all five frames share
// one scale and one ground point. Surfaces take their tone from what they are (deck, shoulder, flank, tail), not from
// a lighting model, and the details are drawn on as pixel shapes: lamps, plate, pipes, mirrors, heads.
const CAR_YAW = [-0.62, -0.36, 0, 0.36, 0.62];   // the nose angle of each frame: full lock, half lock, straight (radians)
const CAM_S = { D: 6.2, H: 1.75 };                // the sprite camera: metres behind the rear axle, and its height
const VSQ = 0.86;                                 // bodies sit a touch lower than their side-view numbers
const REAR_OH = 0.62;                             // a short rear overhang, so the rear tyres stand out under the tail
function carGeo(spec) {
  if (spec._geo) return spec._geo;
  const L = spec.L, W = spec.W, w1 = spec.wheels[1], zA = REAR_OH, wb = L * (w1 - spec.wheels[0]);
  const zOf = (t) => (t >= w1 ? -zA * (t - w1) / (1 - w1) : (w1 - t) * L);
  const T = [1, 0.99, 0.965, 0.93, 0.88, 0.8, 0.7, 0.6, 0.5, 0.4, 0.3, 0.2, 0.1, 0.03, 0];
  const r0 = clamp(spec.rs || 0.08, 0.06, 0.2);
  const secs = T.map((t) => {
    const hw = (spec.a(t) * W) / 2, top = Math.max(spec.clear + 0.3, spec.yF(t) * VSQ);
    return { t, z: zOf(t), hw, top, bot: spec.clear + (t > 0.9 ? 0.16 : 0.06) + (t < 0.05 ? 0.04 : 0), r: Math.min(r0, hw * 0.35, (top - spec.clear) * 0.4), rb: 0.06 };
  });
  return (spec._geo = { L, W, zA, wb, secs, zOf, at: (t) => { for (let i = 1; i < secs.length; i++) if (t >= secs[i].t) { const a = secs[i - 1], b = secs[i], u = (a.t - t) / (a.t - b.t); return { z: lerp(a.z, b.z, u), hw: lerp(a.hw, b.hw, u), top: lerp(a.top, b.top, u), r: lerp(a.r, b.r, u) }; } return secs[secs.length - 1]; } });
}
function secPts(S) {
  const { hw, top, bot, r, rb } = S;
  return [[-hw + rb, bot], [hw - rb, bot], [hw, bot + rb], [hw, top - r], [hw - r, top], [-hw + r, top], [-hw, top - r], [-hw, bot + rb]];
}
// a convex polygon in (u, v) cut to the band v0 <= v < v1
function clipV(pts, v0, v1) {
  const cut = (P, v, keepAbove) => { const out = []; for (let i = 0; i < P.length; i++) { const a = P[i], b = P[(i + 1) % P.length], ia = keepAbove ? a[1] >= v : a[1] <= v, ib = keepAbove ? b[1] >= v : b[1] <= v; if (ia) out.push(a); if (ia !== ib) { const t = (v - a[1]) / (b[1] - a[1]); out.push([a[0] + (b[0] - a[0]) * t, v]); } } return out; };
  return cut(cut(pts, v0, true), v1, false);
}
function carMetrics(spec) { return { BW: Math.round(spec.W * CPX) }; }
// opt (the showroom turntable): { yaw, W, H, gy, D, camH, pivot, ppm } — any angle, a wider frame, a camera of its own
// set further back and lower and aimed at the car's middle, and the front wheels and the nose painted since they show
function paintCarRear(spec, steer, brake, phase, opt) {
  const O = opt || {}, CW = O.W || CFW, CH = O.H || CFH, GY = O.gy || CGY, D = O.D || CAM_S.D, HC = O.camH || CAM_S.H, PV = O.pivot || 0;
  const px = new Pix(CW, CH), cx = CW / 2, P = carPal(spec.color), G = carGeo(spec);
  const yaw = O.yaw == null ? CAR_YAW[steer + 2] : O.yaw, cy = Math.cos(yaw), sy = Math.sin(yaw), turn = O.yaw != null;
  const zT = G.secs[0].z, f = O.ppm ? O.ppm * D : CPX * (D + zT), Y0s = GY - (HC * f) / D;
  const chrome = !!spec.chrome, interior = spec.interior, crew = CREW[spec.id] || [];
  // car space (x right, y up, z forward, origin on the ground under the rear axle) to the sprite, turned about z = PV
  const pr = (x, y, z) => { const X = x * cy + (z - PV) * sy, d = -x * sy + (z - PV) * cy + D; return [cx + (X * f) / d, Y0s - ((y - HC) * f) / d, d]; };
  const depth = (x, z) => -x * sy + (z - PV) * cy + D;
  const camX = D * sy;   // where the camera stands, across the car
  const area = (q) => { let a = 0; for (let i = 0; i < q.length; i++) { const p = q[i], n = q[(i + 1) % q.length]; a += p[0] * n[1] - n[0] * p[1]; } return a; };
  const flat = (q) => { const o = []; for (const p of q) o.push(p[0], p[1]); return o; };
  const items = [];   // { d: depth, L: layer, draw() }
  let layer = turn ? 1 : 0;   // 0: the tyres, under everything; 1: the body and what sits on it (on the turntable the tyres sort with the body, so the near ones show)
  const face = (pts3, col, cull, dOff) => {
    const q = pts3.map((p) => pr(p[0], p[1], p[2]));
    if (cull !== false && area(q) <= 0.01) return;
    let d = 0; for (const p of q) d += p[2]; d /= q.length;
    items.push({ d: d + (dOff || 0), L: layer, draw: () => px.poly(flat(q), col) });
  };
  // ---- the shadow on the ground under the car, first of all ----
  { const a = G.secs[0], hw = a.hw + 0.06; px.poly(flat([pr(-hw, 0, zT - 0.08), pr(hw, 0, zT - 0.08), pr(hw, 0, G.wb + 0.5), pr(-hw, 0, G.wb + 0.5)]), 0x110e18); }
  // ---- tyres: octagonal drums; tread faces in three tones, the sidewall with its rim ----
  const tyre = (xc, zc, R, w, front) => {
    const ang = [], n = 8;
    for (let k = 0; k < n; k++) ang.push(((k + 0.5) / n) * TAU);
    const ring = (x) => ang.map((a) => [x, R + Math.sin(a) * R, zc + Math.cos(a) * R]);
    const A = ring(xc - w / 2), B = ring(xc + w / 2);
    for (let k = 0; k < n; k++) {
      const k2 = (k + 1) % n, ny = Math.sin(((k + 1) / n) * TAU);
      const col = ny > 0.5 ? 0x4e4e5a : ny > -0.2 ? 0x3a3a46 : 0x26262e;
      face([A[k], B[k], B[k2], A[k2]], col);
      face([A[k2], B[k2], B[k], A[k]], col);
    }
    if (!front && !turn) items.push({ d: zc + CAM_S.D - R - 0.05, L: 0, draw: () => { for (const gx of [-0.1, 0.1]) { const a = pr(xc + gx, 0.02, zc - R * 0.5), b = pr(xc + gx, R * 0.9, zc - R); px.line(a[0], a[1], b[0], b[1], 0x18181e, 1); } } });
    for (const [ring2, sx] of [[A, -1], [B, 1]]) {
      const q = ring2.map((p) => pr(p[0], p[1], p[2]));
      const toward = sx * (camX - (xc + sx * w / 2)) > 0;
      if (!toward) continue;
      let d = 0; for (const p of q) d += p[2]; d /= q.length;
      items.push({ d: d - 0.02, L: layer, draw: () => { px.poly(flat(q), 0x18181c); const hub = ring2.map((p) => pr(p[0], R + (p[1] - R) * 0.55, zc + (p[2] - zc) * 0.55)); px.poly(flat(hub), front ? 0x9aa0a8 : (spec.rimCol || 0xb8bcc2)); } });
    }
  };
  const xw = G.W / 2 - 0.1 - (spec.tuck || 0.04) * 0.3;
  const rR = Math.min(0.37, G.at(spec.wheels[1]).top * 0.5 - 0.02);
  tyre(-xw, 0, rR, 0.4); tyre(xw, 0, rR, 0.4);
  if (turn) { const rF = Math.min(0.36, G.at(spec.wheels[0]).top * 0.5 - 0.02); tyre(-(xw - 0.03), G.wb, rF, 0.36, true); tyre(xw - 0.03, G.wb, rF, 0.36, true); }
  else if (Math.abs(steer) > 1) { const sx = sy > 0 ? -1 : 1; tyre(sx * (xw - 0.05), G.wb, Math.min(0.27, G.at(spec.wheels[0]).top * 0.45), 0.24, true); }
  layer = 1;
  // ---- the body: a loft through the stations; each face toned by which way it looks ----
  const S = G.secs, c0 = spec.cockpit[0], c1 = spec.cockpit[1];
  let zR = null, zF = null;
  for (let k = 0; k + 1 < S.length; k++) {
    const a = secPts(S[k]), b = secPts(S[k + 1]), tm = (S[k].t + S[k + 1].t) / 2, open = tm <= c1 && tm >= c0;
    if (open) { if (zR == null) zR = S[k].z; zF = S[k + 1].z; }
    const yc = (S[k].top + S[k].bot) / 2;
    for (let e = 0; e < 8; e++) {
      if (open && e === 4) continue;
      const e2 = (e + 1) % 8;
      const q = [[a[e][0], a[e][1], S[k].z], [a[e2][0], a[e2][1], S[k].z], [b[e2][0], b[e2][1], S[k + 1].z], [b[e][0], b[e][1], S[k + 1].z]];
      const ux = q[1][0] - q[0][0], uy = q[1][1] - q[0][1], uz = q[1][2] - q[0][2], vx = q[3][0] - q[0][0], vy = q[3][1] - q[0][1], vz = q[3][2] - q[0][2];
      let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
      const mx = (q[0][0] + q[2][0]) / 2, my = (q[0][1] + q[2][1]) / 2 - yc;
      if (nx * mx + ny * my < 0) { nx = -nx; ny = -ny; nz = -nz; }
      const nl = Math.hypot(nx, ny, nz) || 1; nx /= nl; ny /= nl; nz /= nl;
      let col;
      const zt = clamp((S[k].z - zT) / Math.max(0.3, (zR == null ? S[k].z + 1 : zR) - zT), 0, 1);
      if (ny < -0.3) col = P[0];
      else if (ny > 0.8) col = zt < 0.3 ? P[4] : zt < 0.55 ? P[3] : zt < 0.72 ? P[4] : P[3];
      else if (nz < -0.55) col = ny > 0.3 ? P[4] : P[3];
      else if (ny > 0.3) col = nx < 0 ? P[5] : P[3];
      else col = nx < 0 ? P[2] : P[1];
      face(q, col);
      // a dithered sheen down the flank, where it is a flank
      if (Math.abs(ny) < 0.3 && Math.abs(nx) > 0.6) { const hi = nx < 0 ? P[3] : P[2]; const qq = q.map((p) => [p[0], p[1], p[2]]); const top = Math.max(qq[0][1], qq[1][1], qq[2][1], qq[3][1]), bot = Math.min(qq[0][1], qq[1][1], qq[2][1], qq[3][1]); const mid = bot + (top - bot) * 0.55; const up = qq.map((p) => [p[0], p[1] > mid ? p[1] : mid, p[2]]); const pq = up.map((p) => pr(p[0], p[1], p[2])); let dd = 0; for (const p of pq) dd += p[2]; dd /= 4; if (area(pq) > 0.01) items.push({ d: dd - 0.001, L: layer, draw: () => px.polyD(flat(pq), col, hi, 0.5) }); }
    }
  }
  // ---- a roof: ordinary cars have one — a greenhouse lofted over the cockpit, glass on its sides and ends, paint on top ----
  if (spec.roof && zR != null && zF != null) {
    const rh = spec.roofH || 0.42, glass = 0x2e4e6e, glassHi = 0x6a9ac0, tint = (z) => (zR != null && z < zR + (zF - zR) * 0.3 ? glass : glass);
    const cab = (z, kw, kh) => { const t = clamp(spec.wheels[1] - z / G.L, 0, 1), A = G.at(t), hw = A.hw * kw, belt = A.top, top = belt + rh * kh; return { z, pts: [[-hw, belt], [hw, belt], [hw * 0.94, top], [-hw * 0.94, top]] }; };
    const C = [cab(zR + 0.02, 0.9, 0.08), cab(zR + (zF - zR) * 0.22, 0.88, 1), cab(zF - (zF - zR) * 0.2, 0.88, 1), cab(zF - 0.02, 0.9, 0.1)];
    for (let k = 0; k + 1 < C.length; k++) {
      const a = C[k], b = C[k + 1], mid = k === 1;
      // top
      face([[a.pts[3][0], a.pts[3][1], a.z], [a.pts[2][0], a.pts[2][1], a.z], [b.pts[2][0], b.pts[2][1], b.z], [b.pts[3][0], b.pts[3][1], b.z]], mid ? P[4] : glass, false, 0.001);   // the sloped ends are the rear window and the windscreen
      // sides: glass, with a pale band near the top
      for (const sx of [-1, 1]) {
        const i0 = sx < 0 ? 0 : 1, i1 = sx < 0 ? 3 : 2;
        const q = [[a.pts[i0][0], a.pts[i0][1], a.z], [a.pts[i1][0], a.pts[i1][1], a.z], [b.pts[i1][0], b.pts[i1][1], b.z], [b.pts[i0][0], b.pts[i0][1], b.z]];
        const toward = sx * (camX - a.pts[i0][0]) > 0; if (!toward) continue;   // only the side the camera sees
        face(q, mid ? tint(a.z) : shadeHex(glass, 0.8), false, 0.0005);
        if (mid) { const hq = q.map((p, i) => [p[0], i === 0 || i === 3 ? p[1] + (q[1][1] - q[0][1]) * 0.55 : p[1] - (q[1][1] - q[0][1]) * 0.15, p[2]]); face(hq, glassHi, false, 0.0004); }
      }
    }
  }
  // ---- the tail: the body colour in two bands, the lamps in their black band, the plate, the bumper and pipes ----
  const tail = secPts(S[0]).slice().reverse(), top0 = S[0].top, bot0 = S[0].bot, tH = top0 - bot0, hwT = S[0].hw;
  const TP = (u, v) => pr(u, v, zT);
  const tailItems = [];
  const tq = (pts, col) => tailItems.push(() => px.poly(flat(pts.map((p) => TP(p[0], p[1]))), col));
  const tC = spec.tailCol != null ? [shadeHex(spec.tailCol, 0.6), shadeHex(spec.tailCol, 0.8), spec.tailCol, mixHex(spec.tailCol, 0xffffff, 0.3)] : [P[1], P[2], P[3], P[4]];
  const tqD = (pts, a, b) => tailItems.push(() => px.polyD(flat(pts.map((p) => TP(p[0], p[1]))), a, b));
  tq(clipV(tail, bot0 + tH * 0.8, 9), tC[3]);                 // the sky in the lacquer just under the crease
  tqD(clipV(tail, bot0 + tH * 0.72, bot0 + tH * 0.8), tC[3], tC[2]);
  tq(clipV(tail, bot0 + tH * 0.42, bot0 + tH * 0.72), tC[2]);
  tqD(clipV(tail, bot0 + tH * 0.36, bot0 + tH * 0.42), tC[2], tC[1]);
  tq(clipV(tail, bot0 + tH * 0.2, bot0 + tH * 0.36), tC[1]);
  tqD(clipV(tail, bot0 + tH * 0.14, bot0 + tH * 0.2), tC[1], tC[0]);
  tq(clipV(tail, -1, bot0 + tH * 0.14), tC[0]);
  const bumpH = 0.1;
  tq(clipV(tail, -1, bot0 + bumpH), 0x1a181e);                                                       // the black bumper strip
  tq(clipV(tail, bot0 + bumpH, bot0 + bumpH + 0.02), chrome ? 0xffffff : 0x3a3840);
  paintTails3(spec, tq, hwT, bot0 + bumpH + 0.04, top0 - 0.06, brake, P);
  const pipes = spec.engine === 'v12' ? [-0.6, -0.46, 0.46, 0.6] : spec.engine === 'v8' ? [-0.55, 0.55] : spec.engine === 'turbo' ? [0] : spec.engine === 'flat6' ? [-0.12, 0.12] : [0.55];
  for (const fx of pipes) { const u = fx * hwT; tq([[u - 0.055, bot0 - 0.06], [u + 0.055, bot0 - 0.06], [u + 0.055, bot0 + 0.03], [u - 0.055, bot0 + 0.03]], 0xd8dce0); tq([[u - 0.03, bot0 - 0.05], [u + 0.03, bot0 - 0.05], [u + 0.03, bot0 + 0.01], [u - 0.03, bot0 + 0.01]], 0x18181c); }
  if (spec.stripe != null) { const sw2 = Math.max(0.06, G.W * (spec.stripeW || 0.1) / 2); tq(clipV([[-sw2, -1], [sw2, -1], [sw2, 9], [-sw2, 9]], bot0 + tH * 0.72, top0), spec.stripe); }
  if (cy > 0.04) items.push({ d: pr(0, top0 * 0.5, zT)[2] - 0.001, draw: () => { for (const fn of tailItems) fn(); } });
  if (turn && cy < 0.3) {
    // the nose, seen from the front: the cap in the body's tones with a black bumper strip, a louvred grille and the plate;
    // the lamps lie on the hood just behind the nose, under glass, so they read from the front and from above
    const Sn = S[S.length - 1], zN = Sn.z, nose = secPts(Sn), nTop = Sn.top, nBot = Sn.bot, nH = nTop - nBot, hwN = Sn.hw;
    const NP = (u, v) => pr(u, v, zN);
    const nq = (pts, col) => { const q = pts.map((p) => NP(p[0], p[1])); if (q.length > 2) px.poly(flat(q), col); };
    items.push({ d: depth(0, zN) - 0.001, draw: () => {
      nq(clipV(nose, nBot + nH * 0.55, 9), P[4]); nq(clipV(nose, nBot + nH * 0.2, nBot + nH * 0.55), P[3]); nq(clipV(nose, -1, nBot + nH * 0.2), P[1]);
      nq(clipV(nose, -1, nBot + 0.09), 0x1a181e); nq(clipV(nose, nBot + 0.09, nBot + 0.11), chrome ? 0xffffff : 0x3a3840);
      const g0 = nBot + 0.13, g1 = nBot + nH * 0.62;
      nq([[-hwN * 0.72, g0], [hwN * 0.72, g0], [hwN * 0.72, g1], [-hwN * 0.72, g1]], 0x1a181e);
      for (let k = 1; k < 4; k++) { const v = g0 + ((g1 - g0) * k) / 4; nq([[-hwN * 0.7, v], [hwN * 0.7, v], [hwN * 0.7, v + 0.012], [-hwN * 0.7, v + 0.012]], 0x4a4a54); }
      nq([[-0.2, (g0 + g1) / 2 - 0.05], [0.2, (g0 + g1) / 2 - 0.05], [0.2, (g0 + g1) / 2 + 0.05], [-0.2, (g0 + g1) / 2 + 0.05]], 0xe8e8e0);
      nq([[-0.17, (g0 + g1) / 2 - 0.02], [0.17, (g0 + g1) / 2 - 0.02], [0.17, (g0 + g1) / 2 + 0.02], [-0.17, (g0 + g1) / 2 + 0.02]], 0x2a2a30);
      for (const sx of [-1, 1]) { const u = sx * hwN * 0.84; nq([[u - 0.07, g1 - 0.08], [u + 0.07, g1 - 0.08], [u + 0.07, g1], [u - 0.07, g1]], 0xf29a1a); }
    } });
    const tAtZ = (z) => spec.wheels[1] - z / G.L, hoodY = (z) => G.at(tAtZ(z)).top + 0.006;
    for (const sx of [-1, 1]) {
      const u = sx * hwN * 0.6, w = Math.min(0.2, hwN * 0.22), z0 = zN - 0.44, z1 = zN - 0.08;
      const lampQ = (du, dz0, dz1) => [[u - du, hoodY(z0 + dz0), z0 + dz0], [u + du, hoodY(z0 + dz0), z0 + dz0], [u + du, hoodY(z1 - dz1), z1 - dz1], [u - du, hoodY(z1 - dz1), z1 - dz1]];
      face(lampQ(w, 0, 0), 0x1a181e, true, -0.02); face(lampQ(w - 0.025, 0.03, 0.03), 0xfff6d0, true, -0.03); face(lampQ(w - 0.07, 0.07, 0.12), 0xffd040, true, -0.04);
    }
  }
  // the crease where the deck meets the tail: the brightest line on the car
  const cr = secPts(S[0]);
  items.push({ d: pr(0, top0, zT)[2] - 0.0025, draw: () => { if (zR - zT > 0.3) { const a = pr(-hwT * 0.55, top0 + 0.005, zT + 0.1), b = pr(-hwT * 0.1, top0 + 0.005, zR - 0.08); px.line(a[0], a[1], b[0], b[1], P[5], 2); } } });
  items.push({ d: pr(0, top0, zT)[2] - 0.002, draw: () => { const a = pr(cr[3][0], cr[3][1], zT), b = pr(cr[4][0], cr[4][1], zT), c = pr(cr[5][0], cr[5][1], zT), d = pr(cr[6][0], cr[6][1], zT); px.line(a[0], a[1], b[0], b[1], P[4], 1); px.line(b[0], b[1], c[0], c[1], P[5], 1); px.line(c[0], c[1], d[0], d[1], P[4], 1); } });
  // ---- the cockpit: its well, the seats, the two of them, the windscreen beyond, the mirrors ----
  const tAt = (z) => (z <= 0 ? spec.wheels[1] + (-z / G.zA) * (1 - spec.wheels[1]) : spec.wheels[1] - z / G.L), A = G.at(tAt(zR)), B = G.at(tAt(zF));
  const wellW = (q) => q.hw - q.r;
  items.push({ d: depth(0, zF) + 0.08, draw: () => px.poly(flat([pr(-wellW(A), A.top - 0.01, zR), pr(wellW(A), A.top - 0.01, zR), pr(wellW(B), B.top - 0.01, zF), pr(-wellW(B), B.top - 0.01, zF)]), shadeHex(interior, 0.3)) });
  const scr = spec.screen || 0.4, fc = chrome ? 0xd8dce0 : 0x141418;
  if (scr > 0.25) {
    const gw0 = wellW(B) - 0.02, gw1 = gw0 - 0.1, h1 = scr * 0.7, back = scr * 0.5;
    const q = [pr(-gw0, B.top, zF), pr(gw0, B.top, zF), pr(gw1, B.top + h1, zF - back), pr(-gw1, B.top + h1, zF - back)];
    items.push({ d: depth(0, zF) + 0.05, draw: () => {
      px.poly(flat(q), 0x9cd0ea);
      const m = [pr(-gw0, B.top + h1 * 0.5, zF - back * 0.5), pr(gw0, B.top + h1 * 0.5, zF - back * 0.5)];
      px.poly(flat([m[0], m[1], q[2], q[3]]), 0xd4f0fa);
      for (const g of [-0.34, -0.2, 0.4]) { const p0 = pr(g * gw0, B.top + 0.03, zF), p1 = pr(g * gw0 + 0.18, B.top + h1 - 0.03, zF - back); px.line(p0[0], p0[1], p1[0], p1[1], 0xffffff, 1); }
      // the frame: a solid black bar along the top, posts down each side
      px.line(q[3][0], q[3][1], q[2][0], q[2][1], fc, 2); px.line(q[0][0], q[0][1], q[3][0], q[3][1], fc, 2); px.line(q[1][0], q[1][1], q[2][0], q[2][1], fc, 2);
    } });
  } else if (scr > 0.12) {
    for (const sx of [-1, 1]) { const x = sx * G.W * 0.22, q = [pr(x - 0.24, B.top, zF), pr(x + 0.24, B.top, zF), pr(x + 0.22, B.top + 0.16, zF - 0.1), pr(x - 0.22, B.top + 0.16, zF - 0.1)]; items.push({ d: depth(x, zF), draw: () => { px.poly(flat(q), 0xbfe2f2); px.line(q[3][0], q[3][1], q[2][0], q[2][1], fc, 1); } }); }
  }
  // door mirrors out at the base of the screen
  for (const sx of [-1, 1]) { const x = sx * (B.hw + 0.11), z = zF - 0.05, q = [pr(x - 0.085, B.top + 0.05, z), pr(x + 0.085, B.top + 0.05, z), pr(x + 0.085, B.top + 0.18, z), pr(x - 0.085, B.top + 0.18, z)]; items.push({ d: depth(x, z) - 0.01, draw: () => { const st = pr(sx * (B.hw - 0.04), B.top + 0.1, z), m = pr(x, B.top + 0.1, z); px.line(st[0], st[1], m[0], m[1], P[3], 2); px.poly(flat(q), P[3]); const a = pr(x - 0.055, B.top + 0.075, z), b = pr(x + 0.055, B.top + 0.16, z); px.rect(Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.max(1, Math.abs(b[0] - a[0])), Math.max(1, Math.abs(b[1] - a[1])), 0x1a1a20); px.set(Math.min(a[0], b[0]) + 1, Math.min(a[1], b[1]) + 1, 0x9ad0ea); } }); }
  // seats: tall black-backed buckets with headrests, then the heads above them
  const seatZ = zR + 0.14, headZ = zR + 0.3, sxs = [-G.W * 0.22, G.W * 0.22];
  const seat = [shadeHex(interior, 0.42), shadeHex(interior, 0.6), shadeHex(interior, 0.85), interior];
  for (const x of sxs) {
    const q = [pr(x - 0.27, A.top - 0.05, seatZ), pr(x + 0.27, A.top - 0.05, seatZ), pr(x + 0.24, A.top + 0.22, seatZ + 0.04), pr(x - 0.24, A.top + 0.22, seatZ + 0.04)];
    const hr = [pr(x - 0.15, A.top + 0.2, seatZ + 0.02), pr(x + 0.15, A.top + 0.2, seatZ + 0.02), pr(x + 0.14, A.top + 0.34, seatZ + 0.04), pr(x - 0.14, A.top + 0.34, seatZ + 0.04)];
    items.push({ d: depth(x, seatZ), draw: () => { px.poly(flat(q), seat[1]); px.line(q[3][0], q[3][1], q[2][0], q[2][1], seat[2], 1); px.poly(flat(hr), seat[0]); px.line(hr[3][0], hr[3][1], hr[2][0], hr[2][1], seat[2], 1); } });
  }
  px.headPos = [];
  crew.forEach((o, i) => {
    const x = sxs[i ? 1 : 0], hp = pr(x, A.top + 0.42, headZ);
    px.headPos.push([Math.round(hp[0]), Math.round(hp[1])]);
    items.push({ d: depth(x, headZ) - 0.01, draw: () => paintHeadBack(px, Math.round(hp[0]), Math.round(hp[1]), o, phase) });
  });
  // ---- extras ----
  if (spec.hoop) { const x = sxs[0]; items.push({ d: depth(x, zR + 0.05), draw: () => { const a = pr(x - 0.26, A.top, zR + 0.05), b = pr(x - 0.26, A.top + 0.56, zR + 0.05), c = pr(x + 0.26, A.top + 0.56, zR + 0.05), d = pr(x + 0.26, A.top, zR + 0.05); px.line(a[0], a[1], b[0], b[1], 0xd8dce0, 2); px.line(b[0], b[1], c[0], c[1], 0xf4f6f8, 2); px.line(c[0], c[1], d[0], d[1], 0xd8dce0, 2); } }); }
  if (spec.fairing) { const x = sxs[0]; items.push({ d: depth(x, zR - 0.05), draw: () => { const p = pr(x, A.top + 0.1, zR - 0.1); px.ellipse(p[0], p[1], 8, 5, P[3]); px.rect(p[0] - 5, p[1] - 4, 6, 1, P[5]); } }); }
  if (spec.louvres) items.push({ d: depth(0, zT) - 0.003, draw: () => { for (let z = zT + 0.12; z < zR - 0.1; z += 0.14) { const a = pr(-G.W * 0.26, top0 + 0.01, z), b = pr(G.W * 0.26, top0 + 0.01, z); px.line(a[0], a[1], b[0], b[1], 0x1a1a20, 1); } } });
  if (spec.stripe != null) { const sw2 = Math.max(0.06, G.W * (spec.stripeW || 0.1) / 2); items.push({ d: depth(0, zT) - 0.004, draw: () => px.poly(flat([pr(-sw2, top0 + 0.01, zT), pr(sw2, top0 + 0.01, zT), pr(sw2, A.top + 0.01, zR), pr(-sw2, A.top + 0.01, zR)]), spec.stripe) }); }
  if (spec.fins) for (const sx of [-1, 1]) { const x = sx * (G.W / 2 - 0.3); face([[x, top0, zT + 0.05], [x, top0, zR], [x, A.top + 0.32, zR + 0.1], [x, top0 + 0.16, zT + 0.05]], P[2], false); }
  if (spec.spoiler) face([[-hwT + 0.12, top0, zT], [hwT - 0.12, top0, zT], [hwT - 0.12, top0 + 0.08, zT - 0.04], [-hwT + 0.12, top0 + 0.08, zT - 0.04]], P[3], false);
  if (spec.duck) face([[-hwT + 0.06, top0, zT + 0.04], [hwT - 0.06, top0, zT + 0.04], [hwT - 0.06, top0 + 0.05, zT - 0.02], [-hwT + 0.06, top0 + 0.05, zT - 0.02]], P[4], false);
  if (spec.wing) {
    const zw = zT + 0.25, yw = top0 + 0.34;
    for (const sx of [-1, 1]) face([[sx * 0.5 - 0.025, top0, zw], [sx * 0.5 + 0.025, top0, zw], [sx * 0.5 + 0.025, yw, zw], [sx * 0.5 - 0.025, yw, zw]], 0x18181c, false);
    face([[-G.W / 2 - 0.02, yw, zw - 0.02], [G.W / 2 + 0.02, yw, zw - 0.02], [G.W / 2 + 0.02, yw + 0.07, zw - 0.02], [-G.W / 2 - 0.02, yw + 0.07, zw - 0.02]], P[3], false);
    face([[-G.W / 2 - 0.02, yw + 0.07, zw - 0.02], [G.W / 2 + 0.02, yw + 0.07, zw - 0.02], [G.W / 2 + 0.02, yw + 0.07, zw + 0.24], [-G.W / 2 - 0.02, yw + 0.07, zw + 0.24]], P[5], false);
  }
  // ---- paint far to near, then the outline ----
  for (const it of items) if (it.L == null) it.L = 1;
  items.sort((u, v) => (u.L - v.L) || (v.d - u.d));
  for (const it of items) it.draw();
  px.outline(OUTL);
  return px;
}
// tail lamps by style, on the tail face between heights v0 and v1, through tq(points in metres, colour)
function paintTails3(spec, tq, hw, v0, v1, on, P) {
  const T = spec.tails, R = on ? [0xff4a32, 0xff9a6a, 0xfff2c8] : [0xb0141c, 0xe8343a, 0xff8a6a], AMB = on ? [0xffb040, 0xffe0a0] : [0xf29a1a, 0xffd060], bez = 0x1a181e;
  const box = (u0, u1, w0, w1, c) => tq([[u0, w0], [u1, w0], [u1, w1], [u0, w1]], c);
  const lamp = (u0, u1, w0, w1, red) => { const C = red === false ? AMB : R; box(u0, u1, w0, w1, C[0]); box(u0, u1, (w0 + w1) / 2, w1, C[1]); box(u0 + 0.02, u1 - 0.02, w1 - 0.03, w1 - 0.01, C[2] || 0xffffff); };
  const circ = (u, vc, r, c) => { const pts = []; for (let k = 0; k < 10; k++) { const a = (k / 10) * TAU; pts.push([u + Math.cos(a) * r, vc + Math.sin(a) * r]); } tq(pts, c); };
  const disc = (u, vc, r, ring) => { circ(u, vc, r + 0.025, ring); circ(u, vc, r, R[0]); circ(u - r * 0.25, vc + r * 0.25, r * 0.55, R[1]); };
  const H = v1 - v0, vm = (v0 + v1) / 2, lh = Math.min(0.26, H * 0.5), l0 = vm - lh / 2, l1 = vm + lh / 2;
  const plate = (w) => { box(-w, w, l0 - 0.01, l1 + 0.01, 0x2a2a30); box(-w + 0.02, w - 0.02, l0 + 0.01, l1 - 0.01, 0x5a5a62); box(-w + 0.05, w - 0.05, vm - 0.03, vm + 0.03, 0xd8d8d0); };
  if (T === 'grille') {
    // the black louvred band right across the tail; at each end an amber and a red block, the plate in the middle
    box(-hw + 0.04, hw - 0.04, l0 - 0.06, l1 + 0.06, bez);
    for (let k = 0; k < 5; k++) { const vv = l0 - 0.04 + (k / 5) * (lh + 0.08); box(-hw + 0.06, hw - 0.06, vv, vv + 0.014, 0x4a4a54); }
    const bw = hw * 0.2;
    for (const sx of [-1, 1]) { const o = sx < 0 ? -hw + 0.08 : hw - 0.08 - bw; lamp(o, o + bw, l0, l1, false); const o2 = sx < 0 ? o + bw + 0.03 : o - bw - 0.03; lamp(o2, o2 + bw, l0, l1, true); }
    plate(0.24);
  } else if (T === 'quad') {
    box(-hw + 0.05, hw - 0.05, l0 - 0.04, l1 + 0.04, bez);
    for (const sx of [-1, 1]) for (const k of [0, 1]) disc(sx * (hw * 0.52 + k * 0.2), vm, lh * 0.46, 0x101014);
    plate(0.22);
  } else if (T === 'roundsmall') {
    for (const sx of [-1, 1]) { disc(sx * hw * 0.7, vm + 0.02, lh * 0.4, 0xd8dce0); circ(sx * hw * 0.7, vm - lh * 0.5, lh * 0.2, AMB[0]); }
    plate(0.2);
  } else if (T === 'round') {
    for (const sx of [-1, 1]) disc(sx * hw * 0.66, vm, lh * 0.5, 0xd8dce0);
    plate(0.2);
  } else if (T === 'triple') {
    for (const sx of [-1, 1]) { const w = hw * 0.6, a = sx < 0 ? -hw + 0.08 : hw - 0.08 - w; box(a - 0.03, a + w + 0.03, l0 - 0.03, l1 + 0.03, 0xd8dce0); for (let k = 0; k < 3; k++) lamp(a + (k * w) / 3 + 0.015, a + ((k + 1) * w) / 3 - 0.015, l0, l1, true); }
    plate(0.2);
  } else if (T === 'oval') {
    for (const sx of [-1, 1]) { const u = sx * hw * 0.62, pts = []; for (let k = 0; k < 12; k++) { const a = (k / 12) * TAU; pts.push([u + Math.cos(a) * 0.19, vm + Math.sin(a) * lh * 0.5]); } tq(pts, bez); tq(pts.map((p) => [u + (p[0] - u) * 0.85, vm + (p[1] - vm) * 0.75]), R[0]); box(u + sx * 0.12 - 0.03, u + sx * 0.12 + 0.03, vm - lh * 0.2, vm + lh * 0.2, AMB[0]); }
    plate(0.2);
  } else if (T === 'strip') {
    box(-hw + 0.06, hw - 0.06, l0 - 0.02, l1 + 0.02, bez); box(-hw + 0.08, hw - 0.08, l0, l1, R[0]); box(-hw + 0.08, hw - 0.08, vm, l1, R[1]);
    box(-0.24, 0.24, l0 - 0.02, l1 + 0.02, 0x2a2a30); box(-0.2, 0.2, vm - 0.03, vm + 0.03, 0xd8d8d0);
  } else if (T === 'neon') {
    box(-hw + 0.08, hw - 0.08, l1 - 0.03, l1 + 0.02, on ? 0xb8ffff : 0x3af0ff);
    for (const sx of [-1, 1]) lamp(sx * hw * 0.66 - 0.16, sx * hw * 0.66 + 0.16, l0, l1 - 0.07, true);
    plate(0.2);
  } else if (T === 'fin') {
    for (const sx of [-1, 1]) { const u = sx * (hw - 0.09); box(u - 0.07, u + 0.07, l0 - 0.14, l1 + 0.2, 0xd8dce0); box(u - 0.045, u + 0.045, l0 - 0.12, l1 + 0.18, R[0]); box(u - 0.045, u + 0.045, vm, l1 + 0.18, R[1]); }
    plate(0.22);
  }
}
// ---------- the side view, nose to the left ----------
function paintCarSide(spec, scale) {
  const K = scale || 52, pad = 10, Lp = Math.round(spec.L * K), W = Lp + pad * 2, H = Math.round(1.62 * K) + 8, gy = H - 4;
  const px = new Pix(W, H), P = carPal(spec.color), X = (t) => pad + t * Lp, Y = (m) => gy - m * K;
  const wheelT = spec.wheels, R = 0.33 * K, archR = R + 0.07 * K;
  // the body, column by column: shoulder highlight, flank, sill
  for (let x = 0; x < Lp; x++) {
    const t = x / Lp, top = Y(spec.yF(t)), xx = pad + x;
    let bot = Y(spec.clear + (t < 0.06 ? (0.06 - t) * 1.6 : 0) + (t > 0.95 ? (t - 0.95) * 2.4 : 0));
    for (const wt of wheelT) { const d = Math.abs(t - wt) * Lp; if (d < archR) bot = Math.min(bot, gy - R - Math.sqrt(archR * archR - d * d) + 1); }
    for (let y = Math.round(top); y < Math.round(bot); y++) {
      const v = (y - top) / Math.max(1, bot - top);
      let i = v < 0.06 ? 5 : v < 0.2 ? 4 : v < 0.5 ? 3 : v < 0.8 ? 2 : 1;
      if (spec.sideLine && Math.abs(v - 0.48) < 0.03) { px.set(xx, y, spec.sideLine); continue; }
      px.set(xx, y, spec.tailCol != null && t > 0.97 ? shadeHex(spec.tailCol, 0.8) : P[i]);
    }
  }
  // cockpit opening seen from the side: the line of the doors, the seats peeking over
  const c0 = spec.cockpit[0], c1 = spec.cockpit[1], crew = CREW[spec.id] || [];
  px.line(X(c0 + 0.03), Y(spec.yF(c0 + 0.03)) + 2, X(c0 + 0.05), Y(spec.clear + 0.12), shadeHex(spec.color, 0.45), 1);
  px.line(X(c1 - 0.02), Y(spec.yF(c1 - 0.02)) + 2, X(c1 - 0.03), Y(spec.clear + 0.14), shadeHex(spec.color, 0.45), 1);
  const yBelt = Y(lerp(spec.yF(c0), spec.yF(c1), 0.5));
  // the windscreen: raked back from the scuttle
  if (spec.screen > 0.25) {
    const x0 = X(c0), y0 = Y(spec.yF(c0)), x1 = x0 + spec.screen * K * 0.62, y1 = y0 - spec.screen * K * 0.8;
    px.poly([x0, y0, x0 + 3, y0, x1 + 3, y1, x1, y1], 0x9ccbe8); px.line(x0, y0, x1, y1, spec.chrome ? 0xd8dce0 : 0x18181c, 2); px.line(x1, y1, x1 + 5, y1, spec.chrome ? 0xd8dce0 : 0x18181c, 2);
  }
  // the two of them: the far one first, a touch higher and further back
  const hx = X(lerp(c0, c1, 0.55)), hy = yBelt - 0.38 * K;
  crew.slice().reverse().forEach((o, j) => { const i = crew.length - 1 - j, x = hx + (i ? 6 : 0), y = hy - (i ? 2 : 0); paintHeadSide(px, x, y, o, K / 52); });
  if (spec.hoop) { px.line(hx + 9, yBelt, hx + 9, yBelt - 0.5 * K, 0xd8dce0, 2); px.line(hx + 9, yBelt - 0.5 * K, hx + 15, yBelt, 0xd8dce0, 2); }
  if (spec.fairing) px.ball(hx + 16, yBelt - 3, 12, 6, P.slice(1), -1, -1.4);
  if (spec.fins) px.poly([X(0.72), Y(spec.yF(0.72)), X(0.86), Y(spec.yF(0.86)), X(0.84), Y(spec.yF(0.84) + 0.3), X(0.78), Y(spec.yF(0.78) + 0.3)], P[2]);
  if (spec.wing) { const yW = Y(spec.yF(0.9) + 0.32); px.rect(X(0.86), yW, X(0.99) - X(0.86), 4, P[3]); px.rect(X(0.86), yW, X(0.99) - X(0.86), 1, P[5]); px.rect(X(0.9), yW + 4, 3, Y(spec.yF(0.9)) - yW - 4, 0x18181c); }
  if (spec.spoiler) px.rect(X(0.93), Y(spec.yF(0.95)) - 3, X(1) - X(0.93), 3, P[3]);
  if (spec.intakes) for (let i = 0; i < 5; i++) px.rect(X(0.6), Y(spec.yF(0.62) * 0.75) + i * 3 - 6, X(0.74) - X(0.6), 1, 0x18181c);
  if (spec.roundel) { const x = X(0.32), y = Y(spec.yF(0.32) * 0.6); px.ellipse(x, y, 0.2 * K, 0.2 * K, 0xffffff); px.text('7', x, y - 0.14 * K, Math.round(0.28 * K), 0x1a1a1a, { align: 'center', font: '"Russo One",sans-serif', weight: 400 }); }
  if (spec.stripe != null && spec.id !== 'arancia') for (let x = 0; x < Lp; x++) { const t = x / Lp; if (t > c0 && t < c1) continue; px.set(pad + x, Math.round(Y(spec.yF(t))), spec.stripe); px.set(pad + x, Math.round(Y(spec.yF(t))) + 1, spec.stripe); }
  // lamps: pop-ups closed on the nose, or round lamps in the front face; the tail lamp at the back
  if (spec.pop) px.rect(X(0.05), Y(spec.yF(0.06)) - 1, 0.32 * K, 2, shadeHex(spec.color, 0.5));
  else { px.ellipse(X(0.015) + 3, Y(spec.yF(0.02) - 0.1), 3, 4, 0xfff8d8); }
  px.rect(X(1) - 3, Y(spec.yF(0.98)) + 4, 4, 0.12 * K, 0xe8343a);
  if (spec.chrome) { px.rect(X(0) - 2, Y(spec.clear + 0.16), 8, 3, 0xd8dce0); px.rect(X(1) - 6, Y(spec.clear + 0.16), 8, 3, 0xd8dce0); }
  // wheels
  for (const wt of wheelT) {
    const x = X(wt), y = gy - R;
    px.ellipse(x, y, R, R, 0x161618); px.ellipse(x, y, R - 2, R - 2, 0x26262a);
    const rr = R * 0.62, rc = spec.rimCol || 0xd0d4d8;
    px.ellipse(x, y, rr, rr, rc); px.ellipse(x, y, rr - 1.5, rr - 1.5, shadeHex(rc, 0.75));
    const n = spec.rim === 'wire' ? 16 : spec.rim === 'mesh' ? 10 : spec.rim === 'disc' ? 0 : 5;
    for (let i = 0; i < n; i++) { const a = (i / n) * TAU; px.line(x, y, x + Math.cos(a) * (rr - 1), y + Math.sin(a) * (rr - 1), spec.rim === 'wire' ? 0xf0f2f4 : rc, spec.rim === 'star' ? 2 : 1); }
    px.ellipse(x, y, 2.5, 2.5, 0xf2f4f6); px.set(x - rr * 0.5, y - rr * 0.6, 0xffffff);
  }
  px.outline(OUTL);
  return px;
}
function paintHeadSide(px, x, y, o, k) {
  if (o.dog) { const fur = [0x8a4a1a, 0xc87a3a, 0xe8a85a]; px.ball(x, y + 2, 6 * k, 5 * k, fur, -1, -1); px.ball(x - 6 * k, y + 3, 3 * k, 2.5 * k, fur, -1, -1); px.poly([x + 1, y - 2, x + 3, y - 9 * k, x + 5, y - 1], fur[1]); return; }
  const hair = o.hair || 0x1a1410, skin = o.skin || 0xf2c8a0;
  px.ball(x, y + 11 * k, 7 * k, 5 * k, ramp(o.shirt || 0xffffff, 4, 0.65, 1.15), -1, -1.4);
  px.ball(x, y, 6 * k, 7 * k, ramp(skin, 4, 0.75, 1.1), -1, -1);
  px.ball(x + 1.5 * k, y - 2 * k, 6 * k, 5.5 * k, [shadeHex(hair, 0.6), hair, shadeHex(hair, 1.4)], -1, -1);
  if (o.style === 'long' || o.veil) px.poly([x + 2, y - 3, x + 7 * k, y - 2, x + 14 * k, y + 8 * k, x + 4, y + 6 * k], o.veil ? 0xf4f6fc : hair);
  if (o.style === 'cap') px.rect(x - 7 * k, y - 4 * k, 12 * k, 3, o.capCol || 0xd8242a);
  if (o.glasses) px.rect(x - 6 * k, y - 1, 5 * k, 2, 0x1a1a1a);
  px.set(x - 5 * k, y + 1, shadeHex(skin, 0.8));
}
// ---------- every frame of one car, and its side view ----------
const CAR_SPR = {};
function carSprites(spec) {
  const key = spec.id + (SET.refCar !== false ? ':ref' : '');
  if (CAR_SPR[key]) return CAR_SPR[key];
  if (SET.refCar !== false && typeof refCarSprites === 'function') { const r = refCarSprites(spec); if (r) return (CAR_SPR[key] = r); }
  const headPos = [];
  const frames = CAR_STEERS.map((s, si) => [false, true].map((b) => [0, 1].map((ph) => { const px = paintCarRear(spec, s, b, ph * 1.7); if (!b && !ph) headPos[si] = px.headPos; return px.toCanvas(); })));
  const out = { frames, steers: CAR_STEERS, w: CFW, h: CFH, ax: CFW / 2, ay: CGY + 3, bw: carMetrics(spec).BW, side: null, headPos };
  CAR_SPR[key] = out;
  return out;
}
// the turntable: the car at every 15 degrees, painted from its numbers (the reference-cut car turns the same way)
const TURN_N = 48;
const TURN_OPT = { W: 320, H: 150, gy: 128, D: 9, camH: 1.25, ppm: 44 };
let TURN_CAR = null;   // only one car's turn is kept: forty-eight frames is a lot of picture
function carTurnFrame(spec, i) {
  if (TURN_CAR && TURN_CAR !== spec.id) delete CAR_SPR[TURN_CAR + ':turn'];
  TURN_CAR = spec.id;
  const key = spec.id + ':turn', fr = CAR_SPR[key] || (CAR_SPR[key] = new Array(TURN_N));
  if (fr[i]) return fr[i];
  const G = carGeo(spec), o = Object.assign({ yaw: (i / TURN_N) * TAU, pivot: (G.secs[0].z + G.secs[G.secs.length - 1].z) / 2 }, TURN_OPT);
  return (fr[i] = paintCarRear(spec, 0, false, 0, o).toCanvas());
}
function carTurn(spec) { const out = []; for (let i = 0; i < TURN_N; i++) out.push(carTurnFrame(spec, i)); return out; }
function carSide(spec, scale) { const key = spec.id + ':' + (scale || 52); return CAR_SPR[key] || (CAR_SPR[key] = paintCarSide(spec, scale).toCanvas()); }
// ---------- drawing the player's car ----------
const _pc = { x: 0, y: 0, z: 0 }, _pq = { x: 0, y: 0, k: 0, cz: 0 };
// which frame: straight, half lock or full lock, read straight off the wheel so the picture always answers the hand.
// The thresholds have a little hysteresis so the picture never flickers while the wheel sits near one of them.
function carSteerIndex(spr) {
  // standing still the car cannot be seen to turn: the pose comes in with speed, full by 40 km/h
  const n = spr.frames.length, mid = (n - 1) >> 1, a = Math.abs(PC.steerIn) * clamp((PC.v - 1) / 10, 0, 1), cur = Math.abs((PC._si == null ? mid : PC._si) - mid);
  let lv = a > 0.72 ? 2 : a > 0.28 ? 1 : 0;
  if (cur === 2 && a > 0.62) lv = 2; else if (cur === 1 && a > 0.2 && a <= 0.82) lv = 1; else if (cur === 0 && a <= 0.36) lv = 0;
  // in a drift the picture follows the tail, not the wheel: the nose comes round as the swing builds, right round at full swing
  if (PC.drift && Math.sign(PC.steerIn) === PC.driftDir) { const sw = Math.abs(FX.swing); lv = Math.max(lv, sw > 0.8 ? 3 : sw > 0.45 ? 2 : sw > 0.15 ? 1 : 0); }
  else if (Math.abs(FX.swing) > 0.5 && FX.driftK > 0.3) lv = Math.max(lv, 2);   // the tail is still out while the wheel comes back: inertia
  const si = clamp(mid + Math.sign(PC.steerIn || 1) * Math.min(lv, mid), 0, n - 1);
  PC._si = si;
  return si;
}
function carFrame(spr) {
  const si = carSteerIndex(spr), brake = PC.brake > 0.1 || RACE.state === 'goal' ? 1 : 0, fl = Math.floor(G.t * 8) & 1;
  return spr.frames[si][brake][fl];
}
// where the tail lamps are on a frame: wherever the braking picture differs from the plain one, boxed per side
function carLamps(spr, si) {
  spr.lamps = spr.lamps || [];
  if (spr.lamps[si]) return spr.lamps[si];
  const a = spr.frames[si][0][0], b = spr.frames[si][1][0], w = a.width, h = a.height;
  const A = a.getContext('2d').getImageData(0, 0, w, h).data, B = b.getContext('2d').getImageData(0, 0, w, h).data;
  // the lit pixels per side, by row; the lamp is the densest band of rows, stray highlights elsewhere are not it
  const rows = [[], []]; for (let k = 0; k < 2; k++) for (let y = 0; y < h; y++) rows[k].push([]);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 4; if (A[i + 3] < 128 || B[i + 3] < 128) continue;
    if (Math.abs(A[i] - B[i]) + Math.abs(A[i + 1] - B[i + 1]) + Math.abs(A[i + 2] - B[i + 2]) < 48) continue;
    if (!(B[i] > 220 && B[i + 1] > 120 && B[i] - B[i + 2] > 40)) continue;   // only the bright orange of a lit lamp
    rows[x < w / 2 ? 0 : 1][y].push(x);
  }
  const bw = spr.bw || w * 0.6, out = [];
  rows.forEach((R, side) => {
    let best = 0; for (let y = 0; y < h; y++) if (R[y].length > R[best].length) best = y;
    let y0 = best, y1 = best; const need = Math.max(2, R[best].length * 0.3);
    while (y0 > 0 && R[y0 - 1].length >= need) y0--; while (y1 < h - 1 && R[y1 + 1].length >= need) y1++;
    let x0 = w, x1 = 0; for (let y = y0; y <= y1; y++) for (const x of R[y]) { x0 = Math.min(x0, x); x1 = Math.max(x1, x + 1); }
    const ok = R[best].length >= 3 && x1 - x0 >= 3 && x1 - x0 < w * 0.5;
    if (ok) out.push([x0, y0, x1 - x0, y1 - y0 + 1]);
    else out.push([Math.round(spr.ax + (side ? 1 : -1) * bw * 0.3 - 7), Math.round(spr.ay - 36), 14, 6]);
  });
  return (spr.lamps[si] = out);
}
// the brake lamps lit: the lamps themselves flushed, and a glow around them, over the frame just drawn at (x0, y0)
function drawBrakeGlow(spr, si, x0, y0, k) {
  const L = carLamps(spr, si); if (!L.length) return;
  VG.save(); VG.globalCompositeOperation = 'lighter';
  for (const [lx, ly, lw, lh] of L) {
    const cx = x0 + lx + lw / 2, cy = y0 + ly + lh / 2, r = Math.max(6, Math.max(lw, lh) * 0.9) * k;
    VG.fillStyle = 'rgba(255,70,40,' + (0.55 * k) + ')'; VG.fillRect(x0 + lx, y0 + ly, lw, lh);
    const rg = VG.createRadialGradient(cx, cy, 0, cx, cy, r); rg.addColorStop(0, 'rgba(255,90,50,' + (0.5 * k) + ')'); rg.addColorStop(0.5, 'rgba(255,50,30,' + (0.18 * k) + ')'); rg.addColorStop(1, 'rgba(255,40,20,0)');
    VG.fillStyle = rg; VG.fillRect(cx - r, cy - r, r * 2, r * 2);
  }
  VG.restore();
}
function drawPlayerCar(spr) {
  if (!spr || !PC.piece) return;
  const P = PC.piece.pos(PC.s, PC.x, _pc);
  if (!projW(P.x, P.y, P.z, _pq)) return;
  const img = carFrame(spr);
  // the rear wheels stand on a fixed row: the camera keeps its distance and follows the slope
  const yG = Math.round(Y0 + (CV.hgt * FOC) / Math.max(1, CAM.cfg.back - CAR_REAR));
  const lift = Math.round((PC.airY || 0) * _pq.k) + (PC.offroad && PC.v > 4 ? (Math.floor(G.t * 22) & 1) : 0) + (PC.v > 48 && (Math.floor(G.t * 30) & 1) ? 1 : 0);
  const x = Math.round(_pq.x), bw = spr.bw;
  PC.scrX = x; PC.scrY = yG - lift; PC.scrBW = bw;
  if (PC.spec && PC.spec.neon) { VG.fillStyle = 'rgba(60,240,255,0.35)'; VG.fillRect(x - bw / 2 - 2, yG - 3, bw + 4, 4); VG.fillRect(x - bw / 2 + 4, yG + 1, bw - 8, 2); }
  // the shadow on the road: hard-edged rows, wider than the car, tapering
  VG.fillStyle = 'rgba(10,6,22,0.42)';
  VG.fillRect(x - bw / 2 - 3, yG - 2, bw + 6, 3); VG.fillRect(x - bw / 2 - 1, yG + 1, bw + 2, 2); VG.fillRect(x - bw / 2 + 4, yG + 3, bw - 8, 1);
  if (PC.crash) {
    VG.save(); VG.translate(x, yG - lift - 30); VG.rotate(PC.roll * 0.8 + Math.sin(PC.crash.t * 6) * 0.1); VG.drawImage(img, -spr.ax, -spr.ay + 30); VG.restore();
    return;
  }
  // clipped a 三寶: one full spin about the car's middle, the picture sliding sideways as it goes round
  const spinning = HAZ.spinT > 0;
  if (spinning) { const a = HAZ.spinDir * TAU * sstep(clamp(HAZ.spinT / HAZ.spinDur, 0, 1)); VG.save(); VG.translate(x, yG - lift - 24); VG.rotate(a); VG.translate(-x, -(yG - lift - 24)); }
  // the drift pose: rolled up onto the outside wheels, squashed a touch, hopping
  const pose = (PC.spec && PC.spec.pose) || POSE_DEFAULT;
  const roll = FX.roll + (FX.jolt > 0 ? Math.sin(G.t * 45) * 0.1 * FX.jolt * (FX.joltDir || 1) : 0), dk = FX.driftK, posed = Math.abs(roll) > 0.004 || dk > 0.02 || FX.hopY < -0.5 || Math.abs(FX.pitch || 0) > 0.005;
  if (posed) {
    const pxv = x + FX.pivot * bw * 0.42, pyv = yG - lift;
    VG.save(); VG.translate(pxv + FX.shimmyX, pyv + FX.hopY); VG.rotate(roll); VG.scale(1 + pose.stretchX * dk, (1 - pose.squashY * dk) * (1 + (FX.pitch || 0))); VG.translate(-pxv, -pyv);
    // the smear: ghost copies trailing the swing, the way an animator stretches a fast frame
    if (pose.smear > 0 && Math.abs(FX.swingV) > 0.4) {
      const n = pose.smear > 0.6 ? 3 : 2, off = -Math.sign(FX.swingV) * Math.min(14, Math.abs(FX.swingV) * 6) * dk;
      for (let i = n; i >= 1; i--) { VG.globalAlpha = pose.smear * (0.35 / i); VG.drawImage(img, Math.round(x - spr.ax + off * i), yG - spr.ay - lift); }
      VG.globalAlpha = 1;
    }
  }
  VG.drawImage(img, x - spr.ax, yG - spr.ay - lift);
  // the shield: a ring of blue light round the car
  if (PC.shield > 0 && G.mode === 'play') { VG.save(); VG.globalAlpha = 0.45 + 0.2 * Math.sin(G.t * 9); VG.strokeStyle = '#7af6ff'; VG.lineWidth = 3; VG.beginPath(); VG.ellipse(x, yG - lift - spr.ay * 0.45, bw * 0.62, spr.ay * 0.6, 0, 0, TAU); VG.stroke(); VG.restore(); }
  // braking: the lamps flare, so there is no missing it
  if (PC.brake > 0.1 && RACE.state !== 'goal') drawBrakeGlow(spr, PC._si == null ? (spr.frames.length - 1) >> 1 : PC._si, x - spr.ax, yG - spr.ay - lift, 0.7 + 0.3 * Math.min(1, PC.brake) + (Math.floor(G.t * 16) & 1 ? 0.08 : 0));
  // the two of them on top, swaying with the car and their hair in the wind
  if (spr.heads) {
    const si2 = carSteerIndex(spr), sh = spr.shift[si2];
    const ph = PC.v > 4 ? [0, 1, 0, 2][Math.floor(G.t * (5 + PC.v * 0.15)) & 3] : 0;
    for (const h of spr.heads) VG.drawImage(h.frames[ph], Math.round(x - spr.ax + h.x + sh + FX.hx - FX.pivot * 3 * dk), Math.round(yG - spr.ay - lift + h.y + FX.hy));
  }
  if (FX.cheer) drawCheer(spr, x - spr.ax, yG - spr.ay - lift, dk);
  if (posed) VG.restore();
  if (spinning) VG.restore();
}
// ---------- the crew's arms: pixel limbs drawn over the frame at the heads ----------
// where each head's centre is on the frame, for this steering picture
function headCentres(spr, dk) {
  const si = PC._si == null ? (spr.frames.length - 1) >> 1 : PC._si, out = [];
  if (spr.heads) { const sh = spr.shift[si]; for (const h of spr.heads) out.push([Math.round(h.x + h.frames[0].width / 2 + sh + FX.hx - FX.pivot * 3 * dk), Math.round(h.y + h.frames[0].height / 2 + FX.hy)]); }
  else if (spr.headPos && spr.headPos[si]) for (const q of spr.headPos[si]) out.push([q[0], q[1]]);
  return out;
}
// a limb: a thick stroke of square pixels from (x0,y0) to (x1,y1), outlined
let ARM_CTX = null;   // where the arms are drawn: the race canvas unless the showroom borrows them
function limb(x0, y0, x1, y1, w, col, outl) {
  const VG = ARM_CTX || vctx;
  const n = Math.max(1, Math.round(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0))));
  VG.fillStyle = outl;
  for (let i = 0; i <= n; i++) { const t = i / n; VG.fillRect(Math.round(x0 + (x1 - x0) * t) - (w >> 1) - 1, Math.round(y0 + (y1 - y0) * t) - (w >> 1) - 1, w + 2, w + 2); }
  VG.fillStyle = col;
  for (let i = 0; i <= n; i++) { const t = i / n; VG.fillRect(Math.round(x0 + (x1 - x0) * t) - (w >> 1), Math.round(y0 + (y1 - y0) * t) - (w >> 1), w, w); }
}
function fist(x, y, skin, outl, thumb) {
  const VG = ARM_CTX || vctx;
  VG.fillStyle = outl; VG.fillRect(x - 4, y - 4, 8, 8); VG.fillStyle = skin; VG.fillRect(x - 3, y - 3, 6, 6); VG.fillStyle = shadeCss(skin, 0.82); VG.fillRect(x - 3, y + 1, 6, 2);
  if (thumb) { VG.fillStyle = outl; VG.fillRect(x - 2, y - 9, 4, 6); VG.fillStyle = skin; VG.fillRect(x - 1, y - 8, 2, 5); }
}
function openHand(x, y, skin, outl, tilt) {
  const VG = ARM_CTX || vctx;
  VG.fillStyle = outl; VG.fillRect(x - 4, y - 5, 8, 9); VG.fillStyle = skin; VG.fillRect(x - 3, y - 4, 6, 7);
  for (let k = 0; k < 3; k++) { VG.fillStyle = outl; VG.fillRect(x - 3 + k * 2 + tilt, y - 8, 2, 4); VG.fillStyle = skin; VG.fillRect(x - 3 + k * 2 + tilt, y - 7, 1, 3); }
}
const _cssC = new Map();
function shadeCss(hex, k) { const key = hex + ':' + k; let v = _cssC.get(key); if (!v) { v = cssHex(shadeHex(hex, k)); _cssC.set(key, v); } return v; }
function drawCheer(spr, ox, oy, dk) {
  const c = FX.cheer, crew = (PC.spec && CREW[PC.spec.id]) || [], H = headCentres(spr, dk);
  if (!H.length) return;
  const outl = '#140a1a', t = c.t;
  const arm = (i, side, kind) => {
    // side: +1 the arm on the right of the body (the car's right), -1 the left
    const o = crew[i] || {}, skin = cssHex(o.skin || 0xf2c8a0), shirt = cssHex(o.shirt || 0xffffff), hx = ox + H[i][0], hy = oy + H[i][1];
    const sx = hx + side * 9, sy = hy + 7;   // the shoulder, just beside and below the head
    if (kind === 'thumb') {
      // the driver's hand off the wheel for a moment: out to the side at head height, thumb up
      const ex = sx + side * 9, ey = sy - 2, px2 = ex + side * 4, py = hy - 4;
      limb(sx, sy, ex, ey, 4, shirt, outl); limb(ex, ey, px2, py, 3, skin, outl); fist(px2, py - 2, skin, outl, true);
      return;
    }
    // a raised arm: upper arm out and up in the sleeve, forearm up to the fist above the head
    let lift = 0, hand = 'fist', tilt = 0;
    if (kind === 'fist') lift = t < 0.35 ? 0 : t < 0.6 ? 6 : 0;                       // pumped: up, down a touch, up again
    if (kind === 'wave') { hand = 'open'; tilt = (Math.floor(t * 7) & 1) ? 2 : -2; }
    if (kind === 'vee' || kind === 'goal') lift = Math.round(Math.sin(t * 9) * 2);
    const ex = sx + side * 8, ey = sy - 6 + lift * 0.5, fx = hx + side * 6, fy = hy - 19 + lift;
    limb(sx, sy, ex, ey, 4, shirt, outl); limb(ex, ey, fx, fy + 3, 3, skin, outl);
    if (hand === 'open') openHand(fx + tilt, fy, skin, outl, tilt); else fist(fx, fy, skin, outl, false);
  };
  if (c.kind === 'bark') return;   // the dog: nothing to raise; its head bob is in the picture
  if (c.kind === 'thumb' && crew[0] && !crew[0].dog) arm(0, 1, 'thumb');
  else if (c.kind === 'vee' && crew[1] && !crew[1].dog) { arm(1, -1, 'vee'); arm(1, 1, 'vee'); }
  else if (c.kind === 'goal') { for (let i = 0; i < H.length && i < 2; i++) { if (crew[i] && crew[i].dog) continue; if (i === 0) arm(0, 1, 'vee'); else { arm(1, -1, 'vee'); arm(1, 1, 'vee'); } } }
  else if (crew[1] && !crew[1].dog) arm(1, 1, c.kind);   // the passenger's outside arm, away from the driver
}
