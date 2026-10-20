/*
 * Zustand der Oberfläche: Route (Hash), geöffnete Analyse, Speichern, Rückgängig/Wiederholen,
 * Dialoge, Meldungen und Ansichtszustand (gewählte Zweige, Fokus).
 *
 * Regeln für Änderungen:
 *  - Strukturelle Änderungen laufen über `mutate(fn)` (Verlaufseintrag, Speichern, Neuzeichnen).
 *  - Texteingaben über `fieldProps(get, set)`: Änderung sofort sichtbar, Verlaufseintrag beim
 *    Verlassen des Felds.
 *
 * Die Analyse ist ein normales Objekt, das `Ops` direkt ändert; das Signal `revision` zählt
 * Änderungen, Komponenten lesen es über `useAnalysis()` und zeichnen dadurch neu.
 */
import { signal } from '@preact/signals';
import { Ops } from '../ops.js';
import { Store } from '../storage.js';

/** Zähler für Änderungen; Komponenten lesen ihn, um neu zu zeichnen. */
export const revision = signal(0);

/** @typedef {'problem' | 'why' | 'actions' | 'report'} Tab */
/** @typedef {'chain' | 'tree' | 'ishikawa'} WhyMode */
/**
 * @typedef {{ view: 'home' }
 *   | { view: 'analysis', aid: string, tab: Tab, mode: WhyMode, lens: Lens }} Route
 */

const TABS = ['problem', 'why', 'actions', 'report'];
const MODES = ['chain', 'tree', 'ishikawa'];
const LENSES = ['occurrence', 'detection', 'system'];

/** Hash → Route. @param {string} hash @returns {Route} */
export function parseHash(hash) {
  const parts = hash.replace(/^#\/?/, '').split('/').filter(Boolean).map(decodeURIComponent);
  if (parts[0] === 'a' && parts[1]) {
    const tab = /** @type {Tab} */ (TABS.includes(parts[2]) ? parts[2] : 'problem');
    const mode = /** @type {WhyMode} */ (tab === 'why' && MODES.includes(parts[3]) ? parts[3] : 'chain');
    const lens = /** @type {Lens} */ (tab === 'why' && LENSES.includes(parts[4]) ? parts[4] : 'occurrence');
    return { view: 'analysis', aid: parts[1], tab, mode, lens };
  }
  return { view: 'home' };
}

/** Route → Hash. @param {Route} r */
export function hashOf(r) {
  if (r.view !== 'analysis') return '#/';
  const base = `#/a/${encodeURIComponent(r.aid)}/${r.tab}`;
  if (r.tab !== 'why') return base;
  return `${base}/${r.mode}${r.lens === 'occurrence' ? '' : '/' + r.lens}`;
}

/** Aktuelle Route. */
export const route = signal(parseHash(typeof location !== 'undefined' ? location.hash : ''));

/** Zur Route wechseln (neuer Verlaufseintrag im Browser). @param {Route} r */
export function go(r) {
  const h = hashOf(r);
  if (location.hash !== h) location.hash = h;
  else applyRoute();
}

/**
 * Innerhalb der geöffneten Analyse wechseln.
 * @param {Tab} tab @param {{ mode?: WhyMode, lens?: Lens }} [opts]
 */
export function goTab(tab, opts = {}) {
  if (!analysis) return;
  const r = route.value;
  const mode = opts.mode || (r.view === 'analysis' ? r.mode : 'chain');
  const lens = opts.lens || (r.view === 'analysis' ? r.lens : 'occurrence');
  go({ view: 'analysis', aid: analysis.id, tab, mode, lens });
}

/** Geöffnete Analyse (oder `null` auf der Startseite). @type {Analysis | null} */
export let analysis = null;
/** @type {string[]} */
let undoStack = [];
/** @type {string[]} */
let redoStack = [];
const HISTORY_LIMIT = 200;

/** Route aus dem Hash übernehmen und die passende Analyse laden. */
export function applyRoute() {
  const r = parseHash(location.hash);
  if (r.view === 'analysis') {
    if (!analysis || analysis.id !== r.aid) {
      flushSave();
      analysis = Store.load(r.aid);
      undoStack = [];
      redoStack = [];
      branchChoice.value = {};
      ishikawaState.value = { anchorId: undefined, causeId: null };
    }
    if (!analysis) { location.replace('#/'); route.value = { view: 'home' }; render(); return; }
  } else {
    flushSave();
    analysis = null;
  }
  route.value = r;
  render();
}

/** Neu zeichnen. */
export function render() {
  revision.value++;
}

/**
 * Für Komponenten: geöffnete Analyse – und bei jeder Änderung neu zeichnen.
 * @returns {Analysis}
 */
export function useAnalysis() {
  revision.value;
  return /** @type {Analysis} */ (analysis);
}

/** Für Komponenten, die nur neu zeichnen müssen (z. B. Startseite). */
export function useRevision() {
  return revision.value;
}

// ===== Speichern =====
/** @type {ReturnType<typeof setTimeout> | null} */
let saveTimer = null;

/** Gleich speichern (nach kurzer Pause gebündelt). */
export function scheduleSave() {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(flushSave, 300);
}

/** Ausstehendes Speichern sofort ausführen. */
export function flushSave() {
  if (!saveTimer) return;
  clearTimeout(saveTimer);
  saveTimer = null;
  if (analysis && !Store.save(analysis)) toast(storageFailedText);
}

/** Geöffnete Analyse verwerfen, ohne sie zu speichern (nach dem Löschen). */
export function discardAnalysis() {
  if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
  editSnapshot = null;
  analysis = null;
}

let storageFailedText = 'Speichern fehlgeschlagen';
/** Text der Meldung bei vollem Speicher (aus den Sprachdateien). @param {string} t */
export function setStorageFailedText(t) { storageFailedText = t; }

/** Analyse neu setzen (z. B. nach Änderung in einem anderen Browser-Tab). @param {Analysis} a */
export function replaceAnalysis(a) {
  analysis = a;
  render();
}

/**
 * Gespeicherten Stand übernehmen, nachdem ein anderer Browser-Tab (oder die Ablage) die Analyse
 * geändert hat: geöffnete Analyse neu laden – außer während einer Texteingabe –, sonst die Übersicht.
 * @param {string} id
 */
export function adoptStored(id) {
  if (analysis && analysis.id === id) {
    const doc = Store.load(id);
    if (!doc) { applyRoute(); return; }
    const active = document.activeElement;
    if (active && /^(INPUT|TEXTAREA)$/.test(active.tagName)) return;
    replaceAnalysis(doc);
  } else if (route.value.view === 'home') {
    render();
  }
}

// ===== Änderungen und Verlauf =====
/** Stand vor einer Texteingabe (Verlaufseintrag beim Verlassen des Felds). @type {string | null} */
let editSnapshot = null;

/** @param {string} snap */
function pushUndo(snap) {
  undoStack.push(snap);
  if (undoStack.length > HISTORY_LIMIT) undoStack.shift();
  redoStack = [];
}

/**
 * Strukturelle Änderung an der geöffneten Analyse.
 * @template T
 * @param {(a: Analysis) => T} fn
 * @returns {T | undefined}
 */
export function mutate(fn) {
  if (!analysis) return undefined;
  commitEdit();
  const before = JSON.stringify(analysis);
  const result = fn(analysis);
  if (JSON.stringify(analysis) !== before) {
    Ops.touch(analysis);
    pushUndo(before);
    scheduleSave();
  }
  render();
  return result;
}

/** Laufende Texteingabe als Verlaufseintrag abschließen. */
export function commitEdit() {
  if (editSnapshot == null || !analysis) return;
  const snap = editSnapshot;
  editSnapshot = null;
  if (snap !== JSON.stringify({ ...analysis, updatedAt: JSON.parse(snap).updatedAt })) pushUndo(snap);
  flushSave();
}

/**
 * Eigenschaften für ein Eingabefeld: Änderung sofort, Verlauf beim Verlassen.
 * @param {() => string} get @param {(v: string) => void} set
 */
export function fieldProps(get, set) {
  return {
    value: get(),
    onFocus: () => { if (analysis && editSnapshot == null) editSnapshot = JSON.stringify(analysis); },
    /** @param {Event} e */
    onInput: e => {
      if (!analysis) return;
      if (editSnapshot == null) editSnapshot = JSON.stringify(analysis);
      set(/** @type {HTMLInputElement} */ (e.currentTarget).value);
      Ops.touch(analysis);
      scheduleSave();
      render();
    },
    onBlur: commitEdit,
  };
}

export const canUndo = () => undoStack.length > 0 || editSnapshot != null;
export const canRedo = () => redoStack.length > 0;

export function undo() {
  commitEdit();
  if (!analysis || !undoStack.length) return;
  redoStack.push(JSON.stringify(analysis));
  analysis = JSON.parse(/** @type {string} */ (undoStack.pop()));
  afterHistory();
}

export function redo() {
  commitEdit();
  if (!analysis || !redoStack.length) return;
  undoStack.push(JSON.stringify(analysis));
  analysis = JSON.parse(/** @type {string} */ (redoStack.pop()));
  afterHistory();
}

function afterHistory() {
  scheduleSave();
  render();
}

// ===== Ansichtszustand =====
/** Gewählter Zweig je Frage (Schlüssel: Eltern-ID bzw. `:<Blickwinkel>`). @type {import('@preact/signals').Signal<Record<string, string>>} */
export const branchChoice = signal({});

/** Antwort, deren Textfeld nach dem Zeichnen den Fokus bekommt. @type {import('@preact/signals').Signal<string | null>} */
export const focusNode = signal(null);

/** Ishikawa: gewählte Wirkung (`undefined` = automatisch: die mit den meisten Ursachen) und Ursache. */
export const ishikawaState = signal(/** @type {{ anchorId: string | null | undefined, causeId: string | null }} */ ({ anchorId: undefined, causeId: null }));

/**
 * Pfad zu einer Antwort in der Kette anzeigen: Zweige entlang des Pfads wählen.
 * @param {WhyNode[]} path
 */
export function choosePath(path) {
  const next = { ...branchChoice.value };
  for (const n of path) next[n.parentId ?? `:${n.lens}`] = n.id;
  branchChoice.value = next;
}

// ===== Meldungen und Dialoge =====
/** @typedef {{ id: number, text: string, action?: { label: string, run: () => void } }} Toast */
/** @type {import('@preact/signals').Signal<Toast[]>} */
export const toasts = signal([]);
let toastId = 0;

/** Kurze Meldung unten. @param {string} text @param {Toast['action']} [action] */
export function toast(text, action) {
  const t = { id: ++toastId, text, action };
  toasts.value = [...toasts.value, t];
  setTimeout(() => { toasts.value = toasts.value.filter(x => x.id !== t.id); }, action ? 6000 : 3500);
}

/** Geöffneter Dialog: Funktion, die den Inhalt zeichnet. @type {import('@preact/signals').Signal<null | (() => import('preact').JSX.Element)>} */
export const dialog = signal(null);

/** @param {() => import('preact').JSX.Element} content */
export function openDialog(content) {
  commitEdit();
  dialog.value = content;
}

export function closeDialog() {
  dialog.value = null;
}

// ===== Einstellungen der Oberfläche =====
export const prefs = signal(Store.loadPrefs());

/** @param {Partial<import('../storage.js').Prefs>} patch */
export function setPrefs(patch) {
  prefs.value = { ...prefs.value, ...patch };
  Store.savePrefs(prefs.value);
}
