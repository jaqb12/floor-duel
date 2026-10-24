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
    renderDuelSetup();
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

  // ---------- duel setup ----------

  let duelHandlers = null;
  let liveState = null; // duel.state from the last render, null when there is no live duel

  function setText(node, text) {
    if (node.textContent !== text) node.textContent = text;
  }

  function setupValues() {
    return {
      challengerId: $('duel-challenger').value || null,
      opponentId: $('duel-opponent').value || null,
      category: $('duel-category').value || '',
      firstSide: document.querySelector('input[name="duel-first"]:checked').value,
    };
  }

  function categorySummary() {
    return library ? library.categories.map(c => ({ name: c.name, count: c.images.length })) : null;
  }

  function fillPlayerSelect(select, otherId) {
    const current = select.value;
    select.textContent = '';
    select.append(new Option('— wybierz —', ''));
    for (const p of L.rankPlayers(players)) {
      const option = new Option(p.name + ' (' + p.wins + '–' + p.losses + ')', p.id);
      option.disabled = p.id === otherId;
      select.append(option);
    }
    select.value = players.some(p => p.id === current && p.id !== otherId) ? current : '';
  }

  // Keeps the current choices when players or categories change.
  function renderDuelSetup() {
    fillPlayerSelect($('duel-challenger'), $('duel-opponent').value);
    fillPlayerSelect($('duel-opponent'), $('duel-challenger').value);
    const select = $('duel-category');
    const current = select.value;
    const names = library ? library.categories.filter(c => c.images.length).map(c => c.name) : [];
    select.textContent = '';
    select.append(new Option(library ? '— wybierz kategorię —' : '— najpierw wczytaj folder —', ''));
    for (const cat of library ? library.categories : []) {
      if (cat.images.length) select.append(new Option(cat.name + ' (' + cat.images.length + ')', cat.name));
    }
    select.value = names.includes(current) ? current : '';
  }

  function notifySetup() {
    renderDuelSetup();
    duelHandlers.setupChanged(setupValues());
  }

  function resetDuelSetup() {
    $('duel-setup').reset();
    renderDuelSetup();
  }

  function showSetupProblem(problem) {
    showMessage('duel-problem', problem || 'Gotowe — START albo Enter.', !!problem);
    $('duel-start').disabled = !!problem;
  }

  // ---------- live duel ----------

  function renderClock(box, player, id, info) {
    const { duel, now } = info;
    const ms = duel.getClock(id, now);
    setText(box.querySelector('.c-name'), player ? player.name : '?');
    setText(box.querySelector('.c-time'), String(L.clockSeconds(ms)));
    const s = duel.stats[id];
    setText(box.querySelector('.c-stats'), '✓ ' + s.correct + ' · pas ' + s.passes);
    if (player && box.style.getPropertyValue('--player') !== player.color) box.style.setProperty('--player', player.color);
    box.classList.toggle('active', duel.state !== 'finished' && duel.activeId === id);
    box.querySelector('.c-time').classList.toggle('low', ms <= 10000);
  }

  let previewKey = null;

  function renderPreview(key) {
    if (key === previewKey) return;
    previewKey = key;
    const img = $('live-photo');
    img.removeAttribute('src');
    if (!key) return;
    duelHandlers.imageUrl(key).then(url => {
      if (previewKey === key) img.src = url;
    }, () => { /* broken image: skipped by the app */ });
  }

  function poolText(duel, skipped) {
    const parts = ['zdjęcie ' + duel.deckPos + ' z ' + duel.deck.length];
    if (duel.reshuffles) parts.push('pula wyczerpana — powtórki');
    if (skipped) parts.push('pominięte uszkodzone: ' + skipped);
    return parts.join(' · ');
  }

  // info: { duel, now, answer, hideAnswer, holdingAnswer, skipped }. Cheap enough to call every frame.
  function renderDuel(info) {
    const { duel } = info;
    const live = !!duel && duel.state !== 'ready';
    liveState = live ? duel.state : null;
    $('duel-setup').hidden = live;
    $('duel-live').hidden = !live;
    if (!live) {
      renderPreview(null);
      setText($('big-answer'), '');
      return;
    }
    const state = duel.state;
    const revealing = state === 'reveal' || (state === 'paused' && duel.pausedFrom === 'reveal');
    const find = id => players.find(p => p.id === id);
    setText($('live-category'), duel.category);
    setText($('live-pool'), poolText(duel, info.skipped));
    renderPreview(duel.current);
    const hidden = info.hideAnswer && !info.holdingAnswer && !revealing && state !== 'finished';
    for (const node of [$('live-answer'), $('big-answer')]) {
      setText(node, info.answer || '');
      node.classList.toggle('hidden-answer', hidden);
    }
    let hint = '';
    if (state === 'paused') hint = 'Pauza — Esc, żeby wznowić.';
    else if (state === 'reveal') hint = 'Pas — gracze widzą odpowiedź, zegar biegnie.';
    else if (info.hideAnswer && state === 'running') hint = 'Odpowiedź ukryta — przytrzymaj H, żeby ją zobaczyć.';
    setText($('live-hint'), hint);
    renderClock($('live-left'), find(duel.challengerId), duel.challengerId, info);
    renderClock($('live-right'), find(duel.opponentId), duel.opponentId, info);

    const finished = state === 'finished';
    $('live-correct').disabled = state !== 'running';
    $('live-pass').disabled = state !== 'running';
    $('live-pause').disabled = finished;
    setText($('live-pause'), state === 'paused' ? 'WZNÓW (Esc)' : 'PAUZA (Esc)');
    $('live-result').hidden = !finished;
    $('live-correct').parentElement.hidden = finished;
    if (finished) {
      const winner = find(duel.winnerId);
      const loser = find(duel.loserId);
      setText($('live-winner'), 'Wygrywa ' + (winner ? winner.name : '?') + '! ' + (loser ? loser.name : '?') + ' — koniec czasu.');
      setText($('live-cancel'), 'Unieważnij (nie zapisuj wyniku)');
    } else {
      setText($('live-cancel'), 'Unieważnij pojedynek');
    }
  }

  // ---------- keyboard (SPEC §7.2), shared by both windows ----------

  const DEBOUNCE_MS = 250;
  const lastPress = {};

  function isTyping(target) {
    if (!target || !target.tagName) return false;
    if (target.isContentEditable || target.tagName === 'TEXTAREA') return true;
    return target.tagName === 'INPUT' && ['text', 'number', 'search'].includes(target.type);
  }

  function debounced(code) {
    const now = performance.now();
    if (now - (lastPress[code] || 0) < DEBOUNCE_MS) return true;
    lastPress[code] = now;
    return false;
  }

  function handleKey(e) {
    if (!duelHandlers || isTyping(e.target) || e.ctrlKey || e.altKey || e.metaKey) return;
    if (e.type === 'keyup') {
      if (e.code === 'KeyH') duelHandlers.holdAnswer(false);
      if (e.code === 'Space') e.preventDefault();
      return;
    }
    switch (e.code) {
      case 'Space':
        e.preventDefault();
        if (!e.repeat && !debounced('Space')) duelHandlers.correct();
        break;
      case 'KeyP':
        if (!e.repeat && !debounced('KeyP')) duelHandlers.pass();
        break;
      case 'Escape':
        if (!e.repeat) duelHandlers.togglePause();
        break;
      case 'Enter':
        if (!e.repeat && duelHandlers.start()) e.preventDefault();
        break;
      case 'KeyH':
        duelHandlers.holdAnswer(true);
        break;
    }
  }

  // handlers: setupChanged(setup) , start() -> bool, correct(), pass(), togglePause(),
  // holdAnswer(on), confirm(), cancel(), imageUrl(key) -> Promise<url>
  function bindDuel(handlers) {
    duelHandlers = handlers;
    const form = $('duel-setup');
    $('duel-challenger').addEventListener('change', notifySetup);
    $('duel-opponent').addEventListener('change', () => {
      const opponent = players.find(p => p.id === $('duel-opponent').value);
      renderDuelSetup();
      $('duel-category').value = L.defaultCategory(opponent, categorySummary());
      notifySetup();
    });
    $('duel-category').addEventListener('change', notifySetup);
    form.addEventListener('change', e => { if (e.target.name === 'duel-first') notifySetup(); });
    $('duel-random').addEventListener('click', () => {
      const id = L.randomChallenger(players, $('duel-opponent').value);
      if (id) $('duel-challenger').value = id;
      notifySetup();
    });
    $('duel-clear').addEventListener('click', () => {
      resetDuelSetup();
      notifySetup();
    });
    form.addEventListener('submit', e => {
      e.preventDefault();
      handlers.start();
    });
    $('live-correct').addEventListener('click', () => handlers.correct());
    $('live-pass').addEventListener('click', () => handlers.pass());
    $('live-pause').addEventListener('click', () => handlers.togglePause());
    $('live-confirm').addEventListener('click', () => handlers.confirm());
    $('live-cancel').addEventListener('click', () => {
      if (liveState && confirm('Unieważnić pojedynek? Wynik nie zostanie zapisany.')) handlers.cancel();
    });
    document.addEventListener('keydown', handleKey);
    document.addEventListener('keyup', handleKey);
    window.addEventListener('blur', () => handlers.holdAnswer(false));
  }

  // ---------- players window ----------

  const DISPLAY_STATUS = {
    closed: ['Okno graczy jest zamknięte.', false],
    open: ['Okno graczy otwarte. Przeciągnij je na telewizor i naciśnij F11.', false],
    lost: ['Okno graczy zamknęło się przy odświeżeniu panelu — kliknij „Otwórz ekran graczy”.', true],
    retry: ['Zamknięto stare okno graczy — kliknij „Otwórz ekran graczy” jeszcze raz.', true],
    blocked: ['Przeglądarka zablokowała okno — zezwól na wyskakujące okna dla tej strony i spróbuj ponownie.', true],
    reloaded: ['Okno graczy zostało odświeżone i straciło połączenie — kliknij „Otwórz ekran graczy”.', true],
  };

  function showDisplayStatus(status) {
    const [text, isError] = DISPLAY_STATUS[status] || ['', false];
    showMessage('display-status', text, isError);
    $('open-display').textContent = status === 'open' ? 'Pokaż ekran graczy' : 'Otwórz ekran graczy';
  }

  // ---------- big preview (SPEC §7.4) ----------

  // A fresh iframe each time, so key listeners never pile up. Returns its document.
  function openBigPreview() {
    const slot = $('big-slot');
    slot.textContent = '';
    const frame = el('iframe', 'big-frame');
    frame.title = 'Duży podgląd ekranu graczy';
    slot.append(frame);
    $('big-preview').hidden = false;
    frame.focus();
    return frame.contentDocument;
  }

  function closeBigPreview() {
    $('big-preview').hidden = true;
    $('big-slot').textContent = '';
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
    bindDuel,
    renderDuel,
    resetDuelSetup,
    showSetupProblem,
    handleKey,
    openBigPreview,
    closeBigPreview,
  };
})();
