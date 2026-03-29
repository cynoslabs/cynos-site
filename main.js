/**
 * TypeFlow — core application (state machine, typing engine, OTG input).
 * UI strings: Portuguese (PT-BR). Comments: English.
 */
(function () {
  'use strict';

  /** @enum {string} */
  var AppState = {
    IDLE: 'IDLE',
    TYPING: 'TYPING',
    RESULT: 'RESULT',
    STATS: 'STATS',
  };

  var state = AppState.IDLE;

  function transitionTo(next) {
    state = next;
  }

  function getState() {
    return state;
  }

  // —— Word banks (common) —— //
  var WORDS = {
    pt: [
      'gato', 'cachorro', 'casa', 'carro', 'mesa', 'porta', 'janela', 'livro', 'cama', 'sofá',
      'prato', 'faca', 'garfo', 'colher', 'xícara', 'caneta', 'papel', 'lápis', 'cadeira', 'chão',
      'teto', 'muro', 'grade', 'parede', 'escada', 'caixa', 'saco', 'bolsa', 'mochila', 'sapato',
      'camisa', 'calça', 'saia', 'boné', 'luva', 'relógio', 'óculos', 'chapéu', 'cinturão', 'meias',
      'café', 'leite', 'pão', 'bolo', 'arroz', 'feijão', 'sopa', 'maçã', 'laranja', 'uva',
      'comer', 'beber', 'correr', 'andar', 'falar', 'ouvir', 'ver', 'sentir', 'pensar', 'saber',
      'escola', 'cidade', 'bairro', 'rua', 'praça', 'parque', 'praia', 'campo', 'floresta', 'montanha',
      'grande', 'pequeno', 'alto', 'baixo', 'rápido', 'lento', 'bonito', 'feio', 'novo', 'velho',
      'hoje', 'amanhã', 'ontem', 'semana', 'mês', 'ano', 'hora', 'minuto', 'segundo', 'dia',
    ],
    en: [
      'cat', 'dog', 'house', 'car', 'table', 'door', 'window', 'book', 'bed', 'sofa',
      'plate', 'knife', 'fork', 'spoon', 'cup', 'pen', 'paper', 'pencil', 'chair', 'floor',
      'eat', 'drink', 'run', 'walk', 'talk', 'listen', 'see', 'feel', 'think', 'know',
      'school', 'city', 'street', 'park', 'beach', 'forest', 'river', 'ocean', 'airport', 'market',
      'big', 'small', 'tall', 'short', 'fast', 'slow', 'good', 'bad', 'new', 'old',
      'today', 'tomorrow', 'yesterday', 'week', 'month', 'year', 'hour', 'minute', 'second', 'night',
    ],
    code: [
      'git', 'npm', 'ssh', 'curl', 'grep', 'sudo', 'bash', 'vim', 'node', 'yarn',
      'python', 'docker', 'linux', 'nginx', 'mysql', 'redis', 'react', 'const', 'let', 'var',
    ],
  };

  /** Short JS snippets — each string is one typing unit */
  var JS_SNIPPETS = [
    'const x = 0;',
    'let i = 0;',
    'return null;',
    'export default x;',
    'async function run() {}',
    'await fetch(url);',
    'arr.map((n) => n * 2)',
    'Object.keys(obj)',
    'useState(0)',
    'useEffect(() => {}, [])',
    'className="btn"',
    'onClick={handler}',
    'try { } catch (e) {}',
    'if (!ok) return;',
    'for (let i = 0; i < n; i++)',
    'Math.floor(Math.random() * n)',
    'document.querySelector("#id")',
    'addEventListener("keydown", fn)',
    'JSON.stringify(data)',
    'Promise.all(tasks)',
    'module.exports = x',
  ];

  /** XP thresholds (cumulative total XP) — internal */
  var XP_PATENTS = [
    { id: 'recruit', minXp: 0, labelPt: 'Recruta' },
    { id: 'operative', minXp: 500, labelPt: 'Operativo' },
    { id: 'specialist', minXp: 2500, labelPt: 'Especialista' },
    { id: 'architect', minXp: 10000, labelPt: 'Arquiteto' },
    { id: 'titan', minXp: 50000, labelPt: 'Titã Cynos' },
  ];

  function patentFromXp(totalXp) {
    var tier = XP_PATENTS[0];
    for (var i = 0; i < XP_PATENTS.length; i++) {
      if (totalXp >= XP_PATENTS[i].minXp) tier = XP_PATENTS[i];
    }
    return tier;
  }

  function nextPatentXp(totalXp) {
    for (var i = 0; i < XP_PATENTS.length; i++) {
      if (totalXp < XP_PATENTS[i].minXp) return XP_PATENTS[i].minXp;
    }
    return null;
  }

  function xpForSession(wpm, totalWords) {
    return Math.max(0, Math.floor(wpm * 2 + totalWords * 4));
  }

  var G = {
    mode: 1,
    dur: 60,
    lang: 'pt',
    training: 'common',
    hardcore: false,
    focus: false,
    muted: false,
    tactileEnabled: true,

    words: [],
    idx: 0,
    typed: '',

    totalKeys: 0,
    correctKeys: 0,
    errKeys: {},
    keyCorrect: {},
    correctWords: 0,
    wrongWords: 0,
    streak: 0,
    maxStreak: 0,
    wpmSnaps: [],
    wpmTimeline: [],
    wordMissCounts: {},
    interKeyByKey: {},
    lastKeyTime: null,

    elapsed: 0,
    timerID: null,
    started: false,
    lastSessionXp: 0,
  };

  function beep(t) {
    if (G.muted || !window.CynosAudio) return;
    try {
      if (t === 'err') {
        CynosAudio.thud();
        return;
      }
      CynosAudio.tone(t);
    } catch (_) {}
  }

  function playTactile() {
    if (G.muted || !G.tactileEnabled || !window.CynosAudio) return;
    try {
      var pack = CynosStorage.getAll().activeSoundPack || 'default';
      CynosAudio.tactile(pack);
    } catch (_) {}
  }

  var KB_ROWS = [
    ['`', '1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-', '=', '⌫|w20'],
    ['Tab|w15', 'q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p', '[', ']', '\\|w15'],
    ['Caps|w20', 'a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', ';', "'", '↵|w20'],
    ['Shift|w25', 'z', 'x', 'c', 'v', 'b', 'n', 'm', ',', '.', '/', 'Shift|w175'],
    ['Ctrl|w15', 'Alt|w15', 'Space|sp', 'Alt|w15', 'Ctrl|w15'],
  ];
  var KM = {};
  var _nextKeyEl = null;

  function buildKb() {
    var vkb = document.getElementById('vkb');
    if (!vkb) return;
    vkb.innerHTML = '';
    KB_ROWS.forEach(function (row) {
      var rowEl = document.createElement('div');
      rowEl.className = 'kb-row';
      row.forEach(function (k) {
        var parts = k.split('|');
        var lbl = parts[0];
        var cls = parts[1];
        var el = document.createElement('div');
        el.className = 'key' + (cls ? ' ' + cls : '');
        el.textContent = lbl;
        var key = lbl.toLowerCase();
        if (!KM[key]) KM[key] = [];
        KM[key].push(el);
        rowEl.appendChild(el);
      });
      vkb.appendChild(rowEl);
    });
  }

  function hlKey(k, on) {
    var map = {
      ' ': 'space',
      Backspace: '⌫',
      Enter: '↵',
      Shift: 'shift',
      Control: 'ctrl',
      Alt: 'alt',
      Tab: 'tab',
      CapsLock: 'caps',
    };
    var key = map[k] || k.toLowerCase();
    (KM[key] || []).forEach(function (el) {
      el.classList.toggle('hit', on);
    });
  }

  function showNextKey(word, pos) {
    if (_nextKeyEl) {
      _nextKeyEl.forEach(function (el) {
        el.classList.remove('next-key');
      });
      _nextKeyEl = null;
    }
    if (!word || pos >= word.length) return;
    function norm(s) {
      return s
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();
    }
    var ch = norm(word[pos]);
    var mapChar = ch === ' ' ? 'space' : ch;
    var els = KM[mapChar];
    if (els && els.length) {
      els.forEach(function (el) {
        el.classList.add('next-key');
      });
      _nextKeyEl = els;
    }
  }

  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i];
      a[i] = a[j];
      a[j] = t;
    }
    return a;
  }

  function buildPool() {
    var base;
    if (G.training === 'javascript') {
      base = shuffle(JS_SNIPPETS.slice());
    } else if (G.lang === 'mix') {
      var pt = shuffle(WORDS.pt.slice());
      var en = shuffle(WORDS.en.slice());
      base = [];
      var len = Math.max(pt.length, en.length);
      for (var i = 0; i < len; i++) {
        if (i < pt.length) base.push(pt[i]);
        if (i < en.length) base.push(en[i]);
      }
    } else {
      base = (WORDS[G.lang] || WORDS.pt).slice();
    }
    var pool = [];
    while (pool.length < 300) pool = pool.concat(shuffle(base));
    return pool.slice(0, 300);
  }

  function norm(s) {
    return s
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
  }

  function pushWpmSample() {
    var t = G.elapsed;
    if (t < 1) return;
    var rawWpm = Math.round((G.totalKeys / 5) / (t / 60));
    var correctWpm = Math.round((G.correctKeys / 5) / (t / 60));
    var last = G.wpmTimeline[G.wpmTimeline.length - 1];
    if (last && last.t === t) G.wpmTimeline.pop();
    G.wpmTimeline.push({ t: t, rawWpm: rawWpm, correctWpm: correctWpm });
  }

  function startTimer() {
    G.started = true;
    G.timerID = setInterval(function () {
      G.elapsed++;
      if (G.elapsed % 10 === 0) G.wpmSnaps.push(calcWPM());
      pushWpmSample();
      if (G.dur > 0) {
        var rem = G.dur - G.elapsed;
        if (rem <= 5 && rem > 0) beep('tick');
        if (rem <= 0) {
          endSession();
          return;
        }
      }
      renderTimer();
      renderLiveStats();
    }, 1000);
  }

  function stopTimer() {
    clearInterval(G.timerID);
    G.timerID = null;
  }

  function renderTimer() {
    var el = document.getElementById('g-timer');
    var bar = document.getElementById('g-progress');
    if (!el || !bar) return;
    if (G.dur > 0) {
      var rem = Math.max(0, G.dur - G.elapsed);
      el.textContent = String(rem);
      var pct = (rem / G.dur) * 100;
      bar.style.width = pct + '%';
      el.className = 'timer-num' + (rem <= 5 ? ' warn' : '');
      bar.className = 'timer-fill' + (rem <= 10 ? ' warn' : '');
    } else {
      el.textContent = String(G.elapsed);
      bar.style.width = '0%';
      el.className = 'timer-num';
    }
  }

  function calcWPM() {
    if (G.elapsed < 1) return 0;
    return Math.round(G.correctWords / (G.elapsed / 60));
  }

  function calcAcc() {
    if (!G.totalKeys) return 100;
    return Math.round((G.correctKeys / G.totalKeys) * 100);
  }

  function renderLiveStats() {
    var w = document.getElementById('g-wpm');
    var a = document.getElementById('g-acc');
    var s = document.getElementById('g-streak');
    if (w) w.textContent = calcWPM() || '—';
    if (a) a.textContent = G.totalKeys ? calcAcc() + '%' : '—';
    if (s) s.textContent = String(G.streak);
  }

  function loadNewWord() {
    var word = G.words[G.idx] || '';
    var wordEl = document.getElementById('cur-word');
    var queueEl = document.getElementById('queue');
    if (!wordEl) return;
    wordEl.className = 'cur-word';
    void wordEl.offsetWidth;
    wordEl.className = 'cur-word word-in';
    wordEl.innerHTML = '';
    for (var i = 0; i < word.length; i++) {
      var sp = document.createElement('span');
      sp.textContent = word[i];
      wordEl.appendChild(sp);
    }
    if (queueEl) {
      queueEl.innerHTML = '';
      for (var j = G.idx + 1; j <= G.idx + 5 && j < G.words.length; j++) {
        var qw = document.createElement('span');
        qw.className = 'q-word';
        qw.textContent = G.words[j];
        queueEl.appendChild(qw);
      }
    }
    var typedEl = document.getElementById('typed-bar');
    if (typedEl) {
      typedEl.innerHTML = '';
      var caret = document.createElement('span');
      caret.className = 'caret';
      typedEl.appendChild(caret);
    }
    if (G.mode === 1 || G.mode === 3) showNextKey(word, 0);
  }

  function updateDisplay() {
    var word = G.words[G.idx] || '';
    var wordEl = document.getElementById('cur-word');
    var typedEl = document.getElementById('typed-bar');
    if (!wordEl || !typedEl) return;
    var chars = wordEl.querySelectorAll('span');
    chars.forEach(function (s, i) {
      if (i < G.typed.length) {
        s.className = norm(G.typed[i]) === norm(word[i]) ? 'c-ok' : 'c-err';
      } else {
        s.className = i === G.typed.length ? '' : 'c-dim';
      }
    });
    var extras = wordEl.querySelectorAll('.c-extra');
    extras.forEach(function (e) {
      e.remove();
    });
    for (var k = word.length; k < G.typed.length; k++) {
      var ex = document.createElement('span');
      ex.className = 'c-err c-extra';
      ex.textContent = G.typed[k];
      wordEl.appendChild(ex);
    }
    typedEl.innerHTML = '';
    for (var t = 0; t < G.typed.length; t++) {
      var ts = document.createElement('span');
      var isOk = t < word.length && norm(G.typed[t]) === norm(word[t]);
      ts.className = 'c ' + (isOk ? 'ok' : 'err');
      ts.textContent = G.typed[t];
      typedEl.appendChild(ts);
    }
    var caret = document.createElement('span');
    caret.className = 'caret';
    typedEl.appendChild(caret);
    if (G.mode === 1 || G.mode === 3) showNextKey(word, G.typed.length);
  }

  function handleKey(key) {
    if (!G.started && key.length === 1) startTimer();

    var word = G.words[G.idx] || '';

    if (key === 'Escape') {
      endSession();
      return;
    }
    if (key === 'Tab') {
      restartTypingSession();
      return;
    }
    if (key === ' ' || key === 'Enter') {
      if (G.typed.length > 0) submitWord();
      return;
    }
    if (key === 'Backspace') {
      if (G.hardcore) {
        beep('err');
        return;
      }
      if (G.typed.length > 0) {
        G.typed = G.typed.slice(0, -1);
        updateDisplay();
      }
      return;
    }
    if (key.length !== 1) return;

    var pos = G.typed.length;
    var expected = pos < word.length ? word[pos] : null;
    var ok = expected !== null && norm(key) === norm(expected);
    var nk = norm(key);

    if (G.lastKeyTime != null && key.length === 1) {
      var dt = performance.now() - G.lastKeyTime;
      if (!G.interKeyByKey[nk]) G.interKeyByKey[nk] = [];
      G.interKeyByKey[nk].push(dt);
    }
    G.lastKeyTime = performance.now();

    playTactile();

    G.totalKeys++;
    if (ok) {
      G.correctKeys++;
      var ek = norm(expected);
      G.keyCorrect[ek] = (G.keyCorrect[ek] || 0) + 1;
    } else {
      var errKey = expected ? norm(expected) : '?';
      G.errKeys[errKey] = (G.errKeys[errKey] || 0) + 1;
      beep('err');
    }
    G.typed += key;
    updateDisplay();
    renderLiveStats();
  }

  function submitWord() {
    var word = G.words[G.idx];
    var wordEl = document.getElementById('cur-word');
    var correct = norm(G.typed.trim()) === norm(word);

    if (correct) {
      G.correctWords++;
      G.streak++;
      if (G.streak > G.maxStreak) G.maxStreak = G.streak;
      beep('ok');
      if (G.streak > 0 && G.streak % 10 === 0) {
        beep('streak');
        toast('🔥 ' + G.streak + ' em sequência!');
      }
      if (wordEl) wordEl.classList.add('ok');
    } else {
      G.wrongWords++;
      G.streak = 0;
      G.wordMissCounts[word] = (G.wordMissCounts[word] || 0) + 1;
      beep('err');
      shakeBody();
      if (wordEl) wordEl.classList.add('err');
    }

    G.typed = '';
    G.idx++;
    if (G.idx >= G.words.length - 20) {
      G.words.push.apply(G.words, buildPool().slice(0, 80));
    }
    renderLiveStats();
    setTimeout(function () {
      if (wordEl) wordEl.classList.remove('ok', 'err');
      loadNewWord();
    }, 420);
  }

  function skipWord() {
    G.typed = '';
    G.idx++;
    if (G.idx >= G.words.length - 20) G.words.push.apply(G.words, buildPool().slice(0, 80));
    loadNewWord();
    renderLiveStats();
  }

  function resetGameState() {
    G.words = buildPool();
    G.idx = 0;
    G.typed = '';
    G.totalKeys = 0;
    G.correctKeys = 0;
    G.errKeys = {};
    G.keyCorrect = {};
    G.correctWords = 0;
    G.wrongWords = 0;
    G.streak = 0;
    G.maxStreak = 0;
    G.wpmSnaps = [];
    G.wpmTimeline = [];
    G.wordMissCounts = {};
    G.interKeyByKey = {};
    G.lastKeyTime = null;
    G.elapsed = 0;
    G.started = false;
    stopTimer();
  }

  /** Full restart while staying on game screen (Tab) */
  function restartTypingSession() {
    stopTimer();
    resetGameState();
    var gt = document.getElementById('g-timer');
    var gp = document.getElementById('g-progress');
    if (gt) {
      gt.textContent = G.dur > 0 ? String(G.dur) : '0';
      gt.className = 'timer-num';
    }
    if (gp) {
      gp.style.width = '100%';
      gp.className = 'timer-fill';
    }
    document.getElementById('g-wpm').textContent = '—';
    document.getElementById('g-acc').textContent = '—';
    document.getElementById('g-streak').textContent = '0';
    loadNewWord();
    refocus();
    toast('Sessão reiniciada');
  }

  function getPlayerNameValue() {
    var inp = document.getElementById('player-name');
    return (inp && inp.value.trim()) || CynosStorage.getPlayerName() || '';
  }

  function startSession() {
    var nameInp = document.getElementById('player-name');
    var nameReq = document.getElementById('name-req');
    var nameVal = nameInp ? nameInp.value.trim() : '';

    if (!nameVal) {
      if (nameInp) {
        nameInp.classList.remove('error');
        void nameInp.offsetWidth;
        nameInp.classList.add('error');
      }
      if (nameReq) nameReq.classList.add('show');
      if (nameInp) nameInp.focus();
      return;
    }
    if (nameInp) nameInp.classList.remove('error');
    if (nameReq) nameReq.classList.remove('show');

    CynosStorage.setPlayerName(nameVal);
    updateNameUI();

    resetGameState();

    var badge = document.getElementById('g-badge');
    var badgeMap = {
      1: ['m1', '🎯 Sem Olhar'],
      2: ['m2', '⚡ Velocidade'],
      3: ['m3', '🔥 Híbrido'],
    };
    var bm = badgeMap[G.mode];
    if (badge && bm) {
      badge.className = 'g-badge ' + bm[0];
      badge.textContent = bm[1];
    }

    var kbWrap = document.getElementById('kb-wrap');
    var m1tip = document.getElementById('m1-tip');
    if (kbWrap) kbWrap.style.display = G.mode === 1 || G.mode === 3 ? '' : 'none';
    if (m1tip) m1tip.classList.toggle('hidden', G.mode === 2);

    var gt = document.getElementById('g-timer');
    var gp = document.getElementById('g-progress');
    if (gt) {
      gt.textContent = G.dur > 0 ? String(G.dur) : '0';
      gt.className = 'timer-num';
    }
    if (gp) {
      gp.style.width = '100%';
      gp.className = 'timer-fill';
    }
    document.getElementById('g-wpm').textContent = '—';
    document.getElementById('g-acc').textContent = '—';
    document.getElementById('g-streak').textContent = '0';

    var accentBadge = document.getElementById('accent-badge');
    if (accentBadge) {
      accentBadge.style.display =
        G.training === 'javascript' ? 'none' : G.lang === 'pt' || G.lang === 'mix' ? '' : 'none';
    }

    showScreen('game');
    loadNewWord();
    refocus();
  }

  function endSession() {
    stopTimer();
    if (!G.wpmSnaps.length || G.wpmSnaps[G.wpmSnaps.length - 1] !== calcWPM()) {
      G.wpmSnaps.push(calcWPM());
    }
    pushWpmSample();
    beep('end');
    showResults();
  }

  var HEATMAP_ROWS = [
    ['`', '1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-', '=', 'bksp'],
    ['tab', 'q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p', '[', ']', '\\'],
    ['caps', 'a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', ';', "'", 'enter'],
    ['shift', 'z', 'x', 'c', 'v', 'b', 'n', 'm', ',', '.', '/', 'shift2'],
    ['ctrl', 'alt', 'space', 'alt2', 'ctrl2'],
  ];

  function buildErrRatesMap() {
    var out = {};
    HEATMAP_ROWS.forEach(function (row) {
      row.forEach(function (k) {
        var err = G.errKeys[k] || 0;
        var ok = G.keyCorrect[k] || 0;
        var tot = err + ok;
        out[k] = tot > 0 ? err / tot : 0;
      });
    });
    return out;
  }

  function buildSlowestKeysList() {
    var arr = [];
    Object.keys(G.interKeyByKey).forEach(function (k) {
      var d = G.interKeyByKey[k];
      if (d.length < 2) return;
      var avg = d.reduce(function (a, b) {
        return a + b;
      }, 0) / d.length;
      arr.push({ key: k, avgMs: avg });
    });
    arr.sort(function (a, b) {
      return b.avgMs - a.avgMs;
    });
    return arr.slice(0, 3);
  }

  function missedWordsTop5() {
    return Object.entries(G.wordMissCounts)
      .sort(function (a, b) {
        return b[1] - a[1];
      })
      .slice(0, 5)
      .map(function (kv) {
        return { word: kv[0], count: kv[1] };
      });
  }

  function consistencyFromTimeline() {
    var raw = G.wpmTimeline.map(function (x) {
      return x.rawWpm;
    });
    if (raw.length < 2) return 100;
    var mean =
      raw.reduce(function (a, b) {
        return a + b;
      }, 0) / raw.length;
    if (mean < 1) return 100;
    var sd = Math.sqrt(
      raw.reduce(function (s, x) {
        return s + (x - mean) * (x - mean);
      }, 0) / raw.length
    );
    return Math.max(0, Math.round(100 * (1 - Math.min(1, sd / mean))));
  }

  function applyPatentUnlocks() {
    var d = CynosStorage.getAll();
    var tier = patentFromXp(d.totalXp);
    var th = d.unlockedThemes.slice();
    var sp = d.unlockedSoundPacks.slice();
    if (tier.id !== 'recruit' && th.indexOf('retro') === -1) th.push('retro');
    if (['specialist', 'architect', 'titan'].indexOf(tier.id) >= 0 && th.indexOf('cynos') === -1) {
      th.push('cynos');
    }
    if (['architect', 'titan'].indexOf(tier.id) >= 0 && sp.indexOf('cherry') === -1) sp.push('cherry');
    if (tier.id === 'titan' && sp.indexOf('typewriter') === -1) sp.push('typewriter');
    d.unlockedThemes = th;
    d.unlockedSoundPacks = sp;
    CynosStorage.save(d);
  }

  function applyBadgesAndMilestones(wpm, acc) {
    var d = CynosStorage.getAll();
    var b = d.badges;
    if (wpm >= 100) b.first100wpm = true;
    if (acc >= 100) b.perfect100acc = true;
    if (d.totalWordsLifetime >= 10000) b.words10k = true;
    d.badges = b;
    CynosStorage.save(d);
  }

  function renderBadgesHome() {
    var d = CynosStorage.getAll();
    var b = d.badges;
    var el = document.getElementById('badges-row');
    if (!el) return;
    var items = [];
    if (b.first100wpm) items.push('<span class="badge-chip" title="Primeiro 100 WPM">100 WPM</span>');
    if (b.perfect100acc) items.push('<span class="badge-chip" title="100% precisão">100% ACC</span>');
    if (b.words10k) items.push('<span class="badge-chip" title="10k palavras">10k PAL</span>');
    el.innerHTML = items.length ? items.join(' ') : '<span class="badge-empty">—</span>';
  }

  function applyThemeFromStorage() {
    var d = CynosStorage.getAll();
    document.body.setAttribute('data-theme', d.activeTheme || 'amoled');
  }

  function syncFocusAmbience() {
    var d = CynosStorage.getAll();
    var mode = document.getElementById('focus-mode-select');
    var m = mode ? mode.value : d.focusAmbienceMode || 'industrial';
    if (!window.CynosAudio) return;
    if (G.muted || !d.focusAmbience) {
      CynosAudio.stopAmbience();
      return;
    }
    CynosAudio.setFocusAmbience(m, true);
  }

  function populateThemeSelectors() {
    var d = CynosStorage.getAll();
    var ts = document.getElementById('theme-select');
    if (ts) {
      ts.innerHTML = '';
      [
        { id: 'amoled', label: 'Amoled Black' },
        { id: 'retro', label: 'Retro Terminal' },
        { id: 'cynos', label: 'Cynos Crimson' },
      ].forEach(function (o) {
        if (d.unlockedThemes.indexOf(o.id) === -1) return;
        var opt = document.createElement('option');
        opt.value = o.id;
        opt.textContent = o.label;
        ts.appendChild(opt);
      });
      ts.value = d.activeTheme || 'amoled';
    }
    var sp = document.getElementById('soundpack-select');
    if (sp) {
      sp.innerHTML = '';
      [
        { id: 'default', label: 'Padrão' },
        { id: 'cherry', label: 'Cherry MX Blue' },
        { id: 'typewriter', label: 'Máquina de escrever' },
      ].forEach(function (o) {
        if (d.unlockedSoundPacks.indexOf(o.id) === -1) return;
        var opt = document.createElement('option');
        opt.value = o.id;
        opt.textContent = o.label;
        sp.appendChild(opt);
      });
      sp.value = d.activeSoundPack || 'default';
    }
    var tact = document.getElementById('tactile-toggle');
    if (tact) tact.checked = d.tactileEnabled !== false;
    var fa = document.getElementById('focus-ambience-toggle');
    if (fa) fa.checked = !!d.focusAmbience;
    var fms = document.getElementById('focus-mode-select');
    if (fms) fms.value = d.focusAmbienceMode || 'industrial';
  }

  function showResults() {
    var wpm = calcWPM();
    var acc = calcAcc();
    var words = G.correctWords + G.wrongWords;
    var Te = Math.max(1, G.elapsed);
    var rawWpmFinal = Math.round((G.totalKeys / 5) / (Te / 60));
    var correctWpmFinal = Math.round((G.correctKeys / 5) / (Te / 60));
    var timeSec = G.dur > 0 ? Math.min(G.dur, G.elapsed) : G.elapsed;
    var consistency = consistencyFromTimeline();

    var xpGain = xpForSession(wpm, words);
    G.lastSessionXp = xpGain;

    document.getElementById('e-wpm').textContent = String(wpm);
    document.getElementById('e-acc').textContent = acc + '%';
    document.getElementById('e-streak').textContent = String(G.maxStreak);
    document.getElementById('e-words').textContent = String(words);
    document.getElementById('e-xp').textContent = '+' + xpGain + ' XP';

    var name = getPlayerNameValue() || 'ANON';

    CynosStorage.pushSession({
      ts: Date.now(),
      wpm: wpm,
      acc: acc,
      mode: G.mode,
      words: words,
      training: G.training,
      hardcore: G.hardcore,
      durationSec: G.dur,
      xpGained: xpGain,
    });

    applyBadgesAndMilestones(wpm, acc);
    applyPatentUnlocks();

    var store = CynosStorage.getAll();
    var tier = patentFromXp(store.totalXp);
    document.getElementById('e-patent').textContent = tier.labelPt;

    var rec = getRec();
    if (wpm > (rec.wpm || 0)) {
      saveRec({ name: name, wpm: wpm, acc: acc });
      document.getElementById('rec-banner').classList.remove('hidden');
    } else {
      document.getElementById('rec-banner').classList.add('hidden');
    }

    var sessionPayload = {
      wpm: wpm,
      acc: acc,
      consistency: consistency,
      timeSec: timeSec,
      elapsed: G.elapsed,
      rawWpmFinal: rawWpmFinal,
      correctWpmFinal: correctWpmFinal,
      errRates: buildErrRatesMap(),
      slowestKeys: buildSlowestKeysList(),
      missedWords: missedWordsTop5(),
      wpmTimeline: G.wpmTimeline.slice(),
    };

    if (window.TypeFlowResultsUI) {
      TypeFlowResultsUI.mount(sessionPayload);
    }

    showScreen('end');
    updatePatentHud();
    renderBadgesHome();
    populateThemeSelectors();
  }

  function escHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function getRec() {
    try {
      return JSON.parse(localStorage.getItem('tf_rec') || '{}');
    } catch (_) {
      return {};
    }
  }

  function saveRec(d) {
    try {
      localStorage.setItem('tf_rec', JSON.stringify(d));
    } catch (_) {}
  }

  function showScreen(name) {
    if (name !== 'game') {
      G.focus = false;
      document.body.classList.remove('focus-mode');
      var gfb = document.getElementById('g-focus');
      if (gfb) gfb.setAttribute('aria-pressed', 'false');
    }

    if (name === 'home') transitionTo(AppState.IDLE);
    else if (name === 'game') transitionTo(AppState.TYPING);
    else if (name === 'end') transitionTo(AppState.RESULT);
    else if (name === 'stats') transitionTo(AppState.STATS);

    var ids = ['home', 'game', 'end', 'stats'];
    ids.forEach(function (id) {
      var el = document.getElementById('s-' + id);
      if (el) el.classList.toggle('hidden', id !== name);
    });
    document.body.classList.toggle('screen-stats', name === 'stats');
    if (name === 'game') {
      refocus();
      syncFocusAmbience();
    }
    if (name !== 'game' && window.CynosAudio) {
      CynosAudio.stopAmbience();
    }
    if (name === 'home') {
      loadRecDisplay();
      updatePatentHud();
      renderBadgesHome();
      populateThemeSelectors();
      applyThemeFromStorage();
    }
    if (name === 'stats') renderStatsDashboard();
  }

  function renderStatsDashboard() {
    var store = CynosStorage.getAll();
    var sessions = store.sessions.slice(-50);
    var chart = document.getElementById('stats-bars');
    var summary = document.getElementById('stats-summary');
    if (!chart) return;

    if (!sessions.length) {
      chart.innerHTML = '<p class="stats-empty">Nenhuma sessão registrada ainda. Complete uma partida!</p>';
      if (summary) summary.textContent = '';
      return;
    }

    var maxWpm = Math.max.apply(
      null,
      sessions.map(function (s) {
        return s.wpm;
      })
    );
    if (maxWpm < 1) maxWpm = 1;

    chart.innerHTML = '';
    sessions.forEach(function (s, i) {
      var h = (s.wpm / maxWpm) * 100;
      var bar = document.createElement('div');
      bar.className = 'stat-bar';
      bar.title = 'WPM ' + s.wpm + ' · ' + new Date(s.ts).toLocaleDateString('pt-BR');
      var fill = document.createElement('div');
      fill.className = 'stat-bar-fill';
      fill.style.height = h + '%';
      bar.appendChild(fill);
      chart.appendChild(bar);
    });

    var avg =
      sessions.reduce(function (a, b) {
        return a + b.wpm;
      }, 0) / sessions.length;
    if (summary) {
      summary.textContent =
        sessions.length +
        ' sessões · média ' +
        Math.round(avg) +
        ' WPM · XP total ' +
        store.totalXp;
    }
  }

  function updatePatentHud() {
    var store = CynosStorage.getAll();
    var tier = patentFromXp(store.totalXp);
    var next = nextPatentXp(store.totalXp);
    var el = document.getElementById('patent-hud');
    if (el) {
      el.textContent = tier.labelPt + ' · ' + store.totalXp + ' XP';
    }
    var bar = document.getElementById('xp-bar-fill');
    if (bar && next !== null) {
      var prevTierXp = tier.minXp;
      var span = next - prevTierXp;
      var cur = store.totalXp - prevTierXp;
      var pct = span > 0 ? Math.min(100, (cur / span) * 100) : 100;
      bar.style.width = pct + '%';
    } else if (bar) {
      bar.style.width = '100%';
    }
  }

  function loadRecDisplay() {
    var r = getRec();
    var row = document.getElementById('rec-row');
    if (row) {
      row.innerHTML = r.wpm
        ? '<div class="rec-chip" style="display:inline-flex;margin-top:8px"><span class="star">★</span>' +
          escHtml(r.name || 'ANON') +
          ' — ' +
          r.wpm +
          ' WPM, ' +
          r.acc +
          '% precisão</div>'
        : '';
    }
    updateNameUI();
  }

  function updateNameUI() {
    var saved = CynosStorage.getPlayerName();
    var chip = document.getElementById('name-chip');
    var inputWrap = document.getElementById('name-input-wrap');
    var chipName = document.getElementById('name-chip-name');
    var chipAvatar = document.getElementById('name-chip-avatar');
    var nameInp = document.getElementById('player-name');
    if (saved) {
      if (chip) chip.style.display = '';
      if (inputWrap) inputWrap.style.display = 'none';
      if (chipName) chipName.textContent = saved;
      if (chipAvatar) chipAvatar.textContent = saved.charAt(0).toUpperCase();
      if (nameInp) nameInp.value = saved;
    } else {
      if (chip) chip.style.display = 'none';
      if (inputWrap) inputWrap.style.display = '';
      if (nameInp) nameInp.value = '';
    }
  }

  function share() {
    var name = getPlayerNameValue() || 'ANON';
    var modeNames = { 1: 'Sem Olhar', 2: 'Velocidade', 3: 'Híbrido' };
    var txt =
      '⌨️ TypeFlow\n👤 ' +
      name +
      ' | Modo: ' +
      modeNames[G.mode] +
      '\n⚡ ' +
      document.getElementById('e-wpm').textContent +
      ' WPM\n🎯 ' +
      document.getElementById('e-acc').textContent +
      ' Precisão\n🔥 Streak ' +
      document.getElementById('e-streak').textContent +
      '\n#TypeFlow';
    if (navigator.share) navigator.share({ title: 'TypeFlow', text: txt }).catch(function () {});
    else if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(txt).then(function () {
        var b = document.getElementById('e-share');
        var prev = b.textContent;
        b.textContent = 'Copiado ✓';
        setTimeout(function () {
          b.textContent = prev;
        }, 2200);
      });
    } else {
      window.prompt('Copie:', txt);
    }
  }

  var trap = document.getElementById('trap');
  function refocus() {
    setTimeout(function () {
      if (trap) trap.focus({ preventScroll: true });
    }, 50);
  }

  var _lastSig = '';
  var _lastKeyTs = 0;

  /**
   * Prefer physical keystrokes: ignore rapid duplicate keydown (repeat) for same key
   * when it fires faster than humanly possible (virtual quirks). Still allow key repeat for Backspace when not hardcore.
   */
  function onKD(e) {
    if (e.isComposing) return;
    /* Block OS key-repeat for actions that would retrigger session control */
    if (getState() === AppState.TYPING && e.repeat && (e.key === 'Tab' || e.key === 'Enter')) return;

    if (getState() === AppState.TYPING) {
      if (['Space', 'Tab', 'Enter'].indexOf(e.code) >= 0) e.preventDefault();
      if (e.ctrlKey && 'cvxaz'.indexOf(e.key.toLowerCase()) >= 0) e.preventDefault();
    }

    hlKey(e.key, true);

    var now = e.timeStamp || performance.now();
    var sig = e.key + Math.round(now / 4);
    if (sig === _lastSig && now - _lastKeyTs < 8) return;
    _lastSig = sig;
    _lastKeyTs = now;

    var st = getState();
    if (st === AppState.TYPING) handleKey(e.key);
    if (st === AppState.IDLE && e.key === 'Enter') document.getElementById('btn-start').click();
    if (st === AppState.RESULT && e.key === 'Enter') document.getElementById('e-retry').click();
  }

  function onKU(e) {
    hlKey(e.key, false);
  }

  var _toastTid = null;
  function toast(msg) {
    var el = document.getElementById('toast');
    if (!el) return;
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(_toastTid);
    _toastTid = setTimeout(function () {
      el.classList.remove('show');
    }, 2000);
  }

  function shakeBody() {
    document.body.classList.remove('shake');
    void document.body.offsetWidth;
    document.body.classList.add('shake');
    setTimeout(function () {
      document.body.classList.remove('shake');
    }, 240);
  }

  function toggleMute() {
    G.muted = !G.muted;
    CynosStorage.setMuted(G.muted);
    var icon = G.muted ? '🔇' : '🔊';
    ['h-mute', 'g-mute', 'e-mute', 'st-mute'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.textContent = icon;
    });
    if (G.muted && window.CynosAudio) CynosAudio.stopAmbience();
    else if (!G.muted && getState() === AppState.TYPING) syncFocusAmbience();
    if (getState() === AppState.TYPING) refocus();
  }

  function toggleFocus() {
    G.focus = !G.focus;
    document.body.classList.toggle('focus-mode', G.focus);
    var btn = document.getElementById('g-focus');
    if (btn) btn.setAttribute('aria-pressed', G.focus ? 'true' : 'false');
    refocus();
  }

  function bindUi() {
    document.getElementById('mode-grid').addEventListener('click', function (e) {
      var card = e.target.closest('.mode-card');
      if (!card) return;
      G.mode = parseInt(card.dataset.mode, 10);
      document.querySelectorAll('.mode-card').forEach(function (c) {
        c.classList.remove('sel');
      });
      card.classList.add('sel');
    });

    document.getElementById('dur-row').addEventListener('click', function (e) {
      var pill = e.target.closest('[data-dur]');
      if (!pill) return;
      G.dur = parseInt(pill.dataset.dur, 10);
      document.querySelectorAll('#dur-row .pill').forEach(function (p) {
        p.classList.remove('on');
      });
      pill.classList.add('on');
    });

    document.getElementById('lang-row').addEventListener('click', function (e) {
      var pill = e.target.closest('[data-lang]');
      if (!pill) return;
      G.lang = pill.dataset.lang;
      document.querySelectorAll('#lang-row .pill').forEach(function (p) {
        p.classList.remove('on');
      });
      pill.classList.add('on');
    });

    document.getElementById('train-row').addEventListener('click', function (e) {
      var pill = e.target.closest('[data-train]');
      if (!pill) return;
      G.training = pill.dataset.train;
      document.querySelectorAll('#train-row .pill').forEach(function (p) {
        p.classList.remove('on');
      });
      pill.classList.add('on');
      var langRow = document.getElementById('lang-row');
      if (langRow) langRow.style.display = G.training === 'javascript' ? 'none' : '';
    });

    document.getElementById('hardcore-toggle').addEventListener('click', function () {
      G.hardcore = !G.hardcore;
      var el = document.getElementById('hardcore-toggle');
      el.classList.toggle('on', G.hardcore);
      el.setAttribute('aria-pressed', G.hardcore ? 'true' : 'false');
    });

    document.getElementById('btn-start').addEventListener('click', startSession);

    document.getElementById('player-name').addEventListener('input', function () {
      document.getElementById('player-name').classList.remove('error');
      document.getElementById('name-req').classList.remove('show');
    });

    document.getElementById('h-mute').addEventListener('click', toggleMute);
    document.getElementById('h-stats').addEventListener('click', function () {
      showScreen('stats');
    });

    document.getElementById('g-quit').addEventListener('click', endSession);
    document.getElementById('g-mute').addEventListener('click', toggleMute);
    document.getElementById('g-focus').addEventListener('click', toggleFocus);
    document.getElementById('g-skip').addEventListener('click', function () {
      skipWord();
      refocus();
    });

    document.getElementById('e-retry').addEventListener('click', function () {
      startSession();
    });
    document.getElementById('e-stats').addEventListener('click', function () {
      showScreen('stats');
    });
    document.getElementById('e-share').addEventListener('click', share);
    document.getElementById('e-menu').addEventListener('click', function () {
      showScreen('home');
    });
    document.getElementById('e-mute').addEventListener('click', toggleMute);

    document.getElementById('st-back').addEventListener('click', function () {
      showScreen('home');
    });
    document.getElementById('st-mute').addEventListener('click', toggleMute);
    document.getElementById('st-play').addEventListener('click', function () {
      startSession();
    });

    document.getElementById('btn-clear-name').addEventListener('click', function () {
      CynosStorage.clearPlayerName();
      updateNameUI();
    });

    document.getElementById('btn-edit-name').addEventListener('click', function () {
      CynosStorage.clearPlayerName();
      updateNameUI();
      var nameInp = document.getElementById('player-name');
      if (nameInp) nameInp.focus();
    });

    var themeSel = document.getElementById('theme-select');
    if (themeSel) {
      themeSel.addEventListener('change', function () {
        var d = CynosStorage.getAll();
        d.activeTheme = themeSel.value;
        CynosStorage.save(d);
        applyThemeFromStorage();
      });
    }
    var soundSel = document.getElementById('soundpack-select');
    if (soundSel) {
      soundSel.addEventListener('change', function () {
        var d = CynosStorage.getAll();
        d.activeSoundPack = soundSel.value;
        CynosStorage.save(d);
      });
    }
    var tactT = document.getElementById('tactile-toggle');
    if (tactT) {
      tactT.addEventListener('change', function () {
        G.tactileEnabled = tactT.checked;
        CynosStorage.setTactile(tactT.checked);
      });
    }
    var faT = document.getElementById('focus-ambience-toggle');
    var faM = document.getElementById('focus-mode-select');
    if (faT) {
      faT.addEventListener('change', function () {
        var d = CynosStorage.getAll();
        d.focusAmbience = faT.checked;
        CynosStorage.save(d);
        syncFocusAmbience();
      });
    }
    if (faM) {
      faM.addEventListener('change', function () {
        var d = CynosStorage.getAll();
        d.focusAmbienceMode = faM.value;
        CynosStorage.save(d);
        syncFocusAmbience();
      });
    }
  }

  function initTrapListeners() {
    if (!trap) return;
    trap.addEventListener('keydown', onKD);
    trap.addEventListener('keyup', onKU);
    document.addEventListener('keydown', function (e) {
      if (e.target !== trap) onKD(e);
    });
    document.addEventListener('keyup', function (e) {
      if (e.target !== trap) hlKey(e.key, false);
    });

    document.addEventListener('click', function (e) {
      var t = e.target;
      if (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA') return;
      if (getState() === AppState.TYPING) refocus();
    });
    setInterval(function () {
      if (getState() === AppState.TYPING && document.activeElement !== trap) {
        var ae = document.activeElement;
        if (ae && ae.tagName !== 'BUTTON' && ae.tagName !== 'INPUT') refocus();
      }
    }, 700);
    document.addEventListener('visibilitychange', function () {
      if (!document.hidden && getState() === AppState.TYPING) refocus();
    });
  }

  function init() {
    var st = CynosStorage.getAll();
    G.muted = CynosStorage.isMuted();
    G.tactileEnabled = st.tactileEnabled !== false;
    var icon = G.muted ? '🔇' : '🔊';
    ['h-mute', 'g-mute', 'e-mute', 'st-mute'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.textContent = icon;
    });

    buildKb();
    bindUi();
    initTrapListeners();
    loadRecDisplay();
    updatePatentHud();
    populateThemeSelectors();
    renderBadgesHome();
    applyThemeFromStorage();
    syncFocusAmbience();
    transitionTo(AppState.IDLE);
    showScreen('home');
    setTimeout(refocus, 150);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
