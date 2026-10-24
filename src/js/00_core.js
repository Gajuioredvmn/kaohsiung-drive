// ===================== core: helpers and the game screen =====================
// The whole game is painted in 2D at a low internal resolution (360 rows) and scaled up with hard pixels,
// the way the arcade boards did it: a road raster, then sprites scaled by distance, back to front.
const TAU = Math.PI * 2;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (e0, e1, x) => { const t = clamp((x - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t); };
const sstep = (t) => t * t * (3 - 2 * t);
const angWrap = (a) => { while (a > Math.PI) a -= TAU; while (a < -Math.PI) a += TAU; return a; };
const $ = (id) => document.getElementById(id);
const reduceMotion = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
// deterministic random numbers: every stage builds the same scenery for every player
function mulberry(seed) {
  let a = seed >>> 0;
  const f = () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  f.range = (lo, hi) => lo + f() * (hi - lo);
  f.int = (lo, hi) => lo + Math.floor(f() * (hi - lo + 1));
  f.pick = (arr) => arr[Math.floor(f() * arr.length)];
  f.chance = (p) => f() < p;
  return f;
}
function strSeed(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function hash1(n) { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); }
function hash2(x, z) { const s = Math.sin(x * 127.1 + z * 311.7) * 43758.5453; return s - Math.floor(s); }
function vnoise1(x) { const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f); return lerp(hash1(i), hash1(i + 1), u); }
function vnoise2(x, z) {
  const xi = Math.floor(x), zi = Math.floor(z), xf = x - xi, zf = z - zi;
  const u = xf * xf * (3 - 2 * xf), v = zf * zf * (3 - 2 * zf);
  return lerp(lerp(hash2(xi, zi), hash2(xi + 1, zi), u), lerp(hash2(xi, zi + 1), hash2(xi + 1, zi + 1), u), v);
}
function fbm1(x) { return vnoise1(x) * 0.55 + vnoise1(x * 2.03 + 7.1) * 0.28 + vnoise1(x * 4.11 + 3.3) * 0.17; }
const fmtTime = (t) => { t = Math.max(0, t); const m = Math.floor(t / 60), s = t - m * 60; return m + "'" + String(Math.floor(s)).padStart(2, '0') + '"' + String(Math.floor((s % 1) * 100)).padStart(2, '0'); };
const kmh = (v) => v * 3.6;
const D2R = Math.PI / 180;

// ---------- the screen ----------
const view = $('gl');
const vctx = null;         // nothing is painted in 2D here: the painters only make pictures
const glCanvas = view;
const RH = 270;            // internal height in game pixels: chunky arcade pixels
let RW = 640;              // internal width follows the shape of the screen
const FOC = 296;           // focal length in game pixels: about 49 degrees of vertical view
let X0 = 320;              // screen centre
const Y0 = 112;            // the horizon line
const PXK = RH / 360;      // backdrop art was laid out for 360 rows
const PANO_W = Math.round(TAU * FOC); // one turn of the horizon in game pixels

// ---------- small helpers ----------
function canvas(w, h) { const c = document.createElement('canvas'); c.width = Math.max(1, w | 0); c.height = Math.max(1, h | 0); return c; }
function hexToRgb(hex) { return [((hex >> 16) & 255) / 255, ((hex >> 8) & 255) / 255, (hex & 255) / 255]; }
function mixHex(a, b, t) {
  const A = hexToRgb(a), B = hexToRgb(b);
  return (Math.round(lerp(A[0], B[0], t) * 255) << 16) | (Math.round(lerp(A[1], B[1], t) * 255) << 8) | Math.round(lerp(A[2], B[2], t) * 255);
}
function shadeHex(hex, k) { const A = hexToRgb(hex); return (Math.round(clamp(A[0] * k, 0, 1) * 255) << 16) | (Math.round(clamp(A[1] * k, 0, 1) * 255) << 8) | Math.round(clamp(A[2] * k, 0, 1) * 255); }
const cssHex = (hex) => '#' + (hex & 0xffffff).toString(16).padStart(6, '0');
const rgbaHex = (hex, a) => 'rgba(' + ((hex >> 16) & 255) + ',' + ((hex >> 8) & 255) + ',' + (hex & 255) + ',' + a.toFixed(3) + ')';
// 0xRRGGBB to a little-endian 32-bit pixel (ABGR in memory) for the road raster
const px32 = (hex) => (0xff000000 | ((hex & 255) << 16) | (hex & 0xff00) | ((hex >> 16) & 255)) >>> 0;
const rgb = (hex) => [(hex >> 16) & 255, (hex >> 8) & 255, hex & 255];
