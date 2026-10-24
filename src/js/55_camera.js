// ===================== the camera: a chase view that can be swung round the car, and the driver's seat =====================
// view: 'chase' over the shoulder, 'cockpit' from the seat, 'high' the HD-2D bird's angle
const CAMV = { az: 0, off: 0, offV: 0, el: 26 * D2R, dist: 8.5, fp: false, view: 'chase', dragging: false, lookX: 0, lookZ: 0, yawS: 0, shake: 0 };
function camReset() { CAMV.az = CAR.yaw; CAMV.off = 0; CAMV.yawS = CAR.yaw; CAMV.lookX = CAR.x; CAMV.lookZ = CAR.z; }
function camUpdate(dt) {
  const C = CAR, cam = R3.cam;
  // the view swings to follow the car's heading, lagging a touch, plus whatever the player has dragged it round by
  // (the heading and the direction of travel are blended as a wrapped difference, never across the ±180° seam, and a
  // car backing up keeps the view over its nose rather than swinging round)
  const vel = Math.hypot(C.vx, C.vy), movingYaw = vel > 2 && C.vx > 0 ? Math.atan2(C.vx * Math.sin(C.yaw) + C.vy * Math.cos(C.yaw), C.vx * Math.cos(C.yaw) - C.vy * Math.sin(C.yaw)) : C.yaw;
  const want = C.yaw + clamp(angWrap(movingYaw - C.yaw), -0.8, 0.8) * (CAMV.view === 'high' ? 0.25 : 0.1);
  CAMV.yawS += angWrap(want - CAMV.yawS) * clamp(dt * (CAMV.view === 'high' ? 3.2 : 6), 0, 1);
  if (!CAMV.dragging) { CAMV.off += (0 - CAMV.off) * clamp(dt * 1.2, 0, 1); }
  const az = CAMV.yawS + CAMV.off; CAMV.az = az;
  if (CAMV.shake > 0) CAMV.shake -= dt * 2;
  const sh = CAMV.shake > 0 ? CAMV.shake : 0;
  if (CAMV.fp) {
    const sy = Math.sin(C.yaw), cy = Math.cos(C.yaw), rx = cy, rz = -sy;
    const seat = 0.35;   // the driver sits a little left of the centreline
    const px = C.x - sy * 0.2 - rx * seat, pz = C.z - cy * 0.2 - rz * seat, py = C.y + 1.15 + Math.sin(G.t * 40) * sh * 0.03;
    cam.position.set(px, py, pz);
    const look = C.yaw + CAMV.off * 0.6;
    cam.lookAt(px + Math.sin(look) * 20, py - 0.4, pz + Math.cos(look) * 20);
    cam.fov = 60; cam.updateProjectionMatrix();
    return;
  }
  const high = CAMV.view === 'high';
  let dist = (high ? 8.5 : 6.2) + vel * (high ? 0.05 : 0.04); const el = (high ? 26 : 13) * D2R - clamp(vel / 60, 0, 1) * 3 * D2R;
  // the camera is pulled in when a building stands between it and the car
  const lx0 = C.x, lz0 = C.z, ly0 = C.y + 1.2; let clip = 1;
  for (let t = 1; t > 0.25; t -= 0.06) { const sx = lx0 - Math.sin(az) * dist * Math.cos(el) * t, sz = lz0 - Math.cos(az) * dist * Math.cos(el) * t, syy = ly0 + dist * Math.sin(el) * t; if (solidAt(sx, syy, sz, 0.4)) clip = t - 0.06; }
  CAMV.clip = CAMV.clip == null ? clip : CAMV.clip + (clip - CAMV.clip) * clamp(dt * (clip < CAMV.clip ? 14 : 3), 0, 1);
  dist *= Math.max(0.25, CAMV.clip);
  const px = C.x - Math.sin(az) * dist * Math.cos(el), pz = C.z - Math.cos(az) * dist * Math.cos(el), py = C.y + dist * Math.sin(el);
  cam.position.set(px + (Math.random() - 0.5) * sh * 0.3, py + (Math.random() - 0.5) * sh * 0.3, pz);
  const lx = C.x + Math.sin(az) * 2.5, lz = C.z + Math.cos(az) * 2.5;
  CAMV.lookX = lx; CAMV.lookZ = lz;
  cam.lookAt(lx, C.y + (high ? 1.0 : 1.3), lz);
  cam.fov = (high ? 46 : 52) + clamp(vel / 60, 0, 1) * 8; cam.updateProjectionMatrix();
}
