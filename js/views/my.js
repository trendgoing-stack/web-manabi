// マイ（#/my）とその下の一覧（#/my/favorites、#/my/history、#/my/notes、#/my/stats）。
// 一覧には、未確認項目を表示しない設定でも、自分で登録した項目は表示する。

import { h, clear, icon, ICONS } from '../ui/dom.js';
import { show } from '../ui/shell.js';
import { stateBadge, topicRow } from '../ui/badges.js';
import { confirmDialog } from '../ui/dialog.js';
import { toast } from '../ui/toast.js';
import { getStore } from '../data.js';
import { clearHistory, getFavorites, getHistory, getNotes, getProgress, moveFavorite, toggleFavorite } from '../storage.js';
import { today } from '../date.js';
import { isDue, MAX_BOX } from '../leitner.js';
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
      statsSummary(),
      h('ul', { class: 'list' }, navRow('#/my/stats', '学習状況をくわしく見る', '箱ごとの件数、カテゴリ別の正答率')),
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

/**
 * 学習状況の集計（今ある項目のうち、記録があるもの）
 */
function computeStats() {
  const store = getStore();
  const progress = getProgress();
  const now = today();
  /** @type {number[]} 添字 1〜5 が箱 */
  const boxes = Array(MAX_BOX + 1).fill(0);
  let unlearned = 0;
  let due = 0;
  for (const t of store.topics) {
    const p = progress[t.id];
    if (p) boxes[p.box]++;
    else if (t.verified) unlearned++;
    if (t.verified && isDue(p, now)) due++;
  }
  const byCategory = store.categories.map((c) => {
    let correct = 0;
    let wrong = 0;
    for (const t of store.topics) {
      if (t.category !== c.id) continue;
      const p = progress[t.id];
      if (p) {
        correct += p.correct;
        wrong += p.wrong;
      }
    }
    return { cat: c, correct, wrong };
  });
  return { boxes, unlearned, due, byCategory, answered: byCategory.reduce((n, x) => n + x.correct + x.wrong, 0) };
}

function statsSummary() {
  const s = computeStats();
  const learned = s.boxes.reduce((a, b) => a + b, 0);
  return h(
    'div',
    { class: 'stat-tiles' },
    h('div', { class: 'stat-tile' }, h('span', { class: 'stat-value' }, String(s.due)), h('span', { class: 'stat-label' }, '今日の復習')),
    h('div', { class: 'stat-tile' }, h('span', { class: 'stat-value' }, String(learned)), h('span', { class: 'stat-label' }, '学習した項目')),
    h('div', { class: 'stat-tile' }, h('span', { class: 'stat-value' }, String(s.answered)), h('span', { class: 'stat-label' }, '回答した回数')),
  );
}

export function renderStats() {
  const s = computeStats();
  const maxBox = Math.max(1, s.unlearned, ...s.boxes.slice(1));
  /**
   * @param {string} label
   * @param {number} n
   * @param {string} note
   */
  const boxRow = (label, n, note) =>
    h(
      'li',
      { class: 'bar-row' },
      h('span', { class: 'bar-label' }, label, h('span', { class: 'bar-note' }, note)),
      h('span', { class: 'bar-track', 'aria-hidden': 'true' }, h('span', { class: 'bar-fill', style: `width: ${(n / maxBox) * 100}%` })),
      h('span', { class: 'bar-value' }, `${n} 件`),
    );
  const intervals = ['', '1日後', '2日後', '4日後', '8日後', '16日後'];

  show({
    title: '学習状況',
    tab: 'my',
    back: '#/my',
    node: h(
      'div',
      { class: 'page' },
      statsSummary(),
      h('h2', { class: 'section-title' }, '箱ごとの件数'),
      h('p', { class: 'muted small' }, '正解すると次の箱へ進み、間違えると箱 1 に戻ります。箱が進むほど、次に復習するまでの日数が長くなります。'),
      h(
        'ul',
        { class: 'bars' },
        boxRow('未学習', s.unlearned, '確認済みで記録なし'),
        [1, 2, 3, 4, 5].map((b) => boxRow(`箱 ${b}`, s.boxes[b], `正解すると${intervals[Math.min(5, b + 1)]}`)),
      ),
      h('h2', { class: 'section-title' }, 'カテゴリ別の正答率'),
      h(
        'ul',
        { class: 'bars' },
        s.byCategory.map(({ cat, correct, wrong }) => {
          const n = correct + wrong;
          const rate = n ? Math.round((correct / n) * 100) : null;
          return h(
            'li',
            { class: 'bar-row' },
            h('span', { class: 'bar-label' }, cat.label, h('span', { class: 'bar-note' }, n ? `${correct} / ${n} 回` : 'まだ回答なし')),
            h('span', { class: 'bar-track', 'aria-hidden': 'true' }, h('span', { class: `bar-fill cat-${cat.id} cat-fill`, style: `width: ${rate ?? 0}%` })),
            h('span', { class: 'bar-value' }, rate == null ? '—' : `${rate}%`),
          );
        }),
      ),
      h('p', { class: 'muted small' }, '学習記録は、クイズとフラッシュカードの両方で同じものを使います。「覚えた」は正解、「まだ」は不正解として数えます。'),
    ),
  });
}
