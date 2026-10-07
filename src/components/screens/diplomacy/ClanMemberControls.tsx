import type { KinshipGroupMember } from '../../../bridge-types.generated';
import { useWebUIText } from '../../../localization/WebUITextContext';
import { formatNumber, formatSignedNumber } from '../../../utils/numberFormat';
import Tooltip from '../../common/tooltips/Tooltip';
import { kinshipFameTooltip, kinshipWarbandTooltip } from './kinshipTooltips';

export function ClanWarriorCount({ member, onInspect }: { member: KinshipGroupMember; onInspect: () => void }) {
  const t = useWebUIText();
  return <Tooltip content={{
    ...kinshipWarbandTooltip(member),
    footer: t('WarbandRecruitment.InspectUnits'),
  }}>
    <button type="button" onClick={onInspect} aria-label={t('WarbandRecruitment.MemberUnits', { Name: member.name })} className={`clan-warrior-count clan-warrior-count--${member.musterState}`}>
      <img src="/assets/icons/I_Swords.png" alt={t('KinshipGroups.Warriors')} />
      <strong>{formatNumber(member.warbandSize)}</strong>
    </button>
  </Tooltip>;
}

export function ClanMemberFame({ member }: {member: KinshipGroupMember}) {
  const t = useWebUIText();
  return <Tooltip content={kinshipFameTooltip(member)}>
    <span className="clan-member-fame"><img src="/assets/icons/I_Fame.png" alt="" />{formatNumber(member.fame)}{member.monthlyLandFame > 0 && <small>{formatSignedNumber(member.monthlyLandFame)} {t('Warbands.PerMonth')}</small>}</span>
  </Tooltip>;
}
