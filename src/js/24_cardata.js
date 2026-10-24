// ===================== the ten cars: numbers, shapes and crews =====================
// stats: top km/h, acc 0..1, grip 0..1, steer 0..1, mass 0..1, gears, engine voice.
// shape (metres): a(t) half-width share, yF(t) fender line, yC(t) centre line along the car from nose (0) to tail (1).
// a curve through [t, value] keys, eased between them
function keyed(keys) {
  return (t) => {
    if (t <= keys[0][0]) return keys[0][1];
    for (let i = 1; i < keys.length; i++) if (t <= keys[i][0]) { const a = keys[i - 1], b = keys[i], u = (t - a[0]) / (b[0] - a[0]); return lerp(a[1], b[1], u * u * (3 - 2 * u)); }
    return keys[keys.length - 1][1];
  };
}
const SKIN = [0xf2c8a0, 0xe0b088, 0xc89068, 0xf6d2b0];
// the drift pose: how far the car rolls onto its outside wheels and how its springs answer, how far the nose swings,
// the cartoon stretch and smear, the hop as the tyres let go, what comes off the tyres, how the passengers are thrown
const POSE_DEFAULT = { rollK: 1, springK: 150, springC: 6.5, yawK: 1, swingK: 70, swingC: 8, lag: 0, hop: 1, chatter: 1, stretchX: 0.06, squashY: 0.06, smear: 0, wobble: 0, shimmy: 0, smokeK: 1, smokeKind: 'smoke', outerOnly: false, leanK: 1, driftV: 26 };
const POSES = {
  rosso: { rollK: 0.55, yawK: 1.1, stretchX: 0.1, smear: 0.35, smokeK: 1.4 },                                        // the flat four-wheel slide behind a wall of smoke
  vespa: { rollK: 0.8, springK: 240, springC: 5, yawK: 1.4, swingK: 130, swingC: 6, stretchX: 0.18, smear: 0.7, hop: 0.8, smokeK: 0.9, outerOnly: true, driftV: 30 },   // the snap: nose right out, over and back
  argento: { rollK: 0.85, springK: 55, springC: 4.5, yawK: 0.7, swingK: 36, swingC: 6, hop: 0.6, chatter: 0.3, stretchX: 0.02, squashY: 0.02, smokeK: 0.3, leanK: 1.8, driftV: 22 },   // soft springs: it leans like a boat
  ballena: { rollK: 0.35, springK: 90, springC: 7, yawK: 0.85, swingK: 48, swingC: 7, hop: 1.3, chatter: 1.4, stretchX: 0.14, squashY: 0.12, smokeK: 2, leanK: 0.8, driftV: 32 },   // heavy: squats, bounces, burns rubber
  bamboo: { rollK: 1.15, springK: 200, springC: 5.5, yawK: 1.2, hop: 1.8, chatter: 1.6, stretchX: 0.04, squashY: 0.04, smokeK: 0.5, driftV: 18 },   // light: up on two wheels, hopping
  blanco: { rollK: 0.65, springK: 180, springC: 8, yawK: 1.0, hop: 0.9, stretchX: 0.08, smear: 0.25, smokeK: 0.7, driftV: 22 },   // neat and quick
  adler: { rollK: 0.75, springK: 140, springC: 6, yawK: 1.3, swingK: 60, swingC: 4.5, lag: 0.9, hop: 1.0, stretchX: 0.1, smear: 0.4, smokeK: 1.1, outerOnly: false, driftV: 28 },   // the pendulum: the tail hangs back, then swings right out
  raiden: { rollK: 0.1, springK: 200, springC: 10, yawK: 1.1, hop: 0, chatter: 0, stretchX: 0.24, squashY: 0.02, smear: 1, smokeKind: 'sparks', smokeK: 1.5, leanK: 0.6, driftV: 34 },   // flat as a hovercraft, a smear of light and sparks
  arancia: { rollK: 1.1, springK: 170, springC: 3.5, yawK: 1.0, wobble: 0.08, shimmy: 2, hop: 1.2, chatter: 1.3, stretchX: 0.05, smokeKind: 'dirt', smokeK: 1.2, driftV: 20 },   // nervous: rolls, wobbles and shimmies
  oro: { rollK: 0.8, springK: 45, springC: 4, yawK: 0.6, swingK: 32, swingC: 5, hop: 0.5, chatter: 0.4, stretchX: 0.03, squashY: 0.08, smokeK: 0.4, leanK: 2.0, driftV: 24 },   // a lazy ocean liner of a roll
};
const KY = keyed;
const CARS = [
  { id: 'rosso', name: 'ROSSO GT', en: 'Italian wedge GT', color: 0xd8141c, interior: 0xd8c8a8, top: 296, acc: 0.72, grip: 0.72, steer: 0.7, mass: 0.6, gears: 6, engine: 'v12',
    desc: '八〇年代楔形 GT，平衡好開，最好上手。', L: 4.5, W: 1.98, clear: 0.17, rs: 0.07, tuck: 0.07, pw: 1.6, wheels: [0.18, 0.79], cockpit: [0.43, 0.68], rim: 'star', rimCol: 0xd8dce0,
    a: KY([[0, 0.8], [0.1, 0.93], [0.3, 0.95], [0.55, 0.94], [0.78, 1.0], [0.95, 0.98], [1, 0.9]]),
    yF: KY([[0, 0.6], [0.18, 0.73], [0.43, 0.9], [0.68, 0.93], [0.8, 0.97], [0.96, 0.96], [1, 0.88]]),
    yC: KY([[0, 0.58], [0.18, 0.69], [0.42, 0.85], [0.445, 0.4], [0.66, 0.4], [0.69, 0.87], [0.96, 0.9], [1, 0.84]]),
    xp: KY([[0, 0.72], [0.4, 0.82], [0.8, 0.86], [1, 0.84]]), pop: true, tails: 'grille', screen: 0.46, sideLine: 0x101014, intakes: true },
  { id: 'vespa', name: 'HORNET', en: 'Mid-engine supercar', color: 0xf2c21a, interior: 0x2a2a2a, stripe: 0x111111, stripeW: 0.06, top: 318, acc: 0.88, grip: 0.64, steer: 0.56, mass: 0.5, gears: 6, engine: 'v12',
    desc: '中置引擎超跑，極速和加速都強，但很難控制。', L: 4.6, W: 2.06, clear: 0.14, rs: 0.05, tuck: 0.09, pw: 2.2, wheels: [0.2, 0.77], cockpit: [0.33, 0.53], rim: 'disc', rimCol: 0x222226,
    a: KY([[0, 0.76], [0.15, 0.88], [0.4, 0.9], [0.62, 0.99], [0.8, 1.0], [1, 0.95]]),
    yF: KY([[0, 0.5], [0.2, 0.68], [0.33, 0.84], [0.53, 0.9], [0.62, 1.0], [0.85, 1.02], [1, 0.94]]),
    yC: KY([[0, 0.48], [0.2, 0.62], [0.32, 0.8], [0.335, 0.38], [0.52, 0.38], [0.54, 0.94], [0.62, 0.9], [0.9, 0.9], [1, 0.86]]),
    xp: KY([[0, 0.7], [0.5, 0.8], [0.8, 0.88], [1, 0.86]]), pop: true, tails: 'quad', screen: 0.36, wing: true, intakes: true, louvres: true },
  { id: 'argento', name: 'SILVER FOX', en: '1960s classic roadster', color: 0xc8ccd2, interior: 0x8a2a1e, top: 258, acc: 0.52, grip: 0.82, steer: 0.82, mass: 0.45, gears: 4, engine: 'i6',
    desc: '六〇年代長車頭古典敞篷，彎道很穩，直線慢一點。', L: 4.45, W: 1.8, clear: 0.18, rs: 0.16, tuck: 0.04, pw: 1.1, wheels: [0.17, 0.81], cockpit: [0.52, 0.76], rim: 'wire', rimCol: 0xe8eaec, chrome: true,
    a: KY([[0, 0.7], [0.12, 0.92], [0.3, 0.9], [0.55, 0.92], [0.8, 0.98], [1, 0.82]]),
    yF: KY([[0, 0.62], [0.17, 0.86], [0.33, 0.8], [0.52, 0.86], [0.76, 0.86], [0.82, 0.9], [0.95, 0.8], [1, 0.7]]),
    yC: KY([[0, 0.6], [0.17, 0.74], [0.5, 0.82], [0.525, 0.4], [0.75, 0.4], [0.77, 0.82], [0.95, 0.76], [1, 0.68]]),
    xp: KY([[0, 0.6], [0.2, 0.74], [0.5, 0.8], [0.82, 0.76], [1, 0.7]]), tails: 'roundsmall', screen: 0.4 },
  { id: 'ballena', name: 'BLUEWHALE 427', en: 'American muscle', color: 0x1a46b0, interior: 0xe8e2d0, stripe: 0xffffff, stripeW: 0.11, top: 270, acc: 0.9, grip: 0.56, steer: 0.5, mass: 0.95, gears: 4, engine: 'v8',
    desc: '美式肌肉車，一踩就飛，又重又難轉，撞車不吃虧。', L: 4.9, W: 2.02, clear: 0.2, rs: 0.04, tuck: 0.03, pw: 1.0, wheels: [0.2, 0.78], cockpit: [0.45, 0.71], rim: 'mesh', rimCol: 0xb8bcc0, chrome: true,
    a: KY([[0, 0.92], [0.1, 0.98], [0.9, 0.99], [1, 0.97]]),
    yF: KY([[0, 0.8], [0.12, 0.95], [0.45, 0.98], [0.71, 0.98], [0.97, 0.98], [1, 0.94]]),
    yC: KY([[0, 0.78], [0.12, 0.92], [0.3, 0.98], [0.44, 0.94], [0.455, 0.42], [0.7, 0.42], [0.72, 0.95], [1, 0.93]]),
    xp: KY([[0, 0.88], [1, 0.9]]), tails: 'triple', screen: 0.44, sideLine: 0xffffff, scoop: true, duck: true },
  { id: 'bamboo', name: 'BAMBOO MK2', en: 'British lightweight', color: 0x1e7a4a, interior: 0xc8a878, top: 236, acc: 0.6, grip: 0.92, steer: 0.95, mass: 0.3, gears: 4, engine: 'i4',
    desc: '英式小跑車，輕巧靈活，過彎幾乎不用煞車。', L: 3.9, W: 1.68, clear: 0.18, rs: 0.18, tuck: 0.04, pw: 1.0, wheels: [0.16, 0.83], cockpit: [0.45, 0.74], rim: 'wire', rimCol: 0xe8eaec, chrome: true,
    a: KY([[0, 0.66], [0.14, 0.95], [0.3, 0.86], [0.55, 0.9], [0.82, 0.97], [1, 0.74]]),
    yF: KY([[0, 0.6], [0.16, 0.84], [0.32, 0.76], [0.45, 0.82], [0.74, 0.82], [0.83, 0.86], [1, 0.66]]),
    yC: KY([[0, 0.58], [0.16, 0.7], [0.44, 0.78], [0.455, 0.4], [0.73, 0.4], [0.75, 0.78], [1, 0.62]]),
    xp: KY([[0, 0.58], [0.16, 0.72], [0.5, 0.8], [0.83, 0.72], [1, 0.6]]), tails: 'round', screen: 0.38, hoop: true },
  { id: 'blanco', name: 'NAMI RS', en: 'Japanese roadster', color: 0xf2f2ee, interior: 0x2a2a2e, top: 250, acc: 0.64, grip: 0.86, steer: 0.88, mass: 0.35, gears: 5, engine: 'i4',
    desc: '日系輕量敞篷，翻燈很可愛，甩尾的好幫手。', L: 4.0, W: 1.72, clear: 0.17, rs: 0.12, tuck: 0.05, pw: 1.3, wheels: [0.17, 0.82], cockpit: [0.45, 0.72], rim: 'star', rimCol: 0xc8ccd0,
    a: KY([[0, 0.76], [0.12, 0.94], [0.5, 0.92], [0.82, 0.98], [1, 0.86]]),
    yF: KY([[0, 0.62], [0.17, 0.76], [0.45, 0.86], [0.72, 0.88], [0.83, 0.9], [1, 0.82]]),
    yC: KY([[0, 0.6], [0.17, 0.72], [0.44, 0.84], [0.455, 0.4], [0.71, 0.4], [0.73, 0.86], [1, 0.8]]),
    xp: KY([[0, 0.7], [0.5, 0.8], [1, 0.78]]), pop: true, tails: 'oval', screen: 0.42 },
  { id: 'adler', name: 'ADLER TURBO', en: 'Rear-engine GT', color: 0x18181c, interior: 0xb87a4a, top: 300, acc: 0.75, grip: 0.84, steer: 0.7, mass: 0.7, gears: 6, engine: 'flat6', refl: 0.42,
    desc: '德系後置引擎 GT，抓地力好，高速很穩。', L: 4.35, W: 1.9, clear: 0.17, rs: 0.14, tuck: 0.06, pw: 1.2, wheels: [0.19, 0.8], cockpit: [0.37, 0.61], rim: 'star', rimCol: 0x9a9ea2,
    a: KY([[0, 0.74], [0.18, 0.88], [0.45, 0.86], [0.72, 0.98], [0.86, 1.0], [1, 0.88]]),
    yF: KY([[0, 0.6], [0.19, 0.84], [0.37, 0.84], [0.61, 0.88], [0.8, 0.96], [0.92, 0.88], [1, 0.74]]),
    yC: KY([[0, 0.58], [0.19, 0.72], [0.36, 0.82], [0.375, 0.4], [0.6, 0.4], [0.62, 0.88], [0.8, 0.84], [1, 0.7]]),
    xp: KY([[0, 0.66], [0.2, 0.74], [0.5, 0.78], [0.8, 0.74], [1, 0.72]]), tails: 'strip', screen: 0.42, spoiler: true },
  { id: 'raiden', name: 'RAIDEN X', en: 'Future racer', color: 0x6a2ab8, interior: 0x1a1a24, stripe: 0x3af0ff, stripeW: 0.05, top: 330, acc: 0.84, grip: 0.68, steer: 0.62, mass: 0.45, gears: 6, engine: 'turbo',
    desc: '沒有擋風玻璃的未來感競速車，極速最高。', L: 4.55, W: 2.02, clear: 0.12, rs: 0.03, tuck: 0.1, pw: 1.0, wheels: [0.17, 0.8], cockpit: [0.4, 0.6], rim: 'disc', rimCol: 0x3af0ff,
    a: KY([[0, 0.7], [0.2, 0.86], [0.6, 0.94], [0.85, 1.0], [1, 0.98]]),
    yF: KY([[0, 0.44], [0.4, 0.84], [0.6, 0.9], [0.95, 0.98], [1, 0.95]]),
    yC: KY([[0, 0.42], [0.39, 0.8], [0.405, 0.36], [0.59, 0.36], [0.61, 0.86], [1, 0.92]]),
    xp: KY([[0, 0.7], [1, 0.84]]), pop: true, tails: 'neon', screen: 0.16, fins: true, neon: true },
  { id: 'arancia', name: 'ARANCIA 7', en: '1960s racing barchetta', color: 0xf2701a, interior: 0x6a3a1e, stripe: 0xffffff, stripeW: 0.09, top: 262, acc: 0.62, grip: 0.88, steer: 0.86, mass: 0.4, gears: 4, engine: 'v8',
    desc: '六〇年代賽車場上的圓弧小車，車頭編號 7。', L: 4.1, W: 1.76, clear: 0.16, rs: 0.2, tuck: 0.05, pw: 0.9, wheels: [0.17, 0.82], cockpit: [0.46, 0.68], rim: 'wire', rimCol: 0xe8eaec, roundel: true,
    a: KY([[0, 0.66], [0.15, 0.98], [0.32, 0.86], [0.55, 0.88], [0.82, 1.0], [1, 0.76]]),
    yF: KY([[0, 0.56], [0.17, 0.86], [0.33, 0.74], [0.46, 0.8], [0.68, 0.8], [0.82, 0.88], [1, 0.62]]),
    yC: KY([[0, 0.54], [0.17, 0.64], [0.45, 0.74], [0.465, 0.38], [0.67, 0.38], [0.69, 0.76], [1, 0.58]]),
    xp: KY([[0, 0.56], [0.17, 0.7], [0.5, 0.76], [0.82, 0.72], [1, 0.58]]), tails: 'round', screen: 0.2, fairing: true },
  { id: 'oro', name: 'ORO IMPERIAL', en: 'Luxury cruiser', color: 0xd8b874, interior: 0xf0e8d8, top: 290, acc: 0.6, grip: 0.74, steer: 0.6, mass: 0.85, gears: 3, engine: 'v12',
    desc: '豪華大型敞篷，又長又重，高速巡航最舒服。', L: 5.15, W: 2.0, clear: 0.2, rs: 0.06, tuck: 0.03, pw: 2.4, wheels: [0.19, 0.8], cockpit: [0.42, 0.7], rim: 'mesh', rimCol: 0xe8d8a8, chrome: true,
    a: KY([[0, 0.88], [0.12, 0.97], [0.9, 0.98], [1, 0.96]]),
    yF: KY([[0, 0.76], [0.14, 0.94], [0.42, 0.96], [0.7, 0.96], [0.86, 1.02], [0.97, 1.06], [1, 1.0]]),
    yC: KY([[0, 0.74], [0.14, 0.9], [0.41, 0.94], [0.425, 0.42], [0.69, 0.42], [0.71, 0.92], [1, 0.9]]),
    xp: KY([[0, 0.84], [0.8, 0.88], [1, 0.9]]), tails: 'fin', screen: 0.46, sideLine: 0xf2e8c8 },
];
for (const c of CARS) c.pose = Object.assign({}, POSE_DEFAULT, POSES[c.id] || {});
const CREW = {
  rosso: [{ name: '阿凱', hair: 0x1a1410, shirt: 0xffffff, style: 'short', glasses: true }, { name: '小晴', hair: 0x3a2412, shirt: 0xd8242a, style: 'long', skin: SKIN[3] }],
  vespa: [{ name: '杰森', hair: 0xd8c050, shirt: 0x1a1a1a, style: 'short', glasses: true }, { name: '莉娜', hair: 0x8a1a4a, shirt: 0xf2c21a, style: 'bob' }],
  argento: [{ name: '王伯伯', hair: 0xd8d8d0, shirt: 0x8a6a4a, style: 'old', glasses: true, scarf: 0xf2e8d0 }, { name: '秀琴阿嬤', hair: 0xe8e8e0, shirt: 0xc84a6a, style: 'bob', skin: SKIN[0] }],
  ballena: [{ name: '大熊', hair: 0x1a1410, shirt: 0x2a2a2a, style: 'cap', capCol: 0x1a4ab8, short: true }, { name: '阿弟', hair: 0x3a2a1a, shirt: 0xf27a1a, style: 'short', short: true }],
  bamboo: [{ name: '小安', hair: 0x2a1a10, shirt: 0x3ac8d8, style: 'pony' }, { name: '佳佳', hair: 0x4a2a1a, shirt: 0xf2e8d0, style: 'long', scarf: 0xf27aa8 }],
  blanco: [{ name: '浪仔', hair: 0x1a1410, shirt: 0x3ac8d8, style: 'short', short: true }, { name: '阿妹', hair: 0x1a1410, shirt: 0xffffff, style: 'long', skin: SKIN[2] }],
  adler: [{ name: '林警官', hair: 0x1a1410, shirt: 0x2a3a5a, style: 'short', glasses: true }, { name: '小陳', hair: 0x2a1a10, shirt: 0xe8e8e0, style: 'short' }],
  raiden: [{ name: 'Z-93', hair: 0xc8c8ff, shirt: 0x3af0ff, style: 'short', glasses: true, skin: 0xc8d8e8 }, { name: 'K-07', hair: 0xff4ab8, shirt: 0x6a2ab8, style: 'bob', skin: 0xd8c8e8 }],
  arancia: [{ name: 'Sofia', hair: 0x6a2a1a, shirt: 0xffffff, style: 'pony', scarf: 0xd8242a }, { name: '豆豆', dog: true }],
  oro: [{ name: '新郎', hair: 0x1a1410, shirt: 0x1a1a1a, style: 'short' }, { name: '新娘', hair: 0x1a1410, shirt: 0xffffff, style: 'long', veil: true }],
};

// ---- the ordinary cars everyone starts with: a roof, a small engine, nothing to boast about ----
const STARTERS = [
  { id: 'duck', name: '小鴨 DUCK', en: 'City hatchback', color: 0xf2e24a, interior: 0x3a3a3e, top: 158, acc: 0.18, grip: 0.5, steer: 0.62, mass: 0.32, gears: 5, engine: 'i4', drive: 'fwd', roof: true, roofH: 0.5, starter: true,
    desc: '1.2 升掀背小車，省油好停，上坡會哀。', L: 3.7, W: 1.68, clear: 0.17, rs: 0.1, tuck: 0.05, pw: 1.0, wheels: [0.18, 0.8], cockpit: [0.3, 0.75], rim: 'steel', rimCol: 0xb0b4b8,
    a: KY([[0, 0.9], [0.1, 0.97], [0.9, 0.98], [1, 0.92]]),
    yF: KY([[0, 0.78], [0.08, 0.9], [0.3, 0.94], [0.75, 0.94], [0.92, 0.88], [1, 0.76]]),
    yC: KY([[0, 0.76], [0.08, 0.88], [0.29, 0.94], [0.3, 0.42], [0.75, 0.42], [0.76, 0.9], [1, 0.74]]),
    xp: KY([[0, 0.84], [1, 0.86]]), tails: 'round', screen: 0.4 },
  { id: 'uncle', name: '阿伯的房車 UNCLE', en: 'Family sedan', color: 0xc8ccd0, interior: 0x8a7a66, top: 176, acc: 0.26, grip: 0.52, steer: 0.5, mass: 0.58, gears: 5, engine: 'i4', drive: 'fwd', roof: true, roofH: 0.46, starter: true,
    desc: '國民房車，坐得舒服，開起來像船。', L: 4.6, W: 1.76, clear: 0.16, rs: 0.09, tuck: 0.04, pw: 1.0, wheels: [0.17, 0.81], cockpit: [0.33, 0.68], rim: 'steel', rimCol: 0xb0b4b8,
    a: KY([[0, 0.9], [0.08, 0.97], [0.92, 0.98], [1, 0.9]]),
    yF: KY([[0, 0.7], [0.1, 0.86], [0.32, 0.9], [0.7, 0.9], [0.95, 0.84], [1, 0.7]]),
    yC: KY([[0, 0.68], [0.1, 0.84], [0.32, 0.9], [0.33, 0.42], [0.68, 0.42], [0.69, 0.88], [1, 0.7]]),
    xp: KY([[0, 0.82], [1, 0.84]]), tails: 'quad', screen: 0.42 },
  { id: 'wagon', name: '旅行車 WAGGY', en: 'Station wagon', color: 0x3a6a9a, interior: 0x4a4a50, top: 184, acc: 0.3, grip: 0.56, steer: 0.52, mass: 0.66, gears: 5, engine: 'i4', drive: 'fwd', roof: true, roofH: 0.5, starter: true,
    desc: '後面載得下一家人和一隻狗，彎道要慢。', L: 4.7, W: 1.78, clear: 0.17, rs: 0.09, tuck: 0.04, pw: 1.0, wheels: [0.17, 0.82], cockpit: [0.08, 0.68], rim: 'steel', rimCol: 0xb0b4b8,
    a: KY([[0, 0.92], [0.06, 0.97], [0.94, 0.98], [1, 0.9]]),
    yF: KY([[0, 0.86], [0.06, 0.92], [0.7, 0.92], [0.95, 0.84], [1, 0.7]]),
    yC: KY([[0, 0.84], [0.06, 0.92], [0.07, 0.42], [0.68, 0.42], [0.69, 0.9], [1, 0.7]]),
    xp: KY([[0, 0.84], [1, 0.84]]), tails: 'strip', screen: 0.42 },
  { id: 'suv', name: '都市休旅 TAKE', en: 'Compact SUV', color: 0x8a3a2a, interior: 0x2a2a2e, top: 172, acc: 0.3, grip: 0.5, steer: 0.46, mass: 0.74, gears: 6, engine: 'i4', drive: 'awd', roof: true, roofH: 0.55, starter: true,
    desc: '底盤高、視野好，草地和沙灘比較不怕。', L: 4.5, W: 1.84, clear: 0.26, rs: 0.1, tuck: 0.05, pw: 1.0, wheels: [0.18, 0.8], cockpit: [0.1, 0.68], rim: 'steel', rimCol: 0xb0b4b8,
    a: KY([[0, 0.92], [0.06, 0.98], [0.94, 0.98], [1, 0.9]]),
    yF: KY([[0, 0.9], [0.06, 1.0], [0.7, 1.0], [0.95, 0.92], [1, 0.8]]),
    yC: KY([[0, 0.88], [0.06, 1.0], [0.09, 0.5], [0.68, 0.5], [0.69, 0.98], [1, 0.8]]),
    xp: KY([[0, 0.86], [1, 0.86]]), tails: 'strip', screen: 0.42 },
  { id: 'cab', name: '小黃 TAXI', en: 'Taxi', color: 0xf2c21a, interior: 0x3a3a3e, top: 170, acc: 0.24, grip: 0.52, steer: 0.5, mass: 0.6, gears: 5, engine: 'i4', drive: 'fwd', roof: true, roofH: 0.46, starter: true,
    desc: '跑了三十萬公里的小黃，引擎還很硬朗。', L: 4.6, W: 1.76, clear: 0.16, rs: 0.09, tuck: 0.04, pw: 1.0, wheels: [0.17, 0.81], cockpit: [0.33, 0.68], rim: 'steel', rimCol: 0xb0b4b8,
    a: KY([[0, 0.9], [0.08, 0.97], [0.92, 0.98], [1, 0.9]]),
    yF: KY([[0, 0.7], [0.1, 0.86], [0.32, 0.9], [0.7, 0.9], [0.95, 0.84], [1, 0.7]]),
    yC: KY([[0, 0.68], [0.1, 0.84], [0.32, 0.9], [0.33, 0.42], [0.68, 0.42], [0.69, 0.88], [1, 0.7]]),
    xp: KY([[0, 0.82], [1, 0.84]]), tails: 'quad', screen: 0.42 },
];
CARS.unshift(...STARTERS);
