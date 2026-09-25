// アクセス解析（GoatCounter）。アプリを起動したときに 1 回だけ送る。
// - count.js はリポジトリに同梱したものを読み込む（外部の CDN は使わない）
// - 送るパスとタイトルは固定。ハッシュ（#/topic/… など）、検索語、項目の id、メモは送らない。リファラーも送らない
// - 設定で「送信しない」を選んでいるときは count.js を読み込まない
// - オフラインなどで失敗しても何もしない（エラーも表示しない）
// - localhost で開いたときは count.js 側が送信しない

import { getSettings } from './storage.js';

const ENDPOINT = 'https://km-apps.goatcounter.com/count';
const SETTINGS = { path: '/web-manabi/', title: 'Webまなび帳', referrer: '' };

export function startAnalytics() {
  if (getSettings().analyticsOff) return;
  const s = document.createElement('script');
  s.src = './count.js';
  s.async = true;
  s.dataset.goatcounter = ENDPOINT;
  s.dataset.goatcounterSettings = JSON.stringify(SETTINGS);
  s.onerror = () => {};
  document.head.append(s);
}
