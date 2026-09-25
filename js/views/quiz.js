// クイズ（#/learn/quiz）。開始画面 → 1 問ずつ回答 → 結果。
// 回答するたびに学習記録（ライトナー方式）を更新する。

import { h, clear } from '../ui/dom.js';
import { show } from '../ui/shell.js';
import { plain } from '../ui/rich.js';
import { getStore } from '../data.js';
import { getProgress, recordAnswer } from '../storage.js';
import { today } from '../date.js';
import { buildQuiz } from '../quiz-gen.js';
import { readParams, scopeLabel, studySetup } from './study.js';

const TYPE_LABELS = { 'title-summary': '技術名 → 説明', 'summary-title': '説明 → 技術名', 'app-tech': 'アプリ → 技術', manual: '問題' };

export function renderQuiz() {
  const root = h('div', { class: 'page' });

  const setup = () => {
    const { scope, mode } = readParams();
    clear(root);
    root.append(studySetup({ kind: 'quiz', scope, mode, onStart: start }));
    window.scrollTo(0, 0);
  };

  /**
   * @param {import('../quiz-gen.js').Scope} sc
   * @param {import('../quiz-gen.js').Mode} md
   */
  const start = (sc, md) => {
    const questions = buildQuiz(getStore(), sc, md, getProgress(), today(), plain);
    if (!questions.length) return;
    /** @type {boolean[]} */
    const results = [];
    let i = 0;

    const ask = () => {
      clear(root);
      const q = questions[i];
      let answered = false;
      const feedback = h('div', { class: 'quiz-feedback', role: 'status', 'aria-live': 'polite' });
      const buttons = q.choices.map((c, idx) =>
        h(
          'button',
          {
            type: 'button',
            class: 'choice',
            onclick: () => {
              if (answered) return;
              answered = true;
              const ok = idx === q.answer;
              results.push(ok);
              recordAnswer(q.topicIds, ok, today());
              buttons.forEach((b, j) => {
                b.setAttribute('aria-disabled', 'true');
                if (j === q.answer) b.classList.add('correct');
                else if (j === idx) b.classList.add('wrong');
              });
              const topic = getStore().topicById.get(q.linkTopicId);
              feedback.append(
                h('p', { class: `verdict ${ok ? 'ok' : 'ng'}` }, ok ? '正解！' : '不正解'),
                h('p', { class: 'explanation' }, q.explanation),
                topic ? h('a', { href: `#/topic/${encodeURIComponent(topic.id)}`, class: 'more' }, `「${topic.title}」の詳細を見る`) : null,
                h('button', { type: 'button', class: 'btn btn-primary btn-block', onclick: next }, i + 1 < questions.length ? '次の問題へ' : '結果を見る'),
              );
              feedback.querySelector('button')?.focus();
            },
          },
          h('span', { class: 'choice-mark', 'aria-hidden': 'true' }, 'ABCD'[idx]),
          h('span', {}, c),
        ),
      );
      root.append(
        h('div', { class: 'quiz-progress' }, h('span', {}, `${i + 1} / ${questions.length}`), h('span', { class: 'chip' }, TYPE_LABELS[q.type])),
        h('progress', { class: 'quiz-bar', max: String(questions.length), value: String(i) }),
        h('p', { class: 'quiz-prompt' }, q.prompt),
        q.subject ? h('p', { class: `quiz-subject ${q.type === 'summary-title' ? 'long' : ''}` }, q.subject) : null,
        h('div', { class: 'choices' }, buttons),
        feedback,
      );
      window.scrollTo(0, 0);
    };

    const next = () => {
      i++;
      if (i < questions.length) ask();
      else finish();
    };

    const finish = () => {
      clear(root);
      const score = results.filter(Boolean).length;
      const store = getStore();
      root.append(
        h('p', { class: 'result-score' }, `${questions.length} 問中 ${score} 問正解`),
        h('p', { class: 'muted' }, `範囲：${scopeLabel(sc)}`),
        h(
          'ul',
          { class: 'list' },
          questions.map((q, k) => {
            const t = store.topicById.get(q.linkTopicId);
            return h(
              'li',
              {},
              h(
                'a',
                { href: t ? `#/topic/${encodeURIComponent(t.id)}` : '#/learn', class: 'row' },
                h('span', { class: `result-mark ${results[k] ? 'ok' : 'ng'}`, 'aria-label': results[k] ? '正解' : '不正解' }, results[k] ? '○' : '×'),
                h('div', { class: 'row-main' }, h('div', { class: 'row-title' }, t?.title ?? ''), h('div', { class: 'row-summary' }, q.subject && q.type !== 'summary-title' ? `${q.prompt}（${q.subject}）` : q.prompt)),
              ),
            );
          }),
        ),
        h('button', { type: 'button', class: 'btn btn-primary btn-block', onclick: () => start(sc, md) }, '同じ条件でもう一度'),
        h('button', { type: 'button', class: 'btn btn-block', onclick: setup }, '条件を変える'),
      );
      window.scrollTo(0, 0);
    };

    ask();
  };

  setup();
  show({ title: 'クイズ', tab: 'learn', back: '#/learn', node: root });
}
