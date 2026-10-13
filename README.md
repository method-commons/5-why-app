# 5 Warum

Responsive Web-App, die beim **methodischen Arbeiten mit der 5-Warum-Methode** (5 Why) hilft: ein Problem sauber beschreiben, schrittweise nach dem „Warum?“ fragen, die Grundursache finden und wirksame Maßnahmen dagegen festlegen – für beliebig viele Analysen.

Geplant wie die Schwester-Apps [Morphologische Matrix](https://github.com/method-commons/morphological-matrix-app) und [User Stories](https://github.com/method-commons/user-story-app): läuft im Browser ohne Server-Backend, Daten im localStorage, Export/Import als JSON, Deutsch und Englisch.

**Stand:** Konzept. Entwürfe: [docs/mockups/](docs/mockups/).

## Geplante Funktionen

- **Analysen:** Übersicht mit Problem, Phase (Problem → Warum → Ursache → Maßnahmen → Wirksam), Grundursachen und Hinweisen.
- **Problem beschreiben** nach 5W2H mit Soll/Ist, Auswirkung, Fakten & Belegen und Team; daraus die Problemaussage. Prüfung: konkret, messbar, ohne Ursache, ohne Lösung, belegt.
- **Ishikawa-Diagramm** (optional): mögliche Ursachen nach Kategorien (6M, 4P, 8M, eigene) sammeln und als Zweige in die Warum-Analyse übernehmen.
- **Warum-Kette:** je Ebene Frage, Antwort, Beleg und Status *belegt / vermutet / widerlegt*; Grundursache markieren; Prüfung der Kette und **Daher-Probe** (Kette rückwärts lesen).
- **Warum-Baum:** Verzweigungen, verworfene Annahmen sichtbar; Blickwinkel *Warum aufgetreten?*, optional *nicht entdeckt?* und *im System möglich?* (3 × 5 Warum).
- **Maßnahmen** je Grundursache (Sofort, Abstellen, Vorbeugen) mit Stärke, Kriterium für die Wirksamkeit und Status, optional mit verantwortlicher Person und Termin.
- **Bericht** auf einer Seite zum Drucken oder als Markdown.

Bewusst **kein Maßnahmenmanagement**: Person und Termin sind optional, es gibt keine Erinnerungen oder Benachrichtigungen.
