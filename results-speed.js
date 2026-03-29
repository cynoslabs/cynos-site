/**
 * Results tab: Line chart Raw WPM vs Correct WPM over test duration.
 */
(function (global) {
  'use strict';

  var ro = null;

  function render(el, data) {
    if (!el) return;
    el.innerHTML =
      '<div class="sp-chart-wrap"><canvas class="sp-canvas" id="sp-wpm-canvas" aria-label="Gráfico WPM"></canvas></div>' +
      '<div class="sp-legend"><span class="sp-lg raw">WPM bruto</span><span class="sp-lg net">WPM correto</span></div>';

    var cv = el.querySelector('#sp-wpm-canvas');
    if (!cv) return;

    function draw() {
      var timeline = data.wpmTimeline || [];
      var parent = el.querySelector('.sp-chart-wrap');
      var W = parent ? parent.clientWidth || 320 : 320;
      var H = Math.min(220, Math.max(140, Math.round(window.innerHeight * 0.22)));
      var dpr = window.devicePixelRatio || 1;
      cv.width = W * dpr;
      cv.height = H * dpr;
      cv.style.width = W + 'px';
      cv.style.height = H + 'px';
      var ctx = cv.getContext('2d');
      ctx.scale(dpr, dpr);
      ctx.fillStyle = '#0a0a0a';
      ctx.fillRect(0, 0, W, H);

      if (timeline.length < 2) {
        ctx.fillStyle = '#5c5955';
        ctx.font = '12px DM Sans, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Dados insuficientes (sessão muito curta).', W / 2, H / 2);
        return;
      }

      var rawSeries = timeline.map(function (p) {
        return p.rawWpm;
      });
      var netSeries = timeline.map(function (p) {
        return p.correctWpm;
      });
      var maxV = Math.max.apply(null, rawSeries.concat(netSeries).concat([10]));
      var padL = 36;
      var padR = 8;
      var padT = 10;
      var padB = 22;
      var cw = W - padL - padR;
      var ch = H - padT - padB;

      ctx.strokeStyle = '#2a2a2a';
      ctx.lineWidth = 1;
      [0, 0.5, 1].forEach(function (f) {
        var y = padT + ch - f * ch;
        ctx.beginPath();
        ctx.moveTo(padL, y);
        ctx.lineTo(padL + cw, y);
        ctx.stroke();
        ctx.fillStyle = '#5c5955';
        ctx.font = '9px JetBrains Mono, monospace';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(Math.round(f * maxV)), padL - 4, y);
      });

      function line(series, color) {
        ctx.beginPath();
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.lineJoin = 'round';
        series.forEach(function (v, i) {
          var x = padL + (i / (series.length - 1)) * cw;
          var y = padT + ch - (v / maxV) * ch;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        ctx.stroke();
      }

      line(rawSeries, '#888888');
      line(netSeries, '#cc2222');

      ctx.fillStyle = '#5c5955';
      ctx.font = '9px DM Sans, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText('0s', padL, padT + ch + 4);
      ctx.fillText(Math.round(data.timeSec || timeline.length) + 's', padL + cw, padT + ch + 4);
    }

    draw();
    if (ro) ro.disconnect();
    ro = new ResizeObserver(function () {
      draw();
    });
    ro.observe(el.querySelector('.sp-chart-wrap'));
    window.addEventListener('orientationchange', draw);
  }

  global.TypeFlowResultsSpeed = { render: render };
})(typeof window !== 'undefined' ? window : globalThis);
