/*
 * Kleine, wiederverwendbare Bausteine der Oberfläche: Dialog, Bestätigungsdialog, Prüfliste mit
 * Ring, Phasen-Leiste, Personen-Kreis, Herunterladen und Datei öffnen.
 */
import { useEffect, useRef, useState } from 'preact/hooks';
import { Checks } from '../checks.js';
import { Model } from '../model.js';
import { Texts } from '../texts.js';
import { Util } from '../util.js';
import { closeDialog, mutate, openDialog } from './core.js';
import { Ops } from '../ops.js';

/** Text mit Platzhaltern. @param {string} text @param {Record<string, string | number>} [params] */
export const fill = (text, params) => Util.fill(text, params);

/**
 * Dialog über der Seite. Escape und Klick auf den Hintergrund schließen; der Fokus landet
 * im ersten Eingabefeld bzw. Knopf.
 * @param {{ title: string, children: any, wide?: boolean, id?: string, onClose?: () => void }} props
 */
export function Dialog({ title, children, wide, id, onClose = closeDialog }) {
  const ref = useRef(/** @type {HTMLDivElement | null} */ (null));
  useEffect(() => {
    const prev = /** @type {HTMLElement | null} */ (document.activeElement);
    const el = ref.current;
    const first = /** @type {HTMLElement | null} */ (el && el.querySelector('[autofocus], input:not([type=checkbox]):not([type=radio]), textarea, select, .dialog-body button, .dialog-foot button'));
    if (first) first.focus();
    else if (el) el.focus();
    return () => { if (prev && document.contains(prev)) prev.focus(); };
  }, []);
  // Escape schließt auch, wenn der Fokus (noch) nicht im Dialog liegt
  useEffect(() => {
    /** @param {KeyboardEvent} e */
    const esc = e => { if (e.key === 'Escape' && !(ref.current && ref.current.contains(/** @type {Node} */ (e.target)))) onClose(); };
    document.addEventListener('keydown', esc);
    return () => document.removeEventListener('keydown', esc);
  }, [onClose]);
  /** @param {KeyboardEvent} e */
  const onKey = e => {
    if (e.key === 'Escape') { e.stopPropagation(); onClose(); }
    if (e.key === 'Tab' && ref.current) {
      const items = [...ref.current.querySelectorAll('button, input, select, textarea, a[href], [tabindex="0"]')].filter(x => !(/** @type {HTMLButtonElement} */ (x).disabled));
      const first = /** @type {HTMLElement} */ (items[0]);
      const last = /** @type {HTMLElement} */ (items[items.length - 1]);
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  };
  return (
    <div class="overlay" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div class={`dialog${wide ? ' wide' : ''}`} role="dialog" aria-modal="true" aria-label={title} id={id} ref={ref} tabIndex={-1} onKeyDown={onKey}>
        <div class="dialog-head">
          <h2>{title}</h2>
          <button type="button" class="icon-btn" aria-label={Texts.ui.close} title={Texts.ui.close} onClick={onClose}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

/**
 * Rückfrage mit „Abbrechen“ und einer Aktion.
 * @param {{ title: string, text: string, ok: string, danger?: boolean, onOk: () => void }} opts
 */
export function confirmDialog({ title, text, ok, danger, onOk }) {
  openDialog(() => (
    <Dialog title={title} id="confirmDialog">
      <div class="dialog-body"><p>{text}</p></div>
      <div class="dialog-foot">
        <button type="button" class="btn" onClick={closeDialog}>{Texts.ui.cancel}</button>
        <button type="button" class={`btn ${danger ? 'danger' : 'primary'}`} id="confirmOk" onClick={() => { closeDialog(); onOk(); }}>{ok}</button>
      </div>
    </Dialog>
  ));
}

const ICON = { ok: '✓', warn: '!', bad: '!', open: '–' };

/**
 * Ring mit Anteil erfüllter Prüfpunkte, darunter die Prüfpunkte. Selbst zu bestätigende Punkte
 * haben einen Knopf „Bestätigen“ (bzw. zurücknehmen).
 * @param {{ title: string, list: Check[], names: Record<string, any>, id?: string }} props
 */
export function CheckCard({ title, list, names, id }) {
  const { ok, total } = Checks.score(list);
  const warn = list.filter(c => c.state === 'warn' || c.state === 'bad').length;
  const open = list.filter(c => c.state === 'open').length;
  const V = Texts.checks.verdict;
  const verdict = ok === total ? V.good : ok === 0 && warn === 0 ? V.empty : ok >= total - 1 ? V.fair : V.poor;
  const pct = (/** @type {number} */ n) => `${(n / total) * 100}%`;
  const ring = `conic-gradient(var(--good) 0 ${pct(ok)}, var(--warn-line) 0 ${pct(ok + warn)}, var(--surface-3) 0)`;
  return (
    <section class="card pad check-card" id={id} aria-label={title}>
      <h3>{title}</h3>
      <div class="score">
        <div class="ring" style={{ background: ring }} role="img" aria-label={fill(Texts.checks.scoreLabel, { ok, total })}><b>{ok}/{total}</b></div>
        <div><b>{verdict}</b><div class="sub small">{fill(Texts.checks.hintsOpen, { warn, open })}</div></div>
      </div>
      {list.map(c => {
        const manual = c.confirmKey && (c.state === 'open' || (c.state === 'ok'));
        return (
          <div class="chk" key={c.key} data-check={c.key} data-state={c.state}>
            <span class={`ic ic-${c.state}`} aria-hidden="true">{ICON[c.state]}</span>
            <div><b>{names[c.key].name}</b><p>{c.detail}</p></div>
            {manual && (
              c.state === 'ok'
                ? <button type="button" class="btn sm ghost" data-confirm={c.key} title={Texts.ui.undoConfirm} onClick={() => mutate(a => Ops.toggleConfirm(a, /** @type {string} */ (c.confirmKey)))}>↶</button>
                : <button type="button" class="btn sm" data-confirm={c.key} onClick={() => mutate(a => Ops.toggleConfirm(a, /** @type {string} */ (c.confirmKey)))}>{Texts.ui.confirm}</button>
            )}
          </div>
        );
      })}
    </section>
  );
}

/** Phasen-Leiste: Problem → Warum → Ursache → Maßnahmen → Wirksam. @param {{ a: Analysis }} props */
export function PhaseBar({ a }) {
  const phase = Checks.phase(a);
  return (
    <div class="phases-wrap">
      <div class="phases" role="img" aria-label={Checks.PHASES.map((k, i) => `${Texts.phase[k]}: ${i < phase ? '✓' : i === phase ? '…' : '–'}`).join(', ')}>
        {Checks.PHASES.map((k, i) => <span key={k} class={i < phase ? 'done' : i === phase ? 'cur' : ''} />)}
      </div>
      <div class="phase-labels">
        {Checks.PHASES.map((k, i) => <span key={k} class={i === phase || (phase === Checks.PHASES.length && i === phase - 1) ? 'cur' : ''}>{Texts.phase[k]}</span>)}
      </div>
    </div>
  );
}

/**
 * Aufklappmenü: offen/zu und ein Verweis auf den Rahmen. Klick daneben und Escape schließen.
 * @returns {[boolean, (v: boolean) => void, import('preact').RefObject<HTMLDivElement>]}
 */
export function useMenu() {
  const [open, setOpen] = useState(false);
  const ref = useRef(/** @type {HTMLDivElement | null} */ (null));
  useEffect(() => {
    if (!open) return undefined;
    /** @param {MouseEvent} e */
    const click = e => { if (ref.current && !ref.current.contains(/** @type {Node} */ (e.target))) setOpen(false); };
    /** @param {KeyboardEvent} e */
    const esc = e => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('click', click);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('click', click); document.removeEventListener('keydown', esc); };
  }, [open]);
  return [open, setOpen, ref];
}

/** Logo der App (wie auf der Schulungsseite 5-why-site); Farbe über `currentColor`. */
export function Logo() {
  return (
    <svg class="logo" viewBox="0 0 32 32" aria-hidden="true">
      <rect width="32" height="32" rx="7" fill="currentColor" />
      <path d="M8.5 10.5v5.5h2M12 18.5v5.5h6.5" fill="none" stroke="#fff" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" opacity=".55" />
      <rect x="6" y="6" width="14" height="4.5" rx="2.25" fill="#fff" />
      <rect x="10.5" y="13.75" width="14" height="4.5" rx="2.25" fill="#fff" opacity=".55" />
      <circle cx="22.5" cy="24" r="3.4" fill="none" stroke="#fb923c" stroke-width="2.4" />
    </svg>
  );
}

/** Text als Datei herunterladen. @param {string} text @param {string} name @param {string} type */
export function download(text, name, type) {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Datei auswählen und als Text lesen. @param {string} accept @returns {Promise<string | null>} */
export function pickFile(accept) {
  // Ein verstecktes Feld für alle Aufrufe; der Wert wird zurückgesetzt, damit dieselbe Datei erneut geht
  let input = /** @type {HTMLInputElement | null} */ (document.getElementById('filePicker'));
  if (!input) {
    input = document.createElement('input');
    input.type = 'file';
    input.id = 'filePicker';
    input.hidden = true;
    document.body.appendChild(input);
  }
  const el = input;
  el.accept = accept;
  el.value = '';
  return new Promise(resolve => {
    el.onchange = async () => {
      const file = el.files && el.files[0];
      resolve(file ? await file.text() : null);
    };
    el.oncancel = () => resolve(null);
    el.click();
  });
}

/** Kreis mit Initialen. @param {{ name: string }} props */
export function Avatar({ name }) {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) % Model.COLORS.length;
  return <span class="avatar" aria-hidden="true" style={{ background: name.trim() ? Model.COLORS[h] : '#868e96' }}>{Util.initials(name)}</span>;
}

/** Status-Chip einer Antwort. @param {{ state: Evidence, short?: boolean }} props */
export function EvidenceChip({ state, short }) {
  return <span class={`chip sm ev-${state}`} title={Texts.evidence[state]}>{Texts.evidence.icons[state]}{short ? '' : ` ${Texts.evidence[state]}`}</span>;
}

/** Schalter (Checkbox mit Schalter-Optik). @param {{ id: string, checked: boolean, disabled?: boolean, label: string, onChange: (v: boolean) => void }} props */
export function Switch({ id, checked, disabled, label, onChange }) {
  return (
    <input type="checkbox" role="switch" class="switch" id={id} checked={checked} disabled={disabled} aria-label={label}
      onChange={e => onChange(/** @type {HTMLInputElement} */ (e.currentTarget).checked)} />
  );
}
