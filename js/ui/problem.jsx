/*
 * Schritt 1 – Problem beschreiben: Titel und Umfeld, 5W2H-Felder mit Soll/Ist, Problemaussage
 * (eigener Text oder Vorschlag), Fakten & Belege, Team; Prüfung der Problemaussage.
 */
import { useState } from 'preact/hooks';
import { Checks } from '../checks.js';
import { Model } from '../model.js';
import { Ops } from '../ops.js';
import { Texts } from '../texts.js';
import { Util } from '../util.js';
import { Avatar, CheckCard, fill } from './components.jsx';
import { fieldProps, goTab, mutate, useAnalysis } from './core.js';

/** Hinweis unter einem Feld, wenn es eine Ursache oder Lösung vorwegnimmt. @param {{ text: string }} props */
function FieldHint({ text }) {
  const cause = Util.findWord(text, Texts.words.cause);
  const solution = !cause && Util.findWord(text, Texts.words.solution);
  if (!cause && !solution) return null;
  return <div class="field-hint">⚠ {cause ? fill(Texts.problem.causeHint, { word: cause }) : fill(Texts.problem.solutionHint, { word: /** @type {string} */ (solution) })}</div>;
}

/** @param {{ k: keyof Problem, multiline?: boolean }} props */
function Field({ k, multiline }) {
  const a = useAnalysis();
  const F = Texts.problem.fields[k];
  const props = fieldProps(() => a.problem[k], v => { a.problem[k] = v; });
  return (
    <>
      <label for={`pf-${k}`}>{F.label}<small>{F.help}</small></label>
      <div>
        {multiline
          ? <textarea class="input" id={`pf-${k}`} rows={1} placeholder={F.placeholder} {...props} />
          : <input class="input" id={`pf-${k}`} placeholder={F.placeholder} {...props} />}
        <FieldHint text={a.problem[k]} />
      </div>
    </>
  );
}

function Facts() {
  const a = useAnalysis();
  const P = Texts.problem;
  const [draft, setDraft] = useState('');
  const add = () => {
    const text = draft.trim();
    if (!text) return;
    mutate(x => Ops.addFact(x, text));
    setDraft('');
  };
  return (
    <section class="facts" aria-labelledby="factsTitle">
      <h3 id="factsTitle">{P.facts}</h3>
      <p class="sub small">{P.factsHelp}</p>
      <ul class="fact-list" id="factList">
        {a.facts.map(f => (
          <li key={f.id} class="fact">
            <span class="fact-dot" aria-hidden="true">•</span>
            <input class="input bare" aria-label={P.facts} {...fieldProps(() => f.text, v => { f.text = v; })} />
            <button type="button" class="icon-btn sm" aria-label={Texts.ui.remove} title={Texts.ui.remove} onClick={() => mutate(x => Ops.removeFact(x, f.id))}>✕</button>
          </li>
        ))}
      </ul>
      <div class="row">
        <input class="input" id="factInput" value={draft} placeholder={P.factPlaceholder}
          onInput={e => setDraft(/** @type {HTMLInputElement} */ (e.currentTarget).value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add(); } }} />
        <button type="button" class="btn" id="addFact" onClick={add}>{P.addFact}</button>
      </div>
    </section>
  );
}

function Team() {
  const a = useAnalysis();
  const P = Texts.problem;
  const [draft, setDraft] = useState('');
  const add = () => {
    if (draft.trim()) mutate(x => Ops.addTeam(x, draft));
    setDraft('');
  };
  return (
    <section class="card pad" aria-labelledby="teamTitle">
      <h3 id="teamTitle">{P.team}</h3>
      <div class="team" id="teamList">
        {a.team.map(name => (
          <span class="person" key={name}>
            <Avatar name={name} />{name}
            <button type="button" class="icon-btn sm" aria-label={`${Texts.ui.remove}: ${name}`} onClick={() => mutate(x => Ops.removeTeam(x, name))}>✕</button>
          </span>
        ))}
      </div>
      <div class="row">
        <input class="input" id="teamInput" value={draft} placeholder={P.teamPlaceholder}
          onInput={e => setDraft(/** @type {HTMLInputElement} */ (e.currentTarget).value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add(); } }} />
        <button type="button" class="btn" id="addPerson" onClick={add}>{P.addPerson}</button>
      </div>
      <div class="hint info">💡 {P.gemba}</div>
    </section>
  );
}

export function ProblemView() {
  const a = useAnalysis();
  const P = Texts.problem;
  const suggestion = Model.suggestStatement(a.problem);
  const statementProps = fieldProps(() => a.problem.statement, v => { a.problem.statement = v; });
  return (
    <div class="page editor">
      <div class="card pad">
        <div class="title-row">
          <input class="input bare title-input" id="aName" aria-label={Texts.newDialog.name} placeholder={P.namePlaceholder} {...fieldProps(() => a.name, v => { a.name = v; })} />
          <input class="input bare context-input" id="aContext" aria-label={Texts.newDialog.context} placeholder={P.contextPlaceholder} {...fieldProps(() => a.context, v => { a.context = v; })} />
        </div>
        <h2 class="section-title">{P.title}</h2>
        <p class="sub">{P.intro}</p>
        <div class="w2h">
          <Field k="what" />
          <Field k="where" />
          <Field k="when" />
          <label>{P.howMuch}<small>{P.howMuchHelp}</small></label>
          <div class="split2">
            <div>
              <label class="mini-label" for="pf-target">{P.fields.target.label}</label>
              <input class="input" id="pf-target" placeholder={P.fields.target.placeholder} {...fieldProps(() => a.problem.target, v => { a.problem.target = v; })} />
            </div>
            <div>
              <label class="mini-label" for="pf-actual">{P.fields.actual.label}</label>
              <input class="input" id="pf-actual" placeholder={P.fields.actual.placeholder} {...fieldProps(() => a.problem.actual, v => { a.problem.actual = v; })} />
            </div>
          </div>
          <Field k="who" />
          <Field k="howFound" />
          <Field k="impact" multiline />
        </div>

        <div class="statement">
          <label class="lbl" for="statement">{P.statement}</label>
          <textarea class="input bare statement-input" id="statement" rows={2} placeholder={suggestion || P.statementEmpty} {...statementProps} />
          <FieldHint text={a.problem.statement} />
          {!a.problem.statement.trim() && suggestion && (
            <div class="row small">
              <span class="sub">{P.suggestion}</span>
              <button type="button" class="link sm" id="useSuggestion" onClick={() => mutate(x => { x.problem.statement = suggestion; })}>{P.useSuggestion}</button>
            </div>
          )}
          <span class="help-text">{P.statementHelp}</span>
        </div>

        <Facts />
      </div>

      <aside class="side">
        <CheckCard title={P.checksTitle} list={Checks.problem(a)} names={Texts.checks.problem} id="problemChecks" />
        <Team />
        <button type="button" class="btn primary block" id="toWhy" onClick={() => goTab('why', { mode: a.settings.ishikawa && !a.nodes.length ? 'ishikawa' : 'chain', lens: 'occurrence' })}>{P.next}</button>
      </aside>
    </div>
  );
}
