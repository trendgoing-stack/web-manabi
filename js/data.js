// データの読み込みと索引づくり。
// meta.json・apps.json・glossary.json・quiz.json は同時に取りに行き、
// topics/<category>.json は meta.json のカテゴリ定義がわかりしだい並列で取りに行く。
// 1 ファイルが失敗しても、残りのデータで起動する。

import { FALLBACK_CATEGORIES } from './config.js';

/**
 * @param {string} base data/ の URL（末尾 /）
 * @param {string} path
 * @param {string[]} failed
 */
async function getJson(base, path, failed) {
  try {
    const res = await fetch(base + path);
    if (!res.ok) throw new Error(String(res.status));
    return await res.json();
  } catch {
    failed.push(path);
    return null;
  }
}

/**
 * data/ 以下を読み込む（生のデータ）
 * @param {string} [base]
 */
export async function loadRaw(base = './data/') {
  /** @type {string[]} */
  const failed = [];
  const metaP = getJson(base, 'meta.json', failed);
  const appsP = getJson(base, 'apps.json', failed);
  const glossaryP = getJson(base, 'glossary.json', failed);
  const quizP = getJson(base, 'quiz.json', failed);

  const meta = await metaP;
  const categories = Array.isArray(meta?.categories) ? meta.categories : FALLBACK_CATEGORIES;
  const topicFiles = await Promise.all(
    categories.map(async (c) => ({ path: `topics/${c.id}.json`, data: await getJson(base, `topics/${c.id}.json`, failed) })),
  );

  return {
    meta,
    apps: await appsP,
    glossary: await glossaryP,
    quiz: await quizP,
    topicFiles,
    failed,
  };
}

/**
 * 生データから画面で使う索引を作る。形がおかしい要素は読み飛ばす（詳しいチェックは tools/validate.html）。
 * @param {Awaited<ReturnType<typeof loadRaw>>} raw
 * @returns {import('./types.js').Store}
 */
export function buildStore(raw) {
  const meta = raw.meta ?? { schemaVersion: 0, dataVersion: '不明', counts: { topics: 0, glossary: 0, quiz: 0 }, categories: FALLBACK_CATEGORIES };
  const categories = [...(Array.isArray(meta.categories) ? meta.categories : FALLBACK_CATEGORIES)].sort((a, b) => a.order - b.order);
  const categoryById = new Map(categories.map((c) => [c.id, c]));

  /** @type {import('./types.js').Topic[]} */
  const topics = [];
  const topicById = new Map();
  for (const f of raw.topicFiles) {
    const list = Array.isArray(f.data?.topics) ? f.data.topics : [];
    for (const t of list) {
      if (!t || typeof t.id !== 'string' || typeof t.title !== 'string' || topicById.has(t.id)) continue;
      const topic = {
        ...t,
        aka: arr(t.aka),
        keywords: arr(t.keywords),
        pitfalls: arr(t.pitfalls),
        apps: arr(t.apps),
        related: arr(t.related),
        links: arr(t.links),
        tags: arr(t.tags),
        lastReviewed: t.lastReviewed || '',
      };
      topics.push(topic);
      topicById.set(t.id, topic);
    }
  }
  const catOrder = (t) => categoryById.get(t.category)?.order ?? 99;
  topics.sort((a, b) => catOrder(a) - catOrder(b) || a.title.localeCompare(b.title, 'ja'));

  const apps = arr(raw.apps).filter((a) => a && typeof a.id === 'string');
  const appById = new Map(apps.map((a) => [a.id, a]));
  /** @type {Map<string, import('./types.js').Topic[]>} */
  const topicsByApp = new Map(apps.map((a) => [a.id, []]));
  for (const t of topics) {
    for (const use of t.apps) topicsByApp.get(use?.appId)?.push(t);
  }

  const glossary = arr(raw.glossary)
    .filter((g) => g && typeof g.term === 'string')
    .sort((a, b) => String(a.reading).localeCompare(String(b.reading), 'ja'));
  const glossaryByTerm = new Map(glossary.map((g) => [g.term, g]));

  return {
    meta,
    categories,
    categoryById,
    topics,
    topicById,
    apps,
    appById,
    topicsByApp,
    glossary,
    glossaryByTerm,
    quiz: arr(raw.quiz),
    failed: raw.failed,
  };
}

/** @param {any} v */
function arr(v) {
  return Array.isArray(v) ? v : [];
}

/** @type {import('./types.js').Store | null} */
let store = null;

export async function loadStore() {
  store = buildStore(await loadRaw());
  return store;
}

/** 読み込み済みのデータ */
export function getStore() {
  if (!store) throw new Error('データがまだ読み込まれていません');
  return store;
}
