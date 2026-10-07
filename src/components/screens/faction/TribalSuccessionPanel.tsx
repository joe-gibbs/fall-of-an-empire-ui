import type { KinshipSuccessionForecast } from '../../../bridge-types.generated';
import { useGameActions } from '../../../context/GameContext';
import { useWebUIText } from '../../../localization/WebUITextContext';
import { formatNumber } from '../../../utils/numberFormat';
import Tooltip from '../../common/tooltips/Tooltip';
import PersonTooltip from '../../common/tooltips/PersonTooltip';
import SectionHeading from '../../common/data-display/stats/SectionHeading';
import Portrait from '../../common/portraits/Portrait';
import './TribalSuccessionPanel.css';

export default function TribalSuccessionPanel({ data }: { data: KinshipSuccessionForecast }) {
  const t = useWebUIText();
  const { openSidebar } = useGameActions();
  if (!data) return null;
  return (
    <section className="clans-succession">
      <div className="clans-succession-overview">
      <SectionHeading title={t('Kinship.Succession')} />
      {!data.enabled ? <p className="clans-succession-status">{t('Clans.HereditarySuccession')}</p> :
        <Tooltip content={{ title: t('Kinship.Succession'), body: t(data.claimants.length === 0 ? 'Clans.NoSuccessor' : data.familyLeads ? 'Clans.FamilyLeads' : 'Clans.RivalLeads') }}>
          <p className={`clans-succession-status${!data.familyLeads ? ' clans-value--danger' : ''}`}>
            {t(data.claimants.length === 0 ? 'Clans.NoSuccessorShort' : data.familyLeads ? 'Clans.FamilyLeadsShort' : 'Clans.RivalLeadsShort')}
          </p>
        </Tooltip>}
      </div>
      {data.enabled && <div className="clans-succession-claimants">
          {data.claimants.map((claimant, index) => (
            <article key={claimant.id} className="clans-succession-claimant">
              <PersonTooltip characterId={claimant.id}>
                <button type="button" className="clans-succession-person" onClick={() => openSidebar('character', claimant.id)}>
                  <Portrait personId={claimant.id} name={claimant.name} size="row" showBorder showBadge={false} />
                  <span className="clans-succession-identity">
                    <strong>{claimant.name}</strong>
                    <span>{claimant.clanName}</span>
                    <small>{t(index === 0 ? 'Clans.LeadingClaim' : 'Clans.ChallengingClaim')}</small>
                  </span>
                </button>
              </PersonTooltip>
              <Tooltip content={{
                title: t('Clans.ClaimStrength'),
                body: t('Clans.ClaimStrengthHelp'),
                lines: [
                  { label: t('Clans.WarriorSupport'), value: formatNumber(claimant.warriors), subTooltip: { title: t('Clans.WarriorSupport'), body: t('Clans.WarriorSupportHelp') } },
                  { label: t('Clans.FameSupport'), value: formatNumber(claimant.fame), subTooltip: { title: t('Clans.FameSupport'), body: t('Clans.FameSupportHelp') } },
                  { label: t('Clans.TacticsSupport'), value: formatNumber(claimant.tactics), subTooltip: { title: t('Clans.TacticsSupport'), body: t('Clans.TacticsSupportHelp') } },
                  { label: t('Clans.AuthoritySupport'), value: formatNumber(claimant.authority), subTooltip: { title: t('Clans.AuthoritySupport'), body: t('Clans.AuthoritySupportHelp') } },
                  { label: t('Clans.KinSupport'), value: formatNumber(claimant.kinSupport), subTooltip: { title: t('Clans.KinSupport'), body: t('Clans.KinSupportHelp') } },
                  { label: t('Clans.ClaimStrength'), value: formatNumber(claimant.score), isHeader: true },
                ],
              }}>
                <span className="clans-succession-support"><strong>{formatNumber(claimant.score)}</strong><span>{t('Clans.ClaimStrength')}</span></span>
              </Tooltip>
            </article>
          ))}
        </div>
      }
    </section>
  );
}
