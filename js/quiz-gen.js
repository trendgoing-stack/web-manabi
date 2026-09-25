// クイズとフラッシュカードの出題（DOM を使わない純粋な関数）。
//
// 自動出題の種類：
//   title-summary … 技術名を見て、要約を 4 択で選ぶ
//   summary-title … 要約を見て、技術名を 4 択で選ぶ
//   app-tech      … アプリ名を見て、そのアプリで使った技術を 4 択で選ぶ（誤答はそのアプリで使っていない技術）
// 誤答はできるだけ同じカテゴリから選ぶ。quiz.json の手書き問題も混ぜる。

import { isDue, wrongRate } from './leitner.js';

export const SET_SIZE = 10;
export const MIN_TOPICS = 4;

/**
 * @typedef {'normal'|'weak'|'today'} Mode
 * @typedef {{kind: 'all'} | {kind: 'category', id: string} | {kind: 'app', id: string}} Scope
 * @typedef {Object} Question
 * @property {'title-summary'|'summary-title'|'app-tech'|'manual'} type
 * @property {string} prompt 問題文
 * @property {string} [subject] 問題の主役（技術名・要約・アプリ名）。大きく表示する
 * @property {string[]} choices
 * @property {number} answer 正解の添字
 * @property {string} explanation 解説（要約、または手書き問題の explanation）
 * @property {string[]} topicIds 学習記録を更新する項目
 * @property {string} linkTopicId 詳細画面へのリンク先
 */

/**
 * @param {number} n
 * @param {() => number} rng 0 以上 1 未満
 */
const randInt = (n, rng) => Math.floor(rng() * n);

/**
 * @template T
 * @param {T[]} arr
 * @param {() => number} rng
 * @returns {T[]}
 */
export function shuffle(arr, rng = Math.random) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = randInt(i + 1, rng);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * 出題範囲に入る項目
 * @param {import('./types.js').Store} store
 * @param {Scope} scope
 */
export function scopeTopics(store, scope) {
  if (scope.kind === 'category') return store.topics.filter((t) => t.category === scope.id);
  if (scope.kind === 'app') return store.topics.filter((t) => t.apps.some((a) => a.appId === scope.id));
  return store.topics;
}

/**
 * モードに応じた出題対象（並び順つき）
 * @param {import('./types.js').Topic[]} pool 範囲内の項目
 * @param {Mode} mode
 * @param {Record<string, import('./storage.js').Progress>} progress
 * @param {string} today
 * @param {() => number} rng
 */
export function pickTargets(pool, mode, progress, today, rng = Math.random) {
  if (mode === 'weak') {
    return pool
      .filter((t) => (progress[t.id]?.wrong ?? 0) > 0)
      .sort((a, b) => wrongRate(progress[b.id]) - wrongRate(progress[a.id]) || (progress[b.id].wrong - progress[a.id].wrong));
  }
  if (mode === 'today') {
    return shuffle(pool.filter((t) => isDue(progress[t.id], today)), rng).sort((a, b) => (progress[a.id].due < progress[b.id].due ? -1 : progress[a.id].due > progress[b.id].due ? 1 : 0));
  }
  return shuffle(pool, rng);
}

/**
 * 出題できる手書き問題（関係する項目がすべて存在し、ids のどれかに関係するもの）
 * @param {import('./types.js').Store} store
 * @param {Set<string>} ids
 */
export function eligibleManual(store, ids) {
  return store.quiz.filter((q) => q.topicIds.length > 0 && q.topicIds.every((id) => store.topicById.has(id)) && q.topicIds.some((id) => ids.has(id)));
}

/**
 * 出題できるかの判定と、画面に出す説明
 * @param {import('./types.js').Store} store
 * @param {Scope} scope
 * @param {Mode} mode
 * @param {Record<string, import('./storage.js').Progress>} progress
 * @param {string} today
 * @param {'quiz'|'cards'} [kind] カードは誤答が要らないので 1 件から始められる
 * @returns {{ok: boolean, message: string, count: number}}
 */
export function checkStart(store, scope, mode, progress, today, kind = 'quiz') {
  const min = kind === 'quiz' ? MIN_TOPICS : 1;
  const unit = kind === 'quiz' ? '問を出題します' : '枚のカードを出します';
  const pool = scopeTopics(store, scope);
  if (pool.length < min) {
    return { ok: false, count: pool.length, message: `この範囲の項目は ${pool.length} 件です。${min} 件以上になると出題できます。` };
  }
  const targets = pickTargets(pool, mode, progress, today);
  if (mode === 'weak' && !targets.length) return { ok: false, count: 0, message: 'この範囲で間違えたことのある項目はありません。' };
  if (mode === 'today' && !targets.length) return { ok: false, count: 0, message: 'この範囲で今日復習する項目はありません。' };
  // 通常モードのクイズは手書き問題も数える。弱点・今日の復習は対象の項目 1 件につき 1 問
  const extra = kind === 'quiz' && mode === 'normal' ? eligibleManual(store, new Set(pool.map((t) => t.id))).length : 0;
  const n = Math.min(SET_SIZE, targets.length + extra);
  const desc = mode === 'weak' ? '間違えたことのある項目から、不正解率の高い順に' : mode === 'today' ? '今日の復習の項目から' : `${pool.length} 件から`;
  return { ok: true, count: n, message: `${desc} ${n} ${unit}。` };
}

/**
 * 誤答の候補を選ぶ（同じカテゴリを優先）
 * @param {import('./types.js').Topic} target
 * @param {import('./types.js').Topic[]} candidates 正解以外の候補
 * @param {(t: import('./types.js').Topic) => string} label
 * @param {() => number} rng
 * @returns {import('./types.js').Topic[] | null}
 */
function pickDistractors(target, candidates, label, rng) {
  const used = new Set([label(target)]);
  const same = shuffle(candidates.filter((t) => t.category === target.category), rng);
  const other = shuffle(candidates.filter((t) => t.category !== target.category), rng);
  /** @type {import('./types.js').Topic[]} */
  const out = [];
  for (const t of [...same, ...other]) {
    const l = label(t);
    if (used.has(l)) continue;
    used.add(l);
    out.push(t);
    if (out.length === 3) return out;
  }
  return null;
}

/**
 * @param {string} correct
 * @param {string[]} wrongs
 * @param {() => number} rng
 */
function arrange(correct, wrongs, rng) {
  const choices = shuffle([correct, ...wrongs], rng);
  return { choices, answer: choices.indexOf(correct) };
}

/**
 * 1 項目から自動の問題を作る（作れなければ null）
 * @param {import('./types.js').Store} store
 * @param {import('./types.js').Topic} target
 * @param {import('./types.js').Topic[]} all すべての項目（誤答の候補）
 * @param {Scope} scope
 * @param {(s: string) => string} plain 記法を取り除く関数
 * @param {() => number} rng
 * @returns {Question | null}
 */
export function makeAutoQuestion(store, target, all, scope, plain, rng = Math.random) {
  const others = all.filter((t) => t.id !== target.id);
  /** @type {Array<() => Question | null>} */
  const makers = [
    () => {
      const d = pickDistractors(target, others, (t) => plain(t.summary), rng);
      if (!d) return null;
      const { choices, answer } = arrange(plain(target.summary), d.map((t) => plain(t.summary)), rng);
      return { type: 'title-summary', prompt: 'この技術の説明として正しいものは？', subject: target.title, choices, answer, explanation: plain(target.summary), topicIds: [target.id], linkTopicId: target.id };
    },
    () => {
      const d = pickDistractors(target, others, (t) => t.title, rng);
      if (!d) return null;
      const { choices, answer } = arrange(target.title, d.map((t) => t.title), rng);
      return { type: 'summary-title', prompt: 'この説明にあてはまる技術は？', subject: plain(target.summary), choices, answer, explanation: plain(target.summary), topicIds: [target.id], linkTopicId: target.id };
    },
    () => {
      const usedBy = target.apps.map((a) => a.appId).filter((id) => store.appById.has(id));
      const appIds = scope.kind === 'app' ? usedBy.filter((id) => id === scope.id) : usedBy;
      if (!appIds.length) return null;
      const appId = appIds[randInt(appIds.length, rng)];
      const app = /** @type {import('./types.js').App} */ (store.appById.get(appId));
      const notUsed = others.filter((t) => !t.apps.some((a) => a.appId === appId));
      const d = pickDistractors(target, notUsed, (t) => t.title, rng);
      if (!d) return null;
      const { choices, answer } = arrange(target.title, d.map((t) => t.title), rng);
      return { type: 'app-tech', prompt: 'このアプリで使った技術は？', subject: app.name, choices, answer, explanation: `${target.title}：${plain(target.summary)}`, topicIds: [target.id], linkTopicId: target.id };
    },
  ];
  for (const make of shuffle(makers, rng)) {
    const q = make();
    if (q) return q;
  }
  return null;
}

/**
 * 手書き問題を Question にする
 * @param {import('./types.js').QuizItem} item
 * @param {() => number} rng
 * @returns {Question}
 */
export function makeManualQuestion(item, rng = Math.random) {
  const correct = item.choices[item.answer];
  const { choices, answer } = arrange(correct, item.choices.filter((_, i) => i !== item.answer), rng);
  return { type: 'manual', prompt: item.question, choices, answer, explanation: item.explanation, topicIds: item.topicIds, linkTopicId: item.topicIds[0] };
}

/**
 * 1 セット（最大 10 問）を作る
 * @param {import('./types.js').Store} store
 * @param {Scope} scope
 * @param {Mode} mode
 * @param {Record<string, import('./storage.js').Progress>} progress
 * @param {string} today
 * @param {(s: string) => string} plain
 * @param {() => number} [rng]
 * @returns {Question[]}
 */
export function buildQuiz(store, scope, mode, progress, today, plain, rng = Math.random) {
  const pool = scopeTopics(store, scope);
  const targets = pickTargets(pool, mode, progress, today, rng);

  /** @type {Array<{kind: 'auto', topic: import('./types.js').Topic} | {kind: 'manual', item: import('./types.js').QuizItem}>} */
  let slots;
  if (mode === 'normal') {
    // 範囲内の自動問題と手書き問題をまとめて混ぜる
    const manual = eligibleManual(store, new Set(pool.map((t) => t.id)));
    slots = shuffle([...targets.map((t) => ({ kind: /** @type {const} */ ('auto'), topic: t })), ...manual.map((m) => ({ kind: /** @type {const} */ ('manual'), item: m }))], rng);
  } else {
    // 弱点・今日の復習は対象の並び順を保ち、1 項目につき 1 問。関係する手書き問題があれば半々で使う
    const used = new Set();
    slots = targets.map((t) => {
      const cands = eligibleManual(store, new Set([t.id])).filter((m) => !used.has(m.id));
      if (cands.length && rng() < 0.5) {
        const m = cands[randInt(cands.length, rng)];
        used.add(m.id);
        return { kind: /** @type {const} */ ('manual'), item: m };
      }
      return { kind: /** @type {const} */ ('auto'), topic: t };
    });
  }

  /** @type {Question[]} */
  const out = [];
  for (const s of slots) {
    if (out.length >= SET_SIZE) break;
    const q = s.kind === 'auto' ? makeAutoQuestion(store, s.topic, store.topics, scope, plain, rng) : makeManualQuestion(s.item, rng);
    if (q) out.push(q);
  }
  return out;
}

/**
 * フラッシュカードの 1 セット
 * @param {import('./types.js').Store} store
 * @param {Scope} scope
 * @param {Mode} mode
 * @param {Record<string, import('./storage.js').Progress>} progress
 * @param {string} today
 * @param {() => number} [rng]
 */
export function buildDeck(store, scope, mode, progress, today, rng = Math.random) {
  return pickTargets(scopeTopics(store, scope), mode, progress, today, rng).slice(0, SET_SIZE);
}
