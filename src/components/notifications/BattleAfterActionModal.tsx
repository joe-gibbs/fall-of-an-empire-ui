import type {
  BattleAfterActionSidePayload,
  BattleAfterActionSpoilPayload,
  BattleAfterActionUnitDamagePayload,
} from '../../bridge-types.generated.ts';
import type { Notification } from '../../data/types';
import { useModalPresence } from '../../hooks/useModalPresence';
import { WebkilnAssetPath } from '../../utils/assets';
import { renderEventTextChunk } from '../../utils/eventTextFlow';
import { formatNumber, formatPercent } from '../../utils/numberFormat';
import { renderRichText } from '../../utils/richText';
import CloseButton from '../common/buttons/CloseButton';
import FactionRoundel from '../common/entities/FactionRoundel';
import Portrait from '../common/portraits/Portrait';
import GameButton from '../common/buttons/GameButton';
import PaintedBar from '../common/data-display/bars/PaintedBar';
import StyledScrollArea from '../common/layout/scrolling/StyledScrollArea';
import './BattleAfterActionModal.css';

import { webUIText, WebUIText } from '../../localization/WebUITextContext';
export type BattleAfterActionNotification = Pick<Notification, 'title' | 'description' | 'battleAfterActionReport'>;

interface BattleAfterActionModalProps {
  notification: BattleAfterActionNotification | null;
  open: boolean;
  onClose: () => void;
  onNavigate?: () => void;
  onLinkClick?: (type: string, id: string) => void;
}

const damageGroupKey = (unit: BattleAfterActionUnitDamagePayload): string => {
  if (unit.unitId) return unit.unitId;
  const factionKey = unit.factionId || unit.factionName || 'unknown';
  const unitKey = unit.unitName || unit.iconPath || 'unit';
  return `${unit.side}|${factionKey}|${unitKey}|${unit.iconPath}`;
};

const combineUnitDamage = (
  units: BattleAfterActionUnitDamagePayload[],
): BattleAfterActionUnitDamagePayload[] => {
  const grouped = new Map<string, BattleAfterActionUnitDamagePayload>();
  const sourceNames = new Map<string, Set<string>>();

  units.forEach((unit) => {
    const key = damageGroupKey(unit);
    const existing = grouped.get(key);

    if (!existing) {
      grouped.set(key, { ...unit });
      const sources = new Set<string>();
      if (unit.militaryName) {
        sources.add(unit.militaryName);
      }
      sourceNames.set(key, sources);
      return;
    }

    existing.initialStrength += unit.initialStrength;
    existing.remainingStrength += unit.remainingStrength;
    existing.losses += unit.losses;
    existing.kills += unit.kills;
    existing.damageDealt += unit.damageDealt;

    const sources = sourceNames.get(key);
    if (sources && unit.militaryName) {
      sources.add(unit.militaryName);
      existing.militaryName =
        sources.size > 1 ? existing.factionName || existing.militaryName : unit.militaryName;
    }
  });

  return Array.from(grouped.values())
    .map((unit) => ({
      ...unit,
      destroyed: unit.remainingStrength <= 0,
      lossPercent:
        unit.initialStrength > 0 ? Math.round((unit.losses / unit.initialStrength) * 100) : 0,
    }))
    .sort((a, b) => b.damageDealt - a.damageDealt || b.kills - a.kills || b.losses - a.losses);
};

const renderBattleAARFlowText = (
  text: string | null | undefined,
  onLinkClick?: (type: string, id: string) => void,
): React.ReactNode => renderRichText(text ?? '', {
  onLinkClick,
  keepLinksWithPreviousWord: true,
  linkClassPrefix: 'event-link',
  transformText: (chunk, key) => renderEventTextChunk(chunk, `battle-aar-summary-${key}`),
});

const renderBattleAARRichText = (
  text: string | null | undefined,
  onLinkClick?: (type: string, id: string) => void,
): React.ReactNode => renderRichText(text ?? '', {
  onLinkClick,
  keepLinksWithPreviousWord: true,
});

function SideReport({
  side,
  fallbackFaction,
  onLinkClick,
}: {
  side: BattleAfterActionSidePayload;
  fallbackFaction?: BattleAfterActionUnitDamagePayload;
  onLinkClick?: (type: string, id: string) => void;
}) {
  const remainingPercent = side.initialStrength > 0 ? side.remainingStrength / side.initialStrength * 100 : 0;
  const factionId = side.factionId || fallbackFaction?.factionId || undefined;
  const factionColour = side.factionColour || fallbackFaction?.factionColour || undefined;
  const factionSecondaryColour = side.factionSecondaryColour || fallbackFaction?.factionSecondaryColour || undefined;
  const factionEmblem = side.factionEmblem || fallbackFaction?.factionEmblem || undefined;
  const factionCultureGroup = side.factionCultureGroup || fallbackFaction?.factionCultureGroup || undefined;
  const factionName = side.factionName || fallbackFaction?.factionName || side.label;
  const handleFactionClick = factionId && onLinkClick ? () => onLinkClick('faction', factionId) : undefined;
  const hasFactionRoundel = Boolean(factionId || factionColour || factionEmblem || factionCultureGroup);

  return (
    <div className={`battle-aar-side${side.won ? ' battle-aar-side--won' : ''}`}>
      <div className="battle-aar-side-top">
        <div className="battle-aar-side-heading">
          {hasFactionRoundel ? (
            <FactionRoundel
              factionId={factionId}
              colour={factionColour}
              secondaryColour={factionSecondaryColour}
              emblem={factionEmblem}
              cultureGroup={factionCultureGroup}
              name={factionName}
              size="sm"
              className="battle-aar-side-roundel"
              onClick={handleFactionClick}
            />
          ) : null}
          {handleFactionClick ? (
            <button
              type="button"
              className="battle-aar-side-label battle-aar-faction-link"
              onMouseDown={(event) => {
                event.preventDefault();
                event.stopPropagation();
                handleFactionClick();
              }}
            >
              {side.label}
            </button>
          ) : (
            <span className="battle-aar-side-label">{side.label}</span>
          )}
        </div>
        <span className="battle-aar-side-result">{side.won ? webUIText("Auto.Fix.ExprTrue.componentsnotificationsBattleAfterActionModal.63.1") : webUIText("Auto.Fix.ExprFalse.componentsnotificationsBattleAfterActionModal.63.1")}</span>
      </div>
      <div className="battle-aar-side-names">
        {renderBattleAARRichText(side.names, onLinkClick)}
      </div>
      <div className="battle-aar-side-commanders">
        {(side.commanderDetails || []).length > 0 ? side.commanderDetails.map(commander => {
          const handleCommanderClick = onLinkClick ? () => onLinkClick('character', commander.id) : undefined;
          return (
            <div key={commander.id} className="battle-aar-commander">
              <Portrait
                personId={commander.id}
                resolvePerson={false}
                layers={commander.portraitLayers}
                name={commander.name}
                size="row"
                borderTier="silver"
                isAlive={commander.isAlive}
                isImprisoned={commander.isImprisoned}
                showBadge={false}
                onClick={handleCommanderClick}
                className="battle-aar-commander-portrait"
              />
              <div className="battle-aar-commander-copy">
                <span className="battle-aar-side-commander-label">
                  <WebUIText textKey="Military.Selection.Tooltip.Commander" />
                </span>
                {handleCommanderClick ? (
                  <button
                    type="button"
                    className="battle-aar-commander-name battle-aar-commander-name--clickable"
                    onPointerDown={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      handleCommanderClick();
                    }}
                  >
                    {commander.name}
                  </button>
                ) : (
                  <span className="battle-aar-commander-name">{commander.name}</span>
                )}
              </div>
            </div>
          );
        }) : (
          <div className="battle-aar-commander battle-aar-commander--vacant">
            <Portrait
              name={webUIText('Common.NoCommander')}
              size="row"
              borderTier="bronze"
              showBadge={false}
              className="battle-aar-commander-portrait"
            />
            <div className="battle-aar-commander-copy">
              <span className="battle-aar-side-commander-label">
                <WebUIText textKey="Military.Selection.Tooltip.Commander" />
              </span>
              <span className="battle-aar-commander-name">{webUIText('Common.NoCommander')}</span>
            </div>
          </div>
        )}
      </div>
      <PaintedBar className="battle-aar-strength-bar" percent={remainingPercent} color={side.won ? 'gold' : 'red'} />
      <div className="battle-aar-stats">
        <div className="battle-aar-stat">
          <span className="battle-aar-stat-label"><WebUIText textKey="Auto.ComponentsNotificationsBattleAfterActionModal.68.1" /></span>
          <span className="battle-aar-stat-value">{formatNumber(side.initialStrength)}</span>
        </div>
        <div className="battle-aar-stat">
          <span className="battle-aar-stat-label"><WebUIText textKey="Auto.ComponentsNotificationsBattleAfterActionModal.72.2" /></span>
          <span className="battle-aar-stat-value">{formatNumber(side.remainingStrength)}</span>
        </div>
        <div className="battle-aar-stat">
          <span className="battle-aar-stat-label"><WebUIText textKey="Auto.ComponentsNotificationsBattleAfterActionModal.76.3" /></span>
          <span className="battle-aar-stat-value battle-aar-stat-value--loss">
            {formatNumber(side.losses)} ({formatPercent(side.lossPercent)})
          </span>
        </div>
      </div>
      <span className="battle-aar-unit-label">{side.unitLabel}</span>
    </div>
  );
}

function SpoilsList({ spoils }: { spoils: BattleAfterActionSpoilPayload[] }) {
  return (
    <div className="battle-aar-spoils-list">
      {spoils.map(spoil => (
        <div key={`${spoil.resourceId}-${spoil.name}`} className="battle-aar-spoil-item">
          <img src={spoil.iconPath || "/assets/icons/I_Resources.png"} alt="" className="battle-aar-spoil-icon" draggable={false} />
          <span className="battle-aar-spoil-amount">{formatNumber(Math.round(spoil.amount))}</span>
          <span className="battle-aar-spoil-name">{spoil.name}</span>
        </div>
      ))}
    </div>
  );
}

function DamageList({
  units,
  onLinkClick,
}: {
  units: BattleAfterActionUnitDamagePayload[];
  onLinkClick?: (type: string, id: string) => void;
}) {
  return (
    <div className="battle-aar-damage-list">
      {units.map((unit, index) => {
        const factionId = unit.factionId || undefined;
        const handleFactionClick = factionId && onLinkClick ? () => onLinkClick('faction', factionId) : undefined;
        const unitPortrait = WebkilnAssetPath(unit.portraitPath) ?? unit.portraitPath;

        return (
          <div key={unit.unitId || `${unit.side}-${unit.factionId}-${unit.unitName}-${index}`} className={`battle-aar-unit-card${unit.destroyed ? ' battle-aar-unit-card--destroyed' : ''}`}>
            <div className="battle-aar-unit-card-portrait-frame">
              {unitPortrait ? (
                <img
                  src={unitPortrait}
                  alt=""
                  className="battle-aar-unit-card-portrait"
                  draggable={false}
                />
              ) : null}
              <FactionRoundel
                factionId={factionId}
                colour={unit.factionColour || undefined}
                secondaryColour={unit.factionSecondaryColour || undefined}
                emblem={unit.factionEmblem || undefined}
                cultureGroup={unit.factionCultureGroup || undefined}
                name={unit.factionName || unit.militaryName}
                size="sm"
                className="battle-aar-unit-card-roundel"
                onClick={handleFactionClick}
              />
            </div>
            <div className="battle-aar-damage-main">
              <div className="battle-aar-damage-title-row">
                <span className="battle-aar-damage-name">{unit.unitName}</span>
                <img src={unit.iconPath || "/assets/icons/UnitTypes/I_ArmySpecial.png"} alt="" className="battle-aar-damage-unit-icon" draggable={false} />
              </div>
              <span className="battle-aar-damage-source">{unit.militaryName || unit.factionName}</span>
            </div>
            <div className="battle-aar-unit-card-status">
              {unit.destroyed ? webUIText("Auto.Fix.ExprTrue.componentsnotificationsBattleAfterActionModal.127.1") : webUIText("Auto.Fix.ExprFalse.componentsnotificationsBattleAfterActionModal.127.1", { Value1: formatNumber(unit.remainingStrength) })}
            </div>
            <div className="battle-aar-unit-card-stats">
              <div className="battle-aar-unit-card-stat">
                <span className="battle-aar-unit-card-stat-value">{formatNumber(unit.kills)}</span>
                <span className="battle-aar-unit-card-stat-label"><WebUIText textKey="BattleResults.Kills" /></span>
              </div>
              <div className="battle-aar-unit-card-stat">
                <span className="battle-aar-unit-card-stat-value">{formatNumber(Math.round(unit.damageDealt))}</span>
                <span className="battle-aar-unit-card-stat-label"><WebUIText textKey="BattleResults.DamageDealt" /></span>
              </div>
              <div className="battle-aar-unit-card-stat">
                <span className="battle-aar-unit-card-stat-value battle-aar-unit-card-stat-value--loss">{formatNumber(unit.losses)}</span>
                <span className="battle-aar-unit-card-stat-label"><WebUIText textKey="BattleResults.Lost" /></span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function DamageSideGroup({
  side,
  title,
  units,
  onLinkClick,
}: {
  side: string;
  title: string;
  units: BattleAfterActionUnitDamagePayload[];
  onLinkClick?: (type: string, id: string) => void;
}) {
  if (units.length === 0) return null;

  const losses = units.reduce((sum, unit) => sum + unit.losses, 0);

  return (
    <div className={`battle-aar-damage-group battle-aar-damage-group--${side}`}>
      <div className="battle-aar-damage-group-header">
        <span className="battle-aar-damage-group-title">{title}</span>
        <span className={`battle-aar-damage-side battle-aar-damage-side--${side}`}>
          {formatNumber(losses)} <WebUIText textKey="Auto.ComponentsNotificationsBattleAfterActionModal.154.4" />
        </span>
      </div>
      <DamageList units={units} onLinkClick={onLinkClick} />
    </div>
  );
}

export default function BattleAfterActionModal({
  notification,
  open,
  onClose,
  onNavigate,
  onLinkClick,
}: BattleAfterActionModalProps) {
  const report = notification?.battleAfterActionReport;
  const modalOpen = open && Boolean(notification && report?.available);
  const { mounted, closing, close, stopPropagation } = useModalPresence({
    open: modalOpen,
    onClose,
    escapeId: 'modal.battle-after-action',
    closeStrategy: 'request',
  });

  if (!mounted || !notification || !report?.available) return null;

  const headerImage = WebkilnAssetPath(report.headerImage || (report.ourSide.won ? '/assets/events/military-victory.png' : '/assets/ui/T_BattleScreen_Background.png')) ?? '';
  const headerImageStyle = {
    backgroundImage: `url("${headerImage.replace(/"/g, '\\"')}")`,
  };
  const outcomeClass = report.ourSide.won ? 'battle-aar-hero--victory' : 'battle-aar-hero--defeat';
  const battleName = report.battleName || notification.title || report.outcome;
  const spoils = report.spoilsList || [];
  const damagedUnits = combineUnitDamage(report.unitDamage || []);
  const ourDamagedUnits = damagedUnits.filter(unit => unit.side === 'our');
  const enemyDamagedUnits = damagedUnits.filter(unit => unit.side === 'enemy');
  const otherDamagedUnits = damagedUnits.filter(unit => unit.side !== 'our' && unit.side !== 'enemy');

  return (
    <div
      className={`modal-overlay battle-aar-overlay${closing ? ' modal-overlay--closing battle-aar-overlay--closing' : ''}`}
      onMouseDown={event => {
        if (event.target !== event.currentTarget) return;
        event.preventDefault();
        event.stopPropagation();
        close();
      }}
      onClick={event => {
        if (event.target !== event.currentTarget) return;
        event.preventDefault();
        event.stopPropagation();
      }}
    >
      <div
        className={`modal battle-aar-modal${closing ? ' modal--closing battle-aar-modal--closing' : ''}`}
        onMouseDown={stopPropagation}
      >
        <div className={`battle-aar-hero ${outcomeClass}`}>
          <div className="battle-aar-hero-image" style={headerImageStyle} />
          <div className="battle-aar-hero-shade" />
          <div className="battle-aar-hero-close">
            <CloseButton size="sm" onClick={close} />
          </div>
          <div className="battle-aar-hero-content">
            <h2 className="battle-aar-title">
              <span className="battle-aar-outcome">{report.outcome}</span>
              <span>{battleName}</span>
            </h2>
          </div>
        </div>

        <StyledScrollArea className="battle-aar-body" viewportClassName="battle-aar-body-viewport">
          <div className="battle-aar-summary">
            {renderBattleAARFlowText(report.summary || notification.description, onLinkClick)}
          </div>

          <div className="battle-aar-meta-row">
            <div className="battle-aar-meta">
              <span className="battle-aar-meta-label"><WebUIText textKey="Auto.ComponentsNotificationsBattleAfterActionModal.215.5" /></span>
              <span className="battle-aar-meta-value">
                {renderBattleAARRichText(report.location || webUIText('Common.Unknown'), onLinkClick)}
              </span>
            </div>
          </div>

          <div className="battle-aar-sides">
            <SideReport side={report.ourSide} fallbackFaction={ourDamagedUnits[0]} onLinkClick={onLinkClick} />
            <SideReport side={report.enemySide} fallbackFaction={enemyDamagedUnits[0]} onLinkClick={onLinkClick} />
          </div>

          {spoils.length > 0 ? (
            <div className="battle-aar-spoils">
              <span className="battle-aar-meta-label"><WebUIText textKey="Auto.ComponentsNotificationsBattleAfterActionModal.231.7" /></span>
              <SpoilsList spoils={spoils} />
            </div>
          ) : report.spoils ? (
            <div className="battle-aar-spoils">
              <span className="battle-aar-meta-label"><WebUIText textKey="Auto.ComponentsNotificationsBattleAfterActionModal.236.8" /></span>
              <span className="battle-aar-meta-value">{report.spoils}</span>
            </div>
          ) : null}

          {damagedUnits.length > 0 ? (
            <div className="battle-aar-damage-section">
          <span className="battle-aar-meta-label"><WebUIText textKey="BattleResults.UnitPerformance" /></span>
              <div className="battle-aar-damage-columns">
                <DamageSideGroup side="our" title={report.ourSide.label} units={ourDamagedUnits} onLinkClick={onLinkClick} />
                <DamageSideGroup side="enemy" title={report.enemySide.label} units={enemyDamagedUnits} onLinkClick={onLinkClick} />
                <DamageSideGroup side="other" title={webUIText('Auto.Attr.ComponentsNotificationsBattleAfterActionModal.248.1')} units={otherDamagedUnits} onLinkClick={onLinkClick} />
              </div>
            </div>
          ) : null}
        </StyledScrollArea>

        <div className="battle-aar-footer">
          {onNavigate ? (
            <GameButton
              variant="outline"
              icon="/assets/icons/I_Search.png"
              className="battle-aar-location-button"
              onClick={onNavigate}
            >
              <span><WebUIText textKey="Auto.ComponentsNotificationsBattleAfterActionModal.256.10" /></span>
            </GameButton>
          ) : null}
          <GameButton variant="burgundy" onClick={close}>
            <WebUIText textKey="Auto.ComponentsNotificationsBattleAfterActionModal.260.11" />
          </GameButton>
        </div>
      </div>
    </div>
  );
}
