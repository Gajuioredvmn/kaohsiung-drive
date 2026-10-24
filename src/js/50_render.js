// ===================== the picture: a low-poly ground, the city's quads and boxes, pixel billboards, then the HD-2D finish =====================
// three.js draws the world. The city is one texture atlas and two shaders: a flat one for the road and pavement quads and
// an instanced one for every box (a house, a column, a pole) that picks its tiles per face. Props are one instanced quad
// per atlas, turned to face the camera in the vertex shader; the car is a quad showing the turntable frame nearest the
// angle we see it at. The frame is then passed through the finish: bloom on the bright things, depth-of-field with a
// tilt-shift band, a vignette and a warm grade.
const R3 = { renderer: null, scene: null, cam: null, ground: null, car: null, carTex: null, carFrames: null, shadow: null, chunks: [], rt: null, post: null, w: 0, h: 0, pixelK: 1, tod: { tint: [1, 1, 1], sky: 0x9ec8f0, fog: 0xc8dcea, sun: [-0.5, 0.72, 0.48] }, drawn: 0 };
const FOG_NEAR = 300, FOG_FAR = 1150;
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
// the city's shaders: a tile rectangle per vertex (or per box face), repeated with fract, lit by the sun direction
// the tile repeats with fract(); the mip level comes from the unbroken uv, so the seams between repeats do not blur
const CITY_FS = `
  precision mediump float; uniform sampler2D map; uniform vec3 tint, fogColor; uniform float fogNear, fogFar;
  varying vec2 vUv; varying vec4 vTile; varying vec3 vCol; varying float vLight, vFog;
  void main() { vec2 sz = vTile.zw - vTile.xy; vec2 t = vTile.xy + fract(vUv) * sz;
    #ifdef USE_GRAD
    vec4 c = texture2DGradEXT(map, t, dFdx(vUv) * sz, dFdy(vUv) * sz);
    #else
    vec4 c = texture2D(map, t);
    #endif
    if (c.a < 0.5) discard;
    vec3 col = c.rgb * vCol * vLight * tint; float f = smoothstep(fogNear, fogFar, vFog); gl_FragColor = vec4(mix(col, fogColor, f), 1.0); }`;
const GEO_VS = `
  attribute vec4 tile; attribute vec3 color;
  varying vec2 vUv; varying vec4 vTile; varying vec3 vCol; varying float vLight, vFog;
  uniform vec3 sunDir;
  void main() { vUv = uv; vTile = tile; vCol = color; vLight = 0.58 + 0.42 * max(0.0, dot(normal, sunDir)) + 0.1 * normal.y;
    vec4 mv = modelViewMatrix * vec4(position, 1.0); vFog = -mv.z; gl_Position = projectionMatrix * mv; }`;
const BOX_VS = `
  attribute vec3 iPos, iSize, iCol, iRep; attribute float iYaw, face; attribute vec4 iTF, iTS, iTT;
  varying vec2 vUv; varying vec4 vTile; varying vec3 vCol; varying float vLight, vFog;
  uniform vec3 sunDir;
  void main() {
    vec3 ls = position * iSize; float s = sin(iYaw), c = cos(iYaw);
    vec3 wp = iPos + vec3(ls.x * c + ls.z * s, ls.y, -ls.x * s + ls.z * c);
    vec3 wn = vec3(normal.x * c + normal.z * s, normal.y, -normal.x * s + normal.z * c);
    int f = int(face + 0.5); vec2 uv2;
    if (f == 0) { uv2 = vec2((position.x + 0.5) * iRep.z, position.y) * 0.998; vTile = iTF; }
    else if (f == 1) { uv2 = iRep.x > 0.0 ? vec2((0.5 - position.x) * iSize.x, position.y * iSize.y) / iRep.x : vec2(0.5 - position.x, position.y) * 0.998; vTile = iTS; }
    else if (f == 2) { uv2 = iRep.x > 0.0 ? vec2(-position.z * iSize.z, position.y * iSize.y) / iRep.x : vec2(-position.z, position.y) * 0.998; vTile = iTS; }
    else if (f == 3) { uv2 = iRep.x > 0.0 ? vec2((1.0 + position.z) * iSize.z, position.y * iSize.y) / iRep.x : vec2(1.0 + position.z, position.y) * 0.998; vTile = iTS; }
    else { uv2 = iRep.y > 0.0 ? vec2((position.x + 0.5) * iSize.x, -position.z * iSize.z) / iRep.y : vec2(position.x + 0.5, -position.z) * 0.998; vTile = iTT; }
    vUv = uv2; vCol = iCol;
    float light = 0.58 + 0.42 * max(0.0, dot(wn, sunDir)) + 0.1 * wn.y; if (f == 5) light *= 0.3;
    vLight = light;
    vec4 mv = modelViewMatrix * vec4(wp, 1.0); vFog = -mv.z; gl_Position = projectionMatrix * mv;
  }`;
function r3Init() {
  const canvasEl = $('gl');
  const rd = new THREE.WebGLRenderer({ canvas: canvasEl, antialias: false, powerPreference: 'high-performance' });
  rd.setPixelRatio(1); rd.outputColorSpace = THREE.SRGBColorSpace; R3.renderer = rd;
  const scene = new THREE.Scene(); R3.scene = scene;
  scene.fog = new THREE.Fog(R3.tod.fog, FOG_NEAR, FOG_FAR); scene.background = new THREE.Color(R3.tod.sky);
  R3.cam = new THREE.PerspectiveCamera(42, 16 / 9, 0.6, 2600);
  R3.sun = new THREE.Vector3(...R3.tod.sun).normalize();
  r3Ground(); r3Sky(); r3Atlas(); r3City(); r3Props(); r3Traffic(); r3Shadow(); r3Marks();
  for (const m of CITY.meshes || []) scene.add(m);
  // the finish needs a depth texture: WebGL2 (every modern phone); otherwise the plain picture
  if (rd.capabilities.isWebGL2) { try { r3Post(); } catch (e) { R3.post = null; reportErr('post: ' + e.message); } } else R3.postOff = 'WebGL1';
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
  const N = 300, W = MAP.W, geo = new THREE.PlaneGeometry(W, W, N, N); geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) { const x = pos.getX(i) + W / 2, z = pos.getZ(i) + W / 2; const k = groundKind(x, z); pos.setY(i, k === GK.water ? (riverDist(x, z) < 30 ? -2.4 : -1.2) : terrainH(x, z)); }
  geo.computeVertexNormals();
  const tex = new THREE.CanvasTexture(MAP.ground); tex.magFilter = THREE.NearestFilter; tex.minFilter = THREE.LinearMipmapLinearFilter; tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  const mat = new THREE.MeshLambertMaterial({ map: tex });
  const m = new THREE.Mesh(geo, mat); m.position.set(W / 2, 0, W / 2); scene3Add(m); R3.ground = m;
  const sun = new THREE.DirectionalLight(0xfff0d8, 1.0); sun.position.set(R3.tod.sun[0] * 500, R3.tod.sun[1] * 500, R3.tod.sun[2] * 500); scene3Add(sun); R3.sunLight = sun;
  R3.ambLight = new THREE.AmbientLight(0xc0d0e8, 1.0); scene3Add(R3.ambLight);
}
function scene3Add(m) { R3.scene.add(m); }
// the sky: a dome round the camera, hazy at the horizon and blue overhead, with a warm glow toward the sun
const SKY_VS = `varying vec3 vDir; void main() { vDir = normalize(position); vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mv; gl_Position.z = gl_Position.w * 0.9999; }`;
const SKY_FS = `precision mediump float; uniform vec3 top, horizon, haze, sunDir; varying vec3 vDir;
  void main() { float h = clamp(vDir.y, 0.0, 1.0); vec3 c = mix(haze, horizon, smoothstep(0.0, 0.08, h)); c = mix(c, top, smoothstep(0.05, 0.6, h));
    float s = max(0.0, dot(normalize(vDir), sunDir)); c += vec3(1.0, 0.85, 0.6) * pow(s, 18.0) * 0.35 + vec3(1.0, 0.95, 0.85) * pow(s, 200.0) * 0.9; gl_FragColor = vec4(c, 1.0); }`;
function r3Sky() {
  const geo = new THREE.SphereGeometry(2400, 32, 16), mat = new THREE.ShaderMaterial({ vertexShader: SKY_VS, fragmentShader: SKY_FS, uniforms: { top: { value: new THREE.Color(0x5a9ae0) }, horizon: { value: new THREE.Color(0xa8ccec) }, haze: { value: new THREE.Color(R3.tod.fog) }, sunDir: { value: R3.sun } }, side: THREE.BackSide, depthWrite: false, fog: false });
  const m = new THREE.Mesh(geo, mat); m.frustumCulled = false; m.renderOrder = -10; scene3Add(m); R3.sky = m; R3.scene.background = null;
}
// the time of day: the sky, the haze, the sun and the tint on everything (the lamps and headlights come on at night in r3FxUpdate)
const TODS = {
  day: { top: 0x5a9ae0, horizon: 0xa8ccec, fog: 0xc8dcea, tint: [1, 1, 1], sun: [-0.5, 0.72, 0.48], sunI: 1.0, sunC: 0xfff0d8, amb: 1.0, ambC: 0xc0d0e8 },
  dusk: { top: 0x3a4a8a, horizon: 0xf0a070, fog: 0xe8b090, tint: [1.0, 0.84, 0.7], grade: [0.95, 0.82, 0.72], sun: [-0.85, 0.2, 0.48], sunI: 0.8, sunC: 0xffb070, amb: 0.75, ambC: 0xa090b0 },
  night: { top: 0x060a1c, horizon: 0x18203a, fog: 0x10162a, tint: [0.42, 0.46, 0.6], grade: [0.38, 0.42, 0.62], sun: [0.3, 0.6, 0.4], sunI: 0.25, sunC: 0x8090c0, amb: 0.55, ambC: 0x5a6a90 },
};
function setTod(kind) {
  const T = TODS[kind] || TODS.day; R3.todKind = kind in TODS ? kind : 'day'; R3.gradeDay = R3.gradeDay || [1.03, 1.0, 0.96];
  R3.tod = { tint: T.tint, sky: T.horizon, fog: T.fog, sun: T.sun }; if (R3.sun) R3.sun.set(...T.sun).normalize();
  if (R3.scene && R3.scene.fog) R3.scene.fog.color.setHex(T.fog);
  if (R3.sky) { const u = R3.sky.material.uniforms; u.top.value.setHex(T.top); u.horizon.value.setHex(T.horizon); u.haze.value.setHex(T.fog); }
  if (R3.sunLight) { R3.sunLight.intensity = T.sunI; R3.sunLight.color.setHex(T.sunC); R3.sunLight.position.set(T.sun[0] * 500, T.sun[1] * 500, T.sun[2] * 500); }
  if (R3.ambLight) { R3.ambLight.intensity = T.amb; R3.ambLight.color.setHex(T.ambC); }
  for (const m of [R3.geoMat, R3.topMat, R3.boxMat, R3.propMesh && R3.propMesh.material, R3.trafficMesh && R3.trafficMesh.material, R3.peopleMesh && R3.peopleMesh.material]) { const u = m && m.uniforms; if (!u) continue; if (u.tint) u.tint.value.set(T.tint[0], T.tint[1], T.tint[2]); if (u.fogColor) u.fogColor.value.setHex(T.fog); }
  if (R3.fxMesh) R3.fxMesh.material.uniforms.fogColor.value.setHex(T.fog);
  // the darkness goes into the post pass's grade; without the post pass (quality off) the tint carries it instead
  const g = T.grade || R3.gradeDay; if (R3.post && R3.post.comp) R3.post.comp.uniforms.grade.value.set(g[0], g[1], g[2]);
  if (R3.fxMesh) { const u = R3.fxMesh.material.uniforms; if (u.tint) u.tint.value.set(Math.min(2.6, 1 / g[0]), Math.min(2.6, 1 / g[1]), Math.min(2.6, 1 / g[2])); }   // the glows stay bright through the grade
  if (SET.quality === 'off' || R3.postFail) for (const m of [R3.geoMat, R3.topMat, R3.boxMat, R3.propMesh && R3.propMesh.material, R3.trafficMesh && R3.trafficMesh.material, R3.peopleMesh && R3.peopleMesh.material]) { const u = m && m.uniforms; if (u && u.tint) u.tint.value.set(T.tint[0] * g[0] / R3.gradeDay[0], T.tint[1] * g[1] / R3.gradeDay[1], T.tint[2] * g[2] / R3.gradeDay[2]); }
  if (R3.ground) { R3.ground.material.color.setRGB(T.tint[0], T.tint[1], T.tint[2]); }
}
// ---------- the city: the atlas, one flat mesh and one box mesh per chunk ----------
function r3Atlas() {
  const gl2 = R3.renderer.capabilities.isWebGL2, maxTex = R3.renderer.capabilities.maxTextureSize;
  let src = ATLAS.canvas; if (maxTex < ATLAS.W) { const c = canvas(maxTex, maxTex); c.getContext('2d').drawImage(src, 0, 0, maxTex, maxTex); src = c; }
  const tex = new THREE.CanvasTexture(src); tex.magFilter = THREE.NearestFilter; tex.minFilter = gl2 ? THREE.LinearMipmapLinearFilter : THREE.LinearFilter; tex.generateMipmaps = gl2; tex.anisotropy = Math.min(4, R3.renderer.capabilities.getMaxAnisotropy()); tex.colorSpace = THREE.SRGBColorSpace;
  R3.atlas = tex;
  const uni = () => ({ map: { value: tex }, sunDir: { value: R3.sun }, tint: { value: new THREE.Vector3(1, 1, 1) }, fogColor: { value: new THREE.Color(R3.tod.fog) }, fogNear: { value: FOG_NEAR }, fogFar: { value: FOG_FAR } });
  const defs = gl2 ? { USE_GRAD: '' } : {};
  R3.geoMat = new THREE.ShaderMaterial({ vertexShader: GEO_VS, fragmentShader: CITY_FS, uniforms: uni(), side: THREE.DoubleSide, defines: defs });
  R3.topMat = new THREE.ShaderMaterial({ vertexShader: GEO_VS, fragmentShader: CITY_FS, uniforms: uni(), side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2, defines: defs });
  R3.boxMat = new THREE.ShaderMaterial({ vertexShader: BOX_VS, fragmentShader: CITY_FS, uniforms: uni(), defines: defs });
  R3.unitBox = unitBoxGeo();
}
// the unit box: x -0.5..0.5, y 0..1, z -1..0 (the front face at z = 0), a face number on every vertex
function unitBoxGeo() {
  const p = [], n = [], f = [], idx = [];
  const face = (id, nrm, a, b, c, d) => { const k = p.length / 3; for (const v of [a, b, c, d]) { p.push(v[0], v[1], v[2]); n.push(nrm[0], nrm[1], nrm[2]); f.push(id); } idx.push(k, k + 1, k + 2, k, k + 2, k + 3); };
  face(0, [0, 0, 1], [-0.5, 0, 0], [0.5, 0, 0], [0.5, 1, 0], [-0.5, 1, 0]);                 // front, +z
  face(1, [0, 0, -1], [0.5, 0, -1], [-0.5, 0, -1], [-0.5, 1, -1], [0.5, 1, -1]);             // back
  face(2, [1, 0, 0], [0.5, 0, 0], [0.5, 0, -1], [0.5, 1, -1], [0.5, 1, 0]);                  // +x
  face(3, [-1, 0, 0], [-0.5, 0, -1], [-0.5, 0, 0], [-0.5, 1, 0], [-0.5, 1, -1]);             // -x
  face(4, [0, 1, 0], [-0.5, 1, 0], [0.5, 1, 0], [0.5, 1, -1], [-0.5, 1, -1]);                // top
  face(5, [0, -1, 0], [-0.5, 0, -1], [0.5, 0, -1], [0.5, 0, 0], [-0.5, 0, 0]);               // bottom
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(n, 3)); g.setAttribute('face', new THREE.Float32BufferAttribute(f, 1)); g.setIndex(idx); return g;
}
function r3City() {
  R3.chunks = [];
  for (const c of CITY.chunks.values()) {
    const entry = { c, meshes: [], cx: c.cx, cz: c.cz, r: CITY.size * 0.71 + c.hmax * 0.5, hmax: c.hmax };
    if (c.geo.nv) { const m = new THREE.Mesh(c.geo.build(), R3.geoMat); m.frustumCulled = false; entry.meshes.push(m); }
    if (c.top.nv) { const m = new THREE.Mesh(c.top.build(), R3.topMat); m.frustumCulled = false; entry.meshes.push(m); }
    if (c.boxes.n) {
      const N = c.boxes.n, A = c.boxes.a, pos = new Float32Array(N * 3), size = new Float32Array(N * 3), yaw = new Float32Array(N), tf = new Float32Array(N * 4), ts = new Float32Array(N * 4), tt = new Float32Array(N * 4), col = new Float32Array(N * 3), rep = new Float32Array(N * 3);
      for (let i = 0; i < N; i++) { const o = i * BOX_STRIDE; pos[i * 3] = A[o]; pos[i * 3 + 1] = A[o + 1]; pos[i * 3 + 2] = A[o + 2]; size[i * 3] = A[o + 3]; size[i * 3 + 1] = A[o + 4]; size[i * 3 + 2] = A[o + 5]; yaw[i] = A[o + 6]; for (let k = 0; k < 4; k++) { tf[i * 4 + k] = A[o + 7 + k]; ts[i * 4 + k] = A[o + 11 + k]; tt[i * 4 + k] = A[o + 15 + k]; } col[i * 3] = A[o + 19]; col[i * 3 + 1] = A[o + 20]; col[i * 3 + 2] = A[o + 21]; rep[i * 3] = A[o + 22]; rep[i * 3 + 1] = A[o + 23]; rep[i * 3 + 2] = A[o + 24]; }
      const g = new THREE.InstancedBufferGeometry().copy(R3.unitBox); g.instanceCount = N;
      g.setAttribute('iPos', new THREE.InstancedBufferAttribute(pos, 3)); g.setAttribute('iSize', new THREE.InstancedBufferAttribute(size, 3)); g.setAttribute('iYaw', new THREE.InstancedBufferAttribute(yaw, 1)); g.setAttribute('iTF', new THREE.InstancedBufferAttribute(tf, 4)); g.setAttribute('iTS', new THREE.InstancedBufferAttribute(ts, 4)); g.setAttribute('iTT', new THREE.InstancedBufferAttribute(tt, 4)); g.setAttribute('iCol', new THREE.InstancedBufferAttribute(col, 3)); g.setAttribute('iRep', new THREE.InstancedBufferAttribute(rep, 3));
      const m = new THREE.Mesh(g, R3.boxMat); m.frustumCulled = false; entry.meshes.push(m);
      c.boxes.a = null;
    }
    for (const m of entry.meshes) scene3Add(m);
    R3.chunks.push(entry);
    c.geo = null; c.top = null;
  }
  R3.frustum = new THREE.Frustum(); R3.projView = new THREE.Matrix4(); R3.sphere = new THREE.Sphere();
}
// which chunks to draw: those within the fog and in front of the camera
function r3Cull() {
  const cam = R3.cam; cam.updateMatrixWorld(); R3.projView.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse); R3.frustum.setFromProjectionMatrix(R3.projView);
  let drawn = 0;
  for (const e of R3.chunks) {
    const d = Math.hypot(e.cx - cam.position.x, e.cz - cam.position.z) - e.r, far = d > FOG_FAR;
    let vis = !far;
    if (vis) { R3.sphere.center.set(e.cx, e.hmax * 0.5, e.cz); R3.sphere.radius = e.r; vis = R3.frustum.intersectsSphere(R3.sphere); }
    for (const m of e.meshes) m.visible = vis;
    if (vis) drawn++;
  }
  R3.drawn = drawn;
}
// ---------- the props: an atlas and one instanced quad ----------
function r3Props() {
  const kinds = Object.values(PROPS.kinds), AW = 1024;
  let x = 0, y = 0, rowH = 0; const atlas = canvas(AW, AW), g = atlas.getContext('2d');
  kinds.sort((a, b) => b.px.h - a.px.h);
  for (const K of kinds) { const w = K.px.w, h = K.px.h; if (x + w > AW) { x = 0; y += rowH; rowH = 0; } if (y + h > AW) break; g.drawImage(K.px.toCanvas(), x, y); K.uv = [x / AW, 1 - (y + h) / AW, (x + w) / AW, 1 - y / AW]; x += w + 1; rowH = Math.max(rowH, h + 1); }
  const tex = new THREE.CanvasTexture(atlas); tex.magFilter = THREE.NearestFilter; tex.minFilter = THREE.NearestFilter; tex.generateMipmaps = false; tex.colorSpace = THREE.SRGBColorSpace;
  const n = PROPS.list.length, pos = new Float32Array(n * 3), size = new Float32Array(n * 2), uv = new Float32Array(n * 4), flip = new Float32Array(n);
  PROPS.list.forEach((p, i) => { const K = PROPS.kinds[p.k]; pos[i * 3] = p.x; pos[i * 3 + 1] = p.y - 0.05; pos[i * 3 + 2] = p.z; size[i * 2] = K.wM * p.s; size[i * 2 + 1] = K.hM * p.s; uv.set(K.uv, i * 4); flip[i] = p.flip ? 1 : 0; });
  const geo = new THREE.InstancedBufferGeometry().copy(new THREE.PlaneGeometry(1, 1)); geo.instanceCount = n;
  geo.setAttribute('iPos', new THREE.InstancedBufferAttribute(pos, 3)); geo.setAttribute('iSize', new THREE.InstancedBufferAttribute(size, 2)); geo.setAttribute('iUV', new THREE.InstancedBufferAttribute(uv, 4)); geo.setAttribute('iFlip', new THREE.InstancedBufferAttribute(flip, 1));
  const mat = new THREE.ShaderMaterial({ vertexShader: BILLBOARD_VS, fragmentShader: BILLBOARD_FS, uniforms: { map: { value: tex }, camPos: { value: new THREE.Vector3() }, tint: { value: new THREE.Vector3(1, 1, 1) }, fogColor: { value: new THREE.Color(R3.tod.fog) }, fogNear: { value: FOG_NEAR }, fogFar: { value: FOG_FAR } }, transparent: false });
  const m = new THREE.Mesh(geo, mat); m.frustumCulled = false; scene3Add(m); R3.propMesh = m; R3.propUV = geo.getAttribute('iUV'); R3.propTex = tex;
  // the walkers: the same atlas, a mesh of their own whose instances move
  const N = PEO.max, g2 = new THREE.InstancedBufferGeometry().copy(new THREE.PlaneGeometry(1, 1)); g2.instanceCount = 0;
  const A = { pos: new THREE.InstancedBufferAttribute(new Float32Array(N * 3), 3), size: new THREE.InstancedBufferAttribute(new Float32Array(N * 2), 2), uv: new THREE.InstancedBufferAttribute(new Float32Array(N * 4), 4), flip: new THREE.InstancedBufferAttribute(new Float32Array(N), 1) };
  for (const a of Object.values(A)) a.setUsage(THREE.DynamicDrawUsage);
  g2.setAttribute('iPos', A.pos); g2.setAttribute('iSize', A.size); g2.setAttribute('iUV', A.uv); g2.setAttribute('iFlip', A.flip);
  const m2 = new THREE.Mesh(g2, mat); m2.frustumCulled = false; scene3Add(m2); R3.peopleMesh = m2; R3.peopleA = A;
  // and the little things that change: the countdown digits on the signals, the brake lamps of the traffic
  const N3 = 1600, g3 = new THREE.InstancedBufferGeometry().copy(new THREE.PlaneGeometry(1, 1)); g3.instanceCount = 0;
  const B = { pos: new THREE.InstancedBufferAttribute(new Float32Array(N3 * 3), 3), size: new THREE.InstancedBufferAttribute(new Float32Array(N3 * 2), 2), uv: new THREE.InstancedBufferAttribute(new Float32Array(N3 * 4), 4), flip: new THREE.InstancedBufferAttribute(new Float32Array(N3), 1) };
  for (const a of Object.values(B)) a.setUsage(THREE.DynamicDrawUsage);
  g3.setAttribute('iPos', B.pos); g3.setAttribute('iSize', B.size); g3.setAttribute('iUV', B.uv); g3.setAttribute('iFlip', B.flip);
  const m3 = new THREE.Mesh(g3, mat); m3.frustumCulled = false; scene3Add(m3); R3.fxMesh = m3; R3.fxA = B; R3.fxMax = N3;
}
function r3FxUpdate() {
  const m = R3.fxMesh; if (!m) return; const A = R3.fxA, cam = R3.cam.position; let k = 0;
  const put = (name, x, y, z) => { if (k >= R3.fxMax) return; const K = PROPS.kinds[name]; if (!K) return; A.pos.array[k * 3] = x; A.pos.array[k * 3 + 1] = y; A.pos.array[k * 3 + 2] = z; A.size.array[k * 2] = K.wM; A.size.array[k * 2 + 1] = K.hM; A.uv.array.set(K.uv, k * 4); A.flip.array[k] = 0; k++; };
  for (const s of CITY.signals) {
    const dx = s.x - cam.x, dz = s.z - cam.z; if (dx * dx + dz * dz > 160 * 160) continue;
    // only the side facing the driver shows: the camera must be on the approach side
    if (dx * s.ux + dz * s.uz > 0) continue;
    const st = s.state || 'red'; if (st === 'yellow') continue;
    const n = Math.min(99, Math.ceil(signalRemain(s.node, s.phase))), tens = Math.floor(n / 10), ones = n % 10, pre = st === 'red' ? 'dr' : 'dg';
    put(pre + tens, s.x - s.rx * 0.15 - s.ux * 0.14, s.y + 0.03, s.z - s.rz * 0.15 - s.uz * 0.14); put(pre + ones, s.x + s.rx * 0.15 - s.ux * 0.14, s.y + 0.03, s.z + s.rz * 0.15 - s.uz * 0.14);
  }
  // the jobs on offer, and the way to go on the one in hand
  const bob = Math.sin(G.t * 3) * 0.25;
  if (!MIS.active) for (const j of MIS.avail) { put(j.icon, j.x, j.y == null ? (j.y = terrainH(j.x, j.z)) : j.y, j.z); if (j.kind === 'taxi') put(j.person || (j.person = 'person' + Math.floor(Math.random() * 8)), j.x + Math.cos(j.yaw) * 1.2, j.y, j.z - Math.sin(j.yaw) * 1.2); }
  else { const A = MIS.active; put(A.kind === 'trial' && A.cpi < A.cps.length - 1 ? 'mk_cp' : 'mk_goal', A.tx, terrainH(A.tx, A.tz) + 1.2 + bob, A.tz); if (A.kind === 'trial') for (let i = A.cpi + 1; i < Math.min(A.cps.length, A.cpi + 3); i++) put('mk_cp', A.cps[i][0], terrainH(A.cps[i][0], A.cps[i][1]) + 1.2 + bob, A.cps[i][1]); }
  // after dark: the street lamps, and headlights on everything that moves
  if (R3.todKind === 'night' || R3.todKind === 'dusk') {
    const R = R3.todKind === 'night' ? 170 : 90;
    for (const l of CITY.lamps) { const dx = l.x - cam.x, dz = l.z - cam.z; if (dx * dx + dz * dz < R * R) put('glow_lamp', l.x, l.y, l.z); }
    const C = CAR; if (!CAMV.fp) { const hx = Math.sin(C.yaw), hz = Math.cos(C.yaw), rx_ = Math.cos(C.yaw), rz_ = -Math.sin(C.yaw), fx = C.x + hx * (C.P.L / 2 + 0.1), fz = C.z + hz * (C.P.L / 2 + 0.1); for (const sd of [-1, 1]) put('glow_head', fx + rx_ * sd * C.P.W * 0.34, C.y + 0.6, fz + rz_ * sd * C.P.W * 0.34); }
    for (const v of TR.veh) { const dx = v.x - cam.x, dz = v.z - cam.z; if (dx * dx + dz * dz > 140 * 140) continue; const hx = Math.sin(v.yaw), hz = Math.cos(v.yaw); if (dx * hx + dz * hz > 0) continue; const rx_ = Math.cos(v.yaw), rz_ = -Math.sin(v.yaw), fx = v.x + hx * (v.L / 2 + 0.05), fz = v.z + hz * (v.L / 2 + 0.05), w = v.type === 'scooter' ? 0 : v.W * 0.32; if (w) { put('glow_head', fx + rx_ * w, v.y + 0.6, fz + rz_ * w); put('glow_head', fx - rx_ * w, v.y + 0.6, fz - rz_ * w); } else put('glow_head', fx, v.y + 0.6, fz); }
  }
  for (const v of TR.veh) {
    if (!v.brake) continue; const dx = v.x - cam.x, dz = v.z - cam.z; if (dx * dx + dz * dz > 120 * 120) continue;
    const hx = Math.sin(v.yaw), hz = Math.cos(v.yaw); if (dx * hx + dz * hz < 0) continue;   // its tail toward us
    const rx_ = Math.cos(v.yaw), rz_ = -Math.sin(v.yaw), bx = v.x - hx * (v.L / 2 + 0.05), bz = v.z - hz * (v.L / 2 + 0.05), w = v.type === 'scooter' ? 0 : v.W * 0.32, y = v.y + (v.type === 'bus' ? 0.9 : v.type === 'truck' ? 0.8 : v.type === 'scooter' ? 0.55 : 0.55);
    if (w) { put('glow_red', bx + rx_ * w, y, bz + rz_ * w); put('glow_red', bx - rx_ * w, y, bz - rz_ * w); } else put('glow_red', bx, y, bz);
  }
  m.geometry.instanceCount = k; for (const a of Object.values(A)) a.needsUpdate = true;
}
function r3PeopleUpdate() {
  const m = R3.peopleMesh; if (!m) return; const A = R3.peopleA, cam = R3.cam.position; let k = 0;
  for (const w of PEO.list) {
    if (k >= PEO.max) break;
    const name = w.knocked > 0 ? w.kind + 'd' : (w.anim % 0.7 < 0.35 ? w.kind : w.kind + 'w'), K = PROPS.kinds[name]; if (!K) continue;
    A.pos.array[k * 3] = w.x; A.pos.array[k * 3 + 1] = w.y - 0.05; A.pos.array[k * 3 + 2] = w.z;
    A.size.array[k * 2] = K.wM; A.size.array[k * 2 + 1] = K.hM; A.uv.array.set(K.uv, k * 4);
    const rx_ = cam.z - w.z, rz_ = -(cam.x - w.x); A.flip.array[k] = (Math.sin(w.yaw) * rx_ + Math.cos(w.yaw) * rz_) > 0 ? 1 : 0;   // facing the way they walk
    k++;
  }
  m.geometry.instanceCount = k; for (const a of Object.values(A)) a.needsUpdate = true;
}
// ---------- the traffic: every vehicle a billboard showing the frame nearest its angle to the camera ----------
function r3Traffic() {
  const AW = 2048, atlas = canvas(AW, AW), g = atlas.getContext('2d'), items = [];
  for (const K of Object.values(TRF.kinds)) K.frames.forEach((f, i) => items.push({ K, i, f }));
  items.sort((a, b) => b.f.px.h - a.f.px.h);
  let x = 0, y = 0, rowH = 0;
  for (const it of items) { const w = it.f.px.w, h = it.f.px.h; if (x + w + 2 > AW) { x = 0; y += rowH + 2; rowH = 0; } if (y + h + 2 > AW) { reportErr('traffic atlas full'); break; } g.drawImage(it.f.px.toCanvas(), x + 1, y + 1); it.f.uv = [(x + 1) / AW, 1 - (y + 1 + h) / AW, (x + 1 + w) / AW, 1 - (y + 1) / AW]; x += w + 2; rowH = Math.max(rowH, h); }
  const tex = new THREE.CanvasTexture(atlas); tex.magFilter = THREE.NearestFilter; tex.minFilter = THREE.LinearFilter; tex.generateMipmaps = false; tex.colorSpace = THREE.SRGBColorSpace;
  const n = TR.max, pos = new Float32Array(n * 3), size = new Float32Array(n * 2), uv = new Float32Array(n * 4), flip = new Float32Array(n);
  const geo = new THREE.InstancedBufferGeometry().copy(new THREE.PlaneGeometry(1, 1)); geo.instanceCount = 0;
  const A = { pos: new THREE.InstancedBufferAttribute(pos, 3), size: new THREE.InstancedBufferAttribute(size, 2), uv: new THREE.InstancedBufferAttribute(uv, 4), flip: new THREE.InstancedBufferAttribute(flip, 1) };
  for (const a of Object.values(A)) a.setUsage(THREE.DynamicDrawUsage);
  geo.setAttribute('iPos', A.pos); geo.setAttribute('iSize', A.size); geo.setAttribute('iUV', A.uv); geo.setAttribute('iFlip', A.flip);
  const mat = new THREE.ShaderMaterial({ vertexShader: BILLBOARD_VS, fragmentShader: BILLBOARD_FS, uniforms: { map: { value: tex }, camPos: { value: new THREE.Vector3() }, tint: { value: new THREE.Vector3(1, 1, 1) }, fogColor: { value: new THREE.Color(R3.tod.fog) }, fogNear: { value: FOG_NEAR }, fogFar: { value: FOG_FAR } }, transparent: false });
  const m = new THREE.Mesh(geo, mat); m.frustumCulled = false; scene3Add(m); R3.trafficMesh = m; R3.trafficA = A;
}
function r3TrafficUpdate() {
  const m = R3.trafficMesh; if (!m) return; const A = R3.trafficA, cam = R3.cam.position, N = TRF.N; let k = 0;
  for (const v of TR.veh) {
    if (k >= TR.max) break;
    const look = Math.atan2(v.x - cam.x, v.z - cam.z), rel = angWrap(v.yaw - look);
    const i = Math.min(N - 1, Math.round(Math.abs(rel) / (Math.PI / (N - 1)))), f = v.K.frames[i], ppm = v.K.type === 'bus' || v.kind === 'gravel' ? TRF.ppmLong : TRF.ppm;
    A.pos.array[k * 3] = v.x; A.pos.array[k * 3 + 1] = v.y - 3 / ppm; A.pos.array[k * 3 + 2] = v.z;
    A.size.array[k * 2] = f.wM; A.size.array[k * 2 + 1] = f.hM; A.uv.array.set(f.uv, k * 4); A.flip.array[k] = rel > 0 ? 1 : 0;
    k++;
  }
  m.geometry.instanceCount = k; for (const a of Object.values(A)) a.needsUpdate = true;
  m.material.uniforms.camPos.value.copy(cam);
}
// a prop's picture swapped for another of the same atlas (the signal lamps)
function propSetKind(p, name) { if (!p || p.k === name) return; const K = PROPS.kinds[name]; if (!K || !R3.propUV) return; p.k = name; R3.propUV.array.set(K.uv, p.i * 4); R3.propUV.needsUpdate = true; }
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
  _e.set(0, yaw, 0); _q.setFromEuler(_e); _p.set(x + Math.cos(yaw) * side * 0.8, CAR.y + 0.03, z - Math.sin(yaw) * side * 0.8); _m4.compose(_p, _q, _s); m.setMatrixAt(i, _m4); m.instanceMatrix.needsUpdate = true;
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
    float coc = clamp((d - focus) / (focus * 5.0), 0.0, 1.0) * 0.75 + clamp((focus * 0.5 - d) / (focus * 0.5), 0.0, 1.0) * 0.6;
    float tilt = smoothstep(0.4, 0.5, abs(vUv.y - 0.5));
    float k = clamp(coc * 0.7 + tilt * 0.3, 0.0, 1.0);
    vec3 c = mix(sharp.rgb, soft.rgb, k) + texture2D(bloom, vUv).rgb * 0.5;
    c *= grade; vec2 q = (vUv - 0.5) * vec2(aspect, 1.0); c *= 1.0 - dot(q, q) * 0.5;
    gl_FragColor = vec4(pow(max(c, 0.0), vec3(1.0 / 2.2)), 1.0); }`;
function r3Post() {
  const mk = (w, h, depth) => { const rt = new THREE.WebGLRenderTarget(w, h, { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter }); if (depth) { rt.depthTexture = new THREE.DepthTexture(w, h); rt.depthTexture.type = THREE.UnsignedIntType; } return rt; };
  const P = { mk, quad: new THREE.Mesh(new THREE.PlaneGeometry(2, 2)), scene: new THREE.Scene(), cam: new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1) };
  P.scene.add(P.quad);
  P.blur = new THREE.ShaderMaterial({ vertexShader: QUAD_VS, fragmentShader: BLUR_FS, uniforms: { tex: { value: null }, dir: { value: new THREE.Vector2() } }, depthTest: false });
  P.bright = new THREE.ShaderMaterial({ vertexShader: QUAD_VS, fragmentShader: BRIGHT_FS, uniforms: { tex: { value: null } }, depthTest: false });
  P.comp = new THREE.ShaderMaterial({ vertexShader: QUAD_VS, fragmentShader: COMP_FS, uniforms: { tex: { value: null }, blur: { value: null }, bloom: { value: null }, depthTex: { value: null }, near: { value: 0.6 }, far: { value: 2600 }, focus: { value: 14 }, aspect: { value: 1.7 }, grade: { value: new THREE.Vector3(1.03, 1.0, 0.96) } }, depthTest: false });
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
  r3Cull();
  if (!P || SET.quality === 'off' || R3.postFail) { rd.setRenderTarget(null); rd.render(R3.scene, R3.cam); return; }
  try { r3FrameFX(focusDist); } catch (e) { R3.postFail = true; reportErr('fx: ' + e.message); rd.setRenderTarget(null); rd.render(R3.scene, R3.cam); }
}
function r3FrameFX(focusDist) {
  const rd = R3.renderer, P = R3.post;
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
    // the turntable's frame i shows the car turned i/N of a turn to the right of head-on from behind
    const rel = angWrap(C.yaw - camYaw), i = Math.round((-rel / TAU) * TURN_N);
    r3CarFrame(i);
    R3.car.position.set(C.x, C.y, C.z); R3.car.rotation.y = camYaw;   // the quad faces the camera
    R3.shadow.position.set(C.x, C.y + 0.02, C.z); R3.shadow.rotation.y = C.yaw - Math.PI / 2;
  }
  R3.propMesh.material.uniforms.camPos.value.copy(R3.cam.position);
  if (R3.sky) R3.sky.position.copy(R3.cam.position);
  r3TrafficUpdate(); r3PeopleUpdate(); r3FxUpdate();
  if (CITY.wheel) CITY.wheel.rotation.z += 0.0025;
}
