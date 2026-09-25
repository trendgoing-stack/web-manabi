// 設定（#/settings）とヘルプ（#/help）

import { h, extLink } from '../ui/dom.js';
import { show } from '../ui/shell.js';
import { getStore } from '../data.js';
import { getSettings, setSetting } from '../storage.js';
import { APP_VERSION } from '../config.js';
import { applyFontSize } from '../ui/appearance.js';
import { navRow } from './search.js';

export function renderSettings() {
  const s = getSettings();
  const store = getStore();

  show({
    title: '設定',
    tab: 'settings',
    node: h(
      'div',
      { class: 'page' },
      h('h2', { class: 'section-title' }, '表示'),
      radioGroup('文字サイズ', 'fontSize', s.fontSize, [
        ['normal', '標準'],
        ['large', '大'],
      ], (v) => {
        setSetting('fontSize', v);
        applyFontSize();
      }),
      radioGroup('未確認項目の表示', 'showUnverified', s.showUnverified ? 'show' : 'hide', [
        ['show', '表示する（未確認バッジ付き）'],
        ['hide', '表示しない'],
      ], (v) => setSetting('showUnverified', v === 'show')),
      h('p', { class: 'muted small' }, '「未確認」は、作者が内容を確かめる前の下書きです。'),
      h('h2', { class: 'section-title' }, 'このアプリについて'),
      h('ul', { class: 'list' }, navRow('#/help', 'ヘルプ', '使い方と注意事項')),
      h(
        'dl',
        { class: 'kv' },
        h('dt', {}, 'アプリのバージョン'),
        h('dd', {}, APP_VERSION),
        h('dt', {}, 'データのバージョン'),
        h('dd', {}, store.meta.dataVersion),
        h('dt', {}, '収録数'),
        h('dd', {}, `技術 ${store.topics.length} 件・用語 ${store.glossary.length} 語`),
      ),
    ),
  });
}

/**
 * @param {string} legend
 * @param {string} name
 * @param {string} current
 * @param {string[][]} options
 * @param {(value: any) => void} onChange
 */
function radioGroup(legend, name, current, options, onChange) {
  return h(
    'fieldset',
    { class: 'radio-group' },
    h('legend', {}, legend),
    options.map(([value, label]) =>
      h(
        'label',
        { class: 'radio' },
        h('input', { type: 'radio', name, value, checked: value === current, onchange: () => onChange(value) }),
        h('span', {}, label),
      ),
    ),
  );
}

export function renderHelp() {
  show({
    title: 'ヘルプ',
    tab: 'settings',
    back: '#/settings',
    node: h(
      'div',
      { class: 'page prose' },
      h('h2', { class: 'section-title' }, 'このアプリについて'),
      h('p', {}, 'これまでに作った自作アプリで使った Web 技術やサービスを、解説と「自分のアプリでの使われ方」から学ぶためのアプリです。'),
      h('h2', { class: 'section-title' }, 'ご利用にあたって'),
      h(
        'ul',
        { class: 'bullets' },
        h('li', {}, '説明文はすべてオリジナルの要約です。正確な仕様は、各項目の参考リンク（公式ドキュメントや MDN）で確認してください。'),
        h('li', {}, 'ブラウザの対応状況やサービスの仕様は変わることがあります。最終確認から一定の日数がたった項目には「要再確認」のバッジが付きます。'),
        h('li', {}, '「未確認」のバッジが付いた項目は、作者が内容を確かめる前の下書きです。'),
        h('li', {}, '外部サイトへのリンクは、オフラインでは開けません。'),
      ),
      h('h2', { class: 'section-title' }, '関連アプリ'),
      h('p', {}, 'Git や GitHub の操作は、', extLink('Gitまなび帳', 'https://trendgoing-stack.github.io/git-manabi/'), 'で調べられます。'),
    ),
  });
}
