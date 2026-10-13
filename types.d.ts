/**
 * Typen des Datenmodells – nur für die Typprüfung (tsc/Editor), wird vom Browser nicht geladen.
 * Die Struktur entspricht dem JSON-Export einer Analyse (siehe docs/DATENFORMAT.md).
 */

/** Blickwinkel (3 × 5 Warum): aufgetreten, nicht entdeckt, im System möglich */
type Lens = 'occurrence' | 'detection' | 'system';

/** Status einer Antwort: belegt, vermutet, widerlegt */
type Evidence = 'confirmed' | 'assumed' | 'refuted';

/** Status einer möglichen Ursache im Ishikawa-Diagramm: belegt, offen, ausgeschlossen */
type CauseState = 'confirmed' | 'open' | 'excluded';

/** Art einer Maßnahme: Sofort (Symptom eindämmen), Abstellen, Vorbeugen */
type ActionKind = 'immediate' | 'corrective' | 'preventive';

/** Stärke einer Maßnahme, von stark nach schwach */
type Strength = 'eliminate' | 'substitute' | 'engineering' | 'organisational' | 'training';

/** Status einer Maßnahme */
type ActionStatus = 'open' | 'done' | 'effective' | 'ineffective';

/** Vorlage für die Ishikawa-Kategorien */
type Preset = '6m' | '8m' | '4p' | 'custom';

/** Ergebnis einer Prüfung: erfüllt, prüfen, verletzt, noch offen */
type CheckState = 'ok' | 'warn' | 'bad' | 'open';

/** Optionale Bereiche einer Analyse */
interface Settings {
  /** Blickwinkel „Warum nicht entdeckt?“ */
  detection: boolean;
  /** Blickwinkel „Warum im System möglich?“ */
  system: boolean;
  /** Ishikawa-Diagramm */
  ishikawa: boolean;
  /** Verantwortliche Person je Maßnahme */
  owner: boolean;
  /** Termin je Maßnahme */
  due: boolean;
}

/** Problembeschreibung nach 5W2H */
interface Problem {
  what: string;
  where: string;
  when: string;
  /** Soll */
  target: string;
  /** Ist */
  actual: string;
  who: string;
  howFound: string;
  impact: string;
  /** Problemaussage; leer = Vorschlag aus den Feldern */
  statement: string;
}

interface Fact {
  id: string;
  text: string;
}

/** Eine Antwort auf „Warum?“ – Knoten im Warum-Baum eines Blickwinkels */
interface WhyNode {
  id: string;
  lens: Lens;
  /** Übergeordnete Antwort; `null` = erste Ebene (Antwort auf das Problem bzw. die Frage des Blickwinkels) */
  parentId: string | null;
  /** Eigene Formulierung der Frage, leer = automatisch */
  question: string;
  text: string;
  /** Beleg (Daten, Beobachtung, Dokument) */
  evidence: string;
  state: Evidence;
  /** Als Grundursache markiert */
  root: boolean;
  /** Ishikawa-Kategorie (Name), leer = keine */
  category: string;
}

interface Category {
  id: string;
  name: string;
}

/** Mögliche Ursache im Ishikawa-Diagramm */
interface Cause {
  id: string;
  /** Wirkung, zu der gesammelt wird: `null` = Problem, sonst eine Antwort im Blickwinkel „aufgetreten“ */
  anchorId: string | null;
  categoryId: string;
  text: string;
  state: CauseState;
  /** Daraus entstandene Antwort in der Warum-Analyse */
  nodeId: string | null;
}

interface Action {
  id: string;
  /** Grundursache (Antwort mit `root`), `null` = gegen das Symptom */
  rootId: string | null;
  kind: ActionKind;
  text: string;
  strength: Strength | null;
  /** Woran erkennt man, dass die Maßnahme wirkt? */
  check: string;
  /** Wann wird die Wirksamkeit geprüft (YYYY-MM-DD), optional */
  checkDate: string;
  /** Verantwortliche Person (optional, siehe Settings.owner) */
  owner: string;
  /** Termin YYYY-MM-DD (optional, siehe Settings.due) */
  due: string;
  status: ActionStatus;
}

interface Analysis {
  schema: number;
  id: string;
  name: string;
  /** Umfeld, z. B. Firma, Standort, Prozess */
  context: string;
  /** Farbe als #rrggbb */
  color: string;
  createdAt: string;
  updatedAt: string;
  settings: Settings;
  problem: Problem;
  facts: Fact[];
  /** Namen der Beteiligten */
  team: string[];
  /** Ausgangsfragen der Blickwinkel „nicht entdeckt“ und „im System“ */
  lensQuestions: { detection: string; system: string };
  nodes: WhyNode[];
  preset: Preset;
  categories: Category[];
  causes: Cause[];
  actions: Action[];
  /** Wo kann das Problem noch auftreten? */
  transfer: string;
  /** Was haben wir gelernt? */
  lessons: string;
  /** Selbst bestätigte Prüfpunkte, z. B. `causal:occurrence` */
  confirmed: string[];
}

/** Ein Prüfpunkt mit Zustand und Erläuterung */
interface Check {
  key: string;
  state: CheckState;
  /** Erläuterung (Text der aktiven Sprache) */
  detail: string;
  /** Kann selbst bestätigt werden (Schlüssel für `confirmed`) */
  confirmKey?: string;
}
