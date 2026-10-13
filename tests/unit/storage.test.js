import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Model } from '../../js/model.js';
import { Store } from '../../js/storage.js';

/** Einfacher localStorage für Node. */
function memoryStorage() {
  const data = new Map();
  return {
    getItem: k => (data.has(k) ? data.get(k) : null),
    setItem: (k, v) => { data.set(k, String(v)); },
    removeItem: k => { data.delete(k); },
    clear: () => data.clear(),
    keys: () => [...data.keys()],
  };
}

describe('Store', () => {
  let mem;
  beforeEach(() => {
    mem = memoryStorage();
    const proxy = new Proxy(mem, { ownKeys: () => mem.keys(), getOwnPropertyDescriptor: () => ({ enumerable: true, configurable: true }) });
    vi.stubGlobal('localStorage', proxy);
  });

  it('speichert, lädt, listet und entfernt Analysen', () => {
    const a = Model.create({ name: 'Eins' });
    a.updatedAt = '2026-01-01T00:00:00.000Z';
    const b = Model.create({ name: 'Zwei' });
    b.updatedAt = '2026-02-01T00:00:00.000Z';
    expect(Store.save(a)).toBe(true);
    Store.save(b);
    expect(Store.load(a.id).name).toBe('Eins');
    expect(Store.all().map(x => x.name)).toEqual(['Zwei', 'Eins']);
    expect(Store.analysisIdOfKey(Store.PREFIX + a.id)).toBe(a.id);
    expect(Store.analysisIdOfKey('anders')).toBeNull();
    expect(Store.analysisIdOfKey(null)).toBeNull();
    Store.removeAnalysis(a.id);
    expect(Store.load(a.id)).toBeNull();
  });

  it('übergeht beschädigte Einträge', () => {
    mem.setItem(Store.PREFIX + 'kaputt', '{nicht json');
    expect(Store.load('kaputt')).toBeNull();
    expect(Store.all()).toEqual([]);
  });

  it('liest und schreibt Standardeinstellungen', () => {
    expect(Store.loadPrefs().defaults).toEqual(Model.DEFAULT_SETTINGS);
    Store.savePrefs({ defaults: { ...Model.DEFAULT_SETTINGS, owner: true } });
    expect(Store.loadPrefs().defaults.owner).toBe(true);
    mem.setItem(Store.PREFS_KEY, '{kaputt');
    expect(Store.loadPrefs().defaults.owner).toBe(false);
    mem.setItem(Store.PREFS_KEY, JSON.stringify({ defaults: { due: 'ja', system: true } }));
    expect(Store.loadPrefs().defaults).toEqual({ ...Model.DEFAULT_SETTINGS, system: true });
  });

  it('verträgt fehlenden Speicher', () => {
    const broken = new Proxy({}, { get: () => () => { throw new Error('gesperrt'); }, ownKeys: () => { throw new Error('gesperrt'); } });
    vi.stubGlobal('localStorage', broken);
    const a = Model.create();
    expect(Store.save(a)).toBe(false);
    expect(Store.load(a.id)).toBeNull();
    expect(Store.all()).toEqual([]);
    Store.removeAnalysis(a.id);
    expect(Store.loadPrefs().defaults).toEqual(Model.DEFAULT_SETTINGS);
  });
});
