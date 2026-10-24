// Logic tests with a tiny runner (no libraries).
// Node: `node tests/run-node.js`. Browser: open tests/tests.html.
(function (root) {
  'use strict';

  const isNode = typeof module !== 'undefined' && module.exports;
  const L = isNode ? require('../app/js/logic.js') : root.Floor.logic;

  const tests = [];
  const test = (name, fn) => tests.push({ name, fn });

  function eq(actual, expected, msg) {
    const a = JSON.stringify(actual);
    const e = JSON.stringify(expected);
    if (a !== e) throw new Error((msg ? msg + ': ' : '') + 'expected ' + e + ', got ' + a);
  }

  function ok(cond, msg) {
    if (!cond) throw new Error(msg || 'assertion failed');
  }

  function seededRng(seed) {
    let s = seed >>> 0;
    return () => {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / 4294967296;
    };
  }

  const A = 'a';
  const B = 'b';

  function makeDuel(opts) {
    return L.createDuel(Object.assign({
      challengerId: A, opponentId: B, category: 'Test',
      images: ['1', '2', '3', '4', '5'], duelSeconds: 45, passPenaltySeconds: 3, rng: seededRng(1),
    }, opts));
  }

  function throws(fn, msg) {
    let threw = false;
    try { fn(); } catch (e) { threw = true; }
    ok(threw, msg || 'expected an exception');
  }

  // ---------- file names ----------

  test('normalizeAnswer: SPEC examples', () => {
    eq(L.normalizeAnswer('Wieża_Eiffla.jpg'), 'Wieża Eiffla');
    eq(L.normalizeAnswer('Słoń (2).png'), 'Słoń');
    eq(L.normalizeAnswer('Słoń__3.webp'), 'Słoń');
    eq(L.normalizeAnswer('F-16.jpg'), 'F-16');
  });

  test('normalizeAnswer: dots, spaces, case, suffix variants', () => {
    eq(L.normalizeAnswer('J.R.R._Tolkien.jpg'), 'J.R.R. Tolkien');
    eq(L.normalizeAnswer('  Wiele___spacji   tu .png'), 'Wiele spacji tu');
    eq(L.normalizeAnswer('Kot.JPG'), 'Kot');
    eq(L.normalizeAnswer('Słoń(12).png'), 'Słoń');
    eq(L.normalizeAnswer('Rok 2024.jpg'), 'Rok 2024');
    eq(L.normalizeAnswer('Bez rozszerzenia'), 'Bez rozszerzenia');
  });

  test('normalizeAnswer: Unicode NFC', () => {
    const nfd = 'Żubr.jpg';
    eq(L.normalizeAnswer(nfd), 'Żubr');
  });

  test('normalizeAnswer: names that would become empty keep the base name', () => {
    eq(L.normalizeAnswer('(2).jpg'), '(2)');
    eq(L.normalizeAnswer('__2.png'), '__2');
    eq(L.normalizeAnswer('1.jpg'), '1');
  });

  test('isSupportedImage / isHeic', () => {
    for (const n of ['a.JPG', 'b.jpeg', 'c.png', 'd.webp', 'e.gif', 'f.bmp', 'g.avif', 'h.svg']) ok(L.isSupportedImage(n), n);
    for (const n of ['notatka.txt', '.ukryty.jpg', 'Thumbs.db', 'desktop.ini', 'x.heic', 'bez_rozszerzenia', '']) {
      ok(!L.isSupportedImage(n), n);
    }
    ok(L.isHeic('IMG_1.HEIC') && L.isHeic('a.heif'), 'heic');
    ok(!L.isHeic('a.jpg') && !L.isHeic('.x.heic'), 'not heic');
  });

  // ---------- categories ----------

  test('classifyFiles: images sorted naturally, HEIC and others counted', () => {
    const r = L.classifyFiles(['10.jpg', '2.jpg', 'notatka.txt', 'IMG_1.HEIC', 'Thumbs.db', '.ukryty.png', 'Łoś.png', 'Lis.webp', 'x.heif']);
    eq(r.images, ['2.jpg', '10.jpg', 'Lis.webp', 'Łoś.png']);
    eq([r.heic, r.skipped], [2, 3]);
    eq(L.classifyFiles([]), { images: [], heic: 0, skipped: 0 });
  });

  test('groupRelativePaths: direct subfolders only, no recursion, hidden folders skipped', () => {
    const r = L.groupRelativePaths([
      'Kategorie/Owoce/Banan.svg',
      'Kategorie/Owoce/Jabłko.svg',
      'Kategorie/plik_w_korzeniu.jpg',
      'Kategorie/Kolory/Głębiej/Ukryty.svg',
      'Kategorie/Kolory/Czerwony.svg',
      'Kategorie/.git/config',
      'Kategorie/__proto__/a.jpg',
    ]);
    eq(r.rootName, 'Kategorie');
    eq(Array.from(r.folders), [['Owoce', ['Banan.svg', 'Jabłko.svg']], ['Kolory', ['Czerwony.svg']], ['__proto__', ['a.jpg']]]);
    eq(L.groupRelativePaths([]).rootName, '');
  });

  test('isCategoryFolder skips hidden and empty names', () => {
    ok(L.isCategoryFolder('Owoce') && !L.isCategoryFolder('.git') && !L.isCategoryFolder(''));
  });

  // ---------- helpers ----------

  test('shuffle: permutation, input untouched, deterministic with seed', () => {
    const input = [1, 2, 3, 4, 5, 6, 7, 8];
    const out = L.shuffle(input, seededRng(7));
    eq(input, [1, 2, 3, 4, 5, 6, 7, 8], 'input mutated');
    eq(out.slice().sort((x, y) => x - y), input, 'not a permutation');
    eq(L.shuffle(input, seededRng(7)), out, 'not deterministic');
    eq(L.shuffle([], seededRng(1)), []);
  });

  test('rankPlayers: wins desc, losses asc, name (Polish order)', () => {
    const players = [
      { id: 1, name: 'Zosia', wins: 2, losses: 1 },
      { id: 2, name: 'Łukasz', wins: 2, losses: 0 },
      { id: 3, name: 'Lena', wins: 2, losses: 0 },
      { id: 4, name: 'Adam', wins: 0, losses: 0 },
      { id: 5, name: 'Ola', wins: 3, losses: 5 },
    ];
    eq(L.rankPlayers(players).map(p => p.name), ['Ola', 'Lena', 'Łukasz', 'Zosia', 'Adam']);
    eq(players[0].name, 'Zosia', 'input mutated');
  });

  test('clockSeconds rounds up', () => {
    eq([45000, 44001, 44000, 1, 0, -5].map(L.clockSeconds), [45, 45, 44, 1, 0, 0]);
  });

  test('applyResult: only after finish, input untouched', () => {
    const players = [
      { id: A, name: 'A', wins: 1, losses: 0 },
      { id: B, name: 'B', wins: 0, losses: 2 },
      { id: 'c', name: 'C', wins: 4, losses: 4 },
    ];
    const d = makeDuel();
    eq(L.applyResult(players, d), players, 'ready duel changed players');
    d.start(0);
    d.tick(45000);
    const after = L.applyResult(players, d);
    eq(after.map(p => [p.wins, p.losses]), [[1, 1], [1, 2], [4, 4]]);
    eq(players[0].losses, 0, 'input mutated');
  });

  // ---------- players and settings ----------

  test('cleanName collapses spaces and limits length', () => {
    eq(L.cleanName('  Ala   ma  kota '), 'Ala ma kota');
    eq(L.cleanName('x'.repeat(40)).length, L.MAX_NAME_LENGTH);
    eq([L.cleanName(null), L.cleanName(undefined)], ['', '']);
  });

  test('validatePlayerName: empty, duplicate (case-insensitive, Polish), editing self', () => {
    const players = [{ id: 'p1', name: 'Łukasz' }, { id: 'p2', name: 'Ola' }];
    ok(L.validatePlayerName('   ', players), 'blank');
    ok(L.validatePlayerName('łukasz', players), 'duplicate');
    ok(L.validatePlayerName(' OLA ', players), 'duplicate with spaces');
    eq(L.validatePlayerName('łukasz', players, 'p1'), null, 'rename self');
    eq(L.validatePlayerName('Zosia', players), null);
  });

  test('nextColor: first unused, cycles when all are taken', () => {
    eq(L.nextColor([]), L.PLAYER_COLORS[0]);
    eq(L.nextColor([{ color: L.PLAYER_COLORS[0].toUpperCase() }]), L.PLAYER_COLORS[1]);
    const all = L.PLAYER_COLORS.map(color => ({ color }));
    eq(L.nextColor(all), L.PLAYER_COLORS[0]);
    eq(L.nextColor(all.concat([{ color: '#000000' }])), L.PLAYER_COLORS[1]);
  });

  test('adjustWins never goes below zero; resetScores clears both counters', () => {
    const players = [{ id: 'a', wins: 0, losses: 3 }, { id: 'b', wins: 2, losses: 1 }];
    eq(L.adjustWins(players, 'a', -1)[0].wins, 0);
    eq(L.adjustWins(players, 'b', 1).map(p => p.wins), [0, 3]);
    eq(L.resetScores(players).map(p => [p.wins, p.losses]), [[0, 0], [0, 0]]);
    eq(players[1].wins, 2, 'input mutated');
  });

  test('sanitizeState: defaults for missing or garbage data', () => {
    const empty = { players: [], settings: L.DEFAULT_SETTINGS };
    eq(L.sanitizeState(null), empty);
    eq(L.sanitizeState('tekst'), empty);
    eq(L.sanitizeState({ players: 'x', settings: 5 }), empty);
  });

  test('sanitizeState: repairs players and clamps settings', () => {
    const s = L.sanitizeState({
      players: [
        { id: 'p1', name: ' Ala ', color: '#FF0000', category: 'Owoce', wins: 3, losses: -2 },
        { id: 'p1', name: 'Duplikat id' },
        { id: 'p2', name: '' },
        { name: 'Bez id' },
        null,
        { id: 'p3', name: 'Bartek', color: 'red', category: '', wins: '2', losses: 'x' },
      ],
      settings: { duelSeconds: 9999, passPenaltySeconds: '0', sound: 'tak', hideAnswer: true, volume: 150 },
    });
    eq(s.players, [
      { id: 'p1', name: 'Ala', color: '#ff0000', category: 'Owoce', wins: 3, losses: 0 },
      { id: 'p3', name: 'Bartek', color: L.PLAYER_COLORS[0], category: null, wins: 2, losses: 0 },
    ]);
    eq(s.settings, { duelSeconds: 300, passPenaltySeconds: 1, sound: true, hideAnswer: true, volume: 100 });
  });

  // ---------- duel: setup ----------

  test('createDuel validates input', () => {
    throws(() => makeDuel({ opponentId: A }), 'same players');
    throws(() => makeDuel({ images: [] }), 'no images');
    throws(() => makeDuel({ firstId: 'x' }), 'bad firstId');
  });

  test('ready: clocks full, actions ignored until start', () => {
    const d = makeDuel();
    eq(d.state, 'ready');
    eq([d.getClock(A, 5000), d.getClock(B, 5000)], [45000, 45000]);
    eq(d.markCorrect(1000), []);
    eq(d.markPass(1000), []);
    eq(d.togglePause(1000), []);
    eq(d.tick(1000), []);
    eq(d.current, null);
  });

  // ---------- duel: clock ----------

  test('clock runs only for the active player; correct answer hands the turn over', () => {
    const d = makeDuel();
    eq(d.start(1000), ['started']);
    eq(d.activeId, A);
    const first = d.current;
    eq([d.getClock(A, 11000), d.getClock(B, 11000)], [35000, 45000]);
    ok(d.markCorrect(11000).includes('correct'));
    eq(d.activeId, B);
    ok(d.current !== first, 'image not changed');
    eq([d.getClock(A, 20000), d.getClock(B, 20000)], [35000, 36000]);
    eq(d.stats[A], { correct: 1, passes: 0 });
    d.markCorrect(20000);
    eq(d.activeId, A);
    eq([d.getClock(A, 25000), d.getClock(B, 25000)], [30000, 36000]);
  });

  test('firstId lets the opponent start', () => {
    const d = makeDuel({ firstId: B });
    d.start(0);
    eq(d.activeId, B);
    eq([d.getClock(A, 4000), d.getClock(B, 4000)], [45000, 41000]);
  });

  // ---------- duel: pass ----------

  test('pass: 3 s reveal with the clock running, Space/P ignored, same player continues', () => {
    const d = makeDuel();
    d.start(0);
    const before = d.current;
    eq(d.markPass(5000), ['pass']);
    eq([d.state, d.revealUntil], ['reveal', 8000]);
    eq(d.current, before, 'image must stay during reveal');
    eq(d.markCorrect(6000), [], 'Space during reveal');
    eq(d.markPass(6500), [], 'P during reveal');
    eq(d.stats[A], { correct: 0, passes: 1 });
    eq(d.getClock(A, 7000), 38000);
    eq(d.tick(7999), []);
    eq(d.tick(8000), ['revealEnd']);
    eq([d.state, d.activeId], ['running', A]);
    ok(d.current !== before, 'new image after reveal');
    eq(d.getClock(A, 8000), 37000);
    eq(d.getClock(B, 8000), 45000);
  });

  // ---------- duel: timeout ----------

  test('timeout while running: active player loses', () => {
    const d = makeDuel();
    d.start(0);
    d.tick(44999);
    eq(d.state, 'running');
    ok(d.tick(45000).includes('timeout'));
    eq([d.state, d.winnerId, d.loserId], ['finished', B, A]);
    eq(d.getClock(A, 50000), 0);
    eq(d.markCorrect(50000), []);
    eq(d.tick(60000), []);
  });

  test('timeout of the second player after a hand-over', () => {
    const d = makeDuel();
    d.start(0);
    d.markCorrect(10000);
    eq(d.tick(54999).includes('timeout'), false);
    ok(d.tick(55000).includes('timeout'));
    eq([d.winnerId, d.loserId], [A, B]);
    eq(d.getClock(A, 55000), 35000);
  });

  test('timeout during reveal ends the duel without revealEnd', () => {
    const d = makeDuel();
    d.start(0);
    d.markPass(43000);
    eq(d.tick(45000), ['timeout']);
    eq([d.state, d.loserId], ['finished', A]);
  });

  test('reveal ending exactly at timeout counts as timeout', () => {
    const d = makeDuel();
    d.start(0);
    d.markPass(42000);
    eq(d.tick(45000), ['timeout']);
  });

  test('coarse ticks: one late tick resolves reveal and timeout in order', () => {
    const d = makeDuel();
    d.start(0);
    d.markPass(40000);
    eq(d.tick(50000), ['revealEnd', 'timeout']);
    eq([d.state, d.loserId], ['finished', A]);
  });

  test('action arriving after time ran out finishes the duel instead', () => {
    const d = makeDuel();
    d.start(0);
    eq(d.markCorrect(46000), ['timeout']);
    eq([d.state, d.loserId, d.stats[A].correct], ['finished', A, 0]);
  });

  // ---------- duel: pause ----------

  test('pause freezes the clock; resume continues', () => {
    const d = makeDuel();
    d.start(0);
    eq(d.togglePause(10000), ['paused']);
    eq(d.state, 'paused');
    eq(d.getClock(A, 30000), 35000);
    eq(d.tick(100000), []);
    eq(d.markCorrect(100000), []);
    eq(d.markPass(100000), []);
    eq(d.togglePause(130000), ['resumed']);
    eq(d.state, 'running');
    eq(d.getClock(A, 135000), 30000);
    ok(d.tick(165000).includes('timeout'));
  });

  test('pause during reveal also freezes the reveal', () => {
    const d = makeDuel();
    d.start(0);
    d.markPass(10000);
    d.togglePause(11000);
    d.togglePause(20000);
    eq([d.state, d.revealUntil], ['reveal', 22000]);
    eq(d.tick(21999), []);
    eq(d.tick(22000), ['revealEnd']);
    eq(d.getClock(A, 22000), 32000);
  });

  test('pause is ignored before start and after finish', () => {
    const d = makeDuel();
    eq(d.togglePause(0), []);
    d.start(0);
    d.tick(45000);
    eq(d.togglePause(46000), []);
    eq(d.state, 'finished');
  });

  // ---------- duel: low time ----------

  test('lowTime fires once per second in the last 5 s', () => {
    const d = makeDuel();
    d.start(0);
    const events = [];
    for (let t = 0; t <= 45000; t += 100) events.push(...d.tick(t));
    eq(events.filter(e => e === 'lowTime').length, 5);
    eq(events.filter(e => e === 'timeout').length, 1);
  });

  test('suspense fires once per player at 12 s, also on coarse ticks', () => {
    const d = makeDuel();
    d.start(0);
    const count = events => events.filter(e => e === 'suspense').length;
    eq(count(d.tick(32999)), 0, 'at 13 s');
    eq(count(d.tick(33000)), 1, 'at 12 s');
    eq(count(d.tick(34000)), 0, 'only once');
    d.markCorrect(35000);
    eq(count(d.tick(45000)), 0, 'B still has 35 s');
    eq(count(d.tick(70000)), 1, 'coarse tick from 35 s to 10 s');
    d.markCorrect(70000);
    eq(count(d.tick(71000)), 0, 'A already had it');
  });

  test('no suspense when the duel starts at or below 12 s', () => {
    const d = makeDuel({ duelSeconds: 10 });
    d.start(0);
    const events = [];
    for (let t = 0; t <= 10000; t += 100) events.push(...d.tick(t));
    eq(events.includes('suspense'), false);
  });

  // ---------- duel: deck ----------

  test('deck: no repeats until exhausted, then reshuffle without immediate repeat', () => {
    for (let seed = 1; seed <= 300; seed++) {
      const d = makeDuel({ images: ['1', '2', '3'], rng: seededRng(seed) });
      d.start(0);
      const seen = [d.current, d.nextImage(), d.nextImage()];
      eq(seen.slice().sort(), ['1', '2', '3'], 'seed ' + seed);
      eq(d.reshuffles, 0);
      const next = d.nextImage();
      ok(next !== seen[2], 'immediate repeat after reshuffle, seed ' + seed);
      eq(d.reshuffles, 1);
    }
  });

  test('deck with a single image keeps working', () => {
    const d = makeDuel({ images: ['only'] });
    d.start(0);
    eq([d.current, d.nextImage(), d.nextImage()], ['only', 'only', 'only']);
  });

  test('peekNext shows the upcoming image, null when a reshuffle is due', () => {
    const d = makeDuel({ images: ['1', '2'] });
    d.start(0);
    const next = d.peekNext();
    ok(next !== null && next !== d.current);
    eq(d.nextImage(), next);
    eq(d.peekNext(), null);
  });

  test('skipCurrent drops a broken image from the pool for good', () => {
    const d = makeDuel({ images: ['1', '2', '3'], rng: seededRng(3) });
    d.start(0);
    const broken = d.current;
    ok(d.skipCurrent() !== broken);
    for (let i = 0; i < 30; i++) ok(d.nextImage() !== broken, 'broken image came back');
    const single = makeDuel({ images: ['only'] });
    single.start(0);
    eq(single.skipCurrent(), 'only', 'last image is kept');
  });

  // ---------- duel setup ----------

  const setupPlayers = [
    { id: A, name: 'Ala', category: 'Owoce' },
    { id: B, name: 'Bartek', category: 'Brak' },
    { id: 'c', name: 'Celina', category: null },
  ];
  const setupCategories = [{ name: 'Owoce', count: 8 }, { name: 'Puste', count: 0 }];

  test('duelSetupProblem covers SPEC §9 cases', () => {
    const base = { players: setupPlayers, categories: setupCategories, challengerId: A, opponentId: B, category: 'Owoce' };
    const problem = changes => L.duelSetupProblem(Object.assign({}, base, changes));
    eq(problem({}), null);
    ok(problem({ players: setupPlayers.slice(0, 1) }), 'one player');
    ok(problem({ categories: null }), 'no folder');
    ok(problem({ challengerId: null }), 'no challenger');
    ok(problem({ opponentId: 'ghost' }), 'deleted opponent');
    ok(problem({ opponentId: A }), 'same player');
    ok(problem({ category: '' }), 'no category');
    ok(problem({ category: 'Puste' }), 'empty category');
    ok(problem({ category: 'Nieznana' }), 'missing category');
  });

  test('defaultCategory: opponent category only if it has images', () => {
    eq(L.defaultCategory(setupPlayers[0], setupCategories), 'Owoce');
    eq(L.defaultCategory(setupPlayers[1], setupCategories), '');
    eq(L.defaultCategory(setupPlayers[2], setupCategories), '');
    eq(L.defaultCategory(setupPlayers[0], null), '');
    eq(L.defaultCategory({ category: 'Puste' }, setupCategories), '');
  });

  test('randomChallenger never picks the excluded player', () => {
    for (let seed = 1; seed < 50; seed++) ok(L.randomChallenger(setupPlayers, B, seededRng(seed)) !== B);
    eq(L.randomChallenger([{ id: A }], A), null);
  });

  // ---------- players screen ----------

  const viewPlayers = [
    { id: A, name: 'Ala', color: '#ff5a5a', wins: 1, losses: 0 },
    { id: B, name: 'Bartek', color: '#4ade80', wins: 2, losses: 1 },
  ];

  test('answerForKey uses the file name after the category', () => {
    eq(L.answerForKey('Sławne osoby/Robert_Lewandowski (2).jpg'), 'Robert Lewandowski');
  });

  test('displayView: board with ranking when there is no duel', () => {
    eq(L.displayView({ duel: null, players: viewPlayers, now: 0 }), {
      screen: 'board',
      ranking: [
        { name: 'Bartek', color: '#4ade80', wins: 2, losses: 1 },
        { name: 'Ala', color: '#ff5a5a', wins: 1, losses: 0 },
      ],
    });
  });

  test('displayView: ready, running, low time', () => {
    const d = makeDuel({ images: ['Owoce/Banan.svg', 'Owoce/Jabłko.svg'] });
    let v = L.displayView({ duel: d, players: viewPlayers, now: 0 });
    eq([v.screen, v.category, v.left.name, v.right.name, v.left.seconds, v.left.active], ['ready', 'Test', 'Ala', 'Bartek', 45, true]);
    d.start(0);
    v = L.displayView({ duel: d, players: viewPlayers, now: 35500 });
    eq([v.screen, v.left.seconds, v.left.low, v.right.seconds, v.right.low, v.right.active], ['duel', 10, true, 45, false, false]);
    ok(v.imageKey === d.current && v.reveal === null && !v.paused);
  });

  test('displayView: reveal shows the answer, also while paused', () => {
    const d = makeDuel({ images: ['Kształty/Koło (2).svg'] });
    d.start(0);
    d.markPass(1000);
    eq(L.displayView({ duel: d, players: viewPlayers, now: 1500 }).reveal, 'Koło');
    d.togglePause(2000);
    const v = L.displayView({ duel: d, players: viewPlayers, now: 2500 });
    eq([v.paused, v.reveal], [true, 'Koło']);
  });

  test('displayView: finished shows the winner, nobody active', () => {
    const d = makeDuel();
    d.start(0);
    d.tick(45000);
    const v = L.displayView({ duel: d, players: viewPlayers, now: 46000 });
    eq([v.screen, v.winner, v.left.active, v.right.active, v.left.winner, v.right.winner, v.left.seconds],
      ['finished', { name: 'Bartek', color: '#4ade80' }, false, false, false, true, 0]);
  });

  // ---------- runner ----------

  function run() {
    const results = tests.map(t => {
      try {
        t.fn();
        return { name: t.name, ok: true };
      } catch (e) {
        return { name: t.name, ok: false, error: e.message };
      }
    });
    const failed = results.filter(r => !r.ok).length;
    return { results, passed: results.length - failed, failed };
  }

  const api = { run };
  if (isNode) module.exports = api;
  else root.FloorTests = api;
})(typeof window !== 'undefined' ? window : globalThis);
