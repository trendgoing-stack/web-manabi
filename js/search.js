// 技術項目の検索。
// 優先順位：title／aka の前方一致 ＞ title ＞ aka ＞ keywords ＞ tags ＞ summary
// 空白区切りの複数語は AND（すべての語がどこかに一致した項目だけ）。

import { normalize } from './normalize.js';

const SCORE = { prefix: 100, title: 80, aka: 60, keywords: 40, tags: 30, summary: 10 };

/**
 * @typedef {Object} IndexEntry
 * @property {import('./types.js').Topic} topic
 * @property {string} title
 * @property {string[]} aka
 * @property {string[]} keywords
 * @property {string[]} tags
 * @property {string} summary
 */

/**
 * 正規化した文字列を前もって作っておく
 * @param {import('./types.js').Topic[]} topics
 * @returns {IndexEntry[]}
 */
export function buildIndex(topics) {
  return topics.map((topic) => ({
    topic,
    title: normalize(topic.title),
    aka: topic.aka.map(normalize),
    keywords: topic.keywords.map(normalize),
    tags: topic.tags.map(normalize),
    summary: normalize(topic.summary),
  }));
}

/**
 * 1 語についての点数（一致しなければ 0）
 * @param {IndexEntry} e
 * @param {string} w 正規化済みの語
 */
function scoreTerm(e, w) {
  if (e.title.startsWith(w) || e.aka.some((a) => a.startsWith(w))) return SCORE.prefix;
  if (e.title.includes(w)) return SCORE.title;
  if (e.aka.some((a) => a.includes(w))) return SCORE.aka;
  if (e.keywords.some((k) => k.includes(w))) return SCORE.keywords;
  if (e.tags.some((t) => t.includes(w))) return SCORE.tags;
  if (e.summary.includes(w)) return SCORE.summary;
  return 0;
}

/**
 * @param {IndexEntry[]} index
 * @param {string} query 入力そのまま
 * @param {(t: import('./types.js').Topic) => boolean} filter 絞り込み（表示設定を含む）
 * @param {number} limit
 * @returns {import('./types.js').Topic[]}
 */
export function search(index, query, filter, limit) {
  const words = normalize(query).split(' ').filter(Boolean);
  /** @type {{topic: import('./types.js').Topic, score: number, order: number}[]} */
  const hits = [];
  index.forEach((e, order) => {
    if (!filter(e.topic)) return;
    let total = 0;
    for (const w of words) {
      const s = scoreTerm(e, w);
      if (s === 0) return;
      total += s;
    }
    hits.push({ topic: e.topic, score: total, order });
  });
  hits.sort((a, b) => b.score - a.score || a.order - b.order);
  return hits.slice(0, limit).map((h) => h.topic);
}
