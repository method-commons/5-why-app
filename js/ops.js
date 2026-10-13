/*
 * Ops – Änderungen an einer Analyse (ohne DOM): Fakten, Team, Antworten im Warum-Baum,
 * Ishikawa-Kategorien und -Ursachen, Maßnahmen, Einstellungen. Alle Funktionen ändern die
 * übergebene Analyse direkt. Exportiert den Namensraum `Ops`.
 */
import { Model } from './model.js';
import { Util } from './util.js';

export const Ops = (() => {
  /** Änderungszeit setzen. @param {Analysis} a */
  function touch(a) {
    a.updatedAt = Util.now();
  }

  // ===== Problem: Fakten und Team =====
  /** @param {Analysis} a @param {string} [text] */
  function addFact(a, text = '') {
    const fact = { id: Util.uid('f'), text };
    a.facts.push(fact);
    return fact;
  }

  /** @param {Analysis} a @param {string} factId */
  function removeFact(a, factId) {
    a.facts = a.facts.filter(x => x.id !== factId);
  }

  /** Person ins Team aufnehmen (doppelte und leere Namen werden ignoriert). @param {Analysis} a @param {string} name */
  function addTeam(a, name) {
    const n = name.trim();
    if (!n || a.team.some(t => t.toLowerCase() === n.toLowerCase())) return false;
    a.team.push(n);
    return true;
  }

  /** @param {Analysis} a @param {string} name */
  function removeTeam(a, name) {
    a.team = a.team.filter(t => t !== name);
  }

  // ===== Warum-Baum =====
  /**
   * Antwort anlegen: unter `parentId` (null = erste Ebene des Blickwinkels).
   * @param {Analysis} a @param {{ lens: Lens, parentId: string | null, text?: string, state?: Evidence, category?: string }} opts
   * @returns {WhyNode}
   */
  function addNode(a, { lens, parentId, text = '', state = 'assumed', category = '' }) {
    const parent = Model.node(a, parentId);
    /** @type {WhyNode} */
    const n = {
      id: Util.uid('n'),
      lens: parent ? parent.lens : lens,
      parentId: parent ? parent.id : null,
      question: '', text, evidence: '', state, root: false, category,
    };
    // Eine Grundursache, unter der weitergefragt wird, ist keine mehr
    if (parent) parent.root = false;
    // Hinter den letzten Geschwistern einfügen, damit die Reihenfolge der Zweige erhalten bleibt
    const siblings = a.nodes.filter(x => x.lens === n.lens && x.parentId === n.parentId);
    const after = siblings.length ? a.nodes.indexOf(siblings[siblings.length - 1]) : -1;
    if (after >= 0) a.nodes.splice(after + 1, 0, n);
    else a.nodes.push(n);
    return n;
  }

  /**
   * Antwort mit allen darunterliegenden entfernen. Verweise aus dem Ishikawa-Diagramm werden
   * gelöst, Ursachen zu entfernten Wirkungen gelöscht; Maßnahmen bleiben (ohne Grundursache).
   * @param {Analysis} a @param {string} nodeId @returns {number} Anzahl entfernter Antworten
   */
  function removeNode(a, nodeId) {
    const n = Model.node(a, nodeId);
    if (!n) return 0;
    const gone = new Set([n.id, ...Model.descendants(a, n.id).map(d => d.id)]);
    a.nodes = a.nodes.filter(x => !gone.has(x.id));
    a.causes = a.causes.filter(c => !(c.anchorId && gone.has(c.anchorId)));
    for (const c of a.causes) if (c.nodeId && gone.has(c.nodeId)) c.nodeId = null;
    for (const x of a.actions) if (x.rootId && gone.has(x.rootId)) x.rootId = null;
    return gone.size;
  }

  /** Als Grundursache markieren bzw. die Markierung aufheben. @param {Analysis} a @param {string} nodeId @param {boolean} on */
  function setRoot(a, nodeId, on) {
    const n = Model.node(a, nodeId);
    if (!n) return;
    n.root = on && n.state !== 'refuted';
  }

  /** Status setzen; eine widerlegte Antwort ist keine Grundursache. @param {Analysis} a @param {string} nodeId @param {Evidence} state */
  function setState(a, nodeId, state) {
    const n = Model.node(a, nodeId);
    if (!n) return;
    n.state = state;
    if (state === 'refuted') n.root = false;
    const cause = a.causes.find(c => c.nodeId === n.id);
    if (cause) cause.state = state === 'confirmed' ? 'confirmed' : state === 'refuted' ? 'excluded' : 'open';
  }

  /** Antwort unter den Geschwistern verschieben. @param {Analysis} a @param {string} nodeId @param {-1 | 1} dir */
  function moveNode(a, nodeId, dir) {
    const n = Model.node(a, nodeId);
    if (!n) return false;
    const siblings = a.nodes.filter(x => x.lens === n.lens && x.parentId === n.parentId);
    const j = siblings.indexOf(n) + dir;
    if (j < 0 || j >= siblings.length) return false;
    const other = siblings[j];
    const ia = a.nodes.indexOf(n);
    const ib = a.nodes.indexOf(other);
    a.nodes[ia] = other;
    a.nodes[ib] = n;
    return true;
  }

  /** Selbst bestätigten Prüfpunkt umschalten. @param {Analysis} a @param {string} key */
  function toggleConfirm(a, key) {
    if (a.confirmed.includes(key)) a.confirmed = a.confirmed.filter(k => k !== key);
    else a.confirmed.push(key);
  }

  // ===== Ishikawa =====
  /** @param {Analysis} a @param {string} [name] */
  function addCategory(a, name = '') {
    const c = { id: Util.uid('c'), name };
    a.categories.push(c);
    a.preset = 'custom';
    return c;
  }

  /** Kategorie mit ihren Ursachen entfernen. @param {Analysis} a @param {string} categoryId */
  function removeCategory(a, categoryId) {
    a.categories = a.categories.filter(c => c.id !== categoryId);
    a.causes = a.causes.filter(c => c.categoryId !== categoryId);
    a.preset = 'custom';
  }

  /**
   * Vorlage anwenden: Kategorien der Reihe nach umbenennen, fehlende anlegen, überzählige
   * (mit ihren Ursachen) entfernen. Bei „eigene“ bleiben die Kategorien unverändert.
   * @param {Analysis} a @param {Preset} preset
   */
  function applyPreset(a, preset) {
    a.preset = preset;
    if (preset === 'custom') return;
    const names = Model.presetNames(preset);
    names.forEach((name, i) => {
      if (a.categories[i]) a.categories[i].name = name;
      else a.categories.push({ id: Util.uid('c'), name });
    });
    for (const c of a.categories.slice(names.length)) a.causes = a.causes.filter(k => k.categoryId !== c.id);
    a.categories = a.categories.slice(0, names.length);
  }

  /** Ursachen, die beim Anwenden einer Vorlage verloren gingen. @param {Analysis} a @param {Preset} preset */
  function causesLostByPreset(a, preset) {
    if (preset === 'custom') return 0;
    const keep = new Set(a.categories.slice(0, Model.presetNames(preset).length).map(c => c.id));
    return a.causes.filter(c => !keep.has(c.categoryId)).length;
  }

  /** @param {Analysis} a @param {{ anchorId: string | null, categoryId: string, text?: string }} opts @returns {Cause} */
  function addCause(a, { anchorId, categoryId, text = '' }) {
    /** @type {Cause} */
    const c = { id: Util.uid('k'), anchorId, categoryId, text, state: 'open', nodeId: null };
    a.causes.push(c);
    return c;
  }

  /** @param {Analysis} a @param {string} causeId */
  function removeCause(a, causeId) {
    a.causes = a.causes.filter(c => c.id !== causeId);
  }

  /** Status einer Ursache; überträgt sich auf die daraus entstandene Antwort. @param {Analysis} a @param {string} causeId @param {CauseState} state */
  function setCauseState(a, causeId, state) {
    const c = a.causes.find(x => x.id === causeId);
    if (!c) return;
    c.state = state;
    const n = Model.node(a, c.nodeId);
    if (n) {
      n.state = state === 'confirmed' ? 'confirmed' : state === 'excluded' ? 'refuted' : 'assumed';
      if (n.state === 'refuted') n.root = false;
    }
  }

  /**
   * Ursache als Zweig in die Warum-Analyse übernehmen: Antwort unter der Wirkung (bzw. auf erster
   * Ebene), mit Text, Kategorie und passendem Status. Schon übernommene liefern ihre Antwort.
   * @param {Analysis} a @param {string} causeId @returns {WhyNode | null}
   */
  function causeToNode(a, causeId) {
    const c = a.causes.find(x => x.id === causeId);
    if (!c) return null;
    const existing = Model.node(a, c.nodeId);
    if (existing) return existing;
    const n = addNode(a, {
      lens: 'occurrence',
      parentId: c.anchorId,
      text: c.text,
      state: c.state === 'confirmed' ? 'confirmed' : c.state === 'excluded' ? 'refuted' : 'assumed',
      category: Model.categoryName(a, c.categoryId),
    });
    c.nodeId = n.id;
    return n;
  }

  // ===== Maßnahmen =====
  /** @param {Analysis} a @param {{ rootId: string | null, kind?: ActionKind, text?: string }} opts @returns {Action} */
  function addAction(a, { rootId, kind, text = '' }) {
    /** @type {Action} */
    const x = {
      id: Util.uid('m'), rootId, kind: kind || (rootId ? 'corrective' : 'immediate'), text,
      strength: null, check: '', checkDate: '', owner: '', due: '', status: 'open',
    };
    a.actions.push(x);
    return x;
  }

  /** @param {Analysis} a @param {string} actionId */
  function removeAction(a, actionId) {
    a.actions = a.actions.filter(x => x.id !== actionId);
  }

  /** @param {Analysis} a @param {string} actionId */
  function action(a, actionId) {
    return a.actions.find(x => x.id === actionId);
  }

  // ===== Einstellungen =====
  /** @param {Analysis} a @param {keyof Settings} key @param {boolean} value */
  function setSetting(a, key, value) {
    a.settings[key] = value;
  }

  /** Kopie mit neuen IDs (Verweise bleiben gültig). @param {Analysis} a @param {string} suffix @returns {Analysis} */
  function duplicate(a, suffix) {
    const map = new Map();
    /** @param {string} prefix @param {string} old */
    const fresh = (prefix, old) => { const n = Util.uid(prefix); map.set(old, n); return n; };
    /** @type {Analysis} */
    const copy = JSON.parse(JSON.stringify(a));
    copy.id = Util.uid('a');
    copy.name = `${a.name} ${suffix}`;
    copy.createdAt = copy.updatedAt = Util.now();
    for (const n of copy.nodes) n.id = fresh('n', n.id);
    for (const n of copy.nodes) if (n.parentId) n.parentId = map.get(n.parentId) ?? null;
    for (const c of copy.categories) c.id = fresh('c', c.id);
    for (const c of copy.causes) {
      c.id = Util.uid('k');
      c.categoryId = map.get(c.categoryId);
      c.anchorId = c.anchorId ? map.get(c.anchorId) ?? null : null;
      c.nodeId = c.nodeId ? map.get(c.nodeId) ?? null : null;
    }
    for (const x of copy.actions) { x.id = Util.uid('m'); x.rootId = x.rootId ? map.get(x.rootId) ?? null : null; }
    for (const fact of copy.facts) fact.id = Util.uid('f');
    return copy;
  }

  return {
    touch, addFact, removeFact, addTeam, removeTeam,
    addNode, removeNode, setRoot, setState, moveNode, toggleConfirm,
    addCategory, removeCategory, applyPreset, causesLostByPreset, addCause, removeCause, setCauseState, causeToNode,
    addAction, removeAction, action, setSetting, duplicate,
  };
})();
