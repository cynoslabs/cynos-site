/**
 * Single LocalStorage blob: CYNOS_USER_DATA
 * Migrates from legacy typeflow_cynos_v2 and tf_* keys.
 */
(function (global) {
  'use strict';

  var STORAGE_KEY = 'CYNOS_USER_DATA';
  var LEGACY_KEY = 'typeflow_cynos_v2';
  var SCHEMA_VERSION = 3;

  function bumpToV3(data) {
    if (data.version >= 3) return normalize(data);
    var d = normalize(data);
    d.version = SCHEMA_VERSION;
    if (!d.focusAmbienceMode) d.focusAmbienceMode = 'industrial';
    if (!d.unlockedThemes || !d.unlockedThemes.length) d.unlockedThemes = ['amoled'];
    if (!d.unlockedSoundPacks || !d.unlockedSoundPacks.length) d.unlockedSoundPacks = ['default'];
    if (!d.badges) d.badges = { first100wpm: false, perfect100acc: false, words10k: false };
    if (typeof d.totalWordsLifetime !== 'number') d.totalWordsLifetime = 0;
    if (d.tactileEnabled === undefined) d.tactileEnabled = true;
    return d;
  }

  function safeParse(json) {
    try {
      return JSON.parse(json);
    } catch (_) {
      return null;
    }
  }

  function defaultUserData() {
    return {
      version: SCHEMA_VERSION,
      sessions: [],
      totalXp: 0,
      totalWordsLifetime: 0,
      playerName: '',
      muted: false,
      tactileEnabled: true,
      focusAmbience: false,
      focusAmbienceMode: 'industrial',
      activeTheme: 'amoled',
      activeSoundPack: 'default',
      unlockedThemes: ['amoled'],
      unlockedSoundPacks: ['default'],
      badges: {
        first100wpm: false,
        perfect100acc: false,
        words10k: false,
      },
    };
  }

  function normalize(data) {
    var d = defaultUserData();
    if (!data || typeof data !== 'object') return d;
    d.version = typeof data.version === 'number' ? data.version : SCHEMA_VERSION;
    d.sessions = Array.isArray(data.sessions) ? data.sessions.slice(-50) : [];
    d.totalXp = typeof data.totalXp === 'number' ? Math.max(0, data.totalXp) : 0;
    d.totalWordsLifetime = typeof data.totalWordsLifetime === 'number' ? Math.max(0, data.totalWordsLifetime) : 0;
    d.playerName = typeof data.playerName === 'string' ? data.playerName : '';
    d.muted = !!data.muted;
    d.tactileEnabled = data.tactileEnabled !== false;
    d.focusAmbience = !!data.focusAmbience;
    d.focusAmbienceMode = data.focusAmbienceMode === 'binaural' ? 'binaural' : 'industrial';
    d.activeTheme = typeof data.activeTheme === 'string' ? data.activeTheme : 'amoled';
    d.activeSoundPack = typeof data.activeSoundPack === 'string' ? data.activeSoundPack : 'default';
    d.unlockedThemes = Array.isArray(data.unlockedThemes) ? data.unlockedThemes : ['amoled'];
    d.unlockedSoundPacks = Array.isArray(data.unlockedSoundPacks) ? data.unlockedSoundPacks : ['default'];
    d.badges =
      data.badges && typeof data.badges === 'object'
        ? {
            first100wpm: !!data.badges.first100wpm,
            perfect100acc: !!data.badges.perfect100acc,
            words10k: !!data.badges.words10k,
          }
        : d.badges;
    return d;
  }

  function migrateLegacyV2(old) {
    var d = normalize(old);
    d.version = SCHEMA_VERSION;
    return d;
  }

  function migrateFromTfHist(target) {
    try {
      var hist = safeParse(localStorage.getItem('tf_hist'));
      if (Array.isArray(hist) && hist.length) {
        hist.forEach(function (row) {
          if (!row || typeof row.ts !== 'number') return;
          var wpm = typeof row.wpm === 'number' ? row.wpm : 0;
          var words = 20;
          var xpg = Math.max(0, Math.floor(wpm * 2 + words * 4));
          target.sessions.push({
            ts: row.ts,
            wpm: wpm,
            acc: typeof row.acc === 'number' ? row.acc : 0,
            mode: typeof row.mode === 'number' ? row.mode : 1,
            words: words,
            training: 'common',
            hardcore: false,
            durationSec: 60,
            xpGained: xpg,
          });
        });
        target.totalXp = target.sessions.reduce(function (a, s) {
          return a + (s.xpGained || 0);
        }, 0);
      }
    } catch (_) {}
    try {
      var name = localStorage.getItem('tf_name');
      if (name && !target.playerName) target.playerName = name;
    } catch (_) {}
    if (target.sessions.length > 50) target.sessions = target.sessions.slice(-50);
  }

  function loadRaw() {
    var raw = null;
    try {
      raw = localStorage.getItem(STORAGE_KEY);
    } catch (e) {
      console.warn('[CYNOS_USER_DATA] read failed', e);
      return defaultUserData();
    }
    var data = raw ? safeParse(raw) : null;

    if (!data || typeof data !== 'object') {
      var legacy = null;
      try {
        legacy = safeParse(localStorage.getItem(LEGACY_KEY));
      } catch (_) {}
      if (legacy && typeof legacy === 'object') {
        data = migrateLegacyV2(legacy);
      } else {
        data = defaultUserData();
        migrateFromTfHist(data);
      }
      var fresh = bumpToV3(normalize(data));
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
      } catch (_) {}
      return fresh;
    }

    if (data.version < SCHEMA_VERSION) {
      if (data.version <= 2) data = migrateLegacyV2(data);
      data = bumpToV3(data);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      } catch (_) {}
    }
    return bumpToV3(normalize(data));
  }

  var _cache = null;

  function persist(data) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      _cache = data;
    } catch (e) {
      console.warn('[CYNOS_USER_DATA] write failed', e);
    }
  }

  var CynosStorage = {
    SCHEMA_VERSION: SCHEMA_VERSION,
    STORAGE_KEY: STORAGE_KEY,

    getAll: function () {
      if (!_cache) _cache = loadRaw();
      return JSON.parse(JSON.stringify(_cache));
    },

    save: function (data) {
      _cache = normalize(data);
      persist(_cache);
    },

    pushSession: function (session) {
      var d = this.getAll();
      d.sessions.push(session);
      if (d.sessions.length > 50) d.sessions = d.sessions.slice(-50);
      d.totalXp += session.xpGained || 0;
      d.totalWordsLifetime += session.words || 0;
      this.save(d);
    },

    setPlayerName: function (name) {
      var d = this.getAll();
      d.playerName = name;
      this.save(d);
      try {
        localStorage.setItem('tf_name', name);
      } catch (_) {}
    },

    getPlayerName: function () {
      return this.getAll().playerName || '';
    },

    setMuted: function (muted) {
      var d = this.getAll();
      d.muted = !!muted;
      this.save(d);
    },

    isMuted: function () {
      return !!this.getAll().muted;
    },

    setTactile: function (on) {
      var d = this.getAll();
      d.tactileEnabled = !!on;
      this.save(d);
    },

    setFocusAmbience: function (on) {
      var d = this.getAll();
      d.focusAmbience = !!on;
      this.save(d);
    },

    setTheme: function (id) {
      var d = this.getAll();
      if (d.unlockedThemes.indexOf(id) === -1) return;
      d.activeTheme = id;
      this.save(d);
    },

    setSoundPack: function (id) {
      var d = this.getAll();
      if (d.unlockedSoundPacks.indexOf(id) === -1) return;
      d.activeSoundPack = id;
      this.save(d);
    },

    clearPlayerName: function () {
      var d = this.getAll();
      d.playerName = '';
      this.save(d);
      try {
        localStorage.removeItem('tf_name');
      } catch (_) {}
    },
  };

  global.CynosStorage = CynosStorage;
})(typeof window !== 'undefined' ? window : globalThis);
