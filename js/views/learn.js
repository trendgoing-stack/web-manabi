// 学ぶ（#/learn）と用語集（#/learn/glossary）

import { h, clear } from '../ui/dom.js';
import { show } from '../ui/shell.js';
import { getStore } from '../data.js';
import { normalize } from '../normalize.js';
import { isVisible } from '../status.js';
import { navRow } from './search.js';

export function renderLearn() {
  const store = getStore();
  show({
    title: '学ぶ',
    tab: 'learn',
    node: h(
      'div',
      { class: 'page' },
      h('ul', { class: 'list' }, navRow('#/learn/glossary', '用語集', `${store.glossary.length} 語を五十音順で`)),
      h('p', { class: 'muted' }, 'クイズ、フラッシュカード、今日の復習は準備中です。'),
    ),
  });
}

let glossaryQuery = '';

export function renderGlossary() {
  const store = getStore();
  const list = h('dl', { class: 'glossary' });
  const count = h('p', { class: 'result-count' });

  const update = () => {
    clear(list);
    const q = normalize(glossaryQuery);
    const hits = store.glossary.filter((g) => !q || normalize(g.term).includes(q) || normalize(g.reading).includes(q) || normalize(g.desc).includes(q));
    count.textContent = `${hits.length} 語`;
    for (const g of hits) {
      const topic = g.topicId ? store.topicById.get(g.topicId) : null;
      list.append(
        h('dt', {}, g.term, h('span', { class: 'reading' }, g.reading)),
        h('dd', {}, h('p', {}, g.desc), topic && isVisible(topic) ? h('a', { href: `#/topic/${encodeURIComponent(topic.id)}`, class: 'more' }, `「${topic.title}」を見る`) : null),
      );
    }
  };

  const input = /** @type {HTMLInputElement} */ (
    h('input', {
      type: 'search',
      class: 'search-input',
      placeholder: '用語を検索',
      'aria-label': '用語を検索',
      enterkeyhint: 'search',
      autocomplete: 'off',
      oninput: () => {
        glossaryQuery = input.value;
        update();
      },
    })
  );
  input.value = glossaryQuery;
  update();

  show({
    title: '用語集',
    tab: 'learn',
    back: '#/learn',
    node: h('div', { class: 'page' }, h('form', { class: 'search-form', role: 'search', onsubmit: (/** @type {Event} */ e) => { e.preventDefault(); input.blur(); } }, input), count, list),
  });
}
