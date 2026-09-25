// アプリ全体の定数。

/** アプリ本体の版。sw.js の VERSION と同じ値にする（tools/validate.html で確認） */
export const APP_VERSION = '0.3.0';

export const GITHUB_OWNER = 'trendgoing-stack';
export const GIT_MANABI_URL = 'https://trendgoing-stack.github.io/git-manabi/';

/** meta.json が読めなかったときに使うカテゴリ（meta.json と同じ内容） */
export const FALLBACK_CATEGORIES = [
  { id: 'web-api', label: 'Web API', order: 1, reviewDays: 180 },
  { id: 'pwa', label: 'PWA・オフライン', order: 2, reviewDays: 180 },
  { id: 'frontend', label: 'フロントエンド構成', order: 3, reviewDays: 180 },
  { id: 'hosting', label: '公開・ホスティング', order: 4, reviewDays: 180 },
  { id: 'service', label: '外部サービス', order: 5, reviewDays: 180 },
  { id: 'claude-code', label: 'Claude Code・AI開発', order: 6, reviewDays: 90 },
  { id: 'security', label: 'セキュリティ・プライバシー', order: 7, reviewDays: 180 },
];

export const LEVEL_LABELS = { basic: '入門', intermediate: '中級' };

export const LINK_KIND_LABELS = { official: '公式', mdn: 'MDN', caniuse: 'Can I use', other: '参考' };

/**
 * 設定の初期値。
 * showUnverified はフェーズ1〜3の開発中は true。フェーズ4で公開向けに false へ切り替える。
 * @type {import('./types.js').Settings}
 */
export const DEFAULT_SETTINGS = {
  fontSize: 'normal',
  showUnverified: true,
  analyticsOff: false,
};

export const SEARCH_LIMIT = 50;
export const SEARCH_DEBOUNCE_MS = 150;
