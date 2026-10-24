# SPIKE — faza 0: API przeglądarki z `file://`

Strona testowa: `app/spike.html` (do usunięcia w fazie 6). Próbki: `samples/Kategorie` (Kolory 9, Kształty 9 + `notatka.txt`, Owoce 8).

## Wyniki

| Test | Edge 155.0.4283.62 | Chrome 155.0.8059.85 |
|---|---|---|
| `showDirectoryPicker` z `file://` | OK | OK |
| Uchwyt w IndexedDB + `requestPermission` po restarcie | OK (`granted` od razu) | OK (po restarcie `queryPermission` = `granted` od razu) |
| Fallback `<input webkitdirectory>` | OK (118 plików) | OK (118 plików, `webkitRelativePath` wszędzie) |
| `localStorage` po restarcie przeglądarki | OK (znacznik z 18:19:18 odczytany po restarcie) | OK |
| `window.open('', 'floor-display')` + DOM + blob URL | OK (SVG 640×360, `decode()` OK) | OK (`10.webp` 1280×640) |
| Klawiatura w oknie graczy | OK (Spacja, P) | OK (Spacja) |
| Odzyskanie okna po F5 operatora | **FAIL**: `SecurityError` (origin `"null"`), okno robi się białe; bez kliknięcia `window.open` zwraca `null` | nierozstrzygnięte (próby najpewniej bez F5) |
| Przejęcie okna nawigacją do `about:blank` | FAIL (po 3 s brak dostępu) | FAIL (po 3 s brak dostępu) |

## Wnioski
- Edge nadaje stronie z `file://` origin `"null"`, nowy przy każdym załadowaniu. Po F5 panel operatora traci dostęp do okna graczy, a okno traci zawartość.
- Bez gestu użytkownika `window.open('', 'floor-display')` zwraca `null` (blokada wyskakujących okien) — automatyczne odzyskiwanie przy starcie odpada.
- Wybór folderu, IndexedDB, `webkitdirectory`, `localStorage`, okno graczy z blob URL i klawiatura działają w obu przeglądarkach.
- → Decyzja (SPEC §7.3): okna nie odzyskujemy. Ostrzeżenie `beforeunload` chroni przed przypadkowym F5; po F5 „Otwórz ekran graczy” zamyka stare okno i otwiera nowe.
