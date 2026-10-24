// Wires all modules together and starts the app.
(function () {
  'use strict';
  window.Floor = window.Floor || {};
  const L = Floor.logic;
  const ui = () => Floor.operator;

  const EMPTY_SETUP = { challengerId: null, opponentId: null, category: '', firstSide: 'challenger' };

  let library = null;
  let imagesByKey = new Map();
  let state = null;   // { players, settings }
  let setup = EMPTY_SETUP;
  let duel = null;    // Floor.logic.Duel; in 'ready' it is a draft rebuilt on every setup change
  let holdingAnswer = false;
  let skippedImages = 0;
  let checkedKey = null;
  let bigRenderer = null; // big preview on the operator screen (SPEC §7.4)

  function newPlayerId() {
    return 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  }

  function persist() {
    if (!Floor.storage.saveState(state)) ui().showAppMessage('Nie udało się zapisać danych w przeglądarce.', true);
  }

  // Started and not yet confirmed or cancelled.
  function isDuelLive() {
    return !!duel && duel.state !== 'ready';
  }

  function inDuel(id) {
    return isDuelLive() && (duel.challengerId === id || duel.opponentId === id);
  }

  // ---------- players and settings ----------

  function setPlayers(players) {
    state.players = players;
    persist();
    ui().renderPlayers(state.players, library);
    rebuildDraft();
  }

  const playerHandlers = {
    savePlayer({ id, name, color, category }) {
      const error = L.validatePlayerName(name, state.players, id);
      if (error) return error;
      const fields = { name: L.cleanName(name), color, category };
      if (id) {
        setPlayers(state.players.map(p => (p.id === id ? Object.assign({}, p, fields) : p)));
      } else {
        setPlayers(state.players.concat([Object.assign({ id: newPlayerId(), wins: 0, losses: 0 }, fields)]));
      }
      return null;
    },
    adjustWins: (id, delta) => setPlayers(L.adjustWins(state.players, id, delta)),
    removePlayer(id) {
      if (inDuel(id)) {
        ui().showAppMessage('Nie można usunąć gracza, który bierze udział w pojedynku.', true);
        return;
      }
      setPlayers(state.players.filter(p => p.id !== id));
    },
    resetScores: () => setPlayers(L.resetScores(state.players)),
  };

  function changeSettings(raw) {
    state.settings = L.sanitizeSettings(raw);
    persist();
    ui().renderSettings(state.settings);
    Floor.sound.setEnabled(state.settings.sound);
    Floor.sound.setVolume(state.settings.volume);
    rebuildDraft();
  }

  // ---------- categories ----------

  function categorySummary() {
    return library ? library.categories.map(c => ({ name: c.name, count: c.images.length })) : null;
  }

  function folderErrorText(e) {
    if (e && e.name === 'NotFoundError') return 'Folder nie istnieje — został przeniesiony lub usunięty? Wybierz go ponownie.';
    if (e && e.name === 'NotAllowedError') return 'Brak zgody na odczyt folderu.';
    return 'Nie udało się wczytać folderu: ' + (e && e.message ? e.message : e);
  }

  async function loadLibrary(loader) {
    if (isDuelLive()) {
      ui().showFolderMessage('Najpierw zakończ albo unieważnij pojedynek.', true);
      return;
    }
    try {
      const next = await loader();
      if (!next) return;
      Floor.categories.releaseUrls();
      library = next;
      imagesByKey = new Map(library.categories.flatMap(c => c.images.map(img => [img.key, img])));
      ui().renderCategories(library);
      ui().renderPlayers(state.players, library);
      if (library.source === 'handle') ui().showRestoreButton(library.rootName);
      rebuildDraft();
    } catch (e) {
      console.error(e);
      ui().showFolderMessage(folderErrorText(e), true);
    }
  }

  function resolveImage(key) {
    const image = imagesByKey.get(key);
    return image ? Floor.categories.getImageUrl(image) : Promise.reject(new Error('Unknown image ' + key));
  }

  // ---------- duel ----------

  // setup -> ready (SPEC §5): a valid setup always has a fresh draft duel, shown on the players screen.
  function rebuildDraft() {
    if (isDuelLive()) return;
    const problem = L.duelSetupProblem(Object.assign({ players: state.players, categories: categorySummary() }, setup));
    ui().showSetupProblem(problem);
    if (problem) {
      duel = null;
      return;
    }
    const cat = library.categories.find(c => c.name === setup.category);
    duel = L.createDuel({
      challengerId: setup.challengerId,
      opponentId: setup.opponentId,
      category: setup.category,
      images: cat.images.map(img => img.key),
      firstId: setup.firstSide === 'opponent' ? setup.opponentId : setup.challengerId,
      duelSeconds: state.settings.duelSeconds,
      passPenaltySeconds: state.settings.passPenaltySeconds,
    });
  }

  function handleEvents(events) {
    for (const e of events) {
      if (e === 'lowTime') Floor.sound.tick();
      else if (e === 'correct') Floor.sound.correct();
      else if (e === 'pass') Floor.sound.pass();
      else if (e === 'timeout') Floor.sound.timeout();
      else if (e === 'suspense') Floor.sound.play('suspense');
    }
  }

  function endDuel() {
    duel = null;
    setup = EMPTY_SETUP;
    checkedKey = null;
    ui().resetDuelSetup();
    rebuildDraft();
    frame();
  }

  function probeImage(key) {
    return resolveImage(key).then(url => {
      const img = new Image();
      img.src = url;
      return img.decode();
    });
  }

  // On every new image: check it decodes (skip broken files, SPEC §9) and preload the next one.
  function checkCurrentImage() {
    const key = duel.current;
    if (!key || key === checkedKey) return;
    checkedKey = key;
    const next = duel.peekNext();
    if (next) {
      Floor.display.preload(next);
      if (bigRenderer) bigRenderer.preload(next);
    }
    probeImage(key).catch(e => {
      console.error('Skipping broken image', key, e);
      if (!duel || duel.current !== key) return;
      if (duel.skipCurrent() !== key) skippedImages++;
    });
  }

  const duelHandlers = {
    setupChanged(next) {
      setup = next;
      rebuildDraft();
      frame();
    },
    start() {
      if (!duel || duel.state !== 'ready') return false;
      Floor.sound.unlock();
      Floor.sound.stopMusic();
      skippedImages = 0;
      checkedKey = null;
      handleEvents(duel.start(performance.now()));
      frame();
      return true;
    },
    correct() {
      if (duel) handleEvents(duel.markCorrect(performance.now()));
    },
    pass() {
      if (duel) handleEvents(duel.markPass(performance.now()));
    },
    togglePause() {
      if (isDuelLive()) handleEvents(duel.togglePause(performance.now()));
    },
    holdAnswer(on) {
      holdingAnswer = on;
    },
    confirm() {
      if (!duel || duel.state !== 'finished') return;
      const result = duel;
      duel = null;
      setPlayers(L.applyResult(state.players, result));
      endDuel();
    },
    cancel: endDuel,
    imageUrl: resolveImage,
  };

  // ---------- frame loop ----------

  // One frame for both windows; called from the players window's rAF and from a fallback interval.
  // Outcomes depend only on timestamps, so double calls are harmless.
  function frame() {
    const now = performance.now();
    if (isDuelLive()) {
      handleEvents(duel.tick(now));
      checkCurrentImage();
    }
    Floor.display.checkWindow();
    const view = L.displayView({ duel, players: state.players, now });
    Floor.display.render(view);
    if (bigRenderer) bigRenderer.render(view);
    const image = duel && imagesByKey.get(duel.current);
    ui().renderDuel({
      duel,
      now,
      answer: image ? image.answer : '',
      hideAnswer: state.settings.hideAnswer,
      holdingAnswer,
      skipped: skippedImages,
    });
  }

  // A refresh drops the duel and the players window (docs/SPIKE.md), so ask first.
  function warnBeforeUnload(e) {
    if (!Floor.display.isOpen() && !isDuelLive()) return;
    e.preventDefault();
    e.returnValue = '';
  }

  async function init() {
    const loaded = Floor.storage.loadState();
    state = { players: loaded.players, settings: loaded.settings };
    if (loaded.warning) ui().showAppMessage(loaded.warning, true);
    Floor.sound.setEnabled(state.settings.sound);
    Floor.sound.setVolume(state.settings.volume);
    Floor.sound.setMusicListener(playing => ui().renderMusic(playing));

    ui().bindPlayers(playerHandlers);
    ui().bindSounds({
      toggleMusic: () => (Floor.sound.isMusicPlaying() ? Floor.sound.stopMusic() : Floor.sound.startMusic()),
      play: name => Floor.sound.play(name),
    });
    ui().bindSettings(changeSettings);
    ui().bindDuel(duelHandlers);
    ui().renderPlayers(state.players, library);
    ui().renderSettings(state.settings);
    ui().renderCategories(null);
    rebuildDraft();

    Floor.display.setStatusListener(status => ui().showDisplayStatus(status));
    Floor.display.setFrameListener(frame);
    Floor.display.setKeyListener(e => ui().handleKey(e));
    Floor.display.setImageResolver(resolveImage);
    Floor.display.init();
    document.getElementById('open-display').addEventListener('click', () => {
      Floor.display.open();
      frame();
    });
    document.getElementById('big-open').addEventListener('click', () => {
      bigRenderer = Floor.display.createRenderer(ui().openBigPreview());
      frame();
    });
    document.getElementById('big-close').addEventListener('click', () => {
      bigRenderer = null;
      ui().closeBigPreview();
    });
    window.addEventListener('beforeunload', warnBeforeUnload);
    setInterval(frame, 100);

    document.getElementById('pick-folder').addEventListener('click', () => loadLibrary(Floor.categories.pickFolder));
    document.getElementById('restore-folder').addEventListener('click', () => loadLibrary(Floor.categories.restoreLastFolder));
    ui().showRestoreButton(await Floor.categories.lastFolderName());
  }

  Floor.app = {
    getLibrary: () => library,
    getState: () => state,
    getDuel: () => duel,
  };

  document.addEventListener('DOMContentLoaded', init);
})();
