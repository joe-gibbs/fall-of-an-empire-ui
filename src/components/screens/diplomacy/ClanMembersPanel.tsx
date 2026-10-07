import type { KinshipGroupEntry } from '../../../bridge-types.generated';
import { useGameActions } from '../../../context/GameContext';
import Portrait from '../../common/portraits/Portrait';
import PersonTooltip from '../../common/tooltips/PersonTooltip';
import Tooltip from '../../common/tooltips/Tooltip';
import { ClanMemberFame, ClanWarriorCount } from './ClanMemberControls';

export default function ClanMembersPanel({ group, selectedMemberId, onInspect }: { group: KinshipGroupEntry; selectedMemberId: string; onInspect: (id: string) => void }) {
  const { openSidebar } = useGameActions();
  const members = group.members.filter(member => !member.isHead);
  return <div className="clan-member-list">
    {members.map(member => <article className={`clan-member-row${selectedMemberId === member.id ? ' clan-member-row--selected' : ''}`} key={member.id}>
      <PersonTooltip characterId={member.id}>
        <button type="button" className="clan-person-link" onClick={() => openSidebar('character', member.id)}>
          <Portrait personId={member.id} name={member.name} size="row" showBorder showBadge={false} />
          <span className="clan-person-copy">
            <strong>{member.name}</strong>
          </span>
        </button>
      </PersonTooltip>
      <div className="clan-member-service">
        <ClanMemberFame member={member} />
        {member.canHoldWarband && <>
          <ClanWarriorCount member={member} onInspect={() => onInspect(member.id)} />
          {member.musterState !== 'ready' && <Tooltip content={{ title: member.musterStatus, body: member.musterReason }}>
            <span className={`clan-member-status clan-member-status--${member.musterState}`}>{member.musterStatus}</span>
          </Tooltip>}
        </>}
      </div>
    </article>)}
  </div>;
}
