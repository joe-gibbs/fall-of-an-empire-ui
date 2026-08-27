import { useMemo } from 'react';
import { useSettingsBridge } from '../bridge/app/useSettingsBridge';
import { ActionKeyGlyph } from '../components/common/ActionKeyGlyph';
import { webUIText } from '../localization/WebUITextContext';
import { findActionBinding } from '../utils/actionBindings';
import { useGamepadFocus, type ControllerAppMode } from './GamepadFocusContext';
import { useInputMode } from './InputModeContext';
import './GamepadFocus.css';

interface PromptDefinition {
  action: string;
  labelKey: string;
}

const UI_PROMPTS: readonly PromptDefinition[] = [
  { action: 'Select', labelKey: 'Controller.Prompt.Select' },
  { action: 'OpenEscapeMenu', labelKey: 'Controller.Prompt.Back' },
  { action: 'Command', labelKey: 'Controller.Prompt.Secondary' },
];

const WORLD_PROMPTS: readonly PromptDefinition[] = [
  { action: 'Select', labelKey: 'Controller.Prompt.Select' },
  { action: 'Command', labelKey: 'Controller.Prompt.Order' },
  { action: 'OpenEscapeMenu', labelKey: 'Controller.Prompt.Cancel' },
  { action: 'SelectAllMilitaries', labelKey: 'Controller.Prompt.SelectAll' },
];

export default function GamepadPromptLayer({ appMode }: { appMode: ControllerAppMode }) {
  const device = useInputMode();
  const { settings } = useSettingsBridge();
  const { ownsUIInput } = useGamepadFocus();
  const definitions = appMode === 'mainmenu' || ownsUIInput ? UI_PROMPTS : WORLD_PROMPTS;
  const prompts = useMemo(() => definitions.map(definition => ({
    ...definition,
    binding: findActionBinding(settings?.controls, definition.action, 'gamepad'),
  })).filter(prompt => prompt.binding), [definitions, settings?.controls]);

  if (device !== 'gamepad' || appMode === null) return null;

  return (
    <>
      {appMode === 'ingame' && !ownsUIInput && (
        <div className="gamepad-world-reticle" aria-hidden="true">
          <span className="gamepad-world-reticle__horizontal" />
          <span className="gamepad-world-reticle__vertical" />
        </div>
      )}
      <div
        className={`gamepad-prompt-bar gamepad-prompt-bar--${ownsUIInput || appMode === 'mainmenu' ? 'ui' : 'world'}`}
        aria-label={webUIText('Controller.PromptBar')}
      >
        {prompts.map(prompt => (
          <span className="gamepad-prompt" key={prompt.action}>
            <ActionKeyGlyph binding={prompt.binding} />
            <span className="gamepad-prompt__label">{webUIText(prompt.labelKey)}</span>
          </span>
        ))}
      </div>
    </>
  );
}
