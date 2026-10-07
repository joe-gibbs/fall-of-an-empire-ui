import { createPortal } from 'react-dom';
import type { GetCultureDevelopmentResponse } from '../../../bridge-types.generated';
import { useModalPresence } from '../../../hooks/useModalPresence';
import { useWebUIText } from '../../../localization/WebUITextContext';
import { WebkilnAssetPath } from '../../../utils/assets';
import { cultureHeaderImagePath, cultureIconPath } from '../../../utils/cultureIcons';
import { formatNumber, formatSignedNumber } from '../../../utils/numberFormat';
import CloseButton from '../../common/buttons/CloseButton';
import PaintedBar from '../../common/data-display/bars/PaintedBar';
import IconStat from '../../common/data-display/stats/IconStat';
import Tooltip from '../../common/tooltips/Tooltip';
import StyledScrollArea from '../../common/layout/scrolling/StyledScrollArea';
import CultureLink from '../../common/culture/CultureLink';
import { cultureFacts } from '../../common/culture/cultureFacts';
import { cultureDevelopmentUnlockFillPercent } from '../../common/culture/cultureDevelopmentUnlocks';
import '../../common/identity/PaintedHero.css';
import './CultureDevelopmentModal.css';

interface Props { open: boolean; details: GetCultureDevelopmentResponse | null; onClose: () => void; }

export default function CultureDevelopmentModal({ open, details, onClose }: Props) {
  const t = useWebUIText();
  const { mounted, closing, close, stopPropagation } = useModalPresence({
    open, onClose, escapeId: 'modal.culture-development', closeStrategy: 'request',
  });
  if (!mounted || !details) return null;
  const info = details.culture;
  const unlockFill = cultureDevelopmentUnlockFillPercent(
    details.development,
    details.gates.map(gate => gate.requiredDevelopment),
  );
  return createPortal(
    <div className={`culture-development-overlay${closing ? ' culture-development-overlay--closing' : ''}`} onClick={close}>
      <article className={`modal culture-development-modal${closing ? ' culture-development-modal--closing' : ''}`}
        aria-modal="true" role="dialog" aria-label={info.name} onClick={stopPropagation}>
        <header className="culture-development-header">
          <img src={cultureIconPath(info)} alt="" />
          <div><h1>{info.name}</h1><span>{info.groupDisplayName || info.group}</span></div>
          <CloseButton onClick={close} />
        </header>
        <div className="painted-hero">
          <img src={cultureHeaderImagePath(info.group)} alt="" className="painted-hero-img" draggable={false} />
        </div>
        <StyledScrollArea className="culture-development-scroll">
          <div className="culture-development-body">
            <section className="culture-development-customs">
              <p>{info.description}</p>
              <IconStat
                className="culture-development-population"
                icon={WebkilnAssetPath('/assets/icons/I_Population.png')}
                value={formatNumber(details.population)}
                tooltip={{ title: t('Common.Population') }}
              />
              <h2>{t('Culture.CustomsAndRecruitment')}</h2>
              <dl className="culture-facts">
                {cultureFacts(info, t, { includeDevelopment: false, includeSettlement: false }).filter(line => !line.isHeader).map((line, index) =>
                  <div key={index} className={line.stacked ? 'culture-facts-stacked' : undefined}>
                    <dt>{line.label}</dt>
                    {line.value && <dd style={{ color: line.valueColor }}>{line.value}</dd>}
                  </div>)}
              </dl>
            </section>
            <section className="culture-development-score">
              <h2>{t('CultureDevelopment.Development')} <strong>{formatNumber(details.development, { maximumFractionDigits: 1 })}</strong></h2>
              {details.gates.length > 0 && (
                <div className="culture-development-unlocks">
                  <div className="culture-development-unlocks-bar">
                    <PaintedBar
                      percent={unlockFill}
                      color="gold"
                      ariaLabel={t('CultureDevelopment.Development')}
                    />
                  </div>
                  <div className="culture-development-unlocks-nodes">
                    {details.gates.map(gate => (
                      <Tooltip
                        key={gate.id}
                        wrapperClassName="culture-development-unlock-slot"
                        content={{
                          title: gate.name,
                          body: gate.explanation,
                          subtitle: t('Culture.RequiresDevelopment', { Value: formatNumber(gate.requiredDevelopment) }),
                        }}
                      >
                        <div className={`culture-development-unlock${gate.reached ? ' culture-development-unlock--reached' : ''}${gate.isNext ? ' culture-development-unlock--next' : ''}${!gate.reached && !gate.isNext ? ' culture-development-unlock--locked' : ''}`} tabIndex={0}>
                          <span className="culture-development-unlock-icon">
                            <img src={WebkilnAssetPath(gate.icon)} alt="" />
                          </span>
                          <span className="culture-development-unlock-value">{formatNumber(gate.requiredDevelopment)}</span>
                        </div>
                      </Tooltip>
                    ))}
                  </div>
                </div>
              )}
              <p>{t('CultureDevelopment.Shared', { Culture: info.name })}</p>
              <Tooltip content={{ title: t('CultureDevelopment.MonthlyGrowth'), body: details.growthExplanation }}>
                <p className={`culture-development-trend${details.monthlyChange > 0.0005 ? ' culture-development-trend--rising' : details.monthlyChange < -0.0005 ? ' culture-development-trend--falling' : ''}`} tabIndex={0}>
                  {t(details.monthlyChange > 0.0005 ? 'CultureDevelopment.Rising' : details.monthlyChange < -0.0005 ? 'CultureDevelopment.Falling' : 'CultureDevelopment.Stable')}
                  {' '}
                  {t('CultureDevelopment.MonthlyChange', { Value: formatSignedNumber(details.monthlyChange, { maximumFractionDigits: 3 }) })}
                </p>
              </Tooltip>
              <dl className="culture-development-sources">
                {details.sources.map(source => (
                  <div key={source.id}>
                    <dt>
                      <Tooltip content={{ title: source.name, body: source.explanation }}>
                      <img src={WebkilnAssetPath(source.icon)} alt="" />
                      {source.name}
                      </Tooltip>
                    </dt>
                    <dd className={source.value > 0.0005 ? 'culture-development-source-gain' : undefined}>
                      {formatSignedNumber(source.value, { maximumFractionDigits: 3 })}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
            {details.relatedCultures.length > 0 && <section className="culture-development-related">
              <h2>{t('Culture.RelatedCultures')}</h2>
              <div>{details.relatedCultures.map(culture => <CultureLink key={culture.id} cultureId={culture.id} info={culture}>
                <img src={cultureIconPath(culture)} alt="" />{culture.name}
              </CultureLink>)}</div>
            </section>}
          </div>
        </StyledScrollArea>
      </article>
    </div>, document.body,
  );
}
