// カテゴリ別の一覧（#/category/<id>）

import { h } from '../ui/dom.js';
import { show } from '../ui/shell.js';
import { topicRow } from '../ui/badges.js';
import { getStore } from '../data.js';
import { isVisible } from '../status.js';
import { renderNotFound } from './not-found.js';

/** @param {string} id */
export function renderCategory(id) {
  const store = getStore();
  const cat = store.categoryById.get(id);
  if (!cat) return renderNotFound();
  const list = store.topics.filter((t) => t.category === id && isVisible(t));
  const basics = list.filter((t) => t.level === 'basic');
  const others = list.filter((t) => t.level !== 'basic');
  show({
    title: cat.label,
    tab: 'search',
    back: '#/search',
    node: h(
      'div',
      { class: 'page' },
      h('h1', { class: 'page-title' }, cat.label),
      list.length === 0 ? h('p', { class: 'empty' }, 'このカテゴリの項目は準備中です。') : null,
      basics.length ? [h('h2', { class: 'section-title' }, `入門（${basics.length}）`), h('ul', { class: 'list' }, basics.map(topicRow))] : null,
      others.length ? [h('h2', { class: 'section-title' }, `中級（${others.length}）`), h('ul', { class: 'list' }, others.map(topicRow))] : null,
    ),
  });
}
