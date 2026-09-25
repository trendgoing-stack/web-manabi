// DOM を組み立てる小さな道具。データ由来の文字列は必ずテキストノードとして入れる（innerHTML は使わない）。

/**
 * @typedef {Node | string | number | null | undefined | false | Child[]} Child
 */

/**
 * h('a', { href: '#/', class: 'link', onclick: fn }, '文字', h('span', {}, '…'))
 * - class / text / dataset は特別扱い。on で始まる関数はイベントとして登録する
 * - 値が null / undefined / false の属性は付けない。true は空の属性にする
 * @param {string} tag
 * @param {Record<string, any>} [props]
 * @param {...Child} children
 * @returns {HTMLElement}
 */
export function h(tag, props, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props ?? {})) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'text') el.textContent = String(v);
    else if (k === 'dataset') Object.assign(el.dataset, v);
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
    else el.setAttribute(k, v === true ? '' : String(v));
  }
  append(el, children);
  return el;
}

/**
 * @param {Node} parent
 * @param {Child[]} children
 */
export function append(parent, children) {
  for (const c of children) {
    if (c == null || c === false) continue;
    if (Array.isArray(c)) append(parent, c);
    else parent.appendChild(typeof c === 'object' ? c : document.createTextNode(String(c)));
  }
}

/** @param {Node} el */
export function clear(el) {
  while (el.firstChild) el.removeChild(el.firstChild);
}

const SVG_NS = 'http://www.w3.org/2000/svg';

/**
 * 固定の SVG アイコン（パスはコード内の定数のみ。データ由来の文字列は入れない）
 * @param {string[]} paths d 属性の配列
 * @param {string} [cls]
 */
export function icon(paths, cls = 'icon') {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('class', cls);
  svg.setAttribute('aria-hidden', 'true');
  for (const d of paths) {
    const p = document.createElementNS(SVG_NS, 'path');
    p.setAttribute('d', d);
    svg.appendChild(p);
  }
  return svg;
}

export const ICONS = {
  external: ['M14 4h6v6', 'M20 4l-9 9', 'M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5'],
  chevron: ['M9 5l7 7-7 7'],
  back: ['M15 5l-7 7 7 7'],
};

/**
 * 外部リンク（新しいタブで開く。外部リンクのアイコン付き）
 * @param {string} label
 * @param {string} url
 * @param {string} [cls]
 */
export function extLink(label, url, cls = 'ext-link') {
  return h(
    'a',
    { href: safeUrl(url), target: '_blank', rel: 'noopener', class: cls },
    h('span', {}, label),
    icon(ICONS.external, 'icon icon-ext'),
    h('span', { class: 'visually-hidden' }, '（外部サイト）'),
  );
}

/**
 * http(s) 以外の URL は使わない
 * @param {string} url
 */
export function safeUrl(url) {
  return /^https?:\/\//.test(String(url)) ? String(url) : '#';
}
