// フラッシュカード（#/learn/cards）。表：技術名、裏：要約と使ったアプリ名。
// 裏面で「覚えた」（正解扱い）／「まだ」（不正解扱い）を選ぶと、学習記録を更新して次のカードへ進む。
// スワイプは Pointer Events で扱い、touch-action: pan-y で縦スクロールはブラウザに任せる。
//   裏面で右へスワイプ＝覚えた、左へスワイプ＝まだ

import { h, clear } from '../ui/dom.js';
import { show } from '../ui/shell.js';
import { categoryBadge } from '../ui/badges.js';
import { plain } from '../ui/rich.js';
import { getStore } from '../data.js';
import { getProgress, recordAnswer } from '../storage.js';
import { today } from '../date.js';
import { buildDeck } from '../quiz-gen.js';
import { readParams, studySetup } from './study.js';

/** これ以上横に動かしたらスワイプとみなす（px） */
const SWIPE_THRESHOLD = 80;
/** 横方向の操作として扱い始める距離（px） */
const DRAG_START = 10;

export function renderCards() {
  const root = h('div', { class: 'page' });

  const setup = () => {
    const { scope, mode } = readParams();
    clear(root);
    root.append(studySetup({ kind: 'cards', scope, mode, onStart: start }));
    window.scrollTo(0, 0);
  };

  /**
   * @param {import('../quiz-gen.js').Scope} sc
   * @param {import('../quiz-gen.js').Mode} md
   */
  const start = (sc, md) => {
    const store = getStore();
    const deck = buildDeck(store, sc, md, getProgress(), today());
    if (!deck.length) return;
    let i = 0;
    let known = 0;

    const showCard = () => {
      clear(root);
      const t = deck[i];
      let flipped = false;
      let done = false;
      const appNames = t.apps.map((a) => store.appById.get(a.appId)?.name).filter(Boolean);

      const front = h('div', { class: 'card-face card-front' }, categoryBadge(t.category), h('p', { class: 'card-title' }, t.title), h('p', { class: 'card-hint' }, 'タップでめくる'));
      const back = h(
        'div',
        { class: 'card-face card-back', hidden: true },
        h('p', { class: 'card-back-title' }, t.title),
        h('p', { class: 'card-summary' }, plain(t.summary)),
        h('p', { class: 'card-apps' }, appNames.length ? `使ったアプリ：${appNames.join('、')}` : '使ったアプリ：なし'),
      );
      const card = h('div', { class: 'flashcard', 'aria-live': 'polite' }, front, back);

      const flipBtn = h('button', { type: 'button', class: 'btn btn-primary btn-block', onclick: () => flip() }, 'めくる');
      const answerRow = h(
        'div',
        { class: 'card-answers', hidden: true },
        h('button', { type: 'button', class: 'btn btn-block card-no', onclick: () => answer(false) }, '← まだ'),
        h('button', { type: 'button', class: 'btn btn-primary btn-block card-yes', onclick: () => answer(true) }, '覚えた →'),
      );

      const flip = () => {
        if (done) return;
        flipped = !flipped;
        front.hidden = flipped;
        back.hidden = !flipped;
        flipBtn.hidden = flipped;
        answerRow.hidden = !flipped;
        card.classList.toggle('is-back', flipped);
      };

      /** @param {boolean} ok */
      const answer = (ok) => {
        if (done || !flipped) return;
        done = true;
        recordAnswer([t.id], ok, today());
        if (ok) known++;
        card.classList.add(ok ? 'fly-right' : 'fly-left');
        setTimeout(nextCard, prefersReducedMotion() ? 0 : 180);
      };

      // ---- スワイプ（Pointer Events） ----
      /** @type {{id: number, x: number, y: number, dragging: boolean, dx: number} | null} */
      let drag = null;
      card.addEventListener('pointerdown', (e) => {
        if (!e.isPrimary || done) return;
        drag = { id: e.pointerId, x: e.clientX, y: e.clientY, dragging: false, dx: 0 };
      });
      card.addEventListener('pointermove', (e) => {
        if (!drag || e.pointerId !== drag.id) return;
        const dx = e.clientX - drag.x;
        const dy = e.clientY - drag.y;
        if (!drag.dragging) {
          if (Math.abs(dx) < DRAG_START || Math.abs(dx) < Math.abs(dy)) return;
          drag.dragging = true;
          card.classList.add('dragging');
          card.setPointerCapture(e.pointerId);
        }
        drag.dx = dx;
        // 表面ではめくるまで答えられないので、少しだけ動かして戻す
        const shown = flipped ? dx : dx / 4;
        card.style.transform = `translateX(${shown}px) rotate(${shown / 30}deg)`;
        card.classList.toggle('lean-right', flipped && dx > SWIPE_THRESHOLD);
        card.classList.toggle('lean-left', flipped && dx < -SWIPE_THRESHOLD);
      });
      const endDrag = (/** @type {PointerEvent} */ e, cancelled = false) => {
        if (!drag || e.pointerId !== drag.id) return;
        const { dragging, dx } = drag;
        drag = null;
        card.style.transform = '';
        card.classList.remove('lean-right', 'lean-left', 'dragging');
        if (cancelled) return;
        if (!dragging) {
          flip(); // タップ
          return;
        }
        if (flipped && Math.abs(dx) >= SWIPE_THRESHOLD) answer(dx > 0);
      };
      card.addEventListener('pointerup', (e) => endDrag(e));
      card.addEventListener('pointercancel', (e) => endDrag(e, true));

      root.append(
        h('div', { class: 'quiz-progress' }, h('span', {}, `${i + 1} / ${deck.length}`), h('span', { class: 'muted small' }, '裏面で 右へスワイプ＝覚えた／左へ＝まだ')),
        h('progress', { class: 'quiz-bar', max: String(deck.length), value: String(i) }),
        card,
        flipBtn,
        answerRow,
        h('a', { href: `#/topic/${encodeURIComponent(t.id)}`, class: 'more' }, `「${t.title}」の詳細を見る`),
      );
      window.scrollTo(0, 0);
    };

    const nextCard = () => {
      i++;
      if (i < deck.length) showCard();
      else finish();
    };

    const finish = () => {
      clear(root);
      root.append(
        h('p', { class: 'result-score' }, `${deck.length} 枚中 ${known} 枚を「覚えた」`),
        h('p', { class: 'muted' }, '「まだ」にしたカードは、明日の「今日の復習」に出てきます。'),
        h('button', { type: 'button', class: 'btn btn-primary btn-block', onclick: () => start(sc, md) }, '同じ条件でもう一度'),
        h('button', { type: 'button', class: 'btn btn-block', onclick: setup }, '条件を変える'),
      );
      window.scrollTo(0, 0);
    };

    showCard();
  };

  setup();
  show({ title: 'フラッシュカード', tab: 'learn', back: '#/learn', node: root });
}

function prefersReducedMotion() {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
}
