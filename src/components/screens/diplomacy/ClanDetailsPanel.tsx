import { useRef, useState } from 'react';
import type { KinshipGroupEntry } from '../../../bridge-types.generated';
import { usePerson, usePlayerFactionSummary } from '../../../data-source';
import { useGameActions } from '../../../context/GameContext';
import { useWebUIText } from '../../../localization/WebUITextContext';
import Portrait from '../../common/portraits/Portrait';
import PersonTooltip from '../../common/tooltips/PersonTooltip';
import Tooltip from '../../common/tooltips/Tooltip';
import ComplianceRow from '../../common/data-display/stats/ComplianceRow';
import SectionHeading from '../../common/data-display/stats/SectionHeading';
import IconButton from '../../common/buttons/IconButton';
import ClanMembersPanel from './ClanMembersPanel';
import ClanInteractionActions from './ClanInteractionActions';
import ClanFeudActions from './ClanFeudActions';
import { ClanMemberFame, ClanWarriorCount } from './ClanMemberControls';
import ClanWarbandPanel from './ClanWarbandPanel';
import { kinshipStrengthTooltip } from './kinshipTooltips';
import './ClanDetailsPanel.css';

export default function ClanDetailsPanel({ group, showStanding = false, onSelectClan }: {
  group: KinshipGroupEntry;
  showStanding?: boolean;
  onSelectClan: (id: string) => void;
}) {
  const t = useWebUIText();
  const { openSidebar, openScreen } = useGameActions();
  const player = usePlayerFactionSummary();
  const head = usePerson(group.headId);
  const leader = group.members.find(member => member.isHead);
  const rulingClan = group.headId === player?.rulerId;
  const [inspectedId, setInspectedId] = useState(group.headId);
  const inspected = group.members.find(member => member.id === inspectedId && member.canHoldWarband)
    ?? group.members.find(member => member.canHoldWarband);
  const unitsRef = useRef<HTMLDivElement>(null);
  const inspect = (id: string) => {
    setInspectedId(id);
    unitsRef.current?.scrollIntoView({ block: 'nearest' });
  };
  return <div className="clan-detail-panel">
    <header className="clan-detail-title">
      <Tooltip content={kinshipStrengthTooltip(group)}><h2>{group.name}</h2></Tooltip>
      <Tooltip content={t('Warbands.FamilyTree')}>
        <IconButton icon="/assets/icons/I_Family.png" label={t('Warbands.FamilyTree')} onClick={() => openScreen('familyTree', `tree:${group.headId}`)} />
      </Tooltip>
    </header>
    <section className="clan-leadership">
      <div className="clan-leader-row">
        <PersonTooltip characterId={group.headId}>
          <button type="button" className="clan-person-link clan-leader-link" onClick={() => openSidebar('character', group.headId)}>
            <Portrait personId={group.headId} name={group.headName} size="lg" showBorder showBadge={false} />
            <span className="clan-person-copy">
              <strong>{group.headName}</strong>
            </span>
          </button>
        </PersonTooltip>
        {leader && <div className="clan-member-service">
          <ClanMemberFame member={leader} />
          {leader.canHoldWarband && <>
            <ClanWarriorCount member={leader} onInspect={() => inspect(leader.id)} />
            {leader.musterState !== 'ready' && <Tooltip content={{ title: leader.musterStatus, body: leader.musterReason }}>
              <span className={`clan-member-status clan-member-status--${leader.musterState}`}>{leader.musterStatus}</span>
            </Tooltip>}
          </>}
        </div>}
      </div>
      {group.governorship && <Tooltip content={{ body: group.governorshipHelp }}>
        <p>{group.governorship}</p>
      </Tooltip>}
      {showStanding && !rulingClan && <div className="clan-leader-relations">
        <ComplianceRow value={group.compliance} character={head} compact additionalHelp={t('Kinship.ComplianceHelp', { Head: group.headName })} />
      </div>}
      <div className="clan-leader-actions">
        <ClanInteractionActions key={group.headId} group={group} />
      </div>
    </section>
    <ClanFeudActions group={group} onSelectClan={onSelectClan} />
    {group.members.some(member => !member.isHead) && <section className="clan-people">
      <SectionHeading title={t('KinshipGroups.Members')} />
      <ClanMembersPanel group={group} selectedMemberId={inspected?.id ?? ''} onInspect={inspect} />
    </section>}
    <div ref={unitsRef}>
      {inspected && <ClanWarbandPanel key={inspected.id} member={inspected} editable={inspected.id === player?.rulerId} />}
    </div>
  </div>;
}
