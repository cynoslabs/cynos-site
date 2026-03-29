/**
 * Results tab: Keyboard heatmap + slowest keys.
 */
(function (global) {
  'use strict';

  var ROWS = [
    ['`', '1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-', '=', 'bksp'],
    ['tab', 'q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p', '[', ']', '\\'],
    ['caps', 'a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', ';', "'", 'enter'],
    ['shift', 'z', 'x', 'c', 'v', 'b', 'n', 'm', ',', '.', '/', 'shift2'],
    ['ctrl', 'alt', 'space', 'alt2', 'ctrl2'],
  ];

  /** Interpolate neutral gray → deep crimson by error rate */
  function heatColor(rate) {
    var t = Math.min(1, Math.max(0, rate));
    var gray = Math.round(52 + (1 - t) * 48);
    var red = Math.round(45 + t * 95);
    return 'rgb(' + red + ',' + gray + ',' + gray + ')';
  }

  function esc(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function labelFor(k) {
    var map = {
      bksp: '⌫',
      tab: 'Tab',
      enter: '↵',
      shift: '⇧',
      shift2: '⇧',
      ctrl: 'Ctrl',
      ctrl2: 'Ctrl',
      alt: 'Alt',
      alt2: 'Alt',
      space: 'Space',
    };
    return map[k] || k.toUpperCase();
  }

  /**
   * @param {object} data — errRates: { key: 0..1 }, slowestKeys: [{key, avgMs}]
   */
  function render(el, data) {
    if (!el) return;
    var rates = data.errRates || {};
    var slow = data.slowestKeys || [];

    var kb = '<div class="hm-keyboard" role="img" aria-label="Mapa de calor do teclado">';
    ROWS.forEach(function (row) {
      kb += '<div class="hm-row">';
      row.forEach(function (k) {
        var rate = typeof rates[k] === 'number' ? rates[k] : 0;
        var bg = heatColor(rate);
        kb +=
          '<div class="hm-key" style="background:' +
          bg +
          '" data-k="' +
          esc(k) +
          '" title="' +
          esc(k) +
          ' · erros ' +
          Math.round(rate * 100) +
          '%"><span>' +
          esc(labelFor(k)) +
          '</span></div>';
      });
      kb += '</div>';
    });
    kb += '</div>';

    var slowHtml =
      '<div class="hm-slow"><span class="hm-slow-title">3 teclas mais lentas</span><ul class="hm-slow-list">';
    for (var i = 0; i < Math.min(3, slow.length); i++) {
      slowHtml +=
        '<li><strong>' +
        esc(String(slow[i].key).toUpperCase()) +
        '</strong> · ' +
        Math.round(slow[i].avgMs) +
        ' ms méd.</li>';
    }
    if (!slow.length) slowHtml += '<li>—</li>';
    slowHtml += '</ul></div>';

    el.innerHTML =
      '<p class="tab-hint">Cores do cinza ao carmesim escuro conforme taxa de erro por tecla.</p>' + kb + slowHtml;
  }

  global.TypeFlowResultsKeys = { render: render };
})(typeof window !== 'undefined' ? window : globalThis);
