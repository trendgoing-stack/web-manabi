// tools/validate.html の画面側。チェックの中身は validate-core.js。

import { validate } from './validate-core.js';
import { loadRaw } from '../js/data.js';
import { APP_VERSION } from '../js/config.js';
import { today } from '../js/date.js';

const LABEL = { error: 'エラー', warn: '注意', info: '情報' };

/**
 * @param {string} tag
 * @param {string} [text]
 * @param {string} [cls]
 */
function el(tag, text = '', cls = '') {
  const e = document.createElement(tag);
  e.textContent = text;
  if (cls) e.className = cls;
  return e;
}

async function fetchText(url) {
  try {
    const res = await fetch(url, { cache: 'no-store' });
    return res.ok ? await res.text() : null;
  } catch {
    return null;
  }
}

async function run() {
  const raw = await loadRaw('../data/');
  const { findings, stats } = validate(raw, { today: today(), appVersion: APP_VERSION, swText: await fetchText('../sw.js') });

  const errors = findings.filter((f) => f.level === 'error').length;
  const warns = findings.filter((f) => f.level === 'warn').length;
  const summary = document.getElementById('summary');
  summary.textContent = `エラー ${errors} 件、注意 ${warns} 件（${new Date().toLocaleTimeString('ja-JP')} にチェック）`;
  summary.className = `summary ${errors ? 'ng' : 'ok'}`;

  const dl = document.getElementById('stats');
  dl.replaceChildren();
  for (const [k, v] of Object.entries(stats)) dl.append(el('dt', k), el('dd', String(v)));

  const tbody = document.getElementById('rows');
  tbody.replaceChildren();
  const order = { error: 0, warn: 1, info: 2 };
  for (const f of [...findings].sort((a, b) => order[a.level] - order[b.level])) {
    const tr = document.createElement('tr');
    tr.append(el('td', LABEL[f.level], f.level), el('td', f.where), el('td', f.message));
    tbody.append(tr);
  }
  if (!findings.length) {
    const tr = document.createElement('tr');
    const td = el('td', '問題は見つかりませんでした。');
    td.colSpan = 3;
    tr.append(td);
    tbody.append(tr);
  }
}

document.getElementById('run').addEventListener('click', run);
run();
