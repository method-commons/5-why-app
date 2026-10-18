# 5 Why

Responsive Web-App, die beim **methodischen Arbeiten mit der 5-Why-Methode** hilft: ein Problem sauber beschreiben, schrittweise und mit Belegen nach dem „Warum?“ fragen, die Grundursache finden und wirksame Maßnahmen dagegen festlegen – für beliebig viele Analysen.

Bewusst **kein Maßnahmen- oder Projektmanagement**: Person und Termin je Maßnahme sind optional, es gibt keine Erinnerungen, Benachrichtigungen oder Ticket-Anbindung.

Läuft im Browser ohne Server-Backend; die Oberfläche nutzt [Preact](https://preactjs.com) mit [Signals](https://preactjs.com/guide/v10/signals/), gebaut wird mit [Vite](https://vite.dev) – technisch wie die Schwester-Apps [Morphologische Matrix](https://github.com/method-commons/morphological-matrix-app) und [User Stories](https://github.com/method-commons/user-story-app).

## Starten

Lokal (Node.js ≥ 22):

```sh
npm install      # einmalig
npm run dev      # Entwicklungsserver, http://localhost:5173/
npm run build    # Build nach dist/
npm run preview  # gebaute App ansehen, http://localhost:4173/
npm test         # Lint, Typprüfung, Unit-Tests, Build, Browser-Tests
```

Auf `main` veröffentlicht die CI die App auf GitHub Pages, sobald alle Prüfungen grün sind (einmalig: *Settings → Pages → Source: „GitHub Actions“*).

## Funktionen

- **Analysen:** Startseite mit einer Karte je Analyse: Problemaussage, Phase (Problem → Warum → Ursache → Maßnahmen → Wirksamkeit), Warum-Ebenen, Grundursachen, umgesetzte bzw. wirksam geprüfte Maßnahmen und der wichtigste Hinweis (z. B. „1 Maßnahme überfällig“, „2 Antworten nur vermutet“). Dazu der Ablauf der Methode in fünf Schritten. Duplizieren und Löschen (mit Rückgängig).
- **1 · Problem beschreiben** nach 5W2H: Was, Wo, Wann, Wie viel (Soll/Ist), Wer, Wie entdeckt, Auswirkung. Daraus ein **Vorschlag für die Problemaussage** (übernehmen und anpassen). Fakten & Belege, Team (Namen). **Prüfung:** konkret, messbar, ohne Ursache („weil …“), ohne Lösung („wir müssen …“), belegt – Wortfunde werden auch direkt am Feld angemerkt.
- **2 · Warum-Analyse** mit drei Ansichten:
  - **Kette:** Frage („Warum: „…“?“, optional eigene Formulierung) und Antwort Ebene für Ebene, je Antwort ein **Beleg** und der Status *belegt / vermutet / widerlegt*, Markierung als **Grundursache**. Mehrere Antworten auf dieselbe Frage bilden **Verzweigungen** (Zweig per Chip wählen, umsortieren). Widerlegte Antworten bleiben sichtbar, unter ihnen wird nicht weitergefragt. Löschen fragt bei Antworten darunter nach.
  - **Prüfung der Kette:** Grundursache markiert, Antworten auf dem Weg belegt, tief genug, **keine Schuldzuweisung** (Wortliste und Namen aus dem Team), Ursache → Wirkung und im eigenen Einfluss (selbst zu bestätigen; äußere Umstände wie „Wetter“, „Kunden“ werden angemerkt). Dazu die **Daher-Probe**: die Kette rückwärts gelesen („… → daher …“).
  - **Baum:** alle Zweige und Blickwinkel auf einen Blick; Klick öffnet die Antwort in der Kette, „+ Warum?“ an offenen Enden.
  - Kennzahlen: Ebenen, Verzweigungen, belegt/vermutet, widerlegt, Grundursachen je Blickwinkel.
- **Optional (je Analyse unter „Datei → Einstellungen der Analyse“, standardmäßig aus):**
  - **Blickwinkel „Warum nicht entdeckt?“ und „Warum im System möglich?“** (3 × 5 Why) mit eigener Ausgangsfrage.
  - **Ishikawa-Diagramm** als Vorstufe: Für das Problem oder eine Antwort mögliche Ursachen nach Kategorien sammeln – Vorlagen 6M, 8M, 4P oder eigene Kategorien (umbenennen, ergänzen, entfernen). Ursachen sind *belegt / offen / ausgeschlossen*; ausgewählte werden **als Zweig in die Warum-Analyse übernommen** (mit Kategorie; Status wird übertragen).
  - **Person („Wer“) und Termin („Bis“)** je Maßnahme; überschrittene Termine offener Maßnahmen werden markiert.
  - Auswahl als Standard für neue Analysen speicherbar; ausgeblendete Angaben bleiben erhalten.
- **3 · Maßnahmen** gegen das Symptom (*Sofort*) und je Grundursache (*Abstellen*, *Vorbeugen*), mit **Stärke** (Beseitigen → Ersetzen → Technisch absichern → Organisatorisch → Schulung), **Prüfkriterium** und Prüfdatum für die Wirksamkeit, Status *offen / umgesetzt / wirksam / wirkt nicht*. Maßnahmen, deren Grundursache nicht mehr markiert ist, lassen sich neu zuordnen. **Maßnahmen-Check:** Symptom eingedämmt, jede Grundursache abgestellt, Wirksamkeit messbar, starke Maßnahmen, Termine, wirksam. Dazu „Übertragen“ (wo kann es noch auftreten?) und „Gelernt“.
- **4 · Bericht** auf einer Seite (A3-ähnlich): Problem, Fakten, Warum-Ketten je Blickwinkel (Grundursachen mit Nummer ◎1, ◎2 … wie in der Maßnahmen-Tabelle), Maßnahmen, Übertragen & Gelernt – zum Drucken/als PDF oder als Markdown (kopieren, herunterladen); widerlegte Annahmen ein- oder ausblendbar.
- **Methodik-Hilfe** (Knopf „? Methodik“): Methode, Problem beschreiben, Warum fragen, Blickwinkel, Ishikawa, Maßnahmen, Bedienung.
- **Speichern** automatisch im Browser (localStorage), Rückgängig/Wiederholen (Knöpfe bzw. `Strg+Z` / `Strg+Umschalt+Z` außerhalb von Textfeldern), Export/Import je Analyse als JSON (identische werden übersprungen, abweichende als Kopie angelegt), Sicherung aller Analysen. Änderungen aus einem anderen Browser-Tab werden übernommen.
- **Beispiel** „Lange Wartezeit am Samstag“ (Food-Truck, Deutsch und Englisch) mit allen optionalen Bereichen und typischen Stärken und Schwächen.
- **Sprachen:** Deutsch und Englisch (Menü „Datei“). Hell/dunkel nach Systemeinstellung, mobil mit Navigation unten.

## Aufbau

| Datei | Inhalt |
|---|---|
| `js/model.js` | Datenmodell, Normalisieren, Warum-Baum (Ebenen, Pfade, Grundursachen), Problemaussage |
| `js/checks.js` | Prüfungen (Problem, Kette, Maßnahmen), Phase, Kennzahlen, Hinweise |
| `js/ops.js` | Änderungen (Fakten, Team, Antworten, Ishikawa, Maßnahmen, Einstellungen, Duplizieren) |
| `js/storage.js` | Speicherung im localStorage |
| `js/io.js` | JSON-Export/-Import, Sicherung, Markdown-Bericht |
| `js/examples.js`, `examples/` | Beispielanalyse je Sprache |
| `js/texts.js`, `js/i18n/` | Texte und Wortlisten (Deutsch maßgeblich, Englisch gleiche Struktur) |
| `js/ui/core.js` | Route, geöffnete Analyse, Speichern, Verlauf, Dialoge, Meldungen, Ansichtszustand |
| `js/ui/*.jsx` | Ansichten: Start, Problem, Warum-Analyse (Kette, Baum), Ishikawa, Maßnahmen, Bericht, Einstellungen, Hilfe |
| `css/` | Design-Tokens (aus den Schwester-Apps), Bausteine, Ansichten, mobil, Druck |
| `tests/unit/`, `tests/e2e/` | Vitest (Logik, Mindestabdeckung) und Playwright (gegen den Build) |

Datenformat: [docs/DATENFORMAT.md](docs/DATENFORMAT.md). Entwürfe: [docs/mockups/](docs/mockups/).

## Lizenz

[MIT](LICENSE)
