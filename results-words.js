/**
 * Results tab: Top 5 missed words.
 */
(function (global) {
  'use strict';

  function esc(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function render(el, data) {
    if (!el) return;
    var list = data.missedWords || [];
    if (!list.length) {
      el.innerHTML = '<p class="words-empty">Nenhuma palavra errada nesta sessão.</p>';
      return;
    }
    var rows = list
      .slice(0, 5)
      .map(function (item) {
        return (
          '<tr><td class="mw-word">' +
          esc(item.word) +
          '</td><td class="mw-n">' +
          esc(item.count) +
          '</td></tr>'
        );
      })
      .join('');
    el.innerHTML =
      '<table class="mw-table" role="table"><thead><tr><th>Palavra</th><th>Erros</th></tr></thead><tbody>' +
      rows +
      '</tbody></table>';
  }

  global.TypeFlowResultsWords = { render: render };
})(typeof window !== 'undefined' ? window : globalThis);
