// Pure game logic, no DOM. Testable in Node and in the browser.
// Every time-dependent method takes `now` (ms, e.g. performance.now()).
(function (root) {
  'use strict';

  const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp', 'avif', 'svg'];
  const HEIC_EXTENSIONS = ['heic', 'heif'];
  const IGNORED_FILES = ['thumbs.db', 'desktop.ini'];
  const LOW_TIME_SECONDS = 5;
  const MIN_RECOMMENDED_IMAGES = 30;
  const MAX_NAME_LENGTH = 24;
  // Bright colors that stay readable on the black players screen.
  const PLAYER_COLORS = ['#ff5a5a', '#4ade80', '#facc15', '#60a5fa', '#fb923c', '#c084fc',
    '#22d3ee', '#f472b6', '#a3e635', '#fda4af', '#2dd4bf', '#d4a373'];
  const DEFAULT_SETTINGS = { duelSeconds: 45, passPenaltySeconds: 3, sound: true, hideAnswer: false };
  const SETTING_LIMITS = { duelSeconds: [10, 300], passPenaltySeconds: [1, 10] };
  const COLOR_RE = /^#[0-9a-f]{6}$/i;

  // ---------- file names ----------

  function extensionOf(name) {
    const dot = name.lastIndexOf('.');
    return dot > 0 ? name.slice(dot + 1).toLowerCase() : '';
  }

  function isSkippedName(name) {
    return !name || name.startsWith('.') || IGNORED_FILES.includes(name.toLowerCase());
  }

  function isSupportedImage(name) {
    return !isSkippedName(name) && IMAGE_EXTENSIONS.includes(extensionOf(name));
  }

  function isHeic(name) {
    return !isSkippedName(name) && HEIC_EXTENSIONS.includes(extensionOf(name));
  }

  // "Wieża_Eiffla.jpg" -> "Wieża Eiffla", "Słoń (2).png" -> "Słoń", "Słoń__3.webp" -> "Słoń".
  // If stripping leaves nothing (e.g. "(2).jpg"), the base name is kept as is.
  function normalizeAnswer(filename) {
    const name = String(filename);
    const dot = name.lastIndexOf('.');
    const base = dot > 0 ? name.slice(0, dot) : name;
    const answer = base
      .replace(/\s*\(\d+\)$/, '')
      .replace(/__\d+$/, '')
      .replace(/_/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    return (answer || base.trim()).normalize('NFC');
  }

  // Natural, Polish-aware order: "2.jpg" before "10.jpg", "Łoś" after "Lis".
  function compareNames(a, b) {
    return a.localeCompare(b, 'pl', { numeric: true, sensitivity: 'base' });
  }

  function isCategoryFolder(name) {
    return !!name && !name.startsWith('.');
  }

  // Splits one category's file names into images (sorted), HEIC count and other skipped files.
  function classifyFiles(fileNames) {
    const images = [];
    let heic = 0;
    let skipped = 0;
    for (const name of fileNames) {
      if (isSupportedImage(name)) images.push(name);
      else if (isHeic(name)) heic++;
      else skipped++;
    }
    images.sort(compareNames);
    return { images, heic, skipped };
  }

  // webkitdirectory paths "Root/Category/file.jpg" -> { rootName, folders: Map(category -> [file names]) }.
  // Files in the root and in deeper subfolders are ignored (no recursion).
  function groupRelativePaths(paths) {
    let rootName = '';
    const folders = new Map();
    for (const path of paths) {
      const parts = path.split('/');
      if (!rootName) rootName = parts[0];
      if (parts.length !== 3 || !isCategoryFolder(parts[1])) continue;
      if (!folders.has(parts[1])) folders.set(parts[1], []);
      folders.get(parts[1]).push(parts[2]);
    }
    return { rootName, folders };
  }

  // ---------- helpers ----------

  // Fisher–Yates on a copy; `rng` returns [0, 1).
  function shuffle(items, rng = Math.random) {
    const a = items.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  // Wins descending, then losses ascending, then name.
  function rankPlayers(players) {
    return players.slice().sort((a, b) =>
      (b.wins - a.wins) || (a.losses - b.losses) || a.name.localeCompare(b.name, 'pl'));
  }

  // Clock shown to players: whole seconds, rounded up.
  function clockSeconds(ms) {
    return Math.ceil(Math.max(0, ms) / 1000);
  }

  // Returns a new players array with the finished duel's result applied.
  function applyResult(players, duel) {
    if (duel.state !== 'finished') return players;
    return players.map(p => {
      if (p.id === duel.winnerId) return Object.assign({}, p, { wins: p.wins + 1 });
      if (p.id === duel.loserId) return Object.assign({}, p, { losses: p.losses + 1 });
      return p;
    });
  }

  // ---------- players and settings ----------

  function cleanName(name) {
    return String(name == null ? '' : name).replace(/\s+/g, ' ').trim().slice(0, MAX_NAME_LENGTH);
  }

  // Returns an error message for the operator, or null when the name is fine.
  function validatePlayerName(name, players, exceptId = null) {
    const clean = cleanName(name);
    if (!clean) return 'Podaj imię gracza.';
    const lower = clean.toLocaleLowerCase('pl');
    const taken = players.some(p => p.id !== exceptId && p.name.toLocaleLowerCase('pl') === lower);
    return taken ? 'Gracz „' + clean + '” już istnieje.' : null;
  }

  // First palette color nobody uses yet; cycles when all are taken.
  function nextColor(players) {
    const used = new Set(players.map(p => String(p.color).toLowerCase()));
    return PLAYER_COLORS.find(c => !used.has(c)) || PLAYER_COLORS[players.length % PLAYER_COLORS.length];
  }

  function adjustWins(players, id, delta) {
    return players.map(p => (p.id === id ? Object.assign({}, p, { wins: Math.max(0, p.wins + delta) }) : p));
  }

  function resetScores(players) {
    return players.map(p => Object.assign({}, p, { wins: 0, losses: 0 }));
  }

  function clampInt(value, min, max, fallback) {
    if (value === null || value === undefined || value === '') return fallback;
    const n = Math.round(Number(value));
    return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
  }

  function sanitizeSettings(raw) {
    const s = raw && typeof raw === 'object' ? raw : {};
    const bool = key => (typeof s[key] === 'boolean' ? s[key] : DEFAULT_SETTINGS[key]);
    const int = key => clampInt(s[key], SETTING_LIMITS[key][0], SETTING_LIMITS[key][1], DEFAULT_SETTINGS[key]);
    return {
      duelSeconds: int('duelSeconds'),
      passPenaltySeconds: int('passPenaltySeconds'),
      sound: bool('sound'),
      hideAnswer: bool('hideAnswer'),
    };
  }

  // Drops entries without a name or id (or with a duplicate id), repairs the rest.
  function sanitizePlayers(raw) {
    if (!Array.isArray(raw)) return [];
    const players = [];
    const ids = new Set();
    for (const p of raw) {
      if (!p || typeof p !== 'object') continue;
      const name = cleanName(p.name);
      if (!name || typeof p.id !== 'string' || !p.id || ids.has(p.id)) continue;
      ids.add(p.id);
      players.push({
        id: p.id,
        name,
        color: COLOR_RE.test(p.color) ? p.color.toLowerCase() : nextColor(players),
        category: typeof p.category === 'string' && p.category ? p.category : null,
        wins: clampInt(p.wins, 0, 9999, 0),
        losses: clampInt(p.losses, 0, 9999, 0),
      });
    }
    return players;
  }

  // Turns whatever was stored into a valid { players, settings }.
  function sanitizeState(raw) {
    const r = raw && typeof raw === 'object' ? raw : {};
    return { players: sanitizePlayers(r.players), settings: sanitizeSettings(r.settings) };
  }

  // ---------- duel (SPEC §5) ----------
  // States: 'ready' -> 'running' <-> 'reveal', 'paused', 'finished'.
  // Actions return an array of events; an empty array means the action was ignored.
  // Events: 'started', 'correct', 'pass', 'revealEnd', 'timeout', 'lowTime', 'paused', 'resumed'.

  class Duel {
    constructor({ challengerId, opponentId, category, images, firstId = challengerId,
                  duelSeconds = 45, passPenaltySeconds = 3, rng = Math.random }) {
      if (challengerId === opponentId) throw new Error('Challenger and opponent must differ');
      if (firstId !== challengerId && firstId !== opponentId) throw new Error('firstId must be one of the players');
      if (!images || !images.length) throw new Error('Category has no images');

      this.state = 'ready';
      this.challengerId = challengerId;
      this.opponentId = opponentId;
      this.category = category;
      this.activeId = firstId;
      this.remainingMs = { [challengerId]: duelSeconds * 1000, [opponentId]: duelSeconds * 1000 };
      this.passPenaltyMs = passPenaltySeconds * 1000;
      this.turnStartedAt = null;
      this.revealUntil = null;
      this.images = images.slice();
      this.rng = rng;
      this.deck = [];
      this.deckPos = 0;
      this.current = null;
      this.reshuffles = 0;
      this.winnerId = null;
      this.loserId = null;
      this.stats = { [challengerId]: { correct: 0, passes: 0 }, [opponentId]: { correct: 0, passes: 0 } };
      this.pausedFrom = null;
      this.revealLeftMs = null;
      this.lastLowSecond = null;
    }

    otherId(id) {
      return id === this.challengerId ? this.opponentId : this.challengerId;
    }

    isClockRunning() {
      return this.state === 'running' || this.state === 'reveal';
    }

    getClock(id, now) {
      const ms = this.remainingMs[id];
      if (id !== this.activeId || !this.isClockRunning()) return ms;
      return Math.max(0, ms - (now - this.turnStartedAt));
    }

    start(now) {
      if (this.state !== 'ready') return [];
      this.state = 'running';
      this.turnStartedAt = now;
      this.nextImage();
      return ['started'];
    }

    markCorrect(now) {
      const events = this.tick(now);
      if (this.state !== 'running') return events;
      const id = this.activeId;
      this.freezeClock(now);
      this.stats[id].correct++;
      this.activeId = this.otherId(id);
      this.lastLowSecond = null;
      this.nextImage();
      events.push('correct');
      return events;
    }

    // The passing player's clock keeps running during the reveal.
    markPass(now) {
      const events = this.tick(now);
      if (this.state !== 'running') return events;
      this.stats[this.activeId].passes++;
      this.state = 'reveal';
      this.revealUntil = now + this.passPenaltyMs;
      events.push('pass');
      return events;
    }

    togglePause(now) {
      if (this.state === 'paused') {
        this.state = this.pausedFrom;
        this.pausedFrom = null;
        this.turnStartedAt = now;
        if (this.state === 'reveal') this.revealUntil = now + this.revealLeftMs;
        this.revealLeftMs = null;
        return ['resumed'];
      }
      const events = this.tick(now);
      if (!this.isClockRunning()) return events;
      this.freezeClock(now);
      if (this.state === 'reveal') this.revealLeftMs = this.revealUntil - now;
      this.pausedFrom = this.state;
      this.state = 'paused';
      events.push('paused');
      return events;
    }

    // Safe to call at any rate: outcomes depend only on timestamps.
    tick(now) {
      const events = [];
      if (!this.isClockRunning()) return events;
      const timeoutAt = this.turnStartedAt + this.remainingMs[this.activeId];
      if (this.state === 'reveal' && now >= this.revealUntil && this.revealUntil < timeoutAt) {
        this.state = 'running';
        this.revealUntil = null;
        this.nextImage();
        events.push('revealEnd');
      }
      if (now >= timeoutAt) {
        this.finish();
        events.push('timeout');
        return events;
      }
      const seconds = clockSeconds(this.getClock(this.activeId, now));
      if (seconds <= LOW_TIME_SECONDS && seconds !== this.lastLowSecond) {
        this.lastLowSecond = seconds;
        events.push('lowTime');
      }
      return events;
    }

    // Draws without repeats; when the deck runs out, reshuffles so the
    // next image differs from the one just shown.
    nextImage() {
      if (this.deckPos >= this.deck.length) {
        const fresh = shuffle(this.images, this.rng);
        if (this.current !== null && fresh.length > 1 && fresh[0] === this.current) {
          const j = 1 + Math.floor(this.rng() * (fresh.length - 1));
          [fresh[0], fresh[j]] = [fresh[j], fresh[0]];
        }
        if (this.deck.length) this.reshuffles++;
        this.deck = fresh;
        this.deckPos = 0;
      }
      this.current = this.deck[this.deckPos++];
      return this.current;
    }

    freezeClock(now) {
      this.remainingMs[this.activeId] = this.getClock(this.activeId, now);
      this.turnStartedAt = now;
    }

    finish() {
      this.remainingMs[this.activeId] = 0;
      this.loserId = this.activeId;
      this.winnerId = this.otherId(this.activeId);
      this.revealUntil = null;
      this.state = 'finished';
    }
  }

  function createDuel(options) {
    return new Duel(options);
  }

  const logic = {
    IMAGE_EXTENSIONS,
    MIN_RECOMMENDED_IMAGES,
    normalizeAnswer,
    isSupportedImage,
    isHeic,
    compareNames,
    isCategoryFolder,
    classifyFiles,
    groupRelativePaths,
    shuffle,
    rankPlayers,
    clockSeconds,
    applyResult,
    MAX_NAME_LENGTH,
    PLAYER_COLORS,
    DEFAULT_SETTINGS,
    SETTING_LIMITS,
    cleanName,
    validatePlayerName,
    nextColor,
    adjustWins,
    resetScores,
    sanitizeSettings,
    sanitizeState,
    createDuel,
    Duel,
  };

  root.Floor = root.Floor || {};
  root.Floor.logic = logic;
  if (typeof module !== 'undefined') module.exports = logic;
})(typeof window !== 'undefined' ? window : globalThis);
