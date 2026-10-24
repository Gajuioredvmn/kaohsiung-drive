// ===================== controls: tilt or a slider for the wheel, pedals on the right, a drag to swing the camera =====================
const IS_TOUCH = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
const CTL = { keys: {}, touches: new Map(), mode: 'touch', tilt: { ok: false, g: 0, zero: 0 }, pads: {}, steerT: 0, sens: 22, hand: 0, horn: 0 };
function layoutPads() {
  const W = innerWidth, H = innerHeight, pw = Math.min(118, W * 0.11), ph = Math.min(H * 0.5, 220);
  CTL.pads.gas = { x: W - pw - 18, y: H - ph - 22, w: pw, h: ph };
  CTL.pads.brake = { x: W - pw * 2 - 34, y: H - ph * 0.72 - 22, w: pw, h: ph * 0.72 };
  CTL.pads.hand = { x: W - pw * 2 - 34, y: H - ph - 22 - 60, w: pw * 2 + 16, h: 48 };
  CTL.pads.view = { x: W - 64, y: 36, w: 52, h: 40 }; CTL.pads.pause = { x: W - 126, y: 36, w: 52, h: 40 }; CTL.pads.horn = { x: W - 188, y: 36, w: 52, h: 40 };
  CTL.pads.steer = CTL.mode === 'tilt' ? null : { x: 0, y: H * 0.5, w: W * 0.42, h: H * 0.5 };
  CTL.pads.up = { x: 18, y: H * 0.2, w: 110, h: 70 }; CTL.pads.dn = { x: 18, y: H * 0.2 + 82, w: 110, h: 70 };
}
const inR = (r, x, y) => r && x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
function touchDown(id, x, y) {
  if (G.mode !== 'drive' || G.paused) return;
  const P = CTL.pads;
  if (inR(P.pause, x, y)) { onPausePressed(); return; }
  if (inR(P.view, x, y)) { CAMV.fp = !CAMV.fp; return; }
  if (inR(P.horn, x, y)) { CTL.touches.set(id, { kind: 'horn' }); sfxHorn(); return; }
  if (inR(P.gas, x, y)) { CTL.touches.set(id, { kind: 'gas' }); return; }
  if (inR(P.brake, x, y)) { CTL.touches.set(id, { kind: 'brake' }); return; }
  if (inR(P.hand, x, y)) { CTL.touches.set(id, { kind: 'hand' }); return; }
  if (!CAR.auto) { if (inR(P.up, x, y)) { carShift(CAR.gear + 1); return; } if (inR(P.dn, x, y)) { carShift(CAR.gear - 1); return; } }
  if (inR(P.steer, x, y)) { CTL.touches.set(id, { kind: 'steer', x0: x }); return; }
  CTL.touches.set(id, { kind: 'cam', x0: x, last: x }); CAMV.dragging = true;
}
function touchMove(id, x, y) { const t = CTL.touches.get(id); if (!t) return; if (t.kind === 'steer') t.x = x; if (t.kind === 'cam') { CAMV.off += (x - t.last) * 0.008; t.last = x; } }
function touchUp(id) { const t = CTL.touches.get(id); CTL.touches.delete(id); if (t && t.kind === 'cam' && ![...CTL.touches.values()].some((q) => q.kind === 'cam')) CAMV.dragging = false; }
const glEl = $('gl');
glEl.addEventListener('pointerdown', (e) => { if (e.pointerType === 'mouse' && e.button !== 0) return; glEl.setPointerCapture && glEl.setPointerCapture(e.pointerId); touchDown(e.pointerId, e.clientX, e.clientY); e.preventDefault(); });
glEl.addEventListener('pointermove', (e) => touchMove(e.pointerId, e.clientX, e.clientY));
glEl.addEventListener('pointerup', (e) => touchUp(e.pointerId)); glEl.addEventListener('pointercancel', (e) => touchUp(e.pointerId));
addEventListener('keydown', (e) => {
  CTL.keys[e.code] = true;
  if (G.mode === 'drive') {
    if (e.code === 'KeyC' || e.code === 'KeyV') CAMV.fp = !CAMV.fp;
    if (e.code === 'KeyH') sfxHorn();
    if (e.code === 'KeyR') carToRoad();
    if (!CAR.auto) { if (e.code === 'KeyE' || e.code === 'ShiftLeft') carShift(CAR.gear + 1); if (e.code === 'KeyQ' || e.code === 'ControlLeft') carShift(CAR.gear - 1); }
    if (e.code === 'Escape' || e.code === 'KeyP') onPausePressed();
  }
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
});
addEventListener('keyup', (e) => { CTL.keys[e.code] = false; });
// tilt: the phone's roll becomes the wheel; asked for on the first tap (iOS wants a gesture)
function tiltInit() {
  const on = () => { addEventListener('deviceorientation', (e) => { const land = Math.abs(innerWidth > innerHeight ? 1 : 0); let g = e.beta == null ? 0 : (land ? e.beta : e.gamma); if (land && (screen.orientation && /secondary/.test(screen.orientation.type))) g = -g; CTL.tilt.g = g; CTL.tilt.ok = true; }); };
  if (window.DeviceOrientationEvent && typeof DeviceOrientationEvent.requestPermission === 'function') DeviceOrientationEvent.requestPermission().then((r) => { if (r === 'granted') on(); }).catch(() => {}); else on();
}
function controlsUpdate(dt) {
  const K = CTL.keys, C = CAR;
  let steer = 0, gas = 0, brake = 0, hand = 0;
  if (K.ArrowLeft || K.KeyA) steer -= 1; if (K.ArrowRight || K.KeyD) steer += 1;
  if (K.ArrowUp || K.KeyW || K.KeyZ) gas = 1; if (K.ArrowDown || K.KeyS || K.KeyX) brake = 1; if (K.Space) hand = 1;
  for (const t of CTL.touches.values()) { if (t.kind === 'gas') gas = 1; if (t.kind === 'brake') brake = 1; if (t.kind === 'hand') hand = 1; if (t.kind === 'steer' && t.x != null) steer = clamp((t.x - t.x0) / 90, -1, 1); }
  if (CTL.mode === 'tilt' && CTL.tilt.ok && ![...CTL.touches.values()].some((t) => t.kind === 'steer')) steer = clamp((CTL.tilt.g - CTL.tilt.zero) / CTL.sens, -1, 1);
  // the wheel on a keyboard moves at a finite rate, so a tap is a nudge and a hold is full lock
  const rate = (K.ArrowLeft || K.ArrowRight || K.KeyA || K.KeyD) ? 3.5 : 8;
  CTL.steerT += clamp(steer - CTL.steerT, -rate * dt, rate * dt);
  C.steerIn = CTL.steerT; C.throttle = gas; C.brake = brake; C.hand = hand;
}
// back onto the nearest road, facing along it: for when the car ends up in the harbour or wedged somewhere
function carToRoad() { const n = nearestRoad(CAR.x, CAR.z); if (!n) return; CAR.x = n.x; CAR.z = n.z; CAR.yaw = n.yaw; CAR.vx = CAR.vy = CAR.r = 0; camReset(); }
