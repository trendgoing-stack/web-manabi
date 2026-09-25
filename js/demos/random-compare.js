// ミニデモ：crypto.getRandomValues と Math.random で、サイコロを何度もふって出目の分布を比べる。

import { h, clear } from '../ui/dom.js';

const ROLLS = 6000;
const buf = new Uint32Array(1);
const RANGE = 0x100000000;

export function isSupported() {
  return typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function';
}

/** 0〜5 を偏りなく（棄却サンプリング） */
function cryptoDie() {
  const limit = RANGE - (RANGE % 6);
  let x;
  do {
    crypto.getRandomValues(buf);
    x = buf[0];
  } while (x >= limit);
  return x % 6;
}

const mathDie = () => Math.floor(Math.random() * 6);

/**
 * @param {string} title
 * @param {number[]} counts
 */
function chart(title, counts) {
  const max = Math.max(...counts);
  const expected = ROLLS / 6;
  return h(
    'div',
    { class: 'demo-chart' },
    h('p', { class: 'demo-chart-title' }, title),
    h(
      'ul',
      { class: 'bars' },
      counts.map((c, i) =>
        h(
          'li',
          { class: 'bar-row' },
          h('span', { class: 'bar-label' }, `${i + 1} の目`),
          h('span', { class: 'bar-track', 'aria-hidden': 'true' }, h('span', { class: 'bar-fill', style: `width: ${(c / max) * 100}%` })),
          h('span', { class: 'bar-value' }, `${c} 回`),
        ),
      ),
    ),
    h('p', { class: 'muted small' }, `期待値（${expected} 回）からのずれ：最大 ${Math.max(...counts.map((c) => Math.abs(c - expected)))} 回`),
  );
}

/** @param {HTMLElement} root */
export function mount(root) {
  const out = h('div', { class: 'demo-out', 'aria-live': 'polite' });
  const run = () => {
    const a = [0, 0, 0, 0, 0, 0];
    const b = [0, 0, 0, 0, 0, 0];
    for (let i = 0; i < ROLLS; i++) {
      a[cryptoDie()]++;
      b[mathDie()]++;
    }
    clear(out);
    out.append(
      chart('crypto.getRandomValues（棄却サンプリング）', a),
      chart('Math.random', b),
      h('p', { class: 'small' }, 'どちらも出目はほぼ均等で、見た目の分布では違いが分かりません。違うのは「次の値を予測されにくいか」という質の部分で、公平さを説明したい抽選では crypto.getRandomValues が向いています。'),
    );
  };
  root.append(
    h('p', {}, `サイコロを ${ROLLS.toLocaleString('ja-JP')} 回ずつふって、出目の回数を比べます。`),
    h('button', { type: 'button', class: 'btn btn-primary', onclick: run }, 'サイコロをふる'),
    out,
  );
  return () => {};
}
