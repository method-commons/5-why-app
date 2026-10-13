# 5 Warum

Responsive Web-App, die beim **methodischen Arbeiten mit der 5-Warum-Methode** (5 Why) hilft: ein Problem sauber beschreiben, schrittweise nach dem „Warum?“ fragen, die Grundursache finden und wirksame Maßnahmen dagegen festlegen – für beliebig viele Analysen.

Geplant wie die Schwester-Apps [Morphologische Matrix](https://github.com/method-commons/morphological-matrix-app) und [User Stories](https://github.com/method-commons/user-story-app): läuft im Browser ohne Server-Backend, Daten im localStorage, Export/Import als JSON, Deutsch und Englisch.

**Stand:** Konzept. Entwürfe: [docs/mockups/](docs/mockups/).

## Geplante Funktionen

- **Analysen:** Übersicht mit Problem, Phase (Problem → Warum → Ursache → Maßnahmen → Wirksam), Grundursachen und Hinweisen.
- **Problem beschreiben** nach 5W2H mit Soll/Ist, Auswirkung, Fakten & Belegen und Team; daraus die Problemaussage. Prüfung: konkret, messbar, ohne Ursache, ohne Lösung, belegt.
- **Warum-Kette:** je Ebene Frage, Antwort, Beleg und Status *belegt / vermutet / widerlegt*; Grundursache markieren; Prüfung der Kette und **Daher-Probe** (Kette rückwärts lesen).
- **Warum-Baum:** Verzweigungen, verworfene Annahmen sichtbar; drei Blickwinkel *Warum aufgetreten? / nicht entdeckt? / im System möglich?* (3 × 5 Warum).
- **Maßnahmen** je Grundursache (Sofort, Abstellen, Vorbeugen) mit Stärke, Kriterium für die Wirksamkeit und Status.
- **Bericht** auf einer Seite zum Drucken oder als Markdown.

Bewusst **kein Maßnahmenmanagement**: keine Zuständigkeiten, Termine oder Erinnerungen.
