// ===================== the law: heat from bad driving, stars, and the police cars that come after you =====================
// Hitting cars and people, running the lights and racing along the pavement all raise the heat; the heat decays when
// you behave. Stars come with heat; each star puts a patrol car on your tail. They drive fast, ignore the lights and
// ram. Lose them (far away for a while, or the heat gone) and the stars go. Get wrecked and you are stopped: a fine.
const WANT = { heat: 0, stars: 0, cops: [], calm: 0, farT: 0, siren: 0, lastRed: null };
function heatUp(k, why) { if (!SET.police) return; WANT.heat = Math.min(200, WANT.heat + k); WANT.calm = 0; const st = WANT.heat > 130 ? 3 : WANT.heat > 70 ? 2 : WANT.heat > 30 ? 1 : 0; if (st > WANT.stars) { WANT.stars = st; hudMsg('通緝 ' + '★'.repeat(st), why, '#ff4f6d', 2); sfxWarn(); } }
function onTrafficHit(v) { if (v.cop) return; const into = Math.hypot(CAR.vx, CAR.vy); if (into > 4) heatUp(6 + into * 0.8, '撞到車'); }
function wantedTick(dt) {
  const C = CAR, P = plr();
  if (!SET.police) { if (WANT.stars || WANT.cops.length) { WANT.stars = 0; WANT.heat = 0; for (const c of WANT.cops) { const i = TR.veh.indexOf(c); if (i >= 0) retire(c, i); } WANT.cops.length = 0; sirenUpdate(0, 1); } return; }
  // the sins of the moment
  if (!HERO.on && C.surface === GK.walk && C.kmh > 30) heatUp(2.5 * dt, '在人行道上飆車');
  const n = HERO.on ? null : nearestRoad(C.x, C.z, C.y);
  if (n && n.e && C.kmh > 25) {
    // through a red light: crossing into a lit junction's box while the light for our approach is red
    for (const nd of [n.e.a, n.e.b]) if (nd.lit && Math.hypot(nd.x - C.x, nd.z - C.z) < 14) {
      if (WANT.lastRed !== nd) { const o = nd.out.find((q) => q.e === n.e); const a0 = nd.out[0].ang, dAng = Math.abs(angWrap(o.ang - a0)), phase = (dAng < Math.PI / 4 || dAng > 3 * Math.PI / 4) ? 0 : 1; WANT.lastRed = nd; if (signalState(nd, phase) === 'red') heatUp(10, '闖紅燈'); }
    }
  }
  WANT.calm += dt; if (WANT.calm > 6) WANT.heat = Math.max(0, WANT.heat - (WANT.stars ? 2.5 : 6) * dt);
  // the patrols
  const want = WANT.stars, r = _trr;
  WANT.cops = WANT.cops.filter((c) => TR.veh.includes(c));
  while (WANT.cops.length < want) { const c = spawnCop(r); if (!c) break; WANT.cops.push(c); }
  if (want === 0 && WANT.cops.length) { for (const c of WANT.cops) { const i = TR.veh.indexOf(c); if (i >= 0) retire(c, i); } WANT.cops.length = 0; }
  // losing them, or the heat running out
  let near = 1e9; for (const c of WANT.cops) near = Math.min(near, Math.hypot(c.x - P.x, c.z - P.z));
  // on foot with a patrol car pulled up beside: caught
  if (HERO.on && WANT.stars) { let close = false; for (const c of WANT.cops) if (Math.hypot(c.x - P.x, c.z - P.z) < 7 && c.v < 3) close = true; WANT.footT = close ? (WANT.footT || 0) + dt : 0; if (WANT.footT > 1.6) { WANT.footT = 0; bust(); return; } }
  if (WANT.stars) { if (near > 330) WANT.farT += dt; else WANT.farT = 0; if (WANT.farT > 12 || WANT.heat <= 0) { WANT.stars = 0; WANT.heat = 0; WANT.farT = 0; hudMsg('甩掉警察了', null, '#7cf26a', 2); sfxChime(); } }
  const st = WANT.heat > 130 ? 3 : WANT.heat > 70 ? 2 : WANT.heat > 30 ? 1 : 0; if (st < WANT.stars && WANT.heat <= 0) WANT.stars = 0;
  // the siren, louder the nearer
  sirenUpdate(WANT.cops.length ? clamp(1 - near / 260, 0, 1) : 0, dt);
  // wrecked under pursuit: pulled over
  if (WANT.stars && !HERO.on && C.damage >= 1) bust();
}
function bust() { const fine = Math.min(PRO.money, Math.max(300, Math.round(PRO.money * 0.1 / 100) * 100)); PRO.money -= fine; saveProgress(); const onFoot = HERO.on; if (onFoot) { HERO.on = false; HERO.go = null; } hudMsg(onFoot ? '被警察抓到了' : '被警察攔下來了', '罰款 $' + fine.toLocaleString() + '，車子拖去修好了', '#ff4f6d', 4); CAR.broken = false; if (AU.ctx) engineStart(CAR.spec.engine); WANT.stars = 0; WANT.heat = 0; for (const c of WANT.cops) { const i = TR.veh.indexOf(c); if (i >= 0) retire(c, i); } WANT.cops.length = 0; CAR.damage = 0; cancelJob(); carToRoad(); sirenUpdate(0, 1); }
function wantedHud(W, H) { if (!WANT.stars) return; const s = '★'.repeat(WANT.stars) + '☆'.repeat(3 - WANT.stars); otext(s, W - 14, 122, 22, Math.floor(G.t * 4) % 2 ? '#ff4f6d' : '#ffd23a', null, 'right', '#0a1028', 3); }
