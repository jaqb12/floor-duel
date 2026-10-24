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
- [x] `logic.js`: `normalizeAnswer(filename)`, `isSupportedImage(name)`, `isHeic(name)`, `shuffle(arr, rng)` (Fisher–Yates, wstrzykiwany RNG), `rankPlayers(players)`.
- [x] `logic.js`: pojedynek wg SPEC §5 — `createDuel`, `start`, `markCorrect`, `markPass`, `togglePause`, `tick`, `getClock`, `nextImage` (talia z ponownym tasowaniem bez natychmiastowej powtórki). Wszystkie metody przyjmują `now`.
- [x] Mini-runner testów (`tests/logic.test.js`) + `tests/tests.html` + `tests/run-node.js`.
- [x] Testy co najmniej:
  - [x] normalizacja nazw (przykłady z SPEC §3 + puste/dziwne nazwy),
  - [x] zegar: czas biegnie tylko aktywnemu; po `markCorrect` tura przechodzi, czas zamrożony poprawnie,
  - [x] pas: odsłona trwa 3 s, zegar w tym czasie leci, Spacja/P ignorowane, po odsłonie ta sama osoba,
  - [x] timeout w trakcie `running` i w trakcie `reveal` → `finished` z poprawnym zwycięzcą,
  - [x] pauza zatrzymuje zegar i odsłonę, wznowienie kontynuuje,
  - [x] talia: brak powtórek do wyczerpania; po przetasowaniu pierwsze ≠ ostatnie,
  - [x] ranking: wygrane ↓, porażki ↑, imię.

**Odbiór:** wszystkie testy zielone w Node (jeśli jest) i w `tests/tests.html`.

---

## Faza 2 — Kategorie z folderu
- [x] `categories.js`: wybór folderu (`showDirectoryPicker` lub fallback wg wyników spike), lista bezpośrednich podfolderów i plików wg SPEC §3.
- [x] Zapamiętanie folderu (IndexedDB) i przycisk „Wczytaj ostatni folder”.
- [x] Lista kategorii w panelu: nazwa, liczba zdjęć, ostrzeżenie < 30, info o pominiętych HEIC.
- [x] Zarządzanie blob URL-ami (tworzenie na żądanie, zwalnianie przy zmianie folderu/kategorii).

**Odbiór (ręcznie):** wskazanie `samples/Kategorie` pokazuje 3 kategorie z poprawnymi liczbami; `.txt` pominięty; po restarcie przeglądarki „Wczytaj ostatni folder” działa.

---

## Faza 3 — Gracze i persistencja
- [x] `storage.js`: odczyt/zapis `localStorage['thefloor.v1']` (gracze, ustawienia) z bezpiecznym fallbackiem przy uszkodzonych danych.
- [x] Panel: dodawanie, edycja, usuwanie (potwierdzenie), auto-kolor z palety, przypisanie kategorii, korekty `+1/−1`, „Wyzeruj wyniki”, lista w kolejności rankingu z `W–P`.
- [x] Ustawienia: czas pojedynku, kara za pas, dźwięk, ukrywanie odpowiedzi.

**Odbiór (ręcznie):** dodanie 4 graczy, zmiana wyników, F5 — wszystko zostaje.

---

## Faza 4 — Ekran graczy
- [x] `display.js`: otwieranie/odzyskiwanie okna, kopiowanie CSS z `#display-css`, budowa DOM.
- [x] Widoki: plansza startowa z rankingiem, `ready`, `running`, odsłona po pasie, `paused`, `finished` (SPEC §6).
- [x] Pętla renderująca na `requestAnimationFrame` okna graczy + zapasowy `setInterval` (SPEC §7.3).
- [x] Komunikaty przy zamkniętym/nieodzyskanym oknie; po F5 „Otwórz ekran graczy” zamyka stare okno i otwiera nowe (SPEC §7.3).
- [x] Ostrzeżenie `beforeunload`, gdy okno graczy jest otwarte albo trwa pojedynek. *(2026-10-24: w ręcznym teście brak pytania i komunikatu — najpewniej F5 trafiło do okna graczy, które ma fokus po otwarciu. Poprawka w fazie 6: okno graczy blokuje F5/Ctrl+R, a panel wykrywa odświeżone okno. Do ponownego sprawdzenia.)*

**Odbiór (ręcznie):** okno przeciągnięte na TV, F11, czytelne z 3 m; zamknięcie okna nie psuje panelu.

---

## Faza 5 — Pełny przebieg pojedynku
- [x] Panel „Pojedynek”: wybór challengera/rywala, domyślna kategoria rywala, kto zaczyna, „🎲 Losuj wyzywającego”, START.
- [x] Skróty klawiszowe wg SPEC §7.2 w obu oknach (repeat, debounce, pola tekstowe).
- [x] Podgląd zdjęcia + duża odpowiedź dla operatora, ukrywanie odpowiedzi z H.
- [x] Preload + `decode()` następnego zdjęcia; pomijanie uszkodzonych plików.
- [x] Koniec: „Zatwierdź wynik” (wins/losses) / „Unieważnij”.
- [x] `sound.js` wg SPEC §8.
- [x] Blokady z SPEC §9.

**Odbiór (ręcznie):** pełny pojedynek na `samples/Kategorie`: kilka dobrych odpowiedzi, pas z odsłoną, timeout, zatwierdzenie wyniku — liczniki i ranking poprawne, zero błędów w konsoli.

---

## Faza 6 — Szlif i dokumentacja
- [x] Usunięcie `spike.html`, porządek w kodzie, brak `console.log` poza błędami.
- [x] Tryb jednego ekranu (SPEC §7.4) z „Dużym podglądem”.
- [x] Wygląd: spójne kolory, duże fonty na TV, czytelne stany przycisków.
- [x] `README.md` po polsku: przygotowanie folderu i nazw plików, uruchomienie, dwa ekrany (Win+P → Rozszerz, przeciągnięcie okna, F11), skróty klawiszowe, zasady, HEIC → JPG, FAQ.
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
| 2026-10-24 | Akcje pojedynku (`start`, `markCorrect`, `markPass`, `togglePause`, `tick`) zwracają tablicę zdarzeń; pusta = zignorowane. Każda akcja najpierw wywołuje `tick(now)` | Spóźniona Spacja po upływie czasu kończy pojedynek zamiast zaliczać odpowiedź |
| 2026-10-24 | `lowTime` = raz na każdą pełną sekundę (5,4,3,2,1) aktywnego gracza | Pod „tyk” z SPEC §8 |
| 2026-10-24 | Odsłona kończąca się dokładnie w chwili końca czasu = przegrana na czas | Jednoznaczna kolejność zdarzeń |
| 2026-10-24 | Stan `setup` żyje w UI; `createDuel` zwraca pojedynek w stanie `ready` | Wybór graczy/kategorii to formularz, nie logika |
| 2026-10-24 | Nazwa, która po normalizacji byłaby pusta (np. `(2).jpg`), zostaje jako nazwa bez rozszerzenia | Operator zawsze widzi jakąś odpowiedź |
| 2026-10-24 | Dodane `applyResult(players, duel)` i `clockSeconds(ms)` w `logic.js` | Zatwierdzanie wyniku i zaokrąglanie zegara testowalne bez DOM |
| 2026-10-24 | Kolejność kategorii i zdjęć: naturalna, polska (`2.jpg` przed `10.jpg`); ukryte podfoldery (`.git`) pomijane | Przewidywalna lista w panelu |
| 2026-10-24 | Kategorie z 0 zdjęć widoczne na liście (wyszarzone), z adnotacją, że nie można ich wybrać | Operator widzi, że folder istnieje, ale jest pusty |
| 2026-10-24 | Imiona graczy unikalne (bez względu na wielkość liter), maks. 24 znaki | Jednoznaczny ranking i wybór graczy do pojedynku |
| 2026-10-24 | Zakresy ustawień: czas pojedynku 10–300 s, kara za pas 1–10 s; wartości spoza zakresu przycinane | Ochrona przed literówką typu 450 zamiast 45 |
| 2026-10-24 | Uszkodzony JSON w `thefloor.v1` → start od zera + kopia surowych danych w `thefloor.v1.corrupt` + komunikat w panelu | Bezpieczny fallback bez utraty danych |
| 2026-10-24 | Paleta 12 jasnych kolorów (czytelnych na czarnym ekranie TV) | SPEC §7.1, tło ekranu graczy jest czarne |
| 2026-10-24 | Widok ekranu graczy liczony czystą funkcją `displayView({ duel, players, now })` w `logic.js`; `display.js` tylko rysuje | Widoki testowalne w Node |
| 2026-10-24 | Przy zamykaniu/odświeżaniu panelu (`pagehide`) panel sam zamyka okno graczy | Po F5 i tak jest bezużyteczne (białe); nie zostaje sierota na TV |
| 2026-10-24 | Jeśli „Otwórz ekran graczy” trafi na stare, niedostępne okno i nie da się od razu otworzyć nowego — zamyka stare i prosi o drugie kliknięcie | Przeglądarka pozwala na jedno wyskakujące okno na kliknięcie |
| 2026-10-24 | Ranking na planszy startowej w dwóch kolumnach przy > 8 graczach; zegar ≤ 10 s czerwony u obu graczy, pulsuje tylko u aktywnego | Czytelność z kanapy |
| 2026-10-24 | Stan `ready` = szkic pojedynku tworzony automatycznie, gdy wybór graczy i kategorii jest poprawny; ekran graczy od razu pokazuje „Przygotujcie się!” | SPEC §5: setup → ready po wybraniu 2 graczy i kategorii |
| 2026-10-24 | Zmiana rywala ustawia jego kategorię (jeśli ma zdjęcia); operator może ją potem zmienić | SPEC §2.3 |
| 2026-10-24 | Przy „Ukrywaj odpowiedź” odpowiedź w panelu jest odsłonięta w trakcie pasa i po końcu pojedynku | W trybie jednego ekranu gracze mają ją zobaczyć jak na TV |
| 2026-10-24 | Uszkodzone zdjęcie jest sprawdzane (`decode()`) w panelu, pomijane i usuwane z puli pojedynku; licznik w panelu | SPEC §9; nie wraca po przetasowaniu |
| 2026-10-24 | „Unieważnij” zawsze z potwierdzeniem | Ochrona przed przypadkowym kliknięciem w trakcie gry |
| 2026-10-24 | Okno graczy (i duży podgląd) blokuje F5 / Ctrl+R; panel wykrywa okno odświeżone przyciskiem przeglądarki (status „odświeżone — otwórz ponownie”) | Po otwarciu fokus jest w oknie graczy, więc F5 trafiało tam i robiło biały ekran bez żadnego komunikatu |
| 2026-10-24 | „Duży podgląd” = ten sam renderer ekranu graczy w `<iframe>` na całym panelu + pasek z odpowiedzią (zamazaną bez H); `display.js` udostępnia `createRenderer(doc)` | SPEC §7.4; jeden kod widoku dla TV i jednego ekranu |
| 2026-10-24 | Globalna reguła CSS `[hidden] { display: none !important }` | `display: flex` w klasach nadpisywało `hidden`: po zatwierdzeniu wyniku sekcja pojedynku z aktywnymi przyciskami zostawała na ekranie (zgłoszenie użytkownika) |
| 2026-10-24 | Muzyka na przygotowanie + efekty dźwiękowe dla operatora + suwak głośności (SPEC §8) — syntezowane w WebAudio, bez plików | Prośba użytkownika; zachowany wymóg „bez plików dźwiękowych”, działa offline |
| 2026-10-24 | Muzyka wycisza się sama po START; efekty tylko jako przyciski, bez skrótów | „Przygotowanie do gry”; skróty kolidowałyby ze Spacją/P/Esc |
| 2026-10-24 | ~~„Napięcie” automatycznie przy 12 s, raz na gracza~~ → zastąpione: muzyka napięcia raz na pojedynek (pierwsze 12 s na tablicy), gra do końca i narasta wg czasu aktywnego gracza | Prośba użytkownika: ma budować napięcie, niezależnie od przycisku |
| 2026-10-24 | Odliczanie 3 s po START jako stan `countdown` w `Duel` (`countdownSeconds`, domyślnie 0 w logice, 3 w aplikacji); zegar startuje od `countdownUntil`, nie od najbliższego ticka | Prośba użytkownika („3 piknięcia jak w programie”); czas z timestampów |
| 2026-10-24 | Muzyka napięcia cichnie przy pauzie, wraca po wznowieniu; po zmianie tury intensywność spada, jeśli rywal ma ≥ 12 s | Napięcie zależy od tego, kto teraz odpowiada |
| 2026-10-24 | Nowe brawa: ~28 „osób” z własną barwą, tempem i pozycją stereo, różne momenty końca + tło szumu | Poprzednie brawa brzmiały sztucznie (zgłoszenie użytkownika) |
