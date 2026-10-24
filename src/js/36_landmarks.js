// ===================== the landmarks: the things that make it 高雄 =====================
// 85 大樓, 美麗島's glass pavilions, the station's great canopy, 駁二's warehouses, the music centre, the exhibition
// hall, 夢時代 with its wheel, 龍虎塔 on the lake, the harbour cranes and ships, 旗津's lighthouse and temple; plus the
// temples, petrol stations and night-market stalls that turn up all over town. Also the trees.

function buildLandmarkLots() {
  const L = MAP.landmarks;
  // nothing is built over a tunnel's open cut: a lot along each ramp while it is still open to the sky
  for (const rd of MAP.roads) if (rd.tunnel) { const Ln = rd.len || polyLen(rd.pts), R = rd.w / 2 + 15; for (let s = 0; s <= Ln; s += 8) { if (tunnelH(rd, s) <= TUN_COVER) continue; const p = polyAt(rd.pts, s); lot(p.x - R, p.z - R, p.x + R, p.z + R); } }
  lot(L.八五大樓[0] - 75, L.八五大樓[1] - 50, L.八五大樓[0] + 75, L.八五大樓[1] + 95);
  lot(L.高雄車站[0] - 110, L.高雄車站[1] - 40, L.高雄車站[0] + 110, L.高雄車站[1] + 22);
  lot(L.駁二[0] - 160, L.駁二[1] - 40, L.駁二[0] + 200, L.駁二[1] + 70);
  lot(L.流行音樂中心[0] - 70, L.流行音樂中心[1] - 60, L.流行音樂中心[0] + 70, L.流行音樂中心[1] + 60);
  lot(L.展覽館[0] - 90, L.展覽館[1] - 40, L.展覽館[0] + 90, L.展覽館[1] + 40);
  lot(L.夢時代[0] - 90, L.夢時代[1] - 70, L.夢時代[0] + 90, L.夢時代[1] + 70);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) lot(L.美麗島[0] + sx * 22, L.美麗島[1] + sz * 22, L.美麗島[0] + sx * 48, L.美麗島[1] + sz * 48);
  lot(L.旗津[0] - 30, L.旗津[1] - 30, L.旗津[0] + 30, L.旗津[1] + 30);
  moreLots();
  // nothing is built under the ramps
  for (const rd of MAP.roads) if (rd.ramp) for (let i = 0; i + 1 < rd.pts.length; i++) lot(Math.min(rd.pts[i][0], rd.pts[i + 1][0]) - 9, Math.min(rd.pts[i][1], rd.pts[i + 1][1]) - 9, Math.max(rd.pts[i][0], rd.pts[i + 1][0]) + 9, Math.max(rd.pts[i][1], rd.pts[i + 1][1]) + 9);
  // temples and petrol stations get their plots now, before the houses are laid
  const r = mulberry(123); CITY.sites = [];
  for (const f of MAP.faces) {
    if (f.kind !== 'city' || !f.inner) continue;
    const S = f.inner, n = S.length;
    for (let i = 0; i < n; i++) {
      const e = f.eds[i]; if (!e || e.K.cls < 1) continue;
      const a = S[i], b = S[(i + 1) % n], Ln = Math.hypot(b[0] - a[0], b[1] - a[1]); if (Ln < 60) continue;
      const dx = (b[0] - a[0]) / Ln, dz = (b[1] - a[1]) / Ln, nx = -dz, nz = dx, yaw = Math.atan2(nx, nz);
      if (r() < 0.035 && CITY.sites.filter((s) => s.kind === 'temple').length < 40) { const s = 20 + r() * (Ln - 40), x = a[0] + dx * s, z = a[1] + dz * s; if (!inLot(x - nx * 10, z - nz * 10, 2)) { lot(x - dx * 11 + nx, z - dz * 11 + nz, x + dx * 11 - nx * 24, z + dz * 11 - nz * 24); CITY.sites.push({ kind: 'temple', x, z, yaw }); } }
      else if (r() < 0.03 && e.K.cls >= 2 && CITY.sites.filter((s) => s.kind === 'gas').length < 30) { const s = 22 + r() * (Ln - 46), x = a[0] + dx * s, z = a[1] + dz * s; if (!inLot(x - nx * 12, z - nz * 12, 2)) { lot(x - dx * 13 + nx, z - dz * 13 + nz, x + dx * 13 - nx * 26, z + dz * 13 - nz * 26); CITY.sites.push({ kind: 'gas', x, z, yaw }); } }
    }
  }
}
function build85() {
  const [x, z] = MAP.landmarks.八五大樓, g = T('glass85'), w = T('white'), roof = T('roof0');
  for (const s of [-1, 1]) { box(x + s * 24, 0, z + 12, 0, 22, 150, 24, g, g, roof, null, 16, 4); boxSolid(x + s * 24, z + 12, 0, 22, 24); }
  box(x, 118, z + 12, 0, 70, 32, 24, g, g, roof, null, 16, 4);
  box(x, 150, z + 12, 0, 26, 180, 24, g, g, roof, null, 16, 4);
  box(x, 330, z + 5, 0, 10, 20, 10, w, w, w); box(x, 350, z + 1.5, 0, 3, 28, 3, w, w, w);
  // the podium: shops and the hotel lobby, with a plaza in front
  box(x, 0, z + 70, 0, 110, 12, 40, g, g, T('roof1'), null, 16, 4); boxSolid(x, z + 70, 0, 110, 40);
  const r = mulberry(85); for (let k = 0; k < 14; k++) addProp('palm' + (k % 2), x - 60 + k * 9, z + 82, { s: 1.1 });
}
function buildMeiLiDao() {
  const [x, z] = MAP.landmarks.美麗島, g = T('glass85'), w = T('white');
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const px = x + sx * 36, pz = z + sz * 36, yaw = Math.atan2(-sx, -sz);
    box(px, 0.14, pz, yaw, 16, 9, 12, g, g, w, null, 4, 4); box(px + sx * 2, 9.1, pz + sz * 2, yaw, 12, 3.5, 6, w, w, w);
    boxSolid(px, pz, yaw, 16, 12);
  }
  // the island in the middle: a lawn, palms and the flagpole
  const r = mulberry(5); for (let k = 0; k < 8; k++) { const a = k / 8 * TAU; addProp('palm' + (k % 2), x + Math.cos(a) * 14, z + Math.sin(a) * 14, { y: 0.2, s: 1.1 }); }
  box(x, 0.2, z, 0, 0.3, 16, 0.3, T('steel'), T('steel'), T('steel')); box(x + 0.9, 13, z, 0, 1.8, 1.2, 0.05, T('red'), T('red'), T('red'), null, 0, 0);
}
function buildStation() {
  const [x, z] = MAP.landmarks.高雄車站, white = T('white'), conc = T('conc');
  box(x, 14, z + 22, 0, 200, 2.2, 80, white, white, white, null, 0, 0);
  for (let i = -4; i <= 4; i++) for (let j = 0; j < 3; j++) { const cx = x + i * 22, cz = z - 24 + j * 24; box(cx, 0, cz, 0, 1.4, 14, 1.4, conc, conc, conc); addSolid({ x: cx, z: cz - 0.7, r: 0.8, h: 14 }); }
  box(x, 0.14, z + 14, 0, 44, 8, 26, T('glass85'), T('glass85'), T('roof0'), null, 12.8, 4); boxSolid(x, z + 14, 0, 44, 26);
  box(x, 8.2, z + 8, 0, 20, 3, 8, white, white, white); box(x, 11.2, z + 6, 0, 14, 1.2, 4, T('bb1'), white, white, null, 0, 0);
  // the old station, moved aside and kept
  const ox = x + 76, oz = z + 16, wl = T('wall3'), jr = T('jproof');
  box(ox, 0.14, oz, 0, 36, 9, 16, wl, wl, jr, null, 4, 4); box(ox, 9, oz + 1.5, 0, 40, 2.4, 19, jr, jr, jr, null, 4, 4); box(ox, 11.4, oz - 2, 0, 14, 5, 10, wl, wl, jr, null, 4, 4); box(ox, 16.4, oz - 0.5, 0, 17, 1.8, 13, jr, jr, jr, null, 4, 4);
  boxSolid(ox, oz, 0, 36, 16);
}
function buildPier2() {
  const quay = MAP.roads.find((rd) => rd.name === '駁二大道'); if (!quay) return;
  const pts = quay.pts, r = mulberry(22);
  for (let s = 30; s < polyLen(pts) - 50; s += 48) {
    const p = polyAt(pts, s), lx = Math.cos(p.yaw), lz = -Math.sin(p.yaw);   // left of travel: the land side
    // the old warehouses stand between the road and the water, their doors to the road; a second row faces them across it
    const cx = p.x - lx * 10, cz = p.z - lz * 10, yaw = Math.atan2(lx, lz), tile = T('wh' + r.int(0, 3));
    box(cx, 0.14, cz, yaw, 40, 7, 16, tile, tile, T('tin1'), null, 8, 4); boxSolid(cx, cz, yaw, 40, 16);
    if (r() < 0.7) { const bx = p.x + lx * 12, bz = p.z + lz * 12, y2 = Math.atan2(-lx, -lz), t2 = T('wh' + r.int(0, 3)); box(bx, 0.14, bz, y2, 40, 6, 14, t2, t2, T('tin0'), null, 8, 4); boxSolid(bx, bz, y2, 40, 14); }
  }
  // the big figures on the plaza
  for (let k = 0; k < 3; k++) { const p = polyAt(pts, 70 + k * 60), lx = Math.cos(p.yaw), lz = -Math.sin(p.yaw), x = p.x - lx * 9, z = p.z - lz * 9; box(x, 0.14, z, p.yaw, 2.4, 6, 2.4, T(['red', 'yellow', 'blue'][k]), T(['red', 'yellow', 'blue'][k]), T('white')); box(x, 6.1, z, p.yaw, 3.2, 2.2, 3.2, T('white'), T('white'), T('dark')); addSolid({ x, z, r: 1.6 }); }
}
function buildMusicCentre() {
  const [x, z] = MAP.landmarks.流行音樂中心, mat = new THREE.MeshLambertMaterial({ color: 0xf0f2f4 }), glass = new THREE.MeshLambertMaterial({ color: 0x3a6a8a });
  const hex = (cx, cz, rad, h) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(rad, rad, h, 6), mat); m.position.set(cx, h / 2, cz); CITY.meshes.push(m); const g2 = new THREE.Mesh(new THREE.CylinderGeometry(rad * 0.7, rad * 0.7, h * 0.3, 6), glass); g2.position.set(cx, h * 0.25, cz); CITY.meshes.push(g2); addSolid({ x: cx, z: cz, r: rad }); };
  hex(x, z, 16, 58); hex(x + 30, z + 12, 13, 26); hex(x - 24, z + 20, 12, 22); hex(x + 10, z - 30, 11, 18);
  box(x - 40, 0.14, z + 50, 0, 70, 8, 26, T('white'), T('white'), T('white')); boxSolid(x - 40, z + 50, 0, 70, 26);
}
function buildExpo() { const [x, z] = MAP.landmarks.展覽館, w = T('white'), g = T('glass85'); box(x, 0.14, z + 28, 0, 170, 6, 48, g, g, w, null, 12.8, 4); box(x, 6, z + 28, 0, 170, 14, 48, w, w, w); box(x, 20, z + 20, 0, 150, 4, 30, w, w, w); boxSolid(x, z + 28, 0, 170, 48); }
function buildDreamMall() {
  const [x, z] = MAP.landmarks.夢時代, w = T('wall7'), g = T('glass85');
  box(x, 0.14, z + 50, 0, 150, 8, 100, g, g, T('roof0'), null, 12.8, 4); box(x, 8, z + 50, 0, 150, 24, 100, w, w, T('roof0'), null, 4, 4); boxSolid(x, z + 50, 0, 150, 100);
  box(x, 32, z + 2, 0, 12, 1.5, 0.5, T('bb3'), T('dark'), T('dark'), null, 0, 0);
  // the wheel on the roof: a ring, spokes and gondolas, turning slowly
  const grp = new THREE.Group(), steel = new THREE.MeshLambertMaterial({ color: 0xe8e8f0 });
  grp.add(new THREE.Mesh(new THREE.TorusGeometry(26, 1.0, 8, 40), steel));
  for (let k = 0; k < 12; k++) { const sp = new THREE.Mesh(new THREE.BoxGeometry(0.6, 52, 0.6), steel); sp.rotation.z = (k / 12) * Math.PI; grp.add(sp); }
  const cols = [0xd02820, 0xf0c020, 0x2050c0, 0x18a048, 0xf08020, 0xf080a0];
  for (let k = 0; k < 24; k++) { const a = (k / 24) * TAU, gd = new THREE.Mesh(new THREE.BoxGeometry(2.6, 2.6, 2.6), new THREE.MeshLambertMaterial({ color: cols[k % 6] })); gd.position.set(Math.cos(a) * 26, Math.sin(a) * 26, 0); grp.add(gd); }
  grp.position.set(x, 32 + 28, z); CITY.meshes.push(grp); CITY.wheel = grp;
  for (const s of [-1, 1]) { const leg = new THREE.Mesh(new THREE.BoxGeometry(2, 30, 2), steel); leg.position.set(x + s * 12, 32 + 15, z - 3); leg.rotation.z = s * 0.4; CITY.meshes.push(leg); }
}
function buildDragonTiger() {
  const [x, z] = MAP.landmarks.龍虎塔, red = T('temple'), tiles = T('rooftiles');
  for (const s of [-1, 1]) {
    const cx = x + s * 14, cz = z;
    box(cx, -1.2, cz + 5, 0, 12, 1.4, 12, T('conc'), T('conc'), T('conc'));
    for (let k = 0; k < 7; k++) { const w = 9.6 - k * 0.9, y = 0.2 + k * 3.1; box(cx, y, cz + w / 2, 0, w, 2.5, w, red, red, tiles, null, 4, 4); box(cx, y + 2.5, cz + w / 2 + 1.1, 0, w + 2.2, 0.6, w + 2.2, tiles, tiles, tiles, null, 4, 4); }
    box(cx, 22, cz + 1, 0, 2, 4, 2, T('yellow'), T('yellow'), T('yellow'));
    addSolid({ x: cx, z: cz, r: 7 });
  }
  // the zig-zag bridge out from the shore
  const w = T('red'); let bx = x, bz = z + 40; for (let k = 0; k < 5; k++) { const dz = -7, dx = (k % 2 ? 6 : -6); box(bx, 0.3, bz, 0, 2.6, 0.5, 8, T('conc'), T('conc'), T('conc')); box(bx + dx / 2, 0.8, bz - 4, Math.atan2(dx, dz), 0.15, 0.9, 7, w, w, w); bz += dz; bx += dx; }
  // the dragon's mouth and the tiger's mouth: the two creatures at the foot of the towers
  box(x - 14, 0.2, z + 14, 0, 4, 5, 6, T('yellow'), T('green'), T('yellow')); box(x + 14, 0.2, z + 14, 0, 4, 5, 6, T('orange'), T('yellow'), T('orange'));
}
function buildHarbour() {
  const r = mulberry(77), quay = MAP.roads.find((rd) => rd.name === '海邊路'); if (!quay) return;
  const pts = quay.pts, red = T('red'), steel = T('steel');
  // container cranes along the new bay's quay, and the stacks behind them
  const mouths = MAP.roads.filter((rd) => rd.tunnel).flatMap((rd) => [rd.pts[0], rd.pts[rd.pts.length - 1]]);
  for (let s = 60; s < polyLen(pts) - 60; s += 150) {
    const p = polyAt(pts, s), rx_ = -Math.cos(p.yaw), rz_ = Math.sin(p.yaw);   // right of travel: the water side
    if (inOpenCut(p.x, p.z, 12) || mouths.some((m) => Math.hypot(m[0] - p.x, m[1] - p.z) < 40)) continue;   // not across the tunnel's cut
    const cx = p.x + rx_ * 14, cz = p.z + rz_ * 14, yaw = Math.atan2(-rx_, -rz_);
    for (const o of [-9, 9]) { const ax = Math.cos(yaw), az = -Math.sin(yaw); box(cx + ax * o, 0, cz + az * o, yaw, 2, 36, 2, red, red, red); box(cx + ax * o - rx_ * 10, 0, cz + az * o - rz_ * 10, yaw, 2, 36, 2, red, red, red); }
    box(cx, 36, cz, yaw, 22, 2, 2, red, red, red); box(cx - rx_ * 10, 37, cz - rz_ * 10, yaw, 2, 1.6, 52, red, red, red); box(cx, 30, cz, yaw, 4, 3, 3, T('white'), T('white'), T('white'));
    addSolid({ x: cx, z: cz, r: 10 });
    for (let k = 0; k < 6; k++) for (let h = 0; h < 2 + r.int(0, 1); h++) { const sx = p.x + rx_ * (8 + h * 0) + Math.sin(p.yaw) * (k * 13 - 30), sz = p.z + rz_ * 8 + Math.cos(p.yaw) * (k * 13 - 30); box(sx, h * 2.6, sz, p.yaw + Math.PI / 2, 12.2, 2.6, 2.5, T('box' + r.int(0, 5)), T('box' + r.int(0, 5)), T('box' + r.int(0, 5)), null, 0, 0); if (!h) addSolid({ x: sx, z: sz, yaw: p.yaw + Math.PI / 2, hx: 6.1, hz: 1.3 }); }
  }
  // ships out in the channel, and boats
  const ship = (x, z, yaw, L) => { const hull = T('dark'); box(x, -1.2, z, yaw, 18, 8, L, hull, hull, T('grey')); box(x, 6.8, z, yaw, 16, 3, L - 10, T('grey'), T('grey'), T('grey')); box(x, 9.8, z - 0, yaw, 14, 16, 16, T('white'), T('white'), T('white')); for (let k = 0; k < Math.floor(L / 13) - 2; k++) for (let h = 0; h < 2; h++) box(x - Math.sin(yaw) * (20 + k * 13), 9.8 + h * 2.6, z - Math.cos(yaw) * (20 + k * 13), yaw, 12.2, 2.6, 12.2, T('box' + r.int(0, 5)), T('box' + r.int(0, 5)), T('box' + r.int(0, 5)), null, 0, 0); };
  ship(900, 2400, -0.6, 150); ship(1250, 2900, -0.5, 120); ship(700, 2100, 2.6, 100);
  for (let i = 0; i < 24; i++) { const x = 150 + r() * 1100, z = 1500 + r() * 1900; if (groundKind(x, z) === GK.water && !pointInPoly(MAP.qijin, x, z)) addProp('boat' + r.int(0, 2), x, z, { y: -1.1, flip: r() < 0.5 }); }
  // the ferry piers at 哈瑪星 and 旗津
  box(468, -0.5, 1440, 0.4, 8, 1.6, 40, T('conc'), T('conc'), T('conc')); box(150, -0.5, 1840, -1.9, 8, 1.6, 34, T('conc'), T('conc'), T('conc'));
  box(468 - Math.sin(0.4) * 30, 1.0, 1440 - Math.cos(0.4) * 30, 0.4, 7, 3, 10, T('white'), T('white'), T('blue'));
}
function buildQijin() {
  const [x, z] = MAP.landmarks.旗津, r = mulberry(31);
  // the lighthouse on 旗後山
  const lx = 112, lz = 1787, ly = terrainH(lx, lz), white = new THREE.MeshLambertMaterial({ color: 0xf4f4f0 });
  const tower = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.8, 11, 12), white); tower.position.set(lx, ly + 5.5, lz); CITY.meshes.push(tower);
  box(lx, ly + 11, lz + 1.5, 0, 3, 2.4, 3, T('glass85'), T('glass85'), T('dark'), null, 0, 0); box(lx, ly + 13.4, lz + 1.6, 0, 3.4, 0.5, 3.4, T('dark'), T('dark'), T('dark'));
  box(lx + 8, ly, lz + 6, 0, 12, 4, 10, T('wall7'), T('wall7'), T('rooftiles'), null, 4, 4);
  addSolid({ x: lx, z: lz, r: 3 });
  // 天后宮 by the ferry, facing the old street
  temple(x, z, Math.PI / 2 + 0.4, r);
  // palms along the beach
  for (let i = 0; i < 120; i++) { const px = 60 + r() * 1100, pz = 1700 + r() * 1900; if (groundKind(px, pz) === GK.sand && pointInPoly(MAP.qijin, px, pz) && r() < 0.6) addProp('palm' + r.int(0, 1), px, pz, { s: 0.8 + r() * 0.5 }); }
}
// a temple: a hall with a swallow-tail roof behind a small courtyard, lanterns and an incense burner
function temple(x, z, yaw, r) {
  const sx = Math.sin(yaw), cz = Math.cos(yaw), ax = Math.cos(yaw), az = -Math.sin(yaw), y0 = terrainH(x, z) + 0.14, red = T('temple'), tiles = T('rooftiles');
  const hx = x - sx * 8, hz = z - cz * 8;   // the hall sits back behind the courtyard
  box(hx, y0, hz, yaw, 14, 6, 11, red, red, tiles, null, 4, 4); box(hx, y0 + 6, hz + sx * 1.2, yaw, 16.5, 1.4, 13.5, tiles, tiles, tiles, null, 4, 4); box(hx, y0 + 7.4, hz - sx * 1, yaw, 9, 2.4, 7, red, red, tiles, null, 4, 4); box(hx, y0 + 9.8, hz, yaw, 11, 0.9, 9, tiles, tiles, tiles, null, 4, 4);
  for (const s of [-1, 1]) { box(hx + ax * s * 8, y0 + 7.4, hz + sx * 1.2, yaw, 0.8, 2.2, 0.8, T('yellow'), T('yellow'), T('yellow')); box(hx + ax * s * 5.5, y0, hz + sx * 0.5, yaw, 0.7, 6, 0.7, T('red'), T('red'), T('red')); box(hx + ax * s * 4, y0 + 4.2, hz + sx * 1, yaw, 1.0, 1.4, 1.0, T('red'), T('red'), T('red')); }
  box(x, y0, z - sx * 2, yaw, 1.8, 1.6, 1.2, T('dark'), T('dark'), T('yellow')); box(x, y0 + 1.6, z - sx * 2, yaw, 2.4, 0.4, 1.8, T('rooftiles'), T('rooftiles'), T('rooftiles'));
  boxSolid(hx, hz, yaw, 14, 11); addSolid({ x: x - sx * 2, z: z - cz * 2, r: 1.2 });
  const c = chunkAt(x, z); const q = [[x + ax * 9 + sx * 2, z + az * 9 + cz * 2], [x - ax * 9 + sx * 2, z - az * 9 + cz * 2], [x - ax * 9 - sx * 20, z - az * 9 - cz * 20], [x + ax * 9 - sx * 20, z + az * 9 - cz * 20]]; c.top.fan(q, y0 + 0.01, T('conc'), 4);
}
function gasStation(x, z, yaw, r) {
  const sx = Math.sin(yaw), cz = Math.cos(yaw), ax = Math.cos(yaw), az = -Math.sin(yaw), y0 = terrainH(x, z) + 0.14, white = T('white'), conc = T('conc');
  const cx = x - sx * 8, cz_ = z - cz * 8;
  box(cx, y0 + 5.2, cz_ + sx * 6, yaw, 22, 1.0, 13, T('bb4'), T('red'), white, null, 0, 0);
  for (const s of [-1, 1]) for (const d of [2, 9]) { box(cx + ax * s * 8, y0, cz_ + az * s * 8 - sx * d, yaw, 0.5, 5.2, 0.5, conc, conc, conc); }
  for (const s of [-1, 1]) { box(cx + ax * s * 4, y0, cz_ + az * s * 4 - sx * 3, yaw, 1.0, 1.4, 5, T('red'), T('red'), T('red')); addSolid({ x: cx + ax * s * 4 - sx * 5.5, z: cz_ + az * s * 4 - cz * 5.5, yaw, hx: 0.6, hz: 2.6 }); }
  box(cx, y0, cz_ - sx * 14, yaw, 12, 4, 6, T('sh_cvs0'), T('wall7'), T('roof0'), null, 4, 4); boxSolid(cx, cz_ - sx * 14, yaw, 12, 6);
  const c = chunkAt(x, z); const q = [[x + ax * 12, z + az * 12], [x - ax * 12, z - az * 12], [x - ax * 12 - sx * 22, z - az * 12 - cz * 22], [x + ax * 12 - sx * 22, z + az * 12 - cz * 22]]; c.top.fan(q, y0 + 0.01, conc, 4);
}
function nightMarket() {
  const r = mulberry(66);
  for (const e of MAP.edges) {
    if (!e.rd.night || !e.strip) continue;
    const rangeX = Array.isArray(e.rd.night) ? [Math.min(rx(e.rd.night[0]), rx(e.rd.night[1])), Math.max(rx(e.rd.night[0]), rx(e.rd.night[1]))] : null;   // only part of the road is the market
    const pts = e.strip.pts, L = polyLen(pts), hw = e.w / 2;
    for (let s = 8; s < L - 8; s += 4.2) for (const sd of [-1, 1]) {
      const p = polyAt(pts, s); if (rangeX && (p.x < rangeX[0] || p.x > rangeX[1])) continue;
      const _p = p, nx = Math.cos(p.yaw), nz = -Math.sin(p.yaw), x = p.x + nx * (hw - 1.6) * sd, z = p.z + nz * (hw - 1.6) * sd, yaw = p.yaw + (sd > 0 ? Math.PI / 2 : -Math.PI / 2), aw = T('awning' + r.int(0, 3));
      box(x, 0.03, z, yaw, 2.6, 1.0, 1.4, T('steel'), T('steel'), T('white')); box(x, 2.2, z + 0, yaw, 3.0, 0.3, 2.0, aw, aw, aw, null, 0, 0);
      const ax = Math.cos(yaw), az = -Math.sin(yaw); for (const q of [-1.3, 1.3]) box(x + ax * q, 0.03, z + az * q, yaw, 0.08, 2.2, 0.08, T('steel'), T('steel'), T('steel'));
      if (r() < 0.5) box(x, 1.0, z, yaw, 1.2, 0.8, 0.8, T('sh_eat' + r.int(0, 7)), T('steel'), T('steel'), null, 0, 0);
      addSolid({ x: x - Math.sin(yaw) * 0.7, z: z - Math.cos(yaw) * 0.7, yaw, hx: 1.3, hz: 0.7 });
    }
  }
}
// 城市光廊 along the south of 中央公園: coloured lights on a row of poles
function lightCorridor() {
  const [x, z] = MAP.landmarks.中央公園, z1 = rz(890) - 16;
  for (let k = -16; k <= 16; k++) { const px = x + k * 8, c = T(['red', 'yellow', 'blue', 'green', 'orange'][(k + 16) % 5]); box(px, 0.14, z1 - 3, 0, 0.2, 6, 0.2, T('steel'), T('steel'), T('steel')); box(px, 6, z1 - 3.6, 0, 1.2, 0.5, 1.2, c, c, c); addSolid({ x: px, z: z1 - 3, r: 0.25, h: 0.6 }); }
  const c = chunkAt(x, z); const pond = []; for (let k = 0; k < 20; k++) pond.push([x - 60 + Math.cos(k / 20 * TAU) * 40, z + 20 + Math.sin(k / 20 * TAU) * 28]); c.top.fan(pond, 0.05, T('water'), 4);
}
function buildLandmarks() {
  CITY.meshes = CITY.meshes || [];
  buildMore(); build85(); buildMeiLiDao(); buildStation(); buildPier2(); buildMusicCentre(); buildExpo(); buildDreamMall(); buildDragonTiger(); buildHarbour(); buildQijin(); nightMarket(); lightCorridor();
  const r = mulberry(124);
  for (const s of CITY.sites) { if (s.kind === 'temple') temple(s.x, s.z, s.yaw, r); else gasStation(s.x, s.z, s.yaw, r); }
  CITY.stats.sites = CITY.sites.length;
}
// ---------- trees: the parks, the hill, the river banks, the odd yard ----------
function buildNature() {
  const r = mulberry(11);
  for (const f of MAP.faces) {
    if (f.kind === 'park' && f.inner) { const n = Math.floor(f.area / 220); for (let k = 0; k < n; k++) { const i = r.int(0, f.inner.length - 1), p = f.inner[i], x = lerp(p[0], f.cx, r()), z = lerp(p[1], f.cz, r()); if (groundKind(x, z) !== GK.water && !inLot(x, z, 3)) addProp(r() < 0.2 ? 'palm' + r.int(0, 1) : r() < 0.3 ? 'tall' : 'tree' + r.int(0, 2), x, z, { s: 0.9 + r() * 0.5 }); } }
    if (f.kind === 'bank' && f.kerb) { const K = f.kerb; for (let i = 0; i < K.length; i++) { const a = K[i], b = K[(i + 1) % K.length], L = Math.hypot(b[0] - a[0], b[1] - a[1]); for (let s = 6; s < L - 6; s += 11) { const x = a[0] + (b[0] - a[0]) * s / L, z = a[1] + (b[1] - a[1]) * s / L; if (groundKind(x, z) !== GK.water && riverDist(x, z) > 24) addProp(r() < 0.4 ? 'palm' + r.int(0, 1) : 'tree' + r.int(0, 2), x, z, { s: 0.9 + r() * 0.4 }); } } }
  }
  for (let i = 0; i < 2200; i++) { const x = r() * 1100, z = r() * 1300; const h = terrainH(x, z); if (h > 5 && groundKind(x, z) !== GK.water && !nearRoad(x, z, 6)) addProp(r() < 0.15 ? 'tall' : 'tree' + r.int(0, 2), x, z, { s: 0.9 + r() * 0.7 }); }
  for (let i = 0; i < 300; i++) { const x = 1000 + r() * 560, z = 20 + r() * 460; if (groundKind(x, z) !== GK.water && !nearRoad(x, z, 6) && !inLot(x, z, 4) && Math.hypot(x - MAP.landmarks.龍虎塔[0], z - MAP.landmarks.龍虎塔[1]) > 40) addProp(r() < 0.3 ? 'palm' + r.int(0, 1) : 'tree' + r.int(0, 2), x, z, { s: 0.9 + r() * 0.5 }); }
  // 旗津's houses along the island road: low, old, tiled
  for (const e of MAP.edges) {
    if (e.kind !== 'rural' || !e.strip) continue;
    const pts = e.strip.pts, L = polyLen(pts), hw = e.w / 2 + e.K.sw;
    for (let s = 10; s < L - 10;) { const w = TH_W[r.int(0, 2)], p = polyAt(pts, s + w / 2); let placed = false; for (const sd of [-1, 1]) { const nx = Math.cos(p.yaw) * sd, nz = -Math.sin(p.yaw) * sd, x = p.x + nx * hw, z = p.z + nz * hw, yaw = Math.atan2(-nx, -nz); if (groundKind(x + nx * 8, z + nz * 8) === GK.water || groundKind(x + nx * 8, z + nz * 8) === GK.sand || inLot(x, z, 3) || r() < 0.25) continue; const th = pickTH(r, 'yancheng', w); if (!th) continue; townhouse(x, terrainH(x, z) + 0.1, z, yaw, w, 9, th, r, 'yancheng', true, 0); boxSolid(x, z, yaw, w, 9); placed = true; } s += w + (placed ? 0.4 : 6); }
  }
}
function nearRoad(x, z, m) { const n = nearestRoad(x, z); return n && n.d < n.e.w / 2 + m; }
