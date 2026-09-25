// 学ぶ（#/learn）と用語集（#/learn/glossary）

import { h, clear } from '../ui/dom.js';
import { show } from '../ui/shell.js';
import { getStore } from '../data.js';
import { normalize } from '../normalize.js';
import { getProgress } from '../storage.js';
import { today } from '../date.js';
import { isDue } from '../leitner.js';
import { navRow } from './search.js';

/** 今日の復習の件数 */
export function dueCount() {
  const progress = getProgress();
  const now = today();
  return getStore().topics.filter((t) => isDue(progress[t.id], now)).length;
}

export function renderLearn() {
  const store = getStore();
  const due = dueCount();
  show({
    title: '学ぶ',
    tab: 'learn',
    node: h(
      'div',
      { class: 'page' },
      h(
        'section',
        { class: 'card review-card' },
        h('h2', { class: 'review-title' }, '今日の復習'),
        h('p', { class: 'review-count' }, due ? `${due} 件` : 'ありません'),
        h('p', { class: 'muted small' }, due ? '復習する日が今日までになっている項目です。' : 'クイズやフラッシュカードで回答すると、次に復習する日が決まります。'),
        due
          ? h(
              'div',
              { class: 'review-actions' },
              h('a', { href: '#/learn/quiz?scope=all&mode=today', class: 'btn btn-primary' }, 'クイズで復習'),
              h('a', { href: '#/learn/cards?scope=all&mode=today', class: 'btn' }, 'カードで復習'),
            )
          : null,
      ),
      h(
        'ul',
        { class: 'list' },
        navRow('#/learn/quiz', 'クイズ', '4択で 1 セット 10 問'),
        navRow('#/learn/cards', 'フラッシュカード', '表に技術名、裏に説明と使ったアプリ'),
        navRow('#/learn/glossary', '用語集', `${store.glossary.length} 語を五十音順で`),
        navRow('#/my/stats', '学習状況', '箱ごとの件数、カテゴリ別の正答率'),
      ),
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
        h('dd', {}, h('p', {}, g.desc), topic ? h('a', { href: `#/topic/${encodeURIComponent(topic.id)}`, class: 'more' }, `「${topic.title}」を見る`) : null),
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
