// localStorage の読み書きはすべてここを通す（画面側から localStorage を直接さわらない）。
// キーは webmanabi: で始める。データの形が変わったときのために schema を保存しておく。

import { DEFAULT_SETTINGS } from './config.js';

const PREFIX = 'webmanabi:';
export const STORAGE_SCHEMA = 1;

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
 * @returns {boolean} 保存できたか
 */
function write(key, value) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
    return true;
  } catch {
    onWriteError?.('保存できませんでした（端末の保存容量が不足している可能性があります）');
    return false;
  }
}

/** 起動時に 1 回呼ぶ。schema を記録する */
export function initStorage() {
  if (read('schema', null) == null) write('schema', STORAGE_SCHEMA);
}

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
