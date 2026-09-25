// アプリ一覧（#/apps）とアプリ詳細（#/app/<id>）

import { h, extLink, icon, ICONS } from '../ui/dom.js';
import { show } from '../ui/shell.js';
import { appIcon, hiddenNotice, topicRow } from '../ui/badges.js';
import { getStore } from '../data.js';
import { isVisible } from '../status.js';
import { GITHUB_OWNER } from '../config.js';
import { renderNotFound } from './not-found.js';

export function renderApps() {
  const store = getStore();
  show({
    title: 'アプリ',
    tab: 'apps',
    node: h(
      'div',
      { class: 'page' },
      h('p', { class: 'lead' }, 'これまでに作ったアプリです。アプリを選ぶと、そのアプリで使った技術の一覧を見られます。'),
      h(
        'ul',
        { class: 'list' },
        store.apps.map((app) => {
          const n = (store.topicsByApp.get(app.id) ?? []).filter(isVisible).length;
          return h(
            'li',
            {},
            h(
              'a',
              { href: `#/app/${encodeURIComponent(app.id)}`, class: 'row' },
              appIcon(app, 'lg'),
              h(
                'div',
                { class: 'row-main' },
                h('div', { class: 'row-title' }, app.name),
                h('div', { class: 'row-summary' }, app.summary),
                h('div', { class: 'row-meta' }, h('span', { class: 'chip' }, app.techStack), h('span', { class: 'muted small' }, `技術 ${n} 件`)),
              ),
              icon(ICONS.chevron, 'icon icon-chevron'),
            ),
          );
        }),
      ),
    ),
  });
}

/** @param {string} id */
export function renderApp(id) {
  const store = getStore();
  const app = store.appById.get(id);
  if (!app) return renderNotFound('このアプリは見つかりませんでした。');
  const topics = (store.topicsByApp.get(app.id) ?? []).filter(isVisible);

  const groups = store.categories
    .map((c) => ({ cat: c, list: topics.filter((t) => t.category === c.id) }))
    .filter((g) => g.list.length);

  show({
    title: app.name,
    tab: 'apps',
    back: '#/apps',
    node: h(
      'div',
      { class: 'page' },
      h('header', { class: 'app-head' }, appIcon(app, 'lg'), h('div', {}, h('h1', { class: 'page-title' }, app.name), h('span', { class: 'chip' }, app.techStack))),
      h('p', { class: 'summary' }, app.summary),
      h(
        'ul',
        { class: 'links' },
        h('li', {}, h('span', { class: 'link-kind' }, '公開URL'), extLink(app.pagesUrl.replace(/^https:\/\//, ''), app.pagesUrl)),
        h('li', {}, h('span', { class: 'link-kind' }, 'リポジトリ'), extLink(`${GITHUB_OWNER}/${app.repo}`, `https://github.com/${GITHUB_OWNER}/${app.repo}`)),
      ),
      h('a', { href: `#/learn/quiz?scope=${encodeURIComponent(`app:${app.id}`)}&mode=normal`, class: 'btn btn-primary btn-block' }, 'このアプリの技術でクイズ'),
      h('h2', { class: 'section-title' }, `使った技術（${topics.length} 件）`),
      hiddenNotice(store.topicsByApp.get(app.id) ?? []),
      topics.length === 0 ? h('p', { class: 'empty' }, '表示できる項目はまだありません。') : null,
      groups.map((g) => [h('h3', { class: 'group-title' }, g.cat.label), h('ul', { class: 'list' }, g.list.map(topicRow))]),
    ),
  });
}
