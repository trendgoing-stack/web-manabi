// マイ（#/my）とその下の一覧（#/my/favorites、#/my/history、#/my/notes）。
// 学習状況はフェーズ3で追加する。
// 一覧には、未確認項目を表示しない設定でも、自分で登録した項目は表示する。

import { h, clear, icon, ICONS } from '../ui/dom.js';
import { show } from '../ui/shell.js';
import { stateBadge, topicRow } from '../ui/badges.js';
import { confirmDialog } from '../ui/dialog.js';
import { toast } from '../ui/toast.js';
import { getStore } from '../data.js';
import { clearHistory, getFavorites, getHistory, getNotes, moveFavorite, toggleFavorite } from '../storage.js';
import { navRow } from './search.js';

export function renderMy() {
  const { topicById } = getStore();
  const favs = getFavorites().filter((id) => topicById.has(id));
  const hist = getHistory().filter((x) => topicById.has(x.id));
  const notes = Object.keys(getNotes()).filter((id) => topicById.has(id));

  show({
    title: 'マイ',
    tab: 'my',
    node: h(
      'div',
      { class: 'page' },
      h(
        'ul',
        { class: 'list' },
        navRow('#/my/favorites', 'お気に入り', favs.length ? `${favs.length} 件` : 'まだありません（詳細画面の ☆ で追加）'),
        navRow('#/my/history', '閲覧履歴', hist.length ? `${hist.length} 件（最新 50 件まで）` : 'まだありません'),
        navRow('#/my/notes', 'メモを付けた項目', notes.length ? `${notes.length} 件` : 'まだありません（詳細画面のいちばん下で書けます）'),
      ),
      favs.length ? [h('h2', { class: 'section-title' }, 'お気に入り'), h('ul', { class: 'list' }, favs.slice(0, 5).map((id) => topicRow(/** @type {any} */ (topicById.get(id)))))] : null,
      h('h2', { class: 'section-title' }, '学習状況'),
      h('p', { class: 'muted' }, '学習状況（クイズやフラッシュカードの記録）は準備中です。'),
      h('p', { class: 'muted small' }, 'お気に入り・履歴・メモは、この端末の中だけに保存されます。設定のエクスポートで控えを取れます。'),
    ),
  });
}

export function renderFavorites() {
  const { topicById } = getStore();
  let editing = false;
  const listBox = h('div', {});
  const toggle = h('button', { type: 'button', class: 'btn btn-small' });

  const paint = () => {
    clear(listBox);
    const ids = getFavorites().filter((id) => topicById.has(id));
    toggle.textContent = editing ? '完了' : '並べ替え・削除';
    toggle.hidden = ids.length === 0;
    if (!ids.length) {
      listBox.append(h('p', { class: 'empty' }, 'お気に入りはまだありません。技術の詳細画面で ☆ をタップすると追加できます。'));
      return;
    }
    if (!editing) {
      listBox.append(h('ul', { class: 'list' }, ids.map((id) => topicRow(/** @type {any} */ (topicById.get(id))))));
      return;
    }
    listBox.append(
      h(
        'ul',
        { class: 'list' },
        ids.map((id, i) => {
          const t = /** @type {import('../types.js').Topic} */ (topicById.get(id));
          return h(
            'li',
            { class: 'edit-row' },
            h('span', { class: 'edit-title' }, t.title),
            h('button', { type: 'button', class: 'icon-btn', 'aria-label': `${t.title}を上へ`, disabled: i === 0, onclick: () => { moveFavorite(id, -1); paint(); } }, '↑'),
            h('button', { type: 'button', class: 'icon-btn', 'aria-label': `${t.title}を下へ`, disabled: i === ids.length - 1, onclick: () => { moveFavorite(id, 1); paint(); } }, '↓'),
            h(
              'button',
              {
                type: 'button',
                class: 'icon-btn danger',
                'aria-label': `${t.title}をお気に入りから外す`,
                onclick: () => {
                  toggleFavorite(id);
                  toast(`「${t.title}」をお気に入りから外しました`);
                  paint();
                },
              },
              '✕',
            ),
          );
        }),
      ),
    );
  };
  toggle.addEventListener('click', () => {
    editing = !editing;
    paint();
  });
  paint();

  show({
    title: 'お気に入り',
    tab: 'my',
    back: '#/my',
    node: h('div', { class: 'page' }, h('div', { class: 'toolbar' }, toggle), listBox),
  });
}

/** @param {string} iso */
function formatTime(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const p = (/** @type {number} */ n) => String(n).padStart(2, '0');
  return `${d.getMonth() + 1}/${d.getDate()} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

export function renderHistory() {
  const { topicById } = getStore();
  const box = h('div', {});
  const paint = () => {
    clear(box);
    const items = getHistory().filter((x) => topicById.has(x.id));
    if (!items.length) {
      box.append(h('p', { class: 'empty' }, '閲覧履歴はまだありません。'));
      return;
    }
    box.append(
      h(
        'div',
        { class: 'toolbar' },
        h(
          'button',
          {
            type: 'button',
            class: 'btn btn-small',
            onclick: () =>
              confirmDialog({
                title: '閲覧履歴をすべて消しますか？',
                body: 'お気に入りとメモは消えません。',
                okLabel: 'すべて消す',
                danger: true,
                onOk: () => {
                  clearHistory();
                  toast('閲覧履歴を消しました');
                  paint();
                },
              }),
          },
          '履歴をすべて消す',
        ),
      ),
      h(
        'ul',
        { class: 'list' },
        items.map((x) => {
          const t = /** @type {import('../types.js').Topic} */ (topicById.get(x.id));
          return h(
            'li',
            {},
            h(
              'a',
              { href: `#/topic/${encodeURIComponent(t.id)}`, class: 'row' },
              h('div', { class: 'row-main' }, h('div', { class: 'row-title' }, t.title, stateBadge(t)), h('div', { class: 'row-summary' }, formatTime(x.at))),
              icon(ICONS.chevron, 'icon icon-chevron'),
            ),
          );
        }),
      ),
    );
  };
  paint();
  show({ title: '閲覧履歴', tab: 'my', back: '#/my', node: h('div', { class: 'page' }, box) });
}

export function renderNotesList() {
  const { topicById } = getStore();
  const notes = Object.entries(getNotes())
    .filter(([id]) => topicById.has(id))
    .sort((a, b) => (a[1].updatedAt < b[1].updatedAt ? 1 : -1));
  show({
    title: 'メモを付けた項目',
    tab: 'my',
    back: '#/my',
    node: h(
      'div',
      { class: 'page' },
      notes.length === 0
        ? h('p', { class: 'empty' }, 'メモはまだありません。技術の詳細画面のいちばん下で書けます。')
        : h(
            'ul',
            { class: 'list' },
            notes.map(([id, n]) => {
              const t = /** @type {import('../types.js').Topic} */ (topicById.get(id));
              return h(
                'li',
                {},
                h(
                  'a',
                  { href: `#/topic/${encodeURIComponent(id)}`, class: 'row' },
                  h(
                    'div',
                    { class: 'row-main' },
                    h('div', { class: 'row-title' }, t.title),
                    h('div', { class: 'row-summary memo-preview' }, n.text),
                    h('div', { class: 'muted small' }, `更新：${formatTime(n.updatedAt)}`),
                  ),
                  icon(ICONS.chevron, 'icon icon-chevron'),
                ),
              );
            }),
          ),
    ),
  });
}
