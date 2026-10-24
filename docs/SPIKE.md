# SPIKE — phase 0: browser APIs from `file://`

Polish translation: [`SPIKE.pl.md`](SPIKE.pl.md).

Test page: `app/spike.html` — removed in phase 6, available in git history (`git show 0dca6ad:app/spike.html`). Samples: the sample categories (Colors 9, Shapes 9 + a `.txt` note, Fruits 8; at the time in `samples/Kategorie`).

## Results

| Test | Edge 155.0.4283.62 | Chrome 155.0.8059.85 |
|---|---|---|
| `showDirectoryPicker` from `file://` | OK | OK |
| Handle in IndexedDB + `requestPermission` after a restart | OK (`granted` right away) | OK (after a restart `queryPermission` = `granted` right away) |
| `<input webkitdirectory>` fallback | OK (118 files) | OK (118 files, `webkitRelativePath` everywhere) |
| `localStorage` after a browser restart | OK (a marker from 18:19:18 read after the restart) | OK |
| `window.open('', 'floor-display')` + DOM + blob URL | OK (SVG 640×360, `decode()` OK) | OK (`10.webp` 1280×640) |
| Keyboard in the players window | OK (Space, P) | OK (Space) |
| Recovering the window after the operator's F5 | **FAIL**: `SecurityError` (origin `"null"`), the window turns white; without a click `window.open` returns `null` | undecided (attempts most likely without F5) |
| Taking over the window by navigating to `about:blank` | FAIL (no access after 3 s) | FAIL (no access after 3 s) |

## Conclusions
- Edge gives a `file://` page the origin `"null"`, a new one on every load. After F5 the operator panel loses access to the players window, and the window loses its content.
- Without a user gesture `window.open('', 'floor-display')` returns `null` (pop-up blocker) — automatic recovery on start is not possible.
- Folder choice, IndexedDB, `webkitdirectory`, `localStorage`, the players window with blob URLs and the keyboard work in both browsers.
- → Decision (SPEC §7.3): the window is not recovered. A `beforeunload` warning protects against an accidental F5; after F5 “Open players screen” closes the old window and opens a new one.
