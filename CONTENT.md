# 学習データの書き方（CONTENT.md）

Webまなび帳の技術項目・アプリ情報・用語集・クイズの書き方と、確認のルールをまとめます。
データを変えたら、`tools/validate.html`（または `node tools/validate-cli.mjs`）でエラーが 0 件であることを確認してください。

## 基本ルール

- **説明文はすべてオリジナルで書く**。MDN、web.dev、各サービスの公式ドキュメントの文章は転載しない（リンクは可）
- **初心者が読んで分かる平易な日本語**で書く。専門用語は `[[用語]]` で用語集にリンクする
- **確かでない数値は書かない**。iOS の対応バージョンなど、確かめていない値は「要確認」と書く。対応表は転載せず、MDN／Can I use にリンクする
- Git／GitHub の操作は扱わない。関連する箇所では「Gitまなび帳」（https://trendgoing-stack.github.io/git-manabi/）にリンクする
- **Claude Code が作った下書きは、すべて `verified: false`、`lastReviewed: ""` で登録する**。作者が内容を確認した項目だけを `verified: true` にする（「確認のルール」を参照）

## ファイル構成

| ファイル | 内容 |
|---|---|
| `data/meta.json` | スキーマの版、データの版（`dataVersion`）、収録件数（`counts`）、カテゴリ定義 |
| `data/topics/<カテゴリid>.json` | カテゴリ別の技術項目。`{ "category": "<id>", "topics": [...] }` の形 |
| `data/apps.json` | 自作アプリの情報 |
| `data/glossary.json` | 用語集 |
| `data/quiz.json` | 手書きのクイズ問題（任意） |

カテゴリを追加するときは、`data/topics/<id>.json` を足し、`meta.json` の `categories` に定義を 1 行足します（アプリはこの定義を見て読み込むファイルを決めます）。カテゴリ id は下の固定リストから選びます。

### カテゴリ

| id | 表示名 | 要再確認までの日数 |
|---|---|---|
| `web-api` | Web API | 180 |
| `pwa` | PWA・オフライン | 180 |
| `frontend` | フロントエンド構成 | 180 |
| `hosting` | 公開・ホスティング | 180 |
| `service` | 外部サービス | 180 |
| `claude-code` | Claude Code・AI開発 | 90 |
| `security` | セキュリティ・プライバシー | 180 |

## 技術項目

型は `js/types.js` の `Topic` に JSDoc で定義しています。

| フィールド | 内容 |
|---|---|
| `id` | 英小文字・数字・ハイフン。全ファイルで一意（例：`service-worker`） |
| `category` | カテゴリ id。ファイル名と同じにする |
| `level` | `basic`（入門）／`intermediate`（中級） |
| `title` | 技術名（例：`Service Worker`） |
| `aka` | 別名・日本語名・読み（例：`サービスワーカー`）。検索で前方一致の対象になる |
| `keywords` | 検索補助語（例：`オフライン`、`fetch`） |
| `summary` | 1〜2文の要約。一覧やクイズにも使う |
| `what`／`why`／`how` | 何か／なぜ必要か／仕組み。**それぞれ 400 文字以内が目安** |
| `pitfalls` | 落とし穴。1項目 1〜2文 |
| `iosNote` | iOS Safari での注意（該当するときだけ） |
| `apps` | `{ appId, usage, snippet? }` の配列（「自分のアプリでの使われ方」を参照） |
| `related` | 関連項目の id |
| `links` | `{ label, url, kind }`。`kind` は `official`／`mdn`／`caniuse`／`other` |
| `tags` | 絞り込み用のタグ |
| `demo` | ミニデモの id（任意。フェーズ4） |
| `verified` | 確認済みなら `true` |
| `verifiedNote` | 確認した内容（例：`iOS 18.1 実機で確認`）。未確認なら空 |
| `lastReviewed` | 最終確認日（`YYYY-MM-DD`）。未確認なら空 |

### 本文のインライン記法

使える記法は次の 3 種類だけです。Markdown の見出しやリストは使えません（リストが必要なものは `pitfalls` のように配列のフィールドにします）。

| 記法 | 表示 |
|---|---|
| `[[用語]]` | 用語集へのリンク（タップで意味をポップアップ）。用語集にない語はエラーになる |
| `` `コード` `` | 等幅の文字 |
| `**太字**` | 太字 |

- 段落の区切りは空行（JSON の中では `\n\n`）
- 記法の入れ子（`**[[用語]]**` など）はできない
- `[[用語]]` はその項目で最初に出てくる 1 回だけにする（何度もリンクすると読みにくい）

### 検索の優先順位（参考）

`title`／`aka` の前方一致 ＞ `title` ＞ `aka` ＞ `keywords` ＞ `tags` ＞ `summary`。
カタカナ・ひらがな、全角・半角、大文字・小文字の違いは区別しません。

### 記述例

```json
{
  "id": "screen-wake-lock",
  "category": "web-api",
  "level": "basic",
  "title": "Screen Wake Lock API",
  "aka": ["スクリーンウェイクロック", "画面のスリープ防止"],
  "keywords": ["スリープ", "画面が暗くなる"],
  "summary": "画面が自動で暗くなったりロックされたりするのを、一時的に止める仕組み。",
  "what": "`navigator.wakeLock.request('screen')` を呼ぶと、…",
  "why": "演出を見せている途中で画面が暗くなると困ります。…",
  "how": "`request('screen')` は[[非同期処理]]で、…\n\nそのため、`visibilitychange` イベントで…",
  "pitfalls": ["使えない環境があるため、`'wakeLock' in navigator` で確かめてから使う。"],
  "iosNote": "対応したバージョンは要確認です。",
  "apps": [
    { "appId": "lottery-tools", "usage": "`js/core/wakelock.js` で、演出中だけ画面のスリープを止めています。" }
  ],
  "related": ["web-audio-api"],
  "links": [
    { "label": "Screen Wake Lock API（MDN）", "url": "https://developer.mozilla.org/ja/docs/Web/API/Screen_Wake_Lock_API", "kind": "mdn" }
  ],
  "tags": ["画面"],
  "verified": false,
  "verifiedNote": "",
  "lastReviewed": ""
}
```

### `claude-code` カテゴリ

- このプロジェクトで実践している進め方（指示書の構成、実装計画の承認、フェーズ分割、実機確認、CLAUDE.md、スラッシュコマンドなど）を中心にする
- **公式ドキュメントへのリンク（`kind: official`）を必ず 1 つ以上付ける**（ないとエラー）

## 自分のアプリでの使われ方（apps と snippet）

`apps[]` の各要素は `{ appId, usage, snippet? }` です。

- `appId` … `data/apps.json` の `id`
- `usage` … そのアプリでの使われ方を 1〜3 文で。ファイル名は `` `js/core/random.js` `` のように書く
- `snippet` … コード抜粋（任意）。`{ file, startLine, endLine, commitSha, lang, code }`

### コード抜粋のルール

- **15 行以内**。行番号（`startLine`〜`endLine`）と `code` の行数を一致させる
- 固定リンクはアプリが `https://github.com/trendgoing-stack/<repo>/blob/<commitSha>/<file>#L<start>-L<end>` の形で組み立てる。最新版リンクは `https://github.com/trendgoing-stack/<repo>/blob/main/<file>`
- `commitSha` は 40 桁の値をそのまま書く
- **秘密情報（API キー、トークン、パスワード、個人情報など）が含まれていないか、書き込む前に必ず確認する**。疑わしいものは抜粋しない。検証ページも `sk-`、`ghp_`、`AKIA`、`-----BEGIN`、`api_key` などを検出する

### 参照用フォルダでの作業

コード抜粋は、対象アプリのリポジトリを**参照専用のフォルダ**（`C:\Users\KATSUYA\manabi-sources\`）にクローンしたものから作ります。普段の作業用フォルダは使いません。参照用フォルダは web-manabi のリポジトリの外に置き、web-manabi の中に対象リポジトリのファイルをコピーしたりクローンしたりしません。

参照用フォルダで**実行してよいコマンド**（読み取り専用）：

- ファイルの閲覧・検索（`cat`、`grep`、`ls` など）
- `git rev-parse HEAD`、`git log`、`git show HEAD:<file>`、`git status --porcelain`、`git remote get-url origin`

**禁止する操作**：

- ファイルの作成・編集・削除
- `git checkout`／`switch`／`restore`／`reset`／`pull`／`fetch`／`commit`／`push`／`stash`
- 依存パッケージのインストール（`npm install` など）、ビルドやスクリプトの実行

手順：

1. `git status --porcelain` で未コミットの変更がないことを確かめる。**変更があれば作業を止めて作者に報告する**
2. リポジトリ名を `git remote get-url origin` で、コミットを `git rev-parse HEAD` で確認する
3. 抜粋は、コミット済みの内容（`git show HEAD:<file>`）から取る。行番号もこの内容で数える
4. 秘密情報がないことを確認してから `snippet` に書き込む

1〜3 は `tools/snippets.mjs` でまとめて行えます（使う git コマンドは上の許可リストの読み取り専用のものだけです）。

```bash
node tools/snippets.mjs extract C:/Users/KATSUYA/manabi-sources/lottery-tools js/core/random.js 17 28
```

`snippet` の JSON（`commitSha` は HEAD の値）が表示されるので、中身を確かめてから技術項目の `apps[]` に貼り付けます。未コミットの変更があるときは、何も出力せずに止まります。

### コード抜粋の `commitSha` を更新する

対象アプリを更新したら、作者が参照用フォルダを最新にしてから（参照用フォルダでの `git pull` は作者が行う）、次のコマンドで点検します。

```bash
node tools/snippets.mjs check C:/Users/KATSUYA/manabi-sources
```

- `✓` … `commitSha` が HEAD と同じで、内容も一致
- `△` … HEAD でも同じ行が同じ内容。`update` で `commitSha` を HEAD に書き換えてよい
- `▲` … HEAD では内容が変わっている。行番号と `code` を `extract` で取り直し、`usage` も見直す

`△` だけのときは `node tools/snippets.mjs update C:/Users/KATSUYA/manabi-sources` で `commitSha` をまとめて更新できます。更新したら検証を通し、データの版（`dataVersion`）を上げます。

## アプリ情報（apps.json）

`{ id, name, summary, repo, pagesUrl, techStack }` の配列です。

- `repo` はリポジトリ名（`git remote get-url origin` で確認）
- `techStack` は「バニラJS（ES Modules）」「React + Vite + TypeScript」など、表示用の短い文字列
- **アプリで使った技術の一覧は持たせない**。技術項目の `apps[]` から逆引きして表示する（二重管理を避けるため）

## 用語集（glossary.json）

`{ term, reading, desc, topicId? }` の配列です。

- `reading` はひらがなで書く（五十音順の並べ替えに使う。英語の用語も読みをひらがなで）
- `desc` は 1〜2 文。インライン記法は使わない
- `topicId` を書くと、ポップアップから技術項目の詳細へ移動できる

## クイズ（quiz.json）

`{ id, question, choices, answer, explanation, topicIds }` の配列です。

- `choices` は 4 つ。`answer` は正解の位置（0〜3）
- `topicIds` に関係する技術項目の id を書く。**すべて確認済み（`verified: true`）の項目のときだけ出題される**

## 確認のルール

1. 作者が項目の内容（説明、使われ方、コード抜粋、リンク）を確かめる
2. 確かめた項目を `verified: true` にし、`verifiedNote` に確認した内容（例：`iOS 18.1 実機で確認`、`MDN と照合`）、`lastReviewed` に確認した日（`YYYY-MM-DD`）を書く
3. 確認済みの項目でも、最終確認からカテゴリの日数（`claude-code` は 90 日、ほかは 180 日）を超えると「要再確認」のバッジが付く。もう一度確かめたら `lastReviewed` を更新する
4. クイズとフラッシュカードには、確認済みの項目だけが出題される

## 検証

`tools/validate.html` をブラウザで開く（手元でサーバーを動かして `http://localhost:8766/tools/validate.html`）か、`node tools/validate-cli.mjs` を実行します。チェックする内容：

- スキーマ違反、id の重複
- `related`／`apps[].appId`／`quiz.topicIds`／用語集の `topicId` のリンク切れ
- 用語集にない `[[用語]]`、閉じていない記法
- 15 行を超える、または `commitSha` がない `snippet`
- 秘密情報らしき文字列を含む `snippet`
- 公式リンクがない `claude-code` 項目
- `meta.json` の `counts` と実際の件数の食い違い
- `sw.js` の `VERSION` と `js/config.js` の `APP_VERSION` の食い違い
- 未確認の件数、要再確認の件数
