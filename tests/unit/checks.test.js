import { describe, expect, it } from 'vitest';
import { Checks } from '../../js/checks.js';
import { Model } from '../../js/model.js';
import { Ops } from '../../js/ops.js';
import { sample } from './fixtures.js';

/** Zustand eines Prüfpunkts. */
const state = (list, key) => list.find(c => c.key === key)?.state;
const detail = (list, key) => list.find(c => c.key === key)?.detail;

describe('Checks.problem', () => {
  it('ist für eine leere Beschreibung offen', () => {
    const list = Checks.problem(Model.create());
    expect(list.every(c => c.state === 'open')).toBe(true);
    expect(Checks.score(list)).toEqual({ ok: 0, total: 5 });
  });

  it('prüft konkret, messbar, ohne Ursache, ohne Lösung und Belege', () => {
    const a = Model.create();
    a.problem.what = 'Lange Wartezeit';
    let list = Checks.problem(a);
    expect(state(list, 'concrete')).toBe('bad');
    expect(state(list, 'measurable')).toBe('bad');
    expect(state(list, 'noCause')).toBe('ok');
    expect(state(list, 'facts')).toBe('warn');
    a.problem.where = 'Domplatz';
    expect(detail(Checks.problem(a), 'concrete')).toBe('Wann ist es passiert?');
    a.problem.where = '';
    a.problem.when = 'Samstag';
    expect(detail(Checks.problem(a), 'concrete')).toBe('Wo ist es passiert?');
    a.problem.where = 'Domplatz';
    a.problem.target = 'kurz';
    expect(detail(Checks.problem(a), 'measurable')).toBe('Soll und Ist angeben');
    a.problem.actual = 'lang';
    expect(detail(Checks.problem(a), 'measurable')).toBe('Soll und Ist möglichst mit Zahlen');
    a.problem.target = '10 Min';
    a.problem.actual = '40 Min';
    a.problem.howFound = 'Weil die Fritteuse kaputt war';
    a.problem.impact = 'Wir müssen schneller werden';
    Ops.addFact(a, 'Kassenlog');
    list = Checks.problem(a);
    expect(state(list, 'concrete')).toBe('ok');
    expect(state(list, 'measurable')).toBe('ok');
    expect(detail(list, 'noCause')).toBe('„weil“ in „Wie entdeckt?“');
    expect(detail(list, 'noSolution')).toBe('„müssen“ in „Auswirkung“');
    expect(state(list, 'facts')).toBe('ok');
  });
});

describe('Checks.chain', () => {
  it('ist ohne Antworten offen', () => {
    const list = Checks.chain(Model.create(), 'occurrence');
    expect(list.map(c => c.state)).toEqual(['open', 'open', 'open', 'open', 'open', 'open']);
    expect(list.find(c => c.key === 'causal').confirmKey).toBe('causal:occurrence');
  });

  it('bewertet eine belegte, tiefe Kette', () => {
    const { a } = sample();
    let list = Checks.chain(a, 'occurrence');
    expect(state(list, 'root')).toBe('ok');
    expect(state(list, 'evidence')).toBe('ok');
    expect(state(list, 'depth')).toBe('ok');
    expect(state(list, 'blame')).toBe('ok');
    expect(state(list, 'causal')).toBe('open');
    expect(state(list, 'control')).toBe('open');
    Ops.toggleConfirm(a, 'causal:occurrence');
    Ops.toggleConfirm(a, 'control:occurrence');
    list = Checks.chain(a, 'occurrence');
    expect(Checks.score(list)).toEqual({ ok: 6, total: 6 });
  });

  it('meldet Vermutungen, flache Ketten, Schuldzuweisung und äußere Ursachen', () => {
    const { a, w2, w3 } = sample();
    Ops.setState(a, w2.id, 'assumed');
    let list = Checks.chain(a, 'occurrence');
    expect(detail(list, 'evidence')).toContain('W2 ist nur vermutet');
    Ops.setState(a, w3.id, 'assumed');
    expect(detail(Checks.chain(a, 'occurrence'), 'evidence')).toContain('W2, W3 sind nur vermutet');
    Ops.setRoot(a, w3.id, false);
    Ops.setRoot(a, w2.id, true);
    list = Checks.chain(a, 'occurrence');
    expect(detail(list, 'depth')).toContain('W2');
    w2.text = 'Der Mitarbeiter hat es vergessen';
    expect(detail(Checks.chain(a, 'occurrence'), 'blame')).toContain('„mitarbeiter“');
    w2.text = 'Wegen des Wetters';
    w2.text = 'Das Wetter war schlecht';
    list = Checks.chain(a, 'occurrence');
    expect(state(list, 'control')).toBe('warn');
    a.team = ['Fritz'];
    w2.text = 'Fritz hat geschlafen';
    expect(state(Checks.chain(a, 'occurrence'), 'blame')).toBe('warn');
  });

  it('ohne Grundursache: Tiefe und Belege aller Antworten', () => {
    const a = Model.create();
    const n = Ops.addNode(a, { lens: 'detection', parentId: null, text: 'A' });
    let list = Checks.chain(a, 'detection');
    expect(state(list, 'root')).toBe('open');
    expect(state(list, 'depth')).toBe('open');
    expect(state(list, 'evidence')).toBe('warn');
    Ops.addNode(a, { lens: 'detection', parentId: n.id, text: 'B', state: 'confirmed' });
    Ops.setState(a, n.id, 'confirmed');
    list = Checks.chain(a, 'detection');
    expect(state(list, 'depth')).toBe('ok');
    expect(state(list, 'evidence')).toBe('ok');
    Ops.setState(a, n.id, 'refuted');
    a.nodes = a.nodes.filter(x => x.id === n.id);
    expect(state(Checks.chain(a, 'detection'), 'evidence')).toBe('open');
  });
});

describe('Checks.actions', () => {
  it('ist ohne Grundursachen und Maßnahmen offen', () => {
    const list = Checks.actions(Model.create(), '2026-10-13');
    expect(list.map(c => c.state)).toEqual(['open', 'open', 'open', 'open', 'open']);
  });

  it('prüft Symptom, Abdeckung, Prüfkriterien, Stärke, Termine und Wirksamkeit', () => {
    const { a, w3 } = sample();
    a.settings.due = true;
    let list = Checks.actions(a, '2026-10-13');
    expect(state(list, 'symptom')).toBe('warn');
    expect(state(list, 'covered')).toBe('bad');
    expect(state(list, 'due')).toBe('ok');
    const imm = Ops.addAction(a, { rootId: null, text: 'Reinigen' });
    expect(detail(Checks.actions(a), 'symptom')).toBe('Sofortmaßnahme noch offen');
    imm.status = 'done';
    const fix = Ops.addAction(a, { rootId: w3.id, text: 'Schulen' });
    fix.strength = 'training';
    fix.due = '2026-10-10';
    list = Checks.actions(a, '2026-10-13');
    expect(state(list, 'symptom')).toBe('ok');
    expect(state(list, 'covered')).toBe('ok');
    expect(state(list, 'measurable')).toBe('warn');
    expect(state(list, 'strength')).toBe('warn');
    expect(detail(list, 'due')).toContain('„Schulen“ war bis 10.10.');
    expect(Checks.overdue(a, '2026-10-13')).toHaveLength(1);
    const fix2 = Ops.addAction(a, { rootId: w3.id });
    fix2.due = '2026-10-01';
    expect(detail(Checks.actions(a, '2026-10-13'), 'due')).toContain('2 Maßnahmen überfällig');
    Ops.removeAction(a, fix2.id);
    fix.check = 'Keine Ausfälle';
    fix.strength = 'organisational';
    fix.status = 'ineffective';
    list = Checks.actions(a, '2026-10-13');
    expect(state(list, 'measurable')).toBe('ok');
    expect(state(list, 'strength')).toBe('ok');
    expect(state(list, 'due')).toBe('ok');
    expect(state(list, 'effective')).toBe('bad');
    fix.status = 'effective';
    expect(state(Checks.actions(a, '2026-10-13'), 'effective')).toBe('ok');
    a.settings.due = false;
    expect(Checks.actions(a).find(c => c.key === 'due')).toBeUndefined();
    expect(Checks.overdue(a)).toEqual([]);
  });

  it('findet Maßnahmen ohne Grundursache', () => {
    const { a, w3 } = sample();
    const m = Ops.addAction(a, { rootId: w3.id });
    expect(Checks.orphans(a)).toEqual([]);
    Ops.setRoot(a, w3.id, false);
    expect(Checks.orphans(a)).toEqual([m]);
  });
});

describe('Phase, Kennzahlen, Hinweis', () => {
  it('durchläuft die Phasen', () => {
    const a = Model.create();
    expect(Checks.phase(a)).toBe(0);
    a.problem.what = 'Problem';
    expect(Checks.phase(a)).toBe(1);
    const n = Ops.addNode(a, { lens: 'occurrence', parentId: null, text: 'Ursache', state: 'confirmed' });
    expect(Checks.phase(a)).toBe(2);
    Ops.setRoot(a, n.id, true);
    expect(Checks.phase(a)).toBe(3);
    const m = Ops.addAction(a, { rootId: n.id, text: 'Plan' });
    m.status = 'done';
    expect(Checks.phase(a)).toBe(4);
    m.status = 'effective';
    expect(Checks.phase(a)).toBe(5);
  });

  it('liefert Kennzahlen und den wichtigsten Hinweis', () => {
    const { a, w2, w3 } = sample();
    expect(Checks.stats(a)).toMatchObject({ levels: 3, nodes: 4, roots: 1, actions: 0, overdue: 0 });
    expect(Checks.topHint(a)).toBe('1 Grundursache(n) noch ohne Maßnahme');
    a.problem.what = 'P';
    Ops.setRoot(a, w3.id, false);
    Ops.setState(a, w2.id, 'assumed');
    expect(Checks.topHint(a)).toBe('1 Antwort nur vermutet – erst belegen, dann weiterfragen');
    Ops.setState(a, w3.id, 'assumed');
    expect(Checks.topHint(a)).toContain('2 Antworten');
    const m = Ops.addAction(a, { rootId: null, text: 'Weg' });
    m.status = 'ineffective';
    expect(Checks.topHint(a)).toContain('wirkt nicht');
    a.settings.due = true;
    const late = Ops.addAction(a, { rootId: null, text: 'Spät' });
    late.due = '2026-01-01';
    expect(Checks.topHint(a, '2026-10-13')).toContain('1 Maßnahme überfällig („Spät“, bis 1.1.');
    Ops.addAction(a, { rootId: null }).due = '2026-01-02';
    expect(Checks.topHint(a, '2026-10-13')).toBe('2 Maßnahmen überfällig');
    expect(Checks.topHint(Model.create())).toBeNull();
  });
});
