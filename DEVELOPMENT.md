# 開発メモ（DEVELOPMENT.md）

## 方針

- ビルド不要のバニラ JavaScript（ES Modules）＋ HTML ＋ CSS。外部ライブラリ、外部 CDN、Web フォントは使わない（GoatCounter の `count.js` はリポジトリに同梱）
- データ由来の文字列は `innerHTML` で入れず、`js/ui/dom.js` の `h()` と `textContent` で組み立てる。本文の記法（`[[用語]]`・`` `コード` ``・`**太字**`）は `js/ui/rich.js` が DOM にする
- localStorage は `js/storage.js` だけがさわる。キーは `webmanabi:` で始める（同じ `github.io` のほかのアプリと保存場所を共有しているため）
- パスはすべて `./` から始まる相対パス（サブパス `/web-manabi/` で公開するため）
- 日付は端末のローカル日付（`js/date.js`）で扱い、UTC に変換しない
- 入力欄の文字は 16px 以上、タップできる要素は 44px 以上
- iOS Safari 向けの注意：コピーと共有はタップのハンドラの中で同期的に始める。フラッシュカードは Pointer Events と `touch-action: pan-y`

## ディレクトリ構成

```
index.html              画面の枠（上部バー、本文、下部タブバー）と meta タグ
manifest.json           Web App Manifest
sw.js                   Service Worker（キャッシュファースト。VERSION と SHELL を手で管理）
count.js                GoatCounter の公式スクリプト（同梱）
css/app.css             すべてのスタイル（色は :root の変数、ダークモードで上書き）
icons/                  アイコン（tools/make-icons.mjs で生成）
js/
  main.js               起動：データ読み込み、ルーター、Service Worker、アクセス解析
  config.js             APP_VERSION、設定の初期値などの定数
  types.js              JSDoc の型定義（実行コードなし）
  data.js               data/ の読み込みと索引（アプリ→使った技術の逆引きなど）
  router.js             ハッシュルーティング（#/topic/<id> など）。戻るとスクロール位置も戻る
  storage.js            localStorage（お気に入り・履歴・メモ・学習記録・設定、エクスポート／インポート）
  normalize.js          検索用の正規化（NFKC、小文字化、カタカナ→ひらがな）
  search.js             優先順位つきの AND 検索
  status.js             要再確認の判定（最終確認日から日数がたった項目）
  date.js               ローカル日付の計算
  leitner.js            ライトナー方式（箱 1〜5、間隔 1・2・4・8・16 日）
  quiz-gen.js           クイズとフラッシュカードの出題（DOM を使わない純粋な関数）
  clipboard.js          コピー（writeText → execCommand → 手動コピーの案内）
  pwa.js                Service Worker の登録と更新バナー
  analytics.js          GoatCounter（起動時に 1 回、固定のパスとタイトルだけ）
  ui/                   部品（dom、rich、badges、snippet、popup、dialog、toast、shell、appearance）
  views/                画面（search、category、topic、apps、learn、quiz、cards、study、my、settings、not-found）
  demos/                ミニデモ（詳細画面を開いたときに動的 import）
data/
  meta.json             スキーマ・データの版、件数、カテゴリ定義
  topics/<category>.json 技術項目
  apps.json、glossary.json、quiz.json
tools/                  開発用（Service Worker のキャッシュ対象外。アプリからはリンクしない）
```

## 手元で動かす

```bash
python -m http.server 8766
```

- http://localhost:8766/ … アプリ（Service Worker は登録しない）
- http://localhost:8766/?sw … Service Worker を登録して試す。試し終わったら、ブラウザの開発者ツールで登録を解除し、キャッシュを消す
- http://localhost:8766/tools/validate.html … データの検証

iPhone の実機は、HTTPS でないとクリップボードや Service Worker が動かないため、GitHub Pages に push して確認する。

## 開発用ツール

| コマンド | 内容 |
|---|---|
| `node tools/validate-cli.mjs` | 学習データの検証（`tools/validate.html` と同じチェック）。あわせて、`js/demos/` のファイルの有無、`sw.js` の `SHELL` の漏れ、`VERSION` と `APP_VERSION` の一致を確認する |
| `node tools/test-logic.mjs` | 出題ロジックとライトナー方式のテスト |
| `node tools/snippets.mjs extract <repoDir> <file> <start> <end>` | 参照用フォルダからコード抜粋を作る（HEAD のコミット済みの内容から） |
| `node tools/snippets.mjs check <参照用フォルダ>` | 全抜粋を HEAD と照合し、`commitSha` を更新できるかを表示する（`update` で更新） |
| `node tools/make-icons.mjs` | アイコン（SVG と PNG）を作り直す |

`package.json` は、Node.js でこれらのスクリプトを ES Modules として動かすためだけのもの（依存パッケージはない）。
