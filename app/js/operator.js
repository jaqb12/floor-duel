// Operator UI and keyboard handling.
(function () {
  'use strict';
  window.Floor = window.Floor || {};
  const L = Floor.logic;

  const $ = id => document.getElementById(id);

  // Polish plural: 1 zdjęcie, 2–4 zdjęcia, 5+ zdjęć (12–14 too).
  function plural(n, one, few, many) {
    if (n === 1) return one;
    const tens = n % 100;
    return n % 10 >= 2 && n % 10 <= 4 && (tens < 12 || tens > 14) ? few : many;
  }

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function button(text, action, title) {
    const b = el('button', 'small', text);
    b.type = 'button';
    b.dataset.action = action;
    if (title) b.title = title;
    return b;
  }

  function showMessage(id, text, isError) {
    const box = $(id);
    box.textContent = text || '';
    box.className = isError ? 'message error' : 'message';
  }

  const showAppMessage = (text, isError) => showMessage('app-message', text, isError);
  const showFolderMessage = (text, isError) => showMessage('folder-message', text, isError);

  // ---------- categories ----------

  function categoryItem(cat) {
    const n = cat.images.length;
    const li = el('li', 'category' + (n === 0 ? ' category-empty' : ''));
    const head = el('div', 'category-head');
    head.append(el('span', 'category-name', cat.name), el('span', 'category-count', n + ' ' + plural(n, 'zdjęcie', 'zdjęcia', 'zdjęć')));
    li.append(head);
    if (n === 0) {
      li.append(el('div', 'note', 'Brak zdjęć — nie można wybrać tej kategorii.'));
    } else if (n < L.MIN_RECOMMENDED_IMAGES) {
      li.append(el('div', 'note warn', '⚠ Mniej niż ' + L.MIN_RECOMMENDED_IMAGES + ' zdjęć — pojedynek może je wyczerpać.'));
    }
    if (cat.heic) {
      li.append(el('div', 'note warn', '⚠ ' + cat.heic + ' ' + plural(cat.heic, 'plik', 'pliki', 'plików') + ' HEIC — przekonwertuj na JPG.'));
    }
    if (cat.skipped) {
      li.append(el('div', 'note', 'Pominięte inne pliki: ' + cat.skipped));
    }
    return li;
  }

  function renderCategories(library) {
    const list = $('category-list');
    list.textContent = '';
    if (!library) {
      $('folder-name').textContent = 'Nie wybrano folderu z kategoriami.';
      return;
    }
    const count = library.categories.length;
    $('folder-name').textContent = 'Folder „' + library.rootName + '”: ' + count + ' ' + plural(count, 'kategoria', 'kategorie', 'kategorii');
    if (!count) {
      showFolderMessage('W tym folderze nie ma podfolderów. Każdy podfolder to jedna kategoria.', true);
    } else if (library.source === 'files') {
      showFolderMessage('Ta przeglądarka nie zapamięta folderu — po odświeżeniu trzeba go wskazać ponownie.');
    } else {
      showFolderMessage('');
    }
    for (const cat of library.categories) list.append(categoryItem(cat));
  }

  function showRestoreButton(folderName) {
    const b = $('restore-folder');
    b.hidden = !folderName;
    if (folderName) b.textContent = 'Wczytaj ostatni folder: ' + folderName;
  }

  // ---------- players ----------

  let players = [];
  let library = null;
  let editingId = null;
  let playerHandlers = null;

  // null = no folder loaded, so we can't tell whether a category exists.
  function categoryStatus(name) {
    if (!name || !library) return null;
    const cat = library.categories.find(c => c.name === name);
    if (!cat) return 'brak w folderze';
    return cat.images.length ? null : 'brak zdjęć';
  }

  function renderCategorySelect() {
    const select = $('player-category');
    const current = select.value;
    const editing = players.find(p => p.id === editingId);
    const names = library ? library.categories.filter(c => c.images.length).map(c => c.name) : [];
    if (editing && editing.category && !names.includes(editing.category)) names.push(editing.category);
    select.textContent = '';
    select.append(new Option('— bez kategorii —', ''));
    for (const name of names) {
      const status = categoryStatus(name);
      select.append(new Option(status ? name + ' (' + status + ')' : name, name));
    }
    select.value = names.includes(current) ? current : '';
  }

  function playerItem(p, index) {
    const li = el('li', 'player');
    li.dataset.id = p.id;
    const swatch = el('span', 'swatch');
    swatch.style.background = p.color;
    const info = el('div', 'player-info');
    const name = el('div', 'player-name', p.name);
    name.style.color = p.color;
    info.append(name);
    if (p.category) {
      const status = categoryStatus(p.category);
      info.append(el('div', status ? 'note warn' : 'note', (status ? '⚠ ' : '') + p.category + (status ? ' — ' + status : '')));
    }
    const score = el('span', 'score', p.wins + '–' + p.losses);
    score.title = 'wygrane–porażki';
    const actions = el('div', 'player-actions');
    actions.append(
      button('+1', 'win-plus', 'Dodaj wygraną'),
      button('−1', 'win-minus', 'Odejmij wygraną'),
      button('Edytuj', 'edit'),
      button('Usuń', 'delete'));
    li.append(el('span', 'rank', (index + 1) + '.'), swatch, info, score, actions);
    return li;
  }

  function renderPlayers(nextPlayers, nextLibrary) {
    players = nextPlayers;
    library = nextLibrary;
    if (editingId && !players.some(p => p.id === editingId)) resetPlayerForm();
    const list = $('player-list');
    list.textContent = '';
    L.rankPlayers(players).forEach((p, i) => list.append(playerItem(p, i)));
    $('players-empty').hidden = players.length > 0;
    $('reset-scores').hidden = players.length === 0;
    renderCategorySelect();
    if (!editingId && !$('player-name').value) $('player-color').value = L.nextColor(players);
  }

  function resetPlayerForm() {
    editingId = null;
    $('player-form').reset();
    $('player-color').value = L.nextColor(players);
    $('player-submit').textContent = 'Dodaj gracza';
    $('player-cancel').hidden = true;
    showMessage('player-message', '');
    renderCategorySelect();
  }

  function startEdit(id) {
    const p = players.find(x => x.id === id);
    if (!p) return;
    editingId = id;
    renderCategorySelect();
    $('player-name').value = p.name;
    $('player-color').value = p.color;
    $('player-category').value = p.category || '';
    $('player-submit').textContent = 'Zapisz zmiany';
    $('player-cancel').hidden = false;
    showMessage('player-message', '');
    $('player-name').focus();
  }

  function onListClick(e) {
    const b = e.target.closest('button[data-action]');
    if (!b) return;
    const id = b.closest('li').dataset.id;
    const p = players.find(x => x.id === id);
    if (!p) return;
    switch (b.dataset.action) {
      case 'win-plus': playerHandlers.adjustWins(id, 1); break;
      case 'win-minus': playerHandlers.adjustWins(id, -1); break;
      case 'edit': startEdit(id); break;
      case 'delete':
        if (confirm('Usunąć gracza „' + p.name + '”? Jego wyniki przepadną.')) playerHandlers.removePlayer(id);
        break;
    }
  }

  // handlers: savePlayer(data) -> error message | null, adjustWins(id, delta), removePlayer(id), resetScores()
  function bindPlayers(handlers) {
    playerHandlers = handlers;
    $('player-name').maxLength = L.MAX_NAME_LENGTH;
    $('player-form').addEventListener('submit', e => {
      e.preventDefault();
      const error = handlers.savePlayer({
        id: editingId,
        name: $('player-name').value,
        color: $('player-color').value,
        category: $('player-category').value || null,
      });
      if (error) {
        showMessage('player-message', error, true);
        $('player-name').focus();
        return;
      }
      resetPlayerForm();
      $('player-name').focus();
    });
    $('player-cancel').addEventListener('click', resetPlayerForm);
    $('player-list').addEventListener('click', onListClick);
    $('reset-scores').addEventListener('click', () => {
      if (confirm('Wyzerować wygrane i porażki wszystkich graczy?')) handlers.resetScores();
    });
  }

  // ---------- players window ----------

  const DISPLAY_STATUS = {
    closed: ['Okno graczy jest zamknięte.', false],
    open: ['Okno graczy otwarte. Przeciągnij je na telewizor i naciśnij F11.', false],
    lost: ['Okno graczy zamknęło się przy odświeżeniu panelu — kliknij „Otwórz ekran graczy”.', true],
    retry: ['Zamknięto stare okno graczy — kliknij „Otwórz ekran graczy” jeszcze raz.', true],
    blocked: ['Przeglądarka zablokowała okno — zezwól na wyskakujące okna dla tej strony i spróbuj ponownie.', true],
  };

  function showDisplayStatus(status) {
    const [text, isError] = DISPLAY_STATUS[status] || ['', false];
    showMessage('display-status', text, isError);
    $('open-display').textContent = status === 'open' ? 'Pokaż ekran graczy' : 'Otwórz ekran graczy';
  }

  // ---------- settings ----------

  function renderSettings(settings) {
    $('set-duel').value = settings.duelSeconds;
    $('set-pass').value = settings.passPenaltySeconds;
    $('set-sound').checked = settings.sound;
    $('set-hide').checked = settings.hideAnswer;
  }

  function bindSettings(onChange) {
    const [duelMin, duelMax] = L.SETTING_LIMITS.duelSeconds;
    const [passMin, passMax] = L.SETTING_LIMITS.passPenaltySeconds;
    Object.assign($('set-duel'), { min: duelMin, max: duelMax });
    Object.assign($('set-pass'), { min: passMin, max: passMax });
    $('settings-form').addEventListener('submit', e => e.preventDefault());
    $('settings-form').addEventListener('change', () => onChange({
      duelSeconds: $('set-duel').value,
      passPenaltySeconds: $('set-pass').value,
      sound: $('set-sound').checked,
      hideAnswer: $('set-hide').checked,
    }));
  }

  Floor.operator = {
    plural,
    showAppMessage,
    showFolderMessage,
    renderCategories,
    showRestoreButton,
    renderPlayers,
    bindPlayers,
    renderSettings,
    bindSettings,
    showDisplayStatus,
  };
})();
