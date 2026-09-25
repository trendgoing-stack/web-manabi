// アプリのアイコン（仮デザイン）を作る。外部ライブラリは使わず、Node.js の zlib だけで PNG を書き出す。
//   node tools/make-icons.mjs
// 出力：icons/icon.svg、icon-180.png（apple-touch-icon）、icon-192.png、icon-512.png、icon-maskable-512.png
// デザイン：青い背景に、白い開いた本と、コードを表す < > の記号。

import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'icons');
const BG_TOP = [59, 111, 224];
const BG_BOTTOM = [36, 71, 168];
const PAGE = [255, 255, 255];
const MARK = [47, 98, 216];

// 512×512 の座標で形を定義する
const LEFT_PAGE = [[96, 150], [246, 176], [246, 392], [96, 366]];
const RIGHT_PAGE = [[416, 150], [266, 176], [266, 392], [416, 366]];
const STROKE = 11; // 記号の線の太さの半分
const LT = [[[200, 230], [150, 272]], [[150, 272], [200, 314]]];
const GT = [[[312, 230], [362, 272]], [[362, 272], [312, 314]]];

/** 点が凸多角形の中にあるか */
function inPolygon(x, y, poly) {
  let sign = 0;
  for (let i = 0; i < poly.length; i++) {
    const [x1, y1] = poly[i];
    const [x2, y2] = poly[(i + 1) % poly.length];
    const c = (x2 - x1) * (y - y1) - (y2 - y1) * (x - x1);
    if (c !== 0) {
      if (sign === 0) sign = Math.sign(c);
      else if (Math.sign(c) !== sign) return false;
    }
  }
  return true;
}

/** 点と線分の距離 */
function distToSegment(x, y, [[x1, y1], [x2, y2]]) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const t = Math.max(0, Math.min(1, ((x - x1) * dx + (y - y1) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(x - (x1 + t * dx), y - (y1 + t * dy));
}

/**
 * 絵柄の色（512 座標）。絵柄がなければ null
 * @param {number} x
 * @param {number} y
 */
function figureAt(x, y) {
  if ([...LT, ...GT].some((seg) => distToSegment(x, y, seg) <= STROKE)) return MARK;
  if (inPolygon(x, y, LEFT_PAGE) || inPolygon(x, y, RIGHT_PAGE)) return PAGE;
  return null;
}

/** 背景のグラデーション（縦方向） @param {number} y */
function backgroundAt(y) {
  const t = y / 512;
  return BG_TOP.map((c, i) => Math.round(c + (BG_BOTTOM[i] - c) * t));
}

/**
 * @param {number} size 出力の大きさ
 * @param {number} scale 絵柄の縮尺（maskable は小さめにして周りに余白をとる）
 */
function render(size, scale = 1) {
  const SS = 4; // 1 画素あたり 4×4 点で平均をとり、縁をなめらかにする
  const px = new Uint8Array(size * size * 4);
  for (let py = 0; py < size; py++) {
    for (let pxX = 0; pxX < size; pxX++) {
      let r = 0;
      let g = 0;
      let b = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const u = ((pxX + (sx + 0.5) / SS) / size) * 512;
          const v = ((py + (sy + 0.5) / SS) / size) * 512;
          // 絵柄は中心を基準に縮める。背景のグラデーションは縮めない
          const fx = 256 + (u - 256) / scale;
          const fy = 256 + (v - 256) / scale;
          const cc = figureAt(fx, fy) ?? backgroundAt(v);
          r += cc[0];
          g += cc[1];
          b += cc[2];
        }
      }
      const i = (py * size + pxX) * 4;
      const n = SS * SS;
      px[i] = Math.round(r / n);
      px[i + 1] = Math.round(g / n);
      px[i + 2] = Math.round(b / n);
      px[i + 3] = 255;
    }
  }
  return encodePng(size, size, px);
}

// ---------- PNG ----------

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

/** @param {Uint8Array} buf */
function crc32(buf) {
  let crc = 0xffffffff;
  for (const byte of buf) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

/**
 * @param {string} type
 * @param {Uint8Array} data
 */
function chunk(type, data) {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, 'ascii');
  Buffer.from(data).copy(out, 8);
  out.writeUInt32BE(crc32(out.subarray(4, 8 + data.length)), 8 + data.length);
  return out;
}

/**
 * @param {number} w
 * @param {number} h
 * @param {Uint8Array} rgba
 */
function encodePng(w, h, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; // ビット深度
  ihdr[9] = 6; // RGBA
  const raw = Buffer.alloc(h * (w * 4 + 1));
  for (let y = 0; y < h; y++) {
    raw[y * (w * 4 + 1)] = 0; // フィルターなし
    Buffer.from(rgba.subarray(y * w * 4, (y + 1) * w * 4)).copy(raw, y * (w * 4 + 1) + 1);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', new Uint8Array(0)),
  ]);
}

// ---------- SVG（ブラウザのタブ用） ----------

function svg() {
  const pts = (/** @type {number[][]} */ p) => p.map(([x, y]) => `${x},${y}`).join(' ');
  const hex = (/** @type {number[]} */ c) => `#${c.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs><linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${hex(BG_TOP)}"/><stop offset="1" stop-color="${hex(BG_BOTTOM)}"/></linearGradient></defs>
  <rect width="512" height="512" rx="112" fill="url(#bg)"/>
  <polygon points="${pts(LEFT_PAGE)}" fill="${hex(PAGE)}"/>
  <polygon points="${pts(RIGHT_PAGE)}" fill="${hex(PAGE)}"/>
  <g fill="none" stroke="${hex(MARK)}" stroke-width="${STROKE * 2}" stroke-linecap="round" stroke-linejoin="round">
    <polyline points="200,230 150,272 200,314"/>
    <polyline points="312,230 362,272 312,314"/>
  </g>
</svg>
`;
}

mkdirSync(OUT, { recursive: true });
writeFileSync(join(OUT, 'icon.svg'), svg());
for (const [name, size, scale] of /** @type {[string, number, number][]} */ ([
  ['icon-180.png', 180, 1],
  ['icon-192.png', 192, 1],
  ['icon-512.png', 512, 1],
  ['icon-maskable-512.png', 512, 0.82],
])) {
  writeFileSync(join(OUT, name), render(size, scale));
  console.log(`icons/${name}`);
}
console.log('icons/icon.svg');
