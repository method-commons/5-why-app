/*
 * Schritt 2 – Warum-Analyse: Blickwinkel, Kennzahlen und drei Ansichten – Kette (Antworten
 * Ebene für Ebene mit Beleg, Status, Grundursache, Verzweigungen, Daher-Probe), Baum (alle
 * Zweige und Blickwinkel) und – optional – Ishikawa (ishikawa.jsx).
 */
import { useLayoutEffect, useRef } from 'preact/hooks';
import { Checks } from '../checks.js';
import { Model } from '../model.js';
import { Ops } from '../ops.js';
import { Texts } from '../texts.js';
import { Util } from '../util.js';
import { CheckCard, confirmDialog, EvidenceChip, fill } from './components.jsx';
import { branchChoice, choosePath, fieldProps, focusNode, goTab, mutate, toast, useAnalysis } from './core.js';
import { IshikawaView } from './ishikawa.jsx';
import { openSettings } from './settings.jsx';

/** Text kürzen. @param {string} s @param {number} n */
const cut = (s, n) => (s.length > n ? s.slice(0, n - 1).trimEnd() + '…' : s);

/** Ausgangspunkt eines Blickwinkels: Problemaussage bzw. Frage. @param {Analysis} a @param {Lens} lens */
function startText(a, lens) {
  if (lens === 'occurrence') return Model.statement(a.problem);
  return a.lensQuestions[lens].trim() || Texts.lens[lens].question;
}

/**
 * Antwort anlegen, in der Kette anzeigen und ihr Textfeld fokussieren.
 * @param {{ lens: Lens, parentId: string | null }} opts
 */
function addAnswer({ lens, parentId }) {
  const parentWasRoot = mutate(a => {
    const parent = Model.node(a, parentId);
    const wasRoot = !!(parent && parent.root);
    const n = Ops.addNode(a, { lens, parentId });
    choosePath(Model.pathTo(a, n.id));
    focusNode.value = n.id;
    return wasRoot;
  });
  if (parentWasRoot) toast(Texts.why.rootUnmarked);
}

/** Antwort löschen (bei Antworten darunter mit Rückfrage). @param {Analysis} a @param {WhyNode} n */
function removeAnswer(a, n) {
  const below = Model.descendants(a, n.id).length;
  const run = () => mutate(x => Ops.removeNode(x, n.id));
  if (!below && !n.text.trim()) { run(); return; }
  confirmDialog({
    title: Texts.why.deleteTitle,
    text: below ? fill(Texts.why.deleteText, { n: below }) : Texts.why.deleteTextSingle,
    ok: Texts.ui.delete,
    danger: true,
    onOk: run,
  });
}

// ===== Kette =====
/** Frage über einer Antwort. @param {{ n: WhyNode, prev: string, first: boolean }} props */
function Ask({ n, prev, first }) {
  const W = Texts.why;
  const auto = first && !prev ? W.askFirst : fill(W.askAuto, { text: cut(prev || W.untitled, 90) });
  return (
    <div class="ask">
      <span class="ask-mark" aria-hidden="true">?</span>
      <span class="ask-label">{W.ask}</span>
      <input class="input bare q-input" aria-label={W.questionLabel} placeholder={auto} {...fieldProps(() => n.question, v => { n.question = v; })} />
    </div>
  );
}

/** Mehrere Antworten auf dieselbe Frage: Zweig wählen. @param {{ siblings: WhyNode[], current: WhyNode }} props */
function Branches({ siblings, current }) {
  return (
    <div class="branches" role="group" aria-label={fill(Texts.why.branches, { n: siblings.length })}>
      <span class="sub small">⑂ {fill(Texts.why.branches, { n: siblings.length })}</span>
      {siblings.map(s => (
        <button type="button" key={s.id} class={`chip branch ev-${s.state}${s.id === current.id ? ' on' : ''}${s.root ? ' is-root' : ''}`} aria-pressed={s.id === current.id}
          onClick={() => { branchChoice.value = { ...branchChoice.value, [s.parentId ?? `:${s.lens}`]: s.id }; }}>
          {Texts.evidence.icons[s.state]} {cut(s.text.trim() || Texts.why.untitled, 40)}
        </button>
      ))}
    </div>
  );
}

/** Eine Antwort in der Kette. @param {{ a: Analysis, n: WhyNode, siblings: WhyNode[] }} props */
function NodeCard({ a, n, siblings }) {
  const W = Texts.why;
  const ref = useRef(/** @type {HTMLTextAreaElement | null} */ (null));
  const wantFocus = focusNode.value === n.id;
  // Fokus synchron setzen, damit kein Tastendruck vor dem Fokus verloren geht
  useLayoutEffect(() => {
    if (wantFocus && ref.current) { ref.current.focus(); focusNode.value = null; }
  }, [wantFocus]);
  const blame = Util.findWord(n.text, [...Texts.words.blame, ...a.team.filter(t => t.trim().length > 2)]);
  const idx = siblings.indexOf(n);
  const lvl = Model.level(a, n);
  return (
    <div class={`why ev-card-${n.state}${n.root ? ' rootc' : ''}`} data-node={n.id} data-level={lvl}>
      <div class="lvl" aria-label={Model.label(a, n)}><b>{lvl}</b>{W.levelShort}</div>
      <div class="why-main">
        <textarea class="input bare ans" id={`ans-${n.id}`} ref={ref} rows={1} aria-label={`${Model.label(a, n)} – ${W.answerPlaceholder}`} placeholder={W.answerPlaceholder}
          {...fieldProps(() => n.text, v => { n.text = v; })} />
        {blame && <div class="field-hint">⚠ {fill(W.blameHint, { word: blame })}</div>}
        <div class="why-meta">
          <input class="input sm ev-input" aria-label={W.evidence} placeholder={W.evidencePlaceholder} {...fieldProps(() => n.evidence, v => { n.evidence = v; })} />
          <div class="ev-seg" role="group" aria-label={W.stateLabel}>
            {Model.EVIDENCE.map(st => (
              <button type="button" key={st} class={n.state === st ? `on ev-${st}` : ''} aria-pressed={n.state === st} data-state={st}
                onClick={() => mutate(x => Ops.setState(x, n.id, st))}>
                {Texts.evidence.icons[st]} {Texts.evidence[st]}
              </button>
            ))}
          </div>
          {n.category && <span class="chip sm">{n.category}</span>}
          <button type="button" class={`btn sm root-btn${n.root ? ' on' : ''}`} aria-pressed={n.root} disabled={n.state === 'refuted'}
            onClick={() => mutate(x => Ops.setRoot(x, n.id, !n.root))}>
            {n.root ? W.unmarkRoot : W.markRoot}
          </button>
        </div>
      </div>
      <div class="tools">
        {siblings.length > 1 && <>
          <button type="button" class="icon-btn sm" aria-label={W.moveUp} title={W.moveUp} disabled={idx === 0} onClick={() => mutate(x => Ops.moveNode(x, n.id, -1))}>↑</button>
          <button type="button" class="icon-btn sm" aria-label={W.moveDown} title={W.moveDown} disabled={idx === siblings.length - 1} onClick={() => mutate(x => Ops.moveNode(x, n.id, 1))}>↓</button>
        </>}
        <button type="button" class="icon-btn sm add-sibling" aria-label={W.addSiblingTitle} title={W.addSiblingTitle} onClick={() => addAnswer({ lens: n.lens, parentId: n.parentId })}>⑂</button>
        <button type="button" class="icon-btn sm del" aria-label={W.delete} title={W.delete} onClick={() => removeAnswer(a, n)}>✕</button>
      </div>
    </div>
  );
}

/** Ausgangspunkt der Kette. @param {{ a: Analysis, lens: Lens }} props */
function Start({ a, lens }) {
  const W = Texts.why;
  if (lens === 'occurrence') {
    const s = Model.statement(a.problem);
    return (
      <div class="chain-start problem-start">
        <div class="tag">{W.problem}</div>
        {s ? <b>{s}</b> : <span class="sub">{W.noProblem} <a href={`#/a/${a.id}/problem`}>{W.describe}</a></span>}
      </div>
    );
  }
  return (
    <div class={`chain-start lens-start lens-${lens}`}>
      <label class="tag" for={`lq-${lens}`}>{W.question}</label>
      <input class="input bare lens-q" id={`lq-${lens}`} placeholder={Texts.lens[lens].question} {...fieldProps(() => a.lensQuestions[lens], v => { a.lensQuestions[lens] = v; })} />
    </div>
  );
}

/** @param {{ a: Analysis, lens: Lens }} props */
function Chain({ a, lens }) {
  const W = Texts.why;
  const path = Model.mainPath(a, lens, branchChoice.value);
  const last = path[path.length - 1];
  const hasRoots = Model.roots(a, lens).length > 0;
  return (
    <section class="card pad chain" id="chain" aria-label={Texts.lens[lens].title}>
      <Start a={a} lens={lens} />
      {path.map((n, i) => {
        const siblings = Model.children(a, lens, n.parentId);
        return (
          <div class="link-block" key={n.id}>
            <Ask n={n} first={i === 0} prev={i === 0 ? (lens === 'occurrence' ? Model.statement(a.problem) : startText(a, lens)) : path[i - 1].text} />
            {siblings.length > 1 && <Branches siblings={siblings} current={n} />}
            <NodeCard a={a} n={n} siblings={siblings} />
          </div>
        );
      })}
      <div class="chain-end">
        {!last && <button type="button" class="btn dashed" id="addWhy" onClick={() => addAnswer({ lens, parentId: null })}>{W.addFirst}</button>}
        {last && last.state === 'refuted' && <>
          <span class="sub small">{W.refutedEnd}</span>
          <button type="button" class="btn dashed" id="addSiblingEnd" onClick={() => addAnswer({ lens, parentId: last.parentId })}>{W.addSibling}</button>
        </>}
        {last && last.state !== 'refuted' && <>
          {last.root && <span class="chip root">◎ {W.rootEnd}</span>}
          <button type="button" class="btn dashed" id="addWhy" onClick={() => addAnswer({ lens, parentId: last.id })}>{fill(W.addWhy, { n: path.length + 1 })}</button>
        </>}
        <span class="spacer" />
        {hasRoots && <button type="button" class="btn primary" id="toActions" onClick={() => goTab('actions')}>{W.toActions}</button>}
      </div>
    </section>
  );
}

/** Daher-Probe: Kette rückwärts gelesen. @param {{ a: Analysis, lens: Lens }} props */
function Readback({ a, lens }) {
  const W = Texts.why;
  const path = Model.mainPath(a, lens, branchChoice.value).filter(n => n.state !== 'refuted');
  return (
    <section class="card pad" id="readback" aria-labelledby="readbackTitle">
      <h3 id="readbackTitle">{W.readback}</h3>
      {path.length === 0
        ? <p class="sub small">{W.readbackEmpty}</p>
        : (
          <p class="readback">
            {[...path].reverse().map(n => (
              <span key={n.id}>
                <span class={n.root ? 'rb-root' : ''}>{n.text.trim() || W.untitled}</span> <span class="rb-therefore">{W.therefore}</span>{' '}
              </span>
            ))}
            <b>{cut(startText(a, lens) || Texts.why.problem, 120)}</b>
          </p>
        )}
    </section>
  );
}

// ===== Kennzahlen =====
/** @param {{ a: Analysis, lens: Lens }} props */
function Kpis({ a, lens }) {
  const W = Texts.why;
  const nodes = Model.nodesOf(a, lens);
  const live = nodes.filter(n => n.state !== 'refuted');
  const confirmed = live.filter(n => n.state === 'confirmed').length;
  const branches = nodes.filter(n => Model.children(a, lens, n.id).length > 1).length + (Model.children(a, lens, null).length > 1 ? 1 : 0);
  const roots = Model.roots(a);
  const byLens = Model.lenses(a).map(l => `${Texts.lens[l].short} ${roots.filter(r => r.lens === l).length}`).join(' · ');
  return (
    <div class="kpis" id="whyKpis">
      <div class="card kpi"><small>{W.kpiLevels}</small><b>{Model.depth(a, lens)}</b><span>{fill(W.kpiLevelsDetail, { n: nodes.length, branches })}</span></div>
      <div class="card kpi"><small>{W.kpiEvidence}</small><b class={live.length && confirmed === live.length ? 'good' : ''}>{confirmed} / {live.length}</b><span>{fill(W.kpiEvidenceDetail, { n: live.length - confirmed })}</span></div>
      <div class="card kpi"><small>{W.kpiRefuted}</small><b>{nodes.length - live.length}</b><span>{W.kpiRefutedDetail}</span></div>
      <div class="card kpi"><small>{W.kpiRoots}</small><b class={roots.length ? 'root-text' : ''}>{roots.length}</b><span>{byLens}</span></div>
    </div>
  );
}

// ===== Baum =====
/** @param {{ a: Analysis, n: WhyNode }} props */
function TreeNode({ a, n }) {
  const kids = Model.children(a, n.lens, n.id);
  const leafAdd = !kids.length && n.state !== 'refuted' && !n.root;
  return (
    <li>
      <button type="button" class={`node ev-card-${n.state}${n.root ? ' rootc' : ''}`} data-node={n.id}
        title={Texts.why.treeOpen}
        onClick={() => { choosePath(Model.pathTo(a, n.id)); goTab('why', { mode: 'chain', lens: n.lens }); }}>
        <small>
          {Model.label(a, n)}{n.category ? ` · ${n.category}` : ''}
          <span class="st">{n.root ? <span class="chip root sm">◎ {Texts.why.rootCause}</span> : <EvidenceChip state={n.state} short />}</span>
        </small>
        <span class="node-text">{n.text.trim() || Texts.why.untitled}</span>
      </button>
      {(kids.length > 0 || leafAdd) && (
        <ul>
          {kids.map(k => <TreeNode a={a} n={k} key={k.id} />)}
          {leafAdd && <li><button type="button" class="node ghost" onClick={() => { addAnswer({ lens: n.lens, parentId: n.id }); goTab('why', { mode: 'chain', lens: n.lens }); }}>{Texts.why.treeAdd}</button></li>}
        </ul>
      )}
    </li>
  );
}

/** @param {{ a: Analysis }} props */
function Tree({ a }) {
  const W = Texts.why;
  return (
    <section class="card tree-card" id="tree">
      {Model.lenses(a).map(lens => {
        const top = Model.children(a, lens, null);
        return (
          <div class="lane" key={lens} data-lens={lens}>
            <div class="lane-head"><b><i class={`lens-dot lens-${lens}`} />{Texts.lens[lens].title}</b><p>{Texts.lens[lens].help}</p></div>
            <div class="tree-wrap">
              <ul class="tree">
                <li>
                  <div class={`node start lens-${lens}`}><small>{lens === 'occurrence' ? W.problem : W.question}</small><span class="node-text">{cut(startText(a, lens) || W.noProblem, 110)}</span></div>
                  <ul>
                    {top.map(n => <TreeNode a={a} n={n} key={n.id} />)}
                    {!top.length && <li><button type="button" class="node ghost" onClick={() => { addAnswer({ lens, parentId: null }); goTab('why', { mode: 'chain', lens }); }}>{W.addFirst}</button></li>}
                  </ul>
                </li>
              </ul>
            </div>
          </div>
        );
      })}
    </section>
  );
}

// ===== Ansicht =====
/** @param {{ mode: import('./core.js').WhyMode, lens: Lens }} props */
export function WhyView({ mode, lens }) {
  const a = useAnalysis();
  const W = Texts.why;
  const lenses = Model.lenses(a);
  const l = lenses.includes(lens) ? lens : 'occurrence';
  const m = mode === 'ishikawa' && !a.settings.ishikawa ? 'chain' : mode;
  /** @type {import('./core.js').WhyMode[]} */
  const modes = a.settings.ishikawa ? ['ishikawa', 'chain', 'tree'] : ['chain', 'tree'];
  return (
    <div class="page why-page">
      <div class="toolbar">
        {m === 'chain' && lenses.length > 1 && (
          <div class="lens" role="tablist" aria-label={Texts.settings.lenses}>
            {lenses.map(x => (
              <button type="button" role="tab" key={x} aria-selected={x === l} class={x === l ? 'on' : ''} data-lens={x} onClick={() => goTab('why', { lens: x })}>
                <i class={`lens-dot lens-${x}`} />{Texts.lens[x].title} <em>{Model.nodesOf(a, x).length}</em>
              </button>
            ))}
          </div>
        )}
        {m !== 'ishikawa' && lenses.length === 1 && (
          <span class="opt-note">{W.lensesOptionalNote} <button type="button" class="link sm" id="lensSettings" onClick={() => openSettings()}>{W.lensOptional}</button></span>
        )}
        <span class="spacer" />
        <div class="seg" role="tablist" aria-label={Texts.nav.why}>
          {modes.map(x => <button type="button" role="tab" key={x} aria-selected={x === m} class={x === m ? 'on' : ''} data-mode={x} onClick={() => goTab('why', { mode: x })}>{W.modes[x]}</button>)}
        </div>
      </div>
      {m !== 'ishikawa' && <Kpis a={a} lens={l} />}
      {m === 'chain' && (
        <div class="editor">
          <Chain a={a} lens={l} />
          <aside class="side">
            <CheckCard title={Texts.checks.chain.title} list={Checks.chain(a, l)} names={Texts.checks.chain} id="chainChecks" />
            <Readback a={a} lens={l} />
          </aside>
        </div>
      )}
      {m === 'tree' && <>
        <div class="legend tree-legend">
          {Model.EVIDENCE.map(st => <span key={st}><i class={`sw sw-${st}`} />{W.legend[st]}</span>)}
          <span><i class="sw sw-root" />{W.legend.root}</span>
        </div>
        <Tree a={a} />
      </>}
      {m === 'ishikawa' && <IshikawaView />}
    </div>
  );
}
