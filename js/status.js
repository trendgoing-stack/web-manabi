// 項目の確認状態（未確認／要再確認）と、表示するかどうかの判定。

import { daysBetween, isYmd, today } from './date.js';
import { getStore } from './data.js';
import { getSettings } from './storage.js';

/**
 * @param {import('./types.js').Topic} topic
 * @param {Map<string, import('./types.js').Category>} categoryById
 * @param {string} [now] YYYY-MM-DD（省略時は今日）
 * @returns {'unverified' | 'stale' | 'ok'}
 */
export function reviewState(topic, categoryById, now = today()) {
  if (!topic.verified) return 'unverified';
  const days = categoryById.get(topic.category)?.reviewDays ?? 180;
  if (!isYmd(topic.lastReviewed)) return 'stale';
  return daysBetween(topic.lastReviewed, now) > days ? 'stale' : 'ok';
}

/** @param {import('./types.js').Topic} topic */
export function topicState(topic) {
  return reviewState(topic, getStore().categoryById);
}

/**
 * 一覧や検索に出すか（未確認項目の表示設定）
 * @param {import('./types.js').Topic} topic
 */
export function isVisible(topic) {
  return topic.verified || getSettings().showUnverified;
}
