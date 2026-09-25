// 確認ダイアログ（<dialog>）。全削除や置き換えのように取り消せない操作の前に使う。

import { h } from './dom.js';

/**
 * @param {Object} opt
 * @param {string} opt.title
 * @param {string} opt.body
 * @param {string} opt.okLabel
 * @param {boolean} [opt.danger]
 * @param {() => void} opt.onOk ボタンのタップの中で同期的に呼ばれる
 */
export function confirmDialog({ title, body, okLabel, danger = false, onOk }) {
  const dlg = /** @type {HTMLDialogElement} */ (
    h(
      'dialog',
      { class: 'popup', 'aria-labelledby': 'confirm-title' },
      h(
        'div',
        { class: 'popup-body' },
        h('h2', { id: 'confirm-title', class: 'popup-title' }, title),
        h('p', { class: 'popup-desc' }, body),
        h(
          'div',
          { class: 'popup-actions' },
          h('button', { type: 'button', class: 'btn', onclick: () => close() }, 'キャンセル'),
          h(
            'button',
            {
              type: 'button',
              class: `btn ${danger ? 'btn-danger' : 'btn-primary'}`,
              onclick: () => {
                close();
                onOk();
              },
            },
            okLabel,
          ),
        ),
      ),
    )
  );
  const close = () => {
    if (dlg.open) dlg.close();
  };
  dlg.addEventListener('close', () => dlg.remove());
  dlg.addEventListener('click', (e) => {
    if (e.target === dlg) close();
  });
  window.addEventListener('hashchange', close, { once: true });
  document.body.appendChild(dlg);
  dlg.showModal();
}
