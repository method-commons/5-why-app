/*
 * Schritt 3 – Maßnahmen: gegen das Symptom (Sofort) und je Grundursache (Abstellen, Vorbeugen)
 * mit Stärke, Prüfkriterium für die Wirksamkeit, Status und – optional – Person und Termin.
 * Seitenleiste: Maßnahmen-Check, Stärke der Maßnahmen, Übertragen und Gelernt.
 */
import { Checks } from '../checks.js';
import { Model } from '../model.js';
import { Ops } from '../ops.js';
import { Texts } from '../texts.js';
import { Util } from '../util.js';
import { CheckCard, fill } from './components.jsx';
import { fieldProps, goTab, mutate, useAnalysis } from './core.js';
import { openSettings } from './settings.jsx';

const A = () => Texts.actions;

/** Auswahl, die als strukturelle Änderung gespeichert wird. @param {{ value: string, label: string, cls?: string, options: [string, string][], onPick: (v: string) => void }} props */
function Pick({ value, label, cls = '', options, onPick }) {
  return (
    <select class={`input select sm ${cls}`} aria-label={label} value={value} onChange={e => onPick(/** @type {HTMLSelectElement} */ (e.currentTarget).value)}>
      {options.map(([v, t]) => <option key={v} value={v}>{t}</option>)}
    </select>
  );
}

/** Stärke als kleine Balken (5 = beseitigen … 1 = Schulung). @param {{ strength: Strength | null }} props */
function StrengthBars({ strength }) {
  const n = strength ? Model.STRENGTHS.length - Model.STRENGTHS.indexOf(strength) : 0;
  return (
    <span class="strength" aria-hidden="true">
      {[1, 2, 3, 4, 5].map(i => <i key={i} class={i <= n ? (n >= 3 ? 'on' : 'mid') : ''} />)}
    </span>
  );
}

/** @param {{ a: Analysis, x: Action, today: string }} props */
function ActionRow({ a, x, today }) {
  const C = A().cols;
  const late = a.settings.due && x.due && x.due < today && !Checks.isDone(x) && x.status !== 'ineffective';
  return (
    <div class={`m-row${late ? ' late' : ''}`} data-action={x.id}>
      <Pick label={C.kind} cls={`m-kind kind-${x.kind}`} value={x.kind}
        options={Model.ACTION_KINDS.map(k => [k, `${Texts.actionKindIcon[k]} ${Texts.actionKind[k]}`])}
        onPick={v => mutate(() => { x.kind = /** @type {ActionKind} */ (v); })} />
      <textarea class="input sm m-text" rows={1} aria-label={C.text} placeholder={A().textPlaceholder} {...fieldProps(() => x.text, v => { x.text = v; })} />
      <div class="m-strength">
        <Pick label={C.strength} value={x.strength || ''}
          options={[['', A().strengthNone], ...Model.STRENGTHS.map(s => /** @type {[string, string]} */ ([s, Texts.strength[s]]))]}
          onPick={v => mutate(() => { x.strength = v ? /** @type {Strength} */ (v) : null; })} />
        <StrengthBars strength={x.strength} />
      </div>
      <Pick label={C.status} cls={`m-status st-${x.status}`} value={x.status}
        options={Model.ACTION_STATUSES.map(s => [s, Texts.actionStatus[s]])}
        onPick={v => mutate(() => { x.status = /** @type {ActionStatus} */ (v); })} />
      <button type="button" class="icon-btn sm m-del" aria-label={A().remove} title={A().remove} onClick={() => mutate(y => Ops.removeAction(y, x.id))}>✕</button>
      <div class="m-sub">
        <input class={`input sm m-check${Checks.isFix(x) && !x.check.trim() ? ' warn' : ''}`} aria-label={C.check} placeholder={A().checkPlaceholder} {...fieldProps(() => x.check, v => { x.check = v; })} />
        <label class="mini-date">
          <span>{A().checkDate}</span>
          <input type="date" class="input sm" value={x.checkDate}
            onChange={e => { const v = /** @type {HTMLInputElement} */ (e.currentTarget).value; mutate(() => { x.checkDate = Util.isDay(v) ? v : ''; }); }} />
        </label>
        {a.settings.owner && (
          <label class="mini-date m-owner">
            <span>{C.owner}</span>
            <input class="input sm" list="teamNames" placeholder={A().ownerPlaceholder} {...fieldProps(() => x.owner, v => { x.owner = v; })} />
          </label>
        )}
        {a.settings.due && (
          <label class={`mini-date m-due${late ? ' late' : ''}`}>
            <span>{C.due}</span>
            <input type="date" class="input sm" value={x.due}
              onChange={e => { const v = /** @type {HTMLInputElement} */ (e.currentTarget).value; mutate(() => { x.due = Util.isDay(v) ? v : ''; }); }} />
            {late && <small class="bad">⚠ {A().overdueShort}</small>}
          </label>
        )}
      </div>
    </div>
  );
}

/** Spaltenköpfe. */
function Head() {
  const C = A().cols;
  return (
    <div class="m-row th" aria-hidden="true">
      <span>{C.kind}</span><span>{C.text}</span><span>{C.strength}</span><span>{C.status}</span><span />
    </div>
  );
}

/**
 * Gruppe von Maßnahmen (Symptom bzw. eine Grundursache).
 * @param {{ a: Analysis, rootId: string | null, title: string, sub: any, mark: string, cls: string, today: string }} props
 */
function Group({ a, rootId, title, sub, mark, cls, today }) {
  const list = a.actions.filter(x => x.rootId === rootId);
  return (
    <section class={`card rc-card ${cls}`} data-group={rootId ?? 'symptom'}>
      <div class="rc-head">
        <span class="mark" aria-hidden="true">{mark}</span>
        <div class="rc-title"><div class="t">{title}</div><div class="p">{sub}</div></div>
        <span class="chip">{list.length === 1 ? A().countOne : fill(A().count, { n: list.length })}</span>
      </div>
      {list.length > 0 && <Head />}
      {list.map(x => <ActionRow a={a} x={x} today={today} key={x.id} />)}
      <div class="rc-foot">
        <button type="button" class="link sm add-action" data-root={rootId ?? 'symptom'} onClick={() => mutate(y => Ops.addAction(y, { rootId }))}>{A().add}</button>
      </div>
    </section>
  );
}

export function ActionsView() {
  const a = useAnalysis();
  const today = Util.today();
  const roots = Model.roots(a);
  const orphans = Checks.orphans(a);
  const late = Checks.overdue(a, today).length;
  const fixes = a.actions.filter(Checks.isFix);
  return (
    <div class="page actions-page">
      <datalist id="teamNames">{a.team.map(n => <option key={n} value={n} />)}</datalist>
      <div class="toolbar">
        {a.settings.owner || a.settings.due
          ? <span class="opt-note">{A().optionalOn} {a.settings.owner && <span class="chip acc sm">{A().cols.owner}</span>} {a.settings.due && <span class="chip acc sm">{A().cols.due}</span>} · <button type="button" class="link sm" onClick={() => openSettings()}>{Texts.ui.settingsLink}</button></span>
          : <span class="opt-note">{A().optionalOff} <button type="button" class="link sm" id="optSettings" onClick={() => openSettings()}>{Texts.ui.settingsLink}</button></span>}
        <span class="spacer" />
        {late > 0 && <span class="chip warn" id="overdueChip">{fill(A().overdue, { n: late })}</span>}
      </div>
      <div class="editor">
        <div>
          {!roots.length && (
            <div class="hint warn no-roots">
              {A().noRoots} <button type="button" class="link sm" onClick={() => goTab('why')}>{A().toWhy}</button>
            </div>
          )}
          <Group a={a} rootId={null} title={A().symptomTitle} sub={A().symptomHelp} mark="!" cls="symptom" today={today} />
          {roots.map((r, i) => (
            <Group a={a} rootId={r.id} key={r.id} title={r.text.trim() || Texts.why.untitled} mark={`◎${i + 1}`} cls="root-group" today={today}
              sub={<><span class={`lens-text lens-${r.lens}`}>● {Texts.lens[r.lens].title}</span> · {Model.label(a, r)}</>} />
          ))}
          {orphans.length > 0 && (
            <section class="card rc-card orphan" id="orphans">
              <div class="rc-head"><span class="mark">?</span><div class="rc-title"><div class="t">{A().orphanTitle}</div><div class="p">{A().orphanHelp}</div></div></div>
              {orphans.map(x => (
                <div class="orphan-row" key={x.id}>
                  <span>{x.text.trim() || A().untitled}</span>
                  <select class="input select sm" aria-label={A().assign} value="" onChange={e => { const v = /** @type {HTMLSelectElement} */ (e.currentTarget).value; mutate(() => { x.rootId = v === 'symptom' ? null : v; }); }}>
                    <option value="" disabled>{A().assign}</option>
                    <option value="symptom">{A().symptomTitle}</option>
                    {roots.map(r => <option key={r.id} value={r.id}>{(r.text.trim() || Texts.why.untitled).slice(0, 60)}</option>)}
                  </select>
                  <button type="button" class="icon-btn sm" aria-label={A().remove} onClick={() => mutate(y => Ops.removeAction(y, x.id))}>✕</button>
                </div>
              ))}
            </section>
          )}
        </div>
        <aside class="side">
          <CheckCard title={Texts.checks.actions.title} list={Checks.actions(a, today)} names={Texts.checks.actions} id="actionChecks" />
          <section class="card pad">
            <h3>{A().strengthTitle}</h3>
            <div class="hier">
              {Model.STRENGTHS.map(s => <div key={s} class={`hier-${s}`}>{Texts.strength[s]}<b>{fixes.filter(x => x.strength === s).length + a.actions.filter(x => x.kind === 'immediate' && x.strength === s).length}</b></div>)}
            </div>
            <p class="sub small">{A().strengthHelp}</p>
          </section>
          <section class="card pad">
            <label class="h3" for="transfer">{A().transfer}</label>
            <p class="sub small">{A().transferHelp}</p>
            <textarea class="input" id="transfer" rows={2} {...fieldProps(() => a.transfer, v => { a.transfer = v; })} />
            <label class="h3 spaced" for="lessons">{A().lessons}</label>
            <p class="sub small">{A().lessonsHelp}</p>
            <textarea class="input" id="lessons" rows={2} {...fieldProps(() => a.lessons, v => { a.lessons = v; })} />
          </section>
          <button type="button" class="btn primary block" id="toReport" onClick={() => goTab('report')}>{A().next}</button>
        </aside>
      </div>
    </div>
  );
}
