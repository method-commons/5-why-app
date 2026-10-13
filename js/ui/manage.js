/*
 * Verwalten ganzer Analysen aus Menü und Startseite: löschen (mit Rückgängig) und duplizieren.
 */
import { Ops } from '../ops.js';
import { Store } from '../storage.js';
import { Texts } from '../texts.js';
import { confirmDialog, fill } from './components.jsx';
import { analysis as current, discardAnalysis, flushSave, go, render, toast } from './core.js';

/** Geöffnete Analyse löschen (mit Rückfrage). @param {Analysis} a */
export function deleteAnalysis(a) {
  confirmDialog({
    title: Texts.analysis.deleteTitle,
    text: fill(Texts.analysis.deleteText, { name: a.name }),
    ok: Texts.ui.delete,
    danger: true,
    onOk: () => {
      const copy = JSON.parse(JSON.stringify(a));
      if (current && current.id === a.id) discardAnalysis();
      Store.removeAnalysis(a.id);
      go({ view: 'home' });
      toast(Texts.analysis.deleted, { label: Texts.ui.undone, run: () => { Store.save(copy); go({ view: 'home' }); render(); } });
      render();
    },
  });
}

/** Analyse duplizieren und öffnen. @param {Analysis} a */
export function duplicateAnalysis(a) {
  flushSave();
  const copy = Ops.duplicate(a, Texts.analysis.copySuffix);
  Store.save(copy);
  toast(Texts.analysis.duplicated);
  go({ view: 'analysis', aid: copy.id, tab: 'problem', mode: 'chain', lens: 'occurrence' });
}

