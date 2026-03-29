/**
 * Tab shell for results screen — wires sub-components.
 */
(function (global) {
  'use strict';

  var currentData = null;

  function activate(tab) {
    var nav = document.querySelectorAll('.result-tab-btn');
    var panels = document.querySelectorAll('.result-tab-panel');
    nav.forEach(function (b) {
      var on = b.getAttribute('data-tab') === tab;
      b.classList.toggle('on', on);
      b.setAttribute('aria-selected', on ? 'true' : 'false');
    });
    panels.forEach(function (p) {
      p.classList.toggle('hidden', p.getAttribute('data-panel') !== tab);
    });
  }

  function mount(sessionData) {
    currentData = sessionData;
    var O = global.TypeFlowResultsOverview;
    var K = global.TypeFlowResultsKeys;
    var W = global.TypeFlowResultsWords;
    var S = global.TypeFlowResultsSpeed;

    var po = document.getElementById('panel-overview');
    var pk = document.getElementById('panel-keys');
    var pw = document.getElementById('panel-words');
    var ps = document.getElementById('panel-speed');

    if (O && po) O.render(po, sessionData);
    if (K && pk) K.render(pk, sessionData);
    if (W && pw) W.render(pw, sessionData);
    if (S && ps) S.render(ps, sessionData);

    activate('overview');

    var root = document.getElementById('result-tabs-root');
    if (root && !root._bound) {
      root._bound = true;
      root.addEventListener('click', function (e) {
        var btn = e.target.closest('.result-tab-btn');
        if (!btn) return;
        activate(btn.getAttribute('data-tab'));
      });
    }
  }

  global.TypeFlowResultsUI = { mount: mount, activate: activate };
})(typeof window !== 'undefined' ? window : globalThis);
