// ===================== the illustrated look: a vector pen with the pixel painter's calls =====================
// The 插畫 style (the default) draws the same sprites as the pixel painter, but on a canvas at a higher scale and with
// smooth edges: polygons and ellipses are filled as shapes, gradients become flat bands, dithering becomes a clean
// split, and the outline is a dark ink line laid round the silhouette. Painters keep working in their own pixel units;
// only the canvas they land on is bigger (cw × ch). STYLE.toon is set from the settings before anything is painted.
const STYLE = { toon: true };
const INK = '#2b2233', INKN = 0x2b2233;
class VPix {
  constructor(w, h, s) {
    this.w = w | 0; this.h = h | 0; this.s = s || 2; this.vec = true;
    this.cv = canvas(Math.ceil(this.w * this.s), Math.ceil(this.h * this.s)); this.cw = this.cv.width; this.ch = this.cv.height;
    this.g = this.cv.getContext('2d'); this.g.setTransform(this.s, 0, 0, this.s, 0, 0); this.g.lineJoin = 'round'; this.g.lineCap = 'round';
    this._snap = null; this.olw = 1;
  }
  _fill(c) { this.g.fillStyle = cssHex(c); this._snap = null; }
  set(x, y, c) { this._fill(c); this.g.fillRect(Math.floor(x), Math.floor(y), 1, 1); }
  clear(x, y) { this.g.clearRect(Math.floor(x), Math.floor(y), 1, 1); this._snap = null; }
  _shot() { if (!this._snap) this._snap = this.g.getImageData(0, 0, this.cw, this.ch).data; return this._snap; }
  get(x, y) {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return -1;
    const d = this._shot(), X = Math.min(this.cw - 1, Math.floor((x + 0.5) * this.s)), Y = Math.min(this.ch - 1, Math.floor((y + 0.5) * this.s)), i = (Y * this.cw + X) * 4;
    if (d[i + 3] < 128) return -1; return (d[i] << 16) | (d[i + 1] << 8) | d[i + 2];
  }
  on(x, y) { return this.get(x, y) >= 0; }
  dset(x, y, a, b, t) { this.set(x, y, t > 0.5 ? b : a); }
  rect(x, y, w, h, c) { if (w <= 0 || h <= 0) return; this._fill(c); this.g.fillRect(x, y, w, h); }
  rectD(x, y, w, h, a, b, t) { this.rect(x, y, w, h, t > 0.5 ? b : a); }
  // gradients come out as flat bands, one per colour, the way a cartoon is coloured
  vgrad(x, y, w, h, cols) { const n = cols.length; for (let k = 0; k < n; k++) this.rect(x, y + (h * k) / n, w, h / n + (k < n - 1 ? 0.6 / this.s : 0), cols[k]); }
  hgrad(x, y, w, h, cols) { const n = cols.length; for (let k = 0; k < n; k++) this.rect(x + (w * k) / n, y, w / n + (k < n - 1 ? 0.6 / this.s : 0), h, cols[k]); }
  ellipse(cx, cy, rx, ry, c) { if (rx <= 0 || ry <= 0) return; this._fill(c); const g = this.g; g.beginPath(); g.ellipse(cx, cy, rx, ry, 0, 0, TAU); g.fill(); }
  // a lit ball: nested bands drawn smaller and toward the light
  ball(cx, cy, rx, ry, cols, lx, ly) {
    const L = Math.hypot(lx, ly) || 1, ux = lx / L, uy = ly / L, n = cols.length;
    for (let k = 0; k < n; k++) { const t = n > 1 ? k / (n - 1) : 0, f = 1 - 0.58 * t; this.ellipse(cx + ux * rx * 0.42 * t, cy + uy * ry * 0.42 * t, rx * f, ry * f, cols[k]); }
  }
  _path(pts) { const g = this.g; g.beginPath(); g.moveTo(pts[0], pts[1]); for (let k = 2; k < pts.length; k += 2) g.lineTo(pts[k], pts[k + 1]); g.closePath(); }
  // the stroke in the shape's own colour closes the hairline seams between neighbouring faces
  poly(pts, c) { if (pts.length < 6) return; this._fill(c); const g = this.g; this._path(pts); g.fill(); g.strokeStyle = cssHex(c); g.lineWidth = 0.9 / this.s; g.stroke(); }
  polyD(pts, a, b, t) { this.poly(pts, t == null || t > 0.5 ? b : a); }
  line(x0, y0, x1, y1, c, w) { const g = this.g; this._snap = null; g.strokeStyle = cssHex(c); g.lineWidth = Math.max(1, w || 1); g.beginPath(); g.moveTo(x0 + 0.5, y0 + 0.5); g.lineTo(x1 + 0.5, y1 + 0.5); g.stroke(); }
  curve(x0, y0, cx, cy, x1, y1, c, w0, w1, cb) {
    const n = Math.ceil((Math.hypot(cx - x0, cy - y0) + Math.hypot(x1 - cx, y1 - cy)) / 3) + 2, g = this.g; this._snap = null;
    let px_ = x0, py_ = y0;
    for (let k = 1; k <= n; k++) {
      const t = k / n, u = 1 - t, x = u * u * x0 + 2 * u * t * cx + t * t * x1, y = u * u * y0 + 2 * u * t * cy + t * t * y1, w = lerp(w0, w1, t);
      if (cb) cb(x, y, t, w); else { g.strokeStyle = cssHex(c); g.lineWidth = Math.max(0.6, w); g.beginPath(); g.moveTo(px_, py_); g.lineTo(x, y); g.stroke(); }
      px_ = x; py_ = y;
    }
  }
  // the ink: the silhouette, darkened, laid behind the picture in a ring of offsets
  outline(fixed) {
    const col = STYLE.toon ? INKN : (fixed != null ? fixed : INKN), r = this.s * this.olw;
    const sil = canvas(this.cw, this.ch), sg = sil.getContext('2d');
    sg.drawImage(this.cv, 0, 0); sg.globalCompositeOperation = 'source-in'; sg.fillStyle = cssHex(col); sg.fillRect(0, 0, this.cw, this.ch);
    const g = this.g; g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'destination-over';
    const n = 16; for (let i = 0; i < n; i++) { const a = (i / n) * TAU; g.drawImage(sil, Math.cos(a) * r, Math.sin(a) * r); }
    g.drawImage(sil, 0, 0); g.restore(); this._snap = null;
  }
  // the rim away from the light, darkened: the part of the shape whose neighbour (dx, dy) is empty
  innerShade(k, dx, dy) {
    const t = canvas(this.cw, this.ch), tg = t.getContext('2d');
    tg.drawImage(this.cv, 0, 0); tg.globalCompositeOperation = 'destination-out'; tg.drawImage(this.cv, -dx * this.s * 1.5, -dy * this.s * 1.5);
    tg.globalCompositeOperation = 'source-in'; tg.fillStyle = 'rgba(0,0,0,' + clamp(1 - k, 0, 1).toFixed(3) + ')'; tg.fillRect(0, 0, this.cw, this.ch);
    const g = this.g; g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'source-atop'; g.drawImage(t, 0, 0); g.restore(); this._snap = null;
  }
  text(str, x, y, size, c, opts) {
    const o = opts || {}, g = this.g; this._snap = null;
    g.font = (o.weight || 900) + ' ' + size + 'px ' + (o.font || '"Noto Sans TC","PingFang TC","Microsoft JhengHei",sans-serif'); g.textBaseline = 'top';
    let tw = g.measureText(str).width, sx = 1; if (o.maxW && tw > o.maxW) sx = o.maxW / tw; tw *= sx;
    const ox = o.align === 'center' ? x - tw / 2 : o.align === 'right' ? x - tw : x;
    g.save(); g.translate(ox, y); g.scale(sx, 1); g.fillStyle = cssHex(c); g.fillText(str, 0, 0); g.restore();
    return tw;
  }
  vtext(str, cx, y, size, c, gap) { let yy = y; for (const ch of str) { this.text(ch, cx, yy, size, c, { align: 'center' }); yy += size + (gap == null ? 1 : gap); } }
  flipX() { const t = canvas(this.cw, this.ch); t.getContext('2d').drawImage(this.cv, 0, 0); const g = this.g; g.save(); g.setTransform(-1, 0, 0, 1, this.cw, 0); g.clearRect(0, 0, this.cw, this.ch); g.drawImage(t, 0, 0); g.restore(); this._snap = null; }
  blit(src, ox, oy) { this._snap = null; if (src.vec) this.g.drawImage(src.cv, ox, oy, src.w, src.h); else this.g.drawImage(src.toCanvas(), ox, oy); }
  toCanvas() { return this.cv; }
}
// a pen for a sprite: the vector one in the illustrated style (at scale s), the pixel one otherwise
function pen(w, h, s) { return STYLE.toon ? new VPix(w, h, s) : new Pix(w, h); }
// a ready canvas wrapped so the atlas can pack it like a painted Pix
function wrapCanvas(cv) { return { w: cv.width, h: cv.height, cw: cv.width, ch: cv.height, cv, vec: true, toCanvas: () => cv }; }
