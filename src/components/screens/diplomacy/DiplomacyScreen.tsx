import { useEffect, useMemo, useState, type ReactNode } from 'react';
import ScreenShell from '../../common/layout/shell/ScreenShell';
import SidebarTabBar from '../../sidebars/shared/SidebarTabBar';
import Panel from '../../common/layout/shell/Panel';
import FactionRoundel from '../../common/entities/FactionRoundel';
import FactionTooltip from '../../common/tooltips/FactionTooltip';
import Tooltip from '../../common/tooltips/Tooltip';
import CourtOfficeSummary from '../../common/entities/CourtOfficeSummary';
import VirtualList from '../../common/layout/scrolling/VirtualList';
import CourtAppointmentModal from '../../modals/characters/CourtAppointmentModal';
import SortableHeader from '../../common/layout/tables/SortableHeader';
import { useGameActions } from '../../../context/GameContext';
import { useCourtPositions, useFaction, usePlayerFactionId } from '../../../data-source/index';
import { breakTreatyBridge, useDiplomacyOverviewBridge, type DiplomacyOverviewState } from '../../../bridge/diplomacy/useDiplomacyOverviewBridge';
import type { CourtPositionView } from '../../../bridge/characters/useCourtPositionsBridge';
import type { Faction, FactionTreaty } from '../../../data/types';
import { formatTreatyType } from '../../../utils/displayLabels';
import { canNegotiateDiplomacyWith } from '../../../utils/diplomacyAuthority';
import { formatNumber, formatSignedNumber } from '../../../utils/numberFormat';
import { compareSortValuesWithDirection, toggleSortState, type SortDirection, type SortState, type SortValue } from '../../common/layout/tables/sortUtils';
import { registerScreen, registerTopbarButton } from '../../../registry/index';
import './DiplomacyScreen.css';

import { webUIText, WebUIText } from '../../../localization/WebUITextContext';
interface DiplomacyScreenProps {
  onClose: () => void;
  initialTab?: string | null;
}

type FactionRow = DiplomacyOverviewState['foreignPowers'][number];
type ActiveWar = DiplomacyOverviewState['activeWars'][number];
type FactionRef = ActiveWar['ourParticipants'][number];
type ForeignSortKey = 'faction' | 'status' | 'opinion' | 'strength' | 'settlements' | 'treaties';
type TreatySortKey = 'faction' | 'type' | 'duration';
type WarSortKey = 'name' | 'ours' | 'theirs' | 'warScore' | 'duration' | 'battles';

function warScoreTooltip(row: ActiveWar) {
  return {
    title: webUIText('Diplomacy.WarScoreBreakdown'),
    body: webUIText('Diplomacy.WarScoreBreakdownBody'),
    lines: row.warScoreBreakdown.map(entry => ({
      label: `${entry.depth > 0 ? '· ' : ''}${entry.label}${entry.eventCount > 1 ? ` (${formatNumber(entry.eventCount)})` : ''}`,
      value: formatSignedNumber(entry.score, { maximumFractionDigits: 1 }),
      valueColor: entry.score >= 0 ? 'var(--green)' : 'var(--red)',
    })),
  };
}

const TABS = [
  { id: 'foreign', get label() { return webUIText('Auto.TopProp.ComponentsScreensDiplomacyScreen.28.1'); } },
  { id: 'treaties', get label() { return webUIText('Auto.TopProp.ComponentsScreensDiplomacyScreen.29.2'); } },
  { id: 'wars', get label() { return webUIText('Auto.TopProp.ComponentsScreensDiplomacyScreen.30.3'); } },
];

interface DiplomacyTableColumn<TKey extends string> {
  id: TKey;
  label: string;
  className?: string;
  sortable?: boolean;
}

const FOREIGN_COLUMNS: Array<DiplomacyTableColumn<ForeignSortKey | 'actions'>> = [
  { id: 'faction', get label() { return webUIText('Auto.TopProp.ComponentsScreensDiplomacyScreen.39.4'); }, className: 'dps-table-col--faction' },
  { id: 'status', get label() { return webUIText('Auto.TopProp.ComponentsScreensDiplomacyScreen.40.5'); }, className: 'dps-table-col--short' },
  { id: 'opinion', get label() { return webUIText('Auto.TopProp.ComponentsScreensDiplomacyScreen.41.6'); }, className: 'dps-table-col--short' },
  { id: 'strength', get label() { return webUIText('Auto.TopProp.ComponentsScreensDiplomacyScreen.42.7'); }, className: 'dps-table-col--short' },
  { id: 'settlements', get label() { return webUIText('Auto.TopProp.ComponentsScreensDiplomacyScreen.43.8'); }, className: 'dps-table-col--short' },
  { id: 'treaties', get label() { return webUIText('Auto.TopProp.ComponentsScreensDiplomacyScreen.44.9'); }, className: 'dps-table-col--short' },
  { id: 'actions', get label() { return webUIText('Auto.TopProp.ComponentsScreensDiplomacyScreen.45.10'); }, className: 'dps-table-col--actions', sortable: false },
];

const TREATY_COLUMNS: Array<DiplomacyTableColumn<TreatySortKey | 'actions'>> = [
  { id: 'faction', get label() { return webUIText('Auto.TopProp.ComponentsScreensDiplomacyScreen.49.11'); }, className: 'dps-table-col--faction' },
  { id: 'type', get label() { return webUIText('Auto.TopProp.ComponentsScreensDiplomacyScreen.50.12'); }, className: 'dps-table-col--wide' },
  { id: 'duration', get label() { return webUIText('Auto.TopProp.ComponentsScreensDiplomacyScreen.51.13'); }, className: 'dps-table-col--short' },
  { id: 'actions', get label() { return webUIText('Auto.TopProp.ComponentsScreensDiplomacyScreen.52.14'); }, className: 'dps-table-col--actions', sortable: false },
];

const WAR_COLUMNS: Array<DiplomacyTableColumn<WarSortKey | 'actions'>> = [
  { id: 'name', get label() { return webUIText('Auto.TopProp.ComponentsScreensDiplomacyScreen.56.15'); }, className: 'dps-table-col--wide' },
  { id: 'ours', get label() { return webUIText('Auto.TopProp.ComponentsScreensDiplomacyScreen.57.16'); }, className: 'dps-table-col--war-side' },
  { id: 'theirs', get label() { return webUIText('Auto.TopProp.ComponentsScreensDiplomacyScreen.58.17'); }, className: 'dps-table-col--war-side' },
  { id: 'warScore', get label() { return webUIText('Auto.TopProp.ComponentsScreensDiplomacyScreen.59.18'); }, className: 'dps-table-col--short' },
  { id: 'duration', get label() { return webUIText('Auto.TopProp.ComponentsScreensDiplomacyScreen.60.19'); }, className: 'dps-table-col--short' },
  { id: 'battles', get label() { return webUIText('Auto.TopProp.ComponentsScreensDiplomacyScreen.61.20'); }, className: 'dps-table-col--short' },
  { id: 'actions', get label() { return webUIText('Auto.TopProp.ComponentsScreensDiplomacyScreen.62.21'); }, className: 'dps-table-col--actions', sortable: false },
];

function cellClass(...classes: Array<string | false | undefined>): string {
  return classes.filter(Boolean).join(' ');
}

function fmt(value: number | undefined): string {
  return formatNumber(value);
}

function fmtSigned(value: number | undefined): string {
  return formatSignedNumber(value);
}

function fmtDuration(days: number | undefined): string {
  const total = Math.max(0, Math.round(days ?? 0));
  const years = Math.floor(total / 336);
  const remainder = total % 336;
  const dayText = `${fmt(remainder)} day${remainder === 1 ? '' : 's'}`;
  if (years <= 0) return dayText;
  return `${fmt(years)} year${years === 1 ? '' : 's'}, ${dayText}`;
}

function signedValueClass(value: number | undefined): string {
  return value !== undefined && value < 0 ? 'dps-value--negative' : 'dps-value--positive';
}

function canNegotiateTreatyWithRow(row: FactionRow, playerFaction?: Faction | null): boolean {
  return !row.isAtWar && canNegotiateDiplomacyWith(playerFaction, row);
}

function compareRowValues(a: SortValue, b: SortValue, direction: SortDirection): number {
  return compareSortValuesWithDirection(a, b, direction);
}

function sortedForeignRows(rows: FactionRow[], sort: SortState<ForeignSortKey>): FactionRow[] {
  return [...rows].sort((a, b) => {
    switch (sort.key) {
      case 'faction':
        return compareRowValues(a.name, b.name, sort.direction);
      case 'status':
        return compareRowValues(a.diplomaticStatusLabel || a.diplomaticStatus, b.diplomaticStatusLabel || b.diplomaticStatus, sort.direction);
      case 'opinion':
        return compareRowValues(a.opinion, b.opinion, sort.direction);
      case 'strength':
        return compareRowValues(a.strength, b.strength, sort.direction);
      case 'settlements':
        return compareRowValues(a.settlements, b.settlements, sort.direction);
      case 'treaties':
        return compareRowValues(a.treaties, b.treaties, sort.direction);
      default:
        return 0;
    }
  });
}

function treatyDurationSortValue(row: FactionTreaty): number {
  if (row.isPerpetual) return Number.POSITIVE_INFINITY;
  return Number(row.daysRemaining ?? row.turnsRemaining ?? 0);
}

function sortedTreatyRows(rows: FactionTreaty[], sort: SortState<TreatySortKey>): FactionTreaty[] {
  return [...rows].sort((a, b) => {
    switch (sort.key) {
      case 'faction':
        return compareRowValues(a.withFaction, b.withFaction, sort.direction);
      case 'type':
        return compareRowValues(formatTreatyType(a.type), formatTreatyType(b.type), sort.direction);
      case 'duration':
        return compareRowValues(treatyDurationSortValue(a), treatyDurationSortValue(b), sort.direction);
      default:
        return 0;
    }
  });
}

function sortedWarRows(rows: ActiveWar[], sort: SortState<WarSortKey>): ActiveWar[] {
  return [...rows].sort((a, b) => {
    switch (sort.key) {
      case 'name':
        return compareRowValues(a.name, b.name, sort.direction);
      case 'ours':
        return compareRowValues(a.ourLeader.name, b.ourLeader.name, sort.direction);
      case 'theirs':
        return compareRowValues(a.theirLeader.name, b.theirLeader.name, sort.direction);
      case 'warScore':
        return compareRowValues(a.warScore, b.warScore, sort.direction);
      case 'duration':
        return compareRowValues(a.durationDays, b.durationDays, sort.direction);
      case 'battles':
        return compareRowValues(a.battlesFought, b.battlesFought, sort.direction);
      default:
        return 0;
    }
  });
}

function FactionNameCell({
  id,
  name,
  colour,
  secondaryColour,
  cultureGroup,
  emblem,
  diplomaticStatus,
  subjectSubtype,
  isPlayer,
  isRebel,
  detail,
}: {
  id?: string;
  name: string;
  colour?: string;
  secondaryColour?: string;
  cultureGroup?: string;
  emblem?: string;
  diplomaticStatus?: string;
  subjectSubtype?: string;
  isPlayer?: boolean;
  isRebel?: boolean;
  detail?: string;
}) {
  const { openSidebar } = useGameActions();
  const shouldResolveFaction = Boolean(id && !diplomaticStatus && !subjectSubtype && isPlayer === undefined && isRebel === undefined);
  const content = (
    <span className="dps-faction-cell">
      <FactionRoundel
        factionId={shouldResolveFaction ? id : undefined}
        colour={colour ?? '#666'}
        secondaryColour={secondaryColour}
        cultureGroup={cultureGroup}
        emblem={emblem}
        name={name}
        diplomaticStatus={diplomaticStatus}
        subjectSubtype={subjectSubtype}
        isPlayer={isPlayer}
        isRebel={isRebel}
        size="sm"
        showRing
        onClick={id ? () => openSidebar('diplomacy', id) : undefined}
      />
      <span className="dps-faction-cell-text">
        <span className="dps-faction-cell-name">{name}</span>
        {detail && <span className="dps-faction-cell-sub">{detail}</span>}
      </span>
    </span>
  );

  return id ? (
    <FactionTooltip factionId={id} factionName={name} delay={150}>
      {content}
    </FactionTooltip>
  ) : content;
}

function FactionTableCell({
  faction,
  detail,
  className = 'dps-table-col--faction',
}: {
  faction: {
    id?: string;
    name: string;
    colour?: string;
    secondaryColour?: string;
    cultureGroup?: string;
    emblem?: string;
    diplomaticStatus?: string;
    subjectSubtype?: string;
    isPlayer?: boolean;
    isRebel?: boolean;
  };
  detail?: string;
  className?: string;
}) {
  return (
    <TableCell className={className}>
      <FactionNameCell
        id={faction.id}
        name={faction.name}
        colour={faction.colour}
        secondaryColour={faction.secondaryColour}
        cultureGroup={faction.cultureGroup}
        emblem={faction.emblem}
        diplomaticStatus={faction.diplomaticStatus}
        subjectSubtype={faction.subjectSubtype}
        isPlayer={faction.isPlayer}
        isRebel={faction.isRebel}
        detail={detail}
      />
    </TableCell>
  );
}

function statusIcon(status: string): string {
  const key = status.toLowerCase();
  if (key.includes('war')) return '/assets/icons/I_Swords.png';
  if (key.includes('subject') || key.includes('foederati')) return '/assets/icons/I_DependentFactions.png';
  if (key.includes('ally')) return '/assets/icons/I_ProposeAlliance.png';
  return '/assets/icons/I_Diplomacy.png';
}

function treatyIcon(type: string): string {
  switch (type) {
    case 'NonAggression': return '/assets/icons/Treaties/I_NonAggression.png';
    case 'Trade':
    case 'TradeOneOff':
    case 'MerchantRights': return '/assets/icons/Treaties/I_TradeAgreement.png';
    case 'MilitaryAlliance': return '/assets/icons/Treaties/I_MilitaryAlliance.png';
    case 'DefensiveAlliance': return '/assets/icons/Treaties/I_DefensiveAlliance.png';
    case 'Subject': return '/assets/icons/I_DependentFactions.png';
    case 'Tribute':
    case 'TributeOneOff': return '/assets/icons/Treaties/I_Tribute.png';
    case 'PassageRights': return '/assets/icons/Treaties/I_MilitaryAccess.png';
    case 'KnowledgeSharing': return '/assets/icons/Treaties/I_MapSharing.png';
    case 'Peace': return '/assets/icons/I_Peace.png';
    default: return '/assets/icons/I_Diplomacy.png';
  }
}

function StatusCell({ label }: { label: string }) {
  return (
    <span className="dps-status-cell">
      <img className="dps-status-icon" src={statusIcon(label)} alt="" />
      <span>{label || '-'}</span>
    </span>
  );
}

function TreatyTypeCell({ type }: { type: string }) {
  return (
    <span className="dps-status-cell">
      <img className="dps-status-icon" src={treatyIcon(type)} alt="" />
      <span>{formatTreatyType(type) || '-'}</span>
    </span>
  );
}

function RowActionButton({
  icon,
  label,
  onMouseDown,
  danger = false,
  disabled = false,
}: {
  icon: string;
  label: string;
  onMouseDown: () => void;
  danger?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      className={`dps-row-action-btn${danger ? ' dps-row-action-btn--danger' : ''}`}
      disabled={disabled}
      aria-label={label}
      onMouseDown={(event) => {
        event.preventDefault();
        event.stopPropagation();
        if (!disabled) onMouseDown();
      }}
    >
      <img src={icon} alt="" className="dps-row-action-icon" draggable={false} />
      <span className="dps-row-action-label">{label}</span>
    </button>
  );
}

function RowActions({
  factionId,
  canNegotiateTreaty = false,
  showView = true,
}: {
  factionId: string;
  canNegotiateTreaty?: boolean;
  showView?: boolean;
}) {
  const { openSidebar, openScreen } = useGameActions();
  return (
    <div className="dps-row-actions">
      {canNegotiateTreaty ? (
        <RowActionButton
          icon="/assets/icons/I_Diplomacy.png"
          label={webUIText('Diplomacy.NegotiateTreaty')}
          onMouseDown={() => openScreen('treaty', factionId)}
        />
      ) : null}
      {showView ? (
        <RowActionButton
          icon="/assets/icons/I_Characters.png"
          label={webUIText('Common.View')}
          onMouseDown={() => openSidebar('diplomacy', factionId)}
        />
      ) : null}
    </div>
  );
}

function FactionPips({ factions }: { factions: FactionRef[] }) {
  if (factions.length === 0) return <span className="dps-muted"><WebUIText textKey="Auto.ComponentsScreensDiplomacyScreen.218.2" /></span>;
  return (
    <span className="dps-faction-pips">
      {factions.map(faction => (
        <FactionTooltip key={faction.id} factionId={faction.id} factionName={faction.name} delay={150}>
          <span className="dps-faction-pip">
            <FactionRoundel
              factionId={faction.id}
              colour={faction.colour}
              secondaryColour={faction.secondaryColour}
              cultureGroup={faction.cultureGroup}
              emblem={faction.emblem}
              name={faction.name}
              size="xs"
              showRing
            />
          </span>
        </FactionTooltip>
      ))}
    </span>
  );
}

function TableRow({ children, className, onMouseDown }: { children: ReactNode; className?: string; onMouseDown?: () => void }) {
  return (
    <div className={cellClass('dps-table-row', className)} role="row" onMouseDown={onMouseDown}>
      {children}
    </div>
  );
}

function TableCell({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cellClass('dps-table-cell', className)} role="cell">
      {children}
    </div>
  );
}

function DiplomacyTable({
  columns,
  body,
  className,
  sort,
  onSort,
}: {
  columns: Array<DiplomacyTableColumn<string>>;
  body: ReactNode;
  className?: string;
  sort?: SortState<string>;
  onSort?: (key: string) => void;
}) {
  return (
    <div className={cellClass('dps-table', className)} role="table">
      <div role="rowgroup">
        <TableRow className="dps-table-header-row">
          {columns.map(column => {
            const className = cellClass('dps-table-header-cell', column.className);
            if (column.sortable !== false && sort && onSort) {
              return (
                <SortableHeader
                  key={column.id}
                  id={column.id}
                  label={column.label}
                  sort={sort}
                  onSort={onSort}
                  className={className}
                  activeClassName="dps-table-header-cell--active"
                  contentClassName="dps-table-header-content"
                />
              );
            }

            return (
              <div className={className} role="columnheader" key={column.id}>
                <span className="dps-table-header-content">{column.label}</span>
              </div>
            );
          })}
        </TableRow>
      </div>
      {body}
    </div>
  );
}

function DiplomacyTablePanel<T>({
  columns,
  rows,
  renderRow,
  getRowKey,
  emptyMessage,
  tableClassName,
  rowHeightRem,
  sort,
  onSort,
}: {
  columns: Array<DiplomacyTableColumn<string>>;
  rows: readonly T[];
  renderRow: (row: T, index: number) => ReactNode;
  getRowKey: (row: T, index: number) => string;
  emptyMessage: string;
  tableClassName?: string;
  rowHeightRem: number;
  sort?: SortState<string>;
  onSort?: (key: string) => void;
}) {
  return (
    <Panel className="dps-panel dps-panel--table" noPadding>
      <DiplomacyTable
        columns={columns}
        className={tableClassName}
        sort={sort}
        onSort={onSort}
        body={(
          <VirtualList
            items={rows}
            renderItem={renderRow}
            getKey={getRowKey}
            empty={<EmptyRow message={emptyMessage} />}
            className="dps-table-body-scroll-frame"
            viewportClassName="dps-table-body"
            itemClassName="dps-table-row-frame"
            role="rowgroup"
            rowHeightRem={rowHeightRem}
            virtualizeThreshold={24}
            overscan={8}
            resetSignal={sort ? `${sort.key}:${sort.direction}` : undefined}
          />
        )}
      />
    </Panel>
  );
}

function EmptyRow({ message }: { message: string }) {
  return (
    <TableRow>
      <div className="dps-table-empty" role="cell">{message}</div>
    </TableRow>
  );
}

function ForeignPowers({ rows, playerFaction }: { rows: FactionRow[]; playerFaction?: Faction | null }) {
  const { openSidebar } = useGameActions();
  const [sort, setSort] = useState<SortState<ForeignSortKey>>({ key: 'faction', direction: 'asc' });
  const sortedRows = useMemo(() => sortedForeignRows(rows, sort), [rows, sort]);

  return (
    <DiplomacyTablePanel
      columns={FOREIGN_COLUMNS}
      rows={sortedRows}
      getRowKey={row => row.id}
      emptyMessage={webUIText('Auto.ExtraAttr.ComponentsScreensDiplomacyScreen.315.1')}
      rowHeightRem={3.45}
      sort={sort}
      onSort={(key) => setSort(current => toggleSortState(current, key as ForeignSortKey, 'desc'))}
      renderRow={row => (
        <TableRow
          key={row.id}
          className="dps-table-row--clickable"
          onMouseDown={() => openSidebar('diplomacy', row.id)}
        >
          <FactionTableCell faction={row} detail={row.capital || row.rulerName} />
          <TableCell className="dps-table-col--short"><StatusCell label={row.diplomaticStatusLabel} /></TableCell>
          <TableCell className={cellClass('dps-table-col--short', signedValueClass(row.opinion))}>
            {fmtSigned(row.opinion)}
          </TableCell>
          <TableCell className="dps-table-col--short">{fmt(row.strength)}</TableCell>
          <TableCell className="dps-table-col--short">{fmt(row.settlements)}</TableCell>
          <TableCell className="dps-table-col--short">{fmt(row.treaties)}</TableCell>
          <TableCell className="dps-table-col--actions">
            <RowActions
              factionId={row.id}
              canNegotiateTreaty={canNegotiateTreatyWithRow(row, playerFaction)}
              showView={false}
            />
          </TableCell>
        </TableRow>
      )}
    />
  );
}

function Treaties({ rows }: { rows: FactionTreaty[] }) {
  const [breakingId, setBreakingId] = useState<string | null>(null);
  const [sort, setSort] = useState<SortState<TreatySortKey>>({ key: 'faction', direction: 'asc' });
  const sortedRows = useMemo(() => sortedTreatyRows(rows, sort), [rows, sort]);
  const handleBreak = (treatyId: string) => {
    setBreakingId(treatyId);
    void breakTreatyBridge(treatyId).finally(() => setBreakingId(null));
  };

  return (
    <DiplomacyTablePanel
      columns={TREATY_COLUMNS}
      rows={sortedRows}
      getRowKey={row => row.id || `${row.withFactionId || row.withFaction}:${row.type}`}
      emptyMessage={webUIText('Auto.ExtraAttr.ComponentsScreensDiplomacyScreen.337.2')}
      rowHeightRem={3.35}
      sort={sort}
      onSort={(key) => setSort(current => toggleSortState(current, key as TreatySortKey, 'asc'))}
      renderRow={row => (
        <TableRow key={row.id || `${row.withFactionId || row.withFaction}:${row.type}`}>
          <TableCell className="dps-table-col--faction">
            <FactionNameCell
              id={row.withFactionId}
              name={row.withFaction}
              colour={row.withFactionColour}
              secondaryColour={row.withFactionSecondaryColour}
              cultureGroup={row.withFactionCultureGroup}
              emblem={row.withFactionEmblem}
              detail={row.withFactionCulture}
            />
          </TableCell>
          <TableCell className="dps-table-col--wide"><TreatyTypeCell type={row.type} /></TableCell>
          <TableCell className="dps-table-col--short">
            {row.isPerpetual ? webUIText('Diplomacy.TreatyPerpetual') : row.daysRemaining && row.daysRemaining > 0 ? webUIText("Auto.Fix.ExprTrue.componentsscreensDiplomacyScreen.353.1", { Value1: formatNumber(row.daysRemaining) }) : webUIText("Auto.Fix.ExprFalse.componentsscreensDiplomacyScreen.353.1")}
          </TableCell>
          <TableCell className="dps-table-col--actions">
            <div className="dps-row-actions">
              {row.canBreak && row.id ? (
                <RowActionButton
                  icon="/assets/icons/I_ExclamationWarning.png"
                  label={webUIText('Diplomacy.BreakTreaty')}
                  danger
                  disabled={breakingId === row.id}
                  onMouseDown={() => handleBreak(row.id!)}
                />
              ) : null}
              {row.withFactionId ? <RowActions factionId={row.withFactionId} /> : <span className="dps-muted"><WebUIText textKey="Auto.ComponentsScreensDiplomacyScreen.355.3" /></span>}
            </div>
          </TableCell>
        </TableRow>
      )}
    />
  );
}

function ActiveWars({ rows }: { rows: ActiveWar[] }) {
  const { openScreen } = useGameActions();
  const [sort, setSort] = useState<SortState<WarSortKey>>({ key: 'warScore', direction: 'desc' });
  const sortedRows = useMemo(() => sortedWarRows(rows, sort), [rows, sort]);

  return (
    <DiplomacyTablePanel
      columns={WAR_COLUMNS}
      rows={sortedRows}
      getRowKey={row => row.id}
      emptyMessage={webUIText('Auto.ExtraAttr.ComponentsScreensDiplomacyScreen.370.3')}
      tableClassName="dps-table--wars"
      rowHeightRem={5.2}
      sort={sort}
      onSort={(key) => setSort(current => toggleSortState(current, key as WarSortKey, 'desc'))}
      renderRow={row => (
        <TableRow
          key={row.id}
          className={row.canNegotiate && row.theirLeader.id ? 'dps-table-row--clickable' : undefined}
          onMouseDown={row.canNegotiate && row.theirLeader.id ? () => openScreen('peace', row.theirLeader.id) : undefined}
        >
          <TableCell className="dps-table-col--wide">
            <div className="dps-war-name-cell">
              <span className="dps-strong">{row.name}</span>
              {row.isRebellionWar && <span className="dps-tag"><WebUIText textKey="Auto.ComponentsScreensDiplomacyScreen.375.4" /></span>}
            </div>
          </TableCell>
          <TableCell className="dps-table-col--war-side">
            <div className="dps-war-side">
              <FactionNameCell
                id={row.ourLeader.id}
                name={row.ourLeader.name || webUIText("Auto.Fix.ExprFallback.componentsscreensDiplomacyScreen.383.1")}
                colour={row.ourLeader.colour}
                secondaryColour={row.ourLeader.secondaryColour}
                cultureGroup={row.ourLeader.cultureGroup}
                emblem={row.ourLeader.emblem}
                detail={webUIText('Auto.ExtraAttr.ComponentsScreensDiplomacyScreen.388.4')}
              />
              <FactionPips factions={row.ourParticipants} />
            </div>
          </TableCell>
          <TableCell className="dps-table-col--war-side">
            <div className="dps-war-side">
              <FactionNameCell
                id={row.theirLeader.id}
                name={row.theirLeader.name || webUIText("Auto.Fix.ExprFallback.componentsscreensDiplomacyScreen.397.1")}
                colour={row.theirLeader.colour}
                secondaryColour={row.theirLeader.secondaryColour}
                cultureGroup={row.theirLeader.cultureGroup}
                emblem={row.theirLeader.emblem}
                detail={webUIText('Auto.ExtraAttr.ComponentsScreensDiplomacyScreen.402.5')}
              />
              <FactionPips factions={row.theirParticipants} />
            </div>
          </TableCell>
          <TableCell className={cellClass('dps-table-col--short', signedValueClass(row.warScore))}>
            <Tooltip content={warScoreTooltip(row)} position="left" delay={150}>
              <span className="dps-war-score-value">{fmtSigned(row.warScore)}</span>
            </Tooltip>
          </TableCell>
          <TableCell className="dps-table-col--short">{fmtDuration(row.durationDays)}</TableCell>
          <TableCell className="dps-table-col--short">{fmt(row.battlesFought)}</TableCell>
          <TableCell className="dps-table-col--actions">
            {row.canNegotiate && row.theirLeader.id ? (
              <div className="dps-row-actions">
                <RowActionButton
                  icon="/assets/icons/I_Peace.png"
                  label={webUIText('Auto.ComponentsScreensDiplomacyScreen.414.5')}
                  onMouseDown={() => openScreen('peace', row.theirLeader.id)}
                />
              </div>
            ) : (
              <span className="dps-muted"><WebUIText textKey="Auto.ComponentsScreensDiplomacyScreen.417.6" /></span>
            )}
          </TableCell>
        </TableRow>
      )}
    />
  );
}

export default function DiplomacyScreen({ onClose, initialTab }: DiplomacyScreenProps) {
  const liveData = useDiplomacyOverviewBridge();
  const [cachedData, setCachedData] = useState<DiplomacyOverviewState | null>(null);
  const data = liveData ?? cachedData;
  const playerFactionId = usePlayerFactionId();
  const playerFaction = useFaction(playerFactionId, 'summary');
  const court = useCourtPositions(true);
  const resolvedInitialTab = TABS.some(tab => tab.id === initialTab) ? initialTab! : 'foreign';
  const [activeTab, setActiveTab] = useState(resolvedInitialTab);
  const [courtPosition, setCourtPosition] = useState<CourtPositionView | null>(null);
  const diplomacyOffice = useMemo(
    () => court?.positions.find(position => position.key === 'MasterOfDiplomacy') ?? null,
    [court],
  );

  useEffect(() => {
    if (liveData) setCachedData(liveData);
  }, [liveData]);

  useEffect(() => {
    setActiveTab(resolvedInitialTab);
  }, [resolvedInitialTab]);

  const content = useMemo(() => {
    switch (activeTab) {
      case 'treaties':
        return <Treaties rows={(data?.ourTreaties as FactionTreaty[] | undefined) ?? playerFaction?.treaties ?? []} />;
      case 'wars':
        return <ActiveWars rows={data?.activeWars ?? []} />;
      default:
        return <ForeignPowers rows={data?.foreignPowers ?? []} playerFaction={playerFaction} />;
    }
  }, [activeTab, data, playerFaction]);

  return (
    <div className="dps-stage">
      <ScreenShell
        title={webUIText('Auto.Attr.ComponentsScreensDiplomacyScreen.458.1')}
        onClose={onClose}
        advisorTopic="externalPoliticsScreen"
        className="screen--docked screen--diplomacy"
        contentClassName="screen-content--diplomacy"
        tabs={<SidebarTabBar tabs={TABS} activeTab={activeTab} onTabChange={setActiveTab} />}
      >
        {diplomacyOffice ? (
          <div className="dps-office-strip dps-office-strip--top">
            <CourtOfficeSummary
              position={diplomacyOffice}
              onOpen={setCourtPosition}
            />
          </div>
        ) : null}
        <div className="dps-wrap">
          {content}
        </div>
        <CourtAppointmentModal
          open={!!courtPosition}
          position={courtPosition}
          onClose={() => setCourtPosition(null)}
        />
      </ScreenShell>
    </div>
  );
}

registerTopbarButton({
  id: 'diplomacy',
  get label() { return webUIText('Auto.TopProp.ComponentsScreensDiplomacyScreen.475.22'); },
  icon: '/assets/icons/I_Diplomacy.png',
  tooltip: {
    get title() { return webUIText('Auto.TopProp.ComponentsScreensDiplomacyScreen.478.23'); },
    get body() { return webUIText('Auto.TopProp.ComponentsScreensDiplomacyScreen.479.24'); },
    lines: [
      { get label() { return webUIText('Auto.TopProp.ComponentsScreensDiplomacyScreen.481.25'); } },
      { get label() { return webUIText('Auto.TopProp.ComponentsScreensDiplomacyScreen.482.26'); } },
    ],
  },
  order: 40,
  factionMode: 'independent',
});
registerScreen({
  id: 'diplomacy',
  render: ({ screenId, onClose }) => <DiplomacyScreen onClose={onClose} initialTab={screenId} />,
  topbarId: 'diplomacy',
  advisorTopic: 'externalPoliticsScreen',
  overlayVariant: 'diplomacy',
  factionMode: 'independent',
});
