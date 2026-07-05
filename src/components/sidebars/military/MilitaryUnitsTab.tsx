import React, { type MouseEvent as ReactMouseEvent } from 'react';
import PaintedBar from '../../common/data-display/bars/PaintedBar';
import SectionHeading from '../../common/data-display/stats/SectionHeading';
import Tooltip from '../../common/tooltips/Tooltip';
import type { TooltipContent } from '../../common/tooltips/Tooltip';
import type { ArmyUnitRow, ArmyUnitTypeStrength } from '../../../data/types';
import { TIER_ICONS } from '../../../utils/iconMaps';
import { formatNumber } from '../../../utils/numberFormat';
import { webUIText } from '../../../localization/WebUITextContext';
import {
  buildUnitTooltip,
  formatLargeNumber,
  formatStrength,
  formatUnitTypeName,
  getStrengthBarColor,
  getStrengthColor,
  resolveUnitStats,
  type CompositionSummaryRow,
  type UnitStatCaps,
  type UnitRosterGroup,
  type UnitSelectionBox,
  unitRowSourceSummary,
  unitTypeIconPath,
} from './MilitarySidebarPresentation';

type UnitStatTile = {
  id: string;
  label: string;
  icon: string;
  value: string;
  tooltip: TooltipContent;
};

type MilitaryUnitsTabProps = {
  unitStatTiles: UnitStatTile[];
  compositionSummary: CompositionSummaryRow[];
  unitRows: ArmyUnitRow[];
  unitGroups: UnitRosterGroup[];
  unitSelectionBox: UnitSelectionBox | null;
  unitRosterRef: React.RefObject<HTMLDivElement | null>;
  unitRowRefs: React.MutableRefObject<Record<string, HTMLDivElement | null>>;
  selectedUnitIdSet: Set<string>;
  expandedUnitGroupSet: Set<string>;
  maxStats: UnitStatCaps;
  handleUnitRowMouseDown: (event: ReactMouseEvent<HTMLDivElement>, unit: ArmyUnitRow) => void;
  toggleUnitGroup: (key: string) => void;
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

export function isInProgressUnitRow(row: ArmyUnitRow): boolean {
  return row.rowType === 'beingBuilt' || row.rowType === 'inTransit';
}
export function MilitaryUnitsTab({
  unitStatTiles,
  compositionSummary,
  unitRows,
  unitGroups,
  unitSelectionBox,
  unitRosterRef,
  unitRowRefs,
  selectedUnitIdSet,
  expandedUnitGroupSet,
  maxStats,
  handleUnitRowMouseDown,
  toggleUnitGroup,
}: MilitaryUnitsTabProps) {
  const renderUnitRow = (unit: ArmyUnitRow, extraClassName = '') => {
    const stats = resolveUnitStats(unit);
    const ratio = unit.maxStrength > 0 ? unit.strength / unit.maxStrength : 0;
    const typeLabel = formatUnitTypeName(unit.type);
    const typeIcon = unitTypeIconPath(unit.type);
    const pending = unit.rowType !== 'existing';
    const barPercent = pending && (unit.rowType === 'beingBuilt' || unit.rowType === 'inTransit')
      ? unit.progress * 100
      : ratio * 100;
    const rowClass = `mil-unit-row mil-unit-row--${unit.rowType}${extraClassName}${unit.selectable ? ' is-selectable' : ''}${selectedUnitIdSet.has(unit.id) ? ' is-selected' : ''}`;
    const metaDetail = pending
      ? unitRowSourceSummary(unit)
      : unit.culture;

    return (
      <Tooltip key={unit.id} content={buildUnitTooltip(unit, maxStats)} position="left" delay={200}>
        <div
          ref={(element) => { unitRowRefs.current[unit.id] = element; }}
          className={rowClass}
          onMouseDown={(event) => handleUnitRowMouseDown(event, unit)}
        >
          <img src={typeIcon} alt="" className="mil-unit-type-icon" />
          <div className="mil-unit-info">
            <span className="mil-unit-name">
              <span className="mil-unit-name-text">{unit.name}</span>
              <span className="mil-unit-count">{formatNumber(unit.count)}</span>
              {TIER_ICONS[stats.tier] && <img src={TIER_ICONS[stats.tier]} alt={webUIText("Auto.Attr.componentssidebarsMilitarySidebar.1116.1", { Tier: stats.tier })} className="mil-unit-tier-icon" />}
            </span>
            <span className="mil-unit-type">{unit.statusLabel || typeLabel}<span className="mil-unit-culture">{metaDetail}</span></span>
          </div>
          <div className="mil-unit-bar">
            <PaintedBar percent={barPercent} color={pending ? 'gold' : getStrengthBarColor(ratio)} />
            <span className="mil-unit-strength" style={{ color: getStrengthColor(ratio) }}>{formatStrength(unit.strength, unit.maxStrength)}</span>
          </div>
        </div>
      </Tooltip>
    );
  };

  const renderUnitGroup = (group: UnitRosterGroup) => {
    if (group.rows.length <= 1) {
      return renderUnitRow(group.rows[0]);
    }

    const expanded = expandedUnitGroupSet.has(group.key);
    const visibleRows = expanded ? group.rows : group.rows.filter(isInProgressUnitRow);
    const ratio = group.maxStrength > 0 ? group.strength / group.maxStrength : 0;
    const typeIcon = unitTypeIconPath(group.type);
    const unitWord = webUIText(group.rows.length === 1 ? 'Common.Unit' : 'Common.Units');
    const rowCountText = webUIText('Common.CountWithUnit', { Count: formatNumber(group.rows.length), Unit: unitWord });
    const toggleLabel = expanded
      ? webUIText("Auto.Fix.ExprTrue.componentssidebarsMilitarySidebar.1053.1")
      : webUIText("Auto.Fix.ExprFalse.componentssidebarsMilitarySidebar.1053.1", { Value1: formatNumber(group.rows.length) });
    const handleToggleGroup = (event: ReactMouseEvent) => {
      event.preventDefault();
      event.stopPropagation();
      toggleUnitGroup(group.key);
    };

    return (
      <div key={group.key} className={`mil-unit-group${expanded ? ' is-expanded' : ''}`}>
        <Tooltip
          content={{
            title: group.name,
            lines: [
              { label: webUIText('Economy.Type'), value: formatUnitTypeName(group.type) },
              { label: webUIText('Auto.Attr.ComponentsSidebarsMilitarySidebar.1101.46'), value: rowCountText },
              { label: webUIText('Auto.Prop.ComponentsSidebarsMilitarySidebar.1033.43'), value: formatStrength(group.strength, group.maxStrength), valueColor: getStrengthColor(ratio) },
            ],
          }}
          position="left"
          delay={150}
        >
          <div
            className={`mil-unit-group-summary${expanded ? ' is-expanded' : ''}`}
            role="button"
            aria-label={toggleLabel}
            onMouseDown={handleToggleGroup}
          >
            <button
              type="button"
              className={`mil-unit-expand-button${expanded ? ' is-expanded' : ''}`}
              aria-label={toggleLabel}
              onMouseDown={handleToggleGroup}
            >
              <img src="/assets/icons/I_NavNext.png" alt="" draggable={false} />
            </button>
            <img src={typeIcon} alt="" className="mil-unit-type-icon" />
            <div className="mil-unit-info">
              <span className="mil-unit-name">
                <span className="mil-unit-name-text">{group.name}</span>
                <span className="mil-unit-count">{formatNumber(group.count)}</span>
              </span>
              <span className="mil-unit-type">{rowCountText}</span>
            </div>
            <div className="mil-unit-bar mil-unit-bar--summary">
              <PaintedBar percent={ratio * 100} color={getStrengthBarColor(ratio)} />
            </div>
          </div>
        </Tooltip>
        {visibleRows.map(unit => renderUnitRow(unit, ' mil-unit-row--child'))}
      </div>
    );
  };

  return (
    <div className="mil-units-tab">
      <SectionHeading variant="ornate" title={webUIText('Common.Stats')} />
      <div className="mil-unit-stat-summary">
        {unitStatTiles.map((tile) => (
          <Tooltip key={tile.id} content={tile.tooltip} position="bottom" delay={150}>
            <div className="mil-unit-stat-tile">
              <img src={tile.icon} alt="" className="mil-unit-stat-tile-icon" />
              <span className="mil-unit-stat-tile-label">{tile.label}</span>
              <strong>{tile.value}</strong>
            </div>
          </Tooltip>
        ))}
      </div>
      <SectionHeading variant="ornate" title={webUIText('Auto.Attr.ComponentsSidebarsMilitarySidebar.1080.45')} />
      <div className="mil-composition">
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
        {unitGroups.map(group => renderUnitGroup(group))}
      </div>
    </div>
  );
}
