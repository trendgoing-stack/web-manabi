// コード抜粋の表示。等幅で表示し、横に長い行は抜粋部分だけ横スクロールする。シンタックスハイライトはしない。

import { h, extLink } from './dom.js';
import { toast } from './toast.js';
import { copyText } from '../clipboard.js';
import { GITHUB_OWNER } from '../config.js';

/**
 * 固定リンク（記載したコミットの、記載した行）
 * @param {string} repo
 * @param {import('../types.js').Snippet} s
 */
export function permalink(repo, s) {
  return `https://github.com/${GITHUB_OWNER}/${repo}/blob/${s.commitSha}/${encodePath(s.file)}#L${s.startLine}-L${s.endLine}`;
}

/**
 * 最新版へのリンク（main ブランチ）
 * @param {string} repo
 * @param {import('../types.js').Snippet} s
 */
export function latestLink(repo, s) {
  return `https://github.com/${GITHUB_OWNER}/${repo}/blob/main/${encodePath(s.file)}`;
}

/** @param {string} path */
function encodePath(path) {
  return path.split('/').map(encodeURIComponent).join('/');
}

/**
 * @param {import('../types.js').App} app
 * @param {import('../types.js').Snippet} s
 */
export function renderSnippet(app, s) {
  const code = h('code', {}, s.code);
  const pre = h('pre', { class: 'snippet-code', tabindex: '0', 'aria-label': `${s.file} の ${s.startLine}〜${s.endLine} 行目` }, code);
  const status = h('span', { class: 'snippet-status', role: 'status', 'aria-live': 'polite' });

  const copyBtn = h(
    'button',
    {
      type: 'button',
      class: 'btn btn-small',
      // タップのハンドラの中で同期的にコピーを始める（await を挟まない）
      onclick: () => {
        copyText(s.code, {
          selectEl: code,
          onSuccess: () => {
            status.textContent = 'コピーしました';
            toast('コピーしました');
          },
          onManual: () => {
            status.textContent = '選択した部分を手動でコピーしてください';
            toast('コピーできませんでした。選択した部分を手動でコピーしてください', 5000);
          },
        });
      },
    },
    'コピー',
  );

  return h(
    'figure',
    { class: 'snippet' },
    h(
      'figcaption',
      { class: 'snippet-head' },
      h('span', { class: 'snippet-file' }, s.file, h('span', { class: 'snippet-lines' }, ` L${s.startLine}–${s.endLine}`)),
      copyBtn,
    ),
    pre,
    h(
      'div',
      { class: 'snippet-foot' },
      status,
      h(
        'div',
        { class: 'snippet-links' },
        extLink(`この行を GitHub で見る（${s.commitSha.slice(0, 7)}）`, permalink(app.repo, s)),
        extLink('最新版を見る', latestLink(app.repo, s)),
      ),
      h('p', { class: 'muted small' }, `コミット ${s.commitSha.slice(0, 7)} 時点のコードです。最新版とは異なる場合があります。`),
    ),
  );
}
