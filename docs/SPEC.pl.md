# SPEC — Floor Duel

Źródło prawdy dla zachowania aplikacji. Zmiany zasad wpisujemy tutaj. Wersja wiodąca (angielska): [`SPEC.md`](SPEC.md) — ten plik to jej tłumaczenie.

## 1. Cel
Prowadzenie domowych pojedynków w stylu teleturniejów ze zdjęciami (np. *The Floor*; projekt nie jest z nim związany). Jeden komputer z Windows, dwa okna przeglądarki:
- **Panel operatora** — na laptopie, widzi go tylko operator (tu są poprawne odpowiedzi).
- **Ekran graczy** — na telewizorze/drugim monitorze, pełny ekran (F11).

Działa też na jednym ekranie (patrz 7.4 — ukrywanie odpowiedzi).

## 2. Zasady gry
1. Gracze mają: imię, kolor, opcjonalnie przypisaną kategorię, licznik **wygranych** i **porażek**.
2. Operator wybiera gracza, który **wyzywa** (challenger). Challenger wskazuje **rywala** (opponent).
3. **Kategoria pojedynku:** domyślnie kategoria przypisana rywalowi (jak w TV). Jeśli rywal nie ma kategorii albo jej folder nie istnieje — operator musi wybrać kategorię z listy. Operator zawsze może zmienić kategorię przed startem.
4. **Kto zaczyna odpowiadać:** domyślnie challenger; operator może przełączyć przed startem.
5. **Zegar szachowy:** każdy gracz ma `duelSeconds` (domyślnie **45 s**). Czas biegnie tylko graczowi, który aktualnie odpowiada.
6. **Dobra odpowiedź** (operator: Spacja): nowe zdjęcie, tura i zegar przechodzą na rywala.
7. **Pas** (operator: P, gdy gracz mówi „pas”): przez `passPenaltySeconds` (domyślnie **3 s**) na ekranie graczy widać poprawną odpowiedź pod zdjęciem; zegar pasującego **biegnie** w tym czasie. Potem nowe zdjęcie dla **tego samego** gracza. W trakcie odsłony klawisze Spacja/P są ignorowane. Efekt = utrata 3 s (tak jak w TV).
8. **Koniec:** gdy zegar gracza dojdzie do 0 (także w trakcie odsłony po pasie) — ten gracz przegrywa. Ekran graczy pokazuje zwycięzcę.
9. **Punktacja tylko dodatnia:** zwycięzca `wins +1`, przegrany `losses +1` (informacyjnie). Wynik zapisuje się dopiero po kliknięciu „Zatwierdź wynik”; operator może zamiast tego „Unieważnij pojedynek” (nic się nie zmienia).
10. **Ranking:** sortowanie po `wins` malejąco, potem `losses` rosnąco, potem imię.
11. Nikt nie odpada — po pojedynku wszyscy grają dalej (prostsza wersja niż TV).

## 3. Kategorie i zdjęcia
- Użytkownik wskazuje **folder główny** (np. `D:\FloorDuel\Categories`; nazwa dowolna, folder `Categories` w folderze projektu jest ignorowany przez git).
- **Każdy bezpośredni podfolder = kategoria.** Nazwa kategorii = nazwa podfolderu.
- **Poziomy trudności** (dodane na prośbę użytkownika, 2026-10-24): podfolder, który nie ma bezpośrednio żadnego zdjęcia, ale ma podfoldery, to **poziom** (np. `Categories\Łatwe\Zwierzęta\`); jego podfoldery są kategoriami tego poziomu. Głębiej nie szukamy. Oba układy można mieszać — kategoria bez poziomu działa jak dotąd.
  - Znane poziomy, w tej kolejności, rozpoznawane po początku nazwy folderu, bez względu na wielkość liter, po polsku lub angielsku: **łatwe** (`łatw`, `easy`), **normalne** (`norm`), **średnie** (`śred`, `medium`), **trudne** (`trud`, `hard`, `difficult`), **eksperckie** (`eksp`, `exp`). Inne nazwy poziomów na końcu, alfabetycznie. Kategorie bez poziomu na początku listy.
  - Panel pokazuje znany poziom w języku interfejsu (folder `Łatwe` → „Easy” po angielsku, folder `Easy` → „Łatwe” po polsku); inne nazwy poziomów bez zmian. Poziom to treść, więc nie wpływa na tożsamość kategorii.
  - Nazwa kategorii to nazwa jej folderu (graczom nie pokazujemy poziomu). Gdy ta sama nazwa występuje w kilku miejscach, kategorie z poziomem dostają dopisek „Nazwa (Poziom)”.
  - Panel operatora pokazuje kategorie pogrupowane według poziomów (nagłówki na liście, grupy w listach wyboru).
- **Zdjęcia = pliki bezpośrednio w folderze kategorii** (bez rekurencji). Obsługiwane rozszerzenia (bez względu na wielkość liter): `jpg, jpeg, png, webp, gif, bmp, avif, svg`.
- Pomijane: pliki ukryte (zaczynające się od `.`), `Thumbs.db`, `desktop.ini`, inne rozszerzenia. **HEIC/HEIF** są pomijane z czytelnym ostrzeżeniem („X plików HEIC — przekonwertuj na JPG”).
- **Poprawna odpowiedź = nazwa pliku** po normalizacji:
  1. usuń rozszerzenie,
  2. usuń sufiks duplikatu: ` (2)` na końcu (regex `\s*\(\d+\)$`) oraz `__2` na końcu (regex `__\d+$`),
  3. zamień `_` na spację, zredukuj wielokrotne spacje, `trim`, normalizacja Unicode NFC.
  Przykłady: `Wieża_Eiffla.jpg` → „Wieża Eiffla”; `Słoń (2).png` → „Słoń”; `Słoń__3.webp` → „Słoń”; `F-16.jpg` → „F-16”.
- Lista kategorii w panelu operatora pokazuje liczbę zdjęć. **Ostrzeżenie**, gdy kategoria ma < 30 zdjęć (pojedynek potrafi zużyć 30+).
- **Pula pojedynku:** na starcie pojedynku tasowanie Fisher–Yates wszystkich zdjęć kategorii; zdjęcia bez powtórzeń. Gdy pula się wyczerpie — przetasuj ponownie (unikając zdjęcia, które właśnie było) i pokaż operatorowi dyskretną informację „pula wyczerpana — powtórki”.
- Zapamiętanie folderu: jeśli działa `showDirectoryPicker`, uchwyt zapisujemy w IndexedDB; przy kolejnym uruchomieniu/odświeżeniu aplikacja sama próbuje go wczytać (tylko gdy zgoda przeglądarki wciąż obowiązuje — `queryPermission`); jeśli się nie uda, pokazuje komunikat, a przycisk „Wczytaj ostatni folder” prosi o zgodę (wymaga kliknięcia — `requestPermission`). Fallback: `<input type="file" webkitdirectory>` (bez zapamiętywania; po odświeżeniu trzeba wskazać ponownie).
- Zdjęcia ładujemy jako `URL.createObjectURL(file)`; przy zmianie folderu/kategorii zwalniamy (`revokeObjectURL`). **Następne zdjęcie preloadujemy** i czekamy na `img.decode()` przed pokazaniem, żeby duże zdjęcia z telefonu nie migały.

## 4. Model danych
```js
Player   = { id, name, color, category /* string|null */, wins, losses }
Settings = { duelSeconds: 45, passPenaltySeconds: 3, sound: true, hideAnswer: false, volume: 80,
             language: null /* 'en' | 'pl' | null = według przeglądarki */ }

// Stan pojedynku (w logic.js, bez DOM):
Duel = {
  state,             // 'setup' | 'ready' | 'countdown' | 'running' | 'reveal' | 'paused' | 'finished'
  challengerId, opponentId, category,
  activeId,          // kto teraz odpowiada
  remainingMs: { [playerId]: number },  // stan zegara w chwili turnStartedAt
  turnStartedAt,     // timestamp (ms) startu bieżącego odcinka czasu aktywnego gracza
  revealUntil,       // timestamp końca odsłony po pasie
  deck: string[],    // klucze zdjęć w kolejności
  deckPos, current,  // bieżące zdjęcie
  winnerId, loserId,
  stats: { [playerId]: { correct, passes } }
}
```
Czas pozostały aktywnego gracza = `remainingMs[activeId] - (now - turnStartedAt)`. Przy zmianie tury/pauzie „zamrażamy” wynik do `remainingMs`.

**Persistencja:** `localStorage['thefloor.v1'] = { players, settings }`. Uchwyt folderu: IndexedDB `thefloor` / store `handles` / klucz `root`. (Klucze zachowują pierwotną roboczą nazwę projektu, żeby zapisani gracze i folder działali dalej.)

## 5. Maszyna stanów pojedynku
```
setup ──(wybrano 2 graczy + kategorię)──> ready
ready ──START──> countdown (3 s: 3, 2, 1) ──> running   (zegar rusza dokładnie w chwili końca odliczania)
running ──Spacja──> running (nowe zdjęcie, tura → rywal)
running ──P──> reveal ──(po passPenaltySeconds)──> running (nowe zdjęcie, ta sama osoba)
running/reveal ──czas aktywnego = 0──> finished
running ──Esc──> paused ──Esc──> running   (pauza zatrzymuje też odliczanie odsłony)
finished ──„Zatwierdź wynik”──> (aktualizacja liczników) ──> brak pojedynku
dowolny ──„Anuluj/Unieważnij”──> brak pojedynku (bez zmian liczników)
```
API logiki (propozycja, wszystkie metody przyjmują `now`):
`createDuel({...})`, `start(now)`, `markCorrect(now)`, `markPass(now)`, `togglePause(now)`, `tick(now) → events[]` (np. `'timeout'`, `'revealEnd'`, `'lowTime'`), `getClock(id, now)`, `nextImage()`.

## 6. Ekran graczy (okno TV)
- Tło czarne/ciemne, wysoki kontrast, czytelne z kanapy.
- **Góra:** nazwa kategorii.
- **Środek:** zdjęcie, `object-fit: contain`, maksymalnie duże.
- **Dół:** dwa panele graczy (lewy = challenger, prawy = rywal): imię w kolorze gracza i duży zegar w sekundach (zaokrąglenie w górę). Aktywny panel wyraźnie podświetlony, nieaktywny przygaszony. ≤ 10 s — zegar czerwony/pulsujący.
- **Odsłona po pasie:** pasek z poprawną odpowiedzią na zdjęciu + napis „PAS”.
- **Stany:** brak pojedynku → plansza „FLOOR DUEL” + ranking; `ready` → imiona, kategoria, „Przygotujcie się”; `countdown` → duże cyfry 3, 2, 1; `paused` → nakładka „PAUZA”; `finished` → duży napis ze zwycięzcą.
- Brak jakichkolwiek elementów sterujących i kursora (`cursor: none`).
- Teksty w języku panelu operatora (§11).

## 7. Panel operatora
### 7.1 Układ
- **Kolumna Gracze:** formularz dodawania (imię, kategoria z listy — opcjonalnie; kolor przydzielany automatycznie z palety 12 kontrastowych kolorów, edytowalny), lista graczy w kolejności rankingu z `W–P`, przyciski `+1/−1` do ręcznej korekty wygranych, edycja, usuwanie (z potwierdzeniem), „Wyzeruj wyniki” (z potwierdzeniem).
- **Kolumna Pojedynek:** wybór challengera i rywala (dwie listy albo kliknięcia na liście graczy), przycisk „🎲 Losuj wyzywającego” (losuje challengera z graczy), wybór kategorii, kto zaczyna, START. W trakcie: podgląd bieżącego zdjęcia (miniatura) i **duża poprawna odpowiedź**, oba zegary, przyciski DOBRZE / PAS / PAUZA, statystyki (poprawne/pasy). Po zakończeniu: „Zatwierdź wynik” / „Unieważnij”.
- **Kolumna boczna:** efekty dźwiękowe, wybór/wczytanie folderu, lista kategorii z liczbą zdjęć i ostrzeżeniami.
- **Górny pasek:** „Otwórz ekran graczy”, „Duży podgląd”, przełącznik dźwięku i głośność, wybór języka, „⚙ Ustawienia” (okno: czas pojedynku, kara za pas, ukrywanie odpowiedzi).

### 7.2 Klawiatura (aktywna w obu oknach)
| Klawisz | Akcja |
|---|---|
| Spacja | dobra odpowiedź |
| P | pas |
| Esc | pauza / wznowienie |
| Enter | START (w stanie `ready`) |
| H (przytrzymaj) | pokaż odpowiedź, gdy włączone „ukrywanie odpowiedzi” |

- Ignoruj `event.repeat` i dodatkowo debounce 250 ms dla Spacji i P.
- Gdy fokus jest w polu tekstowym — skróty wyłączone.
- `preventDefault` dla Spacji (żeby nie „klikała” przycisku z fokusem).
- Ten sam handler podpinamy do `document` okna graczy (operator może przypadkiem kliknąć w okno TV).

### 7.3 Okno graczy — techniczne
- Otwierane przyciskiem: `window.open('', 'floor-display', 'popup,width=1280,height=720')`. DOM budowany przez `display.js`, CSS kopiowany z `<style id="display-css" media="not all">`.
- Blob URL-e zdjęć działają w tym oknie, bo about:blank dziedziczy origin operatora.
- **Po odświeżeniu panelu operatora okna graczy nie da się odzyskać** (spike, `docs/SPIKE.md`: strona z `file://` dostaje nowy origin `"null"` przy każdym załadowaniu → `SecurityError`; bez kliknięcia `window.open` zwraca `null`). Dlatego:
  - Panel zapamiętuje w `localStorage`, że okno graczy było otwarte; po odświeżeniu pokazuje komunikat „Okno graczy straciło połączenie — kliknij »Otwórz ekran graczy«”.
  - „Otwórz ekran graczy”: jeśli `window.open('', 'floor-display', ...)` zwróci stare okno bez dostępu do `document` — wywołaj na nim `close()` i otwórz nowe. Jeśli zamknięcie się nie uda — komunikat „Zamknij okno graczy i otwórz je ponownie”.
- **Ostrzeżenie przed F5/zamknięciem:** gdy okno graczy jest otwarte albo trwa pojedynek, panel operatora rejestruje `beforeunload` (standardowe pytanie przeglądarki „Opuścić stronę?”).
- Pętla renderująca: `requestAnimationFrame` **okna graczy** (jest widoczne na TV, więc nie jest dławione), zapasowo `setInterval(100)` w oknie operatora. Poprawność nie zależy od częstotliwości ticków (czas z timestampów).

### 7.4 Tryb jednego ekranu
Ustawienie „Ukrywaj odpowiedź”: w panelu operatora odpowiedź jest zamazana i pokazuje się tylko przy przytrzymanym **H**. Okno graczy można wtedy pominąć i grać na samym panelu operatora z dużym podglądem zdjęcia (przycisk „Duży podgląd” powiększa miniaturę na cały panel).

## 8. Dźwięk (WebAudio, bez plików)
- Krótkie „tyk” co sekundę w ostatnich 5 s aktywnego gracza.
- **Odliczanie przed rundą:** po START trzy krótkie piknięcia (3, 2, 1) i długi wysoki sygnał w chwili startu zegara.
- **Muzyka napięcia** (niezależna od przycisku „Napięcie”): włącza się raz w pojedynku, gdy na tablicy po raz pierwszy pojawi się 12 s (zdarzenie `suspense`; brak, gdy czas pojedynku ≤ 12 s), i gra do końca pojedynku. Intensywność = 1 − (czas aktywnego gracza / 12 s): szybszy puls, wyższy i jaśniejszy dron, kolejne warstwy (ostinato, werbel). Pauza ją wycisza, wznowienie przywraca, koniec czasu/unieważnienie kończy.
- Krótki „ding” przy dobrej odpowiedzi, niski ton przy pasie.
- Długi buzzer przy końcu czasu.
- `AudioContext` tworzony/wznawiany przy kliknięciu START albo dowolnego przycisku dźwięku (wymóg przeglądarek). Wyłącznik i suwak głośności (0–100, domyślnie 80) na górnym pasku; wyłączony dźwięk wycisza wszystko, także muzykę.
- **Muzyka na przygotowanie** (dodane na prośbę użytkownika, 2026-10-24): przycisk „🎵 Muzyka” przy START i w sekcji efektów — zapętlony, syntezowany podkład; wycisza się sama po START, można ją też zatrzymać ręcznie.
- **Efekty dla operatora** (sekcja „Efekty dźwiękowe”): werble, fanfara, brawa, napięcie, gong, „pudło”. Tylko przyciski, bez skrótów klawiszowych (żeby nie kolidowały z grą).

## 9. Przypadki brzegowe
- Mniej niż 2 graczy → START nieaktywny. Challenger ≠ rywal.
- Kategoria z 0 zdjęć → nie można jej wybrać.
- Zmiana/ponowne wczytanie folderu w trakcie pojedynku → zablokowane (najpierw zakończ/unieważnij).
- Usunięcie gracza biorącego udział w trwającym pojedynku → zablokowane.
- Uszkodzony plik (błąd `decode()`) → pomiń, weź następne, zaloguj w konsoli, pokaż operatorowi licznik pominiętych.
- Zamknięte okno graczy w trakcie pojedynku → gra toczy się dalej w panelu operatora, panel pokazuje „Okno graczy zamknięte — Otwórz ponownie”.
- Odświeżenie strony w trakcie pojedynku → pojedynek przepada (nie persistujemy pojedynku), gracze i wyniki zostają.

## 10. Poza zakresem (nie robić bez pytania)
Plansza z terytoriami, eliminacja graczy, złoty blok, przejmowanie kategorii, sterowanie z telefonu, sieć/serwer, rozpoznawanie mowy, edytor zdjęć/kategorii, eksport wyników.

## 11. Języki (dodane na prośbę użytkownika, 2026-10-24)
- Języki interfejsu: **angielski** i **polski**. Domyślnie pierwszy obsługiwany język z `navigator.languages`, w przeciwnym razie angielski. Operator zmienia język listą na górnym pasku; wybór zapisuje się w `settings.language`.
- Wszystkie teksty są w `app/js/i18n.js` (`Floor.i18n`): słowniki dla języków, `t(key, params)` z podstawianiem `{placeholder}` i liczbą mnogą przez `Intl.PluralRules`. Brakujący klucz → wersja angielska, potem sam klucz.
- `logic.js` pozostaje bez języka: walidacja zwraca problemy jako `{ key, params }`, tłumaczone przez UI.
- Teksty statyczne w `index.html` oznaczone `data-i18n` (tekst), `data-i18n-title`, `data-i18n-placeholder`, `data-i18n-label` (`aria-label`). Zmiana języka działa od razu w obu oknach, bez przeładowania.
- Nazwy kategorii i odpowiedzi pochodzą z nazw folderów i plików i nigdy nie są tłumaczone.
- Testy sprawdzają, że każdy język ma te same klucze, placeholdery i formy liczby mnogiej.
