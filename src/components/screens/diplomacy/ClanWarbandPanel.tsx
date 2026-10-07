import { useState } from 'react';
import { bridgeCall, type KinshipGroupMember } from '../../../bridge-types.generated';
import { useBridgeQuery } from '../../../bridge/core/useBridgeQuery';
import { acknowledgeBridgeFailure } from '../../../bridge/core/runtimeEngine';
import { useWebUIText } from '../../../localization/WebUITextContext';
import { formatNumber } from '../../../utils/numberFormat';
import Tooltip from '../../common/tooltips/Tooltip';
import SectionHeading from '../../common/data-display/stats/SectionHeading';
import { WarbandUnitCard } from '../Military/WarbandUnitCard';
import { PersonalGuardCompanyCard } from '../Military/PersonalGuardPanel';
import { TemplateUnitSelectorModal } from '../Military/TemplateManagementPanel';
import { kinshipWarbandTooltip } from './kinshipTooltips';
import './ClanWarbandPanel.css';

export default function ClanWarbandPanel({ member, editable }: { member: KinshipGroupMember; editable: boolean }) {
  const t = useWebUIText();
  const [companyIndex, setCompanyIndex] = useState<number | null>(null);
  const [changing, setChanging] = useState(false);
  const [error, setError] = useState('');
  const recruitment = useBridgeQuery({
    action: 'game.get_personal_warband',
    payload: editable ? { companyIndex: companyIndex ?? -1 } : null,
    map: data => data,
    keepPreviousData: true,
    refreshOn: ['game.change_personal_warband', 'game.muster_warbands', 'game.get_resources', 'game.get_warbands'],
  });
  const change = async (unitId: string) => {
    if (changing || companyIndex === null || recruitment?.companyIndex !== companyIndex) return;
    setChanging(true);
    setError('');
    try {
      await bridgeCall('game.change_personal_warband', { unitId, companyIndex });
      setCompanyIndex(null);
    } catch (failure) {
      acknowledgeBridgeFailure(failure);
      setError(String(failure));
    } finally { setChanging(false); }
  };
  const openCompany = (index: number) => { setError(''); setCompanyIndex(index); };
  return <section className="clan-warband-panel">
    <SectionHeading title={t('WarbandRecruitment.MemberUnits', { Name: member.name })} />
    <Tooltip content={kinshipWarbandTooltip(member)}>
      <div className="clan-warband-capacity"><span>{t('Kinship.Capacity')}</span><strong>{formatNumber(member.warbandSize)} / {formatNumber(member.warbandCapacity)}</strong></div>
    </Tooltip>
    {editable && recruitment ? <div className="clan-warband-companies">
      {recruitment.companies.map((company, index) => <PersonalGuardCompanyCard key={company.slotNumber}
        company={company} unit={recruitment.companyUnits[index]} slot={company.slotNumber}
        canEdit={recruitment.canManage && !changing} onEdit={() => openCompany(index)} />)}
      {recruitment.warriors < recruitment.capacity && <PersonalGuardCompanyCard company={null}
        slot={recruitment.companies.length + 1} emptyLabel={t('WarbandRecruitment.EmptySlot')} canEdit={recruitment.canManage && !changing} onEdit={() => openCompany(-1)} />}
    </div> : <div className="clan-warband-units">
      {member.units.map(unit => <WarbandUnitCard key={unit.id} unit={unit} compact />)}
      {member.units.length === 0 && <p className="clan-warband-empty">{t('WarbandRecruitment.Empty')}</p>}
    </div>}
    {editable && recruitment?.reason && <p className="clan-warband-requirement">{recruitment.reason}</p>}
    {editable && recruitment?.canManage && companyIndex !== null && <TemplateUnitSelectorModal
      mode="single" units={recruitment.recruits.map(entry => entry.unit)}
      currentCounts={companyIndex >= 0 ? { [recruitment.companies[companyIndex].unitId]: 1 } : {}}
      compareUnit={companyIndex >= 0 ? recruitment.companyUnits[companyIndex] : null}
      title={t(companyIndex >= 0 ? 'Military.PersonalGuard.ReplaceCompany' : 'Military.PersonalGuard.ChooseCompany')}
      showSettlementRecruitment={false}
      selectionReasons={Object.fromEntries(recruitment.recruits.map(entry => [entry.unit.id,
        changing || recruitment.companyIndex !== companyIndex ? t('Military.PersonalGuard.SelectReplacement') : entry.reason]))}
      recruitmentStrengths={Object.fromEntries(recruitment.recruits.map(entry => [entry.unit.id, entry.warriors]))}
      onAdd={unitId => { void change(unitId); }} onRemove={() => undefined}
      onClose={() => setCompanyIndex(null)} doneLabel={t('Common.Cancel')} onDone={() => setCompanyIndex(null)}
      statusMessage={error} />}
  </section>;
}
