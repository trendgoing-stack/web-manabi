// 日付はすべて端末のローカル日付（YYYY-MM-DD の文字列）で扱う。UTC には変換しない。

const pad = (n) => String(n).padStart(2, '0');

/** @param {Date} d */
export function toYmd(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** 今日（ローカル日付） */
export function today() {
  return toYmd(new Date());
}

/** @param {string} s */
export function isYmd(s) {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const [y, m, d] = s.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d;
}

/**
 * ローカルの 0 時の Date を作る
 * @param {string} ymd
 */
function parse(ymd) {
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/**
 * ymd に n 日足した日付
 * @param {string} ymd
 * @param {number} n
 */
export function addDays(ymd, n) {
  const d = parse(ymd);
  d.setDate(d.getDate() + n);
  return toYmd(d);
}

/**
 * b − a の日数（夏時間などで 1 日が 24 時間でない地域でもずれないよう四捨五入する）
 * @param {string} a
 * @param {string} b
 */
export function daysBetween(a, b) {
  return Math.round((parse(b).getTime() - parse(a).getTime()) / 86400000);
}
