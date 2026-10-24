# The Floor — wersja domowa

Domowa wersja teleturnieju **The Floor**: dwóch graczy rozpoznaje zdjęcia z jednej kategorii, każdy ma swój zegar (domyślnie 45 s), a operator zatwierdza odpowiedzi klawiaturą.

Działa **bez instalacji i bez internetu** — w Microsoft Edge albo Google Chrome na Windows 10/11.

---

## 1. Przygotuj zdjęcia

Utwórz folder główny, np. `D:\TheFloor\Kategorie`. **Każdy podfolder to jedna kategoria**, a zdjęcia leżą bezpośrednio w nim:

```
Kategorie\
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
- Podfoldery wewnątrz kategorii, pliki ukryte i inne formaty są pomijane.
- **Zdjęcia z iPhone'a (HEIC)** nie są obsługiwane — aplikacja pokaże ostrzeżenie. Przekonwertuj je na JPG (np. w aplikacji Zdjęcia: *Zapisz jako* → JPG, albo w ustawieniach iPhone'a: *Aparat → Formaty → Najbardziej zgodne*).
- Do pojedynku przyda się **co najmniej 30 zdjęć** w kategorii — przy mniejszej liczbie zdjęcia zaczną się powtarzać (panel ostrzega).

Do wypróbowania aplikacji są gotowe przykładowe kategorie w `samples\Kategorie`.

## 2. Uruchom

1. Kliknij dwukrotnie `app\index.html` (otworzy się w domyślnej przeglądarce — jeśli to nie Edge ani Chrome, kliknij prawym przyciskiem → *Otwórz za pomocą*).
2. W kolumnie **Kategorie** kliknij **Wybierz folder…** i wskaż folder główny. Przeglądarka zapyta o zgodę na odczyt — zezwól.
3. Przy następnym uruchomieniu wystarczy **Wczytaj ostatni folder**.

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

1. W kolumnie **Pojedynek** wybierz **wyzywającego** (albo **🎲 Losuj**) i **rywala**. Kategoria ustawi się na kategorię rywala — możesz ją zmienić.
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
- Głośność ustawisz suwakiem w **Ustawieniach**; wyłączenie opcji **Dźwięk** wycisza wszystko.

## 6. Zasady w skrócie

- Czas biegnie tylko temu, kto odpowiada; każdy ma osobny zegar (domyślnie 45 s, zmiana w Ustawieniach).
- Pas kosztuje 3 s (zmiana w Ustawieniach).
- Ranking: najwięcej wygranych, przy remisie mniej porażek, potem alfabetycznie.
- Nikt nie odpada — po pojedynku wszyscy grają dalej.

## FAQ

**Nie widzę przycisku „Wczytaj ostatni folder”.** Pojawia się tylko w Edge i Chrome po wybraniu folderu przyciskiem *Wybierz folder…*. Jeśli folder został przeniesiony, wybierz go ponownie.

**Przeglądarka zablokowała okno graczy.** Kliknij ikonę zablokowanego okna w pasku adresu → *Zawsze zezwalaj na wyskakujące okna*, potem **Otwórz ekran graczy** jeszcze raz.

**Okno graczy jest białe / pusty ekran.** Zamknij je i kliknij **Otwórz ekran graczy** (czasem trzeba kliknąć dwa razy — panel to podpowie).

**Nie ma dźwięku.** Sprawdź opcję **Dźwięk** w Ustawieniach i głośność systemu. Dźwięk włącza się po pierwszym kliknięciu START.

**Jakieś zdjęcie się nie wyświetla.** Uszkodzone pliki są pomijane automatycznie — panel pokazuje ich licznik. Sprawdź je w przeglądarce zdjęć.

**Zdjęcia się powtarzają.** Kategoria ma za mało zdjęć — gdy pula się wyczerpie, zdjęcia są tasowane ponownie (panel pokazuje „pula wyczerpana — powtórki”).

**Gdzie są zapisane wyniki?** W pamięci przeglądarki (localStorage) — osobno dla Edge i Chrome. Wyczyszczenie danych przeglądarki je usunie.

---

Dla programistów: specyfikacja w `docs/SPEC.md`, plan i dziennik decyzji w `docs/PLAN.md`, testy logiki: `node tests/run-node.js` albo `tests/tests.html` w przeglądarce.
