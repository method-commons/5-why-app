/*
 * Util – kleine Hilfsfunktionen ohne DOM.
 */
export const Util = (() => {
  /** Zufällige, kurze ID. @param {string} [prefix] */
  function uid(prefix = '') {
    return prefix + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
  }

  /** Datum als ISO-Tag (YYYY-MM-DD) in lokaler Zeit. @param {Date} [d] */
  function today(d = new Date()) {
    const pad = (/** @type {number} */ n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }

  /** Zeitstempel (ISO). @param {Date} [d] */
  function now(d = new Date()) {
    return d.toISOString();
  }

  /** Ist der Text ein gültiger ISO-Tag (YYYY-MM-DD)? @param {unknown} s */
  function isDay(s) {
    if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
    const d = new Date(s + 'T00:00:00Z');
    return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
  }

  /**
   * ISO-Tag kurz anzeigen („4.10.“ bzw. „10/4“); anderes Jahr als `year` mit Jahreszahl.
   * @param {string} day @param {string} locale @param {number} [year]
   */
  function formatDay(day, locale, year = new Date().getFullYear()) {
    if (!isDay(day)) return '';
    const d = new Date(day + 'T12:00:00Z');
    /** @type {Intl.DateTimeFormatOptions} */
    const opts = { day: 'numeric', month: 'numeric', timeZone: 'UTC' };
    if (d.getUTCFullYear() !== year) opts.year = 'numeric';
    return d.toLocaleDateString(locale, opts);
  }

  /** Text vereinheitlichen für Suche und Wortprüfungen: klein, ohne Akzente. @param {string} s */
  function fold(s) {
    return String(s || '').replace(/ß/g, 'ss').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  }

  /**
   * Kommt eines der Wörter (bzw. Wortanfänge mit `*`) im Text vor? Liefert das erste Wort oder `null`.
   * @param {string} text @param {readonly string[]} words
   */
  function findWord(text, words) {
    const t = fold(text);
    if (!t) return null;
    for (const w of words) {
      const prefix = w.endsWith('*');
      const core = fold(prefix ? w.slice(0, -1) : w).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const re = new RegExp(`(^|[^\\p{L}\\p{N}])${core}${prefix ? '' : '(?![\\p{L}\\p{N}])'}`, 'u');
      if (re.test(t)) return prefix ? w.slice(0, -1) : w;
    }
    return null;
  }

  /** Dateiname aus einem Titel. @param {string} name @param {string} ext */
  function fileName(name, ext) {
    const base = fold(name).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);
    return (base || 'analyse') + '.' + ext;
  }

  /** Platzhalter `{name}` in einem Text ersetzen. @param {string} text @param {Record<string, string | number>} [params] */
  function fill(text, params = {}) {
    return String(text).replace(/\{(\w+)\}/g, (m, k) => (k in params ? String(params[k]) : m));
  }

  /** Initialen eines Namens („Aylin Kaya“ → „AK“). @param {string} name */
  function initials(name) {
    return String(name || '').trim().split(/\s+/).map(w => (w.match(/\p{L}|\d/u) || [''])[0]).join('').slice(0, 2).toUpperCase() || '?';
  }

  return { uid, today, now, isDay, formatDay, fold, findWord, fileName, fill, initials };
})();
