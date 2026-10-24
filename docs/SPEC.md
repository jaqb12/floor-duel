# SPEC — Floor Duel

The source of truth for how the app behaves. Rule changes go here. Polish translation: [`SPEC.pl.md`](SPEC.pl.md).

## 1. Goal
Running home duels in the style of TV photo-quiz game shows (e.g. *The Floor*; the project is not affiliated with it). One Windows computer, two browser windows:
- **Operator panel** — on the laptop, seen only by the host (the correct answers are here).
- **Players screen** — on the TV / second monitor, full screen (F11).

Works on a single screen too (see 7.4 — hiding the answer).

## 2. Game rules
1. Players have: a name, a color, optionally an assigned category, counters of **wins** and **losses**.
2. The operator chooses the player who **challenges** (challenger). The challenger picks an **opponent**.
3. **Duel category:** by default the category assigned to the opponent (as on TV). If the opponent has no category, or its folder doesn't exist, the operator must choose one from the list. The operator can always change the category before the start.
4. **Who answers first:** the challenger by default; the operator can switch it before the start.
5. **Chess clock:** each player has `duelSeconds` (default **45 s**). Time runs only for the player who is currently answering.
6. **Correct answer** (operator: Space): new photo, the turn and the clock pass to the opponent.
7. **Pass** (operator: P, when the player says “pass”): for `passPenaltySeconds` (default **3 s**) the players screen shows the correct answer under the photo; the passing player's clock **keeps running** meanwhile. Then a new photo for the **same** player. During the reveal Space/P are ignored. Effect = losing 3 s (as on TV).
8. **End:** when a player's clock reaches 0 (also during a pass reveal), that player loses. The players screen shows the winner.
9. **Positive scoring only:** winner `wins +1`, loser `losses +1` (informational). The result is saved only after clicking “Confirm result”; instead, the operator can “Cancel duel” (nothing changes).
10. **Ranking:** by `wins` descending, then `losses` ascending, then name.
11. Nobody is eliminated — after a duel everyone keeps playing (simpler than TV).

## 3. Categories and photos
- The user points to a **main folder** (e.g. `D:\FloorDuel\Categories`).
- **Each direct subfolder = a category.** Category name = subfolder name.
- **Difficulty levels** (added at the user's request, 2026-10-24): a subfolder with no photos directly inside but with subfolders is a **level** (e.g. `Categories\Easy\Animals\`); its subfolders are that level's categories. We don't look deeper. Both layouts can be mixed — a category without a level works as before.
  - Level order: easy → normal/medium → hard → expert (recognized by the start of the name, case-insensitive, English or Polish: `easy`/`łatw`, `norm`/`medium`/`śred`, `hard`/`trud`, `exp`/`eksp`); other level names last, alphabetically. Categories without a level come first.
  - The category name is its folder's name (players don't see the level). When the same name occurs in several places, categories with a level get the suffix “Name (Level)”.
  - The operator panel shows categories grouped by level (headers in the list, groups in the selects).
- **Photos = files directly in the category folder** (no recursion). Supported extensions (case-insensitive): `jpg, jpeg, png, webp, gif, bmp, avif, svg`.
- Skipped: hidden files (starting with `.`), `Thumbs.db`, `desktop.ini`, other extensions. **HEIC/HEIF** are skipped with a clear warning (“X HEIC files — convert to JPG”).
- **Correct answer = file name** after normalization:
  1. remove the extension,
  2. remove a duplicate suffix: ` (2)` at the end (regex `\s*\(\d+\)$`) and `__2` at the end (regex `__\d+$`),
  3. replace `_` with a space, collapse multiple spaces, `trim`, Unicode NFC normalization.
  Examples: `Eiffel_Tower.jpg` → “Eiffel Tower”; `Elephant (2).png` → “Elephant”; `Elephant__3.webp` → “Elephant”; `F-16.jpg` → “F-16”; `Wieża_Eiffla.jpg` → “Wieża Eiffla”.
- The category list in the operator panel shows the number of photos. **Warning** when a category has < 30 photos (a duel can use 30+).
- **Duel pool:** at the start of a duel, a Fisher–Yates shuffle of all the category's photos; photos without repeats. When the pool runs out — reshuffle (avoiding the photo just shown) and show the operator a discreet “pool used up — repeats” note.
- Remembering the folder: if `showDirectoryPicker` works, the handle is stored in IndexedDB; on the next start/refresh the app tries to load it by itself (only while the browser permission is still valid — `queryPermission`); if that fails, it shows a message and the “Load last folder” button asks for permission (requires a click — `requestPermission`). Fallback: `<input type="file" webkitdirectory>` (not remembered; after a refresh the folder must be chosen again).
- Photos are loaded as `URL.createObjectURL(file)`; on a folder/category change they are released (`revokeObjectURL`). **The next photo is preloaded** and we wait for `img.decode()` before showing it, so big phone photos don't flash.

## 4. Data model
```js
Player   = { id, name, color, category /* string|null */, wins, losses }
Settings = { duelSeconds: 45, passPenaltySeconds: 3, sound: true, hideAnswer: false, volume: 80,
             language: null /* 'en' | 'pl' | null = follow the browser */ }

// Duel state (in logic.js, no DOM):
Duel = {
  state,             // 'setup' | 'ready' | 'countdown' | 'running' | 'reveal' | 'paused' | 'finished'
  challengerId, opponentId, category,
  activeId,          // who is answering now
  remainingMs: { [playerId]: number },  // clock value at turnStartedAt
  turnStartedAt,     // timestamp (ms) when the active player's current time segment started
  revealUntil,       // timestamp when the pass reveal ends
  deck: string[],    // photo keys in order
  deckPos, current,  // current photo
  winnerId, loserId,
  stats: { [playerId]: { correct, passes } }
}
```
Active player's remaining time = `remainingMs[activeId] - (now - turnStartedAt)`. On a turn change / pause the value is “frozen” into `remainingMs`.

**Persistence:** `localStorage['thefloor.v1'] = { players, settings }`. Folder handle: IndexedDB `thefloor` / store `handles` / key `root`. (The storage keys keep the project's original working name so existing saved players and folders keep working.)

## 5. Duel state machine
```
setup ──(2 players + category chosen)──> ready
ready ──START──> countdown (3 s: 3, 2, 1) ──> running   (the clock starts exactly when the countdown ends)
running ──Space──> running (new photo, turn → opponent)
running ──P──> reveal ──(after passPenaltySeconds)──> running (new photo, same player)
running/reveal ──active clock = 0──> finished
running ──Esc──> paused ──Esc──> running   (pause also stops the reveal countdown)
finished ──“Confirm result”──> (counters updated) ──> no duel
any ──“Cancel”──> no duel (counters unchanged)
```
Logic API (all methods take `now`):
`createDuel({...})`, `start(now)`, `markCorrect(now)`, `markPass(now)`, `togglePause(now)`, `tick(now) → events[]` (e.g. `'timeout'`, `'revealEnd'`, `'lowTime'`), `getClock(id, now)`, `nextImage()`.

## 6. Players screen (TV window)
- Black/dark background, high contrast, readable from the couch.
- **Top:** category name.
- **Middle:** the photo, `object-fit: contain`, as big as possible.
- **Bottom:** two player panels (left = challenger, right = opponent): name in the player's color and a big clock in seconds (rounded up). The active panel clearly highlighted, the inactive one dimmed. ≤ 10 s — the clock is red/pulsing.
- **Pass reveal:** a bar with the correct answer over the photo + a “PASS” tag.
- **States:** no duel → “FLOOR DUEL” board + ranking; `ready` → names, category, “Get ready!”; `countdown` → big digits 3, 2, 1; `paused` → “PAUSED” overlay; `finished` → big winner announcement.
- No controls and no cursor at all (`cursor: none`).
- Texts follow the operator panel's language (§11).

## 7. Operator panel
### 7.1 Layout
- **Players column:** add form (name, category from the list — optional; color assigned automatically from a palette of 12 contrasting colors, editable), player list in ranking order with `W–L`, `+1/−1` buttons for manual win corrections, edit, delete (with confirmation), “Reset scores” (with confirmation).
- **Duel column:** challenger and opponent choice, a “🎲” button (random challenger), category choice, who starts, START. During the duel: preview of the current photo (thumbnail) and the **big correct answer**, both clocks, CORRECT / PASS / PAUSE buttons, statistics (correct/passes). After the end: “Confirm result” / “Cancel”.
- **Side column:** sound effects, folder choice/loading, category list with photo counts and warnings.
- **Top bar:** “Open players screen”, “Big preview”, sound switch and volume, language selector, “⚙ Settings” (dialog: duel time, pass penalty, hiding the answer).

### 7.2 Keyboard (active in both windows)
| Key | Action |
|---|---|
| Space | correct answer |
| P | pass |
| Esc | pause / resume |
| Enter | START (in the `ready` state) |
| H (hold) | show the answer when “Hide the answer” is on |

- Ignore `event.repeat`, plus a 250 ms debounce for Space and P.
- Shortcuts are off while the focus is in a text field.
- `preventDefault` for Space (so it doesn't “click” the focused button).
- The same handler is attached to the players window's `document` (the operator may accidentally click the TV window).

### 7.3 Players window — technical
- Opened with a button: `window.open('', 'floor-display', 'popup,width=1280,height=720')`. The DOM is built by `display.js`, the CSS copied from `<style id="display-css" media="not all">`.
- Photo blob URLs work in that window because about:blank inherits the operator's origin.
- **After the operator panel is refreshed, the players window can't be recovered** (spike, `docs/SPIKE.md`: a `file://` page gets a new `"null"` origin on every load → `SecurityError`; without a click `window.open` returns `null`). Therefore:
  - The panel remembers in `localStorage` that the players window was open; after a refresh it shows “The players window closed when the panel was refreshed — click »Open players screen«”.
  - “Open players screen”: if `window.open('', 'floor-display', ...)` returns the old window without access to `document` — call `close()` on it and open a new one. If closing fails — the message “Close the players window and open it again”.
- **Warning before F5/close:** while the players window is open or a duel is in progress, the operator panel registers `beforeunload` (the browser's standard “Leave site?” question).
- Render loop: `requestAnimationFrame` of the **players window** (it is visible on the TV, so it isn't throttled), with a fallback `setInterval(100)` in the operator window. Correctness doesn't depend on the tick rate (time from timestamps).

### 7.4 Single-screen mode
The “Hide the answer” setting: in the operator panel the answer is blurred and shows only while **H** is held. The players window can then be skipped and the game played on the operator panel alone with a big photo preview (the “Big preview” button enlarges it to the whole panel).

## 8. Sound (Web Audio, no files)
- A short “tick” every second in the active player's last 5 s.
- **Countdown before the round:** after START three short beeps (3, 2, 1) and a long high tone when the clock starts.
- **Suspense music** (independent of the “Suspense” button): starts once per duel, the first time 12 s appear on the clock (event `suspense`; none when the duel time is ≤ 12 s), and plays until the end of the duel. Intensity = 1 − (active player's time / 12 s): faster pulse, higher and brighter drone, extra layers (ostinato, snare). Pause silences it, resume brings it back, timeout/cancel ends it.
- A short “ding” on a correct answer, a low tone on a pass.
- A long buzzer at timeout.
- `AudioContext` created/resumed on a click on START or any sound button (browser requirement). Switch and volume slider (0–100, default 80) in the top bar; sound off mutes everything, including music.
- **Music for getting ready** (added at the user's request, 2026-10-24): the “🎵 Music” button next to START and in the effects section — a looped, synthesized background; fades out on START, can also be stopped manually.
- **Effects for the operator** (“Sound effects” section): drumroll, fanfare, applause, suspense, gong, “miss”. Buttons only, no keyboard shortcuts (so they don't clash with the game).

## 9. Edge cases
- Fewer than 2 players → START disabled. Challenger ≠ opponent.
- A category with 0 photos → can't be chosen.
- Changing/reloading the folder during a duel → blocked (finish/cancel first).
- Deleting a player taking part in the current duel → blocked.
- A broken file (`decode()` error) → skip it, take the next one, log it to the console, show the operator a counter of skipped files.
- Players window closed during a duel → the game continues in the operator panel, the panel shows “Players screen: closed — open it again”.
- Page refreshed during a duel → the duel is lost (duels aren't persisted), players and scores stay.

## 10. Out of scope (don't build without asking)
Territory board, player elimination, golden block, taking over categories, phone control, network/server, speech recognition, photo/category editor, score export.

## 11. Languages (added at the user's request, 2026-10-24)
- UI languages: **English** and **Polish**. Default: the first supported language in `navigator.languages`, otherwise English. The operator can change it with the selector in the top bar; the choice is saved in `settings.language`.
- All texts live in `app/js/i18n.js` (`Floor.i18n`): dictionaries per language, `t(key, params)` with `{placeholder}` substitution and plural forms via `Intl.PluralRules`. A missing key falls back to English, then to the key itself.
- `logic.js` stays language-free: validation returns problems as `{ key, params }`, translated by the UI.
- Static texts in `index.html` are marked with `data-i18n` (text), `data-i18n-title`, `data-i18n-placeholder`, `data-i18n-label` (`aria-label`). A language change takes effect immediately in both windows, without a reload.
- Category names and answers come from folder and file names and are never translated.
- Tests check that every language has the same keys, placeholders and plural forms.
