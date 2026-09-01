import type { MapModeEntry } from '../../bridge-types.generated.ts';
import { useWebUIText } from '../../localization/WebUITextContext';
import { useSettingsBridge } from '../../bridge/app/useSettingsBridge';
import { useActiveInputDevice } from '../../hooks/useActiveInputDevice';
import type { ActionBindingLike } from '../../utils/actionBindings';
import { findActionBinding, getMapModeActionName } from '../../utils/actionBindings';
import { ActionKeyGlyph } from '../common/ActionKeyGlyph';
import { KeyGlyph } from '../common/KeyGlyph';
import { MapModeTooltip, TTHeader, TTMuted, TTBullets } from './MapModeTooltip';

export interface MapModeTooltipDefinition {
  titleKey: string;
  bodyKey?: string;
  bulletKeys?: readonly string[];
  footerKeys?: readonly string[];
}

function MapModeHoldHint() {
  const t = useWebUIText();
  const template = t('MapModeTooltip.HoldForDetails');
  const glyph = <KeyGlyph keyDisplay={t('Settings.KeyModifier.Alt')} />;
  const token = '{Key}';
  const index = template.indexOf(token);
  const content = index < 0
    ? <>{template} {glyph}</>
    : <>{template.slice(0, index)}{glyph}{template.slice(index + token.length)}</>;

  return <span className="mmtt-hold-hint">{content}</span>;
}

function MapModeShortcutFooter({ binding }: { binding: ActionBindingLike | null }) {
  return (
    <div className="mmtt-shortcut">
      <MapModeHoldHint />
      {binding && <ActionKeyGlyph binding={binding} />}
    </div>
  );
}

export function FallbackMapModeTooltip({
  id,
  label,
  entry,
}: {
  id: string;
  label: string;
  entry?: MapModeEntry;
}) {
  const { settings } = useSettingsBridge();
  const activeInputDevice = useActiveInputDevice(
    settings?.activeInputDevice === 'gamepad' ? 'gamepad' : 'keyboard',
  );
  const binding = findActionBinding(settings?.controls, getMapModeActionName(id), activeInputDevice);
  const body = entry?.tooltip || entry?.description;

  return (
    <MapModeTooltip>
      <TTHeader>{label}</TTHeader>
      {body && <p>{body}</p>}
      <MapModeShortcutFooter binding={binding} />
    </MapModeTooltip>
  );
}

export default function LocalizedMapModeTooltip({
  definition,
  modeId,
}: {
  definition: MapModeTooltipDefinition;
  modeId: string;
}) {
  const t = useWebUIText();
  const { settings } = useSettingsBridge();
  const activeInputDevice = useActiveInputDevice(
    settings?.activeInputDevice === 'gamepad' ? 'gamepad' : 'keyboard',
  );
  const binding = findActionBinding(settings?.controls, getMapModeActionName(modeId), activeInputDevice);

  return (
    <MapModeTooltip>
      <TTHeader>{t(definition.titleKey)}</TTHeader>
      {definition.bodyKey && <p>{t(definition.bodyKey)}</p>}
      {definition.bulletKeys && <TTBullets items={definition.bulletKeys.map(key => t(key))} />}
      {definition.footerKeys?.map(key => <TTMuted key={key}>{t(key)}</TTMuted>)}
      <MapModeShortcutFooter binding={binding} />
    </MapModeTooltip>
  );
}
