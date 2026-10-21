# Mockups – 5-Warum-App

Statische Entwürfe (keine Funktion) – inzwischen umgesetzt, siehe [README](../../README.md), im Stil der [Morphologischen Matrix](https://github.com/method-commons/morphological-matrix-app) und der [User-Story-App](https://github.com/method-commons/user-story-app) (gleiche Design-Tokens, Kopfzeile mit Tabs, Kennzahl-Kacheln, Prüf-Seitenleiste). Quelle: [`mockups.html`](mockups.html) – im Browser öffnen.

| # | Ansicht | Datei |
|---|---------|-------|
| 1 | Übersicht aller Analysen (Problem, Phase Problem → Warum → Ursache → Maßnahmen → Wirksam, Kennzahlen, Grundursache bzw. wichtigster Hinweis, überfällige Maßnahmen), dazu der Ablauf der Methode in fünf Schritten | `s1-analysen.png` |
| 2 | **Problem** beschreiben: 5W2H-Felder, Soll/Ist, Auswirkung, daraus die Problemaussage; Fakten & Belege, Team; Prüfung „konkret · messbar · ohne Ursache · ohne Lösung · belegt“ | `s2-problem.png` |
| 3 | **Ishikawa-Diagramm** (optional): mögliche Ursachen einer Ebene nach Kategorien sammeln (6M, 4P, 8M oder eigene), je Ursache *belegt / offen / ausgeschlossen*; ausgewählte Ursachen werden zu Zweigen der Warum-Analyse („Breite vor Tiefe“) | `s3-ishikawa.png` |
| 4 | **Warum-Kette**: Problem → Warum? → Antwort, je Ebene mit Beleg und Status *belegt / vermutet / widerlegt*; Grundursache markieren; Prüfung der Kette (belegt, Ursache → Wirkung, keine Schuldzuweisung, im eigenen Einfluss, abstellbar) und **Daher-Probe** (Kette rückwärts gelesen) | `s4-kette.png` |
| 5 | **Warum-Baum**: Verzweigungen (mit Ishikawa-Kategorie), widerlegte Annahmen bleiben sichtbar; Blickwinkel *Warum aufgetreten?* sowie optional *Warum nicht entdeckt?* und *Warum im System möglich?* (3 × 5 Warum) | `s5-baum.png` |
| 6 | **Maßnahmen** je Grundursache: *Sofort*, *Abstellen*, *Vorbeugen*; Stärke, Kriterium für die Wirksamkeitsprüfung, Status; optional **Wer** (verantwortliche Person) und **Bis** (Termin, überschrittene markiert); Übertragen auf ähnliche Stellen | `s6-massnahmen.png` |
| 7 | **Bericht** auf einer Seite (A3-ähnlich) zum Drucken/als PDF oder als Markdown | `s7-bericht.png` |
| 8 | **Einstellungen der Analyse** (Datei → Einstellungen): Blickwinkel 2 und 3, Ishikawa mit Kategorien, Person und Termin bei Maßnahmen ein-/ausschalten; als Standard für neue Analysen | `s8-einstellungen.png` |
| 9 | Mobile Ansicht der Warum-Kette | `s9-mobil.png` |

Beispieldaten: fiktive Analyse „Lange Wartezeit am Samstag“ beim Food-Truck (angelehnt an die Beispiele *Food-Truck* der beiden anderen Apps), dazu „Newsletter landet im Spam“ (Vereinsportal) und „Akkus fallen vorzeitig aus“ (Lastenrad-Verleih).

Screenshots neu erzeugen: jede `<section class="screen">` mit Playwright aufnehmen (Faktor 1,5).

## Abgrenzung

Die App unterstützt die **Methodik** (Problem sauber beschreiben, Ursachen sammeln, Warum-Fragen mit Belegen, Grundursache statt Schuldige, Maßnahmen gegen die Ursache, Wirksamkeit prüfen) und ist **kein Maßnahmen- oder Projektmanagement-Werkzeug**. Person und Termin je Maßnahme sind optional und dienen der Übersicht: überschrittene Termine werden markiert, es gibt aber keine Erinnerungen, Benachrichtigungen oder Ticket-Anbindung.

## Entscheidungen

- Maßnahmen bekommen optional **Person** und **Termin** (je Analyse zuschaltbar).
- Die Blickwinkel **„Warum nicht entdeckt?“** und **„Warum im System möglich?“** sind optional (je Analyse zuschaltbar); „Warum aufgetreten?“ ist immer an.
- **Ishikawa-Diagramm** als optionale Vorstufe: Ursachen einer Ebene in die Breite sammeln, ausgewählte als Zweige mit 5 Warum in die Tiefe verfolgen.
- Optionale Bereiche sind wie in der Matrix-App standardmäßig aus; ausgeblendete Angaben bleiben erhalten.

In der Umsetzung erscheinen die Analysen nicht als Browser-Tabs, sondern wie in der User-Story-App mit Namen in der Kopfzeile; Ishikawa ist eine Ansicht der Warum-Analyse neben Kette und Baum.

## Entwurf: 8D-Modus (Gegenüberstellung)

Idee: Statt einer eigenen 8D-App wird die 5-Why-App um einen **8D-Modus** erweitert – je Analyse wählbar („Art: 5 Why / 8D-Report“). Jede Ansicht stellt links den **heutigen Stand** und rechts den **8D-Modus** gegenüber; Markierungen *wie heute*, *erweitert* und *neu* zeigen, was dazukommt. Quelle: [`8d-modus.html`](8d-modus.html). Beispiel: fiktive Reklamation „Halteclip K-214 bricht bei Montage“.

| # | Ansicht | Datei |
|---|---------|-------|
| 1 | **Überblick** D1–D8: was die App heute schon abdeckt (D2 Problem, D4 Ursache mit „Warum nicht entdeckt?“, D5–D7 Maßnahmen, Übertragen, Gelernt) und was neu wäre | `8d-ueberblick.png` |
| 2 | **Neue Analyse**: Art *5 Why* oder *8D-Report*, Kunde und Reklamationsnummer; Schritte D1–D8 statt vier Schritten | `8d-start.png` |
| 3 | **D1 Team** mit Rollen (Teamleitung, Auftraggeber, Mitglied) und Funktion; Kopfdaten der Reklamation (Kunde, Nummer, Eingang, Teil, Charge, Mengen) | `8d-team.png` |
| 4 | **D3 Eindämmung**: Sofortmaßnahmen je Ort (Lager, unterwegs, beim Kunden, Fertigung) mit Menge, geprüft, n. i. O., Kennzeichnung, wirksam ab | `8d-sofort.png` |
| 5 | **D5–D7**: Nachweis vor Einführung, Einführung und Wirksamkeit, Dokumente aktualisiert (FMEA, Produktionslenkungsplan, Wartungsplan, Arbeitsanweisung), Übertragen | `8d-massnahmen.png` |
| 6 | **D8 Abschluss**: Bereit-zum-Abschluss-Prüfung, Gelernt, Würdigung des Teams, Abschlussdatum, Bestätigung durch den Kunden | `8d-abschluss.png` |
| 7 | **8D-Bericht** im üblichen Formular: Kopfdaten und je Disziplin eine Zeile mit Datum – Drucken/PDF und Markdown | `8d-bericht.png` |

Abgrenzung bleibt: Der 8D-Modus ergänzt die **Dokumentation der Methode**, kein Reklamations- oder Maßnahmenmanagement (keine Erinnerungen, Workflows, Freigaben).

Offene Fragen:

- Datum je Disziplin (für den Bericht) – automatisch beim Erledigen oder von Hand?
- Eine 5-Why-Analyse nachträglich in einen 8D-Report umwandeln (und zurück)?
- Welche Kopfdaten sind Pflicht (Kunde, Reklamation, Teil, Charge, Mengen) – oder frei erweiterbar?
- Schaltet 8D „Warum nicht entdeckt?“ sowie Person und Termin automatisch ein?
