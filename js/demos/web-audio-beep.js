// ミニデモ：Web Audio API で効果音をその場で作って鳴らす（音声ファイルは使わない）。
// iOS ではタップの中で AudioContext を作る（または resume する）まで音が出ないため、最初のタップで作る。

import { h } from '../ui/dom.js';

/** @returns {typeof AudioContext | undefined} */
function AudioCtor() {
  return window.AudioContext || /** @type {any} */ (window).webkitAudioContext;
}

export function isSupported() {
  return typeof window !== 'undefined' && !!AudioCtor();
}

/** @param {HTMLElement} root */
export function mount(root) {
  /** @type {AudioContext | null} */
  let ctx = null;

  /** タップのハンドラの中で呼ぶ */
  const audio = () => {
    if (!ctx) ctx = new (/** @type {typeof AudioContext} */ (AudioCtor()))();
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    return ctx;
  };

  /**
   * @param {number} freq 周波数（Hz）
   * @param {number} at 何秒後に鳴らすか
   * @param {number} dur 長さ（秒）
   * @param {OscillatorType} type
   */
  const tone = (freq, at = 0, dur = 0.15, type = 'sine') => {
    const ac = audio();
    const t = ac.currentTime + at;
    const osc = ac.createOscillator();
    const amp = ac.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    // 急に鳴らしたり止めたりすると「プツッ」という雑音が出るので、音量を少しずつ上げ下げする
    amp.gain.setValueAtTime(0.0001, t);
    amp.gain.exponentialRampToValueAtTime(0.2, t + 0.01);
    amp.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(amp).connect(ac.destination);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  };

  root.append(
    h('p', {}, 'ボタンを押すと、音声ファイルを使わずにその場で作った音が鳴ります。音量に注意してください。'),
    h(
      'div',
      { class: 'demo-buttons' },
      h('button', { type: 'button', class: 'btn', onclick: () => tone(880, 0, 0.12, 'square') }, 'ピッ'),
      h('button', { type: 'button', class: 'btn', onclick: () => tone(523, 0, 0.3, 'sine') }, 'ポン'),
      h('button', { type: 'button', class: 'btn', onclick: () => [523, 659, 784].forEach((f, i) => tone(f, i * 0.12, 0.35, 'triangle')) }, 'ド・ミ・ソ'),
    ),
    h('p', { class: 'muted small' }, 'iPhone では、消音モードのときに音が出ないことがあります。'),
  );
  return () => {
    ctx?.close().catch(() => {});
    ctx = null;
  };
}
