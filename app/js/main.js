// Wires all modules together and starts the app.
(function () {
  'use strict';
  window.Floor = window.Floor || {};
  const ui = () => Floor.operator;

  let library = null;

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
      if (library.source === 'handle') ui().showRestoreButton(library.rootName);
    } catch (e) {
      console.error(e);
      ui().showFolderMessage(folderErrorText(e), true);
    }
  }

  async function init() {
    ui().renderCategories(null);
    document.getElementById('pick-folder').addEventListener('click', () => loadLibrary(Floor.categories.pickFolder));
    document.getElementById('restore-folder').addEventListener('click', () => loadLibrary(Floor.categories.restoreLastFolder));
    ui().showRestoreButton(await Floor.categories.lastFolderName());
  }

  Floor.app = {
    getLibrary: () => library,
  };

  document.addEventListener('DOMContentLoaded', init);
})();
