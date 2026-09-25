// 探す：検索と絞り込み。検索語が空のときはカテゴリ一覧と「アプリから探す」を出す。
// 検索語と絞り込みはこのモジュールに持っておき、詳細画面から戻ったときに復元する。

import { h, clear, icon, ICONS } from '../ui/dom.js';
import { show } from '../ui/shell.js';
import { topicRow } from '../ui/badges.js';
import { getStore } from '../data.js';
import { buildIndex, search } from '../search.js';
import { isVisible } from '../status.js';
import { LEVEL_LABELS, SEARCH_DEBOUNCE_MS, SEARCH_LIMIT } from '../config.js';

const state = { query: '', category: '', level: '', app: '' };

/** @type {ReturnType<typeof buildIndex> | null} */
let index = null;

export function renderSearch() {
  const store = getStore();
  index ??= buildIndex(store.topics);

  const results = h('div', { class: 'results', 'aria-live': 'polite' });
  /** @type {number | undefined} */
  let timer;

  const input = /** @type {HTMLInputElement} */ (
    h('input', {
      type: 'search',
      class: 'search-input',
      value: state.query,
      placeholder: '技術名・カタカナ・英字で検索',
      'aria-label': '検索語',
      enterkeyhint: 'search',
      autocomplete: 'off',
      autocapitalize: 'off',
      autocorrect: 'off',
      spellcheck: 'false',
      oninput: () => {
        clearTimeout(timer);
        timer = setTimeout(() => {
          state.query = input.value;
          update();
        }, SEARCH_DEBOUNCE_MS);
      },
    })
  );
  input.value = state.query;

  const form = h(
    'form',
    {
      class: 'search-form',
      role: 'search',
      onsubmit: (/** @type {Event} */ e) => {
        e.preventDefault();
        clearTimeout(timer);
        state.query = input.value;
        update();
        input.blur(); // キーボードを閉じる
      },
    },
    input,
  );

  const filters = h(
    'div',
    { class: 'filters' },
    select('カテゴリ', 'category', [['', 'すべてのカテゴリ'], ...store.categories.map((c) => [c.id, c.label])]),
    select('レベル', 'level', [['', 'すべてのレベル'], ...Object.entries(LEVEL_LABELS)]),
    select('アプリ', 'app', [['', 'すべてのアプリ'], ...store.apps.map((a) => [a.id, a.name])]),
  );

  /**
   * @param {string} label
   * @param {'category'|'level'|'app'} key
   * @param {string[][]} options
   */
  function select(label, key, options) {
    const el = /** @type {HTMLSelectElement} */ (
      h(
        'select',
        {
          'aria-label': label,
          class: 'filter-select',
          onchange: () => {
            state[key] = el.value;
            el.classList.toggle('on', !!el.value);
            update();
          },
        },
        options.map(([v, t]) => h('option', { value: v }, t)),
      )
    );
    el.value = state[key];
    el.classList.toggle('on', !!state[key]);
    return el;
  }

  function update() {
    clear(results);
    const hasQuery = state.query.trim() !== '';
    const hasFilter = !!(state.category || state.level || state.app);
    if (!hasQuery && !hasFilter) {
      results.append(homeSections());
      return;
    }
    const appTopics = state.app ? new Set(store.topicsByApp.get(state.app) ?? []) : null;
    const list = search(
      /** @type {ReturnType<typeof buildIndex>} */ (index),
      state.query,
      (t) =>
        isVisible(t) &&
        (!state.category || t.category === state.category) &&
        (!state.level || t.level === state.level) &&
        (!appTopics || appTopics.has(t)),
      SEARCH_LIMIT,
    );
    if (list.length === 0) {
      results.append(
        h('p', { class: 'empty' }, '見つかりませんでした。言葉を変えるか、カテゴリや用語集から探してみてください。'),
        categoryList(),
        h('ul', { class: 'list' }, navRow('#/learn/glossary', '用語集から探す', `${store.glossary.length} 語`)),
      );
      return;
    }
    results.append(
      h('p', { class: 'result-count' }, `${list.length} 件${list.length >= SEARCH_LIMIT ? '（上位のみ表示）' : ''}`),
      h('ul', { class: 'list' }, list.map(topicRow)),
    );
  }

  update();
  show({ title: 'Webまなび帳', tab: 'search', node: h('div', { class: 'page' }, form, filters, results) });
}

function homeSections() {
  const store = getStore();
  return h(
    'div',
    {},
    h('h2', { class: 'section-title' }, 'カテゴリから探す'),
    categoryList(),
    h('h2', { class: 'section-title' }, 'ほかの探し方'),
    h(
      'ul',
      { class: 'list' },
      navRow('#/apps', 'アプリから探す', `${store.apps.length} 本のアプリで使った技術`),
      navRow('#/learn/glossary', '用語集', `${store.glossary.length} 語`),
    ),
  );
}

export function categoryList() {
  const store = getStore();
  return h(
    'ul',
    { class: 'cat-grid' },
    store.categories.map((c) => {
      const n = store.topics.filter((t) => t.category === c.id && isVisible(t)).length;
      return h(
        'li',
        {},
        n > 0
          ? h('a', { href: `#/category/${encodeURIComponent(c.id)}`, class: `cat-card cat-${c.id}` }, h('span', { class: 'cat-name' }, c.label), h('span', { class: 'cat-count' }, `${n} 件`))
          : h('div', { class: `cat-card cat-${c.id} disabled`, 'aria-disabled': 'true' }, h('span', { class: 'cat-name' }, c.label), h('span', { class: 'cat-count' }, '準備中')),
      );
    }),
  );
}

/**
 * @param {string} href
 * @param {string} title
 * @param {string} sub
 */
export function navRow(href, title, sub) {
  return h(
    'li',
    {},
    h('a', { href, class: 'row' }, h('div', { class: 'row-main' }, h('div', { class: 'row-title' }, title), h('div', { class: 'row-summary' }, sub)), icon(ICONS.chevron, 'icon icon-chevron')),
  );
}
