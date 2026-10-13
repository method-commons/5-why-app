/*
 * Methodik-Hilfe: kurze Erklärungen zu Methode, Problembeschreibung, Warum-Fragen, Blickwinkeln,
 * Ishikawa, Maßnahmen und Bedienung – als Dialog mit Reitern.
 */
import { useState } from 'preact/hooks';
import { Texts } from '../texts.js';
import { Dialog } from './components.jsx';
import { openDialog } from './core.js';

/** @typedef {keyof typeof Texts.help.sections} HelpSection */
const ORDER = /** @type {HelpSection[]} */ (['method', 'problem', 'asking', 'lenses', 'ishikawa', 'actions', 'app']);

/** @param {HelpSection} [section] */
export function openHelp(section = 'method') {
  openDialog(() => <Help initial={section} />);
}

/** @param {{ initial: HelpSection }} props */
function Help({ initial }) {
  const [sec, setSec] = useState(initial);
  const h = Texts.help.sections[sec];
  return (
    <Dialog title={Texts.help.title} wide id="helpDialog">
      <div class="help">
        <nav class="help-nav" role="tablist" aria-label={Texts.help.title}>
          {ORDER.map(k => (
            <button type="button" role="tab" key={k} aria-selected={sec === k} class={sec === k ? 'on' : ''} data-help={k} onClick={() => setSec(k)}>
              {Texts.help.sections[k].title}
            </button>
          ))}
        </nav>
        <div class="help-body" role="tabpanel">
          <h2>{h.title}</h2>
          {h.paras.map((x, i) => <p key={i}>{x}</p>)}
          {h.list.length > 0 && <ul>{h.list.map((x, i) => <li key={i}>{x}</li>)}</ul>}
          {h.example && <div class="statement small">{h.example}</div>}
        </div>
      </div>
    </Dialog>
  );
}
