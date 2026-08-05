import React, { useCallback, useEffect, useState } from 'react';
import GameButton from '../common/buttons/GameButton';
import CloseButton from '../common/buttons/CloseButton';
import {
  Dropdown,
  EventModelSelection,
  SettingsSlider,
  Toggle,
} from '../settings/SettingsPanel';
import { applyGameplayCssVariables, applyUIScaleCssVariable } from '../../utils/gameplaySettingsCss';
import { useAnimatedPresence } from '../../hooks/useAnimatedPresence';
import { useEscapeStackEntry } from '../../context/EscapeStack';
import { acknowledgeBridgeFailure } from '../../bridge/core/runtimeEngine';
import { bridgeCall, onBridgeEvent } from '../../bridge-types.generated.ts';
import type {
  ApplySettingsRequest,
  GetSettingsResponse,
  LlmModelDTO,
  SettingsGameplayDTO,
} from '../../bridge-types.generated.ts';
import { webUIText, WebUIText } from '../../localization/WebUITextContext';
import { UI_MOTION } from '../../config/motion';
import './InitialSetupModal.css';

interface InitialSetupModalProps {
  autoOpen: boolean;
}

const SAVE_FREQUENCY_OPTIONS = [
  { value: 'Monthly', get label() { return webUIText('Auto.Prop.ComponentsSettingsSettingsPanel.741.17'); } },
  { value: 'SixMonths', get label() { return webUIText('Auto.Prop.ComponentsSettingsSettingsPanel.741.18'); } },
  { value: 'Yearly', get label() { return webUIText('Auto.Prop.ComponentsSettingsSettingsPanel.741.19'); } },
  { value: 'Never', get label() { return webUIText('Auto.Prop.ComponentsSettingsSettingsPanel.741.20'); } },
];

const MODEL_RECOMMENDATION_ORDER = ['Large.gguf', 'Medium.gguf', 'Small.gguf'];

function recommendModel(
  models: LlmModelDTO[],
  hardware: GetSettingsResponse['hardware'],
): string | undefined {
  if (hardware.videoMemoryMB <= 0 || hardware.systemMemoryMB <= 0) return undefined;

  return MODEL_RECOMMENDATION_ORDER.find(filename => {
    const model = models.find(candidate => candidate.filename === filename);
    return model !== undefined
      && model.vramRequirementMB > 0
      && model.ramRequirementMB > 0
      && model.vramRequirementMB <= hardware.videoMemoryMB
      && model.ramRequirementMB <= hardware.systemMemoryMB;
  });
}

const InitialSetupModal: React.FC<InitialSetupModalProps> = ({ autoOpen }) => {
  const [settings, setSettings] = useState<GetSettingsResponse | null>(null);
  const [workingGameplay, setWorkingGameplay] = useState<SettingsGameplayDTO | null>(null);
  const [completed, setCompleted] = useState<boolean | null>(null);
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [saveError, setSaveError] = useState(false);

  const refreshSettings = useCallback(async () => {
    const response = await bridgeCall('game.get_settings');
    setSettings(response);
    setWorkingGameplay({
      ...response.gameplay,
      mutedNotificationTypes: [...response.gameplay.mutedNotificationTypes],
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      bridgeCall('game.get_initial_setup'),
      bridgeCall('game.get_settings'),
    ]).then(([setup, settingsResponse]) => {
      if (cancelled) return;
      setCompleted(setup.completed);
      setSettings(settingsResponse);
      setWorkingGameplay({
        ...settingsResponse.gameplay,
        mutedNotificationTypes: [...settingsResponse.gameplay.mutedNotificationTypes],
      });
      if (autoOpen && !setup.completed) setVisible(true);
    }).catch(acknowledgeBridgeFailure);

    return () => {
      cancelled = true;
    };
  }, [autoOpen]);

  useEffect(() => onBridgeEvent('game.get_initial_setup', (event) => {
    if (!event.forceOpen && event.completed) return;
    setCompleted(event.completed);
    setSaveError(false);
    setVisible(true);
    void refreshSettings().catch(acknowledgeBridgeFailure);
  }), [refreshSettings]);

  const presence = useAnimatedPresence(visible, { durationMs: UI_MOTION.panelCloseMs });
  const canClose = completed === true && !busy;
  const close = useCallback(() => {
    if (!canClose) return;
    if (settings) applyGameplayCssVariables(settings.gameplay);
    setVisible(false);
    setSaveError(false);
  }, [canClose, settings]);

  useEscapeStackEntry({
    id: 'modal.initial-setup',
    active: presence.mounted && canClose,
    onClose: close,
    allowFromInput: true,
  });

  const setGameplay = (patch: Partial<SettingsGameplayDTO>) => {
    setWorkingGameplay(current => current ? { ...current, ...patch } : current);
  };

  const setUIScale = (value: number) => {
    const uiScale = value / 100;
    setGameplay({ uiScale });
    applyUIScaleCssVariable(uiScale);
  };

  const save = async (playTutorial: boolean) => {
    if (!settings || !workingGameplay || busy) return;
    setBusy(true);
    setSaveError(false);

    const request: ApplySettingsRequest = {
      video: { ...settings.video },
      audio: { ...settings.audio },
      gameplay: {
        ...workingGameplay,
        mutedNotificationTypes: [...workingGameplay.mutedNotificationTypes],
      },
      graphics: { ...settings.graphics },
    };

    try {
      await bridgeCall('game.apply_settings', request);
      applyGameplayCssVariables(workingGameplay);
      await bridgeCall('game.complete_initial_setup');
      setCompleted(true);
      setVisible(false);

      if (playTutorial) {
        await bridgeCall('game.start_scenario_map', { mapId: 'Tutorial', playerFactionBaseName: '' });
      }
    } catch (error) {
      acknowledgeBridgeFailure(error);
      setVisible(true);
      setSaveError(true);
    } finally {
      setBusy(false);
    }
  };

  if (!presence.mounted || !settings || !workingGameplay) return null;

  const recommendedModelFilename = recommendModel(settings.availableLlmModels, settings.hardware);

  return (
    <div className={`initial-setup-overlay${presence.closing ? ' initial-setup-overlay--closing' : ''}`}>
      <div
        className={`modal initial-setup-modal${presence.closing ? ' initial-setup-modal--closing' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="initial-setup-title"
        aria-describedby="initial-setup-intro"
      >
        <header className="initial-setup__header">
          <div>
            <h1 id="initial-setup-title" className="initial-setup__title"><WebUIText textKey="InitialSetup.Title" /></h1>
            <p id="initial-setup-intro" className="initial-setup__intro"><WebUIText textKey="InitialSetup.Intro" /></p>
          </div>
          {canClose && <CloseButton size="sm" onClick={close} />}
        </header>

        <div className="initial-setup__body">
          <section className="initial-setup__models">
            <EventModelSelection
              llmProvider={workingGameplay.llmProvider}
              localLlmModel={workingGameplay.localLlmModel}
              eventFrequency={workingGameplay.eventFrequency}
              models={settings.availableLlmModels}
              hardware={settings.hardware}
              setGameplay={setGameplay}
              showEventFrequency={false}
              recommendedModelFilename={recommendedModelFilename}
            />
          </section>

          <aside className="initial-setup__side">
            <section className="initial-setup__preferences">
              <h2><WebUIText textKey="InitialSetup.Preferences.Title" /></h2>
              <SettingsSlider
                label={webUIText('Auto.Attr.ComponentsSettingsSettingsPanel.751.34')}
                value={Math.round(workingGameplay.uiScale * 100)}
                min={50}
                max={150}
                suffix="%"
                onChange={setUIScale}
              />
              <Toggle
                label={webUIText('Settings.ReduceMotion.Label')}
                desc={webUIText('Settings.ReduceMotion.Description')}
                checked={workingGameplay.reduceMotion}
                onChange={() => setGameplay({ reduceMotion: !workingGameplay.reduceMotion })}
              />
              <Dropdown
                label={webUIText('Auto.Attr.ComponentsSettingsSettingsPanel.741.16')}
                value={workingGameplay.saveFrequency}
                options={SAVE_FREQUENCY_OPTIONS}
                popupClassName="initial-setup__autosave-popup"
                onChange={value => setGameplay({ saveFrequency: value })}
              />
            </section>
          </aside>
        </div>

        <footer className="initial-setup__footer">
          <span className="initial-setup__footer-copy"><WebUIText textKey="InitialSetup.Footer" /></span>
          {saveError && <span className="initial-setup__error"><WebUIText textKey="InitialSetup.SaveError" /></span>}
          <div className="initial-setup__actions">
            <GameButton variant="outline" disabled={busy} onClick={() => { void save(false); }}>
              <WebUIText textKey="InitialSetup.Continue" />
            </GameButton>
            <GameButton variant="burgundy" disabled={busy} onClick={() => { void save(true); }}>
              <WebUIText textKey="InitialSetup.PlayTutorial" />
            </GameButton>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default InitialSetupModal;
