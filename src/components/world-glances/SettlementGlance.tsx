import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import FactionRoundel from '../common/entities/FactionRoundel';
import type { SettlementGlanceData } from './WorldGlanceTypes';
import { clampUnitFraction, percentWidth } from './glanceMath';
import { formatNumber, formatPercent, formatSignedNumber } from '../../utils/numberFormat';
import { useGameState } from '../../context/GameContext';
import { FoaeCefUIAssetPath } from '../../utils/assets';
import { readableFactionTextColour } from '../../utils/colorFormatters';

import { webUIText } from '../../localization/WebUITextContext';
import { formatSettlementType } from '../../utils/displayLabels';
type SettlementType = SettlementGlanceData['settlementType'];

const PROGRESS_EPSILON = 0.001;
const PROGRESS_RATE_PER_SECOND = 1.55;
const SETTLEMENT_NAME_MIN_FONT_REM = 0.5;
const SETTLEMENT_NAME_MAX_FONT_REM = 0.8182;

function SettlementName({ name }: { name: string }) {
  const nameRef = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    const element = nameRef.current;
    if (!element) return undefined;

    const fitName = () => {
      const rootFontSize = Number.parseFloat(getComputedStyle(document.documentElement).fontSize);
      const minFontSize = SETTLEMENT_NAME_MIN_FONT_REM * rootFontSize;
      const maxFontSize = SETTLEMENT_NAME_MAX_FONT_REM * rootFontSize;
      element.style.fontSize = `${maxFontSize}px`;

      const availableWidth = element.clientWidth;
      const requiredWidth = element.scrollWidth;
      if (requiredWidth <= availableWidth + 0.5) return;

      const fittedFontSize = Math.max(minFontSize, maxFontSize * ((availableWidth - 1) / requiredWidth));
      element.style.fontSize = `${fittedFontSize}px`;
    };

    fitName();

    let active = true;
    void document.fonts.ready.then(() => {
      if (active) fitName();
    });

    return () => {
      active = false;
    };
  }, [name]);

  return <span ref={nameRef} className="gset-name">{name}</span>;
}

function useAnimatedProgress(target: number, enabled: boolean, resetKey: string): number {
  const [displayedProgress, setDisplayedProgress] = useState(target);
  const [displayedResetKey, setDisplayedResetKey] = useState(resetKey);
  const displayedRef = useRef(target);
  const frameRef = useRef<number | null>(null);
  const needsReset = displayedResetKey !== resetKey;

  useEffect(() => {
    if (frameRef.current !== null) {
      window.cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }

    if (!enabled) {
      displayedRef.current = target;
      return;
    }

    if (needsReset) {
      displayedRef.current = target;
      frameRef.current = window.requestAnimationFrame(() => {
        displayedRef.current = target;
        setDisplayedProgress(target);
        setDisplayedResetKey(resetKey);
        frameRef.current = null;
      });
      return;
    }

    let previousTimestamp = 0;

    const tick = (timestamp: number) => {
      if (previousTimestamp === 0) {
        previousTimestamp = timestamp;
      }

      const deltaSeconds = Math.min(0.1, Math.max(0, (timestamp - previousTimestamp) / 1000));
      previousTimestamp = timestamp;

      const current = displayedRef.current;
      const delta = target - current;
      if (Math.abs(delta) <= PROGRESS_EPSILON) {
        displayedRef.current = target;
        setDisplayedProgress(target);
        frameRef.current = null;
        return;
      }

      const step = Math.max(0.0125, deltaSeconds * PROGRESS_RATE_PER_SECOND);
      const next = Math.abs(delta) <= step
        ? target
        : current + (delta > 0 ? step : -step);

      displayedRef.current = next;
      setDisplayedProgress(next);
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
  if (u >= 0.5) return 'var(--red)';
  if (u >= 0.25) return '#c88a3a';
  return 'var(--green)';
}

function loyaltyColour(l: number): string {
  if (l < -30) return 'var(--red)';
  if (l < -10) return '#c86b2a';
  if (l < 10)  return '#c88a3a';
  return 'var(--green)';
}

function corruptionColour(value: number): string {
  if (value >= 0.75) return 'var(--red)';
  if (value >= 0.5) return '#c86b2a';
  if (value >= 0.25) return '#c88a3a';
  return 'var(--green)';
}

function settlementTypeIcon(t: SettlementType): string {
  switch (t) {
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

type SettlementBadgeLayer = 'shadow' | 'background' | 'enamel-mask' | 'enamel-light' | 'foreground' | 'hover-overlay';

function settlementBadgeLayerPath(type: SettlementType, layer: SettlementBadgeLayer): string {
  return `/assets/glance/settlement-types-v3/layers/settlement-badge-${type}-${layer}.png`;
}

function relationLabel(relation: SettlementGlanceData['faction']['relation'], atWar?: boolean): string {
  if (atWar || relation === 'enemy') return webUIText('WorldGlances.Relation.Hostile');
  if (relation === 'own') return webUIText('WorldGlances.Relation.Own');
  if (relation === 'ally') return webUIText('WorldGlances.Relation.Allied');
  return webUIText('WorldGlances.Relation.Neutral');
}

function relationColour(relation: SettlementGlanceData['faction']['relation'], atWar?: boolean): string {
  if (atWar || relation === 'enemy') return 'var(--red)';
  if (relation === 'own') return 'var(--gold-light)';
  if (relation === 'ally') return 'var(--green-light)';
  return 'var(--text-bright)';
}

function relationBackgroundColour(relation: SettlementGlanceData['faction']['relation'], atWar?: boolean): string {
  if (atWar || relation === 'enemy') return 'rgba(82, 30, 25, 0.9)';
  if (relation === 'own') return 'rgba(64, 38, 48, 0.88)';
  if (relation === 'ally') return 'rgba(32, 66, 44, 0.88)';
  return 'rgba(48, 45, 39, 0.86)';
}

function settlementTypeTint(type: SettlementType): string {
  switch (type) {
    case 'village': return '#78945a';
    case 'town': return '#b68a45';
    case 'city': return '#c8ad62';
    case 'metropolis': return '#d9c986';
    case 'fortress': return '#8e969e';
    case 'monastery': return '#b8adce';
    case 'port': return '#5f93aa';
    case 'mining': return '#a8744a';
  }
}

function parseHexColour(hex: string): [number, number, number] | null {
  const value = hex.trim();
  if (!/^#[0-9a-fA-F]{6}$/.test(value)) return null;
  return [
    parseInt(value.slice(1, 3), 16),
    parseInt(value.slice(3, 5), 16),
    parseInt(value.slice(5, 7), 16),
  ];
}

function hexByte(value: number): string {
  return Math.max(0, Math.min(255, Math.round(value))).toString(16).padStart(2, '0');
}

function tintFactionColourForSettlementType(colour: string, type: SettlementType): string {
  const base = parseHexColour(colour);
  const tint = parseHexColour(settlementTypeTint(type));
  if (!base || !tint) return colour;

  const tintStrength = 0.18;
  return `#${hexByte(base[0] + (tint[0] - base[0]) * tintStrength)}${hexByte(base[1] + (tint[1] - base[1]) * tintStrength)}${hexByte(base[2] + (tint[2] - base[2]) * tintStrength)}`;
}

function controllerForSettlement(data: SettlementGlanceData): SettlementGlanceData['faction'] {
  return data.occupier ?? data.faction;
}

function renderInfoRow(icon: string, value: string, valueColor?: string, numeric = false) {
  const className = numeric ? 'gset-info-value gset-info-value--numeric' : 'gset-info-value';
  const style = valueColor ? { color: valueColor } : undefined;
  return (
    <>
      <img src={FoaeCefUIAssetPath(icon)} alt="" className="gset-info-icon" />
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

function renderConstructionInfo(data: SettlementGlanceData) {
  if (data.building) {
    return renderInfoRow(
      '/assets/icons/I_BuildingsQuickButton.png',
      `${data.building.label} ${formatPercent(data.building.progress * 100)}`,
      '#d6a83a',
    );
  }

  return renderGoldInfo(data);
}

function renderResourceInfo(data: SettlementGlanceData, showStock: boolean) {
  const primary = data.resources[0];
  if (!primary) {
    return renderInfoRow('/assets/icons/I_Resources.png', 'None', 'var(--text-muted)');
  }

  const value = showStock ? `${primary.label} ${formatNumber(primary.stock)}` : primary.label;
  return renderInfoRow('/assets/icons/I_Resources.png', value);
}

function renderGeographicInfo(icon: string, value: string | undefined) {
  return renderInfoRow(icon, value || 'Unassigned', value ? undefined : 'var(--text-muted)');
}

function renderInfo(data: SettlementGlanceData) {
  const controller = controllerForSettlement(data);

  switch (data.mode) {
    case 'gold':
      return renderGoldInfo(data);
    case 'political':
      return renderInfoRow('/assets/icons/I_DependentFactions.png', controller.name, readableFactionTextColour(controller.colour));
    case 'overlord':
      return renderGoldInfo(data);
    case 'diplomaticRelation':
      return renderInfoRow('/assets/icons/I_Peace.png', relationLabel(controller.relation, data.warWithPlayer), relationColour(controller.relation, data.warWithPlayer));
    case 'population':
      return renderInfoRow('/assets/icons/I_ModPopulation.png', formatNumber(data.population), undefined, true);
    case 'unrest':
      return renderInfoRow('/assets/icons/I_Unrest.png', formatPercent(data.unrest * 100), unrestColour(data.unrest), true);
    case 'loyalty':
      return renderInfoRow('/assets/icons/I_Loyalty.png', formatSignedNumber(data.loyalty), loyaltyColour(data.loyalty), true);
    case 'garrison':
    case 'militaries':
    case 'garrisons':
      return renderInfoRow('/assets/icons/I_ArmiesQuickButton.png', formatNumber(data.garrison), undefined, true);
    case 'culture':
      return renderInfoRow('/assets/icons/I_Cultures.png', data.culture.label, readableFactionTextColour(data.culture.colour));
    case 'religion':
      return renderInfoRow('/assets/icons/I_Religions.png', data.religion.label, readableFactionTextColour(data.religion.colour));
    case 'landscape':
    case 'settlementType':
      return renderInfoRow(settlementTypeIcon(data.settlementType), formatSettlementType(data.settlementType));
    case 'economicProsperity':
    case 'economy':
      return renderConstructionInfo(data);
    case 'adminRegion':
      return renderGeographicInfo('/assets/icons/I_Region.png', data.regionName);
    case 'adminLand':
      return renderGeographicInfo('/assets/icons/I_Land.png', data.landName);
    case 'adminDomain':
      return renderGeographicInfo('/assets/icons/I_Domain.png', data.domainName);
    case 'disease':
      if (data.diseased) return renderInfoRow('/assets/icons/I_Skull.png', 'Disease', 'var(--red)');
      if (data.starving) return renderInfoRow('/assets/icons/I_StarvationApple.png', 'Starvation', 'var(--red)');
      return renderInfoRow('/assets/icons/I_Skull.png', 'Healthy', 'var(--green)');
    case 'regionGovernor':
      return renderInfoRow('/assets/icons/I_Characters.png', data.governorName || 'No governor', data.governorName ? undefined : 'var(--red)');
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
  const controller = data.occupier ?? data.faction;
  const factionColour = tintFactionColourForSettlementType(controller.colour, data.settlementType);
  const siegeProgress = clampUnitFraction(data.siegeProgress);
  const buildProgress = data.building ? clampUnitFraction(data.building.progress) : 0;
  const besieged = data.besieged === true;
  const displayedSiegeProgress = useAnimatedProgress(siegeProgress, besieged, `${data.name}:siege`);
  const badgeShadow = FoaeCefUIAssetPath(settlementBadgeLayerPath(data.settlementType, 'shadow'));
  const badgeBackground = FoaeCefUIAssetPath(settlementBadgeLayerPath(data.settlementType, 'background'));
  const badgeMask = FoaeCefUIAssetPath(settlementBadgeLayerPath(data.settlementType, 'enamel-mask'));
  const badgeLight = FoaeCefUIAssetPath(settlementBadgeLayerPath(data.settlementType, 'enamel-light'));
  const badgeForeground = FoaeCefUIAssetPath(settlementBadgeLayerPath(data.settlementType, 'foreground'));
  const badgeHoverOverlay = FoaeCefUIAssetPath(settlementBadgeLayerPath(data.settlementType, 'hover-overlay'));
  const badgeOverhangRem = (data.badgeScale - 1) * 2.1364;
  const capitalIconPath = data.isCapital
    ? '/assets/icons/I_Capital.png'
    : data.isProvincialCapital ? '/assets/icons/I_ProvincialCapital.png' : '';
  const capitalIcon = capitalIconPath ? FoaeCefUIAssetPath(capitalIconPath) : '';
  const rootClass = [
    'glance',
    'glance--settlement',
    data.targeted ? 'is-targeted' : '',
    besieged ? 'is-besieged' : '',
    data.starving ? 'is-starving' : '',
    data.diseased ? 'is-diseased' : '',
  ].filter(Boolean).join(' ');

  return (
    <div
      className={rootClass}
      style={{
        '--faction-colour': factionColour,
        '--settlement-label-bg': relationBackgroundColour(controller.relation, data.warWithPlayer),
        '--settlement-badge-scale': data.badgeScale,
        '--settlement-badge-overhang': `${badgeOverhangRem}rem`,
      } as CSSProperties}
    >
      {debugMode && data.debugShortId !== undefined && (
        <div className="glance-debug-id">#{formatNumber(data.debugShortId)}</div>
      )}
      {besieged && (
        <div className="gset-siege-progress" aria-hidden="true">
          <div className="gset-siege-progress-track">
            <div className="gset-siege-progress-fill" style={{ width: percentWidth(displayedSiegeProgress) }} />
          </div>
        </div>
      )}
      <div className="gset-body">
        <div className="gset-emblem">
          <span className="gset-type-core" aria-hidden="true">
            <img className="gset-badge-layer gset-badge-layer--shadow" src={badgeShadow} alt="" />
            <img className="gset-badge-layer gset-badge-layer--background" src={badgeBackground} alt="" />
            <span
              className="gset-badge-layer gset-badge-layer--tint"
              style={{ backgroundColor: factionColour, maskImage: `url("${badgeMask}")` }}
            />
            <img className="gset-badge-layer gset-badge-layer--light" src={badgeLight} alt="" />
            <img className="gset-badge-layer gset-badge-layer--foreground" src={badgeForeground} alt="" />
            <img className="gset-badge-layer gset-badge-layer--hover" src={badgeHoverOverlay} alt="" />
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
            />
          )}
          {capitalIcon && (
            <img className="gset-status-icon gset-status-icon--capital" src={capitalIcon} alt="" />
          )}
          {besieged && (
            <img className="gset-status-icon gset-status-icon--siege" src={FoaeCefUIAssetPath('/assets/icons/I_Siege.png')} alt="" />
          )}
          {data.starving && (
            <img className="gset-status-icon gset-status-icon--starving" src={FoaeCefUIAssetPath('/assets/icons/I_StarvationApple.png')} alt="" />
          )}
          {data.diseased && (
            <img className="gset-status-icon gset-status-icon--disease" src={FoaeCefUIAssetPath('/assets/icons/I_Skull.png')} alt="" />
          )}
        </div>

        <div className="gset-main">
          <div className="gset-head">
            <SettlementName name={data.name} />
            <span
              className="gset-build-status"
              aria-hidden="true"
              style={{ display: data.building ? undefined : 'none' }}
            >
              <img
                className="gset-build-status-icon"
                src={FoaeCefUIAssetPath('/assets/icons/I_BuildingsQuickButton.png')}
                alt=""
              />
              <span className="gset-build-status-value">
                {data.building ? formatPercent(buildProgress * 100) : ''}
              </span>
            </span>
          </div>

          <div className="gset-info">
            {renderInfo(data)}
          </div>

          <div
            className="gset-build-bar"
            aria-hidden="true"
            style={{ display: !besieged && data.building ? undefined : 'none' }}
          >
            <div className="gset-build-bar-fill" style={{ width: percentWidth(buildProgress) }} />
          </div>
        </div>
      </div>
    </div>
  );
}
