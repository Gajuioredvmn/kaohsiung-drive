// ===================== the hero: the one who gets out of the car, painted from every side =====================
// A little puppet in the walkers' style (big round head, thick inked limbs), but seen from eight sides: each body point
// is placed in the body's own frame (x to the right, z forward, y down the page) and turned by the view angle, and the
// parts are drawn far to near. Poses: standing, a walk and a run (four steps each), a punch (wind-up and strike), and
// lying knocked over. Red short-sleeved shirt open over a white tee, denim shorts, blue-and-white flip-flops.
const HERO_LOOK = { skin: '#f0c49c', hair: '#1c1a24', shirt: '#e8423a', tee: '#f6f4ee', shorts: '#3b5a92', strap: '#3f6fd0', sole: '#f6f4ee' };
const HERO_POSES = ['idle', 'w0', 'w1', 'w2', 'w3', 'r0', 'r1', 'r2', 'r3', 'p0', 'p1'];
const HERO_DIRS = 8, HERO_W = 48, HERO_H = 62, HERO_UPM = 34;   // units, and units to the metre
// one frame: view angle phi (0 = seen from behind, +pi/2 = facing the screen's right), a pose name
function heroFrame(phi, pose, s) {
  const px = new VPix(HERO_W, HERO_H, s || 3.6), g = px.g, L = HERO_LOOK;
  g.save(); g.translate(HERO_W / 2, HERO_H - 2); g.lineCap = 'round'; g.lineJoin = 'round';
  const cp = Math.cos(phi), sp = Math.sin(phi);
  // the body frame onto the page: [screen x, page y, depth (larger is farther)]
  const P = (x, y, z) => [x * cp + z * sp, y, -x * sp + z * cp];
  const shade = (hex, k) => tShade(hex, k);
  const limb = (a, b, w, col) => { g.strokeStyle = INK; g.lineWidth = w + 2; g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke(); g.strokeStyle = col; g.lineWidth = w; g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke(); };
  const eo = (x, y, rx, ry, col, rot) => { g.fillStyle = INK; g.beginPath(); g.ellipse(x, y, rx + 1, ry + 1, rot || 0, 0, TAU); g.fill(); g.fillStyle = col; g.beginPath(); g.ellipse(x, y, rx, ry, rot || 0, 0, TAU); g.fill(); };
  const e = (x, y, rx, ry, col, rot) => { g.fillStyle = col; g.beginPath(); g.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), rot || 0, 0, TAU); g.fill(); };
  const blob = (pts, col, ink) => { g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); if (ink !== false) { g.strokeStyle = INK; g.lineWidth = 2; g.stroke(); } g.fillStyle = col; g.fill(); };
  // ---- the pose ----
  const run = pose[0] === 'r', walk = pose[0] === 'w', punch = pose[0] === 'p', ph = (run || walk) ? +pose[1] / 4 : 0;
  const A = run ? 0.82 : walk ? 0.46 : 0, sw = Math.sin(ph * TAU) * A, bob = run ? -Math.abs(Math.cos(ph * TAU)) * 2.4 : walk ? -Math.abs(Math.cos(ph * TAU)) * 1.0 : 0;
  const lean = run ? 3.2 : punch ? (pose === 'p1' ? 2.2 : -0.8) : 0;           // the top of the body ahead of the hips, in units
  const twist = punch ? (pose === 'p1' ? 0.42 : -0.3) : 0;                       // the shoulders turned about the spine
  const hipY = -15 + bob, shY = -31 + bob, headY = -41 + bob;
  const up = (y) => (hipY - y) / (hipY - headY);                                 // 0 at the hips, 1 at the head
  // the upper body leans forward and turns: a point above the hips is carried along with it
  const U = (x, y, z) => { const k = up(y), tw = twist * k, c = Math.cos(tw), s = Math.sin(tw); return P(x * c + z * s, y, -x * s + z * c + lean * k); };
  // ---- legs: thigh then shin, swung in the body's own fore-and-aft plane ----
  const legs = [-1, 1].map((side) => {
    const a = side * sw, lift = (run || walk) ? Math.max(0, -Math.sin(ph * TAU) * side) * (run ? 3.2 : 1.6) : 0;
    const kneeBend = run ? (a < 0 ? 1.1 : 0.35) : walk ? (a < 0 ? 0.5 : 0.15) : 0.05;
    const hip = [side * 3.0, hipY, 0], kn = [hip[0], hip[1] + Math.cos(a) * 7, hip[2] + Math.sin(a) * 7];
    const a2 = a - kneeBend; let ft = [kn[0], kn[1] + Math.cos(a2) * 6.6, kn[2] + Math.sin(a2) * 6.6];
    const ground = -1.4 - lift; if (ft[1] > ground) ft = [ft[0], ground, ft[2]];
    return { side, hip, kn, ft, depth: P(...ft)[2] };
  });
  const drawLeg = (Lg) => {
    const H = P(...Lg.hip), K = P(...Lg.kn), F = P(...Lg.ft), near = Lg.depth <= 0.3, skin = near ? L.skin : shade(L.skin, -0.15), sh = near ? L.shorts : shade(L.shorts, -0.2);
    limb(K, F, 3.8, skin);
    // the shorts: hip to just above the knee
    const mid = [lerp(H[0], K[0], 0.75), lerp(H[1], K[1], 0.75)]; limb(H, mid, 6.4, sh);
    // the flip-flop: a sole along the foot (forward is +z), and the blue strap over it
    const toe = P(Lg.ft[0], Lg.ft[1] + 0.6, Lg.ft[2] + 3.2), heel = P(Lg.ft[0], Lg.ft[1] + 0.6, Lg.ft[2] - 1.2);
    const cx = (toe[0] + heel[0]) / 2, len = Math.abs(toe[0] - heel[0]) / 2 + 1.7;
    eo(cx, F[1] + 0.9, len, 1.3, L.sole); e(cx, F[1] + 0.2, Math.max(1.2, len * 0.55), 1.0, near ? L.strap : shade(L.strap, -0.2));
  };
  // ---- arms: upper arm in the sleeve, forearm bare, a round fist ----
  const arms = [-1, 1].map((side) => {
    let s = -side * sw * 0.9, bend = run ? 1.35 : walk ? 0.25 : 0.12;
    if (punch) { if (side === 1) { if (pose === 'p1') { s = Math.PI / 2 - 0.08; bend = 0.08; } else { s = -0.5; bend = 1.9; } } else { s = 0.55; bend = 2.0; } }
    const sh = [side * 6.0, shY + 1.6, 0], el = [sh[0] + side * 0.4, sh[1] + Math.cos(s) * 6.4, sh[2] + Math.sin(s) * 6.4];
    const s2 = s + bend, hd = [el[0], el[1] + Math.cos(s2) * 6.0, el[2] + Math.sin(s2) * 6.0];
    return { side, sh, el, hd, depth: U(...hd)[2] };
  });
  const drawArm = (Ar) => {
    const S = U(...Ar.sh), E = U(...Ar.el), Hd = U(...Ar.hd), near = Ar.depth <= 0.3, skin = near ? L.skin : shade(L.skin, -0.15);
    limb(E, Hd, 3.4, skin); limb(S, E, 4.8, near ? L.shirt : shade(L.shirt, -0.22));
    eo(Hd[0], Hd[1] + 0.4, punch && Ar.side === 1 ? 2.7 : 2.2, punch && Ar.side === 1 ? 2.7 : 2.2, skin);
  };
  // ---- the torso: a rounded box seen from the side it is turned to ----
  const drawTorso = () => {
    const ring = (y, hx, hz, n) => { const out = []; for (let i = 0; i < n; i++) { const a = (i / n) * TAU; out.push(U(Math.cos(a) * hx, y, Math.sin(a) * hz)); } return out; };
    const top = ring(shY - 0.5, 6.2, 3.6, 24), bot = ring(hipY + 1.6, 5.8, 3.4, 24);
    // the silhouette: the widest points of the two rings, left and right, joined
    const ext = (pts) => { let lo = pts[0], hi = pts[0]; for (const q of pts) { if (q[0] < lo[0]) lo = q; if (q[0] > hi[0]) hi = q; } return [lo, hi]; };
    const [tl, tr] = ext(top), [bl, br] = ext(bot);
    blob([[tl[0], tl[1] + 1.6], [tl[0] + 2, tl[1] - 0.6], [tr[0] - 2, tr[1] - 0.6], [tr[0], tr[1] + 1.6], [br[0], br[1]], [bl[0], bl[1]]], L.shirt);
    // the open front: the white tee in a strip down the middle of the chest, where the chest faces us
    const fz = U(0, (shY + hipY) / 2, 3.6), facing = fz[2] < -0.6;
    if (facing) {
      const c0 = U(0, shY + 0.2, 3.7), c1 = U(0, hipY + 1.4, 3.5), w = 2.4 * Math.min(1, -fz[2] / 3);
      blob([[c0[0] - w, c0[1]], [c0[0] + w, c0[1]], [c1[0] + w * 0.8, c1[1]], [c1[0] - w * 0.8, c1[1]]], L.tee, false);
      // the collar points
      blob([[c0[0] - w - 1.6, c0[1] - 0.2], [c0[0] - w * 0.2, c0[1] - 0.2], [c0[0] - w - 0.2, c0[1] + 3.6]], shade(L.shirt, 0.12), false);
      blob([[c0[0] + w + 1.6, c0[1] - 0.2], [c0[0] + w * 0.2, c0[1] - 0.2], [c0[0] + w + 0.2, c0[1] + 3.6]], shade(L.shirt, 0.12), false);
    } else {
      // seen from behind: a darker stripe across the shoulders (the yoke) and a fold
      const y0 = U(0, shY + 3, -3.6); if (y0[2] < 0) { const a = U(-5.4, shY + 3, -2.6), b = U(5.4, shY + 3, -2.6); g.strokeStyle = shade(L.shirt, -0.2); g.lineWidth = 1.2; g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke(); }
    }
    // the shade on the far side of the body
    const far = U(-sp >= 0 ? -4 : 4, (shY + hipY) / 2 + 2, 0); e(far[0], far[1], 2.2, (hipY - shY) * 0.38, shade(L.shirt, -0.18));
  };
  // ---- the head: skin ball, hair mass behind and on top, face where the front of the head faces us ----
  const drawHead = () => {
    const C = U(0, headY, 0), R = 9.6;
    // the neck
    const nk = U(0, shY - 1.2, 0); limb(nk, [nk[0], nk[1] - 3], 4.6, L.skin);
    const hairBack = U(0, headY - 1.4, -2.4), hb = hairBack[2] < C[2] - 0.9;   // the hair mass sits behind and above the head (seen from behind once it is nearer than the head)
    const spikes = () => { for (let i = 0; i < 7; i++) { const a = -Math.PI * (0.12 + i * 0.13), r0 = 9.2, bx = Math.cos(a) * r0, by = Math.sin(a) * r0; const tip = U(bx * 1.2, headY + by * 1.25 - 1.6, -2.2 + Math.sin(i) * 1.2), b0 = U(bx - 2.2, headY + by, -1.2), b1 = U(bx + 2.2, headY + by, -1.2); blob([[b0[0], b0[1]], [tip[0], tip[1]], [b1[0], b1[1]]], L.hair); } };
    if (!hb) { eo(hairBack[0], hairBack[1], 10.4, 10.2, L.hair); spikes(); }
    // the ears, when they are on the near side
    for (const side of [-1, 1]) { const ear = U(side * 9.3, headY + 1.2, -0.4); if (ear[2] < C[2] - 3.5) eo(ear[0], ear[1], 1.8, 2.4, L.skin); }
    eo(C[0], C[1], R, R * 0.98, L.skin);
    if (hb) {
      // from behind: the back of the head is all hair, spiky on top
      eo(hairBack[0], hairBack[1], 10.4, 10.2, L.hair); spikes();
      for (const side of [-1, 1]) { const ear = U(side * 9.3, headY + 1.2, -0.4); if (ear[2] < C[2] + 2.5 && Math.abs(ear[0] - C[0]) > 7.5) eo(ear[0], ear[1], 1.6, 2.2, L.skin); }
      return;
    }
    // the cheek light and the fringe over the forehead
    const fc = U(0, headY + 3, 8.6); if (fc[2] < C[2] - 2) { g.save(); g.beginPath(); g.ellipse(C[0], C[1], R - 0.4, R * 0.98 - 0.4, 0, 0, TAU); g.clip(); e(fc[0] + (fc[0] - C[0]) * 0.1, fc[1], 6.4, 4.2, tShade(L.skin, 0.07)); g.restore(); }
    const fr = []; for (let i = 0; i <= 8; i++) { const t = i / 8, a = -Math.PI * (0.18 + t * 0.64); const r0 = 9.9; fr.push(U(Math.cos(a) * r0, headY + Math.sin(a) * r0 - 0.5, 2.2)); }
    // the bangs' points lie on the ball of the head, so turned to the side they stay inside its outline
    const onHead = (x, y) => { const dy = y - headY, z = Math.sqrt(Math.max(0, R * R * 0.98 - x * x - dy * dy)); return U(x, y, z); };
    const fb = []; for (let i = 8; i >= 0; i--) { const t = i / 8, x = lerp(7.2, -7.2, 1 - t), y = headY - 4.6 + (i % 2) * 1.8; fb.push(onHead(x, y)); }
    const fringe = fr.concat(fb).filter((q) => q[2] < C[2] + 4).map((q) => [q[0], q[1]]); if (fringe.length > 3) blob(fringe, L.hair);
    // eyes, brows, mouth: only those on the front of the head that faces us
    for (const side of [-1, 1]) {
      const eye = U(side * 3.2, headY + 1.6, 8.6); if (eye[2] > C[2] - 3) continue;
      e(eye[0], eye[1], 1.35, 1.95, INK); e(eye[0] - 0.4, eye[1] - 0.8, 0.5, 0.5, '#ffffff');
      const b0 = U(side * 1.6, headY - 2.4, 8.9), b1 = U(side * 5.0, headY - 3.0, 8.4); g.strokeStyle = L.hair; g.lineWidth = 1.6; g.beginPath(); g.moveTo(b0[0], b0[1]); g.lineTo(b1[0], b1[1]); g.stroke();
    }
    // the nose, a little hook on the profile when the head is turned to the side
    const no = U(0, headY + 3.4, 9.7); if (Math.abs(sp) > 0.55 && no[2] < C[2] + 1) { const d = Math.sign(no[0] - C[0]) || 1; g.strokeStyle = INK; g.lineWidth = 0.9; g.beginPath(); g.moveTo(no[0] - d * 0.4, no[1] - 1.4); g.quadraticCurveTo(no[0] + d * 1.4, no[1] + 0.2, no[0] - d * 0.2, no[1] + 0.9); g.stroke(); }
    const mo = U(0, headY + 6.4, 8.4);
    if (mo[2] < C[2] + 0.5) { g.strokeStyle = INK; g.lineWidth = 0.9; g.beginPath(); if (punch) { g.ellipse(mo[0], mo[1], 1.3, 1.0, 0, 0, TAU); } else { g.moveTo(mo[0] - 1.6, mo[1] - 0.3); g.quadraticCurveTo(mo[0], mo[1] + 0.9, mo[0] + 1.6, mo[1] - 0.3); } g.stroke(); }
  };
  // ---- far to near ----
  legs.sort((a, b) => b.depth - a.depth); for (const Lg of legs) drawLeg(Lg);
  const back = arms.filter((a) => a.depth > 0.6), front = arms.filter((a) => a.depth <= 0.6);
  back.sort((a, b) => b.depth - a.depth); for (const Ar of back) drawArm(Ar);
  drawTorso();
  front.sort((a, b) => b.depth - a.depth); for (const Ar of front) drawArm(Ar);
  drawHead();
  g.restore();
  return px;
}
// knocked over: the side view lying on its back
function heroDown(s) {
  const up = heroFrame(Math.PI / 2, 'idle', s), px = new VPix(HERO_H, HERO_W, s || 3.6), g = px.g;
  g.save(); g.translate(2, HERO_W - 2); g.rotate(-Math.PI / 2); g.drawImage(up.cv, 0, 0, HERO_W, HERO_H); g.restore();
  return px;
}
// every frame, in order: direction-major, the poses in HERO_POSES order, then the one lying down
function paintHero() {
  const s = STYLE.toon ? 3.6 : 2.2, out = [];
  for (let d = 0; d < HERO_DIRS; d++) for (const p of HERO_POSES) out.push(heroFrame((d / HERO_DIRS) * TAU, p, s));
  out.push(heroDown(s));
  return { frames: out, s };
}
// ---------- the little effects: smoke from a hurt engine, the burst of a punch landing ----------
function paintPuff(cols, seed) {
  const px = new VPix(34, 30, 3), g = px.g, r = mulberry(seed);
  const balls = [[17, 18, 9], [9, 19, 6.5], [25, 19, 6.5], [12, 11, 6.5], [22, 11, 7]];
  for (const [x, y, rad] of balls) { const jx = (r() - 0.5) * 2, jy = (r() - 0.5) * 2; g.fillStyle = INK; g.beginPath(); g.arc(x + jx, y + jy, rad + 1.3, 0, TAU); g.fill(); }
  for (const [x, y, rad] of balls) { g.fillStyle = cols[0]; g.beginPath(); g.arc(x, y, rad, 0, TAU); g.fill(); }
  for (const [x, y, rad] of balls) { g.fillStyle = cols[1]; g.beginPath(); g.arc(x - rad * 0.25, y - rad * 0.3, rad * 0.55, 0, TAU); g.fill(); }
  return px;
}
function paintPow() {
  const px = new VPix(40, 40, 3), g = px.g, star = (R0, R1, n, rot) => { const pts = []; for (let i = 0; i < n * 2; i++) { const a = rot + (i / (n * 2)) * TAU, rr = i % 2 ? R1 : R0; pts.push([20 + Math.cos(a) * rr, 20 + Math.sin(a) * rr]); } return pts; };
  const fill = (pts, col, ink) => { g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); if (ink) { g.strokeStyle = INK; g.lineWidth = 2.4; g.stroke(); } g.fillStyle = col; g.fill(); };
  fill(star(19, 10, 9, 0.2), '#ffd23a', true); fill(star(12, 6.5, 9, 0.5), '#ff6a3a', false);
  g.fillStyle = '#ffffff'; g.font = '900 11px "Noto Sans TC",sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.strokeStyle = INK; g.lineWidth = 2.6; g.strokeText('砰', 20, 20.5); g.fillText('砰', 20, 20.5);
  return px;
}
function paintFxSprites() {
  propKind('smoke0', paintPuff(['#f2f0ec', '#ffffff'], 11), 1.0); propKind('smoke1', paintPuff(['#8e8c96', '#a8a6ae'], 12), 1.0); propKind('smoke2', paintPuff(['#2e2a36', '#45404e'], 13), 1.0);
  propKind('pow', paintPow(), 0.9);
}
