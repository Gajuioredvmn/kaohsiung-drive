// ===================== more of 高雄: 衛武營, 巨蛋 and 瑞豐夜市, the MRT entrances, the riverside, the library, 中山大學, 大港橋 =====================
// (real metres from 美麗島 go through R2 into map metres, like the rest of the layout)
const MORE = {
  衛武營: [2500, 1960], 巨蛋: [-330, -1540], 圖書館: [-300, 2760], 科工館: [1900, -1250], 三鳳宮: [-330, -1240], 代天宮: [-2330, 1050], 中山大學: [-3250, 300], 大港橋: [-1380, 1470],
  // the MRT stations: the red line down 中山路, the orange line along 中正路 (name, real x, real z, line)
  mrt: [['高雄車站', 0, -1000, 'R'], ['後驛', 0, -1480, 'R'], ['美麗島', 0, 0, 'RO'], ['中央公園', 0, 620, 'R'], ['三多商圈', 0, 2300, 'R'], ['獅甲', 0, 3450, 'R'], ['凱旋', 0, 3950, 'R'], ['市議會', -650, 0, 'O'], ['信義國小', 600, 0, 'O'], ['文化中心', 1300, 0, 'O'], ['五塊厝', 2000, 0, 'O'], ['鹽埕埔', -1950, 900, 'O'], ['巨蛋', -650, -1660, 'R'], ['衛武營', 2500, 2300, 'O']],
};
function moreLots() {
  const P = (k) => R2(MORE[k]);
  const w = P('衛武營'); lot(w[0] - 130, w[1] - 95, w[0] + 130, w[1] + 95);
  const a = P('巨蛋'); lot(a[0] - 95, a[1] - 70, a[0] + 95, a[1] + 70);
  const l = P('圖書館'); lot(l[0] - 45, l[1] - 38, l[0] + 45, l[1] + 38);
  const s = P('科工館'); lot(s[0] - 80, s[1] - 45, s[0] + 80, s[1] + 45);
  for (const k of ['三鳳宮', '代天宮']) { const t = P(k); lot(t[0] - 16, t[1] - 24, t[0] + 16, t[1] + 8); }
  const u = P('中山大學'); lot(u[0] - 90, u[1] - 70, u[0] + 90, u[1] + 70);
}
// 衛武營國家藝術文化中心: the great white roof that rolls like a wave across the park, open underneath, the halls inside
function buildWeiwuying() {
  const [x, z] = R2(MORE.衛武營), white = T('white'), g = T('glass85'), conc = T('conc'), r = mulberry(21);
  const c = chunkAt(x, z); c.top.fan([[x - 125, z - 90], [x + 125, z - 90], [x + 125, z + 90], [x - 125, z + 90]], 0.05, T('grass'), 4);
  // the halls: four boxes under the roof
  for (const [dx, dz, w, d, h] of [[-50, -10, 60, 50, 16], [20, -18, 50, 40, 14], [60, 20, 40, 44, 12], [-10, 30, 56, 34, 10]]) { box(x + dx, 0.1, z + dz, 0, w, h, d, g, g, conc, null, 12.8, 4); boxSolid(x + dx, z + dz + d / 2, 0, w, d); }
  // the roof: a wave of slabs, rising and falling across the site, held up on thin columns
  for (let i = -8; i <= 8; i++) { const px = x + i * 14, h = 12 + 9 * Math.sin(i * 0.55) + 4 * Math.cos(i * 1.3), w = 14.6, d = 150 + 20 * Math.cos(i * 0.4); box(px, h, z, 0, w, 2.2 + 0.6 * Math.cos(i * 0.9), d, white, white, white, null, 0, 0);
    for (const s of [-1, 1]) { box(px, 0.1, z + s * (d / 2 - 6), 0, 1.2, h, 1.2, conc, conc, conc); addSolid({ x: px, z: z + s * (d / 2 - 6) - 0.6, r: 0.8, h: h }); } }
  // the plaza and the lawn: trees, lamps, a few people's benches
  for (let k = 0; k < 40; k++) { const px = x - 118 + r() * 236, pz = z - 86 + r() * 172; if (Math.abs(pz - z) < 80 && Math.abs(px - x) < 115) continue; addProp(r() < 0.5 ? 'tree' + r.int(0, 2) : 'palm' + r.int(0, 1), px, pz, { s: 0.8 + r() * 0.5 }); }
  sign(x, z - 88, 0, '衛武營', 0xf2f2ee, 0x202830);
}
// 高雄巨蛋: the round arena with its ring of glass, a plaza round it, 瑞豐夜市's stalls next door (along 裕誠路, laid by nightMarket)
function buildArena() {
  const [x, z] = R2(MORE.巨蛋), y0 = terrainH(x, z) + 0.14;
  const c = chunkAt(x, z); c.top.fan(circle(x, z, 92, 32), y0 - 0.05, T('conc'), 4);
  const glass = new THREE.MeshLambertMaterial({ color: 0x9ec8e8 }), white = new THREE.MeshLambertMaterial({ color: 0xe8ecef }), steel = new THREE.MeshLambertMaterial({ color: 0x6a7078 });
  const ring = new THREE.Mesh(new THREE.CylinderGeometry(62, 66, 18, 40, 1, true), glass); ring.position.set(x, y0 + 9, z); ring.material.side = THREE.DoubleSide; CITY.meshes.push(ring);
  const band = new THREE.Mesh(new THREE.CylinderGeometry(64, 64, 2.4, 40), steel); band.position.set(x, y0 + 19, z); CITY.meshes.push(band);
  const dome = new THREE.Mesh(new THREE.SphereGeometry(62, 40, 12, 0, TAU, 0, Math.PI * 0.42), white); dome.scale.set(1, 0.55, 1); dome.position.set(x, y0 + 20 - 62 * 0.55 * Math.cos(Math.PI * 0.42), z); CITY.meshes.push(dome);
  for (let k = 0; k < 24; k++) { const a = k / 24 * TAU, px = x + Math.cos(a) * 65, pz = z + Math.sin(a) * 65; box(px, y0, pz, -a, 1.2, 18, 1.2, T('steel'), T('steel'), T('steel')); }
  addSolid({ x, z, r: 66 });
  const r = mulberry(88); for (let k = 0; k < 28; k++) { const a = r() * TAU, d = 76 + r() * 14; addProp('palm' + r.int(0, 1), x + Math.cos(a) * d, z + Math.sin(a) * d, { s: 0.9 + r() * 0.3 }); }
  sign(x, z + 90, Math.PI, '高雄巨蛋', 0xf2f2ee, 0x1a3a6a);
}
function circle(x, z, R, n) { const out = []; for (let k = 0; k < n; k++) out.push([x + Math.cos(k / n * TAU) * R, z + Math.sin(k / n * TAU) * R]); return out; }
// 高雄市立圖書館總館: a glass cube on slender columns, its roof a garden
function buildLibrary() {
  const [x, z] = R2(MORE.圖書館), g = T('glass85'), conc = T('conc'), y0 = terrainH(x, z) + 0.14;
  box(x, y0 + 6, z + 30, 0, 70, 30, 60, g, g, T('grass'), null, 12.8, 4);
  for (const i of [-1, 1]) for (const j of [-1, 1]) { box(x + i * 30, y0, z + 30 + j * 25, 0, 1.6, 6, 1.6, conc, conc, conc); addSolid({ x: x + i * 30, z: z + 30 + j * 25 - 0.8, r: 1, h: 6 }); }
  box(x, y0, z + 30, 0, 24, 6, 24, g, g, conc, null, 12.8, 4); boxSolid(x, z + 42, 0, 24, 24);
  const r = mulberry(31); for (let k = 0; k < 12; k++) addProp('tree' + r.int(0, 2), x - 40 + r() * 80, z - 6 + r() * 8, { s: 0.6 + r() * 0.3 });
  sign(x, z - 4, 0, '市立圖書館', 0xf2f2ee, 0x2a5a3a);
}
// 科工館: the science museum, a long hall with a glass front and the planetarium's dome beside it
function buildScience() {
  const [x, z] = R2(MORE.科工館), g = T('glass85'), w = T('wall5'), y0 = terrainH(x, z) + 0.14;
  box(x, y0, z + 20, 0, 150, 18, 40, g, w, T('roof2'), null, 12.8, 4); boxSolid(x, z + 40, 0, 150, 40);
  box(x - 40, y0 + 18, z + 20, 0, 40, 8, 30, w, w, T('roof2'), null, 4, 4);
  const dome = new THREE.Mesh(new THREE.SphereGeometry(16, 24, 10, 0, TAU, 0, Math.PI / 2), new THREE.MeshLambertMaterial({ color: 0xd8dde2 })); dome.position.set(x + 100, y0 + 6, z + 24); CITY.meshes.push(dome);
  box(x + 100, y0, z + 24, 0, 30, 6, 30, w, w, w, null, 4, 4); boxSolid(x + 100, z + 39, 0, 30, 30);
  sign(x, z - 2, 0, '科工館', 0xf2f2ee, 0x2a4a8a);
}
// 中山大學 at 西子灣: the gate, the halls up against the hill, the long seafront road
function buildUniversity() {
  const [x, z] = R2(MORE.中山大學), w = T('wall2'), jr = T('jproof'), y0 = terrainH(x, z) + 0.14, r = mulberry(45);
  for (const [dx, dz, ww, d, h] of [[-50, -30, 40, 20, 14], [0, -40, 60, 22, 18], [55, -28, 36, 20, 12], [-30, 20, 44, 18, 10], [40, 25, 50, 18, 10]]) { box(x + dx, y0, z + dz, 0, ww, h, d, w, w, jr, null, 4, 4); boxSolid(x + dx, z + dz + d / 2, 0, ww, d); }
  for (const s of [-1, 1]) box(x + s * 7, y0, z + 55, 0, 1.6, 9, 1.6, T('red'), T('red'), T('red')); box(x, y0 + 8, z + 55, 0, 18, 1.4, 2.2, T('rooftiles'), T('rooftiles'), T('rooftiles'));
  for (let k = 0; k < 24; k++) addProp(r() < 0.6 ? 'palm' + r.int(0, 1) : 'tree' + r.int(0, 2), x - 80 + r() * 160, z - 60 + r() * 120, { s: 0.8 + r() * 0.4 });
  sign(x, z + 60, 0, '中山大學', 0xf2f2ee, 0x8a2a2a);
}
// 大港橋: the white pedestrian bridge that swings open across the river mouth by 駁二
function buildGreatHarbourBridge() {
  const [x, z] = R2(MORE.大港橋), white = new THREE.MeshLambertMaterial({ color: 0xf4f4f0 }), y0 = 0.3;
  const deck = new THREE.Mesh(new THREE.BoxGeometry(110, 1.2, 6), white); deck.position.set(x, y0 + 5, z); CITY.meshes.push(deck);
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 2.4, 42, 12), white); mast.position.set(x - 20, y0 + 21, z); CITY.meshes.push(mast);
  for (let k = 1; k <= 5; k++) for (const s of [-1, 1]) { const px = x - 20 + s * k * 10, L = Math.hypot(k * 10, 34 - k * 3); const stay = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, L, 6), white); stay.position.set((x - 20 + px) / 2, y0 + 5 + (34 - k * 3) / 2 + 2, z); stay.rotation.z = Math.atan2(s * k * 10, 34 - k * 3) * -1; CITY.meshes.push(stay); }
  for (const s of [-1, 1]) { const pier = new THREE.Mesh(new THREE.CylinderGeometry(3, 3, 6, 10), white); pier.position.set(x + s * 50, y0 + 2, z); CITY.meshes.push(pier); }
}
// the MRT: a glass entrance with its line-coloured sign on the pavement by each station's junction
function buildMrt() {
  const r = mulberry(7);
  for (const [name, rx_, rz_, line] of MORE.mrt) {
    const [x, z] = R2([rx_, rz_]), node = MAP.nodes.reduce((b, q) => (!b || Math.hypot(q.x - x, q.z - z) < Math.hypot(b.x - x, b.z - z)) ? q : b, null); if (!node) continue;
    // an entrance on the pavement a little way down each road out of the junction, on its right-hand side
    for (const o of node.out) {
      const e = o.e, d = o.dir > 0 ? [e.pts[1][0] - e.pts[0][0], e.pts[1][1] - e.pts[0][1]] : [e.pts[e.pts.length - 2][0] - e.pts[e.pts.length - 1][0], e.pts[e.pts.length - 2][1] - e.pts[e.pts.length - 1][1]], Ld = Math.hypot(d[0], d[1]) || 1, ux = d[0] / Ld, uz = d[1] / Ld;
      const yaw = Math.atan2(ux, uz), ax = Math.cos(yaw), az = -Math.sin(yaw), hx = e.w / 2 + Math.max(2.5, e.K.sw) / 2 + 0.2, along = (node.ring ? 50 : 0) + o.trim + 14;
      if (e.lvl || e.tunnel || e.ramp || along > e.len - 10) continue;
      const px = node.x + ux * along - ax * hx, pz = node.z + uz * along - az * hx;
      if (groundKind(px, pz) === GK.water || groundKind(px, pz) === GK.park || inLot(px, pz, 1)) continue;
      const y0 = terrainH(px, pz) + 0.14, g = T('glass85'), st = T('steel'), col = line === 'O' ? 'orange' : 'red';
      box(px, y0, pz, yaw, 3.2, 3.4, 5.4, g, g, st, null, 4, 4); box(px, y0 + 3.4, pz, yaw, 3.8, 0.3, 6.2, st, st, st);
      box(px, y0 + 3.7, pz, yaw, 3.6, 1.1, 0.5, T('mrt_' + col), T('mrt_' + col), st, null, 0, 0);
      boxSolid(px + Math.sin(yaw) * 2.7, pz + Math.cos(yaw) * 2.7, yaw, 3.2, 5.4);
      box(px - ax * 2.2, y0, pz - az * 2.2, yaw, 0.3, 3, 0.3, st, st, st); box(px - ax * 2.2, y0 + 3, pz - az * 2.2, yaw, 4, 1, 0.3, T('sg_' + name + '站'), T('sg_' + name + '站'), st, null, 0, 0);
    }
  }
}
// a standing sign board with a name on it (its tile is painted into the atlas at load)
function sign(x, z, yaw, text, fg, bg, scale) {
  const k = scale || 1, name = 'sg_' + text, y0 = terrainH(x, z) + 0.14, st = T('steel');
  box(x, y0, z, yaw, 0.3, 3 * k, 0.3, st, st, st); box(x, y0 + 3 * k, z, yaw, 8 * k, 2 * k, 0.3, T(name), T(name), st, null, 0, 0);
}
function paintSign(text, fg, bg) { const px = new Pix(256, 64); px.rect(0, 0, 256, 64, bg); px.rect(0, 0, 256, 3, 0xffffff); px.rect(0, 61, 256, 3, 0x000000); px.text(text, 128, 10, 44, fg, { align: 'center', maxW: 240 }); return px; }
// the riverside: lamps and trees along both banks of 愛河, and the little boats on the water
function buildRiverside() {
  const pts = MAP.river, r = mulberry(55), L = polyLen(pts);
  for (let s = 20; s < L - 20; s += 14) {
    const p = polyAt(pts, s), nx = Math.cos(p.yaw), nz = -Math.sin(p.yaw);
    for (const sd of [-1, 1]) { const x = p.x + nx * 27 * sd, z = p.z + nz * 27 * sd; if (groundKind(x, z) === GK.water || nearRoad(x, z, 4) || inLot(x, z, 2)) continue;
      if ((s / 14) % 2 === 0) lampPost(x, z, p.yaw, false); else addProp(r() < 0.5 ? 'palm' + r.int(0, 1) : 'tree' + r.int(0, 2), x, z, { s: 0.7 + r() * 0.4 }); }
    if (r() < 0.12) addProp('boat' + r.int(0, 2), p.x + nx * (r() - 0.5) * 20, p.z + nz * (r() - 0.5) * 20, { s: 0.6, y: -1.0 });
  }
}
function buildMore() {
  buildWeiwuying(); buildArena(); buildLibrary(); buildScience(); buildUniversity(); buildGreatHarbourBridge(); buildMrt(); buildRiverside();
  const r = mulberry(9); for (const [k, yaw] of [['三鳳宮', 0], ['代天宮', Math.PI / 2 + 0.3]]) { const [x, z] = R2(MORE[k]); temple(x, z, yaw, r); sign(x + 12, z + 6, yaw, k, 0xffe070, 0x8a1a1a, 0.7); }
}
// the sign tiles go into the atlas with everything else
function moreTiles() {
  const names = ['衛武營', '高雄巨蛋', '市立圖書館', '科工館', '中山大學'].map((t) => [t, 0xf2f2ee, 0x202830]); names.push(['三鳳宮', 0xffe070, 0x8a1a1a], ['代天宮', 0xffe070, 0x8a1a1a]);
  for (const [n, , , line] of MORE.mrt) names.push([n + '站', 0xffffff, line === 'O' ? 0xd87a1a : 0xd82a2a]);
  const seen = new Set(); for (const [t, fg, bg] of names) { if (seen.has(t)) continue; seen.add(t); tile('sg_' + t, paintSign(t, fg, bg)); }
  tile('mrt_red', paintMrt(0xd82a2a)); tile('mrt_orange', paintMrt(0xd87a1a));
}
function paintMrt(col) { const px = new Pix(128, 40); px.rect(0, 0, 128, 40, col); px.rect(4, 4, 120, 32, 0xffffff); px.text('高雄捷運', 64, 8, 24, col, { align: 'center', maxW: 116 }); return px; }
