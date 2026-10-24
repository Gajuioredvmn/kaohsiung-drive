// ===================== pixel painter: every sprite in the game is painted here, pixel by pixel =====================
// No anti-aliasing: shapes are scan-converted, shading is banded with ordered dithering,
// and outlines are added at the end, which is what makes them read as arcade sprites.
const BAYER4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
class Pix {
  constructor(w, h) { this.w = w | 0; this.h = h | 0; this.d = new Uint8ClampedArray(this.w * this.h * 4); }
  set(x, y, c) {
    x = Math.floor(x); y = Math.floor(y);
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    const i = (y * this.w + x) * 4; this.d[i] = (c >> 16) & 255; this.d[i + 1] = (c >> 8) & 255; this.d[i + 2] = c & 255; this.d[i + 3] = 255;
  }
  clear(x, y) { x = Math.floor(x); y = Math.floor(y); if (x < 0 || y < 0 || x >= this.w || y >= this.h) return; this.d[(y * this.w + x) * 4 + 3] = 0; }
  get(x, y) {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return -1;
    const i = (y * this.w + x) * 4; if (this.d[i + 3] < 128) return -1;
    return (this.d[i] << 16) | (this.d[i + 1] << 8) | this.d[i + 2];
  }
  on(x, y) { return x >= 0 && y >= 0 && x < this.w && y < this.h && this.d[(y * this.w + x) * 4 + 3] > 127; }
  // ordered dither between two colours: t in 0..1 is the share of b
  dset(x, y, a, b, t) { const th = (BAYER4[(y & 3) * 4 + (x & 3)] + 0.5) / 16; this.set(x, y, t > th ? b : a); }
  rect(x, y, w, h, c) { for (let j = Math.floor(y); j < Math.floor(y + h); j++) for (let i = Math.floor(x); i < Math.floor(x + w); i++) this.set(i, j, c); }
  rectD(x, y, w, h, a, b, t) { for (let j = Math.floor(y); j < Math.floor(y + h); j++) for (let i = Math.floor(x); i < Math.floor(x + w); i++) this.dset(i, j, a, b, t); }
  // vertical gradient through a list of colours, dithered between steps
  vgrad(x, y, w, h, cols) {
    for (let j = 0; j < h; j++) {
      const t = (j / Math.max(1, h - 1)) * (cols.length - 1), k = Math.min(cols.length - 2, Math.floor(t));
      for (let i = 0; i < w; i++) this.dset(x + i, y + j, cols[k], cols[k + 1], t - k);
    }
  }
  hgrad(x, y, w, h, cols) {
    for (let i = 0; i < w; i++) {
      const t = (i / Math.max(1, w - 1)) * (cols.length - 1), k = Math.min(cols.length - 2, Math.floor(t));
      for (let j = 0; j < h; j++) this.dset(x + i, y + j, cols[k], cols[k + 1], t - k);
    }
  }
  ellipse(cx, cy, rx, ry, c) {
    for (let j = Math.floor(cy - ry); j <= Math.ceil(cy + ry); j++) for (let i = Math.floor(cx - rx); i <= Math.ceil(cx + rx); i++) {
      const dx = (i + 0.5 - cx) / rx, dy = (j + 0.5 - cy) / ry; if (dx * dx + dy * dy <= 1) this.set(i, j, c);
    }
  }
  // a lit ball: bands from a light direction, dithered at the band edges; cols dark -> light
  ball(cx, cy, rx, ry, cols, lx, ly, rough) {
    const L = Math.hypot(lx, ly) || 1; lx /= L; ly /= L;
    for (let j = Math.floor(cy - ry); j <= Math.ceil(cy + ry); j++) for (let i = Math.floor(cx - rx); i <= Math.ceil(cx + rx); i++) {
      const dx = (i + 0.5 - cx) / rx, dy = (j + 0.5 - cy) / ry, r2 = dx * dx + dy * dy;
      if (r2 > 1) continue;
      if (rough && r2 > 0.6 && hash2(i * 1.3 + cx, j * 1.7 + cy) < rough * (r2 - 0.6) * 2.5) continue;
      const nz = Math.sqrt(1 - r2), l = clamp((dx * lx + dy * ly) * 0.8 + nz * 0.55, 0, 1);
      const t = l * (cols.length - 1), k = Math.min(cols.length - 2, Math.floor(t));
      this.dset(i, j, cols[k], cols[k + 1], smooth(0.35, 0.65, t - k));
    }
  }
  poly(pts, c) {
    let y0 = Infinity, y1 = -Infinity;
    for (let k = 0; k < pts.length; k += 2) { y0 = Math.min(y0, pts[k + 1]); y1 = Math.max(y1, pts[k + 1]); }
    const n = pts.length / 2, xs = [];
    for (let y = Math.floor(y0); y <= Math.ceil(y1); y++) {
      const yc = y + 0.5; xs.length = 0;
      for (let a = 0; a < n; a++) {
        const b = (a + 1) % n, ax = pts[a * 2], ay = pts[a * 2 + 1], bx = pts[b * 2], by = pts[b * 2 + 1];
        if ((ay <= yc && by > yc) || (by <= yc && ay > yc)) xs.push(ax + ((yc - ay) / (by - ay)) * (bx - ax));
      }
      xs.sort((p, q) => p - q);
      for (let k = 0; k + 1 < xs.length; k += 2) for (let x = Math.round(xs[k]); x < Math.round(xs[k + 1]); x++) this.set(x, y, c);
    }
  }
  // a polygon filled with an ordered dither between two colours (t = the share of b)
  polyD(pts, a, b, t) {
    let y0 = Infinity, y1 = -Infinity;
    for (let k = 0; k < pts.length; k += 2) { y0 = Math.min(y0, pts[k + 1]); y1 = Math.max(y1, pts[k + 1]); }
    const n = pts.length / 2, xs = [];
    for (let y = Math.floor(y0); y <= Math.ceil(y1); y++) {
      const yc = y + 0.5; xs.length = 0;
      for (let q = 0; q < n; q++) {
        const r = (q + 1) % n, ax = pts[q * 2], ay = pts[q * 2 + 1], bx = pts[r * 2], by = pts[r * 2 + 1];
        if ((ay <= yc && by > yc) || (by <= yc && ay > yc)) xs.push(ax + ((yc - ay) / (by - ay)) * (bx - ax));
      }
      xs.sort((p, q) => p - q);
      for (let k = 0; k + 1 < xs.length; k += 2) for (let x = Math.round(xs[k]); x < Math.round(xs[k + 1]); x++) this.dset(x, y, a, b, t == null ? 0.5 : t);
    }
  }
  line(x0, y0, x1, y1, c, w) {
    w = w || 1;
    const n = Math.max(1, Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0))));
    for (let k = 0; k <= n; k++) {
      const t = k / n, x = x0 + (x1 - x0) * t, y = y0 + (y1 - y0) * t;
      if (w <= 1) this.set(x, y, c); else this.rect(Math.round(x - w / 2), Math.round(y - w / 2), w, w, c);
    }
  }
  // quadratic bezier as a pixel line with a width that tapers from w0 to w1
  curve(x0, y0, cx, cy, x1, y1, c, w0, w1, cb) {
    const n = Math.ceil((Math.hypot(cx - x0, cy - y0) + Math.hypot(x1 - cx, y1 - cy)) * 1.2) + 2;
    for (let k = 0; k <= n; k++) {
      const t = k / n, u = 1 - t, x = u * u * x0 + 2 * u * t * cx + t * t * x1, y = u * u * y0 + 2 * u * t * cy + t * t * y1;
      const w = lerp(w0, w1, t);
      if (cb) cb(x, y, t, w); else if (w <= 1.2) this.set(x, y, c); else this.ellipse(x, y, w / 2, w / 2, c);
    }
  }
  // 1-px outline around every opaque area (8-neighbour), coloured by a darker version of the neighbour, or fixed
  outline(fixed, k) {
    const src = new Uint8ClampedArray(this.d), W = this.w, H = this.h, kk = k == null ? 0.42 : k;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4; if (src[i + 3] > 127) continue;
      let best = -1;
      for (let dy = -1; dy <= 1 && best < 0; dy++) for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue; const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue;
        const j = (yy * W + xx) * 4; if (src[j + 3] > 127 && !(dx && dy && (Math.abs(dx) + Math.abs(dy) === 2) && false)) { best = j; break; }
      }
      if (best < 0) continue;
      if (fixed != null) { this.set(x, y, fixed); continue; }
      this.d[i] = src[best] * kk; this.d[i + 1] = src[best + 1] * kk; this.d[i + 2] = src[best + 2] * kk; this.d[i + 3] = 255;
    }
  }
  // darken the inner edge of shapes that touch transparency on the side away from the light (a cheap rim shade)
  innerShade(k, dx, dy) {
    const src = new Uint8ClampedArray(this.d), W = this.w, H = this.h;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4; if (src[i + 3] < 128) continue;
      const xx = x + dx, yy = y + dy; const out = xx < 0 || yy < 0 || xx >= W || yy >= H || src[(yy * W + xx) * 4 + 3] < 128;
      if (out) { this.d[i] = src[i] * k; this.d[i + 1] = src[i + 1] * k; this.d[i + 2] = src[i + 2] * k; }
    }
  }
  // text through a scratch canvas, kept only where it is solid (no soft edges)
  text(str, x, y, size, c, opts) {
    const o = opts || {};
    const font = (o.weight || 900) + ' ' + size + 'px ' + (o.font || '"Noto Sans TC","PingFang TC","Microsoft JhengHei",sans-serif');
    const sc = canvas(Math.max(8, Math.ceil(size * (str.length + 1) * 1.1)), Math.ceil(size * 1.5) + 4), g = sc.getContext('2d');
    g.font = font; g.textBaseline = 'top'; g.fillStyle = '#fff';
    let tw = g.measureText(str).width;
    let sx = 1;
    if (o.maxW && tw > o.maxW) sx = o.maxW / tw;
    g.setTransform(sx, 0, 0, 1, 0, 0); g.fillText(str, 1, 1); tw *= sx;
    const img = g.getImageData(0, 0, sc.width, sc.height).data;
    const ox = o.align === 'center' ? Math.round(x - tw / 2) : o.align === 'right' ? Math.round(x - tw) : Math.round(x);
    const th = o.th || 110;
    for (let j = 0; j < sc.height; j++) for (let i = 0; i < sc.width; i++) if (img[(j * sc.width + i) * 4 + 3] > th) this.set(ox + i - 1, y + j - 1, c);
    return tw;
  }
  // vertical text (signboards read top to bottom)
  vtext(str, cx, y, size, c, gap) {
    let yy = y; for (const ch of str) { this.text(ch, cx, yy, size, c, { align: 'center' }); yy += size + (gap == null ? 1 : gap); }
  }
  flipX() { const W = this.w, H = this.h, s = new Uint8ClampedArray(this.d); for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const a = (y * W + x) * 4, b = (y * W + (W - 1 - x)) * 4; for (let k = 0; k < 4; k++) this.d[a + k] = s[b + k]; } }
  blit(src, ox, oy) { for (let y = 0; y < src.h; y++) for (let x = 0; x < src.w; x++) { const i = (y * src.w + x) * 4; if (src.d[i + 3] > 127) this.set(ox + x, oy + y, (src.d[i] << 16) | (src.d[i + 1] << 8) | src.d[i + 2]); } }
  toCanvas() { const c = canvas(this.w, this.h); c.getContext('2d').putImageData(new ImageData(this.d, this.w, this.h), 0, 0); return c; }
}
// palette helpers: a ramp from dark to light around a base colour
function ramp(base, n, lo, hi) { const out = []; for (let i = 0; i < n; i++) out.push(shadeHex(base, lerp(lo == null ? 0.55 : lo, hi == null ? 1.25 : hi, i / (n - 1)))); return out; }
