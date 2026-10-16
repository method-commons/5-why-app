/*
 * Schritt 4 – Bericht auf einer Seite (A3-ähnlich): Problem, Fakten, Warum-Ketten je Blickwinkel,
 * Maßnahmen, Übertragen & Gelernt. Drucken/PDF über den Browser, Markdown kopieren oder laden.
 */
import { useState } from 'preact/hooks';
import { Checks } from '../checks.js';
import { IO } from '../io.js';
import { Model } from '../model.js';
import { Texts } from '../texts.js';
import { Util } from '../util.js';
import { download } from './components.jsx';
import { toast, useAnalysis } from './core.js';

/**
 * Zweige eines Blickwinkels als verschachtelte Liste; Grundursachen tragen ihre Nummer (◎1 …)
 * wie in der Maßnahmen-Tabelle.
 * @param {{ a: Analysis, lens: Lens, parentId: string | null, refuted: boolean, roots: WhyNode[] }} props
 */
function Branch({ a, lens, parentId, refuted, roots }) {
  const kids = Model.children(a, lens, parentId).filter(n => refuted || n.state !== 'refuted');
  if (!kids.length) return null;
  return (
    <ol class={parentId ? 'sub-branch' : ''}>
      {kids.map(n => (
        <li key={n.id} class={`rp-${n.state}${n.root ? ' rp-root' : ''}`}>
          {n.root && roots.includes(n) && <b class="rp-ref">◎{roots.indexOf(n) + 1} </b>}
          <span class="rp-text">{n.text.trim() || Texts.why.untitled}</span>
          {n.state === 'assumed' && <span class="rp-tag warn"> ({Texts.evidence.assumed})</span>}
          {n.state === 'refuted' && <span class="rp-tag"> ({Texts.evidence.refuted})</span>}
          <Branch a={a} lens={lens} parentId={n.id} refuted={refuted} roots={roots} />
        </li>
      ))}
    </ol>
  );
}

export function Report() {
  const a = useAnalysis();
  const R = Texts.report;
  const [refuted, setRefuted] = useState(true);
  const phase = Checks.phase(a);
  const roots = Model.roots(a);
  const lenses = Model.lenses(a);
  const facts = a.facts.filter(f => f.text.trim());
  const md = () => IO.markdown(a, { refuted });
  const copy = async () => {
    try { await navigator.clipboard.writeText(md()); toast(R.copied); } catch (e) { toast(R.copyFailed); }
  };
  const meta = [a.context.trim(), a.team.length ? `${Texts.problem.team}: ${a.team.join(', ')}` : '', `${R.asOf} ${Util.formatDay(Util.today(), Texts.locale, 0)}`].filter(Boolean).join(' · ');
  const statusText = phase >= Checks.PHASES.length ? Texts.phase.complete : Texts.phase[Checks.PHASES[phase]];
  return (
    <div class="page report-page">
      <div class="toolbar no-print">
        <label class="check-inline"><input type="checkbox" id="showRefuted" checked={refuted} onChange={e => setRefuted(/** @type {HTMLInputElement} */ (e.currentTarget).checked)} />{R.showRefuted}</label>
        <span class="spacer" />
        <button type="button" class="btn" id="copyMd" onClick={copy}>{R.copy}</button>
        <button type="button" class="btn" id="downloadMd" onClick={() => download(md(), Util.fileName(a.name, 'md'), 'text/markdown')}>{R.download}</button>
        <button type="button" class="btn primary" id="printBtn" onClick={() => window.print()}>{R.print}</button>
      </div>
      <article class="paper" id="report">
        <div class="paper-head">
          <div>
            <h1>{R.heading}: {a.name}</h1>
            <div class="sub small">{meta}</div>
          </div>
          <span class={`chip ${phase >= Checks.PHASES.length ? 'good' : 'acc'}`}>{R.state}: {statusText}</span>
        </div>
        <div class="a3">
          <section>
            <h4>1 · {R.problem}</h4>
            <p>{Model.statement(a.problem) || R.none}</p>
          </section>
          <section>
            <h4>2 · {R.facts}</h4>
            {facts.length ? <ol>{facts.map(f => <li key={f.id}>{f.text}</li>)}</ol> : <p class="sub">–</p>}
          </section>
          {lenses.map((lens, i) => (
            <section key={lens} class={lenses.length === 1 ? 'full' : ''} data-lens={lens}>
              <h4>{3 + i} · {Texts.lens[lens].title}</h4>
              {lens !== 'occurrence' && a.lensQuestions[lens].trim() && <p class="sub small"><i>{a.lensQuestions[lens]}</i></p>}
              {Model.nodesOf(a, lens).length ? <Branch a={a} lens={lens} parentId={null} refuted={refuted} roots={roots} /> : <p class="sub">{R.noChain}</p>}
            </section>
          ))}
          {lenses.length === 3 && <section class="filler" aria-hidden="true" />}
          <section class="full">
            <h4>{3 + lenses.length} · {R.actions}</h4>
            {a.actions.length === 0 ? <p class="sub">{R.noActions}</p> : (
              <table>
                <thead>
                  <tr>
                    <th>{Texts.actions.cols.kind}</th><th>{Texts.actions.cols.text}</th><th>{R.against}</th><th>{Texts.actions.cols.check}</th>
                    {a.settings.owner && <th>{Texts.actions.cols.owner}</th>}
                    {a.settings.due && <th>{Texts.actions.cols.due}</th>}
                    <th>{Texts.actions.cols.status}</th>
                  </tr>
                </thead>
                <tbody>
                  {a.actions.map(x => {
                    const ri = roots.findIndex(r => r.id === x.rootId);
                    return (
                      <tr key={x.id}>
                        <td>{Texts.actionKind[x.kind]}</td>
                        <td>{x.text || '–'}</td>
                        <td>{ri >= 0 ? `◎${ri + 1}` : x.rootId ? '–' : Texts.actions.symptom}</td>
                        <td class={Checks.isFix(x) && !x.check.trim() ? 'bad' : ''}>{x.check || '–'}</td>
                        {a.settings.owner && <td>{x.owner || '–'}</td>}
                        {a.settings.due && <td>{x.due ? Util.formatDay(x.due, Texts.locale) : '–'}</td>}
                        <td>{Texts.actionStatus[x.status]}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
            {roots.length > 0 && (
              <p class="small root-legend">{roots.map((r, i) => <span key={r.id}><b class="root-text">◎{i + 1}</b> {r.text.trim() || Texts.why.untitled}{i < roots.length - 1 ? ' · ' : ''}</span>)}</p>
            )}
          </section>
          <section class="full last">
            <h4>{4 + lenses.length} · {R.learned}</h4>
            {a.transfer.trim() && <p><b>{Texts.actions.transfer}:</b> {a.transfer}</p>}
            {a.lessons.trim() && <p><b>{Texts.actions.lessons}:</b> {a.lessons}</p>}
            {!a.transfer.trim() && !a.lessons.trim() && <p class="sub">–</p>}
          </section>
        </div>
      </article>
    </div>
  );
}
