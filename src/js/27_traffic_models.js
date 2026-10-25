// ===================== traffic models: little solids of the cars, scooters, trucks and buses of 高雄, painted at thirteen angles =====================
// The models are lofts (see 26_solid.js); each is rendered from behind through to head-on in 15° steps, and the
// other half of the turn is the same frames mirrored. Taiwan's traffic: sedans, 小黃 taxis, 小發財 blue trucks,
// city buses, SUVs, wagons, gravel trucks, and a great many scooters with their riders.
const GLASS = [0x2a3a4e, 0x9ccce4], GLASS_F = [0x3a4a60, 0xb0d8ec];
function cabinTone(nrm, P) { const [nx, ny, nz] = nrm; if (ny > 0.75) return P[4]; if (Math.abs(nz) > 0.5) return GLASS[1]; return GLASS[0]; }
// a sedan or a taxi: a three-box body, lamps in the corners, a plate, bumpers; front: headlights and a grille
function sedanModel(col, o, view) {
  o = o || {};
  const L = 4.5, zA = 0.95, wb = 2.65, hw = 0.88, zs = view === 'front' ? wb : 0, Z = (z) => z - zs;
  const body = { col, secs: [rectSec(Z(-zA), hw - 0.04, 0.3, 0.86, { r: 0.1 }), rectSec(Z(-0.3), hw, 0.28, 0.94, { r: 0.1 }), rectSec(Z(0.3), hw, 0.28, 0.92, { r: 0.1 }), rectSec(Z(2.8), hw, 0.3, 0.9, { r: 0.1 }), rectSec(Z(L - zA - 0.1), hw - 0.02, 0.34, 0.78, { r: 0.08 })] };
  const cabin = { col, tone: cabinTone, secs: [rectSec(Z(0.0), hw - 0.1, 0.9, 0.93), rectSec(Z(0.55), hw - 0.12, 0.9, 1.44, { r: 0.08 }), rectSec(Z(2.1), hw - 0.12, 0.9, 1.44, { r: 0.08 }), rectSec(Z(2.85), hw - 0.1, 0.9, 0.93)] };
  const parts = [body, cabin];
  if (o.sign) parts.push(boxPart(0.3, 1.44, 1.6, Z(1.1), Z(1.5), 0xf2c21a));
  if (o.bar) { parts.push(boxPart(0.42, 1.44, 1.62, Z(1.2), Z(1.5), 0xff2020, { r: 0.04 })); parts.push({ col: 0x2040ff, secs: [rectSec(Z(1.2), 0.42, 1.44, 1.62, { r: 0.04 }), rectSec(Z(1.5), 0.42, 1.44, 1.62, { r: 0.04 })].map((q) => ({ z: q.z, pts: q.pts.map((pt) => [pt[0] * 0.5 - 0.21, pt[1]]) })) }); }
  const tyres = [{ x: -0.74, z: Z(0), R: 0.31, w: 0.2 }, { x: 0.74, z: Z(0), R: 0.31, w: 0.2 }, { x: -0.74, z: Z(wb), R: 0.31, w: 0.2 }, { x: 0.74, z: Z(wb), R: 0.31, w: 0.2 }];
  const extras = [(c) => {
    if (view !== 'front') {
      const z = Z(-zA) - 0.001;
      for (const sx of [-1, 1]) { const q = plate(c, z, sx * (hw - 0.34), sx * (hw - 0.08), 0.56, 0.74, 0xd01a22); plate(c, z, sx * (hw - 0.3), sx * (hw - 0.12), 0.66, 0.73, 0xff6a5a, 0.012); lampBox(c, q); plate(c, z, sx * (hw - 0.3), sx * (hw - 0.22), 0.58, 0.64, 0xf2a01a, 0.012); }
      plate(c, z, -0.2, 0.2, 0.36, 0.48, 0xf4f4ec); plate(c, z, -hw + 0.06, hw - 0.06, 0.3, 0.36, 0x1c1a22);
      plate(c, z, -0.06, 0.06, 0.78, 0.84, 0xd01a22);
      if (o.sign) { plate(c, Z(1.1) - 0.001, -0.26, 0.26, 1.46, 1.58, 0x1a1a1a); plate(c, Z(1.1) - 0.002, -0.2, 0.2, 1.49, 1.55, 0xf2c21a); }
    } if (view !== 'rear') {
      const z = Z(L - zA - 0.1) + 0.001;
      for (const sx of [-1, 1]) { const q = plate(c, z, sx * (hw - 0.36), sx * (hw - 0.08), 0.54, 0.72, 0xfff8dc); plate(c, z, sx * (hw - 0.32), sx * (hw - 0.12), 0.62, 0.7, 0xffffff, 0.012); lampBox(c, q); }
      plate(c, z, -0.42, 0.42, 0.52, 0.7, 0x16161a); for (let k = 0; k < 3; k++) plate(c, z, -0.4, 0.4, 0.55 + k * 0.05, 0.56 + k * 0.05, 0x4a4a52, 0.012);
      plate(c, z, -0.2, 0.2, 0.38, 0.5, 0xf4f4ec); plate(c, z, -hw + 0.06, hw - 0.06, 0.34, 0.4, 0x1c1a22);
    }
    // door mirrors
    for (const sx of [-1, 1]) detail(c, [[sx * (hw + 0.02), 1.0, Z(2.6)], [sx * (hw + 0.2), 1.0, Z(2.6)], [sx * (hw + 0.2), 1.12, Z(2.6)], [sx * (hw + 0.02), 1.12, Z(2.6)]], shadeHex(col, 0.8));
  }];
  return { parts, tyres, extras, shadow: { hw: hw + 0.08, z0: Z(-zA), z1: Z(L - zA) } };
}
// a pickup: cab, bonnet, an open bed with low sides and a tailgate
function pickupModel(col, view) {
  const L = 5.1, zA = 1.2, wb = 3.1, hw = 0.94, zs = view === 'front' ? wb : 0, Z = (z) => z - zs;
  const chassis = boxPart(hw, 0.4, 0.62, Z(-zA), Z(L - zA), col);
  const bed = Object.assign(boxPart(hw, 0.62, 1.05, Z(-zA), Z(1.3), col), { open: (k, e) => e === 4 });
  const cab = { col, tone: (n, P) => (n[1] > 0.75 ? P[4] : Math.abs(n[2]) > 0.5 ? GLASS[1] : n[0] * n[0] > 0.5 ? P[2] : GLASS[0]), secs: [rectSec(Z(1.3), hw - 0.06, 1.0, 1.02), rectSec(Z(1.55), hw - 0.08, 1.0, 1.78, { r: 0.08 }), rectSec(Z(2.9), hw - 0.08, 1.0, 1.78, { r: 0.08 }), rectSec(Z(3.45), hw - 0.06, 1.0, 1.02)] };
  const bonnet = { col, secs: [rectSec(Z(3.4), hw, 0.6, 1.02, { r: 0.08 }), rectSec(Z(L - zA), hw - 0.02, 0.62, 0.96, { r: 0.08 })] };
  const tyres = [{ x: -0.78, z: Z(0), R: 0.36, w: 0.24 }, { x: 0.78, z: Z(0), R: 0.36, w: 0.24 }, { x: -0.78, z: Z(wb), R: 0.36, w: 0.24 }, { x: 0.78, z: Z(wb), R: 0.36, w: 0.24 }];
  const extras = [(c) => {
    if (view !== 'front') {
      const z = Z(-zA) - 0.001;
      plate(c, z, -hw + 0.08, hw - 0.08, 0.66, 1.0, shadeHex(col, 0.9)); plate(c, z, -hw + 0.12, hw - 0.12, 0.72, 0.94, shadeHex(col, 1.05), 0.012);
      for (const sx of [-1, 1]) { const q = plate(c, z, sx * (hw - 0.3), sx * (hw - 0.1), 0.5, 0.64, 0xd01a22); lampBox(c, q); }
      plate(c, z, -0.2, 0.2, 0.44, 0.56, 0xf4f4ec); plate(c, z, -hw + 0.04, hw - 0.04, 0.4, 0.46, 0x9aa0a6);
      // what is in the bed
      detail(c, [[-hw + 0.1, 0.62, Z(-zA + 0.1)], [hw - 0.1, 0.62, Z(-zA + 0.1)], [hw - 0.1, 0.62, Z(1.2)], [-hw + 0.1, 0.62, Z(1.2)]], shadeHex(col, 0.5), -0.02);
    } if (view !== 'rear') {
      const z = Z(L - zA) + 0.001;
      for (const sx of [-1, 1]) { const q = plate(c, z, sx * (hw - 0.36), sx * (hw - 0.1), 0.72, 0.88, 0xfff8dc); lampBox(c, q); }
      plate(c, z, -0.4, 0.4, 0.68, 0.9, 0x16161a); plate(c, z, -hw + 0.04, hw - 0.04, 0.62, 0.68, 0x9aa0a6); plate(c, z, -0.2, 0.2, 0.5, 0.6, 0xf4f4ec);
    }
  }];
  return { parts: [chassis, bed, cab, bonnet], tyres, extras, shadow: { hw: hw + 0.08, z0: Z(-zA), z1: Z(L - zA) } };
}
// 小發財: the little blue cab-over truck of every Taiwanese road, a flat bed behind its tall narrow cab
function blueTruckModel(cargo, view) {
  const col = 0x1a4ab8, L = 4.7, zA = 0.9, wb = 2.5, hw = 0.82, zs = view === 'front' ? wb : 0, Z = (z) => z - zs;
  const chassis = boxPart(hw - 0.1, 0.38, 0.6, Z(-zA), Z(L - zA - 0.1), 0x2a2a30);
  const floor = boxPart(hw, 0.6, 0.78, Z(-zA), Z(2.3), col);
  const rails = Object.assign(boxPart(hw, 0.78, 1.08, Z(-zA), Z(2.3), col), { open: (k, e) => e === 4 });
  const cab = { col, tone: (n, P) => (n[1] > 0.75 ? P[4] : n[2] > 0.5 ? GLASS[1] : n[2] < -0.5 ? P[3] : n[0] * n[0] > 0.5 ? P[2] : P[3]), secs: [rectSec(Z(2.3), hw, 0.6, 2.0, { r: 0.08 }), rectSec(Z(L - zA), hw, 0.6, 2.0, { r: 0.08 })] };
  const parts = [chassis, floor, rails, cab];
  if (cargo) parts.push(boxPart(hw - 0.2, 0.78, 1.5, Z(-zA + 0.2), Z(2.1), cargo, { r: 0.1 }));
  const tyres = [{ x: -0.66, z: Z(0), R: 0.3, w: 0.2 }, { x: 0.66, z: Z(0), R: 0.3, w: 0.2 }, { x: -0.66, z: Z(wb), R: 0.3, w: 0.2 }, { x: 0.66, z: Z(wb), R: 0.3, w: 0.2 }];
  const extras = [(c) => {
    if (view !== 'front') {
      const z = Z(-zA) - 0.001;
      for (const sx of [-1, 1]) { const q = plate(c, z, sx * (hw - 0.26), sx * (hw - 0.06), 0.62, 0.76, 0xd01a22); lampBox(c, q); }
      plate(c, z, -0.18, 0.18, 0.62, 0.74, 0xf4f4ec);
      // the cab's rear window, seen over the bed
      plate(c, Z(2.3) - 0.001, -0.5, 0.5, 1.3, 1.8, GLASS[1]);
    } if (view !== 'rear') {
      const z = Z(L - zA) + 0.001;
      plate(c, z, -hw + 0.1, hw - 0.1, 1.15, 1.85, GLASS_F[1]); plate(c, z, -hw + 0.1, hw - 0.1, 0.62, 0.7, 0x9aa0a6);
      for (const sx of [-1, 1]) { const q = plate(c, z, sx * (hw - 0.3), sx * (hw - 0.1), 0.78, 0.92, 0xfff8dc); lampBox(c, q); }
      plate(c, z, -0.3, 0.3, 0.92, 1.05, 0x16161a); plate(c, z, -0.18, 0.18, 0.72, 0.84, 0xf4f4ec);
    }
  }];
  return { parts, tyres, extras, shadow: { hw: hw + 0.06, z0: Z(-zA), z1: Z(L - zA) } };
}
// a tour bus: a tall box with a window band and a sloped front
function busModel(band, view) {
  const col = 0xf2f2ee, L = 11.5, zA = 2.6, wb = 6.2, hw = 1.25, zs = view === 'front' ? wb : 0, Z = (z) => z - zs;
  const body = { col, tone: (n, P) => (n[1] > 0.75 ? P[4] : n[1] < -0.3 ? P[0] : n[2] < -0.5 ? P[3] : n[2] > 0.5 ? P[3] : n[0] < 0 ? P[2] : P[1]), secs: [rectSec(Z(-zA), hw, 0.4, 3.3, { r: 0.12 }), rectSec(Z(L - zA - 0.5), hw, 0.4, 3.3, { r: 0.12 }), rectSec(Z(L - zA), hw - 0.02, 0.4, 3.2, { r: 0.12 })] };
  const tyres = []; for (const z of [0, 1.3, wb]) for (const sx of [-1, 1]) tyres.push({ x: sx * 1.02, z: Z(z), R: 0.5, w: 0.3 });
  const extras = [(c) => {
    const zr = Z(-zA) - 0.001, zf = Z(L - zA) + 0.001;
    if (view !== 'front') {
      plate(c, zr, -hw + 0.12, hw - 0.12, 1.8, 3.0, GLASS[1]); plate(c, zr, -hw + 0.1, hw - 0.1, 1.1, 1.3, band); plate(c, zr, -hw + 0.1, hw - 0.1, 0.4, 0.5, 0x1c1a22);
      for (const sx of [-1, 1]) { const q = plate(c, zr, sx * (hw - 0.4), sx * (hw - 0.1), 0.62, 1.0, 0xd01a22); plate(c, zr, sx * (hw - 0.36), sx * (hw - 0.14), 0.64, 0.78, 0xf2a01a, 0.012); lampBox(c, q); }
      plate(c, zr, -0.28, 0.28, 0.64, 0.8, 0xf4f4ec);
    } if (view !== 'rear') {
      plate(c, zf, -hw + 0.1, hw - 0.1, 1.5, 3.05, GLASS_F[1]); plate(c, zf, -hw + 0.3, hw - 0.3, 2.85, 3.05, 0x1a1a2a); plate(c, zf, -0.5, 0.5, 2.88, 3.02, 0xffa030, 0.012);
      plate(c, zf, -hw + 0.1, hw - 0.1, 1.1, 1.3, band); plate(c, zf, -hw + 0.1, hw - 0.1, 0.4, 0.5, 0x1c1a22);
      for (const sx of [-1, 1]) { const q = plate(c, zf, sx * (hw - 0.4), sx * (hw - 0.1), 0.62, 0.9, 0xfff8dc); lampBox(c, q); }
      plate(c, zf, -0.5, 0.5, 0.56, 1.0, 0x2a2a34);
    }
    // the stripe along the flank and the windows, visible when turned (sorted well ahead of the long flank they sit on,
    // whose middle is no nearer than theirs: seen from behind at an angle they would otherwise go under it)
    for (const sx of [-1, 1]) { detail(c, [[sx * (hw + 0.001), 1.1, Z(-zA + 0.2)], [sx * (hw + 0.001), 1.1, Z(L - zA - 0.6)], [sx * (hw + 0.001), 1.3, Z(L - zA - 0.6)], [sx * (hw + 0.001), 1.3, Z(-zA + 0.2)]], band, 0.5); detail(c, [[sx * (hw + 0.001), 1.8, Z(-zA + 0.3)], [sx * (hw + 0.001), 1.8, Z(L - zA - 0.7)], [sx * (hw + 0.001), 2.9, Z(L - zA - 0.7)], [sx * (hw + 0.001), 2.9, Z(-zA + 0.3)]], GLASS[0], 0.5); }
  }];
  return { parts: [body], tyres, extras, shadow: { hw: hw + 0.08, z0: Z(-zA), z1: Z(L - zA) } };
}
// a gravel truck: a high cab, a hopper behind it, mud flaps
function gravelModel(view) {
  const col = 0xe8a01a, L = 8.2, zA = 1.6, wb = 4.6, hw = 1.22, zs = view === 'front' ? wb : 0, Z = (z) => z - zs;
  const chassis = boxPart(hw - 0.2, 0.5, 0.9, Z(-zA), Z(L - zA - 0.2), 0x2a2a30);
  const hopper = Object.assign({ col: 0x8a8e94, secs: [rectSec(Z(-zA), hw - 0.05, 0.9, 2.9, { r: 0.05 }), rectSec(Z(4.2), hw, 0.9, 2.9, { r: 0.05 })] }, { open: (k, e) => e === 4 });
  const cab = { col, tone: (n, P) => (n[1] > 0.75 ? P[4] : n[2] > 0.5 ? GLASS[1] : n[2] < -0.5 ? P[3] : n[0] < 0 ? P[2] : P[1]), secs: [rectSec(Z(4.4), hw - 0.08, 0.9, 3.0, { r: 0.1 }), rectSec(Z(L - zA), hw - 0.08, 0.9, 3.0, { r: 0.1 })] };
  const tyres = []; for (const z of [0, 1.35, wb]) for (const sx of [-1, 1]) tyres.push({ x: sx * 0.98, z: Z(z), R: 0.5, w: 0.3 });
  const extras = [(c) => {
    if (view !== 'front') {
      const z = Z(-zA) - 0.001;
      plate(c, z, -hw + 0.1, hw - 0.1, 1.0, 2.8, 0x7a7e84); for (let k = 0; k < 4; k++) plate(c, z, -hw + 0.1, hw - 0.1, 1.2 + k * 0.4, 1.24 + k * 0.4, 0x5a5e64, 0.012);
      for (const sx of [-1, 1]) { const q = plate(c, z, sx * (hw - 0.36), sx * (hw - 0.1), 0.6, 0.84, 0xd01a22); lampBox(c, q); }
      plate(c, z, -0.24, 0.24, 0.62, 0.78, 0xf4f4ec);
      // a heap of gravel over the top edge
      detail(c, [[-hw + 0.1, 2.9, Z(-zA + 0.2)], [hw - 0.1, 2.9, Z(-zA + 0.2)], [hw - 0.4, 3.3, Z(0.6)], [0, 3.5, Z(1.2)], [-hw + 0.4, 3.3, Z(0.6)]], 0xa89880, -0.05);
    } if (view !== 'rear') {
      const z = Z(L - zA) + 0.001;
      plate(c, z, -hw + 0.12, hw - 0.12, 1.9, 2.85, GLASS_F[1]); plate(c, z, -hw + 0.1, hw - 0.1, 1.0, 1.1, 0x9aa0a6);
      for (const sx of [-1, 1]) { const q = plate(c, z, sx * (hw - 0.36), sx * (hw - 0.1), 1.2, 1.4, 0xfff8dc); lampBox(c, q); }
      plate(c, z, -0.5, 0.5, 1.2, 1.7, 0x16161a); plate(c, z, -0.22, 0.22, 1.1, 1.2, 0xf4f4ec);
    }
  }];
  return { parts: [chassis, hopper, cab], tyres, extras, shadow: { hw: hw + 0.08, z0: Z(-zA), z1: Z(L - zA) } };
}

// an SUV: tall boxy body, big tyres, a spare on the back
function suvModel(col, view) {
  const L = 4.8, zA = 1.0, wb = 2.8, hw = 0.95, zs = view === 'front' ? wb : 0, Z = (z) => z - zs;
  const body = { col, secs: [rectSec(Z(-zA), hw - 0.04, 0.42, 1.1, { r: 0.1 }), rectSec(Z(-0.2), hw, 0.4, 1.16, { r: 0.1 }), rectSec(Z(3.0), hw, 0.4, 1.12, { r: 0.1 }), rectSec(Z(L - zA), hw - 0.06, 0.44, 1.0, { r: 0.1 })] };
  const cabin = { col, tone: cabinTone, secs: [rectSec(Z(-zA + 0.05), hw - 0.08, 1.1, 1.14), rectSec(Z(-zA + 0.3), hw - 0.1, 1.1, 1.92, { r: 0.1 }), rectSec(Z(2.5), hw - 0.1, 1.1, 1.92, { r: 0.1 }), rectSec(Z(3.3), hw - 0.08, 1.1, 1.16)] };
  const tyres = [{ x: -0.8, z: Z(0), R: 0.38, w: 0.26 }, { x: 0.8, z: Z(0), R: 0.38, w: 0.26 }, { x: -0.8, z: Z(wb), R: 0.38, w: 0.26 }, { x: 0.8, z: Z(wb), R: 0.38, w: 0.26 }];
  const extras = [(c) => {
    if (view !== 'front') {
      const z = Z(-zA) - 0.001;
      for (const sx of [-1, 1]) { const q = plate(c, z, sx * (hw - 0.3), sx * (hw - 0.06), 0.8, 1.3, 0xd01a22); plate(c, z, sx * (hw - 0.26), sx * (hw - 0.1), 1.0, 1.22, 0xff6a5a, 0.012); lampBox(c, q); }
      plate(c, z, -0.22, 0.22, 0.56, 0.7, 0xf4f4ec); plate(c, z, -hw + 0.06, hw - 0.06, 0.44, 0.52, 0x1c1a22);
      const q = plate(c, z - 0.02, -0.4, 0.4, 0.6, 1.4, 0x1c1a22); plate(c, z - 0.03, -0.3, 0.3, 0.7, 1.3, 0x2e2e34, 0.012);   // the spare on the door
      plate(c, z, -hw + 0.1, hw - 0.1, 1.46, 1.9, GLASS[1]);
      detail(c, [[-hw + 0.2, 1.94, Z(-zA + 0.3)], [hw - 0.2, 1.94, Z(-zA + 0.3)], [hw - 0.2, 2.06, Z(-zA + 0.3)], [-hw + 0.2, 2.06, Z(-zA + 0.3)]], 0x2a2a30, 0.02);   // the roof rails
    } if (view !== 'rear') {
      const z = Z(L - zA) + 0.001;
      for (const sx of [-1, 1]) { const q = plate(c, z, sx * (hw - 0.36), sx * (hw - 0.06), 0.7, 0.94, 0xfff8dc); lampBox(c, q); }
      plate(c, z, -0.5, 0.5, 0.62, 0.92, 0x16161a); for (let k = 0; k < 3; k++) plate(c, z, -0.48, 0.48, 0.66 + k * 0.08, 0.68 + k * 0.08, 0x4a4a52, 0.012);
      plate(c, z, -0.22, 0.22, 0.5, 0.6, 0xf4f4ec);
    }
    for (const sx of [-1, 1]) detail(c, [[sx * (hw + 0.02), 1.2, Z(2.7)], [sx * (hw + 0.22), 1.2, Z(2.7)], [sx * (hw + 0.22), 1.34, Z(2.7)], [sx * (hw + 0.02), 1.34, Z(2.7)]], shadeHex(col, 0.8));
  }];
  return { parts: [body, cabin], tyres, extras, shadow: { hw: hw + 0.08, z0: Z(-zA), z1: Z(L - zA) } };
}
// a station wagon: a sedan with the roof carried all the way back, a roof box on top
function wagonModel(col, view) {
  const L = 4.7, zA = 1.0, wb = 2.7, hw = 0.88, zs = view === 'front' ? wb : 0, Z = (z) => z - zs;
  const body = { col, secs: [rectSec(Z(-zA), hw - 0.04, 0.3, 0.9, { r: 0.1 }), rectSec(Z(-0.2), hw, 0.28, 0.94, { r: 0.1 }), rectSec(Z(2.9), hw, 0.3, 0.9, { r: 0.1 }), rectSec(Z(L - zA), hw - 0.06, 0.34, 0.78, { r: 0.1 })] };
  const cabin = { col, tone: cabinTone, secs: [rectSec(Z(-zA + 0.05), hw - 0.1, 0.9, 0.94), rectSec(Z(-zA + 0.25), hw - 0.12, 0.9, 1.48, { r: 0.08 }), rectSec(Z(2.3), hw - 0.12, 0.9, 1.48, { r: 0.08 }), rectSec(Z(3.05), hw - 0.1, 0.9, 0.94)] };
  const roofbox = boxPart(0.36, 1.48, 1.72, Z(0.2), Z(2.0), 0x2a2a30, { r: 0.08 });
  const tyres = [{ x: -0.74, z: Z(0), R: 0.31, w: 0.2 }, { x: 0.74, z: Z(0), R: 0.31, w: 0.2 }, { x: -0.74, z: Z(wb), R: 0.31, w: 0.2 }, { x: 0.74, z: Z(wb), R: 0.31, w: 0.2 }];
  const extras = [(c) => {
    if (view !== 'front') {
      const z = Z(-zA) - 0.001;
      for (const sx of [-1, 1]) { const q = plate(c, z, sx * (hw - 0.3), sx * (hw - 0.06), 0.62, 1.0, 0xd01a22); plate(c, z, sx * (hw - 0.26), sx * (hw - 0.1), 0.8, 0.96, 0xff6a5a, 0.012); lampBox(c, q); }
      plate(c, z, -0.2, 0.2, 0.42, 0.54, 0xf4f4ec); plate(c, z, -hw + 0.06, hw - 0.06, 0.3, 0.36, 0x1c1a22);
      plate(c, z, -hw + 0.14, hw - 0.14, 1.02, 1.44, GLASS[1]);
    } if (view !== 'rear') {
      const z = Z(L - zA) + 0.001;
      for (const sx of [-1, 1]) { const q = plate(c, z, sx * (hw - 0.36), sx * (hw - 0.08), 0.5, 0.7, 0xfff8dc); lampBox(c, q); }
      plate(c, z, -0.42, 0.42, 0.5, 0.68, 0x16161a); plate(c, z, -0.2, 0.2, 0.38, 0.48, 0xf4f4ec);
    }
    for (const sx of [-1, 1]) detail(c, [[sx * (hw + 0.02), 1.0, Z(2.5)], [sx * (hw + 0.2), 1.0, Z(2.5)], [sx * (hw + 0.2), 1.12, Z(2.5)], [sx * (hw + 0.02), 1.12, Z(2.5)]], shadeHex(col, 0.8));
  }];
  return { parts: [body, cabin, roofbox], tyres, extras, shadow: { hw: hw + 0.08, z0: Z(-zA), z1: Z(L - zA) } };
}
// a semi-trailer: a flatbed behind a tractor, loaded with bundles of rebar or a stack of logs, the ends toward you
function trailerModel(load, view) {
  const L = 16, zA = 1.5, hw = 1.24, zs = view === 'front' ? 12.5 : 0, Z = (z) => z - zs;
  const bed = boxPart(hw, 0.95, 1.25, Z(-zA), Z(10.5), 0x3a3a42);
  const chassis = boxPart(hw - 0.3, 0.5, 0.95, Z(-zA), Z(10.2), 0x2a2a30);
  const cab = { col: load === 'logs' ? 0x18884a : 0xd8242a, tone: (n, P) => (n[1] > 0.75 ? P[4] : n[2] > 0.5 ? GLASS[1] : n[2] < -0.5 ? P[3] : n[0] < 0 ? P[2] : P[1]), secs: [rectSec(Z(10.6), hw - 0.08, 0.9, 3.1, { r: 0.1 }), rectSec(Z(12.9), hw - 0.08, 0.9, 3.1, { r: 0.1 }), rectSec(Z(L - zA), hw - 0.2, 0.9, 1.5, { r: 0.1 })] };
  const parts = [chassis, bed, cab];
  if (load === 'logs') { for (let row = 0; row < 3; row++) for (let k = 0; k < 4 - row; k++) { const x = (k - (3 - row) / 2) * 0.62, y = 1.25 + row * 0.54 + 0.3; parts.push({ col: 0x8a5a2a, secs: [rectSec(Z(-zA + 0.3), 0.3, y - 0.3, y + 0.3, { r: 0.3 }), rectSec(Z(10.2), 0.3, y - 0.3, y + 0.3, { r: 0.3 })].map((sec) => ({ z: sec.z, pts: sec.pts.map((q) => [q[0] + x, q[1]]) })) }); } }
  else { parts.push(boxPart(hw - 0.2, 1.25, 1.75, Z(-zA - 0.9), Z(10.2), 0x5a5a62)); }   // the rebar bundles stick out past the bed
  for (const sx of [-1, 1]) parts.push(boxPart(0.06, 1.25, 2.5, Z(2.6 + sx * 0), Z(2.7), 0xd8242a));
  const tyres = []; for (const z of [0, 1.4, 11.2, 12.6]) for (const sx of [-1, 1]) tyres.push({ x: sx * 0.98, z: Z(z), R: 0.5, w: 0.3 });
  const extras = [(c) => {
    if (view !== 'front') {
      const z = Z(-zA) - 0.001, ze = load === 'logs' ? Z(-zA + 0.3) : Z(-zA - 0.9);
      for (const sx of [-1, 1]) { const q = plate(c, z, sx * (hw - 0.34), sx * (hw - 0.1), 0.98, 1.2, 0xd01a22); lampBox(c, q); }
      plate(c, z, -0.24, 0.24, 1.0, 1.16, 0xf4f4ec);
      for (let k = 0; k < 6; k++) { plate(c, z + 0.001, -hw + 0.1 + k * 0.4, -hw + 0.3 + k * 0.4, 0.98, 1.22, k % 2 ? 0xd8242a : 0xf4f4ec, 0.011); }   // the hazard stripes
      if (load === 'logs') { for (let row = 0; row < 3; row++) for (let k = 0; k < 4 - row; k++) { const x = (k - (3 - row) / 2) * 0.62, y = 1.55 + row * 0.54; const pts = []; for (let a = 0; a < 10; a++) pts.push([x + Math.cos((a / 10) * TAU) * 0.3, y + Math.sin((a / 10) * TAU) * 0.3, ze - 0.001]); detail(c, pts, 0xd8b078, 0.013); const inner = pts.map((q) => [x + (q[0] - x) * 0.6, y + (q[1] - y) * 0.6, q[2]]); detail(c, inner, 0xb88848, 0.014); } }
      else { for (let i = 0; i < 24; i++) { const x = -hw + 0.3 + (i % 8) * 0.28, y = 1.33 + Math.floor(i / 8) * 0.16; detail(c, [[x - 0.04, y - 0.04, ze - 0.001], [x + 0.04, y - 0.04, ze - 0.001], [x + 0.04, y + 0.04, ze - 0.001], [x - 0.04, y + 0.04, ze - 0.001]], 0x8a8a92, 0.013); } plate(c, ze - 0.002, -0.3, 0.3, 1.3, 1.7, 0xd8242a, 0.014); }
    } if (view !== 'rear') {
      const z = Z(L - zA) + 0.001;
      plate(c, z, -hw + 0.12, hw - 0.12, 2.0, 2.95, GLASS_F[1]); plate(c, z, -hw + 0.1, hw - 0.1, 1.0, 1.1, 0x9aa0a6);
      for (const sx of [-1, 1]) { const q = plate(c, z, sx * (hw - 0.36), sx * (hw - 0.1), 1.2, 1.4, 0xfff8dc); lampBox(c, q); }
      plate(c, z, -0.5, 0.5, 1.2, 1.8, 0x16161a);
    }
  }];
  return { parts, tyres, extras, shadow: { hw: hw + 0.08, z0: Z(-zA - 0.9), z1: Z(L - zA) } };
}

// a scooter and its rider: the step-through body, the seat, a rider in a helmet leaning on the bars
function scooterModel(col, helmet, shirt, view, noRider) {
  const L = 1.85, zA = 0.3, wb = 1.3, Z = (z) => z;
  const body = { col, secs: [rectSec(Z(-zA), 0.3, 0.45, 0.8, { r: 0.1 }), rectSec(Z(0.6), 0.32, 0.4, 0.86, { r: 0.1 }), rectSec(Z(0.9), 0.2, 0.3, 0.5, { r: 0.08 }), rectSec(Z(1.4), 0.28, 0.35, 0.85, { r: 0.1 }), rectSec(Z(L - zA), 0.26, 0.4, 0.75, { r: 0.1 })] };
  const seat = boxPart(0.22, 0.8, 0.9, Z(-zA + 0.1), Z(0.75), 0x1a1a1e, { r: 0.05 });
  const legs = { col: 0x2a3a5a, secs: [rectSec(Z(0.3), 0.26, 0.45, 0.9), rectSec(Z(0.95), 0.26, 0.45, 0.9)] };
  const torso = { col: shirt, secs: [rectSec(Z(0.25), 0.24, 0.9, 1.0, { r: 0.06 }), rectSec(Z(0.35), 0.26, 0.9, 1.42, { r: 0.1 }), rectSec(Z(0.65), 0.24, 0.9, 1.42, { r: 0.1 })] };
  const arms = boxPart(0.3, 1.1, 1.22, Z(0.6), Z(1.25), shirt, { r: 0.05 });
  const head = { col: helmet, secs: [rectSec(Z(0.32), 0.12, 1.42, 1.5, { r: 0.05 }), rectSec(Z(0.3), 0.15, 1.5, 1.72, { r: 0.12 }), rectSec(Z(0.62), 0.15, 1.5, 1.72, { r: 0.12 }), rectSec(Z(0.6), 0.1, 1.46, 1.52, { r: 0.05 })] };
  const bars = boxPart(0.34, 1.0, 1.06, Z(1.3), Z(1.36), 0x3a3a3a);
  const tyres = [{ x: 0, z: Z(0), R: 0.24, w: 0.1 }, { x: 0, z: Z(wb), R: 0.24, w: 0.1 }];
  const extras = [(c) => {
    if (view !== 'front') { const z = Z(-zA) - 0.001; const q = plate(c, z, -0.1, 0.1, 0.6, 0.7, 0xe8343a); lampBox(c, q); plate(c, z, -0.08, 0.08, 0.48, 0.56, 0xf4f4ec); }
    if (view !== 'rear') { const z = Z(L - zA) + 0.001; const q = plate(c, z, -0.1, 0.1, 0.55, 0.68, 0xfff8d8); lampBox(c, q); if (!STYLE.toon) plate(c, Z(0.62) + 0.001, -0.1, 0.1, 1.54, 1.64, 0x2a3440); }
  }];
  // the illustrated style gives the rider a round helmet with its visor and a bit of face, instead of the boxy head
  if (STYLE.toon && !noRider) extras.push((c) => {
    const cen = c.pr(0, 1.6, 0.46), top = c.pr(0, 1.78, 0.46), r = Math.max(1.5, Math.hypot(top[0] - cen[0], top[1] - cen[1])), vis = c.pr(0, 1.57, 0.62), front = vis[2] < cen[2] - 0.02;
    c.items.push({ d: cen[2] - 0.03, L: 1, draw: () => {
      const g = c.px.g; if (!g) return;
      g.strokeStyle = INK; g.lineWidth = 0.8; g.fillStyle = cssHex(helmet); g.beginPath(); g.ellipse(cen[0], cen[1], r * 1.04, r, 0, 0, TAU); g.fill(); g.stroke();
      g.fillStyle = 'rgba(255,255,255,0.5)'; g.beginPath(); g.ellipse(cen[0] - r * 0.35, cen[1] - r * 0.45, r * 0.32, r * 0.18, -0.5, 0, TAU); g.fill();
      if (front) { const vx = vis[0], vy = vis[1]; g.fillStyle = '#f2c8a0'; g.beginPath(); g.ellipse(vx, vy + r * 0.3, r * 0.5, r * 0.3, 0, 0, TAU); g.fill(); g.fillStyle = '#2a3440'; g.beginPath(); g.ellipse(vx, vy - r * 0.05, r * 0.62, r * 0.32, 0, 0, TAU); g.fill(); g.stroke(); }
    } });
  });
  return { parts: noRider ? [body, seat, bars] : STYLE.toon ? [body, seat, legs, torso, arms, bars] : [body, seat, legs, torso, arms, head, bars], tyres, extras, shadow: { hw: 0.34, z0: Z(-zA), z1: Z(L - zA) } };
}
// ---------- the sprite sheets: thirteen frames from behind round to head-on ----------
const SC_COLS = [0xffffff, 0xd8242a, 0x1a58b8, 0x2a2a2a, 0xf2c21a, 0x9aa0a6, 0x3ac8d8, 0xe87a8a];
// a scooter taken off the street: drawn again with the hero on it (black hair, red shirt), and standing empty once left
function riderKind(kind, rider) {
  const name = 'h' + rider + '-' + kind; if (TRF.kinds[name]) return name;
  const col = SC_COLS[+kind.replace('scooter', '') || 0];
  const build = rider === 'none' ? (v) => scooterModel(col, 0, 0, v, true) : (v) => scooterModel(col, 0x1c1a24, 0xe8423a, v, false);
  TRF.kinds[name] = { name, type: 'scooter', frames: trafficFrames(build, 0.7, 1.75, 1.85), L: 1.85, W: 0.7, extra: true };
  return name;
}
const TRF = { ppm: 28, ppmLong: 20, D: 18, H: 2.2, N: 13, kinds: {}, atlas: null };
function trafficFrames(build, wM, hM, lM, long) {
  const ppm = long ? TRF.ppmLong : TRF.ppm, frames = [];
  for (let i = 0; i < TRF.N; i++) {
    const yaw = (i / (TRF.N - 1)) * Math.PI, m = build('both');
    const pivot = m.shadow ? (m.shadow.z0 + m.shadow.z1) / 2 : lM / 2, D = TRF.D + (pivot - (m.shadow ? m.shadow.z0 : 0));
    const W = Math.ceil((wM * Math.abs(Math.cos(yaw)) + lM * Math.abs(Math.sin(yaw))) * ppm * 1.25) + 10, Hpx = Math.ceil(hM * ppm * 1.12) + 8;
    const r = solidRender(m, { yaw, D, H: TRF.H, ppm, W, Hpx, gy: Hpx - 3, pivot });
    frames.push({ px: r.px, wM: W / ppm, hM: Hpx / ppm, gy: (Hpx - 3) / ppm });
  }
  return frames;
}
function paintTrafficKinds() {
  const reg = (name, type, build, wM, hM, lM, long, o) => { TRF.kinds[name] = Object.assign({ name, type, frames: trafficFrames(build, wM, hM, lM, long), L: lM, W: wM }, o || {}); };
  [0xf2f2ee, 0xc8ccd0, 0x2a2a30, 0xb8242a, 0x2a4a8a, 0x6a6e74, 0xd8d2c4, 0x1a5a3a].forEach((c, i) => reg('sedan' + i, 'car', (v) => sedanModel(c, {}, v), 1.8, 1.5, 4.5));
  reg('taxi', 'car', (v) => sedanModel(0xf2c21a, { sign: true }, v), 1.8, 1.65, 4.5);
  reg('police', 'car', (v) => sedanModel(0xf4f4f0, { bar: true }, v), 1.8, 1.65, 4.5);
  [0xf2f2ee, 0x8a8e94].forEach((c, i) => reg('pickup' + i, 'car', (v) => pickupModel(c, v), 1.9, 1.8, 5.1));
  [0x6aa848, 0xe8a81a, null].forEach((c, i) => reg('blue' + i, 'truck', (v) => blueTruckModel(c, v), 1.7, 2.1, 4.7));
  [0x1a58b8, 0xd8242a, 0x18884a].forEach((c, i) => reg('bus' + i, 'bus', (v) => busModel(c, v), 2.5, 3.4, 11.5, true));
  reg('gravel', 'truck', (v) => gravelModel(v), 2.5, 3.6, 8.2, true);
  [0x2a2a30, 0xf2f2ee, 0x4a6a9a].forEach((c, i) => reg('suv' + i, 'car', (v) => suvModel(c, v), 1.9, 2.0, 4.8));
  [0xd8d2c0, 0x2a4a8a].forEach((c, i) => reg('wagon' + i, 'car', (v) => wagonModel(c, v), 1.8, 1.75, 4.7));
  const cols = SC_COLS, hel = [0xd8242a, 0xffffff, 0x1a58b8, 0xf2c21a, 0xf27aa8, 0x2a2a2a, 0x18884a, 0xffffff], sh = [0xffffff, 0x3a6ab8, 0xd8a83a, 0x2a2a2a, 0xe87a8a, 0x6aa848, 0xf2f2f2, 0x404040];
  for (let i = 0; i < 8; i++) reg('scooter' + i, 'scooter', (v) => scooterModel(cols[i], hel[i], sh[i], v), 0.7, 1.75, 1.85);
}
