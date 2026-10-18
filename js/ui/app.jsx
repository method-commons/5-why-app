/*
 * Rahmen der App: Kopfzeile mit Schritten und Menü, Inhalt je Route, Dialoge, Meldungen.
 */
import { useEffect } from 'preact/hooks';
import { Checks } from '../checks.js';
import { IO } from '../io.js';
import { Store } from '../storage.js';
import { Languages, Texts } from '../texts.js';
import { Util } from '../util.js';
import { ActionsView } from './actions.jsx';
import { download, Logo, useMenu } from './components.jsx';
import { deleteAnalysis, duplicateAnalysis } from './manage.js';
import { canRedo, canUndo, commitEdit, dialog, goTab, redo, route, toasts, undo, useAnalysis, useRevision } from './core.js';
import { openHelp } from './help.jsx';
import { Home, importFiles, openExample } from './home.jsx';
import { ProblemView } from './problem.jsx';
import { Report } from './report.jsx';
import { openSettings } from './settings.jsx';
import { WhyView } from './why.jsx';

/** @param {string} lang */
function switchLanguage(lang) {
  commitEdit();
  Languages.choose(lang);
  location.reload();
}

function Menu() {
  const [open, setOpen, ref] = useMenu();
  const r = route.value;
  const a = useAnalysis();
  /** @param {() => void} fn */
  const run = fn => () => { setOpen(false); fn(); };
  const lang = Languages.detect();
  const M = Texts.menu;
  return (
    <div class="menu" ref={ref}>
      <button type="button" class="btn ghost" id="menuBtn" aria-haspopup="true" aria-expanded={open} onClick={() => setOpen(!open)}>
        {Texts.ui.menu} ▾
      </button>
      {open && (
        <div class="menu-list" id="menuList" role="menu">
          {r.view === 'analysis' && a && <>
            <button type="button" role="menuitem" data-action="settings" onClick={run(() => openSettings())}>{M.settings}</button>
            <button type="button" role="menuitem" data-action="export" onClick={run(() => download(IO.analysisJson(a), Util.fileName(a.name, 'json'), 'application/json'))}>{M.exportJson}</button>
            <button type="button" role="menuitem" data-action="markdown" onClick={run(() => download(IO.markdown(a), Util.fileName(a.name, 'md'), 'text/markdown'))}>{M.exportMarkdown}</button>
            <button type="button" role="menuitem" data-action="duplicate" onClick={run(() => duplicateAnalysis(a))}>{M.duplicate}</button>
            <button type="button" role="menuitem" data-action="delete" onClick={run(() => deleteAnalysis(a))}>{M.delete}</button>
            <hr />
          </>}
          {r.view === 'home' && <>
            <button type="button" role="menuitem" data-action="import" onClick={run(() => importFiles())}>{M.import}</button>
            <button type="button" role="menuitem" data-action="backup" onClick={run(() => download(IO.backupJson(Store.all()), `5-warum-${Util.today()}.json`, 'application/json'))}>{M.backup}</button>
            <button type="button" role="menuitem" data-action="example" onClick={run(() => openExample())}>{M.example}</button>
            <hr />
          </>}
          <button type="button" role="menuitem" data-action="help" onClick={run(() => openHelp())}>{M.help}</button>
          <hr />
          <div class="menu-label">{M.language}</div>
          {Object.keys(Languages.packs).map(l => (
            <button type="button" role="menuitemradio" aria-checked={l === lang} key={l} data-lang={l} onClick={run(() => switchLanguage(l))}>
              {l === lang ? '✓ ' : ''}{Languages.packs[l].languageName}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** @type {readonly import('./core.js').Tab[]} */
const NAV = ['problem', 'why', 'actions', 'report'];

function Header() {
  const r = route.value;
  const a = useAnalysis();
  const inAnalysis = r.view === 'analysis' && a;
  const phase = inAnalysis ? Checks.phase(a) : 0;
  // Schritt erledigt: Problem ab Phase 1, Warum-Analyse ab Grundursache, Maßnahmen ab umgesetzt
  const doneAt = { problem: 1, why: 3, actions: 4, report: 99 };
  return (
    <header class="app-header">
      <a class="brand" href="#/" title={Texts.ui.allAnalyses} id="homeLink">
        <Logo />
        <span class="brand-name">{Texts.appName}</span>
      </a>
      {inAnalysis && (
        <a class="project-name" href={`#/a/${a.id}/problem`} id="analysisName" title={a.name}>
          <span class="dot" style={{ background: a.color }} />{a.name}
        </a>
      )}
      {inAnalysis && (
        <nav class="nav seg" aria-label={Texts.ui.views}>
          {NAV.map((tab, i) => {
            const on = r.tab === tab;
            const done = phase >= doneAt[tab];
            return (
              <a key={tab} href={`#/a/${a.id}/${tab}`} class={`${on ? 'on' : ''}${done ? ' done' : ''}`} aria-current={on ? 'page' : undefined} data-nav={tab}
                onClick={e => { if (tab === 'why') { e.preventDefault(); goTab('why'); } }}>
                <span class="num" aria-hidden="true">{done && !on ? '✓' : i + 1}</span>
                <span class="nav-icon" aria-hidden="true">{Texts.nav.icons[tab]}</span>{Texts.nav[tab]}
              </a>
            );
          })}
        </nav>
      )}
      <span class="spacer" />
      {inAnalysis && <>
        <button type="button" class="icon-btn" id="undoBtn" title={Texts.ui.undo} aria-label={Texts.ui.undo} disabled={!canUndo()} onClick={undo}>↶</button>
        <button type="button" class="icon-btn" id="redoBtn" title={Texts.ui.redo} aria-label={Texts.ui.redo} disabled={!canRedo()} onClick={redo}>↷</button>
      </>}
      <button type="button" class="btn ghost" id="helpBtn" onClick={() => openHelp()}>? <span class="hide-narrow">{Texts.ui.method}</span></button>
      <Menu />
    </header>
  );
}

function Toasts() {
  return (
    <div class="toasts" aria-live="polite">
      {toasts.value.map(t => (
        <div class="toast" key={t.id}>
          {t.text}
          {t.action && <button type="button" class="link" onClick={t.action.run}>{t.action.label}</button>}
        </div>
      ))}
    </div>
  );
}

export function App() {
  useRevision();
  const r = route.value;
  const a = useAnalysis();
  const docTitle = r.view === 'home' || !a ? Texts.appName : `${a.name} – ${Texts.appName}`;
  useEffect(() => { document.title = docTitle; }, [docTitle]);
  const Dlg = dialog.value;
  return (
    <>
      <Header />
      <main id="main">
        {r.view === 'home' && <Home />}
        {r.view === 'analysis' && a && r.tab === 'problem' && <ProblemView />}
        {r.view === 'analysis' && a && r.tab === 'why' && <WhyView mode={r.mode} lens={r.lens} />}
        {r.view === 'analysis' && a && r.tab === 'actions' && <ActionsView />}
        {r.view === 'analysis' && a && r.tab === 'report' && <Report />}
      </main>
      {Dlg && <Dlg />}
      <Toasts />
    </>
  );
}
