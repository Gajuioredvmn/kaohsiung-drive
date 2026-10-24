// ===================== the game: boot, the loop, the HUD =====================
const G = { mode: 'title', paused: false, t: 0, speed: 1, halt: false, bootMs: null, fps: 60 };
const SET = Object.assign({ quality: 'high', ctrl: 'tilt', auto: true, sfx: 0.9, music: 0.5, sens: 22 }, (() => { try { return JSON.parse(localStorage.getItem('kh.settings') || '{}'); } catch (e) { return {}; } })());
function saveSettings() { try { localStorage.setItem('kh.settings', JSON.stringify(SET)); } catch (e) { /* no storage */ } }
const hudCanvas = $('hud'), hud = hudCanvas.getContext('2d');
const HUD = { show: true, msgs: [], minimap: null };
function hudMsg(text, sub, col, dur) { HUD.msgs.push({ text, sub, col: col || '#ffd23a', t: 0, dur: dur || 2 }); if (HUD.msgs.length > 3) HUD.msgs.shift(); }
function hudResize() { const r = Math.min(2, devicePixelRatio || 1); hudCanvas.width = Math.round(innerWidth * r); hudCanvas.height = Math.round(innerHeight * r); hud.setTransform(r, 0, 0, r, 0, 0); layoutPads(); }
addEventListener('resize', hudResize);
// ---------- boot ----------
function boot() {
  const t0 = performance.now();
  paintProps(); buildMap(); placeProps();
  const t1 = performance.now();
  r3Init(); hudResize();
  G.bootMs = { paint: Math.round(t1 - t0), gl: Math.round(performance.now() - t1) };
  HUD.minimap = canvas(200, 200); const g = HUD.minimap.getContext('2d'); g.drawImage(MAP.ground, 0, 0, 200, 200);
  uiInit();
  requestAnimationFrame(frame);
}
// ---------- the drive ----------
function startDrive(carIdx) {
  carSetup(CARS[carIdx], SET.auto);
  const n = nearestRoad(1180, 1370); CAR.x = n.x; CAR.z = n.z; CAR.yaw = n.yaw; CAR.y = terrainH(CAR.x, CAR.z);
  r3CarSet(CARS[carIdx]); camReset();
  CTL.mode = SET.ctrl === 'tilt' && CTL.tilt.ok ? 'tilt' : 'touch'; layoutPads();
  G.mode = 'drive'; G.paused = false; show(null);
  if (AU.ctx) engineStart(CARS[carIdx].engine);
  hudMsg('高雄・港都', '自由行駛　按 R 回到路上', '#ffd23a', 3);
}
function onPausePressed() { if (G.mode !== 'drive') return; G.paused = !G.paused; if (G.paused) { show('pause'); if (AU.ctx) AU.ctx.suspend(); } else { show(null); if (AU.ctx) AU.ctx.resume(); } }
let lastT = performance.now(), fpsAcc = 0, fpsN = 0;
function frame(now) {
  requestAnimationFrame(frame);
  if (G.halt) return;
  let dt = Math.min(0.05, (now - lastT) / 1000); lastT = now; dt *= G.speed;
  fpsAcc += dt; fpsN++; if (fpsAcc > 0.5) { G.fps = Math.round(fpsN / fpsAcc); fpsAcc = 0; fpsN = 0; }
  tick(dt);
  render(dt);
}
function tick(dt) {
  if (G.mode !== 'drive' || G.paused) return;
  G.t += dt;
  controlsUpdate(dt);
  const n = Math.max(1, Math.ceil(dt / (1 / 240))), h = dt / n;
  for (let i = 0; i < n; i++) carStep(h);
  if (CAR.crashT > 0) CAR.crashT -= dt;
  if (CAR.slipK > 1.05 && Math.abs(CAR.vx) > 3 && Math.random() < 0.6) { r3AddMark(CAR.x - Math.sin(CAR.yaw) * CAR.P.b, CAR.z - Math.cos(CAR.yaw) * CAR.P.b, CAR.yaw, 1); r3AddMark(CAR.x - Math.sin(CAR.yaw) * CAR.P.b, CAR.z - Math.cos(CAR.yaw) * CAR.P.b, CAR.yaw, -1); }
  camUpdate(dt);
  engineUpdate(CAR.rpm, CAR.P.red, CAR.throttle, Math.abs(CAR.vx), clamp(CAR.slipK - 0.9, 0, 1), CAR.surface !== GK.asphalt && CAR.surface !== GK.concrete ? 1 : 0, false, CAR.hand > 0.5 && Math.abs(CAR.vx) > 5);
  for (const m of HUD.msgs) m.t += dt; HUD.msgs = HUD.msgs.filter((m) => m.t < m.dur);
}
function onCarHit(into) { CAMV.shake = Math.min(1, into / 10); if (into > 2.5) sfxCrash(clamp(into / 20, 0.3, 1)); else sfxThud(0.5); }
function render(dt) {
  if (G.mode === 'drive') { r3Update(CAMV.az); r3Frame(CAMV.fp ? 24 : 10); drawHud(); }
}
// ---------- the HUD: speed, gear, revs, the minimap, the pads ----------
function otext(str, x, y, size, fill, font, align, stroke, lw) { hud.font = (font && font.weight ? font.weight : '700') + ' ' + size + 'px ' + (font && font.family ? font.family : '"Russo One","Noto Sans TC",sans-serif'); hud.textAlign = align || 'left'; hud.textBaseline = 'alphabetic'; hud.lineJoin = 'round'; hud.lineWidth = lw || Math.max(2, size * 0.14); hud.strokeStyle = stroke || '#140c2a'; hud.strokeText(str, x, y); hud.fillStyle = fill; hud.fillText(str, x, y); }
function rrect(x, y, w, h, r) { hud.beginPath(); hud.moveTo(x + r, y); hud.arcTo(x + w, y, x + w, y + h, r); hud.arcTo(x + w, y + h, x, y + h, r); hud.arcTo(x, y + h, x, y, r); hud.arcTo(x, y, x + w, y, r); hud.closePath(); }
function pad(r, label, on) { if (!r) return; hud.fillStyle = on ? 'rgba(255,210,58,.35)' : 'rgba(10,16,40,.45)'; rrect(r.x, r.y, r.w, r.h, 12); hud.fill(); hud.strokeStyle = 'rgba(255,243,220,.5)'; hud.lineWidth = 1.5; hud.stroke(); otext(label, r.x + r.w / 2, r.y + r.h / 2 + 6, 15, '#fff3dc', { family: '"Noto Sans TC",sans-serif' }, 'center', '#0a1028', 2); }
function drawHud() {
  const W = innerWidth, H = innerHeight, C = CAR; hud.clearRect(0, 0, W, H);
  if (!HUD.show) return;
  // speed and gear, bottom centre-right
  otext(String(Math.round(C.kmh)), W * 0.5 + 60, H - 28, 44, '#ffffff', null, 'right', '#0a1028', 4); otext('km/h', W * 0.5 + 66, H - 28, 14, '#ffd23a', null, 'left', '#0a1028', 2);
  otext((C.auto ? 'AT ' : 'MT ') + C.gear, W * 0.5 - 70, H - 28, 22, '#9ad0ff', null, 'right', '#0a1028', 3);
  // the rev bar
  const r = clamp(C.rpm / C.P.red, 0, 1.05), bx = W * 0.5 - 70, by = H - 18, bw = 136; hud.fillStyle = 'rgba(0,0,0,.4)'; hud.fillRect(bx, by, bw, 6); hud.fillStyle = r > 0.92 ? '#ff4f6d' : '#7cf26a'; hud.fillRect(bx, by, bw * Math.min(1, r), 6);
  // what the tyres are doing
  if (C.slipK > 1.05) otext(C.hand > 0.5 ? '手煞車' : C.slipR > C.slipF ? '甩尾' : '推頭', W * 0.5, H - 70, 16, '#ffd23a', { family: '"Noto Sans TC",sans-serif' }, 'center', '#0a1028', 2);
  // the place and the fps, top left
  otext(MAP.name, 14, 30, 18, '#fff3dc', { family: '"Noto Sans TC",sans-serif' }, 'left', '#0a1028', 3);
  otext(G.fps + ' fps', 14, 50, 11, 'rgba(255,243,220,.7)', null, 'left', '#0a1028', 2);
  // the minimap, bottom left
  const ms = Math.min(150, H * 0.32), mx = 14, my = H - ms - 14; hud.save(); rrect(mx, my, ms, ms, 10); hud.clip(); hud.globalAlpha = 0.85; hud.drawImage(HUD.minimap, mx, my, ms, ms); hud.globalAlpha = 1;
  const k = ms / MAP.W, cx = mx + C.x * k, cz = my + C.z * k; hud.fillStyle = '#ff4f6d'; hud.beginPath(); hud.arc(cx, cz, 4, 0, TAU); hud.fill(); hud.strokeStyle = '#fff'; hud.lineWidth = 1.5; hud.beginPath(); hud.moveTo(cx, cz); hud.lineTo(cx + Math.sin(C.yaw) * 10, cz + Math.cos(C.yaw) * 10); hud.stroke(); hud.restore();
  // messages
  let y = H * 0.3; for (const m of HUD.msgs) { hud.globalAlpha = m.t < 0.15 ? m.t / 0.15 : m.t > m.dur - 0.3 ? (m.dur - m.t) / 0.3 : 1; otext(m.text, W / 2, y, 30, m.col, { family: '"Noto Sans TC",sans-serif' }, 'center', '#0a1028', 4); if (m.sub) otext(m.sub, W / 2, y + 24, 15, '#fff3dc', { family: '"Noto Sans TC",sans-serif' }, 'center', '#0a1028', 2); hud.globalAlpha = 1; y += 60; }
  // the pads
  if (IS_TOUCH) { const P = CTL.pads, T = [...CTL.touches.values()]; pad(P.gas, '油門', T.some((t) => t.kind === 'gas')); pad(P.brake, '煞車', T.some((t) => t.kind === 'brake')); pad(P.hand, '手煞車', T.some((t) => t.kind === 'hand')); if (!C.auto) { pad(P.up, '▲ 升檔', false); pad(P.dn, '▼ 降檔', false); } if (P.steer) { pad(P.steer, '← 滑動轉向 →', false); } }
  pad(CTL.pads.view, CAMV.fp ? '座艙' : '車後', false); pad(CTL.pads.pause, '∥', false); pad(CTL.pads.horn, '喇叭', false);
  if (CAMV.fp) drawCockpit();
}
// the driver's seat: the dash across the bottom, the wheel turning with the steering, the gauges
function drawCockpit() {
  const W = innerWidth, H = innerHeight, C = CAR, col = cssHex(C.spec.interior || 0x2a2a2a), dh = H * 0.26;
  hud.fillStyle = col; hud.beginPath(); hud.moveTo(0, H); hud.lineTo(0, H - dh * 0.7); hud.quadraticCurveTo(W * 0.5, H - dh * 1.25, W, H - dh * 0.7); hud.lineTo(W, H); hud.closePath(); hud.fill();
  hud.fillStyle = 'rgba(0,0,0,.35)'; hud.fillRect(0, H - dh * 0.72, W, 3);
  // the wheel
  const wx = W * 0.42, wy = H - dh * 0.12, R = Math.min(W, H) * 0.19; hud.save(); hud.translate(wx, wy); hud.rotate(C.steer * 2.6); hud.strokeStyle = '#1a1a1e'; hud.lineWidth = R * 0.16; hud.beginPath(); hud.arc(0, 0, R, 0, TAU); hud.stroke(); hud.lineWidth = R * 0.1; hud.beginPath(); hud.moveTo(-R, 0); hud.lineTo(R, 0); hud.moveTo(0, 0); hud.lineTo(0, R); hud.stroke(); hud.fillStyle = cssHex(C.spec.color); hud.beginPath(); hud.arc(0, 0, R * 0.18, 0, TAU); hud.fill(); hud.restore();
  // gauges
  const gauge = (x, y, r, val, red, label) => { hud.strokeStyle = '#111'; hud.lineWidth = 3; hud.beginPath(); hud.arc(x, y, r, 0, TAU); hud.stroke(); hud.fillStyle = '#0c0c10'; hud.fill(); for (let i = 0; i <= 10; i++) { const a = Math.PI * 0.75 + (i / 10) * Math.PI * 1.5; hud.strokeStyle = i >= red ? '#ff4f6d' : '#ddd'; hud.lineWidth = 2; hud.beginPath(); hud.moveTo(x + Math.cos(a) * r * 0.8, y + Math.sin(a) * r * 0.8); hud.lineTo(x + Math.cos(a) * r * 0.92, y + Math.sin(a) * r * 0.92); hud.stroke(); } const a = Math.PI * 0.75 + clamp(val, 0, 1) * Math.PI * 1.5; hud.strokeStyle = '#ff8a3a'; hud.lineWidth = 3; hud.beginPath(); hud.moveTo(x, y); hud.lineTo(x + Math.cos(a) * r * 0.85, y + Math.sin(a) * r * 0.85); hud.stroke(); otext(label, x, y + r * 0.6, 10, '#aaa', null, 'center', '#000', 1); };
  gauge(W * 0.42 - R * 1.7, H - dh * 0.45, R * 0.45, C.rpm / C.P.red, 9, 'rpm'); gauge(W * 0.42 + R * 1.7, H - dh * 0.45, R * 0.45, C.kmh / 320, 11, 'km/h');
}
// ---------- test hooks ----------
window.__kh = {
  G, CAR, CAMV, CTL, MAP, PROPS, R3, SET, CARS, startDrive, carToRoad, show, carPhysics,
  halt(on) { G.halt = !!on; }, sim(sec, h) { h = h || 1 / 120; const n = Math.round(sec / h); for (let i = 0; i < n; i++) tick(h); return this.state(); },
  step(dt) { tick(dt); render(dt); return $('gl').toDataURL('image/png'); },
  state() { const C = CAR; return { x: +C.x.toFixed(1), z: +C.z.toFixed(1), yaw: +C.yaw.toFixed(2), kmh: Math.round(C.kmh), vy: +C.vy.toFixed(2), r: +C.r.toFixed(2), rpm: Math.round(C.rpm), gear: C.gear, surf: C.surface, slip: +C.slipK.toFixed(2), dmg: +C.damage.toFixed(2), fps: G.fps }; },
};
