// 検索用の正規化：NFKC → 英字は小文字 → カタカナはひらがな → 空白の連続は 1 つ。

/**
 * @param {string} s
 * @returns {string}
 */
export function normalize(s) {
  return String(s ?? '')
    .normalize('NFKC')
    .toLowerCase()
    // ァ(U+30A1)〜ヶ(U+30F6) を ぁ(U+3041)〜ゖ(U+3096) へ
    .replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60))
    .replace(/\s+/g, ' ')
    .trim();
}
