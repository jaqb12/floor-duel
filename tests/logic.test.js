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
