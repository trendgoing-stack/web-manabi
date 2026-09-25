// 画面下部に短いメッセージを出す。

import { h } from './dom.js';

/** @type {HTMLElement | null} */
let box = null;
/** @type {number | undefined} */
let timer;

/**
 * @param {string} message
 * @param {number} [ms]
 */
export function toast(message, ms = 3000) {
  if (!box) {
    box = h('div', { class: 'toast', role: 'status', 'aria-live': 'polite' });
    document.body.appendChild(box);
  }
  box.textContent = message;
  box.classList.add('show');
  clearTimeout(timer);
  timer = setTimeout(() => box?.classList.remove('show'), ms);
}
