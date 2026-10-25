# Floor Duel

**A party game for the living room, inspired by the TV show *The Floor*: two players, one photo category, a chess clock each.**
Players name what they see in the photos, the host judges the answers with the keyboard, and whoever runs out of time first loses the duel.

Floor Duel runs **in the browser, with no installation, no server and no internet** — just double-click `app/index.html` in Microsoft Edge or Google Chrome. Put the players screen on the TV and keep the host panel (with the answers) on your laptop.

🇵🇱 [Polska wersja README](README.pl.md)

> Floor Duel is a fan-made home game inspired by TV photo-quiz game shows such as *The Floor*. It is not affiliated with, endorsed by or connected to the show or its owners. All trademarks belong to their respective owners.

## Features

- **Two windows:** a host panel with the correct answers and a full-screen players screen for the TV — or a single-screen mode with the answer hidden.
- **Chess clock** per player (45 s by default), a pass costs 3 s and briefly reveals the answer.
- **Your own photos:** each folder is a category, each file name is the answer. Optional difficulty levels as folders.
- **Players and scores** saved in the browser, ranking on the TV between duels.
- **Synthesized sound** (Web Audio, no sound files): 3-2-1 countdown, suspense music in the last 12 s, ticks, buzzer, applause, fanfare, drumroll and more.
- **English and Polish UI** — picked from the browser language, switchable in the top bar.
- Plain HTML + CSS + JavaScript: no build step, no dependencies, works offline from `file://`.

## Requirements

- Windows 10/11 with a current **Microsoft Edge** or **Google Chrome** (other Chromium browsers and systems: best effort).
- Optional: a TV or second monitor.

## Quick start

1. Download the repository (**Code → Download ZIP**) and unzip it.
2. Double-click `app/index.html`.
3. Click **Choose folder…** and pick `samples/categories-en` to try it out.
4. Add two players, choose them and a category in the **Duel** column and press **START** (or Enter).

## 1. Prepare the photos

Create a main folder, e.g. `D:\FloorDuel\Categories` (any name works). **Each subfolder is one category**, with the photos directly inside. Tip: a `Categories` folder inside the project folder is ignored by git, so your photos can live next to the app without ending up in the repository.

Example:

```
Categories\
  Animals\
    Elephant.jpg
    Giraffe.png
    Blue_whale.webp
  Landmarks\
    Eiffel_Tower.jpg
    Big_Ben.jpg
```

**The file name is the correct answer** shown to the host (and to the players after a pass):

| File name | Answer |
|---|---|
| `Eiffel_Tower.jpg` | Eiffel Tower (`_` becomes a space) |
| `Elephant (2).png` | Elephant (the ` (2)` suffix is removed) |
| `Elephant__3.webp` | Elephant (the `__3` suffix is removed) |
| `F-16.jpg` | F-16 |
| `10.jpg` | 10 — **wrong**: name the file after the answer! |

- Supported formats: **JPG, PNG, WEBP, GIF, BMP, AVIF, SVG**.
- Subfolders inside a category, hidden files and other formats are skipped (except level folders, see below).
- **iPhone photos (HEIC)** are not supported — the panel shows a warning. Convert them to JPG (e.g. in the Photos app: *Save as* → JPG, or on the iPhone: *Settings → Camera → Formats → Most Compatible*).
- A duel can easily use **30 or more photos** — with fewer, photos start repeating (the panel warns you).

**Difficulty levels (optional).** Group categories into level folders — the panel shows them in groups, the players only see the category name:

```
Categories\
  Easy\
    Animals\
    Fruits\
  Hard\
    Airplanes\
  Flags\          ← a category without a level works too
```

A folder with no photos but with subfolders is a level. Name level folders in English or Polish — **Easy / Łatwe, Normal / Normalne, Medium / Średnie, Hard / Trudne, Expert / Eksperckie** (only the start of the name counts, case doesn't matter). The panel orders them from easy to expert and shows them in the panel's language, whatever the folder is called. Other level names also work: they are shown as they are and go last. If the same category name appears in two levels, the panel adds the level folder in brackets, e.g. “Flags (Hard)”.

Sample categories for trying the app, already split into levels: `samples/categories-en` (`Easy\Colors`, `Easy\Fruits`, `Hard\Shapes`) and `samples/categories-pl` (the same with Polish names).

## 2. Start

1. Double-click `app\index.html` (it opens in your default browser — if that isn't Edge or Chrome, right-click → *Open with*).
2. In the **Categories** column click **Choose folder…** and pick the main folder. Allow the browser to read it.
3. Next time (and after a refresh) the last folder loads by itself. If the browser asks for permission again, the panel says so — click **Load last folder** and allow it.

The language follows your browser; change it with the selector in the top bar (it is remembered).

## 3. Add players

In the **Players** column type a name, optionally pick the player's category (their “home” category, as on TV) and click **Add player**. A color is assigned automatically; you can change it.

Players and scores are saved in the browser and **survive closing and refreshing** the page. The `+1 / −1` buttons correct the number of wins, **Reset scores** starts a new tournament.

## 4. Players screen on the TV

1. Connect the TV and press **Win + P → Extend**.
2. In the panel click **Open players screen** — a new window opens.
3. Drag it to the TV and press **F11** (full screen).
4. The host panel stays on the laptop — only there can you see the correct answers.

Don't refresh the panel (F5) during the game — the players window loses its connection and has to be opened again (the browser asks for confirmation). Players and scores stay; only the duel in progress is lost.

### Only one screen?

Turn on **Hide the answer** in **Settings** and click **Big preview** — the players screen fills the whole panel. The answer in the top bar is blurred; the host peeks at it by **holding H**.

## 5. The duel

1. In the **Duel** column choose the **challenger** (or **🎲** for a random one) and the **opponent**. The category switches to the opponent's category — you can change it.
2. Choose who answers first. The TV shows “Get ready!”.
3. **START** or **Enter**.
4. The player says the answer, the host judges:

| Key | Action |
|---|---|
| **Space** | correct — new photo, the clock passes to the opponent |
| **P** | pass — everyone sees the answer for 3 s while the passing player's clock keeps running, then a new photo for the same player |
| **Esc** | pause / resume |
| **Enter** | START |
| **H** (hold) | show the hidden answer |

The shortcuts work in both windows (also if you accidentally click the players window), but not in text fields.

5. When a player's clock reaches zero, they lose. Click **Confirm result** (winner +1 win, loser +1 loss) or **Cancel** (nothing changes).

### Music and effects

- **🎵 Music** (next to START and in *Sound effects*) — background music while getting ready. It fades out on START.
- After **START** there is a **3, 2, 1** countdown (beeps and big digits on the TV) — the clock starts on the signal.
- **Suspense music** starts by itself the first time **12 seconds** appear on the clock and builds up as the answering player's time runs out. The 💓 Suspense button is a separate short effect.
- **Sound effects**: 🥁 Drumroll, 🎺 Fanfare, 👏 Applause, 💓 Suspense, 🔔 Gong, 😬 Miss — use them any time.
- Volume and the **Sound** switch (mutes everything) are in the top bar.

## 6. Rules in short

- Only the answering player's clock runs; each player has their own clock (45 s by default, change it in Settings).
- A pass costs 3 s (change it in Settings).
- Ranking: most wins, then fewer losses, then alphabetical.
- Nobody is eliminated — after a duel everyone keeps playing.

## FAQ

**I don't see “Load last folder”.** It appears only in Edge and Chrome after choosing a folder with *Choose folder…*. If the folder was moved, choose it again.

**The browser blocked the players window.** Click the blocked pop-up icon in the address bar → *Always allow pop-ups*, then click **Open players screen** again.

**The players window is white / empty.** Close it and click **Open players screen** (sometimes twice — the panel tells you).

**No sound.** Check the **Sound** switch and the system volume. Sound starts after the first click on START.

**A photo doesn't show.** Broken files are skipped automatically — the panel shows how many. Check them in a photo viewer.

**Photos repeat.** The category has too few photos — when the pool runs out the photos are reshuffled (the panel shows “pool used up — repeats”).

**Where are the scores saved?** In the browser storage (localStorage) — separately for Edge and Chrome. Clearing browser data deletes them.

## For developers

- No build and no dependencies: classic `<script>` files sharing the `window.Floor` namespace, so everything works from `file://`.
- Game logic (rules, clock, shuffling, file name parsing, ranking) is DOM-free in `app/js/logic.js`; translations live in `app/js/i18n.js`.
- Tests: `node tests/run-node.js`, or open `tests/tests.html` in the browser.
- Specification: [`docs/SPEC.md`](docs/SPEC.md), plan and decision log: [`docs/PLAN.md`](docs/PLAN.md), browser spike results: [`docs/SPIKE.md`](docs/SPIKE.md). Polish versions: `*.pl.md`.

**Adding a language:** copy the `en` block in `app/js/i18n.js`, translate the values, add the language to `LANGUAGE_NAMES` and run the tests (they check that all languages have the same keys and placeholders).

**Adding a translated difficulty level:** add it to `LEVELS` in `app/js/logic.js` (id, name stems in every language, position in the order) and a `levels.<id>` label to every language in `app/js/i18n.js`. Without that, a new level folder still works, but its name is shown as it is.
