/*
 * Ishikawa-Diagramm (optional): mögliche Ursachen einer Wirkung – Problem oder eine Antwort im
 * Blickwinkel „aufgetreten“ – nach Kategorien sammeln, prüfen und als Zweige in die
 * Warum-Analyse übernehmen („Breite vor Tiefe“).
 */
import { useLayoutEffect, useRef, useState } from 'preact/hooks';
import { Model } from '../model.js';
import { Ops } from '../ops.js';
import { Texts } from '../texts.js';
import { confirmDialog, fill } from './components.jsx';
import { choosePath, fieldProps, focusNode, goTab, ishikawaState, mutate, useAnalysis } from './core.js';

const I = () => Texts.ishikawa;

/** @param {Partial<{ anchorId: string | null | undefined, causeId: string | null }>} patch */
const setState = patch => { ishikawaState.value = { ...ishikawaState.value, ...patch }; };

/** Ursache als Zweig weiterfragen bzw. die Antwort öffnen. @param {string} causeId */
function toNode(causeId) {
  const n = mutate(a => {
    const node = Ops.causeToNode(a, causeId);
    if (node) choosePath(Model.pathTo(a, node.id));
    return node;
  });
  if (!n) return;
  focusNode.value = n.id;
  goTab('why', { mode: 'chain', lens: 'occurrence' });
}

/** Eingabe für eine neue Ursache. @param {{ a: Analysis, cat: Category, anchorId: string | null }} props */
function AddCause({ a, cat, anchorId }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(/** @type {HTMLInputElement | null} */ (null));
  // Fokus synchron setzen, damit kein Tastendruck vor dem Fokus verloren geht
  useLayoutEffect(() => { if (open && ref.current) ref.current.focus(); }, [open]);
  // Wert direkt aus dem Feld lesen: beim Verlassen nach Escape darf nichts mehr angelegt werden
  const add = () => {
    const el = ref.current;
    const text = el ? el.value.trim() : '';
    if (el) el.value = '';
    if (text) mutate(x => Ops.addCause(x, { anchorId, categoryId: cat.id, text }));
  };
  if (!open) return <button type="button" class="link sm add-cause" data-cat={cat.id} onClick={() => setOpen(true)}>{I().addCause}</button>;
  return (
    <input class="input sm cause-input" ref={ref} placeholder={I().causePlaceholder} aria-label={`${I().causePlaceholder} – ${Model.categoryName(a, cat.id)}`}
      onKeyDown={e => {
        if (e.key === 'Enter') { e.preventDefault(); add(); }
        if (e.key === 'Escape') { e.stopPropagation(); if (ref.current) ref.current.value = ''; setOpen(false); }
      }}
      onBlur={() => { add(); setOpen(false); }} />
  );
}

/** Eine Gräte: Kategorie mit ihren Ursachen. @param {{ a: Analysis, cat: Category, anchorId: string | null, pos: 'top' | 'bottom' }} props */
function Bone({ a, cat, anchorId, pos }) {
  const causes = a.causes.filter(c => c.categoryId === cat.id && c.anchorId === anchorId);
  const selected = ishikawaState.value.causeId;
  const remove = () => {
    const n = a.causes.filter(c => c.categoryId === cat.id).length;
    const run = () => mutate(x => Ops.removeCategory(x, cat.id));
    if (!n) { run(); return; }
    confirmDialog({ title: I().removeCategory, text: fill(I().removeCategoryText, { name: Model.categoryName(a, cat.id), n }), ok: Texts.ui.remove, danger: true, onOk: run });
  };
  const head = (
    <div class="bone-head">
      <input class="input bare cat-name" aria-label={I().categoryPlaceholder} placeholder={I().categoryPlaceholder} {...fieldProps(() => cat.name, v => { cat.name = v; a.preset = 'custom'; })} />
      <em>{causes.length}</em>
      <button type="button" class="icon-btn sm" aria-label={`${I().removeCategory}: ${cat.name}`} title={I().removeCategory} onClick={remove}>✕</button>
    </div>
  );
  const list = (
    <ul class="causes">
      {causes.map(c => {
        const n = Model.node(a, c.nodeId);
        return (
          <li key={c.id}>
            <button type="button" class={`cause cs-${c.state}${selected === c.id ? ' sel' : ''}`} aria-pressed={selected === c.id} data-cause={c.id}
              onClick={() => setState({ causeId: selected === c.id ? null : c.id })}>
              <i aria-hidden="true">{Texts.causeState.icons[c.state]}</i>
              <b>{c.text.trim() || Texts.why.untitled}</b>
              {n && <span class="tow">→ {Model.label(a, n)}</span>}
            </button>
          </li>
        );
      })}
      <li><AddCause a={a} cat={cat} anchorId={anchorId} /></li>
    </ul>
  );
  return (
    <div class={`bone ${pos}`} data-category={cat.id}>
      <div class="bone-inner">
        {pos === 'top' ? <>{head}{list}</> : <>{list}{head}</>}
      </div>
    </div>
  );
}

/** Bearbeiten der gewählten Ursache. @param {{ a: Analysis, cause: Cause }} props */
function CauseEditor({ a, cause }) {
  const n = Model.node(a, cause.nodeId);
  return (
    <section class="card pad cause-editor" id="causeEditor" aria-label={I().selected}>
      <h3>{I().selected}</h3>
      <div class="cause-edit-grid">
        <input class="input" id="causeText" aria-label={I().causePlaceholder} {...fieldProps(() => cause.text, v => { cause.text = v; })} />
        <div class="ev-seg" role="group" aria-label={Texts.why.stateLabel}>
          {Model.CAUSE_STATES.map(st => (
            <button type="button" key={st} class={cause.state === st ? `on cs-btn-${st}` : ''} aria-pressed={cause.state === st} data-state={st}
              onClick={() => mutate(x => Ops.setCauseState(x, cause.id, st))}>
              {Texts.causeState.icons[st]} {Texts.causeState[st]}
            </button>
          ))}
        </div>
        <select class="input select" aria-label={I().categories} value={cause.categoryId} onChange={e => { const v = /** @type {HTMLSelectElement} */ (e.currentTarget).value; mutate(() => { cause.categoryId = v; }); }}>
          {a.categories.map(c => <option key={c.id} value={c.id}>{Model.categoryName(a, c.id)}</option>)}
        </select>
      </div>
      <div class="actions">
        {n
          ? <button type="button" class="btn" id="openNode" onClick={() => toNode(cause.id)}>{I().openNode} ({Model.label(a, n)})</button>
          : <button type="button" class="btn primary" id="toNode" disabled={cause.state === 'excluded'} onClick={() => toNode(cause.id)}>{I().toNode}</button>}
        <span class="spacer" />
        <button type="button" class="btn danger-text" id="deleteCause" onClick={() => { mutate(x => Ops.removeCause(x, cause.id)); setState({ causeId: null }); }}>{I().deleteCause}</button>
      </div>
    </section>
  );
}

/** Wirkung mit den meisten gesammelten Ursachen (`null` = Problem). @param {Analysis} a */
function busiestAnchor(a) {
  /** @type {Map<string | null, number>} */
  const count = new Map();
  for (const c of a.causes) count.set(c.anchorId, (count.get(c.anchorId) || 0) + 1);
  let best = /** @type {string | null} */ (null);
  let n = 0;
  for (const [k, v] of count) if (v > n) { best = k; n = v; }
  return best;
}

export function IshikawaView() {
  const a = useAnalysis();
  const st = ishikawaState.value;
  const anchor = Model.node(a, st.anchorId === undefined ? busiestAnchor(a) : st.anchorId);
  const anchorId = anchor && anchor.lens === 'occurrence' ? anchor.id : null;
  const cause = a.causes.find(c => c.id === st.causeId && c.anchorId === anchorId);
  const cols = Math.max(1, Math.ceil(a.categories.length / 2));
  const top = a.categories.slice(0, cols);
  const bottom = a.categories.slice(cols);
  const here = a.causes.filter(c => c.anchorId === anchorId);
  const taken = here.filter(c => Model.node(a, c.nodeId));
  const open = here.filter(c => c.state === 'open' && !c.nodeId);
  const effect = anchor ? anchor.text.trim() || Texts.why.untitled : Model.statement(a.problem) || Texts.why.noProblem;
  const occurrence = Model.nodesOf(a, 'occurrence');

  /** @param {Preset} preset */
  const changePreset = preset => {
    const lost = Ops.causesLostByPreset(a, preset);
    const run = () => mutate(x => Ops.applyPreset(x, preset));
    if (!lost) { run(); return; }
    confirmDialog({ title: I().presetTitle, text: fill(I().presetLoses, { n: lost }), ok: I().presetOk, danger: true, onOk: run });
  };

  return (
    <div class="ishikawa" id="ishikawa">
      <div class="toolbar">
        <label class="sub small" for="anchorSel">{I().for}</label>
        <select class="input select" id="anchorSel" value={anchorId ?? ''} onChange={e => setState({ anchorId: /** @type {HTMLSelectElement} */ (e.currentTarget).value || null, causeId: null })}>
          <option value="">{I().anchorProblem}</option>
          {occurrence.map(n => <option key={n.id} value={n.id}>{Model.label(a, n)} · {(n.text.trim() || Texts.why.untitled).slice(0, 60)}</option>)}
        </select>
        <label class="sub small" for="presetSel">{I().categories}</label>
        <select class="input select" id="presetSel" value={a.preset} onChange={e => changePreset(/** @type {Preset} */ (/** @type {HTMLSelectElement} */ (e.currentTarget).value))}>
          {Model.PRESETS.map(p => <option key={p} value={p}>{Texts.ishikawa.presets[p].name}</option>)}
        </select>
        <button type="button" class="btn sm" id="addCategory" onClick={() => mutate(x => Ops.addCategory(x))}>{I().addCategory}</button>
      </div>

      <div class="card fish" style={{ '--cols': String(cols) }}>
        <div class="fish-body">
          <div class="bones top-row">{top.map(c => <Bone a={a} cat={c} anchorId={anchorId} pos="top" key={c.id} />)}</div>
          <div class="spine" aria-hidden="true" />
          <div class="bones bottom-row">{bottom.map(c => <Bone a={a} cat={c} anchorId={anchorId} pos="bottom" key={c.id} />)}</div>
        </div>
        <div class="fish-head" id="fishHead">
          <small>{I().effect}{anchor ? ` · ${Model.label(a, anchor)}` : ''}</small>
          <b>{effect}</b>
          <div class="legend">
            {Model.CAUSE_STATES.map(s => <span key={s} class={`lg-${s}`}>{Texts.causeState.icons[s]} {Texts.causeState[s]}</span>)}
            <span><span class="tow">→ W</span> {I().inAnalysis}</span>
          </div>
        </div>
      </div>

      {cause ? <CauseEditor a={a} cause={cause} /> : <p class="sub small select-hint">{I().selectHint}</p>}

      <div class="ish-foot">
        <section class="card pad">
          <h3>{fill(I().listTaken, { n: taken.length })}</h3>
          {taken.length === 0 && <p class="sub small">{I().listTakenEmpty}</p>}
          <ul class="mini-list">
            {taken.map(c => {
              const n = /** @type {WhyNode} */ (Model.node(a, c.nodeId));
              return (
                <li key={c.id}>
                  <button type="button" class="link sm" onClick={() => toNode(c.id)}>{Model.label(a, n)}</button>
                  <span class={n.state === 'refuted' ? 'struck' : ''}>{n.text.trim() || Texts.why.untitled}</span>
                  <span class="chip sm">{Model.categoryName(a, c.categoryId)}</span>
                </li>
              );
            })}
          </ul>
        </section>
        <section class="card pad">
          <h3>{fill(I().listOpen, { n: open.length })}</h3>
          <p class="sub small">{I().listOpenHelp}</p>
        </section>
        <section class="card pad">
          <h3>{I().tipTitle}</h3>
          <p class="sub small">{I().tip}</p>
        </section>
      </div>
    </div>
  );
}
