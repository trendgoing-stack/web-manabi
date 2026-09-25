// Service Worker：アプリ本体、data/ の JSON、js/demos/ のモジュールをキャッシュファーストで返し、
// 一度開けば電波がなくても全機能（外部リンクを除く）が動くようにする。
//
// ★ アプリやデータを更新したら VERSION を必ず上げる（上げないと利用者に届かない）。
//   js/config.js の APP_VERSION と同じ値にする。ファイルを増やしたり減らしたりしたら SHELL も直す
//   （node tools/validate-cli.mjs で漏れを確認できる）。手順は README.md を参照。
//
// - 別のオリジンへのリクエスト（GoatCounter への送信など）には介入しない（キャッシュせず、そのまま通す）
// - tools/ 以下（検証ページなど）はキャッシュしない
// - パスはすべて sw.js の場所からの相対パスなので、サブパス（/web-manabi/）でもそのまま動く
const VERSION = '1.1.0';
const CACHE_PREFIX = 'webmanabi-';
const CACHE = `${CACHE_PREFIX}v${VERSION}`;

const SHELL = [
  './',
  './index.html',
  './manifest.json',
  './count.js',
  './css/app.css',
  './icons/icon-180.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/icon.svg',
  './js/analytics.js',
  './js/clipboard.js',
  './js/config.js',
  './js/data.js',
  './js/date.js',
  './js/demos/canvas-resize.js',
  './js/demos/pointer-draw.js',
  './js/demos/random-compare.js',
  './js/demos/web-audio-beep.js',
  './js/demos/web-share-text.js',
  './js/leitner.js',
  './js/main.js',
  './js/normalize.js',
  './js/pwa.js',
  './js/quiz-gen.js',
  './js/router.js',
  './js/search.js',
  './js/status.js',
  './js/storage.js',
  './js/types.js',
  './js/ui/appearance.js',
  './js/ui/badges.js',
  './js/ui/dialog.js',
  './js/ui/dom.js',
  './js/ui/popup.js',
  './js/ui/rich.js',
  './js/ui/shell.js',
  './js/ui/snippet.js',
  './js/ui/toast.js',
  './js/views/apps.js',
  './js/views/cards.js',
  './js/views/category.js',
  './js/views/learn.js',
  './js/views/my.js',
  './js/views/not-found.js',
  './js/views/quiz.js',
  './js/views/search.js',
  './js/views/settings.js',
  './js/views/study.js',
  './js/views/topic.js',
];
/** data/ のうち、meta.json のカテゴリ定義によらず決まっているファイル */
const DATA_FIXED = ['./data/meta.json', './data/apps.json', './data/glossary.json', './data/quiz.json'];

const ROOT = new URL('./', self.location.href);
const TOOLS = new URL('./tools/', ROOT).href;

/** HTTP キャッシュを通さずに取得する（古いファイルと新しいファイルが混ざらないように） */
const fresh = (url) => new Request(url, { cache: 'reload' });

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      await cache.addAll([...SHELL, ...DATA_FIXED].map(fresh));
      // 技術項目のファイルは meta.json のカテゴリ定義から決める（カテゴリを足してもここを直さなくてよい）
      const meta = await (await cache.match('./data/meta.json')).json();
      const topicFiles = (meta.categories ?? []).map((c) => `./data/topics/${c.id}.json`);
      await cache.addAll(topicFiles.map(fresh));
    })(),
  );
  // すぐには切り替えない（画面の「更新があります」をタップしてもらう）
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k.startsWith(CACHE_PREFIX) && k !== CACHE).map((k) => caches.delete(k)));
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // 別のオリジン（GoatCounter など）と、tools/ 以下には介入しない
  if (url.origin !== self.location.origin) return;
  if (url.href.startsWith(TOOLS)) return;

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE);
      // 画面の表示は、いつもキャッシュ済みの index.html を返す（#/topic/… はハッシュなのでサーバーには関係ない）
      const cached = req.mode === 'navigate' ? await cache.match('./index.html') : await cache.match(req, { ignoreSearch: true });
      if (cached) return cached;
      return fetch(req);
    })(),
  );
});
