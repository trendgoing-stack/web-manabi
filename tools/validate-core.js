// データの検証（tools/validate.html と tools/validate-cli.mjs の共通部分）。
// DOM を使わない純粋な関数だけで書く。

import { reviewState } from '../js/status.js';
import { isYmd } from '../js/date.js';

const CATEGORY_IDS = ['web-api', 'pwa', 'frontend', 'hosting', 'service', 'claude-code', 'security'];
const LEVELS = ['basic', 'intermediate'];
const LINK_KINDS = ['official', 'mdn', 'caniuse', 'other'];
const ID_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const SHA_RE = /^[0-9a-f]{40}$/;
const TEXT_LIMIT = 400;
const SNIPPET_MAX_LINES = 15;
/** 秘密情報らしき文字列 */
const SECRET_PATTERNS = [
  /sk-[A-Za-z0-9_-]{8,}/,
  /ghp_[A-Za-z0-9]{10,}/,
  /github_pat_[A-Za-z0-9_]{10,}/,
  /gho_[A-Za-z0-9]{10,}/,
  /AKIA[0-9A-Z]{12,}/,
  /-----BEGIN [A-Z ]*(PRIVATE KEY|CERTIFICATE)/,
  /api[_-]?key/i,
  /secret/i,
  /password\s*[:=]/i,
  /token\s*[:=]\s*['"][^'"]{8,}/i,
  /xox[abpr]-[A-Za-z0-9-]{10,}/,
];
const TERM_RE = /\[\[([^\]\n]+?)\]\]/g;
const TOKEN_RE = /\[\[([^\]\n]+?)\]\]|`([^`\n]+)`|\*\*([^*\n]+?)\*\*/g;

/**
 * @typedef {Object} Finding
 * @property {'error'|'warn'|'info'} level
 * @property {string} where
 * @property {string} message
 */

/**
 * @param {Object} raw loadRaw() と同じ形 { meta, apps, glossary, quiz, topicFiles: [{path, data}], failed }
 * @param {Object} opt
 * @param {string} opt.today YYYY-MM-DD
 * @param {string} [opt.appVersion] js/config.js の APP_VERSION
 * @param {string | null} [opt.swText] sw.js の中身（まだなければ null）
 * @param {Set<string>} [opt.demoIds] js/demos/ にあるデモの id（分からなければ省略）
 * @param {string[]} [opt.swMissing] sw.js のキャッシュ対象に入っていないファイル（分からなければ省略）
 * @returns {{findings: Finding[], stats: Record<string, number | string>}}
 */
export function validate(raw, opt) {
  /** @type {Finding[]} */
  const out = [];
  const err = (where, message) => out.push({ level: 'error', where, message });
  const warn = (where, message) => out.push({ level: 'warn', where, message });
  const info = (where, message) => out.push({ level: 'info', where, message });

  for (const f of raw.failed ?? []) err(f, '読み込めませんでした（ファイルがない、または JSON の書き方が正しくない）');

  // ---------- meta.json ----------
  const meta = raw.meta;
  /** @type {Map<string, any>} */
  const catById = new Map();
  if (meta) {
    if (typeof meta.schemaVersion !== 'number') err('meta.json', 'schemaVersion が数値ではありません');
    if (typeof meta.dataVersion !== 'string' || !meta.dataVersion) err('meta.json', 'dataVersion がありません');
    if (!Array.isArray(meta.categories)) err('meta.json', 'categories が配列ではありません');
    for (const c of meta.categories ?? []) {
      const w = `meta.json categories[${c?.id}]`;
      if (!CATEGORY_IDS.includes(c?.id)) err(w, `カテゴリ id「${c?.id}」は決められたリストにありません`);
      if (typeof c?.label !== 'string' || !c.label) err(w, 'label がありません');
      if (typeof c?.order !== 'number') err(w, 'order が数値ではありません');
      if (typeof c?.reviewDays !== 'number' || c.reviewDays <= 0) err(w, 'reviewDays が正の数ではありません');
      if (catById.has(c?.id)) err(w, 'カテゴリ id が重複しています');
      catById.set(c?.id, c);
    }
  }

  // ---------- apps.json ----------
  const apps = Array.isArray(raw.apps) ? raw.apps : [];
  if (raw.apps && !Array.isArray(raw.apps)) err('apps.json', '配列ではありません');
  const appIds = new Set();
  for (const [i, a] of apps.entries()) {
    const w = `apps.json[${a?.id ?? i}]`;
    for (const k of ['id', 'name', 'summary', 'repo', 'pagesUrl', 'techStack']) {
      if (typeof a?.[k] !== 'string' || !a[k]) err(w, `${k} がありません`);
    }
    if (a?.id && !ID_RE.test(a.id)) err(w, 'id は英小文字・数字・ハイフンで書きます');
    if (a?.pagesUrl && !/^https:\/\//.test(a.pagesUrl)) err(w, 'pagesUrl は https:// で始めます');
    if ('topics' in (a ?? {}) || 'techIds' in (a ?? {})) warn(w, '技術 id の一覧は持たせません（技術項目の apps[] から逆引きします）');
    if (appIds.has(a?.id)) err(w, 'id が重複しています');
    appIds.add(a?.id);
  }

  // ---------- glossary.json ----------
  const glossary = Array.isArray(raw.glossary) ? raw.glossary : [];
  const terms = new Set();
  for (const [i, g] of glossary.entries()) {
    const w = `glossary.json[${g?.term ?? i}]`;
    if (typeof g?.term !== 'string' || !g.term) err(w, 'term がありません');
    if (typeof g?.reading !== 'string' || !g.reading) err(w, 'reading がありません');
    else if (!/^[ぁ-ゖー・ ]+$/.test(g.reading)) warn(w, 'reading はひらがなで書きます（五十音順の並べ替えに使います）');
    if (typeof g?.desc !== 'string' || !g.desc) err(w, 'desc がありません');
    if (terms.has(g?.term)) err(w, '用語が重複しています');
    terms.add(g?.term);
  }

  // ---------- topics ----------
  /** @type {any[]} */
  const topics = [];
  const topicIds = new Set();
  for (const f of raw.topicFiles ?? []) {
    if (!f.data) continue;
    const fileCat = f.path.replace(/^topics\/|\.json$/g, '');
    if (f.data.category !== fileCat) err(f.path, `category が「${fileCat}」ではありません`);
    if (!Array.isArray(f.data.topics)) {
      err(f.path, 'topics が配列ではありません');
      continue;
    }
    for (const t of f.data.topics) {
      const w = `${f.path} ${t?.id ?? '(id なし)'}`;
      if (typeof t?.id !== 'string' || !ID_RE.test(t.id)) err(w, 'id は英小文字・数字・ハイフンで書きます');
      if (topicIds.has(t?.id)) err(w, 'id が重複しています');
      topicIds.add(t?.id);
      if (t?.category !== fileCat) err(w, `category がファイル名（${fileCat}）と違います`);
      if (!LEVELS.includes(t?.level)) err(w, 'level は basic か intermediate です');
      for (const k of ['title', 'summary', 'what', 'why', 'how']) {
        if (typeof t?.[k] !== 'string' || !t[k].trim()) err(w, `${k} がありません`);
      }
      for (const k of ['what', 'why', 'how']) {
        if (typeof t?.[k] === 'string' && t[k].length > TEXT_LIMIT) warn(w, `${k} が ${t[k].length} 文字です（目安は ${TEXT_LIMIT} 文字以内）`);
      }
      for (const k of ['aka', 'keywords', 'pitfalls', 'related', 'tags']) {
        if (!Array.isArray(t?.[k]) || t[k].some((x) => typeof x !== 'string')) err(w, `${k} は文字列の配列にします`);
      }
      if (t?.iosNote != null && typeof t.iosNote !== 'string') err(w, 'iosNote は文字列にします');
      if (t?.demo != null && (typeof t.demo !== 'string' || !ID_RE.test(t.demo))) err(w, 'demo は英小文字とハイフンの id にします');
      else if (t?.demo != null && opt.demoIds && !opt.demoIds.has(t.demo)) err(w, `demo の「${t.demo}」に対応する js/demos/${t.demo}.js がありません`);
      if ('verified' in (t ?? {})) warn(w, 'verified は使わなくなりました（削除してください）');
      if (typeof t?.verifiedNote !== 'string') err(w, 'verifiedNote は文字列にします（なければ空）');
      if (typeof t?.lastReviewed !== 'string' || (t.lastReviewed !== '' && !isYmd(t.lastReviewed))) err(w, 'lastReviewed は YYYY-MM-DD か空にします');
      if (t?.lastReviewed && !t.verifiedNote) warn(w, 'lastReviewed を書いたら verifiedNote に確認した内容も書きます');
      if (!Array.isArray(t?.apps)) err(w, 'apps は配列にします');
      if (!Array.isArray(t?.links)) err(w, 'links は配列にします');
      for (const l of t?.links ?? []) {
        if (typeof l?.label !== 'string' || !l.label) err(w, 'links に label がないものがあります');
        if (typeof l?.url !== 'string' || !/^https:\/\//.test(l.url)) err(w, `links の url は https:// で始めます（${l?.url}）`);
        if (!LINK_KINDS.includes(l?.kind)) err(w, `links の kind「${l?.kind}」は official／mdn／caniuse／other のどれかです`);
      }
      if (t?.category === 'claude-code' && !(t.links ?? []).some((l) => l?.kind === 'official')) err(w, 'claude-code の項目には公式ドキュメントのリンク（kind: official）が必要です');
      topics.push(t);
    }
  }

  // ---------- リンク切れ・記法・コード抜粋 ----------
  for (const t of topics) {
    const w = `topic ${t.id}`;
    for (const r of t.related ?? []) {
      if (!topicIds.has(r)) err(w, `related の「${r}」が見つかりません`);
      if (r === t.id) warn(w, 'related に自分自身が入っています');
    }
    const seenApps = new Set();
    for (const use of Array.isArray(t.apps) ? t.apps : []) {
      if (!appIds.has(use?.appId)) err(w, `apps[].appId の「${use?.appId}」が apps.json にありません`);
      if (seenApps.has(use?.appId)) warn(w, `apps に「${use?.appId}」が重複しています`);
      seenApps.add(use?.appId);
      if (typeof use?.usage !== 'string' || !use.usage) err(w, `apps（${use?.appId}）に usage がありません`);
      if (use?.snippet) checkSnippet(`${w} / ${use.appId}`, use.snippet);
    }

    const texts = [t.summary, t.what, t.why, t.how, t.iosNote, ...(t.pitfalls ?? []), ...(Array.isArray(t.apps) ? t.apps.map((a) => a?.usage) : [])];
    for (const s of texts) {
      if (typeof s !== 'string') continue;
      for (const m of s.matchAll(TERM_RE)) {
        if (!terms.has(m[1])) err(w, `用語集にない用語 [[${m[1]}]]`);
      }
      const rest = s.replace(TOKEN_RE, '');
      if (/\[\[|\]\]|\*\*|`/.test(rest)) warn(w, `閉じていない記法があります：「${s.slice(0, 40)}…」`);
    }
  }

  /**
   * @param {string} w
   * @param {any} sn
   */
  function checkSnippet(w, sn) {
    for (const k of ['file', 'lang', 'code']) {
      if (typeof sn?.[k] !== 'string' || !sn[k]) err(w, `snippet.${k} がありません`);
    }
    if (typeof sn?.commitSha !== 'string' || !sn.commitSha) err(w, 'snippet.commitSha がありません');
    else if (!SHA_RE.test(sn.commitSha)) err(w, 'snippet.commitSha は 40 桁の16進数（git rev-parse HEAD の値）にします');
    if (!Number.isInteger(sn?.startLine) || !Number.isInteger(sn?.endLine) || sn.startLine < 1 || sn.endLine < sn.startLine) {
      err(w, 'snippet の startLine／endLine が正しくありません');
    }
    if (typeof sn?.code === 'string') {
      const lines = sn.code.replace(/\n$/, '').split('\n').length;
      if (lines > SNIPPET_MAX_LINES) err(w, `snippet が ${lines} 行あります（${SNIPPET_MAX_LINES} 行以内）`);
      if (Number.isInteger(sn.startLine) && Number.isInteger(sn.endLine) && sn.endLine - sn.startLine + 1 !== lines) {
        warn(w, `snippet の行数（${lines}）と startLine〜endLine（${sn.endLine - sn.startLine + 1} 行）が合いません`);
      }
      for (const re of SECRET_PATTERNS) {
        if (re.test(sn.code)) err(w, `snippet に秘密情報らしき文字列があります（${re.source}）。内容を確認してください`);
      }
    }
  }

  // ---------- 用語集の topicId ----------
  for (const g of glossary) {
    if (g?.topicId && !topicIds.has(g.topicId)) err(`glossary.json[${g.term}]`, `topicId の「${g.topicId}」が見つかりません`);
  }

  // ---------- quiz.json ----------
  const quiz = Array.isArray(raw.quiz) ? raw.quiz : [];
  if (raw.quiz && !Array.isArray(raw.quiz)) err('quiz.json', '配列ではありません');
  const quizIds = new Set();
  for (const [i, q] of quiz.entries()) {
    const w = `quiz.json[${q?.id ?? i}]`;
    if (typeof q?.id !== 'string' || !ID_RE.test(q.id)) err(w, 'id は英小文字・数字・ハイフンで書きます');
    if (quizIds.has(q?.id)) err(w, 'id が重複しています');
    quizIds.add(q?.id);
    if (typeof q?.question !== 'string' || !q.question) err(w, 'question がありません');
    if (!Array.isArray(q?.choices) || q.choices.length !== 4 || q.choices.some((c) => typeof c !== 'string' || !c)) err(w, 'choices は 4 つの文字列にします');
    else if (new Set(q.choices).size !== 4) err(w, 'choices に同じ選択肢があります');
    if (!Number.isInteger(q?.answer) || q.answer < 0 || q.answer > 3) err(w, 'answer は 0〜3 の整数（正解の選択肢の位置）です');
    if (typeof q?.explanation !== 'string' || !q.explanation) err(w, 'explanation がありません');
    if (!Array.isArray(q?.topicIds) || q.topicIds.length === 0) err(w, 'topicIds がありません');
    for (const id of q?.topicIds ?? []) if (!topicIds.has(id)) err(w, `topicIds の「${id}」が見つかりません`);
  }

  // ---------- 件数・バージョン ----------
  if (meta?.counts) {
    const actual = { topics: topics.length, glossary: glossary.length, quiz: quiz.length };
    for (const [k, n] of Object.entries(actual)) {
      if (meta.counts[k] !== n) err('meta.json', `counts.${k} が ${meta.counts[k]} ですが、実際は ${n} 件です`);
    }
  }
  if (opt.swText != null) {
    const m = opt.swText.match(/const VERSION = '([^']*)'/);
    if (!m) warn('sw.js', 'VERSION が見つかりません');
    else if (opt.appVersion && m[1] !== opt.appVersion) err('sw.js', `VERSION（${m[1]}）と js/config.js の APP_VERSION（${opt.appVersion}）が違います`);
  }

  for (const f of opt.swMissing ?? []) err('sw.js', `キャッシュ対象（SHELL）に ${f} がありません`);

  // ---------- 集計 ----------
  const byCat = new Map((meta?.categories ?? []).map((c) => [c.id, c]));
  let stale = 0;
  for (const t of topics) {
    const s = reviewState(t, byCat, opt.today);
    if (s === 'stale') stale++;
  }
  if (stale) info('技術項目', `要再確認：${stale} 件`);

  /** @type {Record<string, number | string>} */
  const stats = {
    技術項目: topics.length,
    要再確認: stale,
    アプリ: apps.length,
    用語: glossary.length,
    クイズ: quiz.length,
    コード抜粋: topics.reduce((n, t) => n + (Array.isArray(t.apps) ? t.apps.filter((a) => a?.snippet).length : 0), 0),
  };
  for (const c of meta?.categories ?? []) stats[`　${c.label}`] = topics.filter((t) => t.category === c.id).length;

  return { findings: out, stats };
}
