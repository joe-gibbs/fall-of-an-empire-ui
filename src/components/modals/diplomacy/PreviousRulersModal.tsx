import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { bridgeCall, type FactionPreviousRulerEntry, type GetFactionPreviousRulersResponse } from '../../../bridge-types.generated.ts';
import { acknowledgeBridgeFailure } from '../../../bridge/core/runtimeEngine';
import { useModalPresence } from '../../../hooks/useModalPresence';
import { webUIText, WebUIText } from '../../../localization/WebUITextContext';
import CloseButton from '../../common/buttons/CloseButton';
import Badge from '../../common/data-display/stats/Badge';
import StyledScrollArea from '../../common/layout/scrolling/StyledScrollArea';
import Portrait from '../../common/portraits/Portrait';
import PersonTooltip from '../../common/tooltips/PersonTooltip';
import './PreviousRulersModal.css';

interface Props {
  open: boolean;
  factionId: string;
  factionName: string;
  onClose: () => void;
  onOpenCharacter: (id: string) => void;
}

function reignText(ruler: FactionPreviousRulerEntry): string {
  if (ruler.isCurrent && ruler.startDate) {
    return webUIText('DiplomacySidebar.RulerReignSince', { Start: ruler.startDate });
  }
  if (ruler.startDate && ruler.endDate) {
    return webUIText('DiplomacySidebar.RulerReign', { Start: ruler.startDate, End: ruler.endDate });
  }
  return ruler.startDate || ruler.endDate;
}

export default function PreviousRulersModal({ open, factionId, factionName, onClose, onOpenCharacter }: Props) {
  const { mounted, closing, close, stopPropagation } = useModalPresence({
    open,
    onClose,
    escapeId: 'modal.previous-rulers',
    closeStrategy: 'request',
  });
  const [history, setHistory] = useState<GetFactionPreviousRulersResponse | null>(null);

  useEffect(() => {
    if (!open || !factionId) return undefined;
    let cancelled = false;
    bridgeCall('game.get_faction_previous_rulers', { factionId })
      .then(response => {
        if (!cancelled) setHistory(response);
      })
      .catch(acknowledgeBridgeFailure);
    return () => {
      cancelled = true;
    };
  }, [factionId, open]);

  const matchingHistory = history && history.factionId === factionId ? history : null;
  const rulers = matchingHistory?.rulers ?? [];

  if (!mounted) return null;

  return createPortal(
    <div className={`prev-rulers-overlay${closing ? ' prev-rulers-overlay--closing' : ''}`} onClick={close}>
      <article
        className={`modal prev-rulers-modal${closing ? ' prev-rulers-modal--closing' : ''}`}
        aria-modal="true"
        role="dialog"
        aria-label={webUIText('DiplomacySidebar.PreviousRulersTitle')}
        onClick={stopPropagation}
      >
        <header className="prev-rulers-header">
          <div>
            <h1>{webUIText('DiplomacySidebar.PreviousRulersTitle')}</h1>
            <span>{factionName}</span>
          </div>
          <CloseButton onClick={close} />
        </header>
        <div className="prev-rulers-body">
          <p className="prev-rulers-intro">{webUIText('DiplomacySidebar.PreviousRulersBody')}</p>
          {matchingHistory && rulers.length === 0 && (
            <div className="prev-rulers-empty"><WebUIText textKey="DiplomacySidebar.NoPreviousRulers" /></div>
          )}
          {rulers.length > 0 && (
            <StyledScrollArea className="prev-rulers-scroll" variant="fill">
              <div className="prev-rulers-list">
                {rulers.map(ruler => {
                  const reign = reignText(ruler);
                  return (
                    <PersonTooltip key={ruler.id} characterId={ruler.id} position="right">
                      <button
                        type="button"
                        className="prev-rulers-row"
                        onClick={() => {
                          close();
                          onOpenCharacter(ruler.id);
                        }}
                      >
                        <Portrait
                          personId={ruler.id}
                          src={ruler.portrait}
                          layers={ruler.portraitLayers}
                          name={ruler.name}
                          isAlive={ruler.isAlive}
                          isImprisoned={ruler.isImprisoned}
                          activity={ruler.activity}
                          isRuler={ruler.isCurrent}
                          isPreviousRuler={!ruler.isCurrent}
                          size="lg"
                          showBorder
                        />
                        <div className="prev-rulers-info">
                          <div className="prev-rulers-name">
                            {ruler.name}
                            {ruler.isCurrent && <Badge text={webUIText('Common.Current')} colour="var(--gold)" />}
                          </div>
                          {ruler.title || ruler.shortTitle ? (
                            <div className="prev-rulers-title">{ruler.title || ruler.shortTitle}</div>
                          ) : null}
                          {reign ? <div className="prev-rulers-reign">{reign}</div> : null}
                          <div className={ruler.isAlive ? 'prev-rulers-status' : 'prev-rulers-status prev-rulers-status--dead'}>
                            {ruler.isAlive ? webUIText('Common.Living') : webUIText('Common.Deceased')}
                          </div>
                          {(ruler.culture || ruler.religion) && (
                            <div className="prev-rulers-identity">
                              {ruler.culture ? <span>{ruler.culture}</span> : null}
                              {ruler.religion ? <span>{ruler.religion}</span> : null}
                            </div>
                          )}
                        </div>
                      </button>
                    </PersonTooltip>
                  );
                })}
              </div>
            </StyledScrollArea>
          )}
        </div>
      </article>
    </div>,
    document.body,
  );
}
