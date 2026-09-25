// ハッシュルーティング（#/topic/<id> など）。
// 各履歴エントリの history.state に「アプリ内での深さ」と「スクロール位置」を持たせ、
// 戻る操作で前の画面のスクロール位置に戻れるようにする。

/**
 * @typedef {Object} Route
 * @property {RegExp} pattern ハッシュの '#/' より後ろに当てる
 * @property {(params: string[]) => void} render
 */

/** @type {Route[]} */
let routes = [];
/** @type {() => void} */
let notFound = () => {};
let depth = 0;
let started = false;

/** 現在の画面のスクロール位置を、今の履歴エントリに保存する */
export function saveScroll() {
  try {
    history.replaceState({ ...(history.state ?? {}), depth, scroll: window.scrollY }, '');
  } catch {
    /* replaceState の回数制限などは無視する */
  }
}

/** アプリ内で戻れる画面があるか */
export function canGoBack() {
  return depth > 0;
}

/**
 * 戻る。アプリ内の履歴がなければ fallback に移動する（ホーム画面起動でブラウザの戻るボタンがない場合など）
 * @param {string} fallback
 */
export function goBack(fallback) {
  if (canGoBack()) history.back();
  else navigate(fallback);
}

/** @param {string} hash '#/...' */
export function navigate(hash) {
  if (location.hash === hash) return;
  saveScroll();
  location.hash = hash;
}

/** '#/' より後ろのパス（クエリなし） */
export function currentPath() {
  return decodeURI(location.hash.replace(/^#\/?/, '').split('?')[0]);
}

function handle() {
  const st = history.state;
  let scroll = 0;
  if (st && typeof st.depth === 'number') {
    // 戻る／進むで来た画面
    depth = st.depth;
    scroll = typeof st.scroll === 'number' ? st.scroll : 0;
  } else {
    depth = started ? depth + 1 : 0;
    try {
      history.replaceState({ depth, scroll: 0 }, '');
    } catch {
      /* 無視 */
    }
  }
  started = true;

  const path = currentPath();
  const route = routes.find((r) => r.pattern.test(path));
  if (route) {
    const m = path.match(route.pattern) ?? [];
    route.render(m.slice(1).map((p) => decodeURIComponent(p)));
  } else {
    notFound();
  }
  // 描画が終わってから位置を戻す
  requestAnimationFrame(() => window.scrollTo(0, scroll));
}

/**
 * @param {Route[]} list
 * @param {() => void} onNotFound
 */
export function startRouter(list, onNotFound) {
  routes = list;
  notFound = onNotFound;
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  // アプリ内リンクをタップしたときは、離れる前にスクロール位置を保存する
  document.addEventListener(
    'click',
    (e) => {
      const a = /** @type {Element} */ (e.target)?.closest?.('a[href^="#/"]');
      if (a) saveScroll();
    },
    true,
  );
  window.addEventListener('hashchange', handle);
  handle();
}
