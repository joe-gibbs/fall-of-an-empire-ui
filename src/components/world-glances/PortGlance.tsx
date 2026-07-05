import type { CSSProperties } from 'react';
import Tooltip, { type TooltipContent, type TooltipLine } from '../common/tooltips/Tooltip';
import type { PortGlanceData } from './WorldGlanceTypes';
import { formatNumber } from '../../utils/numberFormat';
import { useGameState } from '../../context/GameContext';
import { FoaeCefUIAssetPath } from '../../utils/assets';
import { readableFactionTextColour, relationDisplayColour, relationDisplayLabel } from './WorldGlancePresentation';

import { webUIText } from '../../localization/WebUITextContext';
type PortBadgeLayer = 'shadow' | 'background' | 'enamel-mask' | 'enamel-light' | 'foreground';

function portBadgeLayerPath(layer: PortBadgeLayer): string {
  return `/assets/glance/settlement-types-v3/layers/settlement-badge-port-${layer}.png`;
}

function portLevelRoman(level: number): string {
  const numerals: Array<[number, string]> = [
    [1000, 'M'],
    [900, 'CM'],
    [500, 'D'],
    [400, 'CD'],
    [100, 'C'],
    [90, 'XC'],
    [50, 'L'],
    [40, 'XL'],
    [10, 'X'],
    [9, 'IX'],
    [5, 'V'],
    [4, 'IV'],
    [1, 'I'],
  ];

  let remaining = Math.floor(level);
  let result = '';
  for (const [value, glyph] of numerals) {
    while (remaining >= value) {
      result += glyph;
      remaining -= value;
    }
  }
  return result;
}

function portTooltip(data: PortGlanceData, debugMode: boolean): TooltipContent {
  const lines: TooltipLine[] = [
    {
      label: webUIText('Auto.Prop.ComponentsWorldGlancesPortGlance.31.1'),
      value: data.settlementName,
      valueIcon: '/assets/icons/I_City.png',
    },
    {
      label: webUIText('Auto.Prop.ComponentsWorldGlancesPortGlance.36.2'),
      value: data.faction.name,
      valueColor: readableFactionTextColour(data.faction.colour),
    },
    {
      label: webUIText('Auto.Prop.ComponentsWorldGlancesPortGlance.41.3'),
      value: relationDisplayLabel(data.faction.relation, data.warWithPlayer),
      valueColor: relationDisplayColour(data.faction.relation, data.warWithPlayer),
    },
    {
      label: webUIText('Auto.Prop.ComponentsWorldGlancesPortGlance.45.4'),
      value: formatNumber(data.tradeValue, { maximumFractionDigits: 1 }),
      valueColor: data.tradeValue > 0 ? 'var(--gold-light)' : 'var(--text-muted)',
      valueIcon: '/assets/icons/Treaties/I_TradeAgreement.png',
    },
    {
      label: webUIText('Auto.Prop.ComponentsWorldGlancesPortGlance.51.5'),
      get value() { return data.blockaded ? webUIText("Auto.Fix.PropExprTrue.componentsworldglancesPortGlance.53.1") : webUIText("Auto.Fix.PropExprFalse.componentsworldglancesPortGlance.53.1"); },
      valueColor: data.blockaded ? 'var(--red)' : 'var(--green)',
    },
  ];

  if (data.dockedNavyName) {
    lines.push({
      label: webUIText('Auto.Prop.ComponentsWorldGlancesPortGlance.59.6'),
      get value() { return webUIText("Auto.Prop.componentsworldglancesPortGlance.61.1", { DockedNavyName: data.dockedNavyName, Value2: formatNumber(data.dockedNavyStrength) }); },
      valueIcon: '/assets/icons/I_NaviesQuickButton.png',
    });
  }

  if (data.blockadingNavies > 0) {
    lines.push({
      label: webUIText('Auto.Prop.ComponentsWorldGlancesPortGlance.67.7'),
      get value() { return webUIText("Auto.Prop.componentsworldglancesPortGlance.69.1", { Value1: formatNumber(data.blockadingNavies), Value2: formatNumber(data.blockadingStrength) }); },
      valueColor: 'var(--red)',
      valueIcon: '/assets/icons/I_NaviesQuickButton.png',
    });
  }

  if (debugMode) {
    lines.push({ label: webUIText('Auto.Prop.ComponentsWorldGlancesPortGlance.75.8'), isHeader: true });
    lines.push({ label: webUIText('Auto.Prop.ComponentsWorldGlancesPortGlance.76.9'), value: `#${formatNumber(data.debugShortId ?? 0)}` });
    lines.push({ label: webUIText('Auto.Prop.ComponentsWorldGlancesPortGlance.77.10'), value: `#${formatNumber(data.faction.debugShortId ?? 0)}` });
  }

  return {
    title: data.name,
    get body() { return data.blockaded ? webUIText("Auto.Fix.PropExprTrue.componentsworldglancesPortGlance.84.1", { SettlementName: data.settlementName }) : webUIText("Auto.Fix.PropExprFalse.componentsworldglancesPortGlance.85.1", { SettlementName: data.settlementName }); },
    lines,
  };
}

interface PortGlanceProps {
  data: PortGlanceData;
}

export default function PortGlance({ data }: PortGlanceProps) {
  const { debugMode } = useGameState();
  const rootClass = [
    'glance',
    'glance--port',
    data.selected ? 'is-selected' : '',
    data.targeted ? 'is-targeted' : '',
    data.blockaded ? 'is-blockaded' : '',
  ].filter(Boolean).join(' ');
  const levelLabel = portLevelRoman(data.level);
  const badgeShadow = FoaeCefUIAssetPath(portBadgeLayerPath('shadow'));
  const badgeBackground = FoaeCefUIAssetPath(portBadgeLayerPath('background'));
  const badgeMask = FoaeCefUIAssetPath(portBadgeLayerPath('enamel-mask'));
  const badgeLight = FoaeCefUIAssetPath(portBadgeLayerPath('enamel-light'));
  const badgeForeground = FoaeCefUIAssetPath(portBadgeLayerPath('foreground'));

  return (
    <Tooltip
      content={portTooltip(data, debugMode)}
      position="top"
      delay={520}
      bubbleClassName="tt-bubble--glance"
    >
      <div
        className={rootClass}
        style={{
          '--faction-colour': data.faction.colour,
        } as CSSProperties}
      >
        {debugMode && data.debugShortId !== undefined && (
          <div className="glance-debug-id">#{formatNumber(data.debugShortId)}</div>
        )}
        {levelLabel && <div className="gport-level-label" aria-hidden="true">{levelLabel}</div>}
        <div className="gport-badge" aria-hidden="true">
          <span className="gport-selected-indicator" />
          <span className="gport-target-indicator" />
          <span className="gport-badge-core">
            <img className="gport-badge-layer gport-badge-layer--shadow" src={badgeShadow} alt="" />
            <img className="gport-badge-layer gport-badge-layer--background" src={badgeBackground} alt="" />
            <span
              className="gport-badge-layer gport-badge-layer--tint"
              style={{ backgroundColor: data.faction.colour, maskImage: `url("${badgeMask}")` }}
            />
            <img className="gport-badge-layer gport-badge-layer--light" src={badgeLight} alt="" />
            <img className="gport-badge-layer gport-badge-layer--foreground" src={badgeForeground} alt="" />
          </span>
        </div>
        {data.blockaded && (
          <div className="gport-blockade-badge" aria-hidden="true">
            <img src="/assets/icons/I_Siege.png" alt="" />
          </div>
        )}
      </div>
    </Tooltip>
  );
}
