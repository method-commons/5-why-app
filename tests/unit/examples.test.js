import { describe, expect, it } from 'vitest';
import { Checks } from '../../js/checks.js';
import { Examples } from '../../js/examples.js';
import { Model } from '../../js/model.js';

describe('Beispiele', () => {
  for (const lang of ['de', 'en']) {
    it(`${lang}: entspricht genau der Ausgabe von Model.normalize`, () => {
      const raw = Examples.raw[lang];
      expect(Model.normalize(raw)).toEqual(raw);
    });
  }

  it('haben in beiden Sprachen dieselbe Struktur', () => {
    const ids = l => Examples.raw[l].nodes.map(n => `${n.id}:${n.parentId}:${n.state}:${n.root}`);
    expect(ids('en')).toEqual(ids('de'));
    expect(Examples.raw.en.actions.map(a => a.rootId)).toEqual(Examples.raw.de.actions.map(a => a.rootId));
  });

  it('werden mit neuer ID angelegt und zeigen typische Stärken und Schwächen', () => {
    const a = Examples.load('de');
    const b = Examples.load('en');
    expect(a.id).not.toBe(Examples.raw.de.id);
    expect(b.name).toBe(Examples.raw.en.name);
    expect(Examples.load('xx').name).toBe(Examples.raw.de.name);
    expect(Examples.load().name).toBe(Examples.raw.de.name);
    expect(Model.roots(a)).toHaveLength(2);
    const chain = Checks.chain(a, 'occurrence');
    expect(chain.find(c => c.key === 'evidence').state).toBe('warn');
    const actions = Checks.actions(a, '2026-10-13');
    expect(actions.find(c => c.key === 'due').state).toBe('bad');
    expect(actions.find(c => c.key === 'measurable').state).toBe('warn');
  });
});
