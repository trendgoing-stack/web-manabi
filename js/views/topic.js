// 技術項目の詳細（#/topic/<id>）

import { h, extLink } from '../ui/dom.js';
import { renderSnippet } from '../ui/snippet.js';
import { toast } from '../ui/toast.js';
import { show } from '../ui/shell.js';
import { appIcon, categoryBadge, levelBadge, stateBadge, topicRow } from '../ui/badges.js';
import { inline, paragraphs } from '../ui/rich.js';
import { getStore } from '../data.js';
import { isVisible, topicState } from '../status.js';
import { LINK_KIND_LABELS } from '../config.js';
import { addHistory, getNote, isFavorite, notesSize, NOTES_SOFT_LIMIT, NOTE_MAX_LENGTH, setNote, toggleFavorite } from '../storage.js';
import { renderNotFound } from './not-found.js';

/** @param {string} id */
export function renderTopic(id) {
  const store = getStore();
  const t = store.topicById.get(id);
  if (!t) return renderNotFound('この項目は見つかりませんでした。');

  const state = topicState(t);
  const cat = store.categoryById.get(t.category);
  const related = t.related.map((r) => store.topicById.get(r)).filter((r) => r && isVisible(r));
  addHistory(t.id);

  const node = h(
    'article',
    { class: 'page topic' },
    !isVisible(t) ? h('p', { class: 'notice' }, 'この項目は未確認のため、一覧や検索には表示していません。') : null,
    // 1. タイトルとバッジ
    h(
      'header',
      { class: 'topic-head' },
      h('div', { class: 'title-row' }, h('h1', { class: 'page-title' }, t.title), favoriteButton(t.id)),
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
                use.snippet ? renderSnippet(app, use.snippet) : null,
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
    // 12. 自分用メモ
    section('自分用メモ', memoEditor(t.id)),
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

/** @param {string} id */
function favoriteButton(id) {
  const btn = h('button', { type: 'button', class: 'fav-btn' });
  const paint = () => {
    const on = isFavorite(id);
    btn.textContent = on ? '★' : '☆';
    btn.setAttribute('aria-pressed', String(on));
    btn.setAttribute('aria-label', on ? 'お気に入りから外す' : 'お気に入りに追加');
    btn.classList.toggle('on', on);
  };
  btn.addEventListener('click', () => {
    const on = toggleFavorite(id);
    paint();
    toast(on ? 'お気に入りに追加しました' : 'お気に入りから外しました');
  });
  paint();
  return btn;
}

/** @param {string} id */
function memoEditor(id) {
  const counter = h('span', { class: 'memo-count' });
  const status = h('span', { class: 'memo-status', role: 'status', 'aria-live': 'polite' });
  const ta = /** @type {HTMLTextAreaElement} */ (
    h('textarea', {
      class: 'memo',
      rows: '4',
      maxlength: String(NOTE_MAX_LENGTH),
      placeholder: '気づいたことや、自分のアプリでの工夫などを書いておけます（この端末にだけ保存されます）',
      'aria-label': '自分用メモ',
    })
  );
  ta.value = getNote(id);
  /** @type {number | undefined} */
  let timer;
  let dirty = false;
  const paintCount = () => (counter.textContent = `${ta.value.length} / ${NOTE_MAX_LENGTH}`);
  const save = () => {
    if (!dirty) return;
    dirty = false;
    clearTimeout(timer);
    if (setNote(id, ta.value)) {
      status.textContent = ta.value.trim() ? '保存しました' : 'メモを削除しました';
      if (notesSize() > NOTES_SOFT_LIMIT) toast('メモの合計が大きくなっています。不要なメモを消すか、エクスポートで控えを取ってください', 6000);
    } else {
      status.textContent = '保存できませんでした';
    }
  };
  ta.addEventListener('input', () => {
    dirty = true;
    status.textContent = '';
    paintCount();
    clearTimeout(timer);
    timer = setTimeout(save, 800);
  });
  ta.addEventListener('blur', save);
  // 画面を離れるときにも保存する
  window.addEventListener('hashchange', save, { once: true });
  window.addEventListener('pagehide', save, { once: true });
  paintCount();
  return h('div', { class: 'memo-box' }, ta, h('div', { class: 'memo-foot' }, status, counter));
}
