// Builds and updates the players screen DOM (SPEC §6, §7.3).
// The players window is about:blank, opened and driven entirely from the operator window.
// After an operator refresh it can't be reused (new "null" origin, see docs/SPIKE.md).
// createRenderer() can also draw the same screen into another document (big preview, §7.4).
(function () {
  'use strict';
  window.Floor = window.Floor || {};

  const NAME = 'floor-display';
  const FEATURES = 'popup,width=1280,height=720';
  const OPEN_FLAG = 'thefloor.displayOpen';
  const CACHE_SIZE = 3;

  let win = null;       // players window, null when closed
  let renderer = null;  // renderer of the players window
  let status = 'closed';
  let onStatus = () => {};
  let onFrame = () => {};
  let onKey = () => {};
  let resolveImage = () => Promise.reject(new Error('No image resolver'));

  // ---------- renderer ----------

  function setText(node, text) {
    if (node.textContent !== text) node.textContent = text;
  }

  function setColor(node, prop, value) {
    if (node.style.getPropertyValue(prop) !== value) node.style.setProperty(prop, value);
  }

  // A reload turns the players window white and unreachable, so don't let it happen by accident.
  function isReloadKey(e) {
    return e.key === 'F5' || ((e.ctrlKey || e.metaKey) && e.code === 'KeyR');
  }

  function build(doc) {
    const css = document.getElementById('display-css').textContent;
    doc.title = 'The Floor — ekran graczy';
    doc.head.textContent = '';
    doc.body.textContent = '';
    const style = doc.createElement('style');
    style.textContent = css;
    doc.head.append(style);

    const make = (tag, className, parent) => {
      const node = doc.createElement(tag);
      if (className) node.className = className;
      if (parent) parent.append(node);
      return node;
    };
    const root = make('div', 'floor', doc.body);

    const board = make('section', 'board', root);
    make('h1', 'logo', board).textContent = 'THE FLOOR';
    const ranking = make('ol', 'ranking', board);

    const duel = make('section', 'duel', root);
    const category = make('header', 'category', duel);
    const stage = make('div', 'stage', duel);
    const photo = make('img', 'photo', stage);
    photo.alt = '';
    const reveal = make('div', 'reveal', stage);
    make('span', 'reveal-tag', reveal).textContent = 'PAS';
    const revealAnswer = make('span', 'reveal-answer', reveal);
    const message = make('div', 'message', stage);
    const messageTitle = make('div', 'message-title', message);
    const messageName = make('div', 'message-name', message);
    const panels = make('footer', 'panels', duel);
    const panel = side => {
      const el = make('div', 'panel ' + side, panels);
      return { el, name: make('div', 'pname', el), clock: make('div', 'pclock', el) };
    };
    const left = panel('left');
    const right = panel('right');
    const paused = make('div', 'paused', root);
    paused.textContent = 'PAUZA';

    doc.addEventListener('keydown', e => {
      if (isReloadKey(e)) {
        e.preventDefault();
        return;
      }
      onKey(e);
    });
    doc.addEventListener('keyup', e => onKey(e));
    return {
      doc, root, ranking, category, photo, reveal, revealAnswer, messageTitle, messageName,
      left, right, rankingKey: null,
      image: { shown: null, loading: null, failed: null, cache: new Map() },
    };
  }

  function createRenderer(doc) {
    const dom = build(doc);

    function renderRanking(ranking) {
      const key = JSON.stringify(ranking);
      if (dom.rankingKey === key) return;
      dom.rankingKey = key;
      dom.ranking.textContent = '';
      dom.ranking.classList.toggle('two-columns', ranking.length > 8);
      ranking.forEach((p, i) => {
        const li = doc.createElement('li');
        const pos = doc.createElement('span');
        pos.className = 'r-pos';
        pos.textContent = (i + 1) + '.';
        const name = doc.createElement('span');
        name.className = 'r-name';
        name.textContent = p.name;
        name.style.color = p.color;
        const score = doc.createElement('span');
        score.className = 'r-score';
        score.textContent = p.wins + '–' + p.losses;
        li.append(pos, name, score);
        dom.ranking.append(li);
      });
    }

    function renderPanel(panel, side) {
      setText(panel.name, side.name);
      setText(panel.clock, String(side.seconds));
      setColor(panel.el, '--player', side.color);
      panel.el.classList.toggle('active', side.active);
      panel.el.classList.toggle('winner', side.winner);
      panel.clock.classList.toggle('low', side.low);
    }

    // key -> Promise of an <img> already decoded in this document.
    function decoded(key) {
      const cache = dom.image.cache;
      if (!cache.has(key)) {
        cache.set(key, resolveImage(key).then(url => {
          const img = doc.createElement('img');
          img.className = 'photo';
          img.alt = '';
          img.src = url;
          return img.decode().then(() => img);
        }));
        while (cache.size > CACHE_SIZE) cache.delete(cache.keys().next().value);
      }
      return cache.get(key);
    }

    function preload(key) {
      if (key) decoded(key).catch(() => { /* reported when shown */ });
    }

    // Swaps the photo only after the next one is decoded, so big phone photos don't flash.
    function showImage(key) {
      const image = dom.image;
      if (!key || key === image.shown || key === image.loading || key === image.failed) return;
      image.loading = key;
      decoded(key)
        .then(next => {
          if (image.loading !== key) return;
          dom.photo.replaceWith(next);
          dom.photo = next;
          image.shown = key;
          image.loading = null;
        })
        .catch(e => {
          console.error('Could not show image', key, e);
          if (image.loading === key) {
            image.loading = null;
            image.failed = key;
          }
        });
    }

    // Cheap enough for every frame: writes only what changed.
    function render(view) {
      dom.root.dataset.screen = view.screen;
      if (view.screen === 'board') {
        renderRanking(view.ranking);
        dom.root.classList.remove('is-paused');
        return;
      }
      setText(dom.category, view.category);
      renderPanel(dom.left, view.left);
      renderPanel(dom.right, view.right);
      dom.root.classList.toggle('is-paused', view.paused);
      dom.reveal.classList.toggle('visible', view.reveal !== null);
      setText(dom.revealAnswer, view.reveal || '');
      if (view.screen === 'ready') {
        setText(dom.messageTitle, 'Przygotujcie się!');
        setText(dom.messageName, '');
      } else if (view.screen === 'finished') {
        setText(dom.messageTitle, 'Wygrywa');
        setText(dom.messageName, view.winner ? view.winner.name : '');
        setColor(dom.messageName, 'color', view.winner ? view.winner.color : '#ffffff');
      }
      if (view.screen === 'duel') showImage(view.imageKey);
    }

    return { doc, render, preload };
  }

  // ---------- players window lifecycle ----------

  function setStatus(next) {
    status = next;
    onStatus(status);
    return status;
  }

  function setOpenFlag(on) {
    try {
      if (on) localStorage.setItem(OPEN_FLAG, '1');
      else localStorage.removeItem(OPEN_FLAG);
    } catch (e) { /* not critical */ }
  }

  function canAccess(w) {
    try {
      return !!w.document;
    } catch (e) {
      return false;
    }
  }

  function isOpen() {
    return !!win && !win.closed;
  }

  // Must run from a click: popup blockers allow window.open only then.
  // Statuses: 'open', 'blocked', 'retry' (stale window closed, click again), 'closed', 'lost', 'reloaded'.
  function open() {
    if (isOpen() && renderer) {
      win.focus();
      return setStatus('open');
    }
    let w = window.open('', NAME, FEATURES);
    if (!w) return setStatus('blocked');
    if (!canAccess(w)) {
      // Reloaded, or left over from before an operator refresh: different origin, unusable.
      const stale = w;
      try { stale.close(); } catch (e) { console.error(e); }
      w = window.open('', NAME, FEATURES);
      if (!w || w === stale || !canAccess(w)) {
        win = null;
        renderer = null;
        return setStatus('retry');
      }
    }
    attach(w);
    setOpenFlag(true);
    return setStatus('open');
  }

  function attach(w) {
    win = w;
    renderer = createRenderer(w.document);
    startWindowLoop(w, renderer);
  }

  function startWindowLoop(w, r) {
    const step = () => {
      if (w !== win || r !== renderer || w.closed) return;
      onFrame();
      w.requestAnimationFrame(step);
    };
    w.requestAnimationFrame(step);
  }

  function currentDocument(w) {
    try {
      return w.document;
    } catch (e) {
      return null;
    }
  }

  // Called regularly by the app: notices a closed or reloaded players window.
  function checkWindow() {
    if (!win) return;
    if (win.closed) {
      win = null;
      renderer = null;
      setOpenFlag(false);
      setStatus('closed');
      return;
    }
    if (renderer && currentDocument(win) !== renderer.doc) {
      // Reloaded from the browser UI: a same-origin blank page can be rebuilt, otherwise reopen.
      if (canAccess(win)) {
        attach(win);
      } else {
        renderer = null;
        setStatus('reloaded');
      }
    }
  }

  function render(view) {
    if (!renderer) return;
    try {
      renderer.render(view);
    } catch (e) {
      // The document went away under us (window closed mid-frame).
      console.error(e);
      checkWindow();
    }
  }

  function preload(key) {
    if (renderer) renderer.preload(key);
  }

  function init() {
    let wasOpen = false;
    try { wasOpen = localStorage.getItem(OPEN_FLAG) === '1'; } catch (e) { /* ignore */ }
    setOpenFlag(false);
    // An orphaned white window is useless after a refresh, so close it on the way out.
    window.addEventListener('pagehide', () => {
      if (isOpen()) {
        setOpenFlag(true);
        win.close();
      }
    });
    setStatus(wasOpen ? 'lost' : 'closed');
  }

  Floor.display = {
    init,
    open,
    isOpen,
    checkWindow,
    render,
    preload,
    createRenderer,
    isReloadKey,
    getStatus: () => status,
    setStatusListener: fn => { onStatus = fn; },
    setFrameListener: fn => { onFrame = fn; },
    setKeyListener: fn => { onKey = fn; },
    setImageResolver: fn => { resolveImage = fn; },
  };
})();
