// 見つからない画面

import { h } from '../ui/dom.js';
import { show } from '../ui/shell.js';

/** @param {string} [message] */
export function renderNotFound(message = 'ページが見つかりませんでした。') {
  show({
    title: '見つかりません',
    tab: null,
    back: '#/search',
    node: h('div', { class: 'page' }, h('p', { class: 'empty' }, message), h('p', {}, h('a', { href: '#/search', class: 'btn' }, '探すに戻る'))),
  });
}
