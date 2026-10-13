# Mockups – 5-Warum-App

Statische Entwürfe (keine Funktion), im Stil der [Morphologischen Matrix](https://github.com/method-commons/morphological-matrix-app) und der [User-Story-App](https://github.com/method-commons/user-story-app) (gleiche Design-Tokens, Kopfzeile mit Tabs, Kennzahl-Kacheln, Prüf-Seitenleiste). Quelle: [`mockups.html`](mockups.html) – im Browser öffnen.

| # | Ansicht | Datei |
|---|---------|-------|
| 1 | Übersicht aller Analysen (Problem, Phase Problem → Warum → Ursache → Maßnahmen → Wirksam, Kennzahlen, Grundursache bzw. wichtigster Hinweis), dazu der Ablauf der Methode in fünf Schritten | `s1-analysen.png` |
| 2 | **Problem** beschreiben: 5W2H-Felder, Soll/Ist, Auswirkung, daraus die Problemaussage; Fakten & Belege, Team; Prüfung „konkret · messbar · ohne Ursache · ohne Lösung · belegt“ | `s2-problem.png` |
| 3 | **Warum-Kette**: Problem → Warum? → Antwort, je Ebene mit Beleg und Status *belegt / vermutet / widerlegt*; Grundursache markieren; Prüfung der Kette (belegt, Ursache → Wirkung, keine Schuldzuweisung, im eigenen Einfluss, abstellbar) und **Daher-Probe** (Kette rückwärts gelesen) | `s3-kette.png` |
| 4 | **Warum-Baum**: Verzweigungen bei mehreren Antworten, widerlegte Annahmen bleiben sichtbar; drei Blickwinkel (3 × 5 Warum): *Warum aufgetreten?*, *Warum nicht entdeckt?*, *Warum im System möglich?* | `s4-baum.png` |
| 5 | **Maßnahmen** je Grundursache: *Sofort* (Symptom eindämmen), *Abstellen*, *Vorbeugen*; Stärke der Maßnahme (Beseitigen → Ersetzen → Technik → Organisation → Schulung), Kriterium für die Wirksamkeitsprüfung, Status *offen / umgesetzt / wirksam*; Übertragen auf ähnliche Stellen | `s5-massnahmen.png` |
| 6 | **Bericht** auf einer Seite (A3-ähnlich) zum Drucken/als PDF oder als Markdown | `s6-bericht.png` |
| 7 | Mobile Ansicht der Warum-Kette | `s7-mobil.png` |

Beispieldaten: fiktive Analyse „Lange Wartezeit am Samstag“ beim Food-Truck (angelehnt an die Beispiele *Food-Truck* der beiden anderen Apps), dazu „Newsletter landet im Spam“ (Vereinsportal) und „Akkus fallen vorzeitig aus“ (Lastenrad-Verleih).

Screenshots neu erzeugen: jede `<section class="screen">` mit Playwright aufnehmen (Faktor 1,5).

## Abgrenzung

Die App unterstützt die **Methodik** (Problem sauber beschreiben, Warum-Fragen mit Belegen, Grundursache statt Schuldige, Maßnahmen gegen die Ursache, Wirksamkeit prüfen) und ist **kein Maßnahmen- oder Projektmanagement-Werkzeug**: keine Zuständigkeiten, Termine, Erinnerungen oder Ticket-Anbindung. „Prüfen nach 4 Wochen“ ist ein Hinweis im Text, keine Frist.

## Offene Fragen

- Sollen Maßnahmen doch optional eine verantwortliche Person und ein Datum bekommen (bei 5 Warum üblich, widerspricht aber der Abgrenzung der Schwester-Apps)?
- Blickwinkel „Nicht entdeckt“ / „System“ immer anbieten oder erst auf Wunsch einschalten (wie die Bewertung in der Matrix-App)?
- Übergang zu anderen Methoden, z. B. Ishikawa-Diagramm als Vorstufe für Verzweigungen?
