// 本文のインライン記法を DOM にする。使える記法は 3 種類だけ：
//   [[用語]]  … 用語集へのリンク（タップでポップアップ）
//   `コード`  … 等幅
//   **太字**  … 太字
// 段落の区切りは空行（\n\n）。入れ子には対応しない。

import { h } from './dom.js';
import { getStore } from '../data.js';
import { openGlossary } from './popup.js';

const TOKEN = /\[\[([^\]\n]+?)\]\]|`([^`\n]+)`|\*\*([^*\n]+?)\*\*/g;

/**
 * 1 段落ぶん（改行を含まない想定。単独の \n は改行として扱う）
 * @param {string} text
 * @returns {DocumentFragment}
 */
export function inline(text) {
  const frag = document.createDocumentFragment();
  const src = String(text ?? '');
  let last = 0;
  for (const m of src.matchAll(TOKEN)) {
    if (m.index > last) pushText(frag, src.slice(last, m.index));
    if (m[1] != null) frag.appendChild(termLink(m[1]));
    else if (m[2] != null) frag.appendChild(h('code', {}, m[2]));
    else frag.appendChild(h('strong', {}, m[3]));
    last = m.index + m[0].length;
  }
  if (last < src.length) pushText(frag, src.slice(last));
  return frag;
}

/**
 * 記法の記号を取り除いた文字列（一覧の要約など、リンクの中に入れる場所で使う）
 * @param {string} text
 */
export function plain(text) {
  return String(text ?? '').replace(TOKEN, (_, term, code, bold) => term ?? code ?? bold);
}

/**
 * 段落に分けて <p> を並べる
 * @param {string} text
 * @param {string} [cls]
 */
export function paragraphs(text, cls) {
  const frag = document.createDocumentFragment();
  for (const para of String(text ?? '').split(/\n{2,}/)) {
    if (para.trim()) frag.appendChild(h('p', { class: cls }, inline(para.trim())));
  }
  return frag;
}

/**
 * @param {DocumentFragment} frag
 * @param {string} s
 */
function pushText(frag, s) {
  const lines = s.split('\n');
  lines.forEach((line, i) => {
    if (i > 0) frag.appendChild(h('br'));
    if (line) frag.appendChild(document.createTextNode(line));
  });
}

/** @param {string} term */
function termLink(term) {
  if (!getStore().glossaryByTerm.has(term)) return document.createTextNode(term);
  return h('button', { type: 'button', class: 'term', onclick: () => openGlossary(term) }, term);
}
