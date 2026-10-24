// ===================== sound: a synthesized engine for each car, tyres, wind, crashes, UI =====================
const AU = { ctx: null, master: null, sfx: null, music: null, eng: null, on: true, vol: { music: 0.6, sfx: 0.9 }, noise: null };
function audioInit() {
  if (AU.ctx) { if (AU.ctx.state === 'suspended') AU.ctx.resume(); return; }
  const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
  const ctx = new AC(); AU.ctx = ctx;
  AU.master = ctx.createGain(); AU.master.gain.value = 0.9;
  const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 4; comp.attack.value = 0.004; comp.release.value = 0.2;
  AU.master.connect(comp); comp.connect(ctx.destination);
  AU.sfx = ctx.createGain(); AU.sfx.gain.value = AU.vol.sfx; AU.sfx.connect(AU.master);
  AU.music = ctx.createGain(); AU.music.gain.value = AU.vol.music; AU.music.connect(AU.master);
  // two seconds of white noise for everything hissy
  const nb = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate), d = nb.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  AU.noise = nb;
}
function noiseSrc(loop) { const s = AU.ctx.createBufferSource(); s.buffer = AU.noise; s.loop = !!loop; return s; }
function distCurve(k) { const n = 512, c = new Float32Array(n); for (let i = 0; i < n; i++) { const x = (i / (n - 1)) * 2 - 1; c[i] = ((1 + k) * x) / (1 + k * Math.abs(x)); } return c; }

// ---------- the engine: firing-frequency saw + sub, through a load-dependent filter and some grit ----------
const ENGINE_VOICE = {
  v12: { cyl: 12, saw: 0.5, sq: 0.25, sub: 0.35, cut: 900, q: 2, drive: 3, noise: 0.08, det: 1.004 },
  v8: { cyl: 8, saw: 0.45, sq: 0.45, sub: 0.6, cut: 520, q: 3.5, drive: 6, noise: 0.06, det: 1.012 },
  i6: { cyl: 6, saw: 0.55, sq: 0.2, sub: 0.3, cut: 760, q: 2.2, drive: 3, noise: 0.07, det: 1.006 },
  i4: { cyl: 4, saw: 0.5, sq: 0.35, sub: 0.25, cut: 840, q: 2.6, drive: 4, noise: 0.1, det: 1.008 },
  flat6: { cyl: 6, saw: 0.4, sq: 0.5, sub: 0.4, cut: 640, q: 3, drive: 5, noise: 0.08, det: 1.01 },
  turbo: { cyl: 6, saw: 0.5, sq: 0.3, sub: 0.3, cut: 1000, q: 2, drive: 3, noise: 0.12, det: 1.005, whistle: true },
};
function engineStart(kind) {
  if (!AU.ctx) return;
  engineStop();
  const ctx = AU.ctx, V = ENGINE_VOICE[kind] || ENGINE_VOICE.v8, E = { V, kind };
  E.out = ctx.createGain(); E.out.gain.value = 0; E.out.connect(AU.sfx);
  E.filt = ctx.createBiquadFilter(); E.filt.type = 'lowpass'; E.filt.frequency.value = V.cut; E.filt.Q.value = V.q;
  E.shaper = ctx.createWaveShaper(); E.shaper.curve = distCurve(V.drive); E.shaper.oversample = '2x';
  E.pre = ctx.createGain(); E.pre.gain.value = 0.5;
  E.pre.connect(E.shaper); E.shaper.connect(E.filt); E.filt.connect(E.out);
  const mk = (type, gain, mult) => { const o = ctx.createOscillator(); o.type = type; const g = ctx.createGain(); g.gain.value = gain; o.connect(g); g.connect(E.pre); o.start(); return { o, g, mult }; };
  E.osc = [mk('sawtooth', V.saw, 1), mk('sawtooth', V.saw * 0.6, V.det), mk('square', V.sq, 0.5), mk('sine', V.sub, 0.25)];
  // intake roar: band-passed noise riding the revs
  E.nz = noiseSrc(true); E.nzf = ctx.createBiquadFilter(); E.nzf.type = 'bandpass'; E.nzf.Q.value = 1.2; E.nzg = ctx.createGain(); E.nzg.gain.value = 0;
  E.nz.connect(E.nzf); E.nzf.connect(E.nzg); E.nzg.connect(E.out); E.nz.start();
  if (V.whistle) { E.wh = ctx.createOscillator(); E.wh.type = 'sine'; E.whg = ctx.createGain(); E.whg.gain.value = 0; E.wh.connect(E.whg); E.whg.connect(AU.sfx); E.wh.start(); }
  // wind and tyre noise share the engine's lifetime
  E.wind = noiseSrc(true); E.wf = ctx.createBiquadFilter(); E.wf.type = 'lowpass'; E.wf.frequency.value = 600; E.wg = ctx.createGain(); E.wg.gain.value = 0;
  E.wind.connect(E.wf); E.wf.connect(E.wg); E.wg.connect(AU.sfx); E.wind.start();
  E.sq = noiseSrc(true); E.sqf = ctx.createBiquadFilter(); E.sqf.type = 'bandpass'; E.sqf.frequency.value = 1300; E.sqf.Q.value = 6; E.sqg = ctx.createGain(); E.sqg.gain.value = 0;
  E.sq.connect(E.sqf); E.sqf.connect(E.sqg); E.sqg.connect(AU.sfx); E.sq.start();
  E.rough = noiseSrc(true); E.rf = ctx.createBiquadFilter(); E.rf.type = 'lowpass'; E.rf.frequency.value = 260; E.rg = ctx.createGain(); E.rg.gain.value = 0;
  E.rough.connect(E.rf); E.rf.connect(E.rg); E.rg.connect(AU.sfx); E.rough.start();
  // the squeal of a slide: a buzzing tone and its octave, warbling, through a peaky band — the arcade "eeeee"
  E.skF = ctx.createBiquadFilter(); E.skF.type = 'bandpass'; E.skF.frequency.value = 1700; E.skF.Q.value = 1.6;
  E.skG = ctx.createGain(); E.skG.gain.value = 0; E.skF.connect(E.skG); E.skG.connect(AU.sfx);
  const mkS = (type, gain) => { const o = ctx.createOscillator(); o.type = type; const g = ctx.createGain(); g.gain.value = gain; o.connect(g); g.connect(E.skF); o.start(); return o; };
  E.sk1 = mkS('sawtooth', 0.5); E.sk2 = mkS('square', 0.22); E.sk3 = mkS('sine', 0.35);
  E.lfo = ctx.createOscillator(); E.lfo.type = 'sine'; E.lfo.frequency.value = 7; E.lfoG = ctx.createGain(); E.lfoG.gain.value = 0;
  E.lfo.connect(E.lfoG); E.lfoG.connect(E.sk1.frequency); E.lfoG.connect(E.sk2.frequency); E.lfo.start();
  E.lastR = 0; E.popT = 0;
  AU.eng = E;
}
function engineStop() {
  const E = AU.eng; if (!E) return; AU.eng = null;
  const t = AU.ctx.currentTime;
  E.out.gain.setTargetAtTime(0, t, 0.05); E.wg.gain.setTargetAtTime(0, t, 0.05); E.sqg.gain.setTargetAtTime(0, t, 0.05); E.rg.gain.setTargetAtTime(0, t, 0.05); E.skG.gain.setTargetAtTime(0, t, 0.05);
  setTimeout(() => { for (const x of E.osc) x.o.stop(); E.nz.stop(); E.wind.stop(); E.sq.stop(); E.rough.stop(); E.sk1.stop(); E.sk2.stop(); E.sk3.stop(); E.lfo.stop(); if (E.wh) E.wh.stop(); }, 400);
}
// called every frame with the car's state
function engineUpdate(rpm, redline, throttle, v, slip, offroad, muted, drift) {
  const E = AU.eng; if (!E || !AU.ctx) return;
  const t = AU.ctx.currentTime, V = E.V, r = clamp(rpm / redline, 0.05, 1.1);
  const f0 = (rpm / 60) * (V.cyl / 2);
  for (const x of E.osc) x.o.frequency.setTargetAtTime(Math.max(20, f0 * x.mult), t, 0.02);
  E.filt.frequency.setTargetAtTime(V.cut * (0.55 + r * 1.6) * (0.6 + throttle * 0.6), t, 0.03);
  const load = 0.35 + throttle * 0.65;
  E.out.gain.setTargetAtTime(muted ? 0 : (0.16 + r * 0.22) * load, t, 0.04);
  E.nzf.frequency.setTargetAtTime(400 + r * 2600, t, 0.05); E.nzg.gain.setTargetAtTime(muted ? 0 : V.noise * r * r * (0.4 + throttle), t, 0.05);
  if (E.wh) { E.wh.frequency.setTargetAtTime(1800 + r * 5200, t, 0.05); E.whg.gain.setTargetAtTime(muted ? 0 : 0.018 * r * r * throttle, t, 0.06); }
  const sp = clamp(v / 80, 0, 1.2);
  E.wg.gain.setTargetAtTime(muted ? 0 : sp * sp * 0.22, t, 0.1); E.wf.frequency.setTargetAtTime(300 + sp * 1600, t, 0.1);
  E.sqg.gain.setTargetAtTime(muted ? 0 : slip * clamp(v / 30, 0, 1) * 0.12, t, 0.04); E.sqf.frequency.setTargetAtTime(1100 + Math.sin(t * 9) * 160, t, 0.03);
  // the squeal: full voice in a drift, a thinner one when the tyres are only scrubbing; pitch climbs a little with speed
  const sk = (drift ? 1 : slip * 0.45) * clamp((v - 8) / 22, 0, 1);
  const f = 560 + v * 3.2 + (drift ? 90 : 0);
  E.sk1.frequency.setTargetAtTime(f, t, 0.03); E.sk2.frequency.setTargetAtTime(f * 1.5, t, 0.03); E.sk3.frequency.setTargetAtTime(f * 2.01, t, 0.03);
  E.lfoG.gain.setTargetAtTime(f * 0.045, t, 0.05); E.lfo.frequency.setTargetAtTime(drift ? 6.5 : 9, t, 0.1);
  E.skF.frequency.setTargetAtTime(1500 + v * 6, t, 0.05);
  E.skG.gain.setTargetAtTime(muted ? 0 : sk * 0.2, t, drift ? 0.03 : 0.08);
  E.rg.gain.setTargetAtTime(muted ? 0 : offroad * clamp(v / 25, 0, 1) * 0.35, t, 0.05);
  // pops and crackles when lifting off at high revs
  if (E.lastR > 0.6 && throttle < 0.1 && Math.random() < 0.08 && !muted) sfxPop();
  E.lastR = throttle > 0.1 ? r : E.lastR * 0.995;
}
// ---------- one-shots ----------
function env(g, t, a, peak, d) { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + d); }
function noiseHit(t, type, freq, q, peak, dur, dest) {
  const s = noiseSrc(false), f = AU.ctx.createBiquadFilter(), g = AU.ctx.createGain(); f.type = type; f.frequency.value = freq; f.Q.value = q;
  s.connect(f); f.connect(g); g.connect(dest || AU.sfx); env(g, t, 0.005, peak, dur); s.start(t, Math.random() * 1.5); s.stop(t + dur + 0.05);
}
function tone(t, type, f0, f1, peak, dur, dest) {
  const o = AU.ctx.createOscillator(), g = AU.ctx.createGain(); o.type = type; o.frequency.setValueAtTime(f0, t); if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
  o.connect(g); g.connect(dest || AU.sfx); env(g, t, 0.005, peak, dur); o.start(t); o.stop(t + dur + 0.05);
}
function sfxShift(g) { if (!AU.ctx) return; const t = AU.ctx.currentTime; noiseHit(t, 'bandpass', 2400, 3, 0.12, 0.05); tone(t, 'square', 110, 70, 0.06, 0.06); if (AU.eng && AU.eng.V.whistle && g > 1) noiseHit(t, 'highpass', 3000, 0.7, 0.08, 0.3); }
let _skidOn = false; function sfxSkid(on) { _skidOn = on; }
// the chirp of the tyres on a power shift
function sfxChirp() { if (!AU.ctx) return; const t = AU.ctx.currentTime; noiseHit(t, 'bandpass', 2600, 3, 0.4, 0.16); }
let _scrT = 0; function sfxScrape() { if (!AU.ctx) return; const t = AU.ctx.currentTime; if (t - _scrT < 0.1) return; _scrT = t; noiseHit(t, 'bandpass', 3200, 2, 0.34, 0.14); tone(t, 'sawtooth', 1900 + Math.random() * 300, 1500, 0.05, 0.14); }
function sfxThud(k) { if (!AU.ctx) return; const t = AU.ctx.currentTime; tone(t, 'sine', 120, 40, 0.4 * k, 0.25); noiseHit(t, 'lowpass', 600, 1, 0.3 * k, 0.15); }
function sfxCrash(k) {
  if (!AU.ctx) return; const t = AU.ctx.currentTime;
  tone(t, 'sine', 90, 30, 0.7 * k, 0.6); noiseHit(t, 'lowpass', 1800, 0.8, 0.6 * k, 0.5);
  for (let i = 0; i < 6; i++) tone(t + 0.05 + i * 0.04, 'triangle', 2400 + Math.random() * 2400, 0, 0.05, 0.12);
  noiseHit(t + 0.5, 'lowpass', 900, 1, 0.35 * k, 0.4); noiseHit(t + 1.1, 'lowpass', 700, 1, 0.3 * k, 0.35);
}
function sfxPop() { if (!AU.ctx) return; const t = AU.ctx.currentTime; noiseHit(t, 'lowpass', 900 + Math.random() * 600, 1, 0.16, 0.05); }
function sfxBeep(hi) { if (!AU.ctx) return; const t = AU.ctx.currentTime; tone(t, 'square', hi ? 1320 : 660, 0, 0.12, hi ? 0.6 : 0.22); }
function sfxBell() { if (!AU.ctx) return; const t = AU.ctx.currentTime; tone(t, 'square', 1760, 0, 0.08, 0.12); tone(t + 0.14, 'square', 1760, 0, 0.08, 0.12); }
function sfxChime() { if (!AU.ctx) return; const t = AU.ctx.currentTime; [784, 988, 1175, 1568].forEach((f, i) => tone(t + i * 0.07, 'triangle', f, 0, 0.14, 0.4)); }
function sfxWarn() { if (!AU.ctx) return; const t = AU.ctx.currentTime; tone(t, 'square', 880, 0, 0.07, 0.12); }
// the whoosh of going past someone: a rush of air sweeping down in pitch as it passes, panned to their side,
// a deeper and longer one for the big trucks and buses
function sfxPass(k, pan, type) {
  if (!AU.ctx) return; const t = AU.ctx.currentTime, ctx = AU.ctx;
  // a car going by at speed, heard from an open car: the swish of air (resonant noise swept down), the rush of the body
  // (low noise), the other engine's hum dropping in pitch as it goes behind (two detuned saws under a lowpass, kept low),
  // and the bump of pressure as the bodies pass. Short: it is over in under half a second.
  const big = type === 'bus' || type === 'gravel' || type === 'rebar' || type === 'logs', kk = 0.6 + 0.4 * k;
  if ((SET.passSfx || 'a') === 'c') {   // the arcade style: one swept band of noise, the slap, a plain falling tone
    const dur0 = big ? 0.75 : 0.5, s0 = noiseSrc(false), f0 = ctx.createBiquadFilter(), g0 = ctx.createGain(), p0 = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
    f0.type = 'bandpass'; f0.frequency.setValueAtTime(big ? 1800 : 3200, t); f0.frequency.exponentialRampToValueAtTime(big ? 160 : 260, t + dur0); f0.Q.value = 0.9;
    s0.connect(f0); f0.connect(g0); if (p0) { p0.pan.setValueAtTime(clamp(pan, -1, 1) * 0.8, t); p0.pan.linearRampToValueAtTime(clamp(pan, -1, 1) * 0.3, t + dur0); g0.connect(p0); p0.connect(AU.sfx); } else g0.connect(AU.sfx);
    g0.gain.setValueAtTime(0.0001, t); g0.gain.exponentialRampToValueAtTime((big ? 1.3 : 1.1) * kk, t + 0.06); g0.gain.exponentialRampToValueAtTime(0.0001, t + dur0); s0.start(t, Math.random()); s0.stop(t + dur0 + 0.1);
    noiseHit(t, 'highpass', 5000, 0.7, 0.4 * kk, 0.08, p0 || AU.sfx); tone(t, 'sawtooth', big ? 180 : 320, big ? 70 : 120, 0.14 * kk, dur0 * 0.9, p0 || AU.sfx);
    return;
  }
  const dur = (big ? 0.7 : 0.46) / (0.8 + 0.2 * k);
  const p = ctx.createStereoPanner ? ctx.createStereoPanner() : null, dest = p || AU.sfx;
  if (p) { const side = clamp(pan, -1, 1); p.pan.setValueAtTime(side * 0.9, t); p.pan.linearRampToValueAtTime(side * 0.2, t + dur); p.connect(AU.sfx); }
  // 1. the swish
  { const s = noiseSrc(false), f = ctx.createBiquadFilter(), g = ctx.createGain(); f.type = 'bandpass'; f.Q.value = 1.6;
    f.frequency.setValueAtTime(big ? 1500 : 2600, t); f.frequency.exponentialRampToValueAtTime(big ? 220 : 320, t + dur);
    s.connect(f); f.connect(g); g.connect(dest); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(1.6 * kk, t + 0.05); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); s.start(t, Math.random() * 1.5); s.stop(t + dur + 0.1); }
  // 2. the body of air
  { const s = noiseSrc(false), f = ctx.createBiquadFilter(), g = ctx.createGain(); f.type = 'lowpass'; f.Q.value = 0.7;
    f.frequency.setValueAtTime(900, t); f.frequency.exponentialRampToValueAtTime(140, t + dur);
    s.connect(f); f.connect(g); g.connect(dest); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime((big ? 1.4 : 1.0) * kk, t + 0.07); g.gain.exponentialRampToValueAtTime(0.0001, t + dur * 1.2); s.start(t, Math.random() * 1.5); s.stop(t + dur * 1.2 + 0.1); }
  // 3. their engine, doppler-dropped, under a lowpass so it hums rather than buzzes (not in the wind-only style)
  if ((SET.passSfx || 'a') !== 'b') { const g = ctx.createGain(), f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = big ? 320 : 520; f.Q.value = 0.5; f.connect(g); g.connect(dest);
    const f0 = big ? 95 : 150, f1 = big ? 58 : 92;
    for (const det of [1, 1.013, 0.5]) { const o = ctx.createOscillator(); o.type = det === 0.5 ? 'square' : 'sawtooth'; o.frequency.setValueAtTime(f0 * det, t); o.frequency.exponentialRampToValueAtTime(f1 * det, t + dur * 0.9); o.connect(f); o.start(t); o.stop(t + dur + 0.1); }
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.16 * kk, t + 0.04); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); }
  // 4. the bump
  tone(t + 0.05, 'sine', big ? 70 : 95, big ? 40 : 55, (big ? 0.5 : 0.35) * kk, big ? 0.2 : 0.14, dest);
}
// metal on metal: a crunch, a ring, and the clatter after
function sfxClang(k) {
  if (!AU.ctx) return; const t = AU.ctx.currentTime;
  noiseHit(t, 'lowpass', 900, 0.8, 0.6 * k, 0.18); noiseHit(t + 0.02, 'bandpass', 2600, 1.5, 0.35 * k, 0.25);
  tone(t, 'square', 420, 180, 0.16 * k, 0.22); tone(t + 0.01, 'sine', 1600, 900, 0.1 * k, 0.4);
  for (let i = 0; i < 4; i++) noiseHit(t + 0.12 + i * 0.07 + Math.random() * 0.03, 'bandpass', 3200 + Math.random() * 2000, 3, 0.08 * k, 0.05);
}
function sfxHorn() { if (!AU.ctx) return; const t = AU.ctx.currentTime; tone(t, 'sawtooth', 392, 0, 0.08, 0.5); tone(t, 'sawtooth', 494, 0, 0.06, 0.5); }
// the ignition: the key's click, the dash chime, the starter's chug, the catch
function sfxKey() { if (!AU.ctx) return; const t = AU.ctx.currentTime; noiseHit(t, 'highpass', 2600, 1, 0.25, 0.03); tone(t + 0.01, 'square', 900, 500, 0.05, 0.03); }
function sfxDing() { if (!AU.ctx) return; const t = AU.ctx.currentTime; tone(t, 'sine', 2093, 0, 0.12, 0.35); tone(t + 0.28, 'sine', 1568, 0, 0.1, 0.4); }
function sfxStarter(dur) {
  if (!AU.ctx) return; const t = AU.ctx.currentTime;
  for (let k = 0; k * 0.09 < dur; k++) { const tk = t + k * 0.09; noiseHit(tk, 'lowpass', 380, 1.2, 0.26, 0.05); tone(tk, 'square', 84, 64, 0.07, 0.05); }
  tone(t, 'sawtooth', 140, 210, 0.04, dur);
}
function sfxCatch() { if (!AU.ctx) return; const t = AU.ctx.currentTime; noiseHit(t, 'lowpass', 500, 1, 0.3, 0.2); tone(t, 'sawtooth', 50, 110, 0.12, 0.25); }
function sfxUi() { if (!AU.ctx) return; const t = AU.ctx.currentTime; tone(t, 'square', 990, 0, 0.06, 0.07); }
// another car's horn, quieter with distance, a little lower than ours
function sfxHornFar(dist) { if (!AU.ctx) return; const t = AU.ctx.currentTime, k = clamp(1 - dist / 60, 0.1, 1) * 0.5; tone(t, 'sawtooth', 349, 0, 0.09 * k, 0.45); tone(t, 'sawtooth', 440, 0, 0.07 * k, 0.45); }

// the siren: two tones wailing, swelling with how near the patrol is
function sirenUpdate(k, dt) {
  if (!AU.ctx) return; const ctx = AU.ctx;
  if (!AU.siren) { const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'square'; o.frequency.value = 700; g.gain.value = 0; o.connect(g); g.connect(AU.sfx); o.start(); AU.siren = { o, g, ph: 0 }; }
  const S = AU.siren; S.ph += dt * 1.6; S.o.frequency.setTargetAtTime(640 + 260 * (0.5 + 0.5 * Math.sin(S.ph * TAU)), ctx.currentTime, 0.05);
  S.g.gain.setTargetAtTime(k * 0.07, ctx.currentTime, 0.1);
}
