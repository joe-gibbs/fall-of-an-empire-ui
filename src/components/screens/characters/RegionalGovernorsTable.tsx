import { useMemo, useState } from 'react';
import type { CharacterListEntry } from '../../../bridge/characters/useCharactersBridge';
import type { DiplomacyOverviewState } from '../../../bridge/diplomacy/useDiplomacyOverviewBridge';
import type { PowerBloc } from '../../../data/types';
import { formatNumber, formatSignedNumber } from '../../../utils/numberFormat';
import { webUIText, WebUIText } from '../../../localization/WebUITextContext';
import GameButton from '../../common/buttons/GameButton';
import GameCheckButton from '../../common/buttons/GameCheckButton';
import { BureaucraticInlineValue } from '../../bureaucracy/BureaucraticThroughput';
import EntityLink from '../../common/entities/EntityLink';
import Portrait from '../../common/portraits/Portrait';
import VirtualList from '../../common/layout/scrolling/VirtualList';
import SortableHeader from '../../common/layout/tables/SortableHeader';
import {
  compareSortValuesWithDirection as compareValues,
  toggleSortState,
  type SortState,
} from '../../common/layout/tables/sortUtils';
import PersonTooltip from '../../common/tooltips/PersonTooltip';
import './InternalPoliticsScreen.css';

export type RegionalGovernor = DiplomacyOverviewState['regionalGovernors'][number];

type GovernorSortKey = 'region' | 'governor' | 'settlements' | 'corruption' | 'tax' | 'unrest' | 'military';

const GOVERNOR_LIST_VIRTUALISE_THRESHOLD = 10;
const GOVERNOR_LIST_OVERSCAN = 2;

function blocForPerson(personId: string | undefined, blocs: PowerBloc[]): PowerBloc | undefined {
  if (!personId) return undefined;
  return blocs.find(entry => (
    entry.leaderId === personId
    || (entry.members ?? []).some(member => member.id === personId)
  ));
}

function sortGovernorRows(rows: RegionalGovernor[], sort: SortState<GovernorSortKey>): RegionalGovernor[] {
  return [...rows].sort((a, b) => {
    switch (sort.key) {
      case 'region':
        return compareValues(a.regionName, b.regionName, sort.direction);
      case 'governor':
        return compareValues(a.governorName, b.governorName, sort.direction);
      case 'settlements':
        return compareValues(a.settlementCount, b.settlementCount, sort.direction);
      case 'corruption':
        return compareValues(a.corruptionPercent, b.corruptionPercent, sort.direction);
      case 'tax':
        return compareValues(a.taxBonusPercent, b.taxBonusPercent, sort.direction);
      case 'unrest':
        return compareValues(a.unrestReductionPercent, b.unrestReductionPercent, sort.direction);
      case 'military':
        return compareValues(a.militaryBonusPercent, b.militaryBonusPercent, sort.direction);
      default:
        return 0;
    }
  });
}

function GovernorPortrait({
  character,
  personId,
  name,
}: {
  character?: CharacterListEntry;
  personId?: string;
  name: string;
}) {
  const portrait = (
    <Portrait
      personId={personId}
      resolvePerson
      src={character?.portrait}
      layers={character?.portraitLayers}
      name={name}
      isAlive={character?.isAlive}
      activity={character?.activity}
      isPlayerCharacter={character?.isPlayerCharacter}
      isHeir={character?.isHeir}
      size="md"
      showBorder
    />
  );

  return personId ? (
    <PersonTooltip characterId={personId} position="right" delay={150}>
      {portrait}
    </PersonTooltip>
  ) : portrait;
}

function GovernorBlocLine({ bloc }: { bloc?: PowerBloc }) {
  if (!bloc) {
    return <span className="ips-bloc-line"><WebUIText textKey="Auto.ComponentsScreensInternalPoliticsScreen.342.1" /></span>;
  }

  return (
    <EntityLink
      type="powerbloc"
      id={bloc.id}
      className="ips-bloc-line ips-bloc-link"
      icon={bloc.iconKey ? <img className="ips-bloc-icon" src={bloc.iconKey} alt="" /> : null}
    >
      {webUIText('InternalPolitics.Bloc', { Name: bloc.name })}
    </EntityLink>
  );
}

function GovernorRow({
  row,
  characters,
  blocs,
  playerFactionId,
  tutorialTarget,
  onAppoint,
  onOpenCharacter,
}: {
  row: RegionalGovernor;
  characters: Map<string, CharacterListEntry>;
  blocs: PowerBloc[];
  playerFactionId: string;
  tutorialTarget?: string;
  onAppoint: (row: RegionalGovernor) => void;
  onOpenCharacter: (id: string) => void;
}) {
  const character = characters.get(row.governorId);
  const corruptionTone = row.corruptionPercent >= 25 ? 'var(--red-light)' : row.corruptionPercent >= 12 ? 'var(--yellow)' : 'var(--green)';
  const bloc = blocForPerson(row.governorId, blocs);
  const ownerName = row.ownerFactionId && row.ownerFactionId !== playerFactionId ? row.ownerFactionName : '';
  const actionLabel = webUIText(row.governorId ? 'FactionOverview.ReplaceAppointment' : 'Settlement.AppointGovernor');

  return (
    <div
      className="ips-governor-row"
      role={row.governorId ? 'button' : undefined}
      tabIndex={row.governorId ? 0 : undefined}
      onClick={() => row.governorId && onOpenCharacter(row.governorId)}
    >
      <div className="ips-governor-cell ips-governor-cell--region">
        <span className="ips-governor-region">{row.regionName}</span>
        {ownerName ? <span className="ips-governor-sub">{ownerName}</span> : null}
        {row.isLocked ? <span className="ips-governor-sub"><WebUIText textKey="Auto.ComponentsScreensInternalPoliticsScreen.578.6" /></span> : null}
      </div>
      <div className="ips-governor-cell ips-governor-cell--governor">
        <GovernorPortrait character={character} personId={row.governorId || undefined} name={row.governorName || row.regionName} />
        <div className="ips-governor-copy">
          <EntityLink type="character" id={row.governorId} className="ips-governor-name ips-entity-link" fallbackClassName="ips-governor-name">
            {row.governorName || webUIText('InternalPolitics.NoGovernor')}
          </EntityLink>
          {row.governorId ? <GovernorBlocLine bloc={bloc} /> : <span className="ips-governor-bloc"><WebUIText textKey="Auto.ComponentsScreensInternalPoliticsScreen.584.7" /></span>}
        </div>
      </div>
      <div className="ips-governor-cell ips-governor-cell--settlements">
        <span>{formatNumber(row.settlementCount)}</span>
      </div>
      <div className="ips-governor-cell ips-governor-cell--corruption">
        <span style={{ color: corruptionTone }}>{`${formatNumber(row.corruptionPercent)}%`}</span>
        <BureaucraticInlineValue value={row.bureaucraticGovernorLoad} compact />
      </div>
      <div className="ips-governor-cell ips-governor-cell--tax">
        <span style={{ color: row.taxBonusPercent >= 0 ? 'var(--green)' : 'var(--red-light)' }}>{`${formatSignedNumber(row.taxBonusPercent)}%`}</span>
      </div>
      <div className="ips-governor-cell ips-governor-cell--unrest">
        <span style={{ color: row.unrestReductionPercent >= 0 ? 'var(--green)' : 'var(--red-light)' }}>{`${formatSignedNumber(row.unrestReductionPercent)}%`}</span>
      </div>
      <div className="ips-governor-cell ips-governor-cell--military">
        <span style={{ color: row.militaryBonusPercent >= 0 ? 'var(--green)' : 'var(--red-light)' }}>{`${formatSignedNumber(row.militaryBonusPercent)}%`}</span>
      </div>
      <div
        className="ips-governor-cell ips-governor-cell--action"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
        }}
      >
        <GameButton
          variant="burgundy"
          disabled={!row.canManageGovernor || !row.settlementId}
          onClick={() => onAppoint(row)}
          tutorialTarget={tutorialTarget}
        >
          {actionLabel}
        </GameButton>
      </div>
    </div>
  );
}

export default function RegionalGovernorsTable({
  governors,
  characters,
  blocs,
  playerFactionId,
  autoAssignGovernorsEnabled,
  emptyReason,
  tutorialTarget,
  onToggleAutoAssign,
  onAppoint,
  onOpenCharacter,
}: {
  governors: RegionalGovernor[];
  characters: Map<string, CharacterListEntry>;
  blocs: PowerBloc[];
  playerFactionId: string;
  autoAssignGovernorsEnabled: boolean;
  emptyReason?: string;
  tutorialTarget?: string;
  onToggleAutoAssign: () => void;
  onAppoint: (row: RegionalGovernor) => void;
  onOpenCharacter: (id: string) => void;
}) {
  const [sort, setSort] = useState<SortState<GovernorSortKey>>({ key: 'corruption', direction: 'desc' });
  const sortedGovernors = useMemo(() => sortGovernorRows(governors, sort), [governors, sort]);
  const tutorialGovernor = tutorialTarget
    ? governors.find(row => !row.governorId && row.canManageGovernor && row.settlementId)
    : undefined;
  const tutorialGovernorKey = tutorialGovernor?.regionId || tutorialGovernor?.regionName;

  return (
    <section className="ips-tab-section">
      <div className="ips-tab-toolbar">
        <GameCheckButton
          checked={autoAssignGovernorsEnabled}
          label={webUIText('Auto.Attr.ComponentsScreensInternalPoliticsScreen.824.8')}
          onToggle={onToggleAutoAssign}
          tooltip={{
            title: webUIText('Auto.Prop.ComponentsScreensInternalPoliticsScreen.826.9'),
            body: webUIText('Auto.Prop.ComponentsScreensInternalPoliticsScreen.826.10'),
          }}
        />
      </div>
      <div className="ips-table ips-governor-table" role="table">
        <div className="ips-governor-header" role="row">
          <SortableHeader id="region" label={webUIText('Auto.Attr.ComponentsScreensInternalPoliticsScreen.831.11')} className="ips-governor-header-cell ips-governor-header-cell--region" sort={sort} onSort={(key) => setSort(value => toggleSortState(value, key, 'desc'))} />
          <SortableHeader id="governor" label={webUIText('Auto.Attr.ComponentsScreensInternalPoliticsScreen.832.12')} className="ips-governor-header-cell ips-governor-header-cell--governor" sort={sort} onSort={(key) => setSort(value => toggleSortState(value, key, 'desc'))} />
          <SortableHeader id="settlements" label={webUIText('Auto.Attr.ComponentsScreensInternalPoliticsScreen.833.13')} className="ips-governor-header-cell ips-governor-header-cell--settlements" sort={sort} onSort={(key) => setSort(value => toggleSortState(value, key, 'desc'))} />
          <SortableHeader id="corruption" label={webUIText('Auto.Attr.ComponentsScreensInternalPoliticsScreen.834.14')} className="ips-governor-header-cell ips-governor-header-cell--corruption" sort={sort} onSort={(key) => setSort(value => toggleSortState(value, key, 'desc'))} />
          <SortableHeader id="tax" label={webUIText('Auto.Attr.ComponentsScreensInternalPoliticsScreen.835.15')} className="ips-governor-header-cell ips-governor-header-cell--tax" sort={sort} onSort={(key) => setSort(value => toggleSortState(value, key, 'desc'))} />
          <SortableHeader id="unrest" label={webUIText('Auto.Attr.ComponentsScreensInternalPoliticsScreen.836.16')} className="ips-governor-header-cell ips-governor-header-cell--unrest" sort={sort} onSort={(key) => setSort(value => toggleSortState(value, key, 'desc'))} />
          <SortableHeader id="military" label={webUIText('Auto.Attr.ComponentsScreensInternalPoliticsScreen.837.17')} className="ips-governor-header-cell ips-governor-header-cell--military" sort={sort} onSort={(key) => setSort(value => toggleSortState(value, key, 'desc'))} />
          <span className="ips-governor-header-cell ips-governor-header-cell--action"><WebUIText textKey="Auto.ComponentsScreensInternalPoliticsScreen.875.10" /></span>
        </div>
        <VirtualList
          items={sortedGovernors}
          getKey={row => row.regionId || row.regionName}
          renderItem={row => {
            const rowKey = row.regionId || row.regionName;
            return (
              <GovernorRow
                row={row}
                characters={characters}
                blocs={blocs}
                playerFactionId={playerFactionId}
                tutorialTarget={rowKey === tutorialGovernorKey ? tutorialTarget : undefined}
                onAppoint={onAppoint}
                onOpenCharacter={onOpenCharacter}
              />
            );
          }}
          empty={<div className="ips-empty">{emptyReason || webUIText('InternalPolitics.NoRegionalGovernors')}</div>}
          className="ips-row-scroll-frame"
          viewportClassName="ips-table-body ips-governor-table-body ips-row-viewport"
          itemClassName="ips-row-frame"
          role="rowgroup"
          rowHeightRem={3.45}
          virtualizeThreshold={GOVERNOR_LIST_VIRTUALISE_THRESHOLD}
          overscan={GOVERNOR_LIST_OVERSCAN}
          resetSignal={`${sort.key}:${sort.direction}`}
        />
      </div>
    </section>
  );
}
