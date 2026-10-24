// Operator UI and keyboard handling.
(function () {
  'use strict';
  window.Floor = window.Floor || {};
  const L = Floor.logic;

  const $ = id => document.getElementById(id);
  const t = (key, params) => Floor.i18n.t(key, params);

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
    const level = n === 0 ? 'empty' : n < L.MIN_RECOMMENDED_IMAGES ? 'low' : 'ok';
    const li = el('li', 'category category-' + level);
    li.dataset.name = cat.name.toLocaleLowerCase('pl');
    const count = el('span', 'count', String(n));
    count.title = t('categories.photos', { n });
    li.append(el('span', 'category-name', cat.name), count);
    const notes = [];
    if (level === 'empty') notes.push(['note', t('categories.empty')]);
    if (level === 'low') notes.push(['note warn', t('categories.low', { min: L.MIN_RECOMMENDED_IMAGES })]);
    if (cat.heic) notes.push(['note warn', t('categories.heic', { n: cat.heic })]);
    if (cat.skipped) notes.push(['note', t('categories.skipped', { n: cat.skipped })]);
    for (const [className, text] of notes) li.append(el('span', className + ' category-note', text));
    return li;
  }

  function applyCategoryFilter() {
    const query = $('category-filter').value.trim().toLocaleLowerCase('pl');
    for (const li of $('category-list').children) li.hidden = !!query && !li.dataset.name.includes(query);
  }

  let shownLibrary = null;
  let rememberedFolder = null;

  function renderCategories(library) {
    const list = $('category-list');
    list.textContent = '';
    const filter = $('category-filter');
    shownLibrary = library;
    showRestoreButton(rememberedFolder);
    $('pick-folder').textContent = t(library ? 'categories.change' : 'categories.pick');
    if (!library) {
      $('folder-name').textContent = t('categories.noFolder');
      $('categories-count').textContent = '';
      filter.hidden = true;
      return;
    }
    const count = library.categories.length;
    $('folder-name').textContent = '📁 ' + library.rootName;
    $('categories-count').textContent = t('categories.count', { n: count });
    filter.hidden = count <= 8;
    if (!count) {
      showFolderMessage(t('categories.noSubfolders'), true);
    } else if (library.source === 'files') {
      showFolderMessage(t('categories.notRemembered'));
    } else {
      showFolderMessage('');
    }
    let level = null;
    for (const cat of library.categories) {
      if (cat.level !== level) {
        level = cat.level;
        // Empty data-name: level headers are hidden while filtering.
        const header = el('li', 'category-level', level);
        header.dataset.name = '';
        list.append(header);
      }
      list.append(categoryItem(cat));
    }
    applyCategoryFilter();
  }

  // Appends options to a <select>, grouped by difficulty level (categories come sorted by level).
  function appendCategoryOptions(select, categories, label) {
    let parent = select;
    for (const cat of categories) {
      if (cat.level && (parent === select || parent.label !== cat.level)) {
        parent = el('optgroup');
        parent.label = cat.level;
        select.append(parent);
      }
      parent.append(new Option(label(cat), cat.name));
    }
  }

  // Hidden while that same folder is already loaded.
  function showRestoreButton(folderName) {
    const b = $('restore-folder');
    rememberedFolder = folderName;
    b.hidden = !folderName || (shownLibrary && shownLibrary.source === 'handle' && shownLibrary.rootName === folderName);
    if (folderName) b.textContent = t('categories.restore', { name: folderName });
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
    if (!cat) return t('players.categoryMissing');
    return cat.images.length ? null : t('players.categoryEmpty');
  }

  function renderCategorySelect() {
    const select = $('player-category');
    const current = select.value;
    const editing = players.find(p => p.id === editingId);
    const categories = library ? library.categories.filter(c => c.images.length) : [];
    const names = categories.map(c => c.name);
    select.textContent = '';
    select.append(new Option(t('players.noCategory'), ''));
    appendCategoryOptions(select, categories, cat => cat.name);
    if (editing && editing.category && !names.includes(editing.category)) {
      const status = categoryStatus(editing.category);
      select.append(new Option(editing.category + ' (' + status + ')', editing.category));
      names.push(editing.category);
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
    score.title = t('players.score');
    const actions = el('div', 'player-actions');
    actions.append(
      button('+1', 'win-plus', t('players.winPlus')),
      button('−1', 'win-minus', t('players.winMinus')),
      button('✎', 'edit', t('players.edit')),
      button('✕', 'delete', t('players.delete')));
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
    $('players-count').textContent = players.length ? String(players.length) : '';
    $('reset-scores').hidden = players.length === 0;
    renderCategorySelect();
    renderPlayerSubmit();
    if (!editingId && !$('player-name').value) $('player-color').value = L.nextColor(players);
    renderDuelSetup();
  }

  function renderPlayerSubmit() {
    $('player-submit').textContent = t(editingId ? 'players.save' : 'players.add');
  }

  function resetPlayerForm() {
    editingId = null;
    $('player-form').reset();
    $('player-color').value = L.nextColor(players);
    renderPlayerSubmit();
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
    renderPlayerSubmit();
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
        if (confirm(t('players.confirmDelete', { name: p.name }))) playerHandlers.removePlayer(id);
        break;
    }
  }

  // handlers: savePlayer(data) -> problem ({ key, params }) | null, adjustWins(id, delta), removePlayer(id), resetScores()
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
        showMessage('player-message', Floor.i18n.problemText(error), true);
        $('player-name').focus();
        return;
      }
      resetPlayerForm();
      $('player-name').focus();
    });
    $('player-cancel').addEventListener('click', resetPlayerForm);
    $('player-list').addEventListener('click', onListClick);
    $('reset-scores').addEventListener('click', () => {
      if (confirm(t('players.confirmReset'))) handlers.resetScores();
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
    select.append(new Option(t('duel.choose'), ''));
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
    const categories = library ? library.categories.filter(c => c.images.length) : [];
    select.textContent = '';
    select.append(new Option(t(library ? 'duel.chooseCategory' : 'duel.loadFolderFirst'), ''));
    appendCategoryOptions(select, categories, cat => cat.name + ' (' + cat.images.length + ')');
    select.value = categories.some(c => c.name === current) ? current : '';
  }

  function notifySetup() {
    renderDuelSetup();
    duelHandlers.setupChanged(setupValues());
  }

  function resetDuelSetup() {
    $('duel-setup').reset();
    renderDuelSetup();
  }

  // problem: { key, params } from Floor.logic.duelSetupProblem, or null.
  function showSetupProblem(problem) {
    showMessage('duel-problem', problem ? Floor.i18n.problemText(problem) : t('duel.ready'), !!problem);
    $('duel-start').disabled = !!problem;
  }

  // ---------- live duel ----------

  function renderClock(box, player, id, info) {
    const { duel, now } = info;
    const ms = duel.getClock(id, now);
    setText(box.querySelector('.c-name'), player ? player.name : '?');
    setText(box.querySelector('.c-time'), String(L.clockSeconds(ms)));
    const s = duel.stats[id];
    setText(box.querySelector('.c-stats'), t('live.stats', { correct: s.correct, passes: s.passes }));
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
    if (!duel.deck.length) return '';
    const parts = [t('live.poolPosition', { pos: duel.deckPos, total: duel.deck.length })];
    if (duel.reshuffles) parts.push(t('live.poolExhausted'));
    if (skipped) parts.push(t('live.skippedBroken', { n: skipped }));
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
    if (state === 'countdown') hint = t('live.countdown', { n: L.clockSeconds(duel.countdownUntil - info.now) });
    else if (state === 'paused') hint = t('live.paused');
    else if (state === 'reveal') hint = t('live.revealing');
    else if (info.hideAnswer && state === 'running') hint = t('live.answerHidden');
    setText($('live-hint'), hint);
    renderClock($('live-left'), find(duel.challengerId), duel.challengerId, info);
    renderClock($('live-right'), find(duel.opponentId), duel.opponentId, info);

    const finished = state === 'finished';
    $('live-correct').disabled = state !== 'running';
    $('live-pass').disabled = state !== 'running';
    $('live-pause').disabled = finished || state === 'countdown';
    setText($('live-pause'), t(state === 'paused' ? 'live.resume' : 'live.pause'));
    $('live-result').hidden = !finished;
    $('live-correct').parentElement.hidden = finished;
    if (finished) {
      const winner = find(duel.winnerId);
      const loser = find(duel.loserId);
      setText($('live-winner'), t('live.winner', { winner: winner ? winner.name : '?', loser: loser ? loser.name : '?' }));
      setText($('live-cancel'), t('live.cancelFinished'));
    } else {
      setText($('live-cancel'), t('live.cancel'));
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
    if (document.querySelector('dialog[open]')) return;
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
      if (liveState && confirm(t('live.confirmCancel'))) handlers.cancel();
    });
    document.addEventListener('keydown', handleKey);
    document.addEventListener('keyup', handleKey);
    window.addEventListener('blur', () => handlers.holdAnswer(false));
  }

  // ---------- players window ----------

  // Statuses shown as errors; texts are 'display.pill.<status>' and 'display.banner.<status>'.
  const DISPLAY_ERRORS = ['lost', 'retry', 'blocked', 'reloaded'];
  let displayStatus = 'closed';

  function showDisplayStatus(status) {
    displayStatus = status;
    const isError = DISPLAY_ERRORS.includes(status);
    $('display-pill').dataset.status = isError ? 'error' : status;
    $('display-pill-text').textContent = t('display.pill.' + status);
    showMessage('display-status', status === 'closed' ? '' : t('display.banner.' + status), isError);
    $('open-display').textContent = t(status === 'open' ? 'display.show' : 'display.open');
  }

  // ---------- sound effects and music ----------

  let musicPlaying = false;

  function renderMusic(playing) {
    musicPlaying = playing;
    for (const b of document.querySelectorAll('.music-toggle')) {
      b.textContent = t(playing ? 'sounds.stopMusic' : 'sounds.music');
      b.classList.toggle('playing', playing);
    }
  }

  // handlers: toggleMusic(), play(name)
  function bindSounds(handlers) {
    for (const b of document.querySelectorAll('.music-toggle')) b.addEventListener('click', handlers.toggleMusic);
    for (const b of document.querySelectorAll('[data-sound]')) b.addEventListener('click', () => handlers.play(b.dataset.sound));
  }

  // ---------- big preview (SPEC §7.4) ----------

  // A fresh iframe each time, so key listeners never pile up. Returns its document.
  function openBigPreview() {
    const slot = $('big-slot');
    slot.textContent = '';
    const frame = el('iframe', 'big-frame');
    frame.title = t('big.frameTitle');
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
    $('set-volume').value = settings.volume;
    $('set-language').value = Floor.i18n.getLanguage();
    showMessage('sound-note', settings.sound ? '' : t('sounds.off'));
    $('set-volume').disabled = !settings.sound;
  }

  function bindSettings(onChange) {
    const [duelMin, duelMax] = L.SETTING_LIMITS.duelSeconds;
    const [passMin, passMax] = L.SETTING_LIMITS.passPenaltySeconds;
    Object.assign($('set-duel'), { min: duelMin, max: duelMax });
    Object.assign($('set-pass'), { min: passMin, max: passMax });
    Object.assign($('set-volume'), { min: L.SETTING_LIMITS.volume[0], max: L.SETTING_LIMITS.volume[1] });
    for (const [code, name] of Object.entries(Floor.i18n.LANGUAGE_NAMES)) $('set-language').append(new Option(name, code));
    const dialog = $('settings-dialog');
    $('settings-open').addEventListener('click', () => dialog.showModal());
    // Sound controls sit in the top bar, the rest in the settings dialog.
    const emit = () => onChange({
      duelSeconds: $('set-duel').value,
      passPenaltySeconds: $('set-pass').value,
      sound: $('set-sound').checked,
      hideAnswer: $('set-hide').checked,
      volume: $('set-volume').value,
      language: $('set-language').value,
    });
    for (const id of ['set-duel', 'set-pass', 'set-sound', 'set-hide', 'set-volume', 'set-language']) {
      $(id).addEventListener('change', emit);
    }
    $('category-filter').addEventListener('input', applyCategoryFilter);
    // Live volume while dragging; the final value is saved on 'change'.
    $('set-volume').addEventListener('input', () => Floor.sound.setVolume(Number($('set-volume').value)));
  }

  // After a language change: redraws every text that isn't marked with data-i18n.
  function relabel() {
    renderCategories(shownLibrary);
    renderPlayers(players, library);
    showDisplayStatus(displayStatus);
    renderMusic(musicPlaying);
  }

  Floor.operator = {
    relabel,
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
    bindSounds,
    renderMusic,
  };
})();
