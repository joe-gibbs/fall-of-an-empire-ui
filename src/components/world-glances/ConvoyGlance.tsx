import type { CSSProperties } from 'react';
import Tooltip, { type TooltipContent, type TooltipLine } from '../common/tooltips/Tooltip';
import type { ConvoyGlanceData } from './WorldGlanceTypes';
import { clampUnitFraction } from './glanceMath';
import { formatNumber, formatPercent } from '../../utils/numberFormat';
import { useGameState } from '../../context/GameContext';
import { FoaeCefUIAssetPath } from '../../utils/assets';
import FactionRoundel from '../common/entities/FactionRoundel';
import { readableFactionTextColour, relationDisplayColour, relationDisplayLabel } from './WorldGlancePresentation';

import { webUIText } from '../../localization/WebUITextContext';
function relationBorderColour(relation: ConvoyGlanceData['faction']['relation']): string {
  if (relation === 'ally') return 'rgba(112, 170, 106, 0.72)';
  if (relation === 'enemy') return 'rgba(204, 75, 55, 0.82)';
  if (relation === 'own') return 'rgba(224, 200, 114, 0.7)';
  return 'rgba(166, 150, 102, 0.42)';
}

function routeIcon(routeType: ConvoyGlanceData['routeType']): string {
  return routeType === 'sea' ? '/assets/icons/I_Port.png' : '/assets/icons/I_Resources.png';
}

function routeLabel(routeType: ConvoyGlanceData['routeType']): string {
  return webUIText(routeType === 'sea'
    ? 'WorldGlances.Convoy.Route.Sea'
    : 'WorldGlances.Convoy.Route.Road');
}

function etaText(days: number): string {
  if (!Number.isFinite(days) || days <= 0) return webUIText("Auto.Return.componentsworldglancesConvoyGlance.39.1");
  return webUIText("Auto.Return.componentsworldglancesConvoyGlance.40.1", { Value1: formatNumber(days, { maximumFractionDigits: 1 }) });
}

function cargoAmount(amount: number): string {
  if (Math.abs(amount) < 5) {
    return formatNumber(amount, { maximumFractionDigits: 1 });
  }

  return formatNumber(amount);
}

function cargoSummary(data: ConvoyGlanceData): string {
  if (data.cargo.length === 0) return webUIText('ConvoyFilter.NoCargo');
  return data.cargo.slice(0, 3).map((item) => item.label).join(', ');
}

function convoyTooltip(data: ConvoyGlanceData, progress: number, debugMode: boolean): TooltipContent {
  const lines: TooltipLine[] = [
    {
      label: webUIText('Auto.Prop.ComponentsWorldGlancesConvoyGlance.59.1'),
      value: data.faction.name,
      valueColor: readableFactionTextColour(data.faction.colour),
    },
    {
      label: webUIText('Auto.Prop.ComponentsWorldGlancesConvoyGlance.64.2'),
      value: relationDisplayLabel(data.faction.relation),
      valueColor: relationDisplayColour(data.faction.relation),
    },
    {
      label: webUIText('Auto.Prop.ComponentsWorldGlancesConvoyGlance.68.3'),
      value: data.purpose,
      valueIcon: '/assets/icons/I_Resources.png',
    },
    {
      label: webUIText('Auto.Prop.ComponentsWorldGlancesConvoyGlance.73.4'),
      value: routeLabel(data.routeType),
      valueIcon: routeIcon(data.routeType),
    },
    {
      label: webUIText('Auto.Prop.ComponentsWorldGlancesConvoyGlance.78.5'),
      value: data.originName,
    },
    {
      label: webUIText('Auto.Prop.ComponentsWorldGlancesConvoyGlance.82.6'),
      value: data.destinationName,
    },
    {
      label: webUIText('Auto.Prop.ComponentsWorldGlancesConvoyGlance.86.7'),
      value: formatPercent(progress * 100),
    },
    {
      label: webUIText('Auto.Prop.ComponentsWorldGlancesConvoyGlance.90.8'),
      value: etaText(data.etaDays),
    },
  ];

  if (data.clusterCount > 1) {
    lines.push({
      label: webUIText('Auto.Prop.ComponentsWorldGlancesConvoyGlance.97.9'),
      value: formatNumber(data.clusterCount),
    });
  }

  for (const item of data.cargo) {
    lines.push({
      label: item.label,
      value: cargoAmount(item.amount),
      valueIcon: FoaeCefUIAssetPath(item.icon),
    });
  }

  if (debugMode) {
    lines.push({ label: webUIText('Auto.Prop.ComponentsWorldGlancesConvoyGlance.111.10'), isHeader: true });
    lines.push({ label: webUIText('Auto.Prop.ComponentsWorldGlancesConvoyGlance.112.11'), value: `#${formatNumber(data.faction.debugShortId ?? 0)}` });
    lines.push({ label: webUIText('Auto.Prop.ComponentsWorldGlancesConvoyGlance.113.12'), value: formatNumber(data.clusterCount) });
  }

  return {
    title: webUIText('Auto.Prop.ComponentsWorldGlancesConvoyGlance.117.13'),
    get body() { return webUIText("Auto.Prop.componentsworldglancesConvoyGlance.118.1", { Value1: cargoSummary(data), Value2: data.destinationName }); },
    lines,
    footer: data.purposeDetails || undefined,
  };
}

interface ConvoyGlanceProps {
  data: ConvoyGlanceData;
}

export default function ConvoyGlance({ data }: ConvoyGlanceProps) {
  const { debugMode } = useGameState();
  const progress = clampUnitFraction(data.progress);
  const visibleCargo = data.cargo.slice(0, 3);
  const route = routeIcon(data.routeType);

  return (
    <Tooltip
      content={convoyTooltip(data, progress, debugMode)}
      position="top"
      delay={520}
      bubbleClassName="tt-bubble--glance"
    >
      <div
        className={`glance glance--convoy glance--convoy-${data.routeType}`}
        style={{
          '--convoy-border': relationBorderColour(data.faction.relation),
          '--faction-colour': data.faction.colour,
        } as CSSProperties}
      >
        <div className="gconv-dmd-border" aria-hidden="true" />
        <div className="gconv-dmd-face" aria-hidden="true" />

        <div className="gconv-faction-mark" aria-hidden="true">
          <FactionRoundel
            factionId={data.faction.id}
            colour={data.faction.colour}
            secondaryColour={data.faction.secondaryColour}
            cultureGroup={data.faction.cultureGroup}
            emblem={data.faction.emblem}
            name={data.faction.name}
            size="xs"
            showRing
            resolveFaction={false}
          />
        </div>

        <div className="gconv-faction-label">
          {data.faction.name}
        </div>

        <div className="gconv-route-pip" aria-hidden="true">
          <img src={route} alt="" />
        </div>

        {visibleCargo.length > 0 && (
          <div className="gconv-cargo-strip" aria-hidden="true">
            {visibleCargo.map((item) => (
              <div key={`${item.label}:${String(item.amount)}`} className="gconv-cargo-item">
                <img src={FoaeCefUIAssetPath(item.icon)} alt="" />
                <span className="gconv-cargo-ct">{cargoAmount(item.amount)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </Tooltip>
  );
}
