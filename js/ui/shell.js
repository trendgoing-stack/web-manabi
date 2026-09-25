// 画面の枠（ヘッダー・本文・タブバー）の切り替え。

import { clear } from './dom.js';
import { goBack } from '../router.js';
import { closePopup } from './popup.js';

/** @typedef {'search'|'apps'|'learn'|'my'|'settings'} TabId */

/** @type {string | null} */
let backTarget = null;

export function initShell() {
  const back = /** @type {HTMLButtonElement} */ (document.getElementById('back'));
  back.addEventListener('click', () => {
    if (backTarget) goBack(backTarget);
  });
}

/**
 * @param {Object} opt
 * @param {string} opt.title ヘッダーに出す見出し
 * @param {TabId | null} opt.tab 選択中にするタブ
 * @param {string | null} [opt.back] 戻るボタンを出すときの戻り先（アプリ内の履歴がないとき）
 * @param {Node} opt.node 本文
 */
export function show({ title, tab, back = null, node }) {
  closePopup();
  backTarget = back;
  const header = /** @type {HTMLElement} */ (document.getElementById('header-title'));
  header.textContent = title;
  document.title = title === 'Webまなび帳' ? title : `${title} | Webまなび帳`;
  /** @type {HTMLButtonElement} */ (document.getElementById('back')).hidden = !back;

  for (const a of document.querySelectorAll('.tabbar a')) {
    const on = /** @type {HTMLElement} */ (a).dataset.tab === tab;
    a.classList.toggle('active', on);
    if (on) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  }

  const view = /** @type {HTMLElement} */ (document.getElementById('view'));
  clear(view);
  view.appendChild(node);
}
