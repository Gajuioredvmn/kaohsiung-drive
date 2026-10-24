// ===================== controls: tilt or a slider for the wheel, pedals on the right, a drag to swing the camera =====================
const IS_TOUCH = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
const CTL = { keys: {}, touches: new Map(), mode: 'touch', tilt: { ok: false, asked: false, theta: 0, zero: 0, last: 0, raw: 0 }, pads: {}, steerT: 0, sens: 22, hand: 0, horn: 0 };
function layoutPads() {
  const W = innerWidth, H = innerHeight, pw = Math.min(150, W * 0.14), ph = Math.min(H * 0.56, 270);
  CTL.pads.gas = { x: W - pw - 16, y: H - ph - 18, w: pw, h: ph };
  CTL.pads.brake = { x: W - pw * 2 - 30, y: H - ph * 0.72 - 18, w: pw, h: ph * 0.72 };
  CTL.pads.hand = { x: W - pw * 2 - 30, y: H - ph - 18 - 62, w: pw * 2 + 14, h: 52 };
  CTL.pads.view = { x: W - 64, y: 36, w: 52, h: 40 }; CTL.pads.pause = { x: W - 126, y: 36, w: 52, h: 40 }; CTL.pads.horn = { x: W - 188, y: 36, w: 52, h: 40 }; CTL.pads.zero = CTL.mode === 'tilt' ? { x: W - 262, y: 36, w: 64, h: 40 } : null;
  // the slider for the wheel: the left half in touch mode; a smaller strip in tilt mode, as a stand-in when the sensor misbehaves
  CTL.pads.steer = CTL.mode === 'tilt' ? { x: 14, y: H - 96, w: Math.min(260, W * 0.3), h: 82 } : { x: 0, y: H * 0.5, w: W * 0.42, h: H * 0.5 };
  CTL.pads.up = { x: 18, y: H * 0.2, w: 110, h: 70 }; CTL.pads.dn = { x: 18, y: H * 0.2 + 82, w: 110, h: 70 };
}
const inR = (r, x, y) => r && x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
function godTouch(kind, id, x, y) {
  const A = AERIAL, T = A.touches || (A.touches = new Map());
  if (kind === 'down') { T.set(id, { x, y, x0: x, y0: y }); A.pinch0 = null; return; }
  if (kind === 'up') { T.delete(id); A.pinch0 = null; return; }
  const t = T.get(id); if (!t) return;
  if (T.size >= 2) {
    const [a, b] = [...T.values()]; const d = Math.hypot(a.x - b.x, a.y - b.y) || 1;
    if (id === [...T.keys()][0]) { t.x = x; t.y = y; } else { t.x = x; t.y = y; }
    const d2 = Math.hypot(a.x - b.x, a.y - b.y) || 1;
    if (A.pinch0 == null) A.pinch0 = d; else { A.dist = clamp(A.dist * (d / d2), 160, 7000); }
    return;
  }
  const dx = x - t.x, dy = y - t.y; t.x = x; t.y = y;
  const k = A.dist / innerHeight * 1.4, s = Math.sin(A.az), c = Math.cos(A.az);
  A.lookX -= (dx * c - dy * s) * k; A.lookZ -= (-dx * s - dy * c) * k;
  A.lookX = clamp(A.lookX, 0, MAP.W); A.lookZ = clamp(A.lookZ, 0, MAP.W);
}
function touchDown(id, x, y) {
  if (G.mode === 'god') { godTouch('down', id, x, y); return; }
  if (G.mode !== 'drive' || G.paused) return;
  const P = CTL.pads;
  if (inR(P.pause, x, y)) { onPausePressed(); return; }
  if (inR(P.view, x, y)) { camCycle(); return; }
  if (inR(P.horn, x, y)) { CTL.touches.set(id, { kind: 'horn' }); sfxHorn(); return; }
  if (inR(P.zero, x, y)) { tiltRecenter(); hudMsg('方向盤歸零', null, '#7cf26a', 1); return; }
  if (inR(P.gas, x, y)) { CTL.touches.set(id, { kind: 'gas' }); return; }
  if (inR(P.brake, x, y)) { CTL.touches.set(id, { kind: 'brake' }); return; }
  if (inR(P.hand, x, y)) { CTL.touches.set(id, { kind: 'hand' }); return; }
  if (!CAR.auto) { if (inR(P.up, x, y)) { carShift(CAR.gear + 1); return; } if (inR(P.dn, x, y)) { carShift(CAR.gear - 1); return; } }
  if (inR(P.steer, x, y)) { CTL.touches.set(id, { kind: 'steer', x0: x }); return; }
  // the camera swings only for a deliberate drag across the top of the screen; a thumb resting lower down does nothing
  if (y < innerHeight * 0.34 && x > innerWidth * 0.3 && x < innerWidth * 0.64) { CTL.touches.set(id, { kind: 'cam', x0: x, last: x, moved: 0 }); return; }
  CTL.touches.set(id, { kind: 'rest' });
}
function touchMove(id, x, y) { if (G.mode === 'god') { godTouch('move', id, x, y); return; } const t = CTL.touches.get(id); if (!t) return; if (t.kind === 'steer') t.x = x; if (t.kind === 'cam') { t.moved += Math.abs(x - t.last); if (t.moved > 24) { CAMV.off = clamp(CAMV.off + (x - t.last) * 0.0045, -2.6, 2.6); CAMV.dragging = true; } t.last = x; } }
function touchUp(id) { if (G.mode === 'god') { godTouch('up', id); return; } const t = CTL.touches.get(id); CTL.touches.delete(id); if (t && t.kind === 'cam' && ![...CTL.touches.values()].some((q) => q.kind === 'cam')) CAMV.dragging = false; }
const glEl = $('gl');
glEl.addEventListener('pointerdown', (e) => { if (e.pointerType === 'mouse' && e.button !== 0) return; glEl.setPointerCapture && glEl.setPointerCapture(e.pointerId); touchDown(e.pointerId, e.clientX, e.clientY); e.preventDefault(); });
glEl.addEventListener('pointermove', (e) => touchMove(e.pointerId, e.clientX, e.clientY));
glEl.addEventListener('pointerup', (e) => touchUp(e.pointerId)); glEl.addEventListener('pointercancel', (e) => touchUp(e.pointerId));
glEl.addEventListener('wheel', (e) => { if (G.mode === 'god') { AERIAL.dist = clamp(AERIAL.dist * (e.deltaY > 0 ? 1.15 : 0.87), 160, 7000); e.preventDefault(); } }, { passive: false });
addEventListener('keydown', (e) => {
  CTL.keys[e.code] = true;
  if (G.mode === 'drive') {
    if (e.code === 'KeyC' || e.code === 'KeyV') camCycle();
    if (e.code === 'KeyH') sfxHorn();
    if (e.code === 'KeyR') carToRoad();
    if (!CAR.auto) { if (e.code === 'KeyE' || e.code === 'ShiftLeft') carShift(CAR.gear + 1); if (e.code === 'KeyQ' || e.code === 'ControlLeft') carShift(CAR.gear - 1); }
    if (e.code === 'Escape' || e.code === 'KeyP') onPausePressed();
  }
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
});
addEventListener('keyup', (e) => { CTL.keys[e.code] = false; });
// ---------- tilt: the phone held in landscape and turned like a steering wheel (gravity from the motion sensor) ----------
function tiltAngle(ax, ay) {
  let ang = (screen.orientation && typeof screen.orientation.angle === 'number') ? screen.orientation.angle : (typeof window.orientation === 'number' ? window.orientation : null);
  // no orientation API (some WebViews): in landscape the gravity runs along the phone's long axis, and its sign says which way round
  if (ang == null || (innerWidth > innerHeight && ang === 0)) ang = innerWidth > innerHeight ? (ax < 0 ? 90 : 270) : 0;
  let r, u; if (ang === 90) { r = -ay; u = ax; } else if (ang === 270 || ang === -90) { r = ay; u = -ax; } else { r = ax; u = ay; }
  if (u < 0) { u = -u; r = -r; }   // the phone the other way up than the mapping expects: never let the angle sit at ±180 where it flips
  return Math.atan2(r, u) / D2R;
}
function onMotion(e) {
  const a = e.accelerationIncludingGravity; if (!a || a.x == null) return;
  const th = tiltAngle(a.x, a.y);
  CTL.tilt.raw = th; CTL.tilt.theta = lerp(CTL.tilt.theta || th, th, 0.35); CTL.tilt.last = performance.now();
  if (!CTL.tilt.ok) { CTL.tilt.ok = true; CTL.tilt.zero = th; if (SET.ctrl === 'tilt') { CTL.mode = 'tilt'; layoutPads(); } }
}
async function tiltInit() {
  if (CTL.tilt.asked) return; CTL.tilt.asked = true;
  try { if (typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function') { const r = await DeviceMotionEvent.requestPermission(); if (r !== 'granted') return; } } catch (e) { return; }
  addEventListener('devicemotion', onMotion);
}
function tiltRecenter() { CTL.tilt.zero = CTL.tilt.raw; CTL.tilt.theta = CTL.tilt.raw; }
addEventListener('orientationchange', () => setTimeout(tiltRecenter, 600));
function controlsUpdate(dt) {
  const K = CTL.keys, C = CAR;
  let steer = 0, gas = 0, brake = 0, hand = 0;
  if (K.ArrowLeft || K.KeyA) steer -= 1; if (K.ArrowRight || K.KeyD) steer += 1;
  if (K.ArrowUp || K.KeyW || K.KeyZ) gas = 1; if (K.ArrowDown || K.KeyS || K.KeyX) brake = 1; if (K.Space) hand = 1;
  for (const t of CTL.touches.values()) { if (t.kind === 'gas') gas = 1; if (t.kind === 'brake') brake = 1; if (t.kind === 'hand') hand = 1; if (t.kind === 'steer' && t.x != null) steer = clamp((t.x - t.x0) / 90, -1, 1); }
  const tiltLive = CTL.mode === 'tilt' && CTL.tilt.ok && performance.now() - CTL.tilt.last < 600;
  if (tiltLive && ![...CTL.touches.values()].some((t) => t.kind === 'steer')) { const d = -(CTL.tilt.theta - CTL.tilt.zero); steer = Math.abs(d) < 1.2 ? 0 : clamp((d - Math.sign(d) * 1.2) / CTL.sens, -1, 1); }
  // the sensor has gone quiet: say so once, and point at the slider
  if (CTL.mode === 'tilt' && !tiltLive && G.mode === 'drive' && G.t > 2) { CTL.tiltDead = (CTL.tiltDead || 0) + dt; if (CTL.tiltDead > 1.5 && !CTL.tiltWarned) { CTL.tiltWarned = true; hudMsg('陀螺儀沒有訊號', '請用左下角的滑桿轉向，或到設定改成觸控', '#ffd23a', 4); } } else CTL.tiltDead = 0;
  // the wheel on a keyboard moves at a finite rate, so a tap is a nudge and a hold is full lock
  const analog = CTL.mode === 'tilt' && CTL.tilt.ok || [...CTL.touches.values()].some((t) => t.kind === 'steer');
  if (analog) CTL.steerT = steer; else { const rate = (K.ArrowLeft || K.ArrowRight || K.KeyA || K.KeyD) ? 3.5 : 8; CTL.steerT += clamp(steer - CTL.steerT, -rate * dt, rate * dt); }
  C.steerIn = CTL.steerT; C.throttle = gas; C.brake = brake; C.hand = hand;
}
// back onto the nearest road, facing along it: for when the car ends up in the harbour or wedged somewhere
function carToRoad() { const n = nearestRoad(CAR.x, CAR.z, CAR.y); if (!n) return; const rx_ = Math.cos(n.yaw), rz_ = -Math.sin(n.yaw); CAR.x = n.x + rx_ * n.e.w * 0.25; CAR.z = n.z + rz_ * n.e.w * 0.25; CAR.yaw = n.yaw; CAR.y = groundH(CAR.x, CAR.z, CAR.y); CAR.vx = CAR.vy = CAR.r = 0; camReset(); }

// the three views in turn: over the shoulder → the seat → the high HD-2D angle
function camCycle() { const order = ['chase', 'cockpit', 'high']; CAMV.view = order[(order.indexOf(CAMV.view) + 1) % 3]; CAMV.fp = CAMV.view === 'cockpit'; }
