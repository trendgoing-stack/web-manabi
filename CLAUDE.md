# Webまなび帳 — Claude Code 向けメモ

自作アプリ 5 本で使った Web 技術を学ぶ学習用 PWA。公開先は GitHub Pages（https://trendgoing-stack.github.io/web-manabi/）。

## 守ること

- ビルド不要のバニラ JS（ES Modules）＋ HTML ＋ CSS。**外部ライブラリ・外部 CDN・Web フォントは使わない**
- データ由来の文字列を `innerHTML` で入れない。`js/ui/dom.js` の `h()` と `textContent` で組み立てる
- localStorage は `js/storage.js` だけがさわる。キーは `webmanabi:` で始める
- パスはすべて `./` から始まる相対パス（サブパス配信のため）
- 日付は端末のローカル日付（`js/date.js`）。UTC に変換しない
- 入力欄の文字は 16px 以上、タップできる要素は 44px 以上
- 説明文はオリジナルで書く（MDN・公式ドキュメントの転載禁止）。Markdown パーサーは使わない
- Git／GitHub の操作はアプリの内容として扱わない（Gitまなび帳へリンク）

## 学習データ

書き方と確認のルールは [CONTENT.md](CONTENT.md)。要点：

- 下書きは必ず `verified: false`、`lastReviewed: ""`。`verified: true` にするのは作者だけ
- データを変えたら `node tools/validate-cli.mjs` でエラー 0 件を確認し（出題ロジックを変えたら `node tools/test-logic.mjs` も）、`data/meta.json` の `dataVersion` と `counts` を更新する
- コード抜粋は参照用フォルダ `C:\Users\KATSUYA\manabi-sources\` から、読み取り専用のコマンドだけで作る（許可・禁止の一覧は CONTENT.md）。`node tools/snippets.mjs extract|check` を使う
- `trendgoing-stack.github.io` の下のアプリは localStorage を共有する。全削除は `webmanabi:` で始まるキーだけを消す

## 手元で動かす

```bash
python -m http.server 8766
```

http://localhost:8766/ を開く。検証ページは http://localhost:8766/tools/validate.html
