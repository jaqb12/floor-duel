// Reads the categories folder (SPEC §3): each direct subfolder is a category,
// images are the files directly inside it.
//
// Library = { rootName, source: 'handle' | 'files', categories: [Category] }
// Category = { name, heic, skipped, images: [{ key, fileName, answer, getFile() }] }
(function () {
  'use strict';
  window.Floor = window.Floor || {};
  const L = Floor.logic;

  const urls = new Map(); // image key -> Promise<blob URL>

  function makeCategory(name, fileNames, getFile) {
    const { images, heic, skipped } = L.classifyFiles(fileNames);
    return {
      name,
      heic,
      skipped,
      images: images.map(fileName => ({
        key: name + '/' + fileName,
        fileName,
        answer: L.normalizeAnswer(fileName),
        getFile: () => getFile(fileName),
      })),
    };
  }

  function sortByName(categories) {
    return categories.sort((a, b) => L.compareNames(a.name, b.name));
  }

  async function readHandle(root) {
    const categories = [];
    for await (const [name, entry] of root.entries()) {
      if (entry.kind !== 'directory' || !L.isCategoryFolder(name)) continue;
      const files = new Map();
      for await (const [fileName, fileEntry] of entry.entries()) {
        if (fileEntry.kind === 'file') files.set(fileName, fileEntry);
      }
      categories.push(makeCategory(name, Array.from(files.keys()), fileName => files.get(fileName).getFile()));
    }
    return { rootName: root.name, source: 'handle', categories: sortByName(categories) };
  }

  function readFileList(fileList) {
    const byPath = new Map(Array.from(fileList, f => [f.webkitRelativePath, f]));
    const { rootName, folders } = L.groupRelativePaths(Array.from(byPath.keys()));
    const categories = [];
    for (const [name, fileNames] of folders) {
      const prefix = rootName + '/' + name + '/';
      categories.push(makeCategory(name, fileNames, fileName => Promise.resolve(byPath.get(prefix + fileName))));
    }
    return { rootName, source: 'files', categories: sortByName(categories) };
  }

  function canRememberFolder() {
    return typeof window.showDirectoryPicker === 'function';
  }

  // Fallback without showDirectoryPicker: folder is not remembered after a refresh.
  function pickWithInput() {
    const input = document.getElementById('folder-input');
    return new Promise(resolve => {
      input.value = '';
      input.onchange = () => resolve(input.files.length ? readFileList(input.files) : null);
      input.oncancel = () => resolve(null);
      input.click();
    });
  }

  // Resolves to a Library, or null when the user cancelled.
  async function pickFolder() {
    if (!canRememberFolder()) return pickWithInput();
    let root;
    try {
      root = await window.showDirectoryPicker({ id: 'thefloor', mode: 'read' });
    } catch (e) {
      if (e.name === 'AbortError') return null;
      throw e;
    }
    try {
      await Floor.storage.saveRootHandle(root);
    } catch (e) {
      console.error('Could not remember the folder', e);
    }
    return readHandle(root);
  }

  async function lastFolderName() {
    if (!canRememberFolder()) return null;
    try {
      const root = await Floor.storage.loadRootHandle();
      return root ? root.name : null;
    } catch (e) {
      console.error('Could not read the remembered folder', e);
      return null;
    }
  }

  // Must run from a click: requestPermission needs a user gesture.
  async function restoreLastFolder() {
    const root = await Floor.storage.loadRootHandle();
    if (!root) return null;
    let permission = await root.queryPermission({ mode: 'read' });
    if (permission !== 'granted') permission = await root.requestPermission({ mode: 'read' });
    if (permission !== 'granted') throw new Error('Brak zgody na odczyt folderu „' + root.name + '”.');
    return readHandle(root);
  }

  // Blob URLs are created on demand and cached per image.
  function getImageUrl(image) {
    if (!urls.has(image.key)) {
      urls.set(image.key, image.getFile().then(
        file => URL.createObjectURL(file),
        e => { urls.delete(image.key); throw e; }));
    }
    return urls.get(image.key);
  }

  // Revokes blob URLs of one category, or of all categories when no name is given.
  function releaseUrls(categoryName) {
    for (const [key, promise] of urls) {
      if (categoryName !== undefined && !key.startsWith(categoryName + '/')) continue;
      urls.delete(key);
      promise.then(url => URL.revokeObjectURL(url), () => {});
    }
  }

  Floor.categories = {
    canRememberFolder,
    pickFolder,
    lastFolderName,
    restoreLastFolder,
    getImageUrl,
    releaseUrls,
  };
})();
