# CLAUDE.md — Floor Duel

## What the project is
**Floor Duel** — a simple home party game inspired by TV photo-quiz shows (such as *The Floor*; not affiliated — don't use that name for the project): duels of two players recognizing photos from a category, a 45 s chess clock per player, the operator approves the answers. The app runs **locally on Windows in Edge/Chrome**, started by double-clicking `app/index.html`. UI in English and Polish.

Full specification: `docs/SPEC.md`. Work plan with phases and checkboxes: `docs/PLAN.md`. **Read both before any change.**

## Hard constraints (don't break them without the user's consent)
- **No build step and no runtime dependencies.** Plain HTML + CSS + vanilla JS. No npm, bundler, framework or CDN (the game has to work offline at a party).
- **Works from `file://`.** Therefore:
  - **No ES modules** (`type="module"` doesn't work from `file://` in Chromium). Use classic `<script src="...">` in a fixed order and one namespace `window.Floor`.
  - **No `fetch()` of local files.** Keep the players window styles in `<style id="display-css" media="not all">` in `index.html` and copy them into the players window.
  - Open the players window as `window.open('', 'floor-display', ...)` (about:blank, inherits the origin) and build its DOM from the operator window. Don't open a separate `display.html` — Chromium blocks scripts between different `file://` files.
- **Target browsers:** current Microsoft Edge and Google Chrome on Windows 10/11. Other browsers — best effort.
- **Game logic without DOM.** Everything about rules, clock, shuffling, file name parsing and ranking lives in `app/js/logic.js` as pure functions / classes with an **injected clock (`now`)**. It must be testable in Node and in the browser. The logic is also language-free: it returns problems as `{ key, params }`, translated by the UI.

## Repo structure
```
CLAUDE.md
README.md / README.pl.md  # user guide (English / Polish)
LICENSE                   # MIT
.gitignore
docs/
  SPEC.md                 # functional and technical specification (source of truth)
  PLAN.md                 # phases, tasks, acceptance criteria, decision log
  SPIKE.md                # phase 0 results
  KICKOFF.md              # historical first prompts
  *.pl.md                 # Polish translations of the above
app/
  index.html              # operator panel + <style id="display-css"> for the players window
  css/operator.css
  js/logic.js             # pure logic (testable)
  js/i18n.js              # translations (en, pl), t(), language detection
  js/storage.js           # localStorage (players, settings) + IndexedDB (folder handle)
  js/categories.js        # reading the categories folder
  js/sound.js             # Web Audio, no sound files
  js/display.js           # building and updating the players window DOM
  js/operator.js          # operator UI, keyboard handling
  js/main.js              # wires everything together, starts the app
tests/
  tests.html              # runs the logic tests in the browser
  logic.test.js           # tests (mini runner without libraries)
  run-node.js             # `node tests/run-node.js`
  fixtures/categories/    # tiny categories for manual file-handling checks (Polish letters, suffixes, skipped .txt)
samples/
  categories-en/          # starter categories with English names (Easy/Normal/Hard) — committed
  categories-pl/          # the same images with Polish names
  CREDITS.md / .pl.md     # sources and rights; add only public-domain or own content here
```
The user's real photos live outside the repo or in `Categories/` (ignored by git, as are `categories/` and the old `Kategorie/`). The user's set uses Polish level folders (`Łatwe`, `Normalne`, `Trudne`, `Eksperckie`).

## Conventions
- **Code, names, comments and documentation in English.** UI texts only in `app/js/i18n.js` — every new text gets a key in **all** languages (tests check it). In `index.html` mark static texts with `data-i18n`, `data-i18n-title`, `data-i18n-placeholder`, `data-i18n-label`.
- English docs are the source of truth; when changing them, update the Polish `*.pl.md` copies too.
- JS files: IIFEs adding to `window.Floor` (e.g. `Floor.logic`, `Floor.display`). In `logic.js` and `i18n.js` also `if (typeof module !== 'undefined') module.exports = ...` for Node.
- Script order in `index.html`: logic → i18n → storage → categories → sound → display → operator → main.
- Time is computed **from timestamps** (`performance.now()`), never by subtracting a constant every tick.
- No `innerHTML` with player or file names — use `textContent` (file names can contain anything).
- Small, readable functions; no premature abstractions. It's a party app, not a platform.

## How to work
1. Work **in phases from `docs/PLAN.md`**, in order. Don't start the next phase until the previous one meets its acceptance criteria.
2. After each phase: run the logic tests (`node tests/run-node.js` if Node is available; otherwise ask the user to open `tests/tests.html`), check the boxes in `PLAN.md`, make a **commit** `phase N: <short description>`.
3. Things that can't be checked automatically (look, two screens, sound) — list them for the user as a short manual checklist at the end of the phase.
4. If the spec is unclear or something from it doesn't work in the browser — **don't guess silently**. Choose the simplest reasonable solution, record it in the “Decision log” in `PLAN.md` and tell the user.
5. Don't add features from the “Out of scope” section of `SPEC.md` without asking.

## Definition of “done”
- Double-click `app/index.html` in Edge or Chrome → choose a folder → add players → a full duel with the clock, pass and result, without console errors.
- Players' scores survive a page refresh.
- Logic tests pass.
- `README.md` (English) and `README.pl.md` (Polish) describe how to use the app.

# Additional
- answer in Polish in the console
