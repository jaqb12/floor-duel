# Floor Duel

**Gra na domową imprezę, inspirowana teleturniejem *The Floor*: dwóch graczy, jedna kategoria zdjęć, każdy ma swój zegar szachowy.**
Gracze rozpoznają zdjęcia, operator zatwierdza odpowiedzi klawiaturą, a kto pierwszy straci cały czas — przegrywa pojedynek.

Floor Duel działa **w przeglądarce, bez instalacji, bez serwera i bez internetu** — wystarczy dwuklik w `app/index.html` w Microsoft Edge albo Google Chrome. Ekran graczy idzie na telewizor, a panel operatora (z odpowiedziami) zostaje na laptopie.

🇬🇧 [English README](README.md)

> Floor Duel to amatorska gra domowa inspirowana teleturniejami ze zdjęciami, takimi jak *The Floor*. Nie jest związana z tym programem ani jego właścicielami, nie jest przez nich wspierana ani autoryzowana. Wszystkie znaki towarowe należą do ich właścicieli.

## Funkcje

- **Dwa okna:** panel operatora z poprawnymi odpowiedziami i pełnoekranowy ekran graczy na TV — albo tryb jednego ekranu z ukrytą odpowiedzią.
- **Zegar szachowy** dla każdego gracza (domyślnie 45 s), pas kosztuje 3 s i na chwilę pokazuje odpowiedź.
- **Własne zdjęcia:** każdy folder to kategoria, każda nazwa pliku to odpowiedź. Opcjonalnie poziomy trudności jako foldery.
- **Gracze i wyniki** zapisane w przeglądarce, ranking na TV między pojedynkami.
- **Syntezowany dźwięk** (Web Audio, bez plików dźwiękowych): odliczanie 3-2-1, muzyka napięcia w ostatnich 12 s, tykanie, buzzer, brawa, fanfara, werble i inne.
- **Interfejs po polsku i po angielsku** — według języka przeglądarki, do zmiany na górnym pasku.
- Czysty HTML + CSS + JavaScript: bez builda, bez zależności, działa offline z `file://`.

## Wymagania

- Windows 10/11 z aktualnym **Microsoft Edge** albo **Google Chrome** (inne przeglądarki Chromium i systemy: bez gwarancji).
- Opcjonalnie: telewizor albo drugi monitor.

## Szybki start

1. Pobierz repozytorium (**Code → Download ZIP**) i rozpakuj.
2. Kliknij dwukrotnie `app/index.html`.
3. Kliknij **Wybierz folder…** i wskaż `samples/categories-pl`, żeby wypróbować.
4. Dodaj dwóch graczy, wybierz ich i kategorię w kolumnie **Pojedynek** i naciśnij **START** (albo Enter).

## 1. Przygotuj zdjęcia

Utwórz folder główny, np. `D:\FloorDuel\Categories` (nazwa dowolna). **Każdy podfolder to jedna kategoria**, a zdjęcia leżą bezpośrednio w nim. Wskazówka: folder `Categories` w folderze projektu jest ignorowany przez git, więc zdjęcia mogą leżeć obok aplikacji i nie trafią do repozytorium.

Przykład:

```
Categories\
  Zwierzęta\
    Słoń.jpg
    Żyrafa.png
    Wieloryb_błękitny.webp
  Stolice\
    Wieża_Eiffla.jpg
    Big_Ben.jpg
```

**Nazwa pliku = poprawna odpowiedź**, którą zobaczy operator (i gracze po „pasie”):

| Nazwa pliku | Odpowiedź |
|---|---|
| `Wieża_Eiffla.jpg` | Wieża Eiffla (`_` zamienia się na spację) |
| `Słoń (2).png` | Słoń (dopisek ` (2)` jest usuwany) |
| `Słoń__3.webp` | Słoń (dopisek `__3` jest usuwany) |
| `F-16.jpg` | F-16 |
| `10.jpg` | 10 — **źle**: nazwij plik odpowiedzią! |

- Obsługiwane formaty: **JPG, PNG, WEBP, GIF, BMP, AVIF, SVG**.
- Podfoldery wewnątrz kategorii, pliki ukryte i inne formaty są pomijane (wyjątek: foldery poziomów, patrz niżej).
- **Zdjęcia z iPhone'a (HEIC)** nie są obsługiwane — aplikacja pokaże ostrzeżenie. Przekonwertuj je na JPG (np. w aplikacji Zdjęcia: *Zapisz jako* → JPG, albo w ustawieniach iPhone'a: *Aparat → Formaty → Najbardziej zgodne*).
- Do pojedynku przyda się **co najmniej 30 zdjęć** w kategorii — przy mniejszej liczbie zdjęcia zaczną się powtarzać (panel ostrzega).

**Poziomy trudności (opcjonalnie).** Kategorie można pogrupować w foldery poziomów — panel pokaże je w grupach, a gracze zobaczą tylko nazwę kategorii:

```
Categories\
  Łatwe\
    Zwierzęta\
    Owoce\
  Trudne\
    Samoloty\
  Flagi\          ← kategoria bez poziomu też działa
```

Folder bez zdjęć, za to z podfolderami, to poziom. Foldery poziomów nazwij po polsku albo po angielsku — **Łatwe / Easy, Normalne / Normal, Średnie / Medium, Trudne / Hard, Eksperckie / Expert** (liczy się początek nazwy, wielkość liter bez znaczenia). Panel układa je od łatwych do eksperckich i pokazuje w języku panelu, niezależnie od nazwy folderu. Inne nazwy poziomów też działają: są pokazywane bez zmian i trafiają na koniec. Jeśli ta sama nazwa kategorii jest w dwóch poziomach, panel dopisze nazwę folderu poziomu w nawiasie, np. „Flagi (Trudne)”.

Do wypróbowania aplikacji są gotowe przykładowe kategorie, już podzielone na poziomy: `samples\categories-pl` (`Łatwe\Kolory`, `Łatwe\Owoce`, `Trudne\Kształty`) i `samples\categories-en` (to samo z angielskimi nazwami).

## 2. Uruchom

1. Kliknij dwukrotnie `app\index.html` (otworzy się w domyślnej przeglądarce — jeśli to nie Edge ani Chrome, kliknij prawym przyciskiem → *Otwórz za pomocą*).
2. W kolumnie **Kategorie** kliknij **Wybierz folder…** i wskaż folder główny. Przeglądarka zapyta o zgodę na odczyt — zezwól.
3. Przy następnym uruchomieniu (i po odświeżeniu) ostatni folder wczyta się sam. Jeśli przeglądarka zażąda ponownej zgody, panel to napisze — wtedy kliknij **Wczytaj ostatni folder** i zezwól.

Język ustawia się według przeglądarki; zmienisz go listą na górnym pasku panelu (wybór jest zapamiętywany).

## 3. Dodaj graczy

W kolumnie **Gracze** wpisz imię, ewentualnie wybierz kategorię gracza (jak w TV — to jego „pole”) i kliknij **Dodaj gracza**. Kolor przydziela się sam; można go zmienić.

Gracze i wyniki zapisują się w przeglądarce i **przetrwają zamknięcie i odświeżenie** strony. Przyciski `+1 / −1` poprawiają liczbę wygranych, **Wyzeruj wyniki** zaczyna turniej od nowa.

## 4. Ekran graczy na telewizorze

1. Podłącz telewizor i naciśnij **Win + P → Rozszerz**.
2. W panelu kliknij **Otwórz ekran graczy** — otworzy się nowe okno.
3. Przeciągnij je na telewizor i naciśnij **F11** (pełny ekran).
4. Panel operatora zostaje na laptopie — tylko tam widać poprawne odpowiedzi.

Nie odświeżaj panelu (F5) w trakcie gry — okno graczy straci połączenie i trzeba je otworzyć ponownie (przeglądarka zapyta o potwierdzenie). Gracze i wyniki zostają, przepada tylko trwający pojedynek.

### Tylko jeden ekran?

Włącz w **Ustawieniach** opcję **Ukrywaj odpowiedź** i kliknij **Duży podgląd** — ekran graczy wypełni cały panel. Odpowiedź na górnym pasku jest zamazana; operator podgląda ją, **przytrzymując H**.

## 5. Pojedynek

1. W kolumnie **Pojedynek** wybierz **wyzywającego** (albo **🎲** — losowo) i **rywala**. Kategoria ustawi się na kategorię rywala — możesz ją zmienić.
2. Wybierz, kto zaczyna. Na telewizorze pojawi się „Przygotujcie się!”.
3. **START** albo **Enter**.
4. Gracz mówi odpowiedź, operator ocenia:

| Klawisz | Akcja |
|---|---|
| **Spacja** | dobra odpowiedź — nowe zdjęcie, zegar przechodzi na rywala |
| **P** | pas — przez 3 s wszyscy widzą odpowiedź, zegar pasującego biegnie, potem nowe zdjęcie dla tego samego gracza |
| **Esc** | pauza / wznowienie |
| **Enter** | START |
| **H** (przytrzymaj) | pokaż ukrytą odpowiedź |

Skróty działają w obu oknach (także gdy przypadkiem klikniesz w okno graczy), ale nie w polach tekstowych.

5. Gdy czas gracza dojdzie do zera — przegrywa. Kliknij **Zatwierdź wynik** (zwycięzca +1 wygrana, przegrany +1 porażka) albo **Unieważnij** (nic się nie zmienia).

### Muzyka i efekty

- **🎵 Muzyka** (przy START i w sekcji *Efekty dźwiękowe*) — podkład na czas przygotowania. Wycisza się sama po START.
- Po **START** jest odliczanie **3, 2, 1** (piknięcia i duże cyfry na TV) — zegar rusza po sygnale.
- **Muzyka napięcia** włącza się sama, gdy na tablicy pierwszy raz pojawi się **12 sekund**, i narasta, im mniej czasu ma odpowiadający gracz. Przycisk 💓 Napięcie to osobny, krótki efekt na żądanie.
- **Efekty dźwiękowe**: 🥁 Werble, 🎺 Fanfara, 👏 Brawa, 💓 Napięcie, 🔔 Gong, 😬 Pudło — do użycia w dowolnej chwili.
- Głośność i przełącznik **Dźwięk** (wycisza wszystko) są na górnym pasku panelu.

## 6. Zasady w skrócie

- Czas biegnie tylko temu, kto odpowiada; każdy ma osobny zegar (domyślnie 45 s, zmiana w Ustawieniach).
- Pas kosztuje 3 s (zmiana w Ustawieniach).
- Ranking: najwięcej wygranych, przy remisie mniej porażek, potem alfabetycznie.
- Nikt nie odpada — po pojedynku wszyscy grają dalej.

## FAQ

**Nie widzę przycisku „Wczytaj ostatni folder”.** Pojawia się tylko w Edge i Chrome po wybraniu folderu przyciskiem *Wybierz folder…*. Jeśli folder został przeniesiony, wybierz go ponownie.

**Przeglądarka zablokowała okno graczy.** Kliknij ikonę zablokowanego okna w pasku adresu → *Zawsze zezwalaj na wyskakujące okna*, potem **Otwórz ekran graczy** jeszcze raz.

**Okno graczy jest białe / pusty ekran.** Zamknij je i kliknij **Otwórz ekran graczy** (czasem trzeba kliknąć dwa razy — panel to podpowie).

**Nie ma dźwięku.** Sprawdź przełącznik **Dźwięk** na górnym pasku i głośność systemu. Dźwięk włącza się po pierwszym kliknięciu START.

**Jakieś zdjęcie się nie wyświetla.** Uszkodzone pliki są pomijane automatycznie — panel pokazuje ich licznik. Sprawdź je w przeglądarce zdjęć.

**Zdjęcia się powtarzają.** Kategoria ma za mało zdjęć — gdy pula się wyczerpie, zdjęcia są tasowane ponownie (panel pokazuje „pula wyczerpana — powtórki”).

**Gdzie są zapisane wyniki?** W pamięci przeglądarki (localStorage) — osobno dla Edge i Chrome. Wyczyszczenie danych przeglądarki je usunie.

## Dla programistów

- Bez builda i bez zależności: klasyczne pliki `<script>` we wspólnej przestrzeni nazw `window.Floor`, dzięki czemu wszystko działa z `file://`.
- Logika gry bez DOM w `app/js/logic.js`, tłumaczenia w `app/js/i18n.js`.
- Testy: `node tests/run-node.js` albo `tests/tests.html` w przeglądarce.
- Specyfikacja: [`docs/SPEC.pl.md`](docs/SPEC.pl.md), plan i dziennik decyzji: [`docs/PLAN.pl.md`](docs/PLAN.pl.md), wyniki spike: [`docs/SPIKE.pl.md`](docs/SPIKE.pl.md). Wersje angielskie (wiodące): bez `.pl`.

**Nowy język:** skopiuj blok `en` w `app/js/i18n.js`, przetłumacz wartości, dopisz język do `LANGUAGE_NAMES` i uruchom testy (sprawdzają, że wszystkie języki mają te same klucze i placeholdery).

**Nowy tłumaczony poziom trudności:** dopisz go do `LEVELS` w `app/js/logic.js` (id, początki nazw w każdym języku, miejsce w kolejności) i etykietę `levels.<id>` w każdym języku w `app/js/i18n.js`. Bez tego nowy folder poziomu też działa, ale jego nazwa jest pokazywana bez zmian.
