# CLAUDE.md – Hinweise für Claude Code

5-Why-App als Web-App ohne Server: Vite 8, Preact 10 + @preact/signals, Daten nur im Browser
(localStorage), veröffentlicht über GitHub Pages. Technische Vorlage sind die
[User-Story-App](https://github.com/method-commons/user-story-app) und die
[Morphologische Matrix](https://github.com/method-commons/morphological-matrix-app). Funktionen und Module
stehen in der [README](README.md), das Datenformat in [docs/DATENFORMAT.md](docs/DATENFORMAT.md).

## Zusammenarbeit

- **Sprache:** Antworten, Code-Kommentare, Commit-Nachrichten und PR-Texte auf **Deutsch**.
- **Erst zeigen, dann bauen:** neue Funktionen zuerst als Mockup (`docs/mockups/`), umsetzen nach „Ja“.
- **Abgrenzung:** Die App unterstützt die Methodik (Problem, Warum mit Belegen, Grundursache, Maßnahmen, Wirksamkeit) – kein Maßnahmenmanagement. Person und Termin sind optional, keine Erinnerungen.
- **Optionale Bereiche** (Blickwinkel 2 und 3, Ishikawa, Person, Termin) sind je Analyse schaltbar und standardmäßig aus; Ausblenden löscht nichts.
- **Pull Requests nur auf Nachfrage.** Keine Modellbezeichnungen in Commits, PRs oder Code.
- **Fertig heißt:** `npm test` grün, README/DATENFORMAT aktualisiert, Commit und Push.

## Befehle

```sh
npm test                       # Lint, Typprüfung, Unit, Build, E2E
npx eslint .                   # Lint
npx tsc --noEmit -p jsconfig.json && node scripts/typecheck-logic.js
npx vitest run [datei]         # Unit-Tests (tests/unit/)
npx vite build && npx playwright test [datei]   # E2E gegen den Build (Port 4173)
```

## Architektur

- **Logik ohne DOM** in `js/*.js` (`Model`, `Checks`, `Ops`, `Store`, `IO`, `Examples`), Oberfläche in `js/ui/*.jsx`.
- **Warum-Baum:** Antworten (`nodes`) mit `lens` und `parentId`; die „Kette“ zeigt einen Pfad (`Model.mainPath`, gewählte Zweige in `branchChoice`), der „Baum“ alle.
- **Zustand:** `analysis` in `js/ui/core.js` ist ein normales Objekt; neu gezeichnet wird über das Signal `revision`. Strukturelle Änderungen mit `mutate(fn)`, Textfelder mit `{...fieldProps(get, set)}` (Verlaufseintrag beim Verlassen). Navigation über den Hash (`#/a/<id>/problem`, `#/a/<id>/why/<chain|tree|ishikawa>[/<lens>]`, `#/a/<id>/actions`, `#/a/<id>/report`).
- `main.js` entfernt `Component.prototype.shouldComponentUpdate` (von @preact/signals): sonst zeichnen Kinder mit unveränderten Props nicht neu, obwohl sich die Analyse geändert hat.
- **Gemeinsame Helfer statt Kopien:** `Model.textOf`/`Model.actionText` (Ersatztext bei leerem Text), `Checks.isOverdue`, `Checks.phaseLabel`/`isComplete`, `changePreset` (Ishikawa-Vorlage mit Rückfrage), `useMenu` (Aufklappmenü) in `components.jsx`.
- **Texte** nur in `js/i18n/de.js` (maßgeblich) und `en.js` (gleiche Struktur und Platzhalter, wird geprüft; Wortlisten `words.*` dürfen verschieden lang sein).
- **Beispiele** `examples/food-truck.{de,en}.json` müssen exakt der Ausgabe von `Model.normalize` entsprechen.

## Ablage (method-commons/sync)

- Abhängigkeit `@method-commons/sync` über `git+https://github.com/method-commons/sync.git#<Tag oder Commit>` (nicht `github:` – npm schreibt sonst `git+ssh` ins Lockfile, das scheitert in der CI). Neue Version des Kerns: `package.json` und Lockfile anheben.
- Fest eingebunden nur `@method-commons/sync/config`; Kern, Oberfläche und Stile lädt `loadSync()` in `js/ui/sync.jsx` erst bei Bedarf.
- Änderungen meldet die Speicherschicht (`Store.observe`: Schreiben und Löschen) – auch Import, Duplizieren, Beispiele.
- Übernahmen aus der Ablage: abgelehnt, solange die geöffnete Datei ungespeicherte Eingaben hat (`hasPendingSave`, dann meldet der Kern einen Konflikt), sonst sofort angezeigt (`adoptStored(id, true)`).
- `resolve.dedupe: ['preact']` in `vite.config.js` – sonst zwei Preact-Instanzen (Hooks der Oberfläche brechen).
- **Versionen:** früherer Stand nur lesend über `showPreview`/`endPreview` (`core.js`): Speichern, `mutate`, Rückgängig und Eingaben (`beforeinput` in `fieldProps`) sind gesperrt, Wechsel zu einem anderen Dokument beendet das Ansehen, Übernahmen aus der Ablage werden solange abgelehnt.
- E2E: `tests/e2e/github.js` bildet die GitHub-API mit `page.route` nach (Dateien mit `sha`, Commits je Datei, Tags), genutzt von `sync.spec.js` und `versions.spec.js`; `tests/e2e/tabs.spec.js` prüft die Übernahme aus einem anderen Browser-Tab.

## Fallstricke

- **Werte vor `setState`/`mutate` lesen:** Das Neuzeichnen ist synchron; ein kontrolliertes Feld hat danach schon den alten Wert.
- **Speichern ist verzögert** (300 ms) – E2E-Tests lesen den localStorage mit `expect.poll`.
- **Ishikawa-Gräten** sind mit `skewX` schräg gestellt, Einträge werden einzeln zurückgedreht; schmal (≤ 900 px) wird daraus eine Liste.
- **`backdrop-filter`** an der Kopfzeile bindet `position: fixed` an sie – mobil daher abgeschaltet.
