// 項目の確認状態（要再確認）の判定。
// 最終確認日（lastReviewed）が書かれている項目だけが対象。確認日からカテゴリの日数を超えると「要再確認」。

import { daysBetween, isYmd, today } from './date.js';
import { getStore } from './data.js';

/**
 * @param {import('./types.js').Topic} topic
 * @param {Map<string, import('./types.js').Category>} categoryById
 * @param {string} [now] YYYY-MM-DD（省略時は今日）
 * @returns {'stale' | 'ok'}
 */
export function reviewState(topic, categoryById, now = today()) {
  if (!isYmd(topic.lastReviewed)) return 'ok';
  const days = categoryById.get(topic.category)?.reviewDays ?? 180;
  return daysBetween(topic.lastReviewed, now) > days ? 'stale' : 'ok';
}

/** @param {import('./types.js').Topic} topic */
export function topicState(topic) {
  return reviewState(topic, getStore().categoryById);
}
