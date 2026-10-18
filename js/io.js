/*
 * IO – Import und Export: Analyse als JSON, Sicherung aller Analysen, Bericht als Markdown.
 * Exportiert den Namensraum `IO`.
 */
import { Checks } from './checks.js';
import { Model } from './model.js';
import { Texts } from './texts.js';
import { Util } from './util.js';

export const IO = (() => {
  const BACKUP_TYPE = 'five-why-backup';

  /** Analyse als JSON-Text. @param {Analysis} a */
  function analysisJson(a) {
    return JSON.stringify(a, null, 2) + '\n';
  }

  /** Sicherung mehrerer Analysen als JSON-Text. @param {Analysis[]} list @param {Date} [date] */
  function backupJson(list, date = new Date()) {
    return JSON.stringify({ type: BACKUP_TYPE, version: Model.SCHEMA_VERSION, exportedAt: date.toISOString(), analyses: list }, null, 2) + '\n';
  }

  /**
   * JSON-Text lesen: einzelne Analyse, Sicherung oder Liste von Analysen.
   * @param {string} text @returns {Analysis[]}
   */
  function parse(text) {
    let raw;
    try { raw = JSON.parse(text); } catch (e) { throw new Error(Texts.io.invalid, { cause: e }); }
    const list = Array.isArray(raw) ? raw : raw && raw.type === BACKUP_TYPE && Array.isArray(raw.analyses) ? raw.analyses : [raw];
    if (!list.length) throw new Error(Texts.io.empty);
    return list.map(Model.normalize);
  }

  /** Inhalt ohne Zeitstempel (zum Vergleich). @param {Analysis} a */
  const content = a => JSON.stringify({ ...a, updatedAt: '' });

  /**
   * Wie wird eine importierte Analyse übernommen? Neu, schon vorhanden (identisch) oder – bei
   * abweichendem Stand – als Kopie mit neuer ID (nichts wird überschrieben).
   * @param {Analysis} a @param {Analysis | null} existing
   * @returns {{ action: 'new' | 'same' | 'copy', analysis: Analysis }}
   */
  function resolveImport(a, existing) {
    if (!existing) return { action: 'new', analysis: a };
    if (content(existing) === content(a)) return { action: 'same', analysis: existing };
    return { action: 'copy', analysis: { ...a, id: Util.uid('a'), name: `${a.name} ${Texts.io.copySuffix}` } };
  }

  /** Markdown-Zeichen in Text maskieren. @param {string} s */
  const md = s => String(s).replace(/([\\`*_[\]#|<>])/g, '\\$1');
  /** Tabellenzelle: Zeilenumbrüche entfernen. @param {string} s */
  const cell = s => md(s.replace(/\s*\n\s*/g, ' ').trim()) || '–';

  /**
   * Bericht als Markdown: Problem, Fakten, Warum-Ketten je Blickwinkel (Pfade zu den
   * Grundursachen, widerlegte Antworten auf Wunsch), Maßnahmen, Übertragen und Gelernt.
   * @param {Analysis} a @param {{ refuted?: boolean, today?: string }} [opts]
   */
  function markdown(a, opts = {}) {
    const T = Texts;
    const lines = [`# ${md(T.report.heading)}: ${md(a.name)}`, ''];
    const meta = [a.context.trim(), a.team.length ? `${T.problem.team}: ${a.team.join(', ')}` : '', `${T.report.asOf} ${Util.formatDay(opts.today || Util.today(), T.locale, 0)}`].filter(Boolean);
    lines.push(md(meta.join(' · ')), '');

    lines.push(`## ${T.report.problem}`, '', md(Model.statement(a.problem) || T.report.none), '');
    const facts = a.facts.filter(x => x.text.trim());
    if (facts.length) {
      lines.push(`## ${T.report.facts}`, '');
      facts.forEach(x => lines.push(`- ${md(x.text.trim())}`));
      lines.push('');
    }

    for (const lens of Model.lenses(a)) {
      const nodes = Model.nodesOf(a, lens);
      if (!nodes.length) continue;
      lines.push(`## ${T.lens[lens].title}`, '');
      if (lens !== 'occurrence' && a.lensQuestions[lens].trim()) lines.push(`*${md(a.lensQuestions[lens].trim())}*`, '');
      const roots = Model.roots(a);
      /** @param {string | null} parentId @param {number} depth */
      const walk = (parentId, depth) => {
        for (const n of Model.children(a, lens, parentId)) {
          if (n.state === 'refuted' && opts.refuted === false) continue;
          const tags = [
            n.root ? `**◎${roots.indexOf(n) + 1} ${T.why.rootCause}**` : '',
            n.state === 'assumed' ? `*${T.evidence.assumed}*` : '',
            n.state === 'refuted' ? `~~${T.evidence.refuted}~~` : '',
            n.category ? n.category : '',
          ].filter(Boolean).join(', ');
          const text = n.state === 'refuted' ? `~~${md(Model.textOf(n))}~~` : md(Model.textOf(n));
          lines.push(`${'  '.repeat(depth)}- ${Model.label(a, n)}: ${text}${tags ? ` (${tags})` : ''}${n.evidence.trim() ? ` – ${T.why.evidence}: ${md(n.evidence.trim())}` : ''}`);
          walk(n.id, depth + 1);
        }
      };
      walk(null, 0);
      lines.push('');
    }

    if (a.actions.length) {
      lines.push(`## ${T.report.actions}`, '');
      const cols = [T.actions.cols.kind, T.actions.cols.text, T.report.against, T.actions.cols.check];
      if (a.settings.owner) cols.push(T.actions.cols.owner);
      if (a.settings.due) cols.push(T.actions.cols.due);
      cols.push(T.actions.cols.status);
      lines.push(`| ${cols.join(' | ')} |`, `|${cols.map(() => '---').join('|')}|`);
      const roots = Model.roots(a);
      for (const x of a.actions) {
        const root = roots.find(r => r.id === x.rootId);
        const row = [T.actionKind[x.kind], cell(x.text), root ? `◎${roots.indexOf(root) + 1} ${cell(root.text)}` : x.rootId ? '–' : T.actions.symptom, cell(x.check)];
        if (a.settings.owner) row.push(cell(x.owner));
        if (a.settings.due) row.push(x.due ? Util.formatDay(x.due, T.locale, 0) : '–');
        row.push(T.actionStatus[x.status]);
        lines.push(`| ${row.join(' | ')} |`);
      }
      lines.push('');
    }

    if (a.transfer.trim() || a.lessons.trim()) {
      lines.push(`## ${T.report.learned}`, '');
      if (a.transfer.trim()) lines.push(`**${T.actions.transfer}** ${md(a.transfer.trim())}`, '');
      if (a.lessons.trim()) lines.push(`**${T.actions.lessons}** ${md(a.lessons.trim())}`, '');
    }

    lines.push(`*${T.report.state}: ${Checks.phaseLabel(a)}*`, '');
    return lines.join('\n');
  }

  return { BACKUP_TYPE, analysisJson, backupJson, parse, resolveImport, markdown };
})();
