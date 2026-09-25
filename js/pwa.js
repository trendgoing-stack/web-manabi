// Service Worker の登録と、更新の通知。
// 新しい版の sw.js が見つかるとインストールまで済ませて待機させ、
// 「更新があります（タップで再読み込み）」をタップされたら切り替えて再読み込みする。

import { h } from './ui/dom.js';

export function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  // 手元での開発中はキャッシュされると編集が反映されないので、localhost では ?sw を付けたときだけ登録する
  if (location.hostname === 'localhost' && !new URLSearchParams(location.search).has('sw')) return;
  // タップ後に新しい Service Worker へ切り替わったら 1 回だけ再読み込みする
  // （初めてインストールしたときの clients.claim() では再読み込みしない）
  let updateRequested = false;
  let reloading = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!updateRequested || reloading) return;
    reloading = true;
    location.reload();
  });

  navigator.serviceWorker
    .register('./sw.js', { scope: './' })
    .then((reg) => {
      /** @param {ServiceWorker} worker */
      const notify = (worker) => {
        if (document.getElementById('update-banner')) return;
        const btn = h(
          'button',
          {
            type: 'button',
            id: 'update-banner',
            class: 'banner banner-update',
            onclick: () => {
              updateRequested = true;
              btn.setAttribute('disabled', '');
              btn.textContent = '更新しています…';
              worker.postMessage({ type: 'SKIP_WAITING' });
            },
          },
          '更新があります（タップで再読み込み）',
        );
        document.getElementById('banners')?.prepend(btn);
      };

      if (reg.waiting && navigator.serviceWorker.controller) notify(reg.waiting);
      reg.addEventListener('updatefound', () => {
        const w = reg.installing;
        if (!w) return;
        w.addEventListener('statechange', () => {
          // すでに動いている Service Worker がある＝更新。初めてのインストールでは出さない
          if (w.state === 'installed' && navigator.serviceWorker.controller) notify(w);
        });
      });

      // ホーム画面のアプリは開きっぱなしになりやすいので、表示に戻ったときにも更新を確かめる
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') reg.update().catch(() => {});
      });
    })
    .catch(() => {
      /* 登録できない環境（http で開いたときなど）では、キャッシュなしで動かす */
    });
}
