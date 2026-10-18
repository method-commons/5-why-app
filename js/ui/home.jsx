/*
 * Startseite: alle Analysen als Karten (Problem, Phase, Kennzahlen, Grundursache, wichtigster
 * Hinweis), Ablauf der Methode, neue Analyse, Beispiel und Import.
 */
import { useState } from 'preact/hooks';
import { Checks } from '../checks.js';
import { Examples } from '../examples.js';
import { IO } from '../io.js';
import { Model } from '../model.js';
import { Store } from '../storage.js';
import { Texts } from '../texts.js';
import { Util } from '../util.js';
import { deleteAnalysis, duplicateAnalysis } from './manage.js';
import { Dialog, fill, PhaseBar, pickFile, useMenu } from './components.jsx';
import { closeDialog, go, openDialog, prefs, render, toast, useRevision } from './core.js';
import { openHelp } from './help.jsx';

/** Analyse öffnen. @param {Analysis} a */
const open = a => go({ view: 'analysis', aid: a.id, tab: 'problem', mode: 'chain', lens: 'occurrence' });

/** Beispiel in der Sprache der App anlegen und öffnen. */
export function openExample() {
  const a = Examples.load();
  Store.save(a);
  go({ view: 'analysis', aid: a.id, tab: 'why', mode: 'chain', lens: 'occurrence' });
}

/** JSON-Datei importieren (Analyse, Sicherung oder Liste). */
export async function importFiles() {
  const text = await pickFile('.json,application/json');
  if (text == null) return;
  let list;
  try { list = IO.parse(text); } catch (e) {
    toast(fill(Texts.io.failed, { msg: e instanceof Error ? e.message : String(e) }));
    return;
  }
  let added = 0;
  let skipped = 0;
  /** @type {Analysis | null} */
  let last = null;
  for (const a of list) {
    const r = IO.resolveImport(a, Store.load(a.id));
    if (r.action === 'same') { skipped++; continue; }
    Store.save(r.analysis);
    last = r.analysis;
    added++;
  }
  toast([added ? fill(Texts.io.imported, { n: added }) : '', skipped ? fill(Texts.io.skipped, { n: skipped }) : ''].filter(Boolean).join(' '));
  if (added === 1 && last) open(last);
  else render();
}

function NewAnalysisDialog() {
  const [name, setName] = useState('');
  const [context, setContext] = useState('');
  const N = Texts.newDialog;
  const create = () => {
    const a = Model.create({ name, context, settings: prefs.value.defaults });
    Store.save(a);
    closeDialog();
    open(a);
  };
  return (
    <Dialog title={N.title} id="newDialog">
      <form class="dialog-body form-grid" onSubmit={e => { e.preventDefault(); create(); }}>
        <label for="naName">{N.name}</label>
        <input class="input" id="naName" value={name} placeholder={N.namePlaceholder} onInput={e => setName(/** @type {HTMLInputElement} */ (e.currentTarget).value)} />
        <label for="naContext">{N.context}</label>
        <div>
          <input class="input" id="naContext" value={context} placeholder={N.contextPlaceholder} onInput={e => setContext(/** @type {HTMLInputElement} */ (e.currentTarget).value)} />
          <span class="help-text">{N.contextHelp}</span>
        </div>
        <p class="sub small full">{N.optionsHint}</p>
        <button type="submit" hidden />
      </form>
      <div class="dialog-foot">
        <button type="button" class="btn" onClick={closeDialog}>{Texts.ui.cancel}</button>
        <button type="button" class="btn primary" id="naCreate" onClick={create}>{N.create}</button>
      </div>
    </Dialog>
  );
}

/** Menü einer Karte. @param {{ a: Analysis }} props */
function CardMenu({ a }) {
  const [openMenu, setOpen, ref] = useMenu();
  return (
    <div class="menu card-menu" ref={ref}>
      <button type="button" class="icon-btn sm" aria-label={Texts.home.more} title={Texts.home.more} aria-haspopup="true" aria-expanded={openMenu} onClick={() => setOpen(!openMenu)}>⋯</button>
      {openMenu && (
        <div class="menu-list" role="menu">
          <button type="button" role="menuitem" data-action="duplicate" onClick={() => { setOpen(false); duplicateAnalysis(a); }}>{Texts.menu.duplicate}</button>
          <button type="button" role="menuitem" data-action="delete" onClick={() => { setOpen(false); deleteAnalysis(a); }}>{Texts.menu.delete}</button>
        </div>
      )}
    </div>
  );
}

/** @param {{ a: Analysis }} props */
function AnalysisCard({ a }) {
  const H = Texts.home;
  const s = Checks.stats(a);
  const phase = Checks.phase(a);
  const complete = Checks.isComplete(a);
  const hint = Checks.topHint(a);
  const roots = Model.roots(a);
  const statement = Model.statement(a.problem);
  return (
    <article class="card acard" data-id={a.id}>
      <div class="acard-head">
        <div class="acard-icon" style={{ background: a.color }} aria-hidden="true">{Util.initials(a.name)}</div>
        <div class="acard-title">
          <h2><a href={`#/a/${a.id}/problem`} class="acard-link">{a.name}</a></h2>
          {a.context && <div class="sub small">{a.context}</div>}
        </div>
        <span class={`chip ${complete ? 'good' : phase === 0 ? '' : 'acc'}`}>{complete ? '✓ ' : ''}{Checks.phaseLabel(a)}</span>
        <CardMenu a={a} />
      </div>
      <div class={`acard-problem${statement ? '' : ' empty'}`}><span>{statement || H.noProblem}</span></div>
      <div class="acard-meta">
        <div><b>{s.levels}</b><small>{H.levels}</small></div>
        <div><b>{s.roots || '–'}</b><small>{s.roots === 1 ? H.rootsOne : H.roots}</small></div>
        {phase >= 4
          ? <div><b class={complete ? 'good' : ''}>{s.effective} / {s.fixes}</b><small>{H.effective}</small></div>
          : <div><b>{s.actionsDone} / {s.actions}</b><small>{H.actionsDone}</small></div>}
      </div>
      <PhaseBar a={a} />
      {roots.slice(0, 2).map(r => <div class="acard-root" key={r.id}><span class="chip root sm">{H.rootLabel}</span>{Model.textOf(r)}</div>)}
      {hint && <div class="hint warn">⚠ {hint}</div>}
    </article>
  );
}

export function Home() {
  useRevision();
  const list = Store.all();
  const H = Texts.home;
  const roots = list.reduce((n, a) => n + Model.roots(a).length, 0);
  const actions = list.reduce((n, a) => n + a.actions.length, 0);
  const newAnalysis = () => openDialog(() => <NewAnalysisDialog />);
  return (
    <div class="page home">
      <div class="page-head">
        <div>
          <h1>{H.title}</h1>
          {list.length > 0 && <div class="sub">{fill(list.length === 1 ? H.summaryOne : H.summary, { n: list.length, roots, actions })}</div>}
        </div>
        <span class="spacer" />
        <div class="actions">
          <button type="button" class="btn" id="exampleBtn" onClick={openExample}>{H.example}</button>
          <button type="button" class="btn" id="importBtn" onClick={importFiles}>{H.import}</button>
          <button type="button" class="btn primary" id="newBtn" onClick={newAnalysis}>{H.newAnalysis}</button>
        </div>
      </div>
      {list.length === 0 && (
        <div class="card pad empty-state" id="emptyState">
          <h2>{H.emptyTitle}</h2>
          <p class="sub">{H.emptyText}</p>
        </div>
      )}
      {list.length > 0 && (
        <div class="acards" id="analysisList">
          {list.map(a => <AnalysisCard a={a} key={a.id} />)}
        </div>
      )}
      <section class="card howto" aria-label={Texts.help.title}>
        {H.steps.map((st, i) => (
          <div key={i}>
            <b><i>{i + 1}</i>{st.title}</b>
            <p>{st.text}</p>
          </div>
        ))}
        <button type="button" class="link sm howto-more" onClick={() => openHelp('method')}>{Texts.ui.moreInfo}</button>
      </section>
    </div>
  );
}
