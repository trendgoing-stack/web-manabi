// クイズとフラッシュカードで共通の「出題範囲とモード」の選択画面。
// URL の例：#/learn/quiz?scope=app:reversi&mode=today

import { h } from '../ui/dom.js';
import { getStore } from '../data.js';
import { getProgress } from '../storage.js';
import { today } from '../date.js';
import { checkStart } from '../quiz-gen.js';

/** @typedef {import('../quiz-gen.js').Scope} Scope */
/** @typedef {import('../quiz-gen.js').Mode} Mode */

const MODES = /** @type {const} */ ([
  ['normal', '通常'],
  ['weak', '苦手を復習（不正解率の高い順）'],
  ['today', '今日の復習'],
]);

/** URL のクエリから範囲とモードを読む */
export function readParams() {
  const q = new URLSearchParams(location.hash.split('?')[1] ?? '');
  return { scope: parseScope(q.get('scope') ?? 'all'), mode: /** @type {Mode} */ (['normal', 'weak', 'today'].includes(q.get('mode') ?? '') ? q.get('mode') : 'normal') };
}

/**
 * @param {string} v 'all' | 'cat:<id>' | 'app:<id>'
 * @returns {Scope}
 */
export function parseScope(v) {
  const store = getStore();
  const [kind, id] = v.split(':');
  if (kind === 'cat' && store.categoryById.has(id)) return { kind: 'category', id };
  if (kind === 'app' && store.appById.has(id)) return { kind: 'app', id };
  return { kind: 'all' };
}

/** @param {Scope} s */
export function scopeValue(s) {
  return s.kind === 'category' ? `cat:${s.id}` : s.kind === 'app' ? `app:${s.id}` : 'all';
}

/** @param {Scope} s */
export function scopeLabel(s) {
  const store = getStore();
  if (s.kind === 'category') return store.categoryById.get(s.id)?.label ?? '';
  if (s.kind === 'app') return store.appById.get(s.id)?.name ?? '';
  return 'すべて';
}

/**
 * @param {Object} opt
 * @param {'quiz'|'cards'} opt.kind
 * @param {Scope} opt.scope
 * @param {Mode} opt.mode
 * @param {(scope: Scope, mode: Mode) => void} opt.onStart
 */
export function studySetup({ kind, scope, mode, onStart }) {
  const store = getStore();
  let cur = { scope, mode };
  const status = h('p', { class: 'setup-status', role: 'status', 'aria-live': 'polite' });
  const startBtn = /** @type {HTMLButtonElement} */ (h('button', { type: 'button', class: 'btn btn-primary btn-block', onclick: () => onStart(cur.scope, cur.mode) }, kind === 'quiz' ? 'クイズを始める' : 'カードを始める'));

  const refresh = () => {
    const r = checkStart(store, cur.scope, cur.mode, getProgress(), today(), kind);
    status.textContent = r.message;
    status.classList.toggle('ng', !r.ok);
    startBtn.disabled = !r.ok;
    // 戻る操作で同じ設定に戻れるよう、URL に残す（履歴は増やさない）
    const q = `?scope=${encodeURIComponent(scopeValue(cur.scope))}&mode=${cur.mode}`;
    try {
      history.replaceState(history.state, '', `${location.hash.split('?')[0]}${q}`);
    } catch {
      /* 無視 */
    }
  };

  const scopeSel = /** @type {HTMLSelectElement} */ (
    h(
      'select',
      { class: 'field-select', 'aria-label': '出題範囲', onchange: () => { cur = { ...cur, scope: parseScope(scopeSel.value) }; refresh(); } },
      h('option', { value: 'all' }, 'すべて'),
      h('optgroup', { label: 'カテゴリ' }, store.categories.map((c) => h('option', { value: `cat:${c.id}` }, c.label))),
      h('optgroup', { label: 'アプリ' }, store.apps.map((a) => h('option', { value: `app:${a.id}` }, a.name))),
    )
  );
  scopeSel.value = scopeValue(scope);

  const modes = h(
    'fieldset',
    { class: 'radio-group' },
    h('legend', {}, 'モード'),
    MODES.map(([v, label]) =>
      h('label', { class: 'radio' }, h('input', { type: 'radio', name: `${kind}-mode`, value: v, checked: v === mode, onchange: () => { cur = { ...cur, mode: v }; refresh(); } }), h('span', {}, label)),
    ),
  );

  refresh();
  return h(
    'div',
    { class: 'setup' },
    h('label', { class: 'field' }, h('span', { class: 'field-label' }, '出題範囲'), scopeSel),
    modes,
    status,
    startBtn,
    h('p', { class: 'muted small' }, '確認済みの項目だけが出題されます。回答するとライトナー方式で次に復習する日が決まり、クイズとフラッシュカードの両方で同じ記録を使います。'),
  );
}
