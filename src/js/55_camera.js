// ===================== the camera: a chase view that can be swung round the car, and the driver's seat =====================
const CAMV = { az: 0, off: 0, offV: 0, el: 26 * D2R, dist: 8.5, fp: false, dragging: false, lookX: 0, lookZ: 0, yawS: 0, shake: 0 };
function camReset() { CAMV.az = CAR.yaw; CAMV.off = 0; CAMV.yawS = CAR.yaw; CAMV.lookX = CAR.x; CAMV.lookZ = CAR.z; }
function camUpdate(dt) {
  const C = CAR, cam = R3.cam;
  // the view swings to follow the car's heading, lagging a touch, plus whatever the player has dragged it round by
  const vel = Math.hypot(C.vx, C.vy), movingYaw = vel > 2 ? Math.atan2(C.vx * Math.sin(C.yaw) + C.vy * Math.cos(C.yaw), C.vx * Math.cos(C.yaw) - C.vy * Math.sin(C.yaw)) : C.yaw;
  const want = lerp(C.yaw, movingYaw, 0.35);
  CAMV.yawS += angWrap(want - CAMV.yawS) * clamp(dt * 3.2, 0, 1);
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
  const dist = CAMV.dist + vel * 0.05, el = CAMV.el - clamp(vel / 60, 0, 1) * 3 * D2R;
  const px = C.x - Math.sin(az) * dist * Math.cos(el), pz = C.z - Math.cos(az) * dist * Math.cos(el), py = C.y + dist * Math.sin(el);
  cam.position.set(px + (Math.random() - 0.5) * sh * 0.3, py + (Math.random() - 0.5) * sh * 0.3, pz);
  const lx = C.x + Math.sin(az) * 2.5, lz = C.z + Math.cos(az) * 2.5;
  CAMV.lookX = lx; CAMV.lookZ = lz;
  cam.lookAt(lx, C.y + 1.0, lz);
  cam.fov = 46 + clamp(vel / 60, 0, 1) * 8; cam.updateProjectionMatrix();
}
