import type { GetConfederationDataResponse } from '../../../bridge-types.generated';
import { useGameActions, useGameState } from '../../../context/GameContext';
import { useWebUIText } from '../../../localization/WebUITextContext';
import { formatNumber, formatSignedNumber } from '../../../utils/numberFormat';
import Tooltip, { type TooltipContent } from '../../common/tooltips/Tooltip';
import SectionHeading from '../../common/data-display/stats/SectionHeading';
import { detailLines, sectionTooltip } from './confederationData';
import './ConfederationPanel.css';

export default function ConfederationPanel({ data }: { data: GetConfederationDataResponse | null }) {
  const t = useWebUIText();
  const { openSidebar, openScreen } = useGameActions();
  const { gameDay } = useGameState();
  if (!data?.available) return null;
  const monthly = data.sections.find(section => section.id === 'monthly');
  const sections = [...data.sections, ...data.detailSections];
  const obligations = data.sections.find(section => section.id === 'obligations');
  const departure = data.sections.find(section => section.id === 'departure');
  const cohesionTooltip: TooltipContent = {
    title: data.label,
    lines: [
      ...detailLines(departure ? departure.rows.slice(0, 2) : [], gameDay, t, sections),
      ...data.sections.filter(section => section.id === 'departure' || section.id === 'effects').map(section => ({
        label: section.title,
        subTooltip: sectionTooltip(section, gameDay, t, sections),
      })),
    ],
  };

  return (
    <section className="confederation-panel">
      <SectionHeading variant="ornate" title={data.title} />
      {!data.isLeader && <div className="confederation-leader">
        <span>{t('Confederation.Leader')}</span>
        <button type="button" className="confederation-link" onClick={() => openSidebar('diplomacy', data.leaderFactionId)}>{data.leaderName}</button>
      </div>}
      <div className="confederation-columns">
        <div className="confederation-column">
          <Tooltip content={cohesionTooltip} delay={150}>
            <div className="confederation-cohesion" tabIndex={0}>
              <div className="confederation-summary-row">
                <h3 className="confederation-heading">{data.label}</h3>
                <strong className={data.isWeak ? 'info-value--negative' : undefined}>{formatNumber(data.cohesion, { maximumFractionDigits: 1 })}</strong>
              </div>
              <div className="confederation-cohesion-track" role="meter" aria-label={data.label} aria-valuenow={data.cohesion} aria-valuemin={0} aria-valuemax={100}>
                <div className={data.isWeak ? 'confederation-cohesion-fill confederation-cohesion-fill--weak' : 'confederation-cohesion-fill'} style={{ transform: `scaleX(${data.cohesion / 100})` }} />
              </div>
            </div>
          </Tooltip>
          {monthly && <Tooltip content={sectionTooltip(monthly, gameDay, t, sections)} delay={150}>
            <div className="confederation-summary-row" tabIndex={0}><span>{monthly.title}</span><strong className={data.monthlyChange < 0 ? 'info-value--negative' : 'info-value--positive'}>{formatSignedNumber(data.monthlyChange, { maximumFractionDigits: 2 })}</strong></div>
          </Tooltip>}
        </div>
        <div className="confederation-column">
          <Tooltip content={obligations ? sectionTooltip(obligations, gameDay, t, sections) : undefined} delay={150}>
            <h3 className="confederation-heading" tabIndex={0}>{t('Confederation.Members')}</h3>
          </Tooltip>
          {data.members.map(member => <Tooltip key={member.id} content={{ title: member.name, lines: detailLines(member.details, gameDay, t, sections) }} delay={150}>
            <div className="confederation-member" tabIndex={0}>
              <div className="confederation-member-names">
                <button type="button" className="confederation-link" onClick={() => openSidebar('diplomacy', member.id)}>{member.name}</button>
                {member.rulerId && <button type="button" className="confederation-link confederation-member-ruler" onClick={() => openSidebar('character', member.rulerId)}>{member.rulerName}</button>}
              </div>
              <span>{member.government}</span>
            </div>
          </Tooltip>)}
          <div className="confederation-navigation">
            <button type="button" className="btn--outline" onClick={() => openScreen('diplomacy', 'foreign')}>{t('TreatyNegotiation.BackToDiplomacy')}</button>
          </div>
        </div>
      </div>
    </section>
  );
}
