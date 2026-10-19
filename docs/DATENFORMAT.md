# Datenformat

Eine Analyse wird als JSON gespeichert (localStorage, Export „Analyse exportieren (JSON)“). Beim Laden und Importieren wird jede Datei mit `Model.normalize` geprüft: fehlende Felder werden ergänzt, ungültige Werte und Verweise entfernt, doppelte IDs neu vergeben. Typen: [`types.d.ts`](../types.d.ts). Beispiel: [`examples/food-truck.de.json`](../examples/food-truck.de.json).

Im localStorage liegt jede Analyse in einer Hülle `{ "savedAt": <Zeitpunkt in ms>, "data": <Analyse> }` – wie in den anderen Methoden-Apps, als Grundlage für die geplante gemeinsame Ablage ([method-commons/sync](https://github.com/method-commons/sync/blob/main/docs/KONZEPT.md)). Ältere Einträge ohne Hülle werden weiter gelesen und beim nächsten Speichern umgestellt. Export, Sicherung und Beispiele enthalten nur die Analyse selbst.

## Analyse

| Feld | Typ | Bedeutung |
|---|---|---|
| `schema` | Zahl | Version des Formats, derzeit `1` |
| `id` | Text | Eindeutige ID |
| `name`, `context` | Text | Titel und Umfeld (Firma, Standort, Prozess) |
| `color` | `#rrggbb` | Farbe der Kachel |
| `createdAt`, `updatedAt` | ISO-Zeitstempel | Anlage und letzte Änderung |
| `settings` | Objekt | Optionale Bereiche, siehe unten |
| `problem` | Objekt | Problembeschreibung, siehe unten |
| `facts` | Liste `{ id, text }` | Fakten & Belege |
| `team` | Liste von Texten | Namen der Beteiligten (ohne Doppelte) |
| `lensQuestions` | `{ detection, system }` | Eigene Ausgangsfragen der Blickwinkel 2 und 3 (leer = Standardfrage) |
| `nodes` | Liste | Antworten im Warum-Baum, siehe unten |
| `preset` | `6m` \| `8m` \| `4p` \| `custom` | Vorlage der Ishikawa-Kategorien |
| `categories` | Liste `{ id, name }` | Ishikawa-Kategorien in Anzeigereihenfolge |
| `causes` | Liste | Mögliche Ursachen im Ishikawa-Diagramm, siehe unten |
| `actions` | Liste | Maßnahmen, siehe unten |
| `transfer`, `lessons` | Text | Übertragen (wo kann es noch auftreten?) und Gelernt |
| `confirmed` | Liste von Texten | Selbst bestätigte Prüfpunkte: `causal:<lens>` (Daher-Probe), `control:<lens>` (im eigenen Einfluss) |

### `settings`

Alle `true`/`false`, standardmäßig `false`: `detection` (Blickwinkel „Warum nicht entdeckt?“), `system` („Warum im System möglich?“), `ishikawa` (Ishikawa-Ansicht), `owner` (Person je Maßnahme), `due` (Termin je Maßnahme). Ausgeschaltete Bereiche werden nur ausgeblendet; ihre Daten bleiben erhalten.

### `problem`

Texte: `what`, `where`, `when`, `target` (Soll), `actual` (Ist), `who`, `howFound`, `impact`, `statement` (Problemaussage; leer = Vorschlag aus den übrigen Feldern).

### `nodes` – Antworten

| Feld | Typ | Bedeutung |
|---|---|---|
| `id` | Text | Eindeutige ID |
| `lens` | `occurrence` \| `detection` \| `system` | Blickwinkel: aufgetreten, nicht entdeckt, im System möglich |
| `parentId` | Text \| `null` | Übergeordnete Antwort im selben Blickwinkel; `null` = erste Ebene. Kreise und Verweise auf andere Blickwinkel werden beim Laden gelöst. |
| `question` | Text | Eigene Formulierung der Frage, leer = automatisch |
| `text` | Text | Antwort (Ursache) |
| `evidence` | Text | Beleg |
| `state` | `confirmed` \| `assumed` \| `refuted` | belegt, vermutet (Standard), widerlegt |
| `root` | `true`/`false` | Als Grundursache markiert (nie bei `refuted`) |
| `category` | Text | Ishikawa-Kategorie, aus der die Antwort übernommen wurde |

Die Ebene (W1, W2 …) ergibt sich aus der Tiefe im Baum; die Reihenfolge der Liste bestimmt die Reihenfolge der Zweige.

### `causes` – Ishikawa

| Feld | Typ | Bedeutung |
|---|---|---|
| `id` | Text | Eindeutige ID |
| `anchorId` | Text \| `null` | Wirkung: eine Antwort im Blickwinkel `occurrence`, `null` = Problem |
| `categoryId` | Text | Kategorie (Ursachen ohne gültige Kategorie werden entfernt) |
| `text` | Text | Mögliche Ursache |
| `state` | `confirmed` \| `open` \| `excluded` | belegt, offen (Standard), ausgeschlossen |
| `nodeId` | Text \| `null` | Daraus übernommene Antwort |

### `actions` – Maßnahmen

| Feld | Typ | Bedeutung |
|---|---|---|
| `id` | Text | Eindeutige ID |
| `rootId` | Text \| `null` | Grundursache (Antwort); `null` = gegen das Symptom |
| `kind` | `immediate` \| `corrective` \| `preventive` | Sofort, Abstellen, Vorbeugen |
| `text` | Text | Maßnahme |
| `strength` | `eliminate` \| `substitute` \| `engineering` \| `organisational` \| `training` \| `null` | Stärke, von stark nach schwach |
| `check` | Text | Woran erkennt man die Wirkung? |
| `checkDate` | `YYYY-MM-DD` \| `""` | Wann wird geprüft |
| `owner` | Text | Verantwortliche Person (nur angezeigt mit `settings.owner`) |
| `due` | `YYYY-MM-DD` \| `""` | Termin (nur angezeigt mit `settings.due`) |
| `status` | `open` \| `done` \| `effective` \| `ineffective` | offen, umgesetzt, wirksam, wirkt nicht |

Zeigt `rootId` auf eine Antwort, die nicht (mehr) als Grundursache markiert ist, erscheint die Maßnahme unter „Ohne Grundursache“ zum Neuzuordnen.

## Sicherung

„Alle Analysen sichern“ erzeugt `{ "type": "five-why-backup", "version": 1, "exportedAt": "…", "analyses": [ … ] }`. Importiert werden eine einzelne Analyse, eine Sicherung oder eine Liste von Analysen. Identische Analysen werden übersprungen, abweichende mit gleicher ID als Kopie („(Import)“) angelegt.

## Speicher im Browser

| Schlüssel | Inhalt |
|---|---|
| `five-why:analysis:<id>` | eine Analyse |
| `five-why:prefs` | `{ "defaults": Settings }` – Standard für neue Analysen |
| `five-why:lang` | gewählte Sprache (`de`, `en`) |
