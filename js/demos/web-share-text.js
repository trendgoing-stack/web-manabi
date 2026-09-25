// ミニデモ：Web Share API でテキストを共有する。
// navigator.share はタップのハンドラの中で同期的に呼ぶ（await を挟まない）。

import { h } from '../ui/dom.js';

export function isSupported() {
  return typeof navigator !== 'undefined' && typeof navigator.share === 'function';
}

/** @param {HTMLElement} root */
export function mount(root) {
  const status = h('p', { class: 'demo-out small', role: 'status', 'aria-live': 'polite' });
  const ta = /** @type {HTMLTextAreaElement} */ (h('textarea', { class: 'memo', rows: '3', 'aria-label': '共有するテキスト', maxlength: '500' }));
  ta.value = 'Webまなび帳で Web Share API を試しました。';
  const btn = h(
    'button',
    {
      type: 'button',
      class: 'btn btn-primary',
      onclick: () => {
        status.textContent = '';
        let p;
        try {
          // ここで await を挟むと、タップとの結び付きが切れて失敗することがある
          p = navigator.share({ text: ta.value });
        } catch {
          status.textContent = '共有シートを開けませんでした。';
          return;
        }
        p.then(
          () => (status.textContent = '共有しました。'),
          (err) => (status.textContent = err && err.name === 'AbortError' ? '共有をキャンセルしました。' : '共有できませんでした。'),
        );
      },
    },
    '共有シートを開く',
  );
  root.append(h('p', {}, '入力したテキストを、端末の共有シートでほかのアプリに渡します。'), ta, btn, status);
  return () => {};
}
