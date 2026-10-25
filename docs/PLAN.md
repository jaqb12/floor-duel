# PLAN — Floor Duel

Work through the phases in order. After each phase: tests → checked boxes → commit `phase N: ...` → a list of things for the user to check by hand. Polish translation: [`PLAN.pl.md`](PLAN.pl.md).

---

## Phase 0 — Repo skeleton and `file://` spike
Goal: confirm that the key APIs work when `app/index.html` is opened by double-click (Edge and Chrome on Windows) before building the rest.

- [x] Directory structure from `CLAUDE.md`, an empty `app/index.html` with the script order, `operator.css`, empty JS modules on `window.Floor`.
- [x] Sample categories — 3 categories with ~8 SVG files each (simple shapes/text, file names with Polish letters, one with `(2)`, one with `__2`, one `.txt` file to be skipped).
- [x] Spike page (`app/spike.html`, removed after the phase) checking and printing OK/FAIL:
  - [x] `showDirectoryPicker` available and working from `file://`,
  - [x] saving/reading the folder handle in IndexedDB and `requestPermission` after a restart,
  - [x] the `<input webkitdirectory>` fallback returns files with `webkitRelativePath`,
  - [x] `localStorage` survives closing the browser,
  - [x] `window.open('', 'floor-display')` + writing to its DOM + showing a blob URL image,
  - [x] recovering the window reference after the operator refresh (does access to `document` work or throw).
- [x] Results in `docs/SPIKE.md` (browser, version, result, conclusions). If something doesn't work — a workaround proposal in the “Decision log”, **stop and ask the user** before phase 1.

**Acceptance:** the user opened the spike in Edge and Chrome and confirmed the results.

---

## Phase 1 — Logic core + tests (no UI)
- [x] `logic.js`: `normalizeAnswer(filename)`, `isSupportedImage(name)`, `isHeic(name)`, `shuffle(arr, rng)` (Fisher–Yates, injected RNG), `rankPlayers(players)`.
- [x] `logic.js`: the duel per SPEC §5 — `createDuel`, `start`, `markCorrect`, `markPass`, `togglePause`, `tick`, `getClock`, `nextImage` (deck with reshuffling without an immediate repeat). All methods take `now`.
- [x] Mini test runner (`tests/logic.test.js`) + `tests/tests.html` + `tests/run-node.js`.
- [x] Tests at least for:
  - [x] name normalization (examples from SPEC §3 + empty/odd names),
  - [x] clock: time runs only for the active player; after `markCorrect` the turn passes, time frozen correctly,
  - [x] pass: the reveal lasts 3 s, the clock keeps running, Space/P ignored, after the reveal the same player,
  - [x] timeout during `running` and during `reveal` → `finished` with the right winner,
  - [x] pause stops the clock and the reveal, resume continues,
  - [x] deck: no repeats until exhausted; after a reshuffle the first ≠ the last,
  - [x] ranking: wins ↓, losses ↑, name.

**Acceptance:** all tests green in Node (if available) and in `tests/tests.html`.

---

## Phase 2 — Categories from a folder
- [x] `categories.js`: folder choice (`showDirectoryPicker` or the fallback per the spike results), list of direct subfolders and files per SPEC §3.
- [x] Remembering the folder (IndexedDB) and the “Load last folder” button.
- [x] Category list in the panel: name, photo count, warning < 30, info about skipped HEIC.
- [x] Blob URL management (created on demand, released on a folder/category change).

**Acceptance (manual):** choosing the sample categories shows 3 categories with correct counts; `.txt` skipped; after a browser restart “Load last folder” works.

---

## Phase 3 — Players and persistence
- [x] `storage.js`: reading/writing `localStorage['thefloor.v1']` (players, settings) with a safe fallback for corrupted data.
- [x] Panel: add, edit, delete (confirmation), auto color from the palette, category assignment, `+1/−1` corrections, “Reset scores”, list in ranking order with `W–L`.
- [x] Settings: duel time, pass penalty, sound, hiding the answer.

**Acceptance (manual):** add 4 players, change scores, F5 — everything stays.

---

## Phase 4 — Players screen
- [x] `display.js`: opening/recovering the window, copying the CSS from `#display-css`, building the DOM.
- [x] Views: start board with the ranking, `ready`, `running`, pass reveal, `paused`, `finished` (SPEC §6).
- [x] Render loop on the players window's `requestAnimationFrame` + fallback `setInterval` (SPEC §7.3).
- [x] Messages for a closed/unrecovered window; after F5 “Open players screen” closes the old window and opens a new one (SPEC §7.3).
- [x] `beforeunload` warning while the players window is open or a duel is in progress. *(2026-10-24: in the manual test no question and no message — most likely F5 went to the players window, which has focus after opening. Fixed in phase 6: the players window blocks F5/Ctrl+R and the panel detects a refreshed window. To be checked again.)*

**Acceptance (manual):** window dragged to the TV, F11, readable from 3 m; closing the window doesn't break the panel.

---

## Phase 5 — Full duel
- [x] “Duel” panel: challenger/opponent choice, the opponent's default category, who starts, “🎲 random challenger”, START.
- [x] Keyboard shortcuts per SPEC §7.2 in both windows (repeat, debounce, text fields).
- [x] Photo preview + big answer for the operator, hiding the answer with H.
- [x] Preload + `decode()` of the next photo; skipping broken files.
- [x] End: “Confirm result” (wins/losses) / “Cancel”.
- [x] `sound.js` per SPEC §8.
- [x] Locks from SPEC §9.

**Acceptance (manual):** a full duel on the sample categories: a few correct answers, a pass with the reveal, timeout, confirming the result — counters and ranking correct, zero console errors.

---

## Phase 6 — Polish and documentation
- [x] Removing `spike.html`, code cleanup, no `console.log` except errors.
- [x] Single-screen mode (SPEC §7.4) with “Big preview”.
- [x] Look: consistent colors, big fonts on the TV, readable button states.
- [x] `README.md`: preparing the folder and file names, starting, two screens (Win+P → Extend, dragging the window, F11), keyboard shortcuts, rules, HEIC → JPG, FAQ.
- [ ] Test on the user's real folder (big phone photos).

**Acceptance:** the “done” definition from `CLAUDE.md` is met.

---

## Extension — difficulty levels for categories (user request, 2026-10-24)
- [x] `logic.js`: `groupRelativePaths` returns two folder levels; `resolveCategories` recognizes levels, sorts them and resolves repeated names (SPEC §3).
- [x] `categories.js`: reading two folder levels (handle and the `webkitdirectory` fallback), `Category.level`.
- [x] Panel: level headers in the category list, `<optgroup>` in the player and duel category selects.
- [x] Tests for `resolveCategories` and the new `groupRelativePaths`.
- [ ] Manual: a folder with `Easy` / `Hard` subfolders → categories grouped; a duel from a level category works; the TV shows only the category name.

---

## Extension — English project, languages, new name (user request, 2026-10-24)
- [x] New name **Floor Duel** (instead of “The Floor”, a TV show trademark); disclaimer in the README.
- [x] `app/js/i18n.js`: English and Polish dictionaries, `t()` with placeholders and plural forms, language detection, `applyToDocument()`.
- [x] `logic.js` returns problems as `{ key, params }` instead of Polish sentences; `settings.language`; English level names (`easy`, `medium`, `hard`).
- [x] Panel and players screen fully translated; language selector in the top bar, changes apply immediately in both windows.
- [x] Tests: the same keys/placeholders/plural forms in every language, `t()`, `detectLanguage`, translations of logic problems.
- [x] Samples: `samples/categories-en` (English names) and `samples/categories-pl` (Polish names, moved from `samples/Kategorie`), split into difficulty levels (`Easy` / `Hard`, `Łatwe` / `Trudne`).
- [x] Known difficulty levels shown in the UI language (`levelId` in `logic.js`, `levels.*` in `i18n.js`); `.gitignore` also covers `/Categories/`.
- [x] Documentation in English (`README.md`, `docs/*.md`, `CLAUDE.md`); Polish copies next to it (`*.pl.md`).
- [ ] Manual: switch the language during a duel → the panel and the TV change texts; F5 → the language is remembered.
- [ ] Manual: `samples/categories-en` and `samples/categories-pl` → categories grouped under Easy/Hard (Łatwe/Trudne); after a language switch the level headers change language.

---

## Manual test checklist (at the end)
1. Double-click `app/index.html` in Edge → no console errors.
2. Choose a folder → categories with counts, warnings work.
3. Add 3 players with categories.
4. Open the players screen → drag it to the second screen → F11.
5. Duel: Space ×3, P ×1 (answer visible for 3 s), wait until the time runs out.
6. Confirm the result → ranking on the TV and in the panel.
7. Esc during a duel → pause on both screens.
8. F5 on the panel → players and scores stay; players window recovered or a clear message.
9. “Hide the answer” mode + H.
10. Switch the language EN ↔ PL → all texts change in the panel and on the TV.

---

## Decision log
| Date | Decision | Reason |
|---|---|---|
| 2026-10-24 | Vanilla JS, classic scripts, `file://`, no build | Starting by double-click on Windows, offline |
| 2026-10-24 | Players window as about:blank driven from the operator | Chromium blocks scripts between `file://` files |
| 2026-10-24 | Pass = 3 s answer reveal with the clock running | As on TV, effect = −3 s |
| 2026-10-24 | Positive scoring only, losses informational, no elimination | Simple version for a party |
| 2026-10-24 | `.gitignore`: `Kategorie/` → `/Kategorie/` | The pattern without `/` also ignored the sample categories, which are meant to be committed |
| 2026-10-24 | After the operator's F5 the players window isn't recovered — only the message “Close the players window and open it again” (SPEC §7.3) | Spike, Edge 155: a new `"null"` origin on every load → `SecurityError`; navigating to `about:blank` doesn't restore access either |
| 2026-10-24 | `beforeunload` warning with the players window open / a duel in progress; “Open players screen” closes the old, unreachable window | Instead of recovering the window after F5 — preventing an accidental F5 (user's decision) |
| 2026-10-24 | Duel actions (`start`, `markCorrect`, `markPass`, `togglePause`, `tick`) return an array of events; empty = ignored. Every action calls `tick(now)` first | A late Space after the time ran out ends the duel instead of counting the answer |
| 2026-10-24 | `lowTime` = once per full second (5,4,3,2,1) of the active player | For the “tick” from SPEC §8 |
| 2026-10-24 | A reveal ending exactly when the time runs out = loss on time | Unambiguous order of events |
| 2026-10-24 | The `setup` state lives in the UI; `createDuel` returns a duel in the `ready` state | Choosing players/category is a form, not logic |
| 2026-10-24 | A name that would be empty after normalization (e.g. `(2).jpg`) stays as the name without the extension | The operator always sees some answer |
| 2026-10-24 | Added `applyResult(players, duel)` and `clockSeconds(ms)` in `logic.js` | Confirming the result and rounding the clock testable without DOM |
| 2026-10-24 | Order of categories and photos: natural, Polish-aware (`2.jpg` before `10.jpg`); hidden subfolders (`.git`) skipped | Predictable list in the panel |
| 2026-10-24 | Categories with 0 photos visible in the list (greyed out), with a note that they can't be chosen | The operator sees the folder exists but is empty |
| 2026-10-24 | Player names unique (case-insensitive), max 24 characters | Unambiguous ranking and player choice for a duel |
| 2026-10-24 | Setting ranges: duel time 10–300 s, pass penalty 1–10 s; out-of-range values clamped | Protection against a typo like 450 instead of 45 |
| 2026-10-24 | Corrupted JSON in `thefloor.v1` → start from scratch + a copy of the raw data in `thefloor.v1.corrupt` + a message in the panel | Safe fallback without losing data |
| 2026-10-24 | Palette of 12 bright colors (readable on the black TV screen) | SPEC §7.1, the players screen background is black |
| 2026-10-24 | The players screen view computed by the pure function `displayView({ duel, players, now })` in `logic.js`; `display.js` only draws | Views testable in Node |
| 2026-10-24 | When the panel closes/refreshes (`pagehide`) it closes the players window itself | After F5 it is useless anyway (white); no orphan left on the TV |
| 2026-10-24 | If “Open players screen” hits the old, unreachable window and can't open a new one right away — it closes the old one and asks for a second click | The browser allows one pop-up per click |
| 2026-10-24 | Ranking on the start board in two columns with > 8 players; clock ≤ 10 s red for both players, pulsing only for the active one | Readable from the couch |
| 2026-10-24 | The `ready` state = a draft duel created automatically when the player and category choice is valid; the players screen immediately shows “Get ready!” | SPEC §5: setup → ready after choosing 2 players and a category |
| 2026-10-24 | Changing the opponent sets their category (if it has photos); the operator can change it afterwards | SPEC §2.3 |
| 2026-10-24 | With “Hide the answer” the answer in the panel is uncovered during a pass and after the duel ends | In single-screen mode the players should see it as on the TV |
| 2026-10-24 | A broken photo is checked (`decode()`) in the panel, skipped and removed from the duel pool; counter in the panel | SPEC §9; it doesn't come back after a reshuffle |
| 2026-10-24 | “Cancel” always asks for confirmation | Protection against an accidental click during the game |
| 2026-10-24 | The players window (and the big preview) blocks F5 / Ctrl+R; the panel detects a window refreshed with the browser button (status “disconnected — open again”) | After opening, the focus is in the players window, so F5 went there and made a white screen without any message |
| 2026-10-24 | “Big preview” = the same players screen renderer in an `<iframe>` over the whole panel + a bar with the answer (blurred without H); `display.js` exposes `createRenderer(doc)` | SPEC §7.4; one view code for the TV and the single screen |
| 2026-10-24 | Global CSS rule `[hidden] { display: none !important }` | `display: flex` in classes overrode `hidden`: after confirming the result the duel section with active buttons stayed on screen (user report) |
| 2026-10-24 | Music for getting ready + sound effects for the operator + volume slider (SPEC §8) — synthesized in Web Audio, no files | User request; keeps the “no sound files” requirement, works offline |
| 2026-10-24 | The music fades out on START; effects only as buttons, no shortcuts | “Getting ready for the game”; shortcuts would clash with Space/P/Esc |
| 2026-10-24 | ~~“Suspense” automatically at 12 s, once per player~~ → replaced: suspense music once per duel (first 12 s on the clock), plays to the end and builds with the active player's time | User request: it should build tension, independent of the button |
| 2026-10-24 | 3 s countdown after START as the `countdown` state in `Duel` (`countdownSeconds`, 0 by default in the logic, 3 in the app); the clock starts from `countdownUntil`, not from the next tick | User request (“3 beeps like on the show”); time from timestamps |
| 2026-10-24 | Suspense music goes quiet on pause, returns on resume; after a turn change the intensity drops if the opponent has ≥ 12 s | Tension depends on who is answering now |
| 2026-10-24 | New applause: ~28 “people” with their own timbre, tempo and stereo position, different end times + a noise background | The previous applause sounded artificial (user report) |
| 2026-10-24 | Difficulty levels as intermediate folders (`Categories\Easy\Animals`); a folder with photos or without subfolders stays a category | User's choice (instead of a bracket in the folder name); the old layout works unchanged |
| 2026-10-24 | A category is still identified by its folder name; a repeated name with a level → “Name (Level)” | Players store their category as text — moving a folder into a level doesn't break assignments |
| 2026-10-24 | The last folder loads automatically on start, but only without asking for permission (`queryPermission` = granted); otherwise a message and the button | User request; `requestPermission` needs a click, so permission can't be asked for on start |
| 2026-10-24 | New panel layout: fits the window (lists scroll inside cards), top bar = players screen + sound/volume + ⚙ Settings in a dialog; right column = effects above categories; category filter from 9 categories; shortcut cheat sheet | User report: a long category list pushed the players screen, sounds and settings off screen |
| 2026-10-24 | Project renamed to **Floor Duel**; “The Floor” is mentioned only in a disclaimer as the inspiration | “The Floor” is the name (trademark) of a TV format; the game rules themselves aren't protected, the name is. “The Floor Party” would still contain the whole mark |
| 2026-10-24 | Storage keys stay `thefloor.v1` / IndexedDB `thefloor` | Invisible to players; renaming would lose saved players and the remembered folder |
| 2026-10-24 | Own `i18n.js` (no library): dictionaries + `t()` + `Intl.PluralRules`; language in `settings.language` (null = browser) | No dependencies, works from `file://`; Polish needs three plural forms |
| 2026-10-24 | The logic returns `{ key, params }` instead of texts | `logic.js` stays DOM- and language-free, testable in Node |
| 2026-10-24 | HTML contains English texts as defaults; `applyToDocument()` overwrites them on start and on a language change | The page is readable even before the scripts run; one mechanism for both cases |
| 2026-10-24 | The language selector sits in the top bar, language names in their own language (“English”, “Polski”) | Easy to find for someone who doesn't know the current language |
| 2026-10-24 | English documentation is the source of truth, Polish copies `*.pl.md` are translations | Public repository on GitHub; the user wanted to keep the Polish documentation |
| 2026-10-24 | Samples: `samples/categories-en` and `samples/categories-pl` (the same images, names in two languages) | The images have no text, so only file names differ; Polish samples still test diacritics |
| 2026-10-24 | Known difficulty levels (easy, normal, medium, hard, expert) are recognized in English and Polish and shown in the UI language; unknown level names are shown as they are | The user's level folders are Polish (`Łatwe`, `Trudne`); this keeps them working in the English UI without renaming folders. Categories and answers stay untranslated (content) |
| 2026-10-24 | “Normal” and “Medium” are separate levels (normal before medium) | `Normalne` and `Średnie` are different words; showing both as one label would rename the user's folder |
| 2026-10-24 | The duplicate-name suffix uses the level folder name (“Flags (Hard)”), not the translated label | The category name identifies the player's category in storage, so it must not change with the language |
| 2026-10-25 | Starter categories in `samples/`: Flags of Europe, Road signs, Flags of the world, Famous paintings (copied from the user's set, English and Polish file names); `samples/CREDITS.md` lists sources and rights | Only categories whose content is public domain (state symbols, official signs, paintings by authors dead > 70 years); photo categories would need per-file attribution, “Famous people” also image rights |
| 2026-10-25 | The same images twice (`categories-en`, `categories-pl`, ~17 MB each) | The answer is the file name, so each language needs its own copy; the repository stays small enough (~35 MB of samples) |
| 2026-10-25 | Shapes moved to the easy level; typos in the user's file names fixed in the samples (`Polksa` → `Polska`, `finladnia` → `Finlandia`, `NIemcy` → `Niemcy`, lowercase country names) | The hard level now has real categories; answers on screen should be spelled correctly |
