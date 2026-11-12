import { useEffect, useRef, useState, type CSSProperties } from 'react';
import PeaceSettlementGlance from './PeaceSettlementGlance';
import FactionRoundel from '../common/entities/FactionRoundel';
import type { SettlementGlanceData } from './WorldGlanceTypes';
import { clampUnitFraction, percentWidth } from './glanceMath';
import { formatNumber, formatPercent, formatResourceNumber, formatSignedNumber } from '../../utils/numberFormat';
import { useGameState } from '../../context/GameContext';
import { useSettingsBridge } from '../../bridge/app/useSettingsBridge';
import { WebkilnAssetPath } from '../../utils/assets';
import { roundelDiplomacyProps } from '../../utils/factionBorder';
import { glanceBadgeBackgroundColour, isHostileGlance, readableFactionTextColour, relationDisplayColour, relationDisplayLabel, relationTextVars } from './WorldGlancePresentation';

import { webUIText } from '../../localization/WebUITextContext';
import { formatSettlementType } from '../../utils/displayLabels';
type SettlementType = SettlementGlanceData['settlementType'];

const PROGRESS_EPSILON = 0.001;
const PROGRESS_RATE_PER_SECOND = 1.55;

function useAnimatedProgress(target: number, enabled: boolean, resetKey: string): number {
  const [displayedProgress, setDisplayedProgress] = useState(target);
  const [displayedResetKey, setDisplayedResetKey] = useState(resetKey);
  const displayedRef = useRef(target);
  const committedRef = useRef(target);
  const frameRef = useRef<number | null>(null);
  const needsReset = displayedResetKey !== resetKey;

  useEffect(() => {
    if (frameRef.current !== null) {
      window.cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }

    if (!enabled) {
      displayedRef.current = target;
      committedRef.current = target;
      return;
    }

    if (needsReset) {
      displayedRef.current = target;
      frameRef.current = window.requestAnimationFrame(() => {
        displayedRef.current = target;
        committedRef.current = target;
        setDisplayedProgress(target);
        setDisplayedResetKey(resetKey);
        frameRef.current = null;
      });
      return;
    }

    let previousTimestamp = 0;

    const commitProgress = (value: number) => {
      displayedRef.current = value;
      if (Math.abs(committedRef.current - value) <= PROGRESS_EPSILON) {
        return;
      }
      committedRef.current = value;
      setDisplayedProgress(value);
    };

    const tick = (timestamp: number) => {
      if (previousTimestamp === 0) {
        previousTimestamp = timestamp;
      }

      const deltaSeconds = Math.min(0.1, Math.max(0, (timestamp - previousTimestamp) / 1000));
      previousTimestamp = timestamp;

      const current = displayedRef.current;
      const delta = target - current;
      if (Math.abs(delta) <= PROGRESS_EPSILON) {
        commitProgress(target);
        frameRef.current = null;
        return;
      }

      const step = Math.max(0.0125, deltaSeconds * PROGRESS_RATE_PER_SECOND);
      const next = Math.abs(delta) <= step
        ? target
        : current + (delta > 0 ? step : -step);

      commitProgress(next);
      frameRef.current = window.requestAnimationFrame(tick);
    };

    frameRef.current = window.requestAnimationFrame(tick);
    return () => {
      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
    };
  }, [target, enabled, resetKey, needsReset]);

  return !enabled || needsReset ? target : displayedProgress;
}

function unrestColour(u: number): string {
  if (u >= 50) return 'var(--red)';
  if (u >= 25) return '#c88a3a';
  return 'var(--green)';
}

function loyaltyColour(l: number): string {
  if (l < -30) return 'var(--red)';
  if (l < -10) return '#c86b2a';
  if (l < 10)  return '#c88a3a';
  return 'var(--green)';
}

function opinionColour(opinion: number): string {
  if (opinion < -20) return 'var(--red)';
  if (opinion < 20) return '#c86b2a';
  if (opinion < 60) return '#c88a3a';
  return 'var(--green)';
}

function opinionIcon(opinion: number): string {
  if (opinion < -20) return '/assets/icons/I_OpinionNegative.png';
  if (opinion < 20) return '/assets/icons/I_OpinionNeutral.png';
  return '/assets/icons/I_OpinionPositive.png';
}

function luxuryColour(required: number, provided: number): string {
  if (required <= 0) return 'var(--text-muted)';
  const missing = required - provided;
  if (missing <= 0) return 'var(--green)';
  if (missing === 1) return '#c88a3a';
  if (missing === 2) return '#c86b2a';
  return 'var(--red)';
}

function corruptionColour(value: number): string {
  if (value >= 0.75) return 'var(--red)';
  if (value >= 0.5) return '#c86b2a';
  if (value >= 0.25) return '#c88a3a';
  return 'var(--green)';
}

function settlementTypeIcon(t: SettlementType): string {
  switch (t) {
    case 'land':       return '/assets/glance/settlement-types-v3/settlement-badge-land.png';
    case 'city':       return '/assets/icons/I_City_Metal.png';
    case 'town':       return '/assets/icons/I_Town_Metal.png';
    case 'village':    return '/assets/icons/I_Village_Metal.png';
    case 'metropolis': return '/assets/icons/I_Metropolis_Metal.png';
    case 'fortress':   return '/assets/icons/I_Fortress_Metal.png';
    case 'monastery':  return '/assets/icons/I_Monastery_Metal.png';
    case 'port':       return '/assets/icons/I_Port_Metal.png';
    case 'mining':     return '/assets/icons/I_Mining_Metal.png';
  }
}

type SettlementBadgeLayer = 'shadow' | 'background' | 'enamel-mask' | 'foreground' | 'hover-overlay';

function settlementBadgeLayerPath(type: SettlementType, layer: SettlementBadgeLayer): string {
  if (type === 'land') return '/assets/glance/settlement-types-v3/settlement-badge-land.png';
  return `/assets/glance/settlement-types-v3/layers/settlement-badge-${type}-${layer}.png`;
}

function relationBackgroundColour(relation: SettlementGlanceData['faction']['relation'], atWar?: boolean): string {
  if (atWar || relation === 'enemy') return 'rgba(82, 30, 25, 0.9)';
  if (relation === 'own' || relation === 'subject') return 'rgba(64, 38, 48, 0.88)';
  if (relation === 'ally') return 'rgba(32, 66, 44, 0.88)';
  return 'rgba(48, 45, 39, 0.86)';
}

function controllerForSettlement(data: SettlementGlanceData): SettlementGlanceData['faction'] {
  return data.occupier ?? data.faction;
}

function renderInfoRow(icon: string, value: string, valueColor?: string, numeric = false) {
  const className = numeric ? 'gset-info-value gset-info-value--numeric' : 'gset-info-value';
  const style = valueColor ? { color: valueColor } : undefined;
  return (
    <>
      <img src={WebkilnAssetPath(icon)} alt="" className="gset-info-icon" />
      <span className={className} style={style}>{value}</span>
    </>
  );
}

function renderGoldInfo(data: SettlementGlanceData) {
  return renderInfoRow(
    '/assets/icons/I_Coins.png',
    formatSignedNumber(data.monthlyIncome),
    data.monthlyIncome >= 0 ? 'var(--green-light)' : 'var(--red)',
    true,
  );
}

function renderResourceBoxes(data: SettlementGlanceData) {
  if (data.resources.length === 0) {
    return null;
  }

  return (
    <div className="gset-resource-row">
      {data.resources.map((resource, index) => (
        <span key={`${resource.icon}:${resource.label}:${index}`} className="gset-resource-box">
          <img src={WebkilnAssetPath(resource.icon)} alt="" />
        </span>
      ))}
    </div>
  );
}

function renderResourceInfo(data: SettlementGlanceData, showStock: boolean) {
  const primary = data.resources[0];
  if (!primary) {
    return renderInfoRow('/assets/icons/I_Resources.png', webUIText('Common.None'), 'var(--text-muted)');
  }

  const value = showStock ? `${primary.label} ${formatResourceNumber(primary.stock)}` : primary.label;
  return (
    <>
      {renderResourceBoxes(data)}
      <span className="gset-info-value">{value}</span>
    </>
  );
}

function renderGeographicInfo(icon: string, value: string | undefined) {
  return renderInfoRow(icon, value || webUIText('Common.Unassigned'), value ? undefined : 'var(--text-muted)');
}

function renderInfo(data: SettlementGlanceData) {
  if (data.settlementType === 'land' && data.mode === 'gold') {
    return renderInfoRow('/assets/icons/I_ModPopulation.png', formatNumber(data.population), undefined, true);
  }
  const controller = controllerForSettlement(data);

  switch (data.mode) {
    case 'gold':
      return renderGoldInfo(data);
    case 'political':
      return renderInfoRow('/assets/icons/I_DependentFactions.png', controller.name, readableFactionTextColour(controller.colour));
    case 'overlord':
      return renderGoldInfo(data);
    case 'diplomaticRelation':
      return renderInfoRow('/assets/icons/I_Peace.png', relationDisplayLabel(controller.relation, data.warWithPlayer), relationDisplayColour(controller.relation, data.warWithPlayer));
    case 'population':
      return renderInfoRow('/assets/icons/I_ModPopulation.png', formatNumber(data.population), undefined, true);
    case 'unrest':
      return renderInfoRow('/assets/icons/I_Unrest.png', formatPercent(data.unrest), unrestColour(data.unrest), true);
    case 'loyalty':
      return renderInfoRow(
        data.complianceUsesFactionOpinion ? opinionIcon(data.loyalty) : '/assets/icons/I_Loyalty.png',
        formatSignedNumber(data.loyalty),
        data.complianceUsesFactionOpinion ? opinionColour(data.loyalty) : loyaltyColour(data.loyalty),
        true,
      );
    case 'luxury': {
      const required = data.luxurySlotsRequired ?? 0;
      const provided = data.luxurySlotsProvided ?? 0;
      if (required <= 0) {
        return renderInfoRow('/assets/icons/I_Luxury.png', webUIText('WorldGlances.Settlement.NoLuxuryNeeds'), 'var(--text-muted)');
      }
      return renderInfoRow(
        '/assets/icons/I_Luxury.png',
        `${formatNumber(provided)}/${formatNumber(required)}`,
        luxuryColour(required, provided),
        true,
      );
    }
    case 'garrison':
    case 'militaries':
    case 'garrisons':
      return renderInfoRow('/assets/icons/I_ArmiesQuickButton.png', formatNumber(data.garrison), undefined, true);
    case 'culture':
      return renderInfoRow('/assets/icons/I_Cultures.png', data.culture.label, readableFactionTextColour(data.culture.colour));
    case 'religion':
      return <>{renderInfoRow('/assets/icons/I_Religions.png', data.religion.label, readableFactionTextColour(data.religion.colour))}
        {data.faithMarkers?.map(marker => <span key={marker.label}>{renderInfoRow(marker.icon, marker.label, 'var(--gold)')}</span>)}
      </>;
    case 'landscape':
    case 'settlementType':
      return (
        <>
          {renderInfoRow(settlementTypeIcon(data.settlementType), formatSettlementType(data.settlementType))}
          {renderResourceBoxes(data)}
        </>
      );
    case 'economicProsperity':
    case 'economy':
      return renderGoldInfo(data);
    case 'adminRegion':
      return renderGeographicInfo('/assets/icons/I_Region.png', data.regionName);
    case 'adminLand':
      return renderGeographicInfo('/assets/icons/I_Land.png', data.landName);
    case 'adminDomain':
      return renderGeographicInfo('/assets/icons/I_Domain.png', data.domainName);
    case 'disease':
      if (data.diseased) return renderInfoRow('/assets/icons/I_Skull.png', webUIText('WorldGlances.Settlement.Disease'), 'var(--red)');
      if (data.starving) return renderInfoRow('/assets/icons/I_StarvationApple.png', webUIText('WorldGlances.Settlement.Starvation'), 'var(--red)');
      return renderInfoRow('/assets/icons/I_Skull.png', webUIText('WorldGlances.Settlement.Healthy'), 'var(--green)');
    case 'regionGovernor':
      return renderInfoRow('/assets/icons/I_Characters.png', data.governorName || webUIText('WorldGlances.Settlement.NoGovernor'), data.governorName ? undefined : 'var(--red)');
    case 'corruption':
      return renderInfoRow('/assets/traits/Corrupt.png', formatPercent(data.corruption * 100), corruptionColour(data.corruption), true);
    case 'trade':
      return renderInfoRow('/assets/icons/Treaties/I_TradeAgreement.png', formatNumber(data.tradeValue, { maximumFractionDigits: 1 }), data.tradeValue > 0 ? 'var(--gold-light)' : 'var(--text-muted)', true);
    case 'resources':
      return renderResourceInfo(data, false);
    case 'stockpiles':
      return renderResourceInfo(data, true);
    case 'bishopric':
      return renderInfoRow('/assets/icons/I_Bishop.png', data.bishopName || webUIText(data.landName ? 'Common.Vacant' : 'Common.Unassigned'), data.bishopName ? undefined : 'var(--text-muted)');
  }

  return renderGoldInfo(data);
}

interface SettlementGlanceProps {
  data: SettlementGlanceData;
}

export default function SettlementGlance({ data }: SettlementGlanceProps) {
  const { debugMode } = useGameState();
  const { settings } = useSettingsBridge();
  const showSettlementActions = settings?.graphics.showSettlementActionGlances !== false;
  const controller = data.occupier ?? data.faction;
  const relationColour = relationDisplayColour(controller.relation, data.warWithPlayer);
  const badgeBackgroundColour = glanceBadgeBackgroundColour(controller.relation, data.warWithPlayer);
  const siegeProgress = clampUnitFraction(data.siegeProgress);
  const buildItemProgress = data.buildItem ? clampUnitFraction(data.buildItem.progress) : 0;
  const besieged = data.besieged === true;
  const displayedSiegeProgress = useAnimatedProgress(siegeProgress, !data.peaceSelection && besieged, `${data.name}:siege`);
  if (data.peaceSelection) {
    return <PeaceSettlementGlance data={data} typeIcon={settlementTypeIcon(data.settlementType)} debugMode={debugMode} />;
  }
  const badgeShadow = WebkilnAssetPath(settlementBadgeLayerPath(data.settlementType, 'shadow'));
  const badgeBackground = WebkilnAssetPath(settlementBadgeLayerPath(data.settlementType, 'background'));
  const badgeMask = WebkilnAssetPath(settlementBadgeLayerPath(data.settlementType, 'enamel-mask'));
  const badgeForeground = WebkilnAssetPath(settlementBadgeLayerPath(data.settlementType, 'foreground'));
  const badgeHoverOverlay = WebkilnAssetPath(settlementBadgeLayerPath(data.settlementType, 'hover-overlay'));
  const badgeOverhangRem = (data.badgeScale - 1) * 2.1364;
  const capitalIconPath = data.isCapital
    ? '/assets/icons/I_Capital.png'
    : data.isProvincialCapital ? '/assets/icons/I_ProvincialCapital.png' : '';
  const capitalIcon = capitalIconPath ? WebkilnAssetPath(capitalIconPath) : '';
  const atWar = isHostileGlance(controller.relation, data.warWithPlayer);
  const rootClass = [
    'glance',
    'glance--settlement',
    data.targeted ? 'is-targeted' : '',
    atWar ? 'is-at-war' : '',
    besieged ? 'is-besieged' : '',
    data.starving ? 'is-starving' : '',
    data.diseased ? 'is-diseased' : '',
  ].filter(Boolean).join(' ');

  return (
    <div
      className={rootClass}
      style={{
        '--relation-colour': relationColour,
        ...relationTextVars(controller.relation, data.warWithPlayer),
        '--glance-badge-tint': badgeBackgroundColour,
        '--settlement-label-bg': relationBackgroundColour(controller.relation, data.warWithPlayer),
        '--settlement-badge-scale': data.badgeScale,
        '--settlement-badge-overhang': `${badgeOverhangRem}rem`,
      } as CSSProperties}
    >
      {atWar && <span className="glance-war-glow" aria-hidden="true" />}
      {debugMode && data.debugShortId !== undefined && (
        <div className="glance-debug-id">#{formatNumber(data.debugShortId)}</div>
      )}
      <div className="gset-body">
        <div className="gset-emblem">
          <span className="gset-type-core" aria-hidden="true" data-webkiln-anchor-hit>
            <span className="gset-target-glow">
              <span
                className="glance-target-silhouette"
                style={{
                  maskImage: `url("${data.settlementType === 'land' ? badgeForeground : badgeHoverOverlay}")`,
                  WebkitMaskImage: `url("${data.settlementType === 'land' ? badgeForeground : badgeHoverOverlay}")`,
                }}
              />
            </span>
            {data.settlementType === 'land' ? (
              <img className="gset-badge-layer gset-badge-layer--foreground" src={badgeForeground} alt="" />
            ) : <>
            <img className="gset-badge-layer gset-badge-layer--shadow" src={badgeShadow} alt="" />
            <img className="gset-badge-layer gset-badge-layer--background" src={badgeBackground} alt="" />
            <span
              className="gset-badge-layer gset-badge-layer--tint"
              style={{ maskImage: `url("${badgeMask}")`, WebkitMaskImage: `url("${badgeMask}")` }}
            />
            <img className="gset-badge-layer gset-badge-layer--foreground" src={badgeForeground} alt="" />
            <img className="gset-badge-layer gset-badge-layer--hover" src={badgeHoverOverlay} alt="" />
            <span
              className="gset-badge-layer gset-badge-layer--target-frame"
              style={{ maskImage: `url("${badgeHoverOverlay}")`, WebkitMaskImage: `url("${badgeHoverOverlay}")` }}
            />
            </>}
          </span>
          {data.occupier && (
            <FactionRoundel
              className="gset-occupier-badge"
              factionId={data.occupier.id}
              colour={data.occupier.colour}
              secondaryColour={data.occupier.secondaryColour}
              cultureGroup={data.occupier.cultureGroup}
              emblem={data.occupier.emblem}
              name={data.occupier.name}
              size="xs"
              showRing
              resolveFaction={false}
              {...roundelDiplomacyProps(data.occupier)}
            />
          )}
          {capitalIcon && (
            <img className="gset-status-icon gset-status-icon--capital" src={capitalIcon} alt="" />
          )}
          {data.mode === 'religion' && data.faithMarkers && data.faithMarkers.length > 0 && <div className="gset-faith-markers">
            {data.faithMarkers.map(marker => <img key={marker.label} src={WebkilnAssetPath(marker.icon)} alt={marker.label} />)}
          </div>}
          {data.siegePowerInsufficient && (
            <span className="gset-siege-warning" aria-label={webUIText('Settlement.Siege.InsufficientPower')}>!</span>
          )}
          {besieged && (
            <img className="gset-status-icon gset-status-icon--siege" src={WebkilnAssetPath('/assets/icons/I_Siege.png')} alt="" />
          )}
          {data.starving && (
            <img className="gset-status-icon gset-status-icon--starving" src={WebkilnAssetPath('/assets/icons/I_StarvationApple.png')} alt="" />
          )}
          {data.diseased && (
            <img className="gset-status-icon gset-status-icon--disease" src={WebkilnAssetPath('/assets/icons/I_Skull.png')} alt="" />
          )}
        </div>

        <div className="gset-main">
          <div className="gset-head">
            <span className="gset-name">{data.name}</span>
          </div>

          <div className="gset-info">
            {renderInfo(data)}
          </div>

          <div
            className={`gset-build-status${besieged ? ' is-siege' : ''}`}
            style={{ display: besieged || data.buildItem ? undefined : 'none' }}
          >
            {besieged ? (
              <img
                className="gset-build-status-icon"
                src={WebkilnAssetPath('/assets/icons/I_Siege.png')}
                alt=""
              />
            ) : data.buildItem ? (
              <img
                className="gset-build-status-icon"
                src={WebkilnAssetPath(data.buildItem.icon)}
                alt=""
              />
            ) : null}
            <span className="gset-build-status-label">
              {besieged ? webUIText('Settlement.Siege.Title') : (data.buildItem?.label ?? '')}
            </span>
            {!besieged && data.buildItem && (data.queuedJobCount ?? 0) > 0 && (
              <span className="gset-build-status-queued">
                {webUIText('WorldGlance.QueuedCount', { Count: formatNumber(data.queuedJobCount ?? 0) })}
              </span>
            )}
            <span className="gset-build-status-value">
              {besieged
                ? formatPercent(displayedSiegeProgress * 100)
                : data.buildItem
                  ? formatPercent(buildItemProgress * 100)
                  : ''}
            </span>
          </div>

          <div
            className="gset-build-bar"
            aria-hidden="true"
            style={{ display: besieged || data.buildItem ? undefined : 'none' }}
          >
            <div
              className={`gset-build-bar-fill${besieged ? ' is-siege' : ''}`}
              style={{ width: percentWidth(besieged ? displayedSiegeProgress : buildItemProgress) }}
            />
          </div>

          {showSettlementActions && data.activeAction && (
            <div className="gset-active-action" style={{ color: data.activeAction.colour }}>
              {data.activeAction.icon ? (
                <img
                  className="gset-active-action-icon"
                  src={WebkilnAssetPath(data.activeAction.icon)}
                  alt=""
                />
              ) : null}
              <span className="gset-active-action-label">{data.activeAction.label}</span>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
