// Wires all modules together and starts the app.
(function () {
  'use strict';
  window.Floor = window.Floor || {};
  const L = Floor.logic;
  const ui = () => Floor.operator;

  let library = null;
  let state = null; // { players, settings }

  function newPlayerId() {
    return 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  }

  function persist() {
    if (!Floor.storage.saveState(state)) ui().showAppMessage('Nie udało się zapisać danych w przeglądarce.', true);
  }

  function setPlayers(players) {
    state.players = players;
    persist();
    ui().renderPlayers(state.players, library);
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
    removePlayer: id => setPlayers(state.players.filter(p => p.id !== id)),
    resetScores: () => setPlayers(L.resetScores(state.players)),
  };

  function changeSettings(raw) {
    state.settings = L.sanitizeSettings(raw);
    persist();
    ui().renderSettings(state.settings);
  }

  function folderErrorText(e) {
    if (e && e.name === 'NotFoundError') return 'Folder nie istnieje — został przeniesiony lub usunięty? Wybierz go ponownie.';
    if (e && e.name === 'NotAllowedError') return 'Brak zgody na odczyt folderu.';
    return 'Nie udało się wczytać folderu: ' + (e && e.message ? e.message : e);
  }

  async function loadLibrary(loader) {
    try {
      const next = await loader();
      if (!next) return;
      Floor.categories.releaseUrls();
      library = next;
      ui().renderCategories(library);
      ui().renderPlayers(state.players, library);
      if (library.source === 'handle') ui().showRestoreButton(library.rootName);
    } catch (e) {
      console.error(e);
      ui().showFolderMessage(folderErrorText(e), true);
    }
  }

  async function init() {
    const loaded = Floor.storage.loadState();
    state = { players: loaded.players, settings: loaded.settings };
    if (loaded.warning) ui().showAppMessage(loaded.warning, true);

    ui().bindPlayers(playerHandlers);
    ui().bindSettings(changeSettings);
    ui().renderPlayers(state.players, library);
    ui().renderSettings(state.settings);
    ui().renderCategories(null);

    document.getElementById('pick-folder').addEventListener('click', () => loadLibrary(Floor.categories.pickFolder));
    document.getElementById('restore-folder').addEventListener('click', () => loadLibrary(Floor.categories.restoreLastFolder));
    ui().showRestoreButton(await Floor.categories.lastFolderName());
  }

  Floor.app = {
    getLibrary: () => library,
    getState: () => state,
  };

  document.addEventListener('DOMContentLoaded', init);
})();
