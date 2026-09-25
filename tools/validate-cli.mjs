// データの検証をコマンドで行う（tools/validate.html と同じチェック）。
//   node tools/validate-cli.mjs
// エラーがあれば終了コード 1 を返す。

import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validate } from './validate-core.js';
import { APP_VERSION, FALLBACK_CATEGORIES } from '../js/config.js';
import { today } from '../js/date.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DATA = join(ROOT, 'data');
/** @type {string[]} */
const failed = [];

/** @param {string} path data/ からの相対パス */
function readJson(path) {
  try {
    return JSON.parse(readFileSync(join(DATA, path), 'utf8'));
  } catch {
    failed.push(path);
    return null;
  }
}

const meta = readJson('meta.json');
const categories = Array.isArray(meta?.categories) ? meta.categories : FALLBACK_CATEGORIES;
const raw = {
  meta,
  apps: readJson('apps.json'),
  glossary: readJson('glossary.json'),
  quiz: readJson('quiz.json'),
  topicFiles: categories.map((c) => ({ path: `topics/${c.id}.json`, data: readJson(`topics/${c.id}.json`) })),
  failed,
};
const swPath = join(ROOT, 'sw.js');
const { findings, stats } = validate(raw, {
  today: today(),
  appVersion: APP_VERSION,
  swText: existsSync(swPath) ? readFileSync(swPath, 'utf8') : null,
});

const mark = { error: '✖', warn: '▲', info: '・' };
for (const f of findings) console.log(`${mark[f.level]} [${f.where}] ${f.message}`);
console.log('');
for (const [k, v] of Object.entries(stats)) console.log(`${k}: ${v}`);
const errors = findings.filter((f) => f.level === 'error').length;
const warns = findings.filter((f) => f.level === 'warn').length;
console.log(`\nエラー ${errors} 件、注意 ${warns} 件`);
process.exit(errors ? 1 : 0);
