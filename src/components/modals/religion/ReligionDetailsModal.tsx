import { createPortal } from 'react-dom';
import type { GetReligionDetailsResponse, ReligionDeityView } from '../../../bridge-types.generated';
import { useModalPresence } from '../../../hooks/useModalPresence';
import { useWebUIText } from '../../../localization/WebUITextContext';
import { WebkilnAssetPath } from '../../../utils/assets';
import { religionHeaderImagePath, religionIconPath } from '../../../utils/religionIcons';
import { formatNumber, formatPercent, formatSignedNumber } from '../../../utils/numberFormat';
import CloseButton from '../../common/buttons/CloseButton';
import IconStat from '../../common/data-display/stats/IconStat';
import StyledScrollArea from '../../common/layout/scrolling/StyledScrollArea';
import Tooltip from '../../common/tooltips/Tooltip';
import ReligionLink from '../../common/religion/ReligionLink';
import { religionEffectFacts, religionFacts } from '../../common/religion/religionFacts';
import '../../common/identity/PaintedHero.css';
import './ReligionDetailsModal.css';

interface Props { open: boolean; details: GetReligionDetailsResponse | null; onClose: () => void; }

function effectAmount(amount: number, isPercent: boolean) {
  return isPercent
    ? `${amount > 0 ? '+' : ''}${formatPercent(amount * 100, 2)}`
    : formatSignedNumber(amount, { maximumFractionDigits: 2 });
}

function DeityCard({ god, lesser }: { god: ReligionDeityView; lesser: boolean }) {
  return (
    <Tooltip
      position="top"
      delay={200}
      content={{
        title: god.name,
        body: god.description,
        lines: [
          ...god.bonus.map(effect => ({
            label: effect.label,
            value: effectAmount(effect.amount, effect.isPercent),
            valueColor: 'var(--green)',
          })),
          ...god.penalty.map(effect => ({
            label: effect.label,
            value: effectAmount(effect.amount, effect.isPercent),
            valueColor: 'var(--red)',
          })),
        ],
      }}
    >
      <article className={`religion-details-god${lesser ? ' religion-details-god--lesser' : ''}`}>
        <img src={WebkilnAssetPath(god.foregroundPath)} alt="" draggable={false} />
        <span>{god.name}</span>
      </article>
    </Tooltip>
  );
}

export default function ReligionDetailsModal({ open, details, onClose }: Props) {
  const t = useWebUIText();
  const { mounted, closing, close, stopPropagation } = useModalPresence({
    open, onClose, escapeId: 'modal.religion-details', closeStrategy: 'request',
  });
  if (!mounted || !details) return null;
  const info = details.religion;
  const effectLines = religionEffectFacts(info);
  const majors = details.gods.filter(god => god.isMajor);
  const hasPantheon = details.gods.length > 0;
  return createPortal(
    <div className={`religion-details-overlay${closing ? ' religion-details-overlay--closing' : ''}`} onClick={close}>
      <article className={`modal religion-details-modal${closing ? ' religion-details-modal--closing' : ''}`}
        aria-modal="true" role="dialog" aria-label={info.name} onClick={stopPropagation}>
        <header className="religion-details-header">
          <img src={religionIconPath(info.id)} alt="" />
          <div><h1>{info.name}</h1><span>{info.groupDisplayName || info.group}</span></div>
          <CloseButton onClick={close} />
        </header>
        <div className="painted-hero">
          <img src={religionHeaderImagePath(info.group)} alt="" className="painted-hero-img" draggable={false} />
        </div>
        <StyledScrollArea className="religion-details-scroll">
          <div className="religion-details-body">
            <section>
              <p>{info.description}</p>
              <IconStat
                className="religion-details-population"
                icon={WebkilnAssetPath('/assets/icons/I_Population.png')}
                value={formatNumber(details.population)}
                tooltip={{ title: t('Common.Population') }}
              />
              <h2>{t('Religion.Customs')}</h2>
              <dl className="religion-facts">
                {religionFacts(info, { includeIdentity: false, includePantheon: !hasPantheon }).map((line, index) =>
                  <div key={index} className={line.stacked ? 'religion-facts-stacked' : undefined}>
                    <dt>{line.label}</dt>
                    {line.value && <dd style={{ color: line.valueColor }}>{line.value}</dd>}
                  </div>)}
              </dl>
            </section>
            {effectLines.length > 0 && <section>
              <h2>{t('Religion.Effects')}</h2>
              <dl className="religion-facts">
                {effectLines.map((line, index) =>
                  <div key={index}>
                    <dt>{line.label}</dt>
                    {line.value && <dd style={{ color: line.valueColor }}>{line.value}</dd>}
                  </div>)}
              </dl>
            </section>}
            {hasPantheon && (
              <section className="religion-details-pantheon">
                <h2>{t('Religion.Gods')}</h2>
                <div className="religion-details-god-tree">
                  {majors.map(god => (
                    <div className="religion-details-god-branch" key={god.key}>
                      <DeityCard god={god} lesser={false} />
                      <div className="religion-details-lessers">
                        {details.gods.filter(lesser => lesser.parentKey === god.key).map(lesser => (
                          <DeityCard key={lesser.key} god={lesser} lesser />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
            {details.relics.length > 0 && (
              <section className="religion-details-relics">
                <h2>{t('Religion.Relics')}</h2>
                <div className="religion-details-relic-list">
                  {details.relics.map(relic => (
                    <Tooltip
                      key={relic.key}
                      content={{
                        title: relic.name,
                        body: relic.description,
                        lines: [
                          ...(relic.godName ? [{ label: t('Pagan.UnlocksGod'), value: relic.godName }] : []),
                          ...(relic.settlementName ? [{ label: t('Pagan.HeldAt'), value: relic.settlementName }] : []),
                          ...(relic.ownerName ? [{ label: t('Pagan.Owner'), value: relic.ownerName }] : []),
                        ],
                      }}
                    >
                      <div className="religion-details-relic">
                        {relic.iconPath && <img src={WebkilnAssetPath(relic.iconPath)} alt="" draggable={false} />}
                        <div>
                          <strong>{relic.name}</strong>
                          <span>{relic.godName}</span>
                          {relic.settlementName && <span>{relic.settlementName}</span>}
                        </div>
                      </div>
                    </Tooltip>
                  ))}
                </div>
              </section>
            )}
            {details.relatedReligions.length > 0 && <section className="religion-details-related">
              <h2>{t('Religion.RelatedFaiths')}</h2>
              <div>{details.relatedReligions.map(religion => <ReligionLink key={religion.id} religionId={religion.id} info={religion}>
                <img src={religionIconPath(religion.id)} alt="" />{religion.name}
              </ReligionLink>)}</div>
            </section>}
          </div>
        </StyledScrollArea>
      </article>
    </div>, document.body,
  );
}
