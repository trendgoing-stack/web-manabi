// localStorage の読み書きはすべてここを通す（画面側から localStorage を直接さわらない）。
// キーは webmanabi: で始める。同じ github.io の下のほかのアプリと保存場所を共有しているため、
// 全削除のときも webmanabi: で始まるキーだけを消す。

import { DEFAULT_SETTINGS } from './config.js';
import { isYmd } from './date.js';

const PREFIX = 'webmanabi:';
export const STORAGE_SCHEMA = 1;
export const HISTORY_MAX = 50;
export const NOTE_MAX_LENGTH = 2000;
/** メモ全体の目安（JSON にしたときの文字数） */
export const NOTES_SOFT_LIMIT = 1_000_000;
/** エクスポート・インポートの対象 */
const DATA_KEYS = /** @type {const} */ (['favorites', 'history', 'notes', 'progress', 'settings']);

/**
 * @typedef {{id: string, at: string}} HistoryItem
 * @typedef {{text: string, updatedAt: string}} Note
 * @typedef {{box: number, due: string, correct: number, wrong: number}} Progress
 */

/** @type {((message: string) => void) | null} */
let onWriteError = null;

/**
 * 書き込み失敗（容量超過など）の通知先を登録する
 * @param {(message: string) => void} fn
 */
export function setWriteErrorHandler(fn) {
  onWriteError = fn;
}

/**
 * @param {string} key
 * @param {any} fallback
 */
function read(key, fallback) {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    return raw == null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
}

/**
 * @param {string} key
 * @param {any} value
 * @param {boolean} [notify] 失敗したときにトーストを出すか
 * @returns {boolean} 保存できたか
 */
function write(key, value, notify = true) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
    return true;
  } catch {
    if (notify) onWriteError?.('保存できませんでした（端末の保存容量が不足している可能性があります）');
    return false;
  }
}

/** @param {string} key */
function remove(key) {
  try {
    localStorage.removeItem(PREFIX + key);
  } catch {
    /* 無視 */
  }
}

/** 起動時に 1 回呼ぶ。schema を記録する */
export function initStorage() {
  if (read('schema', null) == null) write('schema', STORAGE_SCHEMA, false);
}

// ---------- 設定 ----------

/** @returns {import('./types.js').Settings} */
export function getSettings() {
  const saved = read('settings', {});
  return { ...DEFAULT_SETTINGS, ...(saved && typeof saved === 'object' ? saved : {}) };
}

/**
 * @template {keyof import('./types.js').Settings} K
 * @param {K} key
 * @param {import('./types.js').Settings[K]} value
 */
export function setSetting(key, value) {
  const s = getSettings();
  s[key] = value;
  return write('settings', s);
}

// ---------- お気に入り（配列の順序＝並び順） ----------

/** @returns {string[]} */
export function getFavorites() {
  const v = read('favorites', []);
  return Array.isArray(v) ? v.filter((x) => typeof x === 'string') : [];
}

/** @param {string} id */
export function isFavorite(id) {
  return getFavorites().includes(id);
}

/**
 * 追加／解除を切り替える（追加は末尾）
 * @param {string} id
 * @returns {boolean} 切り替え後にお気に入りか
 */
export function toggleFavorite(id) {
  const list = getFavorites();
  const i = list.indexOf(id);
  if (i >= 0) list.splice(i, 1);
  else list.push(id);
  write('favorites', list);
  return i < 0;
}

/**
 * 並べ替え（delta = -1 で 1 つ上、+1 で 1 つ下）
 * @param {string} id
 * @param {number} delta
 */
export function moveFavorite(id, delta) {
  const list = getFavorites();
  const i = list.indexOf(id);
  const j = i + delta;
  if (i < 0 || j < 0 || j >= list.length) return;
  [list[i], list[j]] = [list[j], list[i]];
  write('favorites', list);
}

// ---------- 閲覧履歴（新しい順、最新 50 件） ----------

/** @returns {HistoryItem[]} */
export function getHistory() {
  const v = read('history', []);
  return Array.isArray(v) ? v.filter(isHistoryItem) : [];
}

/** @param {string} id */
export function addHistory(id) {
  const list = getHistory().filter((h) => h.id !== id);
  list.unshift({ id, at: new Date().toISOString() });
  write('history', list.slice(0, HISTORY_MAX), false);
}

export function clearHistory() {
  write('history', []);
}

// ---------- メモ（項目ごとに 1 件） ----------

/** @returns {Record<string, Note>} */
export function getNotes() {
  const v = read('notes', {});
  if (!v || typeof v !== 'object' || Array.isArray(v)) return {};
  /** @type {Record<string, Note>} */
  const out = {};
  for (const [k, n] of Object.entries(v)) if (isNote(n)) out[k] = n;
  return out;
}

/** @param {string} id */
export function getNote(id) {
  return getNotes()[id]?.text ?? '';
}

/**
 * 空文字なら削除する
 * @param {string} id
 * @param {string} text
 * @returns {boolean} 保存できたか
 */
export function setNote(id, text) {
  const notes = getNotes();
  const t = text.slice(0, NOTE_MAX_LENGTH);
  if (t.trim()) notes[id] = { text: t, updatedAt: new Date().toISOString() };
  else delete notes[id];
  return write('notes', notes);
}

/** メモ全体の大きさ（JSON の文字数） */
export function notesSize() {
  return JSON.stringify(getNotes()).length;
}

// ---------- 学習記録（フェーズ3で使う） ----------

/** @returns {Record<string, Progress>} */
export function getProgress() {
  const v = read('progress', {});
  if (!v || typeof v !== 'object' || Array.isArray(v)) return {};
  /** @type {Record<string, Progress>} */
  const out = {};
  for (const [k, p] of Object.entries(v)) if (isProgress(p)) out[k] = p;
  return out;
}

// ---------- 形のチェック ----------

/** @param {any} v */
function isHistoryItem(v) {
  return v && typeof v.id === 'string' && typeof v.at === 'string';
}
/** @param {any} v */
function isNote(v) {
  return v && typeof v.text === 'string' && v.text.length <= NOTE_MAX_LENGTH && typeof v.updatedAt === 'string';
}
/** @param {any} v */
function isProgress(v) {
  const nat = (/** @type {any} */ n) => Number.isInteger(n) && n >= 0;
  return v && Number.isInteger(v.box) && v.box >= 1 && v.box <= 5 && isYmd(v.due) && nat(v.correct) && nat(v.wrong);
}
/** @param {any} v */
function isPlainObject(v) {
  return v != null && typeof v === 'object' && !Array.isArray(v);
}

/**
 * インポートするデータの形を確かめる。1 か所でもおかしければエラーの文を返す。
 * @param {any} file
 * @returns {string | null}
 */
export function checkExportFile(file) {
  if (!isPlainObject(file) || file.app !== 'web-manabi') return 'Webまなび帳のエクスポートファイルではありません。';
  if (!Number.isInteger(file.schemaVersion)) return 'スキーマのバージョンがありません。';
  if (file.schemaVersion > STORAGE_SCHEMA) return 'このアプリより新しいバージョンで作られたファイルです。アプリを更新してから読み込んでください。';
  const d = file.data;
  if (!isPlainObject(d)) return 'データがありません。';
  if (d.favorites != null && (!Array.isArray(d.favorites) || d.favorites.some((x) => typeof x !== 'string'))) return 'お気に入りの形式が正しくありません。';
  if (d.history != null && (!Array.isArray(d.history) || !d.history.every(isHistoryItem))) return '閲覧履歴の形式が正しくありません。';
  if (d.notes != null && (!isPlainObject(d.notes) || !Object.values(d.notes).every(isNote))) return 'メモの形式が正しくありません（1件 2000 文字まで）。';
  if (d.progress != null && (!isPlainObject(d.progress) || !Object.values(d.progress).every(isProgress))) return '学習記録の形式が正しくありません。';
  if (d.settings != null) {
    const s = d.settings;
    if (!isPlainObject(s)) return '設定の形式が正しくありません。';
    if (s.fontSize != null && !['normal', 'large'].includes(s.fontSize)) return '設定（文字サイズ）の値が正しくありません。';
    for (const k of ['showUnverified', 'analyticsOff']) if (s[k] != null && typeof s[k] !== 'boolean') return `設定（${k}）の値が正しくありません。`;
  }
  return null;
}

// ---------- エクスポート・インポート・全削除 ----------

export function exportData() {
  return {
    app: 'web-manabi',
    schemaVersion: STORAGE_SCHEMA,
    exportedAt: new Date().toISOString(),
    data: {
      favorites: getFavorites(),
      history: getHistory(),
      notes: getNotes(),
      progress: getProgress(),
      settings: getSettings(),
    },
  };
}

/**
 * @param {any} file エクスポートファイルを JSON.parse したもの
 * @param {'merge'|'replace'} mode
 * @returns {{ok: true} | {ok: false, error: string}}
 */
export function importData(file, mode) {
  const problem = checkExportFile(file);
  if (problem) return { ok: false, error: problem };
  const d = file.data;
  /** @type {Record<string, any>} */
  const next = {};
  if (mode === 'replace') {
    next.favorites = d.favorites ?? [];
    next.history = (d.history ?? []).slice(0, HISTORY_MAX);
    next.notes = d.notes ?? {};
    next.progress = d.progress ?? {};
    next.settings = { ...DEFAULT_SETTINGS, ...(d.settings ?? {}) };
  } else {
    // 統合：お気に入りは今の並びのあとに足す／履歴とメモは新しい方／学習記録は回答数の多い方／設定は今のまま
    const fav = getFavorites();
    for (const id of d.favorites ?? []) if (!fav.includes(id)) fav.push(id);
    next.favorites = fav;

    const hist = new Map(getHistory().map((h) => [h.id, h]));
    for (const h of d.history ?? []) {
      const cur = hist.get(h.id);
      if (!cur || h.at > cur.at) hist.set(h.id, h);
    }
    next.history = [...hist.values()].sort((a, b) => (a.at < b.at ? 1 : -1)).slice(0, HISTORY_MAX);

    const notes = getNotes();
    for (const [id, n] of Object.entries(d.notes ?? {})) {
      if (!notes[id] || n.updatedAt > notes[id].updatedAt) notes[id] = n;
    }
    next.notes = notes;

    const prog = getProgress();
    for (const [id, p] of Object.entries(d.progress ?? {})) {
      const cur = prog[id];
      if (!cur || p.correct + p.wrong > cur.correct + cur.wrong) prog[id] = p;
    }
    next.progress = prog;
  }

  // 途中で失敗したら、書き込む前の状態に戻す
  /** @type {Record<string, string | null>} */
  const backup = {};
  try {
    for (const k of DATA_KEYS) backup[k] = localStorage.getItem(PREFIX + k);
  } catch {
    return { ok: false, error: '保存データを読み込めませんでした。' };
  }
  for (const k of Object.keys(next)) {
    if (!write(k, next[k], false)) {
      for (const [bk, bv] of Object.entries(backup)) {
        try {
          if (bv == null) localStorage.removeItem(PREFIX + bk);
          else localStorage.setItem(PREFIX + bk, bv);
        } catch {
          /* 戻せなくても続ける */
        }
      }
      return { ok: false, error: '保存できませんでした（端末の保存容量が不足している可能性があります）。何も変更していません。' };
    }
  }
  return { ok: true };
}

/** このアプリのデータだけをすべて消す（同じオリジンのほかのアプリのデータは消さない） */
export function clearAll() {
  try {
    const keys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(PREFIX)) keys.push(k);
    }
    for (const k of keys) localStorage.removeItem(k);
  } catch {
    /* 消せなくても続ける */
  }
  for (const k of DATA_KEYS) remove(k);
  initStorage();
}
