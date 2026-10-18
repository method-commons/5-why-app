/*
 * Einstellungen der Analyse (Dialog): optionale Blickwinkel, Ishikawa mit Kategorien, Person und
 * Termin bei Maßnahmen, Farbe; auf Wunsch als Standard für neue Analysen.
 */
import { useState } from 'preact/hooks';
import { Model } from '../model.js';
import { Ops } from '../ops.js';
import { Texts } from '../texts.js';
import { Dialog, Switch } from './components.jsx';
import { changePreset } from './ishikawa.jsx';
import { closeDialog, mutate, openDialog, setPrefs, useAnalysis } from './core.js';

export function openSettings() {
  openDialog(() => <SettingsDialog />);
}

/** @param {{ id: keyof Settings, name: any, help: string, fixed?: boolean }} props */
function Option({ id, name, help, fixed }) {
  const a = useAnalysis();
  return (
    <div class="opt">
      <label for={`set-${id}`}><b>{name}</b><span>{help}</span></label>
      <Switch id={`set-${id}`} label={typeof name === 'string' ? name : Texts.lens[/** @type {Lens} */ (id)].title} checked={fixed || a.settings[id]} disabled={fixed}
        onChange={v => mutate(x => Ops.setSetting(x, id, v))} />
    </div>
  );
}

function SettingsDialog() {
  const a = useAnalysis();
  const S = Texts.settings;
  const [asDefault, setAsDefault] = useState(false);
  const finish = () => {
    if (asDefault) setPrefs({ defaults: { ...a.settings } });
    closeDialog();
  };
  const lensName = (/** @type {Lens} */ l) => <><i class={`lens-dot lens-${l}`} />{Texts.lens[l].title}</>;
  return (
    <Dialog title={S.title} id="settingsDialog" onClose={finish}>
      <div class="dialog-body settings">
        <h3>{S.lenses}</h3>
        <div class="opt">
          <div><b>{lensName('occurrence')}</b><span>{S.occurrenceHelp}</span></div>
          <Switch id="set-occurrence" label={Texts.lens.occurrence.title} checked disabled onChange={() => {}} />
        </div>
        <Option id="detection" name={lensName('detection')} help={S.detectionHelp} />
        <Option id="system" name={lensName('system')} help={S.systemHelp} />

        <h3>{S.ishikawa}</h3>
        <Option id="ishikawa" name={S.ishikawaName} help={S.ishikawaHelp} />
        {a.settings.ishikawa && (
          <div class="sub-opts">
            <span>{S.preset}</span>
            {Model.PRESETS.map(p => (
              <button type="button" key={p} class={`chip${a.preset === p ? ' acc' : ''}`} aria-pressed={a.preset === p} data-preset={p} onClick={() => changePreset(a, p, openSettings)}>{Texts.ishikawa.presets[p].name}</button>
            ))}
            <span class="break" />
            {a.categories.map(c => <span class="chip" key={c.id}>{Model.categoryName(a, c.id)}</span>)}
          </div>
        )}

        <h3>{S.actions}</h3>
        <Option id="owner" name={S.owner} help={S.ownerHelp} />
        <Option id="due" name={S.due} help={S.dueHelp} />

        <h3>{S.color}</h3>
        <div class="colors" role="group" aria-label={S.color}>
          {Model.COLORS.map(c => (
            <button type="button" key={c} class={`swatch${a.color === c ? ' on' : ''}`} style={{ background: c }} aria-label={c} aria-pressed={a.color === c} onClick={() => mutate(x => { x.color = c; })} />
          ))}
        </div>
      </div>
      <div class="dialog-foot">
        <label class="check-inline"><input type="checkbox" id="asDefault" checked={asDefault} onChange={e => setAsDefault(/** @type {HTMLInputElement} */ (e.currentTarget).checked)} />{S.asDefault}</label>
        <span class="spacer" />
        <span class="sub small hide-narrow">{S.kept}</span>
        <button type="button" class="btn primary" id="settingsDone" onClick={finish}>{Texts.ui.done}</button>
      </div>
    </Dialog>
  );
}

