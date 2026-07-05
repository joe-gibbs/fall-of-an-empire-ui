import { useWebUIText } from '../../localization/WebUITextContext';
import { MapModeTooltip, TTHeader, TTMuted, TTBullets } from './MapModeTooltip';

export interface MapModeTooltipDefinition {
  titleKey: string;
  bodyKey?: string;
  bulletKeys?: readonly string[];
  footerKeys?: readonly string[];
}

export default function LocalizedMapModeTooltip({ definition }: { definition: MapModeTooltipDefinition }) {
  const t = useWebUIText();

  return (
    <MapModeTooltip>
      <TTHeader>{t(definition.titleKey)}</TTHeader>
      {definition.bodyKey && <p>{t(definition.bodyKey)}</p>}
      {definition.bulletKeys && <TTBullets items={definition.bulletKeys.map(key => t(key))} />}
      {definition.footerKeys?.map(key => <TTMuted key={key}>{t(key)}</TTMuted>)}
    </MapModeTooltip>
  );
}
