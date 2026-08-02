import { useState } from 'react';
import type { AdvisorHint } from '../../../context/GameContext';
import { useAnimatedPresence } from '../../../hooks/useAnimatedPresence';
import { playSound } from '../../../hooks/useSound';
import CloseButton from '../../common/buttons/CloseButton';
import { UI_MOTION } from '../../../config/motion';
import './AdvisorPanel.css';

import { webUIText, WebUIText } from '../../../localization/WebUITextContext';
interface AdvisorPanelProps {
  hint: AdvisorHint | null;
  step: number;
  visible: boolean;
  placement: 'left' | 'shifted' | 'center';
  onPrevious: () => void;
  onNext: () => void;
  onDismiss: () => void;
}

function AdvisorPanel({
  hint,
  step,
  visible,
  placement,
  onPrevious,
  onNext,
  onDismiss,
}: AdvisorPanelProps) {
  const [renderHint, setRenderHint] = useState<AdvisorHint | null>(hint);
  const active = Boolean(hint && visible);
  const { mounted, closing } = useAnimatedPresence(active, { durationMs: UI_MOTION.panelCloseMs });

  let currentHint = renderHint;
  if (active && hint && hint.hintKey !== renderHint?.hintKey) {
    currentHint = hint;
    setRenderHint(hint);
  }

  if (!mounted || !currentHint) return null;

  const paragraphs = currentHint.paragraphs.length > 0 ? currentHint.paragraphs : [''];
  const pageIndex = Math.min(step, paragraphs.length - 1);
  const paragraph = paragraphs[pageIndex];
  const isLastPage = pageIndex >= paragraphs.length - 1;

  return (
    <div className={`advisor-shell advisor-shell--${placement}${closing ? ' advisor-shell--closing' : ''}`}>
      <section className="advisor-card" aria-live="polite" aria-label={webUIText("Auto.Attr.componentshudAdvisorPanel.50.1", { Title: currentHint.title })}>
        <CloseButton size="sm" onClick={onDismiss} className="advisor-card__close" />

        <div className="advisor-card__hero">
          <div className="advisor-card__portrait-wrap">
            <div className="advisor-card__portrait-frame">
              <img
                src="/assets/hud/Components/Tutorial/T_Advisor_D.png"
                alt=""
                className="advisor-card__portrait"
              />
            </div>
          </div>

          <div className="advisor-card__hero-copy">
            <h2 className="advisor-card__title">{currentHint.title}</h2>
            <div className="advisor-card__body">{paragraph}</div>
          </div>
        </div>

        <div className="advisor-card__progress" aria-hidden="true">
          {paragraphs.map((_, index) => (
            <span
              key={index}
              className={`advisor-card__dot${index === pageIndex ? ' advisor-card__dot--active' : ''}`}
            />
          ))}
        </div>

        <div className="advisor-card__actions">
          <button
            type="button"
            className="advisor-card__btn advisor-card__btn--ghost"
            onMouseDown={() => { playSound('click'); onPrevious?.(); }}
            disabled={pageIndex === 0}
          >
            <WebUIText textKey="Auto.ComponentsHudAdvisorPanel.85.1" />
          </button>
          <div className="advisor-card__actions-right">
            <button
              type="button"
              className="advisor-card__btn advisor-card__btn--primary"
              onMouseDown={() => { playSound(isLastPage ? 'confirm' : 'click'); (isLastPage ? onDismiss : onNext)?.(); }}
            >
              {isLastPage ? webUIText("AdvisorPanel.Understood") : webUIText("AdvisorPanel.Next")}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

export default AdvisorPanel;
