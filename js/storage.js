/*
 * Store – Speicherung im Browser (localStorage). Jede Analyse liegt unter einem eigenen
 * Schlüssel; dazu kommen Einstellungen der Oberfläche. Exportiert den Namensraum `Store`.
 */
import { Model } from './model.js';

/** @typedef {{ defaults: Settings }} Prefs */

export const Store = (() => {
  const PREFIX = 'five-why:analysis:';
  const PREFS_KEY = 'five-why:prefs';

  // Web Storage kann fehlen oder gesperrt sein (z. B. privates Fenster) – dann leere Werte.
  /** @param {string} key @returns {string | null} */
  function get(key) {
    try { return localStorage.getItem(key); } catch (e) { return null; }
  }
  /** @param {string} key @param {string} value */
  function set(key, value) {
    try { localStorage.setItem(key, value); return true; } catch (e) { return false; }
  }
  /** @param {string} key */
  function remove(key) {
    try { localStorage.removeItem(key); } catch (e) { /* ignorieren */ }
  }
  /** @returns {string[]} */
  function keys() {
    try { return Object.keys(localStorage); } catch (e) { return []; }
  }

  /** Analyse laden (normalisiert), `null` wenn nicht vorhanden oder beschädigt. @param {string} id @returns {Analysis | null} */
  function load(id) {
    const raw = get(PREFIX + id);
    if (!raw) return null;
    try { return Model.normalize(JSON.parse(raw)); } catch (e) { return null; }
  }

  /** Analyse speichern. @param {Analysis} a @returns {boolean} */
  function save(a) {
    return set(PREFIX + a.id, JSON.stringify(a));
  }

  /** @param {string} id */
  function removeAnalysis(id) {
    remove(PREFIX + id);
  }

  /** Alle gespeicherten Analysen, zuletzt bearbeitete zuerst. @returns {Analysis[]} */
  function all() {
    return keys().filter(k => k.startsWith(PREFIX))
      .map(k => load(k.slice(PREFIX.length)))
      .filter(/** @returns {a is Analysis} */ a => a != null)
      .sort((x, y) => y.updatedAt.localeCompare(x.updatedAt));
  }

  /** Ist der Speicherschlüssel der einer Analyse? Liefert die ID. @param {string | null} key */
  function analysisIdOfKey(key) {
    return key && key.startsWith(PREFIX) ? key.slice(PREFIX.length) : null;
  }

  /** @returns {Prefs} */
  function loadPrefs() {
    /** @type {Settings} */
    const defaults = { ...Model.DEFAULT_SETTINGS };
    try {
      const raw = JSON.parse(get(PREFS_KEY) || '{}');
      const d = raw && raw.defaults;
      if (d && typeof d === 'object') for (const k of Model.SETTINGS) if (typeof d[k] === 'boolean') defaults[k] = d[k];
    } catch (e) { /* beschädigt: Standard */ }
    return { defaults };
  }

  /** @param {Prefs} prefs */
  function savePrefs(prefs) {
    set(PREFS_KEY, JSON.stringify(prefs));
  }

  return { PREFIX, PREFS_KEY, load, save, removeAnalysis, all, analysisIdOfKey, loadPrefs, savePrefs };
})();
