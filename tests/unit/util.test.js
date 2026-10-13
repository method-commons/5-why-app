import { describe, expect, it } from 'vitest';
import { Util } from '../../js/util.js';

describe('Util', () => {
  it('erzeugt eindeutige IDs mit Präfix', () => {
    const a = Util.uid('x');
    expect(a).toMatch(/^x[a-z0-9]+$/);
    expect(Util.uid('x')).not.toBe(a);
    expect(Util.uid()).toMatch(/^[a-z0-9]+$/);
  });

  it('liefert Tag und Zeitstempel', () => {
    const d = new Date(2026, 9, 4, 12, 0, 0);
    expect(Util.today(d)).toBe('2026-10-04');
    expect(Util.now(new Date(Date.UTC(2026, 0, 1)))).toBe('2026-01-01T00:00:00.000Z');
    expect(Util.today()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(Util.now()).toMatch(/Z$/);
  });

  it('prüft ISO-Tage', () => {
    expect(Util.isDay('2026-10-04')).toBe(true);
    expect(Util.isDay('2026-02-30')).toBe(false);
    expect(Util.isDay('4.10.2026')).toBe(false);
    expect(Util.isDay(null)).toBe(false);
  });

  it('formatiert Tage kurz, mit Jahr nur bei anderem Jahr', () => {
    expect(Util.formatDay('2026-10-04', 'de-DE', 2026)).toBe('4.10.');
    expect(Util.formatDay('2025-10-04', 'de-DE', 2026)).toBe('4.10.2025');
    expect(Util.formatDay('kaputt', 'de-DE')).toBe('');
    expect(Util.formatDay('2026-10-04', 'de-DE')).toMatch(/^4\.10\./);
  });

  it('vereinheitlicht Text', () => {
    expect(Util.fold('Größe Café')).toBe('grosse cafe');
    expect(Util.fold(/** @type {any} */ (null))).toBe('');
  });

  it('findet ganze Wörter und Wortanfänge', () => {
    expect(Util.findWord('Der Mitarbeiter hat es vergessen', ['vergessen'])).toBe('vergessen');
    expect(Util.findWord('Die Mitarbeiterin fehlte', ['mitarbeiter*'])).toBe('mitarbeiter');
    expect(Util.findWord('Wochenmarkt am Domplatz', ['markt'])).toBeNull();
    expect(Util.findWord('Der Markt war voll', ['markt'])).toBe('markt');
    expect(Util.findWord('Weil es regnete', ['weil'])).toBe('weil');
    expect(Util.findWord('', ['weil'])).toBeNull();
    expect(Util.findWord('a.b', ['a.b'])).toBe('a.b');
  });

  it('bildet Dateinamen, füllt Platzhalter, Initialen', () => {
    expect(Util.fileName('Lange Wartezeit am Samstag!', 'json')).toBe('lange-wartezeit-am-samstag.json');
    expect(Util.fileName('', 'md')).toBe('analyse.md');
    expect(Util.fill('{n} von {total} – {x}', { n: 1, total: 2 })).toBe('1 von 2 – {x}');
    expect(Util.fill('ohne')).toBe('ohne');
    expect(Util.initials('Aylin Kaya')).toBe('AK');
    expect(Util.initials('Fritz')).toBe('F');
    expect(Util.initials('')).toBe('?');
  });
});
