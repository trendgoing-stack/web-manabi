// ミニデモ：Canvas による画像の縮小。
// 端末内の画像を選ぶと、長い辺を 800px に縮小して JPEG で書き出し、前後の大きさを比べる。
// 画像はどこにも送信しない。使い終わった ObjectURL は revoke し、canvas は幅と高さを 0 にしてメモリを手放す。

import { h, clear } from '../ui/dom.js';

const MAX_SIDE = 800;
const QUALITY = 0.8;

export function isSupported() {
  return typeof HTMLCanvasElement !== 'undefined' && typeof HTMLCanvasElement.prototype.toBlob === 'function';
}

/** @param {number} n */
const kb = (n) => (n >= 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);

/**
 * 画像ファイルを描画できる形に読み込む
 * @param {File} file
 * @returns {Promise<{source: CanvasImageSource, width: number, height: number, close: () => void}>}
 */
async function decode(file) {
  if (typeof createImageBitmap === 'function') {
    try {
      const bmp = await createImageBitmap(file);
      return { source: bmp, width: bmp.width, height: bmp.height, close: () => bmp.close() };
    } catch {
      /* <img> で読み直す */
    }
  }
  const url = URL.createObjectURL(file);
  const img = new Image();
  img.src = url;
  try {
    await img.decode();
  } catch (e) {
    URL.revokeObjectURL(url);
    throw e;
  }
  return { source: img, width: img.naturalWidth, height: img.naturalHeight, close: () => URL.revokeObjectURL(url) };
}

/** @param {HTMLElement} root */
export function mount(root) {
  /** @type {string | null} */
  let previewUrl = null;
  let busy = false;
  const out = h('div', { class: 'demo-out', 'aria-live': 'polite' });
  const input = /** @type {HTMLInputElement} */ (h('input', { type: 'file', accept: 'image/*', class: 'visually-hidden', tabindex: '-1', 'aria-hidden': 'true' }));

  const revoke = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    previewUrl = null;
  };

  input.addEventListener('change', async () => {
    const file = input.files?.[0];
    input.value = '';
    if (!file || busy) return;
    busy = true;
    clear(out);
    out.append(h('p', { class: 'muted' }, '処理しています…'));
    const canvas = document.createElement('canvas');
    try {
      const img = await decode(file);
      const scale = Math.min(1, MAX_SIDE / Math.max(img.width, img.height));
      canvas.width = Math.max(1, Math.round(img.width * scale));
      canvas.height = Math.max(1, Math.round(img.height * scale));
      const ctx = /** @type {CanvasRenderingContext2D} */ (canvas.getContext('2d'));
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img.source, 0, 0, canvas.width, canvas.height);
      img.close();
      const blob = await new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('書き出せませんでした'))), 'image/jpeg', QUALITY));
      revoke();
      previewUrl = URL.createObjectURL(/** @type {Blob} */ (blob));
      clear(out);
      out.append(
        h(
          'table',
          { class: 'demo-table' },
          h('tr', {}, h('th', {}, ''), h('th', {}, '大きさ'), h('th', {}, 'ファイルサイズ')),
          h('tr', {}, h('th', {}, '元の画像'), h('td', {}, `${img.width}×${img.height}`), h('td', {}, kb(file.size))),
          h('tr', {}, h('th', {}, '縮小後'), h('td', {}, `${canvas.width}×${canvas.height}`), h('td', {}, kb(/** @type {Blob} */ (blob).size))),
        ),
        h('img', { src: previewUrl, alt: '縮小した画像', class: 'demo-preview' }),
        h('p', { class: 'muted small' }, `長い辺を ${MAX_SIDE}px 以下にして、JPEG（画質 ${QUALITY * 100}%）で書き出しました。画像は端末の外には送信していません。`),
      );
    } catch {
      clear(out);
      out.append(h('p', { class: 'form-error' }, 'この画像は読み込めませんでした。別の画像で試してください。'));
    } finally {
      // canvas のメモリを手放す
      canvas.width = 0;
      canvas.height = 0;
      busy = false;
    }
  });

  root.append(
    h('p', {}, '端末の中の画像を 1 枚選ぶと、canvas で縮小して、前後の大きさを比べます。'),
    h('button', { type: 'button', class: 'btn btn-primary', onclick: () => input.click() }, '画像を選ぶ'),
    input,
    out,
  );
  return () => revoke();
}
