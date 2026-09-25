// マイ（#/my）。お気に入り・履歴・メモ・学習状況はフェーズ2〜3で追加する。

import { h } from '../ui/dom.js';
import { show } from '../ui/shell.js';

export function renderMy() {
  show({
    title: 'マイ',
    tab: 'my',
    node: h('div', { class: 'page' }, h('p', { class: 'muted' }, 'お気に入り、閲覧履歴、メモ、学習状況は準備中です。')),
  });
}
