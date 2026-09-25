// ライトナー方式の学習記録。箱は 1〜5。未学習の項目は箱 1 として扱う。
// 正解：箱を 1 つ進める（上限 5）。due は「今日 ＋ 新しい箱の間隔」
// 不正解：箱 1 に戻す。due は明日
// 日付は端末のローカル日付（YYYY-MM-DD）で扱う。

import { addDays } from './date.js';

/** 箱ごとの間隔（日） */
export const INTERVALS = /** @type {const} */ ({ 1: 1, 2: 2, 3: 4, 4: 8, 5: 16 });
export const MAX_BOX = 5;

/**
 * @typedef {import('./storage.js').Progress} Progress
 */

/**
 * @param {Progress | undefined} prev
 * @param {boolean} correct
 * @param {string} today YYYY-MM-DD
 * @returns {Progress}
 */
export function nextProgress(prev, correct, today) {
  const cur = prev ?? { box: 1, due: today, correct: 0, wrong: 0 };
  if (correct) {
    const box = Math.min(MAX_BOX, cur.box + 1);
    return { box, due: addDays(today, INTERVALS[/** @type {1|2|3|4|5} */ (box)]), correct: cur.correct + 1, wrong: cur.wrong };
  }
  return { box: 1, due: addDays(today, 1), correct: cur.correct, wrong: cur.wrong + 1 };
}

/**
 * 今日の復習の対象か（記録があり、due が今日以前）
 * @param {Progress | undefined} p
 * @param {string} today
 */
export function isDue(p, today) {
  return !!p && p.due <= today;
}

/**
 * 不正解率（回答がなければ 0）
 * @param {Progress | undefined} p
 */
export function wrongRate(p) {
  if (!p) return 0;
  const n = p.correct + p.wrong;
  return n ? p.wrong / n : 0;
}
