/*
 * Model – Datenmodell einer 5-Why-Analyse: Konstanten, Anlegen, Normalisieren (Import, alte
 * Stände), Navigation im Warum-Baum (Ebenen, Pfade, Grundursachen) und die Problemaussage.
 * Exportiert den Namensraum `Model`.
 */
import { Texts } from './texts.js';
import { Util } from './util.js';

export const Model = (() => {
  const SCHEMA_VERSION = 1;

  /** @type {readonly Lens[]} */
  const LENSES = ['occurrence', 'detection', 'system'];
  /** @type {readonly Evidence[]} */
  const EVIDENCE = ['confirmed', 'assumed', 'refuted'];
  /** @type {readonly CauseState[]} */
  const CAUSE_STATES = ['confirmed', 'open', 'excluded'];
  /** @type {readonly ActionKind[]} */
  const ACTION_KINDS = ['immediate', 'corrective', 'preventive'];
  /** Von stark nach schwach. @type {readonly Strength[]} */
  const STRENGTHS = ['eliminate', 'substitute', 'engineering', 'organisational', 'training'];
  /** @type {readonly ActionStatus[]} */
  const ACTION_STATUSES = ['open', 'done', 'effective', 'ineffective'];
  /** @type {readonly Preset[]} */
  const PRESETS = ['6m', '8m', '4p', 'custom'];
  /** Felder der Problembeschreibung in Anzeigereihenfolge. @type {readonly (keyof Problem)[]} */
  const PROBLEM_FIELDS = ['what', 'where', 'when', 'target', 'actual', 'who', 'howFound', 'impact', 'statement'];
  /** @type {readonly (keyof Settings)[]} */
  const SETTINGS = ['detection', 'system', 'ishikawa', 'owner', 'due'];

  /** Farben für Analysen (Kachel auf der Startseite). */
  const COLORS = ['#f59f00', '#4f46e5', '#2b8a3e', '#0e7490', '#c2255c', '#7048e8', '#e8590c', '#1864ab'];

  /** Optionale Bereiche sind standardmäßig aus. @type {Settings} */
  const DEFAULT_SETTINGS = { detection: false, system: false, ishikawa: false, owner: false, due: false };

  /** Namen der Kategorien einer Vorlage (Sprache der App). @param {Preset} preset @returns {string[]} */
  function presetNames(preset) {
    return preset === 'custom' ? [] : [...Texts.ishikawa.presets[preset].names];
  }

  /**
   * Neue, leere Analyse.
   * @param {{ name?: string, context?: string, color?: string, settings?: Partial<Settings> }} [opts]
   * @returns {Analysis}
   */
  function create(opts = {}) {
    const stamp = Util.now();
    return {
      schema: SCHEMA_VERSION,
      id: Util.uid('a'),
      name: (opts.name || '').trim() || Texts.analysis.untitled,
      context: (opts.context || '').trim(),
      color: opts.color && /^#[0-9a-f]{6}$/i.test(opts.color) ? opts.color : COLORS[Math.floor(Math.random() * COLORS.length)],
      createdAt: stamp,
      updatedAt: stamp,
      settings: { ...DEFAULT_SETTINGS, ...pickSettings(opts.settings) },
      problem: emptyProblem(),
      facts: [],
      team: [],
      lensQuestions: { detection: '', system: '' },
      nodes: [],
      preset: '6m',
      categories: presetNames('6m').map(name => ({ id: Util.uid('c'), name })),
      causes: [],
      actions: [],
      transfer: '',
      lessons: '',
      confirmed: [],
    };
  }

  /** @returns {Problem} */
  function emptyProblem() {
    return { what: '', where: '', when: '', target: '', actual: '', who: '', howFound: '', impact: '', statement: '' };
  }

  /** Nur gültige Schalter übernehmen. @param {any} raw @returns {Partial<Settings>} */
  function pickSettings(raw) {
    /** @type {Partial<Settings>} */
    const out = {};
    if (raw && typeof raw === 'object') for (const k of SETTINGS) if (typeof raw[k] === 'boolean') out[k] = raw[k];
    return out;
  }

  // ===== Normalisieren =====
  /** @param {unknown} v */
  const str = v => (typeof v === 'string' ? v : v == null ? '' : String(v));
  /** @template T @param {unknown} v @param {readonly T[]} list @param {T} fallback @returns {T} */
  const oneOf = (v, list, fallback) => (list.includes(/** @type {T} */ (v)) ? /** @type {T} */ (v) : fallback);
  /** @param {unknown} v @returns {any[]} */
  const arr = v => (Array.isArray(v) ? v.filter(x => x && typeof x === 'object') : []);
  /** @param {unknown} v @param {string} prefix */
  const id = (v, prefix) => (typeof v === 'string' && v.trim() ? v : Util.uid(prefix));
  /** @param {unknown} v */
  const day = v => (Util.isDay(v) ? /** @type {string} */ (v) : '');

  /**
   * Beliebige Eingabe (Import, gespeicherter Stand) in eine gültige Analyse überführen.
   * Ungültige Verweise werden entfernt, doppelte IDs neu vergeben.
   * @param {any} raw @returns {Analysis}
   */
  function normalize(raw) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error(Texts.io.invalid);
    const base = create();
    const seen = new Set();
    /** @param {unknown} v @param {string} prefix */
    const uniq = (v, prefix) => {
      let x = id(v, prefix);
      while (seen.has(x)) x = Util.uid(prefix);
      seen.add(x);
      return x;
    };

    const rawProblem = raw.problem && typeof raw.problem === 'object' ? raw.problem : {};
    const problem = emptyProblem();
    for (const k of PROBLEM_FIELDS) problem[k] = str(rawProblem[k]);

    /** @type {WhyNode[]} */
    const nodes = arr(raw.nodes).map(n => ({
      id: uniq(n.id, 'n'),
      lens: oneOf(n.lens, LENSES, 'occurrence'),
      parentId: typeof n.parentId === 'string' ? n.parentId : null,
      question: str(n.question),
      text: str(n.text),
      evidence: str(n.evidence),
      state: oneOf(n.state, EVIDENCE, 'assumed'),
      root: n.root === true,
      category: str(n.category),
    }));
    // Verweise prüfen: Elternknoten muss existieren, im selben Blickwinkel liegen und darf keinen Kreis bilden
    const byId = new Map(nodes.map(n => [n.id, n]));
    for (const n of nodes) {
      const parent = n.parentId != null ? byId.get(n.parentId) : null;
      if (!parent || parent.lens !== n.lens) { n.parentId = null; continue; }
      const visited = new Set([n.id]);
      let p = /** @type {WhyNode | undefined} */ (parent);
      while (p) {
        if (visited.has(p.id)) { n.parentId = null; break; }
        visited.add(p.id);
        p = p.parentId != null ? byId.get(p.parentId) : undefined;
      }
    }
    for (const n of nodes) if (n.state === 'refuted') n.root = false;

    /** @type {Category[]} */
    const categories = arr(raw.categories).map(c => ({ id: uniq(c.id, 'c'), name: str(c.name) }));
    const catIds = new Set(categories.map(c => c.id));
    const occurrence = new Set(nodes.filter(n => n.lens === 'occurrence').map(n => n.id));

    /** @type {Cause[]} */
    const causes = arr(raw.causes)
      .filter(c => catIds.has(c.categoryId))
      .map(c => ({
        id: uniq(c.id, 'k'),
        anchorId: typeof c.anchorId === 'string' && occurrence.has(c.anchorId) ? c.anchorId : null,
        categoryId: c.categoryId,
        text: str(c.text),
        state: oneOf(c.state, CAUSE_STATES, 'open'),
        nodeId: typeof c.nodeId === 'string' && byId.has(c.nodeId) ? c.nodeId : null,
      }));

    /** @type {Action[]} */
    const actions = arr(raw.actions).map(a => ({
      id: uniq(a.id, 'm'),
      rootId: typeof a.rootId === 'string' && byId.has(a.rootId) ? a.rootId : null,
      kind: oneOf(a.kind, ACTION_KINDS, 'corrective'),
      text: str(a.text),
      strength: oneOf(a.strength, STRENGTHS, null),
      check: str(a.check),
      checkDate: day(a.checkDate),
      owner: str(a.owner),
      due: day(a.due),
      status: oneOf(a.status, ACTION_STATUSES, 'open'),
    }));

    const lq = raw.lensQuestions && typeof raw.lensQuestions === 'object' ? raw.lensQuestions : {};
    return {
      schema: SCHEMA_VERSION,
      id: id(raw.id, 'a'),
      name: str(raw.name).trim() || Texts.analysis.untitled,
      context: str(raw.context),
      color: typeof raw.color === 'string' && /^#[0-9a-f]{6}$/i.test(raw.color) ? raw.color.toLowerCase() : base.color,
      createdAt: typeof raw.createdAt === 'string' && raw.createdAt ? raw.createdAt : base.createdAt,
      updatedAt: typeof raw.updatedAt === 'string' && raw.updatedAt ? raw.updatedAt : base.updatedAt,
      settings: { ...DEFAULT_SETTINGS, ...pickSettings(raw.settings) },
      problem,
      facts: arr(raw.facts).map(f => ({ id: uniq(f.id, 'f'), text: str(f.text) })),
      team: [...new Set((Array.isArray(raw.team) ? raw.team : []).map(str).map((/** @type {string} */ s) => s.trim()).filter(Boolean))],
      lensQuestions: { detection: str(lq.detection), system: str(lq.system) },
      nodes,
      preset: oneOf(raw.preset, PRESETS, 'custom'),
      categories,
      causes,
      actions,
      transfer: str(raw.transfer),
      lessons: str(raw.lessons),
      confirmed: [...new Set((Array.isArray(raw.confirmed) ? raw.confirmed : []).filter((/** @type {unknown} */ x) => typeof x === 'string'))],
    };
  }

  // ===== Warum-Baum =====
  /** Eingeschaltete Blickwinkel. @param {Analysis} a @returns {Lens[]} */
  function lenses(a) {
    return LENSES.filter(l => l === 'occurrence' || a.settings[l]);
  }

  /** @param {Analysis} a @param {string | null | undefined} nodeId */
  function node(a, nodeId) {
    return nodeId == null ? undefined : a.nodes.find(n => n.id === nodeId);
  }

  /** Antworten unter einer Antwort bzw. auf erster Ebene eines Blickwinkels. @param {Analysis} a @param {Lens} lens @param {string | null} parentId */
  function children(a, lens, parentId) {
    return a.nodes.filter(n => n.lens === lens && n.parentId === parentId);
  }

  /** Pfad von der ersten Ebene bis zur Antwort (einschließlich). @param {Analysis} a @param {string} nodeId @returns {WhyNode[]} */
  function pathTo(a, nodeId) {
    /** @type {WhyNode[]} */
    const path = [];
    let n = node(a, nodeId);
    while (n && path.length <= a.nodes.length) {
      path.unshift(n);
      n = node(a, n.parentId);
    }
    return path;
  }

  /** Ebene einer Antwort (1 = erste Antwort). @param {Analysis} a @param {WhyNode} n */
  function level(a, n) {
    return pathTo(a, n.id).length;
  }

  /** Kurzzeichen „W3“. @param {Analysis} a @param {WhyNode} n */
  function label(a, n) {
    return `${Texts.why.levelShort}${level(a, n)}`;
  }

  /** Alle Antworten unterhalb (ohne die Antwort selbst). @param {Analysis} a @param {string} nodeId @returns {WhyNode[]} */
  function descendants(a, nodeId) {
    /** @type {WhyNode[]} */
    const out = [];
    const start = node(a, nodeId);
    if (!start) return out;
    const queue = children(a, start.lens, start.id);
    while (queue.length) {
      const n = /** @type {WhyNode} */ (queue.shift());
      out.push(n);
      queue.push(...children(a, n.lens, n.id));
    }
    return out;
  }

  /** Antworten eines Blickwinkels. @param {Analysis} a @param {Lens} lens */
  function nodesOf(a, lens) {
    return a.nodes.filter(n => n.lens === lens);
  }

  /** Grundursachen der eingeschalteten Blickwinkel (bzw. eines Blickwinkels). @param {Analysis} a @param {Lens} [lens] */
  function roots(a, lens) {
    const on = lens ? [lens] : lenses(a);
    return a.nodes.filter(n => n.root && on.includes(n.lens));
  }

  /** Größte Tiefe eines Blickwinkels. @param {Analysis} a @param {Lens} lens */
  function depth(a, lens) {
    return nodesOf(a, lens).reduce((m, n) => Math.max(m, level(a, n)), 0);
  }

  /**
   * Standardpfad eines Blickwinkels: bis zur ersten Grundursache, sonst immer die erste nicht
   * widerlegte Antwort. `choice` legt je Antwort den gewählten Zweig fest.
   * @param {Analysis} a @param {Lens} lens @param {Record<string, string>} [choice]
   * @returns {WhyNode[]}
   */
  function mainPath(a, lens, choice = {}) {
    /** @type {WhyNode[]} */
    const path = [];
    let parentId = /** @type {string | null} */ (null);
    for (;;) {
      const kids = children(a, lens, parentId);
      if (!kids.length) break;
      const key = parentId ?? `:${lens}`;
      const chosen = kids.find(k => k.id === choice[key])
        || kids.find(k => k.root || descendants(a, k.id).some(d => d.root))
        || kids.find(k => k.state !== 'refuted')
        || kids[0];
      path.push(chosen);
      parentId = chosen.id;
    }
    return path;
  }

  // ===== Problem =====
  /** Vorschlag für die Problemaussage aus den 5W2H-Feldern. @param {Problem} p */
  function suggestStatement(p) {
    const T = Texts.problem.statementParts;
    const t = (/** @type {string} */ s) => s.trim().replace(/[.;,]+$/, '');
    const parts = [];
    const head = [t(p.what), t(p.where), t(p.when)].filter(Boolean).join(' – ');
    if (head) parts.push(head);
    const target = t(p.target);
    const actual = t(p.actual);
    if (actual && target) parts.push(Util.fill(T.actualTarget, { actual, target }));
    else if (actual) parts.push(Util.fill(T.actual, { actual }));
    else if (target) parts.push(Util.fill(T.target, { target }));
    if (t(p.impact)) parts.push(Util.fill(T.impact, { impact: t(p.impact) }));
    return parts.length ? parts.join('. ') + '.' : '';
  }

  /** Problemaussage: eigener Text, sonst Vorschlag. @param {Problem} p */
  function statement(p) {
    return p.statement.trim() || suggestStatement(p);
  }

  /** Text einer Antwort, Ursache o. Ä. – leer: „(ohne Text)“. @param {{ text: string }} x */
  function textOf(x) {
    return x.text.trim() || Texts.why.untitled;
  }

  /** Text einer Maßnahme – leer: „(Maßnahme ohne Text)“. @param {Action} x */
  function actionText(x) {
    return x.text.trim() || Texts.actions.untitled;
  }

  /** Name einer Kategorie. @param {Analysis} a @param {string} categoryId */
  function categoryName(a, categoryId) {
    const c = a.categories.find(x => x.id === categoryId);
    return c ? c.name.trim() || Texts.ishikawa.unnamedCategory : '';
  }

  return {
    SCHEMA_VERSION, LENSES, EVIDENCE, CAUSE_STATES, ACTION_KINDS, STRENGTHS, ACTION_STATUSES, PRESETS,
    PROBLEM_FIELDS, SETTINGS, COLORS, DEFAULT_SETTINGS,
    presetNames, create, normalize, emptyProblem,
    lenses, node, children, pathTo, level, label, descendants, nodesOf, roots, depth, mainPath,
    suggestStatement, statement, textOf, actionText, categoryName,
  };
})();
