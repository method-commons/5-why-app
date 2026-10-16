import { describe, expect, it } from 'vitest';
import { Examples } from '../../js/examples.js';
import { IO } from '../../js/io.js';
import { Model } from '../../js/model.js';
import { Ops } from '../../js/ops.js';

describe('IO: JSON', () => {
  it('exportiert und liest eine Analyse, eine Sicherung und eine Liste', () => {
    const a = Examples.load('de');
    const one = IO.parse(IO.analysisJson(a));
    expect(one).toEqual([a]);
    const backup = IO.backupJson([a, Model.create()], new Date(Date.UTC(2026, 9, 13)));
    expect(JSON.parse(backup)).toMatchObject({ type: IO.BACKUP_TYPE, version: 1, exportedAt: '2026-10-13T00:00:00.000Z' });
    expect(IO.parse(backup)).toHaveLength(2);
    expect(IO.parse(JSON.stringify([a]))).toHaveLength(1);
  });

  it('meldet ungültige und leere Dateien', () => {
    expect(() => IO.parse('{kaputt')).toThrow('keine gültige Analyse');
    expect(() => IO.parse('[]')).toThrow('keine Analysen');
    expect(() => IO.parse('42')).toThrow('keine gültige Analyse');
  });

  it('übernimmt neu, überspringt Gleiches, kopiert Abweichendes', () => {
    const a = Model.create({ name: 'A' });
    expect(IO.resolveImport(a, null).action).toBe('new');
    expect(IO.resolveImport({ ...a, updatedAt: 'später' }, a).action).toBe('same');
    const r = IO.resolveImport({ ...a, name: 'B' }, a);
    expect(r.action).toBe('copy');
    expect(r.analysis.id).not.toBe(a.id);
    expect(r.analysis.name).toBe('B (Import)');
  });
});

describe('IO: Markdown', () => {
  it('fasst die Beispielanalyse zusammen', () => {
    const a = Examples.load('de');
    const md = IO.markdown(a, { today: '2026-10-13' });
    expect(md).toContain('# 5-Warum-Analyse: Lange Wartezeit am Samstag');
    expect(md).toContain('Team: Fritz, Aylin, Jonas · Stand 13.10.2026');
    expect(md).toContain('## Problem');
    expect(md).toContain('## Fakten');
    expect(md).toContain('## Warum aufgetreten?');
    expect(md).toContain('## Warum nicht entdeckt?');
    expect(md).toContain('*Warum fiel der zugesetzte Filter nicht vorher auf?*');
    expect(md).toMatch(/ {8}- W5: Die Filterreinigung .* \(\*\*◎1 Grundursache\*\*\)/);
    expect(md).toContain('- W3: Beim Öffnen des Trucks gibt es keine Prüfliste. (**◎2 Grundursache**)');
    expect(md).toContain('~~widerlegt~~');
    expect(md).toContain('| Art | Maßnahme | gegen | Wirksamkeit prüfen | Wer | Bis | Status |');
    expect(md).toContain('| Sofort | Filter gereinigt, Fritteuse 2 wieder in Betrieb | Symptom |');
    expect(md).toContain('**Übertragen**');
    expect(md).toContain('*Stand der Analyse: Wirksamkeit*');
    const short = IO.markdown(a, { refuted: false });
    expect(short).not.toContain('~~widerlegt~~');
  });

  it('kommt mit einer leeren Analyse zurecht und maskiert Markdown', () => {
    const a = Model.create({ name: 'Test *fett*' });
    let md = IO.markdown(a);
    expect(md).toContain('# 5-Warum-Analyse: Test \\*fett\\*');
    expect(md).toContain('(noch nicht beschrieben)');
    expect(md).not.toContain('## Maßnahmen');
    expect(md).toContain('*Stand der Analyse: Problem*');
    const n = Ops.addNode(a, { lens: 'occurrence', parentId: null, text: '' });
    Ops.addAction(a, { rootId: n.id, text: 'A\nB' });
    a.lessons = 'Gelernt';
    md = IO.markdown(a);
    expect(md).toContain('W1: (ohne Text) (*vermutet*)');
    expect(md).toContain('| Abstellen | A B | – |');
    expect(md).toContain('**Gelernt** Gelernt');
    expect(md).not.toContain('| Wer |');
  });

  it('nennt den Abschluss', () => {
    const a = Model.create();
    a.problem.what = 'P';
    const n = Ops.addNode(a, { lens: 'occurrence', parentId: null, text: 'U', state: 'confirmed' });
    Ops.setRoot(a, n.id, true);
    const m = Ops.addAction(a, { rootId: n.id, text: 'M' });
    m.status = 'effective';
    m.check = 'ok';
    expect(IO.markdown(a)).toContain('| Abstellen | M | ◎1 U | ok | wirksam |');
    expect(IO.markdown(a)).toContain('*Stand der Analyse: Abgeschlossen*');
  });
});
