// ===================== the game: boot, the loop, the HUD =====================
const G = { mode: 'title', paused: false, t: 0, speed: 1, halt: false, bootMs: null, fps: 60 };
const SET = Object.assign({ quality: 'high', ctrl: 'tilt', auto: true, sfx: 0.9, music: 0.5, sens: 22, police: false, jobs: true, tod: 'day', style: 'toon' }, (() => { try { return JSON.parse(localStorage.getItem('kh.settings') || '{}'); } catch (e) { return {}; } })());
function saveSettings() { try { localStorage.setItem('kh.settings', JSON.stringify(SET)); } catch (e) { /* no storage */ } }
const hudCanvas = $('hud'), hud = hudCanvas.getContext('2d');
// anything that goes wrong is written on the screen, so a phone can tell us what happened
const ERRS = [];
function reportErr(m) { ERRS.push(String(m).slice(0, 160)); if (ERRS.length > 6) ERRS.shift(); const el = $('errbox') || document.body.appendChild(h('<div id="errbox" style="position:fixed;left:8px;top:60px;z-index:50;max-width:70vw;font:12px monospace;color:#ff8aa0;background:rgba(0,0,0,.6);padding:6px;border-radius:6px;pointer-events:none;white-space:pre-wrap"></div>')); el.textContent = ERRS.join('\n'); }
addEventListener('error', (e) => reportErr(e.message + ' @' + (e.lineno || ''))); addEventListener('unhandledrejection', (e) => reportErr('promise: ' + (e.reason && e.reason.message || e.reason)));
const HUD = { show: true, msgs: [], minimap: null };
function hudMsg(text, sub, col, dur) { HUD.msgs.push({ text, sub, col: col || '#ffd23a', t: 0, dur: dur || 2 }); if (HUD.msgs.length > 3) HUD.msgs.shift(); }
function hudResize() { const r = Math.min(2, devicePixelRatio || 1); hudCanvas.width = Math.round(innerWidth * r); hudCanvas.height = Math.round(innerHeight * r); hud.setTransform(r, 0, 0, r, 0, 0); layoutPads(); }
addEventListener('resize', hudResize);
// ---------- boot ----------
function boot() {
  const t0 = performance.now();
  STYLE.toon = SET.style !== 'hd2d' && !/hd2d/.test(location.hash);
  paintProps(); buildMap();
  const t1 = performance.now(); atlasPaint(); paintTrafficKinds();
  const t2 = performance.now(); buildCity(); buildLanes(); buildWalkways();
  const t3 = performance.now();
  try { r3Init(); setTod(SET.tod); } catch (e) { reportErr('WebGL: ' + e.message); }
  hudResize();
  G.bootMs = { map: Math.round(t1 - t0), atlas: Math.round(t2 - t1), city: Math.round(t3 - t2), gl: Math.round(performance.now() - t3) };
  HUD.minimap = canvas(200, 200); const g = HUD.minimap.getContext('2d'); g.drawImage(MAP.ground, 0, 0, 200, 200);
  uiInit(); const ld = $('loading'); if (ld) ld.remove();
  if (/halt/.test(location.hash)) G.halt = true;   // the test harness drives frames by hand
  aerialEnter(false);
  requestAnimationFrame(frame);
}
// ---------- the drive ----------
function startDrive(carIdx) {
  footReset(); G.carIdx = carIdx;
  carSetup(CARS[carIdx], SET.auto);
  // 中山路 just south of 美麗島, heading south down the long straight toward 中央公園 and 三多商圈
  const L = MAP.landmarks.美麗島; CAR.x = L[0] - 5.95; CAR.z = L[1] + 75; CAR.yaw = 0; CAR.y = groundH(CAR.x, CAR.z); CAR.vyv = 0;
  // the streets are already busy when we set off, but nothing right beside us
  trafficReset();
  r3CarSet(CARS[carIdx]); camReset();
  CTL.mode = SET.ctrl === 'tilt' && CTL.tilt.ok ? 'tilt' : 'touch'; layoutPads(); setTimeout(tiltRecenter, 300);
  G.mode = 'drive'; G.paused = false; show(null); r3FogRange(FOG_NEAR, FOG_FAR); CAR.ghost = false;
  if (AU.ctx) engineStart(CARS[carIdx].engine);
  hudMsg('高雄・港都', '自由行駛・停車後按「下車」可以走路、搶車', '#ffd23a', 3);
}
function onPausePressed() { if (G.mode !== 'drive') return; G.paused = !G.paused; if (G.paused) { show('pause'); if (AU.ctx) AU.ctx.suspend(); } else { show(null); if (AU.ctx) AU.ctx.resume(); } }
function driveEnd() { footReset(); sirenUpdate(0, 1); WANT.stars = 0; WANT.heat = 0; for (const c of WANT.cops) { const i = TR.veh.indexOf(c); if (i >= 0) retire(c, i); } WANT.cops.length = 0; }
let lastT = performance.now(), fpsAcc = 0, fpsN = 0;
function frame(now) {
  requestAnimationFrame(frame);
  if (G.halt) return;
  if (R3.hero && R3.hero.next < R3.hero.n) heroPaintStep(G.mode === 'drive' ? 3 : 8);   // the hero's pictures, a few at a time
  let dt = Math.min(0.05, (now - lastT) / 1000); lastT = now; dt *= G.speed;
  fpsAcc += dt; fpsN++; if (fpsAcc > 0.5) { G.fps = Math.round(fpsN / fpsAcc); fpsAcc = 0; fpsN = 0; dynRes(); }
  tick(dt);
  render(dt);
}
// the illustrated style draws near the screen's own sharpness, and gives some of it back when the frame rate sags
function dynRes() {
  if (!STYLE.toon || !R3.renderer || document.hidden) return;
  const D = (G.dynS = G.dynS || { low: 0, high: 0 }); R3.dyn = R3.dyn || 1;
  if (G.fps < 44) { D.high = 0; if (++D.low >= 2 && R3.dyn > 0.5) { R3.dyn = Math.max(0.5, R3.dyn * 0.86); D.low = 0; r3Resize(); } }
  else if (G.fps > 56) { D.low = 0; if (++D.high >= 8 && R3.dyn < 1) { R3.dyn = Math.min(1, R3.dyn * 1.08); D.high = 0; r3Resize(); } }
  else { D.low = 0; D.high = 0; }
}
// the city carries on under the aerial views: the traffic and people live round the spot the camera looks at
function aerialTick(dt) {
  G.t += dt; const C = CAR, A = AERIAL;
  C.x = A.lookX; C.z = A.lookZ; C.vx = C.vy = 0; C.y = 0; C.ghost = true; if (!C.P) C.P = carPhysics(CARS[0]);
  trafficTick(dt); peopleTick(dt); signalsUpdate();
}
const AERIAL = { az: 0, lookX: 0, lookZ: 0, dist: 420, el: 0.72, stop: 0, t: 0, god: false, drag: null };
function aerialUpdate(dt) {
  const A = AERIAL, L = MAP.landmarks;
  if (G.mode === 'title') {
    // a slow circuit over the sights, drifting from one to the next
    const tour = ['美麗島', '八五大樓', '駁二', '中央公園', '高雄車站', '夢時代', '旗津', '龍虎塔', '高鐵左營站', '澄清湖', '大東藝文中心', '小港機場', '中鋼'].filter((k) => L[k]);
    A.t += dt; const i = Math.floor(A.t / 16) % tour.length, k = (A.t % 16) / 16, from = L[tour[i]], to = L[tour[(i + 1) % tour.length]], e = k < 0.7 ? 0 : (k - 0.7) / 0.3, se = e * e * (3 - 2 * e);
    A.lookX = lerp(from[0], to[0], se); A.lookZ = lerp(from[1], to[1], se); A.az += dt * 0.08; A.dist = 420; A.el = 0.62;
  }
  if (A.god) { const far = Math.max(4200, A.dist * 3.2); if (Math.abs(far - (R3.fogFar || 0)) > 50) r3FogRange(far * 0.45, far); }
  const cam = R3.cam, ce = Math.cos(A.el), px = A.lookX - Math.sin(A.az) * A.dist * ce, pz = A.lookZ - Math.cos(A.az) * A.dist * ce, py = A.dist * Math.sin(A.el);
  cam.position.set(px, Math.max(py, groundHSafe(px, pz) + 12), pz); cam.lookAt(A.lookX, 0, A.lookZ); cam.fov = 48; cam.updateProjectionMatrix();
  CAMV.az = A.az;
}
function groundHSafe(x, z) { try { return terrainH(clamp(x, 0, MAP.W), clamp(z, 0, MAP.W)); } catch (e) { return 0; } }
function aerialEnter(god) {
  G.mode = god ? 'god' : 'title'; AERIAL.god = !!god; r3FogRange(900, god ? 4200 : 2600);
  if (god) { const L = MAP.landmarks.美麗島; AERIAL.lookX = L[0]; AERIAL.lookZ = L[1]; AERIAL.dist = 900; AERIAL.el = 0.9; AERIAL.az = Math.PI; }
}
function tick(dt) {
  if (G.mode === 'title' || G.mode === 'god') { aerialTick(dt); return; }
  if (G.mode !== 'drive' || G.paused) return;
  G.t += dt;
  controlsUpdate(dt);
  const n = Math.max(1, Math.ceil(dt / (1 / 240))), h = dt / n;
  CAR.parked = HERO.on; if (HERO.on) { const C = CAR; C.throttle = 0; C.brake = 0; C.hand = 1; C.steerIn = 0; heroStep(dt); }
  for (let i = 0; i < n; i++) carStep(h);
  carDamageTick(dt); fxTick(dt); freeTick(dt); parkTick();
  { const t0 = performance.now(); trafficTick(dt); const t1 = performance.now(); peopleTick(dt); const t2 = performance.now(); TR.stats.ms = lerp(TR.stats.ms || 0, t1 - t0, 0.05); PEO.stats.ms = lerp(PEO.stats.ms || 0, t2 - t1, 0.05); }
  if (SET.jobs) missionsTick(dt); else if (MIS.active || MIS.avail.length) { MIS.active = null; MIS.avail.length = 0; } wantedTick(dt);
  if (CAR.crashT > 0) CAR.crashT -= dt;
  if (CAR.slipK > 1.05 && Math.abs(CAR.vx) > 3 && Math.random() < 0.6) { r3AddMark(CAR.x - Math.sin(CAR.yaw) * CAR.P.b, CAR.z - Math.cos(CAR.yaw) * CAR.P.b, CAR.yaw, 1); r3AddMark(CAR.x - Math.sin(CAR.yaw) * CAR.P.b, CAR.z - Math.cos(CAR.yaw) * CAR.P.b, CAR.yaw, -1); }
  camUpdate(dt); signalsUpdate();
  if (!HERO.on && !CAR.broken) engineUpdate(CAR.rpm, CAR.P.red, CAR.throttle, Math.abs(CAR.vx), clamp(CAR.slipK - 0.9, 0, 1), CAR.surface !== GK.asphalt && CAR.surface !== GK.concrete ? 1 : 0, false, CAR.hand > 0.5 && Math.abs(CAR.vx) > 5);
  for (const m of HUD.msgs) m.t += dt; HUD.msgs = HUD.msgs.filter((m) => m.t < m.dur);
  // in the water, or wedged: back to the road after a moment
  if (!HERO.on && CAR.surface === GK.water) { G.wetT = (G.wetT || 0) + dt; if (G.wetT > 0.6 && !G.wetMsg) { G.wetMsg = true; hudMsg('掉進水裡了', '3 秒後回到路上', '#7cd0ff', 3); } if (G.wetT > 3.5) { carToRoad(); G.wetT = 0; G.wetMsg = false; } } else { G.wetT = 0; G.wetMsg = false; }
  if (!HERO.on && !CAR.broken && CAR.throttle > 0.5 && CAR.kmh < 4 && !CAR.rev) { G.stuckT = (G.stuckT || 0) + dt; if (G.stuckT > 4 && !G.stuckMsg) { G.stuckMsg = true; hudMsg('卡住了？', '按住煞車可倒車，或暫停→回到路上', '#ffd23a', 3); } } else { G.stuckT = 0; G.stuckMsg = false; }
}
function onCarHit(into) { CAMV.shake = Math.min(1, into / 10); if (into > 2.5) sfxCrash(clamp(into / 20, 0.3, 1)); else sfxThud(0.5); }
function onKerb() { CAMV.shake = Math.max(CAMV.shake, 0.3); sfxThud(0.4); }
function onPersonHit() { CAMV.shake = Math.max(CAMV.shake, 0.4); sfxThud(0.7); hudMsg('撞到人了！', null, '#ff4f6d', 1.5); heatUp(25, '撞到行人'); }
function render(dt) {
  if (G.mode === 'drive') { r3Update(CAMV.az); r3Frame(CAMV.fp ? 24 : CAMV.view === 'high' ? 10 : 16); drawHud(); }
  else if ((G.mode === 'title' || G.mode === 'god') && R3.cam && MAP.landmarks) { aerialUpdate(dt); r3Update(CAMV.az); if (R3.car) R3.car.visible = false; if (R3.shadow) R3.shadow.visible = false; r3Frame(AERIAL.dist); if (G.mode === 'god') drawGodHud(); else hud.clearRect(0, 0, innerWidth, innerHeight); }
}
// the god's-eye map: the place and the scale, and how to move about
function drawGodHud() {
  const W = innerWidth, H = innerHeight; hud.clearRect(0, 0, W, H);
  const n = nearestRoad(AERIAL.lookX, AERIAL.lookZ), nm = n && n.e.rd && n.e.rd.name ? n.e.rd.name : '';
  let near = '', nd = 1e9; for (const k in MAP.landmarks) { const d = Math.hypot(MAP.landmarks[k][0] - AERIAL.lookX, MAP.landmarks[k][1] - AERIAL.lookZ); if (d < nd) { nd = d; near = k; } }
  otext((nd < 400 ? near + '一帶' : '') + (nm ? '　' + nm : ''), 16, H - 54, 16, '#fff3dc', null, 'left', 'rgba(0,0,0,.6)', 3);
  otext('拖曳移動・兩指縮放・' + Math.round(AERIAL.dist) + ' m', 16, H - 30, 13, '#ffd23a', null, 'left', 'rgba(0,0,0,.6)', 3);
}
// ---------- the HUD: speed, gear, revs, the minimap, the pads ----------
function otext(str, x, y, size, fill, font, align, stroke, lw) { hud.font = (font && font.weight ? font.weight : '700') + ' ' + size + 'px ' + (font && font.family ? font.family : '"Russo One","Noto Sans TC",sans-serif'); hud.textAlign = align || 'left'; hud.textBaseline = 'alphabetic'; hud.lineJoin = 'round'; hud.lineWidth = lw || Math.max(2, size * 0.14); hud.strokeStyle = stroke || '#140c2a'; hud.strokeText(str, x, y); hud.fillStyle = fill; hud.fillText(str, x, y); }
function rrect(x, y, w, h, r) { hud.beginPath(); hud.moveTo(x + r, y); hud.arcTo(x + w, y, x + w, y + h, r); hud.arcTo(x + w, y + h, x, y + h, r); hud.arcTo(x, y + h, x, y, r); hud.arcTo(x, y, x + w, y, r); hud.closePath(); }
function pad(r, label, on) { if (!r) return; hud.fillStyle = on ? 'rgba(255,210,58,.35)' : 'rgba(10,16,40,.45)'; rrect(r.x, r.y, r.w, r.h, 12); hud.fill(); hud.strokeStyle = 'rgba(255,243,220,.5)'; hud.lineWidth = 1.5; hud.stroke(); otext(label, r.x + r.w / 2, r.y + r.h / 2 + 6, 15, '#fff3dc', { family: '"Noto Sans TC",sans-serif' }, 'center', '#0a1028', 2); }
function drawHud() {
  const W = innerWidth, H = innerHeight, C = CAR; hud.clearRect(0, 0, W, H);
  if (!HUD.show) return;
  if (HERO.on) { drawFootHud(W, H); return; }
  // speed and gear, bottom centre-right
  otext(String(Math.round(C.kmh)), W * 0.5 + 60, H - 28, 44, '#ffffff', null, 'right', '#0a1028', 4); otext('km/h', W * 0.5 + 66, H - 28, 14, '#ffd23a', null, 'left', '#0a1028', 2);
  otext((C.auto ? 'AT ' : 'MT ') + (C.rev ? 'R' : C.gear), W * 0.5 - 70, H - 28, 22, '#9ad0ff', null, 'right', '#0a1028', 3);
  dmgBar(W * 0.5 + 76, H - 44, C.damage, C.broken);
  // the rev bar
  const r = clamp(C.rpm / C.P.red, 0, 1.05), bx = W * 0.5 - 70, by = H - 18, bw = 136; hud.fillStyle = 'rgba(0,0,0,.4)'; hud.fillRect(bx, by, bw, 6); hud.fillStyle = r > 0.92 ? '#ff4f6d' : '#7cf26a'; hud.fillRect(bx, by, bw * Math.min(1, r), 6);
  // what the tyres are doing
  if (C.slipK > 1.05) otext(C.hand > 0.5 ? '手煞車' : C.slipR > C.slipF ? '甩尾' : '推頭', W * 0.5, H - 70, 16, '#ffd23a', { family: '"Noto Sans TC",sans-serif' }, 'center', '#0a1028', 2);
  // the place and the fps, top left
  otext(MAP.name, 14, 30, 18, '#fff3dc', { family: '"Noto Sans TC",sans-serif' }, 'left', '#0a1028', 3);
  otext(G.fps + ' fps', 14, 50, 11, 'rgba(255,243,220,.7)', null, 'left', '#0a1028', 2);
  // the road we are on
  { const n = nearestRoad(C.x, C.z, C.y); if (n && n.d < n.e.w / 2 + 6 && n.e.rd.name) otext(n.e.rd.name, 14, 74, 16, '#fff3dc', { family: '"Noto Sans TC",sans-serif' }, 'left', '#0a1028', 3); }
  // the minimap, bottom left
  const ms = Math.min(150, H * 0.3), mx = 14, my = H - ms - (CTL.mode === 'tilt' ? 104 : 14); hud.save(); rrect(mx, my, ms, ms, 10); hud.clip(); hud.globalAlpha = 0.85; hud.drawImage(HUD.minimap, mx, my, ms, ms); hud.globalAlpha = 1;
  const k = ms / MAP.W, cx = mx + C.x * k, cz = my + C.z * k;
  for (const j of MIS.active ? [] : MIS.avail) { hud.fillStyle = '#ffd23a'; hud.beginPath(); hud.arc(mx + j.x * k, my + j.z * k, 3, 0, TAU); hud.fill(); } if (MIS.active) { hud.fillStyle = '#30e0ff'; hud.beginPath(); hud.arc(mx + MIS.active.tx * k, my + MIS.active.tz * k, 4, 0, TAU); hud.fill(); }
  hud.fillStyle = '#ff4f6d'; hud.beginPath(); hud.arc(cx, cz, 4, 0, TAU); hud.fill(); hud.strokeStyle = '#fff'; hud.lineWidth = 1.5; hud.beginPath(); hud.moveTo(cx, cz); hud.lineTo(cx + Math.sin(C.yaw) * 10, cz + Math.cos(C.yaw) * 10); hud.stroke(); hud.restore();
  // messages
  let y = H * 0.3; for (const m of HUD.msgs) { hud.globalAlpha = m.t < 0.15 ? m.t / 0.15 : m.t > m.dur - 0.3 ? (m.dur - m.t) / 0.3 : 1; otext(m.text, W / 2, y, 30, m.col, { family: '"Noto Sans TC",sans-serif' }, 'center', '#0a1028', 4); if (m.sub) otext(m.sub, W / 2, y + 24, 15, '#fff3dc', { family: '"Noto Sans TC",sans-serif' }, 'center', '#0a1028', 2); hud.globalAlpha = 1; y += 60; }
  // the pads
  if (IS_TOUCH) { const P = CTL.pads, T = [...CTL.touches.values()]; pad(P.gas, '油門', T.some((t) => t.kind === 'gas')); pad(P.brake, '煞車', T.some((t) => t.kind === 'brake')); pad(P.hand, '手煞車', T.some((t) => t.kind === 'hand')); if (!C.auto) { pad(P.up, '▲ 升檔', false); pad(P.dn, '▼ 降檔', false); } if (P.steer) { pad(P.steer, CTL.mode === 'tilt' ? '← 滑動也能轉 →' : '← 滑動轉向 →', T.some((t) => t.kind === 'steer')); } }
  pad(CTL.pads.view, { chase: '肩後', cockpit: '座艙', high: '俯視' }[CAMV.view], false); pad(CTL.pads.pause, '∥', false); pad(CTL.pads.horn, '喇叭', false); if (CTL.pads.zero) pad(CTL.pads.zero, '歸零', false);
  pad(CTL.pads.exit, '下車', C.broken || C.kmh < 22);
  if (SET.jobs) missionsHud(W, H); wantedHud(W, H);
  // the wheel, so the player sees what the tilt is doing
  { const sx = W * 0.5, sy = H - 92; hud.fillStyle = 'rgba(0,0,0,.35)'; hud.fillRect(sx - 60, sy, 120, 6); hud.fillStyle = '#ffd23a'; hud.fillRect(sx + C.steerIn * 56 - 4, sy - 3, 8, 12); }
  if (CAMV.fp) drawCockpit();
}
// how hurt the vehicle is: a short bar, green to red; a dead engine says so
function dmgBar(x, y, d, broken) {
  const w = 64, k = clamp(1 - d, 0, 1); hud.fillStyle = 'rgba(0,0,0,.45)'; hud.fillRect(x, y, w, 7);
  hud.fillStyle = broken ? '#ff4f6d' : k > 0.6 ? '#7cf26a' : k > 0.3 ? '#ffd23a' : '#ff8a3a'; hud.fillRect(x, y, w * (broken ? 1 : k), 7);
  otext(broken ? '引擎掛了' : '車況', x, y - 4, 11, broken ? '#ff4f6d' : '#fff3dc', { family: '"Noto Sans TC",sans-serif' }, 'left', '#0a1028', 2);
}
// on foot: the stick under the left thumb, the punch and get-in buttons under the right, what is within reach
function drawFootHud(W, H) {
  const P = plr(), Hh = HERO;
  otext(MAP.name, 14, 30, 18, '#fff3dc', { family: '"Noto Sans TC",sans-serif' }, 'left', '#0a1028', 3);
  otext(G.fps + ' fps', 14, 50, 11, 'rgba(255,243,220,.7)', null, 'left', '#0a1028', 2);
  { const n = nearestRoad(P.x, P.z, P.y); if (n && n.d < n.e.w / 2 + 12 && n.e.rd.name) otext(n.e.rd.name, 14, 74, 16, '#fff3dc', { family: '"Noto Sans TC",sans-serif' }, 'left', '#0a1028', 3); }
  // the minimap (up by the place names, out of the stick's way): the hero, and where the car was left
  const ms = Math.min(120, H * 0.24), mx = 14, my = 88; hud.save(); rrect(mx, my, ms, ms, 10); hud.clip(); hud.globalAlpha = 0.85; hud.drawImage(HUD.minimap, mx, my, ms, ms); hud.globalAlpha = 1;
  const k = ms / MAP.W; hud.fillStyle = '#30a8ff'; hud.beginPath(); hud.arc(mx + CAR.x * k, my + CAR.z * k, 4, 0, TAU); hud.fill();
  hud.fillStyle = '#ff4f6d'; hud.beginPath(); hud.arc(mx + Hh.x * k, my + Hh.z * k, 4, 0, TAU); hud.fill(); hud.restore();
  let y = H * 0.3; for (const m of HUD.msgs) { hud.globalAlpha = m.t < 0.15 ? m.t / 0.15 : m.t > m.dur - 0.3 ? (m.dur - m.t) / 0.3 : 1; otext(m.text, W / 2, y, 30, m.col, { family: '"Noto Sans TC",sans-serif' }, 'center', '#0a1028', 4); if (m.sub) otext(m.sub, W / 2, y + 24, 15, '#fff3dc', { family: '"Noto Sans TC",sans-serif' }, 'center', '#0a1028', 2); hud.globalAlpha = 1; y += 60; }
  // the stick
  const st = [...CTL.touches.values()].find((t) => t.kind === 'stick');
  if (st) { const R = CTL.stickR, dx = st.x - st.x0, dy = st.y - st.y0, d = Math.hypot(dx, dy), kx = d > R ? dx / d * R : dx, ky = d > R ? dy / d * R : dy; hud.fillStyle = 'rgba(10,16,40,.35)'; hud.beginPath(); hud.arc(st.x0, st.y0, R, 0, TAU); hud.fill(); hud.strokeStyle = 'rgba(255,243,220,.5)'; hud.lineWidth = 2; hud.stroke(); hud.fillStyle = d > R * 0.62 ? 'rgba(255,210,58,.75)' : 'rgba(255,243,220,.7)'; hud.beginPath(); hud.arc(st.x0 + kx, st.y0 + ky, R * 0.42, 0, TAU); hud.fill(); }
  else if (IS_TOUCH) { const S = CTL.pads.stick; otext('左手拖曳移動・推到底用跑的', S.x + 18, H - 22, 12, 'rgba(255,243,220,.6)', { family: '"Noto Sans TC",sans-serif' }, 'left', '#0a1028', 2); }
  // the buttons: round ones, under the right thumb
  const btn = (r, label, sub, on, dim) => { const cx = r.x + r.w / 2, cy = r.y + r.h / 2, rad = Math.min(r.w, r.h) / 2; hud.fillStyle = dim ? 'rgba(10,16,40,.28)' : on ? 'rgba(255,210,58,.5)' : 'rgba(10,16,40,.5)'; hud.beginPath(); hud.arc(cx, cy, rad, 0, TAU); hud.fill(); hud.strokeStyle = dim ? 'rgba(255,243,220,.25)' : 'rgba(255,243,220,.7)'; hud.lineWidth = 2.5; hud.stroke(); otext(label, cx, cy + (sub ? 2 : 9), Math.round(rad * 0.52), dim ? 'rgba(255,243,220,.45)' : '#fff3dc', { family: '"Noto Sans TC",sans-serif' }, 'center', '#0a1028', 3); if (sub) otext(sub, cx, cy + rad * 0.5, 11, dim ? 'rgba(255,243,220,.45)' : '#ffd23a', { family: '"Noto Sans TC",sans-serif' }, 'center', '#0a1028', 2); };
  const T = [...CTL.touches.values()], tg = Hh.tgt;
  btn(CTL.pads.punch, '打', null, T.some((t) => t.kind === 'punch') || Hh.punchT > 0, Hh.down > 0);
  const what = tg ? (tg.kind === 'street' ? (tg.ref.broken ? '壞了' : (tg.ref.cop ? '警車' : vehName(trafficSpec(tg.ref.kind)))) : tg.kind === 'own' ? (CAR.broken ? '壞了' : '我的車') : vehName(tg.ref.spec)) : null;
  btn(CTL.pads.car, tg && tg.kind === 'street' ? '搶車' : '上車', what, !!tg && tg.d <= FOOT.reach, !tg);
  if (!IS_TOUCH) otext('WASD 走・推到底跑（Shift 慢走）・空白鍵 打・F 上車/搶車', W / 2, H - 14, 12, 'rgba(255,243,220,.7)', { family: '"Noto Sans TC",sans-serif' }, 'center', '#0a1028', 2);
  pad(CTL.pads.view, { chase: '肩後', cockpit: '肩後', high: '俯視' }[CAMV.view], false); pad(CTL.pads.pause, '∥', false);
  if (SET.jobs) missionsHud(W, H); wantedHud(W, H);
}
// the driver's seat: the dash across the bottom, the wheel turning with the steering, the gauges
function drawCockpit() {
  const W = innerWidth, H = innerHeight, C = CAR, col = cssHex(C.spec.interior || 0x2a2a2a), dh = H * 0.26;
  hud.fillStyle = col; hud.beginPath(); hud.moveTo(0, H); hud.lineTo(0, H - dh * 0.7); hud.quadraticCurveTo(W * 0.5, H - dh * 1.25, W, H - dh * 0.7); hud.lineTo(W, H); hud.closePath(); hud.fill();
  hud.fillStyle = 'rgba(0,0,0,.35)'; hud.fillRect(0, H - dh * 0.72, W, 3);
  // the wheel
  const wx = W * 0.42, wy = H - dh * 0.12, R = Math.min(W, H) * 0.19; hud.save(); hud.translate(wx, wy); hud.rotate(-C.steer * 2.6); hud.strokeStyle = '#1a1a1e'; hud.lineWidth = R * 0.16; hud.beginPath(); hud.arc(0, 0, R, 0, TAU); hud.stroke(); hud.lineWidth = R * 0.1; hud.beginPath(); hud.moveTo(-R, 0); hud.lineTo(R, 0); hud.moveTo(0, 0); hud.lineTo(0, R); hud.stroke(); hud.fillStyle = cssHex(C.spec.color); hud.beginPath(); hud.arc(0, 0, R * 0.18, 0, TAU); hud.fill(); hud.restore();
  // gauges
  const gauge = (x, y, r, val, red, label) => { hud.strokeStyle = '#111'; hud.lineWidth = 3; hud.beginPath(); hud.arc(x, y, r, 0, TAU); hud.stroke(); hud.fillStyle = '#0c0c10'; hud.fill(); for (let i = 0; i <= 10; i++) { const a = Math.PI * 0.75 + (i / 10) * Math.PI * 1.5; hud.strokeStyle = i >= red ? '#ff4f6d' : '#ddd'; hud.lineWidth = 2; hud.beginPath(); hud.moveTo(x + Math.cos(a) * r * 0.8, y + Math.sin(a) * r * 0.8); hud.lineTo(x + Math.cos(a) * r * 0.92, y + Math.sin(a) * r * 0.92); hud.stroke(); } const a = Math.PI * 0.75 + clamp(val, 0, 1) * Math.PI * 1.5; hud.strokeStyle = '#ff8a3a'; hud.lineWidth = 3; hud.beginPath(); hud.moveTo(x, y); hud.lineTo(x + Math.cos(a) * r * 0.85, y + Math.sin(a) * r * 0.85); hud.stroke(); otext(label, x, y + r * 0.6, 10, '#aaa', null, 'center', '#000', 1); };
  gauge(W * 0.42 - R * 1.7, H - dh * 0.45, R * 0.45, C.rpm / C.P.red, 9, 'rpm'); gauge(W * 0.42 + R * 1.7, H - dh * 0.45, R * 0.45, C.kmh / 320, 11, 'km/h');
}
// ---------- test hooks ----------
window.__kh = {
  G, CAR, CAMV, CTL, MAP, PROPS, R3, SET, CARS, CITY, ATLAS, setTod, AERIAL, aerialEnter, startDrive, carToRoad, show, trafficReset, HERO, PARK, FREEW, FXP, carAction, heroPunch, touchDown, touchMove, touchUp, heroTarget, enterVehicle, exitCar, breakVehicle, vehHurt, trafficSpec, carPhysics, groundH, solidsNear, solidAt, nearestRoad, SOL, r3Cull, TR, TRF, PEO, MIS, PRO, WANT, heatUp, turn(ci, i) { return carTurnFrame(CARS[ci], i).toDataURL(); },
  halt(on) { G.halt = !!on; }, sim(sec, h) { h = h || 1 / 120; const n = Math.round(sec / h); for (let i = 0; i < n; i++) tick(h); return this.state(); },
  step(dt) { tick(dt); render(dt); return $('gl').toDataURL('image/png'); },
  draw() { render(0); return $('gl').toDataURL('image/png'); },
  heroSheet() { heroPaintStep(1e9); const H = paintHero(), cols = HERO_POSES.length, fw = H.frames[0].cw, fh = H.frames[0].ch, cv = canvas(cols * fw, (HERO_DIRS + 1) * fh), g = cv.getContext('2d'); g.fillStyle = '#c9d4de'; g.fillRect(0, 0, cv.width, cv.height); H.frames.forEach((f, i) => g.drawImage(f.toCanvas(), (i % cols) * fw, Math.floor(i / cols) * fh)); return cv.toDataURL('image/png'); },
  state() { const C = CAR; return { x: +C.x.toFixed(1), z: +C.z.toFixed(1), yaw: +C.yaw.toFixed(2), kmh: Math.round(C.kmh), vy: +C.vy.toFixed(2), r: +C.r.toFixed(2), rpm: Math.round(C.rpm), gear: C.gear, surf: C.surface, slip: +C.slipK.toFixed(2), dmg: +C.damage.toFixed(2), fps: G.fps }; },
};
