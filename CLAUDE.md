# CLAUDE.md — The Floor (domowa wersja)

## Czym jest projekt
Prosta, domowa wersja teleturnieju **The Floor**: pojedynki dwóch graczy na rozpoznawanie zdjęć z kategorii, zegar szachowy 45 s na gracza, operator zatwierdza odpowiedzi. Aplikacja działa **lokalnie na Windows w Edge/Chrome**, uruchamiana dwuklikiem w `app/index.html`.

Pełna specyfikacja: `docs/SPEC.md`. Plan prac z fazami i checkboxami: `docs/PLAN.md`. **Przeczytaj oba przed jakąkolwiek zmianą.**

## Twarde ograniczenia (nie łam ich bez zgody użytkownika)
- **Zero build stepu i zero zależności w runtime.** Czysty HTML + CSS + vanilla JS. Brak npm, bundlera, frameworka, CDN (gra ma działać offline na imprezie).
- **Działa z `file://`.** Dlatego:
  - **Bez ES modules** (`type="module"` nie działa z `file://` w Chromium). Używaj klasycznych `<script src="...">` w ustalonej kolejności i jednej przestrzeni nazw `window.Floor`.
  - **Bez `fetch()` lokalnych plików.** Style okna graczy trzymaj w `<style id="display-css" media="not all">` w `index.html` i kopiuj do okna graczy.
  - Okno graczy otwieraj jako `window.open('', 'floor-display', ...)` (about:blank, dziedziczy origin) i buduj jego DOM z okna operatora. Nie otwieraj osobnego pliku `display.html` — Chromium blokuje skrypty między różnymi plikami `file://`.
- **Docelowe przeglądarki:** aktualny Microsoft Edge i Google Chrome na Windows 10/11. Inne przeglądarki — best effort.
- **Logika gry bez DOM.** Wszystko, co dotyczy zasad, zegara, tasowania, parsowania nazw plików i rankingu, siedzi w `app/js/logic.js` jako czyste funkcje / klasy z **wstrzykiwanym zegarem (`now`)**. Ma się dać testować w Node i w przeglądarce.

## Struktura repo
```
CLAUDE.md
README.md                 # instrukcja dla użytkownika (powstaje w fazie 6)
.gitignore
docs/
  SPEC.md                 # specyfikacja funkcjonalna i techniczna (źródło prawdy)
  PLAN.md                 # fazy, zadania, kryteria odbioru, dziennik decyzji
  SPIKE.md                # wyniki fazy 0 (powstaje w trakcie)
app/
  index.html              # panel operatora + <style id="display-css"> dla okna graczy
  css/operator.css
  js/logic.js             # czysta logika (testowalna)
  js/storage.js           # localStorage (gracze, ustawienia) + IndexedDB (uchwyt folderu)
  js/categories.js        # odczyt folderu kategorii
  js/sound.js             # WebAudio, bez plików dźwiękowych
  js/display.js           # budowa i aktualizacja DOM okna graczy
  js/operator.js          # UI operatora, obsługa klawiatury
  js/main.js              # spina wszystko, start aplikacji
tests/
  tests.html              # uruchamia testy logiki w przeglądarce
  logic.test.js           # testy (mini-runner bez bibliotek)
  run-node.js             # opcjonalnie: `node tests/run-node.js`, jeśli Node jest zainstalowany
samples/Kategorie/        # małe testowe kategorie (SVG/PNG) — commitowane
```
Prawdziwe zdjęcia użytkownika leżą poza repo albo w `Kategorie/` (ignorowane przez git).

## Konwencje
- **UI po polsku**, kod, nazwy i komentarze po angielsku.
- Pliki JS: IIFE dopisujące do `window.Floor` (np. `Floor.logic`, `Floor.display`). W `logic.js` dodatkowo `if (typeof module !== 'undefined') module.exports = ...` dla Node.
- Kolejność skryptów w `index.html`: logic → storage → categories → sound → display → operator → main.
- Czas liczymy **z timestampów** (`performance.now()`), nigdy przez odejmowanie stałej co tick.
- Bez `innerHTML` z nazwami graczy/plików — używaj `textContent` (nazwy plików mogą zawierać cokolwiek).
- Małe, czytelne funkcje; bez przedwczesnych abstrakcji. To aplikacja na imprezę, nie platforma.

## Sposób pracy
1. Pracuj **fazami z `docs/PLAN.md`**, po kolei. Nie zaczynaj kolejnej fazy, dopóki poprzednia nie spełnia kryteriów odbioru.
2. Po każdej fazie: uruchom testy logiki (`node tests/run-node.js`, jeśli jest Node; inaczej poproś użytkownika o otwarcie `tests/tests.html`), odhacz checkboxy w `PLAN.md`, zrób **commit** `phase N: <krótki opis>`.
3. Rzeczy, których nie da się sprawdzić automatycznie (wygląd, dwa ekrany, dźwięk), wypisz użytkownikowi jako krótką listę do ręcznego sprawdzenia na koniec fazy.
4. Jeśli spec jest niejasny albo coś z niego nie działa w przeglądarce — **nie zgaduj po cichu**. Wybierz najprostsze rozsądne rozwiązanie, zapisz je w sekcji „Dziennik decyzji” w `PLAN.md` i powiedz o tym użytkownikowi.
5. Nie dodawaj funkcji spoza `SPEC.md` (sekcja „Poza zakresem”) bez pytania.

## Definicja „gotowe”
- Dwuklik w `app/index.html` w Edge lub Chrome → wybór folderu → dodanie graczy → pełny pojedynek z zegarem, pasem i wynikiem, bez błędów w konsoli.
- Wyniki graczy przetrwają odświeżenie strony.
- Testy logiki przechodzą.
- `README.md` opisuje użytkowanie po polsku.

# Dodatkow
- odpowiadaj po polsku w konsoli