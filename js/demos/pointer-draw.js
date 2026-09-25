// ミニデモ：Pointer Events で指・ペン・マウスの線を描く。
// 描く場所（canvas）だけ touch-action: none にして、ブラウザのスクロールと競合しないようにする。

import { h } from '../ui/dom.js';

export function isSupported() {
  return typeof window !== 'undefined' && 'PointerEvent' in window && typeof HTMLCanvasElement !== 'undefined';
}

const TYPE_LABELS = { touch: '指', pen: 'ペン', mouse: 'マウス' };

/** @param {HTMLElement} root */
export function mount(root) {
  const canvas = /** @type {HTMLCanvasElement} */ (h('canvas', { class: 'demo-canvas', 'aria-label': '線を描く場所' }));
  const info = h('p', { class: 'demo-out small', 'aria-live': 'polite' }, 'ここに描いてみてください。');
  const ctx = /** @type {CanvasRenderingContext2D} */ (canvas.getContext('2d'));
  /** @type {{x: number, y: number} | null} */
  let last = null;

  const resize = () => {
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = getComputedStyle(root).getPropertyValue('--accent').trim() || '#2f62d8';
  };

  /** @param {PointerEvent} e */
  const pos = (e) => {
    const r = canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  canvas.addEventListener('pointerdown', (e) => {
    canvas.setPointerCapture(e.pointerId);
    last = pos(e);
    info.textContent = `入力：${TYPE_LABELS[/** @type {'touch'|'pen'|'mouse'} */ (e.pointerType)] ?? e.pointerType}`;
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!last || !canvas.hasPointerCapture(e.pointerId)) return;
    const p = pos(e);
    // ペンは筆圧で太さを変える（筆圧がない入力では 0.5 が返る）
    ctx.lineWidth = e.pointerType === 'pen' ? 1 + e.pressure * 8 : 4;
    ctx.beginPath();
    ctx.moveTo(last.x, last.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    last = p;
  });
  const end = () => {
    last = null;
  };
  canvas.addEventListener('pointerup', end);
  canvas.addEventListener('pointercancel', end);

  root.append(
    h('p', {}, '枠の中を指やペンでなぞると線が描けます。マウスでも同じ書き方で動きます。'),
    canvas,
    h('button', { type: 'button', class: 'btn', onclick: () => ctx.clearRect(0, 0, canvas.width, canvas.height) }, '消す'),
    info,
  );
  requestAnimationFrame(resize);
  return () => {
    canvas.width = 0;
    canvas.height = 0;
  };
}
