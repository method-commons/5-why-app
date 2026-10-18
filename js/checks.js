/*
 * Checks – methodische Prüfungen einer Analyse (ohne DOM): Problemaussage, Warum-Kette je
 * Blickwinkel, Maßnahmen; dazu Phase, Kennzahlen und der wichtigste Hinweis für die Übersicht.
 * Wortprüfungen sind Hinweise („prüfen“), keine Urteile. Exportiert den Namensraum `Checks`.
 */
import { Model } from './model.js';
import { Texts } from './texts.js';
import { Util } from './util.js';

export const Checks = (() => {
  const T = () => Texts.checks;
  /** @param {string} text @param {Record<string, string | number>} [params] */
  const f = (text, params) => Util.fill(text, params);
  /** @param {string} key @param {CheckState} state @param {string} detail @param {string} [confirmKey] @returns {Check} */
  const check = (key, state, detail, confirmKey) => (confirmKey ? { key, state, detail, confirmKey } : { key, state, detail });

  /** Erfüllte Prüfpunkte. @param {Check[]} list */
  function score(list) {
    return { ok: list.filter(c => c.state === 'ok').length, total: list.length };
  }

  // ===== Problem =====
  /** @type {readonly (keyof Problem)[]} */
  const DESCRIBING = ['what', 'where', 'when', 'target', 'actual', 'who', 'howFound', 'impact', 'statement'];

  /** @param {Analysis} a @returns {Check[]} */
  function problem(a) {
    const p = a.problem;
    const C = T().problem;
    const filled = (/** @type {keyof Problem} */ k) => p[k].trim() !== '';
    if (!DESCRIBING.some(filled) && !a.facts.length) {
      return ['concrete', 'measurable', 'noCause', 'noSolution', 'facts'].map(k => check(k, 'open', C[/** @type {'concrete'} */ (k)].open));
    }
    /** @type {Check[]} */
    const out = [];
    const place = filled('where');
    const time = filled('when');
    out.push(check('concrete', place && time ? 'ok' : place || time ? 'warn' : 'bad', place && time ? C.concrete.ok : !place && !time ? C.concrete.bad : place ? C.concrete.noWhen : C.concrete.noWhere));

    const digit = (/** @type {string} */ s) => /\d/.test(s);
    const both = filled('target') && filled('actual');
    if (!filled('target') && !filled('actual')) out.push(check('measurable', 'bad', C.measurable.bad));
    else if (both && digit(p.target) && digit(p.actual)) out.push(check('measurable', 'ok', C.measurable.ok));
    else out.push(check('measurable', 'warn', !both ? C.measurable.missing : C.measurable.numbers));

    /** @param {readonly string[]} words */
    const scan = words => {
      for (const k of DESCRIBING) {
        const w = Util.findWord(p[k], words);
        if (w) return { word: w, field: Texts.problem.fields[k].label };
      }
      return null;
    };
    const cause = scan(Texts.words.cause);
    out.push(cause ? check('noCause', 'warn', f(C.noCause.warn, cause)) : check('noCause', 'ok', C.noCause.ok));
    const solution = scan(Texts.words.solution);
    out.push(solution ? check('noSolution', 'warn', f(C.noSolution.warn, solution)) : check('noSolution', 'ok', C.noSolution.ok));

    const facts = a.facts.filter(x => x.text.trim()).length;
    out.push(facts ? check('facts', 'ok', f(C.facts.ok, { n: facts })) : check('facts', 'warn', C.facts.warn));
    return out;
  }

  // ===== Warum-Kette =====
  /** Mindesttiefe bis zur Grundursache je Blickwinkel. @type {Record<Lens, number>} */
  const MIN_DEPTH = { occurrence: 3, detection: 2, system: 2 };

  /** @param {Analysis} a @param {Lens} lens @returns {Check[]} */
  function chain(a, lens) {
    const C = T().chain;
    const nodes = Model.nodesOf(a, lens).filter(n => n.text.trim());
    const roots = Model.roots(a, lens);
    const confirmed = (/** @type {string} */ k) => a.confirmed.includes(`${k}:${lens}`);
    if (!nodes.length) {
      return [
        check('root', 'open', C.root.open),
        check('evidence', 'open', C.evidence.open),
        check('depth', 'open', C.depth.open),
        check('blame', 'open', C.blame.open),
        check('causal', 'open', C.causal.open, `causal:${lens}`),
        check('control', 'open', C.control.open, `control:${lens}`),
      ];
    }
    /** @type {Check[]} */
    const out = [];
    out.push(roots.length ? check('root', 'ok', f(C.root.ok, { n: roots.length })) : check('root', 'open', C.root.missing));

    // Belege: auf den Pfaden zu den Grundursachen, sonst alle nicht widerlegten Antworten
    const relevant = roots.length
      ? [...new Map(roots.flatMap(r => Model.pathTo(a, r.id)).map(n => [n.id, n])).values()]
      : nodes.filter(n => n.state !== 'refuted');
    const assumed = relevant.filter(n => n.state === 'assumed');
    if (!relevant.length) out.push(check('evidence', 'open', C.evidence.open));
    else if (assumed.length) out.push(check('evidence', 'warn', f(assumed.length === 1 ? C.evidence.one : C.evidence.many, { labels: assumed.map(n => Model.label(a, n)).join(', '), n: assumed.length })));
    else out.push(check('evidence', 'ok', C.evidence.ok));

    const min = MIN_DEPTH[lens];
    if (roots.length) {
      const shallow = roots.filter(r => Model.level(a, r) < min);
      out.push(shallow.length ? check('depth', 'warn', f(C.depth.shallow, { label: Model.label(a, shallow[0]) })) : check('depth', 'ok', f(C.depth.ok, { n: Math.max(...roots.map(r => Model.level(a, r))) })));
    } else {
      const d = Model.depth(a, lens);
      out.push(d >= min ? check('depth', 'ok', f(C.depth.ok, { n: d })) : check('depth', 'open', f(C.depth.more, { n: d })));
    }

    const blameWords = [...Texts.words.blame, ...a.team.filter(t => t.trim().length > 2)];
    const blamed = nodes.map(n => ({ n, w: Util.findWord(n.text, blameWords) })).find(x => x.w);
    out.push(blamed ? check('blame', 'warn', f(C.blame.warn, { label: Model.label(a, blamed.n), word: /** @type {string} */ (blamed.w) })) : check('blame', 'ok', C.blame.ok));

    out.push(confirmed('causal') ? check('causal', 'ok', C.causal.ok, `causal:${lens}`) : check('causal', 'open', C.causal.open, `causal:${lens}`));

    const external = roots.map(r => ({ r, w: Util.findWord(r.text, Texts.words.external) })).find(x => x.w);
    if (external) out.push(check('control', 'warn', f(C.control.warn, { label: Model.label(a, external.r), word: /** @type {string} */ (external.w) }), `control:${lens}`));
    else out.push(confirmed('control') ? check('control', 'ok', C.control.ok, `control:${lens}`) : check('control', 'open', C.control.open, `control:${lens}`));
    return out;
  }

  // ===== Maßnahmen =====
  /** Maßnahmen gegen die Grundursache (Abstellen, Vorbeugen). @param {Action} x */
  const isFix = x => x.kind !== 'immediate';
  /** @param {Action} x */
  const isDone = x => x.status === 'done' || x.status === 'effective';

  /** Ist der Termin einer offenen Maßnahme überschritten (nur mit Termin-Spalte)? @param {Analysis} a @param {Action} x @param {string} [today] */
  function isOverdue(a, x, today = Util.today()) {
    return a.settings.due && !!x.due && x.due < today && !isDone(x) && x.status !== 'ineffective';
  }

  /** Offene Maßnahmen mit überschrittenem Termin. @param {Analysis} a @param {string} [today] */
  function overdue(a, today = Util.today()) {
    return a.actions.filter(x => isOverdue(a, x, today));
  }

  /** Maßnahmen, deren Grundursache es nicht (mehr) gibt. @param {Analysis} a */
  function orphans(a) {
    const roots = new Set(Model.roots(a).map(r => r.id));
    return a.actions.filter(x => x.rootId != null && !roots.has(x.rootId));
  }

  /** @param {Analysis} a @param {string} [today] @returns {Check[]} */
  function actions(a, today = Util.today()) {
    const C = T().actions;
    const roots = Model.roots(a);
    /** @type {Check[]} */
    const out = [];
    const imm = a.actions.filter(x => x.kind === 'immediate');
    if (imm.some(isDone)) out.push(check('symptom', 'ok', C.symptom.ok));
    else if (imm.length) out.push(check('symptom', 'warn', C.symptom.open));
    else out.push(check('symptom', roots.length || a.actions.length ? 'warn' : 'open', C.symptom.none));

    const fixes = a.actions.filter(isFix);
    if (!roots.length) out.push(check('covered', 'open', C.covered.noRoots));
    else {
      const uncovered = roots.filter(r => !fixes.some(x => x.rootId === r.id));
      out.push(uncovered.length
        ? check('covered', 'bad', f(C.covered.bad, { n: uncovered.length, total: roots.length }))
        : check('covered', 'ok', f(C.covered.ok, { n: roots.length })));
    }

    if (!fixes.length) out.push(check('measurable', 'open', C.measurable.open));
    else {
      const vague = fixes.filter(x => !x.check.trim());
      out.push(vague.length ? check('measurable', 'warn', f(C.measurable.warn, { text: Model.actionText(vague[0]), n: vague.length })) : check('measurable', 'ok', C.measurable.ok));
    }

    const weak = roots.filter(r => {
      const own = fixes.filter(x => x.rootId === r.id);
      return own.length > 0 && own.every(x => x.strength === 'training');
    });
    if (!fixes.length) out.push(check('strength', 'open', C.strength.open));
    else out.push(weak.length ? check('strength', 'warn', f(C.strength.warn, { text: Model.textOf(weak[0]) })) : check('strength', 'ok', C.strength.ok));

    if (a.settings.due) {
      const late = overdue(a, today);
      out.push(late.length
        ? check('due', 'bad', f(late.length === 1 ? C.due.one : C.due.many, { text: Model.actionText(late[0]), day: Util.formatDay(late[0].due, Texts.locale), n: late.length }))
        : check('due', 'ok', C.due.ok));
    }

    const failed = fixes.filter(x => x.status === 'ineffective');
    if (failed.length) out.push(check('effective', 'bad', f(C.effective.bad, { text: Model.actionText(failed[0]) })));
    else if (fixes.length && fixes.every(x => x.status === 'effective')) out.push(check('effective', 'ok', C.effective.ok));
    else out.push(check('effective', 'open', f(C.effective.open, { n: fixes.filter(x => x.status === 'effective').length, total: fixes.length })));
    return out;
  }

  // ===== Phase und Übersicht =====
  /** @type {readonly ('problem' | 'why' | 'cause' | 'actions' | 'effective')[]} */
  const PHASES = ['problem', 'why', 'cause', 'actions', 'effective'];

  /**
   * Erreichte Phase: Index der ersten nicht abgeschlossenen (5 = abgeschlossen).
   * @param {Analysis} a
   */
  function phase(a) {
    const roots = Model.roots(a);
    const fixes = a.actions.filter(isFix);
    const done = [
      Model.statement(a.problem).trim() !== '',
      Model.nodesOf(a, 'occurrence').some(n => n.text.trim()),
      roots.length > 0,
      roots.length > 0 && roots.every(r => fixes.some(x => x.rootId === r.id && isDone(x))),
      fixes.length > 0 && fixes.every(x => x.status === 'effective'),
    ];
    const i = done.indexOf(false);
    return i === -1 ? PHASES.length : i;
  }

  /** Ist die Analyse abgeschlossen (alle Phasen erledigt)? @param {Analysis} a */
  function isComplete(a) {
    return phase(a) >= PHASES.length;
  }

  /** Bezeichnung des Stands: aktuelle Phase bzw. „Abgeschlossen“. @param {Analysis} a */
  function phaseLabel(a) {
    const p = phase(a);
    return p >= PHASES.length ? Texts.phase.complete : Texts.phase[PHASES[p]];
  }

  /** Kennzahlen für Übersicht und Kopf. @param {Analysis} a @param {string} [today] */
  function stats(a, today = Util.today()) {
    const fixes = a.actions.filter(isFix);
    return {
      levels: Model.depth(a, 'occurrence'),
      nodes: Model.lenses(a).reduce((s, l) => s + Model.nodesOf(a, l).length, 0),
      roots: Model.roots(a).length,
      actions: a.actions.length,
      actionsDone: a.actions.filter(isDone).length,
      fixes: fixes.length,
      effective: fixes.filter(x => x.status === 'effective').length,
      overdue: overdue(a, today).length,
    };
  }

  /** Wichtigster Hinweis für die Übersicht (oder `null`). @param {Analysis} a @param {string} [today] */
  function topHint(a, today = Util.today()) {
    const H = T().hints;
    const late = overdue(a, today);
    if (late.length) return f(late.length === 1 ? H.overdueOne : H.overdueMany, { text: Model.actionText(late[0]), day: Util.formatDay(late[0].due, Texts.locale), n: late.length });
    const failed = a.actions.find(x => x.status === 'ineffective');
    if (failed) return f(H.ineffective, { text: Model.actionText(failed) });
    const assumed = Model.nodesOf(a, 'occurrence').filter(n => n.state === 'assumed' && n.text.trim());
    if (assumed.length && phase(a) <= 2) return f(assumed.length === 1 ? H.assumedOne : H.assumedMany, { n: assumed.length });
    const roots = Model.roots(a);
    const uncovered = roots.filter(r => !a.actions.some(x => isFix(x) && x.rootId === r.id));
    if (uncovered.length) return f(H.uncovered, { n: uncovered.length });
    return null;
  }

  return { score, problem, chain, actions, isOverdue, overdue, orphans, phase, isComplete, phaseLabel, stats, topHint, PHASES, isFix, isDone };
})();
