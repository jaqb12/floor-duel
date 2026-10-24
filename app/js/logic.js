// Pure game logic, no DOM. Testable in Node and in the browser.
// Every time-dependent method takes `now` (ms, e.g. performance.now()).
(function (root) {
  'use strict';

  const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp', 'avif', 'svg'];
  const HEIC_EXTENSIONS = ['heic', 'heif'];
  const IGNORED_FILES = ['thumbs.db', 'desktop.ini'];
  const LOW_TIME_SECONDS = 5;
  const SUSPENSE_SECONDS = 12;
  const MIN_RECOMMENDED_IMAGES = 30;
  const MAX_NAME_LENGTH = 24;
  // Bright colors that stay readable on the black players screen.
  const PLAYER_COLORS = ['#ff5a5a', '#4ade80', '#facc15', '#60a5fa', '#fb923c', '#c084fc',
    '#22d3ee', '#f472b6', '#a3e635', '#fda4af', '#2dd4bf', '#d4a373'];
  const DEFAULT_SETTINGS = { duelSeconds: 45, passPenaltySeconds: 3, sound: true, hideAnswer: false, volume: 80 };
  const SETTING_LIMITS = { duelSeconds: [10, 300], passPenaltySeconds: [1, 10], volume: [0, 100] };
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

  // webkitdirectory paths "Root/Folder/file.jpg" and "Root/Folder/Sub/file.jpg" ->
  // { rootName, folders: [{ name, fileNames, subfolders: [{ name, fileNames }] }] }.
  // Files in the root and anything deeper are ignored.
  function groupRelativePaths(paths) {
    let rootName = '';
    const folders = new Map();
    const folder = (map, name) => {
      if (!map.has(name)) map.set(name, { name, fileNames: [], subs: new Map() });
      return map.get(name);
    };
    for (const path of paths) {
      const parts = path.split('/');
      if (!rootName) rootName = parts[0];
      if (parts.length === 3) folder(folders, parts[1]).fileNames.push(parts[2]);
      else if (parts.length === 4) folder(folder(folders, parts[1]).subs, parts[2]).fileNames.push(parts[3]);
    }
    const plain = f => ({ name: f.name, fileNames: f.fileNames, subfolders: Array.from(f.subs.values(), plain) });
    return { rootName, folders: Array.from(folders.values(), plain) };
  }

  // Difficulty folders sort by these name stems ("Łatwe", "łatwy", ...); other names go last.
  const LEVEL_STEMS = [['łatw'], ['norm', 'śred'], ['trud'], ['eksp', 'exp']];

  function levelRank(level) {
    const name = level.normalize('NFC').toLowerCase();
    const rank = LEVEL_STEMS.findIndex(stems => stems.some(stem => name.startsWith(stem)));
    return rank < 0 ? LEVEL_STEMS.length : rank;
  }

  // Folders of the categories root -> categories (SPEC §3). A folder with images directly
  // inside, or without subfolders, is a category. Otherwise it is a difficulty level and its
  // subfolders are categories. A category name repeated across levels gets " (Level)".
  // Input as from groupRelativePaths. Returns [{ name, level, fileNames, folder }], where
  // `folder` is the input object the files came from, sorted: no level first, then by level.
  function resolveCategories(folders) {
    const list = [];
    for (const top of folders) {
      if (!isCategoryFolder(top.name)) continue;
      const subs = (top.subfolders || []).filter(s => isCategoryFolder(s.name));
      if (top.fileNames.some(isSupportedImage) || !subs.length) {
        list.push({ name: top.name, level: null, fileNames: top.fileNames, folder: top });
      } else {
        for (const sub of subs) list.push({ name: sub.name, level: top.name, fileNames: sub.fileNames, folder: sub });
      }
    }
    const seen = new Map();
    for (const c of list) seen.set(c.name, (seen.get(c.name) || 0) + 1);
    for (const c of list) if (c.level && seen.get(c.name) > 1) c.name += ' (' + c.level + ')';
    const levelOrder = c => c.level === null ? -1 : levelRank(c.level);
    return list.sort((a, b) => levelOrder(a) - levelOrder(b) ||
      (a.level !== b.level && compareNames(a.level, b.level)) || compareNames(a.name, b.name));
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
      volume: int('volume'),
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
  // States: 'ready' -> ('countdown' ->) 'running' <-> 'reveal', 'paused', 'finished'.
  // Actions return an array of events; an empty array means the action was ignored.
  // Events: 'countdown', 'started', 'correct', 'pass', 'revealEnd', 'timeout', 'lowTime', 'suspense', 'paused', 'resumed'.
  // 'suspense' fires once per duel, when an active clock first shows SUSPENSE_SECONDS or less.

  class Duel {
    constructor({ challengerId, opponentId, category, images, firstId = challengerId,
                  duelSeconds = 45, passPenaltySeconds = 3, countdownSeconds = 0, rng = Math.random }) {
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
      this.countdownMs = countdownSeconds * 1000;
      this.countdownUntil = null;
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
      // A duel that starts at or below the threshold has no suspense moment.
      this.suspensePending = duelSeconds > SUSPENSE_SECONDS;
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

    // With a countdown the clocks start exactly when it ends, not at the next tick.
    start(now) {
      if (this.state !== 'ready') return [];
      if (this.countdownMs > 0) {
        this.state = 'countdown';
        this.countdownUntil = now + this.countdownMs;
        return ['countdown'];
      }
      this.begin(now);
      return ['started'];
    }

    begin(at) {
      this.state = 'running';
      this.countdownUntil = null;
      this.turnStartedAt = at;
      this.nextImage();
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
      if (this.state === 'countdown') {
        if (now < this.countdownUntil) return events;
        this.begin(this.countdownUntil);
        events.push('started');
      }
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
      if (seconds <= SUSPENSE_SECONDS && this.suspensePending) {
        this.suspensePending = false;
        events.push('suspense');
      }
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

    // Next image in the current deck, or null when a reshuffle is due (unknown yet).
    peekNext() {
      return this.deckPos < this.deck.length ? this.deck[this.deckPos] : null;
    }

    // Drops a broken image from the pool (unless it's the only one) and draws the next.
    skipCurrent() {
      const broken = this.current;
      if (this.images.length > 1) this.images = this.images.filter(k => k !== broken);
      return this.nextImage();
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

  // ---------- duel setup (SPEC §2, §9) ----------

  // categories: [{ name, count }]. Returns why START is not possible, or null.
  function duelSetupProblem({ players, categories, challengerId, opponentId, category }) {
    if (players.length < 2) return 'Dodaj co najmniej 2 graczy.';
    if (!categories) return 'Wczytaj folder z kategoriami.';
    const exists = id => players.some(p => p.id === id);
    if (!challengerId || !exists(challengerId)) return 'Wybierz wyzywającego.';
    if (!opponentId || !exists(opponentId)) return 'Wybierz rywala.';
    if (challengerId === opponentId) return 'Wyzywający i rywal muszą być różnymi graczami.';
    if (!category) return 'Wybierz kategorię pojedynku.';
    const cat = categories.find(c => c.name === category);
    if (!cat || !cat.count) return 'Kategoria „' + category + '” nie ma zdjęć.';
    return null;
  }

  // Like on TV: the opponent's own category, if it exists and has images.
  function defaultCategory(opponent, categories) {
    if (!opponent || !opponent.category || !categories) return '';
    const cat = categories.find(c => c.name === opponent.category);
    return cat && cat.count ? cat.name : '';
  }

  function randomChallenger(players, excludeId, rng = Math.random) {
    const pool = players.filter(p => p.id !== excludeId);
    return pool.length ? pool[Math.floor(rng() * pool.length)].id : null;
  }

  // ---------- players screen (SPEC §6) ----------

  const LOW_CLOCK_MS = 10000;

  // Image keys are "Category/file name"; category names can't contain "/".
  function answerForKey(key) {
    return normalizeAnswer(String(key).slice(String(key).indexOf('/') + 1));
  }

  // Everything the players screen shows, as plain data. `duel` may be null (start board).
  // screen: 'board' | 'ready' | 'duel' | 'finished'
  function displayView({ duel, players, now }) {
    if (!duel) {
      return {
        screen: 'board',
        ranking: rankPlayers(players).map(p => ({ name: p.name, color: p.color, wins: p.wins, losses: p.losses })),
      };
    }
    const finished = duel.state === 'finished';
    const side = id => {
      const p = players.find(x => x.id === id) || { name: '?', color: '#ffffff' };
      const ms = duel.getClock(id, now);
      return {
        name: p.name,
        color: p.color,
        seconds: clockSeconds(ms),
        low: ms <= LOW_CLOCK_MS,
        active: !finished && id === duel.activeId,
        winner: finished && id === duel.winnerId,
      };
    };
    const revealing = duel.state === 'reveal' || (duel.state === 'paused' && duel.pausedFrom === 'reveal');
    const winner = finished ? players.find(p => p.id === duel.winnerId) : null;
    const screen = duel.state === 'ready' || duel.state === 'countdown' ? duel.state : finished ? 'finished' : 'duel';
    return {
      screen,
      countdown: duel.state === 'countdown' ? clockSeconds(duel.countdownUntil - now) : null,
      category: duel.category,
      left: side(duel.challengerId),
      right: side(duel.opponentId),
      imageKey: duel.current,
      reveal: revealing ? answerForKey(duel.current) : null,
      paused: duel.state === 'paused',
      winner: winner ? { name: winner.name, color: winner.color } : null,
    };
  }

  const logic = {
    IMAGE_EXTENSIONS,
    MIN_RECOMMENDED_IMAGES,
    SUSPENSE_SECONDS,
    normalizeAnswer,
    isSupportedImage,
    isHeic,
    compareNames,
    isCategoryFolder,
    classifyFiles,
    groupRelativePaths,
    resolveCategories,
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
    duelSetupProblem,
    defaultCategory,
    randomChallenger,
    answerForKey,
    displayView,
  };

  root.Floor = root.Floor || {};
  root.Floor.logic = logic;
  if (typeof module !== 'undefined') module.exports = logic;
})(typeof window !== 'undefined' ? window : globalThis);
