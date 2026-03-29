/**
 * Results tab: Overview (WPM, accuracy, consistency, time).
 * Portuguese UI. English comments only.
 */
(function (global) {
  'use strict';

  function esc(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  /**
   * @param {HTMLElement} el
   * @param {object} data — session snapshot from main
   */
  function render(el, data) {
    if (!el) return;
    var t = data.timeSec != null ? data.timeSec : data.elapsed || 0;
    var c = data.consistency != null ? data.consistency : 0;
    el.innerHTML =
      '<div class="ov-grid">' +
      '<div class="ov-cell"><span class="ov-lbl">WPM</span><span class="ov-val">' +
      esc(data.wpm) +
      '</span></div>' +
      '<div class="ov-cell"><span class="ov-lbl">Precisão</span><span class="ov-val">' +
      esc(data.acc) +
      '%</span></div>' +
      '<div class="ov-cell"><span class="ov-lbl">Consistência</span><span class="ov-val">' +
      esc(c) +
      '%</span></div>' +
      '<div class="ov-cell"><span class="ov-lbl">Tempo</span><span class="ov-val">' +
      formatTime(t) +
      '</span></div>' +
      '</div>' +
      '<p class="ov-sub">WPM bruto (sessão): <strong>' +
      esc(data.rawWpmFinal) +
      '</strong> · WPM correto: <strong>' +
      esc(data.correctWpmFinal) +
      '</strong></p>';
  }

  function formatTime(sec) {
    var s = Math.max(0, Math.floor(sec));
    var m = Math.floor(s / 60);
    s = s % 60;
    return (m ? m + ' min ' : '') + s + ' s';
  }

  global.TypeFlowResultsOverview = { render: render };
})(typeof window !== 'undefined' ? window : globalThis);
