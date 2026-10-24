// ===================== missions: jobs round town — fares, deliveries, time trials — and the money they bring =====================
// Jobs appear as markers at the roadside near the player. Drive up to one to take it: a fare wants taking somewhere,
// a shop wants an order delivered, a trial wants a time. A beacon marks the destination, the HUD points at it, and
// the pay comes on arrival (more for being quick). The money buys the locked cars in the showroom.
const PRO = Object.assign({ money: 0, owned: ['duck', 'uncle', 'wagon', 'suv', 'cab'], jobs: 0, best: {} }, (() => { try { return JSON.parse(localStorage.getItem('kh.progress') || '{}'); } catch (e) { return {}; } })());
function saveProgress() { try { localStorage.setItem('kh.progress', JSON.stringify(PRO)); } catch (e) { /* no storage */ } }
function carPrice(i) { const c = CARS[i]; if (!c || c.starter) return 0; const k = CARS.filter((q) => !q.starter).indexOf(c); return Math.round(8000 * Math.pow(1.6, k) / 100) * 100; }
const MIS = { avail: [], active: null, spawnT: 0, msgT: 0 };
const DEST_NAMES = ['美麗島', '高雄車站', '中央公園', '六合夜市', '八五大樓', '駁二', '流行音樂中心', '展覽館', '夢時代', '龍虎塔', '西子灣', '新光碼頭', '真愛碼頭'];
const FARES = [['阿嬤', '少年欸，載我去{d}，慢慢開就好'], ['上班族', '去{d}，我快遲到了！'], ['觀光客', '請問可以到{d}嗎？聽說那裡很漂亮'], ['學生', '{d}，可以快一點嗎，補習要遲到了'], ['阿伯', '去{d}啦，走中山路卡緊'], ['情侶', '我們要去{d}看夕陽'], ['業務', '{d}，趕時間，油門踩下去'], ['媽媽', '去{d}，小孩在車上請開穩一點']];
const ORDERS = [['珍珠奶茶 6 杯', '手搖店'], ['雞排便當 4 個', '便當店'], ['木瓜牛奶 3 杯', '果汁攤'], ['滷味一大包', '滷味攤'], ['蚵仔煎 2 份', '夜市'], ['鹹酥雞', '炸物店'], ['牛肉麵 2 碗', '麵店'], ['豆花 5 碗', '豆花店']];
// a roadside spot: a lane point on a proper road, kerb side, between r0 and r1 metres from a point
function roadSpot(x0, z0, r0, r1, r) {
  for (let t = 0; t < 40; t++) {
    const l = TR.lanes[r.int(0, TR.lanes.length - 1)]; if (l.e.K.cls < 1 || l.e.lvl || l.k !== l.nPer - 1 || l.len < 40) continue;
    const s = 12 + r() * (l.len - 24), p = polyAt(l.pts, s), d = Math.hypot(p.x - x0, p.z - z0); if (d < r0 || d > r1) continue;
    const rx_ = Math.cos(p.yaw), rz_ = -Math.sin(p.yaw), off = l.laneW / 2 - 0.4;
    return { x: p.x + rx_ * off, z: p.z + rz_ * off, yaw: p.yaw, lane: l, s };
  }
  return null;
}
function landmarkSpot(name) { const L = MAP.landmarks[name]; if (!L) return null; const n = nearestRoad(L[0], L[1]); if (!n || n.d > 120) return null; const rx_ = Math.cos(n.yaw), rz_ = -Math.sin(n.yaw); return { x: n.x + rx_ * (n.e.w / 2 - 2), z: n.z + rz_ * (n.e.w / 2 - 2), yaw: n.yaw, name }; }
const _mr = mulberry(9001);
function missionsTick(dt) {
  const C = CAR, r = _mr;
  // keep three jobs on offer within reach
  MIS.spawnT -= dt;
  MIS.avail = MIS.avail.filter((m) => Math.hypot(m.x - C.x, m.z - C.z) < 700);
  if (!MIS.active && MIS.avail.length < 3 && MIS.spawnT <= 0) { MIS.spawnT = 0.5; const m = makeJob(r); if (m) MIS.avail.push(m); }
  if (!MIS.active) {
    for (let i = 0; i < MIS.avail.length; i++) { const m = MIS.avail[i]; if (Math.hypot(m.x - C.x, m.z - C.z) < 6 && C.kmh < 25) { MIS.avail.splice(i, 1); startJob(m); break; } }
    return;
  }
  const A = MIS.active; A.t += dt;
  const d = Math.hypot(A.tx - C.x, A.tz - C.z); A.dist = d;
  if (A.kind === 'trial') {
    const cp = A.cps[A.cpi]; if (Math.hypot(cp[0] - C.x, cp[1] - C.z) < 14) { A.cpi++; sfxUi(); if (A.cpi >= A.cps.length) finishJob(true); else { A.tx = A.cps[A.cpi][0]; A.tz = A.cps[A.cpi][1]; hudMsg('檢查點 ' + A.cpi + ' / ' + A.cps.length, null, '#7cf26a', 0.8); } }
  } else if (d < 9 && C.kmh < 12) finishJob(true);
  if (A.kind === 'delivery' && C.crashT > 0.6 && !A.spilt) { A.spilt = true; hudMsg('撞太大力，' + A.item + '灑了一半', null, '#ff4f6d', 2); }
  if (A.t > A.limit) finishJob(false);
}
function makeJob(r) {
  const C = CAR, u = r(), spot = roadSpot(C.x, C.z, 120, 420, r); if (!spot) return null;
  if (u < 0.5) {
    const dn = DEST_NAMES[r.int(0, DEST_NAMES.length - 1)], dest = landmarkSpot(dn) || roadSpot(spot.x, spot.z, 600, 1300, r); if (!dest) return null;
    const dist = Math.hypot(dest.x - spot.x, dest.z - spot.z); if (dist < 300) return null;
    const f = FARES[r.int(0, FARES.length - 1)];
    return { kind: 'taxi', x: spot.x, z: spot.z, yaw: spot.yaw, who: f[0], line: f[1].replace('{d}', dest.name || '那邊'), dest, destName: dest.name || '目的地', dist, pay: Math.round((400 + dist * 1.6) / 10) * 10, limit: dist / 8 + 25, icon: 'mk_taxi', title: '載客：' + f[0] };
  }
  if (u < 0.85) {
    const dest = roadSpot(spot.x, spot.z, 500, 1200, r); if (!dest) return null; const dist = Math.hypot(dest.x - spot.x, dest.z - spot.z), o = ORDERS[r.int(0, ORDERS.length - 1)];
    return { kind: 'delivery', x: spot.x, z: spot.z, yaw: spot.yaw, item: o[0], shop: o[1], dest, destName: '客人家', dist, pay: Math.round((350 + dist * 1.4) / 10) * 10, limit: dist / 8 + 30, icon: 'mk_box', title: '外送：' + o[0] };
  }
  // a time trial: through a string of junctions to a landmark
  const dn = DEST_NAMES[r.int(0, DEST_NAMES.length - 1)], dest = landmarkSpot(dn); if (!dest) return null;
  const path = graphPath(spot.x, spot.z, dest.x, dest.z); if (!path || path.len < 500) return null;
  const cps = []; for (let i = 2; i < path.nodes.length - 1; i += 3) cps.push([path.nodes[i].x, path.nodes[i].z]); cps.push([dest.x, dest.z]);
  return { kind: 'trial', x: spot.x, z: spot.z, yaw: spot.yaw, dest, destName: dn, dist: path.len, cps, par: path.len / 12 + 8, pay: Math.round((600 + path.len * 1.2) / 10) * 10, limit: path.len / 5 + 30, icon: 'mk_flag', title: '計時賽：到' + dn };
}
function startJob(m) {
  MIS.active = Object.assign(m, { t: 0, tx: m.kind === 'trial' ? m.cps[0][0] : m.dest.x, tz: m.kind === 'trial' ? m.cps[0][1] : m.dest.z, cpi: 0 });
  if (m.kind === 'taxi') hudMsg(m.who + '上車了', '「' + m.line + '」', '#ffd23a', 3.5);
  else if (m.kind === 'delivery') hudMsg('拿到' + m.item, '送到客人家，別撞太大力', '#ffd23a', 3);
  else hudMsg('計時賽開始！', '經過 ' + m.cps.length + ' 個檢查點到' + m.destName + '，標準時間 ' + Math.round(m.par) + ' 秒', '#ffd23a', 3.5);
  sfxChime();
}
function finishJob(ok) {
  const A = MIS.active; MIS.active = null; if (!A) return;
  if (!ok) { hudMsg(A.kind === 'taxi' ? '太慢了，客人下車走了' : A.kind === 'delivery' ? '超時了，客人取消' : '超過時間，計時賽失敗', null, '#ff4f6d', 3); sfxWarn(); return; }
  let pay = A.pay, note = '';
  if (A.kind === 'trial') { const bonus = Math.max(0, A.par - A.t); pay += Math.round(bonus * 40); note = A.t.toFixed(1) + ' 秒' + (bonus > 0 ? '，比標準快 ' + bonus.toFixed(1) + ' 秒' : ''); const b = PRO.best[A.destName]; if (!b || A.t < b) { PRO.best[A.destName] = +A.t.toFixed(2); note += '（新紀錄）'; } }
  else { const quick = A.t < A.limit * 0.6; if (quick) { pay = Math.round(pay * 1.3); note = '夠快，小費多給'; } if (A.spilt) pay = Math.round(pay * 0.5); }
  PRO.money += pay; PRO.jobs++; saveProgress();
  hudMsg('+ $' + pay.toLocaleString(), note || (A.kind === 'taxi' ? '「謝謝師傅」' : '客人收到了'), '#7cf26a', 3.5); sfxChime();
}
function cancelJob() { if (MIS.active) { MIS.active = null; hudMsg('任務取消', null, '#ffd23a', 1.5); } }
// shortest road path between two spots (Dijkstra over the graph, grade roads only)
function graphPath(x0, z0, x1, z1) {
  const a = nearestRoad(x0, z0), b = nearestRoad(x1, z1); if (!a || !b) return null;
  const start = Math.hypot(a.e.a.x - x0, a.e.a.z - z0) < Math.hypot(a.e.b.x - x0, a.e.b.z - z0) ? a.e.a : a.e.b, goal = Math.hypot(b.e.a.x - x1, b.e.a.z - z1) < Math.hypot(b.e.b.x - x1, b.e.b.z - z1) ? b.e.a : b.e.b;
  const dist = new Map([[start, 0]]), prev = new Map(), open = [start], done = new Set();
  while (open.length) {
    let bi = 0; for (let i = 1; i < open.length; i++) if (dist.get(open[i]) < dist.get(open[bi])) bi = i;
    const n = open.splice(bi, 1)[0]; if (n === goal) break; if (done.has(n)) continue; done.add(n);
    for (const e of n.edges) { if (e.lvl || e.ramp) continue; const m = e.a === n ? e.b : e.a, d = dist.get(n) + e.len; if (d < (dist.get(m) == null ? 1e9 : dist.get(m))) { dist.set(m, d); prev.set(m, n); if (!done.has(m)) open.push(m); } }
  }
  if (dist.get(goal) == null) return null;
  const nodes = []; for (let n = goal; n; n = prev.get(n)) nodes.unshift(n);
  return { nodes, len: dist.get(goal) };
}
// ---------- what the HUD draws for a job ----------
function missionsHud(W, H) {
  const C = CAR;
  otext('$ ' + PRO.money.toLocaleString(), W - 14, 94, 18, '#ffd23a', null, 'right', '#0a1028', 3);
  const A = MIS.active;
  if (!A) {
    // the nearest job on offer, pointed at
    let best = null; for (const m of MIS.avail) { const d = Math.hypot(m.x - C.x, m.z - C.z); if (!best || d < best.d) best = { m, d }; }
    if (best) { const m = best.m; arrowTo(W, H, m.x, m.z); otext(m.title + '　' + Math.round(best.d) + ' m', W / 2, 44, 15, '#fff3dc', { family: '"Noto Sans TC",sans-serif' }, 'center', '#0a1028', 3); otext('開到招牌旁邊接任務', W / 2, 62, 12, 'rgba(255,243,220,.75)', { family: '"Noto Sans TC",sans-serif' }, 'center', '#0a1028', 2); }
    return;
  }
  arrowTo(W, H, A.tx, A.tz);
  const left = Math.max(0, A.limit - A.t), col = left < 15 ? '#ff4f6d' : '#fff3dc';
  otext(A.title + (A.kind === 'trial' ? '　檢查點 ' + A.cpi + '/' + A.cps.length : '　→ ' + A.destName), W / 2, 44, 15, '#fff3dc', { family: '"Noto Sans TC",sans-serif' }, 'center', '#0a1028', 3);
  otext(Math.round(A.dist) + ' m　　' + (A.kind === 'trial' ? A.t.toFixed(1) + ' s' : '剩 ' + Math.ceil(left) + ' s'), W / 2, 64, 14, col, null, 'center', '#0a1028', 2);
}
function arrowTo(W, H, tx, tz) {
  const C = CAR, a = Math.atan2(tx - C.x, tz - C.z) - CAMV.az, x = W / 2, y = 24;
  hud.save(); hud.translate(x, y); hud.rotate(-a); hud.fillStyle = '#ffd23a'; hud.strokeStyle = '#0a1028'; hud.lineWidth = 2; hud.beginPath(); hud.moveTo(0, -11); hud.lineTo(8, 7); hud.lineTo(0, 3); hud.lineTo(-8, 7); hud.closePath(); hud.fill(); hud.stroke(); hud.restore();
}
