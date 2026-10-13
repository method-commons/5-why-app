import { describe, expect, it } from 'vitest';
import { Model } from '../../js/model.js';
import { Ops } from '../../js/ops.js';
import { sample } from './fixtures.js';

describe('Model.create', () => {
  it('legt eine leere Analyse mit Standardwerten an', () => {
    const a = Model.create({ name: '  Titel ', context: ' Werk ', color: '#123456', settings: { owner: true, foo: 1 } });
    expect(a.name).toBe('Titel');
    expect(a.context).toBe('Werk');
    expect(a.color).toBe('#123456');
    expect(a.settings).toEqual({ ...Model.DEFAULT_SETTINGS, owner: true });
    expect(a.categories.map(c => c.name)).toEqual(['Mensch', 'Maschine', 'Methode', 'Material', 'Milieu', 'Messung']);
    expect(a.preset).toBe('6m');
    const b = Model.create();
    expect(b.name).toBe('Neue Analyse');
    expect(Model.COLORS).toContain(b.color);
    expect(Model.create({ color: 'rot' }).color).toMatch(/^#/);
  });

  it('kennt die Namen der Vorlagen', () => {
    expect(Model.presetNames('4p')).toEqual(['Personal', 'Prozesse', 'Platz', 'Produkt']);
    expect(Model.presetNames('8m')).toHaveLength(8);
    expect(Model.presetNames('custom')).toEqual([]);
  });
});

describe('Model.normalize', () => {
  it('lehnt Unsinn ab', () => {
    expect(() => Model.normalize(null)).toThrow();
    expect(() => Model.normalize([])).toThrow();
    expect(() => Model.normalize('x')).toThrow();
  });

  it('ergänzt fehlende Felder', () => {
    const a = Model.normalize({ name: '', problem: { what: 5 } });
    expect(a.name).toBe('Neue Analyse');
    expect(a.problem.what).toBe('5');
    expect(a.problem.where).toBe('');
    expect(a.nodes).toEqual([]);
    expect(a.preset).toBe('custom');
    expect(a.settings).toEqual(Model.DEFAULT_SETTINGS);
    expect(a.lensQuestions).toEqual({ detection: '', system: '' });
  });

  it('bereinigt Verweise, Werte und doppelte IDs', () => {
    const raw = {
      id: 'a1', color: '#ABCDEF', team: [' Ann ', 'Ann', '', 3], confirmed: ['x', 'x', 4],
      nodes: [
        { id: 'n1', lens: 'occurrence', parentId: null, text: 'Eins', state: 'confirmed' },
        { id: 'n2', lens: 'detection', parentId: 'n1', text: 'Falscher Blickwinkel', state: 'wer' },
        { id: 'n3', lens: 'occurrence', parentId: 'n4', text: 'Kreis A' },
        { id: 'n4', lens: 'occurrence', parentId: 'n3', text: 'Kreis B' },
        { id: 'n1', lens: 'quatsch', parentId: 'fehlt', text: 'Doppelt', root: true, state: 'refuted' },
        'kein Objekt',
      ],
      categories: [{ id: 'c1', name: 'Mensch' }],
      causes: [
        { id: 'k1', categoryId: 'c1', anchorId: 'n1', nodeId: 'n1', state: 'confirmed', text: 'A' },
        { id: 'k2', categoryId: 'c1', anchorId: 'n2', nodeId: 'weg', state: '??' },
        { id: 'k3', categoryId: 'fehlt' },
      ],
      actions: [
        { id: 'm1', rootId: 'n1', kind: 'preventive', strength: 'training', due: '2026-10-10', checkDate: '31.12.', status: 'done' },
        { id: 'm2', rootId: 'weg', kind: '??', strength: 'stark', due: 'morgen', status: '??' },
      ],
    };
    const a = Model.normalize(raw);
    expect(a.color).toBe('#abcdef');
    expect(a.team).toEqual(['Ann', '3']);
    expect(a.confirmed).toEqual(['x']);
    expect(a.nodes).toHaveLength(5);
    expect(a.nodes[1].parentId).toBeNull();
    expect(a.nodes[1].state).toBe('assumed');
    // Kreis aufgelöst: einer der beiden hängt oben
    expect([a.nodes[2].parentId, a.nodes[3].parentId]).toContain(null);
    expect(a.nodes[4].id).not.toBe('n1');
    expect(a.nodes[4].lens).toBe('occurrence');
    expect(a.nodes[4].root).toBe(false);
    expect(a.causes).toHaveLength(2);
    expect(a.causes[1].anchorId).toBeNull();
    expect(a.causes[1].nodeId).toBeNull();
    expect(a.causes[1].state).toBe('open');
    expect(a.actions[0]).toMatchObject({ rootId: 'n1', kind: 'preventive', strength: 'training', due: '2026-10-10', checkDate: '', status: 'done' });
    expect(a.actions[1]).toMatchObject({ rootId: null, kind: 'corrective', strength: null, due: '', status: 'open' });
  });
});

describe('Warum-Baum', () => {
  it('liefert Kinder, Pfad, Ebene, Kurzzeichen und Nachfahren', () => {
    const { a, w1, w2, x2, w3 } = sample();
    expect(Model.children(a, 'occurrence', w1.id).map(n => n.id)).toEqual([w2.id, x2.id]);
    expect(Model.pathTo(a, w3.id).map(n => n.text)).toEqual(['Eins', 'Zwei', 'Drei']);
    expect(Model.pathTo(a, 'fehlt')).toEqual([]);
    expect(Model.level(a, w3)).toBe(3);
    expect(Model.label(a, w2)).toBe('W2');
    expect(Model.descendants(a, w1.id)).toHaveLength(3);
    expect(Model.descendants(a, 'fehlt')).toEqual([]);
    expect(Model.depth(a, 'occurrence')).toBe(3);
    expect(Model.depth(a, 'system')).toBe(0);
    expect(Model.node(a, null)).toBeUndefined();
  });

  it('zählt Grundursachen nur in eingeschalteten Blickwinkeln', () => {
    const { a } = sample();
    const d = Ops.addNode(a, { lens: 'detection', parentId: null, text: 'Nicht gesehen' });
    Ops.setRoot(a, d.id, true);
    expect(Model.lenses(a)).toEqual(['occurrence']);
    expect(Model.roots(a)).toHaveLength(1);
    a.settings.detection = true;
    expect(Model.lenses(a)).toEqual(['occurrence', 'detection']);
    expect(Model.roots(a)).toHaveLength(2);
    expect(Model.roots(a, 'detection')).toHaveLength(1);
  });

  it('wählt den Standardpfad zur Grundursache und folgt gewählten Zweigen', () => {
    const { a, w1, x2, w3 } = sample();
    expect(Model.mainPath(a, 'occurrence').map(n => n.id).at(-1)).toBe(w3.id);
    expect(Model.mainPath(a, 'occurrence', { [w1.id]: x2.id }).map(n => n.text)).toEqual(['Eins', 'Falsch']);
    // Ohne Grundursache: erste nicht widerlegte Antwort
    const b = Model.create();
    const r = Ops.addNode(b, { lens: 'occurrence', parentId: null, text: 'R', state: 'refuted' });
    const ok = Ops.addNode(b, { lens: 'occurrence', parentId: null, text: 'Ok' });
    expect(Model.mainPath(b, 'occurrence')[0].id).toBe(ok.id);
    Ops.setState(b, ok.id, 'refuted');
    expect(Model.mainPath(b, 'occurrence')[0].id).toBe(r.id);
    expect(Model.mainPath(b, 'system')).toEqual([]);
  });
});

describe('Problemaussage', () => {
  it('schlägt einen Satz aus den Feldern vor', () => {
    const p = Model.emptyProblem();
    expect(Model.suggestStatement(p)).toBe('');
    Object.assign(p, { what: 'Lange Wartezeit.', where: 'Domplatz', when: 'Sa', target: '10 Min', actual: '40 Min', impact: '12 Gäste weg' });
    expect(Model.suggestStatement(p)).toBe('Lange Wartezeit – Domplatz – Sa. Ist: 40 Min (Soll: 10 Min). Auswirkung: 12 Gäste weg.');
    expect(Model.suggestStatement({ ...p, target: '' })).toContain('Ist: 40 Min.');
    expect(Model.suggestStatement({ ...p, actual: '' })).toContain('Soll: 10 Min.');
    expect(Model.statement(p)).toBe(Model.suggestStatement(p));
    expect(Model.statement({ ...p, statement: ' Eigener Satz ' })).toBe('Eigener Satz');
  });

  it('benennt Kategorien', () => {
    const a = Model.create();
    a.categories[0].name = '';
    expect(Model.categoryName(a, a.categories[0].id)).toBe('(Kategorie)');
    expect(Model.categoryName(a, a.categories[1].id)).toBe('Maschine');
    expect(Model.categoryName(a, 'fehlt')).toBe('');
  });
});
