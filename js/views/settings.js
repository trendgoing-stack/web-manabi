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
      h('h2', { class: 'section-title' }, 'アクセス解析'),
      h(
        'label',
        { class: 'check' },
        h('input', {
          type: 'checkbox',
          checked: s.analyticsOff,
          onchange: (/** @type {Event} */ e) => {
            const off = /** @type {HTMLInputElement} */ (e.target).checked;
            setSetting('analyticsOff', off);
            toast(off ? '次に起動したときから送信しません' : '次に起動したときから送信します');
          },
        }),
        h('span', {}, 'アクセス解析を送信しない'),
      ),
      h('p', { class: 'muted small' }, 'アプリを開いた回数を数えるため、起動したときに 1 回だけ GoatCounter に送信しています。送るのは決まったページ名と画面の幅などで、見た項目・検索した言葉・メモの内容は送りません。'),
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
  const sec = (/** @type {string} */ title, /** @type {any[]} */ ...children) => [h('h2', { class: 'section-title' }, title), ...children];
  const ul = (/** @type {any[]} */ ...items) => h('ul', { class: 'bullets' }, items.map((i) => h('li', {}, i)));
  show({
    title: 'ヘルプ',
    tab: 'settings',
    back: '#/settings',
    node: h(
      'div',
      { class: 'page prose' },
      sec(
        'このアプリについて',
        h('p', {}, 'これまでに作った自作アプリ（筋トレ記録カレンダー、画像かんたん編集、抽選ツール、リバーシ、Gitまなび帳）で使った Web 技術やサービスを、解説と「自分のアプリでの使われ方」から学ぶためのアプリです。'),
      ),
      sec(
        '使い方',
        ul(
          '「探す」で技術名やカタカナ・ひらがなで検索できます。「アプリ」からは、アプリごとに使った技術を見られます。',
          '説明文の中の下線の付いた言葉をタップすると、用語の意味が表示されます。',
          '「学ぶ」のクイズとフラッシュカードで回答すると、次に復習する日が決まり、「今日の復習」に出てきます。',
          '詳細画面の ☆ でお気に入りに追加でき、いちばん下に自分用のメモを書けます。',
        ),
      ),
      sec(
        'ご利用にあたって',
        ul(
          '説明文はすべてオリジナルの要約です。正確な仕様は、各項目の参考リンク（公式ドキュメントや MDN）で確認してください。',
          'ブラウザの対応状況やサービスの仕様は変わることがあります。作者が確認してから一定の日数（Claude Code の項目は 90 日、ほかは 180 日）がたった項目には「要再確認」のバッジが付きます。',
          'コードの抜粋は、記載したコミット時点のものです。最新版とは異なる場合があります。「最新版を見る」で今のコードを確認できます。',
          '外部サイトへのリンクは、オフラインでは開けません。そのほかの機能は、一度開けば電波がなくても使えます。',
        ),
      ),
      sec(
        'データについて',
        ul(
          'お気に入り・閲覧履歴・メモ・学習記録・設定は、この端末の中だけに保存されます。サーバーには送信しません。',
          'Safari で開いた場合と、ホーム画面から起動した場合では、保存データが別々になります。設定の「エクスポート」で書き出し、もう一方で「インポート」すると移せます。',
          '機種変更やブラウザのデータ削除をすると、データは消えます。ときどきエクスポートで控えを取っておくと安心です。',
          'アクセス解析（GoatCounter）で送るのは、アプリを開いたことを表す決まったページ名と、画面の幅などの情報だけです。見た項目、検索した言葉、メモの内容は送りません。設定で送信を止められます。',
        ),
      ),
      sec(
        'ホーム画面に追加する（iPhone）',
        h('ol', { class: 'bullets' }, h('li', {}, 'Safari でこのアプリを開く'), h('li', {}, '画面下の共有ボタン（□に↑のアイコン）をタップ'), h('li', {}, '「ホーム画面に追加」をタップ')),
        h('p', { class: 'muted small' }, '新しいバージョンがあると、画面の上に「更新があります（タップで再読み込み）」と表示されます。'),
      ),
      sec('関連アプリ', h('p', {}, 'Git や GitHub の操作は、', extLink('Gitまなび帳', 'https://trendgoing-stack.github.io/git-manabi/'), 'で調べられます。')),
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
