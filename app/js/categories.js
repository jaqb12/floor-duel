// Reads the categories folder (SPEC §3): each subfolder is a category, or a difficulty
// level whose subfolders are categories. Images are the files directly inside a category.
//
// Library = { rootName, source: 'handle' | 'files', categories: [Category] }
// Category = { name, level, levelId, heic, skipped, images: [{ key, fileName, answer, getFile() }] }
(function () {
  'use strict';
  window.Floor = window.Floor || {};
  const L = Floor.logic;

  const urls = new Map(); // image key -> Promise<blob URL>

  // `folders` as for L.resolveCategories; getFile(folder, fileName) -> Promise<File>.
  function makeCategories(folders, getFile) {
    return L.resolveCategories(folders).map(({ name, level, levelId, fileNames, folder }) => {
      const { images, heic, skipped } = L.classifyFiles(fileNames);
      return {
        name,
        level,
        levelId,
        heic,
        skipped,
        images: images.map(fileName => ({
          key: name + '/' + fileName,
          fileName,
          answer: L.normalizeAnswer(fileName),
          getFile: () => getFile(folder, fileName),
        })),
      };
    });
  }

  // Directory handle -> { name, fileNames, files: Map(name -> handle), subfolders } (two levels).
  async function readDirectory(dir, depth) {
    const folder = { name: dir.name, fileNames: [], files: new Map(), subfolders: [] };
    for await (const [name, entry] of dir.entries()) {
      if (entry.kind === 'file') {
        folder.fileNames.push(name);
        folder.files.set(name, entry);
      } else if (depth > 0 && L.isCategoryFolder(name)) {
        folder.subfolders.push(await readDirectory(entry, depth - 1));
      }
    }
    return folder;
  }

  async function readHandle(root) {
    const { subfolders } = await readDirectory(root, 2);
    const categories = makeCategories(subfolders, (folder, fileName) => folder.files.get(fileName).getFile());
    return { rootName: root.name, source: 'handle', categories };
  }

  function readFileList(fileList) {
    const byPath = new Map(Array.from(fileList, f => [f.webkitRelativePath, f]));
    const { rootName, folders } = L.groupRelativePaths(Array.from(byPath.keys()));
    // Remember each folder's path so its files can be found again.
    for (const top of folders) {
      top.path = rootName + '/' + top.name + '/';
      for (const sub of top.subfolders) sub.path = top.path + sub.name + '/';
    }
    const categories = makeCategories(folders, (folder, fileName) => Promise.resolve(byPath.get(folder.path + fileName)));
    return { rootName, source: 'files', categories };
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

  // From a click it may ask for permission (requestPermission needs a user gesture).
  // On page load (ask = false) it only reads when permission is still granted,
  // otherwise it throws an error named 'PermissionNeeded'. A refusal after asking is 'PermissionDenied'.
  async function restoreLastFolder(ask = true) {
    const root = await Floor.storage.loadRootHandle();
    if (!root) return null;
    let permission = await root.queryPermission({ mode: 'read' });
    if (permission !== 'granted' && ask) permission = await root.requestPermission({ mode: 'read' });
    if (permission !== 'granted') {
      const e = new Error('No permission to read folder ' + root.name);
      e.name = ask ? 'PermissionDenied' : 'PermissionNeeded';
      e.folderName = root.name;
      throw e;
    }
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
