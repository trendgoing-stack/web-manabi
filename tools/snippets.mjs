// コード抜粋（snippet）の作成と点検。参照用フォルダでは読み取り専用の git コマンドだけを使う。
//
//   node tools/snippets.mjs extract <参照用フォルダ>/<repo> <file> <startLine> <endLine> [lang]
//     … HEAD のコミット済みの内容から抜粋して、snippet の JSON を表示する
//   node tools/snippets.mjs check <参照用フォルダ>
//     … data/ の全 snippet について、HEAD のコミット済みの内容で同じ行が同じ内容か
//        （そのままでよいか、commitSha を更新してよいか、見直しが必要か）を表示する
//   node tools/snippets.mjs update <参照用フォルダ>
//     … check の結果、HEAD でも同じ行が同じ内容の snippet だけ commitSha を HEAD に書き換える
//
// 使う git コマンド（読み取り専用）：rev-parse HEAD、status --porcelain、show HEAD:<file>、remote get-url origin
// 未コミットの変更があるリポジトリでは何もしない。

import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const MAX_LINES = 15;

/** @param {string} dir @param {string[]} args */
const git = (dir, args) => execFileSync('git', ['-C', dir, ...args], { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });

/** @param {string} dir */
function assertClean(dir) {
  const status = git(dir, ['status', '--porcelain']).trim();
  if (status) {
    console.error(`✖ ${dir} に未コミットの変更があります。作業を止めて作者に報告してください。\n${status}`);
    process.exit(2);
  }
}

/** @param {string} dir */
function repoName(dir) {
  const url = git(dir, ['remote', 'get-url', 'origin']).trim();
  return basename(url).replace(/\.git$/, '');
}

/**
 * HEAD のコミット済みの内容から行を取り出す
 * @param {string} dir
 * @param {'HEAD'} rev
 * @param {string} file
 * @param {number} start
 * @param {number} end
 */
function lines(dir, rev, file, start, end) {
  const text = git(dir, ['show', `${rev}:${file}`]).replace(/\r\n/g, '\n');
  return text.split('\n').slice(start - 1, end).join('\n');
}

const EXT_LANG = { js: 'js', mjs: 'js', ts: 'ts', tsx: 'tsx', css: 'css', html: 'html', json: 'json', yml: 'yaml', yaml: 'yaml', md: 'md' };

const [cmd, ...args] = process.argv.slice(2);

if (cmd === 'extract') {
  const [dir, file, s, e, langArg] = args;
  const start = Number(s);
  const end = Number(e);
  if (!dir || !file || !Number.isInteger(start) || !Number.isInteger(end) || end < start) {
    console.error('使い方: node tools/snippets.mjs extract <repoDir> <file> <startLine> <endLine> [lang]');
    process.exit(1);
  }
  if (end - start + 1 > MAX_LINES) {
    console.error(`✖ ${end - start + 1} 行あります。${MAX_LINES} 行以内にしてください。`);
    process.exit(1);
  }
  assertClean(dir);
  const commitSha = git(dir, ['rev-parse', 'HEAD']).trim();
  const lang = langArg || EXT_LANG[file.split('.').pop() ?? ''] || 'text';
  const code = lines(dir, 'HEAD', file, start, end);
  console.log(JSON.stringify({ repo: repoName(dir), snippet: { file, startLine: start, endLine: end, commitSha, lang, code } }, null, 2));
} else if (cmd === 'check' || cmd === 'update') {
  const [sources] = args;
  if (!sources) {
    console.error(`使い方: node tools/snippets.mjs ${cmd} <参照用フォルダ>`);
    process.exit(1);
  }
  const apps = JSON.parse(readFileSync(join(ROOT, 'data', 'apps.json'), 'utf8'));
  const meta = JSON.parse(readFileSync(join(ROOT, 'data', 'meta.json'), 'utf8'));
  /** @type {Map<string, string>} repo → HEAD */
  const heads = new Map();
  let problems = 0;
  let updated = 0;
  for (const c of meta.categories) {
    const path = join(ROOT, 'data', 'topics', `${c.id}.json`);
    const data = JSON.parse(readFileSync(path, 'utf8'));
    let changed = false;
    for (const t of data.topics) {
      for (const use of t.apps) {
        const sn = use.snippet;
        if (!sn) continue;
        const app = apps.find((a) => a.id === use.appId);
        const dir = join(sources, app.repo);
        if (!heads.has(app.repo)) {
          assertClean(dir);
          heads.set(app.repo, git(dir, ['rev-parse', 'HEAD']).trim());
        }
        const head = heads.get(app.repo);
        const label = `${t.id} / ${app.id}（${sn.file}#L${sn.startLine}-L${sn.endLine}）`;
        let atHead = null;
        try {
          atHead = lines(dir, 'HEAD', sn.file, sn.startLine, sn.endLine);
        } catch {
          /* HEAD にファイルがない */
        }
        if (atHead !== sn.code) {
          console.log(`▲ ${label}：HEAD の内容と code が一致しません。行番号と code を見直してください`);
          problems++;
        } else if (sn.commitSha === head) {
          console.log(`✓ ${label}：HEAD と同じコミットで、内容も一致しています`);
        } else if (cmd === 'update') {
          sn.commitSha = head;
          changed = true;
          updated++;
          console.log(`↑ ${label}：commitSha を ${head.slice(0, 7)} に更新しました`);
        } else {
          console.log(`△ ${label}：HEAD（${head.slice(0, 7)}）でも同じ内容です。update で commitSha を更新できます`);
        }
      }
    }
    if (changed) writeFileSync(path, JSON.stringify(data, null, 2) + '\n');
  }
  if (cmd === 'update') console.log(`\n${updated} 件の commitSha を更新しました。`);
  if (problems) console.log(`\n見直しが必要な snippet が ${problems} 件あります。`);
  process.exit(problems ? 1 : 0);
} else {
  console.error('使い方: node tools/snippets.mjs extract|check|update ...（ファイル先頭のコメントを参照）');
  process.exit(1);
}
