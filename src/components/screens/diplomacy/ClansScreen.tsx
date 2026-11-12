import { useCallback, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { bridgeCall, type KinshipGroupEntry } from '../../../bridge-types.generated';
import { acknowledgeBridgeFailure } from '../../../bridge/core/runtimeEngine';
import { useCharacterListBridge, type CharacterListEntry } from '../../../bridge/characters/useCharactersBridge';
import {
  refreshDiplomacyOverviewBridge,
  setAutoAssignGovernorsBridge,
  useDiplomacyOverviewBridge,
} from '../../../bridge/diplomacy/useDiplomacyOverviewBridge';
import { usePowerBlocsBridge } from '../../../bridge/diplomacy/usePowerBlocsBridge';
import { useWarbandsBridge } from '../../../bridge/military-map/useWarbandsBridge';
import { selectMilitaryBridge } from '../../../bridge/military-map/useMilitaryBridge';
import { zoomToBridge } from '../../../bridge/app/usePinnedItemsBridge';
import { useGameActions } from '../../../context/GameContext';
import { usePerson, usePlayerFactionId, usePlayerFactionSummary } from '../../../data-source/index';
import { useWebUIText } from '../../../localization/WebUITextContext';
import type { PowerBloc } from '../../../data/types';
import ComplianceRow from '../../common/data-display/stats/ComplianceRow';
import { formatNumber } from '../../../utils/numberFormat';
import ScreenShell from '../../common/layout/shell/ScreenShell';
import GameButton from '../../common/buttons/GameButton';
import Tooltip from '../../common/tooltips/Tooltip';
import StyledScrollArea from '../../common/layout/scrolling/StyledScrollArea';
import SidebarTabBar from '../../sidebars/shared/SidebarTabBar';
import { kinshipMusterTooltip } from './kinshipTooltips';
import ClanDetailsPanel from './ClanDetailsPanel';
import Portrait from '../../common/portraits/Portrait';
import DropdownSelect from '../../common/forms/DropdownSelect';
import ConfirmDialog from '../../common/forms/ConfirmDialog';
import RegionGovernorAppointmentModal from '../../modals/characters/RegionGovernorAppointmentModal';
import RegionalGovernorsTable, { type RegionalGovernor } from '../characters/RegionalGovernorsTable';
import { clansTabFromScreenId, type ClansScreenTab } from './clansScreenTokens';
import './ClansScreen.css';

const EMPTY_CHARACTERS: CharacterListEntry[] = [];
const EMPTY_GOVERNORS: RegionalGovernor[] = [];
const EMPTY_BLOCS: PowerBloc[] = [];
const EMPTY_GROUPS: KinshipGroupEntry[] = [];

// The ruling clan leads; the rest keep a fixed alphabetical order as strengths change.
function compareClans(a: KinshipGroupEntry, b: KinshipGroupEntry): number {
  if (a.isRulingClan !== b.isRulingClan) return a.isRulingClan ? -1 : 1;
  return a.name.localeCompare(b.name) || a.id.localeCompare(b.id);
}

function ClanSeat({ group, selected, onSelect }: {
  group: KinshipGroupEntry;
  selected: boolean;
  onSelect: () => void;
}) {
  const t = useWebUIText();
  const head = usePerson(group.headId);
  const feuding = group.feuds.length > 0;
  return (
    <button
      type="button"
      className={`clans-seat${selected ? ' clans-seat--selected' : ''}`}
      onClick={onSelect}
      aria-pressed={selected}
      aria-controls="clans-details"
    >
      <Portrait personId={group.headId} name={group.headName} size="lg" showBorder showBadge={false} />
      <strong className="clans-seat-name">{group.name}</strong>
      {group.isRulingClan
        ? <span className="clans-seat-ruling">{t('Kinship.RulingFamily')}</span>
        : <ComplianceRow value={group.compliance} character={head} compact showLabel={false} additionalHelp={t('Kinship.ComplianceHelp', { Head: group.headName })} />}
      <Tooltip content={kinshipMusterTooltip(group)}>
        <span className={`clans-seat-warriors${feuding ? ' clans-seat-warriors--feuding' : ''}`}>
          <img src="/assets/icons/I_Swords.png" alt="" />
          {formatNumber(group.warriors)}
        </span>
      </Tooltip>
    </button>
  );
}

function ClanCallUp({ group, onMuster }: { group: KinshipGroupEntry; onMuster: () => void }) {
  const t = useWebUIText();
  return (
    <Tooltip content={{ title: t('Warbands.CallUp'), body: group.callUpReason || t('Warbands.MusterClanHelp'), lines: [{ label: t('Warbands.MonthlyUpkeep'), value: formatNumber(group.monthlyUpkeep), valueIcon: '/assets/icons/I_Coins.png', subTooltip: { title: t('Warbands.MonthlyUpkeep'), body: t('Warbands.MonthlyUpkeepHelp') } }] }}>
      <GameButton variant="burgundy" disabled={!group.canMuster} tutorialTarget="CallUpClanButton" onClick={onMuster}>
        {t('Warbands.CallUp')}
      </GameButton>
    </Tooltip>
  );
}

function ClansGovernorsPanel() {
  const playerFaction = usePlayerFactionSummary();
  const playerFactionId = usePlayerFactionId();
  const { openSidebar } = useGameActions();
  const [editingGovernor, setEditingGovernor] = useState<RegionalGovernor | null>(null);
  const diplomacy = useDiplomacyOverviewBridge('governors');
  const showBlocs = playerFaction?.usesPowerBlocs === true;
  const characters = useCharacterListBridge(playerFactionId, true)?.characters ?? EMPTY_CHARACTERS;
  const blocs = usePowerBlocsBridge(showBlocs) ?? EMPTY_BLOCS;
  const charactersById = useMemo(() => new Map(characters.map(character => [character.id, character])), [characters]);
  const openCharacter = useCallback((id: string) => openSidebar('character', id), [openSidebar]);
  const refreshGovernors = useCallback(() => {
    void refreshDiplomacyOverviewBridge('governors').catch(error => acknowledgeBridgeFailure(error, 'game.get_diplomacy_overview'));
  }, []);

  return (
    <div className="clans-governors">
      <RegionalGovernorsTable
        governors={diplomacy?.regionalGovernors ?? EMPTY_GOVERNORS}
        characters={charactersById}
        blocs={blocs}
        playerFactionId={playerFactionId ?? ''}
        autoAssignGovernorsEnabled={diplomacy?.autoAssignGovernorsEnabled ?? false}
        emptyReason={diplomacy?.governorEmptyReason}
        showBlocs={showBlocs}
        onToggleAutoAssign={() => { void setAutoAssignGovernorsBridge(!(diplomacy?.autoAssignGovernorsEnabled ?? false)).catch(() => undefined); }}
        onAppoint={setEditingGovernor}
        onOpenCharacter={openCharacter}
      />
      {editingGovernor ? (
        <RegionGovernorAppointmentModal
          open={!!editingGovernor}
          settlementId={editingGovernor.settlementId}
          settlementName={editingGovernor.settlementName}
          regionName={editingGovernor.regionName}
          currentGovernorId={editingGovernor.governorId || undefined}
          onClose={() => setEditingGovernor(null)}
          onAppointed={refreshGovernors}
        />
      ) : null}
    </div>
  );
}

function ClansRoster({ selectedClanId, onClose }: { selectedClanId?: string | null; onClose: () => void }) {
  const t = useWebUIText();
  const [musterSiteId, setMusterSiteId] = useState('');
  const data = useWarbandsBridge(musterSiteId);
  const { openSidebar } = useGameActions();
  const [selectedId, setSelectedId] = useState(selectedClanId ?? '');
  const [confirmingDismiss, setConfirmingDismiss] = useState(false);
  const rawGroups = data?.groups ?? EMPTY_GROUPS;
  const groups = useMemo(() => [...rawGroups].sort(compareClans), [rawGroups]);
  const selectedGroup = groups.find(group => group.id === selectedId) ?? groups[0];
  const hostRaised = Boolean(data?.hostId || data?.navyHostId);
  const effectiveMusterSiteId = musterSiteId || data?.selectedMusterSiteId || '';
  const muster = (dismiss: boolean, groupId = '') => {
    void bridgeCall('game.muster_warbands', { dismiss, groupId, musterSiteId: effectiveMusterSiteId }).catch(acknowledgeBridgeFailure);
  };
  const viewForce = (militaryId: string) => {
    selectMilitaryBridge(militaryId).catch(error => acknowledgeBridgeFailure(error, 'game.select_military'));
    openSidebar('military', militaryId);
    zoomToBridge('military', militaryId);
    onClose();
  };

  return (
    <div className="clans-hall">
      <StyledScrollArea className="clans-seats-scroll" variant="inline">
        <div className="clans-seats" data-tutorial-target="ClanSeats">
          {groups.map(group => (
            <ClanSeat
              key={group.id}
              group={group}
              selected={group.id === selectedGroup?.id}
              onSelect={() => setSelectedId(group.id)}
            />
          ))}
          {data && groups.length === 0 && <p className="clans-empty">{t('KinshipGroups.Empty')}</p>}
        </div>
      </StyledScrollArea>
      <StyledScrollArea key={selectedGroup?.id} className="clans-details">
        <div id="clans-details">
          {selectedGroup && <ClanDetailsPanel
            group={selectedGroup}
            wide
            actions={<ClanCallUp group={selectedGroup} onMuster={() => muster(false, selectedGroup.id)} />}
            onSelectClan={setSelectedId}
          />}
        </div>
      </StyledScrollArea>
      {data && <section className="clans-commands" aria-label={t('Kinship.Muster')}>
        <Tooltip content={{
          title: t('Warbands.Ready'),
          lines: groups.map(group => ({ label: group.name, value: formatNumber(group.availableStrength), subTooltip: kinshipMusterTooltip(group) })),
        }}>
          <span className="clans-total">
            <img src="/assets/icons/I_Swords.png" alt="" />{formatNumber(data.availableStrength)}
          </span>
        </Tooltip>
        <Tooltip content={{ title: t('Warbands.MonthlyUpkeep'), body: t('Warbands.FullMonthlyUpkeepHelp') }}>
          <span className="clans-upkeep-total">
            <img src="/assets/icons/I_Coins.png" alt="" />
            {formatNumber(data.monthlyUpkeep)} {t('Warbands.PerMonth')}
          </span>
        </Tooltip>
        {!data.hostId && data.musterSites.length > 0 && (
          <DropdownSelect
            id="warband-muster-site"
            triggerClassName="clans-muster-site-trigger"
            portal
            closeOnScroll
            position="below-left"
            label={t('Warbands.MusterAt')}
            value={effectiveMusterSiteId}
            options={data.musterSites.map(site => ({
              value: site.id,
              label: site.name,
              meta: site.isCapital ? t('Warbands.Capital') : undefined,
            }))}
            placeholder={t('Warbands.ChooseMusterSite')}
            onChange={setMusterSiteId}
          />
        )}
        <div className="clans-command-buttons">
          {data.hostId && (
            <GameButton variant="outline" onClick={() => viewForce(data.hostId)}>
              {t('Warbands.ViewHost')}
            </GameButton>
          )}
          {data.navyHostId && (
            <GameButton variant="outline" onClick={() => viewForce(data.navyHostId)}>
              {t('Warbands.ViewFleet')}
            </GameButton>
          )}
          {hostRaised && <Tooltip content={{ title: t('Warbands.Dismiss'), body: data.dismissReason || t('Warbands.DismissHelp') }}>
            <GameButton variant="outline" disabled={!data.canDismiss} onClick={() => setConfirmingDismiss(true)}>
              {t('Warbands.Dismiss')}
            </GameButton>
          </Tooltip>}
          <Tooltip content={{ title: t('Warbands.CallUpAll'), body: data.callUpReason || t('Warbands.CallUpHelp') }}>
            <GameButton variant="burgundy" disabled={!data.canCallUp} tutorialTarget="CallUpAllButton" onClick={() => muster(false)}>
              {t('Warbands.CallUpAll')}
            </GameButton>
          </Tooltip>
        </div>
      </section>}
      {createPortal(
        <ConfirmDialog
          visible={confirmingDismiss}
          title={t('Warbands.Dismiss')}
          message={t('Warbands.MusteredBody')}
          confirmText={t('Warbands.Dismiss')}
          variant="danger"
          onConfirm={() => muster(true)}
          onClosed={() => setConfirmingDismiss(false)}
        />,
        document.body,
      )}
    </div>
  );
}

export default function ClansScreen({ onClose, screenId, selectedClanId }: {
  onClose: () => void;
  screenId?: string | null;
  selectedClanId?: string | null;
}) {
  const t = useWebUIText();
  const requestedId = screenId ?? selectedClanId ?? null;
  const [activeTab, setActiveTab] = useState<ClansScreenTab>(() => clansTabFromScreenId(requestedId));
  const clanId = clansTabFromScreenId(requestedId) === 'clans' ? requestedId : null;
  const tabs = [
    { id: 'clans', label: t('KinshipGroups.Title') },
    { id: 'governors', label: t('KinshipGroups.Governors') },
  ];

  return (
    <ScreenShell
      title={t('KinshipGroups.Title')}
      onClose={onClose}
      advisorTopic="clansScreen"
      className={`screen--clans${activeTab === 'governors' ? ' screen--clans-governors' : ''}`}
      contentClassName={`clans-content${activeTab === 'governors' ? ' clans-content--governors' : ''}`}
      tabs={<SidebarTabBar tabs={tabs} activeTab={activeTab} onTabChange={(id) => setActiveTab(id as ClansScreenTab)} />}
    >
      {activeTab === 'governors'
        ? <ClansGovernorsPanel />
        : <ClansRoster selectedClanId={clanId} onClose={onClose} />}
    </ScreenShell>
  );
}
