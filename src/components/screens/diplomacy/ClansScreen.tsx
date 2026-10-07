import { useCallback, useMemo, useState } from 'react';
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
import { kinshipMusterTooltip, kinshipStrengthTooltip } from './kinshipTooltips';
import ClanDetailsPanel from './ClanDetailsPanel';
import Portrait from '../../common/portraits/Portrait';
import PersonTooltip from '../../common/tooltips/PersonTooltip';
import DropdownSelect from '../../common/forms/DropdownSelect';
import RegionGovernorAppointmentModal from '../../modals/characters/RegionGovernorAppointmentModal';
import RegionalGovernorsTable, { type RegionalGovernor } from '../characters/RegionalGovernorsTable';
import { clansTabFromScreenId, type ClansScreenTab } from './clansScreenTokens';
import './ClansScreen.css';

const EMPTY_CHARACTERS: CharacterListEntry[] = [];
const EMPTY_GOVERNORS: RegionalGovernor[] = [];
const EMPTY_BLOCS: PowerBloc[] = [];

function ClanRosterRow({ group, selected, onSelect, onMuster }: {
  group: KinshipGroupEntry;
  selected: boolean;
  onSelect: () => void;
  onMuster: () => void;
}) {
  const t = useWebUIText();
  const head = usePerson(group.headId);
  return (
    <article className={`clans-clan${selected ? ' clans-clan--selected' : ''}`}>
      <button type="button" className="clans-clan-select" onClick={onSelect} aria-pressed={selected} aria-controls="clans-details">
        <PersonTooltip characterId={group.headId}>
          <Portrait personId={group.headId} name={group.headName} size="md" showBorder showBadge={false} />
        </PersonTooltip>
        <span className="clans-clan-copy">
          <strong className="clans-clan-name">{group.name}</strong>
          <ComplianceRow value={group.compliance} character={head} compact showLabel={false} additionalHelp={t('Kinship.ComplianceHelp', { Head: group.headName })} />
          {group.governorship && <Tooltip content={{ body: group.governorshipHelp }}>
            <span className="clans-political-strength">{group.governorship}</span>
          </Tooltip>}
          <Tooltip content={kinshipStrengthTooltip(group)}>
            <span className="clans-political-strength">{t('KinshipGroups.Strength')} <strong>{formatNumber(group.strength)}</strong></span>
          </Tooltip>
          {group.feuds.map(feud => <Tooltip key={feud.id} content={{title: t('ClanFeud.Enemy', {Clan: group.id === feud.firstClanId ? feud.secondClanName : feud.firstClanName}), body: [feud.cause, t('ClanFeud.Effects')].join('\n\n')}}>
            <span className="clans-clan-feud">{t('ClanFeud.Enemy', {Clan: group.id === feud.firstClanId ? feud.secondClanName : feud.firstClanName})}</span>
          </Tooltip>)}
        </span>
      </button>
      <div className="clans-clan-muster">
        <Tooltip content={kinshipMusterTooltip(group)}>
          <span className="clans-clan-strength">
            <img src="/assets/icons/I_Swords.png" alt="" />
            <strong>{formatNumber(group.warriors)}</strong>
          </span>
        </Tooltip>
        <Tooltip content={{ title: t('Warbands.CallUp'), body: group.callUpReason || t('Warbands.MusterClanHelp'), lines: [{ label: t('Warbands.MonthlyUpkeep'), value: formatNumber(group.monthlyUpkeep), valueIcon: '/assets/icons/I_Coins.png', subTooltip: { title: t('Warbands.MonthlyUpkeep'), body: t('Warbands.MonthlyUpkeepHelp') } }] }}>
          <GameButton variant="burgundy" disabled={!group.canMuster} onClick={onMuster}>
            {t('Warbands.CallUp')}
          </GameButton>
        </Tooltip>
      </div>
    </article>
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
  const groups = data?.groups ?? [];
  const selectedGroup = groups.find(group => group.id === selectedId) ?? groups[0];
  const hostRaised = Boolean(data?.hostId || data?.navyHostId);
  const effectiveMusterSiteId = musterSiteId || data?.selectedMusterSiteId || '';
  const muster = (dismiss: boolean, groupId = '') => {
    void bridgeCall('game.muster_warbands', { dismiss, groupId, musterSiteId: effectiveMusterSiteId }).catch(acknowledgeBridgeFailure);
  };

  return (
    <div className="clans-columns">
      <div className="clans-roster">
      <StyledScrollArea className="clans-roster-scroll">
        <div className="clans-list">
          {groups.map(group => (
            <ClanRosterRow
              key={group.id}
              group={group}
              selected={group.id === selectedGroup?.id}
              onSelect={() => setSelectedId(group.id)}
              onMuster={() => muster(false, group.id)}
            />
          ))}
          {data && groups.length === 0 && <p className="clans-empty">{t('KinshipGroups.Empty')}</p>}
        </div>
      </StyledScrollArea>
        {data && <section className="clans-commands" aria-label={t('Kinship.Muster')}>
          <div className="clans-muster-summary">
            <Tooltip content={{
              title: t('Warbands.Ready'),
              lines: groups.map(group => ({ label: group.name, value: formatNumber(group.availableStrength), subTooltip: kinshipMusterTooltip(group) })),
            }}>
              <span className="clans-total">
                <strong><img src="/assets/icons/I_Swords.png" alt="" />{formatNumber(data.availableStrength)}</strong>
              </span>
            </Tooltip>
            <Tooltip content={{ title: t('Warbands.CallUpAll'), body: data.callUpReason || t('Warbands.CallUpHelp') }}>
              <GameButton variant="burgundy" disabled={!data.canCallUp} onClick={() => muster(false)}>
                {t('Warbands.CallUpAll')}
              </GameButton>
            </Tooltip>
            {hostRaised && <Tooltip content={{ title: t('Warbands.Dismiss'), body: data.dismissReason || t('Warbands.DismissHelp') }}>
              <GameButton variant="outline" disabled={!data.canDismiss} onClick={() => muster(true)}>
                {t('Warbands.Dismiss')}
              </GameButton>
            </Tooltip>}
          </div>
          {!data.hostId && data.musterSites.length > 0 && (
            <DropdownSelect
              id="warband-muster-site"
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
          {data?.hostId && (
            <GameButton variant="outline" onClick={() => { openSidebar('military', data.hostId); onClose(); }}>
              {t('Warbands.ViewHost')}
            </GameButton>
          )}
          {data?.navyHostId && (
            <GameButton variant="outline" onClick={() => { openSidebar('military', data.navyHostId); onClose(); }}>
              {t('Warbands.ViewFleet')}
            </GameButton>
          )}
          <Tooltip content={{ title: t('Warbands.MonthlyUpkeep'), body: t('Warbands.FullMonthlyUpkeepHelp') }}>
              <span className="clans-upkeep-total">
                <img src="/assets/icons/I_Coins.png" alt="" />
                {formatNumber(data.monthlyUpkeep)} {t('Warbands.PerMonth')}
              </span>
          </Tooltip>
        </section>}
      </div>
      <StyledScrollArea key={selectedGroup?.id} className="clans-details">
        <div id="clans-details">
          {selectedGroup && <ClanDetailsPanel group={selectedGroup} onSelectClan={setSelectedId} />}
        </div>
      </StyledScrollArea>
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
