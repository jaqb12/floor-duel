# PLAN — The Floor (domowa wersja)

Pracuj fazami po kolei. Po każdej fazie: testy → odhaczone checkboxy → commit `phase N: ...` → lista rzeczy do ręcznego sprawdzenia dla użytkownika.

---

## Faza 0 — Szkielet repo i spike `file://`
Cel: potwierdzić, że kluczowe API działają z dwukliku w `app/index.html` (Edge i Chrome na Windows), zanim zbudujemy resztę.

- [x] Struktura katalogów z `CLAUDE.md`, pusty `app/index.html` z kolejnością skryptów, `operator.css`, puste moduły JS na `window.Floor`.
- [x] `samples/Kategorie/` — 3 kategorie po ~8 plików SVG (proste kształty/tekst, nazwy plików z polskimi znakami, jeden z `(2)`, jeden z `__2`, jeden plik `.txt` do pominięcia).
- [x] Strona spike (`app/spike.html`, usunąć po fazie) sprawdzająca i wypisująca na ekranie OK/FAIL:
  - [x] `showDirectoryPicker` dostępny i działa z `file://`,
  - [x] zapis/odczyt uchwytu folderu w IndexedDB i `requestPermission` po restarcie,
  - [x] fallback `<input webkitdirectory>` zwraca pliki z `webkitRelativePath`,
  - [x] `localStorage` przetrwa zamknięcie przeglądarki,
  - [x] `window.open('', 'floor-display')` + zapis do jego DOM + wyświetlenie blob URL obrazka,
  - [x] odzyskanie referencji do okna po odświeżeniu operatora (czy dostęp do `document` działa, czy rzuca).
- [x] Wyniki w `docs/SPIKE.md` (przeglądarka, wersja, wynik, wnioski). Jeśli coś nie działa — propozycja obejścia w „Dzienniku decyzji”, **zatrzymaj się i zapytaj użytkownika** przed fazą 1.

**Odbiór:** użytkownik otworzył spike w Edge i Chrome i potwierdził wyniki.

---

## Faza 1 — Rdzeń logiki + testy (bez UI)
- [ ] `logic.js`: `normalizeAnswer(filename)`, `isSupportedImage(name)`, `isHeic(name)`, `shuffle(arr, rng)` (Fisher–Yates, wstrzykiwany RNG), `rankPlayers(players)`.
- [ ] `logic.js`: pojedynek wg SPEC §5 — `createDuel`, `start`, `markCorrect`, `markPass`, `togglePause`, `tick`, `getClock`, `nextImage` (talia z ponownym tasowaniem bez natychmiastowej powtórki). Wszystkie metody przyjmują `now`.
- [ ] Mini-runner testów (`tests/logic.test.js`) + `tests/tests.html` + `tests/run-node.js`.
- [ ] Testy co najmniej:
  - [ ] normalizacja nazw (przykłady z SPEC §3 + puste/dziwne nazwy),
  - [ ] zegar: czas biegnie tylko aktywnemu; po `markCorrect` tura przechodzi, czas zamrożony poprawnie,
  - [ ] pas: odsłona trwa 3 s, zegar w tym czasie leci, Spacja/P ignorowane, po odsłonie ta sama osoba,
  - [ ] timeout w trakcie `running` i w trakcie `reveal` → `finished` z poprawnym zwycięzcą,
  - [ ] pauza zatrzymuje zegar i odsłonę, wznowienie kontynuuje,
  - [ ] talia: brak powtórek do wyczerpania; po przetasowaniu pierwsze ≠ ostatnie,
  - [ ] ranking: wygrane ↓, porażki ↑, imię.

**Odbiór:** wszystkie testy zielone w Node (jeśli jest) i w `tests/tests.html`.

---

## Faza 2 — Kategorie z folderu
- [ ] `categories.js`: wybór folderu (`showDirectoryPicker` lub fallback wg wyników spike), lista bezpośrednich podfolderów i plików wg SPEC §3.
- [ ] Zapamiętanie folderu (IndexedDB) i przycisk „Wczytaj ostatni folder”.
- [ ] Lista kategorii w panelu: nazwa, liczba zdjęć, ostrzeżenie < 30, info o pominiętych HEIC.
- [ ] Zarządzanie blob URL-ami (tworzenie na żądanie, zwalnianie przy zmianie folderu/kategorii).

**Odbiór (ręcznie):** wskazanie `samples/Kategorie` pokazuje 3 kategorie z poprawnymi liczbami; `.txt` pominięty; po restarcie przeglądarki „Wczytaj ostatni folder” działa.

---

## Faza 3 — Gracze i persistencja
- [ ] `storage.js`: odczyt/zapis `localStorage['thefloor.v1']` (gracze, ustawienia) z bezpiecznym fallbackiem przy uszkodzonych danych.
- [ ] Panel: dodawanie, edycja, usuwanie (potwierdzenie), auto-kolor z palety, przypisanie kategorii, korekty `+1/−1`, „Wyzeruj wyniki”, lista w kolejności rankingu z `W–P`.
- [ ] Ustawienia: czas pojedynku, kara za pas, dźwięk, ukrywanie odpowiedzi.

**Odbiór (ręcznie):** dodanie 4 graczy, zmiana wyników, F5 — wszystko zostaje.

---

## Faza 4 — Ekran graczy
- [ ] `display.js`: otwieranie/odzyskiwanie okna, kopiowanie CSS z `#display-css`, budowa DOM.
- [ ] Widoki: plansza startowa z rankingiem, `ready`, `running`, odsłona po pasie, `paused`, `finished` (SPEC §6).
- [ ] Pętla renderująca na `requestAnimationFrame` okna graczy + zapasowy `setInterval` (SPEC §7.3).
- [ ] Komunikaty przy zamkniętym/nieodzyskanym oknie; po F5 „Otwórz ekran graczy” zamyka stare okno i otwiera nowe (SPEC §7.3).
- [ ] Ostrzeżenie `beforeunload`, gdy okno graczy jest otwarte albo trwa pojedynek.

**Odbiór (ręcznie):** okno przeciągnięte na TV, F11, czytelne z 3 m; zamknięcie okna nie psuje panelu.

---

## Faza 5 — Pełny przebieg pojedynku
- [ ] Panel „Pojedynek”: wybór challengera/rywala, domyślna kategoria rywala, kto zaczyna, „🎲 Losuj wyzywającego”, START.
- [ ] Skróty klawiszowe wg SPEC §7.2 w obu oknach (repeat, debounce, pola tekstowe).
- [ ] Podgląd zdjęcia + duża odpowiedź dla operatora, ukrywanie odpowiedzi z H.
- [ ] Preload + `decode()` następnego zdjęcia; pomijanie uszkodzonych plików.
- [ ] Koniec: „Zatwierdź wynik” (wins/losses) / „Unieważnij”.
- [ ] `sound.js` wg SPEC §8.
- [ ] Blokady z SPEC §9.

**Odbiór (ręcznie):** pełny pojedynek na `samples/Kategorie`: kilka dobrych odpowiedzi, pas z odsłoną, timeout, zatwierdzenie wyniku — liczniki i ranking poprawne, zero błędów w konsoli.

---

## Faza 6 — Szlif i dokumentacja
- [ ] Usunięcie `spike.html`, porządek w kodzie, brak `console.log` poza błędami.
- [ ] Tryb jednego ekranu (SPEC §7.4) z „Dużym podglądem”.
- [ ] Wygląd: spójne kolory, duże fonty na TV, czytelne stany przycisków.
- [ ] `README.md` po polsku: przygotowanie folderu i nazw plików, uruchomienie, dwa ekrany (Win+P → Rozszerz, przeciągnięcie okna, F11), skróty klawiszowe, zasady, HEIC → JPG, FAQ.
- [ ] Test na prawdziwym folderze użytkownika (duże zdjęcia z telefonu).

**Odbiór:** definicja „gotowe” z `CLAUDE.md` spełniona.

---

## Lista ręcznego testu (na koniec)
1. Dwuklik `app/index.html` w Edge → brak błędów w konsoli.
2. Wybór folderu → kategorie z liczbami, ostrzeżenia działają.
3. Dodanie 3 graczy z kategoriami.
4. Otwórz ekran graczy → przeciągnij na drugi ekran → F11.
5. Pojedynek: Spacja ×3, P ×1 (odpowiedź widoczna 3 s), czekaj do końca czasu.
6. Zatwierdź wynik → ranking na ekranie TV i w panelu.
7. Esc w trakcie pojedynku → pauza na obu ekranach.
8. F5 panelu → gracze i wyniki zostają; okno graczy odzyskane albo czytelny komunikat.
9. Tryb „Ukrywaj odpowiedź” + H.

---

## Dziennik decyzji
| Data | Decyzja | Powód |
|---|---|---|
| 2026-10-24 | Vanilla JS, klasyczne skrypty, `file://`, bez builda | Uruchamianie dwuklikiem na Windows, offline |
| 2026-10-24 | Okno graczy jako about:blank sterowane z operatora | Chromium blokuje skrypty między plikami `file://` |
| 2026-10-24 | Pas = 3 s odsłony odpowiedzi przy biegnącym zegarze | Zgodne z TV, efekt = −3 s |
| 2026-10-24 | Punktacja tylko dodatnia, porażki informacyjnie, bez eliminacji | Prosta wersja na imprezę |
| 2026-10-24 | `.gitignore`: `Kategorie/` → `/Kategorie/` | Wzorzec bez `/` ignorował też `samples/Kategorie/`, które mają być commitowane |
| 2026-10-24 | Po F5 operatora okna graczy nie odzyskujemy — tylko komunikat „Zamknij okno graczy i otwórz je ponownie” (SPEC §7.3) | Spike, Edge 155: nowy origin `"null"` przy każdym załadowaniu → `SecurityError`; nawigacja do `about:blank` też nie przywraca dostępu |
| 2026-10-24 | Ostrzeżenie `beforeunload` przy otwartym oknie graczy / trwającym pojedynku; „Otwórz ekran graczy” zamyka stare, niedostępne okno | Zamiast odzyskiwania okna po F5 — zapobieganie przypadkowemu F5 (decyzja użytkownika) |
