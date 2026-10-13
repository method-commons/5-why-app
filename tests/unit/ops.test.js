import { describe, expect, it } from 'vitest';
import { Model } from '../../js/model.js';
import { Ops } from '../../js/ops.js';
import { sample } from './fixtures.js';

describe('Ops: Problem', () => {
  it('verwaltet Fakten und Team', () => {
    const a = Model.create();
    const f = Ops.addFact(a, 'Kassenlog');
    Ops.addFact(a);
    expect(a.facts.map(x => x.text)).toEqual(['Kassenlog', '']);
    Ops.removeFact(a, f.id);
    expect(a.facts).toHaveLength(1);
    expect(Ops.addTeam(a, ' Ann ')).toBe(true);
    expect(Ops.addTeam(a, 'ann')).toBe(false);
    expect(Ops.addTeam(a, '  ')).toBe(false);
    expect(a.team).toEqual(['Ann']);
    Ops.removeTeam(a, 'Ann');
    expect(a.team).toEqual([]);
    const before = a.updatedAt;
    a.updatedAt = '2000-01-01T00:00:00.000Z';
    Ops.touch(a);
    expect(a.updatedAt > '2000').toBe(true);
    expect(before).toBeTruthy();
  });
});

describe('Ops: Warum-Baum', () => {
  it('fügt Antworten hinter Geschwistern ein und hebt die Grundursache des Elternknotens auf', () => {
    const { a, w1, w2, x2, w3 } = sample();
    const extra = Ops.addNode(a, { lens: 'occurrence', parentId: w1.id, text: 'Dritte' });
    expect(Model.children(a, 'occurrence', w1.id).map(n => n.id)).toEqual([w2.id, x2.id, extra.id]);
    const below = Ops.addNode(a, { lens: 'system', parentId: w3.id });
    expect(below.lens).toBe('occurrence');
    expect(w3.root).toBe(false);
    const top = Ops.addNode(a, { lens: 'detection', parentId: null });
    expect(top).toMatchObject({ lens: 'detection', parentId: null, state: 'assumed', root: false });
  });

  it('löscht Antworten samt Unterbaum und löst Verweise', () => {
    const { a, w1, w2, w3 } = sample();
    const c = Ops.addCause(a, { anchorId: w2.id, categoryId: a.categories[0].id, text: 'An W2' });
    const k = Ops.addCause(a, { anchorId: null, categoryId: a.categories[0].id, text: 'Verknüpft' });
    k.nodeId = w3.id;
    const m = Ops.addAction(a, { rootId: w3.id });
    expect(Ops.removeNode(a, w2.id)).toBe(2);
    expect(Model.node(a, w3.id)).toBeUndefined();
    expect(a.causes.find(x => x.id === c.id)).toBeUndefined();
    expect(k.nodeId).toBeNull();
    expect(m.rootId).toBeNull();
    expect(Ops.removeNode(a, 'fehlt')).toBe(0);
    expect(Model.node(a, w1.id)).toBeDefined();
  });

  it('setzt Status und Grundursache; widerlegt ist nie Grundursache', () => {
    const { a, w2, w3 } = sample();
    const k = Ops.addCause(a, { anchorId: null, categoryId: a.categories[0].id });
    k.nodeId = w3.id;
    Ops.setState(a, w3.id, 'refuted');
    expect(w3.root).toBe(false);
    expect(k.state).toBe('excluded');
    Ops.setRoot(a, w3.id, true);
    expect(w3.root).toBe(false);
    Ops.setState(a, w3.id, 'confirmed');
    expect(k.state).toBe('confirmed');
    Ops.setState(a, w3.id, 'assumed');
    expect(k.state).toBe('open');
    Ops.setRoot(a, w2.id, true);
    expect(w2.root).toBe(true);
    Ops.setRoot(a, 'fehlt', true);
    Ops.setState(a, 'fehlt', 'confirmed');
    Ops.setState(a, w2.id, 'confirmed');
  });

  it('verschiebt Zweige unter Geschwistern', () => {
    const { a, w1, w2, x2 } = sample();
    expect(Ops.moveNode(a, x2.id, -1)).toBe(true);
    expect(Model.children(a, 'occurrence', w1.id)[0].id).toBe(x2.id);
    expect(Ops.moveNode(a, x2.id, -1)).toBe(false);
    expect(Ops.moveNode(a, w2.id, 1)).toBe(false);
    expect(Ops.moveNode(a, 'fehlt', 1)).toBe(false);
  });

  it('schaltet Bestätigungen um', () => {
    const a = Model.create();
    Ops.toggleConfirm(a, 'causal:occurrence');
    expect(a.confirmed).toEqual(['causal:occurrence']);
    Ops.toggleConfirm(a, 'causal:occurrence');
    expect(a.confirmed).toEqual([]);
  });
});

describe('Ops: Ishikawa', () => {
  it('verwaltet Kategorien und Vorlagen', () => {
    const a = Model.create();
    const c = Ops.addCategory(a, 'Extra');
    expect(a.preset).toBe('custom');
    Ops.addCause(a, { anchorId: null, categoryId: c.id, text: 'X' });
    expect(Ops.causesLostByPreset(a, '6m')).toBe(1);
    expect(Ops.causesLostByPreset(a, '8m')).toBe(0);
    expect(Ops.causesLostByPreset(a, 'custom')).toBe(0);
    Ops.applyPreset(a, '4p');
    expect(a.categories.map(x => x.name)).toEqual(['Personal', 'Prozesse', 'Platz', 'Produkt']);
    expect(a.causes).toHaveLength(0);
    Ops.applyPreset(a, '8m');
    expect(a.categories).toHaveLength(8);
    Ops.applyPreset(a, 'custom');
    expect(a.categories).toHaveLength(8);
    expect(a.preset).toBe('custom');
    Ops.addCause(a, { anchorId: null, categoryId: a.categories[0].id });
    Ops.removeCategory(a, a.categories[0].id);
    expect(a.categories).toHaveLength(7);
    expect(a.causes).toHaveLength(0);
    expect(Ops.addCategory(a).name).toBe('');
  });

  it('übernimmt Ursachen als Zweig und überträgt den Status', () => {
    const { a, w1 } = sample();
    const cat = a.categories[1];
    const k = Ops.addCause(a, { anchorId: w1.id, categoryId: cat.id, text: 'Fritteuse' });
    Ops.setCauseState(a, k.id, 'confirmed');
    const n = Ops.causeToNode(a, k.id);
    expect(n).toMatchObject({ parentId: w1.id, text: 'Fritteuse', state: 'confirmed', category: 'Maschine' });
    expect(k.nodeId).toBe(n.id);
    expect(Ops.causeToNode(a, k.id)).toBe(n);
    n.root = true;
    Ops.setCauseState(a, k.id, 'excluded');
    expect(n.state).toBe('refuted');
    expect(n.root).toBe(false);
    Ops.setCauseState(a, k.id, 'open');
    expect(n.state).toBe('assumed');
    Ops.setCauseState(a, k.id, 'confirmed');
    expect(n.state).toBe('confirmed');
    expect(Ops.causeToNode(a, 'fehlt')).toBeNull();
    Ops.setCauseState(a, 'fehlt', 'open');
    const x = Ops.addCause(a, { anchorId: null, categoryId: cat.id });
    Ops.setCauseState(a, x.id, 'excluded');
    expect(Ops.causeToNode(a, x.id).state).toBe('refuted');
    const o = Ops.addCause(a, { anchorId: null, categoryId: cat.id });
    expect(Ops.causeToNode(a, o.id).state).toBe('assumed');
    Ops.setCauseState(a, x.id, 'open');
    Ops.removeCause(a, x.id);
    expect(a.causes.find(c => c.id === x.id)).toBeUndefined();
  });
});

describe('Ops: Maßnahmen und Einstellungen', () => {
  it('legt Maßnahmen an und entfernt sie', () => {
    const { a, w3 } = sample();
    expect(Ops.addAction(a, { rootId: null }).kind).toBe('immediate');
    const m = Ops.addAction(a, { rootId: w3.id, text: 'Plan' });
    expect(m).toMatchObject({ kind: 'corrective', status: 'open', strength: null, owner: '', due: '' });
    expect(Ops.addAction(a, { rootId: w3.id, kind: 'preventive' }).kind).toBe('preventive');
    expect(Ops.action(a, m.id)).toBe(m);
    Ops.removeAction(a, m.id);
    expect(Ops.action(a, m.id)).toBeUndefined();
    Ops.setSetting(a, 'due', true);
    expect(a.settings.due).toBe(true);
  });

  it('dupliziert mit neuen IDs und gültigen Verweisen', () => {
    const { a, w1, w3 } = sample();
    const k = Ops.addCause(a, { anchorId: w1.id, categoryId: a.categories[0].id });
    Ops.causeToNode(a, k.id);
    Ops.addCause(a, { anchorId: null, categoryId: a.categories[0].id });
    Ops.addAction(a, { rootId: w3.id });
    Ops.addAction(a, { rootId: null });
    Ops.addFact(a, 'F');
    const c = Ops.duplicate(a, '(Kopie)');
    expect(c.id).not.toBe(a.id);
    expect(c.name).toBe('Test (Kopie)');
    const ids = new Set(a.nodes.map(n => n.id));
    expect(c.nodes.some(n => ids.has(n.id))).toBe(false);
    expect(Model.normalize(JSON.parse(JSON.stringify(c)))).toEqual(c);
    expect(Model.roots(c)).toHaveLength(1);
    expect(c.actions[0].rootId).toBe(Model.roots(c)[0].id);
    expect(c.causes[0].nodeId).toBeTruthy();
  });
});
