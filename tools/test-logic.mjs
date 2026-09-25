// 出題ロジック（js/quiz-gen.js）とライトナー方式（js/leitner.js）のテスト。
//   node tools/test-logic.mjs
// data/ を読み込んで確かめる（ファイルは変更しない）。
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const R = pathToFileURL(ROOT + '/').href;
const { buildStore } = await import(R + 'js/data.js');
const Q = await import(R + 'js/quiz-gen.js');
const L = await import(R + 'js/leitner.js');
const D = await import(R + 'js/date.js');
const S = await import(R + 'js/status.js');

const rd = (p) => JSON.parse(readFileSync(join(ROOT, 'data', p), 'utf8'));
const meta = rd('meta.json');
const raw = {
  meta,
  apps: rd('apps.json'),
  glossary: rd('glossary.json'),
  quiz: rd('quiz.json'),
  topicFiles: meta.categories.map((c) => ({ path: `topics/${c.id}.json`, data: rd(`topics/${c.id}.json`) })),
  failed: [],
};
const plain = (s) => s.replace(/\[\[([^\]]+)\]\]|`([^`]+)`|\*\*([^*]+)\*\*/g, (_, a, b, c) => a ?? b ?? c);
const fresh = () => buildStore(structuredClone(raw));
const TODAY = '2026-09-26';

let ok = 0;
let ng = 0;
const assert = (c, m) => {
  if (c) ok++;
  else {
    ng++;
    console.log('NG', m);
  }
};

// ---------- 開始できるか ----------
let store = fresh();
assert(Q.checkStart(store, { kind: 'all' }, 'normal', {}, TODAY).ok, 'すべての項目で開始できる');
assert(Q.checkStart(store, { kind: 'all' }, 'normal', {}, TODAY, 'cards').ok, 'カードも開始できる');
const small = store.categories.find((c) => store.topics.filter((t) => t.category === c.id).length < Q.MIN_TOPICS);
if (small) {
  const r = Q.checkStart(store, { kind: 'category', id: small.id }, 'normal', {}, TODAY);
  assert(!r.ok, `4 件未満のカテゴリ（${small.label}）ではクイズを開始できない`);
  assert(Q.checkStart(store, { kind: 'category', id: small.id }, 'normal', {}, TODAY, 'cards').ok, '4 件未満でもカードは開始できる');
}
assert(!Q.checkStart(store, { kind: 'all' }, 'weak', {}, TODAY).ok, '記録がなければ苦手の復習は開始できない');
assert(!Q.checkStart(store, { kind: 'all' }, 'today', {}, TODAY).ok, '記録がなければ今日の復習は開始できない');

// ---------- 通常モード ----------
const ids = new Set(store.topics.map((t) => t.id));
for (let k = 0; k < 200; k++) {
  const qs = Q.buildQuiz(store, { kind: 'all' }, 'normal', {}, TODAY, plain);
  assert(qs.length === Q.SET_SIZE, '10 問');
  for (const q of qs) {
    assert(q.choices.length === 4 && new Set(q.choices).size === 4, '選択肢は 4 つとも別 ' + q.type);
    assert(q.answer >= 0 && q.answer < 4, '正解の位置');
    assert(q.topicIds.every((id) => ids.has(id)), '存在する項目だけ');
    if (q.type === 'app-tech') {
      const app = store.apps.find((a) => a.name === q.subject);
      const correct = store.topics.find((t) => t.title === q.choices[q.answer]);
      assert(correct.apps.some((a) => a.appId === app.id), '正解はそのアプリで使った技術');
      q.choices.forEach((c, i) => {
        if (i !== q.answer) assert(!store.topics.find((t) => t.title === c).apps.some((a) => a.appId === app.id), '誤答はそのアプリで使っていない技術');
      });
    }
  }
}
const types = new Set();
for (let k = 0; k < 50; k++) Q.buildQuiz(store, { kind: 'all' }, 'normal', {}, TODAY, plain).forEach((q) => types.add(q.type));
assert(['title-summary', 'summary-title', 'app-tech', 'manual'].every((t) => types.has(t)), '4 種類の問題がすべて出る：' + [...types]);

let same = 0;
let total = 0;
for (let k = 0; k < 100; k++) {
  for (const q of Q.buildQuiz(store, { kind: 'all' }, 'normal', {}, TODAY, plain)) {
    if (q.type !== 'summary-title') continue;
    const tgt = store.topics.find((t) => t.title === q.choices[q.answer]);
    q.choices.forEach((c, i) => {
      if (i === q.answer) return;
      total++;
      if (store.topics.find((t) => t.title === c).category === tgt.category) same++;
    });
  }
}
console.log('誤答が同じカテゴリだった割合：', (same / total).toFixed(2));
assert(same / total > 0.5, '誤答はできるだけ同じカテゴリから');

// ---------- 範囲 ----------
for (const app of store.apps) {
  const qa = Q.buildQuiz(store, { kind: 'app', id: app.id }, 'normal', {}, TODAY, plain);
  assert(qa.every((q) => q.topicIds.some((id) => store.topicById.get(id).apps.some((a) => a.appId === app.id))), `アプリの範囲（${app.name}）`);
}
const qc = Q.buildQuiz(store, { kind: 'category', id: 'web-api' }, 'normal', {}, TODAY, plain);
assert(qc.every((q) => q.topicIds.some((id) => store.topicById.get(id).category === 'web-api')), 'カテゴリの範囲');

// ---------- ライトナー方式 ----------
let p = L.nextProgress(undefined, true, TODAY);
assert(p.box === 2 && p.due === '2026-09-28' && p.correct === 1, '初回正解 → 箱 2、2 日後');
p = L.nextProgress(p, true, '2026-09-28');
assert(p.box === 3 && p.due === '2026-10-02', '箱 3、4 日後');
p = L.nextProgress(p, true, '2026-10-02');
assert(p.box === 4 && p.due === '2026-10-10', '箱 4、8 日後');
p = L.nextProgress(p, true, '2026-10-10');
assert(p.box === 5 && p.due === '2026-10-26', '箱 5、16 日後');
p = L.nextProgress(p, true, '2026-10-26');
assert(p.box === 5 && p.due === '2026-11-11', '箱 5 のまま、16 日後');
p = L.nextProgress(p, false, '2026-11-11');
assert(p.box === 1 && p.due === '2026-11-12' && p.wrong === 1 && p.correct === 5, '不正解 → 箱 1、明日');
assert(L.nextProgress(undefined, false, '2026-12-31').due === '2027-01-01', '年末をまたぐ');
assert(D.addDays('2027-02-28', 1) === '2027-03-01', '月末をまたぐ');

// ---------- 今日の復習・苦手 ----------
const t = store.topics;
const prog = {
  [t[0].id]: { box: 1, due: '2026-09-26', correct: 0, wrong: 3 },
  [t[1].id]: { box: 2, due: '2026-09-27', correct: 1, wrong: 1 },
  [t[2].id]: { box: 3, due: '2026-09-20', correct: 3, wrong: 0 },
};
const all = Q.scopeTopics(store, { kind: 'all' });
assert(Q.pickTargets(all, 'today', prog, TODAY).map((x) => x.id).join() === [t[2].id, t[0].id].join(), '今日の復習は due の古い順');
assert(Q.pickTargets(all, 'today', prog, '2026-09-27').length === 3, '翌日は箱 2 の項目も対象');
assert(Q.pickTargets(all, 'weak', prog, TODAY).map((x) => x.id).join() === [t[0].id, t[1].id].join(), '苦手は不正解率の高い順');
for (let k = 0; k < 300; k++) {
  const tq = Q.buildQuiz(store, { kind: 'all' }, 'today', prog, TODAY, plain);
  assert(tq.length === 2, '今日の復習は対象の件数だけ');
  assert(tq.every((q) => q.topicIds.some((id) => id === t[0].id || id === t[2].id)), '今日の復習は対象の項目に関係する問題だけ');
  assert(tq[0].topicIds.includes(t[2].id), 'due の古い項目から');
  assert(Q.checkStart(store, { kind: 'all' }, 'today', prog, TODAY).count === 2, '案内の件数');
}

// ---------- 要再確認 ----------
const cats = store.categoryById;
assert(S.reviewState({ category: 'pwa', lastReviewed: '' }, cats, TODAY) === 'ok', '確認日がなければバッジなし');
assert(S.reviewState({ category: 'pwa', lastReviewed: '2026-03-01' }, cats, TODAY) === 'stale', '180 日を超えると要再確認');
assert(S.reviewState({ category: 'pwa', lastReviewed: '2026-06-01' }, cats, TODAY) === 'ok', '180 日以内');
assert(S.reviewState({ category: 'claude-code', lastReviewed: '2026-06-01' }, cats, TODAY) === 'stale', 'claude-code は 90 日');

console.log(`成功 ${ok} 件、失敗 ${ng} 件`);
process.exit(ng ? 1 : 0);
