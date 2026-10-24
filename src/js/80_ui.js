// ===================== screens: title, the showroom, settings, pause =====================
const UI = { scr: 'title', sel: 0, turnRaf: 0, turnT: 0, unlocked: false };
const STAT_ROWS = [['極速', (c) => c.top / 340, (c) => c.top + ' km/h'], ['加速', (c) => c.acc, null], ['抓地', (c) => c.grip, null], ['操控', (c) => c.steer, null], ['車重', (c) => c.mass, (c) => Math.round(carPhysics(c).m) + ' kg']];
const ENGINE_NAME = { v12: 'V12', v8: 'V8', i6: '直列六缸', i4: '直列四缸', flat6: '水平對臥六缸', turbo: '渦輪增壓' };
const DRIVE_NAME = { rwd: '後輪驅動', fwd: '前輪驅動', awd: '四輪驅動' };
function h(html) { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstChild; }
function uiInit() {
  const root = $('ui');
  root.innerHTML = `
  <section class="scr" id="s-title">
    <div class="title-wrap"><div class="logo"><span class="logo-tc">港都漫遊</span><span class="logo-en">KAOHSIUNG DRIVE</span><span class="logo-yr">高雄・開放世界　HD-2D</span></div>
      <div class="tap" id="tap">點一下開始　TAP TO START</div>
      <div class="menu" id="menu" hidden><button class="btn big" data-go="select">選車出發</button><button class="btn" data-act="god">俯瞰高雄</button><button class="btn" data-go="settings">設定</button></div></div>
    <div class="foot">左右傾斜手機轉向・右手油門煞車・畫面上方左右拖曳轉鏡頭</div>
  </section>
  <section class="scr dim" id="s-select" hidden>
    <div class="sel">
      <div class="show"><canvas id="turn" width="460" height="200"></canvas><div class="badge"><span id="b-gear"></span><span id="b-eng"></span><span id="b-drv"></span></div>
        <button class="arrow l" data-act="prev">◀</button><button class="arrow r" data-act="next">▶</button></div>
      <div class="info panel"><div class="nm"><b id="c-name"></b><span id="c-en"></span></div><p class="desc" id="c-desc"></p><div class="stats" id="c-stats"></div><div class="note" id="c-money"></div></div>
      <div class="thumbs" id="thumbs"></div>
      <div class="actions"><button class="btn ghost" data-go="title">返回</button><button class="btn big" data-act="go">出發！</button></div>
    </div>
  </section>
  <section class="scr god" id="s-god" hidden><div class="godbar"><button class="btn" data-act="godback">回選單</button><button class="btn" data-act="godspin">轉一下</button></div></section>
  <section class="scr dim" id="s-settings" hidden><div class="panel card" id="settings"></div></section>
  <section class="scr dim" id="s-pause" hidden><div class="panel vmenu"><h2 class="ttl" style="text-align:center">暫停</h2><button class="btn big" data-act="resume">繼續</button><button class="btn" data-act="road">回到路上</button><button class="btn" data-act="quit">放棄任務</button><button class="btn" data-act="recenter">方向盤歸零</button><button class="btn" data-go="settings">設定</button><button class="btn ghost" data-act="title">回標題</button></div></section>`;
  document.body.appendChild(h('<div id="rot" class="need"><div style="font-size:44px">⟲</div>請把手機轉成橫向</div>'));
  root.addEventListener('click', onUiClick);
  $('s-title').addEventListener('pointerdown', unlock);
  show('title');
}
function unlock() { if (UI.unlocked) return; UI.unlocked = true; audioInit(); tiltInit(); $('tap').hidden = true; $('menu').hidden = false; }
function show(name) {
  UI.scr = name;
  for (const s of document.querySelectorAll('#ui .scr')) s.hidden = s.id !== 's-' + name;
  if (name === 'select') openSelect(); else cancelAnimationFrame(UI.turnRaf);
  if (name === 'settings') openSettings();
  $('ui').style.pointerEvents = name && name !== 'god' ? 'auto' : 'none';
}
function onUiClick(e) {
  const b = e.target.closest('button'); if (!b) return;
  if (!UI.unlocked) unlock();
  sfxUi();
  if (b.dataset.act === 'god') { aerialEnter(true); show('god'); return; }
  if (b.dataset.act === 'godback') { aerialEnter(false); show('title'); return; }
  if (b.dataset.act === 'godspin') { AERIAL.az += Math.PI / 4; return; }
  if (b.dataset.go) { if (b.dataset.go === 'title' && G.mode === 'drive') { G.mode = 'title'; engineStop(); driveEnd(); aerialEnter(false); } show(b.dataset.go); return; }
  switch (b.dataset.act) {
    case 'prev': UI.sel = (UI.sel + CARS.length - 1) % CARS.length; openSelect(); break;
    case 'next': UI.sel = (UI.sel + 1) % CARS.length; openSelect(); break;
    case 'go': startDrive(UI.sel); break;
    case 'buy': { const price = carPrice(UI.sel); if (PRO.money >= price) { PRO.money -= price; PRO.owned.push(CARS[UI.sel].id); saveProgress(); sfxChime(); openSelect(); } break; }
    case 'quit': cancelJob(); onPausePressed(); break;
    case 'resume': onPausePressed(); break;
    case 'road': carToRoad(); onPausePressed(); break;
    case 'recenter': tiltRecenter(); onPausePressed(); break;
    case 'title': G.paused = false; engineStop(); driveEnd(); aerialEnter(false); show('title'); break;
  }
}
// ---------- the showroom ----------
function openSelect() {
  const c = CARS[UI.sel], P = carPhysics(c);
  $('c-name').textContent = c.name; $('c-en').textContent = c.en; $('c-desc').textContent = c.desc;
  $('b-gear').textContent = c.gears + ' 速'; $('b-eng').textContent = ENGINE_NAME[c.engine] || c.engine; $('b-drv').textContent = DRIVE_NAME[P.drive];
  const st = $('c-stats'); st.innerHTML = '';
  for (const [l, f, v] of STAT_ROWS) { st.appendChild(h(`<span class="l">${l}</span>`)); const b = h('<div class="bar"><i></i></div>'); b.firstChild.style.width = Math.round(clamp(f(c), 0.05, 1) * 100) + '%'; st.appendChild(b); st.appendChild(h(`<span class="v">${v ? v(c) : ''}</span>`)); }
  const th = $('thumbs'); th.innerHTML = ''; CARS.forEach((q, i) => { const d = h(`<button class="th${i === UI.sel ? ' on' : ''}${q.starter || PRO.owned.includes(q.id) ? '' : ' lock'}" style="--c:${cssHex(q.color)}" title="${q.name}"></button>`); d.onclick = () => { UI.sel = i; openSelect(); }; th.appendChild(d); });
  const owned = c.starter || PRO.owned.includes(c.id), price = carPrice(UI.sel), go = document.querySelector('#s-select button[data-act=go]');
  $('c-desc').textContent = owned ? c.desc : '（$' + price.toLocaleString() + '）' + c.desc;
  if (owned) { go.disabled = false; go.textContent = '出發！'; go.dataset.act = 'go'; } else if (PRO.money >= price) { go.disabled = false; go.textContent = '購買 $' + price.toLocaleString(); go.dataset.act = 'buy'; } else { go.disabled = true; go.textContent = '還差 $' + (price - PRO.money).toLocaleString(); go.dataset.act = 'go'; }
  $('c-money').textContent = '$ ' + PRO.money.toLocaleString() + '　完成 ' + PRO.jobs + ' 件任務';
  if (!UI.turnRaf) turnLoop();
}
function turnLoop() {
  UI.turnRaf = 0; if (UI.scr !== 'select') return; UI.turnRaf = requestAnimationFrame(turnLoop);
  const spec = CARS[UI.sel], cv = $('turn'), g2 = cv.getContext('2d'); UI.turnT += 1 / 60; const t = UI.turnT;
  g2.imageSmoothingEnabled = false; g2.clearRect(0, 0, cv.width, cv.height);
  const W = cv.width, H = cv.height, fy = H - 30, tx = W / 2, ty = fy + 4;
  g2.fillStyle = 'rgba(10,6,24,.55)'; g2.fillRect(0, fy, W, H - fy);
  g2.fillStyle = 'rgba(40,30,70,.9)'; g2.beginPath(); g2.ellipse(tx, ty, 150, 20, 0, 0, TAU); g2.fill();
  for (let k = 0; k < 24; k++) { const a = (k / 24) * TAU + t * 1.2, lit = (k + Math.floor(t * 6)) % 3 === 0; g2.fillStyle = lit ? '#ffd23a' : '#5a4a8a'; g2.fillRect(Math.round(tx + Math.cos(a) * 150) - 2, Math.round(ty + Math.sin(a) * 20) - 2, 4, 4); }
  const yaw = (t * (TAU / 8) + 0.55) % TAU, fi = Math.round((yaw / TAU) * TURN_N) % TURN_N, img = carTurnFrame(spec, fi);
  const k = 1.45, w = img.width * k, hgt = img.height * k, x = tx - w / 2, y = fy - TURN_OPT.gy * k;
  g2.save(); g2.beginPath(); g2.rect(0, fy, W, H - fy); g2.clip(); g2.globalAlpha = 0.2; g2.translate(0, fy * 2 + 2); g2.scale(1, -1); g2.drawImage(img, x, y, w, hgt); g2.restore();
  g2.fillStyle = 'rgba(0,0,0,.35)'; g2.beginPath(); g2.ellipse(tx, fy + 2, w * 0.3, 6, 0, 0, TAU); g2.fill();
  g2.drawImage(img, x, y, w, hgt);
}
// ---------- settings ----------
function openSettings() {
  $('settings').innerHTML = `<h2 class="ttl">設定</h2>
    <div class="row"><span class="lbl">方向盤</span><div class="seg" id="seg-ctrl"><button class="btn" data-v="tilt">陀螺儀</button><button class="btn" data-v="touch">觸控滑桿</button></div></div>
    <div class="row"><span class="lbl">變速箱</span><div class="seg" id="seg-auto"><button class="btn" data-v="1">AT 自排</button><button class="btn" data-v="0">MT 手排</button></div></div>
    <div class="row"><span class="lbl">畫質</span><div class="seg" id="seg-q"><button class="btn" data-v="high">高（景深、泛光）</button><button class="btn" data-v="low">省電</button><button class="btn" data-v="off">不要後製</button></div></div>
    <div class="row"><span class="lbl">任務招牌</span><div class="seg" id="seg-jobs"><button class="btn" data-v="1">顯示</button><button class="btn" data-v="0">關閉（純閒晃）</button></div></div>
    <div class="row"><span class="lbl">時間</span><div class="seg" id="seg-tod"><button class="btn" data-v="day">白天</button><button class="btn" data-v="dusk">傍晚</button><button class="btn" data-v="night">夜晚</button></div></div>
    <div class="row"><span class="lbl">警察</span><div class="seg" id="seg-police"><button class="btn" data-v="1">會來抓</button><button class="btn" data-v="0">不管你</button></div></div>
    <div class="row"><span class="lbl">轉向靈敏</span><div><input class="rng" type="range" min="10" max="40" step="1" value="${SET.sens}" id="rng-sens"><div class="note">傾斜 <span id="v-sens">${SET.sens}</span>° 打滿</div></div></div>
    <div class="actions"><button class="btn" data-act="back">完成</button></div>`;
  const mark = () => { for (const [id, key] of [['seg-ctrl', 'ctrl'], ['seg-auto', 'auto'], ['seg-q', 'quality'], ['seg-jobs', 'jobs'], ['seg-police', 'police'], ['seg-tod', 'tod']]) for (const b of document.querySelectorAll('#' + id + ' .btn')) b.setAttribute('aria-pressed', String(b.dataset.v) === String(key === 'auto' || key === 'jobs' || key === 'police' ? (SET[key] ? 1 : 0) : SET[key]) ? 'true' : 'false'); };
  mark();
  $('settings').onclick = (e) => { const b = e.target.closest('button'); if (!b) return; if (b.dataset.act === 'back') { show(G.mode === 'drive' ? 'pause' : 'title'); return; } const seg = b.parentElement.id; if (seg === 'seg-ctrl') SET.ctrl = b.dataset.v; if (seg === 'seg-auto') { SET.auto = b.dataset.v === '1'; CAR.auto = SET.auto; } if (seg === 'seg-q') { SET.quality = b.dataset.v; r3Resize(); } if (seg === 'seg-jobs') SET.jobs = b.dataset.v === '1'; if (seg === 'seg-police') SET.police = b.dataset.v === '1'; if (seg === 'seg-tod') { SET.tod = b.dataset.v; if (typeof setTod === 'function') setTod(SET.tod); } saveSettings(); mark(); CTL.mode = SET.ctrl === 'tilt' && CTL.tilt.ok ? 'tilt' : 'touch'; layoutPads(); };
  $('rng-sens').oninput = (e) => { SET.sens = +e.target.value; CTL.sens = SET.sens; $('v-sens').textContent = SET.sens; saveSettings(); };
}
// the Android app's back button
window.__khBack = () => { if (G.mode === 'drive') { if (G.paused) show(null); onPausePressed(); return 'stay'; } if (!UI.scr || UI.scr === 'title') return 'exit'; show('title'); return 'stay'; };
