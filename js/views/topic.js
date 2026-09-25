// 技術項目の詳細（#/topic/<id>）

import { h, extLink } from '../ui/dom.js';
import { show } from '../ui/shell.js';
import { appIcon, categoryBadge, levelBadge, stateBadge, topicRow } from '../ui/badges.js';
import { inline, paragraphs } from '../ui/rich.js';
import { getStore } from '../data.js';
import { isVisible, topicState } from '../status.js';
import { LINK_KIND_LABELS } from '../config.js';
import { renderNotFound } from './not-found.js';

/** @param {string} id */
export function renderTopic(id) {
  const store = getStore();
  const t = store.topicById.get(id);
  if (!t) return renderNotFound('この項目は見つかりませんでした。');

  const state = topicState(t);
  const cat = store.categoryById.get(t.category);
  const related = t.related.map((r) => store.topicById.get(r)).filter((r) => r && isVisible(r));

  const node = h(
    'article',
    { class: 'page topic' },
    !isVisible(t) ? h('p', { class: 'notice' }, 'この項目は未確認のため、一覧や検索には表示していません。') : null,
    // 1. タイトルとバッジ
    h(
      'header',
      { class: 'topic-head' },
      h('h1', { class: 'page-title' }, t.title),
      t.aka.length ? h('p', { class: 'aka' }, t.aka.join('・')) : null,
      h('div', { class: 'badges' }, categoryBadge(t.category), levelBadge(t.level), stateBadge(t)),
    ),
    // 2. 要約
    h('p', { class: 'summary' }, inline(t.summary)),
    // 3〜5. 何か／なぜ必要か／仕組み
    section('何か', paragraphs(t.what)),
    section('なぜ必要か', paragraphs(t.why)),
    section('仕組み', paragraphs(t.how)),
    // 6. 落とし穴・iOS Safari での注意
    t.pitfalls.length || t.iosNote
      ? section(
          '落とし穴・注意点',
          t.pitfalls.length ? h('ul', { class: 'bullets' }, t.pitfalls.map((p) => h('li', {}, inline(p)))) : null,
          t.iosNote ? h('div', { class: 'callout' }, h('p', { class: 'callout-title' }, 'iOS Safari での注意'), paragraphs(t.iosNote)) : null,
        )
      : null,
    // 7. 自分のアプリでの使われ方
    section(
      '自分のアプリでの使われ方',
      t.apps.length
        ? h(
            'div',
            { class: 'app-uses' },
            t.apps.map((use) => {
              const app = store.appById.get(use.appId);
              if (!app) return null;
              return h(
                'div',
                { class: 'card app-use' },
                h('a', { href: `#/app/${encodeURIComponent(app.id)}`, class: 'app-use-head' }, appIcon(app), h('span', {}, app.name)),
                paragraphs(use.usage),
              );
            }),
          )
        : h('p', { class: 'muted' }, 'コードから読み取れる使用例はまだ登録していません。'),
    ),
    // 9. 関連項目
    related.length ? section('関連項目', h('ul', { class: 'list' }, related.map((r) => topicRow(/** @type {any} */ (r))))) : null,
    // 10. 参考リンク
    t.links.length
      ? section(
          '参考リンク',
          h(
            'ul',
            { class: 'links' },
            t.links.map((l) => h('li', {}, h('span', { class: `link-kind kind-${l.kind}` }, LINK_KIND_LABELS[l.kind] ?? '参考'), extLink(l.label, l.url))),
          ),
          h('p', { class: 'muted small' }, '外部サイトはオフラインでは開けません。'),
        )
      : null,
    // 11. 最終確認日
    section(
      '最終確認日',
      state === 'unverified'
        ? h('p', {}, '未確認（作者が内容を確かめる前の下書きです）')
        : [
            h('p', {}, t.lastReviewed || '—', t.verifiedNote ? `（${t.verifiedNote}）` : ''),
            state === 'stale'
              ? h('p', { class: 'muted small' }, `最終確認から ${cat?.reviewDays ?? 180} 日以上たっています。ブラウザの対応状況やサービスの仕様が変わっている可能性があります。`)
              : null,
          ],
    ),
  );

  show({ title: t.title, tab: 'search', back: '#/search', node });
}

/**
 * @param {string} title
 * @param {...any} children
 */
function section(title, ...children) {
  return h('section', { class: 'topic-section' }, h('h2', { class: 'section-title' }, title), ...children);
}
