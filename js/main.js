// 起動：データを読み込み、画面の枠とルーターを準備する。

import { loadStore } from './data.js';
import { initStorage, setWriteErrorHandler } from './storage.js';
import { startRouter } from './router.js';
import { h } from './ui/dom.js';
import { initShell } from './ui/shell.js';
import { toast } from './ui/toast.js';
import { applyFontSize } from './ui/appearance.js';
import { renderSearch } from './views/search.js';
import { renderCategory } from './views/category.js';
import { renderTopic } from './views/topic.js';
import { renderApps, renderApp } from './views/apps.js';
import { renderLearn, renderGlossary } from './views/learn.js';
import { renderMy, renderFavorites, renderHistory, renderNotesList, renderStats } from './views/my.js';
import { renderQuiz } from './views/quiz.js';
import { renderCards } from './views/cards.js';
import { renderSettings, renderHelp } from './views/settings.js';
import { renderNotFound } from './views/not-found.js';
import { registerServiceWorker } from './pwa.js';
import { startAnalytics } from './analytics.js';

async function boot() {
  initStorage();
  registerServiceWorker();
  setWriteErrorHandler((msg) => toast(msg, 5000));
  applyFontSize();
  initShell();

  const store = await loadStore();
  if (store.failed.length) {
    document.getElementById('banners')?.append(
      h('div', { class: 'banner banner-warn', role: 'alert' }, `一部のデータを読み込めませんでした：${store.failed.join('、')}`),
    );
  }

  // ハッシュがなければ「探す」を開く（履歴は増やさない）
  if (!/^#\/./.test(location.hash)) history.replaceState(null, '', '#/search');

  startRouter(
    [
      { pattern: /^search$/, render: renderSearch },
      { pattern: /^category\/([^/]+)$/, render: ([id]) => renderCategory(id) },
      { pattern: /^topic\/([^/]+)$/, render: ([id]) => renderTopic(id) },
      { pattern: /^apps$/, render: renderApps },
      { pattern: /^app\/([^/]+)$/, render: ([id]) => renderApp(id) },
      { pattern: /^learn$/, render: renderLearn },
      { pattern: /^learn\/glossary$/, render: renderGlossary },
      { pattern: /^my$/, render: renderMy },
      { pattern: /^my\/favorites$/, render: renderFavorites },
      { pattern: /^my\/history$/, render: renderHistory },
      { pattern: /^my\/notes$/, render: renderNotesList },
      { pattern: /^my\/stats$/, render: renderStats },
      { pattern: /^learn\/quiz$/, render: renderQuiz },
      { pattern: /^learn\/cards$/, render: renderCards },
      { pattern: /^settings$/, render: renderSettings },
      { pattern: /^help$/, render: renderHelp },
    ],
    () => renderNotFound(),
  );
  startAnalytics();
}

boot().catch(() => {
  const view = document.getElementById('view');
  if (view) view.textContent = '起動できませんでした。ページを再読み込みしてください。';
});
