// 設定に応じた見た目（文字サイズ）

import { getSettings } from '../storage.js';

export function applyFontSize() {
  document.documentElement.dataset.fontSize = getSettings().fontSize;
}
