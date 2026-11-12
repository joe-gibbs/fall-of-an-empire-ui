import GameButton from '../../common/buttons/GameButton';
import SectionHeading from '../../common/data-display/stats/SectionHeading';
import { useWebUIText } from '../../../localization/WebUITextContext';
import { formatNumber } from '../../../utils/numberFormat';
import { setGovernorFocus, useGovernorFocusBridge } from '../../../bridge/settlements-economy/useGovernorFocusBridge';

export default function GovernorFocusPanel({ settlementId }: { settlementId: string }) {
  const t = useWebUIText();
  const focus = useGovernorFocusBridge(settlementId);
  if (!focus || !focus.canChoose || focus.options.length === 0) return null;

  return (
    <>
      <SectionHeading variant="ornate" title={t('GovernorFocus.Title')} />
      <div className="settle-focus-list">
        {!focus.hasGovernor && <p className="settle-focus-note">{t('GovernorFocus.NeedsGovernor')}</p>}
        {focus.currentFocusId !== '' && <p className="settle-focus-note">{t('GovernorFocus.ChangeNote')}</p>}
        {focus.options.map(option => {
          const isCurrent = option.id === focus.currentFocusId;
          return (
            <div className="settle-focus-row" key={option.id}>
              <img className="settle-focus-icon" src={option.icon} alt="" draggable={false} />
              <div className="settle-focus-copy">
                <span className="settle-focus-name">{option.name}</span>
                <span className="settle-focus-effect">{option.effect}</span>
                {isCurrent && (
                  <span className="settle-focus-status">
                    {focus.daysToFullEffect > 0
                      ? t('GovernorFocus.Building', { Percent: formatNumber(focus.effectivenessPercent), Days: formatNumber(focus.daysToFullEffect) })
                      : t('GovernorFocus.Full', { Percent: formatNumber(focus.effectivenessPercent) })}
                  </span>
                )}
              </div>
              <GameButton
                variant={isCurrent ? 'outline' : 'burgundy'}
                className="settle-focus-button"
                disabled={!isCurrent && !option.available}
                onClick={() => setGovernorFocus(settlementId, isCurrent ? '' : option.id)}
              >
                {isCurrent ? t('GovernorFocus.Clear') : t('GovernorFocus.Choose')}
              </GameButton>
            </div>
          );
        })}
      </div>
    </>
  );
}
