// Operator UI and keyboard handling. Phase 2: categories column.
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

  function showFolderMessage(text, isError) {
    const box = $('folder-message');
    box.textContent = text || '';
    box.className = isError ? 'message error' : 'message';
  }

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
    const button = $('restore-folder');
    button.hidden = !folderName;
    if (folderName) button.textContent = 'Wczytaj ostatni folder: ' + folderName;
  }

  Floor.operator = {
    plural,
    renderCategories,
    showFolderMessage,
    showRestoreButton,
  };
})();
