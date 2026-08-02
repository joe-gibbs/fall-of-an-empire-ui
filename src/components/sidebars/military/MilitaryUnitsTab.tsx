import React, { type MouseEvent as ReactMouseEvent } from 'react';
import PaintedBar from '../../common/data-display/bars/PaintedBar';
import SectionHeading from '../../common/data-display/stats/SectionHeading';
import Tooltip from '../../common/tooltips/Tooltip';
import type { ArmyBattleGroup, ArmyUnitRow, ArmyUnitTypeStrength } from '../../../data/types';
import { TIER_ICONS } from '../../../utils/iconMaps';
import { formatNumber, formatPercent } from '../../../utils/numberFormat';
import { webUIText } from '../../../localization/WebUITextContext';
import { battleFormationRoleIcon } from '../../../utils/battleFormationNaming';
import {
  buildUnitTooltip,
  formatLargeNumber,
  formatStrength,
  formatUnitTypeName,
  getStrengthColor,
  isUnitRowPending,
  isUnitRowProgressing,
  resolveUnitStats,
  type CompositionSummaryRow,
  type UnitStatCaps,
  type UnitSelectionBox,
  unitRowPortraitSrc,
  unitRowSourcePreview,
  unitRowStatusText,
  unitRowUsesTypePortrait,
  unitTypeIconPath,
} from './MilitarySidebarPresentation';

type MilitaryUnitsTabProps = {
  isNavy: boolean;
  compositionSummary: CompositionSummaryRow[];
  unitRows: ArmyUnitRow[];
  battleGroups: ArmyBattleGroup[];
  unitSelectionBox: UnitSelectionBox | null;
  unitRosterRef: React.RefObject<HTMLDivElement | null>;
  unitRowRefs: React.MutableRefObject<Record<string, HTMLDivElement | null>>;
  selectedUnitIdSet: Set<string>;
  maxStats: UnitStatCaps;
  handleUnitRowMouseDown: (event: ReactMouseEvent<HTMLDivElement>, unit: ArmyUnitRow) => void;
};

export function renderUnitTypeCounts(unitTypes: ArmyUnitTypeStrength[]): React.ReactNode {
  return unitTypes.map((entry) => {
    const typeLabel = formatUnitTypeName(entry.type);
    return (
      <span key={entry.type} className="mil-sub-type-count" aria-label={`${typeLabel} ${formatNumber(entry.count)}`}>
        <img src={unitTypeIconPath(entry.type)} alt="" className="mil-sub-type-icon" />
        <span className="mil-sub-type-value">{formatNumber(entry.count)}</span>
      </span>
    );
  });
}

export function renderUnitTypeStrengths(unitTypes: CompositionSummaryRow[]): React.ReactNode {
  return unitTypes.map((entry) => {
    const typeLabel = formatUnitTypeName(entry.type);
    return (
      <Tooltip
        key={entry.type}
        content={{
          title: typeLabel,
          lines: [
            { label: webUIText('Auto.Prop.ComponentsSidebarsMilitarySidebar.1033.43'), value: formatStrength(entry.strength, entry.maxStrength), valueColor: getStrengthColor(entry.maxStrength > 0 ? entry.strength / entry.maxStrength : 0) },
          ],
        }}
        position="bottom"
        delay={100}
      >
        <span className="mil-header-type-strength" aria-label={`${typeLabel} ${formatLargeNumber(entry.strength)}`}>
          <img src={unitTypeIconPath(entry.type)} alt="" className="mil-header-type-strength-icon" />
          <span className="mil-header-type-strength-value">{formatLargeNumber(entry.strength)}</span>
        </span>
      </Tooltip>
    );
  });
}

function renderUnitRowReadout(unit: ArmyUnitRow): React.ReactNode {
  const progressing = isUnitRowProgressing(unit.rowType);
  const pending = isUnitRowPending(unit.rowType);
  const ratio = unit.maxStrength > 0 ? unit.strength / unit.maxStrength : 0;
  const progressPercent = Math.round(unit.progress * 100);

  if (progressing) {
    return (
      <div className="mil-unit-bar mil-unit-bar--progress">
        <PaintedBar percent={progressPercent} color="gold" />
        <span className="mil-unit-progress">{formatPercent(progressPercent)}</span>
      </div>
    );
  }

  if (pending) {
    return (
      <div className="mil-unit-bar mil-unit-bar--pending">
        <span className="mil-unit-strength mil-unit-strength--muted">—</span>
      </div>
    );
  }

  return (
    <div className="mil-unit-bar mil-unit-bar--strength">
      <span className="mil-unit-strength" style={{ color: getStrengthColor(ratio) }}>
        {formatStrength(unit.strength, unit.maxStrength)}
      </span>
    </div>
  );
}

export function MilitaryUnitsTab({
  isNavy,
  compositionSummary,
  unitRows,
  battleGroups,
  unitSelectionBox,
  unitRosterRef,
  unitRowRefs,
  selectedUnitIdSet,
  maxStats,
  handleUnitRowMouseDown,
}: MilitaryUnitsTabProps) {
  const renderUnitRow = (unit: ArmyUnitRow, extraClassName = '') => {
    const stats = resolveUnitStats(unit);
    const typeLabel = formatUnitTypeName(unit.type);
    const pending = isUnitRowPending(unit.rowType);
    const usesTypePortrait = unitRowUsesTypePortrait(unit);
    const portraitSrc = unitRowPortraitSrc(unit);
    const sourcePreview = pending ? unitRowSourcePreview(unit, 2) : null;
    const statusText = pending ? unitRowStatusText(unit) : '';
    const rowClass = `mil-unit-row mil-unit-row--${unit.rowType}${extraClassName}${unit.selectable ? ' is-selectable' : ''}${selectedUnitIdSet.has(unit.id) ? ' is-selected' : ''}`;
    const portraitClass = [
      'mil-sidebar-unit-portrait',
      pending ? 'mil-sidebar-unit-portrait--pending' : '',
      usesTypePortrait ? 'mil-sidebar-unit-portrait--type' : '',
    ].filter(Boolean).join(' ');

    return (
      <Tooltip key={unit.id} content={buildUnitTooltip(unit, maxStats)} position="left" delay={200}>
        <div
          ref={(element) => { unitRowRefs.current[unit.id] = element; }}
          className={rowClass}
          onMouseDown={(event) => handleUnitRowMouseDown(event, unit)}
        >
          <img src={portraitSrc} alt="" className={portraitClass} draggable={false} />
          <div className="mil-unit-info">
            <span className="mil-unit-name">
              <span className="mil-unit-name-text">{unit.name}</span>
              <span className="mil-unit-count">{webUIText('Military.UnitRow.Count', { Count: formatNumber(unit.count) })}</span>
              {TIER_ICONS[stats.tier] && (
                <img
                  src={TIER_ICONS[stats.tier]}
                  alt={webUIText('Auto.Attr.componentssidebarsMilitarySidebar.1116.1', { Tier: stats.tier })}
                  className="mil-unit-tier-icon"
                />
              )}
            </span>
            {pending ? (
              <>
                <span className="mil-unit-meta mil-unit-meta--status">{statusText}</span>
                {sourcePreview && sourcePreview.labels.length > 0 && (
                  <span className="mil-unit-sources" aria-label={sourcePreview.full}>
                    <span className="mil-unit-sources-text">{sourcePreview.labels.join(', ')}</span>
                    {sourcePreview.remaining > 0 && (
                      <span className="mil-unit-sources-more">
                        {webUIText('Military.UnitRow.SourcesMore', { Count: formatNumber(sourcePreview.remaining) })}
                      </span>
                    )}
                  </span>
                )}
              </>
            ) : (
              <span className="mil-unit-meta">
                <span className="mil-unit-type">{typeLabel}</span>
                {unit.culture && <span className="mil-unit-culture">{unit.culture}</span>}
              </span>
            )}
          </div>
          {renderUnitRowReadout(unit)}
        </div>
      </Tooltip>
    );
  };

  const unitRowById = new Map(unitRows.map(unit => [unit.id, unit]));
  const assignedUnitIds = new Set(battleGroups.flatMap(group => group.unitIds));
  const unassignedRows = unitRows.filter(unit => !assignedUnitIds.has(unit.id));
  const compositionClass = compositionSummary.length <= 1
    ? 'mil-composition mil-composition--compact'
    : 'mil-composition';

  return (
    <div className="mil-units-tab">
      <SectionHeading variant="ornate" title={webUIText('Auto.Attr.ComponentsSidebarsMilitarySidebar.1080.45')} />
      <div className={compositionClass}>
        {compositionSummary.map((row) => {
          const typeLabel = formatUnitTypeName(row.type);
          const typeIcon = unitTypeIconPath(row.type);
          return (
            <Tooltip
              key={row.type}
              content={{
                title: typeLabel,
                lines: [
                  { label: webUIText('Auto.Prop.ComponentsSidebarsMilitarySidebar.1033.43'), value: formatStrength(row.strength, row.maxStrength), valueColor: getStrengthColor(row.maxStrength > 0 ? row.strength / row.maxStrength : 0) },
                ],
              }}
              position="bottom"
              delay={150}
            >
              <div className="mil-comp-row" aria-label={typeLabel}>
                <img src={typeIcon} alt="" className="mil-comp-icon" />
                <span className="mil-comp-count">{formatNumber(row.count)}</span>
              </div>
            </Tooltip>
          );
        })}
      </div>
      <SectionHeading variant="ornate" title={webUIText('Auto.Attr.ComponentsSidebarsMilitarySidebar.1101.46')} count={unitRows.length} />
      <div className="mil-roster" ref={unitRosterRef}>
        {unitSelectionBox && (
          <div
            className="mil-unit-selection-box"
            style={{
              left: `${unitSelectionBox.left}px`,
              top: `${unitSelectionBox.top}px`,
              width: `${unitSelectionBox.width}px`,
              height: `${unitSelectionBox.height}px`,
            }}
          />
        )}
        {battleGroups.map((group) => {
          const rows = group.unitIds
            .map(unitId => unitRowById.get(unitId))
            .filter((unit): unit is ArmyUnitRow => Boolean(unit));
          const roleIcon = battleFormationRoleIcon(group.role, isNavy ? 'naval' : 'land');
          const groupStrength = rows.reduce((sum, unit) => sum + (isUnitRowPending(unit.rowType) ? 0 : unit.strength), 0);
          const groupMaxStrength = rows.reduce((sum, unit) => sum + unit.maxStrength, 0);
          return (
            <div key={group.id} className="mil-battle-group">
              <div className="mil-battle-group-head">
                <img src={roleIcon} alt="" className="mil-battle-group-icon" draggable={false} />
                <span className="mil-battle-group-title">{group.name}</span>
                <span className="mil-battle-group-meta">
                  <span className="mil-battle-group-count">{formatNumber(rows.length)}</span>
                  {groupMaxStrength > 0 && (
                    <span className="mil-battle-group-strength">
                      {formatStrength(groupStrength, groupMaxStrength)}
                    </span>
                  )}
                </span>
              </div>
              <div className="mil-battle-group-units">
                {rows.map(unit => renderUnitRow(unit))}
              </div>
            </div>
          );
        })}
        {unassignedRows.length > 0 && (
          <div className="mil-unit-loose-rows">
            {unassignedRows.map(unit => renderUnitRow(unit))}
          </div>
        )}
      </div>
    </div>
  );
}
