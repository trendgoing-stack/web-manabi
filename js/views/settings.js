// 設定（#/settings）とヘルプ（#/help）

import { h, extLink } from '../ui/dom.js';
import { show } from '../ui/shell.js';
import { getStore } from '../data.js';
import { clearAll, exportData, getSettings, importData, setSetting } from '../storage.js';
import { confirmDialog } from '../ui/dialog.js';
import { toast } from '../ui/toast.js';
import { today } from '../date.js';
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
      dataSection(),
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

/** データ管理：エクスポート／インポート／全削除 */
function dataSection() {
  const error = h('p', { class: 'form-error', role: 'alert' });
  error.hidden = true;
  const showError = (/** @type {string} */ msg) => {
    error.textContent = msg;
    error.hidden = false;
  };
  let mode = /** @type {'merge'|'replace'} */ ('merge');

  const fileInput = /** @type {HTMLInputElement} */ (
    h('input', {
      type: 'file',
      accept: '.json,application/json',
      class: 'visually-hidden',
      tabindex: '-1',
      'aria-hidden': 'true',
      onchange: async () => {
        const f = fileInput.files?.[0];
        fileInput.value = '';
        if (!f) return;
        error.hidden = true;
        let parsed;
        try {
          parsed = JSON.parse(await f.text());
        } catch {
          showError('ファイルを読み込めませんでした（JSON の形式ではありません）。何も変更していません。');
          return;
        }
        const run = () => {
          const res = importData(parsed, mode);
          if (!res.ok) {
            showError(`${res.error}${res.error.includes('何も変更していません') ? '' : '何も変更していません。'}`);
            return;
          }
          applyFontSize();
          toast(mode === 'replace' ? 'データを置き換えました' : 'データを統合しました');
          renderSettings();
        };
        if (mode === 'replace') {
          confirmDialog({
            title: 'データを置き換えますか？',
            body: '今この端末にあるお気に入り・履歴・メモ・学習記録・設定は、ファイルの内容に置き換わります。',
            okLabel: '置き換える',
            danger: true,
            onOk: run,
          });
        } else {
          run();
        }
      },
    })
  );

  return h(
    'div',
    {},
    h('h2', { class: 'section-title' }, 'データ管理'),
    h('p', { class: 'muted small' }, 'お気に入り・閲覧履歴・メモ・学習記録・設定は、この端末の中だけに保存されます。Safari で開いた場合とホーム画面から起動した場合では、保存データが別になります。エクスポートとインポートで移せます。'),
    h(
      'button',
      {
        type: 'button',
        class: 'btn btn-block',
        onclick: () => {
          const json = JSON.stringify(exportData(), null, 2);
          const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
          const a = h('a', { href: url, download: `webmanabi-backup-${today()}.json`, class: 'visually-hidden' });
          document.body.appendChild(a);
          a.click();
          a.remove();
          // すぐに解放するとダウンロードが始まらないブラウザがあるため、少し待つ
          setTimeout(() => URL.revokeObjectURL(url), 10000);
          toast('エクスポートしました');
        },
      },
      'エクスポート（JSON を保存）',
    ),
    radioGroup('インポートのしかた', 'importMode', mode, [
      ['merge', '統合（今のデータに足す）'],
      ['replace', '置き換え（ファイルの内容にする）'],
    ], (v) => {
      mode = v;
    }),
    h('button', { type: 'button', class: 'btn btn-block', onclick: () => fileInput.click() }, 'ファイルを選んでインポート'),
    fileInput,
    error,
    h(
      'button',
      {
        type: 'button',
        class: 'btn btn-block btn-danger-outline',
        onclick: () =>
          confirmDialog({
            title: 'すべてのデータを削除しますか？',
            body: 'お気に入り・閲覧履歴・メモ・学習記録・設定を削除します。元に戻せません。必要なら先にエクスポートしてください。',
            okLabel: '削除する',
            danger: true,
            onOk: () => {
              clearAll();
              applyFontSize();
              toast('すべてのデータを削除しました');
              renderSettings();
            },
          }),
      },
      'すべてのデータを削除',
    ),
  );
}
