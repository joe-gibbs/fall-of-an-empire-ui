import { useWebUIText } from '../../localization/WebUITextContext';
import { useSettingsBridge } from '../../bridge/app/useSettingsBridge';
import { useActiveInputDevice } from '../../hooks/useActiveInputDevice';
import { findActionBinding, getMapModeActionName } from '../../utils/actionBindings';
import { ActionKeyGlyph } from '../common/ActionKeyGlyph';
import { MapModeTooltip, TTHeader, TTMuted, TTBullets } from './MapModeTooltip';

export interface MapModeTooltipDefinition {
  titleKey: string;
  bodyKey?: string;
  bulletKeys?: readonly string[];
  footerKeys?: readonly string[];
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
      {binding && (
        <div className="mmtt-shortcut">
          <ActionKeyGlyph binding={binding} />
        </div>
      )}
    </MapModeTooltip>
  );
}
