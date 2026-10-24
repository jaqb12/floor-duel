// Translations (English, Polish) and helpers that apply them to the operator page.
// The dictionaries and t() have no DOM, so they are testable in Node.
(function (root) {
  'use strict';

  const DEFAULT_LANGUAGE = 'en';
  // Shown in the language picker, each in its own language.
  const LANGUAGE_NAMES = { en: 'English', pl: 'Polski' };

  // A value is a string with {placeholders}, or plural forms picked by params.n
  // (keys as returned by Intl.PluralRules: one, few, many, other).
  const MESSAGES = {
    en: {
      'app.operatorTitle': 'Floor Duel — operator panel',
      'app.displayTitle': 'Floor Duel — players screen',

      'top.subtitle': 'operator panel',
      'top.displayGroup': 'Players screen',
      'top.bigOpen': 'Big preview',
      'top.bigOpenTitle': 'Single-screen mode: the players screen fills the whole panel',
      'top.soundGroup': 'Sound',
      'top.sound': '🔊 Sound',
      'top.soundTitle': 'Turn all sounds on / off',
      'top.volume': 'Volume',
      'top.language': 'Language',
      'top.settings': '⚙ Settings',

      'display.open': 'Open players screen',
      'display.show': 'Show players screen',
      'display.pill.closed': 'Players screen: closed',
      'display.pill.open': 'Players screen: open',
      'display.pill.lost': 'Players screen: closed',
      'display.pill.retry': 'Players screen: click again',
      'display.pill.blocked': 'Players screen: blocked',
      'display.pill.reloaded': 'Players screen: disconnected',
      'display.banner.open': 'The players window is open. Drag it to the TV and press F11.',
      'display.banner.lost': 'The players window closed when the panel was refreshed — click “Open players screen”.',
      'display.banner.retry': 'The old players window was closed — click “Open players screen” once more.',
      'display.banner.blocked': 'The browser blocked the window — allow pop-ups for this page and try again.',
      'display.banner.reloaded': 'The players window was refreshed and lost its connection — click “Open players screen”.',

      'players.title': 'Players',
      'players.name': 'Player name',
      'players.color': 'Player color',
      'players.category': 'Player category',
      'players.add': 'Add player',
      'players.save': 'Save',
      'players.cancel': 'Cancel',
      'players.empty': 'No players yet — add the first one.',
      'players.resetScores': 'Reset scores',
      'players.noCategory': '— no category —',
      'players.categoryMissing': 'not in the folder',
      'players.categoryEmpty': 'no photos',
      'players.score': 'wins–losses',
      'players.winPlus': 'Add a win',
      'players.winMinus': 'Remove a win',
      'players.edit': 'Edit',
      'players.delete': 'Delete',
      'players.confirmDelete': 'Delete player “{name}”? Their scores will be lost.',
      'players.confirmReset': 'Reset the wins and losses of all players?',
      'players.nameEmpty': 'Enter the player’s name.',
      'players.nameTaken': 'Player “{name}” already exists.',
      'players.cannotRemove': 'You can’t delete a player who is in the current duel.',

      'duel.title': 'Duel',
      'duel.challenger': 'Challenger',
      'duel.random': 'Pick a random challenger',
      'duel.opponent': 'Opponent',
      'duel.category': 'Category',
      'duel.first': 'Answers first',
      'duel.firstChallenger': 'challenger',
      'duel.firstOpponent': 'opponent',
      'duel.start': 'START',
      'duel.musicTitle': 'Music while getting ready — fades out on START',
      'duel.clear': 'Clear',
      'duel.choose': '— choose —',
      'duel.chooseCategory': '— choose a category —',
      'duel.loadFolderFirst': '— load a folder first —',
      'duel.ready': 'Ready — START or Enter.',

      'setup.needPlayers': 'Add at least 2 players.',
      'setup.needFolder': 'Load the categories folder.',
      'setup.needChallenger': 'Choose the challenger.',
      'setup.needOpponent': 'Choose the opponent.',
      'setup.samePlayer': 'The challenger and the opponent must be different players.',
      'setup.needCategory': 'Choose the duel category.',
      'setup.categoryEmpty': 'Category “{category}” has no photos.',

      'live.correct': 'CORRECT (Space)',
      'live.pass': 'PASS (P)',
      'live.pause': 'PAUSE (Esc)',
      'live.resume': 'RESUME (Esc)',
      'live.confirm': 'Confirm result',
      'live.cancel': 'Cancel duel',
      'live.cancelFinished': 'Cancel (don’t save the result)',
      'live.confirmCancel': 'Cancel the duel? The result won’t be saved.',
      'live.stats': '✓ {correct} · pass {passes}',
      'live.poolPosition': 'photo {pos} of {total}',
      'live.poolExhausted': 'pool used up — repeats',
      'live.skippedBroken': 'broken files skipped: {n}',
      'live.countdown': 'Countdown… {n}',
      'live.paused': 'Paused — press Esc to resume.',
      'live.revealing': 'Pass — the players see the answer, the clock is running.',
      'live.answerHidden': 'Answer hidden — hold H to see it.',
      'live.winner': '{winner} wins! {loser} ran out of time.',

      'shortcuts.title': 'Keyboard shortcuts',
      'shortcuts.space': 'Space',
      'shortcuts.start': 'START',
      'shortcuts.correct': 'correct',
      'shortcuts.pass': 'pass',
      'shortcuts.pause': 'pause',
      'shortcuts.hold': 'show answer (hold)',

      'sounds.title': 'Sound effects',
      'sounds.music': '🎵 Music',
      'sounds.stopMusic': '⏹ Stop music',
      'sounds.drumroll': '🥁 Drumroll',
      'sounds.fanfare': '🎺 Fanfare',
      'sounds.applause': '👏 Applause',
      'sounds.suspense': '💓 Suspense',
      'sounds.gong': '🔔 Gong',
      'sounds.wrong': '😬 Miss',
      'sounds.off': 'Sound is off — use the “Sound” switch at the top.',

      'categories.title': 'Categories',
      'categories.filter': 'Search categories…',
      'categories.pick': 'Choose folder…',
      'categories.change': 'Change folder…',
      'categories.restore': 'Load last folder: {name}',
      'categories.noFolder': 'No categories folder selected.',
      'categories.count': { one: '{n} category', other: '{n} categories' },
      'categories.photos': { one: '{n} photo', other: '{n} photos' },
      'categories.noSubfolders': 'This folder has no subfolders. Each subfolder is one category.',
      'categories.notRemembered': 'This browser won’t remember the folder — choose it again after a refresh.',
      'categories.empty': 'no photos — can’t be chosen',
      'categories.low': '⚠ fewer than {min} — photos may repeat',
      'categories.heic': '⚠ {n}× HEIC — convert to JPG',
      'categories.skipped': 'other files skipped: {n}',

      'levels.easy': 'Easy',
      'levels.normal': 'Normal',
      'levels.medium': 'Medium',
      'levels.hard': 'Hard',
      'levels.expert': 'Expert',

      'folder.finishDuelFirst': 'Finish or cancel the duel first.',
      'folder.notFound': 'The folder doesn’t exist — was it moved or deleted? Choose it again.',
      'folder.notAllowed': 'No permission to read the folder.',
      'folder.permissionNeeded': 'Couldn’t load the last folder automatically — the browser needs your permission. Click “Load last folder”.',
      'folder.permissionDenied': 'No permission to read the folder “{name}”.',
      'folder.loadFailed': 'Couldn’t load the folder: {error}',

      'storage.blocked': 'The browser blocks saving data — scores won’t survive a refresh.',
      'storage.corrupt': 'The saved data was corrupted — starting from scratch (backup: localStorage “{key}”).',
      'storage.saveFailed': 'Couldn’t save data in the browser.',

      'settings.title': 'Settings',
      'settings.duelSeconds': 'Duel time per player (s)',
      'settings.passPenalty': 'Pass penalty (s)',
      'settings.hideAnswer': 'Hide the answer (single-screen mode — to peek, hold H)',
      'settings.note': 'Changes are saved right away and apply from the next duel.',
      'settings.done': 'Done',

      'big.answer': 'Answer:',
      'big.close': 'Close preview',
      'big.frameTitle': 'Big preview of the players screen',

      'screen.pass': 'PASS',
      'screen.paused': 'PAUSED',
      'screen.ready': 'Get ready!',
      'screen.winner': 'Winner',
    },

    pl: {
      'app.operatorTitle': 'Floor Duel — panel operatora',
      'app.displayTitle': 'Floor Duel — ekran graczy',

      'top.subtitle': 'panel operatora',
      'top.displayGroup': 'Ekran graczy',
      'top.bigOpen': 'Duży podgląd',
      'top.bigOpenTitle': 'Tryb jednego ekranu: ekran graczy na całym panelu',
      'top.soundGroup': 'Dźwięk',
      'top.sound': '🔊 Dźwięk',
      'top.soundTitle': 'Włącz / wyłącz wszystkie dźwięki',
      'top.volume': 'Głośność',
      'top.language': 'Język',
      'top.settings': '⚙ Ustawienia',

      'display.open': 'Otwórz ekran graczy',
      'display.show': 'Pokaż ekran graczy',
      'display.pill.closed': 'Ekran graczy: zamknięty',
      'display.pill.open': 'Ekran graczy: otwarty',
      'display.pill.lost': 'Ekran graczy: zamknięty',
      'display.pill.retry': 'Ekran graczy: kliknij ponownie',
      'display.pill.blocked': 'Ekran graczy: zablokowany',
      'display.pill.reloaded': 'Ekran graczy: rozłączony',
      'display.banner.open': 'Okno graczy otwarte. Przeciągnij je na telewizor i naciśnij F11.',
      'display.banner.lost': 'Okno graczy zamknęło się przy odświeżeniu panelu — kliknij „Otwórz ekran graczy”.',
      'display.banner.retry': 'Zamknięto stare okno graczy — kliknij „Otwórz ekran graczy” jeszcze raz.',
      'display.banner.blocked': 'Przeglądarka zablokowała okno — zezwól na wyskakujące okna dla tej strony i spróbuj ponownie.',
      'display.banner.reloaded': 'Okno graczy zostało odświeżone i straciło połączenie — kliknij „Otwórz ekran graczy”.',

      'players.title': 'Gracze',
      'players.name': 'Imię gracza',
      'players.color': 'Kolor gracza',
      'players.category': 'Kategoria gracza',
      'players.add': 'Dodaj gracza',
      'players.save': 'Zapisz',
      'players.cancel': 'Anuluj',
      'players.empty': 'Brak graczy — dodaj pierwszego.',
      'players.resetScores': 'Wyzeruj wyniki',
      'players.noCategory': '— bez kategorii —',
      'players.categoryMissing': 'brak w folderze',
      'players.categoryEmpty': 'brak zdjęć',
      'players.score': 'wygrane–porażki',
      'players.winPlus': 'Dodaj wygraną',
      'players.winMinus': 'Odejmij wygraną',
      'players.edit': 'Edytuj',
      'players.delete': 'Usuń',
      'players.confirmDelete': 'Usunąć gracza „{name}”? Jego wyniki przepadną.',
      'players.confirmReset': 'Wyzerować wygrane i porażki wszystkich graczy?',
      'players.nameEmpty': 'Podaj imię gracza.',
      'players.nameTaken': 'Gracz „{name}” już istnieje.',
      'players.cannotRemove': 'Nie można usunąć gracza, który bierze udział w pojedynku.',

      'duel.title': 'Pojedynek',
      'duel.challenger': 'Wyzywający',
      'duel.random': 'Losuj wyzywającego',
      'duel.opponent': 'Rywal',
      'duel.category': 'Kategoria',
      'duel.first': 'Zaczyna odpowiadać',
      'duel.firstChallenger': 'wyzywający',
      'duel.firstOpponent': 'rywal',
      'duel.start': 'START',
      'duel.musicTitle': 'Muzyka na przygotowanie — wycisza się sama po START',
      'duel.clear': 'Wyczyść',
      'duel.choose': '— wybierz —',
      'duel.chooseCategory': '— wybierz kategorię —',
      'duel.loadFolderFirst': '— najpierw wczytaj folder —',
      'duel.ready': 'Gotowe — START albo Enter.',

      'setup.needPlayers': 'Dodaj co najmniej 2 graczy.',
      'setup.needFolder': 'Wczytaj folder z kategoriami.',
      'setup.needChallenger': 'Wybierz wyzywającego.',
      'setup.needOpponent': 'Wybierz rywala.',
      'setup.samePlayer': 'Wyzywający i rywal muszą być różnymi graczami.',
      'setup.needCategory': 'Wybierz kategorię pojedynku.',
      'setup.categoryEmpty': 'Kategoria „{category}” nie ma zdjęć.',

      'live.correct': 'DOBRZE (Spacja)',
      'live.pass': 'PAS (P)',
      'live.pause': 'PAUZA (Esc)',
      'live.resume': 'WZNÓW (Esc)',
      'live.confirm': 'Zatwierdź wynik',
      'live.cancel': 'Unieważnij pojedynek',
      'live.cancelFinished': 'Unieważnij (nie zapisuj wyniku)',
      'live.confirmCancel': 'Unieważnić pojedynek? Wynik nie zostanie zapisany.',
      'live.stats': '✓ {correct} · pas {passes}',
      'live.poolPosition': 'zdjęcie {pos} z {total}',
      'live.poolExhausted': 'pula wyczerpana — powtórki',
      'live.skippedBroken': 'pominięte uszkodzone: {n}',
      'live.countdown': 'Odliczanie… {n}',
      'live.paused': 'Pauza — Esc, żeby wznowić.',
      'live.revealing': 'Pas — gracze widzą odpowiedź, zegar biegnie.',
      'live.answerHidden': 'Odpowiedź ukryta — przytrzymaj H, żeby ją zobaczyć.',
      'live.winner': 'Wygrywa {winner}! {loser} — koniec czasu.',

      'shortcuts.title': 'Skróty klawiszowe',
      'shortcuts.space': 'Spacja',
      'shortcuts.start': 'START',
      'shortcuts.correct': 'dobrze',
      'shortcuts.pass': 'pas',
      'shortcuts.pause': 'pauza',
      'shortcuts.hold': 'pokaż odpowiedź (przytrzymaj)',

      'sounds.title': 'Efekty dźwiękowe',
      'sounds.music': '🎵 Muzyka',
      'sounds.stopMusic': '⏹ Zatrzymaj muzykę',
      'sounds.drumroll': '🥁 Werble',
      'sounds.fanfare': '🎺 Fanfara',
      'sounds.applause': '👏 Brawa',
      'sounds.suspense': '💓 Napięcie',
      'sounds.gong': '🔔 Gong',
      'sounds.wrong': '😬 Pudło',
      'sounds.off': 'Dźwięk jest wyłączony — przełącznik „Dźwięk” na górze.',

      'categories.title': 'Kategorie',
      'categories.filter': 'Szukaj kategorii…',
      'categories.pick': 'Wybierz folder…',
      'categories.change': 'Zmień folder…',
      'categories.restore': 'Wczytaj ostatni folder: {name}',
      'categories.noFolder': 'Nie wybrano folderu z kategoriami.',
      'categories.count': { one: '{n} kategoria', few: '{n} kategorie', many: '{n} kategorii', other: '{n} kategorii' },
      'categories.photos': { one: '{n} zdjęcie', few: '{n} zdjęcia', many: '{n} zdjęć', other: '{n} zdjęć' },
      'categories.noSubfolders': 'W tym folderze nie ma podfolderów. Każdy podfolder to jedna kategoria.',
      'categories.notRemembered': 'Ta przeglądarka nie zapamięta folderu — po odświeżeniu trzeba go wskazać ponownie.',
      'categories.empty': 'brak zdjęć — nie do wyboru',
      'categories.low': '⚠ mniej niż {min} — zdjęcia mogą się powtarzać',
      'categories.heic': '⚠ {n}× HEIC — przekonwertuj na JPG',
      'categories.skipped': 'pominięte inne pliki: {n}',

      'levels.easy': 'Łatwe',
      'levels.normal': 'Normalne',
      'levels.medium': 'Średnie',
      'levels.hard': 'Trudne',
      'levels.expert': 'Eksperckie',

      'folder.finishDuelFirst': 'Najpierw zakończ albo unieważnij pojedynek.',
      'folder.notFound': 'Folder nie istnieje — został przeniesiony lub usunięty? Wybierz go ponownie.',
      'folder.notAllowed': 'Brak zgody na odczyt folderu.',
      'folder.permissionNeeded': 'Nie udało się automatycznie wczytać ostatniego folderu — przeglądarka wymaga zgody. Kliknij „Wczytaj ostatni folder”.',
      'folder.permissionDenied': 'Brak zgody na odczyt folderu „{name}”.',
      'folder.loadFailed': 'Nie udało się wczytać folderu: {error}',

      'storage.blocked': 'Przeglądarka blokuje zapis danych — wyniki nie przetrwają odświeżenia.',
      'storage.corrupt': 'Zapisane dane były uszkodzone — zaczynamy od zera (kopia: localStorage „{key}”).',
      'storage.saveFailed': 'Nie udało się zapisać danych w przeglądarce.',

      'settings.title': 'Ustawienia',
      'settings.duelSeconds': 'Czas pojedynku na gracza (s)',
      'settings.passPenalty': 'Kara za pas (s)',
      'settings.hideAnswer': 'Ukrywaj odpowiedź (tryb jednego ekranu — podgląd: przytrzymaj H)',
      'settings.note': 'Zmiany zapisują się od razu i obowiązują od następnego pojedynku.',
      'settings.done': 'Gotowe',

      'big.answer': 'Odpowiedź:',
      'big.close': 'Zamknij podgląd',
      'big.frameTitle': 'Duży podgląd ekranu graczy',

      'screen.pass': 'PAS',
      'screen.paused': 'PAUZA',
      'screen.ready': 'Przygotujcie się!',
      'screen.winner': 'Wygrywa',
    },
  };

  let language = DEFAULT_LANGUAGE;

  function isSupported(lang) {
    return Object.prototype.hasOwnProperty.call(MESSAGES, lang);
  }

  // First supported language from the browser's list ("pl-PL" -> "pl"), else English.
  function detectLanguage(preferred) {
    for (const tag of preferred || []) {
      const lang = String(tag).slice(0, 2).toLowerCase();
      if (isSupported(lang)) return lang;
    }
    return DEFAULT_LANGUAGE;
  }

  function setLanguage(lang) {
    language = isSupported(lang) ? lang : DEFAULT_LANGUAGE;
    return language;
  }

  function format(text, params) {
    return text.replace(/\{(\w+)\}/g, (m, name) => (params && params[name] !== undefined ? String(params[name]) : m));
  }

  // Missing keys fall back to English, then to the key itself.
  function t(key, params) {
    let value = MESSAGES[language][key];
    if (value === undefined) value = MESSAGES[DEFAULT_LANGUAGE][key];
    if (value === undefined) return key;
    if (typeof value === 'object') {
      const form = new Intl.PluralRules(language).select(params ? params.n : 0);
      value = value[form] || value.other;
    }
    return format(value, params);
  }

  // `problem` is { key, params } as returned by Floor.logic, or null.
  function problemText(problem) {
    return problem ? t(problem.key, problem.params) : '';
  }

  // Static texts: data-i18n (text), data-i18n-title, data-i18n-placeholder, data-i18n-label (aria-label).
  function applyToDocument(doc) {
    doc.documentElement.lang = language;
    for (const node of doc.querySelectorAll('[data-i18n]')) node.textContent = t(node.dataset.i18n);
    for (const node of doc.querySelectorAll('[data-i18n-title]')) node.title = t(node.dataset.i18nTitle);
    for (const node of doc.querySelectorAll('[data-i18n-placeholder]')) node.placeholder = t(node.dataset.i18nPlaceholder);
    for (const node of doc.querySelectorAll('[data-i18n-label]')) node.setAttribute('aria-label', t(node.dataset.i18nLabel));
  }

  const i18n = {
    DEFAULT_LANGUAGE,
    LANGUAGE_NAMES,
    MESSAGES,
    detectLanguage,
    setLanguage,
    getLanguage: () => language,
    t,
    problemText,
    applyToDocument,
  };

  root.Floor = root.Floor || {};
  root.Floor.i18n = i18n;
  if (typeof module !== 'undefined') module.exports = i18n;
})(typeof window !== 'undefined' ? window : globalThis);
