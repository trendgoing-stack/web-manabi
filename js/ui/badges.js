// バッジ、アプリのアイコン、技術項目の一覧行など、複数の画面で使う部品。

import { h, icon, ICONS } from './dom.js';
import { getStore } from '../data.js';
import { LEVEL_LABELS } from '../config.js';
import { isVisible, topicState } from '../status.js';
import { plain } from './rich.js';

/** @param {string} categoryId */
export function categoryBadge(categoryId) {
  const c = getStore().categoryById.get(categoryId);
  return h('span', { class: `badge badge-cat cat-${categoryId}` }, c?.label ?? categoryId);
}

/** @param {'basic'|'intermediate'} level */
export function levelBadge(level) {
  return h('span', { class: `badge badge-level level-${level}` }, LEVEL_LABELS[level] ?? level);
}

/**
 * 未確認／要再確認のバッジ（確認済みで期限内なら null）
 * @param {import('../types.js').Topic} topic
 */
export function stateBadge(topic) {
  const s = topicState(topic);
  if (s === 'unverified') return h('span', { class: 'badge badge-unverified' }, '未確認');
  if (s === 'stale') return h('span', { class: 'badge badge-stale' }, '要再確認');
  return null;
}

/**
 * アプリのアイコン（アプリ名の頭文字）
 * @param {import('../types.js').App} app
 * @param {'sm'|'lg'} [size]
 */
export function appIcon(app, size = 'sm') {
  const idx = getStore().apps.indexOf(app);
  return h(
    'span',
    { class: `app-icon app-icon-${size} app-color-${idx >= 0 ? idx % 6 : 0}`, title: app.name, 'aria-hidden': 'true' },
    Array.from(app.name)[0] ?? '?',
  );
}

/**
 * 技術項目の一覧の 1 行
 * @param {import('../types.js').Topic} topic
 */
export function topicRow(topic) {
  const { appById } = getStore();
  const apps = topic.apps.map((a) => appById.get(a.appId)).filter(Boolean);
  return h(
    'li',
    {},
    h(
      'a',
      { href: `#/topic/${encodeURIComponent(topic.id)}`, class: 'row' },
      h(
        'div',
        { class: 'row-main' },
        h('div', { class: 'row-title' }, topic.title, stateBadge(topic)),
        h('div', { class: 'row-summary' }, plain(topic.summary)),
        h(
          'div',
          { class: 'row-meta' },
          categoryBadge(topic.category),
          apps.length
            ? h(
                'span',
                { class: 'row-apps' },
                h('span', { class: 'visually-hidden' }, `使ったアプリ：${apps.map((a) => a.name).join('、')}`),
                apps.map((a) => appIcon(a)),
              )
            : null,
        ),
      ),
      icon(ICONS.chevron, 'icon icon-chevron'),
    ),
  );
}

/**
 * 未確認の項目を隠しているときの案内（隠している項目がなければ null）
 * @param {import('../types.js').Topic[]} topics この画面に出すはずだった項目
 */
export function hiddenNotice(topics) {
  const n = topics.filter((t) => !isVisible(t)).length;
  if (!n) return null;
  return h(
    'p',
    { class: 'notice' },
    `未確認の項目 ${n} 件は表示していません。設定の「未確認項目の表示」で表示できます。`,
    ' ',
    h('a', { href: '#/settings' }, '設定を開く'),
  );
}
