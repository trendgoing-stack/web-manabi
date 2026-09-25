// 用語のポップアップ（<dialog>）。本文中の [[用語]] をタップしたときに開く。

import { h, clear } from './dom.js';
import { getStore } from '../data.js';
import { isVisible } from '../status.js';

/** @type {HTMLDialogElement | null} */
let dialog = null;

function ensureDialog() {
  if (dialog) return dialog;
  dialog = /** @type {HTMLDialogElement} */ (h('dialog', { class: 'popup', 'aria-labelledby': 'popup-title' }));
  // 背景（ダイアログの外側）をタップしたら閉じる
  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) dialog.close();
  });
  document.body.appendChild(dialog);
  return dialog;
}

/** @param {string} term */
export function openGlossary(term) {
  const store = getStore();
  const entry = store.glossaryByTerm.get(term);
  if (!entry) return;
  const d = ensureDialog();
  clear(d);
  const topic = entry.topicId ? store.topicById.get(entry.topicId) : null;
  d.append(
    h(
      'div',
      { class: 'popup-body' },
      h('p', { class: 'popup-reading' }, entry.reading),
      h('h2', { id: 'popup-title', class: 'popup-title' }, entry.term),
      h('p', { class: 'popup-desc' }, entry.desc),
      h(
        'div',
        { class: 'popup-actions' },
        topic && isVisible(topic)
          ? h('a', { href: `#/topic/${encodeURIComponent(topic.id)}`, class: 'btn btn-primary', onclick: () => d.close() }, `「${topic.title}」を見る`)
          : null,
        h('button', { type: 'button', class: 'btn', onclick: () => d.close() }, '閉じる'),
      ),
    ),
  );
  d.showModal();
}

export function closePopup() {
  if (dialog?.open) dialog.close();
}
