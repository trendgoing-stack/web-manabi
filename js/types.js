// 型定義（JSDoc）。実行時には何もしない。
// エディタの補完とチェックのために、各モジュールから import('./types.js').Topic のように参照する。

/**
 * @typedef {'web-api'|'pwa'|'frontend'|'hosting'|'service'|'claude-code'|'security'} CategoryId
 */

/**
 * カテゴリ定義（data/meta.json）
 * @typedef {Object} Category
 * @property {CategoryId} id
 * @property {string} label 表示名
 * @property {number} order 並び順（小さいほど先）
 * @property {number} reviewDays 最終確認日からこの日数を超えると「要再確認」
 */

/**
 * @typedef {Object} Meta
 * @property {number} schemaVersion
 * @property {string} dataVersion
 * @property {{topics: number, glossary: number, quiz: number}} counts
 * @property {Category[]} categories
 */

/**
 * コード抜粋。固定リンクは repo・commitSha・file・行番号から組み立てる。
 * @typedef {Object} Snippet
 * @property {string} file リポジトリ内のパス
 * @property {number} startLine
 * @property {number} endLine
 * @property {string} commitSha 抜粋を取ったコミット（git rev-parse HEAD の値）
 * @property {string} lang 表示用の言語名（js、ts、html など）
 * @property {string} code 15 行以内
 */

/**
 * @typedef {Object} TopicApp
 * @property {string} appId
 * @property {string} usage 使われ方の説明（1〜3文。インライン記法可）
 * @property {Snippet} [snippet]
 */

/**
 * @typedef {'official'|'mdn'|'caniuse'|'other'} LinkKind
 */

/**
 * @typedef {Object} Link
 * @property {string} label
 * @property {string} url
 * @property {LinkKind} kind
 */

/**
 * 技術項目（data/topics/<category>.json の topics[]）
 * @typedef {Object} Topic
 * @property {string} id 英小文字とハイフン。全ファイルで一意
 * @property {CategoryId} category
 * @property {'basic'|'intermediate'} level
 * @property {string} title
 * @property {string[]} aka 別名・日本語名・読み
 * @property {string[]} keywords 検索補助語
 * @property {string} summary 1〜2文
 * @property {string} what
 * @property {string} why
 * @property {string} how
 * @property {string[]} pitfalls
 * @property {string} [iosNote]
 * @property {TopicApp[]} apps
 * @property {string[]} related
 * @property {Link[]} links
 * @property {string[]} tags
 * @property {string} [demo]
 * @property {string} verifiedNote 確認した内容（例：iOS 18.1 実機で確認）。なければ空文字
 * @property {string} lastReviewed 最終確認日 YYYY-MM-DD。なければ空文字（「要再確認」の判定に使う）
 */

/**
 * @typedef {Object} TopicFile
 * @property {CategoryId} category
 * @property {Topic[]} topics
 */

/**
 * 自作アプリ（data/apps.json）
 * @typedef {Object} App
 * @property {string} id
 * @property {string} name
 * @property {string} summary
 * @property {string} repo リポジトリ名
 * @property {string} pagesUrl
 * @property {string} techStack 表示用の短い文字列
 */

/**
 * @typedef {Object} GlossaryEntry
 * @property {string} term
 * @property {string} reading ひらがな。五十音順の並べ替えに使う
 * @property {string} desc
 * @property {string} [topicId]
 */

/**
 * 手書きクイズ（data/quiz.json）
 * @typedef {Object} QuizItem
 * @property {string} id
 * @property {string} question
 * @property {string[]} choices 4つ
 * @property {number} answer 正解の添字（0〜3）
 * @property {string} explanation
 * @property {string[]} topicIds
 */

/**
 * 読み込み済みのデータ一式（data.js が作る）
 * @typedef {Object} Store
 * @property {Meta} meta
 * @property {Category[]} categories 並び順どおり
 * @property {Map<string, Category>} categoryById
 * @property {Topic[]} topics
 * @property {Map<string, Topic>} topicById
 * @property {App[]} apps
 * @property {Map<string, App>} appById
 * @property {Map<string, Topic[]>} topicsByApp アプリ id → そのアプリで使った技術（topics[].apps からの逆引き）
 * @property {GlossaryEntry[]} glossary reading 順
 * @property {Map<string, GlossaryEntry>} glossaryByTerm
 * @property {QuizItem[]} quiz
 * @property {string[]} failed 読み込みに失敗したファイル名
 */

/**
 * ユーザー設定（localStorage）
 * @typedef {Object} Settings
 * @property {'normal'|'large'} fontSize
 * @property {boolean} analyticsOff アクセス解析を送信しない
 */

export {};
