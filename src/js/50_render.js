// ===================== the picture: a low-poly ground under pixel billboards, then the HD-2D finish =====================
// three.js draws the world; the props are one instanced quad per atlas, turned to face the camera in the vertex shader;
// the car is a quad whose picture is the turntable frame nearest the angle we see it at. The frame is then passed
// through the finish: bloom on the bright things, depth-of-field with a tilt-shift band, a vignette and a warm grade.
const R3 = { renderer: null, scene: null, cam: null, ground: null, car: null, carTex: null, carFrames: null, shadow: null, props: [], rt: null, post: null, w: 0, h: 0, pixelK: 1, tod: { tint: [1, 1, 1], sky: 0x9ec8f0, fog: 0xc8dcea } };
const BILLBOARD_VS = `
  attribute vec3 iPos; attribute vec2 iSize; attribute vec4 iUV; attribute float iFlip;
  varying vec2 vUv; varying float vFog;
  uniform vec3 camPos;
  void main() {
    vec3 toCam = camPos - iPos; toCam.y = 0.0; vec3 fwd = normalize(toCam); vec3 right = vec3(fwd.z, 0.0, -fwd.x);
    vec3 p = iPos + right * (position.x * iSize.x) + vec3(0.0, (position.y + 0.5) * iSize.y, 0.0);
    float u = iFlip > 0.5 ? 1.0 - uv.x : uv.x;
    vUv = vec2(mix(iUV.x, iUV.z, u), mix(iUV.y, iUV.w, uv.y));
    vec4 mv = modelViewMatrix * vec4(p, 1.0); vFog = -mv.z; gl_Position = projectionMatrix * mv;
  }`;
const BILLBOARD_FS = `
  precision mediump float; uniform sampler2D map; uniform vec3 tint; uniform vec3 fogColor; uniform float fogNear, fogFar;
  varying vec2 vUv; varying float vFog;
  void main() { vec4 c = texture2D(map, vUv); if (c.a < 0.5) discard; float f = smoothstep(fogNear, fogFar, vFog); gl_FragColor = vec4(mix(c.rgb * tint, fogColor, f), 1.0); }`;
function r3Init() {
  const canvasEl = $('gl');
  const rd = new THREE.WebGLRenderer({ canvas: canvasEl, antialias: false, powerPreference: 'high-performance' });
  rd.setPixelRatio(1); rd.outputColorSpace = THREE.SRGBColorSpace; R3.renderer = rd;
  const scene = new THREE.Scene(); R3.scene = scene;
  scene.fog = new THREE.Fog(R3.tod.fog, 260, 1100); scene.background = new THREE.Color(R3.tod.sky);
  R3.cam = new THREE.PerspectiveCamera(42, 16 / 9, 0.5, 2200);
  r3Ground(); r3Props(); r3Shadow(); r3Marks();
  r3Post();
  r3Resize();
  addEventListener('resize', r3Resize);
}
function r3Resize() {
  const W = innerWidth, H = innerHeight, k = Math.min(1, 720 / Math.max(W, H)) * (SET.quality === 'low' ? 0.7 : 1);
  R3.w = Math.round(W * k); R3.h = Math.round(H * k); R3.pixelK = k;
  R3.renderer.setSize(R3.w, R3.h, false); R3.cam.aspect = W / H; R3.cam.updateProjectionMatrix();
  if (R3.post) r3PostResize();
}
// ---------- the ground ----------
function r3Ground() {
  const N = 160, W = MAP.W, geo = new THREE.PlaneGeometry(W, W, N, N); geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) { const x = pos.getX(i) + W / 2, z = pos.getZ(i) + W / 2; pos.setY(i, terrainH(x, z) - (groundKind(x, z) === GK.water ? 1.2 : 0)); }
  geo.computeVertexNormals();
  const tex = new THREE.CanvasTexture(MAP.ground); tex.magFilter = THREE.NearestFilter; tex.minFilter = THREE.LinearMipmapLinearFilter; tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  const mat = new THREE.MeshLambertMaterial({ map: tex });
  const m = new THREE.Mesh(geo, mat); m.position.set(W / 2, 0, W / 2); scene3Add(m); R3.ground = m;
  const sun = new THREE.DirectionalLight(0xfff0d8, 1.1); sun.position.set(-300, 400, -200); scene3Add(sun);
  scene3Add(new THREE.AmbientLight(0xb8c8e0, 0.9));
  // the highway deck: a flat strip at its height, with its barriers
  for (const rd of MAP.roads) if (rd.elev) {
    const [ax, az] = rd.pts[0], [bx, bz] = rd.pts[rd.pts.length - 1], L = Math.hypot(bx - ax, bz - az);
    const g2 = new THREE.BoxGeometry(rd.w + 2, 1.2, L), mm = new THREE.Mesh(g2, new THREE.MeshLambertMaterial({ color: 0x55555c })); mm.position.set((ax + bx) / 2, rd.elev, (az + bz) / 2); scene3Add(mm);
    for (const s of [-1, 1]) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1, L), new THREE.MeshLambertMaterial({ color: 0xc8c8c8 })); b.position.set((ax + bx) / 2 + s * (rd.w / 2 + 0.8), rd.elev + 1.1, (az + bz) / 2); scene3Add(b); }
    for (let z = 20; z < L; z += 30) { const p = new THREE.Mesh(new THREE.BoxGeometry(3, rd.elev, 2), new THREE.MeshLambertMaterial({ color: 0x9a9a9a })); p.position.set((ax + bx) / 2, rd.elev / 2, az + z); scene3Add(p); }
  }
}
function scene3Add(m) { R3.scene.add(m); }
// ---------- the props: an atlas and one instanced quad ----------
function r3Props() {
  const kinds = Object.values(PROPS.kinds), AW = 2048;
  // shelf packing
  let x = 0, y = 0, rowH = 0; const atlas = canvas(AW, AW), g = atlas.getContext('2d');
  kinds.sort((a, b) => b.px.h - a.px.h);
  for (const K of kinds) { const w = K.px.w, h = K.px.h; if (x + w > AW) { x = 0; y += rowH; rowH = 0; } if (y + h > AW) break; g.drawImage(K.px.toCanvas(), x, y); K.uv = [x / AW, 1 - (y + h) / AW, (x + w) / AW, 1 - y / AW]; x += w + 1; rowH = Math.max(rowH, h + 1); }
  const tex = new THREE.CanvasTexture(atlas); tex.magFilter = THREE.NearestFilter; tex.minFilter = THREE.NearestFilter; tex.generateMipmaps = false; tex.colorSpace = THREE.SRGBColorSpace;
  const n = PROPS.list.length, pos = new Float32Array(n * 3), size = new Float32Array(n * 2), uv = new Float32Array(n * 4), flip = new Float32Array(n);
  PROPS.list.forEach((p, i) => { const K = PROPS.kinds[p.k]; pos[i * 3] = p.x; pos[i * 3 + 1] = p.y - 0.05; pos[i * 3 + 2] = p.z; size[i * 2] = K.wM * p.s; size[i * 2 + 1] = K.hM * p.s; uv.set(K.uv, i * 4); flip[i] = p.flip ? 1 : 0; });
  const geo = new THREE.InstancedBufferGeometry().copy(new THREE.PlaneGeometry(1, 1)); geo.instanceCount = n;
  geo.setAttribute('iPos', new THREE.InstancedBufferAttribute(pos, 3)); geo.setAttribute('iSize', new THREE.InstancedBufferAttribute(size, 2)); geo.setAttribute('iUV', new THREE.InstancedBufferAttribute(uv, 4)); geo.setAttribute('iFlip', new THREE.InstancedBufferAttribute(flip, 1));
  const mat = new THREE.ShaderMaterial({ vertexShader: BILLBOARD_VS, fragmentShader: BILLBOARD_FS, uniforms: { map: { value: tex }, camPos: { value: new THREE.Vector3() }, tint: { value: new THREE.Vector3(1, 1, 1) }, fogColor: { value: new THREE.Color(R3.tod.fog) }, fogNear: { value: 260 }, fogFar: { value: 1100 } }, transparent: false });
  const m = new THREE.Mesh(geo, mat); m.frustumCulled = false; scene3Add(m); R3.propMesh = m;
}
// ---------- the car ----------
function r3CarSet(spec) {
  const frames = carTurn(spec), N = TURN_N, cols = 8, rows = Math.ceil(N / cols), fw = frames[0].width, fh = frames[0].height;
  const at = canvas(cols * fw, rows * fh), g = at.getContext('2d');
  frames.forEach((f, i) => g.drawImage(f, (i % cols) * fw, Math.floor(i / cols) * fh));
  if (R3.car) { R3.scene.remove(R3.car); R3.carTex.dispose(); }
  const tex = new THREE.CanvasTexture(at); tex.magFilter = THREE.NearestFilter; tex.minFilter = THREE.LinearFilter; tex.generateMipmaps = false; tex.colorSpace = THREE.SRGBColorSpace;
  R3.carTex = tex; R3.carFrames = { cols, rows, fw, fh, N };
  const ppm = TURN_OPT.ppm, wM = fw / ppm, hM = fh / ppm, gy = TURN_OPT.gy / ppm;
  const geo = new THREE.PlaneGeometry(wM, hM); geo.translate(0, gy - hM / 2 + 0.02, 0);   // the frame's ground line (gy from its top) sits at y = 0
  const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, alphaTest: 0.5, depthWrite: true, fog: false, side: THREE.DoubleSide });
  const m = new THREE.Mesh(geo, mat); scene3Add(m); R3.car = m;
  r3CarFrame(0);
}
function r3CarFrame(i) {
  const F = R3.carFrames, tex = R3.carTex; i = ((i % F.N) + F.N) % F.N;
  tex.repeat.set(1 / F.cols, 1 / F.rows); tex.offset.set((i % F.cols) / F.cols, 1 - (Math.floor(i / F.cols) + 1) / F.rows);
}
function r3Shadow() {
  const c = canvas(64, 32), g = c.getContext('2d'), gr = g.createRadialGradient(32, 16, 2, 32, 16, 30); gr.addColorStop(0, 'rgba(0,0,0,0.55)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 32);
  const tex = new THREE.CanvasTexture(c), m = new THREE.Mesh(new THREE.PlaneGeometry(5.2, 2.6), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false })); m.rotation.x = -Math.PI / 2;
  const grp = new THREE.Group(); grp.add(m); scene3Add(grp); R3.shadow = grp;
}
// tyre marks: short dark quads laid where the tyres slid
function r3Marks() { const geo = new THREE.PlaneGeometry(0.3, 1.2); geo.rotateX(-Math.PI / 2); const m = new THREE.InstancedMesh(geo, new THREE.MeshBasicMaterial({ color: 0x1a1a1e, transparent: true, opacity: 0.55, depthWrite: false }), 800); m.count = 0; m.frustumCulled = false; scene3Add(m); R3.marks = m; R3.markN = 0; }
const _m4 = new THREE.Matrix4(), _e = new THREE.Euler(), _q = new THREE.Quaternion(), _s = new THREE.Vector3(1, 1, 1), _p = new THREE.Vector3();
function r3AddMark(x, z, yaw, side) {
  const m = R3.marks, i = R3.markN % 800; R3.markN++; m.count = Math.min(800, R3.markN);
  _e.set(0, yaw, 0); _q.setFromEuler(_e); _p.set(x + Math.cos(yaw) * side * 0.8, terrainH(x, z) + 0.03, z - Math.sin(yaw) * side * 0.8); _m4.compose(_p, _q, _s); m.setMatrixAt(i, _m4); m.instanceMatrix.needsUpdate = true;
}
// ---------- the finish: bloom, tilt-shift depth of field, vignette ----------
const QUAD_VS = `varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;
const BLUR_FS = `precision mediump float; uniform sampler2D tex; uniform vec2 dir; varying vec2 vUv;
  void main() { vec4 c = vec4(0.0); float w[5]; w[0]=0.227; w[1]=0.194; w[2]=0.121; w[3]=0.054; w[4]=0.016;
    c += texture2D(tex, vUv) * w[0]; for (int i = 1; i < 5; i++) { c += texture2D(tex, vUv + dir * float(i)) * w[i]; c += texture2D(tex, vUv - dir * float(i)) * w[i]; } gl_FragColor = c; }`;
const BRIGHT_FS = `precision mediump float; uniform sampler2D tex; varying vec2 vUv; void main() { vec4 c = texture2D(tex, vUv); float l = dot(c.rgb, vec3(0.3, 0.59, 0.11)); gl_FragColor = vec4(c.rgb * smoothstep(0.62, 0.95, l), 1.0); }`;
const COMP_FS = `precision mediump float; uniform sampler2D tex, blur, bloom, depthTex; uniform float near, far, focus, aspect; uniform vec3 grade; varying vec2 vUv;
  float lin(float d) { float z = d * 2.0 - 1.0; return (2.0 * near * far) / (far + near - z * (far - near)); }
  void main() {
    vec4 sharp = texture2D(tex, vUv); vec4 soft = texture2D(blur, vUv); float d = lin(texture2D(depthTex, vUv).r);
    float coc = clamp((d - focus) / (focus * 4.0), 0.0, 1.0) * 0.8 + clamp((focus * 0.5 - d) / (focus * 0.5), 0.0, 1.0) * 0.6;
    float tilt = smoothstep(0.3, 0.5, abs(vUv.y - 0.5));
    float k = clamp(coc + tilt * 0.45, 0.0, 1.0);
    vec3 c = mix(sharp.rgb, soft.rgb, k) + texture2D(bloom, vUv).rgb * 0.55;
    c *= grade; vec2 q = (vUv - 0.5) * vec2(aspect, 1.0); c *= 1.0 - dot(q, q) * 0.55;
    gl_FragColor = vec4(pow(max(c, 0.0), vec3(1.0 / 2.2)), 1.0); }`;
function r3Post() {
  const mk = (w, h, depth) => { const rt = new THREE.WebGLRenderTarget(w, h, { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter }); if (depth) { rt.depthTexture = new THREE.DepthTexture(w, h); rt.depthTexture.type = THREE.UnsignedIntType; } return rt; };
  const P = { mk, quad: new THREE.Mesh(new THREE.PlaneGeometry(2, 2)), scene: new THREE.Scene(), cam: new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1) };
  P.scene.add(P.quad);
  P.blur = new THREE.ShaderMaterial({ vertexShader: QUAD_VS, fragmentShader: BLUR_FS, uniforms: { tex: { value: null }, dir: { value: new THREE.Vector2() } }, depthTest: false });
  P.bright = new THREE.ShaderMaterial({ vertexShader: QUAD_VS, fragmentShader: BRIGHT_FS, uniforms: { tex: { value: null } }, depthTest: false });
  P.comp = new THREE.ShaderMaterial({ vertexShader: QUAD_VS, fragmentShader: COMP_FS, uniforms: { tex: { value: null }, blur: { value: null }, bloom: { value: null }, depthTex: { value: null }, near: { value: 0.5 }, far: { value: 2200 }, focus: { value: 14 }, aspect: { value: 1.7 }, grade: { value: new THREE.Vector3(1.03, 1.0, 0.96) } }, depthTest: false });
  R3.post = P; r3PostResize();
}
function r3PostResize() {
  const P = R3.post, w = R3.w, h = R3.h; for (const k of ['rt', 'a', 'b', 'ba', 'bb']) if (P[k]) P[k].dispose();
  P.rt = P.mk(w, h, true); P.a = P.mk(w >> 1, h >> 1); P.b = P.mk(w >> 1, h >> 1); P.ba = P.mk(w >> 2, h >> 2); P.bb = P.mk(w >> 2, h >> 2);
  P.comp.uniforms.aspect.value = w / h;
}
function r3Pass(mat, from, to, dir, w, h) { const P = R3.post; mat.uniforms.tex.value = from.texture; if (dir) mat.uniforms.dir.value.set(dir[0] / w, dir[1] / h); P.quad.material = mat; R3.renderer.setRenderTarget(to); R3.renderer.render(P.scene, P.cam); }
function r3Frame(focusDist) {
  const rd = R3.renderer, P = R3.post;
  if (!P || SET.quality === 'off') { rd.setRenderTarget(null); rd.render(R3.scene, R3.cam); return; }
  rd.setRenderTarget(P.rt); rd.render(R3.scene, R3.cam);
  const w2 = R3.w >> 1, h2 = R3.h >> 1, w4 = R3.w >> 2, h4 = R3.h >> 2;
  r3Pass(P.blur, P.rt, P.a, [1.0, 0], w2, h2); r3Pass(P.blur, P.a, P.b, [0, 1.0], w2, h2); r3Pass(P.blur, P.b, P.a, [1.6, 0], w2, h2); r3Pass(P.blur, P.a, P.b, [0, 1.6], w2, h2);
  r3Pass(P.bright, P.rt, P.ba, null, w4, h4); r3Pass(P.blur, P.ba, P.bb, [2, 0], w4, h4); r3Pass(P.blur, P.bb, P.ba, [0, 2], w4, h4); r3Pass(P.blur, P.ba, P.bb, [3, 0], w4, h4); r3Pass(P.blur, P.bb, P.ba, [0, 3], w4, h4);
  const u = P.comp.uniforms; u.tex.value = P.rt.texture; u.blur.value = P.b.texture; u.bloom.value = P.ba.texture; u.depthTex.value = P.rt.depthTexture; u.focus.value = focusDist; u.near.value = R3.cam.near; u.far.value = R3.cam.far;
  P.quad.material = P.comp; rd.setRenderTarget(null); rd.render(P.scene, P.cam);
}
// ---------- per frame: the car's picture, the shadow, the camera ----------
function r3Update(camYaw) {
  const C = CAR;
  if (R3.car) {
    R3.car.visible = !CAMV.fp;
    const rel = angWrap(C.yaw - camYaw), i = Math.round((rel / TAU) * TURN_N);
    r3CarFrame(i);
    R3.car.position.set(C.x, C.y, C.z); R3.car.rotation.y = camYaw;   // the quad faces the camera
    R3.shadow.position.set(C.x, C.y + 0.02, C.z); R3.shadow.rotation.y = C.yaw - Math.PI / 2;
  }
  R3.propMesh.material.uniforms.camPos.value.copy(R3.cam.position);
}
