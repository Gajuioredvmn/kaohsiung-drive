// ===================== the city's atlas: every wall, shop front, sign, roof and road surface, painted in pixels =====================
// One 4096² texture holds it all. Facades are painted whole (a house front is one picture, twenty pixels to the metre);
// walls, roofs and road surfaces are tiles that repeat (thirty-two pixels to the metre). Each tile is registered by
// name and packed at the end.
const ATLAS = { W: 4096, items: [], tiles: {}, canvas: null, th: [], shops: {}, bigs: [], vsigns: [] };
const PPM = 20, TPM = 32;   // pixels per metre: facades; repeating tiles
function tile(name, px) { ATLAS.items.push({ name, px }); return name; }
function atlasBuild() {
  const items = ATLAS.items.slice().sort((a, b) => (b.px.ch || b.px.h) - (a.px.ch || a.px.h)), W = ATLAS.W, c = canvas(W, W), g = c.getContext('2d');
  let x = 0, y = 0, rowH = 0, n = 0; const G = 2;
  for (const it of items) {
    const w = it.px.cw || it.px.w, h = it.px.ch || it.px.h; if (x + w + 2 * G > W) { x = 0; y += rowH + 2 * G; rowH = 0; } if (y + h + 2 * G > W) { reportErr('atlas full at ' + n); break; }
    const cv = it.px.toCanvas();
    g.drawImage(cv, x + G, y + G);
    // a gutter that repeats the edges, so the filters never read the neighbour
    g.drawImage(cv, 0, 0, w, 1, x + G, y, w, G); g.drawImage(cv, 0, h - 1, w, 1, x + G, y + G + h, w, G); g.drawImage(cv, 0, 0, 1, h, x, y + G, G, h); g.drawImage(cv, w - 1, 0, 1, h, x + G + w, y + G, G, h);
    ATLAS.tiles[it.name] = [(x + G) / W, 1 - (y + G + h) / W, (x + G + w) / W, 1 - (y + G) / W];
    x += w + 2 * G; rowH = Math.max(rowH, h); n++;
  }
  ATLAS.canvas = c; ATLAS.used = (y + rowH) / W;
}
const T = (name) => ATLAS.tiles[name] || ATLAS.tiles.white;
// ---------- palettes and names ----------
const WALLS = [0xc8a070, 0xb89878, 0x8fa080, 0xd8d4cc, 0xd4b8a8, 0xa8c0a8, 0x8a6a50, 0xe8e4dc, 0xb0c4d0, 0xd8d0c0, 0xc0b8a0, 0x9a8a7a];
const SIGN_BG = [[0xd02820, 0xffffff], [0x2050c0, 0xffffff], [0xf0c020, 0x202020], [0xf0ece0, 0xd02820], [0x108848, 0xffffff], [0xf08020, 0xffffff], [0x182878, 0xffe040], [0x202020, 0xffe040], [0xf0ece0, 0x2050c0], [0xd02820, 0xffe040]];
const SHOP_TYPES = {
  open: ['五金行', '水電行', '彩券行', '文具店', '服飾', '鞋店', '雜貨', '佛具', '寵物', '通訊行', '手機維修', '眼鏡行', '鐘錶', '當舖', '銀樓', '書局', '棉被行', '印章', '鎖匙'],
  eat: ['肉燥飯', '牛肉麵', '鹹酥雞', '滷味', '便當', '自助餐', '豆漿店', '米糕', '肉圓', '碗粿', '鵝肉', '虱目魚', '羊肉爐', '熱炒', '餃子館', '麵店', '小吃', '早餐店', '海產', '火鍋', '燒肉', '咖哩', '炸雞', '牛排', '水餃'],
  tea: ['春芽茶飲', '大杯鮮茶', '冰點飲料', '木瓜牛奶', '豆花', '剉冰', '珍珠奶茶', '咖啡', '果汁', '仙草', '茶之鄉', '鮮果汁'],
  cvs: ['日日超商', '好鄰居', '全日超商', '快樂超商'],
  scooter: ['機車行', '永昌機車', '阿明機車', '輪胎', '機車精品'],
  clinic: ['牙醫', '眼科', '中醫', '診所', '小兒科', '皮膚科', '藥局', '婦產科', '耳鼻喉科', '骨科'],
  salon: ['髮廊', '美容', '理髮', '美甲', '剪髮一百'],
  class: ['英數補習班', '安親班', '音樂教室', '數學', '美語', '才藝班', '升學補習班'],
  shutter: ['', '', '', '出租', '', '停車', ''],
  bank: ['港都銀行', '合作社', '信用合作社', '郵局'],
  hotel: ['大飯店', '商務旅館', '旅社', '汽車旅館'],
  ktv: ['KTV', '網咖', '撞球', '電玩', '卡拉OK', '麻將'],
};
const VSIGN_NAMES = ['牙醫', '眼科', '當舖', '補習班', '髮廊', '藥局', '旅社', '銀樓', '婚紗', '鐘錶', '網咖', '中醫', '診所', '汽車旅館', '便當', '麵', '茶', '租', '售', '麻將', 'KTV', '珠寶', '眼鏡', '書局', '佛具', '通訊', '彩券', '當', '卡拉OK', '牛肉麵', '檳榔', '機車', '美容', '鞋', '服飾', '銀行', '郵局', '安親班', '美語', '冰', '豆花', '滷味', '海產', '熱炒', '金', '手機', '相館', '旅行社'];
// ---------- small helpers ----------
function noiseFill(px, x, y, w, h, a, b, k) { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) px.set(i, j, mixHex(a, b, hash2(i * 1.7 + k, j * 2.3) * 0.5 + (hash2(i * 0.3, j * 0.37 + k) - 0.5) * 0.4 + 0.25)); }
// a tiled wall: fine grout lines, the odd darker tile, grime
function wallFill(px, x, y, w, h, col, r, tileW, tileH) {
  const tw = tileW || 6, th = tileH || 3, grout = shadeHex(col, 0.8);
  for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) {
    const row = Math.floor((j - y) / th), colIdx = Math.floor((i - x + (row % 2) * (tw / 2)) / tw), n = hash2(colIdx * 3.1 + r, row * 1.9);
    let c = shadeHex(col, 0.94 + n * 0.1); if ((j - y) % th === 0 || (i - x + (row % 2) * (tw / 2)) % tw === 0) c = grout;
    px.set(i, j, c);
  }
}
function grime(px, x, y, w, h, col, r, n) { for (let k = 0; k < n; k++) { const gx = x + Math.floor(r() * w), L = Math.floor(h * (0.2 + r() * 0.6)); for (let j = 0; j < L; j++) { const c = px.get(gx, y + j); if (c >= 0) px.dset(gx, y + j, c, shadeHex(col, 0.62), 0.5 * (1 - j / L)); } } }
// a window: aluminium frame, two sliding panes with a reflection, often an iron cage with plants, sometimes an air-conditioner
function window_(px, x, y, w, h, r, o) {
  o = o || {};
  px.rect(x, y, w, h, 0xc8ccd0); px.rect(x + 2, y + 2, w - 4, h - 4, 0x3e5e7c);
  px.vgrad(x + 2, y + 2, w - 4, Math.floor((h - 4) * 0.45), [0x8ab0cc, 0x5a7e9c]);
  px.rect(x + Math.floor(w / 2) - 1, y + 1, 2, h - 2, 0xc8ccd0); px.rect(x + 2, y + Math.floor(h * 0.55), w - 4, 1, 0xa8b0b8);
  if (o.curtain) px.rect(x + 2, y + 2, w - 4, Math.floor(h * 0.45), r.pick([0xe8e0d0, 0xd8c8b0, 0xc8d0d8, 0xf0d8c8]));
  if (o.cage) {
    const c = r.pick([0x4a4440, 0x5a4a40, 0x606468, 0x7a5a48, 0x3a4a5a]), x0 = x - 3, x1 = x + w + 3, y0 = y - 2, y1 = y + h + 3;
    for (let i = x0; i <= x1; i += 3) px.rect(i, y0, 1, y1 - y0, c);
    px.rect(x0, y0, x1 - x0, 1, c); px.rect(x0, y1, x1 - x0 + 1, 1, c); px.rect(x0, y + Math.floor(h / 2), x1 - x0, 1, c);
    px.rect(x0, y1 + 1, x1 - x0 + 1, 1, shadeHex(c, 0.5));
    if (r() < 0.55) for (let i = x0 + 2; i < x1 - 4; i += 7) if (r() < 0.7) { px.rect(i, y1 - 5, 4, 5, r.pick([0x3a8a3a, 0x58a848, 0x2a7a4a])); px.rect(i + 1, y1 - 1, 2, 2, 0xa06040); }
  }
  if (o.ac) { const ax = o.acLeft ? x - 18 : x + w + 3, ay = y + h - 12; px.rect(ax, ay, 15, 11, 0xc8ccd0); px.rect(ax + 2, ay + 3, 11, 1, 0x60646a); px.rect(ax + 2, ay + 6, 11, 1, 0x60646a); px.rect(ax + 2, ay + 9, 11, 1, 0x60646a); px.rect(ax, ay + 11, 15, 1, 0x707478); px.rect(ax + 7, ay + 12, 1, 6, 0x9a9ea2); }
}
function balcony(px, x, y, w, r) {   // a railing band, 2 m tall at 20 px/m, with the slab under it
  const kind = r() < 0.5 ? 'rail' : 'wall', hgt = 20;
  if (kind === 'rail') { px.rect(x, y, w, 2, 0x9a9aa0); for (let i = x; i < x + w; i += 3) px.rect(i, y, 1, hgt, 0x8a8a90); px.rect(x, y + hgt - 2, w, 2, 0x8a8a90); }
  else { px.rect(x, y, w, hgt, 0xd0c8b8); px.rect(x, y, w, 2, 0xe8e0d0); for (let i = x + 4; i < x + w - 4; i += 9) px.rect(i, y + 6, 3, 10, shadeHex(0xd0c8b8, 0.85)); }
  px.rect(x, y + hgt, w, 2, 0x7a7470);
  if (r() < 0.5) for (let k = 0; k < 4; k++) { const lx = x + 4 + Math.floor(r() * (w - 10)); px.rect(lx, y - 14 + Math.floor(r() * 4), 4, 12, r.pick([0xffffff, 0xf0c0c0, 0x8ab0e0, 0xf0e080, 0x404048, 0x60a060])); }
  if (r() < 0.6) { const gx = x + 3 + Math.floor(r() * (w - 12)); px.rect(gx, y - 6, 8, 6, r.pick([0x3a8a3a, 0x58a848])); px.rect(gx + 2, y - 1, 4, 3, 0xa06040); }
}
// the sign across a shop front: a coloured board with the name, often a phone number, sometimes bulbs
function signBand(px, x, y, w, h, name, r, big) {
  const [bg, fg] = r.pick(SIGN_BG); px.rect(x, y, w, h, bg); px.rect(x, y, w, 2, shadeHex(bg, 1.25)); px.rect(x, y + h - 2, w, 2, shadeHex(bg, 0.7));
  const size = Math.min(h - 6, big ? 28 : 20);
  if (name) { const tw = px.text(name, x + w / 2, y + Math.floor((h - size) / 2), size, fg, { align: 'center', maxW: w - 8 }); if (!big && w - tw > 60 && h >= 20 && r() < 0.5) px.text('07-' + r.int(200, 799) + '-' + r.int(1000, 9999), x + w - 4, y + h - 10, 8, fg, { align: 'right', weight: 700 }); }
  if (r() < 0.25) { for (let i = x + 4; i < x + w - 4; i += 6) px.rect(i, y + h - 4, 2, 2, 0xffe060); }   // bulbs along the bottom
}
// ---------- townhouse fronts: the floors above the arcade, twenty pixels to the metre ----------
function paintTownhouseUpper(seed, wM, floors, dist) {
  const r = mulberry(seed), W = wM * PPM, FH = 68, PAR = 10, SIGN = 24, H = PAR + (floors - 1) * FH + SIGN, px = new Pix(W, H);
  const wall = r.pick(dist === 'yancheng' ? [0xd8d4cc, 0xc0b8a0, 0x9a8a7a, 0xd4b8a8, 0xb0c4d0, 0xc8a070] : dist === 'bay' ? [0xe8e4dc, 0xd8d4cc, 0xb0c4d0, 0xc8d0d8] : WALLS);
  const tiled = r() < 0.7; if (tiled) wallFill(px, 0, 0, W, H, wall, seed, r.pick([6, 8, 12]), r.pick([3, 4, 6])); else noiseFill(px, 0, 0, W, H, shadeHex(wall, 0.95), shadeHex(wall, 1.05), seed);
  if (r() < 0.4) { const c2 = shadeHex(wall, r() < 0.5 ? 0.82 : 1.12); px.rect(0, 0, 6, H, c2); px.rect(W - 6, 0, 6, H, c2); }
  px.rect(0, 0, W, PAR, shadeHex(wall, 1.1)); px.rect(0, PAR - 2, W, 2, shadeHex(wall, 0.72));
  const nWin = W >= 110 ? 2 : 1, ww = nWin === 2 ? Math.floor((W - 44) / 2) : Math.min(48, W - 36), wh = 28;
  const cage = r() < 0.75, curtain = r() < 0.4, acP = r() < 0.6, style = r() < 0.35 ? 'balcony' : 'flat', pipe = r() < 0.5;
  for (let f = 0; f < floors - 1; f++) {
    const y0 = PAR + f * FH, slab = y0 + FH - 3;
    px.rect(0, slab, W, 3, shadeHex(wall, 0.72)); px.rect(0, slab - 1, W, 1, shadeHex(wall, 1.15));
    const bal = style === 'balcony' && (f > 0 || r() < 0.5);
    if (bal) balcony(px, 2, y0 + FH - 26, W - 4, r);
    for (let k = 0; k < nWin; k++) {
      const x = nWin === 2 ? 14 + k * (ww + 16) : Math.floor((W - ww) / 2);
      window_(px, x, y0 + 14, ww, wh, r, { cage: cage && r() < 0.9, curtain: curtain && r() < 0.5, ac: acP && r() < 0.45 && (nWin === 1 || k === 1), acLeft: nWin === 1 && r() < 0.5 });
    }
    if (f === 0 && r() < 0.3) signBand(px, 4, y0 + 3, W - 8, 20, r.pick(SHOP_TYPES.class.concat(SHOP_TYPES.clinic, SHOP_TYPES.ktv)), r);   // an upstairs sign
  }
  if (pipe) { const x = r() < 0.5 ? 3 : W - 7; px.rect(x, PAR, 4, H - PAR - SIGN, 0x6a6a70); px.rect(x + 1, PAR, 1, H - PAR - SIGN, 0x8a8a90); }
  if (r() < 0.3) { px.rect(0, PAR + 20, W, 3, 0x58585c); }   // a cable
  grime(px, 0, PAR, W, H - PAR - SIGN, wall, r, 4);
  // the shop sign across the bottom, just above the arcade
  const type = r.pick(dist === 'centre' ? ['open', 'eat', 'tea', 'clinic', 'salon', 'open', 'eat', 'class', 'ktv', 'scooter'] : ['open', 'eat', 'tea', 'open', 'eat', 'scooter', 'shutter', 'clinic', 'salon', 'open']);
  const name = r.pick(SHOP_TYPES[type]);
  signBand(px, 0, H - SIGN, W, SIGN, name, r);
  px.rect(0, H - 2, W, 2, 0x202024);
  return { px, type, name };
}
// ---------- shop fronts: the ground floor inside the arcade, four metres tall, seven wide ----------
function paintShop(seed, type) {
  const r = mulberry(seed), W = 7 * PPM, H = 4 * PPM, px = new Pix(W, H);
  const dark = 0x2a2420;
  const shelves = (x0, y0, w, h, bright) => { px.rect(x0, y0, w, h, bright ? 0xf0efe8 : dark); for (let y = y0 + 14; y < y0 + h - 8; y += 18) { px.rect(x0 + 4, y, w - 8, 2, bright ? 0xc8c0b0 : 0x6a5a48); for (let x = x0 + 6; x < x0 + w - 8; x += 6) px.rect(x, y - 9, 4, 9, r.pick([0xd04040, 0x4080d0, 0xf0d040, 0x40a060, 0xf0f0f0, 0xf08030, 0xa060c0])); } };
  const glass = (x0, y0, w, h) => { px.vgrad(x0, y0, w, h, [0xa8c8dc, 0x8ab0c8, 0x7aa0b8]); for (let j = y0; j < y0 + h; j++) for (let i = x0; i < x0 + w; i++) if ((i + j) % 13 === 0) px.set(i, j, 0xc0dcea); px.rect(x0, y0, w, 2, 0x50606a); px.rect(x0, y0, 2, h, 0x50606a); px.rect(x0 + w - 2, y0, 2, h, 0x50606a); };
  const door = (x0) => { px.rect(x0, 20, 24, 60, 0x50606a); px.rect(x0 + 2, 22, 20, 56, 0x9ac0d8); px.rect(x0 + 18, 48, 2, 6, 0x202020); };
  px.rect(0, 0, W, H, 0x8a8278);
  switch (type) {
    case 'shutter': { const c = r.pick([0x8a8e94, 0x6a8a6a, 0x5a7aa0, 0x9a7a60, 0xb0b4b8]); px.rect(0, 0, W, H, c); for (let y = 4; y < H; y += 6) { px.rect(0, y, W, 2, shadeHex(c, 0.72)); px.rect(0, y + 3, W, 1, shadeHex(c, 1.12)); } px.rect(0, 0, W, 4, 0x404448); if (r() < 0.5) { px.rect(12, 24, 40, 26, 0xf0ece0); px.text('出租', 32, 27, 18, 0xd02820, { align: 'center', maxW: 36 }); } if (r() < 0.4) door(W - 32); if (r() < 0.4) for (let k = 0; k < 3; k++) px.rect(70 + k * 16, 30 + k * 8, 12, 12, r.pick([0xf0c020, 0xd02820, 0x2050c0])); break; }
    case 'cvs': { shelves(0, 0, W, H, true); glass(0, 0, W, H); px.rect(0, 0, W, 12, 0x2050c0); px.rect(0, 12, W, 6, 0xf0c020); px.rect(0, 18, W, 2, 0xd02820); door(W / 2 - 12); px.rect(8, 28, 22, 12, 0xf0f0f0); px.text('24h', 19, 29, 11, 0x2050c0, { align: 'center' }); px.rect(W - 34, 26, 26, 30, 0xf8f8f0); for (let k = 0; k < 3; k++) px.rect(W - 31, 30 + k * 8, 20, 5, r.pick([0xd04040, 0x4080d0, 0x40a060])); break; }
    case 'eat': { px.rect(0, 0, W, H, r.pick([0x3a3028, 0x4a3a2a, 0x2a2a30])); px.rect(4, 40, 60, 28, 0xd8d8d0); px.rect(6, 42, 56, 16, 0xa8d0e0); for (let x = 10; x < 58; x += 10) px.rect(x, 48, 6, 6, r.pick([0xf0c040, 0xd04040, 0xf0e0a0, 0x804020])); px.rect(4, 68, 60, 12, 0x9a8a78); for (let k = 0; k < 3; k++) { const lx = 80 + k * 18; px.rect(lx, 6, 10, 14, 0xe02828); px.rect(lx + 2, 2, 6, 4, 0xf0c020); px.rect(lx + 4, 20, 2, 6, 0xf0c020); px.rect(lx + 2, 10, 6, 1, 0xb01818); } px.rect(76, 28, 56, 36, 0x202020); for (let y = 32; y < 60; y += 8) px.rect(80, y, 40 + (y % 16), 4, 0xf0e0a0); for (let k = 0; k < 10; k++) px.set(20 + k * 5, 28 + (k % 3) * 3, 0xd8d8d8); break; }
    case 'tea': { px.rect(0, 0, W, H, r.pick([0xf0e8d8, 0xe0f0e8, 0xf8e8e0])); px.rect(0, 0, W, 16, r.pick([0x208060, 0xd04060, 0x3060c0, 0xf0a020])); px.rect(8, 24, W - 16, 20, 0xfff8e0); for (let x = 12; x < W - 16; x += 14) px.rect(x, 28, 10, 12, r.pick([0x208060, 0xd04060, 0x3060c0, 0x202020])); px.rect(0, 52, W, 28, 0xe8d8c0); px.rect(0, 52, W, 2, 0xb0a080); for (let k = 0; k < 6; k++) px.rect(10 + k * 20, 56, 10, 14, r.pick([0xf0d0a0, 0x80d0a0, 0xf0a0a0, 0xffffff])); break; }
    case 'scooter': { px.rect(0, 0, W, H, 0x383838); for (let k = 0; k < 3; k++) { const sx = 8 + k * 44, c = r.pick([0xd02820, 0x2050c0, 0xf0f0f0, 0x202020, 0x40a060]); px.rect(sx + 8, 40, 28, 14, c); px.rect(sx + 12, 32, 16, 8, c); px.ellipse(sx + 8, 64, 8, 8, 0x202020); px.ellipse(sx + 32, 64, 8, 8, 0x202020); px.ellipse(sx + 8, 64, 4, 4, 0x8a8a8a); px.ellipse(sx + 32, 64, 4, 4, 0x8a8a8a); } for (let k = 0; k < 4; k++) px.ellipse(124, 20 + k * 14, 10, 6, 0x202020); break; }
    case 'clinic': { px.rect(0, 0, W, H, 0xf0f0ec); glass(4, 16, 80, 64); door(100); px.rect(12, 4, 40, 10, 0x18a048); for (let k = 0; k < 3; k++) px.rect(24 + k * 10, 6, 6, 6, 0xffffff); px.rect(96, 28, 32, 24, 0xffffff); px.rect(108, 32, 8, 16, 0x18a048); px.rect(104, 36, 16, 8, 0x18a048); break; }
    case 'salon': { px.rect(0, 0, W, H, 0xe8e0e8); glass(20, 12, W - 28, 68); for (let y = 12; y < 72; y++) px.rect(7, y, 6, 1, [0xd02820, 0xffffff, 0x2050c0][Math.floor(y / 4) % 3]); px.rect(6, 10, 8, 2, 0x9a9a9a); px.rect(6, 72, 8, 2, 0x9a9a9a); break; }
    case 'bank': { px.rect(0, 0, W, H, 0xd8d8d0); glass(8, 12, W - 16, 68); px.rect(0, 0, W, 10, r.pick([0x2050c0, 0x18a048, 0xd02820])); px.rect(40, 20, 60, 60, 0x50606a); px.rect(42, 22, 56, 56, 0xa8c8dc); break; }
    case 'class': case 'ktv': { px.rect(0, 0, W, H, type === 'ktv' ? 0x202030 : 0xe8e8e0); glass(8, 16, 60, 64); door(88); if (type === 'ktv') for (let k = 0; k < 10; k++) px.rect(8 + k * 12, 6, 4, 4, r.pick([0xff40a0, 0x40f0ff, 0xffe040])); break; }
    default: { shelves(0, 0, W, H, false); if (r() < 0.5) glass(0, 8, 72, 72); door(r() < 0.5 ? 100 : 4); for (let k = 0; k < 4; k++) px.rect(80 + k * 14, 12, 8, 16 + (k % 2) * 8, r.pick([0xd04040, 0x4080d0, 0xf0d040, 0x40a060])); }
  }
  px.rect(0, 0, W, 2, 0x1a1a1e);
  return px;
}
// ---------- the taller buildings along the boulevards (sixteen pixels to the metre) ----------
function paintBig(seed, wM, floors, style) {
  const r = mulberry(seed), ppm = 16, W = Math.round(wM * ppm), fh = 51, H = floors * fh + 16, px = new Pix(W, H);
  const wall = r.pick([0xd8d4cc, 0xc8c0b0, 0xb0b8c0, 0xe8e4dc, 0xc0a888, 0x9aa0a8, 0xd4c8b8]);
  if (style === 'glass' || style === 'office') {
    const g0 = r.pick([0x24485e, 0x2a5a6a, 0x1e3a58, 0x3a5a78]), g1 = shadeHex(g0, 1.5), span = style === 'glass' ? 48 : 32;
    for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) { const fl = Math.floor(j / fh), inF = (j % fh) < span; px.set(i, j, inF ? (hash2(i >> 4, fl) < 0.2 ? g1 : (i % 16 === 0 ? shadeHex(g0, 0.7) : mixHex(g0, g1, 0.25 * (1 - (j % fh) / span)))) : wall); }
    if (style === 'office') for (let f = 0; f < floors; f++) px.rect(0, f * fh + span, W, 2, shadeHex(wall, 0.7));
  } else {
    wallFill(px, 0, 0, W, H, wall, seed, 8, 4);
    const nWin = Math.max(2, Math.floor(W / 56)), ww = Math.floor((W - 16) / nWin) - 16;
    for (let f = 0; f < floors; f++) {
      const y0 = 16 + f * fh; px.rect(0, y0 + fh - 3, W, 3, shadeHex(wall, 0.72));
      if (style === 'apt') balcony(px, 4, y0 + 26, W - 8, r);
      for (let k = 0; k < nWin; k++) { const x = 16 + k * (ww + 16); if (style === 'apt') window_(px, x, y0 + 4, ww, 20, r, { cage: r() < 0.5 }); else window_(px, x, y0 + 8, ww, 26, r, { curtain: r() < 0.3 }); }
      if (style === 'apt' && r() < 0.5) { px.rect(W - 22, y0 + 6, 15, 11, 0xc8ccd0); px.rect(W - 20, y0 + 9, 11, 1, 0x60646a); }
    }
    grime(px, 0, 16, W, H - 24, wall, r, 6);
    if (style === 'hotel') signBand(px, 8, 24, W - 16, 40, r.pick(['港都大飯店', '國際商務飯店', '愛河大飯店', '南國飯店', '華王大飯店']), r, true);
    if (style === 'commercial') for (let f = 0; f < Math.min(3, floors - 1); f++) if (r() < 0.8) signBand(px, 6 + Math.floor(r() * 24), 16 + f * fh + 4, W - 20 - Math.floor(r() * 40), 36, r.pick(SHOP_TYPES.class.concat(SHOP_TYPES.clinic, SHOP_TYPES.ktv, ['婚紗', '健身房', '補習', '牙醫診所', '聯合診所'])), r, true);
  }
  px.rect(0, 0, W, 12, shadeHex(wall, 1.1)); px.rect(0, 12, W, 2, shadeHex(wall, 0.7));
  signBand(px, 0, H - 16, W, 16, '', r);
  return px;
}
// ---------- vertical signboards: a word read top to bottom ----------
function paintVSign(seed) { const r = mulberry(seed), px = new Pix(24, 80), [bg, fg] = r.pick(SIGN_BG), name = r.pick(VSIGN_NAMES).slice(0, 4); px.rect(0, 0, 24, 80, bg); px.rect(0, 0, 24, 2, shadeHex(bg, 1.3)); px.rect(22, 0, 2, 80, shadeHex(bg, 0.7)); px.vtext(name, 12, 4 + Math.floor((76 - name.length * 19) / 2), 17, fg, 2); return px; }
// ---------- repeating tiles, four metres square ----------
function paintWallTile(seed, col, kind) {
  const r = mulberry(seed), S = 4 * TPM, px = new Pix(S, S);
  if (kind === 'tile') wallFill(px, 0, 0, S, S, col, seed, 10, 5); else if (kind === 'brick') wallFill(px, 0, 0, S, S, col, seed, 16, 6); else noiseFill(px, 0, 0, S, S, shadeHex(col, 0.95), shadeHex(col, 1.05), seed);
  grime(px, 0, 0, S, S, col, r, 6);
  if (r() < 0.5) { const x = Math.floor(r() * (S - 8)); px.rect(x, 0, 4, S, 0x6a6a70); px.rect(x + 1, 0, 1, S, 0x8a8a90); }
  if (r() < 0.5) window_(px, 30 + Math.floor(r() * 40), 20 + Math.floor(r() * 50), 24, 26, r, { cage: true });
  return px;
}
function paintRoofTile(seed, kind) {
  const r = mulberry(seed), S = 4 * TPM, px = new Pix(S, S);
  if (kind === 'tin') { const c = r.pick([0xa83a30, 0xb0b4b8, 0x3a6aa8, 0x6a8a5a, 0x8a4a3a]); px.rect(0, 0, S, S, c); for (let x = 0; x < S; x += 8) { px.rect(x, 0, 2, S, shadeHex(c, 0.72)); px.rect(x + 4, 0, 2, S, shadeHex(c, 1.15)); } for (let k = 0; k < 8; k++) px.rectD(Math.floor(r() * S), Math.floor(r() * S), 6, 4, c, shadeHex(c, 0.55), 0.5); return px; }
  if (kind === 'tiles') { const c = 0xc86a3a; for (let y = 0; y < S; y += 8) for (let x = 0; x < S; x += 12) { px.rect(x + (y % 16 ? 6 : 0), y, 12, 8, shadeHex(c, 0.9 + hash2(x, y) * 0.2)); px.rect(x + (y % 16 ? 6 : 0), y, 12, 2, shadeHex(c, 0.65)); px.rect(x + (y % 16 ? 6 : 0), y + 2, 1, 6, shadeHex(c, 0.75)); } return px; }
  if (kind === 'glass') { px.rect(0, 0, S, S, 0x2a5a6a); for (let y = 0; y < S; y += 16) px.rect(0, y, S, 2, 0x3a7a8a); for (let x = 0; x < S; x += 16) px.rect(x, 0, 2, S, 0x3a7a8a); return px; }
  const c = r.pick([0x9a9690, 0x8a8880, 0xa8a49c, 0x7a7a78]); noiseFill(px, 0, 0, S, S, shadeHex(c, 0.9), shadeHex(c, 1.1), seed);
  for (let k = 0; k < 5; k++) { const x = Math.floor(r() * (S - 16)), y = Math.floor(r() * (S - 16)); px.ellipse(x, y, 8 + r() * 12, 6 + r() * 10, shadeHex(c, 0.78)); }
  if (r() < 0.4) px.rect(0, 60, S, 4, shadeHex(c, 0.8));
  for (let k = 0; k < 3; k++) px.rect(Math.floor(r() * S), Math.floor(r() * S), 2, 2, shadeHex(c, 0.5));
  return px;
}
function paintRoad(kind) {
  const K = RK[kind], ppm = 16, wPx = Math.round(K.w * ppm), hPx = 512, px = new Pix(wPx, hPx), asph = kind === 'highway' ? 0x4a4a52 : 0x505058, along = hPx / 10;
  noiseFill(px, 0, 0, wPx, hPx, shadeHex(asph, 0.93), shadeHex(asph, 1.07), 3);
  for (let k = 0; k < 40; k++) { const x = Math.floor(hash1(k * 7 + wPx) * wPx), y = Math.floor(hash1(k * 13 + wPx) * hPx); px.rectD(x, y, 10, 28, shadeHex(asph, 0.88), asph, 0.5); }
  const lanes = K.lanes, lw = Math.max(2, Math.round(0.15 * ppm));
  const dash = (x, col) => px.rect(x, 0, lw, Math.round(along * 4), col);   // four metres of line, six of gap
  const solid = (x, col) => px.rect(x, 0, lw, hPx, col);
  if (kind === 'lane') { /* no markings on a lane */ }
  else if (kind === 'quay' || kind === 'ramp' || kind === 'hill') { solid(Math.round(0.3 * ppm), 0xe8e8e8); solid(wPx - Math.round(0.3 * ppm) - lw, 0xe8e8e8); }
  else {
    solid(Math.round(0.25 * ppm), 0xe8e8e8); solid(wPx - Math.round(0.25 * ppm) - lw, 0xe8e8e8);
    const centre = wPx / 2;
    if (lanes >= 4) { solid(Math.round(centre - lw - 2), 0xf0c830); solid(Math.round(centre + 2), 0xf0c830); } else { for (let y = 0; y < hPx; y += along * 5) px.rect(Math.round(centre - lw / 2), y, lw, Math.round(along * 2.5), 0xf0c830); }
    for (let l = 1; l < lanes / 2; l++) { const off = (l / (lanes / 2)) * (wPx / 2 - 0.25 * ppm); dash(Math.round(centre - off), 0xe8e8e8); dash(Math.round(centre + off), 0xe8e8e8); }
    if (kind === 'boulevard') { const x = Math.round(centre - 0.9 * ppm); px.rect(x, 0, Math.round(1.8 * ppm), hPx, 0x8a8e8a); }
    // the scooter box at the lights is painted on the approach, not here; a few manhole covers instead
    for (let k = 0; k < 2; k++) { const mx = Math.floor(hash1(k * 31 + wPx) * (wPx - 20)) + 10, my = Math.floor(hash1(k * 17 + wPx) * (hPx - 20)) + 10; px.ellipse(mx, my, 6, 6, shadeHex(asph, 0.7)); px.ellipse(mx, my, 4, 4, shadeHex(asph, 0.85)); }
  }
  return px;
}
function paintWalk(seed) { const r = mulberry(seed), S = 4 * TPM, px = new Pix(S, S), c = r.pick([0xb8aea0, 0xc0b8b0, 0xb0a898, 0xa8a4a0, 0xc4b4a4]), t = Math.round(0.5 * TPM); for (let y = 0; y < S; y += t) for (let x = 0; x < S; x += t) { const cc = shadeHex(c, 0.92 + hash2(x + seed, y) * 0.16); px.rect(x, y, t, t, cc); px.rect(x, y, t, 2, shadeHex(c, 0.75)); px.rect(x, y, 2, t, shadeHex(c, 0.75)); px.rect(x + 2, y + 2, t - 2, 1, shadeHex(cc, 1.1)); } for (let k = 0; k < 14; k++) px.rectD(Math.floor(r() * (S - 8)), Math.floor(r() * (S - 8)), 6, 6, c, shadeHex(c, 0.6), 0.5); return px; }
// v runs from the junction (the bottom of the picture) outward: the bars first, then the stop line; u is one metre across
function paintZebra() { const ppm = 64, px = new Pix(ppm, 6 * ppm); noiseFill(px, 0, 0, ppm, 6 * ppm, 0x4a4a52, 0x56565e, 9); px.rect(0, Math.round(6 * ppm - 4.0 * ppm), Math.round(ppm * 0.5), Math.round(3.5 * ppm), 0xe8e8e8); px.rect(0, Math.round(6 * ppm - 5.2 * ppm), ppm, Math.round(0.4 * ppm), 0xe8e8e8); return px; }
function paintMedian() { const px = new Pix(64, 256); px.rect(0, 0, 64, 256, 0x8a8e8a); noiseFill(px, 6, 0, 52, 256, 0x4e8030, 0x62a040, 4); for (let y = 0; y < 256; y += 14) px.rect(8 + (y % 5), y, 12, 6, 0x4a7a2a); px.rect(0, 0, 6, 256, 0xc8c8c0); px.rect(58, 0, 6, 256, 0xc8c8c0); px.rect(5, 0, 1, 256, 0x9a9a92); px.rect(58, 0, 1, 256, 0x9a9a92); return px; }
function paintPlain(c, w, h) { const px = new Pix(w || 8, h || 8); px.rect(0, 0, px.w, px.h, c); return px; }
function paintColumn(seed) { const r = mulberry(seed), px = new Pix(24, 160), c = r.pick([0xc8b8a0, 0xd8d4cc, 0x9a8a7a, 0xb0b8b0]); wallFill(px, 0, 0, 24, 160, c, seed, 8, 4); if (r() < 0.6) { px.rect(2, 40 + Math.floor(r() * 50), 20, 28, r.pick([0xf0ece0, 0xf0c020, 0xd02820])); px.rect(4, 48 + Math.floor(r() * 40), 16, 4, 0x202020); px.rect(4, 56 + Math.floor(r() * 30), 16, 2, 0x202020); } if (r() < 0.4) px.rect(2, 130, 20, 30, 0x4a4a52); for (let y = 0; y < 160; y += 40) px.rect(0, y, 24, 1, shadeHex(c, 0.75)); return px; }
function paintContainerTile(seed) { const r = mulberry(seed), px = new Pix(192, 48), c = r.pick([0xd8402a, 0x2a5ad0, 0x18884a, 0xf2a21a, 0x8a3a9a, 0x9a9a9a, 0x6a2a2a]); px.rect(0, 0, 192, 48, c); for (let x = 0; x < 192; x += 6) { px.rect(x, 0, 2, 48, shadeHex(c, 0.78)); px.rect(x + 4, 0, 1, 48, shadeHex(c, 1.1)); } px.rect(0, 0, 192, 4, shadeHex(c, 0.6)); px.rect(0, 44, 192, 4, shadeHex(c, 0.6)); px.rect(0, 0, 4, 48, shadeHex(c, 0.5)); px.rect(188, 0, 4, 48, shadeHex(c, 0.5)); px.text(r.pick(['PORT', 'KHH', 'SEA', 'LINE']), 96, 16, 14, 0xffffff, { align: 'center' }); return px; }
function paintWarehouse(seed) { const r = mulberry(seed), px = new Pix(256, 128), c = r.pick([0x8a8e94, 0x9a9690, 0x7a8088]); px.rect(0, 0, 256, 128, c); for (let x = 0; x < 256; x += 6) { px.rect(x, 0, 2, 128, shadeHex(c, 0.8)); } px.rect(0, 0, 256, 8, shadeHex(c, 0.6)); px.rect(0, 80, 60, 48, 0x3a3a40); px.rect(2, 82, 56, 44, 0x50505a); if (r() < 0.7) { const cols = [0xf0c020, 0xd02820, 0x2050c0, 0x18a048, 0xffffff, 0xf08020]; for (let k = 0; k < 7; k++) px.ellipse(90 + k * 24, 48 + Math.sin(k) * 20, 12 + r() * 12, 12 + r() * 12, r.pick(cols)); px.text(r.pick(['駁二', '倉庫', 'PIER-2', 'ART']), 170, 88, 28, 0xffffff, { align: 'center' }); } return px; }
function paintBetel(seed) { const r = mulberry(seed), px = new Pix(80, 60); px.vgrad(0, 0, 80, 60, [0xa8c8dc, 0x8ab0c8]); px.rect(0, 0, 80, 16, r.pick([0xff40a0, 0x40f0ff, 0xffe040])); px.rect(0, 16, 80, 4, r.pick([0x40ff80, 0xff4040])); px.text(r.pick(['檳榔', '阿娟檳榔', '雙星檳榔', '阿美檳榔']), 40, 22, 18, 0xd02820, { align: 'center', maxW: 76 }); px.rect(4, 44, 72, 16, 0x404048); for (let k = 0; k < 6; k++) px.rect(8 + k * 12, 46, 8, 6, r.pick([0x18a048, 0xd02820, 0xf0c020])); for (let y = 0; y < 60; y += 4) px.set(79, y, 0xffffff); return px; }
function paintBillboard(seed) { const r = mulberry(seed), px = new Pix(256, 96), [bg, fg] = r.pick(SIGN_BG); px.rect(0, 0, 256, 96, bg); px.text(r.pick(['港都建設', '新成屋', '美語', '買房送車位', '牙科診所', '港都房屋', '歡迎光臨高雄', '新灣區', '健身房', '聯合醫院', '飲料', '汽車']), 128, 24, 44, fg, { align: 'center', maxW: 240 }); px.rect(0, 0, 256, 4, shadeHex(bg, 1.3)); px.rect(0, 92, 256, 4, shadeHex(bg, 0.7)); return px; }
function paintRoadName(name) { const px = new Pix(128, 32); px.rect(0, 0, 128, 32, 0x1a7a3a); px.rect(0, 0, 128, 2, 0x3a9a5a); px.rect(0, 30, 128, 2, 0x0a5a2a); px.text(name, 64, 5, 22, 0xffffff, { align: 'center', maxW: 120 }); return px; }
function paintTempleWall() { const S = 128, px = new Pix(S, S); px.rect(0, 0, S, S, 0xb82820); for (let y = 0; y < S; y += 32) px.rect(0, y, S, 4, 0xf0c020); px.rect(48, 48, 32, 80, 0x3a1a10); px.rect(52, 52, 24, 72, 0x5a2a18); for (let k = 0; k < 4; k++) px.rect(8 + k * 32, 16, 12, 12, 0xf0c020); return px; }
function paintAwning(seed) { const r = mulberry(seed), px = new Pix(64, 32), a = r.pick([0xd02820, 0x2050c0, 0x18a048, 0xf0c020]), b = 0xf0f0e8; for (let x = 0; x < 64; x += 16) { px.rect(x, 0, 8, 32, a); px.rect(x + 8, 0, 8, 32, b); } for (let x = 0; x < 64; x += 8) px.rect(x, 24, 4, 8, shadeHex(a, 0.7)); return px; }
// ---------- paint everything and pack ----------
function atlasPaint() {
  if (STYLE.toon) return atlasPaintToon();
  tile('white', paintPlain(0xf0f0ec)); tile('dark', paintPlain(0x2a2a30)); tile('black', paintPlain(0x101014)); tile('red', paintPlain(0xd02820)); tile('yellow', paintPlain(0xf0c020)); tile('green', paintPlain(0x18a048)); tile('grey', paintPlain(0x8a8a90)); tile('steel', paintPlain(0xb8bcc0)); tile('blue', paintPlain(0x2050c0)); tile('orange', paintPlain(0xf08020)); tile('kerb', paintPlain(0xd0ccc4)); tile('ceil', paintPlain(0x3a3630)); tile('tank', paintPlain(0xc8ccd0)); tile('sand', paintPlain(0xe4d4a4));
  const S = 4 * TPM;
  tile('asph', (() => { const px = new Pix(S, S); noiseFill(px, 0, 0, S, S, 0x4c4c54, 0x56565e, 5); for (let k = 0; k < 10; k++) px.rectD(Math.floor(hash1(k) * S), Math.floor(hash1(k + 9) * S), 8, 20, 0x48484f, 0x52525a, 0.5); return px; })());
  tile('conc', (() => { const px = new Pix(S, S); noiseFill(px, 0, 0, S, S, 0x9a9690, 0xa8a4a0, 6); for (let y = 0; y < S; y += 64) px.rect(0, y, S, 1, 0x8a8680); for (let x = 0; x < S; x += 64) px.rect(x, 0, 1, S, 0x8a8680); return px; })());
  tile('grass', (() => { const px = new Pix(S, S); noiseFill(px, 0, 0, S, S, 0x5a8a3a, 0x7aa84a, 7); for (let k = 0; k < 60; k++) px.rect(Math.floor(hash1(k * 3) * S), Math.floor(hash1(k * 5 + 1) * S), 1, 3, 0x4a7a2a); return px; })());
  tile('water', (() => { const px = new Pix(S, S); noiseFill(px, 0, 0, S, S, 0x2a74a8, 0x3a88bc, 8); return px; })());
  for (const k of Object.keys(RK)) if (!ATLAS.tiles[RK[k].tile] && !ATLAS.items.find((i) => i.name === RK[k].tile)) tile(RK[k].tile, paintRoad(k));
  for (let i = 0; i < 3; i++) tile('walk' + i, paintWalk(20 + i)); tile('zebra', paintZebra()); tile('median', paintMedian());
  for (let i = 0; i < 8; i++) tile('wall' + i, paintWallTile(100 + i, WALLS[(i * 5) % WALLS.length], i % 3 === 0 ? 'tile' : i % 3 === 1 ? 'brick' : 'plain'));
  for (let i = 0; i < 4; i++) tile('roof' + i, paintRoofTile(200 + i, 'concrete')); for (let i = 0; i < 3; i++) tile('tin' + i, paintRoofTile(210 + i, 'tin')); tile('rooftiles', paintRoofTile(220, 'tiles')); tile('glassroof', paintRoofTile(230, 'glass'));
  for (let i = 0; i < 4; i++) tile('col' + i, paintColumn(300 + i)); for (let i = 0; i < 6; i++) tile('box' + i, paintContainerTile(400 + i)); for (let i = 0; i < 4; i++) tile('wh' + i, paintWarehouse(500 + i)); for (let i = 0; i < 3; i++) tile('betel' + i, paintBetel(600 + i)); for (let i = 0; i < 6; i++) tile('bb' + i, paintBillboard(700 + i));
  for (const type of Object.keys(SHOP_TYPES)) { if (type === 'hotel') continue; const n = type === 'shutter' || type === 'bank' || type === 'cvs' ? 4 : 8; ATLAS.shops[type] = []; for (let i = 0; i < n; i++) { const nm = 'sh_' + type + i; tile(nm, paintShop(1000 + i * 13 + strSeed(type) % 97, type)); ATLAS.shops[type].push(nm); } }
  for (const dist of ['town', 'centre', 'yancheng', 'bay']) for (const w of [5, 6, 7]) for (let i = 0; i < 5; i++) {
    const floors = dist === 'yancheng' ? 2 + (i % 2) : dist === 'bay' ? 4 + (i % 2) : 3 + (i % 3), seed = strSeed(dist) + w * 31 + i * 7;
    const th = paintTownhouseUpper(seed, w, floors, dist), nm = 'th_' + dist + w + '_' + i; tile(nm, th.px);
    ATLAS.th.push({ name: nm, dist, w: w * 10, floors, type: th.type, shopName: th.name, hPx: th.px.h });
  }
  const bigs = [['apt', 16, 9], ['apt', 20, 12], ['apt', 14, 8], ['office', 20, 12], ['office', 24, 15], ['glass', 24, 18], ['glass', 30, 22], ['hotel', 22, 11], ['hotel', 18, 9], ['commercial', 16, 8], ['commercial', 20, 10], ['apt', 24, 14], ['office', 16, 10], ['glass', 20, 16]];
  bigs.forEach(([style, w, floors], i) => { const nm = 'big' + i; tile(nm, paintBig(2000 + i * 17, w, floors, style)); ATLAS.bigs.push({ name: nm, style, w, floors, h: floors * 3.2 + 1.3 }); });
  for (let i = 0; i < 40; i++) { const nm = 'vs' + i; tile(nm, paintVSign(3000 + i * 11)); ATLAS.vsigns.push(nm); }
  tile('temple', paintTempleWall()); for (let i = 0; i < 4; i++) tile('awning' + i, paintAwning(800 + i));
  tile('jproof', (() => { const px = new Pix(S, S); for (let y = 0; y < S; y += 8) for (let x = 0; x < S; x += 12) { px.rect(x + (y % 16 ? 6 : 0), y, 12, 8, shadeHex(0x3a4a4a, 0.9 + hash2(x, y) * 0.2)); px.rect(x + (y % 16 ? 6 : 0), y, 12, 2, 0x202a2a); } return px; })());
  tile('glass85', (() => { const px = new Pix(S, S); for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) px.set(x, y, y % 32 < 5 ? 0xb8c4cc : (hash2(x >> 3, y >> 3) < 0.15 ? 0x9ab8d0 : (x % 8 === 0 ? 0x4a6a88 : mixHex(0x5a84a8, 0x7aa4c8, (y % 32) / 32)))); return px; })());
  const names = new Set(); for (const rd of MAP.roads) if (rd.name && !names.has(rd.name)) { names.add(rd.name); tile('rn_' + rd.name, paintRoadName(rd.name)); }
  moreTiles();
  atlasBuild();
}
